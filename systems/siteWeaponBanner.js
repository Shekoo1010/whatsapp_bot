// =====================================================================
// systems/siteWeaponBanner.js
// ⚔️ بنر الأسلحة من الموقع — نفس منطق أمر .سحب_سلاح بالضبط (index.js)
//  - نفس الرصيد: weaponPulls (10 يومياً، تتجدد 12:00 ص بتوقيت السعودية من index.js)
//  - نفس عداد الضمان: weaponPity (يتصفّر عند الفوز، سقفه WEAPON_PITY_CAP)
//  - نفس القفل weaponPullLocks (واتساب + موقع ما يتداخلان) ونفس الخصم الذري
//  - نفس إضافة السلاح لـ weaponsInventory ونفس XP الأمر
//  - الصفحة: /u/:code/weapons    السحب: POST /weapons/pull
// الصور: من حقل image في weapons.js (روابط https فقط)، وحقل accent اختياري للون الإطار
// =====================================================================

const WEAPON_STAT_LABELS = {
    attack: '⚔️ هجوم', attackPercent: '⚔️ هجوم %',
    hp: '❤️ HP', hpPercent: '❤️ HP %',
    defense: '🛡️ دفاع',
    critRate: '🎯 نسبة الحرج', critDamage: '💥 ضرر الحرج',
    dodge: '👻 مراوغة', accuracy: '🎯 دقة',
    lifesteal: '🩸 امتصاص حياة', reflect: '🪞 انعكاس ضرر',
    bossDamage: '👹 ضرر الزعماء'
}

const TYPE_ACCENT = {
    Broadblade: '#ff8a5f', Sword: '#5fe0b4', Rectifier: '#8fb4ff',
    Gauntlet: '#ffcf5a', Pistol: '#c08cff'
}

const ERRORS = {
    BUSY: '⏳ انتظر حتى تنتهي عملية سحب السلاح السابقة.',
    NO_PLAYER: 'حسابك غير موجود.',
    BANNED: '🚫 حسابك محظور من استخدام البوت.',
    NO_PULLS: '❌ انتهت سحبات الأسلحة اليوم\n⏳ تتجدد الساعة 12:00 صباحاً بتوقيت السعودية',
    SERVER: '❌ صار خطأ بالخادم أثناء السحب — حدّث الصفحة وتأكد من رصيدك قبل إعادة المحاولة.'
}

function jsonForScript(o) {
    return JSON.stringify(o)
        .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

// روابط https فقط (الأقواس/الفاصلة العليا تُشفَّر عشان ما تكسر الصفحة)
function safeImg(u) {
    if (typeof u !== 'string') return ''
    u = u.trim()
    if (!/^https:\/\//i.test(u)) return ''
    u = u.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/'/g, '%27')
    return /['"()\s\\<>]/.test(u) ? '' : u
}

function createSiteWeaponBanner({
    Player, weaponsList, weaponPullLocks,
    dailyPulls, pityCap, successChance,
    addCommandXp, commandXp, isBanned
}) {

    const hits = new Map()
    function rate(userId) {
        const now = Date.now()
        const arr = (hits.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 30) { hits.set(userId, arr); return false }
        arr.push(now); hits.set(userId, arr); return true
    }

    function getRandomWeapon() {
        return weaponsList[Math.floor(Math.random() * weaponsList.length)]
    }

    // شكل آمن للمتصفح
    function publicWeapon(w) {
        const accent = /^#[0-9a-f]{6}$/i.test(w.accent || '') ? w.accent : (TYPE_ACCENT[w.type] || '#5fb0ff')
        return {
            id: String(w.id),
            name: String(w.name),
            type: String(w.type),
            rarity: Number(w.rarity) || 5,
            atk: Number(w.baseAtk) || 0,
            stat: WEAPON_STAT_LABELS[w.subStatType] || String(w.subStatType),
            val: Number(w.subStatValue) || 0,
            img: safeImg(w.image),
            c: accent
        }
    }

    // 🎯 نفس .سحب_سلاح بالضبط
    async function pullWeapon({ userId }) {
        if (typeof isBanned === 'function' && isBanned(userId)) return { ok: false, code: 'BANNED' }

        if (weaponPullLocks.has(userId)) return { ok: false, code: 'BUSY' }
        weaponPullLocks.add(userId)
        const lockTimeout = setTimeout(() => weaponPullLocks.delete(userId), 20000)

        try {
            const player = await Player.findOne({ userId })
            if (!player) return { ok: false, code: 'NO_PLAYER' }

            player.weaponsInventory = player.weaponsInventory || []
            if (player.weaponPulls === undefined || player.weaponPulls === null) {
                player.weaponPulls = dailyPulls
            }
            player.weaponPity = player.weaponPity || 0

            if (player.weaponPulls <= 0) {
                return { ok: false, code: 'NO_PULLS', state: { pulls: 0, pity: player.weaponPity } }
            }

            // 🔒 خصم ذري بقاعدة البيانات (نفس الأمر)
            await Player.updateOne(
                { userId, $or: [{ weaponPulls: { $exists: false } }, { weaponPulls: null }] },
                { $set: { weaponPulls: dailyPulls } },
                { strict: false }
            )
            const claim = await Player.findOneAndUpdate(
                { userId, weaponPulls: { $gt: 0 } },
                { $inc: { weaponPulls: -1 } },
                { new: true, strict: false }
            )
            if (!claim) {
                return { ok: false, code: 'NO_PULLS', state: { pulls: 0, pity: player.weaponPity } }
            }

            player.weaponPulls = claim.weaponPulls
            player.unmarkModified('weaponPulls')

            const guaranteed = player.weaponPity >= pityCap
            const won = guaranteed || (Math.random() * 100 < successChance)

            let resultWeapon = null
            if (won) {
                resultWeapon = getRandomWeapon()
                player.weaponsInventory.push({
                    instanceId: `${Date.now()}_${Math.floor(Math.random() * 100000)}`,
                    id: resultWeapon.id,
                    name: resultWeapon.name,
                    type: resultWeapon.type,
                    rarity: resultWeapon.rarity,
                    baseAtk: resultWeapon.baseAtk,
                    subStatType: resultWeapon.subStatType,
                    subStatValue: resultWeapon.subStatValue,
                    image: resultWeapon.image || '',
                    equippedTo: null
                })
                player.weaponPity = 0
            } else {
                player.weaponPity = (player.weaponPity || 0) + 1
            }

            player.markModified('weaponsInventory')
            addCommandXp(player, commandXp)
            await player.save()

            return {
                ok: true,
                won,
                guaranteed: won && guaranteed,
                weapon: resultWeapon ? publicWeapon(resultWeapon) : null,
                state: { pulls: player.weaponPulls, pity: player.weaponPity }
            }
        } catch (err) {
            console.error('site weapon pull error:', err)
            return { ok: false, code: 'SERVER' }
        } finally {
            clearTimeout(lockTimeout)
            weaponPullLocks.delete(userId)
        }
    }

    function pageHTML({ h, viewer, code, data }) {
        const { esc, NAV_BTN, navDrawerHTML, shellHead } = h
        return `${shellHead('بنر الأسلحة')}
<style>
.wb{--wacc:#5fb0ff;--wgold:#ffd873;max-width:480px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
#wb-bgs .wb-bg{position:fixed;inset:-40px;z-index:-1;background-size:cover;background-position:center;filter:blur(30px) brightness(.38) saturate(1.3);opacity:0;transition:opacity 1.2s}
#wb-bgs .wb-bg.on{opacity:1}
.wb-hd{display:flex;justify-content:space-between;align-items:center;gap:10px}
.wb-hd h1{font:900 26px 'Cairo',sans-serif;margin:0}
.wb-sub{color:var(--text-dim);font-size:13px;margin-top:2px}
.wb-pill{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:99px;padding:6px 13px;font-size:13px;font-weight:800;white-space:nowrap}
.wb-stage{position:relative;width:min(100%,calc((100svh - 400px)*.667));min-width:250px;aspect-ratio:2/3;margin:0 auto;border-radius:20px;overflow:hidden;border:1.5px solid var(--wacc);box-shadow:0 0 44px -8px var(--wacc),0 24px 40px -22px #000;transition:border-color .9s,box-shadow .9s;background:#000}
.wb-slide{position:absolute;inset:0;margin:0;opacity:0;transition:opacity 1s}
.wb-slide.on{opacity:1}
.wb-slide img{width:100%;height:100%;object-fit:cover;display:block}
.wb-slide.on img{animation:wbkb 9s ease-out forwards}
@keyframes wbkb{from{transform:scale(1.02)}to{transform:scale(1.12) translateY(-1.5%)}}
.wb-info{text-align:center}
.wb-info h2{font:900 23px 'Cairo',sans-serif;margin:0 0 8px}
.wb-chips{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.wb-chip{padding:5px 11px;border-radius:8px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);font-size:13px}
.wb-chip b{color:var(--wacc);font-weight:800}
.wb-stars{color:var(--wgold);letter-spacing:3px}
.wb-th{display:flex;gap:8px;overflow-x:auto;padding:6px 2px;scrollbar-width:none}
.wb-th::-webkit-scrollbar{display:none}
.wb-th button{flex:0 0 auto;width:46px;height:62px;padding:0;border-radius:8px;border:2px solid transparent;overflow:hidden;opacity:.5;background:none;cursor:pointer;transition:.3s}
.wb-th button.on{opacity:1;border-color:var(--wacc);transform:translateY(-3px)}
.wb-th img{width:100%;height:100%;object-fit:cover;display:block}
.wb-tph{display:flex;width:100%;height:100%;align-items:center;justify-content:center;font:900 20px 'Cairo',sans-serif;background:color-mix(in srgb,var(--pc) 40%,#0a0d18)}
.wb-note{text-align:center;color:var(--text-dim);font-size:12px;margin-top:-6px}
.wb-pity{font-size:13px}
.wb-prow{display:flex;justify-content:space-between;margin-bottom:6px;color:var(--text-dim)}
.wb-track{height:8px;border-radius:9px;background:rgba(255,255,255,.1);overflow:hidden}
.wb-fill{height:100%;width:0;border-radius:9px;background:linear-gradient(90deg,var(--wacc),var(--wgold));transition:width .6s}
#wb-pull{height:60px;border:0;border-radius:14px;font:900 19px 'Cairo',sans-serif;background:var(--wacc);color:#050814;box-shadow:0 0 30px -6px var(--wacc);cursor:pointer;transition:transform .15s,background .9s}
#wb-pull:active{transform:scale(.97)}
#wb-pull:disabled{opacity:.4;cursor:default;box-shadow:none}
.wb button:focus-visible,#wb-fx button:focus-visible{outline:2px solid #fff;outline-offset:2px}
.wb-hint{text-align:center;color:var(--text-dim);font-size:12px;margin-top:-6px}
.wb-err{white-space:pre-wrap;text-align:center;background:#2a1220;border:1px solid #ff6b86;color:#ffb3c1;border-radius:12px;padding:10px 12px;font-size:14px}
.wb-ph{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:18px;background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--pc) 45%,#000),#05070f 78%)}
.wb-pt{color:var(--pc);font-size:14px}.wb-pn{font:900 26px 'Cairo',sans-serif}.wb-ps{color:var(--wgold);letter-spacing:3px}
#wb-fx{position:fixed;inset:0;z-index:70;display:none;background:#02030a;overflow:hidden;--c:#7fb4ff}
#wb-fx canvas{position:absolute;inset:0}
.wb-orb{position:absolute;left:50%;top:45%;width:30px;height:30px;margin:-15px;border-radius:50%;background:radial-gradient(circle,#fff,var(--c) 55%,transparent 70%)}
.wb-orb.go{animation:wborb 2.4s ease-in forwards}
@keyframes wborb{to{transform:scale(14)}}
.wb-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:4}
.wb-flash.go{animation:wbfl .8s ease-out}
@keyframes wbfl{0%{opacity:1}100%{opacity:0}}
#wb-skip{position:absolute;top:calc(env(safe-area-inset-top,0px) + 14px);left:14px;z-index:5;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:99px;padding:6px 14px;font:inherit;font-size:13px;cursor:pointer}
.wb-rev,.wb-miss{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:11px;text-align:center;padding:20px;z-index:3}
.wb-rays{position:absolute;left:50%;top:46%;width:170vmax;height:170vmax;margin:-85vmax 0 0 -85vmax;background:repeating-conic-gradient(rgba(255,216,115,0) 0 9deg,rgba(255,216,115,.2) 9deg 13deg);-webkit-mask-image:radial-gradient(circle,#000 5%,transparent 45%);mask-image:radial-gradient(circle,#000 5%,transparent 45%);animation:wbspin 22s linear infinite;z-index:-1}
@keyframes wbspin{to{transform:rotate(360deg)}}
.wb-rstars{display:flex;gap:6px;font-size:32px;color:var(--wgold);direction:ltr}
.wb-rstars span{display:inline-block;animation:wbsp .55s cubic-bezier(.2,1.6,.4,1) both;text-shadow:0 0 18px var(--wgold)}
@keyframes wbsp{from{transform:scale(0) rotate(-140deg);opacity:0}to{transform:none;opacity:1}}
.wb-rcard{width:min(60vw,280px);aspect-ratio:2/3;border-radius:16px;overflow:hidden;border:2px solid var(--wgold);box-shadow:0 0 70px -4px var(--wgold);animation:wbpop .9s .55s cubic-bezier(.2,1.25,.4,1) both}
@keyframes wbpop{from{transform:scale(.2) rotateY(100deg);opacity:0}to{transform:none;opacity:1}}
.wb-rcard img{width:100%;height:100%;object-fit:cover;display:block}
.wb-rname{font:900 26px 'Cairo',sans-serif;animation:wbfi .6s 1.2s both}
.wb-rtag{color:var(--wgold);font-size:13px;animation:wbfi .6s 1.3s both}
.wb-rev .wb-chips{animation:wbfi .6s 1.3s both}
.wb-rev .wb-ok{animation:wbfi .6s 1.5s both}
@keyframes wbfi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.wb-mt{font:900 24px 'Cairo',sans-serif;animation:wbfi .6s both}
.wb-ms{color:#9aa4c6;font-size:14px;line-height:1.8;animation:wbfi .6s .15s both}
.wb-ok{margin-top:6px;min-width:150px;height:46px;border:0;border-radius:12px;background:#fff;color:#050814;font:900 16px 'Cairo',sans-serif;cursor:pointer}
@media (prefers-reduced-motion:reduce){.wb-slide.on img,.wb-rays{animation:none}}
</style>
<body><div style="padding:30px 16px 60px">
  <div class="topbar">
    <span class="tb-l">${NAV_BTN}<span class="gmode">بنر الأسلحة</span></span>
    <a class="pill" href="/u/${esc(code)}">← رجوع للعرض</a>
  </div>
  ${navDrawerHTML(code, viewer.csrf, 'weapons', viewer.name)}
  <div class="wb" id="wb">
    <div class="wb-hd"><div><h1>بنر الأسلحة</h1><div class="wb-sub">كل الأسلحة ★★★★★ — ضمان عند ${Number(data.cap) || 80} سحبة</div></div><div class="wb-pill" id="wb-pp"></div></div>
    <div class="wb-stage" id="wb-stage"></div>
    <div class="wb-info"><h2 id="wb-wn"></h2>
      <div class="wb-chips"><span class="wb-chip wb-stars" id="wb-wr"></span><span class="wb-chip" id="wb-wt"></span><span class="wb-chip">الهجوم <b id="wb-wa"></b></span><span class="wb-chip"><span id="wb-ws"></span> <b id="wb-wv"></b></span></div>
    </div>
    <div class="wb-th" id="wb-th"></div>
    <div class="wb-note">يظهر أي سلاح من المجموعة عشوائياً</div>
    <div class="wb-pity"><div class="wb-prow"><span>🎯 عداد الضمان <b id="wb-pc"></b></span><span id="wb-pl"></span></div><div class="wb-track"><div class="wb-fill" id="wb-pf"></div></div></div>
    <div class="wb-err" id="wb-msg" hidden></div>
    <button id="wb-pull" type="button"></button>
    <div class="wb-hint" id="wb-hint"></div>
  </div>
</div>
<div id="wb-bgs"></div>
<div id="wb-fx"><canvas></canvas><div class="wb-orb"></div><div class="wb-flash"></div><button id="wb-skip" type="button">تخطي</button><div class="wb-rev" id="wb-rev"></div><div class="wb-miss" id="wb-miss"></div></div>
<script>
(function(){
  var CODE=${jsonForScript(code)}, CSRF=${jsonForScript(viewer.csrf)}, D=${jsonForScript(data)};
  var W=D.weapons, ST=D.state, DAILY=D.daily, CAP=D.cap;
  function $(s){ return document.querySelector(s); }
  function el(t,c,x){ var e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
  function stars(n){ return new Array((n||5)+1).join('★'); }
  function art(w,lazy){
    if(w.img){ var i=new Image(); i.alt=w.name; i.decoding='async'; if(lazy) i.dataset.src=w.img; else i.src=w.img; return i; }
    var d=el('div','wb-ph'); d.style.setProperty('--pc',w.c);
    d.appendChild(el('div','wb-pt',w.type)); d.appendChild(el('div','wb-pn',w.name)); d.appendChild(el('div','wb-ps',stars(w.rarity)));
    return d;
  }
  var root=$('#wb'), stage=$('#wb-stage'), bgs=$('#wb-bgs'), th=$('#wb-th');
  var sl=[], bg=[], tb=[], cur=0, first=true, timer=0, busy=false, skip=false;

  W.forEach(function(w){
    var f=el('figure','wb-slide'); f.appendChild(art(w,true)); stage.appendChild(f); sl.push(f);
    var b=el('div','wb-bg'); if(!w.img) b.style.background='radial-gradient(circle at 50% 30%,'+w.c+',#05070f 70%)'; bgs.appendChild(b); bg.push(b);
    var t=el('button'); t.type='button'; t.setAttribute('aria-label',w.name);
    if(w.img){ var ti=new Image(); ti.alt=''; ti.loading='lazy'; ti.decoding='async'; ti.src=w.img; t.appendChild(ti); }
    else { var ph=el('span','wb-tph',w.name.charAt(0)); ph.style.setProperty('--pc',w.c); t.appendChild(ph); }
    th.appendChild(t); tb.push(t);
  });
  function loadAt(k){
    k=(k+W.length)%W.length;
    var im=sl[k].querySelector('img');
    if(im && im.dataset.src){ im.src=im.dataset.src; delete im.dataset.src; }
    if(W[k].img && !bg[k].style.backgroundImage) bg[k].style.backgroundImage='url("'+W[k].img+'")';
  }
  function show(k){
    cur=(k+W.length)%W.length; var w=W[cur];
    loadAt(cur); loadAt(cur+1);
    [sl,bg,tb].forEach(function(a){ a.forEach(function(e,j){ e.classList.toggle('on',j===cur); }); });
    root.style.setProperty('--wacc',w.c);
    $('#wb-wn').textContent=w.name; $('#wb-wr').textContent=stars(w.rarity); $('#wb-wt').textContent=w.type;
    $('#wb-wa').textContent=w.atk; $('#wb-ws').textContent=w.stat; $('#wb-wv').textContent='+'+w.val+'%';
    if(!first) tb[cur].scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'}); first=false;
  }
  function auto(){ clearInterval(timer); timer=setInterval(function(){ if(!busy) show(cur+1); },4800); }
  tb.forEach(function(b,j){ b.onclick=function(){ show(j); auto(); }; });
  if(W.length){ show(0); auto(); }

  function upd(){
    $('#wb-pp').textContent='سحبات اليوم '+ST.pulls+'/'+DAILY;
    $('#wb-pc').textContent=ST.pity+'/'+CAP; $('#wb-pl').textContent='المتبقي '+Math.max(0,CAP-ST.pity)+' سحبة';
    $('#wb-pf').style.width=Math.min(100,ST.pity/CAP*100)+'%';
    var b=$('#wb-pull'); b.disabled=ST.pulls<1; b.textContent=ST.pulls>0?'سحب سلاح':'انتهت سحبات اليوم';
    $('#wb-hint').textContent=ST.pulls>0?'سحبة واحدة تخصم من سحبات اليوم':'تتجدد 12:00 صباحاً بتوقيت السعودية';
  }
  function showMsg(t){ var m=$('#wb-msg'); if(!t){ m.hidden=true; return; } m.textContent=t; m.hidden=false; }
  upd();

  var fx=$('#wb-fx'), cv=fx.querySelector('canvas'), g=cv.getContext('2d'), orb=fx.querySelector('.wb-orb'), fl=fx.querySelector('.wb-flash'),
      rev=$('#wb-rev'), miss=$('#wb-miss'), skipB=$('#wb-skip');
  var VW=0, VH=0, mode='idle', col='#fff', P=[], speed=1, looping=false;
  function size(){ cv.width=VW=innerWidth; cv.height=VH=innerHeight; }
  function initWarp(){ P=[]; for(var i=0;i<240;i++) P.push({a:Math.random()*6.283,r:Math.random()*60,v:2+Math.random()*3}); }
  function initBurst(){ P=[]; for(var i=0;i<150;i++){ var a=Math.random()*6.283, s=3+Math.random()*10; P.push({x:VW/2,y:VH*.45,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,l:1,c:Math.random()<.3?'#fff':col}); } }
  function tick(){
    if(mode==='idle'){ looping=false; return; }
    g.fillStyle='rgba(2,3,10,.28)'; g.fillRect(0,0,VW,VH);
    var i,p;
    if(mode==='warp'){
      g.lineWidth=2; g.strokeStyle=col;
      for(i=0;i<P.length;i++){ p=P[i];
        var r0=p.r; p.v=Math.min(p.v*(1+.03*speed),70); p.r+=p.v*speed;
        var r1=p.r+p.v*3, c=Math.cos(p.a), s=Math.sin(p.a);
        g.globalAlpha=Math.min(1,p.r/300); g.beginPath(); g.moveTo(VW/2+c*r0,VH*.45+s*r0); g.lineTo(VW/2+c*r1,VH*.45+s*r1); g.stroke();
        if(p.r>Math.hypot(VW,VH)){ p.r=Math.random()*40; p.v=2+Math.random()*3; }
      }
      g.globalAlpha=1;
    } else {
      var alive=0;
      for(i=0;i<P.length;i++){ p=P[i]; if(p.l<=0) continue; alive++;
        p.x+=p.vx; p.y+=p.vy; p.vy+=.18; p.l-=.011;
        g.globalAlpha=Math.max(p.l,0); g.fillStyle=p.c; g.beginPath(); g.arc(p.x,p.y,1+3*p.l,0,6.283); g.fill();
      }
      g.globalAlpha=1; if(!alive) mode='idle';
    }
    requestAnimationFrame(tick);
  }
  function start(m){ mode=m; if(!looping){ looping=true; requestAnimationFrame(tick); } }
  function sleep(ms){ return new Promise(function(res){ var e=Date.now()+ms; (function w(){ if(skip||Date.now()>=e) return res(); setTimeout(w,40); })(); }); }
  function preload(url){ return new Promise(function(res){ if(!url) return res(); var i=new Image(); i.onload=i.onerror=function(){ res(); }; i.src=url; setTimeout(res,3000); }); }
  function chips(w){
    var d=el('div','wb-chips');
    d.appendChild(el('span','wb-chip',w.type));
    var a=el('span','wb-chip','الهجوم '); a.appendChild(el('b',null,w.atk)); d.appendChild(a);
    var s=el('span','wb-chip',w.stat+' '); s.appendChild(el('b',null,'+'+w.val+'%')); d.appendChild(s);
    return d;
  }
  function closeFx(){ mode='idle'; fx.style.display='none'; busy=false; upd(); }

  async function run(){
    if(busy||ST.pulls<1) return;
    busy=true; skip=false; showMsg('');
    var rp=fetch('/weapons/pull',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:CSRF,code:CODE})})
      .then(function(r){ return r.json().catch(function(){ return {ok:false,message:'تعذر قراءة رد الخادم.'}; }); })
      .catch(function(){ return {ok:false,message:'تعذر الاتصال بالخادم، حاول مرة ثانية.'}; });
    fx.style.display='block'; rev.style.display=miss.style.display='none'; skipB.style.display='block';
    size(); g.clearRect(0,0,VW,VH);
    col='#7fb4ff'; fx.style.setProperty('--c',col); orb.className='wb-orb'; orb.style.opacity=.5;
    initWarp(); speed=.7; start('warp');
    var out=await Promise.all([rp,sleep(700)]), r=out[0];
    if(!r.ok){
      mode='idle'; fx.style.display='none'; busy=false;
      if(r.state){ ST=r.state; }
      showMsg(r.message||'تعذر تنفيذ السحب.'); upd(); return;
    }
    ST=r.state;
    if(r.won){
      col='#ffd873'; fx.style.setProperty('--c',col); orb.style.opacity=1; orb.classList.add('go');
      var pre=preload(r.weapon.img);
      for(var i=0;i<22&&!skip;i++){ speed=.7+i*.09; await sleep(100); }
      await pre;
      skipB.style.display='none'; mode='idle'; g.clearRect(0,0,VW,VH); orb.className='wb-orb'; orb.style.opacity=0;
      fl.className='wb-flash'; void fl.offsetWidth; fl.className='wb-flash go';
      initBurst(); start('burst');
      var w=r.weapon; rev.textContent='';
      rev.appendChild(el('div','wb-rays'));
      var sr=el('div','wb-rstars'); for(var k=0;k<5;k++){ var sp=el('span',null,'★'); sp.style.animationDelay=(.15+k*.14)+'s'; sr.appendChild(sp); } rev.appendChild(sr);
      var rc=el('div','wb-rcard'); rc.appendChild(art(w,false)); rev.appendChild(rc);
      rev.appendChild(el('div','wb-rname',w.name));
      if(r.guaranteed) rev.appendChild(el('div','wb-rtag','🎯 حصلت عليه من ضمان الأسلحة!'));
      rev.appendChild(chips(w));
      rev.appendChild(el('div','wb-rtag','تمت إضافته لمخزونك — استخدم .تركيب_سلاح بالواتساب لتركيبه'));
      var ok=el('button','wb-ok','حسناً'); ok.type='button'; ok.onclick=closeFx; rev.appendChild(ok);
      rev.style.display='flex';
    } else {
      speed=1.3; await sleep(500);
      skipB.style.display='none'; mode='idle'; g.clearRect(0,0,VW,VH); orb.className='wb-orb'; orb.style.opacity=0;
      miss.textContent='';
      miss.appendChild(el('div','wb-mt','💨 لم يحالفك الحظ هذه المرة'));
      var ms=el('div','wb-ms'); ms.appendChild(document.createTextNode('عداد الضمان '+ST.pity+'/'+CAP)); ms.appendChild(document.createElement('br')); ms.appendChild(document.createTextNode('المتبقي للضمان '+Math.max(0,CAP-ST.pity)+' سحبة')); miss.appendChild(ms);
      var mk=el('button','wb-ok','متابعة'); mk.type='button'; mk.onclick=closeFx; miss.appendChild(mk);
      miss.style.display='flex';
    }
    upd();
  }
  skipB.onclick=function(){ skip=true; };
  $('#wb-pull').onclick=run;
})();
</script>
</body></html>`
    }

    function mount(app, h) {
        const { auth, jsonBody, securityHeaders, CODE_RE, html404, ownerSession } = h

        app.get('/u/:code/weapons', async (req, res) => {
            try {
                securityHeaders(res)
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return html404(res)

                const player = await Player.findOne({ siteCode: code })
                    .select('userId name username sessionVersion weaponPulls weaponPity')
                    .lean()
                if (!player) return html404(res)

                const sess = ownerSession(req, player)
                if (!sess) return res.redirect(303, `/login?code=${code}`)

                res.send(pageHTML({
                    h,
                    viewer: { name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) },
                    code,
                    data: {
                        weapons: weaponsList.map(publicWeapon),
                        state: {
                            pulls: player.weaponPulls === undefined || player.weaponPulls === null ? dailyPulls : player.weaponPulls,
                            pity: player.weaponPity || 0
                        },
                        daily: dailyPulls,
                        cap: pityCap
                    }
                }))
            } catch (err) {
                console.error('weapon banner page error:', err)
                res.status(500).send('خطأ بالخادم')
            }
        })

        app.post('/weapons/pull', jsonBody, async (req, res) => {
            res.set('Cache-Control', 'no-store')
            const fail = (status, code, message, extra = {}) => res.status(status).json({ ok: false, code, message, ...extra })
            try {
                if (!auth.authEnabled()) return fail(503, 'DISABLED', 'السحب من الموقع غير مفعّل حالياً.')
                if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')

                const sess = auth.readSession(req)
                if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

                const b = req.body || {}
                if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
                if (!rate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')

                const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
                if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

                const r = await pullWeapon({ userId: sess.u })
                if (!r.ok) {
                    const status = r.code === 'BUSY' ? 409 : r.code === 'SERVER' ? 500 : 400
                    return fail(status, r.code, ERRORS[r.code] || ERRORS.SERVER, r.state ? { state: r.state } : {})
                }
                res.json({ ok: true, won: r.won, guaranteed: r.guaranteed, weapon: r.weapon, state: r.state })
            } catch (err) {
                console.error('weapon pull route error:', err)
                return fail(500, 'SERVER', ERRORS.SERVER)
            }
        })
    }

    return { pullWeapon, mount }
}

module.exports = { createSiteWeaponBanner }
