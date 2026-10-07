// =====================================================================
// models/KingdomGroup.js
// نماذج قروبات المملكة (Tsuki / Yama / Nakama) — مجموعات مستقلة، لا تلمس نموذج Player.
//  - KingdomMember : أي قروب ينتمي له كل لاعب (يتحدّث من أعضاء قروبات الواتس)
//  - RankRewardRun : "تشغيلة" جوائز لفترة واحدة (أسبوعية/يومية) + خطة التوزيع المجمّدة
//  - RankReward    : سجل جائزة واحدة للاعب واحد = إشعار صندوق الهدايا بالموقع
// =====================================================================
const mongoose = require('mongoose')
const { Schema } = mongoose

const memberSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    groups: { type: [String], default: [] },
    updatedAt: { type: Date, default: Date.now }
})

const runSchema = new Schema({
    key: { type: String, required: true, unique: true },   // weekly:2026-10-10 | daily:2026-10-07 | meta:start
    kind: String,
    status: { type: String, default: 'running' },          // running | done
    plan: { type: [Schema.Types.Mixed], default: [] },     // يُحفظ مرة واحدة ولا يُعاد حسابه (حتى لا تتغيّر النتيجة عند إعادة المحاولة)
    createdAt: { type: Date, default: Date.now },
    doneAt: Date
}, { minimize: false })

const rewardSchema = new Schema({
    key: { type: String, required: true, unique: true },   // <period>:<userId> — مفتاح عدم التكرار
    nid: { type: String, required: true, index: true },    // 16 hex — معرّف الإشعار بالموقع
    runKey: { type: String, index: true },
    userId: { type: String, required: true, index: true },
    group: String,
    pos: Number,
    kind: String,                                          // weekly | daily
    rewards: { type: Schema.Types.Mixed },                 // { boxes:{...}, character:{...}|null }
    status: { type: String, default: 'pending' },          // pending | granted
    attempts: { type: Number, default: 0 },
    lastError: String,
    ownerNotified: { type: Boolean, default: false },
    seen: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    grantedAt: Date
}, { minimize: false })

const reg = (name, schema) => mongoose.models[name] || mongoose.model(name, schema)

module.exports = {
    KingdomMember: reg('KingdomMember', memberSchema),
    RankRewardRun: reg('RankRewardRun', runSchema),
    RankReward: reg('RankReward', rewardSchema)
}
