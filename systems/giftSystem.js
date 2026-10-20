// =====================================================================
// systems/giftSystem.js
// منطق الإهداء الموحّد — يستخدمه أمر .اهداء (واتساب) وموقع الشخصيات.
// القواعد واحدة: حد 5 شخصيات، منع Ω، قفل giftLocks، transaction ذرية،
// خصم 20 ألف عند استخدام اليوزرنيم.
//
// ضمانات الأمان:
//  1) كل القراءة والكتابة داخل الـ transaction (قراءة جديدة بكل محاولة)،
//     فلو أعاد MongoDB المحاولة (TransientTransactionError) ما يتكرر أي تعديل.
//  2) رقم عملية (opKey) يُحفظ عند المُهدي داخل نفس الـ transaction،
//     فأي طلب مكرر بنفس الرقم يرجع نفس النتيجة بدون تنفيذ ثاني.
//  3) القفل يُحرَّر دائماً في finally.
//  4) اختيار الشخصيات بالموقع بـ hash كامل لمحتوى الشخصية (وليس رقمها)،
//     فلو تغيّرت قائمة اللاعب تفشل العملية بدل ما تُهدى شخصية غلط.
// =====================================================================

const crypto = require('crypto')

const MAX_GIFT_CHARACTERS = 5
const INBOX_LIMIT = 50
const OPKEY_LIMIT = 40
const LOG_LIMIT = 100

class GiftError extends Error {
    constructor(code, extra = {}) {
        super(code)
        this.code = code
        this.extra = extra
    }
}

// hash ثابت لمحتوى الشخصية (يُستخدم بالموقع لتحديد الشخصية بدقة)
function charHash(c) {
    return crypto
        .createHash('sha1')
        .update(JSON.stringify(JSON.parse(JSON.stringify(c || {}))))
        .digest('hex')
}

function createGiftSystem({ mongoose, Player, giftLocks, resortPlayerCharacters, usernameCost }) {

    /**
     * picks: { indices: number[] }  (الأمر)   أو   { hashes: string[] } (الموقع)
     * يرجع { ok:true, duplicate, characters, cost, ... }
     * أو   { ok:false, code, extra }
     */
    async function giftCharacters({ senderId, targetId, picks, viaUsername, opKey, source }) {

        if (!senderId || !targetId) return { ok: false, code: 'NO_TARGET' }
        if (senderId === targetId) return { ok: false, code: 'SELF' }

        const wantedCount = (picks.indices || picks.hashes || []).length
        if (wantedCount === 0) return { ok: false, code: 'BAD_PICKS' }
        if (wantedCount > MAX_GIFT_CHARACTERS) return { ok: false, code: 'TOO_MANY' }

        // 🔒 نفس القفل المشترك بين الأمر والموقع
        if (giftLocks.has(senderId) || giftLocks.has(targetId)) {
            return { ok: false, code: 'LOCKED' }
        }
        giftLocks.add(senderId)
        giftLocks.add(targetId)

        let session = null
        let result = null

        try {

            session = await mongoose.startSession()

            await session.withTransaction(async () => {

                result = null // إعادة ضبط لو أُعيدت المحاولة

                // ⚡ قراءة خفيفة (lean + الحقول اللي نحتاجها فقط) بدل تحميل المستندين كاملين
                // (إيكوز/صناديق/سجلات...) وتحويلهم لمستندات Mongoose
                const sender = await Player.findOne({ userId: senderId })
                    .select('characters giftOpKeys money name username weaponsInventory giftLog')
                    .session(session)
                    .lean()
                if (!sender) throw new GiftError('NO_SENDER')

                // ♻️ طلب مكرر بنفس الرقم (ضغطتان / إعادة إرسال) → نفس النتيجة بلا تنفيذ
                if (opKey && Array.isArray(sender.giftOpKeys) && sender.giftOpKeys.includes(opKey)) {
                    result = { ok: true, duplicate: true }
                    return
                }

                const target = await Player.findOne({ userId: targetId })
                    .select('characters giftInbox giftLog name username')
                    .session(session)
                    .lean()
                if (!target) throw new GiftError('NO_TARGET')

                const chars = sender.characters || []

                // تحديد الشخصيات من القائمة الحالية داخل الـ transaction
                let indices = []
                if (picks.indices) {
                    indices = picks.indices.slice()
                    if (indices.some(i => !Number.isInteger(i) || i < 0 || i >= chars.length)) {
                        throw new GiftError('BAD_INDEX')
                    }
                } else {
                    // ⚡ نحسب hash كل شخصية مرة وحدة (كان يُعاد حسابه لكل شخصية مطلوبة × كل قائمة اللاعب)
                    const hashes = chars.map(c => charHash(c))
                    const used = new Set()
                    for (const h of picks.hashes) {
                        let found = -1
                        for (let i = 0; i < chars.length; i++) {
                            if (!used.has(i) && hashes[i] === h) { found = i; break }
                        }
                        if (found === -1) throw new GiftError('STALE')
                        used.add(found)
                        indices.push(found)
                    }
                }

                if (new Set(indices).size !== indices.length) throw new GiftError('DUP_INDEX')

                const selected = indices.map(i => chars[i])

                // 🌌 Ω ما تُهدى
                if (selected.some(c => c && c.evolutionLevel === 7)) throw new GiftError('OMEGA')

                const cost = viaUsername ? usernameCost : 0
                if (cost && (sender.money || 0) < cost) {
                    throw new GiftError('NO_MONEY', { balance: sender.money || 0 })
                }

                // نحذف من الأكبر للأصغر
                const removedNames = new Set(selected.map(c => c.name))
                for (const i of [...indices].sort((a, b) => b - a)) chars.splice(i, 1)

                // ⚔️ السلاح مربوط بالاسم: لو ما بقي عند المُهدي نسخة بنفس الاسم نفكّ ربطه
                let weaponsChanged = false
                if (Array.isArray(sender.weaponsInventory)) {
                    for (const name of removedNames) {
                        if (chars.some(c => c && c.name === name)) continue
                        for (const w of sender.weaponsInventory) {
                            if (w && w.equippedTo === name) { w.equippedTo = null; weaponsChanged = true }
                        }
                    }
                }

                // نفس الترتيب القديم بالضبط (resortPlayerCharacters) لكن على مصفوفة عادية بدل مستند Mongoose
                const targetHolder = {
                    characters: (target.characters || []).concat(selected),
                    markModified() {}
                }
                resortPlayerCharacters(targetHolder)
                const targetChars = targetHolder.characters

                const newSenderMoney = (sender.money || 0) - cost

                // 📬 صندوق الهدايا (آخر 50) — بنفس الـ transaction
                const now = Date.now()
                const fromName = sender.name || sender.username || 'لاعب'
                const inbox = Array.isArray(target.giftInbox) ? target.giftInbox.slice() : []
                selected.forEach((c, n) => {
                    inbox.push({
                        id: crypto.randomBytes(8).toString('hex'),
                        fromUserId: senderId,
                        fromName,
                        name: c.name,
                        rarity: c.rarity,
                        form: c.form || null,
                        anime: c.anime || '',
                        evolutionLevel: c.evolutionLevel || 0,
                        power: c.power || 0,
                        image: c.customImage || c.image || '',
                        at: now + n,
                        seen: false,
                        source
                    })
                })

                // 📜 سجل الإهداءات الدائم (للمُهدي والمستلم)
                const logChars = selected.map(c => ({
                    name: c.name, rarity: c.rarity, power: c.power || 0, evolutionLevel: c.evolutionLevel || 0
                }))
                const logId = crypto.randomBytes(8).toString('hex')
                const toName = target.name || target.username || 'لاعب'
                const sLog = Array.isArray(sender.giftLog) ? sender.giftLog.slice() : []
                sLog.push({ id: logId, dir: 'out', at: now, source, cost, otherName: toName, otherUsername: target.username || null, chars: logChars })
                const tLog = Array.isArray(target.giftLog) ? target.giftLog.slice() : []
                tLog.push({ id: logId, dir: 'in', at: now, source, cost: 0, otherName: fromName, otherUsername: sender.username || null, chars: logChars })

                // ⚡ كتابة ذرية مستهدفة للحقول المتغيّرة فقط (بدل save() للمستندين كاملين) داخل نفس الـ transaction
                const senderSet = {
                    characters: chars,
                    giftLog: sLog.slice(-LOG_LIMIT)
                }
                if (weaponsChanged) senderSet.weaponsInventory = sender.weaponsInventory
                if (cost) senderSet.money = newSenderMoney
                if (opKey) {
                    const keys = Array.isArray(sender.giftOpKeys) ? sender.giftOpKeys.slice() : []
                    keys.push(opKey)
                    senderSet.giftOpKeys = keys.slice(-OPKEY_LIMIT)
                }

                await Player.updateOne({ userId: senderId }, { $set: senderSet }, { session })

                await Player.updateOne(
                    { userId: targetId },
                    {
                        $set: {
                            characters: targetChars,
                            giftInbox: inbox.slice(-INBOX_LIMIT),
                            giftLog: tLog.slice(-LOG_LIMIT)
                        }
                    },
                    { session }
                )

                result = {
                    ok: true,
                    duplicate: false,
                    characters: selected.map(c => ({
                        name: c.name, rarity: c.rarity, power: c.power, evolutionLevel: c.evolutionLevel || 0
                    })),
                    cost,
                    senderName: fromName,
                    targetName: target.name || target.username || 'لاعب',
                    targetUsername: target.username || null,
                    senderUsername: sender.username || null,
                    senderBalance: newSenderMoney
                }
            })

            return result || { ok: false, code: 'TX_FAILED' }

        } catch (err) {

            if (err instanceof GiftError) return { ok: false, code: err.code, extra: err.extra }

            console.log('❌ خطأ transaction الإهداء (تراجعت العملية بالكامل):', err)
            return { ok: false, code: 'TX_FAILED' }

        } finally {
            if (session) { try { await session.endSession() } catch (e) { /* تجاهل */ } }
            giftLocks.delete(senderId)
            giftLocks.delete(targetId)
        }
    }

    return { giftCharacters }
}

module.exports = { createGiftSystem, charHash, GiftError, MAX_GIFT_CHARACTERS }
