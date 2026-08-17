// =========================
// 🏟️ ARENA SYSTEM — DATA FILE
// =========================
// شخصيات الأرينا المؤهّلة (60 شخصية) + نظام الألوان الخمسة
// نسخة كاملة مأخوذة من arena_draft.json — لا تُعدَّل هذه القائمة إلا يدوياً
// من قبل المطور (إضافة شخصية جديدة = إضافة عنصر جديد بنفس الشكل بالأسفل)

const ARENA_CHARACTERS = require('./arena_characters_raw.json')

// فهرس سريع بالاسم (case-sensitive مطابق لاسم الشخصية بالروستر)
const ARENA_CHAR_MAP = new Map(
    ARENA_CHARACTERS.map(c => [c.name, c])
)

function isArenaEligible(name) {
    return ARENA_CHAR_MAP.has(name)
}

function getArenaChar(name) {
    return ARENA_CHAR_MAP.get(name) || null
}

// =========================
// 🎨 نظام الألوان
// =========================
// مثلث: أحمر > أخضر > أزرق > أحمر
// برتقالي وبنفسجي: محايدان عن المثلث، لكن يبادلون بعضهم ضرر إضافي +50%

const COLOR_EMOJI = {
    red: '🔴',
    green: '🟢',
    blue: '🔵',
    orange: '🟠',
    purple: '🟣'
}

const COLOR_NAME_AR = {
    red: 'أحمر (قوة)',
    green: 'أخضر (تقنية)',
    blue: 'أزرق (سرعة)',
    orange: 'برتقالي (عقل)',
    purple: 'بنفسجي (قلب)'
}

// يرجع مضاعف ضرر الهجوم بناءً على لون المهاجم مقابل لون المدافع
function colorMultiplier(atkColor, defColor) {

    if (!atkColor || !defColor)
        return 1

    // مثلث القوة: أحمر > أخضر > أزرق > أحمر
    const beats = {
        red: 'green',
        green: 'blue',
        blue: 'red'
    }

    if (beats[atkColor] === defColor)
        return 1.5

    if (beats[defColor] === atkColor)
        return 0.75

    // تبادل برتقالي/بنفسجي: كل واحد يعطي +50% ضد الثاني (بالاتجاهين)
    if (
        (atkColor === 'orange' && defColor === 'purple') ||
        (atkColor === 'purple' && defColor === 'orange')
    ) {
        return 1.5
    }

    return 1
}

// =========================
// 🏆 رتب الأرينا (نظام بليتش: رتبة 10 نازلة إلى رتبة 1 ثم "قائد")
// =========================
// كل رتبة عندها مدى نقاط (trophies). المنطقة داخل الرتبة:
// 🔴 أحمر (أسفل 20%) = خطر هبوط | ⚪ أبيض (وسط) = آمن | 🟢 أخضر (أعلى 20%) = صعود
// الانتقال يتم تلقائياً كل يومين الساعة 12:00 ص بتوقيت السعودية

const ARENA_RANKS = [
    { name: 'رتبة 10', minPoints: 0 },
    { name: 'رتبة 9',  minPoints: 150 },
    { name: 'رتبة 8',  minPoints: 320 },
    { name: 'رتبة 7',  minPoints: 510 },
    { name: 'رتبة 6',  minPoints: 720 },
    { name: 'رتبة 5',  minPoints: 950 },
    { name: 'رتبة 4',  minPoints: 1200 },
    { name: 'رتبة 3',  minPoints: 1470 },
    { name: 'رتبة 2',  minPoints: 1760 },
    { name: 'رتبة 1',  minPoints: 2070 },
    { name: 'قائد',    minPoints: 2400 }
]

function rankIndexFromPoints(points) {

    let idx = 0

    for (let i = 0; i < ARENA_RANKS.length; i++) {
        if ((points || 0) >= ARENA_RANKS[i].minPoints)
            idx = i
    }

    return idx
}

function getArenaRankName(points) {
    return ARENA_RANKS[rankIndexFromPoints(points)].name
}

// يرجع نسبة موقع اللاعب داخل مدى رتبته الحالية (0 إلى 1)
function getRankZone(points) {

    const idx = rankIndexFromPoints(points)
    const tier = ARENA_RANKS[idx]
    const next = ARENA_RANKS[idx + 1]

    // بأعلى رتبة (قائد) ما فيه صعود إضافي — دايماً أبيض
    if (!next) {
        return { zone: 'white', idx }
    }

    const range = next.minPoints - tier.minPoints
    const pct = range > 0 ? (points - tier.minPoints) / range : 0

    if (idx === 0 && pct <= 0.2) {
        // أدنى رتبة أصلاً، ما فيه هبوط أكثر
        return { zone: 'white', idx }
    }

    if (pct >= 0.8) return { zone: 'green', idx }
    if (pct <= 0.2) return { zone: 'red', idx }

    return { zone: 'white', idx }
}

const ZONE_EMOJI = {
    red: '🔴',
    white: '⚪',
    green: '🟢'
}

module.exports = {
    ARENA_CHARACTERS,
    ARENA_CHAR_MAP,
    isArenaEligible,
    getArenaChar,
    COLOR_EMOJI,
    COLOR_NAME_AR,
    colorMultiplier,
    ARENA_RANKS,
    rankIndexFromPoints,
    getArenaRankName,
    getRankZone,
    ZONE_EMOJI
}
