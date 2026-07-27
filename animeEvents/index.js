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

let currentEventIndex = 0
let currentEvent = null

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

async function startNextEvent(sock, jid) {

    const event = nextEvent()

    if (!event) return

    await event.start(sock, jid)

}

module.exports = {

    startNextEvent,

    getCurrentEvent

}
