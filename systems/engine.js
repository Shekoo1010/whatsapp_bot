/* ============================================================
   درافت الأنمي PvP — محرك arena-11 (نفس الأنميشن والمنطق) + باند + تزامن الخادم
   ============================================================ */
const AR=window.ARENA, CHARS=AR.chars, MEDIA=AR.media||{};
let names=['',''], teams=[[],[]], ROOM=null, LR=Math.random, ONLINE=[], skew=0;
const mulberry32=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rnd = (a,b) => Math.random()*(b-a)+a;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let curTab = 'lobby';
const show = id => {
  ['lobby','wait','draft','intro','battle','rank','live'].forEach(k => $('s-'+k).classList.toggle('hide', k!==id));
  const isTab = id==='lobby'||id==='rank'||id==='live';
  if (isTab) curTab = id;
  $('tabs').classList.toggle('hide', !isTab);
  document.querySelectorAll('#tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.tab===id));
};

/* ---------- بطاقة ---------- */
function cardHTML(c, opt = {}) {
  const [name, form, anime, power, ability, img] = c;
  return `<div class="card ${opt.cls||''}" ${opt.idx!==undefined?`data-i="${opt.idx}"`:''}>
    <div class="fb">${esc(name[0])}</div>
    <img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">
    ${opt.no?`<div class="no">${opt.no}</div>`:''}
    <div class="info"><div class="n">${esc(name)}</div><div class="f">${esc(form)}</div><div class="a">${esc(anime)}</div></div>
  </div>`;
}

/* ---------- 4) أنميشن المواجهة (VS) ---------- */
function introCard(c, i){
  return `<div class="icard" style="--i:${i}"><div class="in">
    <div class="fb">${esc(c[0][0])}</div>
    <img src="${esc(c[5])}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">
    
    <div class="lbl"><b>${esc(c[0])}</b><small>${esc(c[2])}</small></div>
    <div class="gl"></div></div></div>`;
}
let introTimer = null, introDone = null;
function runIntro(){
  show('intro');
  const st = $('istage');
  st.className = 'istage';
  st.innerHTML = `<div class="bg"></div>
    <div class="band b1"><div class="pname">🔵 ${esc(names[0])}</div><div class="irow">${teams[0].map(introCard).join('')}</div></div>
    <div class="ivs">VS</div><div class="ring"></div>
    <div class="band b2"><div class="pname">🔴 ${esc(names[1])}</div><div class="irow">${teams[1].map(introCard).join('')}</div></div>
    <div class="iflash" id="iflash"></div><div class="itip">اضغط للتخطي</div>`;
  let finished = false;
  const finish = () => {
    if (finished) return; finished = true;
    clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    $('iflash').classList.add('go');
    setTimeout(() => startBattle(), 380);
  };
  st.onclick = finish;
  const t1 = setTimeout(() => st.classList.add('shk'), 2350);   // اهتزاز مع ظهور VS
  const t2 = setTimeout(() => st.classList.remove('shk'), 2900);
  const t3 = setTimeout(finish, 4600);
}

const DEMO_ID={l:'luffy',k:'kaido',z:'zoro'};
async function vidURL(k){const id=DEMO_ID[k]||k;return (MEDIA[id]&&MEDIA[id].video)||('/draft-arena-assets/demo-'+k+'.mp4')}
const afx = (el,kf,ms,o={}) => { try{ return el.animate(kf,{duration:ms,fill:'forwards',easing:'ease-out',...o}).finished.catch(()=>{}); }catch(e){ return Promise.resolve(); } };

// شاشة كاملة: أسود ← أنميشن (أبيض/برق أزرق) ← الفيديو ← عودة للمعركة
async function fullTF(kind, key){
  const o = document.createElement('div');
  o.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;opacity:0;overflow:hidden;cursor:pointer';
  document.body.appendChild(o);
  let sk = false; o.onclick = () => { sk = true; };
  const W=innerWidth, H=innerHeight, cx=W/2, cy=H/2, D=Math.hypot(W,H)*1.3;
  const add = (html,css) => { const d=document.createElement('div'); d.style.cssText='position:absolute;'+css; if(html) d.innerHTML=html; o.appendChild(d); return d; };
  const nap = async ms => { const e=Date.now()+ms; while(Date.now()<e && !sk) await sleep(40); };
  const urlP = vidURL(key);
  await afx(o,[{opacity:0},{opacity:1}],600);
  if(kind==='white'){
    const M = 'radial-gradient(circle,#000 4%,transparent 62%)';
    const rays = add('',`left:${cx-D/2}px;top:${cy-D/2}px;width:${D}px;height:${D}px;border-radius:50%;background:repeating-conic-gradient(#fff 0 5deg,transparent 5deg 15deg);-webkit-mask-image:${M};mask-image:${M};opacity:0`);
    afx(rays,[{transform:'scale(.1) rotate(0deg)',opacity:0},{transform:'scale(.7) rotate(70deg)',opacity:1,offset:.45},{transform:'scale(1) rotate(200deg)',opacity:.9}],2000);
    for(let i=0;i<5;i++){
      const r = add('',`left:${cx-80}px;top:${cy-80}px;width:160px;height:160px;border-radius:50%;border:5px solid #fff;box-shadow:0 0 30px #fff,inset 0 0 30px #fff;opacity:0`);
      afx(r,[{transform:'scale(.1)',opacity:1},{transform:'scale(9)',opacity:0}],1300,{delay:i*320});
    }
    const dot = add('',`left:${cx-30}px;top:${cy-30}px;width:60px;height:60px;border-radius:50%;background:#fff;box-shadow:0 0 60px 20px #fff;opacity:0`);
    afx(dot,[{transform:'scale(.1)',opacity:0},{transform:'scale(1)',opacity:1,offset:.5},{transform:'scale(1.6)',opacity:1}],1900);
    await nap(1900);
  } else {
    const fl = add('','inset:0;background:#3b82f6;opacity:0'), sv = add('','inset:0');
    for(let i=0;i<16 && !sk;i++){
      const ls=[];
      for(let j=0;j<3+(i%3);j++){
        const x1=rnd(W*.1,W*.9), x2=cx+rnd(-W*.25,W*.25), y2=rnd(H*.45,H*.85), pts=[[x1,0]];
        for(let q=1;q<9;q++) pts.push([x1+(x2-x1)*q/9+rnd(-35,35), y2*q/9+rnd(-25,25)]);
        pts.push([x2,y2]); ls.push(pts.map(p=>p.map(v=>v.toFixed(0)).join(',')).join(' '));
      }
      sv.innerHTML = `<svg width="${W}" height="${H}">${ls.map(p=>`<polyline points="${p}" fill="none" stroke="#1e40af" stroke-width="12" opacity=".6" stroke-linejoin="round"/><polyline points="${p}" fill="none" stroke="#dbeafe" stroke-width="4" stroke-linejoin="round" style="filter:drop-shadow(0 0 8px #60a5fa) drop-shadow(0 0 18px #3b82f6)"/>`).join('')}</svg>`;
      fl.style.opacity = i%2 ? .5 : .12;
      await nap(110);
      if(i%4===3){ sv.innerHTML=''; fl.style.opacity=0; await nap(90); }
    }
    sv.innerHTML=''; fl.style.opacity=.9; await nap(120);
  }
  const flash = add('',`inset:0;background:${kind==='white'?'#fff':'#93c5fd'};opacity:0;z-index:5`);
  await afx(flash,[{opacity:0},{opacity:1}],kind==='white'?350:250);
  sk = false;
  const v = document.createElement('video');
  v.playsInline = true; v.preload = 'auto'; v.src = await urlP;
  v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000';
  o.insertBefore(v, flash);
  try{ await v.play(); }catch(e){ v.muted = true; try{ await v.play(); }catch(e2){} }
  add('اضغط للتخطي','bottom:10px;left:0;right:0;text-align:center;color:#fff8;font-size:12px;z-index:6;pointer-events:none');
  await afx(flash,[{opacity:1},{opacity:0}],500);
  await new Promise(res => {
    v.onended = res; v.onerror = res;
    const iv = setInterval(() => { if(sk){ clearInterval(iv); res(); } }, 80);
    setTimeout(() => { clearInterval(iv); res(); }, (isFinite(v.duration) ? v.duration : 12)*1000 + 2500);
  });
  v.pause();
  await afx(o,[{opacity:1},{opacity:0}],500);
  o.remove();
}


const arena = () => $('arena');
function rel(el){ const a=arena().getBoundingClientRect(), r=el.getBoundingClientRect(); return {x:r.left-a.left+r.width/2,y:r.top-a.top+r.height/2,w:r.width,h:r.height}; }
function put(html, css){ const d=document.createElement('div'); d.className='fxe'; d.innerHTML=html||''; Object.assign(d.style,css); arena().appendChild(d); return d; }
function go(el, kf, ms, opt={}){ try{ const an=el.animate(kf,{duration:ms/speed,easing:'ease-out',fill:'forwards',...opt}); return an.finished.catch(()=>{}); }catch(e){ return Promise.resolve(); } }
const rm = (...els) => els.forEach(e => e.remove());
const shake = (px=8) => go(arena(),[{transform:'translate(0,0)'},{transform:`translate(${px}px,${-px/2}px)`},{transform:`translate(${-px}px,${px/2}px)`},{transform:`translate(${px/2}px,0)`},{transform:'translate(0,0)'}],400,{fill:'none'});
const C = (x,y,extra='') => `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) ${extra}`;
async function burst(p,col,size=150){
  const b=put('',{left:p.x+'px',top:p.y+'px',width:size+'px',height:size+'px',borderRadius:'50%',background:`radial-gradient(circle,#fff 0%,${col} 35%,transparent 70%)`});
  await go(b,[{transform:C(0,0,'scale(.1)'),opacity:1},{transform:C(0,0,'scale(1.2)'),opacity:0}],420); rm(b);
}
function boltPath(x1,y1,x2,y2){ const n=8,pts=[[x1,y1]]; for(let i=1;i<n;i++) pts.push([x1+(x2-x1)*i/n+rnd(-22,22),y1+(y2-y1)*i/n+rnd(-22,22)]); pts.push([x2,y2]); return pts.map(p=>p.map(v=>v.toFixed(0)).join(',')).join(' '); }
function boltsSVG(lines,col){
  const w=arena().clientWidth,h=arena().clientHeight;
  return `<svg width="${w}" height="${h}" style="position:absolute;inset:0;overflow:visible">${lines.map(l=>`<polyline points="${boltPath(...l)}" fill="none" stroke="#000" stroke-width="9" stroke-linejoin="round" opacity=".6"/><polyline points="${boltPath(...l)}" fill="none" stroke="${col}" stroke-width="4" stroke-linejoin="round" style="filter:drop-shadow(0 0 6px ${col})"/>`).join('')}</svg>`;
}
const FXEMO={rasen:'🌀',fire:'🔥',ice:'❄️',bolt:'⚡',wave:'🌊',rock:'🪨',poison:'☠️',wind:'🌪️',punch:'👊',light:'✨'};

async function playFx(kind, col, a, d){
  if(skip) return;
  const sa=rel($('f'+(a+1))), sd=rel($('f'+(d+1)));
  const dx=sd.x-sa.x, dy=sd.y-sa.y, len=Math.hypot(dx,dy), ang=Math.atan2(dy,dx)*180/Math.PI;
  const W=arena().clientWidth, H=arena().clientHeight;
  switch(kind){
   case 'slash': {
     const els=[0,1,2].map(i=>put('',{left:sd.x-80+'px',top:sd.y-45+i*30+'px',width:'160px',height:'6px',background:`linear-gradient(90deg,transparent,${col},#fff,transparent)`,borderRadius:'4px',boxShadow:`0 0 14px ${col}`,opacity:0}));
     await Promise.all(els.map((e,i)=>go(e,[{transform:'rotate(-35deg) scaleX(0)',opacity:1},{transform:'rotate(-35deg) scaleX(1.2)',opacity:1,offset:.5},{transform:'rotate(-35deg) scaleX(1.2)',opacity:0}],450,{delay:i*90/speed})));
     rm(...els); break; }
   case 'beam': {
     const b=put('',{left:sa.x+'px',top:sa.y-16+'px',width:len+'px',height:'32px',transformOrigin:'0 50%',background:`linear-gradient(90deg,${col}00,${col},#fff 60%,${col})`,borderRadius:'16px',boxShadow:`0 0 28px ${col}`});
     const orb=put('',{left:sa.x+'px',top:sa.y+'px',width:'70px',height:'70px',borderRadius:'50%',background:`radial-gradient(circle,#fff,${col} 60%,transparent 72%)`});
     go(orb,[{transform:C(0,0,'scale(.2)'),opacity:1},{transform:C(0,0,'scale(1.3)'),opacity:1,offset:.6},{transform:C(0,0,'scale(.4)'),opacity:0}],700);
     await go(b,[{transform:`rotate(${ang}deg) scaleX(0)`,opacity:1},{transform:`rotate(${ang}deg) scaleX(1)`,opacity:1,offset:.45},{transform:`rotate(${ang}deg) scaleX(1)`,opacity:1,offset:.75},{transform:`rotate(${ang}deg) scaleX(1) scaleY(.1)`,opacity:0}],700);
     rm(b,orb); await burst(sd,col,170); shake(6); break; }
   case 'haki': {
     const ov=put('',{inset:0,background:`radial-gradient(circle at 50% 50%,${col}66 0%,#000c 80%)`,opacity:0});
     const lines=[]; for(let i=0;i<9;i++) lines.push([sa.x+rnd(-30,30),sa.y+rnd(-30,30),rnd(0,W),rnd(0,H)]); for(let i=0;i<5;i++) lines.push([rnd(0,W),0,sd.x+rnd(-50,50),sd.y+rnd(-50,50)]);
     const sv=put(boltsSVG(lines,col),{inset:0,opacity:0});
     go(ov,[{opacity:0},{opacity:1,offset:.2},{opacity:1,offset:.8},{opacity:0}],1000);
     shake(10);
     await go(sv,[{opacity:0},{opacity:1},{opacity:.2},{opacity:1},{opacity:.3},{opacity:1},{opacity:0}],1000);
     rm(ov,sv); break; }
   case 'bolt': {
     const lines=[0,1,2].map(()=>[sd.x+rnd(-60,60),0,sd.x+rnd(-20,20),sd.y]);
     const fl=put('',{inset:0,background:'#fff',opacity:0}); const sv=put(boltsSVG(lines,col),{inset:0,opacity:0});
     go(fl,[{opacity:.7},{opacity:0}],300);
     await go(sv,[{opacity:1},{opacity:.2},{opacity:1},{opacity:.4},{opacity:1},{opacity:0}],600);
     rm(fl,sv); shake(8); break; }
   case 'dragon': {
     const e=put('🐉',{left:sa.x+'px',top:sa.y+'px',fontSize:'130px',filter:`drop-shadow(0 0 22px ${col}) drop-shadow(0 0 40px ${col})`});
     const dir=Math.sign(dx)||1;
     await go(e,[{transform:C(-dir*60,60,'scale(.3) rotate(-20deg)'),opacity:0},{transform:C(0,-30,'scale(1.1)'),opacity:1,offset:.25},{transform:C(dx,dy,'scale(1.3)'),opacity:1,offset:.65},{transform:C(dx+dir*160,dy-100,'scale(1.6)'),opacity:0}],1200);
     rm(e); await Promise.all([burst(sd,col,220),playFx('fire',col,a,d)]); shake(12); break; }
   case 'shadow': case 'clone': {
     const sil = kind==='shadow';
     const els=Array.from({length:6},(_,i)=>put(sil?'👤':'👥',{left:sa.x+rnd(-70,70)+'px',top:sa.y+rnd(-40,50)+'px',fontSize:'48px',opacity:0,filter:sil?`brightness(0) drop-shadow(0 0 8px ${col}) drop-shadow(0 0 14px ${col})`:`drop-shadow(0 0 10px ${col})`}));
     await Promise.all(els.map((e,i)=>go(e,[{transform:C(0,30,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1,offset:.4},{transform:C(0,0,'scale(1)'),opacity:1,offset:.5},{transform:C(dx*.9,dy*.9,'scale(1.2)'),opacity:0}],900,{delay:i*70/speed})));
     rm(...els); await burst(sd,col,150); break; }
   case 'domain': {
     const ov=put('',{inset:0,background:`radial-gradient(circle,${col}55,#000e 75%)`,opacity:0});
     const rings=[1,2,3].map(i=>put('',{left:W/2+'px',top:H/2+'px',width:'150px',height:'150px',borderRadius:'50%',border:`3px dashed ${col}`,boxShadow:`0 0 24px ${col}`,opacity:0}));
     const sym=put('✦ ✧ ✦ ✧ ✦',{left:W/2+'px',top:H/2+'px',fontSize:'40px',color:col,letterSpacing:'12px',opacity:0,textShadow:`0 0 18px ${col}`,whiteSpace:'nowrap'});
     go(ov,[{opacity:0},{opacity:1,offset:.2},{opacity:1,offset:.8},{opacity:0}],1300);
     go(sym,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1.1)'),opacity:1,offset:.5},{transform:C(0,0,'scale(1.5)'),opacity:0}],1300);
     await Promise.all(rings.map((r,i)=>go(r,[{transform:C(0,0,'scale(.2) rotate(0)'),opacity:.9},{transform:C(0,0,`scale(${3+i}) rotate(${i%2?-180:180}deg)`),opacity:0}],1300,{delay:i*160/speed})));
     rm(ov,sym,...rings); shake(6); break; }
   case 'tf': {
     const fl=put('',{inset:0,background:col,opacity:0});
     const pil=put('',{left:sa.x+'px',top:'0',width:'90px',height:H+'px',background:`linear-gradient(90deg,transparent,${col},#fff,${col},transparent)`,opacity:0});
     const rings=[0,1,2].map(()=>put('',{left:sa.x+'px',top:sa.y+'px',width:'120px',height:'120px',borderRadius:'50%',border:`4px solid ${col}`,boxShadow:`0 0 20px ${col}`,opacity:0}));
     go(fl,[{opacity:0},{opacity:.65,offset:.3},{opacity:0}],1000);
     go(pil,[{transform:'translateX(-50%) scaleX(.1)',opacity:0},{transform:'translateX(-50%) scaleX(1)',opacity:1,offset:.4},{transform:'translateX(-50%) scaleX(.2)',opacity:0}],1000);
     go($('f'+(a+1)).querySelector('.card'),[{transform:'scale(1)'},{transform:'scale(1.15)',filter:'brightness(2.2)',offset:.4},{transform:'scale(1)'}],1000,{fill:'none'});
     shake(8);
     await Promise.all(rings.map((r,i)=>go(r,[{transform:C(0,0,'scale(.3)'),opacity:1},{transform:C(0,0,'scale(3.2)'),opacity:0}],900,{delay:i*150/speed})));
     rm(fl,pil,...rings); break; }
   case 'sun': {
     const ray=put('',{left:sa.x+'px',top:sa.y+'px',width:'520px',height:'520px',borderRadius:'50%',background:`repeating-conic-gradient(${col} 0 8deg,transparent 8deg 22deg)`,maskImage:'radial-gradient(circle,#000 25%,transparent 70%)',WebkitMaskImage:'radial-gradient(circle,#000 25%,transparent 70%)',opacity:0});
     await go(ray,[{transform:C(0,0,'scale(.2) rotate(0)'),opacity:0},{transform:C(0,0,'scale(1) rotate(90deg)'),opacity:.95,offset:.5},{transform:C(0,0,'scale(1.4) rotate(180deg)'),opacity:0}],1000);
     rm(ray); await playFx('beam',col,a,d); break; }
   case 'heal': {
     const els=Array.from({length:10},()=>put('✚',{left:sa.x+rnd(-60,60)+'px',top:sa.y+rnd(0,50)+'px',fontSize:'26px',color:col,textShadow:`0 0 10px ${col}`,opacity:0}));
     await Promise.all(els.map((e,i)=>go(e,[{transform:C(0,20),opacity:0},{transform:C(0,-30),opacity:1,offset:.4},{transform:C(0,-90),opacity:0}],900,{delay:i*60/speed})));
     rm(...els); break; }
   case 'shield': {
     const s=put('',{left:sa.x+'px',top:sa.y+'px',width:'190px',height:'190px',borderRadius:'50%',border:`4px solid ${col}`,background:`radial-gradient(circle,${col}11,${col}55)`,boxShadow:`0 0 30px ${col}`,opacity:0});
     await go(s,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1,offset:.4},{transform:C(0,0,'scale(1.05)'),opacity:0}],750); rm(s); break; }
   case 'buff': {
     const r=put('',{left:sa.x+'px',top:sa.y+'px',width:'140px',height:'140px',borderRadius:'50%',border:`4px solid ${col}`,boxShadow:`0 0 24px ${col}`,opacity:0});
     const ar=Array.from({length:6},()=>put('⬆',{left:sa.x+rnd(-55,55)+'px',top:sa.y+rnd(0,40)+'px',fontSize:'28px',color:col,textShadow:`0 0 10px ${col}`,opacity:0}));
     go(r,[{transform:C(0,0,'scale(.4)'),opacity:1},{transform:C(0,0,'scale(1.8)'),opacity:0}],750);
     await Promise.all(ar.map((e,i)=>go(e,[{transform:C(0,20),opacity:0},{transform:C(0,-40),opacity:1,offset:.5},{transform:C(0,-80),opacity:0}],750,{delay:i*60/speed})));
     rm(r,...ar); break; }
   case 'rain': {
     const em = col==='#a3a3a3' ? '🪨' : '⚔️';
     const els=Array.from({length:10},()=>put(em,{left:sd.x+rnd(-80,80)+'px',top:'0',fontSize:'34px',opacity:0,filter:`drop-shadow(0 0 10px ${col})`}));
     const gate=put('',{left:sa.x+'px',top:sa.y-60+'px',width:'160px',height:'60px',borderRadius:'50%',border:`3px solid ${col}`,boxShadow:`0 0 20px ${col}`,opacity:0});
     go(gate,[{transform:C(0,0,'scale(.2)'),opacity:1},{transform:C(0,0,'scale(1)'),opacity:1,offset:.5},{opacity:0}],900);
     await Promise.all(els.map((e,i)=>go(e,[{transform:C(0,-20),opacity:1},{transform:C(0,sd.y+10),opacity:1,offset:.85},{transform:C(0,sd.y+10),opacity:0}],600,{delay:i*70/speed})));
     rm(gate,...els); await burst(sd,col,200); shake(8); break; }
   case 'boom': {
     const e=put('💥',{left:sd.x+'px',top:sd.y+'px',fontSize:'110px',filter:`drop-shadow(0 0 20px ${col})`});
     const f=put('',{inset:0,background:col,opacity:0}); go(f,[{opacity:.35},{opacity:0}],350);
     shake(12);
     await go(e,[{transform:C(0,0,'scale(.2)'),opacity:1},{transform:C(0,0,'scale(1.4)'),opacity:1,offset:.5},{transform:C(0,0,'scale(1.7)'),opacity:0}],600); rm(e,f); break; }
   case 'fire': {
     const els=Array.from({length:9},()=>put('🔥',{left:sd.x+rnd(-55,55)+'px',top:sd.y+rnd(10,60)+'px',fontSize:'38px',opacity:0,filter:`drop-shadow(0 0 12px ${col})`}));
     const g=put('',{left:sd.x+'px',top:sd.y+'px',width:'200px',height:'200px',borderRadius:'50%',background:`radial-gradient(circle,${col}aa,transparent 70%)`,opacity:0});
     go(g,[{transform:C(0,0,'scale(.3)'),opacity:1},{transform:C(0,0,'scale(1.3)'),opacity:0}],700);
     await Promise.all(els.map((e,i)=>go(e,[{transform:C(0,20,'scale(.4)'),opacity:0},{transform:C(0,-30,'scale(1.1)'),opacity:1,offset:.4},{transform:C(0,-90,'scale(.7)'),opacity:0}],750,{delay:i*45/speed})));
     rm(g,...els); break; }
   case 'ice': {
     const els=Array.from({length:10},(_,i)=>{const t=i/10*Math.PI*2; return [put('❄️',{left:sd.x+'px',top:sd.y+'px',fontSize:'34px',opacity:0,filter:`drop-shadow(0 0 10px ${col})`}),Math.cos(t)*80,Math.sin(t)*80];});
     const g=put('',{left:sd.x+'px',top:sd.y+'px',width:'200px',height:'200px',borderRadius:'50%',background:`radial-gradient(circle,#fff,${col}99,transparent 70%)`,opacity:0});
     go(g,[{transform:C(0,0,'scale(.2)'),opacity:1},{transform:C(0,0,'scale(1.3)'),opacity:0}],700);
     await Promise.all(els.map(([e,x,y])=>go(e,[{transform:C(0,0,'scale(.3)'),opacity:1},{transform:C(x,y,'scale(1.2) rotate(180deg)'),opacity:0}],750)));
     rm(g,...els.map(x=>x[0])); break; }
   case 'kick': {
     const card=$('f'+(a+1)).querySelector('.card');
     go(card,[{transform:'translate(0,0)'},{transform:`translate(${dx*.55}px,${dy*.55}px) rotate(${dx>0?12:-12}deg) scale(1.12)`,offset:.4},{transform:'translate(0,0)'}],500,{fill:'none'});
     const tr=put('',{left:sa.x+'px',top:sa.y-12+'px',width:len+'px',height:'24px',transformOrigin:'0 50%',background:`linear-gradient(90deg,transparent,${col}cc)`,borderRadius:'12px',filter:`blur(2px)`});
     go(tr,[{transform:`rotate(${ang}deg) scaleX(0)`,opacity:1},{transform:`rotate(${ang}deg) scaleX(1)`,opacity:1,offset:.5},{transform:`rotate(${ang}deg) scaleX(1)`,opacity:0}],450);
     await wait(200);
     const e=put('🦵',{left:sd.x+'px',top:sd.y+'px',fontSize:'84px',filter:`drop-shadow(0 0 14px ${col})`});
     await go(e,[{transform:C(0,0,'scale(.3) rotate(-30deg)'),opacity:1},{transform:C(0,0,'scale(1.3) rotate(10deg)'),opacity:1,offset:.5},{transform:C(0,0,'scale(1.6)'),opacity:0}],450);
     rm(e,tr); await burst(sd,col,140); shake(7); break; }
   case 'kickfire': { await playFx('kick',col,a,d); await playFx('fire',col,a,d); break; }
   case 'punch': {
     const card=$('f'+(a+1)).querySelector('.card');
     go(card,[{transform:'translate(0,0)'},{transform:`translate(${dx*.5}px,${dy*.5}px) scale(1.12)`,offset:.4},{transform:'translate(0,0)'}],450,{fill:'none'});
     await wait(180);
     const e=put('👊',{left:sd.x+'px',top:sd.y+'px',fontSize:'80px',filter:`drop-shadow(0 0 14px ${col})`});
     await go(e,[{transform:C(0,0,'scale(.3)'),opacity:1},{transform:C(0,0,'scale(1.3)'),opacity:1,offset:.5},{transform:C(0,0,'scale(1.6)'),opacity:0}],450);
     rm(e); await burst(sd,col,130); shake(7); break; }
   default: {
     const emo = FXEMO[kind]; if(!emo){ return playFx('beam',col,a,d); }
     const big = kind==='wave'||kind==='rock';
     const e=put(emo,{left:sa.x+'px',top:sa.y+'px',fontSize:(big?70:48)+'px',filter:`drop-shadow(0 0 14px ${col})`});
     await go(e,[{transform:C(0,0,'scale(.4) rotate(0)'),opacity:1},{transform:C(dx,dy,'scale(1.2) rotate(540deg)'),opacity:1,offset:.85},{transform:C(dx,dy,'scale(1.6) rotate(560deg)'),opacity:0}],650);
     rm(e); await burst(sd,col,150); shake(6); }
  }
}
function floatText(k, txt, color){
  if(skip) return;
  const p=rel($('f'+(k+1)));
  const e=put(txt,{left:p.x+'px',top:p.y-20+'px',fontSize:'30px',fontWeight:900,color,textShadow:'0 2px 8px #000',whiteSpace:'nowrap',zIndex:30});
  go(e,[{transform:C(0,0),opacity:1},{transform:C(0,-70),opacity:0}],1000).then(()=>e.remove());
}

const IDS=["gojo", "sukuna", "goku", "saitama", "luffy", "kaido", "naruto", "madara", "ichigo", "aizen", "zeno", "whis", "feather", "anos", "rimuru", "beerus", "vegito", "gogeta", "yhwach", "kaguya", "shadow", "jinwoo", "imu", "escanor", "melio", "lucius", "ainz", "acno", "hago", "jiren", "blast", "garou", "broly", "muzan", "wbeard", "roger", "rocks", "zeref", "merlin", "zeldris", "gilgamesh", "ashborn", "meruem", "hashirama", "yama", "eren", "raizel", "shanks", "zoro", "dokja"],NMAP={"gojo": "Gojo", "sukuna": "Sukuna", "goku": "Goku", "saitama": "Saitama", "luffy": "Joy Boy Luffy", "kaido": "Kaido", "naruto": "Naruto", "madara": "Madara", "ichigo": "Ichigo", "aizen": "Aizen", "zeno": "Zeno", "whis": "Whis", "feather": "Featherine", "anos": "Anos", "rimuru": "Rimuru", "beerus": "Beerus", "vegito": "Vegito Blue", "gogeta": "Gogeta", "yhwach": "Yhwach", "kaguya": "Kaguya", "shadow": "Shadow", "jinwoo": "Sung Jin-Woo", "imu": "Imu", "escanor": "Escanor", "melio": "Meliodas", "lucius": "Lucius Zogratis", "ainz": "Ainz Ooal Gown", "acno": "Acnologia", "hago": "Hagoromo", "jiren": "Jiren", "blast": "Blast", "garou": "Cosmic Garou", "broly": "Broly", "muzan": "Muzan", "wbeard": "Whitebeard", "roger": "Gol D. Roger", "rocks": "Rocks D. Xebec", "zeref": "Zeref", "merlin": "Merlin", "zeldris": "Zeldris", "gilgamesh": "Gilgamesh", "ashborn": "Ashborn", "meruem": "Meruem", "hashirama": "Hashirama", "yama": "Yamamoto", "eren": "Eren (Founder)", "raizel": "Raizel", "shanks": "Shanks", "zoro": "Zoro", "dokja": "Kim Dokja"};
const C0=[
['saitama','Saitama','#fde047','','pnmf','',[['لكمة جادة','K',0,'p','pn',4],['لكمات متتالية','A',28,'p','pn',0],['تفادي','G',0,'p','gd',1]]],
['goku','Goku','#fb923c','','n','',[['غريزة فائقة','G',0,'p','gd',1],['كاميهاميها','A',36,'n','bm',3],['ضربة لحظية','A',24,'p','pn',0]]],
['luffy','Joy Boy Luffy','#fbbf24','p','nm','',[['جير 5 — واقع كرتوني','A',34,'r','pn',3],['هاكي الملوك','S',0,'s','au',2],['جيجانت','A',26,'p','pn',0]]],
['gojo','Gojo Satoru','#60a5fa','pnf','m','s',[['أرجواني','A',42,'n','bm',4],['الفراغ اللامحدود','S',0,'r','rw',3],['اللانهاية','G',0,'p','gd',1]]],
['sukuna','Sukuna','#dc2626','','pn','',[['ساحة مالفولنت','A',40,'p','sl',4],['فوغا','A',32,'f','fi',2],['تقطيع','A',24,'p','sl',0]]],
['madara','Madara Uchiha','#b91c1c','','nf','',[['ميتيور','A',38,'n','bl',3],['سوسانو','G',0,'p','gd',2],['ريكودو','S',0,'s','sm',3]]],
['aizen','Aizen','#8b5cf6','','m','',[['كيوكا سويغيتسو','S',0,'r','rw',3],['كيدو','A',30,'m','bm',2],['هوجيوكو','H',40,'s','hl',3]]],
['ichigo','Ichigo','#f97316','','m','',[['موغيتسو','A',38,'n','sl',3],['هولو فاستو','A',24,'n','sl',1],['شونكو','G',0,'p','gd',1]]],
['kaido','Kaido','#2563eb','p','pn','',[['نفس البلازما','A',34,'f','fi',3],['جسد التنين','G',0,'p','gd',1],['هاكي صلب','A',26,'p','pn',0]]],
['naruto','Naruto','#f59e0b','','n','',[['ريسين شوريكين','A',36,'n','bl',3],['استنساخ الظل','A',22,'p','sm',1],['وضع باريون','B',50,'n','au',3]]]
,['zeno','Zeno','#e879f9','pnmft','ter','',[['محو الكون','K',0,'e','er',5],['الضربة المطلقة','A',30,'p','pn',1],['موجة المحو','A',22,'n','bm',0]]],
['whis','Whis','#60a5fa','n','ptme','',[['إعادة الزمن','H',60,'t','tm',4],['الضربة الهادئة','A',26,'p','pn',1],['ضربة الملاك','A',20,'e','er',3]]],
['feather','Featherine','#f472b6','rm','pn','',[['إعادة كتابة الواقع','K',0,'r','rw',5],['معجزة','A',24,'m','bm',1],['رجوع الحكاية','H',40,'r','hl',3]]],
['anos','Anos Voldigoad','#a78bfa','m','pn','',[['مرآة ريغريد','G',0,'m','gd',2],['إبادة النار','A',30,'m','bl',1],['تدمير المنطق','K',0,'e','er',6]]],
['rimuru','Rimuru Tempest','#38bdf8','pn','nmf','',[['أزاثوث','K',0,'e','er',5],['افتراس','A',22,'p','sm',1],['تجدد','H',45,'m','hl',3]]]
,['beerus','Beerus','#c084fc','m','pn','s',[['هاكاي','K',0,'e','er',5],['كرة التدمير','A',32,'n','bl',2],['ضربة قط','A',20,'p','pn',0]]],
['vegito','Vegito Blue','#38bdf8','','n','',[['فيجن كاميهاميها','A',38,'n','bm',3],['سيف الروح','A',24,'s','sl',1],['ضربة اندماج','A',22,'p','pn',0]]],
['gogeta','Gogeta','#22d3ee','','n','',[['ستار دراغون بريك','A',40,'n','bl',4],['ضربة اندماج','A',24,'p','pn',0],['تعزيز السوبر','B',50,'n','au',2]]],
['yhwach','Yhwach','#e2e8f0','e','m','p',[['الرؤية المطلقة','G',0,'t','gd',1],['امتصاص المستقبل','K',0,'t','tm',5],['فضاء الأنفاس','A',28,'s','bl',1]]],
['kaguya','Kaguya','#cbd5e1','p','nm','',[['نقل الأبعاد','G',0,'r','rw',1],['عظام الدمار','A',28,'p','sl',1],['تسوكيومي اللانهائي','K',0,'s','rw',5]]],
['shadow','Shadow','#6366f1','p','mn','',[['أتومك','K',0,'n','bl',5],['شفرة الظلام','A',28,'p','sl',1],['حركة خاطفة','G',0,'p','gd',1]]],
['jinwoo','Sung Jin-Woo','#7c3aed','m','pn','',[['جيش الظلال','A',32,'m','sm',2],['سيادة الملك','S',0,'m','au',3],['ضربة الملك','A',26,'p','sl',0]]],
['imu','Imu','#991b1b','r','pm','',[['الإزالة من الوجود','K',0,'e','er',5],['ظلال الحاكم','A',28,'m','sm',1],['لهب ساطع','A',24,'f','fi',1]]],
['escanor','Escanor','#f59e0b','f','pn','s',[['الشمس المطلقة','K',0,'f','fi',5],['ضربة شمسية','A',34,'f','bm',2],['الفأس الأسطوري','A',24,'p','sl',0]]],
['melio','Meliodas','#ef4444','m','p','',[['الانتقام الكامل','G',0,'p','gd',1],['لهب الغضب','A',32,'f','fi',2],['لكمة الظلام','A',24,'m','pn',0]]],
['lucius','Lucius Zogratis','#f43f5e','t','m','',[['إيقاف الزمن','S',0,'t','tm',3],['منطقة المانا','A',28,'m','bl',1],['إعادة الزمن','H',40,'t','tm',4]]],
['ainz','Ainz Ooal Gown','#a1a1aa','m','nf','p',[['وورلد دزاستر','K',0,'m','er',6],['ضربة العدم','A',30,'m','bl',2],['إيقاف الزمن','S',0,'t','tm',3]]],
['acno','Acnologia','#1e293b','mn','pf','',[['زئير الإبادة','A',40,'n','bm',3],['مخلب','A',24,'p','sl',0],['جسد التنين','G',0,'p','gd',1]]],
['hago','Hagoromo','#f8fafc','n','m','',[['طريق الصلصال','A',30,'m','bl',2],['حاجز التشاكرا','G',0,'n','gd',1],['ختم القمر','S',0,'s','au',3]]],
['jiren','Jiren','#dc2626','','pn','',[['حرارة الإرادة','A',34,'n','bm',3],['ضغط الإرادة','G',0,'p','gd',1],['لكمة','A',24,'p','pn',0]]],
['blast','Blast','#94a3b8','','p','',[['بوابة الأبعاد','G',0,'r','rw',1],['ضربة بلاست','A',30,'n','bl',2],['ضربة','A',24,'p','pn',0]]],
['garou','Cosmic Garou','#a855f7','','p','',[['نسخ القوى','B',50,'r','au',2],['ضربة كونية','A',34,'n','bl',3],['فن المحاكاة','G',0,'p','gd',1]]],
['broly','Broly','#22c55e','','p','',[['غضب أسطوري','A',38,'n','bl',3],['لكمة','A',24,'p','pn',0],['جسد متصاعد','B',45,'p','au',2]]],
['muzan','Muzan','#be123c','p','','f',[['تجدد مطلق','H',55,'p','hl',2],['حشود','A',26,'p','sl',1],['سم الدم','A',28,'m','sm',2]]],
['wbeard','Whitebeard','#e5e7eb','','p','',[['غورا غورا — زلزال','A',38,'p','pn',3],['درع الهاكي','G',0,'p','gd',1],['ضربة هواء','A',22,'p','pn',0]]],
['roger','Gol D. Roger','#facc15','','p','',[['صوت كل شيء','G',0,'s','gd',1],['هاكي الملوك','S',0,'s','au',2],['سيف إيس','A',34,'p','sl',2]]],
['rocks','Rocks D. Xebec','#b91c1c','','pn','',[['إرادة الفوضى','B',50,'p','au',2],['سحق السفن','A',36,'p','pn',2],['هاكي عنيف','S',0,'s','au',3]]],
['zeref','Zeref','#374151','m','','s',[['إنكانتوس','K',0,'m','er',5],['موجة الظلام','A',30,'m','bm',2],['خلود','H',50,'s','hl',3]]],
['merlin','Merlin','#a78bfa','m','n','',[['عالم منعكس','G',0,'m','gd',2],['ميتيور لانهائي','A',34,'m','bl',3],['سحر الزمن','S',0,'t','tm',3]]],
['zeldris','Zeldris','#7f1d1d','m','p','',[['انفجار اللهب','A',36,'f','fi',3],['ملك الظلام','B',40,'m','au',2],['ضربة وحشية','A',24,'p','sl',0]]],
['gilgamesh','Gilgamesh','#fbbf24','','pn','',[['بوابة بابل','A',34,'p','bm',2],['إيا — شق العالم','K',0,'r','rw',6],['درع الذهب','G',0,'p','gd',1]]],
['ashborn','Ashborn','#312e81','m','p','',[['حكم الظلال','S',0,'s','sm',3],['قطع ملكي','A',32,'p','sl',2],['جيش الأرواح','A',26,'m','sm',1]]],
['meruem','Meruem','#84cc16','','pn','',[['تكيّف','G',0,'p','gd',1],['ضربة ملكية','A',32,'p','pn',2],['هالة النين','A',24,'n','bm',1]]],
['hashirama','Hashirama','#16a34a','','p','',[['العملاق الخشبي','A',34,'p','pn',3],['غابة الحياة','H',45,'p','hl',2],['حصن الخشب','G',0,'p','gd',1]]],
['yama','Yamamoto','#ea580c','f','n','',[['زانكا نو تاشي','K',0,'f','fi',5],['حرق متواصل','A',32,'f','fi',2],['ضربة سيف','A',22,'p','sl',0]]],
['eren','Eren (Founder)','#7c2d12','','p','',[['الرامبل','A',40,'p','pn',4],['تيتان الحرب','A',28,'p','pn',2],['صرخة المسارات','S',0,'s','au',3]]],
['raizel','Raizel','#ef4444','m','pn','',[['رمح الروح','K',0,'s','sl',5],['قيود الدم','S',0,'s','au',2],['سيطرة الدم','A',30,'m','bm',2]]],
['shanks','Shanks','#dc2626','','p','',[['هاكي الملوك','S',0,'s','au',2],['سيف حاد','A',32,'p','sl',2],['صدّ','G',0,'p','gd',1]]],
['zoro','Zoro','#16a34a','','p','',[['أسورا — ثلاثة سيوف','A',34,'p','sl',3],['قطع الفراغ','A',26,'p','sl',1],['هاكي الدرع','G',0,'p','gd',1]]],
['dokja','Kim Dokja','#38bdf8','r','m','',[['الحقيقة المطلقة','B',50,'r','au',2],['قصة الزمن','A',30,'r','rw',2],['درع القصة','G',0,'r','gd',1]]]
];
const EXT={
wbeard:[['غورا غورا — زلزال','A',46,'p','qk',3,'غورا غورا!'],['درع الهاكي','G',0,'p','gd',1,'لا شيء يخترقني.'],['ضربة هواء','A',28,'p','pn',0,'تلقَّ هذا.'],['شقّ الفضاء','K',0,'p','qk',5,'سأحطّم العالم.'],['هاكي الملوك','S',0,'s','au',3,'لن أتراجع.'],['عزيمة الأب','H',40,'s','hl',3,'أبنائي ينتظرونني.']],
roger:[['صوت كل شيء','G',0,'s','gd',1,'أسمع حركتك.'],['هاكي الملوك','S',0,'s','au',2,'اركعوا.'],['سيف إيس','A',46,'p','sl',2,'سيف إيس!'],['هاكي التسليح الأسود','B',50,'p','au',2,'هاكي أسود.'],['الرحيل الأعظم','A',60,'p','sl',4,'الرحيل الأعظم!'],['ضحكة الحرية','H',45,'s','hl',3,'ها ها ها! الحرية!']],
rocks:[['إرادة الفوضى','B',50,'p','au',2,'العالم لي.'],['سحق السفن','A',45,'p','pn',2,'سحق!'],['هاكي عنيف','S',0,'s','au',2,'اخضعوا.'],['زلزال القراصنة','A',46,'p','qk',3,'إلى البحر!'],['درع الأطلال','G',0,'p','gd',1,'لن تمرّ.'],['طموح الحاكم','K',0,'p','qk',4,'سأحكم كل شيء!']],
zeref:[['إنكانتوس','K',0,'m','mc',5,'لا أصلح للبقاء.'],['موجة الظلام','A',30,'m','bm',2,'موجة الظلام.'],['خلود','H',50,'s','hl',3,'لا أموت.'],['سحر الموت','A',34,'s','sm',3,'الموت يلاحقك.'],['درع الظلام','G',0,'m','gd',1,'لعنتي تحميني.'],['آلاف التعاويذ','A',38,'m','mc',4,'آلاف التعاويذ!']],
merlin:[['عالم منعكس','G',0,'m','gd',2,'العالم يعكسك.'],['ميتيور لانهائي','A',40,'m','bl',3,'ميتيور!'],['سحر الزمن','S',0,'t','tm',2,'توقّف.'],['سحر الوجود','A',32,'m','mc',2,'سحر الوجود.'],['إعادة الزمن','H',45,'t','tm',3,'لنعد للوراء.'],['سحر الفناء','K',0,'m','mc',4,'حان وقت النهاية.']],
zeldris:[['انفجار اللهب','A',44,'f','fi',3,'انفجار!'],['ملك الظلام','B',40,'m','au',2,'سأحكمهم جميعاً.'],['ضربة وحشية','A',24,'p','sl',0,'وحشية.'],['سيف القمر','A',39,'p','sl',3,'سيف القمر!'],['درع الوصايا','G',0,'m','gd',1,'درع الوصي.'],['هالة الإبادة','S',0,'s','au',2,'اركع.']],
gilgamesh:[['بوابة بابل','A',30,'p','rn',2,'اسقطي.'],['إيا — شق العالم','K',0,'r','rw',7,'إيا!'],['درع الذهب','G',0,'p','gd',1,'لا يليق بي.'],['إنكيدو — سلاسل السماء','S',0,'p','sl',3,'اركع!'],['كنوز لا تنتهي','B',40,'p','au',2,'كنوزي بلا حدود.'],['إكسير الخلود','H',22,'m','hl',3,'كنزي يشفيني.']],
ashborn:[['حكم الظلال','S',0,'s','sm',3,'اخضعوا لحكمي.'],['قطع ملكي','A',32,'p','sl',2,'قطع ملكي.'],['جيش الأرواح','A',26,'m','sm',1,'انهضوا يا جنودي.'],['درع الظلال','G',0,'s','gd',1,'ظلالي حولي.'],['انبعاث الجنود','H',40,'s','hl',3,'عودوا إليّ.'],['أمر الملك','K',0,'s','sm',6,'تحرّروا!']],
meruem:[['تكيّف','G',0,'p','gd',1,'تكيّفتُ.'],['ضربة ملكية','A',36,'p','pn',2,'ضربة ملكية!'],['هالة النين','A',24,'n','bm',1,'هالتي تسحقك.'],['تجدد الملك','H',40,'p','hl',3,'جسدي يتجدد.'],['إدراك الملك','B',45,'n','au',2,'أرى كل شيء.'],['قصف النين','A',46,'n','bm',3,'قصف الملك!']],
hashirama:[['العملاق الخشبي','A',50,'p','pn',2,'العملاق الخشبي!'],['غابة الحياة','H',55,'p','hl',2,'غابتي تشفيني.'],['حصن الخشب','G',0,'p','gd',1,'حصني لا يُخترق.'],['أغصان الغابة','A',40,'p','wd',1,'أغصان!'],['وضع الحكيم','B',50,'n','au',2,'طاقة الطبيعة.'],['سحر الخشب العميق','S',0,'s','wd',3,'اثبت مكانك.']],
yama:[['زانكا نو تاشي','K',0,'f','fi',5,'زانكا نو تاشي!'],['حرق متواصل','A',36,'f','fi',2,'احترق.'],['ضربة سيف','A',22,'p','sl',0,'ضربة.'],['درع اللهب','G',0,'f','gd',1,'لهبي حولي.'],['بانكاي — لهب الشمس','B',45,'f','au',2,'بانكاي!'],['جدار النار','A',40,'f','fi',3,'جدار النار!']],
eren:[['الرامبل','A',52,'p','qk',3,'الرامبل!'],['تيتان الحرب','A',36,'p','pn',2,'تيتان الحرب!'],['صرخة المسارات','S',0,'s','au',3,'تحرّكوا!'],['جسد المؤسس','H',55,'p','hl',3,'جسدي يتجدد.'],['تصلّب التيتان','G',0,'p','gd',1,'تصلّب.'],['الرامبل الأخير','K',0,'p','qk',5,'سأمحو العالم!']],
raizel:[['رمح الروح','K',0,'s','sl',6,'رمح الروح!'],['قيود الدم','S',0,'s','au',2,'قيودي حولك.'],['سيطرة الدم','A',30,'m','bm',2,'دمك لي.'],['جسد النبيل','H',30,'s','hl',3,'جسدي يستعيد نفسه.'],['درع الدم','G',0,'m','gd',1,'درعي دم.'],['شكل الحرية','B',35,'s','au',3,'أُطلقُ قوتي.']],
shanks:[['هاكي الملوك','S',0,'s','au',2,'اثبت.'],['سيف حاد','A',48,'p','sl',1,'سيف حاد.'],['صدّ','G',0,'p','gd',1,'لن تمرّ.'],['غريفون','A',56,'p','xs',2,'غريفون!'],['هاكي التسليح','B',50,'p','au',1,'هاكي أسود.'],['تحمّل الإمبراطور','H',45,'s','hl',3,'ما زلتُ واقفاً.']],
zoro:[['أسورا — ثلاثة سيوف','A',42,'p','xs',3,'أسورا!'],['قطع الفراغ','A',34,'p','sl',1,'قطع الفراغ.'],['هاكي الدرع','G',0,'p','gd',1,'هاكي الدرع.'],['ساندورو: ألف سيف','A',52,'p','xs',3,'ساندورو!'],['هاكي الغزو الملكي','B',40,'s','au',2,'هاكي الملوك.'],['ضربة التسعة سيوف','K',0,'p','xs',4,'أسورا: تسعة سيوف!']],
dokja:[['الحقيقة المطلقة','B',50,'r','au',2,'أعرف نهاية القصة.'],['قصة الزمن','A',30,'r','rw',2,'قصة الزمن.'],['درع القصة','G',0,'r','gd',1,'درع القصة.'],['شخصية خيالية','H',40,'r','hl',3,'قصتي لا تنتهي.'],['أبطال الأساطير','A',36,'r','mc',3,'أبطال الأساطير!'],['نهاية القصة','K',0,'r','rw',6,'القصة الأخيرة!']],
jiren:[['حرارة الإرادة','A',42,'n','bm',3,'حرارة الإرادة!'],['ضغط الإرادة','G',0,'p','gd',1,'لن تتحرك.'],['لكمة','A',30,'p','pn',0,'ها.'],['وضع القوة الكاملة','B',45,'n','au',2,'لا حدود.'],['الانفجار الأحمر','K',0,'n','bl',4,'كل شيء... احترق.'],['نظرة الضغط','S',0,'p','au',3,'ثبتّك.']],
blast:[['بوابة الأبعاد','G',0,'r','rw',1,'مررتُ.'],['ضربة بلاست','A',30,'n','bl',2,'ضربة.'],['ضربة','A',24,'p','pn',0,'ها.'],['الضربة الكونية','K',0,'n','bl',5,'انتهى.'],['ترميم','H',35,'r','hl',3,'عدتُ.'],['قفزة الأبعاد','S',0,'r','rw',3,'ستُسحب.']],
garou:[['نسخ القوى','B',50,'r','au',2,'قوتك صارت لي.'],['ضربة كونية','A',34,'n','bl',3,'ضربة كونية!'],['فن المحاكاة','G',0,'p','gd',1,'حفظتُ حركتك.'],['وحش الأبطال','A',26,'p','pn',0,'أنا الوحش.'],['قبضة المجرة','K',0,'n','bl',6,'قبضة المجرة!'],['تجدد الوحش','H',40,'p','hl',3,'أقوى بعد كل ضربة.']],
broly:[['غضب أسطوري','A',42,'n','bl',3,'غرااااه!'],['لكمة','A',32,'p','pn',0,'تحطّم.'],['جسد متصاعد','B',50,'p','au',2,'قوتي لا تتوقف.'],['إيريزر كانون','A',44,'n','bm',4,'إيريزر كانون!'],['جلد الوحش','G',0,'p','gd',1,'لا شيء يخدشني.'],['ضربة الإبادة','K',0,'n','bl',4,'مت!']],
muzan:[['تجدد مطلق','H',48,'p','hl',3,'أنا كامل.'],['حشود','A',26,'p','sl',1,'مزّقوه.'],['سم الدم','A',28,'m','sm',2,'دمي سم.'],['سياط اللحم','A',34,'p','sl',3,'سياطي لا تنتهي.'],['تحوّل الوحش','B',40,'p','au',3,'هذا شكلي الحقيقي.'],['هروب الأشلاء','G',0,'p','gd',1,'لن تقتل ما تفرّق.']],
melio:[['الانتقام الكامل','G',0,'p','gd',1,'سأردّها لك مضاعفة!'],['لهب الغضب','A',32,'f','fi',2,'لهب الغضب!'],['لكمة الظلام','A',24,'m','pn',0,'خذها.'],['وضع الغضب','B',45,'m','au',2,'سأريك جانبي المظلم.'],['اللهب الأخير','K',0,'m','er',5,'اللهب يبتلعك.'],['تجدد الغضب','H',40,'m','hl',3,'لن أسقط بهذه السهولة.']],
lucius:[['إيقاف الزمن','S',0,'t','tm',3,'ثانية واحدة تكفي.'],['منطقة المانا','A',36,'m','bl',1,'منطقتي.'],['إعادة الزمن','H',40,'t','tm',3,'لنعد قليلاً.'],['ضربة الزمن','A',40,'t','tm',2,'لم ترَ الضربة.'],['درع المانا','G',0,'m','gd',1,'مانا بلا ثغرات.'],['فناء الزمن','K',0,'t','tm',5,'الزمن... يُلغى.']],
ainz:[['وورلد دزاستر','K',0,'m','er',6,'وورلد دزاستر.'],['ضربة العدم','A',34,'s','bl',2,'العدم.'],['إيقاف الزمن','S',0,'t','tm',3,'زمنك انتهى.'],['حاجز السحر المطلق','G',0,'m','gd',2,'لا سحر يمرّ.'],['استدعاء الجنود الموتى','A',28,'p','sm',1,'انهضوا أيها الموتى.'],['تعزيز السحر','B',45,'m','au',2,'سحري يتضاعف.']],
acno:[['زئير الإبادة','A',40,'n','bm',3,'زئير الإبادة!'],['مخلب','A',24,'p','sl',0,'تمزّق.'],['جسد التنين','G',0,'p','gd',1,'حراشفي لا تُخترق.'],['هالة الرعب','S',0,'s','au',3,'ارتجف.'],['نفس الفناء','K',0,'f','fi',6,'احترق مع العالم.'],['تجدد التنين','H',35,'p','hl',3,'جسدي يلتئم.']],
hago:[['طريق الصلصال','A',30,'m','bl',2,'طريق الصلصال.'],['حاجز التشاكرا','G',0,'n','gd',1,'حاجزي.'],['كرات الحقيقة','A',34,'m','sm',3,'كرات الحقيقة.'],['وضع الحكيم','B',45,'n','au',2,'طاقة الطبيعة.'],['هالة الحكيم','S',0,'s','au',3,'اهدأ.'],['ختم القمر','K',0,'s','rw',6,'نمْ في القمر.']],
shadow:[['أتومك','K',0,'n','bl',5,'أتـوووميك!'],['شفرة الظلام','A',28,'p','sl',1,'شفرة الظلام.'],['حركة خاطفة','G',0,'p','gd',1,'تأخرتَ.'],['ثقب الظل','A',32,'n','bl',3,'الظلام يبتلعك.'],['ترميم السلايم','H',40,'m','hl',3,'كل شيء حسب الخطة.'],['هيمنة الظلال','B',45,'s','au',2,'الظل يقوّيني.']],
jinwoo:[['جيش الظلال','A',32,'m','sm',2,'انهضوا!'],['سيادة الملك','S',0,'m','au',3,'اخضعوا.'],['ضربة الملك','A',26,'p','sl',0,'خنجر الملك.'],['درع الظلال','G',0,'m','gd',1,'ظلالي تحميني.'],['تجدد الظل','H',40,'s','hl',3,'ظلّي يتجدد.'],['نطاق الملك: الانهيار','K',0,'s','er',6,'كل شيء... يسقط.']],
imu:[['الإزالة من الوجود','K',0,'e','er',5,'لا وجود لك.'],['ظلال الحاكم','A',28,'m','sm',1,'ظلالي تأتي.'],['لهب العرش','A',24,'f','fi',1,'احترق.'],['عرش لا يُمسّ','G',0,'r','gd',2,'العرش لا يُمسّ.'],['استدعاء الحكماء','A',30,'p','sm',2,'ليأتِ الحكماء.'],['ختم الأفكار','S',0,'s','au',3,'فكّرتَ... وانتهى.']],
escanor:[['الشمس المطلقة','K',0,'f','fi',5,'سانشاين!'],['ضربة شمسية','A',34,'f','bm',2,'حرارتي أكبر.'],['فأس الشمس','A',24,'p','sl',0,'خذ فأسي.'],['ذا ون','B',50,'f','au',3,'الآن... الظهيرة!'],['كروزيل صن','A',38,'f','bl',4,'كروزيل صن!'],['درع الوهج','G',0,'f','gd',1,'وهجي يحميني.']],
gojo:[['أرجواني','A',42,'n','bm',4,'تقنية خيالية: أرجواني!'],['الفراغ اللامحدود','S',0,'r','rw',3,'توسيع النطاق... الفراغ اللامحدود.'],['اللانهاية','G',0,'p','gd',1,'لن تلمسني.'],['أزرق','A',28,'n','bl',2,'أزرق: لابس.'],['أحمر','A',30,'n','bm',2,'أحمر: ريفرسال.'],['تقنية الانعكاس','H',40,'m','hl',3,'تقنية الانعكاس.']],
sukuna:[['ساحة مالفولنت','A',36,'p','sl',4,'ساحة مالفولنت.'],['فوغا','A',32,'f','fi',2,'فوغا!'],['تقطيع','A',24,'p','sl',0,'تقطيع.'],['توسيع النطاق: الساحة الشريرة','K',0,'s','er',6,'ادخل ساحتي.'],['تجدد اللعنة','H',30,'m','hl',3,'أعد جسدي.'],['درع التقطيع','G',0,'p','gd',1,'سلّني.']],
madara:[['ميتيور','A',38,'n','bl',3,'ميتيور!'],['سوسانو','G',0,'p','gd',2,'سوسانو الكامل.'],['ريكودو','S',0,'s','sm',3,'ريكودو... اثبت.'],['تسوكيومي اللانهائي','K',0,'s','rw',6,'نمْ في حلمي.'],['مروحة الحرب','A',26,'p','sl',0,'مروحتي.'],['تجدد الغابة','H',40,'p','hl',3,'خلايا الغابة تعيدني.']],
aizen:[['كيوكا سويغيتسو','S',0,'r','rw',3,'منذ البداية...'],['كيدو التسعين','A',44,'m','bm',2,'كيدو التسعين.'],['هوغيوكو','H',40,'s','hl',3,'جسدي يتجاوز الحدود.'],['زانباكتو','A',32,'p','sl',0,'زانباكتو.'],['تحوّل الفراشة','B',45,'s','au',2,'تجاوزتُ الحدود.'],['هوغيوكو — الاندماج','K',0,'r','rw',5,'تجاوزتُ الشيني... انتهى.']],
ichigo:[['موغيتسو','A',38,'n','sl',3,'غيتسوغا تنشو!'],['هولو فاستو','A',24,'n','sl',1,'سيرو!'],['شونكو','G',0,'p','gd',1,'شونكو!'],['بانكاي','B',45,'n','au',2,'بانكاي!'],['غيتسوغا الأخير','K',0,'s','sl',6,'آخر غيتسوغا...'],['تجدد الروح','H',35,'s','hl',3,'لن أسقط.']],
luffy:[['جير 5 — واقع كرتوني','A',34,'r','pn',3,'غوم غوم نو!'],['هاكي الملوك','S',0,'s','au',2,'اثبت مكانك!'],['جيجانت','A',26,'p','pn',0,'جيجانت!'],['جسد المطاط','G',0,'p','gd',1,'المطاط لا يتأذى!'],['ضحكة التحرر','H',30,'r','hl',3,'شيشيشي!'],['باجرانغ غان','K',0,'p','pn',6,'باجرانغ غان!']],
saitama:[['لكمة جادة','K',0,'p','pn',4,'سأضربك جدّياً.'],['لكمات متتالية','A',28,'p','pn',0,'ضربات عادية.'],['تفادي','G',0,'p','gd',1,'بسيطة.'],['لكمة عادية','A',34,'p','pn',2,'عادية فقط.'],['ركلة سريعة','A',22,'p','pn',0,'ها.'],['أصبح جادّاً','B',40,'p','au',2,'حسناً… بجدّية.']],
goku:[['غريزة فائقة','G',0,'p','gd',1,'جسدي يتحرك وحده!'],['كاميهاميها','A',42,'n','bm',3,'كاميهاميها!'],['ضربة لحظية','A',24,'p','pn',0,'ها!'],['سبيريت بومب','A',48,'n','bl',4,'أعطوني طاقتكم!'],['سوبر ساين','B',45,'n','au',2,'سأصبح أقوى!'],['ضربة من الخلف','A',34,'p','pn',2,'من الخلف!'],['سينزو','H',40,'p','hl',3,'سينزو!']],
kaido:[['نفس البلازما','A',38,'f','dr',3,'بلازما!'],['جسد التنين','G',0,'p','gd',1,'لا أموت هكذا.'],['هاكي صلب','A',28,'p','pn',0,'هاكي صلب.'],['ثاندر باغوا','A',46,'p','pn',4,'ثاندر باغوا!'],['صرخة التنين','S',0,'s','au',3,'اركعوا.'],['شفاء التنين','H',36,'p','hl',3,'تنين لا يسقط.']],
naruto:[['ريسين شوريكين','A',50,'n','bl',3,'ريسين شوريكين!'],['استنساخ الظل','A',30,'p','sm',1,'استنساخ الظل!'],['وضع باريون','B',50,'n','au',2,'سأحمي الجميع!'],['رازنغان','A',38,'n','bl',1,'رازنغان!'],['تشاكرا الكيوبي','H',45,'f','hl',3,'كيوبي، أعطني قوتك.'],['ضربة الكيوبي','K',0,'n','bl',4,'هذا طريقي!']],
zeno:[['محو الكون','K',0,'e','er',5,'سأمحوك من الوجود!'],['ضربة الملك','A',30,'p','pn',1,'تسلية صغيرة.'],['هالة التعالي','G',0,'e','gd',2,'مكانتي أعلى.'],['نظرة المحو','A',24,'e','er',3,'اختفِ قليلاً.'],['إعادة الضبط','H',50,'r','hl',4,'سأعيد الترتيب.'],['موجة الطفل','A',20,'n','bm',0,'ها!']],
whis:[['إعادة الزمن','H',60,'t','tm',4,'سأرجع للوراء.'],['الضربة الهادئة','A',26,'p','pn',1,'ببساطة.'],['ضربة الملاك','A',20,'n','er',3,'ألغي ما تفعله.'],['قراءة الحركة','G',0,'p','gd',1,'رأيتُ حركتك.'],['تجميد الثواني','S',0,'t','tm',3,'توقّف لحظة.'],['عصا المعلّم','A',24,'n','bm',2,'خذ هذه.']],
feather:[['إعادة كتابة الواقع','K',0,'r','rw',5,'سأكتب نهايتك.'],['معجزة','A',24,'m','bm',1,'معجزة صغيرة.'],['رجوع الحكاية','H',40,'r','hl',3,'لنعد الفصل.'],['مسرح الساحرة','S',0,'r','rw',3,'ادخل مسرحي.'],['فراشات ذهبية','A',28,'m','sm',2,'ترقص الفراشات.'],['ثبات الرواية','G',0,'r','gd',2,'لا تُكتب ضدي.']],
anos:[['مرآة ريغريد','G',0,'m','gd',2,'سأعكسها عليك.'],['إبادة النار','A',30,'m','bl',1,'احترق.'],['تدمير المنطق','K',0,'e','er',6,'المنطق لا يحميك.'],['إحياء الجسد','H',45,'m','hl',3,'جسدي يعود.'],['عين الظلام','S',0,'m','au',2,'اركع بنظرتي.'],['ديجيما','A',34,'m','bm',3,'ديجيما!']],
rimuru:[['أزاثوث','K',0,'e','er',5,'ألتهم إرادتك.'],['افتراس','A',22,'p','sm',1,'سأفترسها.'],['تجدد','H',45,'m','hl',3,'أتجدد.'],['بلاك فلير','A',32,'f','fi',2,'لهب أسود!'],['حاجز مطلق','G',0,'p','gd',1,'لا شيء يخترق.'],['هيبة ملك','S',0,'s','au',3,'اخضع.']],
beerus:[['هاكاي','K',0,'e','er',5,'هاكاي!'],['كرة التدمير','A',32,'n','bl',2,'تعال.'],['ضربة قط','A',20,'p','pn',0,'مياو.'],['صدّ بإصبع','G',0,'n','gd',1,'لا تستحق.'],['ضغط ساحق','S',0,'p','au',3,'اثبت مكانك.'],['وضع الدمار','B',40,'e','au',2,'أستيقظ.']],
vegito:[['فيجن كاميهاميها','A',38,'n','bm',3,'كاميهاميها الاندماج!'],['سيف الروح','A',24,'s','sl',1,'سيف الروح.'],['ضربة اندماج','A',22,'p','pn',0,'خذها.'],['غالك غان','A',36,'n','bm',2,'غالك غان!'],['انتقال لحظي','G',0,'p','gd',1,'أسرع منك.'],['ضغط ملكي','B',45,'n','au',2,'أرني ما عندك.']],
gogeta:[['ستار دراغون بريك','A',40,'n','bl',4,'ستار دراغون بريك!'],['ضربة اندماج','A',24,'p','pn',0,'ها!'],['تعزيز','B',50,'n','au',2,'لننهِ هذا.'],['ميتيور كراش','A',34,'n','bl',3,'ميتيور كراش!'],['صدّ الاندماج','G',0,'p','gd',1,'لن تمسّني.'],['تنفّس','H',35,'n','hl',3,'استعدتُ أنفاسي.']],
yhwach:[['الرؤية المطلقة','G',0,'t','gd',1,'رأيتُ ضربتك قبل أن تفكّر بها.'],['امتصاص المستقبل','K',0,'t','tm',5,'مستقبلك صار لي.'],['فضاء الأنفاس','A',28,'s','bl',1,'اختنق.'],['أغنية الكوينسي','A',36,'n','bm',3,'شعاع النهاية!'],['امتصاص الأرواح','H',40,'s','hl',3,'الأرواح تغذّيني.'],['أمر الإخضاع','S',0,'s','au',3,'اخضعوا.']],
kaguya:[['نقل الأبعاد','G',0,'r','rw',1,'لن تلمسني.'],['عظام الدمار','A',28,'p','sl',1,'عظامي تمزّقك.'],['تسوكيومي اللانهائي','K',0,'s','rw',5,'نمْ إلى الأبد.'],['كرات الحقيقة','A',32,'m','bl',2,'كرات الحقيقة السوداء!'],['تجدد التشاكرا','H',30,'n','hl',3,'ثمرة التشاكرا تغذّيني.'],['سجن الأبعاد','S',0,'r','rw',3,'تُهْ بين الأبعاد.']]
};
const GL={yama:'🔥⚔',eren:'🦶🌍',raizel:'🩸🔱',shanks:'⚔👑',zoro:'🗡🐉',dokja:'📜🔷',zeldris:'👑🔥',gilgamesh:'👑🗡',ashborn:'🌑👑',meruem:'🐜👑',hashirama:'🌳🍃',wbeard:'🌍💥',roger:'👑⚓',rocks:'🚩☠',zeref:'🖤📕',merlin:'✨🌌',jiren:'🔴💪',blast:'🌀🕳',garou:'🌌🥋',broly:'💚💢',muzan:'🩸🧬',melio:'😡🔥',lucius:'⏳🕰',ainz:'💀🔮',acno:'🐉💢',hago:'⚪🌙',shadow:'🗡🌑',jinwoo:'👥🗡',imu:'🪑🕳',escanor:'🔆🪓',beerus:'🔮🐱',vegito:'🔷⚡',gogeta:'🌠💥',yhwach:'🔱👁',kaguya:'🐰🌕',zeno:'✋🌌',whis:'🪄⏳',feather:'📖✨',anos:'🌑👁',rimuru:'🟦🌀',gojo:'🟣🔵',sukuna:'🩸🏯',goku:'🔵👊',saitama:'👊💥',luffy:'🥁☁',kaido:'🐲🔥',naruto:'🍥🌀',madara:'☄🌳',ichigo:'🌙⚔',aizen:'🦋👓'};
/* ===== شخصيات ساحة الأساطير (10) ===== */
const ROW={};C0.forEach(r=>ROW[r[0]]=r);
const ERS='ers',BASIC={n:'ضربة عادية',t:'A',v:14,tag:'p',fx:'pn',c:0},TN={p:'جسدي',n:'طاقة',m:'سحر',f:'نار/شمس',t:'زمن',r:'واقع',e:'محو',s:'روح'};
const CHR={},byName={};
IDS.forEach(id=>{const r=ROW[id];CHR[id]={id,n:r[1],col:r[2],imm:r[3],res:r[4],weak:r[5],ab:EXT[id].map(a=>({n:a[0],t:a[1],v:a[2],tag:a[3],fx:a[4],c:a[5],l:a[6]}))};byName[NMAP[id]]=CHR[id]});
['luffy','naruto','ichigo','goku'].forEach(i=>CHR[i].rev=1);CHR.goku.adapt=1;CHR.aizen.adapt=.12;CHR.madara.adapt=.12;
CHR.anos.undying=1;CHR.yhwach.undying=1;CHR.zeref.undying=1;CHR.kaido.rev=1;CHR.wbeard.rev=1;CHR.rimuru.rev=1;CHR.muzan.rev=1;CHR.meruem.adapt=.12;
/* مراجعة الأنمي: مناعات وإحياء حسب القصة */
CHR.gojo.weak='';Object.assign(CHR.beerus,{imm:'',res:'pnm',weak:''});CHR.luffy.res='nmr';CHR.kaido.res='pnf';['saitama','madara','aizen','jinwoo','ainz','garou','broly','merlin','ashborn','hashirama','eren'].forEach(i=>CHR[i].rev=1);CHR.melio.undying=1;
const AB=(id,n,o)=>Object.assign(CHR[id].ab.find(x=>x.n==n),o),RS=(id,o)=>Object.assign(CHR[id],o);
RS('goku',{res:'pnf'});RS('vegito',{res:'pnf',rev:1,adapt:.1});RS('gogeta',{res:'pnf',rev:1,adapt:.1});
RS('whis',{imm:'nt',res:'pmef',rev:1});AB('whis','ضربة الملاك',{v:36});
RS('hago',{imm:'nm',res:'f',rev:1});AB('hago','ختم القمر',{c:5});
RS('hashirama',{res:'pnmf'});RS('roger',{res:'pnm',rev:1});AB('roger','الرحيل الأعظم',{t:'K',v:0,c:5});
RS('shanks',{res:'pnms',rev:1});RS('gilgamesh',{res:'pnmf',rev:1});AB('gilgamesh','إيا — شق العالم',{c:6});
RS('meruem',{res:'pnm',rev:1});RS('zeldris',{res:'pm',rev:1});RS('muzan',{res:'pnm'});
RS('yhwach',{imm:'',res:'m'});AB('zeno','محو الكون',{ig:1});RS('naruto',{res:'nf'});RS('eren',{res:'pn'});AB('gogeta','ستار دراغون بريك',{t:'K',v:0,c:5});AB('vegito','فيجن كاميهاميها',{t:'K',v:0,c:5});AB('hashirama','سحر الخشب العميق',{t:'K',v:0,c:6,tag:'s'});RS('blast',{res:'pnm',rev:1});RS('jiren',{res:'pnm',rev:1});RS('garou',{res:'pn'});CHR.anos.adapt=.2;CHR.dokja.rev=1;CHR.dokja.adapt=.2;CHR.zeno.adapt=.15;CHR.whis.adapt=.15;CHR.zeref.adapt=.12;CHR.merlin.adapt=.12;CHR.imu.adapt=.1;CHR.feather.adapt=.1;
const mult=(a,D)=>D.imm.includes(a.tag)?0:D.res.includes(a.tag)?.5:D.weak.includes(a.tag)?1.5:1;
const thr=(a,b)=>Math.max(...a.ab.map(x=>x.t=='K'?(b.imm.includes(x.tag)?0:b.res.includes(x.tag)?50:100):x.t=='A'?x.v*mult(x,b):0));

/* ===== قواعد القتال (نقية — تُستخدم للبحث وللتنفيذ) ===== */
const cp=S=>({f:S.f.map(F=>({c:F.c,k:F.k,hp:F.hp,en:F.en,g:F.g,st:F.st,bf:F.bf,pr:F.pr|0,tn:F.tn|0,us:F.us|0,si:F.si|0,hc:F.hc|0,rv:F.rv|0,lg:F.lg|0,ad:{...F.ad}}))});
function turnStart(S,i){const A=S.f[i];A.tn=(A.tn|0)+1;A.en=Math.min(8,A.en+2);if(A.st){A.st=0;A.si=1;return false}A.si=0;return true}
let FORCE=0;
function moves(A){const m=A.c.ab.filter(a=>a.c<=A.en&&(!a.gate||A.pr||A.tn>=3)&&!(a.t=='H'&&(A.hc|0)>=2)&&!(a.t=='G'&&A.lg));if(FORCE){const x=m.filter(a=>a.t=='A'||a.t=='K');return x.length?x:[BASIC]}return m.length?m:[BASIC]}
function play(S,i,a,E){const A=S.f[i],D=S.f[1-i],e=x=>E&&E.push(x);
 if(!a)return e({k:'skip'});A.lg=a.t=='G'?1:0;A.en-=a.c;if(a.c>=3&&(a.t=='A'||a.t=='K'))D.pr=1;
 if(a.t=='H'){A.hc=(A.hc|0)+1;const g=Math.min(100,A.hp+a.v)-A.hp;A.hp+=g;return e({k:'heal',a,g})}
 if(a.t=='B'){A.bf=3;return e({k:'buff',a})}
 if(a.t=='G'){A.g=1;return e({k:'guard',a})}
 if(D.g&&!ERS.includes(a.tag)&&!a.ig){D.g=0;return e({k:'block',a})}
 const m=mult(a,D.c);if(!m)return e({k:'imm',a});
 if(a.t=='S'){if(D.si)return e({k:'resist',a});D.st=1;return e({k:'stun',a})}
 if(a.t=='K'){if(D.c.res.includes(a.tag)&&!a.ig){D.hp-=50;e({k:'dmg',a,d:50,m:.5});return revive(D,e)}D.hp=0;if(D.c.undying&&a.tag!='e')return revive(D,e);return e({k:'kill',a})}
 let mm=m,ad=0;if(A.bf>0){mm*=1.5;A.bf--}{ad=D.ad[a.n]|0;mm*=Math.max(.5,1-(D.c.adapt===1?.25:(D.c.adapt||.05))*ad);D.ad[a.n]=ad+1}const d=Math.round(a.v*mm);D.hp-=d;e({k:'dmg',a,d,m:mm/(A.bf>=0?1:1)>0?m:m,ad});revive(D,e)}
function revive(D,e){if(D.hp>0)return;
 if(D.c.undying&&(D.rv|0)<4){const n=D.rv=(D.rv|0)+1;D.hp=[0,45,35,25,15][n];D.bf=3;D.st=0;D.g=0;D.en=Math.min(8,D.en+3);return e({k:'rev',und:n})}
 if(D.c.rev&&!D.us){D.us=1;D.hp=12;D.bf=3;D.st=0;D.g=0;D.en=Math.min(8,D.en+4);e({k:'rev'})}}
const H0=(S,p)=>{const P=S.f[p],O=S.f[1-p];return(P.hp-O.hp)*1.2+(P.en-O.en)*1.5+(P.g?9:0)-(O.g?9:0)+(P.bf-O.bf)*4+(O.st?10:0)-(P.st?10:0)+(P.c.rev&&!P.us?8:0)-(O.c.rev&&!O.us?8:0)};
const kth=(P,O)=>O.c.ab.some(x=>x.t=='K'&&O.en+2>=x.c&&!P.c.imm.includes(x.tag));
const H=(S,p)=>{const P=S.f[p],O=S.f[1-p];return H0(S,p)-(kth(P,O)&&!P.g?14:0)+(kth(O,P)&&!O.g?10:0)+(P.c.undying?(4-(P.rv|0))*9:0)-(O.c.undying?(4-(O.rv|0))*9:0)};
/* بحث negamax مع قصّ ألفا-بيتا: كل لاعب يتوقع ردّ خصمه (عمق 6 حركات) */
function nega(S,i,d,al,be){const A=S.f[i],D=S.f[1-i];
 if(A.hp<=0)return-1e4-d;if(D.hp<=0)return 1e4+d;if(!d)return H(S,i);
 const T=cp(S),ok=turnStart(T,i),ms=ok?moves(T.f[i]):[null];let best=-1e9;
 for(const a of ms){const U=cp(T);play(U,i,a);const v=-nega(U,1-i,d-1,-be,-al);if(v>best)best=v;if(v>al)al=v;if(al>=be)break}return best}
function think(S,i,depth=6){const T=cp(S),ms=moves(T.f[i]);let bm=ms[0],bv=-1e9;
 for(const a of ms){const U=cp(T);play(U,i,a);const v=-nega(U,1-i,depth-1,-1e9,1e9)+LR()*1.5-a.c*.05-(S.f[i].lm===a.n&&a.t!='G'?2.2:0);if(v>bv){bv=v;bm=a}}return bm}
function why(A,D,a){const k=D.c.ab.find(x=>x.t=='K'&&D.en+2>=x.c&&!A.c.imm.includes(x.tag));
 if(a.t=='G')return k&&!ERS.includes(k.tag)?`يقرأ أن ${D.c.n} يجهّز «${k.n}» فيتحصّن قبلها`:null;
 if(a.gate)return'انتهت التسلية — الآن بجدّية';
 if(a.t=='K')return'الفرصة مناسبة — الضربة القاضية الآن';
 if(a.t=='S')return D.si?null:`يشلّ ${D.c.n} ليكسب دوراً إضافياً`;
 if(a.t=='H')return`صحته ${Math.round(A.hp)}% — يتراجع للعلاج`;
 if(a.t=='B')return'يرفع قوته قبل الضربة الكبرى';
 if(a.c<=1){const u=A.c.ab.find(x=>x.t=='K'&&x.c>A.en&&!D.c.imm.includes(x.tag));if(u)return`يدّخر طاقته لـ«${u.n}»`}return null}


/* ===== واجهة القتال والأنميشن ===== */
let T,cur,bid=0,skip=0,speed=1;
const wait=ms=>wt(ms);
const wt=ms=>skip?Promise.resolve():sleep(ms/speed);
const L=(h,c)=>{const d=document.createElement('div');if(c)d.className=c;d.innerHTML=h;$('log').appendChild(d);$('log').scrollTop=1e9};
const mkF=(c,k)=>({card:c.slice(),c:byName[c[0]],k,hp:100,en:2,g:0,st:0,bf:0,pr:0,tn:0,us:0,si:0,hc:0,ad:{}});
const pos=i=>{const a=$('arena').getBoundingClientRect(),r=$('f'+(i+1)).getBoundingClientRect();return(r.left+r.width/2-a.left)/a.width*100};
const FXM={'أرجواني':['purple','#a855f7'],'الفراغ اللامحدود':['domain','#e2e8f0'],'أزرق':['blue','#3b82f6'],'أحمر':['red','#ef4444'],
'ساحة مالفولنت':['cleave','#dc2626'],'فوغا':['fire','#f97316'],'تقطيع':['slash','#dc2626'],'توسيع النطاق: الساحة الشريرة':['shrine','#991b1b'],
'غريزة فائقة':['dodge','#e5e7eb'],'كاميهاميها':['beam','#38bdf8'],'ضربة لحظية':['punch','#fb923c'],'سبيريت بومب':['sun','#60a5fa'],'سوبر ساين':['tf','#fde047'],'ضربة من الخلف':['kick','#fb923c'],
'لكمة جادة':['serious','#fde047'],'لكمات متتالية':['multi','#fbbf24'],'تفادي':['dodge','#fde68a'],'لكمة عادية':['punch','#fbbf24'],'ركلة سريعة':['kick','#fbbf24'],
'جير 5 — واقع كرتوني':['g5','#fde047'],'هاكي الملوك':['haki','#dc2626'],'جيجانت':['gigant','#f87171'],'باجرانغ غان':['gatling','#fb923c'],
'نفس البلازما':['dragon','#38bdf8'],'هاكي صلب':['punch','#94a3b8'],'ثاندر باغوا':['bagua','#60a5fa'],'صرخة التنين':['haki','#3b82f6'],
'ريسين شوريكين':['rasen','#38bdf8'],'رازنغان':['rasen','#7dd3fc'],'استنساخ الظل':['clone','#fbbf24'],'وضع باريون':['tf','#fde047'],'ضربة الكيوبي':['biju','#f97316'],
'ميتيور':['meteor','#f97316'],'ريكودو':['haki','#a78bfa'],'تسوكيومي اللانهائي':['domain','#dc2626'],'مروحة الحرب':['slash','#e5e7eb'],
'موغيتسو':['getsuga','#ef4444'],'هولو فاستو':['beam','#ef4444'],'بانكاي':['tf','#f97316'],'غيتسوغا الأخير':['getsuga','#7f1d1d'],
'كيوكا سويغيتسو':['swarm','#a78bfa'],'كيدو التسعين':['beam','#8b5cf6'],'زانباكتو':['slash','#e5e7eb'],'تحوّل الفراشة':['tf','#a78bfa'],'هوغيوكو — الاندماج':['fusion','#c4b5fd']};
const DEFK={H:'heal',G:'shield',B:'buff',S:'haki',K:'domain',A:'beam'};
FXEMO.blue='🔵';FXEMO.red='🔴';FXEMO.moon='🌙';
const rainE=async(em,col,a,d)=>{const sd=rel($('f'+(d+1))),els=Array.from({length:10},()=>put(em,{left:sd.x+rnd(-80,80)+'px',top:'0',fontSize:'38px',opacity:0,filter:`drop-shadow(0 0 10px ${col})`}));
 await Promise.all(els.map((e,i)=>go(e,[{transform:C(0,-20),opacity:1},{transform:C(rnd(-30,30),sd.y+10),opacity:1,offset:.85},{transform:C(0,sd.y+10),opacity:0}],700,{delay:i*70/speed})));rm(...els);await burst(sd,col,200);shake(8)};
async function fx2(k,col,a,d){const P=(x,c=col)=>playFx(x,c,a,d);
 switch(k){
 case'purple':{const sa=rel($('f'+(a+1))),o=[['#3b82f6',-60],['#ef4444',60]].map(([c,x])=>put('',{left:sa.x+x+'px',top:sa.y+'px',width:'60px',height:'60px',borderRadius:'50%',background:`radial-gradient(circle,#fff,${c} 60%,transparent 72%)`}));
  await Promise.all(o.map((e,i)=>go(e,[{transform:C(0,0,'scale(.3)'),opacity:1},{transform:C(i?-60:60,0,'scale(1.3)'),opacity:1}],550)));rm(...o);return P('beam')}
 case'meteor':return rainE('☄️',col,a,d);case'swarm':return rainE('🦋',col,a,d);
 case'cleave':await P('slash');return P('slash');case'shrine':await P('domain');return P('slash');
 case'multi':for(let i=0;i<3;i++)await P('punch');return;case'gatling':for(let i=0;i<3;i++)await P('punch');return P('boom');
 case'serious':await P('buff');await P('punch');return P('boom');case'gigant':await P('punch');return P('boom');
 case'g5':await P('tf');await P('punch');return P('boom');case'bagua':await P('bolt');return P('boom');
 case'biju':await P('beam');return P('boom');case'getsuga':await P('slash');return P('moon');
 case'fusion':await P('tf');return P('domain');case'dodge':return P('clone');
 default:return P(k)}}
const DEFX={sl:'slash',bm:'beam',bl:'boom',pn:'punch',er:'domain',tm:'tf',rw:'domain',fi:'fire',sm:'clone',au:'buff',hl:'heal',gd:'shield',qk:'boom',dr:'dragon',rn:'rain',mc:'bolt',wd:'rock',xs:'slash'};
/* ================================================================
   المشاهد السينمائية للقدرات (على نمط ملف العرض) — ماداراً، آيزن،
   سايتاما، غوكو، إيتشيغو، سوكونا + لانهاية غوجو
   ================================================================ */
const SCENE_OF = {
 'gojo:أرجواني':'purple','gojo:الفراغ اللامحدود':'domainVoid','gojo:اللانهاية':'infinity',
 'sukuna:ساحة مالفولنت':'dismantle','sukuna:فوغا':'fuga','sukuna:توسيع النطاق: الساحة الشريرة':'shrine',
 'madara:ميتيور':'meteor','madara:سوسانو':'susanoo','madara:ريكودو':'rikudo','madara:تسوكيومي اللانهائي':'tsukuyomi',
 'aizen:كيوكا سويغيتسو':'kyoka','aizen:كيدو التسعين':'kido90','aizen:تحوّل الفراشة':'hogyoku','aizen:هوغيوكو — الاندماج':'hogyoku',
 'saitama:لكمة جادة':'serious','saitama:أصبح جادّاً':'seriousMode',
 'goku:كاميهاميها':'kamehameha','goku:سبيريت بومب':'spiritBomb','goku:سوبر ساين':'ssj','goku:غريزة فائقة':'ui',
 'ichigo:موغيتسو':'getsuga','ichigo:بانكاي':'bankai','ichigo:غيتسوغا الأخير':'mugetsu'
};

async function cine(F, k, s, scene, D){
  if(skip) return;
  const ar=arena(), W=ar.clientWidth, H=ar.clientHeight, col=s.col||'#fff', els=[];
  const dir=Math.sign(rel($('f'+(D.k+1))).x-rel($('f'+(F.k+1))).x)||(k===0?-1:1);
  const p=(html,css)=>{ const e=put(html,{zIndex:60,...css}); els.push(e); return e; };
  const bg=p('',{inset:0,background:'#000',opacity:0,zIndex:55});
  const barT=p('',{left:0,top:0,width:'100%',height:'12%',background:'#000',zIndex:90}), barB=p('',{left:0,bottom:0,width:'100%',height:'12%',background:'#000',zIndex:90});
  go(bg,[{opacity:0},{opacity:.9}],350); go(barT,[{transform:'translateY(-100%)'},{transform:'translateY(0)'}],350); go(barB,[{transform:'translateY(100%)'},{transform:'translateY(0)'}],350);
  await wait(380);
  const ph=Math.min(H*.66,300), pw=ph*.72, img=String(F.card[5]).replace(/"/g,'%22'), dimg=String(D.card[5]).replace(/"/g,'%22');
  const port=(css={})=>p('',{left:'50%',top:'50%',width:pw+'px',height:ph+'px',borderRadius:'14px',backgroundImage:`url("${img}")`,backgroundSize:'cover',backgroundPosition:'top',backgroundColor:'#12172e',border:`3px solid ${col}`,boxShadow:`0 0 30px ${col}`,zIndex:62,transform:C(0,0),...css});
  const dport=(css={})=>p('',{left:'50%',top:'50%',width:pw*.8+'px',height:ph*.8+'px',borderRadius:'14px',backgroundImage:`url("${dimg}")`,backgroundSize:'cover',backgroundPosition:'top',backgroundColor:'#1a1020',border:'3px solid #ef4444',boxShadow:'0 0 24px #ef4444',zIndex:62,transform:C(0,0),...css});
  const flash=(c='#fff',ms=450,op=1)=>{ const f=p('',{inset:0,background:c,opacity:0,zIndex:95}); return go(f,[{opacity:op},{opacity:0}],ms); };
  const ring=(c=col,sc=4,ms=900,dl=0,x='50%',y='50%')=>{ const r=p('',{left:x,top:y,width:'140px',height:'140px',borderRadius:'50%',border:`4px solid ${c}`,boxShadow:`0 0 26px ${c}`,zIndex:61,opacity:0}); return go(r,[{transform:C(0,0,'scale(.2)'),opacity:1},{transform:C(0,0,`scale(${sc})`),opacity:0}],ms,{delay:dl/speed}); };
  const title=(txt,sub,c=col,ms=1800)=>{ const t=p(`<div style="font-size:14px;color:#fff;opacity:.9;letter-spacing:2px">${esc(sub||'')}</div><div style="font-size:clamp(22px,6vw,42px)">${esc(txt)}</div>`,{left:'50%',top:'80%',fontWeight:900,color:c,textShadow:`0 0 18px ${c},0 3px 8px #000`,textAlign:'center',whiteSpace:'nowrap',zIndex:96}); return go(t,[{transform:C(0,20,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1.15)'),opacity:1,offset:.18},{transform:C(0,0,'scale(1)'),opacity:1,offset:.85},{transform:C(0,-8,'scale(1)'),opacity:0}],ms); };
  const pop=(txt,c,x,y,size=40,ms=900,dl=0)=>{ const t=p(esc(txt),{left:x,top:y,fontSize:size+'px',fontWeight:900,color:c,textShadow:`0 0 14px ${c},0 3px 6px #000`,whiteSpace:'nowrap',zIndex:97,opacity:0}); return go(t,[{transform:C(0,10,'scale(.3) rotate(-8deg)'),opacity:0},{transform:C(0,0,'scale(1.25) rotate(4deg)'),opacity:1,offset:.25},{transform:C(0,-6,'scale(1) rotate(0)'),opacity:1,offset:.8},{transform:C(0,-20,'scale(1)'),opacity:0}],ms,{delay:dl/speed}); };
  const orbit=(emo,n,r,ms,o={})=>{ const ps=[]; for(let i=0;i<n;i++){ const a0=i/n*Math.PI*2, e=p(emo,{left:'50%',top:'50%',fontSize:(o.size||34)+'px',filter:o.filter||'',opacity:0,zIndex:o.z||63}); const kf=[], st=24; for(let j=0;j<=st;j++){ const a=a0+j/st*Math.PI*2*(o.turns||1); kf.push({transform:C(Math.cos(a)*r,Math.sin(a)*(o.ry||r*.5),`scale(${.85+.35*Math.sin(a)})`),opacity:(j===0||j===st)?0:1}); } ps.push(go(e,kf,ms,{easing:'linear'})); } return Promise.all(ps); };
  const rays=(c,ms,dr=1)=>{ const sz=Math.max(W,H)*1.7, r=p('',{left:'50%',top:'50%',width:sz+'px',height:sz+'px',borderRadius:'50%',background:`repeating-conic-gradient(${c} 0 6deg,transparent 6deg 18deg)`,maskImage:'radial-gradient(circle,#000 8%,transparent 62%)',WebkitMaskImage:'radial-gradient(circle,#000 8%,transparent 62%)',zIndex:57,opacity:0}); return go(r,[{transform:C(0,0,'scale(.2) rotate(0)'),opacity:0},{transform:C(0,0,`scale(.7) rotate(${40*dr}deg)`),opacity:.95,offset:.3},{transform:C(0,0,`scale(1) rotate(${160*dr}deg)`),opacity:.75}],ms); };
  const bolts=(c,n=4)=>{ const lines=[]; for(let i=0;i<n;i++) lines.push([rnd(0,W),0,W/2+rnd(-60,60),H/2+rnd(-30,60)]); const sv=p(boltsSVG(lines,c),{inset:0,zIndex:80,opacity:0}); return go(sv,[{opacity:1},{opacity:.2},{opacity:1},{opacity:.3},{opacity:1},{opacity:0}],520); };
  const dots=(n,c,sz=[2,5],ms=[1400,3000],z=58)=>{ for(let i=0;i<n;i++){ const d=p('',{left:rnd(0,100)+'%',top:rnd(0,100)+'%',width:rnd(...sz)+'px',height:rnd(...sz)+'px',borderRadius:'50%',background:c,boxShadow:`0 0 8px ${c}`,zIndex:z,opacity:0}); go(d,[{opacity:0},{opacity:1,offset:.3},{opacity:0}],rnd(...ms),{delay:rnd(0,1200)/speed}); } };
  const slashLine=(c,ang,len,ms,dl=0,th=5,x='50%',y='50%')=>{ const s=p('',{left:x,top:y,width:len+'px',height:th+'px',background:`linear-gradient(90deg,transparent,${c},#fff,${c},transparent)`,boxShadow:`0 0 16px ${c}`,borderRadius:'4px',zIndex:85,opacity:0,transformOrigin:'0 50%'}); return go(s,[{transform:`translate(-50%,-50%) rotate(${ang}deg) scaleX(0)`,opacity:1},{transform:`translate(-50%,-50%) rotate(${ang}deg) scaleX(1)`,opacity:1,offset:.35},{transform:`translate(-50%,-50%) rotate(${ang}deg) scaleX(1)`,opacity:0}],ms,{delay:dl/speed}); };
  const X={F,D,W,H,col,dir,p,port,dport,flash,ring,title,pop,orbit,rays,bolts,dots,slashLine,s};
  try{ await (SCENES[scene]||SCENES.generic)(X); }catch(e){ console.warn('cine',scene,e); }
  go(bg,[{opacity:.9},{opacity:0}],420); go(barT,[{transform:'translateY(0)'},{transform:'translateY(-100%)'}],420); go(barB,[{transform:'translateY(0)'},{transform:'translateY(100%)'}],420);
  await wait(430); rm(...els);
}

const SCENES = {
 async generic(x){
   const {p,port,flash,ring,title,rays,col,F}=x;
   const por=port(); go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(450);
   rays(col,1500); ring(col,5,1000); flash(col,500,.8); await wait(1100); await title(x.s.n,F.c.n,col,1300);
 },

 /* ---------- غوجو ---------- */
 async infinity(x){            // اللانهاية: مفارقة زينون — كل خطوة تقطع نصف المسافة ولا تصل
   const {W,H,p,port,ring,title,pop,dots}=x;
   const por=port({borderColor:'#7dd3fc',boxShadow:'0 0 30px #38bdf8',filter:'brightness(.8)'});
   go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(450);
   const R=Math.min(W,H)*.36;
   const sph=p('',{left:'50%',top:'50%',width:R*2+'px',height:R*2+'px',borderRadius:'50%',border:'2px solid #bae6fd',background:'radial-gradient(circle,transparent 52%,#38bdf833 72%,#bae6fdaa 100%)',boxShadow:'0 0 44px #38bdf8,inset 0 0 44px #38bdf8',zIndex:64,opacity:0});
   go(sph,[{transform:C(0,0,'scale(.1)'),opacity:0},{transform:C(0,0,'scale(1.08)'),opacity:1,offset:.7},{transform:C(0,0,'scale(1)'),opacity:1}],800);
   ring('#7dd3fc',4,1100); dots(24,'#bae6fd'); await wait(850);
   const N=9, R0=Math.max(W,H)*.62, fr=['1/2','1/4','1/8','1/16','1/32','∞'];
   for(let i=0;i<N;i++){
     const a=i/N*Math.PI*2+.3, b=p('',{left:'50%',top:'50%',width:'16px',height:'16px',borderRadius:'50%',background:'#fff',boxShadow:'0 0 14px #f87171,0 0 28px #ef4444',zIndex:66,opacity:0});
     const kf=[]; for(let q=0;q<=7;q++){ const r=R+(R0-R)/Math.pow(2,q)*1; const rr=q===0?R0:R+(R0-R)/Math.pow(2,q); kf.push({transform:C(Math.cos(a)*rr,Math.sin(a)*rr*.75,`scale(${1-q*.05})`),opacity:q===0?0:1}); }
     go(b,kf,1500,{easing:'steps(1,end)',delay:i*60/speed});
   }
   for(let q=0;q<6;q++) pop(fr[q],'#bae6fd',(30+q*8)+'%',(26+(q%2)*12)+'%',q===5?46:22+q*2,800,q*220);
   await wait(1500);
   const inf=p('∞',{left:'50%',top:'50%',fontSize:Math.min(H*.9,320)+'px',fontWeight:900,color:'#e0f2fe',textShadow:'0 0 40px #38bdf8,0 0 90px #38bdf8',zIndex:70,opacity:0});
   go(inf,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:.9,offset:.4},{transform:C(0,0,'scale(1.15)'),opacity:0}],1200);
   ring('#fff',6,1100,200); await wait(1000); await title('اللانهاية — لا شيء يلمسه','♾️ ما لا يصل أبداً','#7dd3fc',1700);
 },
 async purple(x){
   const {W,H,p,port,flash,ring,title,pop,dir}=x;
   const por=port({filter:'brightness(.8)'}); go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(450);
   const mk=(c,sz=90)=>p('',{left:'50%',top:'50%',width:sz+'px',height:sz+'px',borderRadius:'50%',background:`radial-gradient(circle,#fff 0 18%,${c} 45%,transparent 72%)`,boxShadow:`0 0 40px ${c}`,zIndex:70,opacity:0});
   const b=mk('#3b82f6'), r=mk('#ef4444'), d=W*.3;
   pop('أزرق','#60a5fa','22%','24%',34,900); pop('أحمر','#f87171','78%','24%',34,900,300);
   go(b,[{transform:C(-d,-10,'scale(.3)'),opacity:0},{transform:C(-d,-10,'scale(1)'),opacity:1,offset:.35},{transform:C(-16,0,'scale(1.1)'),opacity:1}],1100);
   go(r,[{transform:C(d,-10,'scale(.3)'),opacity:0},{transform:C(d,-10,'scale(1)'),opacity:1,offset:.35},{transform:C(16,0,'scale(1.1)'),opacity:1}],1100);
   await wait(1150); rm(b,r);
   const pu=mk('#a855f7',130); flash('#f3e8ff',520,1); shake(12);
   go(pu,[{transform:C(0,0,'scale(.3)'),opacity:1},{transform:C(0,0,'scale(1.5)'),opacity:1,offset:.5},{transform:C(0,0,'scale(1.25)'),opacity:1}],900);
   ring('#a855f7',7,1200); ring('#fff',5,900,200); pop('أرجواني!','#e9d5ff','50%','22%',46,1200,150); await wait(950);
   const bm=p('',{left:'50%',top:'calc(50% - 60px)',width:W*1.4+'px',height:'120px',transformOrigin:'0 50%',background:'linear-gradient(90deg,#fff,#d8b4fe 18%,#9333ea 60%,transparent)',borderRadius:'70px',boxShadow:'0 0 70px #a855f7',zIndex:68,opacity:0});
   const rot=dir>0?0:180;
   go(bm,[{transform:`rotate(${rot}deg) scaleX(0)`,opacity:1},{transform:`rotate(${rot}deg) scaleX(1)`,opacity:1,offset:.25},{transform:`rotate(${rot}deg) scaleX(1)`,opacity:1,offset:.8},{transform:`rotate(${rot}deg) scaleX(1) scaleY(.1)`,opacity:0}],1100);
   shake(16); await wait(1100); await title('أرجواني — الفراغ المحوّل','تقنية خيالية','#c084fc',1700);
 },
 async domainVoid(x){
   const {W,H,p,port,dport,flash,ring,title,pop,dots,D}=x;
   const galaxy=p('',{left:'50%',top:'50%',width:Math.max(W,H)*1.8+'px',height:Math.max(W,H)*1.8+'px',borderRadius:'50%',background:'repeating-conic-gradient(from 0deg,#1e1b4b 0 10deg,#4c1d95 10deg 14deg,#0b1020 14deg 30deg)',maskImage:'radial-gradient(circle,#000 5%,transparent 60%)',WebkitMaskImage:'radial-gradient(circle,#000 5%,transparent 60%)',zIndex:56,opacity:0});
   go(galaxy,[{transform:C(0,0,'scale(.2) rotate(0)'),opacity:0},{transform:C(0,0,'scale(1) rotate(180deg)'),opacity:1,offset:.4},{transform:C(0,0,'scale(1.1) rotate(360deg)'),opacity:1}],3800);
   dots(70,'#e0e7ff',[1,4],[1500,3200]);
   const por=port(); por.style.left='30%'; go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],500);
   const dp=dport(); dp.style.left='70%'; go(dp,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],500,{delay:300/speed});
   await wait(700); pop('🤞 توسيع النطاق','#e0e7ff','50%','18%',32,1200);
   await wait(900); flash('#fff',500,1); shake(10);
   // سيل المعلومات: أعمدة نصوص تتدفق على الخصم
   const rows=['∞','١٠١٠','معلومات','∞ ∞ ∞','٠١١٠','لا نهائي','∞','١١٠١'];
   for(let i=0;i<22;i++){ const t=p(rows[i%rows.length],{left:rnd(46,96)+'%',top:'-10%',fontSize:rnd(14,30)+'px',fontWeight:900,color:i%3?'#a5b4fc':'#fff',textShadow:'0 0 10px #6366f1',zIndex:75,opacity:0}); go(t,[{transform:C(0,0),opacity:0},{transform:C(0,H*.55),opacity:1,offset:.3},{transform:C(0,H*1.2),opacity:0}],rnd(900,1500),{delay:rnd(0,1200)/speed}); }
   go(dp,[{filter:'none'},{filter:'invert(1) hue-rotate(90deg)'},{filter:'blur(2px) brightness(1.6)'},{filter:'invert(1)'},{filter:'blur(4px) brightness(2)'}],2000);
   pop('???','#fff','70%','34%',46,1000,300); pop('عقل لا يتحمّل!','#c7d2fe','70%','60%',24,1000,900);
   ring('#818cf8',6,1400); ring('#fff',7,1500,500); await wait(2000);
   const inf=p('∞',{left:'50%',top:'50%',fontSize:Math.min(H*.9,320)+'px',fontWeight:900,color:'#fff',textShadow:'0 0 40px #818cf8,0 0 100px #6366f1',zIndex:90,opacity:0});
   go(inf,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1,offset:.45},{transform:C(0,0,'scale(1.2)'),opacity:0}],1300);
   await wait(1000); await title('الفراغ اللامحدود','توسيع النطاق','#a5b4fc',1700);
 },

 /* ---------- سوكونا ---------- */
 async dismantle(x){
   const {W,H,p,port,flash,ring,title,pop,slashLine}=x;
   const por=port({filter:'brightness(.7) saturate(1.3)'}); go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(450);
   pop('تفكيك!','#fca5a5','50%','22%',40,900);
   for(let i=0;i<14;i++) slashLine('#dc2626',rnd(-70,70)+(i%2?90:0),Math.max(W,H)*rnd(.5,1),520,i*70,rnd(3,7),rnd(15,85)+'%',rnd(20,80)+'%');
   await wait(250); shake(10); flash('#7f1d1d',500,.7); ring('#dc2626',5,900,200);
   await wait(1100);
   for(let i=0;i<3;i++) slashLine('#fff',-45+i*45,Math.max(W,H)*1.2,500,i*180,8);
   await wait(750); pop('ساحة مالفولنت!','#ef4444','50%','78%',34,1000); flash('#fff',350,.8); await wait(800);
 },
 async fuga(x){
   const {W,H,p,port,flash,ring,title,pop,dir,dots}=x;
   const por=port({filter:'brightness(.7) saturate(1.3)'}); go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(450);
   pop('افتح...','#fdba74','50%','22%',38,1100); dots(30,'#fb923c',[3,8],[900,1600]);
   const arrow=p('🔥',{left:'50%',top:'50%',fontSize:'70px',zIndex:80,filter:'drop-shadow(0 0 24px #f97316) drop-shadow(0 0 50px #ef4444)',opacity:0});
   go(arrow,[{transform:C(0,0,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1.4)'),opacity:1,offset:.5},{transform:C(0,0,'scale(1.1)'),opacity:1}],1200);
   const bow=p('',{left:'50%',top:'50%',width:'210px',height:'210px',borderRadius:'50%',border:'6px solid transparent',borderLeftColor:'#fb923c',borderRightColor:'#fb923c',boxShadow:'0 0 30px #f97316',zIndex:79,opacity:0});
   go(bow,[{transform:C(0,0,'scale(.2) rotate(0)'),opacity:0},{transform:C(0,0,'scale(1) rotate(180deg)'),opacity:1}],1200);
   await wait(1250); rm(bow); ring('#f97316',6,900); pop('فوغا!','#fff','50%','22%',52,1000); flash('#fed7aa',350,.9);
   go(arrow,[{transform:C(0,0,'scale(1.1)'),opacity:1},{transform:C(dir*W*.9,0,'scale(1.8)'),opacity:1,offset:.8},{transform:C(dir*W*1.1,0,'scale(2)'),opacity:0}],700);
   const tr=p('',{left:'50%',top:'calc(50% - 20px)',width:W+'px',height:'40px',transformOrigin:'0 50%',background:'linear-gradient(90deg,#fff,#fb923c 30%,#dc2626 70%,transparent)',borderRadius:'20px',boxShadow:'0 0 50px #f97316',zIndex:70,opacity:0});
   go(tr,[{transform:`rotate(${dir>0?0:180}deg) scaleX(0)`,opacity:1},{transform:`rotate(${dir>0?0:180}deg) scaleX(1)`,opacity:1,offset:.5},{transform:`rotate(${dir>0?0:180}deg) scaleX(1)`,opacity:0}],900);
   shake(14); await wait(900); await title('فوغا — سهم اللهب','ملك اللعنات','#fb923c',1500);
 },
 async shrine(x){
   const {W,H,p,port,dport,flash,ring,title,pop,dots,slashLine,orbit}=x;
   const sky=p('',{inset:0,background:'radial-gradient(circle at 50% 30%,#7f1d1d,#1c0505 70%)',zIndex:56,opacity:0}); go(sky,[{opacity:0},{opacity:1}],700);
   const moon=p('',{left:'50%',top:'28%',width:Math.min(W,H)*.5+'px',height:Math.min(W,H)*.5+'px',borderRadius:'50%',background:'radial-gradient(circle,#fecaca,#dc2626 60%,#450a0a)',boxShadow:'0 0 80px #dc2626',zIndex:57,opacity:0}); go(moon,[{transform:C(0,0,'scale(.4)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:.9}],1200);
   const por=port({filter:'brightness(.75) saturate(1.3)'}); por.style.top='58%'; por.style.width=x.W*.2+'px'; por.style.height=x.W*.28+'px';
   go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],500); await wait(600);
   pop('توسيع النطاق','#fecaca','50%','12%',30,1200);
   const sh=p('🏯️',{left:'50%',top:'46%',fontSize:Math.min(H*.5,220)+'px',zIndex:60,filter:'drop-shadow(0 0 30px #dc2626) brightness(.5) sepia(1) saturate(6) hue-rotate(-30deg)',opacity:0});
   go(sh,[{transform:C(0,60,'scale(.4)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],1200,{delay:300/speed});
   orbit('💀',6,Math.min(W*.34,230),2600,{size:30,filter:'drop-shadow(0 0 10px #dc2626)',z:61,turns:1});
   await wait(1300); pop('الساحة الشريرة!','#ef4444','50%','78%',38,1100);
   for(let i=0;i<24;i++) slashLine(i%3?'#ef4444':'#fff',rnd(-80,80)+(i%2?90:0),Math.max(W,H)*rnd(.6,1.1),420,i*85,rnd(2,6),rnd(5,95)+'%',rnd(10,90)+'%');
   dots(30,'#fecaca',[2,5],[800,1400]); shake(12); await wait(1500); flash('#fff',500,1); shake(20); await wait(500); await title('الساحة الشريرة','تقطيع لا يُحصى','#ef4444',1700);
 },

 /* ---------- ماداراً ---------- */
 async meteor(x){
   const {W,H,p,port,flash,ring,title,pop,dir,dots}=x;
   const sky=p('',{inset:0,background:'linear-gradient(#1c0a04,#7c2d12 70%,#431407)',zIndex:56,opacity:0}); go(sky,[{opacity:0},{opacity:1}],600);
   const por=port({filter:'brightness(.7)'}); por.style.top='64%'; por.style.width=W*.18+'px'; por.style.height=W*.26+'px';
   go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],500); await wait(600);
   pop('انظر إلى السماء...','#fed7aa','50%','12%',28,1400);
   for(let i=0;i<10;i++){ const r=p('🪨',{left:rnd(10,90)+'%',top:'70%',fontSize:rnd(18,34)+'px',zIndex:60,opacity:0}); go(r,[{transform:C(0,0),opacity:0},{transform:C(rnd(-20,20),-H*rnd(.5,.9),`rotate(${rnd(-90,90)}deg)`),opacity:1,offset:.6},{transform:C(rnd(-20,20),-H*rnd(.55,.95),`rotate(${rnd(-180,180)}deg)`),opacity:.6}],2000,{delay:i*120/speed}); }
   shake(8); await wait(1500);
   const msz=Math.min(H*.55,230);
   const m=p(`<div style="position:relative;width:100%;height:100%"><div style="position:absolute;left:50%;bottom:48%;width:46%;height:130%;transform:translateX(-50%);background:linear-gradient(0deg,#fb923c,#ef444499 35%,transparent);filter:blur(7px);border-radius:50%"></div><div style="position:absolute;left:50%;top:52%;width:62%;height:62%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 35% 30%,#fdba74,#c2410c 35%,#431407 70%,#1c0a04);box-shadow:0 0 50px #f97316,0 0 120px #ef4444"></div></div>`,{left:'50%',top:'0',width:msz+'px',height:msz+'px',zIndex:80,opacity:0});
   go(m,[{transform:C(-dir*W*.2,-H*.5,'scale(.3)'),opacity:0},{transform:C(dir*W*.12,H*.05,'scale(1.1)'),opacity:1,offset:.7},{transform:C(dir*W*.3,H*.42,'scale(1.7)'),opacity:1}],1300,{easing:'ease-in'});
   pop('تِنغاي شينسي!','#fb923c','50%','78%',34,1400); await wait(1200);
   flash('#fff',700,1); shake(24); ring('#f97316',8,1200); ring('#fff',6,1000,150);
   for(let i=0;i<16;i++){ const r=p('🔥',{left:'50%',top:'60%',fontSize:rnd(20,40)+'px',zIndex:82,opacity:0}); go(r,[{transform:C(0,0,'scale(.3)'),opacity:1},{transform:C(rnd(-W*.45,W*.45),rnd(-H*.4,H*.1),'scale(1.3)'),opacity:0}],1000); }
   await wait(1000); await title('نيزك — تِنغاي شينسي','نهاية العالم من السماء','#fb923c',1700);
 },
 async susanoo(x){
   const {W,H,p,port,flash,ring,title,pop,dots}=x;
   const por=port({borderColor:'#a855f7',boxShadow:'0 0 30px #a855f7',filter:'brightness(.75)'}); go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(450);
   pop('سوسانو!','#d8b4fe','50%','14%',44,1100); dots(28,'#c084fc',[2,6],[900,1800]);
   // أضلاع الهيكل تتشكّل
   const ph=Math.min(H*.66,300);
   for(let i=0;i<6;i++){ const rb=p('',{left:'50%',top:`calc(50% - ${ph*.34}px + ${i*ph*.12}px)`,width:(ph*.78-i*10)+'px',height:'20px',borderTop:'6px solid #c084fc',borderRadius:'50%',boxShadow:'0 -6px 18px #a855f7',zIndex:66,opacity:0}); go(rb,[{transform:C(0,0,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1.15)'),opacity:1,offset:.6},{transform:C(0,0,'scale(1)'),opacity:.95}],700,{delay:i*140/speed}); }
   await wait(1000);
   const spine=p('',{left:'50%',top:'50%',width:'8px',height:ph*.8+'px',background:'linear-gradient(#c084fc,#7e22ce)',boxShadow:'0 0 22px #a855f7',zIndex:66,opacity:0}); go(spine,[{transform:C(0,0,'scaleY(0)'),opacity:1},{transform:C(0,0,'scaleY(1)'),opacity:1}],500);
   ring('#a855f7',5,1000); await wait(500);
   // الدرع الكامل: عملاق شفاف خلف المقاتل بعينين متوهجتين
   const gi=p('',{left:'50%',top:'46%',width:W*.62+'px',height:H*.9+'px',borderRadius:'50% 50% 20% 20%/40% 40% 10% 10%',background:'radial-gradient(circle at 50% 30%,#d8b4fe88,#7e22ce55 60%,transparent 72%)',border:'4px solid #c084fc',boxShadow:'0 0 60px #a855f7,inset 0 0 60px #7e22ce',zIndex:58,opacity:0}); go(gi,[{transform:C(0,40,'scale(.5)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],900);
   [-1,1].forEach(sg=>{ const ey=p('',{left:`calc(50% + ${sg*W*.09}px)`,top:'20%',width:'46px',height:'12px',background:'#fde047',borderRadius:'60%',boxShadow:'0 0 24px #facc15',zIndex:67,opacity:0,transform:`translate(-50%,-50%) rotate(${sg*-14}deg)`}); go(ey,[{opacity:0},{opacity:1}],400,{delay:500/speed}); });
   const sw=p('⚔️',{left:'80%',top:'55%',fontSize:'90px',zIndex:68,filter:'drop-shadow(0 0 18px #a855f7) hue-rotate(250deg)',opacity:0}); go(sw,[{transform:C(40,60,'rotate(-40deg) scale(.5)'),opacity:0},{transform:C(0,0,'rotate(0) scale(1.2)'),opacity:1}],800,{delay:600/speed});
   flash('#e9d5ff',500,.8); shake(10); await wait(1500); await title('سوسانو الكامل','الدرع الذي لا يُخترق','#c084fc',1700);
 },
 async rikudo(x){
   const {W,H,p,port,flash,ring,title,pop,orbit}=x;
   const eye=p('',{left:'50%',top:'50%',width:Math.min(W,H)*1.5+'px',height:Math.min(W,H)*1.5+'px',borderRadius:'50%',background:'repeating-radial-gradient(circle,#4c1d95 0 8px,#0b0615 9px 22px,#a78bfa 23px 25px,#0b0615 26px 40px)',boxShadow:'0 0 60px #7c3aed',zIndex:56,opacity:0});
   go(eye,[{transform:C(0,0,'scale(.2) rotate(0)'),opacity:0},{transform:C(0,0,'scale(1) rotate(180deg)'),opacity:.9}],1800);
   const por=port({filter:'brightness(.8) hue-rotate(250deg)'}); go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(500);
   pop('ريكودو... اثبت.','#c4b5fd','50%','14%',34,1300);
   orbit('⚫',9,Math.min(W*.36,250),3200,{size:34,filter:'drop-shadow(0 0 12px #a78bfa)',turns:2,z:66});
   ring('#a78bfa',5,1200); ring('#fff',6,1400,300); await wait(1500);
   const stop=p('⛓️',{left:'50%',top:'50%',fontSize:Math.min(H*.6,240)+'px',zIndex:80,opacity:0,filter:'drop-shadow(0 0 20px #7c3aed)'});
   go(stop,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1,offset:.5},{transform:C(0,0,'scale(1.3)'),opacity:0}],1200);
   flash('#ddd6fe',500,.8); shake(8); await wait(1300); await title('ريكودو — حكيم المسارات','الأجسام السوداء تشلّ الخصم','#a78bfa',1700);
 },
 async tsukuyomi(x){
   const {W,H,p,port,dport,flash,ring,title,pop,dots,D}=x;
   const sky=p('',{inset:0,background:'radial-gradient(circle,#7f1d1d,#2a0505 80%)',zIndex:56,opacity:0}); go(sky,[{opacity:0},{opacity:1}],900);
   const moon=p('',{left:'50%',top:'36%',width:Math.min(W,H)*.7+'px',height:Math.min(W,H)*.7+'px',borderRadius:'50%',background:'repeating-radial-gradient(circle,#fecaca 0 6px,#dc2626 7px 12px,#450a0a 13px 18px)',boxShadow:'0 0 100px #dc2626',zIndex:57,opacity:0});
   go(moon,[{transform:C(0,0,'scale(.1) rotate(0)'),opacity:0},{transform:C(0,0,'scale(1) rotate(360deg)'),opacity:1}],2400);
   [0,1,2].forEach(i=>{ const to=p('',{left:'50%',top:'36%',width:'26px',height:'26px',borderRadius:'50%',background:'#0b0000',boxShadow:'0 0 12px #000',zIndex:58,opacity:0}); const a=i*2.094; go(to,[{transform:C(0,0),opacity:0},{transform:C(Math.cos(a)*Math.min(W,H)*.2,Math.sin(a)*Math.min(W,H)*.2),opacity:1}],1800,{delay:600/speed}); });
   const por=port(); por.style.top='76%'; por.style.left='18%'; por.style.width=W*.17+'px'; por.style.height=W*.24+'px'; por.style.zIndex=63;
   go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],500);
   pop('انظر إلى القمر...','#fecaca','50%','10%',32,1500); dots(24,'#fca5a5'); await wait(2000);
   const dp=dport({borderColor:'#fecaca'}); dp.style.top='58%'; dp.style.left='62%'; dp.style.filter='grayscale(.6) brightness(.9)'; go(dp,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],500);
   const cross=p('✦',{left:'62%',top:'58%',fontSize:Math.min(H*.7,260)+'px',color:'#7f1d1d',textShadow:'0 0 30px #dc2626',zIndex:61,opacity:.8});
   for(let i=0;i<5;i++){ const ch=p('⛓️',{left:`${44+i*3}%`,top:`${50+(i%2)*10}%`,fontSize:'34px',zIndex:64,opacity:0}); go(ch,[{transform:C(0,-30),opacity:0},{transform:C(0,0),opacity:1}],400,{delay:i*120/speed}); }
   pop('نمْ في حلمي.','#fff','50%','86%',32,1300); flash('#7f1d1d',900,.8); shake(8);
   for(let i=0;i<5;i++){ go(dp,[{filter:'grayscale(1) brightness(.6)'},{filter:'invert(1)'},{filter:'grayscale(.6) brightness(.9)'}],300,{delay:i*300/speed,fill:'none'}); }
   await wait(2000); flash('#fff',600,1); await title('تسوكيومي اللانهائي','حلم بلا نهاية','#ef4444',1700);
 },

 /* ---------- آيزن ---------- */
 async kyoka(x){
   const {W,H,p,port,dport,flash,ring,title,pop,dots,D}=x;
   const por=port({filter:'brightness(.8)'}); por.style.left='28%'; go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400);
   const dp=dport(); dp.style.left='72%'; go(dp,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400,{delay:200/speed});
   await wait(700); pop('منذ البداية...','#c4b5fd','50%','14%',34,1500);
   // ظلال/أوهام الخصم تتضاعف وتتحرك
   const gh=[1,2,3].map(i=>{ const g=dport({opacity:0,filter:`hue-rotate(${i*60}deg) blur(1px)`,zIndex:61}); g.style.left='72%'; return go(g,[{transform:C(0,0),opacity:0},{transform:C((i%2?1:-1)*i*26,i*8),opacity:.55}],1200,{delay:i*250/speed}); });
   for(let i=0;i<10;i++){ const b=p('🦋',{left:'30%',top:'50%',fontSize:rnd(22,40)+'px',zIndex:70,filter:'drop-shadow(0 0 8px #a78bfa)',opacity:0}); go(b,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(rnd(W*.1,W*.5),rnd(-H*.35,H*.35),`rotate(${rnd(-40,40)}deg)`),opacity:1,offset:.6},{transform:C(rnd(W*.2,W*.55),rnd(-H*.4,H*.4)),opacity:0}],1600,{delay:i*110/speed}); }
   await wait(1700); flash('#fff',350,.9);
   // مرآة تتحطّم
   for(let i=0;i<14;i++){ const sh=p('',{left:'50%',top:'50%',width:rnd(30,90)+'px',height:rnd(40,110)+'px',background:'linear-gradient(135deg,#ffffffcc,#a78bfa88)',clipPath:`polygon(${rnd(0,40)}% 0,100% ${rnd(0,40)}%,${rnd(60,100)}% 100%,0 ${rnd(60,100)}%)`,zIndex:92,opacity:0}); go(sh,[{transform:C(0,0,'scale(.2)'),opacity:1},{transform:C(rnd(-W*.5,W*.5),rnd(-H*.5,H*.5),`rotate(${rnd(-300,300)}deg) scale(1.3)`),opacity:0}],1200); }
   shake(10); ring('#c4b5fd',6,1000); await wait(1100); await title('كيوكا سويغيتسو','التنويم الكامل','#c4b5fd',1600);
 },
 async kido90(x){
   const {W,H,p,port,dport,flash,ring,title,pop,dots,D}=x;
   const por=port({filter:'brightness(.8)'}); por.style.left='26%'; go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400);
   const dp=dport(); dp.style.left='74%'; go(dp,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400,{delay:200/speed});
   const chant=['يا قنبلة الدمار...','يا جوهر العدم...','فلتنشطر الأرض...','كيدو التسعين!'];
   for(let i=0;i<chant.length;i++){ pop(chant[i],i===3?'#e9d5ff':'#c4b5fd','50%',(14+i*10)+'%',i===3?40:24,1000,i*650); }
   await wait(2200);
   // ٤ منشورات سوداء ترتفع وتحيط بالخصم
   const dx=dp.getBoundingClientRect().left-arena().getBoundingClientRect().left;
   const prisms=[-1,1].flatMap(sg=>[0,1].map(j=>{ const b=p('',{left:`calc(74% + ${sg*(34+j*10)}px)`,top:'50%',width:'42px',height:H*.8+'px',background:'linear-gradient(90deg,#000,#1e1b4b,#000)',border:'2px solid #7c3aed',boxShadow:'0 0 20px #7c3aed',zIndex:70,opacity:0}); return b; }));
   prisms.forEach((b,i)=>go(b,[{transform:C(0,H*.8,'scaleY(.1)'),opacity:0},{transform:C(0,0,'scaleY(1)'),opacity:1}],600,{delay:i*160/speed}));
   await wait(1000); shake(14);
   const top=p('',{left:'74%',top:'18%',width:'120px',height:'28px',background:'linear-gradient(#000,#1e1b4b)',border:'2px solid #7c3aed',boxShadow:'0 0 24px #7c3aed',zIndex:72,opacity:0}); go(top,[{transform:C(0,-80),opacity:0},{transform:C(0,0),opacity:1}],400);
   const bot=p('',{left:'74%',top:'82%',width:'120px',height:'28px',background:'linear-gradient(#1e1b4b,#000)',border:'2px solid #7c3aed',boxShadow:'0 0 24px #7c3aed',zIndex:72,opacity:0}); go(bot,[{transform:C(0,80),opacity:0},{transform:C(0,0),opacity:1}],400);
   await wait(600); pop('كوروهيتسوغي','#e9d5ff','50%','78%',34,1000); flash('#000',500,1); await wait(350); flash('#a78bfa',500,.8); ring('#7c3aed',6,1000);
   [...prisms,top,bot].forEach(b=>go(b,[{opacity:1},{opacity:0,transform:b.style.transform+' scale(1.4)'}],500)); await wait(800); await title('كيدو التسعين — التابوت الأسود','سحر لا يُقاوَم','#a78bfa',1600);
 },
 async hogyoku(x){
   const {W,H,p,port,flash,ring,title,pop,dots,rays,s}=x, big=s.t==='K';
   const por=port({filter:'brightness(.8)'}); go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(450);
   pop(big?'تجاوزتُ الشيني...':'انتهيتُ من كوني شيئاً دونكم.','#ddd6fe','50%','14%',big?34:24,1500); dots(30,'#ddd6fe',[3,8],[1200,2400]);
   const orb=p('',{left:'50%',top:'50%',width:'80px',height:'80px',borderRadius:'50%',background:'radial-gradient(circle,#fff,#c4b5fd 40%,#7c3aed 70%,transparent)',boxShadow:'0 0 40px #a78bfa,0 0 90px #7c3aed',zIndex:70,opacity:0});
   go(orb,[{transform:C(0,-H*.4,'scale(.2)'),opacity:0},{transform:C(0,-20,'scale(1)'),opacity:1,offset:.6},{transform:C(0,-4,'scale(1.4)'),opacity:1}],1300);
   await wait(1300); ring('#c4b5fd',5,900);
   // شرنقة تتشقّق
   const co=p('',{left:'50%',top:'50%',width:pwf(x)*1.15+'px',height:pwf(x)*1.5+'px',borderRadius:'50%',background:'radial-gradient(circle,#ffffffee,#ddd6fe99 70%)',boxShadow:'0 0 40px #fff',zIndex:68,opacity:0}); go(co,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],700);
   await wait(800); shake(8);
   for(let i=0;i<7;i++) x.slashLine('#a78bfa',rnd(0,180),rnd(80,200),300,i*80,3,'50%','50%');
   await wait(700); flash('#fff',700,1); rm(co,orb); rays('#e9d5ff',2000);
   [-1,1].forEach(sg=>{ const w=p('🦋',{left:'50%',top:'50%',fontSize:Math.min(H*.7,300)+'px',zIndex:61,filter:'drop-shadow(0 0 24px #a78bfa) hue-rotate(20deg)',opacity:0,transform:C(0,0)}); go(w,[{transform:C(sg*20,0,`scale(.2) scaleX(${sg})`),opacity:0},{transform:C(sg*W*.22,-10,`scale(1.1) scaleX(${sg})`),opacity:.95},{transform:C(sg*W*.26,-14,`scale(1.2) scaleX(${sg})`),opacity:.95}],1200); });
   go(por,[{filter:'brightness(.8)'},{filter:'brightness(3)'},{filter:'brightness(1.3) saturate(1.3) drop-shadow(0 0 26px #a78bfa)'}],900);
   shake(14); ring('#fff',6,1100,100); await wait(1400); await title(big?'هوغيوكو — الاندماج':'هوغيوكو — تحوّل الفراشة','تجاوز الحدود','#c4b5fd',1700);
 },

 /* ---------- سايتاما ---------- */
 async serious(x){
   const {W,H,p,port,flash,ring,title,pop,dir}=x;
   const sil=p('…',{left:'50%',top:'44%',fontSize:'90px',color:'#fff',zIndex:70,opacity:0}); go(sil,[{opacity:0},{opacity:1},{opacity:1}],900);
   const lines=()=>{ for(let i=0;i<22;i++){ const a=i/22*360, ln=p('',{left:'50%',top:'50%',width:'55%',height:'2px',background:'linear-gradient(90deg,#fff,transparent)',transformOrigin:'0 50%',zIndex:58,opacity:0}); go(ln,[{transform:`translate(0,-50%) rotate(${a}deg) scaleX(.2)`,opacity:.9},{transform:`translate(0,-50%) rotate(${a}deg) scaleX(1.6)`,opacity:0}],700,{delay:i*20/speed}); } };
   await wait(1100); pop('لكمة جادة.','#fff','50%','24%',36,1200);
   lines(); const fist=p('👊',{left:'50%',top:'50%',fontSize:'40px',zIndex:80,filter:'drop-shadow(0 0 40px #fff)'});
   go(fist,[{transform:C(0,0,'scale(.3)'),opacity:1},{transform:C(0,0,'scale(8)'),opacity:1,offset:.75},{transform:C(0,0,'scale(10)'),opacity:0}],900);
   await wait(700); flash('#fff',900,1); shake(24);
   for(let i=0;i<5;i++) ring('#fde047',9,1100,i*120);
   for(let i=0;i<20;i++){ const cr=p('',{left:'50%',top:'50%',width:rnd(120,420)+'px',height:'3px',background:'linear-gradient(90deg,#fff,transparent)',zIndex:75,opacity:0}); const a=i*18+rnd(-8,8); go(cr,[{transform:`translate(0,-50%) rotate(${a}deg) scaleX(0)`,transformOrigin:'0 50%',opacity:1},{transform:`translate(0,-50%) rotate(${a}deg) scaleX(1)`,transformOrigin:'0 50%',opacity:.8,offset:.4},{transform:`translate(0,-50%) rotate(${a}deg) scaleX(1)`,transformOrigin:'0 50%',opacity:0}],1000); }
   await wait(900); await title('اللكمة الجادة','ضربة واحدة تكفي','#fde047',1500);
 },
 async seriousMode(x){
   const {W,H,p,port,flash,ring,title,pop,dots}=x;
   const por=port({filter:'grayscale(.5) brightness(.6)',borderColor:'#e5e7eb',boxShadow:'0 0 20px #fff'}); go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(700);
   pop('...','#fff','50%','20%',44,900); await wait(900);
   const shade=p('',{left:'50%',top:'34%',width:'100%',height:'22%',background:'linear-gradient(transparent,#000c,transparent)',zIndex:66,opacity:0}); go(shade,[{opacity:0},{opacity:1}],600);
   for(let i=0;i<5;i++){ const v=p('',{left:`calc(50% + ${rnd(-40,40)}px)`,top:`${rnd(30,50)}%`,width:'3px',height:rnd(20,50)+'px',background:'#ef4444',zIndex:67,opacity:0,transform:`rotate(${rnd(-30,30)}deg)`}); go(v,[{opacity:0},{opacity:.9}],500,{delay:i*100/speed}); }
   for(let i=0;i<30;i++){ const ln=p('',{left:'50%',top:'50%',width:'60%',height:'2px',background:'linear-gradient(90deg,#fff,transparent)',transformOrigin:'0 50%',zIndex:58,opacity:0}); go(ln,[{transform:`translate(0,-50%) rotate(${i*12}deg) scaleX(.3)`,opacity:.8},{transform:`translate(0,-50%) rotate(${i*12}deg) scaleX(1.5)`,opacity:0}],900,{delay:i*40/speed}); }
   go(por,[{transform:C(0,0)},{transform:C(-4,2)},{transform:C(4,-2)},{transform:C(-3,1)},{transform:C(0,0)}],900,{fill:'none',iterations:2});
   dots(26,'#fff',[1,3],[800,1600]); ring('#fff',5,1200); pop('حسناً… بجدّية.','#fde047','50%','78%',32,1400); shake(10);
   await wait(1300); flash('#fff',400,.7); await title('الوضع الجاد','القوة بلا حدود','#fde047',1500);
 },

 /* ---------- غوكو ---------- */
 async kamehameha(x){
   const {W,H,p,port,flash,ring,title,pop,dir,dots}=x;
   const por=port({filter:'brightness(.85)'}); por.style.left=dir>0?'30%':'70%'; go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(500);
   const ball=p('',{left:'50%',top:'58%',width:'70px',height:'70px',borderRadius:'50%',background:'radial-gradient(circle,#fff,#7dd3fc 45%,#0ea5e9 70%,transparent)',boxShadow:'0 0 30px #38bdf8',zIndex:70,opacity:0});
   ball.style.left=dir>0?'44%':'56%';
   const syl=['كا…','مي…','ها…','مي…'];
   for(let i=0;i<4;i++){ pop(syl[i],'#7dd3fc',(28+i*14)+'%','18%',30+i*4,900,i*480); go(ball,[{transform:C(0,0,`scale(${.5+i*.5})`),opacity:1}],400,{delay:i*480/speed}); }
   dots(30,'#7dd3fc',[2,6],[900,1800]); await wait(2000);
   pop('هــاااا!!','#fff','50%','18%',54,1000);
   const bm=p('',{left:dir>0?'44%':'56%',top:'calc(58% - 55px)',width:W*1.1+'px',height:'110px',transformOrigin:'0 50%',background:'linear-gradient(90deg,#fff,#bae6fd 20%,#38bdf8 60%,#0ea5e9)',borderRadius:'60px',boxShadow:'0 0 60px #38bdf8,0 0 120px #0ea5e9',zIndex:72,opacity:0});
   const rot=dir>0?0:180;
   go(bm,[{transform:`rotate(${rot}deg) scaleX(0)`,opacity:1},{transform:`rotate(${rot}deg) scaleX(1)`,opacity:1,offset:.2},{transform:`rotate(${rot}deg) scaleX(1) scaleY(1.2)`,opacity:1,offset:.7},{transform:`rotate(${rot}deg) scaleX(1) scaleY(.1)`,opacity:0}],1500);
   go(ball,[{transform:C(0,0,'scale(2.2)'),opacity:1},{transform:C(0,0,'scale(3)'),opacity:0}],900); flash('#e0f2fe',400,.8); ring('#38bdf8',6,1000);
   shake(18); await wait(1500); await title('كاميهاميها','موجة السلاحف','#38bdf8',1500);
 },
 async spiritBomb(x){
   const {W,H,p,port,flash,ring,title,pop,dir}=x;
   const por=port({filter:'brightness(.85)'}); por.style.top='62%'; por.style.width=W*.18+'px'; por.style.height=W*.26+'px'; go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400);
   const ball=p('',{left:'50%',top:'24%',width:'40px',height:'40px',borderRadius:'50%',background:'radial-gradient(circle,#fff,#bae6fd 40%,#38bdf8 70%,transparent)',boxShadow:'0 0 40px #38bdf8,0 0 90px #0ea5e9',zIndex:70,opacity:0});
   pop('أعطوني طاقتكم!','#bae6fd','50%','10%',32,1400);
   go(ball,[{transform:C(0,0,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],700);
   // خيوط الطاقة من كل الأطراف
   for(let i=0;i<30;i++){ const sx=rnd(0,100), sy=rnd(0,100), o=p('✨',{left:sx+'%',top:sy+'%',fontSize:rnd(14,26)+'px',zIndex:66,opacity:0,filter:'drop-shadow(0 0 8px #7dd3fc)'}); const tx=(50-sx)/100*W, ty=(24-sy)/100*H; go(o,[{transform:C(0,0),opacity:0},{transform:C(0,0),opacity:1,offset:.15},{transform:C(tx,ty,'scale(.3)'),opacity:0}],rnd(1200,2000),{delay:rnd(0,1500)/speed}); }
   for(let i=1;i<=4;i++) go(ball,[{transform:C(0,0,`scale(${i*1.6})`)}],700,{delay:i*500/speed});
   await wait(2600); shake(6);
   pop('سبيريت بومب!','#fff','50%','10%',46,1100);
   go(ball,[{transform:C(0,0,'scale(6.5)'),opacity:1},{transform:C(dir*W*.3,H*.15,'scale(7.5)'),opacity:1,offset:.6},{transform:C(dir*W*.35,H*.4,'scale(9)'),opacity:1}],1000,{easing:'ease-in'});
   await wait(1000); flash('#fff',800,1); shake(24); ring('#38bdf8',9,1300); ring('#fff',7,1100,150);
   await wait(1000); await title('سبيريت بومب','طاقة الكون كلّه','#38bdf8',1700);
 },
 async ssj(x){
   const {W,H,p,port,flash,ring,title,pop,rays,bolts,dots}=x;
   const por=port({filter:'brightness(.6)'}); go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(500);
   for(let i=0;i<7;i++){ const r=p('🪨',{left:rnd(15,85)+'%',top:'82%',fontSize:rnd(16,30)+'px',zIndex:60,opacity:0}); go(r,[{transform:C(0,0),opacity:0},{transform:C(0,-H*rnd(.2,.5),`rotate(${rnd(-90,90)}deg)`),opacity:1}],1600,{delay:i*160/speed}); }
   pop('آآآآآآه!!','#fde047','50%','16%',40,1500); shake(6);
   go(por,[{transform:C(-3,0)},{transform:C(3,0)},{transform:C(-3,0)},{transform:C(3,0)},{transform:C(0,0)}],700,{fill:'none',iterations:2});
   await wait(1300); bolts('#fde047',5); flash('#fef08a',500,1); rays('#fde047',2200); ring('#fde047',6,1100); ring('#fff',7,1300,200);
   go(por,[{filter:'brightness(.6)'},{filter:'brightness(3)'},{filter:'brightness(1.3) saturate(1.5) drop-shadow(0 0 28px #fde047)'}],900);
   const au=p('',{left:'50%',top:'60%',width:pwf(x)*1.5+'px',height:pwf(x)*2.4+'px',borderRadius:'50% 50% 10% 10%',background:'radial-gradient(ellipse at 50% 100%,#fde047aa,transparent 70%)',zIndex:60,opacity:0}); go(au,[{opacity:0},{opacity:1}],700);
   for(let i=0;i<20;i++){ const f=p('',{left:`${rnd(35,65)}%`,top:'80%',width:'4px',height:rnd(30,80)+'px',background:'linear-gradient(#fde047,transparent)',zIndex:64,opacity:0}); go(f,[{transform:C(0,0),opacity:1},{transform:C(0,-H*.5),opacity:0}],900,{delay:i*70/speed}); }
   shake(14); pop('سوبر ساين!','#fff','50%','80%',40,1200,300); await wait(1500); await title('سوبر ساين','الشعر الذهبي','#fde047',1500);
 },
 async ui(x){
   const {W,H,p,port,flash,ring,title,pop,dots,slashLine}=x;
   const por=port({filter:'grayscale(.4) brightness(1.2)',borderColor:'#e5e7eb',boxShadow:'0 0 34px #e5e7eb'}); go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(500);
   pop('جسدي يتحرك وحده...','#e5e7eb','50%','14%',28,1500); dots(26,'#e5e7eb',[2,5],[1000,2000]);
   // صور لاحقة (Afterimages) + هجمات تمرّ بلا أثر
   for(let i=0;i<6;i++){ const g=x.port({opacity:0,filter:'grayscale(1) brightness(1.4)',zIndex:61,boxShadow:'none'}); go(g,[{transform:C(0,0),opacity:.6},{transform:C((i%2?1:-1)*(40+i*22),i*4),opacity:0}],900,{delay:i*220/speed}); slashLine('#fff',rnd(-40,40),W*.8,320,i*220+80,4,'50%',rnd(30,70)+'%'); }
   ring('#e5e7eb',5,1100); ring('#fff',6,1300,500);
   const sw=p('',{top:0,bottom:0,left:0,width:'40%',background:'linear-gradient(90deg,transparent,#e5e7ebcc,transparent)',zIndex:66,opacity:0}); go(sw,[{transform:'translateX(-120%) skewX(-20deg)',opacity:1},{transform:'translateX(320%) skewX(-20deg)',opacity:1}],1600);
   await wait(1600); flash('#e5e7eb',500,.7); await title('الغريزة الفائقة','يتفادى دون تفكير','#e5e7eb',1500);
 },

 /* ---------- إيتشيغو ---------- */
 async getsuga(x){
   const {W,H,p,port,flash,ring,title,pop,dir}=x;
   const por=port({filter:'brightness(.75)',borderColor:'#ef4444'}); go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(500);
   pop('غيتسوغا...','#fca5a5','50%','16%',36,1100);
   const sw=p('🗡️',{left:'50%',top:'50%',fontSize:'110px',zIndex:70,filter:'drop-shadow(0 0 22px #ef4444) drop-shadow(0 0 40px #000)',opacity:0});
   go(sw,[{transform:C(0,40,'rotate(-120deg) scale(.5)'),opacity:0},{transform:C(0,0,'rotate(-60deg) scale(1.2)'),opacity:1,offset:.5},{transform:C(0,0,'rotate(30deg) scale(1.3)'),opacity:1}],1200);
   for(let i=0;i<14;i++){ const f=p('',{left:`${rnd(40,60)}%`,top:'60%',width:'4px',height:rnd(20,60)+'px',background:'linear-gradient(#ef4444,#000,transparent)',zIndex:64,opacity:0}); go(f,[{transform:C(0,0),opacity:1},{transform:C(0,-H*.4),opacity:0}],900,{delay:i*70/speed}); }
   await wait(1250); pop('تنشو!!','#fff','50%','16%',50,900); flash('#000',250,1);
   const cr=p('',{left:'50%',top:'50%',width:W*.75+'px',height:H*.5+'px',borderTop:'26px solid #fff',borderLeft:'0 solid transparent',borderRight:'0 solid transparent',borderRadius:'50% 50% 0 0/100% 100% 0 0',boxShadow:'0 -14px 0 #ef4444,0 -30px 40px #7f1d1d,0 -60px 90px #000',zIndex:80,opacity:0});
   go(cr,[{transform:C(-dir*W*.2,0,`rotate(${dir>0?90:-90}deg) scale(.4)`),opacity:0},{transform:C(0,0,`rotate(${dir>0?90:-90}deg) scale(1)`),opacity:1,offset:.25},{transform:C(dir*W*.5,0,`rotate(${dir>0?90:-90}deg) scale(1.4)`),opacity:1,offset:.75},{transform:C(dir*W*.9,0,`rotate(${dir>0?90:-90}deg) scale(1.6)`),opacity:0}],1300);
   shake(16); ring('#ef4444',6,1000); await wait(1300); await title('غيتسوغا تنشو','أول هلال للقمر','#ef4444',1500);
 },
 async bankai(x){
   const {W,H,p,port,flash,ring,title,pop,rays,dots}=x;
   const por=port({borderColor:'#ef4444'}); por.style.top='64%'; go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(500);
   pop('بانكاي!','#ef4444','50%','14%',44,1100);
   const pil=p('',{left:'50%',bottom:'0',width:pwf(x)*1.1+'px',height:H*1.1+'px',background:'linear-gradient(0deg,#ef4444,#7f1d1d 40%,#000 70%,transparent)',boxShadow:'0 0 60px #7f1d1d',zIndex:60,opacity:0,transformOrigin:'50% 100%'});
   go(pil,[{transform:'translateX(-50%) scaleY(0)',opacity:1},{transform:'translateX(-50%) scaleY(1)',opacity:.95}],1100);
   shake(8); dots(36,'#ef4444',[2,6],[900,1900]); ring('#7f1d1d',5,1200); ring('#000',6,1400,200);
   await wait(1200); go(por,[{filter:'brightness(.8)'},{filter:'brightness(2.5)'},{filter:'contrast(1.35) brightness(.85) saturate(.7) drop-shadow(0 0 28px #ef4444)'}],700);
   flash('#fff',350,1); await wait(300); flash('#000',500,.8); rays('#ef4444',1800,-1);
   const co=p('🧥',{left:'50%',top:'66%',fontSize:'90px',zIndex:70,filter:'drop-shadow(0 0 14px #ef4444) grayscale(1) brightness(.2)',opacity:0}); go(co,[{transform:C(0,-30,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1.3) rotate(-6deg)'),opacity:1},{transform:C(0,-6,'scale(1.2) rotate(6deg)'),opacity:1}],1100);
   pop('تنسا زانغيتسو','#fca5a5','50%','80%',32,1300,200); await wait(1500); await title('بانكاي — تنسا زانغيتسو','سيف القمر القاطع للسماء','#ef4444',1600);
 },
 async mugetsu(x){
   const {W,H,p,port,flash,ring,title,pop,dir,dots}=x;
   const por=port({borderColor:'#7f1d1d'}); go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(500);
   pop('آخر غيتسوغا...','#fecaca','50%','14%',34,1500);
   // امتصاص الطاقة: كل شيء ينسحب إلى المقاتل
   for(let i=0;i<34;i++){ const sx=rnd(0,100), sy=rnd(0,100), o=p('',{left:sx+'%',top:sy+'%',width:rnd(3,9)+'px',height:rnd(3,9)+'px',borderRadius:'50%',background:i%2?'#ef4444':'#000',boxShadow:'0 0 8px #ef4444',zIndex:66,opacity:0}); go(o,[{transform:C(0,0),opacity:0},{transform:C(0,0),opacity:1,offset:.15},{transform:C((50-sx)/100*W,(50-sy)/100*H,'scale(.3)'),opacity:0}],rnd(1200,2000),{delay:rnd(0,1400)/speed}); }
   go(por,[{filter:'brightness(1)'},{filter:'brightness(.15) contrast(2) drop-shadow(0 0 20px #ef4444)'}],2400);
   shake(5); ring('#7f1d1d',4,1500); ring('#000',6,1700,500); await wait(2400);
   const eye=p('',{left:'50%',top:'50%',width:'14px',height:H*.9+'px',background:'linear-gradient(transparent,#fff,transparent)',boxShadow:'0 0 40px #fff,0 0 90px #ef4444',zIndex:85,opacity:0});
   pop('مو... غيتسو.','#fff','50%','80%',40,1400);
   go(eye,[{transform:C(0,0,`scaleY(0) rotate(${dir>0?20:-20}deg)`),opacity:1},{transform:C(0,0,`scaleY(1) rotate(${dir>0?20:-20}deg)`),opacity:1,offset:.3},{transform:C(0,0,`scaleY(1) scaleX(40) rotate(${dir>0?20:-20}deg)`),opacity:1,offset:.7},{transform:C(0,0,`scaleY(1) scaleX(80) rotate(${dir>0?20:-20}deg)`),opacity:0}],1500);
   await wait(1000); flash('#fff',900,1); shake(26); await wait(700); await title('مو غيتسو','الغيتسوغا الأخير','#ef4444',1700);
 },
};
const pwf=x=>Math.min(x.H*.66,300)*.72;

/* ================================================================
   المحادثة الذكية بين المقاتلين (على نمط ملف العرض):
   حوار افتتاحي لكل مواجهة + تعليق يتبع ما حدث فعلاً بعد كل حركة
   ================================================================ */
const pickL=a=>a[Math.floor(Math.random()*a.length)];
const STYLE_TAG={yama:'محارب',eren:'مدمّر',raizel:'نبيل',shanks:'هادئ',zoro:'سيّاف',dokja:'قارئ',zeldris:'مقاتل',gilgamesh:'متعجرف',ashborn:'ملك',meruem:'متطوّر',hashirama:'متوازن',gojo:'متفوّق',sukuna:'وحش',goku:'متأقلم',saitama:'هادئ',luffy:'جامح',kaido:'وحش',naruto:'عنيد',madara:'استراتيجي',ichigo:'مقاتل',aizen:'مدبّر',zeno:'مطلق',whis:'معلّم',feather:'كاتبة',anos:'طاغية',rimuru:'مفترس',beerus:'مدمّر',vegito:'سريع',gogeta:'ساحق',yhwach:'متنبّئ',kaguya:'غامضة',shadow:'غامض',jinwoo:'مستدعٍ',imu:'حاكم',escanor:'ملتهب',melio:'منتقم',lucius:'متحكّم',ainz:'مدبّر',acno:'وحش',hago:'حكيم',jiren:'صلب',blast:'غامض',garou:'متعلّم',broly:'جامح',muzan:'متجدّد',wbeard:'أب',roger:'حرّ',rocks:'طاغية',zeref:'ملعون',merlin:'ساحرة'};
const GEN={taunt:['هيا بنا!','سأنهي هذا بسرعة.'],pain:['تسك... ضربة جيدة.'],low:['لن أستسلم!'],form:['الآن... سأريك قوتي!'],awe:['ما هذه القوة؟!'],kill:['انتهى الأمر.'],block:['كيف لم أصبه؟!'],shrug:['هذا كل ما لديك؟'],dodge:['أخطأت!']};
const CH={
 wbeard:{taunt:['غورا غورا!','أنا أقوى رجل.'],pain:['غورا... ضربة جيدة.'],low:['أبنائي ينتظرونني!'],form:['لن أتراجع.'],awe:['شاب جريء!'],kill:['شقّ الفضاء!','سأحطّم العالم.'],block:['لا شيء يخترقني.'],shrug:['غورا غورا!'],dodge:['بطيء!']},
 roger:{taunt:['ها ها ها! الحرية!','أسمع حركتك.'],pain:['ممتع!'],low:['لم تنتهِ المغامرة بعد.'],form:['هاكي أسود.'],awe:['جيل جديد!'],kill:['الرحيل الأعظم!','سيف إيس!'],block:['أسمع حركتك.'],shrug:['ها ها!'],dodge:['أسمعك.']},
 rocks:{taunt:['العالم لي.','سأحكم كل شيء!'],pain:['تجرؤ؟'],low:['لن تمرّ.'],form:['اخضعوا.'],awe:['جريء.'],kill:['سحق!','إلى البحر!'],block:['لن تمرّ.'],shrug:['عبث.'],dodge:['بطيء.']},
 zeref:{taunt:['لا أصلح للبقاء.','الموت يلاحقك.'],pain:['لا أموت.'],low:['لن يقتلني شيء.'],form:['لعنتي تحميني.'],awe:['ربما تنجح.'],kill:['إنكانتوس.','آلاف التعاويذ!'],block:['لعنتي تحميني.'],shrug:['عبث.'],dodge:['متوقَّع.']},
 merlin:{taunt:['العالم يعكسك.','لنلعب قليلاً.'],pain:['أوه، لا بأس.'],low:['لنعد للوراء.'],form:['حان وقت الجدية.'],awe:['مدهش!'],kill:['حان وقت النهاية.','ميتيور!'],block:['العالم يعكسك.'],shrug:['ببساطة.'],dodge:['بطيء.']},
 yama:{taunt:['احترق.','ناري لا تنطفئ.'],pain:['همم.'],low:['لن أسقط.'],form:['بانكاي!'],awe:['قوي.'],kill:['زانكا نو تاشي!','جدار النار!'],block:['لهبي حولي.'],shrug:['عبث.'],dodge:['بطيء.']},
 eren:{taunt:['سأمحو العالم.','تحرّكوا!'],pain:['آه.'],low:['لن أتوقف.'],form:['جسدي يتجدد.'],awe:['قوي.'],kill:['الرامبل!','سأمحو العالم!'],block:['تصلّب.'],shrug:['عبث.'],dodge:['بطيء.']},
 raizel:{taunt:['دمك لي.','قيودي حولك.'],pain:['لا بأس.'],low:['أُطلقُ قوتي.'],form:['أُطلقُ قوتي.'],awe:['مثير.'],kill:['رمح الروح!','دمك لي.'],block:['درعي دم.'],shrug:['عبث.'],dodge:['بطيء.']},
 shanks:{taunt:['اثبت.','لا أريد القتال.'],pain:['همم.'],low:['ما زلتُ واقفاً.'],form:['هاكي أسود.'],awe:['جدير.'],kill:['غريفون!','سيف حاد.'],block:['لن تمرّ.'],shrug:['هه.'],dodge:['بطيء.']},
 zoro:{taunt:['هل تريد القتال؟','سأصبح الأقوى.'],pain:['تسك!'],low:['لن أخسر!'],form:['هاكي الملوك.'],awe:['قوي!'],kill:['أسورا!','ساندورو!'],block:['هاكي الدرع.'],shrug:['خدش.'],dodge:['بطيء.']},
 dokja:{taunt:['أعرف نهاية القصة.','قرأتُ هذا.'],pain:['كنتُ أعرف.'],low:['قصتي لا تنتهي.'],form:['شخصية خيالية.'],awe:['لم أقرأها قادمة.'],kill:['القصة الأخيرة!','أبطال الأساطير!'],block:['درع القصة.'],shrug:['مجرد حبر.'],dodge:['كنتُ أعرف.']},
 zeldris:{taunt:['اركع.','أنا قائد الوصايا.'],pain:['لا بأس.'],low:['لن أسقط هنا.'],form:['سأحكمهم جميعاً.'],awe:['جدير بالاحترام.'],kill:['انفجار!','سيف القمر!'],block:['وصيتي تحميني.'],shrug:['عبث.'],dodge:['بطيء.']},
 gilgamesh:{taunt:['يا للحشرات!','كل شيء لي.'],pain:['تجرؤ على جرح الملك؟'],low:['حتى هذا... يمرّ.'],form:['كنوزي كلها لي.'],awe:['لا بأس بك.'],kill:['إيا!','اسقطي.'],block:['لا يليق بي.'],shrug:['تافه.'],dodge:['بطيء.']},
 ashborn:{taunt:['اخضع للملك.','الظلال تنتظرك.'],pain:['همم.'],low:['الظلال لا تموت.'],form:['اخضعوا لحكمي.'],awe:['مثير.'],kill:['تحرّروا!','قطع ملكي.'],block:['ظلامي يحميني.'],shrug:['عبث.'],dodge:['بطيء.']},
 meruem:{taunt:['اركع أمام الملك.','أنا الملك.'],pain:['همم... ممتع.'],low:['أتطور.'],form:['أتطور.'],awe:['تستحق اسمك.'],kill:['قصف الملك!','ضربة ملكية!'],block:['تكيّفتُ.'],shrug:['ضعيف.'],dodge:['بطيء.']},
 hashirama:{taunt:['فلنقاتل بصدق.','أنا أسطورة الشينوبي.'],pain:['ما زلت واقفاً!'],low:['لن أسقط.'],form:['مود الحكيم.'],awe:['قوي حقاً!'],kill:['العملاق الخشبي!','أغصان!'],block:['لن تمرّ.'],shrug:['هه.'],dodge:['بطيء.']},
 jiren:{taunt:['أرني إرادتك.','لا حدود لي.'],pain:['همم... لا بأس.'],low:['لن أسقط.'],form:['لا حدود.'],awe:['قوة تستحق.'],kill:['كل شيء... احترق.','انتهى.'],block:['لن تتحرك.'],shrug:['هذا كل شيء؟'],dodge:['بطيء.']},
 blast:{taunt:['سأنهيها بسرعة.','تعال.'],pain:['همم؟'],low:['عدتُ.'],form:['حسناً... جدياً.'],awe:['قوي!'],kill:['انتهى.','ضربة واحدة.'],block:['مررتُ.'],shrug:['لا شيء.'],dodge:['مررتُ.']},
 garou:{taunt:['أنا وحش الأبطال.','قوتك صارت لي.'],pain:['أقوى بعد كل ضربة!'],low:['لن أسقط!'],form:['حفظتُ حركتك.'],awe:['مذهل!'],kill:['قبضة المجرة!','أنا الوحش.'],block:['حفظتُ حركتك.'],shrug:['هذا كل شيء؟'],dodge:['أبطأ!']},
 broly:{taunt:['غرااااه!','سأحطّمك.'],pain:['غررر!'],low:['قوتي لا تتوقف!'],form:['قوتي لا تتوقف.'],awe:['قوي!'],kill:['إيريزر كانون!','مت!'],block:['لا شيء يخدشني.'],shrug:['هذا كل شيء؟'],dodge:['غرر!']},
 muzan:{taunt:['أنا كامل.','تجرؤ على لمسي؟'],pain:['كيف تجرؤ!'],low:['لن تقتل ما تفرّق.'],form:['هذا شكلي الحقيقي.'],awe:['مزعج.'],kill:['مزّقوه.','دمي سم.'],block:['لن تقتل ما تفرّق.'],shrug:['عبث.'],dodge:['بطيء.']},
 melio:{taunt:['أنا قائد الخطايا.','أنتقم بضعف قوتك.'],pain:['ههه... هذا يؤلم!'],low:['لن أسقط بهذه السهولة.'],form:['سأريك جانبي المظلم.'],awe:['قوة مثيرة!'],kill:['انفجار!','انتهت المهزلة.'],block:['سأردّها لك مضاعفة!'],shrug:['هذا كل شيء؟'],dodge:['بطيء!']},
 lucius:{taunt:['الزمن ملكي.','ثانية واحدة تكفي.'],pain:['مزعج.'],low:['لنعد الزمن قليلاً.'],form:['سأريك الزمن الحقيقي.'],awe:['مدهش... لكنه لا يكفي.'],kill:['فناء الزمن!','كان ذلك سهلاً.'],block:['مانا بلا ثغرات.'],shrug:['لا يؤثر زمنك فيّ.'],dodge:['لم تلمسني.']},
 ainz:{taunt:['أمام عظمة ناثريك.','المجد لسادتي.'],pain:['همم... قاومتُ.'],low:['لن يسقط ملك الموتى.'],form:['سحري يتضاعف.'],awe:['مثير للاهتمام.'],kill:['وورلد دزاستر.','المجد لناثريك.'],block:['لا سحر يمرّ.'],shrug:['عبث.'],dodge:['متوقَّع.']},
 acno:{taunt:['أنا آخر تنين.','النهاية قادمة.'],pain:['غرررر!'],low:['لن أسقط!'],form:['ارتجف.'],awe:['جريء!'],kill:['زئير الإبادة!','احترق مع العالم.'],block:['حراشفي لا تُخترق.'],shrug:['ظننتَها لعبة؟'],dodge:['أبطأ!']},
 hago:{taunt:['أنا الحكيم.','قوتي من الأصل.'],pain:['همم... قوة جيدة.'],low:['سلام... لكنني لن أسقط.'],form:['طاقة الطبيعة.'],awe:['جدير بالتقدير.'],kill:['نمْ في القمر.','سلام.'],block:['حاجزي.'],shrug:['اهدأ.'],dodge:['أخطأت.']},
 shadow:{taunt:['أنا الظل في الظلام.','كل شيء حسب الخطة.'],pain:['همم... ضمن الحسبان.'],low:['وهذا أيضاً جزء من الخطة.'],form:['حان وقت الكشف.'],awe:['مثير للاهتمام.'],kill:['أتـوووميك!','انتهى المسرح.'],block:['تأخرتَ.'],shrug:['لا شيء يُذكر.'],dodge:['بطيء.']},
 jinwoo:{taunt:['انهضوا.','أنا الملك الآن.'],pain:['ظلّي يتجدد.'],low:['لن أسقط.'],form:['اخضعوا.'],awe:['قوي... لكن لا يكفي.'],kill:['جيش الظلال!','كل شيء... يسقط.'],block:['ظلالي تحميني.'],shrug:['لا تهزّني.'],dodge:['أبطأ.']},
 imu:{taunt:['اركع.','لا يمسّني أحد.'],pain:['تجرؤ؟'],low:['العرش لا يسقط.'],form:['فكّرتَ... وانتهى.'],awe:['مثير... لكنه عبث.'],kill:['لا وجود لك.','احذف من الوجود.'],block:['العرش لا يُمسّ.'],shrug:['عبث.'],dodge:['لن تلمسني.']},
 escanor:{taunt:['الشمس تشرق!','أنا الأقوى.'],pain:['حرارتي أكبر.'],low:['الظهيرة لم تأتِ بعد!'],form:['الآن... الظهيرة!'],awe:['يا لها من قوة!'],kill:['سانشاين!','احترق.'],block:['وهجي يحميني.'],shrug:['هذا كل شيء؟'],dodge:['بطيء كالظل!']},
 beerus:{taunt:['أرني ما عندك قبل أن أنعس.','سأدمّرك إن لم تسلّني.'],pain:['همم؟ جريء.'],low:['حسناً... سأستيقظ.'],form:['ارتجف.'],awe:['ممتع!'],kill:['هاكاي.','انتهت اللعبة.'],block:['ههه، لا بأس.'],shrug:['مياو... مللت.'],dodge:['بطيء.']},
 vegito:{taunt:['أنا لستُ غوكو ولا فيجيتا.','أرني ما عندك.'],pain:['ليس سيئاً.'],low:['لن ننتهي بهذه السهولة.'],form:['سنُنهي هذا الآن.'],awe:['قوي!'],kill:['انتهى.','كان قتالاً جيداً.'],block:['أسرع منك.'],shrug:['لم أشعر بشيء.'],dodge:['أخطأتَ.']},
 gogeta:{taunt:['أنا الذي سيهزمك!','أنا الاندماج الأقوى.'],pain:['ليس سيئاً!'],low:['لن أسقط الآن!'],form:['لننهِ هذا!'],awe:['مذهل!'],kill:['انتهى الأمر.','ستار دراغون بريك!'],block:['لن تمسّني.'],shrug:['هذا كل شيء؟'],dodge:['أبطأ!']},
 yhwach:{taunt:['كل شيء سيُمحى.','أنا أرى مستقبلك.'],pain:['همم... لم أرَ هذا.'],low:['لا أحد يهزمني.'],form:['اخضعوا.'],awe:['مثير.'],kill:['مستقبلك صار لي.','انتهى الأمر.'],block:['رأيتُ ضربتك.'],shrug:['عبث.'],dodge:['متوقَّع.']},
 kaguya:{taunt:['أنتم أبنائي... لن تهربوا.','نامي أيها الصغير.'],pain:['تجرؤ؟'],low:['لن أسقط.'],form:['سأريك القوة الكاملة.'],awe:['قوة غير متوقعة.'],kill:['نمْ إلى الأبد.','انتهى الحلم.'],block:['لن تلمسني.'],shrug:['عبث.'],dodge:['أبعاد أخرى.']},
 zeno:{taunt:['هل ستسلّيني؟','سأمحو كل شيء إن مللت.'],pain:['همم؟ لماذا شعرتُ بهذا؟'],low:['هذا لم يعد ممتعاً!'],form:['حسناً... سأكون جادّاً قليلاً.'],awe:['مثير!'],kill:['انتهت اللعبة.','حقاً؟ لا يهم.'],block:['ما هذا؟ مزعج.'],shrug:['هههه، لم أشعر بشيء.'],dodge:['تخطئ.']},
 whis:{taunt:['أرني ما عندك.','تدريب خفيف فقط.'],pain:['أوه، لا بأس بها.'],low:['سأعيد الزمن إن لزم.'],form:['حسناً، قليلاً من الجدّية.'],awe:['مدهش حقاً.'],kill:['تدرّب أكثر.','انتهى الدرس.'],block:['رأيتُ حركتك.'],shrug:['ببساطة.'],dodge:['بطيء.']},
 feather:{taunt:['لنكتب الحكاية.','هل أنت بطل أم ضحية؟'],pain:['ليست هذه الصفحة التي كتبتُها.'],low:['سأعيد كتابة الفصل.'],form:['حان وقت الفصل الأخير.'],awe:['حبكة غير متوقعة!'],kill:['نهاية الحكاية.','الكاتبة لا تُمسّ.'],block:['لا تُكتب ضدي.'],shrug:['مجرّد حبر.'],dodge:['خارج النص.']},
 anos:{taunt:['أنا الملك المطلق.','أرني أن لك مكاناً أمامي.'],pain:['همم... جريء.'],low:['هل ظننتَ أنني سأسقط؟'],form:['سأريك قوتي الحقيقية.'],awe:['أتمنى لك الحظ.'],kill:['فلتتلاشَ.','المنطق لا يحميك.'],block:['هل ظننتَ ذلك؟'],shrug:['تافه.'],dodge:['بطيء.']},
 rimuru:{taunt:['سأفتك بك بلطف.','لا تقلق، سأكون لطيفاً.'],pain:['آه! ذاك آلمني.'],low:['سأتجدد وأعود.'],form:['حان وقت الجدّية.'],awe:['قدرة مذهلة!'],kill:['انتهى الأمر.','تم افتراسها.'],block:['لا شيء يخترق.'],shrug:['دغدغة.'],dodge:['أخطأتَ.']},
 gojo:{taunt:['لا تقلق، سأتساهل قليلاً.','أنا الأقوى — لا شيء جديد.','هل ستلمسني أصلاً؟'],pain:['أوه؟ لقد تأذّيت... مثير للاهتمام.','حسناً... هذا أيقظني قليلاً.'],low:['حان وقت الجدّية قليلاً.','لا بأس... عندي تقنية الانعكاس.'],form:['لنتحمّس قليلاً!'],awe:['هذا مدهش...'],kill:['كان ممتعاً... لكنه انتهى.','قلت لك — أنا الأقوى.'],block:['كيف... اللانهاية لا تتوقف؟!'],shrug:['لن تلمسني أبداً.','هذا ما يحدث حين تحاول لمسي.'],dodge:['بطيء.']},
 sukuna:{taunt:['سلّني يا صغير.','أرني ما عندك قبل أن أملّ.','سأقطّعك إرباً.'],pain:['تسك... خدش.','ممتع... أكمل.'],low:['هه... أخيراً أحد يستحق.','لن أُهزم أمام ضعيف.'],form:['انظر إلى ملك اللعنات.'],awe:['هل هذا كل ما تملك؟'],kill:['أنا الملك.','سقطتَ كما يسقط الجميع.'],block:['ما هذا الحاجز؟!'],shrug:['دغدغة.','هذا لا يجرح حتى.'],dodge:['أبطأ من ذلك.']},
 goku:{taunt:['هيا نقاتل بجد!','أنت قوي! هذا ممتع!','سأريك ما عندي!'],pain:['آه! ممتاز! أقوى!','قتال رائع!'],low:['ما زلتُ واقفاً! لم ننتهِ بعد!','أحتاج مستوى أعلى!'],form:['سأصبح أقوى!','انتبه... هذا مستوى جديد!'],awe:['واااو! ما هذه القوة؟!','ممتاز! أنت مذهل!'],kill:['كان قتالاً رائعاً!','شكراً على القتال!'],block:['صعبة! حتى هذا لا يصيبه!'],shrug:['لم أشعر بشيء! ههه!'],dodge:['أخطأتَ!']},
 saitama:{taunt:['ضربة واحدة فقط.','هل انتهينا؟ عندي تخفيضات.','سأضربك ضربة عادية.'],pain:['همم... لم أشعر.','ضربة لا بأس بها.'],low:['يبدو أنك جادّ... سأكون جادّاً أيضاً.'],form:['حسناً... بجدّية.'],awe:['ها؟ ما هذا؟','مثير... لكنه ليس كافياً.'],kill:['انتهى. أين الخصم التالي؟','ضربة واحدة كالعادة.'],block:['همم؟ لم أصبه...'],shrug:['حدث شيء؟','لا شيء يحدث، أليس كذلك؟'],dodge:['بسيطة.']},
 luffy:{taunt:['شيشيشي! سأضربك أبعد من الأفق!','سأصبح ملك القراصنة!','تعال إلى هنا — الآن!'],pain:['آي! يؤلم...','أنت قوي! هذا ممتع!','لا يهم... لن أسقط!'],low:['لن أسقط! الحلم لم يتحقق بعد!','أنا جائع... لكنني سأقاتل!'],form:['جير... فايف!','سأريك أقوى مني!'],awe:['ما هذا الضحك...؟!','هذا الفتى... ما هذه الحركات؟!'],kill:['شيشيشي! فزت!','آسف، لكنني لا أخسر هنا!'],block:['لماذا لا أصيبه؟!','همم، غريب...'],shrug:['هههه! أنا مطاط — لا يؤذيني!','كان هذا لطيفاً!'],dodge:['شيشيشي، أخطأت!']},
 kaido:{taunt:['ووروو! هل هذا كل شيء؟','سأريك معنى الدمار!','ستسقط الآن!'],pain:['ههههه... هذا أفضل ما لديكم؟','ضربة تستحق الذكر!'],low:['أنا أقوى مخلوق... لن أسقط!','سأحرق هذا العالم معي!'],form:['سأريك شكلي الحقيقي!','انظر إلى السماء... ارتجف!'],awe:['...هذا الوحش!','انتبهوا!'],kill:['ضعف... ضعف تام.','كل من يقف أمامي يُسحق.'],block:['...لا يمكن أن لا أصيبه!'],shrug:['هههه! ماذا فعلت؟ دغدغة؟'],dodge:['حركة جيدة... لكنني لم أتعب بعد.']},
 naruto:{taunt:['لن أستسلم أبداً!','هذا هو طريقي كنينجا!','سأحميهم جميعاً!'],pain:['آه! لكنني لن أسقط!','ضربة قوية... ما زلتُ واقفاً!'],low:['لا أرجع في كلامي!','كيوبي... أعطني قوتك!'],form:['سأحمي الجميع!','هذا الوضع... بكل قوتي!'],awe:['ما هذه الطاقة؟!','هذا الشخص... خطير!'],kill:['آسف... لكن لا مفرّ.','فزنا... هذه المرة.'],block:['كيف لم أصبه؟!'],shrug:['ههه! لا بأس!'],dodge:['أخطأت يا هذا!']},
 madara:{taunt:['أنا الأوتشيها الأعلى.','العالم سيدخل حلمي.','أنت لا تعرف الألم الحقيقي.'],pain:['جدير... ولكن لا يكفي.','همم، تجرؤ؟'],low:['الحرب لم تنتهِ بعد.','لا زلتُ أمتلك ورقة أخيرة.'],form:['انظر إلى القوة الحقيقية.'],awe:['هذه القدرة... مثيرة.'],kill:['تلك نهاية من يعارضني.','العالم لي.'],block:['سوسانو لا يُخترق.'],shrug:['عبث.'],dodge:['كنتُ أعرف حركتك.']},
 ichigo:{taunt:['لن أخسر هنا!','هذا ما أحميه!','أنا إيتشيغو كوروساكي!'],pain:['آه! لكنني لن أسقط!','لم تنتهِ بعد!'],low:['لم أنتهِ بعد!','سأحمي الجميع!'],form:['بانكاي!','لنُنهِ هذا!'],awe:['ما هذا الضغط الروحي؟!'],kill:['هذا ما كنتُ أحميه.','انتهى.'],block:['كيف لم أصبه؟!'],shrug:['لن يوقفني هذا!'],dodge:['أخطأت!']},
 aizen:{taunt:['كل شيء ضمن خطتي.','أنتم تقفون حيث أريدكم.','الإعجاب هو أبعد المشاعر عن الفهم.'],pain:['مثير... لم أتوقعها.','لا بأس. ما زلتُ أعلى.'],low:['هذا أيضاً... جزء من الخطة.','لم أُهزم قط.'],form:['حان وقت تجاوز الحدود.'],awe:['مثير للاهتمام.'],kill:['فزتُ منذ البداية.','هذه هي النهاية التي رسمتُها.'],block:['وهم آخر.'],shrug:['كما تخطّطتُ.'],dodge:['بالطبع.']}
};
// مواجهات خاصة: يبدأ المتحدّث الأول والثاني يردّ
const PAIR={
 'gojo|sukuna':[['gojo','ملك اللعنات... أنت أول من يستحق أن أتحمّس له.'],['sukuna','ماذا تفعل يا صغير؟ ما زلتُ الملك.'],['gojo','لنرَ من يبقى بعد هذا.']],
 'gojo|madara':[['madara','أقوى ساحر في عصره... أرني ما عندك.'],['gojo','أوتشيها الأسطوري؟ لن تلمسني حتى.']],
 'gojo|aizen':[['aizen','لا شيء يلمسك... هذا ما يجعلني أبتسم.'],['gojo','تبتسم؟ أعرف هذه الابتسامة... ستكلّفك الكثير.']],
 'gojo|luffy':[['luffy','أنت! هل أنت قوي؟ سأصبح ملك القراصنة، فلا تقف في طريقي!'],['gojo','ملك القراصنة؟ لطيف... لكن لا أحد يكسر الأقوى.'],['luffy','شيشيشي! أنا لا أكسر... أنا أضرب فقط!']],
 'gojo|goku':[['goku','واااو! أنت تبدو قوياً جداً!'],['gojo','وأنت تبدو ممتعاً... سأتساهل قليلاً.']],
 'gojo|saitama':[['gojo','أصلع بقفّازات؟ هل ستلمسني أصلاً؟'],['saitama','سأضربك ضربة عادية. هذا كل شيء.']],
 'gojo|kaido':[['kaido','ساحر رفيع... أرني هل تتحمّل لهيبي.'],['gojo','لهيب؟ أنا أتحكّم بالمسافة نفسها.']],
 'sukuna|ichigo':[['sukuna','فتى بسيف... ما اسمك؟'],['ichigo','إيتشيغو كوروساكي. تذكّره قبل أن أنهيك.']],
 'sukuna|saitama':[['sukuna','هل أنت من يُعتبر الأقوى هنا؟'],['saitama','أنا فقط... بطل لهواية.']],
 'sukuna|naruto':[['sukuna','يحمل وحشاً بداخله؟ مثير.'],['naruto','كيوبي ليس وحشاً — إنه رفيقي!']],
 'sukuna|kaido':[['kaido','وحش آخر! ووروو! هذا ممتع!'],['sukuna','وحش؟ أنا الملك.']],
 'ichigo|aizen':[['aizen','كل شيء ضمن خطتي... حتى هذا.'],['ichigo','سأحميهم... مهما كان.'],['aizen','أنا فوق الجميع.']],
 'goku|saitama':[['goku','قوي! حاول أكثر.'],['saitama','قتال ممتع... لكنه سينتهي بضربة.']],
 'goku|naruto':[['goku','أنت قوي... هل تريد قتالاً حقيقياً؟'],['naruto','سأريك قوة نينجا! لن أخسر!']],
 'goku|kaido':[['kaido','فتى بشعر غريب... أرني قوتك.'],['goku','سأصبح أقوى بسببك!']],
 'luffy|kaido':[['kaido','قبعة القش! جئت إذن لتحرّر الجميع؟'],['luffy','سأهزمك وأحرّر الجميع — وهذه المرّة بالتأكيد!'],['kaido','ما زلت تتكلم... سأريك معنى القوّة!']],
 'luffy|saitama':[['luffy','أنت قوي؟ سأرى هل أنت أقوى مني!'],['saitama','أنا بطل لهواية... فقط.']],
 'madara|naruto':[['madara','أنت... تذكّرني بالقدر.'],['naruto','لن أترك ما تحاول فعله يحدث!']],
 'madara|aizen':[['madara','لديك طموحي... لكن ليس عقلي.'],['aizen','عقلي أعلى... كما ترى.']],
 'madara|ichigo':[['madara','شاب بسيف؟ ماذا تحمل؟'],['ichigo','ما أحميه... وهذا يكفي.']],
 'saitama|kaido':[['kaido','لا أحد يهزمني... هل أنت جادّ؟'],['saitama','فقط ضربة واحدة...']]
};
// ردّ المتلقّي على ضربات مسمّاة (حسب من يتلقّاها)
const RSP={
 'أرجواني':{kaido:'ههه... ما هذا الشيء؟ تؤلم!',luffy:'واااه! ما هذا؟! يؤلم!',naruto:'ما هذه القوة؟!',goku:'ممتاز! هذه ضربة حقيقية!',saitama:'همم؟ قوية قليلاً.',sukuna:'تسك... هذا الفراغ!'},
 'الفراغ اللامحدود':{luffy:'...؟؟؟',kaido:'...هراء!',naruto:'...!',sukuna:'ما هذا... عقلي!',madara:'...ما هذا الفراغ؟!',ichigo:'...لا أستطيع التفكير!',aizen:'...مثير للاهتمام.',goku:'...ماذا يحدث؟!',saitama:'...هاه؟'},
 'توسيع النطاق: الساحة الشريرة':{gojo:'...حتى اللانهاية مقطوعة؟!',luffy:'آآآه! ما هذا المكان؟!',kaido:'ههه... ساحة؟',naruto:'ما هذا الخراب؟!',madara:'نطاق مثير.',ichigo:'آآه! ما هذا؟!',aizen:'مثير... لكنه لن يمسّني.',goku:'واااه! كل شيء يتقطّع!'},
 'لكمة جادة':{gojo:'أوه... هذه... هذه حقيقية.',kaido:'ههه! ما هذه اللكمة...!',sukuna:'...أي وحش أنت؟!',luffy:'واااه! لكمة قوية!',goku:'أخيراً! قوة حقيقية!',madara:'...لا يُصدّق.',aizen:'...هذا خارج حساباتي.',naruto:'ما هذه القوة؟!',ichigo:'...لا يمكن أن أصمد!'},
 'كاميهاميها':{gojo:'أوه، موجة جيدة!',kaido:'ههه! موجة؟ أعرف الأقوى!',sukuna:'تسك... طاقة صافية.',saitama:'قوة لا بأس بها.',luffy:'آآآي! ساخنة!',naruto:'ما هذه الموجة؟!'},
 'سبيريت بومب':{gojo:'كرة بحجم كوكب؟! مثير.',kaido:'ههه! ما هذا؟ أرني!',sukuna:'...لا يُصدّق.',saitama:'همم؟ كبيرة.',luffy:'واااه! كبيرة جداً!',madara:'سوسانو سيحميني... أرجو.'},
 'ميتيور':{gojo:'نيزك؟ لنرَ...',luffy:'آآآه! ما هذا؟!',goku:'ممتاز! ضربة حقيقية!',sukuna:'تسك... ثقيل.',naruto:'نيزك؟!'},
 'تسوكيومي اللانهائي':{gojo:'...حلم؟ مثير.',luffy:'...؟؟؟',goku:'...ما هذا؟!',sukuna:'...هراء.',kaido:'...هراء!',aizen:'...مثير للاهتمام.',saitama:'...هاه؟'},
 'كيوكا سويغيتسو':{gojo:'...وهم؟ مثير.',goku:'ما هذه الأوهام؟!',luffy:'...أين هو؟!',kaido:'...أين ذهب؟!',sukuna:'تسك... وهم.',madara:'...هل هذا وهم؟'},
 'غيتسوغا الأخير':{gojo:'...هذه قوة حقيقية!',aizen:'...مستحيل.',sukuna:'ههه... جدير.',kaido:'ههه! جيد!',luffy:'واااه! ضربة قوية!'},
 'كيدو التسعين':{gojo:'تقنية مثيرة.',ichigo:'آه! ما هذه القوة؟!',naruto:'ما هذا السحر؟!',luffy:'آآآي!'},
 'باجرانغ غان':{kaido:'ووورو! هذه القبضة...!',gojo:'قبضة بحجم الجبل؟! مثير للاهتمام فعلاً.',sukuna:'ما هذا الحجم؟!'},
 'ثاندر باغوا':{luffy:'همم؟ لا شيء!',gojo:'أوه! لا بأس.',saitama:'ضربة لا بأس بها.',goku:'ممتاز!'}
};
let lastTalk=-9;
async function speak(F,txt){
  if(!txt) return;
  L(`💬 <b style="color:${F.c.col}">${F.c.n}:</b> «${esc(txt)}»`,'tk');
  if(!skip){ say(F.k,txt,F.c.col); await wait(1250); }
}
function say(k, txt, col){
  if(skip||!txt) return;
  const p=rel($('f'+(k+1))), W=arena().clientWidth;
  const e=put(`💬 ${esc(txt)}`,{left:'0px',top:p.y-p.h*.42+'px',fontSize:'14px',fontWeight:900,color:'#111',background:'#fffffff0',padding:'4px 12px',borderRadius:'14px',border:`2px solid ${col}`,maxWidth:(W*.72)+'px',width:'max-content',textAlign:'center',lineHeight:1.35,zIndex:45,opacity:0});
  const w=e.offsetWidth, x=Math.max(w/2+6,Math.min(W-w/2-6,p.x));
  e.style.left=x+'px';
  go(e,[{transform:C(0,10,'scale(.4)'),opacity:0},{transform:C(0,0,'scale(1.08)'),opacity:1,offset:.2},{transform:C(0,-6,'scale(1)'),opacity:1,offset:.8},{transform:C(0,-16,'scale(1)'),opacity:0}],1500).then(()=>e.remove());
}
const USED=new Set();
const BANK={
 taunt:['{o}... أرني ما عندك فعلاً.','لا تضيّع وقتي يا {o}.','هذه مجرد البداية.','أتحسب أنك قادر على إيقافي؟','عيناي عليك يا {o}.','سأنهي هذا قريباً.','حركتك التالية أعرفها مسبقاً.','أفضل ما عندك لا يكفي.','دعنا نرى كم ستصمد.','كنت أتوقع أكثر من {o}.','تقدّم... ولا تتردّد.','كل خطوة منك محسوبة.'],
 pain:['ضربة جيدة يا {o}.','همم... هذه أصابت.','لا بأس، لكنها لن تتكرر.','تسك... انتبهت متأخراً.','أحسنت، سأتذكّرها.','مؤلم... لكنه لا يكفي.','هل هذه أقوى ما لديك؟','ضربة محسوبة... أعترف.','لقد أخذت مني شيئاً.'],
 low:['لم أنتهِ بعد!','لا تفرح مبكراً.','ما زال عندي ما أفعله.','لن أسقط هنا.','هذا لا يعني شيئاً.','سأقلب الأمر الآن.','إن أردت الفوز فاقتلني فعلاً.'],
 form:['حان وقت الجدّية.','سأرفع مستواي.','انظر جيداً يا {o}.','هذا ما كنت أدّخره.','الآن تبدأ المعركة الحقيقية.'],
 awe:['قوة غير متوقعة.','{o}... أنت أخطر مما ظننت.','أحترم هذه الحركة.','ما هذا؟!','لم أحسب حساب هذا.','إذن أنت جادّ.'],
 kill:['انتهى الأمر يا {o}.','لا مكان للخطأ هنا.','كانت معركة جيدة.','سقطتَ كما توقعت.','النهاية.','استسلم للنتيجة.'],
 block:['توقعتُ ذلك.','لا يصل إليّ شيء.','أخطأ حسابك يا {o}.','محاولة جيدة.','قرأتُ «{m}» قبل أن تبدأها.','لن تخترق دفاعي.'],
 shrug:['هذا لا يؤثر فيّ.','«{m}»؟ لا تعني لي شيئاً.','جرّب شيئاً آخر.','لا شيء.','حتى لم أشعر بها.'],
 dodge:['أخطأت!','بطيء.','لن تصيبني بهذا.','رأيتها قادمة.'],
 learn:['أرى نمطك يا {o}... «{m}» لم تعد تفاجئني.','تكرّر «{m}»؟ أتعلّم منها في كل مرة.','«{m}» مرة أخرى؟ جسدي حفظها.','لقد فهمتُ «{m}» الآن.','أنت واضح يا {o}... «{m}» لم تعد خطراً.'],
 und:['لا يمكنك قتل ما لا يموت.','هل ظننت أن هذا ينهيني؟','جسدي يعود في كل مرة.','أعيدها كما كانت... وأقوى.','الموت لا يقترب مني يا {o}.'],
 und_o:['كيف ينهض بعد هذا؟!','لا يموت... فعلاً؟!','أحتاج حلاً آخر.','إذن لا يكفي الضرب وحده.']
};
const fillT=(t,o,m)=>t.replace(/\{o\}/g,o||'').replace(/\{m\}/g,m||'');
// يختار سطراً لم يُقَل في هذه المعركة: من سطور الشخصية أولاً ثم من بنك عام متنوّع
function ln(F,kind,O,m){
  const own=((CH[F.c.id]||GEN)[kind]||[]).filter(x=>!USED.has(x));
  const bank=(BANK[kind]||[]).map(x=>fillT(x,O?O.c.n:'',m)).filter(x=>!USED.has(x));
  let t=null;
  if(own.length&&(Math.random()<.9||!bank.length)) t=own[Math.floor(Math.random()*own.length)];
  else if(bank.length) t=bank[Math.floor(Math.random()*bank.length)];
  if(t) USED.add(t);
  return t;
}
async function openTalk(A,D){
  const a=A.c.id, d=D.c.id, lines=PAIR[a+'|'+d]||PAIR[d+'|'+a];
  if(lines){ for(const [key,txt] of lines){ const F=[A,D].find(f=>f.c.id===key); if(F){ USED.add(txt); await speak(F,txt); } } }
  else { const ia=INTRO[a],rd=REPLY[d]; await speak(A,ia?fillT(ia,D.c.n):ln(A,'taunt',D)); await speak(D,rd||ln(D,'taunt',A)); }
}
// تعليق ذكي بعد كل حركة: يتبع ما حدث فعلاً، بدون تكرار، وبقدر معتدل من الكلام
async function chatter(A,D,a,E,n){
  const gap=n-lastTalk, ev=k=>E.find(e=>e.k==k), dm=ev('dmg'), off=a.t=='A'||a.t=='K'||a.t=='S', mv=a.n;
  const S_=async(F,k,O)=>{ lastTalk=n; await speak(F,ln(F,k,O,mv)); };
  if(D.hp<=0 && !ev('rev')){ await S_(A,'kill',D); return; }
  const rv=ev('rev');
  if(rv){ if(rv.und){ await S_(D,'und',A); await S_(A,'und_o',D); } else { await S_(D,'low',A); await S_(A,'awe',D); } return; }
  if(a.t=='B'){ await S_(A,'form',D); if(Math.random()<.7) await S_(D,'awe',A); return; }
  if(ev('block')||ev('imm')){ if(gap>=2||Math.random()<.4){ await S_(D,ev('imm')?'shrug':'block',A); if(Math.random()<.5) await S_(A,'awe',D); } return; }
  if(ev('stun')){ const r=(RSP[a.n]||{})[D.c.id]; if(r&&!USED.has(r)){ lastTalk=n; USED.add(r); await speak(D,r); } else if(gap>=2) await S_(D,'awe',A); return; }
  if(dm && dm.ad>=2 && (D.c.adapt||0)>=.1 && gap>=1 && Math.random()<.6){ await S_(D,'learn',A); return; }
  if(dm && dm.d>=20 && gap>=1){ await S_(A,'taunt',D); const r=(RSP[a.n]||{})[D.c.id]; if(r&&!USED.has(r)){ USED.add(r); await speak(D,r); } else await S_(D,'pain',A); return; }
  if(D.hp<30 && D.hp>0 && !D.fl2 && gap>=1){ D.fl2=1; await S_(D,'low',A); await S_(A,'taunt',D); return; }
  if(A.hp<30 && !A.fl2 && gap>=1){ A.fl2=1; await S_(A,'low',D); await S_(D,'taunt',A); return; }
  if(off && gap>=2 && Math.random()<.55){ await S_(A,'taunt',D); if(Math.random()<.6) await S_(D,'pain',A); }
}

/* ================================================================
   واجهة القتال المحدّثة: بطاقة بأسلوب القتال + طاقة + لانهاية غوجو الدائمة،
   مشاهد القدرات، المحادثة الذكية، ومراقبة الأنماط
   ================================================================ */
function draw(){[0,1].forEach(k=>{const F=T[k][cur[k]],el=$('f'+(k+1)),key=F.c.id+k;
 if(el.dataset.key!=key){el.dataset.key=key;el.innerHTML=cardHTML(F.card,{cls:'static'})+`<div class="formchip">${STYLE_TAG[F.c.id]||''}</div><div class="hpbar"><i></i></div><div class="hptxt"></div><div class="pips"></div>`}
 el.querySelector('.hpbar i').style.width=Math.max(0,F.hp)+'%';
 el.querySelector('.hptxt').textContent=`${Math.max(0,Math.round(F.hp))}% ${F.g?'🛡️':''}${F.st?'⏳':''}${F.bf?'🔺':''}`;
 el.querySelector('.pips').innerHTML=Array.from({length:8},(_,i)=>`<i class="${i<F.en?'on':''}"></i>`).join('');
 const cd=el.querySelector('.card');cd.style.setProperty('--ac',F.c.col);cd.classList.toggle('aura',F.bf>0);el.classList.toggle('dead',F.hp<=0);
 el.classList.toggle('infg',F.c.id=='gojo'&&!!F.g&&F.hp>0);
 $('m'+(k+1)).innerHTML=T[k].map((f,j)=>`<span class="${f.hp<=0?'out':''} ${j==cur[k]?'cur':''}" style="background-image:url('${esc(f.card[5])}')"></span>`).join('')})}

/* ---- لانهاية غوجو: كرة تحيط به والمقذوفات تتباطأ ولا تصل (مفارقة زينون) ---- */
async function infinityBlock(A,D,a,col){
  const sa=rel($('f'+(A.k+1))), sd=rel($('f'+(D.k+1)));
  const R=Math.max(sd.w,sd.h)*.62;
  const sph=put('',{left:sd.x+'px',top:sd.y+'px',width:R*2+'px',height:R*2+'px',borderRadius:'50%',border:'2px solid #bae6fd',background:'radial-gradient(circle,transparent 55%,#38bdf833 72%,#bae6fdaa 100%)',boxShadow:'0 0 34px #38bdf8,inset 0 0 30px #38bdf8',zIndex:30,opacity:0});
  go(sph,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],260);
  const N=6, dx=sa.x-sd.x, dy=sa.y-sd.y, dist=Math.hypot(dx,dy)||1, ux=dx/dist, uy=dy/dist, els=[sph], tasks=[];
  const lab=['1/2','1/4','1/8','1/16','1/32'];
  for(let i=0;i<N;i++){
    const nx=-uy*(i-(N-1)/2)*14, ny=ux*(i-(N-1)/2)*14;
    const b=put('',{left:sd.x+'px',top:sd.y+'px',width:'14px',height:'14px',borderRadius:'50%',background:'#fff',boxShadow:`0 0 12px ${col},0 0 24px ${col}`,zIndex:31,opacity:0});
    els.push(b);
    const kf=[]; for(let q=0;q<=6;q++){ const r=R+(dist-R)/Math.pow(2,q); kf.push({transform:C(ux*r+nx,uy*r+ny,`scale(${1-q*.07})`),opacity:q===0?0:1}); }
    tasks.push(go(b,kf,1000,{easing:'steps(1,end)',delay:i*70/speed}));
  }
  for(let q=0;q<4;q++){ const t=put(lab[q],{left:sd.x+ux*(R+(dist-R)/Math.pow(2,q+1))+'px',top:sd.y+uy*(R+(dist-R)/Math.pow(2,q+1))-16+'px',fontSize:'13px',fontWeight:900,color:'#bae6fd',textShadow:'0 0 8px #38bdf8',zIndex:32,opacity:0}); els.push(t); tasks.push(go(t,[{opacity:0},{opacity:1,offset:.3},{opacity:0}],600,{delay:(150+q*170)/speed})); }
  await Promise.all(tasks);
  const inf=put('♾️',{left:sd.x+'px',top:sd.y+'px',fontSize:'54px',zIndex:33,filter:'drop-shadow(0 0 14px #38bdf8)',opacity:0}); els.push(inf);
  go(sph,[{transform:C(0,0,'scale(1)'),opacity:1},{transform:C(0,0,'scale(1.12)'),opacity:1,offset:.4},{transform:C(0,0,'scale(1)'),opacity:0}],700);
  await go(inf,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,-10,'scale(1.2)'),opacity:1,offset:.35},{transform:C(0,-30,'scale(1)'),opacity:0}],800);
  rm(...els);
}

/* ================================================================
   الدفعة 1 — مشاهد سينمائية: زينو، ويس، فيذرين، أنوس، ريمورو
   ================================================================ */
Object.assign(SCENE_OF,{
 'zeno:محو الكون':'erase','zeno:نظرة المحو':'zenoGaze',
 'whis:إعادة الزمن':'rewind','whis:تجميد الثواني':'whisFreeze',
 'feather:إعادة كتابة الواقع':'rewrite','feather:مسرح الساحرة':'theater',
 'anos:تدمير المنطق':'logicEnd','anos:مرآة ريغريد':'reigria',
 'rimuru:أزاثوث':'azathoth','rimuru:افتراس':'predator'
});
const cnApp=(el,dl=0)=>go(el,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],450,{delay:dl/speed});
Object.assign(SCENES,{
 /* ---------- زينو ---------- */
 async erase(x){            // محو الكون: كف تهبط، ثم مسح أبيض يترك العدم
  const {W,H,p,port,dport,flash,ring,title,pop,dots}=x;
  const a=port({left:'27%'}), d=dport({left:'73%'}); cnApp(a); cnApp(d,200);
  dots(60,'#f5d0fe',[1,4],[1500,3400]); await wait(750);
  const hand=p('✋',{left:'50%',top:'50%',fontSize:Math.min(H*.62,240)+'px',filter:'drop-shadow(0 0 30px #e879f9)',zIndex:85,opacity:0});
  pop('بضغطة واحدة...','#f5d0fe','50%','20%',30,1100);
  await go(hand,[{transform:C(0,-H*.9,'scale(.6)'),opacity:0},{transform:C(0,-H*.05,'scale(1.15)'),opacity:1,offset:.75},{transform:C(0,0,'scale(1)'),opacity:1}],900);
  flash('#fff',350,.9); shake(14); ring('#e879f9',6,900);
  const vd=p('',{left:0,top:0,width:'100%',height:'100%',background:'radial-gradient(circle,#000 0,#12001a 100%)',zIndex:70,clipPath:'inset(0 100% 0 0)'});
  const wp=p('',{left:0,top:0,width:W*.22+'px',height:'100%',background:'linear-gradient(90deg,transparent,#fdf4ff 45%,#fff 50%,#fdf4ff 55%,transparent)',zIndex:92});
  go(vd,[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],1300,{easing:'ease-in'});
  go(wp,[{transform:`translateX(${-W*.22}px)`},{transform:`translateX(${W}px)`}],1300,{easing:'ease-in'});
  go(d,[{opacity:1,filter:'none'},{opacity:.7,filter:'contrast(4) brightness(2)',offset:.6},{opacity:0}],1100);
  go(hand,[{opacity:1},{opacity:0}],900,{delay:300/speed});
  await wait(1350);
  const nil=p('∅',{left:'50%',top:'46%',fontSize:Math.min(H*.7,240)+'px',fontWeight:900,color:'#f5d0fe',textShadow:'0 0 40px #e879f9',zIndex:80,opacity:0});
  go(nil,[{transform:C(0,0,'scale(.4)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1,offset:.4},{transform:C(0,0,'scale(1.1)'),opacity:0}],1300);
  await wait(900); await title('محو الكون — لا شيء يبقى','زينو — ملك كل شيء','#e879f9',1700);
 },
 async zenoGaze(x){         // نظرة المحو: عين تمسح الخصم فيتلاشى
  const {H,p,port,dport,flash,ring,title,pop}=x;
  const a=port({left:'27%'}), d=dport({left:'73%'}); cnApp(a); cnApp(d,200); await wait(600);
  const eye=p('👁️',{left:'27%',top:'50%',fontSize:'90px',filter:'drop-shadow(0 0 24px #e879f9)',zIndex:80,opacity:0});
  go(eye,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1.2)'),opacity:1,offset:.4},{transform:C(0,0,'scale(1)'),opacity:1}],700);
  ring('#e879f9',3,800,300,'73%'); await wait(700);
  for(let i=0;i<6;i++){ const l=p('',{left:'73%',top:(32+i*7)+'%',width:'190px',height:'3px',background:'#f5d0fe',boxShadow:'0 0 10px #e879f9',zIndex:81,opacity:0});
   go(l,[{transform:C(-95,0),opacity:1},{transform:C(95,0),opacity:1,offset:.5},{transform:C(95,0),opacity:0}],500,{delay:i*90/speed}); }
  go(d,[{opacity:1},{opacity:.15},{opacity:1},{opacity:.3},{opacity:1}],800,{fill:'none'});
  await wait(650); flash('#fdf4ff',300,.7); shake(8); pop('يتلاشى...','#f5d0fe','73%','24%',34,1000);
  await wait(800); await title('نظرة المحو','زينو — ملك كل شيء','#e879f9',1400);
 },
 /* ---------- ويس ---------- */
 async rewind(x){           // إعادة الزمن: ساعة تدور للخلف ثم وميض شفاء
  const {W,H,p,port,flash,ring,title,pop,dots}=x;
  const a=port({filter:'brightness(.85)'}); cnApp(a); await wait(500);
  const R=Math.min(W,H)*.34;
  const face=p('',{left:'50%',top:'50%',width:R*2+'px',height:R*2+'px',borderRadius:'50%',border:'4px solid #93c5fd',background:'radial-gradient(circle,#0b1a3acc 0,#1e3a8a55 70%)',boxShadow:'0 0 40px #60a5fa,inset 0 0 40px #3b82f6',zIndex:70,opacity:0});
  go(face,[{transform:C(0,0,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],600);
  for(let i=0;i<12;i++){ const t=p('',{left:'50%',top:'50%',width:'4px',height:R*.12+'px',background:'#bfdbfe',zIndex:71,opacity:0});
   go(t,[{transform:C(0,0,`rotate(${i*30}deg) translateY(${-R*.86}px)`),opacity:0},{transform:C(0,0,`rotate(${i*30}deg) translateY(${-R*.86}px)`),opacity:1}],400,{delay:(300+i*40)/speed}); }
  const hand=(len,w,c,z)=>{ const L=len/2*100; return p('',{left:'50%',top:'50%',width:w+'px',height:R*2+'px',background:`linear-gradient(to bottom,transparent ${50-len*50}%,${c} ${50-len*50}%,${c} 50%,transparent 50%)`,filter:`drop-shadow(0 0 6px ${c})`,zIndex:z,opacity:0}); };
  const mn=hand(.82,5,'#fff',73), hr=hand(.55,8,'#93c5fd',72);
  go(mn,[{transform:C(0,0,'rotate(0deg)'),opacity:1},{transform:C(0,0,'rotate(-1440deg)'),opacity:1}],1900,{easing:'cubic-bezier(.3,0,.2,1)',delay:500/speed});
  go(hr,[{transform:C(0,0,'rotate(0deg)'),opacity:1},{transform:C(0,0,'rotate(-120deg)'),opacity:1}],1900,{easing:'cubic-bezier(.3,0,.2,1)',delay:500/speed});
  ['٣','٢','١'].forEach((n,i)=>pop('⟲ '+n,'#bfdbfe','50%','14%',34,700,800+i*450));
  await wait(2500);
  flash('#bbf7d0',500,.8); ring('#86efac',5,1000); dots(30,'#86efac',[2,6],[1200,2400]); pop('+ صحة','#86efac','50%','30%',46,1100);
  await wait(900); await title('إعادة الزمن — كأن شيئاً لم يكن','ويس — معلّم الأقوياء','#93c5fd',1700);
 },
 async whisFreeze(x){       // تجميد الثواني: نقرة بالعصا ويتجمّد الخصم
  const {p,port,dport,flash,ring,title,pop}=x;
  const a=port({left:'27%'}), d=dport({left:'73%'}); cnApp(a); cnApp(d,200); await wait(600);
  const st=p('🪄',{left:'27%',top:'50%',fontSize:'80px',zIndex:80,opacity:0,filter:'drop-shadow(0 0 18px #60a5fa)'});
  go(st,[{transform:C(0,0,'scale(.4) rotate(-40deg)'),opacity:0},{transform:C(30,-10,'scale(1.2) rotate(10deg)'),opacity:1,offset:.5},{transform:C(30,-10,'scale(1) rotate(0)'),opacity:1}],700);
  await wait(750); flash('#e0f2fe',300,.9); ring('#93c5fd',5,900);
  const fr=p('',{inset:0,background:'radial-gradient(circle at 73% 50%,transparent 20%,#bfdbfe55 60%,#1e3a8a88 100%)',mixBlendMode:'screen',zIndex:66,opacity:0}); go(fr,[{opacity:0},{opacity:1}],500);
  go(d,[{filter:'none'},{filter:'grayscale(1) brightness(1.3) contrast(1.2)'}],500);
  for(let i=0;i<8;i++) pop(['⏳','🕰️','❄️'][i%3],'#bfdbfe',(55+rnd(0,40))+'%',(20+rnd(0,55))+'%',28+rnd(0,22),1400,i*90);
  await wait(1300); await title('تجميد الثواني — توقّف','ويس — معلّم الأقوياء','#93c5fd',1600);
 },
 /* ---------- فيذرين ---------- */
 async rewrite(x){          // إعادة كتابة الواقع: صفحة تُكتب عليها نهاية الخصم
  const {W,H,p,port,flash,title,pop,dots,orbit,D}=x;
  const a=port({left:'24%'}); cnApp(a); await wait(500);
  const pw2=Math.min(W*.66,420), ph2=Math.min(H*.76,300), fs=Math.max(11,Math.min(20,pw2/17));
  const pg=p('',{left:'62%',top:'50%',width:pw2+'px',height:ph2+'px',borderRadius:'8px',background:'linear-gradient(135deg,#fef3c7,#fde68a)',boxShadow:'0 0 40px #f472b6,0 10px 30px #000',zIndex:70,opacity:0});
  go(pg,[{transform:C(0,30,'scale(.7) rotate(-6deg)'),opacity:0},{transform:C(0,0,'scale(1) rotate(0)'),opacity:1}],650);
  await wait(700);
  const lines=['كان يا ما كان...',`وقف ${D.c.n} أمامها،`,'لكن حكايته بلا نهاية.','فكتبتْها هي الآن.'];
  const els=lines.map((t,i)=>{ const e=p(esc(t),{left:'62%',top:(30+i*13)+'%',fontSize:fs+'px',fontWeight:800,color:'#78350f',whiteSpace:'nowrap',zIndex:72,clipPath:'inset(0 0 0 100%)',transform:C(0,0)});
   go(e,[{clipPath:'inset(0 0 0 100%)'},{clipPath:'inset(0 0 0 0)'}],700,{delay:i*650/speed}); return e; });
  dots(40,'#f9a8d4',[2,5],[1500,3200]); orbit('🦋',6,W*.3,3200,{size:28});
  await wait(2700);
  const st=p('',{left:'62%',top:'43%',width:pw2*.8+'px',height:'4px',background:'#dc2626',boxShadow:'0 0 10px #ef4444',zIndex:74}); go(st,[{transform:C(0,0,'scaleX(0)')},{transform:C(0,0,'scaleX(1)')}],500);
  await wait(600); pop('النهاية','#be185d','62%','72%',54,1300); flash('#fbcfe8',500,.9); shake(10);
  await wait(1100); await title('إعادة كتابة الواقع — نهايتك مكتوبة','فيذرين — ساحرة الحكاية','#f472b6',1800);
 },
 async theater(x){          // مسرح الساحرة: ستارة تُسدل وضوء على الخصم
  const {W,H,p,port,dport,flash,ring,title,pop,orbit}=x;
  const a=port({left:'27%'}), d=dport({left:'73%'}); cnApp(a); cnApp(d,200); await wait(600);
  const cur=side=>p('',{[side]:0,top:0,width:'51%',height:'100%',background:'repeating-linear-gradient(90deg,#7f1d1d 0 18px,#991b1b 18px 36px,#b91c1c 36px 44px)',boxShadow:'inset 0 0 50px #000',zIndex:78});
  const L=cur('left'), R=cur('right');
  go(L,[{transform:'translateX(-100%)'},{transform:'translateX(0)'}],1000,{easing:'ease-in-out'});
  go(R,[{transform:'translateX(100%)'},{transform:'translateX(0)'}],1000,{easing:'ease-in-out'});
  await wait(1050); shake(6); ring('#f472b6',4,900);
  const sp=p('',{left:'50%',top:'50%',width:'46%',height:'125%',background:'linear-gradient(#fde68acc,transparent)',clipPath:'polygon(36% 0,64% 0,100% 100%,0 100%)',zIndex:79,opacity:0}); go(sp,[{opacity:0},{opacity:1}],600);
  orbit('🦋',7,Math.min(W,H)*.4,2400,{size:30,z:80}); pop('ادخل مسرحي','#fbcfe8','50%','22%',34,1400);
  await wait(1700); await title('مسرح الساحرة — الستار يُسدل','فيذرين — ساحرة الحكاية','#f472b6',1500);
 },
 /* ---------- أنوس ---------- */
 async logicEnd(x){         // تدمير المنطق: رموز المنطق تتحطّم على الخصم
  const {W,H,p,port,dport,flash,ring,title,pop,slashLine}=x;
  const a=port({left:'27%'}), d=dport({left:'73%'}); cnApp(a); cnApp(d,200); await wait(600);
  const R=Math.min(W,H)*.4;
  const ci=p('',{left:'27%',top:'50%',width:R*2+'px',height:R*2+'px',borderRadius:'50%',border:'3px solid #c4b5fd',boxShadow:'0 0 40px #7c3aed,inset 0 0 40px #7c3aed',background:'repeating-conic-gradient(#7c3aed33 0 10deg,transparent 10deg 30deg)',zIndex:66,opacity:0});
  go(ci,[{transform:C(0,0,'scale(.1) rotate(0)'),opacity:0},{transform:C(0,0,'scale(1) rotate(180deg)'),opacity:1,offset:.5},{transform:C(0,0,'scale(1.05) rotate(360deg)'),opacity:1}],1500);
  const sy=['∀','∃','≠','∴','⊥','∞','¬','⇒'];
  for(let i=0;i<14;i++){ const s=p(sy[i%8],{left:'27%',top:'50%',fontSize:(28+rnd(0,22))+'px',fontWeight:900,color:'#ddd6fe',textShadow:'0 0 12px #7c3aed',zIndex:70,opacity:0});
   go(s,[{transform:C(rnd(-30,30),rnd(-30,30),'scale(.4)'),opacity:0},{transform:C(rnd(-60,60),rnd(-70,70),'scale(1)'),opacity:1,offset:.3},{transform:C(W*.46+rnd(-40,40),rnd(-80,80),`scale(1.3) rotate(${rnd(-90,90)}deg)`),opacity:0}],1200,{delay:(400+i*70)/speed}); }
  await wait(1500);
  for(let i=0;i<4;i++) slashLine('#fff',rnd(-70,70),260,500,i*120,4,'73%','50%');
  await wait(600); shake(14); flash('#ede9fe',350,.9);
  go(d,[{transform:C(0,0,'scale(1)'),opacity:1},{transform:C(0,0,'scale(1.1)'),opacity:1,offset:.4},{transform:C(0,0,'scale(.1) rotate(25deg)'),opacity:0}],900); ring('#a78bfa',5,900,0,'73%');
  await wait(900); await title('تدمير المنطق — لا قانون يحميك','أنوس — الملك المطلق','#a78bfa',1700);
 },
 async reigria(x){          // مرآة ريغريد: الضربة ترتدّ إلى صاحبها
  const {W,H,p,port,dport,flash,ring,title,pop}=x;
  const a=port({left:'30%'}), d=dport({left:'78%'}); cnApp(a); cnApp(d,150); await wait(550);
  const mr=p('',{left:'44%',top:'50%',width:'90px',height:Math.min(H*.8,300)+'px',borderRadius:'50%',background:'linear-gradient(100deg,#ede9fe55,#c4b5fdcc 45%,#ffffffee 50%,#8b5cf6aa 60%,#ede9fe44)',border:'3px solid #ddd6fe',boxShadow:'0 0 40px #8b5cf6,inset 0 0 30px #fff',zIndex:70,opacity:0});
  go(mr,[{transform:C(0,0,'scale(.2,.4)'),opacity:0},{transform:C(0,0,'scale(1.1)'),opacity:1,offset:.6},{transform:C(0,0,'scale(1)'),opacity:1}],700);
  await wait(500);
  const sh=p('',{left:'78%',top:'50%',width:'60px',height:'60px',borderRadius:'50%',background:'radial-gradient(circle,#fff,#f87171 50%,transparent 72%)',boxShadow:'0 0 30px #ef4444',zIndex:72,opacity:0});
  await go(sh,[{transform:C(0,0,'scale(.5)'),opacity:1},{transform:C(-W*.34,0,'scale(1)'),opacity:1}],650,{easing:'ease-in'});
  flash('#fff',260,.8); ring('#ddd6fe',3,700,0,'44%');
  sh.style.background='radial-gradient(circle,#fff,#a78bfa 50%,transparent 72%)'; sh.style.boxShadow='0 0 30px #8b5cf6';
  await go(sh,[{transform:C(-W*.34,0,'scale(1)'),opacity:1},{transform:C(0,0,'scale(1.6)'),opacity:1}],550,{easing:'ease-in'});
  shake(10); pop('انعكاس!','#ddd6fe','78%','24%',40,1000); go(d,[{filter:'none'},{filter:'hue-rotate(60deg) brightness(1.7)'},{filter:'none'}],600,{fill:'none'});
  await wait(900); await title('مرآة ريغريد — الضربة تعود إليك','أنوس — الملك المطلق','#a78bfa',1500);
 },
 /* ---------- ريمورو ---------- */
 async azathoth(x){         // أزاثوث: سلايم عملاق يبتلع الساحة
  const {W,H,p,port,dport,flash,ring,title,pop,dots}=x;
  const a=port({left:'27%'}), d=dport({left:'73%'}); cnApp(a); cnApp(d,200); dots(40,'#7dd3fc',[3,9],[1500,3200]); await wait(650);
  pop('أزاثوث...','#7dd3fc','27%','20%',34,1100);
  const sl=p('',{left:'27%',top:'50%',width:'120px',height:'100px',borderRadius:'50% 50% 45% 45%',background:'radial-gradient(circle at 35% 30%,#e0f2fe,#38bdf8 45%,#0369a1)',boxShadow:'0 0 40px #38bdf8,inset 0 -10px 30px #0369a1',zIndex:75,opacity:0});
  const sc=Math.max(W,H)*2.2/110;
  go(sl,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1,offset:.25},{transform:C(0,0,'scale(1.3,.8)'),opacity:1,offset:.45},{transform:C(0,0,`scale(${sc})`),opacity:1}],1900,{easing:'ease-in'});
  await wait(1950); flash('#e0f2fe',400,.9); shake(12); ring('#38bdf8',6,1000);
  d.style.opacity=0;
  const tx=p('التهام',{left:'50%',top:'46%',fontSize:Math.min(H*.35,110)+'px',fontWeight:900,color:'#e0f2fe',textShadow:'0 0 30px #0ea5e9',zIndex:80,opacity:0});
  go(tx,[{transform:C(0,0,'scale(.5)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1,offset:.4},{transform:C(0,0,'scale(1.1)'),opacity:0}],1200);
  go(sl,[{opacity:1},{opacity:0}],900,{delay:500/speed});
  await wait(1200); await title('أزاثوث — التهام الإرادة','ريمورو — سيد التمبست','#38bdf8',1700);
 },
 async predator(x){         // افتراس: مجسّات سلايم تلتقط القدرة
  const {W,p,port,dport,flash,ring,title,pop}=x;
  const a=port({left:'27%'}), d=dport({left:'73%'}); cnApp(a); cnApp(d,200); await wait(550);
  for(let i=0;i<5;i++){ const t=p('',{left:'27%',top:'50%',width:W*.46+'px',height:'14px',transformOrigin:'0 50%',borderRadius:'8px',background:'linear-gradient(90deg,#0369a1,#38bdf8,#e0f2fe)',boxShadow:'0 0 18px #38bdf8',zIndex:70,opacity:0,transform:'translate(0,-50%)'});
   const ang=(i-2)*9;
   go(t,[{transform:`translate(0,-50%) rotate(${ang}deg) scaleX(0)`,opacity:1},{transform:`translate(0,-50%) rotate(${-ang*.5}deg) scaleX(1)`,opacity:1,offset:.5},{transform:'translate(0,-50%) rotate(0deg) scaleX(.1)',opacity:.8}],1100,{delay:i*80/speed}); }
  await wait(700); go(d,[{filter:'none'},{filter:'hue-rotate(160deg) brightness(1.6)'},{filter:'none'}],700,{fill:'none'});
  pop('افتراس!','#7dd3fc','73%','25%',38,900); ring('#38bdf8',3,800,0,'73%'); flash('#bae6fd',300,.6);
  await wait(900); await title('افتراس — تم استيعاب القدرة','ريمورو — سيد التمبست','#38bdf8',1500);
 }
});

/* ================================================================
   الدفعة 2 — بيروس، فيجيتو، غوجيتا، يوهاباخ، كاغويا (3 مشاهد لكل شخصية)
   ================================================================ */
Object.assign(SCENE_OF,{
 'beerus:هاكاي':'hakai','beerus:كرة التدمير':'destroyBall','beerus:وضع الدمار':'destroyMode',
 'vegito:فيجن كاميهاميها':'fusionKame','vegito:غالك غان':'galick','vegito:انتقال لحظي':'blink',
 'gogeta:ستار دراغون بريك':'starDragon','gogeta:ميتيور كراش':'meteorCrash','gogeta:تعزيز':'powerUp',
 'yhwach:امتصاص المستقبل':'futureSteal','yhwach:الرؤية المطلقة':'allSeeing','yhwach:أمر الإخضاع':'submit',
 'kaguya:تسوكيومي اللانهائي':'kaguyaTsuk','kaguya:سجن الأبعاد':'dimCage','kaguya:عظام الدمار':'boneSpikes'
});
const cnPair=(x,l='27%',r='73%')=>{const a=x.port({left:l}),d=x.dport({left:r});cnApp(a);cnApp(d,200);return[a,d]};
const cnOrb=(x,c,left,sz,z=72)=>x.p('',{left,top:'50%',width:sz+'px',height:sz+'px',borderRadius:'50%',background:`radial-gradient(circle,#fff 0 18%,${c} 48%,transparent 72%)`,boxShadow:`0 0 40px ${c}`,zIndex:z,opacity:0});
const cnBeam=(x,c1,c2,h,ms=1500,dl=0)=>{const b=x.p('',{left:'27%',top:'50%',width:x.W*.75+'px',height:h+'px',borderRadius:h+'px',transformOrigin:'0 50%',background:`linear-gradient(90deg,#fff,${c1} 25%,${c2} 70%,transparent)`,boxShadow:`0 0 60px ${c1}`,zIndex:74,opacity:0,transform:'translate(0,-50%) scaleX(0)'});
 return go(b,[{transform:'translate(0,-50%) scaleX(0)',opacity:1},{transform:'translate(0,-50%) scaleX(1)',opacity:1,offset:.25},{transform:'translate(0,-50%) scaleX(1)',opacity:1,offset:.75},{transform:'translate(0,-50%) scaleX(1) scaleY(.1)',opacity:0}],ms,{delay:dl/speed})};
const cnHit=(d,f='brightness(2) hue-rotate(40deg)')=>go(d,[{filter:'none'},{filter:f},{filter:'none'}],600,{fill:'none'});
Object.assign(SCENES,{
 /* ---------- بيروس ---------- */
 async hakai(x){const {W,p,flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(600);
  pop('هاكاي','#d8b4fe','27%','18%',38,1200);
  const o=cnOrb(x,'#7e22ce','27%',30);go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1.6)'),opacity:1}],700);await wait(750);
  await go(o,[{transform:C(0,0,'scale(1.6)'),opacity:1},{transform:C(W*.46,0,'scale(1.2)'),opacity:1}],550,{easing:'ease-in'});
  flash('#e9d5ff',300,.9);shake(14);ring('#a855f7',5,900,0,'73%');
  const gr=p('',{left:'73%',top:'50%',width:'170px',height:'210px',background:'repeating-linear-gradient(0deg,transparent 0 14px,#a855f7aa 14px 16px),repeating-linear-gradient(90deg,transparent 0 14px,#a855f7aa 14px 16px)',zIndex:73,opacity:0});
  go(gr,[{transform:C(0,0,'scale(1.4)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1,offset:.3},{transform:C(0,0,'scale(.9)'),opacity:.8}],800);
  go(d,[{filter:'none',transform:C(0,0,'scale(1)'),opacity:1},{filter:'brightness(0) drop-shadow(0 0 12px #a855f7)',transform:C(0,0,'scale(.95)'),opacity:1,offset:.5},{filter:'brightness(0)',transform:C(0,0,'scale(.05)'),opacity:0}],1000);
  rm(o);await wait(1100);await title('هاكاي — الدمار','بيروس — سيّد الدمار','#c084fc',1600)},
 async destroyBall(x){const {W,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const o=cnOrb(x,'#c084fc','34%',40);go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(3.2)'),opacity:1}],1000);
  dots(30,'#e9d5ff',[2,5],[900,1600]);ring('#c084fc',3,900,300,'34%');pop('تعال.','#e9d5ff','27%','20%',30,1000);await wait(1050);
  await go(o,[{transform:C(0,0,'scale(3.2)'),opacity:1},{transform:C(W*.38,0,'scale(3.6)'),opacity:1}],450,{easing:'ease-in'});
  rm(o);flash('#f3e8ff',320,.9);shake(12);ring('#a855f7',6,900,0,'73%');cnHit(d);
  await wait(800);await title('كرة التدمير','بيروس — سيّد الدمار','#c084fc',1400)},
 async destroyMode(x){const {port,flash,ring,title,pop,rays,bolts,dots}=x;const a=port();cnApp(a);await wait(500);
  rays('#7e22ce',1800);dots(50,'#c084fc',[2,6],[1500,3000]);
  go(a,[{filter:'none'},{filter:'hue-rotate(40deg) brightness(1.3) saturate(1.6)'}],900);
  ring('#a855f7',4,900);ring('#e9d5ff',6,1100,250);await wait(800);bolts('#c084fc',5);
  pop('أستيقظ','#e9d5ff','50%','18%',44,1400);flash('#a855f7',500,.7);shake(10);
  await wait(1300);await title('وضع الدمار','بيروس — سيّد الدمار','#c084fc',1500)},
 /* ---------- فيجيتو ---------- */
 async fusionKame(x){const {W,flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(550);
  const o1=cnOrb(x,'#3b82f6','18%',60),o2=cnOrb(x,'#22d3ee','36%',60),ap=[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}];
  go(o1,ap,500);go(o2,ap,500);pop('فيجن...','#7dd3fc','27%','20%',30,900);await wait(550);
  await Promise.all([go(o1,[{transform:C(0,0),opacity:1},{transform:C(W*.09,0),opacity:1}],500),go(o2,[{transform:C(0,0),opacity:1},{transform:C(-W*.09,0),opacity:1}],500)]);
  rm(o1,o2);const o=cnOrb(x,'#38bdf8','27%',50);go(o,[{transform:C(0,0,'scale(.5)'),opacity:1},{transform:C(0,0,'scale(2.4)'),opacity:1}],600);
  pop('كا-مي-ها-مي-ها!','#e0f2fe','50%','14%',32,1300);ring('#38bdf8',4,800);await wait(650);flash('#e0f2fe',300,.9);shake(14);
  cnBeam(x,'#38bdf8','#2563eb',110,1500);cnHit(d,'brightness(2.2)');await wait(1500);rm(o);await title('فيجن كاميهاميها','فيجيتو — اندماج المحاربين','#38bdf8',1500)},
 async galick(x){const {flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(550);
  const o=cnOrb(x,'#c084fc','27%',40);go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(2.2)'),opacity:1}],700);
  pop('غالك غان!','#e9d5ff','50%','16%',38,1200);ring('#a855f7',3,800,200,'27%');await wait(800);flash('#f3e8ff',280,.8);shake(12);
  cnBeam(x,'#c084fc','#7e22ce',80,1400);cnHit(d,'brightness(2) hue-rotate(60deg)');await wait(1400);rm(o);await title('غالك غان','فيجيتو — اندماج المحاربين','#c084fc',1400)},
 async blink(x){const {W,port,flash,ring,title,pop}=x;const a=port({left:'20%'});cnApp(a);await wait(500);
  for(let i=0;i<5;i++){const g=port({left:(20+i*13)+'%',opacity:0,filter:'brightness(1.5) hue-rotate(-20deg)'});go(g,[{opacity:0},{opacity:.55},{opacity:0}],600,{delay:(250+i*120)/speed})}
  go(a,[{transform:C(0,0),opacity:1},{transform:C(W*.6,0),opacity:1}],450,{delay:200/speed});
  await wait(850);flash('#e0f2fe',260,.7);ring('#7dd3fc',3,700,0,'80%');pop('أسرع منك','#7dd3fc','50%','20%',36,1100);
  await wait(1000);await title('انتقال لحظي','فيجيتو — اندماج المحاربين','#38bdf8',1300)},
 /* ---------- غوجيتا ---------- */
 async starDragon(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('ستار دراغون بريك!','#67e8f9','50%','16%',32,1400);dots(40,'#fde68a',[2,6],[1200,2400]);
  const dr=p('🐉',{left:'27%',top:'50%',fontSize:Math.min(H*.55,190)+'px',filter:'drop-shadow(0 0 30px #22d3ee) hue-rotate(120deg)',zIndex:76,opacity:0});
  go(dr,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,-30,'scale(1)'),opacity:1,offset:.3},{transform:C(W*.2,40,'scale(1.1) rotate(8deg)'),opacity:1,offset:.6},{transform:C(W*.46,0,'scale(1.4)'),opacity:1}],1400);
  for(let i=0;i<8;i++){const s=p('⭐',{left:'27%',top:'50%',fontSize:'28px',zIndex:75,opacity:0});go(s,[{transform:C(0,rnd(-40,40)),opacity:1},{transform:C(W*.46,rnd(-70,70),'rotate(360deg)'),opacity:0}],1200,{delay:i*110/speed})}
  await wait(1450);rm(dr);flash('#cffafe',400,1);shake(16);ring('#22d3ee',6,1000,0,'73%');ring('#fde68a',4,900,150,'73%');cnHit(d,'brightness(2.2)');
  await wait(1000);await title('ستار دراغون بريك','غوجيتا — اندماج الفيوجن','#22d3ee',1600)},
 async meteorCrash(x){const {H,p,flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(550);
  go(a,[{transform:C(0,0)},{transform:C(0,-40,'scale(1.08)')},{transform:C(0,0)}],900,{fill:'none'});pop('ميتيور كراش!','#67e8f9','50%','16%',34,1300);
  for(let i=0;i<9;i++){const m=p('☄️',{left:(73+rnd(-8,8))+'%',top:'50%',fontSize:'44px',zIndex:76,opacity:0});go(m,[{transform:C(-140,-H*.7,'scale(.8)'),opacity:1},{transform:C(rnd(-20,20),rnd(-20,20),'scale(1.3)'),opacity:1,offset:.85},{transform:C(0,0,'scale(1.6)'),opacity:0}],700,{delay:i*130/speed})}
  await wait(1300);flash('#cffafe',350,.9);shake(15);ring('#22d3ee',5,900,0,'73%');cnHit(d);await wait(900);await title('ميتيور كراش','غوجيتا — اندماج الفيوجن','#22d3ee',1400)},
 async powerUp(x){const {port,flash,ring,title,pop,rays,bolts,dots}=x;const a=port();cnApp(a);await wait(500);
  rays('#22d3ee',1800);dots(50,'#a5f3fc',[2,6],[1500,3000]);go(a,[{filter:'none'},{filter:'brightness(1.5) saturate(1.5)'}],900);
  ring('#22d3ee',4,900);ring('#fde68a',6,1100,250);await wait(800);bolts('#67e8f9',5);pop('لننهِ هذا.','#cffafe','50%','18%',40,1400);flash('#22d3ee',500,.6);shake(10);
  await wait(1300);await title('تعزيز','غوجيتا — اندماج الفيوجن','#22d3ee',1500)},
 /* ---------- يوهاباخ ---------- */
 async futureSteal(x){const {W,dport,flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(550);
  pop('أرى كل ما سيحدث...','#e2e8f0','50%','16%',28,1400);
  [0,1,2,3].forEach(i=>{const g=dport({left:'73%',opacity:0,filter:'grayscale(1) brightness(1.6)'});go(g,[{transform:C(0,0),opacity:0},{transform:C((i-1.5)*60,(i%2?-1:1)*14),opacity:.45,offset:.5},{transform:C(-W*.46,0,'scale(.6)'),opacity:0}],1700,{delay:i*250/speed})});
  go(d,[{filter:'none'},{filter:'grayscale(1) brightness(.6)'}],1500);ring('#e2e8f0',4,1000,1200,'27%');
  await wait(2000);flash('#fff',500,.9);pop('مستقبلك صار لي','#e2e8f0','73%','24%',30,1100);await wait(1100);await title('امتصاص المستقبل','يوهاباخ — ملك الكوينسي','#e2e8f0',1600)},
 async allSeeing(x){const {p,flash,ring,title,pop,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  const e=p('👁️',{left:'27%',top:'30%',fontSize:'80px',filter:'drop-shadow(0 0 22px #e2e8f0)',zIndex:80,opacity:0});go(e,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1.2)'),opacity:1,offset:.4},{transform:C(0,0,'scale(1)'),opacity:1}],700);
  await wait(700);for(let i=0;i<5;i++)slashLine('#fca5a5',rnd(-30,30),230,600,i*150,3,'73%','50%');
  ring('#e2e8f0',4,900,300,'27%');await wait(1000);pop('رأيتُها قبل أن تُوجَّه','#e2e8f0','50%','78%',26,1200);flash('#fff',300,.5);
  await wait(1100);await title('الرؤية المطلقة','يوهاباخ — ملك الكوينسي','#e2e8f0',1400)},
 async submit(x){const {H,p,flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(550);pop('اخضعوا','#e2e8f0','27%','18%',40,1200);
  for(let i=0;i<7;i++){const b=p('',{left:(60+i*6)+'%',top:'50%',width:'22px',height:'100%',background:'linear-gradient(#000,#1e1b4b 70%,transparent)',boxShadow:'0 0 20px #4338ca',zIndex:74,opacity:0});
   go(b,[{transform:C(0,-H,'scaleY(.2)'),opacity:1},{transform:C(0,0,'scaleY(1)'),opacity:1,offset:.3},{transform:C(0,0,'scaleY(1)'),opacity:.8}],1100,{delay:i*90/speed})}
  await wait(700);go(d,[{transform:C(0,0),filter:'none'},{transform:C(0,26,'scale(.93)'),filter:'grayscale(1) brightness(.6)'}],900);shake(10);ring('#4338ca',5,900,0,'73%');flash('#1e1b4b',350,.7);
  await wait(1100);await title('أمر الإخضاع','يوهاباخ — ملك الكوينسي','#e2e8f0',1500)},
 /* ---------- كاغويا ---------- */
 async kaguyaTsuk(x){const {W,H,p,ring,title,pop,flash}=x;const [a,d]=cnPair(x);await wait(550);
  const sky=p('',{inset:0,background:'radial-gradient(circle at 50% 18%,#7f1d1d,#1c0508 80%)',zIndex:61,opacity:0});go(sky,[{opacity:0},{opacity:.9}],900);
  const m=Math.min(W,H)*.5,mn=p('',{left:'50%',top:'22%',width:m+'px',height:m+'px',borderRadius:'50%',background:'radial-gradient(circle at 40% 40%,#fecaca,#ef4444 45%,#7f1d1d)',boxShadow:'0 0 80px #ef4444',zIndex:63,opacity:0});
  go(mn,[{transform:C(0,-60,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],1100);
  for(let i=0;i<3;i++)ring('#ef4444',5,1400,i*400,'50%','22%');
  for(let i=0;i<6;i++){const e=p('👁️',{left:(15+i*14)+'%',top:(62+(i%2)*14)+'%',fontSize:'30px',zIndex:70,opacity:0});go(e,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:.9,offset:.4},{transform:C(0,0,'scale(1)'),opacity:0}],1500,{delay:(700+i*180)/speed})}
  await wait(1100);go(d,[{filter:'none'},{filter:'grayscale(1) sepia(1) hue-rotate(-30deg) saturate(3)'}],1200);pop('نمْ إلى الأبد','#fecaca','50%','76%',34,1500);
  await wait(1700);flash('#7f1d1d',500,.8);await title('تسوكيومي اللانهائي','كاغويا — أرنب القمر','#ef4444',1700)},
 async dimCage(x){const {p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const cg=p('',{left:'73%',top:'50%',width:'170px',height:'220px',border:'3px solid #e2e8f0',background:'repeating-linear-gradient(0deg,transparent 0 22px,#e2e8f055 22px 24px),repeating-linear-gradient(90deg,transparent 0 22px,#e2e8f055 22px 24px)',boxShadow:'0 0 40px #94a3b8,inset 0 0 40px #94a3b8',zIndex:73,opacity:0});
  pop('تُهْ بين الأبعاد','#e2e8f0','50%','16%',30,1300);dots(30,'#e2e8f0',[2,5],[1200,2200]);
  go(cg,[{transform:C(0,0,'scale(2.2) rotate(8deg)'),opacity:0},{transform:C(0,0,'scale(1.1) rotate(-3deg)'),opacity:1,offset:.6},{transform:C(0,0,'scale(1) rotate(0)'),opacity:1}],900);
  await wait(900);ring('#cbd5e1',4,800,0,'73%');shake(8);go(d,[{transform:C(0,0)},{transform:C(6,0,'skewX(12deg)')},{transform:C(-6,0,'skewX(-12deg)')},{transform:C(0,0)}],300,{iterations:3,fill:'none'});
  await wait(1000);flash('#f1f5f9',300,.6);await title('سجن الأبعاد','كاغويا — أرنب القمر','#cbd5e1',1500)},
 async boneSpikes(x){const {H,p,flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(550);
  for(let i=0;i<7;i++){const h=H*(.35+rnd(0,.3)),s=p('',{left:(60+i*6.3)+'%',top:'100%',width:'38px',height:h+'px',background:'linear-gradient(90deg,#94a3b8,#f8fafc 50%,#94a3b8)',clipPath:'polygon(50% 0,100% 100%,0 100%)',filter:'drop-shadow(0 0 8px #fff)',zIndex:74,opacity:0});
   go(s,[{transform:C(0,h/2,'scaleY(.1)'),opacity:1},{transform:C(0,-h/2,'scaleY(1)'),opacity:1,offset:.35},{transform:C(0,-h/2,'scaleY(1)'),opacity:1,offset:.8},{transform:C(0,h/2,'scaleY(1)'),opacity:0}],1200,{delay:i*100/speed})}
  pop('عظامي تمزّقك','#f1f5f9','50%','18%',32,1200);await wait(600);flash('#fff',250,.7);shake(12);cnHit(d,'brightness(1.8) sepia(1) hue-rotate(-30deg)');
  await wait(1100);await title('عظام الدمار','كاغويا — أرنب القمر','#cbd5e1',1400)}
});

Object.assign(SCENE_OF,{
 'shadow:أتومك':'atomic','shadow:ثقب الظل':'shadowHole','shadow:هيمنة الظلال':'shadowDom',
 'jinwoo:جيش الظلال':'shadowArmy','jinwoo:سيادة الملك':'kingSov','jinwoo:نطاق الملك: الانهيار':'kingDomain',
 'luffy:جير 5 — واقع كرتوني':'gear5','luffy:هاكي الملوك':'kingHaki','luffy:باجرانغ غان':'bajrang',
 'imu:الإزالة من الوجود':'imuErase','imu:ظلال الحاكم':'imuSages','imu:ختم الأفكار':'imuSeal',
 'escanor:الشمس المطلقة':'sunrise','escanor:ذا ون':'theOne','escanor:كروزيل صن':'cruelSun'
});
Object.assign(SCENES,{
 /* ---------- شادو ---------- */
 async atomic(x){const {H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const gc=p('',{left:'27%',top:'76%',width:'200px',height:'60px',borderRadius:'50%',border:'3px solid #818cf8',boxShadow:'0 0 30px #6366f1,inset 0 0 30px #6366f1',zIndex:63,opacity:0});
  go(gc,[{transform:C(0,0,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1.6)'),opacity:1}],700);
  const o=cnOrb(x,'#818cf8','27%',40);go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,-20,'scale(3.4)'),opacity:1}],1100);
  dots(40,'#c7d2fe',[2,5],[1000,1800]);pop('أتـوووميك!','#c7d2fe','27%','16%',36,1200);ring('#6366f1',4,900,300,'27%');await wait(1150);
  const bp=cnBeam(x,'#e0e7ff','#6366f1',Math.min(H*.35,150),1100);await wait(420);
  flash('#eef2ff',500,1);shake(20);ring('#818cf8',7,1100,0,'73%');
  const bl=p('',{left:'73%',top:'50%',width:'160px',height:'160px',borderRadius:'50%',background:'radial-gradient(circle,#fff,#a5b4fc 40%,#4338ca 70%,transparent)',zIndex:76,opacity:0});
  go(bl,[{transform:C(0,0,'scale(.3)'),opacity:1},{transform:C(0,0,'scale(4)'),opacity:0}],1000);cnHit(d,'brightness(3) hue-rotate(200deg)');
  await bp;rm(o);await title('أتومك','شادو — سيد الظلال','#818cf8',1500)},
 async shadowHole(x){const {H,p,flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(550);
  pop('الظلام يبتلعك.','#a5b4fc','73%','16%',28,1200);
  const hole=p('',{left:'73%',top:'66%',width:'260px',height:'90px',borderRadius:'50%',background:'radial-gradient(ellipse,#000 40%,#1e1b4b 70%,transparent)',border:'3px solid #6366f1',boxShadow:'0 0 40px #4f46e5',zIndex:60,opacity:0});
  go(hole,[{transform:C(0,0,'scale(.1)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],700);ring('#6366f1',3,900,100,'73%','66%');
  for(let i=0;i<8;i++){const t=p('',{left:'73%',top:'66%',width:'8px',height:'60px',borderRadius:'4px',background:'linear-gradient(#000,#6366f1)',zIndex:62,opacity:0});
   go(t,[{transform:C((i-3.5)*26,0,'scaleY(.1)'),opacity:1},{transform:C((i-3.5)*26,-30,'scaleY(1)'),opacity:1,offset:.5},{transform:C((i-3.5)*26,0,'scaleY(.1)'),opacity:0}],900,{delay:(300+i*60)/speed})}
  await wait(900);
  await go(d,[{transform:C(0,0,'scale(1)'),filter:'none',opacity:1},{transform:C(0,H*.12,'scale(.4)'),filter:'brightness(0) drop-shadow(0 0 10px #6366f1)',opacity:.5,offset:.6},{transform:C(0,H*.2,'scale(.05)'),filter:'brightness(0)',opacity:0}],1100,{easing:'ease-in'});
  shake(10);flash('#1e1b4b',350,.8);await wait(400);await title('ثقب الظل','شادو — سيد الظلال','#818cf8',1500)},
 async shadowDom(x){const {port,flash,ring,title,pop,rays,dots}=x;const a=port();cnApp(a);await wait(500);
  rays('#4338ca',1800);dots(50,'#6366f1',[2,6],[1500,3000]);
  for(let i=0;i<6;i++){const g=port({opacity:0,filter:'brightness(0) drop-shadow(0 0 10px #6366f1)',zIndex:61,boxShadow:'none'});
   go(g,[{transform:C(0,0),opacity:.7},{transform:C((i%2?1:-1)*(30+i*20),-i*8),opacity:0}],900,{delay:i*160/speed})}
  go(a,[{filter:'none'},{filter:'brightness(.55) contrast(1.3) drop-shadow(0 0 24px #6366f1)'}],900);
  ring('#6366f1',4,900);ring('#e0e7ff',6,1100,250);await wait(800);pop('الظل يقوّيني.','#c7d2fe','50%','18%',34,1300);flash('#312e81',450,.7);
  await wait(1300);await title('هيمنة الظلال','شادو — سيد الظلال','#818cf8',1500)},
 /* ---------- جين-وو ---------- */
 async shadowArmy(x){const {W,H,p,flash,ring,title,pop,dots,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  pop('انهضوا!','#c4b5fd','27%','16%',36,1200);ring('#7c3aed',3,900,0,'38%','78%');dots(30,'#a78bfa',[2,5],[1000,2000]);
  for(let i=0;i<7;i++){const lx=30+i*6,tx=(73-lx)/100*W,ty=-(i%3)*14,e=p('🥷',{left:lx+'%',top:'70%',fontSize:Math.min(H*.2,70)+'px',filter:'brightness(0) drop-shadow(0 0 8px #7c3aed) drop-shadow(0 0 14px #7c3aed)',zIndex:66,opacity:0});
   go(e,[{transform:C(0,50,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1,offset:.3},{transform:C(0,0,'scale(1)'),opacity:1,offset:.55},{transform:C(tx,ty,'scale(1.15)'),opacity:1,offset:.9},{transform:C(tx,ty,'scale(1.15)'),opacity:0}],1700,{delay:i*90/speed,easing:'ease-in'})}
  await wait(1500);for(let i=0;i<4;i++)slashLine('#c4b5fd',-30+i*20,220,350,i*120,5,'73%','50%');
  flash('#ddd6fe',350,.8);shake(14);cnHit(d,'brightness(.5) hue-rotate(250deg)');ring('#7c3aed',5,900,0,'73%');
  await wait(900);await title('جيش الظلال','جين-وو — ملك الظلال','#a78bfa',1500)},
 async kingSov(x){const {p,flash,ring,title,pop,rays,dots}=x;const [a,d]=cnPair(x);await wait(550);
  rays('#4c1d95',1800);dots(40,'#7c3aed',[2,6],[1500,3000]);
  const vg=p('',{inset:0,background:'radial-gradient(circle,transparent 25%,#2e1065cc 90%)',zIndex:59,opacity:0});go(vg,[{opacity:0},{opacity:1}],900);
  go(a,[{filter:'none'},{filter:'brightness(1.3) drop-shadow(0 0 26px #7c3aed)'}],800);
  ring('#7c3aed',4,900);ring('#ddd6fe',6,1100,250);pop('اخضعوا.','#ddd6fe','50%','18%',44,1500);await wait(900);
  for(let i=0;i<4;i++)ring('#a78bfa',3+i,900,i*180,'73%');
  go(d,[{transform:C(0,0,'scale(1)'),filter:'none'},{transform:C(0,26,'scale(.88,.8)'),filter:'grayscale(1) brightness(.6)'}],900);shake(12);
  await wait(1100);await title('سيادة الملك','جين-وو — ملك الظلال','#a78bfa',1500)},
 async kingDomain(x){const {W,H,p,flash,ring,title,pop,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  const S=Math.max(W,H)*1.3,dm=p('',{left:'73%',top:'50%',width:S+'px',height:S+'px',borderRadius:'50%',background:'radial-gradient(circle,#0b0618 30%,#4c1d95aa 60%,transparent 72%)',border:'3px solid #7c3aed',boxShadow:'0 0 60px #7c3aed',zIndex:58,opacity:0});
  go(dm,[{transform:C(0,0,'scale(.1)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],1000);pop('نطاق الملك','#c4b5fd','50%','16%',34,1200);ring('#7c3aed',6,1100);await wait(1000);
  for(let i=0;i<7;i++)slashLine('#a78bfa',rnd(-80,80),W*.5,700,i*100,3,(55+rnd(0,40))+'%',(20+rnd(0,60))+'%');
  for(let i=0;i<22;i++){const r=p('🪨',{left:rnd(45,100)+'%',top:'-8%',fontSize:rnd(16,34)+'px',filter:'drop-shadow(0 0 8px #7c3aed)',zIndex:70,opacity:0});go(r,[{transform:C(0,0),opacity:1},{transform:C(0,H*1.1),opacity:1}],rnd(700,1100),{delay:rnd(0,900)/speed,easing:'ease-in'})}
  pop('كل شيء... يسقط.','#ddd6fe','50%','80%',30,1400);await wait(900);
  go(d,[{transform:C(0,0,'scale(1)'),opacity:1},{transform:C(0,50,'scaleY(.15)'),opacity:.6,offset:.7},{transform:C(0,60,'scaleY(.05)'),opacity:0}],900,{easing:'ease-in'});flash('#c4b5fd',500,.9);shake(22);
  await wait(900);await title('نطاق الملك: الانهيار','جين-وو — ملك الظلال','#a78bfa',1500)},
 /* ---------- لوفي ---------- */
 async gear5(x){const {W,H,p,flash,ring,title,pop,rays,dots}=x;const [a,d]=cnPair(x);await wait(500);
  rays('#fff',1600);dots(40,'#fff',[3,7],[1500,2800]);
  go(a,[{filter:'none'},{filter:'brightness(1.6) saturate(.4) drop-shadow(0 0 30px #fff)'}],700);
  for(let i=0;i<5;i++){const c=p('☁️',{left:'27%',top:'50%',fontSize:rnd(40,70)+'px',zIndex:64,opacity:0});go(c,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(rnd(-90,90),rnd(-100,60),'scale(1.2)'),opacity:1,offset:.5},{transform:C(rnd(-110,110),rnd(-130,40),'scale(1)'),opacity:0}],1300,{delay:i*100/speed})}
  ring('#fff',4,900);pop('غوم غوم نو!','#fef9c3','27%','16%',34,1200);await wait(1000);
  const f=p('👊',{left:'27%',top:'50%',fontSize:Math.min(H*.45,170)+'px',filter:'drop-shadow(0 0 20px #fff)',zIndex:80,opacity:0});
  await go(f,[{transform:C(0,0,'scale(.4)'),opacity:1},{transform:C(W*.46,0,'scale(1.8,1.1)'),opacity:1}],500,{easing:'ease-in'});
  pop('بوووينغ!','#fde047','73%','24%',44,900);flash('#fff',320,.9);shake(16);ring('#fde047',6,900,0,'73%');
  go(d,[{transform:C(0,0,'scale(1)')},{transform:C(0,0,'scale(1.5,.4)'),offset:.15},{transform:C(W*.3,-40,'scale(.7) rotate(25deg)'),offset:.55},{transform:C(0,0,'scale(1)')}],1300);
  rm(f);await wait(1300);await title('جير 5 — واقع كرتوني','لوفي — محرّر الشمس نيكا','#fef08a',1500)},
 async kingHaki(x){const {flash,ring,title,pop,bolts,dots}=x;const [a,d]=cnPair(x);await wait(550);
  go(a,[{filter:'none'},{filter:'brightness(.5) contrast(1.5) drop-shadow(0 0 26px #ef4444)'}],700);
  pop('اثبت مكانك!','#fca5a5','27%','16%',36,1200);dots(30,'#7f1d1d',[3,7],[1200,2200]);
  for(let i=0;i<4;i++)ring(i%2?'#000':'#ef4444',3+i*1.4,1000,i*200,'27%');
  await wait(700);bolts('#ef4444',6);bolts('#000',5);flash('#450a0a',400,.8);shake(14);
  for(let i=0;i<4;i++)ring(i%2?'#7f1d1d':'#f87171',3+i,900,i*180,'73%');
  go(d,[{transform:C(0,0,'scale(1)'),filter:'none'},{transform:C(0,0,'scale(.9)'),filter:'grayscale(1) brightness(.4)',offset:.4},{transform:C(0,30,'scale(.88)'),filter:'grayscale(1) brightness(.4)'}],1000);
  await wait(1100);await title('هاكي الملوك','لوفي — محرّر الشمس نيكا','#f87171',1500)},
 async bajrang(x){const {H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('باجرانغ غان!','#fde047','50%','14%',40,1300);dots(40,'#fde047',[2,5],[1200,2200]);
  const f=p('👊',{left:'73%',top:'50%',fontSize:Math.min(H*1.1,420)+'px',filter:'drop-shadow(0 0 40px #fde047) drop-shadow(0 0 80px #f59e0b)',zIndex:80,opacity:0});
  await go(f,[{transform:C(0,-H*.9,'scale(.4)'),opacity:0},{transform:C(0,-H*.4,'scale(.9)'),opacity:1,offset:.5},{transform:C(0,-H*.02,'scale(1.15)'),opacity:1}],900,{easing:'ease-in'});
  flash('#fffbeb',420,1);shake(26);ring('#fde047',7,1100,0,'73%');ring('#fff',5,900,150,'73%');
  go(d,[{transform:C(0,0,'scale(1)'),opacity:1},{transform:C(0,70,'scale(1.5,.12)'),opacity:1,offset:.2},{transform:C(0,70,'scale(1.5,.12)'),opacity:0}],1200);
  go(f,[{transform:C(0,-H*.02,'scale(1.15)'),opacity:1},{transform:C(0,-H*.02,'scale(1.3)'),opacity:0}],900);
  await wait(1100);await title('باجرانغ غان','لوفي — محرّر الشمس نيكا','#fde047',1500)},
 /* ---------- إيمو ---------- */
 async imuErase(x){const {W,H,p,flash,ring,title,pop,dots,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  const th=p('🪑',{left:'27%',top:'50%',fontSize:Math.min(H*.4,150)+'px',filter:'brightness(.2) drop-shadow(0 0 24px #991b1b)',zIndex:66,opacity:0});go(th,[{transform:C(0,30,'scale(.4)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],700);
  pop('لا وجود لك.','#fca5a5','50%','16%',34,1500);dots(30,'#991b1b',[2,5],[1200,2200]);await wait(900);
  const S=Math.max(W,H)*1.2,vd=p('',{left:'73%',top:'50%',width:S+'px',height:S+'px',borderRadius:'50%',background:'radial-gradient(circle,#000 55%,#450a0a 72%,transparent 74%)',zIndex:68,opacity:0});
  go(vd,[{transform:C(0,0,'scale(0)'),opacity:1},{transform:C(0,0,'scale(.42)'),opacity:1}],1000,{easing:'ease-in'});
  for(let i=0;i<6;i++)slashLine('#ef4444',i*30-60,W*.3,300,300+i*110,3,'73%',(30+i*8)+'%');
  go(d,[{filter:'none',opacity:1,transform:C(0,0,'scale(1)')},{filter:'grayscale(1) contrast(2)',opacity:.7,offset:.5},{filter:'brightness(0)',opacity:0,transform:C(0,0,'scale(.6)')}],1100);
  await wait(1000);flash('#000',400,.9);shake(14);ring('#991b1b',5,900,0,'73%');await wait(600);await title('الإزالة من الوجود','إيمو — حاكم العرش الفارغ','#ef4444',1500)},
 async imuSages(x){const {W,H,p,flash,ring,title,pop,dots,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  pop('ظلالي تأتي.','#fca5a5','27%','16%',32,1200);dots(25,'#7f1d1d',[2,5],[1200,2200]);
  for(let i=0;i<5;i++){const ang=i/5*Math.PI*2,rx=Math.min(W*.2,130),ry=Math.min(H*.3,110),px=Math.cos(ang)*rx,py=Math.sin(ang)*ry;
   const s=p('🧙',{left:'73%',top:'50%',fontSize:Math.min(H*.22,80)+'px',filter:'brightness(0) drop-shadow(0 0 8px #dc2626) drop-shadow(0 0 16px #991b1b)',zIndex:66,opacity:0});
   go(s,[{transform:C(px*2,py*2,'scale(.3)'),opacity:0},{transform:C(px,py,'scale(1)'),opacity:1,offset:.5},{transform:C(px*.4,py*.4,'scale(1.1)'),opacity:1}],1100,{delay:i*120/speed});
   slashLine('#ef4444',ang*57.3+180,rx*1.6,350,1300+i*140,4,`calc(73% + ${px}px)`,`calc(50% + ${py}px)`)}
  await wait(1900);flash('#450a0a',400,.8);shake(12);cnHit(d,'brightness(.5) sepia(1) hue-rotate(-30deg) saturate(4)');ring('#dc2626',5,900,0,'73%');
  await wait(900);await title('ظلال الحاكم','إيمو — حاكم العرش الفارغ','#ef4444',1500)},
 async imuSeal(x){const {H,p,flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(550);
  for(let i=0;i<7;i++){const t=p('؟',{left:'73%',top:'50%',fontSize:rnd(24,46)+'px',fontWeight:900,color:'#fca5a5',textShadow:'0 0 12px #dc2626',zIndex:70,opacity:0});go(t,[{transform:C(rnd(-60,60),-60,'scale(.4)'),opacity:0},{transform:C(rnd(-70,70),rnd(-120,-60),'scale(1)'),opacity:1,offset:.4},{transform:C(rnd(-70,70),-150,'scale(.8)'),opacity:0}],1100,{delay:i*130/speed})}
  pop('فكّرتَ...','#fca5a5','50%','16%',32,1100);await wait(1100);
  const ch=p('⛓️',{left:'73%',top:'50%',fontSize:Math.min(H*.6,240)+'px',filter:'drop-shadow(0 0 18px #991b1b) brightness(.6)',zIndex:80,opacity:0});go(ch,[{transform:C(0,0,'scale(2)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],500,{easing:'ease-in'});
  await wait(500);flash('#7f1d1d',350,.8);shake(10);ring('#991b1b',5,900,0,'73%');
  go(d,[{filter:'none'},{filter:'grayscale(1) brightness(.5)'}],700);pop('وانتهى.','#fecaca','50%','78%',38,1300);
  await wait(1200);await title('ختم الأفكار','إيمو — حاكم العرش الفارغ','#ef4444',1500)},
 /* ---------- إسكانور ---------- */
 async sunrise(x){const {W,H,p,flash,ring,title,pop,rays,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('سانشاين!','#fde68a','27%','16%',40,1300);
  const R=Math.min(W,H)*.5,sun=p('',{left:'50%',top:'-10%',width:R+'px',height:R+'px',borderRadius:'50%',background:'radial-gradient(circle,#fff 0 25%,#fde047 45%,#f59e0b 70%,#dc2626 100%)',boxShadow:'0 0 80px #f59e0b,0 0 160px #ef4444',zIndex:66,opacity:0});
  go(sun,[{transform:C(0,0,'scale(.2)'),opacity:0},{transform:C(0,H*.28,'scale(1)'),opacity:1}],1300);rays('#f59e0b',1800);dots(40,'#fde047',[2,6],[1200,2400]);
  await wait(1400);
  await go(sun,[{transform:C(0,H*.28,'scale(1)'),opacity:1},{transform:C(W*.23,H*.62,'scale(1.4)'),opacity:1}],550,{easing:'ease-in'});
  flash('#fff7ed',500,1);shake(22);ring('#f59e0b',7,1100,0,'73%');ring('#fff',5,900,120,'73%');
  go(sun,[{transform:C(W*.23,H*.62,'scale(1.4)'),opacity:1},{transform:C(W*.23,H*.62,'scale(3)'),opacity:0}],1000);
  go(d,[{filter:'none'},{filter:'sepia(1) saturate(6) brightness(.6) drop-shadow(0 0 20px #ef4444)'}],900);
  await wait(1200);await title('الشمس المطلقة','إسكانور — أسد الغرور','#fbbf24',1600)},
 async theOne(x){const {p,port,flash,ring,title,pop,rays,dots}=x;const a=port();cnApp(a);await wait(500);
  const cl=p('🕛',{left:'50%',top:'22%',fontSize:'80px',filter:'drop-shadow(0 0 24px #fde047)',zIndex:80,opacity:0});go(cl,[{transform:C(0,-30,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1.2)'),opacity:1,offset:.5},{transform:C(0,0,'scale(1)'),opacity:1}],900);
  pop('الظهيرة...','#fde68a','50%','10%',26,1200);await wait(900);
  rays('#fbbf24',2000);dots(50,'#fde047',[2,6],[1500,3000]);
  go(a,[{transform:C(0,0,'scale(1)'),filter:'none'},{transform:C(0,0,'scale(1.3)'),filter:'brightness(1.4) sepia(.5) saturate(2.5) drop-shadow(0 0 40px #f59e0b)'}],1000);
  ring('#f59e0b',4,900);ring('#fff',6,1100,200);ring('#fde047',8,1300,400);
  await wait(900);flash('#fef3c7',500,.9);shake(14);pop('الآن... الظهيرة!','#fef3c7','50%','78%',38,1400);
  await wait(1300);await title('ذا ون','إسكانور — أسد الغرور','#fbbf24',1500)},
 async cruelSun(x){const {W,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const o=cnOrb(x,'#f59e0b','34%',40);go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(3.2)'),opacity:1}],1000);
  dots(30,'#fde047',[2,5],[900,1600]);ring('#f59e0b',3,900,300,'34%');pop('كروزيل صن!','#fde68a','27%','18%',32,1000);await wait(1050);
  await go(o,[{transform:C(0,0,'scale(3.2)'),opacity:1},{transform:C(W*.38,0,'scale(3.6)'),opacity:1}],450,{easing:'ease-in'});
  rm(o);flash('#fff7ed',320,.9);shake(14);ring('#ef4444',6,900,0,'73%');cnHit(d,'brightness(2) sepia(1) saturate(5)');dots(40,'#fb923c',[2,6],[900,1600]);
  await wait(900);await title('كروزيل صن','إسكانور — أسد الغرور','#fbbf24',1400)}
});

Object.assign(SCENE_OF,{'zeno:إعادة الضبط':'zenoReset','whis:عصا المعلّم':'angelStaff','feather:فراشات ذهبية':'goldButterflies','anos:ديجيما':'dijima','rimuru:بلاك فلير':'blackFlare'});
Object.assign(SCENES,{
 async zenoReset(x){const {W,H,p,port,flash,ring,title,pop,dots}=x;const a=port();cnApp(a);await wait(500);
  dots(50,'#f5d0fe',[1,4],[1500,3000]);pop('سأعيد الترتيب.','#f5d0fe','50%','16%',30,1400);
  const g=p('',{inset:0,backgroundImage:'linear-gradient(#e879f966 1px,transparent 1px),linear-gradient(90deg,#e879f966 1px,transparent 1px)',backgroundSize:'40px 40px',zIndex:58,opacity:0});go(g,[{opacity:0},{opacity:1},{opacity:.4}],1200);
  for(let i=0;i<4;i++)ring('#e879f9',3+i*1.5,1000,i*220);
  go(a,[{filter:'none',transform:C(0,0,'scale(1)')},{filter:'grayscale(1) brightness(2)',transform:C(0,0,'scale(.9)'),offset:.4},{filter:'brightness(1.3) drop-shadow(0 0 26px #22c55e)',transform:C(0,0,'scale(1)')}],1400);
  await wait(1200);for(let i=0;i<8;i++){const c=p('✚',{left:rnd(35,65)+'%',top:'60%',fontSize:'30px',color:'#86efac',textShadow:'0 0 10px #22c55e',zIndex:80,opacity:0});go(c,[{transform:C(0,0),opacity:1},{transform:C(0,-H*.35),opacity:0}],1000,{delay:i*80/speed})}
  flash('#fdf4ff',450,.8);await wait(1000);await title('إعادة الضبط','زينو — ملك كل شيء','#e879f9',1400)},
 async angelStaff(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const st=p('🪄',{left:'27%',top:'50%',fontSize:'80px',filter:'drop-shadow(0 0 18px #60a5fa)',zIndex:80,opacity:0});
  go(st,[{transform:C(0,20,'scale(.4) rotate(-30deg)'),opacity:0},{transform:C(30,-10,'scale(1.2) rotate(20deg)'),opacity:1}],700);
  pop('خذ هذه.','#bfdbfe','27%','18%',30,1000);await wait(800);
  const o=cnOrb(x,'#60a5fa','30%',40);go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(2.2)'),opacity:1}],600);await wait(600);
  await go(o,[{transform:C(0,0,'scale(2.2)'),opacity:1},{transform:C(W*.43,0,'scale(2.4)'),opacity:1}],400,{easing:'ease-in'});
  rm(o);flash('#dbeafe',320,.9);shake(10);ring('#60a5fa',5,900,0,'73%');cnHit(d,'brightness(2) hue-rotate(-20deg)');dots(30,'#bfdbfe',[2,5],[900,1600]);
  await wait(800);await title('عصا المعلّم','ويس — معلّم الأقوياء','#60a5fa',1400)},
 async goldButterflies(x){const {W,H,p,flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(550);
  pop('ترقص الفراشات.','#fde68a','27%','18%',30,1200);
  for(let i=0;i<14;i++){const b=p('🦋',{left:'27%',top:'50%',fontSize:rnd(22,40)+'px',filter:'sepia(1) saturate(5) hue-rotate(5deg) drop-shadow(0 0 10px #fbbf24)',zIndex:70,opacity:0});
   go(b,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(rnd(W*.05,W*.2),rnd(-110,110),'scale(1)'),opacity:1,offset:.4},{transform:C(W*.46+rnd(-30,30),rnd(-50,50),'scale(1.1)'),opacity:1,offset:.85},{transform:C(W*.46,0,'scale(.4)'),opacity:0}],1500,{delay:i*90/speed,easing:'ease-in-out'})}
  await wait(1900);flash('#fef3c7',350,.8);shake(10);ring('#fbbf24',5,900,0,'73%');cnHit(d,'brightness(1.8) sepia(.6)');
  await wait(800);await title('فراشات ذهبية','فيذرين — الساحرة الكاتبة','#fbbf24',1400)},
 async dijima(x){const {W,H,p,flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(550);
  pop('ديجيما!','#c4b5fd','27%','16%',40,1200);
  for(let i=0;i<3;i++){const c=p('',{left:'27%',top:'50%',width:'150px',height:'150px',borderRadius:'50%',border:'3px solid #a78bfa',boxShadow:'0 0 26px #7c3aed,inset 0 0 26px #7c3aed',background:'repeating-conic-gradient(#7c3aed33 0 10deg,transparent 10deg 20deg)',zIndex:64,opacity:0});
   go(c,[{transform:C(i*30,0,`scale(.2) rotate(0)`),opacity:0},{transform:C(i*30,0,`scale(${1.1+i*.25}) rotate(${i%2?-180:180}deg)`),opacity:1}],900,{delay:i*150/speed})}
  await wait(1000);cnBeam(x,'#fff','#7c3aed',Math.min(H*.3,120),1000);await wait(420);
  const ex=p('',{left:'73%',top:'50%',width:'180px',height:'180px',borderRadius:'50%',background:'radial-gradient(circle,#fff,#a78bfa 40%,#4c1d95 70%,transparent)',zIndex:76,opacity:0});go(ex,[{transform:C(0,0,'scale(.3)'),opacity:1},{transform:C(0,0,'scale(3.5)'),opacity:0}],900);
  flash('#ede9fe',450,.9);shake(16);cnHit(d,'brightness(2.5) hue-rotate(250deg)');ring('#7c3aed',6,1000,0,'73%');
  await wait(1100);await title('ديجيما','أنوس — الملك المطلق','#a78bfa',1400)},
 async blackFlare(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const o=cnOrb(x,'#1e1b4b','34%',44);o.style.boxShadow='0 0 40px #ef4444,0 0 80px #000';
  go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(3)'),opacity:1}],900);dots(30,'#ef4444',[2,5],[900,1600]);
  pop('لهب أسود!','#fca5a5','27%','18%',34,1000);ring('#ef4444',3,900,200,'34%');await wait(1000);
  await go(o,[{transform:C(0,0,'scale(3)'),opacity:1},{transform:C(W*.38,0,'scale(3.4)'),opacity:1}],450,{easing:'ease-in'});rm(o);
  for(let i=0;i<8;i++){const f=p('🔥',{left:rnd(66,80)+'%',top:rnd(40,68)+'%',fontSize:rnd(36,70)+'px',filter:'brightness(.2) drop-shadow(0 0 14px #ef4444)',zIndex:74,opacity:0});go(f,[{transform:C(0,20,'scale(.3)'),opacity:0},{transform:C(0,-20,'scale(1.2)'),opacity:1,offset:.4},{transform:C(0,-60,'scale(.8)'),opacity:0}],1000,{delay:i*70/speed})}
  flash('#450a0a',350,.8);shake(12);ring('#dc2626',5,900,0,'73%');cnHit(d,'brightness(.4) sepia(1) saturate(4)');
  await wait(1000);await title('بلاك فلير','ريمورو — سيّد التمبست','#ef4444',1400)}
});

Object.assign(SCENE_OF,{
 'melio:لهب الغضب':'hellblaze','melio:اللهب الأخير':'infernoFinal','melio:وضع الغضب':'demonMode',
 'lucius:إيقاف الزمن':'timeStop','lucius:فناء الزمن':'timeAnnihilate','lucius:منطقة المانا':'manaZone',
 'ainz:وورلد دزاستر':'worldDisaster','ainz:إيقاف الزمن':'ainzTimeStop','ainz:استدعاء الجنود الموتى':'deadLegion',
 'acno:زئير الإبادة':'annihRoar','acno:نفس الفناء':'destroyBreath','acno:هالة الرعب':'terrorAura',
 'hago:طريق الصلصال':'clayPath','hago:ختم القمر':'moonSeal','hago:وضع الحكيم':'sageMode'
});
const cnClock=(x,c,left,sz,z=70)=>x.p('🕰️',{left,top:'50%',fontSize:sz+'px',filter:`drop-shadow(0 0 24px ${c})`,zIndex:z,opacity:0});
const cnFreeze=(x,c)=>{const f=x.p('',{inset:0,backdropFilter:'grayscale(1) contrast(1.2)',WebkitBackdropFilter:'grayscale(1) contrast(1.2)',background:c+'22',zIndex:59,opacity:0});return go(f,[{opacity:0},{opacity:1}],500)};
Object.assign(SCENES,{
 /* ---------- ميليوداس ---------- */
 async hellblaze(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const o=cnOrb(x,'#ef4444','34%',44);go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(3)'),opacity:1}],900);
  dots(30,'#f97316',[2,5],[900,1600]);pop('لهب الغضب!','#fdba74','27%','16%',36,1000);ring('#f97316',3,900,200,'34%');await wait(1000);
  await go(o,[{transform:C(0,0,'scale(3)'),opacity:1},{transform:C(W*.38,0,'scale(3.4)'),opacity:1}],450,{easing:'ease-in'});rm(o);
  const pl=p('',{left:'73%',bottom:'0',width:'120px',height:H*1.05+'px',background:'linear-gradient(0deg,#fde047,#f97316 30%,#dc2626 65%,#450a0a)',boxShadow:'0 0 50px #ef4444',borderRadius:'60px 60px 0 0',zIndex:74,opacity:0,transformOrigin:'50% 100%'});
  go(pl,[{transform:'translateX(-50%) scaleY(0)',opacity:1},{transform:'translateX(-50%) scaleY(1)',opacity:1,offset:.3},{transform:'translateX(-50%) scaleY(1)',opacity:0}],1100);
  flash('#fff7ed',320,.9);shake(14);ring('#ef4444',6,900,0,'73%');cnHit(d,'brightness(2) sepia(1) saturate(5)');
  await wait(1000);await title('لهب الغضب','ميليوداس — قائد الخطايا','#f97316',1400)},
 async infernoFinal(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const vg=p('',{inset:0,background:'radial-gradient(circle at 73% 60%,#7f1d1d99,#000d 85%)',zIndex:58,opacity:0});go(vg,[{opacity:0},{opacity:1}],900);
  pop('اللهب يبتلعك.','#fca5a5','50%','16%',34,1500);dots(40,'#f97316',[2,6],[1200,2400]);ring('#dc2626',6,1100);
  await wait(700);
  for(let i=0;i<16;i++){const f=p('🔥',{left:rnd(45,100)+'%',top:'100%',fontSize:rnd(50,110)+'px',filter:'drop-shadow(0 0 16px #ef4444)',zIndex:72,opacity:0});go(f,[{transform:C(0,0,'scale(.4)'),opacity:0},{transform:C(0,-H*rnd(.35,.7),'scale(1.2)'),opacity:1,offset:.5},{transform:C(0,-H*rnd(.5,.85),'scale(.8)'),opacity:0}],1300,{delay:i*70/speed})}
  go(d,[{filter:'none',opacity:1},{filter:'sepia(1) saturate(6) brightness(.5)',opacity:1,offset:.6},{filter:'brightness(0)',opacity:0}],1500);
  await wait(1100);flash('#450a0a',450,.9);shake(18);await wait(700);await title('اللهب الأخير','ميليوداس — قائد الخطايا','#ef4444',1500)},
 async demonMode(x){const {port,p,flash,ring,title,pop,rays,dots}=x;const a=port();cnApp(a);await wait(500);
  rays('#450a0a',1800);dots(50,'#7f1d1d',[2,6],[1500,3000]);
  go(a,[{filter:'none'},{filter:'brightness(.6) contrast(1.4) drop-shadow(0 0 28px #dc2626)'}],900);
  for(let i=0;i<5;i++){const m=p('',{left:'50%',top:'50%',width:'6px',height:(40+i*14)+'px',background:'linear-gradient(#000,#7f1d1d)',zIndex:66,opacity:0});
   go(m,[{transform:C((i-2)*22,-60,'scaleY(0)'),opacity:1},{transform:C((i-2)*22,-60,'scaleY(1)'),opacity:1}],700,{delay:i*100/speed})}
  [-1,1].forEach(sg=>{const e=p('',{left:`calc(50% + ${sg*26}px)`,top:'38%',width:'28px',height:'10px',background:'#ef4444',borderRadius:'60%',boxShadow:'0 0 20px #ef4444',zIndex:68,opacity:0});go(e,[{transform:C(0,0,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1.2)'),opacity:1}],700,{delay:500/speed})});
  ring('#dc2626',4,900);ring('#000',6,1100,250);await wait(800);pop('سأريك جانبي المظلم.','#fca5a5','50%','16%',30,1400);flash('#7f1d1d',450,.7);shake(10);
  await wait(1300);await title('وضع الغضب','ميليوداس — قائد الخطايا','#ef4444',1500)},
 /* ---------- لوسيوس ---------- */
 async timeStop(x){const {p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(500);
  const c=cnClock(x,'#f43f5e','50%',Math.min(x.H*.5,200));go(c,[{transform:C(0,0,'scale(.3) rotate(-90deg)'),opacity:0},{transform:C(0,0,'scale(1.1) rotate(0)'),opacity:1}],700);
  pop('ثانية واحدة تكفي.','#fda4af','50%','14%',30,1500);ring('#f43f5e',4,900);await wait(900);
  cnFreeze(x,'#f43f5e');flash('#fff',350,.9);go(c,[{transform:C(0,0,'scale(1.1) rotate(0)'),opacity:1},{transform:C(0,0,'scale(1.1) rotate(720deg)'),opacity:1},{transform:C(0,0,'scale(1.1) rotate(720deg)'),opacity:1}],900);
  go(d,[{filter:'none'},{filter:'grayscale(1) brightness(.7)'}],500);await wait(1100);
  for(let i=0;i<5;i++)x.slashLine('#f43f5e',-30+i*15,200,250,i*90,4,'73%','50%');shake(10);await wait(700);
  await title('إيقاف الزمن','لوسيوس — ملك الزمن','#f43f5e',1500)},
 async timeAnnihilate(x){const {W,H,p,flash,ring,title,pop,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  const c=cnClock(x,'#f43f5e','73%',Math.min(H*.6,240),68);go(c,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],600);
  pop('الزمن... يُلغى.','#fda4af','50%','14%',32,1500);await wait(800);
  go(c,[{transform:C(0,0,'scale(1) rotate(0)')},{transform:C(0,0,'scale(1) rotate(-1080deg)')}],1000);
  for(let i=0;i<4;i++)ring('#f43f5e',3+i,900,i*200,'73%');await wait(1000);
  for(let i=0;i<8;i++)slashLine('#fff',i*22-80,W*.3,260,i*60,3,'73%','50%');
  go(c,[{opacity:1,transform:C(0,0,'scale(1)')},{opacity:0,transform:C(0,0,'scale(1.8)')}],500);flash('#fff1f2',400,.9);shake(16);
  go(d,[{filter:'none',opacity:1,transform:C(0,0,'scale(1)')},{filter:'grayscale(1) brightness(1.8)',opacity:.6,offset:.5},{filter:'brightness(3)',opacity:0,transform:C(0,0,'scale(1.3)')}],1100);
  await wait(1000);await title('فناء الزمن','لوسيوس — ملك الزمن','#f43f5e',1500)},
 async manaZone(x){const {H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('منطقتي.','#fda4af','50%','16%',32,1100);
  const mc=p('',{left:'73%',top:'72%',width:'240px',height:'80px',borderRadius:'50%',border:'3px solid #fb7185',boxShadow:'0 0 30px #f43f5e,inset 0 0 30px #f43f5e',background:'repeating-conic-gradient(#f43f5e33 0 10deg,transparent 10deg 20deg)',zIndex:60,opacity:0});
  go(mc,[{transform:C(0,0,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],700);dots(30,'#fda4af',[2,5],[1000,1800]);await wait(800);
  for(let i=0;i<7;i++){const b=p('',{left:`calc(73% + ${(i-3)*30}px)`,top:'0',width:'14px',height:'74%',background:'linear-gradient(#fff,#fb7185 40%,#f43f5e)',boxShadow:'0 0 20px #f43f5e',borderRadius:'8px',zIndex:70,opacity:0,transformOrigin:'50% 0'});
   go(b,[{transform:C(0,0,'scaleY(0)'),opacity:1},{transform:C(0,0,'scaleY(1)'),opacity:1,offset:.3},{transform:C(0,0,'scaleY(1)'),opacity:0}],900,{delay:i*80/speed})}
  await wait(500);flash('#ffe4e6',350,.8);shake(12);ring('#f43f5e',5,900,0,'73%','72%');cnHit(d,'brightness(2) hue-rotate(-30deg)');
  await wait(900);await title('منطقة المانا','لوسيوس — ملك الزمن','#fb7185',1400)},
 /* ---------- آينز ---------- */
 async worldDisaster(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const bg=p('',{inset:0,background:'#000',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.75}],800);
  const S=Math.min(W,H)*1.1,mc=p('',{left:'50%',top:'50%',width:S+'px',height:S+'px',borderRadius:'50%',border:'4px solid #fbbf24',boxShadow:'0 0 50px #7c3aed,inset 0 0 50px #7c3aed',background:'repeating-conic-gradient(#7c3aed44 0 8deg,#fbbf2422 8deg 16deg)',zIndex:64,opacity:0});
  go(mc,[{transform:C(0,0,'scale(.1) rotate(0)'),opacity:0},{transform:C(0,0,'scale(1) rotate(360deg)'),opacity:1}],1500);
  const sk=p('💀',{left:'50%',top:'50%',fontSize:S*.4+'px',filter:'drop-shadow(0 0 30px #fbbf24)',zIndex:66,opacity:0});go(sk,[{transform:C(0,0,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],1200,{delay:400/speed});
  pop('وورلد دزاستر.','#fde68a','50%','12%',34,1600);dots(40,'#a78bfa',[2,5],[1200,2400]);await wait(1700);
  flash('#fff',500,1);shake(24);ring('#fbbf24',8,1200);rm(sk);
  go(d,[{filter:'none',opacity:1},{filter:'brightness(0) drop-shadow(0 0 14px #a78bfa)',opacity:.6,offset:.5},{opacity:0}],1100);
  await wait(1100);await title('وورلد دزاستر','آينز — الملك الساحر','#fbbf24',1500)},
 async ainzTimeStop(x){const {H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(500);
  const hg=p('⏳',{left:'50%',top:'50%',fontSize:Math.min(H*.55,210)+'px',filter:'drop-shadow(0 0 24px #a78bfa)',zIndex:70,opacity:0});
  go(hg,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1) rotate(0)'),opacity:1,offset:.4},{transform:C(0,0,'scale(1) rotate(180deg)'),opacity:1}],1400);
  pop('زمنك انتهى.','#ddd6fe','50%','14%',32,1500);ring('#a78bfa',4,900);dots(30,'#fde68a',[2,5],[1200,2200]);await wait(1300);
  cnFreeze(x,'#a78bfa');flash('#ede9fe',350,.9);go(d,[{filter:'none'},{filter:'grayscale(1) brightness(.7) drop-shadow(0 0 14px #60a5fa)'}],500);await wait(1000);
  for(let i=0;i<5;i++)x.slashLine('#a78bfa',-25+i*12,220,250,i*90,4,'73%','50%');shake(10);
  await wait(700);await title('إيقاف الزمن','آينز — الملك الساحر','#a78bfa',1500)},
 async deadLegion(x){const {W,H,p,flash,ring,title,pop,dots,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  pop('انهضوا أيها الموتى.','#bbf7d0','27%','16%',30,1300);ring('#22c55e',3,900,0,'38%','80%');dots(30,'#86efac',[2,5],[1000,2000]);
  for(let i=0;i<8;i++){const lx=30+i*5,tx=(73-lx)/100*W,ty=-(i%3)*14,e=p('💀',{left:lx+'%',top:'72%',fontSize:Math.min(H*.16,56)+'px',filter:'drop-shadow(0 0 8px #22c55e) drop-shadow(0 0 14px #16a34a)',zIndex:66,opacity:0});
   go(e,[{transform:C(0,50,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1,offset:.3},{transform:C(0,0,'scale(1)'),opacity:1,offset:.55},{transform:C(tx,ty,'scale(1.2)'),opacity:1,offset:.9},{transform:C(tx,ty,'scale(1.2)'),opacity:0}],1700,{delay:i*80/speed,easing:'ease-in'})}
  await wait(1500);for(let i=0;i<4;i++)slashLine('#86efac',-30+i*20,200,320,i*110,5,'73%','50%');
  flash('#dcfce7',330,.7);shake(12);cnHit(d,'brightness(.6) hue-rotate(80deg)');ring('#22c55e',5,900,0,'73%');
  await wait(900);await title('استدعاء الجنود الموتى','آينز — الملك الساحر','#86efac',1500)},
 /* ---------- أكنولوجيا ---------- */
 async annihRoar(x){const {W,H,p,flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(550);
  const dr=p('🐉',{left:'27%',top:'50%',fontSize:Math.min(H*.5,190)+'px',filter:'brightness(.35) drop-shadow(0 0 26px #38bdf8)',zIndex:76,opacity:0});
  go(dr,[{transform:C(0,0,'scale(.4)'),opacity:0},{transform:C(0,0,'scale(1.2)'),opacity:1}],700);
  pop('زئير الإبادة!','#7dd3fc','50%','14%',38,1300);for(let i=0;i<5;i++)ring('#38bdf8',3+i*1.2,1000,300+i*170,'33%');shake(10);await wait(1000);
  cnBeam(x,'#e0f2fe','#0ea5e9',Math.min(H*.32,130),1000);await wait(400);
  flash('#e0f2fe',420,.9);shake(20);ring('#38bdf8',7,1100,0,'73%');
  go(d,[{transform:C(0,0,'scale(1)')},{transform:C(W*.2,-20,'scale(.7) rotate(25deg)'),offset:.5},{transform:C(0,0,'scale(1)')}],1100);
  await wait(1100);await title('زئير الإبادة','أكنولوجيا — تنين الفناء','#38bdf8',1500)},
 async destroyBreath(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const bg=p('',{inset:0,background:'#0b0000',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.8}],800);
  const dr=p('🐉',{left:'27%',top:'42%',fontSize:Math.min(H*.5,190)+'px',filter:'brightness(.3) drop-shadow(0 0 30px #ef4444)',zIndex:76,opacity:0});go(dr,[{transform:C(0,0,'scale(.4)'),opacity:0},{transform:C(0,0,'scale(1.3)'),opacity:1}],800);
  pop('احترق مع العالم.','#fca5a5','50%','12%',34,1600);dots(40,'#f97316',[2,6],[1200,2400]);await wait(1000);
  const fl=p('',{left:0,bottom:0,width:'100%',height:'110%',background:'linear-gradient(0deg,#fde047,#f97316 25%,#dc2626 55%,#450a0acc 85%,transparent)',zIndex:72,opacity:0});
  go(fl,[{transform:'translateY(100%)',opacity:1},{transform:'translateY(0)',opacity:1,offset:.6},{transform:'translateY(0)',opacity:.85}],1400,{easing:'ease-in'});shake(18);
  await wait(1200);go(d,[{filter:'none',opacity:1},{filter:'brightness(0)',opacity:0}],900);flash('#fff7ed',500,1);shake(24);ring('#ef4444',8,1200);
  await wait(1000);await title('نفس الفناء','أكنولوجيا — تنين الفناء','#ef4444',1500)},
 async terrorAura(x){const {p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const vg=p('',{inset:0,background:'radial-gradient(circle,transparent 20%,#020617ee 90%)',zIndex:59,opacity:0});go(vg,[{opacity:0},{opacity:1}],900);
  const e=p('👁️',{left:'27%',top:'50%',fontSize:'90px',filter:'drop-shadow(0 0 24px #ef4444) hue-rotate(-40deg)',zIndex:80,opacity:0});go(e,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1.4)'),opacity:1}],800);
  pop('ارتجف.','#94a3b8','50%','16%',40,1500);for(let i=0;i<5;i++)ring(i%2?'#0f172a':'#475569',3+i,1000,i*200,'27%');dots(30,'#475569',[2,5],[1200,2200]);await wait(900);
  const tr=[];for(let i=0;i<10;i++)tr.push({transform:C(i%2?5:-5,i%3?2:-2,'scale(.95)')});go(d,[...tr,{transform:C(0,0,'scale(.9)')}],1100,{easing:'linear'});go(d,[{filter:'none'},{filter:'grayscale(1) brightness(.6)'}],1100);
  shake(8);await wait(1200);flash('#020617',350,.7);await title('هالة الرعب','أكنولوجيا — تنين الفناء','#94a3b8',1500)},
 /* ---------- هاغوروموا ---------- */
 async clayPath(x){const {W,p,flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(550);
  pop('طريق الصلصال.','#e2e8f0','27%','16%',32,1200);
  for(let i=0;i<5;i++){const b=p('',{left:'27%',top:'50%',width:'34px',height:'34px',borderRadius:'50%',background:'radial-gradient(circle,#475569,#000 70%)',boxShadow:'0 0 18px #e2e8f0',border:'2px solid #e2e8f0',zIndex:70,opacity:0});
   const ang=i/5*Math.PI*2,rx=70,ry=60;
   go(b,[{transform:C(0,0,'scale(.2)'),opacity:0},{transform:C(Math.cos(ang)*rx,Math.sin(ang)*ry-20,'scale(1)'),opacity:1,offset:.35},{transform:C(Math.cos(ang)*rx,Math.sin(ang)*ry-20,'scale(1)'),opacity:1,offset:.55},{transform:C(W*.46,(i-2)*14,'scale(1.1)'),opacity:1,offset:.9},{transform:C(W*.46,(i-2)*14,'scale(.3)'),opacity:0}],1700,{delay:i*110/speed,easing:'ease-in-out'})}
  ring('#e2e8f0',3,900,0,'27%');await wait(1900);flash('#f8fafc',350,.8);shake(12);ring('#94a3b8',5,900,0,'73%');cnHit(d,'brightness(1.8) grayscale(.6)');
  await wait(900);await title('طريق الصلصال','هاغوروموا — حكيم الطرق الستة','#e2e8f0',1500)},
 async moonSeal(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const R=Math.min(W,H)*.45,mn=p('',{left:'50%',top:'20%',width:R+'px',height:R+'px',borderRadius:'50%',background:'radial-gradient(circle at 40% 40%,#fff,#e0e7ff 50%,#a5b4fc)',boxShadow:'0 0 80px #c7d2fe,0 0 160px #818cf8',zIndex:62,opacity:0});
  go(mn,[{transform:C(0,-60,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],1100);dots(40,'#e0e7ff',[2,5],[1200,2400]);
  pop('نمْ في القمر.','#e0e7ff','50%','78%',34,1600);await wait(1100);
  const bm=p('',{left:'73%',top:'0',width:'110px',height:'75%',background:'linear-gradient(#fff,#c7d2fe88 60%,transparent)',zIndex:60,opacity:0,transformOrigin:'50% 0'});
  go(bm,[{transform:'translateX(-50%) scaleY(0)',opacity:1},{transform:'translateX(-50%) scaleY(1)',opacity:1,offset:.3},{transform:'translateX(-50%) scaleY(1)',opacity:.8}],1500);
  go(d,[{filter:'none'},{filter:'grayscale(1) brightness(1.3) drop-shadow(0 0 16px #c7d2fe)'}],1000);
  for(let i=0;i<4;i++){const z=p('Zz',{left:'73%',top:'40%',fontSize:(22+i*6)+'px',fontWeight:900,color:'#e0e7ff',textShadow:'0 0 10px #818cf8',zIndex:80,opacity:0});go(z,[{transform:C(0,0,'scale(.4)'),opacity:0},{transform:C(20+i*10,-30-i*22,'scale(1)'),opacity:1,offset:.5},{transform:C(30+i*10,-60-i*26,'scale(1)'),opacity:0}],1200,{delay:(500+i*250)/speed})}
  ring('#c7d2fe',5,1000,0,'73%');await wait(1500);flash('#eef2ff',400,.7);await title('ختم القمر','هاغوروموا — حكيم الطرق الستة','#c7d2fe',1500)},
 async sageMode(x){const {port,flash,ring,title,pop,rays,dots,orbit}=x;const a=port();cnApp(a);await wait(500);
  rays('#e2e8f0',1800);dots(50,'#f8fafc',[2,6],[1500,3000]);
  go(a,[{filter:'none'},{filter:'brightness(1.4) drop-shadow(0 0 30px #fff)'}],900);
  orbit('⚪',6,110,2200,{size:30,filter:'drop-shadow(0 0 12px #fff)',turns:1,z:66});
  ring('#f8fafc',4,900);ring('#fbbf24',6,1100,250);await wait(900);pop('طاقة الطبيعة.','#f1f5f9','50%','16%',34,1400);flash('#fff',450,.7);
  await wait(1300);await title('وضع الحكيم','هاغوروموا — حكيم الطرق الستة','#f1f5f9',1500)}
});

Object.assign(SCENE_OF,{
 'jiren:حرارة الإرادة':'willHeat','jiren:الانفجار الأحمر':'redBlast','jiren:نظرة الضغط':'pressGaze',
 'blast:الضربة الكونية':'cosmicRift','blast:بوابة الأبعاد':'dimGate','blast:قفزة الأبعاد':'dimJump',
 'garou:قبضة المجرة':'galaxyFist','garou:نسخ القوى':'copyPower','garou:ضربة كونية':'cosmicBlow',
 'broly:غضب أسطوري':'legendRage','broly:إيريزر كانون':'eraserCannon','broly:ضربة الإبادة':'annihStrike',
 'muzan:سياط اللحم':'fleshWhips','muzan:تحوّل الوحش':'beastForm','muzan:تجدد مطلق':'absRegen'
});
Object.assign(SCENES,{
 /* ---------- جيرين ---------- */
 async willHeat(x){const {H,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const o=cnOrb(x,'#ef4444','30%',44);go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(3)'),opacity:1}],900);
  dots(30,'#fca5a5',[2,5],[900,1600]);pop('حرارة الإرادة!','#fca5a5','27%','16%',36,1000);ring('#dc2626',3,900,200,'30%');await wait(950);
  cnBeam(x,'#fff','#dc2626',Math.min(H*.34,140),1100);await wait(420);
  flash('#fee2e2',400,.9);shake(18);ring('#ef4444',7,1000,0,'73%');cnHit(d,'brightness(2) sepia(1) saturate(5)');
  await wait(1100);await title('حرارة الإرادة','جيرين — الرمادي','#ef4444',1500)},
 async redBlast(x){const {W,H,p,flash,ring,title,pop,dots,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  const R=Math.min(W,H)*.55,sp=p('',{left:'50%',top:'-12%',width:R+'px',height:R+'px',borderRadius:'50%',background:'radial-gradient(circle,#fff 0 20%,#ef4444 45%,#7f1d1d 75%,#000)',boxShadow:'0 0 90px #dc2626,0 0 180px #7f1d1d',zIndex:66,opacity:0});
  go(sp,[{transform:C(0,0,'scale(.2)'),opacity:0},{transform:C(0,H*.3,'scale(1)'),opacity:1}],1300);pop('كل شيء... احترق.','#fca5a5','50%','80%',32,1600);dots(40,'#ef4444',[2,6],[1200,2400]);await wait(1400);
  await go(sp,[{transform:C(0,H*.3,'scale(1)'),opacity:1},{transform:C(W*.23,H*.62,'scale(1.3)'),opacity:1}],500,{easing:'ease-in'});
  flash('#fff',500,1);shake(24);ring('#dc2626',9,1300,0,'73%');ring('#fff',6,1000,100,'73%');
  for(let i=0;i<6;i++)slashLine('#ef4444',rnd(-30,30),W*.5,500,i*70,4,'73%',(60+i*5)+'%');
  go(sp,[{opacity:1,transform:C(W*.23,H*.62,'scale(1.3)')},{opacity:0,transform:C(W*.23,H*.62,'scale(4)')}],1000);
  go(d,[{filter:'none'},{filter:'brightness(0) drop-shadow(0 0 16px #ef4444)'}],900);await wait(1200);await title('الانفجار الأحمر','جيرين — الرمادي','#ef4444',1600)},
 async pressGaze(x){const {p,flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(550);
  [-1,1].forEach(sg=>{const e=p('',{left:`calc(27% + ${sg*24}px)`,top:'38%',width:'30px',height:'8px',background:'#ef4444',borderRadius:'60%',boxShadow:'0 0 20px #ef4444',zIndex:70,opacity:0});go(e,[{transform:C(0,0,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1.3)'),opacity:1}],600)});
  pop('ثبّتك.','#fca5a5','50%','16%',38,1300);await wait(700);
  for(let i=0;i<5;i++){const r=p('',{left:'73%',top:'50%',width:'200px',height:'200px',borderRadius:'50%',border:'4px solid #ef4444',boxShadow:'0 0 24px #dc2626',zIndex:68,opacity:0});go(r,[{transform:C(0,0,'scale(3.4)'),opacity:0},{transform:C(0,0,'scale(.6)'),opacity:1,offset:.7},{transform:C(0,0,'scale(.5)'),opacity:0}],900,{delay:i*220/speed,easing:'ease-in'})}
  go(d,[{transform:C(0,0,'scale(1)'),filter:'none'},{transform:C(0,28,'scale(.88,.8)'),filter:'grayscale(.8) brightness(.6)'}],1400);
  await wait(1500);shake(14);flash('#7f1d1d',350,.7);await title('نظرة الضغط','جيرين — الرمادي','#ef4444',1500)},
 /* ---------- بلاست ---------- */
 async cosmicRift(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('انتهى.','#e2e8f0','50%','16%',40,1200);const f=p('👊',{left:'27%',top:'50%',fontSize:'56px',filter:'drop-shadow(0 0 16px #fff)',zIndex:80,opacity:0});
  go(f,[{transform:C(0,0,'scale(.4)'),opacity:1},{transform:C(W*.46,0,'scale(1.4)'),opacity:1}],250,{easing:'ease-in'});await wait(300);
  const rf=p('',{left:'73%',top:'50%',width:'6px',height:H*1.3+'px',background:'#fff',boxShadow:'0 0 30px #fff',zIndex:80,opacity:0});
  go(rf,[{transform:C(0,0,'scaleX(1)'),opacity:1},{transform:C(0,0,'scaleX(14)'),opacity:1,offset:.5},{transform:C(0,0,'scaleX(40)'),opacity:1}],1200);
  const sp=p('',{left:'73%',top:'50%',width:'240px',height:H*1.3+'px',background:'radial-gradient(ellipse,#312e81,#020617 70%)',zIndex:79,opacity:0});go(sp,[{transform:C(0,0,'scaleX(0)'),opacity:1},{transform:C(0,0,'scaleX(1)'),opacity:1}],1000,{delay:300/speed});
  dots(60,'#e2e8f0',[1,4],[1000,2400],81);flash('#fff',450,.9);shake(24);go(d,[{opacity:1},{opacity:0}],900,{delay:500/speed});
  await wait(1500);await title('الضربة الكونية','بلاست — أقوى بطل','#e2e8f0',1500)},
 async dimGate(x){const {p,port,flash,ring,title,pop}=x;const a=port();cnApp(a);await wait(500);
  const mk=l=>p('',{left:l,top:'50%',width:'90px',height:'220px',borderRadius:'50%',border:'4px solid #a5b4fc',boxShadow:'0 0 30px #6366f1,inset 0 0 30px #6366f1',background:'radial-gradient(circle,#020617,#1e1b4b 70%)',zIndex:62,opacity:0});
  const g1=mk('32%'),g2=mk('68%');pop('مررتُ.','#c7d2fe','50%','16%',34,1200);
  go(g1,[{transform:C(0,0,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],600);go(g2,[{transform:C(0,0,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],600,{delay:300/speed});
  await wait(700);ring('#818cf8',3,900,0,'32%');
  await go(a,[{transform:C(0,0,'scale(1)'),opacity:1},{transform:C(-60,0,'scale(.1,1)'),opacity:0}],500,{easing:'ease-in'});
  ring('#818cf8',3,900,0,'68%');await go(a,[{transform:C(60,0,'scale(.1,1)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],500);
  flash('#e0e7ff',300,.6);await wait(500);await title('بوابة الأبعاد','بلاست — أقوى بطل','#a5b4fc',1400)},
 async dimJump(x){const {p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const pg=p('',{left:'73%',top:'50%',width:'120px',height:'260px',borderRadius:'50%',border:'4px solid #a5b4fc',boxShadow:'0 0 40px #6366f1,inset 0 0 40px #6366f1',background:'repeating-conic-gradient(#312e81 0 20deg,#020617 20deg 40deg)',zIndex:60,opacity:0});
  go(pg,[{transform:C(0,0,'scale(.2) rotate(0)'),opacity:0},{transform:C(0,0,'scale(1) rotate(360deg)'),opacity:1}],900);pop('ستُسحب.','#c7d2fe','50%','16%',36,1400);dots(30,'#a5b4fc',[2,5],[1000,2000]);await wait(950);
  await go(d,[{transform:C(0,0,'scale(1) rotate(0)'),opacity:1},{transform:C(0,0,'scale(.1,.5) rotate(720deg)'),opacity:0}],1000,{easing:'ease-in'});
  flash('#e0e7ff',350,.8);shake(10);ring('#6366f1',5,900,0,'73%');go(pg,[{opacity:1},{opacity:0}],600);await wait(800);await title('قفزة الأبعاد','بلاست — أقوى بطل','#a5b4fc',1400)},
 /* ---------- غارو ---------- */
 async galaxyFist(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const g=p('',{left:'30%',top:'50%',width:'120px',height:'120px',borderRadius:'50%',background:'radial-gradient(circle,#fff 0 10%,#c084fc 30%,#581c87 60%,#020617)',boxShadow:'0 0 40px #a855f7',zIndex:70,opacity:0});
  go(g,[{transform:C(0,0,'scale(.2) rotate(0)'),opacity:0},{transform:C(0,0,'scale(2.2) rotate(360deg)'),opacity:1}],1200);dots(60,'#e9d5ff',[1,4],[1000,2200]);
  pop('قبضة المجرة!','#e9d5ff','27%','16%',36,1300);ring('#a855f7',4,900,300,'30%');await wait(1250);
  const f=p('👊',{left:'30%',top:'50%',fontSize:'110px',filter:'drop-shadow(0 0 30px #a855f7)',zIndex:80,opacity:0});
  await go(f,[{transform:C(0,0,'scale(.6)'),opacity:1},{transform:C(W*.43,0,'scale(1.8)'),opacity:1}],450,{easing:'ease-in'});
  flash('#f3e8ff',420,1);shake(22);ring('#a855f7',8,1200,0,'73%');ring('#fff',5,900,100,'73%');go(g,[{opacity:1},{opacity:0}],400);rm(f);
  go(d,[{transform:C(0,0,'scale(1)'),opacity:1},{transform:C(W*.25,-30,'scale(.5) rotate(40deg)'),opacity:0}],1000);
  await wait(1200);await title('قبضة المجرة','غارو الكوني — وحش الأبطال','#c084fc',1500)},
 async copyPower(x){const {port,dport,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('قوتك صارت لي.','#e9d5ff','50%','16%',32,1500);dots(30,'#c084fc',[2,5],[1000,2000]);
  for(let i=0;i<4;i++){const g=dport({opacity:0,boxShadow:'0 0 20px #a855f7',zIndex:66});go(g,[{transform:C(0,0,'scale(.8)'),opacity:.8,left:'73%'},{transform:C(0,0,'scale(.6)'),opacity:.5,left:'27%'}],900,{delay:i*200/speed})}
  await wait(1100);ring('#a855f7',4,900,0,'27%');
  go(a,[{filter:'none',transform:C(0,0,'scale(1)')},{filter:'hue-rotate(60deg) brightness(1.6) saturate(2)',transform:C(0,0,'scale(1.12)'),offset:.4},{filter:'brightness(1.2) drop-shadow(0 0 26px #a855f7)',transform:C(0,0,'scale(1.08)')}],1100);
  flash('#f3e8ff',420,.7);await wait(1100);await title('نسخ القوى','غارو الكوني — وحش الأبطال','#c084fc',1500)},
 async cosmicBlow(x){const {W,H,p,flash,ring,title,pop,dots,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  pop('ضربة كونية!','#e9d5ff','27%','16%',34,1200);dots(40,'#e9d5ff',[1,4],[900,1800]);
  for(let i=0;i<4;i++)slashLine('#c084fc',-6+i*4,W*.5,400,i*100,5+i,'27%',(40+i*7)+'%');await wait(600);
  const o=cnOrb(x,'#a855f7','34%',50);go(o,[{transform:C(0,0,'scale(.4)'),opacity:0},{transform:C(0,0,'scale(2.6)'),opacity:1}],500);await wait(500);
  await go(o,[{transform:C(0,0,'scale(2.6)'),opacity:1},{transform:C(W*.38,0,'scale(3)'),opacity:1}],380,{easing:'ease-in'});rm(o);
  flash('#f3e8ff',350,.9);shake(16);ring('#a855f7',6,1000,0,'73%');cnHit(d,'brightness(2) hue-rotate(270deg)');
  await wait(1000);await title('ضربة كونية','غارو الكوني — وحش الأبطال','#c084fc',1400)},
 /* ---------- برولي ---------- */
 async legendRage(x){const {W,H,p,port,flash,ring,title,pop,rays,dots,bolts}=x;const [a,d]=cnPair(x);await wait(500);
  rays('#16a34a',1700);dots(50,'#4ade80',[2,6],[1500,3000]);bolts('#4ade80',5);
  const tr=[];for(let i=0;i<12;i++)tr.push({transform:C(i%2?4:-4,i%3?2:-2,'scale(1.06)'),filter:'brightness(1.4) saturate(2) hue-rotate(60deg) drop-shadow(0 0 24px #22c55e)'});go(a,tr,1200,{easing:'linear'});
  pop('غرااااه!','#bbf7d0','27%','16%',44,1200);ring('#22c55e',5,900);ring('#bbf7d0',7,1100,250);await wait(1300);
  await go(a,[{transform:C(0,0,'scale(1.06)')},{transform:C(W*.46,0,'scale(1.2)')}],350,{easing:'ease-in'});
  flash('#dcfce7',350,.9);shake(22);ring('#22c55e',7,1000,0,'73%');go(d,[{transform:C(0,0,'scale(1)')},{transform:C(W*.22,-40,'scale(.6) rotate(50deg)'),opacity:0}],900);
  go(a,[{transform:C(W*.46,0,'scale(1.2)')},{transform:C(0,0,'scale(1)')}],500,{delay:400/speed});
  await wait(1000);await title('غضب أسطوري','برولي — السايان الأسطوري','#4ade80',1500)},
 async eraserCannon(x){const {H,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const o=cnOrb(x,'#22c55e','31%',40);go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(3.2)'),opacity:1}],900);
  dots(30,'#86efac',[2,5],[900,1600]);pop('إيريزر كانون!','#bbf7d0','27%','16%',34,1000);ring('#4ade80',3,900,200,'31%');await wait(950);
  cnBeam(x,'#f0fdf4','#16a34a',Math.min(H*.38,160),1200);await wait(420);
  flash('#dcfce7',420,.9);shake(20);ring('#22c55e',7,1100,0,'73%');cnHit(d,'brightness(2) hue-rotate(80deg)');
  await wait(1200);await title('إيريزر كانون','برولي — السايان الأسطوري','#4ade80',1500)},
 async annihStrike(x){const {W,H,p,flash,ring,title,pop,dots,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  pop('مت!','#bbf7d0','50%','16%',50,1300);dots(40,'#4ade80',[2,6],[1200,2400]);
  const f=p('👊',{left:'73%',top:'50%',fontSize:Math.min(H*.9,360)+'px',filter:'drop-shadow(0 0 40px #22c55e) hue-rotate(80deg)',zIndex:80,opacity:0});
  await go(f,[{transform:C(-W*.4,0,'scale(.4)'),opacity:0},{transform:C(-W*.15,0,'scale(.9)'),opacity:1,offset:.5},{transform:C(0,0,'scale(1.2)'),opacity:1}],800,{easing:'ease-in'});
  flash('#f0fdf4',420,1);shake(28);ring('#22c55e',9,1300,0,'73%');ring('#fff',6,900,100,'73%');
  for(let i=0;i<8;i++)slashLine('#4ade80',i*45,260,500,0,4,'73%','50%');
  for(let i=0;i<14;i++){const r=p('🪨',{left:'73%',top:'50%',fontSize:rnd(18,36)+'px',zIndex:78,opacity:0});go(r,[{transform:C(0,0),opacity:1},{transform:C(rnd(-W*.3,W*.2),rnd(-H*.4,H*.4),`rotate(${rnd(-360,360)}deg)`),opacity:0}],1100)}
  go(d,[{opacity:1,transform:C(0,0,'scale(1)')},{opacity:1,transform:C(0,0,'scale(1.3,.15)'),offset:.2},{opacity:0,transform:C(0,0,'scale(1.3,.15)')}],1200);go(f,[{opacity:1},{opacity:0}],900);
  await wait(1200);await title('ضربة الإبادة','برولي — السايان الأسطوري','#4ade80',1500)},
 /* ---------- موزان ---------- */
 async fleshWhips(x){const {W,p,flash,ring,title,pop,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  pop('سياطي لا تنتهي.','#fda4af','27%','16%',30,1300);
  for(let i=0;i<6;i++){const w=p('',{left:'30%',top:(36+i*5)+'%',width:W*.5+'px',height:'8px',borderRadius:'8px',transformOrigin:'0 50%',background:'linear-gradient(90deg,#9f1239,#f43f5e,#fecdd3)',boxShadow:'0 0 14px #be123c',zIndex:72,opacity:0});
   go(w,[{transform:C(0,0,'scaleX(0) rotate(-12deg)').replace(/translate\([^)]*\)\s*translate/,'translate'),opacity:1},{transform:C(0,0,'scaleX(1) rotate(8deg)'),opacity:1,offset:.5},{transform:C(0,0,'scaleX(1) rotate(-4deg)'),opacity:0}],900,{delay:(600+i*90)/speed})}
  await wait(1300);for(let i=0;i<5;i++)slashLine('#fecdd3',-20+i*10,200,280,i*80,4,'73%','50%');flash('#4c0519',350,.7);shake(14);cnHit(d,'brightness(.6) sepia(1) hue-rotate(-30deg) saturate(4)');ring('#be123c',5,900,0,'73%');
  await wait(900);await title('سياط اللحم','موزان — ملك المفترسين','#fb7185',1500)},
 async beastForm(x){const {p,port,flash,ring,title,pop,rays,dots}=x;const a=port();cnApp(a);await wait(500);
  rays('#4c0519',1800);dots(40,'#be123c',[2,6],[1500,3000]);
  go(a,[{filter:'none',transform:C(0,0,'scale(1)')},{filter:'sepia(1) hue-rotate(-30deg) saturate(4) brightness(.7) drop-shadow(0 0 26px #be123c)',transform:C(0,0,'scale(1.3,1.15)')}],1200);
  for(let i=0;i<6;i++){const e=p('👁️',{left:(38+(i%3)*12)+'%',top:(34+Math.floor(i/3)*20)+'%',fontSize:'26px',filter:'drop-shadow(0 0 10px #f43f5e) hue-rotate(-30deg)',zIndex:70,opacity:0});go(e,[{transform:C(0,0,'scale(.1)'),opacity:0},{transform:C(0,0,'scale(1.2)'),opacity:1}],500,{delay:(400+i*140)/speed})}
  ring('#be123c',4,900);ring('#fecdd3',6,1100,250);await wait(1100);pop('هذا شكلي الحقيقي.','#fda4af','50%','14%',30,1400);flash('#4c0519',450,.8);shake(12);
  await wait(1300);await title('تحوّل الوحش','موزان — ملك المفترسين','#fb7185',1500)},
 async absRegen(x){const {port,p,flash,ring,title,pop,dots}=x;const a=port();cnApp(a);await wait(500);
  pop('أنا كامل.','#fda4af','50%','14%',34,1500);
  const pcs=[];for(let i=0;i<4;i++)pcs.push(port({opacity:0,zIndex:61,clipPath:`inset(0 ${100-(i+1)*25}% 0 ${i*25}%)`,filter:'sepia(1) saturate(4) hue-rotate(-30deg)'}));
  pcs.forEach((g,i)=>go(g,[{transform:C(0,0),opacity:1},{transform:C((i-1.5)*60,(i%2?1:-1)*24,`rotate(${(i-1.5)*8}deg)`),opacity:1,offset:.45},{transform:C((i-1.5)*60,(i%2?1:-1)*24,`rotate(${(i-1.5)*8}deg)`),opacity:1,offset:.6},{transform:C(0,0),opacity:1}],1500));
  go(a,[{opacity:1},{opacity:0,offset:.05},{opacity:0,offset:.9},{opacity:1}],1500);
  await wait(1500);for(let i=0;i<8;i++){const c=p('✚',{left:rnd(35,65)+'%',top:'60%',fontSize:'30px',color:'#fda4af',textShadow:'0 0 10px #f43f5e',zIndex:80,opacity:0});go(c,[{transform:C(0,0),opacity:1},{transform:C(0,-120),opacity:0}],1000,{delay:i*70/speed})}
  ring('#f43f5e',4,900);flash('#fff1f2',350,.7);dots(30,'#fda4af',[2,5],[900,1600]);await wait(1000);await title('تجدد مطلق','موزان — ملك المفترسين','#fb7185',1500)}
});

Object.assign(SCENE_OF,{
 'wbeard:غورا غورا — زلزال':'guraGura','wbeard:شقّ الفضاء':'spaceBreak','wbeard:عزيمة الأب':'fatherWill',
 'roger:سيف إيس':'aceBlade','roger:الرحيل الأعظم':'divineDep','roger:هاكي التسليح الأسود':'armHaki',
 'rocks:طموح الحاكم':'rulerAmbition','rocks:سحق السفن':'shipCrush','rocks:إرادة الفوضى':'chaosWill',
 'zeref:إنكانتوس':'ankhseram','zeref:موجة الظلام':'darkWave','zeref:خلود':'immortal',
 'merlin:ميتيور لانهائي':'infMeteor','merlin:سحر الفناء':'annihMagic','merlin:عالم منعكس':'reflectWorld'
});
Object.assign(SCENES,{
 /* ---------- وايتبيرد ---------- */
 async guraGura(x){const {W,H,p,flash,ring,title,pop,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  pop('غورا غورا!','#e0f2fe','27%','16%',38,1200);const f=p('👊',{left:'27%',top:'50%',fontSize:'90px',filter:'drop-shadow(0 0 20px #bae6fd)',zIndex:80,opacity:0});
  go(f,[{transform:C(0,0,'scale(.5)'),opacity:1},{transform:C(W*.2,0,'scale(1.6)'),opacity:1}],400,{easing:'ease-in'});await wait(420);
  for(let i=0;i<10;i++)slashLine('#e0f2fe',i*36,Math.min(W,H)*.45,700,i*30,3,'50%','50%');
  flash('#fff',350,.9);shake(24);for(let i=0;i<4;i++)ring('#bae6fd',3+i*1.5,1000,i*160,'50%');
  go(d,[{transform:C(0,0,'scale(1)')},{transform:C(8,0,'scale(1.05)')},{transform:C(-8,0,'scale(.95)')},{transform:C(6,0,'scale(1)')},{transform:C(0,0,'scale(1)')}],700);rm(f);
  await wait(1000);await title('غورا غورا — زلزال','وايتبيرد — أقوى رجل','#bae6fd',1500)},
 async spaceBreak(x){const {W,H,p,flash,ring,title,pop,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  pop('سأحطّم العالم.','#e0f2fe','50%','12%',34,1500);
  const bg=p('',{inset:0,background:'#000',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.7}],700);
  for(let i=0;i<14;i++)slashLine('#fff',rnd(0,180),W*rnd(.4,.9),500,i*60,rnd(2,5),rnd(20,80)+'%',rnd(15,85)+'%');
  await wait(900);flash('#fff',450,1);shake(28);ring('#bae6fd',9,1300);
  for(let i=0;i<16;i++){const s=p('',{left:rnd(10,90)+'%',top:rnd(10,90)+'%',width:rnd(30,80)+'px',height:rnd(30,80)+'px',background:'linear-gradient(135deg,#fff,#7dd3fc88)',clipPath:'polygon(0 0,100% 20%,60% 100%)',zIndex:80,opacity:0});go(s,[{transform:C(0,0),opacity:1},{transform:C(rnd(-60,60),H*.5,`rotate(${rnd(-200,200)}deg)`),opacity:0}],1200,{delay:i*40/speed,easing:'ease-in'})}
  go(d,[{opacity:1,transform:C(0,0,'scale(1)')},{opacity:0,transform:C(0,H*.2,'scale(.7) rotate(15deg)')}],1100);
  await wait(1200);await title('شقّ الفضاء','وايتبيرد — أقوى رجل','#bae6fd',1500)},
 async fatherWill(x){const {W,H,p,port,flash,ring,title,pop,rays,dots}=x;const a=port();cnApp(a);await wait(500);
  rays('#fef9c3',1700);dots(40,'#fef08a',[2,6],[1500,3000]);
  for(let i=0;i<3;i++){const s=p('👤',{left:(18+i*32)+'%',top:'74%',fontSize:'56px',filter:'brightness(0) drop-shadow(0 0 12px #fde047)',zIndex:62,opacity:0});go(s,[{transform:C(0,20,'scale(.4)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:.9}],800,{delay:(300+i*200)/speed})}
  pop('أبنائي ينتظرونني.','#fef9c3','50%','14%',30,1500);
  go(a,[{filter:'none'},{filter:'brightness(1.4) drop-shadow(0 0 30px #fde047)'}],1000);ring('#fde047',4,900);ring('#fff',6,1100,250);
  await wait(1000);for(let i=0;i<8;i++){const c=p('✚',{left:rnd(38,62)+'%',top:'60%',fontSize:'30px',color:'#bbf7d0',textShadow:'0 0 10px #22c55e',zIndex:80,opacity:0});go(c,[{transform:C(0,0),opacity:1},{transform:C(0,-H*.3),opacity:0}],1000,{delay:i*80/speed})}
  flash('#fefce8',400,.6);await wait(1200);await title('عزيمة الأب','وايتبيرد — أقوى رجل','#fde047',1500)},
 /* ---------- روجر ---------- */
 async aceBlade(x){const {W,p,flash,ring,title,pop,dots,slashLine,bolts}=x;const [a,d]=cnPair(x);await wait(550);
  pop('سيف إيس!','#fde047','27%','16%',38,1100);dots(30,'#facc15',[2,5],[900,1600]);bolts('#facc15',3);await wait(600);
  for(let i=0;i<3;i++){slashLine('#facc15',-35+i*8,W*.6,350,i*140,6,'60%',(44+i*6)+'%')}
  await wait(650);flash('#fef9c3',350,.9);shake(16);ring('#facc15',6,900,0,'73%');cnHit(d,'brightness(2) sepia(1) saturate(3)');
  await wait(900);await title('سيف إيس','روجر — ملك القراصنة','#facc15',1400)},
 async divineDep(x){const {W,H,p,dport,flash,ring,title,pop,bolts,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('الرحيل الأعظم!','#fde047','50%','12%',38,1400);dots(40,'#facc15',[2,5],[1200,2400]);bolts('#ef4444',5);
  const bg=p('',{inset:0,background:'#000',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.7}],700);ring('#facc15',4,900,0,'27%');await wait(900);
  const sl=p('',{left:'73%',top:'50%',width:'10px',height:H*1.4+'px',background:'linear-gradient(#000,#fff,#facc15,#000)',boxShadow:'0 0 40px #facc15,0 0 80px #ef4444',zIndex:85,opacity:0});
  go(sl,[{transform:C(0,0,'rotate(20deg) scaleY(0)'),opacity:1},{transform:C(0,0,'rotate(20deg) scaleY(1)'),opacity:1,offset:.3},{transform:C(0,0,'rotate(20deg) scaleY(1) scaleX(.2)'),opacity:0}],900);
  const h1=x.dport({clipPath:'polygon(0 0,100% 0,0 100%)'}),h2=x.dport({clipPath:'polygon(100% 0,100% 100%,0 100%)'});go(d,[{opacity:1},{opacity:0}],20,{delay:300/speed});
  go(h1,[{transform:C(0,0)},{transform:C(-10,0)},{transform:C(-40,-20,'rotate(-10deg)'),opacity:0}],1200,{delay:300/speed});go(h2,[{transform:C(0,0)},{transform:C(10,0)},{transform:C(40,20,'rotate(10deg)'),opacity:0}],1200,{delay:300/speed});
  flash('#fffbeb',450,1);shake(26);ring('#facc15',8,1200,0,'73%');await wait(1500);await title('الرحيل الأعظم','روجر — ملك القراصنة','#facc15',1500)},
 async armHaki(x){const {p,port,flash,ring,title,pop,rays,bolts,dots}=x;const a=port();cnApp(a);await wait(500);
  rays('#facc15',1600);dots(40,'#fde047',[2,6],[1500,3000]);
  go(a,[{filter:'none'},{filter:'brightness(.45) contrast(1.6) drop-shadow(0 0 24px #facc15)'}],1000);
  const sh=p('',{left:'50%',top:'50%',width:'40px',height:'110%',background:'linear-gradient(90deg,transparent,#facc1588,#fff,#facc1588,transparent)',zIndex:70,opacity:0});go(sh,[{transform:C(-120,0,'rotate(20deg)'),opacity:1},{transform:C(120,0,'rotate(20deg)'),opacity:1}],1000,{delay:300/speed});
  ring('#facc15',4,900);await wait(800);bolts('#facc15',5);bolts('#000',3);pop('هاكي أسود.','#fef08a','50%','16%',34,1400);flash('#422006',400,.7);shake(10);
  await wait(1300);await title('هاكي التسليح الأسود','روجر — ملك القراصنة','#facc15',1500)},
 /* ---------- روكس ---------- */
 async rulerAmbition(x){const {W,H,p,flash,ring,title,pop,dots,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  const bg=p('',{inset:0,background:'radial-gradient(circle,#450a0a,#000)',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.85}],800);
  const cr=p('👑',{left:'50%',top:'30%',fontSize:Math.min(H*.35,140)+'px',filter:'drop-shadow(0 0 30px #dc2626)',zIndex:70,opacity:0});go(cr,[{transform:C(0,-40,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],900);
  pop('سأحكم كل شيء!','#fca5a5','50%','78%',34,1600);dots(40,'#dc2626',[2,6],[1200,2400]);
  for(let i=0;i<5;i++){const f=p('🚩',{left:(20+i*15)+'%',top:'60%',fontSize:'44px',zIndex:66,opacity:0});go(f,[{transform:C(0,20,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1) rotate(-8deg)'),opacity:1},{transform:C(0,0,'scale(1) rotate(8deg)'),opacity:1}],900,{delay:(500+i*100)/speed})}
  await wait(1500);for(let i=0;i<7;i++)slashLine('#ef4444',rnd(70,110),H*.9,600,i*70,5,(40+rnd(0,55))+'%','100%');
  shake(26);flash('#7f1d1d',450,.9);ring('#dc2626',8,1200,0,'73%');go(d,[{transform:C(0,0,'scale(1)'),opacity:1},{transform:C(0,H*.15,'scale(.8)'),opacity:0}],1100);
  await wait(1200);await title('طموح الحاكم','روكس — قائد القراصنة','#ef4444',1500)},
 async shipCrush(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('سحق!','#fca5a5','50%','14%',44,1200);
  const sh=p('🚢',{left:'73%',top:'50%',fontSize:Math.min(H*.7,260)+'px',filter:'drop-shadow(0 0 24px #7f1d1d)',zIndex:80,opacity:0});
  await go(sh,[{transform:C(0,-H*.9,'scale(.6) rotate(-10deg)'),opacity:1},{transform:C(0,-H*.05,'scale(1.1) rotate(0)'),opacity:1}],800,{easing:'ease-in'});
  flash('#fef2f2',350,.9);shake(26);ring('#b91c1c',8,1200,0,'73%');dots(40,'#fca5a5',[2,6],[900,1600]);
  go(d,[{transform:C(0,0,'scale(1)')},{transform:C(0,50,'scale(1.4,.2)'),offset:.2},{transform:C(0,50,'scale(1.4,.2)'),opacity:0}],1200);go(sh,[{opacity:1},{opacity:0}],900,{delay:300/speed});
  await wait(1200);await title('سحق السفن','روكس — قائد القراصنة','#ef4444',1500)},
 async chaosWill(x){const {p,port,flash,ring,title,pop,rays,dots,bolts}=x;const a=port();cnApp(a);await wait(500);
  rays('#991b1b',1800);dots(50,'#dc2626',[2,6],[1500,3000]);
  const fl=p('🏴‍☠️',{left:'50%',top:'30%',fontSize:'110px',filter:'drop-shadow(0 0 24px #dc2626)',zIndex:62,opacity:0});go(fl,[{transform:C(0,20,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1) rotate(-6deg)'),opacity:1,offset:.4},{transform:C(0,0,'scale(1.1) rotate(6deg)'),opacity:1}],1400);
  go(a,[{filter:'none'},{filter:'brightness(.7) contrast(1.4) saturate(1.5) drop-shadow(0 0 28px #dc2626)'}],900);ring('#dc2626',4,900);ring('#fca5a5',6,1100,250);await wait(900);
  bolts('#ef4444',5);pop('العالم لي.','#fca5a5','50%','78%',36,1400);flash('#450a0a',450,.8);shake(12);
  await wait(1300);await title('إرادة الفوضى','روكس — قائد القراصنة','#ef4444',1500)},
 /* ---------- زيريف ---------- */
 async ankhseram(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const bg=p('',{inset:0,background:'#000',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.8}],800);
  const S=Math.min(W,H)*.9,mc=p('',{left:'73%',top:'72%',width:S+'px',height:S*.35+'px',borderRadius:'50%',border:'3px solid #9ca3af',boxShadow:'0 0 40px #6b7280',background:'repeating-conic-gradient(#37415188 0 10deg,transparent 10deg 20deg)',zIndex:62,opacity:0});
  go(mc,[{transform:C(0,0,'scale(.1)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],900);pop('لا أصلح للبقاء.','#d1d5db','27%','16%',32,1600);dots(30,'#6b7280',[2,5],[1200,2200]);await wait(900);
  for(let i=0;i<9;i++){const t=p('',{left:`calc(73% + ${(i-4)*26}px)`,bottom:'0',width:'14px',height:H*rnd(.5,.85)+'px',background:'linear-gradient(0deg,#000,#1f2937 60%,#6b7280)',borderRadius:'14px 14px 0 0',boxShadow:'0 0 14px #6b7280',zIndex:76,opacity:0,transformOrigin:'50% 100%'});
   go(t,[{transform:'translateX(-50%) scaleY(0)',opacity:1},{transform:'translateX(-50%) scaleY(1)',opacity:1,offset:.4},{transform:'translateX(-50%) scaleY(1)',opacity:0}],1200,{delay:i*70/speed})}
  go(d,[{filter:'none'},{filter:'grayscale(1) brightness(.4)'}],1100,{delay:400/speed});shake(14);await wait(1400);flash('#111827',400,.8);await title('إنكانتوس','زيريف — الساحر الأسود','#9ca3af',1500)},
 async darkWave(x){const {H,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const o=cnOrb(x,'#1f2937','31%',44);o.style.boxShadow='0 0 40px #7c3aed,0 0 80px #000';go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(3)'),opacity:1}],900);
  dots(30,'#a78bfa',[2,5],[900,1600]);pop('موجة الظلام.','#c4b5fd','27%','16%',32,1000);ring('#7c3aed',3,900,200,'31%');await wait(950);
  cnBeam(x,'#9ca3af','#000',Math.min(H*.36,150),1200);await wait(420);flash('#111827',400,.8);shake(18);ring('#6b7280',7,1100,0,'73%');cnHit(d,'brightness(.4) contrast(1.5)');
  await wait(1200);await title('موجة الظلام','زيريف — الساحر الأسود','#9ca3af',1500)},
 async immortal(x){const {p,port,flash,ring,title,pop,dots,slashLine}=x;const a=port();cnApp(a);await wait(500);
  pop('لا أموت.','#d1d5db','50%','14%',36,1500);
  for(let i=0;i<5;i++)slashLine('#ef4444',-30+i*18,150,300,i*90,3,'50%',(36+i*7)+'%');
  go(a,[{filter:'none'},{filter:'grayscale(1) brightness(.5) drop-shadow(0 0 20px #ef4444)',offset:.4},{filter:'grayscale(.5) brightness(1.1) drop-shadow(0 0 24px #7c3aed)'}],1500);
  await wait(900);for(let i=0;i<20;i++){const s=p('',{left:rnd(38,62)+'%',top:rnd(30,70)+'%',width:rnd(6,14)+'px',height:rnd(6,14)+'px',borderRadius:'50%',background:'#1f2937',boxShadow:'0 0 10px #7c3aed',zIndex:80,opacity:0});go(s,[{transform:C(rnd(-80,80),rnd(-80,80)),opacity:1},{transform:C(0,0),opacity:0}],900,{delay:i*40/speed})}
  ring('#7c3aed',4,900);flash('#1f2937',400,.6);dots(30,'#a78bfa',[2,5],[900,1600]);await wait(1300);await title('خلود','زيريف — الساحر الأسود','#9ca3af',1500)},
 /* ---------- ميرلين ---------- */
 async infMeteor(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const mc=p('',{left:'27%',top:'50%',width:'170px',height:'170px',borderRadius:'50%',border:'3px solid #c4b5fd',boxShadow:'0 0 30px #8b5cf6,inset 0 0 30px #8b5cf6',background:'repeating-conic-gradient(#8b5cf633 0 12deg,transparent 12deg 24deg)',zIndex:64,opacity:0});
  go(mc,[{transform:C(0,0,'scale(.2) rotate(0)'),opacity:0},{transform:C(0,0,'scale(1) rotate(360deg)'),opacity:1}],900);pop('ميتيور!','#ddd6fe','27%','16%',38,1200);await wait(900);
  for(let i=0;i<14;i++){const m=p('☄️',{left:'73%',top:'50%',fontSize:rnd(36,64)+'px',filter:'drop-shadow(0 0 14px #a78bfa)',zIndex:76,opacity:0});const ox=rnd(-W*.5,-W*.2),tx=rnd(-50,50),ty=rnd(-60,60);
   go(m,[{transform:C(ox,-H*.8,'scale(.8)'),opacity:1},{transform:C(tx,ty,'scale(1)'),opacity:1,offset:.9},{transform:C(tx,ty,'scale(1.6)'),opacity:0}],700,{delay:i*110/speed,easing:'ease-in'});
   ring('#a78bfa',2,500,i*110+620,`calc(73% + ${tx}px)`,`calc(50% + ${ty}px)`)}
  dots(30,'#ddd6fe',[2,5],[1000,2000]);await wait(1700);flash('#ede9fe',400,.8);shake(18);cnHit(d,'brightness(1.8) hue-rotate(250deg)');
  await wait(800);await title('ميتيور لانهائي','ميرلين — ساحرة الوجود','#a78bfa',1500)},
 async annihMagic(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const mc=p('',{left:'73%',top:'50%',width:Math.min(W,H)*.8+'px',height:Math.min(W,H)*.8+'px',borderRadius:'50%',border:'3px solid #ddd6fe',boxShadow:'0 0 50px #a78bfa,inset 0 0 50px #a78bfa',background:'repeating-conic-gradient(#a78bfa44 0 8deg,transparent 8deg 16deg)',zIndex:62,opacity:0});
  go(mc,[{transform:C(0,0,'scale(.2) rotate(0)'),opacity:0},{transform:C(0,0,'scale(1) rotate(-360deg)'),opacity:1}],1300);pop('حان وقت النهاية.','#ede9fe','50%','14%',32,1600);dots(40,'#ddd6fe',[2,5],[1200,2400]);await wait(800);
  for(let i=0;i<5;i++){const r=p('',{left:'73%',top:'50%',width:'260px',height:'260px',borderRadius:'50%',border:'3px solid #c4b5fd',zIndex:68,opacity:0});go(r,[{transform:C(0,0,'scale(2.4)'),opacity:0},{transform:C(0,0,'scale(.4)'),opacity:1,offset:.7},{transform:C(0,0,'scale(.2)'),opacity:0}],900,{delay:i*180/speed,easing:'ease-in'})}
  await wait(1200);for(let i=0;i<24;i++){const s=p('✨',{left:'73%',top:'50%',fontSize:rnd(14,30)+'px',zIndex:80,opacity:0});go(s,[{transform:C(0,0),opacity:1},{transform:C(rnd(-W*.3,W*.2),rnd(-H*.4,H*.4)),opacity:0}],1200,{delay:i*20/speed})}
  go(d,[{opacity:1,filter:'none'},{opacity:0,filter:'brightness(3)'}],700);flash('#f5f3ff',450,.9);shake(10);await wait(1200);await title('سحر الفناء','ميرلين — ساحرة الوجود','#a78bfa',1500)},
 async reflectWorld(x){const {W,H,p,flash,ring,title,pop}=x;const [a,d]=cnPair(x);await wait(550);
  const mr=p('',{left:'42%',top:'50%',width:'80px',height:Math.min(H*.7,300)+'px',borderRadius:'50%',background:'linear-gradient(100deg,#ede9fe55,#c4b5fdcc 45%,#fff 50%,#8b5cf6aa 60%,#ede9fe44)',border:'3px solid #ddd6fe',boxShadow:'0 0 40px #a78bfa',zIndex:70,opacity:0});
  go(mr,[{transform:C(0,0,'scale(.2,.5)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],800);pop('العالم يعكسك.','#ddd6fe','27%','16%',30,1400);await wait(900);
  const o=cnOrb(x,'#f87171','73%',50);go(o,[{transform:C(0,0,'scale(.4)'),opacity:1},{transform:C(-W*.31,0,'scale(1)'),opacity:1}],550,{easing:'ease-in'});await wait(560);
  flash('#fff',250,.8);ring('#ddd6fe',4,800,0,'42%');o.style.background='radial-gradient(circle,#fff 0 18%,#a78bfa 48%,transparent 72%)';
  await go(o,[{transform:C(-W*.31,0,'scale(1)'),opacity:1},{transform:C(0,0,'scale(1.3)'),opacity:1}],550,{easing:'ease-in'});rm(o);
  flash('#ede9fe',350,.8);shake(12);ring('#a78bfa',5,900,0,'73%');cnHit(d,'brightness(2) hue-rotate(250deg)');await wait(900);await title('عالم منعكس','ميرلين — ساحرة الوجود','#a78bfa',1500)}
});

Object.assign(SCENE_OF,{
 'zeldris:انفجار اللهب':'hellFlame','zeldris:هالة الإبادة':'pietyCmd','zeldris:ملك الظلام':'hellFall',
 'gilgamesh:بوابة بابل':'gateBabylon','gilgamesh:إيا — شق العالم':'enumaElish','gilgamesh:إنكيدو — سلاسل السماء':'enkiduChains',
 'ashborn:جيش الأرواح':'ghostHorde','ashborn:حكم الظلال':'kingWill','ashborn:أمر الملك':'shadowThrone',
 'meruem:إدراك الملك':'royalAura','meruem:هالة النين':'nenBarrage','meruem:قصف النين':'ultNen',
 'hashirama:العملاق الخشبي':'buddha','hashirama:أغصان الغابة':'deepForest','hashirama:وضع الحكيم':'hashiSage'
});
/* ================================================================
   الدفعة 7 — زيلدريس، جلجامش، أشبورن، ميروم، هاشيراما (3 مشاهد لكل شخصية)
   ================================================================ */
Object.assign(SCENES,{
 /* ---------- زيلدريس ---------- */
 async hellFlame(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const o=cnOrb(x,'#dc2626','27%',60);o.style.boxShadow='0 0 50px #dc2626,0 0 100px #450a0a';
  go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1.6)'),opacity:1}],800);pop('انفجار!','#fecaca','27%','16%',34,1200);await wait(800);
  for(let i=0;i<12;i++){const f=p('🔥',{left:'27%',top:'50%',fontSize:rnd(40,70)+'px',filter:'drop-shadow(0 0 14px #dc2626) hue-rotate(-10deg)',zIndex:76,opacity:0});const ty=rnd(-70,70);
   go(f,[{transform:C(0,rnd(-30,30),'scale(.6)'),opacity:1},{transform:C(W*.46,ty,'scale(1.2)'),opacity:1,offset:.85},{transform:C(W*.46,ty,'scale(1.8)'),opacity:0}],750,{delay:i*90/speed,easing:'ease-in'})}
  await wait(1100);rm(o);dots(30,'#f87171',[2,5],[900,1600]);flash('#7f1d1d',400,.8);shake(16);ring('#dc2626',6,1000,0,'73%');cnHit(d,'brightness(1.4) sepia(1) hue-rotate(-30deg) saturate(4)');
  await wait(1000);await title('انفجار اللهب','زيلدريس — قائد الوصايا العشر','#ef4444',1500)},
 async pietyCmd(x){const {W,H,p,port,flash,ring,title,pop,dots,slashLine}=x;const a=port();cnApp(a);await wait(500);
  pop('اركع.','#fecaca','50%','14%',40,1400);
  for(let i=0;i<3;i++){const r=p('',{left:'50%',top:'50%',width:'240px',height:'240px',borderRadius:'50%',border:'3px dashed #ef4444',boxShadow:'0 0 24px #dc2626,inset 0 0 24px #dc2626',zIndex:64,opacity:0});
   go(r,[{transform:C(0,0,`scale(${.4+i*.3}) rotate(0)`),opacity:0},{transform:C(0,0,`scale(${1.4+i*.5}) rotate(${i%2?-240:240}deg)`),opacity:1,offset:.5},{transform:C(0,0,`scale(${2+i*.5}) rotate(${i%2?-360:360}deg)`),opacity:0}],1400,{delay:i*220/speed})}
  for(let i=0;i<6;i++)slashLine('#dc2626',90,H*.8,500,i*100,4,(30+i*8)+'%','50%');
  go(a,[{filter:'none'},{filter:'brightness(.6) drop-shadow(0 0 22px #dc2626)',offset:.4},{filter:'brightness(1.2) drop-shadow(0 0 20px #ef4444)'}],1400);
  await wait(900);flash('#450a0a',400,.7);shake(10);dots(30,'#f87171',[2,5],[900,1600]);ring('#dc2626',4,900);await wait(1200);await title('هالة الإبادة','زيلدريس — قائد الوصايا العشر','#ef4444',1500)},
 async hellFall(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const bg=p('',{inset:0,background:'radial-gradient(circle at 50% 0%,#7f1d1d,#000 70%)',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.85}],900);
  pop('سأحكمهم جميعاً.','#fecaca','50%','12%',38,1700);await wait(900);
  for(let i=0;i<10;i++){const m=p('☄️',{left:(55+rnd(0,38))+'%',top:'50%',fontSize:rnd(50,90)+'px',filter:'drop-shadow(0 0 18px #dc2626) hue-rotate(-30deg)',zIndex:76,opacity:0});const tx=rnd(-60,60),ty=rnd(-40,60);
   go(m,[{transform:C(rnd(-W*.3,0),-H*.9,'scale(.8)'),opacity:1},{transform:C(tx,ty,'scale(1)'),opacity:1,offset:.88},{transform:C(tx,ty,'scale(2)'),opacity:0}],800,{delay:i*130/speed,easing:'ease-in'});
   ring('#ef4444',2,500,i*130+700,`calc(73% + ${tx}px)`,`calc(50% + ${ty}px)`)}
  await wait(1700);flash('#fca5a5',500,.9);shake(26);ring('#dc2626',9,1300,0,'73%');cnHit(d,'brightness(.3) sepia(1) hue-rotate(-30deg) saturate(5)');dots(40,'#f87171',[2,6],[1000,2000]);
  await wait(1200);rm(bg);await title('ملك الظلام','زيلدريس — قائد الوصايا العشر','#ef4444',1500)},
 /* ---------- جلجامش ---------- */
 async gateBabylon(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('اسقطي.','#fef08a','27%','14%',34,1300);
  const gates=[];for(let i=0;i<8;i++){const g=p('',{left:(14+i*9)+'%',top:(12+(i%3)*14)+'%',width:'70px',height:'70px',borderRadius:'50%',border:'3px solid #fde047',boxShadow:'0 0 22px #eab308,inset 0 0 18px #eab308',background:'repeating-conic-gradient(#eab30844 0 15deg,transparent 15deg 30deg)',zIndex:66,opacity:0});
   go(g,[{transform:C(0,0,'scale(0) rotate(0)'),opacity:0},{transform:C(0,0,'scale(1) rotate(180deg)'),opacity:1}],500,{delay:i*70/speed});gates.push(g)}
  await wait(900);
  for(let i=0;i<18;i++){const sw=p(i%3?'🗡️':'⚔️',{left:(14+(i%8)*9)+'%',top:(12+((i%8)%3)*14)+'%',fontSize:rnd(30,50)+'px',filter:'drop-shadow(0 0 12px #fde047)',zIndex:78,opacity:0});const tx=rnd(-40,40),ty=rnd(-60,60);
   const sx=W*(.73-(14+(i%8)*9)/100)+tx,sy=H*(.5-(12+((i%8)%3)*14)/100)+ty;
   go(sw,[{transform:C(0,0,'scale(.6) rotate(125deg)'),opacity:1},{transform:C(sx,sy,'scale(1) rotate(125deg)'),opacity:1,offset:.9},{transform:C(sx,sy,'scale(1.3) rotate(125deg)'),opacity:0}],600,{delay:i*70/speed,easing:'ease-in'});
   ring('#fde047',2,420,i*70+520,`calc(73% + ${tx}px)`,`calc(50% + ${ty}px)`)}
  await wait(1900);flash('#fef9c3',350,.7);shake(16);cnHit(d,'brightness(1.8) sepia(1)');dots(30,'#fde047',[2,5],[900,1600]);gates.forEach(g=>go(g,[{opacity:1},{opacity:0}],500));
  await wait(900);await title('بوابة بابل','جلجامش — ملك الأبطال','#facc15',1500)},
 async enumaElish(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const bg=p('',{inset:0,background:'#000',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.6}],700);
  const cols=['#dc2626','#fde047','#b91c1c'];
  cols.forEach((c,i)=>{const r=p('',{left:'27%',top:'50%',width:(90+i*50)+'px',height:(90+i*50)+'px',borderRadius:'50%',border:`4px solid ${c}`,boxShadow:`0 0 28px ${c},inset 0 0 28px ${c}`,background:'repeating-conic-gradient(#ffffff22 0 10deg,transparent 10deg 20deg)',zIndex:66,opacity:0});
   go(r,[{transform:C(0,0,'scale(.2) rotate(0)'),opacity:0},{transform:C(0,0,`scale(1) rotate(${i%2?-720:720}deg)`),opacity:1}],1500,{delay:i*150/speed})});
  pop('إيا!','#fef08a','27%','12%',40,1800);dots(40,'#fde047',[2,5],[1200,2400]);await wait(1700);
  cnBeam(x,'#fde047','#b91c1c',Math.min(H*.42,170),1300);await wait(450);flash('#fff7ed',500,1);shake(30);ring('#fde047',8,1200,0,'73%');ring('#dc2626',5,1100,200,'73%');
  go(d,[{opacity:1,filter:'none'},{opacity:0,filter:'brightness(3) sepia(1)'}],800);await wait(1300);rm(bg);await title('إيا — شق العالم','جلجامش — ملك الأبطال','#facc15',1500)},
 async enkiduChains(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('اركع!','#fef08a','27%','16%',32,1500);await wait(400);
  for(let i=0;i<7;i++){const ang=(i/7)*Math.PI*2,r=Math.min(W,H)*.32;
   const ch=p('',{left:'73%',top:'50%',width:'12px',height:r+'px',background:'repeating-linear-gradient(0deg,#fde047 0 10px,#a16207 10px 16px)',borderRadius:'6px',boxShadow:'0 0 14px #eab308',transformOrigin:'50% 0',zIndex:76,opacity:0});
   go(ch,[{transform:`translate(-50%,0) rotate(${ang*57.3+180}deg) translateY(${r}px) scaleY(.1)`,opacity:0},{transform:`translate(-50%,0) rotate(${ang*57.3+180}deg) translateY(0) scaleY(1)`,opacity:1}],700,{delay:i*90/speed,fill:'forwards',easing:'ease-in'});
   setTimeout(()=>rm(ch),2400/speed)}
  await wait(1000);ring('#fde047',4,900,0,'73%');go(d,[{filter:'none'},{filter:'grayscale(1) brightness(.6) drop-shadow(0 0 16px #eab308)',offset:.3},{filter:'grayscale(.6) brightness(.8)'}],1500,{fill:'forwards'});
  flash('#fef9c3',350,.6);shake(10);dots(24,'#fde047',[2,4],[900,1500]);await wait(1400);await title('إنكيدو — سلاسل السماء','جلجامش — ملك الأبطال','#facc15',1500)},
 /* ---------- أشبورن ---------- */
 async ghostHorde(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('انهضوا يا جنودي.','#bfdbfe','27%','16%',36,1200);
  for(let i=0;i<5;i++)ring('#6366f1',2,700,i*160,'27%','70%');
  for(let i=0;i<20;i++){const g=p('👤',{left:'27%',top:'62%',fontSize:rnd(34,56)+'px',filter:'brightness(0) drop-shadow(0 0 10px #818cf8)',zIndex:74,opacity:0});const ty=rnd(-50,50);
   go(g,[{transform:C(rnd(-30,30),30,'scale(.4)'),opacity:0},{transform:C(rnd(0,60),0,'scale(1)'),opacity:.9,offset:.2},{transform:C(W*.45,ty,'scale(1.1)'),opacity:.9,offset:.85},{transform:C(W*.45,ty,'scale(1.5)'),opacity:0}],1300,{delay:i*85/speed})}
  await wait(1800);flash('#1e1b4b',350,.8);shake(14);ring('#818cf8',5,900,0,'73%');cnHit(d,'brightness(.4) hue-rotate(200deg)');dots(30,'#a5b4fc',[2,5],[900,1600]);
  await wait(1000);await title('جيش الأرواح','أشبورن — ملك الظلال الأول','#818cf8',1500)},
 async kingWill(x){const {W,H,p,port,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(500);
  const bg=p('',{inset:0,background:'radial-gradient(circle,#1e1b4b99,#000 80%)',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.85}],800);
  pop('اخضعوا لحكمي.','#c7d2fe','27%','14%',36,1500);
  for(let i=0;i<5;i++)ring('#818cf8',4,1100,i*220,'27%');
  go(d,[{transform:C(0,0,'scale(1)'),filter:'none'},{transform:C(0,18,'scale(.82)'),filter:'grayscale(1) brightness(.5)'}],1500,{delay:500/speed,fill:'forwards'});
  await wait(1500);flash('#312e81',400,.7);shake(10);dots(30,'#a5b4fc',[2,5],[900,1600]);await wait(1000);rm(bg);await title('حكم الظلال','أشبورن — ملك الظلال الأول','#818cf8',1500)},
 async shadowThrone(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(500);
  const bg=p('',{inset:0,background:'#000',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.9}],900);
  for(let i=0;i<24;i++){const t=p('',{left:(8+i*3.8)+'%',bottom:'0',width:'16px',height:H*rnd(.25,.6)+'px',background:'linear-gradient(0deg,#000,#1e1b4b 70%,#6366f1)',borderRadius:'16px 16px 0 0',boxShadow:'0 0 14px #6366f1',zIndex:70,opacity:0,transformOrigin:'50% 100%'});
   go(t,[{transform:'translateX(-50%) scaleY(0)',opacity:1},{transform:'translateX(-50%) scaleY(1)',opacity:1,offset:.5},{transform:'translateX(-50%) scaleY(1)',opacity:0}],1500,{delay:i*45/speed})}
  const cr=p('👑',{left:'50%',top:'22%',fontSize:Math.min(H*.3,130)+'px',filter:'drop-shadow(0 0 30px #6366f1) brightness(.5) saturate(0)',zIndex:80,opacity:0});
  go(cr,[{transform:C(0,-H*.4,'scale(.5)'),opacity:0},{transform:C(0,0,'scale(1.4)'),opacity:1,offset:.7},{transform:C(0,0,'scale(1.6)'),opacity:0}],2000,{delay:600/speed});
  pop('تحرّروا!','#c7d2fe','50%','12%',34,1800);await wait(1900);
  flash('#818cf8',500,.9);shake(24);ring('#6366f1',8,1200,0,'73%');cnHit(d,'brightness(.2) hue-rotate(200deg)');go(d,[{opacity:1},{opacity:.15}],900,{fill:'forwards'});dots(40,'#a5b4fc',[2,6],[1000,2000]);
  await wait(1300);rm(bg);await title('أمر الملك','أشبورن — ملك الظلال الأول','#818cf8',1500)},
 /* ---------- ميروم ---------- */
 async royalAura(x){const {W,H,p,port,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(500);
  pop('أرى كل شيء.','#99f6e4','27%','14%',32,1500);
  const au=p('',{left:'27%',top:'50%',width:'230px',height:Math.min(H*.85,360)+'px',borderRadius:'50%',background:'radial-gradient(ellipse,#14b8a688,#0f766e44 55%,transparent 72%)',boxShadow:'0 0 60px #14b8a6',zIndex:62,opacity:0});
  go(au,[{transform:C(0,0,'scale(.4)'),opacity:0},{transform:C(0,0,'scale(1.2)'),opacity:1,offset:.4},{transform:C(0,0,'scale(1)'),opacity:.8}],1500);
  for(let i=0;i<5;i++)ring('#2dd4bf',4,1100,i*200,'27%');
  go(d,[{transform:C(0,0,'scale(1)'),filter:'none'},{transform:C(0,14,'scale(.85)'),filter:'brightness(.6) hue-rotate(120deg)'}],1500,{delay:600/speed,fill:'forwards'});
  dots(30,'#5eead4',[2,5],[900,1700]);await wait(1400);flash('#ccfbf1',350,.6);shake(10);await wait(900);await title('إدراك الملك','ميروم — ملك النمل الكيميرا','#2dd4bf',1500)},
 async nenBarrage(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('هالتي تسحقك.','#99f6e4','27%','16%',34,1200);await wait(500);
  for(let i=0;i<16;i++){const o=cnOrb(x,'#2dd4bf','27%',rnd(26,44));const ty=rnd(-70,70);
   go(o,[{transform:C(0,rnd(-30,30),'scale(.4)'),opacity:1},{transform:C(W*.46,ty,'scale(1)'),opacity:1,offset:.85},{transform:C(W*.46,ty,'scale(1.8)'),opacity:0}],520,{delay:i*85/speed,easing:'ease-in'});
   ring('#5eead4',2,400,i*85+450,`calc(73% + ${W*0}px)`,`calc(50% + ${ty}px)`);setTimeout(()=>rm(o),1800/speed)}
  await wait(1700);flash('#ccfbf1',300,.7);shake(14);cnHit(d,'brightness(2) hue-rotate(120deg)');dots(24,'#5eead4',[2,5],[800,1400]);await wait(900);await title('هالة النين','ميروم — ملك النمل الكيميرا','#2dd4bf',1500)},
 async ultNen(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const o=cnOrb(x,'#14b8a6','27%',60);o.style.boxShadow='0 0 60px #14b8a6,0 0 120px #0f766e';
  go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(3.4)'),opacity:1}],1700);pop('قصف الملك!','#99f6e4','27%','14%',36,1700);
  for(let i=0;i<6;i++)ring('#2dd4bf',3,1000,i*260,'27%');dots(50,'#5eead4',[2,6],[1200,2400]);await wait(1800);
  cnBeam(x,'#ccfbf1','#0f766e',Math.min(H*.45,180),1400);await wait(450);flash('#f0fdfa',500,1);shake(28);ring('#2dd4bf',9,1300,0,'73%');
  go(d,[{opacity:1,filter:'none'},{opacity:0,filter:'brightness(3) hue-rotate(120deg)'}],900);await wait(1300);rm(o);await title('قصف النين','ميروم — ملك النمل الكيميرا','#2dd4bf',1500)},
 /* ---------- هاشيراما ---------- */
 async buddha(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const bd=p('🧘',{left:'27%',top:'42%',fontSize:Math.min(H*.9,380)+'px',filter:'drop-shadow(0 0 30px #a3e635) sepia(1) hue-rotate(40deg) saturate(2)',zIndex:60,opacity:0});
  go(bd,[{transform:C(0,H*.3,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:.9}],1400);pop('العملاق الخشبي!','#d9f99d','27%','10%',36,1700);
  for(let i=0;i<16;i++){const h=p('✋',{left:'27%',top:'42%',fontSize:rnd(36,56)+'px',filter:'drop-shadow(0 0 12px #a3e635) sepia(1) hue-rotate(40deg) saturate(2)',zIndex:76,opacity:0});const ang=(i/16)*Math.PI*2,rx=Math.cos(ang)*rnd(60,150),ry=Math.sin(ang)*rnd(50,110);
   go(h,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(rx,ry,'scale(1)'),opacity:1,offset:.4},{transform:C(rx+W*.42,ry*.4,'scale(1.3)'),opacity:1,offset:.85},{transform:C(rx+W*.42,ry*.4,'scale(1.8)'),opacity:0}],1700,{delay:(600+i*70)/speed})}
  await wait(2500);flash('#ecfccb',450,.8);shake(24);ring('#84cc16',7,1100,0,'73%');cnHit(d,'brightness(1.6) hue-rotate(60deg)');dots(36,'#bef264',[2,6],[1000,1900]);
  await wait(1200);rm(bd);await title('العملاق الخشبي','هاشيراما — أسطورة الشينوبي','#a3e635',1500)},
 async deepForest(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('أغصان!','#d9f99d','27%','16%',34,1200);await wait(500);
  for(let i=0;i<12;i++){const t=p('',{left:`calc(73% + ${(i-6)*26}px)`,bottom:'0',width:rnd(14,26)+'px',height:H*rnd(.45,.95)+'px',background:'linear-gradient(0deg,#422006,#65a30d 55%,#bef264)',borderRadius:'18px 18px 0 0',boxShadow:'0 0 14px #84cc16',zIndex:76,opacity:0,transformOrigin:'50% 100%'});
   go(t,[{transform:'translateX(-50%) scaleY(0)',opacity:1},{transform:'translateX(-50%) scaleY(1)',opacity:1,offset:.35},{transform:'translateX(-50%) scaleY(1)',opacity:0}],1300,{delay:i*70/speed})}
  for(let i=0;i<10;i++){const l=p('🌳',{left:`calc(73% + ${rnd(-130,130)}px)`,top:rnd(20,60)+'%',fontSize:rnd(40,70)+'px',zIndex:78,opacity:0});go(l,[{transform:C(0,30,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],700,{delay:(500+i*80)/speed})}
  await wait(900);flash('#ecfccb',350,.7);shake(18);ring('#84cc16',6,1000,0,'73%');cnHit(d,'brightness(.8) hue-rotate(60deg) saturate(2)');dots(30,'#bef264',[2,5],[900,1600]);
  await wait(1200);await title('أغصان الغابة','هاشيراما — أسطورة الشينوبي','#a3e635',1500)},
 async hashiSage(x){const {W,H,p,port,flash,ring,title,pop,dots}=x;const a=port();cnApp(a);await wait(500);
  pop('طاقة الطبيعة.','#d9f99d','50%','14%',36,1500);
  for(let i=0;i<3;i++)ring('#a3e635',4,1100,i*260);
  for(let i=0;i<24;i++){const l=p('🍃',{left:'50%',top:'50%',fontSize:rnd(16,30)+'px',zIndex:80,opacity:0});const ang=rnd(0,6.28),r=rnd(60,150);
   go(l,[{transform:C(Math.cos(ang)*r,Math.sin(ang)*r+60),opacity:0},{transform:C(Math.cos(ang+1)*r*.6,Math.sin(ang+1)*r*.6-20),opacity:1,offset:.5},{transform:C(0,-40),opacity:0}],1500,{delay:i*55/speed})}
  go(a,[{filter:'none'},{filter:'brightness(1.4) sepia(1) hue-rotate(40deg) saturate(2) drop-shadow(0 0 24px #a3e635)',offset:.5},{filter:'drop-shadow(0 0 20px #84cc16)'}],1500);
  await wait(1000);flash('#ecfccb',350,.6);dots(30,'#bef264',[2,5],[900,1600]);await wait(1200);await title('وضع الحكيم','هاشيراما — أسطورة الشينوبي','#a3e635',1500)}
});

Object.assign(SCENE_OF,{
 'yama:زانكا نو تاشي':'yaZanka','yama:بانكاي — لهب الشمس':'yaBankai','yama:جدار النار':'yaWall',
 'eren:الرامبل':'erRumble','eren:صرخة المسارات':'erPaths','eren:الرامبل الأخير':'erFinal',
 'raizel:رمح الروح':'raSpear','raizel:قيود الدم':'raChains','raizel:شكل الحرية':'raFreedom',
 'shanks:هاكي الملوك':'shHaki','shanks:غريفون':'shGriffin','shanks:هاكي التسليح':'shArm',
 'zoro:ضربة التسعة سيوف':'zoNine','zoro:ساندورو: ألف سيف':'zoSandoru','zoro:أسورا — ثلاثة سيوف':'zoAsura',
 'dokja:نهاية القصة':'doEnd','dokja:الحقيقة المطلقة':'doTruth','dokja:أبطال الأساطير':'doHeroes'
});
/* ================================================================
   الدفعة 8 — ياماموتو، إيرين، رايزل، شانكس، زورو، كيم دوكجا (3 مشاهد لكل شخصية)
   ================================================================ */
Object.assign(SCENES,{
 /* ---------- ياماموتو ---------- */
 async yaZanka(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const bg=p('',{inset:0,background:'radial-gradient(circle at 27% 50%,#7c2d12,#000 75%)',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.85}],800);
  const sw=p('',{left:'27%',top:'50%',width:Math.min(W*.5,420)+'px',height:'14px',background:'linear-gradient(90deg,#fff,#fb923c 30%,#dc2626)',borderRadius:'8px',boxShadow:'0 0 40px #ea580c,0 0 90px #dc2626',transformOrigin:'0 50%',zIndex:74,opacity:0});
  go(sw,[{transform:'translate(0,-50%) rotate(-70deg) scaleX(.2)',opacity:0},{transform:'translate(0,-50%) rotate(-70deg) scaleX(1)',opacity:1,offset:.5},{transform:'translate(0,-50%) rotate(0deg) scaleX(1.6)',opacity:1}],1500,{easing:'ease-in'});
  pop('زانكا نو تاشي!','#fed7aa','27%','12%',38,1700);dots(50,'#fb923c',[2,6],[1200,2400]);await wait(1500);
  cnBeam(x,'#fed7aa','#dc2626',Math.min(H*.5,200),1300);await wait(450);flash('#fff7ed',500,1);shake(28);ring('#ea580c',9,1300,0,'73%');ring('#fb923c',5,1100,200,'73%');cnHit(d,'brightness(1.5) sepia(1) hue-rotate(-20deg) saturate(4)');
  await wait(1300);rm(sw,bg);await title('زانكا نو تاشي','ياماموتو — القائد العام','#fb923c',1500)},
 async yaBankai(x){const {W,H,p,port,flash,ring,title,pop,dots}=x;const a=port();cnApp(a);await wait(500);
  pop('بانكاي!','#fed7aa','50%','12%',42,1500);
  for(let i=0;i<4;i++)ring('#ea580c',5,1200,i*200);
  for(let i=0;i<18;i++){const f=p('🔥',{left:rnd(36,64)+'%',top:'72%',fontSize:rnd(30,60)+'px',filter:'drop-shadow(0 0 12px #ea580c)',zIndex:80,opacity:0});go(f,[{transform:C(0,0,'scale(.5)'),opacity:0},{transform:C(rnd(-30,30),-H*rnd(.3,.55),'scale(1.2)'),opacity:1,offset:.5},{transform:C(rnd(-40,40),-H*.7,'scale(.8)'),opacity:0}],1300,{delay:i*70/speed})}
  go(a,[{filter:'none'},{filter:'brightness(1.5) sepia(1) hue-rotate(-20deg) saturate(3) drop-shadow(0 0 28px #ea580c)',offset:.5},{filter:'drop-shadow(0 0 24px #fb923c)'}],1500);
  await wait(1000);flash('#fed7aa',400,.7);dots(36,'#fdba74',[2,5],[900,1700]);await wait(1200);await title('بانكاي — لهب الشمس','ياماموتو — القائد العام','#fb923c',1500)},
 async yaWall(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('جدار النار!','#fed7aa','27%','16%',34,1200);await wait(500);
  for(let i=0;i<14;i++){const f=p('',{left:`calc(60% + ${i*2.8}%)`,bottom:'0',width:'46px',height:H*rnd(.5,.95)+'px',background:'linear-gradient(0deg,#7c2d12,#ea580c 40%,#fde047)',borderRadius:'50% 50% 20% 20%',filter:'blur(2px)',boxShadow:'0 0 30px #ea580c',zIndex:76,opacity:0,transformOrigin:'50% 100%'});
   go(f,[{transform:'translateX(-50%) scaleY(0)',opacity:1},{transform:'translateX(-50%) scaleY(1)',opacity:1,offset:.35},{transform:'translateX(-50%) scaleY(1.1)',opacity:0}],1400,{delay:i*60/speed})}
  await wait(900);flash('#ffedd5',350,.7);shake(18);ring('#ea580c',6,1000,0,'73%');cnHit(d,'brightness(1.4) sepia(1) hue-rotate(-20deg) saturate(4)');dots(30,'#fb923c',[2,5],[900,1600]);await wait(1200);await title('جدار النار','ياماموتو — القائد العام','#fb923c',1500)},
 /* ---------- إيرين ---------- */
 async erRumble(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('الرامبل!','#fed7aa','27%','14%',38,1300);
  const ft=p('🦶',{left:'73%',top:'-10%',fontSize:Math.min(H*.7,300)+'px',filter:'sepia(1) saturate(2) drop-shadow(0 0 20px #7c2d12)',zIndex:76,opacity:0});
  go(ft,[{transform:C(0,-H*.4,'scale(1)'),opacity:0},{transform:C(0,H*.45,'scale(1.2)'),opacity:1,offset:.6},{transform:C(0,H*.45,'scale(1.2)'),opacity:1,offset:.9},{transform:C(0,H*.45,'scale(1.2)'),opacity:0}],1500,{delay:500/speed,easing:'ease-in'});
  await wait(1700);flash('#7c2d12',350,.7);shake(30);ring('#92400e',8,1200,0,'73%');cnHit(d,'brightness(.4) sepia(1)');dots(40,'#a16207',[3,7],[1000,1900]);await wait(1200);rm(ft);await title('الرامبل','إيرين — تيتان المؤسس','#ea580c',1500)},
 async erPaths(x){const {W,H,p,port,flash,ring,title,pop,dots}=x;const a=port();cnApp(a);await wait(500);
  const bg=p('',{inset:0,background:'radial-gradient(circle,#78350f55,#000 80%)',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.9}],800);
  pop('تحرّكوا!','#fde68a','50%','12%',40,1600);
  for(let i=0;i<40;i++){const s=p('',{left:rnd(0,100)+'%',top:'0',width:'2px',height:H+'px',background:'linear-gradient(180deg,transparent,#fde68a,transparent)',opacity:0,zIndex:66});go(s,[{opacity:0},{opacity:.8},{opacity:0}],900,{delay:i*35/speed})}
  for(let i=0;i<4;i++)ring('#d97706',5,1200,i*220);
  go(a,[{filter:'none'},{filter:'brightness(1.6) sepia(1) drop-shadow(0 0 28px #f59e0b)',offset:.5},{filter:'drop-shadow(0 0 20px #d97706)'}],1600);
  await wait(1400);flash('#fef3c7',400,.7);shake(12);dots(36,'#fcd34d',[2,5],[900,1700]);await wait(1000);rm(bg);await title('صرخة المسارات','إيرين — تيتان المؤسس','#ea580c',1500)},
 async erFinal(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(500);
  const bg=p('',{inset:0,background:'linear-gradient(#451a03,#000)',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.92}],900);
  pop('سأمحو العالم!','#fed7aa','50%','10%',38,1900);
  for(let i=0;i<16;i++){const t=p('🦶',{left:(10+i*5.5)+'%',top:'60%',fontSize:rnd(60,110)+'px',filter:'sepia(1) saturate(2) brightness(.7) drop-shadow(0 0 14px #92400e)',zIndex:76,opacity:0});
   go(t,[{transform:C(0,-H*.7,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1.1)'),opacity:1,offset:.5},{transform:C(0,0,'scale(1.1)'),opacity:0}],900,{delay:(500+i*110)/speed,easing:'ease-in'});
   setTimeout(()=>{shake(8)},(500+i*110+450)/speed)}
  await wait(2800);flash('#fef3c7',500,.9);shake(34);ring('#d97706',9,1400,0,'73%');cnHit(d,'brightness(.2) sepia(1)');go(d,[{opacity:1},{opacity:.1}],900,{fill:'forwards'});dots(50,'#a16207',[3,8],[1100,2200]);
  await wait(1300);rm(bg);await title('الرامبل الأخير','إيرين — تيتان المؤسس','#ea580c',1500)},
 /* ---------- رايزل ---------- */
 async raSpear(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  const bg=p('',{inset:0,background:'radial-gradient(circle at 27% 50%,#7f1d1d,#000 75%)',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.85}],800);
  const sp=p('',{left:'27%',top:'50%',width:Math.min(W*.6,460)+'px',height:'10px',background:'linear-gradient(90deg,transparent,#ef4444 20%,#fff 60%,#ef4444 85%,transparent)',borderRadius:'6px',boxShadow:'0 0 40px #ef4444,0 0 90px #991b1b',transformOrigin:'0 50%',zIndex:74,opacity:0});
  go(sp,[{transform:'translate(0,-50%) scaleX(.1)',opacity:0},{transform:'translate(0,-50%) scaleX(1)',opacity:1,offset:.4},{transform:'translate(0,-50%) translateX(0) scaleX(1)',opacity:1}],1300);
  pop('رمح الروح!','#fecaca','27%','12%',38,1600);dots(40,'#f87171',[2,5],[1100,2200]);await wait(1300);
  go(sp,[{transform:'translate(0,-50%) translateX(0) scaleX(1)',opacity:1},{transform:`translate(0,-50%) translateX(${W*.46}px) scaleX(1)`,opacity:1,offset:.7},{transform:`translate(0,-50%) translateX(${W*.46}px) scaleX(.2)`,opacity:0}],600,{easing:'ease-in'});
  await wait(620);flash('#fee2e2',450,.9);shake(26);ring('#ef4444',8,1200,0,'73%');cnHit(d,'brightness(1.8) hue-rotate(-30deg) saturate(3)');dots(30,'#fca5a5',[2,5],[900,1600]);
  await wait(1200);rm(sp,bg);await title('رمح الروح','رايزل — النبيل','#ef4444',1500)},
 async raChains(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('قيودي حولك.','#fecaca','27%','16%',32,1500);await wait(400);
  for(let i=0;i<8;i++){const ang=(i/8)*360,r=Math.min(W,H)*.3;
   const ch=p('',{left:'73%',top:'50%',width:'8px',height:r+'px',background:'linear-gradient(180deg,#fecaca,#dc2626 40%,#7f1d1d)',borderRadius:'6px',boxShadow:'0 0 14px #ef4444',transformOrigin:'50% 0',zIndex:76,opacity:0});
   go(ch,[{transform:`translate(-50%,0) rotate(${ang}deg) translateY(${r*1.4}px) scaleY(.1)`,opacity:0},{transform:`translate(-50%,0) rotate(${ang}deg) translateY(0) scaleY(1)`,opacity:1}],700,{delay:i*80/speed,fill:'forwards',easing:'ease-in'});setTimeout(()=>rm(ch),2400/speed)}
  await wait(1000);ring('#ef4444',4,900,0,'73%');go(d,[{filter:'none'},{filter:'grayscale(.8) brightness(.6) drop-shadow(0 0 16px #ef4444)'}],900,{fill:'forwards'});flash('#fee2e2',350,.6);shake(10);dots(24,'#f87171',[2,4],[900,1500]);
  await wait(1400);await title('قيود الدم','رايزل — النبيل','#ef4444',1500)},
 async raFreedom(x){const {W,H,p,port,flash,ring,title,pop,dots}=x;const a=port();cnApp(a);await wait(500);
  const bg=p('',{inset:0,background:'#000',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.85}],700);
  pop('أُطلقُ قوتي.','#fecaca','50%','12%',36,1500);
  go(a,[{filter:'none'},{filter:'brightness(.5) drop-shadow(0 0 30px #ef4444)',offset:.3},{filter:'brightness(1.4) drop-shadow(0 0 34px #ef4444)'}],1600);
  for(let i=0;i<5;i++)ring('#ef4444',5,1200,i*220);
  for(let i=0;i<7;i++){const l=p('',{left:'50%',top:'50%',width:'5px',height:H*.8+'px',background:'linear-gradient(180deg,transparent,#ef4444,transparent)',zIndex:80,opacity:0,transformOrigin:'50% 50%'});go(l,[{transform:`translate(-50%,-50%) rotate(${i*26}deg) scaleY(.1)`,opacity:0},{transform:`translate(-50%,-50%) rotate(${i*26}deg) scaleY(1)`,opacity:1,offset:.5},{transform:`translate(-50%,-50%) rotate(${i*26}deg) scaleY(1)`,opacity:0}],1200,{delay:i*80/speed})}
  await wait(1100);flash('#fee2e2',400,.8);shake(14);dots(36,'#fca5a5',[2,5],[900,1700]);await wait(1100);rm(bg);await title('شكل الحرية','رايزل — النبيل','#ef4444',1500)},
 /* ---------- شانكس ---------- */
 async shHaki(x){const {W,H,p,port,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(500);
  pop('اثبت.','#fecaca','27%','14%',40,1200);
  for(let i=0;i<4;i++){const w=p('',{left:'27%',top:'50%',width:'160px',height:H*.8+'px',borderRadius:'50%',border:'4px solid #dc2626',boxShadow:'0 0 30px #dc2626',zIndex:70,opacity:0});
   go(w,[{transform:C(0,0,'scale(.2,.4)'),opacity:1},{transform:C(0,0,`scale(${W*.012},1.4)`),opacity:0}],1000,{delay:i*220/speed})}
  for(let i=0;i<10;i++){const b=p('⚡',{left:rnd(35,95)+'%',top:rnd(10,80)+'%',fontSize:rnd(24,50)+'px',filter:'drop-shadow(0 0 10px #dc2626) hue-rotate(-40deg)',zIndex:78,opacity:0});go(b,[{opacity:0},{opacity:1},{opacity:0}],500,{delay:(400+i*110)/speed})}
  go(d,[{transform:C(0,0,'scale(1)'),filter:'none'},{transform:C(0,12,'scale(.88)'),filter:'brightness(.6)'}],1400,{delay:500/speed,fill:'forwards'});
  await wait(1500);flash('#450a0a',350,.7);shake(16);ring('#dc2626',6,1000,0,'73%');await wait(1000);await title('هاكي الملوك','شانكس — الإمبراطور ذو الشعر الأحمر','#ef4444',1500)},
 async shGriffin(x){const {W,H,p,flash,ring,title,pop,dots,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  pop('غريفون!','#fecaca','27%','14%',40,1200);
  const sl=p('',{left:'27%',top:'50%',width:Math.min(W*.5,380)+'px',height:'8px',background:'linear-gradient(90deg,#fff,#ef4444,#7f1d1d)',boxShadow:'0 0 30px #ef4444',borderRadius:'6px',transformOrigin:'0 50%',zIndex:74,opacity:0});
  go(sl,[{transform:'translate(0,-50%) rotate(-50deg) scaleX(.2)',opacity:0},{transform:'translate(0,-50%) rotate(-50deg) scaleX(1)',opacity:1,offset:.5},{transform:'translate(0,-50%) rotate(30deg) scaleX(1)',opacity:1}],900,{easing:'ease-in'});
  await wait(900);for(let i=0;i<6;i++)slashLine('#fecaca',-20+i*8,W*.5,400,i*70,4,'73%','50%');
  const gf=p('🦅',{left:'40%',top:'45%',fontSize:Math.min(H*.35,150)+'px',filter:'drop-shadow(0 0 24px #dc2626) saturate(0) brightness(.4) sepia(1) hue-rotate(-30deg) saturate(5)',zIndex:78,opacity:0});
  go(gf,[{transform:C(0,0,'scale(.4)'),opacity:0},{transform:C(W*.33,0,'scale(1.3)'),opacity:1,offset:.7},{transform:C(W*.33,0,'scale(1.8)'),opacity:0}],900,{easing:'ease-in'});
  await wait(900);flash('#fee2e2',450,.9);shake(24);ring('#dc2626',8,1200,0,'73%');cnHit(d,'brightness(1.8) hue-rotate(-30deg)');dots(30,'#f87171',[2,5],[900,1600]);
  await wait(1100);rm(sl);await title('غريفون','شانكس — الإمبراطور ذو الشعر الأحمر','#ef4444',1500)},
 async shArm(x){const {W,H,p,port,flash,ring,title,pop,dots}=x;const a=port();cnApp(a);await wait(500);
  pop('هاكي أسود.','#e5e7eb','50%','14%',38,1400);
  go(a,[{filter:'none'},{filter:'brightness(.5) contrast(1.4) drop-shadow(0 0 22px #dc2626)',offset:.5},{filter:'brightness(.6) drop-shadow(0 0 20px #7f1d1d)'}],1500);
  for(let i=0;i<3;i++)ring('#111827',4,1100,i*240);
  for(let i=0;i<14;i++){const s=p('',{left:rnd(40,60)+'%',top:rnd(30,70)+'%',width:rnd(4,10)+'px',height:rnd(30,70)+'px',background:'linear-gradient(180deg,#000,#dc2626)',boxShadow:'0 0 10px #dc2626',zIndex:80,opacity:0});go(s,[{transform:C(0,20),opacity:0},{transform:C(0,-30),opacity:1,offset:.5},{transform:C(0,-60),opacity:0}],1000,{delay:i*70/speed})}
  await wait(1000);flash('#000',400,.6);dots(30,'#ef4444',[2,5],[900,1600]);await wait(1100);await title('هاكي التسليح','شانكس — الإمبراطور ذو الشعر الأحمر','#ef4444',1500)},
 /* ---------- زورو ---------- */
 async zoNine(x){const {W,H,p,flash,ring,title,pop,dots,slashLine}=x;const [a,d]=cnPair(x);await wait(500);
  const bg=p('',{inset:0,background:'radial-gradient(circle,#14532d99,#000 75%)',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.9}],800);
  const dm=p('👹',{left:'27%',top:'40%',fontSize:Math.min(H*.6,260)+'px',filter:'drop-shadow(0 0 30px #16a34a) hue-rotate(60deg)',zIndex:62,opacity:0});
  go(dm,[{transform:C(0,20,'scale(.4)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:.9}],1000);pop('أسورا: تسعة سيوف!','#bbf7d0','27%','10%',34,1800);
  dots(40,'#4ade80',[2,5],[1200,2400]);await wait(1300);
  for(let i=0;i<9;i++)slashLine(i%2?'#4ade80':'#fff',-70+i*18,W*.55,420,i*110,4,'73%','50%');
  await wait(1200);flash('#f0fdf4',500,1);shake(28);ring('#22c55e',8,1200,0,'73%');cnHit(d,'brightness(2) hue-rotate(60deg)');go(d,[{opacity:1},{opacity:.2}],700,{fill:'forwards'});
  await wait(1100);rm(bg,dm);await title('ضربة التسعة سيوف','زورو — سيّاف الأسورا','#4ade80',1500)},
 async zoSandoru(x){const {W,H,p,flash,ring,title,pop,dots,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  pop('ساندورو!','#bbf7d0','27%','14%',38,1200);await wait(500);
  for(let i=0;i<14;i++)slashLine(i%3?'#4ade80':'#fff',rnd(-80,80),W*rnd(.3,.6),380,i*70,rnd(3,5),(62+rnd(0,22))+'%',rnd(25,75)+'%');
  await wait(1400);flash('#dcfce7',350,.8);shake(20);ring('#22c55e',6,1000,0,'73%');cnHit(d,'brightness(1.8) hue-rotate(60deg)');dots(30,'#86efac',[2,5],[900,1600]);await wait(1100);await title('ساندورو: ألف سيف','زورو — سيّاف الأسورا','#4ade80',1500)},
 async zoAsura(x){const {W,H,p,flash,ring,title,pop,dots,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  pop('أسورا!','#bbf7d0','27%','14%',40,1200);
  ['#22c55e','#4ade80','#bbf7d0'].forEach((c,i)=>{const s=p('',{left:'27%',top:'50%',width:Math.min(W*.45,340)+'px',height:'7px',background:`linear-gradient(90deg,#fff,${c})`,boxShadow:`0 0 24px ${c}`,borderRadius:'5px',transformOrigin:'0 50%',zIndex:74,opacity:0});
   go(s,[{transform:`translate(0,-50%) rotate(${-40+i*40}deg) scaleX(.2)`,opacity:0},{transform:`translate(0,-50%) rotate(${-40+i*40}deg) scaleX(1)`,opacity:1,offset:.5},{transform:`translate(${W*.4}px,-50%) rotate(${-40+i*40}deg) scaleX(1)`,opacity:0}],1000,{delay:i*100/speed,easing:'ease-in'})});
  await wait(1200);for(let i=0;i<3;i++)slashLine('#fff',-35+i*35,W*.5,380,i*90,5,'73%','50%');
  await wait(700);flash('#dcfce7',350,.8);shake(18);ring('#22c55e',6,1000,0,'73%');cnHit(d,'brightness(1.8) hue-rotate(60deg)');dots(26,'#86efac',[2,5],[900,1500]);await wait(1000);await title('أسورا — ثلاثة سيوف','زورو — سيّاف الأسورا','#4ade80',1500)},
 /* ---------- كيم دوكجا ---------- */
 async doEnd(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(500);
  const bg=p('',{inset:0,background:'#020617',zIndex:58,opacity:0});go(bg,[{opacity:0},{opacity:.93}],800);
  const lines=['القصة الأخيرة','النهاية','الفصل الأخير','THE END'];
  for(let i=0;i<14;i++){const t=p(lines[i%4],{left:rnd(8,92)+'%',top:rnd(18,82)+'%',fontSize:rnd(14,30)+'px',fontWeight:900,color:'#7dd3fc',textShadow:'0 0 12px #38bdf8',zIndex:66,opacity:0,whiteSpace:'nowrap'});go(t,[{transform:C(0,20),opacity:0},{transform:C(0,0),opacity:.9,offset:.4},{transform:C(0,-20),opacity:0}],1400,{delay:i*110/speed})}
  pop('القصة الأخيرة!','#bae6fd','27%','12%',38,1800);await wait(1900);
  cnBeam(x,'#e0f2fe','#0ea5e9',Math.min(H*.4,170),1200);await wait(420);flash('#f0f9ff',500,1);shake(22);ring('#38bdf8',8,1200,0,'73%');go(d,[{opacity:1,filter:'none'},{opacity:0,filter:'brightness(3) hue-rotate(160deg)'}],800);
  dots(40,'#7dd3fc',[2,5],[1000,2000]);await wait(1300);rm(bg);await title('نهاية القصة','كيم دوكجا — القارئ','#38bdf8',1500)},
 async doTruth(x){const {W,H,p,port,flash,ring,title,pop,dots}=x;const a=port();cnApp(a);await wait(500);
  pop('أعرف نهاية القصة.','#bae6fd','50%','12%',32,1600);
  const bk=p('📖',{left:'50%',top:'52%',fontSize:Math.min(H*.5,220)+'px',filter:'drop-shadow(0 0 30px #38bdf8)',zIndex:70,opacity:0});
  go(bk,[{transform:C(0,30,'scale(.3) rotate(-20deg)'),opacity:0},{transform:C(0,0,'scale(1) rotate(0)'),opacity:1,offset:.5},{transform:C(0,-30,'scale(1.4)'),opacity:0}],1700);
  for(let i=0;i<4;i++)ring('#38bdf8',4,1100,i*240);
  for(let i=0;i<18;i++){const s=p('✨',{left:'50%',top:'52%',fontSize:rnd(14,26)+'px',zIndex:80,opacity:0});go(s,[{transform:C(0,0),opacity:1},{transform:C(rnd(-140,140),rnd(-120,100)),opacity:0}],1200,{delay:(500+i*40)/speed})}
  go(a,[{filter:'none'},{filter:'brightness(1.5) drop-shadow(0 0 26px #38bdf8)',offset:.5},{filter:'drop-shadow(0 0 20px #0ea5e9)'}],1600);
  await wait(1300);flash('#e0f2fe',400,.7);dots(30,'#7dd3fc',[2,5],[900,1600]);await wait(1000);await title('الحقيقة المطلقة','كيم دوكجا — القارئ','#38bdf8',1500)},
 async doHeroes(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('أبطال الأساطير!','#bae6fd','27%','14%',34,1500);
  const em=['⚔️','🏹','🔱','🛡️','🐉','🗡️'];
  for(let i=0;i<12;i++){const h=p(em[i%6],{left:'27%',top:'50%',fontSize:rnd(36,60)+'px',filter:'drop-shadow(0 0 14px #38bdf8)',zIndex:76,opacity:0});const ty=rnd(-80,80);
   go(h,[{transform:C(rnd(-40,40),rnd(-60,60),'scale(.4)'),opacity:0},{transform:C(rnd(0,60),rnd(-60,60),'scale(1)'),opacity:1,offset:.25},{transform:C(W*.46,ty,'scale(1.1)'),opacity:1,offset:.85},{transform:C(W*.46,ty,'scale(1.7)'),opacity:0}],1200,{delay:(400+i*100)/speed,easing:'ease-in'});
   ring('#38bdf8',2,420,400+i*100+1000,'73%',`calc(50% + ${ty}px)`)}
  await wait(2300);flash('#e0f2fe',350,.8);shake(18);cnHit(d,'brightness(1.8) hue-rotate(160deg)');dots(30,'#7dd3fc',[2,5],[900,1600]);await wait(900);await title('أبطال الأساطير','كيم دوكجا — القارئ','#38bdf8',1500)}
});

/* ---- مشاهد منقولة من draft-demo-video-v3: كايدو (التنين) وزورو (أسورا) ---- */
const pw0=x=>Math.min(x.H*.66,300)*.72;
Object.assign(SCENE_OF,{'kaido:صرخة التنين':'dragon','zoro:أسورا — ثلاثة سيوف':'asura'});
Object.assign(SCENES,{
 async dragon(x){
   const {W,H,p,port,flash,ring,title,pop,bolts}=x;
   const por=port({filter:'brightness(.75)'});
   go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400);
   const cl=[...Array(7)].map((_,i)=>p('⛈️',{left:(8+i*14)+'%',top:'16%',fontSize:'70px',opacity:0,zIndex:59,filter:'brightness(.5)'}));
   cl.forEach((c,i)=>go(c,[{transform:C(0,-30,'scale(.5)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:.9}],900,{delay:i*80/speed}));
   await wait(700);
   for(let i=0;i<3;i++){ bolts(x.col,3+i); flash('#bfdbfe',320,.8); shake(8+i*4); go(por,[{transform:C(0,0,'scale(1)')},{transform:C(0,0,`scale(${.93-i*.04}) rotate(${i%2?-3:3}deg)`)},{transform:C(0,0,'scale(1)')}],360,{fill:'none'}); await wait(520); }
   go(por,[{filter:'brightness(.75)'},{filter:'brightness(0)'}],500); await wait(450);
   const dr=p('🐉',{left:'50%',top:'50%',fontSize:Math.min(H*.7,300)+'px',zIndex:70,filter:`hue-rotate(80deg) saturate(1.5) drop-shadow(0 0 30px ${x.col}) drop-shadow(0 0 60px ${x.col})`,opacity:0});
   const kf=[]; for(let j=0;j<=20;j++){ const a=j/20*Math.PI*3; const r=(1-j/20)*W*.32+40; kf.push({transform:C(Math.cos(a)*r,Math.sin(a)*r*.5,`scale(${.5+j/20*.9}) rotate(${a*57-20}deg)`),opacity:j===0?0:1}); }
   go(dr,kf,1800,{easing:'linear'}); ring(x.col,5,1200,300); ring('#fff',6,1400,800); await wait(1700);
   flash(x.col,700,1);
   go(por,[{filter:'brightness(0)'},{filter:'brightness(3)'},{filter:'hue-rotate(170deg) saturate(1.8) brightness(1.15) drop-shadow(0 0 24px #38bdf8)'}],700);
   go(por,[{transform:C(0,0,'scale(1)')},{transform:C(0,0,'scale(1.28)')}],700);
   go(dr,[{transform:C(0,0,'scale(1.4)'),opacity:1},{transform:C(0,-30,'scale(2.4)'),opacity:0}],800);
   shake(14); pop('رووووووار!!',x.col,'50%','24%',50,1300); ring(x.col,6,1000);
   const fl=[...Array(8)].map((_,i)=>p('🔥',{left:(30+i*6)+'%',top:'72%',fontSize:'44px',zIndex:64,filter:'hue-rotate(190deg) drop-shadow(0 0 10px #38bdf8)',opacity:0}));
   fl.forEach((f,i)=>go(f,[{transform:C(0,20,'scale(.3)'),opacity:0},{transform:C(0,-30,'scale(1.2)'),opacity:1,offset:.5},{transform:C(0,-80,'scale(.6)'),opacity:0}],900,{delay:i*70/speed}));
   await wait(900); await title('الشكل التنيني — سيّد السماء','وحش الوحوش',x.col,1800);
 },
 async asura(x){
   const {W,p,port,flash,ring,title,pop,orbit}=x;
   const por=port();
   go(por,[{transform:C(0,0,'scale(.8)'),opacity:0},{transform:C(0,0,'scale(1)'),opacity:1}],400); await wait(500);
   ring('#a855f7',4,1000); ring('#ef4444',5,1200,200);
   const g1=port({opacity:0,filter:'hue-rotate(250deg) saturate(2)',zIndex:61}), g2=port({opacity:0,filter:'hue-rotate(320deg) saturate(2)',zIndex:61});
   go(g1,[{transform:C(0,0),opacity:0},{transform:C(-pw0(x),0),opacity:.65}],900); go(g2,[{transform:C(0,0),opacity:0},{transform:C(pw0(x),0),opacity:.65}],900);
   shake(6); await wait(700);
   const f=['👹','👹','👹'].map((e,i)=>p(e,{left:(30+i*20)+'%',top:'31%',fontSize:'58px',zIndex:66,opacity:0,filter:'drop-shadow(0 0 14px #7c3aed)'}));
   f.forEach((e,i)=>go(e,[{transform:C(0,20,'scale(.2)'),opacity:0},{transform:C(0,0,'scale(1.2)'),opacity:1,offset:.5},{transform:C(0,0,'scale(1)'),opacity:.9}],800,{delay:i*160/speed}));
   orbit('🗡️',9,Math.min(W*.28,230),2200,{size:36,filter:'drop-shadow(0 0 10px #a855f7)',turns:2});
   await wait(900); flash('#7c3aed',500,.9);
   go(por,[{filter:'none'},{filter:'hue-rotate(250deg) saturate(1.6) contrast(1.15) drop-shadow(0 0 26px #7c3aed)'}],500);
   pop('ثلاثة رؤوس… تسعة سيوف','#e9d5ff','50%','19%',32,1400); shake(10);
   for(let i=0;i<5;i++){ const sl=p('',{left:rnd(20,80)+'%',top:rnd(30,70)+'%',width:'260px',height:'7px',background:'linear-gradient(90deg,transparent,#fff,#a855f7,transparent)',boxShadow:'0 0 16px #a855f7',zIndex:70,opacity:0}); const a=rnd(-70,70); go(sl,[{transform:C(0,0,`rotate(${a}deg) scaleX(0)`),opacity:1},{transform:C(0,0,`rotate(${a}deg) scaleX(1)`),opacity:1,offset:.5},{transform:C(0,0,`rotate(${a}deg) scaleX(1)`),opacity:0}],450,{delay:i*140/speed}); }
   await wait(1100); await title('أسورا — نين تو ريو','الشبح ذو التسعة سيوف','#c084fc',1900);
 }
});

Object.assign(SCENE_OF,{
 'kaido:نفس البلازما':'boroBreath','kaido:ثاندر باغوا':'thunderBagua',
 'naruto:ريسين شوريكين':'rasenshuriken','naruto:وضع باريون':'baryonMode','naruto:ضربة الكيوبي':'kyubiStrike','naruto:استنساخ الظل':'shadowClone'
});
Object.assign(SCENES,{
 /* ---------- كايدو ---------- */
 async boroBreath(x){const {W,H,p,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(550);
  pop('بلازما!','#bae6fd','27%','14%',36,1300);
  const dr=p('🐉',{left:'27%',top:'40%',fontSize:'110px',zIndex:70,opacity:0,filter:'hue-rotate(80deg) drop-shadow(0 0 22px #38bdf8)'});
  go(dr,[{transform:C(0,20,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(1.1)'),opacity:1}],700);
  const o=cnOrb(x,'#f97316','34%',36);go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(2.6)'),opacity:1}],900);
  dots(26,'#fdba74',[2,5],[900,1600]);ring('#f97316',3,900,300,'34%');await wait(950);
  cnBeam(x,'#fb923c','#38bdf8',Math.min(H*.3,130),1300);
  for(let i=0;i<9;i++){const f=p('🔥',{left:'34%',top:'50%',fontSize:rnd(36,60)+'px',filter:'drop-shadow(0 0 12px #f97316) hue-rotate(190deg)',zIndex:76,opacity:0});const ty=rnd(-45,45);
   go(f,[{transform:C(0,ty/2,'scale(.6)'),opacity:1},{transform:C(W*.38,ty,'scale(1.3)'),opacity:1,offset:.85},{transform:C(W*.38,ty,'scale(1.9)'),opacity:0}],700,{delay:i*90/speed,easing:'ease-in'})}
  await wait(600);flash('#ffedd5',380,.9);shake(16);ring('#f97316',6,1000,0,'73%');ring('#38bdf8',4,900,200,'73%');
  cnHit(d,'brightness(1.6) sepia(1) hue-rotate(-20deg) saturate(3)');dots(30,'#fb923c',[2,5],[900,1600]);
  await wait(900);await title('نفس البلازما','كايدو — الكائن الأقوى','#fb923c',1500)},
 async thunderBagua(x){const {W,p,flash,ring,title,pop,dots,bolts}=x;const [a,d]=cnPair(x);await wait(500);
  pop('ثاندر باغوا!','#bfdbfe','27%','14%',34,1300);
  const club=p('🔨',{left:'27%',top:'34%',fontSize:'110px',zIndex:72,opacity:0,filter:'drop-shadow(0 0 20px #60a5fa)'});
  go(club,[{transform:C(0,0,'scale(.5) rotate(-60deg)'),opacity:0},{transform:C(0,-10,'scale(1.3) rotate(-85deg)'),opacity:1}],800);
  await wait(850);bolts('#60a5fa',4);flash('#bfdbfe',220,.5);await wait(300);
  await go(club,[{transform:C(0,-10,'scale(1.3) rotate(-85deg)'),opacity:1},{transform:C(W*.46,40,'scale(1.6) rotate(35deg)'),opacity:1}],320,{easing:'ease-in'});
  flash('#dbeafe',350,.95);shake(24);ring('#60a5fa',7,1000,0,'73%');ring('#fff',4,700,100,'73%');bolts('#93c5fd',6);
  cnHit(d,'brightness(2) hue-rotate(180deg)');dots(34,'#93c5fd',[2,6],[900,1800]);
  await wait(1000);await title('ثاندر باغوا','كايدو — الكائن الأقوى','#60a5fa',1500)},
 /* ---------- ناروتو ---------- */
 async rasenshuriken(x){const {W,p,flash,ring,title,pop,dots,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  pop('ريسين شوريكين!','#7dd3fc','27%','14%',32,1300);
  const o=cnOrb(x,'#38bdf8','34%',34);go(o,[{transform:C(0,0,'scale(.3)'),opacity:0},{transform:C(0,0,'scale(2.4)'),opacity:1}],900);
  const sh=p('🌀',{left:'34%',top:'50%',fontSize:'96px',zIndex:74,opacity:0,filter:'drop-shadow(0 0 20px #38bdf8) brightness(1.3)'});
  go(sh,[{transform:C(0,0,'scale(.3) rotate(0deg)'),opacity:1},{transform:C(0,0,'scale(1.4) rotate(720deg)'),opacity:1}],900,{easing:'linear'});
  dots(26,'#bae6fd',[2,5],[900,1600]);await wait(950);
  await go(sh,[{transform:C(0,0,'scale(1.4) rotate(0deg)'),opacity:1},{transform:C(W*.39,0,'scale(1.6) rotate(1080deg)'),opacity:1}],550,{easing:'ease-in'});
  go(o,[{opacity:1},{opacity:0}],300);
  flash('#e0f2fe',400,.95);shake(18);ring('#38bdf8',7,1000,0,'73%');
  go(sh,[{transform:C(W*.39,0,'scale(1.6)'),opacity:1},{transform:C(W*.39,0,'scale(4.5)'),opacity:0}],700);
  for(let i=0;i<6;i++)slashLine('#7dd3fc',rnd(-80,80),170,450,i*70,4,'73%','50%');
  cnHit(d,'brightness(1.8) hue-rotate(160deg)');dots(34,'#bae6fd',[2,6],[900,1800]);
  await wait(1100);await title('ريسين شوريكين','ناروتو — بطل الشينوبي','#38bdf8',1500)},
 async baryonMode(x){const {port,flash,ring,title,pop,rays,bolts,dots,orbit}=x;const a=port();cnApp(a);await wait(500);
  rays('#fde047',1800);dots(50,'#fde047',[2,6],[1500,3000]);
  go(a,[{filter:'none'},{filter:'brightness(1.4) sepia(1) saturate(3) hue-rotate(-10deg) drop-shadow(0 0 30px #fbbf24)'}],900);
  orbit('🦊',4,110,2200,{size:34,filter:'drop-shadow(0 0 12px #f97316)',turns:1,z:66});
  ring('#fde047',4,900);ring('#f97316',6,1100,250);await wait(800);bolts('#fde047',5);
  pop('سأحمي الجميع!','#fef08a','50%','16%',34,1400);flash('#fde047',500,.7);shake(10);
  await wait(1300);await title('وضع باريون','ناروتو — بطل الشينوبي','#fde047',1500)},
 async kyubiStrike(x){const {W,H,p,flash,ring,title,pop,dots,slashLine}=x;const [a,d]=cnPair(x);await wait(550);
  pop('هذا طريقي!','#fed7aa','27%','14%',34,1300);
  const fx=p('🦊',{left:'27%',top:'50%',fontSize:Math.min(H*.75,300)+'px',zIndex:60,opacity:0,filter:'drop-shadow(0 0 40px #f97316) saturate(2.2)'});
  go(fx,[{transform:C(0,0,'scale(.4)'),opacity:0},{transform:C(0,0,'scale(1.2)'),opacity:.85}],900);
  dots(34,'#fb923c',[2,6],[1100,2000]);ring('#f97316',5,1000,200,'27%');await wait(1000);
  for(let i=0;i<3;i++)slashLine('#f97316',-35+i*8,W*.55,480,i*130,10,(60+i*5)+'%',(40+i*8)+'%');
  cnBeam(x,'#fb923c','#fde047',Math.min(H*.3,120),1100,300);await wait(900);
  go(fx,[{transform:C(0,0,'scale(1.2)'),opacity:.85},{transform:C(W*.3,0,'scale(1.6)'),opacity:0}],600);
  flash('#ffedd5',420,1);shake(26);ring('#f97316',9,1200,0,'73%');cnHit(d,'brightness(.4) sepia(1) hue-rotate(-20deg) saturate(4)');
  await wait(1200);await title('ضربة الكيوبي','ناروتو — بطل الشينوبي','#fb923c',1600)},
 async shadowClone(x){const {W,p,port,flash,ring,title,pop,dots}=x;const [a,d]=cnPair(x);await wait(500);
  pop('استنساخ الظل!','#fde68a','27%','14%',32,1300);
  const cl=[],off=[[-70,-55],[-70,55],[-130,0],[-40,-110],[-40,110]];
  off.forEach(([ox,oy],i)=>{const c=port({left:'27%',opacity:0,zIndex:63});cl.push(c);
   go(c,[{transform:C(0,0,'scale(.6)'),opacity:0},{transform:C(ox,oy,'scale(.62)'),opacity:1}],450,{delay:i*110/speed});
   setTimeout(()=>{ring('#e5e7eb',2,500,0,`calc(27% + ${ox}px)`,`calc(50% + ${oy}px)`)},i*110/speed)});
  dots(30,'#e5e7eb',[2,5],[900,1600]);await wait(1100);
  cl.forEach((c,i)=>{const [ox,oy]=off[i];go(c,[{transform:C(ox,oy,'scale(.62)'),opacity:1},{transform:C(W*.44,rnd(-40,40),'scale(.7)'),opacity:1,offset:.85},{transform:C(W*.44,0,'scale(.9)'),opacity:0}],520,{delay:i*90/speed,easing:'ease-in'})});
  await wait(1000);flash('#fff',320,.8);shake(14);ring('#fde047',5,900,0,'73%');cnHit(d);
  await wait(900);await title('استنساخ الظل','ناروتو — بطل الشينوبي','#fde047',1500)}
});

const seenScene=new Set();
async function X(a,A,D,E){if(skip)return;
 const m=FXM[a.n],kind=m?m[0]:(a.t=='H'||a.t=='G'||a.t=='B'||a.t=='S'?DEFK[a.t]:DEFX[a.fx]||'beam'),col=m?m[1]:A.c.col,self=A==D,st=$('fxl'),ar=$('arena');
 const O=T[1-A.k][cur[1-A.k]], key=A.c.id+':'+a.n, sc=SCENE_OF[key], sk=key+A.k;
 const b=document.createElement('div');b.className='bn';b.textContent=`${A.c.n} — ${a.n}`;b.style.color=A.c.col;st.appendChild(b);setTimeout(()=>b.remove(),1100/speed);
 const fa=$('f'+(A.k+1)),fd=$('f'+(D.k+1));fa.classList.add('atk');setTimeout(()=>fa.classList.remove('atk'),400);
 // لانهاية غوجو تصدّ الهجوم: المقذوفات تتباطأ ولا تصل
 if(E&&E.some(e=>e.k=='block')&&D.c.id=='gojo'&&!self){ await infinityBlock(A,D,a,col); return; }
 // مشهد سينمائي: أول استخدام لكل قدرة (والضربات القاضية دائماً)
 if(sc&&(!seenScene.has(sk)||a.t=='K')){
  seenScene.add(sk);
  await cine(A,A.k,{n:a.n,t:a.t,col},sc,O);
  if(!skip&&(a.t=='A'||a.t=='K'||a.t=='S')){ await burst(rel(fd),col,230); shake(12); fd.classList.add('hit'); setTimeout(()=>fd.classList.remove('hit'),450); }
  return;
 }
 if(a.t=='K'||a.c>=4)ar.animate([{filter:'none'},{filter:'invert(1) hue-rotate(90deg)'},{filter:'none'}],{duration:700});
 await fx2(kind,col,A.k,D.k);if(!self){fd.classList.add('hit');setTimeout(()=>fd.classList.remove('hit'),450)}}

async function report(E,A,D,a){for(const e of E){const N=A.c.n,M=D.c.n;
 if(e.k=='heal'){floatText(A.k,'+'+e.g+'%','#86efac')}if(e.k=='dmg')floatText(D.k,'-'+e.d+'%','#f87171');if(e.k=='kill')floatText(D.k,'☠️','#fff');if(e.k=='imm'||e.k=='block')floatText(D.k,e.k=='block'&&D.c.id=='gojo'?'♾️':'🚫','#7dd3fc');
 if(e.k=='heal')L(`💚 ${N} يستخدم «${a.n}» ويستعيد ${e.g}%`,'he');
 else if(e.k=='buff')L(`🔺 ${N} يرفع قوته بـ «${a.n}» — ثلاث ضربات ×1.5`,'sp');
 else if(e.k=='guard')L(`🛡️ ${N} يتحصّن بـ «${a.n}»`,'sp');
 else if(e.k=='block'){L(D.c.id=='gojo'?`♾️ «${a.n}» من ${N} تتباطأ ولا تصل — ${M} خلف اللانهاية`:`🛡️ ${M} يصدّ «${a.n}» بالكامل`,'dg')}
 else if(e.k=='imm'){L(`🚫 «${a.n}» من ${N} لا تؤثر في ${M} — منيع ضد ${TN[a.tag]}`,'dg')}
 else if(e.k=='rev'&&e.und){floatText(D.k,'♾️ لا يموت','#c4b5fd');L(`♾️ ${M} لا يموت — جسده يُعاد بناؤه وينهض بـ${D.hp}% (تجدّد ${e.und}/4)`,'cr');if(!skip){const fl=put('',{inset:0,background:'#a78bfa',opacity:0,zIndex:50});go(fl,[{opacity:.5},{opacity:0}],700).then(()=>fl.remove())}}
 else if(e.k=='rev'){if(D.c.id=='luffy'&&!D.tf&&!skip){D.tf=1;await fullTF('white','l')}floatText(D.k,'💢 لا يسقط!','#fca5a5');L(`💢 ${M} يرفض السقوط — ينهض بـ12% وقوته ×1.5 (ثلاث ضربات)`,'cr')}
 else if(e.k=='stun')L(`⏳ «${a.n}» تشلّ ${M} دوره القادم`,'sp');
  else if(e.k=='resist')L(`🛡️ ${M} يقاوم «${a.n}» — لا يمكن شلّه دورين متتاليين`,'dg');
 else if(e.k=='kill'){L(`☠️ «${a.n}» من ${N} تنهي ${M} فوراً!`,'cr')}
 else if(e.k=='dmg'){
  if(e.ad===0&&D.c.adapt)L(`👁️ ${M} يراقب «${a.n}» ويحفظ نمطها`,'why');
  L(`💥 ${N}: «${a.n}» تصيب ${M} بـ ${e.d}%`+(e.m>1?' — نقطة ضعف!':e.m<1?' — مقاومة':'')+(e.ad?` — ${M} يتأقلم مع هذه الحركة`:''),'cr')}}}

/* زورو: قبل التحوّل صورة البطاقة، وبعد التحوّل (أسورا) صورة التحوّل + فيديو بنفس نموذج جوي بوي */
function zoroForm(F){
  F.card[5]=afterImg('zoro')||F.card[5];
  const el=$('f'+(F.k+1));el.dataset.key='';draw();
  const cd=el.querySelector('.card');
  if(cd&&!skip)go(cd,[{filter:'brightness(3) saturate(1.6)'},{filter:'none'}],900,{fill:'none'});
  L(`👹 ${F.c.n} يتحوّل — أسورا: ثلاثة رؤوس وتسعة سيوف`,'cr');
}
async function fight(){const id=++bid;skip=0;seenScene.clear();USED.clear();lastTalk=-9;
 T=teams.map((t,k)=>t.map(c=>mkF(c,k)));cur=[0,0];$('log').innerHTML='';$('endBox').classList.add('hide');
 ['f1','f2'].forEach(i=>{$(i).dataset.key=''});
 if(!$('fxl')){const d=document.createElement('div');d.id='fxl';$('arena').appendChild(d)}
 show('battle');draw();LR=mulberry32(ROOM.seed);let t=ROOM.first,n=0,pair='';const futile={};let stall=0,lastSig=-1,lastPk='';FORCE=0;
 L(`⚔️ بدأت المعركة! يبدأ <b>${esc(names[t])}</b> (حسمه الحظ في البداية)`,'dd');
 [0,1].forEach(i=>{const f=T[i][0];L(`🎭 ${f.c.n}: ${STYLE_TAG[f.c.id]}${f.c.adapt?' • يتعلّم من خصمه':''}${f.c.undying?' • لا يموت (يتجدّد حتى 4 مرات)':f.c.rev?' • إرادة لا تنكسر':''}`,'why')});
 await wt(900);
 const alive=k=>T[k].some(f=>f.hp>0);
 while(alive(0)&&alive(1)&&n<90){if(id!==bid)return;
  const A=T[t][cur[t]],D=T[1-t][cur[1-t]],pk=cur[0]+'-'+cur[1];
  if(pk!=pair){pair=pk;draw();L(`🎭 ${T[0][cur[0]].c.n} ⚔️ ${T[1][cur[1]].c.n}`,'tk');await openTalk(T[0][cur[0]],T[1][cur[1]]);if(id!==bid)return;await awkTry(T[0][cur[0]],[],1);await awkTry(T[1][cur[1]],[],1);if(id!==bid)return}
  n++;$('roundInfo').textContent=`الدور ${n} • 🔵 ${T[0].filter(f=>f.hp>0).length} — 🔴 ${T[1].filter(f=>f.hp>0).length}`;
  const S={f:[A,D]};
  if(pk!==lastPk){lastPk=pk;stall=0;lastSig=-1;FORCE=0}
  {const sig=A.hp+D.hp;if(sig===lastSig){if(++stall>=6&&!FORCE){FORCE=1;L('🔥 الجمود طال — الطرفان مضطران للهجوم!','dd')}}else{lastSig=sig;stall=0}}
  if(!turnStart(S,0)){L(`⏳ ${A.c.n} مشلول ويفقد دوره`,'dg');draw();await wt(900)}
  else{
   if(!futile[A.c.id+D.c.id]&&A.c.ab.every(x=>['H','B','G'].includes(x.t)||mult(x,D.c)===0)){futile[A.c.id+D.c.id]=1;L(`🧠 كل هجمات ${A.c.n} بلا أثر على ${D.c.n} — لا يملك إلا الصمود`,'why')}
   const a=think(S,0),w=why(A,D,a);A.lm=a.n;if(w)L(`🧠 ${A.c.n}: ${w}`,'why');
   const E=[];play(S,0,a,E);
   if(!skip&&A.c.id=='luffy'&&a.n.startsWith('جير 5')&&!A.tf){A.tf=1;await fullTF('white','l');swapAfter(A)}
   if(!skip&&A.c.id=='kaido'&&a.n=='جسد التنين'&&!A.tf){A.tf=1;await fullTF('blue','k');swapAfter(A)}
   if(A.c.id=='zoro'&&!A.tf&&(a.n.startsWith('أسورا — ثلاثة')||a.n.startsWith('ضربة التسعة'))){A.tf=1;if(!skip)await awakenScene(A,AWC.zoro);zoroForm(A)}
   await X(a,A,a.t=='H'||a.t=='B'||a.t=='G'?A:D,E);
   if(a.l&&!USED.has(a.l)&&(a.t=='K'||a.t=='S'||a.c>=2||Math.random()<.5)){USED.add(a.l);L(`💬 <b style="color:${A.c.col}">${A.c.n}:</b> «${a.l}»`,'tk')}
   await wt(250);await report(E,A,D,a);draw();await wt(700);
   if(id!==bid)return;
   await awkTry(D,E);await awkTry(A,E);draw();if(id!==bid)return;
   await chatter(A,D,a,E,n);draw();await wt(250)}
  if(D.hp<=0){L(`💀 سقط ${D.c.n}`,'dd');await wt(900);const k=1-t;
   if(T[k].some(f=>f.hp>0)){cur[k]=T[k].findIndex(f=>f.hp>0);draw();L(`➡️ يدخل ${T[k][cur[k]].c.n} لصالح ${esc(names[k])} <span class="why">(${STYLE_TAG[T[k][cur[k]].c.id]})</span>`,'tk');await wt(700)}}
  t=1-t}
 const sum=k=>T[k].reduce((s,f)=>s+Math.max(0,f.hp)*(f.hp>0),0),w=alive(0)&&!alive(1)?0:alive(1)&&!alive(0)?1:sum(0)>=sum(1)?0:1;
 if(alive(0)&&alive(1))L('⏱️ انتهى الوقت — يفوز صاحب الصحة الأعلى','dd');
 draw();$('winner').innerHTML=`🏆 الفائز: <span style="color:${w?'#f87171':'#60a5fa'}">${esc(names[w])}</span>`;L(`🏆 انتهت المباراة — فاز ${esc(names[w])}`,'dd');$('endBox').classList.remove('hide');reportResult(w)}

/* ================================================================
   أنميشن ما قبل الفيديو لكل شخصية (50) — منطق التحوّل حسب الشخصية
   when: enter = عند دخول الحلبة | half = عند نصف الصحة | low = عند الخطر (≤30%) | rev = عند رفض الموت
   لوضع الفيديو: ألصق رابط أو Data-URL داخل AW_VIDEO بجانب اسم الشخصية.
   (لوفي/كايدو/زورو لديهم فيديوهاتهم الحالية ويعملون كما هم)
   ================================================================ */
const AW_VIDEO={gojo:'',sukuna:'',goku:'',saitama:'',naruto:'',madara:'',ichigo:'',aizen:'',zeno:'',whis:'',feather:'',anos:'',rimuru:'',beerus:'',vegito:'',gogeta:'',yhwach:'',kaguya:'',shadow:'',jinwoo:'',imu:'',escanor:'',melio:'',lucius:'',ainz:'',acno:'',hago:'',jiren:'',blast:'',garou:'',broly:'',muzan:'',wbeard:'',roger:'',rocks:'',zeref:'',merlin:'',zeldris:'',gilgamesh:'',ashborn:'',meruem:'',hashirama:'',yama:'',eren:'',raizel:'',shanks:'',dokja:''};
const AW_DEMO={luffy:'l',kaido:'k',zoro:'z'};
// id|نمط|لون1|لون2|الكلمة|الوصف|المتى|أيقونة
const AWC={};`gojo|void|#60a5fa|#a855f7|العين الستة|يرفع العصابة — اللانهاية بلا حجاب|half|👁
sukuna|slash|#ef4444|#7f1d1d|الملك يظهر|عشرون إصبعاً… لا قيود|enter|👹
goku|aura|#e5e7eb|#94a3b8|الغريزة الفائقة|جسده يتحرك وحده تحت الضغط|low|✨
saitama|quake|#fde047|#fff|الجدّية|لأول مرة… يتوقف عن المزاح|half|👊
naruto|aura|#fde047|#f97316|باريون مود|كورما يضحّي بكل شيء|low|🦊
madara|void|#a78bfa|#111827|ريكودو|عيون الرينيغان تفتح الطرق الستة|half|🌑
ichigo|slash|#111827|#ef4444|موغيتسو|الغيتسوغا الأخير يقطع السماء|half|⚫
aizen|glitch|#a78bfa|#e5e7eb|الهوغيوكو|الفراشة تكتمل — يتجاوز الحدود|low|🦋
zeno|cosmos|#fde047|#ffffff|الملك الأعلى|يرفع يده… الأكوان ترتجف|enter|👑
whis|time|#38bdf8|#e0f2fe|معلّم الأقوياء|يعيد الزمن ثوانٍ للوراء|half|⏳
feather|glitch|#f9a8d4|#fff|ساحرة الحكاية|تُعاد كتابة الصفحة الأخيرة|half|📖
anos|glitch|#dc2626|#a855f7|الملك المطلق|المنطق نفسه ينكسر أمامه|half|👑
rimuru|void|#22d3ee|#1e3a8a|أزاثوث|سلايم يبتلع الساحة|half|💧
beerus|void|#d946ef|#4c1d95|هاكاي|إله الدمار يستيقظ من قيلولته|half|🐱
vegito|aura|#38bdf8|#fff|اندماج المحاربين|فيجيتو يظهر بوميض أزرق|enter|💙
gogeta|aura|#38bdf8|#fde047|الفيوجن|غوغيتا يتجسّد في الساحة|enter|💫
yhwach|shadow|#fde047|#000|الكمال|يمتصّ المستقبل ويصير مطلقاً|half|🌑
kaguya|cosmos|#e5e7eb|#a78bfa|أرنب القمر|عيناها تفتحان فوق الساحة|half|🌕
shadow|shadow|#a855f7|#1e1b4b|سيّد الظلال|أتومك… الظلام يكشف وجهه|half|🕶
jinwoo|shadow|#7c3aed|#c4b5fd|ملك الظلال|«انهضوا» — جيش الظلال يستجيب|half|👑
imu|void|#ef4444|#000|حاكم العرش الفارغ|يمحو المكان من الوجود|half|🕳
escanor|flame|#fde047|#f97316|الظهر — ذروة الشمس|الأسد يبلغ عنفوانه|enter|☀️
melio|flame|#7f1d1d|#ef4444|وضع الشيطان|الوشم الأسود يلتهم جسده|low|😈
lucius|time|#a78bfa|#fff|ملك الزمن|يوقف الزمن عن الجميع|half|🕰
ainz|shadow|#6d28d9|#fbbf24|الملك الساحر|حشد الموت ينهض خلفه|enter|💀
acno|quake|#7c3aed|#000|تنين الفناء|زئيره يشقّ الأرض|half|🐲
hago|leaves|#fde047|#fff|حكيم الطرق الستة|يهبط بهدوء ويقيّد الخصم|half|☯
jiren|aura|#ef4444|#e5e7eb|القوة الخارقة|يفتح عينيه… الرمادي يشتعل|low|👁
blast|cosmos|#fff|#38bdf8|أقوى بطل|ضربة واحدة تهزّ المجرّة|half|🦸
garou|cosmos|#a855f7|#fde047|وحش الأبطال|الخوف الكوني يلتهم الساحة|half|🌌
broly|aura|#22c55e|#bbf7d0|الغضب الأسطوري|ينفجر الشعر الأخضر بلا سيطرة|half|💚
muzan|shadow|#dc2626|#fff|الشكل النهائي|يرفض الموت ويتحوّل|rev|🩸
wbeard|quake|#e5e7eb|#38bdf8|غورا غورا|الزلزال يشقّ الفضاء|half|🌍
roger|slash|#fde047|#fff|هاكي الملوك الأسود|الرجل الذي رأى كل شيء|half|🏴‍☠️
rocks|quake|#111827|#ef4444|طموح الحاكم|العالم كله يخضع له|half|⚓
zeref|glitch|#7c3aed|#111827|إنكانتوس|اللعنة تتحرر… والموت يتقدم|half|🖤
merlin|time|#c4b5fd|#fff|ساحرة الوجود|تعيد ترتيب الزمن والمكان|half|🔮
zeldris|flame|#dc2626|#fde047|قائد الوصايا|اللهب القرمزي يشتعل|half|🔥
gilgamesh|flame|#fde047|#fff|بوابة بابل|الملك يفتح خزائنه كلها|low|👑
ashborn|shadow|#e5e7eb|#000|ملك الظلال الأول|الصمت قبل أن ينحني الجميع|enter|🌑
meruem|aura|#fbbf24|#7c2d12|التطوّر|يتكيّف ويتجاوز كل حدّ|low|🐜
hashirama|leaves|#22c55e|#bbf7d0|وضع الحكيم|الغابة تنمو في لحظة|half|🌳
yama|flame|#f97316|#ef4444|زانكا نو تاشي|يُطلق البانكاي — الشمس تحترق|half|🔥
eren|quake|#a16207|#fca5a5|الرامبل|ملايين الأقدام تهزّ العالم|low|🦶
raizel|shadow|#ef4444|#1e1b4b|فكّ الختم|النبيل يرفع حدّ القوة|half|🩸
shanks|bolt|#ef4444|#111827|هاكي الملوك|سيف واحد يوقف الحرب|low|⚔
dokja|glitch|#38bdf8|#fff|نهاية القصة|الراوي يقرأ الصفحة الأخيرة|low|📜`.split('\n').forEach(l=>{const [id,kind,c1,c2,word,sub,when,icon]=l.split('|');AWC[id]={kind,c1,c2,word,sub,when,icon}});

AWC.zoro={kind:'asura',c1:'#16a34a',c2:'#7c3aed',word:'أسورا',sub:'ثلاثة رؤوس وتسعة سيوف',when:'none',icon:'👹'};
async function awVideo(id){ if(MEDIA[id]&&MEDIA[id].video) return MEDIA[id].video; if(AW_DEMO[id]) return vidURL(AW_DEMO[id]); return ''; }
function afterImg(id){ return (MEDIA[id]&&MEDIA[id].after)||(id==='zoro'?'/draft-arena-assets/zoro-after.jpg':'') }
function swapAfter(F){ const im=afterImg(F.c.id); if(!im||F.card[5]===im) return false; F.card[5]=im; const el=$('f'+(F.k+1)); el.dataset.key=''; draw(); const cd=el.querySelector('.card'); if(cd&&!skip) go(cd,[{filter:'brightness(3) saturate(1.6)'},{filter:'none'}],900,{fill:'none'}); return true }
const R6=(n,f)=>{for(let i=0;i<n;i++)f(i)};
const AWK={
 async asura(x){const {add,afx,nap,cx,cy,W,H,c1,c2,o}=x; // أسورا: ثلاثة وجوه + تسعة سيوف بأخضر/بنفسجي معتم
  R6(12,i=>afx(add(`left:${rnd(0,W)}px;bottom:-120px;width:${rnd(160,300)}px;height:${rnd(160,300)}px;border-radius:50%;background:radial-gradient(${i%2?c2:c1}99,transparent 70%);filter:blur(12px);opacity:0`),[{transform:'translateY(0)',opacity:.8},{transform:`translateY(${-H*rnd(.5,1)}px)`,opacity:0}],1800,{delay:i*80}));
  R6(9,i=>{const a=i*40;afx(add(`left:${cx-2}px;top:${cy-H*.42}px;width:4px;height:${H*.84}px;background:linear-gradient(transparent,${c1},#bef264,${c1},transparent);box-shadow:0 0 14px ${c1};opacity:0`),[{transform:`rotate(${a}deg) scaleY(0)`,opacity:1},{transform:`rotate(${a}deg) scaleY(1)`,opacity:.9}],500,{delay:700+i*110})});
  [-1,0,1].forEach((s,i)=>{const fs=s?H*.2:H*.3,f=add(`left:${cx+s*H*.22-fs/2}px;top:${cy-fs*.55}px;font-size:${fs}px;line-height:1;filter:brightness(0) drop-shadow(0 0 18px ${c1}) drop-shadow(0 0 40px ${c2});opacity:0;z-index:3`,'👹');
   afx(f,[{transform:'scale(.3)',opacity:0},{transform:'scale(1)',opacity:1}],600,{delay:1500+i*180});
   [-1,1].forEach(e=>afx(add(`left:${cx+s*H*.22+e*fs*.17-fs*.07}px;top:${cy-fs*.18}px;width:${fs*.14}px;height:${fs*.06}px;border-radius:50%;background:#ef4444;box-shadow:0 0 16px #ef4444,0 0 34px ${c1};opacity:0;z-index:4`),[{opacity:0},{opacity:1}],300,{delay:1900+i*180}))});
  afx(o,[{transform:'translate(0,0)'},{transform:'translate(-10px,5px)'},{transform:'translate(9px,-5px)'},{transform:'translate(0,0)'}],360,{iterations:4,delay:1500});
  R6(3,i=>afx(add(`left:${cx-W}px;top:${cy+(i-1)*H*.12}px;width:${W*2}px;height:10px;background:linear-gradient(90deg,transparent,${c1},#bef264,transparent);box-shadow:0 0 30px ${c1};z-index:5;opacity:0`),[{transform:`rotate(${-25+i*25}deg) scaleX(0)`,opacity:1},{transform:`rotate(${-25+i*25}deg) scaleX(1)`,opacity:1,offset:.5},{opacity:0}],520,{delay:2300+i*160}));
  await nap(3100)},
 async sun(x){const {add,afx,nap,cx,cy,W,H,c1,c2}=x,D=Math.hypot(W,H)*1.3,M='radial-gradient(circle,#000 4%,transparent 62%)';
  const r=add(`left:${cx-D/2}px;top:${cy-D/2}px;width:${D}px;height:${D}px;border-radius:50%;background:repeating-conic-gradient(${c1} 0 5deg,transparent 5deg 15deg);-webkit-mask-image:${M};mask-image:${M};opacity:0`);
  afx(r,[{transform:'scale(.1) rotate(0)',opacity:0},{transform:'scale(.7) rotate(70deg)',opacity:1,offset:.45},{transform:'scale(1) rotate(200deg)',opacity:.9}],2000);
  R6(5,i=>afx(add(`left:${cx-80}px;top:${cy-80}px;width:160px;height:160px;border-radius:50%;border:5px solid ${c2};box-shadow:0 0 30px ${c1};opacity:0`),[{transform:'scale(.1)',opacity:1},{transform:'scale(9)',opacity:0}],1300,{delay:i*320}));await nap(2000)},
 async bolt(x){const {add,nap,cx,cy,W,H,c1,c2}=x,fl=add(`inset:0;background:${c1};opacity:0`),sv=add('inset:0');
  for(let i=0;i<14&&!x.sk();i++){let s='';R6(3+i%3,()=>{const x1=rnd(W*.1,W*.9),x2=cx+rnd(-W*.25,W*.25),y2=rnd(H*.45,H*.85),p=[[x1,0]];for(let q=1;q<9;q++)p.push([x1+(x2-x1)*q/9+rnd(-35,35),y2*q/9+rnd(-25,25)]);p.push([x2,y2]);const pt=p.map(v=>v.join(',')).join(' ');s+=`<polyline points="${pt}" fill="none" stroke="${c2}" stroke-width="12" opacity=".6"/><polyline points="${pt}" fill="none" stroke="#fff" stroke-width="4" style="filter:drop-shadow(0 0 10px ${c1})"/>`});
   sv.innerHTML=`<svg width="${W}" height="${H}">${s}</svg>`;fl.style.opacity=i%2?.5:.12;await nap(110);if(i%4==3){sv.innerHTML='';fl.style.opacity=0;await nap(80)}}
  sv.innerHTML='';fl.style.opacity=.9;await nap(120)},
 async void(x){const {add,afx,nap,cx,cy,W,H,c1,c2}=x;
  R6(46,i=>{const a=rnd(0,6.28),r=Math.max(W,H)*rnd(.5,.8),px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r,d=add(`left:${px}px;top:${py}px;width:${rnd(3,9)}px;height:${rnd(3,9)}px;border-radius:50%;background:${i%2?c1:c2};box-shadow:0 0 10px ${c1};opacity:0`);afx(d,[{transform:'translate(0,0)',opacity:0},{opacity:1,offset:.2},{transform:`translate(${cx-px}px,${cy-py}px)`,opacity:1}],rnd(1100,1900),{easing:'ease-in',delay:i*25})});
  const b=add(`left:${cx-60}px;top:${cy-60}px;width:120px;height:120px;border-radius:50%;background:#000;box-shadow:0 0 60px 14px ${c1},inset 0 0 40px ${c2};z-index:3`);
  afx(b,[{transform:'scale(0)'},{transform:'scale(1)',offset:.7},{transform:'scale(9)'}],2300,{easing:'ease-in'});await nap(2300)},
 async flame(x){const {add,afx,nap,W,H,c1,c2}=x;
  afx(add(`left:0;right:0;bottom:0;height:60%;background:linear-gradient(0deg,${c1},${c2}88,transparent);opacity:0`),[{opacity:0},{opacity:1}],1800);
  R6(36,i=>afx(add(`left:${rnd(0,W)}px;bottom:-80px;width:${rnd(18,60)}px;height:${rnd(120,H*.8)}px;border-radius:50% 50% 20% 20%/80% 80% 20% 20%;background:linear-gradient(0deg,${c1},${c2},transparent);filter:blur(5px);opacity:0`),[{transform:'translateY(0)',opacity:.9},{transform:`translateY(${-H*rnd(.3,.9)}px)`,opacity:0}],rnd(900,1600),{delay:i*50}));await nap(2000)},
 async shadow(x){const {add,afx,nap,cx,cy,W,H,c1,c2}=x;
  R6(14,i=>afx(add(`left:${rnd(0,W)}px;bottom:-120px;width:${rnd(120,260)}px;height:${rnd(120,260)}px;border-radius:50%;background:radial-gradient(${c2},transparent 70%);filter:blur(10px);opacity:0`),[{transform:'translateY(0)',opacity:.9},{transform:`translateY(${-H*rnd(.5,1)}px)`,opacity:0}],1800,{delay:i*90}));
  R6(7,i=>afx(add(`left:${W*(.08+i*.13)}px;bottom:0;font-size:${rnd(60,110)}px;filter:brightness(0) drop-shadow(0 0 14px ${c1});opacity:0`,'🧍'),[{transform:'translateY(60px)',opacity:0},{transform:'translateY(0)',opacity:1}],700,{delay:900+i*110}));
  [-1,1].forEach(s=>afx(add(`left:${cx+s*55-30}px;top:${cy-12}px;width:60px;height:22px;border-radius:50%;background:${c1};box-shadow:0 0 30px ${c1},0 0 70px ${c1};opacity:0;z-index:3`),[{transform:'scaleY(0)',opacity:0},{transform:'scaleY(1)',opacity:1}],500,{delay:1500}));await nap(2300)},
 async slash(x){const {add,afx,nap,cx,cy,W,H,c1,c2}=x;
  R6(6,i=>afx(add(`left:${cx-W}px;top:${rnd(H*.2,H*.8)}px;width:${W*2}px;height:6px;background:linear-gradient(90deg,transparent,#fff,${c1},transparent);box-shadow:0 0 22px ${c1};transform:rotate(${rnd(-35,35)}deg) scaleX(0);opacity:0`),[{transform:'rotate(-25deg) scaleX(0)',opacity:1},{transform:'rotate(-25deg) scaleX(1)',opacity:1,offset:.4},{opacity:0}],600,{delay:i*230}));
  const b=add(`left:${cx-W}px;top:${cy-9}px;width:${W*2}px;height:18px;background:linear-gradient(90deg,transparent,#fff,${c2},transparent);box-shadow:0 0 50px ${c1};transform:rotate(-30deg) scaleX(0);z-index:3`);
  afx(b,[{transform:'rotate(-30deg) scaleX(0)'},{transform:'rotate(-30deg) scaleX(1)'}],500,{delay:1500});await nap(2200)},
 async aura(x){const {add,afx,nap,cx,cy,W,H,c1,c2}=x;
  let s='';R6(7,()=>{let p=`${cx},${H}`;for(let q=1;q<8;q++)p+=` ${cx+rnd(-W*.28,W*.28)*q/7},${H-H*.6*q/7}`;s+=`<polyline points="${p}" fill="none" stroke="${c1}" stroke-width="4" style="filter:drop-shadow(0 0 8px ${c1})"/>`});
  add(`inset:0`,`<svg width="${W}" height="${H}">${s}</svg>`);
  R6(18,i=>afx(add(`left:${rnd(0,W)}px;bottom:0;width:${rnd(8,26)}px;height:${rnd(H*.4,H)}px;background:linear-gradient(0deg,${c1},${c2}66,transparent);filter:blur(3px);opacity:0`),[{transform:'translateY(40px)',opacity:0},{opacity:.9,offset:.3},{transform:`translateY(${-H*.3}px)`,opacity:0}],1200,{delay:600+i*70}));
  R6(8,i=>afx(add(`left:${rnd(10,90)}%;bottom:5%;font-size:${rnd(18,34)}px;opacity:0`,'🪨'),[{transform:'translateY(0)',opacity:1},{transform:`translateY(${-H*rnd(.2,.5)}px) rotate(${rnd(-90,90)}deg)`,opacity:0}],1500,{delay:i*160}));
  R6(3,i=>afx(add(`left:${cx-90}px;top:${cy-90}px;width:180px;height:180px;border-radius:50%;border:5px solid ${c2};opacity:0`),[{transform:'scale(.1)',opacity:1},{transform:'scale(8)',opacity:0}],1200,{delay:1000+i*350}));await nap(2200)},
 async glitch(x){const {add,afx,nap,W,H,c1,c2}=x,G='∞ΣΩ書終∂ア∴§01';
  R6(22,i=>afx(add(`left:${i*W/22}px;top:-40px;font-size:22px;color:${c1};text-shadow:0 0 8px ${c1};writing-mode:vertical-rl;opacity:0`,Array.from({length:14},()=>G[Math.floor(rnd(0,G.length))]).join('')),[{transform:'translateY(0)',opacity:1},{transform:`translateY(${H}px)`,opacity:.2}],rnd(1200,2000),{delay:i*50}));
  for(let i=0;i<16&&!x.sk();i++){const bs=[];R6(4,j=>bs.push(add(`left:0;top:${rnd(0,H)}px;width:100%;height:${rnd(6,60)}px;background:${(i+j)%2?c1:c2};opacity:.55;mix-blend-mode:screen;transform:translateX(${rnd(-40,40)}px)`)));await nap(110);bs.forEach(b=>b.remove())}},
 async time(x){const {add,afx,nap,cx,cy,c1,c2}=x;
  const c=add(`left:${cx-90}px;top:${cy-90}px;font-size:180px;filter:drop-shadow(0 0 30px ${c1});opacity:0`,'🕰️');
  afx(c,[{transform:'rotate(0) scale(.2)',opacity:0},{opacity:1,offset:.3},{transform:'rotate(-720deg) scale(1.2)',opacity:1}],2200);
  R6(12,i=>{const a=i*30*Math.PI/180;afx(add(`left:${cx+Math.cos(a)*170-4}px;top:${cy+Math.sin(a)*170-18}px;width:8px;height:36px;background:${c2};box-shadow:0 0 12px ${c1};opacity:0;transform:rotate(${i*30+90}deg)`),[{opacity:0},{opacity:1}],300,{delay:i*120})});
  R6(4,i=>afx(add(`left:${cx-100}px;top:${cy-100}px;width:200px;height:200px;border-radius:50%;border:4px solid ${c1};opacity:0`),[{transform:'scale(6)',opacity:0},{transform:'scale(.2)',opacity:1}],1100,{delay:i*400}));await nap(2300)},
 async cosmos(x){const {add,afx,nap,cx,cy,W,H,c1,c2}=x,D=Math.hypot(W,H);
  const g=add(`left:${cx-D/2}px;top:${cy-D/2}px;width:${D}px;height:${D}px;border-radius:50%;background:repeating-conic-gradient(from 0deg,${c2}55 0 12deg,transparent 12deg 40deg);opacity:0`);afx(g,[{transform:'rotate(0) scale(.2)',opacity:0},{opacity:.9,offset:.4},{transform:'rotate(260deg) scale(1)',opacity:.7}],2400);
  R6(90,i=>{const a=rnd(0,6.28),r=Math.max(W,H)*rnd(.4,.8);afx(add(`left:${cx}px;top:${cy}px;width:${rnd(2,5)}px;height:${rnd(2,5)}px;border-radius:50%;background:${i%3?'#fff':c1};box-shadow:0 0 8px ${c1};opacity:0`),[{transform:'translate(0,0)',opacity:0},{opacity:1,offset:.3},{transform:`translate(${Math.cos(a)*r}px,${Math.sin(a)*r}px)`,opacity:0}],rnd(900,1800),{delay:i*22})});
  afx(add(`left:${cx-50}px;top:${cy-50}px;width:100px;height:100px;border-radius:50%;background:radial-gradient(#fff,${c1} 40%,transparent 70%)`),[{transform:'scale(0)'},{transform:'scale(5)'}],2300);await nap(2300)},
 async leaves(x){const {add,afx,nap,cx,cy,W,H,c1,c2}=x;
  afx(add(`inset:0;background:radial-gradient(circle,${c1}55,transparent 65%);opacity:0`),[{opacity:0},{opacity:1}],1800);
  R6(50,i=>{const a=rnd(0,6.28),r=Math.max(W,H)*rnd(.3,.7);afx(add(`left:${cx}px;top:${cy}px;font-size:${rnd(16,32)}px;opacity:0`,'🍃'),[{transform:`translate(${Math.cos(a)*r}px,${Math.sin(a)*r}px) rotate(0)`,opacity:0},{opacity:1,offset:.3},{transform:`translate(${Math.cos(a+2)*r*.15}px,${Math.sin(a+2)*r*.15}px) rotate(540deg)`,opacity:1}],rnd(1500,2300),{delay:i*30})});
  afx(add(`left:${cx-70}px;top:${cy-70}px;width:140px;height:140px;border-radius:50%;background:radial-gradient(#fff,${c1} 45%,transparent 70%);opacity:0`),[{transform:'scale(.1)',opacity:0},{transform:'scale(3)',opacity:1}],2200);await nap(2300)},
 async quake(x){const {add,afx,nap,cx,cy,W,H,c1,c2,o}=x;
  afx(o,[{transform:'translate(0,0)'},{transform:'translate(-12px,6px)'},{transform:'translate(10px,-6px)'},{transform:'translate(-6px,4px)'},{transform:'translate(0,0)'}],420,{iterations:5});
  R6(5,i=>afx(add(`left:${cx-60}px;top:${cy-60}px;width:120px;height:120px;border-radius:50%;border:${10-i}px solid ${i%2?c1:c2};opacity:0`),[{transform:'scale(.1)',opacity:1},{transform:'scale(14)',opacity:0}],1300,{delay:i*330}));
  let s='';R6(9,()=>{let p=`${cx},${cy}`,a=rnd(0,6.28);for(let q=1;q<8;q++){a+=rnd(-.5,.5);p+=` ${cx+Math.cos(a)*q*W/9},${cy+Math.sin(a)*q*W/9}`}s+=`<polyline points="${p}" fill="none" stroke="${c1}" stroke-width="5" style="filter:drop-shadow(0 0 8px ${c1})"/>`});
  add('inset:0',`<svg width="${W}" height="${H}">${s}</svg>`);
  R6(16,i=>afx(add(`left:${rnd(10,90)}%;bottom:0;font-size:${rnd(18,38)}px;opacity:0`,'🪨'),[{transform:'translateY(0)',opacity:1},{transform:`translateY(${-H*rnd(.3,.7)}px) rotate(${rnd(-180,180)}deg)`,opacity:0}],1500,{delay:i*100}));await nap(2100)}
};

// مشهد كامل: أسود ← تأثير الشخصية ← عنوان التحوّل ← الفيديو (أو مكانه الجاهز)
async function awakenScene(F,c){
  const o=document.createElement('div');
  o.style.cssText='position:fixed;inset:0;z-index:99999;background:#000;opacity:0;overflow:hidden;cursor:pointer';
  document.body.appendChild(o);let sk=false;o.onclick=()=>{sk=true};
  const W=innerWidth,H=innerHeight,cx=W/2,cy=H/2;
  const add=(css,html='')=>{const d=document.createElement('div');d.style.cssText='position:absolute;'+css;d.innerHTML=html;o.appendChild(d);return d};
  const nap=async ms=>{const e=Date.now()+ms;while(Date.now()<e&&!sk)await sleep(40)};
  const urlP=awVideo(F.c.id);
  await afx(o,[{opacity:0},{opacity:1}],500);
  try{await AWK[c.kind]({o,add,afx,nap,W,H,cx,cy,c1:c.c1,c2:c.c2,sk:()=>sk})}catch(e){}
  const fl=add(`inset:0;background:${c.c1};opacity:0;z-index:5`);
  await afx(fl,[{opacity:0},{opacity:1}],260);sk=false;
  const t=add(`left:0;right:0;top:${cy-70}px;text-align:center;z-index:7;color:#fff;opacity:0;text-shadow:0 0 24px ${c.c1},0 4px 0 #000;padding:0 12px`,`<div style="font-size:${Math.min(60,W/9)}px;font-weight:900">${c.icon} ${esc(c.word)}</div><div style="font-size:17px;margin-top:6px;color:${c.c2==='#000'||c.c2==='#111827'?'#e5e7eb':c.c2}">${esc(F.c.n)} — ${esc(c.sub)}</div>`);
  afx(fl,[{opacity:1},{opacity:.15}],500);await afx(t,[{opacity:0,transform:'scale(1.6)'},{opacity:1,transform:'scale(1)'}],450);
  await nap(1400);sk=false;
  const url=await urlP;
  if(url){
    const v=document.createElement('video');v.playsInline=true;v.preload='auto';v.src=url;
    v.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;z-index:8';o.appendChild(v);
    try{await v.play()}catch(e){v.muted=true;try{await v.play()}catch(e2){}}
    add('اضغط للتخطي','bottom:10px;left:0;right:0;text-align:center;color:#fff8;font-size:12px;z-index:9;pointer-events:none');
    await new Promise(res=>{v.onended=res;v.onerror=res;const iv=setInterval(()=>{if(sk){clearInterval(iv);res()}},80);setTimeout(()=>{clearInterval(iv);res()},(isFinite(v.duration)?v.duration:12)*1000+2500)});
    v.pause();
  }else{
    const ph=add(`left:8%;right:8%;top:${cy-90}px;height:180px;border:3px dashed ${c.c1};border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#fff;z-index:8;background:#000c`,`<div style="font-size:40px">🎬</div><div style="font-size:18px;font-weight:800">مكان فيديو ${esc(F.c.n)}</div><div style="font-size:12px;color:#fff9;direction:ltr">AW_VIDEO.${F.c.id} = '...'</div>`);
    afx(ph,[{opacity:0},{opacity:1}],400);await nap(2400);
  }
  await afx(o,[{opacity:1},{opacity:0}],500);o.remove();
}

// منطق التحوّل: كل شخصية تتحوّل مرة واحدة في اللحظة المناسبة لقصتها
async function awkTry(F,E,enter){
  const c=AWC[F.c.id];if(skip||!c||F.aw||F.hp<=0&&c.when!=='rev')return;
  const ok=c.when==='enter'?!!enter:enter?false:c.when==='half'?F.hp<=50&&F.hp>0:c.when==='low'?F.hp<=30&&F.hp>0:c.when==='rev'?E.some(e=>e.k=='rev'):false;
  if(!ok)return;F.aw=1;
  L(`${c.icon} ${F.c.n} — ${c.word}: ${c.sub}`,'cr');
  await awakenScene(F,c);
  swapAfter(F);
  const ch=$('f'+(F.k+1)).querySelector('.formchip');if(ch)ch.textContent=`${c.icon} ${c.word}`;
  const cd=$('f'+(F.k+1)).querySelector('.card');if(cd)go(cd,[{filter:'brightness(3) saturate(1.6)'},{filter:'none'}],900,{fill:'none'});
  const O=T[1-F.k][cur[1-F.k]];await speak(F,ln(F,'form',O));
}

/* ===== المحادثة المنقولة من draft-demo-video-v4 (دمج مع محادثة الأرينا) ===== */
(()=>{const dCH={
 zoro:{taunt:['لا تتحرّك... هذه الضربة قادمة.','سيفي لم يبدأ بعد.','ثلاثة سيوف تكفي لإنهائك.'],pain:['تسك... خدش بسيط.','هذا كل ما لديك؟','لا شيء حدث.'],low:['حتى لو بقيتُ بذراع واحدة، سأقطعك.','لن أسقط قبل أن أصير أعظم سيّاف.'],form:['أسورا... انظر جيداً.','اتّبعني إلى الجحيم.'],awe:['هذه الهالة...!','تسك، هل بقي شيء لأقطعه؟'],kill:['انتهى الأمر.','سيفي لا يخطئ.'],block:['تسك! سيفي لا يلمسه...','اللعنة، ما هذا الجدار؟'],shrug:['هل قطعتني؟ لا أشعر بشيء.'],dodge:['حركة جيدة... لكنها لن تتكرر.']},
 luffy:{taunt:['شيشيشي! سأضربك أبعد من الأفق!','سأصبح ملك القراصنة!','تعال إلى هنا — الآن!'],pain:['آي! يؤلم...','أنت قوي! هذا ممتع!','لا يهم... لن أسقط!'],low:['لن أسقط! الحلم لم يتحقق بعد!','أنا جائع... لكنني سأقاتل!'],form:['جير... فايف!','سأريك أقوى مني!'],awe:['ما هذا الضحك...؟!','هذا الفتى... ما هذه الحركات؟!'],kill:['شيشيشي! فزت!','آسف، لكنني لا أخسر هنا!'],block:['لماذا لا أصيبه؟!','همم، غريب...'],shrug:['هههه! أنا مطاط — لا يؤذيني!','كان هذا يدغدغ!'],dodge:['شيشيشي! أخطأت!']},
 sanji:{taunt:['الطبق جاهز... وساخن!','انتبه لقدمي، فهي مشتعلة.','لن ترى ركلتي قادمة.'],pain:['تسك... لن أسقط.','ضربة جيدة، لكنها لن تتكرر.'],low:['لن أسقط قبل أن أحمي طاقمي.','سيجارتي لم تنطفئ بعد.'],form:['ديابل جامب... الجحيم يشتعل!','هل تشمّ رائحة الاحتراق؟'],awe:['ساقه... تحترق بالأزرق؟!'],kill:['شكراً على الاستضافة.','كانت مجرد مقبّلات.'],block:['ما هذا الحاجز؟!'],shrug:['ركلتك لا تخيفني.'],dodge:['بطيء جداً.']},
 nami:{taunt:['انتبه — الطقس ينقلب!','ستدفع ثمن هذا غالياً!'],pain:['آه! ستندم على هذا!','يا لك من وحش!'],low:['ما زالت لديّ حيل... لا تستهن بي!','لن أستسلم أبداً!'],form:['سحابة جديدة تتجمّع!'],awe:['هذه الطاقة... أرجوك لا تقترب!'],kill:['هذا ما يحدث حين تستهين بملاحة الطقس!','الطقس تغيّر... وأنت لم تلاحظ.'],block:['لا شيء يؤثر فيه؟! هذا غير عادل!'],shrug:['ههه، لم أُصَب حتى.'],dodge:['ها! لن تصيبني بسهولة!']},
 gojo:{taunt:['لا تقلق، سأتساهل قليلاً.','أنا الأقوى — لا شيء جديد.','هل ستلمسني أصلاً؟'],pain:['أوه؟ لقد تأذّيت... مثير للاهتمام.','حسناً... هذا أيقظني قليلاً.'],low:['حان وقت الجدّية قليلاً.','لا بأس... لدي تقنية الانعكاس.'],form:['لنتحمّس قليلاً!'],awe:['هذا مدهش...'],kill:['كان ممتعاً... لكنه انتهى.','قلت لك — أنا الأقوى.'],block:['كيف... اللانهاية لا تتوقف؟!'],shrug:['لن تلمسني أبداً.','هذا ما يحدث حين تحاول لمسي.'],dodge:['بطيء.']},
 kaido:{taunt:['ووروو! هل هذا كل شيء؟','سأريك معنى الدمار!','ستسقط الآن!'],pain:['ههههه... هذا أفضل ما لديكم؟','ضربة تستحق الذكر!'],low:['أنا أقوى مخلوق... لن أسقط!','سأحرق هذا العالم معي!'],form:['سأريك شكلي الحقيقي!','انظر إلى السماء... ارتجف!'],awe:['...هذا الوحش!','انتبهوا!'],kill:['ضعف... ضعف تام.','كل من يقف أمامي يُسحق.'],block:['...لا يمكن أن لا أصيبه!'],shrug:['هههه! ماذا فعلت؟ دغدغة؟'],dodge:['حركة جيدة... لكنني لم أتعب بعد.']},
},dPAIR={
 'zoro|gojo':[['gojo','سيّاف بثلاثة سيوف؟ هل ستلمسني أصلاً؟'],['zoro','لا أهتمّ بألقابك. سأقطع ما يقف بيني وبين حلمي.'],['gojo','اللانهاية لا تسمح لسيفك بالوصول.'],['zoro','بالهاكي... سأجعله يصل.']],
 'zoro|nami':[['zoro','ناميّ... لا تتوقّعي أن أتساهل معكِ لأنكِ من الطاقم.'],['nami','هاه؟ ستدفع كل ديونك لي مضاعفة بعد هذا!']],
 'zoro|kaido':[['kaido','سيّاف بثلاثة سيوف... أرني ما عندك أمام أقوى مخلوق.'],['zoro','جئت لأقطع رأس أقوى مخلوق. لا أكثر.'],['kaido','ووروو! تتجرّأ؟ تعال إذن!']],
 'luffy|gojo':[['luffy','أنت! هل أنت قوي؟ سأصبح ملك القراصنة، فلا تقف في طريقي!'],['gojo','ملك القراصنة؟ لطيف... لكن لا أحد يكسر الأقوى.'],['luffy','شيشيشي! أنا لا أكسر... أنا أضرب فقط!']],
 'luffy|nami':[['nami','لوفي! ابتعد وإلا أرسلتك بصاعقة!'],['luffy','هاهاها! ناميّ، أنا مطاط! صواعقك لا تؤذيني!'],['nami','آه... نسيت!']],
 'luffy|kaido':[['kaido','قبعة القش! جئت إذن لتحرّر الجميع؟'],['luffy','سأهزمك وأحرّر الجميع — وهذه المرّة بالتأكيد!'],['kaido','ما زلت تتكلم... سأريك معنى القوّة!']],
 'sanji|gojo':[['gojo','طبّاخ بقدمين... أرني ركلتك.'],['sanji','سأقدّم لك طبقاً من الجحيم، فلا تشتكِ من الحرارة.'],['gojo','النار؟ أنا أتحكّم بالمسافة نفسها.']],
 'sanji|nami':[['sanji','ناميّي العزيزة! لا أستطيع أن أرفع قدمي عليكِ!'],['nami','يا سانجي-كون... إذن ابقَ واقفاً ودعني أضرب!'],['sanji','آه... سأتحمّل! سأتحمّل لأجلك!']],
 'sanji|kaido':[['kaido','فتى مطبخ؟ يكفيني لأسلّي نفسي.'],['sanji','ستذوق حذائي... وبعدها سأعدّ لك طبقاً أمام الجميع.']],
},dRSP={
 'بنفسجي الفارغ':{zoro:'ما هذا... الهواء نفسه اختفى!',luffy:'واااه! ما هذا الشيء؟! يؤلم!',sanji:'تسك... ما هذه القوة؟!',nami:'يا إلهي!! لا أريد أن أموت هنا!',kaido:'ههه... ما هذا الشيء؟ أنت تؤلم!'},
 'باجرانغ غان':{kaido:'ووورو! هذه القبضة...!',gojo:'قبضة بحجم الجبل؟! مثير للاهتمام فعلاً.',nami:'لوفي! توقف!!',zoro:'هذا الأحمق... وحش حقاً.',sanji:'لوفي... أيها المجنون!'},
 'راغناروك':{luffy:'آآآي! لكنني لن أسقط!',zoro:'تسك... ثقيلة!',sanji:'اللعنة... عظامي!',nami:'آآآه! لا!',gojo:'أوه؟ ... كان ذلك قريباً.'},
 'أسورا إتشيبوغين — تسعة سيوف':{kaido:'ههه... هذا جرح! جرح حقيقي!',gojo:'سيف يمرّ عبر اللانهاية؟ مثير.',luffy:'زورو! قويّ جداً!',nami:'زورو! أيها الأحمق!'},
 'هيل ميموري':{kaido:'ركلة ساخنة... ماذا؟',gojo:'ركلة... ما أسرعها.',luffy:'سانجي! حارّة!',zoro:'تسك... ركلة جيدة.',nami:'سانجي!!'},
 'رايغو — إله الرعد':{kaido:'برق؟ ههه! أعرف الرعد جيداً.',gojo:'أوه! لا بأس.',zoro:'تسك... صعقة.',sanji:'ناميّي... قويّة!',luffy:'همم؟ لا أشعر بشيء!'},
 'توسيع النطاق: الفراغ اللامحدود':{zoro:'...ما هذا؟ عقلي...',luffy:'...؟؟؟',sanji:'...!',nami:'...!',kaido:'...هراء!'},
};
 for(const k in dCH){if(!IDS.includes(k))continue;CH[k]=CH[k]||{};for(const t in dCH[k])CH[k][t]=[...new Set([...(dCH[k][t]||[]),...(CH[k][t]||[])])]}
 for(const k in dPAIR){if(k.split('|').every(i=>IDS.includes(i)))PAIR[k]=dPAIR[k]}
 for(const m in dRSP)RSP[m]={...(RSP[m]||{}),...dRSP[m]};
})();

/* ===== حوارات مخصّصة لكل الشخصيات (تُدمج مع ما سبق) ===== */
// id|تحدٍّ;تحدٍّ|ألم;ألم|خطر|قتل|افتتاح (تُقال أول المواجهة، {o}=الخصم)|ردّ على الافتتاح
const TALK=`gojo|هل تستطيع حتى لمسي؟;دعني أُريك الفرق بين مستويينا.|أوه؟ هذا أوقظني قليلاً.;تأذّيت... مثير.|حان وقت الجدّية قليلاً.|كان ممتعاً... لكنه انتهى.|لا تقلق يا {o}، سأتساهل معك قليلاً.|وأنا الأقوى هنا، لا شيء جديد.
luffy|شيشيشي! سأضربك أبعد من الأفق!;سأصبح ملك القراصنة!|آي! يؤلم... لكنه ممتع!;أنت قوي!|لن أسقط! حلمي لم يتحقق بعد!|انتهت المغامرة يا {o}!|أنت! هل أنت قوي؟ لا تقف في طريقي!|شيشيشي! تعال إذن!
kaido|ووروو! هل هذا كل شيء؟;سأريك معنى الدمار!|ههههه! أفضل ما عندكم؟;ضربة تستحق الذكر!|أنا أقوى مخلوق... لن أسقط!|سقطتَ كالبقية.|أرني ما عندك يا {o}... أمام أقوى مخلوق.|لن أهرب منك!
zoro|ثلاثة سيوف تكفي لإنهائك.;سيفي لم يبدأ بعد.|تسك... خدش بسيط.;هذا كل ما لديك؟|حتى بذراع واحدة سأقطعك.|انتهى... لقد قطعتك.|لا تتحرّك يا {o}... هذه الضربة قادمة.|جئت لأقطع ما يقف بيني وبين حلمي.
sukuna|هل هذا كل ما عندك يا صغير؟;أنا الملك... اركع.|ههه... جرحٌ يستحق الذكر.;أحسنت، سأقتلك ببطء.|تحسبني سقطت؟ المزار لم يُفتح بعد.|ضعيف... كما توقعت.|أنت أمامي يا {o}... فلا تتوقّع الرحمة.|أنا لا أخاف ملك اللعنات.
goku|واااو! أنت قوي جداً!;دعنا نقاتل أكثر!|ممتاز! هذا ما كنت أنتظره!;آي! ضربة حقيقية!|ما زلت أستطيع الأقوى!|كان قتالاً رائعاً يا {o}!|أنت تبدو قوياً! هل نقاتل بجدية؟|أنا جاهز!
saitama|هذا كل شيء؟;أنا فقط بطل لهواية.|همم؟ شعرت بشيء.;لا بأس بها.|حسناً... سأجدّ الآن.|ضربة عادية. انتهى.|لا أريد إطالة هذا يا {o}.|حسناً... لنبدأ.
naruto|لن أستسلم أبداً! هذا طريق النينجا!;سأصبح هوكاجي!|آخ! لكنني لن أسقط!;ضربة قوية... داتيبايو!|كورما! أعطني قوتك!|لقد أنهيتها يا {o}... آسف.|سأريك قوة نينجا حقيقي!|لن أخسر!
madara|حتى القدر ينحني لي.;أنت لا تعرف الألم.|ممتع... لم يجرحني أحد منذ زمن.;أحسنت.|لم أُظهر كل شيء بعد.|هذا هو الواقع... الضعفاء يسقطون.|لا أحد يوقف أوتشيها.|سأريك الحلم الذي تحاول إيقافه.
ichigo|لن أدعك تمرّ!;سأحمي كل من أحبهم!|تسك... لن أسقط!;ضربة قوية!|لن أخسر هنا!|إيتشيغو كوروساكي... تذكّره.|سأهزمك يا {o}... مهما كنت.|لا أهتم بقوتك. سأحميهم.
aizen|كل شيء ضمن خطتي.;أنت فعلاً تستحق الاهتمام.|مثير... لم أحسب هذا.;تأذّيت؟ ذلك جزء من اللعبة.|مرحلة جديدة ستبدأ الآن.|كما توقّعت تماماً.|آه يا {o}... ما أروعك كقطعة على رقعتي.|لن تخدعني.
zeno|هل أمحو هذا؟;مللت... هيا.|هاه؟ هل لمستني؟;ما هذا؟|تقول إنك قوي؟ تثير شفقتي.|مُحيت.|يا {o}... هل أنت مسلٍّ؟|ماذا؟
whis|أوه، هل هذا كل شيء؟;حركة مفهومة.|لا بأس... ضربة مقبولة.;أوه؟ تقدّمت.|حسناً، سأتدخّل.|أوه، لقد انتهى الأمر.|يا {o}، سأعلّمك درساً.|هذا مثير... هيا!
feather|سأعيد كتابة قدرك.;هذه صفحتك الأخيرة.|هاه؟ ليست في الحكاية!;تسك... تجاوزت الصفحة.|سأمزّق هذه الصفحة وأكتب غيرها!|النهاية... كما كُتب.|ستنتهي حكايتك يا {o}.|لن أكون جزءاً من حكايتك.
anos|اركع أمام الملك المطلق.;المنطق لا يصلح معي.|هاه... خدشتني؟;ممتع.|أتحسب أنّي سقطت؟|حتى الفناء ينحني لي.|أيها {o}، أنا الملك الذي لا يُهزم.|سأثبت العكس.
rimuru|تذكّر... أنا سيد التمبست.;سأبتلع قدرتك.|آه... هذا ألمني.;سأتعلّم منها.|لن أسمح بأن يؤذي رفاقي أحد.|لقد افترستك.|يا {o}، لست خصماً عادياً أرى.|أنا لا أخاف.
beerus|هل ستسلّيني؟;يا للملل.|هاه؟ ضربة جيدة.;لم يلمسني أحد منذ زمن.|حسناً... سأجدّ.|انتهى. هاكاي.|أنت يا {o}... هل تعتقد أنك قوي؟|سأريك.
vegito|هل هذا كل شيء؟;أنا مزيج الأقوى.|ضربة جيدة... لكنها لن تتكرر.;حسناً، قوية.|حان وقت الجدّية.|انتهيت يا {o}.|أنا فيجيتو! هل ستقاتلني؟|أنا مستعد.
gogeta|هل هذا كل ما لديك؟;سنصبح أقوى!|هاه... ضربة جيدة!;لا بأس.|حان وقت النهاية!|ستار دراغون بريك! انتهى!|أنا غوغيتا... هل ستقاتل؟|هيا!
yhwach|كل شيء كان مقدّراً.;أنا أرى ما بعدك.|هاه... لقد حسبتُها.;لا شيء يفاجئني.|لقد رأيت هذه النهاية.|انتهى كما رأيت.|يا {o}، أنت في مستقبلي بالفعل.|ربما لا.
kaguya|لا تهرب من القمر.;ستسقط في الحلم.|ما هذا؟;آه... تجرؤ؟|سأعيدك للعدم.|عُد إلى الحلم.|يا {o}، أنت سليل ما أكره.|لن أنام.
shadow|وفقاً للخطة...;أنا ظلّ بلا اسم.|تسك... كما توقعت.;ضربة جيدة.|تعال... لنكشف القناع.|اختفى كل شيء.|يا {o}... أنت جزء من سيناريو أكبر.|ربما.
jinwoo|انهضوا.;الظلال لا تنام.|ضربة جيدة... سأردّها.;ما زلت واقفاً.|سأنهض مرة أخرى.|انحنِ... يا {o}.|أنت يا {o}... هل ستنضم إلى جيشي؟|لن أنضم لأحد.
imu|اعتدل أمام العرش.;أنت عدم.|هاه؟ جرأة.;من أنت لتمسني؟|لا أحد يخلّد.|محوتك.|{o}... من سمح لك بالدخول؟|سأدخل متى أشاء.
escanor|الشمس لا تعرف الهزيمة.;أنا الأسد المتغطرس.|هاه؟ ضربة... مقبولة.;لن تلمسني.|قوة الظهر تأتي الآن!|لقد أحرقتك تماماً.|يا {o}، أنا الأقوى عند الظهر.|لن أخافك.
melio|لا تقترب من رفاقي.;أنا الأشرس.|آخ... ضربة جيدة.;تسك.|هذا هو الجانب الأسود.|انتهى.|يا {o}، لا أريد أن أقاتلك... لكن سأفعل.|فلنبدأ.
lucius|الزمن ملكي.;توقّف.|هاه؟ لحظة.;كيف لمستني؟|سأعيد الزمن.|مات منذ ثوانٍ.|يا {o}، لقد انتهيت قبل أن نبدأ.|لنرَ.
ainz|يا {o}... اركع أمام الملك الساحر.;الضعفاء لا يعنونني.|همم؟ هذا مفاجئ.;تسك.|وورلد دزاستر.|كان ممتعاً... ولكنه تافه.|هل تعرف من أنا يا {o}؟|لا يهم.
acno|زئير!;الفناء قادم.|غرررر!;تجرؤ؟|سيحترق كل شيء.|فنيت.|{o}... سأحرق اسمك.|هيا إذن!
hago|اهدأ يا بنيّ.;الطرق الستة معي.|هاه... ضربة جيدة.;أنت قويّ.|لن أسمح لك.|هذه نهايتك يا {o}.|{o}... أنت تذكّرني بشخص.|وأنت؟
jiren|ضعيف.;لا شيء يهزمني.|هاه؟ ضربة قوية.;لا بأس.|لن أخسر!|فنيت.|يا {o}... أنت لا تعرف الألم.|سأعلّمك.
blast|هذا كل شيء؟;سأنهي هذا بسرعة.|همم؟ ضربة.;ممتع.|لن أتراجع.|انتهى.|يا {o}، لا مزاح بعد الآن.|حسناً.
garou|أنا وحش الأبطال!;لا بطل يهزمني.|هه... ضربة جيدة!;أنت قويّ!|لن أسقط!|انتهى يا بطل.|يا {o}... هل أنت بطل؟|سنرى.
broly|غرررر!;أنا سأحطّم كل شيء!|آخ!;ما هذا؟|لن أتوقف!|فنيت.|{o}... سأسحقك.|تعال!
muzan|لا تحاول.;أنا الكامل.|تسك... هذا مؤلم.;تجرؤ؟|لا أموت!|مت.|يا {o}، أنت حشرة.|سأقتلك.
wbeard|غورا غورا!;أنا أقوى رجل!|غورا... ضربة جيدة.;أنت قوي.|أبنائي ينتظرونني!|شقّ الفضاء.|يا {o}، أرني عزيمتك.|سأريك.
roger|ها ها ها!;الحرية!|ممتع!;ضربة جيدة.|لم تنتهِ المغامرة!|الرحيل الأعظم!|يا {o}، هل أنت مستعد لنهاية العالم؟|بالتأكيد.
rocks|العالم لي!;اخضعوا.|تجرؤ؟;ضربة جيدة.|لن تمرّ.|سحق.|{o}... ستركع.|لن أركع.
zeref|الموت وشيك.;لا تقترب.|آه... هذا ألمني.;تجرؤ؟|لن أتراجع.|مت.|{o}... أنا لا أريد قتالاً.|لا خيار.
merlin|هل تريد درساً؟;دعنا نلعب.|آه!;ضربة جيدة.|حان وقت الجدّية.|انتهى.|يا {o}، أنت مثير.|سنرى.
zeldris|أنا قائد الوصايا.;لا تتقدّم.|تسك!;ضربة جيدة.|لن أسقط!|انتهى.|{o}... سأحرقك.|تعال!
gilgamesh|يا {o}، ارتقِ أمام الملك.;أنت زبد.|همم؟ جرأة.;كيف تجرؤ على جرحي؟|سأعاقبك على هذه الجرأة.|انتهيت.|يا {o}، أنا ملك الأبطال.|لا أحد فوقي.
ashborn|اركع.;الصمت.|تسك.;جرأة.|لن أسقط.|انتهى.|يا {o}... سأنهي هذا.|هيا.
meruem|أنا الملك.;التطوّر لا يتوقف.|همم... مثير.;ضربة جيدة.|سأتطوّر الآن.|انتهى.|يا {o}، لماذا تقاتل؟|لأنني أريد.
hashirama|اهدأ.;الغابة معي.|هاه... ضربة جيدة.;أنت قوي.|لن أسقط!|لقد انتهى.|يا {o}، دعنا نقاتل بشرف.|بكل سرور.
yama|الجحيم قادم.;أنا القائد العام.|هاه... ضربة جيدة.;حسناً.|لن أخسر.|احترق.|يا {o}، سأحرقك.|فلنبدأ.
eren|سأحرّر الجميع.;أنا مستمر للأمام.|آه!;ضربة قوية.|لن أتوقف!|انتهى.|يا {o}، لا شيء يوقفني.|سأوقفك.
raizel|لا تتجاوز.;أنا النبيل.|هاه... ضربة جيدة.;أنت قوي.|حان وقت فكّ الختم.|انتهى.|يا {o}، لا أريد القتال.|لا خيار.
shanks|هذا يكفي.;لا أريد القتال... لكنني سأفعل.|هاه... ضربة جيدة.;حسناً.|لن أسقط.|انتهى.|يا {o}، لنوقف هذا.|هيا.
dokja|أنا أعرف كل شيء.;القصة تنتهي هنا.|هاه... هذا ليس في القصة.;ضربة جيدة.|لن أستسلم.|انتهت القصة.|يا {o}... أنا أعرف نهايتك.|لنرَ.`;
const INTRO={},REPLY={};
TALK.split('\n').forEach(l=>{const [id,tt,pn,lw,kl,it,rp]=l.split('|'),o=CH[id]=CH[id]||{};
 const mg=(k,a)=>{o[k]=[...new Set([...a,...(o[k]||[])])]};
 mg('taunt',tt.split(';'));mg('pain',pn.split(';'));mg('low',[lw]);mg('kill',[kl]);INTRO[id]=it;REPLY[id]=rp});

function startBattle(){fight()}
$('btnSkip').onclick=()=>skip=1;
$('btnSpeed').onclick=()=>{speed=speed%3+1;$('btnSpeed').textContent='السرعة ×'+speed};
/* ============================================================
   🌐 التدفق متعدد اللاعبين: لوبي ← دعوة ← باند ← اختيار ← مواجهة ← معركة
   كل القرارات (من يبدأ، الباند، الاختيار، البذرة) تأتي من الخادم، والمعركة
   تُحاكى عند الطرفين بنفس البذرة فتظهر متطابقة.
   ============================================================ */
const chOf = id => CHARS.find(c => c[0] == NMAP[id]);
const fmtN = id => { const c = chOf(id); return c ? c[0] : id };

async function api(a, d = {}) {
  try {
    const r = await fetch(AR.base + '/act', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf: AR.csrf, a, ...d }) });
    return await r.json();
  } catch (e) { return { ok: false, error: 'تعذّر الاتصال بالخادم' } }
}

let toastT = null;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.remove('hide');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hide'), 3200);
}
function beep() {
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]) } catch (e) {}
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)(), o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination); o.type = 'sine'; o.frequency.value = 880; g.gain.value = .08;
    o.start(); o.stop(ac.currentTime + .25);
  } catch (e) {}
}

/* ---------- اللوبي ---------- */
function renderLobby() {
  const q = ($('search').value || '').trim().toLowerCase();
  const list = ONLINE.filter(p => !q || p.name.toLowerCase().includes(q));
  $('onlineCount').textContent = ONLINE.length;
  $('onlineList').innerHTML = list.length ? list.map(p => `
    <div class="prow"><div><b>${esc(p.name)}</b> <span class="st ${p.status}">${p.status === 'online' ? '🟢 متصل' : '⚔️ في مباراة'}</span></div>
    <button class="btn" data-c="${esc(p.code)}" ${p.status === 'online' && LEFT !== 0 ? '' : 'disabled'}>⚔️ تحدّي</button></div>`).join('')
    : '<div class="mut" style="padding:14px">لا أحد متصل الآن بهذه الصفحة. اطلب من صديقك فتح «درافت الأنمي» من القائمة.</div>';
  $('onlineList').querySelectorAll('button[data-c]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const r = await api('invite', { to: b.dataset.c });
    if (!r.ok) { toast(r.error || 'تعذّر إرسال الدعوة'); b.disabled = false; return }
    outInvite = { id: r.id, expires: r.expires, name: r.name };
    show('wait'); tickWait();
  });
}
$('search').oninput = renderLobby;

let outInvite = null, waitIv = null;
function tickWait() {
  clearInterval(waitIv);
  const upd = () => {
    if (!outInvite) return clearInterval(waitIv);
    const s = Math.max(0, Math.ceil((outInvite.expires - (Date.now() + skew)) / 1000));
    $('waitTxt').innerHTML = `بانتظار رد <b>${esc(outInvite.name)}</b> — <span class="pulse">${s}ث</span>`;
  };
  upd(); waitIv = setInterval(upd, 500);
}
$('btnCancelInv').onclick = async () => { if (outInvite) await api('cancel', { id: outInvite.id }); outInvite = null; show('lobby') };

/* دعوة واردة */
let inInvite = null, invIv = null;
function showInvite(iv) {
  inInvite = iv; beep();
  $('invName').textContent = iv.name;
  $('inv').classList.remove('hide');
  clearInterval(invIv);
  const upd = () => {
    const s = Math.max(0, Math.ceil((iv.expires - (Date.now() + skew)) / 1000));
    $('invTime').textContent = s + 'ث';
    if (!s) hideInvite();
  };
  upd(); invIv = setInterval(upd, 500);
}
function hideInvite() { inInvite = null; clearInterval(invIv); $('inv').classList.add('hide') }
$('invYes').onclick = async () => { if (!inInvite) return; const id = inInvite.id; hideInvite(); const r = await api('accept', { id }); if (!r.ok) toast(r.error || 'انتهت الدعوة') };
$('invNo').onclick = async () => { if (!inInvite) return; const id = inInvite.id; hideInvite(); await api('decline', { id }) };

/* ---------- الباند + الاختيار ---------- */
let tickIv = null;
function renderDraft() {
  const R = ROOM, ME = R.me, isBan = R.phase === 'ban', myTurn = R.turn === ME;
  $('phaseT').textContent = isBan ? '🚫 مرحلة الباند — كل لاعب يحظر شخصية واحدة لا تُستعمل في هذا التحدي' : '🎯 مرحلة الاختيار — اختر 3 شخصيات من المتبقي';
  $('firstBanner').innerHTML = `🎲 <b>${esc(names[R.first])}</b>${R.first === ME ? ' (أنت)' : ''} يبدأ أولاً — يحظر أولاً، يختار أولاً، ويهاجم أولاً`;
  const t = $('turn'); t.className = 'turn p' + (R.turn + 1);
  t.textContent = myTurn ? (isBan ? '🫵 دورك — احظر شخصية' : '🫵 دورك — اختر شخصية') : `⏳ دور ${names[R.turn]}`;
  const bannedBy = id => R.bans[0] === id ? 0 : R.bans[1] === id ? 1 : -1;
  const pickedBy = id => R.picks[0].includes(id) ? 0 : R.picks[1].includes(id) ? 1 : -1;
  $('pool').innerHTML = R.pool.map((id, i) => {
    const b = bannedBy(id), p = pickedBy(id);
    return cardHTML(chOf(id), { idx: i, no: i + 1, cls: b >= 0 ? 'banned p' + (b + 1) : p >= 0 ? 'taken p' + (p + 1) : (isBan ? 'banable' : '') });
  }).join('');
  $('pool').querySelectorAll('.card').forEach(el => {
    const id = R.pool[+el.dataset.i];
    if (bannedBy(id) >= 0) el.insertAdjacentHTML('beforeend', `<div class="bmark">🚫<small>${esc(names[bannedBy(id)])}</small></div>`);
    if (myTurn && bannedBy(id) < 0 && pickedBy(id) < 0) el.onclick = async () => {
      document.querySelectorAll('#pool .card').forEach(x => x.onclick = null);
      const r = await api(isBan ? 'ban' : 'pick', { id });
      if (!r.ok) { toast(r.error || 'تعذّر'); renderDraft() }
    };
  });
  [0, 1].forEach(k => {
    $('tn' + (k + 1)).textContent = (k ? '🔴 ' : '🔵 ') + names[k] + (k === ME ? ' (أنت)' : '');
    $('sl' + (k + 1)).innerHTML = [0, 1, 2].map(j => R.picks[k][j] ? cardHTML(chOf(R.picks[k][j]), { cls: 'static' }) : `<div class="slot">${j + 1}</div>`).join('');
    $('bn' + (k + 1)).innerHTML = R.bans[k] ? `🚫 حظر: <b>${esc(fmtN(R.bans[k]))}</b>` : '<span class="mut">🚫 لم يحظر بعد</span>';
  });
  $('pickNo').textContent = isBan ? (R.bans.filter(Boolean).length + 1) + ' من 2 (حظر)' : Math.min(R.picks[0].length + R.picks[1].length + 1, 6) + ' من 6';
  clearInterval(tickIv);
  const upd = () => { const s = Math.max(0, Math.ceil((R.deadline - (Date.now() + skew)) / 1000)); $('timer').textContent = '⏱ ' + s + 'ث'; $('timer').classList.toggle('low', s <= 8) };
  upd(); tickIv = setInterval(upd, 300);
}

/* ---------- استقبال حالة الغرفة ---------- */
let startedRoom = null;
function onRoom(R) {
  if (R && SPEC) { SPEC = null; bid++; $('btnAgain').textContent = 'العودة للوبي 🔁' }
  if (!R) { ROOM = null; startedRoom = null; clearInterval(tickIv); if (!$('s-battle').classList.contains('hide') && !$('endBox').classList.contains('hide')) return; show('lobby'); return }
  ROOM = R; names = R.names; hideInvite(); outInvite = null; clearInterval(waitIv);
  if (R.phase === 'ban' || R.phase === 'pick') { show('draft'); renderDraft(); return }
  if (R.phase === 'battle' && startedRoom !== R.id) {
    startedRoom = R.id; clearInterval(tickIv);
    teams = [0, 1].map(k => R.picks[k].map(id => chOf(id).slice()));
    runIntro(); return;
  }
  if (R.phase === 'done') {
    const el = $('verdict');
    if (R.winner === null || R.winner === undefined) el.textContent = R.reason || 'انتهى التحدي';
    else el.innerHTML = `✅ تأكدت النتيجة: <b>${esc(names[R.winner])}</b> ${R.winner === R.me ? '🎉 مبروك!' : ''}`;
    if (R.reason && R.winner !== null && R.winner !== undefined && !$('s-battle').classList.contains('hide')) { /* يبقى */ }
    else if (startedRoom !== R.id) { toast(R.reason || 'انتهى التحدي'); show('lobby') }
  }
}

function reportResult(w) { if (ROOM && !SPEC && ROOM.me >= 0) api('result', { rid: ROOM.id, w }) }
async function leaveRoom() {
  await api('leave'); startedRoom = null; ROOM = null; $('verdict').textContent = ''; show('lobby');
}

/* ---------- الاتصال (SSE) ---------- */
function connect() {
  const es = new EventSource(AR.base + '/stream');
  es.onmessage = e => {
    let ev; try { ev = JSON.parse(e.data) } catch (x) { return }
    if (ev.now) skew = ev.now - Date.now();
    if (ev.t === 'hello') { ONLINE = ev.online; LIVE = ev.live || []; if (ev.left !== undefined) { LEFT = ev.left; MAXF = ev.max || 5 } renderQuota(); renderLive(); renderLobby(); (ev.invites || []).forEach(showInvite); if (ev.room) onRoom(ev.room); }
    else if (ev.t === 'quota') { LEFT = ev.left; MAXF = ev.max || MAXF; renderQuota() }
    else if (ev.t === 'watch') onWatch(ev.room)
    else if (ev.t === 'watch_end') { if (!SPEC) toast(ev.msg || 'انتهت المباراة') }
    else if (ev.t === 'online') { ONLINE = ev.online; if (ev.live) { LIVE = ev.live; renderLive() } if (!$('s-lobby').classList.contains('hide')) renderLobby() }
    else if (ev.t === 'invite') showInvite(ev.invite);
    else if (ev.t === 'invite_end') {
      if (inInvite && inInvite.id === ev.id) hideInvite();
      if (outInvite && outInvite.id === ev.id) { outInvite = null; clearInterval(waitIv); show('lobby'); toast(ev.msg || 'انتهت الدعوة') }
    }
    else if (ev.t === 'room') onRoom(ev.room);
    else if (ev.t === 'toast') toast(ev.msg);
  };
  es.onerror = () => { /* المتصفح يعيد الاتصال تلقائياً */ };
}
/* ============================================================
   🗓️ الحد اليومي + 🏆 الترتيب + 📺 المشاهدة المباشرة
   ============================================================ */
let LEFT = null, MAXF = 5, LIVE = [], SPEC = null, RANK = null, rankTry = 0, rankTimer = null;

function renderQuota() {
  const q = $('quota'); if (LEFT === null) { q.classList.add('hide'); return }
  q.classList.remove('hide'); q.classList.toggle('zero', LEFT <= 0);
  q.innerHTML = `<div>🗓️ قتالاتك اليوم: <b>${LEFT}</b> من ${MAXF}${LEFT <= 0 ? ' — تتجدد 12 منتصف الليل (السعودية)' : ''}</div>` +
    `<div class="dots">${Array.from({ length: MAXF }, (_, i) => `<i class="${i < LEFT ? 'on' : ''}"></i>`).join('')}</div>`;
  if (!$('s-lobby').classList.contains('hide')) renderLobby();
}

/* --- 📺 المباريات الحيّة --- */
const thumb = id => { const c = chOf(id); return c ? `<img src="${esc(c[5])}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : '' };
function renderLive() {
  const n = LIVE.filter(r => r.phase === 'battle').length;
  $('liveBadge').textContent = n; $('liveBadge').classList.toggle('hide', !n);
  if ($('s-live').classList.contains('hide')) return;
  $('liveList').innerHTML = LIVE.length ? LIVE.map(r => {
    const fighting = r.phase === 'battle';
    const st = fighting ? '🔥 قتال مباشر' : r.phase === 'ban' ? '🚫 مرحلة الباند' : '🎯 مرحلة الاختيار';
    return `<div class="lrow"><div class="top"><div class="vsn">🔵 ${esc(r.names[0])}<span class="vv">VS</span>🔴 ${esc(r.names[1])}</div>
      <button class="btn" data-r="${esc(r.id)}" ${fighting ? '' : 'disabled'}>${fighting ? '📺 شاهد' : 'لم تبدأ المعركة'}</button></div>
      <div class="meta">${st} • 👁 ${r.watchers} مشاهد</div>
      ${r.teams ? `<div class="mini2">${r.teams[0].map(i => `<span>${thumb(i)}</span>`).join('')}<span style="border:0;background:none;width:auto;color:var(--gold);font-weight:900;line-height:34px">⚔️</span>${r.teams[1].map(i => `<span class="r">${thumb(i)}</span>`).join('')}</div>` : ''}</div>`;
  }).join('') : '<div class="mut center" style="padding:22px">لا توجد مباريات حالياً. عندما يتقاتل لاعبان ستظهر هنا فوراً 📺</div>';
  $('liveList').querySelectorAll('button[data-r]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const r = await api('watch', { rid: b.dataset.r });
    if (!r.ok) { toast(r.error || 'تعذّرت المشاهدة'); b.disabled = false }
  });
}

/* وضع المشاهدة: نفس المعركة بنفس البذرة تماماً */
function onWatch(R) {
  if (!SPEC || SPEC.rid !== R.id) {
    if (R.phase !== 'battle') return;
    SPEC = { rid: R.id }; ROOM = R; names = R.names; startedRoom = null;
    teams = [0, 1].map(k => R.picks[k].map(id => chOf(id).slice()));
    $('verdict').textContent = ''; $('btnAgain').textContent = 'إنهاء المشاهدة 📺';
    const late = (Date.now() + skew) - (R.startedAt || 0);
    speed = late > 30000 ? 3 : 1; $('btnSpeed').textContent = 'السرعة ×' + speed;
    runIntro();
    setTimeout(() => { if (SPEC) L('📺 وضع المشاهدة — المعركة تُعرض لك من بدايتها' + (speed > 1 ? ' بسرعة أعلى لتلحق بالمباشر' : ''), 'dd') }, 6500);
    return;
  }
  if (R.phase === 'done') {
    ROOM = R;
    $('verdict').innerHTML = R.winner === null || R.winner === undefined ? esc(R.reason || 'انتهت المباراة') : `✅ النتيجة المؤكدة: <b>${esc(names[R.winner])}</b>`;
  }
}
async function stopWatch() { bid++; SPEC = null; ROOM = null; $('btnAgain').textContent = 'العودة للوبي 🔁'; await api('unwatch'); show('live'); renderLive() }

/* --- 🏆 أقوى الشخصيات --- */
async function loadRank() {
  $('rankList').innerHTML = '<div class="mut center" style="padding:22px">⏳ جاري تحميل الترتيب…</div>';
  try {
    const r = await (await fetch(AR.base + '/ranking', { credentials: 'same-origin' })).json();
    if (r.ok && r.ready) { RANK = r.list; renderRank(); return }
    if (r.ok && !r.ready && rankTry++ < 12) {
      $('rankList').innerHTML = '<div class="mut center" style="padding:22px">🧮 جاري تجهيز الترتيب… لحظات</div>';
      clearTimeout(rankTimer); rankTimer = setTimeout(() => { if (curTab === 'rank') loadRank() }, 6000); return;
    }
  } catch (e) {}
  $('rankList').innerHTML = '<div class="mut center" style="padding:22px">تعذّر تحميل الترتيب — حدّث الصفحة</div>';
}
function renderRank() {
  if (!RANK) return;
  const q = ($('rankSearch').value || '').trim().toLowerCase();
  const medal = n => n === 1 ? '🥇' : n === 2 ? '🥈' : n === 3 ? '🥉' : n;
  const rows = RANK.filter(r => { const c = chOf(r.id); return c && (!q || (c[0] + ' ' + c[1] + ' ' + c[2]).toLowerCase().includes(q)) });
  $('rankList').innerHTML = rows.map(r => {
    const c = chOf(r.id);
    return `<div class="rrow ${r.rank <= 3 ? 't' + r.rank : ''}"><div class="rk">${medal(r.rank)}</div>
      <div class="im">${esc(c[0][0])}<img src="${esc(c[5])}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"></div>
      <div class="nf"><b>${esc(c[0])}</b><small>${esc(c[1])} • ${esc(c[2])}</small><div class="bar"><i style="width:${r.score}%"></i></div><div class="st3">⚔️ ${r.atk} • 🛡️ ${r.def} • ✨ ${r.util}</div></div>
      <div class="sc"><b>${r.score}</b><small>درجة القوة</small></div></div>`;
  }).join('') || '<div class="mut center" style="padding:18px">لا نتائج</div>';
}
$('rankSearch').oninput = renderRank;

/* --- التبويبات --- */
document.querySelectorAll('#tabs .tab').forEach(b => b.onclick = () => {
  const t = b.dataset.tab; show(t);
  if (t === 'rank') { if (RANK) renderRank(); else { rankTry = 0; loadRank() } }
  if (t === 'live') renderLive();
  if (t === 'lobby') renderLobby();
});

$('btnAgain').onclick=()=>{ if (SPEC) { stopWatch(); return } bid++; leaveRoom() };
show('lobby'); connect();
