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

async function getBrowser() {

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
                '--disable-gpu'
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

module.exports = { getBrowser, warmBrowser }
