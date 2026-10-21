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
        image: 'https://i.postimg.cc/FzHtpRwG/IMG-20261021-WA0005.jpg'
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
        image: 'https://i.postimg.cc/wxwYvXmx/file-00000000ca7082119996c5d76bf96ef2.png'
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
        image: 'https://i.postimg.cc/3xDsnzfb/Weapon-Card-Ages-of-Harvest-1.webp'
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
        image: 'https://i.postimg.cc/cJRVNwS7/IMG-20261021-WA0004.jpg'
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
        image: 'https://i.postimg.cc/NMQZGFG9/Weapon-Card-Rime-Draped-Sprouts-1.webp'
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
        image: 'https://i.postimg.cc/Y0sPxx6G/Weapon-Card-Verity-s-Handle-1.webp'
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
        image: 'https://i.postimg.cc/kX2zgkC6/Weapon-Card-Red-Spring-1.webp'
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
        image: 'https://i.postimg.cc/g2R7v8rC/file-00000000c658821180db4e8788ea0a85.png'
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
        image: 'https://i.postimg.cc/6QXmzqvC/file-0000000013748211a3b041166abe6175.png'
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
        image: 'https://i.postimg.cc/KzcsSWQ4/file-000000003af08211bc4c79e212fd45b9.png'
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
        image: 'https://i.postimg.cc/j2LgCJpR/file-000000002ac0820781366abd2809f797.png'
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
        image: 'https://i.postimg.cc/wxG4Z0Nz/file-00000000dfc082118762182f7dae4390.png'
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
        image: 'https://i.postimg.cc/YqLDHYNN/file-0000000061b8821182bee10afab89045.png'
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
        image: 'https://i.postimg.cc/YCcnq0bM/file-00000000744082119fdcf44cb3564d48.png'
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
        image: 'https://i.postimg.cc/3Rw9bvJ0/file-00000000889082119ab6afbb22c1d4d2.png'
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
        image: 'https://i.postimg.cc/3wtzR7kf/file-00000000f3488211910d0cda4c3841c9.png'
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
        image: 'https://i.postimg.cc/76cc3VMG/file-000000004ef482119436e5bb379d3c87.png'
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
        image: 'https://i.postimg.cc/FFdw9MNm/file-00000000dc74821186485df327198801.png'
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
        image: 'https://i.postimg.cc/2ysw69d9/file-00000000686c82118444f0bb6cacfa80.png'
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
        image: 'https://i.postimg.cc/7Pj80xm0/file-0000000088b88211aee6d0f31ef8fe93.png'
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
        image: 'https://i.postimg.cc/NfThxWnM/file-00000000a0e082119afe0584ec2e21b6.png'
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
        image: 'https://i.postimg.cc/2SFPsnmt/file-0000000034b8821197961664d2639a7e.png'
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
