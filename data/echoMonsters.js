// =========================
// 🐉 Echo Monsters (وحوش الإيكو - مصدر أسامي الوحوش لكل عائلة)
// المصدر الوحيد لربط كل عائلة (data/echoFamilies.js) بوحوش حقيقية من لعبة Wuthering Waves
// كل عائلة فيها:
//   cost4 → وحش واحد (بوس/Overlord) — يطيح قطعة كوست 4
//   cost3 → وحشين (Elite) — يطيحون قطعة كوست 3
//   cost1 → وحشين (Common) — يطيحون قطعة كوست 1
// الأسامي مأخوذة فعلياً من Wuthering Waves ومطابقة لعائلتها (Sonata Effect) الأصلية بقد الإمكان
// =========================

module.exports = {

    voidThunder: {
        // ⚡ رعد الفراغ
        cost4: [
            { name: "Thundering Mephis", nameAr: "الرعّاد ميفيس" }
        ],
        cost3: [
            { name: "Violet-Feathered Heron", nameAr: "مالك الحزين البنفسجي" },
            { name: "Flautist", nameAr: "عازف الناي" }
        ],
        cost1: [
            { name: "Havoc Prism", nameAr: "منشور الخراب" },
            { name: "Excarat", nameAr: "إكسكارات" }
        ]
    },

    moltenRift: {
        // 🔥 شق الانصهار
        cost4: [
            { name: "Inferno Rider", nameAr: "فارس الجحيم" }
        ],
        cost3: [
            { name: "Havoc Dreadmane", nameAr: "عرف الرعب" },
            { name: "Viridblaze Saurian", nameAr: "الزاحف الأخضر الملتهب" }
        ],
        cost1: [
            { name: "Fusion Prism", nameAr: "منشور الانصهار" },
            { name: "Lava Larva", nameAr: "يرقة الحمم" }
        ]
    },

    sierraGale: {
        // 🌪 عاصفة سييرا
        cost4: [
            { name: "Feilian Beringal", nameAr: "فيليان بيرينغال" }
        ],
        cost3: [
            { name: "Hoochief Cyclone", nameAr: "هوتشيف الإعصار" },
            { name: "Chaserazor", nameAr: "شفرة المطاردة" }
        ],
        cost1: [
            { name: "Aero Prism", nameAr: "منشور الرياح" },
            { name: "Dwarf Cassowary", nameAr: "الكاسوار القزم" }
        ]
    },

    celestialLight: {
        // ✨ النور السماوي
        cost4: [
            { name: "Jué", nameAr: "جوي، تنين جينزو" }
        ],
        cost3: [
            { name: "Lightcrusher", nameAr: "ساحق النور" },
            { name: "Rocksteady Guardian", nameAr: "الحارس الصخري الثابت" }
        ],
        cost1: [
            { name: "Spectro Prism", nameAr: "منشور الطيف" },
            { name: "Lumiscale Construct", nameAr: "المجسّم اللامع" }
        ]
    },

    havocEclipse: {
        // 🌑 كسوف الخراب
        cost4: [
            { name: "Crownless", nameAr: "بلا تاج" }
        ],
        cost3: [
            { name: "Stonewall Bracer", nameAr: "درع الجدار الحجري" },
            { name: "Roseshroom", nameAr: "عيش الغراب الوردي" }
        ],
        cost1: [
            { name: "Traffic Illuminator", nameAr: "منارة المرور" },
            { name: "Chest Mimic", nameAr: "الصندوق المتنكر" }
        ]
    },

    frostyResolve: {
        // ❄️ عزيمة الصقيع
        cost4: [
            { name: "Sentry Construct", nameAr: "الحارس الآلي" }
        ],
        cost3: [
            { name: "Diurnus Knight", nameAr: "فارس النهار" },
            { name: "Abyssal Gladius", nameAr: "سيف الهاوية" }
        ],
        cost1: [
            { name: "Glacio Prism", nameAr: "منشور الجليد" },
            { name: "Clang Bang", nameAr: "كلانغ بانغ" }
        ]
    },

    midnightVeil: {
        // 🖤 حجاب منتصف الليل
        cost4: [
            { name: "Lorelei", nameAr: "لوريلاي، ملكة الليل" }
        ],
        cost3: [
            { name: "Abyssal Patricius", nameAr: "باتريسيوس الهاوية" },
            { name: "Abyssal Mercator", nameAr: "تاجر الهاوية" }
        ],
        cost1: [
            { name: "Fae Ignis", nameAr: "جنية اللهب" },
            { name: "Nimbus Wraith", nameAr: "شبح الغيمة" }
        ]
    },

    empyreanAnthem: {
        // 👑 نشيد السماء
        cost4: [
            { name: "Hecate", nameAr: "هيكات، ليمبو روندو" }
        ],
        cost3: [
            { name: "Abyssal Patricius", nameAr: "باتريسيوس الهاوية" },
            { name: "Abyssal Gladius", nameAr: "سيف الهاوية" }
        ],
        cost1: [
            { name: "Hocus Pocus", nameAr: "هوكس بوكس" },
            { name: "Cuddle Wuddle", nameAr: "كودل وودل" }
        ]
    },

    tidebreakingCourage: {
        // 🌊 شجاعة كاسرة الموج
        cost4: [
            { name: "Dragon of Dirge", nameAr: "تنين المرثية" }
        ],
        cost3: [
            { name: "Nocturnus Knight", nameAr: "فارس الليل" },
            { name: "Abyssal Mercator", nameAr: "تاجر الهاوية" }
        ],
        cost1: [
            { name: "Chop Chop: Leftless", nameAr: "تشوب تشوب بلا يسار" },
            { name: "Chop Chop: Rightless", nameAr: "تشوب تشوب بلا يمين" }
        ]
    },

    gustsOfWelkin: {
        // 🍃 رياح الأثير
        cost4: [
            { name: "Reminiscence: Fleurdelys", nameAr: "ذكرى: فلوردليس" }
        ],
        cost3: [
            { name: "Pilgrim's Shell", nameAr: "صدفة الحاج" },
            { name: "Sagittario", nameAr: "ساجيتاريو" }
        ],
        cost1: [
            { name: "Gladiator", nameAr: "المصارع" },
            { name: "Chop Chop: Headless", nameAr: "تشوب تشوب بلا رأس" }
        ]
    },

    flamingClawprint: {
        // 🐾 بصمة اللهب
        cost4: [
            { name: "Lioness of Glory", nameAr: "لبؤة المجد" }
        ],
        cost3: [
            { name: "Kerasaur", nameAr: "كيراصور" },
            { name: "Corrosaurus", nameAr: "كوروصور" }
        ],
        cost1: [
            { name: "Sacerdos", nameAr: "ساسيردوس" },
            { name: "Fusion Prism", nameAr: "منشور الانصهار" }
        ]
    },

    lingeringTunes: {
        // 🎵 ألحان خالدة
        cost4: [
            { name: "Mech Abomination", nameAr: "الآلة الملعونة" }
        ],
        cost3: [
            { name: "Chasm Guardian", nameAr: "حارس الهاوية" },
            { name: "Spearback", nameAr: "ظهر الرمح" }
        ],
        cost1: [
            { name: "Bell-Borne Geochelone", nameAr: "السلحفاة حاملة الجرس" },
            { name: "Autopuppet Scout", nameAr: "الكشّاف الآلي" }
        ]
    }

}
