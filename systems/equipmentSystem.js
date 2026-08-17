// =========================
// 🎐 نظام الإيكوز (Echo System) - مستوحى من Wuthering Waves
// المصدر الوحيد للمعدات: data/echoFamilies.js (العائلات) + data/equipmentAffixes.js (بنك الساب ستات)
// + data/echoMonsters.js (الوحوش اللي تطيح كل قطعة حسب عائلتها وكوستها)
// =========================

const echoFamilies = require('../data/echoFamilies')
const echoMonsters = require('../data/echoMonsters')
const { affixes: SUBSTAT_POOL } = require('../data/equipmentAffixes')

// =========================
// Helpers
// =========================

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function choose(list) {
    return list[random(0, list.length - 1)]
}

function makeUid() {
    return 'eq' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// =========================
// بنية السلوتات (5 سلوتات = كوست 12 بالضبط)
// =========================

const SLOT_LAYOUT = {
    cost4: 4,
    cost3_1: 3,
    cost3_2: 3,
    cost1_1: 1,
    cost1_2: 1
}

const SLOT_KEYS = Object.keys(SLOT_LAYOUT) // ['cost4','cost3_1','cost3_2','cost1_1','cost1_2']

function slotKeyToCost(slotKey) {
    return SLOT_LAYOUT[slotKey] || null
}

// =========================
// بنك الستات الرئيسي (Main Stat) حسب الكوست
// =========================

const MAIN_STAT_POOL = {
    4: ['critRate', 'critDamage', 'bossDamage', 'lifesteal'],
    3: ['attack', 'defense', 'dodge', 'accuracy', 'reflect'],
    1: ['attack', 'hp']
}

// القيمة القصوى للستات الرئيسي عند لفل 15 (السقف المطلق)
// ⚠️ هجوم / دفاع / HP كستات رئيسي أصبحوا نسبة % فعلية (يُحسبون من ستات الشخصية الأساسية)
// بدل رقم ثابت (Flat) — نفس منطق باقي الستاتات النسبية
const MAIN_STAT_CEILING = {
    attack: 10,
    defense: 15,
    hp: 20,
    critRate: 15,
    critDamage: 20,
    bossDamage: 20,
    dodge: 20,
    accuracy: 20,
    reflect: 20,
    lifesteal: 25
}

// الستاتات الرئيسية اللي تحولت من فلات إلى نسبة % (تُقرأ من هنا بدل تكرار الشرط بكل مكان)
const PERCENT_MAIN_STATS = ['attack', 'defense', 'hp']

// ❌ تم حذف نظام الندرة بالكامل (Epic/Legendary/Mythical) — مطابق لنظام WuWa الحقيقي
// الإيكوز الآن تُصنَّف بالكوست فقط: كوست 4 / كوست 3 / كوست 1
const COST_LIST = [4, 3, 1]

// أيقونة بسيطة تدل على الكوست (تُستخدم بالعرض بدل النجوم)
const COST_ICON = {
    4: '💠',
    3: '🔷',
    1: '🔹'
}

const MAX_LEVEL = 15

// كل ما توصل لأحد هالمستويات تنفتح لك ساب ستات جديد (3 مستويات = 3 ساب ستات بالضبط عند لفل 15)
const SUBSTAT_UNLOCK_LEVELS = [5, 10, 15]
const MAX_SUBSTATS = SUBSTAT_UNLOCK_LEVELS.length // 3

// =========================
// حساب قيمة الستات الرئيسي حسب اللفل (بدون ندرة نهائياً)
// =========================

function calcMainStatValue(statType, level) {

    const ceiling = MAIN_STAT_CEILING[statType] || 20

    // عند لفل 0 القطعة تعطي 25% من سقفها، وتكبر تدريجياً لين 100% عند لفل 15
    const levelFactor = 0.25 + 0.75 * (level / MAX_LEVEL)

    return Math.max(
        1,
        Math.round(ceiling * levelFactor)
    )

}

// =========================
// اختيار كوست عشوائي (يحاكي إسقاط قطعة عشوائية بدون تحديد سلوت)
// =========================

function rollCost() {
    return choose([1, 3, 4])
}

// =========================
// 🐉 ربط الوحوش بالقطع (data/echoMonsters.js)
// كل عائلة فيها وحش واحد لكوست 4، ووحشين لكوست 3، ووحشين لكوست 1
// =========================

function pickMonsterForDrop(familyId, cost) {

    const pool = echoMonsters[familyId]

    if (!pool) return null

    const key = cost === 4 ? 'cost4' : cost === 3 ? 'cost3' : 'cost1'

    const list = pool[key]

    if (!list || !list.length) return null

    return choose(list)

}

// =========================
// توليد قطعة إيكو جديدة (بدون أي نظام ندرة)
// cost: 1 | 3 | 4 (لازم يتحدد حسب السلوت المطلوب تعبئته أو عشوائي عبر rollCost())
// familyId: اختياري - لو ماحددت بتنسحب عشوائية من الـ12 عائلة
// monster: اختياري - كائن { name, nameAr } يمثل الوحش اللي أسقط القطعة (يُسحب تلقائياً لو ماتحدد)
// =========================

function generateEchoPiece(cost, familyId, monster) {

    if (![1, 3, 4].includes(cost)) {
        cost = rollCost()
    }

    const family = familyId
        ? echoFamilies.find(f => f.id === familyId)
        : choose(echoFamilies)

    if (!family) return null

    const mainStatType = choose(MAIN_STAT_POOL[cost])

    const droppedBy = monster || pickMonsterForDrop(family.id, cost)

    const item = {

        uid: makeUid(),

        cost,
        icon: COST_ICON[cost] || '🔸',

        familyId: family.id,
        familyName: family.name,
        familyNameAr: family.nameAr,

        level: 0,
        maxLevel: MAX_LEVEL,

        mainStat: {
            type: mainStatType,
            value: calcMainStatValue(mainStatType, 0)
        },

        subStats: [],

        // 🐉 الوحش اللي أسقط القطعة (لو أُسقطت من دومين)
        droppedBy: droppedBy
            ? { name: droppedBy.name, nameAr: droppedBy.nameAr }
            : null,

        createdAt: Date.now()

    }

    return item

}

// =========================
// 🌀 توليد قطعة إيكو من قتل وحش دومين معيّن
// يُستخدم مباشرة من systems/domainSystem.js عند فوز اللاعب بمرحلة دومين
// cost يتحدد حسب صعوبة الدومين المختارة (سهل=1 / متوسط=3 / صعب=4)
// =========================

function generateEchoFromDomainKill(familyId, cost) {

    const monster = pickMonsterForDrop(familyId, cost)

    const item = generateEchoPiece(cost, familyId, monster)

    return item

}

// =========================
// تلفيل قطعة إيكو (رفع لفل واحد كل مرة)
// يرجع { item, unlockedSubStat } عشان تعرف الواجهة تعلن عن ساب ستات جديد لو انفتح
// =========================

function levelUpEcho(item) {

    if (!item) return { item, unlockedSubStat: null }

    if (item.level >= MAX_LEVEL) {
        return { item, unlockedSubStat: null, maxed: true }
    }

    item.level += 1

    // تحديث قيمة الستات الرئيسي حسب اللفل الجديد
    item.mainStat.value = calcMainStatValue(
        item.mainStat.type,
        item.level
    )

    let unlockedSubStat = null

    if (SUBSTAT_UNLOCK_LEVELS.includes(item.level) && item.subStats.length < MAX_SUBSTATS) {

        const usedTypes = new Set([
            item.mainStat.type,
            ...item.subStats.map(s => s.type)
        ])

        const available = SUBSTAT_POOL.filter(a => !usedTypes.has(a.type))

        const pool = available.length ? available : SUBSTAT_POOL

        const chosenAffix = choose(pool)

        const newSub = {
            type: chosenAffix.type,
            name: chosenAffix.name,
            value: random(chosenAffix.min, chosenAffix.max)
        }

        item.subStats.push(newSub)

        unlockedSubStat = newSub

    }

    return { item, unlockedSubStat }

}

// رفع أكثر من لفل دفعة وحدة (مفيد لو اللاعب دفع مواد لعدة لفلات مرة وحدة)
function levelUpEchoBy(item, levels) {

    const unlocked = []

    for (let i = 0; i < levels; i++) {

        if (item.level >= MAX_LEVEL) break

        const result = levelUpEcho(item)

        if (result.unlockedSubStat) {
            unlocked.push(result.unlockedSubStat)
        }

    }

    return { item, unlockedSubStats: unlocked }

}

// =========================
// تهيئة سلوتات الإيكو لأي شخصية (5 سلوتات بدل weapon/armor/accessory)
// =========================

function ensureEquipmentSlots(character) {

    if (!character.echoes) {
        character.echoes = {}
    }

    for (const key of SLOT_KEYS) {
        if (character.echoes[key] === undefined) {
            character.echoes[key] = null
        }
    }

    return character.echoes

}

// =========================
// تجهيز قطعة إيكو بسلوت معين
// slotKey لازم يكون أحد مفاتيح SLOT_LAYOUT، وكوست القطعة لازم يطابق كوست السلوت
// =========================

function equipItem(player, character, itemUid, slotKey) {

    if (!character) {
        return { success: false, message: '❌ الشخصية غير موجودة.' }
    }

    if (!SLOT_LAYOUT[slotKey]) {
        return { success: false, message: '❌ سلوت غير صحيح.' }
    }

    const index = player.inventory.findIndex(item => item.uid === itemUid)

    if (index === -1) {
        return { success: false, message: '❌ القطعة غير موجودة بالحقيبة.' }
    }

    const item = player.inventory[index]

    if (item.cost !== SLOT_LAYOUT[slotKey]) {
        return {
            success: false,
            message: `❌ هذي القطعة كوست ${item.cost}، ما تناسب سلوت كوست ${SLOT_LAYOUT[slotKey]}.`
        }
    }

    const echoes = ensureEquipmentSlots(character)

    // سواب تلقائي: لو فيه قطعة بنفس السلوت، ترجع للحقيبة
    if (echoes[slotKey]) {
        player.inventory.push(echoes[slotKey])
    }

    echoes[slotKey] = item

    player.inventory.splice(index, 1)

    if (player.markModified) {
        player.markModified('characters')
        player.markModified('inventory')
    }

    return { success: true, item, character }

}

// =========================
// 👕 لبس قطعة برقمها من .ايكو مباشرة (بدون تحديد سلوت يدوياً)
// يحدد السلوت تلقائياً حسب كوست القطعة:
//   كوست 4 → cost4 (سلوت وحيد)
//   كوست 3 → cost3_1 أو cost3_2 (يفضّل الفاضي، ولو الاثنين معبّين يستبدل الأول)
//   كوست 1 → cost1_1 أو cost1_2 (نفس المنطق)
// charIndex / invIndex: أرقام 1-based (نفس المعروضة بـ .شخصياتي و .ايكو)
// =========================

function equipByIndex(player, charIndex, invIndex) {

    const character = (player.characters || [])[Number(charIndex) - 1]

    if (!character) {
        return { success: false, message: '❌ رقم الشخصية غير صحيح.' }
    }

    const item = (player.inventory || [])[Number(invIndex) - 1]

    if (!item) {
        return { success: false, message: '❌ رقم القطعة غير صحيح.' }
    }

    const echoes = ensureEquipmentSlots(character)

    let slotKey = null

    if (item.cost === 4) {
        slotKey = 'cost4'
    } else if (item.cost === 3) {
        slotKey = !echoes.cost3_1 ? 'cost3_1' : (!echoes.cost3_2 ? 'cost3_2' : 'cost3_1')
    } else if (item.cost === 1) {
        slotKey = !echoes.cost1_1 ? 'cost1_1' : (!echoes.cost1_2 ? 'cost1_2' : 'cost1_1')
    } else {
        return { success: false, message: '❌ كوست القطعة غير صحيح.' }
    }

    const result = equipItem(player, character, item.uid, slotKey)

    if (!result.success) return result

    return { success: true, item, character, slotKey }

}

// =========================
// خلع قطعة من سلوت معين
// =========================

function unequipItem(player, character, slotKey) {

    if (!character) {
        return { success: false, message: '❌ الشخصية غير موجودة.' }
    }

    const echoes = ensureEquipmentSlots(character)

    if (!echoes[slotKey]) {
        return { success: false, message: '❌ لا يوجد إيكو مجهز بهذا السلوت.' }
    }

    if (player.inventory.length >= (player.maxInventory || DEFAULT_MAX_INVENTORY)) {
        return { success: false, message: '🎒 الحقيبة ممتلئة.' }
    }

    player.inventory.push(echoes[slotKey])
    echoes[slotKey] = null

    if (player.markModified) {
        player.markModified('characters')
        player.markModified('inventory')
    }

    return { success: true }

}

// =========================
// 🧤 إزالة قطعة برقم الشخصية + الكوست مباشرة (بدل اسم السلوت الكامل)
// subSlot: اختياري (1 أو 2) لتحديد أي سلوت بالكوستات المكررة (3 أو 1) — افتراضي 1
// =========================

function unequipByCost(player, charIndex, cost, subSlot) {

    const character = (player.characters || [])[Number(charIndex) - 1]

    if (!character) {
        return { success: false, message: '❌ رقم الشخصية غير صحيح.' }
    }

    const echoes = ensureEquipmentSlots(character)

    const n = Number(cost)

    let slotKey = null

    // subSlot "محدد يدوياً" فقط لو المستخدم مرره فعلاً (وليس undefined/null/فاضي)
    const hasExplicitSubSlot = subSlot !== undefined && subSlot !== null && subSlot !== ''

    if (n === 4) {

        slotKey = 'cost4'

    } else if (n === 3 || n === 1) {

        const slotA = n === 3 ? 'cost3_1' : 'cost1_1'
        const slotB = n === 3 ? 'cost3_2' : 'cost1_2'

        if (hasExplicitSubSlot) {

            // المستخدم حدد بنفسه أي سلوت (1 أو 2)
            slotKey = Number(subSlot) === 2 ? slotB : slotA

        } else {

            // ما حدد سلوت: نلقى تلقائياً وين فعلاً موجودة القطعة
            // (قبل كان دايم يفترض السلوت الأول ويفشل لو القطعة بالسلوت الثاني)
            slotKey = echoes[slotA] ? slotA : (echoes[slotB] ? slotB : slotA)

        }

    } else {
        return { success: false, message: '❌ الكوست لازم يكون 1 أو 3 أو 4.' }
    }

    return unequipItem(player, character, slotKey)

}

// =========================
// حساب بونص عائلة الطقم (Set Bonus) حسب عدد القطع المجهزة من كل عائلة
// =========================

function calculateFamilyBonus(echoes) {

    const bonus = {}

    const familyCounts = {}

    for (const key of SLOT_KEYS) {

        const item = echoes[key]

        if (!item) continue

        familyCounts[item.familyId] = (familyCounts[item.familyId] || 0) + 1

    }

    for (const familyId in familyCounts) {

        const count = familyCounts[familyId]

        const family = echoFamilies.find(f => f.id === familyId)

        if (!family) continue

        if (count >= 2 && family.bonus2) {
            for (const stat in family.bonus2) {
                bonus[stat] = (bonus[stat] || 0) + family.bonus2[stat]
            }
        }

        if (count >= 5 && family.bonus5) {
            for (const stat in family.bonus5) {
                bonus[stat] = (bonus[stat] || 0) + family.bonus5[stat]
            }
        }

    }

    return bonus

}

// =========================
// حساب مجموع ستاتات شخصية وحدة (Main + Sub + بونص العائلة)
// =========================

function calculateEquipmentStats(character) {

    // attack/defense/hp هنا فلات فقط (تجي من ساب ستات "هجوم/دفاع/HP" التقليدية)
    // attackPercent/defensePercent/hpPercent هي النسبة % (تجي من الستات الرئيسي الجديد
    // + ساب ستات attackPercent/hpPercent الموجودة أصلاً ببنك الأفكسات)
    const bonus = {
        attack: 0, attackPercent: 0,
        defense: 0, defensePercent: 0,
        hp: 0, hpPercent: 0,
        critRate: 0, critDamage: 0,
        dodge: 0, accuracy: 0,
        shield: 0, lifesteal: 0,
        reflect: 0, bossDamage: 0
    }

    if (!character) return bonus

    const echoes = ensureEquipmentSlots(character)

    for (const key of SLOT_KEYS) {

        const item = echoes[key]

        if (!item) continue

        if (item.mainStat) {

            const t = item.mainStat.type

            // الستات الرئيسي لو كان هجوم/دفاع/HP بيروح لمفتاح النسبة % مباشرة
            const mappedType = PERCENT_MAIN_STATS.includes(t) ? (t + 'Percent') : t

            bonus[mappedType] = (bonus[mappedType] || 0) + item.mainStat.value

        }

        for (const sub of (item.subStats || [])) {
            bonus[sub.type] = (bonus[sub.type] || 0) + sub.value
        }

    }

    const familyBonus = calculateFamilyBonus(echoes)

    for (const stat in familyBonus) {
        bonus[stat] = (bonus[stat] || 0) + familyBonus[stat]
    }

    return bonus

}

// =========================
// 🔧 تطبيق بونص المعدات النسبي (attackPercent/defensePercent/hpPercent) على أي كائن ستاتات
// يُستخدم بعد ما تضيف الفلات (attack/defense/hp) العادية من الساب ستات
// النسبة % تُحسب من قيمة الستات الأساسية (بعد الفلات) وتُضاف فوقها
// =========================

function applyEquipPercentBonus(stats, bonus) {

    if (!stats || !bonus) return stats

    if (bonus.attackPercent) {
        stats.attack = Math.round(
            (stats.attack || 0) * (1 + bonus.attackPercent / 100)
        )
    }

    if (bonus.defensePercent) {
        stats.defense = Math.round(
            (stats.defense || 0) * (1 + bonus.defensePercent / 100)
        )
    }

    if (bonus.hpPercent) {
        stats.hp = Math.round(
            (stats.hp || 0) * (1 + bonus.hpPercent / 100)
        )
    }

    return stats

}

// =========================
// 🎐 تفاصيل بونص العوائل النشطة (2pc/5pc) لعرضها بأمر .احصائيات
// يرجع array من { familyId, familyNameAr, familyName, count, bonus2Active, bonus5Active, bonus2, bonus5 }
// =========================

function getActiveFamilyDetails(echoes) {

    const familyCounts = {}

    for (const key of SLOT_KEYS) {

        const item = echoes[key]

        if (!item) continue

        familyCounts[item.familyId] = (familyCounts[item.familyId] || 0) + 1

    }

    const details = []

    for (const familyId in familyCounts) {

        const count = familyCounts[familyId]

        const family = echoFamilies.find(f => f.id === familyId)

        if (!family) continue

        details.push({
            familyId,
            familyNameAr: family.nameAr,
            familyName: family.name,
            count,
            bonus2Active: count >= 2 && !!family.bonus2,
            bonus5Active: count >= 5 && !!family.bonus5,
            bonus2: family.bonus2 || null,
            bonus5: family.bonus5 || null
        })

    }

    return details

}

// =========================
// حساب ستاتات فريق كامل (لأنظمة القتال/المضاربة/الدومين)
// =========================

function calculateTeamEquipmentStats(characters) {

    const total = {
        attack: 0, attackPercent: 0,
        defense: 0, defensePercent: 0,
        hp: 0, hpPercent: 0,
        critRate: 0, critDamage: 0,
        dodge: 0, accuracy: 0,
        shield: 0, lifesteal: 0,
        reflect: 0, bossDamage: 0
    }

    if (!characters || !characters.length) return total

    for (const character of characters) {

        const bonus = calculateEquipmentStats(character)

        for (const stat in bonus) {
            total[stat] = (total[stat] || 0) + bonus[stat]
        }

    }

    return total

}

// =========================
// سعر بيع القطعة حسب الكوست فقط (ما فيه ندرة نهائياً)
// =========================

const SELL_PRICE_BY_COST = {
    4: 15000,
    3: 6000,
    1: 2000
}

function sellEquipment(player, uid) {

    const index = player.inventory.findIndex(item => item.uid === uid)

    if (index === -1) {
        return { success: false, message: '❌ القطعة غير موجودة.' }
    }

    const item = player.inventory[index]

    const price = SELL_PRICE_BY_COST[item.cost] || 2000

    player.money += price

    player.inventory.splice(index, 1)

    if (player.markModified) {
        player.markModified('inventory')
    }

    return { success: true, gold: price, item }

}

// بيع قطعة عن طريق رقمها بقائمة .ايكو (index 1-based داخل player.inventory)
function sellEquipmentByIndex(player, index1Based) {

    const idx = Number(index1Based) - 1

    if (!player.inventory || !player.inventory[idx]) {
        return { success: false, message: '❌ رقم القطعة غير صحيح.' }
    }

    const item = player.inventory[idx]

    const price = SELL_PRICE_BY_COST[item.cost] || 2000

    player.money = (player.money || 0) + price

    player.inventory.splice(idx, 1)

    if (player.markModified) {
        player.markModified('inventory')
    }

    return { success: true, gold: price, item }

}

// =========================
// 🎼 تيونر الصدى (Echo Tuners) — مادة ترقية القطع، تُمنح 5 منها عند كل فوز بدومين
// =========================

const TUNERS_PER_DOMAIN_WIN = 5
const TUNER_NAME_AR = 'تيونر الصدى'

function addTuners(player, amount = TUNERS_PER_DOMAIN_WIN) {

    player.echoTuners = (player.echoTuners || 0) + amount

    if (player.markModified) {
        player.markModified('echoTuners')
    }

    return player.echoTuners

}

// =========================
// 🎒 سعة حقيبة الإيكوز الافتراضية
// =========================

const DEFAULT_MAX_INVENTORY = 40

// =========================
// 📜 قائمة إيكوز اللاعب مرتّبة (مطوّرة أولاً ثم غير مطوّرة) مع أرقام تشير لموقعها
// الحقيقي بـ player.inventory (نفس الرقم يُستخدم بأوامر .لبس و .بيع_ايكو)
// =========================

function formatInventoryList(player) {

    const inventory = player.inventory || []
    const max = player.maxInventory || DEFAULT_MAX_INVENTORY

    if (!inventory.length) {

        return `🎐 حقيبة الإيكوز (0/${max})\n\nحقيبتك فاضية، ادخل دومين عشان تحصل قطع!\nاستخدم: .دومين`

    }

    const developed = []
    const undeveloped = []

    inventory.forEach((item, i) => {

        const isPercentMain = PERCENT_MAIN_STATS.includes(item.mainStat.type)
        const mainStatDisplay = `${item.mainStat.type} +${item.mainStat.value}${isPercentMain ? '%' : ''}`

        const line =
            `[${i + 1}] ${item.icon || COST_ICON[item.cost] || '🔸'} ${item.familyNameAr || item.familyName} | كوست ${item.cost} | لفل ${item.level}/${item.maxLevel} | ${mainStatDisplay}`

        if (item.level > 0) {
            developed.push(line)
        } else {
            undeveloped.push(line)
        }

    })

    let message = `🎐 حقيبة الإيكوز (${inventory.length}/${max})\n\n`

    if (developed.length) {
        message += `🔺 مطوّرة (${developed.length}):\n${developed.join('\n')}\n\n`
    }

    if (undeveloped.length) {
        message += `⚪ غير مطوّرة (${undeveloped.length}):\n${undeveloped.join('\n')}\n\n`
    }

    message +=
`━━━━━━━━━━━━━━
📌 للّبس: .لبس رقم_الشخصية رقم_القطعة
📌 للإزالة: .ازالة رقم_الشخصية الكوست
📌 للبيع: .بيع_ايكو رقم_القطعة`

    return message

}

// =========================
// 🎐 عرض الإيكوز المجهزة على شخصية معينة، كل قطعة برئيسي + كل الساب ستات تبعها
// يُستخدم بأمر: .ايكو_شخصية رقم_الشخصية
// =========================

const MAIN_STAT_LABEL = {
    attack: '⚔️ هجوم', defense: '🛡️ دفاع', hp: '❤️ HP',
    critRate: '🎯 نسبة الحرج', critDamage: '💥 ضرر الحرج',
    bossDamage: '👹 ضرر بوس', dodge: '👻 مراوغة',
    accuracy: '🎯 دقة', lifesteal: '🩸 امتصاص حياة'
}

const SLOT_LABEL = {
    cost4: 'كوست 4',
    cost3_1: 'كوست 3 (1)',
    cost3_2: 'كوست 3 (2)',
    cost1_1: 'كوست 1 (1)',
    cost1_2: 'كوست 1 (2)'
}

function formatEquippedEchoes(character) {

    if (!character) return '❌ الشخصية غير موجودة.'

    const echoes = ensureEquipmentSlots(character)

    const equippedCount = SLOT_KEYS.filter(k => echoes[k]).length

    let message = `🎐 الإيكوز المجهزة — ${character.name || ''} (${equippedCount}/5)\n\n`

    if (!equippedCount) {
        message += 'لا يوجد أي إيكو مجهز على هذي الشخصية.\nاستخدم: .لبس رقم_الشخصية رقم_القطعة'
        return message.trim()
    }

    for (const key of SLOT_KEYS) {

        const item = echoes[key]

        if (!item) {
            message += `⚪ ${SLOT_LABEL[key]}: فاضي\n\n`
            continue
        }

        const isPercentMain = PERCENT_MAIN_STATS.includes(item.mainStat.type)
        const mainLabel = MAIN_STAT_LABEL[item.mainStat.type] || item.mainStat.type

        message += `${item.icon || COST_ICON[item.cost] || '🔸'} ${SLOT_LABEL[key]} — ${item.familyNameAr || item.familyName} | لفل ${item.level}/${item.maxLevel}\n`
        message += `  ├ رئيسي: ${mainLabel} +${item.mainStat.value}${isPercentMain ? '%' : ''}\n`

        if (item.subStats && item.subStats.length) {

            item.subStats.forEach((sub, i) => {
                const isLast = i === item.subStats.length - 1
                message += `  ${isLast ? '└' : '├'} ساب: ${sub.name} +${sub.value}\n`
            })

        } else {
            message += `  └ ساب: لا يوجد بعد (يفتح بلفل 5/10/15)\n`
        }

        message += '\n'

    }

    return message.trim()

}

function removeEquipment(player, uid) {

    const index = player.inventory.findIndex(item => item.uid === uid)

    if (index === -1) return false

    player.inventory.splice(index, 1)

    return true

}

// =========================
// Exports
// =========================

module.exports = {

    SLOT_LAYOUT,
    SLOT_KEYS,
    MAIN_STAT_POOL,
    MAX_LEVEL,
    SUBSTAT_UNLOCK_LEVELS,
    MAX_SUBSTATS,

    generateEchoPiece,
    generateEchoFromDomainKill,
    pickMonsterForDrop,
    rollCost,

    levelUpEcho,
    levelUpEchoBy,

    ensureEquipmentSlots,
    equipItem,
    equipByIndex,
    unequipItem,
    unequipByCost,

    calculateFamilyBonus,
    calculateEquipmentStats,
    calculateTeamEquipmentStats,
    applyEquipPercentBonus,
    getActiveFamilyDetails,
    PERCENT_MAIN_STATS,

    sellEquipment,
    sellEquipmentByIndex,
    removeEquipment,

    slotKeyToCost,

    COST_LIST,
    COST_ICON,
    SELL_PRICE_BY_COST,

    TUNERS_PER_DOMAIN_WIN,
    TUNER_NAME_AR,
    addTuners,

    DEFAULT_MAX_INVENTORY,
    formatInventoryList,
    formatEquippedEchoes

}
