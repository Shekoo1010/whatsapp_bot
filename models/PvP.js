const mongoose = require('mongoose')

const pvpSchema = new mongoose.Schema({

    player1: {
        type: String,
        required: true
    },

    player2: {
        type: String,
        required: true
    },

    hp1: {
        type: Number,
        default: 10000
    },

    hp2: {
        type: Number,
        default: 10000
    },

    shield1: {
        type: Number,
        default: 0
    },

    shield2: {
        type: Number,
        default: 0
    },

    team1: {
        type: Array,
        default: []
    },

    team2: {
        type: Array,
        default: []
    },

    burn: {
        player1: {
            type: Number,
            default: 0
        },
        player2: {
            type: Number,
            default: 0
        }
    },

    poison: {
        player1: {
            type: Number,
            default: 0
        },
        player2: {
            type: Number,
            default: 0
        }
    },

    // عدد الجولات التي لعبها كل لاعب
    player1Turns: {
        type: Number,
        default: 0
    },

    player2Turns: {
        type: Number,
        default: 0
    },

    // آخر جولة استخدم فيها المهارة
    skillTurn1: {
        type: Number,
        default: -99
    },

    skillTurn2: {
        type: Number,
        default: -99
    },

    // آخر جولة استخدم فيها الألتميت
    ultimateTurn1: {
        type: Number,
        default: -99
    },

    ultimateTurn2: {
        type: Number,
        default: -99
    },

    turnCount: {
        type: Number,
        default: 1
    },

    turn: {
        type: String,
        required: true
    },

    active: {
        type: Boolean,
        default: true
    },

    lastMove: {
        type: Date,
        default: Date.now
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

})

// ⚡ الاستعلامات كلها بالشكل { active: true, $or: [{ player1: id }, { player2: id }] }
// ومونجو يحتاج فهرساً لكل فرع من فروع $or، فنفصل فهرسين مركبين بدل فهرس واحد على الثلاثة
pvpSchema.index({ active: 1, player1: 1 })
pvpSchema.index({ active: 1, player2: 1 })

module.exports =
    mongoose.models.PvP ||
    mongoose.model('PvP', pvpSchema)
