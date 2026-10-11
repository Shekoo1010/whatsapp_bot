const quizCharacters = require("../quizCharacters.json")
const { giveAnimeReward } = require("./AnimeRewards")
const { nextIndex } = require("./deck")

const states = new Map()

// بعض العناصر في الملف مكتوبة بـ "name" بدل "answers" (مثل بليتش)، نوحدها هنا
const items = quizCharacters
    .map(i => ({
        anime: i.anime,
        answers: Array.isArray(i.answers) && i.answers.length
            ? i.answers
            : (i.name ? [i.name] : [])
    }))
    .filter(i => i.anime && i.answers.length)


function normalize(text) {
    return String(text)
        .toLowerCase()
        .replace(/[جغق]/g, "ق")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/[أإآ]/g, "ا")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/[^\u0600-\u06FFa-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim()
}

function randomCharacter(jid) {

    // يمر على كل الشخصيات مرة مرة، وبعد ما تخلص يعيد من جديد
    const item =
        items[
            nextIndex("guessAnime:" + jid, items.length)
        ]

    const character =
        item.answers[
            Math.floor(
                Math.random() *
                item.answers.length
            )
        ]

    return {
        name: character,
        anime: item.anime
    }

}

async function start(sock, jid) {

    const state = {

        currentQuestion: randomCharacter(jid),

        answered: false,

        timeout: null

    }

    states.set(jid, state)

    await sock.sendMessage(jid, {

        text:
`🎌 ═════〔 من أي أنمي؟ 〕═════

👤 الشخصية:

${state.currentQuestion.name}

━━━━━━━━━━━━━━

✍️ للإجابة:

.جواب اسم_الأنمي

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

${state.currentQuestion.anime}`

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

    const userAnswer =
        normalize(
            text.slice(6)
        )

    const correctAnswer =
        normalize(
            state.currentQuestion.anime
        )

    // جواب فاضي أو حرف واحد ما يحسب
    if (userAnswer.length < 2)
        return { handled: true }

    if (
        userAnswer !== correctAnswer &&
        !correctAnswer.includes(userAnswer) &&
        !userAnswer.includes(correctAnswer)
    ) {

        return { handled: true }

    }

    state.answered = true

    clearTimeout(state.timeout)

    const reward =
        await giveAnimeReward(player)

    const animeName =
        state.currentQuestion.anime

    const characterName =
        state.currentQuestion.name

    states.delete(jid)

    return {

        handled: true,

        winner: player.userId,

        reward,

        extraText:
`👤 ${characterName}

🎌 ${animeName}`

    }

}

module.exports = {

    name: "guessAnime",

    start,

    answer

}
