// =========================
// 🔧 سكربت هجرة لمرة واحدة: ينقل كل customImageData (base64) الموجودة
// حاليًا بمستندات اللاعبين إلى Cloudinary، ويحدّث customImage لرابط
// دائم، ويحذف customImageData من المستند (هذا هو اللي فعليًا يرجّع
// سرعة البوت — بدون هذا السكربت، المستندات القديمة تضل ضخمة زي ما هي
// حتى لو الكود الجديد ما يضيف بيانات base64 جديدة).
//
// التشغيل (مرة وحدة، من جهازك أو من شل الاستضافة):
//   MONGO_URI=... CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... \
//   CLOUDINARY_API_SECRET=... node scripts/migrateImagesToCloudinary.js
// =========================

// dotenv اختياري — لو مثبت ومعك ملف .env محلي بيقرأه، وإلا يتجاهله
// بصمت (يعتمد وقتها على متغيرات البيئة اللي مررتها بالسطر مباشرة)
try { require('dotenv').config() } catch {}

const mongoose = require('mongoose')
const Player = require('../models/Player')
const { uploadCustomCharacterImage } = require('../utils/cloudinary')

async function migrate() {
    if (!process.env.MONGO_URI) {
        console.log('❌ MONGO_URI غير موجود بمتغيرات البيئة')
        process.exit(1)
    }

    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ متصل بقاعدة البيانات')

    const players = await Player.find({
        'characters.customImageData': { $exists: true }
    })

    console.log(`🔍 لقيت ${players.length} لاعب عنده صور مستبدلة بحاجة هجرة`)

    let migratedImages = 0
    let failedImages = 0

    for (const player of players) {
        let changed = false

        for (let i = 0; i < (player.characters?.length || 0); i++) {
            const char = player.characters[i]
            if (!char.customImageData) continue

            try {
                const buffer = Buffer.from(char.customImageData, 'base64')
                const { url, publicId } = await uploadCustomCharacterImage(buffer, player.userId, i)

                char.customImage = url
                char.customImageId = publicId
                delete char.customImageData

                changed = true
                migratedImages++
                console.log(`  ✅ ${player.userId} #${i} → ${url}`)
            } catch (err) {
                failedImages++
                console.log(`  ❌ فشل رفع ${player.userId} #${i}:`, err.message)
                // نسيب customImageData زي ما هي لو فشل الرفع — نقدر نعيد المحاولة لاحقًا
            }
        }

        if (changed) {
            player.markModified('characters')
            await player.save()
        }
    }

    console.log(`\n🎉 خلصت الهجرة — نجح: ${migratedImages}، فشل: ${failedImages}`)
    await mongoose.disconnect()
    process.exit(0)
}

migrate().catch(err => {
    console.log('❌ خطأ عام بالهجرة:', err)
    process.exit(1)
})
