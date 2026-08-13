const mongoose = require('mongoose')

// =========================================================
// نموذج السفينة (Ship) — بديل نموذج العشيرة (Clan) القديم
// نفس الحقول القديمة تمامًا + إضافات نظام الرتب والبوس الخاص
// =========================================================

const shipSchema = new mongoose.Schema({

    shipId: {
        type: String,
        unique: true,
        required: true
    },

    name: {
        type: String,
        required: true,
        unique: true
    },

    emoji: {
        type: String,
        default: '🚢'
    },

    // القبطان (نفس leader القديم بالضبط)
    captain: {
        type: String,
        required: true
    },

    members: {
        type: [String],
        default: []
    },

    // =========================
    // نظام الرتب داخل الطاقم
    // =========================
    // القبطان = ship.captain (رتبة تلقائية، لا تُخزَّن هنا)
    // الضباط = يقدر عليهم القبطان يعطيهم صلاحية الدعوة وفتح المتجر
    officers: {
        type: [String],
        default: []
    },

    level: {
        type: Number,
        default: 1
    },

    xp: {
        type: Number,
        default: 0
    },

    nextLevelXp: {
        type: Number,
        default: 1500 // يطابق getRequiredXP(1) الجديدة بـ shipLevel.js
    },

    shopRefresh: {
        type: String,
        default: ''
    },

    // =========================
    // زعيم السفينة الخاص
    // =========================
    bossAvailable: {
        type: Boolean,
        default: false
    },

    bossPurchasedAt: {
        type: Number,
        default: 0
    },

    bossActive: {
        type: Boolean,
        default: false
    },

    bossName: {
        type: String,
        default: ''
    },

    // ترتيب الزعيم الحالي بقائمة BOSSES (0-9) — يُستخدم للدوران التلقائي
    bossIndex: {
        type: Number,
        default: -1
    },

    bossSeries: {
        type: String,
        default: ''
    },

    bossImage: {
        type: String,
        default: ''
    },

    // مُعرّف جلسة القتال الحالية (Date.now() وقت الاستدعاء) — يُستخدم
    // عشان نعرف متى نصفّر "دم" كل لاعب القتالي الخاص بمعركة الزعيم
    bossSessionId: {
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

    bossAttack: {
        type: Number,
        default: 0
    },

    // damage السجل الخاص بكل عضو ضرب البوس (لتوزيع المكافآت)
    bossDamage: {
        type: Map,
        of: Number,
        default: {}
    },

    wins: {
        type: Number,
        default: 0
    },

    losses: {
        type: Number,
        default: 0
    },

    invites: {
        type: [String],
        default: []
    },

    power: {
        type: Number,
        default: 0
    },

    warCooldown: {
        type: Number,
        default: 0
    },

    dailyWars: {
        type: Number,
        default: 5
    },

    lastWarReset: {
        type: String,
        default: ''
    },

    rankPoints: {
        type: Number,
        default: 1000
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    // ملاحظة: متجر السفينة واحد، وكل عضو له حده الأسبوعي الخاص فيه
    // مخزّن بجانب اللاعب نفسه (Player.shipShop) — مو هنا بالسفينة،
    // فما فيه حاجة لأي حقل شراء على مستوى السفينة.

    shipInventoryBonus: {
        type: Map,
        of: Number,
        default: {}
    },

    shipBuffs: {
        type: Object,
        default: {}
    }

})

module.exports = mongoose.model(
    'Ship',
    shipSchema
)
