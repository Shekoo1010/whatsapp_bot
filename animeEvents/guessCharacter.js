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

const answer = normalize(
    text.slice(6)
)

const correct = normalize(
    currentQuestion.name
)

if (answer !== correct)
    return { handled: true }

    answered = true

    clearTimeout(timeout)

    const reward =
        await giveAnimeReward(player)

    

    currentQuestion = null

return {
    handled: true,
    winner: player.userId,
    reward,
    character: currentQuestion.name
}

}

module.exports = {

    name: "guessCharacter",

    start,

    answer

}
