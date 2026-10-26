// =====================================================================
// systems/echoPage.js
// 🎐 صفحة الإيكوز والدومين — /u/<كود>/echoes
// منقولة من نموذج "الإيكوز" بنفس التصميم والأنميشن، لكن البيانات والعمليات حقيقية
// (systems/echoSiteSystem.js = نفس .ايكو / .لبس / .ازالة / .تطوير_ايكو / .بيع_ايكو / .فريق_دومين / .دخول_دومين).
// الواجهة لا تحسب أي شيء: رمية النرد والفوز والقطعة الساقطة كلها تجي من الخادم ثم تُعرض بحركة.
// =====================================================================

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function jsonForScript(o) {
    return JSON.stringify(o)
        .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

const CSS = `
:root{color-scheme:dark;--bg:#0a0d16;--bg2:#0f1422;--gold:#f0c04a;--gd:#8a6d24;--tx:#eef1f8;--td:#8891a3;--ok:#4ade80;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}
body{background:var(--bg);color:var(--tx);font-family:'Cairo',sans-serif;min-height:100vh;padding:0 14px 40px;overflow-x:hidden}
.wrap{max-width:900px;margin:0 auto}
header{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;padding:12px 0 8px;background:linear-gradient(var(--bg) 75%,transparent)}
.tbr{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:4px}
.tbr .back{font:800 13px 'Cairo',sans-serif;color:var(--gold);text-decoration:none;border:1px solid var(--gd);border-radius:20px;padding:6px 14px;background:var(--bg2)}
h1{text-align:center;font-weight:900;font-size:28px;background:linear-gradient(180deg,#fff6d8,var(--gold) 55%,#a9791f);-webkit-background-clip:text;background-clip:text;color:transparent}
.top{display:flex;gap:8px;justify-content:center;margin:8px 0 10px;flex-wrap:wrap}
.pill{font-weight:800;font-size:13px;color:var(--gold);border:1px solid var(--gd);border-radius:20px;padding:5px 14px;background:var(--bg2)}
.tabs{display:flex;gap:5px;margin-bottom:6px}
.tab{flex:1;padding:9px 2px;border-radius:12px;border:1px solid var(--gd);background:var(--bg2);color:var(--tx);font:800 12.5px Cairo;cursor:pointer;transition:.25s}
.tab.on{background:var(--gold);color:#0a0d16;box-shadow:0 0 18px #f0c04a55}
.pane{display:none;animation:fade .4s;padding-top:8px}.pane.on{display:block}
@keyframes fade{from{opacity:0;transform:translateY(8px)}}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(min-width:640px){.grid{grid-template-columns:repeat(4,1fr)}}
.card{--c:#5ab4ff;position:relative;overflow:hidden;border:1.5px solid var(--c);border-radius:16px;padding:12px;background:linear-gradient(160deg,color-mix(in srgb,var(--c) 24%,var(--bg2)),var(--bg2));cursor:pointer;transition:transform .2s;animation:in .5s both;animation-delay:calc(var(--i,0)*55ms)}
.card:active{transform:scale(.96)}
@keyframes in{from{opacity:0;transform:translateY(18px) scale(.94)}}
.card::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 40%,#ffffff2e 50%,transparent 60%);transform:translateX(-120%);animation:shine 4.5s infinite;animation-delay:calc(var(--i,0)*300ms)}
@keyframes shine{to{transform:translateX(120%)}}
.card b{display:block;font-size:14px}.card small{color:var(--td);font-size:11px;display:block}
.ico{font-size:32px;text-align:center;filter:drop-shadow(0 0 10px var(--c));animation:flt 3s ease-in-out infinite}
@keyframes flt{50%{transform:translateY(-4px)}}
.bar{height:5px;border-radius:5px;background:#ffffff18;margin:7px 0 3px;overflow:hidden}
.bar i{display:block;height:100%;background:var(--c);box-shadow:0 0 8px var(--c);transition:width .7s cubic-bezier(.2,.9,.3,1)}
.bd{display:inline-block;font-size:10.5px;font-weight:800;border-radius:8px;padding:2px 7px;margin:2px 0 0 3px;background:#ffffff14;color:var(--tx)}
.slots{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;justify-items:center;margin:6px 0 14px}
.slot{--c:var(--gd);width:92px;height:92px;border-radius:50%;border:2px dashed var(--c);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;color:var(--td);text-align:center;transition:.4s;background:var(--bg2);cursor:pointer}
.slot.on{border-style:solid;color:var(--tx);animation:pulse 2.4s infinite}
.slot.pop{animation:pop .7s}
@keyframes pulse{50%{box-shadow:0 0 22px var(--c)}}
@keyframes pop{0%{transform:scale(.4);box-shadow:0 0 0 0 var(--c)}60%{transform:scale(1.15);box-shadow:0 0 0 24px #0000}100%{transform:scale(1)}}
.set{border:1px solid var(--gd);border-radius:14px;padding:12px;background:var(--bg2);font-size:13px;line-height:1.9}
.set b{color:var(--gold)}.off{color:var(--td)}
.chips{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 12px;scrollbar-width:none}
.chip{--c:var(--gd);flex:none;width:58px;height:58px;border-radius:16px;border:1.5px solid var(--c);background:var(--bg2);font-size:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.3s}
.chip.on{background:color-mix(in srgb,var(--c) 35%,var(--bg2));box-shadow:0 0 18px var(--c);transform:translateY(-3px)}
.dh{text-align:center;margin-bottom:12px}.dh .ico{font-size:50px}.dh h2{font-size:20px}.dh small{color:var(--td)}
.dom{border:1px solid var(--gd);border-radius:16px;padding:12px;background:var(--bg2);margin-bottom:9px;display:flex;align-items:center;gap:12px;cursor:pointer}
.dom div{flex:1;font-size:13px}.dom small{color:var(--td);display:block}.dom .e{font-size:28px}
.team{display:flex;gap:8px;margin:12px 0}
.tm{flex:1;text-align:center;border:1px solid var(--gd);border-radius:14px;padding:8px;background:var(--bg2);font-size:11px;cursor:pointer;transition:.2s}.tm:active{transform:scale(.95)}
.tm span{font-size:26px;display:block}
.btn{font:800 14px Cairo;padding:10px 16px;border-radius:12px;border:1.5px solid var(--gold);background:var(--gold);color:#0a0d16;cursor:pointer}
.btn.line{background:none;color:var(--tx);border-color:var(--gd)}.btn.red{background:none;color:#f87171;border-color:#f87171}
.btn:disabled{opacity:.4;cursor:default}
.sheet{position:fixed;inset:auto 0 0;background:var(--bg2);border-top:2px solid var(--gold);border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));transform:translateY(105%);transition:transform .4s cubic-bezier(.2,.9,.3,1);z-index:60;max-height:88vh;overflow:auto;max-width:900px;margin:0 auto}
.sheet.on{transform:none}
.row{display:flex;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid #ffffff12;font-size:14px}
.row.lock{color:var(--td)}.row.new{animation:unl 1.4s;color:var(--ok)}
@keyframes unl{0%{background:#4ade8066;transform:scale(1.06)}100%{background:none;transform:none}}
.acts{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}.acts .btn{flex:1;min-width:90px}
.lvfx{animation:lv .8s}@keyframes lv{30%{box-shadow:0 0 40px var(--c);transform:scale(1.03)}}
.bn{border:1.5px solid var(--c);border-radius:14px;padding:11px;margin:8px 0;background:color-mix(in srgb,var(--c) 14%,var(--bg2));font-size:14px;line-height:1.8}
.bn.on{box-shadow:0 0 20px var(--c)}.bn em{font-style:normal;color:var(--c);font-weight:900}
.dots{display:flex;gap:5px;justify-content:center;margin:8px 0}.dots i{width:14px;height:14px;border-radius:50%;border:1.5px solid var(--c);transition:.4s}.dots i.f{background:var(--c);box-shadow:0 0 10px var(--c)}
#rv,#bt{position:fixed;inset:0;display:none;background:#000e;overflow:hidden}
#rv{z-index:90;align-items:center;justify-content:center;flex-direction:column}
#rv.on{display:flex;animation:fade .3s}
.beam{position:absolute;width:140vmax;height:140vmax;background:conic-gradient(from 0deg,transparent 0 8%,var(--rc) 10%,transparent 12% 33%,var(--rc) 35%,transparent 37% 58%,var(--rc) 60%,transparent 62% 83%,var(--rc) 85%,transparent 87%);opacity:.35;animation:spin 8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.ring{position:absolute;width:60px;height:60px;border-radius:50%;border:3px solid var(--rc);animation:ring 1.8s ease-out infinite}
.ring:nth-child(3){animation-delay:.6s}.ring:nth-child(4){animation-delay:1.2s}
@keyframes ring{to{transform:scale(9);opacity:0}}
.rcard{position:relative;width:240px;padding:22px 16px;text-align:center;border:2px solid var(--rc);border-radius:20px;background:linear-gradient(160deg,color-mix(in srgb,var(--rc) 30%,#0a0d16),#0a0d16);box-shadow:0 0 50px var(--rc);color:#eef1f8;animation:rise 1.1s cubic-bezier(.2,1.2,.3,1) both .4s}
@keyframes rise{from{opacity:0;transform:translateY(120px) scale(.3) rotateY(180deg)}}
.rcard .ico{font-size:64px}.rcard h3{font-size:20px;margin:8px 0 2px}.rcard p{color:#aab;font-size:13px}
.hint{position:absolute;bottom:calc(30px + env(safe-area-inset-bottom,0px));color:#aab;font-size:13px;animation:fade 2s 1.8s both}
#bt{z-index:80;color:#eef1f8;background:#05070d}
#bt.on{display:block;animation:fade .3s}
#bt .bg{position:absolute;inset:0;background:radial-gradient(90% 55% at 50% 30%,color-mix(in srgb,var(--rc) 45%,#05070d),#05070d 70%);animation:bgp 4s infinite alternate}
@keyframes bgp{to{filter:brightness(1.4)}}
.btitle{position:absolute;top:calc(18px + env(safe-area-inset-top,0px));width:100%;text-align:center;font-weight:900;font-size:20px;animation:slide .8s both}
.btitle small{display:block;font-size:13px;color:#cbd}
@keyframes slide{from{opacity:0;letter-spacing:.5em}}
.dice{position:absolute;top:44%;left:50%;transform:translate(-50%,-50%);font-size:46px;font-weight:900;text-align:center;z-index:3;transition:.5s}
.dice small{display:block;font-size:14px}.dice.up{color:var(--ok)}.dice.dn{color:#f87171}.dice.gone{opacity:0;transform:translate(-50%,-90%) scale(.5)}
.mon{position:absolute;top:19%;left:50%;transform:translateX(-50%);width:78%;text-align:center;transition:.3s}
.me{font-size:110px;filter:drop-shadow(0 0 28px var(--rc));animation:flt 2.6s ease-in-out infinite}
.mon.hit .me{animation:shk .35s}.mon.die .me{animation:die 1.1s forwards}
@keyframes shk{25%{transform:translateX(-12px) rotate(-4deg)}75%{transform:translateX(12px) rotate(4deg)}}
@keyframes die{to{transform:scale(1.6) rotate(25deg);opacity:0;filter:blur(14px)}}
.mon b{display:block;font-size:15px;margin-bottom:6px}
.hb{height:9px;border-radius:9px;background:#ffffff22;overflow:hidden;border:1px solid #ffffff30}
.hb i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#f87171,#fb923c);transition:width .5s}
.hb.g i{background:linear-gradient(90deg,#4ade80,#22d3ee)}
.party{position:absolute;bottom:calc(46px + env(safe-area-inset-bottom,0px));left:0;right:0;display:flex;gap:10px;padding:0 14px}
.pm{flex:1;text-align:center;padding:8px 4px;border-radius:14px;border:1.5px solid #ffffff30;background:#0009;transition:.25s;font-size:11px}
.pe{font-size:36px;height:56px;display:flex;align-items:center;justify-content:center}
.pe i{display:block;width:54px;height:54px;border-radius:50%;background-size:cover;background-position:center;border:2px solid #ffffff40}
.pm.atk{transform:translateY(-70px) scale(1.12);border-color:var(--rc);box-shadow:0 0 24px var(--rc)}
.pm.hit{animation:shk .35s;border-color:#f87171}.pm.dn{opacity:.35;filter:grayscale(1)}
.fl{position:absolute;inset:0;pointer-events:none}
.dm{position:absolute;font-weight:900;font-size:24px;color:#fff;text-shadow:0 0 8px var(--rc),0 2px 0 #000;animation:up .9s forwards;transform:translateX(-50%)}
.dm.crit{font-size:38px;color:var(--gold)}.dm.me{color:#f87171}
@keyframes up{to{transform:translate(-50%,-70px) scale(1.25);opacity:0}}
.slash{position:absolute;top:24%;left:50%;width:70%;height:5px;background:linear-gradient(90deg,transparent,#fff,transparent);box-shadow:0 0 20px var(--rc);transform:translateX(-50%) rotate(-30deg);animation:sl .3s forwards}
@keyframes sl{from{opacity:1;transform:translateX(-50%) rotate(-30deg) scaleX(0)}to{opacity:0;transform:translateX(-50%) rotate(-30deg) scaleX(1.3)}}
.sk{position:absolute;top:46%;width:100%;text-align:center;font-weight:900;font-size:26px;color:var(--rc);text-shadow:0 0 16px var(--rc);animation:skn 1s forwards}
@keyframes skn{0%{opacity:0;transform:scale(2)}20%{opacity:1;transform:scale(1)}80%{opacity:1}100%{opacity:0}}
#bt.flash::before{content:"";position:absolute;inset:0;background:var(--rc);opacity:.7;z-index:4;animation:fl .45s forwards}
@keyframes fl{to{opacity:0}}
.skp{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));left:12px;z-index:6;font:700 12px Cairo;color:#cbd;background:#0008;border:1px solid #fff3;border-radius:14px;padding:5px 12px}
.res{position:absolute;inset:0;z-index:7;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#000b;animation:fade .5s;text-align:center;padding:20px}
.res h2{font-size:44px;font-weight:900;animation:skn2 .8s both}.res.w h2{color:var(--gold);text-shadow:0 0 30px var(--gold)}.res.l h2{color:#f87171}
@keyframes skn2{from{opacity:0;transform:scale(2.4)}}
.toast{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));left:50%;transform:translate(-50%,-150%);background:var(--gold);color:#0a0d16;font-weight:800;padding:9px 18px;border-radius:20px;z-index:120;transition:.4s;max-width:92vw;text-align:center}
.toast.on{transform:translate(-50%,0)}
.chh{display:flex;align-items:center;gap:10px;border:1.5px solid var(--gd);border-radius:16px;padding:10px 12px;margin-bottom:12px;background:var(--bg2);cursor:pointer}
.chh>div{flex:1}.chh small{display:block;color:var(--td);font-size:11.5px}
.av{width:42px;height:42px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:22px;background:#ffffff12 center/cover;border:1.5px solid var(--gd)}.av.big{width:54px;height:54px;font-size:28px}
.btn.sm{padding:6px 12px;font-size:12px;display:inline-block}
.srch{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid var(--gd);background:var(--bg);color:var(--tx);font:700 14px Cairo;margin:8px 0}.srch:focus{outline:none;border-color:var(--gold)}
.cr{display:flex;align-items:center;gap:10px;padding:8px;border-radius:14px;border:1px solid #ffffff14;margin-bottom:7px;cursor:pointer;transition:.2s}.cr:active{transform:scale(.97)}.cr.on{border-color:var(--gold);background:#f0c04a14}
.cr b{flex:1;font-size:13.5px}.cr small{color:var(--td);font-size:11px;display:block}
.mini{display:flex;gap:3px}.mini i{width:8px;height:8px;border-radius:50%;background:#ffffff22}.mini i.f{background:var(--gold);box-shadow:0 0 6px var(--gold)}
.pager{display:flex;align-items:center;justify-content:center;gap:10px;margin:10px 0 4px}.pager button{min-width:84px;padding:8px;border-radius:12px;border:1.5px solid var(--gd);background:var(--bg2);color:var(--gold);font:800 13px Cairo;cursor:pointer}.pager button:disabled{opacity:.35}.pager span{font:800 13px Cairo;color:var(--td);min-width:60px;text-align:center}
.er{display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;border:1.5px solid var(--c);margin-bottom:8px;background:color-mix(in srgb,var(--c) 14%,var(--bg2));cursor:pointer;font-size:13px}.er b{flex:1}.er small{color:var(--td);display:block}
.empty{text-align:center;color:var(--td);padding:30px 0}
`

// ───────── الواجهة: تُحقن كنص (function.toString) وكل البيانات من الخادم ─────────
function clientMain(INIT, CODE, CSRF) {
    // ألوان العوائل بالترتيب (نفس النموذج)
    const COL = ['#a855f7', '#fb923c', '#34d399', '#fde68a', '#f43f5e', '#7dd3fc', '#818cf8', '#f0c04a', '#38bdf8', '#86efac', '#f97316', '#f472b6']
    const BL = {
        critRate: ['🎯', 'نسبة الحرج', '%'], critDamage: ['💥', 'ضرر الحرج', '%'], attackPercent: ['⚔️', 'هجوم', '%'],
        bossDamage: ['👹', 'ضرر البوس', '%'], dodge: ['👻', 'مراوغة', '%'], shield: ['🛡️', 'درع', ''], defense: ['🛡️', 'دفاع', ''],
        hpPercent: ['❤️', 'HP', '%'], lifesteal: ['🩸', 'امتصاص', '%'], reflect: ['🪞', 'انعكاس', '%'], accuracy: ['🎯', 'دقة', '%'], hp: ['❤️', 'HP', '']
    }
    const ST = {
        critRate: '🎯 حرج', critDamage: '💥 ضرر حرج', attack: '⚔️ هجوم', hp: '❤️ HP', defense: '🛡️ دفاع', bossDamage: '👹 ضرر بوس',
        dodge: '👻 مراوغة', lifesteal: '🩸 امتصاص', accuracy: '🎯 دقة', reflect: '🪞 انعكاس'
    }
    const FLAT = { attack: 1, hp: 1, defense: 1 } // الساب ستات الثابتة (بدون %)
    const IC = { 4: '💠', 3: '🔷', 1: '🔹' }
    const UNLOCK = [5, 10, 15]
    const SLOTS = [['cost3_1', 3], ['cost4', 4], ['cost3_2', 3], ['cost1_1', 1], ['cost1_2', 1]]
    const SLOT_COST = { cost4: 4, cost3_1: 3, cost3_2: 3, cost1_1: 1, cost1_2: 1 }
    const DKEY = { 1: 'easy', 3: 'medium', 4: 'hard' }
    const DINFO = { easy: ['🟢', 'سهل'], medium: ['🟡', 'متوسط'], hard: ['🔴', 'صعب'] }
    const PER = 8

    const cfg = INIT.cfg
    const FAMS = cfg.fams.map((f, i) => Object.assign({ c: COL[i % COL.length] }, f))
    const FM = {}
    FAMS.forEach(f => { FM[f.id] = f })

    const S = Object.assign({ tab: 'inv', diff: 'easy', sellOk: '', cl: { q: '', pg: 0, mode: '', uid: '', slot: 0 }, draft: {} }, INIT)
    let busy = false, skip = false

    const $ = s => document.querySelector(s)
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    const f = n => Number(n).toLocaleString('en-US')
    const sleep = ms => new Promise(r => setTimeout(r, skip ? 0 : ms))
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
    const bt = b => Object.entries(b).map(([k, v]) => { const l = BL[k] || ['•', k, '%']; return l[0] + ' ' + l[1] + ' <b>+' + v + l[2] + '</b>' }).join(' · ')
    const fmtSub = s => '+' + s.v + (FLAT[s.t] ? '' : '%')
    const subName = s => s.name || ST[s.t] || s.t
    const mainName = t => ST[t] || t
    const toast = m => { const t = $('#ts'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200) }
    const closeSh = () => $('#sh').classList.remove('on')
    const openSh = h => { $('#sh').innerHTML = h; $('#sh').classList.add('on') }
    const domIdx = () => S.dom
    const cnt = fam => SLOTS.filter(([k]) => S.char && S.char.echoes[k] && S.char.echoes[k].fam === fam).length
    const avatar = (c, big) => '<span class="av ' + (big ? 'big' : '') + '"' + (c && c.img ? ' style="background-image:url(\'' + esc(c.img) + '\')"' : '') + '>' + (c && c.img ? '' : '🗡️') + '</span>'

    // ───────── الشبكة ─────────
    async function post(url, body) {
        try {
            const r = await fetch(url, {
                method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.assign({ csrf: CSRF }, body))
            })
            if (r.status === 401) { location.href = '/login?code=' + CODE; return { ok: false, code: 'AUTH', message: '' } }
            return await r.json()
        } catch (e) { return { ok: false, code: 'NET', message: '❌ تعذّر الاتصال بالخادم' } }
    }
    async function get(url) {
        try {
            const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store' })
            if (r.status === 401) { location.href = '/login?code=' + CODE; return { ok: false } }
            return await r.json()
        } catch (e) { return { ok: false, message: '❌ تعذّر الاتصال بالخادم' } }
    }
    async function reload(opts) {
        opts = opts || {}
        const ci = opts.char != null ? opts.char : (S.char ? S.char.index : 0)
        const di = opts.dom != null ? opts.dom : S.dom
        const j = await get('/echoes/state?char=' + ci + '&dom=' + di)
        if (j && j.ok) {
            const keep = { tab: S.tab, diff: S.diff, sellOk: '', cl: S.cl, draft: S.draft }
            Object.assign(S, j, keep)
            render()
        } else if (!opts.quiet) toast((j && j.message) || '❌ تعذّر تحديث الصفحة')
        return j
    }

    // ───────── العرض ─────────
    function card(it, i) {
        const fm = FM[it.fam] || FAMS[0]
        return '<div class="card" style="--c:' + fm.c + ';--i:' + Math.min(i, 12) + '" onclick="window.__ec.openSheet(\'' + it.uid + '\')"><div class="ico">' + IC[it.cost] + '</div><b>' + fm.e + ' ' + esc(fm.ar) + '</b><small>كوست ' + it.cost + ' · ' + mainName(it.main.t) + ' +' + it.main.v + '%</small><div class="bar"><i style="width:' + (it.lvl / it.max * 100) + '%"></i></div><small>Lv ' + it.lvl + '/' + it.max + '</small></div>'
    }
    function setHTML() {
        const ks = FAMS.filter(x => cnt(x.id))
        if (!ks.length) return '<div class="set off">جهّز قطع من عائلة واحدة لتفعيل البونص</div>'
        return '<div class="set">' + ks.map(x => {
            const n = cnt(x.id)
            return '<b>' + x.e + ' ' + esc(x.ar) + '</b> (' + n + '/5)<br><span class="' + (n >= 2 ? '' : 'off') + '">' + (n >= 2 ? '✅' : '🔒') + ' 2 قطع: ' + bt(x.b2) + '</span><br><span class="' + (n >= 5 ? '' : 'off') + '">' + (n >= 5 ? '✅' : '🔒') + ' 5 قطع: ' + bt(x.b5) + '</span>'
        }).join('<hr style="border:0;border-top:1px solid #ffffff14;margin:8px 0">') + '</div>'
    }
    function eqHTML() {
        const c = S.char
        if (!c) return '<div class="empty">ما عندك شخصيات لتجهيزها</div>'
        const e = c.echoes
        const nEq = SLOTS.filter(([k]) => e[k]).length
        return '<div class="chh" onclick="window.__ec.chooseChar()"><button class="btn line sm" onclick="event.stopPropagation();window.__ec.step(1)">›</button>' + avatar(c, true) +
            '<div><b>#' + (c.index + 1) + ' ' + esc(c.name) + '</b><small>💪 ' + f(c.power) + ' · مجهز ' + nEq + '/5 · المس لاختيار شخصية</small></div><button class="btn line sm" onclick="event.stopPropagation();window.__ec.step(-1)">‹</button></div>' +
            '<div class="slots">' + SLOTS.map(([k, cs]) => {
                const it = e[k], fm = it && (FM[it.fam] || FAMS[0])
                return '<div class="slot ' + (it ? 'on' : '') + '" id="s-' + k + '" style="--c:' + (fm ? fm.c : 'var(--gd)') + '" onclick="window.__ec.slotTap(\'' + k + '\')"><span style="font-size:24px">' + (it ? IC[cs] : '＋') + '</span>' + (it ? esc(fm.ar) + '<br>Lv ' + it.lvl : 'كوست ' + cs) + '</div>'
            }).join('') + '</div>' + setHTML()
    }
    function teamList() {
        // المسودة (لو الفريق ما اكتمل) وإلا الفريق المحفوظ من الخادم
        const d = S.draft[S.dom]
        return d || (S.team || [])
    }
    function teamHTML() {
        const t = teamList()
        const pw = S.team && S.team.length === 3 && !S.draft[S.dom] ? S.teamPower : null
        return '<div style="font-size:12px;color:var(--td);margin:12px 2px 6px">👥 فريق دومين ' + esc(FM[FAMS[S.dom - 1].id].ar) + ' (3 شخصيات · يُحفظ لكل دومين)' + (pw != null ? ' · 💪 ' + f(pw) : '') + '</div><div class="team">' +
            [0, 1, 2].map(n => {
                const c = t[n]
                return '<div class="tm" onclick="window.__ec.pickTeam(' + n + ')">' + (c ? '<span>' + avatar(c) + '</span>#' + (c.index + 1) + ' ' + esc(c.name) + '<br>💪 ' + f(c.power) : '<span>＋</span>اختر شخصية') + '</div>'
            }).join('') + '</div>'
    }
    function domHTML() {
        const fam = FAMS[S.dom - 1], fm = fam
        const sta = S.stamina
        return '<div class="chips">' + FAMS.map((x, i) => '<div class="chip ' + (i + 1 === S.dom ? 'on' : '') + '" style="--c:' + x.c + '" onclick="window.__ec.setDom(' + (i + 1) + ')">' + x.e + '</div>').join('') + '</div>' +
            '<div class="dh" style="--c:' + fm.c + '"><div class="ico">' + fm.e + '</div><h2>دومين ' + esc(fm.ar) + '</h2><small>' + esc(fm.en) + ' · يسقط إيكوز ' + esc(fm.ar) + '</small></div>' +
            ['easy', 'medium', 'hard'].map(k => {
                const d = cfg.diff[k], c = d.cost, on = S.diff === k, ch = S.chances && S.chances[k] != null ? Math.round(S.chances[k] * 100) : 0
                return '<div class="dom" style="border-color:' + (on ? fm.c : 'var(--gd)') + ';' + (on ? 'box-shadow:0 0 16px ' + fm.c : '') + '" onclick="window.__ec.setDiff(\'' + k + '\')"><span class="e">' + DINFO[k][0] + '</span><div><b>' + DINFO[k][1] + '</b> · يسقط ' + IC[c] + ' كوست ' + c + '<small>🐉 ' + esc((fm.m[c] || []).join('، ')) + '</small><small>💪 المطلوب ' + f(d.req) + ' · فرصة الفوز ~' + ch + '%</small></div></div>'
            }).join('') + teamHTML() +
            '<button class="btn" style="width:100%" ' + (sta.current < cfg.staCost ? 'disabled' : '') + ' onclick="window.__ec.enter()">⚔️ دخول الدومين (⚡' + cfg.staCost + ')</button>'
    }
    function fmHTML() {
        return '<div class="grid">' + FAMS.map((x, i) => '<div class="card" style="--c:' + x.c + ';--i:' + i + '" onclick="window.__ec.famSheet(\'' + x.id + '\')"><div class="ico">' + x.e + '</div><b style="text-align:center">' + esc(x.ar) + '</b><small style="text-align:center">' + esc(x.en) + '</small><span class="bd">2️⃣ ' + bt(x.b2) + '</span><span class="bd">5️⃣ ' + bt(x.b5) + '</span><div class="dots" style="--c:' + x.c + ';margin:6px 0 0">' + [1, 2, 3, 4, 5].map(n => '<i class="' + (n <= cnt(x.id) ? 'f' : '') + '"></i>').join('') + '</div></div>').join('') + '</div>'
    }
    function render() {
        $('#tn').textContent = '🎼 تيونر ' + S.tuners
        $('#mn').textContent = '💰 ' + f(S.money)
        $('#st').textContent = '⚡ ' + S.stamina.current + '/' + S.stamina.max
        $('#inv').innerHTML = (S.inv.length ? '<div class="grid">' + S.inv.map(card).join('') + '</div>' : '<div class="empty">الحقيبة فاضية — ادخل دومين 🌀</div>') +
            '<div style="text-align:center;color:var(--td);font-size:12px;margin-top:10px">🎒 ' + S.inv.length + '/' + S.maxInv + '</div>'
        $('#eq').innerHTML = eqHTML()
        $('#dm').innerHTML = domHTML()
        $('#fm').innerHTML = fmHTML()
    }
    function go(t) {
        S.tab = t
        document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.t === t))
        document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === t))
    }

    // ───────── عوائل ─────────
    function famSheet(id) {
        const x = FM[id], n = cnt(id)
        openSh('<div class="dh" style="--c:' + x.c + '"><div class="ico">' + x.e + '</div><h2>' + esc(x.ar) + '</h2><small>' + esc(x.en) + '</small></div>' +
            '<div class="dots" style="--c:' + x.c + '">' + [1, 2, 3, 4, 5].map(k => '<i class="' + (k <= n ? 'f' : '') + '"></i>').join('') + '</div><div style="text-align:center;font-size:12px;color:var(--td)">مجهز ' + n + '/5 قطع على الشخصية الحالية</div>' +
            '<div class="bn ' + (n >= 2 ? 'on' : '') + '" style="--c:' + x.c + '"><em>2 قطع</em> ' + (n >= 2 ? '✅' : '🔒') + '<br>' + bt(x.b2) + '</div>' +
            '<div class="bn ' + (n >= 5 ? 'on' : '') + '" style="--c:' + x.c + '"><em>5 قطع</em> ' + (n >= 5 ? '✅' : '🔒') + '<br>' + bt(x.b5) + '</div>' +
            '<div class="bn" style="--c:' + x.c + '"><em>🐉 وحوش الدومين</em><br>' + IC[4] + ' ' + esc((x.m[4] || []).join('، ')) + '<br>' + IC[3] + ' ' + esc((x.m[3] || []).join('، ')) + '<br>' + IC[1] + ' ' + esc((x.m[1] || []).join('، ')) + '</div>' +
            '<div class="acts"><button class="btn" onclick="window.__ec.famGo(\'' + id + '\')">🌀 الدومين</button><button class="btn line" onclick="window.__ec.closeSh()">إغلاق</button></div>')
    }
    async function famGo(id) { closeSh(); go('dm'); await reload({ dom: FAMS.findIndex(x => x.id === id) + 1 }) }
    async function setDom(n) { await reload({ dom: n }) }
    function setDiff(k) { S.diff = k; render() }

    // ───────── القطعة (حقيبة) ─────────
    function pieceRows(it, newIdx) {
        return '<div class="row"><span>رئيسي · ' + mainName(it.main.t) + '</span><b>+' + it.main.v + '%</b></div>' +
            UNLOCK.map((u, n) => it.subs[n]
                ? '<div class="row ' + (n === newIdx ? 'new' : '') + '"><span>' + esc(subName(it.subs[n])) + '</span><b>' + fmtSub(it.subs[n]) + '</b></div>'
                : '<div class="row lock"><span>🔒 ساب ' + (n + 1) + '</span><span>يفتح بلفل ' + u + '</span></div>').join('')
    }
    function openSheet(uid, fx, newIdx) {
        const it = S.inv.find(x => x.uid === uid)
        if (!it) return closeSh()
        const fm = FM[it.fam] || FAMS[0], price = cfg.sell[it.cost] || 2000
        const left = it.max - it.lvl
        openSh('<div class="card ' + (fx ? 'lvfx' : '') + '" style="--c:' + fm.c + ';cursor:default"><div class="ico">' + IC[it.cost] + '</div><b style="text-align:center;font-size:17px">' + fm.e + ' ' + esc(fm.ar) + '</b><div class="bar"><i style="width:' + (it.lvl / it.max * 100) + '%"></i></div><small>Lv ' + it.lvl + '/' + it.max + ' · كوست ' + it.cost + (it.mon ? ' · 🐉 ' + esc(it.mon) : '') + '</small></div>' +
            pieceRows(it, newIdx == null ? -1 : newIdx) +
            '<div class="acts"><button class="btn" ' + (left <= 0 || S.tuners < 1 ? 'disabled' : '') + ' onclick="window.__ec.level(\'' + uid + '\',1)">⬆️ تطوير (' + f(cfg.lvlCost) + ')</button>' +
            '<button class="btn line" ' + (left <= 0 || S.tuners < 1 ? 'disabled' : '') + ' onclick="window.__ec.level(\'' + uid + '\',' + left + ')">⏫ للأقصى</button></div>' +
            '<div class="acts"><button class="btn line" onclick="window.__ec.pickChar(\'' + uid + '\')">👤 لبس</button><button class="btn red" onclick="window.__ec.sell(\'' + uid + '\')">' + (S.sellOk === uid ? 'تأكيد البيع؟ +' + f(price) : 'بيع +' + f(price)) + '</button></div>' +
            '<button class="btn line" style="width:100%;margin-top:8px" onclick="window.__ec.closeSh()">إغلاق</button>')
    }
    async function level(uid, n) {
        if (busy) return
        busy = true
        const r = await post('/echoes/level', { uid, levels: n })
        busy = false
        if (!r.ok) return toast(r.message || '❌ تعذّر التطوير')
        const j = await reload({ quiet: true })
        const it = S.inv.find(x => x.uid === uid)
        const newIdx = r.unlocked && r.unlocked.length && it ? it.subs.length - 1 : -1
        if (it) openSheet(uid, 1, newIdx)
        toast(r.unlocked && r.unlocked.length ? '✨ ساب ستات جديد انفتح!' : '⬆️ +' + r.applied + ' لفل')
    }
    async function sell(uid) {
        if (busy) return
        if (S.sellOk !== uid) { S.sellOk = uid; return openSheet(uid) }
        busy = true
        const r = await post('/echoes/sell', { uids: [uid] })
        busy = false
        S.sellOk = ''
        if (!r.ok) return toast(r.message || '❌ تعذّر البيع')
        closeSh()
        await reload({ quiet: true })
        toast('💰 +' + f(r.gold))
    }

    // ───────── قائمة الشخصيات (بحث + صفحات من الخادم) ─────────
    function pickChar(uid) { S.cl = { q: '', pg: 0, mode: 'equip', uid: uid, slot: 0 }; charList() }
    function chooseChar() { S.cl = { q: '', pg: 0, mode: 'view', uid: '', slot: 0 }; charList() }
    function pickTeam(n) { S.cl = { q: '', pg: 0, mode: 'team', uid: '', slot: n }; charList() }
    function charList() {
        const m = S.cl.mode
        openSh('<h2 style="text-align:center;font-size:18px">' + (m === 'equip' ? '👤 على أي شخصية تلبس القطعة؟' : m === 'team' ? '👥 اختر شخصية لخانة الفريق ' + (S.cl.slot + 1) + ' من 3' : '👤 اختر الشخصية') + '</h2>' +
            '<input class="srch" id="csrch" placeholder="🔍 ابحث بالاسم أو الرقم · عندك ' + S.charCount + ' شخصية" oninput="window.__ec.search(this.value)"><div id="cl"></div><button class="btn line" style="width:100%;margin-top:6px" onclick="window.__ec.closeSh()">إغلاق</button>')
        charRows()
    }
    let searchT = 0
    function search(v) { clearTimeout(searchT); searchT = setTimeout(() => { S.cl.q = v; S.cl.pg = 0; charRows() }, 250) }
    async function charRows() {
        const j = await get('/echoes/chars?page=' + S.cl.pg + '&q=' + encodeURIComponent(S.cl.q || ''))
        const box = $('#cl')
        if (!box) return
        if (!j.ok) { box.innerHTML = '<div class="empty">' + esc(j.message || '❌ تعذّر التحميل') + '</div>'; return }
        S.cl.pg = j.page
        S.cl.items = j.items
        const cur = S.char ? S.char.index : -1
        box.innerHTML = (j.items.map(c => '<div class="cr ' + (c.index === cur ? 'on' : '') + '" onclick="window.__ec.selChar(' + c.index + ')">' + avatar(c) + '<b>#' + (c.index + 1) + ' ' + esc(c.name) + '<small>💪 ' + f(c.power) + '</small></b><span class="mini">' + c.slots.map(x => '<i class="' + (x ? 'f' : '') + '"></i>').join('') + '</span></div>').join('') || '<div class="empty">لا نتائج</div>') +
            '<div class="pager"><button ' + (j.page >= j.pages - 1 ? 'disabled' : '') + ' onclick="window.__ec.pg(1)">التالي ›</button><span>' + (j.page + 1) + ' / ' + j.pages + '</span><button ' + (j.page <= 0 ? 'disabled' : '') + ' onclick="window.__ec.pg(-1)">‹ السابق</button></div>'
    }
    function pg(d) { S.cl.pg += d; charRows() }
    async function selChar(i) {
        const c = (S.cl.items || []).find(x => x.index === i)
        if (!c) return
        if (S.cl.mode === 'equip') return equipTo(c, S.cl.uid)
        if (S.cl.mode === 'team') return setTeam(S.cl.slot, c)
        closeSh(); go('eq'); await reload({ char: i })
    }
    async function step(d) {
        const n = S.charCount || 1
        await reload({ char: ((S.char ? S.char.index : 0) + d + n) % n })
    }

    // ───────── لبس / خلع ─────────
    async function equipTo(c, uid, slot) {
        if (busy) return
        busy = true
        const r = await post('/echoes/equip', { charIndex: c.index, name: c.name, uid, slot: slot || undefined })
        busy = false
        if (!r.ok) return toast(r.message || '❌ تعذّر اللبس')
        closeSh(); go('eq')
        await reload({ char: c.index, quiet: true })
        const el = r.slot && $('#s-' + r.slot)
        if (el) el.classList.add('pop')
        toast('✅ تم اللبس وحُفظ على ' + c.name)
    }
    function slotTap(k) { S.char && S.char.echoes[k] ? eqSheet(k) : echoList(k) }
    function echoList(k) {
        const c = SLOT_COST[k], L = S.inv.filter(x => x.cost === c)
        openSh('<h2 style="text-align:center;font-size:18px;margin-bottom:10px">' + IC[c] + ' اختر إيكو كوست ' + c + ' لـ ' + esc(S.char.name) + '</h2>' +
            (L.map(it => { const fm = FM[it.fam] || FAMS[0]; return '<div class="er" style="--c:' + fm.c + '" onclick="window.__ec.equipSlot(\'' + it.uid + '\',\'' + k + '\')"><span style="font-size:24px">' + IC[c] + '</span><b>' + fm.e + ' ' + esc(fm.ar) + '<small>' + mainName(it.main.t) + ' +' + it.main.v + '% · Lv ' + it.lvl + '</small></b><span class="btn sm">لبس</span></div>' }).join('') ||
                '<div class="empty">لا توجد قطع كوست ' + c + ' بالحقيبة — ادخل دومين 🌀</div>') +
            '<button class="btn line" style="width:100%;margin-top:6px" onclick="window.__ec.closeSh()">إغلاق</button>')
    }
    function equipSlot(uid, k) { equipTo({ index: S.char.index, name: S.char.name }, uid, k) }
    function eqSheet(k) {
        const it = S.char.echoes[k], fm = FM[it.fam] || FAMS[0]
        openSh('<div class="card" style="--c:' + fm.c + ';cursor:default"><div class="ico">' + IC[it.cost] + '</div><b style="text-align:center;font-size:17px">' + fm.e + ' ' + esc(fm.ar) + '</b><div class="bar"><i style="width:' + (it.lvl / it.max * 100) + '%"></i></div><small>Lv ' + it.lvl + '/' + it.max + ' · كوست ' + it.cost + '</small></div>' +
            pieceRows(it, -1) +
            '<div class="acts"><button class="btn" onclick="window.__ec.echoList(\'' + k + '\')">🔄 استبدال</button><button class="btn red" onclick="window.__ec.unequip(\'' + k + '\')">خلع</button></div>' +
            '<button class="btn line" style="width:100%;margin-top:8px" onclick="window.__ec.closeSh()">إغلاق</button>')
    }
    async function unequip(k) {
        if (busy || !S.char) return
        busy = true
        const r = await post('/echoes/unequip', { charIndex: S.char.index, name: S.char.name, slot: k })
        busy = false
        if (!r.ok) return toast(r.message || '❌ تعذّر الخلع')
        closeSh()
        await reload({ quiet: true })
        toast('تم الخلع وعادت القطعة للحقيبة')
    }

    // ───────── فريق الدومين (3 شخصيات مختلفة، محفوظ لكل دومين على الخادم) ─────────
    async function setTeam(n, c) {
        const cur = teamList().slice()
        if (cur.some((x, j) => x && x.index === c.index && j !== n)) return toast('❌ الشخصية موجودة بالفريق')
        cur[n] = { index: c.index, name: c.name, power: c.power, img: c.img }
        S.draft[S.dom] = cur
        closeSh()
        const full = [0, 1, 2].every(i => cur[i])
        if (!full) { render(); return toast('اختر باقي الفريق (3 شخصيات)') }
        busy = true
        const r = await post('/echoes/team', { domainId: S.dom, chars: cur.map(x => ({ index: x.index, name: x.name })) })
        busy = false
        if (!r.ok) { render(); return toast(r.message || '❌ تعذّر حفظ الفريق') }
        delete S.draft[S.dom]
        await reload({ quiet: true })
        toast('✅ حُفظ فريق دومين ' + FAMS[S.dom - 1].ar)
    }

    // ───────── القتال: النتيجة تأتي من الخادم أولاً (enterDomain) ثم تُعرض بحركة ─────────
    async function enter() {
        if (busy) return
        if (S.draft[S.dom]) return toast('❌ أكمل فريق من 3 شخصيات أولاً')
        if (!S.team || S.team.length !== 3) { toast('❌ حدّد فريق من 3 شخصيات أولاً'); return pickTeam(Math.min(S.team ? S.team.length : 0, 2)) }
        busy = true
        const r = await post('/echoes/enter', { domainId: S.dom, difficulty: S.diff })
        if (!r.ok) { busy = false; return toast(r.message || '❌ تعذّر دخول الدومين') }
        try { await battle(r) } finally { busy = false }
        reload({ quiet: true })
    }
    function fx(t, cls, x, y) {
        const s = document.createElement('span')
        s.className = 'dm ' + cls; s.textContent = t; s.style.left = x + '%'; s.style.top = y + '%'
        $('#fl').appendChild(s); setTimeout(() => s.remove(), 900)
    }
    async function battle(r) {
        const fm = FAMS[S.dom - 1], B = $('#bt'), won = r.won, roll = r.luckRoll, mon = r.monster || 'الوحش'
        const di = DINFO[r.difficulty] || DINFO.medium
        skip = false
        B.style.setProperty('--rc', fm.c)
        B.innerHTML = '<div class="bg"></div><div class="btitle">' + fm.e + ' دومين ' + esc(fm.ar) + '<small>' + di[0] + ' ' + di[1] + '</small></div><button class="skp" onclick="window.__ec.skip()">تخطي ⏭</button>' +
            '<div class="dice" id="dc">🎲</div><div class="mon" id="mo"><div class="me">' + fm.e + '</div><b>' + esc(mon) + '</b><div class="hb"><i id="mh"></i></div></div>' +
            '<div class="party">' + r.team.map((p, i) => '<div class="pm" id="p' + i + '"><div class="pe">' + (p.img ? '<i style="background-image:url(\'' + esc(p.img) + '\')"></i>' : '🗡️') + '</div>' + esc(p.name) + '<div class="hb g" style="margin-top:5px"><i id="ph' + i + '"></i></div></div>').join('') + '</div><div class="fl" id="fl"></div>'
        B.className = 'on'
        const dc = $('#dc')
        for (let i = 0; i < 12; i++) { dc.textContent = rnd(1, 20); await sleep(70) }
        dc.className = 'dice ' + (roll > 10 ? 'up' : 'dn')
        dc.innerHTML = '🎲 ' + roll + '/20<small>' + (roll > 10 ? '+5% حظ 👍' : '−5% حظ 👎') + '</small>'
        await sleep(1100); dc.classList.add('gone')
        const N = 7, end = won ? 0 : rnd(28, 48), hp = [100, 100, 100], SK = ['ضربة الصدى', 'انفجار العنصر', 'تمزيق الفراغ']
        const cnt3 = r.team.length || 3
        for (let i = 0; i < N; i++) {
            const a = i % cnt3, pa = $('#p' + a)
            if (!pa) break
            pa.classList.add('atk'); await sleep(320)
            const burst = i % 3 === 2, crit = Math.random() < .35, dmg = Math.round(rnd(800, 2200) * (crit ? 1.8 : 1) * (burst ? 1.6 : 1))
            $('#fl').insertAdjacentHTML('beforeend', '<div class="slash"></div>')
            if (burst) { B.classList.add('flash'); $('#fl').insertAdjacentHTML('beforeend', '<div class="sk">' + SK[(i / 3 | 0) % 3] + '</div>'); setTimeout(() => B.classList.remove('flash'), 450) }
            fx('-' + dmg.toLocaleString('en-US'), crit ? 'crit' : '', 50 + rnd(-14, 14), 26)
            $('#mo').classList.add('hit'); $('#mh').style.width = (100 - (100 - end) * (i + 1) / N) + '%'; await sleep(380)
            $('#mo').classList.remove('hit'); pa.classList.remove('atk')
            if (i % 2 === 1 || (!won && i >= N - 3)) {
                const j = won ? rnd(0, cnt3 - 1) : i % cnt3, loss = won ? rnd(8, 16) : 40
                hp[j] = Math.max(0, hp[j] - loss)
                const pj = $('#p' + j); pj.classList.add('hit'); fx('-' + rnd(300, 900), 'me', 16 + j * 34, 70)
                $('#ph' + j).style.width = hp[j] + '%'; if (!hp[j]) pj.classList.add('dn')
                await sleep(350); pj.classList.remove('hit')
            }
            await sleep(180)
        }
        if (won) { $('#mo').classList.add('die'); await sleep(1000) }
        else { for (let j = 0; j < cnt3; j++) { $('#ph' + j).style.width = '0'; $('#p' + j).classList.add('dn') } await sleep(700) }
        if (won) {
            B.insertAdjacentHTML('beforeend', '<div class="res w"><h2>انتصار!</h2><div>هزمت ' + esc(mon) + '</div></div>')
            await sleep(1300); B.className = ''
            if (r.item) reveal(r.item, mon, r.stored, r.tunersGained)
        } else {
            B.insertAdjacentHTML('beforeend', '<div class="res l"><h2>هزيمة 💀</h2><div>سقطت أمام ' + esc(mon) + '<br>كانت فرصة الفوز ' + Math.round(r.winChance * 100) + '%</div><button class="btn line" onclick="document.getElementById(\'bt\').className=\'\'">رجوع</button></div>')
        }
    }
    function reveal(it, mon, stored, tuners) {
        const fm = FM[it.fam] || FAMS[0]
        $('#rv').style.setProperty('--rc', fm.c)
        $('#rv').innerHTML = '<div class="beam"></div><div class="ring"></div><div class="ring"></div><div class="ring"></div><div class="rcard"><div class="ico">' + IC[it.cost] + '</div><h3>' + fm.e + ' ' + esc(fm.ar) + '</h3><p>كوست ' + it.cost + ' · ' + mainName(it.main.t) + ' +' + it.main.v + '%</p><p>🐉 ' + esc(mon) + '</p>' +
            (stored ? '' : '<p style="color:#f87171;margin-top:6px">⚠️ حقيبتك ممتلئة — القطعة ما انحفظت!</p>') +
            '<p style="color:var(--gold);margin-top:8px">🎼 +' + (tuners || 0) + ' تيونر</p></div><div class="hint">المس للمتابعة</div>'
        $('#rv').classList.add('on')
    }

    document.querySelectorAll('.tab').forEach(b => { b.onclick = () => go(b.dataset.t) })
    window.__ec = {
        openSheet, famSheet, famGo, setDom, setDiff, level, sell, pickChar, chooseChar, pickTeam, search, pg, selChar, step,
        slotTap, echoList, equipSlot, unequip, enter, closeSh, skip: () => { skip = true }
    }
    render()
}

function echoPageHTML({ viewer, code, state, navDrawerHTML, NAV_BTN, titlesHead }) {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
${titlesHead || ''}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>🎐 الإيكوز</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;800;900&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
${navDrawerHTML(code, viewer.csrf, 'echoes', viewer.name)}
<div class="wrap">
<header>
  <div class="tbr">${NAV_BTN}<a class="back" href="/u/${esc(code)}">← رجوع للعرض</a></div>
  <h1>🎐 الإيكوز</h1>
  <div class="top"><span class="pill" id="tn"></span><span class="pill" id="mn"></span><span class="pill" id="st"></span></div>
  <div class="tabs"><button class="tab on" data-t="inv">🎒 الحقيبة</button><button class="tab" data-t="eq">🧬 المجهز</button><button class="tab" data-t="dm">🌀 دومين</button><button class="tab" data-t="fm">📚 العوائل</button></div>
</header>
<div class="pane on" id="inv"></div><div class="pane" id="eq"></div><div class="pane" id="dm"></div><div class="pane" id="fm"></div>
</div>
<div class="sheet" id="sh"></div>
<div id="bt"></div>
<div id="rv" onclick="this.classList.remove('on')"></div>
<div class="toast" id="ts"></div>
<script>(${clientMain.toString()})(${jsonForScript(state)}, ${jsonForScript(String(code))}, ${jsonForScript(String(viewer.csrf))})</script>
</body>
</html>`
}

module.exports = { echoPageHTML }
