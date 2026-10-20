const mongoose = require('mongoose')

const MarketSchema = new mongoose.Schema({

    seller: String,

    character: Object,

    price: {
        type: Number,
        index: true // ⚡ يسرّع .السوق و.شراء (Market.find().sort({price:1}))
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

})

// ⚡ cleanMarket يفلتر بـ createdAt <= (قبل 24 ساعة) بشكل دوري — بدون فهرس يمسح كل العروض
MarketSchema.index({ createdAt: 1 })

module.exports = mongoose.model('Market', MarketSchema)
