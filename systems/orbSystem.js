// =====================================================
// 🔮 نظام الأورب: الرصيد + المهام اليومية (1200 يومياً = 8400 أسبوعياً)
// الأورب تُمنح تلقائياً لحظة إكمال المهمة، وما تتعوض لو فات اليوم.
// =====================================================

const PlayerOrbs = require('../models/PlayerOrbs')
const {
    PULL_COST, MULTI_COST,
    DAILY_MISSIONS, DAILY_ORBS_TOTAL, WEEKLY_ORBS_TOTAL,
    HARD_PITY
} = require('./orbConfig')

const MISSION_MAP = Object.fromEntries(DAILY_MISSIONS.map(m => [m.key, m]))

function getSaudiDate() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })
}

function bar(cur, max, len = 10) {
    const filled = Math.max(0, Math.min(len, Math.round((cur / max) * len)))
    return '▰'.repeat(filled) + '▱'.repeat(len - filled)
}

function msUntilSaudiMidnight() {
    const next = Date.parse(getSaudiDate() + 'T00:00:00+03:00') + 24 * 3600 * 1000
    return Math.max(0, next - Date.now())
}

function formatDuration(ms) {
    const totalMin = Math.floor(ms / 60000)
    const d = Math.floor(totalMin / 1440)
    const h = Math.floor((totalMin % 1440) / 60)
    const m = totalMin % 60
    if (d > 0) return `${d} يوم ${h} ساعة`
    if (h > 0) return `${h} ساعة ${m} دقيقة`
    return `${m} دقيقة`
}

// =========================
// الوصول للسجل
// =========================

async function ensureDoc(userId) {
    let doc = await PlayerOrbs.findOne({ userId })
    if (doc) return doc
    try {
        return await PlayerOrbs.create({ userId })
    } catch (e) {
        if (e && e.code === 11000) return PlayerOrbs.findOne({ userId })
        throw e
    }
}

// تصفير مهام اليوم عند دخول يوم جديد (ذري: أول طلب فقط ينجح)
async function resetIfNewDay(userId) {
    const today = getSaudiDate()
    const set = { missionDate: today }
    for (const m of DAILY_MISSIONS) {
        set[`missionProgress.${m.key}`] = 0
        set[`missionDone.${m.key}`] = false
    }
    await PlayerOrbs.updateOne(
        { userId, missionDate: { $ne: today } },
        { $set: set }
    )
}

async function getStatus(userId) {
    await ensureDoc(userId)
    await resetIfNewDay(userId)
    return PlayerOrbs.findOne({ userId }).lean()
}

function earnedToday(doc) {
    let sum = 0
    for (const m of DAILY_MISSIONS) {
        if (doc?.missionDone?.[m.key]) sum += m.orbs
    }
    return sum
}

// =========================
// الرصيد
// =========================

async function addOrbs(userId, amount) {
    if (!amount || amount <= 0) return null
    await ensureDoc(userId)
    return PlayerOrbs.findOneAndUpdate(
        { userId },
        { $inc: { orbs: amount, totalEarned: amount } },
        { new: true }
    )
}

// خصم ذري: يفشل (null) إذا الرصيد ما يكفي — يمنع الصرف المزدوج
async function spendOrbs(userId, cost) {
    await ensureDoc(userId)
    return PlayerOrbs.findOneAndUpdate(
        { userId, orbs: { $gte: cost } },
        { $inc: { orbs: -cost, totalSpent: cost } },
        { new: true }
    )
}

async function refundOrbs(userId, amount) {
    return PlayerOrbs.findOneAndUpdate(
        { userId },
        { $inc: { orbs: amount, totalSpent: -amount } },
        { new: true }
    )
}

// =========================
// تتبّع المهام
// opts: { amount, sock, jid }  — لو أُعطي sock و jid ترسل رسالة صغيرة عند الإكمال
// =========================

async function trackMission(userId, key, opts = {}) {
    try {
        const def = MISSION_MAP[key]
        if (!def || !userId) return null

        const amount = opts.amount || 1

        await ensureDoc(userId)
        await resetIfNewDay(userId)

        const doneField = `missionDone.${key}`
        const progField = `missionProgress.${key}`

        // 1) زيادة العداد (فقط لو المهمة ما اكتملت اليوم)
        const inc = await PlayerOrbs.findOneAndUpdate(
            { userId, [doneField]: { $ne: true } },
            { $inc: { [progField]: amount } },
            { new: true }
        )

        if (!inc) return null // اكتملت سابقاً اليوم

        const progress = inc.missionProgress?.[key] || 0

        if (progress < def.target) {
            return { key, finished: false, progress, target: def.target, earned: 0 }
        }

        // 2) إغلاق المهمة + منح الأورب (ذري — ما تتكرر الجائزة أبداً)
        const done = await PlayerOrbs.findOneAndUpdate(
            { userId, [doneField]: { $ne: true } },
            {
                $set: { [doneField]: true, [progField]: def.target },
                $inc: { orbs: def.orbs, totalEarned: def.orbs }
            },
            { new: true }
        )

        if (!done) return null

        const result = {
            key,
            finished: true,
            progress: def.target,
            target: def.target,
            earned: def.orbs,
            balance: done.orbs,
            earnedToday: earnedToday(done),
            doneCount: DAILY_MISSIONS.filter(m => done.missionDone?.[m.key]).length
        }

        if (opts.sock && opts.jid) {
            const text =
`🔮 ═〔 مهمة أورب مكتملة 〕═ 🔮

@${userId.split('@')[0]}
✅ ${def.name}
✨ +${def.orbs} أورب

📅 اليوم ➤ ${result.earnedToday}/${DAILY_ORBS_TOTAL}  (${result.doneCount}/${DAILY_MISSIONS.length})
💎 رصيدك ➤ ${result.balance.toLocaleString()}`

            // تأخير بسيط عشان تطلع بعد رسالة نتيجة القتال مو قبلها
            setTimeout(() => {
                opts.sock.sendMessage(opts.jid, { text, mentions: [userId] })
                    .catch(e => console.log('orb notify error:', e?.message || e))
            }, opts.delay ?? 1800)
        }

        return result

    } catch (e) {
        console.log('trackMission error:', e)
        return null
    }
}

// =========================
// نص .اورب
// =========================

async function buildOrbsText(userId) {
    const doc = await getStatus(userId)
    const orbs = doc.orbs || 0
    const pulls = Math.floor(orbs / PULL_COST)
    const doneCount = DAILY_MISSIONS.filter(m => doc.missionDone?.[m.key]).length

    let rows = ''
    for (const m of DAILY_MISSIONS) {
        const done = !!doc.missionDone?.[m.key]
        const cur = Math.min(doc.missionProgress?.[m.key] || 0, m.target)
        if (done) {
            rows += `✅ ${m.name}  ‎+${m.orbs}\n`
        } else if (m.target === 1) {
            rows += `❌ ${m.name}  ‎+${m.orbs}\n   ↳ ${m.cmd}\n`
        } else {
            rows += `🔸 ${m.name}  ‎+${m.orbs}\n   ${bar(cur, m.target)} ${cur}/${m.target}  ↳ ${m.cmd}\n`
        }
        rows += '\n'
    }

    const pity = doc.pity || 0

    return (
`🔮 ═════〔 الأورب 〕═════ 🔮

@${userId.split('@')[0]}

💎 الرصيد ➤ ${orbs.toLocaleString()} أورب
🎟️ تكفي ➤ ${pulls} سحبة
${orbs >= MULTI_COST ? '✨ تقدر تسحب 10 سحبات!' : `📌 ينقصك ${(MULTI_COST - orbs).toLocaleString()} لسحب 10`}

━━━━━━━━━━━━━━

📜 مهام اليوم  ${doneCount}/${DAILY_MISSIONS.length}
🔮 ${earnedToday(doc)}/${DAILY_ORBS_TOTAL} أورب

${rows}━━━━━━━━━━━━━━

🎯 الضمان ➤ ${pity}/${HARD_PITY}
${doc.guaranteedFeatured ? '⭐ السحبة SSS القادمة مضمونة من البنر' : ''}
⏳ تتجدد بعد ${formatDuration(msUntilSaudiMidnight())}
🕛 12:00 AM 🇸🇦

⚠️ الأورب الفائتة ما تتعوض
📆 مجموع الأسبوع ➤ ${WEEKLY_ORBS_TOTAL.toLocaleString()} أورب`
    ).replace(/\n{3,}/g, '\n\n')
}

const api = {
    MISSION_MAP,
    getSaudiDate, bar, formatDuration, msUntilSaudiMidnight,
    ensureDoc, getStatus,
    addOrbs, spendOrbs, refundOrbs,
    trackMission, buildOrbsText
}

// نتيح الدالة للملفات الخارجية (مثل systems/arenaCommands.js) بسطر واحد:
//   global.trackOrbMission(userId, 'arenaWins', { sock, jid })
global.trackOrbMission = trackMission

module.exports = api
