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
// images: 6 روابط صور — اللاعب يختار وحدة منها بأمر .رفيق_صورة
// -----------------------------------------------------------
const ANIMALS = {

    cat: {
        key: 'cat',
        defaultName: 'قط',
        emoji: '🐱',
        images: [
            'https://i.postimg.cc/YjKhVjVR/file-00000000765881f496ff8545103a4edf.png',
            'https://i.postimg.cc/RCdGfg8n/fe0555147caaf018f9d955ed5be3a35e.jpg',
            'https://i.postimg.cc/15CQWcgS/6ad3612245bc3910805b131fa908060f.jpg',
            'https://i.postimg.cc/y6LXWkgQ/70388d8a2fbb5733693d0387a8fd40fc.jpg',
            'https://i.postimg.cc/kXZQFzyK/fedb19c8b6270512fac9561d0166e531.jpg',
            'https://i.postimg.cc/wjr9BcHW/0912a39f03960d8722408377ae46bf32.jpg'
        ],
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
        images: [
            'https://i.postimg.cc/sDmMKfmz/file-000000009df081f4b884dbf13b85ea14.png',
            'https://i.postimg.cc/xTCrbJ64/a282b03d11cb4ce185a87d75e1799f2d.jpg',
            'https://i.postimg.cc/ZKDGPbgF/bdbba5578013277a623938e52fd3fc7d.jpg',
            'https://i.postimg.cc/XYRth2nY/0e06bb949026e4dc95d0c9b63d0589a4.jpg',
            'https://i.postimg.cc/hjg64fzc/75eeafea93b9c561b927b466e0876011.jpg',
            'https://i.postimg.cc/gJD5xm8H/cd893c0b1dfb2330fe4d31ca51b40fa5.jpg'
        ],
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
        images: [
            'https://i.postimg.cc/KzWKP0Dp/file-00000000577081f4815fefc3bd2ccf68.png',
            'https://i.postimg.cc/VvhYpj7g/8f9695f9d1229b5e5f6cd44ecd5b7ca9.jpg',
            'https://i.postimg.cc/Gh03Fjyt/5e32a0e052c4047f4fffd43ceea3bb83.jpg',
            'https://i.postimg.cc/Bn4qyQpB/b48d0560e2e12df5a93c6cf2d10de545.jpg',
            'https://i.postimg.cc/q77pJb9c/90a6291b312552c5d18bcab46392382e.jpg',
            'https://i.postimg.cc/qBK4vCZj/88fc891cbda3303beb19806de48e6025.jpg'
        ],
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
        images: [
            'https://i.postimg.cc/qqn8zfHD/file-00000000ab2081f49aa38f031a98ca66.png',
            'https://i.postimg.cc/yNNnLcZY/2ff2e7fc4341dde3bd69c87599ca72c2.jpg',
            'https://i.postimg.cc/k40cMHh9/2542b07e702a395f83f131e5093d6bbd.jpg',
            'https://i.postimg.cc/sDRctth4/f613c9e2b3fe1b012d01c33c3460fb64.jpg',
            'https://i.postimg.cc/RZgLJhDm/de52a591f975c6d5c746e436f2a8f95b.jpg',
            'https://i.postimg.cc/ZRd8QcYs/95db38e7250bebef4283601810f31996.jpg'
        ],
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
        images: [
            'https://i.postimg.cc/sgChH0dP/file-000000007000820abfab7542036b553d.png',
            'https://i.postimg.cc/65wrHnkb/ea0a24f0cf7cf6992e8035035f89c428.jpg',
            'https://i.postimg.cc/jjgT1H3h/13c0817d88ac65d9c554ae40f4914bd8.jpg',
            'https://i.postimg.cc/ZRXSbTSd/97a27f7df47ba65a58ae62a8c618b87c.jpg',
            'https://i.postimg.cc/GtY19Z3R/13c3d260b245b39693d955af4f7f9d58.jpg',
            'https://i.postimg.cc/Fs54wspM/37509c5cab380491e90cf60bffe3d482.jpg'
        ],
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
        images: [
            'https://i.postimg.cc/cJHwftGz/file-0000000022bc824683351b0c5d22542f.png',
            'https://i.postimg.cc/N0T8JDjz/86b11170a12eaffdf9c8171dc702fe7f.jpg',
            'https://i.postimg.cc/NMc6WXy8/9e97c9f75a4ab051b47dc2b8890a69d4.jpg',
            'https://i.postimg.cc/cC1QJNMV/6a928b61651b90c99c43c832b10c3f88.jpg',
            'https://i.postimg.cc/hvCVz32m/sddefault.jpg',
            'https://i.postimg.cc/7PX3WfqL/24d2f125f5da42da5e88b1d82ebca212.jpg'
        ],
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
        images: [
            'https://i.postimg.cc/d0xd6Qqk/file-00000000c77481f4add92b30ed7e2c91.png',
            'https://i.postimg.cc/mDprQfG2/7eabdcc8e4f401cfa9bd9352059b1644.jpg',
            'https://i.postimg.cc/C5Zx7PFf/341f3f34431570ca5ea9f51fc868590a.jpg',
            'https://i.postimg.cc/HnfshwxS/5914b223c6e09971d155bb7acf34d867.jpg',
            'https://i.postimg.cc/Vv3LVqvN/ef97a3d64f90dd4b5ceb386b39216104.jpg',
            'https://i.postimg.cc/59G0yV3r/c317340a85010d8a34366eb3c5b257d1.jpg'
        ],
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
        images: [
            'https://i.postimg.cc/brQtqQ1R/3c48495019f7e9975aa586bf2faa5cdc.jpg',
            'https://i.postimg.cc/j2XYzyfv/0d03c5d8107c340134a258198156eff8.jpg',
            'https://i.postimg.cc/GhLCbSwn/bedc273857df734da58bf281406dece7.jpg',
            'https://i.postimg.cc/jdMr2Qtd/275efb7a96512c938616ffca60777373.jpg',
            'https://i.postimg.cc/y8WCZg8S/29b2a79c152e1aa234e948721f9c764a.jpg',
            'https://i.postimg.cc/HkKD4Yr0/553aac3baae456f1a9d8ac302ef78637.jpg'
        ],
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
        images: [
            'https://i.postimg.cc/g0nLx9vj/878167ff9aa4283930c51601586df9ce.jpg',
            'https://i.postimg.cc/YqYWw0HQ/9cda45381a917b44895ff8c8a799e0fc.jpg',
            'https://i.postimg.cc/52JF9J4g/65609e1a4272a562399f8c43ac1b1b18.jpg',
            'https://i.postimg.cc/T3c5pshX/b4cf6640fbb0c1301d8fe9cefe7bd834.jpg',
            'https://i.postimg.cc/L8VgnWhf/c7d9cb125ecb36095c8cd9f545c004de.jpg',
            'https://i.postimg.cc/Ls6YfVZz/9143e8aacc2459075c1a1600bf814df5.jpg'
        ],
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

const IMAGES_PER_ANIMAL = 6 // 🖼️ عدد خيارات الصور الثابت لكل رفيق

// -----------------------------------------------------------
// 🖼️ يرجّع رابط صورة معيّنة لرفيق (بالفهرس 0-5)
// لو الفهرس غير صالح أو الصورة بذاك الفهرس لسا فاضية (null)،
// يرجع أول صورة متوفرة كاحتياط
// -----------------------------------------------------------
function getCompanionImage(animalKey, index) {

    const animal = ANIMALS[animalKey]
    if (!animal) return null

    const idx = Math.max(0, Math.min(IMAGES_PER_ANIMAL - 1, Math.floor(index || 0)))

    return animal.images[idx] || animal.images.find(img => img) || null
}

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
// selectedImageIndex: رقم الصورة اللي اختارها اللاعب (0-5) — تُحفظ
// بحالة اللاعب لما يستخدم أمر اختيار الصورة، وتُمرَّر هنا كل مرة
// -----------------------------------------------------------
function buildCompanionCard(animalKey, level, foodProgress, customName, selectedImageIndex) {

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
        image: getCompanionImage(animalKey, selectedImageIndex),
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
    IMAGES_PER_ANIMAL,
    FOOD_TO_NEXT_LEVEL,
    MAX_LEVEL,
    MIN_LEVEL,
    EGG_IMAGE,
    getCompanionBonus,
    getFoodNeededForNextLevel,
    getTotalFoodToLevel,
    getCompanionImage,
    buildCompanionCard
}
