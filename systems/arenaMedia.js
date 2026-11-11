// 🎬 صور وفيديوهات درافت الأنمي (للمطور فقط) — تُحفظ بـ Cloudinary + قاعدة البيانات
//
//  .صا                 → قائمة الـ50 شخصية بأرقام ثابتة، وبجانب كل واحدة ما تم وضعه (قبل / بعد / فيديو)
//  .صا <كلمة>          → نفس القائمة لكن فقط الشخصيات اللي اسمها يحتوي الكلمة
//  .صا جديد            → فقط الشخصيات الناقصة (أي شيء من الثلاثة)
//  صورة + كابشن:  .صا <رقم> قبل   → صورة الشخصية قبل التحوّل (تظهر بالبطاقة وقبل الفيديو)
//  صورة + كابشن:  .صا <رقم> بعد   → صورة الشخصية بعد التحوّل (تظهر بعد انتهاء الفيديو)
//  فيديو + كابشن: .فد <رقم>       → فيديو التحوّل لهذي الشخصية (يشتغل بمشهد التحوّل داخل المعركة)
//  .فد <رقم> حذف / .صا <رقم> قبل|بعد حذف → حذف ما وُضع
//
// الأرقام = ترتيب شخصيات الأرينا (نفس ترتيب roster.json) فلا تتغير بين مرة ومرة.
// كل شيء يتخزن بـ Cloudinary برابط ثابت (يبقى بعد الريستارت وإعادة النشر)، والموقع يقرأه وقت فتح الصفحة.

const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')

const ROSTER = JSON.parse(fs.readFileSync(path.join(__dirname, 'draftArena', 'roster.json'), 'utf8'))

const schema = new mongoose.Schema({
    id: { type: String, unique: true },       // معرّف شخصية الأرينا (gojo, luffy, ...)
    before: String, beforeId: String,
    after: String, afterId: String,
    video: String, videoId: String
}, { timestamps: true })
const ArenaMedia = mongoose.models.ArenaMedia || mongoose.model('ArenaMedia', schema)

// ───────── كاش بالذاكرة (الموقع يقرأ منه) ─────────
let cache = null
let cacheAt = 0
async function getMedia(force = false) {
    if (!force && cache && Date.now() - cacheAt < 60 * 1000) return cache
    try {
        const docs = await ArenaMedia.find({}).lean()
        const m = {}
        for (const d of docs) m[d.id] = { before: d.before || '', after: d.after || '', video: d.video || '' }
        cache = m; cacheAt = Date.now()
    } catch (e) {
        console.log('arena media load error:', e?.message || e)
        cache = cache || {}
    }
    return cache
}
const invalidate = () => { cache = null }

const statusOf = (m, id) => {
    const x = (m && m[id]) || {}
    return `${x.before ? '🖼️✅' : '🖼️❌'} ${x.after ? '🔄✅' : '🔄❌'} ${x.video ? '🎬✅' : '🎬❌'}`
}

let lastList = []   // أرقام آخر قائمة معروضة (ids)

const BEFORE_WORDS = new Set(['قبل', 'قبل_التحول', '1'])
const AFTER_WORDS = new Set(['بعد', 'بعد_التحول', '2'])

// ctx: { sock, safeSend, downloadMediaMessage, isOwner, uploadArenaImage, uploadArenaVideo, deleteArenaAsset }
// يرجّع true لو الرسالة تخصّ الأمر (عشان نوقف باقي المعالجة)
async function handleArenaMediaCommand(msg, ctx) {
    const { sock, safeSend, downloadMediaMessage, isOwner, uploadArenaImage, uploadArenaVideo, deleteArenaAsset } = ctx
    const m = msg.message
    if (!m) return false

    const vid = m.videoMessage || m.documentWithCaptionMessage?.message?.documentMessage
    const isVideoDoc = !!(vid && (vid.mimetype || '').startsWith('video'))
    const text = (
        m.imageMessage?.caption || m.videoMessage?.caption || m.documentWithCaptionMessage?.message?.documentMessage?.caption ||
        m.conversation || m.extendedTextMessage?.text || ''
    ).trim()
    const parts = text.split(/\s+/)
    const cmd = parts[0]
    if (cmd !== '.صا' && cmd !== '.فد') return false
    if (!isOwner(msg)) return true // للمطور فقط (نتجاهل بصمت)

    const jid = msg.key.remoteJid
    const media = await getMedia(true)

    try {
        // ── قائمة ──
        if (cmd === '.صا' && !m.imageMessage) {
            const arg = parts.slice(1).join(' ').trim()
            const ids = ROSTER.map(r => r.id)
            let pickIds = ids
            if (arg === 'جديد') pickIds = ids.filter(id => { const x = media[id] || {}; return !(x.before && x.after && x.video) })
            else if (arg) pickIds = ids.filter(id => { const c = ROSTER.find(r => r.id === id).c; return [c[0], c[1], c[2], id].some(v => String(v || '').toLowerCase().includes(arg.toLowerCase())) })
            if (!pickIds.length) { await safeSend(jid, { text: arg === 'جديد' ? '✅ كل الشخصيات مكتملة (قبل + بعد + فيديو)' : '❌ ما لقيت شخصية بهذا الاسم' }); return true }
            lastList = pickIds
            const lines = pickIds.map(id => {
                const c = ROSTER.find(r => r.id === id).c
                return `${ids.indexOf(id) + 1}. ${c[0]} | ${c[1]} | ${statusOf(media, id)}`
            })
            const done = ids.filter(id => { const x = media[id] || {}; return x.before && x.after && x.video }).length
            await safeSend(jid, {
                text: `📋 شخصيات درافت الأنمي (${done}/${ids.length} مكتملة)\n🖼️ = صورة قبل التحوّل • 🔄 = صورة بعد التحوّل • 🎬 = فيديو التحوّل\n\n` +
                    `• صورة + كابشن: .صا رقم قبل  أو  .صا رقم بعد\n• فيديو + كابشن: .فد رقم\n• .صا جديد (الناقص فقط) • .صا كلمة (بحث)`
            })
            const MAX = 3000; let cur = ''
            for (const l of lines) { if (cur && cur.length + l.length + 1 > MAX) { await safeSend(jid, { text: cur }); cur = '' } cur += (cur ? '\n' : '') + l }
            if (cur) await safeSend(jid, { text: cur })
            return true
        }

        // ── تحديد الشخصية (الرقم = ترتيبها الثابت 1..50) ──
        const num = Number(parts[1])
        if (!Number.isInteger(num) || num < 1 || num > ROSTER.length) {
            await safeSend(jid, { text: cmd === '.فد' ? '❌ أرسل فيديو بكابشن: .فد رقم\n(اكتب .صا لعرض الأرقام)' : '❌ أرسل صورة بكابشن: .صا رقم قبل  أو  .صا رقم بعد\n(اكتب .صا لعرض الأرقام)' })
            return true
        }
        const entry = ROSTER[num - 1], id = entry.id, cname = entry.c[0]
        const doc = (await ArenaMedia.findOne({ id }).lean()) || {}

        // ── فيديو ──
        if (cmd === '.فد') {
            if (parts[2] === 'حذف') {
                if (doc.videoId) await deleteArenaAsset(doc.videoId, 'video')
                await ArenaMedia.updateOne({ id }, { $set: { video: '', videoId: '' } }, { upsert: true })
                invalidate()
                await safeSend(jid, { text: `🗑️ تم حذف فيديو ${cname}` }); return true
            }
            if (!(m.videoMessage || isVideoDoc)) { await safeSend(jid, { text: '❌ أرسل الفيديو نفسه وبكابشنه: .فد رقم' }); return true }
            await safeSend(jid, { text: `⏳ جاري رفع فيديو ${cname}...` })
            const buffer = await downloadMediaMessage({ message: m }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
            const { url, publicId } = await uploadArenaVideo(buffer, id)
            await ArenaMedia.updateOne({ id }, { $set: { video: url, videoId: publicId } }, { upsert: true })
            invalidate()
            await safeSend(jid, { text: `✅ تم ${doc.video ? 'تغيير' : 'وضع'} فيديو ${cname}\n${statusOf({ [id]: { ...doc, video: url } }, id)}\n\nيشتغل بمشهد التحوّل داخل المعركة.` })
            return true
        }

        // ── صورة (قبل/بعد) ──
        const slotWord = String(parts[2] || '').replace(/\s/g, '')
        const slot = BEFORE_WORDS.has(slotWord) ? 'before' : AFTER_WORDS.has(slotWord) ? 'after' : null
        if (!slot) { await safeSend(jid, { text: '❌ حدّد النوع: .صا رقم قبل  أو  .صا رقم بعد' }); return true }
        const label = slot === 'before' ? 'قبل التحوّل' : 'بعد التحوّل'

        if (parts[3] === 'حذف' || parts[2] === 'حذف') {
            const pid = doc[slot + 'Id']
            if (pid) await deleteArenaAsset(pid, 'image')
            await ArenaMedia.updateOne({ id }, { $set: { [slot]: '', [slot + 'Id']: '' } }, { upsert: true })
            invalidate()
            await safeSend(jid, { text: `🗑️ تم حذف صورة (${label}) لـ ${cname}` }); return true
        }
        if (!m.imageMessage) { await safeSend(jid, { text: '❌ أرسل صورة وبكابشنها: .صا رقم قبل  أو  .صا رقم بعد' }); return true }

        const buffer = await downloadMediaMessage({ message: m }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
        const { url, publicId } = await uploadArenaImage(buffer, id, slot)
        await ArenaMedia.updateOne({ id }, { $set: { [slot]: url, [slot + 'Id']: publicId } }, { upsert: true })
        invalidate()
        const now = { ...doc, [slot]: url }
        await safeSend(jid, { text: `✅ تم ${doc[slot] ? 'تغيير' : 'وضع'} صورة (${label}) لـ ${cname}\n${statusOf({ [id]: now }, id)}` })
        return true
    } catch (err) {
        console.log('ARENA MEDIA ERROR:', err)
        await safeSend(jid, { text: '❌ حدث خطأ أثناء الحفظ: ' + String(err?.message || err).slice(0, 120) })
        return true
    }
}

module.exports = { handleArenaMediaCommand, getMedia, invalidate, ArenaMedia }
