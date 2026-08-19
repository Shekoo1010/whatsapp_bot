const mongoose = require("mongoose")

const TradeSchema = new mongoose.Schema({

    // صاحب العرض
    ownerId: {
        type: String,
        required: true,
        index: true
    },

    ownerName: {
        type: String,
        default: ""
    },


    offeredCharacterName: {
        type: String,
        required: true
    },

    offeredCharacterPower: {
        type: Number,
        default: 0
    },

    offeredCharacterImage: {
        type: String,
        default: ""
    },

    // الشخصيات المطلوبة
    wantedCharacters: {
        type: [String],
        default: []
    },

    // حالة العرض
status: {
    type: String,
    enum: [
        "active",
        "processing",
        "completed",
        "cancelled"
    ],
    default: "active"
},

    // من نفذ التبديل
    acceptedBy: {
        type: String,
        default: null
    },

    acceptedAt: {
        type: Number,
        default: 0
    },

    createdAt: {
        type: Number,
        default: Date.now
    }
})
TradeSchema.index({
    ownerId: 1,
    status: 1
})

// ⚡ يسرّع .عرض_انتقال/.قبول_انتقال/.حذف_انتقال — هذي تفلتر بـ status
// لوحده (بدون ownerId)، فالإندكس المركب فوق ما يفيدها بكفاءة
TradeSchema.index({
    status: 1,
    createdAt: -1
})

module.exports = mongoose.model(
    "Trade",
    TradeSchema
)
