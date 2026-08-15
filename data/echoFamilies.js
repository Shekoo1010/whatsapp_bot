// =========================
// 🎐 عوائل الإيكو (Echo Families / Sonata Effects)
// كل عائلة = دومين واحد بنفس معرّفها بالضبط (systems/domainSystem.js + data/echoMonsters.js)
// bonus2 → يتفعّل لو لابس قطعتين (أو أكثر) من نفس العائلة
// bonus5 → يتفعّل لو لابس 5 قطع (الطقم كامل) من نفس العائلة
// القيم تُقرأ مباشرة من equipmentSystem.calculateFamilyBonus() وتُضاف لستاتات الشخصية
// =========================

module.exports = [

    {
        id: 'voidThunder',
        name: '⚡ Void Thunder',
        nameAr: 'رعد الفراغ',
        bonus2: { critRate: 8 },
        bonus5: { critDamage: 25 }
    },

    {
        id: 'moltenRift',
        name: '🔥 Molten Rift',
        nameAr: 'شق الانصهار',
        bonus2: { attackPercent: 10 },
        bonus5: { bossDamage: 20 }
    },

    {
        id: 'sierraGale',
        name: '🌪 Sierra Gale',
        nameAr: 'عاصفة سييرا',
        bonus2: { dodge: 6 },
        bonus5: { critRate: 15 }
    },

    {
        id: 'celestialLight',
        name: '✨ Celestial Light',
        nameAr: 'النور السماوي',
        bonus2: { hpPercent: 8 },
        bonus5: { shield: 400 }
    },

    {
        id: 'havocEclipse',
        name: '🌑 Havoc Eclipse',
        nameAr: 'كسوف الخراب',
        bonus2: { critDamage: 12 },
        bonus5: { bossDamage: 25 }
    },

    {
        id: 'frostyResolve',
        name: '❄️ Frosty Resolve',
        nameAr: 'عزيمة الصقيع',
        bonus2: { defense: 15 },
        bonus5: { shield: 500 }
    },

    {
        id: 'midnightVeil',
        name: '🖤 Midnight Veil',
        nameAr: 'حجاب منتصف الليل',
        bonus2: { lifesteal: 8 },
        bonus5: { critDamage: 20 }
    },

    {
        id: 'empyreanAnthem',
        name: '👑 Empyrean Anthem',
        nameAr: 'نشيد السماء',
        bonus2: { bossDamage: 10 },
        bonus5: { critDamage: 22 }
    },

    {
        id: 'tidebreakingCourage',
        name: '🌊 Tidebreaking Courage',
        nameAr: 'شجاعة كاسرة الموج',
        bonus2: { hpPercent: 10 },
        bonus5: { reflect: 15 }
    },

    {
        id: 'gustsOfWelkin',
        name: '🍃 Gusts of Welkin',
        nameAr: 'رياح الأثير',
        bonus2: { accuracy: 8 },
        bonus5: { dodge: 15 }
    },

    {
        id: 'flamingClawprint',
        name: '🐾 Flaming Clawprint',
        nameAr: 'بصمة اللهب',
        bonus2: { attackPercent: 8 },
        bonus5: { critDamage: 18 }
    },

    {
        id: 'lingeringTunes',
        name: '🎵 Lingering Tunes',
        nameAr: 'ألحان خالدة',
        bonus2: { hp: 300 },
        bonus5: { hpPercent: 20 }
    }

]
