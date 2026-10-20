'use strict'
/**
 * 🔔 إشعارات الموقع (Toast من أعلى الشاشة) — systems/siteNotify.js
 *
 * أي شيء يُرسل للاعب بالواتساب (إنجاز / نقاط عالم / رفع مستوى / إشعار خاص) يُدفع هنا أيضاً،
 * فيظهر بالموقع حتى لو الواتساب منقطع. الطابور بالذاكرة (10 دقائق، آخر 40 إشعار لكل لاعب).
 *
 * الاستخدام:
 *   const NOTIFY = require('./siteNotify')
 *   ... داخل <head> بعد ${PWA.HEAD}:        ${NOTIFY.HEAD}
 *   ... داخل registerCharacterSite:         NOTIFY.mount(app, { Player, auth, securityHeaders, CODE_RE, html404, ownerSession, esc, shellHead, navDrawerHTML, NAV_BTN })
 *   ... من أي مكان بالبوت:                  require('./systems/siteNotify').push(userId, { type, icon, title, text })
 */

const TTL_MS = 10 * 60 * 1000
const MAX_PER_USER = 40
const TYPES = new Set(['ach', 'world', 'level', 'milestone', 'dm'])

// 🗂️ سجل دائم (آخر 30 إشعار لكل لاعب، يُحذف تلقائياً بعد 14 يوم) — لمن يغيب أكثر من 10 دقائق
let mongoose = null
try { mongoose = require('mongoose') } catch (e) { /* بدون قاعدة: الطابور بالذاكرة فقط */ }
const LOG_LIMIT = 30
let LogModel = null
function logModel() {
    if (LogModel || !mongoose) return LogModel
    try {
        const schema = new mongoose.Schema({
            userId: { type: String, required: true },
            nid: { type: Number, required: true },
            type: String, icon: String, title: String, text: String,
            createdAt: { type: Date, default: Date.now, expires: 14 * 24 * 3600 }
        }, { versionKey: false })
        schema.index({ userId: 1, nid: -1 })
        LogModel = mongoose.models.SiteNotif || mongoose.model('SiteNotif', schema)
    } catch (e) { LogModel = null }
    return LogModel
}
function persist(userId, item) {
    try {
        const M = logModel()
        if (!M) return
        M.create({ userId: String(userId), nid: item.id, type: item.type, icon: item.icon, title: item.title, text: item.text })
            .catch(() => { })
    } catch (e) { /* السجل الجانبي ما يوقف أي منطق */ }
}

const queues = new Map() // userId -> [{ id, at, type, icon, title, text }]
let lastId = 0

function push(userId, n) {
    try {
        if (!userId || !n) return
        const now = Date.now()
        lastId = Math.max(lastId + 1, now) // يتزايد دائماً حتى بعد إعادة التشغيل
        const item = {
            id: lastId,
            at: now,
            type: TYPES.has(n.type) ? n.type : 'dm',
            icon: String(n.icon || '🔔').slice(0, 8),
            title: String(n.title || '').slice(0, 80),
            text: String(n.text || '').slice(0, 320)
        }
        if (!item.title && !item.text) return
        const list = (queues.get(userId) || []).filter(x => now - x.at < TTL_MS)
        list.push(item)
        while (list.length > MAX_PER_USER) list.shift()
        queues.set(userId, list)
        persist(userId, item)
    } catch (e) { /* الإشعار الجانبي ما يوقف أي منطق */ }
}

// تنظيف دوري للاعبين الغير نشطين
setInterval(() => {
    const now = Date.now()
    for (const [u, list] of queues) {
        const keep = list.filter(x => now - x.at < TTL_MS)
        if (keep.length) queues.set(u, keep); else queues.delete(u)
    }
}, 5 * 60 * 1000).unref()

const sessCache = new Map() // userId -> { v, at }

// جلسة اللاعب + فحص نسخة الجلسة (يتخزن دقيقة لتخفيف الضغط على القاعدة)
function makeSession(Player, auth) {
    return async function sessionOf(req) {
        if (!auth.authEnabled()) return null
        const sess = auth.readSession(req)
        if (!sess) return null
        const c = sessCache.get(sess.u)
        if (c && Date.now() - c.at < 60000 && c.v === sess.v) return sess
        const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
        const ok = !!me && (me.sessionVersion || 0) === sess.v
        if (ok) sessCache.set(sess.u, { v: sess.v, at: Date.now() })
        return ok ? sess : null
    }
}

const PAGE_TYPES = new Set(['ach', 'world', 'level', 'milestone', 'dm'])

function logPageHTML({ code, csrf, name, rows, newest, esc, shellHead, navDrawerHTML, NAV_BTN }) {
    const fmt = t => { try { return new Date(Number(t)).toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' }) } catch (e) { return '' } }
    const list = rows.map(r => `<div class="nl-row nl-${PAGE_TYPES.has(r.type) ? r.type : 'dm'}" data-id="${Number(r.nid) || 0}">
      <div class="nl-i">${esc(String(r.icon || '🔔'))}</div>
      <div class="nl-b"><b>${esc(String(r.title || ''))}</b>${r.text ? `<div class="nl-x">${esc(String(r.text))}</div>` : ''}<span class="nl-t">${esc(fmt(r.nid))}</span></div></div>`).join('')
    return shellHead('الإشعارات') + `
<style>
.nl-wrap{max-width:640px;margin:0 auto;padding:16px}
.nl-row{display:flex;gap:12px;align-items:flex-start;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:12px;margin:10px 0;border-inline-start:4px solid #e2b64b}
.nl-world{border-inline-start-color:#3ea8ff}.nl-level{border-inline-start-color:#4fe08a}.nl-dm{border-inline-start-color:#8891a3}.nl-milestone{border-inline-start-color:#ffd54a;background:rgba(255,213,74,.08)}
.nl-new{box-shadow:0 0 0 1px #f0c04a,0 0 18px -6px #f0c04a}.nl-new .nl-t::after{content:' · جديد';color:#f0c04a;font-weight:800}
.nl-i{font-size:26px;line-height:1.1}.nl-b b{display:block;color:#f0c04a;font-size:14px}
.nl-x{white-space:pre-line;font-size:13px;line-height:1.6;margin-top:3px;word-break:break-word}
.nl-t{display:block;opacity:.6;font-size:11.5px;margin-top:4px}.nl-empty{text-align:center;opacity:.7;padding:40px 0}
</style>
<body>
<div class="topbar"><span class="tb-l">${NAV_BTN}<span class="gmode">🔔 الإشعارات (آخر ${LOG_LIMIT})</span></span><a class="pill" href="/u/${esc(code)}">رجوع</a></div>
${navDrawerHTML(code, csrf, 'notifications', name)}
<div class="nl-wrap">${list || '<div class="nl-empty">لا توجد إشعارات بعد.</div>'}</div>
<script>(function(){var s=0;try{s=Number(localStorage.getItem('nm_log_seen'))||0}catch(e){}
var r=document.querySelectorAll('.nl-row');for(var i=0;i<r.length;i++){if(Number(r[i].getAttribute('data-id'))>s)r[i].classList.add('nl-new')}
try{localStorage.setItem('nm_log_seen',String(${Number(newest) || 0}))}catch(e){}})()</script>
</body></html>`
}

function mount(app, { Player, auth, securityHeaders, CODE_RE, html404, ownerSession, esc, shellHead, navDrawerHTML, NAV_BTN }) {
    const sessionOf = makeSession(Player, auth)

    app.get('/notify/poll', async (req, res) => {
        res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
        try {
            const sess = await sessionOf(req)
            if (!sess) return res.status(401).json({ ok: false })

            const after = Number(req.query.after) || 0
            const now = Date.now()
            const list = (queues.get(sess.u) || []).filter(x => now - x.at < TTL_MS)
            const last = list.length ? list[list.length - 1].id : 0
            res.json({
                ok: true,
                last,
                items: list.filter(x => x.id > after).map(x => ({ id: x.id, t: x.type, i: x.icon, h: x.title, x: x.text }))
            })
        } catch (e) {
            res.status(500).json({ ok: false })
        }
    })

    // 🔴 عدد الإشعارات غير المقروءة من السجل الدائم (آخر معرّف شافه اللاعب يُحفظ بمتصفحه)
    app.get('/notify/unread', async (req, res) => {
        res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
        try {
            const sess = await sessionOf(req)
            if (!sess) return res.status(401).json({ ok: false })
            const M = logModel()
            if (!M) return res.json({ ok: true, n: 0 })
            const after = Number(req.query.after) || 0
            const rows = await M.find({ userId: String(sess.u), nid: { $gt: after } }).select('_id').limit(LOG_LIMIT + 1).lean()
            res.json({ ok: true, n: Math.min(rows.length, LOG_LIMIT + 1) })
        } catch (e) {
            res.status(500).json({ ok: false })
        }
    })

    // 🔔 صفحة سجل الإشعارات /u/:code/notifications (للمالك فقط)
    if (securityHeaders && CODE_RE && shellHead && navDrawerHTML) {
        app.get('/u/:code/notifications', async (req, res) => {
            try {
                securityHeaders(res)
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return html404(res)
                const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion').lean()
                if (!player) return html404(res)
                const sess = ownerSession(req, player)
                if (!sess) return res.redirect(303, `/login?code=${code}`)
                const M = logModel()
                const rows = M ? await M.find({ userId: String(player.userId) }).sort({ nid: -1 }).limit(LOG_LIMIT).lean() : []
                res.send(logPageHTML({
                    code, csrf: auth.csrfForSession(sess), name: player.name || player.username || 'لاعب',
                    rows, newest: rows.length ? rows[0].nid : 0, esc, shellHead, navDrawerHTML, NAV_BTN
                }))
            } catch (err) {
                console.error('notifications page error:', err)
                res.status(500).send('خطأ بالخادم')
            }
        })
    }
}

// سكربت العرض — يُضاف لرأس كل صفحة. يسأل السيرفر كل 6 ثواني (فقط لو اللاعب مسجّل دخول والصفحة ظاهرة)
const HEAD = `<script>(function(){try{
if(window.__nmN)return;window.__nmN=1;
var KEY='nm_notif_last',after=9e15,busy=false,stopped=false,showing=false,q=[],box=null;
try{var sv=localStorage.getItem(KEY);if(sv!==null)after=Number(sv)||0}catch(e){}
function save(){try{localStorage.setItem(KEY,String(after))}catch(e){}}
function init(){
 var s=document.createElement('style');
 s.textContent='#nm-stack{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));left:0;right:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 10px;pointer-events:none}'
 +'.nm-t{pointer-events:auto;cursor:pointer;direction:rtl;display:flex;gap:10px;align-items:flex-start;width:100%;max-width:440px;box-sizing:border-box;background:#151b2e;color:#f1f3f9;border:1.5px solid #e2b64b;border-radius:16px;padding:10px 14px;box-shadow:0 8px 28px rgba(0,0,0,.55);transform:translateY(-130%);opacity:0;transition:transform .4s cubic-bezier(.2,.9,.3,1.15),opacity .3s}'
 +'.nm-t.on{transform:none;opacity:1}.nm-i{font-size:24px;line-height:1.1}.nm-h{font-weight:900;font-size:13.5px;color:#e2b64b}.nm-x{font-size:12.5px;white-space:pre-line;margin-top:2px;line-height:1.5;word-break:break-word}'
 +'.nm-t.nm-world{border-color:#3ea8ff}.nm-t.nm-world .nm-h{color:#3ea8ff}.nm-t.nm-level{border-color:#4fe08a}.nm-t.nm-level .nm-h{color:#4fe08a}'
 +'.nm-t.nm-milestone{border:2px solid #ffd54a;background:linear-gradient(135deg,#2a1f08,#151b2e 60%);box-shadow:0 0 22px rgba(255,213,74,.55),0 8px 28px rgba(0,0,0,.55);animation:nmglow 1.6s ease-in-out infinite alternate}.nm-t.nm-milestone .nm-h{color:#ffd54a;font-size:15px}.nm-t.nm-milestone .nm-i{font-size:32px}'
 +'@keyframes nmglow{from{box-shadow:0 0 12px rgba(255,213,74,.35),0 8px 28px rgba(0,0,0,.55)}to{box-shadow:0 0 30px rgba(255,213,74,.85),0 8px 28px rgba(0,0,0,.55)}}'
 +'@media (prefers-reduced-motion:reduce){.nm-t{transition:none}}';
 document.head.appendChild(s);
 box=document.createElement('div');box.id='nm-stack';box.setAttribute('role','status');box.setAttribute('aria-live','polite');
 document.body.appendChild(box);
}
function show(n){
 var d=document.createElement('div');d.className='nm-t nm-'+(n.t||'dm');
 var i=document.createElement('div');i.className='nm-i';i.textContent=n.i||'🔔';
 var b=document.createElement('div');
 var h=document.createElement('div');h.className='nm-h';h.textContent=n.h||'';
 var x=document.createElement('div');x.className='nm-x';x.textContent=n.x||'';
 b.appendChild(h);if(n.x)b.appendChild(x);d.appendChild(i);d.appendChild(b);box.appendChild(d);
 requestAnimationFrame(function(){requestAnimationFrame(function(){d.className+=' on'})});
 function close(){d.className=d.className.replace(' on','');setTimeout(function(){if(d.parentNode)d.parentNode.removeChild(d)},450)}
 d.addEventListener('click',close);
 setTimeout(close,n.t==='milestone'?12000:Math.min(10000,4500+String(n.x||'').length*35));
}
function run(){if(showing||!q.length||!box)return;showing=true;show(q.shift());setTimeout(function(){showing=false;run()},700)}
function badge(){
 var el=document.getElementById('nv-nb');if(!el||stopped)return;var sn='0';try{sn=localStorage.getItem('nm_log_seen')||'0'}catch(e){}
 fetch('/notify/unread?after='+encodeURIComponent(sn),{credentials:'same-origin',cache:'no-store'})
 .then(function(r){return r.ok?r.json():null})
 .then(function(j){if(!j||!j.ok)return;if(j.n>0){el.textContent='🔴 '+(j.n>30?'30+':j.n);el.hidden=false}else el.hidden=true}).catch(function(){})
}
function poll(){
 if(stopped||busy||document.hidden)return;busy=true;
 fetch('/notify/poll?after='+after,{credentials:'same-origin',cache:'no-store'})
 .then(function(r){if(r.status===401){stopped=true;return null}return r.json()})
 .then(function(j){busy=false;if(!j||!j.ok)return;
   if(j.last<after){after=j.last;save()}
   var its=j.items||[];
   for(var k=0;k<its.length;k++){q.push(its[k]);if(its[k].id>after)after=its[k].id}
   if(its.length){save();run();badge()}
 }).catch(function(){busy=false});
}
function start(){init();poll();badge();setInterval(poll,6000);document.addEventListener('visibilitychange',function(){if(!document.hidden)poll()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
}catch(e){}})()</script>`

module.exports = { push, mount, HEAD }
