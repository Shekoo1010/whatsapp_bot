const events = require('./eventList')

const groupEvents = {}

function getRandomEvent() {
return events[
    Math.floor(
        Math.random() *
        events.length
    )
]

}

function getGroupData(jid) {

if (!groupEvents[jid]) {

    groupEvents[jid] = {

        currentEvent: null,

        participants: [],

        eventRunning: false,

        timeout: null,

        startedAt: 0
    }
}

return groupEvents[jid]

}

async function startEvent(
sock,
jid,
sharedEvent = null
) {

const data =
    getGroupData(jid)

if (data.eventRunning) {

    console.log(
        '⚠️ EVENT ALREADY RUNNING:',
        jid
    )

    return false
}

if (data.timeout) {

    clearTimeout(
        data.timeout
    )

    data.timeout = null
}

data.eventRunning = true

data.participants = []

data.startedAt =
    Date.now()

data.currentEvent =
    sharedEvent ||
    getRandomEvent()

try {

    await sock.sendMessage(
    jid,
    {
        text:

`🎮 حدث جديد!

${data.currentEvent.description}

👥 المشاركون: 0/5

⏳ لديك دقيقتان`
    }
)

} catch (err) {

    console.log(
'❌ EVENT SEND ERROR'
)

console.log(
'GROUP:',
jid
)

console.log(err)

    data.eventRunning = false

    return false
}

data.timeout =
    setTimeout(
        () => {

            data.eventRunning =
                false

            data.currentEvent =
                null

            data.participants =
                []

            data.timeout =
                null

        },
        120000
    )

return true

}

function joinEvent(
jid,
userId
) {

const data =
    getGroupData(jid)

if (!data.eventRunning)
    return false

if (
    data.participants.includes(
        userId
    )
)
    return false

if (
    data.participants.length >= 5
)
    return false

data.participants.push(
    userId
)

return data.participants.length

}

function pickWinners(jid) {

const data =
    getGroupData(jid)

const shuffled =
    [...data.participants]
    .sort(
        () =>
            Math.random() - 0.5
    )

const winnerCount =
    Math.random() < 0.5
        ? 2
        : 3

return shuffled.slice(
    0,
    Math.min(
        winnerCount,
        shuffled.length
    )
)

}

function finishEvent(jid) {

const data =
    getGroupData(jid)

if (!data.eventRunning)
    return null

const winners =
    pickWinners(jid)

if (data.timeout) {

    clearTimeout(
        data.timeout
    )

    data.timeout =
        null
}

data.eventRunning =
    false

data.currentEvent =
    null

data.participants =
    []

return winners

}

function getExpiredEvents() {

const expired = []

for (const jid in groupEvents) {

    const data =
        groupEvents[jid]

    if (
        data.eventRunning &&
        Date.now() - data.startedAt >=
        120000
    ) {

        expired.push({
            jid,
            event:
                data.currentEvent,
            participants:
                [...data.participants]
        })
    }
}

return expired

}
function resetAllEvents() {

for (const jid in groupEvents) {

    const data = groupEvents[jid]

    if (data.timeout) {
        clearTimeout(data.timeout)
    }

    data.eventRunning = false
    data.currentEvent = null
    data.participants = []
    data.timeout = null
    data.startedAt = 0
}

}

module.exports = {

getRandomEvent,

startEvent,

joinEvent,

pickWinners,

finishEvent,

getGroupData,

getExpiredEvents,

resetAllEvents

}
