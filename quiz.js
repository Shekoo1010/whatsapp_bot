const questions =
    require('./questions')

const imageQuestions =
    require('./imageQuestions')

const DEFAULT_MAX_ROUNDS = 50

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

// ⏱️🩺 نظام تصحيح التوقيت — يحفظ لحظتين مختلفتين لبداية الجولة:
// 1) room.questionStartTime  → الساعة المحلية لجهاز البوت (Date.now())،
//    هذي اللي تُستخدم لترتيب مين أسرع بين المتسابقين (تحتاج دقة ملي ثانية).
// 2) room.questionStartWaTs  → الطابع الزمني اللي يحطه واتساب نفسه على
//    رسالة السؤال (msg.messageTimestamp، بالثانية، نحوّلها مللي ثانية).
//    هذا مرجع "خارجي" مستقل عن سرعة أو ازدحام سيرفر البوت.
// الفرق بين الاثنين (bias) يُستخدم بعدين وقت الإجابة عشان نكتشف لو
// سيرفر البوت كان "متأخر" وقت معالجة رسالة معينة (مثلاً مشغول برفع
// صورة) ونطرح هذا التأخير الزائد من وقت اللاعب — بدل ما نظلمه.
// يحوّل messageTimestamp (بالثانية، من واتساب) إلى ملي ثانية.
// يرجع 0 لو مو متوفر (بعض إصدارات مكتبة واتساب ما ترجعه أحياناً)
// عشان بقية الكود يعرف يتجاهل التصحيح بأمان بدل ما يحسب غلط.
function waTimestampMs(obj) {

    const waSeconds = Number(obj?.messageTimestamp || 0)

    return waSeconds > 0 ? waSeconds * 1000 : 0
}

function stampQuestionStart(room, sent) {

    room.questionStartTime = Date.now()

    room.questionStartWaTs = waTimestampMs(sent)
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

    const maxRounds = room.maxRounds || DEFAULT_MAX_ROUNDS

if (room.roundsCount >= maxRounds) {

        room.quizActive = false

        const ranking = Object.entries(room.scoreboard)
            .sort((a, b) => b[1] - a[1])

        let resultText =
`🏆 انتهت المسابقة

📊 عدد الجولات: ${maxRounds}

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
room.maxRounds = DEFAULT_MAX_ROUNDS

// ملاحظة: ما نصفّر usedQuestions / usedImages / usedRepeats هنا عمداً
// عشان المسابقة الجديدة تكمل من نفس المخزون ولا تكرر نفس الأسئلة/الصور
// اللي طلعت بالمسابقة اللي انتهت. التصفير التلقائي يصير بس لما يخلص
// كامل المخزون (داخل getRandomQuestion / getRandomImageQuestion / getRandomRepeatQuestion)

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

const sent = await sock.sendMessage(jid, {
    text: `🎯 سؤال جديد

❓ ${room.currentQuestion.question}`
})

stampQuestionStart(room, sent) // ⏱️ يسجل الوقت المحلي + طابع واتساب لحظة تأكد إرسال السؤال

return
        

    }

    // اكتب التالي
    if (mode === 1) {

        const answers = getRandomRepeatQuestion(room)

        room.currentQuestion = {
            type: 'repeat',
            answers
        }

        const sent = await sock.sendMessage(jid, {
    text: `✍️ اكتب التالي:

${answers.map(a => `*${a}*`).join(" - ")}`
})

stampQuestionStart(room, sent) // ⏱️ يسجل الوقت المحلي + طابع واتساب لحظة تأكد إرسال السؤال

return

    }

    // سؤال صورة

    const imageQuestion = getRandomImageQuestion(room)

    console.log('IMAGE QUESTION:', imageQuestion)

    room.currentQuestion = {
        type: 'image',
        answers: imageQuestion.answers
    }

    const sent = await sock.sendMessage(
    jid,
    {
        image: {
            url: imageQuestion.image
        }
    }
)

stampQuestionStart(room, sent) // ⏱️ يسجل الوقت المحلي + طابع واتساب لحظة تأكد إرسال السؤال

return
}

async function startCustomQuestion(sock, jid) {

    const room = module.exports.quizData.getQuizRoom(jid)

    room.answeredUsers.clear()
    room.playerProgress = {}
    room.questionSolved = false

    // مسابقة SSS (أسئلة فقط)
    if (room.quizMode === "sss") {

        room.currentQuestion = getRandomQuestion(room)

        const sent = await sock.sendMessage(jid, {
            text:
`🎯 سؤال جديد

❓ ${room.currentQuestion.question}`
        })

        stampQuestionStart(room, sent) // ⏱️ يسجل الوقت المحلي + طابع واتساب لحظة تأكد إرسال السؤال

        return
    }

    // مسابقة الأسئلة
    if (room.quizMode === "text") {

        room.currentQuestion = getRandomQuestion(room)

        const sent = await sock.sendMessage(jid, {
            text:
`🎯 سؤال جديد

❓ ${room.currentQuestion.question}`
        })

        stampQuestionStart(room, sent) // ⏱️ يسجل الوقت المحلي + طابع واتساب لحظة تأكد إرسال السؤال

        return
    }

    // مسابقة اكتب التالي
    if (room.quizMode === "repeat") {

        const answers = getRandomRepeatQuestion(room)

        room.currentQuestion = {
            type: "repeat",
            answers
        }

        const sent = await sock.sendMessage(jid, {
            text:
`✍️ اكتب التالي:

${answers.map(a => `*${a}*`).join(" - ")}`
        })

        stampQuestionStart(room, sent) // ⏱️ يسجل الوقت المحلي + طابع واتساب لحظة تأكد إرسال السؤال

        return
    }

    // مسابقة الصور
    if (room.quizMode === "image") {

        const imageQuestion = getRandomImageQuestion(room)

        room.currentQuestion = {
            type: "image",
            answers: imageQuestion.answers
        }

        const sent = await sock.sendMessage(jid, {
            image: {
                url: imageQuestion.image
            }
        })

        stampQuestionStart(room, sent) // ⏱️ يسجل الوقت المحلي + طابع واتساب لحظة تأكد إرسال السؤال

        return
    }

}

// ⏱️🩺 يحسب "الوقت الحقيقي التقريبي" للفائز، ويصحّحه لو فيه دليل واضح
// إن سيرفر البوت نفسه كان متأخر وقت معالجة رسالته (مو تأخر اللاعب).
//
// الفكرة: عندنا مرجعين مستقلين للوقت:
//  - الساعة المحلية (Date.now) → دقيقة جداً (ملي ثانية) لكن ممكن
//    تتأثر بازدحام سيرفر البوت (خصوصاً وقت إرسال صورة).
//  - طابع واتساب نفسه (messageTimestamp) → مستقل عن سيرفر البوت
//    تماماً، لكن دقته بالثانية فقط (يقرّب/ينزّل الكسور).
//
// نحسب "الانحراف المحلي" (bias) وقت إرسال السؤال، ونفس الانحراف وقت
// وصول إجابة الفائز. لو الانحراف وقت الإجابة أكبر بشكل واضح (يعني
// سيرفر البوت تأخر أكثر من المعتاد بمعالجة هذي الرسالة بالذات) نطرح
// بس الفرق الزائد ده من الوقت المعروض. ما نطرح شي لو الفرق بسيط
// (ممكن يكون بس ضجيج التقريب للثانية بطابع واتساب، مو تأخير حقيقي).
function computeElapsedSeconds(room, winner) {

    const rawElapsedMs =
        winner.answerTimestamp - room.questionStartTime

    const result = {
        rawElapsedMs,
        correctedElapsedMs: rawElapsedMs,
        biasAtSend: null,
        biasAtReceive: null,
        extraLagMs: 0,
        corrected: false
    }

    // بدون طابع واتساب على أحد الطرفين (السؤال أو الإجابة) ما نقدر
    // نصحح بثقة — نرجع الرقم الخام كما هو بدون أي تعديل.
    if (!room.questionStartWaTs || !winner.msgWaTs) {
        return result
    }

    const CORRECTION_MIN_MS = 350   // أقل من كذا = يعتبر ضجيج تقريب، نتجاهله
    const CORRECTION_MAX_MS = 1200  // أعلى حد نطرحه دفعة وحدة (أمان)

    const biasAtSend =
        room.questionStartTime - room.questionStartWaTs

    const biasAtReceive =
        winner.answerTimestamp - winner.msgWaTs

    const extraLag = biasAtReceive - biasAtSend

    result.biasAtSend = biasAtSend
    result.biasAtReceive = biasAtReceive

    if (extraLag > CORRECTION_MIN_MS) {

        const applied = Math.min(extraLag, CORRECTION_MAX_MS)

        result.correctedElapsedMs = Math.max(0, rawElapsedMs - applied)
        result.extraLagMs = applied
        result.corrected = true
    }

    return result
}

function scheduleWinnerResolution(sock, jid, room) {

    if (room.pendingTimer) return

    room.pendingTimer = setTimeout(async () => {

        const candidates = room.pendingAnswers
        room.pendingAnswers = []
        room.pendingTimer = null

        if (!candidates.length) return

        candidates.sort(
            (a, b) => a.answerTimestamp - b.answerTimestamp
        )

        const winner = candidates[0]

        if (!room.scoreboard[winner.userId]) {
            room.scoreboard[winner.userId] = 0
        }

        room.scoreboard[winner.userId] += 1
        room.lastAnswerTimestamp = winner.answerTimestamp
        room.questionSolved = true

        if (
            room.targetScore &&
            room.scoreboard[winner.userId] >= room.targetScore
        ) {

            room.quizActive = false

            await sock.sendMessage(jid, {
                text:
`🏆 انتهت المسابقة

🥇 الفائز:
@${winner.userId.split("@")[0]}

⭐ وصل إلى ${room.targetScore} نقطة.`,
                mentions: [winner.userId]
            })

            room.targetScore = null
            room.quizMode = "mixed"

            // ما نصفّر usedQuestions / usedImages / usedRepeats هنا عمداً
            // عشان المسابقة الجديدة تكمل من نفس المخزون ولا تكرر نفس
            // الأسئلة/الصور اللي طلعت بهذي المسابقة

            room.playerProgress = {}
            room.answeredUsers.clear()
            room.currentQuestion = null

            return
        }

        const timing = computeElapsedSeconds(room, winner)
        const seconds = timing.correctedElapsedMs / 1000

        if (process.env.DEBUG) {
            const poolType =
                room.currentQuestion?.type === 'repeat' ? 'writing' :
                room.currentQuestion?.type === 'image' ? 'image' :
                'question'

            console.log(
                `🔍 [توقيت] poolType=${poolType}\n` +
                `sender=${winner.userId} rawElapsed=${timing.rawElapsedMs}ms\n` +
                `elapsed(بعد التصحيح)=${timing.correctedElapsedMs}ms` +
                (timing.corrected ? ` (طرحنا ${timing.extraLagMs}ms تأخير داخلي)` : ' (بدون تصحيح)') + `\n` +
                `roundStartTime=${room.questionStartTime}\n` +
                `serverNow=${winner.answerTimestamp}\n` +
                `waTimestamp السؤال=${room.questionStartWaTs || 'غير متوفر'}\n` +
                `waTimestamp الإجابة=${winner.msgWaTs || 'غير متوفر'}`
            )
        }

        await sock.sendMessage(
            jid,
            {
                text:
`🎉 إجابة صحيحة!

⏱️ الوقت: ${seconds.toFixed(2)} ثانية

⭐ +1 نقطة
📊 نقاطك: ${room.scoreboard[winner.userId]} نقطة`
            },
            winner.msg ? { quoted: winner.msg } : {}
        )

        setTimeout(async () => {

            if (!room.quizActive) return

            if (room.quizMode === "mixed") {
                await startQuestion(sock, jid)
            } else {
                await startCustomQuestion(sock, jid)
            }

        }, 2000)

    }, 400)

}

async function checkAnswer(sock, jid, userId, answer, answerTimestamp = Date.now(), msg = null) {
    
    const room = module.exports.quizData.getQuizRoom(jid)
    console.log("========== CHECK ANSWER ==========");
console.log("User:", userId);
console.log("Answer:", answer);
console.log("AnswerTimestamp:", answerTimestamp);
console.log("QuestionSolved:", room.questionSolved);
console.log("LastAnswerTimestamp:", room.lastAnswerTimestamp);
console.log("==================================");

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

        // ⚠️ لازم كل كلمة تكون منفصلة بمسافة (وليست ملتصقة بكلمة ثانية)
        // عشان "تاكيميتشيهيت" ما تُحسب صحيحة لكلمتين "تاكيميتشي" و"هيت"
        const allFound =
            uniqueAnswers.every(ans => {
                const regex =
                    new RegExp(`(^|\\s)${ans}(\\s|$)`)

                return regex.test(normalizedText)
            })

        if (allFound) {

            room.pendingAnswers.push({
                userId,
                answerTimestamp,
                msgWaTs: waTimestampMs(msg),
                msg
            })

            delete room.playerProgress[userId]

            scheduleWinnerResolution(sock, jid, room)

            return "PENDING"
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

    room.pendingAnswers.push({
        userId,
        answerTimestamp,
        msgWaTs: waTimestampMs(msg),
        msg
    })

    delete room.playerProgress[userId]

    scheduleWinnerResolution(sock, jid, room)

    return "PENDING"
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
    questionStartWaTs: 0,
    lastMode: -1,

    quizMode: "mixed",
    targetScore: null,
    maxRounds: DEFAULT_MAX_ROUNDS,

    pendingAnswers: [],
    pendingTimer: null,
    lastAnswerTimestamp: 0
}

            }

            return quizRooms[jid]
        }
    }
}

