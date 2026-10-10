// =========================
// 🏟️ تحدي ارينا — صفحة الموقع /u/:code/arena-challenge
// =========================
// نفس بيانات أرينا البوت بالضبط (player.arena + systems/arenaSystem.js + systems/arenaData.js):
// الفريق، الرتب/الترافي، الميداليات، متجر اليوم، المحاولات اليومية، الترتيب.
// الفرق الوحيد: القتال هنا "معركة فريق 3 ضد 3" بنمط Bleach Brave Souls — الستة يقاتلون بنفس الوقت،
// ومن يُنهي خصمه يساعد بضرب الأعداء المتبقين. معادلة الضرر/الصحة هي نفسها (computeHit/buildFighter).
// أوامر البوت (.هجوم_ارينا ...) ما تغيّرت.
//
// الربط (index.js):
//   const siteArenaChallenge = require('./systems/siteArenaChallenge')({ Player, getSock, getNotifyJid, orbs })
//   registerCharacterSite(app, Player, { ..., arenaChallenge: siteArenaChallenge })

const {
    getCharDev, buildFighter, computeHit, applyBattleResult, ensureArenaObject,
    getArenaChar, isArenaEligible, getRankZone, ARENA_RANKS, COLOR_EMOJI, COLOR_NAME_AR, STAT_CAP
} = require('./arenaSystem')
const { colorMultiplier } = require('./arenaData')

const MAX_ATTEMPTS = 10
const PROMO_REWARD = { money: 25000, xp: 150 } // نفس grantPromotionReward في arenaSystem.js

const PAGE_CSS = String.raw`
:root{--text:#eef1ff;--text-dim:#8d96b8;--gold-dim:#8a6d24;--bg:#070911;--p:#0f1422;--p2:#151b2e;--tx:#eef1ff;--dim:#8d96b8;--gold:#f0c04a;--ln:#ffffff1c;--r:#ff3860;--g:#35e08a;--b:#3ea8ff;--y:#f0c04a;--pu:#c04aff;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@property --a{syntax:'<angle>';inherits:false;initial-value:0deg}
*{box-sizing:border-box}html,body{margin:0}
body{background:radial-gradient(900px 400px at 50% -10%,#f0c04a14,transparent 60%),var(--bg);color:var(--tx);font-family:'Cairo',system-ui,sans-serif;max-width:560px;margin-inline:auto;padding:12px 12px 90px}
.on{font-family:'Oswald','Cairo',sans-serif;direction:ltr;display:inline-block}
.hdr{border:2.5px solid transparent;border-radius:18px;padding:14px;background:linear-gradient(var(--p),var(--p)) padding-box,conic-gradient(from var(--a),#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860) border-box;animation:rot 6s linear infinite}
@keyframes rot{to{--a:360deg}}
.hr{display:flex;justify-content:space-between;align-items:center;gap:8px}
.rk{font-size:22px;font-weight:900;color:var(--gold)}.tr{font-size:34px;font-weight:700}
.st{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.st span{background:var(--p2);border:1px solid var(--ln);border-radius:20px;padding:3px 12px;font-size:13px;font-weight:700}
.zb{position:relative;height:20px;border-radius:12px;margin:16px 4px 6px;background:linear-gradient(270deg,var(--r) 0 20%,#cfd5e8 20% 80%,var(--g) 80%)}
.zb.dg{animation:dg 1s ease-in-out infinite}@keyframes dg{50%{box-shadow:0 0 22px var(--r)}}
.mk{position:absolute;top:-9px;width:0;height:0;border:9px solid transparent;border-top:13px solid #fff;transform:translateX(50%);transition:right .8s}
.mk::after{content:"";position:absolute;left:-2px;top:-9px;width:4px;height:24px;background:#fff;border-radius:2px;transform:translateY(8px)}
.zl{display:flex;justify-content:space-between;font-size:11px;color:var(--dim);padding:0 4px}
.zm{margin-top:8px;font-size:13px;font-weight:700;text-align:center;padding:7px;border-radius:10px}
.zm.dg{background:#ff386022;color:#ff7a96}.zm.sf{background:#ffffff14}.zm.up{background:#35e08a22;color:var(--g)}
.tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:14px 0 10px}.tabs button{flex:1;font:inherit;font-weight:700;font-size:13px;padding:9px 4px;border-radius:12px;border:1px solid var(--ln);background:var(--p);color:var(--tx)}
.tabs button.cur{background:var(--gold);color:#0a0d16;border-color:var(--gold)}
.sec{display:none}.sec.cur{display:block}
.my{display:flex;gap:8px;margin-bottom:12px;align-items:center;font-size:12px;color:var(--dim)}
.cd{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:900;color:#0a0d16;font-size:14px;box-shadow:0 0 10px currentColor}
.op{display:grid;grid-template-columns:1fr auto;gap:6px 10px;background:var(--p);border:1.5px solid var(--ln);border-radius:14px;padding:11px 12px;margin-bottom:9px;align-items:center}
.op b{font-size:16px}.op small{color:var(--dim);font-size:12px}
.tm{display:flex;gap:5px;margin-top:5px}.tm .cd{width:22px;height:22px;font-size:10px}
.op button{font:inherit;font-weight:900;border:0;border-radius:10px;padding:9px 16px;background:linear-gradient(135deg,#ff3860,#ff7a3d);color:#fff;box-shadow:0 0 14px #ff386055}
.op button:disabled{opacity:.5}
.adv{font-size:11px;font-weight:700;color:var(--g)}
.wh{background:var(--p);border:1.5px solid var(--ln);border-radius:18px;padding:10px;text-align:center}
.wh svg{width:100%;max-width:300px;height:auto}.wh p{margin:4px 0 2px;font-size:13px;min-height:40px}
.wh text{font-family:'Cairo';font-weight:900}
.rl{display:flex;gap:10px;align-items:center;background:var(--p);border:1.5px solid var(--ln);border-radius:14px;padding:10px 12px;margin-bottom:8px}
.rl.me{border-color:var(--gold);box-shadow:0 0 16px #f0c04a44}
.bd{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;font-weight:900;font-size:20px;color:#0a0d16;flex:none}
.rl b{font-size:15px}.rl small{display:block;color:var(--dim);font-size:11px}
.ch{display:inline-block;font-size:11px;font-weight:700;background:var(--p2);border:1px solid var(--ln);border-radius:12px;padding:2px 8px;margin:4px 4px 0 0}
.nt{font-size:11px;color:var(--dim);text-align:center;margin-top:10px;line-height:1.7}
/* team / shop / top */
.ts{display:flex;gap:8px;margin-bottom:10px}.slot{flex:1;height:54px;border-radius:12px;border:2px dashed var(--ln);display:grid;place-items:center;color:var(--dim);font-weight:900;font-size:18px}
.slot.f{border:2px solid var(--c);border-style:solid;box-shadow:0 0 12px var(--c);color:var(--tx);grid-template-columns:auto auto;gap:8px;font-size:14px}.slot.f b{background:#fff;color:#0a0d16;width:22px;height:22px;border-radius:50%;font:700 13px/22px 'Oswald',sans-serif;text-align:center}
.fch{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.fch button{font:inherit;font-size:12px;font-weight:700;padding:4px 12px;border-radius:16px;border:1.5px solid var(--c);background:transparent;color:var(--tx)}.fch button.cur{background:var(--c);color:#0a0d16}
.cg{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.ac{position:relative;border-radius:14px;border:2.5px solid var(--c);overflow:hidden;background:var(--p);cursor:pointer}
.ac.sel{box-shadow:0 0 18px var(--c)}
.ac .im{aspect-ratio:3/4;background:linear-gradient(160deg,color-mix(in srgb,var(--c) 55%,#000),#0b0d18) center/cover;display:grid;place-items:center;font-size:44px;font-weight:900;color:#ffffffaa}
.ac .cdot{position:absolute;top:6px;right:6px;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px var(--c)}
.ac .ord{position:absolute;top:5px;left:5px;width:22px;height:22px;border-radius:50%;background:#fff;color:#0a0d16;font:700 13px/22px 'Oswald',sans-serif;text-align:center;text-decoration:none;display:none}.ac.sel .ord{display:block}
.ac .an{position:absolute;left:0;right:0;bottom:38px;padding:16px 6px 3px;text-align:center;background:linear-gradient(transparent,#000d);color:#fff}
.ac .an b{display:block;font-size:14px}.ac .an small{font-size:10px;color:#ffffffb0}
.ac .as{display:grid;grid-template-columns:1fr 1fr;gap:2px 6px;padding:5px 7px 6px;font-size:10px;font-weight:700;direction:ltr;text-align:left}
.shh{display:flex;gap:8px;justify-content:center;margin-bottom:12px;flex-wrap:wrap}.chp{background:var(--p);border:1px solid var(--ln);border-radius:20px;padding:4px 14px;font-weight:700;font-size:13px;direction:ltr}
.ofs{display:grid;grid-template-columns:1fr 1fr;gap:10px}.of{background:var(--p);border:1.5px solid var(--ln);border-radius:14px;padding:12px;text-align:center}
.of .ic{font-size:34px}.of b{display:block;font-size:14px}.of .am{font-size:26px;font-weight:700;color:var(--g);margin:2px 0 8px}
.of button{font:inherit;font-weight:900;border:0;border-radius:10px;padding:7px 18px;background:var(--gold);color:#0a0d16}.of button:disabled{opacity:.45}
#md2{position:fixed;inset:0;z-index:60;background:#000b;display:none;align-items:flex-end;justify-content:center}#md2.on3{display:flex}
#pk{width:100%;max-width:560px;max-height:75vh;overflow:auto;background:var(--p);border-radius:20px 20px 0 0;padding:16px 14px calc(16px + env(safe-area-inset-bottom,0px))}
#pk h3{margin:0 0 10px;font-size:15px;text-align:center}
.pr{display:flex;width:100%;align-items:center;gap:10px;font:inherit;background:var(--p2);color:var(--tx);border:1.5px solid var(--c);border-radius:12px;padding:9px 12px;margin-bottom:7px;text-align:start}
.pr:disabled{opacity:.4}.pr b{flex:1}.pr em{font-style:normal;font-family:'Oswald',sans-serif;direction:ltr;color:var(--g)}.pr .d2{width:16px;height:16px;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c)}
#pk .x{width:100%;font:inherit;font-weight:700;border:1px solid var(--ln);background:transparent;color:var(--dim);border-radius:12px;padding:9px;margin-top:4px}
.lr{display:flex;align-items:center;gap:10px;background:var(--p);border:1.5px solid var(--ln);border-radius:14px;padding:9px 12px;margin-bottom:7px}
.lr.me{border-color:var(--gold);box-shadow:0 0 16px #f0c04a44}.lr>b{width:30px;text-align:center;font-size:18px}
.lr .av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:900;color:#0a0d16}.lr>div:nth-of-type(1){flex:1}.lr small{display:block;color:var(--dim);font-size:11px}
.lr .lp{text-align:end;font-weight:700}
#toast{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#000d;color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;opacity:0;transition:opacity .25s;pointer-events:none;z-index:70}#toast.on3{opacity:1}
/* battle */
#bt{position:fixed;inset:0;z-index:50;background:#05060d;display:none;flex-direction:column;overflow:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
#bt.on2{display:flex}
.bg{position:absolute;inset:0;overflow:hidden;background:radial-gradient(ellipse at 50% 0,#4a1668,#170a28 42%,#05060d 80%)}
.bm{position:absolute;left:50%;top:-18vmin;width:84vmin;height:84vmin;margin-left:-42vmin;border-radius:50%;border:3px dashed #f0c04a55;box-shadow:inset 0 0 60px #f0c04a22,0 0 40px #c04aff33;animation:spin 40s linear infinite}
.bm::after{content:"";position:absolute;inset:12%;border-radius:50%;border:2px solid #ff386044}
@keyframes spin{to{transform:rotate(360deg)}}
.bz{position:absolute;top:-4%;width:34vmin;height:120%;transform-origin:50% 0;clip-path:polygon(46% 0,54% 0,100% 100%,0 100%);background:linear-gradient(180deg,#fffa,transparent 75%);opacity:.5;mix-blend-mode:screen}
.z1{left:6%;background:linear-gradient(180deg,#ff3860cc,transparent 75%);animation:sw1 6s ease-in-out infinite alternate}
.z2{right:6%;background:linear-gradient(180deg,#3ea8ffcc,transparent 75%);animation:sw1 7s ease-in-out infinite alternate-reverse}
@keyframes sw1{from{transform:rotate(-26deg)}to{transform:rotate(26deg)}}
.cr{position:absolute;left:0;right:0;top:38%;height:70px;background:radial-gradient(circle at 11px 14px,#000 8px,transparent 9px) 0 0/24px 18px repeat-x,radial-gradient(circle at 20px 36px,#000 9px,transparent 10px) 0 0/30px 26px repeat-x,linear-gradient(#0000,#000b);opacity:.9}
.cr::after{content:"";position:absolute;inset:0;background:radial-gradient(2px 2px at 12% 30%,#fff,transparent),radial-gradient(2px 2px at 38% 55%,#fff,transparent),radial-gradient(2px 2px at 64% 25%,#fff,transparent),radial-gradient(2px 2px at 86% 50%,#fff,transparent);animation:tw 1.6s steps(2) infinite}
@keyframes tw{50%{opacity:.1}}
.fl{position:absolute;left:-30%;right:-30%;bottom:-6%;height:52%;background:radial-gradient(ellipse at 50% 0,#f0c04a44,transparent 62%),repeating-linear-gradient(90deg,#ffffff12 0 1px,transparent 1px 44px),repeating-linear-gradient(0deg,#ffffff0e 0 1px,transparent 1px 38px);transform:perspective(380px) rotateX(58deg);transform-origin:50% 0}
#pc{position:absolute;inset:0}
.bh,.tr,.stg,.lg{position:relative;z-index:1}
.bh{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;color:#fff;direction:ltr}
.dots{display:flex;gap:6px}.dots i{width:14px;height:14px;border-radius:50%;background:#ffffff26;border:2px solid #ffffff55}.dots i.w{background:var(--g);border-color:var(--g)}.dots i.l{background:var(--r);border-color:var(--r)}
.bh button{font:inherit;font-size:12px;font-weight:700;background:#ffffff1c;color:#fff;border:1px solid #ffffff44;border-radius:10px;padding:5px 12px}
.fc{position:relative;aspect-ratio:3/4;border-radius:16px;border:3px solid var(--c);background:linear-gradient(160deg,color-mix(in srgb,var(--c) 55%,#000),#0b0d18);box-shadow:0 0 28px var(--c);display:grid;place-items:center;font-size:60px;font-weight:900;color:#ffffffcc;overflow:hidden}
.fc em{position:absolute;bottom:0;inset-inline:0;font-style:normal;font-size:15px;padding:16px 4px 6px;background:linear-gradient(transparent,#000d);color:#fff}
.hp{height:12px;border-radius:8px;background:#000a;border:1.5px solid #fff5;margin-top:8px;overflow:hidden}.hp i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#35e08a,#b6ff6a);transition:width .35s}
.ht{font-size:12px;color:#fff;margin-top:3px}
.hit{animation:hit .4s}@keyframes hit{20%{transform:translateX(-8px);filter:brightness(2.4)}50%{transform:translateX(8px)}80%{transform:translateX(-4px)}}
.sl{position:absolute;inset:0;pointer-events:none;overflow:hidden}.sl::after{content:"";position:absolute;left:-20%;top:46%;width:140%;height:5px;background:linear-gradient(90deg,transparent,#fff,transparent);box-shadow:0 0 14px #fff,0 0 30px var(--c);transform:rotate(-35deg) scaleX(0);animation:slx .35s forwards}
@keyframes slx{60%{transform:rotate(-35deg) scaleX(1);opacity:1}to{transform:rotate(-35deg) scaleX(1);opacity:0}}
.dm{position:absolute;left:50%;top:18%;font-family:'Oswald',sans-serif;font-weight:700;font-size:32px;color:#fff;text-shadow:0 0 10px #000,0 0 18px var(--r);animation:dm 1s forwards;pointer-events:none;white-space:nowrap;z-index:3}
.dm.cr2{font-size:44px;color:var(--gold)}.dm.ad{color:#9dffcb}
@keyframes dm{from{transform:translate(-50%,0) scale(.5);opacity:1}30%{transform:translate(-50%,-14px) scale(1.2)}to{transform:translate(-50%,-70px) scale(1);opacity:0}}
.lg{min-height:52px;text-align:center;color:#fff;font-size:14px;font-weight:700;padding:6px 14px 4px}
.spl{position:absolute;left:-10%;right:-10%;top:38%;height:96px;background:linear-gradient(100deg,#ff3860,#f0c04a);transform:skewY(-6deg) translateX(110%);display:grid;place-items:center;color:#0a0d16;font-weight:900;font-size:32px;z-index:5;pointer-events:none}
.spl.go{animation:spl 1.3s forwards}@keyframes spl{20%{transform:skewY(-6deg) translateX(0)}75%{transform:skewY(-6deg) translateX(0)}to{transform:skewY(-6deg) translateX(-110%)}}
.res{position:absolute;inset:0;z-index:6;background:#05060dec;display:none;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;text-align:center;padding:20px}
.res.on2{display:flex}.res h2{font-size:48px;margin:0;font-weight:900;animation:pop .6s}@keyframes pop{from{transform:scale(2.4);opacity:0}}
.res.win h2{color:var(--gold);text-shadow:0 0 24px var(--gold)}.res.lose h2{color:var(--r);text-shadow:0 0 24px var(--r)}
.res p{margin:0;font-size:16px;font-weight:700}.res button{font:inherit;font-weight:900;border:0;border-radius:12px;padding:11px 30px;background:var(--gold);color:#0a0d16;margin-top:10px}
.tr{display:flex;gap:10px;justify-content:center;padding:6px 10px;direction:ltr;animation:rin .6s;position:relative;z-index:1}
#te{animation-name:rinT}@keyframes rin{from{transform:translateY(46px);opacity:0}}@keyframes rinT{from{transform:translateY(-46px);opacity:0}}
.un{position:relative;width:31%;max-width:120px}
.un .fc{font-size:46px}.un.tg .fc{outline:3px solid #ff3860;outline-offset:3px}
.un.ko .fc{animation:ko .8s forwards}@keyframes ko{to{transform:translateY(30px) rotate(12deg) scale(.85);opacity:.25;filter:grayscale(1)}}
.un .hp{margin-top:6px;height:10px}
.cc{position:absolute;top:6px;right:6px;width:13px;height:13px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px currentColor}
.mid{flex:1;position:relative;z-index:1;min-height:70px;display:grid;place-items:center;direction:ltr}
.mid::before{content:"";position:absolute;left:-10%;right:-10%;top:50%;height:3px;background:linear-gradient(90deg,transparent,#ffffff66,transparent);transform:rotate(-6deg)}
.vs{position:relative;font:700 34px 'Oswald',sans-serif;color:#fff;text-shadow:0 0 14px #ff3860,0 0 28px #ff3860;font-style:italic}
@media (prefers-reduced-motion:reduce){.hdr,.zb.dg,.bm,.bz,.cr::after{animation:none}}

.tbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.tbl{display:inline-flex;align-items:center;gap:10px}.tbl b{font-size:17px}
.tbar a{color:var(--gold);font-weight:700;font-size:13px;text-decoration:none;border:1px solid var(--gold-dim);border-radius:10px;padding:6px 12px}
.cd{position:relative;overflow:hidden}.cd b{position:relative;z-index:0}.pc2{position:absolute;inset:0;background:center 20%/cover;border-radius:50%}
.pic{position:absolute;inset:0;background:center 20%/cover}.fc em,.cc{z-index:2}.ac .im{background-position:center 20%}
.mid .spl{z-index:5}

/* ترقية الرتبة */
#pu{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:radial-gradient(circle,#2b1a05f2,#05060df7 70%);overflow:hidden}#pu.on{display:flex}
.pur{position:absolute;left:50%;top:50%;width:160vmax;height:160vmax;margin:-80vmax 0 0 -80vmax;background:repeating-conic-gradient(#f0c04a33 0 6deg,transparent 6deg 18deg);-webkit-mask:radial-gradient(circle,#000 4%,transparent 42%);mask:radial-gradient(circle,#000 4%,transparent 42%);animation:puspin 18s linear infinite}
@keyframes puspin{to{transform:rotate(360deg)}}
#pup{position:absolute;inset:0;width:100%;height:100%}
.pus{position:relative;text-align:center;color:#fff;padding:20px}
.pub{width:150px;height:150px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;font:900 64px 'Cairo',sans-serif;color:#0a0d16;background:conic-gradient(from var(--a),#fff6d8,#f0c04a,#a9791f,#f0c04a,#fff6d8);box-shadow:0 0 60px #f0c04a,0 0 120px #f0c04a66;animation:pubin 1.1s cubic-bezier(.2,1.4,.4,1) .9s both,rot 4s linear infinite}
@keyframes pubin{from{transform:scale(3.4);opacity:0;filter:blur(10px)}}
.put{font:900 46px 'Oswald',sans-serif;letter-spacing:.12em;background:linear-gradient(180deg,#fff,#f0c04a);-webkit-background-clip:text;background-clip:text;color:transparent;animation:putin .6s .5s both}
.pun{font-size:30px;font-weight:900;color:var(--gold);animation:putin .6s 1.5s both}.pua{font-size:15px;color:#ffffffb8;margin-top:6px;animation:putin .6s 1.8s both}.pur2{margin-top:10px;animation:putin .6s 2.1s both}
@keyframes putin{from{opacity:0;transform:translateY(-26px) scale(1.5)}}
#pux{margin-top:18px;font:inherit;font-weight:900;border:0;border-radius:12px;padding:11px 34px;background:var(--gold);color:#0a0d16;animation:putin .6s 2.4s both}
.pflash{position:absolute;inset:0;background:#fff;opacity:0;animation:pfl 1.2s .85s}@keyframes pfl{0%{opacity:.95}to{opacity:0}}
.pring{position:absolute;left:50%;top:50%;width:20px;height:20px;margin:-10px;border-radius:50%;border:4px solid #f0c04a;opacity:0;animation:prg 1.6s ease-out var(--d)}@keyframes prg{from{transform:scale(1);opacity:.9}to{transform:scale(60);opacity:0}}
@media (prefers-reduced-motion:reduce){.pur,.pring,.pflash{display:none}.pub,.put,.pun,.pua,.pur2,#pux{animation:none}}
`
const PAGE_BODY = String.raw`<div id="pu"><canvas id="pup"></canvas><div class="pur"></div><div class="pus"><div class="pub" id="pub"></div><div class="put">RANK UP</div><div class="pun" id="pun"></div><div class="pua" id="pua"></div><div class="pur2" id="pur2"></div><button id="pux">متابعة</button></div></div>

<div class="hdr">
 <div class="hr"><div><div style="font-size:12px;color:var(--dim)">رتبتك في الأرينا</div><div class="rk" id="rk"></div></div><div class="tr on" id="tr"></div></div>
 <div class="st"><span id="at"></span><span id="md"></span><span>🏆 فوز <b id="ws"></b> | خسارة <b id="ls"></b></span></div>
 <div class="zb" id="zb"><div class="mk" id="mk"></div></div>
 <div class="zl"><span>منطقة الهبوط</span><span>آمن</span><span>منطقة الترقية</span></div>
 <div class="zm" id="zm"></div>
</div>
<div class="tabs" id="tabs"><button data-t="s1" class="cur">⚔️ الخصوم</button><button data-t="s4">👥 فريقي</button><button data-t="s5">🛒 المتجر</button><button data-t="s6">🏆 الترتيب</button><button data-t="s2">🎨 الألوان</button><button data-t="s3">🎖️ الرتب</button></div>
<div class="sec cur" id="s1"><div class="my" id="my"></div><div id="ol"></div></div>
<div class="sec" id="s2"><div class="wh"><svg id="wsv" viewBox="0 0 260 260"></svg><p id="wi">اضغط على أي لون لترى تأثيره</p></div></div>
<div class="sec" id="s3"><div id="rl"></div><div class="nt">مكافأة كل ترقية: 25,000 💰 + 150 XP + صندوق ملحمي، ومع رتبة «قائد» صندوق SSS عالي. تتجدد الرتب كل يومين عند 12:00ص بتوقيت السعودية.</div></div>
<div class="sec" id="s4"><div class="nt" style="margin:0 0 8px">اختر 3 شخصيات بالترتيب: الأولى تواجه الأولى، وهكذا. تظهر هنا شخصياتك المؤهلة للأرينا فقط.</div><div class="ts" id="tslots"></div><div class="fch" id="fchips"></div><div class="cg" id="cg"></div><div class="act"><button id="tsv">حفظ فريق الدفاع</button></div></div>
<div class="sec" id="s5"><div class="shh"><span class="chp" id="shm"></span><span class="chp" id="shc"></span></div><div class="ofs" id="ofs"></div><div class="nt" id="shn"></div></div>
<div class="sec" id="s6"><div id="lbl"></div></div>
<div id="md2"><div id="pk"></div></div><div id="toast"></div>
<div id="bt">
 <div class="bg"><div class="bm"></div><div class="bz z1"></div><div class="bz z2"></div><div class="cr"></div><div class="fl"></div><canvas id="pc"></canvas></div>
 <div class="bh"><button id="sk">تخطّي ⏩</button><div class="dots" id="dt"><i></i><i></i><i></i></div><b class="on" id="bn"></b></div>
 <div class="tr" id="te"></div>
 <div class="mid"><div class="vs">VS</div><div class="spl" id="sp"></div></div>
 <div class="tr" id="tm"></div>
 <div class="lg" id="lg"></div>
 <div class="res" id="rs"><h2 id="rh"></h2><p id="r1"></p><p id="r2"></p><p id="r3"></p><button id="rb">رجوع للساحة</button></div>
</div>
`
const PAGE_JS = String.raw`var CFG=__CFG__,CODE=CFG.code,CSRF=CFG.csrf,S=null,E={},SL=[],FC='all',PO=0,busy=false,fast=false,pcT=0;
var $=function(i){return document.getElementById(i)};
var HX={red:'#ff3860',blue:'#3ea8ff',green:'#35e08a',yellow:'#f0c04a',purple:'#c04aff',orange:'#ff9a3d',pink:'#ff6ec7',white:'#e8ecff',black:'#7b84a3'};
var RC=['#8d96b8','#35e08a','#3ea8ff','#c04aff','#ff9a3d','#f0c04a'];
var SK=[['focus','🎯','تركيز'],['sp','⚡','ضغط روحي'],['def','🛡️','دفاع'],['stamina','❤️','تحمل']];
function col(k){k=String(k||'');if(HX[k])return HX[k];var h=0;for(var i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))%360;return 'hsl('+h+',80%,60%)'}
function cn(k){return(S&&S.colors.ar&&S.colors.ar[k])||k}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function imgU(u){return(typeof u==='string'&&/^https:\/\//.test(u)&&!/['"()\\\s]/.test(u))?u:''}
function bg(u){u=imgU(u);return u?' style="background-image:url(\''+u+'\')"':''}
function sk(k){return SK.filter(function(x){return x[0]===k})[0]}
function toast(t){var e=$('toast');e.textContent=t;e.classList.add('on3');clearTimeout(toast.t);toast.t=setTimeout(function(){e.classList.remove('on3')},2200)}
function get(){return fetch('/u/'+CODE+'/arena-challenge/data',{credentials:'same-origin'}).then(function(r){return r.json()}).catch(function(){return{ok:false,message:'تعذر الاتصال بالخادم'}})}
function post(op,b){b=b||{};b.csrf=CSRF;return fetch('/arena-challenge/'+op,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(function(r){return r.json()}).catch(function(){return{ok:false,message:'تعذر الاتصال بالخادم'}})}
function load(){return get().then(function(j){if(!j||!j.ok){toast((j&&j.message)||'تعذر التحميل');return}S=j.state;SL=S.me.team.slice();R();
 var key='acr:'+CODE,prev=null,cur=S.me.rankIdx;try{prev=localStorage.getItem(key);localStorage.setItem(key,String(cur))}catch(e){}
 if(prev!==null&&cur>+prev){var r=S.ranks[cur],rw=r.rw?'<span class="ch">💰 '+Number(r.rw.money).toLocaleString('en-US')+'</span><span class="ch">⭐ '+r.rw.xp+' XP</span><span class="ch">📦 صندوق ملحمي</span>'+(r.rw.sss?'<span class="ch">📦 SSS عالي</span>':''):'';promote(S.ranks[+prev].n,r.n,rw)}})}
function cd(t){return '<span class="cd" style="color:'+col(t.c)+';background:'+col(t.c)+'"><b style="color:#0a0d16">'+esc(String(t.n||'?').charAt(0))+'</b><i class="pc2"'+bg(t.img)+'></i></span>'}
function byI(i){return S.roster.filter(function(r){return r.i===i})[0]}
function R(){
 var m=S.me;E={};S.colors.edges.forEach(function(e){E[e[0]+'>'+e[1]]=1});
 $('rk').textContent=m.rankName;$('tr').textContent='🏆 '+m.pts;$('at').textContent='⚔️ محاولات '+m.att+'/'+S.maxAtt;$('md').textContent='🥇 '+m.medals;$('ws').textContent=m.wins;$('ls').textContent=m.losses;
 $('zb').style.background='linear-gradient(270deg,'+m.bands.map(function(b){return(b.z==='red'?'#ff3860':b.z==='green'?'#35e08a':'#cfd5e8')+' '+(b.f0*100)+'% '+(b.f1*100)+'%'}).join(',')+')';
 $('mk').style.right=(m.f*100)+'%';$('zb').className='zb'+(m.zone==='red'?' dg':'');
 var z=$('zm');z.className='zm '+(m.zone==='red'?'dg':m.zone==='green'?'up':'sf');
 z.textContent=m.zone==='red'?'⚠️ أنت بمنطقة الهبوط: ستنزل إلى «'+m.prevName+'» عند تجديد الرتب القادم':m.zone==='green'?'🔥 بمنطقة الترقية: ستصعد إلى «'+m.nextName+'» عند تجديد الرتب القادم':'✅ أنت بأمان، لا هبوط عند التجديد القادم';
 var mt=m.team.map(byI).filter(Boolean),ok=mt.length===3;
 $('my').innerHTML=ok?'فريقك: '+mt.map(cd).join(''):'⚠️ حدّد فريق الدفاع أولاً من تبويب «فريقي»';
 $('ol').innerHTML=S.opps.length?S.opps.map(function(o,k){var s=0;if(ok)for(var i=0;i<3;i++)if(E[mt[i].c+'>'+o.team[i].c])s++;
  return '<div class="op"><div><b>'+esc(o.n)+'</b> <small>🏆 '+o.pts+' | '+esc(o.rk)+'</small><div class="tm">'+o.team.map(cd).join('')+'</div><div class="adv">'+(s?'ميزة الألوان لك '+s+'/3':'لا ميزة ألوان')+'</div></div><button data-o="'+k+'"'+(!ok||m.att<1?' disabled':'')+'>هجوم</button></div>'}).join(''):'<div class="nt">لا يوجد خصوم لديهم فريق دفاع بعد</div>';
 $('rl').innerHTML=S.ranks.map(function(r,k){var rw=r.rw?'<span class="ch">💰 '+Number(r.rw.money).toLocaleString('en-US')+'</span><span class="ch">⭐ '+r.rw.xp+' XP</span><span class="ch">📦 صندوق ملحمي</span>'+(r.rw.sss?'<span class="ch">📦 SSS عالي</span>':''):'<span class="ch">رتبة البداية</span>';
  return '<div class="rl'+(k===m.rankIdx?' me':'')+'"><div class="bd" style="background:'+RC[Math.min(5,Math.floor(k*6/S.ranks.length))]+'">'+(/\d+/.exec(r.n)||['👑'])[0]+'</div><div><b>'+esc(r.n)+(k===m.rankIdx?' (رتبتك)':'')+'</b><small>من '+r.min+' 🏆</small>'+rw+'</div></div>'}).reverse().join('');
 wheel();renderTeam();renderShop();renderLB()}
function wheel(){var K=S.colors.keys,n=K.length||1,s='<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#dfe4f5"/></marker></defs><circle cx="130" cy="130" r="88" fill="none" stroke="#ffffff1c" stroke-width="2"/>',P={};
 K.forEach(function(k,i){var a=(-90+360*i/n)*Math.PI/180;P[k]=[130+88*Math.cos(a),130+88*Math.sin(a)]});
 S.colors.edges.forEach(function(e){var p=P[e[0]],q=P[e[1]];if(!p||!q)return;var dx=q[0]-p[0],dy=q[1]-p[1],L=Math.sqrt(dx*dx+dy*dy)||1,ux=dx/L,uy=dy/L,x1=p[0]+ux*26,y1=p[1]+uy*26,x2=q[0]-ux*30,y2=q[1]-uy*30;
  s+='<path d="M'+x1+' '+y1+' Q'+((x1+x2)/2-uy*16)+' '+((y1+y2)/2+ux*16)+' '+x2+' '+y2+'" fill="none" stroke="#dfe4f5" stroke-width="3" marker-end="url(#ah)"/>'});
 K.forEach(function(k){var p=P[k];s+='<g data-w="'+esc(k)+'" style="cursor:pointer"><circle cx="'+p[0]+'" cy="'+p[1]+'" r="24" fill="'+col(k)+'" stroke="#fff" stroke-width="2.5"/><text x="'+p[0]+'" y="'+(p[1]+5)+'" text-anchor="middle" font-size="13" font-weight="900" fill="#0a0d16">'+esc(cn(k).split(' ')[0])+'</text></g>'});
 $('wsv').innerHTML=s}
$('wsv').addEventListener('click',function(e){var g=e.target.closest('[data-w]');if(!g)return;var k=g.dataset.w,a=[],b=[];
 S.colors.keys.forEach(function(x){if(E[k+'>'+x])a.push(cn(x));if(E[x+'>'+k])b.push(cn(x))});
 var mu=[],a2=[],b2=[];S.colors.keys.forEach(function(x){if(E[k+'>'+x]&&E[x+'>'+k])mu.push(cn(x));else{if(E[k+'>'+x])a2.push(cn(x));if(E[x+'>'+k])b2.push(cn(x))}});
 $('wi').textContent=cn(k)+(mu.length?' يتبادل +50% ضرر مع '+mu.join(' و'):'')+(a2.length?' يتفوق على '+a2.join(' و')+' (+50% ضرر)':'')+(b2.length?'، ويتفوق عليه '+b2.join(' و')+' (−25% ضرر عليك)':'')+(!mu.length&&!a2.length&&!b2.length?' محايد بلا تفوق':'')});
$('tabs').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;document.querySelectorAll('.tabs button,.sec').forEach(function(x){x.classList.remove('cur')});b.classList.add('cur');$(b.dataset.t).classList.add('cur')});
$('ol').addEventListener('click',function(e){var b=e.target.closest('button');if(!b||b.disabled||busy)return;attack(S.opps[+b.dataset.o])});
/* فريقي */
function ac(r,sel){return '<div class="ac'+(sel>=0?' sel':'')+'" data-i="'+r.i+'" style="--c:'+col(r.c)+'"><div class="im"'+bg(r.img)+'>'+(imgU(r.img)?'':esc(r.n.charAt(0)))+'</div><span class="cdot" style="background:'+col(r.c)+'"></span><u class="ord">'+(sel+1)+'</u><div class="an"><b>'+esc(r.n)+'</b><small>'+esc(cn(r.c))+'</small></div><div class="as">'+SK.map(function(k){return '<span>'+k[1]+' '+(r.dev[k[0]]||0)+'</span>'}).join('')+'</div></div>'}
function renderTeam(){
 $('tslots').innerHTML=[0,1,2].map(function(k){var r=SL[k]!==undefined?byI(SL[k]):null;return r?'<div class="slot f" style="--c:'+col(r.c)+'"><b>'+(k+1)+'</b><span>'+esc(r.n)+'</span></div>':'<div class="slot">'+(k+1)+'</div>'}).join('');
 $('fchips').innerHTML=['all'].concat(S.colors.keys).map(function(f){return '<button data-f="'+esc(f)+'" class="'+(FC===f?'cur':'')+'" style="--c:'+(f==='all'?'#8d96b8':col(f))+'">'+(f==='all'?'الكل':esc(cn(f)))+'</button>'}).join('');
 $('cg').innerHTML=S.roster.length?S.roster.map(function(r){return FC==='all'||r.c===FC?ac(r,SL.indexOf(r.i)):''}).join(''):'<div class="nt" style="grid-column:1/-1">ما عندك أي شخصية مؤهّلة للأرينا حالياً</div>';
 $('tsv').disabled=SL.length!==3}
$('cg').addEventListener('click',function(e){var a=e.target.closest('.ac');if(!a)return;var i=+a.dataset.i,k=SL.indexOf(i);
 if(k>=0)SL.splice(k,1);else if(SL.length<3)SL.push(i);else{toast('الفريق مكتمل، أزل شخصية أولاً');return}renderTeam()});
$('fchips').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;FC=b.dataset.f;renderTeam()});
$('tsv').onclick=function(){if(SL.length!==3)return;post('team',{team:SL}).then(function(r){toast(r.ok?'تم حفظ فريق الدفاع ✅':(r.message||'تعذر الحفظ'));if(r.ok)load()})};
/* المتجر */
function renderShop(){var sh=S.shop;$('shm').textContent='🥇 '+S.me.medals;
 $('ofs').innerHTML=sh.items.map(function(o,i){var k=sk(o.stat)||['','❔',o.stat];return '<div class="of"><div class="ic">'+k[1]+'</div><b>'+k[2]+'</b><div class="am on">+'+o.amount+'</div><button data-of="'+i+'" '+(sh.done||S.me.medals<o.cost?'disabled':'')+'>🥇 '+o.cost+'</button></div>'}).join('');
 $('shn').textContent=sh.done?'✅ استخدمت شراءك اليومي، يتجدد المتجر 11:30م بتوقيت السعودية':'شراء واحد باليوم فقط، اختر العرض ثم الشخصية'}
$('ofs').addEventListener('click',function(e){var b=e.target.closest('button');if(!b||b.disabled)return;PO=+b.dataset.of;var o=S.shop.items[PO],k=sk(o.stat)||['','',o.stat];
 $('pk').innerHTML='<h3>اختر الشخصية: '+k[1]+' '+k[2]+' +'+o.amount+'</h3>'+(S.roster.length?S.roster.map(function(r){var v=r.dev[o.stat]||0;return '<button class="pr" data-j="'+r.i+'" '+(v>=S.cap?'disabled':'')+' style="--c:'+col(r.c)+'"><span class="d2"></span><b>'+esc(r.n)+'</b><em>'+v+' ← '+Math.min(S.cap,v+o.amount)+'</em></button>'}).join(''):'<div class="nt">لا توجد شخصيات مؤهّلة</div>')+'<button class="x" id="pkx">إلغاء</button>';
 $('md2').classList.add('on3')});
$('md2').addEventListener('click',function(e){if(e.target===$('md2')||e.target.id==='pkx'){$('md2').classList.remove('on3');return}
 var b=e.target.closest('.pr');if(!b||b.disabled)return;b.disabled=true;
 post('buy',{item:PO,char:+b.dataset.j}).then(function(r){$('md2').classList.remove('on3');toast(r.ok?r.message:(r.message||'تعذر الشراء'));load()})});
function cdTick(){if(!S)return;var d=Math.max(0,Math.floor((S.shop.resetAt-Date.now())/1000)),f=function(x){return('0'+x).slice(-2)};$('shc').textContent='⏳ يتجدد بعد '+f(Math.floor(d/3600))+':'+f(Math.floor(d%3600/60))+':'+f(d%60);if(d===0&&!busy)load()}
setInterval(cdTick,1000);
/* الترتيب */
function renderLB(){function r(x,pos){var m=pos===1?'🥇':pos===2?'🥈':pos===3?'🥉':pos;return '<div class="lr'+(x.me?' me':'')+'"><b class="on">'+m+'</b><span class="av" style="background:'+RC[Math.min(5,Math.floor(x.ri*6/S.ranks.length))]+'">'+esc(String(x.n).charAt(0))+'</span><div><b>'+esc(x.n)+'</b><small>'+esc(x.rk)+'</small></div><div class="lp on">🏆 '+x.p+'<small>فوز '+x.wr+'%</small></div></div>'}
 var h=S.lb.top.map(function(x,i){return r(x,i+1)}).join('');if(S.lb.me&&S.lb.me.pos>15)h+='<div class="nt">⋯</div>'+r(S.lb.me,S.lb.me.pos);$('lbl').innerHTML=h||'<div class="nt">لا يوجد تصنيف بعد</div>'}
/* أنميشن الترقية للرانك التالي */
var puT=0;
function confetti(on){var c=$('pup'),x=c.getContext('2d');cancelAnimationFrame(puT);if(!on){x.clearRect(0,0,c.width,c.height);return}if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 c.width=innerWidth;c.height=innerHeight;var Q=[],cl=['#f0c04a','#ff3860','#3ea8ff','#35e08a','#c04aff','#fff'],t0=performance.now();
 for(var i=0;i<110;i++)Q.push({x:Math.random()*c.width,y:-20-Math.random()*c.height*.6,vy:2+Math.random()*3.5,vx:(Math.random()-.5)*2,w:6+Math.random()*7,h:3+Math.random()*5,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:cl[i%6]});
 (function f(now){x.clearRect(0,0,c.width,c.height);if(now-t0>800)Q.forEach(function(p){p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;if(p.y>c.height+20){p.y=-20;p.x=Math.random()*c.width}x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.w/2,-p.h/2,p.w,p.h);x.restore()});puT=requestAnimationFrame(f)})(t0)}
function promote(oldN,newN,rw){var m=/\d+/.exec(newN);$('pub').textContent=m?m[0]:'👑';$('pun').textContent=newN;$('pua').textContent='ترقيت من «'+oldN+'»';$('pur2').innerHTML=rw||'';
 var o=$('pu');Array.prototype.forEach.call(o.querySelectorAll('.pring,.pflash'),function(x){x.remove()});o.classList.add('on');
 var f=document.createElement('div');f.className='pflash';o.appendChild(f);
 [0,.25,.5].forEach(function(d){var r=document.createElement('div');r.className='pring';r.style.setProperty('--d',(.85+d)+'s');o.appendChild(r)});confetti(true)}
$('pux').onclick=function(){$('pu').classList.remove('on');confetti(false)};
/* المعركة */
function sl(ms){return new Promise(function(r){setTimeout(r,fast?ms/5:ms)})}
$('sk').onclick=function(){fast=true};
function pop(el,txt,cls){var d=document.createElement('div');d.className='dm '+(cls||'');d.textContent=txt;el.appendChild(d);setTimeout(function(){d.remove()},1000)}
async function splash(t){var s=$('sp');s.textContent=t;s.classList.remove('go');void s.offsetWidth;s.classList.add('go');await sl(1300)}
function anim(el,c){el.classList.remove(c);void el.offsetWidth;el.classList.add(c)}
function unit(f,i,p){return '<div class="un" id="'+p+i+'" style="--c:'+col(f.c)+'"><div class="fc"><span>'+esc(String(f.n).charAt(0))+'</span><div class="pic"'+bg(f.img)+'></div><em>'+esc(f.n)+'</em><i class="cc" style="background:'+col(f.c)+';color:'+col(f.c)+'"></i><div class="sl"></div></div><div class="hp"><i></i></div></div>'}
function row(el,T,p){el.innerHTML=T.map(function(f,i){return unit(f,i,p)}).join('')}
function embers(on){var c=$('pc'),x=c.getContext('2d');cancelAnimationFrame(pcT);if(!on){x.clearRect(0,0,c.width,c.height);return}
 c.width=innerWidth;c.height=innerHeight;var Q=[];for(var i=0;i<46;i++)Q.push({x:Math.random()*c.width,y:Math.random()*c.height,s:.4+Math.random()*1.2,r:1+Math.random()*2.2,t:Math.random()*6});
 (function f(){x.clearRect(0,0,c.width,c.height);Q.forEach(function(p,i){p.y-=p.s;p.t+=.04;p.x+=Math.sin(p.t)*.5;if(p.y<-5){p.y=c.height+5;p.x=Math.random()*c.width}x.globalAlpha=.35+.35*Math.sin(p.t);x.fillStyle=i%3?'#ffb04a':'#ff3860';x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()});pcT=requestAnimationFrame(f)})()}
function strike(e,A,B,dots){var P=function(s){return s==='a'?'m':'e'},ua=$(P(e.s)+e.i),ut=$(P(e.ts)+e.ti),att=(e.s==='a'?A:B)[e.i],tg=(e.ts==='a'?A:B)[e.ti];
 if(!ua||!ut)return;var ra=ua.getBoundingClientRect(),rb=ut.getBoundingClientRect(),dx=rb.left+rb.width/2-ra.left-ra.width/2,dy=rb.top+rb.height/2-ra.top-ra.height/2;
 ut.classList.add('tg');
 ua.querySelector('.fc').animate([{transform:'none'},{transform:'translate('+dx*.7+'px,'+dy*.7+'px) scale(1.14)',offset:.4},{transform:'none'}],{duration:fast?100:520,easing:'ease-out'});
 setTimeout(function(){var fc=ut.querySelector('.fc'),sle=fc.querySelector('.sl');anim(fc,'hit');sle.className='';void sle.offsetWidth;sle.style.setProperty('--c',col(att.c));sle.className='sl';
  pop(ut,(e.cr?'CRITICAL ':'')+'-'+e.d,e.cr?'cr2':e.m>1?'ad':'');ut.querySelector('.hp i').style.width=Math.max(0,e.hp/tg.max*100)+'%';
  $('lg').textContent=(e.ti!==e.i?'🤝 '+att.n+' يساعد بضرب '+tg.n:att.n+' يضرب '+tg.n)+(e.cr?' ضربة حرجة!':'')+(e.m>1?' ▲ ميزة اللون':'');
  if(e.ko){ut.classList.add('ko');if(e.ts==='a')dots[e.ti].className='l'}
  setTimeout(function(){ut.classList.remove('tg')},260)},fast?40:230)}
async function attack(o){
 if(busy)return;busy=true;fast=false;
 var r=await post('attack',{target:o.id});
 if(!r||!r.ok){busy=false;toast((r&&r.message)||'تعذر الهجوم');load();return}
 var A=r.a,B=r.b,dots=$('dt').children;
 $('bt').classList.add('on2');$('rs').classList.remove('on2');$('bn').textContent='VS '+o.n;$('lg').textContent='';
 for(var q=0;q<3;q++)dots[q].className='w';
 row($('te'),B,'e');row($('tm'),A,'m');embers(true);
 await splash('معركة الفريق 3 ضد 3');
 var T0=0;for(var k=0;k<r.events.length;k++){var e=r.events[k];await sl(e.t-T0);T0=e.t;strike(e,A,B,dots)}
 await sl(1500);var X=r.result;await splash(X.won?'VICTORY':'DEFEAT');embers(false);
 var sg=function(v){return(v>=0?'+':'')+v};
 $('rs').className='res on2 '+(X.won?'win':'lose');$('rh').textContent=X.won?'VICTORY':'DEFEAT';
 $('r1').textContent='الناجون من فريقك: '+X.survA+' / 3';
 $('r2').textContent=sg(X.dMe)+' 🏆 لك | '+sg(X.dOpp)+' 🏆 للخصم | '+sg(X.dMed)+' 🥇';
 $('r3').textContent=X.zoneBefore==='red'&&X.zoneAfter!=='red'?'✅ خرجت من منطقة الهبوط':X.zoneAfter==='red'?'⚠️ أنت بمنطقة الهبوط':X.zoneAfter==='green'&&X.zoneBefore!=='green'?'🔥 دخلت منطقة الترقية':''}
$('rb').onclick=function(){$('bt').classList.remove('on2');busy=false;load()};
load();
`

function jsonForScript(o) {
    return JSON.stringify(o)
        .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

// أقرب 11:30م بتوقيت السعودية (= 20:30 UTC) — موعد تجديد المتجر
function nextShopReset() {
    const n = new Date()
    let t = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 20, 30, 0)
    if (t <= n.getTime()) t += 24 * 60 * 60 * 1000
    return t
}

// المنطقة (هبوط/ترقية/آمن) + حدودها داخل الرتبة الحالية — تُقرأ من getRankZone نفسها بدون افتراض أرقام
function zoneInfo(points) {
    const pts = Math.max(0, Number(points) || 0)
    const last = ARENA_RANKS.length - 1
    const cur = getRankZone(pts)
    const idx = Math.min(last, Math.max(0, cur.idx || 0))
    const norm = (z, i) => (z === 'red' && i > 0) ? 'red' : (z === 'green' && i < last) ? 'green' : 'white'
    const lo = ARENA_RANKS[idx].minPoints
    const hi = idx < last ? ARENA_RANKS[idx + 1].minPoints : Math.max(lo + 100, pts + 50)
    const span = Math.max(1, hi - lo)
    const step = Math.max(1, Math.ceil(span / 400))
    const bands = []
    let b = null
    for (let p = lo; p < hi; p += step) {
        const z = norm(getRankZone(p).zone, idx)
        if (!b || b.z !== z) { b = { z, f0: (p - lo) / span, f1: 0 }; bands.push(b) }
        b.f1 = Math.min(1, (p + step - lo) / span)
    }
    if (b) b.f1 = 1
    return {
        zone: norm(cur.zone, idx), idx, bands,
        f: Math.min(1, Math.max(0, (pts - lo) / span)),
        prevName: idx > 0 ? ARENA_RANKS[idx - 1].name : '',
        nextName: idx < last ? ARENA_RANKS[idx + 1].name : ''
    }
}

// معركة فريق 3 ضد 3 — الكل يهاجم بنفس الوقت، ومن يُنهي خصمه المقابل يساعد بضرب الأعداء المتبقين
function simulateTeamBattle(teamA, teamB) {
    const T = { a: teamA.map(f => ({ ...f })), b: teamB.map(f => ({ ...f })) }
    const alive = s => T[s].some(f => f.hp > 0)
    const queue = []
    for (let i = 0; i < 3; i++) {
        queue.push({ t: 700 + i * 230, s: 'a', i })
        queue.push({ t: 820 + i * 230, s: 'b', i })
    }
    const events = []
    let guard = 0
    while (queue.length && guard++ < 800) {
        queue.sort((x, y) => x.t - y.t)
        const { t, s, i } = queue.shift()
        const me = T[s][i]
        if (me.hp <= 0) continue
        const es = s === 'a' ? 'b' : 'a'
        const E = T[es]
        if (!alive(s) || !alive(es)) break
        const ti = E[i].hp > 0 ? i : E.findIndex(f => f.hp > 0)
        if (ti < 0) break
        const { dmg, isCrit, mult } = computeHit(me, E[ti])
        E[ti].hp = Math.max(0, E[ti].hp - dmg)
        events.push({ t, s, i, ts: es, ti, d: dmg, cr: isCrit ? 1 : 0, m: mult, hp: E[ti].hp, ko: E[ti].hp <= 0 ? 1 : 0 })
        if (t > 120000) break
        queue.push({ t: t + 1000 + Math.floor(Math.random() * 450), s, i })
    }
    const sum = E => E.reduce((x, f) => x + f.hp, 0)
    const aliveCnt = E => E.filter(f => f.hp > 0).length
    const aWon = !alive('b') ? true : !alive('a') ? false : sum(T.a) >= sum(T.b)
    return { events, attackerWon: aWon, survA: aliveCnt(T.a), survB: aliveCnt(T.b) }
}

module.exports = function createSiteArenaChallenge(deps) {
    const { Player } = deps
    const getSock = deps.getSock || (() => null)
    const getNotifyJid = deps.getNotifyJid || (async () => null)
    const orbs = deps.orbs || null

    const rate = new Map()
    function rateOk(uid) {
        const now = Date.now()
        const r = (rate.get(uid) || []).filter(x => now - x < 60000)
        if (r.length >= 60) { rate.set(uid, r); return false }
        r.push(now); rate.set(uid, r)
        return true
    }
    const busy = new Set()

    function mount(app, h) {
        const { auth, jsonBody, securityHeaders, CODE_RE, html404, ownerSession, esc, navDrawerHTML, NAV_BTN, charView } = h

        const view = (c, req) => { try { return charView ? charView(c, req) : {} } catch (e) { return {} } }
        const dispName = p => String(p.name || p.username || 'لاعب')

        // حارس الطلبات POST (نفس tradeGuard بالموقع)
        async function guard(req, res) {
            res.set('Cache-Control', 'no-store')
            const fail = (status, code, message, extra = {}) => { res.status(status).json({ ok: false, code, message, ...extra }); return null }
            try {
                if (!auth.authEnabled()) return fail(503, 'DISABLED', 'هذه الميزة غير مفعّلة حالياً.')
                if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')
                const sess = auth.readSession(req)
                if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
                const b = req.body || {}
                if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
                if (!rateOk(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')
                const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
                if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
                return { sess, body: b, fail }
            } catch (err) {
                console.error('arena challenge guard error:', err)
                return fail(500, 'SERVER', 'خطأ بالخادم.')
            }
        }

        function rosterOf(player, req) {
            const out = []
            ;(player.characters || []).forEach((c, i) => {
                if (!c || !isArenaEligible(c.name)) return
                const base = getArenaChar(c.name)
                out.push({ i, n: String(c.name), c: base.arenaColor, dev: getCharDev(player, c.name), img: view(c, req).i || null })
            })
            return out
        }

        function teamOf(player, req) {
            const t = (player.arena && player.arena.team) || []
            return t.map(i => {
                const c = (player.characters || [])[i]
                if (!c) return null
                const base = getArenaChar(c.name)
                return { n: String(c.name), c: base ? base.arenaColor : 'red', img: view(c, req).i || null }
            })
        }

        async function buildState(player, req) {
            ensureArenaObject(player)
            player.markModified('arena')
            await player.save()
            const a = player.arena
            const z = zoneInfo(a.points)
            const wr = (w, l) => (w + l) ? Math.round((w / (w + l)) * 100) : 0

            // الخصوم الأقرب بالترافي (لهم فريق دفاع كامل)
            const base = { 'arena.team.2': { $exists: true }, userId: { $ne: player.userId }, siteCode: { $type: 'string' } }
            const sel = 'userId name username siteCode characters arena'
            const [up, down] = await Promise.all([
                Player.find({ ...base, 'arena.points': { $gte: a.points } }).sort({ 'arena.points': 1 }).limit(4).select(sel).lean(),
                Player.find({ ...base, 'arena.points': { $lt: a.points } }).sort({ 'arena.points': -1 }).limit(4).select(sel).lean()
            ])
            const opps = up.concat(down)
                .sort((x, y) => Math.abs(x.arena.points - a.points) - Math.abs(y.arena.points - a.points))
                .slice(0, 6)
                .map(p => ({ id: p.siteCode, n: dispName(p), pts: p.arena.points || 0, rk: p.arena.rank || '', team: teamOf(p, req) }))
                .filter(o => o.team.length === 3 && o.team.every(Boolean))

            const top = await Player.find({ 'arena.points': { $gt: 0 } }).sort({ 'arena.points': -1 }).limit(15).select('userId name username arena').lean()
            const rIdx = pts => zoneInfo(pts).idx
            const lbTop = top.map(p => ({
                n: dispName(p), p: p.arena.points || 0, rk: p.arena.rank || '', ri: rIdx(p.arena.points || 0),
                wr: wr(p.arena.wins || 0, p.arena.losses || 0), me: p.userId === player.userId
            }))
            const pos = (await Player.countDocuments({ 'arena.points': { $gt: a.points } })) + 1
            const lbMe = { pos, n: dispName(player), p: a.points, rk: a.rank, ri: z.idx, wr: wr(a.wins || 0, a.losses || 0), me: true }

            const keys = Object.keys(COLOR_EMOJI)
            const edges = []
            keys.forEach(x => keys.forEach(y => { if (x !== y && colorMultiplier(x, y) > 1) edges.push([x, y]) }))

            return {
                maxAtt: MAX_ATTEMPTS, cap: STAT_CAP,
                me: {
                    pts: a.points, rankName: a.rank, rankIdx: z.idx, wins: a.wins || 0, losses: a.losses || 0, medals: a.medals || 0,
                    att: a.attemptsToday || 0, team: (a.team || []).slice(), zone: z.zone, bands: z.bands, f: z.f,
                    prevName: z.prevName, nextName: z.nextName
                },
                roster: rosterOf(player, req),
                opps,
                lb: { top: lbTop, me: lbMe },
                shop: { items: (a.shop.items || []).map(x => ({ stat: x.stat, amount: x.amount, cost: x.cost })), done: !!a.shop.purchasedToday, resetAt: nextShopReset() },
                ranks: ARENA_RANKS.map((r, i) => ({ n: r.name, min: r.minPoints, rw: i ? { money: PROMO_REWARD.money, xp: PROMO_REWARD.xp, box: 'epic', sss: r.name === 'قائد' } : null })),
                colors: { keys, ar: COLOR_NAME_AR, em: COLOR_EMOJI, edges }
            }
        }

        // ───────── الصفحة ─────────
        app.get('/u/:code/arena-challenge', async (req, res) => {
            try {
                securityHeaders(res)
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return html404(res)
                const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion').lean()
                if (!player) return html404(res)
                const sess = ownerSession(req, player)
                if (!sess) return res.redirect(303, `/login?code=${code}`)
                const csrf = auth.csrfForSession(sess)
                res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>تحدي ارينا</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${PAGE_CSS}</style>
</head>
<body>
<div class="tbar"><span class="tbl">${NAV_BTN}<b>🏟️ تحدي ارينا</b></span><a href="/u/${esc(code)}">← رجوع للعرض</a></div>
${navDrawerHTML(code, csrf, 'arenachallenge', dispName(player))}
${PAGE_BODY}
<script>${PAGE_JS.replace('__CFG__', () => jsonForScript({ code, csrf }))}</script>
</body>
</html>`)
            } catch (err) {
                console.error('arena challenge page error:', err)
                res.status(500).send('خطأ بالخادم')
            }
        })

        // ───────── البيانات ─────────
        app.get('/u/:code/arena-challenge/data', async (req, res) => {
            try {
                res.set('Cache-Control', 'no-store')
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return res.status(404).json({ ok: false, message: 'غير موجود' })
                const player = await Player.findOne({ siteCode: code })
                if (!player) return res.status(404).json({ ok: false, message: 'غير موجود' })
                const sess = ownerSession(req, player)
                if (!sess) return res.status(401).json({ ok: false, message: 'سجّل الدخول من جديد.' })
                res.json({ ok: true, state: await buildState(player, req) })
            } catch (err) {
                console.error('arena challenge data error:', err)
                res.status(500).json({ ok: false, message: 'خطأ بالخادم' })
            }
        })

        // ───────── تحديد فريق الدفاع (= .فريق_ارينا 1 2 3) ─────────
        app.post('/arena-challenge/team', jsonBody, async (req, res) => {
            const g = await guard(req, res)
            if (!g) return
            try {
                const team = Array.isArray(g.body.team) ? g.body.team.map(Number) : []
                if (team.length !== 3 || team.some(i => !Number.isInteger(i) || i < 0)) return g.fail(400, 'BAD', 'اختر 3 شخصيات.')
                if (new Set(team).size !== 3) return g.fail(400, 'BAD', 'لا يمكن تكرار نفس الشخصية.')
                const player = await Player.findOne({ userId: g.sess.u })
                if (!player) return g.fail(404, 'NOPLAYER', 'لا يوجد حساب.')
                ensureArenaObject(player)
                for (const i of team) {
                    const c = (player.characters || [])[i]
                    if (!c) return g.fail(400, 'BAD', 'شخصية غير موجودة بروسترك.')
                    if (!isArenaEligible(c.name)) return g.fail(400, 'BAD', `${c.name} غير مؤهّلة للأرينا.`)
                }
                player.arena.team = team
                player.markModified('arena')
                await player.save()
                res.json({ ok: true })
            } catch (err) {
                console.error('arena challenge team error:', err)
                g.fail(500, 'SERVER', 'خطأ بالخادم.')
            }
        })

        // ───────── شراء من متجر الأرينا (= .شراء_ارينا) ─────────
        app.post('/arena-challenge/buy', jsonBody, async (req, res) => {
            const g = await guard(req, res)
            if (!g) return
            try {
                const itemIdx = Number(g.body.item), charIdx = Number(g.body.char)
                if (!Number.isInteger(itemIdx) || !Number.isInteger(charIdx)) return g.fail(400, 'BAD', 'اختيار غير صحيح.')
                const player = await Player.findOne({ userId: g.sess.u })
                if (!player) return g.fail(404, 'NOPLAYER', 'لا يوجد حساب.')
                ensureArenaObject(player)
                if (player.arena.shop.purchasedToday) return g.fail(400, 'DONE', 'استخدمت شراءك اليومي بالفعل.')
                const item = player.arena.shop.items[itemIdx]
                if (!item) return g.fail(400, 'BAD', 'عرض غير صحيح.')
                const char = (player.characters || [])[charIdx]
                if (!char || !isArenaEligible(char.name)) return g.fail(400, 'BAD', 'شخصية غير صحيحة أو غير مؤهّلة للأرينا.')
                if ((player.arena.medals || 0) < item.cost) return g.fail(400, 'MEDALS', `ميدالياتك غير كافية (تحتاج 🥇${item.cost}).`)
                const dev = getCharDev(player, char.name)
                const newVal = Math.min(STAT_CAP, dev[item.stat] + item.amount)
                const gain = newVal - dev[item.stat]
                if (gain <= 0) return g.fail(400, 'CAP', `${char.name} وصلت للحد الأقصى بهذه الخانة.`)
                dev[item.stat] = newVal
                player.arena.charDev[char.name] = dev
                player.markModified('arena.charDev')
                player.arena.medals -= item.cost
                player.arena.shop.purchasedToday = true
                player.markModified('arena')
                await player.save()
                res.json({ ok: true, message: `✅ تم تطوير ${char.name} (+${gain})، المتبقي 🥇${player.arena.medals}` })
            } catch (err) {
                console.error('arena challenge buy error:', err)
                g.fail(500, 'SERVER', 'خطأ بالخادم.')
            }
        })

        // ───────── الهجوم (= .هجوم_ارينا لكن بمعركة فريق BBS) ─────────
        app.post('/arena-challenge/attack', jsonBody, async (req, res) => {
            const g = await guard(req, res)
            if (!g) return
            const uid = g.sess.u
            if (busy.has(uid)) return g.fail(409, 'BUSY', 'انتظر حتى تنتهي المعركة السابقة.')
            busy.add(uid)
            try {
                const tcode = String(g.body.target || '')
                if (!CODE_RE.test(tcode)) return g.fail(400, 'BAD', 'خصم غير صحيح.')
                const attacker = await Player.findOne({ userId: uid })
                const defender = await Player.findOne({ siteCode: tcode })
                if (!attacker) return g.fail(404, 'NOPLAYER', 'لا يوجد حساب.')
                if (!defender) return g.fail(404, 'STALE', 'الخصم غير موجود.')
                if (defender.userId === attacker.userId) return g.fail(400, 'SELF', 'لا يمكنك مهاجمة نفسك.')
                ensureArenaObject(attacker)
                ensureArenaObject(defender)
                if (attacker.arena.team.length !== 3) return g.fail(400, 'NOTEAM', 'حدّد فريق دفاعك أولاً.')
                if (defender.arena.team.length !== 3) return g.fail(400, 'STALE', 'هذا اللاعب لم يحدد فريق دفاع بعد.')
                if ((attacker.arena.attemptsToday || 0) <= 0) return g.fail(400, 'ATTEMPTS', `انتهت محاولات اليوم (تتجدد ${MAX_ATTEMPTS} عند منتصف الليل بتوقيت السعودية).`)

                const aChars = attacker.arena.team.map(i => (attacker.characters || [])[i])
                const dChars = defender.arena.team.map(i => (defender.characters || [])[i])
                if (aChars.some(c => !c) || dChars.some(c => !c)) return g.fail(400, 'STALE', 'بيانات فريق تالفة، أعد تحديد الفريق.')

                let bonus = { a: 0, b: 0 }
                try {
                    const cb = require('./siteCodexBook')
                    bonus = { a: cb.bonusPct(attacker.userId, 'arena'), b: cb.bonusPct(defender.userId, 'arena') }
                } catch (e) { /* بدون بونص كتاب المجموعة */ }

                const fa = aChars.map(c => buildFighter(c.name, getCharDev(attacker, c.name), bonus.a))
                const fb = dChars.map(c => buildFighter(c.name, getCharDev(defender, c.name), bonus.b))

                attacker.arena.attemptsToday -= 1
                const before = { me: attacker.arena.points, opp: defender.arena.points, med: attacker.arena.medals || 0 }
                const zoneBefore = zoneInfo(before.me).zone

                const sim = simulateTeamBattle(fa, fb)
                applyBattleResult(attacker, defender, sim.attackerWon)
                attacker.markModified('arena')
                defender.markModified('arena')
                await attacker.save()
                await defender.save()

                if (sim.attackerWon && orbs && typeof orbs.trackMission === 'function') {
                    try { await orbs.trackMission(uid, 'arenaWins', { sock: getSock(), jid: await getNotifyJid(uid) }) } catch (e) { /* مهمة الأورب اختيارية */ }
                }

                const pack = (fs, chars) => fs.map((f, i) => ({ n: f.name, c: f.color, img: view(chars[i], req).i || null, max: f.maxHp }))
                res.json({
                    ok: true,
                    a: pack(fa, aChars), b: pack(fb, dChars), events: sim.events,
                    result: {
                        won: sim.attackerWon, survA: sim.survA, survB: sim.survB,
                        dMe: attacker.arena.points - before.me, dOpp: defender.arena.points - before.opp, dMed: (attacker.arena.medals || 0) - before.med,
                        zoneBefore, zoneAfter: zoneInfo(attacker.arena.points).zone
                    }
                })
            } catch (err) {
                console.error('arena challenge attack error:', err)
                g.fail(500, 'SERVER', 'خطأ بالخادم.')
            } finally {
                busy.delete(uid)
            }
        })
    }

    return { mount }
}

module.exports.simulateTeamBattle = simulateTeamBattle
module.exports.zoneInfo = zoneInfo
