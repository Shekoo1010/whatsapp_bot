const mongoose = require("mongoose")

// =========================================================
// نموذج حرب السفن (ShipWar) — بديل نموذج حرب العشائر القديم
// mode: "member" = مبارزات 1 ضد 1 (نفس نظام العشائر القديم)
//       "crew"   = مجموع قوة الطاقم الكامل ضد الطاقم الكامل
// =========================================================

const shipWarSchema = new mongoose.Schema({

    warId: {
        type: String,
        unique: true,
        required: true
    },

    attackerShip: {
        type: String,
        required: true
    },

    defenderShip: {
        type: String,
        required: true
    },

    attackerCaptain: {
        type: String,
        required: true
    },

    defenderCaptain: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: [
            "pending",
            "accepted",
            "started",
            "finished",
            "rejected",
            "expired"
        ],
        default: "pending"
    },

    mode: {
        type: String,
        enum: [
            "member",
            "crew"
        ],
        default: "member"
    },

    chatId: {
        type: String,
        default: null
    },

    currentRound: {
        type: Number,
        default: 0
    },

    rounds: {
        type: Array,
        default: []
    },

    attackerScore: {
        type: Number,
        default: 0
    },

    defenderScore: {
        type: Number,
        default: 0
    },

    winnerShip: {
        type: String,
        default: null
    },

    rewards: {

        money: {
            type: Number,
            default: 0
        },

        shipCoins: {
            type: Number,
            default: 0
        },

        shipXp: {
            type: Number,
            default: 0
        },

        rating: {
            type: Number,
            default: 0
        }

    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    expiresAt: {
        type: Date,
        default: () =>
            new Date(Date.now() + 60 * 1000)
    }

})

module.exports = mongoose.model(
    "ShipWar",
    shipWarSchema
)
