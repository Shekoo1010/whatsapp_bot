// =====================================================================
// systems/shardPage.js
// 🧩 صفحة الشظايا والتطوير والاسترجاع — /u/<كود>/shards
// منقولة من نموذج "الشظايا والتطوير" بنفس التصميم والأنميشن بالضبط،
// لكن البيانات والعمليات حقيقية (systems/shardSystem.js = نفس .شظايا / .تطوير / .استرجاع)
// الواجهة لا تحسب أي شيء بنفسها: كل نتيجة تجي من الخادم ثم تُعاد قراءة الحالة.
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
:root{--bg:#070911;--bg2:#0f1422;--card:#101627;--gold:#f0c04a;--gold-dim:#8a6d24;--text:#eef1f8;--dim:#8891a3;--text-dim:#8891a3;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*{box-sizing:border-box;margin:0;padding:0}
body{background:radial-gradient(900px 420px at 50% -10%,rgba(240,192,74,.12),transparent 60%),linear-gradient(180deg,#070911,#0a0d16 40%,#070911);background-color:#070911;color:var(--text);font-family:'Cairo',sans-serif;min-height:100vh;padding:0 14px 60px;overflow-x:hidden}
.stars{position:fixed;inset:0;pointer-events:none;z-index:0}
.stars i{position:absolute;width:3px;height:3px;border-radius:50%;background:var(--gold);opacity:0;animation:tw 6s infinite}
@keyframes tw{0%,100%{opacity:0;transform:translateY(0) scale(.5)}50%{opacity:.7;transform:translateY(-30px) scale(1.2)}}
.wrap{position:relative;z-index:1;max-width:900px;margin:0 auto}
header{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;padding:14px 0 10px;background:linear-gradient(#070911 70%,transparent)}
.tbr{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
.tbr .back{font:800 13px 'Cairo',sans-serif;color:var(--gold);text-decoration:none;border:1px solid var(--gold-dim);border-radius:20px;padding:6px 14px;background:#0f1422}
.eye{text-align:center;font-family:'Oswald';letter-spacing:.4em;font-size:10px;color:var(--gold-dim)}
h1{text-align:center;font-size:26px;font-weight:900;background:linear-gradient(90deg,#b8891f,#fff2b8,#f0c04a,#fff2b8,#b8891f);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:sh 4s linear infinite}
@keyframes sh{to{background-position:-200% 0}}
.stats{display:flex;gap:8px;justify-content:center;margin:10px 0}
.pill{font-family:'Oswald';font-size:14px;padding:5px 14px;border-radius:20px;border:1px solid rgba(240,192,74,.4);background:rgba(240,192,74,.08);color:var(--gold);direction:ltr}
.tabs{display:flex;background:var(--bg2);border:1px solid #1d2438;border-radius:16px;padding:4px;position:relative}
.tabs button{flex:1;z-index:1;background:none;border:0;color:var(--dim);font:700 15px 'Cairo';padding:10px;cursor:pointer;transition:.3s}
.tabs button.on{color:#0a0d16}
.tabs .glider{position:absolute;top:4px;bottom:4px;width:calc(50% - 4px);border-radius:12px;background:linear-gradient(135deg,#f6d26b,#c8921e);box-shadow:0 0 20px rgba(240,192,74,.5);transition:.4s cubic-bezier(.7,0,.2,1);right:4px}
.tabs.t2 .glider{right:50%}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-top:16px}
.card{--t:#ff3860;position:relative;background:linear-gradient(180deg,#141b30,var(--card));border:1px solid color-mix(in srgb,var(--t) 45%,#1d2438);border-radius:20px;overflow:hidden;animation:in .7s both;box-shadow:0 0 0 0 var(--t);transition:transform .3s,box-shadow .3s}
.card:hover{transform:translateY(-6px);box-shadow:0 12px 40px color-mix(in srgb,var(--t) 35%,transparent)}
@keyframes in{from{opacity:0;transform:translateY(30px) scale(.94)}}
.card::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.14) 50%,transparent 60%);transform:translateX(-120%);animation:gl 5s infinite;pointer-events:none}
@keyframes gl{60%,100%{transform:translateX(120%)}}
.pic{height:170px;background-size:cover;background-position:center;position:relative}
.pic::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 50%,var(--card))}
.tag{position:absolute;top:10px;right:10px;z-index:2;font-family:'Oswald';font-size:12px;font-weight:700;color:#0a0d16;background:var(--t);padding:3px 10px;border-radius:12px;direction:ltr}
.omg{position:absolute;top:10px;left:10px;z-index:2;font-size:11px;font-weight:900;color:#0a0d16;background:#ffc933;padding:3px 9px;border-radius:12px;animation:pu 1.6s infinite}
@keyframes pu{50%{box-shadow:0 0 16px #ffc933}}
.bd{padding:0 12px 14px;margin-top:-26px;position:relative;z-index:2}
.bd h3{font:700 18px 'Oswald';letter-spacing:.03em;direction:ltr;text-align:center}
.bd small{display:block;text-align:center;color:var(--dim);font-size:12px;margin-bottom:8px}
.gems{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:6px 0 10px}
.gem{width:26px;height:30px;clip-path:polygon(50% 0,100% 35%,80% 100%,20% 100%,0 35%);background:#222a40}
.gem.f{background:linear-gradient(135deg,#fff,var(--t) 45%,color-mix(in srgb,var(--t) 40%,#000));filter:drop-shadow(0 0 6px var(--t));animation:fl 2.4s ease-in-out infinite}
.sm .gem{width:18px;height:21px}
@keyframes fl{50%{transform:translateY(-4px) rotate(4deg)}}
.bar{height:7px;border-radius:6px;background:#1a2136;overflow:hidden}
.bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--t),#fff);border-radius:6px;transition:width 1.4s cubic-bezier(.2,.8,.2,1)}
.st{text-align:center;font:600 13px 'Oswald';margin-top:7px;direction:ltr;color:var(--dim)}
.st.ok{color:#3dff9a}
.path{display:flex;justify-content:center;align-items:center;gap:3px;margin:6px 0 10px;direction:ltr}
.path b{width:12px;height:12px;border-radius:50%;background:#222a40}
.path b.d{background:var(--t)}
.path b.c{background:#fff;box-shadow:0 0 0 3px var(--t),0 0 14px var(--t);animation:pu 1.5s infinite}
.req{display:flex;flex-direction:column;gap:5px;font-size:13px;margin-bottom:10px}
.req div{display:flex;justify-content:space-between;background:#0c1120;border-radius:10px;padding:5px 10px}
.req .no{color:#ff6b6b}.req .yes{color:#3dff9a}
.btn{width:100%;border:0;border-radius:12px;padding:10px;font:900 15px 'Cairo';cursor:pointer;color:#0a0d16;background:linear-gradient(135deg,#f6d26b,#c8921e);box-shadow:0 0 18px rgba(240,192,74,.45);transition:.2s}
.btn:active{transform:scale(.96)}
.btn[disabled]{background:#222a40;color:#667;box-shadow:none;cursor:not-allowed}
.btn.om{background:linear-gradient(135deg,#fff3b0,#ffc933,#ff8a00);animation:pu 1.4s infinite}
.empty{text-align:center;color:var(--dim);padding:50px 0}
.rbtn{width:100%;margin-top:10px;border:1px solid color-mix(in srgb,var(--t) 60%,transparent);background:color-mix(in srgb,var(--t) 12%,transparent);color:var(--text);border-radius:12px;padding:8px;font:700 14px 'Cairo';cursor:pointer;transition:.2s}
.rbtn:active{transform:scale(.96)}.rbtn[disabled]{opacity:.5}
.card.rs{animation:rsf .7s ease-out}
@keyframes rsf{40%{filter:brightness(1.8);transform:scale(1.04)}}
.gem.out{animation:gout .6s ease-in forwards}
@keyframes gout{to{transform:translateY(-44px) scale(2.2);opacity:0}}
.rp{position:fixed;inset:0;z-index:150;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;animation:ovin .3s both}
@keyframes ovin{from{opacity:0}}
.rpc{position:relative;width:min(78vw,280px);text-align:center;background:linear-gradient(180deg,#141b30,#0b0f1d);border:2px solid var(--t);border-radius:22px;padding:14px;box-shadow:0 0 60px color-mix(in srgb,var(--t) 55%,transparent);animation:rpin .7s cubic-bezier(.2,1.5,.3,1) both}
@keyframes rpin{from{transform:scale(.3) rotate(-8deg);opacity:0}}
.rpc .im{height:230px;border-radius:16px;background-size:cover;background-position:center;animation:asm 1.1s ease-out both}
@keyframes asm{from{filter:blur(14px) brightness(2.6);transform:scale(1.15)}}
.rpc h4{margin:10px 0 2px;font-size:18px;color:#3dff9a}
.rpc b{display:block;font:700 18px 'Oswald';direction:ltr}
.rpc p{font-size:13px;color:var(--dim);margin-top:4px}
.ov{position:fixed;inset:0;z-index:100;display:none;overflow:hidden;background:radial-gradient(circle at 50% 42%,#12172c,#000 72%);--t:#ffc933;--n:#ffc933}
.ov.show{display:block;animation:ovin .5s both}
@keyframes rot{to{transform:rotate(360deg)}}
.rays{position:absolute;left:50%;top:42%;width:170vmax;height:170vmax;margin:-85vmax 0 0 -85vmax;background:repeating-conic-gradient(color-mix(in srgb,var(--t) 32%,transparent) 0 5deg,transparent 5deg 15deg);-webkit-mask:radial-gradient(circle,#000,transparent 48%);mask:radial-gradient(circle,#000,transparent 48%);animation:rot 18s linear infinite}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;padding-top:calc(20px + env(safe-area-inset-top,0px));overflow-y:auto}
.stage.kick{animation:kick .6s ease-out}
@keyframes kick{from{transform:scale(1.08)}}
.hw{animation:hin 1.2s cubic-bezier(.2,1.3,.3,1) both}
@keyframes hin{from{transform:scale(.1) rotate(-14deg);opacity:0}}
.hs{position:relative;--a:3px}
.hs.chg{animation:shk .07s linear infinite}
.hs.chg2{--a:7px}
@keyframes shk{25%{transform:translate(var(--a),-2px)}75%{transform:translate(calc(var(--a)*-1),2px)}}
.hs.pop{animation:pop .7s cubic-bezier(.2,1.6,.3,1)}
@keyframes pop{from{transform:scale(1.2)}}
.hero{width:min(56vw,230px);aspect-ratio:3/4;border-radius:22px;background-size:cover;background-position:center;border:3px solid var(--t);box-shadow:0 0 30px var(--t);transition:border-color .3s,box-shadow .3s}
.hero.glow{animation:glw 1.7s ease-in forwards}
@keyframes glw{to{box-shadow:0 0 110px 20px var(--t);filter:brightness(1.7) saturate(1.3)}}
.hero.done{border-color:var(--n);box-shadow:0 0 80px var(--n)}
.ring{position:absolute;left:50%;top:50%;width:140px;height:140px;margin:-70px 0 0 -70px;border-radius:50%;border:3px solid var(--t);opacity:0;animation:rg 2.4s ease-out infinite;pointer-events:none}
.ring.b{border-color:var(--n);animation:rg 1.3s ease-out both}
@keyframes rg{0%{transform:scale(.5);opacity:.9}100%{transform:scale(6);opacity:0}}
.pt{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:var(--c);box-shadow:0 0 10px var(--c);pointer-events:none}
.pt.o{animation:bo 1.4s ease-out forwards}
.pt.i{animation:bi .9s ease-in forwards}
@keyframes bo{to{transform:translate(var(--x),var(--y)) scale(0);opacity:0}}
@keyframes bi{from{transform:translate(var(--x),var(--y));opacity:0}30%{opacity:1}to{transform:translate(0,0) scale(.3);opacity:0}}
.flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
.flash.on{animation:fa 1s ease-out}
@keyframes fa{from{opacity:1}to{opacity:0}}
.tx{margin-top:20px;text-align:center;visibility:hidden}
.tx.on{visibility:visible}
.tx>*{opacity:0}
.tx.on>*{animation:rise .7s cubic-bezier(.2,.9,.3,1) both;animation-delay:calc(var(--d,0)*.2s)}
@keyframes rise{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
.ttl{font:700 12px 'Oswald';letter-spacing:.4em;color:var(--n)}
.nm{font:700 22px 'Oswald';direction:ltr;margin:2px 0}
.rk{font:700 34px 'Oswald';direction:ltr;display:flex;gap:12px;justify-content:center;align-items:center}
.rk .o{color:var(--dim);text-decoration:line-through;font-size:22px}
.rk .n{color:var(--n);text-shadow:0 0 26px var(--n)}
.dots{display:flex;gap:6px;justify-content:center;margin:8px 0;direction:ltr}
.dots b{width:12px;height:12px;border-radius:50%;background:#222a40}
.tx.on .dots b.d{animation:dp .5s both;animation-delay:calc(.9s + var(--i)*.12s)}
@keyframes dp{from{transform:scale(0)}60%{transform:scale(1.6)}to{transform:scale(1);background:var(--c);box-shadow:0 0 12px var(--c)}}
.pw{font:600 24px 'Oswald';color:var(--gold)}
.ab{margin:10px auto 0;max-width:300px;border:1px solid var(--n);border-radius:14px;padding:8px 12px;font-size:13px;background:rgba(255,255,255,.06)}
.wp{margin:10px auto 0;max-width:300px;font-size:12px;color:var(--dim);white-space:pre-line}
.tx .btn{margin-top:16px;width:210px}
.tx.skip *{animation-duration:.01s!important;animation-delay:0s!important}
.skip-h{position:absolute;bottom:calc(18px + env(safe-area-inset-bottom,0px));left:0;right:0;text-align:center;color:var(--dim);font-size:12px;pointer-events:none}
.toast{position:fixed;bottom:calc(24px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);background:#2a1218;border:1px solid #ff6b6b;color:#ffb3b3;padding:10px 18px;border-radius:14px;z-index:200;font-size:14px;animation:in .3s;max-width:92%;text-align:center;white-space:pre-line}
@media (prefers-reduced-motion:reduce){.card,.card::after,h1,.stars i,.rays{animation:none!important}}
`

// الواجهة (تُحقن كنص عبر toString فلا حاجة لتهريب أي شيء)
function clientMain(INIT, CODE, CSRF) {
    const RANKS = ['SSS', 'SSS+', 'SSS++', 'UR I', 'UR II', 'UR III', 'EX', 'Ω']
    const COL = ['#ff3860', '#ff6b3d', '#ff2f92', '#b83fff', '#7c4dff', '#4d7cff', '#00e5ff', '#ffc933']
    const S = { tab: 1, money: 0, omegaUsed: 0, maxOmega: 10, shards: [], evo: [] }
    let busy = false
    const $ = id => document.getElementById(id)
    const f = n => Number(n).toLocaleString('en-US')
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

    function art(n, c) {
        const w = String(n || '?').split(' ').map(x => x[0] || '').slice(0, 2).join('')
        const s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c + '"/><stop offset="1" stop-color="#0a0d16"/></linearGradient><radialGradient id="r"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="300" height="400" fill="url(#g)"/><circle cx="150" cy="170" r="150" fill="url(#r)"/><circle cx="150" cy="150" r="52" fill="#0a0d16" opacity=".8"/><path d="M30 400c0-90 50-130 120-130s120 40 120 130z" fill="#0a0d16" opacity=".8"/><text x="150" y="168" font-size="46" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">' + esc(w) + '</text></svg>'
        return "url('data:image/svg+xml," + encodeURIComponent(s) + "')"
    }
    // صورة الشخصية الحقيقية إن وُجدت (الخادم يمرّر رابطاً آمناً فقط) وإلا الرسمة الاحتياطية من النموذج
    const pic = (c, col) => c.img ? "url('" + c.img + "')" : art(c.name, col)

    const gems = (a, t) => Array.from({ length: t }, (_, i) => '<span class="gem ' + (i < a ? 'f' : '') + '" style="animation-delay:' + (i * .18) + 's"></span>').join('')

    function head() {
        $('money').textContent = '💰 ' + f(S.money)
        $('omg').textContent = 'Ω ' + S.omegaUsed + '/' + S.maxOmega
    }

    function shardsView() {
        if (!S.shards.length) return '<div class="empty">📭 لا تملك أي شظايا</div>'
        return '<div class="grid">' + S.shards.map((c, i) => {
            const t = c.target, ok = c.amount >= t, lv = c.lv
            return '<div class="card" data-k="' + esc(c.key) + '" style="--t:' + COL[lv] + ';animation-delay:' + (i * .09) + 's">' +
                '<div class="pic" style="background-image:' + pic(c, COL[lv]) + '"></div>' +
                '<span class="tag">' + RANKS[lv] + '</span>' + (c.omega ? '<span class="omg">🌌 Ω جاهز</span>' : '') +
                '<div class="bd"><h3>' + esc(c.name) + '</h3><small>' + esc(c.anime) + '</small>' +
                '<div class="gems ' + (c.omega ? 'sm' : '') + '">' + gems(Math.min(c.amount, t), t) + '</div>' +
                '<div class="bar"><i data-w="' + Math.min(100, c.amount / t * 100) + '"></i></div>' +
                '<div class="st ' + (ok ? 'ok' : '') + '">' + c.amount + '/' + t + (ok ? ' ✔ READY' : '') + '</div>' +
                '<button class="rbtn" data-k="' + esc(c.key) + '" onclick="window.__sx.restore(this)">♻️ استرجاع نسخة</button></div></div>'
        }).join('') + '</div>'
    }

    function evoView() {
        if (!S.evo.length) return '<div class="empty">📭 لا توجد شخصيات SSS قابلة للتطوير</div>'
        return '<div class="grid">' + S.evo.map((c, i) => {
            const om = c.level === 6
            const okS = c.have >= c.need, okM = S.money >= c.cost
            const can = okS && okM && !c.omegaLimit && !c.blocked
            const label = c.blocked ? '👑 توجد نسخة مطورة' : c.omegaLimit ? '🚫 وصلت الحد' : can ? (om ? '🌌 تطوير أوميقا' : '✨ تطوير') : '🔒 غير جاهز'
            return '<div class="card" style="--t:' + COL[c.level + 1] + ';animation-delay:' + (i * .09) + 's">' +
                '<div class="pic" style="background-image:' + pic(c, COL[c.level]) + '"></div>' +
                '<span class="tag">' + RANKS[c.level] + ' ➜ ' + RANKS[c.level + 1] + '</span>' +
                '<div class="bd"><h3>' + esc(c.name) + '</h3><small>' + esc(c.anime) + '</small>' +
                '<div class="path">' + RANKS.map((_, k) => '<b class="' + (k < c.level ? 'd' : k === c.level ? 'c' : '') + '" style="--t:' + COL[k] + '"></b>').join('') + '</div>' +
                '<div class="req"><div><span>🧩 الشظايا</span><span class="' + (okS ? 'yes' : 'no') + '">' + c.have + '/' + c.need + '</span></div>' +
                '<div><span>💰 التكلفة</span><span class="' + (okM ? 'yes' : 'no') + '">' + f(c.cost) + '</span></div>' +
                '<div><span>⚔️ القوة</span><span>' + f(c.power) + ' ➜ ' + f(c.nextPower) + '</span></div></div>' +
                '<button class="btn ' + (om ? 'om' : '') + '" ' + (can ? '' : 'disabled') + ' onclick="window.__sx.evolve(' + i + ')">' + label + '</button></div></div>'
        }).join('') + '</div>'
    }

    function render() {
        head()
        const m = $('main')
        m.innerHTML = S.tab === 1 ? shardsView() : evoView()
        requestAnimationFrame(() => setTimeout(() => m.querySelectorAll('.bar i').forEach(e => { e.style.width = e.dataset.w + '%' }), 50))
    }

    function apply(j) {
        S.money = Number(j.money) || 0
        S.omegaUsed = Number(j.omegaUsed) || 0
        S.maxOmega = Number(j.maxOmega) || 10
        S.shards = j.shards || []
        S.evo = j.evo || []
    }

    function toast(t) {
        const d = document.createElement('div')
        d.className = 'toast'
        d.textContent = t
        document.body.appendChild(d)
        setTimeout(() => d.remove(), 3200)
    }

    async function load(quiet) {
        try {
            const r = await fetch('/shards/state', { credentials: 'same-origin', cache: 'no-store' })
            if (r.status === 401) { location.href = '/login?code=' + CODE; return }
            const j = await r.json()
            if (j && j.ok) { apply(j); render() } else if (!quiet) toast((j && j.message) || '❌ تعذّر تحديث الصفحة')
        } catch (e) { if (!quiet) toast('❌ تعذّر الاتصال بالخادم') }
    }

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

    $('tabs').onclick = e => {
        const b = e.target.closest('button')
        if (!b) return
        S.tab = +b.dataset.t
        $('tabs').className = 'tabs' + (S.tab === 2 ? ' t2' : '')
        document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b))
        render()
    }

    // ───────── التطوير (.تطوير رقم) ─────────
    async function evolve(i) {
        const c = S.evo[i]
        if (!c || busy) return
        busy = true
        const res = await post('/shards/evolve', { index: c.index, name: c.name })
        busy = false
        if (!res.ok) {
            if (res.message) toast(res.message)
            load(true)
            return
        }
        cinematic(c, res)
    }

    let TM = [], IV = 0, DONE = false
    function burst(hs, n, cls, col) {
        for (let k = 0; k < n; k++) {
            const p = document.createElement('i')
            p.className = 'pt ' + cls
            const a = Math.random() * 6.28, d = cls === 'i' ? 130 + Math.random() * 130 : 110 + Math.random() * 240
            p.style.setProperty('--x', Math.cos(a) * d + 'px')
            p.style.setProperty('--y', Math.sin(a) * d + 'px')
            p.style.setProperty('--c', col)
            hs.appendChild(p)
            setTimeout(() => p.remove(), 1500)
        }
    }

    function cinematic(c, r) {
        const ov = $('ov'), om = !!r.omega
        const old = Math.max(0, RANKS.indexOf(r.oldRank)), nl = Number(r.newLevel) || old + 1
        const oldP = Number(c.power) || 0, newP = Number(r.power) || oldP
        const oc = COL[old], nc = COL[nl]
        const abs = (r.abilities || []).slice(0, 3)
        TM.forEach(clearTimeout); clearInterval(IV); TM = []; DONE = false
        ov.style.setProperty('--t', oc)
        ov.style.setProperty('--n', nc)
        const dots = RANKS.map((_, k) => '<b style="--i:' + k + ';--c:' + COL[k] + '" class="' + (k <= nl ? 'd' : '') + '"></b>').join('')
        const abHtml = abs.map((a, k) => '<div class="ab" style="--d:' + (5 + k) + '"><b>' + esc(a.name) + '</b><br>' + esc(a.description) + '</div>').join('')
        const wpHtml = r.worldText ? '<div class="wp" style="--d:' + (5 + abs.length) + '">' + esc(r.worldText) + '</div>' : ''
        const bd = 6 + abs.length + (r.worldText ? 1 : 0)
        ov.innerHTML = '<div class="rays"></div><div class="stage" id="stg"><div class="hw"><div class="hs" id="hs"><div class="hero" id="hero" style="background-image:' + pic(c, oc) + '"></div></div></div>' +
            '<div class="tx" id="tx"><div class="ttl" style="--d:0">' + (om ? 'OMEGA ASCENSION' : 'EVOLUTION') + '</div><div class="nm" style="--d:1">' + esc(c.name) + '</div>' +
            '<div class="rk" style="--d:2"><span class="o">' + esc(r.oldRank) + '</span><span>➜</span><span class="n">' + esc(r.newRank) + '</span></div>' +
            '<div class="dots" style="--d:3">' + dots + '</div><div class="pw" style="--d:4">⚔️ <span id="pn">' + f(oldP) + '</span></div>' +
            abHtml + wpHtml +
            '<button class="btn" style="--d:' + bd + '" onclick="event.stopPropagation();window.__sx.closeOv()">متابعة 👑</button></div></div>' +
            '<div class="flash" id="flash"></div><div class="skip-h">اضغط للتخطي</div>'
        ov.className = 'ov show'
        const hs = $('hs'), hero = $('hero'), tx = $('tx')
        const reveal = skip => {
            if (DONE) return
            DONE = true
            TM.forEach(clearTimeout); clearInterval(IV)
            hs.classList.remove('chg', 'chg2'); hero.classList.remove('glow')
            ov.style.setProperty('--t', nc)
            if (!c.img) hero.style.backgroundImage = art(c.name, nc)
            hero.classList.add('done')
            if (!skip) {
                $('flash').classList.add('on'); $('stg').classList.add('kick'); hs.classList.add('pop'); burst(hs, 64, 'o', nc)
                for (let k = 0; k < 2; k++) { const rg = document.createElement('i'); rg.className = 'ring b'; rg.style.animationDelay = k * .25 + 's'; hs.appendChild(rg) }
            }
            tx.classList.add('on'); if (skip) tx.classList.add('skip')
            const el = $('pn'), t0 = performance.now(), dur = skip ? 1 : 1600
            ;(function st(n) { const q = Math.min(1, (n - t0) / dur); el.textContent = f(Math.round(oldP + (newP - oldP) * q)); if (q < 1) requestAnimationFrame(st) })(t0)
        }
        ov.onclick = () => reveal(true)
        for (let k = 0; k < 3; k++) { const rg = document.createElement('i'); rg.className = 'ring'; rg.style.animationDelay = k * .8 + 's'; hs.appendChild(rg) }
        TM.push(setTimeout(() => { hs.classList.add('chg'); hero.classList.add('glow'); IV = setInterval(() => burst(hs, 3, 'i', oc), 70) }, 1300))
        TM.push(setTimeout(() => hs.classList.add('chg2'), 2200))
        TM.push(setTimeout(() => reveal(false), 3000))
    }

    function closeOv() {
        TM.forEach(clearTimeout); clearInterval(IV)
        const o = $('ov')
        o.className = 'ov'; o.innerHTML = ''
        load(true)
    }

    // ───────── الاسترجاع (.استرجاع رقم) ─────────
    async function restore(btn) {
        const key = btn.dataset.k
        if (btn.disabled || busy || !key) return
        busy = true; btn.disabled = true
        const card = btn.closest('.card')
        const src = S.shards.find(x => x.key === key)
        const res = await post('/shards/restore', { key })
        if (!res.ok) {
            busy = false; btn.disabled = false
            if (res.message) toast(res.message)
            load(true)
            return
        }
        card.classList.add('rs')
        const g = [...card.querySelectorAll('.gem.f')].pop()
        if (g) g.classList.add('out')
        setTimeout(() => {
            busy = false
            rp(res, src)
            load(true)
        }, 700)
    }

    function rp(res, src) {
        const d = document.createElement('div')
        d.className = 'rp'
        d.innerHTML = '<div class="rpc" style="--t:' + COL[0] + '"><div class="im" style="background-image:' + pic({ img: src && src.img, name: res.name }, COL[0]) + '"></div><h4>♻️ تم الاسترجاع</h4><b>' + esc(res.name) + '</b><p>🧩 الشظايا المتبقية: ' + res.left + '/' + res.target + '</p><p>أُضيفت نسخة SSS جديدة لمجموعتك</p></div>'
        d.onclick = () => d.remove()
        document.body.appendChild(d)
        burst(d.firstChild, 44, 'o', '#ffc933')
        setTimeout(() => d.remove(), 3200)
    }

    window.__sx = { evolve: evolve, restore: restore, closeOv: closeOv }

    const st = $('stars')
    for (let i = 0; i < 30; i++) {
        const s = document.createElement('i')
        s.style.cssText = 'left:' + Math.random() * 100 + '%;top:' + Math.random() * 100 + '%;animation-delay:' + Math.random() * 6 + 's;animation-duration:' + (4 + Math.random() * 5) + 's'
        st.appendChild(s)
    }

    apply(INIT)
    render()
}

// state: ناتج shardOut() من characterSite.js
function shardPageHTML({ viewer, code, state, navDrawerHTML, NAV_BTN, titlesHead }) {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
${titlesHead || ''}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>الشظايا والتطوير</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Oswald:wght@500;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="stars" id="stars"></div>
${navDrawerHTML(code, viewer.csrf, 'shards', viewer.name)}
<div class="wrap">
<header>
  <div class="tbr">${NAV_BTN}<a class="back" href="/u/${esc(code)}">← رجوع للعرض</a></div>
  <div class="eye">SHARDS &amp; ASCENSION</div>
  <h1>مختبر الشظايا والتطوير</h1>
  <div class="stats"><span class="pill" id="money"></span><span class="pill" id="omg"></span></div>
  <div class="tabs" id="tabs"><span class="glider"></span><button class="on" data-t="1">🧩 شظاياي</button><button data-t="2">🌌 التطوير</button></div>
</header>
<main id="main"></main>
</div>
<div class="ov" id="ov"></div>
<script>(${clientMain.toString()})(${jsonForScript(state)}, ${jsonForScript(String(code))}, ${jsonForScript(String(viewer.csrf))})</script>
</body>
</html>`
}

module.exports = { shardPageHTML }
