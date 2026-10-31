// utils/mediaWarmer.js
// ⚡ تسخين صور المسابقة بالخلفية — بدون إرسال أي رسالة لأي محادثة.
//
// يرفع الصور لواتساب عبر prepareWAMessageMedia ويحفظ نتيجة الرفع بنفس كاش
// Baileys (mediaCache)، فلما تجي الصورة بالسؤال تُرسل فوراً من الكاش.
// - صورة وحدة كل مرة، بفاصل بينها، وبعد دقيقتين من التشغيل
// - يتخطى الصور الموجودة بالكاش (الدائم بـ Mongo) فبعد أول مرة ما يرفع إلا المنتهي
// - يتوقف مؤقتاً لو البوت مشغول (تأخر الحلقة الرئيسية)
// - يعيد الفحص كل 12 ساعة ليجدد الصور المنتهية قبل ما تتأخر باللعب
// إعدادات (متغيرات بيئة): MEDIA_WARM=0 تعطيل، MEDIA_WARM_GAP_MS (افتراضي 2500)

const { prepareWAMessageMedia } = require('@whiskeysockets/baileys')

const START_DELAY_MS = 2 * 60 * 1000
const RECHECK_MS = 12 * 60 * 60 * 1000
const GAP_MS = Number(process.env.MEDIA_WARM_GAP_MS) || 2500

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ننتظر لو الحلقة الرئيسية مزدحمة (البوت يرد على أوامر)
async function waitForCalm() {
    for (let i = 0; i < 20; i++) {
        const t = Date.now()
        await sleep(50)
        const lag = Date.now() - t - 50
        if (lag < 150) return
        await sleep(3000)
    }
}

function startMediaWarmer({ getSock, getCache, getUrls }) {

    let running = false
    let keyChecked = false

    async function pass() {

        if (running) return
        running = true

        let uploaded = 0
        let skipped = 0
        let failed = 0

        try {
            const urls = [...new Set(getUrls().filter(Boolean))]

            for (const url of urls) {

                const cache = getCache()
                const sock = getSock()

                // السوكت غير متصل: نوقف التمريرة ونعيد المحاولة بالدورة القادمة
                if (!cache || !sock?.user || typeof sock.waUploadToServer !== 'function') break

                // موجودة بالكاش وما انتهت: نتخطاها
                if (cache.get(`image:${url}`) !== undefined) {
                    skipped++
                    continue
                }

                await waitForCalm()

                try {
                    await prepareWAMessageMedia(
                        { image: { url } },
                        {
                            upload: sock.waUploadToServer,
                            mediaCache: cache,
                            logger: sock.logger,
                            options: {}
                        }
                    )
                    uploaded++

                    // تحقق مرة وحدة إن صيغة مفتاح الكاش مطابقة لما يتوقعه Baileys
                    // (لو لا، نوقف حتى ما نرفع صور بلا فائدة)
                    if (!keyChecked) {
                        keyChecked = true
                        if (cache.get(`image:${url}`) === undefined) {
                            console.log('⚠️ mediaWarmer: صيغة مفتاح الكاش مختلفة بنسخة Baileys الحالية — تم إيقاف التسخين')
                            return 'stop'
                        }
                    }
                } catch (err) {
                    failed++
                }

                await sleep(GAP_MS)
            }
        } finally {
            running = false
            console.log(`🔥 mediaWarmer: uploaded ${uploaded}, already cached ${skipped}, failed ${failed}`)
        }
    }

    async function loop() {
        const res = await pass().catch(() => null)
        if (res === 'stop') return
        setTimeout(loop, RECHECK_MS)
    }

    setTimeout(loop, START_DELAY_MS)
}

module.exports = { startMediaWarmer }
