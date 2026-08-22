const fs = require('fs')

const eventManager =
require('./eventManager')

const {
giveReward
} = require('./eventRewards')

const eventGroups = [
'120363020823525909@g.us',
    '120363428933463078@g.us',
'120363409897316453@g.us',
'120363116482407260@g.us'
]

const EVENT_FILE =
'./eventTimer.json'

let autoEventsStarted = false
let eventCycleInterval = null
let expiredCheckInterval = null
let eventStartTimeout = null
function loadNextEventTime() {

if (
    !fs.existsSync(
        EVENT_FILE
    )
) {
    return null
}

try {

    const data =
        JSON.parse(
            fs.readFileSync(
                EVENT_FILE,
                'utf8'
            )
        )

    return data.nextEvent

} catch {

    return null
}

}

function saveNextEventTime(
time
) {

fs.writeFileSync(
    EVENT_FILE,
    JSON.stringify({
        nextEvent: time
    })
)

}

function startAutoEvents(sock) {

console.log(
'🎯 Auto Events Scheduler Started'
)

if (autoEventsStarted) {

    console.log(
        '⚠️ Auto Events Already Started'
    )

    return
}

autoEventsStarted = true

async function launchEvent() {

    console.log('🚀 AUTO EVENT TRIGGERED')

    console.log(
        'SOCKET READY:',
        !!sock?.user
    )

    console.log(
        'WS STATE:',
        sock?.ws?.readyState
    )

    if (
    !sock ||
    !sock.user
) {
    console.log('⚠️ Connection Not Ready')
    return
}
    try {

        const sharedEvent =
    eventManager.getRandomEvent()

console.log(
    'EVENT SELECTED:',
    sharedEvent
)

if (!sharedEvent) {

    console.log(
        '❌ NO EVENT FOUND'
    )

    return
}

        for (const groupId of eventGroups) {

            try {

                console.log(
                    'Sending Event To:',
                    groupId
                )

                const started =
await eventManager.startEvent(
    sock,
    groupId,
    sharedEvent
)

console.log(
    'EVENT RESULT:',
    groupId,
    started
)
            } catch (err) {

                console.log(
                    'EVENT GROUP ERROR:',
                    groupId,
                    err.message
                )
            }
        }

    } catch (err) {

        console.log(
            'Auto Event Error:',
            err
        )
    }
}

const now =
    Date.now()

let nextEvent =
    loadNextEventTime()

if (
    !nextEvent ||
    nextEvent <= now
) {

    nextEvent =
        now +
        (
            20 *
            60 *
            1000
        )

    saveNextEventTime(
        nextEvent
    )
}

const remaining =

    Math.max(
        0,
        nextEvent - now
    )

console.log(
    `⏳ Next Event In ${
        Math.floor(
            remaining / 1000
        )
    } Seconds`
)

eventStartTimeout = setTimeout(
    async function startCycle() {

        await launchEvent()

        saveNextEventTime(
            Date.now() +
            (
                20 *
                60 *
                1000
            )
        )

        eventCycleInterval = setInterval(
            async () => {

                await launchEvent()

                saveNextEventTime(
                    Date.now() +
                    (
                        20 *
                        60 *
                        1000
                    )
                )

            },
            20 *
            60 *
            1000
        )

    },
    remaining
)

expiredCheckInterval = setInterval(
    async () => {

        try {

            const expired =
                eventManager.getExpiredEvents()

            for (
                const event
                of expired
            ) {

                if (
                    !event.participants.length
                ) {

                    eventManager.finishEvent(
                        event.jid
                    )

                    continue
                }

                const eventName =
                    event.event.name

                const winners =
                    eventManager.finishEvent(
                        event.jid
                    )

                if (
                    !Array.isArray(
                        winners
                    )
                ) {
                    continue
                }

                let result =

`⏰ انتهى وقت الحدث

🎯 ${eventName}

🏆 الفائزون:

`

                for (
const id
of winners
) {

let reward = 'لا توجد جائزة'

try {

    reward =
        await giveReward(id)

} catch (err) {

    console.log(
        'Reward Error:',
        id,
        err
    )
}

result +=

`👑 @${id.split('@')[0]}
🎁 ${reward}

`
}


                if (
                    !sock?.user?.id
                ) {
                    continue
                }

                await sock.sendMessage(
                    event.jid,
                    {
                        text:
                            result,
                        mentions:
                            winners
                    }
                )
            }

        } catch (err) {

            console.log(
                'Expired Event Error:',
                err
            )
        }

    },
    5000
)

}

function resetAutoEvents() {

    autoEventsStarted = false

    if (eventStartTimeout) {
        clearTimeout(eventStartTimeout)
        eventStartTimeout = null
    }

    if (eventCycleInterval) {
        clearInterval(eventCycleInterval)
        eventCycleInterval = null
    }

    if (expiredCheckInterval) {
        clearInterval(expiredCheckInterval)
        expiredCheckInterval = null
    }

    if (typeof eventManager.resetAllEvents === 'function') {
    eventManager.resetAllEvents()
}

}
module.exports = {
    startAutoEvents,
    resetAutoEvents
}
