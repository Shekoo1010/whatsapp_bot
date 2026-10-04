const mongoose = require('mongoose')

const schema = new mongoose.Schema({
    voteId: { type: String, required: true },   // تاريخ الأحد الذي فتح فيه التصويت
    userId: { type: String, required: true },
    choice: { type: Number, required: true, min: 1, max: 3 },
    createdAt: { type: Date, default: Date.now }
})

schema.index({ voteId: 1, userId: 1 }, { unique: true })

// الأصوات تُحذف تلقائياً بعد 3 أيام (التصويت نفسه يُقبل 24 ساعة فقط)
schema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * 24 * 3600 })

module.exports = mongoose.models.BannerVote || mongoose.model('BannerVote', schema)
