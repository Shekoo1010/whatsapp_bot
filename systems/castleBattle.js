// ⚔️ محرك معارك القلاع — يبني الوحدات من الشخصيات بنفس عوامل .هجوم/.مضاربة
// (قوة الشخصية + المعدات/الإيكو + السلاح المركّب + الحرج + امتصاص الحياة + الرفيق)
// ويحاكي الغارة جولات بين فريق المهاجم وفريق دفاع الخصم ثم المباني.

let useEXAbilities = null
try { useEXAbilities = require('../utils/useEXAbilities') } catch (e) { useEXAbilities = null }

// =========================
// ⚙️ الإعدادات
// =========================
const HP_PER_POWER = 10        // دم الشخصية = قوتها × هذا الرقم (الدم عندك على مستوى اللاعب مو الشخصية)
const MILITIA_FACTOR = 0.7     // قوة الحراس التلقائيين (لو ما حدد المدافع فريق دفاع)
const MAX_ROUNDS = 40          // أقصى عدد جولات للمعركة
const STRUCT_HP_FACTOR = 1.5   // دم المباني = نسبة من مجموع دم المدافعين (كل ما زادت صعب النجمة الثالثة)
const HALL_PCT = 50            // نسبة الدمار اللي تُعتبر تدمير القاعة (نجمتين)
const MAX_REDUCTION = 80       // أقصى تخفيض ضرر % من الدفاع/الدب
const MAX_REFLECT = 50         // أقصى نسبة عكس ضرر %
const MAX_OMEGA_PER_SQUAD = 1  // أقصى عدد أوميقا Ω بالفريق الواحد (هجوم أو دفاع)

// =========================
// 🧮 أدوات
// =========================
// نفس نظام index.js: فايض الحرج فوق 100% يتحول ضرر حرج إضافي
function rollCrit(critRate, critDamage) {
    const rate = critRate || 0
    const overflow = Math.max(0, rate - 100)
    const effRate = Math.min(100, Math.max(0, rate))
    const effDmg = (critDamage || 0) + overflow
    const isCrit = Math.random() * 100 < effRate
    return isCrit ? 1 + effDmg / 100 : 1
}

function gearBonus(player, ch, deps) {
    let eq = {}
    let wp = {}
    try { eq = deps.equipmentSystem.calculateEquipmentStats(ch) || {} } catch (e) { eq = {} }
    try { wp = deps.getWeaponBonusForCharacter(player, ch) || {} } catch (e) { wp = {} }
    const out = {}
    for (const k of new Set([...Object.keys(eq), ...Object.keys(wp)])) {
        out[k] = (eq[k] || 0) + (wp[k] || 0)
    }
    return out
}

function companionBonus(player, key, deps) {
    const c = player && player.companion
    if (!c || c.key !== key || (c.level || 0) < 1) return 0
    try { return deps.companionsData.getCompanionBonus(key, c.level) || 0 } catch (e) { return 0 }
}

// 🌌 أوميقا Ω = تطور مستوى 7 (نفس getCharacterRank بـ index.js)
const isOmega = ch => !!ch && (ch.evolutionLevel || 0) >= 7

// يبقي أول أوميقا بس ويشيل الباقي (حماية لو الفريق انحفظ قبل القاعدة)
function limitOmega(list) {
    let n = 0
    return list.filter(ch => {
        if (!isOmega(ch)) return true
        n++
        return n <= MAX_OMEGA_PER_SQUAD
    })
}

// =========================
// 🧱 بناء الوحدات
// =========================
// opts: { factor (ضرب القوة والدم), hpMult (بونص دم الجدران) }
function buildUnit(player, ch, deps, opts) {
    const o = opts || {}
    const factor = o.factor || 1
    const hpMult = o.hpMult || 1
    const g = gearBonus(player, ch, deps)

    let atk = (ch.power || 0) + (g.attack || 0)
    if (g.attackPercent) atk = Math.floor(atk * (1 + g.attackPercent / 100))

    const lion = companionBonus(player, 'lion', deps)
    if (lion) atk = Math.floor(atk * (1 + lion / 100))

    // ✨ قدرات EX/أوميقا (نفس شرط .هجوم: تطور 1+ ولها قدرات) — تشتغل هجوماً ودفاعاً
    let ex = null
    const exFn = useEXAbilities || deps.useEXAbilities
    if (exFn && (ch.evolutionLevel || 0) >= 1 && Array.isArray(ch.urAbilities) && ch.urAbilities.length) {
        try { ex = exFn(ch) } catch (e) { ex = null }
    }
    if (ex && ex.attackBonus) atk = Math.floor(atk * (1 + ex.attackBonus / 100))

    let hp = Math.floor((ch.power || 0) * HP_PER_POWER)
    hp = Math.floor(hp * (1 + (g.hpPercent || 0) / 100)) + (g.hp || 0)

    if (ex && ex.shield) hp = Math.floor(hp * (1 + ex.shield / 100))   // 🔰 الدرع = دم إضافي %

    atk = Math.max(1, Math.floor(atk * factor))
    hp = Math.max(1, Math.floor(hp * factor * hpMult))

    return {
        name: ch.name,
        atk,
        maxHp: hp,
        hp,
        defFlat: g.defense || 0,
        defPct: (g.defensePercent || 0) + (ex ? ex.defenseBonus || 0 : 0),
        dodge: (g.dodge || 0) + (ex ? ex.dodge || 0 : 0),
        critRate: (g.critRate || 0) + companionBonus(player, 'tiger', deps) + (ex ? ex.critRate || 0 : 0),
        critDmg: (g.critDamage || 0) + (ex ? ex.critDamage || 0 : 0),
        lifesteal: (g.lifesteal || 0) + (ex ? ex.lifesteal || 0 : 0),
        reflect: (g.reflect || 0) + (ex ? ex.reflect || 0 : 0),
        reduce: companionBonus(player, 'bear', deps)   // 🐻 الدب يخفّف الضرر الوارد
    }
}

function buildAttackers(player, squadNames, deps) {
    const chars = player.characters || []
    return limitOmega(
        (squadNames || [])
            .map(n => chars.find(c => c && c.name === n))
            .filter(Boolean)
    ).map(ch => buildUnit(player, ch, deps))
}

function buildDefenders(defPlayer, defCastle, slots, wallPct, deps) {
    const chars = (defPlayer.characters || []).filter(Boolean)

    let squad = limitOmega(
        (defCastle.defenseSquad || [])
            .map(n => chars.find(c => c.name === n))
            .filter(Boolean)
    ).slice(0, slots)

    let militia = false

    // ما حدد فريق دفاع؟ حراس تلقائيين من أقوى شخصياته (بدون فريق الهجوم لو أمكن)
    if (!squad.length) {
        militia = true
        const atkSet = new Set(defCastle.attackSquad || [])
        let pool = chars.filter(c => !atkSet.has(c.name))
        if (!pool.length) pool = chars
        // حراس تلقائيين: أقوى الشخصيات بأوميقا وحدة كحد أقصى
        squad = limitOmega(pool.slice().sort((a, b) => (b.power || 0) - (a.power || 0))).slice(0, slots)
    }

    const units = squad.map(ch => buildUnit(defPlayer, ch, deps, {
        factor: militia ? MILITIA_FACTOR : 1,
        hpMult: 1 + (wallPct || 0) / 100
    }))

    const totalHp = units.reduce((s, u) => s + u.maxHp, 0)
    const structHp = Math.max(1000, Math.round(totalHp * STRUCT_HP_FACTOR))

    return { units, structHp, militia }
}

// =========================
// ⚔️ محاكاة الغارة
// =========================
function hit(a, d) {
    if (Math.random() * 100 < (d.dodge || 0)) return 0

    let dmg = a.atk * (0.9 + Math.random() * 0.2) * rollCrit(a.critRate, a.critDmg)
    dmg = Math.max(dmg * 0.1, dmg - (d.defFlat || 0))
    dmg *= 1 - Math.min(MAX_REDUCTION, d.defPct || 0) / 100
    dmg *= 1 - Math.min(MAX_REDUCTION, d.reduce || 0) / 100

    dmg = Math.max(1, Math.floor(dmg))
    if (a.lifesteal > 0) a.hp = Math.min(a.maxHp, a.hp + Math.floor(dmg * a.lifesteal / 100))
    if (d.reflect > 0 && a.hp > 0) a.hp -= Math.floor(dmg * Math.min(MAX_REFLECT, d.reflect) / 100)
    return dmg
}

const alive = list => list.filter(u => u.hp > 0)
const pick = list => list[Math.floor(Math.random() * list.length)]

function simulateRaid(atkIn, defIn, structHp) {
    const atk = atkIn.map(u => Object.assign({}, u))
    const def = defIn.map(u => Object.assign({}, u))

    let structDmg = 0
    let rounds = 0

    while (rounds < MAX_ROUNDS && alive(atk).length && structDmg < structHp) {
        rounds++

        const actA = alive(atk)
        const actD = alive(def)

        for (const a of actA) {
            if (a.hp <= 0) continue
            const targets = alive(def)
            if (targets.length) {
                const d = pick(targets)
                d.hp -= hit(a, d)
            } else {
                // المدافعين سقطوا → الضرب على المباني (بدون دفاع)
                structDmg += hit(a, { dodge: 0, defFlat: 0, defPct: 0, reduce: 0 })
            }
        }

        for (const d of actD) {
            if (d.hp <= 0 && !actD.includes(d)) continue
            const targets = alive(atk)
            if (!targets.length) break
            const a = pick(targets)
            a.hp -= hit(d, a)
        }
    }

    const defTotal = def.length
    const defDefeated = def.filter(u => u.hp <= 0).length
    const allDown = defDefeated === defTotal

    const structPct = allDown
        ? Math.min(100, Math.round((structDmg / Math.max(1, structHp)) * 100))
        : 0
    const hallDestroyed = allDown && structPct >= HALL_PCT

    let stars = 0
    if (allDown) stars = structPct >= 100 ? 3 : hallDestroyed ? 2 : 1

    return {
        stars,
        defTotal,
        defDefeated,
        hallDestroyed,
        structPct,
        rounds,
        atkTotal: atk.length,
        atkAlive: alive(atk).length,
        attackers: atk.map(u => ({
            name: u.name,
            hpPct: Math.max(0, Math.round((Math.max(0, u.hp) / u.maxHp) * 100))
        }))
    }
}

module.exports = { buildUnit, buildAttackers, buildDefenders, simulateRaid, isOmega, MAX_OMEGA_PER_SQUAD }
