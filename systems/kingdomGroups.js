// =====================================================================
// systems/kingdomGroups.js
// قروبات المملكة: Tsuki 🔆 · Yama ⛰️ · Nakama ⚡
//  1) مزامنة أعضاء كل قروب واتس -> قاعدة البيانات (KingdomMember)
//  2) توب أول 20 لكل قروب (الشخص يظهر بقروب واحد فقط، حسب ترتيب القروبات أدناه)
//  3) جوائز الترتيب الآمنة (مرة واحدة فقط + إعادة محاولة عند الخطأ + إشعار بصندوق هدايا الموقع):
//       • أول 15 بكل قروب (أول 3 جوائزهم الخاصة والبقية جوائزهم) : أسبوعياً كل سبت 1:00 ص بتوقيت السعودية
//  4) لقطة الترتيب (Snapshot) تتجدد يومياً 1:00 ص بتوقيت السعودية
// =====================================================================

const crypto = require('crypto')
const { logReward } = require('./rewardLog') // 🎁 سجل الجوائز بالموقع (آخر 10)
const mongoose = require('mongoose')
const { cappedPower, DEFAULT_CAP } = require('../utils/cappedPower')
const { KingdomMember, RankRewardRun, RankReward } = require('../models/KingdomGroup')

// ───────────────────────── الإعدادات ─────────────────────────
// ⚠️ تأكد أن كل معرّف مقابل القروب الصحيح (غيّره هنا أو عبر متغيرات البيئة). الترتيب = أولوية ظهور الشخص إذا كان بأكثر من قروب.
const KINGDOM_GROUPS = [
    { key: 'tsuki',  name: 'Tsuki',  emoji: '🔆',  color: '#ffd23f', jid: process.env.KINGDOM_TSUKI_JID  || '120363020823525909@g.us'  },
    { key: 'yama',   name: 'Yama',   emoji: '⛰️', color: '#4ade80', jid: process.env.KINGDOM_YAMA_JID   || '120363116482407260@g.us'   },
    { key: 'nakama', name: 'Nakama', emoji: '⚡',  color: '#3ea8ff', jid: process.env.KINGDOM_NAKAMA_JID || '120363362807326585@g.us' }
]
const TOP_GROUP_LIMIT = 20            // أول 20 لكل قروب
const REFRESH_HOUR = 1                // 1:00 ص بتوقيت السعودية
const WEEKLY_DOW = 6                  // السبت (0=الأحد … 6=السبت)
const WEEKLY_RANKS = { from: 1, to: 15 }   // كل الجوائز أسبوعية: المراكز 1–15 بكل قروب
const TICK_MS = 5 * 60 * 1000         // فحص المجدول كل 5 دقائق (آمن: المفاتيح تمنع التكرار)
const OWNER_ALERT_AFTER = 5           // بعد كم محاولة فاشلة ننبّه المطوّر (خاص)

const SAUDI_OFFSET_MS = 3 * 60 * 60 * 1000   // Asia/Riyadh = UTC+3 ثابت

const BOX_LABELS = { sss_high: 'SSS High', sss_chance: 'SSS Chance', legendary: 'Legendary', epic: 'Epic', rare: 'Rare' }

const labelOf = g => `${g.name} ${g.emoji}`   // الإيموجي بعد الاسم
const configured = g => /^\d+(-\d+)?@g\.us$/.test(String(g.jid || ''))
const activeGroups = () => KINGDOM_GROUPS.filter(configured)
const groupByKey = k => KINGDOM_GROUPS.find(g => g.key === k) || null

let deps = { Player: null, getSssChars: () => [], notifyOwner: async () => {} }
function init(opts) { deps = { ...deps, ...opts } }

// ───────────────────────── الوقت (بتوقيت السعودية) ─────────────────────────
const ymd = d => d.toISOString().slice(0, 10)
// "يوم الترتيب" يبدأ 1:00 ص: قبل 1:00 يُحسب اليوم السابق
function dayKey(now = Date.now()) { return ymd(new Date(now + SAUDI_OFFSET_MS - REFRESH_HOUR * 3600000)) }
function dayBoundaryMs(key) { return Date.parse(key + 'T00:00:00Z') + REFRESH_HOUR * 3600000 - SAUDI_OFFSET_MS }
// تاريخ آخر سبت 1:00 ص مضى
function weekKey(now = Date.now()) {
    const d = new Date(now + SAUDI_OFFSET_MS - REFRESH_HOUR * 3600000)
    const back = (d.getUTCDay() - WEEKLY_DOW + 7) % 7
    return ymd(new Date(d.getTime() - back * 86400000))
}

// ───────────────────────── مزامنة الأعضاء ─────────────────────────
let lastSyncKey = null

async function syncMembership(sock) {
    const now = Date.now()
    let okGroups = 0
    for (const g of activeGroups()) {
        let ids
        try {
            const meta = await sock.groupMetadata(g.jid)
            ids = (meta.participants || []).map(p => p.id).filter(Boolean)
        } catch (err) {
            console.log(`⚠️ kingdom sync: تعذر جلب ${g.key}:`, err?.message || err)
            continue // لا نحذف أعضاء قروب فشل جلبه
        }
        if (!ids.length) continue
        okGroups++
        await KingdomMember.bulkWrite(ids.map(userId => ({
            updateOne: { filter: { userId }, update: { $addToSet: { groups: g.key }, $set: { updatedAt: new Date() } }, upsert: true }
        })), { ordered: false })
        // اللي خرج من القروب يطلع من توبه
        await KingdomMember.updateMany({ groups: g.key, userId: { $nin: ids } }, { $pull: { groups: g.key } })
    }
    await KingdomMember.deleteMany({ groups: { $size: 0 } })
    if (okGroups) { lastSyncKey = dayKey(now); snapshot = null }
    return okGroups
}

// ───────────────────────── لقطة الترتيب ─────────────────────────
let snapshot = null     // { key, at, boards: { tsuki: [...], ... } }
let snapshotPending = null

const CAP_EXPR = { $cond: [{ $gt: [{ $ifNull: ['$maxCharacters', 0] }, 0] }, '$maxCharacters', DEFAULT_CAP] }

async function totalsFor(userIds) {
    if (!userIds.length) return []
    return deps.Player.aggregate([
        { $match: { userId: { $in: userIds }, 'characters.0': { $exists: true } } },
        { $project: { userId: 1, name: 1, username: 1, total: { $sum: { $slice: [{ $ifNull: ['$characters.power', []] }, CAP_EXPR] } } } },
        { $match: { total: { $gt: 0 } } },
        { $sort: { total: -1, _id: 1 } }
    ]).allowDiskUse(true)
}

async function topCharsFor(ids) {
    if (!ids.length) return new Map()
    const tops = await deps.Player.aggregate([
        { $match: { _id: { $in: ids } } },
        { $addFields: { top: { $reduce: {
            input: '$characters', initialValue: null,
            in: { $cond: [{ $gt: [{ $ifNull: ['$$this.power', 0] }, { $ifNull: ['$$value.power', -1] }] }, '$$this', '$$value'] }
        } } } },
        { $project: { _id: 1, 'top.name': 1, 'top.rarity': 1, 'top.form': 1, 'top.evolutionLevel': 1, 'top.image': 1, 'top.customImage': 1, 'top.power': 1 } }
    ]).allowDiskUse(true)
    return new Map(tops.map(t => [String(t._id), t.top]))
}

async function computeBoards() {
    const members = await KingdomMember.find({}, { userId: 1, groups: 1 }).lean()
    const claimed = new Set()      // اللي ظهر بقروب أعلى أولوية لا يتكرر بقروب ثاني
    const boards = {}
    for (const g of activeGroups()) {
        const ids = members.filter(m => (m.groups || []).includes(g.key)).map(m => m.userId)
        const rows = await totalsFor(ids)
        const picked = []
        for (const r of rows) {
            if (claimed.has(r.userId)) continue
            claimed.add(r.userId)
            picked.push(r)
            if (picked.length >= TOP_GROUP_LIMIT) break
        }
        const topMap = await topCharsFor(picked.map(r => r._id))
        boards[g.key] = picked.map(r => ({
            userId: r.userId, name: r.name, username: r.username, total: r.total,
            top: topMap.get(String(r._id)) || null
        }))
    }
    return boards
}

// تتجدد تلقائياً أول ما يتغيّر "يوم الترتيب" (1:00 ص السعودية)، ولو فشل التحديث نعرض آخر نسخة
async function getSnapshot({ force = false } = {}) {
    const key = dayKey()
    if (!force && snapshot && snapshot.key === key) return snapshot
    if (snapshotPending) return snapshotPending
    snapshotPending = (async () => {
        try {
            snapshot = { key, at: Date.now(), boards: await computeBoards() }
            return snapshot
        } catch (err) {
            if (snapshot) return snapshot
            throw err
        } finally { snapshotPending = null }
    })()
    return snapshotPending
}

async function getBoard(groupKey) {
    const snap = await getSnapshot()
    return { at: snap.at, list: snap.boards[groupKey] || [] }
}

function getTabs() {
    return activeGroups().map(g => ({ k: g.key, label: labelOf(g), color: g.color }))
}

// ───────────────────────── الجوائز ─────────────────────────
function rewardFor(pos) {
    if (pos === 1) return { boxes: { sss_high: 1, sss_chance: 1 }, wantsSss: true }
    if (pos === 2) return { boxes: { sss_high: 2, legendary: 2 } }
    if (pos === 3) return { boxes: { sss_high: 1, legendary: 2 } }
    if (pos <= 10) return { boxes: { legendary: 2, epic: 2 } }
    return { boxes: { epic: 2, rare: 2 } }
}

function pickSss() {
    const pool = (deps.getSssChars() || [])
    if (!pool.length) return null
    return JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]))
}

// خطة التوزيع: كل قروب بالترتيب، والشخص يستلم مرة واحدة بالتشغيلة كلها (لو تكرر يطلع ويتقدّم اللي بعده)
function buildPlan(boards, periodKey, kind) {
    const range = WEEKLY_RANKS
    const awarded = new Set()
    const plan = []
    for (const g of activeGroups()) {
        let pos = 0
        for (const e of (boards[g.key] || [])) {
            if (awarded.has(e.userId)) continue
            pos++
            if (pos > range.to) break
            if (pos < range.from) continue
            awarded.add(e.userId)
            const spec = rewardFor(pos)
            plan.push({
                key: `${periodKey}:${e.userId}`, userId: e.userId, group: g.key, pos,
                rewards: { boxes: spec.boxes, character: spec.wantsSss ? pickSss() : null }
            })
        }
    }
    return plan
}

// المنح نفسه ذرّي: شرط rankRewardKeys يمنع التكرار حتى لو تكرر الاستدعاء أو انقطع الاتصال في المنتصف
async function grant(entry) {
    const col = deps.Player.collection
    const { userId, key } = entry
    await col.updateOne({ userId, boxes: null }, { $set: { boxes: {} } }) // يطابق الحقل الناقص أو null
    const inc = {}
    for (const [k, v] of Object.entries(entry.rewards.boxes || {})) inc['boxes.' + k] = v
    const push = { rankRewardKeys: key }
    if (entry.rewards.character) push.characters = { ...entry.rewards.character, _id: new mongoose.Types.ObjectId() }
    const r = await col.updateOne({ userId, rankRewardKeys: { $ne: key } }, { $inc: inc, $push: push })
    if (r.matchedCount === 0) {
        const done = await col.findOne({ userId, rankRewardKeys: key }, { projection: { _id: 1 } })
        if (done) return 'already'
        throw new Error('اللاعب غير موجود')
    }
    return 'granted'
}

const nidOf = key => crypto.createHash('sha1').update(key).digest('hex').slice(0, 16)

async function processEntry(entry, runKey, kind) {
    // 1) سجل الإشعار (مرة واحدة بالمفتاح)
    await RankReward.updateOne({ key: entry.key }, {
        $setOnInsert: {
            key: entry.key, nid: nidOf(entry.key), runKey, userId: entry.userId, group: entry.group,
            pos: entry.pos, kind, rewards: entry.rewards, status: 'pending', seen: false, createdAt: new Date()
        }
    }, { upsert: true })
    const log = await RankReward.findOne({ key: entry.key })
    if (log.status === 'granted') return true
    try {
        const res = await grant(entry)
        if (res === 'granted') { // 'already' = انمنحت قبل (إعادة محاولة) فما نسجّلها مرتين
            const g = groupByKey(entry.group)
            const c = entry.rewards && entry.rewards.character
            logReward(entry.userId, {
                src: `قروبات المملكة — ${g ? g.name : entry.group} · المركز ${entry.pos}`,
                icon: g ? g.emoji : '🏰',
                lines: [...describeRewards(entry.rewards), ...(c ? [`🎴 ${c.name} (${c.rarity})`] : [])]
            })
        }
        await RankReward.updateOne({ key: entry.key }, { $set: { status: 'granted', grantedAt: new Date(), lastError: null } })
        return true
    } catch (err) {
        const msg = String(err?.message || err).slice(0, 300)
        const upd = await RankReward.findOneAndUpdate({ key: entry.key },
            { $inc: { attempts: 1 }, $set: { lastError: msg } }, { new: true })
        console.log(`❌ rank reward retry later (${entry.key}):`, msg)
        if (upd && upd.attempts >= OWNER_ALERT_AFTER && !upd.ownerNotified) {
            await RankReward.updateOne({ key: entry.key }, { $set: { ownerNotified: true } })
            deps.notifyOwner(`⚠️ تعذّر منح جائزة ترتيب (${upd.attempts} محاولات)\n${upd.userId}\n${msg}\nستستمر المحاولة تلقائياً.`).catch(() => {})
        }
        return false
    }
}

// تشغيلة فترة واحدة. آمنة للتكرار: الخطة تُحفظ مرة واحدة، والمنح بمفاتيح، وما يفشل يُعاد لاحقاً
async function runPeriod(kind, periodKey) {
    const runKey = `${kind}:${periodKey}`
    let run = await RankRewardRun.findOne({ key: runKey }).lean()
    if (run && run.status === 'done') return { runKey, skipped: true, granted: 0, pending: 0 }
    if (!run) {
        const snap = await getSnapshot({ force: true })
        await RankRewardRun.updateOne({ key: runKey }, {
            $setOnInsert: { key: runKey, kind, status: 'running', plan: buildPlan(snap.boards, runKey, kind), createdAt: new Date() }
        }, { upsert: true })
        run = await RankRewardRun.findOne({ key: runKey }).lean()
    }
    let granted = 0, pending = 0
    for (const entry of run.plan) {
        const ok = await processEntry(entry, runKey, kind)
        if (ok) granted++; else pending++
    }
    if (!pending) await RankRewardRun.updateOne({ key: runKey }, { $set: { status: 'done', doneAt: new Date() } })
    return { runKey, skipped: false, granted, pending }
}

// ───────────────────────── المجدول ─────────────────────────
let ticking = false
let timer = null

async function startMarker() {
    // لا نوزّع جوائز فترات سبقت أول تشغيل للنظام (حتى ما تنزل جوائز بأثر رجعي)
    await RankRewardRun.updateOne({ key: 'meta:start' }, { $setOnInsert: { key: 'meta:start', kind: 'meta', status: 'done', createdAt: new Date() } }, { upsert: true })
    const m = await RankRewardRun.findOne({ key: 'meta:start' }, { createdAt: 1 }).lean()
    return m.createdAt.getTime()
}

async function tick(getSock) {
    if (ticking) return
    ticking = true
    try {
        const sock = getSock()
        if (sock && lastSyncKey !== dayKey()) await syncMembership(sock)
        const startMs = await startMarker()
        const now = Date.now()
        const wKey = weekKey(now)
        if (dayBoundaryMs(wKey) >= startMs) await runPeriod('weekly', wKey)
    } catch (err) {
        console.log('❌ kingdom scheduler error:', err?.message || err)
    } finally { ticking = false }
}

function startScheduler(getSock) {
    if (timer) return
    if (!activeGroups().length) { console.log('⚠️ kingdom: لم تُضبط معرّفات القروبات — المجدول متوقف'); return }
    setTimeout(() => tick(getSock), 30 * 1000)
    timer = setInterval(() => tick(getSock), TICK_MS)
}

// أمر المطوّر .جوائز_الترتيب: يشغّل الفترة الحالية يدوياً (بدون إرسال شيء للقروبات). لا يمكن أن يكرر جائزة.
async function runNow(sock) {
    if (sock) await syncMembership(sock)
    const now = Date.now()
    const w = await runPeriod('weekly', weekKey(now))
    return { weekly: w }
}

// ───────────────────────── إشعارات الموقع (صندوق الهدايا) ─────────────────────────
function describeRewards(rw) {
    const items = Object.entries((rw && rw.boxes) || {}).map(([k, v]) => `📦 ${v} × ${BOX_LABELS[k] || k}`)
    return items
}

async function getUnseenRewards(userId) {
    const docs = await RankReward.find({ userId, status: 'granted', seen: false }).sort({ grantedAt: 1 }).limit(30).lean()
    return docs.map(d => {
        const g = groupByKey(d.group)
        const c = d.rewards && d.rewards.character
        return {
            kind: 'reward',
            id: d.nid,
            group: g ? labelOf(g) : String(d.group || ''),
            color: g ? g.color : '#f0c04a',
            pos: d.pos,
            period: 'أسبوعية',
            items: describeRewards(d.rewards),
            charName: c ? String(c.name || '') : '',
            charRarity: c ? String(c.rarity || '') : '',
            charPower: c ? Number(c.power) || 0 : 0,
            charImage: c ? (c.customImage || c.image || '') : '',
            at: new Date(d.grantedAt || d.createdAt).getTime()
        }
    })
}

async function markRewardSeen(userId, nid) {
    await RankReward.updateOne({ userId, nid }, { $set: { seen: true } })
}

module.exports = {
    KINGDOM_GROUPS, TOP_GROUP_LIMIT, labelOf, groupByKey, activeGroups,
    init, syncMembership, getSnapshot, getBoard, getTabs,
    runPeriod, runNow, startScheduler,
    getUnseenRewards, markRewardSeen,
    // للاختبار
    _internals: { buildPlan, dayKey, weekKey, dayBoundaryMs, rewardFor }
}
