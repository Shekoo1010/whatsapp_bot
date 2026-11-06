// 🐾 صور الرفقاء (للمطور فقط) — 6 صور لكل رفيق
//  .صو            → قائمة الرفقاء بخاناتهم الست (✅ موجودة / ❌ ناقصة)
//  .صو جديد       → قائمة جديدة بدون الرفقاء المكتملين (ترقيم من 1)
//  .صو كل         → كل الرفقاء (تقدر تغيّر أي صورة)
//  .صو <رفيق> <خانة> → ككابشن على صورة: يضعها في خانة (1-6) للرفيق صاحب الرقم
//      مثال: .صو 1 1  ثم  .صو 1 2  ...  .صو 1 6
//
// الصور تُرفع لـ Cloudinary (مجلد companion_images) والرابط يُخزَّن بالقاعدة (CompanionImage)
// فيبقى بعد الريستارت، وعند الإقلاع نكتبه داخل companionsData.ANIMALS[key].images.

const mongoose = require('mongoose')

const schema = new mongoose.Schema(
    { key: { type: String, unique: true }, url: String, publicId: String },
    { timestamps: true }
)
const CompanionImage = mongoose.models.CompanionImage || mongoose.model('CompanionImage', schema)

const dbKey = (animalKey, slot) => `${animalKey}|${slot}` // slot: 1..N

let lastList = [] // مفاتيح الرفقاء بآخر قائمة — الأرقام تبقى ثابتة بين الحفظات

async function loadAndApply(companionsData) {
    try {
        const docs = await CompanionImage.find({}).lean()
        let n = 0
        for (const d of docs) {
            const [animalKey, slotStr] = String(d.key).split('|')
            const slot = Number(slotStr)
            const animal = companionsData.ANIMALS[animalKey]
            if (!animal || !Number.isInteger(slot) || slot < 1 || slot > companionsData.IMAGES_PER_ANIMAL) continue
            animal.images[slot - 1] = d.url
            n++
        }
        console.log(`🐾 companion images applied: ${n}`)
    } catch (err) {
        console.log('companion images load error:', err?.message || err)
    }
}

// ctx: { sock, safeSend, downloadMediaMessage, uploadCompanionImage, isOwner, companionsData }
// يرجّع true لو الرسالة تخصّ الأمر
async function handleCompanionImageCommand(msg, ctx) {
    const { sock, safeSend, downloadMediaMessage, uploadCompanionImage, isOwner, companionsData } = ctx
    const m = msg.message
    if (!m) return false

    const text = (
        m.imageMessage?.caption || m.conversation || m.extendedTextMessage?.text || ''
    ).trim()
    const parts = text.split(/\s+/)
    if (parts[0] !== '.صو') return false          // تطابق حرفي فقط (ما يلتقط .صوره_sss ولا .ص)
    if (!isOwner(msg)) return true                  // للمطور فقط (نتجاهل بصمت)

    const jid = msg.key.remoteJid
    const SLOTS = companionsData.IMAGES_PER_ANIMAL
    const allKeys = companionsData.ANIMAL_KEYS
    const filled = k => companionsData.ANIMALS[k].images.filter(Boolean).length
    const complete = k => filled(k) >= SLOTS

    try {
        // ── .صو (بدون صورة) → القائمة ──
        if (!m.imageMessage) {
            if (parts[1] === 'كل') {
                lastList = [...allKeys]
            } else {
                if (parts[1] === 'جديد') lastList = []
                const known = new Set(lastList)
                for (const k of allKeys) {
                    if (!complete(k) && !known.has(k)) lastList.push(k)
                }
                lastList = lastList.filter(k => companionsData.ANIMALS[k])
            }

            if (!lastList.length) {
                await safeSend(jid, { text: '✅ كل الرفقاء عندهم الصور الست كاملة' })
                return true
            }

            const lines = lastList.map((k, i) => {
                const a = companionsData.ANIMALS[k]
                const slots = Array.from({ length: SLOTS }, (_, s) => `${s + 1}${a.images[s] ? '✅' : '❌'}`).join(' ')
                return `${i + 1}. ${a.emoji} ${a.defaultName} (${filled(k)}/${SLOTS})\n    ${slots}${complete(k) ? ' 🎉' : ''}`
            })

            const doneCount = lastList.filter(complete).length
            await safeSend(jid, {
                text: `🐾 صور الرفقاء (مكتمل ${doneCount} من ${lastList.length})\nأرسل صورة بكابشن: .صو رقم_الرفيق رقم_الخانة\nمثال: .صو 1 1 ثم .صو 1 2 ... حتى 6\n(.صو جديد لقائمة بدون المكتملين — .صو كل لعرض الكل وتغيير أي صورة)\n\n${lines.join('\n')}`
            })
            return true
        }

        // ── .صو رقم خانة + صورة ──
        const num = Number(parts[1])
        const slot = Number(parts[2])
        if (!Number.isInteger(num) || num < 1 || !Number.isInteger(slot) || slot < 1 || slot > SLOTS) {
            await safeSend(jid, { text: `❌ أرسل صورة وبكابشنها: .صو رقم_الرفيق رقم_الخانة (1-${SLOTS})\nمثال: .صو 1 1\n(اكتب .صو لوحدها لعرض القائمة)` })
            return true
        }
        const animalKey = lastList[num - 1]
        if (!animalKey) {
            await safeSend(jid, { text: '❌ رقم غير موجود — اكتب .صو لتحديث القائمة' })
            return true
        }
        const animal = companionsData.ANIMALS[animalKey]
        if (!animal) {
            await safeSend(jid, { text: '❌ الرفيق غير موجود — اكتب .صو لتحديث القائمة' })
            return true
        }

        const hadImage = !!animal.images[slot - 1]
        const buffer = await downloadMediaMessage(
            { message: m }, 'buffer', {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
        )
        const key = dbKey(animalKey, slot)
        const { url, publicId } = await uploadCompanionImage(buffer, key)

        await CompanionImage.updateOne({ key }, { $set: { url, publicId } }, { upsert: true })
        animal.images[slot - 1] = url // يظهر فوراً بدون ريستارت

        const n = filled(animalKey)
        let reply = `✅ تم ${hadImage ? 'تغيير' : 'وضع'} صورة ${animal.emoji} ${animal.defaultName} — الخانة ${slot} (${n}/${SLOTS})`
        if (n >= SLOTS) {
            reply += `\n\n🎉 اكتمل ${animal.defaultName} بالصور الست!\nاكتب .صو جديد لقائمة جديدة بدون المكتملين`
        } else {
            reply += `\n\nالأرقام لم تتغير — كمّل بنفس القائمة (.صو لعرضها)`
        }
        await safeSend(jid, { text: reply })
        return true
    } catch (err) {
        console.log('COMPANION IMAGE ERROR:', err)
        await safeSend(jid, { text: '❌ حدث خطأ أثناء حفظ الصورة' })
        return true
    }
}

module.exports = { loadAndApply, handleCompanionImageCommand, CompanionImage }
