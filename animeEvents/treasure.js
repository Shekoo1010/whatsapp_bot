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

    if (!text.startsWith(".اختيار"))
        return { handled: false }

    // الرقم لازم يكون 1 أو 2 أو 3 فقط (أي شيء ثاني مثل W يتجاهله البوت)
    const match = text.slice(7).trim().match(/^([123])$/)

    if (!match)
        return { handled: true }

    const choice = Number(match[1])

    const uid = userId || player.userId

    if (state.chosenPlayers.has(uid)) {

        await sock.sendMessage(jid, {

            text:
`❌ لقد اخترت صندوقًا بالفعل.`

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

    // نحجز الصندوق قبل أي await حتى لا يفتحه شخصان في نفس اللحظة
    state.chosenPlayers.add(uid)
    state.openedBoxes.add(choice)

    const finished = state.openedBoxes.size >= 3

    let reward

    try {

        reward = await giveAnimeReward(player)

    } catch (e) {

        // فشل إعطاء الجائزة: نرجع الصندوق للاعب
        state.chosenPlayers.delete(uid)
        state.openedBoxes.delete(choice)

        throw e

    }

    // إذا تم فتح جميع الصناديق ينتهي الحدث مباشرة
    if (finished) {

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

        winner: uid,

        reward,

        extraText: `🎁 فتح الصندوق رقم ${choice}`,

        finished

    }

}

module.exports = {

    name: "treasure",

    start,

    answer

}
