// 🖼️ صور الكتالوج العامة (للمطور فقط)
//  .ص            → يرسل ملف مرقّم بالشخصيات اللي بدون صورة
//  .ص <رقم>      → ككابشن على صورة: يضع الصورة للشخصية لكل اللاعبين
//
// كيف تشتغل:
//  • الرابط يتخزّن بالقاعدة (CatalogImage) → يبقى بعد الريستارت وإعادة النشر
//  • عند الإقلاع (وعند كل حفظ) نكتب image بكائن الكتالوج بالذاكرة
//  • البوت (.عرض...) والموقع (characterSite) يجيبون الصورة من الكتالوج وقت
//    العرض بمطابقة name+rarity+form → تظهر للجميع بدون لمس مستندات اللاعبين
//  • .استبدال (customImage) يظل أولوية للاعب نفسه

const mongoose = require('mongoose')

const schema = new mongoose.Schema(
    { key: { type: String, unique: true }, url: String, publicId: String },
    { timestamps: true }
)
const CatalogImage = mongoose.models.CatalogImage || mongoose.model('CatalogImage', schema)

// نفس مفتاح الموقع (name|rarity|form) — وهو فريد بالكتالوج الحالي
const keyOf = c => `${c.name}|${c.rarity}|${c.form}`
const isEmpty = c => !c.image || !String(c.image).trim()

let lastList = []   // مفاتيح آخر قائمة أُرسلت — الأرقام تبقى ثابتة بين الحفظات

async function loadAndApply(characters) {
    try {
        const docs = await CatalogImage.find({}).lean()
        const map = new Map(docs.map(d => [d.key, d.url]))
        let n = 0
        for (const c of characters) {
            if (isEmpty(c) && map.has(keyOf(c))) { c.image = map.get(keyOf(c)); n++ }
        }
        console.log(`🖼️ catalog images applied: ${n}`)
    } catch (err) {
        console.log('catalog images load error:', err?.message || err)
    }
}

// ctx: { sock, safeSend, downloadMediaMessage, uploadCatalogImage, isOwner, characters }
// يرجّع true لو الرسالة تخصّ الأمر (عشان نوقف باقي المعالجة)
async function handleCatalogImageCommand(msg, ctx) {
    const { sock, safeSend, downloadMediaMessage, uploadCatalogImage, isOwner, characters } = ctx
    const m = msg.message
    if (!m) return false

    const text = (
        m.imageMessage?.caption || m.conversation || m.extendedTextMessage?.text || ''
    ).trim()
    const parts = text.split(/\s+/)
    if (parts[0] !== '.ص') return false
    if (!isOwner(msg)) return true      // للمطور فقط (نتجاهل بصمت)

    const jid = msg.key.remoteJid

    try {
        // ── .ص (بدون صورة) → ملف القائمة ──
        if (!m.imageMessage) {
            const missing = characters.filter(isEmpty)
            lastList = missing.map(keyOf)
            if (!missing.length) {
                await safeSend(jid, { text: '✅ كل الشخصيات عندها صور' })
                return true
            }
            const body = missing.map((c, i) =>
                `${i + 1}. ${c.name} | ${c.form || '-'} | ${c.anime || '-'} | ${c.rarity} | ${c.power ?? '-'}`
            ).join('\n')
            await sock.sendMessage(jid, {
                document: Buffer.from(body, 'utf8'),
                mimetype: 'text/plain',
                fileName: 'characters_no_image.txt',
                caption: `📋 ${missing.length} شخصية بدون صورة\nأرسل صورة بكابشن: .ص رقم`
            })
            return true
        }

        // ── .ص رقم + صورة ──
        const num = Number(parts[1])
        if (!Number.isInteger(num) || num < 1) {
            await safeSend(jid, { text: '❌ أرسل صورة وبكابشنها: .ص رقم\n(اكتب .ص لوحدها لعرض القائمة)' })
            return true
        }
        const key = lastList[num - 1]
        if (!key) {
            await safeSend(jid, { text: '❌ رقم غير موجود — اكتب .ص لتحديث القائمة' })
            return true
        }
        const c = characters.find(x => keyOf(x) === key)
        if (!c) {
            await safeSend(jid, { text: '❌ الشخصية ما عادت بالكتالوج — اكتب .ص لتحديث القائمة' })
            return true
        }

        const buffer = await downloadMediaMessage(
            { message: m }, 'buffer', {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
        )
        const { url, publicId } = await uploadCatalogImage(buffer, key)

        await CatalogImage.updateOne({ key }, { $set: { url, publicId } }, { upsert: true })
        c.image = url   // كائن الكتالوج المشترك → يظهر فوراً بالبوت والموقع

        await safeSend(jid, {
            text: `✅ تم وضع صورة ${c.name} (${c.rarity}) للجميع\n\nالأرقام لم تتغير — كمّل بنفس القائمة، أو .ص لقائمة جديدة`
        })
        return true
    } catch (err) {
        console.log('CATALOG IMAGE ERROR:', err)
        await safeSend(jid, { text: '❌ حدث خطأ أثناء حفظ الصورة' })
        return true
    }
}

module.exports = { loadAndApply, handleCatalogImageCommand, CatalogImage }
