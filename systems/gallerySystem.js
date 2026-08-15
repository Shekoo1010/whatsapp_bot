// =====================================================================
// systems/gallerySystem.js
// -----------------------------------------------------------------
// نظام "المعرض" — يخلي اللاعب يختار (بالأرقام نفسها اللي تطلع بأمر
// .شخصياتي) حتى 10 شخصيات من شخصياته المملوكة فعليًا، ويخزّن
// أسماءهم فقط بحساب اللاعب. وقت العرض، نجيب أحدث نسخة من كل شخصية
// من player.characters مباشرة — فأي تطوير/تغيير لاحق (.تطوير) ينعكس
// تلقائيًا بالصورة القادمة بدون ما يحتاج يعيد الاختيار.
//
// ما فيه أي كود عرض/تصميم هنا — هذا فقط لإدارة الاختيار.
// التصميم نفسه بملف systems/myRosterCard.js
// =====================================================================

const MAX_GALLERY = 10

/**
 * يرجع مصفوفة كائنات الشخصيات الكاملة (بنفس ترتيب الاختيار) الجاهزة
 * للتمرير مباشرة لـ renderRosterImage(). أي اسم بالمعرض ما عاد موجود
 * بـ player.characters (تباع/انهدى...) يُتجاهل بصمت.
 */
function getGalleryCharacters(player) {
    if (!player.gallery || !player.gallery.length) return []

    const result = []
    for (const name of player.gallery) {
        const found = player.characters.find(c => c.name === name)
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

    player.gallery = player.gallery || []

    if (player.gallery.includes(char.name)) {
        return { ok: false, reason: `${char.name} موجودة بالمعرض أصلاً` }
    }

    if (player.gallery.length >= MAX_GALLERY) {
        return { ok: false, reason: `المعرض ممتلئ (${MAX_GALLERY}/${MAX_GALLERY}) — احذف وحدة أول بـ .المعرض حذف` }
    }

    player.gallery.push(char.name)
    player.markModified('gallery')

    return { ok: true, name: char.name, count: player.gallery.length }
}

/**
 * يحذف شخصية من المعرض عن طريق مكانها *داخل المعرض نفسه* (1-based)
 * — مو رقم .شخصياتي. استخدم .المعرض قائمة عشان تشوف أرقام المعرض.
 */
function removeFromGallery(player, galleryIndex) {
    if (!player.gallery || !player.gallery[galleryIndex - 1]) {
        return { ok: false, reason: 'رقم غير صحيح بالمعرض — اكتب .المعرض قائمة عشان تشوف الأرقام' }
    }

    const [removed] = player.gallery.splice(galleryIndex - 1, 1)
    player.markModified('gallery')

    return { ok: true, name: removed, count: player.gallery.length }
}

module.exports = {
    MAX_GALLERY,
    getGalleryCharacters,
    addToGallery,
    removeFromGallery,
}
