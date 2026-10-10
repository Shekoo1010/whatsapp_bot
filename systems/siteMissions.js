'use strict'
/**
 * 🎯 المهام اليومية والأسبوعية بالموقع — systems/siteMissions.js
 *
 * - نفس بيانات اللاعب (dailyMissions / weeklyMissions) ونفس أهداف وجوائز أوامر الواتساب
 *   (.مهامي / .استلام_المهام / .مهام_اسبوعية / .استلام_الاسبوعية / .يومي)
 * - التقدم يُحسب طول الوقت: العدّادات تُحفظ بقاعدة البيانات من أي مصدر (بوت أو موقع)،
 *   فلو البوت مقفول ما يتأثر شي، والموقع يقرأ نفس القيم.
 * - زر "استلام اليومي" (.يومي) يشتغل من الموقع → تُحسب مهمة تسجيل الدخول + مهمة الاسبوعية.
 * - إشعار من أعلى الشاشة (siteNotify) عند إكمال أي مهمة — يعمل بدون البوت.
 */

const NOTIFY = require('./siteNotify')

const DAILY_DEFS = [
    { k: 'login',        icon: '📅', name: 'تسجيل الدخول اليومي', m: 1, bool: true },
    { k: 'wins',         icon: '⚔️', name: 'الفوز في القتالات',   m: 5 },
    { k: 'bossKills',    icon: '👑', name: 'المشاركة ضد الزعيم',  m: 2 },
    { k: 'pulls',        icon: '🎰', name: 'تنفيذ السحبات',       m: 10 },
    { k: 'gotSSS',       icon: '🌟', name: 'الحصول على شخصية SSS', m: 1, bool: true },
    { k: 'gotLegendary', icon: '🔥', name: 'الحصول على أسطوريات', m: 3 }
]

const WEEKLY_META = {
    wins:         { icon: '⚔️', name: 'الفوز في القتالات' },
    bossHits:     { icon: '👑', name: 'المشاركة ضد الزعيم' },
    pulls:        { icon: '🎰', name: 'تنفيذ السحبات' },
    gotLegendary: { icon: '🔥', name: 'الحصول على أسطوريات' },
    dailyClaims:  { icon: '📅', name: 'استلام يومي (أيام)' }
}

const DAILY_REWARD = { money: 2500000, xp: 5000, legendary: 1, sssChance: 1 }
const WEEKLY_REWARD = { money: 8000000, xp: 20000, legendary: 2, sssChance: 2 }
const DAILY_BONUS = { money: 250000, xp: 500 }

const NOOP_SOCK = { sendMessage: async () => {} }

function createSiteMissions(d) {

    const {
        Player, auth, characters, orbs,
        getSaudiDate, getSaudiWeekKey,
        resetDailyMissions, ensureWeeklyMissions, WEEKLY_GOALS,
        applyDogBonus, checkAndGrantAchievement, isWeeklyBanned,
        dailyLocks, missionsClaimLocks, weeklyLocks,
        getSock, getNotifyJid
    } = d

    const weeklyDefs = () => Object.keys(WEEKLY_GOALS).map(k => ({
        k, icon: (WEEKLY_META[k] || {}).icon || '🎯', name: (WEEKLY_META[k] || {}).name || k, m: WEEKLY_GOALS[k]
    }))

    const val = (def, obj) => def.bool ? (obj && obj[def.k] ? 1 : 0) : Math.max(0, Number(obj && obj[def.k]) || 0)

    // ───────── الجلسة (نفس فحص siteNotify) ─────────
    const sessCache = new Map()
    async function sessionUser(req) {
        if (!auth.authEnabled()) return null
        const sess = auth.readSession(req)
        if (!sess) return null
        const c = sessCache.get(sess.u)
        if (c && Date.now() - c.at < 60000 && c.v === sess.v) return sess.u
        const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
        if (!me || (me.sessionVersion || 0) !== sess.v) return null
        sessCache.set(sess.u, { v: sess.v, at: Date.now() })
        return sess.u
    }

    // ───────── الحالة ─────────
    async function getState(userId) {
        const player = await Player.findOne({ userId })
        if (!player) return null

        await resetDailyMissions(player)
        const w = ensureWeeklyMissions(player)
        if (player.isModified('weeklyMissions')) await player.save()

        const m = player.dailyMissions || {}
        const today = getSaudiDate()
        const weekKey = getSaudiWeekKey()

        const mk = (defs, obj) => defs.map(df => {
            const v = val(df, obj)
            return { k: df.k, i: df.icon, n: df.name, v: Math.min(v, df.m), m: df.m, done: v >= df.m }
        })

        const dItems = mk(DAILY_DEFS, m)
        const wItems = mk(weeklyDefs(), w)

        return {
            ok: true,
            now: Date.now(),
            dailyResetAt: Date.parse(today + 'T00:00:00+03:00') + 86400000,
            weeklyResetAt: Date.parse(weekKey + 'T00:00:00+03:00') + 7 * 86400000,
            daily: {
                items: dItems,
                claimed: !!m.claimed,
                bonusClaimed: !!(player.dailyReward && player.dailyReward.lastClaim === today),
                reward: DAILY_REWARD,
                bonus: DAILY_BONUS
            },
            weekly: {
                items: wItems,
                claimed: !!w.claimed,
                banned: !!isWeeklyBanned(userId),
                reward: WEEKLY_REWARD
            }
        }
    }

    // ───────── قفل مشترك مع أوامر الواتساب (منع الاستلام المزدوج) ─────────
    async function withLock(set, userId, fn) {
        if (set.has(userId)) return { ok: false, msg: 'انتظر حتى تنتهي العملية السابقة' }
        set.add(userId)
        const t = setTimeout(() => set.delete(userId), 20000)
        try { return await fn() } finally { clearTimeout(t); set.delete(userId) }
    }

    const fail = msg => ({ ok: false, msg })

    async function notifyCtx(userId) {
        let jid = userId
        try { jid = (await getNotifyJid(userId)) || userId } catch (e) {}
        return { sock: getSock() || NOOP_SOCK, jid }
    }

    // ───────── .يومي ─────────
    function claimDailyBonus(userId) {
        return withLock(dailyLocks, userId, async () => {
            const player = await Player.findOne({ userId })
            if (!player) return fail('لا يوجد حساب')

            await resetDailyMissions(player)
            const today = getSaudiDate()

            if (player.dailyReward && player.dailyReward.lastClaim === today) return fail('استلمت اليومي بالفعل')

            await player.addMoney(DAILY_BONUS.money)
            player.xp += applyDogBonus(player, DAILY_BONUS.xp)

            player.dailyMissions.login = true
            player.markModified('dailyMissions')

            const w = ensureWeeklyMissions(player)
            w.dailyClaims = (w.dailyClaims || 0) + 1
            player.markModified('weeklyMissions')

            const y = new Date()
            y.setDate(y.getDate() - 1)
            const yesterdayStr = y.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })

            if (player.dailyReward.lastClaim === yesterdayStr) player.dailyStreak = (player.dailyStreak || 0) + 1
            else player.dailyStreak = 1

            if (player.dailyStreak > (player.dailyStreakBest || 0)) player.dailyStreakBest = player.dailyStreak

            player.dailyReward.lastClaim = today
            await player.save()

            const { sock, jid } = await notifyCtx(userId)
            try { await checkAndGrantAchievement(player, 'daily', player.dailyStreak, sock, jid) } catch (e) {}
            try { await orbs.trackMission(userId, 'daily', { sock, jid }) } catch (e) {}
            try { await checkAndGrantAchievement(player, 'wealth', player.totalEarnedMoney, sock, jid) } catch (e) {}

            return { ok: true, msg: 'تم استلام اليومي', streak: player.dailyStreak }
        })
    }

    // ───────── .استلام_المهام ─────────
    function claimDaily(userId) {
        return withLock(missionsClaimLocks, userId, async () => {
            const player = await Player.findOne({ userId })
            if (!player) return fail('لا يوجد حساب')

            await resetDailyMissions(player)
            const m = player.dailyMissions
            if (!m) return fail('لا توجد بيانات مهام')
            if (m.claimed) return fail('استلمت مكافأة المهام اليوم')
            if (!DAILY_DEFS.every(df => val(df, m) >= df.m)) return fail('لم تكمل جميع المهام بعد')

            await player.addMoney(DAILY_REWARD.money)
            player.xp += applyDogBonus(player, DAILY_REWARD.xp)
            if (!player.boxes) player.boxes = {}
            player.boxes.legendary = (player.boxes.legendary || 0) + DAILY_REWARD.legendary
            player.boxes.sss_chance = (player.boxes.sss_chance || 0) + DAILY_REWARD.sssChance
            m.claimed = true
            player.markModified('dailyMissions')
            await player.save()

            return { ok: true, msg: 'تم استلام مكافأة المهام اليومية' }
        })
    }

    // ───────── .استلام_الاسبوعية ─────────
    function claimWeekly(userId) {
        if (isWeeklyBanned(userId)) return Promise.resolve(fail('أنت ممنوع من المهام الأسبوعية'))
        return withLock(weeklyLocks, userId, async () => {
            const player = await Player.findOne({ userId })
            if (!player) return fail('لا يوجد حساب')

            const w = ensureWeeklyMissions(player)
            if (w.claimed) return fail('استلمت جائزة هذا الأسبوع')

            const G = WEEKLY_GOALS
            if (!Object.keys(G).every(k => (w[k] || 0) >= G[k])) {
                if (player.isModified('weeklyMissions')) await player.save()
                return fail('لم تكمل جميع المهام الأسبوعية بعد')
            }

            let sssChar = null
            const pool = characters.filter(c => c.rarity === 'SSS')
            if (pool.length) {
                const picked = JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]))
                sssChar = { ...picked, originalPower: picked.power, evolutionLevel: 0, urAbilities: [] }
            }

            await player.addMoney(WEEKLY_REWARD.money)
            player.xp += applyDogBonus(player, WEEKLY_REWARD.xp)
            if (!player.boxes) player.boxes = {}
            player.boxes.legendary = (player.boxes.legendary || 0) + WEEKLY_REWARD.legendary
            player.boxes.sss_chance = (player.boxes.sss_chance || 0) + WEEKLY_REWARD.sssChance
            if (sssChar) {
                player.characters = player.characters || []
                player.characters.push(sssChar)
            }
            w.claimed = true
            player.markModified('weeklyMissions')
            await player.save()

            const { sock, jid } = await notifyCtx(userId)
            try { await checkAndGrantAchievement(player, 'wealth', player.totalEarnedMoney, sock, jid) } catch (e) {}

            return { ok: true, msg: 'تم استلام مكافأة المهام الأسبوعية', sss: sssChar ? sssChar.name : null }
        })
    }

    // ───────── إشعار إكمال المهمة (يُستدعى بعد أي save للاعب من أي مكان) ─────────
    const seen = new Map() // userId -> { dKey, dDone:Set, wKey, wDone:Set }

    function doneSet(defs, obj) {
        const s = new Set()
        defs.forEach(df => { if (val(df, obj) >= df.m) s.add(df.k) })
        return s
    }

    function onSave(doc) {
        try {
            if (!doc || !doc.userId) return
            const dKey = getSaudiDate(), wKey = getSaudiWeekKey()
            const dm = doc.dailyMissions || {}, wm = doc.weeklyMissions || {}
            const dOk = dm.lastReset === dKey, wOk = wm.lastReset === wKey
            const wDefs = weeklyDefs()
            const dDone = dOk ? doneSet(DAILY_DEFS, dm) : new Set()
            const wDone = wOk ? doneSet(wDefs, wm) : new Set()

            const prev = seen.get(doc.userId)
            seen.set(doc.userId, { dKey, dDone, wKey, wDone })
            if (!prev) return // أول مشاهدة بعد تشغيل البوت: نسجّل الحالة بصمت

            const pd = prev.dKey === dKey ? prev.dDone : new Set()
            const pw = prev.wKey === wKey ? prev.wDone : new Set()

            const fire = (defs, now, before, label) => {
                const fresh = defs.filter(df => now.has(df.k) && !before.has(df.k))
                if (!fresh.length) return
                const all = now.size === defs.length
                fresh.forEach(df => {
                    if (all && fresh[fresh.length - 1] === df) return // رسالة الاكتمال الكاملة تكفي
                    NOTIFY.push(doc.userId, {
                        type: 'ach', icon: df.icon,
                        title: 'اكتملت مهمة ' + label,
                        text: df.name + ' ✓'
                    })
                })
                if (all) NOTIFY.push(doc.userId, {
                    type: 'milestone', icon: '🎁',
                    title: 'اكتملت جميع المهام ' + label,
                    text: 'الجائزة جاهزة — استلمها من صفحة المهام'
                })
            }
            fire(DAILY_DEFS, dDone, pd, 'اليومية')
            fire(wDefs, wDone, pw, 'الأسبوعية')
        } catch (e) { /* ما يوقف الحفظ */ }
    }

    // يحسب فوز على مستند لاعب محمّل (المستدعي يحفظه بعدها) — يُستخدم من معارك الموقع
    async function trackWinOn(player) {
        try {
            if (!player) return
            await resetDailyMissions(player)
            if (player.dailyMissions) {
                player.dailyMissions.wins = (player.dailyMissions.wins || 0) + 1
                player.markModified('dailyMissions')
            }
            const w = ensureWeeklyMissions(player)
            w.wins = (w.wins || 0) + 1
            player.markModified('weeklyMissions')
        } catch (e) { console.log('trackWinOn error:', e && e.message ? e.message : e) }
    }

    // مهمة فوز من الموقع (اختياري): استدعِها من أي نظام موقع فيه فوز معركة
    async function trackWin(userId) {
        try {
            const p = await Player.findOne({ userId })
            if (!p) return
            await resetDailyMissions(p)
            if (p.dailyMissions) { p.dailyMissions.wins = (p.dailyMissions.wins || 0) + 1; p.markModified('dailyMissions') }
            const w = ensureWeeklyMissions(p)
            w.wins = (w.wins || 0) + 1
            p.markModified('weeklyMissions')
            await p.save()
        } catch (e) {}
    }

    // ───────── المسارات ─────────
    function mount(app) {
        app.get('/missions/api/state', async (req, res) => {
            res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
            try {
                const u = await sessionUser(req)
                if (!u) return res.status(401).json({ ok: false, msg: 'سجّل دخولك' })
                const st = await getState(u)
                if (!st) return res.status(404).json({ ok: false, msg: 'لا يوجد حساب' })
                res.json(st)
            } catch (e) {
                res.status(500).json({ ok: false, msg: 'خطأ بالسيرفر' })
            }
        })

        const claimers = { bonus: claimDailyBonus, daily: claimDaily, weekly: claimWeekly }
        app.post('/missions/api/claim/:which', async (req, res) => {
            res.set({ 'Cache-Control': 'no-store' })
            try {
                if (req.get('x-requested-with') !== 'missions') return res.status(403).json({ ok: false })
                const fn = claimers[req.params.which]
                if (!fn) return res.status(404).json({ ok: false })
                const u = await sessionUser(req)
                if (!u) return res.status(401).json({ ok: false, msg: 'سجّل دخولك' })
                res.json(await fn(u))
            } catch (e) {
                console.log('site missions claim error:', e?.message || e)
                res.status(500).json({ ok: false, msg: 'خطأ بالسيرفر' })
            }
        })

        app.get('/missions', (req, res) => {
            res.set({ 'Cache-Control': 'no-store', 'Content-Type': 'text/html; charset=utf-8' })
            res.send(PAGE)
        })
    }

    return { mount, onSave, trackWin, trackWinOn, getState }
}

const PAGE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0a0e1a">
<title>المهام</title>
${NOTIFY.HEAD}
<style>
:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;background:#0a0e1a;color:#e8ecf8;font-family:Tahoma,"Segoe UI",system-ui,sans-serif;display:flex;justify-content:center;min-height:100vh}
.app{width:100%;max-width:460px;padding:16px}
.tabs{display:flex;gap:8px;background:#121830;border:1px solid #232c52;border-radius:16px;padding:6px;position:relative}
.tab{flex:1;border:0;background:none;color:#8b95bd;font:inherit;font-size:15px;padding:11px;border-radius:12px;cursor:pointer;position:relative;z-index:1;transition:color .3s}
.tab.on{color:#fff}
.pill{position:absolute;top:6px;bottom:6px;width:calc(50% - 8px);background:linear-gradient(135deg,#2b3a75,#1d2a5a);border-radius:12px;transition:transform .4s cubic-bezier(.3,1.3,.5,1);right:6px}
.tabs[data-t="weekly"] .pill{transform:translateX(calc(100% + 4px))}
.card{background:#121830;border:1px solid #232c52;border-radius:20px;padding:18px;margin-top:14px}
.head{display:flex;align-items:center;justify-content:space-between;gap:14px}
.info h2{margin:0 0 4px;font-size:18px}
.info p{margin:0 0 10px;color:#8b95bd;font-size:13px}
.timer{display:inline-block;background:#16244d;color:#6ea8ff;border-radius:10px;padding:7px 12px;font-size:13px;font-variant-numeric:tabular-nums}
.ring{position:relative;width:96px;height:96px;flex:none}
.ring svg{transform:rotate(90deg) scaleX(-1)}
.ring .bg{stroke:#232c52}
.ring .fg{stroke:url(#g);transition:stroke-dashoffset 1s cubic-bezier(.3,.9,.3,1);filter:drop-shadow(0 0 6px #f5c54299)}
.ring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:22px}
.m{background:#121830;border:1px solid #232c52;border-radius:18px;padding:14px;margin-top:12px;opacity:0;transform:translateY(14px);animation:in .5s forwards;transition:border-color .4s,background .4s}
.m.done{border-color:#3a7d5c;background:#112a26}
.row{display:flex;align-items:center;gap:12px}
.ic{width:48px;height:48px;border-radius:14px;background:#1b2447;display:flex;align-items:center;justify-content:center;font-size:24px;flex:none}
.m.pop .ic{animation:pop .6s}
.mid{flex:1;min-width:0}
.t{display:flex;justify-content:space-between;align-items:center;font-size:14.5px;gap:8px}
.n{color:#8b95bd;font-size:13px;font-variant-numeric:tabular-nums}
.chk{color:#46d390;font-size:18px}
.bar{height:9px;background:#1b2447;border-radius:9px;margin-top:10px;overflow:hidden}
.fill{height:100%;width:0;border-radius:9px;background:linear-gradient(90deg,#d9b13f,#f3dc86);transition:width 1s cubic-bezier(.3,.9,.3,1);position:relative;overflow:hidden}
.fill::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,#fff8 50%,transparent 70%);transform:translateX(100%);animation:shine 2.4s infinite}
.m.done .fill{background:linear-gradient(90deg,#2fb77d,#7ff0b6)}
.lbl{font-size:14px;color:#8b95bd}
.rw{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.rw span{background:#1b2447;border:1px solid #2b3668;border-radius:10px;padding:6px 10px;font-size:12.5px;color:#cdd5f5}
.btn{width:100%;margin-top:14px;border:0;border-radius:14px;padding:14px;font:inherit;font-size:16px;cursor:pointer;background:#1b2447;color:#6b76a3;transition:.3s}
.btn.rdy{background:linear-gradient(135deg,#f5c542,#ff9d3d);color:#2a1a00;animation:pulse 1.6s infinite}
.btn.got{background:#16382f;color:#46d390;cursor:default}
.btn.shake{animation:shake .4s}
.bonus{display:flex;align-items:center;gap:12px}
.bonus .btn{margin:0;width:auto;padding:11px 16px;font-size:14px;white-space:nowrap}
.bonus .tx{flex:1;font-size:14px}.bonus .tx small{display:block;color:#8b95bd;font-size:12px;margin-top:3px}
.msg{text-align:center;color:#8b95bd;padding:40px 10px;font-size:15px}
#pt{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));left:50%;transform:translate(-50%,-160%);background:#151b2e;color:#f1f3f9;border:1.5px solid #e2b64b;border-radius:16px;padding:11px 16px;font-size:14px;transition:transform .45s cubic-bezier(.2,.9,.3,1.15);z-index:2147483600;max-width:calc(100% - 20px);text-align:center;box-shadow:0 8px 28px rgba(0,0,0,.55)}
#pt.show{transform:translate(-50%,0)}
@keyframes in{to{opacity:1;transform:none}}
@keyframes pop{0%{transform:scale(.6)}60%{transform:scale(1.25)}100%{transform:scale(1)}}
@keyframes shine{to{transform:translateX(-100%)}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 #f5c54266}50%{box-shadow:0 0 0 10px #f5c54200}}
@keyframes shake{0%,100%{transform:none}25%{transform:translateX(6px)}75%{transform:translateX(-6px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.m{opacity:1;transform:none}}
</style>
</head>
<body>
<div class="app">
  <div class="tabs" id="tabs" data-t="daily">
    <div class="pill"></div>
    <button class="tab on" data-t="daily">اليومية</button>
    <button class="tab" data-t="weekly">الأسبوعية</button>
  </div>
  <div id="box"><div class="msg">جاري التحميل…</div></div>
</div>
<div id="pt" role="status"></div>
<script>
(function(){
var cur='daily',S=null,off=0,built='',els={},timer=null,ptT=null;
function $(i){return document.getElementById(i)}
function fmt(n){return Number(n).toLocaleString('en-US')}
function z(x){return String(x).padStart(2,'0')}
function toast(t){var e=$('pt');e.textContent=t;e.className='show';clearTimeout(ptT);ptT=setTimeout(function(){e.className=''},3200)}
function api(p,post){
  var o={credentials:'same-origin',cache:'no-store',headers:{'X-Requested-With':'missions'}};
  if(post)o.method='POST';
  return fetch('/missions/api'+p,o).then(function(r){return r.json().then(function(j){j.__s=r.status;return j},function(){return{ok:false,__s:r.status}})});
}
function sec(){return S?S[cur]:null}
function rewardChips(d){
  var r=d.reward,a=['💰 '+fmt(r.money),'📚 '+fmt(r.xp)+' XP','📦 Legendary ×'+r.legendary,'📦 SSS Chance ×'+r.sssChance];
  if(cur==='weekly')a.push('🌟 شخصية SSS');
  return a.map(function(x){return '<span>'+x+'</span>'}).join('');
}
function build(){
  var d=sec();if(!d)return;
  built=cur;els={};
  var h='';
  h+='<div class="card"><div class="head"><div class="info"><h2 id="ttl"></h2><p id="rem"></p><span class="timer" id="tm"></span></div>'
   +'<div class="ring"><svg width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="g"><stop offset="0" stop-color="#f3dc86"/><stop offset="1" stop-color="#d9b13f"/></linearGradient></defs>'
   +'<circle class="bg" cx="48" cy="48" r="40" fill="none" stroke-width="9"/>'
   +'<circle class="fg" id="fg" cx="48" cy="48" r="40" fill="none" stroke-width="9" stroke-linecap="round" stroke-dasharray="251.3" stroke-dashoffset="251.3"/></svg><b id="cnt"></b></div></div></div>';
  if(cur==='daily'){
    h+='<div class="card bonus"><div class="tx">استلام اليومي<small>💰 '+fmt(S.daily.bonus.money)+' · 📚 '+fmt(S.daily.bonus.xp)+' XP · يحسب مهمة تسجيل الدخول</small></div><button class="btn" id="bb"></button></div>';
  }
  d.items.forEach(function(it,k){
    h+='<div class="m" data-k="'+it.k+'" style="animation-delay:'+(k*80)+'ms"><div class="row"><div class="ic">'+it.i+'</div><div class="mid"><div class="t"><span>'+it.n+'</span><span class="n"></span></div><div class="bar"><div class="fill"></div></div></div></div></div>';
  });
  h+='<div class="card"><div class="lbl">'+(cur==='daily'?'الجائزة عند إكمال المهام اليومية':'الجائزة عند إكمال المهام الأسبوعية')+'</div><div class="rw">'+rewardChips(d)+'</div><button class="btn" id="cb"></button></div>';
  $('box').innerHTML=h;
  $('cb').onclick=claim;
  if($('bb'))$('bb').onclick=claimBonus;
  Array.prototype.forEach.call(document.querySelectorAll('.m'),function(e){els[e.dataset.k]={row:e,n:e.querySelector('.n'),f:e.querySelector('.fill'),done:false}});
  update(true);
}
function update(first){
  var d=sec();if(!d)return;
  var c=d.items.filter(function(x){return x.done}).length,all=c===d.items.length;
  $('ttl').textContent=cur==='daily'?'المهام اليومية':'المهام الأسبوعية';
  $('rem').textContent='تبقّى '+(d.items.length-c)+' من '+d.items.length+' مهام';
  $('cnt').textContent=c+'/'+d.items.length;
  $('fg').style.strokeDashoffset=251.3*(1-c/d.items.length);
  d.items.forEach(function(it){
    var e=els[it.k];if(!e)return;
    var nowDone=it.done,was=e.done;
    e.row.classList.toggle('done',nowDone);
    if(nowDone&&!was&&!first){e.row.classList.remove('pop');void e.row.offsetWidth;e.row.classList.add('pop')}
    e.done=nowDone;
    e.n.innerHTML=nowDone?'<span class="chk">✓</span>':it.v+'/'+it.m;
    var w=Math.min(100,it.v/it.m*100);
    if(first){requestAnimationFrame(function(){requestAnimationFrame(function(){e.f.style.width=w+'%'})})}else e.f.style.width=w+'%';
  });
  var b=$('cb');
  var banned=cur==='weekly'&&d.banned;
  b.className='btn'+(d.claimed?' got':(all&&!banned)?' rdy':'');
  b.textContent=banned?'ممنوع من المهام الأسبوعية':d.claimed?'تم الاستلام ✓':all?'استلام الجائزة 🎁':'أكمل جميع المهام';
  var bb=$('bb');
  if(bb){bb.className='btn'+(d.bonusClaimed?' got':' rdy');bb.textContent=d.bonusClaimed?'تم ✓':'استلام 🎁'}
}
function tick(){
  var d=sec();if(!d||!$('tm'))return;
  var t=(cur==='daily'?S.dailyResetAt:S.weeklyResetAt)-(Date.now()+off);
  if(t<=0){load();return}
  var s=Math.floor(t/1000),dd=Math.floor(s/86400),hh=Math.floor(s%86400/3600),mm=Math.floor(s%3600/60),ss=s%60;
  $('tm').textContent=(cur==='daily'?'يتجدد بعد ':'يتجدد الجمعة بعد '+dd+' يوم و ')+z(hh)+':'+z(mm)+':'+z(ss);
}
function load(){
  return api('/state').then(function(j){
    if(j.__s===401){$('box').innerHTML='<div class="msg">سجّل دخولك بالموقع أولاً لعرض مهامك.<br><br><a href="/" style="color:#6ea8ff">الصفحة الرئيسية</a></div>';S=null;return}
    if(!j.ok){return}
    off=j.now-Date.now();S=j;
    if(built!==cur||!$('cb'))build();else update(false);
    tick();
  }).catch(function(){});
}
function claim(){
  var d=sec();if(!d)return;
  var all=d.items.every(function(x){return x.done});
  var b=$('cb');
  if(d.claimed)return;
  if(!all||(cur==='weekly'&&d.banned)){b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');toast('أكمل جميع المهام أولاً');return}
  b.textContent='جاري الاستلام…';
  api('/claim/'+cur,true).then(function(j){
    toast(j.ok?('🎉 '+j.msg+(j.sss?' — '+j.sss:'')):('❌ '+(j.msg||'تعذّر الاستلام')));
    load();
  }).catch(function(){toast('❌ تعذّر الاتصال');load()});
}
function claimBonus(){
  var d=sec();if(!d||d.bonusClaimed)return;
  $('bb').textContent='…';
  api('/claim/bonus',true).then(function(j){
    toast(j.ok?('🎁 '+j.msg+(j.streak?' — سلسلة '+j.streak+' يوم':'')):('❌ '+(j.msg||'تعذّر الاستلام')));
    load();
  }).catch(function(){toast('❌ تعذّر الاتصال');load()});
}
$('tabs').addEventListener('click',function(e){
  var t=e.target.closest('.tab');if(!t||t.dataset.t===cur)return;
  cur=t.dataset.t;$('tabs').dataset.t=cur;
  Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(x){x.classList.toggle('on',x===t)});
  if(S){build();tick()}
});
load();
setInterval(tick,1000);
setInterval(function(){if(!document.hidden)load()},5000);
document.addEventListener('visibilitychange',function(){if(!document.hidden)load()});
})();
</script>
</body>
</html>`

module.exports = createSiteMissions
module.exports.DAILY_DEFS = DAILY_DEFS
