const mongoose = require('mongoose')

const PlayerSchema = new mongoose.Schema({

    userId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
    type: String,
    default: ""
},

    // =========================
// BASIC
// =========================

pulls: {
    type: Number,
    default: 5
},

sssPity: {
    type: Number,
    default: 0
},

bannerPity: {
    type: Number,
    default: 0
},

bannerParticipated: {
    type: Boolean,
    default: false
},

towerTickets: {
    type: Number,
    default: 0
},
lastReset: {
    type: Number,
    default: Date.now
},

    characters: {
        type: Array,
        default: []
    },
    shards: {
    type: Map,
    of: Number,
    default: {}
},
    
    maxCharacters: {
    type: Number,
    default: 30
},
    clanStorageBonus: {
    type: Number,
    default: 0
},

clanStorageExpire: {
    type: Number,
    default: 0
},

    // =========================
// HP SYSTEM (PvP CORE)
// =========================
hp: { type: Number, default: 10000 },
maxHp: { type: Number, default: 10000 },

critRate: { type: Number, default: 5 },
critDamage: { type: Number, default: 50 },

dodge: { type: Number, default: 3 },

defense: { type: Number, default: 0 },
accuracy: { type: Number, default: 100 },

shield: { type: Number, default: 0 },
lifesteal: { type: Number, default: 0 },

xp: { type: Number, default: 0 },
level: { type: Number, default: 1 },

money: { type: Number, default: 0 },

// =========================
// BANK SYSTEM
// =========================

bank: {

    debt: {
        type: Number,
        default: 0
    },

    loanMoney: {
        type: Number,
        default: 0
    },

    spentLoan: {
        type: Number,
        default: 0
    },

    borrowedToday: {
        type: Boolean,
        default: false
    },

    lastBorrowDate: {
        type: String,
        default: ""
    }

},

// =========================
// CLAN SYSTEM
// =========================

clanId: {
    type: String,
    default: null
},

clanCooldown: {
    type: Number,
    default: 0
},

clanCoins: {
    type: Number,
    default: 0
},

clanShop: {
    type: Object,
    default: {}
},

renameClanTicket: {
    type: Number,
    default: 0
},

clanStorageBonus: {
    type: Number,
    default: 0
},

clanStorageExpire: {
    type: Number,
    default: 0
},

pendingClanLeave: {
    type: Number,
    default: null
},
    
    // =========================
    // PvP SYSTEM
    // =========================
    mmr: { type: Number, default: 1000 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },

    rank: {
    type: String,
    default: "برونزي"
},

titles: {
    type: [String],
    default: []
},

favoriteCharacter: {
    type: String,
    default: null
},

favoriteExpires: {
    type: Number,
    default: 0
},

favoriteObtained: {
    type: Number,
    default: 0
},

lastPvP: {
    type: Number,
    default: 0
},

    skillCooldown: { type: Number, default: 0 },
ultimateCooldown: { type: Number, default: 0 },

    // =========================
    // DAILY SYSTEM
    // =========================
    fights: { type: Number, default: 5 },
    lastFightReset: { type: Number, default: Date.now },

// =========================
// BOSS SYSTEM
// =========================

bossDamage: {
    type: Number,
    default: 0
},

totalBossDamage: {
    type: Number,
    default: 0
},

bossHits: {
    type: Number,
    default: 0
},

lastBossAttack: {
    type: Number,
    default: 0
},

// =========================
// RAID SYSTEM
// =========================

lastRaidAttack: {
    type: Number,
    default: 0
},

bossHp: {
    type: Number,
    default: 0
},

bossMaxHp: {
    type: Number,
    default: 0
},

bossDead: {
    type: Boolean,
    default: false
},

bossRespawn: {
    type: Date,
    default: null
},

    // =========================
    // TOWER SYSTEM
    // =========================
    towerFloor: { type: Number, default: 1 },

    usedCharacters: {
        type: Array,
        default: []
    },

    towerCompleted: {
        type: Boolean,
        default: false
    },

// =========================
// BONUSES (PvP Boosts)
// =========================
attackBonus: { type: Number, default: 0 },
defenseBonus: { type: Number, default: 0 },
hpBonus: { type: Number, default: 0 },

critRateBonus: { type: Number, default: 0 },
critDamageBonus: { type: Number, default: 0 },

dodgeBonus: { type: Number, default: 0 },

accuracyBonus: { type: Number, default: 0 },
shieldBonus: { type: Number, default: 0 },

lifestealBonus: { type: Number, default: 0 },

reflectBonus: { type: Number, default: 0 },

bossDamageBonus: { type: Number, default: 0 },

specialAbilities: {
    type: [String],
    default: []
},


    // =========================
    // EQUIPMENT SYSTEM 🔥
    // =========================
    equipment: {
        weapon: { type: Object, default: null },
        armor: { type: Object, default: null },
        accessory: { type: Object, default: null }
    },

    inventory: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
},

    maxInventory: { type: Number, default: 20 },

    // =========================
    // SHOP SYSTEM
    // =========================
    shop: {
        items: {
            type: Array,
            default: []
        },
        lastRefresh: {
            type: Number,
            default: 0
        }
    },

// =========================
// BEAST SYSTEM
// =========================

eggTickets: {
    type: Number,
    default: 0
},

// عدد البيوض التي يملكها اللاعب
beastEggs: {
    type: Number,
    default: 0
},

// الوحوش المملوكة
ownedBeasts: {
    type: [String],
    default: []
},

// الوحش المجهز حالياً
equippedBeast: {
    type: String,
    default: null
},

// عدد البيوض المفتوحة
beastEggsOpened: {
    type: Number,
    default: 0
},

// عدد مرات المشاركة بقتل الوحوش العالمية
beastKills: {
    type: Number,
    default: 0
},
    beastCollection: {
    type: Number,
    default: 0
},

    // =========================
// PvP System
// =========================

pvpTeam: {
    type: Array,
    default: []
},

pvpWins: {
    type: Number,
    default: 0
},

pvpLosses: {
    type: Number,
    default: 0
},

pvpFights: {
    type: Number,
    default: 5
},

lastPvpReset: {
    type: Number,
    default: 0
},

    // =========================
// BRAWL SYSTEM (المضاربة)
// =========================

brawlFights: {
    type: Number,
    default: 5
},

lastBrawlReset: {
    type: Number,
    default: 0
},

pendingBrawl: {
    type: Object,
    default: null
},

brawlWins: {
    type: Number,
    default: 0
},

brawlLosses: {
    type: Number,
    default: 0
},
    
// =========================
// KINGDOM RAID SYSTEM
// =========================

kingdomRaid: {

    stage: {
        type: Number,
        default: 0
    },

    usedCharacters: {
        type: Array,
        default: []
    },

    lastReset: {
        type: String,
        default: ''
    }

},
    // =========================
// EVENTS SYSTEM
// =========================

eventWins: {
    type: Number,
    default: 0
},

quickShotWins: {
    type: Number,
    default: 0
},

luckyNumberWins: {
    type: Number,
    default: 0
},

lastEventReward: {
    type: Number,
    default: 0
},

// =========================
// DAILY MISSIONS
// =========================

dailyMissions: {

    login: {
        type: Boolean,
        default: false
    },

    wins: {
        type: Number,
        default: 0
    },

    bossKills: {
        type: Number,
        default: 0
    },

    pulls: {
        type: Number,
        default: 0
    },

    gotSSS: {
        type: Boolean,
        default: false
    },

    gotLegendary: {
        type: Number,
        default: 0
    },

    claimed: {
        type: Boolean,
        default: false
    },

    lastReset: {
        type: String,
        default: ''
    }

},

dailyReward: {

    lastClaim: {
        type: String,
        default: ''
    }

},

    
// =========================
// BOXES
// =========================
boxes: {

    // Character Boxes
    basic: {
        type: Number,
        default: 0
    },

    rare: {
        type: Number,
        default: 0
    },

    epic: {
        type: Number,
        default: 0
    },

    legendary: {
        type: Number,
        default: 0
    },

    // Equipment Boxes
    rareEquipment: {
        type: Number,
        default: 0
    },

    epicEquipment: {
        type: Number,
        default: 0
    },

    legendEquipment: {
        type: Number,
        default: 0
    },

    mythicalEquipment: {
        type: Number,
        default: 0
    },

    // SSS Boxes
    sss_chance: {
        type: Number,
        default: 0
    },

    sss_high: {
        type: Number,
        default: 0
    }

}

})

module.exports = mongoose.model('Player', PlayerSchema)
