'use strict'

// 🏟️ أرينا PvP (النسخة 3) على الموقع — /u/<كود>/pvp  (ليس /arena: هذا المسار لساحة قتال التحدي بـ siteChallenge.js)
// نفس منطق أمر الواتساب `.قتال pvp` بالضبط: نفس systems/pvpBattle.js (فرق 3 شخصيات + معدات + سلاح + إيكو)،
// نفس قائمة الخصوم القريبين، نفس الكولداون (30ث) و20 قتال يومياً، نفس Elo والمكافآت (مال/خبرة/صندوق)،
// ونفس مهمة الأورب والإنجازات. الموقع يعرض إعادة مرئية للمعركة الحقيقية نفسها (لا يوجد عشوائية جانبية).

const pvpBattle = require('./pvpBattle')
const { arenaPageHTML } = require('./arenaPage')

const NEARBY_TTL = 10 * 60 * 1000      // نفس ذاكرة قائمة الواتساب
const COOLDOWN_MS = 30 * 1000          // نفس كولداون الواتساب
const DAILY_FIGHTS = 20
const DAILY_REFRESHES = 2             // تحديث قائمة الخصوم (🔄 خصوم جدد) مرتين يومياً

// ألوان الرتب (الاسم بدون الإيموجي) — الأسماء والحدود تؤخذ من getRank نفسها (utils/rank.js)
const RANK_COLORS = {
    'برونزي': '#e0894a',
    'ذهبي': '#ffcf4a',
    'بلاتيني': '#4cc9ff',
    'ألماسي': '#b06bff',
    'ماستر': '#ff5fd2',
    'أسطوري': '#ffcf4a'
}

// الحقول التي يحتاجها charView فقط (تخفيف الاستعلامات)
const CHAR_PROJ =
    'characters.name characters.rarity characters.form characters.evolutionLevel ' +
    'characters.image characters.customImage characters.anime characters.power'

function num(v, d = 0) {
    const n = Number(v)
    return Number.isFinite(n) ? n : d
}

module.exports = function createSiteArena(deps) {
    const {
        Player, getTotalStats, equipmentSystem, getWeaponBonus, companionsData,
        getRank, applyDogBonus, getSaudiDate, orbs, checkAndGrantAchievement,
        getSock, getNotifyJid
    } = deps

    // ── جدول الرتب: يُستخرج من getRank نفسها فلا يخرج عن rank.js لو تغيّرت الحدود ──
    const TIERS = []
    {
        let last = null
        for (let m = 0; m <= 8000; m++) {
            const label = String(getRank(m))
            if (label !== last) {
                const parts = label.split(' ')
                const name = parts.slice(1).join(' ') || label
                TIERS.push({ min: m, label, emoji: parts[0], name, color: RANK_COLORS[name] || '#b06bff' })
                last = label
            }
        }
    }

    function rankInfo(mmr) {
        const m = Math.max(0, num(mmr))
        let i = 0
        for (let k = 0; k < TIERS.length; k++) if (m >= TIERS[k].min) i = k
        const t = TIERS[i]
        const nx = TIERS[i + 1] || null
        return { label: t.label, emoji: t.emoji, name: t.name, color: t.color, min: t.min, next: nx ? nx.min : null, nextLabel: nx ? nx.label : null }
    }

    const today = () => Number(getSaudiDate().replace(/-/g, ''))
    const fightsLeftOf = p => (p.lastPvpReset === today() ? (p.pvpFights || 0) : DAILY_FIGHTS)
    // تحديثات الخصوم المتبقية اليوم (تُصفَّر مع تغيّر اليوم بتوقيت السعودية مثل القتالات)
    const refreshesLeftOf = p => (p.arenaRefreshDay === today() ? Math.max(0, DAILY_REFRESHES - (p.arenaRefreshes || 0)) : DAILY_REFRESHES)

    // 🎁 نفس خريطة صناديق الواتساب (المفتاح = اسم الرتبة بدون الإيموجي)
    const RANK_BOX_MAP = {
        'برونزي': { key: 'basic', label: '📦 صندوق عادي' },
        'فضي': { key: 'rare', label: '🎁 صندوق نادر' },
        'ذهبي': { key: 'epic', label: '✨ صندوق ملحمي' },
        'بلاتيني': { key: 'legendary', label: '👑 صندوق أسطوري' },
        'ألماسي': { key: 'legendary', label: '👑 صندوق أسطوري' },
        'ماستر': { key: 'sss_chance', label: '🌟 صندوق فرصة SSS' },
        'أسطوري': { key: 'sss_high', label: '💎 صندوق SSS عالي' }
    }
    // getRank يرجع '🥈 ذهبي' (إيموجي + اسم) → نأخذ الاسم فقط
    const rankKeyOf = r => String(r || '').replace(/^\S+\s+/, '').trim()

    // نفس إضافات النمر/الدب بأمر الواتساب
    const companionExtras = (p) => {
        const out = { critRate: 0, damageReduction: 0 }
        const c = p.companion
        if (c && (c.level || 0) >= 1) {
            if (c.key === 'tiger') out.critRate = companionsData.getCompanionBonus('tiger', c.level)
            if (c.key === 'bear') out.damageReduction = companionsData.getCompanionBonus('bear', c.level)
        }
        return out
    }

    const battleDeps = {
        getTotalStats,
        equipmentSystem,
        getWeaponBonus,
        getExtras: companionExtras
    }

    const nearbyLists = new Map()   // userId -> { at, ids }
    const fightLocks = new Set()
    const refreshLocks = new Set()
    const hits = new Map()

    function rate(userId, max = 40) {
        const now = Date.now()
        const arr = (hits.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= max) { hits.set(userId, arr); return false }
        arr.push(now); hits.set(userId, arr); return true
    }

    let hallCache = { at: 0, rows: [] }

    function mount(app, ctx) {
        const {
            auth, jsonBody, securityHeaders, CODE_RE, html404, ownerSession, esc,
            navDrawerHTML, NAV_BTN, bossSession, charView
        } = ctx

        // صورة/لون الشخصية للعرض (حسب سياسة الموقع: الصور من SSS وفوق فقط)
        const view = (c, req) => {
            try { return charView(c, req) } catch (e) { return { n: String((c && c.name) || '—'), r: '', c: '#b06bff', s: '', k: 0, en: false, p: num(c && c.power), i: null } }
        }

        const teamView = (p, req) => pvpBattle.resolveTeamCharacters(p).characters.map(c => view(c, req))

        function meView(p, req) {
            const { auto } = pvpBattle.resolveTeamCharacters(p)
            return {
                name: p.name || p.username || 'لاعب',
                mmr: num(p.mmr),
                rank: rankInfo(p.mmr),
                power: pvpBattle.teamPower(p),
                team: teamView(p, req),
                auto,
                fights: fightsLeftOf(p),
                max: DAILY_FIGHTS,
                refreshes: refreshesLeftOf(p),
                maxRef: DAILY_REFRESHES,
                cdMs: p.lastPvP ? Math.max(0, COOLDOWN_MS - (Date.now() - p.lastPvP)) : 0
            }
        }

        // 📋 نفس منطق قائمة الخصوم القريبين بأمر `.قتال pvp` (أقرب 10 بالـMMR ثم 5 عشوائيين)
        async function makeOpponents(me, req) {
            const userId = me.userId
            const myMmr = me.mmr || 0
            const myPower = pvpBattle.teamPower(me)

            let found = []
            for (const range of [150, 300, 600, 1200, 1000000]) {
                found = await Player.find(
                    {
                        userId: { $ne: userId },
                        'characters.0': { $exists: true },
                        mmr: { $gte: myMmr - range, $lte: myMmr + range }
                    },
                    'userId name username mmr rank pvpBattleTeam characters.name characters.power'
                ).limit(40).lean()
                if (found.length >= 5) break
            }

            if (!found.length) { nearbyLists.delete(userId); return [] }

            const closest = found
                .sort((a, b) => Math.abs((a.mmr || 0) - myMmr) - Math.abs((b.mmr || 0) - myMmr))
                .slice(0, 10)
                .sort(() => Math.random() - 0.5)
                .slice(0, 5)
                .sort((a, b) => (b.mmr || 0) - (a.mmr || 0))

            const ids = closest.map(p => p.userId)
            nearbyLists.set(userId, { at: Date.now(), ids })

            // تفاصيل العرض (صور الفريق) لخمسة لاعبين فقط
            const full = await Player.find({ userId: { $in: ids } })
                .select('userId name username mmr pvpBattleTeam ' + CHAR_PROJ).lean()
            const byId = new Map(full.map(p => [p.userId, p]))

            return closest.map((p, i) => {
                const f = byId.get(p.userId) || p
                const power = pvpBattle.teamPower(p)
                let level = 'even'
                if (myPower > 0) {
                    const ratio = power / myPower
                    if (ratio > 1.15) level = 'hard'
                    else if (ratio < 0.87) level = 'easy'
                }
                return {
                    i,
                    name: p.name || 'لاعب',
                    username: p.username || '',
                    mmr: num(p.mmr),
                    rank: rankInfo(p.mmr),
                    power,
                    level,
                    team: teamView(f, req)
                }
            })
        }

        async function loadMe(userId) {
            return Player.findOne({ userId })
                .select('userId name username mmr pvpBattleTeam pvpFights lastPvpReset lastPvP companion arenaRefreshDay arenaRefreshes ' + CHAR_PROJ)
                .lean()
        }

        // 🏆 القاعة: أعلى 30 بالـMMR (كاش دقيقة)
        async function hall(req, meP) {
            if (Date.now() - hallCache.at > 60 * 1000) {
                const top = await Player.find({ 'characters.0': { $exists: true }, mmr: { $gt: 0 } })
                    .sort({ mmr: -1 }).limit(30)
                    .select('userId name username mmr ' + CHAR_PROJ + ' pvpBattleTeam').lean()
                hallCache = {
                    at: Date.now(),
                    rows: top.map(p => ({
                        userId: p.userId,
                        name: p.name || 'لاعب',
                        username: p.username || '',
                        mmr: num(p.mmr),
                        rank: rankInfo(p.mmr),
                        power: pvpBattle.teamPower(p),
                        av: teamView(p, null)[0] || null
                    }))
                }
            }
            const rows = hallCache.rows.map((r, i) => ({ ...r, pos: i + 1, me: r.userId === meP.userId, userId: undefined }))
            let myPos = rows.findIndex(r => r.me) + 1
            if (!myPos) {
                myPos = 1 + await Player.countDocuments({ 'characters.0': { $exists: true }, mmr: { $gt: num(meP.mmr) } })
            }
            return { rows, myPos }
        }

        // ── الصفحة ──
        app.get('/u/:code/pvp', async (req, res) => {
            try {
                securityHeaders(res)
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return html404(res)

                const owner = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion').lean()
                if (!owner) return html404(res)

                const sess = ownerSession(req, owner)
                if (!sess) return res.redirect(303, `/login?code=${code}`)

                const me = await loadMe(owner.userId)
                if (!me) return html404(res)

                const opponents = await makeOpponents(me, req)
                const name = owner.name || owner.username || 'لاعب'
                const csrf = auth.csrfForSession(sess)

                res.send(arenaPageHTML({
                    code, name, csrf, esc,
                    NAV_BTN,
                    drawer: navDrawerHTML(code, csrf, 'arena', name),
                    data: {
                        me: meView(me, req),
                        opponents,
                        tiers: TIERS.map(t => ({ min: t.min, label: t.label, emoji: t.emoji, name: t.name, color: t.color })),
                        csrf
                    }
                }))
            } catch (err) {
                console.error('arena page error:', err)
                res.status(500).send('خطأ بالخادم')
            }
        })

        // 🔄 خصوم جدد
        app.get('/arena/opponents', async (req, res) => {
            res.set('Cache-Control', 'no-store')
            let lock = null
            try {
                if (!auth.authEnabled()) return res.status(503).json({ ok: false })
                const sess = await bossSession(req)
                if (!sess) return res.status(401).json({ ok: false, message: 'انتهت الجلسة — سجّل الدخول من جديد.' })
                if (!rate(sess.u, 30)) return res.status(429).json({ ok: false, message: 'طلبات كثيرة، انتظر دقيقة.' })
                if (refreshLocks.has(sess.u)) return res.status(409).json({ ok: false, message: 'جارٍ تحديث الخصوم…' })
                refreshLocks.add(sess.u); lock = sess.u
                const me = await loadMe(sess.u)
                if (!me) return res.status(404).json({ ok: false })

                // التحديث يُحتسب فقط لو عندك قائمة حيّة (أقل من 10 دقائق). قائمة منتهية/غير موجودة = توليد مجاني لأنه ضروري للقتال.
                const saved = nearbyLists.get(me.userId)
                const live = !!saved && (Date.now() - saved.at <= NEARBY_TTL)
                if (live && refreshesLeftOf(me) < 1) {
                    return res.status(429).json({
                        ok: false, code: 'NOREFRESH',
                        message: '🚫 انتهت تحديثات الخصوم اليومية (' + DAILY_REFRESHES + '/' + DAILY_REFRESHES + ') — تتجدد الساعة 12 صباحاً بتوقيت السعودية'
                    })
                }

                const opponents = await makeOpponents(me, req)

                if (live && opponents.length) {
                    const d = today()
                    const used = DAILY_REFRESHES - refreshesLeftOf(me) + 1
                    // strict:false لأن الحقلين غير معرّفين بسكيما Player (يمكنك إضافتهما للسكيما اختيارياً)
                    await Player.updateOne({ userId: me.userId }, { $set: { arenaRefreshDay: d, arenaRefreshes: used } }, { strict: false })
                    me.arenaRefreshDay = d; me.arenaRefreshes = used
                }
                res.json({ ok: true, opponents, me: meView(me, req) })
            } catch (err) {
                console.error('arena opponents error:', err)
                res.status(500).json({ ok: false })
            } finally {
                if (lock) refreshLocks.delete(lock)
            }
        })

        // 🏆 القاعة
        app.get('/arena/hall', async (req, res) => {
            res.set('Cache-Control', 'no-store')
            try {
                if (!auth.authEnabled()) return res.status(503).json({ ok: false })
                const sess = await bossSession(req)
                if (!sess) return res.status(401).json({ ok: false })
                if (!rate(sess.u, 30)) return res.status(429).json({ ok: false })
                const me = await loadMe(sess.u)
                if (!me) return res.status(404).json({ ok: false })
                res.json({ ok: true, ...(await hall(req, me)) })
            } catch (err) {
                console.error('arena hall error:', err)
                res.status(500).json({ ok: false })
            }
        })

        // ═════════ 🥊 تشكيل فريق PvP من الموقع ═════════
        // نفس حقل أمر الواتساب `.pvp 1 2 3` (pvpBattleTeam = أسماء الشخصيات) فيتزامن الاثنان تلقائياً.
        const TEAM_SIZE = 3
        const ROSTER_MAX = 1500

        // شخصيات اللاعب بدون تكرار الاسم — نأخذ أول شخصية بالاسم لأن resolveTeamCharacters تستخدم أول تطابق
        function rosterOf(p, req) {
            const seen = new Set()
            const list = []
            for (const c of (Array.isArray(p.characters) ? p.characters : [])) {
                if (!c || typeof c.name !== 'string' || !c.name || seen.has(c.name)) continue
                seen.add(c.name)
                list.push(c)
            }
            list.sort((x, y) => num(y.power) - num(x.power))
            return list.slice(0, ROSTER_MAX).map(c => ({ k: c.name, v: view(c, req) }))
        }

        const teamKeysOf = p => pvpBattle.resolveTeamCharacters(p).characters.map(c => c.name)

        // 📋 قائمة شخصياتي + الفريق الحالي (تُحمَّل عند فتح المحرّر فقط)
        app.get('/arena/roster', async (req, res) => {
            res.set('Cache-Control', 'no-store')
            try {
                if (!auth.authEnabled()) return res.status(503).json({ ok: false })
                const sess = await bossSession(req)
                if (!sess) return res.status(401).json({ ok: false, message: 'انتهت الجلسة — سجّل الدخول من جديد.' })
                if (!rate(sess.u, 30)) return res.status(429).json({ ok: false, message: 'طلبات كثيرة، انتظر دقيقة.' })
                const me = await loadMe(sess.u)
                if (!me) return res.status(404).json({ ok: false })
                res.json({ ok: true, roster: rosterOf(me, req), team: teamKeysOf(me) })
            } catch (err) {
                console.error('arena roster error:', err)
                res.status(500).json({ ok: false })
            }
        })

        // 💾 حفظ الفريق (3 أسماء) — أو مصفوفة فارغة للرجوع للفريق التلقائي (أقوى 3)
        app.post('/arena/team', jsonBody, async (req, res) => {
            res.set('Cache-Control', 'no-store')
            const fail = (status, code, message) => res.status(status).json({ ok: false, code, message })
            try {
                if (!auth.authEnabled()) return fail(503, 'DISABLED', 'الأرينا غير مفعّلة حالياً.')
                if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')

                const sess = auth.readSession(req)
                if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

                const b = req.body || {}
                if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
                if (!rate(sess.u, 20)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')

                const chk = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
                if (!chk || (chk.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

                // لا نغيّر الفريق أثناء قتال جارٍ
                if (fightLocks.has(sess.u)) return fail(409, 'BUSY', 'قتالك الحالي ما زال جارياً — عدّل الفريق بعد ما ينتهي.')

                const raw = b.team
                let names = []

                if (raw == null || (Array.isArray(raw) && raw.length === 0)) {
                    names = []   // فريق تلقائي
                } else {
                    if (!Array.isArray(raw) || raw.length !== TEAM_SIZE) return fail(400, 'BAD', 'اختر ' + TEAM_SIZE + ' شخصيات بالضبط.')
                    names = raw.map(n => (typeof n === 'string' ? n : ''))
                    if (names.some(n => !n || n.length > 120)) return fail(400, 'BAD', 'اسم شخصية غير صحيح.')
                    if (new Set(names).size !== TEAM_SIZE) return fail(400, 'DUP', 'لا يمكن تكرار نفس الشخصية.')

                    const owned = await Player.findOne({ userId: sess.u }).select('characters.name').lean()
                    const have = new Set(((owned && owned.characters) || []).map(c => c && c.name))
                    const missing = names.find(n => !have.has(n))
                    if (missing) return fail(404, 'MISSING', 'الشخصية "' + missing + '" لم تعد بحوزتك — حدّث القائمة.')
                }

                await Player.updateOne({ userId: sess.u }, { $set: { pvpBattleTeam: names } })

                const fresh = await loadMe(sess.u)
                if (!fresh) return fail(404, 'NOACC', 'لا تملك حساب')
                res.json({ ok: true, me: meView(fresh, req), team: teamKeysOf(fresh) })
            } catch (err) {
                console.error('arena team error:', err)
                fail(500, 'SERVER', 'خطأ بالخادم')
            }
        })

        // ⚔️ القتال (نفس خطوات `.قتال pvp <رقم>`)
        app.post('/arena/fight', jsonBody, async (req, res) => {
            res.set('Cache-Control', 'no-store')
            const fail = (status, code, message, extra = {}) => res.status(status).json({ ok: false, code, message, ...extra })
            let lockId = null
            try {
                if (!auth.authEnabled()) return fail(503, 'DISABLED', 'الأرينا غير مفعّلة حالياً.')
                if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')

                const sess = auth.readSession(req)
                if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

                const b = req.body || {}
                if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
                if (!rate(sess.u, 20)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')

                const chk = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
                if (!chk || (chk.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

                if (fightLocks.has(sess.u)) return fail(409, 'BUSY', 'قتالك السابق ما زال جارياً.')
                fightLocks.add(sess.u); lockId = sess.u

                const idx = parseInt(b.i, 10)
                if (!Number.isInteger(idx) || idx < 0 || idx > 4) return fail(400, 'BAD', 'خصم غير صحيح.')

                const out = await runFight(sess.u, idx, req)
                if (!out.ok) return fail(out.status || 400, out.code, out.message, out.extra || {})
                return res.json(out)
            } catch (err) {
                console.error('arena fight route error:', err)
                return fail(500, 'SERVER', 'خطأ بالخادم')
            } finally {
                if (lockId) fightLocks.delete(lockId)
            }
        })

        async function runFight(userId, idx, req) {
            const bad = (code, message, status = 400, extra = {}) => ({ ok: false, code, message, status, extra })

            const attacker = await Player.findOne({ userId })
            if (!attacker) return bad('NOACC', '❌ لا تملك حساب')

            const saved = nearbyLists.get(userId)
            const defenderId = saved && (Date.now() - saved.at <= NEARBY_TTL) ? saved.ids[idx] : null
            if (!defenderId) return bad('LIST', '❌ القائمة انتهت — حدّث الخصوم', 410)

            const defender = await Player.findOne({ userId: defenderId })
            if (!defender) return bad('NODEF', '❌ اللاعب غير موجود')
            if (attacker.userId === defender.userId) return bad('SELF', '❌ لا يمكنك قتال نفسك')
            if (!attacker.characters || !attacker.characters.length) return bad('NOCHARS', '❌ لا تملك شخصيات للقتال')
            if (!defender.characters || !defender.characters.length) return bad('NODEFCHARS', '❌ الخصم لا يملك شخصيات')

            // ⏳ كولداون مضاد للسبام (مشترك مع أمر الواتساب)
            const now = Date.now()
            if (attacker.lastPvP && now - attacker.lastPvP < COOLDOWN_MS) {
                return bad('COOLDOWN', '⏳ انتظر 30 ثانية', 429, { retryInMs: COOLDOWN_MS - (now - attacker.lastPvP) })
            }

            // 🎟️ 20 قتال يومياً (مشتركة مع الواتساب)
            const day = today()
            if (attacker.lastPvpReset !== day) {
                attacker.pvpFights = DAILY_FIGHTS
                attacker.lastPvpReset = day
            }
            if ((attacker.pvpFights || 0) <= 0) {
                return bad('NOFIGHTS', '⏳ انتهت قتالاتك اليومية (0/20) — تُجدَّد الساعة 12 صباحاً بتوقيت السعودية', 429)
            }

            attacker.pvpFights -= 1
            attacker.lastPvP = now
            await attacker.save()

            try {
                const teamA = pvpBattle.buildTeam(attacker, 'A', battleDeps)
                const teamB = pvpBattle.buildTeam(defender, 'B', battleDeps)

                // قبل المحاكاة: نلتقط القائمة (المحاكاة تغيّر الـHP والدرع)
                const plain = c => (c && typeof c.toObject === 'function') ? c.toObject() : c
                const roster = (team, p) => {
                    const chars = pvpBattle.resolveTeamCharacters(p).characters.map(plain)
                    return team.fighters.map((f, i) => ({
                        name: f.name, atk: f.atk, maxHp: f.maxHp, shield: f.shield,
                        v: view(chars[i] || {}, req)
                    }))
                }
                const rosterA = roster(teamA, attacker)
                const rosterB = roster(teamB, defender)

                const sim = pvpBattle.simulate(teamA.fighters, teamB.fighters)

                // =========================
                // 🏆 النتيجة (حرفياً كما بالواتساب)
                // =========================
                const winner = sim.winner === 'A' ? attacker : defender
                const loser = sim.winner === 'A' ? defender : attacker

                const attackerMmrBefore = attacker.mmr || 0
                const defenderMmrBefore = defender.mmr || 0
                const winnerMmrBefore = winner.mmr || 0
                const loserMmrBefore = loser.mmr || 0

                const elo = pvpBattle.eloChange(winnerMmrBefore, loserMmrBefore)
                const reward = pvpBattle.moneyReward(winnerMmrBefore, loserMmrBefore)

                winner.wins = (winner.wins || 0) + 1
                loser.losses = (loser.losses || 0) + 1

                winner.mmr = winnerMmrBefore + elo.gain
                loser.mmr = Math.max(0, loserMmrBefore - elo.loss)

                const loserLost = loserMmrBefore - loser.mmr

                attacker.rank = getRank(attacker.mmr)
                defender.rank = getRank(defender.mmr)

                // 🎁 مكافآت الفائز
                const moneyReward = reward.money
                const xpReward = Math.floor(200 + Math.random() * 300)

                await winner.addMoney(moneyReward)
                winner.xp = (winner.xp || 0) + applyDogBonus(winner, xpReward)

                const boxInfo = RANK_BOX_MAP[rankKeyOf(winner.rank)] || RANK_BOX_MAP['برونزي']
                winner.boxes = winner.boxes || {}
                winner.boxes[boxInfo.key] = (winner.boxes[boxInfo.key] || 0) + 1

                await attacker.save()
                await defender.save()

                // 🔮 الأورب + 🏅 الإنجازات (لا تُفشل القتال لو تعذّر الإرسال)
                try {
                    const sock = getSock ? getSock() : null
                    const jid = getNotifyJid ? await getNotifyJid(winner.userId) : null
                    await orbs.trackMission(winner.userId, 'pvpWins', { sock, jid })
                    await checkAndGrantAchievement(winner, 'pvp', winner.wins, sock, jid)
                    await checkAndGrantAchievement(winner, 'wealth', winner.totalEarnedMoney, sock, jid)
                } catch (e) {
                    console.log('arena post-fight hooks error:', e && e.message ? e.message : e)
                }

                // 🎉 تغيّر رتبة المهاجم (يُقارن بالرتبة الفعلية قبل القتال)
                const rankBefore = rankInfo(attackerMmrBefore)
                const rankAfter = rankInfo(attacker.mmr)
                const win = winner === attacker
                let rankChange = null
                if (rankBefore.label !== rankAfter.label) rankChange = attacker.mmr > attackerMmrBefore ? 'up' : 'down'

                const attackerDelta = win ? elo.gain : -loserLost

                return {
                    ok: true,
                    battle: {
                        A: rosterA,
                        B: rosterB,
                        nameA: attacker.name || attacker.username || 'أنت',
                        nameB: defender.name || defender.username || 'الخصم',
                        rounds: sim.rounds.map(r => ({
                            no: r.no,
                            enrage: r.enrage || 0,
                            ev: r.lines.filter(l => l.ev).map(l => l.ev)
                        })),
                        winner: sim.winner,
                        timeout: sim.timeout,
                        pctA: sim.pctA,
                        pctB: sim.pctB
                    },
                    result: {
                        win,
                        timeout: sim.timeout,
                        mmrBefore: attackerMmrBefore,
                        mmrAfter: attacker.mmr || 0,
                        delta: attackerDelta,
                        rankBefore,
                        rankAfter,
                        rankChange,
                        oppMmrBefore: defenderMmrBefore,
                        oppMmrAfter: defender.mmr || 0,
                        rewards: win
                            ? { money: moneyReward, xp: xpReward, box: boxInfo.label }
                            : null,
                        fights: attacker.pvpFights,
                        max: DAILY_FIGHTS,
                        auto: teamA.auto
                    }
                }

            } catch (pvpErr) {

                console.log('PvP site fight error:', pvpErr)

                // ↩️ نرجع القتال المخصوم والكولداون (مثل الواتساب)
                try {
                    const fresh = await Player.findOne({ userId })
                    if (fresh) {
                        fresh.pvpFights = (fresh.pvpFights || 0) + 1
                        fresh.lastPvP = 0
                        await fresh.save()
                    }
                } catch (refundErr) {
                    console.log('PvP site refund error:', refundErr)
                }

                return bad('SERVER', '❌ صار خطأ بالقتال، تم إرجاع محاولتك. حاول مرة ثانية.', 500)
            }
        }
    }

    return { mount, rankInfo, TIERS }
}
