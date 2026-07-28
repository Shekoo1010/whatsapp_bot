const characters = require("../characters.json")
const { giveAnimeReward } = require("./AnimeRewards")

const states = new Map()

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

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

    const animeList = [
        ...new Set(
            sssCharacters.map(c => c.anime)
        )
    ]

    const shuffledAnime = shuffle(animeList)

    const anime1 = shuffledAnime[0]
    const anime2 = shuffledAnime[1]

    const team1 =
        shuffle(
            sssCharacters.filter(c => c.anime === anime1)
        ).slice(0, teamSize)

    const team2 =
        shuffle(
            sssCharacters.filter(c => c.anime === anime2)
        ).slice(0, teamSize)

    const power1 =
        team1.reduce((s, c) => s + c.power, 0)

    const power2 =
        team2.reduce((s, c) => s + c.power, 0)

    return {

        anime1,

        anime2,

        team1,

        team2,

        correct: power1 >= power2 ? 1 : 2

    }

}

async function start(sock, jid) {

    const battle = buildBattle()

    const state = {

        answered: false,

        battle,

        timeout: null

    }

    states.set(jid, state)

    const team1Text =
        battle.team1
            .map(c => `👤 ${c.name}`)
            .join("\n")

    const team2Text =
        battle.team2
            .map(c => `👤 ${c.name}`)
            .join("\n")

    await sock.sendMessage(jid, {

        text:
`⚔️ ═════〔 حرب الأنميات 〕═════

🟥 ${battle.anime1}

${team1Text}

🆚

🟦 ${battle.anime2}

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

    state.timeout = setTimeout(async () => {

        if (state.answered)
            return

        await sock.sendMessage(jid, {

            text:
`⌛ انتهى الوقت

🏆 الفريق الفائز:

${state.battle.correct === 1
? `🟥 ${state.battle.anime1}`
: `🟦 ${state.battle.anime2}`}`

        })

        states.delete(jid)

    }, 5 * 60 * 1000)

}

async function answer(sock, msg, player, text) {

    const jid = msg.key.remoteJid

    const state = states.get(jid)

    if (!state)
        return { handled: false }

    if (state.answered)
        return { handled: true }

    if (!text.startsWith(".جواب "))
        return { handled: false }

    const choice =
        parseInt(
            text.slice(6).trim()
        )

    if (
        choice !== 1 &&
        choice !== 2
    )
        return { handled: true }

    if (choice !== state.battle.correct) {

        await sock.sendMessage(jid, {

            text: `❌ إجابة خاطئة.`

        })

        return { handled: true }

    }

    state.answered = true

    clearTimeout(state.timeout)

    const reward =
        await giveAnimeReward(player)

    const battle = state.battle

    states.delete(jid)

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
