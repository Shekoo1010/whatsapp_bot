// =========================
// 🌀 نظام الدومينات (Domain System) - مستوحى من Wuthering Waves
// دومين واحد لكل عائلة إيكو (12 دومين) — كل دومين فيه 3 مستويات صعوبة:
//   سهل   → يطيح قطعة كوست 1
//   متوسط → يطيح قطعة كوست 3
//   صعب   → يطيح قطعة كوست 4 (الأقوى والأصعب)
// الستامينا: 200 كحد أقصى، كل دخول دومين يكلف 30، وتتجدد بالكامل خلال 24 ساعة
// (تجدد مستمر بمعدل ثابت، مثل الـ Waveplates بالضبط - مو دفعة وحدة كل 24 ساعة)
// =========================

const echoFamilies = require('../data/echoFamilies')
const echoMonsters = require('../data/echoMonsters')
const equipmentSystem = require('./equipmentSystem')

// =========================
// إعدادات الستامينا
// =========================

const MAX_STAMINA = 200
const DOMAIN_COST = 30

// وقت التجدد الكامل: 24 ساعة (ملي ثانية) — يتجدد باستمرار بمعدل ثابت لين يوصل الحد الأقصى
const FULL_REGEN_MS = 24 * 60 * 60 * 1000
const REGEN_MS_PER_POINT = FULL_REGEN_MS / MAX_STAMINA // كم ملي ثانية عشان تكسب نقطة وحدة

// =========================
// إعدادات الصعوبة (لكل دومين)
// =========================

const DIFFICULTY_LEVELS = {

    easy: {
        id: 'easy',
        label: '🟢 سهل',
        cost: 1,
        // 🏆 قوة مطلوبة تقريبية لفريق صغير (قابلة للتعديل حسب توازن اللعبة)
        requiredPower: 1500,
        baseWinChance: 0.85
    },

    medium: {
        id: 'medium',
        label: '🟡 متوسط',
        cost: 3,
        requiredPower: 6000,
        baseWinChance: 0.60
    },

    hard: {
        id: 'hard',
        label: '🔴 صعب',
        cost: 4,
        requiredPower: 15000,
        baseWinChance: 0.35
    }

}

const DIFFICULTY_ALIASES = {

    easy: 'easy', 'سهل': 'easy', '1': 'easy',
    medium: 'medium', 'متوسط': 'medium', '3': 'medium',
    hard: 'hard', 'صعب': 'hard', '4': 'hard'

}

function normalizeDifficulty(input) {

    if (!input) return 'medium'

    const key = String(input).trim().toLowerCase()

    return DIFFICULTY_ALIASES[key] || DIFFICULTY_ALIASES[input] || 'medium'

}

// =========================
// بناء قائمة الدومينات (دومين لكل عائلة من الـ12)
// =========================

function listDomains() {

    return echoFamilies.map((family, index) => {

        const monsters = echoMonsters[family.id] || {}

        return {
            id: index + 1,
            familyId: family.id,
            name: family.name,
            nameAr: family.nameAr,
            emoji: (family.name.match(/^\S+/) || ['🌀'])[0],
            equipLabel: `إيكوز ${family.nameAr}`,
            monsters: {
                easy: monsters.cost1 || [],
                medium: monsters.cost3 || [],
                hard: monsters.cost4 || []
            }
        }

    })

}

function getDomainById(domainId) {

    const domains = listDomains()

    return domains.find(d => d.id === Number(domainId)) || null

}

// =========================
// ⚡ نظام الستامينا
// =========================

function applyStaminaRegen(player) {

    if (typeof player.stamina !== 'number') {
        player.stamina = MAX_STAMINA
    }

    if (!player.staminaUpdatedAt) {
        player.staminaUpdatedAt = Date.now()
    }

    if (player.stamina >= MAX_STAMINA) {
        player.staminaUpdatedAt = Date.now()
        return player.stamina
    }

    const now = Date.now()
    const elapsed = now - player.staminaUpdatedAt

    if (elapsed <= 0) return player.stamina

    const gained = Math.floor(elapsed / REGEN_MS_PER_POINT)

    if (gained <= 0) return player.stamina

    player.stamina = Math.min(MAX_STAMINA, player.stamina + gained)

    // نرجّع الوقت المرجعي بقد النقاط المكتسبة بس (عشان الباقي المتبقي ما يضيع)
    player.staminaUpdatedAt += gained * REGEN_MS_PER_POINT

    if (player.stamina >= MAX_STAMINA) {
        player.staminaUpdatedAt = now
    }

    return player.stamina

}

function getStaminaInfo(player) {

    const current = typeof player.stamina === 'number' ? player.stamina : MAX_STAMINA

    if (current >= MAX_STAMINA) {
        return { current, max: MAX_STAMINA, msToNext: 0 }
    }

    const elapsedSinceUpdate = Date.now() - (player.staminaUpdatedAt || Date.now())

    const msToNext = Math.max(0, REGEN_MS_PER_POINT - elapsedSinceUpdate)

    return { current, max: MAX_STAMINA, msToNext }

}

// =========================
// 👥 فريق الدومين (تخزينه بمفتاح رقم الدومين داخل player.domainTeams)
// =========================

function setDomainTeam(player, domainId, indices) {

    const domain = getDomainById(domainId)

    if (!domain) {
        return { success: false, message: '❌ رقم دومين غير صحيح.' }
    }

    const uniqueIndices = [...new Set(indices)]

    if (uniqueIndices.length !== 3) {
        return {
            success: false,
            message: '❌ لازم تحدد فريق من 3 شخصيات بالضبط لدخول الدومين.\nمثال: .فريق_دومين ' + domainId + ' 1 2 3'
        }
    }

    const characters = player.characters || []

    const selected = uniqueIndices
        .map(i => characters[i - 1])
        .filter(Boolean)

    if (selected.length !== 3) {
        return { success: false, message: '❌ أحد الأرقام اللي كتبتها ما يطابق شخصية موجودة عندك.' }
    }

    indices = uniqueIndices

    if (!player.domainTeams) {
        player.domainTeams = {}
    }

    player.domainTeams[domainId] = indices

    if (player.markModified) {
        player.markModified('domainTeams')
    }

    return { success: true, domain }

}

function getDomainTeamCharacters(player, domainId) {

    const characters = player.characters || []

    const indices = (player.domainTeams && player.domainTeams[domainId]) || []

    return indices
        .map(i => characters[i - 1])
        .filter(Boolean)

}

// =========================
// 💪 حساب قوة الفريق (شخصية.power + بونص المعدات)
// =========================

function calculateTeamPower(team) {

    let power = 0

    for (const char of team) {

        const base = Number(char.power || 0)

        const equip = equipmentSystem.calculateEquipmentStats(char)

        const critFactor =
            1 + ((equip.critRate || 0) / 100) * ((equip.critDamage || 0) / 100)

        // ⚠️ هجوم/دفاع/HP كستات رئيسي أصبحوا % (attackPercent/defensePercent/hpPercent)
        // تُحسب كنسبة من قوة الشخصية الأساسية (base) بدل رقم فلات ثابت
        const equipPower =
            (equip.attack || 0) +
            (equip.hp || 0) / 10 +
            (equip.defense || 0) * 3 +
            base * ((equip.attackPercent || 0) / 100) +
            base * ((equip.hpPercent || 0) / 100) / 10 +
            base * ((equip.defensePercent || 0) / 100) * 3

        power += Math.round((base + equipPower) * critFactor)

    }

    return power

}

// =========================
// 🌀 دخول الدومين والقتال
// domainId: رقم الدومين (1-12)
// difficultyInput: 'سهل' / 'متوسط' / 'صعب' (أو easy/medium/hard) — افتراضي: متوسط
// =========================

function enterDomain(player, domainId, difficultyInput) {

    const domain = getDomainById(domainId)

    if (!domain) {
        return { success: false, message: '❌ رقم دومين غير صحيح.' }
    }

    const difficultyKey = normalizeDifficulty(difficultyInput)
    const difficulty = DIFFICULTY_LEVELS[difficultyKey]

    applyStaminaRegen(player)

    if ((player.stamina || 0) < DOMAIN_COST) {

        const info = getStaminaInfo(player)
        const minutesToNext = Math.ceil(info.msToNext / 60000)

        return {
            success: false,
            message:
`⚡ ما عندك ستامينا كافية (تحتاج ${DOMAIN_COST}).
رصيدك الحالي: ${info.current}/${info.max}
⏳ أقرب نقطة تتجدد خلال ${minutesToNext} دقيقة`
        }

    }

    const team = getDomainTeamCharacters(player, domainId)

    if (!team.length) {

        return {
            success: false,
            message: `❌ ما حددت فريق لدومين ${domain.name}.\nاستخدم: .فريق_دومين ${domainId} أرقام_الشخصيات`
        }

    }

    // خصم الستامينا (تُخصم بمحاولة الدخول سواء ربح أو خسر، مثل أي دومين حقيقي)
    player.stamina -= DOMAIN_COST

    const teamPower = calculateTeamPower(team)

    // معادلة فرصة الفوز: تتمركز حول baseWinChance وتتحرك حسب قوة الفريق مقابل القوة المطلوبة
    const powerRatio = teamPower / difficulty.requiredPower

    let winChance = difficulty.baseWinChance * Math.min(1.5, Math.max(0.4, powerRatio))
    winChance = Math.max(0.05, Math.min(0.95, winChance))

    // 🎲 رمية حظ من 1-20: فوق 10 تزيد فرصة الفوز، وتحتها تنقصها
    const luckRoll = Math.floor(Math.random() * 20) + 1
    winChance += luckRoll > 10 ? 0.05 : -0.05
    winChance = Math.max(0.05, Math.min(0.95, winChance))

    const monsterPool = domain.monsters[difficultyKey] || []
    const monster = monsterPool.length
        ? monsterPool[Math.floor(Math.random() * monsterPool.length)]
        : null

    const won = Math.random() < winChance

    if (!won) {

        return {
            success: true,
            won: false,
            message:
`${domain.emoji} دومين ${domain.name} - ${difficulty.label}
🎲 رميت: ${luckRoll}/20 ${luckRoll > 10 ? '(فوق 10 👍)' : '(تحت 10 👎)'}
💀 خسرت أمام ${monster ? monster.name : 'الوحش'}!
💪 قوة فريقك: ${teamPower.toLocaleString()}
🎯 فرصة الفوز كانت: ${Math.round(winChance * 100)}%
⚡ الستامينا المتبقية: ${player.stamina}/${MAX_STAMINA}

جرب ترفع قوة فريقك أو انزل صعوبة أسهل.`
        }

    }

    const item = equipmentSystem.generateEchoFromDomainKill(domain.familyId, difficulty.cost)

    if (!player.inventory) player.inventory = []

    let inventoryMessage = ''

    if (player.inventory.length >= (player.maxInventory || equipmentSystem.DEFAULT_MAX_INVENTORY)) {

        inventoryMessage = '\n⚠️ حقيبتك ممتلئة! القطعة ما انحفظت، فضّي مكان وحاول مرة ثانية.'

    } else {

        player.inventory.push(item)

        if (player.markModified) {
            player.markModified('inventory')
        }

    }

    // 🎼 مكافأة تيونر الصدى (5 لكل فوز بدومين)
    const newTunerTotal = equipmentSystem.addTuners(player, equipmentSystem.TUNERS_PER_DOMAIN_WIN)

    return {

        success: true,
        won: true,
        item,

        message:
`${domain.emoji} دومين ${domain.name} - ${difficulty.label}
🎲 رميت: ${luckRoll}/20 ${luckRoll > 10 ? '(فوق 10 👍)' : '(تحت 10 👎)'}
⚔️ هزمت ${monster ? monster.name : 'الوحش'}!
💪 قوة فريقك: ${teamPower.toLocaleString()}
⚡ الستامينا المتبقية: ${player.stamina}/${MAX_STAMINA}

🎁 القطعة اللي سقطت:
${item.icon || '🔸'} ${item.familyNameAr || item.familyName} (كوست ${item.cost})
📊 ستات رئيسي: ${item.mainStat.type} +${item.mainStat.value}
${monster ? `🐉 أسقطها: ${monster.nameAr || monster.name}` : ''}
🎼 +${equipmentSystem.TUNERS_PER_DOMAIN_WIN} ${equipmentSystem.TUNER_NAME_AR} (المجموع: ${newTunerTotal})${inventoryMessage}`

    }

}

// =========================
// Exports
// =========================

module.exports = {

    MAX_STAMINA,
    DOMAIN_COST,
    DIFFICULTY_LEVELS,

    listDomains,
    getDomainById,

    applyStaminaRegen,
    getStaminaInfo,

    setDomainTeam,
    getDomainTeamCharacters,

    calculateTeamPower,
    enterDomain,

    normalizeDifficulty

}
