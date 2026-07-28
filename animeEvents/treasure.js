const { giveAnimeReward } = require("./AnimeRewards")

const states = new Map()

async function start(sock, jid) {

    const state = {

        active: true,

        chosenPlayers: new Set(),

        boxes: new Map(),

        timeout: null

    }

    state.boxes.set(1, [])
    state.boxes.set(2, [])
    state.boxes.set(3, [])

    states.set(jid, state)

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

    state.timeout = setTimeout(async () => {

        state.active = false

        states.delete(jid)

        await sock.sendMessage(jid, {

            text:
`⌛ انتهى وقت البحث عن الكنز`

        })

    }, 5 * 60 * 1000)

}

async function answer(sock, msg, player, text, userId) {

    const jid = msg.key.remoteJid

    const state = states.get(jid)

    if (!state || !state.active)
        return { handled: false }

    if (!text.startsWith(".اختيار "))
        return { handled: false }

    if (state.chosenPlayers.has(userId)) {

        await sock.sendMessage(
            jid,
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
            jid,
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

    state.chosenPlayers.add(userId)

    state.boxes.get(choice).push(userId)

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
