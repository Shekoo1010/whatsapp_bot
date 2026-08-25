const mongoose = require('mongoose')

// ⚠️ ملاحظة: هذا الموديل معاد بناؤه من كل الحقول اللي index.js
// يستخدمها فعليًا على WaifuTrade (ما كان عندي ملف models/WaifuTrade.js
// الأصلي). إذا كان عندك حقول إضافية بالملف الحقيقي (مثلاً timestamps
// مخصصة أو حقول ثانية)، خلها كما هي وبس زِد حقل groupId تحت.
const waifuTradeSchema =
new mongoose.Schema({

    // 🏠 التبادل معزول لكل قروب — نفس شخصين ما يقدرون يكون لهم
    // أكثر من تبادل مفتوح، بس هذا الشرط الآن يتحقق داخل نفس القروب فقط
    groupId: {
        type: String,
        required: true
    },

    user1: {
        type: String,
        required: true
    },

    user2: {
        type: String,
        required: true
    },

    waifu1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Waifu',
        default: null
    },

    waifu2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Waifu',
        default: null
    },

    kakera1: {
        type: Number,
        default: 0
    },

    kakera2: {
        type: Number,
        default: 0
    },

    ready1: {
        type: Boolean,
        default: false
    },

    ready2: {
        type: Boolean,
        default: false
    },

    accepted: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

})

module.exports =
mongoose.model(
    'WaifuTrade',
    waifuTradeSchema
)
