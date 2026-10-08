// =====================================================================
// systems/siteChallenge.js
// ⚔️ التحدي (PvP) من الموقع — نفس نظام أوامر البوت (.تحدي / .قبول_تحدي / .هجوم الخصم / .مهارة / .ألتميت)
// - الدعوات تُحفظ بقاعدة البيانات (مهلة 30 ثانية) وتصل لحظياً عبر Server-Sent Events
// - اللاعب "متصل" = عنده صفحة مفتوحة بالموقع (اتصال SSE)
// - محاولة التحدي تُخصم عند القبول فقط (قرار المطوّر)
// - القتال نفسه يُخزَّن بنفس موديل PvP حتى تبقى أوامر البوت تشتغل على نفس القتال
// =====================================================================

'use strict'

const crypto = require('crypto')
const UI = require('./siteChallengeUI')

const INVITE_MS = 30 * 1000            // مهلة الدعوة
const IDLE_MS = 10 * 60 * 1000         // نفس خمول البوت (10 دقائق بدون حركة)
const MAX_CONN_PER_USER = 8
const STAT_FIELDS = ['attack', 'defense', 'critRate', 'critDamage', 'dodge', 'hp', 'accuracy', 'shield', 'lifesteal', 'reflect', 'bossDamage']

module.exports = function createSiteChallenge(deps) {
    const {
        Player, PvP, mongoose, equipmentSystem, getTotalStats, calculateDamageAdvanced,
        getRank, getRankTier, applyRankTierPromotion, applyDogBonus, addCommandXp, COMMAND_XP,
        checkAndGrantAchievement, orbs, getPeriod, getSock
    } = deps

    const Invite = Player.db.models.SiteChallengeInvite || Player.db.model('SiteChallengeInvite', new mongoose.Schema({
        id: { type: String, index: true },
        from: String,
        to: String,
        status: { type: String, default: 'pending' }, // pending | accepted | rejected | cancelled | expired | failed
        exp: { type: Date, index: { expireAfterSeconds: 3600 } },
        at: { type: Date, default: Date.now }
    }, { minimize: false }))

    // ───────────── حالة بالذاكرة ─────────────
    const conns = new Map()          // userId -> Set<res>   (اتصالات SSE)
    const pidToUser = new Map()      // معرّف مجهول -> userId
    const fightMeta = new Map()      // fightId -> { max1, max2, sh1, sh2, c1, c2 }
    const locks = new Map()          // قفل لكل قتال/لاعب
    const hits = new Map()

    const secret = String(process.env.SESSION_SECRET || 'challenge-fallback-salt')
    function pidOf(u) {
        const p = crypto.createHmac('sha256', secret).update('ch:' + u).digest('hex').slice(0, 14)
        if (!pidToUser.has(p)) { if (pidToUser.size > 30000) pidToUser.clear(); pidToUser.set(p, u) }
        return p
    }

    function rate(u) {
        const now = Date.now()
        const arr = (hits.get(u) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 90) { hits.set(u, arr); return false }
        arr.push(now); hits.set(u, arr); return true
    }

    function withLock(key, fn) {
        const prev = locks.get(key) || Promise.resolve()
        const run = prev.catch(() => {}).then(fn)
        const tail = run.catch(() => {})
        locks.set(key, tail)
        tail.then(() => { if (locks.get(key) === tail) locks.delete(key) })
        return run
    }

    const isOnline = u => conns.has(u) && conns.get(u).size > 0

    function emit(userId, event, data) {
        const set = conns.get(userId)
        if (!set) return
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        for (const res of set) {
            try { res.write(payload); if (typeof res.flush === 'function') res.flush() } catch (e) { /* يُنظَّف عند close */ }
        }
    }

    // ───────────── أدوات اللاعبين ─────────────
    function periodResetMs() {
        const H2 = 7200000, OFF = 10800000 // توقيت السعودية (UTC+3) — التجديد عند رأس كل ساعتين
        const now = Date.now()
        return Math.max(0, (Math.floor((now + OFF) / H2) + 1) * H2 - OFF - now)
    }

    function attemptsLeft(player) {
        if (player.lastChallengeReset !== getPeriod()) return 5
        return Math.max(0, Number(player.challengeFights) || 0)
    }

    // نفس getGroupHP بالبوت
    function getGroupHP(player) {
        if (!player.characters?.length) return 1000
        const totalPower = player.characters.reduce((t, c) => t + Number(c.power || 0), 0)
        const HP_CAP = 150000, HP_MIN = 1000, HP_SCALE = 75
        const rawHp = Math.floor(HP_SCALE * Math.sqrt(totalPower))
        return Math.min(HP_CAP, Math.max(HP_MIN, rawHp))
    }

    function bestChar(player) {
        let best = null
        for (const c of (player.characters || [])) if (!best || Number(c.power || 0) > Number(best.power || 0)) best = c
        return best
    }

    function person(player, ctx, req) {
        const best = bestChar(player)
        const v = best ? ctx.charView(best, req) : null
        return {
            pid: pidOf(player.userId),
            u: player.username || '',
            n: String(player.name || player.username || 'لاعب').slice(0, 24),
            pw: ctx.cappedPower(player) || 0,
            img: v && v.i ? v.i : null,
            h: parseInt(pidOf(player.userId).slice(0, 3), 16) % 360
        }
    }

    async function activeFight(userId) {
        return PvP.findOne({ active: true, $or: [{ player1: userId }, { player2: userId }] })
    }

    async function pendingInvite(userId) {
        return Invite.findOne({ status: 'pending', exp: { $gt: new Date() }, $or: [{ from: userId }, { to: userId }] }).lean()
    }

    // ───────────── الدعوات ─────────────
    async function expireInvite(id) {
        const inv = await Invite.findOneAndUpdate({ id, status: 'pending' }, { status: 'expired' }, { new: true }).lean()
        if (!inv) return
        emit(inv.from, 'result', { type: 'expired', id })
        emit(inv.to, 'result', { type: 'expired', id })
    }

    // ───────────── القتال ─────────────
    async function metaFor(fight) {
        const key = String(fight._id)
        let m = fightMeta.get(key)
        if (m) return m
        const [p1, p2] = await Promise.all([Player.findOne({ userId: fight.player1 }), Player.findOne({ userId: fight.player2 })])
        m = {
            max1: Math.max(getGroupHP(p1 || {}), fight.hp1 || 0),
            max2: Math.max(getGroupHP(p2 || {}), fight.hp2 || 0),
            sh1: Math.max(1, fight.shield1 || 0),
            sh2: Math.max(1, fight.shield2 || 0),
            n1: String(p1?.name || p1?.username || 'لاعب').slice(0, 24),
            n2: String(p2?.name || p2?.username || 'لاعب').slice(0, 24),
            at: Date.now()
        }
        fightMeta.set(key, m)
        return m
    }

    async function stateFor(fight, userId, ctx, req) {
        const m = await metaFor(fight)
        const p1 = userId === fight.player1
        const side = (isFirst) => {
            const team = (isFirst ? fight.team1 : fight.team2) || []
            const tv = team.map(c => ctx.charView(c, req))
            return {
                team: tv,
                tp: tv.reduce((a, c) => a + (c.p || 0), 0),
                hp: Math.max(0, isFirst ? fight.hp1 : fight.hp2),
                max: isFirst ? m.max1 : m.max2,
                sh: Math.max(0, isFirst ? fight.shield1 : fight.shield2) || 0,
                shMax: isFirst ? m.sh1 : m.sh2,
                turns: (isFirst ? fight.player1Turns : fight.player2Turns) || 0,
                sk: (isFirst ? fight.skillTurn1 : fight.skillTurn2) ?? -99,
                ul: (isFirst ? fight.ultimateTurn1 : fight.ultimateTurn2) ?? -99,
                burn: Math.max(0, Number((isFirst ? fight.burn?.player1 : fight.burn?.player2) || 0)),
                name: isFirst ? m.n1 : m.n2
            }
        }
        return {
            id: String(fight._id),
            turn: fight.turn === userId ? 'me' : 'foe',
            me: side(p1),
            foe: side(!p1),
            round: (fight.turnCount || 0) + 1
        }
    }

    function applyEquip(stats, bonus) {
        for (const f of STAT_FIELDS) stats[f] = (stats[f] || 0) + (bonus[f] || 0)
    }

    // نهاية القتال — نفس مكافآت البوت حرفياً (فائز/خاسر)
    async function finishFight(fight) {
        const winner = fight.hp1 > 0 ? fight.player1 : fight.player2
        const loser = winner === fight.player1 ? fight.player2 : fight.player1
        const [winnerData, loserData] = await Promise.all([Player.findOne({ userId: winner }), Player.findOne({ userId: loser })])
        const sock = (typeof getSock === 'function' && getSock()) || null

        const moneyReward = Math.floor(500 + Math.random() * 500)
        const xpReward = COMMAND_XP.challengeWin
        await winnerData.addMoney(moneyReward)
        winnerData.xp += applyDogBonus(winnerData, xpReward)

        const oldRank = winnerData.rank
        winnerData.wins += 1
        winnerData.mmr += 20
        winnerData.rank = getRank(winnerData.mmr)
        try { await checkAndGrantAchievement(winnerData, 'pvp', winnerData.wins, sock, winner) } catch (e) { console.error('site challenge achv:', e.message) }
        try { await checkAndGrantAchievement(winnerData, 'wealth', winnerData.totalEarnedMoney, sock, winner) } catch (e) { console.error('site challenge achv:', e.message) }

        let boxReward = ''
        const randomBox = Math.random()
        if (randomBox < 0.60) { winnerData.boxes.basic += 1; boxReward = '📦 صندوق عادي' }
        else if (randomBox < 0.90) { winnerData.boxes.rare += 1; boxReward = '🎁 صندوق نادر' }
        else { winnerData.boxes.epic += 1; boxReward = '✨ صندوق ملحمي' }

        loserData.losses += 1
        const loseXp = addCommandXp(loserData, COMMAND_XP.challengeLose)
        loserData.mmr = Math.max(0, loserData.mmr - 10)
        winnerData.rank = getRank(winnerData.mmr)
        loserData.rank = getRank(loserData.mmr)

        // 🏆 الرانك الجديد (مشترك بين .مضاربة و .تحدي)
        const wOldTier = winnerData.rankTier
        const lOldTier = loserData.rankTier
        winnerData.rankWins = (winnerData.rankWins || 0) + 1
        loserData.rankLosses = (loserData.rankLosses || 0) + 1
        winnerData.rankPoints = (winnerData.rankPoints || 0) + 20
        loserData.rankPoints = Math.max(0, (loserData.rankPoints || 0) - 10)
        winnerData.rankTier = getRankTier(winnerData.rankPoints)
        loserData.rankTier = getRankTier(loserData.rankPoints)
        try { await applyRankTierPromotion(winnerData, wOldTier) } catch (e) { console.error('site challenge rank:', e.message) }
        try { await applyRankTierPromotion(loserData, lOldTier) } catch (e) { console.error('site challenge rank:', e.message) }

        await winnerData.save()
        try { await orbs.trackMission(winnerData.userId, 'challengeWins', { sock, jid: winner }) } catch (e) { console.error('site challenge orb:', e.message) }
        await loserData.save()

        await PvP.deleteOne({ _id: fight._id })
        fightMeta.delete(String(fight._id))

        const rankUp = oldRank !== winnerData.rank ? `${oldRank} ⬅️ ${winnerData.rank}` : ''
        const tierUp = wOldTier && wOldTier !== winnerData.rankTier ? `${wOldTier} ⬅️ ${winnerData.rankTier}` : ''
        return {
            winner, loser,
            win: { money: moneyReward, xp: xpReward, mmr: 20, box: boxReward, rankUp, tierUp },
            lose: { xp: loseXp || COMMAND_XP.challengeLose, mmr: -10 }
        }
    }

    // تنفيذ حركة: a = هجوم الخصم · s = مهارة · u = ألتميت — نفس معادلات البوت وبنفس الترتيب
    async function perform(userId, kind, ctx, req) {
        const fight0 = await activeFight(userId)
        if (!fight0) return { err: 'NOFIGHT', message: 'أنت لست داخل قتال' }
        return withLock('f:' + String(fight0._id), async () => {
            const fight = await PvP.findById(fight0._id)
            if (!fight || !fight.active) return { err: 'NOFIGHT', message: 'انتهى القتال' }

            if (fight.lastMove && Date.now() - new Date(fight.lastMove).getTime() > IDLE_MS) {
                await PvP.deleteOne({ _id: fight._id })
                fightMeta.delete(String(fight._id))
                for (const u of [fight.player1, fight.player2]) emit(u, 'ended', { reason: 'idle' })
                return { err: 'IDLE', message: '⌛ انتهت المعركة بسبب الخمول' }
            }
            if (fight.turn !== userId) return { err: 'NOTURN', message: 'ليس دورك' }
            if (!fight.team1 || !fight.team2 || !fight.team1.length || !fight.team2.length) {
                return { err: 'CORRUPT', message: 'بيانات القتال تالفة، أعد إنشاء التحدي' }
            }

            const isP1 = userId === fight.player1
            const oppId = isP1 ? fight.player2 : fight.player1
            const myTurns = isP1 ? (fight.player1Turns || 0) : (fight.player2Turns || 0)

            // تبريد المهارة (جولتان) والألتميت (5 جولات)
            if (kind === 's') {
                const last = isP1 ? (fight.skillTurn1 ?? -99) : (fight.skillTurn2 ?? -99)
                if (last >= 0 && myTurns - last < 2) return { err: 'CD', message: '⏳ المهارة تحتاج انتظار جولتين' }
            }
            if (kind === 'u') {
                const last = isP1 ? (fight.ultimateTurn1 ?? -99) : (fight.ultimateTurn2 ?? -99)
                if (last >= 0 && myTurns - last < 5) return { err: 'CD', message: '⏳ الألتميت يحتاج انتظار 5 جولات' }
            }

            // حرق/سم (يُحسب مع الهجوم والألتميت فقط — كما بالبوت)
            let dotDamage = 0
            if (kind === 'a' || kind === 'u') {
                if (fight.burn && fight.burn.player1 > 0 && isP1) { dotDamage += 150; fight.burn.player1-- }
                if (fight.burn && fight.burn.player2 > 0 && !isP1) { dotDamage += 150; fight.burn.player2-- }
                if (fight.poison && fight.poison.player1 > 0 && isP1) { dotDamage += 100; fight.poison.player1-- }
                if (fight.poison && fight.poison.player2 > 0 && !isP1) { dotDamage += 100; fight.poison.player2-- }
            }

            const myTeam = isP1 ? fight.team1 : fight.team2
            const foeTeam = isP1 ? fight.team2 : fight.team1
            const idx = Math.floor(Math.random() * myTeam.length)
            const attacker = myTeam[idx]

            if (kind === 's') { if (isP1) fight.skillTurn1 = fight.player1Turns || 0; else fight.skillTurn2 = fight.player2Turns || 0 }
            if (kind === 'u') { if (isP1) fight.ultimateTurn1 = fight.player1Turns || 0; else fight.ultimateTurn2 = fight.player2Turns || 0 }

            const [playerData, opponentData] = await Promise.all([Player.findOne({ userId }), Player.findOne({ userId: oppId })])
            const aS = getTotalStats(playerData)
            const oS = getTotalStats(opponentData)
            const myEq = equipmentSystem.calculateTeamEquipmentStats(myTeam)
            const foeEq = equipmentSystem.calculateTeamEquipmentStats(foeTeam)
            applyEquip(aS, myEq)
            applyEquip(oS, foeEq)
            equipmentSystem.applyEquipPercentBonus(aS, myEq)
            equipmentSystem.applyEquipPercentBonus(oS, foeEq)
            aS.power = attacker.power
            aS.level = playerData.level
            oS.level = opponentData.level

            const result = calculateDamageAdvanced(aS, oS)
            let damage = result.damage
            if (kind === 'a' || kind === 'u') damage += dotDamage
            if (kind === 's') damage = Math.floor(damage * 1.5)
            if (kind === 'u') damage = Math.floor(damage * 2.5)

            const ev = { id: crypto.randomBytes(6).toString('hex'), by: userId, kind, idx, res: 'hit', crit: false, dmg: 0, absorbed: 0, heal: 0 }
            const switchTurn = () => { fight.turn = oppId; fight.lastMove = new Date() }

            // تفادي (من معادلة الضرر)
            if (result.dodge) {
                ev.res = 'dodge'
                switchTurn()
                if (kind !== 'a') fight.turnCount = (fight.turnCount || 0) + 1
                await fight.save()
                return { ok: true, fight, ev, ended: null }
            }

            let critical = false
            if (kind === 'a') {
                // دقة الضربة
                if (aS.accuracy > 0 && Math.random() * 100 > aS.accuracy) {
                    ev.res = 'miss'; switchTurn(); await fight.save()
                    return { ok: true, fight, ev, ended: null }
                }
                // تفادي الخصم
                if (oS.dodge > 0 && Math.random() * 100 < oS.dodge) {
                    ev.res = 'dodge'; switchTurn(); await fight.save()
                    return { ok: true, fight, ev, ended: null }
                }
                if (aS.critRate > 0 && Math.random() * 100 < aS.critRate) {
                    critical = true
                    damage = Math.floor(damage * (1 + aS.critDamage / 100))
                }
            }
            ev.crit = !!(critical || result.crit)

            // الدرع
            let absorbed = 0
            if (isP1) {
                if (fight.shield2 > 0) { absorbed = Math.min(damage, fight.shield2); fight.shield2 -= absorbed; damage -= absorbed }
            } else {
                if (fight.shield1 > 0) { absorbed = Math.min(damage, fight.shield1); fight.shield1 -= absorbed; damage -= absorbed }
            }
            if (isP1) fight.hp2 -= damage; else fight.hp1 -= damage
            if (kind === 'a') { fight.hp1 = Math.max(0, fight.hp1); fight.hp2 = Math.max(0, fight.hp2) }

            // امتصاص الحياة
            let heal = 0
            if (aS.lifesteal > 0 && damage > 0) {
                heal = Math.floor(damage * aS.lifesteal / 100)
                if (isP1) fight.hp1 += heal; else fight.hp2 += heal
            }

            switchTurn()
            if (kind === 'a' || kind === 'u') {
                fight.turnCount = (fight.turnCount || 0) + (kind === 'a' ? 1 : 0)
                if (isP1) fight.player1Turns = (fight.player1Turns || 0) + 1
                else fight.player2Turns = (fight.player2Turns || 0) + 1
            }

            ev.dmg = damage
            ev.absorbed = absorbed
            ev.heal = heal
            ev.dot = (kind === 'a' || kind === 'u') ? dotDamage : 0

            if (fight.hp1 <= 0 || fight.hp2 <= 0) {
                const ended = await finishFight(fight)
                return { ok: true, fight, ev, ended }
            }

            if (kind === 's') {
                if (isP1) fight.skillTurn1 = fight.player1Turns || 0; else fight.skillTurn2 = fight.player2Turns || 0
            }
            await fight.save()
            if (kind === 's') { playerData.skillCooldown = Date.now() + 10000; await playerData.save() }
            if (kind === 'u') { playerData.ultimateCooldown = Date.now() + 30000; await playerData.save() }
            return { ok: true, fight, ev, ended: null }
        })
    }

    // بدء القتال بعد القبول — نفس منطق .قبول_تحدي + خصم محاولة المُتحدّي (عند القبول)
    async function startFight(inv, ctx, req) {
        const [p1, p2] = await Promise.all([Player.findOne({ userId: inv.from }), Player.findOne({ userId: inv.to })])
        if (!p1 || !p2) return { err: 'لم يتم العثور على أحد اللاعبين' }
        if (!p1.characters?.length || !p2.characters?.length) return { err: 'أحد اللاعبين لا يملك شخصيات' }

        if (await activeFight(inv.from) || await activeFight(inv.to)) return { err: 'أحد اللاعبين داخل قتال بالفعل' }

        // ⏳ محاولات .تحدي: 5 كل ساعتين — تُخصم هنا عند القبول
        const period = getPeriod()
        if (p1.lastChallengeReset !== period) { p1.challengeFights = 5; p1.lastChallengeReset = period }
        if ((p1.challengeFights || 0) <= 0) return { err: 'انتهت محاولات التحدي لدى المُتحدّي — تتجدد كل ساعتين' }
        p1.challengeFights -= 1
        await p1.save()

        const stats1 = getTotalStats(p1)
        const stats2 = getTotalStats(p2)
        const plain = c => (c && typeof c.toObject === 'function') ? c.toObject() : c
        const team1 = [...p1.characters].sort(() => Math.random() - 0.5).slice(0, 3).map(plain)
        const team2 = [...p2.characters].sort(() => Math.random() - 0.5).slice(0, 3).map(plain)
        const first = Math.random() < 0.5 ? inv.from : inv.to

        const hp1 = getGroupHP(p1), hp2 = getGroupHP(p2)
        const fight = await PvP.create({
            player1: inv.from, player2: inv.to,
            player1Turns: 0, player2Turns: 0,
            turn: first, active: true,
            hp1, hp2, turnCount: 0,
            shield1: stats1.shield, shield2: stats2.shield,
            team1, team2,
            skillTurn1: -99, skillTurn2: -99, ultimateTurn1: -99, ultimateTurn2: -99,
            lastMove: new Date()
        })
        fightMeta.set(String(fight._id), {
            max1: hp1, max2: hp2, sh1: Math.max(1, stats1.shield || 0), sh2: Math.max(1, stats2.shield || 0),
            n1: String(p1.name || p1.username || 'لاعب').slice(0, 24), n2: String(p2.name || p2.username || 'لاعب').slice(0, 24), at: Date.now()
        })
        return { ok: true, fight, p1, p2 }
    }

    async function broadcastFight(userIds, fight, ev, ended, ctx, req) {
        for (const u of userIds) {
            let state = null
            if (!ended) state = await stateFor(fight, u, ctx, req)
            const rel = e => e && { ...e, by: e.by === u ? 'me' : 'foe' }
            let end = null
            if (ended) {
                const won = ended.winner === u
                end = { win: won, ...(won ? ended.win : ended.lose) }
            }
            emit(u, 'fight', { ev: rel(ev), state, end })
        }
    }

    // ───────────── المسارات ─────────────
    function mount(app, ctx) {
        const { auth, jsonBody, bossSession, securityHeaders, CODE_RE, html404, ownerSession, esc } = ctx

        // 💉 حقن سكربت الدعوات (فوق أي صفحة من صفحات اللاعب)
        app.use((req, res, next) => {
            if (req.method !== 'GET' || !/^\/u\/[a-f0-9]{10}(\/|$)/.test(req.path)) return next()
            const send = res.send.bind(res)
            res.send = function (body) {
                try {
                    if (typeof body === 'string' && /<\/body>/i.test(body) && !body.includes('/challenge/overlay.js')) {
                        const i = body.lastIndexOf('</body>')
                        body = body.slice(0, i) + '<script src="/challenge/overlay.js" defer></script>' + body.slice(i)
                    }
                } catch (e) { /* نرسل الصفحة كما هي */ }
                return send(body)
            }
            next()
        })

        const pageCsp = () => res => res.set('Content-Security-Policy',
            "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'")

        // التحقق: جلسة + (للطلبات المعدِّلة) الأصل وCSRF
        async function guard(req, res, mutate) {
            res.set('Cache-Control', 'no-store')
            const fail = (st, code, message) => { res.status(st).json({ ok: false, code, message }); return null }
            if (!auth.authEnabled()) return fail(503, 'DISABLED', 'التحدي غير مفعّل حالياً.')
            if (mutate && !auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')
            const sess = await bossSession(req)
            if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
            if (mutate && !auth.verifyCsrf(sess, req.body && req.body.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
            if (!rate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر قليلاً.')
            return sess
        }

        app.get('/challenge/overlay.js', (req, res) => {
            res.set({ 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' })
            res.send(UI.overlayJS())
        })

        // 📡 قناة الأحداث اللحظية
        app.get('/challenge/stream', async (req, res) => {
            try {
                if (!auth.authEnabled()) return res.status(503).end()
                const sess = await bossSession(req)
                if (!sess) return res.status(401).end()
                const me = sess.u

                res.writeHead(200, {
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-cache, no-transform',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no',
                    'X-Content-Type-Options': 'nosniff'
                })
                res.write('retry: 3000\n\n')

                let set = conns.get(me)
                if (!set) { set = new Set(); conns.set(me, set) }
                if (set.size >= MAX_CONN_PER_USER) {
                    const oldest = set.values().next().value
                    try { oldest.end() } catch (e) {}
                    set.delete(oldest)
                }
                set.add(res)

                const hb = setInterval(() => { try { res.write(': ping\n\n') } catch (e) {} }, 20000)
                const cleanup = () => {
                    clearInterval(hb)
                    const s = conns.get(me)
                    if (s) { s.delete(res); if (!s.size) conns.delete(me) }
                }
                req.on('close', cleanup)
                res.on('error', cleanup)

                // لقطة البداية: الدعوة المعلّقة + القتال الجاري
                const player = await Player.findOne({ userId: me }).select('siteCode userId name username characters maxCharacters').lean()
                const hello = { csrf: auth.csrfForSession(sess), pid: pidOf(me), code: player && player.siteCode, inv: null, fight: false }
                const inv = await pendingInvite(me)
                if (inv) {
                    const other = await Player.findOne({ userId: inv.from === me ? inv.to : inv.from }).select('userId name username characters maxCharacters').lean()
                    hello.inv = {
                        dir: inv.from === me ? 'out' : 'in', id: inv.id,
                        left: Math.max(0, new Date(inv.exp).getTime() - Date.now()),
                        other: other ? person(other, ctx, req) : null,
                        pw: { me: player ? ctx.cappedPower(player) : 0, foe: other ? ctx.cappedPower(other) : 0 }
                    }
                }
                hello.fight = !!(await activeFight(me))
                res.write(`event: hello\ndata: ${JSON.stringify(hello)}\n\n`)
                if (typeof res.flush === 'function') res.flush()
            } catch (err) {
                console.error('challenge stream error:', err)
                try { res.end() } catch (e) {}
            }
        })

        // 🔎 البحث باليوزر / قائمة المتصلين
        app.get('/challenge/players', async (req, res) => {
            try {
                const sess = await guard(req, res, false)
                if (!sess) return
                const me = sess.u
                const q = String(req.query.q || '').replace(/^@/, '').trim().slice(0, 24)
                let rows
                if (q) {
                    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
                    rows = await Player.find({ userId: { $ne: me }, $or: [{ username: rx }, { name: rx }] })
                        .select('userId name username characters maxCharacters').limit(20).lean()
                } else {
                    const ids = [...conns.keys()].filter(u => u !== me && isOnline(u)).slice(0, 60)
                    rows = ids.length ? await Player.find({ userId: { $in: ids } }).select('userId name username characters maxCharacters').lean() : []
                }
                const ids = rows.map(r => r.userId)
                const [fights, invs] = await Promise.all([
                    PvP.find({ active: true, $or: [{ player1: { $in: ids } }, { player2: { $in: ids } }] }).select('player1 player2').lean(),
                    Invite.find({ status: 'pending', exp: { $gt: new Date() }, $or: [{ from: { $in: ids } }, { to: { $in: ids } }] }).select('from to').lean()
                ])
                const busy = new Set()
                for (const f of fights) { busy.add(f.player1); busy.add(f.player2) }
                for (const i of invs) { busy.add(i.from); busy.add(i.to) }
                const list = rows.map(r => ({
                    ...person(r, ctx, req),
                    st: busy.has(r.userId) ? 'bz' : isOnline(r.userId) ? 'on' : 'off'
                })).sort((a, b) => ({ on: 0, bz: 1, off: 2 }[a.st] - { on: 0, bz: 1, off: 2 }[b.st]) || b.pw - a.pw)
                res.json({ ok: true, list, online: [...conns.keys()].filter(u => u !== me).length })
            } catch (err) {
                console.error('challenge players error:', err)
                res.status(500).json({ ok: false, message: 'خطأ بالخادم' })
            }
        })

        // ⚔️ إرسال دعوة
        app.post('/challenge/send', jsonBody, async (req, res) => {
            const fail = (st, code, message) => res.status(st).json({ ok: false, code, message })
            try {
                const sess = await guard(req, res, true)
                if (!sess) return
                const me = sess.u
                const target = pidToUser.get(String((req.body && req.body.to) || '').slice(0, 20))
                if (!target) return fail(404, 'NOT_FOUND', '❌ اللاعب غير موجود')
                if (target === me) return fail(400, 'SELF', '❌ لا يمكنك تحدي نفسك')

                return await withLock('u:' + [me, target].sort().join('|'), async () => {
                    const [mePl, tgPl] = await Promise.all([
                        Player.findOne({ userId: me }).select('userId name username characters maxCharacters challengeFights lastChallengeReset').lean(),
                        Player.findOne({ userId: target }).select('userId name username characters maxCharacters').lean()
                    ])
                    if (!mePl || !tgPl) return fail(404, 'NO_ACCOUNT', '❌ اللاعب لا يملك حساباً')
                    if (!mePl.characters?.length || !tgPl.characters?.length) return fail(400, 'NO_CHARS', '❌ يجب أن يملك اللاعبان شخصيات')
                    if (!isOnline(target)) return fail(409, 'OFFLINE', '⚫ اللاعب غير متصل حالياً')
                    if (await activeFight(me) || await activeFight(target)) return fail(409, 'IN_FIGHT', '❌ أحد اللاعبين داخل قتال بالفعل')
                    if (await pendingInvite(me) || await pendingInvite(target)) return fail(409, 'BUSY', '❌ أحد اللاعبين لديه دعوة معلّقة')
                    if (attemptsLeft(mePl) <= 0) return fail(400, 'NO_ATTEMPTS', '❌ انتهت محاولات التحدي — تتجدد كل ساعتين (بتوقيت السعودية)')

                    const id = crypto.randomBytes(9).toString('hex')
                    await Invite.create({ id, from: me, to: target, status: 'pending', exp: new Date(Date.now() + INVITE_MS) })
                    const setT = setTimeout(() => expireInvite(id).catch(() => {}), INVITE_MS + 300)
                    if (setT.unref) setT.unref()

                    const pMe = person(mePl, ctx, req), pTg = person(tgPl, ctx, req)
                    emit(target, 'invite', { id, left: INVITE_MS, from: pMe, pw: { me: pTg.pw, foe: pMe.pw } })
                    emit(me, 'out', { id, left: INVITE_MS, to: pTg })
                    return res.json({ ok: true, id, left: INVITE_MS, to: pTg })
                })
            } catch (err) {
                console.error('challenge send error:', err)
                fail(500, 'SERVER', 'خطأ بالخادم')
            }
        })

        // 🚫 إلغاء من المُرسِل
        app.post('/challenge/cancel', jsonBody, async (req, res) => {
            try {
                const sess = await guard(req, res, true)
                if (!sess) return
                const me = sess.u
                const inv = await Invite.findOneAndUpdate({ from: me, status: 'pending' }, { status: 'cancelled' }, { new: true }).lean()
                if (!inv) return res.json({ ok: true, none: true })
                const mePl = await Player.findOne({ userId: me }).select('userId name username characters maxCharacters').lean()
                emit(inv.to, 'result', { type: 'cancelled', id: inv.id, by: mePl ? person(mePl, ctx, req) : null })
                emit(me, 'result', { type: 'cancelled_self', id: inv.id })
                res.json({ ok: true })
            } catch (err) {
                console.error('challenge cancel error:', err)
                res.status(500).json({ ok: false, message: 'خطأ بالخادم' })
            }
        })

        // ✅❌ رد المُستلِم
        app.post('/challenge/respond', jsonBody, async (req, res) => {
            const fail = (st, code, message) => res.status(st).json({ ok: false, code, message })
            try {
                const sess = await guard(req, res, true)
                if (!sess) return
                const me = sess.u
                const accept = !!(req.body && req.body.accept)

                const inv = await Invite.findOneAndUpdate(
                    { to: me, status: 'pending', exp: { $gt: new Date() } },
                    { status: accept ? 'accepted' : 'rejected' }, { new: true }
                ).lean()
                if (!inv) return fail(410, 'GONE', '⌛ انتهت الدعوة أو أُلغيت')

                const mePl = await Player.findOne({ userId: me }).select('userId name username characters maxCharacters').lean()
                if (!accept) {
                    emit(inv.from, 'result', { type: 'rejected', id: inv.id, by: mePl ? person(mePl, ctx, req) : null })
                    emit(me, 'result', { type: 'rejected_self', id: inv.id })
                    return res.json({ ok: true })
                }

                const r = await withLock('u:' + [inv.from, inv.to].sort().join('|'), () => startFight(inv, ctx, req))
                if (!r.ok) {
                    await Invite.updateOne({ id: inv.id }, { status: 'failed' })
                    emit(inv.from, 'result', { type: 'failed', id: inv.id, message: r.err })
                    emit(me, 'result', { type: 'failed', id: inv.id, message: r.err })
                    return res.json({ ok: false, message: r.err })
                }
                const { fight, p1, p2 } = r
                const pa = person(p1, ctx, req), pb = person(p2, ctx, req)
                const send = async (u, own, foe, code) => emit(u, 'start', {
                    id: inv.id, me: own, foe, arena: `/u/${code}/arena`,
                    state: await stateFor(fight, u, ctx, req)
                })
                await send(inv.from, pa, pb, p1.siteCode)
                await send(inv.to, pb, pa, p2.siteCode)
                res.json({ ok: true })
            } catch (err) {
                console.error('challenge respond error:', err)
                fail(500, 'SERVER', 'خطأ بالخادم')
            }
        })

        // 📊 حالة القتال الحالية (للساحة)
        app.get('/challenge/state', async (req, res) => {
            try {
                const sess = await guard(req, res, false)
                if (!sess) return
                const mePl = await Player.findOne({ userId: sess.u }).select('challengeFights lastChallengeReset').lean()
                const att = { left: mePl ? attemptsLeft(mePl) : 0, resetMs: periodResetMs() }
                const fight = await activeFight(sess.u)
                if (!fight) return res.json({ ok: true, fight: null, att })
                res.json({ ok: true, fight: await stateFor(fight, sess.u, ctx, req), att })
            } catch (err) {
                console.error('challenge state error:', err)
                res.status(500).json({ ok: false, message: 'خطأ بالخادم' })
            }
        })

        // 🎯 حركة بالقتال
        app.post('/challenge/act', jsonBody, async (req, res) => {
            try {
                const sess = await guard(req, res, true)
                if (!sess) return
                const me = sess.u
                const kind = String((req.body && req.body.kind) || '')
                if (!['a', 's', 'u'].includes(kind)) return res.status(400).json({ ok: false, code: 'BAD', message: 'حركة غير صحيحة' })

                const r = await perform(me, kind, ctx, req)
                if (!r.ok) return res.status(409).json({ ok: false, code: r.err, message: r.message })

                const both = [r.fight.player1, r.fight.player2]
                await broadcastFight(both.filter(u => u !== me), r.fight, r.ev, r.ended, ctx, req)
                // نرد لصاحب الحركة بنفس الحدث (الواجهة تتجاهل المكرر بالمعرّف)
                let state = null, end = null
                if (!r.ended) state = await stateFor(r.fight, me, ctx, req)
                else { const won = r.ended.winner === me; end = { win: won, ...(won ? r.ended.win : r.ended.lose) } }
                const evMe = { ...r.ev, by: 'me' }
                emit(me, 'fight', { ev: evMe, state, end })
                res.json({ ok: true, ev: evMe, state, end })
            } catch (err) {
                console.error('challenge act error:', err)
                res.status(500).json({ ok: false, code: 'SERVER', message: 'خطأ بالخادم' })
            }
        })

        // 📄 صفحة التحدي (البحث + المتصلون)
        app.get('/u/:code/challenge', async (req, res) => {
            try {
                securityHeaders(res); pageCsp()(res)
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return html404(res)
                const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion').lean()
                if (!player) return html404(res)
                const sess = ownerSession(req, player)
                if (!sess) return res.redirect(303, `/login?code=${code}`)
                if (!auth.authEnabled()) return res.status(503).send('التحدي غير مفعّل حالياً.')
                const nm = String(player.name || player.username || 'لاعب').slice(0, 24)
                res.send(UI.lobbyPageHTML({ code, csrf: auth.csrfForSession(sess), name: nm, nav: ctx.navDrawerHTML(code, auth.csrfForSession(sess), 'challenge', nm), navBtn: ctx.NAV_BTN }))
            } catch (err) {
                console.error('challenge page error:', err)
                res.status(500).send('خطأ بالخادم')
            }
        })

        // 🏟️ ساحة القتال
        app.get('/u/:code/arena', async (req, res) => {
            try {
                securityHeaders(res); pageCsp()(res)
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return html404(res)
                const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion').lean()
                if (!player) return html404(res)
                const sess = ownerSession(req, player)
                if (!sess) return res.redirect(303, `/login?code=${code}`)
                if (!auth.authEnabled()) return res.status(503).send('التحدي غير مفعّل حالياً.')
                res.send(UI.arenaPageHTML({ code, csrf: auth.csrfForSession(sess) }))
            } catch (err) {
                console.error('arena page error:', err)
                res.status(500).send('خطأ بالخادم')
            }
        })

        // 🧹 كنس الدعوات المنتهية (يغطي إعادة تشغيل السيرفر) + القتالات الخاملة التي بدأت من الموقع
        const sweep = setInterval(async () => {
            try {
                const old = await Invite.find({ status: 'pending', exp: { $lt: new Date() } }).select('id').lean()
                for (const o of old) await expireInvite(o.id)
                const ids = [...fightMeta.keys()]
                if (ids.length) {
                    const idle = await PvP.find({ _id: { $in: ids }, active: true, lastMove: { $lt: new Date(Date.now() - IDLE_MS) } }).lean()
                    for (const f of idle) {
                        await PvP.deleteOne({ _id: f._id })
                        fightMeta.delete(String(f._id))
                        emit(f.player1, 'ended', { reason: 'idle' }); emit(f.player2, 'ended', { reason: 'idle' })
                    }
                    for (const k of ids) { // تنظيف meta اليتيمة
                        const m = fightMeta.get(k)
                        if (m && Date.now() - m.at > 3 * 60 * 60 * 1000) fightMeta.delete(k)
                    }
                }
            } catch (e) { console.error('challenge sweep error:', e.message) }
        }, 5000)
        if (sweep.unref) sweep.unref()
    }

    return { mount }
}
