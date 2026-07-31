const quizCharacters = require("../quizCharacters.json")
const { giveAnimeReward } = require("./AnimeRewards")

const states = new Map()

function normalize(text) {
    return String(text)
        .toLowerCase()
        .replace(/[جغق]/g, "ق")
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/[^\u0600-\u06FFa-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim()
}

function randomCharacter() {

    const item =
        quizCharacters[
            Math.floor(
                Math.random() *
                quizCharacters.length
            )
        ]

    const fullName =
        item.answers[
            Math.floor(
                Math.random() *
                item.answers.length
            )
        ]

    return {
        fullName,
        answers: item.answers,
        anime: item.anime
    }

}

async function start(sock, jid) {

    const char =
        randomCharacter()

    const parts =
    char.fullName.trim().split(/\s+/)

    const hideCount =
    Math.min(
        Math.floor(Math.random() * 3) + 1,
        parts.length - 1
    )

for (let i = 0; i < hideCount; i++) {

    parts[
        parts.length - 1 - i
    ] = "_____"

}

    const state = {

    answered: false,

    currentQuestion: {

        answers: char.answers,

        fullName: char.fullName,

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

    

    const answer =
        normalize(
            text.slice(6)
        )

    const correctAnswers =
    state.currentQuestion.answers.map(normalize)

const matched =
    correctAnswers.some(correct =>
        answer === correct ||
        correct.includes(answer) ||
        answer.includes(correct)
    )

if (!matched) {
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
