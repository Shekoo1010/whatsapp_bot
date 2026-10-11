const imageQuestions = require("../imageQuestions")
const { giveAnimeReward } = require("./AnimeRewards")
const { nextIndex } = require("./deck")

const states = new Map()

function randomQuestion(jid) {

    const list = imageQuestions.filter(q =>
        q.image &&
        q.answers &&
        q.answers.length
    )

    // يمر على كل الصور مرة مرة، وبعد ما تخلص يعيد من جديد
    return list[
        nextIndex("guessCharacter:" + jid, list.length)
    ]

}

async function start(sock, jid) {

    const state = {

        currentQuestion: randomQuestion(jid),

        answered: false,

        timeout: null

    }

    states.set(jid, state)

    await sock.sendMessage(jid, {

        image: {
            url: state.currentQuestion.image
        },

        caption:
`🖼️ ═════〔 من هذه الشخصية؟ 〕═════

✍️ للإجابة:

.جواب اسم_الشخصية

⏳ الوقت:
5 دقائق`

    })

    state.timeout = setTimeout(
        async () => {

            if (state.answered)
                return

            await sock.sendMessage(
                jid,
                {
                    text:
`⌛ انتهى الوقت

✅ الإجابة الصحيحة:

${state.currentQuestion.answers[0]}`
                }
            )

            states.delete(jid)

        },
        5 * 60 * 1000
    )

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

        String(str)
            .toLowerCase()
            .replace(/[أإآ]/g, "ا")
            .replace(/ة/g, "ه")
            .replace(/ى/g, "ي")
            .replace(/[._-]/g, " ")
            .replace(/\s+/g, " ")
            .trim()

    const answer = normalize(
        text.slice(6)
    )

    // جواب فاضي أو حرف واحد ما يحسب
    if (answer.length < 2)
        return { handled: true }

    const isCorrect =
        state.currentQuestion.answers.some(a => {

            const correct = normalize(a)

            return (
                answer === correct ||
                correct.includes(answer) ||
                answer.includes(correct)
            )

        })

    if (!isCorrect) {

        return { handled: true }

    }

    state.answered = true

    clearTimeout(state.timeout)

    const reward =
        await giveAnimeReward(player)

    const characterName =
        state.currentQuestion.answers[0]

    states.delete(jid)

    return {

        handled: true,

        winner: player.userId,

        reward,

        extraText:
`👤 ${characterName}`

    }

}

module.exports = {

    name: "guessCharacter",

    start,

    answer

}
