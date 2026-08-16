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
// وقت العرض، نجيب أحدث بيانات لنفس النسخة (بنفس الـ_id) من
// player.characters مباشرة — فأي تطوير/تغيير لاحق (.تطوير) ينعكس
// تلقائيًا بالصورة القادمة بدون ما يحتاج يعيد الاختيار.
//
// ما فيه أي كود عرض/تصميم هنا — هذا فقط لإدارة الاختيار.
// التصميم نفسه بملف systems/myRosterCard.js
// =====================================================================

const MAX_GALLERY = 10

function charId(char) {
    return char?._id ? char._id.toString() : null
}

/**
 * يرجع مصفوفة كائنات الشخصيات الكاملة (بنفس ترتيب الاختيار) الجاهزة
 * للتمرير مباشرة لـ renderRosterImage(). أي معرّف بالمعرض ما عاد موجود
 * بـ player.characters (تباع/انهدى...) يُتجاهل بصمت.
 */
function getGalleryCharacters(player) {
    if (!player.gallery || !player.gallery.length) return []

    const result = []
    for (const id of player.gallery) {
        const found = player.characters.find(c => charId(c) === id)
        if (found) result.push(found)
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

    const id = charId(char)

    if (!id) {
        return { ok: false, reason: 'تعذر تحديد هذه النسخة من الشخصية — جرب مرة ثانية' }
    }

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
