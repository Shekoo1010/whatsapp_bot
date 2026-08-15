const CoOp = require('../models/CoOp')
const coopManager = require('./coopManager')

const coopSkills = require('./coopSkills')

const coopRewards = require('./coopRewards')

// =========================
// Helpers
// =========================

function random(min, max) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min

}

function crit(rate) {

    return Math.random() * 100 < rate

}

function currentCharacter(player) {

    return player.characters[
        player.currentCharacter
    ]

}

function bossAlive(coop) {

    return coop.boss.hp > 0

}

function alivePlayers(coop) {

    return coop.players.filter(

        p => !p.finished

    )

}
// =========================
// Start Battle
// =========================

async function startBattle(sock) {

    const coop = await CoOp.findOne()

    if (

        !coop ||

        !coop.active

    ) return

    coop.status = "battle"

    coop.round = 1

    coop.currentTurn = 0
coop.boss.rage = false
coop.boss.shield = 0
coop.boss.phase = 1
    coop.turnEnd =

        Date.now() + 60000

    await coop.save()

    return nextTurn(

        sock,

        coop

    )

}
// =========================
// Next Turn
// =========================

async function nextTurn(sock, coop) {

    if (

        !bossAlive(coop)

    ) {

        return endBattle(

            sock,

            true

        )

    }

    const players =

        alivePlayers(

            coop

        )

    if (

        !players.length

    ) {

        return endBattle(

            sock,

            false

        )

    }

    if (

        coop.currentTurn >=

        players.length

    ) {

        coop.currentTurn = 0

        coop.round++

    }

    coop.turnEnd =

        Date.now() + 60000

    await coop.save()

return showTurn(

    sock,

    coop

)

}
// =========================
// Show Turn
// =========================

async function showTurn(sock, coop) {

    const players = alivePlayers(coop)

    const player = players[
        coop.currentTurn
    ]

    if (!player) {

        return nextTurn(
            sock,
            coop
        )

    }

    const character = currentCharacter(
        player
    )

    const text =
`⚔️ الجولة ${coop.round}

👤 الدور:
${player.name}

⭐ الشخصية:
${character.name}

❤️ HP:
${character.hp.toLocaleString()} / ${character.maxHp.toLocaleString()}

👹 Boss:
${coop.boss.name}

❤️ ${coop.boss.hp.toLocaleString()} / ${coop.boss.maxHp.toLocaleString()}

⏳ لديك 60 ثانية.

اكتب

*.مقاتلة*
`

    for (const group of [

        "120363409897316453@g.us",

        "120363020823525909@g.us"

    ]) {

        try {

            await sock.sendMessage(

                group,

                {

                    text,

                    mentions: [

                        player.userId

                    ]

                }

            )

        } catch {}

    }

    setTimeout(

        async () => {

            const latest =

                await CoOp.findOne()

            if (

                !latest ||

                latest.status !== "battle"

            ) return

            if (

                latest.currentTurn !==

                coop.currentTurn

            ) return

            await autoAttack(

                sock

            )

        },

        60000

    )

}
// =========================
// Player Attack
// =========================

async function playerAttack(sock, userId) {

    const coop = await CoOp.findOne()

    if (

        !coop ||

        coop.status !== "battle"

    ) {

        return {

            success: false,

            message: "لا يوجد قتال حالياً."

        }

    }

    const players = alivePlayers(coop)

    const player = players[
        coop.currentTurn
    ]

    if (!player) {

        return {

            success: false

        }

    }

    if (

        player.userId !== userId

    ) {

        return {

            success: false,

            message: "ليس دورك."

        }

    }

    const character = currentCharacter(

        player

    )

    if (

        !character ||

        !character.alive

    ) {

        return {

            success: false

        }

    }

    // =========================
    // Damage
    // =========================

    let damage =

        character.power

    // Critical

    let critical = false

    const critRate =

        character.critRate || 5

    const critDamage =

        character.critDamage || 50

    if (

        crit(

            critRate

        )

    ) {

        critical = true

        damage += Math.floor(

            damage *

            (critDamage / 100)

        )

    }

    damage = Math.floor(

        damage

    )

    // =========================
// Boss Shield
// =========================

if (

    coop.boss.shield > 0

) {

    const absorbed = Math.min(

        damage,

        coop.boss.shield

    )

    coop.boss.shield -= absorbed

    damage -= absorbed

}

if (

    damage > 0

) {

    coop.boss.hp -= damage

}

if (

    coop.boss.hp < 0

) {

    coop.boss.hp = 0

}

    player.damage += damage

    player.totalDamage += damage

    coop.leaderboard =

        coop.players

        .map(p => ({

            userId: p.userId,

            name: p.name,

            damage: p.totalDamage

        }))

        .sort(

            (a, b) =>

            b.damage - a.damage

        )

    await coop.save()

    await bossAttack(

    sock

)

return {

    success: true,

    damage,

    critical

}

}
// =========================
// Boss Attack
// =========================

async function bossAttack(sock) {

    const coop = await CoOp.findOne()

    if (

        !coop ||

        coop.status !== "battle"

    ) return

    // نفذ المرحلة إذا لزم
    await checkBossPhase(coop)

    const players = alivePlayers(coop)

    if (!players.length) {

        return endBattle(

            sock,

            false

        )

    }

    const player = players[
        coop.currentTurn
    ]

    const character = currentCharacter(
        player
    )

    if (

        !character ||

        !character.alive

    ) {

        return nextTurn(

            sock,

            coop

        )

    }

    // =========================
    // Boss Damage
    // =========================

    let damage =

        random(

            Math.floor(character.maxHp * 0.18),

            Math.floor(character.maxHp * 0.30)

        )

    // Rage
    if (

        coop.boss.rage

    ) {

        damage = Math.floor(

            damage * 1.5

        )

    }

    // Shield
    if (

        character.shield > 0

    ) {

        const absorbed = Math.min(

            damage,

            character.shield

        )

        character.shield -= absorbed

        damage -= absorbed

    }

    character.hp -= damage

    if (

        character.hp <= 0

    ) {

        character.hp = 0

        character.alive = false

        nextCharacter(player)

    }

    await coop.save()

    return nextTurn(

        sock,

        coop

    )

}
// =========================
// Next Character
// =========================

function nextCharacter(player) {

    player.currentCharacter++

    if (

        player.currentCharacter >=

        player.characters.length

    ) {

        player.finished = true

        return

    }

    const character =

        player.characters[
            player.currentCharacter
        ]

    character.alive = true

}
// =========================
// Boss Phase
// =========================

async function checkBossPhase(coop) {

    const percent =

        (coop.boss.hp / coop.boss.maxHp) * 100

    // =========================
    // Phase 2 (70%)
    // =========================

    if (

        percent <= 70 &&

        coop.boss.phase === 1

    ) {

        coop.boss.phase = 2

        coop.boss.shield += 300000

        return

    }

    // =========================
    // Phase 3 (40%)
    // =========================

    if (

        percent <= 40 &&

        coop.boss.phase === 2

    ) {

        coop.boss.phase = 3

        await coopSkills.useSkill(

            coop,

            "aoe"

        )

        return

    }

    // =========================
    // Rage (15%)
    // =========================

    if (

        percent <= 15 &&

        !coop.boss.rage

    ) {

        coop.boss.rage = true

        await coopSkills.useSkill(

            coop,

            "rage"

        )

    }

}
// =========================
// Auto Attack
// =========================

async function autoAttack(sock) {

    const coop = await CoOp.findOne()

    if (

        !coop ||

        coop.status !== "battle"

    ) return

    const players = alivePlayers(coop)

    const player = players[
        coop.currentTurn
    ]

    if (!player) {

        return

    }

    const character = currentCharacter(
        player
    )

    if (

        !character ||

        !character.alive

    ) {

        return bossAttack(
            sock
        )

    }

    let damage = Math.floor(

        character.power * 0.7

    )

    if (

        coop.boss.shield > 0

    ) {

        const absorbed = Math.min(

            damage,

            coop.boss.shield

        )

        coop.boss.shield -= absorbed

        damage -= absorbed

    }

    if (damage > 0) {

        coop.boss.hp -= damage

    }

    if (

        coop.boss.hp < 0

    ) {

        coop.boss.hp = 0

    }

    player.damage += damage

    player.totalDamage += damage

    coop.leaderboard =

        coop.players

        .map(p => ({

            userId: p.userId,

            name: p.name,

            damage: p.totalDamage

        }))

        .sort(

            (a, b) =>

            b.damage - a.damage

        )

    await coop.save()

    return bossAttack(
        sock
    )

}
// =========================
// End Battle
// =========================

async function endBattle(sock, victory) {

    const coop = await CoOp.findOne()

    if (!coop) return

    coop.status = "finished"

    await coop.save()

    let rewardResults = []

    if (victory) {

        rewardResults = await coopRewards.giveRewards(
            coop
        )

    }

    let text = ""

    const mentions = []

    if (victory) {

        text +=
`🏆 *تم القضاء على ${coop.boss.name}!*

🎁 تم توزيع الجوائز على جميع المشاركين.

━━━━━━━━━━━━━━

`

        for (const player of rewardResults) {

            mentions.push(
                player.userId
            )

            text +=

`#${player.rank} @${player.userId.split("@")[0]}

💥 Damage
${player.damage.toLocaleString()}

💰 Gold
${player.rewards.gold.toLocaleString()}

⭐ EXP
${player.rewards.exp.toLocaleString()}

🪙 Co-Op Coins
${player.rewards.coins}
`

            if (

                player.rewards.boxes.length

            ) {

                text +=

`\n🎁 Rewards\n`

                for (

                    const box of player.rewards.boxes

                ) {

                    text +=

`• ${box.id} x${box.amount}
`

                }

            }

            text +=

`\n━━━━━━━━━━━━━━

`

        }

    } else {

        text =
`💀 فشل الفريق في هزيمة البوس.

👹 ${coop.boss.name}

حظًا أوفر في الجولة القادمة!`

    }

    for (const group of [

        "120363409897316453@g.us",

        "120363020823525909@g.us"

    ]) {

        try {

            await sock.sendMessage(

                group,

                {

                    text,

                    mentions

                }

            )

        } catch (err) {

            console.log(

                "Co-Op Result:",

                err.message

            )

        }

    }

    coop.active = false

    coop.status = "idle"

    coop.players = []

    coop.leaderboard = []

    coop.battleLog = []

    coop.rewardsClaimed = []

    coop.currentTurn = 0

    coop.round = 1

    coop.boss = {}

    coop.turnEnd = 0

    coop.joinEnd = 0

    coop.nextSpawn =
    Date.now() +
    (4 * 60 * 60 * 1000)

await coop.save()

const coopManager = require('./coopManager')

coopManager.startLoop(sock)

}
// =========================
// Exports
// =========================

module.exports = {

    startBattle,

    playerAttack,

    bossAttack,

    autoAttack,

    nextTurn,

    endBattle

}
