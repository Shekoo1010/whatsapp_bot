// 📖 كتاب المجموعة (SSS فقط) — /u/:code/book
// - كل لاعب يبدأ من الصفر: التسجيل فقط عند سحب شخصية SSS بعد تفعيل النظام (الإهداء/الصناديق/الشراء لا تُحتسب)
// - الجوائز تُستلم يدوياً من الصفحة، مرة واحدة لكل أنمي ولا تتكرر مهما تغيّرت الفئة أو أُضيفت شخصيات
// - مجموع كل الجوائز لمن يكمل كل الأنمي = 150 عملة سحب + 50,000,000 مال (من الكتالوج: 211 أنمي)
// - التخزين: كولكشن مستقل codex_books (لا يحتاج تعديل Player.js)
const mongoose = require('mongoose')

// ───────── الإعدادات ─────────
const CATS = {
    huge:  { n: 'ضخم',  col: '#ff3860', min: 35, cash: 2500000, coins: 7, boxes: { sss_high: 2, sss_chance: 2 } },
    big:   { n: 'كبير', col: '#ff6b3d', min: 20, cash: 1500000, coins: 4, boxes: { sss_high: 1, sss_chance: 1 } },
    mid:   { n: 'متوسط', col: '#b83fff', min: 10, cash: 600000,  coins: 3, boxes: { legendary: 2, sss_chance: 1 } },
    small: { n: 'صغير', col: '#3ea8ff', min: 5,  cash: 280000,  coins: 1, boxes: { legendary: 1 } },
    few:   { n: 'قليل', col: '#f0c04a', min: 3,  cash: 100000,  coins: 0, boxes: { epic: 2 } },
    solo:  { n: 'فردي', col: '#8b93a1', min: 1,  cash: 20000,   coins: 0, boxes: {} }
}
const CAT_ORDER = ['huge', 'big', 'mid', 'small', 'few', 'solo']
const BOX_LABEL = { sss_high: 'SSS High', sss_chance: 'SSS Chance', legendary: 'Legendary', epic: 'Epic', rare: 'Rare', basic: 'Basic' }

// بونصات الألقاب — key: boss | arena | raid | spec (مضاربات) | xp | inv (مخزون)
const BONUS_LABEL = { boss: 'هجوم على الزعيم', arena: 'هجوم في الأرينا', raid: 'هجوم في الرايد', spec: 'هجوم في المضاربات', xp: 'XP', inv: 'مخزون' }
const CAPS = { boss: 15, spec: 10, arena: 8, raid: 8, xp: 5, inv: 15 }
const TITLES = {
    'League of Legends': ['arena', 5], 'Bleach': ['boss', 10], 'One Piece': ['spec', 5], 'Genshin Impact': ['inv', 5],
    'Hunter x Hunter': ['raid', 5], 'Detective Conan': ['xp', 5], 'Mobile Legends': ['inv', 5], 'Kingdom': ['boss', 5],
    'Wuthering Waves': ['spec', 5], 'Naruto': ['inv', 5], 'Tekken': ['arena', 3], 'Resident Evil': ['raid', 3]
}
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, '')
const TITLES_N = new Map(Object.entries(TITLES).map(([k, v]) => [norm(k), { name: k, key: v[0], pct: v[1] }]))

// 🔗 توحيد أسماء الأنمي: الحقل anime بالـ JSON أحياناً مكتوب بطرق مختلفة لنفس الأنمي.
// الاختلاف بحالة الأحرف/الرموز (Re:ZERO = Re:Zero) يُدمج تلقائياً. أما الاختلاف بالإملاء فأضفه هنا:
// 'الاسم كما هو بالملف': 'الاسم الموحّد'
const ALIASES = {
    'Bungo Stray Dogs': 'Bungou Stray Dogs',
    'That Time I Got Reincarnated as a Slime': 'Tensura',
    'Pick Me Up': 'Pick Me Up! Infinite Gacha'
}
const ALIAS_N = new Map(Object.entries(ALIASES).map(([k, v]) => [norm(k), v]))
const animeKey = a => { const c = ALIAS_N.get(norm(a)) || String(a); return norm(c) || akey(c) }
const animeName = a => ALIAS_N.get(norm(a)) || String(a)

const catOf = total => CAT_ORDER.find(k => total >= CATS[k].min) || null
const akey = a => String(a).replace(/[.$\u0000]/g, '_')
const fmt = n => Number(n || 0).toLocaleString('en-US')

// ───────── الحالة ─────────
let Player = null, getCatalog = () => [], inited = false
const bonusCache = new Map() // userId -> { boss, arena, raid, spec, xp, inv }
const claimLocks = new Set()
const col = () => mongoose.connection.collection('codex_books')

// فهرس الكتالوج: أنمي -> { name, chars:Set }
let _src = null, _len = -1, _idx = null
function catalogIndex() {
    const cat = getCatalog() || []
    if (cat === _src && cat.length === _len && _idx) return _idx
    const idx = new Map()
    for (const c of cat) {
        if (!c || c.rarity !== 'SSS' || !c.anime || !c.name) continue
        const k = animeKey(c.anime)
        if (!idx.has(k)) idx.set(k, { key: k, name: animeName(c.anime), chars: new Set() })
        idx.get(k).chars.add(String(c.name))
    }
    _src = cat; _len = cat.length; _idx = idx
    return idx
}

function titleInfo(animeName, cat) {
    if (cat === 'huge' || cat === 'big') {
        const t = TITLES_N.get(norm(animeName))
        return { title: 'سيّد ' + animeName, bonus: t ? { key: t.key, pct: t.pct } : null }
    }
    if (cat === 'mid') return { title: 'عاشق ' + animeName, bonus: null, honorary: true }
    return { title: null, bonus: null }
}

function recalcBonus(userId, claimed) {
    const b = { boss: 0, arena: 0, raid: 0, spec: 0, xp: 0, inv: 0 }
    for (const c of claimed || []) if (c.bonusKey && b[c.bonusKey] != null) b[c.bonusKey] += Number(c.bonusPct) || 0
    for (const k in b) b[k] = Math.min(b[k], CAPS[k])
    bonusCache.set(userId, b)
    return b
}

// ───────── واجهة للبوت ─────────
// تُستدعى من trackWeeklyPull (تغطي .اسحب + سحب الموقع + سحب البنر). تتجاهل أي شيء غير SSS.
async function recordPull(userId, character) {
    try {
        if (!inited || !userId || !character || character.rarity !== 'SSS') return
        const anime = character.anime, name = character.name
        if (!anime || !name) return
        await col().updateOne(
            { userId },
            { $addToSet: { ['pulled.' + animeKey(anime)]: String(name) }, $setOnInsert: { startedAt: new Date() } },
            { upsert: true }
        )
    } catch (e) { console.error('codexBook recordPull error:', e && e.message) }
}
// نسبة البونص (0 لو ما عنده): key = boss|arena|raid|spec|xp|inv — متزامنة (من الذاكرة)
function bonusPct(userId, key) { const b = bonusCache.get(userId); return b ? (b[key] || 0) : 0 }
// مضاعف جاهز: dmg = Math.floor(dmg * bonusMult(userId,'boss'))
function bonusMult(userId, key) { return 1 + bonusPct(userId, key) / 100 }

async function loadDoc(userId) {
    return (await col().findOne({ userId })) || { userId, pulled: {}, claimed: [] }
}

async function buildBook(userId) {
    const doc = await loadDoc(userId)
    const idx = catalogIndex()
    const claimedMap = new Map((doc.claimed || []).map(c => [c.key, c]))
    const list = []
    let totalCash = 0, totalCoins = 0
    for (const a of idx.values()) {
        const total = a.chars.size
        const cat = catOf(total)
        if (!cat) continue
        const got = (doc.pulled && doc.pulled[a.key]) || []
        const own = got.filter(n => a.chars.has(n))
        const cl = claimedMap.get(a.key)
        const c = CATS[cat]
        const t = titleInfo(a.name, cat)
        totalCash += c.cash; totalCoins += c.coins
        list.push({
            id: a.key, name: a.name, cat, total, have: own.length, got: own.sort(),
            claimed: !!cl, ready: !cl && own.length >= total,
            reward: { cash: c.cash, coins: c.coins, boxes: Object.entries(c.boxes).map(([k, n]) => BOX_LABEL[k] + ' ×' + n) },
            title: t.title, honorary: !!t.honorary,
            bonus: t.bonus ? { label: BONUS_LABEL[t.bonus.key], pct: t.bonus.pct } : null
        })
    }
    const order = k => CAT_ORDER.indexOf(k)
    list.sort((x, y) => order(x.cat) - order(y.cat) || y.total - x.total || x.name.localeCompare(y.name))
    const cl = doc.claimed || []
    return {
        animes: list,
        cats: CAT_ORDER.map(k => ({ k, n: CATS[k].n, col: CATS[k].col, cash: CATS[k].cash, coins: CATS[k].coins, boxes: Object.entries(CATS[k].boxes).map(([b, n]) => BOX_LABEL[b] + ' ×' + n), count: list.filter(a => a.cat === k).length })),
        sum: { totalCash, totalCoins, gotCash: cl.reduce((s, c) => s + (c.cash || 0), 0), gotCoins: cl.reduce((s, c) => s + (c.coins || 0), 0), claimed: cl.length, anime: list.length },
        bonus: recalcBonus(userId, cl), caps: CAPS,
        titles: cl.filter(c => c.title).map(c => c.title)
    }
}

async function claim(userId, animeKey) {
    const lockK = userId + '|' + animeKey
    if (claimLocks.has(userId)) return { ok: false, code: 'BUSY', message: '⏳ انتظر حتى تنتهي العملية السابقة.' }
    claimLocks.add(userId)
    try {
        const idx = catalogIndex()
        const a = idx.get(String(animeKey))
        if (!a) return { ok: false, code: 'NOT_FOUND', message: 'أنمي غير موجود.' }
        const total = a.chars.size, cat = catOf(total)
        if (!cat) return { ok: false, code: 'NOT_FOUND', message: 'أنمي غير موجود.' }
        const doc = await loadDoc(userId)
        if ((doc.claimed || []).some(c => c.key === a.key)) return { ok: false, code: 'CLAIMED', message: 'استلمت جائزة هذا الأنمي من قبل — لا تتكرر.' }
        const own = ((doc.pulled && doc.pulled[a.key]) || []).filter(n => a.chars.has(n))
        if (own.length < total) return { ok: false, code: 'INCOMPLETE', message: 'لم تكمل شخصيات هذا الأنمي بعد.' }

        const c = CATS[cat], t = titleInfo(a.name, cat)
        const entry = {
            key: a.key, anime: a.name, cat, total, at: new Date(), cash: c.cash, coins: c.coins, boxes: c.boxes,
            title: t.title || null, bonusKey: t.bonus ? t.bonus.key : null, bonusPct: t.bonus ? t.bonus.pct : 0
        }
        // 1) نسجّل الاستلام أولاً بشرط عدم وجوده (يمنع التكرار حتى مع طلبات متزامنة من أكثر من سيرفر)
        const mark = await col().updateOne({ userId, 'claimed.key': { $ne: a.key } }, { $push: { claimed: entry } })
        if (!mark.modifiedCount) return { ok: false, code: 'CLAIMED', message: 'استلمت جائزة هذا الأنمي من قبل — لا تتكرر.' }

        // 2) نمنح الجائزة (مال + عملات سحب + صناديق + لقب)
        try {
            const inc = { money: c.cash, totalEarnedMoney: c.cash }
            if (c.coins) inc.bonusPulls = c.coins
            for (const [b, n] of Object.entries(c.boxes)) inc['boxes.' + b] = n
            const upd = { $inc: inc }
            if (t.title) upd.$addToSet = { titles: t.title }
            const r = await Player.collection.updateOne({ userId }, upd)
            if (!r.matchedCount) throw new Error('player not found')
            if (t.bonus && t.bonus.key === 'inv') {
                await Player.collection.updateOne({ userId }, [{ $set: { maxCharacters: { $add: [{ $ifNull: ['$maxCharacters', 30] }, t.bonus.pct] } } }])
            }
        } catch (e) {
            await col().updateOne({ userId }, { $pull: { claimed: { key: a.key } } }) // تراجع لو فشل المنح
            console.error('codexBook claim grant error:', e && e.message)
            return { ok: false, code: 'SERVER', message: '❌ صار خطأ أثناء منح الجائزة — حاول مرة ثانية.' }
        }
        const after = await loadDoc(userId)
        recalcBonus(userId, after.claimed)
        return { ok: true, entry: { anime: a.name, cash: c.cash, coins: c.coins, boxes: Object.entries(c.boxes).map(([k, n]) => BOX_LABEL[k] + ' ×' + n), title: t.title } }
    } catch (e) {
        console.error('codexBook claim error:', e)
        return { ok: false, code: 'SERVER', message: '❌ خطأ بالخادم.' }
    } finally { claimLocks.delete(userId) }
}

// ───────── الصفحة ─────────
function mount(app, h) {
    const { auth, jsonBody, securityHeaders, CODE_RE, html404, ownerSession, esc, navDrawerHTML, NAV_BTN, shellHead } = h
    const hits = new Map()
    const rate = u => { const n = Date.now(), a = (hits.get(u) || []).filter(t => n - t < 60000); if (a.length >= 20) { hits.set(u, a); return false } a.push(n); hits.set(u, a); return true }
    const J = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')

    app.get('/u/:code/book', async (req, res) => {
        try {
            securityHeaders(res)
            res.set('Cache-Control', 'no-store')
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)
            const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion').lean()
            if (!player) return html404(res)
            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)
            const data = await buildBook(player.userId)
            res.send(pageHTML({
                code, csrf: auth.csrfForSession(sess), name: player.name || player.username || 'لاعب', data
            }))
        } catch (e) { console.error('book page error:', e); res.status(500).send('خطأ بالخادم') }
    })

    app.post('/book/claim', jsonBody, async (req, res) => {
        res.set('Cache-Control', 'no-store')
        const fail = (s, code, message) => res.status(s).json({ ok: false, code, message })
        try {
            if (!auth.authEnabled()) return fail(503, 'DISABLED', 'غير مفعّل حالياً.')
            if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')
            const sess = auth.readSession(req)
            if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
            const b = req.body || {}
            if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
            if (!rate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')
            const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
            if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
            const r = await claim(sess.u, String(b.anime || ''))
            if (!r.ok) return res.status(r.code === 'SERVER' ? 500 : 400).json(r)
            res.json({ ok: true, entry: r.entry, data: await buildBook(sess.u) })
        } catch (e) { console.error('book claim route error:', e); fail(500, 'SERVER', '❌ خطأ بالخادم.') }
    })

    function pageHTML({ code, csrf, name, data }) {
        return `${shellHead('كتاب المجموعة')}
<style>
.bk{max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
.bk .hero{border-radius:20px;padding:3px;background:conic-gradient(from 0deg,#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860)}
.bk .hi{border-radius:17px;background:linear-gradient(160deg,#18204a,#0d1224 65%);padding:16px;display:flex;flex-direction:column;gap:12px}
.bk .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.bk .st{background:#0b0e18;border:1px solid #1f2740;border-radius:12px;padding:10px;text-align:center;font-size:12px;color:#aeb6c8}
.bk .en{font-family:'Oswald',sans-serif;direction:ltr;unicode-bidi:isolate}
.bk .st .en{font-size:22px;font-weight:600;color:#f0c04a;display:block}.bk .st small{font-size:13px;color:#aeb6c8}
.bk .bar{height:8px;border-radius:6px;background:#1c2236;overflow:hidden}.bk .bar i{display:block;height:100%}
.bk .note{font-size:12px;color:#aeb6c8;line-height:1.7}
.bk .box{border-radius:16px;border:1.5px solid #2a3350;background:#0f1422;padding:14px;display:flex;flex-direction:column;gap:8px}
.bk .pill2{background:#0b0e18;border:1px solid #8a6d24;border-radius:20px;padding:3px 12px;font-size:13px}
.bk .mini{display:flex;gap:6px;flex-wrap:wrap}
.bk .chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px}
.bk .chip{flex:0 0 auto;font:800 13px 'Cairo',sans-serif;color:#aeb6c8;background:#0f1422;border:1px solid #2a3350;border-radius:20px;padding:6px 16px;cursor:pointer}
.bk .chip.on{background:#f0c04a;color:#0a0d16}
.bk .row{display:flex;flex-direction:column;gap:9px;padding:12px 14px;border-radius:14px;background:#0f1422;border:2px solid;cursor:pointer}
.bk .rt{display:flex;justify-content:space-between;align-items:center;gap:8px}
.bk .rn{font-family:'Oswald',sans-serif;font-size:17px;font-weight:600;direction:ltr;color:#fff}
.bk .tag{font-weight:800;font-size:11px;color:#0a0d16;border-radius:20px;padding:2px 10px}
.bk .rf{display:flex;justify-content:space-between;font-size:12px;color:#aeb6c8;gap:8px}
.bk .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.bk .ch{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;border-radius:12px;text-align:center}
.bk .ch.own{background:#0f1422;border:1.5px solid var(--c)}.bk .ch.lock{background:#0a0d16;border:1.5px solid #1f2740}
.bk .av{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 20px 'Oswald',sans-serif}
.bk .own .av{background:linear-gradient(160deg,var(--c),#1a0a10);color:#fff}.bk .lock .av{background:#151b2e;color:#2a3350}
.bk .cn{font:12px 'Oswald',sans-serif;direction:ltr;color:#eef1f8;word-break:break-word;padding:0 2px}.bk .lock .cn{color:#3a4460}
.bk .btn{font:900 14px 'Cairo',sans-serif;border-radius:12px;padding:11px;border:1px solid #2a3350;background:#151b2e;color:#6b7388;text-align:center;width:100%}
.bk .btn.go{background:#f0c04a;color:#0a0d16;border-color:#f0c04a;cursor:pointer}.bk .btn.ok{background:#0e2a1a;color:#4fe08a;border-color:#2c7a4d}
.bk table{width:100%;border-collapse:collapse;font-size:12px}.bk th,.bk td{padding:6px 3px;text-align:center;border-bottom:1px solid #1f2740}.bk th{color:#f0c04a}
.bk-toast{position:fixed;bottom:calc(90px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);background:#f0c04a;color:#0a0d16;font-weight:900;padding:12px 18px;border-radius:14px;max-width:90%;text-align:center;z-index:70;font-size:14px}
</style>
<body><div style="padding:30px 16px 60px">
  <div class="topbar">
    <span class="tb-l">${NAV_BTN}<span class="gmode">📖 كتاب المجموعة</span></span>
    <a class="pill" href="/u/${esc(code)}">← رجوع للعرض</a>
  </div>
  ${navDrawerHTML(code, csrf, 'book', name)}
  <div class="bk" id="bk"></div>
</div>
<script id="bk-data" type="application/json">${J(data)}</script>
<script>
(function(){
var D=JSON.parse(document.getElementById('bk-data').textContent),CSRF=${J(csrf)},CODE=${J(code)},view=null,filter='all',busy=false;
var CC={};D.cats.forEach(function(c){CC[c.k]=c});
function E(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function F(n){return Number(n||0).toLocaleString('en-US')}
function bar(p,c,h){return '<div class="bar"'+(h?' style="height:'+h+'px"':'')+'><i style="width:'+p+'%;background:'+c+'"></i></div>'}
function toast(t){var d=document.createElement('div');d.className='bk-toast';d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove()},3200)}
function main(){
 var s=D.sum,tot=0,have=0;D.animes.forEach(function(a){tot+=a.total;have+=Math.min(a.have,a.total)});
 var h='<div class="hero"><div class="hi"><div style="display:flex;justify-content:space-between"><b style="font-size:15px">تقدمك بالكتاب</b><span class="en note">SSS ONLY</span></div>'+
 '<div class="g2"><div class="st"><span class="en">'+s.claimed+'<small> / '+s.anime+'</small></span>أنمي مستلم</div><div class="st"><span class="en">'+have+'<small> / '+F(tot)+'</small></span>شخصية مسحوبة</div></div>'+
 bar(tot?Math.round(have/tot*100):0,'linear-gradient(90deg,#8a6d24,#f0c04a)')+
 '<div class="g2"><div class="st"><span class="en">'+F(s.gotCash)+'</span>مال مستلم</div><div class="st"><span class="en">'+s.gotCoins+'<small> / '+s.totalCoins+'</small></span>عملة سحب مستلمة</div></div>'+
 '<div class="note">الشخصية تُسجَّل في الكتاب عند سحبها فقط — الإهداء والصناديق لا تُحتسب، والبيع أو التبديل لا يلغيها. الكل بدأ من الصفر.</div></div></div>';
 h+='<div class="box" style="border-color:#f0c04a"><b style="font-size:14px;color:#f0c04a">مجموع كل الجوائز (إكمال كل الأنمي)</b><div class="mini"><span class="pill2 en">'+F(s.totalCash)+'</span><span class="pill2">'+s.totalCoins+' عملة سحب</span></div></div>';
 var b=D.bonus,bl=[['boss','هجوم الزعيم'],['arena','الأرينا'],['raid','الرايد'],['spec','المضاربات'],['xp','XP'],['inv','المخزون']].filter(function(x){return b[x[0]]>0});
 if(bl.length)h+='<div class="box"><b style="font-size:14px;color:#f0c04a">بونصاتك الحالية</b><div class="mini">'+bl.map(function(x){return '<span class="pill2">'+x[1]+' +'+b[x[0]]+(x[0]==='inv'?'':'%')+' <small style="color:#6b7388">(حد '+D.caps[x[0]]+(x[0]==='inv'?'':'%')+')</small></span>'}).join('')+'</div>'+(D.titles.length?'<div class="note">ألقابك: '+D.titles.map(E).join(' · ')+'</div>':'')+'</div>';
 h+='<div class="box"><b style="font-size:14px;color:#f0c04a">جوائز كل فئة (لكل أنمي)</b><table><tr><th>الفئة</th><th>أنمي</th><th>مال</th><th>سحب</th><th>صناديق</th></tr>'+
 D.cats.map(function(c){return '<tr><td style="color:'+c.col+';font-weight:800">'+c.n+'</td><td class="en">'+c.count+'</td><td class="en">'+F(c.cash)+'</td><td class="en">'+c.coins+'</td><td style="font-size:11px">'+(c.boxes.join(' + ')||'—')+'</td></tr>'}).join('')+
 '</table><div class="note">الجائزة تُستلم مرة واحدة فقط لكل أنمي ولا تتكرر حتى لو أُضيفت شخصيات أو تغيّرت الفئة. اللقب والبونص يبقيان لك.</div></div>';
 var fs=[['all','الكل'],['ready','جاهز للاستلام'],['prog','قيد الإكمال'],['done','مكتمل'],['none','لم أبدأ']].concat(D.cats.map(function(c){return[c.k,c.n]}));
 h+='<div class="chips">'+fs.map(function(f){return '<button class="chip'+(filter===f[0]?' on':'')+'" data-f="'+f[0]+'">'+f[1]+'</button>'}).join('')+'</div>';
 var L=D.animes.filter(function(a){if(filter==='all')return true;if(filter==='ready')return a.ready;if(filter==='prog')return a.have>0&&!a.claimed&&!a.ready;if(filter==='done')return a.claimed;if(filter==='none')return a.have===0;return a.cat===filter});
 h+='<div class="list" style="display:flex;flex-direction:column;gap:10px">'+(L.length?L.map(function(a){var c=CC[a.cat],col=a.claimed||a.ready?'#4fe08a':c.col;
  return '<div class="row" data-a="'+E(a.id)+'" style="border-color:'+col+';box-shadow:0 0 14px '+col+'33"><div class="rt"><div class="rn">'+E(a.name)+'</div><div class="tag" style="background:'+c.col+'">'+c.n+'</div></div>'+
  bar(Math.round(a.have/a.total*100),col)+'<div class="rf"><span class="en">'+a.have+' / '+a.total+'</span><span>'+(a.claimed?'مكتمل — استُلمت':a.ready?'جاهزة للاستلام!':'الجائزة: '+F(a.reward.cash)+(a.reward.coins?' + '+a.reward.coins+' سحب':''))+'</span></div></div>'}).join(''):'<div class="note" style="text-align:center">لا يوجد شيء هنا.</div>')+'</div>';
 return h}
function detail(a){
 var c=CC[a.cat],h='<div><a href="#" id="back" class="pill">← كل الأنمي</a></div>';
 h+='<div class="hero" style="background:linear-gradient(135deg,'+c.col+',#1a0a10)"><div class="hi"><div style="display:flex;justify-content:space-between;align-items:center"><span class="en" style="font-size:24px;font-weight:700;color:#fff">'+E(a.name)+'</span><span class="tag" style="background:'+c.col+';padding:3px 14px">'+c.n+'</span></div>'+
 '<div style="display:flex;justify-content:space-between;font-size:13px;color:#aeb6c8"><span>الشخصيات المسحوبة</span><span class="en" style="color:#fff">'+a.have+' / '+a.total+'</span></div>'+bar(Math.round(a.have/a.total*100),c.col,10)+
 '<div class="note">'+(a.have>=a.total?'أكملت الأنمي':'باقي '+(a.total-a.have)+' شخصية لإكمال الأنمي')+'</div></div></div>';
 h+='<div class="box" style="border-color:'+c.col+'"><b style="font-size:14px;color:'+c.col+'">جائزة إكمال '+E(a.name)+'</b><div class="mini"><span class="pill2 en">'+F(a.reward.cash)+'</span>'+(a.reward.coins?'<span class="pill2">'+a.reward.coins+' عملات سحب</span>':'')+a.reward.boxes.map(function(b){return '<span class="pill2 en" style="font-size:12px">'+E(b)+'</span>'}).join('')+'</div>';
 if(a.title)h+='<div class="st" style="text-align:right"><b style="font-size:14px;color:#f0c04a">'+(a.honorary?'لقب شرفي «'+E(a.title)+'» (بدون بونص)':'لقب «'+E(a.title)+'»')+'</b>'+(a.bonus?'<br>+'+a.bonus.pct+(a.bonus.label==='مخزون'?' مخزون':'% '+E(a.bonus.label)):'')+'</div>';
 h+=a.claimed?'<div class="btn ok">✓ استلمت الجائزة — لا تتكرر</div>':a.ready?'<button class="btn go" id="claim">استلم الجائزة</button>':'<div class="btn">أكمل الأنمي لاستلام الجائزة</div>';
 h+='</div><div style="display:flex;justify-content:space-between"><b>الشخصيات</b><span class="note">المقفلة تظهر كظل</span></div><div class="grid" style="--c:'+c.col+'">';
 a.got.forEach(function(n){h+='<div class="ch own" style="--c:'+c.col+'"><div class="av">'+E(n.charAt(0).toUpperCase())+'</div><div class="cn">'+E(n)+'</div></div>'});
 for(var i=a.got.length;i<a.total;i++)h+='<div class="ch lock"><div class="av">?</div><div class="cn">؟؟؟</div></div>';
 return h+'</div><div class="note" style="text-align:center">تُسجَّل الشخصية عند سحبها فقط — الإهداء والصناديق لا تُحتسب.</div>'}
function render(){var root=document.getElementById('bk');if(view){var a=D.animes.filter(function(x){return x.id===view})[0];if(!a){view=null;return render()}root.innerHTML=detail(a)}else root.innerHTML=main()}
document.getElementById('bk').addEventListener('click',function(e){
 var t=e.target.closest('[data-f]');if(t){filter=t.getAttribute('data-f');render();return}
 t=e.target.closest('[data-a]');if(t){view=t.getAttribute('data-a');render();scrollTo(0,0);return}
 if(e.target.closest('#back')){e.preventDefault();view=null;render();return}
 if(e.target.closest('#claim')&&!busy){busy=true;var id=view;
  fetch('/book/claim',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:CSRF,code:CODE,anime:id})})
  .then(function(r){return r.json()}).then(function(j){busy=false;
   if(j.ok){D=j.data;toast('استلمت '+F(j.entry.cash)+' مال'+(j.entry.coins?' + '+j.entry.coins+' عملات سحب':'')+(j.entry.boxes.length?' + '+j.entry.boxes.join(' + '):'')+(j.entry.title?' + لقب':''))}
   else toast(j.message||'فشل الاستلام');render()}).catch(function(){busy=false;toast('تعذّر الاتصال — حدّث الصفحة وتأكد قبل المحاولة')})}
});
render();
})();
</script>
</body></html>`
    }
}

// ───────── التهيئة ─────────
function createSiteCodexBook(opts) {
    Player = opts.Player
    getCatalog = opts.getCatalog || (() => [])
    inited = true
    const init = async () => {
        try {
            await col().createIndex({ userId: 1 }, { unique: true })
            const docs = await col().find({ 'claimed.0': { $exists: true } }, { projection: { userId: 1, claimed: 1 } }).toArray()
            for (const d of docs) recalcBonus(d.userId, d.claimed)
        } catch (e) { console.error('codexBook init error:', e && e.message) }
    }
    if (mongoose.connection.readyState === 1) init(); else mongoose.connection.once('open', init)
    return { mount, recordPull, bonusPct, bonusMult, claim, buildBook }
}

module.exports = { createSiteCodexBook, recordPull, bonusPct, bonusMult, CATS, CAPS }
