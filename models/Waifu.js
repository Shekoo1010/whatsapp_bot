const mongoose = require('mongoose')

const waifuSchema = new mongoose.Schema({

    anilistId: {
        type: Number,
        default: null,
        sparse: true
    },

    name: String,
    anime: String,

    source: {
        type: String,
        default: 'Anime'
    },

    image: String,

    imageSource: {
        type: String,
        default: 'anilist'
    },

    imageUpdated: {
        type: Boolean,
        default: false
    },

    imageUpdatedAt: {
        type: Date,
        default: null
    },

    gender: {
        type: String,
        default: 'Female'
    },

    rarity: {
        type: String,
        default: 'B'
    },

    value: {
        type: Number,
        default: 100
    },

    likes: {
        type: Number,
        default: 0
    },

    // ⚠️ claims / claimedBy / claimedAt انحذفت من هنا — الملكية صارت
    // معزولة لكل قروب عبر موديل WaifuClaim (waifuId + groupId + userId)
    // بدل ملكية عامة واحدة لكل شخصية بكل القروبات. هذا الموديل الآن
    // يمثّل بس "القالب" الثابت للشخصية (اسم/أنمي/ندرة/قيمة/صورة).

    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('Waifu', waifuSchema)
