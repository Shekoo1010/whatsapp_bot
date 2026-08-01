const mongoose = require("mongoose")

const clanWarSchema = new mongoose.Schema({

    warId: {
        type: String,
        unique: true,
        required: true
    },

    attackerClan: {
        type: String,
        required: true
    },

    defenderClan: {
        type: String,
        required: true
    },

    attackerLeader: {
        type: String,
        required: true
    },

    defenderLeader: {
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
        "power"
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

    winnerClan: {
        type: String,
        default: null
    },

    rewards: {

        money: {
            type: Number,
            default: 0
        },

        clanCoins: {
            type: Number,
            default: 0
        },

        clanXp: {
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
    "ClanWar",
    clanWarSchema
)
