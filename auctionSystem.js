const characters = require('./characters.json')
const Player = require('./models/Player')

const auctionGroups = [

'120363020823525909@g.us',
'120363428933463078@g.us',
'120363362807326585@g.us',
    '120363116482407260@g.us'

]

let currentAuction = {

active: false,

character: null,

highestBid: 100000,

highestBidder: null,

endTime: null

}
let auctionTimeout = null

function getAuctionCharacters() {

return characters.filter(

c =>

c.rarity === 'SSS' &&

c.power >= 6000

)

}

function getRandomAuctionCharacter() {

const pool = getAuctionCharacters()

return pool[
Math.floor(
Math.random() * pool.length
)
]

}
async function safeBroadcast(sock, payload) {

for (const group of auctionGroups) {

try {

await sock.sendMessage(group, payload)

} catch (err) {

console.log('Auction send error (' + group + '):', err.message)

}

}

}

function resetAuctionState() {

if (auctionTimeout) {
    clearTimeout(auctionTimeout)
    auctionTimeout = null
}

currentAuction.active = false
currentAuction.character = null
currentAuction.highestBid = 100000
currentAuction.highestBidder = null
currentAuction.endTime = null

}

async function startAuction(sock) {

console.log('🏛️ START AUCTION CALLED')

if (currentAuction.active) return

const character =
getRandomAuctionCharacter()

if (!character) {

console.log(
'❌ لا توجد شخصيات مناسبة للمزاد'
)

return

}

currentAuction.active = true

currentAuction.character = character

currentAuction.highestBid = 100000

currentAuction.highestBidder = null

currentAuction.endTime =
Date.now() +
(15 * 60 * 1000)

currentAuction.auctionGroups =
auctionGroups

// ⏱️ نضبط المؤقت أولاً قبل أي إرسال، فما يعلق المزاد لو فشل قروب
if (auctionTimeout) {
    clearTimeout(auctionTimeout)
}

auctionTimeout = setTimeout(
() => {
finishAuction(sock).catch(err => {
console.log('finishAuction Error:', err)
resetAuctionState()
})
},
15 * 60 * 1000
)

try {

const text =

`🏛️ مزاد جديد

👤 ${character.name}

🌟 ${character.rarity}
⚔️ ${character.power}

💰 السعر الحالي:
100,000

📈 أقل زيادة:
150,000

⏳ المدة:
15 دقيقة

استخدم:
.مزايدة المبلغ`

await safeBroadcast(sock, { text })

} catch (err) {

console.log('startAuction Error:', err)
resetAuctionState()

}

}

async function finishAuction(sock) {

console.log('🏁 FINISH AUCTION CALLED')

if (!currentAuction.active)
return

// نأخذ نسخة من البيانات ثم نصفّر الحالة بـ finally مهما حصل
const character = currentAuction.character
const bidderId = currentAuction.highestBidder
const finalBid = currentAuction.highestBid

try {

if (!bidderId) {

await safeBroadcast(sock, {
text:

`⌛ انتهى المزاد

❌ لم يزايد أحد

👤 ${character.name}`
})

return

}

const winner =
await Player.findOne({ userId: bidderId })

if (
winner &&
winner.money >= finalBid
) {

winner.money -= finalBid

winner.characters.push(character)

await winner.save()

await safeBroadcast(sock, {
text:

`🏆 انتهى المزاد

👑 الفائز:

@${winner.userId.split('@')[0]}

💰 السعر النهائي:
${finalBid.toLocaleString()}

🎁 الشخصية:

${character.name}`
,
mentions: [
winner.userId
]
})

} else {

await safeBroadcast(sock, {
text:

`⌛ انتهى المزاد

⚠️ الفائز ما عنده رصيد كافي لدفع المبلغ، أُلغي المزاد

👤 ${character.name}`
})

}

} catch (err) {

console.log('finishAuction Error:', err)

} finally {

resetAuctionState()

}

}

module.exports = {

currentAuction,

auctionGroups,

getRandomAuctionCharacter,

startAuction,

finishAuction

}
