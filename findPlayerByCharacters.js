// ==========================================================
// سكربت لمرة واحدة: إيجاد ايدي لاعب عن طريق مطابقة شخصياته
// ==========================================================
// طريقة الاستخدام على Render:
//   1) افتح Shell الخاص بالخدمة (Render Dashboard → Shell)
//   2) تأكد إنك بنفس مجلد المشروع (وين موجود مجلد models/)
//   3) شغّل: node findPlayerByCharacters.js
//
// السكربت يتصل بنفس قاعدة البيانات اللي يتصل فيها البوت
// (نفس MONGO_URI) ويطبع أي لاعب عنده كل الشخصيات المطلوبة،
// مع ايديه (userId) وعدد الشخصيات المتطابقة.
// ==========================================================

const mongoose = require('mongoose')
require('dotenv').config()

const Player = require('./models/Player')

// 🎯 عدّل هذي القائمة لو تبي تدور بشخصيات مختلفة
// اخترت هنا شخصيات أقل شيوعًا لتقليل احتمال تطابقها مع أكثر من لاعب
const TARGET_CHARACTERS = [
    'Mikoto Suoh',
    'Cheonma',
    'Jin Geum Yong',
    'Zhezhi',
    'Daikoku',
    'Oetsu Nimaiya',
    'Yukiko Kudo'
]

async function main() {

    if (!process.env.MONGO_URI) {
        console.log('❌ MONGO_URI مو موجود في environment variables')
        process.exit(1)
    }

    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ متصل بقاعدة البيانات\n')

    const players = await Player.find({
        'characters.name': { $in: TARGET_CHARACTERS }
    })

    console.log(`عدد اللاعبين اللي عندهم أي شخصية من القائمة: ${players.length}\n`)

    const results = []

    for (const player of players) {

        const ownedNames = new Set(
            (player.characters || []).map(c => c.name)
        )

        const matched = TARGET_CHARACTERS.filter(name =>
            ownedNames.has(name)
        )

        results.push({
            userId: player.userId,
            name: player.name || '(بدون اسم)',
            matchedCount: matched.length,
            matchedNames: matched
        })

    }

    // ترتيب من الأكثر تطابقًا للأقل
    results.sort((a, b) => b.matchedCount - a.matchedCount)

    console.log('=== النتائج (مرتبة حسب عدد التطابق) ===\n')

    for (const r of results) {

        console.log(`👤 الاسم: ${r.name}`)
        console.log(`🆔 الايدي: ${r.userId}`)
        console.log(`✅ تطابق: ${r.matchedCount} / ${TARGET_CHARACTERS.length}`)
        console.log(`📋 الشخصيات المتطابقة: ${r.matchedNames.join('، ')}`)
        console.log('---')

    }

    if (results.length === 0) {
        console.log('❌ ما فيه أي لاعب عنده أي شخصية من القائمة')
    } else if (results[0].matchedCount === TARGET_CHARACTERS.length) {
        console.log(`\n🎯 تطابق كامل (${TARGET_CHARACTERS.length}/${TARGET_CHARACTERS.length}) موجود عند: ${results[0].userId}`)
    } else {
        console.log(`\n⚠️ ما فيه تطابق كامل 100% — أقرب نتيجة عندها ${results[0].matchedCount}/${TARGET_CHARACTERS.length}`)
    }

    await mongoose.disconnect()
    process.exit(0)

}

main().catch(err => {
    console.log('❌ خطأ:', err)
    process.exit(1)
})
