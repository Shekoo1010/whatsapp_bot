// =========================
// حساب ضرر اللاعب — نفس معادلة ضرب الزعيم (bossAttackSystem / combatStats)
// لكن للشخصية الحيّة الحالية فقط (أول شخصية حيّة — نفس التي يضربها الزعيم):
//   power + هجوم(معدات+سلاح) → × هجوم% → [كريت موحّد] → × أسد
//   → (فقط لو الشخصية مطوّرة وعندها EX): × هجوم EX → × ضرر زعيم EX
//        → × attackBonus → × (bossDamageBonus + ضرر زعيم المعدات) → × damageBonus
// الشخصية غير المطوّرة (SSS أو أقل) تضرب بناءً على power (+ معداتها وسلاحها) فقط.
// إذا ماتت تدخل التي بعدها وتضرب بمعادلتها هي وحدها (ليس مجموع الشخصيات).
// =========================

let equipmentSystem = null
let companionsData = null
let useEXAbilities = null
try { equipmentSystem = require('./equipmentSystem') } catch (e) { equipmentSystem = null }
try { companionsData = require('./companionsData') } catch (e) { companionsData = null }
try { useEXAbilities = require('../utils/useEXAbilities') } catch (e) { useEXAbilities = null }
let useAttackAbilities = null
try { useAttackAbilities = require('./useAttackAbilities') } catch (e) { useAttackAbilities = null }

// ⚠️ لازم تطابق bossAttackSystem.js
const BOSS_DAMAGE_EFFECT = 1.5
const BOSS_EX_ATTACK_WEIGHT = 0.5

const n0 = v => Number(v) || 0

// نفس getWeaponBonusForCharacter بـ index.js
function weaponBonusFor(player, character){

    const out = {
        attack: 0, attackPercent: 0, critRate: 0, critDamage: 0,
        bossDamage: 0, lifesteal: 0
    }

    const inv = player && player.weaponsInventory

    if(!inv || typeof inv.find !== 'function' || !character) return out

    const w = inv.find(x => x && x.equippedTo === character.name)

    if(!w) return out

    out.attack += n0(w.baseAtk)

    if(
        w.subStatType &&
        Object.prototype.hasOwnProperty.call(out, w.subStatType)
    ){
        out[w.subStatType] += n0(w.subStatValue)
    }

    return out
}

// نفس rollCrit بـ index.js (الفايض فوق 100% يتحول ضرر كريت)
function rollCrit(rate, dmg){

    const overflow = Math.max(0, n0(rate) - 100)
    const chance = Math.min(100, Math.max(0, n0(rate)))
    const isCrit = Math.random() * 100 < chance

    return {
        isCrit,
        multiplier: isCrit ? (1 + (n0(dmg) + overflow) / 100) : 1
    }
}

// ضرر شخصية واحدة — يرجع { damage, crit }
function characterDamage(player, character, comp){

    let damage = n0(character.power)

    try {

        let equip = {}

        if(equipmentSystem){
            equip = equipmentSystem.calculateEquipmentStats(character) || {}
        }

        const wp = weaponBonusFor(player, character)

        const gear = {}

        for(const k of new Set([...Object.keys(equip), ...Object.keys(wp)])){
            gear[k] = n0(equip[k]) + n0(wp[k])
        }

        damage += n0(gear.attack)

        if(n0(gear.attackPercent) > 0){
            damage = Math.floor(damage * (1 + gear.attackPercent / 100))
        }

        const hasEX =
            n0(character.evolutionLevel) >= 1 &&
            Array.isArray(character.urAbilities) &&
            character.urAbilities.length > 0 &&
            !!useEXAbilities

        const ex = hasEX ? useEXAbilities(character) : null

        // 🎯 كريت موحّد: رمية واحدة بمجموع المعدات + السلاح + النمر + EX
        const totalCrit = rollCrit(
            n0(gear.critRate) + comp.tiger + (ex ? n0(ex.critRate) : 0),
            n0(gear.critDamage) + comp.silver + (ex ? n0(ex.critDamage) : 0)
        )

        if(totalCrit.isCrit){
            damage = Math.floor(damage * totalCrit.multiplier)
        }

        // 🦁 رفيق الأسد
        if(comp.lion > 0){
            damage = Math.floor(damage * (1 + comp.lion / 100))
        }

        if(ex){

            damage = Math.floor(damage * (1 + (n0(ex.attackBonus) * BOSS_EX_ATTACK_WEIGHT) / 100))
            damage = Math.floor(damage * (1 + (n0(ex.bossDamage) * BOSS_DAMAGE_EFFECT) / 100))
            damage = Math.floor(damage * (1 + n0(player.attackBonus) / 100))
            damage = Math.floor(
                damage * (1 + (((n0(player.bossDamageBonus)) + n0(gear.bossDamage)) * BOSS_DAMAGE_EFFECT) / 100)
            )
            damage = Math.floor(damage * (1 + n0(player.damageBonus) / 100))

        }

        // ✨ قدرات اللاعب الدائمة (نفس الزعيم: useAttackAbilities)
        let playerText = ''

        if(useAttackAbilities){

            const sk = useAttackAbilities({ player, character, damage })

            damage = sk.damage

            playerText = sk.playerText || ''

        }

        return { damage, crit: totalCrit.isCrit, playerText }

    } catch(e){

        // أي خلل بحساب شخصية = نكتفي بقوتها حتى لا يتعطل الهجوم
        return { damage: n0(character.power), crit: false, playerText: '' }

    }

}

function calculatePlayerDamage(player){

    let totalDamage = 0
    let critDamageTotal = 0

    let crit = false
    let dodge = false

    let abilityText = ''

    if(
        !player.characters ||
        !player.characters.length
    ){

        return {

            damage:0,

            crit:false,

            dodge:false,

            abilityText:''

        }

    }

    // 🐾 بونصات الرفيق (مرة واحدة للاعب)
    const comp = { tiger: 0, lion: 0, silver: 0 }

    try {

        const c = player.companion

        if(companionsData && c && c.key && n0(c.level) >= 1){

            if(c.key === 'tiger') comp.tiger = n0(companionsData.getCompanionBonus('tiger', c.level))
            if(c.key === 'lion') comp.lion = n0(companionsData.getCompanionBonus('lion', c.level))

        }

        if(companionsData && companionsData.getSilverCritDamage){
            comp.silver = n0(companionsData.getSilverCritDamage(player))
        }

    } catch(e){}

    for(
        const character of player.characters
    ){

        if(character.dead)
            continue

        if(
            character.currentHp !== undefined &&
            character.currentHp <= 0
        ){
            continue
        }

        const r = characterDamage(player, character, comp)

        totalDamage = r.damage

        abilityText += r.playerText || ''

        critDamageTotal = r.crit ? r.damage : 0

        // شخصية واحدة فقط تضرب: أول شخصية حيّة
        break

    }

    // 🔥 ضربة حرجة لو نجحت رمية الشخصية
    if(totalDamage > 0 && critDamageTotal > 0){

        crit = true

        abilityText +=
`🔥 ضربة حرجة
`

    }

    // =====================
    // دودج
    // =====================

    const dodgeChance =
        (player.dodge || 0) +
        (player.dodgeBonus || 0)

    if (
        Math.random() * 100 <=
        dodgeChance
    ) {

        dodge = true

    }

    return {

        damage:
            Math.floor(
                totalDamage
            ),

        crit,

        dodge,

        abilityText

    }

}

// =========================
// EXPORTS
// =========================

module.exports = {

    calculatePlayerDamage

}
