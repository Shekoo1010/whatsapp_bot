// 🔁 يستبدل ايدي القروب القديم بـ EVENT_GROUP داخل كل ملفات مشروعك وقت التحميل فقط
// (الملفات على القرص ما تتغيّر). لازم يكون أول require في index.js
const Module = require('module')
const { EVENT_GROUP } = require('./eventGroups')

// الايدي القديمة المكتوبة داخل ملفاتك — أضف أي ايدي ثاني تبغى يتحوّل لقروب الفعاليات
const LEGACY_IDS = [
    '120363428933463078@g.us'
]

const origCompile = Module.prototype._compile
Module.prototype._compile = function (content, filename) {
    try {
        if (
            typeof content === 'string' &&
            !filename.includes('node_modules') &&
            !filename.endsWith('eventGroups.js') &&
            !filename.endsWith('groupRemap.js')
        ) {
            for (const id of LEGACY_IDS) {
                if (id !== EVENT_GROUP && content.includes(id)) {
                    content = content.split(id).join(EVENT_GROUP)
                }
            }
        }
    } catch (e) {}
    return origCompile.call(this, content, filename)
}
