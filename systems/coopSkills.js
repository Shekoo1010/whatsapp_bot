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

            const damage = Math.floor(skill.damage * mult)

            for (const player of coop.players) {

                if (player.finished) continue

                for (const character of player.characters) {

                    if (character.alive) hitCharacter(character, damage)

                }

                settle(player)

            }

            return {
                ...skill,
                message: `${skill.message}
💔 -${damage.toLocaleString()} لكل شخصية`
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

// اختيار مهارة عشوائية حسب طور الزعيم
function rollSkill(coop) {

    const phase = coop.boss.phase || 1

    const pool = ['devilLaser', 'meteor', 'counterSlash']

    if (phase >= 2) pool.push('bossShield', 'regeneration', 'massAttack')

    if (phase >= 3) pool.push('thunderStorm', 'chaosShield')

    return pool[Math.floor(Math.random() * pool.length)]

}

module.exports = { ...SKILLS, useSkill, cast, rollSkill }
