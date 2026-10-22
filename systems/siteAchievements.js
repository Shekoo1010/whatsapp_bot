'use strict'
/**
 * 🏆 إنجازاتي بالموقع — /u/:code/achievements  (systems/siteAchievements.js)
 *
 * نفس نموذج "إنجازاتي" (HTML) بالضبط، ببيانات حقيقية:
 *  - التعريفات (التصنيفات/المستويات/الجوائز) من systems/achievements.js (نفس .انجازاتي)
 *  - القيم الحالية من مستند اللاعب مطروحاً منها achievementBaseline (نفس منطق .انجازاتي و checkAndGrantAchievement)
 *  - الإشعار: checkAndGrantAchievement يدفع { type: 'ach' } لـ siteNotify فيظهر Toast أعلى الشاشة بأي صفحة،
 *    وهذه الصفحة تستطلع /achievements/state وعند إكمال مستوى جديد تنفّذ حركة البطاقة + الكونفيتي فوراً.
 *
 * الاستخدام (index.js):  const siteAchievements = require('./systems/siteAchievements').create({ Player })
 *                        registerCharacterSite(app, Player, { ..., achievements: siteAchievements })
 */

const NOTIFY = require('./siteNotify')
let TITLES_HEAD = ''
let PWA_HEAD = ''
try { TITLES_HEAD = require('./titleSystem').HEAD || '' } catch (e) { /* اختياري */ }
try { PWA_HEAD = require('./sitePwa').HEAD || '' } catch (e) { /* اختياري */ }

// نفس مصادر القيم بأمر .انجازاتي بالبوت بالضبط
const SOURCES = {
    pvp: p => p.wins || 0,
    boss: p => p.totalBossDamage || 0,
    beasts: p => p.beastEggsOpened || 0,
    brawl: p => p.brawlWins || 0,
    tower: p => p.towerTotalFloors || 0,
    kingdom: p => p.kingdomTotalStages || 0,
    omega: p => p.omegaEvolutions || 0,
    pulls: p => p.totalPulls || 0,
    boxes: p => p.boxesOpened || 0,
    daily: p => p.dailyStreak || 0,
    wealth: p => p.totalEarnedMoney || 0,
    collection: p => p.charCount || 0,
    fusion: p => p.totalMerges || 0
}

const PROJECT = {
    userId: 1, name: 1, username: 1, sessionVersion: 1, achievementBaseline: 1,
    wins: 1, totalBossDamage: 1, beastEggsOpened: 1, brawlWins: 1, towerTotalFloors: 1,
    kingdomTotalStages: 1, omegaEvolutions: 1, totalPulls: 1, boxesOpened: 1,
    dailyStreak: 1, totalEarnedMoney: 1, totalMerges: 1,
    // عدد شخصيات SSS فقط بدون جلب المصفوفة كاملة
    charCount: { $cond: [{ $isArray: '$characters' }, { $size: { $filter: { input: '$characters', as: 'c', cond: { $eq: ['$$c.rarity', 'SSS'] } } } }, 0] }
}

function jsonForScript(o) {
    return JSON.stringify(o)
        .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

// تعريفات التصنيفات (حقول آمنة فقط) من systems/achievements.js
function buildDefs() {
    const out = {}
    let src = {}
    try { src = require('./achievements').ACHIEVEMENTS || {} } catch (e) { console.error('site achievements: cannot load systems/achievements.js', e) }
    for (const k of Object.keys(SOURCES)) {
        const d = src[k]
        if (!d || !Array.isArray(d.tiers) || !d.tiers.length) continue
        out[k] = {
            icon: String(d.icon || ''),
            name: String(d.name || k),
            tiers: d.tiers.map(t => ({
                tier: Number(t.tier) || 0,
                target: Number(t.target) || 0,
                label: String(t.label || ''),
                money: Number(t.money) || 0,
                xp: Number(t.xp) || 0,
                boxes: t.boxes && typeof t.boxes === 'object' ? Object.assign({}, t.boxes) : {},
                sssCharacter: !!t.sssCharacter,
                title: t.title ? String(t.title) : null
            }))
        }
    }
    return out
}

// 📍 القيم الحالية = القيمة الخام − خط الأساس (آخر تصفير)، مثل .انجازاتي
function valuesOf(row, defs) {
    const base = row.achievementBaseline || {}
    const v = {}
    for (const k of Object.keys(defs)) v[k] = Math.max(0, (SOURCES[k](row) || 0) - (base[k] || 0))
    return v
}

// ───────────────────────── الواجهة (تُنسخ للمتصفح عبر toString) ─────────────────────────
function client() {
    var D = window.__ACH, A = D.A, V = D.V
    var BX = { basic: '📦 عادي', rare: '🎁 نادر', epic: '✨ ملحمي', legendary: '👑 أسطوري', sss_chance: '🌟 فرصة SSS', sss_high: '🌟 SSS High' }
    var TC = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)', 'var(--t5)'], flt = 'all', open = {}, pop = '', first = true
    function F(n) { return Math.round(n).toLocaleString('en-US') }
    function S(n) { return n >= 1e6 ? (n / 1e6) + 'M' : n >= 1e3 ? (n / 1e3) + 'K' : String(n) }
    function $(i) { return document.getElementById(i) }
    function H(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
    function tc(j) { return TC[Math.min(j, TC.length - 1)] }
    function info(k) {
        var d = A[k], v = V[k] || 0, N = d.tiers.length
        var cl = d.tiers.filter(function (t) { return v >= t.target }).length
        var nx = d.tiers[cl] || null, pv = cl ? d.tiers[cl - 1].target : 0
        function P(j) { return N > 1 ? 10 + j * 80 / (N - 1) : 50 }
        var pos = cl >= N ? P(N - 1) : (cl ? P(cl - 1) : 0) + ((v - pv) / (nx.target - pv)) * (P(cl) - (cl ? P(cl - 1) : 0))
        return { k: k, d: d, v: v, N: N, P: P, cl: cl, nx: nx, pos: pos, ratio: nx ? (v - pv) / (nx.target - pv) : 1 }
    }
    function rewards(t) { var r = ['💰 ' + F(t.money), '⭐ ' + F(t.xp) + ' XP']; for (var b in t.boxes) r.push(H(BX[b] || b) + ' ×' + t.boxes[b]); return r }
    function cnt(el, to, fm) { var t0 = null; function s(t) { if (t0 === null) t0 = t; var p = Math.min(1, (t - t0) / 1400); p = 1 - Math.pow(1 - p, 3); el.textContent = fm(to * p); if (p < 1) requestAnimationFrame(s) } requestAnimationFrame(s) }
    function card(x, i, mini) {
        var d = x.d, done = !x.nx, c = tc(x.cl), N = x.N
        var nodes = '', lab = ''
        d.tiers.forEach(function (t, j) {
            var k = x.v >= t.target, n = !k && j === x.cl
            nodes += '<div class="nd ' + (k ? 'k' : n ? 'n' : '') + '" style="right:' + x.P(j) + '%;--c1:' + tc(j) + '">' + (k ? '✓' : j + 1) + '</div><div class="nl" style="right:' + x.P(j) + '%">' + S(t.target) + '</div>'
        })
        var det = d.tiers.map(function (t, j) {
            var k = x.v >= t.target, n = !k && j === x.cl
            return '<div class="tr' + (k || n ? '' : ' lock') + '"><div class="s">' + (k ? '✅' : n ? '📍' : '🔒') + '</div><div class="l"><b>' + H(t.label) + '</b><em>' + rewards(t).join(' · ') + (t.sssCharacter ? ' · 🌟 شخصية SSS' : '') + (t.title ? ' · 🏷️ ' + H(t.title) : '') + '</em></div><div class="n">' + F(t.target) + '</div></div>'
        }).join('')
        var lastTitle = d.tiers[N - 1].title
        var rw = x.nx ? rewards(x.nx).map(function (r) { return '<span>' + r + '</span>' }).join('') + (x.nx.sssCharacter ? '<span class="sp">🌟 شخصية SSS</span>' : '') + (x.nx.title ? '<span class="sp">🏷️ ' + H(x.nx.title) + '</span>' : '') : (lastTitle ? '<span class="sp">🏷️ ' + H(lastTitle) + '</span>' : '')
        var h = '<div class="card' + (done ? ' done' : '') + (open[x.k] ? ' open' : '') + (pop === x.k ? ' pop' : '') + (mini ? ' mini' : '') + '" style="--i:' + i + ';--c1:' + c + '" data-k="' + H(x.k) + '"><div class="hd"><div class="ic">' + H(d.icon) + '</div><div class="nm"><b>' + H(d.name) + '</b><div class="med">' + d.tiers.map(function (t, j) { return '<i class="' + (j < x.cl ? 'k' : '') + '" style="--c1:' + tc(j) + '"></i>' }).join('') + '</div></div><div class="tag">' + (done ? '🌟 مكتمل' : H(x.nx.label)) + '</div></div>'
            + '<div class="trk"><div class="line"><div class="fill" data-w="' + x.pos + '"></div></div>' + nodes + '<div class="pin" data-p="' + x.pos + '" style="right:0"><span>أنت هنا</span></div></div>'
            + '<div class="cnt"><div class="v"><span data-n="' + x.v + '">' + F(x.v) + '</span>' + (x.nx ? ' <small>/ ' + F(x.nx.target) + '</small>' : '') + '</div><div class="r">' + (x.nx ? 'باقي <b>' + F(x.nx.target - x.v) + '</b> للوصول إلى<br>' + H(x.nx.label) + ' · ' + Math.round(x.ratio * 100) + '%' : 'أنهيت كل المستويات 🎉') + '</div></div>'
            + '<div class="rw">' + rw + '</div><div class="dt">' + det + '</div></div>'
        return h
    }
    function render() {
        var L = Object.keys(A).map(info), tot = 0, cl = 0, dn = 0, tt = 0
        L.forEach(function (x) { tot += x.N; cl += x.cl; if (!x.nx) dn++; if (x.cl >= x.N) tt++ })
        var pc = tot ? Math.round(cl / tot * 100) : 0
        $('hs').innerHTML = '<div><b>' + cl + '/' + tot + '</b><span>إنجاز مُستلم</span></div><div><b>' + dn + '/' + L.length + '</b><span>تصنيف مكتمل</span></div><div><b>' + tt + '</b><span>🏷️ ألقاب دائمة</span></div><div><b>' + (tot - cl) + '</b><span>متبقي</span></div>'
        requestAnimationFrame(function () { $('fg').style.strokeDashoffset = 327 * (1 - (tot ? cl / tot : 0)) }); cnt($('pc'), pc, function (n) { return Math.round(n) + '%' })
        var nr = L.filter(function (x) { return x.nx }).sort(function (a, b) { return b.ratio - a.ratio })[0]
        $('near').innerHTML = nr ? '<h3>🔥 الأقرب لك الآن</h3>' + card(nr, 0, 1) : ''
        var shown = L.filter(function (x) { return flt === 'all' || (flt === 'done' ? !x.nx : !!x.nx) })
        $('list').innerHTML = shown.length ? shown.map(function (x, i) { return card(x, first ? i : 0) }).join('') : '<p style="text-align:center;color:var(--d);padding:30px">لا شيء هنا بعد</p>'
        setTimeout(function () { document.querySelectorAll('.fill').forEach(function (f) { f.style.width = f.getAttribute('data-w') + '%' }); document.querySelectorAll('.pin').forEach(function (p) { p.style.right = p.getAttribute('data-p') + '%' }) }, 60)
        document.querySelectorAll('[data-n]').forEach(function (e) { if (first || pop) cnt(e, +e.getAttribute('data-n'), F) })
        first = false
    }
    function onCardClick(e) { var c = e.target.closest('.card'); if (!c) return; var k = c.getAttribute('data-k'); open[k] = !open[k]; c.classList.toggle('open', open[k]) }
    $('list').addEventListener('click', onCardClick)
    $('near').addEventListener('click', onCardClick)
    $('chips').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; flt = b.getAttribute('data-f');[].forEach.call($('chips').children, function (x) { x.classList.toggle('on', x === b) }); first = true; render() })

    // 🎉 كونفيتي عند إكمال مستوى (نفس تأثير النموذج). نص الإشعار نفسه يأتي من إشعارات الموقع (siteNotify) فلا نكرره.
    function confetti() {
        for (var i = 0; i < 26; i++) {
            var s = document.createElement('span'); s.className = 'cf'; s.textContent = ['✨', '🎉', '⭐', '💰'][i % 4]
            s.style.setProperty('--x', (Math.random() * 340 - 170) + 'px'); s.style.setProperty('--y', (Math.random() * 300 + 60) + 'px'); s.style.setProperty('--r', (Math.random() * 540 - 270) + 'deg')
            document.body.appendChild(s); setTimeout(function (q) { return function () { q.remove() } }(s), 1700)
        }
    }

    // 🔄 استطلاع التقدم الحقيقي — لو اكتمل مستوى جديد: حركة البطاقة + كونفيتي فوراً
    var busy = false, stopped = false
    function poll() {
        if (busy || stopped || document.hidden) return; busy = true
        fetch('/achievements/state', { credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { if (r.status === 401) { stopped = true; return null } return r.json() })
            .then(function (j) {
                busy = false; if (!j || !j.ok || !j.v) return
                var changed = false, up = ''
                Object.keys(A).forEach(function (k) {
                    var nv = Number(j.v[k]) || 0
                    if (nv !== (V[k] || 0)) { changed = true; var b = info(k).cl; V[k] = nv; if (!up && info(k).cl > b) up = k }
                })
                if (!changed) return
                pop = up; render()
                if (up) { confetti(); setTimeout(function () { pop = '' }, 1200) }
            }).catch(function () { busy = false })
    }
    setInterval(poll, 8000)
    document.addEventListener('visibilitychange', function () { if (!document.hidden) poll() })
    render()
}

const CSS = `
:root{color-scheme:dark;--gold:#f0c04a;--gold-dim:#8a6d24;--text:#eef1f8;--text-dim:#8891a3;--g:#f0c04a;--gd:#8a6d24;--t:#eef1f8;--d:#8891a3;--l:#222a42;--c:#0f1422;--t1:#cd7f32;--t2:#c9d3e6;--t3:#f0c04a;--t4:#7fd8ff;--t5:#ff6a4d}
*{box-sizing:border-box}html{background:#0a0d16}
body{margin:0;background:#0a0d16;color:var(--t);font-family:Cairo,system-ui,sans-serif;padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)}
.bg{position:fixed;inset:0;z-index:-1;background:radial-gradient(60vmax 40vmax at 90% -10%,rgba(240,192,74,.18),transparent 70%),radial-gradient(50vmax 40vmax at -10% 40%,rgba(124,77,255,.16),transparent 70%),radial-gradient(50vmax 40vmax at 60% 110%,rgba(255,106,77,.14),transparent 70%)}
.w{max-width:640px;margin:0 auto;padding:16px 14px 48px}
.eb{text-align:center;font:500 11px Oswald;letter-spacing:.45em;color:var(--gd)}
h1{margin:4px 0;text-align:center;font-size:clamp(32px,8vw,48px);font-weight:900;background:linear-gradient(110deg,#fff6d8 20%,var(--g) 40%,#fff 50%,var(--g) 60%,#a9791f 80%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:sh 6s linear infinite}
@keyframes sh{to{background-position:-250% 0}}
.sub{text-align:center;color:var(--d);font-size:13px;margin:0 0 14px}
.hero{display:flex;align-items:center;gap:16px;background:linear-gradient(180deg,rgba(240,192,74,.1),rgba(15,20,34,.85));border:1px solid rgba(240,192,74,.35);border-radius:22px;padding:16px}
.ring{position:relative;width:118px;height:118px;flex:none}
.ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.ring circle{fill:none;stroke-width:9;stroke-linecap:round}
.ring .bgc{stroke:#1a2036}.ring .fg{stroke:url(#gr);stroke-dasharray:327;stroke-dashoffset:327;transition:stroke-dashoffset 1.8s cubic-bezier(.2,.8,.2,1);filter:drop-shadow(0 0 6px rgba(240,192,74,.6))}
.ring b{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font:700 26px Oswald}
.ring b small{font:600 10px Cairo;color:var(--d)}
.hs{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.hs div{background:#0b0e18;border:1px solid var(--l);border-radius:12px;padding:8px 4px;text-align:center}
.hs b{display:block;font:700 18px Oswald;color:var(--g)}.hs span{font-size:11px;color:var(--d)}
.near{margin:14px 0 4px;border-radius:20px;padding:14px;border:1.5px solid var(--g);background:linear-gradient(135deg,rgba(240,192,74,.16),rgba(15,20,34,.9));position:relative;overflow:hidden}
.near::after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.12) 50%,transparent 60%);transform:translateX(-130%);animation:sw 4.5s ease-in-out infinite;pointer-events:none}
@keyframes sw{55%,100%{transform:translateX(130%)}}
.near h3{margin:0 0 8px;font-size:13px;color:var(--g)}
.chips{display:flex;gap:6px;margin:14px 0 10px}
.chips button{flex:1;border:1px solid var(--l);background:var(--c);color:var(--d);border-radius:12px;padding:9px 4px;font:800 13px Cairo;cursor:pointer}
.chips button.on{background:linear-gradient(90deg,var(--gd),var(--g));color:#0a0d16;border-color:var(--g)}
.card{background:rgba(15,20,34,.88);border:1px solid var(--l);border-radius:20px;padding:14px;margin-bottom:12px;animation:up .6s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i)*60ms)}
@keyframes up{from{opacity:0;transform:translateY(26px)}}
.card.mini{margin:0;background:none;border:0;padding:0;animation:none;box-shadow:none}.card.done{border-color:var(--g);box-shadow:0 0 26px -10px var(--g);background:linear-gradient(180deg,rgba(240,192,74,.1),rgba(15,20,34,.9))}
.card.pop{animation:pop .9s ease}
@keyframes pop{30%{transform:scale(1.04);box-shadow:0 0 40px 0 var(--g)}}
.hd{display:flex;align-items:center;gap:12px;cursor:pointer}
.ic{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;background:radial-gradient(circle at 30% 25%,#26305a,#0b0f1d);border:1.5px solid var(--gd);animation:fl 3s ease-in-out infinite}
@keyframes fl{50%{transform:translateY(-3px);box-shadow:0 6px 18px -6px var(--g)}}
.nm{flex:1;min-width:0}.nm b{display:block;font-size:16px;font-weight:900}
.med{display:flex;gap:4px;margin-top:4px}.med i{width:18px;height:6px;border-radius:6px;background:#1a2036}
.med i.k{background:var(--c1);box-shadow:0 0 8px var(--c1)}
.tag{font-size:11px;font-weight:800;padding:2px 10px;border-radius:20px;border:1px solid var(--c1);color:var(--c1);white-space:nowrap}
.trk{position:relative;height:64px;margin:12px 4px 0}
.line{position:absolute;top:22px;right:0;left:0;height:8px;border-radius:8px;background:#151b2e;overflow:hidden}
.fill{height:100%;width:0;border-radius:8px;background:linear-gradient(270deg,var(--gd),var(--g),#fff6d8);transition:width 1.6s cubic-bezier(.2,.8,.2,1);position:relative;margin-right:0}
.fill::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(115deg,transparent 0 10px,rgba(255,255,255,.25) 10px 20px);animation:st 1s linear infinite}
@keyframes st{to{background-position:20px 0}}
.nd{position:absolute;top:13px;width:26px;height:26px;margin-right:-13px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;background:#0b0e18;border:2px solid var(--l);color:var(--d);z-index:2}
.nd.k{background:var(--c1);border-color:var(--c1);color:#0a0d16;box-shadow:0 0 12px var(--c1)}
.nd.n{border-color:var(--c1);color:var(--c1);animation:pl 1.6s ease-in-out infinite}
@keyframes pl{50%{box-shadow:0 0 0 6px color-mix(in srgb,var(--c1) 25%,transparent)}}
.nl{position:absolute;top:44px;width:50px;margin-right:-25px;text-align:center;font:600 10px Oswald;color:var(--d);direction:ltr}
.pin{position:absolute;top:-4px;margin-right:-30px;width:60px;text-align:center;transition:right 1.6s cubic-bezier(.2,.8,.2,1);z-index:3}
.pin span{display:inline-block;font-size:10px;font-weight:900;background:var(--g);color:#0a0d16;border-radius:8px;padding:1px 7px;animation:bn 1.4s ease-in-out infinite}
.pin::after{content:'';display:block;margin:0 auto;width:0;height:0;border:5px solid transparent;border-top-color:var(--g)}
@keyframes bn{50%{transform:translateY(-3px)}}
.cnt{display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;gap:8px}
.cnt .v{font:700 24px Oswald;color:var(--g);direction:ltr}.cnt .v small{font-size:14px;color:var(--d)}
.cnt .r{font-size:12px;color:var(--d);text-align:left}.cnt .r b{color:var(--t)}
.rw{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.rw span{font-size:11.5px;background:#0b0e18;border:1px solid var(--l);border-radius:20px;padding:2px 9px;color:#cfd6ee}
.rw .sp{border-color:var(--g);color:var(--g)}
.dt{display:none;margin-top:12px;border-top:1px dashed var(--l);padding-top:8px}
.card.open .dt{display:block;animation:up .4s both}
.tr{display:flex;align-items:center;gap:8px;padding:7px 0;font-size:12.5px;border-bottom:1px solid #141a2c}
.tr:last-child{border:0}.tr .s{width:22px;text-align:center}.tr .l{flex:1}.tr .l b{display:block;font-size:13px}.tr .l em{font-style:normal;color:var(--d);font-size:11px}
.tr .n{font:700 13px Oswald;direction:ltr;color:var(--g)}.tr.lock{opacity:.55}
.cf{position:fixed;top:60px;left:50%;font-size:20px;pointer-events:none;z-index:31;animation:cf 1.6s ease-out forwards}
@keyframes cf{to{transform:translate(var(--x),var(--y)) rotate(var(--r));opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}

.topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px}
.pill{display:inline-block;font:800 13px Cairo,sans-serif;color:var(--g);border:1px solid var(--gd);border-radius:20px;padding:6px 14px;background:#0f1422;text-decoration:none}
`

function pageHTML({ code, csrf, name, defs, values, esc, navDrawerHTML, NAV_BTN }) {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
${TITLES_HEAD}${PWA_HEAD}${NOTIFY.HEAD}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>إنجازاتي</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Oswald:wght@500;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body><div class="bg"></div>
<div class="w">
<div class="topbar"><span class="tb-l">${NAV_BTN}</span><a class="pill" href="/u/${esc(code)}">رجوع</a></div>
<div class="eb">ACHIEVEMENTS</div><h1>🏆 إنجازاتي</h1><p class="sub">نفس منطق <b>.انجازاتي</b> بالبوت — الجوائز تُمنح تلقائياً عند الوصول للهدف</p>
<div class="hero"><div class="ring"><svg viewBox="0 0 120 120"><defs><linearGradient id="gr"><stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#f0c04a"/></linearGradient></defs><circle class="bgc" cx="60" cy="60" r="52"/><circle class="fg" id="fg" cx="60" cy="60" r="52"/></svg><b><span id="pc">0%</span><small>الإنجاز الكلي</small></b></div>
<div class="hs" id="hs"></div></div>
<div class="near" id="near"></div>
<div class="chips" id="chips"><button class="on" data-f="all">الكل</button><button data-f="go">جارية</button><button data-f="done">مكتملة</button></div>
<div id="list"></div></div>
${navDrawerHTML(code, csrf, 'achievements', name)}
<script>window.__ACH=${jsonForScript({ A: defs, V: values })};</script>
<script>(${client.toString()})()</script>
</body></html>`
}

function create({ Player }) {
    const defs = buildDefs()
    const hits = new Map() // userId -> [timestamps] (حد بسيط لاستطلاع الحالة)
    function rate(userId) {
        const now = Date.now()
        const arr = (hits.get(userId) || []).filter(t => now - t < 60000)
        if (arr.length >= 30) { hits.set(userId, arr); return false }
        arr.push(now); hits.set(userId, arr); return true
    }
    async function loadRow(match) {
        const rows = await Player.aggregate([{ $match: match }, { $limit: 1 }, { $project: PROJECT }])
        return rows[0] || null
    }

    function mount(app, { auth, securityHeaders, CODE_RE, html404, ownerSession, esc, navDrawerHTML, NAV_BTN }) {
        app.get('/u/:code/achievements', async (req, res) => {
            try {
                securityHeaders(res)
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return html404(res)
                const row = await loadRow({ siteCode: code })
                if (!row) return html404(res)
                const sess = ownerSession(req, row)
                if (!sess) return res.redirect(303, `/login?code=${code}`)
                res.send(pageHTML({
                    code, csrf: auth.csrfForSession(sess), name: row.name || row.username || 'لاعب',
                    defs, values: valuesOf(row, defs), esc, navDrawerHTML, NAV_BTN
                }))
            } catch (err) {
                console.error('achievements page error:', err)
                res.status(500).send('خطأ بالخادم')
            }
        })

        app.get('/achievements/state', async (req, res) => {
            res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
            try {
                if (!auth.authEnabled()) return res.status(401).json({ ok: false })
                const sess = auth.readSession(req)
                if (!sess) return res.status(401).json({ ok: false })
                if (!rate(sess.u)) return res.status(429).json({ ok: false })
                const row = await loadRow({ userId: sess.u })
                if (!row || (row.sessionVersion || 0) !== sess.v) return res.status(401).json({ ok: false })
                res.json({ ok: true, v: valuesOf(row, defs) })
            } catch (err) {
                console.error('achievements state error:', err)
                res.status(500).json({ ok: false })
            }
        })
    }

    return { mount }
}

module.exports = { create }
