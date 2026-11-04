// =====================================================================
// systems/siteBoxes.js
// 🎁 صفحة الصناديق بالموقع — /u/:code/boxes + POST /boxes/open
// نفس منطق .فتح / .فتح_الكل بالواتس بالضبط (getRandomCharacterByBox + بونص البط + تحديث ذري)
// الفرق الوحيد: تختار العدد بشريط (مثلاً عندك 40 وتفتح 25) بدل فتح الكل أو واحد.
// القالب (CSS + HTML + JS): systems/boxesPage.html
// =====================================================================

const fs = require('fs')
const path = require('path')

const BOX_TYPES = ['basic', 'rare', 'epic', 'legendary', 'sss_chance', 'sss_high']
const MAX_PER_REQUEST = 100          // أقصى عدد بطلب واحد (حماية الخادم) — تقدر تفتح على دفعات
const RATE_PER_MIN = 20              // أقصى عدد طلبات فتح بالدقيقة للاعب
const XP_PER_BOX = true              // true = خبرة .فتح لكل صندوق (COMMAND_XP.openBox) · false = بدون خبرة مثل .فتح_الكل

function jsonForScript(o) {
    return JSON.stringify(o)
        .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

function create(deps) {
    const {
        Player, getRandomCharacterByBox, companionsData, addCommandXp, commandXp = 0,
        checkAndGrantAchievement, countSSS, getSock, getNotifyJid
    } = deps

    const hits = new Map()
    function rate(userId) {
        const now = Date.now()
        const arr = (hits.get(userId) || []).filter(t => now - t < 60000)
        if (arr.length >= RATE_PER_MIN) { hits.set(userId, arr); return false }
        arr.push(now); hits.set(userId, arr); return true
    }

    function boxesOut(p) {
        const out = {}
        for (const k of BOX_TYPES) out[k] = Number(p && p.boxes && p.boxes[k]) || 0
        return out
    }

    // 🦆 نفس بونص رفيق البط بالواتس
    function duckBonusOf(p) {
        if (p.companion && p.companion.key === 'duck' && (p.companion.level || 0) >= 1) {
            return companionsData.getCompanionBonus('duck', p.companion.level)
        }
        return 0
    }

    // ───────── الفتح (نفس .فتح_الكل لكن بعدد محدد) ─────────
    async function openBoxes(userId, type, count) {
        if (!BOX_TYPES.includes(type)) return { ok: false, code: 'TYPE', message: 'نوع الصندوق غير صحيح' }
        count = Math.floor(Number(count))
        if (!Number.isFinite(count) || count < 1) return { ok: false, code: 'COUNT', message: 'اختر عدداً صحيحاً' }
        if (count > MAX_PER_REQUEST) count = MAX_PER_REQUEST

        // قراءة خفيفة: الحقول المطلوبة فقط (بدون مصفوفة الشخصيات)
        const player = await Player.findOne({ userId }).select('userId boxes companion')
        if (!player) return { ok: false, code: 'NOACC', message: 'لا يوجد حساب' }

        const have = Number(player.boxes && player.boxes[type]) || 0
        if (have < 1) return { ok: false, code: 'NONE', message: 'لا تملك هذا الصندوق', boxes: boxesOut(player) }
        if (count > have) count = have

        const duckBonus = duckBonusOf(player)
        const rewards = []
        for (let i = 0; i < count; i++) {
            const c = getRandomCharacterByBox(type, duckBonus)
            if (c) rewards.push(c)
        }
        if (!rewards.length) return { ok: false, code: 'EMPTY', message: 'لا توجد شخصيات لهذا الصندوق' }
        const n = rewards.length

        const inc = { [`boxes.${type}`]: -n, boxesOpened: n }
        if (XP_PER_BOX && commandXp > 0 && typeof addCommandXp === 'function') {
            const gain = addCommandXp({ userId: player.userId, companion: player.companion, xp: 0 }, commandXp * n)
            if (gain > 0) inc.xp = gain
        }

        // ⚛️ تحديث ذري: يخصم ويضيف بعملية وحدة، بشرط أن الرصيد لسا يكفي
        // (لو فتحت من الواتس بنفس اللحظة ما ينعطى شي زيادة)
        const updated = await Player.findOneAndUpdate(
            { userId, [`boxes.${type}`]: { $gte: n } },
            { $inc: inc, $push: { characters: { $each: rewards } } },
            { new: true }
        )
        if (!updated) {
            const fresh = await Player.findOne({ userId }).select('boxes').lean()
            return { ok: false, code: 'CHANGED', message: 'تغيّر عدد صناديقك أثناء الفتح، حاول مرة ثانية.', boxes: boxesOut(fresh) }
        }

        // 🏆 نفس إنجازات الواتس (الإشعار يظهر بالموقع من checkAndGrantAchievement)
        try {
            const sock = getSock && getSock()
            const jid = getNotifyJid ? await getNotifyJid(userId) : null
            await checkAndGrantAchievement(updated, 'boxes', updated.boxesOpened, sock, jid)
            await checkAndGrantAchievement(updated, 'collection', countSSS(updated), sock, jid)
        } catch (e) { console.error('site boxes achievement error:', e && e.message) }

        return {
            ok: true,
            chars: rewards.map(c => ({
                name: String(c.name || ''), rarity: String(c.rarity || ''),
                power: Number(c.power) || 0, anime: String(c.anime || '')
            })),
            boxes: boxesOut(updated),
            opened: Number(updated.boxesOpened) || 0
        }
    }

    // ───────── مسارات الموقع ─────────
    function mount(app, ctx) {
        const { auth, jsonBody, securityHeaders, CODE_RE, html404, ownerSession, esc, navDrawerHTML, NAV_BTN, shellHead } = ctx
        const tpl = fs.readFileSync(path.join(__dirname, 'boxesPage.html'), 'utf8')

        function pageHTML({ viewer, code, state }) {
            const body = tpl
                .replace('__CSRF_JSON__', () => jsonForScript(viewer.csrf))
                .replace('__CODE_JSON__', () => jsonForScript(code))
                .replace('__STATE_JSON__', () => jsonForScript(state))
            return `${shellHead('الصناديق')}
<body><div style="padding:30px 16px 60px">
  <div class="topbar">
    <span class="tb-l">${NAV_BTN}<span class="gmode">🎁 الصناديق</span></span>
    <a class="pill" href="/u/${esc(code)}">← رجوع للعرض</a>
  </div>
  ${navDrawerHTML(code, viewer.csrf, 'boxes', viewer.name)}
  ${body}
</div></body></html>`
        }

        app.get('/u/:code/boxes', async (req, res) => {
            try {
                securityHeaders(res)
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return html404(res)
                const player = await Player.findOne({ siteCode: code })
                    .select('userId name username boxes boxesOpened sessionVersion').lean()
                if (!player) return html404(res)
                const sess = ownerSession(req, player)
                if (!sess) return res.redirect(303, `/login?code=${code}`)
                res.send(pageHTML({
                    viewer: { name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) },
                    code,
                    state: { boxes: boxesOut(player), opened: Number(player.boxesOpened) || 0 }
                }))
            } catch (err) {
                console.error('boxes page error:', err)
                res.status(500).send('خطأ بالخادم')
            }
        })

        app.post('/boxes/open', jsonBody, async (req, res) => {
            res.set('Cache-Control', 'no-store')
            const fail = (status, code, message, extra = {}) => res.status(status).json({ ok: false, code, message, ...extra })
            try {
                if (!auth.authEnabled()) return fail(503, 'DISABLED', 'الفتح من الموقع غير مفعّل حالياً.')
                if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')
                const sess = auth.readSession(req)
                if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
                const b = req.body || {}
                if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
                if (!rate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')

                const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
                if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

                const r = await openBoxes(sess.u, String(b.type || ''), b.count)
                if (!r.ok) return res.status(r.code === 'CHANGED' ? 409 : 400).json(r)
                res.json(r)
            } catch (err) {
                console.error('boxes open error:', err)
                return fail(500, 'SERVER', 'خطأ بالخادم، حاول لاحقاً.')
            }
        })

        // 🔄 قراءة خفيفة لأرقام الصناديق (تُستدعى لما يرجع اللاعب للصفحة من الواتس)
        const stateHits = new Map()
        function stateRate(userId) {
            const now = Date.now()
            const arr = (stateHits.get(userId) || []).filter(t => now - t < 60000)
            if (arr.length >= 30) { stateHits.set(userId, arr); return false }
            arr.push(now); stateHits.set(userId, arr); return true
        }

        app.get('/boxes/state', async (req, res) => {
            res.set('Cache-Control', 'no-store')
            try {
                if (!auth.authEnabled()) return res.status(503).json({ ok: false })
                const sess = auth.readSession(req)
                if (!sess) return res.status(401).json({ ok: false, code: 'AUTH' })
                if (!stateRate(sess.u)) return res.status(429).json({ ok: false, code: 'RATE' })

                const p = await Player.findOne({ userId: sess.u })
                    .select('boxes boxesOpened sessionVersion').lean()
                if (!p || (p.sessionVersion || 0) !== sess.v)
                    return res.status(401).json({ ok: false, code: 'AUTH' })

                res.json({ ok: true, boxes: boxesOut(p), opened: Number(p.boxesOpened) || 0 })
            } catch (e) {
                console.error('boxes state error:', e && e.message)
                res.status(500).json({ ok: false })
            }
        })
    }

    return { mount, openBoxes }
}

module.exports = { create }
