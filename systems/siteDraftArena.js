// ⚔️ درافت الأنمي PvP (arena-11) على الموقع — /u/:code/draft-arena
//
// التدفق: لوبي (المتصلون) ← دعوة 30ث ← البوت يختار 10 شخصيات عشوائية ← الحظ يحدد من يبدأ (ظاهر للطرفين)
//         ← باند (كل لاعب يحظر شخصية واحدة لا تُستعمل) ← اختيار 3×3 من المتبقي ← مواجهة VS ← معركة arena-11.
//
// الخادم هو مصدر الحقيقة لكل القرارات (من يبدأ، الباند، الاختيار، بذرة المعركة).
// المعركة نفسها تُحاكى في متصفح كل لاعب بنفس البذرة (محرك arena-11 الأصلي بنفس الأنميشن)
// فتظهر متطابقة، وكل طرف يرسل النتيجة والخادم يؤكدها.
//
// الاستخدام (index.js):
//   const siteDraftArena = require('./systems/siteDraftArena')({ Player, getMedia: arenaMedia.getMedia, onFinish })
//   ...registerCharacterSite(app, Player, { ..., draftArena: siteDraftArena })

'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { loadRanking } = require('./draftArena/rank')

const DIR = path.join(__dirname, 'draftArena')
const ROSTER = JSON.parse(fs.readFileSync(path.join(DIR, 'roster.json'), 'utf8')) // [{id, c:[name,form,anime,power,ability,img]}]
const IDS = ROSTER.map(r => r.id)
const ENGINE_JS = fs.readFileSync(path.join(DIR, 'engine.js'), 'utf8')
const STYLE_CSS = fs.readFileSync(path.join(DIR, 'style.css'), 'utf8')
const BODY_HTML = fs.readFileSync(path.join(DIR, 'body.html'), 'utf8')

// ───────── إعدادات (غيّرها هنا) ─────────
const POOL_SIZE = 10          // عدد الشخصيات العشوائية التي يختارها البوت
const TEAM_SIZE = 3           // كل لاعب يختار 3
const BAN_MS = 40000          // مهلة الحظر لكل لاعب (يُحظر عشوائياً عند انتهائها)
const PICK_MS = 40000         // مهلة الاختيار
const INVITE_MS = 30000       // مهلة قبول الدعوة
const RESULT_GRACE_MS = 25000 // لو أرسل طرف واحد النتيجة نعتمدها بعد هذه المهلة
const BATTLE_MAX_MS = 20 * 60 * 1000
const SSE_MAX_TOTAL = 400, SSE_MAX_USER = 2, SSE_LIFETIME_MS = 4 * 60 * 1000, SSE_PING_MS = 25000
const OFFLINE_GRACE_MS = 20000
const DAILY_FIGHTS = 5        // 🗓️ عدد قتالات الدرافت المسموحة لكل لاعب يومياً (يتجدد 12ص بتوقيت السعودية)
const MAX_WATCHERS = 60       // أقصى عدد مشاهدين للمباراة الواحدة

// يوم السعودية (UTC+3) بصيغة YYYY-MM-DD
const ksaDay = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10)

const rand = n => crypto.randomInt(0, n)
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1);[a[i], a[j]] = [a[j], a[i]] } return a }

module.exports = function createSiteDraftArena(deps = {}) {
    const Player = deps.Player
    const getMedia = typeof deps.getMedia === 'function' ? deps.getMedia : () => ({})
    const onFinish = typeof deps.onFinish === 'function' ? deps.onFinish : null

    const online = new Map()   // code → { code, userId, name, conns:Set, off:Timeout }
    const rooms = new Map()    // roomId → room
    const roomOf = new Map()   // code → roomId
    const invites = new Map()  // inviteId → { id, from, to, expires, timer }
    const lastInvite = new Map()
    const watching = new Map() // code → roomId (من يشاهد مباراة)
    let sseTotal = 0
    let bcT = null

    // ───────── بث ─────────
    const write = (res, o) => { try { res.write('data: ' + JSON.stringify(o) + '\n\n') } catch (_) {} }
    const toCode = (code, o) => { const u = online.get(code); if (u) for (const r of u.conns) write(r, { ...o, now: Date.now() }) }
    const onlineList = () => [...online.values()].filter(u => u.conns.size).map(u => ({ code: u.code, name: u.name, status: roomOf.has(u.code) ? 'busy' : 'online' }))
    function broadcastOnline() {
        if (bcT) return
        bcT = setTimeout(() => {
            bcT = null
            const list = onlineList()
            const live = liveList()
            for (const u of online.values()) toCode(u.code, { t: 'online', online: list.filter(p => p.code !== u.code), live })
        }, 300)
    }

    // ───────── 🗓️ الحد اليومي (5 قتالات) — محفوظ في Player.draftDaily = { day, count } ─────────
    async function fightsLeft(userId) {
        try {
            const p = await Player.findOne({ userId }).select('draftDaily').lean()
            const d = p && p.draftDaily
            return Math.max(0, DAILY_FIGHTS - (d && d.day === ksaDay() ? (d.count | 0) : 0))
        } catch (_) { return DAILY_FIGHTS }
    }
    // يستهلك قتالاً واحداً (ذرّي: لا يتجاوز الحد أبداً). يرجع المتبقي، أو -1 لو فشل
    async function useFight(userId) {
        const day = ksaDay()
        try {
            let r = await Player.updateOne({ userId, 'draftDaily.day': day, 'draftDaily.count': { $lt: DAILY_FIGHTS } }, { $inc: { 'draftDaily.count': 1 } })
            if (!r.modifiedCount && !r.nModified) {
                r = await Player.updateOne({ userId, 'draftDaily.day': { $ne: day } }, { $set: { draftDaily: { day, count: 1 } } })
            }
            return fightsLeft(userId)
        } catch (e) { console.log('draftArena useFight error:', e?.message); return -1 }
    }
    async function pushQuota(code, userId) { toCode(code, { t: 'quota', left: await fightsLeft(userId), max: DAILY_FIGHTS }) }

    // ───────── 📺 المباريات الحيّة ─────────
    const liveList = () => [...rooms.values()]
        .filter(r => r.phase === 'ban' || r.phase === 'pick' || r.phase === 'battle')
        .map(r => ({ id: r.id, names: r.players.map(p => p.name), phase: r.phase, since: r.battleAt || r.createdAt, watchers: r.watchers.size, teams: r.phase === 'battle' ? r.picks : null }))
    const specView = room => ({ ...roomView(room, -1), spectator: true, startedAt: room.battleAt || 0 })
    function leaveWatch(code) {
        const rid = watching.get(code); if (!rid) return
        watching.delete(code)
        const room = rooms.get(rid); if (room) room.watchers.delete(code)
    }

    // ───────── الغرف ─────────
    const turnOf = room => {
        const f = room.first, o = 1 - f
        if (room.phase === 'ban') return [f, o][room.bans.filter(Boolean).length] ?? f
        if (room.phase === 'pick') return [f, o, f, o, f, o][room.picks[0].length + room.picks[1].length] ?? f
        return -1
    }
    const roomView = (room, me) => ({
        id: room.id, me, names: room.players.map(p => p.name), pool: room.pool, first: room.first, phase: room.phase,
        turn: turnOf(room), bans: room.bans.map(b => b || null), picks: room.picks, deadline: room.deadline,
        seed: room.seed, winner: room.winner, reason: room.reason
    })
    const pushRoom = room => {
        room.players.forEach((p, i) => toCode(p.code, { t: 'room', room: roomView(room, i) }))
        if (room.watchers.size) { const v = specView(room); room.watchers.forEach(c => toCode(c, { t: 'watch', room: v })) }
    }
    const freeIds = room => room.pool.filter(id => !room.bans.includes(id) && !room.picks[0].includes(id) && !room.picks[1].includes(id))

    function schedule(room) {
        clearTimeout(room.timer)
        if (room.phase === 'ban' || room.phase === 'pick') {
            room.deadline = Date.now() + (room.phase === 'ban' ? BAN_MS : PICK_MS)
            room.timer = setTimeout(() => {
                const free = freeIds(room)
                if (!free.length || !rooms.has(room.id)) return
                // انتهت المهلة: اختيار عشوائي للاعب صاحب الدور
                step(room, turnOf(room), free[rand(free.length)])
            }, room.deadline - Date.now() + 50)
        } else if (room.phase === 'battle') {
            room.deadline = Date.now() + BATTLE_MAX_MS
            room.timer = setTimeout(() => finish(room, null, 'انتهت مهلة المعركة بلا نتيجة مؤكدة'), BATTLE_MAX_MS)
        }
    }

    function step(room, idx, id) {
        if (room.phase === 'ban') {
            room.bans[idx] = id
            if (room.bans.filter(Boolean).length >= 2) room.phase = 'pick'
        } else if (room.phase === 'pick') {
            room.picks[idx].push(id)
            if (room.picks[0].length >= TEAM_SIZE && room.picks[1].length >= TEAM_SIZE) {
                room.phase = 'battle'
                room.battleAt = Date.now()
                room.seed = crypto.randomInt(1, 2 ** 31 - 1)
                // 🗓️ يُحسب القتال عند بدء المعركة فعلاً (الانسحاب أثناء الباند/الاختيار لا يُحسب)
                room.players.forEach(p => useFight(p.userId).then(() => pushQuota(p.code, p.userId)))
                broadcastOnline()
            }
        }
        schedule(room)
        pushRoom(room)
    }

    function finish(room, winner, reason) {
        if (room.phase === 'done') return
        clearTimeout(room.timer); clearTimeout(room.graceTimer)
        room.phase = 'done'; room.winner = winner; room.reason = reason || ''
        pushRoom(room)
        if (winner !== null && onFinish) {
            try { Promise.resolve(onFinish({ room: roomView(room, 0), winnerIdx: winner, loserIdx: 1 - winner, players: room.players.map(p => ({ code: p.code, userId: p.userId, name: p.name })) })).catch(e => console.log('draftArena onFinish error:', e?.message)) }
            catch (e) { console.log('draftArena onFinish error:', e?.message) }
        }
        room.cleanup = setTimeout(() => closeRoom(room), 60000)
        broadcastOnline()
    }

    function closeRoom(room) {
        clearTimeout(room.timer); clearTimeout(room.graceTimer); clearTimeout(room.cleanup)
        rooms.delete(room.id)
        room.watchers.forEach(c => { watching.delete(c); toCode(c, { t: 'watch_end', msg: 'انتهت المباراة' }) }); room.watchers.clear()
        room.players.forEach(p => { if (roomOf.get(p.code) === room.id) roomOf.delete(p.code) })
        broadcastOnline()
    }

    function createRoom(a, b) {
        const room = {
            id: crypto.randomBytes(6).toString('hex'),
            players: [a, b].map(u => ({ code: u.code, userId: u.userId, name: u.name })),
            pool: shuffle(IDS).slice(0, POOL_SIZE),   // 🎲 البوت يختار 10 عشوائياً
            first: rand(2),                            // 🎲 من يبدأ (يحظر/يختار/يهاجم أولاً) — ظاهر للطرفين
            phase: 'ban', bans: [null, null], picks: [[], []], deadline: 0, seed: 0, winner: null, reason: '', reports: {},
            watchers: new Set(), createdAt: Date.now(), battleAt: 0
        }
        rooms.set(room.id, room)
        room.players.forEach(p => { roomOf.set(p.code, room.id); leaveWatch(p.code) })
        schedule(room); pushRoom(room); broadcastOnline()
        return room
    }

    // ───────── الدعوات ─────────
    function endInvite(inv, msgFrom, msgTo) {
        clearTimeout(inv.timer); invites.delete(inv.id)
        toCode(inv.to, { t: 'invite_end', id: inv.id, msg: msgTo })
        toCode(inv.from, { t: 'invite_end', id: inv.id, msg: msgFrom })
    }
    const invitesOf = code => [...invites.values()].filter(i => i.from === code || i.to === code)

    async function handleAct(me, b) {
        const a = String(b.a || '')
        const u = online.get(me.code)
        if (a === 'invite') {
            const to = String(b.to || '')
            const target = online.get(to)
            if (!target || !target.conns.size || to === me.code) return { ok: false, error: 'اللاعب غير متصل' }
            if (roomOf.has(me.code)) return { ok: false, error: 'أنت داخل مباراة' }
            if (roomOf.has(to)) return { ok: false, error: 'اللاعب داخل مباراة' }
            if (await fightsLeft(me.userId) <= 0) return { ok: false, error: `استنفدت قتالاتك اليومية (${DAILY_FIGHTS}/${DAILY_FIGHTS}) — تتجدد 12 منتصف الليل بتوقيت السعودية` }
            if (target.userId && await fightsLeft(target.userId) <= 0) return { ok: false, error: `${target.name} استنفد قتالاته اليومية` }
            if (Date.now() - (lastInvite.get(me.code) || 0) < 2500) return { ok: false, error: 'انتظر لحظة قبل دعوة جديدة' }
            if (invitesOf(me.code).some(i => i.from === me.code)) return { ok: false, error: 'عندك دعوة معلّقة — ألغها أولاً' }
            if (invitesOf(to).some(i => i.to === to)) return { ok: false, error: 'اللاعب عليه دعوة أخرى الآن' }
            lastInvite.set(me.code, Date.now())
            const inv = { id: crypto.randomBytes(5).toString('hex'), from: me.code, to, expires: Date.now() + INVITE_MS }
            inv.timer = setTimeout(() => { if (invites.has(inv.id)) endInvite(inv, `انتهت مهلة رد ${target.name}`, 'انتهت مهلة الدعوة') }, INVITE_MS + 100)
            invites.set(inv.id, inv)
            toCode(to, { t: 'invite', invite: { id: inv.id, name: (u || me).name, expires: inv.expires } })
            return { ok: true, id: inv.id, expires: inv.expires, name: target.name }
        }
        if (a === 'cancel') {
            const inv = invites.get(String(b.id || ''))
            if (inv && inv.from === me.code) endInvite(inv, 'أُلغيت الدعوة', 'ألغى المتحدّي الدعوة')
            return { ok: true }
        }
        if (a === 'decline') {
            const inv = invites.get(String(b.id || ''))
            if (inv && inv.to === me.code) endInvite(inv, `${me.name} رفض التحدي`, '')
            return { ok: true }
        }
        if (a === 'accept') {
            const inv = invites.get(String(b.id || ''))
            if (!inv || inv.to !== me.code || inv.expires < Date.now()) return { ok: false, error: 'انتهت الدعوة' }
            const from = online.get(inv.from)
            if (!from || !from.conns.size) { endInvite(inv, '', 'المتحدّي غادر'); return { ok: false, error: 'المتحدّي غادر' } }
            if (roomOf.has(inv.from) || roomOf.has(inv.to)) { endInvite(inv, 'أحدكما داخل مباراة', ''); return { ok: false, error: 'غير متاح الآن' } }
            if (await fightsLeft(me.userId) <= 0) { endInvite(inv, `${me.name} استنفد قتالاته اليومية`, ''); return { ok: false, error: `استنفدت قتالاتك اليومية (${DAILY_FIGHTS}/${DAILY_FIGHTS})` } }
            if (from.userId && await fightsLeft(from.userId) <= 0) { endInvite(inv, `${from.name} استنفد قتالاته اليومية`, ''); return { ok: false, error: 'المتحدّي استنفد قتالاته اليومية' } }
            clearTimeout(inv.timer); invites.delete(inv.id)
            // بقية الدعوات المعلّقة للطرفين تُلغى
            invitesOf(inv.from).concat(invitesOf(inv.to)).forEach(i => endInvite(i, 'الخصم دخل مباراة', 'دخل أحد الطرفين مباراة'))
            createRoom(from, online.get(inv.to) || me)
            return { ok: true }
        }
        if (a === 'ban' || a === 'pick') {
            const room = rooms.get(roomOf.get(me.code))
            if (!room) return { ok: false, error: 'لا توجد مباراة' }
            const idx = room.players.findIndex(p => p.code === me.code)
            if (room.phase !== (a === 'ban' ? 'ban' : 'pick')) return { ok: false, error: 'ليست هذه المرحلة' }
            if (turnOf(room) !== idx) return { ok: false, error: 'ليس دورك' }
            const id = String(b.id || '')
            if (!freeIds(room).includes(id)) return { ok: false, error: 'هذه الشخصية غير متاحة' }
            step(room, idx, id)
            return { ok: true }
        }
        if (a === 'result') {
            const room = rooms.get(roomOf.get(me.code))
            if (!room || room.id !== String(b.rid || '') || room.phase !== 'battle') return { ok: true }
            const idx = room.players.findIndex(p => p.code === me.code)
            const w = Number(b.w)
            if (w !== 0 && w !== 1) return { ok: false }
            room.reports[idx] = w
            const r0 = room.reports[0], r1 = room.reports[1]
            if (r0 !== undefined && r1 !== undefined) {
                if (r0 === r1) finish(room, r0, '')
                else finish(room, null, 'اختلفت النتيجة بين الطرفين — لم تُحتسب')
            } else if (!room.graceTimer) {
                room.graceTimer = setTimeout(() => {
                    const only = room.reports[0] ?? room.reports[1]
                    if (room.phase === 'battle' && only !== undefined) finish(room, only, '')
                }, RESULT_GRACE_MS)
            }
            return { ok: true }
        }
        if (a === 'watch') {
            if (roomOf.has(me.code)) return { ok: false, error: 'أنت داخل مباراة' }
            const room = rooms.get(String(b.rid || ''))
            if (!room || room.phase !== 'battle') return { ok: false, error: 'المباراة ليست قيد القتال الآن' }
            if (room.watchers.size >= MAX_WATCHERS && !room.watchers.has(me.code)) return { ok: false, error: 'اكتمل عدد المشاهدين' }
            leaveWatch(me.code)
            room.watchers.add(me.code); watching.set(me.code, room.id)
            toCode(me.code, { t: 'watch', room: specView(room) })
            broadcastOnline()
            return { ok: true }
        }
        if (a === 'unwatch') { leaveWatch(me.code); broadcastOnline(); return { ok: true } }
        if (a === 'leave') {
            const room = rooms.get(roomOf.get(me.code))
            if (room) {
                if (room.phase === 'ban' || room.phase === 'pick') {
                    finish(room, null, `${me.name} غادر التحدي`)
                    closeRoom(room)
                } else if (room.phase === 'done') {
                    if (roomOf.get(me.code) === room.id) roomOf.delete(me.code)
                    broadcastOnline()
                }
            }
            return { ok: true }
        }
        return { ok: false, error: 'طلب غير معروف' }
    }

    // ───────── المسارات ─────────
    function mount(app, ctx) {
        const { auth, jsonBody, securityHeaders, CODE_RE, html404, ownerSession, esc } = ctx
        const express = require('express')

        const pageHeaders = res => {
            securityHeaders(res)
            // الفيديو من Cloudinary + صور https — بدون blob/fetch خارجي
            res.set('Content-Security-Policy',
                "default-src 'self'; img-src https: data: 'self'; media-src 'self' https://res.cloudinary.com; " +
                "style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; " +
                "frame-ancestors 'none'; form-action 'self'; base-uri 'none'")
        }

        app.use('/draft-arena-assets', express.static(path.join(DIR, 'assets'), { maxAge: '7d', fallthrough: true }))
        app.get('/draft-arena/engine.js', (req, res) => { res.type('application/javascript').set('Cache-Control', 'public, max-age=120').send(ENGINE_JS) })
        app.get('/draft-arena/style.css', (req, res) => { res.type('text/css').set('Cache-Control', 'public, max-age=120').send(STYLE_CSS) })

        async function who(req, res, needCsrfBody) {
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) { html404(res); return null }
            const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion').lean()
            if (!player) { html404(res); return null }
            const sess = ownerSession(req, player)
            return { code, player, sess, name: String(player.username || player.name || 'لاعب').slice(0, 24) }
        }

        // الصفحة
        app.get('/u/:code/draft-arena', async (req, res) => {
            try {
                pageHeaders(res)
                const w = await who(req, res); if (!w) return
                if (!w.sess) return res.redirect('/u/' + w.code)
                const media = (await getMedia()) || {}
                const chars = ROSTER.map(r => { const c = r.c.slice(); if (media[r.id] && media[r.id].before) c[5] = media[r.id].before; return c })
                const cfg = { base: `/u/${w.code}/draft-arena`, csrf: auth.csrfForSession(w.sess), me: { code: w.code, name: w.name }, chars, media }
                const json = JSON.stringify(cfg).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, '')
                res.send(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>درافت الأنمي — تحدّي الأساطير</title>
<link rel="stylesheet" href="/draft-arena/style.css"></head><body>
<div class="wrap"><a class="back" href="/u/${esc(w.code)}">← رجوع للموقع</a>
${BODY_HTML}
</div>
<script>window.ARENA=${json}</script>
<script src="/draft-arena/engine.js"></script></body></html>`)
            } catch (err) { console.error('draft arena page error:', err); res.status(500).send('خطأ بالخادم') }
        })

        // البث المباشر (SSE)
        app.get('/u/:code/draft-arena/stream', async (req, res) => {
            try {
                const w = await who(req, res); if (!w) return
                if (!w.sess) return res.status(401).end()
                let u = online.get(w.code)
                if (sseTotal >= SSE_MAX_TOTAL || (u && u.conns.size >= SSE_MAX_USER)) return res.status(429).end()
                if (!u) { u = { code: w.code, userId: w.player.userId, name: w.name, conns: new Set(), off: null }; online.set(w.code, u) }
                clearTimeout(u.off); u.name = w.name
                sseTotal++; u.conns.add(res)
                res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no', 'X-Content-Type-Options': 'nosniff' })
                try { req.socket.setTimeout(0); req.socket.setNoDelay(true) } catch (_) {}
                res.write('retry: 3000\n\n')

                const room = rooms.get(roomOf.get(w.code))
                write(res, {
                    t: 'hello', now: Date.now(),
                    online: onlineList().filter(p => p.code !== w.code), live: liveList(),
                    left: await fightsLeft(w.player.userId), max: DAILY_FIGHTS,
                    invites: invitesOf(w.code).filter(i => i.to === w.code).map(i => ({ id: i.id, name: online.get(i.from)?.name || 'لاعب', expires: i.expires })),
                    room: room ? roomView(room, room.players.findIndex(p => p.code === w.code)) : null
                })
                broadcastOnline()

                let closed = false
                const ping = setInterval(() => { if (!closed) { try { res.write(': ping\n\n') } catch (_) {} } }, SSE_PING_MS)
                const cleanup = () => {
                    if (closed) return; closed = true
                    clearInterval(ping); clearTimeout(life)
                    sseTotal = Math.max(0, sseTotal - 1); u.conns.delete(res)
                    try { res.end() } catch (_) {}
                    if (!u.conns.size) {
                        // مهلة قصيرة تسمح بإعادة الاتصال/تحديث الصفحة بدون خروج
                        u.off = setTimeout(() => {
                            if (u.conns.size) return
                            online.delete(u.code); leaveWatch(u.code)
                            invitesOf(u.code).forEach(i => endInvite(i, 'اللاعب غادر', 'غادر المتحدّي'))
                            broadcastOnline()
                        }, OFFLINE_GRACE_MS)
                    }
                }
                const life = setTimeout(cleanup, SSE_LIFETIME_MS)
                req.on('close', cleanup); res.on('error', cleanup)
            } catch (err) { console.error('draft arena stream error:', err); try { res.status(500).end() } catch (_) {} }
        })

        // 🏆 ترتيب أقوى الشخصيات (محسوب بمحاكاة محرك الدرافت نفسه — انظر draftArena/rank.js)
        app.get('/u/:code/draft-arena/ranking', async (req, res) => {
            res.set('Cache-Control', 'private, max-age=60')
            try {
                const w = await who(req, res); if (!w) return
                if (!w.sess) return res.status(401).json({ ok: false })
                const list = await loadRanking()
                res.json({ ok: true, ready: list.length > 0, list })
            } catch (err) { console.error('draft arena ranking error:', err); res.status(500).json({ ok: false }) }
        })

        // الأفعال
        app.post('/u/:code/draft-arena/act', jsonBody, async (req, res) => {
            res.set('Cache-Control', 'no-store')
            try {
                const w = await who(req, res); if (!w) return
                if (!w.sess || !auth.sameOrigin(req)) return res.status(403).json({ ok: false, error: 'غير مصرّح' })
                if (!auth.verifyCsrf(w.sess, req.body && req.body.csrf)) return res.status(403).json({ ok: false, error: 'انتهت صلاحية الصفحة — حدّثها' })
                const u = online.get(w.code)
                const me = { code: w.code, userId: w.player.userId, name: (u && u.name) || w.name }
                if (!u && String(req.body.a) !== 'leave') return res.json({ ok: false, error: 'الاتصال غير نشط — حدّث الصفحة' })
                res.json(await handleAct(me, req.body || {}))
            } catch (err) { console.error('draft arena act error:', err); res.status(500).json({ ok: false, error: 'خطأ بالخادم' }) }
        })
    }

    return { mount, _rooms: rooms }
}
