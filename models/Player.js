const mongoose = require('mongoose')

const PlayerSchema = new mongoose.Schema({

    userId: {
        type: String,
        required: true,
        unique: true
    },

    // =========================
    // 🔁 نظام حل مشكلة إرسال الرسائل الخاصة عبر @lid
    // =========================
    // الرقم الحقيقي (@s.whatsapp.net) المرافق لهوية اللاعب المخفية (@lid)،
    // يُلتقط تلقائياً من participantAlt أول ما يكتب اللاعب أي رسالة بالقروب.
    // يُستخدم عند إرسال رسائل خاصة له (.رسالة / .تبرع / .اهداء) بدل الـ lid مباشرة.
    phoneJid: {
        type: String,
        default: null
    },

    name: {
    type: String,
    default: ""
},

// =========================
// USERNAME SYSTEM (نظام اليوزر)
// =========================
// اليوزرنيم يُحفظ بحروف صغيرة (lowercase) عشان ما تكون حساسة لحالة الأحرف
// (موساشي بالإنجليزي أو الأحرف الكبيرة/الصغيرة تعتبر نفس اليوزر).
username: {
    type: String,
    default: null,
    unique: true,
    sparse: true // يسمح لأكثر من لاعب يكون null بنفس الوقت بدون تعارض unique
},

    // =========================
// BASIC
// =========================

pulls: {
    type: Number,
    default: 5
},

sssPity: {
    type: Number,
    default: 0
},

bannerPity: {
    type: Number,
    default: 0
},

bannerParticipated: {
    type: Boolean,
    default: false
},

towerTickets: {
    type: Number,
    default: 0
},
lastReset: {
    type: Number,
    default: Date.now
},

    characters: {
        type: Array,
        default: []
    },

    // =========================
    // 🖼️ GALLERY SYSTEM (نظام المعرض)
    // =========================
    // يخزن أسماء الشخصيات المختارة فقط (حتى 10)؛ التصميم يجيب أحدث
    // نسخة من player.characters وقت التوليد — راجع systems/gallerySystem.js
    gallery: {
        type: [String],
        default: []
    },

    shards: {
    type: Map,
    of: Number,
    default: {}
},
    
    maxCharacters: {
    type: Number,
    default: 30
},
    clanStorageBonus: {
    type: Number,
    default: 0
},

clanStorageExpire: {
    type: Number,
    default: 0
},

    // =========================
// HP SYSTEM (PvP CORE)
// =========================
hp: { type: Number, default: 10000 },
maxHp: { type: Number, default: 10000 },

critRate: { type: Number, default: 5 },
critDamage: { type: Number, default: 50 },

dodge: { type: Number, default: 3 },

defense: { type: Number, default: 0 },
accuracy: { type: Number, default: 100 },

shield: { type: Number, default: 0 },
lifesteal: { type: Number, default: 0 },

xp: { type: Number, default: 0 },
level: { type: Number, default: 1 },

money: { type: Number, default: 0 },

// 🏆 إجمالي المال المكتسب مدى الحياة (لإنجاز الثروة) — يزيد من addMoney فقط، لا ينقص أبداً
totalEarnedMoney: { type: Number, default: 0 },

// 🏆 إجمالي عدد السحوبات مدى الحياة (لإنجاز السحب)
totalPulls: { type: Number, default: 0 },

// 🏆 إجمالي عدد الصناديق المفتوحة مدى الحياة (لإنجاز فتح الصناديق)
boxesOpened: { type: Number, default: 0 },

// =========================
// BANK SYSTEM
// =========================

bank: {

    debt: {
        type: Number,
        default: 0
    },

    loanMoney: {
        type: Number,
        default: 0
    },

    spentLoan: {
        type: Number,
        default: 0
    },

    borrowedToday: {
        type: Boolean,
        default: false
    },

    lastBorrowDate: {
        type: String,
        default: ""
    }

},

// =========================
// CLAN SYSTEM
// =========================

clanId: {
    type: String,
    default: null
},

clanCooldown: {
    type: Number,
    default: 0
},

clanCoins: {
    type: Number,
    default: 0
},

clanShop: {
    type: Object,
    default: {}
},

renameClanTicket: {
    type: Number,
    default: 0
},

clanStorageBonus: {
    type: Number,
    default: 0
},

clanStorageExpire: {
    type: Number,
    default: 0
},

pendingClanLeave: {
    type: Number,
    default: null
},

// =========================
// SHIP SYSTEM
// =========================

shipId: {
    type: String,
    default: null
},

shipCooldown: {
    type: Number,
    default: 0
},

shipCoins: {
    type: Number,
    default: 0
},

// =========================
// SHIP BOSS COMBAT (دم اللاعب الخاص بمعارك زعيم السفينة)
// =========================
shipCombatHp: {
    type: Number,
    default: 0
},

shipCombatMaxHp: {
    type: Number,
    default: 0
},

// يطابق ship.bossSessionId الحالي — لو اختلف نصفّر الدم (معركة جديدة)
shipCombatSessionId: {
    type: Number,
    default: 0
},

// وقت (ms) اللي بعده يقدر اللاعب يهاجم زعيم السفينة من جديد بعد ما "مات"
shipDeathUntil: {
    type: Number,
    default: 0
},

shipShop: {
    type: Object,
    default: {}
},

renameShipTicket: {
    type: Number,
    default: 0
},

shipStorageBonus: {
    type: Number,
    default: 0
},

shipStorageExpire: {
    type: Number,
    default: 0
},

pendingShipLeave: {
    type: Number,
    default: null
},
    
    // =========================
    // PvP SYSTEM
    // =========================
    mmr: { type: Number, default: 1000 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },

    rank: {
    type: String,
    default: "برونزي"
},

// نظام الرانك الجديد (خاص بـ .مضاربة و .تحدي فقط)
rankPoints: {
    type: Number,
    default: 0
},

rankTier: {
    type: String,
    default: "مبتدئ"
},

rankWins: {
    type: Number,
    default: 0
},

rankLosses: {
    type: Number,
    default: 0
},

titles: {
    type: [String],
    default: []
},

favoriteCharacter: {
    type: String,
    default: null
},

favoriteExpires: {
    type: Number,
    default: 0
},

favoriteObtained: {
    type: Number,
    default: 0
},

lastPvP: {
    type: Number,
    default: 0
},

    skillCooldown: { type: Number, default: 0 },
ultimateCooldown: { type: Number, default: 0 },

    // =========================
// DAILY SYSTEM
// =========================

fights: {
    type: Number,
    default: 5
},

lastFightReset: {
    type: Number,
    default: Date.now
},

// =========================
// NORMAL FIGHT SYSTEM
// =========================

normalFights: {
    type: Number,
    default: 5
},

lastNormalFightReset: {
    type: Number,
    default: Date.now
},

// =========================
// BOSS SYSTEM
// =========================

bossDamage: {
    type: Number,
    default: 0
},

totalBossDamage: {
    type: Number,
    default: 0
},

bossHits: {
    type: Number,
    default: 0
},

lastBossAttack: {
    type: Number,
    default: 0
},

// =========================
// RAID SYSTEM
// =========================

lastRaidAttack: {
    type: Number,
    default: 0
},

bossHp: {
    type: Number,
    default: 0
},

bossMaxHp: {
    type: Number,
    default: 0
},

bossDead: {
    type: Boolean,
    default: false
},

bossRespawn: {
    type: Date,
    default: null
},

// =========================
// KURAMA SYSTEM (وحش كوراما - مستقل عن الزعيم)
// =========================

kuramaHp: {
    type: Number,
    default: 0
},

kuramaMaxHp: {
    type: Number,
    default: 0
},

kuramaDead: {
    type: Boolean,
    default: false
},

kuramaRespawn: {
    type: Date,
    default: null
},

// =========================
// JUUBI SYSTEM (وحش الجوبي - مستقل عن الزعيم)
// =========================

juubiHp: {
    type: Number,
    default: 0
},

juubiMaxHp: {
    type: Number,
    default: 0
},

juubiDead: {
    type: Boolean,
    default: false
},

juubiRespawn: {
    type: Date,
    default: null
},

    // =========================
    // TOWER SYSTEM
    // =========================
    towerFloor: { type: Number, default: 1 },

    usedCharacters: {
        type: Array,
        default: []
    },

    towerCompleted: {
        type: Boolean,
        default: false
    },

// 🏆 مستويات تم استلام مكافآتها بالفعل (يمنع تكرار استلام المكافأة لنفس المستوى)
rewardedLevels: {
    type: [Number],
    default: []
},

claimedLevelRewards: {
    type: [Number],
    default: []
},

// =========================
// BONUSES (PvP Boosts)
// =========================
attackBonus: { type: Number, default: 0 },
defenseBonus: { type: Number, default: 0 },
hpBonus: { type: Number, default: 0 },
speedBonus: { type: Number, default: 0 },

critRateBonus: { type: Number, default: 0 },
critDamageBonus: { type: Number, default: 0 },
critBonus: { type: Number, default: 0 },

dodgeBonus: { type: Number, default: 0 },

accuracyBonus: { type: Number, default: 0 },
shieldBonus: { type: Number, default: 0 },

lifestealBonus: { type: Number, default: 0 },

reflectBonus: { type: Number, default: 0 },

bossDamageBonus: { type: Number, default: 0 },

specialAbilities: {
    type: [String],
    default: []
},


    // =========================
    // SHOP SYSTEM
    // =========================
    shop: {
        items: {
            type: Array,
            default: []
        },
        lastRefresh: {
            type: Number,
            default: 0
        }
    },

// =========================
// BEAST SYSTEM
// =========================

eggTickets: {
    type: Number,
    default: 0
},

// عدد البيوض التي يملكها اللاعب
beastEggs: {
    type: Number,
    default: 0
},

// الوحوش المملوكة
ownedBeasts: {
    type: [String],
    default: []
},

// الوحش المجهز حالياً
equippedBeast: {
    type: String,
    default: null
},

// عدد البيوض المفتوحة
beastEggsOpened: {
    type: Number,
    default: 0
},

// عدد مرات المشاركة بقتل الوحوش العالمية
beastKills: {
    type: Number,
    default: 0
},
    beastCollection: {
    type: Number,
    default: 0
},

// =========================
// 🐾 COMPANION SYSTEM (نظام الرفيق) — غير قتالي، منفصل عن BEAST SYSTEM
// =========================

// عدد بيوض الرفيق غير المفقوسة (تُشترى من .شراء_وحش رفيق)
companionEggs: {
    type: Number,
    default: 0
},

// رفيق واحد فقط بنفس الوقت — لو باعه يقدر يربّي رفيق ثاني من جديد
companion: {

    key: {
        type: String, // مثلاً 'cat', 'dog', 'sonic'...
        default: null
    },

    customName: {
        type: String,
        default: null
    },

    level: {
        type: Number,
        default: 0
    },

    foodProgress: {
        type: Number,
        default: 0
    },

    obtainedAt: {
        type: Number,
        default: null
    }

},

// رصيد طعام الرفيق (يُستهلك بأمر الإطعام)
companionFood: {
    type: Number,
    default: 0
},

// تاريخ آخر يوم اشترى فيه طعام من المتجر الشخصي + عدد مرات الشراء اليوم
// (يتصفر يومياً الساعة 12ص بتوقيت السعودية — نفس منطق dailyMissions.lastReset)
companionShop: {

    lastReset: {
        type: String,
        default: ''
    },

    buysToday: {
        type: Number,
        default: 0
    }

},

    // =========================
// PvP System
// =========================

pvpTeam: {
    type: Array,
    default: []
},

pvpWins: {
    type: Number,
    default: 0
},

pvpLosses: {
    type: Number,
    default: 0
},

pvpFights: {
    type: Number,
    default: 5
},

lastPvpReset: {
    type: Number,
    default: 0
},

    // =========================
// BRAWL SYSTEM (المضاربة)
// =========================

brawlFights: {
    type: Number,
    default: 5
},

lastBrawlReset: {
    type: Number,
    default: 0
},

pendingBrawl: {
    type: Object,
    default: null
},

brawlWins: {
    type: Number,
    default: 0
},

brawlLosses: {
    type: Number,
    default: 0
},
    
// =========================
// KINGDOM RAID SYSTEM
// =========================

kingdomRaid: {

    stage: {
        type: Number,
        default: 0
    },

    usedCharacters: {
        type: Array,
        default: []
    },

    lastReset: {
        type: String,
        default: ''
    }

},

// 🏆 إجمالي مراحل الغزو المكتملة مدى الحياة (لإنجاز غزو الممالك)
// مختلف عن kingdomRaid.stage اللي يتصفّر يومياً — هذا العداد لا يتصفّر أبداً
kingdomTotalStages: {
    type: Number,
    default: 0
},

    // =========================
// EVENTS SYSTEM
// =========================

eventWins: {
    type: Number,
    default: 0
},

quickShotWins: {
    type: Number,
    default: 0
},

luckyNumberWins: {
    type: Number,
    default: 0
},

lastEventReward: {
    type: Number,
    default: 0
},

// =========================
// DAILY MISSIONS
// =========================

dailyMissions: {

    login: {
        type: Boolean,
        default: false
    },

    wins: {
        type: Number,
        default: 0
    },

    bossKills: {
        type: Number,
        default: 0
    },

    pulls: {
        type: Number,
        default: 0
    },

    gotSSS: {
        type: Boolean,
        default: false
    },

    gotLegendary: {
        type: Number,
        default: 0
    },

    claimed: {
        type: Boolean,
        default: false
    },

    lastReset: {
        type: String,
        default: ''
    }

},

dailyReward: {

    lastClaim: {
        type: String,
        default: ''
    }

},

// 🏆 سلسلة المواظبة اليومية الحالية والأفضل (لإنجاز المواظبة اليومية)
dailyStreak: {
    type: Number,
    default: 0
},

dailyStreakBest: {
    type: Number,
    default: 0
},

    
// =========================
// BOXES
// =========================
boxes: {

    // Character Boxes
    basic: {
        type: Number,
        default: 0
    },

    rare: {
        type: Number,
        default: 0
    },

    epic: {
        type: Number,
        default: 0
    },

    legendary: {
        type: Number,
        default: 0
    },

    // SSS Boxes
    sss_chance: {
        type: Number,
        default: 0
    },

    sss_high: {
        type: Number,
        default: 0
    }

},

// =========================
// 🌍 WORLDS SYSTEM (نظام العوالم)
// =========================

world: {
    type: String,
    default: null
},

worldPoints: {
    type: Number,
    default: 0
},

// =========================
// 🌌 OMEGA EVOLUTION SYSTEM (تطوير أوميقا Ω)
// =========================

omegaEvolutions: {
    type: Number,
    default: 0
},

// =========================
// 🏆 ACHIEVEMENTS SYSTEM (نظام الإنجازات)
// =========================

achievements: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
},

// نقطة البداية لكل فئة إنجاز وقت آخر تصفير
// (التقدم المعروض = القيمة الحالية - القيمة هنا)
achievementBaseline: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
},

// =========================
// 🔗 FUSION SYSTEM (نظام الدمج)
// =========================

totalMerges: {
    type: Number,
    default: 0
},

// =========================
// 👑 DAILY BOSS CONTRIBUTION (مساهمات الزعيم اليومية)
// =========================

dailyBossDamage: {
    type: Number,
    default: 0
},

dailyBossHits: {
    type: Number,
    default: 0
},

dailyLastHits: {
    type: Number,
    default: 0
},

// =========================
// 🌀 DOMAIN SYSTEM (نظام الدومينات)
// =========================

stamina: {
    type: Number,
    default: 150
},

staminaUpdatedAt: {
    type: Number,
    default: Date.now
},

domainTeams: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
},

// =========================
// 🎐 ECHO SYSTEM (نظام الإيكوز)
// =========================

// حقيبة قطع الإيكو الغير مجهزة (القطع المجهزة تُخزّن داخل character.echoes مباشرة)
inventory: {
    type: Array,
    default: []
},

// سعة حقيبة الإيكوز (افتراضياً 40 قطعة)
maxInventory: {
    type: Number,
    default: 40
},

// 🎼 تيونر الصدى — مادة ترقية قطع الإيكو (تُمنح 5 لكل فوز بدومين)
echoTuners: {
    type: Number,
    default: 0
}

})

PlayerSchema.methods.addMoney = async function(amount) {

    amount = Number(amount)

    if (!amount || amount <= 0)
        return 0

    // 🐱 بونص رفيق القط — نسبة زيادة على كل مال مكتسب (يبدأ من مستوى 1)
    if (this.companion && this.companion.key === 'cat' && (this.companion.level || 0) >= 1) {

        const companionsData = require('../systems/companionsData')

        const bonusPercent =
            companionsData.getCompanionBonus('cat', this.companion.level)

        amount = amount * (1 + bonusPercent / 100)
    }

    // 🏆 المبلغ الأصلي المكتسب قبل أي اقتطاع لسداد الدين
    // يُستخدم لإنجاز الثروة عشان يحسب من أي مصدر مال بالبوت تلقائياً
    const earnedAmount = amount

    const { repayDebt } = require("../bankSystem/repay")

    amount = await repayDebt(this, amount)

    this.money = (this.money || 0) + amount

    this.totalEarnedMoney =
        (this.totalEarnedMoney || 0) + earnedAmount

    await this.save()

    return amount
}

module.exports = mongoose.model('Player', PlayerSchema)
