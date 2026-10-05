// =====================================================================
// systems/bossVoice.js
// أصوات الزعماء — ضع الملفات في مجلد boss_voices (بجانب bosses.js)
// التسمية:  رقم_الزعيم _ رقم_الصوت . امتداد      مثال: 3_1.mp3
// رقم الزعيم = ترتيبه في bosses.js (1..10)، وأرقام الأصوات متسلسلة من 1
//
// توزيع الأصوات على المواقف (الرقم 1..4):
//   1 = عند ظهور الزعيم
//   2 = عند وصول دمه 75%
//   3 = عند ظهور الأتباع
//   4 = عند وصول دمه 10%
//
// عدد أصوات الزعيم:
//   4 أصوات → كل صوت لموقفه
//   3 أصوات → المواقف 1 و 2 و 3 فقط (بدون صوت عند 10%)
//   صوتان   → يتكرران: A,B,A,B
//   صوت واحد → عند الظهور فقط
// =====================================================================

const fs = require('fs')

const FILE_RE = /^(\d+)_(\d+)\.(mp3|ogg|opus|m4a|aac|wav)$/i

// يحوّل قائمة الأصوات المرتبة إلى 4 خانات (null = بدون صوت)
function toSlots(list) {
    const n = list.length
    if (n >= 4) return list.slice(0, 4)
    if (n === 3) return [list[0], list[1], list[2], null]
    if (n === 2) return [list[0], list[1], list[0], list[1]]
    if (n === 1) return [list[0], null, null, null]
    return [null, null, null, null]
}

function buildManifest(dir, bosses) {
    let files = []
    try { files = fs.readdirSync(dir) } catch (_) { return {} }

    const byBoss = {} // رقم الزعيم -> { رقم الصوت -> اسم الملف }
    for (const f of files) {
        const m = FILE_RE.exec(f)
        if (!m) continue
        const b = Number(m[1]), v = Number(m[2])
        if (!byBoss[b]) byBoss[b] = {}
        if (!byBoss[b][v]) byBoss[b][v] = f
    }

    const out = {}
    for (const [num, voices] of Object.entries(byBoss)) {
        const boss = bosses[Number(num) - 1]
        if (!boss) continue
        const list = Object.keys(voices)
            .map(Number).sort((a, b) => a - b)
            .map(k => '/boss_voices/' + encodeURIComponent(voices[k]))
        out[boss.name] = toSlots(list)
    }
    return out
}

function mountBossVoice(app, express, { dir, bosses }) {
    app.use('/boss_voices', express.static(dir, { maxAge: '1h', index: false, dotfiles: 'ignore' }))

    let cache = null, cacheAt = 0
    app.get('/boss-voice/manifest.json', (req, res) => {
        const now = Date.now()
        if (!cache || now - cacheAt > 10000) {
            cache = buildManifest(dir, bosses)
            cacheAt = now
        }
        res.json(cache)
    })
}

module.exports = { mountBossVoice, buildManifest }
