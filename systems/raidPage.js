// صفحة الغزو العالمي (الرايد) — القالب في raidPage.html (نفس تصميم raid-battle-2d5.html)
const fs = require('fs')
const path = require('path')

const TEMPLATE = fs.readFileSync(path.join(__dirname, 'raidPage.html'), 'utf8')
const MARK = '/*RAID_DATA*/null'

if (!TEMPLATE.includes(MARK)) throw new Error('raidPage.html: علامة RAID_DATA غير موجودة')

// JSON آمن داخل <script> (يمنع إغلاق السكربت أو كسر السطر)
function safeJson(o) {
    return JSON.stringify(o)
        .replace(/</g, '\\u003c')
        .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
        .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029')
}

function raidPageHTML({ data }) {
    return TEMPLATE.replace(MARK, () => safeJson(data))
}

module.exports = { raidPageHTML }
