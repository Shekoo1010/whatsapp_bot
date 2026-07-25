const questions =
    require('./questions')

const imageQuestions =
    require('./imageQuestions')

const MAX_ROUNDS = 50

const quizRooms = {}

const repeatQuestions = [
    'لوفي','زورو','نامي','سانجي','اوسوب','تشوبر','روبين','فرانكي','بروك','جينبي',
'شانكس','إيس','سابو','لاو','ميهوك','دوفلامينغو','كايدو','بيغ مام','كروكودايل',
'سموكر','كيزارو','أوكيجي','أكاينو','باغي','بيرونا','هانكوك','ياماتو','كاتاكوري',
'كيد','كيلر','هوكينز','دريك','بوني','كوبي','غارب','سينغوكو','رايلي','نيوغيت',
'ماركو','جوزو','فيستا','تيتش','اينيل','لوتشي','كاكو','كاليفا','موريا','سيزار',
'فيغابانك','كينيمون','مومونوسكي','أودين','كوين','كينغ','جاك','أوروتشي','هيوري',
'ريبيكا','فيفي','كاروت','بيدرو','ألبيدا','كورينا','بيبو','شيراهوشي',
'أرلونغ','هاتشي','باولي','فوكسي',

'كونان','ران','كوغورو','هايبرا','أغاسا','هيجي','كايتو','ساتو','تاكاغي',
'تشيبا','ميغوري','جين','فودكا','فيرموث','بوربون','كير','شوكيتشي','ماري',
'ماسومي','أكاي','يوساكو','يوكو','ميتسوهيكو','غينتا','أيومي','سيرا','جودي',
'كازوها','موميجي','شينتشي','كيد','واكاسا',
'روم','ري','أزوسا','سوبارو','أكيمي','أتسوشي','ماكوتو','يامامورا',

'غوكو','فيجيتا','غوهان','ترانكس','غوتين','بيكولو','فريزا','سيل','بوو','بيروس',
'ويس','برولي','جيرين','هيت','كابا','كايل','كاليفلا','زينو','باردوك','راديتز',
'نابا','كريلين','تشاوزو','بولما','فيديل','بان','بلاك',
'زاماسو','تورليس','فيجيتو','ساتان',

'إيتشيغو','روكيا','أوريهيمي','تشاد','أوريو','بياكويا','رينجي','توشيرو','أيزن',
'جين','إيكاكو','زاراكي','ياتشيرو','أونوهانا','مايوري','نيمو','سويفون',
'يورويتشي','كيسكي','شينجي','غريمجو','ألكيورا','نيل','ستارك','هاليبال',
'باراغان','نويتورا','زوماري','يامي','بامبي','جوغرام','يوهاباخ',

'تانجيرو','نيزوكو','زينيتسو','إينوسكي','غيو','شينوبو','رينغوكو','أوزوي',
'ميتسوري','موشيرو','أوباناي','سانيمي','غيومي','كاغايا','أكازا','دوما',
'كوكوشيبو','موزان','روي','غيوكو','داكي','غيوتارو',
'كاناو','غينيا','ماكومو','سابيتو','يوشيرو','تامايو','اوي',

'يوجي','ميغومي','نوبارا','غوجو','سوكونا','غيتو','يوتا','ماكي','توجي','نانامي',
'مي مي','تشوسو','ماهيتو','هانامي','داغون','إينوماكي','باندا','هاكاري',
'كاشيمو','هيغورو','كينجاكو','يوكي','تودو','ميوا','مومو',

'إيرين','ميكاسا','أرمين','ليفاي','هانجي','إروين','راينر','بيرتولت','آني',
'زيك','بيك','غابي','فالكو','جان','كوني','ساشا','هيستوريا','يومير','فلوك',

'ناتسو','لوسي','غراي','إيرزا','ويندي','جيلال','غاجيل','ليفي','ماكاروف',
'ميراجين','لاكسوس','كانا','فريد','إلفمان','ليسانا',
'بانثرلي','شارلي','روغ','ستينغ','يوكينو','كاغورا','أولتير','زيريف',
'مايفيس','أكنولوغيا',

'غون','كيلوا','كورابيكا','ليوريو','هيسوكا','إيلومي','كرولو','فيتان',
'فينكس','نوبوناغا','شالنارك','باكونودا','بيسكيت','كايتو','ميرويم',
'بيتو','بوف','يوبي',

'ناروتو','ساسكي','ساكورا','كاكاشي','إيتاتشي','مادارا','أوبيتو','هاشيراما',
'توبيراما','هيروزين','ميناتو','كوشينا','جيرايا','تسونادي','أوروتشيمارو',
'غارا','نيجي','روك لي','تن تن','شينو','كيبا','هيناتا','تيماري',
'ساي','ياماتو','كيلر بي','ديدارا','ساسوري','كيسامي','كونان','باين',
'ناغاتو','كاغويا','بوروتو','سارادا','ميتسوكي','كاواكي',

'ديكو','باكوغو','شوتو','أوراراكا','تسويو','مومو','كيريشيما','يامي','دينجي','آيزاوا','أول مايت','شينسو','هوكس','إنديفور',
'توغا','شيغاراكي','ستاين','ميريو','تاماكي','نيجيري',

'جينتوكي','شينباتشي','كاغورا','هاسيغاوا','تاكاساغي','كاتسورا','أوكيتا',
'هيجيكاتا','كوندو','كاموي',

'سايتاما','جينوس','تاتسوماكي','بانغ','فوبوكي','جارو','سونيك','بوروس',
'كينغ','مومن رايدر',

'ميليوداس','بان','كينغ','ديان','إليزابيث','إسكانور','ميرلين','غوثر',
'زيلدريس','إستاروسا',

'ريمورو','شونا','شيون','بينيمارو','فيلدورا','ميلم',

'أكوا','ميغومين','داركنيس','كازوما',

'سوبارو','إيميليا','ريم','رام','بياتريس','أوتو',
'يوليوس','راينهارد',

'إيسديث','تاتسومي','أكامي','ليون','شيلسي','بولات','كورومي',

'ليلوك','سوزاكو','سي سي',

'شويا','ناغيسا','كارما','كورو سينسي',

'تاكيميتشي','مايكي','دراكن','باجي','تشيفويو','كازوتورا','كيساكي',
'هانما','إيزانا','كاكوتشو','إينوي','كوكو','تايجو','هاكاي','يوزوها','هينا'
]

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

    const availableQuestions =
        questions.filter(
            (_, index) =>
                !room.usedQuestions.includes(index)
        )

    if (!availableQuestions.length) {

        room.usedQuestions = []

        return getRandomQuestion(room)
    }

    const randomQuestion =
        availableQuestions[
            Math.floor(
                Math.random() *
                availableQuestions.length
            )
        ]

    const originalIndex =
        questions.indexOf(randomQuestion)

    room.usedQuestions.push(originalIndex)

    return randomQuestion
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

    const available =
        imageQuestions.filter(
            (_, index) =>
                !room.usedImages.includes(index)
        )

    if (!available.length) {

        room.usedImages = []

        return getRandomImageQuestion(room)
    }

    const selected =
        available[
            Math.floor(
                Math.random() *
                available.length
            )
        ]

    const originalIndex =
        imageQuestions.indexOf(selected)

    room.usedImages.push(originalIndex)

    return selected
}


async function startQuestion(sock, jid) {

    const room = module.exports.quizData.getQuizRoom(jid)

    if (room.roundsCount >= MAX_ROUNDS) {

        room.quizActive = false

        const ranking = Object.entries(room.scoreboard)
            .sort((a, b) => b[1] - a[1])

        let resultText =
`🏆 انتهت المسابقة

📊 عدد الجولات: ${MAX_ROUNDS}

📈 الترتيب النهائي:

`

        if (ranking.length) {

            ranking.forEach(([userId, points], index) => {

                const medals = ['🥇', '🥈', '🥉']

                resultText +=
`${medals[index] || '🏅'} @${userId.split('@')[0]}
⭐ ${points} نقطة

`

            })

        } else {

            resultText += 'لا يوجد أي فائز.'

        }

        await sock.sendMessage(jid, {
            text: resultText,
            mentions: ranking.map(r => r[0])
        })

        room.roundsCount = 0
room.usedQuestions = []
room.usedImages = []
room.usedRepeats = []

for (const key in room.scoreboard) {
    delete room.scoreboard[key]
}

room.playerProgress = {}
room.answeredUsers.clear()
room.questionSolved = false
room.currentQuestion = null
room.lastMode = -1

        return
    }

    room.answeredUsers.clear()
    room.playerProgress = {}
    room.questionSolved = false
    room.questionStartTime = Date.now()

    room.roundsCount++

    let mode

    do {

        mode = Math.floor(Math.random() * 3)

    } while (mode === room.lastMode)

    room.lastMode = mode

    // سؤال نصي
    if (mode === 0) {

        room.currentQuestion = getRandomQuestion(room)

        return await sock.sendMessage(jid, {
            text:
`🎯 سؤال جديد

❓ ${room.currentQuestion.question}`
        })

    }

    // اكتب التالي
    if (mode === 1) {

        const answers = getRandomRepeatQuestion(room)

        room.currentQuestion = {
            type: 'repeat',
            answers
        }

        return await sock.sendMessage(jid, {
            text:
`✍️ اكتب التالي:

${answers.map(a => `*${a}*`).join(' - ')}`
        })

    }

    // سؤال صورة

    const imageQuestion = getRandomImageQuestion(room)

    console.log('IMAGE QUESTION:', imageQuestion)

    room.currentQuestion = {
        type: 'image',
        answers: imageQuestion.answers
    }

    return await sock.sendMessage(
    jid,
    {
        image: {
            url: imageQuestion.image
        }
    }
)
}

async function startCustomQuestion(sock, jid) {

    const room = module.exports.quizData.getQuizRoom(jid)

    room.answeredUsers.clear()
    room.playerProgress = {}
    room.questionSolved = false
    room.questionStartTime = Date.now()

    // مسابقة SSS (أسئلة فقط)
    if (room.quizMode === "sss") {

        room.currentQuestion = getRandomQuestion(room)

        return await sock.sendMessage(jid, {
            text:
`🎯 سؤال جديد

❓ ${room.currentQuestion.question}`
        })

    }

    // مسابقة الأسئلة (أسئلة فقط)
    if (room.quizMode === "text") {

        room.currentQuestion = getRandomQuestion(room)

        return await sock.sendMessage(jid, {
            text:
`🎯 سؤال جديد

❓ ${room.currentQuestion.question}`
        })

    }

    // مسابقة اكتب التالي
    if (room.quizMode === "repeat") {

        const answers = getRandomRepeatQuestion(room)

        room.currentQuestion = {
            type: "repeat",
            answers
        }

        return await sock.sendMessage(jid, {
            text:
`✍️ اكتب التالي:

${answers.map(a => `*${a}*`).join(" - ")}`
        })

    }

    // مسابقة الصور
    if (room.quizMode === "image") {

        const imageQuestion = getRandomImageQuestion(room)

        room.currentQuestion = {
            type: "image",
            answers: imageQuestion.answers
        }

        return await sock.sendMessage(jid, {
            image: {
                url: imageQuestion.image
            }
        })

    }

}

async function checkAnswer(sock, jid, userId, answer) {
    
    const room = module.exports.quizData.getQuizRoom(jid)

    if (!room.currentQuestion)
        return false

    if (room.questionSolved)
        return false

    const normalizedAnswer = normalize(answer)

    if (!room.playerProgress[userId]) {

        room.playerProgress[userId] = {
            text: ''
        }

    }

    // تجميع جميع رسائل اللاعب
    room.playerProgress[userId].text +=
        ' ' + normalizedAnswer

    const fullText =
        room.playerProgress[userId].text

    const uniqueAnswers = [
        ...new Set(
            room.currentQuestion.answers.map(
                a => normalize(a)
            )
        )
    ]

    if (room.currentQuestion.type === 'repeat') {

        const normalizedText = normalize(fullText)

        const allFound =
            uniqueAnswers.every(
                ans =>
                    normalizedText.includes(ans)
            )

        if (allFound) {

            if (!room.scoreboard[userId]) {
                room.scoreboard[userId] = 0
            }

            room.scoreboard[userId] += 1
            if (
    room.targetScore &&
    room.scoreboard[userId] >= room.targetScore
) {

    room.quizActive = false

    await sock.sendMessage(jid, {
        text:
`🏆 انتهت المسابقة

🥇 الفائز:
@${userId.split("@")[0]}

⭐ وصل إلى ${room.targetScore} نقطة.`,
        mentions: [userId]
    })

    room.targetScore = null
    room.quizMode = "mixed"

    room.usedQuestions = []
    room.usedImages = []
    room.usedRepeats = []

    room.playerProgress = {}
    room.answeredUsers.clear()
    room.questionSolved = false
    room.currentQuestion = null

    return "FINISHED"
}

            room.questionSolved = true

            delete room.playerProgress[userId]

            return true
        }

        return false
    }

    let matchedCount = 0

    for (const correct of uniqueAnswers) {

        const regex =
            new RegExp(`(^|\\s)${correct}(\\s|$)`)

        if (regex.test(fullText)) {
            matchedCount++
        }

    }

    const required =
        room.currentQuestion.required ||
        (
            room.currentQuestion.type === 'multi'
                ? Math.min(3, uniqueAnswers.length)
                : 1
        )

    if (matchedCount >= required) {

    if (!room.scoreboard[userId]) {
        room.scoreboard[userId] = 0
    }

    room.scoreboard[userId] += 1

    if (
        room.targetScore &&
        room.scoreboard[userId] >= room.targetScore
    ) {

        room.quizActive = false

        await sock.sendMessage(jid, {
            text:
`🏆 انتهت المسابقة

🥇 الفائز:
@${userId.split("@")[0]}

⭐ وصل إلى ${room.targetScore} نقطة.`,
            mentions: [userId]
        })

        room.targetScore = null
        room.quizMode = "mixed"

        room.usedQuestions = []
        room.usedImages = []
        room.usedRepeats = []

        room.playerProgress = {}
        room.answeredUsers.clear()
        room.questionSolved = false
        room.currentQuestion = null

        return "FINISHED"
    }

    room.questionSolved = true

    delete room.playerProgress[userId]

    return true
}

    return false
}
module.exports = {
    getRandomQuestion,
    getRandomRepeatQuestion,
    getRandomImageQuestion,

    startQuestion,
    startCustomQuestion,

    checkAnswer,

    quizData: {
        getQuizRoom(jid) {

            if (!quizRooms[jid]) {

                quizRooms[jid] = {
    quizActive: false,
    currentQuestion: null,
    roundsCount: 0,
    scoreboard: {},
    answeredUsers: new Set(),
    usedQuestions: [],
    usedImages: [],
    usedRepeats: [],
    playerProgress: {},
    questionSolved: false,
    questionStartTime: 0,
    lastMode: -1,

    quizMode: "mixed",
    targetScore: null
}

            }

            return quizRooms[jid]
        }
    }
}

