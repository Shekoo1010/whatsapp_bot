// =====================================================================
// systems/coopGear.js
// حساب ضرر هجوم الكو اوب بنفس منطق هجوم الزعيم (bossAttackSystem.attack):
// قوة الشخصية + المعدات (الإيكوز) + السلاح + الرفيق + الحرج + قدرات EX
// + بونصات اللاعب + بونص كتاب المجموعة + قدرات الهجوم.
// الفرق الوحيد: الهدف هو زعيم الكو اوب، فلا كولداون ولا قدرات زعيم الشركة هنا.
// تُحقن الاعتمادات مرة واحدة من index.js عبر setDeps(...)
// =====================================================================

let deps = null

function setDeps(d) {
    deps = d
}

function ready() {
    return !!deps
}

// يجد الشخصية الأصلية عند اللاعب (نسخة الكو اوب لا تحمل المعدات)
function findSource(me, snap) {
    const list = me.characters || []
    if (Number.isInteger(snap.charIndex) && list[snap.charIndex] && list[snap.charIndex].name === snap.name) {
        return list[snap.charIndex]
    }
    return list.find(c => c.name === snap.name) || null
}

// يرجع { damage, critical, heal, notes } أو null إذا لم تُحقن الاعتمادات
async function calcHit(userId, snap) {
    if (!deps) return null

    const {
        Player, equipmentSystem, getWeaponBonusForCharacter, companionsData,
        rollCrit, useEXAbilities, useAttackAbilities
    } = deps

    const me = await Player.findOne({ userId })
        .select('-giftInbox -giftLog -giftOpKeys -galleryLikes -gallery -domainTeams -inventory')

    if (!me) return null

    const strongest = findSource(me, snap)
    if (!strongest) return null

    let damage = strongest.power
    const notes = []
    let critical = false

    const equipBonus = equipmentSystem.calculateEquipmentStats(strongest)
    const weaponBonus = getWeaponBonusForCharacter(me, strongest)

    const gear = {}
    for (const key of new Set([...Object.keys(equipBonus), ...Object.keys(weaponBonus)])) {
        gear[key] = (equipBonus[key] || 0) + (weaponBonus[key] || 0)
    }

    damage += (gear.attack || 0)

    if ((gear.attackPercent || 0) > 0) {
        damage = Math.floor(damage * (1 + gear.attackPercent / 100))
    }

    // 🐯 رفيق النمر
    let tigerCrit = 0
    if (me.companion && me.companion.key === 'tiger' && (me.companion.level || 0) >= 1) {
        tigerCrit = companionsData.getCompanionBonus('tiger', me.companion.level)
    }

    const gearCrit = rollCrit((gear.critRate || 0) + tigerCrit, gear.critDamage || 0)
    if (gearCrit.isCrit) {
        damage = Math.floor(damage * gearCrit.multiplier)
        critical = true
    }

    // 🦁 رفيق الأسد
    if (me.companion && me.companion.key === 'lion' && (me.companion.level || 0) >= 1) {
        const lion = companionsData.getCompanionBonus('lion', me.companion.level)
        damage = Math.floor(damage * (1 + lion / 100))
    }

    // ❤️ امتصاص الحياة (يُشفي الشخصية المقاتلة داخل الكو اوب)
    let heal = 0
    if ((gear.lifesteal || 0) > 0) {
        heal += Math.floor(damage * gear.lifesteal / 100)
    }

    // ⚔️ قدرات EX + بونصات اللاعب
    if (strongest.evolutionLevel >= 1 && strongest.urAbilities && strongest.urAbilities.length > 0) {
        const ex = useEXAbilities(strongest)

        damage = Math.floor(damage * (1 + ex.attackBonus / 100))
        damage = Math.floor(damage * (1 + ex.bossDamage / 100))
        damage = Math.floor(damage * (1 + ((me.attackBonus || 0) / 100)))
        damage = Math.floor(damage * (1 + (((me.bossDamageBonus || 0) + (gear.bossDamage || 0)) / 100)))
        damage = Math.floor(damage * (1 + ((me.damageBonus || 0) / 100)))

        const exCrit = rollCrit(ex.critRate, ex.critDamage)
        if (exCrit.isCrit) {
            damage = Math.floor(damage * exCrit.multiplier)
            critical = true
        }

        if (ex.lifesteal > 0) heal += Math.floor(damage * ex.lifesteal / 100)

        for (const a of (ex.abilitiesUsed || [])) notes.push(a.name)
    }

    // 📖 بونص كتاب المجموعة
    try { damage = Math.floor(damage * require('./siteCodexBook').bonusMult(me.userId, 'boss')) } catch (e) {}

    const result = useAttackAbilities({ player: me, character: strongest, damage })
    damage = result.damage

    return { damage: Math.max(0, Math.floor(damage)), critical, heal, notes }
}

module.exports = { setDeps, ready, calcHit, findSource }
