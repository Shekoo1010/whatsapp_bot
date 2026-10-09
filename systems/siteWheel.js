'use strict'

/**
 * 🎡 عجلة الحظ اليومية — /u/:code/wheel
 *
 * - لفة مجانية واحدة باليوم، تتجدد 12:00 صباحاً بتوقيت السعودية (نفس .يومي).
 * - السيرفر هو اللي يختار الجائزة (المتصفح للعرض فقط)، وتُحفظ بحساب اللاعب (wheel.pending)
 *   حتى لو سكّر الصفحة قبل «مطالبة» ما تضيع.
 * - عملات السحب تنحفظ بحقل مستقل (bonusPulls) ولا تتصفّر مع تجديد السحبات كل ساعة.
 *
 * الاستخدام (index.js):
 *   const { createSiteWheel } = require('./systems/siteWheel')
 *   const siteWheel = createSiteWheel({ Player, getRandomCharacterByRarity, getCharByNameRarityFast })
 *   registerCharacterSite(app, Player, { ..., wheel: siteWheel })
 */

const crypto = require('crypto')
const { logReward } = require('./rewardLog')

// ─────────────── الجوائز (الترتيب = ترتيب خانات العجلة) ───────────────
// w = نسبة الظهور %  (المجموع 100) — عدّلها من هنا فقط
const PRIZES = [
    { k: 'money', n: 'فلوس', i: '💰', c: '#e0a800', w: 24 },
    { k: 'coins', n: 'عملات سحب', i: '🎟️', c: '#2fb8d6', w: 18 },
    { k: 'box', n: 'صندوق اسطوري', i: '🎁', c: '#e8782a', w: 10 },
    { k: 'sss_high', n: 'SSS High', i: '💎', c: '#7c4dff', w: 5 },
    { k: 'sss_chance', n: 'SSS Chance', i: '🍀', c: '#18a96a', w: 7 },
    { k: 'leg', n: 'شخصية اسطوري', i: '🌟', c: '#d4551f', w: 9 },
    { k: 'exc', n: 'شخصية ممتاز', i: '✨', c: '#2a9d8f', w: 13 },
    { k: 'xp', n: 'XP', i: '📈', c: '#3b82d9', w: 13 },
    { k: 'sss', n: 'شخصية SSS', i: '👑', c: '#e0457f', w: 1 }
]
const RANGES = { money: [1, 500000], coins: [1, 5], xp: [1, 2000] }
const CHAR_RARITY = { leg: 'اسطوري', exc: 'ممتاز', sss: 'SSS' }
const BOX_FIELD = { box: 'legendary', sss_high: 'sss_high', sss_chance: 'sss_chance' }

const randInt = (a, b) => crypto.randomInt(a, b + 1)
const fmt = n => Number(n || 0).toLocaleString('en')

// اليوم بتوقيت السعودية (نفس صيغة dailyReward.lastClaim)
const saudiDay = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })
// ثواني حتى 12:00 ص بتوقيت السعودية (UTC+3 بدون توقيت صيفي)
const secondsToReset = () => Math.max(1, Math.ceil((864e5 - ((Date.now() + 3 * 36e5) % 864e5)) / 1000))

function describe(pd) {
    const p = PRIZES[pd.idx] || PRIZES[0]
    const base = { id: pd.id, idx: pd.idx, k: pd.k, i: p.i, c: p.c, label: p.n }
    switch (pd.k) {
        case 'money': return { ...base, t: `${fmt(pd.v)} فلوس`, d: 'تُضاف إلى رصيدك' }
        case 'coins': return { ...base, t: `${pd.v} عملات سحب`, d: 'محفوظة في حسابك ولا تُصفَّر' }
        case 'xp': return { ...base, t: `${fmt(pd.v)} XP`, d: 'خبرة تُضاف لمستواك' }
        case 'box': return { ...base, t: 'صندوق اسطوري', d: 'يُضاف لحقيبتك — افتحه من البوت' }
        case 'sss_high': return { ...base, t: 'صندوق SSS High', d: 'يُضاف لحقيبتك — افتحه من البوت' }
        case 'sss_chance': return { ...base, t: 'صندوق SSS Chance', d: 'يُضاف لحقيبتك — افتحه من البوت' }
        default: return { ...base, t: String(pd.name || '—'), d: `${pd.rarity || ''} · تُضاف إلى مجموعتك` }
    }
}

function createSiteWheel({ Player, getRandomCharacterByRarity, getCharByNameRarityFast }) {

    // ─────────────── اختيار الجائزة (على السيرفر) ───────────────
    function rollPrize() {
        const r = crypto.randomInt(0, 10000) / 100
        let acc = 0, idx = PRIZES.length - 1
        for (let i = 0; i < PRIZES.length; i++) {
            acc += PRIZES[i].w
            if (r < acc) { idx = i; break }
        }
        const k = PRIZES[idx].k
        const out = { id: crypto.randomBytes(6).toString('hex'), idx, k, v: 1 }
        if (RANGES[k]) out.v = randInt(RANGES[k][0], RANGES[k][1])
        if (CHAR_RARITY[k]) {
            const ch = getRandomCharacterByRarity(CHAR_RARITY[k])
            if (ch) { out.name = ch.name; out.rarity = ch.rarity }
            else { out.idx = PRIZES.findIndex(p => p.k === 'coins'); out.k = 'coins'; out.v = 1 } // ما فيه شخصيات بهالفئة → عملة سحب
        }
        return out
    }

    function stateOf(p) {
        const w = (p && p.wheel) || {}
        return {
            used: w.lastSpin === saudiDay(),
            pending: w.pending ? describe(w.pending) : null,
            resetIn: secondsToReset(),
            money: Number(p && p.money) || 0,
            bonus: Number(p && p.bonusPulls) || 0,
            spins: Number(w.spins) || 0
        }
    }

    // ─────────────── اللف ───────────────
    const locks = new Set()

    async function spin(userId) {
        if (locks.has(userId)) return { ok: false, code: 'BUSY' }
        locks.add(userId)
        try {
            const today = saudiDay()
            const prize = rollPrize()
            // ذرّي: لفة واحدة باليوم + ما فيه جائزة معلّقة — حتى لو أُرسل طلبان بنفس اللحظة
            const doc = await Player.findOneAndUpdate(
                { userId, 'wheel.lastSpin': { $ne: today }, 'wheel.pending': null },
                { $set: { 'wheel.lastSpin': today, 'wheel.pending': prize }, $inc: { 'wheel.spins': 1 } },
                { new: true }
            )
            if (!doc) {
                const p = await Player.findOne({ userId }).select('wheel money bonusPulls').lean()
                if (!p) return { ok: false, code: 'NO_PLAYER' }
                if (p.wheel && p.wheel.pending) return { ok: false, code: 'PENDING', state: stateOf(p) }
                return { ok: false, code: 'USED', state: stateOf(p) }
            }
            return { ok: true, prize: describe(prize), state: stateOf(doc) }
        } catch (e) {
            console.error('wheel spin error:', e)
            return { ok: false, code: 'SERVER' }
        } finally {
            locks.delete(userId)
        }
    }

    // ─────────────── المطالبة ───────────────
    async function claim(userId, id) {
        if (locks.has(userId)) return { ok: false, code: 'BUSY' }
        locks.add(userId)
        try {
            const p = await Player.findOne({ userId })
            if (!p) return { ok: false, code: 'NO_PLAYER' }
            const pd = p.wheel && p.wheel.pending
            if (!pd || (id && pd.id !== id)) return { ok: false, code: 'NONE', state: stateOf(p) }

            let reward = pd
            let money = 0

            if (CHAR_RARITY[pd.k]) {
                if ((p.characters || []).length >= (Number(p.maxCharacters) || 30)) {
                    return { ok: false, code: 'FULL', cap: Number(p.maxCharacters) || 30, state: stateOf(p) }
                }
                const base = getCharByNameRarityFast(pd.name, pd.rarity)
                if (base) {
                    p.characters = p.characters || []
                    p.characters.push({ ...base, originalPower: base.power, evolutionLevel: 0, urAbilities: [] })
                } else {
                    // الشخصية انحذفت من الكتالوج بعد اللف → تعويض بعملة سحب
                    reward = { ...pd, k: 'coins', idx: PRIZES.findIndex(x => x.k === 'coins'), v: 1 }
                    p.bonusPulls = (p.bonusPulls || 0) + 1
                }
            } else if (pd.k === 'coins') {
                p.bonusPulls = (p.bonusPulls || 0) + pd.v
            } else if (BOX_FIELD[pd.k]) {
                p.boxes = p.boxes || {}
                p.boxes[BOX_FIELD[pd.k]] = (p.boxes[BOX_FIELD[pd.k]] || 0) + 1
            } else if (pd.k === 'xp') {
                p.xp = (p.xp || 0) + pd.v // رفع المستوى تلقائي بـ pre-save بـ Player.js
            } else if (pd.k === 'money') {
                money = pd.v
            }

            // نمسح الجائزة المعلّقة بنفس الحفظ — فما تنصرف مرتين
            p.wheel.pending = null
            p.markModified('wheel')
            await p.save()

            if (money > 0) await p.addMoney(money) // نفس .يومي: يمر بسداد الدين + إجمالي الأرباح

            const shown = describe(reward)
            logReward(userId, { src: 'عجلة الحظ', icon: '🎡', lines: [shown.t] }) // 🎁 سجل الجوائز

            return { ok: true, reward: describe(reward), state: stateOf(p) }
        } catch (e) {
            console.error('wheel claim error:', e)
            return { ok: false, code: 'SERVER' }
        } finally {
            locks.delete(userId)
        }
    }

    // ─────────────── المسارات + الصفحة ───────────────
    const MSG = {
        USED: 'استخدمت لفة اليوم — تتجدد 12:00 ص بتوقيت السعودية.',
        PENDING: 'عندك جائزة لم تستلمها — اضغط «مطالبة».',
        NONE: 'ما فيه جائزة للاستلام.',
        FULL: 'المخزون ممتلئ — بِع أو أهدِ شخصيات ثم اضغط «مطالبة» مرة ثانية.',
        BUSY: 'انتظر لحظة…',
        NO_PLAYER: 'حسابك غير موجود.',
        SERVER: 'صار خطأ بالخادم — حدّث الصفحة وحاول مرة ثانية.'
    }

    function mount(app, deps) {
        const { auth, jsonBody, securityHeaders, CODE_RE, html404, ownerSession, esc, navDrawerHTML, NAV_BTN } = deps

        const hits = new Map()
        function rate(userId) {
            const now = Date.now()
            const arr = (hits.get(userId) || []).filter(t => now - t < 60 * 1000)
            if (arr.length >= 20) { hits.set(userId, arr); return false }
            arr.push(now); hits.set(userId, arr); return true
        }

        // فحوصات مشتركة (نفس /pull): مفعّل، نفس الأصل، جلسة، CSRF، حد الطلبات، نسخة الجلسة
        async function guard(req, res) {
            res.set('Cache-Control', 'no-store')
            const fail = (status, code, message) => { res.status(status).json({ ok: false, code, message }); return null }
            if (!auth.authEnabled()) return fail(503, 'DISABLED', 'العجلة غير مفعّلة حالياً.')
            if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')
            const sess = auth.readSession(req)
            if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
            const b = req.body || {}
            if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
            if (!rate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')
            const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
            if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
            return { sess, body: b }
        }

        app.get('/u/:code/wheel', async (req, res) => {
            try {
                securityHeaders(res)
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return html404(res)
                const player = await Player.findOne({ siteCode: code })
                    .select('userId name username sessionVersion wheel money bonusPulls').lean()
                if (!player) return html404(res)
                const sess = ownerSession(req, player)
                if (!sess) return res.redirect(303, `/login?code=${code}`)
                res.send(pageHTML({
                    code,
                    viewer: { name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) },
                    state: stateOf(player),
                    esc, navDrawerHTML, NAV_BTN
                }))
            } catch (err) {
                console.error('wheel page error:', err)
                res.status(500).send('خطأ بالخادم')
            }
        })

        app.post('/wheel/spin', jsonBody, async (req, res) => {
            try {
                const g = await guard(req, res); if (!g) return
                const r = await spin(g.sess.u)
                if (!r.ok) {
                    const status = r.code === 'SERVER' ? 500 : r.code === 'BUSY' ? 409 : 400
                    return res.status(status).json({ ok: false, code: r.code, message: MSG[r.code] || MSG.SERVER, state: r.state })
                }
                res.json({ ok: true, idx: r.prize.idx, prize: r.prize, state: r.state })
            } catch (err) {
                console.error('wheel spin route error:', err)
                res.status(500).json({ ok: false, code: 'SERVER', message: MSG.SERVER })
            }
        })

        app.post('/wheel/claim', jsonBody, async (req, res) => {
            try {
                const g = await guard(req, res); if (!g) return
                const r = await claim(g.sess.u, String(g.body.id || ''))
                if (!r.ok) {
                    const status = r.code === 'SERVER' ? 500 : r.code === 'BUSY' ? 409 : 400
                    return res.status(status).json({ ok: false, code: r.code, message: MSG[r.code] || MSG.SERVER, state: r.state })
                }
                res.json({ ok: true, reward: r.reward, state: r.state })
            } catch (err) {
                console.error('wheel claim route error:', err)
                res.status(500).json({ ok: false, code: 'SERVER', message: MSG.SERVER })
            }
        })
    }

    return { mount, spin, claim, PRIZES }
}

// ─────────────── HTML ───────────────
const CSS = `
:root{--bg:#120e26;--panel:#2a2060;--line:#4b3d9a;--gold:#ffc83d;--gold-dim:#8a6d24;--text-dim:#a79fd6;--dim:#a79fd6;box-sizing:border-box}
*{box-sizing:inherit;margin:0;-webkit-tap-highlight-color:transparent}
html,body{background:var(--bg);color:#f4f1ff;font-family:'Tajawal',sans-serif;color-scheme:dark}
body{min-height:100vh;background:radial-gradient(100% 55% at 50% 0,#3a2790,var(--bg) 65%) fixed;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
.tb{display:flex;align-items:center;justify-content:space-between;gap:10px;max-width:440px;margin:0 auto;padding:12px 14px 0}
.who{font-size:13px;color:var(--dim)}
.app{max-width:440px;margin:0 auto;padding:6px 14px 30px;text-align:center}
.disp{font-family:'Lalezar',sans-serif;font-weight:400}
h1{font-size:36px;text-shadow:0 3px 0 #0006}
.sub{color:var(--dim);font-size:14px;margin-top:2px}
.stage{position:relative;width:min(88vw,360px);aspect-ratio:1;margin:18px auto 8px}
.stage>svg:not(.ptr){width:100%;height:100%;overflow:visible}
#wheel{transform-origin:0 0;transition:transform 5.6s cubic-bezier(.12,.72,.08,1)}
.ptr{position:absolute;top:-14px;left:50%;transform:translateX(-50%);width:36px;height:46px;z-index:3;filter:drop-shadow(0 3px 0 #0007);transform-origin:50% 20%}
.ptr.tick{animation:tick .12s}
@keyframes tick{50%{transform:translateX(-50%) rotate(-14deg)}}
.hub{position:absolute;inset:0;margin:auto;width:72px;height:72px;border-radius:50%;border:5px solid var(--gold);background:radial-gradient(#5a3fd1,#2a1a78);display:grid;place-items:center;font-family:'Lalezar';font-size:18px;box-shadow:0 4px 0 #0008,0 0 18px #7c4dffaa;z-index:2}
.btn{font-family:'Lalezar',sans-serif;font-size:26px;color:#4a2c00;border:0;border-radius:18px;padding:8px 40px;background:linear-gradient(#ffe27a,var(--gold));box-shadow:0 6px 0 #b27a00,0 10px 14px #0006;cursor:pointer;transition:transform .1s,box-shadow .1s}
.btn:active:not(:disabled){transform:translateY(5px);box-shadow:0 1px 0 #b27a00}
.btn:disabled{background:#4b4470;color:#a79fd6;box-shadow:0 6px 0 #2c2650;cursor:not-allowed}
.cd{margin-top:12px;font-size:15px;color:var(--dim);min-height:22px}.cd b{font-family:'Lalezar';font-size:22px;color:#fff;direction:ltr;display:inline-block;font-weight:400}
.err{margin:10px auto 0;max-width:340px;font-size:14px;color:#ffb4c4;min-height:20px}
.inv{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:20px}
.inv div{background:var(--panel);border:2px solid var(--line);border-radius:14px;padding:8px 4px;font-size:12px;color:var(--dim)}
.inv b{display:block;font-family:'Lalezar';font-size:18px;color:#fff;font-weight:400;direction:ltr}
.rv{position:fixed;inset:0;z-index:20;background:radial-gradient(circle,#000b,#000e);display:none;place-items:center;padding:20px}
.rv.on{display:grid}
.gift{--t:#ffc83d;position:relative;width:min(86vw,340px);padding:4px;border-radius:26px;background:linear-gradient(160deg,var(--t),#0008 80%);animation:pop .6s cubic-bezier(.2,1.4,.4,1)}
@keyframes pop{from{transform:scale(.2) rotate(-12deg);opacity:0}}
.gift .in{border-radius:22px;background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--t) 55%,#1d1640),#14102b 75%);padding:26px 18px 20px;overflow:hidden;position:relative}
.rays{position:absolute;left:50%;top:70px;width:520px;height:520px;margin:-260px 0 0 -260px;background:repeating-conic-gradient(color-mix(in srgb,var(--t) 40%,transparent) 0 8deg,transparent 8deg 20deg);animation:spin 14s linear infinite;-webkit-mask:radial-gradient(circle,#000 10%,transparent 62%);mask:radial-gradient(circle,#000 10%,transparent 62%)}
@keyframes spin{to{transform:rotate(360deg)}}
.gift>.in>*:not(.rays){position:relative}
.gi{font-size:92px;line-height:1;filter:drop-shadow(0 8px 0 #0006);animation:bob 1.6s ease-in-out infinite}
@keyframes bob{50%{transform:translateY(-8px)}}
.gt{font-size:15px;color:var(--t);font-weight:800;margin-top:6px}
.gn{font-size:34px;line-height:1.1;margin-top:2px;word-break:break-word}
.gd{font-size:14px;color:var(--dim);margin:6px 0 16px}
.gm{font-size:14px;color:#ffb4c4;margin:-6px 0 12px;min-height:0}
.conf{position:absolute;top:0;font-size:22px;animation:fall 2.6s ease-in forwards;pointer-events:none}
@keyframes fall{to{transform:translateY(110vh) rotate(540deg);opacity:.2}}
:focus-visible{outline:3px solid #5ee7ff;outline-offset:2px}
@media (prefers-reduced-motion:reduce){*{animation:none!important}#wheel{transition-duration:.01s}}
`

const JS = `
(function(){
var D=window.__W, P=D.prizes, S=D.state, CSRF=D.csrf, CODE=D.code, N=P.length, SEG=360/N, rot=0, busy=false, endAt=0, claiming=false, cur=null;
function $(i){return document.getElementById(i)}
function fmt(n){return Number(n||0).toLocaleString('en')}
function build(){var g='',a=Math.PI/180;
for(var i=0;i<N;i++){var s=i*SEG-90,e=s+SEG,x1=150*Math.cos(s*a),y1=150*Math.sin(s*a),x2=150*Math.cos(e*a),y2=150*Math.sin(e*a),m=i*SEG+SEG/2-90;
g+='<path d="M0 0L'+x1+' '+y1+'A150 150 0 0 1 '+x2+' '+y2+'Z" fill="'+P[i].c+'" stroke="#ffffff55" stroke-width="2"/>';
var w=P[i].n.split(' '),L=w.length>1?[w[0],w.slice(1).join(' ')]:[w[0]],tx='';
L.forEach(function(q,j){tx+='<text x="120" y="'+(L.length>1?(j?10:-10):0)+'" text-anchor="end" dominant-baseline="central" direction="ltr" font-family="Lalezar" font-size="17" fill="#fff" stroke="#0006" stroke-width="3" paint-order="stroke">'+q+'</text>'});
g+='<g transform="rotate('+m+')">'+tx+'<text x="136" y="0" text-anchor="middle" dominant-baseline="central" font-size="20" transform="rotate(90 136 0)">'+P[i].i+'</text></g>'}
for(var j=0;j<N;j++){var b=(j*SEG-90)*a;g+='<circle cx="'+143*Math.cos(b)+'" cy="'+143*Math.sin(b)+'" r="3.5" fill="#ffe27a"/>'}
$('wheel').innerHTML=g}
function msg(t){$('err').textContent=t||''}
function post(url,body){body=body||{};body.csrf=CSRF;body.code=CODE;
var ctl=('AbortController' in window)?new AbortController():null,tm=setTimeout(function(){if(ctl)ctl.abort()},30000);
return fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:ctl?ctl.signal:undefined,body:JSON.stringify(body)})
.then(function(r){return r.json().catch(function(){return{ok:false,message:'رد غير مفهوم من السيرفر'}}).then(function(j){clearTimeout(tm);if(r.status===401){location.href='/login?code='+CODE}return j})})
.catch(function(){clearTimeout(tm);return{ok:false,message:'تعذر الاتصال بالسيرفر — حاول مرة ثانية.'}})}
function render(){
$('i-money').textContent=fmt(S.money);$('i-bonus').textContent=fmt(S.bonus);$('i-spins').textContent=fmt(S.spins);
var sp=$('spin');
if(S.pending){sp.disabled=busy;sp.textContent='استلم جائزتك';$('cd').textContent='عندك جائزة تنتظر المطالبة'}
else if(S.used){sp.disabled=true;sp.textContent='استلمت لفة اليوم';endAt=Date.now()+S.resetIn*1000;tickCd()}
else{sp.disabled=busy;sp.textContent='لف العجلة';$('cd').textContent='لفتك المجانية جاهزة'}}
function tickCd(){clearTimeout(tickCd.h);if(!S.used||S.pending)return;
var s=Math.max(0,Math.ceil((endAt-Date.now())/1000)),f=function(n){return String(n).padStart(2,'0')};
if(s<=0){location.reload();return}
$('cd').innerHTML='اللفة القادمة بعد <b>'+f(Math.floor(s/3600))+':'+f(Math.floor(s%3600/60))+':'+f(s%60)+'</b>';
tickCd.h=setTimeout(tickCd,1000)}
function animateTo(idx,done){
var center=idx*SEG+SEG/2,jit=(Math.random()-.5)*SEG*.6;
rot+=360*6+(360-(rot%360))-center+jit;
$('wheel').style.transform='rotate('+rot+'deg)';
var last=-1,t0=performance.now();(function loop(){if(performance.now()-t0>5600)return;
var m=getComputedStyle($('wheel')).transform.match(/matrix\\(([^)]+)\\)/);
if(m){var v=m[1].split(','),ang=(Math.atan2(+v[1],+v[0])*180/Math.PI+360)%360,k=Math.floor(ang/SEG);
if(k!==last){last=k;var p=$('ptr');p.classList.remove('tick');void p.offsetWidth;p.classList.add('tick')}}
requestAnimationFrame(loop)})();
setTimeout(done,5900)}
function show(pz,note){cur=pz;var g=$('gift');g.style.setProperty('--t',pz.c);
g.innerHTML='<div class="in"><div class="rays"></div><div class="gi"></div><div class="gt"></div><div class="gn disp"></div><div class="gd"></div><div class="gm" id="gm"></div><button class="btn" id="claim" type="button">مطالبة</button></div>';
g.querySelector('.gi').textContent=pz.i;g.querySelector('.gt').textContent=pz.label;
g.querySelector('.gn').textContent=pz.t;g.querySelector('.gd').textContent=note||pz.d;
$('rv').classList.add('on');$('claim').focus();$('claim').onclick=claim;
if(!note){var em=[pz.i,'✨','⭐'];for(var c=0;c<22;c++){var s=document.createElement('span');s.className='conf';s.textContent=em[c%3];s.style.left=(2+Math.random()*94)+'%';s.style.animationDelay=(Math.random()*.8)+'s';$('rv').appendChild(s);setTimeout(function(x){return function(){x.remove()}}(s),3600)}}}
function claim(){if(claiming||!cur)return;claiming=true;var b=$('claim');b.disabled=true;$('gm').textContent='';
post('/wheel/claim',{id:cur.id}).then(function(j){claiming=false;
if(j.ok){S=j.state;cur=null;$('rv').classList.remove('on');msg('');render();return}
b.disabled=false;$('gm').textContent=j.message||'تعذرت المطالبة';if(j.state){S=j.state;render()}})}
$('spin').onclick=function(){
if(busy)return;
if(S.pending){show(S.pending,'جائزة من لفتك — اضغط مطالبة لاستلامها');return}
if(S.used)return;
busy=true;$('spin').disabled=true;msg('');
post('/wheel/spin').then(function(j){
if(!j.ok){busy=false;msg(j.message||'تعذر اللف');if(j.state)S=j.state;render();return}
S=j.state;render();$('spin').disabled=true;
animateTo(j.idx,function(){busy=false;show(j.prize)})})};
build();render();
if(S.pending){var c0=S.pending.idx*SEG+SEG/2;rot=360-c0;var w=$('wheel');w.style.transition='none';w.style.transform='rotate('+rot+'deg)';void w.offsetWidth;w.style.transition='';
setTimeout(function(){show(S.pending,'جائزة من لفتك — اضغط مطالبة لاستلامها')},350)}
})();
`

function pageHTML({ code, viewer, state, esc, navDrawerHTML, NAV_BTN }) {
    const data = JSON.stringify({
        prizes: PRIZES.map(p => ({ k: p.k, n: p.n, i: p.i, c: p.c })),
        state, csrf: viewer.csrf, code
    }).replace(/</g, '\\u003c')
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>عجلة الحظ اليومية</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Lalezar&family=Tajawal:wght@500;800&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<header class="tb"><span class="tb-l">${NAV_BTN}</span><span class="who">${esc(viewer.name)}</span></header>
<main class="app">
  <h1 class="disp">عجلة الحظ اليومية</h1>
  <p class="sub">لفة مجانية واحدة كل يوم، تتجدد 12:00 ص بتوقيت السعودية</p>
  <div class="stage">
    <svg class="ptr" id="ptr" viewBox="0 0 36 46" aria-hidden="true"><path d="M18 46 3 14A16 16 0 1 1 33 14Z" fill="#ffc83d" stroke="#7a4f00" stroke-width="3"/><circle cx="18" cy="14" r="5" fill="#7a4f00"/></svg>
    <svg viewBox="-160 -160 320 320" role="img" aria-label="عجلة الحظ"><circle r="156" fill="#ffc83d"/><circle r="150" fill="#3a2790"/><g id="wheel"></g></svg>
    <div class="hub" aria-hidden="true">لف</div>
  </div>
  <button class="btn" id="spin" type="button">لف العجلة</button>
  <div class="cd" id="cd" aria-live="polite"></div>
  <div class="err" id="err" role="alert"></div>
  <div class="inv">
    <div><b id="i-money">0</b>💰 رصيدك</div>
    <div><b id="i-bonus">0</b>🎟️ عملات العجلة</div>
    <div><b id="i-spins">0</b>🎡 مجموع لفاتك</div>
  </div>
</main>
<div class="rv" id="rv"><div class="gift" id="gift"></div></div>
${navDrawerHTML(code, viewer.csrf, 'wheel', viewer.name)}
<script>window.__W=${data};</script>
<script>${JS}</script>
</body>
</html>`
}

module.exports = { createSiteWheel, PRIZES, describe, saudiDay, secondsToReset }
