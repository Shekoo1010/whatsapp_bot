const crypto = require('crypto')
const Player = require('./models/Player')
const characters = require('./characters.json')
const repeatQuestions = require('./repeatQuestions')
const EVENT_GROUPS = [
'120363020823525909@g.us',
    '120363400448225715@g.us',
    '120363428933463078@g.us',
'120363116482407260@g.us',
    '120363362807326585@g.us'
]

const quickEvents = {

sniper: null,

lucky: null,

typer: null

}

// ═══════════ زخرفة رسائل الفعاليات ═══════════
const DECOR_LINE = '✦ ━━━━━━━━━━━━━━━ ✦'

function decorHeader(icon, title) {

return `${icon} ═══〔 ${title} 〕═══ ${icon}`
}

function buildStartMessage(icon, title, body, footer) {

return `${decorHeader(icon, title)}

${DECOR_LINE}

${body}

${DECOR_LINE}

${footer}

⏳ الوقت ➤ ${'{TIME}'}`
}

function buildWinMessage(mention, eventTitle, rewardText) {

return `${decorHeader('🎉', 'مبروك الفوز')}

👑 الفائز ➤ ${mention}
🏆 الفعالية ➤ ${eventTitle}

🎁 ━━━〔 الجائزة 〕━━━ 🎁

${rewardText}

✨ بالتوفيق في الفعاليات القادمة ✨`
}

function buildEndMessage(eventTitle, extra) {

return `${decorHeader('⌛', 'انتهى الوقت')}

انتهت فعالية ${eventTitle}
😔 لم يفز أحد${extra ? `

${extra}` : ''}`
}

function randomCode() {

const chars =
'ABCDEFGHJKLMNPQRSTUVWXYZ123456789'

let code = ''

for (
let i = 0;
i < 5;
i++
) {

code += chars[
Math.floor(
Math.random() *
chars.length
)
]
}

return code
}

function randomReward() {

const roll =
Math.random() * 100

if (roll < 40) {

return {
type: 'money',
amount:
Math.floor(
100000 +
Math.random() *
900000
)
}
}

if (roll < 65) {

return {
type: 'xp',
amount:
Math.floor(
100 +
Math.random() *
1901
)
}
}

if (roll < 80) {

return {
type: 'tickets',
amount:
Math.floor(
1 +
Math.random() *
5
)
}
}

if (roll < 90) {

return {
type: 'excellent'
}
}

if (roll < 95) {

return {
type: 'legendary'
}
}

if (roll < 98) {

return {
type: 'box_legendary'
}
}

if (roll < 99) {

return {
type: 'box_sss_chance'
}
}

return {
type: 'box_sss_high'
}
}

async function giveQuickReward(
userId
) {
const player =
await Player.findOne({
userId
})

if (!player)
return null

    if (!player.boxes) {

player.boxes = {
basic: 0,
rare: 0,
epic: 0,
legendary: 0,
sss_chance: 0,
sss_high: 0
}

}

const reward =
randomReward()

if (
reward.type === 'money'
) {

player.money +=
reward.amount

await player.save()

return `💰 ${reward.amount.toLocaleString()} ذهب`
}

if (
reward.type === 'xp'
) {

player.xp +=
reward.amount

await player.save()

return `📚 ${reward.amount} XP`
}

if (
reward.type === 'tickets'
) {

// حفظ آمن: $inc ذري (ما يتأثر بأي حفظ متزامن ولا يتحول لـ NaN لو pulls ما كانت موجودة)
try {

await Player.updateOne(
{ userId },
{ $inc: { pulls: reward.amount } }
)

} catch (err) {

console.log('Quick reward pulls $inc error:', err)

player.pulls =
(player.pulls || 0) +
reward.amount

await player.save()

}

return `🎟️ ${reward.amount} تذكرة`
}

if (
reward.type === 'excellent'
) {

const pool =
characters.filter(
c =>
c.rarity ===
'ممتاز'
)

const char =
pool[
Math.floor(
Math.random() *
pool.length
)
]

player.characters.push({
...char
})

await player.save()

return `⭐ ${char.name}`
}

if (
reward.type === 'legendary'
) {

const pool =
characters.filter(
c =>
c.rarity ===
'اسطوري'
)

const char =
pool[
Math.floor(
Math.random() *
pool.length
)
]

player.characters.push({
...char
})

await player.save()

return `🌟 ${char.name}`
}

if (
reward.type ===
'box_legendary'
) {

player.boxes.legendary += 1

await player.save()

return '📦 Legendary Box ×1'
}

if (
reward.type ===
'box_sss_chance'
) {

player.boxes.sss_chance += 1

await player.save()

return '📦 SSS Chance Box ×1'
}

player.boxes.sss_high += 1

await player.save()

return '📦 SSS High Box ×1'
}


// 📣 إرسال رسالة الفعالية لكل القروبات بشكل معزول:
// فشل الإرسال لقروب واحد (البوت مو موجود فيه / معرّف خطأ / ضغط واتساب)
// ما يوقف الإرسال لباقي القروبات، ولا يمنع جدولة نهاية الفعالية.
// كان الكود القديم يرسل بحلقة await بدون try/catch: أول قروب يفشل = الباقي ما يوصلهم
// شي، والفعالية تبقى معلّقة (quickEvents.X != null) فما تشتغل الفعالية التالية أبداً.
async function broadcastToGroups(sock, text, label) {

const results = await Promise.allSettled(
EVENT_GROUPS.map(group =>
Promise.resolve().then(() => sock.sendMessage(group, { text }))
)
)

const failed = []

results.forEach((r, i) => {
if (r.status === 'rejected') {
failed.push(EVENT_GROUPS[i])
console.log(
`❌ quick event [${label}] send failed:`,
EVENT_GROUPS[i],
r.reason?.message || r.reason
)
}
})

console.log(
`📣 quick event [${label}] sent to ${EVENT_GROUPS.length - failed.length}/${EVENT_GROUPS.length} groups`
)

return failed
}

// ينهي الفعالية: يرسل "انتهى الوقت" فقط للقروبات اللي ما فاز فيها أحد
async function endQuickEvent(sock, key, ev, title, extra) {

if (quickEvents[key] !== ev) return

// نقفلها أولاً عشان ما تُقبل إجابات أثناء إرسال الرسائل
quickEvents[key] = null

for (const group of EVENT_GROUPS) {

if (ev.winners && ev.winners[group]) continue

try {
await sock.sendMessage(group, {
text: buildEndMessage(title, extra)
})
} catch (err) {
console.log('quick event end send error:', group, err?.message || err)
}

}

}

async function startSniper(
sock
) {

const code =
randomCode()

const ev = quickEvents.sniper = {

active: true,

code,

winners: {}
}

await broadcastToGroups(
sock,
buildStartMessage(
'🎯',
'القناص السريع',
`✍️ اكتب الكود التالي:

*${code}*`,
'⚡ أول شخص بكل قروب يرسله يفوز'
).replace('{TIME}', '4:30'),
'sniper'
)

setTimeout(
() => endQuickEvent(sock, 'sniper', ev, 'القناص السريع'),
270000
)
}

async function startLucky(
sock
) {

const NUMBERS_COUNT = 6

const numbersSet = new Set()

while (numbersSet.size < NUMBERS_COUNT) {

numbersSet.add(
crypto.randomInt(1, 1001)
)

}

const numbers = [...numbersSet]

// مكان الرقم الصحيح عشوائي بين الـ 6 (أي موضع من 1 إلى 6)
const answer =
numbers[
crypto.randomInt(
0,
numbers.length
)
]

const ev = quickEvents.lucky = {

active: true,

answer,

winners: {}
}

await broadcastToGroups(
sock,
buildStartMessage(
'🎲',
'رقم الحظ',
`🔢 *${numbers.join('  ┃  ')}*

🍀 واحد منها فقط هو الصحيح!`,
`✍️ اكتب الرقم بنقطة قبله
مثال: .99`
).replace('{TIME}', '4:30'),
'lucky'
)

setTimeout(
() => endQuickEvent(
sock, 'lucky', ev, 'رقم الحظ',
`🔑 الرقم الصحيح ➤ *${answer}*`
),
270000
)
}

// مقارنة حرفية (غون ≠ جون) مع تسامح فقط بالهمزات على الألف: إ/أ/آ = ا
// (إيروين = ايروين). نشيل أيضاً المسافات الزايدة والرموز غير المرئية
// اللي يضيفها واتساب أحياناً.
function normalizeTyper(str) {

return String(str || '')
.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
.replace(/[أإآٱ]/g, 'ا')
.replace(/\s+/g, ' ')
.trim()
}

// كل الترتيبات الممكنة للأسماء (الجواب يُقبل بأي ترتيب)
function typerPermutations(arr) {

if (arr.length <= 1) return [arr]

const out = []

arr.forEach((item, i) => {

const rest = [
...arr.slice(0, i),
...arr.slice(i + 1)
]

typerPermutations(rest).forEach(p => {
out.push([item, ...p])
})

})

return out
}

let lastTyperKey = null

async function startTyper(
sock
) {

const pool = [
...new Set(repeatQuestions)
]

let words
let key

do {

// عدد الأسماء عشوائي: 1 أو 2 أو 3
const count =
crypto.randomInt(1, 4)

const picked = new Set()

while (picked.size < count) {

picked.add(
pool[
crypto.randomInt(
0,
pool.length
)
]
)

}

words = [...picked]

key = words.join('|')

} while (
key === lastTyperKey
)

lastTyperKey = key

const ev = {

active: true,

words,

// الأجوبة المقبولة: الأسماء كلها بأي ترتيب مفصولة بمسافة
answers: [
...new Set(
typerPermutations(words).map(
p => normalizeTyper(p.join(' '))
)
)
],

winners: {}

}

quickEvents.typer = ev

const example =
'.' + words.join(' ')

await broadcastToGroups(
sock,
buildStartMessage(
'⌨️',
'اكتب التالي',
`📝 *${words.join(' ')}*`,
`${words.length > 1
? '⚡ اكتبها كلها في رسالة واحدة بأي ترتيب'
: '⚡ أول شخص بكل قروب يكتبها يفوز'}

✍️ مثال للجواب:
${example}`
).replace('{TIME}', '4:35'),
'typer'
)

setTimeout(
() => endQuickEvent(sock, 'typer', ev, 'اكتب التالي'),
275000
)
}

// دقيقة بدء فعالية اكتب التالي (القناص 25، رقم الحظ 30)
const TYPER_MINUTE = 45

function startQuickEvents(sock) {

// الحارس يعتمد على وجود المؤقت نفسه (index.js يعيّن quickEventsStarted = true
// قبل ما ينادي هذي الدالة، فلو فحصناه هنا ترجع فوراً ولا يشتغل المؤقت أبداً)
if (global.quickEventsInterval) {
    return quickEvents
}

let lastSniperMinute = null
let lastLuckyMinute = null
let lastTyperMinute = null

const interval = setInterval(async () => {

try {

    const now = new Date()

    const minute = now.getMinutes()
    const hour = now.getHours()

    const sniperKey = `${hour}:${minute}`

    if (
        minute === 25 &&
        lastSniperMinute !== sniperKey &&
        !quickEvents.sniper
    ) {

        lastSniperMinute = sniperKey

        console.log('🎯 SNIPER EVENT STARTED')

        await startSniper(sock)
    }

    const luckyKey = `${hour}:${minute}`

    if (
        minute === 30 &&
        lastLuckyMinute !== luckyKey &&
        !quickEvents.lucky
    ) {

        lastLuckyMinute = luckyKey

        console.log('🎲 LUCKY EVENT STARTED')

        await startLucky(sock)
    }

    const typerKey = `${hour}:${minute}`

    if (
        minute === TYPER_MINUTE &&
        lastTyperMinute !== typerKey &&
        !quickEvents.typer
    ) {

        lastTyperMinute = typerKey

        console.log('⌨️ TYPER EVENT STARTED')

        await startTyper(sock)
    }

} catch (err) {
    console.error('quick events tick error:', err)
}

}, 5000)

global.quickEventsInterval = interval

return quickEvents
}

module.exports = {
    quickEvents,
    QUICK_EVENT_GROUPS: EVENT_GROUPS,
    startQuickEvents,
    startSniper,
    startLucky,
    startTyper,
    normalizeTyper,
    buildWinMessage,
    giveQuickReward
}
