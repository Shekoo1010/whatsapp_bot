// =====================================================================
// systems/marketSystem.js
// السوق / المزاد العادي — منطق مشترك مع الواتس (.مزاد / .سوق / .شراء)
//
// نفس قواعد البوت بالضبط:
//   • العرض يسحب الشخصية من اللاعب ويضعها بـ Market بسعر ثابت
//   • حد السعر: SSS = 10,000,000 + مليون لكل تطوير (حد أقصى 20,000,000)، غيرها 500,000
//   • شخصية أوميقا Ω (evolutionLevel === 7) ما تُعرض أبداً
//   • العرض يبقى 24 ساعة ثم يرجع تلقائياً لصاحبه
//   • شراء صاحب العرض لعرضه = استرجاع مجاني
//   • المبلغ كاملاً للبائع بدون رسوم
//
// 🔒 الحماية: حجز ذري (findOneAndDelete) فلا يشتري اثنان نفس الشخصية،
//   دفع ذري (رصيد + سعة)، واسترجاع العرض لو فشل الدفع.
// =====================================================================

const mongoose = require('mongoose')
const Market = require('../models/Market')

const DAY_MS = 24 * 60 * 60 * 1000

const ERRORS = {
    BAD_ID: '❌ العرض غير صحيح، حدّث الصفحة.',
    GONE: '❌ العرض غير موجود — اشتراه لاعب آخر أو انتهت مدته.',
    NO_ACCOUNT: '❌ لا تملك حساباً',
    NO_MONEY: '❌ لا تملك مالاً كافياً',
    FULL: '❌ المخزون ممتلئ',
    BAD_PRICE: '❌ اكتب سعراً صحيحاً (رقم أكبر من صفر).',
    PRICE_LIMIT: '❌ السعر أعلى من الحد المسموح',
    OMEGA: '🌌 شخصية أوميقا Ω ما تقدر تعرضها بالمزاد أبداً.',
    NO_CHAR: '❌ الشخصية غير موجودة لديك',
    BUSY: '⏳ عندك عملية ثانية شغالة (سحب/إهداء) — انتظر ثواني وأعد المحاولة.',
    SERVER: '❌ حدث خطأ، حاول مرة أخرى.'
}

// نفس حدود .مزاد بالبوت
function priceLimit(c) {
    if (c && c.rarity === 'SSS') {
        const evo = Number(c.evolutionLevel) || 0
        return Math.min(10000000 + evo * 1000000, 20000000)
    }
    return 500000
}

function createMarketSystem({ Player, resortPlayerCharacters, charHash, locks = [] }) {

    const capOf = p => (Number(p.maxCharacters) > 0 ? Number(p.maxCharacters) : 30)
    const expiresAtOf = d => (d.createdAt ? new Date(d.createdAt).getTime() : Date.now()) + DAY_MS
    const isBusy = uid => locks.some(l => l && l.has && l.has(uid))
    const plainOf = c => (c && typeof c.toObject === 'function' ? c.toObject() : c)

    async function resortSafe(userId) {
        try {
            if (typeof resortPlayerCharacters !== 'function') return
            const doc = await Player.findOne({ userId })
            if (doc) { resortPlayerCharacters(doc); await doc.save() }
        } catch (e) { console.error('market resort error (done):', e && e.message) }
    }

    // ⏳ رجوع العروض المنتهية (24 ساعة) لأصحابها — ذري: كل عرض يرجع مرة واحدة فقط
    async function expireOld() {
        try {
            const cutoff = new Date(Date.now() - DAY_MS)
            const expired = await Market.find({ createdAt: { $lte: cutoff } }).select('_id').lean()
            for (const e of expired) {
                try {
                    const raw = await Market.findOneAndDelete({ _id: e._id, createdAt: { $lte: cutoff } }).lean()
                    if (!raw) continue // رجّعه غيرنا
                    await Player.updateOne({ userId: raw.seller }, { $push: { characters: raw.character } })
                    await resortSafe(raw.seller)
                } catch (err) { console.error('market expire error:', err) }
            }
        } catch (err) { console.error('market expireOld error:', err) }
    }

    // نفس ترتيب .سوق: الأرخص أولاً
    async function listMarket() {
        await expireOld()
        return Market.find().sort({ price: 1, _id: 1 }).lean()
    }

    async function restore(raw) {
        try {
            const t = raw.createdAt ? new Date(raw.createdAt).getTime() : 0
            if (t + DAY_MS <= Date.now()) { // انتهت مدته أثناء الحجز → يرجع لصاحبه
                await Player.updateOne({ userId: raw.seller }, { $push: { characters: raw.character } })
                return
            }
            await Market.collection.insertOne(raw)
        } catch (e) { console.error('market restore error:', e) }
    }

    async function whyNotPaid(userId, price) {
        const p = await Player.findOne({ userId }).select('money maxCharacters characters').lean()
        if (!p) return 'NO_ACCOUNT'
        if ((Number(p.money) || 0) < price) return 'NO_MONEY'
        if ((p.characters || []).length >= capOf(p)) return 'FULL'
        return 'SERVER'
    }

    const CAP_COND = {
        $expr: {
            $lt: [
                { $size: { $ifNull: ['$characters', []] } },
                { $cond: [{ $gt: [{ $ifNull: ['$maxCharacters', 0] }, 0] }, '$maxCharacters', 30] }
            ]
        }
    }

    // 🛒 شراء عرض (أو استرجاع لو أنت صاحبه)
    async function buyItem({ userId, marketId }) {
        try {
            if (!userId || !mongoose.Types.ObjectId.isValid(String(marketId))) return { ok: false, code: 'BAD_ID' }

            const peek = await Market.findById(marketId).lean()
            if (!peek || !peek.character) return { ok: false, code: 'GONE' }
            if (expiresAtOf(peek) <= Date.now()) { await expireOld(); return { ok: false, code: 'GONE' } }

            const self = peek.seller === userId
            const price = Number(peek.price) || 0

            const pre = await Player.findOne({ userId }).select('money maxCharacters characters').lean()
            if (!pre) return { ok: false, code: 'NO_ACCOUNT' }
            if (!self && (Number(pre.money) || 0) < price) return { ok: false, code: 'NO_MONEY' }
            if ((pre.characters || []).length >= capOf(pre)) return { ok: false, code: 'FULL' }

            // الحجز الذري — الأول فقط ينجح
            const raw = await Market.findOneAndDelete({ _id: peek._id }).lean()
            if (!raw) return { ok: false, code: 'GONE' }

            let updated = null
            try {
                updated = await Player.findOneAndUpdate(
                    self ? { userId, ...CAP_COND } : { userId, money: { $gte: price }, ...CAP_COND },
                    self ? { $push: { characters: raw.character } }
                         : { $inc: { money: -price }, $push: { characters: raw.character } },
                    { new: true }
                ).select('money').lean()
            } catch (e) {
                console.error('market pay error:', e)
                await restore(raw)
                return { ok: false, code: 'SERVER' }
            }

            if (!updated) {
                await restore(raw)
                return { ok: false, code: await whyNotPaid(userId, price) }
            }

            // المبلغ كاملاً للبائع (ذري)
            if (!self) {
                try { await Player.updateOne({ userId: raw.seller }, { $inc: { money: price } }) }
                catch (e) { console.error('market seller credit error:', e) }
            }

            await resortSafe(userId)

            const c = raw.character || {}
            return {
                ok: true, retrieved: self, id: String(raw._id),
                name: c.name, rarity: c.rarity, power: c.power,
                price, money: Number(updated.money) || 0, seller: raw.seller
            }
        } catch (err) {
            console.error('market buyItem error:', err)
            return { ok: false, code: 'SERVER' }
        }
    }

    // 🔨 عرض شخصية (نفس .مزاد): key = hash:رقم_التكرار (نفس مفاتيح صفحة البيع)
    async function sellItem({ userId, key, price }) {
        const lockSet = locks[0]
        if (isBusy(userId)) return { ok: false, code: 'BUSY' }
        if (lockSet && lockSet.add) lockSet.add(userId)
        try {
            price = Number(price)
            if (!Number.isFinite(price) || price <= 0 || Math.floor(price) !== price) return { ok: false, code: 'BAD_PRICE' }

            const doc = await Player.findOne({ userId })
            if (!doc) return { ok: false, code: 'NO_ACCOUNT' }

            const m = /^([a-f0-9]{40}):(\d{1,3})$/.exec(String(key || ''))
            if (!m) return { ok: false, code: 'NO_CHAR' }
            const want = Number(m[2])
            let seen = 0, idx = -1
            const list = doc.characters || []
            for (let i = 0; i < list.length; i++) {
                if (charHash(plainOf(list[i])) === m[1]) {
                    if (seen === want) { idx = i; break }
                    seen++
                }
            }
            if (idx === -1) return { ok: false, code: 'NO_CHAR' }

            const ch = list[idx]
            if (Number(ch.evolutionLevel) === 7) return { ok: false, code: 'OMEGA' }
            const limit = priceLimit(ch)
            if (price > limit) return { ok: false, code: 'PRICE_LIMIT', limit }

            const plain = JSON.parse(JSON.stringify(ch))

            // نسحب الشخصية أولاً (لا تتكرر أبداً)، ولو فشل إنشاء العرض نرجعها
            doc.characters.splice(idx, 1)
            doc.markModified('characters')
            await doc.save()

            try {
                const created = await Market.create({ seller: userId, character: plain, price })
                return {
                    ok: true, id: String(created._id), name: plain.name, rarity: plain.rarity,
                    power: plain.power, price, expiresAt: expiresAtOf(created)
                }
            } catch (e) {
                console.error('market create error — returning character:', e)
                try { await Player.updateOne({ userId }, { $push: { characters: plain } }) } catch (e2) { console.error('market rollback error:', e2) }
                return { ok: false, code: 'SERVER' }
            }
        } catch (err) {
            console.error('market sellItem error:', err)
            return { ok: false, code: 'SERVER' }
        } finally {
            if (lockSet && lockSet.delete) lockSet.delete(userId)
        }
    }

    return { listMarket, buyItem, sellItem, expireOld, expiresAtOf, priceLimit, ERRORS }
}

module.exports = { createMarketSystem, priceLimit, ERRORS, DAY_MS }
