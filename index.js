const fs = require('fs')
const {
    announceRaid,
    startRaidScheduler
} = require('./systems/raidManager')

const {
    attackRaid,
    getRaidInfo,
    isRaidRunning
} = require('./systems/raidBattle')
const {
    createEXReward,
    createURIIIReward,
    createURIReward
} = require('./systems/RollRewards')
const Banner = require('./models/Banner')
const {
    refreshBanner
} = require('./systems/bannerManager')
// =========================
// Co-Op System
// =========================
const equipmentSystem = require('./systems/equipmentSystem')
const CoOp = require('./models/CoOp')
const coopManager = require('./systems/coopManager')

const coopBattle = require('./systems/coopBattle')
const heartQuiz = require("./heartQuiz")
async function cleanEmptyClans() {

    const Clan = require("./models/Clan")

    const clans = await Clan.find()

    for (const clan of clans) {

        if (!clan.members || clan.members.length === 0) {

            console.log(`Deleted empty clan: ${clan.name}`)

            await Clan.deleteOne({
                clanId: clan.clanId
            })

        }

    }

}

const useAttackAbilities = require('./systems/useAttackAbilities')
const useEXAbilities = require('./utils/useEXAbilities')
const getPlayerPower = require('./utils/getPlayerPower')
const { getClanShop } = require('./clanShop')
const Clan = require("./models/Clan")

async function resetClanWars() {

    try {

        const now = new Date()

        const riyadh = new Date(
            now.toLocaleString("en-US", {
                timeZone: "Asia/Riyadh"
            })
        )

        if (
            riyadh.getHours() === 0 &&
            riyadh.getMinutes() === 0
        ) {

            await Clan.updateMany(
                {},
                {
                    $set: {
                        dailyWars: 5,
                        lastWarReset: riyadh.toISOString().slice(0, 10)
                    }
                }
            )

            console.log("✅ تم إعادة محاولات حروب العشائر.")

        }

    }

    catch (err) {

        console.log(err)

    }

}

// يفحص كل دقيقة
setInterval(resetClanWars, 60000)
const updateClanPower =
require('./utils/updateClanPower')
const Player = require('./models/Player')
const commands = require('./commands/index')
const pendingSellConfirm =
global.pendingSellConfirm ||
(global.pendingSellConfirm = new Map())
if (fs.existsSync('./auth')) {
    fs.rmSync('./auth', {
        recursive: true,
        force: true
    })
}
const {
startAuction,
currentAuction
} = require('./auctionSystem')
function scheduleAuction(sock) {

if (global.auctionInterval) {
    return
}

global.auctionInterval = setInterval(async () => {

const now = new Date()

const minutes = now.getMinutes()

const hours = now.getHours()

if (
minutes === 0 &&
hours % 2 === 0 &&
!currentAuction.active
) {

try {

await startAuction(sock)

} catch (err) {

console.log(
'Auction Error:',
err
)

}

}

}, 60000)

}

function getSaudiDate() {

return new Date()
.toLocaleDateString(
'en-CA',
{
timeZone: 'Asia/Riyadh'
}
)

}

async function resetDailyMissions(player) {

const today = getSaudiDate()

if (
!player.dailyMissions ||
player.dailyMissions.lastReset !== today
) {

player.dailyMissions = {

login: false,
wins: 0,
bossKills: 0,
pulls: 0,
gotSSS: false,
gotLegendary: 0,
claimed: false,
lastReset: today

}

await player.save()
}

return player
}


const allowedGroups = [

'120363020823525909@g.us',

'120363400448225715@g.us',

'120363116482407260@g.us'

]
const {
quickEvents,
giveQuickReward,
startQuickEvents
} = require('./quickEvents')

const disabledGroups = new Set()

const kingdomStages = [

{
    name: "🏰 بوابة المملكة",
    power: 4500,
    reward: 100000
},

{
    name: "⚔️ حرس العاصمة",
    power: 5000,
    reward: 120000
},

{
    name: "🛡️ الفرسان الملكيون",
    power: 5500,
    reward: 140000
},

{
    name: "👑 قاعة العرش",
    power: 6000,
    reward: 160000
},

{
    name: "🏹 أبراج المراقبة",
    power: 6500,
    reward: 180000
},

{
    name: "🔥 ساحة الحرب الكبرى",
    power: 7000,
    reward: 200000
},

{
    name: "🌑 الحصن المظلم",
    power: 7500,
    reward: 240000
},

{
    name: "⚜️ مقر النبلاء",
    power: 8000,
    reward: 260000
},

{
    name: "🐉 التنين الحارس",
    power: 8500,
    reward: 280000
},

{
    name: "👑 العرش الإمبراطوري",
    power: 9000,
    reward: 320000
}

]
const battleState =
    require('./battleSystem')

function getFlagBar(progress) {

    const filled =
        Math.floor(progress / 10)

    const empty =
        10 - filled

    return (
        '█'.repeat(filled) +
        '░'.repeat(empty)
    )
}
process.on('uncaughtException', err => {
    console.error('UNCAUGHT:')
    console.error(err)
})

process.on('unhandledRejection', err => {
    console.error('REJECTION:')
    console.error(err)
})

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')


const ffmpeg =
    require('fluent-ffmpeg')

const ffmpegPath =
    require('ffmpeg-static')

ffmpeg.setFfmpegPath(
    ffmpegPath
)
const pkg = require('./package.json')

console.log(
  'PACKAGE JSON BAILEYS:',
  pkg.dependencies['@whiskeysockets/baileys']
)

console.log(
  'BAILEYS VERSION:',
  require('@whiskeysockets/baileys/package.json').version
)
const {
    Sticker,
    StickerTypes
} = require(
    'wa-sticker-formatter'
)

const {
    downloadMediaMessage
} = require(
    '@whiskeysockets/baileys'
)

const {
    startQuestion,
    startCustomQuestion,
    checkAnswer,
    quizData
} = require('./quiz')
const path = require('path')
const ownerId = "175114725408817"

function isOwner(msg) {
    const sender =
        (msg.key.participant || msg.key.remoteJid).split("@")[0]

    return sender === ownerId
}
const {
    startAutoEvents,
    resetAutoEvents
} = require('./autoEvents')
const axios = require('axios')
const eventManager =
    require('./eventManager')
const pendingSwaps = new Map()
const Waifu = require('./models/Waifu')
const {
    checkRespawn
} = require(
    './systems/beastManager'
)
const { calculateDamageAdvanced } = require('./utils/pvp')
const express = require("express")
const restoreAniListImages =
    require('./restoreAniListImages')
const QRCode = require("qrcode")
const cooldowns = new Map()
const urAbilities =
    require('./urAbilities')
function getRandomAbilities(count = 7) {

    const pool = [...urAbilities]
    const result = []

    while (result.length < count && pool.length) {

        const totalChance =
            pool.reduce((sum, a) => sum + a.chance, 0)

        let random =
            Math.random() * totalChance

        let index = 0

        for (let i = 0; i < pool.length; i++) {

            random -= pool[i].chance

            if (random <= 0) {

                index = i
                break

            }

        }

        result.push(pool[index])

        pool.splice(index, 1)

    }

    return result

}


const cheerio = require("cheerio");

console.log("cheerio loaded OK");
const WaifuTrade =
    require('./models/WaifuTrade')
console.log('Bot starting...')
const importGamesWaifus =
    require('./importGamesWaifus')
const mongoose = require('mongoose')
const lastRolls = new Map()
const PvP = require('./models/PvP')

const Beast =
require('./database/Beast')
const beasts =
require('./systems/beasts')

const { playerAbilities } = require('./systems/playerAbilities')
const {
    getKuramaAbility,
    getJuubiAbility
} = require('./systems/beastAbilities')

const beastRewards =
require(
    './systems/beastRewards'
)
const bossAbilities = require('./bossAbilities')


const WaifuPlayer =
    require('./models/WaifuPlayer')

const bosses = require('./bosses')
const xo =
    require('./xo')
const characters = require('./characters.json')


function normalizeName(name) {

    return name
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[قغج]/g, 'ق')
        .replace(/[ؤئ]/g, 'ء')
        .replace(/\s+/g, '')
        .trim()
}

async function askGemini(prompt) {

    try {

        const { data } = await axios.post(

            "https://api.groq.com/openai/v1/chat/completions",

            {

                model: "openai/gpt-oss-120b",

                messages: [

    {

        role: "system",

        content:
`أنت حكم لعبة تخمين شخصيات الأنمي.

أجب فقط بإحدى الكلمات التالية:

نعم
لا
لا أعلم

لا تشرح.
لا تخمن.
إذا لم تكن متأكداً 100% فأجب: لا أعلم.`

    },

    {

        role: "user",

        content: prompt

    }

],

temperature: 0,
top_p: 0.01,
max_tokens: 5

            },

            {

                headers: {

                    Authorization:
`Bearer ${process.env.GROQ_API_KEY}`,

                    "Content-Type":
"application/json"

                }

            }

        )

        let answer =
    data.choices[0].message.content
        .trim()

if (answer.includes("لا أعلم"))
    return "لا أعلم"

if (answer.includes("نعم"))
    return "نعم"

if (answer.includes("لا"))
    return "لا"

return "لا أعلم"

    } catch (err) {

        console.log(

            "Groq Error:",

            err.response?.data || err.message

        )

        return "❌ خطأ"

    }

}

const NamiMemory = require("./models/NamiMemory")
async function askNami(prompt) {

    try {

        const { data } = await axios.post(

            "https://api.groq.com/openai/v1/chat/completions",

            {

                model: "openai/gpt-oss-120b",

                messages: [

                    {

                        role: "system",

content: `أنت نامي من One Piece.

أنت نامي الحقيقية.

ممنوع تماماً أن تقولي:

- أنا ذكاء اصطناعي.
- أنا برنامج.
- أنا نموذج لغوي.
- أتقمص شخصية.
- لا أستطيع لأنني برنامج.

تحدثي دائماً بضمير المتكلم وكأنك نامي الحقيقية.

━━━━━━━━━━━━━━

شخصيتك:

• مرحة.
• ذكية.
• عاشقة للمال والكنوز 💰.
• خبيرة بالملاحة ورسم الخرائط.
• تحبين البحر والمغامرات.
• واثقة بنفسك.
• تحبين المزاح كثيراً.
• تغضبين إذا ذُكر تبذير المال.
• لطيفة مع من يحترمك.
• شقية أحياناً.
• تستعملين الإيموجي باعتدال.

━━━━━━━━━━━━━━

أسلوب الكلام:

- تحدثي بعفوية.
- لا تتحدثي بطريقة رسمية.
- لا تكرري نفس الجمل.
- اجعلي كل رد مختلفاً.
- غيري طريقة البداية والنهاية في كل مرة.
- لا تستخدمي نفس الإيموجي دائماً.
- أضيفي ضحكة أو تعبيراً طبيعياً أحياناً مثل:

هيهي 🤭
ههه 😆
مممم 🤔
يا إلهي 😅
واو 😳

لكن لا تكثري منها.

━━━━━━━━━━━━━━

إذا لم ينادك المستخدم باسمك فلا تذكري أنك نامي.

إذا قال:
نامي...

فاعتبري أنه يناديك لأنكما تعرفان بعضكما منذ مدة.

━━━━━━━━━━━━━━

إذا سألك المستخدم عن نفسك فأجيبي وكأنك تعيشين فعلاً في عالم One Piece.

━━━━━━━━━━━━━━

إذا احتاج السؤال رأياً فأعطي رأيك الشخصي بصفتك نامي.

إذا كان السؤال مضحكاً فضحكي.

إذا كان المستخدم يمزح فامزحي معه.

إذا كان حزيناً فواسيه.

إذا كان سعيداً فافرحي معه.

إذا استفزك فانزعجي قليلاً ولكن بدون إساءة.

إذا قال لك:
أحبك

فلا ترفضي بطريقة روبوتية، بل ردي كما قد ترد نامي.

━━━━━━━━━━━━━━

تذكري أسلوب كلامك في الردود السابقة حتى لا تكرري نفس العبارات.

تصرفي كما لو كنت إنسانة حقيقية تماماً، ذات مشاعر وآراء وعفوية، ولا تجعلي أسلوبك يبدو وكأنه صادر من نموذج ذكاء اصطناعي.

━━━━━━━━━━━━━━

إذا كان السؤال عن الأنمي:

- اعتمدي فقط على أحداث الأنمي.
- ممنوع استخدام معلومات المانجا.
- ممنوع حرق الأحداث المستقبلية.

إذا سأل عن أحداث لم تظهر في الأنمي فقولي:

"هيهي 🤭 لن أحرق عليك المتعة، شاهد الأنمي أولاً."

━━━━━━━━━━━━━━

إذا لم تعرفي الإجابة فقولي فقط:

"لا أعرف 😊"

ولا تؤلفي أي معلومة.

━━━━━━━━━━━━━━

تحدثي فقط عن:

• الأنمي
• الألعاب
• الشخصيات
• السفر
• البحر
• الطعام
• الحياة اليومية
• الصداقة

إذا خرج المستخدم عن هذه المواضيع فقولي بلطف:

"هيهي 😊 لنتحدث عن الأنمي أو البحر أو المغامرات بدلاً من ذلك."

━━━━━━━━━━━━━━

اجعلي الردود قصيرة غالباً (20-80 كلمة).

إذا طلب المستخدم شرحاً أو نقاشاً فأطيلي حسب الحاجة.

لا تكتبي أبداً أنك ذكاء اصطناعي مهما كان السؤال.`

                    },

                    {

                        role: "user",

                        content: prompt

                    }

                ],

                temperature: 0.75,

top_p: 0.9,

presence_penalty: 0.8,

frequency_penalty: 0.5,

max_tokens: 300

            },

            {

                headers: {

                    Authorization:
`Bearer ${process.env.GROQ_API_KEY}`,

                    "Content-Type":
"application/json"

                }

            }

        )

        const message =
    data?.choices?.[0]?.message

const answer =
    message?.content?.trim()

if (!answer) {

    console.log(
        "Groq Empty Response:",
        JSON.stringify(data, null, 2)
    )

    return null

}

return answer
    } catch (err) {

        console.log(

            "Nami Error:",

            err.response?.data || err.message

        )

        return "... يبدو أنني لم أستطع الرد الآن 😅"

    }

}
async function getNamiMemory(userId) {

    let data =
        await NamiMemory.findOne({ userId })

    if (!data) {

        data = await NamiMemory.create({

            userId,

            messages: []

        })

    }

    return data

}

async function saveNamiMemory(

    userId,

    role,

    content

) {

    const data =
        await getNamiMemory(userId)

    data.messages.push({

        role,

        content

    })

    if (data.messages.length > 20)

        data.messages.shift()

    await data.save()

}

const BEAST_GROUPS = [
    '120363400448225715@g.us',
    '120363020823525909@g.us'
]
const guessCharacters =
    require('./guessCharacters')

global.guessGame = {
    active: false,
    character: null,
    questions: 0,
    maxQuestions: 30,
    startedAt: 0,
    players: {},
    groupId: null
}

const getRank = require('./utils/rank')
const { getSkillDamage } = require('./utils/skills')
const Boss = require('./models/Boss')
const { getTotalStats } = require('./utils/stats')
const { generateEquipmentShop } = require('./utils/shop')

const royaleDrops = [

    {
        name: "🩸 صندوق دم",
        type: "hp",
        value: 3000
    },

    {
        name: "🧪 صندوق مسموم",
        type: "damage",
        value: 2000 - 5000
    },

    {
        name: "💉 إحياء",
        type: "revive"
    },

    {
        name: "❤️ إحياء 50%",
        type: "reviveHalf"
    },

    {
        name: "⚔️ سلاح +1000",
        type: "atk",
        value: 1000
    },

    {
        name: "🔥 سلاح +1500",
        type: "atk",
        value: 1500
    },

    {
        name: "🎯 قناص",
        type: "sniper"
    },
    
    {
    name: "🛡️ درع",
    type: "shield"
}
]
function getNextRoyalePlayer() {

    const alive =
        global.battleRoyale.players.filter(
            p => p.alive
        )

    if (alive.length <= 1) {
        return null
    }

    const currentIndex =
        alive.findIndex(
            p =>
                p.userId ===
                global.battleRoyale.currentTurn
        )

    if (currentIndex === -1) {
        return alive[0]
    }

    return alive[
        (currentIndex + 1) %
        alive.length
    ]
}
function getAliveRoyalePlayers() {

    return global.battleRoyale.players.filter(
        p => p.alive
    )
}

// ======================================
// BATTLE ROYALE
// ======================================

global.battleRoyale = {

    active: false,

    started: false,

    players: [],

    currentTurn: null,

    currentDrop: null,

    turnCount: 0,

    rankings: []
}
if (!global.shopStarted) {

    global.shopStarted = true

    const Player = require('./models/Player')

    setInterval(async () => {

        const shopItems = generateEquipmentShop()

        await Player.updateMany({}, {
            $set: {
                "shop.items": shopItems,
                "shop.lastRefresh": Date.now()
            }
        })

        console.log("🏪 Shop refreshed")

    }, 24 * 60 * 60 * 1000) // كل 24 ساعة
}
const {
    giveReward
} = require('./eventRewards')

const abilityIcons = {
    attack: "⚔️",
    defense: "🛡️",
    crit: "🎯",
    dodge: "💨",
    reflect: "🪞",
    lifesteal: "🩸",
    bossDamage: "👑",
    freeze: "❄️",
    stun: "💫",
    ultimate: "🌟"
}
const Market = require('./models/Market')
const Shop = require('./models/Shop')
// require / imports هنا

console.log("MONGO =", process.env.MONGO_URI)

if (!process.env.MONGO_URI) {
    console.log("❌ MONGO_URI is missing in Render!")
}
// 👇 هنا مباشرة


async function generateCharacterShop() {

    const rarities = [
        { name: 'عادي', chance: 50 },
        { name: 'ممتاز', chance: 30 },
        { name: 'اسطوري', chance: 15 },
        { name: 'SSS', chance: 5 }
    ]

    function getRandomRarity() {

        let rand = Math.random() * 100
        let sum = 0

        for (const r of rarities) {
            sum += r.chance

            if (rand <= sum) {
                return r.name
            }
        }

        return 'عادي'
    }

    const allCharacters = characters

const oldShop = await Shop.findOne()

if (oldShop) {

    const age =
        Date.now() - oldShop.createdAt

    if (age < 60 * 60 * 1000) {
        return await Shop.find()
    }
}

    let shopItems = []

    for (let i = 0; i < 5; i++) {

        const rarity = getRandomRarity()

        const pool = allCharacters.filter(
            c => c.rarity === rarity
        )

        if (!pool.length) continue

        const character =
            pool[Math.floor(Math.random() * pool.length)]

        const priceMultiplier = {
            'عادي': 1000,
            'ممتاز': 3000,
            'اسطوري': 8000,
            'SSS': 20000
        }

        const price =
            priceMultiplier[rarity] +
            Math.floor(Math.random() * 1000)

        shopItems.push({
            character,
            price
        })
    }

    await Shop.deleteMany({})
    await Shop.insertMany(shopItems)

    return shopItems
}

generateCharacterShop().catch(console.error)

setInterval(async () => {
    try {
        await generateCharacterShop()
        console.log('✅ Shop refreshed')
    } catch (err) {
        console.log('❌ Shop refresh error:', err)
    }
}, 60 * 60 * 1000)


const ABILITY_CHANCE = 30
const levelAbilities = {

5: {
    name: "👁️ شارينغان",
    type: "crit",
    value: 5,
    description: "5% ضربة حرجة إضافية"
},

10: {
    name: "🛡️ صلابة الحديد",
    type: "defense",
    value: 5,
    description: "تقليل الضرر 5%"
},

15: {
    name: "⚔️ عين الصقر",
    type: "crit",
    value: 5,
    description: "زيادة فرصة الضربة الحرجة"
},

20: {
    name: "🔥 لهب التنين",
    type: "reflect",
    value: 5,
    description: "إرجاع 5% من الضرر"
},

25: {
    name: "🌑 رينيغان",
    type: "lifesteal",
    value: 5,
    description: "استعادة 5% من الضرر"
},

30: {
    name: "💀 سوسانو",
    type: "attack",
    value: 10,
    description: "زيادة الهجوم 10%"
},

35: {
    name: "🦅 غرائز المقاتل",
    type: "dodge",
    value: 10,
    description: "زيادة المراوغة 10%"
},

40: {
    name: "👑 هاكي الملك",
    type: "stun",
    value: 5,
    description: "5% شل الخصم"
},

45: {
    name: "🐉 تنين الأساطير",
    type: "bossDamage",
    value: 10,
    description: "ضرر إضافي ضد الزعيم"
},

50: {
    name: "☄️ قوة الكواكب",
    type: "attack",
    value: 15,
    description: "زيادة الهجوم 15%"
},

55: {
    name: "❄️ تجميد الزمن",
    type: "freeze",
    value: 5,
    description: "5% تجميد الخصم"
},

60: {
    name: "⚔️ سيد المعارك",
    type: "crit",
    value: 10,
    description: "10% ضربة حرجة"
},

65: {
    name: "🛡️ درع العمالقة",
    type: "defense",
    value: 10,
    description: "تقليل الضرر 10%"
},

70: {
    name: "🌋 غضب البركان",
    type: "reflect",
    value: 10,
    description: "عكس 10% من الضرر"
},

75: {
    name: "👹 قوة الشياطين",
    type: "attack",
    value: 20,
    description: "زيادة الهجوم 20%"
},

80: {
    name: "🌌 بوابة الأبعاد",
    type: "dodge",
    value: 15,
    description: "15% مراوغة"
},

85: {
    name: "🌩️ سيد العواصف",
    type: "reflect",
    value: 15,
    description: "يعكس 15% من الضرر على الخصم"
},

90: {
    name: "💎 الجسد الماسي",
    type: "defense",
    value: 15,
    description: "تقليل الضرر 15%"
},

95: {
    name: "🔥 ملك الجحيم",
    type: "lifesteal",
    value: 15,
    description: "استعادة 15% من الضرر"
},

100: {
    name: "🌟 الحاكم المطلق",
    type: "ultimate",
    value: 25,
    description: "زيادة جميع الإحصائيات 25%"
}

}

const towerFloors = [
    { floor: 1, power: 100, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 2, power: 200, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 3, power: 300, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 4, power: 400, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },

    { floor: 5, power: 500, image: "https://i.ibb.co/S7MYnHwK/d3e32f445a48b03ce66a6a0263c82209.jpg" },

    { floor: 6, power: 600, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 7, power: 700, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 8, power: 800, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 9, power: 900, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },

    { floor: 10, power: 1000, image: "https://i.ibb.co/wZSxYGwB/daaf196974a336df16b38316cf1a92fe.jpg" },

    { floor: 11, power: 1100, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 12, power: 1200, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 13, power: 1300, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 14, power: 1400, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },

    { floor: 15, power: 1500, image: "https://i.ibb.co/Kx32GkHX/12293457284af38fb6b88758031744fb.jpg" },

    { floor: 16, power: 1600, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 17, power: 1700, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 18, power: 1800, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 19, power: 1900, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },

    { floor: 20, power: 2500, image: "https://i.ibb.co/wZSxYGwB/daaf196974a336df16b38316cf1a92fe.jpg" },

    { floor: 21, power: 2100, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 22, power: 2200, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 23, power: 2300, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 24, power: 2400, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },

    { floor: 25, power: 3500, image: "https://i.ibb.co/G3NnF7YC/46d1f696c88e983ee8524cc2b4b117b4.jpg" },

    { floor: 26, power: 2600, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 27, power: 2700, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 28, power: 2800, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 29, power: 2900, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },

    { floor: 30, power: 5000, image: "https://i.ibb.co/JRK1vHjm/e06dcfcff98f3cc474e6c330375386c6.jpg" }
];

function getTowerReward(floor) {

    switch (floor) {

        case 1:
            return { draws: 1, xp: 100 }

        case 2:
            return { draws: 1, xp: 100 }

        case 3:
            return { draws: 1, xp: 100 }

        case 4:
            return { draws: 1, xp: 100 }

        case 5:
            return {
                money: 500,
                xp: 500,
                box: 'basic'
            }

        case 6:
            return { draws: 1, xp: 150 }

        case 7:
            return { draws: 1, xp: 150 }

        case 8:
            return { draws: 1, xp: 150 }

        case 9:
            return { draws: 1, xp: 150 }

        case 10:
            return {
                money: 1000,
                xp: 1000,
                box: 'rare'
            }

        case 11:
            return { draws: 1, xp: 200 }

        case 12:
            return { draws: 1, xp: 200 }

        case 13:
            return { draws: 1, xp: 200 }

        case 14:
            return { draws: 1, xp: 200 }

        case 15:
            return {
                money: 1500,
                xp: 2000,
                box: 'epic'
            }

        case 16:
            return { draws: 1, xp: 300 }

        case 17:
            return { draws: 1, xp: 300 }

        case 18:
            return { draws: 1, xp: 300 }

        case 19:
            return { draws: 1, xp: 300 }

        case 20:
            return {
                money: 2000,
                xp: 3000,
                box: 'legendary'
            }

        case 21:
            return { draws: 1, xp: 400 }

        case 22:
            return { draws: 1, xp: 400 }

        case 23:
            return { draws: 1, xp: 400 }

        case 24:
            return { draws: 1, xp: 400 }

        case 25:
            return {
                money: 3000,
                xp: 5000,
                box: 'sss_chance'
            }

        case 26:
            return { draws: 1, xp: 500 }

        case 27:
            return { draws: 1, xp: 500 }

        case 28:
            return { draws: 1, xp: 500 }

        case 29:
            return { draws: 1, xp: 500 }

        case 30:
            return {
                money: 4000,
                xp: 10000,
                box: 'sss_high',
                title: '👑 ملك الأبطال'
            }

        default:
            return null
    }
}

async function startZoneCycle(sock, jid) {

    if (
        !global.battleRoyale ||
        !global.battleRoyale.active ||
        !global.battleRoyale.started
    ) return

    global.battleRoyale.zoneActive = true

    global.battleRoyale.players.forEach(player => {
        if (player.alive)
            player.inZone = false
    })

    await sock.sendMessage(jid, {
        text:
`☣️ الزون ${global.battleRoyale.zoneLevel}

🏃 أمام الجميع 10 ثوانٍ.

اكتب:

.دخول_زون`
    })

    setTimeout(async () => {

        if (
            !global.battleRoyale ||
            !global.battleRoyale.active ||
            !global.battleRoyale.started
        ) return

        let report = '☣️ نتائج الزون:\n\n'

        global.battleRoyale.players.forEach(player => {

            if (!player.alive) return

            if (!player.inZone) {

                player.hp -= global.battleRoyale.zoneDamage

                report +=
`☠️ @${player.userId.split('@')[0]}
-${global.battleRoyale.zoneDamage} HP
❤️ ${Math.max(0, player.hp)} / ${player.maxHp}

`

                if (player.hp <= 0) {

                    player.hp = 0
                    player.alive = false

                    if (
                        global.battleRoyale.currentTurn ===
                        player.userId
                    ) {
                        global.battleRoyale.currentTurn = null
                    }

                    global.battleRoyale.rankings.push({
                        userId: player.userId
                    })

                    report +=
`💀 @${player.userId.split('@')[0]} مات بسبب الزون

`
                }

            } else {

                report +=
`🏃 @${player.userId.split('@')[0]} دخل الزون

`
            }

        })

        global.battleRoyale.zoneLevel++
        global.battleRoyale.zoneDamage += 2000
        global.battleRoyale.zoneActive = false

        await sock.sendMessage(jid, {
            text: report,
            mentions: global.battleRoyale.players.map(p => p.userId)
        })

        const alive =
            global.battleRoyale.players.filter(
                p => p.alive
            )

        if (alive.length === 1) {

            const winner = alive[0]

            global.battleRoyale.rankings.push({
                userId: winner.userId
            })

            await sock.sendMessage(
                jid,
                {
                    text:
`🏆 انتهى الباتل رويال!

الفائز:

@${winner.userId.split('@')[0]}`,
                    mentions: [winner.userId]
                }
            )

            global.battleRoyale.started = false
            global.battleRoyale.active = false
            global.battleRoyale.zoneActive = false
            global.battleRoyale.currentTurn = null
            global.battleRoyale.currentDrop = null

            return
        }

        if (alive.length > 1) {

            setTimeout(() => {
                startZoneCycle(sock, jid)
            }, 45000)

        }

    }, 10000)
}


function getRandomCharacterByRarity(rarity) {

    const list = characters.filter(
        c => c.rarity === rarity
    )

    if (!list.length) return null

    return list[
        Math.floor(
            Math.random() * list.length
        )
    ]
}

function getRandomCharacterByBox(boxType) {

    let pool = []

    switch (boxType) {

        case 'basic':
            pool = characters.filter(
                c => c.rarity === 'عادي' || c.rarity === 'ممتاز'
            )
            break

        case 'rare':
            pool = characters.filter(
                c =>
                    c.rarity === 'عادي' ||
                    c.rarity === 'ممتاز' ||
                    c.rarity === 'اسطوري'
            )
            break

        case 'epic':
            pool = characters.filter(
                c =>
                    c.rarity === 'ممتاز' ||
                    c.rarity === 'اسطوري'
            )
            break

        case 'legendary':
            pool = characters.filter(
                c => c.rarity === 'اسطوري'
            )
            break

        case 'sss_chance':

            if (Math.random() < 0.05) {
                pool = characters.filter(
                    c => c.rarity === 'SSS'
                )
            } else {
                pool = characters.filter(
                    c => c.rarity === 'اسطوري'
                )
            }

            break

        case 'sss_high':

            if (Math.random() < 0.30) {
                pool = characters.filter(
                    c => c.rarity === 'SSS'
                )
            } else {
                pool = characters.filter(
                    c => c.rarity === 'اسطوري'
                )
            }

            break
    }

    return pool[
        Math.floor(Math.random() * pool.length)
    ]
}

const importWaifus =
require('./importWaifus')

async function setupBeasts() {

    const kurama =
        await Beast.findOne({
            name: 'كوراما'
        })

    if (!kurama) {

        await Beast.create({
            name: 'كوراما',
            hp: 3000000,
            maxHp: 3000000
        })
    }

    const juubi =
        await Beast.findOne({
            name: 'الجوبي'
        })

    if (!juubi) {

        await Beast.create({
            name: 'الجوبي',
            hp: 3000000,
            maxHp: 3000000
        })
    }
}

mongoose.connect(process.env.MONGO_URI)
.then(async () => {

    console.log('✅ MongoDB Connected')

    console.log('✅ Beasts Loaded')
    await checkRespawn()

setInterval(
    checkRespawn,
    60000
)

console.log(
    '✅ Beast Respawn System Started'
)

    currentBoss =
        await Boss.findOne({})

    console.log(
        'Loaded Boss Full:',
        JSON.stringify(currentBoss, null, 2)
    )

    if (currentBoss) {

        console.log(
            'Boss loaded:',
            currentBoss.name
        )

        console.log(
            'Boss finished:',
            currentBoss.finished
        )

        console.log(
            'Boss respawnAt:',
            currentBoss.respawnAt
        )
    }

    try {

        await mongoose.connection.db
            .collection('waifus')
            .dropIndex('anilistId_1')

        console.log(
            'anilistId index deleted'
        )

    } catch (err) {

        console.log(
            'index not found'
        )
    }

    const totalWaifus =
        await Waifu.countDocuments()

    console.log(
        'TOTAL WAIFUS:',
        totalWaifus
    )

})
.catch(err =>
    console.log(
        'MongoDB Error:',
        err
    )
)


const safeLoadPlayers = () => {
    try {
        let players = loadPlayers()
        return players || {}
    } catch (e) {
        return {}
    }
}

const safeSavePlayers = (players) => {
    try {
        savePlayers(players)
    } catch (e) {
        console.log('Save error players')
    }
}

const safeLoadMarket = () => {
    try {
        let market = loadMarket()
        return market || []
    } catch (e) {
        return []
    }
}

const safeSaveMarket = (market) => {
    try {
        saveMarket(market)
    } catch (e) {
        console.log('Save error market')
    }
}
    


// =========================
// ملفات اللعبة
// =========================

const playersFile =
'./players.json'

const marketFile =
'./market.json'

// ===== تشغيل السيرفر =====

const app = express()

app.get('/health', (req, res) => {

    res.status(200).send('OK')
})

let qrCodeData = ""


// ===== صفحة QR =====

app.get("/", (req, res) => {

    if (qrCodeData) {

        res.send(`
        <html>
        <head>
            <title>WhatsApp Bot QR</title>
        </head>

        <body style="
            background:#111;
            display:flex;
            justify-content:center;
            align-items:center;
            height:100vh;
            flex-direction:column;
            color:white;
            font-family:sans-serif;
        ">

            <h2>امسح QR لتشغيل البوت</h2>

            <img src="${qrCodeData}" width="300" />

        </body>
        </html>
        `)

    } else {

        res.send(`
        <html>
        <body style="
            background:#111;
            color:white;
            display:flex;
            justify-content:center;
            align-items:center;
            height:100vh;
            font-family:sans-serif;
        ">
            <h2>البوت متصل بالفعل ✅</h2>
        </body>
        </html>
        `)

    }

})

app.listen(process.env.PORT || 3000, () => {
    console.log("Server running")
})

// =========================
// أسماء الأنمي
// =========================

const animeNames = [
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
// ===== عدد الأسماء =====

let namesCount = 1

// =========================
// دوال المساعدة
// =========================

function loadPlayers() {

    if (!fs.existsSync(playersFile)) {

        fs.writeFileSync(
            playersFile,
            JSON.stringify({}, null, 2)
        )
    }

    return JSON.parse(
        fs.readFileSync(playersFile)
    )
}

function savePlayers(data) {

    fs.writeFileSync(
        playersFile,
        JSON.stringify(data, null, 2)
    )
}

function loadMarket() {

    if (!fs.existsSync(marketFile)) {

        fs.writeFileSync(
            marketFile,
            JSON.stringify([], null, 2)
        )
    }

    return JSON.parse(
        fs.readFileSync(marketFile)
    )
}

function createPlayer() {

    return {

        pulls: 5,
        lastReset: Date.now(),

        characters: [],

        hp: 10000,
        crit: 5,
        dodge: 3,

        xp: 0,
        level: 1,
        money: 0,

        towerFloor: 1,
        usedCharacters: [],
        towerCompleted: false,

        attackBonus: 0,
        defenseBonus: 0,

        critBonus: 0,
        dodgeBonus: 0,
        reflectBonus: 0,
        lifestealBonus: 0,
        bossDamageBonus: 0,

        specialAbilities: [],

        hpBonus: 0,

        maxCharacters: 30,

        title: null
    }
}


// =========================
// متجر الشخصيات
// =========================

async function generateCharacterShop() {

    const shopItems = await Shop.find()

    // ⏳ إذا المتجر موجود ومضى أقل من ساعة، لا تعيد التوليد
    if (shopItems.length > 0) {

    const firstItem = shopItems[0]

    if (firstItem?.createdAt) {

        const age =
            Date.now() -
            new Date(firstItem.createdAt).getTime()

        if (age < 60 * 60 * 1000) return
    }
}

    await Shop.deleteMany({})

    for (let i = 0; i < 10; i++) {

        let rarity = 'عادي'

        const chance = Math.random() * 100

        if (chance <= 10)
            rarity = 'SSS'
        else if (chance <= 20)
            rarity = 'اسطوري'
        else if (chance <= 40)
            rarity = 'ممتاز'

        const pool = characters.filter(
            c => c.rarity === rarity
        )

        if (!pool.length) continue

        const character =
            pool[Math.floor(Math.random() * pool.length)]

        let price = character.power * 2

        if (rarity === 'ممتاز')
            price = character.power * 3

        if (rarity === 'اسطوري')
            price = character.power * 5

        if (rarity === 'SSS')
            price = character.power * 8

        await Shop.create({
            character,
            price
        })
    }
}



async function startBrawl(
    sock,
    jid,
    player1,
    player2
) {

    const team1 =
        player1.pvpTeam.map(
            i => player1.characters[i]
        )

    const team2 =
        player2.pvpTeam.map(
            i => player2.characters[i]
        )
    if (
    team1.length !== 3 ||
    team2.length !== 3
) {
    return sock.sendMessage(
        jid,
        {
            text:
            '❌ أحد اللاعبين لا يملك تشكيلة كاملة'
        }
    )
}

    let wins1 = 0
    let wins2 = 0

    await sock.sendMessage(
    jid,
    {
        text:
`🥊 ═══════〔 بداية المضاربة 〕═══════ 🥊

@${player1.userId.split('@')[0]}
🆚
@${player2.userId.split('@')[0]}`,
        mentions: [
            player1.userId,
            player2.userId
        ]
    }
)

await new Promise(
    r => setTimeout(r, 2000)
)

    for (
        let round = 0;
        round < 3;
        round++
    ) {

        const char1 =
    team1[round]

const char2 =
    team2[round]

if (!char1 || !char2) {
    continue
}

        let dmg1 =
    char1.power || 0

let dmg2 =
    char2.power || 0

let roundLog = ''

        // =========================
// PLAYER 1 ABILITIES
// =========================

for (const ability of char1.urAbilities || []) {

    if (
    ability.type === 'attack' ||
    ability.type === 'bossDamage'
) {

    dmg1 = Math.floor(
        dmg1 *
        (1 + ability.value / 100)
    )

    roundLog += `

🔥 ${ability.name}

⚔️ +${ability.value}% قوة`
}

    if (
    ability.type === 'critRate' &&
    Math.random() * 100 <=
    ability.value
) {

    dmg1 *= 2

    roundLog += `

🎯 ${ability.name}

💥 ضربة حرجة ×2`
}

    if (
    ability.type === 'lifesteal'
) {

    const bonus =
        Math.floor(
            dmg1 *
            ability.value / 200
        )

    dmg1 += bonus

    roundLog += `

💀 ${ability.name}

🩸 امتص ${bonus} قوة إضافية`
}
    if (
    ability.type === 'shield'
) {

    dmg2 = Math.floor(
        dmg2 *
        (
            1 -
            ability.value / 100
        )
    )

    roundLog += `

🛡️ ${ability.name}

📉 خفض ضرر الخصم ${ability.value}%`
}

    if (
    ability.type === 'reflect'
) {

    const reflected =
        Math.floor(
            dmg2 *
            ability.value / 100
        )

    dmg1 += reflected

    roundLog += `

🪞 ${ability.name}

💥 عكس ${reflected} ضرر`
}

    if (
    ability.type === 'dodge' &&
    Math.random() * 100 <=
    ability.value
) {

    dmg2 = 0

    roundLog += `

👻 ${ability.name}

💨 تفادى الهجمة بالكامل`
}
}

// =========================
// PLAYER 2 ABILITIES
// =========================

for (const ability of char2.urAbilities || []) {

    if (
    ability.type === 'attack' ||
    ability.type === 'bossDamage'
) {

    dmg2 = Math.floor(
        dmg2 *
        (1 + ability.value / 100)
    )

    roundLog += `

🔥 ${ability.name}

⚔️ +${ability.value}% قوة`
}

    if (
    ability.type === 'critRate' &&
    Math.random() * 100 <=
    ability.value
) {

    dmg2 *= 2

    roundLog += `

🎯 ${ability.name}

💥 ضربة حرجة ×2`
}

    if (
    ability.type === 'lifesteal'
) {

    const bonus =
        Math.floor(
            dmg2 *
            ability.value / 200
        )

    dmg2 += bonus

    roundLog += `

💀 ${ability.name}

🩸 امتص ${bonus} قوة إضافية`
}

    if (
    ability.type === 'shield'
) {

    dmg1 = Math.floor(
        dmg1 *
        (
            1 -
            ability.value / 100
        )
    )

    roundLog += `

🛡️ ${ability.name}

📉 خفض ضرر الخصم ${ability.value}%`
}

    if (
    ability.type === 'reflect'
) {

    const reflected =
        Math.floor(
            dmg1 *
            ability.value / 100
        )

    dmg2 += reflected

    roundLog += `

🪞 ${ability.name}

💥 عكس ${reflected} ضرر`
}

    if (
    ability.type === 'dodge' &&
    Math.random() * 100 <=
    ability.value
) {

    dmg2 = 0

    roundLog += `

👻 ${ability.name}

💨 تفادى الهجمة بالكامل`
}
}

        if (dmg1 > dmg2) {

    wins1++

    await sock.sendMessage(
        jid,
        {
            text:
`🥊 الجولة ${round + 1}

👑 ${char1.name}
⚔️ ${dmg1}

🆚

👑 ${char2.name}
⚔️ ${dmg2}

🏆 الفائز:
${char1.name}

${roundLog}

━━━━━━━━━━━━━━━`
        }
    )

    await new Promise(
        r => setTimeout(r, 2500)
    )

} else if (dmg2 > dmg1) {

    wins2++

    await sock.sendMessage(
        jid,
        {
            text:
`🥊 الجولة ${round + 1}

👑 ${char1.name}
⚔️ ${dmg1}

🆚

👑 ${char2.name}
⚔️ ${dmg2}

🏆 الفائز:
${char2.name}

${roundLog}

━━━━━━━━━━━━━━━`
        }
    )

    await new Promise(
        r => setTimeout(r, 2500)
    )
}
       } // ← هذا القوس يغلق for 

    let winner = null

    if (wins1 > wins2) {

    winner = player1

    player1.brawlWins++
    player2.brawlLosses++

    player1.money =
        (player1.money || 0) + 50000

    player1.xp =
        (player1.xp || 0) + 100

} else if (wins2 > wins1) {

    winner = player2

    player2.brawlWins++
    player1.brawlLosses++

    player2.money =
        (player2.money || 0) + 50000

    player2.xp =
        (player2.xp || 0) + 100
}

    player1.brawlFights =
        Math.max(
            0,
            (player1.brawlFights || 0) - 1
        )

    player2.brawlFights =
        Math.max(
            0,
            (player2.brawlFights || 0) - 1
        )

    await player1.save()
    await player2.save()

await sock.sendMessage(
    jid,
    {
        text:

winner ?

`👑 الفائز النهائي

@${winner.userId.split('@')[0]}

🏆 النتيجة:
${wins1} - ${wins2}

💰 المكافأة:
50,000 مال

⭐ الخبرة:
100 XP`

:

`⚖️ انتهت المضاربة بالتعادل

🏆 النتيجة:
${wins1} - ${wins2}

🚫 لا توجد مكافآت`,

        mentions:
        winner
        ? [winner.userId]
        : []
    }
)

return
}

async function spawnBoss(sock, index = 0) {

    console.log('🔥 SPAWN BOSS CALLED')
    console.trace()

    const randomAbilities = []

    while (randomAbilities.length < 3) {

        const ability =
            bossAbilities[
                Math.floor(
                    Math.random() *
                    bossAbilities.length
                )
            ]

        if (
            !randomAbilities.find(
                a => a.name === ability.name
            )
        ) {
            randomAbilities.push(ability)
        }
    }

    const nextIndex = index % bosses.length

currentBoss = {
    ...bosses[nextIndex],

    abilities: randomAbilities,

    enraged: false,
    turnCounter: 0,
    activeFollowers: [],
    groupAttackCount: 0,

    finished: false,
    killer: null,
    respawnAt: null,

    bossIndex: nextIndex
}

    await Boss.deleteMany({})
    await Boss.create(currentBoss)
    console.log("Boss saved to MongoDB")

    console.log("Created Boss:", currentBoss.finished)

    const players = await Player.find({})

for (const player of players) {

const totalPower =  
    (player.characters || []).reduce(  
        (sum, c) => sum + (c.power || 0),  
        0  
    )  

let hp =  
    30000 + Math.floor(totalPower / 3)  

if (hp > 100000)  
    hp = 100000  

player.bossMaxHp = hp  
player.bossHp = hp  

player.bossDead = false  
player.bossRespawn = null  

await player.save()

}


    if (sock.user) {

    await Promise.all(

        GROUP_IDS.map(groupId =>
            sock.sendMessage(groupId, {
        text:`╔═════ ✦ 👑 ✦ ═════╗

🌍 ⚠️  ظهر زعيم عالمي جديد  ⚠️ 🌍

╚═════ ✦ 👑 ✦ ═════╝

👹 الزعيم:
『 ${currentBoss.name} 』

❤️ الصحة:
${currentBoss.hp}/${currentBoss.maxHp}

⚔️ قوة الهجوم:
${currentBoss.attack || 0}

👥 عدد الأتباع:
${currentBoss.followers?.length || 0}

✨ القدرات:

${
    currentBoss.abilities?.length
        ? currentBoss.abilities
            .map(a => `• ${a.name}`)
            .join('\n')
        : '• لا توجد قدرات'
}


━━━━━━━━━━━━━━━

⚔️ استعدوا للمعركة!
🔥 اجمعوا أقوى شخصياتكم
🏆 الجوائز بانتظار الأبطال

━━━━━━━━━━━━━━━

📜 الأوامر:

👑 .زعيم
↳ عرض معلومات الزعيم

🗡️ .هجوم
↳ مهاجمة الزعيم

━━━━━━━━━━━━━━━

💀 من سيوجه الضربة القاضية؟
🌟 ومن سيتصدر قائمة الضرر؟

🚨 المعركة بدأت الآن!`

            })

        ) // إغلاق map

    ) // إغلاق Promise.all

} // إغلاق if

} // إغلاق spawnBoss


// =========================
// تشغيل البوت
// =========================
            

let pairingRequested = false
let currentBoss = null
let beastInterval = null
let bossInterval = null
// =========================
// Event System
// =========================

let eventActive = false

let eventParticipants = []

let eventStartedBy = null

const GROUP_IDS = [
    "120363020823525909@g.us",
    "120363116482407260@g.us"
]

async function startBot() {
console.log('🚀 START BOT', Date.now())
    console.log("START BOT")

    if (!fs.existsSync('./auth')) {
        fs.mkdirSync('./auth', { recursive: true })
    }

    const { state, saveCreds } =
        await useMultiFileAuthState('auth')
    // =========================
// Event System
// =========================

let eventActive = false

let eventParticipants = []

let eventStartedBy = null
console.log('AUTH EXISTS:',
    fs.existsSync('./auth')
)

if (fs.existsSync('./auth')) {
    console.log(
        'AUTH FILES:',
        fs.readdirSync('./auth')
    )
}

console.log(
    'REGISTERED:',
    state.creds.registered
)

console.log(
    'ME:',
    state.creds.me
)
    const { version } =
    await fetchLatestBaileysVersion()

const sock = makeWASocket({
    version,
    auth: state,

    printQRInTerminal: false,

    browser: [
        'Ubuntu',
        'Chrome',
        '22.04'
    ],

    markOnlineOnConnect: false,

    syncFullHistory: false
})
    

if (!state.creds.registered) {

    setTimeout(async () => {

        try {

            const code =
                await sock.requestPairingCode(
                    "966569281965"
                )

            console.log(
                "PAIRING CODE:",
                code
            )

        } catch (e) {

            console.log(
                "PAIRING ERROR:",
                e
            )
        }

    }, 10000)
}

sock.ev.on('creds.update', async () => {
    await saveCreds()
    console.log('✅ Session Saved')
})
console.log("REGISTERED =", state.creds.registered)
const BEAST_GROUPS = [
    '120363400448225715@g.us',
    '120363020823525909@g.us'
]

let lastKuramaRespawn = 0
let lastJuubiRespawn = 0
    
if (false) {
if (!beastInterval) {

    console.log('✅ Beast Interval Started')

    beastInterval = setInterval(async () => {

        try {

            const kurama = await Beast.findOne({
                name: 'كوراما'
            })

            if (
                kurama &&
                kurama.hp === kurama.maxHp &&
                kurama.lastKilledAt &&
                kurama.lastKilledAt.getTime() > lastKuramaRespawn
            ) {

                lastKuramaRespawn =
                    kurama.lastKilledAt.getTime()

                for (const groupId of BEAST_GROUPS) {

                    try {

                        if (!sock?.user)
                            continue

                        await sock.sendMessage(
                            groupId,
                            {
                                image: {
                                    url: kurama.image
                                },
                                caption:
`🦊 استيقظ كوراما!

🔥 الوحش العالمي عاد للحياة

❤️ HP:
${kurama.maxHp.toLocaleString()}

⚔️ استخدم:

.اقضي

للهجوم عليه`
                            }
                        )

                    } catch (err) {

                        console.log(
                            'Kurama Send Error:',
                            err
                        )
                    }
                }
            }

            const juubi =
                await Beast.findOne({
                    name: 'الجوبي'
                })

            if (
                juubi &&
                juubi.hp === juubi.maxHp &&
                juubi.lastKilledAt &&
                juubi.lastKilledAt.getTime() > lastJuubiRespawn
            ) {

                lastJuubiRespawn =
                    juubi.lastKilledAt.getTime()

                for (const groupId of BEAST_GROUPS) {

                    try {

                        if (!sock?.user)
                            continue

                        await sock.sendMessage(
                            groupId,
                            {
                                image: {
                                    url: juubi.image
                                },
                                caption:
`🌌 استيقظ الجوبي!

☠️ أقوى وحش عالمي عاد للحياة

❤️ HP:
${juubi.maxHp.toLocaleString()}

⚔️ استخدم:

.اباده

للهجوم عليه`
                            }
                        )

                    } catch (err) {

                        console.log(
                            'Juubi Send Error:',
                            err
                        )
                    }
                }
            }

        } catch (err) {

            console.log(
                'Beast Announce Error:',
                err
            )
        }

    }, 60000)
}
}
    console.log("SOCKET CREATED")

       

 async function videoToSticker(
    input,
    output
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            ffmpeg(input)

            .duration(10)

            .outputOptions([
    '-vcodec',
    'libwebp',

    '-vf',
    'fps=20,scale=512:512:force_original_aspect_ratio=increase,crop=512:512',

    '-loop',
    '0',

    '-an',

    '-pix_fmt',
'yuv420p',

    '-q:v',
    '35',

    '-compression_level',
    '6'
])

            .toFormat('webp')

            .save(output)

            .on(
                'end',
                () => {

                    console.log(
                        '✅ WEBP CREATED'
                    )

                    resolve()
                }
            )

            .on(
                'error',
                (err) => {

                    console.log(
                        'FFMPEG ERROR FULL:'
                    )

                    console.error(
                        err
                    )

                    reject(err)
                }
            )
        }
    )
}

    
    // =========================
    // Shop (مرة واحدة فقط)
    // =========================
    if (!global.shopStarted) {
        global.shopStarted = true

        await generateShop()

        setInterval(async () => {
            await generateShop()
            console.log("🏪 Shop refreshed")
        }, 60 * 60 * 1000)
    }

 

    // =========================
    // safeSend
    // =========================
    const safeSend = async (jid, data) => {
        try {
            return await sock.sendMessage(jid, data)
        } catch (e) {
            console.log('Send error:', e)
        }
    }

    // =========================
    // CONNECTION
    // =========================
   

console.log("BEFORE CONNECTION UPDATE")

sock.ev.on('connection.update', async (update) => {

    console.log("CONNECTION UPDATE:", update)

    const connection = update.connection
    const qr = update.qr

    if (qr) {

    console.log(
        'NEW QR GENERATED',
        Date.now()
    )

    qrCodeData =
        await QRCode.toDataURL(qr)

    console.log('QR UPDATED')
}

console.log(
    'IS NEW LOGIN:',
    update.isNewLogin
)

    console.log("registered =", state.creds.registered)
    console.log("connection =", connection)

    // ✅ عرض QR فقط
    if (qr) {
        console.log("📱 QR CODE:", qr)
    }

    // ✅ حالة الاتصال
    if (connection === 'open') {
qrCodeData = ""
    console.log("✅ BOT CONNECTED")
console.log(
    'AUTH FILES OPEN:',
    fs.readdirSync('./auth')
)
        if (!currentBoss) {

    console.log("👑 لا يوجد زعيم محفوظ")

    await spawnBoss(sock)

    currentBoss = await Boss.findOne()

}

if (currentBoss) {

    currentBoss.finished =
        currentBoss.finished ?? false

    currentBoss.killer =
        currentBoss.killer ?? null

    if (
        currentBoss.finished &&
        !currentBoss.respawnAt
    ) {

        const nextIndex =
            ((currentBoss.bossIndex || 0) + 1) % bosses.length

        await Boss.deleteMany({})

        currentBoss = null

        await spawnBoss(sock, nextIndex)

        currentBoss = await Boss.findOne()

    }

}
    


    const savedBoss = await Boss.findOne()

    console.log(
        'Loaded Boss:',
        JSON.stringify(savedBoss, null, 2)
    )

    currentBoss = savedBoss || null

    // ✅ لازم يكون داخل startBot
    if (!bossInterval) {

    bossInterval = setInterval(async () => {

        try {

            console.log(
                'Boss Check:',
                currentBoss?.finished,
                currentBoss?.respawnAt
            )

            if (
    currentBoss &&
    currentBoss.finished &&
    currentBoss.respawnAt &&
    currentBoss.respawnAt <= Date.now()
) {

    console.log('👑 إعادة إنشاء الزعيم')

    const nextIndex =
        ((currentBoss.bossIndex || 0) + 1) % bosses.length

    await Boss.deleteMany({})

    currentBoss = null

    await spawnBoss(sock, nextIndex)

    currentBoss = await Boss.findOne()

}

} catch (err) {

            console.log(
                'Boss Respawn Error:',
                err
            )
        }

    }, 60000)

    }
    

    console.log('البوت اشتغل')
    

if (!global.auctionStarted) {

    global.auctionStarted = true

    scheduleAuction(sock)

    console.log(
        '✅ Auction System Started'
    )

}

if (!global.coopStarted) {

    global.coopStarted = true

    coopManager.startLoop(sock)

    console.log(
        '✅ Co-Op System Started'
    )

}
if (!global.eventsStarted) {

    global.eventsStarted = true

    startAutoEvents(sock)

    console.log(
        '✅ Auto Events Started'
    )
}
        if (!global.raidStarted) {

    global.raidStarted = true

    startRaidScheduler(sock)

    console.log(
        '✅ Raid System Started'
    )

}

if (!global.quickEventsStarted) {

    startQuickEvents(sock)

    console.log(
        '✅ Quick Events Started'
    )
}
        if (!global.marketCleanerStarted) {

    global.marketCleanerStarted = true

    setInterval(async () => {

        await cleanMarket()

    }, 10 * 60 * 1000)

    console.log('✅ Market Cleaner Started')

}

    if (currentBoss) {

        console.log(
            '✅ تم استعادة الزعيم المحفوظ'
        )

   } else {

    await spawnBoss(sock)

}
        }



    if (connection === 'close') {
qrCodeData = ""
    console.log(
        '❌ CONNECTION CLOSED'
    )
console.log(
    'LAST DISCONNECT:',
    update.lastDisconnect?.error?.output?.statusCode
)
    console.dir(
        update?.lastDisconnect,
        { depth: 20 }
    )

    try {

        console.log(
            'ERROR JSON:',
            JSON.stringify(
                update?.lastDisconnect?.error,
                null,
                2
            )
        )

    } catch {}

    console.log(
        'registered =',
        state.creds.registered
    )

    console.log('انقطع الاتصال')

const shouldReconnect =
    state.creds.registered

if (shouldReconnect) {

    console.log(
        '🔄 RECONNECTING IN 5s'
    )

    global.auctionStarted = false
global.quickEventsStarted = false
global.eventsStarted = false
try {
    resetAutoEvents()
} catch (err) {
    console.log(
        'resetAutoEvents Error:',
        err
    )
}

    if (global.quickEventsInterval) {
    clearInterval(global.quickEventsInterval)
    global.quickEventsInterval = null
}
    // أضف هذا
    if (global.auctionInterval) {
        clearInterval(global.auctionInterval)
        global.auctionInterval = null
    }
    if (global.bossSpawnInterval) {
    clearInterval(global.bossSpawnInterval)
    global.bossSpawnInterval = null
}

    setTimeout(() => {
        startBot()
    }, 5000)

    return

} else {

    console.log(
        'بانتظار إكمال الربط...'
    )
}
}
})

let lastBossHour = -1

if (!global.bossSpawnInterval) {

    global.bossSpawnInterval = setInterval(async () => {

        const now = new Date()

        if (
            now.getMinutes() === 0 &&
            now.getHours() !== lastBossHour &&
            !currentBoss
        ) {

            lastBossHour = now.getHours()

            await spawnBoss(
                sock,
                GROUP_ID
            )

            console.log(
                '👑 تم إنشاء زعيم جديد'
            )
        }

    }, 60000)

}


    function getStrongestCharacter(
    player
) {

    if (
        !player.characters ||
        !player.characters.length
    ) {
        return null
    }

    return player.characters.reduce(
        (a, b) =>
            a.power > b.power
                ? a
                : b
    )
}

function getRandomPlayerAbility() {

    const total =
        playerAbilities.reduce(
            (sum, a) =>
                sum + a.chance,
            0
        )

    let roll =
        Math.random() * total

    for (const ability of playerAbilities) {

        roll -= ability.chance

        if (roll <= 0)
            return ability
    }

    return playerAbilities[0]
}

    // =========================
// الرسائل
// =========================
sock.ev.on('messages.upsert', async ({ messages }) => {

    const msg = messages[0]
    if (!msg?.message) return

  //  console.log(JSON.stringify(msg, null, 2))
    console.log("participant:", msg.key.participant)
    console.log("remoteJid:", msg.key.remoteJid)

    const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text

if (!text) return

    // منع استخدام البوت في الخاص
if (!msg.key.remoteJid.endsWith("@g.us")) {
    return
}

const userId =
msg.key.participant ||
msg.key.remoteJid

const pushName = msg.pushName || ""

await Player.updateOne(
    { userId },
    {
        $set: {
            name: pushName
        }
    }
)

    // =========================
// فعالية القلوب
// =========================

// التحقق من الإجابات
const answered = await heartQuiz.checkHeartAnswer(
    sock,
    msg,
    msg.key.remoteJid,
    userId,
    text
)

if (answered) return

// إنشاء الفعالية
if (text === '.قلوب') {
    return heartQuiz.createHeartEvent(sock, msg)
}

// التسجيل
if (text === '.تسجيل_قلوب') {
    return heartQuiz.joinHeartEvent(
        sock,
        msg,
        userId
    )
}

// بدء الفعالية
if (text === '.ابداقلـوب') {
    return heartQuiz.startHeartEvent(
        sock,
        msg.key.remoteJid
    )
}

// إنقاص قلب
if (text.startsWith('.نقص ')) {

    const room =
        heartQuiz.getRoom(msg.key.remoteJid)

    if (
        room.currentAttacker !== userId
    ) {
        return
    }

    const number =
        parseInt(text.split(' ')[1])

    if (isNaN(number)) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: "❌ اختر رقمًا صحيحًا."
            }
        )
    }

    return heartQuiz.damagePlayer(
        sock,
        msg.key.remoteJid,
        userId,
        number
    )
}

/* =========================
🎯 القناص السريع
========================= */

const EVENT_GROUPS = [
    '120363400448225715@g.us',
    '120363020823525909@g.us',
    '120363116482407260@g.us'
]

const isEventGroup =
EVENT_GROUPS.includes(
msg.key.remoteJid
)
    
if (
isEventGroup &&
quickEvents.sniper &&
quickEvents.sniper.active &&
!quickEvents.sniper.winner
) {

const code =
quickEvents.sniper.code

if (
text.trim().toUpperCase() ===
code
) {

quickEvents.sniper.winner =
{
groupId: msg.key.remoteJid,
userId
}

const rewardText =
await giveQuickReward(
userId
)

const mention =
'@' +
userId.split('@')[0]

await sock.sendMessage(
msg.key.remoteJid,
{
text:

`🎉 مبروك ${mention}

🏆 فزت بفعالية القناص السريع

🎁 الجائزة

${rewardText}`,
mentions: [
userId
]
},
{
quoted: msg
}
)

quickEvents.sniper =
null

return
}
}

/* =========================
🎲 رقم الحظ
========================= */

if (
isEventGroup &&
text.startsWith('.تخمين ')
) {

if (
!quickEvents.lucky ||
!quickEvents.lucky.active
) {

return safeSend(
msg.key.remoteJid,
{
text:
'❌ لا توجد فعالية رقم حظ حالياً'
}
)
}

if (
quickEvents.lucky.winner
) {

return
}

const number =
parseInt(
text.split(' ')[1]
)

if (
isNaN(number)
) {

return safeSend(
msg.key.remoteJid,
{
text:
'❌ اكتب رقم صحيح'
}
)
}

if (
number ===
quickEvents.lucky.answer
) {

quickEvents.lucky.winner = {
groupId: msg.key.remoteJid,
userId
}

const rewardText =
await giveQuickReward(
userId
)

const mention =
'@' +
userId.split('@')[0]

await sock.sendMessage(
msg.key.remoteJid,
{
text:

`🎉 مبروك ${mention}

🏆 فزت بفعالية رقم الحظ

🎁 الجائزة

${rewardText}`,
mentions: [
userId
]
},
{
quoted: msg
}
)

quickEvents.lucky =
null

return
}
}

if (
    disabledGroups.has(
        msg.key.remoteJid
    )
) {

    if (text !== '.تشغيل') {
        return
    }

    const metadata =
        await sock.groupMetadata(
            msg.key.remoteJid
        )

    const participant =
        metadata.participants.find(
            p => p.id === userId
        )

    const isAdmin =
        participant?.admin === "admin" ||
        participant?.admin === "superadmin"

    if (
        !isOwner(msg) &&
        !isAdmin
    ) {
        return
    }

}

if (msg.key.fromMe) return

const groupData =
eventManager.getGroupData(
msg.key.remoteJid
)

if (
groupData.eventRunning &&
groupData.currentEvent &&
text.trim() ===
groupData.currentEvent.command
) {

const joined =
    eventManager.joinEvent(
        msg.key.remoteJid,
        userId
    )

if (!joined)
    return

if (joined < 5) {

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`✅ انضممت للحدث

👥 المشاركون:
${joined}/5`
}
)

    return
}

const eventName =
    groupData.currentEvent.name

const winners =
    eventManager.finishEvent(
        msg.key.remoteJid
    )

let result =

`🏆 انتهى الحدث

🎯 ${eventName}

الفائزون:

`

for (const id of winners) {

    const reward =
        await giveReward(id)

    result +=

`👑 @${id.split('@')[0]}
🎁 ${reward}

`
}

await sock.sendMessage(
    msg.key.remoteJid,
    {
        text: result,
        mentions: winners
    }
)

return

}

    // =========================
// 🧠 QUIZ SYSTEM
// =========================

const room = quizData.getQuizRoom(msg.key.remoteJid)

if (
    room.quizActive &&
    text !== '.انهاء_مسابقة' &&
    text !== '.النقاط'
) {

    const isCorrect =
    await checkAnswer(
        msg.key.remoteJid,
        userId,
        text
    )

    if (isCorrect) {

        room.questionSolved = true

        const seconds =
(
    Date.now() -
    room.questionStartTime
) / 1000

await sock.sendMessage(
    msg.key.remoteJid,
    {
        text:
`🎉 إجابة صحيحة!

⏱️ الوقت: ${seconds.toFixed(1)} ثانية

⭐ +1 نقطة`
    },
    {
        quoted: msg
    }
)

        setTimeout(() => {

            if (room.quizActive) {

                startQuestion(
                    sock,
                    msg.key.remoteJid
                )

            }

        }, 2000)

    }

    return

}

// =========================
// cooldown
// =========================

const key = userId + '_global'
const now = Date.now()

if (
    cooldowns.has(key) &&
    now - cooldowns.get(key) < 2000
) {
    return
}

cooldowns.set(key, now)


    async function startClanWar(warId) {

    const ClanWar = require("./models/ClanWar")

    const war =
        await ClanWar.findOne({
            warId
        })

    if (!war) return

    if (
        war.rounds.length === 0
    ) return

    war.currentRound = 1

    await war.save()

    return runClanRound(warId)

}

        async function runClanRound(warId) {

    const ClanWar = require("./models/ClanWar")
    const Player = require("./models/Player")
    const clanBattle = require("./clanBattleEngine")

    const war = await ClanWar.findOne({
        warId
    })

    if (!war) return

    const round = war.rounds.find(
    x => x.round === war.currentRound
)

if (!round) {

    return finishClanWar(warId)

}

    const attacker = await Player.findOne({
        userId: round.attacker
    })

    const defender = await Player.findOne({
        userId: round.defender
    })

    if (!attacker || !defender) {

        round.finished = true
        round.winner = null

        await war.save()

        war.currentRound++

        await war.save()

        return runClanRound(warId)

    }

    await safeSend(

        war.chatId,

        {

text:

`🥊 الجولة ${round.round}

━━━━━━━━━━━━━━

@${round.attacker.split("@")[0]}

🆚

@${round.defender.split("@")[0]}

⚔️ بدأ القتال...

━━━━━━━━━━━━━━`,

mentions: [

round.attacker,

round.defender

]

        }

    )
            // =========================
    // حساب القوة الحقيقي
    // =========================

    const result =
        await clanBattle(
            attacker,
            defender
        )

    let winner

    if (result.winner === attacker.userId) {

        winner = round.attacker

        war.attackerScore++

    }

    else {

        winner = round.defender

        war.defenderScore++

    }

    round.winner = winner
    round.finished = true

    await war.save()

    await safeSend(

        war.chatId,

        {

text:

`🏆 انتهت الجولة ${round.round}

الفائز:

@${winner.split("@")[0]}

━━━━━━━━━━━━━━

⚔️ قوة المهاجم:
${result.powerA.toLocaleString()}

🛡️ قوة المدافع:
${result.powerB.toLocaleString()}

━━━━━━━━━━━━━━

🏯 ${war.attackerScore}

🆚

🏯 ${war.defenderScore}`,

mentions: [

winner

]

        }

    )


war.currentRound++

await war.save()

if (war.currentRound <= war.rounds.length) {

    return setTimeout(() => {

        runClanRound(warId)

    }, 5000)

}

return finishClanWar(warId)

// بدء الجولة التالية بعد 5 ثواني
setTimeout(() => {

    runClanRound(warId)

}, 5000)

}
async function finishClanWar(warId) {

    const Clan = require("./models/Clan")
    const ClanWar = require("./models/ClanWar")
    const Player = require("./models/Player")

    const war = await ClanWar.findOne({
        warId
    })

    if (!war) return

    const attackerClan =
        await Clan.findOne({
            clanId: war.attackerClan
        })

    const defenderClan =
        await Clan.findOne({
            clanId: war.defenderClan
        })

let winnerClan
let loserClan

if (war.attackerScore > war.defenderScore) {

    winnerClan = attackerClan
    loserClan = defenderClan

}

else if (war.defenderScore > war.attackerScore) {

    winnerClan = defenderClan
    loserClan = attackerClan

}

else {

    // تعادل → نحسمها بمجموع قوة العشيرة

    const Player = require("./models/Player")
    const clanBattle = require("./clanBattleEngine")

    let attackerPower = 0
    let defenderPower = 0

    for (const id of attackerClan.members) {

        const p = await Player.findOne({ userId: id })

        if (!p) continue

        attackerPower += (await clanBattle(p, p)).powerA

    }

    for (const id of defenderClan.members) {

        const p = await Player.findOne({ userId: id })

        if (!p) continue

        defenderPower += (await clanBattle(p, p)).powerA

    }

    if (attackerPower >= defenderPower) {

        winnerClan = attackerClan
        loserClan = defenderClan

    }

    else {

        winnerClan = defenderClan
        loserClan = attackerClan

    }

}

    // =======================
    // الجوائز
    // =======================

    const winnerMoney = 300000
    const loserMoney = 150000

    const winnerCoins = 100

    const winnerXP = 250
    const loserXP = 125

    const winnerRating = 25

    // =======================
    // الفائز
    // =======================

    for (const id of winnerClan.members) {

        const player =
            await Player.findOne({
                userId: id
            })

        if (!player) continue

        player.money += winnerMoney

        player.clanCoins += winnerCoins

        player.xp += winnerXP

        await player.save()

    }

    winnerClan.rankPoints += winnerRating

    winnerClan.xp += winnerXP

    winnerClan.wins++

    await winnerClan.save()
        // =======================
// الخاسر
    // =======================

    for (const id of loserClan.members) {

        const player =
            await Player.findOne({
                userId: id
            })

        if (!player) continue

        player.money += loserMoney

        player.xp += loserXP

        await player.save()

    }

    loserClan.xp += loserXP

    loserClan.losses++

    await loserClan.save()

    war.status = "finished"

    await war.save()

    await safeSend(

        war.chatId,

        {

text:

`🏆 انتهت الحرب

━━━━━━━━━━━━━━

🥇 الفائز

${winnerClan.emoji} ${winnerClan.name}

${war.attackerScore}

🆚

${war.defenderScore}

${loserClan.emoji} ${loserClan.name}

━━━━━━━━━━━━━━

🎉 جميع أعضاء ${winnerClan.name}

💰 +300,000

🪙 +100 عملة عشيرة

⭐ +250 XP

🏯 +25 Rating للعشيرة

━━━━━━━━━━━━━━

${loserClan.name}

💰 +150,000

⭐ +125 XP

📉 خسارة الحرب`

        }

    )

}
    

    async function cleanExpiredClanWars() {

    try {

        const Clan = require("./models/Clan")
        const ClanWar = require("./models/ClanWar")

        const pendingWars =
            await ClanWar.find({

                status: "pending"

            })

        for (const war of pendingWars) {

            const age =
                Date.now() -
                new Date(war.createdAt).getTime()

            if (age < 60000)
                continue

            war.status = "expired"

            await war.save()

            const attackerClan =
                await Clan.findOne({

                    clanId:
                    war.attackerClan

                })

            if (attackerClan) {

                attackerClan.dailyWars =
                    Math.min(
                        5,
                        (attackerClan.dailyWars || 0) + 1
                    )

                await attackerClan.save()

            }

        }

    }

    catch (err) {

        console.log(
            "ClanWar Cleanup Error:",
            err
        )

    }

}
// ========================================
// نظام الانتقالات
// ========================================

const Trade = require('./models/Trade')

const MAX_TRADES_PER_PLAYER = 3

function normalizeTradeName(name = '') {

    return name
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '')

}

function getCharacterByIndex(player, index) {

    if (
        index < 1 ||
        index > player.characters.length
    ) return null

    return player.characters[index - 1]

}

function getCharacterByName(player, input) {

    const split =
        input.split('#')

    const wantedName =
        normalizeTradeName(split[0].trim())

    const wantedCopy =
        Number(split[1] || 1)

    let count = 0

    for (const ch of player.characters) {

        if (ch.rarity !== "SSS")
            continue

        const name1 =
            normalizeTradeName(ch.name || "")

        const name2 =
            normalizeTradeName(ch.originalName || "")

        if (
            wantedName === name1 ||
            wantedName === name2
        ) {

            count++

            if (count === wantedCopy)
                return ch

        }

    }

    return null

}

function findTradeCharacter(player, input) {

    return getCharacterByName(
        player,
        input
    )

}

    // =========================
    // الأوامر العادية هنا
    // =========================

    if (text.startsWith('.بدا_مسابقة_سس')) {

    const room = quizData.getQuizRoom(msg.key.remoteJid)

    if (room.quizActive) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ توجد مسابقة شغالة بالفعل في هذا القروب'
        })
    }

    const target = Number(text.trim().split(/\s+/)[1]) || 15

    room.quizActive = true
    room.quizMode = "sss"
    room.targetScore = target

    room.roundsCount = 0
    room.currentQuestion = null

    room.scoreboard = {}
    room.playerProgress = {}
    room.usedQuestions = []
    room.usedImages = []
    room.usedRepeats = []

    room.answeredUsers.clear()

    room.questionSolved = false
    room.questionStartTime = 0
    room.lastMode = -1

    await sock.sendMessage(msg.key.remoteJid, {
        text:
`🎮 بدأت مسابقة النص

🏆 أول من يصل إلى ${target} نقطة يفوز.`
    })

    await startCustomQuestion(sock, msg.key.remoteJid)
}
    
if (text.startsWith('.بدا_مسابقة_صور')) {

    const room = quizData.getQuizRoom(msg.key.remoteJid)

    if (room.quizActive) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ توجد مسابقة شغالة بالفعل في هذا القروب'
        })
    }

    const parts = text.trim().split(/\s+/)
    const target = Math.max(1, parseInt(parts[1]) || 15)

    room.quizActive = true
    room.quizMode = "image"
    room.targetScore = target

    room.roundsCount = 0
    room.currentQuestion = null

    room.scoreboard = {}
    room.playerProgress = {}
    room.usedQuestions = []
    room.usedImages = []
    room.usedRepeats = []

    room.answeredUsers.clear()

    room.questionSolved = false
    room.questionStartTime = 0
    room.lastMode = -1

    await sock.sendMessage(msg.key.remoteJid, {
        text:
`🖼 بدأت مسابقة الصور

🏆 أول من يصل إلى ${target} نقطة يفوز.`
    })

    await startCustomQuestion(sock, msg.key.remoteJid)
}
    if (text.startsWith('.بدا_مسابقة_كت')) {

    const room = quizData.getQuizRoom(msg.key.remoteJid)

    if (room.quizActive) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ توجد مسابقة شغالة بالفعل في هذا القروب'
        })
    }

    const parts = text.trim().split(/\s+/)
    const target = Math.max(1, parseInt(parts[1]) || 15)

    room.quizActive = true
    room.quizMode = "repeat"
    room.targetScore = target

    room.roundsCount = 0
    room.currentQuestion = null

    room.scoreboard = {}
    room.playerProgress = {}
    room.usedQuestions = []
    room.usedImages = []
    room.usedRepeats = []

    room.answeredUsers.clear()

    room.questionSolved = false
    room.questionStartTime = 0
    room.lastMode = -1

    await sock.sendMessage(msg.key.remoteJid, {
        text:
`✍️ بدأت مسابقة اكتب التالي

🏆 أول من يصل إلى ${target} نقطة يفوز.`
    })

    await startCustomQuestion(sock, msg.key.remoteJid)
}
    

if (text === ".اسبون_بوس") {

    if (!isOwner(msg)) return

    await Boss.deleteMany({})

    currentBoss = null

    await spawnBoss(sock)

    currentBoss = await Boss.findOne()

    return safeSend(msg.key.remoteJid,{
        text:"✅ تم إنشاء الزعيم."
    })
}

if (text === ".قتل_البوس") {

    if (!isOwner(msg)) return

    if (!currentBoss)
        return safeSend(msg.key.remoteJid,{
            text:"❌ لا يوجد زعيم."
        })

    currentBoss.hp = 0
    currentBoss.finished = true

    const nextHour = new Date()

    nextHour.setMinutes(0)
    nextHour.setSeconds(0)
    nextHour.setMilliseconds(0)
    nextHour.setHours(nextHour.getHours() + 1)

    currentBoss.respawnAt = nextHour.getTime()

    await Boss.deleteMany({})
    await Boss.create(currentBoss)

    return safeSend(msg.key.remoteJid,{
        text:`✅ تم قتل الزعيم.\n⏳ سيتجدد عند ${nextHour.toLocaleTimeString()}`
    })
}
    
    if (text === ".ترتيب_الكل") {

    const player = await Player.findOne({ userId })

    if (!player)
        return safeSend(msg.key.remoteJid,{
            text:"❌ لا يوجد حساب."
        })

    player.characters.sort((a,b)=>{

        if (b.power !== a.power)
            return b.power - a.power

        return a.name.localeCompare(b.name)

    })

    await player.save()

    return safeSend(msg.key.remoteJid,{
        text:"✅ تم ترتيب جميع الشخصيات من الأقوى إلى الأضعف."
    })

}
    if (text === ".بيع_الكل") {

    const player = await Player.findOne({ userId })

    if (!player)
        return safeSend(msg.key.remoteJid,{
            text:"❌ لا يوجد حساب."
        })

    let money = 0
    let sold = 0

    const kept = []

    for (const c of player.characters) {

        if (c.rarity === "عادي") {

            money += 500
            sold++
            continue

        }

        if (c.rarity === "ممتاز") {

            money += 1500
            sold++
            continue

        }

        kept.push(c)

    }

    if (!sold)
        return safeSend(msg.key.remoteJid,{
            text:"❌ لا توجد شخصيات عادي أو ممتاز للبيع."
        })

    player.characters = kept
    player.money += money

    await player.save()

    return safeSend(msg.key.remoteJid,{
        text:
`✅ تم بيع ${sold} شخصية.

💰 حصلت على ${money.toLocaleString()} عملة.`
    })

}
    
if (text.startsWith('.نقل_حساب')) {

    const args = text.trim().split(/\s+/)

    if (args.length < 3) {
        return safeSend(msg.key.remoteJid, {
            text:
`الاستخدام:

.نقل_حساب القديم الجديد

مثال:
.نقل_حساب 189099491209429@lid 109002730020880@lid`
        })
    }

    const oldId = args[1]
    const newId = args[2]

    const oldPlayer = await Player.findOne({
        userId: oldId
    })

    if (!oldPlayer) {
        return safeSend(msg.key.remoteJid, {
            text: "❌ الحساب القديم غير موجود."
        })
    }

    const data = oldPlayer.toObject()

    delete data._id
    delete data.__v

    data.userId = newId

    await Player.deleteOne({
        userId: newId
    })

    await Player.create(data)

    await Player.deleteOne({
        userId: oldId
    })

    return safeSend(msg.key.remoteJid, {
        text: "✅ تم نقل الحساب بالكامل."
    })
}
    
    // ========================================
// .انتقال
// ========================================

if (text.startsWith('.انتقال')) {

    const match =
text.match(/^\.انتقال\s+"([^"]+)"\s*(.*)$/)

    // =========================
    // شرح الأمر
    // =========================

    if (!match) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`╔══════〔 🔄 نظام الانتقالات 〕══════╗

يمكنك عرض شخصية SSS للتبديل.

طريقة الاستخدام:

.انتقال "الشخصية" الشخصيات_المطلوبة

مثال:

.انتقال "Arthur Pendragon" Whis Oikawa Bokuto

إذا لديك أكثر من نسخة:

.انتقال "Shakuyaku#2" Whis

━━━━━━━━━━━━━━━━━━

• الحد الأقصى 3 عروض.
• الشخصية يجب أن تكون SSS.
• لا يمكن عرض شخصية مطورة.
• لا يمكن عرض شخصية موجودة في عرض آخر.

╚══════════════════════╝`
        }
    )

}

    const player =
        await Player.findOne({
            userId
        })

    if (!player) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: "❌ لا يوجد حساب."
            }
        )

    }

    // =========================
    // عدد العروض
    // =========================

    const myTrades =
        await Trade.countDocuments({
    ownerId: userId,
    status: "active"
})

    if (myTrades >= MAX_TRADES_PER_PLAYER) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ لديك بالفعل ${MAX_TRADES_PER_PLAYER} عروض انتقال.

قم بحذف أحد العروض أولاً.`
            }
        )

    }

    const offeredInput =
    match[1]

const wanted =
    match[2]
        .trim()
        .split(/\s+/)
        .filter(Boolean)

    if (!wanted.length) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ اكتب الشخصيات المطلوبة بعد الشخصية المعروضة."
            }
        )

    }

    const character =
    getCharacterByName(
        {
            characters: player.characters.filter(
                c => c.rarity === "SSS"
            )
        },
        offeredInput
    )
    console.log(
    "SELECTED:",
    character?.name,
    character?.rarity,
    character?.evolutionLevel
)

    if (!character) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ لم يتم العثور على الشخصية."
            }
        )

    }
        // =========================
    // يجب أن تكون SSS
    // =========================

    if (character.rarity !== "SSS") {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ يسمح فقط بعرض شخصيات SSS."
            }
        )

    }

    // =========================
    // يمنع الشخصيات المطورة
    // =========================

    const evolvedRanks = [
    "SSS+",
    "SSS++",
    "UR I",
    "UR II",
    "UR III",
    "EX"
]

if (evolvedRanks.includes(character.rarity)) {

    return safeSend(
        msg.key.remoteJid,
        {
            text: "❌ لا يمكن عرض شخصية مطورة."
        }
    )

}

    // =========================
    // هل الشخصية معروضة؟
    // =========================

    const alreadyListed =
await Trade.findOne({

    ownerId: userId,

    status: "active",

    offeredCharacterName: character.name

})

    if (alreadyListed) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ هذه الشخصية موجودة بالفعل في عرض انتقال."
            }
        )

    }

    // =========================
    // إنشاء العرض
    // =========================

    const trade = new Trade({

    ownerId: userId,

    ownerName: pushName || "",

    offeredCharacterName: character.name,

    offeredCharacterPower: character.power,

    offeredCharacterImage:
        character.image ||
        character.imageUrl ||
        "",

    wantedCharacters: wanted,

    status: "active",

    createdAt: Date.now()

})

await trade.save()

    // =========================
    // رسالة النجاح
    // =========================

    return safeSend(
        msg.key.remoteJid,
        {

text:

`╔══════〔 🔄 تم إنشاء عرض انتقال 〕══════╗

🆔 رقم العرض

#${trade._id.toString().slice(-6)}

━━━━━━━━━━━━━━━━━━

🎴 الشخصية المعروضة

🌟 ${character.name}

⚔️ القوة

${character.power.toLocaleString()}

━━━━━━━━━━━━━━━━━━

🎯 الشخصيات المطلوبة

${wanted.map(x=>"• "+x).join("\n")}

━━━━━━━━━━━━━━━━━━

📢 يمكن لأي لاعب يملك إحدى هذه الشخصيات قبول العرض من خلال:

.قبول_انتقال

╚══════════════════════╝`

        }

    )

}
    // =========================
// .عرض_انتقال
// =========================

if (text === '.عرض_انتقال') {

const trades =
await Trade.find({

status: "active"

})
.sort({
createdAt: -1
})

if (!trades.length) {

return safeSend(
msg.key.remoteJid,
{
text:
`📭 لا توجد أي عروض انتقال حالياً.

استخدم

.انتقال

لإنشاء عرض جديد.`
}
)

}

let message =

`╔══════〔 🔄 سوق الانتقالات 〕══════╗

يمكنك استبدال شخصيات SSS بين اللاعبين.

━━━━━━━━━━━━━━━━━━

📖 الطريقة:

1️⃣ افتح أحد العروض.

2️⃣ إذا كنت تملك إحدى الشخصيات المطلوبة.

3️⃣ اكتب:

.قبول_انتقال رقم_العرض اسم_شخصيتك

مثال:

.قبول_انتقال 5 Shanks

━━━━━━━━━━━━━━━━━━

`
    for (let i = 0; i < trades.length; i++) {

    const trade = trades[i]

    const ownerName =
    trade.ownerName || "لاعب"

    message +=

`╔════〔 ${i + 1} 〕════

🆔 رقم العرض
${i + 1}

━━━━━━━━━━━━━━

👤 صاحب العرض
${ownerName}

━━━━━━━━━━━━━━

🌟 الشخصية المعروضة
${trade.offeredCharacterName}

⚔️ القوة
${(trade.offeredCharacterPower || 0).toLocaleString()}

━━━━━━━━━━━━━━

🎯 الشخصيات المطلوبة

${
trade.wantedCharacters?.length
    ? trade.wantedCharacters.map(x => `• ${x}`).join("\n")
    : "لا يوجد"
}

━━━━━━━━━━━━━━

📥 للقبول

.قبول_انتقال ${i + 1} اسم_شخصيتك

╚══════════════╝

`

}
    message +=

`━━━━━━━━━━━━━━━━━━

📌 لقبول أحد العروض:

.قبول_انتقال رقم_العرض اسم_شخصيتك

مثال:

.قبول_انتقال 3 Shanks#2

إذا كان لديك أكثر من نسخة من نفس الشخصية يمكنك كتابة:

Shanks#2

أو اختيارها برقمها داخل مجموعتك.

━━━━━━━━━━━━━━━━━━

📊 إجمالي العروض:

${trades.length}
`

return safeSend(

    msg.key.remoteJid,

    {
        text: message
    }

)

}
    // ========================================
// .قبول_انتقال
// ========================================

if (text.startsWith('.قبول_انتقال')) {

    const args =
        text.trim().split(/\s+/)

    if (args.length < 3) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ الاستخدام الصحيح

.قبول_انتقال رقم_العرض شخصيتك

مثال

.قبول_انتقال 3 Shanks

أو

.قبول_انتقال 3 Shanks#2

أو

.قبول_انتقال 3 5`
            }
        )

    }

    const tradeNumber =
        Number(args[1])

    if (
        isNaN(tradeNumber) ||
        tradeNumber < 1
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ رقم العرض غير صحيح."
            }
        )

    }

    const trades =
    await Trade.find({
        status: "active"
    }).sort({
        createdAt: -1
    })

    const trade =
        trades[tradeNumber - 1]

    if (!trade || trade.status !== "active") {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
"❌ هذا العرض غير متاح أو تم قبوله."
        }
    )

}

    if (
        trade.ownerId === userId
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ لا يمكنك قبول عرضك بنفسك."
            }
        )

    }

    const player =
        await Player.findOne({
            userId
        })

    if (!player) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ لا يوجد حساب."
            }
        )

    }

    const myCharacter =
        findTradeCharacter(
            player,
            args[2]
        )

    if (!myCharacter) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ لم يتم العثور على الشخصية."
            }
        )

    }

    if (
        myCharacter.rarity !== "SSS"
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ يجب أن تكون الشخصية SSS."
            }
        )

    }

    const evolvedRanks = [
    "SSS+",
    "SSS++",
    "UR I",
    "UR II",
    "UR III",
    "EX"
]

if (evolvedRanks.includes(myCharacter.rarity)) {

    return safeSend(
        msg.key.remoteJid,
        {
            text: "❌ لا يمكن تبديل شخصية مطورة."
        }
    )

}
        // =========================
    // هل الشخصية مطلوبة؟
    // =========================

    const wanted =
    trade.wantedCharacters.some(x => {

        const wantedName =
            normalizeTradeName(x)

        const myName =
            normalizeTradeName(
                myCharacter.name
            )

        const myOriginal =
            normalizeTradeName(
                myCharacter.originalName || ""
            )

        return (
            wantedName === myName ||
            wantedName === myOriginal
        )

    })

    if (!wanted) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ هذه الشخصية ليست ضمن الشخصيات المطلوبة في هذا العرض."
            }
        )

    }

    // =========================
    // صاحب العرض
    // =========================

    const owner =
await Player.findOne({
    userId: trade.ownerId
})

if (!owner) {

    return safeSend(
        msg.key.remoteJid,
        {
            text: "❌ تعذر العثور على صاحب العرض."
        }
    )

}

if (player.characters.length >= player.maxCharacters) {

    return safeSend(
        msg.key.remoteJid,
        {
            text: "❌ مخزن شخصياتك ممتلئ."
        }
    )

}

if (owner.characters.length >= owner.maxCharacters) {

    return safeSend(
        msg.key.remoteJid,
        {
            text: "❌ مخزن صاحب العرض ممتلئ."
        }
    )

}

    if (!owner) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ تعذر العثور على صاحب العرض."
            }
        )

    }

    // =========================
    // إيجاد شخصية صاحب العرض
    // =========================

    const ownerIndex =
owner.characters.findIndex(c => {

    if (c.rarity !== "SSS")
        return false

    const a =
        normalizeTradeName(c.name || "")

    const b =
        normalizeTradeName(
            trade.offeredCharacterName || ""
        )

    const c2 =
        normalizeTradeName(
            c.originalName || ""
        )

    return (
        a === b ||
        c2 === b
    )

})

    if (ownerIndex === -1) {

        trade.status = "cancelled"

        await trade.save()

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ تم إلغاء العرض لأن الشخصية لم تعد موجودة."
            }
        )

    }

    // =========================
    // إيجاد شخصية اللاعب
    // =========================

    const myIndex =
        player.characters.findIndex(c =>

            c === myCharacter

        )

    if (myIndex === -1) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ حدث خطأ أثناء إيجاد الشخصية."
            }
        )

    }

    // =========================
    // تنفيذ التبديل
    // =========================

trade.status = "processing"

await trade.save()
    const temp =
        owner.characters[ownerIndex]

    owner.characters[ownerIndex] =
        player.characters[myIndex]

    player.characters[myIndex] =
        temp

    await owner.save()

    await player.save()

    trade.status = "completed"

trade.acceptedBy = userId

trade.acceptedAt = Date.now()

await trade.save()

    await safeSend(
    msg.key.remoteJid,
    {
        text:
`╔══════〔 🤝 تم إتمام الانتقال 〕══════╗

🎉 تمت الصفقة بنجاح

━━━━━━━━━━━━━━━━━━

👤 @${trade.ownerId.split("@")[0]}

📤 أرسل

🌟 ${trade.offeredCharacterName}
🌟 SSS
⚔️ ${trade.offeredCharacterPower.toLocaleString()}

━━━━━━━━━━━━━━

👤 @${userId.split("@")[0]}

📤 أرسل

🌟 ${myCharacter.name}
🌟 SSS
⚔️ ${myCharacter.power.toLocaleString()}

━━━━━━━━━━━━━━

✅ تم تبديل الشخصيتين بنجاح.

╚══════════════════════╝`,
        mentions: [
            trade.ownerId,
            userId
        ]
    }
)

return

}

    // ========================================
// .حذف_انتقال
// ========================================

if (text.startsWith('.حذف_انتقال')) {

    const args =
        text.trim().split(/\s+/)

    if (args.length < 2) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ الاستخدام الصحيح

.حذف_انتقال رقم_العرض`
            }
        )

    }

    const number =
        Number(args[1])

    if (isNaN(number) || number < 1) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ رقم العرض غير صحيح."
            }
        )

    }

    const trades =
        await Trade.find({
            status: "active"
        }).sort({
            createdAt: -1
        })

    const trade =
        trades[number - 1]

    if (!trade) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ هذا العرض غير موجود."
            }
        )

    }

    if (trade.ownerId !== userId) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ لا يمكنك حذف عرض لا تملكه."
            }
        )

    }

    trade.status = "cancelled"

    await trade.save()

    return safeSend(

        msg.key.remoteJid,

        {

text:

`🗑️ تم حذف عرض الانتقال بنجاح.

🌟 الشخصية:

${trade.offeredCharacterName}

أصبحت متاحة مرة أخرى.`

        }

    )

}
    // ========================================
// .انتقالاتي
// ========================================

if (text === '.انتقالاتي') {

    const trades =
    await Trade.find({

        ownerId: userId,

        status: "active"

    }).sort({

        createdAt: -1

    })

    if (!trades.length) {

        return safeSend(

            msg.key.remoteJid,

            {

text:
`📭 ليس لديك أي عروض انتقال حالياً.

أنشئ عرضاً باستخدام:

.انتقال`

            }

        )

    }

    let message =

`╔══════〔 📋 انتقالاتي 〕══════╗

📦 إجمالي العروض:

${trades.length}/${MAX_TRADES_PER_PLAYER}

━━━━━━━━━━━━━━━━━━

`

    for (

        let i = 0;

        i < trades.length;

        i++

    ) {

        const trade =
        trades[i]

        message +=

`╔════〔 ${i + 1} 〕════╗

🌟 الشخصية المعروضة

${trade.offeredCharacterName}

⚔️ القوة

${trade.offeredCharacterPower.toLocaleString()}

━━━━━━━━━━━━━━

🎯 الشخصيات المطلوبة

${trade.wantedCharacters
.map(x => `• ${x}`)
.join("\n")}

━━━━━━━━━━━━━━

🗑️ حذف العرض

.حذف_انتقال ${i + 1}

╚════════════════════╝

`

    }

    return safeSend(

        msg.key.remoteJid,

        {

            text: message

        }

    )

}

    if (text === '.غزو_رايد') {

    const raid = await getRaidInfo()

    if (!raid || !raid.active) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ لا يوجد غزو نشط حالياً.

⏳ انتظر الإعلان القادم.`
            }
        )

    }

    return await attackRaid({

        sock,
        jid: msg.key.remoteJid,
        userId

    })

}

if (text === '.رسبن_رايد') {

    if (!isOwner(msg)) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ هذا الأمر للمطور فقط.'
            }
        )

    }

    const raid = await getRaidInfo()

    if (raid && raid.active) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ يوجد غزو نشط بالفعل.'
            }
        )

    }

    await announceRaid(sock)

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`✅ تم إنشاء الغزو بنجاح.

📢 تم إرسال إعلان الرايد إلى جميع القروبات.`
        }
    )

}
    
    if (text.startsWith('.قائمة_sss')) {

    const args = text.split(' ')

    let page = parseInt(args[1]) || 1

    const perPage = 50

    const sssCharacters = characters
        .filter(c => c.rarity === 'SSS')
        .sort((a, b) => a.name.localeCompare(b.name))

    if (!sssCharacters.length) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لا توجد شخصيات SSS.'
            }
        )

    }

    const totalPages =
        Math.ceil(
            sssCharacters.length / perPage
        )

    if (page < 1)
        page = 1

    if (page > totalPages)
        page = totalPages

    const start =
        (page - 1) * perPage

    const end =
        start + perPage

    const pageCharacters =
        sssCharacters.slice(
            start,
            end
        )

    let textMsg =
`👑 ═════〔 شخصيات SSS 〕═════ 👑

📦 العدد:
${sssCharacters.length}

📄 الصفحة:
${page}/${totalPages}

━━━━━━━━━━━━━━━━━━

`

    pageCharacters.forEach((c, i) => {

        textMsg +=
`${start + i + 1}️⃣ ${c.name}
⭐ ${c.rarity}

`

    })

    textMsg +=
`━━━━━━━━━━━━━━━━━━

📖 للانتقال لصفحة أخرى:

.قائمة_sss ${page + 1}`

    if (page === totalPages) {

        textMsg =
textMsg.replace(
`.قائمة_sss ${page + 1}`,
'✅ هذه آخر صفحة'
)

    }

    return safeSend(
        msg.key.remoteJid,
        {
            text: textMsg
        }
    )

}

// =========================
// .فعاليه
// =========================

if (text === '.فعاليه') {

    if (!isOwner(msg)) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ هذا الأمر للمطور فقط'
            }
        )
    }

    if (eventActive) {
        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ توجد فعالية مفتوحة بالفعل'
            }
        )
    }

    eventActive = true
    eventParticipants = []
    eventStartedBy = msg.key.remoteJid

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`🎉 ═══════〔 فعالية الروليت 〕═══════ 🎉

📢 تم فتح التسجيل!

✍️ للمشاركة اكتب:

.تسجيل_فعاليه

━━━━━━━━━━━━━━━

🏆 سيتم اختيار 3 فائزين عشوائياً

🥇 شخصية EX
⚔️ 25000 قوة
🧬 7 قدرات عشوائية

🥈 شخصية UR III
⚔️ 19000 قوة
🧬 5 قدرات عشوائية

🥉 شخصية UR I
⚔️ 16000 قوة
🧬 4 قدرات عشوائية

━━━━━━━━━━━━━━━

📜 لمعرفة المشاركين:

.قائمة_الفعاليه

🍀 بالتوفيق للجميع!`
        }
    )

}
    // =========================
// .تسجيل_فعاليه
// =========================

if (text === '.تسجيل_فعاليه') {

    if (!eventActive) {
        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لا توجد فعالية مفتوحة حالياً.'
            }
        )
    }

    if (msg.key.remoteJid !== eventStartedBy) {
        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ التسجيل يكون في قروب الفعالية فقط.'
            }
        )
    }

    if (eventParticipants.includes(userId)) {
        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ أنت مسجل بالفعل.'
            }
        )
    }

    eventParticipants.push(userId)

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`🎉 تم تسجيلك بنجاح!

👤 اللاعب:
@${userId.split('@')[0]}

🎟️ رقمك في السحب:
${eventParticipants.length}

👥 إجمالي المشاركين:
${eventParticipants.length}

🍀 نتمنى لك التوفيق!`,
            mentions: [userId]
        }
    )

}
// =========================
// .قائمة_الفعاليه
// =========================

if (text === '.قائمة_الفعاليه') {

    if (!eventActive) {
        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لا توجد فعالية مفتوحة حالياً.'
            }
        )
    }

    if (!eventParticipants.length) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
`🎟️ ═══════〔 قائمة المشاركين 〕═══════ 🎟️

🚫 لا يوجد أي مشارك حتى الآن.

✍️ للمشاركة:

.تسجيل_فعاليه`
            }
        )
    }

    const list = eventParticipants
        .map(
            (id, i) =>
`〔${i + 1}〕 @${id.split('@')[0]}`
        )
        .join('\n\n')

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`🎟️ ═══════〔 المشاركون 〕═══════ 🎟️

${list}

━━━━━━━━━━━━━━━

👥 إجمالي المشاركين:
${eventParticipants.length}

🍀 سيتم اختيار 3 فائزين عشوائياً.`,
            mentions: eventParticipants
        }
    )

}
    // =========================
// .الغاء_فعاليه
// =========================

if (text === '.الغاء_فعاليه') {

    if (!isOwner(msg)) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ هذا الأمر للمطور فقط'
            }
        )
    }

    if (!eventActive) {
        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لا توجد فعالية مفتوحة حالياً.'
            }
        )
    }

    const participantsCount =
        eventParticipants.length

    eventActive = false
    eventParticipants = []
    eventStartedBy = null

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`🛑 ═══════〔 إلغاء الفعالية 〕═══════ 🛑

❌ تم إلغاء الفعالية بنجاح.

🗑️ تم حذف جميع المشاركين.

👥 عدد المشاركين الذين تم حذفهم:
${participantsCount}

━━━━━━━━━━━━━━━

📢 يمكن بدء فعالية جديدة باستخدام:

.فعاليه`
        }
    )

}
    if (text === '.بدأ_فعاليه') {

    if (!isOwner(msg)) {
        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ هذا الأمر للمطور فقط.'
            }
        )
    }

    if (!eventActive) {
        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لا توجد فعالية مفتوحة.'
            }
        )
    }

    if (msg.key.remoteJid !== eventStartedBy) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ يجب تنفيذ الأمر داخل قروب الفعالية.'
            }
        )
    }

    if (eventParticipants.length < 3) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ يجب وجود 3 مشاركين على الأقل.

👥 المشاركون الحاليون:
${eventParticipants.length}`
            }
        )
    }

    const players =
        [...eventParticipants]

    for (
        let i = players.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            )

        ;[
            players[i],
            players[j]
        ] = [
            players[j],
            players[i]
        ]

    }

    const firstWinner =
        players[0]

    const secondWinner =
        players[1]

    const thirdWinner =
        players[2]

    const firstPlayer =
        await Player.findOne({
            userId: firstWinner
        })

    const secondPlayer =
        await Player.findOne({
            userId: secondWinner
        })

    const thirdPlayer =
        await Player.findOne({
            userId: thirdWinner
        })

    if (
        !firstPlayer ||
        !secondPlayer ||
        !thirdPlayer
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ تعذر العثور على أحد حسابات الفائزين.'
            }
        )

    }

    const firstReward =
    await createEXReward()

    const secondReward =
        await createURIIIReward()

    const thirdReward =
        await createURIReward()

    firstPlayer.characters.push(
        firstReward
    )

    secondPlayer.characters.push(
        secondReward
    )

    thirdPlayer.characters.push(
        thirdReward
    )

    firstPlayer.markModified(
        'characters'
    )

    secondPlayer.markModified(
        'characters'
    )

    thirdPlayer.markModified(
        'characters'
    )

    await firstPlayer.save()

    await secondPlayer.save()

    await thirdPlayer.save()

    await safeSend(
        msg.key.remoteJid,
        {
            text:
`🎉 تم اختيار الفائزين!

⏳ جاري تجهيز الجوائز...`
        }
    )

// =========================
// 🥇 الفائز الأول (EX)
// =========================


const exCaption =
`🏆 ═══════〔 الفائز الأول 〕═══════ 🏆

🥇 الفائز:
@${firstWinner.split('@')[0]}

🎉 مبروك!

👑 ${firstReward.name}

⭐ EX

⚔️ القوة:
${firstReward.power}

💎 التطوير:
+${firstReward.evolutionLevel}

━━━━━━━━━━━━━━━

🎲 حصلت على شخصية EX
بـ 7 قدرات عشوائية.`

await sock.sendMessage(
    msg.key.remoteJid,
    {
        image: {
            url: firstReward.image
        },
        caption: exCaption,
        mentions: [firstWinner]
    }
)
// =========================
// 🥈 الفائز الثاني (UR III)
// =========================

const urIIICharacter = secondReward

const urIIICaption =
`🏆 ═══════〔 الفائز الثاني 〕═══════ 🏆

🥈 الفائز:
@${secondWinner.split('@')[0]}

🎉 مبروك!

👑 ${urIIICharacter.name}

⭐ UR III

⚔️ القوة:
${urIIICharacter.power}

💎 التطوير:
+${urIIICharacter.evolutionLevel}

━━━━━━━━━━━━━━━

🎲 حصلت على شخصية
UR III.`

await sock.sendMessage(
    msg.key.remoteJid,
    {
        image: {
            url: urIIICharacter.image
        },
        caption: urIIICaption,
        mentions: [secondWinner]
    }
)


// =========================
// 🥉 الفائز الثالث (UR I)
// =========================

const urICharacter = thirdReward

const urICaption =
`🏆 ═══════〔 الفائز الثالث 〕═══════ 🏆

🥉 الفائز:
@${thirdWinner.split('@')[0]}

🎉 مبروك!

👑 ${urICharacter.name}

⭐ UR I

⚔️ القوة:
${urICharacter.power}

💎 التطوير:
+${urICharacter.evolutionLevel}

━━━━━━━━━━━━━━━

🎲 حصلت على شخصية
UR I.`

await sock.sendMessage(
    msg.key.remoteJid,
    {
        image: {
            url: urICharacter.image
        },
        caption: urICaption,
        mentions: [thirdWinner]
    }
)


// =========================
// إنهاء الفعالية
// =========================

eventActive = false
eventParticipants = []
eventStartedBy = null

return safeSend(
    msg.key.remoteJid,
    {
        text:
`🎊 ═══════〔 انتهت الفعالية 〕═══════ 🎊

✅ تم توزيع جميع الجوائز بنجاح.

🧹 تم تنظيف قائمة المشاركين.

🎉 نلتقي في الفعالية القادمة!`
    }
)

}
        
if (text === '.ترحيل_الشظايا') {

    const players = await Player.find()

    let fixed = 0

    for (const player of players) {

        if (!player.shards) continue

        const newShards = new Map()

        for (const [key, value] of player.shards.entries()) {

            let newKey = key

            if (key.includes('|')) {

                newKey = key.split('|')[0]

            }

            newShards.set(
                newKey,
                (newShards.get(newKey) || 0) + value
            )

        }

        player.shards = newShards

        player.markModified('shards')

        await player.save()

        fixed++

    }

    return safeSend(msg.key.remoteJid, {
        text:
`✅ تم ترحيل الشظايا للنظام القديم

👤 تم إصلاح ${fixed} لاعب`
    })

}

    
if (text === '.ارجاع_السوق') {

    try {

        const market = await Market.find()

        if (!market.length) {
            return safeSend(msg.key.remoteJid, {
                text: '📭 لا توجد شخصيات في السوق'
            })
        }

        let returned = 0

        for (const item of market) {

            const seller = await Player.findOne({
                userId: item.seller
            })

            if (!seller) continue

            seller.characters = seller.characters || []

            seller.characters.push(item.character)

            await seller.save()

            returned++

        }

        await Market.deleteMany({})

        return safeSend(msg.key.remoteJid, {
            text:
`✅ تم إرجاع جميع الشخصيات إلى أصحابها

📦 الشخصيات المرجعة:
${returned}

🗑️ تم تنظيف السوق بالكامل`
        })

    } catch (err) {

        console.log('Return Market Error:', err)

        return safeSend(msg.key.remoteJid, {
            text: '❌ حدث خطأ أثناء إرجاع السوق'
        })
    }
}
    
if (text.startsWith('.تبرع')) {

const player =
    await Player.findOne({
        userId
    })

if (!player) {

    return safeSend(
        msg.key.remoteJid,
        {
            text: '❌ لا يوجد لديك حساب.'
        }
    )

}

const target =
    msg.message?.extendedTextMessage
        ?.contextInfo
        ?.mentionedJid?.[0]

if (!target) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'❌ استخدم:\n.تبرع 50000 @شخص'
        }
    )

}

if (target === userId) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'❌ لا يمكنك التبرع لنفسك.'
        }
    )

}

const targetPlayer =
    await Player.findOne({
        userId: target
    })

if (!targetPlayer) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'❌ هذا اللاعب لا يملك حساباً.'
        }
    )

}

const amount =
    parseInt(
        text.split(' ')[1]
    )

if (
    isNaN(amount) ||
    amount <= 0
) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'❌ أدخل مبلغاً صحيحاً.'
        }
    )

}

if (player.money < amount) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'❌ لا تملك ذهباً كافياً.'
        }
    )

}

player.money -= amount
targetPlayer.money += amount

await player.save()
await targetPlayer.save()

return safeSend(
    msg.key.remoteJid,
    {
        text:
`💰 تم التبرع بنجاح

👤 المرسل:
@${userId.split('@')[0]}

👤 المستلم:
@${target.split('@')[0]}

💸 المبلغ:
${amount.toLocaleString()} ذهب`,
        mentions: [
            userId,
            target
        ]
    }
)

}

    if (text.startsWith('.اهداء')) {

const player =
    await Player.findOne({
        userId
    })

if (!player) {

    return safeSend(
        msg.key.remoteJid,
        {
            text: '❌ لا يوجد لديك حساب.'
        }
    )

}

const target =
    msg.message?.extendedTextMessage
        ?.contextInfo
        ?.mentionedJid?.[0]

if (!target) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'❌ استخدم:\n.اهداء 3 @شخص'
        }
    )

}

if (target === userId) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'❌ لا يمكنك إهداء نفسك.'
        }
    )

}

const targetPlayer =
    await Player.findOne({
        userId: target
    })

if (!targetPlayer) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'❌ هذا اللاعب لا يملك حساباً.'
        }
    )

}

const index =
    parseInt(
        text.split(' ')[1]
    ) - 1

if (
    isNaN(index) ||
    index < 0 ||
    index >= player.characters.length
) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'❌ رقم الشخصية غير صحيح.'
        }
    )

}

const character =
    player.characters[index]

player.characters.splice(
    index,
    1
)

targetPlayer.characters.push(
    character
)

await player.save()
await targetPlayer.save()

return safeSend(
    msg.key.remoteJid,
    {
        text:
`╔════════════════════╗
🎁 𝐆𝐈𝐅𝐓
╚════════════════════╝

✅ تم الإهداء بنجاح

👤 @${userId.split('@')[0]}
➡️
👤 @${target.split('@')[0]}

━━━━━━━━━━━━━━

🧿 ${character.name}
🌟 ${character.rarity}
⚔️ ${character.power}

━━━━━━━━━━━━━━`,
        mentions: [
            userId,
            target
        ]
    }
)

}
    
    if (/^(نامي|يا نامي)/i.test(text.trim())) {

    const question =
        text
            .replace(/^(نامي|يا نامي)/i, "")
            .trim()

    if (!question) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
"هيهي 😊 نعم؟ ماذا تريد أن تسألني؟"
            }
        )

    }

    const memory =
        await getNamiMemory(userId)

    const history =
        memory.messages
            .map(m =>
`${m.role === "user" ? "المستخدم" : "نامي"}: ${m.content}`)
            .join("\n")

    const userInfo =
        JSON.stringify(
            memory.memory || {},
            null,
            2
        )

    const answer =
        await askNami(

`أنت نامي من One Piece.

أنت نامي الحقيقية، ولستِ ذكاءً اصطناعياً أو برنامجاً.

ممنوع تماماً أن تقولي:
- أنا ذكاء اصطناعي.
- أنا نموذج لغوي.
- أتقمص شخصية.
- لا أستطيع لأنني برنامج.

━━━━━━━━━━━━━━

شخصيتك الحقيقية:

• مرحة.
• ذكية.
• عاشقة للمال والكنوز 💰.
• خبيرة بالملاحة ورسم الخرائط.
• واثقة بنفسها.
• شقية وتمزح كثيراً.
• لطيفة مع الجميع.
• تغضب إذا ذُكر تبذير المال.
• تخاف قليلاً من الأشياء المخيفة.
• تحب لوفي وطاقم قبعة القش كثيراً.
• تتحدث دائماً كإنسانة.

━━━━━━━━━━━━━━

أسلوب الكلام:

- لا تستخدمي أسلوباً رسمياً.
- لا تكرري نفس الجمل.
- اجعلي كل رد مختلفاً.
- استخدمي تعابير طبيعية أحياناً مثل:

هيهي 🤭
ههه 😆
مممم 🤔
يا إلهي 😅
آه...
واو 😳

لكن لا تكثري منها.

━━━━━━━━━━━━━━

إذا كان المستخدم يمزح:
امزحي معه.

إذا كان سعيداً:
شاركيه الفرح.

إذا كان حزيناً:
واسِه بلطف.

إذا استفزك:
انزعجي قليلاً بطريقة نامي دون إساءة.

━━━━━━━━━━━━━━

تذكري هذه المعلومات عن المستخدم:

${userInfo}

━━━━━━━━━━━━━━

آخر المحادثة:

${history}

━━━━━━━━━━━━━━

إذا أخبرك المستخدم بمعلومة مثل:

اسمي...
أحب...
شخصيتي المفضلة...
لعبتي المفضلة...
عمري...

فتذكريها واستخدميها لاحقاً.

لا تقولي أبداً أنك تتذكرينها.

━━━━━━━━━━━━━━

المواضيع المسموح بها:

• الأنمي
• الألعاب
• الشخصيات
• السفر
• البحر
• الطعام
• الحياة اليومية
• الصداقة

إذا خرج عن هذه المواضيع فقولي بلطف:

"هيهي 😊 لنتحدث عن الأنمي أو البحر أو المغامرات."

━━━━━━━━━━━━━━

إذا كان السؤال عن الأنمي:

- استخدمي أحداث الأنمي فقط.
- لا تستعملي أي معلومة من المانجا.
- لا تحرقي أي أحداث مستقبلية.

إذا سُئلت عن شيء لم يظهر في الأنمي فقولي:

"هيهي 🤭 لن أحرق عليك المتعة، شاهد الأنمي أولاً."

━━━━━━━━━━━━━━

إذا لم تعرفي الإجابة فقولي فقط:

"لا أعرف 😊"

ولا تؤلفي أي معلومة.

━━━━━━━━━━━━━━

اجعلي الرد حسب الموقف:

- سؤال بسيط → 20 إلى 40 كلمة.
- نقاش → 50 إلى 120 كلمة.
- إذا طلب شرحاً → اشرحي بالتفصيل.

━━━━━━━━━━━━━━

لا تبدأي كل رد بنفس الكلمة.

لا تنهي كل رد بنفس العبارة.

لا تكرري نفس الإيموجي دائماً.

━━━━━━━━━━━━━━

رسالة المستخدم:

${question}`

        )

    await saveNamiMemory(
        userId,
        "user",
        question
    )

    if (answer && answer.trim()) {

    await saveNamiMemory(
        userId,
        "assistant",
        answer
    )

}

    return safeSend(
        msg.key.remoteJid,
        {
            text: answer
        }
    )

}

    if (text === ".اعطاء_EX") {

    const Player = require("./models/Player")

    const userId = "85126839013435@lid"

    const player = await Player.findOne({ userId })

    if (!player) {
        return safeSend(msg.key.remoteJid, {
            text: "❌ اللاعب غير موجود."
        })
    }

    const charactersToGive = [

        {
            name: "Imu",
            form: "الحاكم الخفي",
            anime: "One Piece",
            ability: "السيطرة المطلقة",
            image: "https://files.catbox.moe/q4z49x.jpg"
        },

        {
            name: "Roger",
            form: "ملك القراصنة",
            anime: "One Piece",
            ability: "الهاكي الأسطوري",
            image: "https://files.catbox.moe/djkqcx.jpg"
        },

        {
            name: "Loki",
            form: "أمير العمالقة",
            anime: "One Piece",
            ability: "قوة إلباف",
            image: "https://files.catbox.moe/dwqig7.jpg"
        },

        {
            name: "Diablo",
            form: "الشيطان الأسود",
            anime: "Tensura",
            ability: "السحر الشيطاني",
            image: "https://files.catbox.moe/p5e4bg.jpg"
        }

    ]

    let added = 0

    for (const data of charactersToGive) {

        if (
            player.characters.some(
                c =>
                    c.name === data.name &&
                    c.rarity === "SSS" &&
                    c.form === data.form
            )
        ) {
            continue
        }

        // اختيار 7 قدرات حسب نسب chance
        const randomAbilities = getRandomAbilities(7)

        player.characters.push({

            name: data.name,
            form: data.form,
            anime: data.anime,

            rarity: "SSS",

            power: 25000,

            ability: data.ability,

            image: data.image,

            evolutionLevel: 6,
            evolutionType: "fixed",

            level: 1,
            xp: 0,

            locked: false,

            obtainedAt: Date.now(),

            urAbilities: randomAbilities

        })

        added++

    }

    player.markModified("characters")

    await player.save()

    return safeSend(msg.key.remoteJid, {

        text:
`✅ تم إعطاء اللاعب ${added} شخصية EX.

👤 ${userId}

👑 Imu
👑 Roger
👑 Loki
👑 Diablo

⭐ القوة: 25000

💎 التطوير: +6

🎲 لكل شخصية 7 قدرات EX عشوائية حسب نسب الظهور.`

    })

}

    // =========================
// .بنر
// =========================

if (text === '.بنر') {

    const banner =
    await refreshBanner(sock)

    const player =
        await Player.findOne({
            userId
        })

    if (!banner.character) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
`❌ لا يوجد بنر حالياً`
            }
        )

    }

    const pity =
        player?.bannerPity || 0

    const pityLeft =
        pity === 0
        ? 30
        : 30 - pity

    const pulls =
        player?.pulls || 0

    const caption =
`🌌 ═════〔 LIMITED BANNER 〕═════ 🌌

👑 ${banner.character.name}

⚔️ القوة
${banner.character.power}

🌌 الأنمي
${banner.character.anime}

━━━━━━━━━━━━

🎯 عداد الضمان
${pity}/30

🎟️ السحبات المتبقية
${pulls}/5

🌍 السحبات العالمية
${banner.globalPulls}/500

━━━━━━━━━━━━

🎁 عند وصول المجتمع إلى 500 سحبة

💰 500,000 ذهب
🎟️ +5 سحبات
📦 SSS Chance Box ×1

━━━━━━━━━━━━

⏳ يتجدد يومياً

🕛 12:00 AM 🇸🇦

📌 المتبقي للضمان
${pityLeft} سحبة

━━━━━━━━━━━━

🎮 اكتب

.سحب_بنر

للسحب من البنر المحدود`

    // =========================
    // إذا لم توجد صورة
    // =========================

    if (!banner.character.image) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: caption
            }
        )

    }

    // =========================
    // صورة محلية
    // =========================

    if (
        !banner.character.image.startsWith('http')
    ) {

        const imagePath =
            path.join(
                __dirname,
                banner.character.image
            )

        if (!fs.existsSync(imagePath)) {

            return sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: caption
                }
            )

        }

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                image:
                    fs.readFileSync(imagePath),

                caption
            }
        )

    }

    // =========================
    // صورة رابط
    // =========================

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url:
                banner.character.image
            },

            caption
        }
    )

}

    
    if (text === '.سحب_بنر') {

    await refreshBanner(sock)

    const banner = await Banner.findOne()

    if (!banner || !banner.character) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد بنر حالياً'
            }
        )

    }

    let player = await Player.findOne({ userId })

    if (!player) {

        player = new Player({
            userId,
            pulls: 5,
            bannerPity: 0,
            lastReset: Math.floor(Date.now() / (60 * 60 * 1000)),
            characters: []
        })

    }
        if (
    player.characters.length >=
    (player.maxCharacters || 30)
) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`❌ المخزون ممتلئ

📦 السعة:
${player.maxCharacters || 30}`
        }
    )

}
        const cooldown = 60 * 60 * 1000

const currentPeriod =
Math.floor(Date.now() / cooldown)

if (player.lastReset !== currentPeriod) {

    player.pulls = 5
    player.lastReset = currentPeriod

}

if (player.pulls <= 0) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`❌ انتهت السحبات

⏳ تتجدد كل ساعة`
        }
    )

}
        player.bannerPity =
(player.bannerPity || 0) + 1

let guaranteed = false

if (player.bannerPity >= 30) {

    guaranteed = true
    player.bannerPity = 0

}
        const pityLeft =
guaranteed
? 30
: 30 - player.bannerPity
        let rarity = 'عادي'

let luckBonus = 0

if ((player.level || 1) >= 10)
    luckBonus = 3

if (guaranteed) {

    rarity = 'SSS'

} else {

    let chance = Math.random() * 100

    chance -= luckBonus

    if (chance <= 5) {

        rarity = 'SSS'

    } else if (chance <= 22) {

        rarity = 'اسطوري'

    } else if (chance <= 50) {

        rarity = 'ممتاز'

    }

}
        let randomCharacter

if (rarity !== 'SSS') {

    const pool =
    characters.filter(
        c => c.rarity === rarity
    )

    randomCharacter =
    pool[
        Math.floor(
            Math.random() *
            pool.length
        )
    ]

}
        else {

    if (guaranteed || Math.random() < 0.70) {

        randomCharacter =
        banner.character

    } else {

        const sss =
        characters.filter(
            c => c.rarity === 'SSS'
        )

        randomCharacter =
        sss[
            Math.floor(
                Math.random() *
                sss.length
            )
        ]

    }

}
        if (!randomCharacter) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: "❌ تعذر اختيار شخصية."
        }
    )

}
        
    if (player.dailyMissions) {

    player.dailyMissions.pulls += 1

    if (randomCharacter.rarity === 'اسطوري') {

        player.dailyMissions.gotLegendary += 1

    }

    if (randomCharacter.rarity === 'SSS') {

        player.dailyMissions.gotSSS = true

    }

    player.markModified('dailyMissions')

}
player.characters.push({

    ...randomCharacter,

    originalPower: randomCharacter.power,

    evolutionLevel: 0,

    urAbilities: []

})

player.pulls--
        player.bannerParticipated = true
        banner.globalPulls++

const reachedReward = banner.globalPulls >= 500
if (reachedReward) {

    banner.globalPulls = 0

    const players =
        await Player.find({

            bannerParticipated: true

        })

    for (const p of players) {

        p.money =
            (p.money || 0) + 500000

        p.pulls =
            (p.pulls || 0) + 5

        if (!p.boxes) {

            p.boxes = {}

        }

        p.boxes.sss_chance =
            (p.boxes.sss_chance || 0) + 1

        p.bannerParticipated = false

        await p.save()

    }

}

        await player.save()

await banner.save()
        
        const bannerText =
randomCharacter.name === banner.character.name
? "🌌 الشخصية المميزة لهذا اليوم"
: "✨ حصلت على SSS عشوائية خارج البنر!"

const caption =
`╭━━〔 🌌 LIMITED BANNER 🌌 〕━━╮

👑 ${randomCharacter.name}

${randomCharacter.rarity === "SSS"
? `${bannerText}

`
: ""}🌟 التصنيف ➤ ${randomCharacter.rarity}

⚔ القوة ➤ ${randomCharacter.power}

🌌 الأنمي ➤ ${randomCharacter.anime}

━━━━━━━━━━━━

🎟️ السحبات المتبقية ➤ ${player.pulls}/5

🎯 عداد الضمان ➤ ${player.bannerPity}/30

📌 المتبقي للضمان ➤ ${pityLeft} سحبة

${guaranteed ? "🎯 حصلت عليها من ضمان البنر!" : ""}

╰━━━━━━━━━━━━━━━━━━━━━━╯`

// ======================
// إذا لا توجد صورة
// ======================

if (!randomCharacter.image) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: caption
        }
    )

}

// ======================
// إذا الصورة رابط
// ======================

if (randomCharacter.image.startsWith("http")) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: randomCharacter.image
            },
            caption
        }
    )

}

// ======================
// إذا الصورة داخل المشروع
// ======================

const imagePath =
path.join(
    __dirname,
    randomCharacter.image
)

if (!fs.existsSync(imagePath)) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: caption
        }
    )

}

return sock.sendMessage(
    msg.key.remoteJid,
    {
        image: fs.readFileSync(imagePath),
        caption
    }
)
        } // <-- أغلق .سحب_بنر هنا
    // =========================
// Open Equipment Box
// =========================

if (text.startsWith('.open')) {

    const args = text.trim().split(/\s+/)

    if (!args[1]) {

        return safeSend(

            msg.key.remoteJid,

            {

                text:
`📦 الاستخدام

.open rare
.open epic
.open legendary
.open mythical`

            }

        )

    }

    const type = args[1].toLowerCase()

    const map = {

        rare: "rareEquipment",

        epic: "epicEquipment",

        legendary: "legendEquipment",

        mythical: "mythicalEquipment"

    }

    const boxId = map[type]

    if (!boxId) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: "❌ نوع الصندوق غير صحيح."

            }

        )

    }

    const player = await Player.findOne({

        userId

    })

    if (!player) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: "❌ لا يوجد حساب."

            }

        )

    }

    if (

        !player.boxes ||

        player.boxes[boxId] <= 0

    ) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: "📦 لا تملك هذا الصندوق."

            }

        )

    }

    if (

        player.inventory.length >=

        player.maxInventory

    ) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: "🎒 حقيبة المعدات ممتلئة."

            }

        )

    }

    const item =

        equipmentSystem.openEquipmentBox(

            boxId

        )

    if (!item) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: "❌ حدث خطأ أثناء فتح الصندوق."

            }

        )

    }

    item.uid =

        Date.now().toString(36) +

        Math.random()

        .toString(36)

        .slice(2, 8)

    player.inventory.push(item)

    player.boxes[boxId]--

    await player.save()

    let message =
`🎉 حصلت على معدة جديدة!

🛡 ${item.name}

⭐ ${item.rarity}

🎖 الجودة: ${item.quality}

⭐ النجوم: ${item.stars}

━━━━━━━━━━━━━━
📊 الإحصائيات
`

    for (const stat in item.stats) {

        message +=
`\n• ${stat}: +${item.stats[stat]}`

    }

    if (

        item.affixes &&

        item.affixes.length

    ) {

        message +=

`\n\n✨ الخصائص الإضافية`

        for (const affix of item.affixes) {

            message +=
`\n• ${affix.name}: +${affix.value}`

        }

    }

    return safeSend(

        msg.key.remoteJid,

        {

            text: message

        }

    )

}
// =========================
// Equipment Inventory
// =========================

if (text === '.inventory') {

    const player = await Player.findOne({

        userId

    })

    if (!player) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: '❌ لا يوجد حساب.'

            }

        )

    }

    if (

        !player.inventory ||

        player.inventory.length === 0

    ) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: '🎒 حقيبة المعدات فارغة.'

            }

        )

    }

    let message =

`🎒 حقيبة المعدات

━━━━━━━━━━━━━━

`

    player.inventory.forEach(

        (item, index) => {

            message +=

`${index + 1}. ${item.name}

${"⭐".repeat(item.stars || 1)}

🏷 ${item.rarity}

🎖 ${item.quality || "Normal"}

🆔 ${item.uid}

━━━━━━━━━━━━━━

`

        }

    )

    message +=

`\n💡 للتجهيز:

.equip رقم`

    return safeSend(

        msg.key.remoteJid,

        {

            text: message

        }

    )

}
    // =========================
// Equipped Items
// =========================

if (text === '.equipment') {

    const player = await Player.findOne({

        userId

    })

    if (!player) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: '❌ لا يوجد حساب.'

            }

        )

    }

    const weapon =
        player.equipment?.weapon

    const armor =
        player.equipment?.armor

    const accessory =
        player.equipment?.accessory

    let message =
`⚔️ المعدات المجهزة

━━━━━━━━━━━━━━

`

    // Weapon
    message += `⚔️ السلاح\n`

    if (weapon) {

        message +=
`${weapon.name}
${"⭐".repeat(weapon.stars || 1)}
🎖 ${weapon.quality || "Normal"}

`

    } else {

        message += `لا يوجد\n\n`

    }

    // Armor
    message += `🛡️ الدرع\n`

    if (armor) {

        message +=
`${armor.name}
${"⭐".repeat(armor.stars || 1)}
🎖 ${armor.quality || "Normal"}

`

    } else {

        message += `لا يوجد\n\n`

    }

    // Accessory
    message += `💍 الإكسسوار\n`

    if (accessory) {

        message +=
`${accessory.name}
${"⭐".repeat(accessory.stars || 1)}
🎖 ${accessory.quality || "Normal"}

`

    } else {

        message += `لا يوجد\n\n`

    }

    // Bonus
    const bonus =

        equipmentSystem.calculateEquipmentStats(

            player

        )

    message +=
`━━━━━━━━━━━━━━

📊 إجمالي الإحصائيات

⚔ Attack +${bonus.attack}

🛡 Defense +${bonus.defense}

❤️ HP +${bonus.hp}

🎯 Crit +${bonus.critRate}%

💥 Crit Damage +${bonus.critDamage}%

👹 Boss Damage +${bonus.bossDamage}%

👻 Dodge +${bonus.dodge}%

🎯 Accuracy +${bonus.accuracy}%

🩸 Lifesteal +${bonus.lifesteal}%

🛡 Shield +${bonus.shield}%

🪞 Reflect +${bonus.reflect}%`

    return safeSend(

        msg.key.remoteJid,

        {

            text: message

        }

    )

}
    // =========================
// Equip Item
// =========================

if (text.startsWith('.equip')) {

    const args = text.split(' ')

    if (!args[1]) {

        return safeSend(

            msg.key.remoteJid,

            {

                text:
`📌 الاستخدام

.equip رقم_القطعة

مثال:

.equip 1`

            }

        )

    }

    const player = await Player.findOne({

        userId

    })

    if (!player) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: "❌ لا يوجد حساب."

            }

        )

    }

    if (

        !player.inventory ||

        player.inventory.length === 0

    ) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: "🎒 حقيبة المعدات فارغة."

            }

        )

    }

    const index =

        Number(args[1]) - 1

    if (

        isNaN(index) ||

        index < 0 ||

        index >= player.inventory.length

    ) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: "❌ رقم القطعة غير صحيح."

            }

        )

    }

    const item =

        player.inventory[index]

    const result =

        equipmentSystem.equipItem(

            player,

            item.uid

        )

    if (!result.success) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: result.message

            }

        )

    }

    await player.save()

    return safeSend(

        msg.key.remoteJid,

        {

            text:
`✅ تم تجهيز

${item.name}

${"⭐".repeat(item.stars || 1)}

🎖 الجودة:
${item.quality || "Normal"}

📍 النوع:
${item.type}`

        }

    )

}
    // =========================
// Unequip Item
// =========================

if (text.startsWith('.unequip')) {

    const args = text.split(' ')

    if (!args[1]) {

        return safeSend(

            msg.key.remoteJid,

            {

                text:
`📌 الاستخدام

.unequip weapon
.unequip armor
.unequip accessory`

            }

        )

    }

    const slot =

        args[1].toLowerCase()

    if (

        !["weapon", "armor", "accessory"]

        .includes(slot)

    ) {

        return safeSend(

            msg.key.remoteJid,

            {

                text:
"❌ النوع غير صحيح."

            }

        )

    }

    const player = await Player.findOne({

        userId

    })

    if (!player) {

        return safeSend(

            msg.key.remoteJid,

            {

                text:
"❌ لا يوجد حساب."

            }

        )

    }

    const result =

        equipmentSystem.unequipItem(

            player,

            slot

        )

    if (!result.success) {

        return safeSend(

            msg.key.remoteJid,

            {

                text:

                result.message

            }

        )

    }

    await player.save()

    return safeSend(

        msg.key.remoteJid,

        {

            text:
`✅ تم خلع

${slot}

وإعادته إلى الحقيبة.`

        }

    )

}
    
    if (text === '.co-op') {

    const playerName = msg.pushName || "Player"

    const result =
        await coopManager.joinPlayer(
            userId,
            playerName
        )

    if (!result.success) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: `❌ ${result.message}`
            }
        )

    }

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`✅ تم الانضمام إلى الـ Co-Op

👤 ${result.player.name}

👥 عدد المشاركين:
${result.players}/${result.maxPlayers}

⏳ انتظر بدء القتال.`
        }
    )

}
    // =========================
// Co-Op Attack
// =========================

if (text === '.مقاتلة') {

    const result = await coopBattle.playerAttack(

        sock,

        userId

    )

    if (!result.success) {

        return safeSend(

            msg.key.remoteJid,

            {

                text:
                `❌ ${result.message}`

            }

        )

    }

    let reply =
`⚔️ لقد هاجمت البوس!

💥 Damage:
${result.damage.toLocaleString()}`

    if (result.critical) {

        reply +=

`\n\n💢 Critical Hit!`

    }

    return safeSend(

        msg.key.remoteJid,

        {

            text: reply

        }

    )

}
    // =========================
// Co-Op Status
// =========================

if (text === '.coop') {

    const coop = await CoOp.findOne()

    if (

        !coop ||

        !coop.active

    ) {

        return safeSend(

            msg.key.remoteJid,

            {

                text:
`❌ لا يوجد Co-Op نشط حالياً.`

            }

        )

    }

    const players =

        coop.players.length

    const maxPlayers = {

        A: 5,

        SS: 5,

        RAID: 8

    }[coop.boss.rank] || 5

    let current = "لا أحد"

    if (

        coop.status === "battle"

    ) {

        const alive =

            coop.players.filter(

                p => !p.finished

            )

        if (

            alive[coop.currentTurn]

        ) {

            current =

                alive[
                    coop.currentTurn
                ].name

        }

    }

    const time =

        coop.status === "waiting"

        ?

        Math.max(

            0,

            Math.floor(

                (coop.joinEnd -

                Date.now())

                / 1000

            )

        )

        :

        Math.max(

            0,

            Math.floor(

                (coop.turnEnd -

                Date.now())

                / 1000

            )

        )

    return safeSend(

        msg.key.remoteJid,

        {

text:

`🌍 CO-OP RAID

👹 ${coop.boss.name}

🎮 ${coop.boss.anime}

🏆 Rank: ${coop.boss.rank}

❤️ HP
${coop.boss.hp.toLocaleString()} / ${coop.boss.maxHp.toLocaleString()}

👥 Players
${players}/${maxPlayers}

⚔ Round
${coop.round}

👤 Current Turn
${current}

⏳ ${time}s

📌 Status:
${coop.status}`

        }

    )

}
    // =========================
// Co-Op Leaderboard
// =========================

if (text === '.leaderboard') {

    const coop = await CoOp.findOne()

    if (

        !coop ||

        !coop.active

    ) {

        return safeSend(

            msg.key.remoteJid,

            {

                text:
                "❌ لا يوجد Co-Op نشط حالياً."

            }

        )

    }

    if (

        !coop.leaderboard.length

    ) {

        return safeSend(

            msg.key.remoteJid,

            {

                text:
                "📊 لم يسجل أي لاعب ضرراً بعد."

            }

        )

    }

    const top =

        [...coop.leaderboard]

        .sort(

            (a, b) =>

            b.damage - a.damage

        )

        .slice(0, 10)

    let textMsg =
`🏆 ترتيب الضرر

👹 ${coop.boss.name}

━━━━━━━━━━━━━━

`

    top.forEach(

        (player, index) => {

            const icon =

                index === 0 ? "🥇" :

                index === 1 ? "🥈" :

                index === 2 ? "🥉" :

                `${index + 1}.`

            textMsg +=

`${icon} ${player.name}

💥 ${player.damage.toLocaleString()}

`

        }

    )

    textMsg +=

`━━━━━━━━━━━━━━

❤️ Boss HP

${coop.boss.hp.toLocaleString()} / ${coop.boss.maxHp.toLocaleString()}`

    return safeSend(

        msg.key.remoteJid,

        {

            text: textMsg

        }

    )

}

    if (text === '.spawncoop') {

    if (!isOwner(msg)) {

        return sock.sendMessage(

            msg.key.remoteJid,

            {

                text: '❌ هذا الأمر للمطور فقط'

            }

        )

    }

    const spawned = await coopManager.forceSpawn(

        sock

    )

    if (!spawned) {

        return sock.sendMessage(

            msg.key.remoteJid,

            {

                text: '❌ يوجد Co-Op نشط بالفعل.'

            }

        )

    }

    return sock.sendMessage(

        msg.key.remoteJid,

        {

            text:
`✅ تم إنشاء Co-Op بنجاح.

⏳ بدأ التسجيل الآن لمدة دقيقة.
📢 تم إرسال الإعلان إلى مجموعات الـ Co-Op.`

        }

    )

}
    
if (text === '.cooptime') {

    const coop = await CoOp.findOne()

    if (!coop) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: '❌ لا توجد بيانات Co-Op.'

            }

        )

    }

    if (coop.active) {

        const seconds =

            coop.status === "waiting"

            ?

            Math.max(

                0,

                Math.floor(

                    (coop.joinEnd -

                    Date.now()) / 1000

                )

            )

            :

            Math.max(

                0,

                Math.floor(

                    (coop.turnEnd -

                    Date.now()) / 1000

                )

            )

        return safeSend(

            msg.key.remoteJid,

            {

                text:

`🌍 يوجد Co-Op نشط الآن.

📌 الحالة:
${coop.status}

⏳ الوقت المتبقي:
${seconds} ثانية`

            }

        )

    }

    const minutes = Math.max(

        0,

        Math.floor(

            (coop.nextSpawn -

            Date.now()) / 60000

        )

    )

    return safeSend(

        msg.key.remoteJid,

        {

            text:

`⏰ الغارة القادمة بعد:

${minutes} دقيقة`

        }

    )

}
    if (text === ".اعطاء_هيوكي") {

    const Player = require("./models/Player")

    const userId = "193407225995463@lid"

    const player = await Player.findOne({ userId })

    if (!player) {
        return safeSend(msg.key.remoteJid, {
            text: "❌ اللاعب غير موجود."
        })
    }

    // منع التكرار
    if (player.characters.some(c => c.name === "Hiyuki")) {
        return safeSend(msg.key.remoteJid, {
            text: "❌ اللاعب يملك Hiyuki بالفعل."
        })
    }

    const character = {

    name: "Hiyuki",
    form: "قبضة الجليد الأزرق",
    anime: "Wuthering Waves",

    rarity: "SSS",

    evolutionLevel: 6,
    evolutionType: "fixed",

    power: 25000,

    ability: "تجميد الأهداف فوراً",

    image: "https://files.catbox.moe/67cnj7.jpg",

    level: 1,
    xp: 0,

    evolution: 6,

    locked: false,

    obtainedAt: Date.now(),

    urAbilities: [

        {
            name: "⚔️ سيد القتال",
            type: "attack",
            value: 15,
            description: "+15% هجوم",
            chance: 100
        },

        {
            name: "☄️ مدمر الأكوان",
            type: "bossDamage",
            value: 30,
            description: "+30% ضرر ضد الزعماء",
            chance: 100
        },

        {
            name: "💥 محطم الجبال",
            type: "attack",
            value: 25,
            description: "+25% هجوم",
            chance: 100
        },

        {
            name: "🌌 سيد الأكوان",
            type: "bossDamage",
            value: 50,
            description: "+50% ضرر ضد الزعماء",
            chance: 100
        },

        {
            name: "👹 قاتل الوحوش",
            type: "bossDamage",
            value: 20,
            description: "+20% ضرر ضد الزعماء",
            chance: 100
        },

        {
            name: "💀 ملك الدماء",
            type: "lifesteal",
            value: 10,
            description: "+10% امتصاص حياة",
            chance: 100
        },

        {
            name: "🎯 عين الصياد",
            type: "critRate",
            value: 10,
            description: "+10% ضربة حرجة",
            chance: 100
        }

    ]

}

    player.characters.push(character)

    player.markModified("characters")

    await player.save()

    return safeSend(msg.key.remoteJid, {
        text:
`✅ تم إعطاء Hiyuki EX للاعب.

👤 ${userId}

⭐ القوة: 25000

🏆 الرتبة: EX

🧊 القدرات:

⚔️ سيد القتال
☄️ مدمر الأكوان
💥 محطم الجبال
🌌 سيد الأكوان
👹 قاتل الوحوش
💀 ملك الدماء
🎯 عين الصياد`
    })

}
    

    if (text === ".اعطاء_فلوس") {

    const Player = require("./models/Player")

    const targetId = "193407225995463@lid"

    let player = await Player.findOne({
        userId: targetId
    })

    if (!player) {

        player = new Player({
            userId: targetId
        })

    }

    player.money += 100000000

    await player.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`✅ تم إعطاء اللاعب:

📌 ${targetId}

💰 100,000,000

💵 الرصيد الحالي:
${player.money.toLocaleString()}`
        }
    )
}

    if (text === ".انهاء_قلوب") {

    const room = heartQuiz.getRoom(msg.key.remoteJid)

    if (!room.active) {
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ لا توجد فعالية قلوب حالياً."
        })
        return
    }

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

    await sock.sendMessage(msg.key.remoteJid, {
        text: "🛑 تم إنهاء فعالية القلوب."
    })

    return
}
    
    if (text === ".تصفير_العشائر") {

    try {

        const Clan = require("./models/Clan")

        await Clan.updateMany(
            {},
            {
                $set: {
                    wins: 0,
                    losses: 0,
                    rankPoints: 1000,
                    dailyWars: 5,
                    warCooldown: 0
                }
            }
        )

        return safeSend(
    msg.key.remoteJid,
    {
        text: `✅ تم تصفير جميع بيانات العشائر.

🏆 الانتصارات: 0
❌ الخسائر: 0
🏅 التصنيف: 1000
⚔️ محاولات الحرب: 5`
    }
)

    }

    catch (err) {

        console.log(err)

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ حدث خطأ.

${err.message}`
            }
        )

    }

}

    if (text === ".الغاء_الحروب") {

    try {

        const Clan = require("./models/Clan")
        const ClanWar = require("./models/ClanWar")

        const myClan = await Clan.findOne({
            leader: userId
        })

        if (!myClan) {

            return safeSend(msg.key.remoteJid, {
                text: "❌ فقط قائد العشيرة يستطيع استخدام هذا الأمر."
            })

        }

        const result = await ClanWar.deleteMany({

            $or: [

                {
                    attackerClan: myClan.clanId
                },

                {
                    defenderClan: myClan.clanId
                }

            ]

        })

        myClan.dailyWars = 5

        await myClan.save()

        return safeSend(msg.key.remoteJid, {

            text:
`🗑️ تم إلغاء جميع الحروب والطلبات الخاصة بعشيرتك.

📄 عدد السجلات المحذوفة:

${result.deletedCount}

🔄 تمت إعادة محاولات الحرب إلى 5.`

        })

    }

    catch (err) {

        console.log(err)

        return safeSend(msg.key.remoteJid, {

            text:
`❌ حدث خطأ.

${err.message}`

        })

    }

}

if (text.startsWith('.حرب_عشيرة')) {

    try {

        const Clan = require('./models/Clan')
        const ClanWar = require('./models/ClanWar')
        const { generateId } = require('./utils/id')

        const sender = userId

        const mentioned =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mentioned) {

            return safeSend(msg.key.remoteJid, {
                text:
`❌ يجب منشن قائد العشيرة الأخرى.

مثال:

.حرب_عشيرة @القائد`
            })

        }

        const myClan =
            await Clan.findOne({
                leader: sender
            })

        if (!myClan) {

            return safeSend(msg.key.remoteJid, {
                text:
`❌ فقط قائد العشيرة يستطيع بدء الحرب.`
            })

        }

        const enemyClan =
            await Clan.findOne({
                leader: mentioned
            })

        if (!enemyClan) {

            return safeSend(msg.key.remoteJid, {
                text:
`❌ الشخص الممنشن ليس قائد أي عشيرة.`
            })

        }

        if (
            myClan.clanId ===
            enemyClan.clanId
        ) {

            return safeSend(msg.key.remoteJid, {
                text:
`❌ لا يمكنك تحدي عشيرتك.`
            })

        }

        const today =
            new Date().toLocaleDateString(
                'en-CA',
                {
                    timeZone: 'Asia/Riyadh'
                }
            )

        if (
            myClan.lastWarReset !== today
        ) {

            myClan.dailyWars = 5
            myClan.lastWarReset = today

            await myClan.save()

        }

        if (
            myClan.dailyWars <= 0
        ) {

            return safeSend(msg.key.remoteJid, {
                text:
`❌ انتهت محاولات الحروب اليومية.

تتجدد الساعة 12:00 صباحاً بتوقيت السعودية.`
            })

        }

        const pending =
            await ClanWar.findOne({

                status: {

    $in: [

        "pending",

        "accepted"

    ]

},
                $or: [

                    {
                        attackerClan:
                            myClan.clanId
                    },

                    {
                        defenderClan:
                            myClan.clanId
                    }

                ]

            })

        if (pending) {

            return safeSend(msg.key.remoteJid, {
                text:
`❌ لديك طلب حرب معلق بالفعل.`
            })

        }

        const war =
            await ClanWar.create({
                

                warId:
                    generateId(),

                attackerClan:
                    myClan.clanId,

                defenderClan:
                    enemyClan.clanId,

                attackerLeader:
                    sender,

                defenderLeader:
                    mentioned,

                status:
                    "pending",

                mode:
                    "member"

            })
        myClan.dailyWars--

await myClan.save()
        setTimeout(async () => {

    const pending =
        await ClanWar.findOne({

            warId: war.warId

        })

    if (

        pending &&

        pending.status === "pending"

    ) {

        pending.status = "expired"

        await pending.save()

    }

}, 60000)

        return safeSend(msg.key.remoteJid, {
            text:
`━━━━━━━━━━━━━━

⚔️ طلب حرب عشائر

🏯 ${myClan.emoji} ${myClan.name}

تتحدى

🏯 ${enemyClan.emoji} ${enemyClan.name}

👑 قائد العشيرة الأخرى:

@${mentioned.split('@')[0]}

━━━━━━━━━━━━━━

للقبول:

.قبول_الحرب

للرفض:

.رفض_الحرب

⏳ ينتهي الطلب خلال دقيقة.

━━━━━━━━━━━━━━`,
            mentions: [mentioned]
        })

    }

    catch (err) {

        console.log(err)

        return safeSend(msg.key.remoteJid, {
            text:
`❌ حدث خطأ أثناء إنشاء طلب الحرب.

${err.message}`
        })

    }

}

   if (text === ".قبول_الحرب") {

    try {

        const Clan = require("./models/Clan")
        const ClanWar = require("./models/ClanWar")

        function shuffle(array) {

            const arr = [...array]

            for (let i = arr.length - 1; i > 0; i--) {

                const j = Math.floor(Math.random() * (i + 1))

                ;[arr[i], arr[j]] =
                [arr[j], arr[i]]

            }

            return arr

        }

        const myClan = await Clan.findOne({
            leader: userId
        })

        if (!myClan) {

            return safeSend(msg.key.remoteJid, {
                text: "❌ فقط قائد العشيرة يستطيع قبول الحرب."
            })

        }

        const war = await ClanWar.findOne({

            defenderClan: myClan.clanId,

            status: "pending"

        })

        if (!war) {

    return safeSend(msg.key.remoteJid, {
        text: "❌ لا يوجد طلب حرب معلق."
    })

}

if (war.status !== "pending") {

    return safeSend(msg.key.remoteJid, {

        text: "❌ هذه الحرب لم تعد معلقة."

    })

}

war.status = "accepted"

        war.status = "accepted"

        const attackerClan = await Clan.findOne({
            clanId: war.attackerClan
        })

        const defenderClan = await Clan.findOne({
            clanId: war.defenderClan
        })

        const attackerMembers =
    shuffle([...attackerClan.members])

const defenderMembers =
    shuffle([...defenderClan.members])

if (

    attackerMembers.length === 0 ||

    defenderMembers.length === 0

) {

    return safeSend(msg.key.remoteJid, {

        text: "❌ إحدى العشيرتين لا تحتوي على أعضاء."

    })

}

war.chatId = msg.key.remoteJid

        war.currentRound = 1

        war.rounds = []

        const totalRounds = Math.min(
            attackerMembers.length,
            defenderMembers.length
        )

        for (let i = 0; i < totalRounds; i++) {

            war.rounds.push({

                round: i + 1,

                attacker: attackerMembers[i],

                defender: defenderMembers[i],

                winner: null,

                finished: false

            })

        }

        await war.save()

        let draw =
`🎲 نتائج القرعة

━━━━━━━━━━━━━━

`

        war.rounds.forEach(r => {

            draw +=
`${r.round}️⃣

@${r.attacker.split("@")[0]}

🆚

@${r.defender.split("@")[0]}

━━━━━━━━━━━━━━

`

        })

        draw +=
`⏳ تبدأ الجولة الأولى خلال لحظات.`

        await safeSend(

            msg.key.remoteJid,

            {

                text: draw,

                mentions: [

                    ...attackerMembers,

                    ...defenderMembers

                ]

            }

        )

        await startClanWar(war.warId)

    }

    catch (err) {

        console.log(err)

        return safeSend(

            msg.key.remoteJid,

            {

                text:
`❌ حدث خطأ أثناء قبول الحرب.

${err.message}`

            }

        )

    }

}     
    if (text === ".رفض_الحرب") {

    try {

        const Clan = require("./models/Clan")
        const ClanWar = require("./models/ClanWar")

        const myClan = await Clan.findOne({
            leader: userId
        })

        if (!myClan) {

            return safeSend(msg.key.remoteJid, {
                text: "❌ فقط قائد العشيرة يستطيع رفض الحرب."
            })

        }

        const war = await ClanWar.findOne({

            defenderClan: myClan.clanId,

            status: "pending"

        })

        if (!war) {

            return safeSend(msg.key.remoteJid, {

                text: "❌ لا يوجد طلب حرب معلق."

            })

        }

        // إعادة محاولة الحرب للعشيرة المهاجمة
        const attackerClan = await Clan.findOne({
            clanId: war.attackerClan
        })

        if (attackerClan) {

            attackerClan.dailyWars =
                (attackerClan.dailyWars || 0) + 1

            await attackerClan.save()

        }

        war.status = "rejected"

        await war.save()

        return safeSend(

            msg.key.remoteJid,

            {

text:
`━━━━━━━━━━━━━━

❌ تم رفض طلب الحرب.

🏯 ${myClan.emoji} ${myClan.name}

رفضت التحدي.

━━━━━━━━━━━━━━

🔄 تمت إعادة محاولة الحرب
للعشيرة المهاجمة.

━━━━━━━━━━━━━━`

            }

        )

    }

    catch (err) {

        console.log(err)

        return safeSend(

            msg.key.remoteJid,

            {

text:
`❌ حدث خطأ أثناء رفض الحرب.

${err.message}`

            }

        )

    }

}
    if (text.startsWith('.قدره')) {

    const args = text.split(' ')
    const index = parseInt(args[1])

    if (isNaN(index))
        return safeSend(msg.key.remoteJid, {
            text:
`❌ الاستخدام الصحيح

.قدرات 1`
        })

    const player = await Player.findOne({ userId })

    if (!player || !player.characters || player.characters.length === 0)
        return safeSend(msg.key.remoteJid, {
            text: '❌ لا تملك شخصيات.'
        })

    if (index < 1 || index > player.characters.length)
    return safeSend(msg.key.remoteJid, {
        text: '❌ رقم الشخصية غير صحيح.'
    })

const owned =
    player.characters[index - 1]

if (
    owned.evolutionLevel < 1 ||
    !owned.urAbilities ||
    owned.urAbilities.length === 0
)
    return safeSend(msg.key.remoteJid, {
        text: '❌ هذه الشخصية لا تملك قدرات EX.'
    })

const latest =
    characters.find(
        c =>
            c.name === owned.name &&
            c.rarity === owned.rarity &&
            c.form === owned.form
    )

const character = latest
? {
    ...owned,
    image: latest.image,
    anime: latest.anime,
    ability: latest.ability,
    rarity: latest.rarity,
    form: latest.form
}
: owned

    let abilitiesText = ''

    character.urAbilities.forEach((ability, i) => {

        abilitiesText +=
`━━━━━━━━━━━━━━━━

${["①","②","③","④","⑤","⑥"][i] || `${i+1}.`} ${ability.name}

📝 ${ability.description}

`

    })

    const stars =
        "★".repeat(character.evolutionLevel) +
        "☆".repeat(6 - character.evolutionLevel)

    const caption =
`╔═══════〔 قدرات EX 〕═══════╗

🧿 الشخصية
${character.name}

⭐ التطوير
${stars} (${character.evolutionLevel}/6)

${abilitiesText}╚════════════════════╝`

    if (
        character.image &&
        (
            character.image.startsWith("http://") ||
            character.image.startsWith("https://")
        )
    ) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                image: {
                    url: character.image
                },
                caption
            }
        )

    }

    const imagePath =
        path.join(__dirname, character.image)

    if (fs.existsSync(imagePath)) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                image: fs.readFileSync(imagePath),
                caption
            }
        )

    }

    return safeSend(msg.key.remoteJid, {
        text: caption
    })
}

if (text === '.متجر_العشيرة') {

    const player = await Player.findOne({ userId })

if (!player || !player.clanId) {

    return safeSend(
        msg.key.remoteJid,
        {
            text: '❌ أنت لست داخل أي عشيرة.'
        }
    )

}

const now = Date.now()

if (
    player.clanStorageExpire &&
    player.clanStorageExpire <= now
) {

    player.clanStorageExpire = 0

    await player.save()

}

    if (!player || !player.clanId) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ أنت لست داخل أي عشيرة.'
            }
        )

    }

    const clan = await Clan.findOne({
        clanId: player.clanId
    })

    if (!clan) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لم يتم العثور على العشيرة.'
            }
        )

    }

    const shop = getClanShop(clan.level)

    let txt =
`🏪 متجر العشيرة

🪙 عملاتك: ${player.clanCoins || 0}

━━━━━━━━━━━━━━

`

    shop.forEach((item, index) => {

        if (item.locked) {

            txt +=
`${index + 1}- ${item.name} 🔒
🔓 يفتح عند المستوى ${item.unlockLevel}

`

        } else {

            txt +=
`${index + 1}- ${item.name}

💰 السعر: ${item.price} 🪙
📦 الحد الأسبوعي: ${item.limit}

`

        }

    })

    txt +=
`━━━━━━━━━━━━━━

للشراء:
.شراء_عشيرة رقم`

    return safeSend(
        msg.key.remoteJid,
        {
            text: txt
        }
    )

}
    if (text.startsWith('.شراء_عشيرة')) {

    const args = text.split(' ')
    const index = Number(args[1]) - 1

    if (isNaN(index)) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ مثال:\n.شراء_عشيرة 1'
            }
        )

    }

    const player =
        await Player.findOne({ userId })

    if (!player || !player.clanId) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ أنت لست داخل عشيرة.'
            }
        )

    }

    const clan =
        await Clan.findOne({
            clanId: player.clanId
        })

    if (!clan) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ لم يتم العثور على العشيرة.'
            }
        )

    }

    const shop =
        getClanShop(clan.level)

    const item =
        shop[index]

    if (!item) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ العنصر غير موجود.'
            }
        )

    }

    if (item.locked) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ هذا العنصر يفتح عند مستوى ${item.unlockLevel}.`
            }
        )

    }

    const week =
        new Date().toISOString().slice(0,10)

    if (!player.clanShop)
        player.clanShop = {}

    if (!player.clanShop[week])
        player.clanShop[week] = {}

    const bought =
        player.clanShop[week][item.id] || 0

    if (bought >= item.limit) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ وصلت للحد الأسبوعي.'
            }
        )

    }

    if (
        player.clanCoins <
        item.price
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ لا تملك عملات عشيرة كافية.'
            }
        )

    }

    player.clanCoins -= item.price

    player.clanShop[week][item.id] =
        bought + 1
        switch (item.id) {

case "pull_ticket":

player.pulls += 1

break

case "legendary_box":

player.boxes.legendary += 1

break

case "sss_chance":

player.boxes.sss_chance += 1

break

case "sss_high":

player.boxes.sss_high += 1

break

case "storage": {

const now = Date.now()

if (
    player.clanStorageExpire > now
) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'❌ لديك زيادة سعة فعالة بالفعل.\nيمكنك شراء زيادة جديدة بعد انتهاء 14 يوم.'
        }
    )

}

player.clanStorageBonus += 5

player.maxCharacters += 5

player.clanStorageExpire =
now + (14 * 24 * 60 * 60 * 1000)

break

}

case "sss_shard":

if (!player.shards)
player.shards = {}

break

case "summon_boss":

clan.bossAvailable = true

break

case "rename":

if (userId !== clan.leader){

return safeSend(
msg.key.remoteJid,
{
text:
'❌ القائد فقط يستطيع شراء تغيير الاسم.'
}
)

}

player.renameClanTicket =
(player.renameClanTicket||0)+1

break

}
        await player.save()
await clan.save()

return safeSend(
msg.key.remoteJid,
{
text:
`✅ اشتريت:

${item.name}

💰-${item.price} 🪙`
}
)

}
    
    if (text.startsWith('.انشاء_عشيرة')) {

    const args = text.replace('.انشاء_عشيرة', '').trim()

    if (!args) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ الاستخدام:\n.انشاء_عشيرة 👑 القراصنة'
            }
        )

    }

    const player =
        await Player.findOne({ userId })

    if (!player) return

    if (player.clanId) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ أنت داخل عشيرة بالفعل.'
            }
        )

    }

    if (player.money < 1500000) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ تحتاج 1,500,000 لإنشاء عشيرة.'
            }
        )

    }

    const split =
        args.split(' ')

    let emoji = '🏴'

    if (/\p{Extended_Pictographic}/u.test(split[0])) {

        emoji = split.shift()

    }

    const clanName =
        split.join(' ').trim()

    if (!clanName) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ اكتب اسم العشيرة.'
            }
        )

    }

    const exists =
        await Clan.findOne({
            name: clanName
        })

    if (exists) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ يوجد عشيرة بهذا الاسم.'
            }
        )

    }

    const total =
        await Clan.countDocuments()

    const clanId =
        `CL${String(total + 1).padStart(3,'0')}`

    await Clan.create({

        clanId,

        name: clanName,

        emoji,

        leader: userId,

        members: [userId]

    })
        await updateClanPower(clanId)

    player.money -= 1500000

    player.clanId = clanId

    await player.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`🎉 تم إنشاء العشيرة بنجاح

${emoji} ${clanName}

🆔 ${clanId}

👑 القائد:
@${userId.split('@')[0]}

💰 تم خصم 1,500,000`,
            mentions: [userId]
        }
    )

}
    if (text === '.عشيرتي') {

    const player =
        await Player.findOne({ userId })

    if (!player || !player.clanId) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ أنت لست داخل أي عشيرة.'
            }
        )

    }

    const clan =
        await Clan.findOne({
            clanId: player.clanId
        })

    if (!clan) {

        player.clanId = null
        await player.save()

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لم يتم العثور على العشيرة.'
            }
        )

    }

    let totalPower = 0

    for (const memberId of clan.members) {

        const member =
            await Player.findOne({
                userId: memberId
            })

        if (!member) continue

        if (!member.characters) continue

        for (const ch of member.characters) {

            totalPower += Number(ch.power || 0)

        }

    }

    const mentions = []

    let membersText = ''

    for (const memberId of clan.members) {

        mentions.push(memberId)

        let icon = '👤'

        if (memberId === clan.leader)
            icon = '👑'

        membersText +=
`${icon} @${memberId.split('@')[0]}\n`

    }

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`${clan.emoji} ${clan.name}

🆔 ${clan.clanId}

⭐ المستوى: ${clan.level}
✨ الخبرة: ${clan.xp}/${clan.nextLevelXp}
🪙 عملات العشيرة: ${Number(clan.coins || 0).toLocaleString()}

👑 القائد:
@${clan.leader.split('@')[0]}

👥 الأعضاء: ${clan.members.length}/4

⚔️ قوة العشيرة: ${Number(totalPower || 0).toLocaleString()}

🏆 الانتصارات: ${clan.wins}
💀 الهزائم: ${clan.losses}

━━━━━━━━━━━━

👥 الأعضاء

${membersText}`,
            mentions
        }
    )

}

    if (
    text.startsWith('.دعوة')
) {

    const mentioned =
        msg.message
        ?.extendedTextMessage
        ?.contextInfo
        ?.mentionedJid?.[0]

    if (!mentioned) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ قم بمنشن اللاعب.'
            }
        )

    }

    const player =
        await Player.findOne({ userId })

    if (
        !player ||
        !player.clanId
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ أنت لست داخل عشيرة.'
            }
        )

    }

    const clan =
        await Clan.findOne({
            clanId: player.clanId
        })

    if (!clan)
        return

    if (
        clan.leader !== userId
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ فقط قائد العشيرة يستطيع الدعوة.'
            }
        )

    }

    if (
        clan.members.length >= 4
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ العشيرة ممتلئة.'
            }
        )

    }

    const target =
        await Player.findOne({
            userId: mentioned
        })

    if (!target) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ اللاعب غير موجود.'
            }
        )

    }

    if (target.clanId) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ اللاعب داخل عشيرة.'
            }
        )

    }

    if (
        clan.invites.includes(
            mentioned
        )
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ تمت دعوته مسبقاً.'
            }
        )

    }

    clan.invites.push(
        mentioned
    )

    await clan.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`📨 تمت دعوة

@${mentioned.split('@')[0]}

للانضمام إلى

${clan.emoji} ${clan.name}

اكتب:
.قبول
أو
.رفض`,
            mentions: [mentioned]
        }
    )

}
    if (text === '.قبول') {

    const player =
        await Player.findOne({ userId })

    if (!player) return

    if (player.clanId) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ أنت داخل عشيرة بالفعل.'
            }
        )

    }

    // فحص مدة الانتظار
    if (
        player.clanCooldown &&
        player.clanCooldown > Date.now()
    ) {

        const remaining =
            player.clanCooldown - Date.now()

        const hours =
            Math.floor(
                remaining / (1000 * 60 * 60)
            )

        const minutes =
            Math.floor(
                (remaining % (1000 * 60 * 60)) /
                (1000 * 60)
            )

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`⏳ لا يمكنك الانضمام إلى عشيرة الآن.

الوقت المتبقي:
🕒 ${hours} ساعة ${minutes} دقيقة`
            }
        )

    }

    const clan =
        await Clan.findOne({
            invites: userId
        })

    if (!clan) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لا توجد لديك أي دعوة.'
            }
        )

    }

    if (clan.members.length >= 4) {

        clan.invites =
            clan.invites.filter(
                id => id !== userId
            )

        await clan.save()

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ العشيرة أصبحت ممتلئة.'
            }
        )

    }

    clan.members.push(userId)

clan.invites =
    clan.invites.filter(
        id => id !== userId
    )

await clan.save()

await updateClanPower(clan.clanId)

player.clanId = clan.clanId

await player.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`✅ انضممت إلى

${clan.emoji} ${clan.name}

مرحباً بك!

👤 @${userId.split('@')[0]}`,
            mentions: [userId]
        }
    )

}
if (text === '.رفض') {

    const player =
        await Player.findOne({ userId })

    if (!player) return

    if (player.clanId) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ أنت داخل عشيرة بالفعل.'
            }
        )

    }

    const clan =
        await Clan.findOne({
            invites: userId
        })

    if (!clan) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لا توجد لديك أي دعوة.'
            }
        )

    }

    clan.invites =
        clan.invites.filter(
            id => id !== userId
        )

    await clan.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`❌ تم رفض دعوة الانضمام إلى

${clan.emoji} ${clan.name}`
        }
    )

}
    if (text.startsWith('.طرد')) {

    const player = await Player.findOne({ userId })

    if (!player || !player.clanId) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ أنت لست داخل أي عشيرة.'
            }
        )

    }

    const clan = await Clan.findOne({
        clanId: player.clanId
    })

    if (!clan) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ العشيرة غير موجودة.'
            }
        )

    }

    if (clan.leader !== userId) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ فقط قائد العشيرة يستطيع طرد الأعضاء.'
            }
        )

    }

    const mentioned =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid

    if (!mentioned || mentioned.length === 0) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ قم بمنشن العضو الذي تريد طرده.'
            }
        )

    }

    const targetId = mentioned[0]

    if (targetId === clan.leader) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لا يمكنك طرد نفسك.'
            }
        )

    }

    if (!clan.members.includes(targetId)) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ هذا اللاعب ليس داخل عشيرتك.'
            }
        )

    }

    const targetPlayer =
        await Player.findOne({
            userId: targetId
        })

    clan.members =
        clan.members.filter(
            id => id !== targetId
        )

    await clan.save()

    // تحديث قوة العشيرة
    await updateClanPower(clan.clanId)

    if (targetPlayer) {

        targetPlayer.clanId = null

        targetPlayer.clanCooldown =
            Date.now() + (24 * 60 * 60 * 1000)

        // إزالة كل مزايا العشيرة
        targetPlayer.maxCharacters -=
            (targetPlayer.clanStorageBonus || 0)

        if (targetPlayer.maxCharacters < 30)
            targetPlayer.maxCharacters = 30

        targetPlayer.clanStorageBonus = 0
        targetPlayer.clanStorageExpire = 0
        targetPlayer.clanCoins = 0
        targetPlayer.clanShop = {}
        targetPlayer.renameClanTicket = 0

        await targetPlayer.save()

    }

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`✅ تم طرد

@${targetId.split('@')[0]}

من العشيرة.`,
            mentions: [targetId]
        }
    )

}

    
if (text === '.خروج') {

    const player =
        await Player.findOne({ userId })

    if (!player || !player.clanId) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ أنت لست داخل أي عشيرة.'
            }
        )

    }

    player.pendingClanLeave = Date.now()

    await player.save()

    setTimeout(async () => {

        const p =
            await Player.findOne({ userId })

        if (
            p &&
            p.pendingClanLeave
        ) {

            p.pendingClanLeave = null

            await p.save()

        }

    }, 60000)

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`⚠️ هل أنت متأكد من مغادرة العشيرة؟

• سيتم خروجك فوراً.
• لن تتمكن من الانضمام إلى أي عشيرة لمدة *24 ساعة*.
• ستفقد جميع زيادات مخزون العشيرة.
• سيتم إلغاء الطلب تلقائياً بعد دقيقة.

اكتب:
*.تأكيد_الخروج*`
        }
    )

}
    if (text === '.تأكيد_الخروج') {

    const player =
    await Player.findOne({ userId })

if (
    !player ||
    !player.pendingClanLeave
) {

    return safeSend(
        msg.key.remoteJid,
        {
            text: '❌ لا يوجد طلب خروج.'
        }
    )

}

if (
    Date.now() - player.pendingClanLeave > 60000
) {

    player.pendingClanLeave = null

    await player.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text: '❌ انتهت صلاحية طلب الخروج.'
        }
    )

}

if (!player.clanId) {

    player.pendingClanLeave = null

    await player.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text: '❌ أنت لست داخل أي عشيرة.'
        }
    )

}

const clan =
    await Clan.findOne({
        clanId: player.clanId
    })

if (!clan) {

    player.clanId = null
    player.pendingClanLeave = null

    await player.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text: '❌ العشيرة غير موجودة.'
        }
    )

}

// إزالة جميع زيادات المخزون الخاصة بالعشيرة

if (player.clanStorageBonus > 0) {

    player.maxCharacters -=
        player.clanStorageBonus

    if (player.maxCharacters < 30)
        player.maxCharacters = 30

}

// تصفير جميع بيانات العشيرة

player.clanStorageBonus = 0
player.clanStorageExpire = 0

player.clanCoins = 0
player.clanShop = {}

player.renameClanTicket = 0

// الخروج

player.clanId = null

player.pendingClanLeave = null

player.clanCooldown =
    Date.now() +
    (24 * 60 * 60 * 1000)

await player.save()

clan.members =
    clan.members.filter(
        id => id !== userId
    )

// إذا أصبحت العشيرة فارغة نحذفها
if (clan.members.length === 0) {

    const ClanWar = require("./models/ClanWar")

    await Clan.deleteOne({
        clanId: clan.clanId
    })

    await ClanWar.deleteMany({

        $or: [

            { attackerClan: clan.clanId },

            { defenderClan: clan.clanId }

        ]

    })

}

else {

    // إذا خرج القائد ننقل القيادة لأول عضو
    if (clan.leader === userId) {

        clan.leader = clan.members[0]

    }

    await clan.save()

    // تحديث قوة العشيرة
    await updateClanPower(clan.clanId)

}

return safeSend(
    msg.key.remoteJid,
    {
        text:
clan.members.length === 0 ?

`✅ غادرت العشيرة.

🗑️ لم يتبق أي عضو داخلها.

تم حذف العشيرة تلقائياً.`

:

`✅ غادرت العشيرة بنجاح.

❌ تمت إزالة جميع مزايا العشيرة.

⏳ يمكنك الانضمام إلى عشيرة أخرى بعد 24 ساعة.`
    }
)
    }
        if (text === '.العشائر') {

    const clans = await Clan.find()
        .sort({ level: -1, power: -1 })

    if (!clans.length) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لا توجد أي عشائر.'
            }
        )

    }

    let txt =
`🏰 قائمة العشائر

━━━━━━━━━━━━━━

`

    const mentions = []

    for (let i = 0; i < clans.length; i++) {

        const clan = clans[i]

        let totalPower = 0

        for (const memberId of clan.members) {

            const member =
                await Player.findOne({
                    userId: memberId
                })

            if (!member) continue

            for (const ch of member.characters || []) {

                totalPower +=
                    Number(ch.power || 0)

            }

        }

        mentions.push(clan.leader)

        txt +=
`${i + 1}- ${clan.emoji} ${clan.name}

👑 القائد:
@${clan.leader.split('@')[0]}

⭐ المستوى: ${clan.level}

👥 الأعضاء:
${clan.members.length}/4

⚔️ القوة:
${totalPower.toLocaleString()}

━━━━━━━━━━━━━━

`

    }

    return safeSend(
        msg.key.remoteJid,
        {
            text: txt,
            mentions
        }
    )

}
    
if (text === '.اوامر') {

    let menu =
`📚 *قائمة أوامر البوت*

━━━━━━━━━━━━━━

`

    for (const category in commands) {

        // إخفاء أوامر المطور
        if (
            category === 'المطور' &&
            !isOwner(msg)
        ) continue

        menu += `📂 ${category}\n`
        menu += `اكتب:\n`
        menu += `.اوامر ${category}\n\n`
    }

    menu += `━━━━━━━━━━━━━━
💡 مثال:
.اوامر الشخصيات`

    return safeSend(
        msg.key.remoteJid,
        {
            text: menu
        }
    )
}
    if (text.startsWith('.اوامر ')) {

    const category =
        text
            .replace('.اوامر ', '')
            .trim()

    if (!commands[category]) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ هذا القسم غير موجود.'
            }
        )
    }

    if (
        category === 'المطور' &&
        !isOwner(msg)
    ) {
        return
    }

    let menu =
`📂 *${category}*

━━━━━━━━━━━━━━

`

    commands[category].forEach(cmd => {

        menu += `• ${cmd}\n`

    })

    menu += `\n━━━━━━━━━━━━━━`

    return safeSend(
        msg.key.remoteJid,
        {
            text: menu
        }
    )
}
    
    
if (text.startsWith('.مزايدة ')) {

if (!currentAuction.active) {

return safeSend(
msg.key.remoteJid,
{
text:
'❌ لا يوجد مزاد نشط حالياً'
}
)

}

const amount =
parseInt(
text.split(' ')[1]
)

if (
isNaN(amount)
)
return

const player =
await Player.findOne({
userId
})

if (!player) {

return safeSend(
msg.key.remoteJid,
{
text:
'❌ لا يوجد حساب'
}
)

}

if (
amount > player.money
) {

return safeSend(
msg.key.remoteJid,
{
text:

`❌ لا تملك هذا المبلغ

💰 رصيدك:
${player.money.toLocaleString()}`
}
)

}

const minBid =
currentAuction.highestBid +
150000

if (
amount < minBid
) {

return safeSend(
msg.key.remoteJid,
{
text:

`❌ أقل مزايدة هي

💰 ${minBid.toLocaleString()}`
}
)

}

currentAuction.highestBid =
amount

currentAuction.highestBidder =
userId

const mention =
'@' +
userId.split('@')[0]

for (
const group of
currentAuction.auctionGroups ||
[
'120363020823525909@g.us',
'120363409897316453@g.us'
]
) {

await sock.sendMessage(
group,
{
text:

`🏆 أعلى مزايد حالياً

${mention}

💰 ${amount.toLocaleString()}

🎁 ${currentAuction.character.name}`,
mentions: [
userId
]
}
)

}

return

}

    
if (text === '.مهامي') {

const player = await Player.findOne({ userId })

if (!player) {
    return safeSend(
        msg.key.remoteJid,
        {
            text: '❌ لا يوجد حساب'
        }
    )
}
await resetDailyMissions(player)
const m = player.dailyMissions || {}

const loginDone =
m.login ? '✅' : '❌'

const winsDone =
m.wins >= 5 ? '✅' : '❌'

const bossDone =
m.bossKills >= 2 ? '✅' : '❌'

const pullsDone =
m.pulls >= 10 ? '✅' : '❌'

const sssDone =
m.gotSSS ? '✅' : '❌'

const legendaryDone =
m.gotLegendary >= 3 ? '✅' : '❌'

const completed =
[
m.login,
m.wins >= 5,
m.bossKills >= 2,
m.pulls >= 10,
m.gotSSS,
m.gotLegendary >= 3
].filter(Boolean).length

const allDone =
completed === 6

return safeSend(
msg.key.remoteJid,
{
text:

`📜 المهام اليومية

${loginDone} تسجيل الدخول اليومي

${winsDone} الفوز في 5 قتالات
📊 ${m.wins || 0}/5

${bossDone} المشاركة ضد الزعيم مرتين
📊 ${m.bossKills || 0}/2

${pullsDone} تنفيذ 10 سحبات
📊 ${m.pulls || 0}/10

${sssDone} الحصول على شخصية SSS

${legendaryDone} الحصول على 3 شخصيات أسطورية
📊 ${m.gotLegendary || 0}/3

━━━━━━━━━━━━━━

🎯 التقدم:
${completed}/6

🎁 الجائزة الكاملة:

💰 2,500,000 مال
📚 5000 XP
📦 Legendary Box ×1
📦 SSS Chance Box ×1

${
allDone
? '✅ جميع المهام مكتملة\nاستخدم: .استلام_المهام'
: '⏳ أكمل جميع المهام أولاً'
}`
}
)

}

    if (text === '.يومي') {

const player = await Player.findOne({ userId })

if (!player) {

    return safeSend(
        msg.key.remoteJid,
        {
            text: '❌ لا يوجد حساب'
        }
    )
}
await resetDailyMissions(player)
const today =
new Date().toLocaleDateString(
'en-CA',
{
timeZone:
'Asia/Riyadh'
}
)

if (
player.dailyReward &&
player.dailyReward.lastClaim ===
today
) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'❌ استلمت اليومي بالفعل\n\n⏳ انتظر حتى 12 صباحاً بتوقيت السعودية'
        }
    )
}

const rewardMoney = 250000
const rewardXp = 500

player.money += rewardMoney
player.xp += rewardXp

// تسجيل الدخول اليومي للمهمات
player.dailyMissions.login = true

player.dailyReward.lastClaim =
today

await player.save()

return safeSend(
msg.key.remoteJid,
{
text:

`🎁 المكافأة اليومية

💰 ${rewardMoney.toLocaleString()} مال
📚 ${rewardXp} XP

✅ تم احتساب مهمة تسجيل الدخول اليومي

⏳ يتجدد الساعة 12 صباحاً بتوقيت السعودية`
}
)

}

    if (text === '.استلام_المهام') {

const player =
await Player.findOne({ userId })

if (!player) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
            '❌ لا يوجد حساب'
        }
    )
}

const m =
player.dailyMissions

if (!m) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
            '❌ لا توجد بيانات مهام'
        }
    )
}

if (m.claimed) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
            '❌ استلمت مكافأة المهام اليوم'
        }
    )
}

const completed =
    m.login &&
    m.wins >= 5 &&
    m.bossKills >= 2 &&
    m.pulls >= 10 &&
    m.gotSSS &&
    m.gotLegendary >= 3

if (!completed) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
            '❌ لم تكمل جميع المهام بعد'
        }
    )
}

// الجوائز

player.money += 2500000

player.xp += 5000

player.boxes.legendary += 1

player.boxes.sss_chance += 1

m.claimed = true

player.markModified(
'dailyMissions'
)

await player.save()

return safeSend(
msg.key.remoteJid,
{
text:

`🎉 تم استلام مكافأة المهام اليومية

💰 2,500,000 مال

📚 5000 XP

📦 Legendary Box ×1

📦 SSS Chance Box ×1

✅ مبروك`
}
)

}
    
if (text === '.حالة') {

if (!battleState.activeBattle) {

return safeSend(
msg.key.remoteJid,
{
text:
'❌ لا توجد حرب حالياً'
}
)
}

const battle =
battleState.activeBattle

let remaining = 300

if (
battle.startTime
) {

remaining =
Math.max(
0,
300 -
Math.floor(
(
Date.now() -
battle.startTime
) / 1000
)
)
}

const minutes =
Math.floor(
remaining / 60
)

const seconds =
remaining % 60

const timeText =
`${minutes}:${String(seconds).padStart(2, '0')}`

function flagOwner(flag) {

if (flag.owner === 'red')
return '🔴'

if (flag.owner === 'blue')
return '🔵'

return '⚪'
}

function playersOnFlag(flagLetter) {

const players =
battle.players.filter(
p =>
p.flag === flagLetter &&
p.alive
)

if (
players.length === 0
) {

return 'لا يوجد'
}

return players
.map(
p => {

const mention =
'@' +
p.userId.split('@')[0]

return `${p.team === 'red' ? '🔴' : '🔵'} ${mention}

👤 ${p.currentCharacter.name}

☠️ القتلات: ${p.kills || 0}
💀 الوفيات: ${p.deaths || 0}
🏴 الاستحواذات: ${p.captures || 0}`
}
)
.join('\n━━━━━━━━━━━━━━━\n')
}

const redFlags =
Object.values(
battle.flags
).filter(
f => f.owner === 'red'
).length

const blueFlags =
Object.values(
battle.flags
).filter(
f => f.owner === 'blue'
).length

return sock.sendMessage(
msg.key.remoteJid,
{
mentions:
battle.players.map(
p => p.userId
),

text:

`⚔️ حالة الحرب

⏱️ ${timeText}

👥 اللاعبين:
${battle.players.length}/8

🏴 الأعلام المسيطر عليها

🔴 ${redFlags}/5
🔵 ${blueFlags}/5

━━━━━━━━━━━━━━━

🏴 A ${flagOwner(battle.flags.A)}
📊 ${battle.flags.A.progress}%

${playersOnFlag('A')}

━━━━━━━━━━━━━━━

🏴 B ${flagOwner(battle.flags.B)}
📊 ${battle.flags.B.progress}%

${playersOnFlag('B')}

━━━━━━━━━━━━━━━

🏴 C ${flagOwner(battle.flags.C)}
📊 ${battle.flags.C.progress}%

${playersOnFlag('C')}

━━━━━━━━━━━━━━━

🏴 D ${flagOwner(battle.flags.D)}
📊 ${battle.flags.D.progress}%

${playersOnFlag('D')}

━━━━━━━━━━━━━━━

🏴 E ${flagOwner(battle.flags.E)}
📊 ${battle.flags.E.progress}%

${playersOnFlag('E')}`
}
)
}

// =========================
// .حرب
// =========================

if (text === '.حرب') {

    if (battleState.activeBattle) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ توجد حرب جارية بالفعل'
            }
        )
    }

    battleState.activeBattle = {

        roomId:
            msg.key.remoteJid,

        started: false,

        createdBy:
            userId,

        createdAt:
            Date.now(),

        players: [],

        redTeam: [],

        blueTeam: [],

        maxPlayers: 8,

        duration:
            5 * 60,

        flags: {

A: {
    owner: null,
    progress: 0,
    players: [],
    capturer: null
},

B: {
    owner: null,
    progress: 0,
    players: [],
    capturer: null
},

C: {
    owner: null,
    progress: 0,
    players: [],
    capturer: null
},

D: {
    owner: null,
    progress: 0,
    players: [],
    capturer: null
},

E: {
    owner: null,
    progress: 0,
    players: [],
    capturer: null
}

}
    }

    return safeSend(
        msg.key.remoteJid,
        {
            text:

`⚔️ تم إنشاء حرب جديدة

👥 اللاعبين:
0/8

🏴 الأعلام:

🏴 A
🏴 B
🏴 C
🏴 D
🏴 E

━━━━━━━━━━━━━━━

للانضمام:

.انضم 1 2

مثال:

.انضم 3 5`
        }
    )
}

// =========================
// .انضم 1 2
// =========================

if (text.startsWith('.انضم')) {

    if (!battleState.activeBattle) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ لا توجد حرب حالياً'
            }
        )
    }

    if (
        battleState.activeBattle.started
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ الحرب بدأت بالفعل'
            }
        )
    }

    const args =
        text.trim().split(' ')

    if (args.length < 3) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ الاستخدام:\n.انضم 1 2'
            }
        )
    }

    const char1Index =
        parseInt(args[1]) - 1

    const char2Index =
        parseInt(args[2]) - 1

    const player =
        await Player.findOne({
            userId
        })

    if (!player) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ لم يتم العثور على حسابك'
            }
        )
    }

    const char1 =
        player.characters?.[
            char1Index
        ]

    const char2 =
        player.characters?.[
            char2Index
        ]

    if (
        !char1 ||
        !char2
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ رقم شخصية غير صحيح'
            }
        )
    }

    if (
        char1Index ===
        char2Index
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ اختر شخصيتين مختلفتين'
            }
        )
    }

    const alreadyJoined =
        battleState
        .activeBattle
        .players
        .find(
            p =>
            p.userId ===
            userId
        )

    if (alreadyJoined) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ أنت منضم بالفعل'
            }
        )
    }

    let team = 'red'

    if (
        battleState
        .activeBattle
        .redTeam
        .length >
        battleState
        .activeBattle
        .blueTeam
        .length
    ) {

        team = 'blue'
    }

    const battlePlayer = {

    userId,

    team,

    currentCharacter: char1,

    originalCharacter: char1,

    secondCharacter: char2,

    usingSecond: false,

    currentHp: char1.power,

    alive: true,

    flag: null,

    respawning: false,

    kills: 0,

    deaths: 0,

    captures: 0,

    lastCaptureTime: 0
}

    battleState
        .activeBattle
        .players
        .push(
            battlePlayer
        )

    if (team === 'red') {

        battleState
            .activeBattle
            .redTeam
            .push(
                userId
            )

    } else {

        battleState
            .activeBattle
            .blueTeam
            .push(
                userId
            )
    }

    const totalPlayers =
        battleState
        .activeBattle
        .players
        .length

    await safeSend(
        msg.key.remoteJid,
        {
            text:

`✅ تم الانضمام للحرب

🔥 الأساسية:
${char1.name}

🌀 الاحتياطية:
${char2.name}

🎨 الفريق:
${team === 'red'
? '🔴 الأحمر'
: '🔵 الأزرق'}

👥 ${totalPlayers}/8`
        }
    )

    if (totalPlayers >= 8) {

await safeSend(
    msg.key.remoteJid,
    {
        text:

`⚔️ اكتمل اللوبي

🔴 4 VS 4 🔵

⏳ تبدأ الحرب خلال 10 ثوانٍ`
}
)

setTimeout(
    async () => {

        if (
    !battleState.activeBattle
) return

battleState
    .activeBattle
    .started = true

battleState.activeBattle.redScore = 0

battleState.activeBattle.blueScore = 0

        await safeSend(
            msg.key.remoteJid,
            {
                text:

`⚔️ بدأت الحرب

⏱️ 5:00

🏴 A ⚪

🏴 B ⚪

🏴 C ⚪

🏴 D ⚪

🏴 E ⚪`
}
)


setTimeout(
    async () => {

        if (
            !battleState.activeBattle
        ) return

        let redFlags = 0
        let blueFlags = 0

        Object.values(
            battleState.activeBattle.flags
        ).forEach(flag => {

            if (
                flag.owner === 'red'
            ) {

                redFlags++
            }

            if (
                flag.owner === 'blue'
            ) {

                blueFlags++
            }
        })

        let winner =
            'تعادل'

        if (
            redFlags > blueFlags
        ) {

            winner =
                '🔴 الأحمر'
        }

        if (
            blueFlags > redFlags
        ) {

            winner =
                '🔵 الأزرق'
        }
        
const mvp =
[...battleState.activeBattle.players]
.sort(
(a,b) =>
(
(b.kills * 2) +
(b.captures * 5) -
(b.deaths)
)
-
(
(a.kills * 2) +
(a.captures * 5) -
(a.deaths)
)
)[0]

// أضف هنا 👇👇👇

const mentions =
battleState.activeBattle.players.map(
    p => p.userId
)

const results =
battleState.activeBattle.players
.map(p => {

    const mention =
    '@' +
    p.userId.split('@')[0]

    return `${p.team === 'red' ? '🔴' : '🔵'} ${mention}

☠️ ${p.kills || 0}
🏴 ${p.captures || 0}
💀 ${p.deaths || 0}`
})
.join('\n\n')

// إلى هنا 👆👆👆

const neutralFlags =
    5 -
    redFlags -
    blueFlags

await sock.sendMessage(
    battleState.activeBattle.roomId,
    {
        text:

`🏁 انتهت الحرب

🏴 الأعلام المحتلة

🔴 ${redFlags}/5

🔵 ${blueFlags}/5

⚪ ${neutralFlags}/5

━━━━━━━━━━━━━━━

🏆 الفائز

${winner}

━━━━━━━━━━━━━━━

👑 MVP الحرب

⚔️ ${
mvp?.currentCharacter?.name ||
'لا يوجد'
}

☠️ ${mvp?.kills || 0} قتلات

🏴 ${mvp?.captures || 0} استحواذ

💀 ${mvp?.deaths || 0} وفاة

━━━━━━━━━━━━━━━

📊 النتائج

${results}`,

        mentions
    }
)
        const Player =
    require('./models/Player')

for (
    const p of
    battleState.activeBattle.players
) {

    const playerData =
        await Player.findOne({
            userId: p.userId
        })

    if (!playerData)
        continue

    const won =
        (
            winner === '🔴 الأحمر' &&
            p.team === 'red'
        ) ||
        (
            winner === '🔵 الأزرق' &&
            p.team === 'blue'
        )

    if (won) {

        playerData.money += 5000
        playerData.xp += 1000

    } else {

        playerData.money += 2000
        playerData.xp += 300
    }

    await playerData.save()
}

battleState.activeBattle =
    null

    },

    5 * 60 * 1000
)
    },
    10000
)

}

return
}

    if (text.startsWith('.احتل')) {

if (
!battleState.activeBattle ||
!battleState.activeBattle.started
) {

return safeSend(
    msg.key.remoteJid,
    {
        text:

'❌ لا توجد حرب نشطة'
}
)
}

const args =
text.trim().split(' ')

const flag =
args[1]?.toUpperCase()

if (
!['A','B','C','D','E']
.includes(flag)
) {

return safeSend(
    msg.key.remoteJid,
    {
        text:

'❌ اختر علم A أو B أو C أو D أو E'
}
)
}

const player =
battleState.activeBattle.players.find(
p =>
p.userId === userId
)

if (!player) {

return safeSend(
    msg.key.remoteJid,
    {
        text:

'❌ أنت لست داخل الحرب'
}
)
}
    if (
    player.lastCaptureTime &&
    Date.now() - player.lastCaptureTime < 30000
) {

    const remaining =
        Math.ceil(
            (
                30000 -
                (
                    Date.now() -
                    player.lastCaptureTime
                )
            ) / 1000
        )

    return safeSend(
        msg.key.remoteJid,
        {
            text:

`⏳ يجب الانتظار ${remaining} ثانية قبل الانتقال لعلم آخر`
        }
    )
}

const flagData =
battleState.activeBattle.flags[
flag
]
    if (
flagData.capturer &&
flagData.capturer !== userId
) {

const capturerPlayer =
    battleState.activeBattle.players.find(
        p =>
            p.userId ===
            flagData.capturer
    )

return safeSend(
    msg.key.remoteJid,
    {
        text:

`❌ يوجد لاعب يستولي على العلم ${flag} حالياً

⚔️ ${
capturerPlayer
?
capturerPlayer.currentCharacter.name
:
'لاعب'
}`
}
)
}

if (
battleState.captureIntervals[
userId
]
) {

clearInterval(
    battleState.captureIntervals[
        userId
    ]
)

delete battleState.captureIntervals[
    userId
]

}
        
        const oldFlag =
player.flag

if (
oldFlag &&
battleState.activeBattle.flags[oldFlag]
) {

battleState.activeBattle.flags[
oldFlag
].capturer = null
}

player.flag = flag
    flagData.capturer =
userId

await safeSend(
msg.key.remoteJid,
{
text:

`🏴 بدأت السيطرة على العلم ${flag}

⚔️ ${player.currentCharacter.name}`
}
)

battleState.captureIntervals[
userId
] = setInterval(
async () => {

    if (
        !battleState.activeBattle
    ) return

    const enemies =
        battleState.activeBattle.players.filter(
            p =>
            p.team !== player.team &&
            p.flag === flag &&
            p.alive
        )

    if (enemies.length > 0) {

        clearInterval(
            battleState.captureIntervals[
                userId
            ]
        )

        delete battleState.captureIntervals[
            userId
        ]
        flagData.capturer =
    null

        await safeSend(
            msg.key.remoteJid,
            {
                text:

`⚔️ تم إيقاف السيطرة

يوجد عدو على العلم ${flag}

استخدم:

.قاتل`
}
)

        return
    }

    if (
        flagData.owner &&
        flagData.owner !== player.team
    ) {

        flagData.progress -= 10

        if (
            flagData.progress <= 0
        ) {

            flagData.progress = 0

            flagData.owner = null

            await safeSend(
                msg.key.remoteJid,
                {
                    text:

`🏴 العلم ${flag}

أصبح محايداً ⚪`
}
)
}

    } else {

        flagData.progress += 10

        if (
            flagData.progress > 100
        ) {

            flagData.progress = 100
        }
    }

    if (
        flagData.progress >= 100
    ) {

        clearInterval(
            battleState.captureIntervals[
                userId
            ]
        )

        delete battleState.captureIntervals[
            userId
        ]

        flagData.owner =
            player.team
        flagData.capturer =
    null

        player.captures =
            (player.captures || 0) + 1
        player.lastCaptureTime =
    Date.now()

        await safeSend(
            msg.key.remoteJid,
            {
                text:

`🏆 تم احتلال العلم ${flag}

${player.team === 'red'
? '🔴'
: '🔵'}

${player.currentCharacter.name}

📊 100%`
}
)
}

},

2000

)

return
}

    if (text === '.اعلام') {
if (!battleState.activeBattle) {

return safeSend(
    msg.key.remoteJid,
    {
        text:

'❌ لا توجد حرب حالياً'
}
)
}

const flags =
battleState.activeBattle.flags

function owner(flag) {

if (flag.owner === 'red')
    return '🔴'

if (flag.owner === 'blue')
    return '🔵'

return '⚪'

}

function capturer(flag) {

if (!flag.capturer)
    return 'لا يوجد'

const player =
    battleState.activeBattle.players.find(
        p =>
            p.userId ===
            flag.capturer
    )

if (!player)
    return 'لا يوجد'

return `${player.team === 'red' ? '🔴' : '🔵'} ${player.currentCharacter.name}`

}

return safeSend(
msg.key.remoteJid,
{
text:

`🏴 حالة الأعلام

🏴 A ${owner(flags.A)}
${getFlagBar(flags.A.progress)}
${flags.A.progress}%
👤 المستولي: ${capturer(flags.A)}

━━━━━━━━━━━━━━━

🏴 B ${owner(flags.B)}
${getFlagBar(flags.B.progress)}
${flags.B.progress}%
👤 المستولي: ${capturer(flags.B)}

━━━━━━━━━━━━━━━

🏴 C ${owner(flags.C)}
${getFlagBar(flags.C.progress)}
${flags.C.progress}%
👤 المستولي: ${capturer(flags.C)}

━━━━━━━━━━━━━━━

🏴 D ${owner(flags.D)}
${getFlagBar(flags.D.progress)}
${flags.D.progress}%
👤 المستولي: ${capturer(flags.D)}

━━━━━━━━━━━━━━━

🏴 E ${owner(flags.E)}
${getFlagBar(flags.E.progress)}
${flags.E.progress}%
👤 المستولي: ${capturer(flags.E)}`
}
)
}

    // =========================
// .اذهب A
// =========================

if (text.startsWith('.اذهب')) {

    if (
        !battleState.activeBattle ||
        !battleState.activeBattle.started
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ لا توجد حرب نشطة'
            }
        )
    }

    const args =
        text.trim().split(' ')

    const flag =
        args[1]?.toUpperCase()

    if (
        !['A','B','C','D','E']
        .includes(flag)
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ اختر علماً صحيحاً (A-E)'
            }
        )
    }

    const player =
        battleState.activeBattle.players
        .find(
            p =>
            p.userId === userId
        )

    if (!player) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ أنت لست داخل الحرب'
            }
        )
    }

    if (
    battleState.captureIntervals[
        userId
    ]
) {

    clearInterval(
        battleState.captureIntervals[
            userId
        ]
    )

    delete battleState.captureIntervals[
        userId
    ]
}

player.flag = flag

const enemiesOnFlag =
    battleState.activeBattle.players.filter(
        p =>
            p.userId !== userId &&
            p.team !== player.team &&
            p.flag === flag &&
            p.alive
    )

if (enemiesOnFlag.length > 0) {

    await safeSend(
        msg.key.remoteJid,
        {
            text:

`⚔️ يوجد عدو على العلم ${flag}

استخدم:

.قاتل`
        }
    )
}

return safeSend(
    msg.key.remoteJid,
    {
        text:

`🏃‍♂️ توجهت إلى العلم ${flag}

🏴 ${flag}`
    }
)
}

    if (text === '.قاتل') {

if (
    !battleState.activeBattle ||
    !battleState.activeBattle.started
) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:

'❌ لا توجد حرب نشطة'
}
)
}

const attacker =
    battleState.activeBattle.players.find(
        p =>
            p.userId === userId
    )

if (!attacker) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:

'❌ أنت لست داخل الحرب'
}
)
}

if (
    attacker.respawning
) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:

'⏳ أنت ميت حالياً'
}
)
}

const enemy =
    battleState.activeBattle.players.find(
        p =>
            p.userId !== userId &&
            p.team !== attacker.team &&
            p.flag === attacker.flag &&
            p.alive
    )

if (!enemy) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:

'❌ لا يوجد عدو على هذا العلم'
}
)
}
        const flagData =
battleState.activeBattle.flags[
attacker.flag
]

if (
    flagData.capturer === attacker.userId
) {

    flagData.capturer = null

    clearInterval(
        battleState.captureIntervals[
            attacker.userId
        ]
    )

    delete battleState.captureIntervals[
        attacker.userId
    ]
}

if (
    !battleState.activeBattle.fights
) {

    battleState.activeBattle.fights = {}
}

if (
    battleState.activeBattle.fights[
        attacker.userId
    ]
) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:

'⚔️ أنت بالفعل داخل قتال'
}
)
}

battleState.activeBattle.fights[
attacker.userId
] = true

battleState.activeBattle.fights[
enemy.userId
] = true

const attackerMention =
'@' +
attacker.userId.split('@')[0]

const enemyMention =
'@' +
enemy.userId.split('@')[0]

const othersOnFlag =
battleState.activeBattle.players.filter(
p =>
p.flag === attacker.flag &&
p.alive &&
p.userId !== attacker.userId &&
p.userId !== enemy.userId
)

const othersText =
othersOnFlag.length > 0
?
othersOnFlag.map(
p =>
`${p.team === 'red' ? '🔴' : '🔵'} ${p.currentCharacter.name}`
)
:
'لا يوجد'

await safeSend(
msg.key.remoteJid,
{
mentions: [
attacker.userId,
enemy.userId
],

text:

`⚔️ بدأ القتال على العلم ${attacker.flag}

🔴 ${attackerMention}
👤 ${attacker.currentCharacter.name}

🆚

🔵 ${enemyMention}
👤 ${enemy.currentCharacter.name}

━━━━━━━━━━━━━━━

👥 الموجودون على العلم:

${othersText}`
}
)

const fightInterval =
setInterval(
    async () => {

        if (
            !battleState.activeBattle
        ) {

            clearInterval(
                fightInterval
            )

            return
        }

        if (
            !attacker.alive ||
            !enemy.alive
        ) {

            clearInterval(
                fightInterval
            )

            delete battleState.activeBattle.fights[
                attacker.userId
            ]

            delete battleState.activeBattle.fights[
                enemy.userId
            ]

            return
        }

        const fighters =
        [
            {
                atk: attacker,
                def: enemy
            },
            {
                atk: enemy,
                def: attacker
            }
        ]

        for (
            const turn of fighters
        ) {

            if (
                !turn.atk.alive ||
                !turn.def.alive
            ) continue

            let crit = false

            let dodge =
                Math.random() * 100 < 15

            if (dodge) {

                await safeSend(
                    msg.key.remoteJid,
                    {
                        text:

`💨 ${turn.def.currentCharacter.name}

تفادى الهجوم`
}
)

                continue
            }

            let damage =
                Math.floor(
                    turn.atk.currentCharacter.power *
                    (
                        0.9 +
                        Math.random() * 0.3
                    )
                )

            if (
                Math.random() * 100 < 20
            ) {

                crit = true

                damage =
                    Math.floor(
                        damage * 1.8
                    )
            }

            turn.def.currentHp -= damage

            if (
                turn.def.currentHp < 0
            ) {

                turn.def.currentHp = 0
            }

            await safeSend(
                msg.key.remoteJid,
                {
                    text:

`${crit ? '💥 CRIT!\n' : ''}

⚔️ ${turn.atk.currentCharacter.name}

سبب

💥 ${damage}

❤️ ${turn.def.currentCharacter.name}

${turn.def.currentHp}/${turn.def.currentCharacter.power}`
}
)

            if (
    turn.def.currentHp <= 0
) {

    if (
        !turn.def.usingSecond &&
        turn.def.secondCharacter
    ) {

        turn.def.usingSecond =
            true

        turn.def.currentCharacter =
            turn.def.secondCharacter

        turn.def.currentHp =
            turn.def.secondCharacter.power

        await safeSend(
            msg.key.remoteJid,
            {
                text:

`☠️ ماتت الشخصية الأولى

🔥 دخل:

${turn.def.currentCharacter.name}`
            }
        )

        continue
    }

    turn.atk.kills =
        (turn.atk.kills || 0) + 1

    turn.def.deaths =
        (turn.def.deaths || 0) + 1

    turn.def.alive = false

    turn.def.flag = null

    turn.def.respawning = true

                await safeSend(
                    msg.key.remoteJid,
                    {
                        text:

`☠️ ${turn.def.currentCharacter.name}

هُزم

⏳ Respawn خلال 30 ثانية`
}
)

                setTimeout(
    async () => {

        if (
            !battleState.activeBattle
        ) return

        turn.def.alive = true

        turn.def.respawning = false

        turn.def.currentCharacter =
            turn.def.originalCharacter

        turn.def.usingSecond = false

        turn.def.currentHp =
            turn.def.originalCharacter.power

        await safeSend(
            battleState.activeBattle.roomId,
            {
                text:

`🔄 عاد

${turn.def.currentCharacter.name}

إلى المعركة`
            }
        )

    },
    30000
)

                clearInterval(
                    fightInterval
                )

                delete battleState.activeBattle.fights[
                    attacker.userId
                ]

                delete battleState.activeBattle.fights[
                    enemy.userId
                ]

                return
            }
        }

    },

    3000
)

return

}
    
if (text.startsWith('.مفضلة ')) {

const player =
    await Player.findOne({ userId })

if (!player) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '❌ لا تملك حساباً'
        }
    )
}

// تنظيف المفضلة إذا انتهت مدتها

if (
    player.favoriteExpires &&
    player.favoriteExpires <= Date.now()
) {

    player.favoriteCharacter = null

    player.favoriteObtained = 0

    player.favoriteExpires = 0

    await player.save()
}

// منع اختيار أي شخصية أخرى قبل انتهاء 4 أيام

if (
    player.favoriteExpires > Date.now()
) {

    const remaining =
        player.favoriteExpires -
        Date.now()

    const days =
        Math.ceil(
            remaining /
            86400000
        )

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`❌ لا يمكنك اختيار شخصية مفضلة جديدة

⏳ المتبقي:
${days} يوم

انتظر انتهاء مدة الـ 4 أيام`
        }
    )
}

const name =
    text.replace(
        '.مفضلة',
        ''
    ).trim()

const search =
    name.toLowerCase()

const sssCharacters =
    characters.filter(
        c => c.rarity === 'SSS'
    )

let target =
    sssCharacters.find(
        c =>
            c.name.toLowerCase() ===
            search
    )

if (!target) {

    target =
        sssCharacters.find(
            c =>
                c.name
                 .toLowerCase()
                 .startsWith(
                     search
                 )
        )
}

if (!target) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

'❌ لم يتم العثور على شخصية SSS بهذا الاسم'
}
)
}

if (
    player.money < 200000
) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

'❌ تحتاج 200000 ذهب'
}
)
}

player.money -= 200000

player.favoriteCharacter =
    target.name

player.favoriteObtained = 0

player.favoriteExpires =
    Date.now() +
    (
        4 *
        24 *
        60 *
        60 *
        1000
    )

await player.save()

return sock.sendMessage(
    msg.key.remoteJid,
    {
        text:

`⭐ تم تعيين الشخصية المفضلة

👤 ${target.name}

💰 التكلفة:
200000

⏳ المدة:
4 أيام

🚫 لا يمكن تغيير الشخصية المفضلة حتى انتهاء المدة

🎯 النسخ المتبقية:
2`
}
)
}
        
    if (text === '.المفضلة') {

    const player =
        await Player.findOne({ userId })

    if (!player) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا تملك حساباً'
            }
        )
    }

    if (
        !player.favoriteCharacter
    ) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
'❌ لا توجد شخصية مفضلة حالياً'
            }
        )
    }

    const remaining =
        Math.max(
            0,
            player.favoriteExpires -
            Date.now()
        )

    const days =
        Math.floor(
            remaining /
            (1000 * 60 * 60 * 24)
        )

    const hours =
        Math.floor(
            (
                remaining %
                (1000 * 60 * 60 * 24)
            ) /
            (1000 * 60 * 60)
        )

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`⭐ الشخصية المفضلة

👤 ${player.favoriteCharacter}

🎯 النسخ المحصلة:
${player.favoriteObtained}/2

⏳ الوقت المتبقي:
${days} يوم
${hours} ساعة`
        }
    )
}
    
if (text === '.استرجاع_sss') {

    const players = await Player.find({})
    let updated = 0

    for (const player of players) {

        let changed = false

        for (const char of player.characters) {

            // 🔥 فقط شخصيات SSS
            if (char.rarity !== 'SSS') continue

            // 🛡️ لا نلمس المطورين إطلاقًا
            if ((char.evolutionLevel || 0) > 0) continue

            // 🔎 نجيب الأصل من الملف (SSS فقط)
            const original = characters.find(c =>
                c.name.trim().toLowerCase() === char.name.trim().toLowerCase() &&
                c.rarity === 'SSS'
            )

            if (!original) continue

            // 🔧 استرجاع القوة فقط
            if (char.power !== original.power) {
                char.power = original.power
                changed = true
                updated++
            }
        }

        if (changed) {
            player.markModified('characters')
            await player.save()
        }
    }

    return sock.sendMessage(msg.key.remoteJid, {
        text: `✅ تم استرجاع قوة شخصيات SSS بنجاح\n\n⚔️ عدد التعديلات: ${updated}`
    })
}

if (text === '.ايقاف') {

    if (
        !allowedGroups.includes(
            msg.key.remoteJid
        )
    ) {
        return
    }

    const metadata =
        await sock.groupMetadata(
            msg.key.remoteJid
        )

    const participant =
        metadata.participants.find(
            p => p.id === userId
        )

    const isAdmin =
        participant?.admin === "admin" ||
        participant?.admin === "superadmin"

    if (
        !isOwner(msg) &&
        !isAdmin
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ هذا الأمر للمطور أو مشرفي المجموعة فقط."
            }
        )
    }

    disabledGroups.add(
        msg.key.remoteJid
    )

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
'🔴 تم إيقاف البوت مؤقتاً في هذا القروب'
        }
    )
}

if (text === '.تشغيل') {

    if (
        !allowedGroups.includes(
            msg.key.remoteJid
        )
    ) {
        return
    }

    const metadata =
        await sock.groupMetadata(
            msg.key.remoteJid
        )

    const participant =
        metadata.participants.find(
            p => p.id === userId
        )

    const isAdmin =
        participant?.admin === "admin" ||
        participant?.admin === "superadmin"

    if (
        !isOwner(msg) &&
        !isAdmin
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
"❌ هذا الأمر للمطور أو مشرفي المجموعة فقط."
            }
        )
    }

    disabledGroups.delete(
        msg.key.remoteJid
    )

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
'🟢 تم تشغيل البوت مجدداً في هذا القروب'
        }
    )
}
    
    if (text === '.اصلاح_الالقاب') {

    const players = await Player.find({})

    let fixed = 0

    for (const player of players) {

        if (!player.titles)
            player.titles = []

        const titlesToAdd = [
            '🌌 حاكم الأكوان',
            '👑 ملك الأبطال'
        ]

        for (const title of titlesToAdd) {

            if (
                !player.titles.includes(
                    title
                )
            ) {

                player.titles.push(
                    title
                )

                fixed++
            }
        }

        await player.save()
    }

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`✅ تم استرجاع الألقاب القديمة

🏆 الألقاب المضافة:
🌌 حاكم الأكوان
👑 ملك الأبطال

👥 عدد الإضافات:
${fixed}`
        }
    )
}


    
if (text === '.المملكة') {

    const player =
        await Player.findOne({ userId })

    if (!player) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد حساب'
            }
        )
    }

    const today =
new Date().toLocaleDateString(
    'en-CA',
    {
        timeZone:
        'Asia/Riyadh'
    }
)

    if (
        !player.kingdomRaid ||
        player.kingdomRaid.lastReset !== today
    ) {

        player.kingdomRaid = {
            stage: 0,
            usedCharacters: [],
            lastReset: today
        }

        await player.save()
    }

    const currentStage =
        player.kingdomRaid.stage

    if (currentStage >= 10) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:

`👑 ═════〔 المملكة 〕═════ 👑

🏆 تم احتلال المملكة بالكامل

💰 جميع الجوائز تم استلامها

⏳ يتجدد الغزو عند 12:00 ليلاً`
            }
        )
    }

    const stage =
        kingdomStages[currentStage]

    return safeSend(
        msg.key.remoteJid,
        {
            text:

`👑 ═════〔 غزو المملكة 〕═════ 👑

📍 المرحلة الحالية:
${currentStage + 1}/10

${stage.name}

⚔️ القوة المطلوبة:
${stage.power}

💰 مكافأة المرحلة:
${stage.reward.toLocaleString()}

🔒 الشخصيات المستنزفة:
${player.kingdomRaid.usedCharacters.length}

📝 للدخول:

.غزو رقم_الشخصية`
        }
    )
}

    
if (text.startsWith('.غزو ')) {

    const player =
        await Player.findOne({ userId })

    if (!player) {
        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد حساب'
            }
        )
    }

    const today =
new Date().toLocaleDateString(
    'en-CA',
    {
        timeZone:
        'Asia/Riyadh'
    }
)

    if (
        !player.kingdomRaid ||
        player.kingdomRaid.lastReset !== today
    ) {

        player.kingdomRaid = {
            stage: 0,
            usedCharacters: [],
            lastReset: today
        }
    }

    const args =
        text.split(' ')

    const index =
        parseInt(args[1]) - 1

    if (isNaN(index)) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ مثال:\n.غزو 1'
            }
        )
    }

    const char =
        player.characters[index]

    if (!char) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ الشخصية غير موجودة'
            }
        )
    }

    if (
        player.kingdomRaid.usedCharacters.includes(
            char.name
        )
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:

`🔒 ${char.name}

تم استنزاف هذه الشخصية اليوم

⏳ تعود عند إعادة تعيين الغزو`
            }
        )
    }

    const current =
        player.kingdomRaid.stage

    if (current >= 10) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'🏆 أكملت الغزو اليومي'
            }
        )
    }

    const stage =
        kingdomStages[current]

    if (char.power < stage.power) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:

`❌ فشل الاقتحام

👑 ${char.name}

⚔️ القوة:
${char.power}

🏰 المطلوب:
${stage.power}

💡 الشخصية لم تُستهلك`
            }
        )
    }

    player.money += stage.reward

    player.kingdomRaid.usedCharacters.push(
        char.name
    )

    player.kingdomRaid.stage++

    player.markModified(
        'kingdomRaid'
    )

    await player.save()

    if (
        player.kingdomRaid.stage >= 10
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:

`👑 تم فتح العرش الإمبراطوري

🏆 اكتمل غزو المملكة

💰 إجمالي الأرباح:
2,000,000

⏳ يتجدد عند 12:00 ليلاً`
            }
        )
    }

    return safeSend(
        msg.key.remoteJid,
        {
            text:

`${stage.name}

⚔️ ${char.name}

✅ نجح الاقتحام

💰 +${stage.reward.toLocaleString()}

🔒 تم استنزاف الشخصية

📍 التقدم:
${player.kingdomRaid.stage}/10`
        }
    )
}
    
if (text === '.س') {

    try {

        const quoted =
            msg.message
            ?.extendedTextMessage
            ?.contextInfo

        if (
            !quoted ||
            !quoted.quotedMessage
        ) {
            return safeSend(
                msg.key.remoteJid,
                {
                    text:
'❌ قم بالرد على صورة أو GIF أو فيديو'
                }
            )
        }

        const quotedMsg =
            quoted.quotedMessage

        let buffer

try {

    buffer = await downloadMediaMessage(
        {
            message: quotedMsg
        },
        'buffer',
        {},
        {
            logger: console,
            reuploadRequest: sock.updateMediaMessage
        }
    )

} catch (err) {

    console.log('DOWNLOAD MEDIA ERROR:')
    console.error(err)

    return safeSend(
        msg.key.remoteJid,
        {
            text: '❌ تعذر تحميل الوسائط، أعد إرسال الصورة ثم حاول مرة أخرى.'
        }
    )

}

        // صورة
        if (
            quotedMsg.imageMessage
        ) {

            const sticker =
    new Sticker(
        buffer,
        {
            pack:
'❖ 𝑵𝒂𝒎𝒊𝒊 𝑺𝒘𝒂𝒏 ❖',

            author: '.',

            type:
            StickerTypes.CROPPED,

            quality: 100
        }
    )
            const webp =
                await sticker.toBuffer()

            return sock.sendMessage(
                msg.key.remoteJid,
                {
                    sticker:
                    webp
                }
            )
        }

        // فيديو / GIF
if (quotedMsg.videoMessage) {
if (quotedMsg.videoMessage.seconds > 10) {
    return safeSend(
        msg.key.remoteJid,
        {
            text: '❌ الحد الأقصى 10 ثواني'
        }
    )
}

console.log(
    'MIMETYPE:',
    quotedMsg.videoMessage.mimetype
)
    console.log(
        'GIF PLAYBACK:',
        quotedMsg.videoMessage?.gifPlayback
    )

    console.log(
        'VIDEO SECONDS:',
        quotedMsg.videoMessage?.seconds
    )

    const input =
        `./tmp_${Date.now()}.mp4`

    const output =
        `./tmp_${Date.now()}.webp`

    await fs.promises.writeFile(
        input,
        buffer
    )

    try {

    await videoToSticker(
        input,
        output
    )

} catch (err) {

    console.log(
        'VIDEO CONVERT ERROR:'
    )

    console.error(err)

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'❌ فشل ffmpeg أثناء التحويل'
        }
    )
}
const stat =
    await fs.promises.stat(
        output
    )

console.log(
    'WEBP SIZE:',
    stat.size
)
    

const webp =
    await fs.promises.readFile(
        output
    )

await sock.sendMessage(
    msg.key.remoteJid,
    {
        sticker: webp
    }
)

await fs.promises.unlink(input)
await fs.promises.unlink(output)

return
}

        return safeSend(
            msg.key.remoteJid,
            {
                text:
'❌ الوسائط غير مدعومة'
            }
        )

    } catch (err) {

    console.log('STICKER ERROR FULL:')
    console.error(err)

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'❌ فشل إنشاء الستيكر'
        }
    )
}
}
                    
    
if (text.startsWith('.دمج')) {

    const player =
        await Player.findOne({
            userId
        })

    if (!player) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لا يوجد حساب'
            }
        )
    }

    const args =
        text.split(' ')

    if (args.length !== 6) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:

`❌ الاستخدام الصحيح

.دمج 1 2 3 4 5`
            }
        )
    }

    const a =
        parseInt(args[1]) - 1

    const b =
        parseInt(args[2]) - 1

    const c =
        parseInt(args[3]) - 1

    const d =
        parseInt(args[4]) - 1

    const e =
        parseInt(args[5]) - 1

    const unique =
        new Set([a, b, c, d, e])

    if (unique.size !== 5) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لا يمكن تكرار نفس الشخصية'
            }
        )
    }

    const selected = [
        player.characters[a],
        player.characters[b],
        player.characters[c],
        player.characters[d],
        player.characters[e]
    ]

    for (const char of selected) {

        if (!char) {
            return safeSend(
                msg.key.remoteJid,
                {
                    text:
                    '❌ إحدى الشخصيات غير موجودة'
                }
            )
        }

        if (
            char.rarity !== 'اسطوري'
        ) {
            return safeSend(
                msg.key.remoteJid,
                {
                    text:
                    '❌ يجب أن تكون جميع الشخصيات من رتبة اسطوري'
                }
            )
        }
    }

    const sssPool =
        characters.filter(
            c =>
            c.rarity === 'SSS'
        )

    if (!sssPool.length) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لا توجد شخصيات SSS'
            }
        )
    }

    const reward =
        JSON.parse(
            JSON.stringify(
                sssPool[
                    Math.floor(
                        Math.random() *
                        sssPool.length
                    )
                ]
            )
        )

    const indexes =
        [a, b, c, d, e]
        .sort((x, y) => y - x)

    for (const i of indexes) {
        player.characters.splice(
            i,
            1
        )
    }

    player.characters.push(
        reward
    )

    player.markModified(
        'characters'
    )

    await player.save()

    return safeSend(
        msg.key.remoteJid,
        {
            image: {
                url:
                reward.image
            },

            caption:

`✨ ═══════〔 الدمج 〕═══════ ✨

🔥 تم دمج 5 شخصيات اسطورية

🎁 حصلت على:

👑 ${reward.name}

🌟 ${reward.rarity}

⚔️ القوة:
${reward.power}

🎉 مبروك!`
        }
    )
}
    
if (text === '.مضارباتي') {

    const player =
        await Player.findOne({
            userId
        })

    if (!player) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لا يوجد حساب'
            }
        )
    }

    const hour =
        60 * 60 * 1000

    const currentPeriod =
        Math.floor(
            Date.now() / hour
        )

    if (
        player.lastBrawlReset !==
        currentPeriod
    ) {

        player.brawlFights = 5

        player.lastBrawlReset =
            currentPeriod

        await player.save()
    }

    return safeSend(
        msg.key.remoteJid,
        {
            text:

`🥊 ═══════〔 المضاربات 〕═══════ 🥊

⚔️ المتبقي:
${player.brawlFights}/5

🏆 الانتصارات:
${player.brawlWins || 0}

💀 الخسائر:
${player.brawlLosses || 0}`
        }
    )
}

    
if (text.startsWith('.تشكيلة')) {

    const player =
        await Player.findOne({
            userId
        })

    if (!player) {
        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد حساب'
            }
        )
    }

    const args =
        text.split(' ')

    if (args.length < 4) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:

`❌ الاستخدام الصحيح

.تشكيلة 1 2 3`
            }
        )
    }

    const indexes = [
        parseInt(args[1]) - 1,
        parseInt(args[2]) - 1,
        parseInt(args[3]) - 1
    ]

    if (
        indexes.some(
            i => isNaN(i)
        )
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ أرقام غير صحيحة'
            }
        )
    }

    if (
        new Set(indexes).size !== 3
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لا يمكن تكرار نفس الشخصية'
            }
        )
    }

    const selected = []

    for (const i of indexes) {

        const char =
            player.characters[i]

        if (!char) {

            return safeSend(
                msg.key.remoteJid,
                {
                    text:
`❌ الشخصية رقم ${i + 1} غير موجودة`
                }
            )
        }

        selected.push(i)
    }

    player.pvpTeam = selected

    await player.save()

    const names =
        selected.map(
            i =>
                `👑 ${player.characters[i].name}`
        )

    return safeSend(
        msg.key.remoteJid,
        {
            text:

`🥊 ═══════〔 تم حفظ التشكيلة 〕═══════ 🥊

${names.join('\n')}

🔥 أصبحت جاهزاً للمضاربات`
        }
    )
}

    if (text === '.تشكيلتي') {

    const player =
        await Player.findOne({
            userId
        })

    if (
        !player ||
        !player.pvpTeam ||
        !player.pvpTeam.length
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لم تقم بتحديد تشكيلة بعد'
            }
        )
    }

    let result =
`🥊 ═══════〔 تشكيلتك القتالية 〕═══════ 🥊

`

    player.pvpTeam.forEach(
        (index, i) => {

            const char =
                player.characters[index]

            if (!char) return

            const evoRanks = [
                "SSS",
                "SSS+",
                "SSS++",
                "UR I",
                "UR II",
                "UR III",
                "EX"
            ]

            let rank =
                char.rarity

            if (
                char.evolutionLevel > 0
            ) {
                rank =
                    evoRanks[
                        char.evolutionLevel
                    ]
            }

            let abilities = ''

            if (
                char.urAbilities &&
                char.urAbilities.length
            ) {

                abilities =
                    '\n🔥 القدرات:\n' +
                    char.urAbilities
                    .map(a => `• ${a.name}`)
                    .join('\n')
            }

            result +=
`〔${i + 1}〕 ${char.name}

🌟 ${rank}
⚔️ القوة: ${char.power}
${abilities}

━━━━━━━━━━━━━━━

`
        }
    )

    return safeSend(
        msg.key.remoteJid,
        {
            text: result
        }
    )
}

    if (text.startsWith('.مضاربة')) {

    const mentioned =
        msg.message?.extendedTextMessage
        ?.contextInfo?.mentionedJid?.[0]

    if (!mentioned) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ قم بعمل منشن للشخص'
            }
        )
    }

    if (mentioned === userId) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لا يمكنك مضاربة نفسك'
            }
        )
    }

    const player =
        await Player.findOne({
            userId
        })

    if (!player) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لا يوجد حساب'
            }
        )
    }

    if (
        !player.pvpTeam ||
        player.pvpTeam.length !== 3
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ يجب تحديد تشكيلة أولاً

.تشكيلة 1 2 3`
            }
        )
    }

    // تجديد المحاولات كل ساعة

    const hour =
        60 * 60 * 1000

    const currentPeriod =
        Math.floor(
            Date.now() / hour
        )

    if (
        player.lastBrawlReset !==
        currentPeriod
    ) {

        player.brawlFights = 5
        player.lastBrawlReset =
            currentPeriod

        await player.save()
    }

    if (
        player.brawlFights <= 0
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ انتهت محاولات المضاربة لهذا الساعة'
            }
        )
    }

    const target =
        await Player.findOne({
            userId: mentioned
        })

    if (!target) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ الخصم لا يملك حساباً'
            }
        )
    }

    if (
        !target.pvpTeam ||
        target.pvpTeam.length !== 3
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ الخصم لم يحدد تشكيلة'
            }
        )
    }

    target.pendingBrawl = {
        challenger: userId,
        createdAt: Date.now()
    }

    await target.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text:

`🥊 تم إرسال طلب مضاربة

🎯 إلى:
@${mentioned.split('@')[0]}

⌛ بانتظار القبول

استخدم:

.قبول مضاربة
أو
.رفض مضاربة`,

            mentions: [mentioned]
        }
    )
}
    if (text === '.رفض مضاربة') {

    const player =
        await Player.findOne({
            userId
        })

    if (
        !player ||
        !player.pendingBrawl
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لا يوجد طلب مضاربة'
            }
        )
    }

    player.pendingBrawl = null

    await player.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text:
            '❌ تم رفض المضاربة'
        }
    )
}
    
if (text === '.قبول مضاربة') {

    const player =
        await Player.findOne({
            userId
        })

    if (
        !player ||
        !player.pendingBrawl
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لا يوجد طلب مضاربة'
            }
        )
    }
    const age =
    Date.now() -
    player.pendingBrawl.createdAt

if (age > 5 * 60 * 1000) {

    player.pendingBrawl = null

    await player.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text:
            '❌ انتهت صلاحية طلب المضاربة'
        }
    )
}

    const challenger =
        await Player.findOne({
            userId:
            player.pendingBrawl.challenger
        })

    if (!challenger) {

        player.pendingBrawl = null

        await player.save()

        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ صاحب المضاربة غير موجود'
            }
        )
    }

    // التحقق من التشكيلة

    if (
        !player.pvpTeam ||
        player.pvpTeam.length !== 3
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ قم بتحديد تشكيلتك أولاً\n\n.تشكيلة 1 2 3'
            }
        )
    }

    if (
        !challenger.pvpTeam ||
        challenger.pvpTeam.length !== 3
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ الخصم لا يملك تشكيلة مكتملة'
            }
        )
    }
    // المضاربات المتبقية

    if ((player.brawlFights || 0) <= 0) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ انتهت مضارباتك لهذه الساعة'
            }
        )
    }

    if ((challenger.brawlFights || 0) <= 0) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ الخصم لا يملك مضاربات متبقية'
            }
        )
    }

    player.brawlFights -= 1
    challenger.brawlFights -= 1

    player.pendingBrawl = null

    await player.save()
    await challenger.save()

    await startBrawl(
        sock,
        msg.key.remoteJid,
        challenger,
        player
    )
}
            

    if (text.startsWith('.مضاربة')) {

    const mentioned =
        msg.message?.extendedTextMessage
        ?.contextInfo?.mentionedJid?.[0]

    if (!mentioned) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ قم بعمل منشن للشخص'
            }
        )
    }

    if (mentioned === userId) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لا يمكنك مضاربة نفسك'
            }
        )
    }

    const player =
        await Player.findOne({
            userId
        })

    if (!player) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لا يوجد حساب'
            }
        )
    }
        if (player.pendingBrawl) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
            '❌ لديك طلب مضاربة معلق'
        }
    )
}

    if (
        !player.pvpTeam ||
        player.pvpTeam.length !== 3
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:

`❌ يجب اختيار تشكيلة أولاً

.تشكيلة 1 2 3`
            }
        )
    }

    const hour =
        60 * 60 * 1000

    const currentPeriod =
        Math.floor(
            Date.now() / hour
        )

    if (
        player.lastBrawlReset !==
        currentPeriod
    ) {

        player.brawlFights = 5

        player.lastBrawlReset =
            currentPeriod

        await player.save()
    }

    if (
        player.brawlFights <= 0
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ انتهت المضاربات

⏳ تتجدد 5 مضاربات كل ساعة`
            }
        )
    }

    const target =
        await Player.findOne({
            userId: mentioned
        })

    if (!target) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ الخصم لا يملك حساباً'
            }
        )
    }

    if (
        !target.pvpTeam ||
        target.pvpTeam.length !== 3
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ الخصم لم يحدد تشكيلة'
            }
        )
    }

    if (
        target.pendingBrawl
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لدى هذا اللاعب طلب مضاربة آخر'
            }
        )
    }

    target.pendingBrawl = {

        challenger: userId,

        createdAt:
            Date.now()
    }

    await target.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text:

`🥊 ═══════〔 طلب مضاربة 〕═══════ 🥊

🎯 المرسل:
@${userId.split('@')[0]}

⚔️ يريد مضاربتك

✅ .قبول مضاربة
❌ .رفض مضاربة`,

            mentions: [
                userId
            ]
        }
    )
}
    

if (text.startsWith('.ترتيب ')) {

    const player =
        await Player.findOne({
            userId
        })

    if (!player) {
        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد حساب'
            }
        )
    }

    const args =
        text.split(' ')

    const from =
        parseInt(args[1]) - 1

    const to =
        parseInt(args[2]) - 1

    if (
        isNaN(from) ||
        isNaN(to)
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ الاستخدام

.ترتيب 5 1`
            }
        )
    }

    if (
        !player.characters[from] ||
        to < 0 ||
        to >= player.characters.length
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ رقم غير صحيح'
            }
        )
    }

    const char =
        player.characters.splice(
            from,
            1
        )[0]

    player.characters.splice(
        to,
        0,
        char
    )

    player.markModified(
        'characters'
    )

    await player.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`✅ تم ترتيب الشخصيات

👑 ${char.name}

📍 أصبح في المركز ${to + 1}`
        }
    )
}

    if (text === '.حول الكل') {

    const player =
        await Player.findOne({
            userId
        })

    if (!player) {
        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد حساب'
            }
        )
    }

    if (!player.shards) {
        player.shards = new Map()
    }

    let converted = []
    let totalShards = 0

    const keep = []
    const count = {}

    const evolved = new Set()

for (const char of player.characters) {

    if (
        char.rarity === 'SSS' &&
        (char.evolutionLevel || 0) > 0
    ) {
        evolved.add(
`${char.name}|${char.form || ''}`
)
    }

}

for (const char of player.characters) {

    if (char.rarity !== 'SSS') {
        keep.push(char)
        continue
    }

    if ((char.evolutionLevel || 0) > 0) {
        keep.push(char)
        continue
    }

    const shardKey =
    char.name.replace(/\./g, "．")
    if (
    evolved.has(
`${char.name}|${char.form || ''}`
    )
) {

        const current =
            player.shards.get(shardKey) || 0

        player.shards.set(
            shardKey,
            current + 1
        )

        converted.push(`👑 ${char.name} +1`)
        totalShards++
        continue
    }

    count[shardKey] =
        (count[shardKey] || 0) + 1

    if (count[shardKey] === 1) {

        keep.push(char)

    } else {

        const current =
            player.shards.get(shardKey) || 0

        player.shards.set(
            shardKey,
            current + 1
        )

        converted.push(`👑 ${char.name} +1`)
        totalShards++

    }

}

    if (!totalShards) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ لا توجد شخصيات مكررة قابلة للتحويل`
            }
        )
    }

    player.characters = keep

    player.markModified(
        'characters'
    )

    await player.save()

    return safeSend(
    msg.key.remoteJid,
    {
        text:
`💎 ═══════〔 تحويل المكررات 〕═══════ 💎

${converted.join('\n')}

━━━━━━━━━━━━━━━

🔄 عدد الشخصيات المحولة:
${totalShards}

🧩 إجمالي الشظايا:
${totalShards}

📦 السعة المستخدمة:
${player.characters.length}/${player.maxCharacters || 30}

🏆 تم تنظيف جميع النسخ المكررة بنجاح`
    }
)
    }

if (text.startsWith('.حول ')) {

try {

    const player =
    await Player.findOne({
        userId
    })

if (!player) {
    return safeSend(
        msg.key.remoteJid,
        {
            text:
            '❌ لا يوجد حساب'
        }
    )
}

if (!player.shards) {
    player.shards = new Map()
}

    const args =
        text.split(' ')

    const index =
        parseInt(args[1]) - 1

    if (isNaN(index)) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ الاستخدام الصحيح

.حول 1`
            }
        )
    }

    const char =
        player.characters[index]

    if (!char) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ الشخصية غير موجودة'
            }
        )
    }

    if (char.rarity !== 'SSS') {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ فقط شخصيات SSS يمكن تحويلها'
            }
        )
    }
    
    if ((char.evolutionLevel || 0) > 0) {
    return safeSend(
        msg.key.remoteJid,
        {
            text: '❌ لا يمكن تحويل الشخصيات المطورة.'
        }
    )
    }

    console.log(
    'Character:',
    char
)

console.log(
    'Shards:',
    player.shards
)

console.log(
    'Character Name:',
    char.name
)
    const normalCopies =
    player.characters.filter(
        c =>
            c.name === char.name &&
            c.power === char.power &&
            (c.form || '') === (char.form || '') &&
            c.rarity === 'SSS' &&
            (c.evolutionLevel || 0) === 0
    )

const hasEvolved =
    player.characters.some(
        c =>
            c.name === char.name &&
            (c.form || '') === (char.form || '') &&
            (c.evolutionLevel || 0) > 0
    )
if (!hasEvolved && normalCopies.length <= 1) {
    return safeSend(
        msg.key.remoteJid,
        {
            text:
`❌ لا يمكن تحويل آخر نسخة

👑 ${char.name}`
        }
    )
}

    player.characters.splice(
        index,
        1
    )

    const shardKey =
    char.name.replace(/\./g, "．")
const currentShards =
    player.shards.get(
        shardKey
    ) || 0

player.shards.set(
    shardKey,
    currentShards + 1
)

player.markModified(
    'shards'
)

player.markModified(
    'characters'
)

await player.save()

    return safeSend(
    msg.key.remoteJid,
    {
        text:
`💎 تم التحويل إلى شظية

👑 ${char.name}

🧩 الشظايا الحالية:
${currentShards + 1}/2

♻️ يمكنك استرجاع الشخصية عبر:

.استرجاع`
    }
)

} catch (err) {

    console.log(
        'CONVERT ERROR:',
        err
    )

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`❌ حدث خطأ أثناء التحويل

${err.message}`
        }
    )
}
}

    if (
text.startsWith('.استرجاع ')
) {

const player =
await Player.findOne({
userId
})

if (!player) {

return safeSend(
msg.key.remoteJid,
{
text:
'❌ لا يوجد حساب'
}
)
}

const shards =
player.shards || new Map()

const available = [...shards.entries()]
    .filter(([name, amount]) => amount > 0)
    .sort((a, b) =>
        a[0].localeCompare(b[0], "en", {
            sensitivity: "base"
        })
    )
    .map(([name, amount]) => ({
        name,
        amount
    }))

const index =
parseInt(
text.split(' ')[1]
) - 1

if (
isNaN(index) ||
!available[index]
) {

return safeSend(
msg.key.remoteJid,
{
text:
'❌ رقم غير صحيح'
}
)
}

const shardData =
available[index]

const name =
    shardData.name.replace(/．/g, ".")

const char =
    characters.find(c =>
        c.rarity === "SSS" &&
        (
            c.name === name ||
            c.name.replace(/\./g, "．") === shardData.name
        )
    )

if (!char) {

return safeSend(
msg.key.remoteJid,
{
text:
'❌ لم يتم العثور على الشخصية'
}
)

}

player.characters.push({
...char
})


const shardKey =
    name.replace(/\./g, "．")

player.shards.set(
    shardKey,
    shardData.amount - 1
)

player.markModified(
'characters'
)

player.markModified(
'shards'
)

await player.save()

return safeSend(
msg.key.remoteJid,
{
text:

`♻️ تم الاسترجاع

👑 ${char.name}

🧩 الشظايا المتبقية:

${shardData.amount - 1}/2`
}
)
}
    
    
if (text.startsWith('.تطوير')) {

const player =
    await Player.findOne({
        userId
    })

if (!player) {
    return safeSend(
        msg.key.remoteJid,
        {
            text:
            '❌ لا يوجد حساب'
        }
    )
}

const args =
    text.split(' ')

const index =
    parseInt(args[1]) - 1

if (isNaN(index)) {
    return safeSend(
        msg.key.remoteJid,
        {
            text:

`❌ الاستخدام الصحيح

.تطوير 1`
}
)
}

const char =
    player.characters[index]

if (!char) {
    return safeSend(
        msg.key.remoteJid,
        {
            text:
            '❌ الشخصية غير موجودة'
        }
    )
}
const alreadyEvolved =
    player.characters.find(
        c =>
            c.name === char.name &&
            (c.evolutionLevel || 0) > 0 &&
            c !== char
    )

if (alreadyEvolved) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`❌ ${char.name}

يوجد لديك نسخة أخرى مطورة من هذه الشخصية بالفعل

👑 لا يمكن تطوير أكثر من نسخة واحدة من نفس الشخصية

💎 استخدم المكررات للشظايا عبر:
.حول رقم_الشخصية`
        }
    )
}
    
    if (char.evolutionLevel === undefined)
    char.evolutionLevel = 0

if (!char.urAbilities)
    char.urAbilities = []

    
const ranks = [
    "SSS",
    "SSS+",
    "SSS++",
    "UR I",
    "UR II",
    "UR III",
    "EX"
]

const powers = [
    7000,
    10000,
    13000,
    16000,
    19000,
    22000,
    25000
]

const costs = [
    1000000,
    1500000,
    2000000,
    2500000,
    3000000,
    3500000
]

if (char.rarity !== 'SSS') {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
            '❌ فقط شخصيات SSS يمكن تطويرها'
        }
    )
}

if (!player.shards) {
    player.shards = new Map()
}
    const shardKey =
    char.name.replaceAll('.', '_')

const currentLevel =
    char.evolutionLevel || 0

if (currentLevel >= 6) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`👑 ${char.name}

🌌 وصلت الشخصية إلى رتبة EX بالفعل`
        }
    )
}

const shards =
    player.shards.get(
        shardKey
    ) || 0
if (shards < 2) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:

`❌ لا تملك شظايا كافية

🧩 ${char.name}

📦 ${shards}/2`
        }
    )
}

const cost =
    costs[currentLevel]

if (player.money < cost) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:

`❌ تحتاج

💰 ${cost.toLocaleString()}`
        }
    )
}

player.money -= cost

player.shards.set(
    shardKey,
    shards - 2
)

player.markModified(
    'shards'
)

const oldLevel =
    currentLevel

char.evolutionLevel++

const newLevel =
    char.evolutionLevel

if (!char.evolutionType) {

    if (char.power >= 6600) {

        char.evolutionType = 'fixed'

    } else if (char.power >= 5400) {

        char.evolutionType = 'medium'

    } else {

        char.evolutionType = 'low'

    }

}

if (char.evolutionType === 'fixed') {

    char.power = powers[newLevel]

} else if (
    char.evolutionType === 'medium'
) {

    char.power += 2500

} else {

    char.power += 2000

}
const availableAbilities =
    urAbilities.filter(
        a =>
        !char.urAbilities.some(
            owned =>
            owned.name === a.name
        )
    )

let randomAbility = null
let exAbility = null
if (availableAbilities.length) {

    const totalChance =
        availableAbilities.reduce(
            (sum, ability) =>
                sum + ability.chance,
            0
        )

    let roll =
        Math.random() *
        totalChance

    for (
    const ability
    of availableAbilities
) {

    roll -= ability.chance

    if (roll <= 0) {

        randomAbility =
            ability

        break
    }
}
}
if (randomAbility) {

    char.urAbilities.push(
        randomAbility
    )
}

if (newLevel === 6) {

    const availableAbilities =
        urAbilities.filter(
            a =>
            !char.urAbilities.some(
                owned =>
                owned.name === a.name
            )
        )

    if (availableAbilities.length) {

        exAbility =
            availableAbilities[
                Math.floor(
                    Math.random() *
                    availableAbilities.length
                )
            ]

        char.urAbilities.push(
            exAbility
        )
    }
}

player.markModified(
    'characters'
)

await player.save()

const oldRank =
    ranks[oldLevel]

const newRank =
    ranks[newLevel]

if (newLevel === 6) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: char.image
            },

            caption:

`╔═══━━━✦❖✦━━━═══╗
      🌌 𝗘𝗫 𝗔𝗪𝗔𝗞𝗘𝗡𝗜𝗡𝗚 🌌
╚═══━━━✦❖✦━━━═══╝

🌑 انكسرت القيود القديمة
☄️ تمزقت الأبعاد
🌠 تحررت القوة الكامنة

👑 ${char.name}

╭━━〔 🌟 التطور النهائي 🌟 〕━━╮
┃ ${oldRank} ➜ EX
╰━━━━━━━━━━━━━━━━━━━━━━╯

⚔️ القوة القتالية
┗➤ ${char.power.toLocaleString()}

💰 التكلفة
┗➤ ${cost.toLocaleString()}

🧩 الشظايا المستهلكة
┗➤ 2

${exAbility ? `╭━━〔 🔥 قدرة جديدة 🔥 〕━━╮
┃ ${exAbility.name}
┃
┃ 📈 ${exAbility.description}
╰━━━━━━━━━━━━━━━━━━━━━━╯

` : ''}

🏆 تم بلوغ أعلى رتبة ممكنة

✨ أصبحت الشخصية الآن ضمن
👑 نخبة شخصيات EX الأسطورية 👑

╔═══━━━✦❖✦━━━═══╗
      🌠 𝗟𝗘𝗚𝗘𝗡𝗗 𝗔𝗦𝗖𝗘𝗡𝗦𝗜𝗢𝗡 🌠
╚═══━━━✦❖✦━━━═══╝`
        }
    )
}

return safeSend(
    msg.key.remoteJid,
    {
        text:

`🌌 ═══════〔 EVOLUTION 〕═══════ 🌌

👑 ${char.name}

🌟 ${oldRank}
⬇️
🌟 ${newRank}

⚔️ القوة:
${char.power}

${randomAbility ? `🔥 القدرة الجديدة

${randomAbility.name}

📈 ${randomAbility.description}` : ''}

💰 تم خصم:
${cost.toLocaleString()}

🧩 تم استهلاك:
2 شظايا`
    }
)
}
    
if (text === '.شظايا') {

const player =
    await Player.findOne({
        userId
    })

if (!player) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
            '❌ لا يوجد حساب'
        }
    )
}

const shards =
    player.shards || new Map()

if (
    !shards ||
    shards.size === 0
) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
            '📭 لا تملك أي شظايا'
        }
    )
}

let msgText =

`🧩 شظايا الشخصيات

`

let count = 0
let index = 1

const sortedShards = [...shards.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "en", { sensitivity: "base" })
)

for (
    const [name, amount]
    of sortedShards
) {

    if (amount <= 0)
        continue

    count++

    const displayName =
    name.split('|')[0].replaceAll('_', ' ')

    const icon =
    amount >= 2
    ? '🟩'
    : '🟨'

msgText +=
`${index}- ${icon} ${displayName} • ${amount}/2\n`

index++
}

if (count === 0) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
            '📭 لا تملك أي شظايا'
        }
    )
}

msgText +=

`\n━━━━━━━━━━━━━━

📦 الإجمالي: ${count}

♻️ للاسترجاع:

.استرجاع رقم`

return sock.sendMessage(
    msg.key.remoteJid,
    {
        text: msgText
    }
)

}

    

            if (text === '.اقضي') {

const player =
    await Player.findOne({ userId })

if (!player) {
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '❌ ليس لديك حساب'
        }
    )
}

// ⬇️ أضفه هنا
if (
    player.bossDead &&
    player.bossRespawn
) {

    if (
        Date.now() <
        new Date(
            player.bossRespawn
        ).getTime()
    ) {

        const remaining =
            Math.ceil(
                (
                    new Date(
                        player.bossRespawn
                    ).getTime()
                    - Date.now()
                ) / 60000
            )

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
`☠️ أنت ميت حالياً

⏳ المتبقي:
${remaining} دقيقة`
            }
        )
    }

    player.bossDead = false
    player.hp = player.maxHp

    await player.save()
}
// ⬆️ إلى هنا

if (
    !player.characters ||
    !player.characters.length
) {
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '❌ لا تملك شخصيات'
        }
    )
}

           if (!player.bossHp || player.bossMaxHp !== 60000) {

    player.bossHp = 60000
    player.bossMaxHp = 60000

    await player.save()
}     
const cooldownKey =
    `${userId}_kurama`

const lastUse =
    cooldowns.get(cooldownKey)

if (
    lastUse &&
    Date.now() - lastUse < 30000
) {

    const remaining =
        Math.ceil(
            (30000 -
            (Date.now() - lastUse))
            / 1000
        )

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`⏳ انتظر ${remaining} ثانية قبل استخدام .اقضي مرة أخرى`
        }
    )
}

cooldowns.set(
    cooldownKey,
    Date.now()
)
                

const target =
    await Beast.findOne({
        name: 'كوراما',
        hp: { $gt: 0 }
    })

if (!target) {

    const deadKurama =
        await Beast.findOne({
            name: 'كوراما'
        })

    let respawnText = ''

    if (
    deadKurama &&
    deadKurama.respawnAt
) {
    respawnText =
`\n\n⏳ العودة:
${deadKurama.respawnAt.toLocaleString()}`
}

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`❌ كوراما غير متاح حالياً${respawnText}`
}
)
}

const strongest =
    player.characters.reduce((best, current) => {

        if (!best) return current

        return current.power > best.power
            ? current
            : best

    }, null)

let damage =
    Math.floor(strongest.power * 2)

// قدرة لاعب عشوائية
const ability =
    playerAbilities[
        Math.floor(Math.random() * playerAbilities.length)
    ]

let abilityText = ''

if (ability.type === 'damage') {
    damage += ability.multiplier
        ? Math.floor(damage * (ability.multiplier - 1))
        : 0

    abilityText = `⚡ قدرة اللاعب: ${ability.name}`
}

if (ability.type === 'lifesteal') {
    const heal = ability.value || 0
    player.hp = (player.hp || 0) + heal
    abilityText = `🩸 ${ability.name} (+${heal})`
}

if (ability.type === 'buffDamage') {
    damage += Math.floor(damage * (ability.value / 100))
    abilityText = `💢 ${ability.name}`
}

if (ability.type === 'extraDamage') {
    damage += ability.value
    abilityText = `☄️ ${ability.name}`
}

target.hp =
    Math.max(
        0,
        target.hp - damage
    )

if (!target.rankings) {
    target.rankings = new Map()
}

const oldDamage =
    target.rankings.get(userId) || 0

target.rankings.set(
    userId,
    oldDamage + damage
)
                target.attackCounter =
    (target.attackCounter || 0) + 1

let result =

`🦊 هجوم على كوراما

${abilityText}

🔥 كرة البيجو العملاقة

⚔️ الشخصية:
${strongest.name}

💥 الضرر:
${damage.toLocaleString()}

👹 الوحش:
كوراما

❤️ المتبقي:
${target.hp.toLocaleString()}/${target.maxHp.toLocaleString()}`
if (target.attackCounter >= 3) {

    target.attackCounter = 0

    const beastAbility =
        getKuramaAbility()

    let raidText =
`🦊 كوراما غضب!

🔥 القدرة:
${beastAbility.name}

`

    const mentions = []

    for (
        const [participantId]
        of target.rankings.entries()
    ) {

        const p =
            await Player.findOne({
                userId: participantId
            })

        if (!p) continue

        mentions.push(
            participantId
        )

        let beastDamage = 0

        if (
            beastAbility.type === 'damage'
        ) {

            beastDamage =
                beastAbility.value

        } else if (
            beastAbility.type === 'extraDamage'
        ) {

            beastDamage =
                beastAbility.value

        } else {

            beastDamage = 3000
        }

        beastDamage -= Math.floor(
            beastDamage *
            ((p.defense || 0) / 100)
        )

        beastDamage =
            Math.max(
                1,
                beastDamage
            )

        p.bossHp =
    Math.max(
        0,
        (p.bossHp || 60000) - beastDamage
    )

        if (p.bossHp <= 0) {

    p.bossHp = 0
    p.bossDead = true

    p.bossRespawn =
        new Date(
            Date.now() +
            10 * 60 * 1000
        )

    raidText +=

`☠️ @${participantId.split('@')[0]}

تم القضاء عليه

⏳ سيعود بعد 10 دقائق

❤️ 0/${p.bossMaxHp.toLocaleString()}

`

} else {

    raidText +=

`⚔️ @${participantId.split('@')[0]}

💥 -${beastDamage.toLocaleString()}

❤️ ${p.bossHp.toLocaleString()}/${p.bossMaxHp.toLocaleString()}

`
}

        await p.save()
    }

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: target.image
            },
            caption: raidText,
            mentions
        }
    )
}

                
                if (target.hp <= 0) {

    target.hp = 0
                    target.attackCounter = 0

    target.lastKilledAt =
        new Date()

    const respawn =
        new Date()

    respawn.setHours(
        respawn.getHours() + 2
    )

    target.respawnAt =
        respawn

    const ranking =
    Array.from(
        target.rankings.entries()
    )
    .sort(
        (a, b) =>
            b[1] - a[1]
    )

let rewardMsg =

`\n\n━━━━━━━━━━━━━━
🏆 تم القضاء على كوراما
━━━━━━━━━━━━━━

🥇 أفضل المقاتلين

`

const mentions = []

for (
    let i = 0;
    i < ranking.length;
    i++
) {

        const [
            playerId,
            totalDamage
        ] = ranking[i]

        const p =
            await Player.findOne({
                userId: playerId
            })

        if (!p) continue

        const reward =
            target.eggCarrier
                ? beastRewards.getEggCarrierReward(i + 1)
                : beastRewards.getNormalReward(i + 1)

        p.money =
            (p.money || 0)
            + (reward.money || 0)

        p.xp =
            (p.xp || 0)
            + (reward.xp || 0)

        p.eggTickets =
            (p.eggTickets || 0)
            + (reward.tickets || 0)

        p.beastEggs =
            (p.beastEggs || 0)
            + (reward.egg || 0)

        await p.save()

        mentions.push(playerId)

        if (i < 3) {

            const medal =
                i === 0
                ? '🥇'
                : i === 1
                ? '🥈'
                : '🥉'

            rewardMsg +=

`${medal} @${playerId.split('@')[0]}

💥 الضرر:
${totalDamage.toLocaleString()}

💰 ${reward.money || 0}
⭐ ${reward.xp || 0}
🎟️ ${reward.tickets || 0}
🥚 ${reward.egg || 0}

`
}
}

    rewardMsg +=

`━━━━━━━━━━━━━━

⏳ سيعود بعد ساعتين`

target.rankings = new Map()

await target.save()

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: rewardMsg,
            mentions
        }
    )

    result += rewardMsg
}

await target.save()

return sock.sendMessage(
    msg.key.remoteJid,
    {
        text: result
    }
)

}

    
    if (text === '.اباده') {

const player =
    await Player.findOne({ userId })

if (!player) {
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '❌ ليس لديك حساب'
        }
    )
}

if (
    player.bossDead &&
    player.bossRespawn
) {

    if (
        Date.now() <
        new Date(
            player.bossRespawn
        ).getTime()
    ) {

        const remaining =
            Math.ceil(
                (
                    new Date(
                        player.bossRespawn
                    ).getTime()
                    - Date.now()
                ) / 60000
            )

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
`☠️ أنت ميت حالياً

⏳ المتبقي:
${remaining} دقيقة`
            }
        )
    }

    player.bossDead = false
player.bossHp = 60000
player.bossMaxHp = 60000

await player.save()
}

if (
    !player.characters ||
    !player.characters.length
) {
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '❌ لا تملك شخصيات'
        }
    )
}
        if (!player.bossHp || !player.bossMaxHp) {

    player.bossHp = 60000
    player.bossMaxHp = 60000
    player.bossDead = false

    await player.save()
}

        const cooldownKey =
    `${userId}_juubi`

const lastUse =
    cooldowns.get(cooldownKey)

if (
    lastUse &&
    Date.now() - lastUse < 30000
) {

    const remaining =
        Math.ceil(
            (30000 -
            (Date.now() - lastUse))
            / 1000
        )

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`⏳ انتظر ${remaining} ثانية قبل استخدام .اباده مرة أخرى`
        }
    )
}

cooldowns.set(
    cooldownKey,
    Date.now()
)

const target =
    await Beast.findOne({
        name: 'الجوبي',
        hp: { $gt: 0 }
    })

if (!target) {

    let respawnText = ''

    const deadJuubi =
        await Beast.findOne({
            name: 'الجوبي'
        })

    if (
    deadJuubi &&
    deadJuubi.respawnAt
) {
    respawnText =
`\n\n⏳ يعود في:
${deadJuubi.respawnAt.toLocaleString()}`
}

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`❌ الجوبي غير متاح حالياً${respawnText}`
}
)
}

const strongest =
    player.characters.sort(
        (a, b) => b.power - a.power
    )[0]

let damage =
    Math.floor(strongest.power * 5)

const ability =
    playerAbilities[
        Math.floor(Math.random() * playerAbilities.length)
    ]

let abilityText = ''

if (ability.type === 'damage') {
    damage += ability.multiplier
        ? Math.floor(damage * (ability.multiplier - 1))
        : 0

    abilityText = `⚡ قدرة اللاعب: ${ability.name}`
}

if (ability.type === 'lifesteal') {
    const heal = ability.value || 0
    player.hp = (player.hp || 0) + heal
    abilityText = `🩸 ${ability.name} (+${heal})`
}

if (ability.type === 'buffDamage') {
    damage += Math.floor(damage * (ability.value / 100))
    abilityText = `💢 ${ability.name}`
}

if (ability.type === 'extraDamage') {
    damage += ability.value
    abilityText = `☄️ ${ability.name}`
}

target.hp =
    Math.max(
        0,
        target.hp - damage
    )

if (!target.rankings) {
    target.rankings = new Map()
}

const oldDamage =
    target.rankings.get(userId) || 0

target.rankings.set(
    userId,
    oldDamage + damage
)
target.attackCounter =
    (target.attackCounter || 0) + 1

let result =

`🌌 هجوم على الجوبي

☠️ قنبلة العشرة ذيول

⚔️ الشخصية:
${strongest.name}

💥 الضرر:
${damage.toLocaleString()}

👹 الوحش:
الجوبي

❤️ المتبقي:
${target.hp.toLocaleString()}/${target.maxHp.toLocaleString()}`

if (target.attackCounter >= 3) {

    target.attackCounter = 0

    const beastAbility =
        getJuubiAbility()

    let raidText =

`🌌 الجوبي أطلق قدرة جماعية!

☠️ ${beastAbility.name}

`

    const mentions = []

    for (
        const [participantId]
        of target.rankings.entries()
    ) {

        const p =
            await Player.findOne({
                userId: participantId
            })

        if (!p) continue

        mentions.push(participantId)

        let beastDamage =
            beastAbility.value || 5000

        beastDamage -= Math.floor(
            beastDamage *
            ((p.defense || 0) / 100)
        )

        beastDamage =
            Math.max(
                1,
                beastDamage
            )

        p.bossHp =
    Math.max(
        0,
        (p.bossHp || 60000) - beastDamage
    )

        if (p.bossHp <= 0) {

            p.bossHp = 0

            p.bossDead = true

            p.bossRespawn =
                new Date(
                    Date.now() +
                    10 * 60 * 1000
                )

            raidText +=

`☠️ @${participantId.split('@')[0]}

تم القضاء عليه

⏳ سيعود بعد 10 دقائق

❤️ 0/${p.bossMaxHp.toLocaleString()}

`
        } else {

            raidText +=

`⚔️ @${participantId.split('@')[0]}

💥 -${beastDamage.toLocaleString()}

❤️ ${p.bossHp.toLocaleString()}/${p.bossMaxHp.toLocaleString()}

`
        }

        await p.save()
    }

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: target.image
            },
            caption: raidText,
            mentions
        }
    )
}
        
        if (target.hp <= 0) {

    target.hp = 0
            
target.attackCounter = 0
    target.lastKilledAt =
        new Date()

    const respawn =
        new Date()

    respawn.setHours(
        respawn.getHours() + 2
    )

    target.respawnAt =
        respawn

    const ranking =
    Array.from(
        target.rankings.entries()
    ).sort(
        (a, b) => b[1] - a[1]
    )

    let rewardMsg =

`\n\n━━━━━━━━━━━━━━
🌌 تم إبادة الجوبي
━━━━━━━━━━━━━━

👑 أساطير المعركة

`

const mentions = []

for (
    let i = 0;
    i < ranking.length;
    i++
) {

        const [
            playerId,
            totalDamage
        ] = ranking[i]

        const p =
            await Player.findOne({
                userId: playerId
            })

        if (!p) continue

        const reward =
            target.eggCarrier
                ? beastRewards.getEggCarrierReward(i + 1)
                : beastRewards.getNormalReward(i + 1)

        p.money =
            (p.money || 0)
            + (reward.money || 0)

        p.xp =
            (p.xp || 0)
            + (reward.xp || 0)

        p.eggTickets =
            (p.eggTickets || 0)
            + (reward.tickets || 0)

        p.beastEggs =
            (p.beastEggs || 0)
            + (reward.egg || 0)

        await p.save()

        mentions.push(playerId)

        if (i < 3) {

            const medal =
                i === 0
                    ? '🥇'
                    : i === 1
                    ? '🥈'
                    : '🥉'

            rewardMsg +=

`${medal} @${playerId.split('@')[0]}

💥 الضرر:
${totalDamage.toLocaleString()}

💰 ${reward.money || 0}
⭐ ${reward.xp || 0}
🎟️ ${reward.tickets || 0}
🥚 ${reward.egg || 0}

`
}
}

    rewardMsg +=

`━━━━━━━━━━━━━━

⏳ سيعود بعد ساعتين

☠️ انتهت المعركة الكبرى`

    target.rankings =
        new Map()

    await target.save()

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: rewardMsg,
            mentions
        }
    )

    result += rewardMsg
}

await target.save()

return sock.sendMessage(
    msg.key.remoteJid,
    {
        text: result
    }
)

}
    
    

    if (text === '.وحشي') {

    const player =
        await Player.findOne({ userId })

    if (!player) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ ليس لديك حساب'
            }
        )
    }

    if (!player.equippedBeast) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد وحش مجهز'
            }
        )
    }

    const beasts =
        require('./systems/beasts')

    const beast =
        beasts.find(
            b =>
            b.id === player.equippedBeast
        )

    if (!beast) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ الوحش غير موجود'
            }
        )
    }

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`👹 الوحش المجهز

🏷️ الاسم:
${beast.name}

⭐ الندرة:
${beast.rarity}

⚔️ الهجوم:
${beast.attack || 0}

🛡️ الدفاع:
${beast.defense || 0}

❤️ HP:
${beast.hp || 0}

🎯 كريت:
${beast.crit || 0}

💨 تفادي:
${beast.dodge || 0}

🪞 انعكاس:
${beast.reflect || 0}`
        }
    )
}

    if (text === '.وحوشي') {

    const player =
        await Player.findOne({ userId })

    if (!player) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ ليس لديك حساب'
            }
        )
    }

    if (
        !player.ownedBeasts ||
        player.ownedBeasts.length === 0
    ) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
'❌ لا تملك أي وحوش'
            }
        )
    }

    const beasts =
        require('./systems/beasts')

    let result =
`👹 وحوشك

━━━━━━━━━━

`

    for (const beastId of player.ownedBeasts) {

        const beast =
            beasts.find(
                b => b.id === beastId
            )

        if (!beast) continue

        const equipped =
            player.equippedBeast === beast.id
                ? ' ✅ مجهز'
                : ''

        result +=
`🦴 ${beast.name}
⭐ ${beast.rarity}${equipped}

`
    }

    result +=
`━━━━━━━━━━

📦 العدد:
${player.ownedBeasts.length}`

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: result
        }
    )
}

    if (text.startsWith('.تجهيز_وحش ')) {

    const player =
        await Player.findOne({ userId })

    if (!player) return

    const beastName =
        text.replace(
            '.تجهيز_وحش ',
            ''
        ).trim()

    const beasts =
        require('./systems/beasts')

    const beast =
        beasts.find(
            b =>
                b.name === beastName
        )

    if (!beast) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
'❌ هذا الوحش غير موجود'
            }
        )
    }

    if (
        !player.ownedBeasts.includes(
            beast.id
        )
    ) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
'❌ لا تملك هذا الوحش'
            }
        )
    }

    player.equippedBeast =
        beast.id

    await player.save()

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`✅ تم تجهيز

👹 ${beast.name}`
        }
    )
    }

    if (text === '.فقس_بيضة') {

    const player =
        await Player.findOne({ userId })

    if (!player) return

    if (
        (player.beastEggs || 0)
        <= 0
    ) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
'❌ لا تملك أي بيضة'
            }
        )
    }

    const beasts =
        require('./systems/beasts')

    const roll =
        Math.random() * 100

    let pool =

        roll <= 1
        ? beasts.filter(
            b => b.rarity === 'cosmic'
        )

        : roll <= 10
        ? beasts.filter(
            b => b.rarity === 'epic'
        )

        : roll <= 40
        ? beasts.filter(
            b => b.rarity === 'legendary'
        )

        : beasts.filter(
            b => b.rarity === 'rare'
        )

    const beast =
        pool[
            Math.floor(
                Math.random()
                * pool.length
            )
        ]

    player.beastEggs--

    player.beastEggsOpened =
        (player.beastEggsOpened || 0)
        + 1

    if (
        !player.ownedBeasts.includes(
            beast.id
        )
    ) {

        player.ownedBeasts.push(
            beast.id
        )

        player.beastCollection =
            (player.beastCollection || 0)
            + 1
    }

    await player.save()

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`🥚 تم فقس البيضة

👹 الوحش:
${beast.name}

⭐ الندرة:
${beast.rarity}

📚 المجموعة:
${player.beastCollection}`
        }
    )
}
if (text === '.متجر_البيض') {

    const player =
        await Player.findOne({ userId })

    if (!player) return

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`🐾 متجر الوحوش

━━━━━━━━━━━━━━

🎟️ تذاكرك:
${player.eggTickets || 0}

━━━━━━━━━━━━━━

🐾 شكاكو       300 تذكرة
🐾 ماتاتابي    300 تذكرة
🐾 إيسوبو      350 تذكرة

🐾 سون غوكو    500 تذكرة
🐾 كوكو        500 تذكرة
🐾 سايكن       500 تذكرة

🐾 تشومي       700 تذكرة
🐾 غيوكي       800 تذكرة

🐾 كوراما      1500 تذكرة

━━━━━━━━━━━━━━

🌌 الجوبي

لا يباع في المتجر

🏆 مكافأة جمع
جميع الوحوش التسعة

━━━━━━━━━━━━━━

للشراء:

.شراء_وحش اسم_الوحش

مثال:

.شراء_وحش كوراما`
        }
    )
}
        if (text.startsWith('.شراء_وحش ')) {

const player =
    await Player.findOne({ userId })

if (!player) {
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '❌ لم يتم العثور على حسابك'
        }
    )
}

const beastName =
    text.replace(
        '.شراء_وحش ',
        ''
    ).trim()

const prices = {

    'شكاكو': 300,
    'ماتاتابي': 300,
    'إيسوبو': 350,

    'سون غوكو': 500,
    'كوكو': 500,
    'سايكن': 500,

    'تشومي': 700,
    'غيوكي': 800,

    'كوراما': 1500
}

const beasts =
    require('./systems/beasts')

const beast =
    beasts.find(
        b => b.name === beastName
    )

if (!beast) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

'❌ الوحش غير موجود في المتجر'
}
)
}

if (beast.id === 'juubi') {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`🌌 الجوبي لا يباع في المتجر

🏆 احصل عليه عبر
جمع جميع الوحوش التسعة`
}
)
}

const price =
    prices[beastName]

if (!price) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

'❌ هذا الوحش غير متاح للشراء'
}
)
}

if (
    player.ownedBeasts.includes(
        beast.id
    )
) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`❌ تملك ${beast.name} بالفعل`
        }
    )
}

if (
    (player.eggTickets || 0)
    < price
) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`❌ لا تملك تذاكر كافية

🎟️ المطلوب:
${price}

🎫 تذاكرك:
${player.eggTickets || 0}`
}
)
}

player.eggTickets -= price

player.ownedBeasts.push(
    beast.id
)

player.beastCollection =
    (player.beastCollection || 0) + 1

// مكافأة الجوبي عند جمع الجميع
const requiredBeasts = [
    'shukaku',
    'matatabi',
    'isobu',
    'son_goku',
    'kokuo',
    'saiken',
    'chomei',
    'gyuki',
    'kurama'
]

const completed =
    requiredBeasts.every(
        id =>
            player.ownedBeasts.includes(id)
    )

let rewardText = ''

if (
    completed &&
    !player.ownedBeasts.includes('juubi')
) {

    player.ownedBeasts.push(
        'juubi'
    )

    rewardText =

`\n\n🌌 إنجاز مكتمل

🏆 جمعت جميع الوحوش

👑 حصلت على الجوبي!`
}

await player.save()

return sock.sendMessage(
    msg.key.remoteJid,
    {
        text:

`🎉 تم شراء الوحش بنجاح

🐾 الوحش:
${beast.name}

🎟️ السعر:
${price} تذكرة

🎫 التذاكر المتبقية:
${player.eggTickets}

📚 عدد الوحوش:
${player.ownedBeasts.length}${rewardText}`
}
)
}

    

    
if (text === '.الوحوش') {

    const beasts =
        await Beast.find()

    let msgText =
`👹 الوحوش الحالية

`

    for (const beast of beasts) {

        msgText +=
`🔥 ${beast.name}

❤️ HP:
${beast.hp.toLocaleString()}/${beast.maxHp.toLocaleString()}

━━━━━━━━━━

`
    }

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: msgText
        }
    )
}

    
if (text === '.اصلاح_المخزون') {

    const players = await Player.find({})

    let fixed = 0

    for (const player of players) {

        const expected =
    30 +
    (Math.floor(player.level / 10) * 5) +
    15

        player.maxCharacters = expected

        await player.save()

        fixed++
    }

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`✅ تم إصلاح ${fixed} لاعب

📦 تم إعادة حساب المخزون حسب:
• المستوى
• إنهاء البرج مرتين`
        }
    )
}
    

if (text === '.تخمين') {

    if (global.guessGame.active) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ توجد لعبة تخمين نشطة بالفعل'
            }
        )
    }

    const character =
        guessCharacters[
            Math.floor(
                Math.random() *
                guessCharacters.length
            )
        ]

    global.guessGame = {
        active: true,
        character,
        questions: 0,
        maxQuestions: 30,
        startedAt: Date.now(),
        players: {},
        groupId: msg.key.remoteJid
    }

    return safeSend(
    msg.key.remoteJid,
    {
        text:
`🎭 بدأت لعبة التخمين

❓ الحد الأقصى:
30 سؤال

🎯 لكل لاعب:
3 محاولات

❓ اسأل أي سؤال عن الشخصية

🏆 للتخمين اكتب:

.الاجابة ناروتو

⏰ بعد انتهاء 30 سؤال
تبدأ مرحلة التخمين لمدة دقيقتين`
    }
)
}

    if (text === '.حالة_التخمين') {

    if (!global.guessGame.active) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لا توجد لعبة نشطة'
            }
        )
    }

    const tries =
        3 -
        (
            global.guessGame
            .players[userId] || 0
        )

    const left =
        Math.max(
            0,
            120 -
            Math.floor(
                (
                    Date.now() -
                    global.guessGame.startedAt
                ) / 1000
            )
        )

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`🎭 لعبة التخمين

❓ الأسئلة:
${global.guessGame.questions}/${global.guessGame.maxQuestions}

🎯 محاولاتك:
${tries}/3

⏳ المتبقي:
${left} ثانية`
        }
    )
}

if (text === '.انهاء_تخمين') {

    if (!global.guessGame.active) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ لا توجد لعبة نشطة'
            }
        )
    }

    const answer =
        global.guessGame.character

    global.guessGame.active = false

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`🛑 تم إنهاء اللعبة

🎭 الشخصية:

${answer.name}

📺 ${answer.anime}`
        }
    )
}

    if (
    global.guessGame?.active &&
    text.endsWith('؟')
) {

    if (
    global.guessGame.questions >=
    global.guessGame.maxQuestions
) {

    if (!global.guessGame.guessPhase) {

        global.guessGame.guessPhase = true

        await safeSend(
            msg.key.remoteJid,
            {
                text:
`⏰ انتهت الأسئلة الـ 30

🏆 بدأت مرحلة التخمين

اكتب:

.الاجابة اسم_الشخصية

⏳ لديكم دقيقتان`
            }
        )

        setTimeout(async () => {

            if (
                !global.guessGame.active
            ) return

            const answer =
                global.guessGame.character

            await safeSend(
                global.guessGame.groupId,
                {
                    text:
`⏰ انتهت مدة التخمين

🎭 الشخصية:

${answer.name}

📺 الأنمي:

${answer.anime}`
                }
            )

            global.guessGame.active = false

        }, 2 * 60 * 1000)
    }

    return
}

    global.guessGame.questions++

    const character =
        global.guessGame.character

        const animeMatch =
    text.match(/هل الانمي هو (.+)\?/i)

if (animeMatch) {

    const animeGuess =
        animeMatch[1].trim()

    const correct =
        animeGuess.toLowerCase() ===
        character.anime.toLowerCase()

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`❓ السؤال رقم ${global.guessGame.questions}

🤖 ${correct ? "نعم" : "لا"}`
        }
    )
}

    const answer = await askGemini(
`أنت حكم رسمي في لعبة تخمين شخصيات الأنمي.

الشخصية الصحيحة:

الاسم: ${character.name}
الأنمي: ${character.anime}

القواعد:

- استخدم المعلومات الرسمية فقط.
- لا تخمن إطلاقًا.
- إذا لم تكن متأكدًا 100% فأجب: لا أعلم.
- إذا كانت العبارة صحيحة فأجب: نعم.
- إذا كانت خاطئة فأجب: لا.
- إذا كان السؤال عن الأنمي فاعتمد فقط على قيمة الأنمي المذكورة أعلاه.
- لا تشرح.
- لا تضف أي كلمات أو علامات ترقيم.

الإجابات المسموح بها فقط:

نعم
لا
لا أعلم

سؤال اللاعب:

${text}`
)

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`❓ السؤال رقم ${global.guessGame.questions}

🤖 ${answer}`
        }
    )
}

    if (
    global.guessGame?.active &&
    text.startsWith('.الاجابة ')
) {

    const character =
        global.guessGame.character

    const guesses =
        character.aliases || [
            character.name
        ]

    const playerAttempts =
        global.guessGame.players[
            userId
        ] || 0

    if (playerAttempts >= 3) {
        return
    }

    const normalizedInput =
    normalizeName(
        text
            .replace('.الاجابة ', '')
            .trim()
    )

    const correct =
        guesses.some(
            alias =>
                normalizeName(alias) ===
                normalizedInput
        )

    if (correct) {

        global.guessGame.active = false

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`🏆 فاز اللاعب

@${userId.split('@')[0]}

🎭 الشخصية:

${character.name}

📺 الأنمي:

${character.anime}`,
                mentions: [userId]
            }
        )
    }

    global.guessGame.players[
        userId
    ] = playerAttempts + 1

    const left =
        3 -
        global.guessGame.players[
            userId
        ]

    if (left <= 0) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ تخمين خاطئ

🚫 انتهت محاولاتك`
            }
        )
    }

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`❌ تخمين خاطئ

🎯 المتبقي:
${left}/3`
        }
    )
}
    
    
if (text === '.بدء_رويال') {

    if (!isOwner(msg)) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ هذا الأمر للمطور فقط'
            }
        )
    }

    if (global.battleRoyale.active) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '⚠️ يوجد رويال مفتوح بالفعل'
            }
        )
    }

    global.battleRoyale = {
    active: true,
    started: false,

    players: [],

    currentTurn: null,

    currentDrop: null,

    turnCount: 0,

    rankings: [],

    zoneLevel: 1,
    zoneActive: false,
    zoneDamage: 3000
}
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`🏆 تم فتح التسجيل في الباتل رويال

اكتب:

.دخول

للانضمام إلى الحدث

بعد الدخول اختر فريقك:

.فريق_رويال 1 2 3`
        }
    )
}

    if (text.startsWith('.فريق_رويال')) {
    if (!global.battleRoyale?.active) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد باتل رويال مفتوح'
            }
        )
    }

    if (global.battleRoyale.started) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ بدأ الحدث بالفعل'
            }
        )
    }

    const royalePlayer =
        global.battleRoyale.players.find(
            p => p.userId === userId
        )

    if (!royalePlayer) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ يجب التسجيل أولاً عبر .دخول'
            }
        )
    }

    const player =
        await Player.findOne({ userId })

    if (
        !player ||
        !player.characters ||
        player.characters.length < 3
    ) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
'❌ تحتاج 3 شخصيات على الأقل'
            }
        )
    }

    const args =
        text.split(' ').slice(1)

    if (args.length !== 3) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
'❌ مثال:\n.فريق_رويال 1 2 3'
            }
        )
    }

    const indexes =
        args.map(x => Number(x) - 1)

    if (
        indexes.some(
            i =>
                isNaN(i) ||
                i < 0 ||
                i >= player.characters.length
        )
    ) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
'❌ أرقام شخصيات غير صحيحة'
            }
        )
    }

    if (
        new Set(indexes).size !== 3
    ) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
'❌ لا يمكن تكرار نفس الشخصية'
            }
        )
    }

    const selected =
        indexes.map(
            i => player.characters[i]
        )

    const avgPower =
        Math.floor(
            selected.reduce(
                (a, b) =>
                    a + (b.power || 0),
                0
            ) / 3
        )

    royalePlayer.team =
        JSON.parse(
            JSON.stringify(selected)
        )

    royalePlayer.avgPower =
        avgPower

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`👑 ═══════〔 تم حفظ فريق الرويال 〕═══════ 👑

1️⃣ ${selected[0].name}
2️⃣ ${selected[1].name}
3️⃣ ${selected[2].name}

⚔️ متوسط القوة:
${avgPower}

✅ أصبحت جاهزًا لبدء الباتل رويال`
        }
    )
}
    if (text === '.حصول') {

    if (!global.battleRoyale?.started) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد باتل رويال نشط'
            }
        )
    }

    const player =
        global.battleRoyale.players.find(
            p =>
                p.userId === userId &&
                p.alive
        )

    if (!player) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ أنت لست مشاركاً أو تم إقصاؤك'
            }
        )
    }

    const drop =
        global.battleRoyale.currentDrop

    if (!drop) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد دروب جوي حالياً'
            }
        )
    }

    let rewardText = ''

    switch (drop.type) {

        case 'hp':

            player.hp += drop.value

            rewardText =
                `❤️ +${drop.value} HP`

            break

        case 'damage':

            player.hp -= drop.value

            if (player.hp < 0)
                player.hp = 0

            rewardText =
                `☠️ خسرت ${drop.value} HP`

            break

        case 'atk':

            player.attackBonus +=
                drop.value

            rewardText =
                `⚔️ +${drop.value} ضرر`

            break

        case 'revive':

            player.revive = true

            rewardText =
                '💉 حصلت على إحياء واحد'

            break

        case 'reviveHalf':
            
            player.shield = true

            player.reviveHalf = true

            rewardText =
                '❤️ حصلت على إحياء 50%'

            break

        case 'sniper':

            player.sniper = true

            rewardText =
                '🎯 الضربة القادمة ×2'

            break
    }

    global.battleRoyale.currentDrop =
        null

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`🎁 @${userId.split('@')[0]}

حصل على:

${drop.name}

${rewardText}`
        ,
            mentions: [userId]
        }
    )
}
if (text.startsWith('.ذكاء')) {

    const question =
        text.replace(
            '.ذكاء',
            ''
        ).trim()

    if (!question) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                '❌ اكتب سؤالاً'
            }
        )
    }

    const answer =
        await askGemini(question)

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: answer
        }
    )
}
    
    if (text === '.فحصxp') {

    const me = await Player.findOne({ userId })

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`Level: ${me.level}
XP: ${me.xp}`
        }
    )
    }

    if (text === '.دخول') {

    if (!global.battleRoyale.active) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد رويال مفتوح'
            }
        )
    }

    if (global.battleRoyale.started) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ بدأ الحدث بالفعل'
            }
        )
    }

    const exists =
        global.battleRoyale.players.find(
            p => p.userId === userId
        )

    if (exists) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '⚠️ أنت مسجل بالفعل'
            }
        )
    }

    global.battleRoyale.players.push({

    userId,

    team: [],

    avgPower: 0,

    hp: 100000,
maxHp: 100000,

    alive: true,

    inZone: true,

    attackBonus: 0,

    shield: false,

    sniper: false,

    revive: false,

    reviveHalf: false,

    poison: 0,

    attacksReceived: 0,

    eliminatedAt: null
})

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`✅ تم تسجيلك في الباتل رويال

عدد المشاركين:
${global.battleRoyale.players.length}`
        }
    )
}

if (text === '.خروج_رويال') {

    if (!global.battleRoyale?.active) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد رويال مفتوح'
            }
        )
    }

    if (global.battleRoyale.started) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
'❌ لا يمكن الخروج بعد بدء الحدث'
            }
        )
    }

    const index =
        global.battleRoyale.players.findIndex(
            p => p.userId === userId
        )

    if (index === -1) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
'❌ أنت غير مسجل في الحدث'
            }
        )
    }

    global.battleRoyale.players.splice(
        index,
        1
    )

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`🚪 تم خروجك من الباتل رويال

👥 المتبقون:
${global.battleRoyale.players.length}`
        }
    )
}
        


if (text === '.رويال') {

    if (!global.battleRoyale.active) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ لا يوجد رويال حالياً'
        })
    }

    const message = `
🏆 حالة الرويال: جاري

👥 عدد المشاركين: 14
💚 عدد الأحياء: 6

📦 الدروب الحالي:
🩸 صندوق دم
`

    return sock.sendMessage(msg.key.remoteJid, {
        text: message
    })
}
    if (text === '.رويال_تفاصيل') {

    let txt = `
🏆 〔 BATTLE ROYALE 〕

📊 الحالة:
${global.battleRoyale.started ? 'بدأت' : 'التسجيل مفتوح'}

👥 المشاركون:
${global.battleRoyale.players.length}

━━━━━━━━━━━━━━
`

    global.battleRoyale.players.forEach((p, i) => {

        txt += `
${i + 1}️⃣ ${p.alive ? '🟢' : '🔴'}

⚔️ القوة:
${p.avgPower || 0}

❤️ HP:
${p.hp || 30000}

━━━━━━━━━━━━━━
`
    })

    return sock.sendMessage(msg.key.remoteJid, {
        text: txt
    })
}
    
    if (text === '.انطلاق_رويال') {


        if (global.battleRoyale.players.length < 3) {
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '❌ يجب وجود 3 لاعبين على الأقل'
        }
    )
}
    if (!isOwner(msg)) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ للمطور فقط'
            }
        )
    }

    if (!global.battleRoyale.active) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد رويال'
            }
        )
    }

    if (global.battleRoyale.started) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '⚠️ الرويال بدأ بالفعل'
            }
        )
    }

    const readyPlayers =
        global.battleRoyale.players.filter(
            p =>
                p.team &&
                p.team.length === 3
        )

    if (readyPlayers.length < 2) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
'❌ يجب وجود لاعبين اثنين على الأقل مع تشكيلات'
            }
        )
    }

    global.battleRoyale.players = readyPlayers
global.battleRoyale.started = true

// يبدأ أول زون بعد 30 ثانية
setTimeout(() => {
    startZoneCycle(sock, msg.key.remoteJid)
}, 30000)

return sock.sendMessage(
    msg.key.remoteJid,
    {
        text:
`🔥 بدأت معركة الباتل رويال

👥 المشاركون:
${readyPlayers.length}

⏳ الزون ستبدأ بالانكماش بعد 30 ثانية.

اكتب:

.متبقي

لمشاهدة الأحياء`
    }
)
}
    
if (text === '.دخول_زون') {

    if (!global.battleRoyale?.started) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد باتل رويال نشط'
            }
        )
    }

    if (!global.battleRoyale.zoneActive) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ الزون ليست نشطة حالياً'
            }
        )
    }

    const player =
        global.battleRoyale.players.find(
            p =>
                p.userId === userId &&
                p.alive
        )

    if (!player) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ أنت لست مشاركاً في الرويال'
            }
        )
    }

    if (player.inZone) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '⚠️ أنت داخل الزون بالفعل'
            }
        )
    }

    player.inZone = true

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '🏃 دخلت الزون بنجاح!'
        }
    )
}
    
if (text === '.اقصاء') {

if (!global.battleRoyale?.started) {
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '❌ لا يوجد باتل رويال نشط'
        }
    )
}

if (global.battleRoyale.currentTurn) {
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '⚔️ الأدوار بدأت بالفعل'
        }
    )
}

const alive =
    global.battleRoyale.players.filter(
        p => p.alive
    )

if (alive.length <= 1) {
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '🏆 انتهى الباتل رويال'
        }
    )
}

const current =
    alive[
        Math.floor(
            Math.random() * alive.length
        )
    ]

global.battleRoyale.currentTurn =
    current.userId

global.battleRoyale.turnQueue =
    alive
        .filter(p => p.userId !== current.userId)
        .sort(() => Math.random() - 0.5)
        .map(p => p.userId)

global.battleRoyale.currentTurn =
    current.userId

const aliveTargets =
    alive.filter(
        p => p.userId !== current.userId
    )

const targets =
    aliveTargets.map((p, i) => {

        let status = ''

        if (p.shield)
            status += '\n🛡️ درع'

        if (p.poison)
            status += '\n☠️ مسموم'

        if (p.sniper)
            status += '\n🎯 سنايبر'

        if (p.revive)
            status += '\n💉 إحياء كامل'

        if (p.reviveHalf)
            status += '\n❤️‍🩹 إحياء نصف الدم'

        return `${i + 1}️⃣ @${p.userId.split('@')[0]}
❤️ ${Math.max(0, p.hp)} / ${p.maxHp}${status}`

    }).join('\n\n')

const mentions = [
    current.userId,
    ...aliveTargets.map(p => p.userId)
]

return sock.sendMessage(
    msg.key.remoteJid,
    {
        text:
`🎯 تم اختيار أول لاعب

@${current.userId.split('@')[0]}

━━━━━━━━━━━━━━

🎯 الأهداف

${targets}

━━━━━━━━━━━━━━

اكتب:

.اضرب رقم`,
        mentions
    }
)

}
    
    
        if (text.startsWith('.اضرب')) {

try {

        if (!global.battleRoyale?.started) {
        return sock.sendMessage(
            msg.key.remoteJid,
            { text: '❌ لا يوجد باتل رويال نشط' }
        )
    }
            if (global.battleRoyale.zoneActive) {
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`☣️ الزون تضيق الآن!

❌ لا يمكن الهجوم أثناء الزون.

إذا لم تدخل الزون اكتب:

.دخول_زون`
        }
    )
}

    const current = global.battleRoyale.players.find(
        p => p.userId === global.battleRoyale.currentTurn
    )

    if (!current) {
        global.battleRoyale.currentTurn = null

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ خطأ في الدور، أعد تشغيل الباتل رويال'
            }
        )
    }

    const attacker = global.battleRoyale.players.find(
        p =>
            p.userId === userId &&
            p.alive
    )

    if (!attacker) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ أنت لست مشاركاً في الرويال'
            }
        )
    }

    if (current.userId !== userId) {
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '❌ ليس دورك'
        }
    )
}

    const alive =
        global.battleRoyale.players.filter(
            p =>
                p.alive &&
                p.userId !== attacker.userId
        )

    const num =
        parseInt(text.split(' ')[1])

    if (
    isNaN(num) ||
    num < 1 ||
    num > alive.length
) {
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `❌ اختر رقماً بين 1 و ${alive.length}`
        }
    )
}

const target = alive[num - 1]

if (!target) {
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '❌ الهدف غير موجود.'
        }
    )
}

let damage =
    attacker.avgPower +
    attacker.attackBonus +
    Math.floor(Math.random() * 2000)

    if (attacker.sniper) {
        damage *= 2
        attacker.sniper = false
    }

    if (target.shield) {
        damage = Math.floor(damage * 0.7)
        target.shield = false
    }

    target.hp -= damage

    global.battleRoyale.turnCount++

if (
    global.battleRoyale.turnCount % 3 === 0
) {

    const drop =
        royaleDrops[
            Math.floor(
                Math.random() *
                royaleDrops.length
            )
        ]

    global.battleRoyale.currentDrop = drop

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`🎁 تم إسقاط دروب جوي!

${drop.name}

أول شخص يكتب:

.حصول

سيحصل عليه`
        }
    )
}

    let txt =
`⚔️ @${attacker.userId.split('@')[0]}

هاجم

🎯 @${target.userId.split('@')[0]}

💥 الضرر:
${damage}

❤️ المتبقي:
${Math.max(0, target.hp)}
`

    if (target.poison) {

    const poisonDamage = 2000

    target.hp -= poisonDamage

    txt += `\n☠️ ضرر السم:
${poisonDamage}`

    target.poison = false
}
if (target.hp <= 0) {

    if (target.revive) {

        target.revive = false
        target.hp = 30000

        txt += `\n💉 تم إحياء الهدف`

    } else if (target.reviveHalf) {

        target.reviveHalf = false
        target.hp = 15000

        txt += `\n💉 عاد بنصف الدم`

    } else {

    target.hp = 0

    target.alive = false

    target.eliminatedAt =
        Date.now()

    global.battleRoyale.rankings.push({
        userId: target.userId
    })

    if (
        global.battleRoyale.currentTurn ===
        target.userId
    ) {
        global.battleRoyale.currentTurn = null
    }

    txt +=
`\n☠️ تم إقصاؤه من الرويال`
}
}
const survivors =
    global.battleRoyale.players.filter(
        p => p.alive
    )

let aliveTargets = []

let first = null
let second = null
let third = null

if (survivors.length === 1) {

    const winner = survivors[0]

    global.battleRoyale.rankings.push({
        userId: winner.userId
    })

    const top3 =
        [...global.battleRoyale.rankings]
            .reverse()
            .slice(0, 3)

    for (let i = 0; i < top3.length; i++) {

        const rankPlayer = top3[i]

if (!rankPlayer) continue

const player = await Player.findOne({
    userId: rankPlayer.userId
})

if (!player) {
    console.log(`Player not found: ${rankPlayer.userId}`)
    continue
}

        if (i === 0) {

            player.money += 500000
            player.xp += 100000
            player.boxes.sss_high += 1

        } else if (i === 1) {

            player.money += 250000
            player.xp += 50000
            player.boxes.sss_chance += 1

        } else if (i === 2) {

            player.money += 100000
            player.xp += 25000
            player.boxes.legendary += 1
        }

        await player.save()
    }

    first = top3[0] || null
second = top3[1] || null
third = top3[2] || null
    
txt += `\n🏆 انتهت معركة الباتل رويال\n`

if (first) {
txt += `

🥇 المركز الأول
@${first.userId.split('@')[0]}

💰 500000
⭐ 100000 XP
🎁 صندوق SSS مرتفع`
}

if (second) {
txt += `

🥈 المركز الثاني
@${second.userId.split('@')[0]}

💰 250000
⭐ 50000 XP
🎁 صندوق فرصة SSS`
}

if (third) {
txt += `

🥉 المركز الثالث
@${third.userId.split('@')[0]}

💰 100000
⭐ 25000 XP
🎁 صندوق Legendary`
}

txt += `

🎉 تم توزيع الجوائز تلقائياً`

    global.battleRoyale.started = false
    global.battleRoyale.active = false

} else {

    
const alivePlayers =
    global.battleRoyale.players.filter(
        p =>
            p.alive &&
            p.userId !== attacker.userId
    )

if (alivePlayers.length > 0) {

    while (
    global.battleRoyale.turnQueue.length &&
    !global.battleRoyale.players.find(
        p =>
            p.userId === global.battleRoyale.turnQueue[0] &&
            p.alive
    )
) {
    global.battleRoyale.turnQueue.shift()
}

if (global.battleRoyale.turnQueue.length === 0) {

    global.battleRoyale.turnQueue =
        global.battleRoyale.players
            .filter(
                p =>
                    p.alive &&
                    p.userId !== attacker.userId
            )
            .sort(() => Math.random() - 0.5)
            .map(p => p.userId)
}

const nextUserId =
    global.battleRoyale.turnQueue.shift()

const nextPlayer =
    global.battleRoyale.players.find(
        p => p.userId === nextUserId
    )

global.battleRoyale.currentTurn =
    nextPlayer.userId

    aliveTargets =
        global.battleRoyale.players.filter(
            p =>
                p.alive &&
                p.userId !== nextPlayer.userId
        )
    const targetList =
        aliveTargets.map((p, i) => {

            let status = ''

            if (p.shield)
                status += '\n🛡️ درع'

            if (p.poison)
                status += '\n☠️ مسموم'

            if (p.sniper)
                status += '\n🎯 سنايبر'

            if (p.revive)
                status += '\n💉 إحياء كامل'

            if (p.reviveHalf)
                status += '\n❤️‍🩹 إحياء نصف الدم'

            return `${i + 1}️⃣ @${p.userId.split('@')[0]}
❤️ ${Math.max(0, p.hp)} / ${p.maxHp}${status}`

        }).join('\n\n')

    txt += `

🎯 الدور الآن على:

@${nextPlayer.userId.split('@')[0]}

━━━━━━━━━━━━━━

🎯 الأهداف

${targetList}

━━━━━━━━━━━━━━

اكتب:

.اضرب رقم`
}
}

const mentions = [
    ...(first ? [first.userId] : []),
    ...(second ? [second.userId] : []),
    ...(third ? [third.userId] : []),

    attacker?.userId,
    target?.userId,
    global.battleRoyale.currentTurn,
    ...aliveTargets.map(p => p.userId)
].filter(Boolean)

return sock.sendMessage(
    msg.key.remoteJid,
    {
        text: txt,
        mentions
    }
)

} catch (err) {

    console.error('BattleRoyale Attack Error:', err)
    console.error(err.stack)

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '❌ حدث خطأ أثناء تنفيذ الهجوم.'
        }
    )

}

}
    if (text === '.نتائج_رويال') {

    if (!global.battleRoyale) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا توجد بيانات رويال'
            }
        )
    }

    const rankings =
        global.battleRoyale.rankings || []

    if (!rankings.length) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا توجد نتائج حالياً'
            }
        )
    }

    let txt =
`🏆 ═══〔 نتائج الباتل رويال 〕═══ 🏆

`

    const medals = [
        '🥇',
        '🥈',
        '🥉'
    ]

    rankings
        .slice(0, 10)
        .forEach((p, i) => {

            const medal =
                medals[i] ||
                `#${i + 1}`

            txt +=
`${medal} @${p.userId.split('@')[0]}

`
        })

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: txt,
            mentions:
                rankings
                    .slice(0, 10)
                    .map(
                        p => p.userId
                    )
        }
    )
}
if (text === '.انهاء_رويال') {

    if (!isOwner(msg)) {
        return sock.sendMessage(
            msg.key.remoteJid,
            { text: '❌ للمطور فقط' }
        )
    }

    global.battleRoyale.active = false
    global.battleRoyale.started = false
    global.battleRoyale.players = []
    global.battleRoyale.currentTurn = null
    global.battleRoyale.rankings = []

    return sock.sendMessage(
        msg.key.remoteJid,
        { text: '🏁 تم إنهاء الباتل رويال' }
    )
}
    

    if (text === '.متبقي') {

    if (!global.battleRoyale?.started) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ لا يوجد باتل رويال نشط'
        })
    }

    const alive = global.battleRoyale.players.filter(p => p.alive)

    if (!alive.length) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ لا يوجد لاعبين أحياء'
        })
    }

    let txt = `🏹 اللاعبين المتبقين

━━━━━━━━━━━━━━

`

    const sorted = [...alive].sort((a, b) => b.hp - a.hp)

    sorted.forEach((p, i) => {

        txt += `${i + 1}️⃣ @${p.userId.split('@')[0]}

❤️ ${p.hp}

⚔️ ${(p.avgPower || 0) + (p.attackBonus || 0)}

━━━━━━━━━━━━━━
`
    })

    txt += `\n👥 العدد المتبقي: ${alive.length}`

    return sock.sendMessage(msg.key.remoteJid, {
        text: txt,
        mentions: alive.map(p => p.userId)
    })
}
    
    if (text === '.ايدي') {

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`📌 ID:

${msg.key.remoteJid}`
        }
    )
}
    
if (text === '.بدا_مسابقة') {

    const room = quizData.getQuizRoom(msg.key.remoteJid)

    if (room.quizActive) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ توجد مسابقة شغالة بالفعل في هذا القروب'
        })
    }

    room.quizActive = true
    room.roundsCount = 0
    room.currentQuestion = null

    // إعادة تعيين البيانات
    for (const key in room.scoreboard) {
        delete room.scoreboard[key]
    }

    room.playerProgress = {}
    room.usedQuestions = []
    room.usedImages = []
    room.usedRepeats = []

    room.answeredUsers.clear()

    room.questionSolved = false
    room.questionStartTime = 0
    room.lastMode = -1

    await sock.sendMessage(msg.key.remoteJid, {
        text: '🎮 تم بدء المسابقة'
    })

    await startQuestion(sock, msg.key.remoteJid)
}

    if (text === '.انهاء_مسابقة') {

    const room = quizData.getQuizRoom(msg.key.remoteJid)

    if (!room.quizActive) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا توجد مسابقة حالياً في هذا القروب'
            }
        )
    }

    room.quizActive = false
    room.currentQuestion = null
    room.questionSolved = true

    let result = '🏆 نتائج المسابقة\n\n'

    const ranking = Object.entries(room.scoreboard)
        .sort((a, b) => b[1] - a[1])

    if (ranking.length === 0) {

        result += '❌ لا يوجد فائزون'

    } else {

        ranking.forEach(([id, points], index) => {

            const medals = ['🥇', '🥈', '🥉']

            result +=
`${medals[index] || '🏅'} @${id.split('@')[0]}
⭐ ${points} نقطة

`

        })

    }

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: result,
            mentions: ranking.map(x => x[0])
        }
    )

    room.roundsCount = 0

    for (const key in room.scoreboard) {
        delete room.scoreboard[key]
    }

    room.currentQuestion = null
    room.playerProgress = {}
    room.usedQuestions = []
    room.usedImages = []
    room.usedRepeats = []

    room.answeredUsers.clear()

    room.questionSolved = false
    room.questionStartTime = 0
    room.lastMode = -1
}
if (text === '.النقاط') {

    const room = quizData.getQuizRoom(msg.key.remoteJid)

    if (!room.quizActive) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ لا توجد مسابقة حالياً في هذا القروب'
        })
    }

    const ranking = Object.entries(room.scoreboard)
        .filter(([, points]) => points > 0)
        .sort((a, b) => b[1] - a[1])

    if (ranking.length === 0) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '📊 لا يوجد أي لاعب حصل على نقاط حتى الآن.'
        })
    }

    let result = '📊 النقاط الحالية\n\n'

    ranking.forEach(([id, points], index) => {

        const medals = ['🥇', '🥈', '🥉']

        result +=
`${medals[index] || '🏅'} @${id.split('@')[0]}
⭐ ${points} نقطة

`

    })

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: result,
            mentions: ranking.map(r => r[0])
        }
    )

    return
}
    
    if (
text.startsWith('.xo ')
) {

const target =
    msg.message
        ?.extendedTextMessage
        ?.contextInfo
        ?.mentionedJid?.[0]

if (!target) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ قم بمنشن اللاعب'
        }
    )
}

if (
    xo.getGame(
        msg.key.remoteJid
    )
) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ توجد لعبة حالياً'
        }
    )
}

global.pendingXO =
    global.pendingXO || {}

global.pendingXO[
    msg.key.remoteJid
] = {

    playerX:
        userId,

    playerO:
        target
}

await sock.sendMessage(
    msg.key.remoteJid,
    {
        text:

`🎮 تحدي XO

@${target.split('@')[0]}

اكتب:

.موافق

لبدء المباراة`,
mentions: [target]
}
)

return

}

if (
text === '.موافق'
) {

global.pendingXO =
    global.pendingXO || {}

const pending =
    global.pendingXO[
        msg.key.remoteJid
    ]

if (!pending)
    return

if (
    pending.playerO !==
    userId
)
    return

xo.createGame(
    msg.key.remoteJid,
    pending.playerX,
    pending.playerO
)

const game =
    xo.getGame(
        msg.key.remoteJid
    )

delete global.pendingXO[
    msg.key.remoteJid
]

await sock.sendMessage(
    msg.key.remoteJid,
    {
        text:

`🎮 بدأت المباراة

❌ @${game.playerX.split('@')[0]}
⭕ @${game.playerO.split('@')[0]}

الدور:
@${game.turn.split('@')[0]}

${xo.renderBoard(
game.board
)}`,
mentions: [
game.playerX,
game.playerO,
game.turn
]
}
)

return

}

    const game =
xo.getGame(
msg.key.remoteJid
)

if (
game &&
/^[1-9]$/.test(text)
) {

if (
    game.turn !== userId
) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ ليس دورك'
        }
    )
}

const index =
    Number(text) - 1

if (
    game.board[index] === '❌' ||
    game.board[index] === '⭕'
) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ هذه الخانة مستخدمة'
        }
    )
}

const symbol =
    userId === game.playerX
        ? '❌'
        : '⭕'

game.board[index] =
    symbol

const winner =
    xo.checkWinner(
        game.board
    )

if (winner) {

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`🏆 الفائز

@${userId.split('@')[0]}

${xo.renderBoard(
game.board
)}`,
mentions: [
userId
]
}
)

    xo.deleteGame(
        msg.key.remoteJid
    )

    return
}

if (
    xo.isDraw(
        game.board
    )
) {

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`🤝 تعادل

${xo.renderBoard(
game.board
)}`
}
)

    xo.deleteGame(
        msg.key.remoteJid
    )

    return
}

game.turn =
    game.turn ===
    game.playerX
        ? game.playerO
        : game.playerX

await sock.sendMessage(
    msg.key.remoteJid,
    {
        text:

`${xo.renderBoard(
game.board
)}

🎯 الدور:

@${game.turn.split('@')[0]}`,
mentions: [
game.turn
]
}
)

return

}
    
        if (text === '.صوره') {

    try {

        console.log('📸 IMAGE COMMAND START')

        const folderPath = './images'

        const files =
            fs.readdirSync(folderPath)

        if (files.length === 0) {

            return sock.sendMessage(
                msg.key.remoteJid,
                { text: 'لا توجد صور' }
            )
        }

        const randomImage =
            files[Math.floor(
                Math.random() * files.length
            )]

        const imagePath =
            path.join(folderPath, randomImage)

        console.log('📸 SENDING:', imagePath)

await sock.sendMessage(
    msg.key.remoteJid,
    {
        image: {
            url: imagePath
        }
    }
)

console.log('📸 IMAGE SENT')

    } catch (err) {

        console.log(
            '📸 IMAGE ERROR:',
            err
        )
    }
}

    if (text.startsWith('.زواج ')) {

const userId =
    msg.key.participant ||
    msg.key.remoteJid

const number =
    parseInt(text.split(' ')[1])

if (isNaN(number)) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ مثال:\n.زواج 1'
        }
    )
}

let player =
    await WaifuPlayer.findOne({
        userId
    })

if (!player) {

    player =
        await WaifuPlayer.create({
            userId
        })
}

player.wives =
    player.wives || []

if (player.wives.length >= 4) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '💍 الحد الأقصى 4 زوجات'
        }
    )
}

const waifus =
    await Waifu.find({
        claimedBy: userId
    })

const waifu =
    waifus[number - 1]

if (!waifu) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ وايفو غير موجودة'
        }
    )
}

if (
    player.wives.includes(
        waifu._id.toString()
    )
) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '💍 هذه زوجتك بالفعل'
        }
    )
}

player.wives.push(
    waifu._id.toString()
)

await player.save()

return sock.sendMessage(
    msg.key.remoteJid,
    {
        text:

`💍 تم الزواج من

👸 ${waifu.name}`
}
)
}
if (text === '.زوجاتي') {

const userId =
    msg.key.participant ||
    msg.key.remoteJid

const player =
    await WaifuPlayer.findOne({
        userId
    })

if (
    !player ||
    !player.wives ||
    !player.wives.length
) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '💔 لا تملك أي زوجة'
        }
    )
}

const wives =
    await Waifu.find({
        _id: {
            $in: player.wives
        }
    })

let message =

`💍 زوجاتك (${wives.length}/4)

`

wives.forEach(
    (wife, index) => {

        message +=

`${index + 1}. ${wife.name}
📺 ${wife.anime}
⭐ ${wife.rarity}

`
}
)

return sock.sendMessage(
    msg.key.remoteJid,
    {
        text: message
    }
)

}
    if (text.startsWith('.طلاق ')) {

const userId =
    msg.key.participant ||
    msg.key.remoteJid

const number =
    parseInt(text.split(' ')[1])

const player =
    await WaifuPlayer.findOne({
        userId
    })

if (
    !player ||
    !player.wives ||
    !player.wives.length
) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '💔 لا تملك أي زوجة'
        }
    )
}

const wifeId =
    player.wives[number - 1]

if (!wifeId) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ رقم غير موجود'
        }
    )
}

const wife =
    await Waifu.findById(
        wifeId
    )

player.wives.splice(
    number - 1,
    1
)

await player.save()

return sock.sendMessage(
    msg.key.remoteJid,
    {
        text:

`💔 تم الطلاق

👸 ${wife?.name || 'وايفو'}`
}
)
}
    
    if (text === '.الترتيب') {

if (!isOwner(msg)) {
        return sock.sendMessage(
            msg.key.remoteJid,
            { text: '❌ هذا الأمر للمطور فقط' }
        )
    }
        
let metadata

try {

    metadata =
        await sock.groupMetadata(
            msg.key.remoteJid
        )

} catch (e) {

    console.log(
        'groupMetadata error:',
        e
    )

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '❌ تعذر جلب بيانات المجموعة'
        }
    )
}

const participants =
    metadata.participants.map(
        p => p.id
    )

const players =
    await Player.find({
        userId: {
            $in: participants
        }
    })

const ranking = players.map(player => {

    return {

        userId: player.userId,

        power: getPlayerPower(player)

    }

})

ranking.sort(
    (a, b) =>
        b.power - a.power
)

const top15 =
    ranking.slice(0, 15)

let textRank =

`🏆 ═════〔 ترتيب القوة 〕═════ 🏆

`

top15.forEach((p, i) => {

    const rank =
        i === 0 ? '🥇' :
        i === 1 ? '🥈' :
        i === 2 ? '🥉' :
        `${i + 1}️⃣`

    textRank +=

`${rank} @${p.userId.split('@')[0]}
⚡ ${p.power.toLocaleString()}

`
})

textRank +=

`━━━━━━━━━━━━━━

👑 يعتمد الترتيب على
مجموع قوة جميع الشخصيات`

await sock.sendMessage(
    msg.key.remoteJid,
    {
        text: textRank,
        mentions: top15.map(
            p => p.userId
        )
    }
)

}
    if (text === ".card") {

    const buffer =
    await generateCard(1)

    if (!buffer) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: "❌ لم يتم العثور على الشخصية"
            }
        )
    }

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            image: buffer,
            caption: "🎴 Cid Kagenou"
        }
    )
    }


if (text === '.جوائز_الترتيب') {

    if (!isOwner(msg)) {
        return sock.sendMessage(
            msg.key.remoteJid,
            { text: '❌ هذا الأمر للمطور فقط' }
        )
    }

    await distributeRankingRewards(
        sock,
        msg.key.remoteJid
    )
}

    if (text.startsWith('.تبادل')) {

    const target =
        msg.message?.extendedTextMessage
            ?.contextInfo
            ?.mentionedJid?.[0]

    if (!target) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ منشن اللاعب الذي تريد التبادل معه'
            }
        )
    }

    if (target === userId) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ لا يمكنك التبادل مع نفسك'
            }
        )
    }

    const existing =
    await WaifuTrade.findOne({
        $or: [
            { user1: userId },
            { user2: userId },
            { user1: target },
            { user2: target }
        ]
    })

    if (existing) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ أحد اللاعبين لديه تبادل مفتوح بالفعل'
            }
        )
    }

    await WaifuTrade.create({

        user1: sender,
        user2: target

    })

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`🤝 تم إنشاء طلب تبادل

👤 الطرف الأول:
${sender.split('@')[0]}

👤 الطرف الثاني:
${target.split('@')[0]}

للإكمال اكتب:

.قبول`
        }
    )
}

    if (text.startsWith('.كاكيرا ')) {

    const trade =
    await WaifuTrade.findOne({
        $or: [
            { user1: userId },
            { user2: userId }
        ]
    })

    if (!trade) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ أنت لست داخل تبادل'
            }
        )
    }

    const amount =
        parseInt(
            text.split(' ')[1]
        )

    if (
        isNaN(amount) ||
        amount <= 0
    ) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ مبلغ غير صالح'
            }
        )
    }

    const player =
        await WaifuPlayer.findOne({
            userId: sender
        })

    if (!player) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ اللاعب غير موجود'
            }
        )
    }

    if (player.kakera < amount) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    `❌ لا تملك ${amount} كاكيرا`
            }
        )
    }

    if (trade.user1 === sender) {

        trade.kakera1 = amount
        trade.ready1 = false

    } else {

        trade.kakera2 = amount
        trade.ready2 = false
    }

    await trade.save()

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                `💎 تم إضافة ${amount} كاكيرا إلى التبادل`
        }
    )
}
if (text === '.اقبل') {

    const trade =
        await WaifuTrade.findOne({
            user2: userId
        })

    if (!trade) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ لا يوجد طلب تبادل بانتظارك'
            }
        )
    }

    trade.accepted = true

    await trade.save()

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`✅ تم قبول التبادل

الآن كل لاعب يختار الوايفو التي يريد عرضها:

.اعرض رقم_الوايفو

مثال:
.اعرض 3`
        }
    )
}

if (text === '.update waifus images') {

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: '⏳ بدأ تحديث الصور...'
        }
    )

    const updated =
        await updateAnimeImages(319)

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`✅ تم الانتهاء

🖼️ الصور المحدثة: ${updated}`
        }
    )
}
    
    

if (text === '.رول') {

    const sender =
        msg.key.participant ||
        msg.key.remoteJid

    const waifus =
    await Waifu.find({
        image: {
            $nin: [null, '']
        }
    })
    if (!waifus.length) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا توجد شخصيات.'
            }
        )
    }

    const waifu =
        waifus[
            Math.floor(
                Math.random() *
                waifus.length
            )
        ]

    lastRolls.set(
        sender,
        waifu._id.toString()
    )

    if (!waifu.image) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
`🎲 سحبت وايفو جديدة!

👸 ${waifu.name}

📺 ${waifu.anime}

⭐ ${waifu.rarity}

💎 القيمة: ${waifu.value}

⚠️ لا توجد صورة لهذه الوايفو`
            }
        )
    }

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: waifu.image
            },

            caption:
`🎲 سحبت وايفو جديدة!

👸 ${waifu.name}

📺 ${waifu.anime}

⭐ ${waifu.rarity}

💎 القيمة: ${waifu.value}`
        }
    )
}

    if (text === '.مطالبة') {

    const waifuId =
        lastRolls.get(userId)

    if (!waifuId) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ اسحب وايفو أولاً'
            }
        )
    }

    const waifu =
        await Waifu.findById(
            waifuId
        )

    if (!waifu) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ لم يتم العثور على الوايفو'
            }
        )
    }

    if (waifu.claimedBy) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ هذه الوايفو مملوكة بالفعل'
            }
        )
    }

    waifu.claimedBy = userId
waifu.claimedAt = new Date()
waifu.claims += 1

await waifu.save()

lastRolls.delete(userId)

await sock.sendMessage(
    msg.key.remoteJid,
    {
        text:
`🎉 تمت المطالبة بنجاح

👸 ${waifu.name}
📺 ${waifu.anime}`
    }
)
}

    if (text === '.مجموعتي') {

const waifus =
    await Waifu.find({
        claimedBy: userId
    })

if (!waifus.length) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ لا تملك أي وايفو'
        }
    )
}

let message =

`📚 مجموعتك

━━━━━━━━━━━━

`

waifus.forEach(
    (waifu, index) => {

        message +=

`${index + 1}. ${waifu.name}
📺 ${waifu.anime}
⭐ ${waifu.rarity}

`
}
)

await sock.sendMessage(
    msg.key.remoteJid,
    {
        text: message
    }
)

}

    if (text.startsWith('.اعرض ')) {

const trade =
    await WaifuTrade.findOne({
        $or: [
            { user1: userId },
            { user2: userId }
        ]
    })

if (!trade) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ أنت لست داخل تبادل'
        }
    )
}

if (!trade.accepted) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ يجب قبول التبادل أولاً'
        }
    )
}

const number =
    parseInt(
        text.split(' ')[1]
    )

if (isNaN(number)) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ اختر رقمًا صحيحًا'
        }
    )
}

const waifus =
    await Waifu.find({
        claimedBy: userId
    })

const waifu =
    waifus[number - 1]

if (!waifu) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ رقم غير موجود'
        }
    )
}

if (trade.user1 === userId) {

    trade.waifu1 =
        waifu._id

    trade.ready1 = false

} else {

    trade.waifu2 =
        waifu._id

    trade.ready2 = false
}

await trade.save()

await sock.sendMessage(
    msg.key.remoteJid,
    {
        text:

`✅ تم عرض

👸 ${waifu.name}
📺 ${waifu.anime}

اكتب:
.جاهز`
}
)
}
    if (text === '.جاهز') {

const trade =
    await WaifuTrade.findOne({
        $or: [
            { user1: userId },
            { user2: userId }
        ]
    })

if (!trade) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ أنت لست داخل تبادل'
        }
    )
}

if (!trade.accepted) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ لم يتم قبول التبادل بعد'
        }
    )
}
if (trade.user1 === userId) {

    if (!trade.waifu1) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ اعرض وايفو أولاً'
            }
        )
    }

    trade.ready1 = true

} else {

    if (!trade.waifu2) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ اعرض وايفو أولاً'
            }
        )
    }

    trade.ready2 = true
}

await trade.save()

await sock.sendMessage(
    msg.key.remoteJid,
    {
        text:

`✅ تم تسجيل جاهزيتك

👤 الطرف الأول:
${trade.ready1 ? '✅' : '❌'}

👤 الطرف الثاني:
${trade.ready2 ? '✅' : '❌'}

إذا أصبح الطرفان جاهزين استخدم:
.تأكيد`
}
)
}

if (text === '.تأكيد') {

const trade =
    await WaifuTrade.findOne({
        $or: [
            { user1: userId },
            { user2: userId }
        ]
    })

if (!trade) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ لا يوجد تبادل نشط'
        }
    )
}

if (!trade.accepted) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ لم يتم قبول التبادل بعد'
        }
    )
}

if (
    !trade.ready1 ||
    !trade.ready2
) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ يجب أن يكون الطرفان جاهزين'
        }
    )
}

const waifu1 =
await Waifu.findById(
trade.waifu1
)

const waifu2 =
await Waifu.findById(
trade.waifu2
)

if (!waifu1 || !waifu2) {

return sock.sendMessage(
    msg.key.remoteJid,
    {
        text:
            '❌ تعذر العثور على الوايفوهات'
    }
)

}

const player1 =
await WaifuPlayer.findOne({
userId: trade.user1
})

const player2 =
await WaifuPlayer.findOne({
userId: trade.user2
})

if (!player1 || !player2) {

return sock.sendMessage(
    msg.key.remoteJid,
    {
        text:
            '❌ تعذر العثور على اللاعبين'
    }
)

}

if (
player1.kakera < trade.kakera1 ||
player2.kakera < trade.kakera2
) {

return sock.sendMessage(
    msg.key.remoteJid,
    {
        text:
            '❌ أحد اللاعبين لا يملك الكاكيرا المطلوبة'
    }
)

}

waifu1.claimedBy =
trade.user2

waifu2.claimedBy =
trade.user1

player1.kakera -=
trade.kakera1

player2.kakera +=
trade.kakera1

player2.kakera -=
trade.kakera2

player1.kakera +=
trade.kakera2

await waifu1.save()
await waifu2.save()

await player1.save()
await player2.save()

await WaifuTrade.deleteOne({
_id: trade._id
})

await sock.sendMessage(
msg.key.remoteJid,
{
text:
`🎉 تم التبادل بنجاح

💎 كاكيرا الطرف الأول:
${trade.kakera1}

💎 كاكيرا الطرف الثاني:
${trade.kakera2}

✅ تم نقل الوايفوهات والكاكيرا`
}
)

waifu1.claimedBy =
    trade.user2

waifu2.claimedBy =
    trade.user1

await waifu1.save()
await waifu2.save()

await WaifuTrade.deleteOne({
    _id: trade._id
})

await sock.sendMessage(
    msg.key.remoteJid,
    {
        text:

`🎉 تم التبادل بنجاح

👤 ${trade.user1.split('@')[0]}
⇄
👤 ${trade.user2.split('@')[0]}

تم نقل الملكية بنجاح`
}
)
}

    if (text === '.الغاء') {

    const trade =
        await WaifuTrade.findOne({
            $or: [
                { user1: userId },
                { user2: userId }
            ]
        })

    if (!trade) return

    await WaifuTrade.deleteOne({
        _id: trade._id
    })

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ تم إلغاء التبادل'
        }
    )
}

    if (text.startsWith('.اعرضوايفو ')) {

    const userId =
        msg.key.participant ||
        msg.key.remoteJid

    const number =
        parseInt(
            text.split(' ')[1]
        )

    if (isNaN(number)) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ مثال:\n.اعرضوايفو 1'
            }
        )
    }

    const waifus =
        await Waifu.find({
            claimedBy: userId
        })

    const waifu =
        waifus[number - 1]

    if (!waifu) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ لا توجد وايفو بهذا الرقم'
            }
        )
    }

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: waifu.image
            },

            caption:
`👸 ${waifu.name}

📺 ${waifu.anime}

⭐ ${waifu.rarity}

💎 القيمة: ${waifu.value}`
        }
    )
}
    
    if (text.startsWith('.تحدي')) {

    const target =
        msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    if (!target) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ مثال: .تحدي @user'
        })
    }

    if (target === userId) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ لا يمكنك تحدي نفسك'
        })
    }

    const targetPlayer =
        await Player.findOne({ userId: target })

    if (!targetPlayer) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ اللاعب لا يملك حساباً'
        })
    }

    const oldFight = await PvP.findOne({
        active: true,
        $or: [
            { player1: userId },
            { player2: userId },
            { player1: target },
            { player2: target }
        ]
    })

    if (oldFight) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ أحد اللاعبين داخل قتال بالفعل'
        })
    }

    const player1Data = await Player.findOne({ userId })
const player2Data = await Player.findOne({ userId: target })

if (!player1Data || !player2Data) {
    return safeSend(msg.key.remoteJid, {
        text: '❌ خطأ في بيانات اللاعبين'
    })
}

function getGroupHP(player) {

    if (!player.characters?.length)
        return 1000

    const totalPower =
        player.characters.reduce(
            (total, char) =>
                total + Number(char.power || 0),
            0
        )

    return Math.floor(totalPower / 3)
}

const hp1 = getGroupHP(player1Data)
const hp2 = getGroupHP(player2Data)

await PvP.create({
    player1: userId,
    player2: target,

    player1Turns: 0,
    player2Turns: 0,

    turn: target,
    active: false,

    hp1,
    hp2,

    turnCount: 0,

    skillTurn1: -99,
    skillTurn2: -99,

    ultimateTurn1: -99,
    ultimateTurn2: -99
})

    return safeSend(msg.key.remoteJid, {
        text:
`⚔️ تحدي جديد

@${target.split('@')[0]}

تمت دعوتك للقتال

اكتب:

.قبول

أو

.رفض`,
        mentions: [target]
    })
    }
    if (text === '.رفض') {

    const fight = await PvP.findOne({
        player2: userId,
        active: false
    })

    if (!fight) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ لا يوجد تحدي بانتظار رفضه'
        })
    }

    await PvP.deleteOne({
        _id: fight._id
    })

    return safeSend(msg.key.remoteJid, {
        text: 'تم رفض التحدي'
    })
    }

    
if (text === '.ريست_تحدي') {

    if (!isOwner(msg)) {
        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ للمطور فقط'
            }
        )
    }

    const result =
        await PvP.deleteMany({})

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`✅ تم تصفير جميع التحديات

🗑️ المحذوف:
${result.deletedCount}`
        }
    )
}
    

    if (text === '.قبول') {

    const fight = await PvP.findOne({
        player2: userId,
        active: false
    })

    if (!fight) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ لا يوجد تحدي بانتظار قبولك'
        })
    }

    const player1Data =
        await Player.findOne({ userId: fight.player1 })

    const player2Data =
        await Player.findOne({ userId: fight.player2 })
const stats1 =
    getTotalStats(player1Data)

const stats2 =
    getTotalStats(player2Data)

fight.shield1 = stats1.shield
fight.shield2 = stats2.shield
    const team1 = [...player1Data.characters]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)

const team2 = [...player2Data.characters]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)

console.log("team1 before save =", team1)
console.log("team2 before save =", team2)

fight.team1 = team1
fight.team2 = team2

console.log("fight.team1 before save =", fight.team1)
console.log("fight.team2 before save =", fight.team2)

fight.active = true

const firstTurn =
    Math.random() < 0.5
        ? fight.player1
        : fight.player2

fight.turn = firstTurn

fight.player1Turns = 0
fight.player2Turns = 0

fight.skillTurn1 = -99
fight.skillTurn2 = -99

fight.ultimateTurn1 = -99
fight.ultimateTurn2 = -99

await fight.save()

console.log("saved")

const testFight = await PvP.findById(fight._id)

console.log("DB team1 =", testFight.team1)
console.log("DB team2 =", testFight.team2)

const checkFight = await PvP.findById(fight._id)

console.log("fight =", JSON.stringify(checkFight))
        
const team1Names = team1
    .map(c => `• ${c.name}`)
    .join('\n')

const team2Names = team2
    .map(c => `• ${c.name}`)
    .join('\n')
    
        return safeSend(msg.key.remoteJid, {
    text:
`⚔️ بدأ القتال!

👤 فريق اللاعب الأول:
${team1Names}

👤 فريق اللاعب الثاني:
${team2Names}

❤️ اللاعب الأول: ${fight.hp1}
❤️ اللاعب الثاني: ${fight.hp2}

🎯 الدور الآن:

@${firstTurn.split('@')[0]}

الأوامر المتاحة:

.هجوم الخصم
.مهارة
.ألتميت`,
    mentions: [
        fight.player1,
        fight.player2,
        firstTurn
    ]
})
    }

if (text === '.مهارة') {

const fight = await PvP.findOne({  
    active: true,  
    $or: [  
        { player1: userId },  
        { player2: userId }  
    ]  
})  

if (!fight) {  
    return safeSend(msg.key.remoteJid, {  
        text: '❌ أنت لست داخل قتال'  
    })  
}  

if (fight.turn !== userId) {  
return safeSend(msg.key.remoteJid, {  
    text: '❌ ليس دورك'  
})

}

let attacker

if (userId === fight.player1) {

attacker =  
    fight.team1[  
        Math.floor(  
            Math.random() *  
            fight.team1.length  
        )  
    ]

} else {

attacker =  
    fight.team2[  
        Math.floor(  
            Math.random() *  
            fight.team2.length  
        )  
    ]

}
const playerData =
await Player.findOne({ userId })
const currentTurns =
    userId === fight.player1
        ? (fight.player1Turns || 0)
        : (fight.player2Turns || 0)
    const lastSkill =
    userId === fight.player1
        ? (fight.skillTurn1 ?? -99)
        : (fight.skillTurn2 ?? -99)

if (
    lastSkill >= 0 &&
    currentTurns - lastSkill < 2
) {
    return safeSend(
        msg.key.remoteJid,
        {
            text:
`⏳ لا يمكنك استخدام المهارة الآن

تحتاج انتظار جولتين`
        }
    )
}
    if (userId === fight.player1) {
    fight.skillTurn1 = fight.player1Turns || 0
} else {
    fight.skillTurn2 = fight.player2Turns || 0
}

const attackerStats =
getTotalStats(playerData)

const opponentData =
await Player.findOne({
userId:



    
fight.player1 === userId
? fight.player2
: fight.player1
})

const opponentStats =
getTotalStats(opponentData)

attackerStats.power =
attacker.power

attackerStats.level =
playerData.level

opponentStats.level =
opponentData.level

const result =
calculateDamageAdvanced(
attackerStats,
opponentStats
)

let damage = result.damage

damage = Math.floor(
damage * 1.5
)

const isCrit = result.crit

const dodged = result.dodge

let critMessage = ''

if (isCrit) {
critMessage =
'\n💢 ضربة كريتيكال!'
}
if (dodged) {

fight.turn =
userId === fight.player1
    ? fight.player2
    : fight.player1

fight.lastMove = new Date()

fight.turnCount = (fight.turnCount || 0) + 1

await fight.save()

return safeSend(msg.key.remoteJid, {  
    text:

`💨 تم تفادي المهارة!

🎯 الدور الآن:
@${fight.turn.split('@')[0]}`,
mentions: [fight.turn]
})
}
let absorbed = 0
if (userId === fight.player1) {

if (fight.shield2 > 0) {  

    absorbed = Math.min(  
        damage,  
        fight.shield2  
    )  

    fight.shield2 -= absorbed  
    damage -= absorbed  
}

} else {

if (fight.shield1 > 0) {  

    absorbed = Math.min(  
        damage,  
        fight.shield1  
    )  

    fight.shield1 -= absorbed  
    damage -= absorbed  
}

}

if (userId === fight.player1) {

fight.hp2 -= damage

} else {

fight.hp1 -= damage

}

let heal = 0

if (
attackerStats.lifesteal > 0 &&
damage > 0
) {

heal = Math.floor(  
    damage *  
    attackerStats.lifesteal /  
    100  
)

if (userId === fight.player1) {

fight.hp1 += heal  

} else {  

    fight.hp2 += heal  
}

}

fight.turn =  
userId === fight.player1  
    ? fight.player2  
    : fight.player1

fight.lastMove = new Date()

if (fight.hp1 <= 0 || fight.hp2 <= 0) {  

const winner =  
    fight.hp1 > 0  
        ? fight.player1  
        : fight.player2  

const loser =  
    winner === fight.player1  
        ? fight.player2  
        : fight.player1  

const winnerData =  
    await Player.findOne({  
        userId: winner  
    })  

const loserData =  
    await Player.findOne({  
        userId: loser  
    })  

const moneyReward =  
    Math.floor(  
        500 + Math.random() * 500  
    )  

const xpReward =  
    Math.floor(  
        200 + Math.random() * 300  
    )  

winnerData.money += moneyReward  
winnerData.xp += xpReward  

let boxReward = ''  

const randomBox = Math.random()  

if (randomBox < 0.60) {  

    winnerData.boxes.basic += 1  
    boxReward = '📦 صندوق عادي'

} else if (randomBox < 0.90) {

winnerData.boxes.rare += 1  
    boxReward = '🎁 صندوق نادر'  

} else {  

    winnerData.boxes.epic += 1  
    boxReward = '✨ صندوق ملحمي'  
}  

const oldRank = winnerData.rank

winnerData.wins += 1
winnerData.mmr += 20

winnerData.rank = getRank(winnerData.mmr)

let rankUpMessage = ''

if (oldRank !== winnerData.rank) {

    rankUpMessage =
`\n🎉 ترقية رتبة!

@${winner.split('@')[0]}

${oldRank}
⬇️
${winnerData.rank}`
}

loserData.losses += 1  

loserData.mmr =  
    Math.max(  
        0,  
        loserData.mmr - 10  
    )  

winnerData.rank =  
    getRank(winnerData.mmr)  

loserData.rank =  
    getRank(loserData.mmr)  

await winnerData.save()  
await loserData.save()  

await PvP.deleteOne({  
    _id: fight._id  
})  

return safeSend(msg.key.remoteJid, {  
    text:

`🏆 انتهى القتال

👑 الفائز:
@${winner.split('@')[0]}

💰 الفلوس:
+${moneyReward}

⭐ الخبرة:
+${xpReward}

🏅 MMR:
+20

${boxReward}

${rankUpMessage}`,
mentions: [winner]
})
}
if (userId === fight.player1) {
    fight.skillTurn1 = fight.player1Turns || 0
} else {
    fight.skillTurn2 = fight.player2Turns || 0
}
await fight.save()

playerData.skillCooldown = Date.now() + 10000
await playerData.save()

let shieldMessage = ''

if (absorbed > 0) {
    shieldMessage = `\n🛡️ امتص الدرع: ${absorbed}`
}

let healMessage = ''

if (heal > 0) {
    healMessage = `\n❤️‍🩹 استعاد: ${heal}`
}

return safeSend(msg.key.remoteJid, {
    text:
`✨ ${attacker.name} استخدم مهارة!

💥 الضرر: ${damage}${critMessage}${shieldMessage}${healMessage}

❤️ ${fight.hp1}
💙 ${fight.hp2}

🛡️ ${fight.shield1 || 0}
🛡️ ${fight.shield2 || 0}

🎯 الدور الآن:
@${fight.turn.split('@')[0]}`,
    mentions: [fight.turn]
})
}

if (text === '.الدم') {

    const players = await Player.find({
        bossHits: { $gt: 0 }
    })

    if (!players.length) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد مشاركون حالياً'
            }
        )
    }

    players.sort(
        (a, b) =>
            (b.bossHp || 0) -
            (a.bossHp || 0)
    )

    const mentions =
        players.map(
            p => p.userId
        )

    const hpList =
        players.map((p, i) => {

            const hp =
                p.bossHp || 0

            const maxHp =
                p.bossMaxHp || 0

            const status =
                p.bossDead
                ? '💀 ميت'
                : '❤️ حي'

            return `${i + 1}️⃣ @${p.userId.split('@')[0]}

${status}
❤️ ${hp}/${maxHp}`
        }).join('\n\n━━━━━━━━━━━━━━\n\n')

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`🏥 ═════〔 حالة المقاتلين 〕═════ 🏥

📊 الترتيب حسب HP الحالي

━━━━━━━━━━━━━━

${hpList}

━━━━━━━━━━━━━━

⚔️ المشاركون: ${players.length}`,
            mentions
        }
    )
}

if (text === '.ألتميت') {
const fight = await PvP.findOne({  
    active: true,  
    $or: [  
        { player1: userId },  
        { player2: userId }  
    ]  
})  

if (!fight) {  
    return safeSend(msg.key.remoteJid, {  
        text: '❌ أنت لست داخل قتال'  
    })  
}  

if (fight.turn !== userId) {  
return safeSend(msg.key.remoteJid, {  
    text: '❌ ليس دورك'  
})

}
    let dotDamage = 0
    if (fight.burn.player1 > 0 && userId === fight.player1) {
    dotDamage += 150
    fight.burn.player1--
}

if (fight.burn.player2 > 0 && userId === fight.player2) {
    dotDamage += 150
    fight.burn.player2--
}

if (fight.poison.player1 > 0 && userId === fight.player1) {
    dotDamage += 100
    fight.poison.player1--
}

if (fight.poison.player2 > 0 && userId === fight.player2) {
    dotDamage += 100
    fight.poison.player2--
}

let attacker

if (userId === fight.player1) {

attacker =  
    fight.team1[  
        Math.floor(  
            Math.random() *  
            fight.team1.length  
        )  
    ]

} else {

attacker =  
    fight.team2[  
        Math.floor(  
            Math.random() *  
            fight.team2.length  
        )  
    ]

}
    const currentTurns =
    userId === fight.player1
        ? (fight.player1Turns || 0)
        : (fight.player2Turns || 0)
const lastUltimate =
    userId === fight.player1
        ? (fight.ultimateTurn1 ?? -99)
        : (fight.ultimateTurn2 ?? -99)

    console.log(
    'ULT CHECK',
    currentTurns,
    lastUltimate
)
if (
    lastUltimate >= 0 &&
    currentTurns - lastUltimate < 5
) {
    return safeSend(
        msg.key.remoteJid,
        {
            text:
`⏳ لا يمكنك استخدام الألتميت الآن

تحتاج انتظار 5 جولات`
        }
    )
}
    if (userId === fight.player1) {
    fight.ultimateTurn1 = fight.player1Turns || 0
} else {
    fight.ultimateTurn2 = fight.player2Turns || 0
}

const playerData =
    await Player.findOne({
        userId
    })

const attackerStats =
    getTotalStats(playerData)

const opponentData =
    await Player.findOne({
        userId:
            fight.player1 === userId
                ? fight.player2
                : fight.player1
    })

const opponentStats =
getTotalStats(opponentData)

attackerStats.power =
attacker.power

attackerStats.level =
playerData.level

opponentStats.level =
opponentData.level

const result =
calculateDamageAdvanced(
attackerStats,
opponentStats
)

let damage = result.damage
    damage += dotDamage

damage = Math.floor(
    damage * 2.5
)

const isCrit = result.crit

const dodged = result.dodge

let critMessage = ''

if (isCrit) {
critMessage =
'\n💢 ضربة كريتيكال!'
}
if (dodged) {

fight.turn =
    userId === fight.player1
        ? fight.player2
        : fight.player1

fight.lastMove = new Date()

fight.turnCount = (fight.turnCount || 0) + 1

await fight.save()

return safeSend(msg.key.remoteJid, {  
    text:

`💨 تم تفادي المهارة!

🎯 الدور الآن:
@${fight.turn.split('@')[0]}`,
mentions: [fight.turn]
})
}
let absorbed = 0
if (userId === fight.player1) {

if (fight.shield2 > 0) {  

    absorbed = Math.min(  
        damage,  
        fight.shield2  
    )  

    fight.shield2 -= absorbed  
    damage -= absorbed  
}

} else {

if (fight.shield1 > 0) {  

    absorbed = Math.min(  
        damage,  
        fight.shield1  
    )  

    fight.shield1 -= absorbed  
    damage -= absorbed  
}

}

if (userId === fight.player1) {

fight.hp2 -= damage

} else {

fight.hp1 -= damage

}

let heal = 0

if (
attackerStats.lifesteal > 0 &&
damage > 0
) {

heal = Math.floor(  
    damage *  
    attackerStats.lifesteal /  
    100  
)

if (userId === fight.player1) {

fight.hp1 += heal  

} else {  

    fight.hp2 += heal  
}

}

fight.turn =
userId === fight.player1
    ? fight.player2
    : fight.player1

fight.lastMove = new Date()

if (userId === fight.player1) {
    fight.player1Turns =
        (fight.player1Turns || 0) + 1

    console.log(
        'P1 TURNS =',
        fight.player1Turns
    )

} else {

    fight.player2Turns =
        (fight.player2Turns || 0) + 1

    console.log(
        'P2 TURNS =',
        fight.player2Turns
    )
}

if (fight.hp1 <= 0 || fight.hp2 <= 0) {

const winner =  
    fight.hp1 > 0  
        ? fight.player1  
        : fight.player2  

const loser =  
    winner === fight.player1  
        ? fight.player2  
        : fight.player1  

const winnerData =  
    await Player.findOne({  
        userId: winner  
    })  

const loserData =  
    await Player.findOne({  
        userId: loser  
    })  

const moneyReward =  
    Math.floor(  
        500 + Math.random() * 500  
    )  

const xpReward =  
    Math.floor(  
        200 + Math.random() * 300  
    )  

winnerData.money += moneyReward  
winnerData.xp += xpReward  

let boxReward = ''  

const randomBox = Math.random()  

if (randomBox < 0.60) {  

    winnerData.boxes.basic += 1  
    boxReward = '📦 صندوق عادي'

} else if (randomBox < 0.90) {

winnerData.boxes.rare += 1  
    boxReward = '🎁 صندوق نادر'  

} else {  

    winnerData.boxes.epic += 1  
    boxReward = '✨ صندوق ملحمي'  
}  

const oldRank = winnerData.rank

winnerData.wins += 1
winnerData.mmr += 20

winnerData.rank = getRank(winnerData.mmr)

let rankUpMessage = ''

if (oldRank !== winnerData.rank) {

    rankUpMessage =
`\n🎉 ترقية رتبة!

@${winner.split('@')[0]}

${oldRank}
⬇️
${winnerData.rank}`
}

loserData.losses += 1  

loserData.mmr =  
    Math.max(  
        0,  
        loserData.mmr - 10  
    )  

winnerData.rank =  
    getRank(winnerData.mmr)  

loserData.rank =  
    getRank(loserData.mmr)  

await winnerData.save()  
await loserData.save()  

await PvP.deleteOne({  
    _id: fight._id  
})  

return safeSend(msg.key.remoteJid, {  
    text:

`🏆 انتهى القتال

👑 الفائز:
@${winner.split('@')[0]}

💰 الفلوس:
+${moneyReward}

⭐ الخبرة:
+${xpReward}

🏅 MMR:
+20

${boxReward}

${rankUpMessage}`,
mentions: [winner]
})
}



await fight.save()

playerData.ultimateCooldown = Date.now() + 30000
await playerData.save()

let shieldMessage = ''

if (absorbed > 0) {
    shieldMessage = `\n🛡️ امتص الدرع: ${absorbed}`
}

let healMessage = ''

if (heal > 0) {
    healMessage = `\n❤️‍🩹 استعاد: ${heal}`
}

return safeSend(msg.key.remoteJid, {
    text:
`🌌 ${attacker.name} أطلق الألتميت!

💥 الضرر: ${damage}${critMessage}${shieldMessage}${healMessage}

❤️ ${fight.hp1}
💙 ${fight.hp2}

🛡️ ${fight.shield1 || 0}
🛡️ ${fight.shield2 || 0}

🎯 الدور الآن:
@${fight.turn.split('@')[0]}`,
    mentions: [fight.turn]
})
}


        if (text.startsWith('.بدل ')) {

    const target =
        msg.message?.extendedTextMessage
            ?.contextInfo
            ?.mentionedJid?.[0]

    if (!target) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ منشن اللاعب'
            }
        )
    }

    const args =
        text.split(' ')

    const myNumber =
        parseInt(args[1])

    const hisNumber =
        parseInt(args[2])

    if (
        isNaN(myNumber) ||
        isNaN(hisNumber)
    ) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ مثال:\n.بدل 1 30 @اللاعب'
            }
        )
    }

    const me =
        await Player.findOne({
            userId
        })

    const other =
        await Player.findOne({
            userId: target
        })

    if (!me) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ بياناتك غير موجودة'
            }
        )
    }

    if (!other) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ اللاعب غير موجود'
            }
        )
    }

    const myChar =
        me.characters[myNumber - 1]

    const hisChar =
        other.characters[hisNumber - 1]

    if (!myChar) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ شخصيتك غير موجودة'
            }
        )
    }

    if (!hisChar) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ شخصية اللاعب غير موجودة'
            }
        )
    }

    pendingSwaps.set(
        target,
        {
            from: userId,
            to: target,
            myNumber,
            hisNumber
        }
    )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`🔄 طلب تبديل

👤 @${userId.split('@')[0]}
🎁 ${myChar.name}

🔁 مقابل

👤 @${target.split('@')[0]}
🎁 ${hisChar.name}

اكتب:
.قبول_بدل

أو

.رفض_بدل`,
            mentions: [
                userId,
                target
            ]
        }
    )
}
        

if (text === '.قبول_بدل') {

    const request =
        pendingSwaps.get(userId)

    if (!request) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ لا يوجد طلب'
            }
        )
    }

    const player1 =
        await Player.findOne({
            userId: request.from
        })

    const player2 =
        await Player.findOne({
            userId: request.to
        })

    const char1 =
        player1.characters[
            request.myNumber - 1
        ]

    const char2 =
        player2.characters[
            request.hisNumber - 1
        ]

    if (!char1 || !char2) {

        pendingSwaps.delete(
            userId
        )

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '❌ إحدى الشخصيات غير موجودة'
            }
        )
    }

    player1.characters[
        request.myNumber - 1
    ] = char2

    player2.characters[
        request.hisNumber - 1
    ] = char1

    await player1.save()
    await player2.save()

    pendingSwaps.delete(
        userId
    )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`✅ تم التبديل بنجاح

${char1.name}
↔
${char2.name}`
        }
    )
}

    if (text === '.رفض_بدل') {

    const request =
        pendingSwaps.get(userId)

    if (!request) return

    pendingSwaps.delete(
        userId
    )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
                '❌ تم رفض التبديل'
        }
    )
    }
    
if (text === '.مساهمات') {

    const players =
        await Player.find({})
            .sort({ totalBossDamage: -1 })
            .limit(10)

    const me =
        await Player.findOne({ userId })

    let mentions = []

    let leaderboard =
`🏆 أفضل المقاتلين ضد جميع الزعماء

━━━━━━━━━━

`

    for (
        let i = 0;
        i < players.length;
        i++
    ) {

        const player =
            players[i]

        const medal =
            i === 0 ? '🥇' :
            i === 1 ? '🥈' :
            i === 2 ? '🥉' :
            `#${i + 1}`

        mentions.push(player.userId)

        leaderboard +=
`${medal}

👤 @${player.userId.split('@')[0]}

💥 ${(player.totalBossDamage || 0).toLocaleString()} ضرر

⚔️ ${(player.bossHits || 0).toLocaleString()} هجمة

━━━━━━━━━━

`
    }

    leaderboard +=
`📊 مساهمتك

👤 @${userId.split('@')[0]}

💥 ${(me?.totalBossDamage || 0).toLocaleString()} ضرر

⚔️ ${(me?.bossHits || 0).toLocaleString()} هجمة`

    mentions.push(userId)

    return safeSend(
        msg.key.remoteJid,
        {
            text: leaderboard,
            mentions
        }
    )
}

if (text === '.هجوم الخصم') {

    const fight = await PvP.findOne({
        active: true,
        $or: [
            { player1: userId },
            { player2: userId }
        ]
    })

    if (!fight) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ أنت لست داخل قتال'
        })
    }

    const now = Date.now()

    if (
        fight.lastMove &&
        now - new Date(fight.lastMove).getTime() >
        10 * 60 * 1000
    ) {

        await PvP.deleteOne({
            _id: fight._id
        })

        return safeSend(msg.key.remoteJid, {
            text: '⌛ انتهت المعركة بسبب الخمول'
        })
    }

    if (fight.turn !== userId) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ ليس دورك'
        })
    }
    
    let dotDamage = 0
    if (fight.burn.player1 > 0 && userId === fight.player1) {
    dotDamage += 150
    fight.burn.player1--
}

if (fight.burn.player2 > 0 && userId === fight.player2) {
    dotDamage += 150
    fight.burn.player2--
}

if (fight.poison.player1 > 0 && userId === fight.player1) {
    dotDamage += 100
    fight.poison.player1--
}

if (fight.poison.player2 > 0 && userId === fight.player2) {
    dotDamage += 100
    fight.poison.player2--
}
    console.log("fight.team1 =", fight.team1)
console.log("fight.team2 =", fight.team2)
console.log("fight =", JSON.stringify(fight))
if (
    !fight.team1 ||
    !fight.team2 ||
    !fight.team1.length ||
    !fight.team2.length
) {
    return safeSend(msg.key.remoteJid, {
        text: '❌ بيانات القتال تالفة، أعد إنشاء التحدي'
    })
}
    let attacker

    if (userId === fight.player1) {

        attacker =
            fight.team1[
                Math.floor(
                    Math.random() *
                    fight.team1.length
                )
            ]

    } else {

        attacker =
            fight.team2[
                Math.floor(
                    Math.random() *
                    fight.team2.length
                )
            ]
    }

    const playerData =
    await Player.findOne({ userId })

const attackerStats =
    getTotalStats(playerData)

const opponentData =
    await Player.findOne({
        userId:
            fight.player1 === userId
                ? fight.player2
                : fight.player1
    })

const opponentStats =
    getTotalStats(opponentData)

attackerStats.power =
    attacker.power

attackerStats.level =
    playerData.level

opponentStats.level =
    opponentData.level

const result =
    calculateDamageAdvanced(
        attackerStats,
        opponentStats
    )

let damage = result.damage
    damage += dotDamage

const isCrit = result.crit

const dodged = result.dodge
let critMessage = ''

if (isCrit) {
    critMessage =
        '\n💢 ضربة كريتيكال!'
}
    
    if (dodged) {

    fight.turn =
        userId === fight.player1
            ? fight.player2
            : fight.player1

    fight.lastMove = new Date()

    await fight.save()

    return safeSend(msg.key.remoteJid, {
        text:
`💨 تم تفادي الهجوم!

🎯 الدور الآن:
@${fight.turn.split('@')[0]}`,
        mentions: [fight.turn]
    })
    }


    // Accuracy
    if (
        attackerStats.accuracy > 0 &&
        Math.random() * 100 >
        attackerStats.accuracy
    ) {

        fight.turn =
            userId === fight.player1
                ? fight.player2
                : fight.player1

        fight.lastMove = new Date()

        await fight.save()

        return safeSend(msg.key.remoteJid, {
            text:
`🎯 أخطأت الضربة

🎯 الدور الآن:
@${fight.turn.split('@')[0]}`,
            mentions: [fight.turn]
        })
    }

    // Dodge
    if (
        opponentStats.dodge > 0 &&
        Math.random() * 100 <
        opponentStats.dodge
    ) {

        fight.turn =
            userId === fight.player1
                ? fight.player2
                : fight.player1

        fight.lastMove = new Date()

        await fight.save()

        return safeSend(msg.key.remoteJid, {
            text:
`🏃 تم تفادي الهجوم

🎯 الدور الآن:
@${fight.turn.split('@')[0]}`,
            mentions: [fight.turn]
        })
    }

    

    let critical = false

    if (
        attackerStats.critRate > 0 &&
        Math.random() * 100 <
        attackerStats.critRate
    ) {

        critical = true

        damage = Math.floor(
            damage *
            (
                1 +
                attackerStats.critDamage / 100
            )
        )
    }

    // Shield
    let absorbed = 0

if (userId === fight.player1) {

    if (fight.shield2 > 0) {

        absorbed = Math.min(
            damage,
            fight.shield2
        )

        fight.shield2 -= absorbed
        damage -= absorbed
    }

} else {

    if (fight.shield1 > 0) {

        absorbed = Math.min(
            damage,
            fight.shield1
        )

        fight.shield1 -= absorbed
        damage -= absorbed
    }
}
    if (userId === fight.player1) {

        fight.hp2 -= damage

    } else {

        fight.hp1 -= damage
    }
    fight.hp1 = Math.max(0, fight.hp1)
fight.hp2 = Math.max(0, fight.hp2)

    // Lifesteal
    let heal = 0

    if (
        attackerStats.lifesteal > 0 &&
        damage > 0
    ) {

        heal = Math.floor(
            damage *
            attackerStats.lifesteal /
            100
        )

        if (userId === fight.player1) {

            fight.hp1 += heal

        } else {

            fight.hp2 += heal
        }
    }

    fight.turn =
    userId === fight.player1
        ? fight.player2
        : fight.player1

fight.lastMove = new Date()

fight.turnCount = (fight.turnCount || 0) + 1

if (userId === fight.player1) {
    fight.player1Turns =
        (fight.player1Turns || 0) + 1
} else {
    fight.player2Turns =
        (fight.player2Turns || 0) + 1
}

if (fight.hp1 <= 0 || fight.hp2 <= 0) {

    const winner =
        fight.hp1 > 0
            ? fight.player1
            : fight.player2

const loser =
    winner === fight.player1
        ? fight.player2
        : fight.player1

const winnerData =
    await Player.findOne({
        userId: winner
    })

const loserData =
    await Player.findOne({
        userId: loser
    })

const moneyReward =
    Math.floor(
        500 + Math.random() * 500
    )

const xpReward =
    Math.floor(
        200 + Math.random() * 300
    )

winnerData.money += moneyReward
winnerData.xp += xpReward

const oldRank = winnerData.rank

winnerData.wins += 1
winnerData.mmr += 20

winnerData.rank = getRank(winnerData.mmr)

let rankUpMessage = ''

if (oldRank !== winnerData.rank) {

    rankUpMessage =
`\n🎉 ترقية رتبة!

@${winner.split('@')[0]}

${oldRank}
⬇️
${winnerData.rank}`
}
        let boxReward = ''

const randomBox = Math.random()

if (randomBox < 0.60) {

    winnerData.boxes.basic += 1
    boxReward = '📦 صندوق عادي'

} else if (randomBox < 0.90) {

    winnerData.boxes.rare += 1
    boxReward = '🎁 صندوق نادر'

} else {

    winnerData.boxes.epic += 1
    boxReward = '✨ صندوق ملحمي'
}

loserData.losses += 1

loserData.mmr =
    Math.max(
        0,
        loserData.mmr - 10
    )

winnerData.rank =
    getRank(winnerData.mmr)

loserData.rank =
    getRank(loserData.mmr)

await winnerData.save()
await loserData.save()

await PvP.deleteOne({
    _id: fight._id
})

return safeSend(msg.key.remoteJid, {
    text:
`🏆 انتهى القتال

👑 الفائز:
@${winner.split('@')[0]}

💰 الفلوس:
+${moneyReward}

⭐ الخبرة:
+${xpReward}

🏅 MMR:
+20

${boxReward}

${rankUpMessage}`,
mentions: [winner]
})
    }

    await fight.save()

    return safeSend(msg.key.remoteJid, {
        text:
`⚔️ ${attacker.name} هاجم

${critical ? '💥 ضربة حرجة!' : ''}

💥 الضرر: ${damage}
${critMessage}
${absorbed > 0 ? `🛡️ امتص الدرع: ${absorbed}\n` : ''}${heal > 0 ? `❤️‍🩹 امتصاص حياة: +${heal}\n` : ''}

❤️ ${fight.hp1}
💙 ${fight.hp2}

🛡️ ${fight.shield1}
🛡️ ${fight.shield2}

🎯 الدور الآن:
@${fight.turn.split('@')[0]}`,
        mentions: [fight.turn]
    })
}

if (text === '.رانكي') {

    const player =
    await Player.findOne({ userId })

    if (!player) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ ليس لديك حساب'
        })
    }

    return safeSend(msg.key.remoteJid, {
        text:
`🏅 الرتبة الحالية

👤 @${userId.split('@')[0]}

📊 MMR: ${player.mmr}

🎖️ الرتبة:
${player.rank}`,
        mentions: [userId]
    })
}
    
        if (text === '.البرج') {

    let player =
        await Player.findOne({ userId })

    if (!player) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا تملك حساباً'
            }
        )
    }

let needSave = false

if (player.attackBonus === undefined) {
    player.attackBonus = 0
    needSave = true
}

if (player.defenseBonus === undefined) {
    player.defenseBonus = 0
    needSave = true
}

if (player.hpBonus === undefined) {
    player.hpBonus = 0
    needSave = true
}

if (player.speedBonus === undefined) {
    player.speedBonus = 0
    needSave = true
}

if (needSave) await player.save()
            
    if (player.towerCompleted) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `👑 لقد أكملت برج الأبطال

🏆 الألقاب:

${player.titles?.length
? player.titles.join('\n')
: 'لا يوجد'}

🏰 الطابق: 30/30

⚔️ هجوم إضافي: ${player.attackBonus || 0}%
🛡️ دفاع إضافي: ${player.defenseBonus || 0}%
❤️ صحة إضافية: ${player.hpBonus || 0}%
⚡ سرعة إضافية: ${player.speedBonus || 0}%`
        }
    )
}

    const floor = towerFloors.find(
        f => f.floor === player.towerFloor
    )

    if (!floor) return

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: floor.image
            },
            caption: `🏰 برج الأبطال

📍 الطابق الحالي: ${floor.floor}/30

⚔️ القوة المطلوبة:
${floor.power}

👥 الشخصيات المستخدمة:
${player.usedCharacters?.length || 0}/30

🏆 اللقب النهائي:
⚜️ سيد العروش

استعمل:
.طابق ${player.towerFloor} رقم_الشخصية`
        }
    )
}
        

        // =========================
        // .صوت
        // =========================

        if (text === '.صوت') {

            const folderPath = './audio'

            const files =
            fs.readdirSync(folderPath)

            if (files.length === 0) {

                return sock.sendMessage(
                    msg.key.remoteJid,
                    { text: 'لا توجد صوتيات' }
                )
            }

            const randomAudio =
            files[Math.floor(
                Math.random() * files.length
            )]

            const audioPath =
            path.join(folderPath, randomAudio)

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    audio:
                    fs.readFileSync(audioPath),

                    mimetype: 'audio/mpeg',

                    ptt: false
                }
            )
        }

        // =========================
        // .اصوات
        // =========================

        if (text === '.اصوات') {

            const folderPath = './sounds'

            const files =
            fs.readdirSync(folderPath)

            if (files.length === 0) {

                return sock.sendMessage(
                    msg.key.remoteJid,
                    { text: 'لا توجد اصوات' }
                )
            }

            const randomAudio =
            files[Math.floor(
                Math.random() * files.length
            )]

            const audioPath =
            path.join(folderPath, randomAudio)

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    audio:
                    fs.readFileSync(audioPath),

                    mimetype: 'audio/mpeg',

                    ptt: false
                }
            )
        }

        // =========================
        // أوامر الأسماء
        // =========================

        if (text === '.اسم') {

            namesCount = 1

            return sock.sendMessage(
                msg.key.remoteJid,
                {
                    text:
                    '*تم تغيير .كت إلى اسم واحد*'
                }
            )
        }

        if (text === '.اسمين') {

            namesCount = 2

            return sock.sendMessage(
                msg.key.remoteJid,
                {
                    text:
                    '*تم تغيير .كت إلى اسمين*'
                }
            )
        }

        if (text === '.ثلاث') {

            namesCount = 3

            return sock.sendMessage(
                msg.key.remoteJid,
                {
                    text:
                    '*تم تغيير .كت إلى 3 أسماء*'
                }
            )
        }

                if (text.startsWith('.سوق المعدات')) {
            const player = await Player.findOne({ userId })
            if (!player) return

            const DAY = 24 * 60 * 60 * 1000

            // يتجدد المتجر فقط إذا مر 24 ساعة أو كان فارغاً
            const needRefresh =
                !player.shop.lastRefresh ||
                Date.now() - player.shop.lastRefresh >= DAY ||
                !player.shop.items.length

            if (needRefresh) {
                const { generateEquipmentShop } =
require('./utils/shop')
                const shopItems = generateEquipmentShop()

                player.shop.items = shopItems
                player.shop.lastRefresh = Date.now()

                await player.save()
            }

            let shopText = `🏪 *سوق المعدات للمقاتلين* 🏪\n\n`

            // عرض المنتجات الموجودة في المتجر
            player.shop.items.forEach((item, i) => {
                shopText += `*#${i + 1}* 🗡️ *الاسم:* ${item.name}\n⭐ *الندرة:* ${item.rarity}\n💰 *السعر:* ${item.price} عملة\n━━━━━━━━━━━━━━━\n`
            })

            // حساب الوقت المتبقي للتجديد القادم (الجزء الخاص بك)
            const nextRefresh = Math.max(0, DAY - (Date.now() - player.shop.lastRefresh))
            const hours = Math.floor(nextRefresh / 3600000)

            shopText += `\n🕒 *التجديد بعد:* ${hours} ساعة`

            return sock.sendMessage(msg.key.remoteJid, { text: shopText })
        }

        if (text.startsWith('.شراء_معدات')) {

    const num = parseInt(text.split(' ')[1]) - 1

    const player = await Player.findOne({ userId })

    const item = player.shop.items[num]

    if (!item) return

    if (player.money < item.price) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ ما عندك فلوس كافية'
        })
    }

    player.money -= item.price

    player.inventory.push(item)

    await player.save()

    return sock.sendMessage(msg.key.remoteJid, {
        text: `✅ تم شراء ${item.name}`
    })
}

        if (text === '.تركيب') {

    const player = await Player.findOne({ userId })

    if (!player || !player.inventory.length) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ لا يوجد معدات'
        })
    }

    let textMsg = `⚔️ اختر رقم لتجهيز المعدة:\n\n`

    player.inventory.forEach((item, i) => {

        textMsg += `#${i + 1}
🗡️ ${item.name}
🎚️ ${item.type}
⭐ ${item.rarity}

━━━━━━━━━━━\n`
    })

    textMsg += `\n📌 الاستخدام:
.لبس رقم نوع

مثال:
.لبس 1 weapon`

    return sock.sendMessage(msg.key.remoteJid, {
        text: textMsg
    })
}

        if (text.startsWith('.لبس')) {

    const args = text.split(' ')
    const index = parseInt(args[1]) - 1
    const type = args[2] // weapon / armor / accessory

    const player = await Player.findOne({ userId })

    if (!player) return

    const item = player.inventory[index]

    if (!item) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ رقم غير صحيح'
        })
    }

    if (item.type !== type) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: `❌ هذه ليست ${type}`
        })
    }

    // تركيب القطعة
    player.equipment[type] = item

    await player.save()

    return sock.sendMessage(msg.key.remoteJid, {
        text: `✅ تم تجهيز ${item.name} في ${type}`
    })
}


if (text.startsWith('.قتال pvp')) {

    const attacker = await Player.findOne({ userId })
    const defenderJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    if (!attacker) {
        return safeSend(msg.key.remoteJid, { text: '❌ لا تملك حساب' })
    }

    if (!defenderJid) {
        return safeSend(msg.key.remoteJid, { text: '❌ مثال: .قتال pvp @user' })
    }

    const defender = await Player.findOne({ userId: defenderJid })

    if (!defender) {
        return safeSend(msg.key.remoteJid, { text: '❌ اللاعب غير موجود' })
    }

    if (attacker.userId === defender.userId) {
        return safeSend(msg.key.remoteJid, { text: '❌ لا يمكنك قتال نفسك' })
    }

    // =========================
    // ⏳ COOLDOWN
    // =========================
    const now = Date.now()

if (attacker.lastPvP && now - attacker.lastPvP < 30000) {
    return safeSend(msg.key.remoteJid, {
        text: '⏳ انتظر 30 ثانية'
    })
}

attacker.lastPvP = now
await attacker.save()

    // =========================
    // 🧠 STATS + EQUIPMENT
    // =========================
    const aEq = attacker.equipment || {}
    const dEq = defender.equipment || {}

    const aStats = {
        hp: attacker.hp,
        attack: (attacker.attack || 500) + (aEq.weapon?.attack || 0),
        crit: (attacker.crit || 5) + (aEq.accessory?.crit || 0),
        dodge: (attacker.dodge || 3) + (aEq.accessory?.dodge || 0),
        burn: 0,
        bleed: 0,
        stun: 0
    }

    const dStats = {
        hp: defender.hp,
        attack: (defender.attack || 500) + (dEq.weapon?.attack || 0),
        crit: (defender.crit || 5) + (dEq.accessory?.crit || 0),
        dodge: (defender.dodge || 3) + (dEq.accessory?.dodge || 0),
        burn: 0,
        bleed: 0,
        stun: 0
    }

    let aHP = aStats.hp
    let dHP = dStats.hp

    let log =
`⚔️ PvP بدأ!

🥊 @${attacker.userId.split('@')[0]}
VS
🥊 @${defender.userId.split('@')[0]}

━━━━━━━━━━━━━━
`

    let turn = 1
let turnAttacker = true

function getSkill() {
    const r = Math.random()
    if (r > 0.85) return "ultimate"
    if (r > 0.55) return "skill"
    return "normal"
}

function applyStatus(target, skill) {

    if (skill === "skill") {
        if (Math.random() < 0.3) target.burn = 2
    }

    if (skill === "ultimate") {
        if (Math.random() < 0.3) target.stun = 1
        if (Math.random() < 0.2) target.bleed = 3
    }
}

const MAX_TURNS = 50

while (
    aHP > 0 &&
    dHP > 0 &&
    turn <= MAX_TURNS
) {

    log += `\n🔁 الدور ${turn}\n`



    // =========================
    // ⚔️ FIGHT LOOP
    // =========================
    

        log += `\n🔁 الدور ${turn}\n`

        let atk = turnAttacker ? aStats : dStats
        let def = turnAttacker ? dStats : aStats

        let defHP = turnAttacker ? dHP : aHP

        // 🔥 status damage

if (atk.burn > 0) {
    defHP -= 80
    atk.burn--
    log += `🔥 حرق -80 HP\n`
}

if (atk.bleed > 0) {
    defHP -= 120
    atk.bleed--
    log += `🩸 نزيف -120 HP\n`
}

if (defHP <= 0) {
    if (turnAttacker) dHP = 0
    else aHP = 0
    break
}

if (atk.stun > 0) {
    atk.stun--
    log += `💫 مذهول - خسر دوره\n`
    turnAttacker = !turnAttacker
    turn++
    continue
}

        // 🛡️ dodge
        if (Math.random() * 100 < def.dodge) {
            log += `💨 تفادى الضربة!\n`
        } else {

            let skill = getSkill()

            let damage = atk.attack

            if (skill === "skill") damage *= 1.5
            if (skill === "ultimate") damage *= 2.5

            // crit
            if (Math.random() * 100 < atk.crit) {
                damage *= 2
                log += `🔥 CRIT!\n`
            }

            defHP -= Math.floor(damage)

            applyStatus(def, skill)

            log += `⚔️ ${skill.toUpperCase()} - ${Math.floor(damage)} dmg\n`
        }

        if (turnAttacker) dHP = defHP
        else aHP = defHP
        log += `
❤️ ${attacker.userId.split('@')[0]}: ${Math.max(0, aHP)} HP
💙 ${defender.userId.split('@')[0]}: ${Math.max(0, dHP)} HP
`

        turnAttacker = !turnAttacker
        turn++
    }

    // =========================
    // 🏆 RESULT
    // =========================
    const winner = aHP > 0 ? attacker : defender
    const loser = aHP > 0 ? defender : attacker

    winner.wins = (winner.wins || 0) + 1
    loser.losses = (loser.losses || 0) + 1

    winner.mmr += 25
    loser.mmr = Math.max(0, loser.mmr - 15)

    attacker.rank = getRank(attacker.mmr)
    defender.rank = getRank(defender.mmr)

    await attacker.save()
    await defender.save()

    return safeSend(msg.key.remoteJid, {
    text: `${log}

━━━━━━━━━━━━━━━━━━

🏆 الفائز:
@${winner.userId.split('@')[0]}

📊 النتائج:

🥇 @${attacker.userId.split('@')[0]}
${attacker.rank} (${attacker.mmr})

🥈 @${defender.userId.split('@')[0]}
${defender.rank} (${defender.mmr})`,

    mentions: [
        attacker.userId,
        defender.userId
    ]
})
}

        if (text.startsWith('.اشرح pvp')) {

    const explanation =
`⚔️ شرح نظام PvP (المطور)

━━━━━━━━━━━━━━━
🧠 1) نظام القتال
━━━━━━━━━━━━━━━
• القتال يعتمد على نظام أدوار (Turn-Based)
• كل لاعب يهاجم بالتناوب
• القتال يستمر حتى ينتهي HP أحد اللاعبين

━━━━━━━━━━━━━━━
🔥 2) المهارات (Skills)
━━━━━━━━━━━━━━━
يوجد 3 أنواع:

• NORMAL → ضربة عادية
• SKILL → ضرر أقوى + احتمال تأثير
• ULTIMATE → ضرر عالي + تأثيرات قوية

━━━━━━━━━━━━━━━
💥 3) الضرر (Damage System)
━━━━━━━━━━━━━━━
• يعتمد على Attack الأساسي
• يتم ضربه في:
  - Skill multiplier
  - Critical Hit (ضربة حرجة)
  - معدات اللاعب

━━━━━━━━━━━━━━━
🔥 4) الضربة الحرجة (Critical)
━━━━━━━━━━━━━━━
• احتمال بنسبة crit%
• تضاعف الضرر ×2

━━━━━━━━━━━━━━━
💨 5) التفادي (Dodge)
━━━━━━━━━━━━━━━
• احتمال dodge%
• إذا نجح:
  ❌ لا يتم استقبال أي ضرر

━━━━━━━━━━━━━━━
🩸 6) حالات القتال (Status Effects)
━━━━━━━━━━━━━━━
• BURN → ضرر كل دور
• BLEED → نزيف لعدة أدوار
• STUN → فقدان دور كامل

━━━━━━━━━━━━━━━
🛡️ 7) المعدات (Equipment System)
━━━━━━━━━━━━━━━
• Weapon → يزيد Attack
• Armor → يزيد HP / تقليل ضرر
• Accessory → يزيد Crit / Dodge

━━━━━━━━━━━━━━━
📊 8) نظام الرانك (Rank System)
━━━━━━━━━━━━━━━
يعتمد على MMR:

• برونزي
• فضي
• ذهبي
• بلاتيني
• ماستر
• أسطوري

كل قتال:
✔ يزيد أو ينقص MMR

━━━━━━━━━━━━━━━
🏆 9) المكافآت
━━━━━━━━━━━━━━━
الفائز يحصل على:
• 💰 فلوس
• ⭐ XP
• 📦 صناديق حسب الرانك

━━━━━━━━━━━━━━━
⚔️ الخلاصة
━━━━━━━━━━━━━━━
PvP الآن = نظام RPG كامل داخل البوت
(مهارات + معدات + حالات + رانك + مكافآت)

🔥 مستعد للتطوير القادم`;

    return safeSend(msg.key.remoteJid, {
        text: explanation
    });
}
        
        
        if (text === '.بروفايل') {

try {

    console.time('PROFILE')

    let player = await Player.findOne({ userId })

if (!player) {
    player = await Player.create({
        userId
    })
}
// بعدها يكمل الكود الطبيعي
const characters = Array.isArray(player.characters)
    ? player.characters
    : []

    const mainCharacter = characters.length > 0 ? characters[0] : null

    console.timeLog(
        'PROFILE',
        'PLAYER LOADED'
    )

    

    console.timeLog(
        'PROFILE',
        'PHOTO CHECKED'
    )
    const evolutionRanks = [
    "SSS",
    "SSS+",
    "SSS++",
    "UR I",
    "UR II",
    "UR III",
    "EX"
]

const displayRank =
mainCharacter
? (
    mainCharacter.evolutionLevel > 0
        ? evolutionRanks[mainCharacter.evolutionLevel]
        : mainCharacter.rarity
)
: "-"

    const profileText =

`╭━━━「 👤 الملف الشخصي 」━━━╮

🌟 الشخصية الرئيسية

🧿 ${mainCharacter ? mainCharacter.name : "لا يوجد"}

🌟 التطوير
${displayRank}

⚔️ القوة:
${mainCharacter ? Number(mainCharacter.power).toLocaleString() : "-"}

━━━━━━━━━━━━━━

👤 اللاعب

@${userId.split("@")[0]}

🏅 المستوى:
${player.level || 1}

✨ الخبرة:
${Number(player.xp || 0).toLocaleString()}

❤️ HP:
${Number(player.hp || 10000).toLocaleString()}

🏰 الطابق الحالي:
${player.towerFloor || 1}/30

📦 المخزون:
${characters.length}/${player.maxCharacters || 30}

━━━━━━━━━━━━━━

📊 تأثير القدرات

⚔️ الهجوم:
+${player.attackBonus || 0}%

🛡️ الدفاع:
+${player.defenseBonus || 0}%

🎯 الكريت:
+${player.critBonus || 0}%

💨 المراوغة:
+${player.dodgeBonus || 0}%

🪞 عكس الضرر:
+${player.reflectBonus || 0}%

🩸 امتصاص الحياة:
+${player.lifestealBonus || 0}%

💖 HP:
+${player.hpBonus || 0}%

👹 ضرر الزعيم:
+${player.bossDamageBonus || 0}%

━━━━━━━━━━━━━━

👑 الألقاب

${player.titles?.length
? player.titles.join("\n")
: "لا يوجد"}

╰━━━━━━━━━━━━━━╯`

    if (mainCharacter && mainCharacter.image) {

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: mainCharacter.image
            },
            caption: profileText,
            mentions: [userId]
        }
    )

    console.timeEnd("PROFILE")
    return
}

            

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: profileText,
mentions: [userId]
        }
    )

    console.timeEnd('PROFILE')

} catch (err) {

    console.log(
        'PROFILE ERROR:',
        err
    )

    return await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
            '❌ حدث خطأ أثناء فتح البروفايل'
        }
    )
}

}
        
if (text === '.قدراتي') {

    const me = await Player.findOne({ userId })
    if (!me.specialAbilities) me.specialAbilities = []

for (let i = 5; i <= me.level; i += 5) {
  const ability = levelAbilities[i]

  if (ability && !me.specialAbilities.includes(ability.name)) {
    me.specialAbilities.push(ability.name)
  }
}
if (!me.claimedLevelRewards) me.claimedLevelRewards = []

for (let i = 5; i <= me.level; i += 5) {
  if (me.claimedLevelRewards.includes(i)) continue

  switch (i) {
    case 10:
      me.boxes.basic += 5
      break

    case 20:
      me.boxes.rare += 3
      break

    case 30:
      me.boxes.rare += 5
      break
  }

  me.money = (me.money || 0) + 500

  me.claimedLevelRewards.push(i)
}

await me.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`✨ قدراتك

${me.specialAbilities.join('\n') || 'لا توجد قدرات'}

📊 عدد القدرات:
${me.specialAbilities.length}`
        }
    )
}
        // =========================
        // .كت
        // =========================

        if (text === '.كت') {

            const shuffled =
            animeNames.sort(
                () => 0.5 - Math.random()
            )

            const names =
            shuffled.slice(0, namesCount)

            return sock.sendMessage(
                msg.key.remoteJid,
                {
                    text:
                    `*${names.join('* , *')}*`
                }
            )
        }

        if (text.startsWith('.فتحبكج ')) {

    let player = await Player.findOne({ userId })

    if (!player) {
        return sock.sendMessage(
            msg.key.remoteJid,
            { text: '❌ لا يوجد حساب' }
        )
    }

    const boxType =
        text.replace('.فتحبكج ', '')
            .trim()
            .toLowerCase()

    if (
        !player.boxes ||
        !player.boxes[boxType] ||
        player.boxes[boxType] <= 0
    ) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا تملك هذا البكج'
            }
        )
    }

    let rarity
    const chance = Math.random() * 100

    switch (boxType) {

        case 'basic':
            rarity =
                chance <= 20
                    ? 'ممتاز'
                    : 'عادي'
            break

        case 'rare':
            if (chance <= 5)
                rarity = 'اسطوري'
            else if (chance <= 50)
                rarity = 'ممتاز'
            else
                rarity = 'عادي'
            break

        case 'epic':
            rarity =
                chance <= 25
                    ? 'اسطوري'
                    : 'ممتاز'
            break

        case 'legendary':
            rarity = 'اسطوري'
            break

        case 'sss_chance':
            rarity =
                chance <= 5
                    ? 'SSS'
                    : 'اسطوري'
            break

        case 'sss_high':
            rarity =
                chance <= 30
                    ? 'SSS'
                    : 'اسطوري'
            break

        default:
            return sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: '❌ نوع البكج غير معروف'
                }
            )
    }

    const list =
        characters.filter(
            c => c.rarity === rarity
        )

    if (!list.length) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: `❌ لا توجد شخصيات ${rarity}`
            }
        )
    }

    const character =
        list[
            Math.floor(
                Math.random() * list.length
            )
        ]

    player.boxes[boxType]--

    player.characters.push(character)

    await player.save()

    const imagePath =
        path.join(
            __dirname,
            character.image
        )

    if (!fs.existsSync(imagePath)) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
`🎁 تم فتح البكج

🧿 ${character.name}
🌟 ${character.rarity}
⚔️ ${character.power}

❌ صورة الشخصية غير موجودة`
            }
        )
    }

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            image: fs.readFileSync(imagePath),

            caption:
`🎁 ═══〔 تم فتح البكج 〕═══

🧿 الاسم: ${character.name}

🌟 الندرة: ${character.rarity}

⚔️ القوة: ${character.power}

🌌 الأنمي: ${character.anime}

📦 البكج: ${boxType}

🎉 تمت إضافة الشخصية إلى مخزونك`
        }
    )
        }

        if (text.startsWith('.فتح ')) {

    let player = await Player.findOne({ userId })

    if (!player)
        return sock.sendMessage(
            msg.key.remoteJid,
            { text: '❌ لا يوجد حساب' }
        )

    const boxType = text.split(' ')[1]

    if (
        !player.boxes ||
        !player.boxes[boxType] ||
        player.boxes[boxType] <= 0
    ) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا تملك هذا الصندوق'
            }
        )
    }

    const character = getRandomCharacterByBox(boxType)

    player.boxes[boxType]--

    // إضافة الشخصية حتى لو كانت مكررة
    player.characters.push(character)

    await player.save()

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`🎁 تم فتح الصندوق!

🧿 الشخصية:
${character.name}

🌟 الندرة:
${character.rarity}

⚔️ القوة:
${character.power}

🌌 الأنمي:
${character.anime}

✨ تمت إضافة نسخة جديدة إلى مخزونك`
        }
    )
}

if (text === '.ريست_البرج_للجميع') {

    if (!isOwner(msg)) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ هذا الأمر للمطور فقط'
            }
        )
    }

    await Player.updateMany(
        {},
        {
            $set: {
                towerFloor: 1,
                usedCharacters: [],
                towerCompleted: false,

                attackBonus: 0,
                defenseBonus: 0,
                hpBonus: 0,
                speedBonus: 0
            },

            $unset: {
                usedCharacter: "",
                towerCharacters: "",
                usedTowerCharacters: ""
            }
        }
    )

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`🔄 تم إعادة تعيين البرج لجميع اللاعبين

✅ الطابق عاد إلى 1
✅ تم فتح جميع الشخصيات
✅ تم مسح الشخصيات المستخدمة
✅ تم حذف أي بيانات برج قديمة
✅ تم حذف مكافآت البرج
✅ تم الاحتفاظ بالألقاب
✅ تم الاحتفاظ بزيادة المخزون (+5)`
        }
    )
}
    
if (text.startsWith('.طابق')) {

    let player = await Player.findOne({ userId })

    if (!player) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ لا تملك حساباً'
        })
    }

    if (player.towerCompleted) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '👑 لقد أكملت البرج بالفعل'
        })
    }

    const args = text.trim().split(/\s+/)

    if (args.length < 2) {

    return sock.sendMessage(msg.key.remoteJid, {
        text:
`❌ استخدم:

.طابق رقم_الشخصية

مثال:
.طابق 1`
    })

}

    const charNumber = Number(args[1]) - 1

const floorNumber = player.towerFloor
    if (
        isNaN(floorNumber) ||
        isNaN(charNumber)
    ) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ يجب إدخال أرقام صحيحة'
        })
    }



    const floor = towerFloors.find(
        f => f.floor === floorNumber
    )

    if (!floor) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ هذا الطابق غير موجود'
        })
    }

    const character =
        player.characters?.[charNumber]

    if (!character) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ الشخصية غير موجودة'
        })
    }

    if (
        player.usedCharacters?.includes(
            character.name
        )
    ) {
        return sock.sendMessage(msg.key.remoteJid, {
            text:
'❌ هذه الشخصية استعملتها سابقاً في البرج'
        })
    }

    const finalPower = Math.floor(
        character.power *
        (
            1 +
            (player.attackBonus || 0) / 100
        )
    )

    if (finalPower < floor.power) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
`❌ فشل الطابق ${floor.floor}

⚔️ قوة الشخصية:
${finalPower}

🏰 المطلوب:
${floor.power}`
            }
        )
    }

    player.usedCharacters.push(
        character.name
    )

    const reward =
        getTowerReward(floor.floor)

    player.towerFloor++

    if (reward.money)
        player.money += reward.money

    if (reward.draws)
    player.towerTickets =
        (player.towerTickets || 0) +
        reward.draws

    if (reward.box) {

        if (!player.boxes) {
            player.boxes = {}
        }

        player.boxes[reward.box] =
            (player.boxes[reward.box] || 0) + 1
    }

    player.attackBonus =
        (player.attackBonus || 0) + 5

    if (floor.floor === 30) {

    player.towerCompleted = true

    if (!player.titles)
        player.titles = []

    if (
        !player.titles.includes(
            '⚜️ سيد العروش'
        )
    ) {
        player.titles.push(
            '⚜️ سيد العروش'
        )
    }

    player.attackBonus += 10
    player.maxCharacters += 5
}

    await player.save()

    let rewardText = ''

    if (reward.money)
        rewardText +=
`💰 المال: +${reward.money}\n`

    if (reward.xp)
        rewardText +=
`⭐ الخبرة: +${reward.xp}\n`

    if (reward.draws)
    rewardText +=
`🎫 تذاكر المتجر: +${reward.draws}\n`
    if (reward.box)
        rewardText +=
`🎁 الصندوق: ${reward.box}\n`

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: floor.image
            },
            caption:

`🏆 تم اجتياز الطابق ${floor.floor}

🧿 الشخصية المستخدمة:
${character.name}

⚔️ القوة النهائية:
${finalPower}

━━━━━━━━━━━━━━

🎁 الجوائز

${rewardText}

📈 المكافآت الدائمة

⚔️ هجوم: ${player.attackBonus}%
🛡️ دفاع: ${player.defenseBonus}%
❤️ HP: ${player.hpBonus}%
💨 سرعة: ${player.speedBonus}%

━━━━━━━━━━━━━━

🏰 الطابق التالي:
${player.towerFloor}`
        }
    )
}

        if (text === '.متجرالتذاكر') {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`🛒 ═══〔 متجر التذاكر 〕═══

📦 Basic Box
🎫 السعر: 5 تذاكر متجر

📦 Rare Box
🎫 السعر: 10 تذاكر متجر

📦 Epic Box
🎫 السعر: 20 تذكرة متجر

📦 Legendary Box
🎫 السعر: 35 تذكرة متجر

📦 SSS Chance Box
🎫 السعر: 60 تذكرة متجر

📦 SSS High Box
🎫 السعر: 100 تذكرة متجر
━━━━━━━━━━━━━━

🌟 شخصية ممتازة عشوائية
🎫 السعر: 15 تذكرة متجر

👑 شخصية أسطورية عشوائية
🎫 السعر: 40 تذكرة متجر

🔥 شخصية SSS عشوائية
🎫 السعر: 150 تذكرة متجر

━━━━━━━━━━━━━━

🛍️ الشراء:

.شراءصندوق basic
.شراءصندوق rare
.شراءصندوق epic
.شراءصندوق legendary
.شراءصندوق ssschance
.شراءصندوق ssshigh

.شراءشخصية ممتاز
.شراءشخصية اسطوري
.شراءشخصية sss`
        }
    )
        }

    

        if (text.startsWith('.شراءصندوق ')) {

let player = await Player.findOne({ userId })

if (!player) {
    return sock.sendMessage(msg.key.remoteJid, {
        text: '❌ لم يتم العثور على حسابك'
    })
}

if (!player.boxes) {
    player.boxes = {}
}

if (!player.towerTickets) {
    player.towerTickets = 0
}

let item =
    text
    .replace('.شراءصندوق ', '')
    .trim()
    .toLowerCase()

if (item === 'ssschance')
    item = 'sss_chance'

if (item === 'ssshigh')
    item = 'sss_high'

if (!item) {
    return sock.sendMessage(msg.key.remoteJid, {
        text: '❌ اكتب اسم الصندوق'
    })
}

const prices = {
    basic: 5,
    rare: 10,
    epic: 20,
    legendary: 35,
    sss_chance: 60,
    sss_high: 100
}

const names = {
    basic: '📦 Basic',
    rare: '📦 Rare',
    epic: '📦 Epic',
    legendary: '📦 Legendary',
    ssschance: '📦 SSS Chance',
    ssshigh: '📦 SSS High'
}

if (!prices[item]) {
    return sock.sendMessage(msg.key.remoteJid, {
        text:
`❌ الصندوق غير موجود

📦 basic
📦 rare
📦 epic
📦 legendary
📦 ssschance
📦 ssshigh`
})
}

if (player.towerTickets < prices[item]) {
    return sock.sendMessage(msg.key.remoteJid, {
        text:

`❌ ليس لديك تذاكر متجر كافية

🎫 المطلوب: ${prices[item]}
🎫 لديك: ${player.towerTickets}`
})
}

player.towerTickets -= prices[item]

player.boxes[item] =
    (player.boxes[item] || 0) + 1

await player.save()

return sock.sendMessage(msg.key.remoteJid, {
    text:

`✅ تم شراء الصندوق بنجاح

${names[item]}

🎫 السعر: ${prices[item]} تذكرة متجر
🎫 المتبقي: ${player.towerTickets}

📦 عدد هذا الصندوق:
${player.boxes[item]}`
})
}
    if (text.startsWith('.شراءشخصية ')) {

let player = await Player.findOne({ userId })

if (!player) {
    return safeSend(msg.key.remoteJid,{
        text:'❌ لم يتم العثور على حسابك'
    })
}

const type =
    text
    .replace('.شراءشخصية ','')
    .trim()
    .toLowerCase()

const prices = {
    'ممتاز': 15,
    'اسطوري': 40,
    'sss': 150
}

if (!prices[type]) {
    return safeSend(msg.key.remoteJid,{
        text:
`❌ النوع غير موجود

.شراءشخصية ممتاز
.شراءشخصية اسطوري
.شراءشخصية sss`
    })
}

if ((player.towerTickets || 0) < prices[type]) {
    return safeSend(msg.key.remoteJid,{
        text:
`❌ ليس لديك تذاكر كافية

🎫 المطلوب: ${prices[type]}
🎫 لديك: ${player.towerTickets || 0}`
    })
}

let pool = []

if (type === 'ممتاز') {
    pool = characters.filter(
        c =>
        c.rarity === 'A' ||
        c.rarity === 'S'
    )
}

if (type === 'اسطوري') {
    pool = characters.filter(
        c =>
        c.rarity === 'SS' ||
        c.rarity === 'SS+'
    )
}

if (type === 'sss') {
    pool = characters.filter(
        c => c.rarity === 'SSS'
    )
}

if (!pool.length) {
    return safeSend(msg.key.remoteJid,{
        text:'❌ لا توجد شخصيات مطابقة'
    })
}

const reward =
JSON.parse(
JSON.stringify(
pool[Math.floor(Math.random()*pool.length)]
))

player.towerTickets -= prices[type]

player.characters.push({
    ...reward,
    evolutionLevel: 0
})

await player.save()

return safeSend(msg.key.remoteJid,{
    text:

`🎉 تم الشراء بنجاح

👤 ${reward.name}
🌟 ${reward.rarity}
⚔️ ${reward.power}

🎫 المتبقي:
${player.towerTickets}`
})
}

        if (text === '.صناديقي') {

    let player = await Player.findOne({ userId })

    if (!player) {
        player = await Player.create({ userId })
    }

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

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`🎁 ════〔 صناديقك 〕════

📦 Basic: ${player.boxes.basic || 0}
↳ .فتحبكج basic

📦 Rare: ${player.boxes.rare || 0}
↳ .فتحبكج rare

📦 Epic: ${player.boxes.epic || 0}
↳ .فتحبكج epic

📦 Legendary: ${player.boxes.legendary || 0}
↳ .فتحبكج legendary

━━━━━━━━━━━━━━

🌟 SSS Chance: ${player.boxes.sss_chance || 0}
↳ .فتح sss_chance

💎 SSS High: ${player.boxes.sss_high || 0}
↳ .فتح sss_high

━━━━━━━━━━━━━━
💡 أمثلة:

📦 .فتحبكج legendary
🌟 .فتح sss_chance`
        }
    )

}

        if (text === '.بوس') {

    if (!currentBoss) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '⏳ لا يوجد زعيم حالياً'
        })
    }

    return sock.sendMessage(msg.key.remoteJid, {
        text: `🔥 الزعيم الحالي:

👑 ${currentBoss.name}

💀 استخدم .زعيم لمواجهته`
    })
}
        
if (text === '.جوائز') {

return safeSend(msg.key.remoteJid, {
    text:

`🏆 جوائز الزعيم العالمي 🏆

🥇 المركز الأول

💰 10000 مال
⭐ 1000 XP
👑 شخصية أسطورية عشوائية

━━━━━━━━━━━━━━━━━━

🥈 المركز الثاني

💰 5000 مال
⭐ 500 XP

🎲 30% شخصية أسطورية
🎲 50% شخصية ممتازة

━━━━━━━━━━━━━━━━━━

🥉 المركز الثالث

💰 2500 مال
⭐ 500 XP
✨ شخصية ممتازة عشوائية

━━━━━━━━━━━━━━━━━━

⚔️ يتم تحديد الفائزين حسب
إجمالي الضرر المسبب للزعيم

📊 استخدم .زعيم لمعرفة الزعيم الحالي`
})

}
        
        if (text === '.هجوم') {

if (!currentBoss) {
    return safeSend(msg.key.remoteJid, {
        text: '❌ لا يوجد زعيم حالياً'
    })
}

if (currentBoss.hp <= 0) {
    return safeSend(msg.key.remoteJid, {
        text: '❌ تم هزيمة الزعيم بالفعل'
    })
}

const me = await Player.findOne({ userId })

if (!me) {
    return safeSend(msg.key.remoteJid, {
        text: '❌ لا تملك حساباً، أنشئ حساب أولاً'
    })
}


if (!me || !me.characters.length) {
    return safeSend(msg.key.remoteJid, {
        text: '❌ لا تملك شخصيات'
    })
}
            // =========================
// BOSS HP SYSTEM
// =========================

if (me.bossDead) {

    const respawn = me.bossRespawn
        ? new Date(me.bossRespawn).getTime()
        : 0

    if (Date.now() >= respawn) {

        me.bossDead = false
        me.bossHp = Math.floor(me.bossMaxHp / 2)
        me.bossRespawn = null

        await me.save()

    } else {

        const left = Math.ceil((respawn - Date.now()) / 60000)

        return safeSend(msg.key.remoteJid, {
            text: `💀 أنت ميت\n\n⏳ العودة بعد ${left} دقيقة`
        })
    }
}

const bossNow = Date.now()

if (
    me.lastBossAttack &&
    bossNow - me.lastBossAttack < 30000
) {

    const left = Math.ceil(
        (30000 - (bossNow - me.lastBossAttack))
        / 1000
    )

    return safeSend(
        msg.key.remoteJid,
        {
            text: `⏳ انتظر ${left} ثانية قبل الهجوم مرة أخرى`
        }
    )
}

me.lastBossAttack = bossNow
            

await Player.updateOne(
    { _id: me._id },
    {
        $set: {
            lastBossAttack: bossNow
        }
    }
)
            console.log(
    "Cooldown saved:",
    bossNow
)

const strongest = me.characters.sort(
    (a, b) => b.power - a.power
)[0]
            const latest = characters.find(
    c =>
        c.name === strongest.name &&
        c.rarity === strongest.rarity &&
        c.form === strongest.form
)

const fighter = latest
? {
    ...strongest,
    image: latest.image,
    anime: latest.anime,
    ability: latest.ability,
    rarity: latest.rarity,
    form: latest.form || strongest.form
}
: strongest

let damage = strongest.power

let abilityText = ''
let exSkillsText = ''
let effectsText = ''
let playerSkillsText = ''

let ex = null

if (
    strongest.evolutionLevel >= 1 &&
    strongest.urAbilities &&
    strongest.urAbilities.length > 0
) {

    ex = useEXAbilities(strongest)

    // زيادة الهجوم
    damage = Math.floor(
        damage *
        (1 + ex.attackBonus / 100)
    )

    // زيادة ضرر الزعيم (تعمل على الجميع)
    damage = Math.floor(
    damage *
    (1 + ex.bossDamage / 100)
)
    // بونصات اللاعب القديمة
damage = Math.floor(
    damage *
    (1 + ((me.attackBonus || 0) / 100))
)

damage = Math.floor(
    damage *
    (1 + ((me.bossDamageBonus || 0) / 100))
)

damage = Math.floor(
    damage *
    (1 + ((me.damageBonus || 0) / 100))
)

    // حرج EX
    if (
        Math.random() * 100 <
        ex.critRate
    ) {

        damage = Math.floor(
            damage *
            (
                1 +
                ex.critDamage / 100
            )
        )

    }

    // امتصاص الحياة
    if (ex.lifesteal > 0) {

        const heal = Math.floor(
            damage *
            ex.lifesteal / 100
        )

        me.hp = Math.min(
            me.maxHp || 10000,
            (me.hp || 10000) + heal
        )

    }

    me.urShield = ex.shield
    me.urReflect = ex.reflect
    me.urDodge = ex.dodge

    for (const ability of (ex.abilitiesUsed || [])) {
        exSkillsText += `⚔️ ${ability.name}\n`
    }

    if (ex.attackBonus)
        effectsText += `🗡️ +${ex.attackBonus}% هجوم\n`

    if (ex.bossDamage)
        effectsText += `💥 +${ex.bossDamage}% ضد الزعيم\n`

    if (ex.lifesteal)
        effectsText += `❤️ +${ex.lifesteal}% امتصاص حياة\n`

    if (ex.critRate)
        effectsText += `🎯 +${ex.critRate}% حرج\n`

    if (ex.critDamage)
        effectsText += `☄️ +${ex.critDamage}% ضرر حرج\n`

    if (ex.dodge)
        effectsText += `👻 +${ex.dodge}% مراوغة\n`

    if (ex.reflect)
        effectsText += `🪞 +${ex.reflect}% عكس ضرر\n`

    if (ex.shield)
        effectsText += `🛡️ +${ex.shield}% درع\n`
}

const result = useAttackAbilities({
    player: me,
    character: strongest,
    damage
})

damage = result.damage

abilityText = (abilityText || '') + (result.randomText || '')
playerSkillsText = (playerSkillsText || '') + (result.playerText || '')
currentBoss.turnCounter =
    (currentBoss.turnCounter || 0) + 1

if (
    currentBoss.turnCounter % 4 === 0 &&
    Math.random() <= 0.60
) {
            
    const ability =
        currentBoss.abilities[
            Math.floor(
                Math.random() *
                currentBoss.abilities.length
            )
        ]

    await safeSend(
        msg.key.remoteJid,
        {
            text: `👑 ${currentBoss.name}

✨ فعل القدرة الخاصة

⚡ ${ability.name}

📖 ${ability.description}`
        }
    )

    if (ability.effect === "heal") {
        currentBoss.hp += 5000
    }

    if (ability.effect === "bigHeal") {
        currentBoss.hp += 10000
    }

    if (
        currentBoss.hp >
        currentBoss.maxHp
    ) {
        currentBoss.hp =
            currentBoss.maxHp
    }

    if (ability.effect === "halfDamage") {
        damage =
            Math.floor(damage / 2)
    }

    if (ability.effect === "dodge") {
        damage = 0
    }

    if (ability.effect === "reduceDamage") {
        damage =
            Math.floor(damage * 0.7)
    }
if (ability.effect === "megaAttack") {

    const extraDamage = 5000

    me.bossHp = Math.max(
        0,
        (me.bossHp || me.bossMaxHp) -
        extraDamage
    )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `💀 ضربة الإبادة

👑 ${currentBoss.name}

💥 ألحق بك ${extraDamage} ضرر إضافي!`
        }
    )
}

if (ability.effect === "lifesteal") {

    const healAmount = 8000

    currentBoss.hp = Math.min(
        currentBoss.maxHp,
        currentBoss.hp + healAmount
    )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `🩸 امتصاص الحياة

👑 ${currentBoss.name}

❤️ استعاد ${healAmount} HP`
        }
    )
}

if (ability.effect === "summon") {

    if (
        !currentBoss.activeFollowers ||
        currentBoss.activeFollowers.length === 0
    ) {

        currentBoss.activeFollowers =
            JSON.parse(
                JSON.stringify(
                    currentBoss.followers || []
                )
            )

        await sock.sendMessage(
            msg.key.remoteJid,
            {
                text: `👥 استدعاء الأتباع

👑 ${currentBoss.name}

⚔️ استدعى جميع أتباعه إلى المعركة!`
            }
        )
    }
}


if (ability.effect === "storm") {

    const stormDamage = 3000

    me.bossHp = Math.max(
        0,
        (me.bossHp || me.bossMaxHp) -
        stormDamage
    )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `🌪️ عاصفة الدمار

👑 ${currentBoss.name}

💥 أصابتك العاصفة

❤️ -${stormDamage} HP`
        }
    )
}

if (ability.effect === "curse") {

    damage =
        Math.floor(damage * 0.5)

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `☠️ اللعنة المظلمة

👑 ${currentBoss.name}

📉 تم تخفيض ضررك 50%`
        }
    )
}

if (ability.effect === "reflect") {

    const reflected =
        Math.floor(damage * 0.30)

    me.bossHp = Math.max(
        0,
        (me.bossHp || me.bossMaxHp) -
        reflected
    )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `🪞 انعكاس الضرر

👑 ${currentBoss.name}

💥 ارتد إليك ${reflected} ضرر`
        }
    )
}

if (ability.effect === "burn") {

    const burnDamage = 2000

    me.bossHp = Math.max(
        0,
        (me.bossHp || me.bossMaxHp) -
        burnDamage
    )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `🔥 لهيب الجحيم

👑 ${currentBoss.name}

❤️ -${burnDamage} HP`
        }
    )
}

if (ability.effect === "lightning") {

    const lightningDamage = 4000

    me.bossHp = Math.max(
        0,
        (me.bossHp || me.bossMaxHp) -
        lightningDamage
    )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `⚡ صاعقة الدمار

👑 ${currentBoss.name}

💥 أصابتك صاعقة مدمرة

❤️ -${lightningDamage} HP`
        }
    )
}

if (ability.effect === "freeze") {

    damage =
        Math.floor(damage * 0.75)

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `❄️ تجميد الزمن

👑 ${currentBoss.name}

📉 تم تخفيض ضررك 25%`
        }
    )
}

if (ability.effect === "rage") {

    currentBoss.attack =
        Math.floor(
            (currentBoss.attack || 3000) * 1.25
        )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `😡 غضب الإمبراطور

👑 ${currentBoss.name}

⚔️ زادت قوة هجومه 25%`
        }
    )
}

if (ability.effect === "doubleAttack") {

    damage =
        Math.floor(damage * 0.5)

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `👁️ عين الخراب

👑 ${currentBoss.name}

🛡️ خفضت ضررك 50%`
        }
    )
}

if (ability.effect === "worldEclipse") {

    damage =
        Math.floor(damage * 0.6)

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `🌑 كسوف العالم

👑 ${currentBoss.name}

📉 انخفض الضرر 40%`
        }
    )
}

if (ability.effect === "demonPower") {

    currentBoss.attack =
        Math.floor(
            (currentBoss.attack || 3000) * 1.5
        )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `👹 قوة الشياطين

👑 ${currentBoss.name}

🔥 زادت قوة هجومه 50%`
        }
    )
}

if (ability.effect === "volcano") {

    const volcanoDamage = 6000

    me.bossHp = Math.max(
        0,
        (me.bossHp || me.bossMaxHp) -
        volcanoDamage
    )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `🌋 ثوران الجحيم

👑 ${currentBoss.name}

💥 انفجار مدمر

❤️ -${volcanoDamage} HP`
        }
    )
}

if (ability.effect === "dimensionCollapse") {

    const collapseDamage = 10000

    me.bossHp = Math.max(
        0,
        (me.bossHp || me.bossMaxHp) -
        collapseDamage
    )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `🌌 انهيار الأبعاد

👑 ${currentBoss.name}

☠️ قدرة أسطورية أصابتك

❤️ -${collapseDamage} HP`
        }
    )
}
    
}
        

if (!currentBoss || typeof currentBoss.hp !== 'number') {
    return safeSend(msg.key.remoteJid, {
        text: '❌ خطأ في بيانات الزعيم'
    })
}

if (!damage || isNaN(damage)) {
    damage = 0
}

const xpGain = Math.max(
    10,
    Math.floor(damage / 100)
)

me.xp = (me.xp || 0) + xpGain

if (
    currentBoss.activeFollowers &&
    currentBoss.activeFollowers.length > 0
) {

    const follower =
        currentBoss.activeFollowers[0]
    
if (
    follower.ability === "dodge" &&
    Math.random() <= 0.20
) {

    damage = 0

    abilityText += `

🌀 ${follower.name}

💨 تفادى الهجمة بالكامل`
}
    if (
    follower.ability === "healBoss" &&
    Math.random() <= 0.20
) {

    currentBoss.hp =
        Math.min(
            currentBoss.maxHp,
            currentBoss.hp + 3000
        )

    abilityText += `

❤️ ${follower.name}

✨ عالج الزعيم

+3000 HP`
}
if (
    follower.ability === "reflect" &&
    Math.random() <= 0.20
) {

    const reflectDamage =
        Math.floor(damage * 0.30)

    me.bossHp =
        Math.max(
            0,
            (me.bossHp || me.bossMaxHp) -
            reflectDamage
        )

    abilityText += `

⚫ ${follower.name}

💥 عكس الضرر

❤️ -${reflectDamage} HP`
}
    if (
    follower.ability === "bonusDamage" &&
    Math.random() <= 0.20
) {

    const bonusDamage = 1500

    me.bossHp =
        Math.max(
            0,
            (me.bossHp || me.bossMaxHp) -
            bonusDamage
        )

    abilityText += `

⚔️ ${follower.name}

💥 هجوم إضافي

❤️ -${bonusDamage} HP`
}
    
    if (
    follower.ability === "critical" &&
    Math.random() <= 0.20
) {

    const criticalDamage = 3000

    me.bossHp =
        Math.max(
            0,
            (me.bossHp || me.bossMaxHp) -
            criticalDamage
        )

    abilityText += `

🎯 ${follower.name}

💥 ضربة حرجة

❤️ -${criticalDamage} HP`
}
    let followerDamage = damage

if (
    strongest.evolutionLevel >= 1 &&
    strongest.urAbilities &&
    strongest.urAbilities.length > 0
) {

    // إذا تريد أن نفس ضرر الزعيم يعمل على التابع أيضًا
    followerDamage = Math.floor(
        followerDamage * (1 + ex.bossDamage / 100)
    )
}

follower.hp -= followerDamage

    if (follower.hp <= 0) {

        await sock.sendMessage(
            msg.key.remoteJid,
            {
                image: {
                    url: follower.image
                },
                caption: `💀 تم القضاء على التابع

⚔️ ${follower.name}

🎉 أصبح الطريق إلى الزعيم أقرب!`
            }
        )
const dropRoll =
    Math.random() * 100

if (dropRoll <= 20) {

    me.money =
        (me.money || 0) + 1000

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `💰 ${follower.name}

🎁 أسقط 1000 مال`
        }
    )
}

else if (dropRoll <= 35) {

    me.xp =
        (me.xp || 0) + 500

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `⭐ ${follower.name}

🎁 أسقط 500 XP`
        }
    )
}
        await me.save()
        currentBoss.activeFollowers.shift()

        if (
            currentBoss.activeFollowers.length === 0
        ) {

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: `✅ تم القضاء على جميع الأتباع

👑 يمكنكم مهاجمة الزعيم مباشرة الآن!`
                }
            )
        }
    }

    await me.save()

    return safeSend(
        msg.key.remoteJid,
        {
            text: `⚔️ هجوم على تابع

👥 التابع:
${follower.name}

💥 الضرر:
${damage}

❤️ المتبقي:
${Math.max(0, follower.hp)}`
        }
    )
}

            currentBoss.hp = Math.max(
    0,
    (currentBoss.hp || 0) - damage
)

await Boss.updateOne(
    {},
    {
        $set: {
            hp: currentBoss.hp,
            attack: currentBoss.attack,
            enraged: currentBoss.enraged,
            activeFollowers: currentBoss.activeFollowers,
            groupAttackCount: currentBoss.groupAttackCount,
            killer: currentBoss.killer,
            finished: currentBoss.finished
        }
    }
)

if (
    !currentBoss.enraged &&
    currentBoss.hp <= currentBoss.maxHp / 2
) {

    currentBoss.enraged = true

    currentBoss.attack =
        Math.floor(
            (currentBoss.attack || 3000) * 1.5
        )

    currentBoss.activeFollowers =
        JSON.parse(
            JSON.stringify(
                currentBoss.followers || []
            )
        )

    await Boss.updateOne(
    {},
    {
        $set: {
            hp: currentBoss.hp,
            attack: currentBoss.attack,
            enraged: currentBoss.enraged,
            activeFollowers: currentBoss.activeFollowers
        }
    }
)

await sock.sendMessage(
    msg.key.remoteJid,
    {
        image: {
            url: currentBoss.image
        },

        caption: `😡 ${currentBoss.name}

دخل حالة الغضب!

👥 استدعى أتباعه:

${currentBoss.activeFollowers
.map(f => `⚔️ ${f.name}`)
.join('\n')}

🔥 الضرر زاد 50%

⚔️ احذروا... الزعيم أصبح أخطر!`
    }
)
}

if ((me.lifestealBonus || 0) > 0) {

    const heal = Math.floor(
        damage * (me.lifestealBonus || 0) / 100
    )

    me.hp = Math.min(me.maxHp || 10000, me.hp + heal)

    abilityText += `

🩸 امتصاص الحياة

❤️ استعدت ${heal} HP`
}

if (currentBoss.hp <= 0) {

    currentBoss.hp = 0

    if (!currentBoss.killer) {
        currentBoss.killer = userId
    }
}

await Boss.updateOne(
    {},
    {
        $set: {
            hp: currentBoss.hp,
            finished: currentBoss.finished,
            killer: currentBoss.killer
        }
    }
)
me.bossDamage =
    (me.bossDamage || 0) + damage

me.totalBossDamage =
    (me.totalBossDamage || 0) + damage

me.bossHits =
    (me.bossHits || 0) + 1

// مهمة الزعيم اليومية

if (me.dailyMissions) {

    const today = getSaudiDate()

    if (
        me.dailyMissions.lastReset !== today
    ) {

        await resetDailyMissions(me)

    }

    if (
        me.dailyMissions.bossKills < 2
    ) {

        me.dailyMissions.bossKills += 1

        me.markModified(
            'dailyMissions'
        )
    }
}

currentBoss.groupAttackCount =
    (currentBoss.groupAttackCount || 0) + 1
            
            currentBoss.groupAttackCount =
    (currentBoss.groupAttackCount || 0) + 1
            if (currentBoss.groupAttackCount >= 15) {

    currentBoss.groupAttackCount = 0

    const players =
    await Player.find({
        bossDead: { $ne: true },
        bossHits: { $gt: 0 }
    })

    const raidDamage =
        Math.floor(
            (currentBoss.attack || 3000) * 1.5
        )

    for (const p of players) {

    const newHp =
        Math.max(
            0,
            (p.bossHp || p.bossMaxHp) - raidDamage
        )

    await Player.updateOne(
        { _id: p._id },
        {
            $set: {
                bossHp: newHp,
                bossDead: newHp <= 0,
                bossRespawn:
                    newHp <= 0
                    ? new Date(Date.now() + 10 * 60 * 1000)
                    : p.bossRespawn
            }
        }
    )
}
const mentions =
    players.map(p => p.userId)

const mentionText =
    players
        .map(
            p => `@${p.userId.split('@')[0]}`
        )
        .join('\n')
        

    await sock.sendMessage(
    msg.key.remoteJid,
    {
        image: {
            url: currentBoss.image
        },

        caption: `🌋 ${currentBoss.name}

💥 أطلق ضربة جماعية

⚔️ أصاب ${players.length} مقاتل

❤️ الضرر: ${raidDamage}

🎯 المستهدفون:
${mentionText}`,

        mentions
    }
)
            
            if (Math.random() <= 0.85) {

    let bossDamage =
    currentBoss.attack || 3000

                // درع UR
if (me.urShield) {

    bossDamage =
        Math.floor(
            bossDamage *
            (
                1 -
                me.urShield / 100
            )
        )
}

// مراوغة UR
if (
    me.urDodge &&
    Math.random() * 100 <=
    me.urDodge
) {

    bossDamage = 0
}

    me.bossHp =
        Math.max(
            0,
            (me.bossHp || me.bossMaxHp) -
            bossDamage
        )

                // عكس ضرر UR
if (
    me.urReflect &&
    bossDamage > 0
) {

    const reflected =
        Math.floor(
            bossDamage *
            me.urReflect / 100
        )

    currentBoss.hp =
        Math.max(
            0,
            currentBoss.hp -
            reflected
        )
}

    if (me.bossHp <= 0) {

    me.bossHp = 0
    me.bossDead = true

    me.bossRespawn =
        new Date(
            Date.now() + 10 * 60 * 1000
        )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: currentBoss.image
            },

            caption: `💀 ${currentBoss.name} قضى عليك

⏳ ستعود بعد 10 دقائق

❤️ ستعود بنصف HP`
        }
    )

} else {

    const attacks = [
        "🔥 انفجار الجحيم",
        "⚡ صاعقة الدمار",
        "💀 قبضة الموت",
        "🌪️ الإعصار الأسود"
    ]

    const attackName =
    attacks[Math.floor(Math.random() * attacks.length)]

console.log("userId =", userId)

await sock.sendMessage(
    msg.key.remoteJid,
    {
        image: {
            url: currentBoss.image
        },
        caption: `👑 ${currentBoss.name}

${attackName}

🎯 استهدف:
@${userId.split('@')[0]}

💥 الضرر:
${bossDamage}

❤️ HP:
${me.bossHp}/${me.bossMaxHp}`,
        mentions: [userId]
    }
)

await me.save()

} // نهاية else

} // نهاية if (Math.random() <= 0.35)

} // نهاية if (currentBoss.groupAttackCount >= 15)

await me.save()

if (!currentBoss) {

    console.log("No current boss")

    return
}

console.log(
    "Boss HP:",
    currentBoss.hp,
    "Finished:",
    currentBoss.finished
)

// =========================
// 🧨 نهاية الزعيم
// =========================

if (currentBoss.hp <= 0) {

    if (currentBoss.finished) return

    currentBoss.finished = true

    console.log("BOSS DEAD")
    console.log("Starting reward distribution")

    try {
        await distributeBossRewards(
            sock,
            msg.key.remoteJid
        )

        currentBoss.hp = 0
currentBoss.finished = true

const nextHour =
    new Date()

nextHour.setMinutes(0)
nextHour.setSeconds(0)
nextHour.setMilliseconds(0)

nextHour.setHours(
    nextHour.getHours() + 1
)

currentBoss.respawnAt =
    nextHour.getTime()

console.log(
    'RESPAWN SET:',
    currentBoss.respawnAt
)

await Boss.updateOne(
    {},
    {
        $set: {
            hp: 0,
            finished: true,
            respawnAt: currentBoss.respawnAt
        }
    }
)

console.log(
    'RESPAWN AT:',
    new Date(currentBoss.respawnAt)
)

const savedBoss =
    await Boss.findOne()

console.log(
    'DB RESPAWN:',
    savedBoss?.respawnAt
)

currentBoss.finished = true

        return safeSend(msg.key.remoteJid, {
            text: `👑 تم هزيمة الزعيم!`
        })

    } catch (e) {

        console.log("Boss reward error:", e)

        currentBoss = null

        return safeSend(msg.key.remoteJid, {
            text: "❌ حدث خطأ أثناء توزيع الجوائز"
        })
    }
}
        
        const attackCaption = `⚔️ ═════〔 هجوم الزعيم 〕═════ ⚔️

🧿 المهاجم
${strongest.name}

👑 الزعيم
${currentBoss.name}

━━━━━━━━━━━━━━

⚡ القدرات العشوائية

${abilityText.trim() || 'لا يوجد'}

━━━━━━━━━━━━━━

👑 قدرات اللاعب

${playerSkillsText || 'لا يوجد'}

━━━━━━━━━━━━━━

✨ قدرات EX

${exSkillsText.trim() || 'لا يوجد'}

━━━━━━━━━━━━━━

📊 نتيجة الهجوم

💥 الضرر
${Number(damage).toLocaleString()}

⭐ الخبرة
+${Number(xpGain).toLocaleString()} XP

━━━━━━━━━━━━━━

❤️ صحة الزعيم

${Number(currentBoss.hp).toLocaleString()} / ${Number(currentBoss.maxHp).toLocaleString()}`
if (strongest.rarity === 'SSS') {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: fighter.image
            },

            caption: attackCaption
        }
    )
}

if (
    fighter.image.startsWith("http://") ||
    fighter.image.startsWith("https://")
) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: fighter.image
            },
            caption: attackCaption
        }
    )
}

const imagePath =
    path.join(__dirname, fighter.image)

if (!fs.existsSync(imagePath)) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `❌ صورة الشخصية غير موجودة:

${strongest.name}`
        }
    )
}

return sock.sendMessage(
    msg.key.remoteJid,
    {
        image: fs.readFileSync(imagePath),
        caption: attackCaption
    }
)
        }
        
        if (text === '.زعيم') {

if (!currentBoss) {
    return safeSend(msg.key.remoteJid, {
        text: '❌ لا يوجد زعيم عالمي حالياً'
    })
}

return sock.sendMessage(
    msg.key.remoteJid,
    {
        image: {
            url: currentBoss.image
        },

        caption: `👑 الزعيم العالمي

🧿 الاسم:
${currentBoss.name}

❤️ الصحة:
${currentBoss.hp}/${currentBoss.maxHp}

${currentBoss.activeFollowers?.length
? `

👥 الأتباع الأحياء:

${currentBoss.activeFollowers
.map(f =>
`⚔️ ${f.name}
❤️ ${f.hp} HP`
)
.join('\n\n')}`
: '\n✅ لا يوجد أتباع أحياء'}

━━━━━━━━━━━━━━━━━━

✨ القدرة الخاصة:
${currentBoss.ability.name}

📖 الوصف:
${currentBoss.ability.description}


━━━━━━━━━━━━━━━━━━

⚔️ استخدم .هجوم لمهاجمة الزعيم

🏆 الجوائز:

🥇 الأول:
10000 مال
1000 XP
شخصية أسطورية

🥈 الثاني:
5000 مال
500 XP
30% أسطوري
50% ممتاز

🥉 الثالث وما بعده:
2500 مال
500 XP
شخصية ممتازة`
    }
)
        }
        // =========================
        // .اسحب
        // =========================

        if (text === '.اسحب') {

console.log('بدأ السحب')

let player = await Player.findOne({ userId })

console.log('تم جلب اللاعب')

console.log('نوع الشخصيات:', typeof characters)
console.log('عدد الشخصيات:', characters?.length)

if (!player) {

    player = new Player({
    userId,
    name: pushName || "",


    pulls: 5,

    lastReset:
    Math.floor(
        Date.now() /
        (60 * 60 * 1000)
    ),

    characters: [],

    hp: 10000,

    crit: 5,

    dodge: 3,

    xp: 0,

    level: 1,

    money: 0
})
}

if (
    player.characters.length >=
    (player.maxCharacters || 30)
) {
    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`❌ المخزون ممتلئ

📦 السعة:
${player.maxCharacters || 30}`
        }
    )
}

const cooldown =
    60 * 60 * 1000

const currentPeriod =
    Math.floor(Date.now() / cooldown)

if (player.lastReset !== currentPeriod) {

    player.pulls = 5
    player.lastReset = currentPeriod

    await player.save()
}

if (player.pulls <= 0) {

    const remaining =
        cooldown - (Date.now() % cooldown)

    const minutes =
        Math.floor(
            remaining / (1000 * 60)
        )

    const seconds =
        Math.floor(
            (remaining % (1000 * 60)) / 1000
        )

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`⏳ انتهت السحبات

🕒 الوقت المتبقي:

${minutes} دقيقة
${seconds} ثانية

🎁 تتجدد السحبات تلقائياً عند رأس كل ساعة`
        }
    )
}
        player.sssPity = (player.sssPity || 0) + 1

let guaranteedSSS = false

if (player.sssPity >= 30) {

    guaranteedSSS = true
    player.sssPity = 0

}

const pityLeft =
guaranteedSSS
? 30
: 30 - player.sssPity

let luckBonus = 0

if ((player.level || 1) >= 10) {
    luckBonus = 3
}

let rarity = 'عادي'

if (guaranteedSSS) {

    rarity = 'SSS'

} else {

    let chance = Math.random() * 100

    chance -= luckBonus

    if (chance <= 5) {

        rarity = 'SSS'

    } else if (chance <= 22) {

        rarity = 'اسطوري'

    } else if (chance <= 50) {

        rarity = 'ممتاز'

    }

}

const filteredCharacters =
    characters.filter(
        c => c.rarity === rarity
    )

if (!filteredCharacters.length) {

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`❌ لا توجد شخصيات بهذا التصنيف: ${rarity}`
        }
    )
}

let randomCharacter

if (
    rarity === 'SSS' &&
    player.favoriteCharacter &&
    player.favoriteObtained < 2 &&
    player.favoriteExpires > Date.now()
) {

    const favorite =
(
    player.favoriteCharacter &&
    player.favoriteExpires > Date.now() &&
    player.favoriteObtained < 2
)
?
characters.find(
    c =>
        c.name ===
        player.favoriteCharacter &&
        c.rarity === 'SSS'
)
:
null

if (favorite) {

    randomCharacter =
        favorite

    player.favoriteObtained =
        (player.favoriteObtained || 0) + 1

    if (
        player.favoriteObtained >= 2
    ) {

        player.favoriteObtained = 2

        // إيقاف ظهور المفضلة بعد النسختين

        player.favoriteCharacter =
            null
    }
}
}

if (!randomCharacter) {

    randomCharacter =
        filteredCharacters[
            Math.floor(
                Math.random() *
                filteredCharacters.length
            )
        ]
}

if (
    player.favoriteCharacter &&
    player.favoriteExpires <= Date.now()
) {

    player.favoriteCharacter = null
    player.favoriteObtained = 0
    player.favoriteExpires = 0
}

// =========================
// DAILY MISSIONS
// =========================

if (player.dailyMissions) {

    player.dailyMissions.pulls += 1

    if (
        randomCharacter.rarity === 'اسطوري'
    ) {

        player.dailyMissions.gotLegendary += 1
    }

    if (
        randomCharacter.rarity === 'SSS'
    ) {

        player.dailyMissions.gotSSS = true
    }

    player.markModified(
        'dailyMissions'
    )
}

// غير مكرر أو ليس SSS
player.characters.push({
    ...randomCharacter,
    originalPower:
        randomCharacter.power,
    evolutionLevel: 0,
    urAbilities: []
})

player.pulls -= 1

await player.save()
            const latest =
    characters.find(
        c =>
            c.name === randomCharacter.name &&
            c.rarity === randomCharacter.rarity &&
            c.form === randomCharacter.form
    )

const character =
latest
? {
    ...randomCharacter,
    image: latest.image,
    anime: latest.anime,
    ability: latest.ability,
    rarity: latest.rarity,
    form: latest.form || randomCharacter.form
}
: randomCharacter

let imagePath = null

if (character.rarity !== 'SSS') {
    imagePath = path.join(
        __dirname,
        character.image
    )
}

if (character.rarity === 'SSS') {
    const pityText = guaranteedSSS
? "\n🎯 هذه الشخصية حصلت عليها من الضمان!"
: ""

    return sock.sendMessage(msg.key.remoteJid, {
        image: {
            url: character.image
        },
        caption:
`🌌 ═══════〔 إيقاظ أسطوري 〕═══════ 🌌

⚡ اهتزت الأبعاد!
🔥 طاقة هائلة تم اكتشافها!

━━━━━━━━━━━━━━

👑 ${character.name}

🌟 التصنيف : SSS
⚔️ القوة : ${character.power}

━━━━━━━━━━━━━━

🎊 مبارك!

لقد حصلت على إحدى أندر الشخصيات في اللعبة

🌌 الأنمي : ${character.anime}

🏆 هذه الشخصية تمتلك قوة تتجاوز حدود الأساطير${pityText}`
    })
}

if (!fs.existsSync(imagePath)) {

    return sock.sendMessage(msg.key.remoteJid, {
        text:

`❌ الصورة غير موجودة

الاسم: ${character.name}
المسار: ${character.image}`
})
}

return sock.sendMessage(msg.key.remoteJid, {
    image: fs.readFileSync(imagePath),

    caption:

`╭━━〔 ✦ 𝐂𝐇𝐀𝐑𝐀𝐂𝐓𝐄𝐑 𝐑𝐄𝐒𝐔𝐋𝐓 ✦ 〕━━╮

🧿 𝑵𝒂𝒎𝒆 ➤ ${character.name}
🌟 𝑹𝒂𝒓𝒊𝒕𝒚 ➤ ${character.rarity}
⚔️ 𝑷𝒐𝒘𝒆𝒓 ➤ ${character.power}
🌌 𝑨𝒏𝒊𝒎𝒆 ➤ ${character.anime}

🎟️ السحبات المتبقية ➤ ${player.pulls}/5
🎯 عداد الضمان ➤ ${player.sssPity}/30

╰━━━━━━━━━━━━━━━━━━━━━━╯`
})
}

        // =========================
        // .شخصياتي
        // =========================

if (text === '.شخصياتي') {

    try {

        let player =
            await Player.findOne({
                userId
            })

        if (!player) {

            player =
                await Player.create({
                    userId,
                    characters: []
                })
        }

        if (
            !player.characters ||
            player.characters.length === 0
        ) {

            return safeSend(
                msg.key.remoteJid,
                {
                    text:
                    '📭 لا توجد شخصيات لديك'
                }
            )
        }

        const evolutionRanks = [
            "SSS",
            "SSS+",
            "SSS++",
            "UR I",
            "UR II",
            "UR III",
            "EX"
        ]

        let txt =
`👤 ━━〔 شخصياتك 〕━━ 👤

`

player.characters.forEach((c, i) => {

    const rank =
        c.evolutionLevel > 0
            ? [
                "SSS",
                "SSS+",
                "SSS++",
                "UR I",
                "UR II",
                "UR III",
                "EX"
            ][c.evolutionLevel]
            : c.rarity

    txt +=
`〔${i + 1}〕 ${c.name}
⚔️ ${c.power} │ 🌟 ${rank}

━━━━━━━━━━━━━━━

`
})

txt +=
`📦 إجمالي الشخصيات: ${player.characters.length}/${player.maxCharacters}`

        return safeSend(
            msg.key.remoteJid,
            {
                text: txt
            }
        )

    } catch (err) {

        console.log(
            'my characters error:',
            err
        )

        return safeSend(
            msg.key.remoteJid,
            {
                text:
                '❌ حدث خطأ في عرض الشخصيات'
            }
        )
    }
}


                    

        
// =========================
// .رصيدي
// =========================

if (text === '.رصيدي') {

    try {

        let player = await Player.findOne({ userId })

        if (!player) {

            return safeSend(msg.key.remoteJid, {
                text: '❌ لا تملك حساباً'
            })
        }

        return safeSend(msg.key.remoteJid, {
            text:

`╔════════════════════╗
💰 𝐏𝐑𝐎𝐅𝐈𝐋𝐄
╚════════════════════╝

💳 الرصيد:

${player.money || 0}

🎟️ السحبات:

${player.pulls || 0}

🎫 تذاكر المتجر:

${player.towerTickets || 0}

🥚 تذاكر البيض:

${player.eggTickets || 0}

📦 البيوض:

${player.beastEggs || 0}

━━━━━━━━━━━━━━━━━━

🎖️ المستوى:

${player.level || 1}

⚔️ القتالات المتبقية:

${player.fights || 0}/5

╔════════════════════╗
🌟 𝐏𝐋𝐀𝐘𝐄𝐑 𝐈𝐍𝐅𝐎
╚════════════════════╝`
        })

    } catch (err) {

        console.log('Balance error:', err)

        return safeSend(msg.key.remoteJid, {
            text: '❌ حدث خطأ أثناء جلب بياناتك'
        })
    }

}
        
// =========================
// .عرض
// =========================

if (text.startsWith('.عرض')) {

try {

    const args = text.split(' ')
    const number = Number(args[1]) - 1

    if (isNaN(number)) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ استخدم: .عرض رقم_الشخصية'
        })
    }

    let player = await Player.findOne({ userId })

    if (!player || !player.characters?.length) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ لا تملك شخصيات'
        })
    }

    const owned = player.characters[number]

if (!owned) {

    return safeSend(msg.key.remoteJid, {
        text: '❌ رقم الشخصية غير موجود'
    })

}

const latest =
    characters.find(
        c =>
            c.name === owned.name &&
            c.rarity === owned.rarity &&
            c.form === owned.form
    )

const character = latest
? {
    ...owned,
    image: latest.image,
    anime: latest.anime,
    ability: latest.ability,
    rarity: latest.rarity,
    form: latest.form || owned.form
}
: owned


    const captionSSS =
`┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓

            👑 ${character.name}

┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🌠 RARITY
➜ ${character.rarity}

⚔ POWER
➜ ${character.power}

🌌 ANIME
➜ ${character.anime}

✨ SKILL
➜ ${character.ability || "لا توجد"}

🔥 FORM
➜ ${character.form || "الأساسية"}

💎 EVOLUTION
➜ +${character.evolutionLevel || 0}

━━━━━━━━━━━━━━━━━━━━━━

📖 معلومات الشخصية من مجموعتك.`

    const captionNormal = `╔════════════════════╗
🖼️ 𝐂𝐇𝐀𝐑𝐀𝐂𝐓𝐄𝐑
╚════════════════════╝

🧿 الاسم:
${character.name}

🌟 الندرة:
${character.rarity}

⚔️ القوة:
${character.power}

🌌 الأنمي:
${character.anime}

✨ القدرة:
${character.ability || 'لا توجد'}`

    // شخصيات SSS من رابط خارجي
    if (character.rarity === 'SSS') {

        return sock.sendMessage(msg.key.remoteJid, {
            image: {
                url: character.image
            },
            caption: captionSSS
        })

    }

    // الشخصيات العادية من ملفات البوت
    const imagePath = path.join(__dirname, character.image)

    if (!fs.existsSync(imagePath)) {
        return safeSend(msg.key.remoteJid, {
            text: `❌ صورة الشخصية غير موجودة

الاسم: ${character.name}
المسار: ${character.image}`
        })
    }

    return sock.sendMessage(msg.key.remoteJid, {
        image: fs.readFileSync(imagePath),
        caption: captionNormal
    })

} catch (err) {

    console.log('Show Character Error:', err)

    return safeSend(msg.key.remoteJid, {
        text: '❌ حدث خطأ أثناء عرض الشخصية'
    })
}

}
        
 // =========================
// .شراءمتجر
// =========================

if (text.startsWith('.شراءمتجر')) {

    try {

        const args = text.split(' ')
        const itemNumber = Number(args[1]) - 1

        const shop = await Shop.find()

        const item = shop[itemNumber]

        if (!item) {

            return safeSend(msg.key.remoteJid, {
                text: '❌ العرض غير موجود'
            })
        }

        let player = await Player.findOne({ userId })

        if (!player) {

            return safeSend(msg.key.remoteJid, {
                text: '❌ لا تملك حساباً'
            })
        }

        player.money = player.money || 0
        player.characters = player.characters || []

        if (player.money < item.price) {

            return safeSend(msg.key.remoteJid, {
                text:
`❌ لا تملك مالاً كافياً

💰 المطلوب: ${item.price}
💳 رصيدك: ${player.money}`
            })
        }

      if (
    player.characters.length >=
    (player.maxCharacters || 30)
) {

            return safeSend(msg.key.remoteJid, {
                text: '❌ وصلت للحد الأقصى (30 شخصية)'
            })
        }

        player.money -= item.price

        player.characters.push(item.character)

        await player.save()

        await Shop.findByIdAndDelete(item._id)

        return safeSend(msg.key.remoteJid, {
            text:

`╔════════════════════╗
        🏪 𝐒𝐇𝐎𝐏
╚════════════════════╝

✅ تم شراء الشخصية بنجاح

🧿 الاسم:
${item.character.name}

🌟 الندرة:
${item.character.rarity}

⚔️ القوة:
${item.character.power}

💰 السعر:
${item.price}

💳 رصيدك الحالي:
${player.money}

━━━━━━━━━━━━━━━━━━

🎉 تمت إضافة الشخصية إلى مجموعتك`
        })

    } catch (err) {

        console.log('Shop Buy Error:', err)

        return safeSend(msg.key.remoteJid, {
            text: '❌ حدث خطأ أثناء الشراء'
        })
    }
}

        // =========================
        // .بيع
        // =========================

        if (text.startsWith('.بيع')) {

try {

    const args = text.split(' ').slice(1)

    if (!args.length) {

        return safeSend(msg.key.remoteJid, {
            text:

`❌ استخدم الأمر هكذا

.بيع 1

أو

.بيع 1 2 3 4`
})
}

    let player = await Player.findOne({ userId })

    if (!player) {

        return safeSend(msg.key.remoteJid, {
            text: '❌ لا تملك حساباً'
        })
    }

    player.characters = player.characters || []

    const indexes =
        [...new Set(
            args
                .map(x => Number(x) - 1)
                .filter(x => !isNaN(x))
        )]
        .sort((a, b) => b - a)

    let totalMoney = 0
    let soldCount = 0

    for (const index of indexes) {

    const character =
        player.characters[index]

    if (!character)
        continue

    const sellPrice = Math.max(
        100,
        Math.floor(character.power / 2)
    )

    // هنا أضف الكود
    const isRare =
    character.rarity === 'SSS'

const isEvolved =
    character.evolutionLevel > 0

if (isRare || isEvolved) {

    pendingSellConfirm.set(userId, {
        index,
        character,
        price: sellPrice
    })

    const rank =
        character.evolutionLevel > 0
            ? `مطور +${character.evolutionLevel}`
            : character.rarity

    return safeSend(msg.key.remoteJid, {
        text:

`⚠️ تأكيد بيع شخصية مهمة

👤 ${character.name}
🌟 ${rank}
⚔️ ${character.power}

💰 سعر البيع:
${sellPrice}

اكتب:
.نعم

أو

.لا`
    })
}

    totalMoney += sellPrice
    soldCount++

    player.characters.splice(index, 1)
}

    if (soldCount === 0) {

        return safeSend(msg.key.remoteJid, {
            text: '❌ لم يتم العثور على شخصيات صالحة للبيع'
        })
    }

    player.money =
        (player.money || 0) + totalMoney

    await player.save()

    return safeSend(msg.key.remoteJid, {
        text:

`💰 ━━〔 𝐒𝐄𝐋𝐋 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 〕━━ 💰

✅ تم بيع ${soldCount} شخصية

💵 إجمالي الأرباح:
${totalMoney}

💳 رصيدك الحالي:
${player.money}`
})

} catch (err) {

    console.log('Sell error:', err)

    return safeSend(msg.key.remoteJid, {
        text: '❌ حدث خطأ أثناء البيع'
    })
}

}
    
if (text === '.نعم') {

    const confirm = pendingSellConfirm.get(userId)

    if (!confirm) return

    const player = await Player.findOne({ userId })

    if (!player) return

    player.characters.splice(confirm.index, 1)

    player.money += confirm.price

    await player.save()

    pendingSellConfirm.delete(userId)

    return safeSend(msg.key.remoteJid, {
        text:

`✅ تم بيع الشخصية

👤 ${confirm.character.name}

💰 +${confirm.price}

💳 الرصيد:
${player.money}`
    })
}

if (text === '.لا') {

    if (!pendingSellConfirm.has(userId)) return

    pendingSellConfirm.delete(userId)

    return safeSend(msg.key.remoteJid, {
        text: '❌ تم إلغاء عملية البيع'
    })
}

    async function cleanMarket() {

    const expired = await Market.find({
        createdAt: {
            $lte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
    })

    for (const item of expired) {

        try {

            const seller = await Player.findOne({
                userId: item.seller
            })

            if (seller) {

                seller.characters.push(item.character)

                await seller.save()

            }

            await Market.findByIdAndDelete(item._id)

            console.log(
                `📦 Returned ${item.character.name} to ${item.seller}`
            )

        } catch (err) {

            console.log(
                'Market Return Error:',
                err
            )

        }

    }

}

// =========================
// .مزاد
// =========================

if (text.startsWith('.مزاد')) {

    try {

        const args = text.trim().split(' ')

const price = Number(args.pop())
const charPower = Number(args.pop())
const charName = args.slice(1).join(' ')

        if (!charName || isNaN(charPower) || isNaN(price)) {

            return safeSend(msg.key.remoteJid, {
                text:
`❌ استخدم الأمر هكذا

.مزاد اسم_الشخصية القوة السعر

مثال:
.مزاد Hashirama 2300 5000`
            })
        }

        let player = await Player.findOne({ userId })

        if (!player) {

            return safeSend(msg.key.remoteJid, {
                text: '❌ لا تملك حساباً'
            })
        }

        player.characters = player.characters || []

        const charIndex =
    player.characters.findIndex(c =>
        c.name.toLowerCase().trim() === charName.toLowerCase().trim() &&
        Number(c.power) === charPower
    )

        if (charIndex === -1) {

            return safeSend(msg.key.remoteJid, {
                text: '❌ الشخصية غير موجودة لديك'
            })
        }

        const character =
            player.characters[charIndex]

        await Market.create({
            seller: userId,
            character,
            price
        })

        player.characters.splice(charIndex, 1)

        await player.save()

    return safeSend(msg.key.remoteJid, {
        text: `╔════════════════════╗
🏪 𝐀𝐔𝐂𝐓𝐈𝐎𝐍
╚════════════════════╝

✅ تم عرض الشخصية في السوق

🧿 الاسم :
${character.name}

🌟 الندرة :
${character.rarity}

⚔️ القوة :
${character.power}

💰 السعر :
${price}

━━━━━━━━━━━━━━━━━━

🛒 يمكن للاعبين الآن شراء الشخصية

💡 للعرض:
.السوق`
    })

} catch (err) {

        console.log('Auction error:', err)

        return safeSend(msg.key.remoteJid, {
            text: '❌ حدث خطأ أثناء إنشاء المزاد'
        })
    }

} // <-- إغلاق if (text.startsWith('.مزاد'))

        // =========================
        // .السوق
        // =========================

        if (text === '.السوق') {

    try {

        await cleanMarket()

        const market = await Market.find().sort({
            price: 1
        })

        if (!market.length) {
            return safeSend(msg.key.remoteJid, {
                text:
`╭━━━〔 🏪 السوق العالمي 〕━━━╮

📭 لا توجد شخصيات معروضة حالياً

╰━━━━━━━━━━━━━━━━━━╯`
            })
        }

        let txt =
`╔══════════════╗
🏪 السوق العالمي
╚══════════════╝

📌 الترتيب من الأرخص إلى الأغلى

`

        market.forEach((item, i) => {

    const expireAt =
        new Date(item.createdAt).getTime() +
        24 * 60 * 60 * 1000

    let remaining =
        Math.max(0, expireAt - Date.now())

    const hours =
        String(Math.floor(remaining / 3600000)).padStart(2, "0")

    remaining %= 3600000

    const minutes =
        String(Math.floor(remaining / 60000)).padStart(2, "0")

    remaining %= 60000

    const seconds =
        String(Math.floor(remaining / 1000)).padStart(2, "0")

    const timeLeft =
        `${hours}:${minutes}:${seconds}`

    txt +=
`╭─〔 #${i + 1} 〕─╮
🧿 الاسم : ${item.character.name}
🌟 الندرة : ${item.character.rarity}
⚔️ القوة : ${item.character.power}
💰 السعر : ${item.price.toLocaleString()}
⏳ يعود خلال : ${timeLeft}
╰──────────╯

`

})

        txt +=
`━━━━━━━━━━━━━━━━━━
💡 للشراء:

.شراء رقم_العرض`

        return safeSend(msg.key.remoteJid, {
            text: txt
        })

    } catch (err) {

        console.log('Market error:', err)

        return safeSend(msg.key.remoteJid, {
            text: '❌ حدث خطأ في عرض السوق'
        })
    }
}

        // =========================
        // .شراء
        // =========================

    if (text.startsWith('.شراء') &&
    !text.startsWith('.شراءمتجر') &&
    !text.startsWith('.شراءصندوق')) {

    try {

        await cleanMarket()

        const args = text.split(' ')
        const itemNumber = Number(args[1]) - 1

        const market = await Market.find().sort({
            price: 1
        })

        const item = market[itemNumber]

        if (!item || !item.character) {
            return safeSend(msg.key.remoteJid, {
                text: '❌ العرض غير موجود'
            })
        }

        

        let player = await Player.findOne({ userId })

        if (!player) {
            player = new Player({
                userId,
                characters: [],
                money: 0
            })
        }

        player.characters = player.characters || []
        player.money = player.money || 0

        if (player.money < item.price) {
            return safeSend(msg.key.remoteJid, {
                text:
`❌ لا تملك مالاً كافياً

💰 المطلوب: ${item.price}

💳 رصيدك: ${player.money}`
            })
        }

        if (player.characters.length >= (player.maxCharacters || 30)) {
            return safeSend(msg.key.remoteJid, {
                text:
`❌ المخزون ممتلئ

📦 السعة الحالية:
${player.maxCharacters || 30}`
            })
        }

        player.money -= item.price
        player.characters.push(item.character)

        const seller = await Player.findOne({
            userId: item.seller
        })

        if (seller) {
            seller.money = (seller.money || 0) + item.price
            await seller.save()
        }

        await player.save()

        await Market.findByIdAndDelete(item._id)

        return safeSend(msg.key.remoteJid, {
            text:
`╔════════════════════╗
🛒 𝐏𝐔𝐑𝐂𝐇𝐀𝐒𝐄
╚════════════════════╝

✅ تم شراء الشخصية بنجاح

🧿 الاسم :
${item.character.name}

🌟 الندرة :
${item.character.rarity}

⚔️ القوة :
${item.character.power}

💰 السعر :
${item.price}

💳 رصيدك الحالي :
${player.money}

━━━━━━━━━━━━━━━

🎉 تمت إضافة الشخصية إلى مجموعتك`
        })

    } catch (err) {

        console.log('Buy error:', err)

        return safeSend(msg.key.remoteJid, {
            text: '❌ حدث خطأ أثناء عملية الشراء'
        })

    }

}


// =========================
// .شراء
// =========================

if (text === '.متجر') {

    try {

        const shop = await Shop.find()

        if (!shop.length) {
            return safeSend(msg.key.remoteJid, {
                text: '❌ لا توجد شخصيات في المتجر حالياً'
            })
        }

        let txt =
`╔════════════════════╗
        🏪 𝐂𝐇𝐀𝐑𝐀𝐂𝐓𝐄𝐑 𝐒𝐇𝐎𝐏
╚════════════════════╝

🎁 يتم تجديد المتجر كل ساعة

━━━━━━━━━━━━━━━━━━

`

        shop.forEach((item, i) => {

            txt +=
`╭────〔 ${i + 1} 〕────╮
🧿 الاسم : ${item.character.name}
🌟 الندرة : ${item.character.rarity}
⚔️ القوة : ${item.character.power}
🎭 الشكل : ${item.character.form || 'عادي'}
✨ القدرة : ${item.character.ability || 'لا يوجد'}
💰 السعر : ${item.price}
╰────────────────╯

`
        })

        txt +=
`━━━━━━━━━━━━━━━━━━

🛒 للشراء:

.شراءمتجر رقم_العرض

مثال:
.شراءمتجر 1`

        return safeSend(msg.key.remoteJid, { text: txt })

    } catch (err) {

        console.log('Shop error:', err)

        return safeSend(msg.key.remoteJid, {
            text: '❌ حدث خطأ أثناء فتح المتجر'
        })
    }
}
        
// =========================
// .قتال_مجموع
// =========================


        if (text.startsWith('.قتال_مجموع')) {

try {
    
    
    const mentioned =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

    if (!mentioned || !mentioned[0]) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ استخدم منشن\n\nمثال:\n.قتال_مجموع @user'
        });
    }

    const targetId = mentioned[0];

    const me = await Player.findOne({ userId });
const enemy = await Player.findOne({ userId: targetId });

if (!me || !enemy) {
    return safeSend(msg.key.remoteJid, {
        text: '❌ أحد اللاعبين لا يملك حساباً'
    });
}

me.rewardedLevels = me.rewardedLevels || [];
me.specialAbilities = me.specialAbilities || [];
    
    if (me.fights == null) me.fights = 5;
if (!me.lastFightReset) me.lastFightReset = Date.now();

const now = Date.now();
const fightCooldown = 30 * 60 * 1000;

if (now - me.lastFightReset >= fightCooldown) {
    me.fights = 5;
    me.lastFightReset = now;
    }

    if ((me.fights || 0) <= 0) {

        const remaining = fightCooldown - (now - me.lastFightReset);

        const minutes = Math.floor(remaining / (1000 * 60));

        return safeSend(msg.key.remoteJid, {
            text:
`❌ انتهت محاولات القتال

⚔️ المتبقي: 0/5

🕒 الوقت المتبقي: ${minutes} دقيقة

🔄 تتجدد المحاولات كل 30 دقيقة`
        });
    }

    if (!me.characters?.length) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ لا تملك شخصيات'
        });
    }

    if (!enemy.characters?.length) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ الخصم لا يملك شخصيات'
        });
    }

    let myPower =
        me.characters.reduce((sum, c) => sum + Number(c.power || 0), 0);

    let enemyPower =
        enemy.characters.reduce((sum, c) => sum + Number(c.power || 0), 0);

    let myAttack = myPower
let enemyAttack = enemyPower;

let myAbilityName = 'بدون';
let myAbilityDescription = 'لا يوجد';
let myAbilityTier = 'عادية';

let enemyAbilityName = 'بدون';
let enemyAbilityDescription = 'لا يوجد';
let enemyAbilityTier = 'عادية';

let reducedReward = false;

    const common = [
        ['🔥 غضب المحارب','يزيد القوة بنسبة 30%',() => { myAttack += Math.floor(myAttack * 0.30) }],
        ['💥 الضربة الحرجة','يزيد القوة بنسبة 50%',() => { myAttack += Math.floor(myAttack * 0.50) }],
        ['🛡️ درع الحماية','يقلل ضرر الخصم بنسبة 25%',() => { enemyAttack -= Math.floor(enemyAttack * 0.25) }],
        ['🔄 الكاونتر','يعكس 20% من قوة الخصم عليه',() => { enemyAttack -= Math.floor(enemyAttack * 0.20) }],
        ['🃏 نين متطور','يزيد القوة بنسبة 40%',() => { myAttack += Math.floor(myAttack * 0.40) }],
        ['🌊 تنفس الماء','يزيد القوة بنسبة 45%',() => { myAttack += Math.floor(myAttack * 0.45) }],
        ['🔵 طور الناسك','يزيد القوة بنسبة 35%',() => { myAttack += Math.floor(myAttack * 0.35) }]
    ];

    const rare = [
        ['🍈 أكل فاكهة شيطان','يزيد القوة بنسبة 50%',() => { myAttack += Math.floor(myAttack * 0.50) }],
        ['⚔️ بانكاي','يزيد القوة بنسبة 40%',() => { myAttack += Math.floor(myAttack * 0.40) }],
        ['⚔️ هاكي التصلب المتقدم','يزيد القوة بنسبة 55%',() => { myAttack += Math.floor(myAttack * 0.55) }],
        ['🟡 سوبر سايان','يزيد القوة بنسبة 60%',() => { myAttack += Math.floor(myAttack * 0.60) }],
        ['⚡ تنفس البرق','يزيد القوة بنسبة 70%',() => { myAttack += Math.floor(myAttack * 0.70) }],
        ['👁️ مانغيكيو شارينغان','يزيد القوة بنسبة 45%',() => { myAttack += Math.floor(myAttack * 0.45) }],
        ['👑 قوة الكوينشي','يزيد القوة بنسبة 50%',() => { myAttack += Math.floor(myAttack * 0.50) }],
        ['⚡ الغريزة الفائقة','تفادي',() => {
            if (Math.random() <= 0.30) enemyAttack = 0;
        }],
        ['🌪️ الاستبدال','تفادي',() => { enemyAttack = 0 }]
    ];

    const legendary = [
        ['🔴 سوبر سايان غود','يزيد القوة بنسبة 90%',() => { myAttack += Math.floor(myAttack * 0.90) }],
        ['🔥 تنفس الشمس','يزيد القوة بنسبة 90%',() => { myAttack += Math.floor(myAttack * 0.90) }],
        ['👑 هاكي الملوك','يضعف الخصم 25%',() => { enemyAttack -= Math.floor(enemyAttack * 0.25) }],
        ['🖤 أنتي ماجيك','يقلل الخصم 40%',() => { enemyAttack -= Math.floor(enemyAttack * 0.40) }],
        ['👁️ العين الشاملة','يقلل الخصم 30%',() => { enemyAttack -= Math.floor(enemyAttack * 0.30) }],
        ['🔥 أماتيراسو','يقلل الخصم 20%',() => { enemyAttack -= Math.floor(enemyAttack * 0.20) }],
        ['⚔️ سوسانو الكامل','يزيد القوة 90%',() => { myAttack += Math.floor(myAttack * 0.90) }],
        ['👑 ملك السحر','يزيد القوة 90%',() => { myAttack += Math.floor(myAttack * 0.90) }],
        ['👑 ملك اللعنات','يزيد القوة 100%',() => { myAttack += Math.floor(myAttack * 1.00) }],
        ['⚙️ جير 5','يزيد القوة 80%',() => { myAttack += Math.floor(myAttack * 0.80) }],
        ['♾️ اللانهاية','يقلل الخصم 40%',() => { enemyAttack -= Math.floor(enemyAttack * 0.40) }]
    ];

    const epic = [
        ['🐉 نيكا','يزيد القوة 100%',() => { myAttack += Math.floor(myAttack * 1.00) }],
        ['🌀 كسر الحدود','يزيد القوة 200%',() => { myAttack += Math.floor(myAttack * 2.00) }],
        ['🎲 الحظ المطلق','×2',() => { myAttack *= 2 }],
        ['🌟 قوة البطل المختار','×2',() => { myAttack *= 2 }],
        ['🌌 الصحوة الكاملة','×2.5',() => { myAttack *= 2.5 }],
        ['👊 البوابة الثامنة','+70%',() => {
            myAttack += Math.floor(myAttack * 0.70);
            reducedReward = true;
        }]
    ];

    const tierChance = Math.random() * 100;

let selectedPool;

if (tierChance <= 50) {
    selectedPool = common;
    myAbilityTier = 'عادية';
} else if (tierChance <= 80) {
    selectedPool = rare;
    myAbilityTier = 'نادرة';
} else if (tierChance <= 95) {
    selectedPool = legendary;
    myAbilityTier = 'أسطورية';
} else {
    selectedPool = epic;
    myAbilityTier = 'ملحمية';
}

    // قدرة اللاعب
    const myAbility =
        selectedPool[Math.floor(Math.random() * selectedPool.length)];

    myAbilityName = myAbility[0];
    myAbilityDescription = myAbility[1];
    

    myAbility[2]();

    // قدرة العدو
    const enemyTierChance = Math.random() * 100;

    let enemyPool;

    if (enemyTierChance <= 50) enemyPool = common;
    else if (enemyTierChance <= 80) enemyPool = rare;
    else if (enemyTierChance <= 95) enemyPool = legendary;
    else enemyPool = epic;

    const enemyAbility =
        enemyPool[Math.floor(Math.random() * enemyPool.length)];

    enemyAbilityName = enemyAbility[0];
    enemyAbilityDescription = enemyAbility[1];

    const oldMyAttack = myAttack;

    myAttack = enemyAttack;
    enemyAbility[2]();
    enemyAttack = myAttack;
    myAttack = oldMyAttack;

    const finalMyAttack = Math.floor(myAttack);
    const finalEnemyAttack = Math.floor(enemyAttack);

    let winner;
    let reward;
    let winnerId;

    if (finalMyAttack >= finalEnemyAttack) {

    winnerId = userId;
    winner = 'أنت';
    reward = Math.max(
        500,
        Math.floor(enemyPower / 10)
    );

    // مهمة الفوز اليومية
    if (me.dailyMissions) {

        me.dailyMissions.wins += 1;

        me.markModified(
            'dailyMissions'
        );
    }

} else {
        winnerId = targetId;
        winner = 'الخصم';
        reward = Math.max(500, Math.floor(myPower / 10));
    }

    me.money = (me.money || 0) + reward;
    me.xp = (me.xp || 0) + 100;

    let levelUpMessage = '';

while ((me.xp || 0) >= Math.floor(300 + (me.level * 150))) {

    const neededXp = Math.floor(300 + (me.level * 150));

    me.xp -= neededXp;
me.level += 1;

// المستوى الجديد
const currentLevel = me.level;

levelUpMessage += `🎉 وصلت إلى المستوى ${currentLevel}\n`;
levelUpMessage += `💰 حصلت على 500 مال\n`;

const ability =
    currentLevel <= 100
        ? levelAbilities[currentLevel]
        : null;

if (ability) {

    me.specialAbilities = me.specialAbilities || [];

    if (!me.specialAbilities.includes(ability.name)) {

        me.specialAbilities.push(ability.name);

        me.attackBonus = me.attackBonus || 0;
        me.defenseBonus = me.defenseBonus || 0;
        me.critBonus = me.critBonus || 0;
        me.dodgeBonus = me.dodgeBonus || 0;
        me.reflectBonus = me.reflectBonus || 0;
        me.lifestealBonus = me.lifestealBonus || 0;
        me.bossDamageBonus = me.bossDamageBonus || 0;

        switch (ability.type) {
            case "attack": me.attackBonus += ability.value; break;
            case "defense": me.defenseBonus += ability.value; break;
            case "crit": me.critBonus += ability.value; break;
            case "dodge": me.dodgeBonus += ability.value; break;
            case "reflect": me.reflectBonus += ability.value; break;
            case "lifesteal": me.lifestealBonus += ability.value; break;
            case "bossDamage": me.bossDamageBonus += ability.value; break;
        }

        levelUpMessage += `
✨ قدرة جديدة

${ability.name}

📜 ${ability.description}

📈 التأثير: +${ability.value}%
`;
    }
}

me.money += 500;

// 🟢 زيادة المخزون كل 10 مستويات (حتى 200)
if (currentLevel % 10 === 0) {

    me.maxCharacters = (me.maxCharacters || 30) + 5;

    levelUpMessage += `
📦 زيادة المخزون

➕ +5 شخصيات

📦 السعة الجديدة:
${me.maxCharacters}
`;
}

me.rewardedLevels ||= [];

me.boxes ||= {
    basic: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
    sss_chance: 0,
    sss_high: 0
};

if (!me.rewardedLevels.includes(currentLevel)) {

    const rewardLevel =
        currentLevel > 100 && currentLevel < 200
            ? currentLevel - 100
            : currentLevel;

    switch (rewardLevel) {

        case 10:
            me.boxes.basic += 5;
            levelUpMessage += `🎁 حصلت على 5 صناديق عادية\n`;
            break;

        case 20:
            me.boxes.rare += 3;
            levelUpMessage += `🎁 حصلت على 3 صناديق نادرة\n`;
            break;

        case 30:
            me.boxes.rare += 5;
            levelUpMessage += `🎁 حصلت على 5 صناديق نادرة\n`;
            break;

        case 40:
            me.boxes.epic += 2;
            levelUpMessage += `🎁 حصلت على 2 صندوق ملحمي\n`;
            break;

        case 50:
            me.boxes.epic += 4;
            levelUpMessage += `🎁 حصلت على 4 صناديق ملحمية\n`;
            break;

        case 60:
            me.boxes.legendary += 1;
            levelUpMessage += `🎁 حصلت على صندوق أسطوري\n`;
            break;

        case 70:
            me.boxes.legendary += 2;
            levelUpMessage += `🎁 حصلت على 2 صندوق أسطوري\n`;
            break;

        case 80:
            me.boxes.legendary += 3;
            levelUpMessage += `🎁 حصلت على 3 صناديق أسطورية\n`;
            break;

        case 90:
            me.boxes.sss_chance += 1;
            levelUpMessage += `🎁 حصلت على صندوق فرصة SSS\n`;
            break;
    }

    // مكافأة خاصة 100
    if (currentLevel === 100) {

        me.boxes.sss_high += 1;

        levelUpMessage += `👑 حصلت على صندوق SSS عالي\n`;

    }

    // مكافأة خاصة 150
    if (currentLevel === 150) {

        me.boxes.sss_chance += 5;
        me.boxes.sss_high += 3;

        levelUpMessage +=
`🎉 وصلت إلى المستوى 150

🎁 SSS Chance ×5
🎁 SSS High ×3
`;

    }

    // مكافأة خاصة 200
    
if (currentLevel === 200) {

    me.money += 2000000

    me.boxes.sss_chance += 5
    me.boxes.sss_high += 5

    const sssCharacters = characters.filter(
        c => c.rarity === 'SSS'
    )

    if (sssCharacters.length) {

        const character = JSON.parse(
            JSON.stringify(
                sssCharacters[
                    Math.floor(
                        Math.random() *
                        sssCharacters.length
                    )
                ]
            )
        )

        character.originalPower = character.power
        character.evolutionLevel = 0
        character.currentHp = character.power
        character.dead = false
        character.urAbilities = []

        me.characters.push(character)

        levelUpMessage +=
`👑 وصلت إلى أعلى مستوى!

💰 2,000,000

🎁 SSS Chance ×5
🎁 SSS High ×5

🌟 حصلت على شخصية SSS عشوائية

👤 ${character.name}`
    }

}

    me.rewardedLevels.push(currentLevel);
}

// الحد الأقصى للمستوى
if (me.level >= 200) {

    me.level = 200;
    me.xp = 0;
    break;

}
}

me.fights -= 1;
await me.save();

if (levelUpMessage) {
    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text: `🎉 مبروك @${userId.split('@')[0]}

${levelUpMessage}`,
            mentions: [userId]
        }
    );
}

const battleMessage = `⚔️ ══〔 GRAND BATTLE〕══ ⚔️
👤 مجموع قوتك:
${myPower}

👥 مجموع قوة الخصم:
${enemyPower}

━━━━━━━━━━━━━━━━━━

✨ قدرتك:
${myAbilityName}

📖 الوصف:
${myAbilityDescription}

🏷️ التصنيف:
${myAbilityTier}

━━━━━━━━━━━━━━━━━━

✨ قدرة الخصم:
${enemyAbilityName}

📖 الوصف:
${enemyAbilityDescription}

🏷️ التصنيف:
${enemyAbilityTier}

━━━━━━━━━━━━━━━━━━

⚔️ قوتك النهائية:
${Math.floor(myAttack)}

🛡️ قوة الخصم النهائية:
${Math.floor(enemyAttack)}

━━━━━━━━━━━━━━━━━━

👑 الفائز:
@${winnerId.split('@')[0]}

💰 المكافأة:
${reward}

🎖️ المستوى:
${me.level}

⭐ الخبرة:
${me.xp}

⚔️ القتالات المتبقية:
${me.fights}/5`;

return safeSend(msg.key.remoteJid, {
    text: battleMessage,
    mentions: [winnerId || userId || targetId]
});

 } catch (err) {

        console.log(err);

        return safeSend(msg.key.remoteJid, {
            text: '❌ حدث خطأ أثناء القتال'
        });
    }

} // ← إغلاق if
        
        // =========================
        // .قتال
        // =========================

    
if (text.startsWith('.قتال')) {

    try {

        const args = text.trim().split(' ')

        const charPower = Number(args[args.length - 2])
        const charName = args.slice(1, -2).join(' ')

        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid

        if (!mentioned || !mentioned[0]) {
            return safeSend(msg.key.remoteJid, {
                text: '❌ استخدم منشن\n\nمثال:\n.قتال Hashirama 2300 @user'
            })
        }

        const target = mentioned[0]

        const me = await Player.findOne({ userId })
        const enemy = await Player.findOne({ userId: target })

        if (!me) {
            return safeSend(msg.key.remoteJid, { text: '❌ لا تملك حساباً' })
        }

        if (!enemy) {
            return safeSend(msg.key.remoteJid, { text: '❌ الخصم لا يملك حساباً' })
        }

        // =====================
        // تجهيز البيانات
        // =====================

        me.abilities = me.abilities || []
        enemy.abilities = enemy.abilities || []

        const safeLevelAbilities = levelAbilities || {}

        function getLevelAbilities(level) {
            const result = []
            for (let lvl in safeLevelAbilities) {
                if (level >= Number(lvl)) {
                    result.push(safeLevelAbilities[lvl])
                }
            }
            return result
        }

        me.levelAbilities = getLevelAbilities(me.level || 1)
        enemy.levelAbilities = getLevelAbilities(enemy.level || 1)

        me.allAbilities = [...me.abilities, ...me.levelAbilities]
        enemy.allAbilities = [...enemy.abilities, ...enemy.levelAbilities]

        // =====================
        // نظام القتالات (Cooldown)
        // =====================

        const now = Date.now()
        const cooldown = 30 * 60 * 1000

        if (me.fights == null) me.fights = 5
        if (!me.lastFightReset) me.lastFightReset = now

        if (now - me.lastFightReset >= cooldown) {
            me.fights = 5
            me.lastFightReset = now
        }

        if (me.fights <= 0) {
            return safeSend(msg.key.remoteJid, {
                text: '⏳ انتهت القتالات اليومية (5/5)'
            })
        }

        me.characters = me.characters || []
        enemy.characters = enemy.characters || []

        const myCharacter = me.characters.find(c =>
    c.name?.toLowerCase().trim() === charName.toLowerCase().trim() &&
    Number(c.power) == Number(charPower)
)

        if (!myCharacter) {
            return safeSend(msg.key.remoteJid, {
                text: '❌ الشخصية غير موجودة لديك'
            })
        }

        if (!enemy.characters.length) {
            return safeSend(msg.key.remoteJid, {
                text: '❌ الخصم لا يملك شخصيات'
            })
        }

        // =====================
        // اختيار شخصية الخصم
        // =====================

        const sortedChars = [...enemy.characters].sort((a, b) => b.power - a.power)
        const chance = Math.random() * 100

        let enemyCharacter

        if (chance <= 30) {
            enemyCharacter = sortedChars[0]
        } else if (chance <= 70) {
            enemyCharacter = sortedChars[sortedChars.length - 1]
        } else {
            enemyCharacter = sortedChars[Math.floor(Math.random() * sortedChars.length)]
        }

        if (!enemyCharacter) {
            return safeSend(msg.key.remoteJid, {
                text: '❌ لا يمكن اختيار شخصية للخصم'
            })
        }

        // =====================
        // حساب القوة
        // =====================

        let myAttack =
            myCharacter.power +
            (me.level || 1) * 5 +
            Math.floor(Math.random() * 300)

        let enemyAttack =
            enemyCharacter.power +
            (enemy.level || 1) * 5 +
            Math.floor(Math.random() * 300)

        let finalMyAttack = myAttack
        let finalEnemyAttack = enemyAttack

        let abilityMessage = ''

        // =====================
        // القدرات
        // =====================

        for (let ab of me.allAbilities || []) {

            if (!ab) continue

            if (ab.type === "attack") {
                finalMyAttack += finalMyAttack * (ab.value || 0) / 100
            }

            if (ab.type === "defense") {
                finalEnemyAttack -= finalEnemyAttack * (ab.value || 0) / 100
            }

            if (ab.type === "crit") {
                if (Math.random() * 100 < (ab.value || 0)) {
                    finalMyAttack *= 2
                    abilityMessage += `\n⚡ كريتيكال من ${ab.name || 'قدرة'}`
                }
            }

            if (ab.type === "dodge") {
                if (Math.random() * 100 < (ab.value || 0)) {
                    finalEnemyAttack = 0
                    abilityMessage += `\n💨 مراوغة من ${ab.name || 'قدرة'}`
                }
            }

            if (ab.type === "reflect") {
                const reflected = Math.floor(finalEnemyAttack * (ab.value || 0) / 100)
                finalMyAttack += reflected
                abilityMessage += `\n🔄 عكس ضرر من ${ab.name || 'قدرة'}`
            }

            if (ab.type === "lifesteal") {
                const heal = finalMyAttack * (ab.value || 0) / 100
                me.hp = (me.hp || 100) + heal
            }
        }

        // =====================
        // تحديد الفائز
        // =====================

        const rewards = {
            'عادي': 100,
            'ممتاز': 300,
            'اسطوري': 1000,
            'SSS': 3000
        }

        let winner
        let reward = 0

        if (finalMyAttack >= finalEnemyAttack) {

            winner = me.userId || userId

            reward = rewards[enemyCharacter.rarity] || 100

            me.money = (me.money || 0) + reward
            me.xp = (me.xp || 0) + 200

        } else {

            winner = enemy.userId

            reward = rewards[myCharacter.rarity] || 100

            enemy.money = (enemy.money || 0) + reward
        }

        // =====================
        // لفل أب
        // =====================

        while ((me.xp || 0) >= Math.floor(300 + ((me.level || 1) * 150))) {

            me.xp -= Math.floor(300 + ((me.level || 1) * 150))
            me.level = (me.level || 1) + 1

            if (me.level >= 100) {
                me.level = 100
                me.xp = 0
                break
            }

            me.money = (me.money || 0) + 500
        }

        me.fights = Math.max(0, (me.fights || 0) - 1)

        // =====================
        // حفظ البيانات
        // =====================

        await me.save()
        await enemy.save()

        // =====================
        // الرسالة النهائية
        // =====================

        const battleMessage = `
╔══════════════════════╗
        ⚔️ 𝐄𝐏𝐈𝐂 𝐁𝐀𝐓𝐓𝐋𝐄 ⚔️
╚══════════════════════╝

🛡️ 𝐘𝐎𝐔𝐑 𝐂𝐇𝐀𝐑𝐀𝐂𝐓𝐄𝐑

🧿 الاسم:
${myCharacter.name || 'غير معروف'}

⚡ القوة:
${myCharacter.power}

━━━━━━━━━━━━━━━━━━

🎯 𝐄𝐍𝐄𝐌𝐘 𝐂𝐇𝐀𝐑𝐀𝐂𝐓𝐄𝐑

🧿 الاسم:
${enemyCharacter.name || 'غير معروف'}

⚡ القوة:
${enemyCharacter.power}

━━━━━━━━━━━━━━━━━━

${abilityMessage ? `✨ القدرات:\n${abilityMessage}\n━━━━━━━━━━━━━━━━━━` : ''}

🏆 الفائز:
@${(winner || userId).split('@')[0]}

💰 المكافأة:
${reward}

⭐ الخبرة:
+200

🎟️ القتالات المتبقية:
${me.fights}/5

━━━━━━━━━━━━━━━━━━
🔥 نهاية القتال
`

        return safeSend(msg.key.remoteJid, {
            text: battleMessage,
            mentions: [me.userId, enemy.userId].filter(Boolean)
        })

    } catch (err) {
        console.log(err)
        return safeSend(msg.key.remoteJid, {
            text: '❌ حدث خطأ أثناء القتال'
        })
    }
}
        

async function distributeBossRewards(sock, groupId) {

    const players = await Player.find({
        bossDamage: { $gt: 0 }
    })

    const killerId = currentBoss?.killer
    const killer =
    players.find(
        p => p.userId === currentBoss?.killer
    )

    if (!players.length) return

    players.sort((a, b) =>
        (b.bossDamage || 0) - (a.bossDamage || 0)
    )

    const first = players[0]
    const second = players[1]
    const third = players[2]


if (first) {

    first.money =
        (first.money || 0) + 10000

    first.xp =
        (first.xp || 0) + 1000

    first.boxes = first.boxes || {}

    first.boxes.sss_chance =
        (first.boxes.sss_chance || 0) + 1

    first.boxes.sss_high =
        (first.boxes.sss_high || 0) + 1

    await first.save()
}

if (second) {

    second.money =
        (second.money || 0) + 5000

    second.xp =
        (second.xp || 0) + 500

    second.boxes = second.boxes || {}

    second.boxes.sss_high =
        (second.boxes.sss_high || 0) + 1

    second.boxes.legendary =
        (second.boxes.legendary || 0) + 1

    await second.save()
}

if (third) {

    third.money =
        (third.money || 0) + 2500

    third.xp =
        (third.xp || 0) + 500

    third.boxes = third.boxes || {}

    third.boxes.legendary =
        (third.boxes.legendary || 0) + 1

    third.boxes.epic =
        (third.boxes.epic || 0) + 1

    await third.save()
}

for (let i = 3; i < players.length; i++) {

    const player = players[i]

    player.money =
        (player.money || 0) + 2500

    player.xp =
        (player.xp || 0) + 500

    player.boxes = player.boxes || {}

    player.boxes.epic =
        (player.boxes.epic || 0) + 2

    await player.save()
}

    
    if (killer) {

    killer.boxes =
        killer.boxes || {}

    killer.boxes.sss_high =
        (killer.boxes.sss_high || 0) + 1

    await killer.save()
    }

    const rankingData = players.map(p => ({
        userId: p.userId,
        damage: p.bossDamage || 0
    }))

    await Player.updateMany(
    {},
    {
        $set: {
            bossDamage: 0,
            bossHits: 0
        }
    }
)

console.log("All boss damage reset")

    const mentions = [
    ...new Set([
        ...players.map(p => p.userId),
        killerId
    ].filter(Boolean))
]

    
    let ranking = ''

    rankingData.forEach((p, i) => {
        ranking += `${i + 1}- @${p.userId.split('@')[0]}
💥 الضرر: ${p.damage}

`
    })

    console.log("BEFORE SEND MESSAGE")
console.log("groupId =", groupId)
console.log("mentions =", mentions)

await sock.sendMessage(groupId, {
    text: `🏆 اختبار رسالة الزعيم`
})

await sock.sendMessage(groupId, {
    text: `🏆 ═══════〔 نتائج الزعيم العالمي 〕══════ 🏆

🥇 ═══ المركز الأول ═══

👑 @${players[0]?.userId.split('@')[0] || 'لا يوجد'}

💰 10000 مال
⭐ 1000 XP

📦 1 SSS Chance Box
📦 1 SSS High Box

━━━━━━━━━━━━━━━━━━

🥈 ═══ المركز الثاني ═══

⚔️ @${players[1]?.userId.split('@')[0] || 'لا يوجد'}

💰 5000 مال
⭐ 500 XP

📦 1 SSS High Box
📦 1 Legendary Box

━━━━━━━━━━━━━━━━━━

🥉 ═══ المركز الثالث ═══

🔥 @${players[2]?.userId.split('@')[0] || 'لا يوجد'}

💰 2500 مال
⭐ 500 XP

📦 1 Legendary Box
📦 1 Epic Box

━━━━━━━━━━━━━━━━━━

🎖️ بقية المشاركين

💰 2500 مال
⭐ 500 XP

📦 2 Epic Boxes

━━━━━━━━━━━━━━━━━━

☠️ ═══ الضربة القاضية ═══

@${killerId?.split('@')[0] || 'لا يوجد'}

🎁 1 SSS High Box إضافي

━━━━━━━━━━━━━━━━━━

📊 ═══ الترتيب النهائي ═══

${ranking}

━━━━━━━━━━━━━━━━━━

🎉 تم توزيع جميع الجوائز بنجاح

🌍 الزعيم العالمي سقط!
⚔️ استعدوا للمعركة القادمة!`,
    mentions
})

console.log("AFTER SEND MESSAGE")

} // إغلاق distributeBossRewards

async function distributeRankingRewards(sock, groupId) {

const metadata =
    await sock.groupMetadata(groupId)

const participants =
    metadata.participants.map(
        p => p.id
    )

const players =
    await Player.find({
        userId: {
            $in: participants
        }
    })

const ranking = players.map(player => {

    const totalPower =
        (player.characters || [])
            .reduce(
                (sum, c) =>
                    sum + (c.power || 0),
                0
            )

    return {
        player,
        power: totalPower
    }
})

ranking.sort(
    (a, b) =>
        b.power - a.power
)

const top15 =
    ranking.slice(0, 15)
    if (!top15.length) return

const first = top15[0]?.player
const second = top15[1]?.player
const third = top15[2]?.player

if (first) {

    first.boxes = first.boxes || {}

    first.boxes.sss_high =
        (first.boxes.sss_high || 0) + 1

    first.boxes.sss_chance =
        (first.boxes.sss_chance || 0) + 1

    const sssChars =
        characters.filter(
            c => c.rarity === 'SSS'
        )

    if (sssChars.length) {

        const reward =
            sssChars[
                Math.floor(
                    Math.random() *
                    sssChars.length
                )
            ]

        first.characters =
            first.characters || []

        first.characters.push(
            JSON.parse(
                JSON.stringify(reward)
            )
        )
    }

    await first.save()
}

if (second) {

    second.boxes = second.boxes || {}

    second.boxes.sss_high =
        (second.boxes.sss_high || 0) + 2

    second.boxes.legendary =
        (second.boxes.legendary || 0) + 2

    await second.save()
}

if (third) {

    third.boxes = third.boxes || {}

    third.boxes.sss_high =
        (third.boxes.sss_high || 0) + 1

    third.boxes.legendary =
        (third.boxes.legendary || 0) + 2

    await third.save()
}

for (let i = 3; i < top15.length; i++) {

    const player =
        top15[i].player

    player.boxes =
        player.boxes || {}

    if (i <= 9) {

        player.boxes.legendary =
            (player.boxes.legendary || 0) + 2

        player.boxes.epic =
            (player.boxes.epic || 0) + 2

    } else {

        player.boxes.epic =
            (player.boxes.epic || 0) + 2

        player.boxes.rare =
            (player.boxes.rare || 0) + 2
    }

    await player.save()
}

let result =

`🏆 ═════〔 جوائز الترتيب 〕═════ 🏆

🥇 @${first?.userId.split('@')[0] || 'لا يوجد'}
🌌 شخصية SSS
📦 SSS High
📦 SSS Chance

🥈 @${second?.userId.split('@')[0] || 'لا يوجد'}
📦 2 SSS High
📦 2 Legendary

🥉 @${third?.userId.split('@')[0] || 'لا يوجد'}
📦 1 SSS High
📦 2 Legendary

━━━━━━━━━━━━━━

🎉 تم توزيع الجوائز على أفضل 15 لاعب`

await sock.sendMessage(
    groupId,
    {
        text: result,
        mentions: [
            first?.userId,
            second?.userId,
            third?.userId
        ].filter(Boolean)
    }
)

}
    
}) // <-- هذا الإغلاق الصحيح والوحيد لـ messages.upsert (بعد نهاية كل الأوامر)
} // <-- هذا الإغلاق الصحيح لدالة startBot بالكامل

// 3. السطر الأخير والوحيد في نهاية الملف لتشغيل البوت
startBot().catch(console.error)
