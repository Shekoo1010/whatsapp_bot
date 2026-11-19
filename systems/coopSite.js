// =====================================================================
// systems/coopSite.js
// صفحة الكو اوب + المتجر بالموقع. تُسجَّل من characterSite.js عبر:
//   registerCoopSite(app, ctx)
// الراوتات:
//   GET  /u/:code/coop            الصفحة
//   GET  /coop/state              حالة الكو اوب (استطلاع)
//   POST /coop/join               انضمام
//   POST /coop/team               حفظ فريقي {names:[حتى 3 أسماء]} (فاضي = أقوى 3 تلقائياً)
//   POST /coop/ready              استعداد (يظهر عند 8 لاعبين)
//   POST /coop/attack             هجوم (دورك فقط)
//   GET  /coop/shop               حالة المتجر
//   POST /coop/shop/buy           شراء {id, character?}
// =====================================================================

const CoOp = require('../models/CoOp')
const coopManager = require('./coopManager')
const coopBattle = require('./coopBattle')
const COOP_CSS = require('./coopSiteCss')
const COOP_CLIENT = require('./coopSiteClient')

function registerCoopSite(app, ctx) {

    const {
        Player, auth, jsonBody, esc, securityHeaders, html404, CODE_RE,
        ownerSession, bossSession, safeImageUrl, shell, shop
    } = ctx

    const hits = new Map()
    function rate(userId, max = 40, bucket = 'a') {
        const now = Date.now()
        const key = userId + ':' + bucket
        const arr = (hits.get(key) || []).filter(t => now - t < 60000)
        if (arr.length >= max) { hits.set(key, arr); return false }
        arr.push(now); hits.set(key, arr); return true
    }

    // تنظيف دوري لخريطة الطلبات حتى لا تكبر مع الوقت
    setInterval(() => {
        const now = Date.now()
        for (const [k, arr] of hits) {
            const fresh = arr.filter(t => now - t < 60000)
            if (fresh.length) hits.set(k, fresh); else hits.delete(k)
        }
        for (const [k, c] of coinsCache) {
            if (now - c.t >= 60000) coinsCache.delete(k)
        }
    }, 5 * 60 * 1000).unref()

    // كاش قصير لحالة الكو اوب: كل اللاعبين يستطلعون نفس المستند،
    // فنقرأه مرة واحدة كل ~700ms بدل استعلام لكل لاعب (ويُمسح فور أي تعديل)
    const COOP_CACHE_MS = 700
    let coopCache = null // { t, p }
    function getCoopDoc() {
        const now = Date.now()
        if (coopCache && now - coopCache.t < COOP_CACHE_MS) return coopCache.p
        const p = CoOp.findOne().lean().catch(err => { coopCache = null; throw err })
        coopCache = { t: now, p }
        return p
    }
    const dropCoopCache = () => { coopCache = null }

    // كاش قصير لرصيد العملات: الاستطلاع يسأل عنه لكل لاعب كل ثانية تقريباً وهو نادراً يتغير.
    // يُمسح فور الشراء أو فتح الصفحة/المتجر، وأقصى تأخير بعد جوائز نهاية الريد ~3 ثواني
    const COINS_CACHE_MS = 3000
    const coinsCache = new Map() // userId -> { t, v }
    async function getCoins(userId) {
        const now = Date.now()
        const hit = coinsCache.get(userId)
        if (hit && now - hit.t < COINS_CACHE_MS) return hit.v
        const me = await Player.findOne({ userId }).select('coopCoins').lean()
        const v = (me && me.coopCoins) || 0
        coinsCache.set(userId, { t: now, v })
        return v
    }
    const dropCoins = userId => { coinsCache.delete(userId) }

    // 🎯 فريقي: قائمة خفيفة (اسم + قوة + رتبة، بدون صور) لأقوى نسخة من كل اسم
    const RANKS = ['SSS', 'SSS+', 'SSS++', 'UR I', 'UR II', 'UR III', 'EX', 'Ω']
    const rankOf = c => (Number(c.evolutionLevel) || 0) > 0 ? (RANKS[c.evolutionLevel] || 'Ω') : String(c.rarity || '')
    function teamPayload(player) {
        const best = new Map()
        for (const c of (player && player.characters) || []) {
            const n = String((c && c.name) || '')
            if (!n) continue
            const p = Number(c.power) || 0
            const b = best.get(n)
            if (!b || p > b.p) best.set(n, { n, p, r: rankOf(c) })
        }
        const chars = [...best.values()].sort((a, b) => b.p - a.p)
        const names = (Array.isArray(player && player.coopTeam) ? player.coopTeam : []).filter(n => best.has(n)).slice(0, 3)
        return { names, chars }
    }

    const cleanLog = t => String(t || '').replace(/[*_~`]/g, '').replace(/[╭╰━┃⬣〔〕]/g, '').trim()

    // ───────────── حالة آمنة للمتصفح ─────────────
    async function stateOut(userId) {
        const [coop, coins] = await Promise.all([
            getCoopDoc(),
            getCoins(userId)
        ])
        const base = { coins, readyMin: coopManager.CONFIG.readyMin }

        // status 'finished' = القتال انتهى (بانتظار التنظيف) → نعرضه كمنتهي لا كصالة انتظار
        if (!coop || !coop.active || coop.status === 'finished') {
            const last = coopBattle.getLastResult()
            return {
                ...base, phase: 'idle',
                nextSpawnIn: coop && coop.nextSpawn ? Math.max(0, coop.nextSpawn - Date.now()) : null,
                result: last && Date.now() - last.at < 30 * 60 * 1000 ? {
                    victory: last.victory,
                    boss: { name: last.boss.name, anime: last.boss.anime, rank: last.boss.rank, image: safeImageUrl(last.boss.image) },
                    rows: (last.rows || []).map(r => ({
                        rank: r.rank, name: r.name, damage: r.damage, mine: r.userId === userId, rewards: r.rewards
                    }))
                } : null
            }
        }

        const max = coopManager.CONFIG.maxPlayers[coop.boss.rank] || 15
        const alive = coop.players.filter(p => !p.finished)
        const turnP = coop.status === 'battle' ? alive[coop.currentTurn] : null
        const mine = coop.players.find(p => p.userId === userId)
        const ready = new Set(coop.ready || [])

        return {
            ...base,
            phase: coop.status === 'battle' ? 'battle' : 'waiting',
            round: coop.round,
            max,
            turnEndsIn: coop.status === 'battle' ? Math.max(0, (coop.turnEnd || 0) - Date.now()) : null,
            startsIn: coop.startAt ? Math.max(0, coop.startAt - Date.now()) : null,
            boss: {
                name: coop.boss.name, anime: coop.boss.anime, rank: coop.boss.rank,
                image: safeImageUrl(coop.boss.image),
                hp: coop.boss.hp, maxHp: coop.boss.maxHp, shield: coop.boss.shield || 0,
                phase: coop.boss.phase || 1, rage: !!coop.boss.rage
            },
            players: coop.players.map(p => ({
                id: p.userId === userId ? 'me' : undefined,
                name: p.name, damage: p.totalDamage, finished: !!p.finished,
                ready: ready.has(p.userId), turn: !!turnP && turnP.userId === p.userId,
                cur: p.currentCharacter,
                chars: p.userId === userId || coop.status === 'battle' ? p.characters.map(c => ({
                    name: c.name, power: c.power, hp: c.hp, maxHp: c.maxHp, alive: !!c.alive, img: safeImageUrl(c.image)
                })) : []
            })),
            order: alive.map(p => p.name),
            me: mine ? { joined: true, ready: ready.has(userId), myTurn: !!turnP && turnP.userId === userId } : { joined: false, ready: false, myTurn: false },
            canReady: coop.status === 'waiting' && coop.players.length >= coopManager.CONFIG.readyMin,
            readyCount: ready.size,
            leaderboard: (coop.leaderboard || []).slice(0, 10).map(r => ({ name: r.name, damage: r.damage })),
            log: (coop.battleLog || []).slice(-25).map(cleanLog)
        }
    }

    // ───────────── الصفحة ─────────────
    app.get('/u/:code/coop', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)
            const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion coopTeam characters.name characters.power characters.rarity characters.evolutionLevel').lean()
            if (!player) return html404(res)
            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)
            res.send(coopPageHTML({
                shell, code,
                viewer: { name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) },
                team: teamPayload(player),
                data: await (async () => {
                    dropCoins(player.userId)
                    const [state, shopData] = await Promise.all([stateOut(player.userId), shop.getShop(player.userId)])
                    return { state, shop: shopData }
                })()
            }))
        } catch (err) {
            console.error('coop page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    const guard = (fn, limit = 40, bucket = 'a') => async (req, res) => {
        res.set('Cache-Control', 'no-store')
        const fail = (status, code, message) => res.status(status).json({ ok: false, code, message })
        try {
            if (!auth.authEnabled()) return fail(503, 'DISABLED', 'غير مفعّل حالياً.')
            const sess = await bossSession(req)
            if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
            if (req.method === 'POST') {
                if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')
                if (!auth.verifyCsrf(sess, (req.body || {}).csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها.')
            }
            if (!rate(sess.u, limit, bucket)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر قليلاً.')
            await fn(req, res, sess, fail)
        } catch (err) {
            console.error('coop route error:', err)
            fail(500, 'SERVER', 'خطأ بالخادم')
        }
    }

    // الاستطلاع له حد منفصل أعلى حتى لا يستهلك حد الهجوم والانضمام
    app.get('/coop/state', guard(async (req, res, sess) => {
        res.json({ ok: true, state: await stateOut(sess.u) })
    }, 120, 'state'))

    app.post('/coop/join', jsonBody, guard(async (req, res, sess, fail) => {
        const p = await Player.findOne({ userId: sess.u }).select('name username').lean()
        const r = await coopManager.joinPlayer(sess.u, (p && (p.name || p.username)) || 'لاعب')
        dropCoopCache()
        if (!r.success) return fail(400, 'JOIN', r.message || 'تعذر الانضمام')
        res.json({ ok: true, state: await stateOut(sess.u) })
    }))

    // حفظ الفريق المختار (حتى 3 أسماء من شخصياته). فاضي = رجوع للأقوى 3 تلقائياً. يُطبَّق عند الانضمام القادم.
    app.post('/coop/team', jsonBody, guard(async (req, res, sess, fail) => {
        const raw = (req.body || {}).names
        if (!Array.isArray(raw) || raw.length > 3) return fail(400, 'BAD', 'اختيار غير صحيح.')
        const names = [...new Set(raw.map(x => typeof x === 'string' ? x.slice(0, 80) : ''))].filter(Boolean)
        if (names.length !== raw.length) return fail(400, 'BAD', 'اختيار غير صحيح.')
        if (names.length) {
            const me = await Player.findOne({ userId: sess.u }).select('characters.name').lean()
            const have = new Set(((me && me.characters) || []).map(c => c && c.name))
            if (!names.every(n => have.has(n))) return fail(400, 'NO_CHAR', 'شخصية غير موجودة — حدّث الصفحة.')
        }
        await Player.updateOne({ userId: sess.u }, { $set: { coopTeam: names } })
        res.json({ ok: true, names })
    }, 20, 'team'))

    app.post('/coop/ready', jsonBody, guard(async (req, res, sess, fail) => {
        const r = await coopManager.setReady(sess.u)
        dropCoopCache()
        if (!r.success) return fail(400, 'READY', r.message || 'تعذر الاستعداد')
        res.json({ ok: true, state: await stateOut(sess.u) })
    }))

    app.post('/coop/attack', jsonBody, guard(async (req, res, sess, fail) => {
        const r = await coopBattle.playerAttack(coopManager.getSock(), sess.u)
        dropCoopCache()
        if (!r || !r.success) return fail(400, 'ATTACK', (r && r.message) || 'تعذر الهجوم')
        res.json({ ok: true, hit: { damage: r.damage, critical: !!r.critical }, state: await stateOut(sess.u) })
    }))

    app.get('/coop/shop', guard(async (req, res, sess) => {
        dropCoins(sess.u)
        res.json({ ok: true, shop: await shop.getShop(sess.u), targets: await shop.getShardTargets(sess.u) })
    }))

    app.post('/coop/shop/buy', jsonBody, guard(async (req, res, sess, fail) => {
        const b = req.body || {}
        const r = await shop.buy(sess.u, String(b.id || ''), { character: typeof b.character === 'string' ? b.character.slice(0, 80) : '' })
        dropCoins(sess.u)
        if (!r.ok) return fail(400, r.code, r.message)
        res.json({ ok: true, item: r.item, shop: r.shop })
    }))
}

// 🎯 بطاقة "فريقي" (مستقلة عن coopSiteClient: تُحقن بالصفحة بسكربت صغير خاص فيها)
const TEAM_CSS = `
.ct{margin:0 0 12px;padding:12px;border-radius:16px;background:#0f1422;border:1px solid #232b45}
.ct-h{display:flex;align-items:center;justify-content:space-between;gap:8px;font:800 15px 'Cairo',sans-serif;color:#eef1f8}
.ct-h small{font:600 12px 'Cairo',sans-serif;color:#8891a3}
.ct-s{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}
.ct-sl{min-height:42px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;border-radius:12px;border:1px dashed #2a3350;color:#8891a3;font:700 12px 'Cairo',sans-serif;text-align:center}
.ct-sl.on{border:1.5px solid var(--c,#f0c04a);color:#fff;background:rgba(240,192,74,.06)}
.ct-sl i{font:normal 600 11px 'Oswald',sans-serif;color:var(--c,#f0c04a);direction:ltr}
.ct-b{width:100%;padding:10px;border-radius:12px;border:1px solid #f0c04a;background:transparent;color:#f0c04a;font:800 14px 'Cairo',sans-serif;cursor:pointer}
.ct-b.gold{background:#f0c04a;color:#0a0d16}
.ct-b.ghost{border-color:#2a3350;color:#8891a3}
.ct-b:disabled{opacity:.5}
.ct-p{margin-top:10px}
.ct-q{width:100%;padding:10px 12px;margin-bottom:8px;border-radius:12px;border:1px solid #232b45;background:#0a0d16;color:#eef1f8;font:600 14px 'Cairo',sans-serif;direction:rtl}
.ct-l{max-height:46vh;overflow-y:auto;display:grid;gap:6px;margin-bottom:10px}
.ct-r{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:12px;border:1.5px solid #232b45;background:#0a0d16;color:#eef1f8;font:700 14px 'Cairo',sans-serif;cursor:pointer;text-align:start}
.ct-r.on{border-color:var(--c,#f0c04a);background:rgba(240,192,74,.08)}
.ct-r span:first-child{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;text-align:right}
.ct-r em{font:normal 600 11px 'Oswald',sans-serif;color:#0a0d16;background:var(--c,#8891a3);border-radius:10px;padding:1px 8px;direction:ltr}
.ct-r b{font:500 12px 'Oswald',sans-serif;color:#8891a3;direction:ltr}
.ct-n{margin-top:8px;font:600 12px/1.7 'Cairo',sans-serif;color:#8891a3;text-align:center}
.ct-t{position:fixed;left:50%;bottom:calc(26px + env(safe-area-inset-bottom,0px));transform:translate(-50%,30px);opacity:0;pointer-events:none;background:#151b2e;border:1px solid #f0c04a;border-radius:14px;padding:11px 16px;font:700 14px 'Cairo',sans-serif;color:#eef1f8;transition:.3s;z-index:99;max-width:92%;text-align:center}
.ct-t.on{transform:translate(-50%,0);opacity:1}
.ct-t.bad{border-color:#ff6b6b;color:#ff9aa6}
.ct-t.good{border-color:#4fe08a}
`

function teamBlockHTML(shell, team, csrf) {
    return `<div class="ct" id="ct"><div class="ct-h"><span>🎯 فريقي بالكو اوب</span><small id="ct-st"></small></div>
  <div class="ct-s" id="ct-s"></div>
  <button class="ct-b" id="ct-open" type="button">تغيير الفريق</button>
  <div class="ct-p" id="ct-p" hidden>
    <input class="ct-q" id="ct-q" type="search" placeholder="ابحث باسم الشخصية…" autocomplete="off">
    <div class="ct-l" id="ct-l"></div>
    <button class="ct-b gold" id="ct-save" type="button">💾 حفظ الفريق</button>
    <button class="ct-b ghost" id="ct-auto" type="button" style="margin-top:8px">↺ تلقائي (أقوى 3)</button>
  </div>
  <div class="ct-n">يُطبَّق عند انضمامك للريد القادم · لو ما اخترت يدخل بأقوى 3</div>
</div>
<div class="ct-t" id="ct-t"></div>
<script>
(function(){
  var T=${shell.jsonForScript(team)}, CSRF=${shell.jsonForScript(csrf)};
  var COL={'SSS':'#ff3860','SSS+':'#ff6b3d','SSS++':'#ff2f92','UR I':'#b83fff','UR II':'#7c4dff','UR III':'#4d7cff','EX':'#00e5ff','Ω':'#ffc933','اسطوري':'#f0c04a','ممتاز':'#3ea8ff','عادي':'#8b93a1'};
  var by={}, i; for(i=0;i<T.chars.length;i++) by[T.chars[i].n]=T.chars[i];
  var saved=T.names.slice(), sel=saved.slice(), tt=0, busy=false;
  function $(id){ return document.getElementById(id); }
  function col(r){ return COL[r]||'#8891a3'; }
  function toast(m,k){ var t=$('ct-t'); t.textContent=m; t.className='ct-t on '+(k||''); clearTimeout(tt); tt=setTimeout(function(){ t.className='ct-t'; },2400); }
  function slots(){
    var h='', j, c;
    for(j=0;j<3;j++){
      c=by[sel[j]];
      h+= c ? '<div class="ct-sl on" style="--c:'+col(c.r)+'"><span dir="ltr">'+esc(c.n)+'</span><i>'+esc(c.r)+' · '+Number(c.p).toLocaleString('en-US')+'</i></div>' : '<div class="ct-sl">—</div>';
    }
    $('ct-s').innerHTML=h;
    $('ct-st').textContent= saved.length ? 'مخصّص ('+saved.length+'/3)' : 'تلقائي — أقوى 3';
  }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function list(){
    var q=$('ct-q').value.trim().toLowerCase(), h='', n=0, k, c;
    for(k=0;k<T.chars.length && n<60;k++){
      c=T.chars[k];
      if(q && c.n.toLowerCase().indexOf(q)<0 && c.r.toLowerCase().indexOf(q)<0) continue;
      n++;
      h+='<button type="button" class="ct-r'+(sel.indexOf(c.n)>-1?' on':'')+'" data-n="'+esc(c.n)+'" style="--c:'+col(c.r)+'"><span>'+esc(c.n)+'</span><em>'+esc(c.r)+'</em><b>'+Number(c.p).toLocaleString('en-US')+'</b></button>';
    }
    $('ct-l').innerHTML=h||'<div class="ct-n">لا نتائج</div>';
  }
  function post(names){
    if(busy) return; busy=true;
    fetch('/coop/team',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:CSRF,names:names})})
      .then(function(r){ return r.json().catch(function(){ return {ok:false,message:'تعذّر الاتصال بالخادم'}; }); })
      .then(function(j){
        busy=false;
        if(j&&j.ok){ saved=j.names.slice(); sel=saved.slice(); slots(); $('ct-p').hidden=true; $('ct-open').hidden=false; toast(saved.length?'✅ تم حفظ فريقك':'✅ رجعت لأقوى 3 تلقائياً','good'); }
        else toast('❌ '+((j&&j.message)||'حدث خطأ، حاول مرة أخرى'),'bad');
      })
      .catch(function(){ busy=false; toast('❌ تعذّر الاتصال بالخادم','bad'); });
  }
  $('ct-open').addEventListener('click',function(){ sel=saved.slice(); $('ct-p').hidden=false; this.hidden=true; list(); slots(); });
  $('ct-q').addEventListener('input',list);
  $('ct-l').addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.ct-r'); if(!b) return;
    var n=b.getAttribute('data-n'), p=sel.indexOf(n);
    if(p>-1) sel.splice(p,1);
    else if(sel.length>=3){ toast('❌ الحد الأقصى 3 شخصيات — شيل وحدة أولاً','bad'); return; }
    else sel.push(n);
    b.classList.toggle('on',p<0); slots();
  });
  $('ct-save').addEventListener('click',function(){ post(sel.slice()); });
  $('ct-auto').addEventListener('click',function(){ post([]); });
  slots();
})();
</script>`
}

function coopPageHTML({ shell, viewer, code, data, team }) {
    const js = COOP_CLIENT
        .replace('__CODE__', () => shell.jsonForScript(code))
        .replace('__CSRF__', () => shell.jsonForScript(viewer.csrf))
        .replace('__DATA__', () => shell.jsonForScript(data))
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
${shell.head}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>الكو اوب</title>
<meta name="theme-color" content="#0a0d16">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;800&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet">
<style>${COOP_CSS}${TEAM_CSS}</style>
</head>
<body>
<div class="wrap">
  <div class="topbar">${shell.navBtn}<span class="ttl">CO-OP RAID</span></div>
  ${shell.navDrawer(code, viewer.csrf, 'coop', viewer.name)}
  <div class="tabs"><button type="button" id="tr" class="on">⚔ الريد</button><button type="button" id="ts">🪙 المتجر</button></div>
  <div class="msg" id="msg"></div>
  ${teamBlockHTML(shell, team || { names: [], chars: [] }, viewer.csrf)}
  <section id="view"></section>
  <section id="shop" hidden><div class="coins" id="coinsv"></div><div id="shopv"></div></section>
</div>
<script>${js}</script>
</body>
</html>`
}

module.exports = { registerCoopSite, coopPageHTML }
