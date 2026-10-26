'use strict'
// =====================================================================
// 🚀 الأكثر نمواً — ترتيب أسبوعي بالقوة المكتسبة (وليس مجموع القوة)
//
// الأسبوع: من الأحد 12:00 ص إلى الأحد القادم 12:00 ص بتوقيت السعودية (UTC+3 ثابت)
//
// خفيف على السيرفر (ريندر مجاني):
//  • لا يوجد حساب جديد على قاعدة البيانات: نستخدم نفس تجميع "أقوى اللاعبين" المخزّن بالذاكرة
//    (getTotals) ونطرح منه قوة بداية الأسبوع المحفوظة. يعني لا استعلام إضافي ثقيل.
//  • اللوحة تُعاد حسابها فقط عندما يتغيّر ذلك التجميع (snap.at)، غير كذا تُرجع النسخة المخزّنة.
//  • قوة بداية الأسبوع تُحفظ مرة وحدة بالأسبوع (bulkWrite) وتُقرأ للذاكرة مرة وحدة.
//  • المؤقّت دقيقة واحدة وهو مجرد مقارنة رقمين بالذاكرة (بدون قاعدة بيانات) إلا لحظة تبدّل الأسبوع.
//  • لو السيرفر كان نايم لحظة التبدّل، أول طلب (أو أول تشغيل) يكمل التوزيع والتصفير تلقائياً.
//
// الجوائز (صناديق + شخصية SSS للأول): تصل بنفس نافذة "جائزة ترتيب" داخل صندوق الهدايا بالموقع، واللاعب يضغط "استلام".
// التوزيع آمن من التكرار (معرّف ثابت لكل لاعب/أسبوع).
// =====================================================================
const crypto = require('crypto')

const TZ_OFFSET_MS = 3 * 3600 * 1000 // السعودية UTC+3 بدون توقيت صيفي
const DAY = 86400000
const WEEK = 7 * DAY
const BOARD_LIMIT = 30   // أول 30 لاعب بالصفحة
const PRIZE_LIMIT = 15   // المراكز التي تنال جوائز
const GROUP_NAME = 'الأكثر نمواً'
const TOPS_REUSE_MS = 30 * 60 * 1000

// 🎁 نفس جوائز .جوائز_الترتيب (systems/kingdomGroups.js → rewardFor) — المراكز 1–15
const BOX_LABELS = { sss_high: 'SSS High', sss_chance: 'SSS Chance', legendary: 'Legendary', epic: 'Epic', rare: 'Rare' }
const PRIZES = [
    { from: 1, to: 1, boxes: { sss_high: 1, sss_chance: 1 }, sss: true, color: '#35f0b0' },
    { from: 2, to: 2, boxes: { sss_high: 2, legendary: 2 }, color: '#4cc9ff' },
    { from: 3, to: 3, boxes: { sss_high: 1, legendary: 2 }, color: '#c77dff' },
    { from: 4, to: 10, boxes: { legendary: 2, epic: 2 }, color: '#f0c04a' },
    { from: 11, to: 15, boxes: { epic: 2, rare: 2 }, color: '#f0c04a' }
]

const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US')
const prizeFor = pos => PRIZES.find(p => pos >= p.from && pos <= p.to) || null
const boxItems = p => Object.entries(p.boxes || {}).map(([k, v]) => `📦 ${v} × ${BOX_LABELS[k] || k}`)
const prizeItems = p => boxItems(p).concat(p.sss ? ['🎴 شخصية SSS عشوائية'] : [])
function pickSss() {
    try {
        const pool = (ctx && ctx.getSssChars && ctx.getSssChars()) || []
        if (!pool.length) return null
        return JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]))
    } catch (e) { return null }
}
let logReward = () => {}
try { logReward = require('./rewardLog').logReward || logReward } catch (e) { /* السجل اختياري */ }

// رقم الأسبوع = رقم يوم الأحد (من 1970) بتوقيت السعودية
function weekIdOf(now = Date.now()) {
    const days = Math.floor((now + TZ_OFFSET_MS) / DAY)
    const dow = (days + 4) % 7 // 1970-01-01 كان خميس → 0 = الأحد
    return days - dow
}
const weekStartMs = id => id * DAY - TZ_OFFSET_MS
const weekEndMs = id => weekStartMs(id) + WEEK

function dayText(ms) {
    try {
        return new Date(ms).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory', { timeZone: 'Asia/Riyadh', day: 'numeric', month: 'long' })
    } catch (e) {
        return new Date(ms).toISOString().slice(0, 10)
    }
}
const periodText = id => `${dayText(weekStartMs(id))} – ${dayText(weekEndMs(id) - 1)}`

let ctx = null
const state = { week: null, lastWinners: [] }
let rolling = null
let lastFail = 0
let baseCache = null // { week, map }
let board = null
let boardPending = null
let topsCache = null // { key, at, map }
let Base = null
let Meta = null

function init({ Player, getTotals, getSssChars }) {
    if (ctx) return
    ctx = { Player, getTotals, getSssChars }
    const conn = Player.db
    const schemaBase = new (Player.base.Schema)({
        w: { type: Number, required: true },
        u: { type: String, required: true },
        b: { type: Number, default: 0 }
    }, { versionKey: false })
    schemaBase.index({ w: 1, u: 1 }, { unique: true })
    Base = conn.models.WeeklyGrowthBase || conn.model('WeeklyGrowthBase', schemaBase)

    const schemaMeta = new (Player.base.Schema)({
        _id: String,
        weekId: Number,
        distributedWeek: Number,
        lastWinners: { type: Array, default: [] }
    }, { versionKey: false })
    Meta = conn.models.WeeklyGrowthMeta || conn.model('WeeklyGrowthMeta', schemaMeta)

    // مؤقّت خفيف: مقارنة رقمين بالذاكرة فقط
    const t = setInterval(() => { ensureWeek().catch(e => console.error('[weeklyGrowth] tick:', e && e.message || e)) }, 60 * 1000)
    if (t.unref) t.unref()
    const first = setTimeout(() => { ensureWeek().catch(e => console.error('[weeklyGrowth] start:', e && e.message || e)) }, 20 * 1000)
    if (first.unref) first.unref()
}

// ───────────── ترتيب من مجموع القوة الحالي − قوة بداية الأسبوع ─────────────
function rankRows(rows, base) {
    const out = []
    for (const r of rows) {
        const g = (Number(r.total) || 0) - (base.get(r.userId) || 0)
        if (g >= 1) out.push({ r, g })
    }
    out.sort((a, b) => b.g - a.g || (String(a.r._id) < String(b.r._id) ? -1 : 1))
    return out
}

async function loadBase(week) {
    if (baseCache && baseCache.week === week) return baseCache.map
    const docs = await Base.find({ w: week }).select('u b').lean()
    const map = new Map()
    for (const d of docs) map.set(d.u, Number(d.b) || 0)
    baseCache = { week, map }
    return map
}

async function takeSnapshot(week, rows) {
    const ops = []
    const flush = async () => { if (ops.length) { await Base.bulkWrite(ops.splice(0), { ordered: false }) } }
    for (const r of rows) {
        ops.push({ updateOne: { filter: { w: week, u: r.userId }, update: { $setOnInsert: { b: Number(r.total) || 0 } }, upsert: true } })
        if (ops.length >= 1000) await flush()
    }
    await flush()
}

async function grantPrize(userId, pos, week) {
    const p = prizeFor(pos)
    if (!p) return false
    const id = crypto.createHash('sha1').update(`wg:${week}:${userId}`).digest('hex').slice(0, 16)
    const ch = p.sss ? pickSss() : null
    const entry = {
        id, kind: 'reward', group: GROUP_NAME, color: p.color, pos,
        period: periodText(week), items: boxItems(p),
        charName: ch ? String(ch.name || '') : '', charRarity: ch ? String(ch.rarity || '') : '',
        charPower: ch ? Number(ch.power) || 0 : 0, charImage: ch ? String(ch.customImage || ch.image || '') : '',
        at: Date.now(), seen: false
    }
    const col = ctx.Player.collection // نفس أسلوب kingdomGroups: منح ذرّي بدون تحميل المستند
    await col.updateOne({ userId, boxes: null }, { $set: { boxes: {} } }) // يصلح الحقل الناقص أو null
    const inc = {}
    for (const [k, v] of Object.entries(p.boxes || {})) inc['boxes.' + k] = v
    const push = { giftInbox: entry }
    if (ch) push.characters = { ...ch, _id: new ctx.Player.base.Types.ObjectId() }
    // الشرط يمنع التكرار: لو الإشعار موجود مسبقاً ما يتغيّر شي
    const r = await col.updateOne({ userId, 'giftInbox.id': { $ne: id } }, { $inc: inc, $push: push })
    const ok = (r.matchedCount || r.modifiedCount || 0) > 0
    if (ok) {
        try {
            logReward(userId, { src: `الأكثر نمواً — المركز ${pos}`, icon: '🚀', lines: prizeItems(p) })
        } catch (e) { /* السجل اختياري */ }
    }
    return ok
}

async function distribute(prev, rows) {
    const base = await loadBase(prev)
    let winners = []
    if (base.size) {
        const ranking = rankRows(rows, base).slice(0, PRIZE_LIMIT)
        let n = 0
        for (let i = 0; i < ranking.length; i++) {
            if (await grantPrize(ranking[i].r.userId, i + 1, prev)) n++
        }
        winners = ranking.slice(0, 3).map((x, i) => ({
            pos: i + 1,
            who: x.r.username ? '@' + x.r.username : (x.r.name || 'لاعب'),
            gain: x.g
        }))
        console.log(`[weeklyGrowth] week ${prev}: prizes granted ${n}/${ranking.length}`)
    }
    await Meta.updateOne({ _id: 'wg' }, { $set: { distributedWeek: prev, lastWinners: winners } }, { upsert: true })
    state.lastWinners = winners
}

async function rollover(cur) {
    const meta = await Meta.findById('wg').lean()
    const prev = meta ? meta.weekId : null
    state.lastWinners = (meta && meta.lastWinners) || []

    const needDist = prev != null && prev < cur && meta.distributedWeek !== prev
    const haveSnap = prev === cur && !!(await Base.exists({ w: cur }))

    if (needDist || !haveSnap) {
        // تجميع طازج واحد يُستخدم للتوزيع النهائي وللقطة بداية الأسبوع الجديد معاً (بلا فجوة)
        const snap = await ctx.getTotals(true)
        if (needDist) await distribute(prev, snap.rows)
        if (!haveSnap) await takeSnapshot(cur, snap.rows)
    }
    await Meta.updateOne({ _id: 'wg' }, { $set: { weekId: cur } }, { upsert: true })
    state.week = cur
    baseCache = null
    board = null
    Base.deleteMany({ w: { $lt: cur } }).catch(() => {}) // تنظيف الأسابيع القديمة
}

async function ensureWeek() {
    const cur = weekIdOf()
    if (state.week === cur) return
    if (Date.now() - lastFail < 5 * 60 * 1000) return // لا نكرر المحاولة بسرعة لو فشلت
    if (!rolling) {
        rolling = rollover(cur)
            .catch(err => { lastFail = Date.now(); throw err })
            .finally(() => { rolling = null })
    }
    await rolling
}

// ───────────── أفضل شخصية لكل لاعب (للصورة) ─────────────
async function topChars(ids) {
    if (!ids.length) return new Map()
    const key = ids.map(String).join(',')
    if (topsCache && topsCache.key === key && Date.now() - topsCache.at < TOPS_REUSE_MS) return topsCache.map
    const tops = await ctx.Player.aggregate([
        { $match: { _id: { $in: ids } } },
        {
            $addFields: {
                top: {
                    $reduce: {
                        input: '$characters',
                        initialValue: null,
                        in: {
                            $cond: [
                                { $gt: [{ $ifNull: ['$$this.power', 0] }, { $ifNull: ['$$value.power', -1] }] },
                                '$$this',
                                '$$value'
                            ]
                        }
                    }
                }
            }
        },
        {
            $project: {
                _id: 1,
                'top.name': 1, 'top.rarity': 1, 'top.form': 1, 'top.evolutionLevel': 1,
                'top.image': 1, 'top.customImage': 1, 'top.power': 1
            }
        }
    ]).allowDiskUse(true)
    const map = new Map(tops.map(t => [String(t._id), t.top]))
    topsCache = { key, at: Date.now(), map }
    return map
}

// ───────────── اللوحة ─────────────
// ترجع: { v, week, startMs, endMs, list[{userId,name,username,total(=المكتسب),top}], rankMap, count, lastWinners }
async function getBoard() {
    try {
        await ensureWeek()
    } catch (err) {
        if (state.week == null) throw err // أول مرة وفشل: ما عندنا بيانات نعرضها
        console.error('[weeklyGrowth] ensureWeek:', err && err.message || err)
    }
    const snap = await ctx.getTotals()
    if (board && board.v === snap.at && board.week === state.week) return board
    if (boardPending) return boardPending
    boardPending = (async () => {
        try {
            const week = state.week
            const base = await loadBase(week)
            const ranking = rankRows(snap.rows, base)
            const rankMap = new Map()
            ranking.forEach((x, i) => rankMap.set(x.r.userId, { rank: i + 1, gain: x.g }))
            const head = ranking.slice(0, BOARD_LIMIT)
            const tops = await topChars(head.map(x => x.r._id))
            const list = head.map(x => ({
                userId: x.r.userId, name: x.r.name, username: x.r.username, total: x.g,
                top: tops.get(String(x.r._id)) || null
            }))
            board = {
                v: snap.at, snapAt: snap.at, week, startMs: weekStartMs(week), endMs: weekEndMs(week),
                list, rankMap, count: ranking.length, lastWinners: state.lastWinners || []
            }
            return board
        } finally {
            boardPending = null
        }
    })()
    return boardPending
}

function prizeRows() {
    return PRIZES.map(p => ({ from: p.from, to: p.to, color: p.color, items: prizeItems(p) }))
}

module.exports = { init, getBoard, prizeRows, weekIdOf, BOARD_LIMIT, PRIZE_LIMIT, GROUP_NAME }
