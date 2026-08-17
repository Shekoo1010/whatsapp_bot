// =========================
// 🏟️ ARENA SYSTEM — CORE LOGIC
// =========================
// نظام أرينا مستقل بالكامل عن باقي أنظمة PvP بالبوت (.تحدي / .مضاربة ...).
// كل شي هنا (القوة، الرتب، الميداليات، المتجر) خاص بالأرينا فقط ولا يقرأ
// أو يعدّل أي حقل خارج player.arena.

const fs = require('fs')
const path = require('path')

const {
    ARENA_CHARACTERS,
    isArenaEligible,
    getArenaChar,
    COLOR_EMOJI,
    COLOR_NAME_AR,
    colorMultiplier,
    getArenaRankName,
    getRankZone,
    rankIndexFromPoints,
    ARENA_RANKS,
    ZONE_EMOJI
} = require('./arenaData')

// =========================
// 🕐 توقيت السعودية (مستقل عن index.js — بدون أي اعتماد خارجي)
// =========================

const SAUDI_OFFSET_MS = 3 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function saudiNow() {
    return new Date(Date.now() + SAUDI_OFFSET_MS)
}

// معرّف يوم يتغيّر عند منتصف الليل (00:00) بتوقيت السعودية — يُستخدم لمحاولات الهجوم اليومية
function getSaudiMidnightDayId() {
    return Math.floor(saudiNow().getTime() / DAY_MS)
}

// معرّف يوم يتغيّر عند 11:30 مساءً بتوقيت السعودية — يُستخدم لمتجر الأرينا
function getSaudiShopDayId() {
    const shifted =
        saudiNow().getTime() - (23 * 60 + 30) * 60 * 1000
    return Math.floor(shifted / DAY_MS)
}

// معرّف فترة تتغيّر كل يومين عند منتصف الليل — يُستخدم لترقية/تنزيل الرتب
function getSaudi2DayPeriodId() {
    return Math.floor(getSaudiMidnightDayId() / 2)
}

// =========================
// 💾 حالة الجدولة (تُحفظ بملف صغير عشان ما تنعاد المعالجة لو البوت أعاد التشغيل)
// =========================

const STATE_FILE = path.join(__dirname, 'arenaScheduleState.json')

function readScheduleState() {
    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    } catch (e) {
        return {}
    }
}

function writeScheduleState(state) {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state))
    } catch (e) {
        console.log('⚠️ فشل حفظ حالة جدولة الأرينا:', e.message)
    }
}

// =========================
// ⚔️ إحصائيات القتال
// =========================

const STAT_KEYS = ['focus', 'sp', 'def', 'stamina']
const STAT_LABEL = {
    focus: '🎯 تركيز',
    sp: '⚡ ضغط روحي',
    def: '🛡️ دفاع',
    stamina: '❤️ تحمل'
}

const STAT_CAP = 100 // سقف كل خانة لكل شخصية

function getCharDev(player, charName) {

    const store =
        (player.arena && player.arena.charDev) || {}

    const d = store[charName] || {}

    return {
        focus: d.focus || 0,
        sp: d.sp || 0,
        def: d.def || 0,
        stamina: d.stamina || 0
    }
}

// يبني كائن المقاتل الجاهز للقتال من اسم الشخصية + تطويرها
function buildFighter(charName, dev) {

    const base = getArenaChar(charName)

    const maxHp = 3000 + (dev.stamina || 0) * 50
    const critChance = Math.min(30, (dev.focus || 0) * 0.2)

    return {
        name: charName,
        color: base ? base.arenaColor : 'red',
        hp: maxHp,
        maxHp,
        sp: dev.sp || 0,
        def: dev.def || 0,
        focus: dev.focus || 0,
        critChance
    }
}

function computeHit(attacker, defender) {

    const baseDmg = 480 + attacker.sp * 3
    const mult = colorMultiplier(attacker.color, defender.color)

    let dmg = baseDmg * mult - defender.def * 2

    const isCrit = Math.random() * 100 < attacker.critChance

    if (isCrit) dmg *= 1.5

    dmg = Math.max(60, Math.round(dmg))

    return { dmg, isCrit, mult }
}

// يحاكي مبارزة كاملة بين شخصيتين (تبادل ضربات حتى تنتهي HP أحدهما)
// يرجع سطور السجل + الفائز + مضاعف اللون المستخدم
function simulateDuel(fighterA, fighterB) {

    const a = { ...fighterA }
    const b = { ...fighterB }

    const log = []
    let turn = 'a'
    let rounds = 0

    const colorLine =
        colorLineFor(a.color, b.color)

    if (colorLine) log.push(colorLine)

    while (a.hp > 0 && b.hp > 0 && rounds < 60) {

        rounds++

        if (turn === 'a') {

            const { dmg, isCrit } = computeHit(a, b)
            b.hp = Math.max(0, b.hp - dmg)

            log.push(
                `${isCrit ? '💢' : '⚔️'} ${a.name} ضرب ${b.name}${isCrit ? ' بضربة حرجة!' : ''} (-${dmg}) | ${b.name}: ${b.hp}/${b.maxHp}`
            )

            turn = 'b'

        } else {

            const { dmg, isCrit } = computeHit(b, a)
            a.hp = Math.max(0, a.hp - dmg)

            log.push(
                `${isCrit ? '💢' : '⚔️'} ${b.name} ضرب ${a.name}${isCrit ? ' بضربة حرجة!' : ''} (-${dmg}) | ${a.name}: ${a.hp}/${a.maxHp}`
            )

            turn = 'a'
        }
    }

    const winnerSide =
        a.hp <= 0 && b.hp <= 0
            ? (a.hp > b.hp ? 'a' : 'b')
            : (a.hp <= 0 ? 'b' : 'a')

    return {
        log: compressLog(log),
        winnerSide,
        winnerName: winnerSide === 'a' ? fighterA.name : fighterB.name
    }
}

function colorLineFor(colorA, colorB) {

    const mult = colorMultiplier(colorA, colorB)
    const multB = colorMultiplier(colorB, colorA)

    if (mult === 1 && multB === 1) return null

    if (mult > multB)
        return `${COLOR_EMOJI[colorA]} يتفوق على ${COLOR_EMOJI[colorB]} (+50% ضرر)`

    if (multB > mult)
        return `${COLOR_EMOJI[colorB]} يتفوق على ${COLOR_EMOJI[colorA]} (+50% ضرر)`

    return `${COLOR_EMOJI[colorA]} و ${COLOR_EMOJI[colorB]} يتبادلون ضرر إضافي (+50%)`
}

// عشان رسالة الجولة ما تصير ضخمة لو المبارزة طالت — نعرض أول 8 وآخر 8 سطر بس
function compressLog(log) {

    if (log.length <= 18) return log

    const head = log.slice(0, 9)
    const tail = log.slice(-8)

    return [...head, '⋯', ...tail]
}

// =========================
// 🥊 معركة الأرينا الكاملة (3 مبارزات)
// =========================

function simulateArenaBattle(attackerTeam, defenderTeam, attackerDevMap, defenderDevMap) {

    const duels = []
    let scoreA = 0
    let scoreB = 0

    for (let i = 0; i < 3; i++) {

        const nameA = attackerTeam[i]
        const nameB = defenderTeam[i]

        const fighterA = buildFighter(nameA, attackerDevMap(nameA))
        const fighterB = buildFighter(nameB, defenderDevMap(nameB))

        const result = simulateDuel(fighterA, fighterB)

        if (result.winnerSide === 'a') scoreA++
        else scoreB++

        duels.push({
            index: i + 1,
            fighterA,
            fighterB,
            ...result
        })

        // حسم مبكر لو صار الفارق حاسم رياضياً (2 فوز من 3) — بس نكمل عرض
        // كل الجولات المتبقية دايماً حسب طلب النظام (جولة لكل شخصية بالفريق)
    }

    return {
        duels,
        scoreA,
        scoreB,
        winnerSide: scoreA > scoreB ? 'a' : 'b'
    }
}

// يبني رسالة نصية واحدة لكل جولة (مبارزة)
function formatDuelMessage(duel, attackerTag, defenderTag) {

    const { fighterA, fighterB, log, winnerName, index } = duel

    const header =
`🥊 الجولة ${index} من 3
${COLOR_EMOJI[fighterA.color]} ${fighterA.name} (${attackerTag}) 🆚 ${COLOR_EMOJI[fighterB.color]} ${fighterB.name} (${defenderTag})`

    return `${header}\n\n${log.join('\n')}\n\n🏆 فاز: ${winnerName}`
}

// =========================
// 🏆 مكافآت الفوز/الخسارة (Trophies + ميداليات)
// =========================

const REWARDS = {
    winTrophies: 20,
    loseTrophiesAtk: 8,
    winTrophiesLossForDefender: 10, // كم يخسر المدافع لو انهزم
    loseTrophiesGainForDefender: 5, // كم يربح المدافع لو صد الهجوم
    winMedals: 15,
    loseMedals: 5
}

function applyBattleResult(attacker, defender, attackerWon) {

    attacker.arena.wins = (attacker.arena.wins || 0) + (attackerWon ? 1 : 0)
    attacker.arena.losses = (attacker.arena.losses || 0) + (attackerWon ? 0 : 1)

    if (attackerWon) {

        attacker.arena.points = (attacker.arena.points || 0) + REWARDS.winTrophies
        defender.arena.points = Math.max(0, (defender.arena.points || 0) - REWARDS.winTrophiesLossForDefender)
        attacker.arena.medals = (attacker.arena.medals || 0) + REWARDS.winMedals

    } else {

        attacker.arena.points = Math.max(0, (attacker.arena.points || 0) - REWARDS.loseTrophiesAtk)
        defender.arena.points = (defender.arena.points || 0) + REWARDS.loseTrophiesGainForDefender
        attacker.arena.medals = (attacker.arena.medals || 0) + REWARDS.loseMedals
    }

    attacker.arena.rank = getArenaRankName(attacker.arena.points)
    defender.arena.rank = getArenaRankName(defender.arena.points)
}

// =========================
// 🛒 متجر الأرينا (يتجدد يومياً 11:30م بتوقيت السعودية — خاص لكل لاعب)
// =========================

function generateShopItems() {

    const items = []

    // نبني ترتيب عشوائي للخانات الأربعة (تركيز/ضغط روحي/دفاع/تحمل)
    // عشان نضمن كل خانة تظهر مرة وحدة بالضبط ضمن العروض الأربعة اليومية
    const shuffledStats = [...STAT_KEYS]

    for (let i = shuffledStats.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffledStats[i], shuffledStats[j]] = [shuffledStats[j], shuffledStats[i]]
    }

    // 4 عروض يومياً — كل خانة تظهر مرة وحدة (تنوع مضمون 100%)
    for (const stat of shuffledStats) {

        const amount = 5 + Math.floor(Math.random() * 11) // 5-15
        const cost = amount * (12 + Math.floor(Math.random() * 6)) // تسعير تقريبي

        items.push({ stat, amount, cost })
    }

    return items
}

function ensureShopFresh(player) {

    if (!player.arena) return

    const currentDayId = getSaudiShopDayId()

    if (player.arena.shop.lastReset !== String(currentDayId)) {
        player.arena.shop.lastReset = String(currentDayId)
        player.arena.shop.items = generateShopItems()
        player.arena.shop.purchasedToday = false
    }
}

function ensureDailyAttempts(player, maxAttempts = 10) {

    if (!player.arena) return

    const currentDayId = getSaudiMidnightDayId()

    if (player.arena.lastAttemptReset !== String(currentDayId)) {
        player.arena.lastAttemptReset = String(currentDayId)
        player.arena.attemptsToday = maxAttempts
    }
}

// يضمن وجود كائن player.arena كامل (لاعب قديم ما عنده الحقل بعد)
function ensureArenaObject(player) {

    if (!player.arena) {
        player.arena = {}
    }

    if (!player.arena.team) player.arena.team = []
    if (player.arena.points === undefined) player.arena.points = 0
    if (player.arena.wins === undefined) player.arena.wins = 0
    if (player.arena.losses === undefined) player.arena.losses = 0
    if (!player.arena.rank) player.arena.rank = getArenaRankName(0)
    if (player.arena.medals === undefined) player.arena.medals = 0
    if (player.arena.attemptsToday === undefined) player.arena.attemptsToday = 10
    if (!player.arena.lastAttemptReset) player.arena.lastAttemptReset = ''
    if (!player.arena.charDev) player.arena.charDev = {}

    if (!player.arena.shop) {
        player.arena.shop = { lastReset: '', items: [], purchasedToday: false }
    }

    ensureDailyAttempts(player)
    ensureShopFresh(player)
}

// =========================
// ⏫ جدولة الترقية/التنزيل التلقائية (كل يومين، 12:00ص بتوقيت السعودية)
// =========================
// تُطبَّق على كل اللاعبين اللي عندهم رصيد ترافيز (arena.points > 0 أو عندهم فريق)

async function runPromotionCycle(Player) {

    const players = await Player.find({
        $or: [
            { 'arena.points': { $gt: 0 } },
            { 'arena.team.0': { $exists: true } }
        ]
    })

    const promoted = []
    const demoted = []

    for (const player of players) {

        if (!player.arena) continue

        const points = player.arena.points || 0
        const { zone, idx } = getRankZone(points)

        if (zone === 'green' && idx < ARENA_RANKS.length - 1) {

            const nextTier = ARENA_RANKS[idx + 1]
            player.arena.points = nextTier.minPoints
            player.arena.rank = nextTier.name

            promoted.push(player.userId)

            // مكافأة ترقية: مال + خبرة + صندوق (SSS عشوائي عند الوصول لأعلى رتبة "قائد")
            await grantPromotionReward(player, nextTier.name)

        } else if (zone === 'red' && idx > 0) {

            const prevTier = ARENA_RANKS[idx - 1]
            const curTier = ARENA_RANKS[idx]

            // ينزل لنقطة قريبة من أعلى الرتبة السابقة (منطقة بيضاء تقريباً)
            player.arena.points = Math.max(
                prevTier.minPoints,
                curTier.minPoints - 1
            )
            player.arena.rank = prevTier.name

            demoted.push(player.userId)
        }

        await player.save()
    }

    return { promoted, demoted }
}

async function grantPromotionReward(player, newRankName) {

    const money = 25000
    const xp = 150

    player.money = (player.money || 0) + money
    player.xp = (player.xp || 0) + xp

    if (!player.boxes) player.boxes = {}
    player.boxes.epic = (player.boxes.epic || 0) + 1

    if (newRankName === 'قائد') {
        player.boxes.sss_high = (player.boxes.sss_high || 0) + 1
    }
}

// يشغّل مؤقّت دائم يتحقق كل دقيقة هل حان وقت دورة الترقية (كل يومين 12:00ص سعودي)
function startArenaSchedulers(sock, Player, notifyGroupId) {

    setInterval(async () => {

        try {

            const state = readScheduleState()
            const currentPeriod = getSaudi2DayPeriodId()

            if (state.lastPromotionPeriod !== currentPeriod) {

                const now = saudiNow()

                // ننتظر لحظة منتصف الليل بالضبط (ما بين 00:00 و00:01 سعودي)
                if (now.getUTCHours() === 0 && now.getUTCMinutes() === 0) {

                    const { promoted, demoted } = await runPromotionCycle(Player)

                    state.lastPromotionPeriod = currentPeriod
                    writeScheduleState(state)

                    console.log(`🏟️ دورة ترقية الأرينا: ${promoted.length} صعدوا، ${demoted.length} نزلوا`)

                    if (notifyGroupId && sock) {
                        try {
                            await sock.sendMessage(notifyGroupId, {
                                text:
`🏟️ انتهت دورة ترقية رتب الأرينا لهذا الأسبوع

🟢 صعدوا رتبة: ${promoted.length} لاعب
🔴 نزلوا رتبة: ${demoted.length} لاعب

اكتب .رتبتي_ارينا عشان تشوف رتبتك الجديدة`
                            })
                        } catch (e) {}
                    }
                }
            }

        } catch (e) {
            console.log('⚠️ خطأ بجدولة ترقية الأرينا:', e.message)
        }

    }, 60 * 1000)
}

module.exports = {
    STAT_KEYS,
    STAT_LABEL,
    STAT_CAP,
    getCharDev,
    buildFighter,
    computeHit,
    simulateDuel,
    simulateArenaBattle,
    formatDuelMessage,
    applyBattleResult,
    REWARDS,
    generateShopItems,
    ensureShopFresh,
    ensureDailyAttempts,
    ensureArenaObject,
    runPromotionCycle,
    startArenaSchedulers,
    getSaudiMidnightDayId,
    getSaudiShopDayId,
    getSaudi2DayPeriodId,
    ARENA_CHARACTERS,
    isArenaEligible,
    getArenaChar,
    COLOR_EMOJI,
    COLOR_NAME_AR,
    getArenaRankName,
    getRankZone,
    ZONE_EMOJI,
    ARENA_RANKS
}
