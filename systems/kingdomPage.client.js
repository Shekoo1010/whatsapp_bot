
// [اسم المرحلة، القوة، المكافأة] — نفس أرقام .غزو بالبوت
var D=JSON.parse(document.getElementById('kd').textContent),S=D.stages,CH=D.chars;
//<svg-start
// مشهد كل مرحلة بحسب اسمها. art: ضع رابط صورة جاهزة (لعبة/رسم) وتُعرض بنفس العمق والحركة.
var T=[
{sky:['#6ec3ff','#c5ebff'],far:'#6f9fbf',w:'#cfc6b3',d:'#5a4f40',r:'#c0392b',g:'#ffd36a',fl:'#4d7a45',cel:'sun',def:'💂',a:'☁️',t:'drift'},
{sky:['#ff8a4a','#ffd08a'],far:'#7d5a64',w:'#d9b996',d:'#5b3d33',r:'#8e2b2b',g:'#ffd36a',fl:'#6b5a4a',cel:'sun',def:'💂',a:'🐦',t:'driftL'},
{sky:['#39406f','#8a7cc0'],far:'#3d3a63',w:'#9aa0b5',d:'#2c3047',r:'#3e5fb0',g:'#ffd36a',fl:'#4a4a5e',def:'🏇',a:'🍂',t:'fall'},
{sky:['#2a0610','#5b0f1a'],w:'#7a1f2b',d:'#2a0a10',r:'#d4a017',g:'#ffcf5a',fl:'#3a0d14',def:'🤴',a:'✨',t:'rise'},
{sky:['#080c26','#27366e'],far:'#1d2850',w:'#6c7596',d:'#232a47',r:'#2f3f7d',g:'#ffb347',fl:'#232b45',cel:'moon',def:'🧝',a:'🏹',t:'fall'},
{sky:['#2a0606','#c4461f'],far:'#4a1a14',w:'#6a5a52',d:'#2a1a16',r:'#5a2a22',g:'#ff7a18',fl:'#3a2018',cel:'glow',def:'👹',a:'🔥',t:'rise'},
{sky:['#06020d','#2b1245'],far:'#1a0d2e',w:'#2c2540',d:'#0f0a1a',r:'#150e26',g:'#ff3b6b',fl:'#161026',cel:'moon',def:'🧛',a:'🦇',t:'drift'},
{sky:['#1a1c5c','#6a5ad8'],far:'#3a3a8a',w:'#e8dcb8',d:'#8a7a4a',r:'#d4a017',g:'#fff0a0',fl:'#5a4f8a',def:'🧙',a:'💎',t:'rise'},
{sky:['#1a0500','#a83208'],far:'#3a0f06',w:'#4a3a36',d:'#1a0f0c',r:'#2a1a16',g:'#ff7a18',fl:'#2a1410',cel:'glow',def:'🐉',big:1,a:'🔥',t:'rise'},
{sky:['#3a2a00','#ffe27a'],w:'#f0d27a',d:'#8a6410',r:'#ffcf5a',g:'#fff7c0',fl:'#7a5a10',def:'🤴',a:'⭐',t:'rise'}];
var R=function(x,y,w,h,f,o){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+f+'"'+(o?' opacity="'+o+'"':'')+'/>'};
var P=function(p,f,o){return '<polygon points="'+p+'" fill="'+f+'"'+(o?' opacity="'+o+'"':'')+'/>'};
function mer(x,y,w,f){var s='',n=Math.max(2,Math.round(w/9));for(var i=0;i<n;i++)s+=R(x+i*w/n,y-6,w/n*.55,6,f);return s}
function tower(x,w,h,c,roof){var y=215-h,s=R(x,y,w,h,c.w)+R(x+w*.68,y,w*.32,h,c.d,.5);
 if(roof)s+=P((x-4)+','+y+' '+(x+w/2)+','+(y-w*.95)+' '+(x+w+4)+','+y,c.r)+P((x+w/2)+','+(y-w*.95)+' '+(x+w+4)+','+y+' '+(x+w/2)+','+y,c.d,.35);else s+=mer(x-2,y,w+4,c.w);
 for(var k=0;k<Math.floor(h/38);k++)s+=R(x+w/2-3,y+14+k*32,6,12,c.g);return s}
function wall(x,w,h,c){return R(x,215-h,w,h,c.w)+R(x,215-h,w,h*.3,c.d,.25)+mer(x,215-h,w,c.w)}
function gate(x,w,c){var h=w*1.15,y=215-h,r=w/2,s='<path d="M'+x+' 215V'+(y+r)+'A'+r+' '+r+' 0 0 1 '+(x+w)+' '+(y+r)+'V215Z" fill="#0b0b12"/><path d="M'+(x+4)+' 215V'+(y+r+2)+'A'+(r-4)+' '+(r-4)+' 0 0 1 '+(x+w-4)+' '+(y+r+2)+'V215Z" fill="'+c.g+'" opacity=".3"/>';
 for(var i=1;i<5;i++)s+='<line x1="'+(x+i*w/5)+'" y1="'+(y+r)+'" x2="'+(x+i*w/5)+'" y2="215" stroke="#000" stroke-opacity=".6"/>';return s}
function flag(x,y,col){return '<line x1="'+x+'" y1="'+y+'" x2="'+x+'" y2="'+(y+26)+'" stroke="#222" stroke-width="2"/><polygon class="fl" points="'+x+','+y+' '+(x+18)+','+(y+5)+' '+x+','+(y+11)+'" fill="'+col+'"/>'}
function banner(x,col){return '<line x1="'+x+'" y1="128" x2="'+x+'" y2="215" stroke="#333" stroke-width="2"/><polygon class="fl" points="'+x+',130 '+(x+22)+',130 '+(x+22)+',165 '+(x+11)+',158 '+x+',165" fill="'+col+'"/>'}
function fire(x,y,k){return '<g class="fire"><ellipse cx="'+x+'" cy="'+y+'" rx="'+6*k+'" ry="'+11*k+'" fill="#ff7a18"/><ellipse cx="'+x+'" cy="'+(y+2*k)+'" rx="'+3*k+'" ry="'+6*k+'" fill="#ffd36a"/></g>'}
function guard(x,k){return '<g transform="translate('+x+' 215) scale('+k+')">'+R(-5,-22,10,16,'#8a8fa6')+'<circle cx="0" cy="-27" r="5" fill="#b9bfd4"/>'+R(-5,-6,4,6,'#444')+R(1,-6,4,6,'#444')+'<line x1="9" y1="0" x2="9" y2="-40" stroke="#ddd" stroke-width="1.5"/>'+P('9,-45 7,-38 11,-38','#fff')+'</g>'}
function col(x,h,c){return R(x,215-h,12,h,c.w)+R(x+8,215-h,4,h,c.d,.4)+R(x-3,215-h-5,18,6,c.r)+R(x-3,209,18,6,c.r)}
function house(x,w,h,c){return R(x,215-h,w,h,c.w)+P((x-3)+','+(215-h)+' '+(x+w/2)+','+(215-h-w*.6)+' '+(x+w+3)+','+(215-h),c.r)+R(x+w/2-3,215-h+10,6,8,c.g)}
function floor(c){var s='<defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+c.fl+'"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient></defs>'+R(0,215,400,60,'url(#fg)');
 for(var x=-200;x<=600;x+=50)s+='<line x1="'+x+'" y1="275" x2="200" y2="205" stroke="#000" stroke-opacity=".22"/>';
 [228,244,264].forEach(function(y){s+='<line x1="0" y1="'+y+'" x2="400" y2="'+y+'" stroke="#000" stroke-opacity=".2"/>'});return s}
var B=[
function(c){return tower(172,56,130,c,1)+wall(70,260,55,c)+tower(38,52,120,c,1)+tower(310,52,120,c,1)+gate(176,48,c)+flag(200,8,'#e74c3c')+flag(64,60,'#e74c3c')+flag(336,60,'#e74c3c')},
function(c){var s='';[[20,40,60],[70,36,80],[110,44,50],[250,40,70],[296,38,55],[340,44,85]].forEach(function(h){s+=house(h[0],h[1],h[2],c)});return s+wall(0,400,38,c)+tower(150,100,120,c,0)+gate(176,48,c)+guard(160,1.5)+guard(240,1.5)+flag(200,60,'#ffd36a')},
function(c){return wall(0,400,70,c)+tower(8,44,115,c,1)+tower(348,44,115,c,1)+gate(172,56,c)+banner(70,'#3e5fb0')+banner(125,'#c0392b')+banner(275,'#c0392b')+banner(330,'#3e5fb0')+guard(95,1.4)+guard(305,1.4)},
function(c){var s=R(0,0,400,215,c.w)+R(0,0,400,215,c.d,.4);[30,95,260,325].forEach(function(x){s+=col(x,150,c)});s+=P('150,215 250,215 232,172 168,172','#a8141f')+P('168,172 232,172 226,168 174,168','#7a0e16')+R(180,128,40,44,'#8a6410')+P('172,96 228,96 220,130 180,130',c.r)+R(172,92,56,6,c.g)+'<circle cx="200" cy="82" r="8" fill="'+c.g+'"/>';return s+P('55,0 85,0 70,48','#a8141f')+P('315,0 345,0 330,48','#a8141f')},
function(c){return wall(80,240,60,c)+tower(40,44,175,c,1)+tower(178,50,205,c,1)+tower(318,44,175,c,1)+fire(60,52,.7)+fire(342,52,.7)+fire(203,16,.6)+guard(130,1.2)+guard(270,1.2)},
function(c){var s=wall(20,95,45,c)+wall(285,95,60,c)+P('150,215 150,150 175,125 200,170 230,140 250,215',c.w)+P('200,170 230,140 250,215 200,215',c.d,.5);return s+fire(70,150,1)+fire(330,138,1.2)+fire(200,168,1.4)+fire(120,205,.7)+fire(290,205,.8)+banner(45,'#7a1f1f')+banner(355,'#7a1f1f')},
function(c){return tower(60,40,150,c,1)+tower(300,40,150,c,1)+tower(150,100,175,c,0)+P('170,40 200,-6 230,40',c.r)+tower(176,48,205,c,1)+R(190,95,20,30,c.g,.8)+R(100,120,18,26,c.g,.7)+R(282,120,18,26,c.g,.7)+gate(176,48,c)+mer(60,150,0,c.w)},
function(c){return wall(20,360,70,c)+R(150,150,100,65,c.w)+'<path d="M150 150A50 50 0 0 1 250 150Z" fill="'+c.r+'"/><line x1="200" y1="100" x2="200" y2="82" stroke="'+c.r+'" stroke-width="3"/>'+tower(40,32,150,c,1)+tower(328,32,150,c,1)+col(110,125,c)+col(280,125,c)+gate(178,44,c)+flag(200,76,'#fff0a0')},
function(c){var s=P('0,215 0,120 70,60 120,130 200,40 280,130 330,70 400,125 400,215','#2a0f08')+P('200,40 150,215 250,215','#1a0805')+'<ellipse cx="200" cy="190" rx="70" ry="45" fill="#050202"/>';return s+'<path d="M200 60L185 130L205 160L190 215" stroke="'+c.g+'" stroke-width="4" fill="none" opacity=".8"/><path d="M90 120L110 170L95 215M310 125L290 180L315 215" stroke="'+c.g+'" stroke-width="3" fill="none" opacity=".7"/>'+fire(70,205,.8)+fire(335,205,.9)},
function(c){var s=R(0,0,400,215,c.w)+R(0,0,400,215,c.d,.35),k;s+='<g class="spin" opacity=".35">';for(k=0;k<12;k++)s+='<polygon points="200,100 '+(200+300*Math.cos(k*.5236-.07))+','+(100+300*Math.sin(k*.5236-.07))+' '+(200+300*Math.cos(k*.5236+.07))+','+(100+300*Math.sin(k*.5236+.07))+'" fill="'+c.g+'"/>';s+='</g>';[20,70,290,340].forEach(function(x){s+=col(x,170,c)});s+=P('140,215 260,215 224,172 176,172','#a8141f')+R(168,180,64,35,c.d,.5)+R(176,172,48,12,c.r)+R(180,128,40,44,'#b8860b')+P('170,92 230,92 222,130 178,130',c.r)+'<circle cx="200" cy="78" r="9" fill="#fff"/>';return s}];
function farSvg(c){var s='<svg viewBox="0 0 400 275" preserveAspectRatio="none">';
 if(c.cel==='glow')s+='<circle cx="200" cy="150" r="90" fill="#ff5a1a" opacity=".45"/>';
 if(c.cel==='sun')s+='<circle cx="300" cy="72" r="26" fill="#fff6b0"/><circle cx="300" cy="72" r="40" fill="#fff6b0" opacity=".25"/>';
 if(c.cel==='moon'){s+='<circle cx="90" cy="62" r="22" fill="#f4f1ff"/><circle cx="82" cy="58" r="20" fill="'+c.sky[0]+'"/>';for(var i=0;i<16;i++)s+='<circle cx="'+((i*97)%400)+'" cy="'+((i*53)%120+8)+'" r="1.1" fill="#fff"/>'}
 if(c.far)s+='<path d="M0 215V140L50 105L100 150L160 90L230 160L290 115L350 160L400 125V215Z" fill="'+c.far+'"/><path d="M0 215V175L70 150L130 180L210 140L290 182L360 155L400 175V215Z" fill="'+c.far+'" opacity=".7"/>';
 return s+'</svg>'}
function build(i){var c=T[i];return '<svg viewBox="0 0 400 275" preserveAspectRatio="none">'+floor(c)+B[i](c)+'</svg>'}
//<svg-end
var esc=function(s){return String(s).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})};
var st,sel,busy,$=function(s){return document.querySelector(s)},fmt=function(n){return n.toLocaleString('en-US')},sleep=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
function toast(m,k){var t=document.createElement('div');t.className='toast '+(k||'');t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove()},2600)}
function pop(txt,x,y,c){var p=document.createElement('div');p.className='pop';p.textContent=txt;p.style.left=x;p.style.bottom=y;p.style.color=c||'#fff';$('#scene').appendChild(p);setTimeout(function(){p.remove()},1400)}
function amb(t){var h='';for(var i=0;i<11;i++){var s=14+Math.random()*14,d=3+Math.random()*4,dl=Math.random()*4,l=Math.random()*92;
 h+='<span style="font-size:'+s+'px;'+((t.t==='drift'||t.t==='driftL')?'top:'+(6+Math.random()*40)+'%;animation:'+t.t+' '+(d*3)+'s linear '+dl+'s infinite':(t.t==='rise'?'bottom:8%;left:'+l+'%;animation:rise '+d+'s ease-out '+dl+'s infinite':'top:0;left:'+l+'%;animation:fall '+d+'s linear '+dl+'s infinite'))+'">'+t.a+'</span>'}
 $('#amb').innerHTML=h}
function scene(i,enter){var t=T[i];$('#sky').style.background='linear-gradient('+t.sky[0]+','+t.sky[1]+')';$('#far').innerHTML=farSvg(t);
 var art=$('#art');if(t.art){art.style.backgroundImage='url('+t.art+')';art.style.display='block';$('#mid').style.display='none'}else{art.style.display='none';$('#mid').style.display='';$('#mid').innerHTML=build(i)}
 var b=$('#boss');b.className='unit'+(t.big?' big':'');b.textContent=t.def;
 $('#sname').innerHTML=S[i][0]+'<small>القوة المطلوبة '+fmt(S[i][1])+' · المكافأة '+fmt(S[i][2])+'</small>';amb(t);
 if(enter){var sc=$('#scene');sc.classList.remove('enter');void sc.offsetWidth;sc.classList.add('enter')}}
function dock(){var d=$('#dock'),c=sel&&byI(sel),on=!!c&&!busy&&st.stage<10;d.classList.toggle('on',on);if(c)$('#go').textContent='⚔️ اقتحام بـ '+c.name}
function head(){var h='';for(var i=0;i<10;i++)h+='<i class="'+(i<st.stage?'d':i===st.stage?'c':'')+'"></i>';$('#dots').innerHTML=h;$('#earn').textContent=fmt(st.earned);$('#tot').textContent=fmt(st.total);$('#prog').textContent='المرحلة '+Math.min(st.stage+1,10)+'/10'}
function byI(i){return CH.filter(function(x){return x.i===i})[0]}
function av(c){return c.img?'<img src="'+esc(c.img)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':c.emoji}
function picker(){
 if(st.stage>=10){$('#pick').innerHTML='<div class="fin">🏆 تم احتلال المملكة بالكامل<span>إجمالي الأرباح '+fmt(st.earned)+' · يتجدد الغزو عند 12:00 ليلاً</span></div>';return}
 var cur=S[st.stage],h='<h2>⚔️ اختر شخصية للاقتحام <small>المطلوب '+fmt(cur[1])+'</small></h2><div class="grid">';
 if(!CH.length)h+='<div class="fin" style="grid-column:1/-1">لا توجد شخصيات بحسابك</div>';
 CH.forEach(function(c){var u=st.used.indexOf(c.name)>-1,w=c.power<cur[1];h+='<button class="c '+(u?'used':w?'weak':'ok')+(sel===c.i?' sel':'')+'" data-n="'+c.i+'"><div class="im">'+av(c)+'<span class="nm">#'+c.i+'</span></div><b>'+esc(c.name)+'</b><small>'+(u?'🔒 مستنزفة':'⚔️ '+fmt(c.power))+'</small></button>'});
 h+='</div>';
 $('#pick').innerHTML=h;dock()}
function heroShow(){var h=$('#hero'),c=sel&&byI(sel);if(c){h.innerHTML='<div class="hc">'+av(c)+'<b>'+esc(c.name)+'</b></div>';h.className='unit';void h.offsetWidth;h.className='unit in'}else h.className='unit'}
function setState(n){st={stage:n.stage,used:n.used,earned:n.earned,total:n.total||n.earned}}
function init(){setState(D.state);sel=null;busy=false;$('#hero').className='unit';scene(Math.min(st.stage,9),true);head();picker()}
async function card(i){$('#cn').textContent='المرحلة '+(i+1)+' / 10';$('#ct').textContent=S[i][0];var c=$('#card');c.classList.remove('show');void c.offsetWidth;c.classList.add('show');await sleep(900);scene(i,true);await sleep(1200)}
function confetti(){var e=['🎉','✨','👑','💰','⭐'],h='';for(var i=0;i<34;i++)h+='<span class="conf" style="left:'+Math.random()*100+'%;font-size:'+(14+Math.random()*16)+'px;animation-delay:'+Math.random()*1.2+'s">'+e[i%5]+'</span>';var d=document.createElement('div');d.innerHTML=h;while(d.firstChild)$('#scene').appendChild(d.firstChild);setTimeout(function(){document.querySelectorAll('.conf').forEach(function(x){x.remove()})},4200)}
async function attack(){
 var c=byI(sel),s=S[st.stage],hero=$('#hero'),boss=$('#boss');busy=true;picker();var y=$('#scene').getBoundingClientRect().top+window.scrollY-64;window.scrollTo({top:Math.max(0,y),behavior:'smooth'});var bc='unit'+(T[st.stage].big?' big':'');
 hero.className='unit in';await sleep(500);hero.className='unit lunge';await sleep(520);
 var r;try{var rs=await fetch('/kingdom/attack',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:D.csrf,index:c.i})});r=await rs.json()}catch(e){r={ok:false,message:'تعذّر الاتصال بالخادم'}}
 if(!r.ok){
  if(r.code==='WEAK'){boss.className=bc+' mock';pop('❌ القوة لا تكفي','30%','48%','#ff5470')}
  toast(r.code==='WEAK'?'❌ فشل الاقتحام\nالقوة '+fmt(r.power)+' · المطلوب '+fmt(r.need)+'\n💡 الشخصية لم تُستهلك':'❌ '+(r.message||'فشل الاقتحام'),'bad');
  await sleep(700);boss.className=bc;hero.className='unit back';await sleep(500);
  if(r.state){var ch=r.state.stage!==st.stage;setState(r.state);if(ch){sel=null;scene(Math.min(st.stage,9),true)}head()}
  busy=false;picker();return}
 $('#flash').classList.remove('go');void $('#flash').offsetWidth;$('#flash').classList.add('go');boss.className=bc+' hit';var mid=$('#mid');mid.classList.remove('hit');void mid.offsetWidth;mid.classList.add('hit');pop('-'+fmt(c.power),'55%','55%','#ffd36a');await sleep(650);
 boss.className=bc+' dead';pop('+'+fmt(r.total)+' 💰','42%','46%','#3ddc97');if(r.extra>0)toast('⚫ رفيقك شادو زادك +'+fmt(r.extra)+' مال إضافي!');await sleep(950);
 setState(r.state);sel=null;head();
 if(st.stage>=10){confetti();hero.className='unit back';$('#sname').innerHTML='👑 العرش الإمبراطوري<small>🏆 تم احتلال المملكة بالكامل</small>';busy=false;picker();return}
 hero.className='unit run';await sleep(1300);hero.className='unit';await card(st.stage);busy=false;picker()}
document.addEventListener('click',function(e){
 if(busy)return;var b=e.target.closest('.c');
 if(b){var n=+b.dataset.n,ch=byI(n);if(st.used.indexOf(ch.name)>-1){toast('🔒 '+ch.name+'\nتم استنزاف هذه الشخصية اليوم','bad');return}sel=sel===n?null:n;heroShow();picker();return}
 if(e.target.id==='go'&&sel)attack()});
function left(){var n=new Date(),t=Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate(),21,0,0);if(t<=n.getTime())t+=864e5;var s=Math.floor((t-n.getTime())/1000);return Math.floor(s/3600)+' س '+Math.floor(s%3600/60)+' د '+s%60+' ث'}
var cam=$('#cam'),sc2=$('#scene'),px=0,py=0,tx=0,ty=0,hov=false;
sc2.addEventListener('pointermove',function(e){var r=sc2.getBoundingClientRect();tx=(e.clientX-r.left)/r.width-.5;ty=(e.clientY-r.top)/r.height-.5;hov=true});
sc2.addEventListener('pointerleave',function(){hov=false});
(function loop(t){if(!hov){tx=Math.sin(t/2600)*.4;ty=Math.cos(t/3300)*.25}px+=(tx-px)*.06;py+=(ty-py)*.06;cam.style.transform='rotateY('+(px*10)+'deg) rotateX('+(-py*6)+'deg)';requestAnimationFrame(loop)})(0);
setInterval(function(){$('#cdv').textContent=left()},1000);$('#cdv').textContent=left();
init();
