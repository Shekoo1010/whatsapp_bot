// 🪪 صفحة «آيديات اللاعبين» بالموقع — systems/siteIds.js
// بديل أمر .ايديات_اللاعبين بالواتس (كان يرسل الكل برسالة وحدة وثقيل).
// تعرض فقط من سجّل يوزر بالبوت.
// الصفحة: رقم الواتس + اسم الواتس + يوزر البوت + صورة البروفايل، بصفحات (15 لكل صفحة).
//
// الاستخدام:
//   const siteIds = require('./systems/siteIds').createSiteIds({ Player })
//   registerCharacterSite(app, Player, { idsPage: siteIds, ... })
//
// المسارات:
//   GET /u/:code/ids                 → الصفحة
//   GET /u/:code/ids/api/list        → ?page=&q=&sort=name|user|num  (JSON)

// 🔒 اجعلها false لإخفاء وسط الأرقام (مثال: 96655•••12) لو بغيت تحمي خصوصية اللاعبين
const SHOW_FULL_NUMBERS = true
const PER_PAGE = 15
const CACHE_MS = 60 * 1000 // القائمة الخفيفة (بدون الشخصيات) تُحمَّل مرة بالدقيقة كحد أقصى

function createSiteIds({ Player, avatarOf }) {

    let avatarFn = typeof avatarOf === 'function' ? avatarOf : null
    let cache = null   // { at, list }
    let loading = null

    // الرقم الحقيقي: phoneJid لو اللاعب مخفي بـ @lid، وإلا userId نفسه إذا كان @s.whatsapp.net
    function numberOf(r) {
        const j = String(r.phoneJid || r.userId || '')
        if (!/@s\.whatsapp\.net$/.test(j)) return ''
        return j.split('@')[0].split(':')[0].replace(/\D/g, '')
    }

    function showNum(n) {
        if (!n) return ''
        if (SHOW_FULL_NUMBERS || n.length < 8) return '+' + n
        return '+' + n.slice(0, 5) + '•••' + n.slice(-2)
    }

    async function allPlayers() {
        if (cache && Date.now() - cache.at < CACHE_MS) return cache.list
        if (loading) return loading
        loading = (async () => {
            // فقط اللاعبين اللي سجّلوا يوزر بالبوت
            const rows = await Player.find({ username: { $type: 'string', $ne: '' } }).select({ userId: 1, name: 1, username: 1, phoneJid: 1 }).lean()
            const list = rows.filter(r => r.userId && String(r.username || '').trim()).map(r => ({
                id: r.userId,
                name: String(r.name || '').trim() || 'بدون اسم',
                username: r.username ? String(r.username) : '',
                num: numberOf(r)
            }))
            cache = { at: Date.now(), list }
            return list
        })()
        try { return await loading } finally { loading = null }
    }

    async function list({ page, q, sort }) {
        const all = await allPlayers()
        const qs = String(q || '').trim().toLowerCase().replace(/^@/, '').slice(0, 40)
        const digits = qs.replace(/\D/g, '')

        let L = all
        if (qs) {
            L = all.filter(p =>
                p.name.toLowerCase().includes(qs) ||
                (p.username && p.username.toLowerCase().includes(qs)) ||
                (digits.length >= 3 && p.num && p.num.includes(digits))
            )
        }

        const L2 = L.slice()
        if (sort === 'user') {
            L2.sort((a, b) => (!a.username - !b.username) || a.username.localeCompare(b.username))
        } else if (sort === 'num') {
            L2.sort((a, b) => (!a.num - !b.num) || a.num.localeCompare(b.num))
        } else {
            L2.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
        }

        const pages = Math.max(1, Math.ceil(L2.length / PER_PAGE))
        const pg = Math.min(Math.max(1, parseInt(page, 10) || 1), pages)
        const slice = L2.slice((pg - 1) * PER_PAGE, pg * PER_PAGE)

        // صور البروفايل لأصحاب هذي الصفحة فقط (أول شخصية — بدون تحميل كل الشخصيات)
        const imgs = {}
        try {
            if (slice.length && avatarFn) {
                const docs = await Player.find({ userId: { $in: slice.map(p => p.id) } })
                    .select({ userId: 1, characters: { $slice: 1 } }).lean()
                for (const d of docs) imgs[d.userId] = avatarFn(d) || null
            }
        } catch (e) { /* الصور اختيارية */ }

        return {
            ok: true,
            total: all.length,
            found: L2.length,
            page: pg,
            pages,
            perPage: PER_PAGE,
            items: slice.map((p, i) => ({
                n: (pg - 1) * PER_PAGE + i + 1,
                name: p.name,
                username: p.username,
                phone: showNum(p.num),
                img: imgs[p.id] || null
            }))
        }
    }

    function page({ apiBase, backUrl } = {}) {
        return PAGE_HTML
            .replace('__API_BASE__', () => JSON.stringify(String(apiBase || '')))
            .replace('__BACK_URL__', () => JSON.stringify(String(backUrl || '')))
    }

    function mount(app, h) {
        const { auth, securityHeaders, CODE_RE, html404, ownerSession } = h
        if (typeof h.avatarOf === 'function') avatarFn = h.avatarOf

        const hits = new Map()
        function rate(userId, max = 90) {
            const now = Date.now()
            const arr = (hits.get(userId) || []).filter(t => now - t < 60000)
            if (arr.length >= max) { hits.set(userId, arr); return false }
            arr.push(now); hits.set(userId, arr)
            if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > 60000) hits.delete(k)
            return true
        }

        async function sessionFor(req, code) {
            if (!CODE_RE.test(code)) return null
            const player = await Player.findOne({ siteCode: code }).select('userId sessionVersion').lean()
            if (!player) return null
            const sess = auth.readSession(req)
            if (!sess || sess.u !== player.userId || (sess.v || 0) !== (player.sessionVersion || 0)) return null
            return sess
        }

        app.get('/u/:code/ids', async (req, res) => {
            try {
                securityHeaders(res)
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return html404(res)
                const player = await Player.findOne({ siteCode: code }).select('userId sessionVersion').lean()
                if (!player) return html404(res)
                const sess = ownerSession(req, player)
                if (!sess) return res.redirect(303, `/login?code=${code}`)
                res.send(page({ apiBase: `/u/${code}/ids/api`, backUrl: `/u/${code}` }))
            } catch (err) {
                console.error('site ids page error:', err)
                res.status(500).send('خطأ بالخادم')
            }
        })

        app.get('/u/:code/ids/api/list', async (req, res) => {
            res.set('Cache-Control', 'no-store')
            try {
                const sess = await sessionFor(req, String(req.params.code || ''))
                if (!sess) return res.status(401).json({ ok: false, message: 'انتهت الجلسة — سجّل الدخول من جديد.' })
                if (!rate(sess.u)) return res.status(429).json({ ok: false, message: 'طلبات كثيرة، انتظر دقيقة.' })
                res.json(await list({ page: req.query.page, q: req.query.q, sort: String(req.query.sort || 'name') }))
            } catch (err) {
                console.error('site ids list error:', err)
                res.status(500).json({ ok: false, message: 'خطأ بالخادم' })
            }
        })
    }

    return { list, page, mount }
}

const PAGE_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0a0816">
<title>آيديات اللاعبين</title>
<style>
:root{color-scheme:dark;--bg:#0a0816;--card:#1a1535;--line:#3a2f6b;--gold:#f5c14b;--gold2:#ffe39a;--text:#f3eefc;--mut:#a89fcf;--cyan:#4de2ff;--green:#4ade80;--red:#ff5d6c}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;background:radial-gradient(60% 40% at 50% 0,#1d1442,var(--bg)) fixed;color:var(--text);font-family:"Segoe UI",Tahoma,system-ui,sans-serif;overflow-x:hidden}
body{padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)}
.wrap{max-width:620px;margin:0 auto;padding:14px 12px 70px}
.back{display:inline-block;color:var(--gold2);text-decoration:none;font-size:14px;border:1px solid var(--line);padding:7px 12px;border-radius:12px;background:rgba(26,21,53,.7)}
h1{margin:10px 0 2px;text-align:center;font-size:24px;background:linear-gradient(90deg,var(--gold),#fff1c4,var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{text-align:center;color:var(--mut);font-size:13px;margin-bottom:12px}
.stat{display:flex;gap:8px;margin-bottom:10px}
.stat div{flex:1;text-align:center;border-radius:12px;border:1px solid var(--line);background:#120d2b;padding:8px;font-size:12px;color:var(--mut)}
.stat b{display:block;font-size:20px;color:var(--gold);font-variant-numeric:tabular-nums}
.bar{display:flex;gap:8px;margin-bottom:10px}
.search{flex:1;min-width:0;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:#0f0b22;color:var(--text);font:inherit;font-size:15px;outline:none}
.search:focus{border-color:var(--gold)}
.sort{padding:0 10px;border-radius:14px;border:1px solid var(--line);background:#120d2b;color:var(--gold2);font:inherit;font-size:13px}
#list{transition:opacity .15s}#list.ld{opacity:.45}
.p{display:flex;align-items:center;gap:12px;padding:10px 12px;margin:8px 0;border-radius:16px;background:linear-gradient(160deg,#1d1740,#120d2b);border:1px solid var(--line)}
.n{width:28px;text-align:center;font-weight:900;color:var(--mut);font-size:13px;font-variant-numeric:tabular-nums}
.av{flex:none;width:52px;height:52px;border-radius:50%;border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#1a1200;overflow:hidden}
.av img{width:100%;height:100%;object-fit:cover}
.in{flex:1;min-width:0}
.in b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.in .u{color:var(--cyan);font-size:12.5px;direction:ltr;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.in .ph{color:var(--mut);font-size:12.5px;direction:ltr;text-align:right;font-variant-numeric:tabular-nums}
.cp{flex:none;width:38px;height:38px;border-radius:12px;border:1px solid var(--line);background:#120d2b;color:var(--gold2);font-size:16px;cursor:pointer}
.cp:active{transform:scale(.92)}.cp.ok{color:var(--green);border-color:var(--green)}
.pg{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px}
.pgb{flex:1;max-width:120px;padding:10px 8px;border-radius:12px;border:1px solid var(--line);background:#120d2b;color:var(--gold2);font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.pgb:disabled{opacity:.35;cursor:default}
.pgi{font-size:13px;color:var(--mut);min-width:78px;text-align:center}
.empty{text-align:center;color:var(--mut);padding:18px}
</style>
</head>
<body>
<div class="wrap">
  <a class="back" id="back" href="#">‹ رجوع</a>
  <h1>🪪 آيديات اللاعبين</h1>
  <div class="sub">الاسم بالواتس • اليوزر بالبوت • الرقم</div>
  <div class="stat"><div><b id="cAll">0</b>اللاعبين المسجّلين</div><div><b id="cRes">0</b>نتيجة البحث</div></div>
  <div class="bar">
    <input class="search" id="q" placeholder="🔎 ابحث بالاسم أو اليوزر أو الرقم..." autocomplete="off">
    <select class="sort" id="sort"><option value="name">الاسم أ-ي</option><option value="user">اليوزر</option><option value="num">الرقم</option></select>
  </div>
  <div id="list"></div><div id="pg"></div>
</div>
<script>
(function(){
  var API=__API_BASE__,BACK=__BACK_URL__;
  function $(id){return document.getElementById(id)}
  function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e}
  if(BACK){$('back').href=BACK}else{$('back').style.display='none'}
  var colors=['#f5c14b','#4de2ff','#ff5fa2','#a78bfa','#4ade80'],page=1,seq=0,timer=0;

  function avatar(p,i){
    var a=el('div','av');a.style.background=colors[i%5];
    var first=(p.name||'?').charAt(0);
    if(p.img){var im=document.createElement('img');im.src=p.img;im.alt='';im.loading='lazy';im.referrerPolicy='no-referrer';
      im.onerror=function(){im.remove();a.textContent=first};a.appendChild(im)}
    else a.textContent=first;
    return a;
  }
  function pager(host,pg,pages,go){
    host.textContent='';if(pages<=1)return;
    var w=el('div','pg'),pv=el('button','pgb','→ السابق'),nx=el('button','pgb','التالي ←');
    pv.type='button';nx.type='button';pv.disabled=pg<=1;nx.disabled=pg>=pages;
    pv.onclick=function(){go(pg-1)};nx.onclick=function(){go(pg+1)};
    w.appendChild(pv);w.appendChild(el('span','pgi','صفحة '+pg+' / '+pages));w.appendChild(nx);host.appendChild(w);
  }
  function draw(d){
    $('cAll').textContent=d.total;$('cRes').textContent=d.found;
    var box=$('list');box.textContent='';
    d.items.forEach(function(p,i){
      var row=el('div','p');row.appendChild(el('div','n',String(p.n)));row.appendChild(avatar(p,i));
      var inf=el('div','in');inf.appendChild(el('b','',p.name));
      inf.appendChild(el('div','u',p.username?'@'+p.username:'— بدون يوزر'));
      inf.appendChild(el('div','ph',p.phone||'الرقم غير متاح'));row.appendChild(inf);
      if(p.phone){
        var cp=el('button','cp','📋');cp.type='button';cp.title='نسخ الرقم';
        cp.onclick=function(){
          function done(){cp.textContent='✓';cp.classList.add('ok');setTimeout(function(){cp.textContent='📋';cp.classList.remove('ok')},1200)}
          if(navigator.clipboard)navigator.clipboard.writeText(p.phone).then(done,function(){});else done();
        };
        row.appendChild(cp);
      }
      box.appendChild(row);
    });
    if(!d.items.length)box.appendChild(el('div','empty','ما لقيت نتائج 🔎'));
    page=d.page;
    pager($('pg'),d.page,d.pages,function(p){page=p;load(true)});
  }
  function load(scroll){
    var my=++seq;$('list').classList.add('ld');
    var url=API+'/list?page='+page+'&sort='+encodeURIComponent($('sort').value)+'&q='+encodeURIComponent($('q').value.trim());
    fetch(url,{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.json()}).then(function(d){
      if(my!==seq)return;$('list').classList.remove('ld');
      if(!d.ok){$('list').textContent='';$('list').appendChild(el('div','empty',d.message||'تعذّر التحميل'));return}
      draw(d);if(scroll)scrollTo(0,0);
    }).catch(function(){if(my!==seq)return;$('list').classList.remove('ld');$('list').textContent='';$('list').appendChild(el('div','empty','تعذّر الاتصال، حاول مرة ثانية'))});
  }
  $('q').oninput=function(){clearTimeout(timer);timer=setTimeout(function(){page=1;load()},350)};
  $('sort').onchange=function(){page=1;load()};
  load();
})();
</script>
</body>
</html>`

module.exports = { createSiteIds }
