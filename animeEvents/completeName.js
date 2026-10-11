const quizCharacters = require("../quizCharacters.json")
const { giveAnimeReward } = require("./AnimeRewards")
const { nextIndex } = require("./deck")

const states = new Map()

// بعض العناصر في الملف مكتوبة بـ "name" بدل "answers" (مثل بليتش)، نوحدها هنا
const items = quizCharacters
    .map(i => ({
        anime: i.anime,
        answers: Array.isArray(i.answers) && i.answers.length
            ? i.answers
            : (i.name ? [i.name] : [])
    }))
    .filter(i => i.anime && i.answers.length)


function normalize(text) {
    return String(text)
        .toLowerCase()
        .replace(/[جغق]/g, "ق")
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/[^؀-ۿa-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim()
}

// فقط الشخصيات اللي لها اسم من كلمتين أو أكثر (وإلا ما في جزء ناقص)
const pool = items.filter(item =>
    item.answers.some(a => String(a).trim().split(/\s+/).length > 1)
)

function randomCharacter(jid) {

    const list = pool.length ? pool : items

    // يمر على كل الشخصيات مرة مرة، وبعد ما تخلص يعيد من جديد
    const item = list[nextIndex("completeName:" + jid, list.length)]

    const multi = item.answers.filter(
        a => String(a).trim().split(/\s+/).length > 1
    )

    const names = multi.length ? multi : item.answers

    const fullName = names[Math.floor(Math.random() * names.length)]

    return {
        fullName,
        answers: item.answers,
        anime: item.anime
    }

}

async function start(sock, jid) {

    const char = randomCharacter(jid)

    const parts = char.fullName.trim().split(/\s+/)

    // جزء واحد فقط يبقى ظاهر (أول/وسط/آخر الاسم)
    const visibleIndex =
        parts.length > 1
            ? Math.floor(Math.random() * parts.length)
            : -1

    const maskedParts =
        parts.map((p, i) =>
            i === visibleIndex || parts.length === 1
                ? p
                : "_____"
        )

    // الأجزاء الناقصة فقط هي المطلوبة كإجابة
    const squash = t => normalize(t).replace(/\s+/g, "")

    // الإجابات المقبولة: الجزء الناقص فقط، أو الاسم الكامل
    // (ونفس الشيء لكل صيغ الاسم المكتوبة، مثل ساكورا / ساكرا)
    const accepted = new Set()

    for (const variant of char.answers) {

        const vParts = String(variant).trim().split(/\s+/)

        accepted.add(squash(variant))

        if (vParts.length === parts.length && parts.length > 1) {

            accepted.add(
                squash(vParts.filter((_, i) => i !== visibleIndex).join(" "))
            )

        }

    }

    const state = {

        answered: false,

        currentQuestion: {

            fullName: char.fullName,

            accepted,

            question: maskedParts.join(" ")

        },

        timeout: null

    }

    states.set(jid, state)

    await sock.sendMessage(jid, {

        text:
`📝 ═════〔 أكمل الاسم 〕═════

${state.currentQuestion.question}

━━━━━━━━━━━━━━

✍️ للإجابة اكتب الجزء الناقص (أو الاسم الكامل):

.جواب الاسم_الناقص

⏳ الوقت:
5 دقائق`

    })

    state.timeout = setTimeout(async () => {

        if (state.answered)
            return

        await sock.sendMessage(jid, {

            text:
`⌛ انتهى الوقت

✅ الإجابة الصحيحة:

${state.currentQuestion.fullName}`

        })

        states.delete(jid)

    }, 5 * 60 * 1000)

}

async function answer(sock, msg, player, text) {

    const jid = msg.key.remoteJid

    const state = states.get(jid)

    if (!state)
        return { handled: false }

    if (state.answered)
        return { handled: true }

    if (!text.startsWith(".جواب "))
        return { handled: false }

    const userAnswer =
        normalize(text.slice(6)).replace(/\s+/g, "")

    // الجواب لازم يكون الجزء الناقص أو الاسم الكامل بالضبط
    // (كتابة الجزء الظاهر فقط أو جواب فاضي ما تحسب)
    if (!userAnswer || !state.currentQuestion.accepted.has(userAnswer))
        return { handled: true }

    state.answered = true

    clearTimeout(state.timeout)

    const fullName =
        state.currentQuestion.fullName

    states.delete(jid)

    const reward =
        await giveAnimeReward(player)

    return {

        handled: true,

        winner: player.userId,

        reward,

        extraText:
`👤 ${fullName}`

    }

}

module.exports = {

    name: "completeName",

    start,

    answer

}
