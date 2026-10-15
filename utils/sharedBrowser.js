'use strict'

// =====================================================================
// ⚡ sharedBrowser.js — متصفح Puppeteer واحد مشترك لكل توليد الصور
// =====================================================================
// قبل: كل ملف (myRosterCard / galleryTournamentDesign) يشغّل متصفح Chrome
//   خاص فيه، ولو وصل طلبين بنفس اللحظة قبل ما يجهز المتصفح كان يُشغَّل
//   Chrome لكل طلب (كلها تستهلك RAM/CPU وتبطّئ البوت كامل).
// الآن: متصفح واحد فقط، وطلبات التشغيل المتزامنة تنتظر نفس العملية.
// نفس خيارات التشغيل القديمة بالضبط + خيارين للحاويات (Render/Docker).
// =====================================================================

const puppeteer = require('puppeteer')

let browserInstance = null
let launching = null
let lastUsedAt = Date.now()

async function getBrowser() {

    lastUsedAt = Date.now()

    if (browserInstance && browserInstance.isConnected()) return browserInstance

    if (!launching) {

        launching = puppeteer.launch({
            headless: 'new',
            executablePath: process.env.CHROME_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                // /dev/shm صغير جداً بحاويات مثل Render → يسبب بطء/انهيار Chrome
                '--disable-dev-shm-usage',
                '--disable-gpu',
                // ⚡ أعلام توفير ذاكرة/CPU فقط (لا تغيّر شكل الصورة). تعطيلها: BROWSER_EXTRA_FLAGS=0
                ...(process.env.BROWSER_EXTRA_FLAGS === '0' ? [] : [
                    '--disable-extensions',
                    '--disable-background-networking',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--no-first-run',
                    '--mute-audio'
                ])
            ]
        })
            .then((browser) => {
                browserInstance = browser
                return browser
            })
            .finally(() => {
                launching = null
            })
    }

    return launching
}

// تسخين المتصفح بالخلفية عشان أول أمر صور ما يدفع كلفة التشغيل (ثواني)
function warmBrowser() {
    return getBrowser().catch((err) => {
        console.log('⚠️ Browser warm-up failed (non-fatal):', err?.message || err)
    })
}

// ---------------------------------------------------------------------
// ⚡ حد للصفحات المتزامنة (افتراضي 2): كل صفحة بطاقة = 1720×2224 بكسل (DPR 2)
// وتستهلك عشرات الميجابايتات. لو وصل 5 طلبات بنفس اللحظة كانت تُفتح 5 صفحات
// دفعة وحدة → ضغط رام (Render 512MB) → بطء أو إعادة تشغيل الخدمة كاملة.
// الآن الزائد ينتظر دوره (نفس النتيجة النهائية، فقط بدون انهيار).
// عند الحمل الطبيعي (طلب واحد كل مرة) لا فرق إطلاقاً. تغيير الحد: BROWSER_MAX_PAGES
// ---------------------------------------------------------------------
const MAX_PAGES = Math.max(1, Number(process.env.BROWSER_MAX_PAGES || 2))
const SLOT_SAFETY_MS = 90 * 1000   // صمام أمان: لو صفحة ما انغلقت لأي سبب نحرر مكانها

let activePages = 0
const waiters = []

function acquireSlot() {
    if (activePages < MAX_PAGES) {
        activePages++
        return Promise.resolve()
    }
    return new Promise(resolve => waiters.push(resolve))
}

function releaseSlot() {
    const next = waiters.shift()
    if (next) next()          // ننقل المكان للتالي مباشرة (activePages ثابت)
    else activePages = Math.max(0, activePages - 1)
}

// بديل مباشر لـ: const browser = await getBrowser(); const page = await browser.newPage()
// نفس كائن page الأصلي، وأي page.close() (الموجود أصلاً بكل finally) يحرر المكان.
async function newLimitedPage() {

    await acquireSlot()

    let released = false
    const release = () => {
        if (released) return
        released = true
        clearTimeout(safety)
        releaseSlot()
    }
    const safety = setTimeout(release, SLOT_SAFETY_MS)
    if (safety.unref) safety.unref()

    try {
        const browser = await getBrowser()
        const page = await browser.newPage()

        const originalClose = page.close.bind(page)
        page.close = async (...args) => {
            try {
                return await originalClose(...args)
            } finally {
                release()
            }
        }

        return page
    } catch (err) {
        release()
        throw err
    }
}

// ---------------------------------------------------------------------
// 🧹 (اختياري، مُعطّل افتراضياً) إغلاق Chrome بعد خمول لتحرير الرام (~150-300MB)
// وإعادة تشغيله تلقائياً عند أول طلب. فعّله بـ BROWSER_IDLE_CLOSE_MS=900000 (15 دقيقة)
// فقط لو سجلات HEALTH أظهرت أن rss قريب من حد الرام. الثمن: أول بطاقة بعد الخمول أبطأ بثواني.
// ---------------------------------------------------------------------
const IDLE_CLOSE_MS = Number(process.env.BROWSER_IDLE_CLOSE_MS || 0)

if (IDLE_CLOSE_MS > 0) {
    const t = setInterval(() => {
        try {
            if (!browserInstance || launching) return
            if (activePages > 0 || waiters.length > 0) return
            if (Date.now() - lastUsedAt < IDLE_CLOSE_MS) return

            const b = browserInstance
            browserInstance = null
            global.browserWarmStarted = false
            console.log('🧹 Chrome idle — closing to free RAM')
            b.close().catch(() => {})
        } catch (_) { /* لا شي */ }
    }, 60 * 1000)
    if (t.unref) t.unref()
}

module.exports = { getBrowser, warmBrowser, newLimitedPage }
