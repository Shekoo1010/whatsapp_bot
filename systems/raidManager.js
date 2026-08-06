const Raid = require('../models/Raid')
const kingdoms = require('./raidKingdoms')
const characters = require('../characters.json')

const RAID_GROUPS = [
    '120363020823525909@g.us',
    '120363400448225715@g.us',
    '120363116482407260@g.us'
]

let schedulerStarted = false

// =========================
// حساب موعد الرايد القادم
// كل 3 ساعات بالضبط، على رأس الساعة
// (00:00 - 03:00 - 06:00 - 09:00 - 12:00 - 15:00 - 18:00 - 21:00)
// هذه الدالة تحسب دائماً أقرب موعد قادم أكبر من الوقت الحالي
// حتى لو تم استدعاؤها فجأة بسبب إعادة اتصال البوت، فهي لا "تطلق" الرايد
// فوراً أبداً، بل تنتظر دائماً حتى رأس الساعة القادمة من مضاعفات 3
// =========================

const RAID_INTERVAL_HOURS = 3

function getNextRaidTime() {

    const now = new Date()

    const next = new Date(now)

    next.setSeconds(0)
    next.setMilliseconds(0)
    next.setMinutes(0)

    const currentHour = now.getHours()

    // أقرب ساعة قادمة (أكبر من الحالية دائماً) من مضاعفات RAID_INTERVAL_HOURS
    let nextHour =
        currentHour -
        (currentHour % RAID_INTERVAL_HOURS) +
        RAID_INTERVAL_HOURS

    if (nextHour >= 24) {

        next.setDate(next.getDate() + 1)

        nextHour = nextHour % 24

    }

    next.setHours(nextHour)

    return next

}

// =========================
// الوقت المتبقي
// =========================

function getRemainingTime() {

    return (
        getNextRaidTime().getTime() -
        Date.now()
    )

}

// =========================
// اختيار مملكة عشوائية
// =========================

function randomKingdom() {

    return kingdoms[
        Math.floor(
            Math.random() *
            kingdoms.length
        )
    ]

}
// =========================
// إنشاء الرايد
// =========================

async function createRaid() {

    const kingdom =
        randomKingdom()

    let raid =
        await Raid.findOne()

    if (!raid) {

        raid = new Raid()

    }

    raid.active = true

    raid.kingdom = kingdom.name
    raid.anime = kingdom.anime

    raid.bossName = kingdom.boss
    raid.bossImage = kingdom.bossImage || ""

    // =====================
    // إحصائيات الزعيم
    // =====================

    raid.hp = kingdom.hp
    raid.maxHp = kingdom.hp

    raid.bossAttack = kingdom.attack
    raid.bossDefense = kingdom.defense
    raid.bossCritRate = kingdom.critRate

    // =====================
    // خصائص الرايد
    // =====================

    raid.passive = kingdom.passive
    raid.passiveValue = kingdom.passiveValue

    raid.rewardMultiplier =
        kingdom.rewardMultiplier

    raid.difficulty =
        kingdom.difficulty

    // =====================
    // مراحل القتال
    // =====================

    raid.currentPhase = 1
    raid.phase2 = false
    raid.phase3 = false

    // =====================
    // الإحصائيات
    // =====================

    raid.totalDamage = 0
    raid.totalHits = 0
    raid.damageMap = {}

    // =====================
    // التوقيت
    // =====================

    raid.startedAt = Date.now()

    raid.endsAt =
        Date.now() +
        (2 * 60 * 60 * 1000)

    raid.endedAt = 0

    await raid.save()

    return {

        raid,
        kingdom

    }

}
// =========================
// إعلان الرايد
// =========================

async function announceRaid(sock) {

    const {
        raid,
        kingdom
    } = await createRaid()

    const boss =
        characters.find(
            c => c.name === raid.bossName
        )

    const image =
        kingdom.bossImage ||
        boss?.image ||
        boss?.imageUrl ||
        ""

    const caption =

`🚨 ═══════〔 غــزو عــالمي 〕══════ 🚨

⚠️ ظهرت بوابة غامضة فوق المملكة...

👹 خرج منها زعيم أسطوري!

━━━━━━━━━━━━━━━━━━

🏰 المملكة
『 ${raid.kingdom} 』

👹 الزعيم
『 ${raid.bossName} 』

🎌 الأنمي
『 ${raid.anime} 』

━━━━━━━━━━━━━━━━━━

❤️ HP
${raid.maxHp.toLocaleString()}

⚔️ الهجوم
${raid.bossAttack.toLocaleString()}

🛡️ الدفاع
${raid.bossDefense.toLocaleString()}

⭐ الصعوبة
${raid.difficulty}/10

━━━━━━━━━━━━━━━━━━

🏆 مكافآت أول ثلاثة

🥇 الأول
💰 1,000,000
🎁 SSS Chance ×2
🌟 فرصة 30٪ للحصول على شخصية SSS

🥈 الثاني
💰 700,000
🎁 SSS Chance ×2
🌟 فرصة 30٪ للحصول على شخصية SSS

🥉 الثالث
💰 500,000
🎁 SSS Chance ×2
🌟 فرصة 30٪ للحصول على شخصية SSS

━━━━━━━━━━━━━━━━━━

🎖️ باقي المشاركين

💰 200,000 ~ 500,000

🎁 فرصة للحصول على
SSS Chance

🎁 فرصة للحصول على
SSS High

━━━━━━━━━━━━━━━━━━

⚔️ للدخول اكتب

غزو_رايد

⏳ مدة الغزو ساعتان فقط.

🔥 اتحدوا جميعاً قبل أن يدمر الزعيم المملكة!`

    for (const jid of RAID_GROUPS) {

        try {

            if (image) {

                await sock.sendMessage(
                    jid,
                    {
                        image: {
                            url: image
                        },
                        caption
                    }
                )

            } else {

                await sock.sendMessage(
                    jid,
                    {
                        text: caption
                    }
                )

            }

        } catch (err) {

            console.log(
                "Raid announce error:",
                err.message
            )

        }

    }

}
// =========================
// تشغيل مؤقت الرايد
// =========================

async function startRaidScheduler(sock) {

    if (schedulerStarted) return

    schedulerStarted = true

    while (true) {

        try {

            const running =
                await Raid.findOne({
                    active: true
                })

            if (!running) {

                const wait =
                    getRemainingTime()

                const next =
                    getNextRaidTime()

                console.log(
                    `📅 الرايد القادم: ${next.toLocaleString()}`
                )

                await new Promise(resolve =>
                    setTimeout(resolve, wait)
                )

                await announceRaid(sock)

                console.log(
                    "✅ Raid Started"
                )

            }

            else {

                const remain =
                    running.endsAt - Date.now()

                if (remain > 0) {

                    console.log(
                        `⏳ Raid Running (${Math.ceil(remain / 60000)} دقيقة متبقية)`
                    )

                    await new Promise(resolve =>
                        setTimeout(resolve, remain)
                    )

                }

                else {

                    running.active = false

                    await running.save()

                }

            }

        }

        catch (err) {

            console.log(
                "Raid Scheduler Error:",
                err
            )

            await new Promise(resolve =>
                setTimeout(resolve, 30000)
            )

        }

    }

}

// =========================
// EXPORTS
// =========================

module.exports = {

    startRaidScheduler,
    announceRaid,
    getNextRaidTime,
    getRemainingTime

}
