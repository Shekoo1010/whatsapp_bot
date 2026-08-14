// =========================================================
// 🐾 نظام الرفيق (Companion System) — ملف بيانات خارجي
// =========================================================
// هذا الملف بيانات فقط (data) — ما فيه أي كود يتعامل مع
// الرسائل أو قاعدة البيانات مباشرة، عشان يسهل ندمجه بأي مكان
// بالبوت (أمر .رفيق، المتجر الشخصي، نظام الإطعام...).
//
// الرفيق نظام منفصل تماماً عن BEAST SYSTEM الحالي (كوراما/الجوبي/
// ownedBeasts) — غير قتالي بالكامل، بونص باسيف بس.
// =========================================================

// -----------------------------------------------------------
// 🍖 تكلفة الإطعام للانتقال من مستوى لآخر
// index 0 = من مستوى 0 (حديث الفقس) → مستوى 1 = 4 وحدات طعام
// index 1 = من مستوى 1 → 2 = 5 وحدات طعام
// ... وهكذا لين index 9 = من مستوى 9 → 10 = 13 وحدة طعام
// المجموع الكلي من الصفر للفل 10 = 85 وحدة طعام
// -----------------------------------------------------------
const FOOD_TO_NEXT_LEVEL = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

const MAX_LEVEL = 10
const MIN_LEVEL = 0 // اللاعب يبدأ برفيقه بمستوى 0 لحظة الفقس

// -----------------------------------------------------------
// 🥚 صورة البيضة قبل الفقس — تُعرض عند .شراء_وحش رفيق
// (الحيوان نفسه غير معروف بهذي اللحظة، فتُستخدم صورة بيضة عامة)
// -----------------------------------------------------------
const EGG_IMAGE = null // 🖼️ يُضاف لاحقاً رابط صورة البيضة

// -----------------------------------------------------------
// 🐾 بيانات الحيوانات التسعة
// bonusType: نوع البونص (يُستخدم بالكود اللي يطبّق التأثير فعلياً)
// bonusAtLevel1 / bonusAtLevel10: طرفي منحنى النسبة (المستويات
// 2-9 تُحسب تلقائياً بالتدرّج الخطي عبر الدالة getCompanionBonus)
// customNameAllowed: يقدر اللاعب يسمي رفيقه أي اسم (مو مجبور
// يستخدم الاسم الافتراضي "أسد"/"أرنب" إلخ)
// image: خانة فاضية — تُملى لاحقاً برابط أو مسار الصورة
// -----------------------------------------------------------
const ANIMALS = {

    cat: {
        key: 'cat',
        defaultName: 'قط',
        emoji: '🐱',
        image: 'https://i.postimg.cc/YjKhVjVR/file-00000000765881f496ff8545103a4edf.png',
        bonusType: 'moneyBonus', // نسبة زيادة على كل مال مكتسب (addMoney)
        bonusAtLevel1: 3,
        bonusAtLevel10: 6,
        unit: '%',
        description: 'رفيق هادئ يزيد نسبة بسيطة من كل مال تكسبه من أي أمر بالبوت.'
    },

    dog: {
        key: 'dog',
        defaultName: 'كلب',
        emoji: '🐶',
        image: 'https://i.postimg.cc/sDmMKfmz/file-000000009df081f4b884dbf13b85ea14.png',
        bonusType: 'xpBonus', // نسبة زيادة على الخبرة المكتسبة
        bonusAtLevel1: 5,
        bonusAtLevel10: 10,
        unit: '%',
        description: 'رفيق وفي يسرّع تقدمك بالخبرة من القتالات والمهام.'
    },

    rabbit: {
        key: 'rabbit',
        defaultName: 'ارنب',
        emoji: '🐰',
        image: 'https://i.postimg.cc/KzWKP0Dp/file-00000000577081f4815fefc3bd2ccf68.png',
        bonusType: 'extraFights', // عدد محاولات قتال إضافية يومياً (رقم صحيح، مو نسبة)
        // منحنى مرحلي (مو خطي): +1 من مستوى 1 إلى 6، ثم +2 من مستوى 7 إلى 10
        levelValues: [1, 1, 1, 1, 1, 1, 2, 2, 2, 2],
        unit: 'محاولة',
        description: 'رفيق نشيط يرجّع لك محاولة قتال إضافية يومياً.'
    },

    lion: {
        key: 'lion',
        defaultName: 'اسد',
        emoji: '🦁',
        image: 'https://i.postimg.cc/qqn8zfHD/file-00000000ab2081f49aa38f031a98ca66.png',
        bonusType: 'bossDamageBonus', // يُضاف مباشرة على bossDamageBonus بالـ Player
        bonusAtLevel1: 5,
        bonusAtLevel10: 10,
        unit: '%',
        description: 'رفيق قوي يرفع ضررك على الزعيم العالمي.'
    },

    tiger: {
        key: 'tiger',
        defaultName: 'نمر',
        emoji: '🐯',
        image: 'https://i.postimg.cc/sgChH0dP/file-000000007000820abfab7542036b553d.png',
        bonusType: 'critRateBonus',
        bonusAtLevel1: 2,
        bonusAtLevel10: 4,
        unit: '%',
        description: 'رفيق شرس يرفع فرصة الضربة الحرجة بالـ PvP.'
    },

    bear: {
        key: 'bear',
        defaultName: 'دب',
        emoji: '🐻',
        image: 'https://i.postimg.cc/cJHwftGz/file-0000000022bc824683351b0c5d22542f.png',
        bonusType: 'hpBonus',
        bonusAtLevel1: 3,
        bonusAtLevel10: 6,
        unit: '%',
        description: 'رفيق متين يرفع دمك الأقصى.'
    },

    duck: {
        key: 'duck',
        defaultName: 'بط',
        emoji: '🦆',
        image: 'https://i.postimg.cc/d0xd6Qqk/file-00000000c77481f4add92b30ed7e2c91.png',
        bonusType: 'boxLuckBonus', // نسبة رفع جودة الصندوق عند الفتح (rare → epic/legendary...)
        bonusAtLevel1: 5,
        bonusAtLevel10: 10,
        unit: '%',
        description: 'رفيق محظوظ يرفع فرصة حصولك على جودة أعلى عند فتح الصناديق.'
    },

    shadow: {
        key: 'shadow',
        defaultName: 'شادو',
        emoji: '⚫',
        image: 'https://i.postimg.cc/brQtqQ1R/3c48495019f7e9975aa586bf2faa5cdc.jpg',
        bonusType: 'kingdomStageBonus', // نسبة تقدم إضافي بمرحلة غزو الممالك لكل غزوة ناجحة
        bonusAtLevel1: 5,
        bonusAtLevel10: 10,
        unit: '%',
        description: 'رفيق يعيش بالظل يسرّع تقدمك بغزو الممالك.'
    },

    sonic: {
        key: 'sonic',
        defaultName: 'سونيك',
        emoji: '💙',
        image: 'https://i.postimg.cc/g0nLx9vj/878167ff9aa4283930c51601586df9ce.jpg',
        // بونص خاص: فرصة (%) عند سحب شخصيتك المفضّلة بالذات (favoriteCharacter)
        // إنك تجدد فرصة سحبها (تسترجع سحبة من رصيدك) بدل ما تاخذ نسخة زيادة
        bonusType: 'favoriteRenewChance',
        bonusAtLevel1: 5,
        bonusAtLevel10: 10,
        unit: '%',
        description: 'رفيق سريع البرق — لما تسحب شخصيتك المفضّلة، عنده فرصة يجدد لك فرصة سحبها بدل ما تُحسب من رصيدك.'
    }

}

const ANIMAL_KEYS = Object.keys(ANIMALS)

// -----------------------------------------------------------
// 📈 يحسب قيمة البونص لأي مستوى (1-10) بتدرّج خطي بين طرفي المنحنى
// (إلا الأرنب، اللي له levelValues مرحلي جاهز بالأعلى)
// -----------------------------------------------------------
function getCompanionBonus(animalKey, level) {

    const animal = ANIMALS[animalKey]
    if (!animal) return 0

    const lvl = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)))

    // حالة المنحنى المرحلي (الأرنب حالياً)
    if (animal.levelValues) {
        return animal.levelValues[lvl - 1]
    }

    const { bonusAtLevel1, bonusAtLevel10 } = animal

    const value =
        bonusAtLevel1 +
        (bonusAtLevel10 - bonusAtLevel1) * ((lvl - 1) / (MAX_LEVEL - 1))

    // تقريب لخانة عشرية وحدة (مثلاً 6.4%) — يمنع أرقام كسرية طويلة
    return Math.round(value * 10) / 10
}

// -----------------------------------------------------------
// 🍖 كمية الطعام المطلوبة للانتقال من مستوى معين للي بعده
// currentLevel = 0 → يرجع تكلفة الوصول لمستوى 1، وهكذا
// -----------------------------------------------------------
function getFoodNeededForNextLevel(currentLevel) {

    const lvl = Math.max(0, Math.min(MAX_LEVEL - 1, Math.floor(currentLevel)))

    return FOOD_TO_NEXT_LEVEL[lvl]
}

// -----------------------------------------------------------
// 🧮 إجمالي الطعام المطلوب من الصفر لمستوى معين (تراكمي)
// -----------------------------------------------------------
function getTotalFoodToLevel(targetLevel) {

    const lvl = Math.max(0, Math.min(MAX_LEVEL, Math.floor(targetLevel)))

    let total = 0

    for (let i = 0; i < lvl; i++) {
        total += FOOD_TO_NEXT_LEVEL[i]
    }

    return total
}

// -----------------------------------------------------------
// 🎴 يبني بطاقة عرض جاهزة (نص) للاستخدام بأمر .رفيق أو .حيواني
// customName: الاسم اللي اختاره اللاعب لرفيقه (لو ما اختار، نستخدم
// defaultName)
// -----------------------------------------------------------
function buildCompanionCard(animalKey, level, foodProgress, customName) {

    const animal = ANIMALS[animalKey]
    if (!animal) return null

    const bonus = getCompanionBonus(animalKey, level)
    const name = customName || animal.defaultName
    const isMaxLevel = level >= MAX_LEVEL

    const foodNeeded = isMaxLevel
        ? 0
        : getFoodNeededForNextLevel(level)

    const progressLine = isMaxLevel
        ? '🌟 وصل أعلى مستوى'
        : `🍖 التقدم: ${foodProgress || 0}/${foodNeeded} طعام للمستوى القادم`

    return {
        image: animal.image, // null لين تُضاف الصور
        text:
`${animal.emoji} ═══〔 ${name} 〕═══ ${animal.emoji}

📛 النوع: ${animal.defaultName}
📊 المستوى: ${level}/${MAX_LEVEL}
✨ البونص الحالي: +${bonus}${animal.unit}

📝 ${animal.description}

${progressLine}`
    }
}

module.exports = {
    ANIMALS,
    ANIMAL_KEYS,
    FOOD_TO_NEXT_LEVEL,
    MAX_LEVEL,
    MIN_LEVEL,
    EGG_IMAGE,
    getCompanionBonus,
    getFoodNeededForNextLevel,
    getTotalFoodToLevel,
    buildCompanionCard
}
