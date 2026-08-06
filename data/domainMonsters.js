// =========================
// بيانات دومينات المعدات
// كل دومين مخصص لإسقاط نوع معدة واحد فقط
// =========================

const domains = {

    // =========================
    // دومين 1: الإكسسوار (السوار)
    // =========================
    1: {

        id: 1,
        name: "دومين الأثير",
        emoji: "💍",
        equipType: "accessory",
        equipLabel: "إكسسوار / سوار",

        description: "بوابة أثيرية تسكنها أرواح حارسة السوار الملعون.",

        monsters: [

            {
                name: "روح أثيرية",
                emoji: "👻",
                hp: 1200,
                attack: 180,
                defense: 60
            },

            {
                name: "حارس الأثير",
                emoji: "🌀",
                hp: 1800,
                attack: 220,
                defense: 90
            },

            {
                name: "سيدة السوار",
                emoji: "💫",
                hp: 3000,
                attack: 320,
                defense: 140
            }

        ],

        boxId: "domainAccessoryBox"

    },

    // =========================
    // دومين 2: السلاح
    // =========================
    2: {

        id: 2,
        name: "دومين الفولاذ",
        emoji: "⚔️",
        equipType: "weapon",
        equipLabel: "سلاح",

        description: "حصن حديدي مليء بحراس مسلحين يحمون أسلحة أسطورية.",

        monsters: [

            {
                name: "حارس فولاذي",
                emoji: "🗡️",
                hp: 1500,
                attack: 200,
                defense: 80
            },

            {
                name: "مقاتل الحصن",
                emoji: "⚔️",
                hp: 2100,
                attack: 260,
                defense: 110
            },

            {
                name: "سيد الفولاذ",
                emoji: "🔱",
                hp: 3400,
                attack: 360,
                defense: 160
            }

        ],

        boxId: "domainWeaponBox"

    },

    // =========================
    // دومين 3: الدرع
    // =========================
    3: {

        id: 3,
        name: "دومين الحجر",
        emoji: "🛡️",
        equipType: "armor",
        equipLabel: "درع",

        description: "كهف حجري قديم تحرسه تماثيل حية مدرعة بثقل الجبال.",

        monsters: [

            {
                name: "تمثال حجري",
                emoji: "🗿",
                hp: 2000,
                attack: 160,
                defense: 150
            },

            {
                name: "حارس الكهف",
                emoji: "🛡️",
                hp: 2600,
                attack: 210,
                defense: 200
            },

            {
                name: "ملك الحجر",
                emoji: "👑",
                hp: 4000,
                attack: 300,
                defense: 260
            }

        ],

        boxId: "domainArmorBox"

    }

}

module.exports = domains
