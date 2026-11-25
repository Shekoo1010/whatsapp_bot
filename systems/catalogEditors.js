// 🖼️ صلاحية وضع صور الكتالوج (.ص + قائمة SSS بالموقع) لأشخاص غير المطور
//
//  .صلاحية_ص   (بالرد على رسالته أو بمنشنه أو باليوزر: .صلاحية_ص اليوزر) → يعطيه صلاحية وضع الصور
//  .سحب_ص      (بالرد على رسالته أو بمنشنه أو باليوزر: .سحب_ص اليوزر)    → يسحب الصلاحية منه
//  .صلاحية_ص قائمة                          → يعرض أصحاب الصلاحية
//
// 🔒 الأمران للمطور فقط (isOwner الأصلي) — صاحب الصلاحية لا يقدر يعطيها لغيره.
// 🔒 الصلاحية تشمل فقط: أمر .ص + تغيير الصورة من صفحة قائمة SSS بالموقع.
//    بقية أوامر المطور تبقى محصورة بـ isOwner ولا تتأثر.
// 💾 تُحفظ بـ MongoDB (تبقى بعد الريستارت وإعادة النشر)
// 🔑 اليوزر يُستخدم فقط لتحديد الشخص لحظة الأمر، ثم يتحول لـ ID (userId + phoneJid) ويُخزَّن الـ ID.
//    ما نخزّن اليوزر لأنه يتغيّر (.يوزر) وممكن ينأخذ بعده شخص ثاني فيرث الصلاحية.
// 🆔 المطابقة بالرقم فقط (الجزء قبل @) وتُخزَّن كل هويات الشخص المعروفة
//    (@lid + رقم الهاتف) عشان تشتغل سواء وصل بصيغة lid أو s.whatsapp.net

const mongoose = require('mongoose')

const schema = new mongoose.Schema(
    {
        ids: { type: [String], index: true }, // أرقام فقط (lid / هاتف)
        label: String,                        // للعرض بالقائمة (اسم اللاعب أو الرقم)
        by: String
    },
    { timestamps: true }
)
const CatalogEditor = mongoose.models.CatalogEditor || mongoose.model('CatalogEditor', schema)

const num = raw => {
    const d = String(raw || '').split('@')[0].split(':')[0].replace(/\D/g, '')
    return d || null
}

let editorIds = new Set() // كل الأرقام المسموحة (يُقرأ بشكل متزامن من الموقع)
let loaded = false

async function load() {
    try {
        const docs = await CatalogEditor.find({}).lean()
        editorIds = new Set(docs.flatMap(d => d.ids || []))
        loaded = true
    } catch (e) {
        console.log('catalog editors load error:', e?.message || e)
    }
}

// للموقع: userId كامل أو رقم
const hasId = uid => {
    const n = num(uid)
    return !!n && editorIds.has(n)
}

// للبوت: مرسل الرسالة
const senderOf = msg => num(msg.key.participant || msg.key.remoteJid)
const isEditorMsg = msg => {
    const n = senderOf(msg)
    return !!n && editorIds.has(n)
}

function targetOf(msg) {
    const c = msg.message?.extendedTextMessage?.contextInfo
    return c?.participant || c?.mentionedJid?.[0] || null
}

// يجمع كل هويات الشخص (lid + هاتف) من مستند اللاعب إن وُجد
async function idsFor(Player, rawJid) {
    const n = num(rawJid)
    if (!n) return { ids: [], label: null }
    const ids = new Set([n])
    let label = null
    try {
        const p = await Player.findOne(
            { $or: [{ userId: new RegExp('^' + n + '@') }, { phoneJid: new RegExp('^' + n + '@') }] },
            { userId: 1, phoneJid: 1, username: 1, name: 1 }
        ).lean()
        if (p) {
            const a = num(p.userId); if (a) ids.add(a)
            const b = num(p.phoneJid); if (b) ids.add(b)
            label = p.username || p.name || null
        }
    } catch (e) {}
    return { ids: [...ids], label }
}

// ctx: { safeSend, isOwner, Player, ownerId, resolveUserIdByUsername }
// يرجّع true لو الرسالة تخصّ هذه الأوامر
async function handleEditorCommand(msg, ctx) {
    const { safeSend, isOwner, Player, ownerId, resolveUserIdByUsername } = ctx
    const m = msg.message
    if (!m) return false
    const text = (m.conversation || m.extendedTextMessage?.text || '').trim()
    const parts = text.split(/\s+/)
    const cmd = parts[0]
    if (cmd !== '.صلاحية_ص' && cmd !== '.سحب_ص') return false
    if (!isOwner(msg)) return true // للمطور فقط (نتجاهل بصمت)

    const jid = msg.key.remoteJid
    const reply = t => safeSend(jid, { text: t })

    try {
        if (!loaded) await load()

        // ── قائمة ──
        if (cmd === '.صلاحية_ص' && parts[1] === 'قائمة') {
            const docs = await CatalogEditor.find({}).lean()
            if (!docs.length) { await reply('📋 ما في أحد عنده صلاحية .ص غيرك.'); return true }
            const lines = docs.map((d, i) => `${i + 1}. ${d.label || d.ids[0]} (${d.ids[0]})`)
            await reply('📋 أصحاب صلاحية .ص:\n' + lines.join('\n'))
            return true
        }

        let target = targetOf(msg)
        // بدون رد/منشن → نحاول اليوزر (الكلمة بعد الأمر)
        if (!target && parts[1] && typeof resolveUserIdByUsername === 'function') {
            target = await resolveUserIdByUsername(parts[1])
            if (!target) {
                await reply('❌ ما لقيت لاعب بهذا اليوزر.')
                return true
            }
        }
        if (!target) {
            await reply(`❌ استخدم ${cmd} بالرد على رسالة الشخص أو بمنشنه أو بيوزره.`)
            return true
        }
        const t = num(target)
        if (!t) { await reply('❌ ما قدرت أحدد الشخص.'); return true }
        if (t === ownerId) { await reply('ℹ️ المطور عنده الصلاحية أصلاً.'); return true }

        const { ids, label } = await idsFor(Player, target)

        if (cmd === '.صلاحية_ص') {
            const existing = await CatalogEditor.findOne({ ids: { $in: ids } })
            if (existing) {
                // نضيف أي هوية جديدة عُرفت له
                existing.ids = [...new Set([...(existing.ids || []), ...ids])]
                if (label && !existing.label) existing.label = label
                await existing.save()
                await load()
                await reply('ℹ️ عنده الصلاحية من قبل.')
                return true
            }
            await CatalogEditor.create({ ids, label: label || t, by: senderOf(msg) })
            await load()
            await safeSend(jid, {
                text: `✅ تم إعطاء @${t} صلاحية وضع صور .ص وقائمة SSS بالموقع.`,
                mentions: [target]
            })
            return true
        }

        // .سحب_ص
        const res = await CatalogEditor.deleteMany({ ids: { $in: ids } })
        await load()
        if (!res.deletedCount) { await reply('ℹ️ هذا الشخص ما عنده صلاحية أصلاً.'); return true }
        await safeSend(jid, {
            text: `✅ تم سحب صلاحية وضع صور .ص من @${t}.`,
            mentions: [target]
        })
        return true
    } catch (e) {
        console.log('catalog editors cmd error:', e?.message || e)
        try { await reply('❌ صار خطأ: ' + (e?.message || e)) } catch (_) {}
        return true
    }
}

module.exports = { handleEditorCommand, load, hasId, isEditorMsg, CatalogEditor }
