const characters = require("../characters.json")
const { giveAnimeReward } = require("./AnimeRewards")

let currentQuestion = null
let answered = false
let timeout = null

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

    if (timeout)
        clearTimeout(timeout)

    answered = false

    const char =
        randomCharacter()

    const parts =
        char.name.trim().split(/\s+/)

    if (parts.length < 2)
        return start(sock, jid)

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

    currentQuestion = {

        answer: hidden,

        fullName: char.name,

        question: parts.join(" ")

    }

    await sock.sendMessage(jid, {

        text:
`📝 ═════〔 أكمل الاسم 〕═════

${currentQuestion.question}

━━━━━━━━━━━━━━

✍️ للإجابة:

.جواب الاسم_الكامل

⏳ الوقت:
5 دقائق`

    })

    timeout = setTimeout(async () => {

        if (answered)
            return

        await sock.sendMessage(jid, {

            text:
`⌛ انتهى الوقت

✅ الإجابة الصحيحة:

${currentQuestion.fullName}`

        })

        currentQuestion = null

    }, 5 * 60 * 1000)

}

async function answer(sock, msg, player, text) {

    if (!currentQuestion)
        return { handled: false }

    if (answered)
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
            currentQuestion.fullName
        )

    if (
        answer !== correct &&
        !correct.includes(answer) &&
        !answer.includes(correct)
    ) {

        return { handled: true }

    }

    answered = true

    clearTimeout(timeout)

    const reward =
        await giveAnimeReward(player)

    currentQuestion = null

    return {

        handled: true,

        winner: player.userId,

        reward

    }

}

module.exports = {

    name: "completeName",

    start,

    answer

}
