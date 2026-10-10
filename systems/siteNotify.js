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
 *   ... داخل registerCharacterSite:         NOTIFY.mount(app, { Player, auth })
 *   ... من أي مكان بالبوت:                  require('./systems/siteNotify').push(userId, { type, icon, title, text })
 */

const TTL_MS = 10 * 60 * 1000
const MAX_PER_USER = 40
const TYPES = new Set(['ach', 'world', 'level', 'milestone', 'dm'])

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

function mount(app, { Player, auth }) {
    app.get('/notify/poll', async (req, res) => {
        res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
        try {
            if (!auth.authEnabled()) return res.status(401).json({ ok: false })
            const sess = auth.readSession(req)
            if (!sess) return res.status(401).json({ ok: false })

            // نفس فحص نسخة الجلسة بباقي الموقع (يتخزن دقيقة لتخفيف الضغط على القاعدة)
            const c = sessCache.get(sess.u)
            let okVer
            if (c && Date.now() - c.at < 60000 && c.v === sess.v) okVer = true
            else {
                const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
                okVer = !!me && (me.sessionVersion || 0) === sess.v
                if (okVer) sessCache.set(sess.u, { v: sess.v, at: Date.now() })
            }
            if (!okVer) return res.status(401).json({ ok: false })

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
function poll(){
 if(stopped||busy||document.hidden)return;busy=true;
 fetch('/notify/poll?after='+after,{credentials:'same-origin',cache:'no-store'})
 .then(function(r){if(r.status===401){stopped=true;return null}return r.json()})
 .then(function(j){busy=false;if(!j||!j.ok)return;
   if(j.last<after){after=j.last;save()}
   var its=j.items||[];
   for(var k=0;k<its.length;k++){q.push(its[k]);if(its[k].id>after)after=its[k].id}
   if(its.length){save();run()}
 }).catch(function(){busy=false});
}
function start(){init();poll();setInterval(poll,6000);document.addEventListener('visibilitychange',function(){if(!document.hidden)poll()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
}catch(e){}})()</script>`

module.exports = { push, mount, HEAD }
