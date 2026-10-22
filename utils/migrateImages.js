// =========================
// 🚚 نقل صور الكتالوج من catbox/postimg إلى Cloudinary (أمر للمطور)
// لا يعدّل characters.json إلا بأمر "تطبيق" الصريح، وبعد أخذ نسخة احتياطية.
// =========================
const fs = require('fs')
const path = require('path')
const { uploadCatalogImage, uploadCatalogImageFromUrl } = require('./cloudinary')

const ROOT = path.join(__dirname, '..')
const CHARS_PATH = path.join(ROOT, 'characters.json')
const MIGRATED_PATH = path.join(ROOT, 'characters.migrated.json')
const BACKUP_PATH = path.join(ROOT, 'characters.backup.json')
const STATE_PATH = path.join(ROOT, 'migrate_state.json') // قديم -> جديد (للاستئناف)

const OLD_HOSTS = ['files.catbox.moe', 'catbox.moe', 'i.postimg.cc', 'postimg.cc']
const CONC = 4
const DL_TIMEOUT = 25000

let running = false

const isOld = u => {
    try { return OLD_HOSTS.some(h => new URL(u).hostname === h || new URL(u).hostname.endsWith('.' + h)) }
    catch { return false }
}
const keyOf = c => `${c.name}|${c.form || ''}|${c.anime || ''}`

const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return d } }
const writeJson = (p, v) => { fs.writeFileSync(p + '.tmp', JSON.stringify(v, null, 2)); fs.renameSync(p + '.tmp', p) }

async function download(url) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), DL_TIMEOUT)
    try {
        const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const type = r.headers.get('content-type') || ''
        if (!type.startsWith('image/')) throw new Error('ليس صورة (' + type + ')')
        return Buffer.from(await r.arrayBuffer())
    } finally { clearTimeout(t) }
}

async function runMigration(reply, onlyRarity, sendFile) {
    const chars = readJson(CHARS_PATH, null)
    if (!Array.isArray(chars)) return reply('❌ تعذّرت قراءة characters.json')
    const state = readJson(STATE_PATH, {})
    const out = JSON.parse(JSON.stringify(chars)) // نسخة عمل؛ الأصل لا يُكتب عليه
    const todo = out.filter(c => c.image && isOld(c.image) && (!onlyRarity || c.rarity === onlyRarity))
    const failed = []
    let done = 0, i = 0

    await reply(`🚚 بدأ النقل: ${todo.length} صورة${onlyRarity ? ' (' + onlyRarity + ')' : ''}.\nملف الشخصيات الأصلي لن يتغير.`)

    async function worker() {
        while (i < todo.length) {
            const c = todo[i++]
            const old = c.image
            try {
                if (!state[old]) {
                    let url
                    try {
                        const buf = await download(old)
                        ;({ url } = await uploadCatalogImage(buf, keyOf(c)))
                    } catch (e1) {
                        ;({ url } = await uploadCatalogImageFromUrl(old, keyOf(c)))
                    }
                    state[old] = url
                }
                c.image = state[old]
            } catch (e) {
                failed.push(`${c.name} | ${old} | ${e.message}`)
            }
            done++
            if (done % 50 === 0) {
                writeJson(STATE_PATH, state)
                await reply(`⏳ ${done}/${todo.length} (فشل: ${failed.length})`)
            }
        }
    }
    await Promise.all(Array.from({ length: CONC }, worker))

    // تطبيق ما نجح سابقاً أيضاً (استئناف)
    for (const c of out) if (state[c.image]) c.image = state[c.image]
    writeJson(STATE_PATH, state)
    writeJson(MIGRATED_PATH, out)
    if (failed.length) fs.writeFileSync(path.join(ROOT, 'migrate_failed.txt'), failed.join('\n'))

    await reply(
        `✅ انتهى.\nنجح: ${todo.length - failed.length}\nفشل: ${failed.length}` +
        `\nالنتيجة في characters.migrated.json (الأصل سليم).` +
        `\nراجعها ثم أرسل: .نقل_الصور تطبيق` +
        (failed.length ? `\nلإعادة محاولة الفاشل أرسل الأمر مرة أخرى (يكمل من حيث توقف).` : '')
    )
    await sendResultFiles(sendFile)
}

// يرسل الملفات الناتجة كمستندات بالواتساب (لو الدالة متوفرة)
async function sendResultFiles(sendFile) {
    if (!sendFile) return
    for (const f of [MIGRATED_PATH, path.join(ROOT, 'migrate_failed.txt')]) {
        if (fs.existsSync(f)) await sendFile(f, path.basename(f)).catch(() => {})
    }
}

// reply: دالة ترسل نصاً للمحادثة، args: النص بعد اسم الأمر
// الاستخدام: .نقل_الصور | .نقل_الصور sss | .نقل_الصور حالة | .نقل_الصور ملف | .نقل_الصور تطبيق
async function handleMigrateCommand(reply, args = '', sendFile) {
    const arg = String(args).trim()

    if (arg === 'حالة') {
        const chars = readJson(CHARS_PATH, [])
        const left = chars.filter(c => c.image && isOld(c.image)).length
        const st = Object.keys(readJson(STATE_PATH, {})).length
        return reply(`📊 صور على المضيفات القديمة: ${left}\nمنقولة ومحفوظة بالحالة: ${st}\nجارٍ العمل: ${running ? 'نعم' : 'لا'}`)
    }

    if (arg === 'ملف') {
        if (!fs.existsSync(MIGRATED_PATH)) return reply('❌ لا يوجد ملف ناتج، شغّل النقل أولاً.')
        return sendResultFiles(sendFile)
    }

    if (arg === 'تطبيق') {
        if (!fs.existsSync(MIGRATED_PATH)) return reply('❌ لا يوجد characters.migrated.json، شغّل النقل أولاً.')
        const m = readJson(MIGRATED_PATH, null)
        const o = readJson(CHARS_PATH, null)
        if (!Array.isArray(m) || !Array.isArray(o) || m.length !== o.length)
            return reply('❌ الملف الناتج لا يطابق الأصل في العدد، لم أطبّق شيئاً.')
        fs.copyFileSync(CHARS_PATH, BACKUP_PATH)
        writeJson(CHARS_PATH, m)
        return reply('✅ طُبّق. النسخة الاحتياطية: characters.backup.json\n⚠️ أعد تشغيل البوت ليقرأ الملف الجديد.')
    }

    if (running) return reply('⏳ النقل يعمل حالياً.')
    running = true
    try {
        await runMigration(reply, arg.toUpperCase() === 'SSS' ? 'SSS' : null, sendFile)
    } catch (e) {
        await reply('❌ توقف النقل: ' + e.message)
    } finally { running = false }
}

module.exports = { handleMigrateCommand }
