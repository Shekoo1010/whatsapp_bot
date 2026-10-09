'use strict'
const TITLES = require('./titleSystem') // 🏅 الألقاب

// 🏟️ صفحة الأرينا (النسخة 3) — التصميم من نموذج "أرينا PvP - النسخة 3"
// الصفحة تعرض إعادة مرئية للمعركة الحقيقية (أحداث pvpBattle.simulate) + أنيميشن ترقية الرتبة.

function arenaClient(D) {
    var $ = function (i) { return document.getElementById(i) }
    var TIERS = D.tiers, me = D.me, opp = D.opponents, csrf = D.csrf
    var tab = 1, busy = false, cdUntil = Date.now() + (me.cdMs || 0)
    var skip = false, SP = 1, waiters = [], hallData = null

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
    function fmt(n) { return Number(n || 0).toLocaleString('en-US') }
    function sleep(ms) {
        return new Promise(function (r) {
            if (skip) return r()
            var t = setTimeout(function () { r() }, ms * SP)
            waiters.push(function () { clearTimeout(t); r() })
        })
    }
    function toast(t) {
        var e = $('toast'); e.textContent = t; e.classList.add('on')
        clearTimeout(toast._t); toast._t = setTimeout(function () { e.classList.remove('on') }, 2600)
    }

    // ── صور الشخصيات (الصورة من SSS وفوق، غير ذلك دائرة بلون الرتبة + أول حرف) ──
    function avCss(v, color) {
        if (v && v.k && v.i) return "background:url('" + String(v.i).replace(/'/g, '%27').replace(/"/g, '%22') + "') center/cover no-repeat"
        return 'background:radial-gradient(circle at 30% 25%,#fff8,' + (color || (v && v.c) || '#b06bff') + ' 45%,#1a0e3a)'
    }
    function avTxt(v) { return (v && v.k && v.i) ? '' : esc(v && v.n ? String(v.n).trim().charAt(0) : '⚔️') }
    function setAv(el, v, color) {
        el.style.cssText += ';' + avCss(v, color)
        el.textContent = (v && v.k && v.i) ? '' : (v && v.n ? String(v.n).trim().charAt(0) : '⚔️')
    }

    function rankFor(mmr) {
        var t = TIERS[0], nx = null
        for (var i = 0; i < TIERS.length; i++) if (mmr >= TIERS[i].min) { t = TIERS[i]; nx = TIERS[i + 1] || null }
        return { label: t.label, emoji: t.emoji, name: t.name, color: t.color, min: t.min, next: nx ? nx.min : null }
    }
    function pctIn(mmr, r) { return r.next ? Math.max(0, Math.min(100, (mmr - r.min) / (r.next - r.min) * 100)) : 100 }

    // ── الشريط العلوي ──
    function head() {
        var r = me.rank
        $('mr').textContent = r.label + ' • ' + fmt(me.mmr) + ' MMR'
        var av = $('mav'); av.style.setProperty('--c', r.color); setAv(av, me.team[0], r.color)
        $('tk').textContent = me.fights
        $('rbar').style.width = pctIn(me.mmr, r) + '%'
        $('rbar').style.background = r.color
        $('rnx').textContent = r.next ? (r.next - me.mmr) + ' للرتبة التالية' : 'أعلى رتبة 👑'
    }

    // ── تبويب الأرينا ──
    var DIF = { hard: ['🔴 أقوى منك', '#ff5b78'], easy: ['🟢 أضعف منك', '#3ee8a5'], even: ['🟡 متكافئ', '#ffd84a'] }

    function arena() {
        var h = '<div class="ttl">اختر خصمك</div><div class="sub">خصوم قريبون من رانكك</div>'
        h += '<div class="team"><b>🥊 فريقك</b>'
        me.team.forEach(function (v) { h += '<span class="tm" style="--c:' + esc(v.c) + ';' + esc(avCss(v)) + '">' + avTxt(v) + '</span>' })
        h += '<small>⚔️ ' + fmt(me.power) + '</small><button class="ted" id="ted">✏️ تعديل</button></div>'
        if (me.auto) h += '<div class="hint">فريقك تلقائي (أقوى 3 شخصيات) — اضغط ✏️ تعديل لتحديد فريقك</div>'
        if (!opp.length) {
            h += '<div class="empty">❌ لا يوجد خصوم متاحون حالياً</div>'
        } else {
            var mid = Math.min(2, opp.length - 1)
            h += '<div class="car" id="car">'
            opp.forEach(function (p, i) {
                var d = DIF[p.level] || DIF.even, lead = p.team[0], r = p.rank
                h += '<div class="gc' + (i == mid ? ' act' : '') + '" style="--c:' + esc(r.color) + '"><div class="in"><div class="rk">' + esc(r.label) + '</div>'
                    + '<div class="big" style="' + esc(avCss(lead, r.color)) + '">' + avTxt(lead) + '</div>'
                    + '<div class="nm">' + esc(p.name) + '</div>' + (p.t ? '<div class="ttw">' + TB(p.t, 1) + '</div>' : '') + (p.username ? '<div class="un">@' + esc(p.username) + '</div>' : '')
                    + '<div class="st"><div>🏅 ' + fmt(p.mmr) + '</div><div>⚔️ ' + fmt(p.power) + '</div></div>'
                    + '<div class="mt">'
                p.team.forEach(function (v) { h += '<span style="--c:' + esc(v.c) + ';' + esc(avCss(v)) + '">' + avTxt(v) + '</span>' })
                h += '</div><div class="dif" style="--d:' + d[1] + '">' + d[0] + '</div>'
                    + '<button class="go" data-i="' + i + '">⚔️ تحدّي</button></div></div>'
            })
            h += '</div><div class="dots" id="dots">' + opp.map(function (_, i) { return '<i' + (i == mid ? ' class="on"' : '') + '></i>' }).join('') + '</div>'
        }
        h += '<button class="rf" id="rf"' + (me.refreshes < 1 ? ' disabled' : '') + '>' + (me.refreshes < 1 ? '🚫 انتهت التحديثات' : '🔄 خصوم جدد') + ' (' + me.refreshes + '/' + me.maxRef + ')</button>'
        $('pg').innerHTML = h
        var c = $('car')
        if (c) {
            [].forEach.call(c.querySelectorAll('.go'), function (b) { b.onclick = function () { fight(+b.getAttribute('data-i')) } })
            setTimeout(function () { var cs = c.children, m = Math.min(2, cs.length - 1); c.scrollTo({ left: cs[m].offsetLeft - (c.clientWidth - cs[m].offsetWidth) / 2, behavior: 'auto' }) }, 30)
            c.onscroll = function () {
                var m = c.getBoundingClientRect(), mid = m.left + m.width / 2, b = 0, bd = 1e9
                ;[].forEach.call(c.children, function (e, i) { var r = e.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; b = i } })
                ;[].forEach.call(c.children, function (e, i) { e.classList.toggle('act', i == b) })
                ;[].forEach.call($('dots').children, function (e, i) { e.className = i == b ? 'on' : '' })
            }
        }
        $('rf').onclick = refreshOpp
        var tedBtn = $('ted'); if (tedBtn) tedBtn.onclick = openTeam
        btns()
    }

    // أزرار التحدي: كولداون 30ث + 20 قتال يومياً (مثل الواتساب)
    function btns() {
        var left = Math.ceil((cdUntil - Date.now()) / 1000)
        ;[].forEach.call(document.querySelectorAll('.go'), function (b) {
            if (me.fights < 1) { b.disabled = true; b.textContent = '🚫 انتهت قتالاتك' }
            else if (left > 0) { b.disabled = true; b.textContent = '⏳ ' + left + 'ث' }
            else { b.disabled = busy; b.textContent = '⚔️ تحدّي' }
        })
    }
    setInterval(function () { if (tab == 1 && !busy) btns() }, 500)

    async function refreshOpp() {
        try {
            var r = await (await fetch('/arena/opponents', { credentials: 'same-origin' })).json()
            if (r.ok) { opp = r.opponents; me = r.me; cdUntil = Date.now() + (me.cdMs || 0); head(); if (tab == 1) arena() }
            else {
                if (r.code == 'NOREFRESH') { me.refreshes = 0; if (tab == 1) arena() }
                if (r.message) toast(r.message)
            }
        } catch (e) { toast('تعذر الاتصال بالخادم') }
    }

    // ── القاعة ──
    function hallRender(d) {
        var rows = d.rows, h = '<div class="ttl">🏆 قاعة المتصدرين</div><div class="sub">أفضل اللاعبين بالأرينا</div>'
        if (rows.length >= 3) {
            var o = [rows[1], rows[0], rows[2]], cl = ['p2', 'p1', 'p3'], nm = [2, 1, 3]
            h += '<div class="hall">'
            o.forEach(function (p, i) {
                h += '<div class="pd ' + cl[i] + '" style="--c:' + esc(p.rank.color) + '">' + (i == 1 ? '<div class="crown">👑</div>' : '')
                    + '<div class="av" style="--c:' + esc(p.rank.color) + ';' + esc(avCss(p.av, p.rank.color)) + '">' + avTxt(p.av) + '</div>'
                    + '<b>' + esc(p.name) + '</b>' + (p.t ? '<div class="ttw">' + TB(p.t, 1) + '</div>' : '') + '<small>' + fmt(p.mmr) + ' MMR</small><div class="base" style="--c:' + esc(p.rank.color) + '">' + nm[i] + '</div></div>'
            })
            h += '</div>'
        }
        h += '<div class="rows">'
        rows.slice(rows.length >= 3 ? 3 : 0).forEach(function (p, i) {
            h += '<div class="row' + (p.me ? ' me2' : '') + '" style="--i:' + i + '"><div class="n">' + p.pos + '</div>'
                + '<div class="av" style="--c:' + esc(p.rank.color) + ';' + esc(avCss(p.av, p.rank.color)) + '">' + avTxt(p.av) + '</div>'
                + '<div><b>' + esc(p.name) + '</b>' + (p.t ? '<div class="ttw">' + TB(p.t, 1) + '</div>' : '') + '<small>' + esc(p.rank.label) + ' • ⚔️ ' + fmt(p.power) + '</small></div><div class="m">' + fmt(p.mmr) + '</div></div>'
        })
        h += '</div>'
        if (!rows.some(function (r) { return r.me })) h += '<div class="mypos">🎯 ترتيبك: #' + fmt(d.myPos) + ' • ' + fmt(me.mmr) + ' MMR</div>'
        $('pg').innerHTML = h
    }
    async function hall() {
        $('pg').innerHTML = '<div class="empty">⏳ جارٍ التحميل…</div>'
        try {
            var r = await (await fetch('/arena/hall', { credentials: 'same-origin' })).json()
            if (!r.ok) throw 0
            hallData = r
            if (tab == 2) hallRender(r)
        } catch (e) { if (tab == 2) $('pg').innerHTML = '<div class="empty">تعذر تحميل القاعة</div>' }
    }
    function show(t) { tab = t; $('n1').className = t == 1 ? 'on' : ''; $('n2').className = t == 2 ? 'on' : ''; head(); t == 1 ? arena() : hall() }
    $('n1').onclick = function () { show(1) }
    $('n2').onclick = function () { show(2) }

    // ═════════ المعركة ═════════
    var F = [], nA = 0, hpNow = [], hpMax = [], dead = [], cmb = [0, 0], B = null

    var SLOTS = [['1%', '36%'], ['13%', '24%'], ['25%', '36%']]

    function buildFigs(b) {
        var cam = $('cam')
        ;[].forEach.call(cam.querySelectorAll('.fg'), function (e) { e.remove() })
        F = []; hpNow = []; hpMax = []; dead = []
        nA = b.A.length
        var all = b.A.concat(b.B)
        all.forEach(function (f, i) {
            var side = i < nA ? 'a' : 'b', s = SLOTS[(i < nA ? i : i - nA) % 3]
            var e = document.createElement('div')
            e.className = 'fg ' + side
            e.style.bottom = s[1]; e.style[side == 'a' ? 'left' : 'right'] = s[0]
            e.style.zIndex = 3 + Math.round((40 - parseFloat(s[1])) / 4)
            e.style.setProperty('--c', f.v.c || '#b06bff')
            e.innerHTML = '<div class="fgw"><div class="pt"></div></div><div class="ftag"></div><div class="fhp"><i></i></div>'
            e.querySelector('.ftag').textContent = f.name
            var pt = e.querySelector('.pt'); setAv(pt, f.v, f.v.c)
            pt.style.display = 'grid'; pt.style.placeItems = 'center'; pt.style.fontSize = '34px'
            e.querySelector('.fgw').style.animationDelay = (i * 0.3) + 's'
            cam.appendChild(e)
            F.push(e); hpNow.push(f.maxHp); hpMax.push(f.maxHp); dead.push(false)
        })
    }

    function bars(i) {
        if (F[i]) F[i].querySelector('.fhp i').style.width = Math.max(0, hpNow[i] / hpMax[i] * 100) + '%'
        ;['a', 'b'].forEach(function (s) {
            var from = s == 'a' ? 0 : nA, to = s == 'a' ? nA : F.length, c = 0, m = 0
            for (var k = from; k < to; k++) { c += Math.max(0, hpNow[k]); m += hpMax[k] }
            var p = m ? c / m * 100 : 0
            $('c' + s).style.width = p + '%'; $('t' + s).style.width = p + '%'
        })
    }
    function setHp(i, hp) { hpNow[i] = hp; bars(i) }
    function shake(n) { if (skip) return; $('cam').animate([{ transform: 'translate(0,0)' }, { transform: 'translate(' + n + 'px,' + (-n / 2) + 'px)' }, { transform: 'translate(' + (-n) + 'px,' + n / 2 + 'px)' }, { transform: 'translate(' + n / 2 + 'px,' + n / 3 + 'px)' }, { transform: 'translate(0,0)' }], { duration: 320 }) }
    function flash(o) { if (!skip) $('wf').animate([{ opacity: o }, { opacity: 0 }], { duration: 300 }) }
    function center(el) { var r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] }
    function float(el, txt, cls, dy) {
        if (skip) return
        var c = center(el), d = document.createElement('div')
        d.className = 'dn ' + (cls || ''); d.textContent = txt
        d.style.left = (c[0] - 30) + 'px'; d.style.top = (c[1] - 60 + (dy || 0)) + 'px'
        $('fx').appendChild(d)
        d.animate([{ transform: 'translateY(16px) scale(.4)', opacity: 0 }, { transform: 'translateY(-8px) scale(1.25)', opacity: 1, offset: .25 }, { transform: 'translateY(-60px) scale(1)', opacity: 0 }], { duration: 950 * SP + 150 })
        setTimeout(function () { d.remove() }, 950 * SP + 170)
    }
    function particles(cx, cy, n) {
        for (var j = 0; j < n; j++) {
            var p = document.createElement('div'), an = Math.random() * 6.28, d = 50 + Math.random() * 100
            p.className = 'pa'; p.style.left = cx + 'px'; p.style.top = cy + 'px'; $('fx').appendChild(p)
            p.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + Math.cos(an) * d + 'px,' + Math.sin(an) * d + 'px) scale(0)', opacity: 0 }], { duration: 560, easing: 'ease-out' })
            ;(function (p) { setTimeout(function () { p.remove() }, 580) })(p)
        }
    }
    function slashes(cx, cy, n) {
        for (var k = 0; k < n; k++) (function (k) {
            setTimeout(function () {
                var a = -40 + k * 38 + Math.random() * 10, e = document.createElement('div')
                e.className = 'slash'; e.style.left = cx + 'px'; e.style.top = cy + 'px'; $('fx').appendChild(e)
                e.animate([{ transform: 'rotate(' + a + 'deg) scaleX(0)', opacity: 1 }, { transform: 'rotate(' + a + 'deg) scaleX(1.3)', opacity: 1, offset: .45 }, { transform: 'rotate(' + a + 'deg) scaleX(1.5)', opacity: 0 }], { duration: 340 })
                setTimeout(function () { e.remove() }, 360)
            }, k * 90)
        })(k)
    }

    function allDead(side) {
        var from = side == 'a' ? 0 : nA, to = side == 'a' ? nA : F.length
        for (var k = from; k < to; k++) if (!dead[k]) return false
        return true
    }

    async function doHit(ev) {
        var A = F[ev.f], T = F[ev.to], sideA = ev.f < nA, dir = sideA ? 1 : -1
        var ult = ev.k == 'ultimate', sk = ev.k == 'skill'
        var dmgTxt = fmt(ev.dmg) + (ev.abs ? ' 🛡️' + fmt(ev.abs) : '')

        if (skip) {
            setHp(ev.to, ev.hp); setHp(ev.f, ev.fhp)
            return
        }
        A.style.zIndex = 20
        if (ult) {
            $('vg').style.opacity = 1
            var bn = $('bn'); bn.textContent = (B[sideA ? 'A' : 'B'][sideA ? ev.f : ev.f - nA].name) + ' ✦ ألتميت'
            bn.style.setProperty('--c', F[ev.f].style.getPropertyValue('--c') || '#b06bff')
            bn.animate([{ opacity: 0, transform: 'translateX(' + (-dir * 300) + 'px) skewX(-15deg)' }, { opacity: 1, transform: 'translateX(0) skewX(-15deg)', offset: .25 }, { opacity: 1, transform: 'translateX(' + (dir * 40) + 'px) skewX(-15deg)', offset: .8 }, { opacity: 0, transform: 'translateX(' + (dir * 300) + 'px) skewX(-15deg)' }], { duration: 1000 * SP + 100 })
            A.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3) translateY(-10px)' }], { duration: 450 * SP + 50, fill: 'forwards' })
            await sleep(1000)
        } else if (sk) {
            float(A, '✨ مهارة', 'tag', -10)
        }
        var ac = center(A), tc = center(T)
        var dx = tc[0] - ac[0] - dir * 64, dy = (tc[1] - ac[1]) * 0.85
        A.animate([{ transform: 'none' }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.12)' }], { duration: (ult ? 140 : 190) * SP + 20, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'forwards' })
        await sleep(ult ? 140 : 190)
        flash(ult ? .8 : sk ? .4 : .25); shake(ult ? 22 : ev.crit ? 13 : 7)
        var cx = tc[0], cy = tc[1]
        slashes(cx, cy, ult ? 3 : (ev.crit || sk) ? 2 : 1)
        particles(cx, cy, ult ? 22 : 9)
        float(T, (ev.crit ? 'CRIT ' : '') + '-' + dmgTxt, ev.crit || ult ? 'cr' : '', 0)
        setHp(ev.to, ev.hp)
        if (ev.heal) float(A, '+' + fmt(ev.heal), 'heal', -4)
        if (ev.back) { float(A, '🪞-' + fmt(ev.back), '', 8) }
        setHp(ev.f, ev.fhp)
        if (ev.burn) float(T, '🔥', 'tag', 24)
        if (ev.stun) float(T, '💫', 'tag', 24)
        var side = sideA ? 0 : 1
        cmb[side]++; cmb[1 - side] = 0
        if (cmb[side] > 1 && SP >= .8) {
            var cm = document.createElement('div'); cm.className = 'cmb'; cm.textContent = 'COMBO x' + cmb[side]; cm.style[sideA ? 'left' : 'right'] = '8%'; $('fx').appendChild(cm)
            cm.animate([{ transform: 'scale(2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: .2 }, { opacity: 0 }], { duration: 800 })
            setTimeout(function () { cm.remove() }, 820)
        }
        if (hpNow[ev.to] > 0) T.animate([{ transform: 'translateX(0)', filter: 'brightness(3)' }, { transform: 'translateX(' + dir * (ult ? 40 : 22) + 'px) rotate(' + dir * 6 + 'deg)', filter: 'brightness(1.5) sepia(1) hue-rotate(-30deg) saturate(5)', offset: .3 }, { transform: 'translateX(0)' }], { duration: 400 })
        await sleep(ult ? 280 : 200)
        A.getAnimations().forEach(function (x) { x.cancel() })
        A.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.12)' }, { transform: 'none' }], { duration: 220 * SP + 20, easing: 'ease-out' })
        $('vg').style.opacity = 0
        await sleep(ult ? 320 : 150)
        A.style.zIndex = ''
    }

    async function doDead(ev) {
        var i = ev.f, e = F[i]
        dead[i] = true; hpNow[i] = 0; bars(i)
        var finalKo = allDead('a') || allDead('b')
        if (skip) { e.classList.add('dead'); return }
        var dir = i < nA ? -1 : 1
        e.classList.add('dead')
        e.animate([{ transform: 'none' }, { transform: 'translateX(' + (-dir * 40) + 'px) translateY(-30px) rotate(' + (-dir * 40) + 'deg)', offset: .4 }, { transform: 'translateX(' + (-dir * 60) + 'px) translateY(30px) rotate(' + (-dir * 80) + 'deg)' }], { duration: 650 * SP + 80, fill: 'forwards' })
        if (finalKo) {
            $('cam').style.transform = 'scale(1.25)'
            $('ko').animate([{ opacity: 0, transform: 'scale(3)' }, { opacity: 1, transform: 'scale(1)', offset: .2 }, { opacity: 1 }, { opacity: 0 }], { duration: 1500 * SP + 200 })
            await sleep(1500)
            $('cam').style.transform = 'none'
        } else await sleep(420)
    }

    async function playEvents(b) {
        B = b
        var total = 0; b.rounds.forEach(function (r) { total += r.ev.length })
        SP = total > 70 ? .5 : total > 40 ? .75 : 1
        $('spd').textContent = SP < 1 ? '⏩ سريع' : '▶️ عادي'
        for (var ri = 0; ri < b.rounds.length; ri++) {
            var r = b.rounds[ri], rd = $('rd')
            rd.textContent = 'الجولة ' + r.no + (r.enrage ? ' 😡 +' + r.enrage + '%' : '')
            if (!skip) rd.animate([{ transform: 'scale(1.5)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300 })
            await sleep(350)
            for (var k = 0; k < r.ev.length; k++) {
                var ev = r.ev[k]
                if (ev.t == 'hit') await doHit(ev)
                else if (ev.t == 'dead') await doDead(ev)
                else if (ev.t == 'burn') { setHp(ev.f, ev.hp); float(F[ev.f], '🔥 -' + fmt(ev.dmg), 'burn', 0); await sleep(300) }
                else if (ev.t == 'stun') { float(F[ev.f], '💫 مذهول', 'tag', 0); await sleep(380) }
                else if (ev.t == 'dodge') {
                    var T = F[ev.to]; float(T, 'MISS 💨', 'tag', 0)
                    if (!skip) T.animate([{ transform: 'none' }, { transform: 'translateX(' + (ev.to < nA ? -34 : 34) + 'px)', offset: .4 }, { transform: 'none' }], { duration: 380 })
                    await sleep(380)
                }
            }
            await sleep(150)
        }
        if (b.timeout && !skip) { var bn = $('bn'); bn.textContent = '⌛ انتهت الجولات — الأعلى صحة يفوز'; bn.style.setProperty('--c', '#7b3cff'); bn.animate([{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { duration: 1500 }); await sleep(1500) }
    }

    async function playBattle(b, res) {
        skip = false; waiters = []; cmb = [0, 0]
        var bat = $('bat'); bat.style.display = 'block'; $('res').style.display = 'none'
        buildFigs(b)
        var lA = b.A[0].v, lB = b.B[0].v
        $('a1').innerHTML = esc(b.nameA) + (b.tA ? TB(b.tA, 1) : ''); $('a2').innerHTML = esc(b.nameB) + (b.tB ? TB(b.tB, 1) : '')
        setAv($('ma'), lA, lA.c); setAv($('mb'), lB, lB.c)
        ;['a', 'b'].forEach(function (s) { $('c' + s).style.width = '100%'; $('t' + s).style.width = '100%' })
        $('rd').textContent = ''
        $('ctl').style.display = 'none'
        // شاشة VS
        var sp = $('sp'); sp.style.display = 'flex'; sp.style.opacity = 1
        function side(arr, name, t) {
            return '<div class="c"><div class="vs3">' + arr.map(function (f) { return '<i style="--c:' + esc(f.v.c) + ';' + esc(avCss(f.v)) + '">' + avTxt(f.v) + '</i>' }).join('') + '</div>' + esc(name) + (t ? '<div class="ttw">' + TB(t, 1) + '</div>' : '') + '</div>'
        }
        sp.innerHTML = side(b.A, b.nameA, b.tA) + '<em>VS</em>' + side(b.B, b.nameB, b.tB)
        var c1 = sp.querySelectorAll('.c')
        c1[0].animate([{ transform: 'translateX(260px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: 'ease-out' })
        c1[1].animate([{ transform: 'translateX(-260px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: 'ease-out' })
        sp.querySelector('em').animate([{ transform: 'scale(4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 500, delay: 350, fill: 'backwards' })
        await sleep(1700)
        await sp.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 }).finished
        sp.style.display = 'none'
        $('ctl').style.display = 'flex'
        await playEvents(b)
        $('ctl').style.display = 'none'
        // ضمان الحالة النهائية (عند التخطي)
        b.A.concat(b.B).forEach(function (f, i) { if (hpNow[i] <= 0) F[i].classList.add('dead') })
        await result(res)
    }

    $('skip').onclick = function () { skip = true; waiters.splice(0).forEach(function (w) { w() }) }
    $('spd').onclick = function () { SP = SP < 1 ? 1 : .5; $('spd').textContent = SP < 1 ? '⏩ سريع' : '▶️ عادي' }

    // ═════════ النتيجة ═════════
    async function result(r) {
        skip = false
        me.mmr = r.mmrAfter; me.rank = r.rankAfter; me.fights = r.fights; cdUntil = Date.now() + 30000
        var box = $('res'); box.className = 'res ' + (r.win ? 'win' : 'lose'); box.style.display = 'flex'
        $('rt').textContent = r.win ? '🏆 فوز!' : '💀 خسارة'
        var rw = r.rewards
        var h = '<div class="dl ' + (r.delta >= 0 ? 'up' : 'dn2') + '">' + (r.delta >= 0 ? '+' : '') + r.delta + ' MMR</div>'
            + '<div class="rkline" style="--c:' + esc(r.rankAfter.color) + '">' + esc(r.rankAfter.label) + ' • ' + fmt(r.mmrAfter) + '</div>'
            + '<div class="pbar"><i id="pb"></i></div>'
        if (r.timeout) h += '<div class="note">⌛ انتهت الجولات — حُسمت بالصحة المتبقية</div>'
        if (rw) h += '<div class="rw"><span>💰 +' + fmt(rw.money) + '</span><span>⭐ +' + fmt(rw.xp) + '</span><span>' + esc(rw.box) + '</span></div>'
        if (r.rankChange == 'down') h += '<div class="note bad">🔻 تراجع رتبة: ' + esc(r.rankBefore.label) + ' ➜ ' + esc(r.rankAfter.label) + '</div>'
        h += '<div class="note">🎟️ قتالاتك المتبقية اليوم: ' + r.fights + '/' + r.max + '</div>'
        $('rdet').innerHTML = h
        var pb = $('pb'); pb.style.background = r.rankAfter.color
        var p0 = pctIn(r.mmrBefore, r.rankBefore), p1 = pctIn(r.mmrAfter, r.rankAfter)
        if (r.rankChange == 'up') {
            pb.style.width = p0 + '%'; await sleep(250)
            pb.style.transition = 'width .6s'; pb.style.width = '100%'; await sleep(700)
            pb.style.transition = 'none'; pb.style.width = '0%'; await sleep(60)
            pb.style.transition = 'width .6s'; pb.style.width = p1 + '%'
            await new Promise(function (ok) { setTimeout(ok, 700) })
            await promote(r.rankBefore, r.rankAfter)
        } else {
            pb.style.width = p0 + '%'; await sleep(250); pb.style.transition = 'width .8s'; pb.style.width = p1 + '%'
        }
    }
    function closeB() { $('bat').style.display = 'none'; $('res').style.display = 'none'; head(); show(tab) }
    $('rback').onclick = closeB

    // ═════════ 🎉 أنيميشن ترقية الرتبة ═════════
    function badge(r) { return '<div class="hx" style="--c:' + esc(r.color) + '"><div class="hx2"><span>' + esc(r.emoji) + '</span></div></div>' }
    async function promote(oldR, newR) {
        var P = $('promo'), wait = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms) }) }
        P.getAnimations().forEach(function (a) { a.cancel() })
        P.style.display = 'flex'
        P.style.setProperty('--n', newR.color); P.style.setProperty('--o', oldR.color)
        P.innerHTML = '<div class="pr-rays"></div><div class="pr-fx" id="prfx"></div>'
            + '<div class="pr-stage"><div class="pr-b old" id="pbo">' + badge(oldR) + '<b>' + esc(oldR.name) + '</b></div>'
            + '<div class="pr-b nw" id="pbn">' + badge(newR) + '<b>' + esc(newR.name) + '</b></div></div>'
            + '<div class="pr-t" id="prt">🎉 ترقية رتبة!</div>'
            + '<div class="pr-n" id="prn"><span style="color:' + esc(oldR.color) + '">' + esc(oldR.label) + '</span> <em>➜</em> <span style="color:' + esc(newR.color) + '">' + esc(newR.label) + '</span></div>'
            + '<button class="pr-ok" id="prok">متابعة</button>'
        var fx = $('prfx'), bo = $('pbo'), bn = $('pbn'), t = $('prt'), n = $('prn'), ok = $('prok')
        P.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, fill: 'forwards' })
        bo.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 450, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'forwards' })
        await wait(750)
        // يهتز ويتوهج قبل الانكسار
        bo.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-9px) rotate(-3deg)' }, { transform: 'translateX(9px) rotate(3deg)' }, { transform: 'translateX(-12px) rotate(-4deg)' }, { transform: 'translateX(12px) rotate(4deg)' }, { transform: 'translateX(0)' }], { duration: 520, iterations: 1 })
        bo.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(2.6) saturate(1.6)' }], { duration: 520, fill: 'forwards' })
        if (navigator.vibrate) { try { navigator.vibrate([40, 30, 90]) } catch (e) { } }
        await wait(560)
        // انفجار: شظايا + موجات + وميض
        P.animate([{ background: '#fff' }, { background: 'transparent' }], { duration: 420 })
        bo.style.visibility = 'hidden'
        var cx = innerWidth / 2, cy = innerHeight * 0.38
        for (var s = 0; s < 18; s++) {
            var sh = document.createElement('i'), a = s / 18 * 6.283 + Math.random() * .3, d = 120 + Math.random() * 160
            sh.className = 'shard'; sh.style.left = cx + 'px'; sh.style.top = cy + 'px'; sh.style.background = oldR.color
            sh.style.width = (8 + Math.random() * 14) + 'px'; sh.style.height = (8 + Math.random() * 14) + 'px'
            fx.appendChild(sh)
            sh.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px) rotate(' + (Math.random() * 720 - 360) + 'deg)', opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'forwards' })
        }
        for (var w = 0; w < 3; w++) {
            var rg = document.createElement('i'); rg.className = 'ring'; rg.style.left = cx + 'px'; rg.style.top = cy + 'px'; rg.style.borderColor = newR.color; fx.appendChild(rg)
            rg.style.opacity = 0
            rg.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: .9 }, { transform: 'translate(-50%,-50%) scale(5)', opacity: 0 }], { duration: 1100, delay: w * 170, easing: 'ease-out', fill: 'both' }).onfinish = (function (r) { return function () { r.remove() } })(rg)
        }
        await wait(140)
        // الرتبة الجديدة
        bn.style.visibility = 'visible'
        bn.animate([{ transform: 'scale(0) rotate(-200deg)', opacity: 0 }, { transform: 'scale(1.35) rotate(8deg)', opacity: 1, offset: .6 }, { transform: 'scale(1) rotate(0)', opacity: 1 }], { duration: 750, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' })
        P.querySelector('.pr-rays').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, fill: 'forwards' })
        // كونفيتي
        for (var c = 0; c < 70; c++) (function (c) {
            setTimeout(function () {
                var f = document.createElement('i'), cols = [newR.color, '#fff', '#ffe36b', oldR.color]
                f.className = 'conf'; f.style.left = (Math.random() * 100) + '%'; f.style.background = cols[c % 4]
                f.style.width = (6 + Math.random() * 6) + 'px'; f.style.height = (10 + Math.random() * 10) + 'px'
                fx.appendChild(f)
                f.animate([{ transform: 'translateY(-20px) rotate(0)', opacity: 1 }, { transform: 'translateY(' + (innerHeight + 40) + 'px) rotate(' + (Math.random() * 900) + 'deg)', opacity: .9 }], { duration: 2200 + Math.random() * 1600, easing: 'ease-in', fill: 'forwards' })
                setTimeout(function () { f.remove() }, 4000)
            }, c * 35)
        })(c)
        await wait(450)
        t.animate([{ transform: 'translateY(-60px) scale(.5)', opacity: 0 }, { transform: 'translateY(0) scale(1.1)', opacity: 1, offset: .6 }, { transform: 'none', opacity: 1 }], { duration: 650, easing: 'ease-out', fill: 'forwards' })
        await wait(450)
        n.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 500, fill: 'forwards' })
        await wait(700)
        ok.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: 'forwards' })
        ok.style.pointerEvents = 'auto'
        await new Promise(function (done) { ok.onclick = done; P.onclick = function (e) { if (e.target === P) done() } })
        await P.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished
        P.style.display = 'none'; P.innerHTML = ''; P.onclick = null
    }

    // ═════════ القتال من الخادم ═════════
    async function fight(i) {
        if (busy) return
        if (me.fights < 1) return toast('🚫 انتهت قتالاتك اليومية')
        var left = cdUntil - Date.now()
        if (left > 0) return toast('⏳ انتظر ' + Math.ceil(left / 1000) + ' ثانية')
        busy = true; btns()
        var r
        try {
            var resp = await fetch('/arena/fight', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf: csrf, i: i }) })
            r = await resp.json()
            if (resp.status == 401) { location.href = '/login?code=' + D.code; return }
        } catch (e) { r = { ok: false, message: 'تعذر الاتصال بالخادم' } }
        if (!r.ok) {
            busy = false
            if (r.code == 'COOLDOWN') cdUntil = Date.now() + (r.retryInMs || 30000)
            if (r.code == 'LIST') await refreshOpp()
            toast(r.message || 'تعذر القتال'); btns(); return
        }
        try { await playBattle(r.battle, r.result) } catch (e) { console.error(e); try { await result(r.result) } catch (e2) { } }
        busy = false
    }

    // ═════════ 🥊 محرّر الفريق ═════════
    var roster = null, sel = [], tq = '', tshown = 60, tbusy = false
    var TSIZE = 3, TSTEP = 60

    function closeTeam() {
        var S = $('tsheet'); S.classList.remove('on'); S.innerHTML = ''
        roster = null; sel = []; tq = ''; tshown = TSTEP; tbusy = false
    }

    async function openTeam() {
        if (busy) return
        var S = $('tsheet')
        S.classList.add('on')
        S.innerHTML = '<div class="tbox"><div class="tload">⏳ جارٍ تحميل شخصياتك…</div></div>'
        S.onclick = function (e) { if (e.target === S) closeTeam() }
        try {
            var resp = await fetch('/arena/roster', { credentials: 'same-origin' })
            if (resp.status == 401) { location.href = '/login?code=' + D.code; return }
            var r = await resp.json()
            if (!r.ok) { closeTeam(); toast(r.message || 'تعذر تحميل الشخصيات'); return }
            roster = r.roster || []
            if (!roster.length) { closeTeam(); toast('❌ لا تملك شخصيات'); return }
            sel = []
            ;(r.team || []).forEach(function (n) {
                for (var i = 0; i < roster.length; i++) if (roster[i].k === n) { sel.push(i); break }
            })
            tq = ''; tshown = TSTEP
            teamShell()
        } catch (e) { closeTeam(); toast('تعذر الاتصال بالخادم') }
    }

    function teamShell() {
        var S = $('tsheet')
        S.innerHTML = '<div class="tbox">'
            + '<div class="thd"><b>🥊 تشكيل فريق PvP</b><button class="tx" id="tx" aria-label="إغلاق">✕</button></div>'
            + '<div class="tsl" id="tsl"></div>'
            + '<div class="tpw" id="tpw"></div>'
            + '<input class="tq" id="tq" type="search" placeholder="🔍 ابحث باسم الشخصية…" autocomplete="off">'
            + '<div class="tgr" id="tgr"></div>'
            + '<div class="tft"><button class="t2" id="tauto">⚡ تلقائي (الأقوى)</button><button class="t1" id="tsave">💾 حفظ الفريق</button></div>'
            + '</div>'
        $('tx').onclick = closeTeam
        $('tq').oninput = function () { tq = this.value; tshown = TSTEP; teamList() }
        $('tgr').onclick = function (e) {
            var more = e.target.closest ? e.target.closest('.tmore') : null
            if (more) { tshown += TSTEP; teamList(); return }
            var card = e.target.closest ? e.target.closest('.tc') : null
            if (card) toggleSel(+card.getAttribute('data-i'))
        }
        $('tauto').onclick = function () { saveTeam(true) }
        $('tsave').onclick = function () { saveTeam(false) }
        teamSlots(); teamList()
    }

    function toggleSel(i) {
        var at = sel.indexOf(i)
        if (at >= 0) sel.splice(at, 1)
        else if (sel.length >= TSIZE) return toast('الفريق ممتلئ — أزل شخصية أولاً')
        else sel.push(i)
        teamSlots(); teamList()
    }

    function teamSlots() {
        var h = '', tot = 0
        for (var s = 0; s < TSIZE; s++) {
            var i = sel[s]
            if (i == null) { h += '<div class="ts empty"><span>＋</span><small>الخانة ' + (s + 1) + '</small></div>'; continue }
            var v = roster[i].v; tot += Number(v.p) || 0
            h += '<button class="ts" data-s="' + s + '" style="--c:' + esc(v.c) + '"><span class="tav" style="' + esc(avCss(v)) + '">' + avTxt(v) + '</span>'
                + '<b>' + esc(v.n) + '</b><small>⚔️ ' + fmt(v.p) + '</small></button>'
        }
        $('tsl').innerHTML = h
        ;[].forEach.call($('tsl').querySelectorAll('button.ts'), function (b) {
            b.onclick = function () { sel.splice(+b.getAttribute('data-s'), 1); teamSlots(); teamList() }
        })
        $('tpw').innerHTML = sel.length == TSIZE
            ? '⚔️ قوة الفريق: <b>' + fmt(tot) + '</b>'
            : 'اختر ' + (TSIZE - sel.length) + ' ' + (TSIZE - sel.length == 1 ? 'شخصية' : 'شخصيات') + ' إضافية'
        var sv = $('tsave'); if (sv) sv.disabled = tbusy || sel.length != TSIZE
    }

    function teamList() {
        var q = tq.trim().toLowerCase(), rows = []
        for (var i = 0; i < roster.length; i++) {
            var r = roster[i]
            if (q && String(r.v.n).toLowerCase().indexOf(q) < 0 && String(r.k).toLowerCase().indexOf(q) < 0) continue
            rows.push(i)
        }
        if (!rows.length) { $('tgr').innerHTML = '<div class="tnone">لا توجد نتائج</div>'; return }
        var h = ''
        rows.slice(0, tshown).forEach(function (i) {
            var v = roster[i].v, at = sel.indexOf(i)
            h += '<button class="tc' + (at >= 0 ? ' on' : '') + '" data-i="' + i + '" style="--c:' + esc(v.c) + '">'
                + (at >= 0 ? '<i class="tb">' + (at + 1) + '</i>' : '')
                + '<span class="tav" style="' + esc(avCss(v)) + '">' + avTxt(v) + '</span>'
                + '<b class="tn">' + esc(v.n) + '</b>'
                + '<small class="tp">⚔️ ' + fmt(v.p) + '</small></button>'
        })
        if (rows.length > tshown) h += '<button class="tmore">عرض المزيد (' + (rows.length - tshown) + ')</button>'
        var g = $('tgr'), keep = g.scrollTop
        g.innerHTML = h
        g.scrollTop = keep
    }

    async function saveTeam(auto) {
        if (tbusy) return
        if (!auto && sel.length != TSIZE) return toast('اختر ' + TSIZE + ' شخصيات')
        tbusy = true; teamSlots()
        $('tauto').disabled = true
        var r
        try {
            var resp = await fetch('/arena/team', {
                method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csrf: csrf, team: auto ? [] : sel.map(function (i) { return roster[i].k }) })
            })
            if (resp.status == 401) { location.href = '/login?code=' + D.code; return }
            r = await resp.json()
        } catch (e) { r = { ok: false, message: 'تعذر الاتصال بالخادم' } }
        if (!r.ok) {
            tbusy = false
            var a = $('tauto'); if (a) a.disabled = false
            if ($('tsl')) teamSlots()
            return toast(r.message || 'تعذر حفظ الفريق')
        }
        me = r.me; cdUntil = Math.max(cdUntil, Date.now() + (me.cdMs || 0))
        closeTeam(); head(); if (tab == 1) arena()
        toast(auto ? '⚡ رجع فريقك تلقائي (أقوى 3)' : '✅ تم حفظ فريقك')
    }

    document.addEventListener('keydown', function (e) { if (e.key == 'Escape' && $('tsheet').classList.contains('on')) closeTeam() })

    head(); arena()
    if (location.hash == '#demo-promo') promote(rankFor(TIERS[1] ? TIERS[1].min : 0), rankFor(TIERS[2] ? TIERS[2].min : 0))
}

const CSS = `
:root{--gold:#ffcf4a;--gold-dim:#8a6d1f;--red:#ff3860;--text:#fff;--text-dim:#bfaaf0;box-sizing:border-box}
*{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}html,body{height:100%}
body{background:#07050f;color:#fff;font-family:'Cairo',system-ui,Tahoma,sans-serif;overflow:hidden;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px)}
.bg{position:fixed;inset:0;z-index:-1;background:radial-gradient(ellipse at 50% 20%,#4a1d8f,#12072c 55%,#050309)}
.bg:after{content:"";position:absolute;inset:0;background:conic-gradient(from 0deg at 50% 25%,#ffffff0d 0 8deg,transparent 8deg 24deg);animation:spin 40s linear infinite;mask:radial-gradient(circle at 50% 25%,#000,transparent 70%);-webkit-mask:radial-gradient(circle at 50% 25%,#000,transparent 70%)}
@keyframes spin{to{transform:rotate(360deg)}}
.hud{display:flex;align-items:center;gap:8px;padding:10px 12px;background:linear-gradient(#000a,transparent)}
.pf{display:flex;align-items:center;gap:8px;flex:1;min-width:0;background:#1a0e3acc;border:1.5px solid #6b3fd4;border-radius:30px;padding:4px 14px 4px 4px}
.av{width:44px;height:44px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:22px;font-weight:900;background:radial-gradient(circle at 30% 25%,#fff8,var(--c) 45%,#1a0e3a);border:3px solid var(--c);box-shadow:0 0 14px var(--c)}
.pf>div:last-child{min-width:0;flex:1}.pf b{font-size:14px}.pf small{display:block;font-size:11px;color:#cbb8f5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb{height:5px;border-radius:4px;background:#0008;margin-top:3px;overflow:hidden}.rb i{display:block;height:100%;width:0;transition:width .6s}
.rn{font-size:10px;color:#9d8bd0;margin-top:1px}
.chip{background:#1a0e3acc;border:1.5px solid #6b3fd4;border-radius:20px;padding:6px 12px;font-size:13px;font-weight:700;white-space:nowrap}
.page{flex:1;overflow-y:auto;overflow-x:hidden;padding-bottom:84px}
.ttl{text-align:center;font-size:22px;font-weight:900;letter-spacing:1px;margin:6px 0 2px;text-shadow:0 0 16px #b06bff;background:linear-gradient(#fff,#d6b8ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{text-align:center;font-size:12px;color:#bfaaf0;margin-bottom:8px}
.team{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;margin:0 12px 4px}
.tm{width:30px;height:30px;border-radius:50%;border:2px solid var(--c);display:grid;place-items:center;font-size:13px;font-weight:900;box-shadow:0 0 8px var(--c)}
.team small{color:#d8c8ff;font-weight:800}
.hint{text-align:center;font-size:11px;color:#ffd84a;margin:2px 14px 0}.hint code{background:#0006;padding:1px 6px;border-radius:6px}
.empty{text-align:center;color:#bfaaf0;padding:40px 20px}
.car{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:14px calc(50% - 105px) 20px;scrollbar-width:none}.car::-webkit-scrollbar{display:none}
.gc{flex:none;width:210px;height:392px;scroll-snap-align:center;position:relative;border-radius:22px;padding:5px;background:linear-gradient(160deg,var(--c),#fff4 30%,var(--c) 60%,#0008);box-shadow:0 12px 30px #000a,0 0 24px var(--c);transform:scale(.88);opacity:.7;transition:transform .3s,opacity .3s,box-shadow .3s}
.gc.act{transform:scale(1);opacity:1;box-shadow:0 16px 40px #000c,0 0 40px var(--c)}
.in{height:100%;border-radius:18px;background:linear-gradient(180deg,#2a1558,#0e0620);overflow:hidden;position:relative;display:flex;flex-direction:column;align-items:center;padding:12px 10px}
.in:before{content:"";position:absolute;top:-30px;left:-30px;right:-30px;height:200px;background:radial-gradient(circle at 50% 60%,var(--c),transparent 65%);opacity:.55}
.rk{position:relative;font-size:12px;font-weight:800;background:#000a;border:1px solid var(--c);color:var(--c);border-radius:12px;padding:3px 12px}
.big{position:relative;width:104px;height:104px;border-radius:50%;margin:10px 0 6px;display:grid;place-items:center;font-size:48px;font-weight:900;border:4px solid #fff;box-shadow:0 0 0 4px var(--c),0 0 30px var(--c);animation:fl 3s ease-in-out infinite}
@keyframes fl{50%{transform:translateY(-7px)}}
.nm{position:relative;font-size:16px;font-weight:900;text-shadow:0 2px 6px #000;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.un{position:relative;font-size:10px;color:#bfaaf0}
.st{position:relative;display:flex;gap:6px;margin:8px 0 6px}.st div{background:#0009;border-radius:10px;padding:4px 8px;font-size:12px;font-weight:700}
.mt{position:relative;display:flex;gap:5px;margin-bottom:6px}.mt span{width:28px;height:28px;border-radius:50%;border:2px solid var(--c);display:grid;place-items:center;font-size:12px;font-weight:900}
.dif{position:relative;font-size:12px;font-weight:800;padding:3px 12px;border-radius:10px;color:#111;background:var(--d)}
.go{position:absolute;bottom:12px;left:12px;right:12px;padding:12px;border:0;border-radius:14px;font-family:inherit;font-size:17px;font-weight:900;color:#3a1500;background:linear-gradient(#ffe36b,#ff9a1f);box-shadow:0 5px 0 #a35200,0 8px 16px #ff9a1f66;animation:pl 1.4s infinite}
.go:active{transform:translateY(4px);box-shadow:0 1px 0 #a35200}.go:disabled{animation:none;filter:grayscale(.8) brightness(.7)}@keyframes pl{50%{filter:brightness(1.25)}}
.dots{display:flex;justify-content:center;gap:6px}.dots i{width:8px;height:8px;border-radius:50%;background:#fff3}.dots i.on{background:var(--gold);box-shadow:0 0 8px var(--gold);width:22px;border-radius:6px}
.rf:disabled{opacity:.55;filter:grayscale(.7)}
.rf{display:block;margin:14px auto 0;padding:9px 22px;border-radius:20px;border:1.5px solid #6b3fd4;background:#1a0e3a;color:#e0d0ff;font-family:inherit;font-weight:700;font-size:13px}
.hall{position:relative;height:300px;margin:6px 8px 0;display:flex;align-items:flex-end;justify-content:center;gap:6px}
.pd{width:31%;text-align:center;position:relative;animation:up .7s both}.pd:nth-child(1){animation-delay:.3s}.pd:nth-child(3){animation-delay:.15s}
@keyframes up{from{transform:translateY(80px);opacity:0}}
.pd .av{width:64px;height:64px;font-size:30px;margin:0 auto 4px}.pd.p1 .av{width:82px;height:82px;font-size:40px;border-color:var(--gold)}
.pd b{display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pd small{font-size:11px;color:#d8c8ff}
.crown{position:absolute;top:-30px;left:50%;transform:translateX(-50%);font-size:34px;animation:fl 2s infinite;filter:drop-shadow(0 0 10px var(--gold))}
.base{margin-top:6px;border-radius:12px 12px 0 0;display:grid;place-items:center;font-size:34px;font-weight:900;color:#0006;background:linear-gradient(#fff5,var(--c) 30%,#0008);border:2px solid var(--c);border-bottom:0;box-shadow:0 0 22px var(--c)}
.p1 .base{height:96px}.p2 .base{height:70px}.p3 .base{height:52px}
.rows{padding:0 12px}.row{display:flex;align-items:center;gap:10px;padding:8px 12px;margin-bottom:8px;border-radius:14px;background:linear-gradient(90deg,#1d1040,#140a2e);border:1px solid #3b2380;animation:inn .4s both;animation-delay:calc(var(--i)*.05s)}@keyframes inn{from{opacity:0;transform:translateX(30px)}}
.row .n{width:26px;text-align:center;font-weight:900;color:#bfaaf0}.row .av{width:38px;height:38px;font-size:18px;border-width:2px}.row b{font-size:14px}.row small{display:block;font-size:11px;color:#bfaaf0}.row .m{margin-inline-start:auto;font-weight:900;color:#4cc9ff}
.me2{border-color:var(--gold);box-shadow:0 0 14px #ffcf4a66}
.mypos{text-align:center;margin:10px 12px;padding:10px;border-radius:14px;border:1px solid var(--gold);color:var(--gold);font-weight:800}
.nav{position:fixed;bottom:0;left:0;right:0;display:flex;padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px));background:linear-gradient(#0000,#000d 30%);gap:10px;z-index:5}
.nav button{flex:1;padding:10px;border-radius:16px;border:2px solid #4b2f8a;background:#150d2b;color:#cbb8f5;font-family:inherit;font-weight:800;font-size:15px}.nav .on{background:linear-gradient(135deg,#7b3cff,#ff3d9a);color:#fff;border-color:#fff6;box-shadow:0 0 20px #7b3cffaa}
#toast{position:fixed;left:50%;top:70px;transform:translate(-50%,-20px);background:#000d;border:1px solid #7b3cff;color:#fff;padding:10px 18px;border-radius:14px;font-size:14px;font-weight:700;opacity:0;pointer-events:none;transition:.25s;z-index:80;max-width:90vw;text-align:center}#toast.on{opacity:1;transform:translate(-50%,0)}
/* ── المعركة ── */
#bat{display:none;position:fixed;inset:0;z-index:50;background:#05030c;overflow:hidden}
.cam{position:absolute;inset:0;transition:transform .6s}
.sky{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 35%,#5b2aa8,#1a0a3a 55%,#05030c)}.sky:before{content:"";position:absolute;inset:0;background:conic-gradient(from 0deg at 50% 45%,#ffffff12 0 6deg,transparent 6deg 18deg);animation:spin 30s linear infinite}
.fl3{position:absolute;left:-30%;right:-30%;bottom:0;height:46%;transform:perspective(500px) rotateX(62deg);transform-origin:50% 100%;background:repeating-linear-gradient(90deg,#fff2 0 2px,transparent 2px 60px),repeating-linear-gradient(0deg,#fff2 0 2px,transparent 2px 40px),linear-gradient(#3b1b78,#0b0520);border-top:3px solid #a47bff;box-shadow:0 -20px 60px #8f5bff66}
.top{position:absolute;top:calc(10px + env(safe-area-inset-top,0px));left:10px;right:10px;display:flex;gap:12px;z-index:5;direction:ltr}
.hb{flex:1;display:flex;align-items:center;gap:8px;min-width:0}.hb.r{flex-direction:row-reverse}
.mini{width:44px;height:44px;border-radius:50%;border:3px solid #fff;flex:none;box-shadow:0 0 12px #b06bff;overflow:hidden;display:grid;place-items:center;font-weight:900}
.hbar{flex:1;min-width:0}.hbar span{direction:rtl;display:block;font-size:12px;font-weight:800;text-shadow:0 1px 3px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hp{position:relative;height:14px;border-radius:8px;background:#000a;border:1.5px solid #fff5;overflow:hidden;transform:skewX(-14deg)}.hb.r .hp{transform:skewX(14deg)}
.hp .t{position:absolute;top:0;bottom:0;left:0;width:100%;background:#fff;transition:width .6s .35s}.hp .c{position:absolute;top:0;bottom:0;left:0;width:100%;background:linear-gradient(90deg,#b6ff5a,#2ee59d);transition:width .25s}
.hb.r .hp .t,.hb.r .hp .c{right:0;left:auto}
#rd{position:absolute;top:calc(66px + env(safe-area-inset-top,0px));left:0;right:0;text-align:center;z-index:5;font-weight:900;font-size:15px;text-shadow:0 2px 6px #000}
.fg{position:absolute;width:clamp(62px,19vw,92px);aspect-ratio:1/1.3}
.fgw{width:100%;height:100%;filter:drop-shadow(0 0 3px #fff) drop-shadow(0 0 14px var(--c,#b06bff));animation:fl 2.2s ease-in-out infinite}
.pt{width:100%;height:100%;font-weight:900;clip-path:polygon(50% 0,100% 18%,100% 80%,50% 100%,0 80%,0 18%)}
.fg:after{content:"";position:absolute;left:0;right:0;bottom:-14px;height:18px;border-radius:50%;background:radial-gradient(#000c,transparent 70%);z-index:-1}
.ftag{position:absolute;left:-10px;right:-10px;bottom:-30px;text-align:center;font-size:10px;font-weight:800;text-shadow:0 1px 3px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fhp{position:absolute;left:4px;right:4px;bottom:-17px;height:6px;border-radius:4px;background:#000a;border:1px solid #fff5;overflow:hidden}.fhp i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#b6ff5a,#2ee59d);transition:width .25s}
.fg.dead .fgw{filter:grayscale(1) brightness(.5);animation:none}.fg.dead{opacity:.55}
.fx{position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden}
.slash{position:absolute;height:7px;width:230px;margin:-3px 0 0 -115px;background:linear-gradient(90deg,transparent,#fff,#ffe36b,transparent);box-shadow:0 0 18px #fff,0 0 30px #ffb300;border-radius:4px}
.pa{position:absolute;width:10px;height:10px;margin:-5px;border-radius:50%;background:#ffe36b;box-shadow:0 0 10px #ff9a1f}
.dn,.cmb,.dl{direction:ltr;unicode-bidi:isolate}
.dn{position:absolute;font-weight:900;font-size:22px;color:#fff;text-shadow:-2px 0 #e0173f,2px 0 #e0173f,0 -2px #e0173f,0 2px #e0173f,0 0 14px #000;white-space:nowrap}.dn.cr{font-size:32px;color:#ffe36b}
.dn.heal{color:#7dffb0;text-shadow:-2px 0 #0a7a3c,2px 0 #0a7a3c,0 -2px #0a7a3c,0 2px #0a7a3c}.dn.burn{color:#ffb35a;font-size:18px}.dn.tag{font-size:17px;text-shadow:0 2px 6px #000,0 0 10px #7b3cff}
.cmb{position:absolute;top:26%;font-size:26px;font-weight:900;font-style:italic;color:#ffe36b;text-shadow:0 0 14px #ff9a1f,3px 3px 0 #a35200;z-index:6}
.vg{position:absolute;inset:0;z-index:4;background:radial-gradient(transparent 15%,#000f);opacity:0;pointer-events:none;transition:opacity .3s}.wf{position:absolute;inset:0;background:#fff;opacity:0;z-index:7;pointer-events:none}
.bn{position:absolute;top:36%;left:-120%;right:-120%;height:70px;z-index:8;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;font-style:italic;background:linear-gradient(90deg,transparent,var(--c,#b06bff),transparent);text-shadow:0 0 12px #000;opacity:0;pointer-events:none}
.ko{position:absolute;top:24%;left:0;right:0;text-align:center;font-size:84px;font-weight:900;font-style:italic;color:#ffe36b;text-shadow:0 0 30px #ff3860,5px 5px 0 #a3002a;z-index:8;opacity:0;pointer-events:none}
.sp{position:absolute;inset:0;z-index:9;background:radial-gradient(#2a1050,#000);display:flex;align-items:center;justify-content:center;gap:4px}.sp .c{width:34vw;max-width:150px;text-align:center;font-weight:900;font-size:14px}.sp .c .vs3{display:flex;justify-content:center;margin-bottom:8px}.sp .c i{display:grid;place-items:center;font-style:normal;font-size:22px;width:44px;height:58px;margin:0 -4px;clip-path:polygon(50% 0,100% 18%,100% 80%,50% 100%,0 80%,0 18%);border:0}.sp em{font-size:48px;color:#ff3860;text-shadow:0 0 20px #ff3860;font-style:italic}
#ctl{position:absolute;bottom:calc(14px + env(safe-area-inset-bottom,0px));left:0;right:0;display:none;justify-content:center;gap:10px;z-index:9}
#ctl button{padding:8px 18px;border-radius:14px;border:1.5px solid #fff5;background:#000a;color:#fff;font-family:inherit;font-weight:800;font-size:14px}
.res{display:none;position:absolute;inset:0;z-index:10;background:#000c;align-items:center;justify-content:center;flex-direction:column;gap:10px;text-align:center;padding:20px}.res h1{font-size:44px;animation:pop .6s}.res.win h1{color:var(--gold);text-shadow:0 0 30px var(--gold)}.res.lose h1{color:var(--red)}@keyframes pop{from{transform:scale(.2);opacity:0}}
#rdet{display:flex;flex-direction:column;gap:8px;align-items:center;width:100%;max-width:340px}
.dl{font-size:26px;font-weight:900}.dl.up{color:#7dffb0}.dl.dn2{color:#ff7b92}
.rkline{font-weight:900;font-size:17px;color:var(--c)}
.pbar{width:100%;height:10px;border-radius:6px;background:#fff2;overflow:hidden}.pbar i{display:block;height:100%;width:0}
.rw{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.rw span{background:#ffffff18;border:1px solid #fff3;border-radius:12px;padding:6px 12px;font-weight:800;font-size:14px}
.note{font-size:13px;color:#d8c8ff}.note.bad{color:#ff7b92;font-weight:800}
.res button{margin-top:10px;padding:10px 28px;border-radius:12px;border:0;background:#7b3cff;color:#fff;font-family:inherit;font-weight:800;font-size:15px}
/* ── محرّر الفريق ── */
.ted{margin-inline-start:4px;padding:5px 12px;border-radius:14px;border:1.5px solid #6b3fd4;background:#1a0e3a;color:#e0d0ff;font-family:inherit;font-weight:800;font-size:12px}
.ted:active{transform:scale(.95)}
#tsheet{display:none;position:fixed;inset:0;z-index:60;background:#000b;align-items:flex-end;justify-content:center}#tsheet.on{display:flex}
.tbox{width:100%;max-width:520px;max-height:88vh;max-height:88dvh;display:flex;flex-direction:column;gap:8px;padding:14px 12px calc(12px + env(safe-area-inset-bottom,0px));border-radius:22px 22px 0 0;background:linear-gradient(180deg,#2a1558,#0e0620);border:1.5px solid #6b3fd4;border-bottom:0;box-shadow:0 -10px 40px #000a;animation:shUp .28s ease-out}
@keyframes shUp{from{transform:translateY(60px);opacity:0}}
.tload,.tnone{text-align:center;color:#bfaaf0;padding:36px 12px;grid-column:1/-1}
.thd{display:flex;align-items:center;justify-content:space-between}.thd b{font-size:17px;font-weight:900}
.tx{width:34px;height:34px;border-radius:50%;border:1.5px solid #fff4;background:#0006;color:#fff;font-size:15px;font-family:inherit}
.tsl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ts{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:96px;padding:8px 4px;border-radius:14px;border:2px solid var(--c,#4b2f8a);background:#1a0e3a;color:#fff;font-family:inherit;box-shadow:0 0 12px color-mix(in srgb,var(--c,#4b2f8a) 55%,transparent)}
.ts.empty{border:2px dashed #4b2f8a;box-shadow:none;color:#8f7cc4;background:#ffffff08}.ts.empty span{font-size:26px;font-weight:900}
.ts b{max-width:100%;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ts small{font-size:11px;color:#d8c8ff;font-weight:700}
.tav{width:46px;height:46px;border-radius:50%;border:2px solid var(--c,#b06bff);display:grid;place-items:center;font-size:20px;font-weight:900;flex:none;box-shadow:0 0 10px var(--c,#b06bff)}
.tpw{text-align:center;font-size:13px;color:#d8c8ff}.tpw b{color:var(--gold)}
.tq{width:100%;padding:10px 14px;border-radius:14px;border:1.5px solid #4b2f8a;background:#150d2b;color:#fff;font-family:inherit;font-size:14px;outline:none}.tq:focus{border-color:#7b3cff}
.tgr{flex:1;min-height:140px;overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;align-content:start;padding:2px}
.tc{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 4px 8px;border-radius:14px;border:2px solid #3b2380;background:#1a0e3a;color:#fff;font-family:inherit}
.tc.on{border-color:var(--gold);box-shadow:0 0 14px #ffcf4a88;background:#2a1558}
.tc:active{transform:scale(.96)}
.tn{max-width:100%;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tp{font-size:10px;color:#bfaaf0;font-weight:700}
.tb{position:absolute;top:-6px;inset-inline-end:-4px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:900;color:#3a1500;background:linear-gradient(#ffe36b,#ff9a1f);box-shadow:0 2px 6px #000a}
.tmore{grid-column:1/-1;padding:10px;border-radius:14px;border:1.5px solid #6b3fd4;background:#1a0e3a;color:#e0d0ff;font-family:inherit;font-weight:800}
.tft{display:flex;gap:8px}
.tft button{flex:1;padding:12px;border-radius:14px;border:0;font-family:inherit;font-size:15px;font-weight:900}
.t1{color:#3a1500;background:linear-gradient(#ffe36b,#ff9a1f);box-shadow:0 4px 0 #a35200}.t1:active{transform:translateY(3px);box-shadow:0 1px 0 #a35200}
.t2{color:#e0d0ff;background:#1a0e3a;border:1.5px solid #6b3fd4!important}
.tft button:disabled{filter:grayscale(.8) brightness(.7);box-shadow:none}
/* ── ترقية الرتبة ── */
#promo{display:none;position:fixed;inset:0;z-index:90;background:radial-gradient(ellipse at 50% 38%,color-mix(in srgb,var(--n) 35%,#000),#000 75%);flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;overflow:hidden}
.pr-rays{position:absolute;left:50%;top:38%;width:160vmax;height:160vmax;margin:-80vmax 0 0 -80vmax;background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--n) 50%,transparent) 0 5deg,transparent 5deg 15deg);animation:spin 18s linear infinite;mask:radial-gradient(circle,#000,transparent 55%);-webkit-mask:radial-gradient(circle,#000,transparent 55%);opacity:0}
.pr-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.pr-stage{position:relative;width:200px;height:220px;margin-top:-40px}
.pr-b{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:20px;font-weight:900}.pr-b.nw{visibility:hidden}.pr-b b{text-shadow:0 0 14px var(--c)}
.pr-b.old b{color:var(--o)}.pr-b.nw b{color:var(--n)}
.hx{width:160px;height:176px;background:#fff;clip-path:polygon(50% 0,100% 18%,100% 80%,50% 100%,0 80%,0 18%);filter:drop-shadow(0 0 22px var(--c));display:grid;place-items:center;position:relative}
.hx:before{content:"";position:absolute;inset:0;background:linear-gradient(160deg,var(--c),#fff8 30%,var(--c) 60%,#000a)}
.hx2{position:relative;width:calc(100% - 12px);height:calc(100% - 12px);clip-path:polygon(50% 0,100% 18%,100% 80%,50% 100%,0 80%,0 18%);background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--c) 45%,#1a0e3a),#0e0620);display:grid;place-items:center}.hx2 span{font-size:68px;filter:drop-shadow(0 0 10px var(--c))}
.pr-b.nw .hx{animation:pulse 1.6s ease-in-out infinite}@keyframes pulse{50%{filter:drop-shadow(0 0 40px var(--c)) brightness(1.2)}}
.pr-t{font-size:34px;font-weight:900;opacity:0;color:#fff;text-shadow:0 0 22px var(--n),0 3px 0 #0008;margin-top:8px}
.pr-n{font-size:19px;font-weight:900;opacity:0;direction:ltr}.pr-n em{font-style:normal;color:#fff;margin:0 6px}
.pr-ok{opacity:0;pointer-events:none;margin-top:8px;padding:11px 36px;border-radius:14px;border:0;font-family:inherit;font-size:17px;font-weight:900;color:#1a0a00;background:linear-gradient(#ffe36b,#ff9a1f);box-shadow:0 5px 0 #a35200}
.shard{position:absolute;margin:-6px;clip-path:polygon(50% 0,100% 100%,0 80%)}
.ring{position:absolute;width:120px;height:120px;border:4px solid;border-radius:50%}
.conf{position:absolute;top:0;border-radius:2px}
`

function arenaPageHTML({ code, name, csrf, esc, NAV_BTN, drawer, data }) {
    const payload = JSON.stringify(Object.assign({ code }, data))
        .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')

    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>${TITLES.HEAD}<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#07050f"><title>الأرينا PvP</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;800;900&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body><div class="bg"></div>
<div class="hud">${NAV_BTN}<div class="pf"><div class="av" id="mav">😎</div><div><b>${esc(name)}</b>${TITLES.wrap(data && data.me && data.me.t, true)}<small id="mr"></small><div class="rb"><i id="rbar"></i></div><div class="rn" id="rnx"></div></div></div><div class="chip">🎟️ <span id="tk">0</span>/20</div></div>
<div class="page" id="pg"></div>
<div class="nav"><button class="on" id="n1">⚔️ الأرينا</button><button id="n2">🏆 القاعة</button></div>
<div id="toast"></div>
<div id="tsheet"></div>
<div id="bat"><div class="cam" id="cam"><div class="sky"></div><div class="fl3"></div></div>
<div class="top"><div class="hb"><div class="mini" id="ma"></div><div class="hbar"><span id="a1"></span><div class="hp"><div class="t" id="ta"></div><div class="c" id="ca"></div></div></div></div><div class="hb r"><div class="mini" id="mb"></div><div class="hbar"><span id="a2"></span><div class="hp"><div class="t" id="tb"></div><div class="c" id="cb"></div></div></div></div></div>
<div id="rd"></div>
<div class="vg" id="vg"></div><div class="fx" id="fx"></div><div class="wf" id="wf"></div><div class="bn" id="bn"></div><div class="ko" id="ko">K.O.</div><div class="sp" id="sp"></div>
<div id="ctl"><button id="spd">▶️ عادي</button><button id="skip">⏭ تخطي</button></div>
<div class="res" id="res"><h1 id="rt"></h1><div id="rdet"></div><button id="rback">رجوع</button></div></div>
<div id="promo"></div>
${drawer}
<script>(${arenaClient.toString()})(${payload})</script>
</body></html>`
}

module.exports = { arenaPageHTML }
