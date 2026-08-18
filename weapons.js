// =========================
// ⚔️ بنك الأسلحة (Weapons) - أسامي وستاتات حقيقية من Wuthering Waves
// فقط أسلحة توقيع (مؤقتة/Limited) لشخصيات بانرات محدودة - بدون أي أسلحة ستاندر
// ⚠️ ما فيه حقل "character" هنا نهائياً - بس اسم السلاح، لأنه بنر خاص بالأسلحة فقط
// ⚠️ أي ستات (subStatValue) ما يتعدى 25 أبداً
// ⚠️ subStatType متنوع (مو بس critRate/critDamage) ومرتبط بستاتات موجودة فعلياً
//    بـ equipmentAffixes.js: attack, attackPercent, hp, hpPercent, defense,
//    critRate, critDamage, dodge, accuracy, lifesteal, reflect, bossDamage
//    (ما فيه energyRegen لأنه مو موجود بستاتات البوت أصلاً)
// baseAtk مطابق للفل 90 الحقيقي باللعبة
// image: خانة فاضية تحط فيها رابط صورة خارجي (URL) بنفسك
// =========================

const weapons = [

    {
        id: 'verdantSummit',
        name: 'Verdant Summit',
        type: 'Broadblade',
        limited: true,
        rarity: 5,
        baseAtk: 587,
        subStatType: 'critDamage',
        subStatValue: 25,
        image: ''
    },
    {
        id: 'stringmaster',
        name: 'Stringmaster',
        type: 'Rectifier',
        limited: true,
        rarity: 5,
        baseAtk: 500,
        subStatType: 'critRate',
        subStatValue: 25,
        image: ''
    },
    {
        id: 'agesOfHarvest',
        name: 'Ages of Harvest',
        type: 'Broadblade',
        limited: true,
        rarity: 5,
        baseAtk: 587,
        subStatType: 'attackPercent',
        subStatValue: 25,
        image: ''
    },
    {
        id: 'blazingBrilliance',
        name: 'Blazing Brilliance',
        type: 'Sword',
        limited: true,
        rarity: 5,
        baseAtk: 587,
        subStatType: 'critDamage',
        subStatValue: 25,
        image: ''
    },
    {
        id: 'rimeDrapedSprouts',
        name: 'Rime-Draped Sprouts',
        type: 'Rectifier',
        limited: true,
        rarity: 5,
        baseAtk: 500,
        subStatType: 'bossDamage',
        subStatValue: 25,
        image: ''
    },
    {
        id: 'veritysHandle',
        name: "Verity's Handle",
        type: 'Gauntlet',
        limited: true,
        rarity: 5,
        baseAtk: 587,
        subStatType: 'critRate',
        subStatValue: 24.3,
        image: ''
    },
    {
        id: 'redSpring',
        name: 'Red Spring',
        type: 'Sword',
        limited: true,
        rarity: 5,
        baseAtk: 587,
        subStatType: 'critRate',
        subStatValue: 24.3,
        image: ''
    },
    {
        id: 'stellarSymphony',
        name: 'Stellar Symphony',
        type: 'Rectifier',
        limited: true,
        rarity: 5,
        baseAtk: 412,
        subStatType: 'hpPercent',
        subStatValue: 25,
        image: ''
    },
    {
        id: 'defiersThorn',
        name: "Defier's Thorn",
        type: 'Sword',
        limited: true,
        rarity: 5,
        baseAtk: 413,
        subStatType: 'hpPercent',
        subStatValue: 25,
        image: ''
    },
    {
        id: 'thunderflareDominion',
        name: 'Thunderflare Dominion',
        type: 'Broadblade',
        limited: true,
        rarity: 5,
        baseAtk: 675,
        subStatType: 'dodge',
        subStatValue: 20,
        image: ''
    },
    {
        id: 'letheanElegy',
        name: 'Lethean Elegy',
        type: 'Rectifier',
        limited: true,
        rarity: 5,
        baseAtk: 587,
        subStatType: 'reflect',
        subStatValue: 24,
        image: ''
    },
    {
        id: 'azureOath',
        name: 'Azure Oath',
        type: 'Gauntlet',
        limited: true,
        rarity: 5,
        baseAtk: 587,
        subStatType: 'defense',
        subStatValue: 18,
        image: ''
    },
    {
        id: 'freezeFrame',
        name: 'Freeze Frame',
        type: 'Rectifier',
        limited: true,
        rarity: 5,
        baseAtk: 587,
        subStatType: 'critRate',
        subStatValue: 24.2,
        image: ''
    },
    {
        id: 'whispersOfSirens',
        name: 'Whispers of Sirens',
        type: 'Rectifier',
        limited: true,
        rarity: 5,
        baseAtk: 500,
        subStatType: 'lifesteal',
        subStatValue: 22,
        image: ''
    },
    {
        id: 'luxAndUmbra',
        name: 'Lux & Umbra',
        type: 'Pistol',
        limited: true,
        rarity: 5,
        baseAtk: 587,
        subStatType: 'accuracy',
        subStatValue: 22,
        image: ''
    },
    {
        id: 'unflickeringValor',
        name: 'Unflickering Valor',
        type: 'Sword',
        limited: true,
        rarity: 5,
        baseAtk: 415,
        subStatType: 'bossDamage',
        subStatValue: 20,
        image: ''
    },
    {
        id: 'woodlandAria',
        name: 'Woodland Aria',
        type: 'Pistol',
        limited: true,
        rarity: 5,
        baseAtk: 500,
        subStatType: 'critRate',
        subStatValue: 25,
        image: ''
    },
    {
        id: 'emeraldSentence',
        name: 'Emerald Sentence',
        type: 'Sword',
        limited: true,
        rarity: 5,
        baseAtk: 587,
        subStatType: 'attackPercent',
        subStatValue: 24.3,
        image: ''
    },
    {
        id: 'blazingJustice',
        name: 'Blazing Justice',
        type: 'Gauntlet',
        limited: true,
        rarity: 5,
        baseAtk: 587,
        subStatType: 'critDamage',
        subStatValue: 25,
        image: ''
    },
    {
        id: 'wildfireMark',
        name: 'Wildfire Mark',
        type: 'Broadblade',
        limited: true,
        rarity: 5,
        baseAtk: 587,
        subStatType: 'critDamage',
        subStatValue: 25,
        image: ''
    },
    {
        id: 'frostburn',
        name: 'Frostburn',
        type: 'Sword',
        limited: true,
        rarity: 5,
        baseAtk: 587,
        subStatType: 'critRate',
        subStatValue: 24.3,
        image: ''
    },
    {
        id: 'moongazersSigil',
        name: "Moongazer's Sigil",
        type: 'Gauntlet',
        limited: true,
        rarity: 5,
        baseAtk: 500,
        subStatType: 'dodge',
        subStatValue: 22,
        image: ''
    }

]

// =========================
// 🔧 Helpers
// =========================

function getWeaponById(id) {
    return weapons.find(w => w.id === id) || null
}

function getWeaponsByType(type) {
    return weapons.filter(w => w.type === type)
}

function getLimitedWeapons() {
    return weapons.filter(w => w.limited === true)
}

function getStandardWeapons() {
    return weapons.filter(w => w.limited === false)
}

module.exports = {
    weapons,
    getWeaponById,
    getWeaponsByType,
    getLimitedWeapons,
    getStandardWeapons
}
