// 🌌 صفحة «عوالم الأنمي» بالموقع — systems/siteWorlds.js
// نفس بيانات ومنطق أوامر الواتساب (.العوالم / .انضم / .عالمي / .ترتيب_العوالم) عبر worlds.js
//
// الاستخدام (نفس أسلوب siteSssList):
//   const siteWorlds = require('./systems/siteWorlds').createSiteWorlds({ Player, worlds })
//   siteWorlds.data(userId)        → كائن JSON (الأسبوع، الأنظمة، الترتيب، العوالم، عالمك)
//   siteWorlds.join(userId, key)   → { ok, world } أو { ok:false, message }
//   siteWorlds.page({ apiBase })   → نص HTML للصفحة (apiBase = مسار الـ API لنفس اللاعب)

function createSiteWorlds({ Player, worlds, avatarOf }) {

    let avatarFn = typeof avatarOf === 'function' ? avatarOf : null
    let avatarCache = null // { v, at, map: userId → رابط الصورة }

    // بيانات الصفحة + صور بروفايل أصحاب الترتيب (أول شخصية فقط — بدون تحميل كل الشخصيات)
    async function data(userId, opts) {
        const hall = !!(opts && opts.hall)
        // الصفحة الرئيسية ما تحتاج الترتيب (صار بصفحة القاعة) — القاعة تطلب أول 100
        const v = worlds.getRankVersion() // نقرأها قبل التحميل: لو تغيّر شي أثناءه يلقطه الفحص التالي
        const d = await worlds.getOverview(userId, { topLimit: hall ? 100 : 0 })
        d.v = v
        try {
            const ids = (d.top || []).map(t => t._ownerId).filter(Boolean)
            // صور القاعة تُحمَّل مرة لكل نسخة ترتيب (مو لكل زائر ولكل تحديث)
            if (ids.length && (!avatarCache || avatarCache.v !== v || Date.now() - avatarCache.at > 5 * 60 * 1000)) {
                const docs = await Player.find({ userId: { $in: ids } }).select({ userId: 1, characters: { $slice: 1 } }).lean()
                const map = {}
                for (const x of docs) map[x.userId] = avatarFn ? (avatarFn(x) || null) : null
                avatarCache = { v, at: Date.now(), map }
            }
            for (const t of d.top || []) {
                t.img = (avatarCache && avatarCache.map[t._ownerId]) || null
                delete t._ownerId
            }
        } catch (e) {
            for (const t of d.top || []) delete t._ownerId
        }
        d.at = Date.now()
        return d
    }

    async function join(userId, worldKey) {
        return await worlds.joinFromSite(userId, String(worldKey || ''))
    }

    function page({ apiBase, backUrl, csrf, mode, hallUrl, worldsUrl } = {}) {
        return PAGE_HTML
            .replace(/__MODE__/g, () => (mode === 'hall' ? 'hall' : 'main'))
            .replace('__HALL_URL__', () => JSON.stringify(String(hallUrl || '')))
            .replace('__WORLDS_URL__', () => JSON.stringify(String(worldsUrl || '')))
            .replace('__API_BASE__', () => JSON.stringify(String(apiBase || '')))
            .replace('__BACK_URL__', () => JSON.stringify(String(backUrl || '')))
            .replace('__CSRF__', () => JSON.stringify(String(csrf || '')))
    }

    // 🔌 تسجيل المسارات (يُستدعى من characterSite.js — نفس نمط بقية الصفحات)
    //   GET  /u/:code/worlds           → الصفحة
    //   GET  /u/:code/worlds/hall      → صفحة قاعة التصنيف (مستقلة، بصفحات)
    //   GET  /u/:code/worlds/api/data  → بيانات الأسبوع والعوالم (JSON)
    //   POST /u/:code/worlds/api/join  → الانضمام لعالم { key, csrf }
    function mount(app, h) {
        const { auth, jsonBody, securityHeaders, CODE_RE, html404, ownerSession } = h
        if (typeof h.avatarOf === 'function') avatarFn = h.avatarOf

        const hits = new Map()
        function rate(userId, max = 30) {
            const now = Date.now()
            const arr = (hits.get(userId) || []).filter(t => now - t < 60000)
            if (arr.length >= max) { hits.set(userId, arr); return false }
            arr.push(now); hits.set(userId, arr)
            if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > 60000) hits.delete(k)
            return true
        }

        // يتحقق أن الجلسة تخص صاحب الكود (ونسخة الجلسة صالحة)
        async function sessionFor(req, code) {
            if (!CODE_RE.test(code)) return null
            const player = await Player.findOne({ siteCode: code }).select('userId sessionVersion').lean()
            if (!player) return null
            const sess = auth.readSession(req)
            if (!sess || sess.u !== player.userId || (sess.v || 0) !== (player.sessionVersion || 0)) return null
            return sess
        }

        function pageRoute(mode) {
            return async (req, res) => {
                try {
                    securityHeaders(res)
                    const code = String(req.params.code || '')
                    if (!CODE_RE.test(code)) return html404(res)
                    const player = await Player.findOne({ siteCode: code }).select('userId sessionVersion').lean()
                    if (!player) return html404(res)
                    const sess = ownerSession(req, player)
                    if (!sess) return res.redirect(303, `/login?code=${code}`)
                    res.send(page({
                        apiBase: `/u/${code}/worlds/api`,
                        backUrl: `/u/${code}`,
                        hallUrl: `/u/${code}/worlds/hall`,
                        worldsUrl: `/u/${code}/worlds`,
                        mode,
                        csrf: auth.csrfForSession(sess)
                    }))
                } catch (err) {
                    console.error('site worlds page error:', err)
                    res.status(500).send('خطأ بالخادم')
                }
            }
        }
        app.get('/u/:code/worlds', pageRoute('main'))
        app.get('/u/:code/worlds/hall', pageRoute('hall'))

        // 🪶 فحص خفيف: يرجع رقم نسخة الترتيب من الذاكرة (بدون قاعدة بيانات) — الصفحة تحمّل البيانات فقط لو تغيّر
        app.get('/u/:code/worlds/api/version', (req, res) => {
            res.set('Cache-Control', 'no-store')
            try {
                const sess = auth.readSession(req)
                if (!sess) return res.status(401).json({ ok: false })
                if (!rate(sess.u, 120)) return res.status(429).json({ ok: false })
                res.json({ ok: true, v: worlds.getRankVersion() })
            } catch (err) {
                res.status(500).json({ ok: false })
            }
        })

        app.get('/u/:code/worlds/api/data', async (req, res) => {
            res.set('Cache-Control', 'no-store')
            try {
                const sess = await sessionFor(req, String(req.params.code || ''))
                if (!sess) return res.status(401).json({ ok: false, message: 'انتهت الجلسة — سجّل الدخول من جديد.' })
                if (!rate(sess.u, 120)) return res.status(429).json({ ok: false, message: 'طلبات كثيرة، انتظر دقيقة.' })
                res.json(await data(sess.u, { hall: req.query.hall === '1' }))
            } catch (err) {
                console.error('site worlds data error:', err)
                res.status(500).json({ ok: false, message: 'خطأ بالخادم' })
            }
        })

        app.post('/u/:code/worlds/api/join', jsonBody, async (req, res) => {
            res.set('Cache-Control', 'no-store')
            try {
                if (!auth.authEnabled()) return res.status(503).json({ ok: false, message: 'الموقع غير مفعّل حالياً.' })
                if (!auth.sameOrigin(req)) return res.status(403).json({ ok: false, message: 'طلب غير مسموح.' })
                const sess = await sessionFor(req, String(req.params.code || ''))
                if (!sess) return res.status(401).json({ ok: false, message: 'انتهت الجلسة — سجّل الدخول من جديد.' })
                const b = req.body || {}
                if (!auth.verifyCsrf(sess, b.csrf)) return res.status(403).json({ ok: false, message: 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.' })
                if (!rate(sess.u, 10)) return res.status(429).json({ ok: false, message: 'طلبات كثيرة، انتظر دقيقة.' })
                res.json(await join(sess.u, b.key))
            } catch (err) {
                console.error('site worlds join error:', err)
                res.status(500).json({ ok: false, message: 'خطأ بالخادم' })
            }
        })
    }

    return { data, join, page, mount }
}

const PAGE_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0a0816">
<title>عوالم الأنمي</title>
<style>
:root{
  --bg:#0a0816; --bg2:#14102a; --card:#1a1535; --line:#3a2f6b;
  --gold:#f5c14b; --gold2:#ffe39a; --text:#f3eefc; --mut:#a89fcf;
  --pink:#ff5fa2; --cyan:#4de2ff; --green:#4ade80; --red:#ff5d6c;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;background:var(--bg);color:var(--text);
  font-family:"Segoe UI",Tahoma,"Noto Sans Arabic",system-ui,sans-serif;overflow-x:hidden}
body{padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)}
#stars{position:fixed;inset:0;z-index:0;pointer-events:none}
.aurora{position:fixed;inset:-20% -20% auto -20%;height:70vh;z-index:0;pointer-events:none;
  background:radial-gradient(40% 50% at 30% 40%,rgba(120,70,255,.35),transparent 70%),
             radial-gradient(35% 45% at 75% 30%,rgba(255,95,162,.25),transparent 70%),
             radial-gradient(30% 40% at 55% 70%,rgba(77,226,255,.18),transparent 70%);
  filter:blur(30px)}
@keyframes drift{from{transform:translate3d(-3%,0,0) scale(1)}to{transform:translate3d(4%,6%,0) scale(1.12)}}
.wrap{position:relative;z-index:1;max-width:760px;margin:0 auto;padding:16px 14px 90px}
.top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
.back{color:var(--gold2);text-decoration:none;font-size:14px;border:1px solid var(--line);
  padding:7px 12px;border-radius:12px;background:rgba(26,21,53,.7)}
h1{margin:6px 0 2px;font-size:28px;text-align:center;
  background:linear-gradient(90deg,var(--gold),#fff1c4,var(--gold));background-size:200% auto;
  -webkit-background-clip:text;background-clip:text;color:transparent;animation:shine 4s linear infinite}
@keyframes shine{to{background-position:200% center}}
.sub{text-align:center;color:var(--mut);font-size:13px;margin-bottom:14px}
.card{background:linear-gradient(160deg,rgba(26,21,53,.92),rgba(20,16,42,.92));
  border:1px solid var(--line);border-radius:18px;padding:14px;margin:12px 0;
  box-shadow:0 8px 30px rgba(0,0,0,.35),inset 0 0 0 1px rgba(245,193,75,.04);
  opacity:0;transform:translateY(18px);animation:rise .6s forwards}
@keyframes rise{to{opacity:1;transform:none}}
.card h2{margin:0 0 10px;font-size:17px;color:var(--gold2);display:flex;align-items:center;gap:8px}

/* العد التنازلي */
.timer{display:flex;gap:8px;justify-content:center;margin:6px 0 2px;direction:ltr}
.tbox{min-width:62px;text-align:center;background:#0f0b22;border:1px solid var(--line);border-radius:12px;padding:8px 6px}
.tbox b{display:block;font-size:24px;color:var(--gold);font-variant-numeric:tabular-nums}
.tbox span{font-size:11px;color:var(--mut)}

/* الأنظمة المحتسبة — بطاقات تنقلب */
.sys{display:grid;grid-template-columns:1fr 1fr;gap:10px;perspective:900px}
.sysc{position:relative;height:150px;transform-style:preserve-3d;
  animation:flip 1s cubic-bezier(.2,.8,.2,1) both}
.sysc:nth-child(2){animation-delay:.35s}
@keyframes flip{from{transform:rotateY(180deg) scale(.85);opacity:0}to{transform:none;opacity:1}}
.sysf{position:absolute;inset:0;border-radius:16px;padding:12px;text-align:center;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
  background:radial-gradient(circle at 50% 0,rgba(245,193,75,.22),rgba(26,21,53,.95) 65%);
  border:1px solid rgba(245,193,75,.55);box-shadow:0 0 22px rgba(245,193,75,.18);overflow:hidden}
.sysf::after{content:"";position:absolute;inset:-60% -30%;
  background:linear-gradient(100deg,transparent 40%,rgba(255,255,255,.18) 50%,transparent 60%);
  animation:sweep 3.2s ease-in-out infinite}
@keyframes sweep{0%{transform:translateX(-80%)}60%,100%{transform:translateX(80%)}}
.sysf .ic{font-size:36px;animation:bob 2.4s ease-in-out infinite}
@keyframes bob{50%{transform:translateY(-5px) scale(1.08)}}
.sysf b{font-size:14px;color:var(--gold2)}
.sysf small{font-size:11.5px;color:var(--mut);line-height:1.5}

/* عالمي */
.mine{display:flex;align-items:center;gap:14px}
.orbit{position:relative;width:96px;height:96px;flex:none}
.orbit .core{position:absolute;inset:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:38px;background:radial-gradient(circle,#2a1f5c,#120d2b);border:2px solid var(--gold);
  box-shadow:0 0 24px rgba(245,193,75,.55);animation:pulse 2.4s ease-in-out infinite}
.orbit i{position:absolute;inset:0;border-radius:50%;border:1px dashed rgba(245,193,75,.5);animation:spin 9s linear infinite}
.orbit i::after{content:"";position:absolute;top:-4px;left:50%;width:8px;height:8px;border-radius:50%;
  background:var(--cyan);box-shadow:0 0 12px var(--cyan)}
.orbit i:nth-child(2){inset:-8px;animation-duration:14s;animation-direction:reverse;border-color:rgba(255,95,162,.45)}
.orbit i:nth-child(2)::after{background:var(--pink);box-shadow:0 0 12px var(--pink)}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{50%{box-shadow:0 0 40px rgba(245,193,75,.9);transform:scale(1.04)}}
.mine .info b{font-size:19px;color:var(--gold2)}
.mine .info div{color:var(--mut);font-size:13.5px;margin-top:4px}
.mine .num{color:var(--gold);font-weight:700;font-size:22px}
.nojoin{text-align:center;color:var(--mut);font-size:14px;line-height:1.8}

/* الجوائز */
.pod{display:flex;flex-direction:column;gap:8px}
.prize{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:#120d2b;
  border:1px solid var(--line);opacity:0;transform:translateX(30px);animation:slide .5s forwards}
@keyframes slide{to{opacity:1;transform:none}}
.prize .m{font-size:26px;width:34px;text-align:center}
.prize .t{font-size:13px;line-height:1.55;color:var(--text)}
.prize.p1{border-color:var(--gold);box-shadow:0 0 18px rgba(245,193,75,.3)}
.prize.rest{border-style:dashed}

/* 🏛️ قاعة التصنيف (غاتشا) */
.live{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--green);margin:-4px 0 12px}
.live i{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green);animation:lv 1.4s infinite}
@keyframes lv{50%{opacity:.25}}
.pod3{display:flex;align-items:flex-end;gap:8px;margin-bottom:14px}
.gc{position:relative;flex:1;min-width:0;text-align:center;border-radius:18px;padding:16px 6px 12px;overflow:hidden;border:2px solid transparent;
  background:linear-gradient(#1b1438,#120d2b) padding-box,var(--fr) border-box;background-size:100% 100%,300% 300%;animation:holo 5s linear infinite}
@keyframes holo{0%{background-position:0 0,0% 50%}100%{background-position:0 0,300% 50%}}
.gc.fresh{opacity:0;transform:translateY(24px) scale(.9);animation:rise .6s forwards,holo 5s linear infinite}
.gc::after{content:"";position:absolute;top:0;bottom:0;width:40%;left:-60%;transform:skewX(-20deg);pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);animation:shn 3.6s infinite}
@keyframes shn{0%,60%{left:-60%}100%{left:130%}}
.gc.r1{--fr:linear-gradient(90deg,#ff5fa2,#f5c14b,#4de2ff,#a78bfa,#ff5fa2);padding-top:26px;box-shadow:0 0 34px -4px rgba(245,193,75,.55)}
.gc.r2{--fr:linear-gradient(90deg,#c084fc,#f5c14b,#c084fc);box-shadow:0 0 22px -6px #c084fc}
.gc.r3{--fr:linear-gradient(90deg,#4de2ff,#2b7fff,#4de2ff);box-shadow:0 0 22px -6px #4de2ff}
.gc .tg{position:absolute;top:6px;right:8px;font-size:11px;font-weight:900;letter-spacing:1px;color:var(--gold2)}
.gc .cr{position:absolute;top:2px;left:50%;transform:translateX(-50%);font-size:22px;animation:flt 2.2s ease-in-out infinite}
@keyframes flt{50%{transform:translate(-50%,-4px)}}
.av{position:relative;width:62px;height:62px;margin:0 auto 6px;border-radius:50%;border:2px solid var(--gold);background:#0c0820;
  display:flex;align-items:center;justify-content:center;font-size:28px}
.gc.r1 .av{width:78px;height:78px;box-shadow:0 0 24px var(--gold)}
.av img{width:100%;height:100%;border-radius:50%;object-fit:cover}
.av .wi{position:absolute;bottom:-6px;left:-6px;width:26px;height:26px;border-radius:50%;background:var(--card);border:1px solid var(--line);
  display:flex;align-items:center;justify-content:center;font-size:15px}
.gc b.n{display:block;font-size:12.5px;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gc small.o{display:block;font-size:11px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gc .sr{color:var(--gold);font-size:11px;letter-spacing:2px;margin-top:4px}
.gc .pt,.hr .pt{font-weight:900;color:var(--gold);font-size:20px;font-variant-numeric:tabular-nums}
.gc .sp{position:absolute;color:var(--gold2);font-size:12px;animation:tw 1.8s infinite}
@keyframes tw{50%{opacity:.1;transform:scale(.4)}}
.hr{position:relative;display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:14px;margin:7px 0;background:#120d2b;
  border:1px solid var(--line);border-right:4px solid var(--rc,#3a2f6b);overflow:hidden}
.hr.fresh{opacity:0;transform:translateX(24px);animation:rise .5s forwards}
.hr.me,.gc.me{outline:2px solid var(--cyan);outline-offset:2px}
.hr .rn{width:26px;text-align:center;font-weight:900;color:var(--mut);font-size:15px}
.hr .av{width:42px;height:42px;margin:0;font-size:20px}
.hr .av .wi{width:20px;height:20px;font-size:11px;bottom:-4px;left:-4px}
.hr .nm{flex:1;min-width:0}
.hr .nm b{display:block;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hr .nm small{color:var(--mut);font-size:11.5px}
.hr .tag{font-size:10px;font-weight:900;color:var(--rc,#a89fcf);margin-right:4px}
.mv{position:absolute;top:6px;left:8px;font-size:11px;font-weight:900;animation:mv 2.4s forwards}
.mv.up{color:var(--green)}.mv.dn{color:var(--red)}
@keyframes mv{0%{opacity:0;transform:translateY(8px)}15%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
.flash{animation:fl 1.2s}
@keyframes fl{30%{transform:scale(1.25);text-shadow:0 0 14px var(--gold)}}

/* الترتيب */
.row{position:relative;display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;margin:7px 0;
  background:#120d2b;border:1px solid var(--line);overflow:hidden;opacity:0;transform:translateY(14px);animation:rise .5s forwards}
.row .bar{position:absolute;inset:0 auto 0 0;width:0;background:linear-gradient(90deg,rgba(245,193,75,.28),rgba(245,193,75,.04));
  transition:width 1.2s cubic-bezier(.2,.8,.2,1);z-index:0}
.row>*{position:relative;z-index:1}
.row .rk{width:30px;text-align:center;font-size:20px}
.row .ic{font-size:26px}
.row .nm{flex:1;min-width:0}
.row .nm b{display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .nm small{color:var(--mut);font-size:12px}
.row .pt{font-weight:800;color:var(--gold);font-size:18px;font-variant-numeric:tabular-nums}
.row.me{border-color:var(--cyan);box-shadow:0 0 16px rgba(77,226,255,.35)}
.row.r1{border-color:var(--gold);box-shadow:0 0 22px rgba(245,193,75,.4)}
.empty{text-align:center;color:var(--mut);padding:14px;font-size:14px}

/* قائمة العوالم */
.search{width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:#0f0b22;color:var(--text);
  font-size:15px;outline:none;margin-bottom:10px}
.search:focus{border-color:var(--gold)}
.filters{display:flex;gap:8px;margin-bottom:10px}
.chip{flex:1;text-align:center;padding:8px;border-radius:12px;border:1px solid var(--line);background:#120d2b;color:var(--mut);font-size:13px;cursor:pointer}
.chip.on{color:#1a1200;background:linear-gradient(135deg,var(--gold),#ffd978);border-color:var(--gold);font-weight:700}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
@media(min-width:560px){.grid{grid-template-columns:repeat(4,1fr)}}
.w{position:relative;border-radius:16px;padding:12px 6px 10px;text-align:center;cursor:pointer;
  background:linear-gradient(160deg,#1d1740,#120d2b);border:1px solid var(--line);
  transition:transform .2s,box-shadow .2s;opacity:0;animation:rise .45s forwards}
.w:active{transform:scale(.95)}
.w .ic{font-size:30px;display:block}
.w b{display:block;font-size:12.5px;margin-top:5px;line-height:1.35;min-height:34px}
.w small{display:block;font-size:11px;color:var(--mut);margin-top:2px}
.w.free{border-color:rgba(74,222,128,.45)}
.w.free:hover{box-shadow:0 0 18px rgba(74,222,128,.35)}
.w.taken{opacity:.55;filter:grayscale(.6);cursor:default}
.w.mine{border-color:var(--gold);box-shadow:0 0 20px rgba(245,193,75,.5)}
.w .tag{position:absolute;top:6px;left:6px;font-size:13px}

/* نافذة التأكيد + البوابة */
.modal{position:fixed;inset:0;z-index:50;display:none;align-items:center;justify-content:center;
  background:rgba(5,3,14,.78);backdrop-filter:blur(6px);padding:20px}
.modal.on{display:flex;animation:fade .25s}
@keyframes fade{from{opacity:0}}
.box{width:100%;max-width:360px;text-align:center;background:linear-gradient(160deg,#241c4f,#120d2b);
  border:1px solid var(--gold);border-radius:22px;padding:22px 18px;box-shadow:0 0 50px rgba(245,193,75,.3);
  animation:pop .4s cubic-bezier(.2,1.4,.4,1)}
@keyframes pop{from{transform:scale(.7);opacity:0}}
.box .big{font-size:64px;animation:bob 2s ease-in-out infinite}
.box h3{margin:6px 0;color:var(--gold2);font-size:20px}
.box p{color:var(--mut);font-size:13px;line-height:1.7;margin:6px 0 14px}
.btns{display:flex;gap:10px}
.btn{flex:1;padding:12px;border-radius:14px;border:0;font-size:15px;font-weight:700;cursor:pointer}
.btn.go{background:linear-gradient(135deg,var(--gold),#ffd978);color:#1a1200}
.btn.no{background:#2a2250;color:var(--text)}
.btn:disabled{opacity:.6}
.portal{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:#05030e}
.portal.on{display:flex;animation:fade .3s}
.vortex{position:relative;width:260px;height:260px;border-radius:50%;
  background:conic-gradient(from 0deg,#7c3aed,#ff5fa2,#4de2ff,#f5c14b,#7c3aed);
  filter:blur(1px);animation:spin 1.1s linear infinite, grow 2.4s ease-in forwards;
  -webkit-mask:radial-gradient(circle,transparent 18%,#000 19%,#000 70%,transparent 72%);
  mask:radial-gradient(circle,transparent 18%,#000 19%,#000 70%,transparent 72%)}
@keyframes grow{from{transform:scale(.3)}to{transform:scale(5.5)}}
.portal .txt{position:absolute;text-align:center;z-index:2;animation:rise .8s .3s both}
.portal .txt .big{font-size:80px;display:block;animation:bob 1.2s infinite}
.portal .txt b{font-size:22px;color:var(--gold2);display:block;margin-top:6px}
/* ترقيم الصفحات */
.pg{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px}
.pgb{flex:1;max-width:120px;padding:10px 8px;border-radius:12px;border:1px solid var(--line);background:#120d2b;color:var(--gold2);
  font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
.pgb:disabled{opacity:.35;cursor:default}
.pgb:active:not(:disabled){transform:scale(.96)}
.pgi{font-size:13px;color:var(--mut);min-width:78px;text-align:center;font-variant-numeric:tabular-nums}
.only-hall{display:none}
body.mode-hall .only-main{display:none}
body.mode-hall .only-hall{display:block}
.myrk{text-align:center;color:var(--mut);font-size:13px;margin:0 0 12px}
.myrk b{color:var(--cyan)}
.toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0));transform:translateX(-50%) translateY(30px);
  z-index:90;background:#2b1020;border:1px solid var(--red);color:#ffd6dc;padding:12px 18px;border-radius:14px;
  opacity:0;transition:.35s;max-width:90%;text-align:center;font-size:14px}
.toast.on{opacity:1;transform:translateX(-50%)}
</style>
</head>
<body class="mode-__MODE__">
<canvas id="stars"></canvas>
<div class="aurora"></div>

<div class="wrap">
  <div class="top"><a class="back" id="back" href="#">‹ رجوع</a><span id="seasonTag" style="color:var(--mut);font-size:13px"></span></div>
  <h1 id="h1">🌌 عوالم الأنمي</h1>
  <div class="sub" id="subt">100 عالم — كل عالم لحاكم واحد فقط — والمنافسة أسبوعية!</div>
  <div style="text-align:center;margin-bottom:6px"><a class="back" id="sw" href="#"></a></div>

  <div class="card only-main" style="animation-delay:.05s">
    <h2>⏳ ينتهي الأسبوع بعد</h2>
    <div class="timer" id="timer"></div>
  </div>

  <div class="card only-main" style="animation-delay:.12s">
    <h2>🎲 أنظمة النقاط هذا الأسبوع</h2>
    <div class="sys" id="sys"></div>
    <div class="sub" style="margin:10px 0 0">يختار البوت نظامين مختلفين عشوائياً كل أسبوع — فقط هذه الأنظمة تُحتسب 🔥</div>
  </div>

  <div class="card only-main" style="animation-delay:.2s" id="mineCard"><h2>👑 عالمك</h2><div id="mine"></div></div>

  <div class="card only-main" style="animation-delay:.28s">
    <h2>🏆 الجوائز</h2>
    <div class="pod" id="prizes"></div>
  </div>

  <div class="card only-hall" id="hallCard" style="animation-delay:.1s">
    <h2>🏛️ قاعة التصنيف</h2>
    <div class="live"><i></i>مباشر — يتحدّث تلقائياً عند أي تغيير بالنقاط</div>
    <div class="myrk" id="myRank"></div>
    <div id="hallPod"></div>
    <div id="hallRows"></div>
    <div id="hallPg"></div>
  </div>

  <div class="card only-main" id="gridCard" style="animation-delay:.36s">
    <h2>🌍 اختر عالمك</h2>
    <input class="search" id="q" placeholder="🔎 ابحث باسم الأنمي...">
    <div class="filters">
      <div class="chip on" data-f="all">الكل</div>
      <div class="chip" data-f="free">✅ المتاح</div>
      <div class="chip" data-f="taken">🔒 المحجوز</div>
    </div>
    <div class="grid" id="grid"></div>
    <div id="gridPg"></div>
  </div>
</div>

<div class="modal" id="modal"><div class="box">
  <div class="big" id="mIcon">🌍</div>
  <h3 id="mName"></h3>
  <p>⚠️ العالم يكون لك وحدك، وما تقدر تغيّره أو تخرج منه حتى ينتهي الأسبوع.</p>
  <div class="btns"><button class="btn no" id="mNo">إلغاء</button><button class="btn go" id="mGo">🚪 ادخل العالم</button></div>
</div></div>

<div class="portal" id="portal"><div class="vortex"></div><div class="txt"><span class="big" id="pIcon"></span><b id="pName"></b></div></div>
<div class="toast" id="toast"></div>

<script>
(function(){
  var API = __API_BASE__, BACK = __BACK_URL__, CSRF = __CSRF__;
  var MODE = '__MODE__', HALL_URL = __HALL_URL__, WORLDS_URL = __WORLDS_URL__;
  var D = null, ver = null, filter = 'all', picked = null, endAt = 0;
  var GRID_PER = 12, gridPage = 1, HALL_PER = 10, hallPage = 1;

  function $(id){return document.getElementById(id)}
  function el(tag, cls, text){var e=document.createElement(tag); if(cls) e.className=cls; if(text!==undefined) e.textContent=text; return e}
  function fmt(n){return Number(n||0).toLocaleString('en-US')}
  function toast(msg){var t=$('toast'); t.textContent=msg; t.classList.add('on'); setTimeout(function(){t.classList.remove('on')},3200)}

  if(BACK){$('back').href=BACK}else{$('back').style.display='none'}
  (function(){
    var sw=$('sw');
    if(MODE==='hall'){
      $('h1').textContent='🏛️ قاعة التصنيف';
      $('subt').textContent='أقوى حكّام العوالم هذا الأسبوع';
      sw.textContent='🌍 اختر عالمك';sw.href=WORLDS_URL||'#';
    }else{
      sw.textContent='🏛️ قاعة التصنيف';sw.href=HALL_URL||'#';
    }
    if(!(MODE==='hall'?WORLDS_URL:HALL_URL))sw.style.display='none';
  })();

  /* ── ترقيم الصفحات (يظهر فقط عند وجود أكثر من صفحة) ── */
  function pager(host,page,pages,go){
    host.textContent='';
    if(pages<=1)return;
    var p=el('div','pg');
    var prev=el('button','pgb','→ السابق'),next=el('button','pgb','التالي ←');
    prev.type='button';next.type='button';
    prev.disabled=page<=1;next.disabled=page>=pages;
    prev.onclick=function(){go(page-1)};next.onclick=function(){go(page+1)};
    p.appendChild(prev);p.appendChild(el('span','pgi','صفحة '+page+' / '+pages));p.appendChild(next);
    host.appendChild(p);
  }

  /* ── نجوم الخلفية ── */
  (function(){
    var c=$('stars'),x=c.getContext('2d'),W,H,S=[];
    function size(){W=c.width=innerWidth;H=c.height=innerHeight;S=[];
      for(var i=0;i<50;i++)S.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.6+.3,s:Math.random()*.35+.05,p:Math.random()*6})}
    size();addEventListener('resize',size);
    var t=0;(function loop(){t+=.02;x.clearRect(0,0,W,H);
      for(var i=0;i<S.length;i++){var s=S[i];s.y+=s.s;if(s.y>H){s.y=-4;s.x=Math.random()*W}
        x.globalAlpha=.4+.6*Math.abs(Math.sin(t+s.p));x.fillStyle='#fff';x.beginPath();x.arc(s.x,s.y,s.r,0,6.283);x.fill()}
      requestAnimationFrame(loop)})();
  })();

  /* ── العد التنازلي ── */
  function tick(){
    var ms=Math.max(0,endAt-Date.now()),s=Math.floor(ms/1000);
    var d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),sc=s%60;
    var box=$('timer');box.textContent='';
    [[d,'يوم'],[h,'ساعة'],[m,'دقيقة'],[sc,'ثانية']].forEach(function(p){
      var b=el('div','tbox');b.appendChild(el('b','',String(p[0]).padStart(2,'0')));b.appendChild(el('span','',p[1]));box.appendChild(b)});
  }
  setInterval(function(){if(endAt)tick()},1000);

  function countUp(node,to){
    var from=0,t0=performance.now(),dur=1100;
    (function f(t){var k=Math.min(1,(t-t0)/dur);node.textContent=fmt(Math.round(from+(to-from)*(1-Math.pow(1-k,3))));if(k<1)requestAnimationFrame(f)})(t0);
  }

  /* ── الرسم ── */
  function render(){
    $('seasonTag').textContent='الأسبوع '+D.season+' • '+D.participants+'/'+D.total+' عالم محجوز';
    endAt=Date.now()+D.endsInMs;tick();
    if(MODE==='hall'){renderHall();return}

    var sys=$('sys');sys.textContent='';
    D.systems.forEach(function(s){
      var c=el('div','sysc'),f=el('div','sysf');
      f.appendChild(el('div','ic',s.icon));f.appendChild(el('b','',s.title));f.appendChild(el('small','',s.desc));
      c.appendChild(f);sys.appendChild(c)});

    var mine=$('mine');mine.textContent='';
    if(D.me){
      var w=el('div','mine'),o=el('div','orbit');o.appendChild(el('i'));o.appendChild(el('i'));o.appendChild(el('div','core',D.me.icon));
      var info=el('div','info');info.appendChild(el('b','',D.me.name));
      var l1=el('div','','📊 نقاطك: ');var n=el('span','num','0');l1.appendChild(n);info.appendChild(l1);
      info.appendChild(el('div','','🏅 ترتيبك: '+(D.me.rank?D.me.rank+' من '+D.participants:'—')));
      w.appendChild(o);w.appendChild(info);mine.appendChild(w);countUp(n,D.me.points);
    }else{
      mine.appendChild(el('div','nojoin','ما انضممت لأي عالم بعد 🌌\\nاختر عالمك من القائمة تحت وابدأ المنافسة!'));
      mine.firstChild.style.whiteSpace='pre-line';
    }

    var pr=$('prizes');pr.textContent='';
    var medals=['🥇','🥈','🥉','4️⃣','5️⃣'];
    D.rewards.forEach(function(r,i){
      var p=el('div','prize'+(i===0?' p1':''));p.style.animationDelay=(.1*i)+'s';
      p.appendChild(el('div','m',medals[i]));p.appendChild(el('div','t',r.text));pr.appendChild(p)});
    var rest=el('div','prize rest');rest.style.animationDelay='.6s';
    rest.appendChild(el('div','m','🎖️'));rest.appendChild(el('div','t','باقي المشاركين: '+D.participantReward));pr.appendChild(rest);

    drawGrid();
  }

  /* ── قاعة التصنيف ── */
  var hallPrev={},hallFirst=true;
  var RAR={1:['UR','★★★★★'],2:['SSR','★★★★'],3:['SR','★★★']};
  function avatar(t){
    var a=el('div','av');
    if(t.img){var im=document.createElement('img');im.src=t.img;im.alt='';im.referrerPolicy='no-referrer';im.loading='lazy';
      im.onerror=function(){im.remove();a.insertBefore(el('span','','👤'),a.firstChild)};a.appendChild(im)}
    else a.appendChild(el('span','','👤'));
    a.appendChild(el('span','wi',t.icon));return a;
  }
  function moveTag(card,t,old){
    if(!old)return;
    if(old.rank>t.rank)card.appendChild(el('span','mv up','▲ '+(old.rank-t.rank)));
    else if(old.rank<t.rank)card.appendChild(el('span','mv dn','▼ '+(t.rank-old.rank)));
  }
  function renderRows(fresh,quiet){
    var rows=$('hallRows'),T=D.top||[],rest=T.slice(3);
    rows.textContent='';
    var pages=Math.max(1,Math.ceil(rest.length/HALL_PER));
    if(hallPage>pages)hallPage=pages;if(hallPage<1)hallPage=1;
    rest.slice((hallPage-1)*HALL_PER,hallPage*HALL_PER).forEach(function(t,i){
      var old=quiet?null:hallPrev[t.key],rc=t.rank<=5?'#c084fc':t.rank<=10?'#4de2ff':'#3a2f6b';
      var r=el('div','hr'+(t.mine?' me':'')+(fresh?' fresh':''));r.style.setProperty('--rc',rc);
      if(fresh)r.style.animationDelay=(.4+.05*i)+'s';
      r.appendChild(el('div','rn',String(t.rank)));
      r.appendChild(avatar(t));
      var nm=el('div','nm');nm.appendChild(el('b','',t.name));
      var sm=el('small','',t.owner+(t.mine?' (أنت)':''));sm.appendChild(el('span','tag',t.rank<=5?'SR':t.rank<=10?'R':'N'));nm.appendChild(sm);r.appendChild(nm);
      var pt=el('div','pt',fmt(t.points));r.appendChild(pt);
      if(old&&t.points>old.points){pt.className+=' flash';r.appendChild(el('span','mv up','+'+(t.points-old.points)))}
      else moveTag(r,t,old);
      rows.appendChild(r);
    });
    pager($('hallPg'),hallPage,pages,function(p){
      hallPage=p;renderRows(false,true);
      $('hallCard').scrollIntoView({block:'start'});
    });
  }
  function renderHall(){
    var pod3=$('hallPod'),T=D.top||[],fresh=hallFirst;
    pod3.textContent='';$('hallRows').textContent='';$('hallPg').textContent='';
    var me=null;T.forEach(function(t){if(t.mine)me=t});
    var mr=$('myRank');mr.textContent='';
    if(me){mr.appendChild(document.createTextNode('🏅 ترتيبك: '));mr.appendChild(el('b','','#'+me.rank));mr.appendChild(document.createTextNode(' — '+fmt(me.points)+' نقطة'))}
    if(!T.length){pod3.appendChild(el('div','empty','ما فيه أحد انضم بعد — كن أول حاكم! 👑'));return}
    /* أول 3: ثابتين دائماً فوق */
    var pod=el('div','pod3'),order=[1,0,2];
    order.forEach(function(ix,pos){
      var t=T[ix];if(!t)return;var r=t.rank,old=hallPrev[t.key];
      var c=el('div','gc r'+r+(t.mine?' me':'')+(fresh?' fresh':''));
      if(fresh)c.style.animationDelay=(.15*pos)+'s';
      c.appendChild(el('span','tg',RAR[r][0]));
      if(r===1){c.appendChild(el('span','cr','👑'));
        for(var k=0;k<4;k++){var sp=el('span','sp','✦');sp.style.left=(10+k*26)+'%';sp.style.top=(18+(k%2)*36)+'%';sp.style.animationDelay=(k*.45)+'s';c.appendChild(sp)}}
      c.appendChild(avatar(t));
      c.appendChild(el('b','n',t.name));
      c.appendChild(el('small','o',t.owner+(t.mine?' (أنت)':'')));
      c.appendChild(el('div','sr',RAR[r][1]));
      var pt=el('div','pt','0');c.appendChild(pt);
      if(old&&t.points>old.points){pt.className+=' flash';c.appendChild(el('span','mv up','+'+(t.points-old.points)))}
      else moveTag(c,t,old);
      pod.appendChild(c);
      if(fresh)countUp(pt,t.points);else pt.textContent=fmt(t.points);
    });
    pod3.appendChild(pod);
    /* الباقي: صفحات */
    renderRows(fresh,false);
    hallPrev={};T.forEach(function(t){hallPrev[t.key]={rank:t.rank,points:t.points}});
    hallFirst=false;
  }

  function drawGrid(){
    var q=$('q').value.trim().toLowerCase(),g=$('grid');g.textContent='';
    var list=D.catalog.filter(function(w){
      if(filter==='free'&&w.taken)return false;if(filter==='taken'&&!w.taken)return false;
      if(q&&w.name.toLowerCase().indexOf(q)<0&&String(w.index)!==q)return false;
      return true});
    var pages=Math.max(1,Math.ceil(list.length/GRID_PER));
    if(gridPage>pages)gridPage=pages;if(gridPage<1)gridPage=1;
    var k=0;
    list.slice((gridPage-1)*GRID_PER,gridPage*GRID_PER).forEach(function(w){
      var c=el('div','w '+(w.mine?'mine':w.taken?'taken':'free'));c.style.animationDelay=(k++*.02)+'s';
      c.appendChild(el('span','tag',w.mine?'👑':w.taken?'🔒':'✅'));
      c.appendChild(el('span','ic',w.icon));c.appendChild(el('b','',w.name));
      c.appendChild(el('small','',w.mine?'عالمك':w.taken?w.owner:'متاح #'+w.index));
      if(!w.taken&&!D.me)c.onclick=function(){openModal(w)};
      else if(!w.taken&&D.me)c.onclick=function(){toast('أنت منضم لعالم أصلاً — ما تقدر تغيّره قبل نهاية الأسبوع')};
      g.appendChild(c)});
    if(!g.children.length)g.appendChild(el('div','empty','ما لقيت نتائج 🔎'));
    pager($('gridPg'),gridPage,pages,function(p){gridPage=p;drawGrid();$('gridCard').scrollIntoView({block:'start'})});
  }

  $('q').oninput=function(){gridPage=1;drawGrid()};
  Array.prototype.forEach.call(document.querySelectorAll('.chip'),function(c){
    c.onclick=function(){filter=c.getAttribute('data-f');gridPage=1;
      Array.prototype.forEach.call(document.querySelectorAll('.chip'),function(x){x.classList.toggle('on',x===c)});drawGrid()}});

  function openModal(w){picked=w;$('mIcon').textContent=w.icon;$('mName').textContent=w.name;$('modal').classList.add('on')}
  $('mNo').onclick=function(){$('modal').classList.remove('on');picked=null};

  $('mGo').onclick=function(){
    if(!picked)return;var btn=$('mGo');btn.disabled=true;
    fetch(API+'/join',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({key:picked.key,csrf:CSRF})})
      .then(function(r){return r.json()})
      .then(function(res){
        btn.disabled=false;$('modal').classList.remove('on');
        if(!res.ok){toast(res.message||'تعذّر الانضمام');load();return}
        $('pIcon').textContent=picked.icon;$('pName').textContent='أصبحت حاكم '+picked.name;
        $('portal').classList.add('on');
        setTimeout(function(){$('portal').classList.remove('on');load()},2600);
      })
      .catch(function(){btn.disabled=false;toast('تعذّر الاتصال، حاول مرة ثانية')});
  };

  function load(){
    fetch(API+'/data'+(MODE==='hall'?'?hall=1':''),{credentials:'same-origin'}).then(function(r){return r.json()})
      .then(function(d){D=d;ver=d.v;render()}).catch(function(){toast('تعذّر تحميل العوالم')});
  }
  /* يتحدّث فقط عند تغيّر نقطة/انضمام: نسأل رقم النسخة (خفيف) ونحمّل البيانات لو تغيّر */
  function check(){
    if(document.hidden||ver===null)return;
    fetch(API+'/version',{credentials:'same-origin'}).then(function(r){return r.json()})
      .then(function(j){if(j&&j.ok&&j.v!==ver)load()}).catch(function(){});
  }
  load();
  setInterval(check,15000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)check()});
})();
</script>
</body>
</html>`

module.exports = { createSiteWorlds }
