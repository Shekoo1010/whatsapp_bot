const mongoose = require('mongoose')

const waifuPlayerSchema =
new mongoose.Schema({

    userId: {
        type: String,
        required: true
    },

    // 🏠 كل لاعب له سجل منفصل بكل قروب — رصيد الكاكيرا،
    // السحبات، والزوجات كلها معزولة عن باقي القروبات
    groupId: {
        type: String,
        required: true
    },

    rolls: {
        type: Number,
        default: 10
    },

    rollsResetAt: {
        type: Date,
        default: null
    },

    kakera: {
        type: Number,
        default: 0
    },

    favoriteWaifu: {
        type: Number,
        default: null
    },

    wives: {
        type: [String],
        default: []
    }

})

// ⚠️ استبدلت unique القديمة على userId وحده بمفتاح مركّب (userId + groupId)
// عشان نفس اللاعب يقدر يكون له سجل مستقل بكل قروب ينضم له
waifuPlayerSchema.index(
    { userId: 1, groupId: 1 },
    { unique: true }
)

module.exports =
mongoose.model(
    'WaifuPlayer',
    waifuPlayerSchema
)
