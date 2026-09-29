const mongoose = require('mongoose')

// 🏰 قلعة اللاعب — مستند واحد لكل لاعب (userId)
const castleSchema = new mongoose.Schema({

    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // مستويات المباني (كلها تبدأ من 1)
    buildings: {
        hall:     { type: Number, default: 1 }, // 🏛️ القاعة الرئيسية
        mine:     { type: Number, default: 1 }, // ⛏️ المناجم
        storage:  { type: Number, default: 1 }, // 📦 المخازن
        barracks: { type: Number, default: 1 }, // ⚔️ الثكنات
        towers:   { type: Number, default: 1 }, // 🗼 الأبراج
        walls:    { type: Number, default: 1 }  // 🧱 الجدران
    },

    // موارد الغارات داخل المخازن (الذهب للبحث، الحديد للتموين، وكلاهما يُنهب)
    gold: { type: Number, default: 1000 },
    iron: { type: Number, default: 500 },

    // الموارد المتجمعة بالمناجم (تنتظر أمر .قلعة_جمع)
    pendingGold: { type: Number, default: 0 },
    pendingIron: { type: Number, default: 0 },

    // آخر وقت حُسب فيه إنتاج المناجم
    lastTick: { type: Date, default: Date.now },

    // الترقية الجارية (وحدة بنفس الوقت)
    upgrade: {
        building: { type: String, default: null },
        toLevel:  { type: Number, default: 0 },
        endsAt:   { type: Date, default: null }
    },

    // 🏆 الكؤوس والدرع
    trophies:    { type: Number, default: 0, index: true },
    shieldUntil: { type: Date, default: null },

    // 👥 الفرق (أسماء الشخصيات — نفس أسلوب ربط الأسلحة بالاسم)
    attackSquad:  { type: [String], default: [] },
    defenseSquad: { type: [String], default: [] },

    // 🎯 الهدف اللي طلع من .قلعة_بحث (محجوز لفترة قصيرة)
    raidTarget: {
        userId:    { type: String, default: null },
        expiresAt: { type: Date, default: null },
        cost:      { type: Number, default: 0 }   // تكلفة البحث (تُرد لو الهدف ما عاد متاح)
    },

    // 📅 الحد اليومي للغارات
    raidsDay:   { type: String, default: '' },
    raidsToday: { type: Number, default: 0 },

    // 📨 سجل الهجمات اللي صارت على هذي القلعة (آخر 10)
    log: {
        type: [{
            at:       { type: Date, default: Date.now },
            by:       String,
            stars:    Number,
            gold:     Number,
            iron:     Number,
            trophies: Number
        }],
        default: []
    },
    unread: { type: Number, default: 0 }

}, { timestamps: true })

module.exports =
    mongoose.models.Castle ||
    mongoose.model('Castle', castleSchema)
