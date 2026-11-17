const characters = require('../characters.json')

// =========================
// اختيار شخصية عشوائية (بنسخة مستقلة)
// anime اختياري: بدونه من كل الأنميات
// =========================

function randomCharacter(rarity, anime) {

    const pool = characters.filter(
        c =>
            c.rarity === rarity &&
            (!anime || c.anime === anime)
    )

    if (!pool.length)
        return null

    const random =
        JSON.parse(
            JSON.stringify(
                pool[Math.floor(Math.random() * pool.length)]
            )
        )

    random.originalPower = random.power
    random.evolutionLevel = 0
    random.urAbilities = []

    return random

}

// شخصية SSS من نفس أنمي الزعيم
function randomSSSFromAnime(anime) {
    return randomCharacter('SSS', anime)
}

// شخصية أسطورية عشوائية من أي أنمي
function randomLegendary() {
    return randomCharacter('اسطوري')
}

// =========================
// نسب أول ثلاثة
// =========================

const TOP_SSS_CHANCE = 70   // % (رمية واحدة مشتركة للثلاثة)
const TOP_SSS_HIGH_CHANCE = 70 // % (لكل واحد على حدة)

// رمية واحدة: لو نجحت يأخذ الثلاثة الأوائل شخصية SSS
function rollTopSSS() {
    return Math.random() * 100 < TOP_SSS_CHANCE
}

// =========================
// الفلوس
// =========================

const TOP_MONEY = { 1: 1500000, 2: 1200000, 3: 1000000 }
const MID_MONEY = { 4: 700000, 5: 550000, 6: 450000 }

function randomMoney() {
    // من 100,000 إلى 300,000
    return Math.floor(Math.random() * 200001) + 100000
}

function scale(money, multiplier) {
    return Math.floor(money * (multiplier || 1))
}

// =========================
// جوائز أول ثلاثة
// topHit: نتيجة rollTopSSS() المشتركة
// =========================

function topReward(rank, anime, multiplier = 1, topHit = false) {

    return {

        money: scale(TOP_MONEY[rank] || 1000000, multiplier),

        character: topHit ? randomSSSFromAnime(anime) : null,

        boxes: {
            sss_chance: 2,
            sss_high: Math.random() * 100 < TOP_SSS_HIGH_CHANCE ? 1 : 0,
            legendary: 0
        }

    }

}

// =========================
// المراكز 4 و5 و6: فلوس ثابتة + شخصية أسطورية + صندوق sss_chance
// =========================

function midReward(rank, multiplier = 1) {

    return {

        money: scale(MID_MONEY[rank] || 450000, multiplier),

        character: randomLegendary(),

        boxes: { sss_chance: 1, sss_high: 0, legendary: 0 }

    }

}

// =========================
// جوائز البقية: 100-300 ألف + صندوق أسطوري
// =========================

function normalReward(multiplier = 1) {

    return {

        money: scale(randomMoney(), multiplier),

        boxes: { sss_chance: 0, sss_high: 0, legendary: 1 }

    }

}

module.exports = {

    rollTopSSS,
    topReward,
    midReward,
    normalReward

}
