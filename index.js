const fs = require('fs')
const battleLocks = new Set();
const bankSystem = require("./bankSystem")
const animeEvents = require("./animeEvents")

// ⚡ تحسين أداء: نُقلت من داخل معالج الرسائل (كانت تُبنى من جديد
// مع كل رسالة توصل) — قيمتها ثابتة فلا داعي لإعادة إنشائها كل مرة.
const EVENT_GROUPS = [
    '120363400448225715@g.us',
    '120363020823525909@g.us',
    '120363116482407260@g.us'
]

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
const domainSystem = require('./systems/domainSystem')
const CoOp = require('./models/CoOp')
const coopManager = require('./systems/coopManager')

const coopBattle = require('./systems/coopBattle')
const heartQuiz = require("./heartQuiz")
// =========================
// 🎭 لعبة برا السالفة
// =========================
const outsideGame = require('./systems/outsideTheTopicGame')
// =========================
// 🐺 لعبة المستذئبين
// =========================
const werewolfGame = require('./systems/werewolfGame')
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
function botAvailable() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Riyadh",
        hour: "numeric",
        minute: "numeric",
        hour12: false
    }).formatToParts(new Date());

    const hour = parseInt(parts.find(p => p.type === "hour").value, 10);
    const minute = parseInt(parts.find(p => p.type === "minute").value, 10);

    // يعمل من 10:00 صباحاً حتى 12:05 منتصف الليل (بدل 12:00 — مهلة إضافية 5 دقائق)
    if (hour >= 10) return true;
    if (hour === 0 && minute < 5) return true;
    return false;
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
const worlds = require('./worlds')
const commands = require('./commands/index')
const pendingSellConfirm =
global.pendingSellConfirm ||
(global.pendingSellConfirm = new Map())
const pendingEquipSellConfirm =
global.pendingEquipSellConfirm ||
(global.pendingEquipSellConfirm = new Map())
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
    startQuickEvents,
    startSniper,
    startLucky
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

// =========================
// ⚔️ نظام الحرب - القيم الثابتة
// =========================
const WAR_MAX_PLAYERS = 6
const WAR_FLAG_LIST = ['A', 'B', 'C', 'D', 'E']
const WAR_DURATION_MS = 5 * 60 * 1000
const WAR_SCORE_TICK_MS = 10000
const WAR_SCORE_PER_FLAG = 10
const WAR_KILL_STEAL_POINTS = 15
const WAR_CAPTURE_TICK_MS = 2000
const WAR_CAPTURE_BASE_PROGRESS = 10
const WAR_CAPTURE_MAX_PLAYERS = 4

// كل لاعب إضافي من نفس الفريق على العلم يزيد سرعة الالتقاط +10% (سقف 4 لاعبين)
function getWarCaptureMultiplier(playerCount) {

    const capped =
        Math.max(
            1,
            Math.min(playerCount, WAR_CAPTURE_MAX_PLAYERS)
        )

    return 1 + (0.1 * capped)
}

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
const omegaAbilities =
    require('./omegaAbilities')
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

// =========================
// ⏳ إنهاء تحديات .تحدي تلقائيًا عند الخمول (بدون هجوم لأكثر من 5 دقائق)
// الفائز = صاحب الدم الأعلى وقت الإنهاء
// =========================
const PVP_IDLE_LIMIT_MS = 5 * 60 * 1000

async function checkIdlePvpFights(sock) {

    try {

        const now = Date.now()

        const activeFights =
            await PvP.find({ active: true })

        for (const fight of activeFights) {

            if (!fight.lastMove) continue

            const elapsed =
                now - new Date(fight.lastMove).getTime()

            if (elapsed < PVP_IDLE_LIMIT_MS) continue

            const hp1 = fight.hp1 || 0
            const hp2 = fight.hp2 || 0

            let resultText = ''

            if (hp1 === hp2) {

                resultText =
`⌛ انتهى التحدي تلقائيًا بسبب الخمول (بدون هجوم لأكثر من 5 دقائق)

🤝 تعادل بالدم (${hp1} = ${hp2})`

            } else {

                const winner =
                    hp1 > hp2 ? fight.player1 : fight.player2

                const loser =
                    winner === fight.player1
                        ? fight.player2
                        : fight.player1

                resultText =
`⌛ انتهى التحدي تلقائيًا بسبب الخمول (بدون هجوم لأكثر من 5 دقائق)

🏆 الفائز: @${winner.split('@')[0]}
💔 الخاسر: @${loser.split('@')[0]}

❤️ الدم وقت الإنهاء:
${fight.player1.split('@')[0]}: ${hp1}
${fight.player2.split('@')[0]}: ${hp2}`

            }

            try {

                await sock.sendMessage(fight.player1, {
                    text: resultText,
                    mentions: [fight.player1, fight.player2]
                })

                await sock.sendMessage(fight.player2, {
                    text: resultText,
                    mentions: [fight.player1, fight.player2]
                })

            } catch (sendErr) {

                console.log('PvP idle notify error:', sendErr)

            }

            await PvP.deleteOne({ _id: fight._id })

        }

    } catch (err) {

        console.log('PvP idle check error:', err)

    }

}

function schedulePvpIdleCheck(sock) {

    if (global.pvpIdleCheckInterval) return

    global.pvpIdleCheckInterval =
        setInterval(() => {
            checkIdlePvpFights(sock)
        }, 60000)

}

const Beast =
require('./database/Beast')
const beasts =
require('./systems/beasts')

// 🏆 نظام الإنجازات
const achievementsSystem =
require('./systems/achievements')

// يتحقق من الإنجازات، يمنح الجوائز تلقائياً، ويرسل إشعاراً فورياً
async function checkAndGrantAchievement(
    player,
    categoryKey,
    currentValue,
    sock,
    jid
) {

    if (!player || currentValue == null) return

    // 📍 نطرح خط الأساس (قيمة آخر تصفير) عشان التقدم يُحسب
    // من نقطة التصفير فقط، وما يحسب أي تراكم قديم قبلها
    const baseline =
        (player.achievementBaseline &&
        player.achievementBaseline[categoryKey]) || 0

    const effectiveValue =
        Math.max(0, currentValue - baseline)

    const unlocked =
        achievementsSystem.getNewlyUnlockedTiers(
            player,
            categoryKey,
            effectiveValue
        )

    if (!unlocked.length) return

    const categoryDef =
        achievementsSystem.ACHIEVEMENTS[categoryKey]

    let earnedSSS = null

    for (const tierDef of unlocked) {

        player.money =
            (player.money || 0) + (tierDef.money || 0)

        player.totalEarnedMoney =
            (player.totalEarnedMoney || 0) + (tierDef.money || 0)

        player.xp =
            (player.xp || 0) + (tierDef.xp || 0)

        if (tierDef.boxes) {

            player.boxes = player.boxes || {}

            for (const boxType in tierDef.boxes) {

                player.boxes[boxType] =
                    (player.boxes[boxType] || 0) +
                    tierDef.boxes[boxType]
            }
        }

        if (tierDef.sssCharacter) {

            try {

                const sssPool =
                    characters.filter(
                        c => c.rarity === 'SSS'
                    )

                if (sssPool.length) {

                    const sssChar =
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

                    player.characters =
                        player.characters || []

                    player.characters.push(sssChar)

                    earnedSSS = sssChar
                }

            } catch (e) {

                console.log(
                    'Achievement SSS grant error:',
                    e
                )
            }
        }

        if (
            tierDef.title &&
            !(player.titles || []).includes(tierDef.title)
        ) {

            player.titles =
                player.titles || []

            player.titles.push(tierDef.title)
        }
    }

    await player.save()

    let text =

`🏆 ═════〔 إنجاز جديد 〕═════ 🏆

${categoryDef.icon} ${categoryDef.name}

`

    for (const tierDef of unlocked) {

        text +=
`${tierDef.label}

💰 +${tierDef.money.toLocaleString()} مال
⭐ +${tierDef.xp.toLocaleString()} XP
`

        for (const boxType in (tierDef.boxes || {})) {
            text += `📦 +${tierDef.boxes[boxType]} صندوق ${boxType}\n`
        }

        if (tierDef.sssCharacter && earnedSSS) {
            text += `🌟 شخصية SSS: ${earnedSSS.name}\n`
        }

        if (tierDef.title) {
            text += `🎖️ لقب دائم: ${tierDef.title}\n`
        }

        text += `\n━━━━━━━━━━━━━━\n\n`
    }

    text += `📊 استخدم .انجازاتي لعرض تقدمك الكامل`

    try {

        await sock.sendMessage(
            jid,
            { text }
        )

    } catch (e) {

        console.log(
            'Achievement notify error:',
            e
        )
    }
}

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

// =========================
// تطبيع نص كامل (يحافظ على المسافات بين الكلمات)
// يُستخدم لمطابقة الأسئلة مع حقائق الشخصية
// =========================

function normalizeText(text) {

    return text
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[ؤئ]/g, 'ء')
        .replace(/[؟?]/g, '')
        .replace(/[.,!،]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

// عبارات استفهام شائعة نحذفها من بداية السؤال
// عشان نوصل لـ"جوهر" السؤال ونقارنه بحقائق الشخصية
const QUESTION_PREFIXES = [
    'هل هو ', 'هل هي ', 'هل تعتبر ', 'هل يعتبر ',
    'هل الشخصيه ', 'هل من ', 'هل يملك ', 'هل تملك ',
    'هل يستخدم ', 'هل تستخدم ', 'هل ينتمي ', 'هل تنتمي ',
    'هل كان ', 'هل كانت ', 'هل يعمل ', 'هل تعمل ',
    'هل '
]

function extractQuestionCore(text) {

    let core = normalizeText(text)

    for (const prefix of QUESTION_PREFIXES) {

        const normalizedPrefix =
            normalizeText(prefix)

        if (core.startsWith(normalizedPrefix)) {

            core = core.slice(
                normalizedPrefix.length
            )

            break

        }

    }

    return core.trim()

}

// =========================
// فئات متناقضة معروفة (سؤال إيجابي/سلبي واضح المعنى)
// كل فئة: قائمة كلمات مفتاحية تدل على "نعم"، وقائمة تدل على "لا"
// عشان نجاوب بثقة 100% من الحقائق المخزنة بدل ما نخمن بالذكاء الاصطناعي
// =========================

const FACT_CATEGORIES = [

    {
        // الجنس
        positiveKeywords: ['ذكر', 'رجل', 'ولد', 'شاب'],
        negativeKeywords: ['انثي', 'امراه', 'بنت', 'فتاه'],
        positiveTag: 'ذكر',
        negativeTag: 'انثي'
    },

    {
        // الجنس (بالعكس)
        positiveKeywords: ['انثي', 'امراه', 'بنت', 'فتاه'],
        negativeKeywords: ['ذكر', 'رجل', 'ولد', 'شاب'],
        positiveTag: 'انثي',
        negativeTag: 'ذكر'
    },

    {
        // الحياة/الموت
        positiveKeywords: ['ميت', 'مات', 'توفي', 'توفيت', 'ميته'],
        negativeKeywords: ['حي', 'حيه', 'عايش', 'عايشه'],
        positiveTag: 'ميت',
        negativeTag: 'حي'
    },

    {
        // الحياة/الموت (بالعكس)
        positiveKeywords: ['حي', 'حيه', 'عايش', 'عايشه'],
        negativeKeywords: ['ميت', 'مات', 'توفي', 'توفيت', 'ميته'],
        positiveTag: 'حي',
        negativeTag: 'ميت'
    },

    {
        // بشري أو لا
        positiveKeywords: ['بشري', 'انسان', 'بشريه'],
        negativeKeywords: [],
        positiveTag: 'بشري',
        negativeTag: null,
        // أي حقيقة تحتوي إحدى هذه الكلمات تعني أن الشخصية ليست بشرية بالكامل
        speciesKeywords: [
            'شيطان', 'تايتان', 'شينيغامي', 'هولو',
            'ارانكار', 'سايان', 'لعنه', 'كائن اصطناعي',
            'اندرويد', 'الف', 'نباتي', 'اله', 'ملاك',
            'كائن هجين', 'روبوت', 'سايبورغ',
            'هيكل عظمي', 'سمكه'
        ]
    }

]

function matchFactAnswer(questionText, character) {

    if (
        !character ||
        !character.facts ||
        !character.facts.length
    ) return null

    const normalizedFacts =
        character.facts.map(
            f => normalizeText(f)
        )

    const core =
        extractQuestionCore(questionText)

    if (!core) return null

    // =====================
    // 1) فحص الفئات المتناقضة المعروفة (جنس / حياة-موت / بشري)
    // =====================

    for (const category of FACT_CATEGORIES) {

        const askedPositive =
            category.positiveKeywords.some(
                k => core.includes(k)
            )

        if (!askedPositive) continue

        // حالة خاصة: بشري أو لا (تعتمد على كلمات الأنواع)
        if (category.speciesKeywords) {

            const isHuman =
                normalizedFacts.some(
                    f => f.includes('بشري')
                )

            if (isHuman) return 'نعم'

            const isNonHuman =
                normalizedFacts.some(
                    f => category.speciesKeywords.some(
                        sk => f.includes(sk)
                    )
                )

            if (isNonHuman) return 'لا'

            // ما لقينا أي مؤشر لا-بشري — قاعدة بياناتنا
            // تسجل الاستثناءات فقط، فنفترض بشري افتراضياً
            return 'نعم'

        }

        const hasPositiveTag =
            normalizedFacts.some(
                f => f.includes(category.positiveTag)
            )

        if (hasPositiveTag) return 'نعم'

        const hasNegativeTag =
            normalizedFacts.some(
                f => f.includes(category.negativeTag)
            )

        if (hasNegativeTag) return 'لا'

        return null

    }

    // =====================
    // 2) مطابقة نصية مباشرة (فرق/أنواع/صفات مذكورة حرفياً بالحقائق)
    // نجاوب "نعم" فقط لو لقينا تطابق واضح — ما نستنتج "لا" من الغياب
    // =====================

    if (core.length >= 3) {

        const directMatch =
            normalizedFacts.some(
                f =>
                    f.includes(core) ||
                    core.includes(f)
            )

        if (directMatch) return 'نعم'

    }

    // =====================
    // 3) مطابقة على مستوى الكلمات (تتحمل اختلاف صياغة السؤال)
    // لو كل الكلمات المهمة بالسؤال موجودة داخل نفس الحقيقة، نعتبرها تطابق
    // =====================

    const STOPWORDS = new Set([
        'من', 'في', 'على', 'الى', 'إلى', 'هل',
        'هو', 'هي', 'عن', 'مع', 'او', 'أو',
        'ثم', 'أن', 'ان', 'كان', 'كانت', 'يعتبر',
        'تعتبر', 'الشخصيه', 'شخصيه'
    ])

    const coreWords =
        core
            .split(' ')
            .filter(
                w =>
                    w.length > 1 &&
                    !STOPWORDS.has(w)
            )

    if (coreWords.length) {

        const wordOverlapMatch =
            normalizedFacts.some(
                f =>
                    coreWords.every(
                        w => f.includes(w)
                    )
            )

        if (wordOverlapMatch) return 'نعم'

    }

    return null

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
`أنت حكم خبير في لعبة تخمين شخصيات الأنمي، ولديك معرفة واسعة وحقيقية بكل شخصيات الأنمي المشهورة وقصصها وصفاتها.

سيتم إعطاؤك اسم الشخصية الصحيحة واسم الأنمي الخاص بها، بالإضافة إلى "حقائق مؤكدة" مسجلة عنها.

القواعد:

- "الحقائق المؤكدة" هي المصدر الأعلى أولوية: إذا تعارضت مع معرفتك العامة، اعتمد عليها هي فقط.
- إذا لم يكن السؤال مغطى بالحقائق المؤكدة، استخدم معرفتك الحقيقية الفعلية عن هذه الشخصية بالذات (بأحداثها وصفاتها الحقيقية من الأنمي/المانجا الأصلي) للإجابة بدقة.
- أجب دائماً بشكل منطقي وحاسم قدر الإمكان، ولا تلجأ لـ"لا أعلم" إلا إذا كان السؤال غامضاً جداً أو لا علاقة له بأي شخصية أنمي إطلاقاً.

أجب فقط بإحدى الكلمات التالية:

نعم
لا
لا أعلم

لا تشرح.
لا تكتب أي كلمة أخرى غير هذه الثلاث.`

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
// (تم حذف استيراد utils/shop القديم مع حذف نظام السوق القديم)

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
// (تم حذف نظام السوق القديم للمعدات .سوق_المعدات بناءً على طلب صاحب البوت،
//  نظام المعدات الحالي يعتمد فقط على فتح الصناديق .فتح_صندوق / .open)
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


// =========================
// 🕐 أدوات توقيت السعودية (UTC+3) لتصفير المتجر عند رأس كل ساعة
// =========================

const SAUDI_OFFSET_MS = 3 * 60 * 60 * 1000

// يرجع آخر "رأس ساعة" بتوقيت السعودية كـ Date حقيقي (UTC)
function getLastSaudiHourBoundary() {

    const now = new Date()

    const saudiShifted =
        new Date(now.getTime() + SAUDI_OFFSET_MS)

    saudiShifted.setUTCMinutes(0, 0, 0)

    return new Date(
        saudiShifted.getTime() - SAUDI_OFFSET_MS
    )
}

// يرجع عدد المللي ثانية المتبقية لبداية رأس الساعة القادم بتوقيت السعودية
function getMsUntilNextSaudiHour() {

    const lastBoundary =
        getLastSaudiHourBoundary()

    const nextBoundary =
        new Date(
            lastBoundary.getTime() + 60 * 60 * 1000
        )

    return nextBoundary.getTime() - Date.now()
}

// يرجع معرّف فريد لفترة الساعتين الحالية بتوقيت السعودية (00-02, 02-04, 04-06 ...)
// يُستخدم لتصفير محاولات .تحدي كل ساعتين عند رأس الساعة (2, 4, 6 ...)
function getCurrentSaudi2HourPeriod() {

    const saudiShifted =
        new Date(Date.now() + SAUDI_OFFSET_MS)

    const dayId =
        Math.floor(
            saudiShifted.getTime() / (24 * 60 * 60 * 1000)
        )

    const twoHourSlot =
        Math.floor(saudiShifted.getUTCHours() / 2)

    return dayId * 100 + twoHourSlot
}

// يرجع عدد المللي ثانية المتبقية حتى الخميس الساعة 10:00 مساءً القادم بتوقيت السعودية
// (يُستخدم لتصفير التصنيف الأسبوعي)
function getMsUntilNextSaudiThursday10PM() {

    const saudiShifted =
        new Date(Date.now() + SAUDI_OFFSET_MS)

    const target = new Date(saudiShifted)
    target.setUTCHours(22, 0, 0, 0)

    let dayDiff =
        (4 - saudiShifted.getUTCDay() + 7) % 7

    target.setUTCDate(
        saudiShifted.getUTCDate() + dayDiff
    )

    if (
        dayDiff === 0 &&
        saudiShifted.getTime() >= target.getTime()
    ) {
        target.setUTCDate(target.getUTCDate() + 7)
    }

    const targetUTC =
        new Date(target.getTime() - SAUDI_OFFSET_MS)

    return targetUTC.getTime() - Date.now()
}

// =========================
// 🏆 نظام الرانك الجديد (مشترك بين .مضاربة و .تحدي فقط — منفصل تماماً عن نظام mmr/rank القديم)
// =========================

// 6 رتب جديدة بأسماء مختلفة عن النظام القديم (برونزي/فضي/ذهبي/بلاتيني/ماستر/أسطوري)
const RANK_TIERS = [
    { name: 'مبتدئ',    minPoints: 0,    money: 10000,   boxKey: 'basic',      boxLabel: '📦 صندوق عادي' },
    { name: 'صاعد',     minPoints: 100,  money: 50000,   boxKey: 'rare',       boxLabel: '🎁 صندوق نادر' },
    { name: 'محترف',    minPoints: 300,  money: 200000,  boxKey: 'epic',       boxLabel: '✨ صندوق ملحمي' },
    { name: 'نخبة',     minPoints: 600,  money: 800000,  boxKey: 'legendary',  boxLabel: '👑 صندوق أسطوري' },
    { name: 'بطل',      minPoints: 1000, money: 2000000, boxKey: 'sss_chance', boxLabel: '🌟 صندوق فرصة SSS' },
    { name: 'إمبراطور', minPoints: 1500, money: 5000000, boxKey: 'sss_high',   boxLabel: '💎 صندوق SSS عشوائي' }
]

// يحدد الرتبة الجديدة بناءً على نقاط التصنيف
function getRankTier(points) {

    let current = RANK_TIERS[0]

    for (const tier of RANK_TIERS) {
        if ((points || 0) >= tier.minPoints) {
            current = tier
        }
    }

    return current.name
}

function rankTierIndex(tierName) {
    const i = RANK_TIERS.findIndex(t => t.name === tierName)
    return i === -1 ? 0 : i
}

function rankTierInfo(tierName) {
    return (
        RANK_TIERS.find(t => t.name === tierName) ||
        RANK_TIERS[0]
    )
}

// تُستدعى بعد تحديث rankPoints/rankTier للاعب لمقارنة رتبته الجديدة بالقديمة
// تمنح مكافآت الترقية (مال + صندوق حسب الرتبة الجديدة) وترجع نص إشعار فوري يُرفق برسالة النتيجة
async function applyRankTierPromotion(playerData, oldTier) {

    if (!playerData.rankTier || playerData.rankTier === oldTier) {
        return ''
    }

    const wentUp =
        rankTierIndex(playerData.rankTier) > rankTierIndex(oldTier)

    if (!wentUp) {
        return `

🔻 تراجع رانك
@${playerData.userId.split('@')[0]}
${oldTier} ⬅️ ${playerData.rankTier}`
    }

    const reward = rankTierInfo(playerData.rankTier)

    playerData.boxes = playerData.boxes || {}
    playerData.boxes[reward.boxKey] =
        (playerData.boxes[reward.boxKey] || 0) + 1

    // addMoney تحفظ اللاعب بنفسها (وتشمل تغيير الصناديق أعلاه بما أنها نفس المستند)
    await playerData.addMoney(reward.money)

    return `

🎉 ترقية رانك!
@${playerData.userId.split('@')[0]}
${oldTier} ⬅️ ${playerData.rankTier}
💰 +${reward.money.toLocaleString()} مال
${reward.boxLabel} × 1`
}


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

    { floor: 30, power: 5000, image: "https://i.ibb.co/JRK1vHjm/e06dcfcff98f3cc474e6c330375386c6.jpg" },

    { floor: 31, power: 5500, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 32, power: 5700, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 33, power: 5900, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 34, power: 6000, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },

    { floor: 35, power: 6500, image: "https://i.postimg.cc/zBLpWbx5/458fa36ce273fa09b90f0fa374d0f144.jpg" },

    { floor: 36, power: 6700, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 37, power: 6800, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 38, power: 6900, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 39, power: 7000, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },

    { floor: 40, power: 7300, image: "https://i.postimg.cc/fymKq44p/a5d3a4847a17d51a6e1ea2b2229f0adc.jpg" },

    { floor: 41, power: 7400, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 42, power: 7600, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 43, power: 7900, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 44, power: 8100, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },

    { floor: 45, power: 9000, image: "https://i.postimg.cc/CxFN76c7/873706c8faf696db1bfab4bda4808920.jpg" },

    { floor: 46, power: 9100, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 47, power: 9200, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 48, power: 9400, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 49, power: 9500, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },

    { floor: 50, power: 10000, image: "https://i.postimg.cc/j2HHQzN8/5a05dc9b83c11a502a92a1beea4a068e.jpg" },

    { floor: 51, power: 11000, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 52, power: 11300, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 53, power: 11600, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 54, power: 12000, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },

    { floor: 55, power: 13000, image: "https://i.postimg.cc/P5rWYvxq/c14f31edca69c6de945c3419d2f2e267-(1).jpg" },

    { floor: 56, power: 15000, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 57, power: 15200, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 58, power: 15500, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },
    { floor: 59, power: 16000, image: "https://i.ibb.co/Fkrdc9TV/what-is-an-underground-prison-cell-called-1.jpg" },

    { floor: 60, power: 25000, image: "https://i.postimg.cc/KYCB69DW/764fa4fc79dcbdc6b362a40130bfd467.jpg" }
];

function getTowerReward(floor) {

    if (floor >= 31 && floor <= 59) {
    floor = floor - 30
}

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

        case 60:
    return {
        money: 5000000,
        xp: 50000,
        title: '⚜️ سيد العروش'
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

    // ⏳ يتم تصفير المتجر فقط عند رأس كل ساعة بتوقيت السعودية (UTC+3)
    // مثال: 1:00 ، 2:00 ، 3:00 ... بتوقيت السعودية بالضبط
    if (shopItems.length > 0) {

    const firstItem = shopItems[0]

    if (firstItem?.createdAt) {

        const lastBoundary =
            getLastSaudiHourBoundary()

        const createdAt =
            new Date(firstItem.createdAt)

        // إذا تاريخ إنشاء المتجر بعد آخر رأس ساعة سعودي
        // يعني المتجر لسا "طري" لهذه الساعة، لا تعيد التوليد
        if (createdAt >= lastBoundary) return
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

        if (rarity === 'SSS') {

            // 💰 شخصيات SSS بالمتجر: من 1,000,000 إلى 3,000,000
            // حسب القوة، وأعلى قيمة تُحسب عندها هي قوة 7000 فأكثر
            const cappedPower =
                Math.min(character.power, 7000)

            price =
                Math.round(
                    1000000 +
                    (cappedPower / 7000) * 2000000
                )
        }

        await Shop.create({
            character,
            price
        })
    }
}

function shuffle(array) {
    const arr = [...array]

    for (let i = arr.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1))

        ;[arr[i], arr[j]] = [arr[j], arr[i]]

    }

    return arr
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

    // =========================
    // 🛡️ ملخص دمج المعدات (نظام المعدات الجديد - .مضاربة)
    // يعرض كل ستاتس منحته المعدات المجهزة للشخصية بغض النظر
    // عن نجاح أي حدث عشوائي (حرج/مراوغة...) بهذي الجولة بالذات
    // =========================

    function equipSummaryText(bonus) {

        const lines = []

        if (bonus.attack)
            lines.push(`⚔️ هجوم المعدات +${bonus.attack}`)

        if (bonus.defense)
            lines.push(`🛡️ دفاع المعدات +${bonus.defense}`)

        if (bonus.hp)
            lines.push(`❤️ HP المعدات +${bonus.hp}`)

        if (bonus.critRate)
            lines.push(`🎯 حرج المعدات +${bonus.critRate}%`)

        if (bonus.critDamage)
            lines.push(`💥 ضرر حرج المعدات +${bonus.critDamage}%`)

        if (bonus.dodge)
            lines.push(`👻 مراوغة المعدات +${bonus.dodge}%`)

        if (bonus.accuracy)
            lines.push(`🎯 دقة المعدات +${bonus.accuracy}%`)

        if (bonus.shield)
            lines.push(`🛡️ درع المعدات +${bonus.shield}`)

        if (bonus.lifesteal)
            lines.push(`🩸 امتصاص حياة المعدات +${bonus.lifesteal}%`)

        if (bonus.reflect)
            lines.push(`🪞 عكس ضرر المعدات +${bonus.reflect}%`)

        if (bonus.bossDamage)
            lines.push(`👹 ضرر الزعيم من المعدات +${bonus.bossDamage}%`)

        return lines.length
            ? lines.join('\n')
            : 'لا توجد معدات مجهزة'

    }

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

let log1 = ''
let log2 = ''

// =========================
// 🛡️ بونص المعدات (نظام المعدات الجديد - يُطبَّق الآن على .مضاربة)
// المعدات على الشخصية المحاربة نفسها (char1 / char2) لكل جولة
// =========================

const char1EquipBonus =
    equipmentSystem.calculateEquipmentStats(char1)

const char2EquipBonus =
    equipmentSystem.calculateEquipmentStats(char2)

// هجوم المعدات
dmg1 += (char1EquipBonus.attack || 0)
dmg2 += (char2EquipBonus.attack || 0)

// دفاع المعدات (يقلل الضرر الوارد على صاحب الدرع)
if ((char2EquipBonus.defense || 0) > 0) {
    dmg1 = Math.max(0, dmg1 - char2EquipBonus.defense)
}
if ((char1EquipBonus.defense || 0) > 0) {
    dmg2 = Math.max(0, dmg2 - char1EquipBonus.defense)
}

// حرج المعدات
if (
    Math.random() * 100 <
    (char1EquipBonus.critRate || 0)
) {
    dmg1 = Math.floor(
        dmg1 * (1 + (char1EquipBonus.critDamage || 0) / 100)
    )
    log1 += `

🎯 حرج المعدات

💥 ضربة حرجة`
}
if (
    Math.random() * 100 <
    (char2EquipBonus.critRate || 0)
) {
    dmg2 = Math.floor(
        dmg2 * (1 + (char2EquipBonus.critDamage || 0) / 100)
    )
    log2 += `

🎯 حرج المعدات

💥 ضربة حرجة`
}

// مراوغة المعدات
if (
    Math.random() * 100 <
    (char2EquipBonus.dodge || 0)
) {
    dmg1 = 0
    log2 += `

👻 مراوغة المعدات

💨 تفادى الهجمة بالكامل`
}
if (
    Math.random() * 100 <
    (char1EquipBonus.dodge || 0)
) {
    dmg2 = 0
    log1 += `

👻 مراوغة المعدات

💨 تفادى الهجمة بالكامل`
}

// امتصاص حياة المعدات
if ((char1EquipBonus.lifesteal || 0) > 0) {
    const equipBonus1 = Math.floor(
        dmg1 * (char1EquipBonus.lifesteal || 0) / 100
    )
    dmg1 += equipBonus1
    log1 += `

🩸 امتصاص حياة المعدات

🩸 امتص ${equipBonus1} قوة إضافية`
}
if ((char2EquipBonus.lifesteal || 0) > 0) {
    const equipBonus2 = Math.floor(
        dmg2 * (char2EquipBonus.lifesteal || 0) / 100
    )
    dmg2 += equipBonus2
    log2 += `

🩸 امتصاص حياة المعدات

🩸 امتص ${equipBonus2} قوة إضافية`
}

// انعكاس ضرر المعدات
if ((char2EquipBonus.reflect || 0) > 0) {
    const reflectedEquip2 = Math.floor(
        dmg1 * (char2EquipBonus.reflect || 0) / 100
    )
    dmg2 += reflectedEquip2
    log2 += `

🪞 مرآة المعدات

💥 عكس ${reflectedEquip2} ضرر`
}
if ((char1EquipBonus.reflect || 0) > 0) {
    const reflectedEquip1 = Math.floor(
        dmg2 * (char1EquipBonus.reflect || 0) / 100
    )
    dmg1 += reflectedEquip1
    log1 += `

🪞 مرآة المعدات

💥 عكس ${reflectedEquip1} ضرر`
}

const activeAbilities1 =
    shuffle(char1.urAbilities || []).slice(0, 4)

const activeAbilities2 =
    shuffle(char2.urAbilities || []).slice(0, 4)

        // =========================
// PLAYER 1 ABILITIES
// =========================

for (const ability of activeAbilities1) {
    if (
    ability.type === 'attack' ||
    ability.type === 'bossDamage'
) {

    dmg1 = Math.floor(
        dmg1 *
        (1 + ability.value / 100)
    )

    log1 += `

🔥 ${ability.name}

⚔️ +${ability.value}% قوة`
}
    if (ability.type === 'defense') {

    dmg2 = Math.floor(
        dmg2 *
        (1 - ability.value / 100)
    )

    log1 += `

🛡️ ${ability.name}

🛡️ قلل ضرر الخصم ${ability.value}%`

}

    if (
    ability.type === 'critRate' &&
    Math.random() * 100 <=
    ability.value
) {

    dmg1 *= 2

    log1 += `

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

    log1 += `

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

    log1 += `

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

    log1 += `

🪞 ${ability.name}

💥 عكس ${reflected} ضرر`
}

    if (
    ability.type === 'dodge' &&
    Math.random() * 100 <=
    ability.value
) {

    dmg2 = 0

    log1 += `

👻 ${ability.name}

💨 تفادى الهجمة بالكامل`
}
}

// =========================
// PLAYER 2 ABILITIES
// =========================

for (const ability of activeAbilities2) {

    if (
    ability.type === 'attack' ||
    ability.type === 'bossDamage'
) {

    dmg2 = Math.floor(
        dmg2 *
        (1 + ability.value / 100)
    )

    log2 +=`

🔥 ${ability.name}

⚔️ +${ability.value}% قوة`
}
    if (ability.type === 'defense') {

    dmg1 = Math.floor(
        dmg1 *
        (1 - ability.value / 100)
    )

    log2 += `

🛡️ ${ability.name}

🛡️ قلل ضرر الخصم ${ability.value}%`

}

    if (
    ability.type === 'critRate' &&
    Math.random() * 100 <=
    ability.value
) {

    dmg2 *= 2

    log2 += `

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

    log2 += `

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

    log2 += `

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

    log2 += `

🪞 ${ability.name}

💥 عكس ${reflected} ضرر`
}

    if (
    ability.type === 'dodge' &&
    Math.random() * 100 <=
    ability.value
) {

    dmg1 = 0

    log2 += `

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

━━━━━━━━━━━━━━

👑 قدرات ${char1.name}

${log1 || "لا توجد قدرات مفعلة"}

🛡️ دمج معدات ${char1.name}

${equipSummaryText(char1EquipBonus)}

━━━━━━━━━━━━━━

👑 قدرات ${char2.name}

${log2 || "لا توجد قدرات مفعلة"}

🛡️ دمج معدات ${char2.name}

${equipSummaryText(char2EquipBonus)}

━━━━━━━━━━━━━━`
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

━━━━━━━━━━━━━━

👑 قدرات ${char1.name}

${log1 || "لا توجد قدرات مفعلة"}

🛡️ دمج معدات ${char1.name}

${equipSummaryText(char1EquipBonus)}

━━━━━━━━━━━━━━

👑 قدرات ${char2.name}

${log2 || "لا توجد قدرات مفعلة"}

🛡️ دمج معدات ${char2.name}

${equipSummaryText(char2EquipBonus)}

━━━━━━━━━━━━━━`
    }
)

    await new Promise(
        r => setTimeout(r, 2500)
    )
}
       } // ← هذا القوس يغلق for 

    let winner = null

    // 🏆 الرانك الجديد (مشترك بين .مضاربة و .تحدي فقط): نلتقط الرانك القديم لكلا اللاعبين قبل أي تعديل
    const p1OldRankTier = player1.rankTier
    const p2OldRankTier = player2.rankTier

    if (wins1 > wins2) {

    winner = player1

    player1.brawlWins++
    player2.brawlLosses++

    player1.money =
        (player1.money || 0) + 50000

    player1.xp =
        (player1.xp || 0) + 100

    // نقاط الرانك الجديد: تزيد بالفوز وتنقص بالخسارة
    player1.rankWins = (player1.rankWins || 0) + 1
    player2.rankLosses = (player2.rankLosses || 0) + 1

    player1.rankPoints = (player1.rankPoints || 0) + 20
    player2.rankPoints = Math.max(0, (player2.rankPoints || 0) - 10)

    player1.rankTier = getRankTier(player1.rankPoints)
    player2.rankTier = getRankTier(player2.rankPoints)

} else if (wins2 > wins1) {

    winner = player2

    player2.brawlWins++
    player1.brawlLosses++

    player2.money =
        (player2.money || 0) + 50000

    player2.xp =
        (player2.xp || 0) + 100

    player2.rankWins = (player2.rankWins || 0) + 1
    player1.rankLosses = (player1.rankLosses || 0) + 1

    player2.rankPoints = (player2.rankPoints || 0) + 20
    player1.rankPoints = Math.max(0, (player1.rankPoints || 0) - 10)

    player2.rankTier = getRankTier(player2.rankPoints)
    player1.rankTier = getRankTier(player1.rankPoints)
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

    // 🎉 مكافآت الترقية + إشعار فوري عند تغيّر الرانك (لكل من الفائز والخاسر)
    let rankBlock = ''

    if (winner) {
        rankBlock += await applyRankTierPromotion(player1, p1OldRankTier)
        rankBlock += await applyRankTierPromotion(player2, p2OldRankTier)
    }

    await player1.save()
    await player2.save()

if (winner) {
    await checkAndGrantAchievement(winner, 'brawl', winner.brawlWins, sock, jid)
}

// 🌍 نقاط العوالم: تُمنح للفائز بس إذا كان الخصم من عالم مختلف عن عالمه
const brawlLoser =
    winner === player1 ? player2 : player1

if (
    winner &&
    winner.world &&
    brawlLoser.world &&
    winner.world !== brawlLoser.world
) {
    await worlds.awardBattlePoints(
        sock,
        jid,
        winner.userId
    )
}

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
100 XP${rankBlock}`

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
    "120363409897316453@g.us",
    "120363116482407260@g.us"
]

// =========================
// 📊 DAILY BOSS CONTRIBUTION REWARDS (جوائز المساهمات اليومية)
// تُوزَّع تلقائياً كل يوم الساعة 10 مساءً بتوقيت السعودية
// =========================

let lastContribRewardDate = null

function startDailyContributionRewards(sock) {

    setInterval(async () => {

        try {

            const riyadhTime =
                new Date().toLocaleString(
                    'en-US',
                    { timeZone: 'Asia/Riyadh', hour12: false }
                )

            const riyadhDate =
                new Date(riyadhTime)

            const today = getSaudiDate()

            if (
                riyadhDate.getHours() === 22 &&
                lastContribRewardDate !== today
            ) {

                lastContribRewardDate = today

                await distributeDailyContributionRewards(sock)
            }

        } catch (err) {

            console.log(
                'Daily Contribution Reward Error:',
                err
            )
        }

    }, 60000)
}

// =========================
// 🌌 جدولة تجديد البنر اليومي تلقائيًا
// (بدون هذا، refreshBanner لا يُستدعى إلا لما لاعب
// يكتب .بنر أو .سحب_بنر بنفسه — يعني رسالة الإعلان
// كانت تعتمد على نشاط اللاعبين لا على وقت ثابت)
// =========================

let lastBannerRefreshDate = null

function startDailyBannerRefresh(sock) {

    setInterval(async () => {

        try {

            const riyadhTime =
                new Date().toLocaleString(
                    'en-US',
                    { timeZone: 'Asia/Riyadh', hour12: false }
                )

            const riyadhDate =
                new Date(riyadhTime)

            const today = getSaudiDate()

            if (
                riyadhDate.getHours() === 0 &&
                lastBannerRefreshDate !== today
            ) {

                lastBannerRefreshDate = today

                await refreshBanner(sock)
            }

        } catch (err) {

            console.log(
                'Daily Banner Refresh Error:',
                err
            )
        }

    }, 60000)
}

async function distributeDailyContributionRewards(sock) {

  try {

    // 🥇 ترتيب المساهمين حسب الضرر اليومي ضد الزعيم
    const contributors =
        await Player.find({ dailyBossDamage: { $gt: 0 } })
            .sort({ dailyBossDamage: -1 })

    const topThree = contributors.slice(0, 3)
    const rest = contributors.slice(3)

    let resultText =
`🏆 ═════〔 جوائز المساهمات اليومية 〕═════ 🏆

`

    // =========================
    // 🥇🥈🥉 جوائز أفضل 3 مساهمين
    // =========================

    for (let i = 0; i < topThree.length; i++) {

        const player = topThree[i]

        const medal =
            i === 0 ? '🥇' :
            i === 1 ? '🥈' :
            '🥉'

        player.money =
            (player.money || 0) + 2000000

        player.totalEarnedMoney =
            (player.totalEarnedMoney || 0) + 2000000

        let extras = ''

        // 🎲 1% فرصة شخصية SSS مباشرة
        if (Math.random() < 0.01) {

            const sssPool =
                characters.filter(
                    c => c.rarity === 'SSS'
                )

            const sssChar =
                sssPool[
                    Math.floor(Math.random() * sssPool.length)
                ]

            if (sssChar) {

                player.characters =
                    player.characters || []

                player.characters.push(sssChar)

                extras += `\n🌟 شخصية SSS: ${sssChar.name}`
            }
        }

        // 🎲 30% فرصة صندوق SSS High
        if (Math.random() < 0.30) {

            player.boxes = player.boxes || {}

            player.boxes.sss_high =
                (player.boxes.sss_high || 0) + 1

            extras += `\n📦 +1 صندوق SSS High`
        }

        await player.save()

        resultText +=
`${medal} @${player.userId.split('@')[0]}

💥 الضرر اليومي: ${(player.dailyBossDamage || 0).toLocaleString()}
💰 +2,000,000 مال${extras}

━━━━━━━━━━━━━━

`
    }

    // =========================
    // 👥 جوائز باقي المساهمين
    // =========================

    for (const player of rest) {

        player.money =
            (player.money || 0) + 500000

        player.totalEarnedMoney =
            (player.totalEarnedMoney || 0) + 500000

        const legendChar =
            getRandomCharacterByBox('legendary')

        if (legendChar) {

            player.characters =
                player.characters || []

            player.characters.push(legendChar)
        }

        await player.save()
    }

    if (rest.length) {

        resultText +=
`👥 باقي المساهمين (${rest.length})

💰 +500,000 مال لكل واحد
👑 +شخصية أسطورية لكل واحد

━━━━━━━━━━━━━━

`
    }

    // =========================
    // 🗡️ جائزة أكثر ضربة قاضية (آخر ضربة تقتل الزعيم)
    // =========================

    const killers =
        await Player.find({ dailyLastHits: { $gt: 0 } })
            .sort({ dailyLastHits: -1 })

    let topKillers = []

    if (killers.length) {

        const maxHits = killers[0].dailyLastHits

        topKillers =
            killers.filter(
                p => p.dailyLastHits === maxHits
            )

        for (const player of topKillers) {

            player.money =
                (player.money || 0) + 500000

            player.totalEarnedMoney =
                (player.totalEarnedMoney || 0) + 500000

            player.boxes = player.boxes || {}

            player.boxes.sss_high =
                (player.boxes.sss_high || 0) + 1

            await player.save()
        }

        resultText +=
`🗡️ أكثر ضربة قاضية اليوم (${maxHits} مرة)

${topKillers.map(p => `@${p.userId.split('@')[0]}`).join('\n')}

💰 +500,000 مال لكل واحد
📦 +1 صندوق SSS High لكل واحد

━━━━━━━━━━━━━━

`
    }

    if (!contributors.length && !killers.length) {

        resultText +=
`😴 لا توجد مساهمات مسجّلة لهذا اليوم

━━━━━━━━━━━━━━

`
    }

    resultText += `✅ تم تصفير المساهمات، بالتوفيق غداً!`

    const allMentioned = [
        ...topThree.map(p => p.userId),
        ...rest.map(p => p.userId),
        ...topKillers.map(p => p.userId)
    ]

    if (sock.user && (contributors.length || killers.length)) {

        // ⚠️ لا نسمح لفشل الإرسال (قروب غير موجود/طُرد البوت منه)
        // يوقف تصفير المساهمات اللي يجي بعده — لهذا نستخدم
        // try/catch + allSettled بدل Promise.all
        try {

            const results = await Promise.allSettled(
                GROUP_IDS.map(groupId =>
                    sock.sendMessage(groupId, {
                        text: resultText,
                        mentions: [...new Set(allMentioned)]
                    })
                )
            )

            results.forEach((r, i) => {
                if (r.status === 'rejected') {
                    console.log(
                        `⚠️ فشل إرسال رسالة المساهمات للقروب ${GROUP_IDS[i]}:`,
                        r.reason
                    )
                }
            })

        } catch (err) {

            console.log(
                '⚠️ خطأ غير متوقع أثناء إرسال رسالة المساهمات:',
                err
            )
        }
    }

    console.log('📊 Daily contribution rewards distributed')

  } catch (err) {

    // ⚠️ أي خطأ غير متوقع بحساب/توزيع الجوائز ما يوقف
    // التصفير اليومي — التصفير مضمون دائمًا بالأسفل (finally)
    console.log(
        '❌ خطأ أثناء توزيع جوائز المساهمات اليومية:',
        err
    )

  } finally {

    // 🔄 تصفير المساهمات اليومية لجميع اللاعبين
    // (يعمل دائمًا حتى لو فشل حساب/إرسال الجوائز أعلاه)
    await Player.updateMany(
        {},
        {
            $set: {
                dailyBossDamage: 0,
                dailyBossHits: 0,
                dailyLastHits: 0
            }
        }
    )

    console.log('📊 Daily contributions reset')
  }
}

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
    
// 🔧 إصلاح: كان معطّلاً بـ if (false) — هذا اللي منع ظهور كوراما والجوبي نهائيًا
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
    // ⚠️ ملاحظة: استخدمنا اسمًا مختلفًا (characterShopStarted) بدل
    // shopStarted لأن هذا الاسم مستخدم مسبقًا في متجر المعدات، وكان
    // هذا يمنع تشغيل متجر الشخصيات نهائيًا بسبب تعارض الاسم
    if (!global.characterShopStarted) {
        global.characterShopStarted = true

        await generateCharacterShop()

        // 🕐 أول تصفير تلقائي يكون بالضبط عند رأس الساعة القادمة
        // بتوقيت السعودية، وبعدها يتكرر كل ساعة بالضبط
        setTimeout(async () => {

            try {
                await generateCharacterShop()
                console.log("🏪 Shop refreshed (Saudi top of hour)")
            } catch (err) {
                console.log("❌ Shop refresh error:", err)
            }

            setInterval(async () => {
                try {
                    await generateCharacterShop()
                    console.log("🏪 Shop refreshed (Saudi top of hour)")
                } catch (err) {
                    console.log("❌ Shop refresh error:", err)
                }
            }, 60 * 60 * 1000)

        }, getMsUntilNextSaudiHour())
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

// 🌍 تشغيل جدولة نهاية موسم العوالم (كل سبت 12:00 ص بتوقيت السعودية)
worlds.startWorldSeasonScheduler(sock)

// 🏆 جدولة تصفير التصنيف الأسبوعي (كل خميس 10:00 مساءً بتوقيت السعودية)
// يُصفَّر mmr والرتبة فقط، ولا يمس عدد الفوز/الخسارة الإجمالي (تُستخدم للإنجازات)
if (!global.rankResetScheduled) {
    global.rankResetScheduled = true

    const runWeeklyRankReset = async () => {
        try {
            const result =
                await Player.updateMany(
                    {},
                    { $set: { rankPoints: 0, rankTier: 'مبتدئ' } }
                )

            console.log(
                '🏆 تم تصفير الرانك الأسبوعي (خميس 10م بتوقيت السعودية):',
                result.modifiedCount
            )
        } catch (err) {
            console.log('❌ خطأ تصفير الرانك الأسبوعي:', err)
        }
    }

    setTimeout(() => {

        runWeeklyRankReset()

        setInterval(
            runWeeklyRankReset,
            7 * 24 * 60 * 60 * 1000
        )

    }, getMsUntilNextSaudiThursday10PM())
}

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

if (!global.pvpIdleStarted) {

    global.pvpIdleStarted = true

    schedulePvpIdleCheck(sock)

    console.log(
        '✅ PvP Idle Check Started'
    )
}
        // =========================
// Anime Events
// =========================
if (!global.animeEventsStarted) {

    global.animeEventsStarted = true

    animeEvents.startScheduler(sock)

    console.log(
        '✅ Anime Events Started'
    )

}
        // =========================
// Bank System
// =========================
if (!global.bankSystemStarted) {

    global.bankSystemStarted = true

    bankSystem.start(sock)

    console.log(
        "✅ Bank System Started"
    )

}
        if (!global.marketCleanerStarted) {

    global.marketCleanerStarted = true

    setInterval(async () => {

        await cleanMarket()

    }, 10 * 60 * 1000)

    console.log('✅ Market Cleaner Started')

}

if (!global.dailyContribStarted) {

    global.dailyContribStarted = true

    startDailyContributionRewards(sock)

    console.log(
        '✅ Daily Contribution Rewards Started'
    )

}

if (!global.dailyBannerStarted) {

    global.dailyBannerStarted = true

    startDailyBannerRefresh(sock)

    console.log(
        '✅ Daily Banner Refresh Started'
    )

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

// 🔧 إصلاح: بدون هذا، animeEvents يستمر يستخدم الـ sock القديم المنقطع
// بعد إعادة الاتصال، فيفشل بصمت للأبد ولا يرجع يرسل أي حدث أنمي
global.animeEventsStarted = false
try {
    animeEvents.stopScheduler()
} catch (err) {
    console.log(
        'animeEvents stopScheduler Error:',
        err
    )
}

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
            now.getHours() !== lastBossHour
        ) {

            lastBossHour = now.getHours()

            // 🔧 إصلاح: كان يستخدم متغير غير معرّف GROUP_ID
            // ويشترط !currentBoss اللي يمنع السباون الساعي غالبًا للأبد
            // spawnBoss() أصلاً تحذف الزعيم القديم وتنشئ زعيم جديد بنفسها
            const nextIndex =
                ((currentBoss?.bossIndex ?? -1) + 1) % bosses.length

            await spawnBoss(
                sock,
                nextIndex
            )

            currentBoss = await Boss.findOne()

            console.log(
                '👑 تم إنشاء زعيم جديد (رأس الساعة)'
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
// الرسائل
// =========================
sock.ev.on('messages.upsert', async ({ messages }) => {

    const msg = messages[0]
    if (!msg?.message) return

    // ⛔ تجاهل رسائل البوت نفسه فورًا، قبل أي منطق ثاني (وقبل فحص الكويز تحديدًا)
    // بدون هذا الشرط هنا، رسائل الكويز الصادرة من البوت (مثل "اكتب التالي: كوكو")
    // كانت توصل لـ checkAnswer وتُحتسب كإجابة صحيحة للبوت نفسه
    if (msg.key.fromMe) return

  //  console.log(JSON.stringify(msg, null, 2))
    // ⚡ تحسين أداء: كانت تطبع مع كل رسالة توصل (حتى لو مو أمر)
    // هذا يسبب تباطؤ حقيقي في مجموعة نشطة. فعّلها بوضع DEBUG=1 وقت الحاجة فقط.
    if (process.env.DEBUG) {
        console.log("participant:", msg.key.participant)
        console.log("remoteJid:", msg.key.remoteJid)
    }

    const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text

if (!text) return;

    const userIdPrivate =
    msg.key.participant ||
    msg.key.remoteJid

    // =========================
    // 🐺 لعبة المستذئبين — أفعال الليل والثأر تصل بالخاص
    // الرسائل الخاصة ممنوعة تماماً في باقي أنظمة البوت،
    // فقط لعبة الذئاب تُعالَج هنا ثم نتوقف.
    // =========================
    if (!msg.key.remoteJid.endsWith("@g.us")) {
        if (msg.key.remoteJid.endsWith("@s.whatsapp.net") || msg.key.remoteJid.endsWith("@lid")) {
            await werewolfGame.handlePrivateMessage(sock, userIdPrivate, text).catch(err => {
                console.log('Werewolf private handler error:', err)
            })
        }
        return
    }

    const userId = userIdPrivate

    const pushName = msg.pushName || ""

    // =========================
    // 🎭 لعبة برا السالفة (تتحكم بتسلسل الأدوار بنفسها، لازم تكون أول شي)
    // =========================
    if (
        await outsideGame.handleMessage(
            sock,
            msg,
            msg.key.remoteJid,
            userId,
            text,
            msg.message.extendedTextMessage?.contextInfo?.mentionedJid || []
        )
    ) {
        return
    }

    // =========================
    // 🐺 لعبة المستذئبين (أوامر القروب: تسجيل/انضمام/بدء/تصويت)
    // =========================
    if (
        await werewolfGame.handleMessage(
            sock,
            msg.key.remoteJid,
            userId,
            text
        )
    ) {
        return
    }

    // =========================
    // 🌍 WORLDS SYSTEM (أوامر الانضمام للعوالم)
    // =========================

    if (
        await worlds.handleJoinCommand(
            sock,
            msg.key.remoteJid,
            userId,
            text
        )
    ) {
        return
    }

    if (text === '.ترتيب_العوالم') {

        if (!isOwner(msg)) {
            return safeSend(
                msg.key.remoteJid,
                {
                    text: '❌ هذا الأمر للمطور فقط'
                }
            )
        }

        await worlds.showWorldStandings(
            sock,
            msg.key.remoteJid
        )
        return
    }

    if (text === '.تفاصيل_العوالم') {

        if (!isOwner(msg)) {
            return safeSend(
                msg.key.remoteJid,
                {
                    text: '❌ هذا الأمر للمطور فقط'
                }
            )
        }

        await worlds.showWorldDetails(
            sock,
            msg.key.remoteJid
        )
        return
    }

    if (text === '.انهاء_موسم_العوالم') {

        if (!isOwner(msg)) {
            return safeSend(
                msg.key.remoteJid,
                {
                    text: '❌ هذا الأمر للمالك فقط'
                }
            )
        }

        await worlds.endWorldSeason(
            sock,
            msg.key.remoteJid
        )
        return
    }

    // =========================
// 🧠 QUIZ SYSTEM (يُفحص أولاً وفوراً، قبل أي await آخر)
// =========================

const room = quizData.getQuizRoom(msg.key.remoteJid)

if (
    room.quizActive &&
    text !== '.انهاء_مسابقة' &&
    text !== '.النقاط'
) {

    await checkAnswer(
        sock,
        msg.key.remoteJid,
        userId,
        text,
        Number(msg.messageTimestamp) * 1000,
        msg
    );

    return;
}
// ⚡ دمج تحديث الاسم وجلب اللاعب في استدعاء واحد لقاعدة البيانات
// بدل استدعاءين منفصلين (كان يحدث مع كل رسالة في المجموعة)
let player = await Player.findOneAndUpdate(
    { userId },
    {
        $set: {
            name: pushName
        }
    },
    {
        new: true
    }
)
// =========================
// Anime Events
// =========================

if (player) {

    const handled =
        await animeEvents.handleAnswer(
            sock,
            msg,
            text,
            player,
            userId
        )

    if (handled) return

}
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
].filter(jid =>
    typeof jid === "string" &&
    (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid"))
)
        }

    )
            // =========================
    // حساب القوة الحقيقي
    // =========================

    let result

try {

    result = await clanBattle(
        attacker,
        defender
    )

} catch (err) {

    console.log(
        "Clan Battle Error:",
        err
    )

    await safeSend(
        war.chatId,
        {
            text:
`❌ حدث خطأ أثناء الجولة ${round.round}

${err.message}`
        }
    )

    return

}

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

mentions: [winner].filter(jid =>
    typeof jid === "string" &&
    (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid"))
)

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

}
async function finishClanWar(warId) {

    const Clan = require("./models/Clan")
    const ClanWar = require("./models/ClanWar")
    const Player = require("./models/Player")
const { addClanXP } = require("./clanLevel")
    
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

    const winnerCoins = 10

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

        await player.addMoney(winnerMoney)

        player.clanCoins += winnerCoins

        player.xp += winnerXP

        await player.save()

    }

    winnerClan.rankPoints += winnerRating
winnerClan.wins++

await addClanXP(
    winnerClan.clanId,
    winnerXP
)

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

        await player.addMoney(loserMoney)

        player.xp += loserXP

        await player.save()

    }

    loserClan.losses++

await addClanXP(
    loserClan.clanId,
    loserXP
)

await loserClan.save()

    war.status = "finished"

    await war.save()
    if (!war.chatId || typeof war.chatId !== "string") {
    console.log("Invalid chatId:", war.chatId)
    return
}

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

🪙 +10 عملة عشيرة

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

// ========================================
// ترتيب تلقائي للشخصيات حسب الرتبة
// (يُستخدم في .شخصياتي وعند كل إضافة شخصية
// عبر .استرجاع / .اهداء / .شراء / .شراءمتجر)
// ========================================

const CHARACTER_RANK_ORDER = [
    "Ω",
    "EX",
    "UR III",
    "UR II",
    "UR I",
    "SSS++",
    "SSS+",
    "SSS",
    "اسطوري",
    "SS",
    "ممتاز",
    "عادي"
]

function getCharacterRank(c) {

    const evolutionRanks = [
        "SSS",
        "SSS+",
        "SSS++",
        "UR I",
        "UR II",
        "UR III",
        "EX",
        "Ω"
    ]

    return (c.evolutionLevel || 0) > 0
        ? evolutionRanks[c.evolutionLevel]
        : c.rarity
}

function sortCharactersByRank(characters) {

    return characters
        .map((c, i) => ({ c, i }))
        .sort((a, b) => {

            const rankA =
                CHARACTER_RANK_ORDER.indexOf(
                    getCharacterRank(a.c)
                )

            const rankB =
                CHARACTER_RANK_ORDER.indexOf(
                    getCharacterRank(b.c)
                )

            const ra =
                rankA === -1
                    ? CHARACTER_RANK_ORDER.length
                    : rankA

            const rb =
                rankB === -1
                    ? CHARACTER_RANK_ORDER.length
                    : rankB

            if (ra !== rb) return ra - rb

            // نفس الرتبة: نحافظ على الترتيب الأصلي
            // (ترتيب الحصول عليها) بدون خلط
            return a.i - b.i
        })
        .map(x => x.c)
}

// يعيد ترتيب مصفوفة شخصيات اللاعب فعليًا حسب الرتبة
// (بدون حفظ — على المستدعي استدعاء player.save())
function resortPlayerCharacters(player) {

    player.characters =
        sortCharactersByRank(player.characters)

    player.markModified('characters')
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
const allowedCommands = [
    '.بدا_مسابقة',
    '.بدا_مسابقة_صور',
    '.بدا_مسابقة_كت',
    '.بدا_مسابقة_سس',
    '.النقاط',
    '.انهاء_مسابقة'
]

if (
    text.startsWith('.') &&
    !botAvailable() &&
    !allowedCommands.some(cmd => text.startsWith(cmd)) &&
    !isOwner(msg)
) {
    return
}
    // =========================
    // الأوامر العادية هنا
    // =========================
    if (text === '.ايديات_اللاعبين') {

    if (!isOwner(msg)) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ للمطور فقط'
        })
    }

    const players = await Player.find(
        {},
        { userId: 1, name: 1 }
    )

    let result = `👥 عدد اللاعبين: ${players.length}\n\n`
    const mentions = []

    for (const p of players) {
        if (!p.userId) continue

        result += `@${p.userId.split('@')[0]}\n`
        result += `${p.userId}\n\n`

        mentions.push(p.userId)
    }

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: result,
            mentions
        }
    )
}

    if (text === '.تصحيح_القتالات') {

    const result = await Player.updateMany(
        {},
        {
            $set: {
                fights: 5
            }
        }
    );

    return safeSend(msg.key.remoteJid, {
        text: `✅ تم إعادة قتالات ${result.modifiedCount} لاعب إلى 5/5.`
    });
}

    if (text === '.تصحيح_لفل200') {

    const result = await Player.updateMany(
        { level: { $gt: 200 } },
        {
            $set: {
                level: 200,
                xp: 0
            }
        }
    );

    return safeSend(msg.key.remoteJid, {
        text: `✅ تم إعادة ${result.modifiedCount} لاعب إلى المستوى 200 وتصفير خبرتهم.`
    });
}

    if (text === '.ريست_مجموع') {
    battleLocks.clear();

    return safeSend(msg.key.remoteJid, {
        text: '✅ تم تصفير جميع القتالات المعلقة.'
    });
}

    if (text === '.حذف_العشائر_الفارغة') {

    if (!isOwner) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '❌ هذا الأمر للمالك فقط.'
            }
        )

    }

    const result = await Clan.deleteMany({
        members: { $size: 0 }
    })

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`🗑️ تم حذف ${result.deletedCount} عشيرة فارغة بنجاح.`
        }
    )

}

    if (text === '.قوتي') {

    let player = await Player.findOne({ userId })

    if (!player) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ لا يوجد حساب.'
        })
    }

    const totalPower = getPlayerPower(player)

    const sssCount =
        player.characters.filter(c =>
            c.rarity === "SSS" ||
            c.evolutionLevel > 0
        ).length

    const maxPower =
        player.characters.length
            ? Math.max(...player.characters.map(c => c.power || 0))
            : 0

    const firstCharacter =
        [...player.characters]
        .sort((a,b)=>b.power-a.power)[0]

    const caption =
`╔════════════════════╗
        ⚔️ قوتي
╚════════════════════╝

👤 اللاعب:
${player.name || msg.pushName || "لاعب"}

━━━━━━━━━━━━━━

💥 القوة الكلية:
${totalPower.toLocaleString()}

🎴 عدد الشخصيات:
${player.characters.length} / ${player.maxCharacters}

👑 شخصيات SSS:
${sssCount}

⭐ أعلى قوة:
${maxPower.toLocaleString()}`

    if (firstCharacter?.image) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                image: { url: firstCharacter.image },
                caption
            }
        )

    }

    return safeSend(
        msg.key.remoteJid,
        { text: caption }
    )
}

    if (
    text === '.مجموعة' ||
    text.startsWith('.مجموعة ')
) {

    const target =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
        || userId

    const player =
        await Player.findOne({
            userId: target
        })

    if (!player || !player.characters.length) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: '📭 لا توجد شخصيات.'
            }
        )

    }

    // نفس ترتيب .شخصياتي (حسب الرتبة: Ω → EX → ... → عادي)
    const sortedCharacters =
        sortCharactersByRank(player.characters)

    const totalPower =
        sortedCharacters.reduce(
            (sum, c) => sum + (c.power || 0),
            0
        )

    let txt =
`╔════════════════════╗
      👤 مجموعة الشخصيات
╚════════════════════╝

👤 اللاعب: ${player.name || target.split("@")[0]}

💥 القوة الكلية: ${totalPower.toLocaleString()}

━━━━━━━━━━━━━━

`

    sortedCharacters.forEach((c, i) => {

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
⚔️ ${Number(c.power || 0).toLocaleString()} │ 👑 ${rank}

`

    })

    txt +=
`━━━━━━━━━━━━━━

📦 عدد الشخصيات: ${player.characters.length} / ${player.maxCharacters}`

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: txt,
            mentions: [target]
        }
    )

}
    if (text.startsWith(".صوره_sss")) {

    const args = text.trim().split(/\s+/)
    const number = parseInt(args[1])

    if (!number || number < 1) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ الاستخدام الصحيح

.صوره_sss رقم

مثال:
.صوره_sss 1`
            }
        )

    }

    const sssCharacters = characters
        .filter(c => c.rarity === "SSS")
        .sort((a, b) => a.name.localeCompare(b.name))

    if (number > sssCharacters.length) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: "❌ هذا الرقم غير موجود."
            }
        )

    }

    const character = sssCharacters[number - 1]

    // يجلب أحدث نسخة من الشخصيه حتى لو عدلت الصورة أو البيانات
    const latest = characters.find(c =>
        c.name === character.name &&
        c.form === character.form &&
        c.rarity === character.rarity
    ) || character

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: latest.image
            },
            caption:
`👑 ${latest.name}

⭐ الندرة: ${latest.rarity}
🎌 الأنمي: ${latest.anime}
⚔️ القوة: ${latest.power}

📖 رقم القائمة: ${number}`
        }
    )

}
    
    if (text === ".البنك") {

    const bank =
        await bankSystem.bankInfo()

    if (!bank) {

        return safeSend(msg.key.remoteJid, {
            text: "❌ البنك غير متوفر حالياً."
        })

    }

    const player =
        await Player.findOne({ userId })

    const canBorrow =
        player.bank?.borrowedToday
            ? "❌ استخدمت قرض اليوم"
            : "✅ يمكنك الاقتراض"

    const debt =
        player.bank?.debt || 0

    return safeSend(msg.key.remoteJid, {

        text:
`╔══════ 🏦 بنك الأنمي ══════╗

💰 رصيد البنك

${bank.money.toLocaleString()}

━━━━━━━━━━━━━━━━

💳 الحد الأدنى للقرض

5,000,000

💳 الحد الأعلى للقرض

10,000,000

━━━━━━━━━━━━━━━━

📄 دينك الحالي

${debt.toLocaleString()}

━━━━━━━━━━━━━━━━

📌 حالة القرض

${canBorrow}

━━━━━━━━━━━━━━━━

📖 الأوامر

🏦 .قرض 7000000
📄 .ديني

╚══════════════════════════╝`

    })

}
    if (text.startsWith(".قرض")) {

    const args = text.trim().split(/\s+/)

    if (args.length < 2) {

        return safeSend(msg.key.remoteJid, {
            text:
`╔══════ 🏦 نظام القروض ══════╗

📝 طريقة الاستخدام

.قرض 7000000

━━━━━━━━━━━━━━━━

💳 الحد الأدنى

5,000,000

💳 الحد الأعلى

10,000,000

━━━━━━━━━━━━━━━━

📌 مثال

.قرض 10000000

╚══════════════════════════╝`
        })

    }

    const amount = Number(args[1])

    if (isNaN(amount)) {

        return safeSend(msg.key.remoteJid, {
            text: "❌ اكتب مبلغاً صحيحاً."
        })

    }

    const player =
        await Player.findOne({ userId })

    const result =
        await bankSystem.loan(
            player,
            amount
        )

    if (!result.ok) {

        return safeSend(msg.key.remoteJid, {
            text: result.message
        })

    }

    return safeSend(msg.key.remoteJid, {

        text:
`╔══════ 🏦 تم اعتماد القرض ══════╗

💰 المبلغ المقترض

${amount.toLocaleString()}

━━━━━━━━━━━━━━━━

💳 إجمالي الدين

${player.bank.debt.toLocaleString()}

━━━━━━━━━━━━━━━━

💵 الرصيد المقترض

${player.bank.loanMoney.toLocaleString()}

━━━━━━━━━━━━━━━━

✅ يمكن استخدام القرض في

🛒 المتجر
📈 التطوير
🏪 السوق

━━━━━━━━━━━━━━━━

❌ لا يمكن استخدامه في

🤝 التبرع
💸 تحويل المال للاعبين

━━━━━━━━━━━━━━━━

📌 سيتم سداد الدين تلقائياً من أي مكان يمنحك المال.

╚════════════════════════════╝`

    })

}
    if (text === ".ديني") {

    const player =
        await Player.findOne({ userId })

    if (!player) {

        return safeSend(msg.key.remoteJid, {
            text: "❌ لا يوجد حساب."
        })

    }

    const debt =
        player.bank?.debt || 0

    const loanMoney =
        player.bank?.loanMoney || 0

    const spentLoan =
        player.bank?.spentLoan || 0

    const borrowedToday =
        player.bank?.borrowedToday
            ? "✅ نعم"
            : "❌ لا"

    const status =
        debt > 0
            ? "🔴 لديك دين مستحق."
            : "🟢 لا يوجد عليك أي دين."

    return safeSend(msg.key.remoteJid, {

        text:
`╔══════ 💳 بيانات القرض ══════╗

${status}

━━━━━━━━━━━━━━━━

💰 إجمالي الدين

${debt.toLocaleString()}

━━━━━━━━━━━━━━━━

🏦 الرصيد المقترض المتبقي

${loanMoney.toLocaleString()}

━━━━━━━━━━━━━━━━

📈 ما تم استخدامه

${spentLoan.toLocaleString()}

━━━━━━━━━━━━━━━━

📅 اقترضت اليوم

${borrowedToday}

━━━━━━━━━━━━━━━━

📌 سيتم سداد الدين تلقائياً عند حصولك على المال من:

👑 المملكة
⚔️ قتال المجموع
💀 الزعماء
🏹 أي نشاط يمنح مالاً

╚════════════════════════════╝`

    })

}
    

    if (text.startsWith('.فتح_الكل ')) {

    let player = await Player.findOne({ userId })

    if (!player) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ لا يوجد حساب'
            }
        )

    }

    const args = text.trim().split(/\s+/)

    if (args.length < 2) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
`❌ الاستخدام الصحيح

.فتح_الكل basic
.فتح_الكل rare
.فتح_الكل epic
.فتح_الكل legendary
.فتح_الكل sss_chance
.فتح_الكل sss_high`
            }
        )

    }

    const boxType = args[1]

    const allowedBoxes = [
        'basic',
        'rare',
        'legendary',
        'epic',
        'sss_chance',
        'sss_high'
    ]

    if (!allowedBoxes.includes(boxType)) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '❌ نوع الصندوق غير صحيح'
            }
        )

    }

    if (
        !player.boxes ||
        !player.boxes[boxType] ||
        player.boxes[boxType] <= 0
    ) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: `❌ لا تملك صناديق ${boxType}`
            }
        )

    }

    const totalBoxes = player.boxes[boxType]

    const rewards = []

    for (
        let i = 0;
        i < totalBoxes;
        i++
    ) {

        const character =
            getRandomCharacterByBox(boxType)

        player.characters.push(character)

        rewards.push(character)

    }

    player.boxes[boxType] = 0
    player.boxesOpened = (player.boxesOpened || 0) + totalBoxes

    player.markModified('characters')
    player.markModified('boxes')

    await player.save()

    await checkAndGrantAchievement(player, 'boxes', player.boxesOpened, sock, msg.key.remoteJid)
    await checkAndGrantAchievement(player, 'collection', player.characters.length, sock, msg.key.remoteJid)

    let textResult =
`🎁 ═════〔 فتح جميع الصناديق 〕═════

📦 النوع:
${boxType}

📦 العدد:
${totalBoxes}

━━━━━━━━━━━━━━

`

            rewards.forEach((char, index) => {

        textResult +=
`${index + 1}- 🌟 ${char.name}

⭐ الندرة:
${char.rarity}

⚔️ القوة:
${char.power.toLocaleString()}

━━━━━━━━━━━━━━
`

    })

    textResult +=
`🎉 تم فتح جميع الصناديق بنجاح`

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: textResult
        }
    )

}

    if (text.startsWith('.دمج_الكل')) {

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

    player.characters =
        player.characters || []

    const allArgs =
        text.trim().split(/\s+/)

    const rarityArgRaw =
        allArgs.slice(1).join(' ').trim()

    // توحيد الهمزة (أسطوري / اسطوري)، والافتراضي اسطوري للتوافق مع الاستخدام القديم
    let rarityInput =
        rarityArgRaw === 'أسطوري'
            ? 'اسطوري'
            : rarityArgRaw

    if (!rarityInput) {
        rarityInput = 'اسطوري'
    }

    const allMergeRules = {
        'ممتاز': { result: 'اسطوري' },
        'اسطوري': { result: 'SSS' }
    }

    const rule =
        allMergeRules[rarityInput]

    if (!rule) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:

`❌ الاستخدام الصحيح

.دمج_الكل ممتاز
➜ يدمج كل شخصياتك الممتازة (كل 5 تعطي اسطوري)

.دمج_الكل أسطوري
➜ يدمج كل شخصياتك الاسطورية (كل 5 تعطي SSS)`
            }
        )
    }

    let matchingIndexes = []

    player.characters.forEach((char, index) => {

        if (
            char &&
            char.rarity === rarityInput
        ) {
            matchingIndexes.push(index)
        }

    })

    if (matchingIndexes.length < 5) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ تحتاج إلى 5 شخصيات من رتبة ${rarityInput} على الأقل

📦 لديك:
${matchingIndexes.length}`
            }
        )

    }

    const rewardPool =
        characters.filter(
            c =>
            c.rarity === rule.result
        )

    if (!rewardPool.length) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
                `❌ لا توجد شخصيات من رتبة ${rule.result}`
            }
        )

    }

    const rewards = []

    while (matchingIndexes.length >= 5) {

        const batch =
            matchingIndexes.splice(0, 5)

        const reward =
            JSON.parse(
                JSON.stringify(
                    rewardPool[
                        Math.floor(
                            Math.random() *
                            rewardPool.length
                        )
                    ]
                )
            )

        batch
            .sort((a, b) => b - a)
            .forEach(i => {

                player.characters.splice(i, 1)

            })

        player.characters.push(reward)

        rewards.push(reward)

        matchingIndexes.length = 0

        player.characters.forEach((char, index) => {

            if (
                char &&
                char.rarity === rarityInput
            ) {
                matchingIndexes.push(index)
            }

        })

    }

    player.markModified('characters')

    player.totalMerges =
        (player.totalMerges || 0) + rewards.length

    await player.save()

    await checkAndGrantAchievement(
        player,
        'fusion',
        player.totalMerges,
        sock,
        msg.key.remoteJid
    )

    let result =
`✨ ═══════〔 الدمج الشامل 〕═══════ ✨

🔥 تم الحصول على ${rewards.length} شخصية جديدة

`

        rewards.forEach((char, index) => {

    result +=
`${index + 1}- 👑 ${char.name}
🌟 ${char.rarity}
⚔️ ${char.power}

`

})

result +=
`━━━━━━━━━━━━━━

📦 تم استهلاك:
${rewards.length * 5} شخصية ${rarityInput}

🎁 الشخصيات الجديدة:
${rewards.length}`

return safeSend(
    msg.key.remoteJid,
    {
        text: result
    }
)

}

    if (text === '.بدا_قناص') {

    if (quickEvents.sniper) {

        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ فعالية القناص شغالة بالفعل'
        })

    }

    await startSniper(sock)

    return

}
    if (text === '.انهاء_قناص') {

    if (!quickEvents.sniper) {

        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ لا توجد فعالية قناص'
        })

    }

    quickEvents.sniper = null

    await sock.sendMessage(msg.key.remoteJid, {
        text: '✅ تم إنهاء فعالية القناص'
    })

    return

}
    
if (text === '.بدا_خمن') {

    if (quickEvents.lucky) {

        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ فعالية رقم الحظ شغالة بالفعل'
        })

    }

    await startLucky(sock)

    return

}
    if (text === '.انهاء_خمن') {

    if (!quickEvents.lucky) {

        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ لا توجد فعالية رقم الحظ'
        })

    }

    quickEvents.lucky = null

    await sock.sendMessage(msg.key.remoteJid, {
        text: '✅ تم إنهاء فعالية رقم الحظ'
    })

    return

}
    
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
`🎮 بدأت مسابقة الاساله

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

if (text === ".تصفير_الانجازات") {

    if (!isOwner(msg)) return

    const allPlayers = await Player.find({})

    for (const p of allPlayers) {

        p.achievements = {}

        // 📍 نسجل القيم الحالية كخط أساس — التقدم من الآن
        // يُحسب فقط كفرق عن هذه اللحظة، بدون أي تراكم قديم
        p.achievementBaseline = {
            pvp: p.wins || 0,
            boss: p.totalBossDamage || 0,
            beasts: p.beastEggsOpened || 0,
            brawl: p.brawlWins || 0,
            tower: p.towerFloor || 0,
            kingdom: p.kingdomTotalStages || 0,
            omega: p.omegaEvolutions || 0,
            pulls: p.totalPulls || 0,
            boxes: p.boxesOpened || 0,
            daily: p.dailyStreak || 0,
            wealth: p.totalEarnedMoney || 0,
            collection: (p.characters && p.characters.length) || 0,
            fusion: p.totalMerges || 0
        }

        p.markModified('achievements')
        p.markModified('achievementBaseline')

        await p.save()
    }

    return safeSend(msg.key.remoteJid, {
        text:
`✅ تم تصفير تقدم الإنجازات لجميع اللاعبين (${allPlayers.length}).

📊 كل شخص يبدأ عدّاد كل فئة إنجاز من 0/الهدف الآن — حتى لو عنده شخصيات أو إحصائيات قديمة كثيرة، ما تُحسب.
🎮 لم يتأثر أي تقدم حقيقي بباقي أنظمة اللعبة (شخصياتك، مالك، طابق برجك... كلها كما هي).
🆕 من الآن فصاعداً، فقط الأشياء الجديدة (شخصية جديدة، فوز جديد، ضربة جديدة...) تُحتسب للإنجازات.`
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

        kept.push(c)

    }

    if (!sold)
        return safeSend(msg.key.remoteJid,{
            text:"❌ لا توجد شخصيات عادي للبيع."
        })

    player.characters = kept
    await player.addMoney(money)

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
    // 🌌 حماية: شخصية أوميقا Ω ما تُعرض للتبديل أبداً
    // =========================

    if (character.evolutionLevel === 7) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: "🌌 شخصيات أوميقا Ω ما تقدر تعرضها للتبديل، هي حصرية لصاحبها فقط."
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

    // 🌌 حماية: شخصية أوميقا Ω ما تُبدّل أبداً
    if (myCharacter.evolutionLevel === 7) {

        return safeSend(
            msg.key.remoteJid,
            {
                text: "🌌 شخصيات أوميقا Ω ما تقدر تبدلها، هي حصرية لصاحبها فقط."
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
🧬 4 قدرات عشوائية

🥉 شخصية UR I
⚔️ 16000 قوة
🧬 3 قدرات عشوائية

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
const availableMoney =
    player.money - (player.bank?.loanMoney || 0)

if (amount > availableMoney) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'❌ لا يمكنك التبرع بالأموال المقترضة.'
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
await targetPlayer.addMoney(amount)

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

// 🌌 حماية: شخصية أوميقا Ω ما تُهدى أبداً
if (character.evolutionLevel === 7) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
'🌌 شخصيات أوميقا Ω ما تقدر تهديها، هي حصرية لصاحبها فقط.'
        }
    )

}

player.characters.splice(
    index,
    1
)

targetPlayer.characters.push(
    character
)

resortPlayerCharacters(targetPlayer)

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
${banner.globalPulls}/200

━━━━━━━━━━━━

🎁 عند وصول المجتمع إلى 200 سحبة

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
                    await fs.promises.readFile(imagePath),

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

    if (player.pulls < 5) {
        player.pulls = 5
    }

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
player.totalPulls = (player.totalPulls || 0) + 1
        player.bannerParticipated = true
        banner.globalPulls++

const reachedReward = banner.globalPulls >= 200
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

await checkAndGrantAchievement(player, 'pulls', player.totalPulls, sock, msg.key.remoteJid)
await checkAndGrantAchievement(player, 'collection', player.characters.length, sock, msg.key.remoteJid)

await banner.save()

await worlds.awardPullPoints(
    sock,
    msg.key.remoteJid,
    userId,
    randomCharacter.rarity
)
        
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
        image: await fs.promises.readFile(imagePath),
        caption
    }
)
        } // <-- أغلق .سحب_بنر هنا
    // =========================
// Open Equipment Box
// =========================

if (text.startsWith('.open') || text.startsWith('.فتح_صندوق')) {

    const args = text.trim().split(/\s+/)

    if (!args[1]) {

        return safeSend(

            msg.key.remoteJid,

            {

                text:
`📦 الاستخدام

.فتح_صندوق نادر
.فتح_صندوق ملحمي
.فتح_صندوق اسطوري
.فتح_صندوق خرافي

(أو بالإنجليزي: .open rare/epic/legendary/mythical)`

            }

        )

    }

    const type = args[1].toLowerCase()

    const map = {

        rare: "rareEquipment",
        نادر: "rareEquipment",

        epic: "epicEquipment",
        ملحمي: "epicEquipment",

        legendary: "legendEquipment",
        اسطوري: "legendEquipment",

        mythical: "mythicalEquipment",
        خرافي: "mythicalEquipment"

    }

    const boxId = map[type] || map[args[1]]

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

if (text === '.inventory' || text === '.حقيبتي') {

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

    let needsInventorySave = false

    player.inventory.forEach(it => {

        if (!it.uid) {

            it.uid =
                Date.now().toString(36) +
                Math.random().toString(36).slice(2, 8)

            needsInventorySave = true

        }

    })

    if (needsInventorySave) {

        player.markModified('inventory')

        await player.save()

    }

    const INV_STAT_LABELS = {

        attack: '⚔ هجوم',
        defense: '🛡 دفاع',
        hp: '❤️ HP',
        critRate: '🎯 نسبة الحرج',
        critDamage: '💥 ضرر الحرج',
        bossDamage: '👹 ضرر ضد الزعيم',
        dodge: '👻 مراوغة',
        accuracy: '🎯 دقة',
        lifesteal: '🩸 امتصاص حياة',
        shield: '🛡 درع',
        reflect: '🪞 انعكاس ضرر'

    }

    // الستاتات اللي تُعرض كنسبة مئوية (نظام قتال بالبوت الحالي
    // يتعامل معها كـ% مباشرة: كريت/دودج/دقة... إلخ)
    const INV_PERCENT_STATS = new Set([

        'critRate',
        'critDamage',
        'bossDamage',
        'dodge',
        'accuracy',
        'lifesteal',
        'reflect'

    ])

    const SLOT_LABELS = {

        weapon: '⚔️ سلاح',
        armor: '🛡️ درع',
        accessory: '💍 إكسسوار'

    }

    function formatStatLine(key, value) {

        const label = INV_STAT_LABELS[key] || key

        const suffix =
            INV_PERCENT_STATS.has(key) ? '%' : ''

        return `${label}: +${value}${suffix}`

    }

    let message =

`🎒 حقيبة المعدات (${player.inventory.length}/${player.maxInventory})

━━━━━━━━━━━━━━

`

    player.inventory.forEach(

        (item, index) => {

            message +=

`${index + 1}. ${item.name}
${"⭐".repeat(item.stars || 1)}  🏷 ${item.rarity}  🎖 ${item.quality || "Normal"}
📍 النوع: ${SLOT_LABELS[item.type] || item.type}
`

            // الستاتات الأساسية
            if (item.stats && Object.keys(item.stats).length) {

                message += `\n📊 الإحصائيات الأساسية\n`

                for (const stat in item.stats) {

                    message +=
                        `• ${formatStatLine(stat, item.stats[stat])}\n`

                }

            }

            // الأفيكسات (الرولات الإضافية)
            if (item.affixes && item.affixes.length) {

                message += `\n✨ الخصائص الإضافية (${item.affixes.length} رول)\n`

                for (const affix of item.affixes) {

                    message +=
                        `• ${formatStatLine(affix.type, affix.value)}\n`

                }

            }

            message += `\n🆔 ${item.uid}\n\n━━━━━━━━━━━━━━\n\n`

        }

    )

    message +=

`💡 للتجهيز:
.لبس رقم_القطعة رقم_الشخصية

مثال: .لبس 1 2

(أو بالإنجليزي: .equip 1 2)`

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

if (text.startsWith('.equipment') || text.startsWith('.معداتي')) {

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

    const eqArgs = text.split(' ')

    const eqCharIndex = Number(eqArgs[1])

    if (

        !eqArgs[1] ||

        isNaN(eqCharIndex)

    ) {

        return safeSend(

            msg.key.remoteJid,

            {

                text:
`📌 الاستخدام
.معداتي رقم_الشخصية

مثال:
.معداتي 1

💡 استخدم .شخصياتي لمعرفة الأرقام`

            }

        )

    }

    const eqCharacter =

        getCharacterByIndex(

            player,

            eqCharIndex

        )

    if (!eqCharacter) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: '❌ الشخصية غير موجودة.'

            }

        )

    }

    const STAT_LABELS = {

        attack: '⚔ هجوم',
        defense: '🛡 دفاع',
        hp: '❤️ HP',
        critRate: '🎯 نسبة الحرج',
        critDamage: '💥 ضرر الحرج',
        bossDamage: '👹 ضرر ضد الزعيم',
        dodge: '👻 مراوغة',
        accuracy: '🎯 دقة',
        lifesteal: '🩸 امتصاص حياة',
        shield: '🛡 درع',
        reflect: '🪞 انعكاس ضرر'

    }

    function renderItem(item, slotLabel) {

        let text = `${slotLabel}\n`

        if (!item) {

            return text + `لا يوجد\n\n`

        }

        text +=
`${item.name}
${"⭐".repeat(item.stars || 1)}
🎖 الجودة: ${item.quality || "Normal"}
`

        for (const stat in (item.stats || {})) {

            const label =
                STAT_LABELS[stat] || stat

            text += `${label}: +${item.stats[stat]}\n`

        }

        if (item.affixes && item.affixes.length) {

            text += `✨ الخصائص الإضافية (${item.affixes.length} رول)\n`

            for (const affix of item.affixes) {

                const label =
                    STAT_LABELS[affix.type] ||
                    affix.name

                text += `• ${label}: +${affix.value}\n`

            }

        }

        return text + `\n`

    }

    const eqSlots =

        equipmentSystem.ensureEquipmentSlots(

            eqCharacter

        )

    const weapon =
        eqSlots.weapon

    const armor =
        eqSlots.armor

    const accessory =
        eqSlots.accessory

    let message =
`⚔️ معدات ${eqCharacter.name}

━━━━━━━━━━━━━━

`

    message += renderItem(weapon, `⚔️ السلاح`)
    message += renderItem(armor, `🛡️ الدرع`)
    message += renderItem(accessory, `💍 الإكسسوار`)

    // Bonus
    const bonus =

        equipmentSystem.calculateEquipmentStats(

            eqCharacter

        )

    message +=
`━━━━━━━━━━━━━━

📊 إجمالي الإحصائيات

⚔ هجوم +${bonus.attack}

🛡 دفاع +${bonus.defense}

❤️ HP +${bonus.hp}

🎯 نسبة الحرج +${bonus.critRate}%

💥 ضرر الحرج +${bonus.critDamage}%

👹 ضرر ضد الزعيم +${bonus.bossDamage}%

👻 مراوغة +${bonus.dodge}%

🎯 دقة +${bonus.accuracy}%

🩸 امتصاص حياة +${bonus.lifesteal}%

🛡 درع +${bonus.shield}%

🪞 انعكاس ضرر +${bonus.reflect}%`

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

if (text.startsWith('.equip') || text.startsWith('.لبس')) {

    const args = text.split(' ')

    if (!args[1] || !args[2]) {

        return safeSend(

            msg.key.remoteJid,

            {

                text:
`📌 الاستخدام

.لبس رقم_القطعة رقم_الشخصية

مثال:

.لبس 1 3

(أو بالإنجليزي: .equip 1 3)

💡 رقم القطعة كما يظهر في .حقيبتي
💡 رقم الشخصية كما يظهر في .شخصياتي`

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

    const equipCharIndex =

        Number(args[2])

    const equipCharacter =

        getCharacterByIndex(

            player,

            equipCharIndex

        )

    if (!equipCharacter) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: "❌ الشخصية غير موجودة."

            }

        )

    }

    const item =

        player.inventory[index]

    const result =

        equipmentSystem.equipItem(

            player,

            equipCharacter,

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
${item.type}

👤 على شخصية:
${equipCharacter.name}`

        }

    )

}
    // =========================
// Unequip Item
// =========================

if (text.startsWith('.unequip') || text.startsWith('.خلع')) {

    const args = text.split(' ')

    if (!args[1] || !args[2]) {

        return safeSend(

            msg.key.remoteJid,

            {

                text:
`📌 الاستخدام

.خلع سلاح رقم_الشخصية
.خلع درع رقم_الشخصية
.خلع اكسسوار رقم_الشخصية

مثال:
.خلع سلاح 3

(أو بالإنجليزي: .unequip weapon/armor/accessory 3)`

            }

        )

    }

    const slotMap = {

        weapon: "weapon",
        سلاح: "weapon",

        armor: "armor",
        درع: "armor",

        accessory: "accessory",
        اكسسوار: "accessory",
        إكسسوار: "accessory"

    }

    const slot =

        slotMap[args[1].toLowerCase()] ||
        slotMap[args[1]]

    if (!slot) {

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

    const unequipCharIndex =

        Number(args[2])

    const unequipCharacter =

        getCharacterByIndex(

            player,

            unequipCharIndex

        )

    if (!unequipCharacter) {

        return safeSend(

            msg.key.remoteJid,

            {

                text: "❌ الشخصية غير موجودة."

            }

        )

    }

    const result =

        equipmentSystem.unequipItem(

            player,

            unequipCharacter,

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

    const slotLabels = {

        weapon: "السلاح",
        armor: "الدرع",
        accessory: "الإكسسوار"

    }

    return safeSend(

        msg.key.remoteJid,

        {

            text:
`✅ تم خلع

${slotLabels[slot] || slot}

وإعادته إلى الحقيبة.`

        }

    )

}

    // =========================
    // Domain System - عرض الدومينات + الستامينا
    // =========================

    if (text === '.دومين' || text === '.domain' || text === '.دومينات') {

        const player = await Player.findOne({ userId })

        if (!player) {

            return safeSend(msg.key.remoteJid, {
                text: "❌ لا يوجد حساب."
            })

        }

        domainSystem.applyStaminaRegen(player)

        await player.save()

        const stamina = domainSystem.getStaminaInfo(player)

        const minutesToNext =
            Math.ceil(stamina.msToNext / 60000)

        let message =
`🌀 الدومينات

⚡ الستامينا: ${stamina.current}/${stamina.max}
💸 تكلفة كل دخول: ${domainSystem.DOMAIN_COST}
${stamina.current < stamina.max ? `⏳ أقرب نقطة تتجدد خلال ${minutesToNext} دقيقة` : ""}

━━━━━━━━━━━━━━

`

        for (const domain of domainSystem.listDomains()) {

            const team =
                domainSystem.getDomainTeamCharacters(player, domain.id)

            message +=
`${domain.emoji} دومين ${domain.id} - ${domain.name}
🎁 يسقط: ${domain.equipLabel}
👥 الفريق: ${team.length ? team.map(c => c.name).join('، ') : "لم يُحدد"}

`

        }

        message +=
`━━━━━━━━━━━━━━

📌 لتحديد فريق:
.فريق_دومين رقم_الدومين أرقام_الشخصيات
مثال: .فريق_دومين 1 123

📌 للدخول:
.دخول_دومين رقم_الدومين
مثال: .دخول_دومين 1`

        return safeSend(msg.key.remoteJid, {
            text: message
        })

    }

    // =========================
    // Domain System - تحديد فريق دومين معين
    // =========================

    if (text.startsWith('.فريق_دومين') || text.startsWith('.domain_team')) {

        const args = text.trim().split(/\s+/)

        const domainId = Number(args[1])
        const numberArgs = args.slice(2)

        if (!args[1] || !numberArgs.length || isNaN(domainId)) {

            return safeSend(msg.key.remoteJid, {

                text:
`📌 الاستخدام
.فريق_دومين رقم_الدومين أرقام_الشخصيات

مثال:
.فريق_دومين 1 1 2 3
.فريق_دومين 1 10 11 12

(الأرقام تعني الشخصيات من .شخصياتي، اكتب كل رقم مفصول بمسافة)`

            })

        }

        const indices =
            numberArgs
                .map(d => Number(d))
                .filter(n => !isNaN(n) && n > 0)

        const player = await Player.findOne({ userId })

        if (!player) {

            return safeSend(msg.key.remoteJid, {
                text: "❌ لا يوجد حساب."
            })

        }

        const result =
            domainSystem.setDomainTeam(player, domainId, indices)

        if (!result.success) {

            return safeSend(msg.key.remoteJid, {
                text: result.message
            })

        }

        await player.save()

        const team =
            domainSystem.getDomainTeamCharacters(player, domainId)

        return safeSend(msg.key.remoteJid, {

            text:
`✅ تم تحديد فريق دومين ${result.domain.name}

👥 ${team.map(c => c.name).join('، ')}`

        })

    }

    // =========================
    // Domain System - دخول الدومين والقتال
    // =========================

    if (text.startsWith('.دخول_دومين') || text.startsWith('.enter_domain')) {

        const args = text.split(' ')

        const domainId = Number(args[1])

        if (!args[1] || isNaN(domainId)) {

            return safeSend(msg.key.remoteJid, {

                text:
`📌 الاستخدام
.دخول_دومين رقم_الدومين

مثال:
.دخول_دومين 1`

            })

        }

        const player = await Player.findOne({ userId })

        if (!player) {

            return safeSend(msg.key.remoteJid, {
                text: "❌ لا يوجد حساب."
            })

        }

        const result =
            domainSystem.enterDomain(player, domainId)

        if (!result.success) {

            return safeSend(msg.key.remoteJid, {
                text: result.message
            })

        }

        await player.save()

        return safeSend(msg.key.remoteJid, {
            text: result.message
        })

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

    const targetId = "109891754655924@lid"

    let player = await Player.findOne({
        userId: targetId
    })

    if (!player) {

        player = new Player({
            userId: targetId
        })

    }

    await player.addMoney(100000000)

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

        const war = await ClanWar.create({

    warId: generateId(),

    chatId: msg.key.remoteJid,

    attackerClan: myClan.clanId,

    defenderClan: enemyClan.clanId,

    attackerLeader: sender,

    defenderLeader: mentioned,

    status: "pending",

    mode: "member"

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

war.status = "accepted"

if (!war.chatId) {
    war.chatId = msg.key.remoteJid
}

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

    const isOmegaChar =
        character.evolutionLevel === 7

    const stars =
        isOmegaChar
            ? "🌌".repeat(7)
            : "★".repeat(character.evolutionLevel) +
              "☆".repeat(6 - character.evolutionLevel)

    const evolutionLine =
        isOmegaChar
            ? `${stars} Ω (أقصى رتبة)`
            : `${stars} (${character.evolutionLevel}/6)`

    const caption =
`╔═══════〔 ${isOmegaChar ? "قدرات أوميقا Ω" : "قدرات EX"} 〕═══════╗

🧿 الشخصية
${character.name}

⭐ التطوير
${evolutionLine}

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
                image: await fs.promises.readFile(imagePath),
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

player.clanShop[week][item.id] = bought + 1
player.markModified("clanShop")
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

const remaining = item.limit - (bought + 1)

return safeSend(msg.key.remoteJid,{
text:
`✅ تم شراء:

${item.name}

💰 -${item.price} 🪙

📦 المتبقي:
${remaining}/${item.limit}`
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

    const lastClan = await Clan.findOne().sort({ clanId: -1 })

let lastNumber = 0

if (lastClan) {
    lastNumber = parseInt(lastClan.clanId.replace("CL", "")) || 0
}

const clanId = `CL${String(lastNumber + 1).padStart(3, "0")}`

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

await player.addMoney(rewardMoney)
player.xp += rewardXp

// تسجيل الدخول اليومي للمهمات
player.dailyMissions.login = true

// 🔥 حساب سلسلة المواظبة اليومية (streak)
const yesterday = new Date()
yesterday.setDate(yesterday.getDate() - 1)
const yesterdayStr =
    yesterday.toLocaleDateString(
        'en-CA',
        { timeZone: 'Asia/Riyadh' }
    )

if (player.dailyReward.lastClaim === yesterdayStr) {

    // استمرار متتالي
    player.dailyStreak = (player.dailyStreak || 0) + 1

} else {

    // انقطعت السلسلة أو أول مرة
    player.dailyStreak = 1
}

if (player.dailyStreak > (player.dailyStreakBest || 0)) {
    player.dailyStreakBest = player.dailyStreak
}

player.dailyReward.lastClaim =
today

await player.save()

await checkAndGrantAchievement(player, 'daily', player.dailyStreak, sock, msg.key.remoteJid)
await checkAndGrantAchievement(player, 'wealth', player.totalEarnedMoney, sock, msg.key.remoteJid)

return safeSend(
msg.key.remoteJid,
{
text:

`🎁 المكافأة اليومية

💰 ${rewardMoney.toLocaleString()} مال
📚 ${rewardXp} XP

🔥 سلسلة المواظبة: ${player.dailyStreak} يوم

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

await player.addMoney(2500000)

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

if (!players.length)
return 'لا يوجد لاعبين'

return players.map(
p =>
`${p.team === 'red' ? '🔴' : '🔵'} ${p.currentCharacter.name}`
).join('\n')
}

let redFlags = 0
let blueFlags = 0

Object.values(battle.flags).forEach(flag => {

if (flag.owner === 'red') redFlags++
if (flag.owner === 'blue') blueFlags++

})

return safeSend(
msg.key.remoteJid,
{
text:

`⚔️ حالة الحرب

⏱️ ${timeText}

👥 اللاعبين:
${battle.players.length}/${WAR_MAX_PLAYERS}

📊 النقاط
🔴 ${battle.redScore || 0}
🔵 ${battle.blueScore || 0}

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

maxPlayers: WAR_MAX_PLAYERS,

duration:
5 * 60,

redScore: 0,

blueScore: 0,

fights: {},

flags: {

A: { owner: null, progress: 0, capturingTeam: null, capturingPlayers: [] },
B: { owner: null, progress: 0, capturingTeam: null, capturingPlayers: [] },
C: { owner: null, progress: 0, capturingTeam: null, capturingPlayers: [] },
D: { owner: null, progress: 0, capturingTeam: null, capturingPlayers: [] },
E: { owner: null, progress: 0, capturingTeam: null, capturingPlayers: [] }

}
}

battleState.captureIntervals = {}

return safeSend(
msg.key.remoteJid,
{
text:

`⚔️ تم إنشاء حرب جديدة

👥 اللاعبين:
0/${WAR_MAX_PLAYERS}

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

captures: 0

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

👥 ${totalPlayers}/${WAR_MAX_PLAYERS}`
}
)

if (totalPlayers >= WAR_MAX_PLAYERS) {

await safeSend(
msg.key.remoteJid,
{
text:

`⚔️ اكتمل اللوبي

🔴 3 VS 3 🔵

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

// =========================
// 📊 تراكم النقاط الدوري (كل فريق = عدد أعلامه × قيمة ثابتة كل 10 ثواني)
// =========================

battleState.scoreInterval = setInterval(
async () => {

const battle =
battleState.activeBattle

if (!battle) {

clearInterval(
battleState.scoreInterval
)

battleState.scoreInterval = null

return
}

let redFlags = 0
let blueFlags = 0

Object.values(
battle.flags
).forEach(f => {

if (f.owner === 'red') redFlags++
if (f.owner === 'blue') blueFlags++

})

battle.redScore =
(battle.redScore || 0) +
(redFlags * WAR_SCORE_PER_FLAG)

battle.blueScore =
(battle.blueScore || 0) +
(blueFlags * WAR_SCORE_PER_FLAG)

},
WAR_SCORE_TICK_MS
)

setTimeout(
async () => {

const battle =
battleState.activeBattle

if (!battle) return

// تنظيف كل المؤقتات الجارية

if (battleState.scoreInterval) {

clearInterval(battleState.scoreInterval)
battleState.scoreInterval = null
}

for (const f of WAR_FLAG_LIST) {

if (battleState.captureIntervals[f]) {

clearInterval(
battleState.captureIntervals[f]
)

delete battleState.captureIntervals[f]
}
}

let redFlags = 0
let blueFlags = 0

Object.values(
battle.flags
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

const redScore = battle.redScore || 0
const blueScore = battle.blueScore || 0

let winner =
'تعادل'

if (redScore > blueScore) {

winner = '🔴 الأحمر'

} else if (blueScore > redScore) {

winner = '🔵 الأزرق'

} else {

// تعادل بالنقاط → الفيصل عدد الأعلام

if (redFlags > blueFlags) {

winner = '🔴 الأحمر'

} else if (blueFlags > redFlags) {

winner = '🔵 الأزرق'

} else {

winner = 'تعادل'
}
}

const mvp =
[...battle.players]
.sort(
(a, b) =>
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

const mentions =
battle.players.map(
p => p.userId
)

const results =
battle.players
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

const neutralFlags =
5 -
redFlags -
blueFlags

await sock.sendMessage(
battle.roomId,
{
text:

`🏁 انتهت الحرب

📊 النقاط النهائية

🔴 ${redScore}
🔵 ${blueScore}

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
battle.players
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

await playerData.addMoney(5000)
playerData.xp += 1000

} else {

await playerData.addMoney(2000)
playerData.xp += 300
}

await playerData.save()
}

battleState.activeBattle =
null

},

WAR_DURATION_MS
)
},
10000
)

}

return
}

if (text.startsWith('.احتل')) {

return safeSend(
msg.key.remoteJid,
{
text:

'❌ أمر .احتل غير مستخدم الآن\n\n✅ استخدم أمراً واحداً فقط:\n.اذهب <علم>'
}
)
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

function capturingInfo(flag) {

if (!flag.capturingTeam || !flag.capturingPlayers || !flag.capturingPlayers.length)
return 'لا يوجد'

return `${flag.capturingTeam === 'red' ? '🔴' : '🔵'} (${flag.capturingPlayers.length} لاعب)`

}

return safeSend(
msg.key.remoteJid,
{
text:

`🏴 حالة الأعلام

🏴 A ${owner(flags.A)}
${getFlagBar(flags.A.progress)}
${flags.A.progress}%
👥 يلتقط: ${capturingInfo(flags.A)}

━━━━━━━━━━━━━━━

🏴 B ${owner(flags.B)}
${getFlagBar(flags.B.progress)}
${flags.B.progress}%
👥 يلتقط: ${capturingInfo(flags.B)}

━━━━━━━━━━━━━━━

🏴 C ${owner(flags.C)}
${getFlagBar(flags.C.progress)}
${flags.C.progress}%
👥 يلتقط: ${capturingInfo(flags.C)}

━━━━━━━━━━━━━━━

🏴 D ${owner(flags.D)}
${getFlagBar(flags.D.progress)}
${flags.D.progress}%
👥 يلتقط: ${capturingInfo(flags.D)}

━━━━━━━━━━━━━━━

🏴 E ${owner(flags.E)}
${getFlagBar(flags.E.progress)}
${flags.E.progress}%
👥 يلتقط: ${capturingInfo(flags.E)}`
}
)
}

// =========================
// ⚔️ نظام القتال التلقائي للحرب
// =========================

function findWarFightablePair(flag) {

const battle =
battleState.activeBattle

if (!battle) return null

if (!battle.fights) battle.fights = {}

const onFlag =
battle.players.filter(
p =>
p.alive &&
p.flag === flag
)

const redFighter =
onFlag.find(
p =>
p.team === 'red' &&
!battle.fights[p.userId]
)

const blueFighter =
onFlag.find(
p =>
p.team === 'blue' &&
!battle.fights[p.userId]
)

if (redFighter && blueFighter) {

return {
attacker: redFighter,
enemy: blueFighter
}
}

return null
}

async function autoStartWarFight(flag) {

const battle =
battleState.activeBattle

if (!battle) return

const pair =
findWarFightablePair(flag)

if (!pair) return

const { attacker, enemy } = pair

if (!battle.fights) battle.fights = {}

battle.fights[attacker.userId] = true
battle.fights[enemy.userId] = true

// تجميد أي التقاط جارٍ على هذا العلم

if (battleState.captureIntervals[flag]) {

clearInterval(
battleState.captureIntervals[flag]
)

delete battleState.captureIntervals[flag]
}

const flagData = battle.flags[flag]

flagData.capturingTeam = null
flagData.capturingPlayers = []

const attackerMention =
'@' + attacker.userId.split('@')[0]

const enemyMention =
'@' + enemy.userId.split('@')[0]

const othersOnFlag =
battle.players.filter(
p =>
p.flag === flag &&
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
).join('\n')
:
'لا يوجد'

await safeSend(
battle.roomId,
{
mentions: [
attacker.userId,
enemy.userId
],

text:

`⚔️ اشتباك تلقائي على العلم ${flag}

${attacker.team === 'red' ? '🔴' : '🔵'} ${attackerMention}
👤 ${attacker.currentCharacter.name}

🆚

${enemy.team === 'red' ? '🔴' : '🔵'} ${enemyMention}
👤 ${enemy.currentCharacter.name}

━━━━━━━━━━━━━━━

👥 الموجودون على العلم:

${othersText}`
}
)

const fightInterval = setInterval(
async () => {

const battle2 =
battleState.activeBattle

if (!battle2) {

clearInterval(fightInterval)
return
}

if (
!attacker.alive ||
!enemy.alive
) {

clearInterval(fightInterval)

delete battle2.fights[attacker.userId]
delete battle2.fights[enemy.userId]

return
}

// ضربة المهاجم

let dmg1 = 0
let log1 = ''

const dodge1 =
Math.random() * 100 < 15

if (!dodge1) {

dmg1 =
Math.floor(
attacker.currentCharacter.power *
(0.9 + Math.random() * 0.3)
)

const crit1 =
Math.random() * 100 < 20

if (crit1) {

dmg1 =
Math.floor(dmg1 * 1.8)

log1 = '💥 ضربة حرجة\n'
}

enemy.currentHp -= dmg1

if (enemy.currentHp < 0)
enemy.currentHp = 0

} else {

log1 = '💨 مراوغة\n'
}

// ضربة العدو (فقط لو ما زال حياً بعد الضربة الأولى)

let dmg2 = 0
let log2 = ''

if (enemy.currentHp > 0) {

const dodge2 =
Math.random() * 100 < 15

if (!dodge2) {

dmg2 =
Math.floor(
enemy.currentCharacter.power *
(0.9 + Math.random() * 0.3)
)

const crit2 =
Math.random() * 100 < 20

if (crit2) {

dmg2 =
Math.floor(dmg2 * 1.8)

log2 = '💥 ضربة حرجة\n'
}

attacker.currentHp -= dmg2

if (attacker.currentHp < 0)
attacker.currentHp = 0

} else {

log2 = '💨 مراوغة\n'
}

} else {

log2 = '🛡️ لم يستطع الرد\n'
}

// رسالة واحدة موحدة لكل جولة تبادل

await safeSend(
battle2.roomId,
{
text:

`⚔️ جولة تبادل - العلم ${flag}

${log1}👤 ${attacker.currentCharacter.name}
💥 ${dmg1} ضرر ← ${enemy.currentCharacter.name}
❤️ ${enemy.currentHp}/${enemy.currentCharacter.power}

━━━━━━━━━━━━━━━

${log2}👤 ${enemy.currentCharacter.name}
💥 ${dmg2} ضرر ← ${attacker.currentCharacter.name}
❤️ ${attacker.currentHp}/${attacker.currentCharacter.power}`
}
)

const rounds = [
{ def: enemy, atk: attacker },
{ def: attacker, atk: enemy }
]

for (const r of rounds) {

if (
r.def.currentHp <= 0 &&
r.def.alive
) {

if (
!r.def.usingSecond &&
r.def.secondCharacter
) {

r.def.usingSecond = true

r.def.currentCharacter =
r.def.secondCharacter

r.def.currentHp =
r.def.secondCharacter.power

await safeSend(
battle2.roomId,
{
text:

`☠️ ماتت الشخصية الأولى

🔥 دخل:

${r.def.currentCharacter.name}`
}
)

continue
}

// قتل نهائي: سرقة نقاط فورية من فريق القتيل لفريق القاتل

r.atk.kills =
(r.atk.kills || 0) + 1

r.def.deaths =
(r.def.deaths || 0) + 1

r.def.alive = false

r.def.flag = null

r.def.respawning = true

const loserTeam = r.def.team
const winnerTeam = r.atk.team

if (loserTeam === 'red') {

battle2.redScore =
Math.max(0, (battle2.redScore || 0) - WAR_KILL_STEAL_POINTS)

} else {

battle2.blueScore =
Math.max(0, (battle2.blueScore || 0) - WAR_KILL_STEAL_POINTS)
}

if (winnerTeam === 'red') {

battle2.redScore =
(battle2.redScore || 0) + WAR_KILL_STEAL_POINTS

} else {

battle2.blueScore =
(battle2.blueScore || 0) + WAR_KILL_STEAL_POINTS
}

await safeSend(
battle2.roomId,
{
text:

`☠️ ${r.def.currentCharacter.name}

هُزم نهائياً

💰 سرقة نقاط: ${loserTeam === 'red' ? '🔴' : '🔵'} -${WAR_KILL_STEAL_POINTS} ⇄ ${winnerTeam === 'red' ? '🔴' : '🔵'} +${WAR_KILL_STEAL_POINTS}

⏳ Respawn خلال 30 ثانية`
}
)

setTimeout(
async () => {

if (!battleState.activeBattle) return

r.def.alive = true
r.def.respawning = false
r.def.currentCharacter = r.def.originalCharacter
r.def.usingSecond = false
r.def.currentHp = r.def.originalCharacter.power

await safeSend(
battleState.activeBattle.roomId,
{
text:

`🔄 عاد

${r.def.currentCharacter.name}

إلى المعركة`
}
)

},
30000
)

clearInterval(fightInterval)

delete battle2.fights[attacker.userId]
delete battle2.fights[enemy.userId]

return
}
}

},

3000
)

}

// =========================
// .اذهب A  (أمر وحيد يغني عن .اذهب و .احتل)
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

const battle =
battleState.activeBattle

const args =
text.trim().split(' ')

const flag =
args[1]?.toUpperCase()

if (
!WAR_FLAG_LIST.includes(flag)
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
battle.players
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

if (player.respawning) {

return safeSend(
msg.key.remoteJid,
{
text:
'⏳ أنت ميت حالياً، انتظر الـ Respawn'
}
)
}

// إزالة اللاعب من الالتقاط الجماعي بالعلم القديم (إن وجد)

const oldFlag =
player.flag

if (
oldFlag &&
battle.flags[oldFlag]
) {

const oldFlagData =
battle.flags[oldFlag]

oldFlagData.capturingPlayers =
(oldFlagData.capturingPlayers || [])
.filter(id => id !== userId)

if (
oldFlagData.capturingPlayers.length === 0 &&
battleState.captureIntervals[oldFlag]
) {

clearInterval(
battleState.captureIntervals[oldFlag]
)

delete battleState.captureIntervals[oldFlag]

oldFlagData.capturingTeam = null
}
}

player.flag = flag

const flagData =
battle.flags[flag]

const enemiesOnFlag =
battle.players.filter(
p =>
p.userId !== userId &&
p.team !== player.team &&
p.flag === flag &&
p.alive
)

// فيه عدو على العلم → اشتباك تلقائي فوري (بدون أمر .قاتل يدوي)

if (enemiesOnFlag.length > 0) {

await safeSend(
msg.key.remoteJid,
{
text:

`🏃‍♂️ توجهت إلى العلم ${flag}

⚔️ يوجد عدو هناك، بدء اشتباك تلقائي...`
}
)

await autoStartWarFight(flag)

return
}

// العلم محتل بالفعل من فريقك ولا يحتاج التقاط

if (flagData.owner === player.team) {

return safeSend(
msg.key.remoteJid,
{
text:

`🏃‍♂️ توجهت إلى العلم ${flag}

✅ العلم تحت سيطرة فريقك بالفعل ${player.team === 'red' ? '🔴' : '🔵'}`
}
)
}

// فاضي أو للعدو ومافيه عدو حالياً → التقاط تلقائي جماعي فوري

if (!flagData.capturingPlayers) {
flagData.capturingPlayers = []
}

flagData.capturingTeam = player.team

if (!flagData.capturingPlayers.includes(userId)) {
flagData.capturingPlayers.push(userId)
}

await safeSend(
msg.key.remoteJid,
{
text:

`🏃‍♂️ توجهت إلى العلم ${flag}

🏴 بدأ الالتقاط التلقائي
👥 ${flagData.capturingPlayers.length} لاعب يلتقط الآن`
}
)

if (!battleState.captureIntervals[flag]) {

battleState.captureIntervals[flag] = setInterval(
async () => {

const battle2 =
battleState.activeBattle

if (!battle2) {

clearInterval(
battleState.captureIntervals[flag]
)

delete battleState.captureIntervals[flag]

return
}

const fd =
battle2.flags[flag]

// تحقق: هل دخل عدو للعلم أثناء الالتقاط؟

const enemyNow =
battle2.players.some(
p =>
p.alive &&
p.flag === flag &&
p.team !== fd.capturingTeam
)

if (enemyNow) {

clearInterval(
battleState.captureIntervals[flag]
)

delete battleState.captureIntervals[flag]

await safeSend(
battle2.roomId,
{
text:

`⚠️ دخل عدو للعلم ${flag}

⏸️ تجمد تقدم الالتقاط

⚔️ بدء اشتباك تلقائي...`
}
)

await autoStartWarFight(flag)

return
}

// تحديث قائمة اللاعبين الفعليين الملتقطين (الأحياء على نفس العلم فقط)

const activeCapturers =
(fd.capturingPlayers || [])
.filter(id =>
battle2.players.find(
p =>
p.userId === id &&
p.alive &&
p.flag === flag
)
)

fd.capturingPlayers = activeCapturers

if (activeCapturers.length === 0) {

clearInterval(
battleState.captureIntervals[flag]
)

delete battleState.captureIntervals[flag]

fd.capturingTeam = null

return
}

const multiplier =
getWarCaptureMultiplier(activeCapturers.length)

const delta =
Math.round(WAR_CAPTURE_BASE_PROGRESS * multiplier)

if (
fd.owner &&
fd.owner !== fd.capturingTeam
) {

fd.progress -= delta

if (fd.progress <= 0) {

fd.progress = 0
fd.owner = null

await safeSend(
battle2.roomId,
{
text:

`🏴 العلم ${flag}

أصبح محايداً ⚪`
}
)
}

} else {

fd.progress += delta

if (fd.progress >= 100) {

fd.progress = 100

const winningTeam = fd.capturingTeam

fd.owner = winningTeam

clearInterval(
battleState.captureIntervals[flag]
)

delete battleState.captureIntervals[flag]

for (const id of activeCapturers) {

const p =
battle2.players.find(
pp => pp.userId === id
)

if (p) {
p.captures = (p.captures || 0) + 1
}
}

fd.capturingTeam = null
fd.capturingPlayers = []

await safeSend(
battle2.roomId,
{
text:

`🏆 تم احتلال العلم ${flag}

${winningTeam === 'red' ? '🔴' : '🔵'}

👥 ${activeCapturers.length} لاعب شاركوا بالالتقاط

📊 100%`
}
)
}
}

},

WAR_CAPTURE_TICK_MS
)
}

return
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

return safeSend(
msg.key.remoteJid,
{
text:

'⚔️ القتال أصبح تلقائياً بالكامل\n\nيبدأ فوراً بمجرد وجود فريقين على نفس العلم، لا حاجة لاستخدام .قاتل'
}
)
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

    const now = Date.now()

    const remaining = Math.max(
        0,
        (player.favoriteExpires || 0) - now
    )

    const days = Math.floor(
        remaining / (1000 * 60 * 60 * 24)
    )

    const hours = Math.floor(
        (remaining % (1000 * 60 * 60 * 24)) /
        (1000 * 60 * 60)
    )

    const minutes = Math.floor(
        (remaining % (1000 * 60 * 60)) /
        (1000 * 60)
    )

    const seconds = Math.floor(
        (remaining % (1000 * 60)) / 1000
    )

    if (!player.favoriteCharacter) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
`❌ لا توجد شخصية مفضلة حالياً

⏳ الوقت المتبقي:

📅 ${days} يوم
🕒 ${hours} ساعة
⏱️ ${minutes} دقيقة
⌛ ${seconds} ثانية`
            }
        )
    }

    const character = characters.find(
        c => c.name === player.favoriteCharacter &&
             c.rarity === 'SSS'
    )

    if (!character) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: "❌ الشخصية غير موجودة في characters.json"
            }
        )

    }

    const caption =
`⭐ ═════〔 الشخصية المفضلة 〕═════ ⭐

👤 الشخصية
${character.name}

🌌 الأنمي
${character.anime}

⚔️ القوة
${character.power}

🏆 الندرة
${character.rarity}

━━━━━━━━━━━━━━

🎯 النسخ المحصلة
${player.favoriteObtained}/2

━━━━━━━━━━━━━━

⏳ يتبقى على انتهاء المفضلة:

📅 ${days} يوم
🕒 ${hours} ساعة
⏱️ ${minutes} دقيقة
⌛ ${seconds} ثانية`

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
        path.join(__dirname, "..", character.image)

    if (fs.existsSync(imagePath)) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                image: await fs.promises.readFile(imagePath),
                caption
            }
        )

    }

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: caption
        }
    )
}
    
if (text === '.استرجاع_sss') {

    const players = await Player.find({})
    let updated = 0

    for (const player of players) {

        let changed = false

        for (const char of player.characters) {

            // فقط شخصيات SSS
            if (char.rarity !== 'SSS') continue

            // لا نلمس أي شخصية مطورة
            if ((char.evolutionLevel || 0) > 0) continue

            const original = characters.find(c =>
                c.name.trim().toLowerCase() === char.name.trim().toLowerCase() &&
                c.rarity === 'SSS'
            )

            if (!original) continue

            Object.assign(char, original)

            changed = true
            updated++
        }

        if (changed) {
            player.markModified('characters')
            await player.save()
        }
    }

    return sock.sendMessage(msg.key.remoteJid, {
        text:
`✅ تم تحديث جميع شخصيات SSS غير المطورة

📦 تم تحديث:
• الاسم
• الصورة
• الفورم
• الأنمي
• القدرة
• القوة
• الندرة
• جميع البيانات من characters.json

🛡️ الشخصيات المطورة لم يتم تعديلها.

✨ عدد الشخصيات: ${updated}`
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

    await player.addMoney(stage.reward)

    player.kingdomRaid.usedCharacters.push(
        char.name
    )

    player.kingdomRaid.stage++

    // 🏆 عداد مدى الحياة لا يتصفّر يومياً (بعكس kingdomRaid.stage)
    // هذا هو المعتمد لإنجاز غزو الممالك عشان التقدم يتراكم عبر الأيام
    player.kingdomTotalStages =
        (player.kingdomTotalStages || 0) + 1

    player.markModified(
        'kingdomRaid'
    )

    await player.save()

    await checkAndGrantAchievement(player, 'kingdom', player.kingdomTotalStages, sock, msg.key.remoteJid)

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
                    
    
// =========================
// .دمج — قواعد الدمج المتاحة
// 5 ممتاز  ➜ 1 اسطوري
// 5 اسطوري ➜ 1 SSS
// =========================
const MERGE_RULES = {
    'ممتاز': { result: 'اسطوري' },
    'اسطوري': { result: 'SSS' },
    'أسطوري': { result: 'SSS' } // دعم الهمزة بالحالتين
}

if (
    text.startsWith('.دمج') &&
    !text.startsWith('.دمج_الكل')
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

    const args =
        text.trim().split(/\s+/)

    const count =
        parseInt(args[1])

    const rarityInputRaw =
        args.slice(2).join(' ').trim()

    // توحيد الهمزة (أسطوري / اسطوري) لنفس القيمة المستخدمة بالبيانات
    const rarityInput =
        rarityInputRaw === 'أسطوري'
            ? 'اسطوري'
            : rarityInputRaw

    const rule =
        MERGE_RULES[rarityInput]

    if (
        count !== 5 ||
        !rule
    ) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:

`❌ الاستخدام الصحيح

.دمج 5 ممتاز
➜ يعطيك شخصية اسطورية

.دمج 5 أسطوري
➜ يعطيك شخصية SSS`
            }
        )
    }

    player.characters =
        player.characters || []

    const matchingIndexes = []

    player.characters.forEach(
        (c, i) => {

            if (
                c &&
                c.rarity === rarityInput
            ) {
                matchingIndexes.push(i)
            }
        }
    )

    if (matchingIndexes.length < 5) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:

`❌ تحتاج 5 شخصيات من رتبة ${rarityInput}

📦 لديك حاليًا: ${matchingIndexes.length}`
            }
        )
    }

    const rewardPool =
        characters.filter(
            c =>
            c.rarity === rule.result
        )

    if (!rewardPool.length) {
        return safeSend(
            msg.key.remoteJid,
            {
                text:
                `❌ لا توجد شخصيات من رتبة ${rule.result}`
            }
        )
    }

    const reward =
        JSON.parse(
            JSON.stringify(
                rewardPool[
                    Math.floor(
                        Math.random() *
                        rewardPool.length
                    )
                ]
            )
        )

    const selectedIndexes =
        matchingIndexes
            .slice(0, 5)
            .sort((x, y) => y - x)

    for (const i of selectedIndexes) {
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

    player.totalMerges =
        (player.totalMerges || 0) + 1

    await player.save()

    await checkAndGrantAchievement(
        player,
        'fusion',
        player.totalMerges,
        sock,
        msg.key.remoteJid
    )

    return safeSend(
        msg.key.remoteJid,
        {
            image: {
                url:
                reward.image
            },

            caption:

`✨ ═══════〔 الدمج 〕═══════ ✨

🔥 تم دمج 5 شخصيات من رتبة ${rarityInput}

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

resortPlayerCharacters(player)

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
char.name.replace(/\./g, "．")

const currentLevel =
    char.evolutionLevel || 0

if (currentLevel >= 7) {

    return safeSend(
        msg.key.remoteJid,
        {
            text:
`👑 ${char.name}

🌌 وصلت الشخصية إلى رتبة Ω أوميقا بالفعل، أعلى رتبة ممكنة`
        }
    )
}

// =========================
// 🌌 تطوير أوميقا Ω (بعد EX — رتبة أسطورية خاصة، 5 تطويرات فقط مدى الحياة لكل لاعب)
// =========================

if (currentLevel === 6) {

    if ((player.omegaEvolutions || 0) >= 5) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ وصلت للحد الأقصى

🌌 تقدر تطور 5 شخصيات فقط لرتبة Ω أوميقا مدى الحياة

👑 استخدمت جميع محاولاتك (5/5)`
            }
        )
    }

    const omegaShardsNeeded = 12
    const omegaCost = 15000000
    const omegaPower = 40000

    const omegaShards =
        player.shards.get(shardKey) || 0

    if (omegaShards < omegaShardsNeeded) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:

`❌ لا تملك شظايا كافية لتطوير أوميقا

🧩 ${char.name}

📦 ${omegaShards}/${omegaShardsNeeded}`
            }
        )
    }

    if (player.money < omegaCost) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:

`❌ تحتاج

💰 ${omegaCost.toLocaleString()}`
            }
        )
    }

    player.money -= omegaCost

    player.shards.set(
        shardKey,
        omegaShards - omegaShardsNeeded
    )

    player.markModified('shards')

    char.evolutionLevel = 7
    char.power = omegaPower

    player.omegaEvolutions =
        (player.omegaEvolutions || 0) + 1

    // قدرة أوميقا عشوائية (أقوى بكثير من قدرات EX العادية)
    const availableOmegaAbilities =
        omegaAbilities.filter(
            a =>
            !char.urAbilities.some(
                owned => owned.name === a.name
            )
        )

    let omegaAbility = null

    if (availableOmegaAbilities.length) {

        const totalChance =
            availableOmegaAbilities.reduce(
                (sum, a) => sum + a.chance,
                0
            )

        let roll = Math.random() * totalChance

        for (const ability of availableOmegaAbilities) {

            roll -= ability.chance

            if (roll <= 0) {
                omegaAbility = ability
                break
            }
        }

        if (!omegaAbility) {
            omegaAbility =
                availableOmegaAbilities[
                    availableOmegaAbilities.length - 1
                ]
        }
    }

    if (omegaAbility) {
        char.urAbilities.push(omegaAbility)
    }

    player.markModified('characters')

    const latestOmegaCharacter = characters.find(
        c => c.name === char.name
    )

    if (latestOmegaCharacter?.image) {
        char.image = latestOmegaCharacter.image
    }

    await player.save()

    await checkAndGrantAchievement(player, 'omega', player.omegaEvolutions, sock, msg.key.remoteJid)

    await worlds.awardEvolutionPoints(
        sock,
        msg.key.remoteJid,
        userId,
        'Ω'
    )

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: char.image
            },

            caption:

`╔═══━━━✦❖✦━━━═══╗
      🌌 𝗢𝗠𝗘𝗚𝗔 𝗔𝗦𝗖𝗘𝗡𝗦𝗜𝗢𝗡 🌌
╚═══━━━✦❖✦━━━═══╝

☄️ تحطمت كل الحدود المعروفة
🌑 وُلدت قوة لا تُضاهى
👑 ${char.name} تجاوزت حدود EX نفسها

╭━━〔 🌌 التطور الأسطوري 🌌 〕━━╮
┃ EX ➜ Ω 𝐎𝐌𝐄𝐆𝐀
╰━━━━━━━━━━━━━━━━━━━━━━╯

⚔️ القوة القتالية
┗➤ ${char.power.toLocaleString()}

💰 التكلفة
┗➤ ${omegaCost.toLocaleString()}

🧩 الشظايا المستهلكة
┗➤ ${omegaShardsNeeded}

${omegaAbility ? `╭━━〔 🔥 قدرة أوميقا 🔥 〕━━╮
┃ ${omegaAbility.name}
┃
┃ 📈 ${omegaAbility.description}
╰━━━━━━━━━━━━━━━━━━━━━━╯

` : ''}🏆 محاولة أوميقا المستخدمة: ${player.omegaEvolutions}/5

✨ أصبحت الشخصية الآن ضمن
👑 نخبة الأساطير Ω 👑

╔═══━━━✦❖✦━━━═══╗
      🌌 𝗕𝗘𝗬𝗢𝗡𝗗 𝗧𝗛𝗘 𝗟𝗜𝗠𝗜𝗧 🌌
╚═══━━━✦❖✦━━━═══╝`
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

player.markModified('characters')

const latestCharacter = characters.find(
    c => c.name === char.name
)

if (latestCharacter?.image) {
    char.image = latestCharacter.image
}

await player.save()

const oldRank =
    ranks[oldLevel]

const newRank =
    ranks[newLevel]

await worlds.awardEvolutionPoints(
    sock,
    msg.key.remoteJid,
    userId,
    newRank
)

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

    // إذا عندك نسخة من هذي الشخصية وصلت رتبة EX، معناها جاهزة لتطوير أوميقا (يحتاج 12 شظية بدل 2)
    const matchingChar =
        player.characters.find(c =>
            c.name === displayName ||
            c.name.replace(/\./g, "．") === name
        )

    const isOmegaEligible =
        matchingChar &&
        matchingChar.evolutionLevel === 6

    const target =
        isOmegaEligible ? 12 : 2

    const icon =
    amount >= target
    ? '🟩'
    : '🟨'

msgText +=
`${index}- ${icon} ${displayName} • ${amount}/${target}${isOmegaEligible ? ' 🌌 Ω' : ''}\n`

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
    player.kuramaDead &&
    player.kuramaRespawn
) {

    if (
        Date.now() <
        new Date(
            player.kuramaRespawn
        ).getTime()
    ) {

        const remaining =
            Math.ceil(
                (
                    new Date(
                        player.kuramaRespawn
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

    player.kuramaDead = false
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

           if (!player.kuramaHp || player.kuramaMaxHp !== 60000) {

    player.kuramaHp = 60000
    player.kuramaMaxHp = 60000

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

        p.kuramaHp =
    Math.max(
        0,
        (p.kuramaHp || 60000) - beastDamage
    )

        if (p.kuramaHp <= 0) {

    p.kuramaHp = 0
    p.kuramaDead = true

    p.kuramaRespawn =
        new Date(
            Date.now() +
            5 * 60 * 1000
        )

    raidText +=

`☠️ @${participantId.split('@')[0]}

تم القضاء عليه

⏳ سيعود بعد 5 دقائق

❤️ 0/${p.kuramaMaxHp.toLocaleString()}

`

} else {

    raidText +=

`⚔️ @${participantId.split('@')[0]}

💥 -${beastDamage.toLocaleString()}

❤️ ${p.kuramaHp.toLocaleString()}/${p.kuramaMaxHp.toLocaleString()}

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
    player.juubiDead &&
    player.juubiRespawn
) {

    if (
        Date.now() <
        new Date(
            player.juubiRespawn
        ).getTime()
    ) {

        const remaining =
            Math.ceil(
                (
                    new Date(
                        player.juubiRespawn
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

    player.juubiDead = false
player.juubiHp = 60000
player.juubiMaxHp = 60000

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
        if (!player.juubiHp || !player.juubiMaxHp) {

    player.juubiHp = 60000
    player.juubiMaxHp = 60000
    player.juubiDead = false

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

        p.juubiHp =
    Math.max(
        0,
        (p.juubiHp || 60000) - beastDamage
    )

        if (p.juubiHp <= 0) {

            p.juubiHp = 0

            p.juubiDead = true

            p.juubiRespawn =
                new Date(
                    Date.now() +
                    5 * 60 * 1000
                )

            raidText +=

`☠️ @${participantId.split('@')[0]}

تم القضاء عليه

⏳ سيعود بعد 5 دقائق

❤️ 0/${p.juubiMaxHp.toLocaleString()}

`
        } else {

            raidText +=

`⚔️ @${participantId.split('@')[0]}

💥 -${beastDamage.toLocaleString()}

❤️ ${p.juubiHp.toLocaleString()}/${p.juubiMaxHp.toLocaleString()}

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

    const beastPercentOld =
        (beast.attack || 0) +
        (beast.defense || 0) +
        (beast.hp || 0) +
        (beast.crit || 0) +
        (beast.dodge || 0) +
        (beast.reflect || 0)

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`✅ تم تجهيز

👹 ${beast.name}

📊 نسبة القوة ضد الزعيم: ${beastPercentOld}%

⚔️ كل 5 ضربات على الزعيم سيساعدك وحشك بهجوم إضافي`
        }
    )
    }

    // 🐉 تركيب وحش مباشرة عبر .تركيب_اسم_الوحش
    // مثال: .تركيب_كوراما
    if (
        text.startsWith('.تركيب_') &&
        text !== '.تركيب_'
    ) {

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

    const beasts =
        require('./systems/beasts')

    const suffix =
        text
            .replace('.تركيب_', '')
            .trim()
            .replace(/\s+/g, '')
            .replace(/^ال/, '')

    const beast =
        beasts.find(b => {

            const normalizedName =
                b.name
                    .trim()
                    .replace(/\s+/g, '')
                    .replace(/^ال/, '')

            return (
                normalizedName === suffix ||
                b.id === suffix
            )
        })

    if (!beast) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:

`❌ هذا الوحش غير موجود

📌 مثال:
.تركيب_كوراما`
            }
        )
    }

    if (
        !player.ownedBeasts ||
        !player.ownedBeasts.includes(beast.id)
    ) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
`❌ لا تملك ${beast.name}`
            }
        )
    }

    player.equippedBeast =
        beast.id

    await player.save()

    const beastPercent =
        (beast.attack || 0) +
        (beast.defense || 0) +
        (beast.hp || 0) +
        (beast.crit || 0) +
        (beast.dodge || 0) +
        (beast.reflect || 0)

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`🐉 تم تركيب الوحش بنجاح

👹 ${beast.name}
⭐ ${beast.rarity}

📊 نسبة القوة ضد الزعيم: ${beastPercent}%

⚔️ يستفيد هجومك من جزء من هذه النسبة بشكل دائم
🔥 وكل 5 ضربات يهاجمك معك وحشك بكامل نسبته`
        }
    )
}

    if (text === '.استلام_الجوبي') {

    // 👑 نسخة الأدمن: تفحص كل اللاعبين وتمنح الجوبي تلقائياً
    // لكل من جمع الوحوش التسعة سابقاً ولم يستلمه (إصلاح رجعي شامل)
    if (isOwner(msg)) {

        const requiredBeastsAll = [
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

        const allPlayers = await Player.find({})

        let fixedCount = 0

        for (const p of allPlayers) {

            if (p.ownedBeasts?.includes('juubi')) continue

            const hasAllBeastsBulk =
                requiredBeastsAll.every(
                    id => p.ownedBeasts?.includes(id)
                )

            if (!hasAllBeastsBulk) continue

            p.ownedBeasts.push('juubi')

            await p.save()

            fixedCount++
        }

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:

`🌌 ═════〔 إصلاح الجوبي الشامل 〕═════ 🌌

📊 تم فحص ${allPlayers.length} لاعب

✅ تم منح الجوبي لـ ${fixedCount} لاعب كانوا مستحقين ولم يستلموه`
            }
        )
    }

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

    if (player.ownedBeasts?.includes('juubi')) {

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: '✅ تملك الجوبي بالفعل'
            }
        )
    }

    const requiredBeastsClaim = [
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

    const hasAll =
        requiredBeastsClaim.every(
            id =>
                player.ownedBeasts?.includes(id)
        )

    if (!hasAll) {

        const missing =
            requiredBeastsClaim.filter(
                id =>
                    !player.ownedBeasts?.includes(id)
            ).length

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
`❌ لم تجمع كل الوحوش بعد

📦 الناقص: ${missing} وحش

📊 استخدم .وحوشي لمعرفة ما تملك`
            }
        )
    }

    player.ownedBeasts.push('juubi')

    await player.save()

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text:

`🌌 مبروك!

🏆 جمعت جميع الوحوش التسعة

👑 حصلت على الجوبي

📌 استخدم .تركيب_جوبي لتجهيزه`
        }
    )
}

    if (text === '.انجازاتي') {

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

    const achievementsSys =
        require('./systems/achievements')

    const baseline =
        player.achievementBaseline || {}

    // القيم الخام الحالية لكل تصنيف (نفس المصادر المستخدمة بالربط)
    const rawValues = {
        pvp: player.wins || 0,
        boss: player.totalBossDamage || 0,
        beasts: player.beastEggsOpened || 0,
        brawl: player.brawlWins || 0,
        tower: player.towerFloor || 0,
        kingdom: player.kingdomTotalStages || 0,
        omega: player.omegaEvolutions || 0,
        pulls: player.totalPulls || 0,
        boxes: player.boxesOpened || 0,
        daily: player.dailyStreak || 0,
        wealth: player.totalEarnedMoney || 0,
        collection: (player.characters && player.characters.length) || 0,
        fusion: player.totalMerges || 0
    }

    // 📍 نطرح خط الأساس (قيمة آخر تصفير) — نفس منطق checkAndGrantAchievement
    // عشان العرض يطابق التقدم الفعلي المحسوب من نقطة التصفير فقط
    const currentValues = {}

    for (const key in rawValues) {
        currentValues[key] =
            Math.max(0, rawValues[key] - (baseline[key] || 0))
    }

    let result =
`🏆 ═════〔 إنجازاتي 〕═════ 🏆

`

    let totalClaimed = 0
    let totalTiers = 0

    for (const categoryKey in currentValues) {

        const summary =
            achievementsSys.getProgressSummary(
                player,
                categoryKey,
                currentValues[categoryKey]
            )

        if (!summary) continue

        totalClaimed += summary.claimedCount
        totalTiers += summary.totalTiers

        const progressBar =
            '✅'.repeat(summary.claimedCount) +
            '⬜'.repeat(summary.totalTiers - summary.claimedCount)

        result +=
`${summary.icon} ${summary.name}
${progressBar}
`

        if (summary.nextTier) {

            result +=
`📍 التالي: ${summary.nextTier.label} (${currentValues[categoryKey].toLocaleString()}/${summary.nextTier.target.toLocaleString()})

`

        } else {

            result +=
`🌟 مكتمل بالكامل!

`
        }
    }

    result +=
`━━━━━━━━━━━━━━

📊 الإجمالي: ${totalClaimed}/${totalTiers} إنجاز مُستلم`

    return sock.sendMessage(
        msg.key.remoteJid,
        {
            text: result
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

    // مكافأة الجوبي عند جمع الجميع (نفس منطق شراء الوحش)
    const requiredBeastsEgg = [
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

    const completedEgg =
        requiredBeastsEgg.every(
            id =>
                player.ownedBeasts.includes(id)
        )

    let eggRewardText = ''

    if (
        completedEgg &&
        !player.ownedBeasts.includes('juubi')
    ) {

        player.ownedBeasts.push('juubi')

        eggRewardText =

`\n\n🌌 إنجاز مكتمل

🏆 جمعت جميع الوحوش

👑 حصلت على الجوبي!`
    }

    await player.save()

    await checkAndGrantAchievement(player, 'beasts', player.beastEggsOpened, sock, msg.key.remoteJid)

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
${player.beastCollection}${eggRewardText}`
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

// 🏆 نفس عداد إنجاز الوحوش المستخدم بفتح البيض — يحسب كل عملية اقتناء وحش
player.beastEggsOpened =
    (player.beastEggsOpened || 0) + 1

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

await checkAndGrantAchievement(player, 'beasts', player.beastEggsOpened, sock, msg.key.remoteJid)

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
            (Math.floor((player.level || 1) / 10) * 5) +
            (5 * 5)

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
• إنهاء البرج 5 مرات (+25 مخزون)`
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

    // =====================
    // 1) نحاول نجاوب من الحقائق المخزنة مباشرة (بدون AI)
    // هذا يعطي دقة 100% للأسئلة الشائعة (الجنس/حي أو ميت/بشري أو لا/الانتماء)
    // =====================

    const factAnswer =
        matchFactAnswer(text, character)

    if (factAnswer) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❓ السؤال رقم ${global.guessGame.questions}

🤖 ${factAnswer}`
            }
        )

    }

    // =====================
    // 2) ما وجدنا تطابق مباشر — نسأل الذكاء الاصطناعي
    // لكن نزوده بالحقائق المؤكدة فقط، بدل ما يعتمد على معرفته العامة
    // (اللي كانت سبب الإجابات العشوائية/غير الدقيقة)
    // =====================

    const factsList =
        (character.facts && character.facts.length)
        ? character.facts
            .map(f => `- ${f}`)
            .join('\n')
        : 'لا توجد حقائق إضافية مسجلة لهذه الشخصية.'

    const answer = await askGemini(
`أنت حكم رسمي في لعبة تخمين شخصيات الأنمي.

الشخصية الصحيحة:

الاسم: ${character.name}
الأنمي: ${character.anime}

الحقائق المؤكدة عن هذه الشخصية (أعلى أولوية عند وجود تعارض):

${factsList}

القواعد:

- إذا كانت الحقائق المؤكدة أعلاه تجيب صراحة عن سؤال اللاعب (تثبته أو تنفيه) فاعتمد عليها حصراً.
- إذا كان سؤال اللاعب لا تغطيه الحقائق المؤكدة، استخدم معرفتك الحقيقية الفعلية عن شخصية "${character.name}" من أنمي "${character.anime}" (قصتها، صفاتها، عاداتها، علاقاتها، قدراتها كما وردت فعلياً في القصة الأصلية) وأجب بدقة ومنطقياً.
- أجب بشكل حاسم قدر الإمكان. لا تستخدم "لا أعلم" إلا إذا كان السؤال غامضاً جداً بحيث لا يمكن فهمه، أو لا علاقة له إطلاقاً بأي شخصية أنمي.
- إذا كان السؤال عن الأنمي الذي تنتمي له الشخصية فاعتمد فقط على قيمة الأنمي المذكورة أعلاه.
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

            await player.addMoney(500000)
            player.xp += 100000
            player.boxes.sss_high += 1

        } else if (i === 1) {

            await player.addMoney(250000)
            player.xp += 50000
            player.boxes.sss_chance += 1

        } else if (i === 2) {

            await player.addMoney(100000)
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
`🆔 آيدي الشخص:
${userId}

👥 آيدي القروب:
${msg.key.remoteJid}`
        }
    )
}
    
if (text.startsWith('.بدا_مسابقة')) {

    const room = quizData.getQuizRoom(msg.key.remoteJid)

    if (room.quizActive) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ توجد مسابقة شغالة بالفعل في هذا القروب'
        })
    }

    const parts = text.trim().split(/\s+/)

    let rounds = parseInt(parts[1])

    if (isNaN(rounds) || rounds <= 0) {
        rounds = DEFAULT_MAX_ROUNDS
    }

    room.quizActive = true
    room.quizMode = "mixed"
    room.targetScore = null
    room.maxRounds = rounds

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
`🎮 تم بدء المسابقة

📊 عدد الجولات:
${room.maxRounds}`
    })

    await startQuestion(sock, msg.key.remoteJid)

    return
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

// ⏳ محاولات .تحدي: 5 محاولات، تتجدد عند رأس كل ساعتين بتوقيت السعودية (2، 4، 6 ...)
const currentChallengePeriod =
    getCurrentSaudi2HourPeriod()

if (
    player1Data.lastChallengeReset !==
    currentChallengePeriod
) {
    player1Data.challengeFights = 5
    player1Data.lastChallengeReset =
        currentChallengePeriod

    await player1Data.save()
}

if ((player1Data.challengeFights || 0) <= 0) {
    return safeSend(msg.key.remoteJid, {
        text:
`❌ انتهت محاولات التحدي

⏳ تتجدد 5 محاولات كل ساعتين (بتوقيت السعودية)`
    })
}

player1Data.challengeFights -= 1
await player1Data.save()

function getGroupHP(player) {

    if (!player.characters?.length)
        return 1000

    const totalPower =
        player.characters.reduce(
            (total, char) =>
                total + Number(char.power || 0),
            0
        )

    const HP_CAP = 150000
    const HP_MIN = 1000
    const HP_SCALE = 75

    const rawHp =
        Math.floor(HP_SCALE * Math.sqrt(totalPower))

    return Math.min(HP_CAP, Math.max(HP_MIN, rawHp))
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

.قبول_تحدي

أو

.رفض_تحدي`,
        mentions: [target]
    })
    }
    if (text === '.رفض_تحدي') {

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
    

    if (text === '.قبول_تحدي') {

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
fight.lastMove = new Date()

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

// 🛡️ بونص المعدات (نظام المعدات الجديد - يُطبَّق فقط على .مضاربة)
// يُجمع بونص معدات كل شخصيات الفريق المشارك (team1/team2)
const myEquipBonus =
    equipmentSystem.calculateTeamEquipmentStats(
        userId === fight.player1 ? fight.team1 : fight.team2
    )

const enemyEquipBonus =
    equipmentSystem.calculateTeamEquipmentStats(
        userId === fight.player1 ? fight.team2 : fight.team1
    )

attackerStats.attack =
    (attackerStats.attack || 0) + (myEquipBonus.attack || 0)
attackerStats.defense =
    (attackerStats.defense || 0) + (myEquipBonus.defense || 0)
attackerStats.critRate =
    (attackerStats.critRate || 0) + (myEquipBonus.critRate || 0)
attackerStats.critDamage =
    (attackerStats.critDamage || 0) + (myEquipBonus.critDamage || 0)
attackerStats.dodge =
    (attackerStats.dodge || 0) + (myEquipBonus.dodge || 0)
attackerStats.hp =
    (attackerStats.hp || 0) + (myEquipBonus.hp || 0)
attackerStats.accuracy =
    (attackerStats.accuracy || 0) + (myEquipBonus.accuracy || 0)
attackerStats.shield =
    (attackerStats.shield || 0) + (myEquipBonus.shield || 0)
attackerStats.lifesteal =
    (attackerStats.lifesteal || 0) + (myEquipBonus.lifesteal || 0)
attackerStats.reflect =
    (attackerStats.reflect || 0) + (myEquipBonus.reflect || 0)
attackerStats.bossDamage =
    (attackerStats.bossDamage || 0) + (myEquipBonus.bossDamage || 0)

opponentStats.attack =
    (opponentStats.attack || 0) + (enemyEquipBonus.attack || 0)
opponentStats.defense =
    (opponentStats.defense || 0) + (enemyEquipBonus.defense || 0)
opponentStats.critRate =
    (opponentStats.critRate || 0) + (enemyEquipBonus.critRate || 0)
opponentStats.critDamage =
    (opponentStats.critDamage || 0) + (enemyEquipBonus.critDamage || 0)
opponentStats.dodge =
    (opponentStats.dodge || 0) + (enemyEquipBonus.dodge || 0)
opponentStats.hp =
    (opponentStats.hp || 0) + (enemyEquipBonus.hp || 0)
opponentStats.accuracy =
    (opponentStats.accuracy || 0) + (enemyEquipBonus.accuracy || 0)
opponentStats.shield =
    (opponentStats.shield || 0) + (enemyEquipBonus.shield || 0)
opponentStats.lifesteal =
    (opponentStats.lifesteal || 0) + (enemyEquipBonus.lifesteal || 0)
opponentStats.reflect =
    (opponentStats.reflect || 0) + (enemyEquipBonus.reflect || 0)
opponentStats.bossDamage =
    (opponentStats.bossDamage || 0) + (enemyEquipBonus.bossDamage || 0)

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

await winnerData.addMoney(moneyReward)
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

await checkAndGrantAchievement(winnerData, 'pvp', winnerData.wins, sock, msg.key.remoteJid)
await checkAndGrantAchievement(winnerData, 'wealth', winnerData.totalEarnedMoney, sock, msg.key.remoteJid)

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

// 🏆 الرانك الجديد (مشترك بين .مضاربة و .تحدي فقط، منفصل عن نظام mmr/rank أعلاه)
const winnerOldRankTier1 = winnerData.rankTier
const loserOldRankTier1 = loserData.rankTier

winnerData.rankWins = (winnerData.rankWins || 0) + 1
loserData.rankLosses = (loserData.rankLosses || 0) + 1

winnerData.rankPoints = (winnerData.rankPoints || 0) + 20
loserData.rankPoints = Math.max(0, (loserData.rankPoints || 0) - 10)

winnerData.rankTier = getRankTier(winnerData.rankPoints)
loserData.rankTier = getRankTier(loserData.rankPoints)

let newRankBlock1 = ''
newRankBlock1 += await applyRankTierPromotion(winnerData, winnerOldRankTier1)
newRankBlock1 += await applyRankTierPromotion(loserData, loserOldRankTier1)

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

${rankUpMessage}${newRankBlock1}`,
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

// 🛡️ بونص المعدات (نظام المعدات الجديد - يُطبَّق فقط على .مضاربة)
// يُجمع بونص معدات كل شخصيات الفريق المشارك (team1/team2)
const myUltEquipBonus =
    equipmentSystem.calculateTeamEquipmentStats(
        userId === fight.player1 ? fight.team1 : fight.team2
    )

const enemyUltEquipBonus =
    equipmentSystem.calculateTeamEquipmentStats(
        userId === fight.player1 ? fight.team2 : fight.team1
    )

attackerStats.attack =
    (attackerStats.attack || 0) + (myUltEquipBonus.attack || 0)
attackerStats.defense =
    (attackerStats.defense || 0) + (myUltEquipBonus.defense || 0)
attackerStats.critRate =
    (attackerStats.critRate || 0) + (myUltEquipBonus.critRate || 0)
attackerStats.critDamage =
    (attackerStats.critDamage || 0) + (myUltEquipBonus.critDamage || 0)
attackerStats.dodge =
    (attackerStats.dodge || 0) + (myUltEquipBonus.dodge || 0)
attackerStats.hp =
    (attackerStats.hp || 0) + (myUltEquipBonus.hp || 0)
attackerStats.accuracy =
    (attackerStats.accuracy || 0) + (myUltEquipBonus.accuracy || 0)
attackerStats.shield =
    (attackerStats.shield || 0) + (myUltEquipBonus.shield || 0)
attackerStats.lifesteal =
    (attackerStats.lifesteal || 0) + (myUltEquipBonus.lifesteal || 0)
attackerStats.reflect =
    (attackerStats.reflect || 0) + (myUltEquipBonus.reflect || 0)
attackerStats.bossDamage =
    (attackerStats.bossDamage || 0) + (myUltEquipBonus.bossDamage || 0)

opponentStats.attack =
    (opponentStats.attack || 0) + (enemyUltEquipBonus.attack || 0)
opponentStats.defense =
    (opponentStats.defense || 0) + (enemyUltEquipBonus.defense || 0)
opponentStats.critRate =
    (opponentStats.critRate || 0) + (enemyUltEquipBonus.critRate || 0)
opponentStats.critDamage =
    (opponentStats.critDamage || 0) + (enemyUltEquipBonus.critDamage || 0)
opponentStats.dodge =
    (opponentStats.dodge || 0) + (enemyUltEquipBonus.dodge || 0)
opponentStats.hp =
    (opponentStats.hp || 0) + (enemyUltEquipBonus.hp || 0)
opponentStats.accuracy =
    (opponentStats.accuracy || 0) + (enemyUltEquipBonus.accuracy || 0)
opponentStats.shield =
    (opponentStats.shield || 0) + (enemyUltEquipBonus.shield || 0)
opponentStats.lifesteal =
    (opponentStats.lifesteal || 0) + (enemyUltEquipBonus.lifesteal || 0)
opponentStats.reflect =
    (opponentStats.reflect || 0) + (enemyUltEquipBonus.reflect || 0)
opponentStats.bossDamage =
    (opponentStats.bossDamage || 0) + (enemyUltEquipBonus.bossDamage || 0)

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

await winnerData.addMoney(moneyReward)
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

await checkAndGrantAchievement(winnerData, 'pvp', winnerData.wins, sock, msg.key.remoteJid)
await checkAndGrantAchievement(winnerData, 'wealth', winnerData.totalEarnedMoney, sock, msg.key.remoteJid)

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

// 🏆 الرانك الجديد (مشترك بين .مضاربة و .تحدي فقط، منفصل عن نظام mmr/rank أعلاه)
const winnerOldRankTier2 = winnerData.rankTier
const loserOldRankTier2 = loserData.rankTier

winnerData.rankWins = (winnerData.rankWins || 0) + 1
loserData.rankLosses = (loserData.rankLosses || 0) + 1

winnerData.rankPoints = (winnerData.rankPoints || 0) + 20
loserData.rankPoints = Math.max(0, (loserData.rankPoints || 0) - 10)

winnerData.rankTier = getRankTier(winnerData.rankPoints)
loserData.rankTier = getRankTier(loserData.rankPoints)

let newRankBlock2 = ''
newRankBlock2 += await applyRankTierPromotion(winnerData, winnerOldRankTier2)
newRankBlock2 += await applyRankTierPromotion(loserData, loserOldRankTier2)

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

${rankUpMessage}${newRankBlock2}`,
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

    // 🌌 حماية: شخصيات أوميقا Ω ما تقدر تتبدل أبداً
    if (
        myChar.evolutionLevel === 7 ||
        hisChar.evolutionLevel === 7
    ) {
        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '🌌 شخصيات أوميقا Ω ما تقدر تبدلها، هي حصرية لصاحبها فقط.'
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
        await Player.find({ dailyBossDamage: { $gt: 0 } })
            .sort({ dailyBossDamage: -1 })
            .limit(10)

    const me =
        await Player.findOne({ userId })

    let mentions = []

    // ⏳ حساب الوقت المتبقي للتصفير (10 مساءً بتوقيت السعودية)
    const riyadhNow =
        new Date(
            new Date().toLocaleString(
                'en-US',
                { timeZone: 'Asia/Riyadh' }
            )
        )

    const nextReset =
        new Date(riyadhNow)

    nextReset.setHours(22, 0, 0, 0)

    if (nextReset <= riyadhNow) {
        nextReset.setDate(nextReset.getDate() + 1)
    }

    const msLeft =
        nextReset - riyadhNow

    const hoursLeft =
        Math.floor(msLeft / (60 * 60 * 1000))

    const minutesLeft =
        Math.floor(
            (msLeft % (60 * 60 * 1000)) / 60000
        )

    let leaderboard =
`📊 ═════〔 مساهمات اليوم 〕═════ 📊

👑 ضد الزعيم العالمي

⏳ التصفير وتوزيع الجوائز خلال: ${hoursLeft} س ${minutesLeft} د

━━━━━━━━━━━━━━

`

    if (!players.length) {

        leaderboard +=
`😴 لا توجد مساهمات اليوم بعد
كن أول من يهاجم الزعيم بـ .هجوم

━━━━━━━━━━━━━━

`

    } else {

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
`${medal} @${player.userId.split('@')[0]}

💥 الضرر: ${(player.dailyBossDamage || 0).toLocaleString()}
⚔️ الهجمات: ${(player.dailyBossHits || 0).toLocaleString()}
🗡️ ضربات قاضية: ${(player.dailyLastHits || 0).toLocaleString()}

━━━━━━━━━━━━━━

`
        }
    }

    leaderboard +=
`📌 مساهمتك اليوم

💥 الضرر: ${(me?.dailyBossDamage || 0).toLocaleString()}
⚔️ الهجمات: ${(me?.dailyBossHits || 0).toLocaleString()}
🗡️ ضربات قاضية: ${(me?.dailyLastHits || 0).toLocaleString()}

━━━━━━━━━━━━━━

🎁 جوائز اليوم

🥇🥈🥉 أفضل 3 مساهمين
💰 2,000,000 مال
🎲 1% فرصة شخصية SSS
🎲 30% فرصة صندوق SSS High

👥 باقي المساهمين
💰 500,000 مال
👑 شخصية أسطورية مجانية

🗡️ صاحب أكثر ضربة قاضية
💰 500,000 مال
📦 صندوق SSS High

━━━━━━━━━━━━━━

📈 إحصائياتك الكلية (كل الوقت)

⚔️ ${(me?.bossHits || 0).toLocaleString()} هجمة إجمالية`

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

// 🛡️ بونص المعدات (نظام المعدات الجديد - يُطبَّق الآن أيضاً على الهجوم العادي .هجوم الخصم)
// يُجمع بونص معدات كل شخصيات الفريق المشارك (team1/team2)
const myBasicEquipBonus =
    equipmentSystem.calculateTeamEquipmentStats(
        userId === fight.player1 ? fight.team1 : fight.team2
    )

const enemyBasicEquipBonus =
    equipmentSystem.calculateTeamEquipmentStats(
        userId === fight.player1 ? fight.team2 : fight.team1
    )

attackerStats.attack =
    (attackerStats.attack || 0) + (myBasicEquipBonus.attack || 0)
attackerStats.defense =
    (attackerStats.defense || 0) + (myBasicEquipBonus.defense || 0)
attackerStats.critRate =
    (attackerStats.critRate || 0) + (myBasicEquipBonus.critRate || 0)
attackerStats.critDamage =
    (attackerStats.critDamage || 0) + (myBasicEquipBonus.critDamage || 0)
attackerStats.dodge =
    (attackerStats.dodge || 0) + (myBasicEquipBonus.dodge || 0)
attackerStats.hp =
    (attackerStats.hp || 0) + (myBasicEquipBonus.hp || 0)
attackerStats.accuracy =
    (attackerStats.accuracy || 0) + (myBasicEquipBonus.accuracy || 0)
attackerStats.shield =
    (attackerStats.shield || 0) + (myBasicEquipBonus.shield || 0)
attackerStats.lifesteal =
    (attackerStats.lifesteal || 0) + (myBasicEquipBonus.lifesteal || 0)
attackerStats.reflect =
    (attackerStats.reflect || 0) + (myBasicEquipBonus.reflect || 0)
attackerStats.bossDamage =
    (attackerStats.bossDamage || 0) + (myBasicEquipBonus.bossDamage || 0)

opponentStats.attack =
    (opponentStats.attack || 0) + (enemyBasicEquipBonus.attack || 0)
opponentStats.defense =
    (opponentStats.defense || 0) + (enemyBasicEquipBonus.defense || 0)
opponentStats.critRate =
    (opponentStats.critRate || 0) + (enemyBasicEquipBonus.critRate || 0)
opponentStats.critDamage =
    (opponentStats.critDamage || 0) + (enemyBasicEquipBonus.critDamage || 0)
opponentStats.dodge =
    (opponentStats.dodge || 0) + (enemyBasicEquipBonus.dodge || 0)
opponentStats.hp =
    (opponentStats.hp || 0) + (enemyBasicEquipBonus.hp || 0)
opponentStats.accuracy =
    (opponentStats.accuracy || 0) + (enemyBasicEquipBonus.accuracy || 0)
opponentStats.shield =
    (opponentStats.shield || 0) + (enemyBasicEquipBonus.shield || 0)
opponentStats.lifesteal =
    (opponentStats.lifesteal || 0) + (enemyBasicEquipBonus.lifesteal || 0)
opponentStats.reflect =
    (opponentStats.reflect || 0) + (enemyBasicEquipBonus.reflect || 0)
opponentStats.bossDamage =
    (opponentStats.bossDamage || 0) + (enemyBasicEquipBonus.bossDamage || 0)

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

await winnerData.addMoney(moneyReward)
winnerData.xp += xpReward

const oldRank = winnerData.rank

winnerData.wins += 1
winnerData.mmr += 20

winnerData.rank = getRank(winnerData.mmr)

await checkAndGrantAchievement(winnerData, 'pvp', winnerData.wins, sock, msg.key.remoteJid)
await checkAndGrantAchievement(winnerData, 'wealth', winnerData.totalEarnedMoney, sock, msg.key.remoteJid)

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

// 🏆 الرانك الجديد (مشترك بين .مضاربة و .تحدي فقط، منفصل عن نظام mmr/rank أعلاه)
const winnerOldRankTier3 = winnerData.rankTier
const loserOldRankTier3 = loserData.rankTier

winnerData.rankWins = (winnerData.rankWins || 0) + 1
loserData.rankLosses = (loserData.rankLosses || 0) + 1

winnerData.rankPoints = (winnerData.rankPoints || 0) + 20
loserData.rankPoints = Math.max(0, (loserData.rankPoints || 0) - 10)

winnerData.rankTier = getRankTier(winnerData.rankPoints)
loserData.rankTier = getRankTier(loserData.rankPoints)

let newRankBlock3 = ''
newRankBlock3 += await applyRankTierPromotion(winnerData, winnerOldRankTier3)
newRankBlock3 += await applyRankTierPromotion(loserData, loserOldRankTier3)

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

${rankUpMessage}${newRankBlock3}`,
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

// 👑 .تص_رانك — أمر خاص بالمطور فقط: توب 20 حسب الرانك الجديد (مضاربة + تحدي)
if (text === '.تص_رانك') {

    if (!isOwner(msg)) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ للمطور فقط'
        })
    }

    const topPlayers =
        await Player.find({})
            .sort({ rankPoints: -1 })
            .limit(20)

    if (!topPlayers.length) {
        return safeSend(msg.key.remoteJid, {
            text: '❌ لا يوجد لاعبون مصنّفون بعد'
        })
    }

    let result =
        `🏆 ═══〔 تصنيف الرانك - توب 20 〕═══ 🏆\n\n`

    const mentions = []

    topPlayers.forEach((p, i) => {

        const rWins = p.rankWins || 0
        const rLosses = p.rankLosses || 0
        const totalGames = rWins + rLosses

        const winRate =
            totalGames > 0
                ? Math.round((rWins / totalGames) * 100)
                : 0

        const lossRate =
            totalGames > 0
                ? Math.round((rLosses / totalGames) * 100)
                : 0

        mentions.push(p.userId)

        result +=
`〔${i + 1}〕 @${p.userId.split('@')[0]}
🎖️ ${p.rankTier || 'مبتدئ'} │ 📊 ${p.rankPoints || 0} نقطة
📈 فوز: ${winRate}% │ 📉 خسارة: ${lossRate}%
━━━━━━━━━━━━━━━
`
    })

    return safeSend(msg.key.remoteJid, {
        text: result,
        mentions
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

📍 الطابق الحالي: ${floor.floor}/60

⚔️ القوة المطلوبة:
${floor.power}

👥 الشخصيات المستخدمة:
${player.usedCharacters?.length || 0}/60

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
                    await fs.promises.readFile(audioPath),

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
                    await fs.promises.readFile(audioPath),

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
    // ⏳ COOLDOWN المضاد للسبام
    // =========================
    const now = Date.now()

if (attacker.lastPvP && now - attacker.lastPvP < 30000) {
    return safeSend(msg.key.remoteJid, {
        text: '⏳ انتظر 30 ثانية'
    })
}

    // =========================
    // 🎟️ القتالات اليومية (5 قتالات كل يوم)
    // =========================
    const today = Number(getSaudiDate().replace(/-/g, ''))

    if (attacker.lastPvpReset !== today) {
        attacker.pvpFights = 5
        attacker.lastPvpReset = today
    }

    if ((attacker.pvpFights || 0) <= 0) {
        return safeSend(msg.key.remoteJid, {
            text: `⏳ انتهت قتالاتك اليومية (0/5)

🌙 تُجدَّد تلقائياً الساعة 12 صباحاً بتوقيت السعودية`
        })
    }

    attacker.pvpFights -= 1
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
    // (يُحسم بمن وصلت صحته للصفر أولاً،
    //  وإذا انتهت الأدوار الـ50 بدون حسم يفوز صاحب الصحة المتبقية الأعلى
    //  حتى يكون عادلاً للطرفين ولا يُفضَّل المهاجم تلقائياً)
    // =========================
    let winner, loser

    if (aHP <= 0 && dHP > 0) {
        winner = defender
        loser = attacker
    } else if (dHP <= 0 && aHP > 0) {
        winner = attacker
        loser = defender
    } else if (aHP > dHP) {
        winner = attacker
        loser = defender
    } else if (dHP > aHP) {
        winner = defender
        loser = attacker
    } else {
        // تعادل تام (نادر) → عشوائي عادل بنسبة 50/50
        winner = Math.random() < 0.5 ? attacker : defender
        loser = winner === attacker ? defender : attacker
    }

    winner.wins = (winner.wins || 0) + 1
    loser.losses = (loser.losses || 0) + 1

    winner.mmr += 25
    loser.mmr = Math.max(0, loser.mmr - 15)

    const attackerOldRank = attacker.rank
    const defenderOldRank = defender.rank

    attacker.rank = getRank(attacker.mmr)
    defender.rank = getRank(defender.mmr)

    // =========================
    // 🎁 مكافآت الفائز
    // =========================
    const moneyReward = 80000

    const xpReward =
        Math.floor(200 + Math.random() * 300)

    await winner.addMoney(moneyReward)

    winner.xp = (winner.xp || 0) + xpReward

    const rankBoxMap = {
        'برونزي': { key: 'basic', label: '📦 صندوق عادي' },
        'فضي': { key: 'rare', label: '🎁 صندوق نادر' },
        'ذهبي': { key: 'epic', label: '✨ صندوق ملحمي' },
        'بلاتيني': { key: 'legendary', label: '👑 صندوق أسطوري' },
        'ماستر': { key: 'sss_chance', label: '🌟 صندوق فرصة SSS' },
        'أسطوري': { key: 'sss_high', label: '💎 صندوق SSS عالي' }
    }

    const boxInfo =
        rankBoxMap[winner.rank] || rankBoxMap['برونزي']

    winner.boxes = winner.boxes || {}

    winner.boxes[boxInfo.key] =
        (winner.boxes[boxInfo.key] || 0) + 1

    await attacker.save()
    await defender.save()

    await checkAndGrantAchievement(winner, 'pvp', winner.wins, sock, msg.key.remoteJid)
    await checkAndGrantAchievement(winner, 'wealth', winner.totalEarnedMoney, sock, msg.key.remoteJid)

    // =========================
    // 🎉 رسائل تغيّر الرتبة (لأي من الطرفين إن تغيّرت رتبته)
    // =========================
    let rankMessages = ''

    if (attackerOldRank !== attacker.rank) {

        const isUp = winner === attacker

        rankMessages +=
`

${isUp ? '🎉 ترقية رتبة!' : '🔻 تراجع رتبة'}
@${attacker.userId.split('@')[0]}
${attackerOldRank}
⬇️
${attacker.rank}`
    }

    if (defenderOldRank !== defender.rank) {

        const isUp = winner === defender

        rankMessages +=
`

${isUp ? '🎉 ترقية رتبة!' : '🔻 تراجع رتبة'}
@${defender.userId.split('@')[0]}
${defenderOldRank}
⬇️
${defender.rank}`
    }

    return safeSend(msg.key.remoteJid, {
    text: `${log}

━━━━━━━━━━━━━━━━━━

🏆 الفائز:
@${winner.userId.split('@')[0]}

💰 المكافأة:
+${moneyReward.toLocaleString()} مال

⭐ الخبرة:
+${xpReward}

${boxInfo.label}

📊 النتائج:

🥇 @${attacker.userId.split('@')[0]}
${attacker.rank} (${attacker.mmr})

🥈 @${defender.userId.split('@')[0]}
${defender.rank} (${defender.mmr})

🎟️ قتالاتك المتبقية اليوم:
${attacker.pvpFights}/5${rankMessages}`,

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
${player.towerFloor || 1}/60

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
    player.boxesOpened = (player.boxesOpened || 0) + 1

    player.characters.push(character)

    await player.save()

    await checkAndGrantAchievement(player, 'boxes', player.boxesOpened, sock, msg.key.remoteJid)
    await checkAndGrantAchievement(player, 'collection', player.characters.length, sock, msg.key.remoteJid)

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
            image: await fs.promises.readFile(imagePath),

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
    player.boxesOpened = (player.boxesOpened || 0) + 1

    // إضافة الشخصية حتى لو كانت مكررة
    player.characters.push(character)

    await player.save()

    await checkAndGrantAchievement(player, 'boxes', player.boxesOpened, sock, msg.key.remoteJid)
    await checkAndGrantAchievement(player, 'collection', player.characters.length, sock, msg.key.remoteJid)

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

    const reward = getTowerReward(floor.floor)

if (floor.floor === 60) {

    const {
        createTowerReward
    } = require("./tower/towerReward")

    const rewardCharacter =
        await createTowerReward()

    player.characters.push(rewardCharacter)

}

    player.towerFloor++

    if (reward.money)
        await player.addMoney(reward.money)

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

    if (floor.floor <= 30) {

    player.attackBonus =
        (player.attackBonus || 0) + 5

}

    if (floor.floor === 60) {

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

    await checkAndGrantAchievement(player, 'tower', player.towerFloor, sock, msg.key.remoteJid)

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

// 👇 أضف هنا
if (floor.floor === 60) {

    rewardText +=
`🌟 شخصية SSS مطورة
💥 القوة: 13000
✨ قدرات UR عشوائية ×2
🏅 اللقب النهائي
💰 5,000,000 ذهب
`

}

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
        
        if (
            text === '.هجوم' ||
            text.startsWith('.هجوم ')
        ) {

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

// 🔢 اختيار الشخصية بالرقم (نفس ترتيب .شخصياتي)
// بدون رقم = أقوى شخصية (رقم 1 دائمًا بعد الترتيب التلقائي)
const attackArgs = text.split(' ')

let charIndex = 1

if (attackArgs[1] !== undefined) {

    const parsedIndex = parseInt(attackArgs[1])

    if (
        isNaN(parsedIndex) ||
        parsedIndex < 1 ||
        parsedIndex > me.characters.length
    ) {

        return safeSend(
            msg.key.remoteJid,
            {
                text:
`❌ رقم غير صحيح

💡 استخدم .شخصياتي لمعرفة الأرقام`
            }
        )
    }

    charIndex = parsedIndex
}

const strongest = me.characters[charIndex - 1]
            const fighter = strongest

let damage = strongest.power

// 🛡️ بونص المعدات (نظام المعدات الجديد - يُطبَّق فقط على .هجوم [هجوم الزعيم])
// المعدات الآن على الشخصية المحاربة نفسها (strongest) مو الحساب كامل
const bossEquipBonus =
    equipmentSystem.calculateEquipmentStats(strongest)

damage += (bossEquipBonus.attack || 0)

// 🎯 حرج المعدات (نظام المعدات الجديد - .هجوم الزعيم)
if (
    Math.random() * 100 <
    (bossEquipBonus.critRate || 0)
) {

    damage = Math.floor(
        damage *
        (1 + (bossEquipBonus.critDamage || 0) / 100)
    )

}

// ❤️ امتصاص حياة المعدات (نظام المعدات الجديد - .هجوم الزعيم)
if ((bossEquipBonus.lifesteal || 0) > 0) {

    const equipHeal = Math.floor(
        damage * (bossEquipBonus.lifesteal || 0) / 100
    )

    me.hp = Math.min(
        me.maxHp || 10000,
        (me.hp || 10000) + equipHeal
    )

}

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
    (1 + (((me.bossDamageBonus || 0) + (bossEquipBonus.bossDamage || 0)) / 100))
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

// 🐉 مساعدة الوحش المركب ضد الزعيم
let beastAssistText = ''

if (me.equippedBeast) {

    const beastsList =
        require('./systems/beasts')

    const riddenBeast =
        beastsList.find(
            b => b.id === me.equippedBeast
        )

    if (riddenBeast) {

        const beastPercent =
            (riddenBeast.attack || 0) +
            (riddenBeast.defense || 0) +
            (riddenBeast.hp || 0) +
            (riddenBeast.crit || 0) +
            (riddenBeast.dodge || 0) +
            (riddenBeast.reflect || 0)

        // استفادة دائمة بسيطة أثناء التركيب
        const passiveBeastDamage =
            Math.floor(
                damage * (beastPercent / 100) * 0.2
            )

        if (passiveBeastDamage > 0) {
            damage += passiveBeastDamage
        }

        // كل 5 ضربات: يهجم الوحش معك بكامل نسبته
        const attackNumber =
            (me.bossHits || 0) + 1

        if (
            attackNumber % 5 === 0 &&
            beastPercent > 0
        ) {

            const beastFullDamage =
                Math.floor(
                    damage * (beastPercent / 100)
                )

            if (beastFullDamage > 0) {

                damage += beastFullDamage

                beastAssistText =

`

🐉 مساعدة الوحش المركب
👹 ${riddenBeast.name}
💥 ضرر إضافي: ${beastFullDamage.toLocaleString()}`
            }
        }
    }
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

        // 🗡️ تسجيل الضربة القاضية اليومية (لجائزة أكثر ضربة قاضية)
        me.dailyLastHits =
            (me.dailyLastHits || 0) + 1
    }
}


    
me.bossDamage =
    (me.bossDamage || 0) + damage

me.totalBossDamage =
    (me.totalBossDamage || 0) + damage

me.bossHits =
    (me.bossHits || 0) + 1

// 📊 مساهمات الزعيم اليومية (لأمر .مساهمات وجوائزه اليومية)
me.dailyBossDamage =
    (me.dailyBossDamage || 0) + damage

me.dailyBossHits =
    (me.dailyBossHits || 0) + 1

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
await me.save()

await checkAndGrantAchievement(me, 'boss', me.totalBossDamage, sock, msg.key.remoteJid)
await checkAndGrantAchievement(me, 'wealth', me.totalEarnedMoney, sock, msg.key.remoteJid)

// 🌍 نقاط العوالم: نقطة كل 5 هجمات على الزعيم (لمن هو منضم لعالم)
await worlds.awardAttackPoints(
    sock,
    msg.key.remoteJid,
    userId,
    me.bossHits
)

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
                    ? new Date(Date.now() + 5 * 60 * 1000)
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
            Date.now() + 5 * 60 * 1000
        )

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            image: {
                url: currentBoss.image
            },

            caption: `💀 ${currentBoss.name} قضى عليك

⏳ ستعود بعد 5 دقائق

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



} // نهاية else

} // نهاية if (Math.random() <= 0.35)

} // نهاية if (currentBoss.groupAttackCount >= 15)



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
        await me.save()

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
            finished: currentBoss.finished,
            respawnAt: currentBoss.respawnAt
        }
    }
)

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
            
        
        // =========================
        // 🛡️ عرض دمج المعدات في رسالة هجوم الزعيم فقط
        // (بدون أي تعديل على حسابات bossEquipBonus أو الضرر)
        // =========================

        function bossEquipSummaryText(bonus) {

            const lines = []

            if (bonus.attack)
                lines.push(`⚔️ هجوم المعدات +${bonus.attack}`)

            if (bonus.defense)
                lines.push(`🛡️ دفاع المعدات +${bonus.defense}`)

            if (bonus.hp)
                lines.push(`❤️ HP المعدات +${bonus.hp}`)

            if (bonus.critRate)
                lines.push(`🎯 حرج المعدات +${bonus.critRate}%`)

            if (bonus.critDamage)
                lines.push(`💥 ضرر حرج المعدات +${bonus.critDamage}%`)

            if (bonus.dodge)
                lines.push(`👻 مراوغة المعدات +${bonus.dodge}%`)

            if (bonus.accuracy)
                lines.push(`🎯 دقة المعدات +${bonus.accuracy}%`)

            if (bonus.shield)
                lines.push(`🛡️ درع المعدات +${bonus.shield}`)

            if (bonus.lifesteal)
                lines.push(`🩸 امتصاص حياة المعدات +${bonus.lifesteal}%`)

            if (bonus.reflect)
                lines.push(`🪞 عكس ضرر المعدات +${bonus.reflect}%`)

            if (bonus.bossDamage)
                lines.push(`👹 ضرر الزعيم من المعدات +${bonus.bossDamage}%`)

            return lines.length
                ? lines.join('\n')
                : 'لا توجد معدات مجهزة'

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

🛡️ دمج معدات ${strongest.name}

${bossEquipSummaryText(bossEquipBonus)}

━━━━━━━━━━━━━━

📊 نتيجة الهجوم

💥 الضرر
${Number(damage).toLocaleString()}

⭐ الخبرة
+${Number(xpGain).toLocaleString()} XP

━━━━━━━━━━━━━━

❤️ صحة الزعيم

${Number(currentBoss.hp).toLocaleString()} / ${Number(currentBoss.maxHp).toLocaleString()}${beastAssistText}`
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
        image: await fs.promises.readFile(imagePath),
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

    if (player.pulls < 5) {
        player.pulls = 5
    }

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
player.totalPulls = (player.totalPulls || 0) + 1

await player.save()

await checkAndGrantAchievement(player, 'pulls', player.totalPulls, sock, msg.key.remoteJid)
await checkAndGrantAchievement(player, 'collection', player.characters.length, sock, msg.key.remoteJid)

await worlds.awardPullPoints(
    sock,
    msg.key.remoteJid,
    userId,
    randomCharacter.rarity
)

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
    image: await fs.promises.readFile(imagePath),

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

        // ترتيب فعلي دائم حسب الرتبة (Ω → EX → ... → عادي)
        // هذا يضمن أن الرقم المعروض = index الحقيقي بالمصفوفة
        // لباقي الأوامر (.اهداء .تطوير .عرض .قدره .غزو
        // .تشكيلة .حول .معداتي .بيع .انتقال .هجوم)
        resortPlayerCharacters(player)
        await player.save()

        const rankIcons = {
            "Ω": "🌌"
        }

        let txt =
`👤 شخصياتك (${player.characters.length}/${player.maxCharacters || 30})

`

        let currentRank = null
        let num = 0

        player.characters.forEach((c) => {

            num++

            const rank = getCharacterRank(c)

            if (rank !== currentRank) {

                if (currentRank !== null) {
                    txt += `━━━━━━━━━━━━━━━\n`
                }

                currentRank = rank

                txt +=
`${rankIcons[rank] || '🌟'} ${rank}
`
            }

            txt +=
`${num}. ${c.name} ⚔️${c.power}
`
        })

        txt += `━━━━━━━━━━━━━━━\n\n`

        txt +=
`📦 الإجمالي: ${player.characters.length}/${player.maxCharacters || 30}`

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
        
const cooldown = 60 * 60 * 1000

const currentPeriod =
    Math.floor(Date.now() / cooldown)

if (player.lastReset !== currentPeriod) {

    if (player.pulls < 5) {
        player.pulls = 5
    }

    player.lastReset = currentPeriod

    await player.save()
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

const evolutionRankNames = [
    "SSS",
    "SSS+",
    "SSS++",
    "UR I",
    "UR II",
    "UR III",
    "EX",
    "Ω"
]

const currentRankLabel =
    character.evolutionLevel > 0
        ? evolutionRankNames[character.evolutionLevel] || character.rarity
        : character.rarity

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
➜ +${character.evolutionLevel || 0} (${currentRankLabel})

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
        image: await fs.promises.readFile(imagePath),
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

        resortPlayerCharacters(player)

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
        // .بيع_معدة (بيع قطع من حقيبة المعدات)
        // =========================

        if (
            text.startsWith('.بيع_معدة') ||
            text.startsWith('.sellitem')
        ) {

        try {

            const args = text.split(' ').slice(1)

            if (!args.length) {

                return safeSend(msg.key.remoteJid, {
                    text:
`❌ استخدم الأمر هكذا

.بيع_معدة 1

أو

.بيع_معدة 1 2 3

💡 رقم القطعة كما يظهر في .حقيبتي`
                })

            }

            const player = await Player.findOne({ userId })

            if (!player) {

                return safeSend(msg.key.remoteJid, {
                    text: '❌ لا تملك حساباً'
                })

            }

            player.inventory = player.inventory || []

            if (!player.inventory.length) {

                return safeSend(msg.key.remoteJid, {
                    text: '🎒 حقيبة المعدات فارغة.'
                })

            }

            const EQUIP_SELL_PRICE = {

                Rare: 3000,
                Epic: 12000,
                Legendary: 40000,
                Mythical: 120000,
                SSS: 400000,
                'SSS+': 700000,
                'SSS++': 1000000

            }

            function getEquipSellPrice(item) {

                const base =
                    EQUIP_SELL_PRICE[item.rarity] || 1000

                const affixBonus =
                    (item.affixes ? item.affixes.length : 0) * Math.floor(base * 0.1)

                return base + affixBonus

            }

            const indexes =
                [...new Set(
                    args
                        .map(x => Number(x) - 1)
                        .filter(x => !isNaN(x))
                )]
                .sort((a, b) => b - a)

            let totalMoney = 0
            let soldCount = 0
            const soldNames = []

            for (const index of indexes) {

                const item = player.inventory[index]

                if (!item) continue

                const price = getEquipSellPrice(item)

                // ⚠️ تأكيد قبل بيع قطعة نادرة جداً (SSS وما فوقها)
                if (
                    String(item.rarity || '').startsWith('SSS')
                ) {

                    pendingEquipSellConfirm.set(userId, {
                        index,
                        item,
                        price
                    })

                    return safeSend(msg.key.remoteJid, {
                        text:
`⚠️ تأكيد بيع قطعة معدات نادرة

${item.name}
🏷 ${item.rarity}

💰 سعر البيع:
${price}

اكتب:
.نعم_معدة

أو

.لا_معدة`
                    })

                }

                totalMoney += price
                soldCount++
                soldNames.push(item.name)

                player.inventory.splice(index, 1)

            }

            if (soldCount === 0) {

                return safeSend(msg.key.remoteJid, {
                    text: '❌ لم يتم العثور على قطع صالحة للبيع'
                })

            }

            player.money =
                (player.money || 0) + totalMoney

            player.markModified('inventory')

            await player.save()

            return safeSend(msg.key.remoteJid, {
                text:
`💰 ━━〔 𝐒𝐄𝐋𝐋 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 〕━━ 💰

✅ تم بيع ${soldCount} قطعة معدات

💵 إجمالي الأرباح:
${totalMoney}

💳 رصيدك الحالي:
${player.money}`
            })

        } catch (err) {

            console.log('Sell Equipment Error:', err)

            return safeSend(msg.key.remoteJid, {
                text: '❌ حدث خطأ أثناء بيع المعدة'
            })

        }

        }

        if (text === '.نعم_معدة') {

            const confirm = pendingEquipSellConfirm.get(userId)

            if (!confirm) return

            const player = await Player.findOne({ userId })

            if (!player) return

            const current = player.inventory[confirm.index]

            if (!current || current.uid !== confirm.item.uid) {

                pendingEquipSellConfirm.delete(userId)

                return safeSend(msg.key.remoteJid, {
                    text: '❌ تغيرت الحقيبة، أعد المحاولة.'
                })

            }

            player.inventory.splice(confirm.index, 1)

            player.money =
                (player.money || 0) + confirm.price

            player.markModified('inventory')

            await player.save()

            pendingEquipSellConfirm.delete(userId)

            return safeSend(msg.key.remoteJid, {
                text:
`✅ تم بيع القطعة

${confirm.item.name}

💰 +${confirm.price}

💳 الرصيد:
${player.money}`
            })

        }

        if (text === '.لا_معدة') {

            if (!pendingEquipSellConfirm.has(userId)) return

            pendingEquipSellConfirm.delete(userId)

            return safeSend(msg.key.remoteJid, {
                text: '❌ تم إلغاء عملية بيع المعدة'
            })

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

    // 🌌 حماية: شخصية أوميقا Ω ما تُباع أبداً
    if (character.evolutionLevel === 7) {

        return safeSend(msg.key.remoteJid, {
            text:
'🌌 شخصية ' + character.name + ' وصلت رتبة أوميقا Ω، ما تقدر تبيعها أبداً.'
        })

    }

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

    await player.addMoney(confirm.price)

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

    

// =========================
// .مزاد
// =========================

if (text.startsWith('.مزاد')) {

    try {

        const args = text.trim().split(' ')

const price = Number(args.pop())
const charPower = Number(args.pop())
const charName = args.slice(1).join(' ')

        if (!charName || isNaN(charPower) || isNaN(price) || price <= 0) {

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

        // 🌌 حماية: شخصية أوميقا Ω ما تُعرض بالمزاد أبداً
        if (character.evolutionLevel === 7) {

            return safeSend(msg.key.remoteJid, {
                text:
'🌌 شخصية ' + character.name + ' وصلت رتبة أوميقا Ω، ما تقدر تعرضها بالمزاد أبداً.'
            })

        }

        // 💰 حدود سعر المزاد حسب الندرة والتطوير
        // شخصية SSS عادية (بدون تطوير): 10,000,000
        // كل خطوة تطوير (SSS+، SSS++، UR I...) تزيد الحد مليون، بحد أقصى 20,000,000
        let auctionPriceLimit

        if (character.rarity === 'SSS') {

            const evolutionLevel = character.evolutionLevel || 0
            const baseLimit = 10000000
            const evolutionBonus = evolutionLevel * 1000000

            auctionPriceLimit =
                Math.min(baseLimit + evolutionBonus, 20000000)

        } else {

            auctionPriceLimit = 500000
        }

        if (price > auctionPriceLimit) {

            return safeSend(msg.key.remoteJid, {
                text:
`❌ السعر أعلى من الحد المسموح

🌟 الندرة: ${character.rarity}

💰 الحد الأقصى المسموح:
${auctionPriceLimit.toLocaleString()}`
            })
        }

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

        // ✅ إذا كان المشتري هو نفس البائع (يسترد شخصيته الخاصة)
        // لا داعي لخصم وإضافة الفلوس، فقط ترجع له الشخصية بدون أي تغيير في رصيده
        const isSelfBuy = item.seller === userId

        if (isSelfBuy) {

            player.characters.push(item.character)

            resortPlayerCharacters(player)

            await player.save()

        } else {

            player.money -= item.price
            player.characters.push(item.character)

            resortPlayerCharacters(player)

            await player.save()

            // ✅ تحديث ذري (atomic) لفلوس البائع لتجنب مشاكل التداخل
            // بين قراءة/حفظ نسختين من نفس المستند في نفس الوقت
            await Player.updateOne(
                { userId: item.seller },
                { $inc: { money: item.price } }
            )
        }

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

        const shop = (await Shop.find()).slice(0, 10)

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

            const c = item.character

            if (!c) return

            txt +=
`╭────〔 ${i + 1} 〕────╮
🧿 الاسم : ${c.name}
🌟 الندرة : ${c.rarity}
⚔️ القوة : ${c.power}
🎭 الشكل : ${c.form || 'عادي'}
✨ القدرة : ${c.ability || 'لا يوجد'}
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

        return safeSend(msg.key.remoteJid, {
            text: txt
        })

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

let me = await Player.findOne({ userId });
const enemy = await Player.findOne({ userId: targetId });

if (!me || !enemy) {
    return safeSend(msg.key.remoteJid, {
        text: '❌ أحد اللاعبين لا يملك حساباً'
    });
}

// 🔒 منع تشغيل أكثر من قتال بنفس الوقت
if (battleLocks.has(userId) || battleLocks.has(targetId)) {
    return safeSend(msg.key.remoteJid, {
        text: "⏳ انتظر حتى ينتهي القتال الحالي."
    });
}



me.rewardedLevels = me.rewardedLevels || [];
me.specialAbilities = me.specialAbilities || [];
    
    if (me.fights == null) me.fights = 5;
if (!me.lastFightReset) me.lastFightReset = Date.now();

const now = Date.now();
const fightCooldown = 60 * 60 * 1000;

if (now - me.lastFightReset >= fightCooldown) {
    me.fights = 5;
    me.lastFightReset = now;
    await me.save();
}

    if ((me.fights || 0) <= 0) {

        const remaining = fightCooldown - (now - me.lastFightReset);

        const minutes = Math.floor(remaining / (1000 * 60));

        return safeSend(msg.key.remoteJid, {
            text:
`❌ انتهت محاولات القتال

⚔️ المتبقي: 0/5

🕒 الوقت المتبقي: ${minutes} دقيقة

🔄 تتجدد المحاولات كل ساعة`
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
battleLocks.add(userId);
battleLocks.add(targetId);

const battleTimeout = setTimeout(() => {
    battleLocks.delete(userId);
    battleLocks.delete(targetId);

    safeSend(msg.key.remoteJid, {
        text: '⌛ انتهى وقت القتال وتم إلغاؤه تلقائيًا.'
    }).catch(() => {});
}, 30000);
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
    250,
    Math.floor(enemyPower / 20)
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
        reward = Math.max(250, Math.floor(myPower / 25));
    }
    me.money = (me.money || 0) + reward;
    me.xp = (me.xp || 0) + 100;

    let levelUpMessage = '';

while ((me.xp || 0) >= Math.floor(300 + (me.level * 150))) {

    const neededXp = Math.floor(300 + (me.level * 150));

    me.xp -= neededXp;
me.level += 1;

if (me.level > 200) {
    me.level = 200;
    me.xp = 0;
    break;
}

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

await me.addMoney(500);

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

    await me.addMoney(2000000)

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
}

// احفظ جميع التعديلات أولاً
await me.save();

// 🌍 نقاط العوالم: تُمنح للفائز بس إذا كان الخصم من عالم مختلف عن عالمه
if (
    me.world &&
    enemy.world &&
    me.world !== enemy.world
) {
    await worlds.awardBattlePoints(
        sock,
        msg.key.remoteJid,
        winnerId
    );
}

const result = await Player.updateOne(
    {
        userId,
        fights: { $gt: 0 }
    },
    {
        $inc: { fights: -1 }
    }
);

if (result.modifiedCount === 0) {

    clearTimeout(battleTimeout);

    battleLocks.delete(userId);
    battleLocks.delete(targetId);

    return safeSend(msg.key.remoteJid, {
        text: '❌ لا تملك قتالات متبقية.'
    });
}

me = await Player.findOne({ userId });

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
clearTimeout(battleTimeout);
battleLocks.delete(userId)
battleLocks.delete(targetId)

return safeSend(msg.key.remoteJid, {
    text: battleMessage,
    mentions: [winnerId || userId || targetId]
});
    }

            
catch (err) {
    clearTimeout(battleTimeout);

    battleLocks.delete(userId);
    battleLocks.delete(targetId);

    console.log(err);

    return safeSend(msg.key.remoteJid, {
        text: '❌ حدث خطأ أثناء القتال.'
    });
}

} // ← إغلاق if
        
        // =========================
        // .قتال
        // =========================

    
if (text === '.قتال' || text.startsWith('.قتال ')) {

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

        if (me.normalFights == null) me.normalFights = 5
        if (!me.lastNormalFightReset)
    me.lastNormalFightReset = now

        if (
    now - me.lastNormalFightReset >= cooldown
) {
            me.normalFights = 5
            me.lastNormalFightReset = now
        }

        if (me.normalFights <= 0) {
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

        // 🛡️ بونص المعدات (نظام المعدات الجديد - يُطبَّق فقط على .قتال)
        // المعدات الآن على الشخصية المقاتلة نفسها مو الحساب كامل
        const myFightEquipBonus =
            equipmentSystem.calculateEquipmentStats(myCharacter)

        const enemyFightEquipBonus =
            equipmentSystem.calculateEquipmentStats(enemyCharacter)

        let myAttack =
            myCharacter.power +
            (me.level || 1) * 5 +
            Math.floor(Math.random() * 300) +
            (myFightEquipBonus.attack || 0)

        let enemyAttack =
            enemyCharacter.power +
            (enemy.level || 1) * 5 +
            Math.floor(Math.random() * 300) +
            (enemyFightEquipBonus.attack || 0)

        // 🛡️ بونص المعدات (نظام المعدات الجديد - يُطبَّق فقط على .قتال)
        // دفاع المعدات يقلل ضرر الخصم القادم
        myAttack -= (enemyFightEquipBonus.defense || 0)
        enemyAttack -= (myFightEquipBonus.defense || 0)

        if (myAttack < 0) myAttack = 0
        if (enemyAttack < 0) enemyAttack = 0

        let finalMyAttack = myAttack
        let finalEnemyAttack = enemyAttack

        // 🎯 حرج المعدات
        if (
            Math.random() * 100 <
            (myFightEquipBonus.critRate || 0)
        ) {
            finalMyAttack = Math.floor(
                finalMyAttack *
                (1 + (myFightEquipBonus.critDamage || 0) / 100)
            )
        }

        if (
            Math.random() * 100 <
            (enemyFightEquipBonus.critRate || 0)
        ) {
            finalEnemyAttack = Math.floor(
                finalEnemyAttack *
                (1 + (enemyFightEquipBonus.critDamage || 0) / 100)
            )
        }

        // 👻 مراوغة المعدات
        if (
            Math.random() * 100 <
            (myFightEquipBonus.dodge || 0)
        ) {
            finalEnemyAttack = 0
        }

        if (
            Math.random() * 100 <
            (enemyFightEquipBonus.dodge || 0)
        ) {
            finalMyAttack = 0
        }

        // 🔄 عكس ضرر المعدات
        if ((myFightEquipBonus.reflect || 0) > 0) {
            finalMyAttack += Math.floor(
                finalEnemyAttack * (myFightEquipBonus.reflect || 0) / 100
            )
        }

        if ((enemyFightEquipBonus.reflect || 0) > 0) {
            finalEnemyAttack += Math.floor(
                finalMyAttack * (enemyFightEquipBonus.reflect || 0) / 100
            )
        }

        // ❤️ امتصاص حياة المعدات
        if ((myFightEquipBonus.lifesteal || 0) > 0) {
            const equipHeal =
                finalMyAttack * (myFightEquipBonus.lifesteal || 0) / 100
            me.hp = (me.hp || 100) + equipHeal
        }

        if ((enemyFightEquipBonus.lifesteal || 0) > 0) {
            const equipHeal =
                finalEnemyAttack * (enemyFightEquipBonus.lifesteal || 0) / 100
            enemy.hp = (enemy.hp || 100) + equipHeal
        }

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

            if (me.level >= 200) {
    me.level = 200
    me.xp = 0
    break
}

            me.money = (me.money || 0) + 500
        }

        me.normalFights = Math.max(
    0,
    (me.normalFights || 0) - 1
)

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
