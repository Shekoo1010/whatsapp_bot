// =====================================================================
// systems/siteBrawl.js
// 🥊 .مضاربة من الموقع — نفس منطق startBrawl في index.js بالضبط:
//   3 جولات (شخصية 1 ضد 1 ... 3 ضد 3 من pvpTeam) · نفس ترتيب حساب الضرر
//   (معدات ← سلاح ← دفاع ← حرج/نمر ← دب ← مراوغة ← امتصاص ← عكس ← قدرات UR عشوائية 4)
//   · نفس المكافآت (50,000 مال + 100 XP) · نفس نقاط الرانك (+20 / -10) · نفس نقاط العوالم
// الطلب المعلّق يُخزَّن بنفس حقل البوت (target.pendingBrawl) فيشتغل القبول من الواتساب والموقع معاً.
// الصفحة: /u/:code/brawl   ·   API: /brawl/state /brawl/challenge /brawl/accept /brawl/decline
// =====================================================================

const BRAWL_REQUEST_TTL = 5 * 60 * 1000   // نفس صلاحية .قبول مضاربة (5 دقائق)
const RESULT_TTL = 10 * 60 * 1000         // مدة بقاء إعادة العرض للخصم المنتظر
const LOCK_TTL = 20000                    // نفس حماية القفل 20 ثانية

function create(deps) {
    const {
        Player,
        equipmentSystem,
        companionsData,
        getWeaponBonusForCharacter,
        rollCrit,
        shuffle,
        applyCatBonus,
        getRankTier,
        rankTierIndex,
        rankTierInfo,
        refreshBrawlDaily,
        BRAWL_DAILY_LIMIT,
        brawlLocks,                 // نفس Set اللي يستخدمه البوت (يمنع التزامن بين الواتساب والموقع)
        checkAndGrantAchievement,
        orbs,
        worlds,
        getSock = () => null,       // اختياري: () => sock
        notifyDm = async () => {}   // اختياري: رسالة خاصة بالبوت
    } = deps

    const crypto = require('crypto')
    const mongoose = require('mongoose')
    let siteNotifyPush = () => {}
    try { siteNotifyPush = require('./siteNotify').push } catch (e) { /* الإشعار اختياري */ }

    // 📜 سجل المضاربات (مجموعة مستقلة — بدون أي تعديل على Player.js) · يُحذف تلقائياً بعد 7 أيام
    const logSchema = new mongoose.Schema({
        attacker: { type: String, index: true },
        defender: { type: String, index: true },
        aName: String,
        dName: String,
        mode: String,                       // offline = هجوم مباشر · online = تحدي مباشر
        winner: Number,                     // 0 تعادل · 1 المهاجم · 2 المدافع
        wins: [Number],
        seen: { type: Boolean, default: false },
        at: { type: Date, default: Date.now, expires: 7 * 24 * 3600 },
        payload: mongoose.Schema.Types.Mixed
    })
    logSchema.index({ defender: 1, at: -1 })
    const BrawlLog = mongoose.models.BrawlLog || mongoose.model('BrawlLog', logSchema)

    // sock وهمي لو ما فيه اتصال: يمنع الانهيار داخل دوال تحاول ترسل رسالة واتساب
    const stubSock = { sendMessage: async () => {}, groupSettingUpdate: async () => {} }
    const sockOrStub = () => getSock() || stubSock

    // ───────────────────────── محاكاة جولة واحدة ─────────────────────────
    // d[0] = ضرر اللاعب 1 · d[1] = ضرر اللاعب 2 (نفس dmg1/dmg2 في startBrawl)
    // كل حدث يحمل لقطة من الرقمين بعده فتقدر الصفحة تحرّك الأرقام خطوة بخطوة.
    function equipLines(b) {
        const L = []
        if (b.attack) L.push(`⚔️ هجوم المعدات +${b.attack}`)
        if (b.attackPercent) L.push(`⚔️ هجوم المعدات +${b.attackPercent}%`)
        if (b.defense) L.push(`🛡️ دفاع المعدات +${b.defense}`)
        if (b.defensePercent) L.push(`🛡️ دفاع المعدات +${b.defensePercent}%`)
        if (b.hp) L.push(`❤️ HP المعدات +${b.hp}`)
        if (b.hpPercent) L.push(`❤️ HP المعدات +${b.hpPercent}%`)
        if (b.critRate) L.push(`🎯 حرج المعدات +${b.critRate}%`)
        if (b.critDamage) L.push(`💥 ضرر حرج المعدات +${b.critDamage}%`)
        if (b.dodge) L.push(`👻 مراوغة المعدات +${b.dodge}%`)
        if (b.accuracy) L.push(`🎯 دقة المعدات +${b.accuracy}%`)
        if (b.shield) L.push(`🛡️ درع المعدات +${b.shield}`)
        if (b.lifesteal) L.push(`🩸 امتصاص حياة المعدات +${b.lifesteal}%`)
        if (b.reflect) L.push(`🪞 عكس ضرر المعدات +${b.reflect}%`)
        if (b.bossDamage) L.push(`👹 ضرر الزعيم من المعدات +${b.bossDamage}%`)
        return L
    }

    function fightRound(players, chars) {
        const d = [chars[0].power || 0, chars[1].power || 0]
        const start = [d[0], d[1]]
        const ev = []
        const push = (s, ic, t, x) => ev.push({ s, ic, t, x: x || '', d1: d[0], d2: d[1] })
        const tag = i => '@' + String(players[i].userId).split('@')[0]

        // 🛡️ بونص المعدات + ⚔️ السلاح المركب (تُدمج بنفس الكائن مثل البوت)
        const b = [
            equipmentSystem.calculateEquipmentStats(chars[0]),
            equipmentSystem.calculateEquipmentStats(chars[1])
        ]
        for (let i = 0; i < 2; i++) {
            const w = getWeaponBonusForCharacter(players[i], chars[i])
            for (const key in w) b[i][key] = (b[i][key] || 0) + (w[key] || 0)
        }

        // هجوم المعدات (فلات ثم %)
        d[0] += (b[0].attack || 0)
        d[1] += (b[1].attack || 0)
        if ((b[0].attackPercent || 0) > 0) d[0] = Math.floor(d[0] * (1 + b[0].attackPercent / 100))
        if ((b[1].attackPercent || 0) > 0) d[1] = Math.floor(d[1] * (1 + b[1].attackPercent / 100))

        // دفاع المعدات: صاحب الدفاع يقلل ضرر الخصم (فلات ثم %)
        if ((b[1].defense || 0) > 0) d[0] = Math.max(0, d[0] - b[1].defense)
        if ((b[0].defense || 0) > 0) d[1] = Math.max(0, d[1] - b[0].defense)
        if ((b[1].defensePercent || 0) > 0) d[0] = Math.max(0, Math.floor(d[0] * (1 - b[1].defensePercent / 100)))
        if ((b[0].defensePercent || 0) > 0) d[1] = Math.max(0, Math.floor(d[1] * (1 - b[0].defensePercent / 100)))

        if (d[0] !== start[0] || d[1] !== start[1]) push(0, '🛡️', 'دمج الإيكوز', 'الهجوم والدفاع من المعدات')

        // 🐯 رفيق النمر: نسبة إضافية على الكريت
        const tiger = i => (players[i].companion && players[i].companion.key === 'tiger' && (players[i].companion.level || 0) >= 1)
            ? companionsData.getCompanionBonus('tiger', players[i].companion.level) : 0

        // 🎯 حرج المعدات (اللاعب 1 ثم 2)
        for (let i = 0; i < 2; i++) {
            const c = rollCrit((b[i].critRate || 0) + tiger(i), b[i].critDamage || 0)
            if (c.isCrit) {
                d[i] = Math.floor(d[i] * c.multiplier)
                push(i + 1, '🎯', 'حرج المعدات', '💥 ضربة حرجة')
            }
        }

        // 🐻 رفيق الدب: يقلل الضرر الوارد على صاحبه (اللاعب 1 ثم 2)
        for (let i = 0; i < 2; i++) {
            const p = players[i]
            if (p.companion && p.companion.key === 'bear' && (p.companion.level || 0) >= 1) {
                const red = companionsData.getCompanionBonus('bear', p.companion.level)
                d[1 - i] = Math.max(0, Math.floor(d[1 - i] * (1 - red / 100)))
                push(i + 1, '🐻', 'دب ' + tag(i), 'خفّف الضرر')
            }
        }

        // 👻 مراوغة المعدات (يبدأ بمراوغة اللاعب 2 ثم 1 — نفس ترتيب البوت)
        for (const i of [1, 0]) {
            if (Math.random() * 100 < (b[i].dodge || 0)) {
                d[1 - i] = 0
                push(i + 1, '👻', 'مراوغة المعدات', '💨 تفادى الهجمة بالكامل')
            }
        }

        // 🩸 امتصاص حياة المعدات
        for (let i = 0; i < 2; i++) {
            if ((b[i].lifesteal || 0) > 0) {
                const add = Math.floor(d[i] * (b[i].lifesteal || 0) / 100)
                d[i] += add
                push(i + 1, '🩸', 'امتصاص حياة المعدات', `امتص ${add} قوة إضافية`)
            }
        }

        // 🪞 انعكاس ضرر المعدات (يبدأ باللاعب 2 ثم 1)
        for (const i of [1, 0]) {
            if ((b[i].reflect || 0) > 0) {
                const r = Math.floor(d[1 - i] * (b[i].reflect || 0) / 100)
                d[i] += r
                push(i + 1, '🪞', 'مرآة المعدات', `عكس ${r} ضرر`)
            }
        }

        // 👑 قدرات UR: 4 عشوائية لكل شخصية (اللاعب 1 كاملة ثم اللاعب 2)
        for (let me = 0; me < 2; me++) {
            const opp = 1 - me
            const abilities = shuffle(chars[me].urAbilities || []).slice(0, 4)
            for (const a of abilities) {
                if (a.type === 'attack' || a.type === 'bossDamage') {
                    d[me] = Math.floor(d[me] * (1 + a.value / 100))
                    push(me + 1, '🔥', a.name, `+${a.value}% قوة`)
                }
                if (a.type === 'defense') {
                    d[opp] = Math.floor(d[opp] * (1 - a.value / 100))
                    push(me + 1, '🛡️', a.name, `قلل ضرر الخصم ${a.value}%`)
                }
                if (a.type === 'critRate' && Math.random() * 100 <= a.value) {
                    d[me] *= 2
                    push(me + 1, '🎯', a.name, '💥 ضربة حرجة ×2')
                }
                if (a.type === 'lifesteal') {
                    const bonus = Math.floor(d[me] * a.value / 200)
                    d[me] += bonus
                    push(me + 1, '💀', a.name, `امتص ${bonus} قوة إضافية`)
                }
                if (a.type === 'shield') {
                    d[opp] = Math.floor(d[opp] * (1 - a.value / 100))
                    push(me + 1, '🛡️', a.name, `خفض ضرر الخصم ${a.value}%`)
                }
                if (a.type === 'reflect') {
                    const r = Math.floor(d[opp] * a.value / 100)
                    d[me] += r
                    push(me + 1, '🪞', a.name, `عكس ${r} ضرر`)
                }
                if (a.type === 'dodge' && Math.random() * 100 <= a.value) {
                    d[opp] = 0
                    push(me + 1, '👻', a.name, '💨 تفادى الهجمة بالكامل')
                }
            }
        }

        return {
            start,
            ev,
            d1: d[0],
            d2: d[1],
            w: d[0] > d[1] ? 1 : d[1] > d[0] ? 2 : 0,
            eq1: equipLines(b[0]),
            eq2: equipLines(b[1])
        }
    }

    // ───────────────────────── المضاربة كاملة ─────────────────────────
    // player1 = صاحب الطلب · player2 = القابل (نفس startBrawl(challenger, player))
    async function runBrawl(player1, player2, charView, req) {
        const team1 = player1.pvpTeam.map(i => player1.characters[i])
        const team2 = player2.pvpTeam.map(i => player2.characters[i])
        if (team1.length !== 3 || team2.length !== 3) return { ok: false, message: 'أحد اللاعبين لا يملك تشكيلة كاملة' }

        let wins1 = 0, wins2 = 0
        const rounds = []

        for (let round = 0; round < 3; round++) {
            const c1 = team1[round], c2 = team2[round]
            if (!c1 || !c2) continue
            const r = fightRound([player1, player2], [c1, c2])
            if (r.w === 1) wins1++
            else if (r.w === 2) wins2++
            rounds.push({ n: round + 1, a: charView(c1, req), b: charView(c2, req), ...r })
        }

        // 🏆 الرانك الجديد: نلتقط الرانك القديم قبل أي تعديل
        const old1 = player1.rankTier
        const old2 = player2.rankTier

        let winner = null
        let money = 0

        if (wins1 > wins2) {
            winner = player1
            player1.brawlWins = (player1.brawlWins || 0) + 1
            player2.brawlLosses = (player2.brawlLosses || 0) + 1
            money = applyCatBonus(player1, 50000)
            player1.money = (player1.money || 0) + money
            player1.xp = (player1.xp || 0) + 100
            player1.rankWins = (player1.rankWins || 0) + 1
            player2.rankLosses = (player2.rankLosses || 0) + 1
            player1.rankPoints = (player1.rankPoints || 0) + 20
            player2.rankPoints = Math.max(0, (player2.rankPoints || 0) - 10)
            player1.rankTier = getRankTier(player1.rankPoints)
            player2.rankTier = getRankTier(player2.rankPoints)
        } else if (wins2 > wins1) {
            winner = player2
            player2.brawlWins = (player2.brawlWins || 0) + 1
            player1.brawlLosses = (player1.brawlLosses || 0) + 1
            money = applyCatBonus(player2, 50000)
            player2.money = (player2.money || 0) + money
            player2.xp = (player2.xp || 0) + 100
            player2.rankWins = (player2.rankWins || 0) + 1
            player1.rankLosses = (player1.rankLosses || 0) + 1
            player2.rankPoints = (player2.rankPoints || 0) + 20
            player1.rankPoints = Math.max(0, (player1.rankPoints || 0) - 10)
            player2.rankTier = getRankTier(player2.rankPoints)
            player1.rankTier = getRankTier(player1.rankPoints)
        }

        // 🎉 ترقية/تراجع الرانك (نفس applyRankTierPromotion لكن بيانات منظّمة بدل نص منشن)
        const rank = []
        async function promotion(p, oldTier, who) {
            if (!p.rankTier || p.rankTier === oldTier) return
            const up = rankTierIndex(p.rankTier) > rankTierIndex(oldTier)
            if (!up) { rank.push({ who, up: false, from: oldTier, to: p.rankTier }); return }
            const reward = rankTierInfo(p.rankTier)
            p.boxes = p.boxes || {}
            p.boxes[reward.boxKey] = (p.boxes[reward.boxKey] || 0) + 1
            await p.addMoney(reward.money) // تحفظ اللاعب بنفسها
            rank.push({ who, up: true, from: oldTier, to: p.rankTier, money: reward.money, box: reward.boxLabel })
        }
        if (winner) {
            await promotion(player1, old1, 1)
            await promotion(player2, old2, 2)
        }

        await player1.save()
        await player2.save()

        let worldText = null
        if (winner) {
            const sock = sockOrStub()
            try { await checkAndGrantAchievement(winner, 'brawl', winner.brawlWins, sock, null) } catch (e) { console.error('brawl achievement error:', e) }
            try { await orbs.trackMission(winner.userId, 'brawlWins', { sock, jid: null }) } catch (e) { console.error('brawl mission error:', e) }

            const loser = winner === player1 ? player2 : player1
            if (winner.world && loser.world && winner.world !== loser.world) {
                try { worldText = await worlds.awardBattlePoints(winner, sock, null) } catch (e) { console.error('brawl world points error:', e) }
            }
        }

        return {
            ok: true,
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            names: [player1.name || player1.username || 'لاعب', player2.name || player2.username || 'لاعب'],
            wins: [wins1, wins2],
            winner: winner ? (winner === player1 ? 1 : 2) : 0,
            money: money,
            xp: winner ? 100 : 0,
            rank,
            worldText: worldText ? String(worldText).replace(/@\d+/g, '').trim() : null,
            rounds
        }
    }

    // ───────────────────────── المسارات ─────────────────────────
    function mount(app, ctx) {
        const { auth, jsonBody, bossSession, securityHeaders, CODE_RE, html404, ownerSession, esc, navDrawerHTML, NAV_BTN, charView, shellHead, isOnline: extOnline } = ctx

        // آخر نتائج المضاربات (للخصم الذي كان ينتظر): userId -> payload
        const results = new Map()
        function keepResult(userIds, payload) {
            const rec = { at: Date.now(), payload }
            for (const u of userIds) results.set(u, rec)
            if (results.size > 2000) for (const [k, v] of results) if (Date.now() - v.at > RESULT_TTL) results.delete(k)
        }

        const hits = new Map()
        function rate(userId, max = 30) {
            const now = Date.now()
            const arr = (hits.get(userId) || []).filter(t => now - t < 60000)
            if (arr.length >= max) { hits.set(userId, arr); return false }
            arr.push(now); hits.set(userId, arr); return true
        }

        function lock(ids) {
            for (const id of ids) if (brawlLocks.has(id)) return null
            for (const id of ids) brawlLocks.add(id)
            const t = setTimeout(() => { for (const id of ids) brawlLocks.delete(id) }, LOCK_TTL)
            return () => { clearTimeout(t); for (const id of ids) brawlLocks.delete(id) }
        }

        const teamOf = p => (p.pvpTeam || []).map(i => p.characters[i]).filter(Boolean)
        const hasTeam = p => Array.isArray(p.pvpTeam) && p.pvpTeam.length === 3 && teamOf(p).length === 3

        async function guard(req, res, needCsrf) {
            res.set('Cache-Control', 'no-store')
            const fail = (status, code, message) => { res.status(status).json({ ok: false, code, message }); return null }
            if (!auth.authEnabled()) return fail(503, 'DISABLED', 'المضاربة من الموقع غير مفعّلة حالياً.')
            if (needCsrf && !auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')
            const sess = await bossSession(req)
            if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
            if (needCsrf && !auth.verifyCsrf(sess, (req.body || {}).csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
            seenAt.set(sess.u, Date.now())
            if (!rate(sess.u, needCsrf ? 20 : 60)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')
            return sess
        }
        const bad = (res, code, message, status = 400) => res.status(status).json({ ok: false, code, message })

        async function buildState(userId, req) {
            const me = await Player.findOne({ userId })
            if (!me) return null
            if (refreshBrawlDaily(me)) await me.save()

            let incoming = null
            const pb = me.pendingBrawl
            if (pb && pb.challenger) {
                if (Date.now() - pb.createdAt > BRAWL_REQUEST_TTL) {
                    me.pendingBrawl = null
                    await me.save()
                } else {
                    const ch = await Player.findOne({ userId: pb.challenger }).select('name username').lean()
                    if (ch) incoming = { name: ch.name || ch.username || 'لاعب', username: ch.username || '', leftMs: BRAWL_REQUEST_TTL - (Date.now() - pb.createdAt) }
                }
            }

            const out = await Player.findOne({ 'pendingBrawl.challenger': userId, 'pendingBrawl.createdAt': { $gt: Date.now() - BRAWL_REQUEST_TTL } })
                .select('name username pendingBrawl').lean()

            const rec = results.get(userId)
            const latest = rec && Date.now() - rec.at < RESULT_TTL ? rec.payload : null

            const logUnseen = await BrawlLog.countDocuments({ defender: userId, seen: false })
            return {
                ok: true,
                left: Math.max(0, Number(me.brawlFights) || 0),
                max: BRAWL_DAILY_LIMIT,
                wins: me.brawlWins || 0,
                losses: me.brawlLosses || 0,
                rank: me.rankTier || getRankTier(me.rankPoints || 0),
                points: me.rankPoints || 0,
                ready: hasTeam(me),
                team: teamOf(me).map(c => charView(c, req)),
                incoming,
                outgoing: out ? { name: out.name || out.username || 'لاعب', leftMs: BRAWL_REQUEST_TTL - (Date.now() - out.pendingBrawl.createdAt) } : null,
                latestId: latest ? latest.id : null,
                logUnseen
            }
        }

        // صفحة المضاربة
        app.get('/u/:code/brawl', async (req, res) => {
            try {
                securityHeaders(res)
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return html404(res)
                const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion').lean()
                if (!player) return html404(res)
                const sess = ownerSession(req, player)
                if (!sess) return res.redirect(303, `/login?code=${code}`)
                res.send(pageHTML({
                    code,
                    csrf: auth.csrfForSession(sess),
                    name: player.name || player.username || 'لاعب'
                }))
            } catch (err) {
                console.error('brawl page error:', err)
                res.status(500).send('خطأ بالخادم')
            }
        })

        app.get('/brawl/state', async (req, res) => {
            try {
                const sess = await guard(req, res, false)
                if (!sess) return
                const st = await buildState(sess.u, req)
                if (!st) return bad(res, 'NOPLAYER', 'لا يوجد حساب', 404)
                res.json(st)
            } catch (err) {
                console.error('brawl state error:', err)
                bad(res, 'SERVER', 'خطأ بالخادم', 500)
            }
        })

        app.get('/brawl/result', async (req, res) => {
            try {
                const sess = await guard(req, res, false)
                if (!sess) return
                const rec = results.get(sess.u)
                if (!rec || rec.payload.id !== String(req.query.id || '')) return bad(res, 'GONE', 'انتهت صلاحية إعادة العرض', 404)
                res.json({ ok: true, brawl: rec.payload })
            } catch (err) {
                console.error('brawl result error:', err)
                bad(res, 'SERVER', 'خطأ بالخادم', 500)
            }
        })

        // ───────────────────────── خصوم قريبون · هجوم مباشر · السجل ─────────────────────────
        const REF_TTL = 10 * 60 * 1000
        const NEAR_N = 5
const REFRESH_MAX = 3            // أقصى عدد لتحديث قائمة الخصوم اليدوي باليوم
const refreshUse = new Map()      // userId -> { day, n }
const saudiDay = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10)
        const ONLINE_MS = 20000
        const seenAt = new Map()      // userId -> آخر نشاط بصفحة المضاربة
        const refs = new Map()        // ref عشوائي -> { userId, by, at } (لا نكشف userId للمتصفح)
        const nearCache = new Map()   // userId -> { at, list }

        const isOnline = uid => (Date.now() - (seenAt.get(uid) || 0) < ONLINE_MS) || (typeof extOnline === 'function' && !!extOnline(uid))

        // أقوى 3 شخصيات (فهارس) — تشكيلة الدفاع التلقائية لمن لم يجهّز تشكيلة
        function autoTeam(p) {
            const ch = p.characters || []
            if (ch.length < 3) return []
            return ch.map((c, i) => [i, (c && c.power) || 0]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0])
        }
        function teamInfo(p) {
            const ch = p.characters || []
            const ok = Array.isArray(p.pvpTeam) && p.pvpTeam.length === 3 && p.pvpTeam.every(i => ch[i])
            const idx = ok ? p.pvpTeam : autoTeam(p)
            return { idx, auto: !ok, power: idx.reduce((sum, i) => sum + ((ch[i] && ch[i].power) || 0), 0) }
        }

        async function saveLog(att, def, mode, out, seen) {
            try {
                await BrawlLog.create({ attacker: att.userId, defender: def.userId, aName: out.names[0], dName: out.names[1], mode, winner: out.winner, wins: out.wins, seen: !!seen, payload: out })
            } catch (e) { console.error('brawl log save error:', e) }
        }

        // أقرب 5 لك بالرانك والقوة (قوة التشكيلة): نجلب جيران الرانك ثم نرتب بمسافة مركّبة
        async function nearest(userId, req) {
            const c = nearCache.get(userId)
            if (c && Date.now() - c.at < 20000) return c.list
            const me = await Player.findOne({ userId }).select('userId rankPoints pvpTeam characters.power').lean()
            if (!me) return []
            const myPts = me.rankPoints || 0
            const myPow = teamInfo(me).power
            const base = { userId: { $ne: userId }, 'characters.2': { $exists: true } }
            const sel = 'userId name username rankPoints rankTier pvpTeam characters.power'
            const [up, down] = await Promise.all([
                Player.find({ ...base, rankPoints: { $gte: myPts } }).sort({ rankPoints: 1 }).limit(40).select(sel).lean(),
                Player.find({ ...base, rankPoints: { $lt: myPts } }).sort({ rankPoints: -1 }).limit(40).select(sel).lean()
            ])
            const top = [...up, ...down].map(p => {
                const t = teamInfo(p)
                if (t.idx.length !== 3) return null
                const dp = Math.abs((p.rankPoints || 0) - myPts) / (150 + myPts * 0.25)
                const dw = Math.abs(t.power - myPow) / (myPow * 0.25 + 1500)
                return { p, t, score: dp + dw }
            }).filter(Boolean).sort((a, b) => a.score - b.score).slice(0, NEAR_N)
            if (!top.length) return []

            const full = await Player.find({ userId: { $in: top.map(x => x.p.userId) } }).select('userId characters').lean()
            const fmap = new Map(full.map(f => [f.userId, f]))
            if (refs.size > 5000) for (const [k, v] of refs) if (Date.now() - v.at > REF_TTL) refs.delete(k)

            const list = top.map(({ p, t }) => {
                const ref = crypto.randomBytes(8).toString('hex')
                refs.set(ref, { userId: p.userId, by: userId, at: Date.now() })
                const chars = (fmap.get(p.userId) || {}).characters || []
                return {
                    ref,
                    name: p.name || p.username || 'لاعب',
                    tier: p.rankTier || getRankTier(p.rankPoints || 0),
                    points: p.rankPoints || 0,
                    power: t.power,
                    online: isOnline(p.userId),
                    team: t.idx.map(i => charView(chars[i] || {}, req))
                }
            })
            nearCache.set(userId, { at: Date.now(), list })
            return list
        }

        app.get('/brawl/near', async (req, res) => {
            try {
                const sess = await guard(req, res, false)
                if (!sess) return
                const day = saudiDay()
                let ru = refreshUse.get(sess.u)
                if (!ru || ru.day !== day) {
                    if (refreshUse.size > 5000) for (const [k, v] of refreshUse) if (v.day !== day) refreshUse.delete(k)
                    ru = { day, n: 0 }
                    refreshUse.set(sess.u, ru)
                }
                if (req.query.r === '1') {   // تحديث يدوي: يُحسب من الحد
                    if (ru.n >= REFRESH_MAX) return bad(res, 'REFRESHLIMIT', `انتهت تحديثاتك اليوم (0/${REFRESH_MAX}) — تتجدد 12:00 ص بتوقيت السعودية`, 429)
                    ru.n++
                    nearCache.delete(sess.u)
                }
                const list = await nearest(sess.u, req)
                list.forEach(o => { o.online = isOnline(refs.get(o.ref) && refs.get(o.ref).userId) })
                res.json({ ok: true, list, refreshLeft: REFRESH_MAX - ru.n })
            } catch (err) {
                console.error('brawl near error:', err)
                bad(res, 'SERVER', 'خطأ بالخادم', 500)
            }
        })

        // ─── هجوم مباشر (أوفلاين): القتال ضد تشكيلة دفاع الخصم بدون انتظار قبوله ───
        // يخصم من مضاربات المهاجم فقط · نفس منطق القتال والمكافآت والرانك بالضبط (player1 = المهاجم)
        app.post('/brawl/attack', jsonBody, async (req, res) => {
            let unlock = null
            let me = null
            let charged = false
            try {
                const sess = await guard(req, res, true)
                if (!sess) return
                const rec = refs.get(String((req.body || {}).ref || ''))
                if (!rec || rec.by !== sess.u || Date.now() - rec.at > REF_TTL) return bad(res, 'STALE', 'انتهت صلاحية القائمة — حدّثها', 410)

                unlock = lock([sess.u, rec.userId])
                if (!unlock) return bad(res, 'BUSY', 'الخصم أو أنت في مضاربة جارية، حاول بعد لحظات.', 409)

                me = await Player.findOne({ userId: sess.u })
                if (!me) return bad(res, 'NOPLAYER', 'لا يوجد حساب')
                if (!hasTeam(me)) return bad(res, 'NOTEAM', 'يجب تحديد تشكيلة أولاً')
                if (refreshBrawlDaily(me)) await me.save()
                if ((me.brawlFights || 0) <= 0) return bad(res, 'LIMIT', `انتهت مضارباتك اليوم (0/${BRAWL_DAILY_LIMIT}) — تتجدد 12:00 ص بتوقيت السعودية`)

                const target = await Player.findOne({ userId: rec.userId })
                if (!target) return bad(res, 'NOTARGET', 'الخصم لا يملك حساباً')
                if (target.userId === sess.u) return bad(res, 'SELF', 'لا يمكنك مضاربة نفسك')

                // 🛡️ لم يجهّز تشكيلة؟ نحفظ له أقوى 3 شخصيات تلقائياً للدفاع
                if (!hasTeam(target)) {
                    const idx = autoTeam(target)
                    if (idx.length !== 3) return bad(res, 'TARGETTEAM', 'الخصم لا يملك 3 شخصيات')
                    target.pvpTeam = idx
                    await target.save()
                }

                me.brawlFights -= 1
                await me.save()
                charged = true

                const out = await runBrawl(me, target, charView, req)
                if (!out.ok) {
                    me.brawlFights += 1
                    await me.save()
                    return bad(res, 'TEAM', out.message)
                }

                await saveLog(me, target, 'offline', out, false)
                nearCache.delete(sess.u)

                const title = `${out.names[0]} هاجمك!`
                const text = out.winner === 2 ? `🛡️ دفاعك فاز ${out.wins[1]}-${out.wins[0]}` : out.winner === 1 ? `💥 خسرت ${out.wins[1]}-${out.wins[0]} — شاهد الإعادة بسجل المضاربة` : '⚖️ انتهت بالتعادل'
                siteNotifyPush(target.userId, { type: 'dm', icon: '🥊', title, text })
                notifyDm(target.userId, `🥊 ${title}\n${text}\nافتح صفحة المضاربة بالموقع لمشاهدة الإعادة.`).catch(() => {})

                res.json({ ok: true, brawl: out })
            } catch (err) {
                console.error('brawl attack error:', err)
                bad(res, 'SERVER', 'خطأ بالخادم', 500)
            } finally { if (unlock) unlock() }
        })

        // ─── سجل المضاربات (من ضربك ومن ضربت) ───
        app.get('/brawl/log', async (req, res) => {
            try {
                const sess = await guard(req, res, false)
                if (!sess) return
                const u = sess.u
                const docs = await BrawlLog.find({ $or: [{ attacker: u }, { defender: u }] }).sort({ at: -1 }).limit(20).select('-payload').lean()
                const items = docs.map(d => {
                    const role = d.attacker === u ? 'a' : 'd'
                    const w = d.wins || [0, 0]
                    return {
                        id: String(d._id),
                        role,
                        name: role === 'a' ? d.dName : d.aName,
                        mode: d.mode,
                        res: d.winner === 0 ? 'draw' : ((d.winner === 1) === (role === 'a') ? 'win' : 'lose'),
                        mine: role === 'a' ? w[0] : w[1],
                        theirs: role === 'a' ? w[1] : w[0],
                        at: new Date(d.at).getTime(),
                        fresh: role === 'd' && !d.seen
                    }
                })
                res.json({ ok: true, items })
                await BrawlLog.updateMany({ defender: u, seen: false }, { $set: { seen: true } })
            } catch (err) {
                console.error('brawl log error:', err)
                bad(res, 'SERVER', 'خطأ بالخادم', 500)
            }
        })

        app.get('/brawl/replay', async (req, res) => {
            try {
                const sess = await guard(req, res, false)
                if (!sess) return
                const id = String(req.query.id || '')
                if (!mongoose.isValidObjectId(id)) return bad(res, 'BADID', 'معرّف غير صالح')
                const d = await BrawlLog.findById(id).lean()
                if (!d || (d.attacker !== sess.u && d.defender !== sess.u)) return bad(res, 'GONE', 'انتهت صلاحية الإعادة', 404)
                res.json({ ok: true, brawl: d.payload })
            } catch (err) {
                console.error('brawl replay error:', err)
                bad(res, 'SERVER', 'خطأ بالخادم', 500)
            }
        })

        // ─── .تشكيلة 1 2 3 ─── (نفس تحقق البوت: أرقام صحيحة · بدون تكرار · الشخصية موجودة)
        app.get('/brawl/chars', async (req, res) => {
            try {
                const sess = await guard(req, res, false)
                if (!sess) return
                const me = await Player.findOne({ userId: sess.u }).select('characters').lean()
                if (!me) return bad(res, 'NOPLAYER', 'لا يوجد حساب', 404)
                res.json({ ok: true, chars: (me.characters || []).map(c => charView(c, req)) })
            } catch (err) {
                console.error('brawl chars error:', err)
                bad(res, 'SERVER', 'خطأ بالخادم', 500)
            }
        })

        app.post('/brawl/team', jsonBody, async (req, res) => {
            try {
                const sess = await guard(req, res, true)
                if (!sess) return
                const player = await Player.findOne({ userId: sess.u })
                if (!player) return bad(res, 'NOPLAYER', 'لا يوجد حساب')

                const raw = (req.body || {}).indexes
                const indexes = Array.isArray(raw) ? raw.slice(0, 3).map(v => parseInt(v)) : []
                if (indexes.length !== 3 || indexes.some(i => isNaN(i))) return bad(res, 'BADNUM', 'أرقام غير صحيحة')
                if (new Set(indexes).size !== 3) return bad(res, 'DUP', 'لا يمكن تكرار نفس الشخصية')
                for (const i of indexes) {
                    if (i < 0 || !player.characters[i]) return bad(res, 'NOCHAR', `الشخصية رقم ${i + 1} غير موجودة`)
                }

                player.pvpTeam = indexes
                await player.save()
                res.json({ ok: true, message: '🥊 تم حفظ التشكيلة — أصبحت جاهزاً للمضاربات' })
            } catch (err) {
                console.error('brawl team error:', err)
                bad(res, 'SERVER', 'خطأ بالخادم', 500)
            }
        })

        // ─── .مضاربة @خصم ───
        app.post('/brawl/challenge', jsonBody, async (req, res) => {
            let unlock = null
            try {
                const sess = await guard(req, res, true)
                if (!sess) return
                unlock = lock([sess.u])
                if (!unlock) return bad(res, 'BUSY', 'انتظر حتى تنتهي عملية المضاربة السابقة.', 409)

                const uname = String((req.body || {}).username || '').trim().replace(/^@/, '').toLowerCase().slice(0, 30)
                const refIn = String((req.body || {}).ref || '')
                if (!uname && !refIn) return bad(res, 'NOUSER', 'اكتب يوزر الخصم')

                const player = await Player.findOne({ userId: sess.u })
                if (!player) return bad(res, 'NOPLAYER', 'لا يوجد حساب')
                if (!hasTeam(player)) return bad(res, 'NOTEAM', 'يجب تحديد تشكيلة أولاً (.تشكيلة 1 2 3)')

                if (refreshBrawlDaily(player)) await player.save()
                if ((player.brawlFights || 0) <= 0) return bad(res, 'LIMIT', `انتهت مضارباتك اليوم (0/${BRAWL_DAILY_LIMIT}) — تتجدد 12:00 ص بتوقيت السعودية`)

                let target = null
                if (refIn) {
                    const rec = refs.get(refIn)
                    if (!rec || rec.by !== sess.u || Date.now() - rec.at > REF_TTL) return bad(res, 'STALE', 'انتهت صلاحية القائمة — حدّثها', 410)
                    target = await Player.findOne({ userId: rec.userId })
                } else target = await Player.findOne({ username: uname })
                if (!target) return bad(res, 'NOTARGET', 'الخصم لا يملك حساباً')
                if (target.userId === sess.u) return bad(res, 'SELF', 'لا يمكنك مضاربة نفسك')
                if (!hasTeam(target)) return bad(res, 'TARGETTEAM', 'الخصم لم يحدد تشكيلة')

                target.pendingBrawl = { challenger: sess.u, createdAt: Date.now() }
                await target.save()

                notifyDm(target.userId, `🥊 ${player.name || player.username} أرسل لك طلب مضاربة!\nافتح صفحة المضاربة بالموقع لقبول الطلب أو رفضه.`).catch(() => {})

                res.json({ ok: true, target: target.name || target.username })
            } catch (err) {
                console.error('brawl challenge error:', err)
                bad(res, 'SERVER', 'خطأ بالخادم', 500)
            } finally { if (unlock) unlock() }
        })

        // ─── .قبول مضاربة ───
        app.post('/brawl/accept', jsonBody, async (req, res) => {
            let unlock = null
            try {
                const sess = await guard(req, res, true)
                if (!sess) return

                const player = await Player.findOne({ userId: sess.u })
                if (!player || !player.pendingBrawl) return bad(res, 'NOREQ', 'لا يوجد طلب مضاربة')

                if (Date.now() - player.pendingBrawl.createdAt > BRAWL_REQUEST_TTL) {
                    player.pendingBrawl = null
                    await player.save()
                    return bad(res, 'EXPIRED', 'انتهت صلاحية طلب المضاربة')
                }

                const challenger = await Player.findOne({ userId: player.pendingBrawl.challenger })
                if (!challenger) {
                    player.pendingBrawl = null
                    await player.save()
                    return bad(res, 'NOCHAL', 'صاحب المضاربة غير موجود')
                }

                // 🔒 قفل الطرفين (نفس .قبول مضاربة)
                unlock = lock([sess.u, challenger.userId])
                if (!unlock) return bad(res, 'BUSY', 'عملية مضاربة جارية، حاول بعد لحظات.', 409)

                if (!hasTeam(player)) return bad(res, 'NOTEAM', 'قم بتحديد تشكيلتك أولاً (.تشكيلة 1 2 3)')
                if (!hasTeam(challenger)) return bad(res, 'TARGETTEAM', 'الخصم لا يملك تشكيلة مكتملة')

                refreshBrawlDaily(player)
                refreshBrawlDaily(challenger)

                if ((player.brawlFights || 0) <= 0) return bad(res, 'LIMIT', 'انتهت مضارباتك اليوم — تتجدد 12:00 ص بتوقيت السعودية')
                if ((challenger.brawlFights || 0) <= 0) return bad(res, 'TARGETLIMIT', 'الخصم لا يملك مضاربات متبقية اليوم')

                player.brawlFights -= 1
                challenger.brawlFights -= 1
                player.pendingBrawl = null
                await player.save()
                await challenger.save()

                const out = await runBrawl(challenger, player, charView, req)
                if (!out.ok) return bad(res, 'TEAM', out.message)

                keepResult([challenger.userId, player.userId], out)
                await saveLog(challenger, player, 'online', out, true)
                res.json({ ok: true, brawl: out })
            } catch (err) {
                console.error('brawl accept error:', err)
                bad(res, 'SERVER', 'خطأ بالخادم', 500)
            } finally { if (unlock) unlock() }
        })

        // ─── .رفض مضاربة ───
        app.post('/brawl/decline', jsonBody, async (req, res) => {
            try {
                const sess = await guard(req, res, true)
                if (!sess) return
                const player = await Player.findOne({ userId: sess.u })
                if (!player || !player.pendingBrawl) return bad(res, 'NOREQ', 'لا يوجد طلب مضاربة')
                player.pendingBrawl = null
                await player.save()
                res.json({ ok: true })
            } catch (err) {
                console.error('brawl decline error:', err)
                bad(res, 'SERVER', 'خطأ بالخادم', 500)
            }
        })

        // ───────────────────────── الصفحة ─────────────────────────
        function pageHTML({ code, csrf, name }) {
            const boot = JSON.stringify({ csrf, code }).replace(/</g, '\\u003c')
            return `${shellHead('🥊 المضاربة')}
<body>
${navDrawerHTML(code, csrf, 'brawl', name)}
<div class="bw">
  <div class="topbar"><span class="tb-l">${NAV_BTN}<span class="gmode">🥊 المضاربة</span></span><a class="pill" href="/u/${esc(code)}">← رجوع للعرض</a></div>

  <section id="lobby" class="bw-sec">
    <div class="bw-stats">
      <div><b id="sLeft">–</b><small>مضاربات اليوم</small></div>
      <div><b id="sRank">–</b><small>رانكك</small></div>
      <div><b id="sWL">–</b><small>فوز / خسارة</small></div>
    </div>

    <div class="bw-h">تشكيلتك</div>
    <div class="bw-team" id="myTeam"></div>
    <button class="bw-btn gold" id="btnTeam" type="button" style="width:100%;margin-top:10px">🎯 تحديد التشكيلة</button>
    <div class="bw-note" id="teamNote" hidden>ما حددت تشكيلتك بعد — اضغط «تحديد التشكيلة» أعلاه (نفس <code>.تشكيلة 1 2 3</code>)</div>

    <div id="incoming" class="bw-req" hidden>
      <div class="bw-req-t">🥊 طلب مضاربة من <b id="inName"></b></div>
      <div class="bw-req-b"><button class="bw-btn gold" id="btnAccept" type="button">قبول</button><button class="bw-btn line" id="btnDecline" type="button">رفض</button></div>
    </div>
    <div id="outgoing" class="bw-wait" hidden>⌛ بانتظار <b id="outName"></b> يقبل الطلب… (تبدأ المضاربة تلقائياً هنا)</div>

    <div class="bw-h">أقرب خصومك (رانك وقوة) <button class="bw-mb" id="btnNear" type="button">↻ تحديث</button></div>
    <div class="bw-msg" id="msg0" role="status"></div>
    <div id="near" class="bw-near"></div>

    <div class="bw-h">تحدّى لاعباً بيوزره</div>
    <form id="chForm" class="bw-form" autocomplete="off">
      <input id="chUser" maxlength="30" placeholder="يوزر الخصم" inputmode="latin" autocapitalize="off">
      <button class="bw-btn gold" type="submit" id="btnSend">إرسال طلب</button>
    </form>
    <div class="bw-msg" id="msg" role="status"></div>
    <div class="bw-h">سجل المضاربات <span class="bw-badge" id="logBadge" hidden></span></div>
    <div id="logList" class="bw-log"></div>
    <div class="bw-hint">⚔️ هجوم = قتال فوري ضد تشكيلة دفاع الخصم (يخصم منك فقط) · 🥊 تحدي مباشر = طلب يقبله الخصم وهو متصل · من لا يملك تشكيلة تُحفظ له أقوى 3 شخصيات للدفاع تلقائياً<br>الطلب صالح 5 دقائق · يخصم من مضارباتك ومضاربات الخصم عند القبول · الفائز 50,000 مال + 100 XP</div>
  </section>

  <section id="stage" class="bw-sec" hidden>
    <div class="bw-hd">
      <div class="bw-who a"><span id="nameA"></span><div class="bw-pips" id="pipsA"></div></div>
      <div class="bw-vs">VS</div>
      <div class="bw-who b"><span id="nameB"></span><div class="bw-pips" id="pipsB"></div></div>
    </div>
    <div class="bw-round" id="roundBanner"></div>
    <div class="bw-arena" id="arena">
      <div class="bw-fl" id="aflash"></div>
      <div class="bw-side a" id="sideA"></div>
      <div class="bw-side b" id="sideB"></div>
    </div>
    <div class="bw-skip"><button class="bw-btn line" id="btnSkip" type="button">تخطي ⏭</button></div>
    <div id="result" hidden></div>
  </section>
</div>

<style>
.bw{max-width:520px;margin:0 auto;padding:0 14px 40px;font-family:'Cairo',sans-serif;color:var(--text,#e8ecf5)}
.bw-sec{margin-top:14px}
.bw-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.bw-stats>div{background:#0f1422;border:1px solid rgba(240,192,74,.28);border-radius:14px;padding:10px 6px;text-align:center}
.bw-stats b{display:block;font:800 18px 'Cairo',sans-serif;color:var(--gold,#f0c04a)}
.bw-stats small{font-size:11px;color:var(--text-dim,#8f98ad)}
.bw-h{margin:18px 2px 8px;font:800 14px 'Cairo',sans-serif;color:var(--text-dim,#8f98ad)}
.bw-team{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.bw-mini{border-radius:14px;border:1.5px solid var(--t,#555);background:#0c101c;overflow:hidden;text-align:center;padding-bottom:6px}
.bw-mini .im{aspect-ratio:3/4;background:#141a2b center/cover no-repeat}
.bw-mini .nm{font:800 12px 'Cairo',sans-serif;margin:6px 4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bw-mini .pw{font:700 12px 'Oswald',sans-serif;color:var(--t,#f0c04a)}
.bw-note,.bw-hint,.bw-msg{font-size:12.5px;color:var(--text-dim,#8f98ad);margin:10px 2px;line-height:1.7}
.bw-note code{direction:ltr;display:inline-block;background:#0f1422;padding:1px 8px;border-radius:8px;color:var(--gold,#f0c04a)}
.bw-msg{min-height:18px;color:#ff8aa0}.bw-msg.ok{color:#6ee7a8}
.bw-form{display:flex;gap:8px}
.bw-form input{flex:1;min-width:0;background:#0f1422;border:1px solid rgba(240,192,74,.3);border-radius:12px;color:inherit;padding:12px;font:600 15px 'Cairo',sans-serif;direction:ltr;text-align:left}
.bw-btn{border-radius:12px;border:1px solid rgba(240,192,74,.4);background:#0f1422;color:var(--gold,#f0c04a);padding:11px 18px;font:800 14px 'Cairo',sans-serif;cursor:pointer}
.bw-btn.gold{background:linear-gradient(180deg,#f6cf63,#d9a21f);color:#241800;border-color:transparent}
.bw-btn:disabled{opacity:.5}
.bw-req,.bw-wait{margin-top:16px;border-radius:16px;padding:14px;background:linear-gradient(180deg,#27141c,#150b11);border:1.5px solid rgba(255,56,96,.5)}
.bw-wait{background:#0f1422;border-color:rgba(240,192,74,.3);font-size:13.5px}
.bw-req-t{font:700 15px 'Cairo',sans-serif;margin-bottom:10px}
.bw-req-b{display:flex;gap:8px}.bw-req-b .bw-btn{flex:1}

.bw-mb{float:left;border:1px solid rgba(240,192,74,.35);background:#0f1422;color:var(--gold,#f0c04a);border-radius:10px;padding:2px 10px;font:700 12px 'Cairo',sans-serif;cursor:pointer}
.bw-near{display:flex;flex-direction:column;gap:10px}
.bw-op{border-radius:16px;border:1px solid rgba(240,192,74,.28);background:#0f1422;padding:10px}
.bw-op-h{display:flex;flex-direction:column;gap:2px}.bw-op-h b{font:900 15px 'Cairo',sans-serif}.bw-op-h small{font-size:12px;color:var(--text-dim,#8f98ad)}
.bw-op-t{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0}
.bw-op-t .th{aspect-ratio:1;border-radius:10px;border:1.5px solid var(--t,#555);background:#141a2b center/cover no-repeat}
.bw-op-b{display:flex;gap:8px}.bw-op-b .bw-btn{flex:1;padding:9px 6px}
.bw-log{display:flex;flex-direction:column;gap:8px}
.bw-lg{display:flex;align-items:center;gap:10px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:#0f1422;padding:9px 10px}
.bw-lg.fresh{border-color:#ff3860;box-shadow:0 0 14px rgba(255,56,96,.35)}
.bw-lg .ic{font-size:22px}.bw-lg .tx{flex:1;min-width:0}.bw-lg .tx b{display:block;font:800 13.5px 'Cairo',sans-serif}.bw-lg .tx small{font-size:11.5px;color:var(--text-dim,#8f98ad)}
.bw-lg .rs{font:800 12px 'Cairo',sans-serif;padding:3px 10px;border-radius:10px}
.bw-lg .rs.win{background:rgba(110,231,168,.15);color:#6ee7a8}.bw-lg .rs.lose{background:rgba(255,107,134,.15);color:#ff6b86}.bw-lg .rs.draw{background:rgba(255,255,255,.1)}
.bw-lg .bw-btn{padding:6px 12px}
.bw-badge{background:#ff3860;color:#fff;border-radius:10px;padding:1px 8px;font:800 11px 'Cairo',sans-serif;margin-inline-start:6px}
/* ───── الحلبة ───── */
.bw-hd{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center}
.bw-who{font:800 14px 'Cairo',sans-serif;min-width:0}.bw-who span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bw-who.b{text-align:left}
.bw-vs{font:700 18px 'Oswald',sans-serif;color:#ff3860;letter-spacing:1px}
.bw-pips{display:flex;gap:5px;margin-top:5px}.bw-who.b .bw-pips{justify-content:flex-end}
.bw-pips i{width:22px;height:6px;border-radius:4px;background:#222a3f;transition:background .4s,box-shadow .4s}
.bw-pips i.on{background:var(--gold,#f0c04a);box-shadow:0 0 10px rgba(240,192,74,.8)}
.bw-pips i.lose{background:#5a2431}
.bw-round{height:44px;margin:12px 0 4px;text-align:center;font:700 26px 'Oswald',sans-serif;color:#fff;letter-spacing:2px;opacity:0;transform:scale(.7)}
.bw-round.in{animation:bwRound .9s ease both}
@keyframes bwRound{0%{opacity:0;transform:scale(.6)}25%{opacity:1;transform:scale(1.12)}60%{opacity:1;transform:scale(1)}100%{opacity:.0;transform:scale(1)}}
.bw-arena{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px 8px;border-radius:20px;border:1.5px solid rgba(255,56,96,.45);background:linear-gradient(180deg,#1b0d26,#0b0710 85%);box-shadow:0 0 30px rgba(255,56,96,.18);overflow:hidden;isolation:isolate}
.bw-fl{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#fff,rgba(255,200,120,.5) 35%,transparent 65%);opacity:0;pointer-events:none;z-index:5}
.bw-fl.go{animation:bwFlash .5s ease-out}
@keyframes bwFlash{0%{opacity:.95}100%{opacity:0}}
.bw-side{display:flex;flex-direction:column;align-items:stretch;gap:8px;min-width:0;position:relative;z-index:2}
.bw-card{position:relative;border-radius:16px;border:2px solid var(--t,#666);background:#0c101c;overflow:hidden;text-align:center;opacity:0;transition:opacity .4s,filter .5s,box-shadow .5s}
.bw-card.in{opacity:1}
.bw-card .im{aspect-ratio:3/4;background:#141a2b center/cover no-repeat;position:relative}
.bw-card .im.no{display:flex;align-items:center;justify-content:center;font:800 22px 'Cairo',sans-serif;color:var(--t)}
.bw-card .nm{font:800 14px 'Cairo',sans-serif;margin:7px 6px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bw-card .rk{font:700 11px 'Oswald',sans-serif;color:var(--t);letter-spacing:.5px}
.bw-pow{font:700 30px 'Oswald',sans-serif;color:#fff;margin:2px 0 8px;font-variant-numeric:tabular-nums;transition:color .25s,transform .25s}
.bw-pow.up{color:#6ee7a8;transform:scale(1.18)}.bw-pow.down{color:#ff6b86;transform:scale(.9)}
.bw-card.win{box-shadow:0 0 0 2px #f0c04a,0 0 28px rgba(240,192,74,.75);animation:bwWin 1s ease-in-out 2}
@keyframes bwWin{50%{transform:translateY(-6px) scale(1.03)}}
.bw-card.lose{filter:grayscale(.85) brightness(.6)}
.bw-card.hit{animation:bwShake .35s}
@keyframes bwShake{20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(4px)}}
.bw-crown{position:absolute;top:6px;inset-inline:0;font-size:26px;opacity:0;transform:translateY(-12px);transition:.4s;z-index:3}
.bw-card.win .bw-crown{opacity:1;transform:none}
.bw-delta{position:absolute;left:50%;top:38%;transform:translateX(-50%);font:800 22px 'Oswald',sans-serif;pointer-events:none;z-index:4;animation:bwFloat 1s ease-out forwards}
@keyframes bwFloat{0%{opacity:0;transform:translate(-50%,10px)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-46px)}}
.bw-evs{display:flex;flex-direction:column;gap:6px;min-height:8px}
.bw-ev{border-radius:12px;background:#10162a;border:1px solid rgba(255,255,255,.1);padding:7px 9px;font-size:12px;line-height:1.5;animation:bwEv .45s cubic-bezier(.2,.9,.3,1.2) both}
.bw-ev b{display:block;font:800 12.5px 'Cairo',sans-serif}
.bw-ev span{color:var(--text-dim,#a2abc0)}
@keyframes bwEv{0%{opacity:0;transform:translateY(10px) scale(.92)}100%{opacity:1;transform:none}}
.bw-eq{font-size:11px;color:var(--text-dim,#8f98ad);background:#0a0e1a;border-radius:10px;padding:6px 8px}
.bw-eq summary{cursor:pointer;font-weight:700}
.bw-skip{text-align:center;margin-top:12px}
.bw-res{margin-top:16px;border-radius:20px;padding:18px 14px;text-align:center;background:linear-gradient(180deg,#1e1a0d,#100d06);border:1.5px solid rgba(240,192,74,.6);animation:bwEv .6s both}
.bw-res.draw{background:#0f1422;border-color:rgba(255,255,255,.2)}
.bw-res h2{margin:0 0 4px;font:900 22px 'Cairo',sans-serif}
.bw-res .sc{font:700 38px 'Oswald',sans-serif;color:var(--gold,#f0c04a);letter-spacing:3px}
.bw-res ul{list-style:none;margin:12px 0;padding:0;font-size:14px;line-height:2}
.bw-res .bw-btn{margin-top:6px}
@media (prefers-reduced-motion:reduce){.bw-card,.bw-card.win,.bw-card.hit,.bw-ev,.bw-round.in,.bw-fl.go,.bw-delta{animation:none!important;transition:none!important}.bw-card{transform:none;opacity:1}.bw-round.in{opacity:1}}
.fx-bg{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;border-radius:inherit}
.fx-bg::before{content:"";position:absolute;left:50%;top:50%;width:240%;aspect-ratio:1;translate:-50% -50%;background:repeating-conic-gradient(rgba(255,90,130,.17) 0 6deg,transparent 6deg 20deg);-webkit-mask:radial-gradient(circle,#000,transparent 60%);mask:radial-gradient(circle,#000,transparent 60%);animation:fxSpin 46s linear infinite}
.fx-bg::after{content:"";position:absolute;inset:0;background:radial-gradient(60% 45% at 50% 42%,rgba(130,80,255,.28),transparent 70%),radial-gradient(55% 40% at 15% 100%,rgba(255,56,96,.28),transparent),radial-gradient(55% 40% at 85% 100%,rgba(62,168,255,.25),transparent)}
@keyframes fxSpin{to{transform:rotate(360deg)}}
.fx-em{position:absolute;bottom:-10px;width:4px;height:4px;border-radius:50%;background:#ffd26a;box-shadow:0 0 8px #ffb347;opacity:0;animation:fxUp linear infinite}
@keyframes fxUp{0%{transform:translate(0,0);opacity:0}15%{opacity:.9}100%{transform:translate(var(--dx),-480px);opacity:0}}
.fx-ring{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;border:4px solid #fff;box-shadow:0 0 30px #ffb347,inset 0 0 20px #ffb347;z-index:6;pointer-events:none}
.fx-sp{position:absolute;width:5px;height:20px;margin:-10px 0 0 -2px;border-radius:3px;background:linear-gradient(#fff,#ffb347);z-index:6;pointer-events:none}
.fx-sl{position:absolute;height:5px;width:140%;margin:-2px 0 0 -70%;background:linear-gradient(90deg,transparent,#fff,transparent);box-shadow:0 0 18px #fff;z-index:6;pointer-events:none}
.fx-hit{position:absolute;z-index:7;font:900 44px 'Oswald',sans-serif;color:#fff;text-shadow:0 0 20px #ff3860,0 0 4px #000;pointer-events:none;margin:-26px 0 0 -24px}
.fx-fl{position:absolute;inset:0;z-index:8;background:radial-gradient(circle,#fff,rgba(255,200,120,.45) 40%,transparent 70%);pointer-events:none}
.fx-ov{position:fixed;inset:0;z-index:80;background:rgba(3,4,9,.78);display:flex;align-items:flex-end;justify-content:center}
.fx-sh{width:100%;max-width:520px;max-height:88vh;display:flex;flex-direction:column;gap:10px;background:#0f1422;border:1px solid rgba(240,192,74,.4);border-bottom:0;border-radius:22px 22px 0 0;padding:16px 14px calc(14px + env(safe-area-inset-bottom,0px));animation:fxUpS .3s cubic-bezier(.2,.9,.3,1)}
@keyframes fxUpS{from{transform:translateY(60px);opacity:0}}
.fx-sh h3{margin:0;font:900 16px 'Cairo',sans-serif;color:#e8ecf5}.fx-sh p{margin:0;font-size:12px;color:#8f98ad}
.fx-gr{overflow:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:4px 2px}
.fx-ch{position:relative;border-radius:14px;border:2px solid var(--t);background:#0c101c;overflow:hidden;cursor:pointer;text-align:center;padding-bottom:6px;color:#e8ecf5}
.fx-ch .im{aspect-ratio:1;background:#141a2b center/cover no-repeat;display:flex;align-items:center;justify-content:center;font:800 22px 'Cairo',sans-serif;color:var(--t)}
.fx-ch .nm{font:800 12px 'Cairo',sans-serif;margin:5px 4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fx-ch .pw{font:700 12px 'Oswald',sans-serif;color:var(--t)}
.fx-ch .no{position:absolute;top:5px;inset-inline-start:5px;min-width:22px;height:22px;border-radius:11px;padding:0 5px;background:rgba(0,0,0,.65);font:700 12px 'Oswald',sans-serif;display:flex;align-items:center;justify-content:center}
.fx-ch .od{position:absolute;top:5px;inset-inline-end:5px;width:26px;height:26px;border-radius:50%;background:#f0c04a;color:#241800;font:900 14px 'Oswald',sans-serif;display:none;align-items:center;justify-content:center}
.fx-ch.on{box-shadow:0 0 0 2px #f0c04a,0 0 18px rgba(240,192,74,.6)}.fx-ch.on .od{display:flex}
.fx-ft{display:flex;gap:8px;align-items:center}.fx-ft .m{flex:1;font-size:12.5px;color:#ff8aa0}.fx-ft .m.ok{color:#6ee7a8}
.fx-b{border-radius:12px;border:1px solid rgba(240,192,74,.4);background:#0f1422;color:#f0c04a;padding:11px 18px;font:800 14px 'Cairo',sans-serif;cursor:pointer}
.fx-b.g{background:linear-gradient(180deg,#f6cf63,#d9a21f);color:#241800;border-color:transparent}.fx-b:disabled{opacity:.45}
</style>

<script>
(function(){
var BOOT=${boot};
var FX=(function(){
var RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
function el(c,p,css){var d=document.createElement('div');d.className=c;if(css)d.style.cssText=css;p.appendChild(d);return d}
function init(ar){if(ar.querySelector('.fx-bg'))return;var bg=document.createElement('div');bg.className='fx-bg';ar.insertBefore(bg,ar.firstChild);if(RM)return;for(var i=0;i<16;i++)el('fx-em',bg,'left:'+Math.random()*100+'%;--dx:'+((Math.random()-.5)*90)+'px;animation-duration:'+(5+Math.random()*6)+'s;animation-delay:'+(-Math.random()*8)+'s')}
function an(e,kf,o){try{return e.animate(kf,o)}catch(x){return null}}
function fin(a){return a?a.finished.catch(function(){}):Promise.resolve()}
// ضربة بطاقة على بطاقة: تجهيز ← اندفاع ← اصطدام (موجة + شرر + شطبة + وميض + اهتزاز) ← ارتداد
async function clash(ca,cb,ar,w,fast){
 if(fast||RM)return;
 var ra=ca.getBoundingClientRect(),rb=cb.getBoundingClientRect(),R=ar.getBoundingClientRect();
 var gap=(rb.left+rb.width/2)-(ra.left+ra.width/2),s=gap>0?1:-1,dist=Math.abs(gap)-ra.width*.8;
 var ta=getComputedStyle(ca).getPropertyValue('--t')||'#fff',tb=getComputedStyle(cb).getPropertyValue('--t')||'#fff';
 var held=[],hold=function(a){if(a)held.push(a);return a};
 // 1) تجهيز
 var wa='translateX('+(-s*22)+'px) scale(1.07)',wb='translateX('+(s*22)+'px) scale(1.07)';
 await Promise.all([fin(hold(an(ca,[{transform:'none'},{transform:wa,boxShadow:'0 0 36px '+ta}],{duration:380,fill:'forwards',easing:'ease-out'}))),fin(hold(an(cb,[{transform:'none'},{transform:wb,boxShadow:'0 0 36px '+tb}],{duration:380,fill:'forwards',easing:'ease-out'})))]);
 // 2) اندفاع (الفائز كامل · التعادل نصف المسافة لكل جهة)
 var da=w===1?dist:w===0?dist/2:dist*.12,db=w===2?dist:w===0?dist/2:dist*.12;
 var sa='translateX('+(s*da)+'px) rotate('+(s*7)+'deg) scale(1.12)',sb='translateX('+(-s*db)+'px) rotate('+(-s*7)+'deg) scale(1.12)';
 await Promise.all([fin(hold(an(ca,[{transform:wa},{transform:sa,boxShadow:'0 0 50px '+ta}],{duration:210,fill:'forwards',easing:'cubic-bezier(.7,0,1,.4)'}))),fin(hold(an(cb,[{transform:wb},{transform:sb,boxShadow:'0 0 50px '+tb}],{duration:210,fill:'forwards',easing:'cubic-bezier(.7,0,1,.4)'})))]);
 // 3) اصطدام
 var lo=w===1?cb:w===2?ca:null,rl=lo?lo.getBoundingClientRect():null;
 var ix=rl?rl.left+rl.width/2-R.left:R.width/2,iy=ra.top-R.top+ra.height*.42;
 el('fx-fl',ar,'').animate([{opacity:.95},{opacity:0}],{duration:520}).onfinish=function(){this.effect.target.remove()};
 for(var k=0;k<2;k++){var rg=el('fx-ring',ar,'left:'+ix+'px;top:'+iy+'px');an(rg,[{transform:'scale(1)',opacity:1},{transform:'scale('+(9+k*4)+')',opacity:0}],{duration:560+k*140,delay:k*110,fill:'both',easing:'ease-out'}).onfinish=(function(r){return function(){r.remove()}})(rg)}
 var sl=el('fx-sl',ar,'left:'+ix+'px;top:'+iy+'px;transform:rotate('+(-28*s)+'deg)');an(sl,[{transform:'rotate('+(-28*s)+'deg) scaleX(0)',opacity:1},{transform:'rotate('+(-28*s)+'deg) scaleX(1)',opacity:1,offset:.4},{transform:'rotate('+(-28*s)+'deg) scaleX(1)',opacity:0}],{duration:420}).onfinish=function(){sl.remove()};
 for(var j=0;j<26;j++){var ang=Math.random()*6.283,d=70+Math.random()*130,sp=el('fx-sp',ar,'left:'+ix+'px;top:'+iy+'px');
  an(sp,[{transform:'translate(0,0) rotate('+ang+'rad)',opacity:1},{transform:'translate('+Math.cos(ang)*d+'px,'+Math.sin(ang)*d+'px) rotate('+ang+'rad) scaleY(.2)',opacity:0}],{duration:520+Math.random()*320,easing:'cubic-bezier(.1,.7,.3,1)'}).onfinish=(function(x){return function(){x.remove()}})(sp)}
 var ht=el('fx-hit',ar,'left:'+ix+'px;top:'+(iy-20)+'px');ht.textContent=w===0?'⚔️':'💥';
 an(ht,[{transform:'scale(.3)',opacity:0},{transform:'scale(1.5)',opacity:1,offset:.3},{transform:'scale(1.1) translateY(-30px)',opacity:0}],{duration:820}).onfinish=function(){ht.remove()};
 an(ar,[{transform:'translate(0,0)'},{transform:'translate(-9px,5px)'},{transform:'translate(8px,-6px)'},{transform:'translate(-6px,-3px)'},{transform:'translate(4px,3px)'},{transform:'translate(0,0)'}],{duration:440});
 // ارتداد المهزوم (يطير للخلف ويدور) وعودة الفائز
 var back=[];
 if(w===1){back.push(fin(an(cb,[{transform:sb},{transform:'translateX('+(s*-60)+'px) rotate('+(s*-22)+'deg) scale(.9)',filter:'brightness(2.4)',offset:.3},{transform:'none'}],{duration:640,easing:'ease-out'})));back.push(fin(an(ca,[{transform:sa},{transform:'none'}],{duration:520,delay:140,easing:'ease-in-out'})))}
 else if(w===2){back.push(fin(an(ca,[{transform:sa},{transform:'translateX('+(s*60)+'px) rotate('+(s*22)+'deg) scale(.9)',filter:'brightness(2.4)',offset:.3},{transform:'none'}],{duration:640,easing:'ease-out'})));back.push(fin(an(cb,[{transform:sb},{transform:'none'}],{duration:520,delay:140,easing:'ease-in-out'})))}
 else{back.push(fin(an(ca,[{transform:sa},{transform:'none'}],{duration:560,delay:120})));back.push(fin(an(cb,[{transform:sb},{transform:'none'}],{duration:560,delay:120})))}
 held.forEach(function(a){a.cancel()});
 await Promise.all(back);
}
// نافذة اختيار التشكيلة (نفس .تشكيلة 1 2 3: الترتيب = ترتيب الجولات)
function picker(o){
 var sel=[],ov=el('fx-ov',document.body),sh=el('fx-sh',ov);
 sh.innerHTML='<h3>🎯 تحديد التشكيلة</h3><p>اختر 3 شخصيات بالترتيب — الأولى تقاتل بالجولة 1، والثانية بالجولة 2، والثالثة بالجولة 3. الرقم الصغير هو رقم الشخصية بالبوت.</p><div class="fx-gr"></div><div class="fx-ft"><span class="m"></span><button class="fx-b" type="button">إلغاء</button><button class="fx-b g" type="button" disabled>حفظ</button></div>';
 var gr=sh.querySelector('.fx-gr'),m=sh.querySelector('.m'),bc=sh.querySelectorAll('.fx-b')[0],bs=sh.querySelectorAll('.fx-b')[1];
 var E=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
 var items=o.chars.map(function(c,ix){var d=document.createElement('div');d.className='fx-ch';d.style.setProperty('--t',c.c||'#888');
  d.innerHTML='<div class="im"'+(c.k&&c.i?' style="background-image:url(\\''+E(c.i)+'\\')"':'')+'>'+(c.k&&c.i?'':E((c.n||'?').charAt(0)))+'</div><div class="nm">'+E(c.n)+'</div><div class="pw">'+Number(c.p||0).toLocaleString('en')+'</div><span class="no">#'+(ix+1)+'</span><span class="od"></span>';
  d.onclick=function(){var p=sel.indexOf(ix);if(p>-1)sel.splice(p,1);else if(sel.length<3)sel.push(ix);paint()};gr.appendChild(d);return d});
 function paint(){items.forEach(function(d,ix){var p=sel.indexOf(ix);d.classList.toggle('on',p>-1);d.querySelector('.od').textContent=p>-1?p+1:''});bs.disabled=sel.length!==3;m.textContent=sel.length+'/3';m.className='m ok'}
 paint();
 var close=function(){ov.remove()};
 bc.onclick=close;ov.onclick=function(e){if(e.target===ov)close()};
 bs.onclick=function(){bs.disabled=true;Promise.resolve(o.onSave(sel.slice())).then(function(r){if(r&&r.ok){m.textContent=r.message||'تم حفظ التشكيلة';m.className='m ok';setTimeout(close,900)}else{m.textContent=(r&&r.message)||'فشل الحفظ';m.className='m';bs.disabled=sel.length!==3}})};
}
function enter(c,from){c.classList.add('in');if(!RM)an(c,[{transform:'translateX('+from+'%)'},{transform:'none'}],{duration:600,easing:'cubic-bezier(.2,.9,.25,1.1)'})}
return {init:init,clash:clash,picker:picker,enter:enter}
})();

var $=function(i){return document.getElementById(i)};
var state=null, busy=false, playing=false, skip=false, pollT=null;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function num(n){return Number(n||0).toLocaleString('en')}
function sleep(ms){return new Promise(function(r){setTimeout(r,skip?0:ms)})}
function api(path,body){
  var o={credentials:'same-origin',headers:{'Content-Type':'application/json'}};
  if(body){o.method='POST';o.body=JSON.stringify(Object.assign({csrf:BOOT.csrf},body))}
  return fetch(path,o).then(function(r){return r.json().catch(function(){return {ok:false,message:'استجابة غير صالحة'}})}).catch(function(){return {ok:false,message:'تعذّر الاتصال'}})
}
function say(t,ok){['msg','msg0'].forEach(function(i){var m=$(i);if(m){m.textContent=t||'';m.className='bw-msg'+(ok?' ok':'')}})}

function miniCard(c){
  var im=c.k&&c.i?'<div class="im" style="background-image:url(\\''+esc(c.i)+'\\')"></div>':'<div class="im"></div>';
  return '<div class="bw-mini" style="--t:'+esc(c.c)+'">'+im+'<div class="nm">'+esc(c.n)+'</div><div class="pw">'+num(c.p)+'</div></div>';
}

function render(st){
  state=st;
  $('sLeft').textContent=st.left+'/'+st.max;
  $('sRank').textContent=st.rank;
  $('sWL').textContent=st.wins+' / '+st.losses;
  $('myTeam').innerHTML=st.team.map(miniCard).join('');
  $('teamNote').hidden=st.ready;$('btnTeam').textContent=st.ready?'🎯 تغيير التشكيلة':'🎯 تحديد التشكيلة';
  $('btnSend').disabled=!st.ready||st.left<=0;
  var lb=$('logBadge');if(st.logUnseen){lb.hidden=false;lb.textContent=st.logUnseen+' جديد'}else lb.hidden=true;
  if(st.logUnseen>lastUn)loadLog();lastUn=st.logUnseen||0;
  var inc=$('incoming');
  if(st.incoming){inc.hidden=false;$('inName').textContent=st.incoming.name}else inc.hidden=true;
  var out=$('outgoing');
  if(st.outgoing){out.hidden=false;$('outName').textContent=st.outgoing.name}else out.hidden=true;
}

var lastUn=0;
function ago(t){var s=Math.max(0,(Date.now()-t)/1000);if(s<60)return 'الآن';if(s<3600)return 'قبل '+Math.floor(s/60)+' د';if(s<86400)return 'قبل '+Math.floor(s/3600)+' س';return 'قبل '+Math.floor(s/86400)+' يوم'}
function thumb(c){return '<span class="th" style="--t:'+esc(c.c)+(c.k&&c.i?';background-image:url(&quot;'+esc(c.i)+'&quot;)':'')+'"></span>'}
function opHTML(o){return '<div class="bw-op"><div class="bw-op-h"><b>'+(o.online?'🟢 ':'')+esc(o.name)+'</b><small>'+esc(o.tier)+' · '+num(o.points)+' نقطة · ⚔️ '+num(o.power)+'</small></div><div class="bw-op-t">'+o.team.map(thumb).join('')+'</div><div class="bw-op-b"><button class="bw-btn gold" data-a="atk" data-r="'+esc(o.ref)+'" type="button">⚔️ هجوم</button>'+(o.online?'<button class="bw-btn line" data-a="ch" data-r="'+esc(o.ref)+'" type="button">🥊 تحدي مباشر</button>':'')+'</div></div>'}
function setRf(n){var b=$('btnNear');b.textContent='↻ تحديث ('+n+')';b.disabled=n<=0}
function loadNear(manual){var box=$('near');if(!manual)box.innerHTML='<div class="bw-note">جاري البحث عن خصوم…</div>';api('/brawl/near'+(manual===true?'?r=1':'')).then(function(r){if(!r||!r.ok){if(manual===true&&r&&r.code==='REFRESHLIMIT'){setRf(0);say(r.message)}else if(manual!==true)box.innerHTML='<div class="bw-note">'+esc((r&&r.message)||'تعذّر التحميل')+'</div>';return}if(typeof r.refreshLeft==='number')setRf(r.refreshLeft);box.innerHTML=r.list.length?r.list.map(opHTML).join(''):'<div class="bw-note">ما فيه خصوم مناسبين الآن</div>'})}
function loadLog(){api('/brawl/log').then(function(r){if(!r||!r.ok)return;var box=$('logList');if(!r.items.length){box.innerHTML='<div class="bw-note">ما فيه مضاربات بعد</div>';return}box.innerHTML=r.items.map(function(x){var t=x.role==='d'?'هاجمك '+esc(x.name):'هاجمت '+esc(x.name);var rs=x.res==='win'?'فزت':x.res==='lose'?'خسرت':'تعادل';return '<div class="bw-lg'+(x.fresh?' fresh':'')+'"><span class="ic">'+(x.role==='d'?'🛡️':'⚔️')+'</span><div class="tx"><b>'+t+'</b><small>'+(x.mode==='offline'?'هجوم مباشر':'تحدي مباشر')+' · '+x.mine+' - '+x.theirs+' · '+ago(x.at)+'</small></div><span class="rs '+x.res+'">'+rs+'</span><button class="bw-btn line" data-id="'+esc(x.id)+'" type="button" aria-label="إعادة">▶</button></div>'}).join('')})}
function seen(id){try{return sessionStorage.getItem('bw_seen')===id}catch(e){return false}}
function markSeen(id){try{sessionStorage.setItem('bw_seen',id)}catch(e){}}

function poll(){
  clearTimeout(pollT);
  if(playing||document.hidden){pollT=setTimeout(poll,3000);return}
  api('/brawl/state').then(function(st){
    if(st&&st.ok){
      render(st);
      // الخصم قبل الطلب وأنا أنتظر: أجلب النتيجة وأعرضها بنفس الأنميشن
      if(st.latestId&&!seen(st.latestId)){
        markSeen(st.latestId);
        api('/brawl/result?id='+encodeURIComponent(st.latestId)).then(function(r){if(r&&r.ok)play(r.brawl)});
      }
    }
    pollT=setTimeout(poll,3000);
  });
}

// ───────── الأنميشن ─────────
function cardHTML(c,eq){
  var im=c.k&&c.i?'<div class="im" style="background-image:url(\\''+esc(c.i)+'\\')"></div>':'<div class="im no">'+esc((c.n||'?').charAt(0))+'</div>';
  return '<div class="bw-card" style="--t:'+esc(c.c)+'"><div class="bw-crown">👑</div>'+im+
    '<div class="nm">'+esc(c.n)+'</div><div class="rk">'+esc(c.r)+' · '+'★'.repeat(c.s||1)+'</div>'+
    '<div class="bw-pow">0</div></div><div class="bw-evs"></div>';
}
function tween(el,from,to,ms){
  if(skip||from===to){el.textContent=num(to);return}
  var t0=performance.now();
  (function step(t){var k=Math.min(1,(t-t0)/ms);var e=1-Math.pow(1-k,3);el.textContent=num(Math.round(from+(to-from)*e));if(k<1)requestAnimationFrame(step)})(t0);
}
function setPow(side,from,to){
  var el=side.querySelector('.bw-pow');
  tween(el,from,to,500);
  el.classList.remove('up','down');
  void el.offsetWidth;
  if(to>from)el.classList.add('up');else if(to<from)el.classList.add('down');
  setTimeout(function(){el.classList.remove('up','down')},600);
  if(to!==from&&!skip){
    var d=document.createElement('div');d.className='bw-delta';
    d.style.color=to>from?'#6ee7a8':'#ff6b86';
    d.textContent=(to>from?'+':'')+num(to-from);
    side.querySelector('.bw-card').appendChild(d);
    setTimeout(function(){d.remove()},1000);
  }
}
function pips(id,list){$(id).innerHTML=list.map(function(s){return '<i class="'+s+'"></i>'}).join('')}

async function play(b){
  if(playing)return;
  playing=true;skip=false;
  $('lobby').hidden=true;$('stage').hidden=false;$('result').hidden=true;$('btnSkip').parentNode.hidden=false;
  window.scrollTo({top:0});
  $('nameA').textContent=b.names[0];$('nameB').textContent=b.names[1];
  var pa=['','',''],pb=['','',''];pips('pipsA',pa);pips('pipsB',pb);
  $('sideA').innerHTML='';$('sideB').innerHTML='';FX.init($('arena'));
  await sleep(1200); // نفس تأخير بداية المضاربة

  for(var i=0;i<b.rounds.length;i++){
    var r=b.rounds[i];
    var rb=$('roundBanner');rb.textContent='الجولة '+r.n;rb.classList.remove('in');void rb.offsetWidth;rb.classList.add('in');
    var A=$('sideA'),B=$('sideB');
    A.innerHTML=cardHTML(r.a);B.innerHTML=cardHTML(r.b);
    await sleep(80);
    FX.enter(A.querySelector('.bw-card'),120);FX.enter(B.querySelector('.bw-card'),-120);
    await sleep(700);
    var cur=[r.start[0],r.start[1]];
    setPow(A,0,cur[0]);setPow(B,0,cur[1]);
    await sleep(800);

    // الأحداث بالترتيب (معدات ← نمر/دب ← مراوغة ← ... ← قدرات UR)
    for(var k=0;k<r.ev.length;k++){
      var e=r.ev[k];
      var host=(e.s===2?B:A);
      if(e.s===0){ // دمج المعدات (الجهتين)
        [A,B].forEach(function(sd){var d=document.createElement('div');d.className='bw-ev';d.innerHTML='<b>'+esc(e.ic)+' '+esc(e.t)+'</b><span>'+esc(e.x)+'</span>';sd.querySelector('.bw-evs').appendChild(d)});
      }else{
        var d=document.createElement('div');d.className='bw-ev';
        d.innerHTML='<b>'+esc(e.ic)+' '+esc(e.t)+'</b><span>'+esc(e.x)+'</span>';
        host.querySelector('.bw-evs').appendChild(d);
      }
      if(e.d1!==cur[0]){setPow(A,cur[0],e.d1);if(e.d1<cur[0])hit(A)}
      if(e.d2!==cur[1]){setPow(B,cur[1],e.d2);if(e.d2<cur[1])hit(B)}
      cur=[e.d1,e.d2];
      await sleep(950);
    }

    // المواجهة
    setPow(A,cur[0],r.d1);setPow(B,cur[1],r.d2);
    await sleep(500);
    var ca=A.querySelector('.bw-card'),cb=B.querySelector('.bw-card');
    await FX.clash(ca,cb,$('arena'),r.w,skip);
    await sleep(300);
    if(r.w===1){ca.classList.add('win');cb.classList.add('lose');pa[i]='on';pb[i]='lose'}
    else if(r.w===2){cb.classList.add('win');ca.classList.add('lose');pb[i]='on';pa[i]='lose'}
    pips('pipsA',pa);pips('pipsB',pb);

    // ملخص دمج الإيكوز لكل شخصية (نفس رسالة الواتساب)
    [[A,r.eq1],[B,r.eq2]].forEach(function(p){
      var d=document.createElement('details');d.className='bw-eq';
      d.innerHTML='<summary>🛡️ دمج الإيكوز</summary>'+(p[1].length?p[1].map(esc).join('<br>'):'لا توجد معدات مجهزة');
      p[0].appendChild(d);
    });
    await sleep(r.w===0?1500:2500); // نفس تأخير 2.5 ثانية بين الجولات
  }
  showResult(b);
}
function hit(side){var c=side.querySelector('.bw-card');c.classList.remove('hit');void c.offsetWidth;c.classList.add('hit')}

function showResult(b){
  skip=false;
  $('btnSkip').parentNode.hidden=true;
  var w=b.winner,box=$('result');
  var lines=[];
  if(w){
    lines.push('💰 المكافأة: <b>'+num(b.money)+'</b> مال');
    lines.push('⭐ الخبرة: <b>'+b.xp+' XP</b>');
    b.rank.forEach(function(r){
      var who=esc(b.names[r.who-1]);
      lines.push(r.up?('🎉 ترقية رانك '+who+': '+esc(r.from)+' ⬅️ '+esc(r.to)+' · 💰 +'+num(r.money)+' · '+esc(r.box)):('🔻 تراجع رانك '+who+': '+esc(r.from)+' ⬅️ '+esc(r.to)));
    });
    if(b.worldText)lines.push('🌍 '+esc(b.worldText));
  }else lines.push('🚫 لا توجد مكافآت');
  box.className='bw-res'+(w?'':' draw');
  box.innerHTML=(w?'<h2>👑 الفائز النهائي: '+esc(b.names[w-1])+'</h2>':'<h2>⚖️ انتهت المضاربة بالتعادل</h2>')+
    '<div class="sc">'+b.wins[0]+' - '+b.wins[1]+'</div><ul>'+lines.map(function(l){return '<li>'+l+'</li>'}).join('')+'</ul>'+
    '<button class="bw-btn gold" id="btnAgain" type="button">رجوع للوبي</button>';
  box.hidden=false;
  box.scrollIntoView({behavior:'smooth',block:'center'});
  $('btnAgain').onclick=function(){playing=false;$('stage').hidden=true;$('lobby').hidden=false;say('');poll();loadNear();loadLog()};
}

// ───────── الأحداث ─────────
$('btnSkip').onclick=function(){skip=true};
$('chForm').onsubmit=function(ev){
  ev.preventDefault();if(busy)return;
  var u=$('chUser').value.trim();if(!u){say('اكتب يوزر الخصم');return}
  busy=true;$('btnSend').disabled=true;say('');
  api('/brawl/challenge',{username:u}).then(function(r){
    busy=false;
    if(r.ok){say('🥊 تم إرسال طلب المضاربة إلى '+r.target,true);$('chUser').value='';poll()}
    else{say(r.message||'فشل الإرسال');$('btnSend').disabled=false}
  });
};
$('btnAccept').onclick=function(){
  if(busy)return;busy=true;$('btnAccept').disabled=true;
  api('/brawl/accept',{}).then(function(r){
    busy=false;$('btnAccept').disabled=false;
    if(r.ok){markSeen(r.brawl.id);play(r.brawl)}
    else{say(r.message||'تعذّر القبول');poll()}
  });
};
$('btnDecline').onclick=function(){
  if(busy)return;busy=true;
  api('/brawl/decline',{}).then(function(r){busy=false;say(r.ok?'❌ تم رفض المضاربة':(r.message||'فشل'),r.ok);poll()});
};
$('btnTeam').onclick=function(){api('/brawl/chars').then(function(r){if(!r.ok){say(r.message||'تعذّر التحميل');return}FX.picker({chars:r.chars,onSave:function(ix){return api('/brawl/team',{indexes:ix}).then(function(x){if(x.ok)poll();return x})}})})};
$('btnNear').onclick=function(){loadNear(true)};
$('near').onclick=function(e){var b=e.target.closest('button[data-a]');if(!b||busy)return;var ref=b.getAttribute('data-r');busy=true;b.disabled=true;say('');
 if(b.getAttribute('data-a')==='atk'){api('/brawl/attack',{ref:ref}).then(function(r){busy=false;b.disabled=false;if(r.ok){markSeen(r.brawl.id);play(r.brawl)}else{say(r.message||'فشل الهجوم');if(r.code==='STALE')loadNear()}})}
 else{api('/brawl/challenge',{ref:ref}).then(function(r){busy=false;b.disabled=false;if(r.ok){say('🥊 تم إرسال طلب المضاربة إلى '+r.target,true);poll()}else say(r.message||'فشل الإرسال')})}};
$('logList').onclick=function(e){var b=e.target.closest('button[data-id]');if(!b||busy)return;busy=true;api('/brawl/replay?id='+encodeURIComponent(b.getAttribute('data-id'))).then(function(r){busy=false;if(r&&r.ok)play(r.brawl);else say((r&&r.message)||'تعذّر عرض الإعادة')})};
document.addEventListener('visibilitychange',function(){if(!document.hidden)poll()});
loadNear();loadLog();poll();
})();
</script>
</body></html>`
        }
    }

    return { mount, fightRound, runBrawl }
}

module.exports = { create }
