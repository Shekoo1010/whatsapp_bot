// =====================================================================
// 🔍 فحص حجم مستندات اللاعبين (قراءة فقط — لا يعدّل أي شي)
// =====================================================================
// كل أمر يحمّل مستند اللاعب كامل من قاعدة البيانات. لو بعض المستندات ضخمة
// (مثلاً صور base64 قديمة داخل الشخصيات) فكل أمر لهذا اللاعب يصير بطيء.
// التشغيل:  MONGO_URI="..." node scripts/checkPlayerDocSizes.js
// (يحتاج MongoDB 4.4+ لأن الفحص يستخدم $bsonSize)
// =====================================================================

const mongoose = require('mongoose')

async function main() {

    if (!process.env.MONGO_URI) {
        console.log('❌ حط MONGO_URI بمتغيرات البيئة')
        process.exit(1)
    }

    await mongoose.connect(process.env.MONGO_URI)

    const players = mongoose.connection.db.collection('players')

    const [stats] = await players.aggregate([
        { $project: { size: { $bsonSize: '$$ROOT' } } },
        { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$size' }, max: { $max: '$size' } } }
    ]).toArray()

    if (!stats) {
        console.log('ما فيه لاعبين')
        return process.exit(0)
    }

    const kb = (n) => (n / 1024).toFixed(1) + ' KB'

    console.log(`👥 عدد اللاعبين: ${stats.count}`)
    console.log(`📦 متوسط حجم المستند: ${kb(stats.avg)}`)
    console.log(`🐘 أكبر مستند: ${kb(stats.max)}`)

    const top = await players.aggregate([
        { $project: { userId: 1, size: { $bsonSize: '$$ROOT' } } },
        { $sort: { size: -1 } },
        { $limit: 10 }
    ]).toArray()

    console.log('\n🔟 أكبر 10 مستندات:')
    for (const p of top) console.log(`  ${p.userId}  →  ${kb(p.size)}`)

    console.log('\n💡 المستند الصحي عادةً أقل من ~200 KB. لو فيه مستندات بالميجابايت،')
    console.log('   غالباً السبب بيانات قديمة ضخمة (مثل customImageData) داخل الشخصيات.')

    process.exit(0)
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
