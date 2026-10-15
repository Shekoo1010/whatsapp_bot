'use strict'

// =====================================================================
// ⏱️ perfTrace.js — قياس أين يضيع الوقت (قراءة فقط، صفر تغيير بالمنطق)
// =====================================================================
// يجاوب على سؤال واحد: "الـ 30 ثانية رايحة وين؟" عبر 3 أرقام تظهر بسجلات Render:
//
//   1) delivery  = متى أرسل اللاعب الرسالة ← متى وصلت للبوت
//                  (لو كبير = المشكلة بواتساب/الشبكة/نوم السيرفر، مو بكود الأوامر)
//   2) handler   = كم أخذ تنفيذ الأمر داخل البوت (قاعدة البيانات + المنطق)
//   3) send      = كم أخذ إرسال كل رد لواتساب (sock.sendMessage)
//   +  mongo     = زمن استجابة Atlas (ping) — وبنفس الوقت يبقي اتصالات المجمّع "دافئة"
//
// يطبع سطراً فقط عند وجود بطء (حتى ما يزحم السجلات). لتشغيل الطباعة لكل
// أمر (للتشخيص ليوم واحد): TRACE_ALL=1 .  لإيقاف كل شي: TRACE=0 .
// أي خطأ داخل هذا الملف يُبتلع — لا يمكن أن يوقف أمراً أو رسالة.
// =====================================================================

const ENABLED = process.env.TRACE !== '0'
const TRACE_ALL = process.env.TRACE_ALL === '1'

const SLOW_DELIVERY_MS = Number(process.env.TRACE_SLOW_DELIVERY_MS || 8000)
const SLOW_HANDLER_MS = Number(process.env.TRACE_SLOW_HANDLER_MS || 3000)
const SLOW_SEND_MS = Number(process.env.TRACE_SLOW_SEND_MS || 3000)
const SLOW_MONGO_MS = Number(process.env.TRACE_SLOW_MONGO_MS || 400)

const NOOP_TRACE = { end() {} }

function toMs(ts) {
    // messageTimestamp قد يكون رقم أو كائن Long
    try {
        if (ts == null) return 0
        const n = typeof ts === 'object' && typeof ts.toNumber === 'function'
            ? ts.toNumber()
            : Number(ts)
        return Number.isFinite(n) && n > 0 ? n * 1000 : 0
    } catch (_) {
        return 0
    }
}

function firstToken(m) {
    try {
        const t =
            m?.message?.conversation ||
            m?.message?.extendedTextMessage?.text ||
            m?.message?.imageMessage?.caption ||
            ''
        return String(t).trim().split(/\s+/)[0].slice(0, 24) || '(non-text)'
    } catch (_) {
        return '?'
    }
}

// ---------------------------------------------------------------------
// 1) تتبع رسالة واردة: زمن الوصول + زمن المعالجة
// ---------------------------------------------------------------------
function begin(m) {
    if (!ENABLED) return NOOP_TRACE

    try {
        const startedAt = Date.now()
        const sentAtMs = toMs(m?.messageTimestamp)
        // فرق الساعات بين سيرفر Render وواتساب قد يعطي ±ثانية أو ثانيتين — لا نحكم على أقل من ذلك
        const delivery = sentAtMs ? Math.max(0, startedAt - sentAtMs) : -1
        const cmd = firstToken(m)

        return {
            end() {
                try {
                    const handler = Date.now() - startedAt
                    const slowDelivery = delivery >= SLOW_DELIVERY_MS
                    const slowHandler = handler >= SLOW_HANDLER_MS

                    if (TRACE_ALL || slowDelivery || slowHandler) {
                        console.log(
                            `⏱️ TRACE cmd=${cmd} delivery=${delivery < 0 ? 'n/a' : delivery + 'ms'} ` +
                            `handler=${handler}ms` +
                            (slowDelivery ? '  ⚠️ وصلت متأخرة من واتساب/الشبكة' : '') +
                            (slowHandler ? '  ⚠️ معالجة بطيئة داخل البوت' : '')
                        )
                    }
                } catch (_) { /* لا شي */ }
            }
        }
    } catch (_) {
        return NOOP_TRACE
    }
}

// ---------------------------------------------------------------------
// 2) تتبع زمن الإرسال لواتساب (يلفّ sock.sendMessage بدون تغيير النتيجة)
// ---------------------------------------------------------------------
function wrapSend(sock) {
    if (!ENABLED) return sock

    try {
        if (!sock || typeof sock.sendMessage !== 'function' || sock.sendMessage.__traced) return sock

        const original = sock.sendMessage

        const traced = async function (jid, content, ...rest) {
            const t0 = Date.now()
            try {
                return await original.call(sock, jid, content, ...rest)
            } finally {
                try {
                    const dt = Date.now() - t0
                    if (TRACE_ALL || dt >= SLOW_SEND_MS) {
                        const kind = content && typeof content === 'object'
                            ? (content.image ? 'image' : content.video ? 'video' : content.audio ? 'audio' : content.sticker ? 'sticker' : content.text !== undefined ? 'text' : 'other')
                            : 'other'
                        console.log(`⏱️ TRACE send kind=${kind} took=${dt}ms${dt >= SLOW_SEND_MS ? '  ⚠️ إرسال بطيء' : ''}`)
                    }
                } catch (_) { /* لا شي */ }
            }
        }

        traced.__traced = true
        // نحافظ على أي علامات وضعتها طبقات الحماية السابقة
        for (const k of Object.keys(original)) traced[k] = original[k]
        sock.sendMessage = traced
    } catch (_) { /* لا شي */ }

    return sock
}

// ---------------------------------------------------------------------
// 3) فحص Mongo كل ~45 ثانية: يقيس الزمن + يستخدم عدة اتصالات بالتوازي
//    فتبقى كل اتصالات المجمّع حيّة (بدل ما يكتشف أول أمر بعد خمول إن اتصاله مات)
// ---------------------------------------------------------------------
function startMongoProbe(mongoose, { everyMs = 45000, parallel = 5 } = {}) {
    if (!ENABLED || process.env.MONGO_WARM === '0') return null
    if (global.__mongoProbeStarted) return null
    global.__mongoProbeStarted = true

    let running = false

    const tick = async () => {
        if (running) return
        running = true

        try {
            if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return

            const db = mongoose.connection.db
            const t0 = Date.now()

            const times = await Promise.all(
                Array.from({ length: parallel }, async () => {
                    const s = Date.now()
                    await db.command({ ping: 1 })
                    return Date.now() - s
                })
            )

            const worst = Math.max(...times)

            if (TRACE_ALL || worst >= SLOW_MONGO_MS) {
                console.log(
                    `⏱️ TRACE mongo ping worst=${worst}ms best=${Math.min(...times)}ms total=${Date.now() - t0}ms` +
                    (worst >= SLOW_MONGO_MS ? '  ⚠️ قاعدة البيانات بطيئة/بعيدة (تأكد أن منطقة Atlas = منطقة Render)' : '')
                )
            }
        } catch (err) {
            console.log('⏱️ TRACE mongo ping failed:', err?.message || err)
        } finally {
            running = false
        }
    }

    const timer = setInterval(tick, everyMs)
    if (timer.unref) timer.unref()

    return timer
}

module.exports = { begin, wrapSend, startMongoProbe }
