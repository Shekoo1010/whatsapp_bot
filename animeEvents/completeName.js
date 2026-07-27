const characters = require("../characters.json")
const { giveAnimeReward } = require("./AnimeRewards")

let currentQuestion = null
let answered = false
let timeout = null

function randomCharacter() {

    const list = characters.filter(c =>
        c.name &&
        c.name.includes(" ")
    )

    return list[Math.floor(Math.random() * list.length)]

}

async function start(sock, jid) {

    if (timeout) clearTimeout(timeout)

    answered = false

    const char = randomCharacter()

    const parts = char.name.split(" ")

    if (parts.length < 2) return start(sock, jid)

    const hidden =
        parts[parts.length - 1]

    parts[parts.length - 1] =
        "_____"

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

.جواب ${hidden}

⏳ الوقت:
5 دقائق`
    })

    timeout = setTimeout(async () => {

        if (answered) return

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

    if (!currentQuestion) return false

    if (answered) return true

    if (!text.startsWith(".جواب "))
        return false

    const answer =
        text
        .slice(6)
        .trim()
        .toLowerCase()

    if (
        answer !==
        currentQuestion.answer
        .trim()
        .toLowerCase()
    ) return true

    answered = true

    clearTimeout(timeout)

    const reward =
        await giveAnimeReward(player)

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`🏆 إجابة صحيحة

👤 ${currentQuestion.fullName}

━━━━━━━━━━━━━━

${reward.text}`
        }
    )

    currentQuestion = null

    return true

}

module.exports = {

    name: "completeName",

    start,

    answer

}
