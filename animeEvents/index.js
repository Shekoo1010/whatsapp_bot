const guessAnime = require("./guessAnime")
const completeName = require("./completeName")
const animeWar = require("./animeWar")
const guessCharacter = require("./guessCharacter")
const treasure = require("./treasure")

const events = [
    guessAnime,
    completeName,
    animeWar,
    guessCharacter,
    treasure
]

const GROUPS = [
    '120363020823525909@g.us',
    '120363428933463078@g.us',
    '120363409897316453@g.us',
    '120363116482407260@g.us'
]

const activeEvents = new Map()

let currentEventIndex = 0

const EVENT_INTERVAL = 17 * 60 * 1000
const EVENT_DURATION = 5 * 60 * 1000

let scheduler = null
let running = false

function nextEvent() {

    const event = events[currentEventIndex]

    currentEventIndex++

    if (currentEventIndex >= events.length) {
        currentEventIndex = 0
    }

    return event

}

async function startNextEvent(sock) {

    const event = nextEvent()

    if (!event) return

    for (const jid of GROUPS) {

        try {

            activeEvents.set(jid, event)

            await event.start(sock, jid)

            setTimeout(() => {

                if (activeEvents.get(jid) === event) {

                    activeEvents.delete(jid)

                }

            }, EVENT_DURATION)

        } catch (e) {

            console.log(`Anime Event Error (${jid})`, e)

        }

    }

}

function startScheduler(sock) {

    if (running) return

    running = true

    startNextEvent(sock)

    scheduler = setInterval(async () => {

        await startNextEvent(sock)

    }, EVENT_INTERVAL)

}

function stopScheduler() {

    if (scheduler) {

        clearInterval(scheduler)

        scheduler = null

    }

    activeEvents.clear()

    running = false

}

async function handleAnswer(sock, msg, text, player, userId) {

    const jid = msg.key.remoteJid

    const event = activeEvents.get(jid)

    if (!event) return false

    if (typeof event.answer !== "function")
        return false

    let result

try {

    result = await event.answer(
        sock,
        msg,
        player,
        text,
        userId
    )

} catch (err) {

    console.error(
        "[Anime Event Error]",
        event.name,
        err
    )

    activeEvents.delete(jid)

    return false

}

    if (!result)
        return false

    if (result.handled && result.winner) {

    await sock.sendMessage(jid, {

        text:
`🏆 إجابة صحيحة!

🎉 الفائز:
@${result.winner.split("@")[0]}

━━━━━━━━━━━━━━

${result.extraText ? result.extraText + "\n\n" : ""}${result.reward.text}`,

        mentions: [result.winner]

    })

    // لا نحذف الحدث إلا إذا انتهى
    if (result.finished) {
        activeEvents.delete(jid)
    }

}

    return result.handled

}

module.exports = {

    startScheduler,

    stopScheduler,

    startNextEvent,

    handleAnswer,

    getCurrentEvent(jid) {

        return activeEvents.get(jid)

    }

}
