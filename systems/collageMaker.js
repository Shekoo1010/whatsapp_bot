// =========================================================
// 🖼️ صانع الكولاج (Collage Maker) — ملف بيانات/أدوات خارجي
// =========================================================
// يجمع 4 صور بشبكة 2×2 بصورة واحدة نهائية (مثل تصميم "أربع
// صور بمربع واحد" اللي يُستخدم بأمر .صمم). كل صورة تُقص لمربع
// بنفس المقاس بدون تشويه (fit: cover)، وبينهم فاصل أبيض رفيع.
//
// هذا الملف أدوات فقط (utility) — ما فيه أي تعامل مع الرسائل
// أو قاعدة البيانات، عشان يسهل استخدامه بأي مكان ثاني بالبوت.
// يعتمد على مكتبة sharp (npm install sharp لو مو مثبتة أصلاً).
// =========================================================

const sharp = require('sharp')

const CELL_SIZE = 600      // حجم كل خلية (مربعة) بالبكسل
const GAP = 6              // سماكة الفاصل الأبيض بين الصور
const CANVAS_SIZE = CELL_SIZE * 2 + GAP // الحجم الكلي للكولاج (بما فيه الفاصل)

// -----------------------------------------------------------
// 🧩 يبني كولاج 2×2 من 4 بفرات صور (Buffer[])
// الترتيب المتوقع بالمصفوفة: [0] أعلى يسار، [1] أعلى يمين،
// [2] أسفل يسار، [3] أسفل يمين — نفس ترتيب إرسال الصور
// يرجع Buffer لصورة PNG نهائية جاهزة للإرسال
// -----------------------------------------------------------
async function buildCollage(buffers) {

    if (!Array.isArray(buffers) || buffers.length !== 4) {
        throw new Error('يجب توفير 4 صور بالضبط لبناء الكولاج')
    }

    // 🔲 نجهز كل صورة: تُقص لمربع CELL_SIZE×CELL_SIZE بدون تشويه (cover)
    const cells = await Promise.all(
        buffers.map(buf =>
            sharp(buf)
                .resize(CELL_SIZE, CELL_SIZE, { fit: 'cover', position: 'centre' })
                .toBuffer()
        )
    )

    // 🎨 خلفية بيضاء — تظهر كفاصل رفيع بين الصور الأربع
    const canvas = sharp({
        create: {
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            channels: 3,
            background: { r: 255, g: 255, b: 255 }
        }
    })

    const positions = [
        { left: 0, top: 0 },                            // أعلى يسار
        { left: CELL_SIZE + GAP, top: 0 },               // أعلى يمين
        { left: 0, top: CELL_SIZE + GAP },               // أسفل يسار
        { left: CELL_SIZE + GAP, top: CELL_SIZE + GAP }  // أسفل يمين
    ]

    const composite = cells.map((img, i) => ({
        input: img,
        left: positions[i].left,
        top: positions[i].top
    }))

    return canvas
        .composite(composite)
        .png()
        .toBuffer()
}

module.exports = {
    buildCollage,
    CELL_SIZE,
    GAP,
    CANVAS_SIZE
}
