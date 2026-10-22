// =========================
// 🚚 نقل صور أسئلة التخمين (imageQuestions.js) من catbox/postimg إلى Cloudinary
// نفس أسلوب migrateImages.js: لا يعدّل الأصل إلا بأمر "تطبيق" وبعد نسخة احتياطية.
// =========================
const fs = require('fs')
const path = require('path')
const { uploadQuestionImage, uploadQuestionImageFromUrl } = require('./cloudinary')

const ROOT = path.join(__dirname, '..')                       // عدّله لو imageQuestions.js في مكان آخر
const Q_PATH = path.join(ROOT, 'imageQuestions.js')
const MIGRATED_PATH = path.join(ROOT, 'imageQuestions.migrated.js')
const BACKUP_PATH = path.join(ROOT, 'imageQuestions.backup.js')
const STATE_PATH = path.join(ROOT, 'migrate_questions_state.json') // قديم -> جديد (للاستئناف)

const OLD_HOSTS = ['files.catbox.moe', 'catbox.moe', 'i.postimg.cc', 'postimg.cc']
const CONC = 4
const DL_TIMEOUT = 25000

let running = false

const isOld = u => {
    try { const h = new URL(u).hostname; return OLD_HOSTS.some(o => h === o || h.endsWith('.' + o)) }
    catch { return false }
}
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return d } }
const writeJson = (p, v) => { fs.writeFileSync(p + '.tmp', JSON.stringify(v, null, 2)); fs.renameSync(p + '.tmp', p) }

// يستخرج كل روابط الصور القديمة من نص الملف (image: '...')
function extractUrls(src) {
    const re = /image:\s*(['"])(https?:\/\/[^'"]+)\1/g
    const urls = []
    let m
    while ((m = re.exec(src))) if (isOld(m[2])) urls.push(m[2])
    return [...new Set(urls)]
}

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

async function runMigration(reply, sendFile) {
    if (!fs.existsSync(Q_PATH)) return reply('❌ ما لقيت imageQuestions.js في: ' + Q_PATH)
    const src = fs.readFileSync(Q_PATH, 'utf8')
    const state = readJson(STATE_PATH, {})
    const todo = extractUrls(src)
    const failed = []
    let done = 0, i = 0

    await reply(`🚚 بدأ نقل صور الأسئلة: ${todo.length} صورة.\nالملف الأصلي لن يتغير.`)

    async function worker() {
        while (i < todo.length) {
            const old = todo[i++]
            try {
                if (!state[old]) {
                    let url
                    try {
                        const buf = await download(old)
                        ;({ url } = await uploadQuestionImage(buf, old))
                    } catch (e1) {
                        ;({ url } = await uploadQuestionImageFromUrl(old, old))
                    }
                    state[old] = url
                }
            } catch (e) {
                failed.push(`${old} | ${e.message}`)
            }
            done++
            if (done % 50 === 0) {
                writeJson(STATE_PATH, state)
                await reply(`⏳ ${done}/${todo.length} (فشل: ${failed.length})`)
            }
        }
    }
    await Promise.all(Array.from({ length: CONC }, worker))

    // استبدال الروابط داخل النص مع الحفاظ على التنسيق كما هو
    let out = src
    for (const [oldUrl, newUrl] of Object.entries(state)) out = out.split(oldUrl).join(newUrl)

    writeJson(STATE_PATH, state)
    fs.writeFileSync(MIGRATED_PATH, out)
    if (failed.length) fs.writeFileSync(path.join(ROOT, 'migrate_questions_failed.txt'), failed.join('\n'))

    await reply(
        `✅ انتهى.\nنجح: ${todo.length - failed.length}\nفشل: ${failed.length}` +
        `\nالنتيجة في imageQuestions.migrated.js (الأصل سليم).` +
        `\nراجعها ثم أرسل: .نقل_الاسئلة تطبيق` +
        (failed.length ? `\nلإعادة محاولة الفاشل أرسل الأمر مرة أخرى (يكمل من حيث توقف).` : '')
    )
    await sendResultFiles(sendFile)
}

async function sendResultFiles(sendFile) {
    if (!sendFile) return
    for (const f of [MIGRATED_PATH, path.join(ROOT, 'migrate_questions_failed.txt')]) {
        if (fs.existsSync(f)) await sendFile(f, path.basename(f)).catch(() => {})
    }
}

// الاستخدام: .نقل_الاسئلة | .نقل_الاسئلة حالة | .نقل_الاسئلة ملف | .نقل_الاسئلة تطبيق
async function handleMigrateQuestionsCommand(reply, args = '', sendFile) {
    const arg = String(args).trim()

    if (arg === 'حالة') {
        const left = fs.existsSync(Q_PATH) ? extractUrls(fs.readFileSync(Q_PATH, 'utf8')).length : 0
        const st = Object.keys(readJson(STATE_PATH, {})).length
        return reply(`📊 صور أسئلة على المضيفات القديمة: ${left}\nمنقولة ومحفوظة بالحالة: ${st}\nجارٍ العمل: ${running ? 'نعم' : 'لا'}`)
    }

    if (arg === 'ملف') {
        if (!fs.existsSync(MIGRATED_PATH)) return reply('❌ لا يوجد ملف ناتج، شغّل النقل أولاً.')
        return sendResultFiles(sendFile)
    }

    if (arg === 'تطبيق') {
        if (!fs.existsSync(MIGRATED_PATH)) return reply('❌ لا يوجد imageQuestions.migrated.js، شغّل النقل أولاً.')
        const m = fs.readFileSync(MIGRATED_PATH, 'utf8')
        const o = fs.readFileSync(Q_PATH, 'utf8')
        const count = s => (s.match(/image:\s*['"]/g) || []).length
        if (count(m) !== count(o)) return reply('❌ الملف الناتج لا يطابق الأصل في عدد الأسئلة، لم أطبّق شيئاً.')
        fs.copyFileSync(Q_PATH, BACKUP_PATH)
        fs.writeFileSync(Q_PATH, m)
        return reply('✅ طُبّق. النسخة الاحتياطية: imageQuestions.backup.js\n⚠️ أعد تشغيل البوت ليقرأ الملف الجديد.')
    }

    if (running) return reply('⏳ النقل يعمل حالياً.')
    running = true
    try {
        await runMigration(reply, sendFile)
    } catch (e) {
        await reply('❌ توقف النقل: ' + e.message)
    } finally { running = false }
}

module.exports = { handleMigrateQuestionsCommand }
