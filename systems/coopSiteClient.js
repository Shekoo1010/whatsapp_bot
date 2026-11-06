module.exports = String.raw`
(function(){
  var CODE=__CODE__, CSRF=__CSRF__, D=__DATA__;
  var S=D.state, SH=D.shop, TARGETS=null, tab='raid', busy=false;
  var sig='', fxBusy=false, pending=null, polling=false, pollSeq=0, skipFx=false, hiddenAt=0;
  var endAt=0, startAt=0, spawnAt=0, turnKey='', logR=[], wakeT=0, pollT=0, lbStr='';
  var RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  var view=null;

  function $(id){return document.getElementById(id)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function fmt(n){return Number(n||0).toLocaleString('en-US')}
  function pct(a,b){return b>0?Math.max(0,Math.min(100,a/b*100)):0}
  function mmss(ms){var s=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(s/60),r=s%60;return m+':'+(r<10?'0':'')+r}
  function bg(u){return u?"background-image:url('"+esc(u)+"')":''}
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
  function api(path,body){
    var opt=body===undefined?{credentials:'same-origin'}:{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({csrf:CSRF},body))};
    return fetch(path,opt).then(function(r){return r.json().catch(function(){return {ok:false,message:'خطأ'}})});
  }
  function say(t,ok){var m=$('msg');if(!t){m.textContent='';return}m.className='msg'+(ok?' ok':'');m.textContent=t}
  function me(s){return (s.players||[]).filter(function(p){return p.id==='me'})[0]}
  function phOf(s){return s.boss?(s.boss.rage?4:(s.boss.phase||1)):1}
  var PH={2:['AWAKENED','#4aa8ff'],3:['DEMON FORM','#ff3d57'],4:['RAGE','#ff7a00']};

  /* ───────── أدوات الأنميشن (WAAPI: transform/opacity فقط = سلس على الجوال) ───────── */
  function an(el,kf,opt){
    if(!el||!el.animate||RM)return Promise.resolve();
    return new Promise(function(res){
      var a;try{a=el.animate(kf,opt)}catch(e){return res()}
      a.onfinish=res;a.oncancel=res;
    });
  }
  function mk(cls,css){var e=document.createElement('i');e.className=cls;if(css)Object.assign(e.style,css);document.body.appendChild(e);return e}
  function ctr(el){if(!el)return {x:innerWidth/2,y:innerHeight/3};var r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}}
  function T(p,s){return 'translate('+p.x+'px,'+p.y+'px) translate(-50%,-50%) scale('+(s==null?1:s)+')'}
  function shake(n){var w=document.querySelector('.wrap');if(w)an(w,[{translate:'0 0'},{translate:(-n)+'px '+(n/2)+'px'},{translate:n+'px '+(-n/2)+'px'},{translate:(-n/2)+'px 0'},{translate:'0 0'}],{duration:380})}
  function shakeEl(el,n,ms){return an(el,[{translate:'0 0'},{translate:(-n)+'px 0'},{translate:n+'px 0'},{translate:(-n/2)+'px 0'},{translate:'0 0'}],{duration:ms||360})}
  function flashScr(red){var f=mk('flash'+(red?' red':''));setTimeout(function(){f.remove()},420)}
  function fnum(p,text,cls){
    var e=mk('fxn '+(cls||''));e.textContent=text;e.style.transform=T(p,1);
    if(RM){setTimeout(function(){e.remove()},900);return}
    an(e,[{transform:T(p,.6),opacity:0},{transform:T({x:p.x,y:p.y-26},1.15),opacity:1,offset:.2},{transform:T({x:p.x,y:p.y-90},1),opacity:0}],{duration:950,easing:'ease-out'}).then(function(){e.remove()});
  }
  function ring(p,col,s){
    var e=mk('fxr');e.style.setProperty('--c',col);e.style.transform=T(p,.3);
    an(e,[{transform:T(p,.3),opacity:1},{transform:T(p,s||6),opacity:0}],{duration:520,easing:'ease-out'}).then(function(){e.remove()});
  }
  function burst(p,col,n){
    for(var i=0;i<n;i++)(function(){
      var e=mk('fxp'),a=Math.random()*6.283,d=34+Math.random()*50;
      e.style.setProperty('--c',col);e.style.transform=T(p,1);
      an(e,[{transform:T(p,1),opacity:1},{transform:T({x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d},.2),opacity:0}],{duration:420+Math.random()*180,easing:'ease-out'}).then(function(){e.remove()});
    })();
  }
  function slash(p,crit){
    [-38,-142].forEach(function(deg,i){
      var e=mk('fxs');e.style.transform=T(p,1)+' rotate('+deg+'deg)';
      if(crit)e.style.background='linear-gradient(90deg,transparent,#fff,#f0c04a,#fff,transparent)';
      an(e,[{transform:T(p,.2)+' rotate('+deg+'deg)',opacity:0},{transform:T(p,1.1)+' rotate('+deg+'deg)',opacity:1,offset:.35},{transform:T(p,1.2)+' rotate('+deg+'deg)',opacity:0}],{duration:340,delay:i*60,easing:'ease-out',fill:'backwards'}).then(function(){e.remove()});
    });
  }
  function fly(el,a,b,dur,s0,s1){
    var mid={x:(a.x+b.x)/2+(Math.random()*50-25),y:Math.min(a.y,b.y)-30};
    el.style.transform=T(a,s0);
    return an(el,[{transform:T(a,s0)},{transform:T(mid,(s0+s1)/2),offset:.5},{transform:T(b,s1)}],{duration:dur,easing:'cubic-bezier(.45,0,.85,.55)'});
  }
  function cine(txt,col){
    var c=mk('cine');c.style.setProperty('--c',col||'#f0c04a');c.innerHTML='<b>'+esc(txt)+'</b>';
    shake(16);
    return an(c,[{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.7},{opacity:0}],{duration:1500}).then(function(){c.remove()});
  }
  function hitArt(crit){
    var a=$('art');if(!a)return;
    an(a,[{filter:'brightness(2.3) drop-shadow(0 0 26px #fff)'},{filter:'var(--bf) drop-shadow(0 0 22px var(--ds))'}],{duration:320});
    shakeEl(a,crit?14:8,crit?420:300);
    an(a,[{rotate:'0deg'},{rotate:(crit?-4:-2)+'deg'},{rotate:(crit?4:2)+'deg'},{rotate:'0deg'}],{duration:crit?420:300});
  }

  /* ───────── HTML ───────── */
  function heroHtml(B,id){
    var ph=phOf({boss:B});
    return '<div class="hero" id="'+id+'" data-ph="'+ph+'"><div class="aura"></div><div class="rank">'+esc(B.rank)+'</div><div class="art" id="art" style="'+bg(B.image)+'"></div><div class="bname">'+esc(B.name)+'</div><span class="chip">'+esc(B.anime)+'</span>'
    +'<div class="hpbar"><div class="hpghost" id="hpg"></div><div class="hpfill" id="hpf"></div><div class="shfill" id="shf"></div></div>'
    +'<div class="hptxt"><span id="hpt1"></span><span id="hpt2"></span></div>'
    +'<div class="phases" id="phs">'+['الطور 1','الطور 2','الطور 3','🔥 Rage'].map(function(t){return '<span class="ph">'+t+'</span>'}).join('')+'</div></div>';
  }
  function cardHtml(c,i){return '<div class="cc" data-i="'+i+'" style="--tier:#b83fff"><div class="em"><img src="'+esc(c.img||'')+'" alt=""></div><div class="n">'+esc(c.name)+'</div><div class="p">'+fmt(c.power)+'</div><div class="mh"><i></i></div></div>'}
  function lobbyHtml(N){
    var m=me(N),cards=m?m.chars.map(function(c,i){return cardHtml(c,i)}).join(''):'';
    var slots='';for(var i=0;i<N.max;i++)slots+='<div class="slot"></div>';
    return heroHtml(N.boss,'bHero')+'<div class="h2">الفريق <span class="en" id="tc"></span></div><div class="slots" id="slots">'+slots+'</div><div class="h2" id="sc" hidden></div>'
      +(N.me.joined?'<div class="h2">فريقك</div><div class="cards" id="mycards">'+cards+'</div>':'')+'<div id="lbtn"></div>';
  }
  function battleHtml(N){
    var m=me(N);
    var chips=N.players.map(function(p,i){return '<span class="tp'+(p.id==='me'?' me':'')+'" data-i="'+i+'">'+esc(p.name)+'</span>'}).join('');
    return heroHtml(N.boss,'bHero')+'<div class="turn" id="turnrow">'+chips+'</div><div class="tbar"><i id="tb"></i></div><div class="tl"><span id="tl1"></span><span>الجولة <b class="en" id="rd"></b> · <b class="en" id="tt"></b></span></div>'
      +(m?'<div class="cards" id="mycards" style="margin-top:12px">'+m.chars.map(function(c,i){return cardHtml(c,i)}).join('')+'</div>':'<div class="note">أنت تشاهد القتال فقط.</div>')
      +(m?'<button class="btn atk" id="atk" disabled>⚔ هجوم</button>':'')
      +'<div class="log" id="log"></div><div class="h2">ترتيب الضرر</div><div class="lb" id="lbv"></div>';
  }
  function idleHtml(N){
    var out='<div class="h2">لا يوجد كو اوب حالياً</div>';
    if(N.nextSpawnIn!=null)out+='<div class="coins" id="ns"></div><div class="note">الوقت المتبقي لظهور الزعيم القادم (كل 4 ساعات)</div>';
    var R=N.result;
    if(R){
      out+='<div class="banner'+(R.victory?'':' lose')+'">'+(R.victory?'VICTORY':'DEFEAT')+'</div><div style="text-align:center;color:var(--dim);font-weight:800">'+esc(R.boss.name)+'</div><div class="rw">'
      +R.rows.map(function(r){var rw=r.rewards,items='';if(rw){items='<span>💰 '+fmt(rw.gold)+'</span><span>⭐ '+fmt(rw.exp)+'</span><span>🪙 '+fmt(rw.coins)+'</span>'+(rw.boxes||[]).map(function(b){return '<span>🎁 '+esc(b.id)+' ×'+b.amount+'</span>'}).join('')}
        return '<div class="rr'+(r.rank<=3?' t'+r.rank:'')+'"><div class="h"><span>#'+r.rank+' '+esc(r.name)+(r.mine?' (أنت)':'')+'</span><em>'+fmt(r.damage)+'</em></div>'+(items?'<div class="i">'+items+'</div>':'')+'</div>'}).join('')+'</div>';
    }
    return out;
  }

  /* ───────── توقيع البنية: لا نعيد بناء الـ DOM إلا إذا تغيّرت البنية فعلاً ───────── */
  function sigOf(s){
    if(s.phase==='battle'){var m=me(s);return ['b',s.boss.name,s.players.map(function(p){return p.name+(p.id==='me'?'*':'')}).join('|'),m?m.chars.map(function(c){return c.name}).join(','):''].join('#')}
    if(s.phase==='waiting'){var m2=me(s);return ['l',s.boss.name,s.max,s.me.joined,m2?m2.chars.map(function(c){return c.name}).join(','):''].join('#')}
    return ['i',s.result?s.result.boss.name+s.result.rows.length+s.result.victory:'-',s.nextSpawnIn!=null].join('#');
  }
  function build(N){
    view.innerHTML=N.phase==='waiting'?lobbyHtml(N):N.phase==='battle'?battleHtml(N):idleHtml(N);
    sig=sigOf(N);logR=[];turnKey='';lbStr='';
    patchAll(N);
  }

  /* ───────── التحديث في المكان (بدون إعادة رسم) ───────── */
  function setCls(el,c,on){if(el&&el.classList.contains(c)!==!!on)el.classList.toggle(c,!!on)}
  function setTxt(el,t){if(el&&el.textContent!==t)el.textContent=t}
  function patchBoss(N,hpOverride){
    var B=N.boss,h=$('bHero');if(!h)return;
    var hp=hpOverride==null?B.hp:hpOverride,ph=phOf(N);
    if(h.getAttribute('data-ph')!=ph)h.setAttribute('data-ph',String(ph));
    var f=$('hpf'),g=$('hpg'),sh=$('shf'),w=pct(hp,B.maxHp)+'%';
    if(f&&f.style.width!==w)f.style.width=w;
    if(g&&g.style.width!==w)g.style.width=w;
    var sw=pct(B.shield,B.maxHp)+'%';if(sh&&sh.style.width!==sw)sh.style.width=sw;
    setTxt($('hpt1'),fmt(hp)+' / '+fmt(B.maxHp));
    setTxt($('hpt2'),'HP'+(B.shield>0?' 🛡'+fmt(B.shield):''));
    var ps=$('phs');if(ps)for(var i=0;i<ps.children.length;i++)setCls(ps.children[i],'on',ph===i+1);
  }
  function patchChars(N){
    var m=me(N),box=$('mycards');if(!m||!box)return;
    for(var i=0;i<box.children.length;i++){
      var c=m.chars[i],el=box.children[i];if(!c)continue;
      setCls(el,'dead',!c.alive);setCls(el,'act',N.phase==='battle'&&i===m.cur);
      var bar=el.querySelector('.mh i'),w=pct(c.hp,c.maxHp)+'%';if(bar&&bar.style.width!==w)bar.style.width=w;
    }
  }
  function patchTurn(N){
    var row=$('turnrow');if(!row)return;
    for(var i=0;i<row.children.length;i++){var p=N.players[i];if(!p)continue;setCls(row.children[i],'on',p.turn);setCls(row.children[i],'x',p.finished)}
    setTxt($('tl1'),N.me.myTurn?'🎯 دورك الآن!':'⏳ بانتظار الدور');
    setTxt($('rd'),String(N.round));
    var key=N.round+':'+N.players.map(function(p){return p.turn?1:0}).join('');
    if(key!==turnKey){turnKey=key;var tb=$('tb');if(tb){tb.style.transition='none';tb.style.width='100%';void tb.offsetWidth;tb.style.transition=''}}
  }
  function patchLog(N){
    var box=$('log');if(!box)return;
    var nl=N.log||[],o=0,add=nl;
    if(logR.length){
      var found=false;
      for(o=0;o<logR.length;o++){
        var tail=logR.slice(o),n=tail.length,same=true;
        for(var k=0;k<n;k++){if(tail[k]!==nl[k]){same=false;break}}
        if(same&&n<=nl.length){add=nl.slice(n);found=true;break}
      }
      if(!found){box.innerHTML='';add=nl}
    }
    if(!add.length&&logR.length)return;
    var atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<40||!logR.length;
    var fr=document.createDocumentFragment();
    add.forEach(function(t){var p=document.createElement('p');p.innerHTML=esc(t).replace(/\n/g,'<br>');fr.appendChild(p)});
    box.appendChild(fr);
    while(box.children.length>25)box.removeChild(box.firstChild);
    logR=nl.slice();
    if(atBottom)box.scrollTop=box.scrollHeight;
  }
  function patchLb(N){
    var el=$('lbv');if(!el)return;
    var h=(N.leaderboard||[]).map(function(r,i){return '<div class="lr"><span class="r">'+(i+1)+'</span>'+esc(r.name)+'<span class="d">'+fmt(r.damage)+'</span></div>'}).join('');
    if(h!==lbStr){lbStr=h;el.innerHTML=h}
  }
  function refreshAtk(){var a=$('atk');if(a)a.disabled=!(S.me&&S.me.myTurn)||busy||fxBusy||S.phase!=='battle'}
  function patchLobby(N){
    var n=N.players.length,sl=$('slots');
    setTxt($('tc'),n+'/'+N.max);
    if(sl)for(var i=0;i<sl.children.length;i++){
      var p=N.players[i],el=sl.children[i];
      setCls(el,'f',!!p);setCls(el,'rd',!!(p&&p.ready));setTxt(el,p?p.name:'فارغ');
    }
    var sc=$('sc');
    if(sc){if(N.startsIn!=null){sc.hidden=false}else sc.hidden=true}
    var btns='';
    if(!N.me.joined)btns+='<button class="btn" id="join">⚔ انضم للريد</button>';
    else{
      btns+='<button class="btn" id="join" disabled>✅ تم انضمامك</button>';
      if(N.canReady)btns+='<button class="btn go" id="ready">'+(N.me.ready?'↩ إلغاء الاستعداد':'✋ استعداد')+' ('+N.readyCount+'/'+n+')</button><div class="note">إذا ضغط الجميع «استعداد» يبدأ القتال فوراً، أو ننتظر اكتمال '+N.max+' لاعباً.</div>';
      else btns+='<div class="note">يظهر زر «استعداد» عند '+N.readyMin+' لاعبين.</div>';
    }
    var lb=$('lbtn');if(lb&&lb.getAttribute('data-h')!==btns){lb.setAttribute('data-h',btns);lb.innerHTML=btns}
    patchChars(N);
  }
  function patchAll(N){
    if(N.phase==='idle')return;
    patchBoss(N);
    if(N.phase==='waiting')patchLobby(N);
    else{patchChars(N);patchTurn(N);patchLog(N);patchLb(N);}
  }

  /* ───────── أنميشن الهجوم وضربة الزعيم ───────── */
  function portrait(att,ghost){
    var e=mk('fxc'+(ghost?' g':''));
    if(att.crit)e.style.setProperty('--tier','#f0c04a');
    if(att.img)e.style.backgroundImage='url("'+String(att.img).replace(/"/g,'%22')+'")';
    if(!ghost&&att.label){var l=document.createElement('span');l.textContent=att.label;e.appendChild(l)}
    e.style.opacity='0';
    return e;
  }
  async function fxAttack(att,runHp,N){
    var art=$('art'),B=ctr(art),crit=!!att.crit;
    var origin=att.kind==='me'?(document.querySelector('#mycards .cc.act')||document.querySelector('#mycards .cc')):document.querySelector('#turnrow .tp[data-i="'+att.pi+'"]');
    var from=ctr(origin);
    if(att.kind==='me'&&origin)an(origin,[{translate:'0 0',scale:1},{translate:'0 8px',scale:.95,offset:.3},{translate:'0 -10px',scale:1.04}],{duration:300});
    else if(origin)an(origin,[{scale:1},{scale:1.18},{scale:1}],{duration:300});
    /* صورة الشخصية تدخل من مكانها إلى منتصف الزعيم، ومعها صورتان ظليّتان كأثر حركة */
    var main=portrait(att),g1=portrait(att,true),g2=portrait(att,true);
    function arrive(el,delay,maxOp){
      el.style.transform=T(from,.45);
      return an(el,[{transform:T(from,.45),opacity:0},{transform:T({x:(from.x+B.x)/2,y:(from.y+B.y)/2-26},.85),opacity:maxOp,offset:.55},{transform:T(B,1.05),opacity:maxOp}],{duration:320,delay:delay,easing:'cubic-bezier(.2,.8,.25,1)',fill:'both'});
    }
    arrive(g2,70,.28);arrive(g1,35,.4);
    await arrive(main,0,1);
    /* ضربة: تتقدّم الصورة للأمام مع ميلان ثم يقع التأثير على الزعيم */
    var up={x:B.x,y:B.y-8};
    await an(main,[{transform:T(B,1.05)},{transform:T(up,crit?1.6:1.45)+' rotate('+(crit?-7:-4)+'deg)'}],{duration:150,easing:'ease-out',fill:'both'});
    [g1,g2].forEach(function(g){g.remove()});
    slash(B,crit);ring(B,crit?'#f0c04a':'#ffffff',crit?9:6);burst(B,crit?'#f0c04a':'#ffd24a',crit?14:8);
    hitArt(crit);
    fnum({x:B.x+(Math.random()*80-40),y:B.y-70},(crit?'💥 ':'')+fmt(att.dmg),crit?'cr':'');
    if(crit){flashScr(false);shake(14)}else shake(5);
    patchBoss(N,runHp);
    await an(main,[{transform:T(up,crit?1.6:1.45)+' rotate('+(crit?-7:-4)+'deg)',opacity:1},{transform:T({x:B.x,y:B.y-60},crit?1.85:1.65)+' rotate(0deg)',opacity:0}],{duration:300,easing:'ease-in',fill:'both'});
    main.remove();
    await sleep(crit?200:100);
  }
  async function fxBossHits(hits,N){
    var art=$('art'),B=ctr(art);
    if(art)art.style.setProperty('--ds','#ff3d57');
    var lunge=an(art,[{scale:1,translate:'0 0'},{scale:.92,translate:'0 6px',offset:.35},{scale:1.1,translate:'0 22px',offset:.6},{scale:1,translate:'0 0'}],{duration:560,easing:'ease-in-out'});
    await sleep(RM?0:330);
    var ts=hits.map(function(h){
      var el=h.kind==='me'?document.querySelector('#mycards .cc[data-i="'+h.ci+'"]'):document.querySelector('#turnrow .tp[data-i="'+h.pi+'"]');
      return {h:h,el:el,p:ctr(el)};
    });
    await Promise.all(ts.map(function(t){
      var o=mk('fxo');o.style.setProperty('--c',t.h.heal?'#3ddc97':'#ff3d57');
      return fly(o,B,t.p,280,1,.9).then(function(){o.remove()});
    }));
    ts.forEach(function(t){
      var h=t.h,p=t.p;
      if(h.heal){fnum(p,'+'+fmt(h.dmg),'hl');ring(p,'#3ddc97',4);return}
      ring(p,'#ff3d57',4);burst(p,'#ff6b86',7);
      shakeEl(t.el,9,380);
      fnum(p,'-'+fmt(h.dmg),'foe');
      if(h.kind==='me'){flashScr(true);shake(9)}
    });
    patchChars(N);
    await lunge;
    if(art)art.style.removeProperty('--ds');
    await sleep(320);
  }
  async function bossDie(){
    var a=$('art');if(!a)return;
    var B=ctr(a);burst(B,'#ff8a4a',18);ring(B,'#ff7a00',8);flashScr(false);shake(16);
    await an(a,[{opacity:1,scale:1,rotate:'0deg'},{opacity:0,scale:.55,rotate:'10deg'}],{duration:900,easing:'ease-in',fill:'forwards'});
  }

  /* ───────── استقبال الحالة: مقارنة القديم بالجديد وتشغيل المؤثرات بالترتيب ───────── */
  function diff(O,N,ctx){
    var ev={atts:[],hits:[],heal:0,phaseUp:phOf(N)>phOf(O),any:false};
    N.players.forEach(function(p,i){
      var op=O.players[i];if(!op)return;
      var d=(p.damage||0)-(op.damage||0);
      if(d>0||(p.id==='me'&&ctx&&ctx.hit)){
        var oc0=(op.chars||[])[op.cur];
        ev.atts.push({kind:p.id==='me'?'me':'p',pi:i,dmg:p.id==='me'&&ctx&&ctx.hit?ctx.hit.damage:d,crit:!!(p.id==='me'&&ctx&&ctx.hit&&ctx.hit.critical),img:oc0&&oc0.img||'',label:p.id==='me'?(oc0?oc0.name:''):p.name});
      }
      if(p.id==='me'){
        (p.chars||[]).forEach(function(c,ci){
          var oc=(op.chars||[])[ci];if(!oc)return;
          var dd=oc.hp-c.hp;
          if(dd>0)ev.hits.push({kind:'me',pi:i,ci:ci,dmg:dd});
          else if(dd<0)ev.hits.push({kind:'me',pi:i,ci:ci,dmg:-dd,heal:true});
        });
      }else{
        var sum=0;(p.chars||[]).forEach(function(c,ci){var oc=(op.chars||[])[ci];if(oc)sum+=oc.hp-c.hp});
        if(sum>0)ev.hits.push({kind:'p',pi:i,dmg:sum});
      }
    });
    if(N.boss.hp>O.boss.hp)ev.heal=N.boss.hp-O.boss.hp;
    if(ev.atts.length>3||ev.hits.length>6){ev.atts=ev.atts.slice(0,3);ev.hits=ev.hits.slice(0,6)}
    ev.any=!!(ev.atts.length||ev.hits.length||ev.heal||ev.phaseUp);
    return ev;
  }
  function ingest(N,ctx){
    N._t=Date.now();
    if(fxBusy){pending={N:N,ctx:ctx};return}
    run(N,ctx);
  }
  function drain(){if(pending&&!fxBusy){var p=pending;pending=null;run(p.N,p.ctx)}}
  function done(N){
    S=N;
    endAt=N._t+(N.turnEndsIn||0);
    startAt=N.startsIn!=null?N._t+N.startsIn:0;
    spawnAt=N.nextSpawnIn!=null?N._t+N.nextSpawnIn:0;
    refreshAtk();
    if(N.phase==='idle'&&spawnAt)setTxt($('ns'),mmss(spawnAt-Date.now()));
    clearTimeout(wakeT);
    var wake=N.phase==='battle'?endAt-Date.now()+500:(N.phase==='waiting'&&startAt)?startAt-Date.now()+700:(N.phase==='idle'&&spawnAt)?spawnAt-Date.now()+1500:0;
    if(wake>0)wakeT=setTimeout(poll,Math.max(400,wake));
  }
  async function run(N,ctx){
    var O=S,same=tab==='raid'&&sig===sigOf(O)&&O.phase===N.phase&&sigOf(O)===sigOf(N);
    var fxOk=tab==='raid'&&!skipFx&&!RM;skipFx=false;
    if(fxOk&&O.phase==='battle'&&N.phase==='idle'&&sig===sigOf(O)){
      fxBusy=true;refreshAtk();
      try{
        var run0=O.boss.hp;
        if(ctx&&ctx.hit){var mp=me(O),mc=mp&&mp.chars[mp.cur];await fxAttack({kind:'me',dmg:ctx.hit.damage,crit:!!ctx.hit.critical,img:mc&&mc.img||'',label:mc?mc.name:''},Math.max(0,run0-ctx.hit.damage),O)}
        if(N.result&&N.result.victory){patchBoss({boss:Object.assign({},O.boss,{hp:0}),phase:'battle'});await bossDie()}
      }catch(e){console.error(e)}
      fxBusy=false;build(N);done(N);drain();return;
    }
    var ev=(fxOk&&same&&N.phase==='battle')?diff(O,N,ctx):null;
    if(!ev||!ev.any){
      if(sigOf(N)!==sig||(N.phase!=='idle'&&!$('bHero')))build(N);else patchAll(N);
      if(ev===null&&O.phase==='battle'&&N.phase==='battle'&&phOf(N)>phOf(O)&&PH[phOf(N)])cine(PH[phOf(N)][0],PH[phOf(N)][1]);
      done(N);return;
    }
    fxBusy=true;refreshAtk();
    try{
      var running=O.boss.hp;
      for(var i=0;i<ev.atts.length;i++){
        running=Math.max(N.boss.hp,running-(ev.atts[i].dmg||0));
        await fxAttack(ev.atts[i],running,N);
      }
      if(ev.heal){var B=ctr($('art'));fnum(B,'+'+fmt(ev.heal),'hl');ring(B,'#3ddc97',6)}
      patchBoss(N);
      if(ev.hits.length){await sleep(RM?0:120);await fxBossHits(ev.hits,N)}
      if(ev.phaseUp&&PH[phOf(N)])await cine(PH[phOf(N)][0],PH[phOf(N)][1]);
    }catch(e){console.error('coop fx',e)}
    fxBusy=false;
    patchAll(N);done(N);drain();
  }
  function act(res){if(res.ok){say('',1);ingest(res.state)}else{say(res.message||'خطأ');var j=$('join');if(j)j.disabled=false}}
  function attack(){
    if(busy||fxBusy||!S.me||!S.me.myTurn)return;
    busy=true;pollSeq++;refreshAtk();
    api('/coop/attack',{}).then(function(res){
      busy=false;
      if(res.ok){say('',1);ingest(res.state,{hit:res.hit})}
      else{say(res.message||'تعذر الهجوم');refreshAtk();poll()}
    }).catch(function(){busy=false;say('تعذر الاتصال');refreshAtk()});
  }
  function poll(){
    if(document.hidden||tab!=='raid'||busy||polling||fxBusy)return;
    polling=true;var seq=pollSeq;
    api('/coop/state').then(function(res){
      polling=false;
      if(seq!==pollSeq||busy||!res.ok)return;
      ingest(res.state);
    }).catch(function(){polling=false});
  }
  function loop(){
    poll();
    clearTimeout(pollT);
    pollT=setTimeout(loop,S.phase==='battle'?2000:S.phase==='waiting'?2500:6000);
  }
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){hiddenAt=Date.now()}
    else{if(hiddenAt&&Date.now()-hiddenAt>3000)skipFx=true;hiddenAt=0;poll()}
  });

  /* عدّادات محلية خفيفة (تعتمد على مواعيد مطلقة فلا تنجرف) */
  setInterval(function(){
    if(document.hidden||tab!=='raid')return;
    var now=Date.now();
    if(S.phase==='battle'){var rem=Math.max(0,endAt-now);setTxt($('tt'),mmss(rem));var tb=$('tb');if(tb)tb.style.width=pct(rem,10000)+'%'}
    else if(S.phase==='waiting'&&startAt){var sc=$('sc');if(sc){sc.hidden=false;setTxt(sc,'⏳ يبدأ القتال بعد '+Math.ceil(Math.max(0,startAt-now)/1000)+' ث')}}
    else if(S.phase==='idle'&&spawnAt){setTxt($('ns'),mmss(spawnAt-now))}
  },500);

  /* ───────── المتجر (كما هو) ───────── */
  function shopRender(){
    var s=SH;if(!s){$('shopv').innerHTML='<div class="note">تعذر تحميل المتجر</div>';return}
    $('coinsv').textContent='🪙 '+fmt(s.coins);
    $('shopv').innerHTML=s.items.map(function(it){
      var sel='';
      if(it.needsTarget==='character'){sel='<select data-t="'+esc(it.id)+'">'+((TARGETS||[]).map(function(n){return '<option>'+esc(n)+'</option>'}).join('')||'<option value="">لا شخصيات SSS</option>')+'</select>'}
      var dis=!it.available||it.left<=0||s.coins<it.price;
      return '<div class="si"><div class="nm">'+esc(it.name)+'<div class="sm">متبقي هذا الأسبوع: '+it.left+' / '+it.weeklyLimit+(it.available?'':' · غير متاح')+'</div></div>'+sel+'<button data-id="'+esc(it.id)+'"'+(dis?' disabled':'')+'>🪙 '+fmt(it.price)+'</button></div>'}).join('');
    Array.prototype.forEach.call(document.querySelectorAll('#shopv button[data-id]'),function(b){
      b.onclick=function(){
        var id=b.getAttribute('data-id'),body={id:id},sel=document.querySelector('#shopv select[data-t="'+id+'"]');
        if(sel){body.character=sel.value;if(!body.character){say('اختر شخصية');return}}
        b.disabled=true;
        api('/coop/shop/buy',body).then(function(res){
          if(res.ok){SH=res.shop;say('✅ تم شراء '+res.item.name,1)}else say(res.message||'تعذر الشراء');
          shopRender();
        });
      };
    });
  }
  function setTab(t){
    tab=t;$('tr').className=t==='raid'?'on':'';$('ts').className=t==='shop'?'on':'';
    $('view').hidden=t!=='raid';$('shop').hidden=t!=='shop';say('');
    if(t==='raid'){skipFx=true;build(S);poll()}
    else{shopRender();api('/coop/shop').then(function(res){if(res.ok){SH=res.shop;TARGETS=res.targets;shopRender()}})}
  }
  $('tr').onclick=function(){setTab('raid')};$('ts').onclick=function(){setTab('shop')};

  /* أزرار الصفحة بالتفويض: لا نحتاج إعادة ربط بعد كل تحديث */
  view=$('view');
  view.addEventListener('click',function(e){
    var b=e.target.closest?e.target.closest('button'):null;if(!b||b.disabled)return;
    if(b.id==='join'){b.disabled=true;api('/coop/join',{}).then(act)}
    else if(b.id==='ready'){b.disabled=true;api('/coop/ready',{}).then(act)}
    else if(b.id==='atk'){attack()}
  });
  S._t=Date.now();build(S);done(S);
  pollT=setTimeout(loop,2000);
})();
`
