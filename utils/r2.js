// =========================
// ☁️ Cloudflare R2 — بديل مباشر لـ utils/cloudinary.js (نفس أسماء الدوال ونفس القيم المرجعة)
// =========================
// متغيرات البيئة (Render → Environment):
//   R2_ACCOUNT_ID         (Cloudflare → R2 → Account ID)
//   R2_ACCESS_KEY_ID      (R2 → Manage API Tokens → Create → Object Read & Write)
//   R2_SECRET_ACCESS_KEY
//   R2_BUCKET             اسم الـ bucket
//   R2_PUBLIC_URL         الرابط العام بدون / بالنهاية، مثل https://pub-xxxx.r2.dev أو https://img.yourdomain.com
//
// التثبيت:  npm i @aws-sdk/client-s3 @aws-sdk/lib-storage

const crypto = require('crypto')
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { Upload } = require('@aws-sdk/lib-storage')

const BUCKET = process.env.R2_BUCKET
const PUBLIC_URL = String(process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '')

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
    },
    // توافق مع R2 مع الإصدارات الحديثة من SDK
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED'
})

const sha = key => crypto.createHash('sha1').update(String(key)).digest('hex').slice(0, 24)

// يكتشف نوع الملف من أول بايتات (الدوال تستقبل Buffer فقط)
function sniff(buf) {
    if (buf.length > 12) {
        if (buf[0] === 0xff && buf[1] === 0xd8) return { ext: 'jpg', type: 'image/jpeg' }
        if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: 'png', type: 'image/png' }
        if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', type: 'image/webp' }
        if (buf.toString('ascii', 0, 3) === 'GIF') return { ext: 'gif', type: 'image/gif' }
        if (buf.toString('ascii', 4, 8) === 'ftyp') return { ext: 'mp4', type: 'video/mp4' }
        if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { ext: 'webm', type: 'video/webm' }
    }
    return { ext: 'jpg', type: 'image/jpeg' }
}

// overwritable=true: الاسم ثابت وقد يتغير محتواه، فنضيف ?v= لتجاوز كاش المتصفح/CDN
async function put(folder, name, buffer, { overwritable = false, forceType } = {}) {
    const { ext, type } = sniff(buffer)
    const key = `${folder}/${name}.${ext}`
    const body = { Bucket: BUCKET, Key: key, Body: buffer, ContentType: forceType || type, CacheControl: 'public, max-age=31536000, immutable' }
    if (buffer.length > 8 * 1024 * 1024) {
        await new Upload({ client: s3, params: body, partSize: 6 * 1024 * 1024, queueSize: 2 }).done()
    } else {
        await s3.send(new PutObjectCommand(body))
    }
    const url = `${PUBLIC_URL}/${key}` + (overwritable ? `?v=${Date.now().toString(36)}` : '')
    return { url, publicId: key }
}

async function remove(publicId) {
    if (!publicId) return
    try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: String(publicId).split('?')[0] }))
    } catch (err) {
        console.log('⚠️ فشل حذف ملف من R2:', publicId, err.message)
    }
}

async function fetchBuffer(url) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 30000)
    try {
        const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const type = r.headers.get('content-type') || ''
        if (!type.startsWith('image/')) throw new Error('ليس صورة (' + type + ')')
        return Buffer.from(await r.arrayBuffer())
    } finally { clearTimeout(t) }
}

// ---- صور .استبدال (اسم فريد لكل رفع) ----
function uploadCustomCharacterImage(buffer, playerId, characterIndex) {
    const name = `${String(playerId).replace(/[^a-zA-Z0-9]/g, '_')}_${characterIndex}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    return put('custom_images', name, buffer)
}
const deleteCustomCharacterImage = remove

// ---- صور الكتالوج (اسم ثابت من المفتاح) ----
const uploadCatalogImage = (buffer, key) => put('catalog_images', sha(key), buffer, { overwritable: true })
async function uploadCatalogImageFromUrl(url, key) {
    return uploadCatalogImage(await fetchBuffer(url), key)
}

// ---- صور الرفقاء ----
const uploadCompanionImage = (buffer, key) => put('companion_images', sha(key), buffer, { overwritable: true })

// ---- صور أسئلة التخمين ----
const uploadQuestionImage = (buffer, key) => put('question_images', sha(key), buffer, { overwritable: true })
async function uploadQuestionImageFromUrl(url, key) {
    return uploadQuestionImage(await fetchBuffer(url), key)
}

// ---- الأرينا ----
const uploadArenaImage = (buffer, id, slot) => put('arena_media', `${id}_${slot}`, buffer, { overwritable: true })
const uploadArenaVideo = (buffer, id) => put('arena_media', `${id}_video`, buffer, { overwritable: true })
const deleteArenaAsset = (publicId /*, type */) => remove(publicId)

module.exports = {
    uploadCustomCharacterImage,
    deleteCustomCharacterImage,
    uploadCatalogImage,
    uploadCatalogImageFromUrl,
    uploadCompanionImage,
    uploadQuestionImage,
    uploadQuestionImageFromUrl,
    uploadArenaImage,
    uploadArenaVideo,
    deleteArenaAsset
}
