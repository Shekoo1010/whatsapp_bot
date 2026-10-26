module.exports = `
:root{--bg:#0a0d16;--bg2:#0f1422;--gold:#f0c04a;--gold-dim:#8a6d24;--text:#eef1f8;--dim:#8891a3;--red:#ff3d57;--blue:#4aa8ff;--green:#3ddc97;--tier:#b83fff}
*{box-sizing:border-box;margin:0}
body{overflow-x:hidden;background:radial-gradient(900px 500px at 50% -10%,#2a1240 0,transparent 70%),var(--bg);color:var(--text);font-family:'Cairo',sans-serif;min-height:100vh;padding:max(18px,env(safe-area-inset-top)) 14px max(40px,env(safe-area-inset-bottom))}
.wrap{max-width:520px;margin:0 auto}
.en{font-family:'Oswald',sans-serif;direction:ltr;display:inline-block}
.eyebrow{text-align:center;font-family:'Oswald',sans-serif;letter-spacing:.45em;font-size:11px;color:var(--gold-dim);margin-bottom:12px}
[hidden]{display:none!important}
/* boss hero */
.hero{position:relative;border-radius:22px;padding:18px 16px 16px;background:linear-gradient(160deg,#1a0f2c,#0f1422 60%);border:1.5px solid transparent;background-clip:padding-box;isolation:isolate}
.hero::before{content:"";position:absolute;inset:-1.5px;border-radius:23px;z-index:-1;background:conic-gradient(from var(--a,0deg),#b83fff,#f0c04a,#ff3d57,#4aa8ff,#b83fff);animation:spin 6s linear infinite}
@property --a{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes spin{to{--a:360deg}}
.aura{position:absolute;inset:0;border-radius:22px;overflow:hidden;z-index:-1}
.aura::before{content:"";position:absolute;left:50%;top:38%;width:520px;height:520px;margin:-260px;background:repeating-conic-gradient(rgba(184,63,255,.22) 0 6deg,transparent 6deg 14deg);animation:rot 40s linear infinite;mask:radial-gradient(circle,#000 0,transparent 62%)}
@keyframes rot{to{transform:rotate(360deg)}}
.rank{position:absolute;top:12px;right:12px;font-family:'Oswald';font-weight:700;font-size:20px;color:#0a0d16;background:linear-gradient(135deg,#ffe28a,#f0c04a 50%,#c48f1a);padding:2px 14px;border-radius:10px;box-shadow:0 0 16px rgba(240,192,74,.5);direction:ltr}
.art{height:230px;border-radius:16px;margin-top:22px;background-size:cover;background-position:center 18%;--bf:brightness(1);--ds:#b83fff;filter:var(--bf) drop-shadow(0 0 22px var(--ds));transition:filter .6s;animation:float 3.5s ease-in-out infinite;-webkit-mask-image:linear-gradient(#000 78%,transparent);mask-image:linear-gradient(#000 78%,transparent)}
@keyframes float{50%{transform:translateY(-8px)}}
.art.hit{animation:shake .25s}
@keyframes shake{25%{transform:translateX(-10px) rotate(-3deg)}75%{transform:translateX(10px) rotate(3deg)}}
.bname{text-align:center;font-family:'Oswald';font-size:30px;font-weight:600;direction:ltr;line-height:1.1}
.chip{display:table;margin:8px auto 0;font-family:'Oswald';font-size:13px;letter-spacing:.1em;color:var(--tier);border:1px solid var(--tier);border-radius:20px;padding:2px 14px;background:rgba(184,63,255,.1);direction:ltr}
/* hp */
.hpbar{position:relative;height:20px;border-radius:12px;background:#0b0e18;border:1px solid #2a3150;margin-top:14px;overflow:hidden}
.hpfill{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#ff3d57,#ff8a4a);transition:width .5s;box-shadow:0 0 14px #ff3d57}
.shfill{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,rgba(74,168,255,.85),rgba(150,210,255,.85));transition:width .5s;mix-blend-mode:screen}
.tick{position:absolute;top:0;bottom:0;width:2px;background:rgba(255,255,255,.55)}
.hptxt{display:flex;justify-content:space-between;font-family:'Oswald';font-size:13px;color:var(--dim);margin-top:5px;direction:ltr}
.phases{display:flex;gap:6px;justify-content:center;margin-top:10px}
.ph{font-size:12px;font-weight:800;color:var(--dim);border:1px solid #2a3150;border-radius:20px;padding:2px 11px;background:#0d1220}
.ph.on{color:#fff;border-color:var(--red);box-shadow:0 0 10px rgba(255,61,87,.5);background:rgba(255,61,87,.15)}
/* lobby */
.ring{position:relative;width:132px;height:132px;margin:20px auto 6px}
.ring svg{transform:rotate(-90deg)}
.ring b{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Oswald';font-size:40px}
.ring small{font-family:'Cairo';font-size:12px;color:var(--dim);font-weight:600}
.slots{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:14px 0}
.slot{aspect-ratio:1;border-radius:14px;border:1.5px dashed #2a3150;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--dim);text-align:center;background:#0d1220;line-height:1.1;padding:3px}
.slot.f{border:1.5px solid var(--gold);color:#fff;font-weight:800;background:linear-gradient(160deg,#2b2111,#0d1220);animation:pop .4s;box-shadow:0 0 12px rgba(240,192,74,.35)}
@keyframes pop{0%{transform:scale(.4)}70%{transform:scale(1.12)}}
.h2{text-align:center;font-weight:800;color:var(--gold-dim);margin:16px 0 10px;font-size:16px}
/* char cards */
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.cc{position:relative;border-radius:14px;padding:10px 6px 8px;text-align:center;background:linear-gradient(170deg,color-mix(in srgb,var(--tier) 30%,#0f1422),#0b0e18 75%);border:1.5px solid var(--tier);box-shadow:0 0 14px color-mix(in srgb,var(--tier) 35%,transparent);overflow:hidden;transition:.3s}
.cc::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.18) 50%,transparent 60%);transform:translateX(-120%);animation:shine 4s infinite}
@keyframes shine{to{transform:translateX(120%)}}
.cc .em img{width:100%;height:78px;object-fit:cover;object-position:center 22%;border-radius:9px;display:block}
.cc .n{font-family:'Oswald';font-size:13px;direction:ltr;margin-top:2px;line-height:1.15}
.cc .p{font-family:'Oswald';font-size:12px;color:var(--tier);direction:ltr}
.cc .mh{height:5px;border-radius:4px;background:#0b0e18;margin-top:6px;overflow:hidden}
.cc .mh i{display:block;height:100%;background:var(--green);transition:width .4s}
.cc.act{transform:translateY(-4px) scale(1.04)}
.cc.dead{filter:grayscale(1) brightness(.5);opacity:.7}
.btn{display:block;width:100%;font-family:'Cairo';font-weight:800;font-size:18px;padding:15px;border-radius:16px;border:1.5px solid var(--gold);cursor:pointer;color:#1a1204;margin-top:16px;background:linear-gradient(180deg,#ffe28a,#f0c04a 55%,#c48f1a);box-shadow:0 6px 24px rgba(240,192,74,.35)}
.btn:disabled{filter:grayscale(1) brightness(.55);box-shadow:none;cursor:not-allowed}
.btn.atk{font-size:22px;background:linear-gradient(180deg,#ff7a8a,#ff3d57 55%,#a8112b);border-color:#ff7a8a;color:#fff;animation:pulse 1.4s infinite}
.btn.atk:disabled{animation:none}
@keyframes pulse{50%{box-shadow:0 6px 34px rgba(255,61,87,.75)}}
/* battle */
.turn{display:flex;gap:6px;overflow-x:auto;padding:12px 0 4px}
.tp{flex:0 0 auto;font-weight:800;font-size:13px;padding:4px 12px;border-radius:20px;border:1px solid #2a3150;color:var(--dim);background:#0d1220}
.tp.on{color:#fff;border-color:var(--gold);background:rgba(240,192,74,.15);box-shadow:0 0 10px rgba(240,192,74,.4)}
.tp.me{border-style:dashed}
.tp.x{opacity:.35;text-decoration:line-through}
.tbar{height:6px;border-radius:4px;background:#0b0e18;margin:8px 0 2px;overflow:hidden}
.tbar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,var(--gold),var(--red));transition:width 1s linear}
.tl{display:flex;justify-content:space-between;font-size:13px;color:var(--dim)}
.log{margin-top:14px;background:#0b0e18;border:1px solid #1f2740;border-radius:14px;padding:10px 12px;height:128px;overflow-y:auto;font-size:13px;line-height:1.7}
.log p{border-bottom:1px solid #151b2e;padding:1px 0;animation:fade .3s}
@keyframes fade{from{opacity:0;transform:translateY(4px)}}
.log .c{color:var(--gold)}.log .b{color:#ff8a9a}.log .g{color:var(--green)}
.lb{margin-top:14px;display:grid;gap:6px}
.lr{display:flex;align-items:center;gap:10px;background:#0d1220;border:1px solid #1f2740;border-radius:12px;padding:7px 12px;font-size:14px;font-weight:800}
.lr .r{font-family:'Oswald';width:22px;color:var(--gold-dim)}
.lr:nth-child(1) .r{color:var(--gold)}
.lr .d{margin-inline-start:auto;font-family:'Oswald';color:var(--red);direction:ltr}
.pop{position:absolute;left:50%;top:40%;font-family:'Oswald';font-weight:700;font-size:34px;color:#fff;text-shadow:0 0 12px var(--red),0 2px 0 #000;pointer-events:none;animation:up 1s forwards;z-index:5}
.pop.cr{font-size:50px;color:var(--gold);text-shadow:0 0 18px #ff8a00,0 2px 0 #000}
.pop.sh{color:var(--blue);text-shadow:0 0 12px var(--blue)}
@keyframes up{to{transform:translateY(-90px);opacity:0}}
.flash{position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle,rgba(255,226,138,.5),transparent 70%);animation:fl .35s forwards;z-index:9}
@keyframes fl{to{opacity:0}}
/* result */
.banner{text-align:center;font-family:'Oswald';font-weight:700;font-size:46px;letter-spacing:.06em;margin:6px 0 2px;background:linear-gradient(180deg,#fff,#f0c04a 60%,#c48f1a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 18px rgba(240,192,74,.5))}
.banner.lose{background:linear-gradient(180deg,#ddd,#667);-webkit-background-clip:text;background-clip:text;filter:none}
.rw{display:grid;gap:8px;margin-top:12px}
.rr{background:#0d1220;border:1.5px solid #1f2740;border-radius:14px;padding:10px 12px}
.rr.t1{border-color:var(--gold);box-shadow:0 0 16px rgba(240,192,74,.3)}
.rr.t2{border-color:#c9d2e6}.rr.t3{border-color:#c47a3a}
.rr .h{display:flex;justify-content:space-between;font-weight:800;font-size:15px}
.rr .h em{font-style:normal;font-family:'Oswald';color:var(--red);direction:ltr}
.rr .i{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;font-family:'Oswald';font-size:13px;direction:ltr}
.rr .i span{border:1px solid #2a3150;border-radius:20px;padding:1px 10px;background:#0b0e18}
.note{text-align:center;color:var(--dim);font-size:12px;margin-top:22px;line-height:1.7}

.btn.go{background:#0f1422;color:var(--gold);box-shadow:none;margin-top:10px;font-size:16px}
.stage{position:relative;height:150px;margin-top:8px}
.atkr{position:absolute;left:50%;bottom:0;width:104px;margin-left:-52px;z-index:8;pointer-events:none;border-radius:16px;border:2px solid var(--tier);box-shadow:0 0 22px var(--tier);background:#0b0e18;overflow:hidden}
.atkr img{width:100%;height:104px;object-fit:cover;object-position:center 22%;display:block}
.atkr span{display:block;text-align:center;font-weight:800;font-size:12px;padding:2px;background:color-mix(in srgb,var(--tier) 40%,#0b0e18)}
.sl{position:absolute;left:-10%;width:120%;height:7px;border-radius:5px;z-index:6;pointer-events:none;background:linear-gradient(90deg,transparent,#fff 22%,var(--c) 50%,#fff 78%,transparent);box-shadow:0 0 18px var(--c),0 0 42px var(--c)}
.rg{position:absolute;left:50%;top:48%;width:40px;height:40px;margin:-20px;border-radius:50%;border:5px solid var(--c);box-shadow:0 0 22px var(--c);z-index:6;pointer-events:none}
.pt{position:absolute;width:9px;height:9px;border-radius:50%;box-shadow:0 0 10px currentColor;z-index:6;pointer-events:none}
.bn{position:absolute;left:0;right:0;top:40%;text-align:center;font-family:'Oswald';font-weight:700;font-size:38px;letter-spacing:.08em;color:#fff;text-shadow:0 0 18px var(--c),0 0 40px var(--c),0 3px 0 #000;z-index:7;pointer-events:none;direction:ltr}
.beam{position:absolute;left:50%;top:-40px;width:34px;margin-left:-17px;height:calc(100% + 40px);transform-origin:top;background:linear-gradient(#fff,#ff3d57 45%,rgba(255,61,87,.2));box-shadow:0 0 30px #ff3d57;border-radius:20px;z-index:7;pointer-events:none}
.wv{position:absolute;left:-14px;right:-14px;top:-60px;bottom:-60px;background:linear-gradient(transparent,rgba(255,61,87,.55) 45%,rgba(255,255,255,.85) 50%,rgba(255,61,87,.55) 55%,transparent);z-index:7;pointer-events:none}
.pop.hl{color:var(--green);text-shadow:0 0 12px var(--green)}
.cine{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;pointer-events:none;background:radial-gradient(circle,transparent 22%,rgba(0,0,0,.82)),repeating-conic-gradient(rgba(255,255,255,.14) 0 2deg,transparent 2deg 9deg)}
.cine b{display:block;font-family:'Oswald';font-weight:700;font-size:68px;letter-spacing:.06em;direction:ltr;background:linear-gradient(180deg,#fff,#f0c04a 55%,#ff7a00);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 22px #ff8a00)}
.intro{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#05060c}
.intro::before{content:"";position:absolute;inset:-50%;background:repeating-conic-gradient(rgba(184,63,255,.28) 0 5deg,transparent 5deg 12deg);animation:rot 20s linear infinite;mask:radial-gradient(circle,#000 0,transparent 55%)}
.iimg{position:relative;width:min(78vw,320px);height:min(52vh,380px);border-radius:22px;background-size:cover;background-position:center 18%;border:2px solid var(--gold);box-shadow:0 0 60px #b83fff}
.itx{position:relative;text-align:center;font-family:'Oswald';font-size:13px;letter-spacing:.5em;color:var(--gold-dim)}
.inm{position:relative;font-family:'Oswald';font-weight:700;font-size:36px;color:#fff;text-shadow:0 0 24px #b83fff;direction:ltr}

.hero[data-ph="2"]::before{background:conic-gradient(from var(--a,0deg),#4aa8ff,#fff,#4aa8ff,#1a5fb4,#4aa8ff)}
.hero[data-ph="3"]::before{background:conic-gradient(from var(--a,0deg),#ff3d57,#2a0010,#ff3d57,#ff8a4a,#ff3d57)}
.hero[data-ph="4"]::before{background:conic-gradient(from var(--a,0deg),#ff7a00,#ffe28a,#ff3d57,#ff7a00);animation:spin 1.4s linear infinite}
.hero[data-ph="4"]{animation:rageP .8s infinite}
@keyframes rageP{50%{box-shadow:0 0 46px rgba(255,122,0,.65)}}
.hero[data-ph="2"] .aura::before{background:repeating-conic-gradient(rgba(74,168,255,.3) 0 6deg,transparent 6deg 14deg)}
.hero[data-ph="3"] .aura::before,.hero[data-ph="4"] .aura::before{background:repeating-conic-gradient(rgba(255,61,87,.34) 0 6deg,transparent 6deg 14deg);animation-duration:12s}
.xf{position:fixed;inset:0;z-index:55;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:18vh;background:radial-gradient(circle at 50% 28%,transparent 16%,rgba(0,0,0,.88) 70%)}
.xf small{font-family:'Oswald';letter-spacing:.5em;font-size:14px;color:var(--c)}
.xf b{font-family:'Oswald';font-weight:700;font-size:52px;letter-spacing:.06em;color:#fff;text-shadow:0 0 22px var(--c),0 0 54px var(--c);direction:ltr;white-space:nowrap}
.fl2{position:fixed;inset:0;z-index:56;background:#fff;pointer-events:none}

.tabs{display:flex;gap:8px;margin:6px 0 14px}.tabs button{flex:1;font-family:'Cairo';font-weight:800;font-size:15px;padding:10px;border-radius:14px;border:1.5px solid #2a3150;background:#0d1220;color:var(--dim);cursor:pointer}.tabs button.on{color:#1a1204;border-color:var(--gold);background:linear-gradient(180deg,#ffe28a,#f0c04a 55%,#c48f1a)}
.slots{grid-template-columns:repeat(5,1fr)}.slot{font-size:11px;position:relative;overflow:hidden;word-break:break-word}.slot.rd::after{content:"✔";position:absolute;top:1px;left:3px;color:var(--green);font-size:12px}
.msg{text-align:center;font-weight:800;font-size:14px;margin-top:10px;color:#ff8a9a}.msg.ok{color:var(--green)}
.si{display:flex;align-items:center;gap:10px;background:#0d1220;border:1.5px solid #1f2740;border-radius:14px;padding:10px 12px;margin-bottom:8px}.si .nm{flex:1;font-weight:800;font-size:15px}.si .sm{font-size:12px;color:var(--dim);font-weight:600}.si button{font-family:'Cairo';font-weight:800;font-size:14px;padding:8px 14px;border-radius:12px;border:1.5px solid var(--gold);background:linear-gradient(180deg,#ffe28a,#f0c04a 55%,#c48f1a);color:#1a1204;cursor:pointer;direction:ltr}.si button:disabled{filter:grayscale(1) brightness(.55);cursor:not-allowed}.si select{background:#0b0e18;color:var(--text);border:1px solid #2a3150;border-radius:10px;padding:6px;font-family:'Cairo';max-width:130px}
.coins{text-align:center;font-family:'Oswald';font-size:26px;color:var(--gold);margin:4px 0 12px;direction:ltr}
.topbar{display:flex;align-items:center;gap:10px;margin-bottom:8px}.topbar .ttl{font-weight:900;font-size:18px}
`
