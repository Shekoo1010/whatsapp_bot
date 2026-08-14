const Beast = require('../database/Beast')

// 🖼️ روابط صور كوراما والجوبي — المصدر الحقيقي لهالصور بالبوت كله
const KURAMA_IMAGE = 'https://files.catbox.moe/2zadbq.jpg'
const JUUBI_IMAGE = 'https://files.catbox.moe/fdgy5g.webp'

let sockInstance = null

function setSocket(sock) {

    sockInstance = sock
}

function getNextRespawn() {

    const now = new Date()

    const next = new Date(now)

    next.setMinutes(0)
    next.setSeconds(0)
    next.setMilliseconds(0)

    const currentHour =
        now.getHours()

    const nextHour =
        currentHour % 2 === 0
            ? currentHour + 2
            : currentHour + 1

    next.setHours(nextHour)

    return next
}

async function resetBeasts() {

    const beasts =
        await Beast.find({})

    if (beasts.length < 2)
        return

    const eggIndex =
        Math.floor(
            Math.random() * beasts.length
        )

    const respawnTime =
        getNextRespawn()

    for (
        let i = 0;
        i < beasts.length;
        i++
    ) {

        beasts[i].hp =
            beasts[i].maxHp

        beasts[i].rankings =
            {}

        beasts[i].eggCarrier =
            i === eggIndex

        beasts[i].currentAbility =
            null

        beasts[i].respawnAt =
            respawnTime

        await beasts[i].save()
    }

    console.log(
        '✅ Beasts Reset'
    )
}

async function checkRespawn() {

    const beasts =
        await Beast.find({})

    if (!beasts.length)
        return

    const now =
        Date.now()

    for (const beast of beasts) {

        if (
            beast.respawnAt &&
            now >=
            beast.respawnAt.getTime()
        ) {

            await resetBeasts()

            if (sockInstance) {

                const groups = [

                    "120363400448225715@g.us",

                    "120363020823525909@g.us"
                ]

                // 🥚 نجيب حالة حامل بيضة الرفيق بعد resetBeasts —
                // eggCarrier يتبدّل عشوائياً بين كوراما والجوبي كل
                // ريسبون، فنعلن بوضوح مين معه هالدورة
                const kuramaBeast =
                    await Beast.findOne({ name: 'كوراما' })

                const juubiBeast =
                    await Beast.findOne({ name: 'الجوبي' })

                const kuramaEggLine =
                    kuramaBeast?.eggCarrier
                        ? '\n\n🥚 يحمل بيضة رفيق لأول 3 هالدورة!'
                        : ''

                const juubiEggLine =
                    juubiBeast?.eggCarrier
                        ? '\n\n🥚 يحمل بيضة رفيق لأول 3 هالدورة!'
                        : ''

                const kuramaText =
`🦊 استيقظ كوراما

🔥 عاد الوحش العالمي

❤️ HP: 3,000,000

⚔️ استخدم:

.اقضي${kuramaEggLine}`

                const juubiText =
`🌌 استيقظ الجوبي

☠️ عاد الوحش العالمي

❤️ HP: 3,000,000

⚔️ استخدم:

.اباده${juubiEggLine}`

                for (const groupId of groups) {

                    // 🔧 حماية إضافية: لف الإرسال بـ try/catch عشان
                    // لو قروب وحد فشل إرساله (مثلاً انقطاع اتصال
                    // مؤقت) ما يوقف إرسال باقي القروبات، ونشوف
                    // الخطأ بالـ console بدل ما يختفي بصمت
                    try {

                        await sockInstance.sendMessage(
                            groupId,
                            KURAMA_IMAGE
                                ? {
                                    image: { url: KURAMA_IMAGE },
                                    caption: kuramaText
                                }
                                : { text: kuramaText }
                        )

                        await sockInstance.sendMessage(
                            groupId,
                            JUUBI_IMAGE
                                ? {
                                    image: { url: JUUBI_IMAGE },
                                    caption: juubiText
                                }
                                : { text: juubiText }
                        )

                    } catch (err) {

                        console.log(
                            `❌ خطأ إرسال إعلان استيقاظ الوحوش (${groupId}):`,
                            err
                        )
                    }
                }
            }

            break
        }
    }
}

module.exports = {

    getNextRespawn,

    resetBeasts,

    checkRespawn,

    setSocket
}
