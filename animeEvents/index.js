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
    '120363409897316453@g.us',
    '120363116482407260@g.us'
]

let currentEventIndex = 0
let currentEvent = null

const EVENT_INTERVAL = 17 * 60 * 1000
const EVENT_DURATION = 5 * 60 * 1000

let scheduler = null
let running = false

function getCurrentEvent() {
    return currentEvent
}

function nextEvent() {

    currentEvent = events[currentEventIndex]

    currentEventIndex++

    if (currentEventIndex >= events.length) {
        currentEventIndex = 0
    }

    return currentEvent
}

async function startNextEvent(sock) {

    const event = nextEvent()

    if (!event) return

    for (const jid of GROUPS) {
        try {
            await event.start(sock, jid)
        } catch (e) {
            console.log(`Anime Event Error (${jid})`, e)
        }
    }

    setTimeout(() => {
        currentEvent = null
    }, EVENT_DURATION)

}

function startScheduler(sock) {

    if (running) return

    running = true

    // أول فعالية مباشرة
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

    running = false

}

async function handleAnswer(sock, msg, text, player, userId) {

    if (!currentEvent) return false

    if (typeof currentEvent.answer !== "function")
        return false

    return await currentEvent.answer(
        sock,
        msg,
        player,
        text,
        userId
    )

}

module.exports = {

    startScheduler,

    stopScheduler,

    startNextEvent,

    handleAnswer,

    getCurrentEvent

}
