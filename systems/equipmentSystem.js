const equipments = require('../data/equipments')
const boxes = require('../data/equipmentBoxes')
const domainEquipments = require('../data/domainEquipments')

const {
    generateEquipment
} = require('../data/equipmentAffixes')

// =========================
// Helpers
// =========================

function random(min, max) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min

}

function choose(list) {

    return list[
        random(
            0,
            list.length - 1
        )
    ]

}

// =========================
// تهيئة سلوتات المعدات لأي شخصية
// (كل شخصية تملك سلوتاتها الخاصة الآن، مو الحساب كامل)
// =========================

function ensureEquipmentSlots(character) {

    if (!character.equipment) {

        character.equipment = {

            weapon: null,
            armor: null,
            accessory: null

        }

    }

    if (character.equipment.weapon === undefined)
        character.equipment.weapon = null

    if (character.equipment.armor === undefined)
        character.equipment.armor = null

    if (character.equipment.accessory === undefined)
        character.equipment.accessory = null

    return character.equipment

}

// =========================
// Choose Rarity
// =========================

function rollRarity(boxId) {

    const box = boxes[boxId]

    if (!box) {

        return null

    }

    const roll = random(1, 100)

    let total = 0

    for (const drop of box.drops) {

        total += drop.chance

        if (roll <= total) {

            return drop.rarity

        }

    }

    return box.drops[0].rarity

}

// =========================
// Random Equipment
// =========================

function getRandomEquipment(rarity, type) {

    const pool = equipments.filter(item => {

        if (item.rarity !== rarity) return false

        if (type && item.type !== type) return false

        return true

    })

    if (!pool.length) {

        return null

    }

    return choose(pool)

}

// =========================
// إنشاء قطعة معدة من ندرة + نوع محددين
// (اللبنة المشتركة بين صناديق المعدات ومكافآت الدومين)
// =========================

function createEquipmentItem(rarity, type) {

    const template = getRandomEquipment(

        rarity,
        type

    )

    if (!template) {

        return null

    }

    const item = generateEquipment(
    template
)

// =========================
// Equipment Quality
// =========================

const qualityRoll = random(1, 100)

if (qualityRoll <= 5) {

    item.quality = "Perfect"
    item.qualityBonus = 30

} else if (qualityRoll <= 20) {

    item.quality = "Excellent"
    item.qualityBonus = 20

} else if (qualityRoll <= 50) {

    item.quality = "Fine"
    item.qualityBonus = 10

} else {

    item.quality = "Normal"
    item.qualityBonus = 0

}

// =========================
// Equipment Level
// =========================

item.level = 0

// =========================
// Apply Quality Bonus
// =========================

for (const stat in item.stats) {

    item.stats[stat] += Math.floor(
        item.stats[stat] *
        item.qualityBonus / 100
    )

}

for (const affix of item.affixes) {

    affix.value += Math.floor(
        affix.value *
        item.qualityBonus / 100
    )

}

return item

}

// =========================
// Open Equipment Box
// type اختياري: لو انحدد، الصندوق يطلع بس معدات من هذا النوع
// =========================

function openEquipmentBox(boxId, type) {

    const rarity = rollRarity(boxId)

    if (!rarity) {

        return null

    }

    return createEquipmentItem(rarity, type)

}

// =========================
// توليد معدة مباشرة من ندرة محددة (بدون صندوق)
// يُستخدم من نظام الدومين اللي عنده جدول ندرة خاص فيه
// =========================

function generateEquipmentByRarity(rarity, type) {

    return createEquipmentItem(rarity, type)

}

// =========================
// عدد النجوم الافتراضي حسب الندرة (مكافآت الدومين)
// =========================

const DOMAIN_STARS_BY_RARITY = {

    Rare: 3,
    Epic: 4,
    Legendary: 5,
    Mythical: 6

}

// =========================
// مكافآت الدومين: تُسحب من قائمة المعدات الجاهزة (domainEquipments)
// بدلاً من توليد معدات جديدة بالنظام الإجرائي.
// يتم اختيار قطعة عشوائية من نفس الندرة والنوع (equipType) الخاص بالدومين
// ثم تُحدد قيم الستاتس عشوائياً ضمن المجال (min-max) المعرف لكل قطعة
// =========================

function createDomainEquipmentItem(rarity, type) {

    const pool = domainEquipments.filter(item => {

        if (item.rarity !== rarity) return false
        if (type && item.type !== type) return false

        return true

    })

    if (!pool.length) {

        return null

    }

    const template = choose(pool)

    const stats = {}

    for (const stat in template.stats) {

        const range = template.stats[stat]

        stats[stat] = Array.isArray(range)
            ? random(range[0], range[1])
            : range

    }

    return {

        id: template.id,
        name: template.name,
        rarity: template.rarity,
        type: template.type,

        stats,
        affixes: [],

        stars: DOMAIN_STARS_BY_RARITY[rarity] || 1,

        quality: "Normal",
        qualityBonus: 0,

        level: 0

    }

}

// =========================
// توليد مكافأة دومين (ندرة + نوع) من قائمة المعدات الجاهزة
// =========================

function generateDomainEquipment(rarity, type) {

    return createDomainEquipmentItem(rarity, type)

}

// =========================
// Equip Item
// المعدات الآن تُجهَّز لشخصية معينة (character) وليس للحساب كامل
// character لازم يكون العنصر الموجود فعلياً داخل player.characters
// =========================

function equipItem(player, character, itemUid) {

    if (!character) {

        return {

            success: false,

            message: "❌ الشخصية غير موجودة."

        }

    }

    const index = player.inventory.findIndex(

        item => item.uid === itemUid

    )

    if (index === -1) {

        return {

            success: false,

            message: "المعدة غير موجودة."

        }

    }

    const item = player.inventory[index]

    const slot = item.type

    const equipment = ensureEquipmentSlots(character)

    // إذا كانت هذه الشخصية بالذات لابسة نفس السلوت فعلاً
    // نرجع القطعة القديمة للحقيبة أولاً (سواب تلقائي)
    if (equipment[slot]) {

        player.inventory.push(

            equipment[slot]

        )

    }

    equipment[slot] = item

    player.inventory.splice(index, 1)

    if (player.markModified) {

        player.markModified('characters')
        player.markModified('inventory')

    }

    return {

        success: true,

        item,

        character

    }

}

// =========================
// Unequip Item
// =========================

function unequipItem(player, character, slot) {

    if (!character) {

        return {

            success: false,

            message: "❌ الشخصية غير موجودة."

        }

    }

    const equipment = ensureEquipmentSlots(character)

    if (!equipment[slot]) {

        return {

            success: false,

            message: "لا يوجد عنصر مجهز."

        }

    }

    if (

        player.inventory.length >=

        player.maxInventory

    ) {

        return {

            success: false,

            message: "الحقيبة ممتلئة."

        }

    }

    player.inventory.push(

        equipment[slot]

    )

    equipment[slot] = null

    if (player.markModified) {

        player.markModified('characters')
        player.markModified('inventory')

    }

    return {

        success: true

    }

}
// =========================
// Calculate Equipment Stats
// الآن يحسب البونص الخاص بشخصية واحدة فقط (مو كل الحساب)
// =========================

function calculateEquipmentStats(character) {

    const bonus = {

        attack: 0,
        defense: 0,
        hp: 0,

        critRate: 0,
        critDamage: 0,

        dodge: 0,
        accuracy: 0,

        shield: 0,
        lifesteal: 0,

        reflect: 0,
        bossDamage: 0

    }

    if (!character) {

        return bonus

    }

    const equipment = ensureEquipmentSlots(character)

    const slots = [

        equipment.weapon,
        equipment.armor,
        equipment.accessory

    ]

    for (const item of slots) {

        if (!item) continue

        // Base Stats
        for (const stat in item.stats) {

            if (bonus[stat] == null)

                bonus[stat] = 0

            bonus[stat] += item.stats[stat]

        }

        // Affixes
        if (item.affixes) {

            for (const affix of item.affixes) {

                if (bonus[affix.type] == null)

                    bonus[affix.type] = 0

                bonus[affix.type] += affix.value

            }

        }

    }

    return bonus

}

// =========================
// Calculate Equipment Stats لفريق كامل
// يُستخدم بالأنظمة اللي تعتمد فريق (مضاربة / قتال / دومين)
// يجمع بونص معدات كل شخصية بالفريق مع بعض
// =========================

function calculateTeamEquipmentStats(characters) {

    const total = {

        attack: 0,
        defense: 0,
        hp: 0,

        critRate: 0,
        critDamage: 0,

        dodge: 0,
        accuracy: 0,

        shield: 0,
        lifesteal: 0,

        reflect: 0,
        bossDamage: 0

    }

    if (!characters || !characters.length) {

        return total

    }

    for (const character of characters) {

        const bonus = calculateEquipmentStats(character)

        for (const stat in bonus) {

            if (total[stat] == null)

                total[stat] = 0

            total[stat] += bonus[stat]

        }

    }

    return total

}

// =========================
// Sell Equipment
// =========================

function sellEquipment(player, uid) {

    const index = player.inventory.findIndex(

        item => item.uid === uid

    )

    if (index === -1) {

        return {

            success: false,

            message: "المعدة غير موجودة."

        }

    }

    const item = player.inventory[index]

    const price = item.sellPrice || 5000

    player.money += price

    player.inventory.splice(index, 1)

    return {

        success: true,

        gold: price,

        item

    }

}

// =========================
// Remove Equipment
// =========================

function removeEquipment(player, uid) {

    const index = player.inventory.findIndex(

        item => item.uid === uid

    )

    if (index === -1) {

        return false

    }

    player.inventory.splice(index, 1)

    return true

}

// =========================
// Exports
// =========================

module.exports = {

    openEquipmentBox,

    generateEquipmentByRarity,
    generateDomainEquipment,

    equipItem,

    unequipItem,

    calculateEquipmentStats,

    calculateTeamEquipmentStats,

    sellEquipment,

    removeEquipment,

    ensureEquipmentSlots

}
