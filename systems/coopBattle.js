const CoOp = require('../models/CoOp')
const coopManager = require('./coopManager')

const coopSkills = require('./coopSkills')

const coopRewards = require('./coopRewards')

const coopGear = require('./coopGear')

// قروبات الإعلان (نفس قروبات coopManager)
// ⏱️ مهلة كل لاعب بالدور: 10 ثواني، وبعدها يهاجم تلقائياً
const TURN_MS = 10000
const TURN_SECONDS = TURN_MS / 1000

// 📵 رسائل القتال بالواتس معطلة (القتال بالموقع فقط). الإعلان والنتيجة النهائية تبقى
const WA_BATTLE_MESSAGES = false

const GROUPS = [
    "120363409897316453@g.us",
    "120363020823525909@g.us"
]

async function broadcast(sock, text, mentions = []) {

    if (!sock || !WA_BATTLE_MESSAGES) return

    for (const group of GROUPS) {

        try {

            await sock.sendMessage(group, { text, mentions })

        } catch (err) {

            console.log("Co-Op Broadcast:", err.message)

        }

    }

}

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

        Date.now() + TURN_MS

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

    if (!bossAlive(coop)) {

        return endBattle(sock, true)

    }

    const players = alivePlayers(coop)

    if (!players.length) {

        return endBattle(sock, false)

    }

    // نهاية الجولة: نرجع لأول لاعب ونزيد رقم الجولة
    if (coop.currentTurn >= players.length) {

        coop.currentTurn = 0

        coop.round++

    }

    coop.turnEnd = Date.now() + TURN_MS

    await coop.save()

    return showTurn(sock, coop)

}

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

⏳ لديك ${TURN_SECONDS} ثواني.

اكتب

*.مقاتلة*
`

    for (const group of (WA_BATTLE_MESSAGES ? GROUPS : [])) {

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

                latest.turnEnd !== coop.turnEnd

            ) return

            await autoAttack(

                sock

            ).catch(console.log)

        },

        TURN_MS

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

    // نفس منطق الهجوم على الزعيم: المعدات/الإيكوز + السلاح + الرفيق + EX + البونصات
    let damage = character.power
    let critical = false

    const hit = await coopGear.calcHit(userId, character)

    if (hit) {

        damage = hit.damage
        critical = hit.critical

        if (hit.heal > 0) {
            character.hp = Math.min(character.maxHp || character.hp, character.hp + hit.heal)
        }

    } else {

        // احتياط: لو الاعتمادات غير محقونة نستخدم القوة الخام + حرج بسيط
        if (crit(character.critRate || 5)) {
            critical = true
            damage += Math.floor(damage * ((character.critDamage || 50) / 100))
        }

    }

    damage = Math.floor(damage)

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

const SKILL_CHANCE = 0.3

// ضربة الزعيم العادية: 18% – 30% من HP الشخصية
function normalStrike(coop, player) {

    const character = currentCharacter(player)

    let damage = random(
        Math.floor(character.maxHp * 0.18),
        Math.floor(character.maxHp * 0.30)
    )

    if (coop.boss.rage) damage = Math.floor(damage * 1.5)

    if (character.shield > 0) {

        const absorbed = Math.min(damage, character.shield)

        character.shield -= absorbed

        damage -= absorbed

    }

    character.hp -= damage

    if (character.hp <= 0) {

        character.hp = 0

        character.alive = false

        nextCharacter(player)

    }

}

// يحدد دور اللاعب التالي حسب ترتيب الجولة (حتى لو سقط لاعبون أثناء الهجوم)
function advanceTurn(coop, orderIds, actingId) {

    const alive = alivePlayers(coop)

    for (let k = orderIds.indexOf(actingId) + 1; k < orderIds.length; k++) {

        const i = alive.findIndex(p => p.userId === orderIds[k])

        if (i !== -1) {

            coop.currentTurn = i

            return

        }

    }

    // انتهت الجولة: nextTurn يرجّعها 0 ويزيد رقم الجولة
    coop.currentTurn = alive.length

}

async function bossAttack(sock) {

    const coop = await CoOp.findOne()

    if (!coop || coop.status !== "battle") return

    // الزعيم مات بضربة اللاعب → ننهي القتال بدون ما يرد
    if (!bossAlive(coop)) return nextTurn(sock, coop)

    const orderIds = alivePlayers(coop).map(p => p.userId)

    const actingId = orderIds[coop.currentTurn]

    await checkBossPhase(coop, sock)

    if (!alivePlayers(coop).length) {

        return endBattle(sock, false)

    }

    const player = coop.players.find(
        p => p.userId === actingId && !p.finished
    )

    if (player) {

        const character = currentCharacter(player)

        if (character && character.alive) {

            let result = null

            if (Math.random() < SKILL_CHANCE) {

                result = coopSkills.cast(
                    coop,
                    coopSkills.rollSkill(coop),
                    player
                )

            }

            if (result) {

                coop.battleLog.push(result.message)

                await broadcast(
                    sock,
                    `👹 *${coop.boss.name}*\n${result.message}`
                )

            } else {

                normalStrike(coop, player)

            }

        }

    }

    advanceTurn(coop, orderIds, actingId)

    await coop.save()

    return nextTurn(sock, coop)

}

// =========================
// Next Character
// =========================

function nextCharacter(player) {

    const next = player.characters.findIndex(c => c.alive)

    if (next === -1) {

        player.finished = true

        return

    }

    player.currentCharacter = next

}

// =========================
// Boss Phase
// =========================

async function checkBossPhase(coop, sock) {

    const percent = (coop.boss.hp / coop.boss.maxHp) * 100

    const messages = []

    // الطور 2 (70%): درع
    if (percent <= 70 && coop.boss.phase === 1) {

        coop.boss.phase = 2

        const r = coopSkills.useSkill(coop, "shield")

        messages.push(`⚠️ الطور 2!\n${r.message}`)

    }

    // الطور 3 (40%): هجوم جماعي
    else if (percent <= 40 && coop.boss.phase === 2) {

        coop.boss.phase = 3

        const r = coopSkills.useSkill(coop, "aoe")

        messages.push(`🔥 الطور 3!\n${r.message}`)

    }

    // Rage (15%)
    if (percent <= 15 && !coop.boss.rage) {

        const r = coopSkills.useSkill(coop, "rage")

        messages.push(r.message)

    }

    for (const text of messages) {

        coop.battleLog.push(text)

        await broadcast(sock, `👹 *${coop.boss.name}*\n${text}`)

    }

}

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

    let damage = Math.floor(character.power * 0.7)

    const autoHit = await coopGear.calcHit(player.userId, character)

    if (autoHit) damage = Math.floor(autoHit.damage * 0.7)

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

// آخر نتيجة معركة (يعرضها الموقع بعد انتهاء القتال لأن الحالة تُصفّر)
let lastResult = null

function getLastResult() {
    return lastResult
}

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

    lastResult = {
        at: Date.now(),
        victory: !!victory,
        boss: {
            name: coop.boss.name,
            anime: coop.boss.anime,
            rank: coop.boss.rank,
            image: coop.boss.image
        },
        rows: victory
            ? rewardResults
            : (coop.leaderboard || []).map((r, i) => ({
                rank: i + 1,
                userId: r.userId,
                name: r.name,
                damage: r.damage,
                rewards: null
            }))
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

    for (const group of GROUPS) {

        if (!sock) break

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

    coop.startAt = 0
    coop.ready = []
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

    endBattle,

    getLastResult

}
