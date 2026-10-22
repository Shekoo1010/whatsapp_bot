'use strict'
/**
 * 🏆 فاحص الإنجازات عند الحفظ — systems/achievementSweeper.js
 *
 * المشكلة: checkAndGrantAchievement يُستدعى فقط بعد أفعال معيّنة، فأي مصدر يزيد العدّاد بدون استدعائه
 * (جوائز العجلة، السوق، المتجر، الإهداء...) ما يمنح الإنجاز ولا يرسل الإشعار.
 * الحل: Player.post('save') ينادي onSave(doc)؛ لو وُجد مستوى وصل هدفه ولم يُستلم نمنحه بنفس الدالة (نفس الجوائز
 * ونفس إشعار الموقع/الواتساب). الفحص بالذاكرة فقط (رخيص)، والمنح يتأجل ثانيتين على نسخة جديدة من اللاعب
 * وبقفل لكل لاعب، حتى لا يتعارض مع الحفظ الجاري.
 *
 * الاستخدام (index.js): Player.setAchievementSweeper(require('./systems/achievementSweeper').create({...}).onSave)
 */

const DELAY_MS = 2000

const RAW = {
    pvp: p => p.wins || 0,
    boss: p => p.totalBossDamage || 0,
    beasts: p => p.beastEggsOpened || 0,
    brawl: p => p.brawlWins || 0,
    tower: p => p.towerTotalFloors || 0,
    kingdom: p => p.kingdomTotalStages || 0,
    omega: p => p.omegaEvolutions || 0,
    pulls: p => p.totalPulls || 0,
    boxes: p => p.boxesOpened || 0,
    daily: p => p.dailyStreak || 0,
    wealth: p => p.totalEarnedMoney || 0,
    collection: p => ((p.characters || []).filter(c => c && c.rarity === 'SSS').length),
    fusion: p => p.totalMerges || 0
}

function create({ Player, checkAndGrantAchievement, getSock, getNotifyJid }) {
    const ACH = require('./achievements').ACHIEVEMENTS
    const timers = new Set()   // userId بانتظار الفحص
    const running = new Set()  // userId قيد المنح

    // التصنيفات اللي فيها مستوى وصل هدفه ولم يُستلم: [[key, القيمة الخام]]
    function pending(p) {
        const out = []
        const base = p.achievementBaseline || {}
        const all = p.achievements || {}
        for (const k of Object.keys(RAW)) {
            const def = ACH[k]
            if (!def) continue
            const raw = RAW[k](p)
            const eff = Math.max(0, raw - (base[k] || 0))
            const claimed = (all[k] && all[k].claimedTiers) || []
            if (def.tiers.some(t => !claimed.includes(t.tier) && eff >= t.target)) out.push([k, raw])
        }
        return out
    }

    async function run(uid) {
        if (running.has(uid)) return
        running.add(uid)
        try {
            const p = await Player.findOne({ userId: uid })
            if (!p) return
            const list = pending(p)
            if (!list.length) return
            let sock = null, jid = null
            try { sock = getSock && getSock() } catch (e) { /* */ }
            try { jid = getNotifyJid ? await getNotifyJid(uid) : null } catch (e) { /* */ }
            // بدون واتساب: نمنح ونرسل إشعار الموقع فقط (stub يمنع ضجيج أخطاء الإرسال)
            const s = sock && jid ? sock : { sendMessage: async () => { } }
            for (const [k, raw] of list) await checkAndGrantAchievement(p, k, raw, s, jid)
        } catch (err) {
            console.log('achievement sweep error:', err && err.message || err)
        } finally {
            running.delete(uid)
        }
    }

    function onSave(doc) {
        try {
            const uid = doc && doc.userId
            if (!uid || running.has(uid) || timers.has(uid)) return
            if (!pending(doc).length) return
            timers.add(uid)
            const t = setTimeout(() => { timers.delete(uid); run(uid) }, DELAY_MS)
            if (t.unref) t.unref()
        } catch (e) { /* الفحص الجانبي ما يوقف الحفظ */ }
    }

    return { onSave, pending }
}

module.exports = { create }
