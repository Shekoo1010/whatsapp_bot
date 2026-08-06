const imageQuestions = require("../imageQuestions")
const { giveAnimeReward } = require("./AnimeRewards")

const states = new Map()

function randomQuestion() {

    const list = imageQuestions.filter(q =>
        q.image &&
        q.answers &&
        q.answers.length
    )

    return list[
        Math.floor(
            Math.random() *
            list.length
        )
    ]

}

async function start(sock, jid) {

    const state = {

        currentQuestion: randomQuestion(),

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

        str
            .toLowerCase()
            .replace(/[._-]/g, " ")
            .replace(/\s+/g, " ")
            .trim()

    const answer = normalize(
        text.slice(6)
    )

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
