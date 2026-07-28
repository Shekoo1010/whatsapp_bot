const mongoose = require("mongoose")

const BankSchema = new mongoose.Schema({

    money: {
        type: Number,
        default: 100000000
    },

    lastReset: {
        type: String,
        default: ""
    }

})

module.exports = mongoose.model("Bank", BankSchema)
