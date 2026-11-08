const SKILLS = {

bossShield() {

return {

type: "shield",

value: 300000,

message: "🛡️ البوس كوّن درعاً بقوة 300,000!"

}

},

massAttack() {

return {

type: "aoe",

damage: 25000,

message: "💥 البوس هاجم جميع الشخصيات!"

}

},

rageMode() {

return {

type: "buff",

damageMultiplier: 1.5,

message: "🔥 دخل البوس في وضع Rage! زاد ضرره 50%."

}

},

regeneration() {

return {

type: "heal",

percent: 5,

message: "💚 استعاد البوس 5% من صحته."

}

},

counterSlash() {

return {

type: "counter",

chance: 30,

damage: 20000,

message: "⚔️ البوس رد الهجوم!"

}

},

devilLaser() {

return {

type: "single",

damage: 45000,

message: "☄️ Devil Laser!"

}

},

meteor() {

return {

type: "aoe",

damage: 18000,

message: "🌠 Meteor Shower!"

}

},

sealPower() {

return {

type: "debuff",

damageReduction: 30,

duration: 2,

message: "⛓️ تم ختم قوة الشخصية!"

}

},

chaosShield() {

return {

type: "shield",

value: 500000,

message: "🔷 Chaos Shield!"

}

},

thunderStorm() {

return {

type: "aoe",

damage: 30000,

message: "⚡ Thunder Storm!"

}

},

freeze() {

return {

type: "freeze",

duration: 1,

message: "❄️ تجمدت الشخصية!"

}

},

fear() {

return {

type: "fear",

duration: 1,

message: "😨 الشخصية خائفة!"

}

},

poison() {

return {

type: "poison",

damage: 10000,

duration: 3,

message: "☠️ أصيبت الشخصية بالسم."

}

},

execute() {

return {

type: "execute",

hpPercent: 20,

message: "☠️ تم القضاء على الشخصية!"

}

},

reflect() {

return {

type: "reflect",

percent: 25,

message: "🪞 انعكس جزء من الضرر."

}

}

}


// =========================
// تطبيق المهارات على حالة الـ Co-Op
// (هذي الدوال كانت ناقصة: coopBattle يستدعي useSkill ولم تكن موجودة)
// =========================

// =========================
// إعدادات المهارات الجديدة (عدّل الأرقام من هنا)
// =========================

const FEAR_DAMAGE_MULT = 0.5   // الخوف: ضربة الشخصية الجاية بنص القوة
const REFLECT_ROUNDS = 2       // انعكاس الضرر: يبقى لين نهاية الجولة الجاية (جولتين عدّ)

// نحوّل عنصر الديبف/البف إلى object عادي (يشتغل سواء كان subdoc أو object)
function plain(d) {

    return (d && typeof d.toObject === 'function') ? d.toObject() : d

}

// ديبفات الشخصية (نكتبها دايماً كمصفوفة جديدة عشان mongoose يلتقط التغيير)
function readDebuffs(character) {

    const list = character && character.debuffs

    if (!list) return []

    return Array.from(list)
        .map(plain)
        .filter(d => d && typeof d === 'object' && d.type)

}

function writeDebuffs(character, list) {

    character.debuffs = list

}

function addDebuff(character, entry) {

    // نفس الديبف ما يتكدّس: نجدّده بأطول مدة
    const list = readDebuffs(character).filter(d => d.type !== entry.type)

    const old = readDebuffs(character).find(d => d.type === entry.type)

    if (old && (old.duration || 0) > entry.duration) entry.duration = old.duration

    list.push(entry)

    writeDebuffs(character, list)

}

function liveCurrent(player) {

    if (!player || player.finished) return null

    const c = player.characters[player.currentCharacter]

    return (c && c.alive) ? c : null

}

function hasDebuff(player, type) {

    const c = liveCurrent(player)

    return !!c && readDebuffs(c).some(d => d.type === type)

}

function hitCharacter(character, amount) {

    amount = Math.floor(amount)

    if (character.shield > 0) {

        const absorbed = Math.min(amount, character.shield)

        character.shield -= absorbed

        amount -= absorbed

    }

    character.hp -= amount

    if (character.hp <= 0) {

        character.hp = 0

        character.alive = false

    }

    return amount

}

// الشخصية اللي ينضرب فيها اللاعب: الحالية إن كانت حية، وإلا أول شخصية حية
function targetCharacter(player) {

    const current = player.characters[player.currentCharacter]

    if (current && current.alive) return current

    return player.characters.find(c => c.alive) || null

}

// ينقل اللاعب لأول شخصية حية، أو ينهيه إذا سقطت كل شخصياته
function settle(player) {

    const current = player.characters[player.currentCharacter]

    if (current && current.alive) return

    const next = player.characters.findIndex(c => c.alive)

    if (next === -1) {

        player.finished = true

    } else {

        player.currentCharacter = next

    }

}

function apply(coop, skill, target) {

    const mult = coop.boss.rage ? 1.5 : 1

    switch (skill.type) {

        case 'shield':

            coop.boss.shield = (coop.boss.shield || 0) + skill.value

            return { ...skill }

        case 'heal': {

            const amount = Math.floor(coop.boss.maxHp * skill.percent / 100)

            coop.boss.hp = Math.min(coop.boss.maxHp, coop.boss.hp + amount)

            return { ...skill }

        }

        case 'buff':

            coop.boss.rage = true

            return { ...skill }

        case 'aoe': {

            // هجمة جماعية: لكل لاعب حي ضربة وحدة على شخصيته الحالية فقط
            // (لو ماتت تنتقل الضربات الجاية للشخصية اللي بعدها)
            const damage = Math.floor(skill.damage * mult)

            let fallen = 0

            for (const player of coop.players) {

                if (player.finished) continue

                const character = targetCharacter(player)

                if (character) {

                    hitCharacter(character, damage)

                    if (!character.alive) fallen++

                }

                settle(player)

            }

            let message = `${skill.message}
💔 -${damage.toLocaleString()} على الشخصية الحالية لكل لاعب`

            if (fallen) message += `
💀 سقطت ${fallen} شخصية`

            return { ...skill, message }

        }

        // ❄️ تجميد / 😨 خوف / ⛓️ ختم القوة / ☠️ سم — ديبفات على الشخصية الحالية للاعب صاحب الدور
        case 'freeze':
        case 'fear':
        case 'debuff':
        case 'poison': {

            const character = liveCurrent(target)

            if (!character) return null

            let entry
            let line

            if (skill.type === 'debuff') {

                entry = { type: 'seal', percent: skill.damageReduction, duration: skill.duration }
                line = `🎯 ${character.name}: -${skill.damageReduction}% ضرر لـ ${skill.duration} ضربات`

            } else if (skill.type === 'poison') {

                entry = { type: 'poison', damage: skill.damage, duration: skill.duration }
                line = `🎯 ${character.name}: -${skill.damage.toLocaleString()} كل دور لـ ${skill.duration} أدوار`

            } else if (skill.type === 'fear') {

                entry = { type: 'fear', duration: skill.duration }
                line = `🎯 ${character.name}: ضربتها الجاية بنص القوة`

            } else {

                entry = { type: 'freeze', duration: skill.duration }
                line = `🎯 ${character.name}: يضيع دورها الجاي`

            }

            addDebuff(character, entry)

            return { ...skill, message: `${skill.message}\n${line}` }

        }

        // 💀 إعدام: يقضي على الشخصية الحالية لو HP أقل من النسبة، وإلا ما ينفّذ (والزعيم يضرب عادي)
        case 'execute': {

            const character = liveCurrent(target)

            if (!character) return null

            if ((character.hp / (character.maxHp || 1)) * 100 > skill.hpPercent) return null

            character.hp = 0

            character.shield = 0

            character.alive = false

            settle(target)

            return { ...skill, message: `${skill.message}\n💀 ${character.name}` }

        }

        // 🪞 انعكاس: البوس ياخذ بف، وجزء من ضرر اللاعبين يرجع عليهم
        case 'reflect': {

            const buffs = Array.from(coop.boss.buffs || [])
                .map(plain)
                .filter(b => b && b.type && b.type !== 'reflect')

            buffs.push({ type: 'reflect', percent: skill.percent, duration: REFLECT_ROUNDS })

            coop.boss.buffs = buffs

            return {
                ...skill,
                message: `${skill.message}\n🪞 ${skill.percent}% من ضربات اللاعبين ترجع عليهم لمدة ${REFLECT_ROUNDS} جولات`
            }

        }

        case 'single':
        case 'counter': {

            if (!target || target.finished) return null

            const character = target.characters[target.currentCharacter]

            if (!character || !character.alive) return null

            const damage = hitCharacter(character, skill.damage * mult)

            settle(target)

            return {
                ...skill,
                message: `${skill.message}
💔 ${character.name}: -${damage.toLocaleString()}`
            }

        }

        default:

            return null

    }

}

// تنفيذ مهارة بالاسم (مثل 'devilLaser')
function cast(coop, skillName, target) {

    const make = SKILLS[skillName]

    if (typeof make !== 'function') return null

    return apply(coop, make(), target)

}

// الاستدعاء القديم: useSkill(coop, "aoe" | "rage" | "shield" | "heal" | "single")
const TYPE_TO_SKILL = {
    aoe: 'massAttack',
    rage: 'rageMode',
    shield: 'bossShield',
    heal: 'regeneration',
    single: 'devilLaser'
}

function useSkill(coop, type, target) {

    const name = TYPE_TO_SKILL[type]

    return (name && cast(coop, name, target)) || { message: '' }

}

// اختيار مهارة عشوائية حسب طور الزعيم (أثناء دور اللاعب — بدون هجمات جماعية)
// target = اللاعب صاحب الدور (نستخدمه عشان ما نكرر ديبف عليه، ولـ Execute)
function rollSkill(coop, target) {

    const phase = coop.boss.phase || 1

    const pool = ['devilLaser', 'counterSlash']

    if (!hasDebuff(target, 'poison')) pool.push('poison')

    if (!hasDebuff(target, 'fear')) pool.push('fear')

    if (phase >= 2) {

        pool.push('bossShield', 'regeneration')

        if (!hasDebuff(target, 'freeze')) pool.push('freeze')

        if (!hasDebuff(target, 'seal')) pool.push('sealPower')

        if (!readBossBuff(coop, 'reflect')) pool.push('reflect')

        // Execute: يدخل القائمة (بوزن مضاعف) بس لو الشخصية الحالية HP أقل من النسبة
        const c = liveCurrent(target)

        if (c && (c.hp / (c.maxHp || 1)) * 100 <= SKILLS.execute().hpPercent) {

            pool.push('execute', 'execute')

        }

    }

    if (phase >= 3) pool.push('chaosShield')

    return pool[Math.floor(Math.random() * pool.length)]

}

// الهجمة الجماعية اللي تنزل نهاية كل جولة (بعد ما يضرب الجميع) — تختلف حسب الطور
function rollGroupSkill(coop) {

    const phase = coop.boss.phase || 1

    const pool = ['meteor']

    if (phase >= 2) pool.push('massAttack')

    if (phase >= 3) pool.push('thunderStorm')

    return pool[Math.floor(Math.random() * pool.length)]

}

// =========================
// تأثيرات تشتغل أثناء القتال (يستدعيها coopBattle)
// =========================

function readBossBuff(coop, type) {

    return Array.from((coop.boss && coop.boss.buffs) || [])
        .map(plain)
        .find(b => b && b.type === type && (b.duration || 0) > 0) || null

}

// مضاعف ضرر الشخصية بسبب ختم القوة / الخوف
function damageMultiplier(character) {

    let m = 1

    for (const d of readDebuffs(character)) {

        if (d.type === 'seal') m *= 1 - (d.percent || 0) / 100

        if (d.type === 'fear') m *= FEAR_DAMAGE_MULT

    }

    return m

}

// بعد ما الشخصية تضرب: ينقص عدّاد ختم القوة / الخوف
function tickAttackDebuffs(character) {

    const list = readDebuffs(character)

    if (!list.some(d => d.type === 'seal' || d.type === 'fear')) return

    writeDebuffs(
        character,
        list
            .map(d => (d.type === 'seal' || d.type === 'fear') ? { ...d, duration: (d.duration || 0) - 1 } : d)
            .filter(d => !((d.type === 'seal' || d.type === 'fear') && d.duration <= 0))
    )

}

// ❄️ لو شخصية اللاعب متجمدة: يضيع دورها (ينقص التجميد) ويرجّع الرسالة، وإلا null
function consumeFreeze(player) {

    const character = liveCurrent(player)

    if (!character) return null

    const list = readDebuffs(character)

    if (!list.some(d => d.type === 'freeze')) return null

    writeDebuffs(
        character,
        list
            .map(d => d.type === 'freeze' ? { ...d, duration: (d.duration || 0) - 1 } : d)
            .filter(d => !(d.type === 'freeze' && d.duration <= 0))
    )

    return `❄️ ${character.name} متجمدة — ضاع دور ${player.name}!`

}

// ☠️ السم: يضرب الشخصية الحالية مباشرة (يتجاهل الدرع) وينقص مدته
function tickPoison(player) {

    const character = liveCurrent(player)

    if (!character) return null

    const list = readDebuffs(character)

    const poison = list.find(d => d.type === 'poison')

    if (!poison) return null

    const damage = Math.floor(poison.damage || 0)

    character.hp = Math.max(0, character.hp - damage)

    if (character.hp <= 0) character.alive = false

    writeDebuffs(
        character,
        list
            .map(d => d === poison ? { ...d, duration: (d.duration || 0) - 1 } : d)
            .filter(d => !(d.type === 'poison' && d.duration <= 0))
    )

    const died = !character.alive

    if (died) settle(player)

    return {
        died,
        message: `☠️ السم أضرّ ${character.name}: -${damage.toLocaleString()}${died ? '\n💀 سقطت الشخصية' : ''}`
    }

}

// 🪞 كم ينعكس من ضرر اللاعب (0 لو ما في انعكاس)
function reflectAmount(coop, damage) {

    const buff = readBossBuff(coop, 'reflect')

    if (!buff || !(damage > 0)) return 0

    return Math.floor(damage * (buff.percent || 0) / 100)

}

// 🪞 يضرب الشخصية الحالية للاعب بالضرر المنعكس
function applyReflectDamage(player, amount) {

    const character = liveCurrent(player)

    if (!character || !(amount > 0)) return null

    const damage = hitCharacter(character, amount)

    const died = !character.alive

    if (died) settle(player)

    return {
        died,
        message: `🪞 انعكس ${damage.toLocaleString()} من ضربتك على ${character.name}${died ? '\n💀 سقطت الشخصية' : ''}`
    }

}

// نهاية الجولة: ينقص مدة بف الزعيم (الانعكاس). يرجّع رسالة لو انتهى
function tickBossBuffs(coop) {

    const list = Array.from((coop.boss && coop.boss.buffs) || [])
        .map(plain)
        .filter(b => b && b.type)

    if (!list.length) return null

    let expired = false

    const next = []

    for (const b of list) {

        if (b.type === 'reflect') {

            const left = (b.duration || 0) - 1

            if (left <= 0) { expired = true; continue }

            next.push({ ...b, duration: left })

        } else {

            next.push(b)

        }

    }

    coop.boss.buffs = next

    return expired ? '🪞 انتهى انعكاس الضرر.' : null

}

module.exports = {
    ...SKILLS, useSkill, cast, rollSkill, rollGroupSkill,
    damageMultiplier, tickAttackDebuffs, consumeFreeze, tickPoison,
    reflectAmount, applyReflectDamage, tickBossBuffs
}
