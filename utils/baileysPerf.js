'use strict'

// =====================================================================
// ⚡ baileysPerf.js — تحسينات أداء لاتصال Baileys (صفر تغيير بالمنطق)
// =====================================================================
// كل دالة هنا مصممة بمبدأ "لو أي شي فشل → نرجع للسلوك القديم بالضبط":
//   - الكاش يرجع undefined  → Baileys يجلب بنفسه مثل قبل
//   - كاش الصور يفشل        → تنرسل الرسالة بنفس الرابط الأصلي مثل قبل
//   - مكتبة غير موجودة      → نستخدم البديل أو نتجاهل التحسين
// =====================================================================

// ---------------------------------------------------------------------
// 1) Logger هادئ لـ Baileys
// ---------------------------------------------------------------------
// بدون logger، Baileys يستخدم pino بمستوى info ويطبع/يبني كائنات لوق
// كثيرة مع كل رسالة. مستوى warn يبقي التحذيرات والأخطاء الحقيقية فقط.
function createBaileysLogger(level = 'warn') {
    try {
        const pino = require('pino')
        return pino({ level })
    } catch (_) {
        const noop = () => {}
        const logger = {
            level: 'silent',
            child: () => logger,
            trace: noop,
            debug: noop,
            info: noop,
            warn: noop,
            error: noop,
            fatal: noop
        }
        return logger
    }
}

// ---------------------------------------------------------------------
// 2) مفاتيح Signal بكاش بالذاكرة
// ---------------------------------------------------------------------
// useMultiFileAuthState يقرأ ملف من القرص لكل جلسة/مفتاح مع كل تشفير.
// makeCacheableSignalKeyStore هو الاستخدام الرسمي الموصى به من Baileys
// (Example/example.ts) — القراءات تنخزن بالذاكرة، والكتابات تمر للتخزين
// الأصلي مثل قبل. لو الدالة مو موجودة بنسخة Baileys نرجع state كما هو.
function wrapAuthState(state, makeCacheableSignalKeyStore, logger) {
    if (typeof makeCacheableSignalKeyStore !== 'function') return state
    try {
        return {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        }
    } catch (_) {
        return state
    }
}

// ---------------------------------------------------------------------
// 3) كاش بيانات القروبات (cachedGroupMetadata)
// ---------------------------------------------------------------------
// بدونه، كل sendMessage لقروب يرسل طلب لخوادم واتساب لجلب قائمة الأعضاء
// كاملة قبل الإرسال. هنا نخزنها بالذاكرة ونمسحها عند أي تغيير بالقروب.
function createGroupMetadataCache({ ttlMs = 10 * 60 * 1000, maxEntries = 300 } = {}) {

    const store = new Map()      // jid -> { data, at }
    const inflight = new Map()   // jid -> Promise (نمنع جلبين متزامنين لنفس القروب)
    let generation = 0           // يزيد مع كل مسح — يمنع تخزين نتيجة جلب بدأ قبل التغيير
    let fetcher = null

    function invalidate(jid) {
        generation++
        if (jid) store.delete(jid)
        else store.clear()
    }

    async function get(jid) {

        if (typeof jid !== 'string' || !jid.endsWith('@g.us')) return undefined

        const entry = store.get(jid)

        if (entry && Date.now() - entry.at < ttlMs) return entry.data

        if (!fetcher) return undefined   // Baileys يجلب بنفسه مثل السابق

        let pending = inflight.get(jid)

        if (!pending) {

            const startedGen = generation

            pending = (async () => {
                try {
                    const data = await fetcher(jid)

                    if (
                        data &&
                        Array.isArray(data.participants) &&
                        startedGen === generation
                    ) {
                        store.delete(jid)
                        store.set(jid, { data, at: Date.now() })

                        while (store.size > maxEntries) {
                            store.delete(store.keys().next().value)
                        }
                    }

                    return data
                } catch (_) {
                    return undefined   // فشل الجلب → Baileys يحاول بنفسه
                } finally {
                    inflight.delete(jid)
                }
            })()

            inflight.set(jid, pending)
        }

        return pending
    }

    function attach(sock) {

        fetcher = (jid) => sock.groupMetadata(jid)

        // أي تغيير بالقروب (اسم/إعدادات/أعضاء/دخول البوت) → نمسح ونجلب من جديد بأول إرسال
        sock.ev.on('groups.update', (updates) => {
            for (const u of updates || []) if (u && u.id) invalidate(u.id)
        })

        sock.ev.on('group-participants.update', (u) => {
            if (u && u.id) invalidate(u.id)
        })

        sock.ev.on('groups.upsert', (list) => {
            for (const g of list || []) if (g && g.id) invalidate(g.id)
        })
    }

    return { get, invalidate, attach, _store: store }
}

// ---------------------------------------------------------------------
// 4) كاش الصور المرسلة كرابط ({ image: { url } })
// ---------------------------------------------------------------------
// Baileys ينزّل الصورة من الرابط (i.ibb.co / catbox ...) مع كل رد.
// هنا ننزلها مرة وحدة ونعيد إرسالها من الذاكرة كـ Buffer.
// أي شرط غير متحقق أو أي فشل → نرسل الرسالة الأصلية بدون أي تعديل.
function installImageUrlCache(sock, {
    maxTotalBytes = 32 * 1024 * 1024,
    maxItemBytes = 4 * 1024 * 1024,
    ttlMs = 30 * 60 * 1000,
    fetchTimeoutMs = 6000,
    failTtlMs = 5 * 60 * 1000,
    fetchImpl = (typeof fetch === 'function' ? fetch : null)
} = {}) {

    const original = sock.sendMessage

    if (typeof original !== 'function' || !fetchImpl) return null
    if (sock.__imageUrlCacheInstalled) return null

    const cache = new Map()      // url -> { buf, at }
    const failed = new Map()     // url -> وقت الفشل (ما نعيد المحاولة فترة)
    const inflight = new Map()   // url -> Promise<Buffer|null>
    let totalBytes = 0

    function evictIfNeeded() {
        while (totalBytes > maxTotalBytes && cache.size > 0) {
            const oldestKey = cache.keys().next().value
            totalBytes -= cache.get(oldestKey).buf.length
            cache.delete(oldestKey)
        }
    }

    async function download(url) {

        const res = await fetchImpl(url, {
            signal: AbortSignal.timeout(fetchTimeoutMs),
            redirect: 'follow'
        })

        if (!res.ok) return null

        const type = String(res.headers.get('content-type') || '')
        if (!/^image\//i.test(type)) return null

        const declared = Number(res.headers.get('content-length') || 0)
        if (declared > maxItemBytes) return null

        const buf = Buffer.from(await res.arrayBuffer())
        if (!buf.length || buf.length > maxItemBytes) return null

        return buf
    }

    async function getBuffer(url) {

        const hit = cache.get(url)

        if (hit) {
            if (Date.now() - hit.at < ttlMs) {
                // LRU: نرجعه لآخر الترتيب
                cache.delete(url)
                cache.set(url, hit)
                return hit.buf
            }
            totalBytes -= hit.buf.length
            cache.delete(url)
        }

        const failedAt = failed.get(url)
        if (failedAt && Date.now() - failedAt < failTtlMs) return null

        let pending = inflight.get(url)

        if (!pending) {

            pending = (async () => {
                try {
                    const buf = await download(url)

                    if (!buf) {
                        failed.set(url, Date.now())
                        return null
                    }

                    cache.set(url, { buf, at: Date.now() })
                    totalBytes += buf.length
                    evictIfNeeded()

                    return buf
                } catch (_) {
                    failed.set(url, Date.now())
                    return null
                } finally {
                    inflight.delete(url)
                }
            })()

            inflight.set(url, pending)
        }

        return pending
    }

    sock.sendMessage = async function (jid, content, ...rest) {

        let finalContent = content

        try {
            const img = content && content.image

            if (
                img &&
                typeof img === 'object' &&
                !Buffer.isBuffer(img) &&
                typeof img.url === 'string' &&
                /^https?:\/\//i.test(img.url) &&
                Object.keys(img).length === 1
            ) {
                const buf = await getBuffer(img.url)
                if (buf) finalContent = { ...content, image: buf }
            }
        } catch (_) {
            finalContent = content
        }

        return original.call(sock, jid, finalContent, ...rest)
    }

    sock.__imageUrlCacheInstalled = true

    return { _cache: cache, _failed: failed }
}

// ---------------------------------------------------------------------
// 5) mediaCache الرسمي من Baileys (إعادة استخدام الصور المرفوعة)
// ---------------------------------------------------------------------
// لما تُرسل صورة بالشكل { image: { url } } (رابط أو مسار ملف)، Baileys يقدر
// يحفظ نتيجة رفعها لسيرفرات واتساب بالكاش (المفتاح: نوع الوسيط + الرابط)،
// وأي إرسال ثاني لنفس الصورة يعيد استخدام الرفع السابق: بدون تنزيل، بدون
// توليد thumbnail، بدون تشفير، بدون رفع — فقط إرسال الرسالة. هذا بالضبط
// اللي يبطّئ الأوامر لما عدة لاعبين يرسلون نفس الصورة (صورة الزعيم/شخصية).
// الكاش نفسه صغير (بروتوباف ~ كيلوبايتات لكل صورة، مو الصورة نفسها).
// يعمل فقط مع { url } — لو الصورة Buffer ما يُستخدم (سلوك Baileys الأصلي).
function createMediaCache({ ttlMs = 30 * 60 * 1000, maxEntries = 500 } = {}) {

    const store = new Map()   // key -> { value, at }

    return {
        get(key) {
            const entry = store.get(key)
            if (!entry) return undefined

            if (Date.now() - entry.at > ttlMs) {
                store.delete(key)
                return undefined
            }

            // LRU: نرجعه لآخر الترتيب بدون تجديد وقت الرفع
            store.delete(key)
            store.set(key, entry)
            return entry.value
        },

        set(key, value) {
            store.delete(key)
            store.set(key, { value, at: Date.now() })

            while (store.size > maxEntries) {
                store.delete(store.keys().next().value)
            }
        },

        del(key) {
            store.delete(key)
        },

        flushAll() {
            store.clear()
        },

        _store: store
    }
}

// نتأكد إن نسخة Baileys المثبتة فعلاً تدعم mediaCache (نقرأ ملفاتها بدل
// الافتراض). لو ما قدرنا نتأكد → false، ونرجع للسلوك القديم.
// تعطيل يدوي: DISABLE_MEDIA_CACHE=1 بمتغيرات البيئة.
function baileysSupportsMediaCache() {

    if (process.env.DISABLE_MEDIA_CACHE === '1') return false

    try {
        const fs = require('fs')
        const path = require('path')

        const baseDir = path.dirname(
            require.resolve('@whiskeysockets/baileys/package.json')
        )

        const files = [
            path.join(baseDir, 'lib', 'Utils', 'messages.js'),
            path.join(baseDir, 'lib', 'Socket', 'messages-send.js')
        ]

        return files.every(f => fs.readFileSync(f, 'utf8').includes('mediaCache'))

    } catch (_) {
        return false
    }
}

module.exports = {
    createBaileysLogger,
    wrapAuthState,
    createGroupMetadataCache,
    installImageUrlCache,
    createMediaCache,
    baileysSupportsMediaCache
}
