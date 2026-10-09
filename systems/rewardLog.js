'use strict'

/**
 * 🎁 سجل الجوائز — آخر 30 جائزة وصلت اللاعب من أي مصدر (عجلة، معرض، زعيم، ...)
 * يظهر بالموقع: /u/<كود>/rewards
 *
 * بـ index.js مرة وحدة:   require('./systems/rewardLog').init(Player)
 * وبأي ملف تبي تسجّل منه (بعد منح الجائزة):
 *   require('./rewardLog').logReward(userId, { src: 'المعرض', icon: '🖼️', lines: ['💰 50,000 مال', '📦 صندوق اسطوري'] })
 * لا ترمي أخطاء أبداً (آمنة داخل أي نظام جوائز)، ولا تحتاج await.
 */

const MAX = 30
let _Player = null

function init(Player) { _Player = Player }

async function logReward(userId, e) {
    try {
        if (!_Player || !userId || !e) return
        const lines = (Array.isArray(e.lines) ? e.lines : []).map(x => String(x).slice(0, 80)).slice(0, 8)
        if (!lines.length) return
        const entry = {
            at: Date.now(),
            src: String(e.src || 'جائزة').slice(0, 40),
            icon: String(e.icon || '🎁').slice(0, 8),
            lines
        }
        // ذرّي: نضيف ونقص على آخر 10 فقط — بدون ما نلمس باقي بيانات اللاعب
        await _Player.updateOne({ userId }, { $push: { rewardLog: { $each: [entry], $slice: -MAX } } })
    } catch (err) {
        console.error('rewardLog error:', err && err.message)
    }
}

module.exports = { init, logReward, MAX }
