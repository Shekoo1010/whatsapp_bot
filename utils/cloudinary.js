// =========================
// ☁️ Cloudinary — تخزين الصور المخصصة (.استبدال) بدل حفظها base64
// داخل مستند اللاعب بقاعدة البيانات أو على قرص محلي غير دائم
// =========================
// يحتاج 3 متغيرات بيئة (من لوحة تحكم Cloudinary → Dashboard):
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET

const cloudinary = require('cloudinary').v2

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

// يرفع Buffer مباشرة (بدون كتابته كملف محلي أولاً) ويرجع
// { url: secure_url, publicId } — public_id لازم نحتفظ فيه عشان
// نقدر نحذف الصورة القديمة من Cloudinary لو استُبدلت بأخرى.
function uploadCustomCharacterImage(buffer, playerId, characterIndex) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'custom_images',
                public_id: `${playerId.replace(/[^a-zA-Z0-9]/g, '_')}_${characterIndex}`,
                overwrite: true,
                resource_type: 'image'
            },
            (err, result) => {
                if (err) return reject(err)
                resolve({ url: result.secure_url, publicId: result.public_id })
            }
        )
        stream.end(buffer)
    })
}

// يحذف صورة من Cloudinary بمعرفها (يُستدعى عند .استبدال حذف).
// ما يرمي خطأ لو فشل — الحذف تنظيف اختياري ولا يجب يوقف الأمر.
async function deleteCustomCharacterImage(publicId) {
    if (!publicId) return
    try {
        await cloudinary.uploader.destroy(publicId)
    } catch (err) {
        console.log('⚠️ فشل حذف صورة من Cloudinary:', publicId, err.message)
    }
}


// 🖼️ صور الكتالوج العامة (أمر المطور .ص) — public_id ثابت مشتق من مفتاح
// الشخصية (مو من رقمها بالقائمة) عشان إعادة الرفع تستبدل نفس الصورة.
function uploadCatalogImage(buffer, key) {
    const id = require('crypto').createHash('sha1').update(String(key)).digest('hex').slice(0, 24)
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'catalog_images',
                public_id: id,
                overwrite: true,
                invalidate: true,
                resource_type: 'image'
            },
            (err, result) => {
                if (err) return reject(err)
                resolve({ url: result.secure_url, publicId: result.public_id })
            }
        )
        stream.end(buffer)
    })
}

module.exports = {
    uploadCustomCharacterImage,
    deleteCustomCharacterImage,
    uploadCatalogImage
}
