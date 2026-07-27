const characters = require("../characters.json")
const { giveAnimeReward } = require("./AnimeRewards")

let currentQuestion = null
let answered = false
let timeout = null

function randomCharacter() {

    const list = characters.filter(c =>
        c.image &&
        c.name
    )

    return list[
        Math.floor(
            Math.random() *
            list.length
        )
    ]

}

async function start(sock, jid) {

    if (timeout)
        clearTimeout(timeout)

    answered = false

    currentQuestion =
        randomCharacter()

    await sock.sendMessage(jid, {

        image: {
            url:
            currentQuestion.image
        },

        caption:
`🖼️ ═════〔 من هذه الشخصية؟ 〕═════

✍️ للإجابة:

.جواب اسم_الشخصية

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

✅ الإجابة الصحيحة:

${currentQuestion.name}`
                    }
                )

                currentQuestion = null

            },

            5 * 60 * 1000

        )

}
async function answer(sock, msg, player, text) {

    if (!currentQuestion)
        return false

    if (answered)
        return true

    if (!text.startsWith(".جواب "))
        return false

    const answer =
        text
            .slice(6)
            .trim()
            .toLowerCase()

    if (
        answer !==
        currentQuestion.name
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
`🏆 إجابة صحيحة!

👤 ${currentQuestion.name}

━━━━━━━━━━━━━━

${reward.text}`
        }
    )

    currentQuestion = null

    return true

}

module.exports = {

    name: "guessCharacter",

    start,

    answer

}
