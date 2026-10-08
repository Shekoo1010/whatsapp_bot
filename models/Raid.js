const mongoose = require("mongoose")

const RaidSchema = new mongoose.Schema({

    // =========================
    // حالة الرايد
    // =========================

    active: {
        type: Boolean,
        default: false
    },

    // =========================
    // معلومات الرايد
    // =========================

    anime: {
        type: String,
        default: ""
    },

    kingdom: {
        type: String,
        default: ""
    },

    bossName: {
        type: String,
        default: ""
    },

    bossImage: {
        type: String,
        default: ""
    },

    level: {
        type: Number,
        default: 1
    },

    // =========================
    // صحة الزعيم
    // =========================

    hp: {
        type: Number,
        default: 0
    },

    maxHp: {
        type: Number,
        default: 0
    },

    bossAttack: {
        type: Number,
        default: 0
    },

    bossDefense: {
        type: Number,
        default: 0
    },

    bossCritRate: {
    type: Number,
    default: 10
},
    passive: {
    type: String,
    default: ""
},

passiveValue: {
    type: Number,
    default: 0
},

rewardMultiplier: {
    type: Number,
    default: 1
},

difficulty: {
    type: Number,
    default: 1
},

    // =========================
    // مراحل الزعيم
    // =========================

    currentPhase: {
        type: Number,
        default: 1
    },

    phase2: {
        type: Boolean,
        default: false
    },

    phase3: {
        type: Boolean,
        default: false
    },

    // =========================
    // قدرات المملكة
    // =========================

    kingdomAbility: {
        type: String,
        default: ""
    },

    kingdomSkillUsed: {
        type: Number,
        default: 0
    },

    // =========================
    // قدرات الزعيم
    // =========================

    bossAbility: {
        type: String,
        default: ""
    },

    bossSkillUsed: {
        type: Number,
        default: 0
    },

    // =========================
    // الإحصائيات
    // =========================

    totalDamage: {
        type: Number,
        default: 0
    },

    totalHits: {
        type: Number,
        default: 0
    },

    // كائن حر (Mixed): مفاتيح اللاعبين فيها نقاط (@s.whatsapp.net)
    // والـ Map يرفضها. التعديل عليه يحتاج markModified('damageMap')
    damageMap: {
        type: Object,
        default: {}
    },

    // =========================
    // التوقيت
    // =========================

    startedAt: {
        type: Number,
        default: 0
    },

    endsAt: {
        type: Number,
        default: 0
    },

    endedAt: {
        type: Number,
        default: 0
    },

    // =========================
    // آخر هجمة
    // =========================

    lastAttack: {
        type: Number,
        default: 0
    }

})

module.exports = mongoose.model(
    "Raid",
    RaidSchema
)
