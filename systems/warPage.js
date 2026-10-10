// =====================================================================
// systems/warPage.js
// ⚔️ صفحة حرب الأعلام  /u/<كود>/war — منقولة من المعاينة المعتمدة (نفس التصميم والأنميشن)
// البيانات حقيقية من systems/warSystem.js عبر /war/state (استطلاع كل ثانية)؛ الواجهة ما تحسب شيئاً بنفسها.
// =====================================================================

function jsonForScript(o) {
    return JSON.stringify(o)
        .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}
function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

const CSS = String.raw`
:root{--r:#ff3860;--b:#3da5ff;--g:#f0c04a;--bg:#0a0d16;--gold:#f0c04a;--gold-dim:#8a6d24;--text:#eef1f8;--text-dim:#8891a3;--ln:#1f2740;--mt:#8891a3;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
html{scroll-padding-top:env(safe-area-inset-top,0px)}*{box-sizing:border-box;margin:0;padding:0}
body{background:radial-gradient(800px 360px at 50% -10%,#f0c04a1c,transparent 60%),var(--bg);color:#eef1f8;font:600 14px Cairo,Tahoma,sans-serif;min-height:100vh;max-width:520px;margin:0 auto;padding:0 10px 30px;overflow-x:hidden}
.h{display:none!important}h1{text-align:center;font:900 20px Cairo;color:var(--g);padding:12px 0 2px}.sub{text-align:center;color:var(--mt);font-size:12px;margin-bottom:8px}
button{font:inherit;cursor:pointer;color:inherit}.btn{display:block;width:100%;border:0;border-radius:14px;padding:12px;font:900 16px Cairo;color:#0a0d16;background:linear-gradient(135deg,#f6d26b,#c8921e);box-shadow:0 0 20px #f0c04a50;margin-top:10px}.btn[disabled]{background:#222a40;color:#667;box-shadow:none}
.box{background:#0f1422;border:1px solid var(--ln);border-radius:16px;padding:12px;margin-top:8px}.cmd{direction:ltr;text-align:center;font:700 15px Oswald;color:var(--g);margin-top:8px}
#cs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}.cd{position:relative;border:2px solid var(--ln);border-radius:14px;overflow:hidden;background:#141b30;text-align:center;font-size:11px;padding-bottom:5px}
.cd .im{height:84px;background:center/cover}.cd b{display:block;font:700 13px Oswald}.cd.s1{border-color:var(--g)}.cd.s2{border-color:var(--b)}
.cd em{position:absolute;top:4px;right:4px;background:var(--g);color:#000;border-radius:8px;padding:0 6px;font-style:normal;font-size:10px}.cd.s2 em{background:var(--b)}
#sl{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}.sl{border:1px dashed var(--ln);border-radius:10px;padding:6px;text-align:center;font-size:12px;min-height:34px}.sl.r{border:1px solid var(--r);color:var(--r)}.sl.b{border:1px solid var(--b);color:var(--b)}
#hud{display:flex;align-items:center;gap:8px;margin:8px 0 6px}.sc{flex:1;text-align:center;font:900 22px Oswald;border-radius:12px;padding:2px;clip-path:polygon(6% 0,100% 0,94% 100%,0 100%)}.sc.r{color:var(--r);background:#ff386022}.sc.b{color:var(--b);background:#3da5ff22}
#mid{text-align:center}#tm{font:700 22px Oswald;direction:ltr;color:var(--g)}#pips{display:flex;gap:3px;justify-content:center}#pips i{width:18px;height:14px;border-radius:3px;background:#2a3350;font:700 9px/14px Oswald;font-style:normal;color:#000;transition:.4s}
#map{position:relative;height:390px;border:1px solid var(--ln);border-radius:18px;overflow:hidden;background:radial-gradient(circle at 50% 50%,#1d2a52,#0a0f20 75%)}
#map::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(60deg,#ffffff07 0 1px,transparent 1px 24px),repeating-linear-gradient(-60deg,#ffffff07 0 1px,transparent 1px 24px),linear-gradient(90deg,#ff386030,transparent 20%,transparent 80%,#3da5ff30)}
#map::after{content:"☠";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:150px;color:#ffffff06}
.sh{animation:sh .3s}@keyframes sh{25%{transform:translate(-5px,3px)}75%{transform:translate(5px,-3px)}}
.fl{position:absolute;width:62px;height:62px;margin:-31px 0 0 -31px;--c:#667;--p:0;z-index:2}
.rg{width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 22px Oswald;background:conic-gradient(var(--c) calc(var(--p)*1%),#232b44 0);transition:box-shadow .3s}
.rg::before{content:"";position:absolute;inset:6px;border-radius:50%;background:#0d1224}.rg b{position:relative;color:var(--c)}.fl.o .rg{box-shadow:0 0 26px var(--c)}
.pole{position:absolute;left:50%;bottom:50%;width:3px;height:40px;background:#cfd6e6;margin-left:-1px}.pole i{position:absolute;left:3px;top:0;width:26px;height:17px;background:var(--c);clip-path:polygon(0 0,100% 14%,78% 50%,100% 86%,0 100%);transform-origin:left;animation:wv .9s ease-in-out infinite alternate}@keyframes wv{to{transform:skewY(9deg) scaleX(.85)}}
.fl.pl .rg{animation:pu .7s}@keyframes pu{50%{transform:scale(1.45);box-shadow:0 0 60px var(--c)}}
.tk{position:absolute;width:42px;height:42px;margin:-21px 0 0 -21px;border-radius:50%;background:#222 center/cover;border:3px solid var(--c);transition:left .8s,top .8s;z-index:4;animation:bob 1.2s ease-in-out infinite alternate}
.tk.run{transition:none;animation:rn .25s ease-in-out infinite alternate}@keyframes bob{to{transform:translateY(-3px)}}@keyframes rn{to{transform:translateY(-6px) rotate(8deg)}}
.tk::after{content:"";position:absolute;left:5px;right:5px;bottom:-9px;height:7px;border-radius:50%;background:#0008;z-index:-1}
.tk.me{box-shadow:0 0 0 2px var(--g),0 0 14px var(--g)}.tk.dead{filter:grayscale(1) brightness(.45)}.tk.hit{filter:brightness(2.6)}
.tk .hp{position:absolute;bottom:-9px;left:0;right:0;height:5px;background:#000;border-radius:3px;overflow:hidden}.tk .hp i{display:block;height:100%;background:#3dff9a;transition:width .3s}
.tk small{position:absolute;top:-15px;left:50%;transform:translateX(-50%);font:700 9px Oswald;white-space:nowrap;color:#e6ebf8;text-shadow:0 0 3px #000}.tk.sw{animation:pu .5s}
.dl{position:absolute;z-index:7;transform:translate(-50%,-100%);margin-top:-44px;display:flex;align-items:center;gap:5px;background:#000d;border:1px solid var(--g);border-radius:12px;padding:3px 7px;font:700 9px Oswald;box-shadow:0 0 14px #f0c04a60}
.dl>div{width:46px}.dl .hb{height:5px;background:#000;border-radius:3px;overflow:hidden;margin-top:2px}.dl .hb i{display:block;height:100%}.dl b{color:var(--g);font-size:13px}
.pn{position:absolute;font:900 17px Oswald;z-index:9;animation:up 1s forwards;pointer-events:none;text-shadow:0 0 6px #000;color:#fff}.pn.c{font-size:27px;color:var(--g)}.pn.m{color:#9fd;font-size:13px}@keyframes up{to{transform:translateY(-50px);opacity:0}}
.pt{position:absolute;width:6px;height:6px;border-radius:50%;z-index:8;animation:bp .9s ease-out forwards}@keyframes bp{to{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}}
.fx{position:absolute;z-index:8;font-size:34px;transform:translate(-50%,-50%);animation:fx .45s forwards;pointer-events:none}@keyframes fx{from{transform:translate(-50%,-50%) scale(.3) rotate(-30deg)}60%{transform:translate(-50%,-50%) scale(1.4) rotate(10deg)}to{opacity:0}}
#bn{position:absolute;left:0;right:0;top:40%;z-index:12;text-align:center;font:900 26px Oswald;letter-spacing:.12em;background:linear-gradient(90deg,transparent,var(--c,#f0c04a),transparent);padding:6px;opacity:0;text-shadow:0 2px 8px #000;pointer-events:none}
#bn.go{animation:bn 2.2s}@keyframes bn{0%{opacity:0;transform:translateX(100%) skewX(-14deg)}12%,80%{opacity:1;transform:none}100%{opacity:0;transform:translateX(-100%) skewX(-14deg)}}
#vg{position:absolute;inset:0;z-index:11;pointer-events:none;box-shadow:inset 0 0 70px #ff3860;opacity:0}#vg.on{animation:vg .4s}@keyframes vg{30%{opacity:.8}}
#feed{position:absolute;top:6px;left:6px;right:6px;z-index:10;display:flex;flex-direction:column;gap:3px;pointer-events:none}#feed div{align-self:center;background:#000b;border:1px solid var(--ln);border-radius:10px;padding:2px 10px;font-size:11px;animation:fd 4s forwards}@keyframes fd{80%{opacity:1}to{opacity:0}}
#fb{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:10px 0 6px}#fb button{background:#0f1422;border:2px solid var(--c,#334);color:var(--c,#aab);border-radius:12px;padding:8px 0;font:900 15px Oswald}#fb button.on{background:var(--c,#334);color:#000}#fb button[disabled]{opacity:.45}
#me{display:flex;gap:8px;font-size:12px;color:var(--mt)}#me>div{flex:1}#st{color:var(--g);font-weight:900}.bar{height:6px;background:#000;border-radius:3px;overflow:hidden;margin-top:3px}.bar i{display:block;height:100%;background:#3dff9a}
#lg{height:84px;overflow:auto;font-size:11px;color:#b8c1d8;line-height:1.5;white-space:pre-line;margin-top:6px}
#in{position:fixed;inset:0;z-index:60;background:radial-gradient(circle,#1d2a52,#04060c);display:flex;align-items:center;overflow:hidden}.col{flex:1;display:flex;flex-direction:column;gap:10px;padding:14px}
.ip{height:78px;border-radius:12px;background:center/cover;border:2px solid var(--c);position:relative;box-shadow:0 0 18px var(--c)}.ip small{position:absolute;bottom:0;left:0;right:0;background:#000b;font:700 11px Oswald;text-align:center}
.col.r .ip{animation:sl .7s both}.col.b .ip{animation:sr .7s both}@keyframes sl{from{transform:translateX(-130%)}}@keyframes sr{from{transform:translateX(130%)}}
#vs{font:900 48px Oswald;color:var(--g);text-shadow:0 0 30px var(--g);animation:vs .8s infinite alternate}@keyframes vs{to{transform:scale(1.25)}}
#cd{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 110px Oswald;color:#fff;text-shadow:0 0 40px var(--g);background:#000a}#cd.z{animation:zm .8s}@keyframes zm{from{transform:scale(3);opacity:0}30%{opacity:1}}
#end{position:fixed;inset:0;z-index:70;background:#000d;display:flex;align-items:center;justify-content:center;padding:14px;animation:fi .4s}@keyframes fi{from{opacity:0}}
#end .box{width:100%;max-width:440px;text-align:center;border-color:var(--g);animation:zi .6s cubic-bezier(.2,1.4,.3,1);position:relative;overflow:hidden}@keyframes zi{from{transform:scale(.5)}}
#end h2{font:900 40px Oswald;letter-spacing:.1em;background:linear-gradient(#fff,var(--c));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 14px var(--c))}
#end .box::before{content:"";position:absolute;left:50%;top:-80px;width:600px;height:600px;margin-left:-300px;background:repeating-conic-gradient(var(--c) 0 6deg,transparent 6deg 18deg);opacity:.12;animation:rt 20s linear infinite}@keyframes rt{to{transform:rotate(360deg)}}
#end .box>*{position:relative}.rw{font:700 18px Oswald;color:var(--g);margin:6px 0}.row{display:flex;justify-content:space-between;font-size:12px;padding:3px 6px;border-bottom:1px solid var(--ln)}
.tm{font:900 14px Cairo;color:var(--c);margin-top:12px;text-align:right}
.hd,.pr{display:grid;grid-template-columns:44px 1fr 40px 40px 40px;gap:5px;align-items:center}.hd{font-size:11px;color:var(--mt);text-align:center;margin-top:2px}
.pr{background:#0d1224;border:1px solid var(--ln);border-right:3px solid var(--c);border-radius:14px;padding:5px 8px;margin-top:5px;text-align:right}.pr.mv{border-color:var(--g);box-shadow:0 0 16px #f0c04a55}
.pr .av{position:relative;width:40px;height:40px;border-radius:50%;background:#222 center/cover;border:2px solid var(--c)}.av i{position:absolute;top:-11px;right:-5px;font-style:normal;font-size:16px}
.pr .nm b{display:block;font:700 13px Oswald;direction:ltr;text-align:right}.pr .nm small{font-size:10px;color:var(--mt)}
.pr>span{font:700 16px Oswald;text-align:center;border-radius:9px;padding:3px 0;background:#ffffff0c}.pr .k{color:#ff7b8f}.pr .d{color:#9aa4bd}.pr .f{color:var(--g)}

.tbr{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:8px}.tbr .back{font:800 13px Cairo,sans-serif;color:var(--g);text-decoration:none;border:1px solid #8a6d24;border-radius:20px;padding:6px 14px;background:#0f1422}
#vst{position:absolute;bottom:calc(30px + env(safe-area-inset-bottom,0px));left:0;right:0;text-align:center;font:700 14px Cairo;color:var(--mt)}
.toast{position:fixed;bottom:calc(24px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);background:#2a1218;border:1px solid #ff6b6b;color:#ffb3b3;padding:10px 18px;border-radius:14px;z-index:200;font-size:14px;max-width:92%;text-align:center;white-space:pre-line}
`

function warClient(CODE, CSRF) {
    const FL = ['A', 'B', 'C', 'D', 'E']
    const POS = { A: [20, 22], B: [80, 22], C: [50, 50], D: [20, 78], E: [80, 78] }
    const CO = { red: '#ff3860', blue: '#3da5ff' }
    const $ = id => document.getElementById(id)
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    const f0 = n => Number(n).toLocaleString('en-US')
    let S = null, last = 0, recv = 0, built = 0, endFor = 0, introFor = 0, lobSig = '', loading = 0, busy = 0
    let sel = [], chs = [], more = true, chBusy = 0
    const tok = {}, fle = {}
    const bg = c => (c && c.img ? "url('" + esc(c.img) + "')" : 'none')

    // ───── مؤثرات (نفس المعاينة) ─────
    function say(t) { const l = $('lg'); if (!l) return; l.textContent += (l.textContent ? '\n' : '') + t; l.scrollTop = 1e9 }
    function feed(t) { const d = document.createElement('div'); d.textContent = t; $('feed').appendChild(d); setTimeout(() => d.remove(), 4000) }
    function add(c, css, t, ms) { const d = document.createElement('div'); d.className = c; d.style.cssText = css; if (t) d.textContent = t; $('map').appendChild(d); setTimeout(() => d.remove(), ms || 1000); return d }
    function pop(f, t, c) { add('pn ' + (c || ''), 'left:calc(' + POS[f][0] + '% + ' + (Math.random() * 50 - 25) + 'px);top:calc(' + POS[f][1] + '% - 30px)', t) }
    function burst(f, c, n) { for (let i = 0; i < n; i++) add('pt', 'left:' + POS[f][0] + '%;top:' + POS[f][1] + '%;background:' + c + ';--dx:' + (Math.random() * 140 - 70) + 'px;--dy:' + (Math.random() * 140 - 70) + 'px', '', 900) }
    function shake(r) { const m = $('map'); m.classList.remove('sh'); void m.offsetWidth; m.classList.add('sh'); if (r) { const v = $('vg'); v.classList.remove('on'); void v.offsetWidth; v.classList.add('on') } }
    function ban(t, c) { const b = $('bn'); b.textContent = t; b.style.setProperty('--c', c || '#f0c04a'); b.classList.remove('go'); void b.offsetWidth; b.classList.add('go') }
    function toast(m) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = m; document.body.appendChild(d); setTimeout(() => d.remove(), 3200) }

    // ───── الاتصال ─────
    async function get(u) {
        const r = await fetch(u, { credentials: 'same-origin', cache: 'no-store' })
        if (r.status === 401) { location.href = '/login?code=' + CODE; return null }
        return r.json()
    }
    async function post(u, b) {
        try {
            const r = await fetch(u, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ csrf: CSRF }, b)) })
            if (r.status === 401) { location.href = '/login?code=' + CODE; return { ok: false } }
            return await r.json()
        } catch (e) { return { ok: false, message: '❌ تعذّر الاتصال بالخادم' } }
    }
    async function act(u, b) {
        if (busy) return
        busy = 1
        const r = await post(u, b)
        busy = 0
        if (!r.ok && r.message) toast(r.message)
        refresh()
        return r
    }
    async function refresh() {
        if (loading) return
        loading = 1
        try {
            const j = await get('/war/state?since=' + last)
            if (j && j.ok) {
                const first = !S
                S = j; recv = Date.now()
                if (!first) events(j.events || [])
                last = Math.max(last, j.eid || 0)
                sync()
            }
        } catch (e) { /* يعيد المحاولة بالدورة التالية */ }
        loading = 0
    }

    // ───── الأحداث ─────
    function events(L) {
        L.forEach(e => {
            if (e.id <= last) return
            const P = S.players || [], nm = i => (P[i] ? P[i].u : '?')
            if (e.k === 'say') { if (e.w == null || (Array.isArray(e.w) ? e.w.indexOf(S.me) > -1 : e.w === S.me)) say(e.t) }
            else if (e.k === 'dmg') {
                if (e.m) pop(e.f, 'مراوغة', 'm')
                else {
                    pop(e.f, (e.c ? 'CRITICAL ' : '') + f0(e.d), e.c ? 'c' : '')
                    add('fx', 'left:' + POS[e.f][0] + '%;top:' + POS[e.f][1] + '%', e.c ? '💥' : '⚔️', 450)
                    if (e.c) shake(1)
                    const t = tok[e.y]; if (t) { t.classList.add('hit'); setTimeout(() => t.classList.remove('hit'), 150) }
                }
            }
            else if (e.k === 'cap') {
                const c = CO[e.team]
                ban('FLAG ' + e.f + ' CAPTURED', c); burst(e.f, c, 26); feed((e.team === 'red' ? '🔴' : '🔵') + ' احتل العلم ' + e.f)
                const el = fle[e.f]; if (el) { el.classList.remove('pl'); void el.offsetWidth; el.classList.add('pl') }
            }
            else if (e.k === 'neu') feed('⚪ العلم ' + e.f + ' أصبح محايداً')
            else if (e.k === 'kill') {
                feed('☠️ ' + nm(e.a) + ' أسقط ' + nm(e.d)); burst(e.f, CO[(P[e.d] || {}).team] || '#fff', 30); shake(1)
                if (e.fb) ban('FIRST BLOOD', '#ff3860')
            }
            else if (e.k === 'swap') { feed('🌀 دخل الاحتياطي: ' + nm(e.p)); const t = tok[e.p]; if (t) { t.classList.remove('sw'); void t.offsetWidth; t.classList.add('sw') } }
            else if (e.k === 'ban') ban(e.t, e.c)
            else if (e.k === 'go') burst(e.f, CO[(P[e.p] || {}).team] || '#fff', 8)
        })
    }

    // ───── اللوبي (.حرب ثم .انضم 1 2) ─────
    function lobby() {
        const p = S.players || [], ph = S.phase
        const sig = ph + '|' + S.me + '|' + (S.creator ? 1 : 0) + '|' + p.map(x => x.u + x.team).join(',')
        if (sig === lobSig) return
        lobSig = sig
        const b = $('lb')
        if (ph === 'none') {
            b.innerHTML = '<div>⚔️ لا توجد حرب حالياً</div><div class="sub">أنشئ حرباً وانتظر انضمام اللاعبين (' + S.max + ' لاعبين، 3 ضد 3)</div><button class="btn" id="mk">⚔️ إنشاء حرب جديدة (.حرب)</button>'
            $('mk').onclick = () => act('/war/create', {})
            $('pk').classList.add('h'); return
        }
        b.innerHTML = '⚔️ لوبي الحرب<br>👥 اللاعبين: <b>' + p.length + '</b>/' + S.max + '<div id="sl">' + p.map(x => '<div class="sl ' + (x.team === 'red' ? 'r' : 'b') + '">' + (x.team === 'red' ? '🔴' : '🔵') + ' ' + esc(x.u) + '</div>').join('') + '</div>' +
            (S.creator ? '<button class="btn" id="cn" style="background:#2a3350;color:#fff;box-shadow:none">إلغاء الحرب</button>' : '') +
            (S.me > -1 ? '<div class="sub" style="margin-top:8px">✅ أنت منضم — بانتظار اكتمال اللاعبين</div>' : '')
        if (S.creator) $('cn').onclick = () => act('/war/cancel', {})
        if (S.me < 0) { $('pk').classList.remove('h'); if (!chs.length) loadChars(); else picker() } else $('pk').classList.add('h')
    }
    async function loadChars() {
        if (chBusy || !more) return
        chBusy = 1
        const j = await get('/war/chars?o=' + chs.length)
        chBusy = 0
        if (j && j.ok) { chs = chs.concat(j.chars); more = !!j.more; picker() }
    }
    function picker() {
        $('cs').innerHTML = chs.map(c => { const k = sel.indexOf(c.no); return '<div class="cd ' + (k > -1 ? 's' + (k + 1) : '') + '" data-n="' + c.no + '"><div class="im" style="background-image:' + bg(c) + '"></div>' + (k > -1 ? '<em>' + (k ? '🌀' : '🔥') + '</em>' : '') + '<b>' + esc(c.n) + '</b>⚔️ ' + f0(c.p) + ' · #' + c.no + '</div>' }).join('')
        $('cm').textContent = '.انضم ' + sel.join(' ')
        $('jn').disabled = sel.length < 2
        $('mr').style.display = more ? 'block' : 'none'
    }
    $('cs').onclick = e => { const c = e.target.closest('.cd'); if (!c) return; const n = +c.dataset.n, k = sel.indexOf(n); if (k > -1) sel.splice(k, 1); else { if (sel.length >= 2) sel.shift(); sel.push(n) } picker() }
    $('mr').onclick = loadChars
    $('jn').onclick = async () => { const r = await act('/war/join', { a: sel[0], b: sel[1] }); if (r && r.ok) { sel = []; lobSig = '' } }

    // ───── الساحة ─────
    function build() {
        built = S.id; Object.keys(tok).forEach(k => delete tok[k])
        const m = $('map'); m.innerHTML = '<div id="dls"></div><div id="feed"></div><div id="bn"></div><div id="vg"></div>'
        FL.forEach(f => { const e = document.createElement('div'); e.className = 'fl'; e.style.left = POS[f][0] + '%'; e.style.top = POS[f][1] + '%'; e.innerHTML = '<div class="rg"><b>' + f + '</b></div><div class="pole"><i></i></div>'; m.appendChild(e); fle[f] = e })
        S.players.forEach(p => { const e = document.createElement('div'); e.className = 'tk'; e.style.setProperty('--c', CO[p.team]); e.innerHTML = '<small></small><div class="hp"><i></i></div>'; m.appendChild(e); tok[p.i] = e })
        $('fb').innerHTML = FL.map(f => '<button data-f="' + f + '">.اذهب ' + f + '</button>').join('')
        $('fb').onclick = e => { const b = e.target.closest('[data-f]'); if (b && !b.disabled) act('/war/go', { flag: b.dataset.f }) }
        $('lg').textContent = ''
    }
    function sync() {
        const ph = S.phase
        if (ph === 'none' || ph === 'lobby') {
            $('war').classList.add('h'); $('lob').classList.remove('h'); $('in').classList.add('h'); $('end').classList.add('h')
            built = 0; endFor = 0; introFor = 0; lobby(); return
        }
        if (built !== S.id) { build(); lobSig = '' }
        $('lob').classList.add('h'); $('war').classList.remove('h')
        if (ph === 'countdown') { if (introFor !== S.id) intro(); $('in').classList.remove('h') } else $('in').classList.add('h')
        if (ph === 'ended' && endFor !== S.id) { endFor = S.id; results() }
        if (ph !== 'ended') $('end').classList.add('h')
        draw()
    }
    function intro() {
        introFor = S.id
        const col = t => '<div class="col ' + t[0] + '">' + S.players.filter(p => p.team === t).map((p, i) => '<div class="ip" style="--c:' + CO[t] + ';animation-delay:' + i * 0.15 + 's;background-image:' + bg(p.main) + '"><small>' + esc(p.u) + ' · ' + esc(p.main.n) + '</small></div>').join('') + '</div>'
        $('in').innerHTML = col('red') + '<div id="vs">VS</div>' + col('blue') + '<div id="cd" class="h"></div><div id="vst"></div>'
    }
    const bpos = p => [p.team === 'red' ? 8 : 92, 30 + S.players.filter(q => q.team === p.team && q.i < p.i).length * 20]
    function draw() {
        if (!S || !built || S.phase === 'none' || S.phase === 'lobby') return
        const dt = Date.now() - recv, war = S.phase === 'war', P = S.players
        if (S.phase === 'countdown') {
            const n = Math.ceil(Math.max(0, S.cdLeft - dt) / 1000), c = $('cd'), v = $('vst')
            if (v) v.textContent = 'تبدأ الحرب بعد ' + n + ' ثوانٍ'
            if (c && n <= 3 && n > 0) { if (c.textContent !== String(n)) { c.textContent = n; c.classList.remove('h', 'z'); void c.offsetWidth; c.classList.add('z') } } else if (c) c.classList.add('h')
        }
        const t = Math.max(0, (war ? S.left - dt : S.left)) / 1000 | 0
        let rf = 0, bf = 0
        FL.forEach(f => { const d = S.flags[f], c = d.ct || d.owner, e = fle[f]; if (d.owner === 'red') rf++; if (d.owner === 'blue') bf++; e.style.setProperty('--c', c ? CO[c] : '#667'); e.style.setProperty('--p', d.pr); e.classList.toggle('o', !!d.owner) })
        $('tm').textContent = (t / 60 | 0) + ':' + ('0' + t % 60).slice(-2)
        $('sr').textContent = '🔴 ' + rf; $('sb').textContent = bf + ' 🔵'
        $('pips').innerHTML = FL.map(f => { const o = S.flags[f].owner; return '<i style="background:' + (o ? CO[o] : '#2a3350') + '">' + f + '</i>' }).join('')
        let dh = ''
        S.fights.forEach(F => { const a = P[F.a], b = P[F.b]; if (!a || !b) return; const bar = (p, c) => '<div><span style="color:' + c + '">' + esc(p.cur.n) + '</span><div class="hb"><i style="width:' + p.hp / p.cur.p * 100 + '%;background:' + c + '"></i></div></div>'; dh += '<div class="dl" style="left:' + POS[F.f][0] + '%;top:' + POS[F.f][1] + '%">' + bar(a, CO.red) + '<b>VS</b>' + bar(b, CO.blue) + '</div>' })
        $('dls').innerHTML = dh
        const cnt = {}
        P.forEach(p => {
            const el = tok[p.i]; if (!el) return
            let x, y
            if (p.flag) { const q = p.flag + p.team; cnt[q] = (cnt[q] || 0) + 1; x = 'calc(' + POS[p.flag][0] + '% + ' + (p.team === 'red' ? -36 : 36) + 'px)'; y = 'calc(' + POS[p.flag][1] + '% + ' + ((cnt[q] - 1) * 30 - 8) + 'px)' }
            else { const b = bpos(p); x = b[0] + '%'; y = b[1] + '%' }
            const cd = Math.max(0, p.cd - (war ? dt : 0)), rs = Math.max(0, p.rs - (war ? dt : 0))
            el.style.left = x; el.style.top = y; el.style.backgroundImage = bg(p.cur); el.classList.toggle('me', p.i === S.me); el.classList.toggle('dead', !p.alive)
            el.querySelector('.hp i').style.width = (p.hp / p.cur.p * 100) + '%'
            el.querySelector('small').textContent = rs ? '⏳ ' + Math.ceil(rs / 1000) : (p.i === S.me && cd ? '⏱ ' + Math.ceil(cd / 1000) : p.u)
        })
        const m = S.me > -1 ? P[S.me] : null
        const cd = m ? Math.max(0, m.cd - (war ? dt : 0)) : 0, busyMe = !m || !war || cd > 0 || m.fg || !m.alive
        ;[].forEach.call($('fb').children, b => { const f = b.dataset.f, o = S.flags[f].owner; b.style.setProperty('--c', o ? CO[o] : '#667'); b.classList.toggle('on', !!m && m.flag === f); b.disabled = !!busyMe || (m && m.flag === f); b.textContent = cd ? '⏱ ' + Math.ceil(cd / 1000) : '.اذهب ' + f })
        if (!m) { $('me').innerHTML = '<div>👁 مشاهدة فقط — لست ضمن هذي الحرب</div>'; return }
        const st = !m.alive ? '⏳ ميت — Respawn' : m.fg ? '⚔️ في اشتباك على ' + m.flag : m.flag ? '📍 على العلم ' + m.flag + (cd ? ' · ⏱ التحرك بعد ' + Math.ceil(cd / 1000) + 'ث' : '') : '🏠 في القاعدة'
        $('me').innerHTML = '<div>🔥 ' + esc(m.cur.n) + (m.us ? ' (احتياطي)' : '') + '<div class="bar"><i style="width:' + m.hp / m.cur.p * 100 + '%"></i></div><div id="st">' + st + '</div><div class="bar"><i style="background:#f0c04a;width:' + (cd / 30000 * 100) + '%"></i></div></div><div>🌀 ' + (m.us ? '—' : esc(m.sec.n)) + '<br>☠️ ' + m.kills + ' · 🏴 ' + m.captures + ' · 💀 ' + m.deaths + '</div>'
    }
    function results() {
        const r = S.result, P = S.players, w = r.winner, m = S.me > -1 ? P[S.me] : null
        const sc = p => p.kills * 2 + p.captures * 5 - p.deaths, mv = P[r.mvp]
        const won = !!m && w === m.team
        const rows = ['red', 'blue'].map(t => '<div class="tm" style="--c:' + CO[t] + '">' + (t === 'red' ? '🔴 الفريق الأحمر' : '🔵 الفريق الأزرق') + '</div><div class="hd"><span></span><span></span><span>☠️ قتلات</span><span>💀 وفيات</span><span>🏴 أعلام</span></div>' +
            P.filter(p => p.team === t).sort((a, b) => sc(b) - sc(a)).map(p => '<div class="pr' + (p === mv ? ' mv' : '') + '" style="--c:' + CO[t] + '"><div class="av" style="background-image:' + bg(p.main) + '">' + (p === mv ? '<i>👑</i>' : '') + '</div><div class="nm"><b>' + esc(p.u) + '</b><small>' + esc(p.main.n) + '</small></div><span class="k">' + p.kills + '</span><span class="d">' + p.deaths + '</span><span class="f">' + p.captures + '</span></div>').join('')).join('')
        const rw = m ? (won ? r.reward.win : r.reward.lose) : null
        $('end').classList.remove('h')
        $('end').innerHTML = '<div class="box" style="--c:' + (won ? '#f0c04a' : w === 'tie' ? '#8891a3' : '#ff3860') + '"><h2>' + (!m ? 'FINISHED' : w === 'tie' ? 'DRAW' : won ? 'VICTORY' : 'DEFEAT') + '</h2><div>🏁 ' + (w === 'tie' ? 'تعادل بعدد الأعلام' : (w === 'red' ? '🔴 الأحمر' : '🔵 الأزرق') + ' يسيطر على أكبر عدد أعلام') + '</div><div class="rw">🔴 ' + r.rf + ' — ' + r.bf + ' 🔵</div><div id="pips">' + FL.map(f => { const o = S.flags[f].owner; return '<i style="background:' + (o ? CO[o] : '#2a3350') + '">' + f + '</i>' }).join('') + '</div>' +
            (mv ? '<div style="margin-top:8px">👑 MVP: ' + esc(mv.u) + ' (' + esc(mv.main.n) + ')</div>' : '') + (rw ? '<div class="rw">💰 +' + f0(rw.money) + ' · ✨ +' + f0(rw.xp) + ' XP</div>' : '') + rows +
            '<button class="btn" id="nw">⚔️ حرب جديدة</button><button class="btn" id="cl" style="background:#2a3350;color:#fff;box-shadow:none">إغلاق</button></div>'
        $('nw').onclick = async () => { $('end').classList.add('h'); await act('/war/create', {}) }
        $('cl').onclick = () => $('end').classList.add('h')
    }

    refresh()
    setInterval(refresh, 1000)
    setInterval(draw, 200)
}

function warPageHTML({ code, viewer, navDrawerHTML, NAV_BTN, titlesHead }) {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
${titlesHead || ''}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>حرب الأعلام</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;900&family=Oswald:wght@500;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
${navDrawerHTML(code, viewer.csrf, 'war', viewer.name)}
<div class="tbr">${NAV_BTN}<a class="back" href="/u/${esc(code)}">← رجوع</a></div>
<h1>⚔️ حرب الأعلام</h1><div class="sub">الفوز لمن يملك أعلاماً أكثر عند النهاية · استحواذ 15ث · إلغاء استحواذ الخصم 15ث ثم 15ث لتملكه · انتظار 30ث بين كل تحرك</div>
<section id="lob"><div class="box" id="lb">…</div>
<div class="box h" id="pk">اختر شخصيتين: الأولى 🔥 أساسية والثانية 🌀 احتياطية<div id="cs"></div><button class="btn" id="mr" style="display:none;background:#2a3350;color:#fff;box-shadow:none">عرض المزيد</button><div class="cmd" id="cm">.انضم</div><button class="btn" id="jn" disabled>انضم للحرب</button></div></section>
<section id="war" class="h"><div id="hud"><div class="sc r" id="sr">0</div><div id="mid"><div id="tm">5:00</div><div id="pips"></div></div><div class="sc b" id="sb">0</div></div>
<div id="map"></div>
<div id="fb"></div><div class="box" id="me"></div><div id="lg" class="box"></div></section>
<div id="in" class="h"></div><div id="end" class="h"></div>
<script>(${warClient.toString()})(${jsonForScript(String(code))}, ${jsonForScript(String(viewer.csrf))})</script>
</body>
</html>`
}

module.exports = { warPageHTML }
