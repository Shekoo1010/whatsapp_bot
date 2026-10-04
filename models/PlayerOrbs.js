const mongoose = require('mongoose')
const { DAILY_MISSIONS } = require('../systems/orbConfig')

// نخزّن الأورب في collection مستقلة عن Player:
// - ما نلمس Player schema الحالي
// - ما يصير تعارض مع player.save() الموجود بكل أوامر البوت

const progressShape = {}
const doneShape = {}
for (const m of DAILY_MISSIONS) {
    progressShape[m.key] = { type: Number, default: 0 }
    doneShape[m.key] = { type: Boolean, default: false }
}

const schema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },

    orbs: { type: Number, default: 0, min: 0 },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },

    // الضمان (يحفظ بين البنرات)
    pity: { type: Number, default: 0 },
    guaranteedFeatured: { type: Boolean, default: false },
    totalBannerPulls: { type: Number, default: 0 },

    // مهام اليوم
    missionDate: { type: String, default: '' },
    missionProgress: progressShape,
    missionDone: doneShape,

    // آخر السحبات
    history: {
        type: [{
            name: String,
            rarity: String,
            featured: Boolean,
            pityAt: Number,
            banner: String,
            at: { type: Date, default: Date.now }
        }],
        default: []
    }
}, { timestamps: true, minimize: false })

module.exports = mongoose.models.PlayerOrbs || mongoose.model('PlayerOrbs', schema)
