const { giveAnimeReward } = require("./AnimeRewards")

const states = new Map()

async function start(sock, jid) {

    const state = {

        active: true,

        chosenPlayers: new Set(),

        openedBoxes: new Set(),

        timeout: null

    }

    states.set(jid, state)

    await sock.sendMessage(jid, {

        text:
`🧭 ═════〔 البحث عن الكنز 〕═════

📦 أمامك ثلاثة صناديق فقط

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

⚠️ أول شخص يفتح الصندوق يحصل على جائزته.

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
        return { handled:false }

    if (state.chosenPlayers.has(userId)) {

        await sock.sendMessage(jid, {

            text:
`❌ لقد اخترت صندوقًا بالفعل.`

        })

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

        await sock.sendMessage(jid, {

            text:
`❌ اختر أحد الصناديق:

1️⃣
2️⃣
3️⃣`

        })

        return { handled: true }

    }

    if (state.openedBoxes.has(choice)) {

        await sock.sendMessage(jid, {

            text:
`📦 الصندوق رقم ${choice} تم فتحه بالفعل.`

        })

        return { handled: true }

    }

    state.chosenPlayers.add(userId)
    state.openedBoxes.add(choice)

    const reward =
        await giveAnimeReward(player)

    // إذا تم فتح جميع الصناديق ينتهي الحدث مباشرة
    if (state.openedBoxes.size >= 3) {

        clearTimeout(state.timeout)

        state.active = false

        states.delete(jid)

        setTimeout(async () => {

            await sock.sendMessage(jid, {

                text:
`📦 تم فتح جميع الصناديق!

🏁 انتهى حدث البحث عن الكنز.`

            })

        }, 1000)

    }

    return {

    handled: true,

    winner: player.userId,

    reward,

    extraText: `🎁 فتح الصندوق رقم ${choice}`,

    finished: state.openedBoxes.size >= 3

}

}

module.exports = {

    name: "treasure",

    start,

    answer

}
