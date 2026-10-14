// =====================================================================
// systems/siteSssList.js
// 🌟 قائمة شخصيات SSS — /u/:code/sss  (نفس أمر .قائمة_sss بالبوت)
// - تقرأ الكتالوج الحي (نفس مصفوفة characters اللي يعدّلها .ص) وتبني الصفحة مرة واحدة فقط
//   وتحتفظ بها بالذاكرة (بدون أي حساب عند كل زيارة). تُعاد البناء فقط عند:
//     1) تعديل ملف characters.json (مراقبة بنظام الملفات — بدون أي تكلفة عند الطلبات)
//     2) تنفيذ أمر .ص (invalidate من index.js)
//     3) إعادة تشغيل البوت (يحمّل characters.json من جديد)
// - ترتيب أبجدي A-Z مع عناوين الحروف، وأي اسم لا يبدأ بحرف إنجليزي يروح لقسم #.
// - بطاقة خفيفة: صورة تغطي المربع كاملاً + الاسم والقوة والأنمي فقط (بدون إطار/توهج/أنميشن).
// - المعاينة مفتوحة لأي شخص عنده الرابط (بدون تسجيل دخول)؛ ومن سجّل دخوله تظهر له القائمة الجانبية.
// =====================================================================

const fs = require('fs')
const path = require('path')
const A_Z = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('')
const tok = l => (l === '#' ? '0' : l)   // رمز الحرف بالرابط: ?l=A ... ?l=0 لقسم #

function createSiteSssList({ Player, getCatalog }) {
    let cache = { at: 0, data: null }
    let view = null            // HTML الجاهز (شريط الحروف + الأقسام) — يُبنى مرة واحدة
    let lastMissing = -1

    function invalidate() { cache = { at: 0, data: null }; view = null }

    // 👁️ مراقبة ملف characters.json: أي تعديل عليه يمسح الكاش (حدث من نظام الملفات، بدون polling)
    try {
        const file = path.join(__dirname, '..', 'characters.json')
        let t = null
        fs.watch(file, () => { clearTimeout(t); t = setTimeout(invalidate, 500) }).on('error', () => {})
    } catch (e) { /* المراقبة اختيارية — يبقى invalidate() و إعادة التشغيل */ }

    function letterOf(name) {
        const clean = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^[^A-Za-z0-9\u0600-\u06FF]+/, '')
        const ch = clean.charAt(0).toUpperCase()
        return /[A-Z]/.test(ch) ? ch : '#'
    }
    const sortKey = name => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^[^A-Za-z0-9\u0600-\u06FF]+/, '').toLowerCase()

    function build(imgOf) {
        if (cache.data) return cache.data
        let cat = []
        try { cat = (typeof getCatalog === 'function' ? getCatalog() : []) || [] } catch (e) { cat = [] }

        const seen = new Set()
        const list = []
        for (const c of cat) {
            if (!c || c.rarity !== 'SSS' || !c.name) continue
            const key = `${c.name}|${c.form || ''}`
            if (seen.has(key)) continue
            seen.add(key)
            list.push({
                name: String(c.name),
                anime: String(c.anime || ''),
                power: Number(c.power) || 0,
                image: imgOf(c.image)
            })
        }
        list.sort((a, b) => {
            const la = letterOf(a.name), lb = letterOf(b.name)
            if (la === '#' && lb !== '#') return 1
            if (lb === '#' && la !== '#') return -1
            return sortKey(a.name).localeCompare(sortKey(b.name), 'en', { sensitivity: 'base' })
        })

        const groups = new Map()
        for (const c of list) {
            const l = letterOf(c.name)
            if (!groups.has(l)) groups.set(l, [])
            groups.get(l).push(c)
        }

        const missing = list.filter(c => !c.image).length
        if (missing !== lastMissing) {
            lastMissing = missing
            console.log(`🌟 SSS list: ${list.length} characters, ${missing} without a usable image`)
        }

        cache = { at: Date.now(), data: { list, groups }, }
        return cache.data
    }

    function mount(app, ctx) {
        const { securityHeaders, CODE_RE, html404, ownerSession, auth, esc, navDrawerHTML, NAV_BTN, shellHead, safeImageUrl, localCharImageUrl } = ctx

        const imgOf = img => {
            let u = null
            try { u = safeImageUrl(img) || (localCharImageUrl ? localCharImageUrl(img) : null) } catch (e) { u = null }
            return u
        }

        app.get('/u/:code/sss', async (req, res) => {
            try {
                securityHeaders(res)
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return html404(res)
                const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion').lean()
                if (!player) return html404(res)

                // مسجّل دخول؟ → قائمة جانبية. غير ذلك → معاينة فقط
                let sess = null
                try { sess = ownerSession(req, player) } catch (e) { sess = null }

                if (!view) {
                    const { list, groups } = build(imgOf)
                    const keys = [...groups.keys()]
                    const pages = new Map()
                    keys.forEach((l, idx) => {
                        const jump = A_Z.map(x => groups.has(x)
                            ? `<a href="?l=${tok(x)}"${x === l ? ' class="on" aria-current="page"' : ''}>${x}</a>`
                            : `<span>${x}</span>`).join('')
                        const cards = groups.get(l).map(c => `<div class="s3c"><div class="s3a"><span class="s3p">${esc(c.name.charAt(0).toUpperCase())}</span>${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}</div><div class="s3w">${c.power.toLocaleString('en')}</div><div class="s3t"><b dir="auto">${esc(c.name)}</b><small dir="auto">${esc(c.anime)}</small></div></div>`).join('')
                        const prev = keys[idx - 1], next = keys[idx + 1]
                        const pager = `<div class="s3n">${prev ? `<a href="?l=${tok(prev)}">السابق (${prev})</a>` : '<span></span>'}<b>${idx + 1} / ${keys.length}</b>${next ? `<a href="?l=${tok(next)}">التالي (${next})</a>` : '<span></span>'}</div>`
                        pages.set(l, { jump, pager, n: groups.get(l).length, html: `<section class="s3l"><h2>${l}<span>${groups.get(l).length}</span></h2><div class="s3g">${cards}</div></section>` })
                    })
                    view = { count: list.length, keys, pages }
                }
                // الصفحة = حرف واحد (?l=A) — الافتراضي أول حرف موجود
                const q = String(req.query.l || '').toUpperCase()
                const want = q === '0' ? '#' : q
                const cur = view.pages.has(want) ? want : view.keys[0]
                const pg = view.pages.get(cur) || { jump: A_Z.map(x => `<span>${x}</span>`).join(''), pager: '', n: 0, html: '' }
                const count = view.count

                const name = player.name || player.username || 'لاعب'
                const top = sess
                    ? `<span class="tb-l">${NAV_BTN}<span class="gmode">🌟 قائمة SSS</span></span>`
                    : `<span class="tb-l"><span class="gmode">🌟 قائمة SSS</span></span>`

                res.send(`${shellHead('🌟 قائمة SSS')}
<body>
${sess ? navDrawerHTML(code, auth.csrfForSession(sess), 'sss', name) : ''}
<div class="ssl">
  <div class="topbar">${top}<a class="pill" href="/u/${esc(code)}">← رجوع للعرض</a></div>
  <div class="ssl-h">شخصيات SSS في البوت <b>${count}</b></div>
  <nav class="s3j" aria-label="الحروف">${pg.jump}</nav>
  ${count ? pg.html + pg.pager : '<p class="ssl-e">لا توجد شخصيات SSS حالياً.</p>'}
</div>
<style>
html{scroll-behavior:smooth}
.ssl{max-width:900px;margin:0 auto;padding:0 12px 24px;font-family:'Cairo',sans-serif}
.ssl-h{margin:4px 2px 10px;font:800 15px 'Cairo',sans-serif;color:var(--text-dim,#8f98ad)}.ssl-h b{color:var(--gold,#f0c04a);margin-inline-start:6px}
.s3j{position:sticky;top:0;z-index:20;display:flex;gap:2px;overflow-x:auto;padding:8px 4px;margin:0 -12px 8px;background:rgba(10,13,22,.94);direction:ltr;scrollbar-width:none}
.s3j::-webkit-scrollbar{display:none}
.s3j a,.s3j span{flex:0 0 auto;min-width:30px;text-align:center;padding:5px 4px;border-radius:8px;font:800 14px 'Oswald','Cairo',sans-serif;text-decoration:none}
.s3j a{color:var(--gold,#f0c04a)}.s3j span{color:#4b536a}
.s3l{content-visibility:auto;contain-intrinsic-size:auto 700px;scroll-margin-top:52px}
.s3l h2{display:flex;align-items:center;gap:8px;margin:14px 2px 8px;font:700 26px 'Oswald',sans-serif;color:var(--gold,#f0c04a);direction:ltr}
.s3l h2 span{font:700 12px 'Cairo',sans-serif;color:var(--text-dim,#8f98ad);background:#0f1422;border-radius:10px;padding:1px 9px}
.s3g{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
@media (min-width:560px){.s3g{grid-template-columns:repeat(3,1fr)}}
@media (min-width:820px){.s3g{grid-template-columns:repeat(4,1fr)}}
.s3c{position:relative;aspect-ratio:4/5;border-radius:16px;overflow:hidden;background:#141a2b}
.s3a{position:absolute;inset:0}
.s3p{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:800 56px 'Oswald',sans-serif;color:#2a3250}
.s3a img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;display:block}
.s3c::after{content:"";position:absolute;left:0;right:0;bottom:0;height:46%;background:linear-gradient(transparent,rgba(0,0,0,.88));pointer-events:none}
.s3w{position:absolute;top:8px;left:8px;z-index:2;background:rgba(0,0,0,.62);color:#fff;border-radius:12px;padding:2px 10px;font:700 14px 'Oswald',sans-serif;font-variant-numeric:tabular-nums}
.s3t{position:absolute;left:6px;right:6px;bottom:9px;z-index:2;text-align:center;direction:ltr}
.s3t b{display:block;font:700 17px/1.15 'Oswald','Cairo',sans-serif;color:#fff;text-shadow:0 1px 4px #000;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.s3t small{display:block;margin-top:3px;font:600 12.5px 'Cairo',sans-serif;color:#ff6b86;text-shadow:0 1px 3px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s3j a.on{background:var(--gold,#f0c04a);color:#241800}
.s3n{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:18px 2px 4px}
.s3n a{border:1px solid rgba(240,192,74,.4);border-radius:12px;padding:8px 16px;color:var(--gold,#f0c04a);font:800 14px 'Cairo',sans-serif;text-decoration:none}
.s3n b{font:700 13px 'Cairo',sans-serif;color:var(--text-dim,#8f98ad)}
.ssl-e{color:var(--text-dim,#8f98ad);text-align:center;padding:40px 0}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
<script>document.addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='IMG')t.style.display='none'},true)</script>
</body></html>`)
            } catch (err) {
                console.error('sss list page error:', err)
                res.status(500).send('خطأ بالخادم')
            }
        })
    }

    return { mount, invalidate }
}

module.exports = { createSiteSssList }
