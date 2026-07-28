const { giveAnimeReward } = require("./AnimeRewards")

let active = false
let timeout = null

const chosenPlayers = new Set()
const boxes = new Map()

async function start(sock, jid) {

    active = true

    chosenPlayers.clear()

    boxes.clear()

    boxes.set(1, [])
    boxes.set(2, [])
    boxes.set(3, [])

    await sock.sendMessage(jid, {

        text:
`🧭 ═════〔 البحث عن الكنز 〕═════

📦 أمامك ثلاثة صناديق

1️⃣ الصندوق الأول
2️⃣ الصندوق الثاني
3️⃣ الصندوق الثالث

━━━━━━━━━━━━━━

✍️ اختر:

.اختيار 1

أو

.اختيار 2

أو

.اختيار 3

⏳ الوقت:
5 دقائق`

    })

    timeout = setTimeout(async () => {

        active = false

        await sock.sendMessage(jid, {

            text:
`⌛ انتهى وقت البحث عن الكنز`

        })

    }, 5 * 60 * 1000)

}

async function answer(sock, msg, player, text, userId) {

    if (!active)
        return { handled: false }

    if (!text.startsWith(".اختيار "))
        return { handled: false }

    if (chosenPlayers.has(userId)) {

        await sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
`❌ لقد اخترت صندوقًا بالفعل.`
            }
        )

        return { handled: true }

    }

    const choice =
        parseInt(
            text
                .slice(8)
                .trim()
        )

    if (
        choice < 1 ||
        choice > 3
    ) {

        await sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
`❌ اختر:

1
2
3`
            }
        )

        return { handled: true }

    }

    chosenPlayers.add(userId)

    boxes.get(choice).push(userId)

    const reward =
        await giveAnimeReward(player)

    return {

        handled: true,

        winner: player.userId,

        reward,

        extraText:
`🎁 فتح الصندوق رقم ${choice}`

    }

}

module.exports = {

    name: "treasure",

    start,

    answer

}
