const Player = require('./models/Player')
const characters = require('./characters.json')
const EVENT_GROUPS = [
'120363020823525909@g.us',
'120363409897316453@g.us',
'120363116482407260@g.us'
]

const quickEvents = {

sniper: null,

lucky: null

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
4900
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
10
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

player.pulls +=
reward.amount

await player.save()

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

return
'📦 Legendary Box ×1'
}

if (
reward.type ===
'box_sss_chance'
) {

player.boxes.sss_chance += 1

await player.save()

return
'📦 SSS Chance Box ×1'
}

player.boxes.sss_high += 1

await player.save()

return '📦 SSS High Box ×1'
}

async function startSniper(
sock
) {

const code =
randomCode()

quickEvents.sniper = {

active: true,

code,

winner: null
}

for (
const group of
EVENT_GROUPS
) {

await sock.sendMessage(
group,
{
text:
`🎯 القناص السريع

اكتب:

${code}

أول شخص يرسل الكود يفوز

⏳ 4:30`
}
)
}

setTimeout(
async () => {

if (
!quickEvents.sniper ||
quickEvents.sniper.winner
)
return

for (
const group of
EVENT_GROUPS
) {

await sock.sendMessage(
group,
{
text:
'⌛ انتهت فعالية القناص السريع\n\nلم يفز أحد'
}
)
}

quickEvents.sniper =
null

},
270000
)
}

async function startLucky(
sock
) {

const numbers = []

for (
let i = 0;
i < 15;
i++
) {

numbers.push(
Math.floor(
1 +
Math.random() *
1000
)
)
}

const answer =
numbers[
Math.floor(
Math.random() *
numbers.length
)
]

quickEvents.lucky = {

active: true,

answer,

winner: null
}

for (
const group of
EVENT_GROUPS
) {

await sock.sendMessage(
group,
{
text:
`🎲 رقم الحظ

${numbers.join('\n')}

استخدم:

.تخمين رقم

⏳ 4:30`
}
)
}

setTimeout(
async () => {

if (
!quickEvents.lucky ||
quickEvents.lucky.winner
)
return

for (
const group of
EVENT_GROUPS
) {

await sock.sendMessage(
group,
{
text:
`⌛ انتهت فعالية رقم الحظ

الرقم الصحيح:

${answer}`
}
)
}

quickEvents.lucky =
null

},
270000
)
}

function startQuickEvents(sock) {

if (global.quickEventsStarted) {
    return quickEvents
}

global.quickEventsStarted = true

let lastSniperMinute = null
let lastLuckyMinute = null

const interval = setInterval(async () => {

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

}, 5000)

global.quickEventsInterval = interval

return quickEvents
}

module.exports = {
    quickEvents,
    startQuickEvents,
    startSniper,
    startLucky,
    giveQuickReward
}
