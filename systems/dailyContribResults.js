// =====================================================================
// systems/dailyContribResults.js
// 🏆 نتيجة جوائز المساهمات اليومية (الزعيم) — تُحفظ بالقاعدة وتُعرض بالموقع
// عند فتح صفحة اللاعب (نفس نافذة الهدايا) بدل إرسالها برسالة واتساب.
//
// - index.js يستدعي saveResult() عند توزيع الجوائز (الساعة 22:00 الرياض)
// - characterSite.js يستدعي getUnseenPayloads() عند فتح الصفحة،
//   و markSeen() عند ضغط "استلام" (عبر /gift/ack)
// =====================================================================

const crypto = require('crypto')
const mongoose = require('mongoose')

const KEEP_DAYS = 30        // حذف النتائج الأقدم من هذه المدة
const SHOW_DAYS = 3         // أقدم نتيجة تُعرض للاعب لو ما فتح الموقع
const SHOW_TO_NON_CONTRIBUTORS = true // true: كل لاعب مسجّل دخول يشوف القائمة، false: المساهمون فقط

const schema = new mongoose.Schema({
    date: { type: String, unique: true, index: true }, // YYYY-MM-DD (توقيت الرياض)
    ackId: { type: String, index: true },              // 16 hex — نفس صيغة معرّفات صندوق الهدايا
    at: { type: Number, index: true },
    top: [{
        _id: false,
        userId: String, name: String, damage: Number, money: Number,
        boxes: Number, charName: String
    }],
    rest: { _id: false, count: Number, money: Number },
    killers: { _id: false, hits: Number, names: [String], money: Number, boxes: Number },
    entries: [{
        _id: false,
        userId: String,
        roles: [String],           // top | rest | killer
        rank: Number,              // 1..3 لأفضل 3
        damage: Number,
        lastHits: Number,
        money: Number,             // مجموع المال اللي أخذه
        boxes: Number,             // صناديق SSS High
        chars: [{ _id: false, name: String, rarity: String }]
    }],
    seenBy: [String]
}, { minimize: false })

const Model = mongoose.models.DailyContribResult || mongoose.model('DailyContribResult', schema)

function makeAckId(date) {
    return crypto.createHash('sha1').update('contrib:' + date).digest('hex').slice(0, 16)
}

// يحفظ نتيجة اليوم (مرة وحدة لكل تاريخ — لو انحفظت من قبل ما تتكرر)
async function saveResult({ date, top, rest, killers, entries }) {
    const doc = {
        date,
        ackId: makeAckId(date),
        at: Date.now(),
        top: top || [],
        rest: rest || { count: 0, money: 0 },
        killers: killers || { hits: 0, names: [], money: 0, boxes: 0 },
        entries: entries || [],
        seenBy: []
    }
    await Model.updateOne({ date }, { $setOnInsert: doc }, { upsert: true })
    Model.deleteMany({ at: { $lt: Date.now() - KEEP_DAYS * 86400000 } }).catch(() => {})
}

// يجهّز بيانات آمنة للعرض بالمتصفح (كل لاعب يشوف "هديتك" الخاصة فيه فقط)
function toPayload(doc, userId) {
    const mine = (doc.entries || []).find(e => e.userId === userId) || null
    const hasAny = (doc.top || []).length || (doc.rest && doc.rest.count) || (doc.killers && doc.killers.hits)
    return {
        kind: 'contrib',
        id: doc.ackId,
        date: doc.date,
        at: doc.at,
        color: '#f0c04a',
        empty: !hasAny,
        top: (doc.top || []).map((t, i) => ({
            rank: i + 1, name: String(t.name || ''), damage: Number(t.damage) || 0,
            money: Number(t.money) || 0, boxes: Number(t.boxes) || 0, charName: String(t.charName || '')
        })),
        rest: { count: Number(doc.rest && doc.rest.count) || 0, money: Number(doc.rest && doc.rest.money) || 0 },
        killers: {
            hits: Number(doc.killers && doc.killers.hits) || 0,
            names: ((doc.killers && doc.killers.names) || []).map(String),
            money: Number(doc.killers && doc.killers.money) || 0,
            boxes: Number(doc.killers && doc.killers.boxes) || 0
        },
        mine: mine ? {
            roles: (mine.roles || []).map(String),
            rank: Number(mine.rank) || 0,
            damage: Number(mine.damage) || 0,
            lastHits: Number(mine.lastHits) || 0,
            money: Number(mine.money) || 0,
            boxes: Number(mine.boxes) || 0,
            chars: (mine.chars || []).map(c => ({ name: String(c.name || ''), rarity: String(c.rarity || '') }))
        } : null
    }
}

// النتائج غير المستلمة لهذا اللاعب (الأقدم أولاً)
async function getUnseenPayloads(userId) {
    const docs = await Model.find({
        at: { $gte: Date.now() - SHOW_DAYS * 86400000 },
        seenBy: { $ne: userId }
    }).sort({ at: 1 }).limit(3).lean()
    return docs
        .map(d => toPayload(d, userId))
        .filter(p => SHOW_TO_NON_CONTRIBUTORS || p.mine)
}

// تعليم النتيجة "مستلمة" (آمنة لأي id — ما تسوي شي لو مو id مساهمات)
async function markSeen(userId, ackId) {
    await Model.updateOne({ ackId }, { $addToSet: { seenBy: userId } })
}

module.exports = { saveResult, getUnseenPayloads, markSeen, makeAckId }
