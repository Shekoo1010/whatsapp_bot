const questions = require("./questions")
const imageQuestions = require("./imageQuestions")
const repeatQuestions = require("./repeatQuestions")
// أو ضع المصفوفة نفسها إذا لم تجعلها بملف مستقل

const MAX_PLAYERS = 8
const MIN_PLAYERS = 3

const HEARTS = [
    "❤️",
    "🩷",
    "🧡",
    "💛",
    "💚",
    "🩵",
    "💙",
    "💜",
    "🖤",
    "🩶",
    "🤍",
    "🤎"
]

const heartRooms = {}

function getRoom(jid) {

    if (!heartRooms[jid]) {

        heartRooms[jid] = {

    active: false,

    started: false,

    players: [],

    hearts: {},

    currentQuestion: null,
    currentAttacker: null,
    answerMessage: null,
    rounds: 0,

    playerProgress: {},
    questionSolved: false,

    usedQuestions: [],
    usedImages: [],
    usedRepeats: [],
    eliminatedOrder: [],
    answered: false

}

    }

    return heartRooms[jid]

}
function normalize(text) {
    return String(text)
        .toLowerCase()
        .replace(/[جغق]/g, 'ق')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/أ/g, 'ا')
        .replace(/إ/g, 'ا')
        .replace(/آ/g, 'ا')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/[^\u0600-\u06FFa-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}
function getRandomQuestion(room) {

    const available = questions.filter(
        (_, index) =>
            !room.usedQuestions.includes(index)
    )

    if (!available.length) {

        room.usedQuestions = []

        return getRandomQuestion(room)

    }

    const question =
        available[
            Math.floor(Math.random() * available.length)
        ]

    room.usedQuestions.push(
        questions.indexOf(question)
    )

    return question

}

function getRandomRepeatQuestion(room) {

    const available =
        repeatQuestions.filter(
            name =>
                !room.usedRepeats.includes(name)
        )

    if (!available.length) {

        room.usedRepeats = []

        return getRandomRepeatQuestion(room)

    }

    const count =
        Math.min(
            Math.floor(Math.random() * 3) + 1,
            available.length
        )

    const selected =
        [...available]
            .sort(() => Math.random() - 0.5)
            .slice(0, count)

    room.usedRepeats.push(...selected)

    return selected

}
function getRandomImageQuestion(room) {

    const available = imageQuestions.filter(
        (_, index) =>
            !room.usedImages.includes(index)
    )

    if (!available.length) {

        room.usedImages = []

        return getRandomImageQuestion(room)

    }

    const question =
        available[
            Math.floor(Math.random() * available.length)
        ]

    room.usedImages.push(
        imageQuestions.indexOf(question)
    )

    return question

}
async function createHeartEvent(sock, msg) {

    const room = getRoom(msg.key.remoteJid)

    if (room.active) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: "❌ توجد فعالية قلوب بالفعل."
            }
        )

    }

    room.active = true
room.started = false
room.players = []
room.hearts = {}
room.currentQuestion = null
room.currentAttacker = null
room.rounds = 0
room.usedQuestions = []
room.usedImages = []
room.usedRepeats = []
room.eliminatedOrder = []
room.answered = false
room.answerMessage = null


    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`❤️ تم إنشاء فعالية القلوب

👥 الحد الأدنى:
${MIN_PLAYERS}

👥 الحد الأقصى:
${MAX_PLAYERS}

اكتب:

.تسجيل_قلوب`
        }
    )

}
async function joinHeartEvent(sock, msg, userId) {

    const room = getRoom(msg.key.remoteJid)

    if (!room.active)
        return

    if (room.started) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: "❌ بدأت الفعالية."
            }
        )

    }

    if (room.players.includes(userId)) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: "❌ أنت مسجل بالفعل."
            }
        )

    }

    if (room.players.length >= MAX_PLAYERS) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: "❌ اكتمل التسجيل."
            }
        )

    }

    room.players.push(userId)

    room.hearts[userId] = {
        icon: HEARTS[Math.floor(Math.random() * HEARTS.length)],
        hp: 3
    }

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`✅ تم تسجيلك.

👥 عدد اللاعبين:

${room.players.length}/${MAX_PLAYERS}`,
            mentions: [userId]
        }
    )

}
async function startHeartEvent(sock, jid) {

    const room = getRoom(jid)

    if (!room.active)
        return

    if (room.started)
        return

    if (room.players.length < MIN_PLAYERS) {

        return sock.sendMessage(jid, {
            text:
`❌ لا يمكن بدء الفعالية.

الحد الأدنى:
${MIN_PLAYERS} لاعبين.`
        })

    }

    // بدء الفعالية
    room.started = true

    // خلط ترتيب اللاعبين مرة واحدة فقط
    room.players = [...room.players].sort(() => Math.random() - 0.5)

    await sock.sendMessage(jid, {
        text:
`❤️ بدأت فعالية القلوب!

👥 عدد المشاركين:
${room.players.length}

🎲 تم خلط ترتيب اللاعبين.

استعدوا لأول سؤال...`
    })

    setTimeout(() => {
        sendHeartQuestion(sock, jid)
    }, 2000)

}
async function sendHeartQuestion(sock, jid) {

    const room = getRoom(jid)

    room.currentAttacker = null
    room.currentQuestion = null
    room.answerMessage = null
    room.answered = false
    room.questionSolved = false
    room.playerProgress = {}

    const mode = Math.floor(Math.random() * 3)

    // سؤال نصي
    if (mode === 0) {

        const question = getRandomQuestion(room)

        room.currentQuestion = {
            type: question.type || "single",
            answers: question.answers.map(a => normalize(a)),
            required:
                question.required ??
                (
                    question.answers.length >= 3
                        ? 3
                        : question.answers.length
                )
        }

        return await sock.sendMessage(jid, {
            text:
`🎯 سؤال جديد

❓ ${question.question}`
        })

    }
    
// اكتب التالي
if (mode === 1) {

    const answers =
        getRandomRepeatQuestion(room)

    room.currentQuestion = {

        type: "repeat",

        answers: answers.map(normalize)

    }

    return await sock.sendMessage(jid, {

        text:
`✍️ اكتب التالي:

${answers.map(a => `*${a}*`).join(" - ")}`

    })

}
    // سؤال صورة
const image = getRandomImageQuestion(room)

room.currentQuestion = {
    type: "image",
    answers: image.answers.map(normalize),
    required: 1
}

return await sock.sendMessage(jid, {
    image: {
        url: image.image
    }
})
}
// ⚡ فحص سريع بدون إنشاء غرفة (getRoom ينشئ غرفة جديدة لكل قروب يكتب فيه أحد حتى لو ما فيه فعالية).
// نفس شروط الرجوع المبكر (false) داخل checkHeartAnswer بالضبط: لو رجعت false هنا فالدالة كانت سترجع false.
function isAcceptingAnswers(jid, userId) {

    const room = heartRooms[jid]

    return !!(
        room &&
        room.started &&
        room.currentQuestion &&
        !room.questionSolved &&
        room.players.includes(userId)
    )

}

async function checkHeartAnswer(sock, msg, jid, userId, answer) {

    const room = getRoom(jid)

if (!room.players.includes(userId)) {
    return false
}

    if (!room.started) return false
    if (!room.currentQuestion) return false
    if (room.questionSolved) return false

    const normalizedAnswer = normalize(answer)

    if (!room.playerProgress[userId]) {

        room.playerProgress[userId] = {
            text: ""
        }

    }

    // تجميع جميع رسائل اللاعب
    room.playerProgress[userId].text +=
        " " + normalizedAnswer

    const fullText =
        room.playerProgress[userId].text

    const uniqueAnswers = [
        ...new Set(
            room.currentQuestion.answers.map(
                a => normalize(a)
            )
        )
    ]

    // نفس نظام "اكتب التالي"
    if (room.currentQuestion.type === "repeat") {

        const normalizedText =
            normalize(fullText)

        const allFound =
            uniqueAnswers.every(
                ans =>
                    normalizedText.includes(ans)
            )

        if (allFound) {

            room.currentAttacker = userId
            room.answerMessage = msg
            room.questionSolved = true
            room.answered = true

            delete room.playerProgress[userId]

            await showHearts(sock, jid)

            return true

        }

        return false

    }

    let matchedCount = 0

for (const correct of uniqueAnswers) {

    if (fullText.includes(correct)) {

        matchedCount++

    }

}

    const required =
        room.currentQuestion.required ||
        (
            room.currentQuestion.type === "multi"
                ? Math.min(3, uniqueAnswers.length)
                : 1
        )

    if (matchedCount >= required) {

        room.currentAttacker = userId
        room.answerMessage = msg
        room.questionSolved = true
        room.answered = true

        delete room.playerProgress[userId]

        await showHearts(sock, jid)

        return true

    }

    return false
}
async function showHearts(sock, jid) {

    const room = getRoom(jid)

    if (!room.currentAttacker) return

    const alive = room.players.filter(
        id =>
            room.hearts[id] &&
            room.hearts[id].hp > 0
    )

    let text =
`✅ @${room.currentAttacker.split("@")[0]} أجاب أولاً

اختر لاعباً لتزيل منه قلباً:

`

    let number = 1

    for (const id of alive) {

        text += `${number}- ${room.hearts[id].icon.repeat(room.hearts[id].hp)}\n`

        number++

    }

    text += `

✍️ اكتب:

.نقص رقم`

    await sock.sendMessage(jid, {
        text,
        mentions: [room.currentAttacker]
    })

}
async function damagePlayer(sock, jid, attackerId, targetIndex) {

    const room = getRoom(jid)

    if (!room.started)
        return

    if (room.currentAttacker !== attackerId)
        return

    // الرقم الذي يكتبه اللاعب يبدأ من 1
    const targets = room.players.filter(
    id =>
        room.hearts[id] &&
        room.hearts[id].hp > 0
)

const target = targets[targetIndex - 1]

if (!target) {
    return sock.sendMessage(jid, {
        text: "❌ رقم لاعب غير صحيح."
    })
}

    // إنقاص قلب
    room.hearts[target].hp--



    // إذا خرج اللاعب
    if (room.hearts[target].hp <= 0) {

    room.hearts[target].hp = 0

    if (!room.eliminatedOrder.includes(target)) {
        room.eliminatedOrder.push(target)
    }

    // إزالة اللاعب من الفعالية نهائياً
    room.players = room.players.filter(
        id => id !== target
    )

    await sock.sendMessage(
        jid,
        {
            text:
`💀 @${target.split("@")[0]} أقصي من قبل @${attackerId.split("@")[0]}`,
            mentions: [
                attackerId,
                target
            ]
        }
    )
}

room.answerMessage = null
room.currentAttacker = null
room.currentQuestion = null
room.answered = false
// اللاعبين الأحياء
const alivePlayers =
    room.players.filter(
        id =>
            room.hearts[id] &&
            room.hearts[id].hp > 0
    )



// بقي لاعب واحد فقط، انتهت اللعبة
if (alivePlayers.length === 1) {

    const first = alivePlayers[0]

const second = room.eliminatedOrder.at(-1)
const third = room.eliminatedOrder.at(-2)

    await sock.sendMessage(jid, {
    text:
`🏆 انتهت فعالية القلوب

🥇 @${first.split("@")[0]}

🥈 @${second.split("@")[0]}

🥉 @${third.split("@")[0]}`,
    mentions: [
        first,
        second,
        third
    ]
})

    room.active = false
    room.started = false
    room.players = []
    room.hearts = {}
    room.currentQuestion = null
    room.currentAttacker = null
    room.answerMessage = null
    room.rounds = 0
    room.usedQuestions = []
    room.usedImages = []
    room.usedRepeats = []
    room.eliminatedOrder = []
    room.answered = false

    return
}
room.playerProgress = {}
room.questionSolved = false

// السؤال التالي
setTimeout(async () => {
    await sendHeartQuestion(sock, jid)
}, 2000)

}
module.exports = {
    getRoom,
    createHeartEvent,
    joinHeartEvent,
    getRandomQuestion,
    getRandomRepeatQuestion,
    getRandomImageQuestion,
    normalize,
    HEARTS,
    MAX_PLAYERS,
  startHeartEvent,
sendHeartQuestion,
  checkHeartAnswer,
  isAcceptingAnswers,
  showHearts,
  damagePlayer,
    MIN_PLAYERS
}
