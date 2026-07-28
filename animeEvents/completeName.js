const characters = require("../characters.json")
const { giveAnimeReward } = require("./AnimeRewards")

const states = new Map()

function randomCharacter() {

    const list = characters.filter(c =>
        c.name &&
        c.name.trim().split(/\s+/).length >= 2
    )

    return list[
        Math.floor(
            Math.random() * list.length
        )
    ]

}

async function start(sock, jid) {

    const char =
        randomCharacter()

    const parts =
        char.name.trim().split(/\s+/)

    const hideCount =
        Math.min(
            Math.floor(Math.random() * 3) + 1,
            parts.length - 1
        )

    const hidden =
        parts
            .slice(parts.length - hideCount)
            .join(" ")

    for (let i = 0; i < hideCount; i++) {

        parts[
            parts.length - 1 - i
        ] = "_____"

    }

    const state = {

        answered: false,

        currentQuestion: {

            answer: hidden,

            fullName: char.name,

            question: parts.join(" ")

        },

        timeout: null

    }

    states.set(jid, state)

    await sock.sendMessage(jid, {

        text:
`📝 ═════〔 أكمل الاسم 〕═════

${state.currentQuestion.question}

━━━━━━━━━━━━━━

✍️ للإجابة:

.جواب الاسم_الكامل

⏳ الوقت:
5 دقائق`

    })

    state.timeout = setTimeout(async () => {

        if (state.answered)
            return

        await sock.sendMessage(jid, {

            text:
`⌛ انتهى الوقت

✅ الإجابة الصحيحة:

${state.currentQuestion.fullName}`

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

    const normalize = str =>

        str
            .toLowerCase()
            .replace(/[._-]/g, " ")
            .replace(/\s+/g, " ")
            .trim()

    const answer =
        normalize(
            text.slice(6)
        )

    const correct =
        normalize(
            state.currentQuestion.fullName
        )

    if (
        answer !== correct &&
        !correct.includes(answer) &&
        !answer.includes(correct)
    ) {

        return { handled: true }

    }

    state.answered = true

    clearTimeout(state.timeout)

    const reward =
        await giveAnimeReward(player)

    const fullName =
        state.currentQuestion.fullName

    states.delete(jid)

    return {

        handled: true,

        winner: player.userId,

        reward,

        extraText:
`👤 ${fullName}`

    }

}

module.exports = {

    name: "completeName",

    start,

    answer

}
