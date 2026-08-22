const fs = require("fs")
const path = require("path")
const Banner = require('../models/Banner')
const characters = require('../characters.json')

// =========================
// تاريخ السعودية
// =========================

function getSaudiDate() {

    return new Date().toLocaleDateString(
        'en-CA',
        {
            timeZone: 'Asia/Riyadh'
        }
    )

}

// =========================
// الحصول على البنر
// =========================

async function getBanner() {

    let banner =
        await Banner.findOne()

    if (!banner) {

        banner =
            await Banner.create({})

    }

    return banner

}

// =========================
// تصفية شخصيات البنر
// =========================

function getBannerCharacters() {

    return characters.filter(c =>

        c.rarity === 'SSS' &&
        c.power >= 6000

    )

}
// =========================
// تجديد البنر
// =========================

async function refreshBanner(sock) {

    const banner = await getBanner()

    const today = getSaudiDate()

    // إذا تم التجديد اليوم لا يفعل شيء
    if (banner.lastReset === today) {

        return banner

    }

    const pool = getBannerCharacters()

    // استبعاد الشخصيات التي ظهرت مؤخراً
    let available = pool.filter(

        c => !banner.recentCharacters.includes(c.name)

    )

    // إذا انتهت القائمة نبدأ من جديد
    if (!available.length) {

        banner.recentCharacters = []

        available = pool

    }

    // اختيار شخصية عشوائية
    const character =

        available[
            Math.floor(
                Math.random() *
                available.length
            )
        ]

    banner.character = character

    banner.bannerName = character.name

    banner.lastReset = today

    // إعادة العداد العالمي
    banner.globalPulls = 0

    banner.rewardClaimed = false

    banner.participants = []

    // حفظ الشخصية لمنع تكرارها
    banner.recentCharacters.push(character.name)

    // لا نحتفظ إلا بآخر 10 شخصيات
    if (banner.recentCharacters.length > 10) {

        banner.recentCharacters.shift()

    }

    await banner.save()

const groups = [

    "120363020823525909@g.us",
'120363428933463078@g.us',
    "120363409897316453@g.us",
    "120363116482407260@g.us"

]

const text =
`🌌 ═════〔 LIMITED BANNER 〕═════ 🌌

🎉 تم تجديد البنر اليومي!

👑 ${banner.character.name}

⚔ القوة ➤ ${banner.character.power}

🌌 الأنمي ➤ ${banner.character.anime}

━━━━━━━━━━━━

⏳ متاح لمدة 24 ساعة

🎮 اكتب:

.بنر

لمشاهدة البنر والسحب.

🍀 حظًا موفقًا للجميع!`

for (const jid of groups) {

    try {

        if (
            character.image &&
            character.image.startsWith("http")
        ) {

            await sock.sendMessage(
                jid,
                {
                    image: {
                        url: character.image
                    },
                    caption: text
                }
            )

} else {

    const fs = require("fs")
    const path = require("path")

    const imagePath = path.join(
        __dirname,
        "..",
        character.image
    )

    if (fs.existsSync(imagePath)) {

        await sock.sendMessage(
            jid,
            {
                image: fs.readFileSync(imagePath),
                caption: text
            }
        )

    } else {

        await sock.sendMessage(
            jid,
            {
                text
            }
        )

    }

}

    } catch (e) {

        console.log(e)

    }

}

return banner

}

module.exports = {

    getSaudiDate,

    getBanner,

    getBannerCharacters,

    refreshBanner

}
