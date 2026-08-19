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

module.exports = mongoose.model('Market', MarketSchema)
