// =====================================================================
// systems/combatStats.js
// 📊 مصدر واحد لإحصائيات الهجوم على الزعيم — يطابق معادلة `.هجوم` حرفياً
// (index.js حوالي سطر 10880–11040). يُستخدم من:
//   • أمر .احصائيات_كاملة (index.js)
//   • تبويب "الإحصائيات" بنافذة تفاصيل الشخصية (systems/characterSite.js)
// أي تعديل على معادلة ضرب الزعيم يُعدَّل هنا أيضاً ليبقى المعروض = الفعلي.
//
// ترتيب الحساب الفعلي (بنفس الـ floor بكل خطوة):
//   power + هجوم(معدات+سلاح)  → × هجوم%  → [رمية كريت المعدات]
//   → × بونص الأسد
//   → (فقط لو الشخصية فيها EX): × هجوم EX → × ضرر زعيم EX → × attackBonus
//        → × (bossDamageBonus + ضرر زعيم المعدات) → × damageBonus → [رمية كريت EX]
//   → × مضاعفات specialAbilities (لكل الشخصيات)
// =====================================================================

const equipmentSystem = require('./equipmentSystem')
const companionsData = require('./companionsData')
const useAttackAbilities = require('./useAttackAbilities')
const useEXAbilities = require('../utils/useEXAbilities')

const num = v => Number(v) || 0
const r1 = v => Math.round(num(v) * 10) / 10

// نفس getWeaponBonusForCharacter بـ index.js
function weaponBonus(player, character) {
    const out = {
        attack: 0, attackPercent: 0, hp: 0, hpPercent: 0, defense: 0,
        critRate: 0, critDamage: 0, dodge: 0, accuracy: 0,
        lifesteal: 0, reflect: 0, bossDamage: 0
    }
    if (!player || !character || !Array.isArray(player.weaponsInventory)) return { bonus: out, weapon: null }
    const w = player.weaponsInventory.find(x => x && x.equippedTo === character.name)
    if (!w) return { bonus: out, weapon: null }
    out.attack += w.baseAtk || 0
    if (w.subStatType && Object.prototype.hasOwnProperty.call(out, w.subStatType)) {
        out[w.subStatType] += w.subStatValue || 0
    }
    return { bonus: out, weapon: w }
}

// نفس rollCrit بـ index.js (الفايض فوق 100% يتحول ضرر كريت)
function critInfo(rate, dmg) {
    const rawRate = num(rate)
    const baseDmg = num(dmg)
    const overflow = Math.max(0, rawRate - 100)
    const chance = Math.min(100, Math.max(0, rawRate))
    const damage = baseDmg + overflow
    return { rawRate, baseDmg, overflow, chance, damage, mult: 1 + damage / 100 }
}

function computeCombatStats(player, character) {
    player = player || {}
    character = character || {}

    let equip = {}
    try { equip = equipmentSystem.calculateEquipmentStats(character) || {} } catch (_) { equip = {} }
    const { bonus: wp, weapon } = weaponBonus(player, character)

    const gear = {}
    for (const k of new Set([...Object.keys(equip), ...Object.keys(wp)])) {
        gear[k] = num(equip[k]) + num(wp[k])
    }

    // 🐾 الرفيق
    let compKey = null
    let compVal = 0
    if (player.companion && player.companion.key && num(player.companion.level) >= 1) {
        compKey = player.companion.key
        try { compVal = num(companionsData.getCompanionBonus(compKey, player.companion.level)) } catch (_) { compVal = 0 }
    }
    const tiger = compKey === 'tiger' ? compVal : 0
    const lion = compKey === 'lion' ? compVal : 0
    const bear = compKey === 'bear' ? compVal : 0

    // ✨ EX (نفس شرط index.js)
    const hasEX = num(character.evolutionLevel) >= 1 &&
        Array.isArray(character.urAbilities) && character.urAbilities.length > 0
    const exRaw = hasEX ? useEXAbilities(character) : null
    const ex = exRaw || {
        attackBonus: 0, bossDamage: 0, critRate: 0, critDamage: 0,
        lifesteal: 0, shield: 0, dodge: 0, reflect: 0, defenseBonus: 0
    }

    const pAtk = num(player.attackBonus)
    const pBoss = num(player.bossDamageBonus)
    const pDmg = num(player.damageBonus)
    const power = num(character.power)

    const gearCrit = critInfo(num(gear.critRate) + tiger, gear.critDamage)
    const exCrit = hasEX ? critInfo(ex.critRate, ex.critDamage) : critInfo(0, 0)

    const skillPlayer = { specialAbilities: player.specialAbilities }

    // 🧮 ضربة واحدة بنفس خطوات المعادلة الفعلية (gc/ec = هل كرّت الرمية)
    function hit(gc, ec) {
        let d = power + num(gear.attack)
        if (num(gear.attackPercent) > 0) d = Math.floor(d * (1 + gear.attackPercent / 100))
        if (gc) d = Math.floor(d * gearCrit.mult)
        if (compKey === 'lion') d = Math.floor(d * (1 + lion / 100))
        if (hasEX) {
            d = Math.floor(d * (1 + ex.attackBonus / 100))
            d = Math.floor(d * (1 + ex.bossDamage / 100))
            d = Math.floor(d * (1 + pAtk / 100))
            d = Math.floor(d * (1 + (pBoss + num(gear.bossDamage)) / 100))
            d = Math.floor(d * (1 + pDmg / 100))
            if (ec) d = Math.floor(d * exCrit.mult)
        }
        return useAttackAbilities({ player: skillPlayer, character, damage: d }).damage
    }

    const pG = gearCrit.chance / 100
    const pE = hasEX ? exCrit.chance / 100 : 0
    const min = hit(false, false)
    const max = hit(pG > 0, pE > 0)
    let avg = 0
    for (const [gc, pg] of [[false, 1 - pG], [true, pG]]) {
        for (const [ec, pe] of [[false, 1 - pE], [true, pE]]) {
            const p = pg * pe
            if (p > 0) avg += p * hit(gc, ec)
        }
    }
    avg = Math.floor(avg)

    // ⚔️ رقم "الهجوم" (قبل الكريت وضرر الزعيم)
    let atk = power + num(gear.attack)
    if (num(gear.attackPercent) > 0) atk = Math.floor(atk * (1 + gear.attackPercent / 100))
    if (hasEX) {
        atk = Math.floor(atk * (1 + ex.attackBonus / 100))
        atk = Math.floor(atk * (1 + pAtk / 100))
    }

    // 👹 ضرر الزعيم الفعلي (مضاعف إجمالي)
    const bossMult = (1 + lion / 100) *
        (hasEX ? (1 + ex.bossDamage / 100) * (1 + (pBoss + num(gear.bossDamage)) / 100) : 1)

    // ✨ مضاعفات قدرات اللاعب (specialAbilities)
    const probe = useAttackAbilities({ player: skillPlayer, character, damage: 1000000 })
    const skillMult = probe.damage / 1000000
    const skillNames = String(probe.playerText || '').split('\n').map(s => s.trim()).filter(Boolean)

    // 🛡️ دعم/دفاع — فقط اللي يشتغل فعلاً بقتال الزعيم
    const sustain = {
        lifesteal: num(gear.lifesteal) + ex.lifesteal,
        shield: ex.shield, dodge: ex.dodge, reflect: ex.reflect
    }

    // ستات موجودة بالمعدات/السلاح لكنها لا تدخل بمعادلة ضرب الزعيم
    const offKeys = ['defense', 'defensePercent', 'hp', 'hpPercent', 'dodge', 'accuracy', 'shield', 'reflect']
    const unused = {}
    for (const k of offKeys) if (num(gear[k])) unused[k] = r1(gear[k])

    return {
        hasEX,
        power,
        atk,
        gear: {
            attack: num(gear.attack), attackPercent: num(gear.attackPercent),
            weaponAtk: weapon ? num(weapon.baseAtk) : 0,
            bossDamage: num(gear.bossDamage)
        },
        weaponName: weapon ? (weapon.name || null) : null,
        ex: {
            attackBonus: ex.attackBonus, bossDamage: ex.bossDamage,
            critRate: ex.critRate, critDamage: ex.critDamage,
            lifesteal: ex.lifesteal, shield: ex.shield, dodge: ex.dodge, reflect: ex.reflect,
            names: hasEX ? (character.urAbilities || []).map(a => a && a.name).filter(Boolean) : []
        },
        player: { attackBonus: pAtk, bossDamageBonus: pBoss, damageBonus: pDmg, active: hasEX },
        companion: compKey ? { key: compKey, level: num(player.companion.level), value: compVal } : null,
        companionBonus: { tiger, lion, bear },
        crit: {
            gear: gearCrit,
            ex: hasEX ? exCrit : null
        },
        bossMult,
        bossDamagePct: r1((bossMult - 1) * 100),
        bossParts: {
            gear: num(gear.bossDamage), level: pBoss, lion, ex: ex.bossDamage
        },
        skills: { mult: skillMult, names: skillNames },
        hit: { min, avg, max },
        sustain,
        hpBonusPct: bear,
        unused
    }
}

module.exports = { computeCombatStats, critInfo }
