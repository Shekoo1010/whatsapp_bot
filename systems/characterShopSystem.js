// =====================================================================
// systems/characterShopSystem.js
// متجر الشخصيات — منطق واحد مشترك بين الواتس (.شراءمتجر) والموقع (/shop)
//
// 🔒 منع الشراء المزدوج:
//   1) "الحجز الذري": Shop.findOneAndDelete({_id}) — قاعدة البيانات تضمن أن
//      نداءً واحداً فقط يستلم الوثيقة، والثاني يرجع null => "نفذت الكمية".
//   2) الدفع ذري أيضاً: الخصم + إضافة الشخصية بعملية واحدة بشرط (الرصيد كافٍ
//      والمخزون غير ممتلئ)، فلا يمكن أن يصير رصيد سالب أو تجاوز للحد.
//   3) لو فشل الدفع بعد الحجز نُرجع العرض للمتجر (بنفس _id ووقت إنشائه)
//      بشرط أنه لسا من نفس الساعة.
// =====================================================================

const mongoose = require('mongoose')
const Shop = require('../models/Shop')

const HOUR_MS = 60 * 60 * 1000 // رأس الساعة السعودي (UTC+3) = رأس الساعة UTC لأن الفرق ساعات كاملة

function lastBoundary() { return Math.floor(Date.now() / HOUR_MS) * HOUR_MS }
function msUntilNextHour() { return lastBoundary() + HOUR_MS - Date.now() }

const ERRORS = {
    BAD_ID: '❌ العرض غير صحيح، حدّث الصفحة.',
    SOLD_OUT: '❌ نفذت الكمية — سبقك لاعب آخر واشترى هذه الشخصية.',
    NO_ACCOUNT: '❌ لا تملك حساباً',
    NO_MONEY: '❌ لا تملك مالاً كافياً',
    FULL: '❌ وصلت للحد الأقصى لعدد الشخصيات',
    SERVER: '❌ حدث خطأ أثناء الشراء، حاول مرة أخرى.'
}

/**
 * Player: mongoose model
 * resortPlayerCharacters(player): نفس دالة الترتيب بالبوت (تعمل markModified)
 * refreshShop(): generateCharacterShop من index.js (تجدد المتجر إن لزم)
 */
function createCharacterShopSystem({ Player, resortPlayerCharacters, refreshShop }) {

    // يتأكد أن المتجر من الساعة الحالية (وإلا يجدده) ثم يرجع العروض مرتبة ثابتة
    async function listShop() {
        try {
            const first = await Shop.findOne().sort({ _id: 1 }).select('createdAt').lean()
            const stale = !first || !first.createdAt || new Date(first.createdAt).getTime() < lastBoundary()
            if (stale && typeof refreshShop === 'function') await refreshShop()
        } catch (e) { console.error('shop refresh error:', e) }
        return Shop.find().sort({ _id: 1 }).lean()
    }

    async function restore(raw) {
        try {
            // لو تجدد المتجر بين الحجز والرجوع لا نرجع عرضاً قديماً
            const t = raw.createdAt ? new Date(raw.createdAt).getTime() : 0
            if (t < lastBoundary()) return
            await Shop.collection.insertOne(raw)
        } catch (e) { console.error('shop restore error:', e) }
    }

    const capOf = p => (Number(p.maxCharacters) > 0 ? Number(p.maxCharacters) : 30)

    // يرجع سبب فشل الدفع بقراءة حالة اللاعب الحالية
    async function whyNotPaid(userId, price) {
        const p = await Player.findOne({ userId }).select('money maxCharacters characters').lean()
        if (!p) return 'NO_ACCOUNT'
        if ((Number(p.money) || 0) < price) return 'NO_MONEY'
        if ((p.characters || []).length >= capOf(p)) return 'FULL'
        return 'SERVER'
    }

    async function buyShopItem({ userId, shopId }) {
        try {
            if (!userId || !mongoose.Types.ObjectId.isValid(String(shopId))) return { ok: false, code: 'BAD_ID' }

            // ① فحص مسبق (لا يغيّر شيئاً) حتى لا نحجز العرض عبثاً
            const peek = await Shop.findById(shopId).lean()
            if (!peek || !peek.character) return { ok: false, code: 'SOLD_OUT' }
            const price = Number(peek.price) || 0

            const pre = await Player.findOne({ userId }).select('money maxCharacters characters').lean()
            if (!pre) return { ok: false, code: 'NO_ACCOUNT' }
            if ((Number(pre.money) || 0) < price) return { ok: false, code: 'NO_MONEY', need: price, have: Number(pre.money) || 0 }
            if ((pre.characters || []).length >= capOf(pre)) return { ok: false, code: 'FULL' }

            // ② الحجز الذري — الأول فقط ينجح
            const raw = await Shop.findOneAndDelete({ _id: peek._id }).lean()
            if (!raw) return { ok: false, code: 'SOLD_OUT' }

            // ③ الدفع الذري (خصم + إضافة) بشرط الرصيد والسعة
            let updated = null
            try {
                updated = await Player.findOneAndUpdate(
                    {
                        userId,
                        money: { $gte: price },
                        $expr: {
                            $lt: [
                                { $size: { $ifNull: ['$characters', []] } },
                                { $cond: [{ $gt: [{ $ifNull: ['$maxCharacters', 0] }, 0] }, '$maxCharacters', 30] }
                            ]
                        }
                    },
                    { $inc: { money: -price }, $push: { characters: raw.character } },
                    { new: true }
                ).select('money').lean()
            } catch (e) {
                console.error('shop pay error:', e)
                await restore(raw)
                return { ok: false, code: 'SERVER' }
            }

            if (!updated) {
                await restore(raw)
                const code = await whyNotPaid(userId, price)
                return { ok: false, code, need: price }
            }

            // ④ إعادة ترتيب شخصيات اللاعب (نفس .شراءمتجر) — فشلها لا يلغي الشراء
            try {
                if (typeof resortPlayerCharacters === 'function') {
                    const doc = await Player.findOne({ userId })
                    if (doc) { resortPlayerCharacters(doc); await doc.save() }
                }
            } catch (e) { console.error('shop resort error (purchase done):', e && e.message) }

            const c = raw.character || {}
            return {
                ok: true,
                id: String(raw._id),
                name: c.name, rarity: c.rarity, power: c.power,
                price, money: Number(updated.money) || 0
            }
        } catch (err) {
            console.error('buyShopItem error:', err)
            return { ok: false, code: 'SERVER' }
        }
    }

    return { listShop, buyShopItem, msUntilNextHour, ERRORS }
}

module.exports = { createCharacterShopSystem, ERRORS }
