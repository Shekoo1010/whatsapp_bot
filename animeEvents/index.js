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

// مدة بين بداية كل فعالية
const EVENT_INTERVAL = 17 * 60 * 1000

// مدة كل فعالية (مطابقة للملفات)
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

async function startNextEvent(sock, jid) {

    const event = nextEvent()

    if (!event) return

    await event.start(sock, jid)

    // بعد انتهاء الوقت تعتبر الفعالية منتهية
    setTimeout(() => {
        currentEvent = null
    }, EVENT_DURATION)

}

// تشغيل النظام بالكامل
function startScheduler(sock, jid) {

    if (running) return

    running = true

    // أول فعالية مباشرة
    startNextEvent(sock, jid)

    scheduler = setInterval(async () => {

        await startNextEvent(sock, jid)

    }, EVENT_INTERVAL)

}

// إيقاف النظام (اختياري)
function stopScheduler() {

    if (scheduler) {

        clearInterval(scheduler)

        scheduler = null

    }

    running = false

}

// تمرير الإجابات للفعالية الحالية
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
