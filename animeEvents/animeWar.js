const characters = require("../characters.json")
const { giveAnimeReward } = require("./AnimeRewards")

let currentBattle = null
let answered = false
let timeout = null

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// شخصيات SSS فقط
const sssCharacters = characters.filter(c =>
    c.rarity === "SSS" &&
    c.anime &&
    c.name
)

function shuffle(array) {

    const arr = [...array]

    for (let i = arr.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1))

        ;[arr[i], arr[j]] = [arr[j], arr[i]]

    }

    return arr

}

function buildBattle() {

    const teamSize = random(1, 4)

    // الأنميات الموجودة
    const animeList = [
        ...new Set(
            sssCharacters.map(c => c.anime)
        )
    ]

    const shuffledAnime =
        shuffle(animeList)

    const anime1 = shuffledAnime[0]
    const anime2 = shuffledAnime[1]

    const team1Pool =
        shuffle(
            sssCharacters.filter(c =>
                c.anime === anime1
            )
        )

    const team2Pool =
        shuffle(
            sssCharacters.filter(c =>
                c.anime === anime2
            )
        )

    const team1 =
        team1Pool.slice(0, teamSize)

    const team2 =
        team2Pool.slice(0, teamSize)

    const power1 =
        team1.reduce(
            (sum, c) =>
                sum + c.power,
            0
        )

    const power2 =
        team2.reduce(
            (sum, c) =>
                sum + c.power,
            0
        )

    const correct =
        power1 >= power2 ? 1 : 2

    return {

        anime1,
        anime2,

        team1,
        team2,

        power1,
        power2,

        correct

    }

}
async function start(sock, jid) {

    if (timeout)
        clearTimeout(timeout)

    answered = false

    currentBattle =
        buildBattle()

    const team1Text =
        currentBattle.team1
            .map(c => `👤 ${c.name}`)
            .join("\n")

    const team2Text =
        currentBattle.team2
            .map(c => `👤 ${c.name}`)
            .join("\n")

    await sock.sendMessage(jid, {

        text:
`⚔️ ═════〔 حرب الأنميات 〕═════

🟥 ${currentBattle.anime1}

${team1Text}

🆚

🟦 ${currentBattle.anime2}

${team2Text}

━━━━━━━━━━━━━━

من الفريق الأقوى؟

✍️ للإجابة:

.جواب 1

أو

.جواب 2

⏳ الوقت:
5 دقائق`

    })

    timeout =
        setTimeout(
            async () => {

                if (answered)
                    return

                await sock.sendMessage(
                    jid,
                    {

                        text:
`⌛ انتهى الوقت

🏆 الفريق الفائز:

${currentBattle.correct === 1
? `🟥 ${currentBattle.anime1}`
: `🟦 ${currentBattle.anime2}`}`

                    }
                )

                currentBattle = null

            },

            5 * 60 * 1000

        )

}

async function answer(sock, msg, player, text) {

    if (!currentBattle)
    return { handled: false }

if (answered)
    return { handled: true }

if (!text.startsWith(".جواب "))
    return { handled: false }

    const choice =
        parseInt(
            text
                .slice(6)
                .trim()
        )

    if (
    choice !== 1 &&
    choice !== 2
)
    return { handled: true }

    if (
        choice !==
        currentBattle.correct
    ) {

        await sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
`❌ إجابة خاطئة.`
            }
        )

        return { handled: true }

    }

    answered = true

    clearTimeout(timeout)

    const reward =
        await giveAnimeReward(player)

    const battle = currentBattle

currentBattle = null

return {

    handled: true,

    winner: player.userId,

    reward,

    extraText:
`⚔️ الفريق الفائز:

${battle.correct === 1
? `🟥 ${battle.anime1}`
: `🟦 ${battle.anime2}`}`

}

}
module.exports = {

    name: "animeWar",

    start,

    answer

}
