// =====================================================================
// systems/siteXO.js
// XO أونلاين على الموقع — /u/:code/xo
// - قائمة اللاعبين المتصلين (من فتح صفحة XO) + بحث باليوزر
// - دعوة تحدٍّ لحظية (SSE) مع مهلة، قبول/رفض/إلغاء
// - المباراة بالكامل على السيرفر (لا يمكن الغش) + إعادة + انسحاب
// - انقطاع الاتصال أكثر من 20 ثانية = انسحاب تلقائي
// الاستخدام:
//   const siteXO = require('./systems/siteXO')({ Player })
//   registerCharacterSite(app, Player, { xo: siteXO, ... })
// =====================================================================

const crypto = require('crypto')

const INVITE_MS = 30 * 1000        // مهلة قبول الدعوة
const DROP_MS = 20 * 1000          // مهلة انقطاع اللاعب قبل الانسحاب التلقائي
const MAX_LIST = 50
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]

const rid = () => crypto.randomBytes(6).toString('hex')
const colorOf = uid => { let h = 0; for (const ch of String(uid)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 6 }
const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function winnerLine(b) {
    for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return l
    return null
}

module.exports = function createSiteXO({ Player }) {
    const clients = new Map()   // userId -> Set<res>
    const profiles = new Map()  // userId -> { id, n, u, c }
    const dropT = new Map()     // userId -> timeout (انقطاع)
    const invites = new Map()   // inviteId -> { id, from, to, t }
    const games = new Map()     // gameId -> game
    const inGame = new Map()    // userId -> gameId
    const hits = new Map()

    const rate = uid => {
        const now = Date.now()
        const a = (hits.get(uid) || []).filter(t => now - t < 60000)
        if (a.length >= 90) { hits.set(uid, a); return false }
        a.push(now); hits.set(uid, a); return true
    }

    const isOn = uid => (clients.get(uid) || new Set()).size > 0
    const pubId = uid => crypto.createHash('sha256').update('xo:' + uid).digest('hex').slice(0, 12)
    const idMap = new Map()     // pubId -> userId (للمتصلين/المبحوث عنهم فقط)

    function card(uid, p) {
        const pr = profiles.get(uid) || p || {}
        const id = pubId(uid)
        idMap.set(id, uid)
        return { id, n: pr.n || 'لاعب', u: pr.u || '', c: colorOf(uid), on: isOn(uid) ? 1 : 0, busy: inGame.has(uid) ? 1 : 0 }
    }

    async function loadProfile(uid) {
        const p = await Player.findOne({ userId: uid }).select('userId name username').lean()
        if (!p) return null
        const pr = { id: uid, n: String(p.name || p.username || 'لاعب').slice(0, 30), u: String(p.username || '').slice(0, 20), c: colorOf(uid) }
        profiles.set(uid, pr)
        return pr
    }

    function send(uid, ev, data) {
        const set = clients.get(uid)
        if (!set) return
        const msg = `event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`
        for (const r of set) { try { r.write(msg) } catch (e) { /* ignore */ } }
    }

    function broadcastCount() {
        const n = [...clients.keys()].length
        for (const uid of clients.keys()) send(uid, 'presence', { n })
    }

    // ─── الدعوات ───
    function dropInvite(inv, reason) {
        if (!invites.delete(inv.id)) return
        clearTimeout(inv.t)
        send(inv.from, 'invite_end', { id: inv.id, reason })
        send(inv.to, 'invite_end', { id: inv.id, reason })
    }
    const inviteOf = (uid, key) => [...invites.values()].find(i => i[key] === uid)
    function dropUserInvites(uid, reason) {
        for (const i of [...invites.values()]) if (i.from === uid || i.to === uid) dropInvite(i, reason)
    }

    // ─── المباراة ───
    function gameView(g, uid) {
        const me = g.X === uid ? 'X' : 'O'
        const opUid = me === 'X' ? g.O : g.X
        return {
            id: g.id, b: g.b, me, turn: g.turn, over: g.over, line: g.line, res: g.res,
            sc: { me: g.sc[uid] || 0, opp: g.sc[opUid] || 0, d: g.sc.d },
            opp: card(opUid), again: g.again.has(uid) ? 1 : 0, oppAgain: g.again.has(opUid) ? 1 : 0
        }
    }
    function pushGame(g) { for (const u of [g.X, g.O]) send(u, 'game', gameView(g, u)) }

    function startGame(a, b) {
        // المُرسِل يبدأ X
        const g = { id: rid(), X: a, O: b, b: Array(9).fill(''), turn: 'X', over: false, line: null, res: null, sc: { d: 0 }, again: new Set() }
        games.set(g.id, g); inGame.set(a, g.id); inGame.set(b, g.id)
        dropUserInvites(a, 'start'); dropUserInvites(b, 'start')
        pushGame(g)
        return g
    }
    function endGameFor(uid, reason) {
        const gid = inGame.get(uid)
        const g = gid && games.get(gid)
        if (!g) return
        games.delete(gid); inGame.delete(g.X); inGame.delete(g.O)
        const other = g.X === uid ? g.O : g.X
        send(other, 'game_end', { reason })
    }

    // ─── المسارات ───
    function mount(app, h) {
        const { auth, jsonBody, bossSession, securityHeaders, CODE_RE, html404, ownerSession } = h

        async function api(req, res, mutate) {
            res.set('Cache-Control', 'no-store')
            const fail = (st, code, message) => { res.status(st).json({ ok: false, code, message }); return null }
            if (!auth.authEnabled()) return fail(503, 'DISABLED', 'غير مفعّل حالياً.')
            if (mutate && !auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')
            const sess = await bossSession(req)
            if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
            if (mutate && !auth.verifyCsrf(sess, req.body && req.body.csrf)) return fail(403, 'CSRF', 'حدّث الصفحة وأعد المحاولة.')
            if (!rate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر قليلاً.')
            return sess
        }

        // الصفحة
        app.get('/u/:code/xo', async (req, res) => {
            try {
                securityHeaders(res)
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return html404(res)
                const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion').lean()
                if (!player) return html404(res)
                const sess = ownerSession(req, player)
                if (!sess) return res.redirect(303, `/login?code=${code}`)
                const me = { n: String(player.name || player.username || 'أنت').slice(0, 30), u: String(player.username || ''), c: colorOf(player.userId) }
                res.send(pageHTML({ code, csrf: auth.csrfForSession(sess), me, name: me.n }))
            } catch (e) {
                console.error('xo page error:', e)
                res.status(500).send('خطأ')
            }
        })

        // بث الأحداث (SSE) — اتصاله = متصل
        app.get('/u/:code/xo/events', async (req, res) => {
            try {
                const sess = await api(req, res, false)
                if (!sess) return
                const uid = sess.u
                if (!profiles.has(uid) || Math.random() < 0.02) await loadProfile(uid)
                res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
                res.flushHeaders && res.flushHeaders()
                res.write('retry: 3000\n\n')
                if (!clients.has(uid)) clients.set(uid, new Set())
                clients.get(uid).add(res)
                clearTimeout(dropT.get(uid)); dropT.delete(uid)

                // حالة البداية: مباراة جارية أو دعوة واردة/صادرة
                const gid = inGame.get(uid)
                if (gid && games.has(gid)) send(uid, 'game', gameView(games.get(gid), uid))
                const inc = inviteOf(uid, 'to'), out = inviteOf(uid, 'from')
                if (inc) send(uid, 'invite', { id: inc.id, from: card(inc.from), ms: Math.max(0, INVITE_MS - (Date.now() - inc.at)) })
                if (out) send(uid, 'invite_out', { id: out.id, to: card(out.to), ms: Math.max(0, INVITE_MS - (Date.now() - out.at)) })
                broadcastCount()

                const ping = setInterval(() => { try { res.write(': ping\n\n') } catch (e) { /* ignore */ } }, 15000)
                req.on('close', () => {
                    clearInterval(ping)
                    const set = clients.get(uid)
                    if (set) { set.delete(res); if (!set.size) clients.delete(uid) }
                    if (!isOn(uid)) {
                        dropUserInvites(uid, 'offline')
                        if (inGame.has(uid)) {
                            dropT.set(uid, setTimeout(() => { if (!isOn(uid)) endGameFor(uid, 'dropped') }, DROP_MS))
                        }
                        broadcastCount()
                    }
                })
            } catch (e) {
                console.error('xo events error:', e)
                try { res.end() } catch (e2) { /* ignore */ }
            }
        })

        // اللاعبون: المتصلون، أو بحث باليوزر
        app.get('/u/:code/xo/players', async (req, res) => {
            try {
                const sess = await api(req, res, false)
                if (!sess) return
                const q = String(req.query.q || '').trim().toLowerCase().replace(/^@/, '').slice(0, 20)
                let list = []
                if (!q) {
                    const ids = [...clients.keys()].filter(u => u !== sess.u).slice(0, MAX_LIST)
                    for (const u of ids) if (!profiles.has(u)) await loadProfile(u)
                    list = ids.map(u => card(u))
                } else {
                    const rx = new RegExp(escRe(q), 'i')
                    const rows = await Player.find({ $or: [{ username: rx }, { name: rx }], userId: { $ne: sess.u } })
                        .select('userId name username').limit(12).lean()
                    list = rows.map(p => card(p.userId, { n: p.name || p.username, u: p.username }))
                }
                list.sort((a, b) => b.on - a.on)
                res.json({ ok: true, list, online: [...clients.keys()].length })
            } catch (e) {
                console.error('xo players error:', e)
                res.status(500).json({ ok: false })
            }
        })

        // إرسال دعوة
        app.post('/u/:code/xo/invite', jsonBody, async (req, res) => {
            try {
                const sess = await api(req, res, true)
                if (!sess) return
                const me = sess.u
                const to = idMap.get(String((req.body || {}).to || ''))
                if (!to || to === me) return res.json({ ok: false, message: 'لاعب غير صالح.' })
                if (inGame.has(me)) return res.json({ ok: false, message: 'أنت داخل مباراة.' })
                if (!isOn(to)) return res.json({ ok: false, message: 'اللاعب غير متصل بـ XO حالياً.' })
                if (inGame.has(to)) return res.json({ ok: false, message: 'اللاعب داخل مباراة.' })
                if (inviteOf(to, 'to')) return res.json({ ok: false, message: 'اللاعب عليه دعوة أخرى.' })
                const old = inviteOf(me, 'from'); if (old) dropInvite(old, 'cancel')
                if (!profiles.has(me)) await loadProfile(me)
                const inv = { id: rid(), from: me, to, at: Date.now() }
                inv.t = setTimeout(() => dropInvite(inv, 'timeout'), INVITE_MS)
                invites.set(inv.id, inv)
                send(to, 'invite', { id: inv.id, from: card(me), ms: INVITE_MS })
                send(me, 'invite_out', { id: inv.id, to: card(to), ms: INVITE_MS })
                res.json({ ok: true })
            } catch (e) { console.error('xo invite error:', e); res.status(500).json({ ok: false }) }
        })

        app.post('/u/:code/xo/cancel', jsonBody, async (req, res) => {
            const sess = await api(req, res, true)
            if (!sess) return
            const inv = inviteOf(sess.u, 'from')
            if (inv) dropInvite(inv, 'cancel')
            res.json({ ok: true })
        })

        app.post('/u/:code/xo/respond', jsonBody, async (req, res) => {
            try {
                const sess = await api(req, res, true)
                if (!sess) return
                const inv = invites.get(String((req.body || {}).id || ''))
                if (!inv || inv.to !== sess.u) return res.json({ ok: false, message: 'انتهت الدعوة.' })
                if (!(req.body || {}).accept) { dropInvite(inv, 'decline'); return res.json({ ok: true }) }
                if (inGame.has(inv.from) || inGame.has(inv.to)) { dropInvite(inv, 'busy'); return res.json({ ok: false, message: 'أحدكما داخل مباراة.' }) }
                if (!isOn(inv.from)) { dropInvite(inv, 'offline'); return res.json({ ok: false, message: 'المرسل غير متصل.' }) }
                clearTimeout(inv.t); invites.delete(inv.id)
                startGame(inv.from, inv.to)
                res.json({ ok: true })
            } catch (e) { console.error('xo respond error:', e); res.status(500).json({ ok: false }) }
        })

        app.post('/u/:code/xo/move', jsonBody, async (req, res) => {
            const sess = await api(req, res, true)
            if (!sess) return
            const g = games.get(inGame.get(sess.u))
            const i = Number((req.body || {}).i)
            if (!g || g.over) return res.json({ ok: false, message: 'لا توجد مباراة.' })
            const mark = g.X === sess.u ? 'X' : 'O'
            if (g.turn !== mark) return res.json({ ok: false, message: 'ليس دورك.' })
            if (!Number.isInteger(i) || i < 0 || i > 8 || g.b[i]) return res.json({ ok: false, message: 'خانة غير صالحة.' })
            g.b[i] = mark
            const line = winnerLine(g.b)
            if (line) { g.over = true; g.line = line; g.res = sess.u; g.sc[sess.u] = (g.sc[sess.u] || 0) + 1 }
            else if (g.b.every(Boolean)) { g.over = true; g.res = 'draw'; g.sc.d++ }
            else g.turn = mark === 'X' ? 'O' : 'X'
            pushGame(g)
            res.json({ ok: true })
        })

        // إعادة: لازم الاثنين يوافقون، وتتبدّل العلامات
        app.post('/u/:code/xo/again', jsonBody, async (req, res) => {
            const sess = await api(req, res, true)
            if (!sess) return
            const g = games.get(inGame.get(sess.u))
            if (!g || !g.over) return res.json({ ok: false })
            g.again.add(sess.u)
            if (g.again.size === 2) {
                const x = g.O, o = g.X
                g.X = x; g.O = o; g.b = Array(9).fill(''); g.turn = 'X'; g.over = false; g.line = null; g.res = null; g.again = new Set()
            }
            pushGame(g)
            res.json({ ok: true })
        })

        // خروج/انسحاب
        app.post('/u/:code/xo/leave', jsonBody, async (req, res) => {
            const sess = await api(req, res, true)
            if (!sess) return
            endGameFor(sess.u, 'left')
            res.json({ ok: true })
        })
    }

    return { mount }
}

// ─────────────────────────── الصفحة ───────────────────────────
function pageHTML({ code, csrf, me, name }) {
    const cfg = JSON.stringify({ code, csrf, me, inviteMs: INVITE_MS })
        .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><title>XO أونلاين</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap" rel="stylesheet">
<style>${CSS}</style></head>
<body data-xo>
<div class="bg"><i class="b1"></i><i class="b2"></i><i class="b3"></i><div class="fl" id="fl"></div></div>
<div class="toast" id="toast"><div class="row"><div id="tAv"></div><div class="tt"><span class="swing">⚔️</span> <b id="tName"></b> يتحداك في <b>XO</b>!<br><small id="tUser" style="color:var(--mut)"></small></div></div>
<div class="acts"><button class="btn" id="acc">قبول التحدي</button><button class="btn ghost" id="dec">رفض</button></div><div class="bar" id="bar"></div></div>
<div class="ov" id="wait"><div class="card"><div class="vs"><div id="wMe"></div><span class="sw">⚔️</span><div id="wOpp"></div></div>
<b>بانتظار رد <span id="wName"></span><span class="dots"><span>.</span><span>.</span><span>.</span></span></b>
<div style="margin-top:16px"><button class="btn ghost" id="wCancel">إلغاء التحدي</button></div></div></div>
<div class="ov" id="res"><div class="card"><div class="big" id="rEm"></div><h2 id="rTitle" style="margin:6px 0"></h2><div id="rSub" style="color:var(--mut);margin-bottom:16px"></div>
<div style="display:flex;gap:8px"><button class="btn" style="flex:1" id="rAgain">🔁 إعادة</button><button class="btn ghost" style="flex:1" id="rLeave">خروج</button></div></div></div>
<div class="wrap">
<section id="lobby">
<div class="hd"><h1>❌⭕ XO أونلاين</h1><a class="badge" href="/u/${code}" style="text-decoration:none;color:inherit">🏠</a><div class="badge"><i></i><span id="cnt">0</span> متصل</div></div>
<div class="sub">تحدَّ لاعباً متصلاً، أو ابحث عنه باليوزر</div>
<label class="search">🔍<input id="q" placeholder="ابحث باليوزر…" autocomplete="off" maxlength="20"></label>
<div id="list"></div>
<div class="note">يظهر هنا من فتح صفحة XO فقط — افتح الصفحة ليراك الآخرون ويصلك التحدي</div>
</section>
<section id="game">
<div class="hd"><h1>XO</h1><button class="btn ghost" id="quit">✕ انسحاب</button></div>
<div class="pb"><div class="pc" id="pcMe"></div><div class="pc" id="pcOpp"></div></div>
<div id="st"></div><div class="board" id="board"></div><div class="score" id="score"></div>
</section></div>
<script>(${client.toString()})(${cfg})</script>
</body></html>`
}

// سكربت المتصفح
function client(CFG) {
    var $ = function (s) { return document.querySelector(s) }
    var COL = ['#ff5c7a', '#4dd8ff', '#b983ff', '#ffc933', '#45e08f', '#ff8a3d']
    var base = '/u/' + CFG.code + '/xo'
    var ME = CFG.me, G = null, list = [], inv = null, invTimer = null, resShown = false
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
    function av(u, ex) { return '<span class="av ' + (ex || '') + '" style="--c:' + COL[u.c % 6] + '">' + esc((u.n || '?')[0]) + '</span>' }
    function post(path, body) {
        body = body || {}; body.csrf = CFG.csrf
        return fetch(base + path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            .then(function (r) { return r.json() }).catch(function () { return { ok: false, message: 'تعذر الاتصال.' } })
    }
    function ding() { try { navigator.vibrate && navigator.vibrate([120, 60, 120]) } catch (e) { } try { var a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.value = .08; o.start(); o.stop(a.currentTime + .18) } catch (e) { } }

    // ── القائمة ──
    function renderList() {
        $('#list').innerHTML = list.length ? list.map(function (u, i) {
            return '<div class="pl" style="--i:' + i + '">' + av(u) + '<div class="inf"><b>' + esc(u.n) + '</b><small>@' + esc(u.u) + '</small></div>' +
                (u.on && !u.busy ? '<span class="dot"></span><button class="btn" data-i="' + i + '">⚔️ تحدّي</button>' : u.busy ? '<span class="off">⚔️ في مباراة</span>' : '<span class="off">غير متصل</span>') + '</div>'
        }).join('') : '<div class="empty">' + ($('#q').value.trim() ? 'لا يوجد لاعب بهذا اليوزر 🔎' : 'لا أحد متصل الآن — ابحث عن لاعب باليوزر') + '</div>'
    }
    var qT
    function load() {
        fetch(base + '/players?q=' + encodeURIComponent($('#q').value.trim()), { credentials: 'same-origin' })
            .then(function (r) { return r.json() }).then(function (j) { if (j.ok) { list = j.list; $('#cnt').textContent = j.online; renderList() } }).catch(function () { })
    }
    $('#q').oninput = function () { clearTimeout(qT); qT = setTimeout(load, 250) }
    setInterval(function () { if (!G && document.visibilityState === 'visible') load() }, 8000)
    $('#list').onclick = function (e) {
        var b = e.target.closest('[data-i]'); if (!b) return
        var u = list[b.dataset.i]; b.disabled = true
        post('/invite', { to: u.id }).then(function (j) { if (!j.ok) { alert(j.message || 'تعذر الإرسال'); load() } })
    }

    // ── دعوة صادرة (انتظار) ──
    $('#wCancel').onclick = function () { post('/cancel'); $('#wait').classList.remove('on') }
    // ── دعوة واردة ──
    function showInvite(d) {
        if (G && !G.over) return
        inv = d; $('#tAv').innerHTML = av(d.from); $('#tName').textContent = d.from.n; $('#tUser').textContent = '@' + d.from.u
        var bar = $('#bar'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = 'shrink ' + (d.ms / 1000) + 's linear forwards'
        $('#toast').classList.add('show'); ding()
    }
    function hideInvite() { inv = null; $('#toast').classList.remove('show') }
    $('#acc').onclick = function () { var i = inv; if (!i) return; hideInvite(); post('/respond', { id: i.id, accept: true }).then(function (j) { if (!j.ok) alert(j.message || 'انتهت الدعوة') }) }
    $('#dec').onclick = function () { var i = inv; if (!i) return; hideInvite(); post('/respond', { id: i.id, accept: false }) }

    // ── اللعبة ──
    var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]
    function mark(m) { return m === 'X' ? '<svg viewBox="0 0 100 100"><path pathLength="1" d="M22 22L78 78"/><path class="d2" pathLength="1" d="M78 22L22 78"/></svg>' : '<svg viewBox="0 0 100 100"><circle pathLength="1" cx="50" cy="50" r="30"/></svg>' }
    function showGame(g) {
        var first = !G || G.id !== g.id
        var prev = G; G = g
        $('#lobby').style.display = 'none'; $('#game').style.display = 'block'
        $('#wait').classList.remove('on'); hideInvite()
        var newRound = first || (prev && prev.over && !g.over)
        if (newRound) { $('#res').classList.remove('on'); resShown = false; $('#board').innerHTML = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return '<div class="cell" data-i="' + i + '"></div>' }).join('') }
        g.b.forEach(function (m, i) {
            var c = document.querySelector('.cell[data-i="' + i + '"]')
            if (m && !c.classList.contains(m)) { c.classList.add(m); c.innerHTML = mark(m) }
        })
        ui()
        if (g.over && !resShown) { resShown = true; finish() }
        else if (g.over) $('#rAgain').textContent = g.again ? '⏳ بانتظار الخصم' : g.oppAgain ? '🔁 الخصم يريد إعادة' : '🔁 إعادة'
    }
    function ui() {
        var o = G.opp, om = G.me === 'X' ? 'O' : 'X', mine = G.turn === G.me && !G.over
        $('#pcMe').innerHTML = av(ME) + '<div><b>أنت</b><small>@' + esc(ME.u) + '</small></div><span class="mk ' + G.me + '">' + G.me + '</span>'
        $('#pcOpp').innerHTML = av(o) + '<div><b>' + esc(o.n) + '</b><small>@' + esc(o.u) + '</small></div><span class="mk ' + om + '">' + om + '</span>'
        $('#pcMe').classList.toggle('act', mine); $('#pcOpp').classList.toggle('act', !mine && !G.over)
        $('#board').classList.toggle('mine', mine)
        $('#st').innerHTML = G.over ? '' : mine ? '🎯 دورك — اختر خانة' : esc(o.n) + ' يفكر<span class="dots"><span>.</span><span>.</span><span>.</span></span>'
        $('#score').innerHTML = '<div class="sb me"><small>أنت</small><b>' + G.sc.me + '</b></div><div class="sb d"><small>تعادل</small><b>' + G.sc.d + '</b></div><div class="sb op"><small>' + esc(o.n) + '</small><b>' + G.sc.opp + '</b></div>'
    }
    $('#board').onclick = function (e) {
        var c = e.target.closest('.cell'); if (!c || !G || G.over || G.turn !== G.me) return
        var i = +c.dataset.i; if (G.b[i]) return
        post('/move', { i: i }).then(function (j) { if (!j.ok && j.message) $('#st').textContent = j.message })
    }
    function finish() {
        var r = G.res === 'draw' ? 'draw' : (G.b[G.line[0]] === G.me ? 'win' : 'lose')
        if (G.line) {
            var bd = $('#board').getBoundingClientRect()
            var pt = function (i) { var x = document.querySelector('.cell[data-i="' + i + '"]'); x.classList.add('win'); var q = x.getBoundingClientRect(); return [q.left + q.width / 2 - bd.left, q.top + q.height / 2 - bd.top] }
            var a = pt(G.line[0]), z = pt(G.line[2])
            $('#board').insertAdjacentHTML('beforeend', '<svg class="wl"><line pathLength="1" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + z[0] + '" y2="' + z[1] + '"/></svg>')
        }
        setTimeout(function () {
            if (!G || !G.over) return
            var T = { win: ['🏆', 'فزت!', 'أحسنت يا بطل'], lose: ['💥', 'خسرت', 'حظاً أوفر في الجولة القادمة'], draw: ['🤝', 'تعادل', 'مباراة متكافئة'] }[r]
            $('#rEm').textContent = T[0]; $('#rTitle').textContent = T[1]; $('#rSub').textContent = T[2]
            $('#rAgain').textContent = G.again ? '⏳ بانتظار الخصم' : G.oppAgain ? '🔁 الخصم يريد إعادة' : '🔁 إعادة'
            $('#res').classList.add('on'); if (r === 'win') burst()
        }, 1100)
    }
    $('#rAgain').onclick = function () { $('#rAgain').textContent = '⏳ بانتظار الخصم'; post('/again') }
    function leave(notify) {
        if (notify) post('/leave')
        $('#res').classList.remove('on'); G = null; resShown = false
        $('#game').style.display = 'none'; $('#lobby').style.display = 'block'; load()
    }
    $('#rLeave').onclick = function () { leave(true) }
    $('#quit').onclick = function () { if (G && !G.over && !confirm('تنسحب من المباراة؟')) return; leave(true) }
    function burst() {
        var cs = ['#ffc933', '#ff5c7a', '#4dd8ff', '#45e08f', '#b983ff']
        for (var i = 0; i < 46; i++) {
            var s = document.createElement('span'); s.className = 'cf'
            s.style.cssText = 'background:' + cs[i % 5] + ';--dx:' + ((Math.random() - .5) * 440) + 'px;--dy:' + ((Math.random() - .8) * 360 + 120) + 'px;--r:' + (Math.random() * 720) + 'deg'
            document.body.appendChild(s); (function (e) { setTimeout(function () { e.remove() }, 1600) })(s)
        }
    }

    // ── SSE ──
    function connect() {
        var es = new EventSource(base + '/events')
        es.addEventListener('presence', function (e) { $('#cnt').textContent = JSON.parse(e.data).n; if (!G) { clearTimeout(qT); qT = setTimeout(load, 400) } })
        es.addEventListener('invite', function (e) { showInvite(JSON.parse(e.data)) })
        es.addEventListener('invite_out', function (e) {
            var d = JSON.parse(e.data)
            $('#wMe').innerHTML = av(ME, 'ring'); $('#wOpp').innerHTML = av(d.to); $('#wName').textContent = d.to.n; $('#wait').classList.add('on')
        })
        es.addEventListener('invite_end', function (e) {
            var d = JSON.parse(e.data)
            if (inv && inv.id === d.id) hideInvite()
            if ($('#wait').classList.contains('on')) {
                $('#wait').classList.remove('on')
                var m = { decline: 'رفض اللاعب التحدي', timeout: 'انتهت مهلة الدعوة', offline: 'اللاعب غادر', busy: 'اللاعب داخل مباراة' }[d.reason]
                if (m) alert(m)
            }
        })
        es.addEventListener('game', function (e) { showGame(JSON.parse(e.data)) })
        es.addEventListener('game_end', function (e) {
            var d = JSON.parse(e.data)
            if (G) { alert(d.reason === 'left' ? 'الخصم انسحب من المباراة' : 'انقطع اتصال الخصم'); leave(false) }
        })
    }
    connect(); load()

    // خلفية متحركة
    var f = $('#fl'), cs2 = ['#ff5c7a', '#4dd8ff', '#ffc933', '#b983ff']
    for (var i = 0; i < 18; i++) {
        var s = document.createElement('span')
        s.textContent = i % 2 ? '✕' : '◯'
        s.style.cssText = 'left:' + (Math.random() * 96) + '%;font-size:' + (18 + Math.random() * 34) + 'px;color:' + cs2[i % 4] + ';animation-duration:' + (12 + Math.random() * 14) + 's;animation-delay:-' + (Math.random() * 20) + 's'
        f.appendChild(s)
    }
}

// نفس ستايل المعاينة (محدّث لصفحة الموقع)
const CSS = `
:root{--bg:#0a0b22;--bg2:#170f3a;--bg3:#08162f;--card:#151a38;--card2:#222a58;--tx:#f3efe4;--mut:#8d93a8;--gold:#ffc933;--x:#ff5c7a;--o:#4dd8ff;--ok:#45e08f;--bd:rgba(255,201,51,.2);box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
*{box-sizing:border-box}html{scroll-padding-top:env(safe-area-inset-top,0px)}
body{margin:0;min-height:100vh;background:radial-gradient(900px 500px at 50% -10%,rgba(255,201,51,.12),transparent 60%),linear-gradient(160deg,var(--bg),var(--bg2) 55%,var(--bg3));background-attachment:fixed;color:var(--tx);font-family:'Cairo',system-ui,Tahoma,Arial,sans-serif}
.wrap{max-width:520px;margin:auto;padding:16px}
h1{margin:6px 0 2px;font-size:26px;background:linear-gradient(90deg,#ffe58a,#ffc933,#ff9f1a);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{color:var(--mut);font-size:13px;margin-bottom:14px}
.hd{display:flex;justify-content:space-between;align-items:center}
.badge{background:var(--card);border:1px solid var(--bd);border-radius:99px;padding:6px 12px;font-size:13px}
.badge i{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--ok);margin-inline-end:6px;animation:pulse 1.6s infinite}
.search{display:flex;gap:8px;align-items:center;background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:4px 12px;margin:10px 0 14px}
.search input{flex:1;background:none;border:0;outline:0;color:var(--tx);font-size:15px;padding:10px 0;font-family:inherit}
.pl{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:10px 12px;margin-bottom:9px;animation:in .5s both;animation-delay:calc(var(--i)*70ms)}
.av{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:19px;color:#111;background:linear-gradient(135deg,var(--c),#fff8);flex:none;position:relative}
.inf{flex:1;min-width:0}.inf b{display:block}.inf small{color:var(--mut)}
.dot{width:9px;height:9px;border-radius:50%;background:var(--ok);animation:pulse 1.6s infinite}
.off{color:var(--mut);font-size:12px}
.btn{border:0;cursor:pointer;font-family:inherit;font-weight:700;font-size:14px;padding:9px 15px;border-radius:12px;color:#241a00;background:linear-gradient(135deg,#ffe58a,#ffc933 60%,#ff9f1a)}
.btn:active{transform:scale(.94)}.btn:disabled{opacity:.4}
.btn.ghost{background:var(--card2);color:var(--tx)}
.empty{text-align:center;color:var(--mut);padding:26px}
.note{font-size:12px;color:var(--mut);text-align:center;margin-top:12px}
.bg{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none}
.bg i{position:absolute;border-radius:50%;filter:blur(70px);opacity:.55;animation:drift 14s ease-in-out infinite alternate}
.b1{width:420px;height:420px;background:#6a3cff;top:-120px;right:-100px}.b2{width:380px;height:380px;background:#ff3d8b;bottom:-120px;left:-100px;animation-delay:-5s}.b3{width:300px;height:300px;background:#ffb21a;top:40%;left:30%;opacity:.28;animation-delay:-9s}
.fl span{position:absolute;bottom:-60px;font-weight:800;opacity:0;animation:rise linear infinite}
.board:before{content:"";position:absolute;inset:-14px;border-radius:30px;z-index:-1;background:conic-gradient(from 0deg,#ffc933,#ff5c7a,#4dd8ff,#b983ff,#ffc933);filter:blur(20px);opacity:.4;animation:spin 6s linear infinite}
@keyframes drift{to{transform:translate(60px,70px) scale(1.2)}}
@keyframes rise{10%{opacity:.4}90%{opacity:.25}to{transform:translateY(-115vh) rotate(360deg);opacity:0}}
@keyframes spin{to{transform:rotate(360deg)}}
.toast{position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);left:50%;width:min(92vw,430px);z-index:50;transform:translate(-50%,-160%);transition:transform .6s cubic-bezier(.2,1.5,.4,1);background:linear-gradient(160deg,var(--card2),var(--card));border:1px solid var(--gold);border-radius:20px;padding:14px;overflow:hidden;animation:glow 2s infinite}
.toast.show{transform:translate(-50%,0)}
.toast .row{display:flex;align-items:center;gap:12px}.toast .tt{flex:1}.toast .tt b{color:var(--gold)}
.toast .acts{display:flex;gap:8px;margin-top:12px}.toast .acts .btn{flex:1}
.bar{position:absolute;left:0;bottom:0;height:4px;width:100%;background:linear-gradient(90deg,var(--gold),#ff9f1a);transform-origin:right}
.swing{display:inline-block;animation:swing 1s infinite}
.ov{position:fixed;inset:0;z-index:40;background:rgba(5,6,12,.7);backdrop-filter:blur(6px);display:none;place-items:center;padding:20px}
.ov.on{display:grid;animation:fade .3s}
.card{background:var(--card);border:1px solid var(--bd);border-radius:24px;padding:24px;text-align:center;width:min(92vw,360px);animation:pop .5s cubic-bezier(.2,1.5,.4,1)}
.vs{display:flex;justify-content:center;align-items:center;gap:18px;margin:6px 0 14px}
.vs .av{width:62px;height:62px;font-size:26px}
.vs .av.ring::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--gold);animation:ring 1.4s infinite}
.vs .sw{font-size:22px;animation:swing 1s infinite}
.big{font-size:56px;animation:bounce 1s infinite}
#game{display:none}
.pb{display:flex;gap:10px;margin:8px 0}
.pc{flex:1;display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:8px 10px;transition:.3s;opacity:.65}
.pc.act{opacity:1;border-color:var(--gold);box-shadow:0 0 22px rgba(255,201,51,.3);transform:translateY(-2px)}
.pc small{display:block;color:var(--mut);font-size:11px}.pc .mk{margin-inline-start:auto;font-weight:800;font-size:20px}
.mk.X{color:var(--x)}.mk.O{color:var(--o)}.pc .av{width:36px;height:36px;font-size:16px}
#st{text-align:center;min-height:28px;margin:10px 0;font-weight:700}
.dots span{animation:blink 1.2s infinite}.dots span:nth-child(2){animation-delay:.2s}.dots span:nth-child(3){animation-delay:.4s}
.board{isolation:isolate;position:relative;width:min(86vw,340px);aspect-ratio:1;margin:8px auto;display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.cell{background:var(--card2);border-radius:18px;cursor:pointer;transition:transform .15s,background .2s,box-shadow .2s;display:grid;place-items:center}
.board.mine .cell:empty:hover{background:var(--card);box-shadow:inset 0 0 0 2px var(--gold);transform:scale(1.04)}
.cell svg{width:72%;height:72%;overflow:visible}
.cell path,.cell circle{fill:none;stroke-width:10;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:draw .38s ease-out forwards}
.cell .d2{animation-delay:.18s}
.cell.X path{stroke:var(--x);filter:drop-shadow(0 0 6px var(--x))}
.cell.O circle{stroke:var(--o);filter:drop-shadow(0 0 6px var(--o));transform:rotate(-90deg);transform-origin:50% 50%}
.cell.win{animation:winpulse .7s 2}
.wl{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.wl line{stroke:var(--gold);stroke-width:9;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:draw .6s .1s ease-out forwards;filter:drop-shadow(0 0 8px var(--gold))}
.score{display:flex;justify-content:center;gap:10px;margin-top:14px}
.sb{min-width:88px;text-align:center;background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:7px 10px}
.sb small{display:block;color:var(--tx);font-size:12px;font-weight:700;margin-bottom:2px}.sb b{font-size:24px;line-height:1}
.sb.me{border-color:var(--ok)}.sb.me b{color:var(--ok)}.sb.op{border-color:var(--x)}.sb.op b{color:var(--x)}
.cf{position:fixed;width:8px;height:13px;top:42%;left:50%;z-index:60;border-radius:2px;pointer-events:none;animation:fly 1.5s ease-out forwards}
@keyframes in{from{opacity:0;transform:translateY(14px)}}@keyframes pulse{50%{opacity:.35;transform:scale(.75)}}
@keyframes glow{50%{box-shadow:0 0 28px rgba(255,201,51,.45)}}@keyframes shrink{to{transform:scaleX(0)}}
@keyframes swing{50%{transform:rotate(-14deg) scale(1.15)}}@keyframes fade{from{opacity:0}}
@keyframes pop{from{opacity:0;transform:scale(.7)}}@keyframes ring{from{transform:scale(.9);opacity:1}to{transform:scale(1.6);opacity:0}}
@keyframes bounce{50%{transform:translateY(-10px)}}@keyframes draw{to{stroke-dashoffset:0}}
@keyframes blink{50%{opacity:.15}}@keyframes winpulse{50%{transform:scale(1.09);background:rgba(255,201,51,.25)}}
@keyframes fly{to{transform:translate(var(--dx),var(--dy)) rotate(var(--r));opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important}}
`
