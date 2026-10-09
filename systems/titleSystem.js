// 🏅 نظام الألقاب — systems/titleSystem.js
// - اللقب المفعّل يُحفظ بحقل Player.activeTitle (نص اللقب نفسه كما هو بـ Player.titles)
// - الندرة/اللون/الأنميشن من السجل أدناه. أي لقب غير مسجّل يظهر كـ «شرفي» رمادي (آمن لأي لقب قديم أو جديد)
// - الأماكن تستعمل compactOf(doc) لتحويل مستند اللاعب إلى { e, n, r, c, f } أو null، والعرض بـ badge() (سيرفر) أو TB() (متصفح)

const RARITY = {
    common: { n: 'شرفي', c: '#9aa3b5' },
    rare: { n: 'نادر', c: '#3ea8ff' },
    epic: { n: 'ملحمي', c: '#c04aff' },
    legend: { n: 'أسطوري', c: '#f0c04a' },
    mythic: { n: 'خرافي', c: '#ff3860' }
}
const RARITY_ORDER = ['mythic', 'legend', 'epic', 'rare', 'common']

// [النص كما بـ Player.titles, الندرة, اللون, حركة الأيقونة, مصدر اللقب]
const REG_LIST = [
    ['🌌 حاكم الأكوان', 'mythic', '#c04aff', 'spin', 'هدية الإدارة'],
    ['🌌 المتطور الأوميغا', 'mythic', '#3ea8ff', 'spin', 'إنجاز: تطوير أوميقا'],
    ['👑 ملك الأبطال', 'legend', '#f0c04a', 'float', 'هدية الإدارة'],
    ['⚜️ سيد العروش', 'legend', '#f0c04a', 'pulse', 'إكمال البرج (الطابق 60)'],
    ['👑 قاهر العالم', 'legend', '#f0c04a', 'float', 'إنجاز: الزعيم العالمي'],
    ['🏆 أسطورة الحلبة', 'legend', '#f0c04a', 'float', 'إنجاز: القتال'],
    ['💰 امبراطور المال', 'legend', '#f0c04a', 'pulse', 'إنجاز: الثروة'],
    ['🐉 سيد الوحوش', 'epic', '#4fe08a', 'flame', 'إنجاز: جمع الوحوش'],
    ['🥋 ملك الشوارع', 'epic', '#ff6b3d', 'pulse', 'إنجاز: المضاربة'],
    ['🗼 فاتح البرج', 'epic', '#3ea8ff', 'float', 'إنجاز: برج التحدي'],
    ['🏰 غازي الممالك', 'epic', '#c04aff', 'float', 'إنجاز: غزو الممالك'],
    ['🧿 جامع الأساطير', 'epic', '#3ea8ff', 'pulse', 'إنجاز: جمع الشخصيات'],
    ['🔗 سيد الدمج', 'epic', '#f0c04a', 'spin', 'إنجاز: دمج الشخصيات'],
    ['🎰 صياد الحظ', 'rare', '#ff3860', 'spin', 'إنجاز: السحب'],
    ['📦 جامع الصناديق', 'rare', '#ff6b3d', 'float', 'إنجاز: فتح الصناديق'],
    ['📅 المواظب الأسطوري', 'rare', '#4fe08a', 'pulse', 'إنجاز: المواظبة اليومية']
]
const nk = s => String(s || '').replace(/[\uFE0F\u200d]/g, '').trim()
const REG = new Map(REG_LIST.map(r => [nk(r[0]), r]))

// ألوان ألقاب كتاب المجموعة حسب نوع البونص
const BOOK_COLOR = {
    bleach: '#ff3860', kingdom: '#ff3860', leagueoflegends: '#ff6b3d', tekken: '#ff6b3d',
    hunterxhunter: '#4fe08a', residentevil: '#4fe08a', onepiece: '#3ea8ff', wutheringwaves: '#3ea8ff',
    detectiveconan: '#2dd4bf', genshinimpact: '#f0c04a', mobilelegends: '#f0c04a', naruto: '#f0c04a'
}
const bn = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '')

function split(text) {
    const t = String(text || '').trim()
    const m = t.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200d\p{Extended_Pictographic})*)\s*(.*)$/u)
    return m ? { e: m[1], n: m[2] || t } : { e: '🏅', n: t }
}

function info(text) {
    const key = nk(text)
    const r = REG.get(key)
    const sp = split(text)
    if (r) return { e: sp.e, n: sp.n, r: r[1], c: r[2], f: r[3], src: r[4] }
    if (key.startsWith('📖 سيّد ') || key.startsWith('📖 سيد ')) {
        const anime = key.replace(/^📖 سيّ?د /, '')
        return { e: '📖', n: sp.n, r: 'epic', c: BOOK_COLOR[bn(anime)] || '#c04aff', f: 'float', src: 'كتاب المجموعة (ضخم/كبير)' }
    }
    if (key.startsWith('📖 عاشق ')) return { e: '📖', n: sp.n, r: 'common', c: '#9aa3b5', f: 'float', src: 'كتاب المجموعة (متوسط)' }
    return { e: sp.e, n: sp.n, r: 'common', c: '#9aa3b5', f: 'float', src: 'لقب خاص' }
}

function compactOf(doc) {
    const a = doc && doc.activeTitle
    if (!a || !Array.isArray(doc.titles) || !doc.titles.includes(a)) return null
    const i = info(a)
    return { e: i.e, n: i.n, r: i.r, c: i.c, f: i.f }
}

async function lookupMany(Player, ids) {
    const out = new Map()
    const list = [...new Set((ids || []).filter(Boolean))]
    if (!list.length) return out
    const rows = await Player.find({ userId: { $in: list } }).select('userId activeTitle titles').lean()
    for (const r of rows) out.set(r.userId, compactOf(r))
    return out
}

const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]))
function badge(t, sm) {
    if (!t) return ''
    return `<span class="ttl tr-${escH(t.r)}${sm ? ' sm' : ''}" style="--c:${escH(t.c)}"><i class="tei tfx-${escH(t.f)}">${escH(t.e)}</i><b class="tn">${escH(t.n)}</b></span>`
}

function wrap(t, sm) { return t ? `<div class="ttw">${badge(t, sm)}</div>` : '' }

// CSS مشترك (يُحقن بكل صفحات الموقع) — بأسماء فريدة ttl/tr-/tfx- لتفادي أي تعارض
const CSS = `
@property --ta{syntax:'<angle>';inherits:false;initial-value:0deg}
.ttl{--c:#9aa3b5;--tb:#0f1422;display:inline-flex;align-items:center;gap:5px;font-weight:900;font-size:12.5px;padding:3px 11px;border-radius:20px;color:var(--c);border:1.5px solid var(--c);background:var(--tb);position:relative;white-space:nowrap;overflow:hidden;vertical-align:middle;line-height:1.5;font-family:'Cairo',sans-serif;font-style:normal;margin-inline-start:6px}
.ttl.sm{font-size:10.5px;padding:1px 8px;gap:3px;border-width:1px}
.ttl.tr-rare{box-shadow:0 0 9px color-mix(in srgb,var(--c) 45%,transparent)}
.ttl.tr-epic{box-shadow:0 0 12px color-mix(in srgb,var(--c) 60%,transparent);animation:ttlP 2.2s ease-in-out infinite}
.ttl.tr-legend{border-color:transparent;color:#ffe9a8;background:linear-gradient(var(--tb),var(--tb)) padding-box,linear-gradient(110deg,#8a6d24,#fff3b8,#f0c04a,#8a6d24) border-box;box-shadow:0 0 14px #f0c04a66}
.ttl.tr-mythic{border-color:transparent;color:#fff;--tb:#0b0e1c;background:linear-gradient(var(--tb),var(--tb)) padding-box,conic-gradient(from var(--ta),#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860) border-box;animation:ttlR 4s linear infinite;box-shadow:0 0 16px #c04aff77;}
.ttl .tn{font-weight:900}
.ttl.tr-mythic .tn{background:linear-gradient(100deg,#ffb3c4,#ffe9a8,#a8d8ff,#e3b3ff,#ffb3c4);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;animation:ttlTx 4s linear infinite;filter:drop-shadow(0 0 4px rgba(255,255,255,.35))}
.ttl.tr-legend .tn{background:linear-gradient(100deg,#fff3b8,#f0c04a,#fff3b8);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;animation:ttlTx 4s linear infinite}
@keyframes ttlTx{to{background-position:-220% 0}}
.ttl.tr-legend::after,.ttl.tr-mythic::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 40%,rgba(255,255,255,.35) 50%,transparent 60%);transform:translateX(-130%);animation:ttlS 3.2s ease-in-out infinite}
.ttw{display:block;margin-top:2px;line-height:1.4;white-space:normal}.ttw .ttl{display:inline-flex!important;color:var(--c);margin-inline-start:0}.ttw .ttl.tr-legend,.ttw .ttl.tr-mythic{color:#fff}
.tei{font-style:normal;display:inline-block}
.tfx-spin{animation:ttlSp 6s linear infinite}.tfx-float{animation:ttlF 2s ease-in-out infinite}.tfx-pulse{animation:ttlPl 1.6s ease-in-out infinite}.tfx-flame{animation:ttlFl .9s ease-in-out infinite}
@keyframes ttlR{to{--ta:360deg}}@keyframes ttlS{55%,100%{transform:translateX(130%)}}@keyframes ttlP{50%{box-shadow:0 0 22px color-mix(in srgb,var(--c) 80%,transparent)}}
@keyframes ttlSp{to{transform:rotate(360deg)}}@keyframes ttlF{50%{transform:translateY(-3px)}}@keyframes ttlPl{50%{transform:scale(1.25)}}@keyframes ttlFl{0%,100%{transform:scale(1) rotate(-6deg)}50%{transform:scale(1.18) rotate(6deg)}}
@media (prefers-reduced-motion:reduce){.ttl,.ttl::after,.tei,.ttl .tn{animation:none!important}}
`
// دالة المتصفح: TB(t, sm) ترجع HTML الشارة، و TB.e للتهريب
const JS = `window.TB=function(t,sm){if(!t)return'';var e=TB.e;return '<span class="ttl tr-'+e(t.r)+(sm?' sm':'')+'" style="--c:'+e(t.c)+'"><i class="tei tfx-'+e(t.f)+'">'+e(t.e)+'</i><b class="tn">'+e(t.n)+'</b></span>'};TB.e=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})};`

// ───────── صفحة اختيار اللقب + التفعيل ─────────
function mount(app, h) {
    const { Player, auth, jsonBody, securityHeaders, CODE_RE, html404, ownerSession, esc, navDrawerHTML, NAV_BTN, shellHead } = h
    const onChange = h.onChange || (() => {})
    const hits = new Map()
    const rate = u => { const n = Date.now(), a = (hits.get(u) || []).filter(t => n - t < 60000); if (a.length >= 30) { hits.set(u, a); return false } a.push(n); hits.set(u, a); return true }
    const J = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')

    function dataFor(player) {
        const owned = [...new Set(player.titles || [])].map(t => { const i = info(t); return { k: t, e: i.e, n: i.n, r: i.r, c: i.c, f: i.f, s: i.src } })
        const have = new Set(owned.map(o => nk(o.k)))
        const locked = REG_LIST.filter(r => !have.has(nk(r[0]))).map(r => { const i = info(r[0]); return { k: r[0], e: i.e, n: i.n, r: i.r, c: i.c, f: i.f, s: i.src } })
        return { owned, locked, active: (player.activeTitle && (player.titles || []).includes(player.activeTitle)) ? player.activeTitle : '' }
    }

    app.get('/u/:code/titles', async (req, res) => {
        try {
            securityHeaders(res); res.set('Cache-Control', 'no-store')
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)
            const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion titles activeTitle').lean()
            if (!player) return html404(res)
            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)
            res.send(page({ code, csrf: auth.csrfForSession(sess), name: player.name || player.username || 'لاعب', data: dataFor(player) }))
        } catch (e) { console.error('titles page error:', e); res.status(500).send('خطأ بالخادم') }
    })

    app.post('/titles/equip', jsonBody, async (req, res) => {
        res.set('Cache-Control', 'no-store')
        const fail = (s, code, message) => res.status(s).json({ ok: false, code, message })
        try {
            if (!auth.authEnabled()) return fail(503, 'DISABLED', 'غير مفعّل حالياً.')
            if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')
            const sess = auth.readSession(req)
            if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
            const b = req.body || {}
            if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
            if (!rate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر قليلاً.')
            const me = await Player.findOne({ userId: sess.u }).select('sessionVersion titles').lean()
            if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
            const want = String(b.title == null ? '' : b.title).slice(0, 80)
            if (want && !(me.titles || []).includes(want)) return fail(400, 'NOT_OWNED', 'لا تملك هذا اللقب.')
            await Player.updateOne({ userId: sess.u }, { $set: { activeTitle: want } }, { strict: false })
            try { onChange(sess.u) } catch (e) {}
            res.json({ ok: true, active: want, t: want ? compactOf({ activeTitle: want, titles: [want] }) : null })
        } catch (e) { console.error('titles equip error:', e); fail(500, 'SERVER', '❌ خطأ بالخادم.') }
    })

    function page({ code, csrf, name, data }) {
        return `${shellHead('الألقاب')}
<style>
.tp{max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
.tp .cur{position:sticky;top:calc(6px + env(safe-area-inset-top,0px));z-index:20;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#0f1422;border:1.5px solid var(--gold);border-radius:14px;padding:10px 12px;box-shadow:0 6px 20px #0008}
.tp .lbl{font-size:12px;color:var(--text-dim);font-weight:700}
.tp details{border:1px solid #1f2740;border-radius:14px;background:#0b0e18}
.tp summary{cursor:pointer;padding:11px 12px;font-weight:900;font-size:13px;display:flex;justify-content:space-between;list-style:none}
.tp summary::-webkit-details-marker{display:none}
.tp .gr{display:flex;flex-direction:column;gap:8px;padding:4px 12px 12px}
.tp .it{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;border:2px solid transparent;border-radius:14px;background:#0f1422;font-family:inherit;color:inherit;cursor:pointer;text-align:start;width:100%}
.tp .it.on{border-color:var(--gold)}.tp .it.lk{opacity:.45;cursor:default}
.tp .it small{font-size:11px;color:var(--text-dim)}
.tp .st{font-size:11px;font-weight:900;border-radius:20px;padding:4px 10px;border:1px solid #1f2740;color:var(--text-dim);white-space:nowrap}
.tp .it.on .st{background:var(--gold);color:#0a0d16;border-color:var(--gold)}
.tp .rm{font:900 12px 'Cairo',sans-serif;border:1px solid var(--gold);color:var(--gold);background:none;border-radius:10px;padding:6px 12px;cursor:pointer}
.tp-toast{position:fixed;bottom:calc(20px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);background:var(--gold);color:#0a0d16;font-weight:900;padding:11px 18px;border-radius:14px;z-index:99;font-size:14px;max-width:90%;text-align:center}
</style>
<body><div style="padding:30px 16px 60px">
  <div class="topbar"><span class="tb-l">${NAV_BTN}<span class="gmode">🏅 الألقاب</span></span><a class="pill" href="/u/${esc(code)}">← رجوع للعرض</a></div>
  ${navDrawerHTML(code, csrf, 'titles', name)}
  <div class="tp"><div class="cur"><div><div class="lbl">لقبك المفعّل — يظهر عند الجميع</div><span id="cur"></span></div><button class="rm" id="rm">إزالة</button></div>
  <div class="lbl">لقب واحد فقط يكون مفعّلًا، ويظهر بجانب اسمك في الشات والأرينا والتحدي والأقوى والمعارض والزعيم والرايد. بدّله متى شئت.</div>
  <div id="gal" style="display:flex;flex-direction:column;gap:10px"></div></div>
</div>
<script id="td" type="application/json">${J(data)}</script>
<script>
(function(){
var D=JSON.parse(document.getElementById('td').textContent),CSRF=${J(csrf)},busy=false;
var RN=${J(Object.fromEntries(Object.entries(RARITY).map(([k, v]) => [k, v.n])))},RC=${J(Object.fromEntries(Object.entries(RARITY).map(([k, v]) => [k, v.c])))},RO=${J(RARITY_ORDER)};
var E=TB.e;
function B(t,sm){return TB({e:t.e,n:t.n,r:t.r,c:t.c,f:t.f},sm)}
function cur(){var a=D.owned.filter(function(o){return o.k===D.active})[0];return a||null}
function render(){
 var c=cur();document.getElementById('cur').innerHTML=c?B(c):'<span class="lbl">بدون لقب</span>';
 document.getElementById('gal').innerHTML=RO.map(function(r){
  var o=D.owned.filter(function(x){return x.r===r}),l=D.locked.filter(function(x){return x.r===r});if(!o.length&&!l.length)return '';
  return '<details'+(o.length?' open':'')+'><summary><span style="color:'+RC[r]+'">'+E(RN[r])+'</span><span class="lbl">'+o.length+' مملوك</span></summary><div class="gr">'+
   o.map(function(x){var on=x.k===D.active;return '<button class="it'+(on?' on':'')+'" data-k="'+E(x.k)+'"><span style="display:flex;flex-direction:column;gap:3px;align-items:flex-start">'+B(x)+'<small>'+E(x.s||'')+'</small></span><span class="st">'+(on?'✓ مفعّل':'تفعيل')+'</span></button>'}).join('')+
   l.map(function(x){return '<div class="it lk"><span style="display:flex;flex-direction:column;gap:3px;align-items:flex-start">'+B(x)+'<small>🔒 '+E(x.s||'')+'</small></span></div>'}).join('')+'</div></details>'}).join('')}
function toast(m){var d=document.createElement('div');d.className='tp-toast';d.textContent=m;document.body.appendChild(d);setTimeout(function(){d.remove()},2000)}
function equip(k){if(busy)return;busy=true;
 fetch('/titles/equip',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:CSRF,title:k})})
 .then(function(r){return r.json()}).then(function(j){busy=false;if(j.ok){D.active=j.active;render();toast(j.active?'تم تفعيل اللقب':'تمت إزالة اللقب')}else toast(j.message||'تعذّر التفعيل')}).catch(function(){busy=false;toast('تعذّر الاتصال')})}
document.addEventListener('click',function(e){var b=e.target.closest('[data-k]');if(b){if(b.dataset.k!==D.active)equip(b.dataset.k);return}if(e.target.id==='rm'&&D.active)equip('')});
render();
})();
</script></body></html>`
    }
}


// 🧩 تزيين صفحات خارجية (مثل صفحة الرايد الجاهزة) بدون تعديل HTML الخاص بها:
// يبحث عن نص الاسم بالصفحة ويلصق الشارة بعده، ويلتقط تحديثات /raid/state تلقائياً
const DECOR = `(function(){var M={};function add(a){(a||[]).forEach(function(r){if(r&&r.name&&r.t)M[String(r.name)]=r.t})}add(window.__TB_LIST);
var of=window.fetch;if(of)window.fetch=function(){var a=arguments,p=of.apply(this,a);try{var u=String((a[0]&&a[0].url)||a[0]);if(u.indexOf('/raid/state')>-1)p.then(function(r){return r.clone().json()}).then(function(j){add(j&&j.board);sched()}).catch(function(){})}catch(e){}return p};
var tm=0;function sched(){clearTimeout(tm);tm=setTimeout(run,120)}
function run(){if(!document.body||!window.TB)return;var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null),n,hit=[];
while(n=w.nextNode()){var p=n.parentNode;if(!p||/^(SCRIPT|STYLE|TEXTAREA)$/.test(p.tagName)||p.closest('.ttl'))continue;var v=n.nodeValue.replace(/^[^\\p{L}\\p{N}@]+/u,'').trim();if(v&&M[v])hit.push([p,v])}
hit.forEach(function(h){var p=h[0];if(p.querySelector(':scope>.ttl'))return;p.insertAdjacentHTML('beforeend',TB(M[h[1]],1))})}
new MutationObserver(sched).observe(document.documentElement,{childList:true,subtree:true,characterData:true});addEventListener('DOMContentLoaded',sched);sched()})();`
function decor(list) {
    const j = JSON.stringify((list || []).filter(r => r && r.name && r.t).map(r => ({ name: String(r.name), t: r.t })))
        .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    return `<script>window.__TB_LIST=${j};${DECOR}</script>`
}
// يحقن CSS/JS الألقاب + المزيّن بصفحة HTML جاهزة (نص)
function inject(html, list) {
    let h = String(html || '')
    h = /<head[^>]*>/i.test(h) ? h.replace(/<head[^>]*>/i, m => m + HEAD) : HEAD + h
    const d = decor(list)
    const i = h.lastIndexOf('</body>')
    return i >= 0 ? h.slice(0, i) + d + h.slice(i) : h + d
}

const HEAD = `<style>${CSS}</style><script>${JS}</script>`
module.exports = { RARITY, REG_LIST, info, compactOf, lookupMany, badge, wrap, CSS, JS, mount, HEAD, decor, inject }
