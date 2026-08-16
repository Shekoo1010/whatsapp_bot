// =====================================================================
// systems/gallerySystem.js
// -----------------------------------------------------------------
// نظام "المعرض" — يخلي اللاعب يختار (بالأرقام نفسها اللي تطلع بأمر
// .شخصياتي) حتى 10 شخصيات من شخصياته المملوكة فعليًا، ويخزّن
// بحساب اللاعب مُعرّف كل نسخة (subdocument _id) بالضبط — مو الاسم فقط.
//
// ⚠️ ليش _id ومو name: بعض الشخصيات عند نفس اللاعب موجودة بأكثر من
// نسخة/ندرة (مثلاً Nami عادي + Nami اسطوري + Nami SSS بنفس الوقت).
// لو خزّنّا الاسم فقط، أي بحث لاحق بـ .find(c => c.name === name)
// كان يرجع دايمًا *أول* نسخة مطابقة بالاسم من player.characters —
// مو بالضرورة النسخة اللي اختارها اللاعب فعليًا (فكانت الصورة تطلع
// بندرة/صورة غلط). استخدام _id يضمن رجوع نفس النسخة بالضبط دايمًا.
//
// وقت العرض، نجيب أحدث بيانات (صورة/أنمي/قدرة) من characters.json
// مباشرة لنفس النسخة المختارة (بنفس الـ_id) — نفس بالضبط طريقة
// .عرض — فأي تعديل بـ characters.json أو تطوير لاحق (.تطوير)
// ينعكس تلقائيًا بالصورة القادمة بدون ما يحتاج يعيد الاختيار.
//
// ما فيه أي كود عرض/تصميم هنا — هذا فقط لإدارة الاختيار.
// التصميم نفسه بملف systems/myRosterCard.js
// =====================================================================

const mongoose = require('mongoose')
const characters = require('../characters.json')

const MAX_GALLERY = 10

function charId(char) {
    return char?._id ? char._id.toString() : null
}

// 🩹 بعض الشخصيات القديمة بحسابات اللاعبين ما فيها _id أصلاً (انضافت
// قبل ما ينشئها Mongoose تلقائيًا، أو عبر مسار حفظ ما يمر على إنشاء
// الـ_id التلقائي) — فتفشل .المعرض اضف عليها برسالة "تعذر تحديد هذه
// النسخة". بدل ما نرفضها، نولّد لها _id الحين ونحفظه، فتصير قابلة
// للإضافة للمعرض من أول مرة وبدون ما تتكرر المشكلة لاحقًا لنفس النسخة.
function ensureCharId(player, char) {
    const existing = charId(char)
    if (existing) return existing

    char._id = new mongoose.Types.ObjectId()
    player.markModified('characters')

    return char._id.toString()
}

// 🔄 يجيب أحدث بيانات (صورة/أنمي/قدرة) لنفس الشخصية من characters.json
// وقت العرض مباشرة — نفس بالضبط المنطق المستخدم بأمر .عرض و.قدره.
// بدون هذا، الصورة المخزّنة على الشخصية تبقى "مجمّدة" على آخر صورة
// كانت وقت آخر .تطوير، وأي تعديل لاحق بـ characters.json (تغيير
// رابط الصورة مثلاً) ما ينعكس بالمعرض أبدًا رغم إنه ينعكس بـ .عرض.
//
// ⚠️ لازم نبحث دايمًا برتبة 'SSS' الأساسية للشخصيات المطوَّرة
// (evolutionLevel > 0) بدل رتبتها المخزّنة حاليًا — نفس قاعدة
// .تطوير نفسه — وإلا تنسحب صورة نسخة قديمة/مختلفة (مثلاً اسطوري)
// بدل الصورة الصحيحة المحدَّثة.
function resolveLiveCharacterData(owned) {
    if (!owned) return owned

    const lookupRarity =
        (owned.evolutionLevel || 0) > 0 ? 'SSS' : owned.rarity

    const latest = characters.find(
        c =>
            c.name === owned.name &&
            c.rarity === lookupRarity &&
            c.form === owned.form
    )

    if (!latest) return owned

    return {
        ...(owned.toObject ? owned.toObject() : owned),
        image: latest.image,
        anime: latest.anime,
        ability: latest.ability,
        rarity: (owned.evolutionLevel || 0) > 0 ? owned.rarity : latest.rarity,
        form: latest.form || owned.form
    }
}

/**
 * يرجع مصفوفة كائنات الشخصيات الكاملة (بنفس ترتيب الاختيار) الجاهزة
 * للتمرير مباشرة لـ renderRosterImage(). أي معرّف بالمعرض ما عاد موجود
 * بـ player.characters (تباع/انهدى...) يُتجاهل بصمت. البيانات المرجعة
 * محدَّثة لحظيًا من characters.json (نفس تحديث .عرض).
 */
function getGalleryCharacters(player) {
    if (!player.gallery || !player.gallery.length) return []

    const result = []
    for (const id of player.gallery) {
        const found = player.characters.find(c => charId(c) === id)
        if (found) result.push(resolveLiveCharacterData(found))
    }
    return result
}

/**
 * يضيف شخصية للمعرض عن طريق رقمها بـ .شخصياتي (1-based، نفس الترقيم
 * المعروض هناك). يرجع {ok:true, name} أو {ok:false, reason}.
 */
function addToGallery(player, characterIndex) {
    const char = player.characters?.[characterIndex - 1]

    if (!char) {
        return { ok: false, reason: 'رقم غير صحيح — اكتب .شخصياتي عشان تشوف الأرقام' }
    }

    const id = ensureCharId(player, char)

    player.gallery = player.gallery || []

    if (player.gallery.includes(id)) {
        return { ok: false, reason: `هذي النسخة بالضبط من ${char.name} موجودة بالمعرض أصلاً` }
    }

    if (player.gallery.length >= MAX_GALLERY) {
        return { ok: false, reason: `المعرض ممتلئ (${MAX_GALLERY}/${MAX_GALLERY}) — احذف وحدة أول بـ .المعرض حذف` }
    }

    player.gallery.push(id)
    player.markModified('gallery')

    return {
        ok: true,
        name: char.name,
        rarity: char.rarity,
        evolutionLevel: char.evolutionLevel,
        count: player.gallery.length
    }
}

/**
 * يحذف شخصية من المعرض عن طريق مكانها *داخل المعرض نفسه* (1-based)
 * — مو رقم .شخصياتي. استخدم .المعرض قائمة عشان تشوف أرقام المعرض.
 */
function removeFromGallery(player, galleryIndex) {
    if (!player.gallery || !player.gallery[galleryIndex - 1]) {
        return { ok: false, reason: 'رقم غير صحيح بالمعرض — اكتب .المعرض قائمة عشان تشوف الأرقام' }
    }

    const [removedId] = player.gallery.splice(galleryIndex - 1, 1)
    player.markModified('gallery')

    const removedChar = player.characters.find(c => charId(c) === removedId)

    return {
        ok: true,
        name: removedChar ? removedChar.name : 'الشخصية',
        count: player.gallery.length
    }
}

module.exports = {
    MAX_GALLERY,
    getGalleryCharacters,
    addToGallery,
    removeFromGallery,
}
