// =====================================================================
// systems/siteChallengeUI.js
// واجهات التحدي: (1) نافذة الدعوة الحيّة فوق أي صفحة (2) صفحة التحدي: بحث + المتصلون
// (3) ساحة القتال (3D) — القتال الحقيقي يُدار بالسيرفر وتصل الحركات لحظياً
// =====================================================================

'use strict'

const { ARENA_CSS, INVITE_CSS } = require('./siteChallengeCss')
const TITLES = require('./titleSystem') // 🏅 الألقاب (CSS/JS مشترك)

function jsonForScript(o) {
    return JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

// تعديلات فوق CSS المثال الحيّ عشان يشتغل داخل الصفحة الحقيقية (Shadow DOM)
const SHADOW_EXTRA = `
:host{padding:0!important;font-family:'Cairo',system-ui,sans-serif;color:var(--tx);direction:rtl}
.root{position:absolute;inset:0;pointer-events:none;font-family:'Cairo',system-ui,sans-serif;color:var(--tx)}
.root>*{pointer-events:auto}
.inv{position:fixed;z-index:20}
.vsx{position:fixed;inset:0;z-index:30;background:#0a0d16}
.vsx .vs{position:absolute;inset:0}
.tz{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));z-index:40}
.lobby{max-width:520px;margin:0 auto;padding:0 0 30px}
.lobby .lay{position:static;display:block}
.lobby .mid{min-height:300px}
.lobby .list{overflow:visible;padding:0}
.lobby .sb{padding:0 0 10px}
.sec{margin:6px 2px 8px;font-weight:900;font-size:13px;color:var(--mut)}
.cdr .p{animation-duration:30s}
.ic{max-width:360px}
.go{text-align:center;cursor:pointer}
`

// ───────────── نافذة الدعوة (تُحقن بكل صفحات اللاعب) ─────────────
function overlayClient(CSS) {
    if (window.__CH_ON) return
    window.__CH_ON = 1

    var st = document.createElement('style')
    st.textContent = '@property --a{syntax:"<angle>";initial-value:0deg;inherits:false}'
    document.head.appendChild(st)

    var host = document.createElement('div')
    host.id = 'ch-host'
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none'
    document.documentElement.appendChild(host)
    var sh = host.attachShadow({ mode: 'open' })
    sh.innerHTML = '<style>' + CSS + '</style><div class="root" id="root"></div>'
    var root = sh.getElementById('root')

    var CH = window.__CH = { csrf: '', code: '', pid: '', hello: null }
    var cur = null, tmr = 0

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
    function fm(n) { return Number(n || 0).toLocaleString('en-US') }
    function safeImg(u) { return typeof u === 'string' && /^(https:\/\/|\/custom_images\/|\/characters\/|data:image\/)/.test(u) && !/['"()\s\\]/.test(u) ? u : '' }
    function av(p, s) {
        var im = safeImg(p && p.img)
        return '<div class="av" style="--h:' + (p && p.h || 0) + ';width:' + s + 'px;height:' + s + 'px;font-size:' + (s * .45) + 'px">' +
            (im ? '<img src="' + im + '" alt="">' : esc(((p && (p.n || p.u)) || '?').charAt(0))) + '</div>'
    }
    CH.av = av; CH.esc = esc; CH.fm = fm; CH.safeImg = safeImg

    function beep() {
        try {
            var c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain()
            o.connect(g); g.connect(c.destination); o.type = 'triangle'
            o.frequency.setValueAtTime(660, c.currentTime); o.frequency.setValueAtTime(880, c.currentTime + .12)
            g.gain.setValueAtTime(.12, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .4)
            o.start(); o.stop(c.currentTime + .4)
        } catch (e) { }
        try { navigator.vibrate && navigator.vibrate([80, 60, 80]) } catch (e) { }
    }

    function toast(t) {
        var d = document.createElement('div'); d.className = 'tz'; d.textContent = t
        d.style.left = '50%'; d.style.transform = 'translateX(-50%)'
        root.appendChild(d); setTimeout(function () { d.remove() }, 3200)
    }
    CH.toast = toast

    CH.post = function (url, body) {
        body = body || {}; body.csrf = CH.csrf
        return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            .then(function (r) { return r.json().catch(function () { return { ok: false, message: 'خطأ بالاتصال' } }) })
            .catch(function () { return { ok: false, message: 'تعذّر الاتصال بالخادم' } })
    }
    CH.get = function (url) {
        return fetch(url, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json() }).catch(function () { return { ok: false } })
    }

    function ring(id, left) {
        return '<div class="cdr"><svg viewBox="0 0 56 56"><circle class="t" cx="28" cy="28" r="22"/><circle class="p" cx="28" cy="28" r="22" style="animation-delay:-' + (30000 - left) + 'ms"/></svg><b id="' + id + '">' + Math.ceil(left / 1000) + '</b></div>'
    }
    CH.ring = ring

    function hideInv() { clearInterval(tmr); tmr = 0; cur = null; var e = root.querySelector('.inv'); if (e) e.remove() }

    function showInvite(d, silent) {
        hideInv()
        cur = { id: d.id, end: Date.now() + d.left }
        var f = d.from || d.other || {}
        var el = document.createElement('div'); el.className = 'inv'
        el.innerHTML = '<div class="ic"><div style="display:grid;place-items:center">' + av(f, 64) + '</div><h3>⚔️ تحدي جديد!</h3>' +
            '<p>دعاك <b>@' + esc(f.u || f.n) + '</b> لقتال PvP</p>' + (f.t && window.TB ? '<div style="text-align:center">' + TB(f.t) + '</div>' : '') +
            '<div class="pwr"><span>قوتك ' + fm(d.pw && d.pw.me) + '</span><i>VS</i><span>قوته ' + fm(d.pw && d.pw.foe) + '</span></div>' +
            ring('chc', d.left) +
            '<div class="bt"><button class="ok" data-a="ok" type="button">✅ موافق</button><button class="no" data-a="no" type="button">❌ رفض</button></div></div>'
        root.appendChild(el)
        if (!silent) beep()
        tmr = setInterval(function () {
            var s = Math.max(0, Math.ceil((cur.end - Date.now()) / 1000)), b = sh.getElementById('chc')
            if (b) b.textContent = s
            if (s <= 0) { hideInv(); toast('⌛ انتهى وقت الدعوة') }
        }, 250)
        el.addEventListener('click', function (e) {
            var t = e.target.closest && e.target.closest('[data-a]'); if (!t || !cur) return
            var accept = t.getAttribute('data-a') === 'ok', id = cur.id
            el.querySelectorAll('button').forEach(function (b) { b.disabled = true })
            CH.post('/challenge/respond', { id: id, accept: accept }).then(function (r) {
                hideInv()
                if (!r.ok && r.message) toast(r.message)
            })
        })
    }

    function splash(L, R, n) {
        function side(p) { var im = safeImg(p && p.img); return 'background-image:' + (im ? 'url(' + im + ')' : 'none') + ';background-color:hsl(' + (p && p.h || 0) + ' 50% 28%)' }
        return '<div class="vs"><div class="l" style="' + side(L) + '"></div><div class="r" style="' + side(R) + '"></div><b class="vv">VS</b>' +
            '<div class="vb"><p>⚔️ بدأ القتال</p><div class="ld"><i></i></div><p id="chgo" style="color:var(--mut);font-size:12px">جارٍ نقلك للساحة…</p></div></div>'
    }

    function showStart(d) {
        hideInv()
        var old = root.querySelector('.vsx'); if (old) old.remove()
        var el = document.createElement('div'); el.className = 'vsx'
        el.innerHTML = splash(d.me, d.foe)
        root.appendChild(el)
        var arena = typeof d.arena === 'string' && /^\/u\/[a-f0-9]{10}\/arena$/.test(d.arena) ? d.arena : null
        setTimeout(function () {
            var g = sh.getElementById('chgo')
            if (g && arena) g.outerHTML = '<a class="go" style="padding:8px 16px;font-size:13px" href="' + arena + '">🏟️ افتح ساحة القتال</a>'
        }, 3300)
        setTimeout(function () { if (arena && location.pathname !== arena) location.href = arena }, 4300)
    }

    function who(p) { return '@' + ((p && (p.u || p.n)) || 'لاعب') }

    function onEvent(type, d) {
        if (type === 'hello') {
            CH.csrf = d.csrf; CH.pid = d.pid; CH.code = d.code; CH.hello = d
            if (d.inv && d.inv.dir === 'in' && d.inv.left > 800) showInvite({ id: d.inv.id, left: d.inv.left, from: d.inv.other, pw: d.inv.pw }, true)
        } else if (type === 'invite') {
            showInvite(d, false)
        } else if (type === 'result') {
            if (d.type === 'cancelled') { hideInv(); toast('🚫 ألغى ' + who(d.by) + ' الدعوة') }
            else if (d.type === 'expired') { hideInv(); toast('⌛ انتهى وقت الدعوة') }
            else if (d.type === 'rejected') toast('❌ رفض ' + who(d.by) + ' التحدي')
            else if (d.type === 'rejected_self') toast('تم رفض التحدي')
            else if (d.type === 'failed') { hideInv(); toast('❌ ' + (d.message || 'تعذّر بدء التحدي')) }
        } else if (type === 'start') {
            showStart(d)
        }
        try { window.dispatchEvent(new CustomEvent('ch:ev', { detail: { type: type, data: d } })) } catch (e) { }
    }

    var es = new EventSource('/challenge/stream')
    ;['hello', 'invite', 'out', 'result', 'start', 'fight', 'ended'].forEach(function (t) {
        es.addEventListener(t, function (e) { var d = {}; try { d = JSON.parse(e.data) } catch (x) { } onEvent(t, d) })
    })
}

function overlayJS() {
    return '(' + overlayClient.toString() + ')(' + JSON.stringify(INVITE_CSS + SHADOW_EXTRA + TITLES.CSS) + ');'
}

// ───────────── صفحة التحدي: بحث + المتصلون ─────────────
function lobbyClient(CFG) {
    var $ = function (i) { return document.getElementById(i) }
    var shadowHost = $('lobby'), sh = shadowHost.attachShadow({ mode: 'open' })
    sh.innerHTML = '<style>' + CFG.css + '</style><div class="lobby" id="lb"></div>'
    var lb = sh.getElementById('lb')

    var a = 'search', tg = null, q = '', end = 0, tm = 0, msg = '', timer = 0, list = [], onlineCount = 0, loading = true
    var CH = function () { return window.__CH || {} }

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
    function fm(n) { return Number(n || 0).toLocaleString('en-US') }
    function safeImg(u) { return typeof u === 'string' && /^(https:\/\/|\/custom_images\/|\/characters\/|data:image\/)/.test(u) && !/['"()\s\\]/.test(u) ? u : '' }
    function av(p, s) {
        var im = safeImg(p && p.img)
        return '<div class="av" style="--h:' + (p && p.h || 0) + ';width:' + s + 'px;height:' + s + 'px;font-size:' + (s * .45) + 'px">' + (im ? '<img src="' + im + '" alt="">' : esc(((p && (p.n || p.u)) || '?').charAt(0))) + '</div>'
    }
    function csrf() { return CFG.csrf }
    function post(url, body) {
        body = body || {}; body.csrf = csrf()
        return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            .then(function (r) { return r.json().catch(function () { return { ok: false, message: 'خطأ بالاتصال' } }) }).catch(function () { return { ok: false, message: 'تعذّر الاتصال بالخادم' } })
    }
    function toast(t) {
        var d = document.createElement('div'); d.className = 'tz'; d.textContent = t; d.style.left = '50%'; d.style.transform = 'translateX(-50%)'
        lb.appendChild(d); setTimeout(function () { d.remove() }, 3000)
    }
    function ring(left) {
        return '<div class="cdr"><svg viewBox="0 0 56 56"><circle class="t" cx="28" cy="28" r="22"/><circle class="p" cx="28" cy="28" r="22" style="animation-delay:-' + (30000 - left) + 'ms"/></svg><b id="lc">' + Math.ceil(left / 1000) + '</b></div>'
    }

    function rowHTML(p) {
        var st = p.st === 'off' ? '<span class="stt">⚫ غير متصل</span>' : p.st === 'bz' ? '<span class="stt bz">⚔️ في قتال</span>' : '<span class="stt on">🟢 متصل</span>'
        return '<div class="rw">' + av(p, 44) + '<div class="in"><b>@' + esc(p.u || p.n) + '</b>' + (p.t && window.TB ? '<div>' + TB(p.t, 1) + '</div>' : '') + '<small>' + esc(p.n) + ' · ' + fm(p.pw) + ' PWR</small></div>' + st +
            '<button class="ch" data-p="' + esc(p.pid) + '" type="button"' + (p.st === 'on' ? '' : ' disabled') + '>⚔️ تحدي</button></div>'
    }

    function draw() {
        if (a === 'search') {
            var h = '<div class="sb"><input id="q" placeholder="🔎 ابحث باليوزر (مثل zoro أو luffy)" autocomplete="off" autocapitalize="off" value="' + esc(q) + '"></div>'
            if (!q) h += '<div class="sec">🟢 المتصلون بالموقع الآن (' + fm(onlineCount) + ')</div>'
            h += '<div class="list" id="lst">'
            if (loading) h += '<div class="mid"><p>جارٍ التحميل…</p></div>'
            else if (!list.length) h += '<div class="mid"><div class="big">' + (q ? '🔍' : '😴') + '</div><p>' + (q ? 'لا يوجد لاعب بهذا اليوزر' : 'لا يوجد لاعبون متصلون الآن<br>ابحث باليوزر لتحدّي أي لاعب') + '</p></div>'
            else h += list.map(rowHTML).join('')
            h += '</div>'
            var keep = sh.getElementById('q'), had = keep && sh.activeElement === keep
            lb.innerHTML = h
            var inp = sh.getElementById('q')
            inp.oninput = function () { q = this.value; clearTimeout(timer); timer = setTimeout(load, 250) }
            if (had) { inp.focus(); try { inp.setSelectionRange(q.length, q.length) } catch (e) { } }
            return
        }
        var s = ''
        if (a === 'wait') s = '<div class="mid"><div class="pulse">' + av(tg, 76) + '</div><h3>بانتظار رد @' + esc(tg.u || tg.n) + '</h3>' + (tg.t && window.TB ? '<div>' + TB(tg.t) + '</div>' : '') + '<p>وصلته الدعوة على شاشته الآن</p>' + ring(Math.max(0, end - Date.now())) + '<button class="gh" data-a="cancel" type="button">إلغاء الدعوة</button></div>'
        if (a === 'rej') s = '<div class="mid"><div class="big">❌</div><h3>رفض @' + esc(tg.u || tg.n) + ' التحدي</h3><p>جرّب لاعباً آخر أو أعد المحاولة لاحقاً</p><button class="go" data-a="back" type="button">رجوع للبحث</button></div>'
        if (a === 'exp') s = '<div class="mid"><div class="big">⌛</div><h3>انتهى وقت الدعوة</h3><p>لم يرد @' + esc(tg ? (tg.u || tg.n) : '') + ' خلال 30 ثانية</p><button class="go" data-a="back" type="button">رجوع للبحث</button></div>'
        if (a === 'fail') s = '<div class="mid"><div class="big">⚠️</div><h3>تعذّر بدء التحدي</h3><p>' + esc(msg) + '</p><button class="go" data-a="back" type="button">رجوع للبحث</button></div>'
        if (a === 'go') s = '<div class="mid"><div class="big">⚔️</div><h3>بدأ القتال!</h3><p>جارٍ نقلك للساحة…</p></div>'
        lb.innerHTML = s
    }

    function tick() {
        if (a !== 'wait') return
        var l = Math.max(0, Math.ceil((end - Date.now()) / 1000)), b = sh.getElementById('lc')
        if (b) b.textContent = l
    }
    setInterval(tick, 250)

    function load() {
        fetch('/challenge/players?q=' + encodeURIComponent(q), { credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { return r.json() })
            .then(function (d) { if (d && d.ok) { list = d.list || []; onlineCount = d.online || 0 } loading = false; if (a === 'search') draw() })
            .catch(function () { loading = false; if (a === 'search') draw() })
    }
    function loadAtt() {
        fetch('/challenge/state', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json() }).then(function (d) {
            if (!d || !d.ok) return
            $('att').textContent = '⚔️ ' + d.att.left + '/5'
            var base = Date.now() + d.att.resetMs
            clearInterval(window.__rstT)
            window.__rstT = setInterval(function () {
                var s = Math.max(0, Math.floor((base - Date.now()) / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60
                $('rst').textContent = '⏳ ' + h + ':' + (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r
                if (s <= 0) loadAtt()
            }, 1000)
        }).catch(function () { })
    }

    lb.addEventListener('click', function (e) {
        var c = e.target.closest && e.target.closest('.ch')
        if (c && !c.disabled) {
            var pid = c.getAttribute('data-p'); c.disabled = true
            post('/challenge/send', { to: pid }).then(function (r) {
                if (!r.ok) { toast(r.message || 'تعذّر إرسال الدعوة'); load(); return }
                tg = r.to; end = Date.now() + r.left; a = 'wait'; draw()
            })
            return
        }
        var t = e.target.closest && e.target.closest('[data-a]'); if (!t) return
        var k = t.getAttribute('data-a')
        if (k === 'cancel') { t.disabled = true; post('/challenge/cancel', {}).then(function () { a = 'search'; draw(); load() }) }
        if (k === 'back') { a = 'search'; draw(); load() }
    })

    window.addEventListener('ch:ev', function (e) {
        var t = e.detail.type, d = e.detail.data
        if (t === 'hello') {
            if (d.inv && d.inv.dir === 'out' && d.inv.left > 800) { tg = d.inv.other; end = Date.now() + d.inv.left; a = 'wait'; draw() }
            load(); loadAtt()
        } else if (t === 'out') { tg = d.to; end = Date.now() + d.left; a = 'wait'; draw() }
        else if (t === 'result') {
            if (d.type === 'rejected') { a = 'rej'; draw() }
            else if (d.type === 'expired' && a === 'wait') { a = 'exp'; draw() }
            else if (d.type === 'cancelled_self') { a = 'search'; draw(); load() }
            else if (d.type === 'failed') { msg = d.message || ''; a = 'fail'; draw() }
        } else if (t === 'start') { a = 'go'; draw() }
    })

    draw(); load(); loadAtt()
    setInterval(function () { if (a === 'search') load() }, 8000)
    if (window.__CH && window.__CH.hello) window.dispatchEvent(new CustomEvent('ch:ev', { detail: { type: 'hello', data: window.__CH.hello } }))
}

function lobbyPageHTML({ code, csrf, name, nav, navBtn }) {
    const cfg = { code, csrf, css: INVITE_CSS + SHADOW_EXTRA + TITLES.CSS }
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<script>${TITLES.JS}</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>⚔️ التحدي</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Oswald:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0d16;--panel:#0f1422;--line:#222a42;--gold:#f0c04a;--mut:#8891a3;--tx:#eef1f8;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
*{box-sizing:border-box}
html,body{margin:0}
body{background:radial-gradient(520px 320px at 15% 5%,rgba(62,168,255,.15),transparent 70%),radial-gradient(520px 320px at 90% 30%,rgba(192,74,255,.14),transparent 70%),var(--bg);color:var(--tx);font-family:'Cairo',system-ui,sans-serif;min-height:100vh}
.wrap{max-width:560px;margin:0 auto;padding:10px 12px 40px}
.top{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.top b{font-weight:900;font-size:22px;color:var(--gold);margin-inline-end:auto}
.chip{font:700 12px 'Oswald',sans-serif;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:4px 10px;color:var(--mut);direction:ltr}
.sub{color:var(--mut);font-size:12px;line-height:1.8;margin:0 2px 12px}
</style>
</head>
<body>
<div class="wrap">
  <header class="top">${navBtn || ''}<b>⚔️ التحدي</b><span class="chip" id="att">⚔️ -/5</span><span class="chip" id="rst">⏳ --:--:--</span></header>
  <p class="sub">ابحث باليوزر أو اختر لاعباً من المتصلين الآن، وستصله دعوتك لحظياً. تُخصم المحاولة عند القبول فقط، وتتجدد 5 محاولات كل ساعتين.</p>
  <div id="lobby"></div>
</div>
${nav || ''}
<script>(${lobbyClient.toString()})(${jsonForScript(cfg)})</script>
</body>
</html>`
}

// ───────────── ساحة القتال ─────────────
function arenaClient(CFG) {
    var $ = function (i) { return document.getElementById(i) }
    function fm(n) { return Math.round(Number(n) || 0).toLocaleString('en-US') }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms) }) }
    function safeImg(u) { return typeof u === 'string' && /^(https:\/\/|\/custom_images\/|\/characters\/|data:image\/)/.test(u) && !/['"()\s\\]/.test(u) ? u : '' }
    function safeCol(c) { return /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#8b93a1' }

    var S = null, busy = false, over = false, seen = {}, queue = Promise.resolve()
    var log = $('log'), sc = $('scene')
    var LBL = { a: 'ضربة عادية', s: 'مهارة', u: 'ألتميت' }

    function card(c, i) {
        var im = safeImg(c.i), stars = new Array((c.s || 1) + 1).join('★')
        return '<div class="cd' + (c.k ? ' sss' : '') + '" style="--t:' + safeCol(c.c) + ';--i:' + i + '"><div class="cd-in">' +
            (im ? '<img src="' + im + '" alt="" style="object-position:50% 25%">' : '<span class="ph">' + esc((c.n || '?').charAt(0)) + '</span>') +
            '<div class="tg"><b' + (c.en ? ' class="en"' : '') + '>' + esc(c.r) + '</b><i>' + stars + '</i></div><div class="nm">' + esc(c.n) + '<small>' + fm(c.p) + ' PWR</small></div></div></div>'
    }
    function cdn(last, turns, n) { return last >= 0 && turns - last < n ? n - (turns - last) : 0 }

    function hud() {
        ;['me', 'foe'].forEach(function (s) {
            var A = S[s], p = s === 'me' ? 'm' : 'f'
            var w = Math.max(0, Math.min(100, A.hp / A.max * 100)) + '%'
            $(p + 'hp').style.width = w; $(p + 'gh').style.width = w
            $(p + 'hpt').textContent = fm(Math.max(0, A.hp)) + ' / ' + fm(A.max)
            $(p + 'sh').style.width = Math.min(100, A.sh / (A.shMax || 1) * 100) + '%'
            $(p + 'st').textContent = (A.sh > 0 ? '🛡️ ' + fm(A.sh) + '   ' : '') + (A.burn > 0 ? '🔥 حرق ' + A.burn : '')
            $(p + 'pw').textContent = fm(A.tp) + ' PWR'
        })
        $('fname').innerHTML = '🛡️ ' + esc(S.foe.name) + (S.foe.t && window.TB ? TB(S.foe.t, 1) : '')
        $('mname').innerHTML = '⚔️ ' + esc(S.me.name) + (S.me.t && window.TB ? TB(S.me.t, 1) : '')
        var m = S.me, can = !busy && !over && S.turn === 'me', sk = cdn(m.sk, m.turns, 2), ul = cdn(m.ul, m.turns, 5)
        $('bA').disabled = !can; $('bS').disabled = !can || sk > 0; $('bU').disabled = !can || ul > 0
        $('bS').lastChild.textContent = sk > 0 ? 'بعد ' + sk + ' جولة' : 'جاهزة'
        $('bU').lastChild.textContent = ul > 0 ? 'بعد ' + ul + ' جولات' : 'جاهز'
        $('tt').textContent = over ? '🏁 انتهى القتال' : S.turn === 'me' ? '🎯 دورك — اختر حركتك' : '⏳ دور الخصم…'
        $('tc').textContent = 'الجولة ' + S.round
        $('me').className = 'row me' + (S.turn === 'me' && !over ? ' on' : ''); $('foe').className = 'row foe' + (S.turn === 'foe' && !over ? ' on' : '')
        sc.dataset.t = over ? '' : S.turn
    }

    function pos(side) { var r = $(side).getBoundingClientRect(), s = sc.getBoundingClientRect(); return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 } }
    function float(side, txt, cls) {
        var p = pos(side), d = document.createElement('div'); d.className = 'dn ' + (cls || ''); d.textContent = txt
        d.style.left = (p.x + (Math.random() * 60 - 30)) + 'px'; d.style.top = p.y + 'px'; sc.appendChild(d)
        d.animate([{ opacity: 0, transform: 'translate(-50%,-30%) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-90%) scale(1.15)', offset: .2 }, { opacity: 0, transform: 'translate(-50%,-260%) scale(1)' }], { duration: 1100, easing: 'ease-out' }).onfinish = function () { d.remove() }
    }
    function burst(side, kind) {
        var p = pos(side), d = document.createElement('div'), c = { a: '#ffffff', s: '#f0c04a', u: '#ff3860' }[kind], z = { a: 130, s: 190, u: 300 }[kind]
        d.className = 'bx'; d.style.cssText = 'left:' + p.x + 'px;top:' + p.y + 'px;width:' + z + 'px;height:' + z + 'px;background:radial-gradient(circle,' + c + ' 0%,' + c + '66 35%,transparent 70%)'; sc.appendChild(d)
        d.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }], { duration: 520, easing: 'ease-out' }).onfinish = function () { d.remove() }
        if (kind === 'u') {
            var f = $('flash'); f.style.background = 'radial-gradient(circle,' + c + '88,transparent 70%)'; f.animate([{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 0 }], { duration: 600 })
            sc.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,4px)' }, { transform: 'translate(6px,-4px)' }, { transform: 'translate(-4px,-3px)' }, { transform: 'translate(0,0)' }], { duration: 420 })
        }
        Array.prototype.forEach.call($(side).children, function (c) { c.firstChild.animate([{ transform: 'translateX(0)', filter: 'none' }, { transform: 'translateX(-9px)', filter: 'brightness(2.2) saturate(1.6)', offset: .25 }, { transform: 'translateX(8px)', offset: .5 }, { transform: 'translateX(-4px)', offset: .75 }, { transform: 'translateX(0)', filter: 'none' }], { duration: 420 }) })
    }
    function lunge(side, i, kind) {
        return new Promise(function (res) {
            var ch = $(side).children[i]; if (!ch) return res()
            var el = ch.firstChild, dy = (side === 'me' ? -1 : 1) * sc.clientHeight * .34, dur = kind === 'u' ? 1100 : 720, rx = side === 'me' ? 8 : -8
            var to = 'translate3d(0,' + dy + 'px,130px) scale(1.18) rotateX(' + rx + 'deg)'
            el.animate([{ transform: 'translate3d(0,0,0) scale(1)' }, { transform: to, offset: .45 }, { transform: to, offset: .6 }, { transform: 'translate3d(0,0,0) scale(1)' }], { duration: dur, easing: 'cubic-bezier(.3,.8,.3,1)' })
            setTimeout(res, dur * .45)
        })
    }

    var RM = matchMedia('(prefers-reduced-motion:reduce)').matches, cv = $('cv'), cx = cv.getContext('2d'), cb = $('cvb').getContext('2d'), A = [], P = [], W = 0, H = 0
    var COL = { gold: '255,200,90', blue: '90,180,255', red: '255,56,96', violet: '190,120,255' }
    function fit() { var d = Math.min(2, window.devicePixelRatio || 1); W = sc.clientWidth; H = sc.clientHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); var b = $('cvb'); b.width = W * d; b.height = H * d; cb.setTransform(d, 0, 0, d, 0, 0) }
    function spawn(x, y, c, n, sp) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = Math.random() * sp; P.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 1.5 + Math.random() * 3, l: 1, d: .02 + Math.random() * .02, c: c, g: .1 }) } }
    function loop() {
        cx.clearRect(0, 0, W, H); cb.clearRect(0, 0, W, H); cx.globalCompositeOperation = 'lighter'; cb.globalCompositeOperation = 'lighter'
        if (A.length < 42 && Math.random() < .3) A.push({ x: Math.random() * W, y: H + 8, vx: (Math.random() - .5) * .4, vy: -(.25 + Math.random() * .6), r: 1 + Math.random() * 2.2, t: Math.random() * 6, c: Math.random() < .5 ? COL.gold : COL.violet })
        for (var j = A.length - 1; j >= 0; j--) { var q = A[j]; q.x += q.vx; q.y += q.vy; q.t += .05; if (q.y < -10) { A.splice(j, 1); continue } cb.fillStyle = 'rgba(' + q.c + ',' + (.3 + .4 * Math.abs(Math.sin(q.t))) + ')'; cb.beginPath(); cb.arc(q.x, q.y, q.r, 0, 6.3); cb.fill() }
        for (var i = P.length - 1; i >= 0; i--) { var p = P[i]; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.l -= p.d; if (p.l <= 0) { P.splice(i, 1); continue } cx.fillStyle = 'rgba(' + p.c + ',' + (p.l * .85) + ')'; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.3); cx.fill() }
        requestAnimationFrame(loop)
    }
    function cpos(side, i) { var ch = $(side).children[i]; if (!ch) return pos(side); var r = ch.getBoundingClientRect(), s = sc.getBoundingClientRect(); return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 } }
    function rm(d) { return function () { d.remove() } }
    function ring(p, col, n, sz) { for (var k = 0; k < n; k++) { var d = document.createElement('div'); d.className = 'rg'; d.style.cssText = 'left:' + p.x + 'px;top:' + p.y + 'px;width:' + sz + 'px;height:' + sz + 'px;border-color:' + col + ';box-shadow:0 0 16px ' + col; sc.appendChild(d); d.animate([{ transform: 'translate(-50%,-50%) scale(.1)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(.45)', opacity: 1, offset: .15 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }], { duration: 700, delay: k * 140, easing: 'ease-out', fill: 'both' }).onfinish = rm(d) } }
    function beam(a, b, col) { var dx = b.x - a.x, dy = b.y - a.y, g = Math.atan2(dy, dx), d = document.createElement('div'), r = 'rotate(' + g + 'rad) '; d.className = 'bm'; d.style.cssText = 'left:' + a.x + 'px;top:' + a.y + 'px;width:' + Math.hypot(dx, dy) + 'px;background:linear-gradient(90deg,transparent,' + col + ',#fff,' + col + ')'; sc.appendChild(d); d.animate([{ transform: r + 'scaleY(0)', opacity: 0 }, { transform: r + 'scaleY(1.5)', opacity: 1, offset: .25 }, { transform: r + 'scaleY(.3)', opacity: 0 }], { duration: 650, easing: 'ease-out' }).onfinish = rm(d) }
    function slash(p, col) { var d = document.createElement('div'); d.className = 'sl'; d.style.cssText = 'left:' + p.x + 'px;top:' + p.y + 'px;color:' + col + ';box-shadow:0 0 18px ' + col; sc.appendChild(d); var t = 'translate(-50%,-50%) rotate(-35deg) '; d.animate([{ transform: t + 'scaleX(0)', opacity: 1 }, { transform: t + 'scaleX(1)', opacity: 1, offset: .4 }, { transform: t + 'scaleX(1.1)', opacity: 0 }], { duration: 420 }).onfinish = rm(d) }
    function runeFx(kind) { sc.dataset.fx = kind; setTimeout(function () { delete sc.dataset.fx }, 2400) }
    function fancy(side, i, ds, kind) {
        var a = cpos(side, i), b = pos(ds)
        if (kind === 'u') { beam(a, b, '#ff3860'); ring(b, '#fff', 3, 260); spawn(b.x, b.y, COL.red, 70, 9); spawn(b.x, b.y, COL.gold, 40, 6); spawn(a.x, a.y, COL.violet, 30, 4); $('world').animate([{ transform: 'rotateX(8deg) scale(1)' }, { transform: 'rotateX(8deg) scale(1.1)', offset: .2 }, { transform: 'rotateX(8deg) scale(1)' }], { duration: 900 }) }
        else { ring(a, '#3ea8ff', 2, 170); slash(b, '#3ea8ff'); spawn(b.x, b.y, COL.blue, 28, 5); spawn(a.x, a.y, COL.gold, 20, 3) }
    }
    function cutin(side, c, kind) {
        if (RM || !c) return sleep(250)
        var u = kind === 'u', L = side === 'me', cut = $('cut'), dur = u ? 1500 : 950, im = $('cimg'), tx = $('ctx'), f = L ? -110 : 110, pic = safeImg(c.i)
        cut.className = 'cut' + (u ? ' u' : ''); cut.style.setProperty('--k1', u ? '#ff3860' : '#3ea8ff'); cut.style.setProperty('--k2', u ? '#7a1233' : '#12396b')
        im.style.cssText = (L ? 'right:0;' : 'left:0;') + '--md:' + (L ? 'to left' : 'to right')
        im.innerHTML = pic ? '<img src="' + pic + '" alt="" style="object-position:50% 25%">' : '<span class="cg">' + esc((c.n || '?').charAt(0)) + '</span>'
        tx.style.cssText = L ? 'left:6%' : 'right:6%'
        tx.innerHTML = (u ? 'ULTIMATE' : 'SKILL') + '<small>' + esc(c.n) + ' — ' + (u ? 'الألتميت' : 'المهارة') + '</small>'
        cut.hidden = false
        $('cbg').animate([{ opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 1, offset: .85 }, { opacity: 0 }], { duration: dur })
        $('cband').animate([{ transform: 'translateX(' + f + '%)', easing: 'cubic-bezier(.2,.9,.3,1)' }, { transform: 'translateX(0)', offset: .15 }, { transform: 'translateX(' + (-f * .03) + '%)', offset: .85 }, { transform: 'translateX(' + (-f) + '%)' }], { duration: dur })
        im.animate([{ transform: 'scale(1.4)' }, { transform: 'scale(1.02)' }], { duration: dur })
        tx.animate([{ opacity: 0, transform: 'translateX(' + (L ? -90 : 90) + 'px) scale(1.4)' }, { opacity: 1, transform: 'none', offset: .28 }, { opacity: 1, transform: 'none', offset: .85 }, { opacity: 0 }], { duration: dur })
        return sleep(dur).then(function () { cut.hidden = true; runeFx(kind) })
    }

    function render() {
        $('me').innerHTML = S.me.team.map(card).join(''); $('foe').innerHTML = S.foe.team.map(card).join('')
        hud()
    }

    function showEnd(end, reason) {
        over = true; hud()
        var lines = ''
        if (reason === 'idle') { $('ot').textContent = '⌛ انتهى القتال'; lines = 'انتهت المعركة بسبب الخمول (10 دقائق بدون حركة)' }
        else if (end && end.win) {
            $('ot').textContent = '🏆 فزت!'
            lines = '💰 +' + fm(end.money) + ' مال<br>✨ +' + fm(end.xp) + ' خبرة<br>🏅 MMR +' + (end.mmr || 20) + (end.box ? '<br>' + esc(end.box) : '') + (end.rankUp ? '<br>🎉 ترقية رتبة: ' + esc(end.rankUp) : '') + (end.tierUp ? '<br>🏆 ترقية رانك: ' + esc(end.tierUp) : '')
        } else {
            $('ot').textContent = '💀 خسرت'
            lines = '✨ +' + fm(end && end.xp) + ' خبرة مشاركة<br>🏅 MMR ' + ((end && end.mmr) || -10)
        }
        $('op').innerHTML = lines
        setTimeout(function () { $('ov').hidden = false }, 400)
    }

    // تشغيل حدث حركة (يصل من SSE أو من رد الطلب — بدون تكرار)
    async function play(d) {
        var ev = d.ev
        if (!ev || seen[ev.id]) return
        seen[ev.id] = 1
        if (!S) return
        busy = true; hud()
        var side = ev.by === 'me' ? 'me' : 'foe', ds = side === 'me' ? 'foe' : 'me'
        var team = S[side].team, c = team[ev.idx]
        log.textContent = (c ? c.n : '') + ' — ' + LBL[ev.kind]
        if (ev.kind !== 'a') await cutin(side, c, ev.kind)
        await lunge(side, ev.idx, ev.kind)
        if (ev.res === 'dodge') float(ds, 'تفادي!', 'dodge')
        else if (ev.res === 'miss') float(ds, 'أخطأت الضربة!', 'dodge')
        else {
            burst(ds, ev.kind)
            if (ev.kind !== 'a') fancy(side, ev.idx, ds, ev.kind)
            float(ds, '-' + fm(ev.dmg) + (ev.absorbed ? ' 🛡️' + fm(ev.absorbed) : ''), ev.crit ? 'crit' : '')
            if (ev.crit) log.textContent += ' 💢 كريتيكال!'
            if (ev.heal > 0) float(side, '+' + fm(ev.heal) + ' ❤️', 'heal')
        }
        if (d.state) { S = d.state; hud() }
        else if (d.end) { if (d.end.win) S.foe.hp = 0; else S.me.hp = 0; hud() }
        await sleep(700)
        if (d.end) return showEnd(d.end)
        busy = false; hud()
    }
    function enqueue(d) { queue = queue.then(function () { return play(d) }).catch(function () { busy = false; if (S) hud() }) }

    function post(url, body) {
        body = body || {}; body.csrf = CFG.csrf
        return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            .then(function (r) { return r.json().catch(function () { return { ok: false, message: 'خطأ بالاتصال' } }) }).catch(function () { return { ok: false, message: 'تعذّر الاتصال بالخادم' } })
    }
    function act(kind) {
        if (busy || over || !S || S.turn !== 'me') return
        busy = true; hud()
        post('/challenge/act', { kind: kind }).then(function (r) {
            if (!r.ok) { log.textContent = '⚠️ ' + (r.message || 'تعذّر تنفيذ الحركة'); busy = false; return reload() }
            enqueue(r)
        })
    }
    $('bA').onclick = function () { act('a') }; $('bS').onclick = function () { act('s') }; $('bU').onclick = function () { act('u') }

    function setAtt(att) {
        if (!att) return
        $('att').textContent = '⚔️ ' + att.left + '/5'
        var base = Date.now() + att.resetMs
        clearInterval(window.__rstT)
        window.__rstT = setInterval(function () {
            var s = Math.max(0, Math.floor((base - Date.now()) / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60
            $('rst').textContent = '⏳ ' + h + ':' + (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r
        }, 1000)
    }
    function reload() {
        return fetch('/challenge/state', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json() }).then(function (d) {
            if (!d || !d.ok) return
            setAtt(d.att)
            if (!d.fight) { if (!over) { $('ot').textContent = 'لا يوجد قتال'; $('op').innerHTML = 'لا يوجد قتال جارٍ حالياً'; $('ov').hidden = false; over = true } return }
            if (!S || !busy) { S = d.fight; render() }
        })
    }

    window.addEventListener('ch:ev', function (e) {
        var t = e.detail.type, d = e.detail.data
        if (t === 'fight') enqueue(d)
        else if (t === 'ended') showEnd(null, d.reason)
    })

    $('lobbyLink').href = '/u/' + CFG.code + '/challenge'
    $('again').href = '/u/' + CFG.code + '/challenge'
    $('back').href = '/u/' + CFG.code + '/challenge'
    fit(); addEventListener('resize', fit); if (!RM) loop()
    if (!RM) {
        sc.addEventListener('pointermove', function (e) { var r = sc.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; $('world').style.transform = 'rotateX(' + (8 - y * 10) + 'deg) rotateY(' + (x * 16) + 'deg)' })
        ;['pointerleave', 'pointerup', 'pointercancel'].forEach(function (ev) { sc.addEventListener(ev, function () { $('world').style.transform = '' }) })
    }
    reload()
}

function arenaPageHTML({ code, csrf }) {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<script>${TITLES.JS}</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>⚔️ ساحة القتال</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Oswald:wght@500;700&display=swap" rel="stylesheet">
<style>${ARENA_CSS}
${TITLES.CSS}
.ov a.go{display:block;text-decoration:none}
.top a.back{color:var(--mut);text-decoration:none;font-size:13px;font-weight:800}
</style>
</head>
<body>
<div class="wrap">
  <header class="top"><b>⚔️ التحدي</b><a class="back" id="back" href="#">رجوع ↩</a><span class="chip" id="att">⚔️ -/5</span><span class="chip" id="rst">⏳ --:--:--</span></header>
  <section class="hud foe"><div class="who"><b id="fname">🛡️ الخصم</b><span id="fpw"></span></div><div class="hp"><i class="gh" id="fgh"></i><i class="fl" id="fhp"></i><i class="sh" id="fsh"></i><em id="fhpt"></em></div><div class="st" id="fst"></div></section>
  <div class="scene" id="scene">
    <div class="aura f"></div><div class="aura m"></div>
    <div class="floor"></div>
    <div class="world" id="world">
<div class="bgl sky"></div>
<div class="bgl neb"><i style="left:-10%;top:40%;width:60%;height:40%;background:rgba(120,60,255,.35)"></i><i style="right:-10%;top:15%;width:55%;height:35%;background:rgba(255,60,120,.25);animation-delay:-8s"></i><i style="left:10%;bottom:5%;width:50%;height:30%;background:rgba(40,160,255,.25);animation-delay:-4s"></i></div>
<div class="bgl portal"><div class="sun"></div><div class="core"></div><div class="pg"><svg viewBox="-100 -100 200 200"><g class="r1"><circle r="97" stroke-width="1.4"/><circle r="90" stroke-width="5" stroke-dasharray="1 7"/></g><g class="r2"><circle r="78" stroke-width="1.2"/><polygon points="0,-78 67.5,39 -67.5,39" stroke-width="1.4"/><polygon points="0,78 67.5,-39 -67.5,-39" stroke-width="1.4"/></g><g class="r3"><circle r="46" stroke-width="1.2" stroke-dasharray="2 5"/><circle r="30" stroke-width="1.4"/></g><g stroke-width="3" stroke-linecap="round" style="animation:none"><line x1="-24" y1="-28" x2="22" y2="26"/><line x1="24" y1="-28" x2="-22" y2="26"/><line x1="-5.7" y1="-20.4" x2="-19.3" y2="-8.6"/><line x1="5.7" y1="-20.4" x2="19.3" y2="-8.6"/></g></svg></div></div>
<canvas class="bgl" id="cvb"></canvas>
<div class="bgl pil"><i class="gate"></i><i style="left:5%"></i><i style="left:15%;height:50%"></i><i style="right:5%"></i><i style="right:15%;height:50%"></i></div>
<div class="row foe" id="foe"></div><div class="vs">VS</div><div class="row me" id="me"></div></div>
    <canvas class="cv" id="cv"></canvas>
    <div class="flash" id="flash"></div>
  </div>
  <section class="hud me"><div class="who"><b id="mname">⚔️ أنت</b><span id="mpw"></span></div><div class="hp"><i class="gh" id="mgh"></i><i class="fl" id="mhp"></i><i class="sh" id="msh"></i><em id="mhpt"></em></div><div class="st" id="mst"></div></section>
  <div class="turn"><b id="tt">⏳ جارٍ التحميل…</b><span id="tc"></span></div>
  <div class="log" id="log"></div>
  <div class="acts"><button id="bA" type="button" disabled>⚔️ هجوم<small>شخصية عشوائية</small></button><button id="bS" type="button" disabled>✨ مهارة<small></small></button><button id="bU" type="button" disabled>🌟 ألتميت<small></small></button></div>
  <p class="note">القتال مباشر مع لاعب حقيقي — الحساب بنفس معادلات البوت.<br>اسحب إصبعك داخل الساحة لتدوير الكاميرا.<a id="lobbyLink" href="#" style="display:none"></a></p>
</div>
<div class="cut" id="cut" hidden><div class="cbg" id="cbg"></div><div class="cband" id="cband"><div class="cimg" id="cimg"></div><div class="ctx" id="ctx"></div></div></div>
<div class="ov" id="ov" hidden><div class="box"><h2 id="ot"></h2><p id="op"></p><a class="go" id="again" href="#">⚔️ تحدي جديد</a></div></div>
<script>(${arenaClient.toString()})(${jsonForScript({ code, csrf })})</script>
</body>
</html>`
}

module.exports = { overlayJS, lobbyPageHTML, arenaPageHTML }
