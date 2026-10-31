// utils/persistentMediaCache.js
// ⚡ كاش رفع الصور الدائم (يبقى بعد إعادة نشر ريندر)
//
// Baileys يحفظ بكاشه "نتيجة رفع الصورة لواتساب" (مو الصورة نفسها) بمفتاح
// نوع الوسيط + الرابط. هذا الكاش نفس واجهة createMediaCache لكنه يكتب
// كل مدخلة إلى MongoDB ويحمّلها كلها عند التشغيل، فالصورة ترفع مرة وحدة
// وتُرسل بعدها فوراً حتى بعد إعادة التشغيل.
//
// ملاحظة: سيرفرات واتساب لا تحتفظ بالوسائط للأبد، فنعتبر المدخلة صالحة
// MEDIA_CACHE_DAYS يوم (افتراضي 5). بعدها get() يرجع undefined فيعيد
// Baileys رفعها تلقائياً مرة وحدة ويُجدَّد الكاش — يعني عملياً "دائم".
// تعطيل الحفظ بـ Mongo (يبقى كاش الذاكرة): MEDIA_CACHE_PERSIST=0

const mongoose = require('mongoose')

const COLLECTION = 'wa_media_cache'

// نحفظ بـ Mongo فقط الصور التي يحتوي رابطها على هذا النص (صور المسابقة).
// باقي الصور تبقى بكاش الذاكرة العادي كما كانت. لحفظ الكل: MEDIA_CACHE_ONLY=all
const ONLY = process.env.MEDIA_CACHE_ONLY || 'question_images'
function shouldPersist(key) {
    return ONLY === 'all' || String(key).includes(ONLY)
}

function encode(value) {
    if (value == null) return null
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
        return { t: 'b', d: Buffer.from(value).toString('base64') }
    }
    return { t: 'j', d: JSON.stringify(value) }
}

function decode(obj) {
    if (!obj || typeof obj.d !== 'string') return undefined
    try {
        if (obj.t === 'b') return Buffer.from(obj.d, 'base64')
        return JSON.parse(obj.d)
    } catch (_) {
        return undefined
    }
}

function createPersistentMediaCache({
    days = Number(process.env.MEDIA_CACHE_DAYS) || 5,
    maxEntries = 2000
} = {}) {

    const ttlMs = days * 24 * 60 * 60 * 1000
    const persist = process.env.MEDIA_CACHE_PERSIST !== '0'
    const store = new Map() // key -> { value, at }

    function getCol() {
        try {
            if (!persist) return null
            if (mongoose.connection.readyState !== 1) return null
            return mongoose.connection.db.collection(COLLECTION)
        } catch (_) {
            return null
        }
    }

    async function load() {
        const col = getCol()
        if (!col) return

        try {
            const rows = await col.find({}).toArray()
            let loaded = 0

            for (const r of rows) {
                if (Date.now() - r.at > ttlMs) continue
                if (!shouldPersist(r._id)) continue
                const value = decode(r.v)
                if (value === undefined) continue
                // لا نكتب فوق مدخلة أحدث رُفعت قبل انتهاء التحميل
                if (!store.has(r._id)) {
                    store.set(r._id, { value, at: r.at })
                    loaded++
                }
            }

            // تنظيف المنتهي
            col.deleteMany({ at: { $lt: Date.now() - ttlMs } }).catch(() => { })

            console.log(`⚡ persistent mediaCache loaded: ${loaded} entries`)
        } catch (err) {
            console.log('⚠️ persistent mediaCache load failed:', err?.message)
        }
    }

    // نحمّل الآن لو Mongo متصل، وإلا أول ما يتصل
    if (persist) {
        if (mongoose.connection.readyState === 1) load()
        else mongoose.connection.once('connected', load)
    }

    return {
        get(key) {
            const entry = store.get(key)
            if (!entry) return undefined

            // منتهي: نرجع undefined فيعيد Baileys الرفع ويجدّد المدخلة
            if (Date.now() - entry.at > ttlMs) {
                store.delete(key)
                return undefined
            }

            // LRU بدون تجديد وقت الرفع
            store.delete(key)
            store.set(key, entry)
            return entry.value
        },

        set(key, value) {
            const at = Date.now()

            store.delete(key)
            store.set(key, { value, at })

            while (store.size > maxEntries) {
                store.delete(store.keys().next().value)
            }

            const col = getCol()
            const enc = encode(value)

            if (col && enc && shouldPersist(key)) {
                col.updateOne(
                    { _id: key },
                    { $set: { v: enc, at } },
                    { upsert: true }
                ).catch(() => { })
            }
        },

        del(key) {
            store.delete(key)
            const col = getCol()
            if (col) col.deleteOne({ _id: key }).catch(() => { })
        },

        flushAll() {
            store.clear()
            const col = getCol()
            if (col) col.deleteMany({}).catch(() => { })
        },

        _store: store
    }
}

// نسخة واحدة فقط حتى لو أُعيد بناء السوكت عند إعادة الاتصال
let _instance = null
function getPersistentMediaCache() {
    if (!_instance) _instance = createPersistentMediaCache()
    return _instance
}

module.exports = { createPersistentMediaCache, getPersistentMediaCache }
