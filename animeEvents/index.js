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
    '120363362807326585@g.us',
    '120363116482407260@g.us'
]

const activeEvents = new Map()

let currentEventIndex = 0

// من فاز/استلم جائزة في هذه الجولة (في أي قروب) ما ياخذ جائزة ثانية بقروب آخر
let roundWinners = new Set()
const pendingUsers = new Set()

const EVENT_INTERVAL = 17 * 60 * 1000
const EVENT_DURATION = 5 * 60 * 1000

// ⏱️ وقت الفعالية القادمة ورقم الفعالية يتحفظون بقاعدة البيانات (BotState)
// حتى لو البوت انقفل أو انقطع الاتصال، ما تبدأ فعالية جديدة مباشرة عند التشغيل
// بل يكمل العد من الوقت المحفوظ.
const BotState = require("../models/BotState")

let timer = null
let running = false
let generation = 0
let liveSock = null
let nextRunAt = 0

async function loadSchedule() {

    try {

        const st = await BotState.findOne().lean()

        return {
            nextRunAt: Number(st && st.animeEventsNextRunAt) || 0,
            index: Number(st && st.animeEventsIndex)
        }

    } catch (e) {

        console.log("Anime Events: خطأ قراءة الوقت المحفوظ", e)

        return { nextRunAt: 0, index: NaN }

    }

}

async function saveSchedule(runAt, index) {

    try {

        await BotState.updateOne(
            {},
            {
                $set: {
                    animeEventsNextRunAt: runAt,
                    animeEventsIndex: index
                }
            },
            { upsert: true, strict: false }
        )

    } catch (e) {

        console.log("Anime Events: خطأ حفظ الوقت", e)

    }

}

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

    roundWinners = new Set()
    pendingUsers.clear()

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

            if (activeEvents.get(jid) === event) activeEvents.delete(jid)

        }

    }

}

function scheduleNext(gen, delay) {

    if (gen !== generation) return

    timer = setTimeout(async () => {

        if (gen !== generation) return

        // نحفظ الوقت القادم ورقم الفعالية التالية قبل الإرسال
        nextRunAt = Date.now() + EVENT_INTERVAL

        await saveSchedule(
            nextRunAt,
            (currentEventIndex + 1) % events.length
        )

        try {

            await startNextEvent(liveSock)

        } catch (e) {

            console.log("Anime Events Error", e)

        }

        scheduleNext(gen, Math.max(0, nextRunAt - Date.now()))

    }, Math.max(0, delay))

}

async function startScheduler(sock) {

    liveSock = sock

    if (running) return

    running = true

    const gen = ++generation

    const saved = await loadSchedule()

    // إذا انقفل الجدولة أثناء القراءة
    if (gen !== generation) return

    if (
        Number.isInteger(saved.index) &&
        saved.index >= 0 &&
        saved.index < events.length
    ) {
        currentEventIndex = saved.index
    }

    const now = Date.now()

    // لا يوجد وقت محفوظ (أول تشغيل) أو فات موعده: تبدأ الآن
    // وإلا: تنتظر المتبقي من الوقت المحفوظ
    const delay =
        saved.nextRunAt > now
            ? saved.nextRunAt - now
            : 0

    nextRunAt = now + delay

    scheduleNext(gen, delay)

}

function stopScheduler() {

    generation++

    if (timer) {

        clearTimeout(timer)

        timer = null

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

    const uid = userId || (player && player.userId)

    // رسائل الإجابة فقط: إذا اللاعب أخذ جائزة بقروب آخر بنفس الجولة، نتجاهله بصمت
    // (السؤال يبقى مفتوح بهذا القروب ويقدر يفوز فيه شخص ثاني)
    const isAnswerMsg =
        typeof text === "string" &&
        (text.startsWith(".جواب") || text.startsWith(".اختيار"))

    if (isAnswerMsg && uid) {

        if (roundWinners.has(uid) || pendingUsers.has(uid))
            return true

        pendingUsers.add(uid)

    }

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

    } finally {

        if (isAnswerMsg && uid) pendingUsers.delete(uid)

    }

    if (!result)
        return false

    if (result.handled && result.winner) {

    roundWinners.add(result.winner)
    if (uid) roundWinners.add(uid)

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
