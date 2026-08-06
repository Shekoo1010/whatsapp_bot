const mongoose = require('mongoose')
const Player = require('./models/Player')
const characters = require('./characters.json')

// =========================
// 🌍 إعدادات العوالم الأربعة
// =========================

const WORLDS = {
    onepiece:   { key: 'onepiece',   name: 'ون بيس 🏴‍☠️' },
    bleach:     { key: 'bleach',     name: 'بليتش ⚔️' },
    hunter:     { key: 'hunter',     name: 'هنتر × هنتر 🎯' },
    dragonball: { key: 'dragonball', name: 'دراغون بول 🐉' }
}

// أوامر الانضمام
const JOIN_COMMANDS = {
    '.انضم_ونبيس':  'onepiece',
    '.انضم_بليتش':  'bleach',
    '.انضم_هنتر':   'hunter',
    '.انضم_دراغون': 'dragonball'
}

// أقصى عدد أعضاء لكل عالم
const MAX_WORLD_MEMBERS = 10

// نقاط تُمنح عند الحصول على شخصية بندرة معينة (من .سحب_بنر)
const PULL_POINTS = {
    'SSS': 1
}

// نقاط تُمنح عند الوصول لرتبة معينة بالتطوير (من .تطوير)
// ⚠️ عدّل الأرقام حسب ما يناسبك، هذي قيم افتراضية منطقية
const EVOLUTION_POINTS = {
    'SSS+':   1,
    'SSS++':  1,
    'UR I':   2,
    'UR II':  2,
    'UR III': 3,
    'EX':     5,
    'Ω':      10
}

// مكافآت الفوز لكل عضو بالعالم الفائز عند إنهاء الموسم
const WORLD_REWARD_MONEY = 5_000_000
const WORLD_REWARD_SSS_COUNT = 2

// نقطة تُمنح لكل فوز بمعارك اللاعبين (.مضاربة و .قتال_مجموع)
const BATTLE_WIN_POINTS = 1

// نقطة تُمنح لكل 5 هجمات على الزعيم (.هجوم)
const ATTACK_POINTS = 1
const ATTACKS_PER_POINT = 5

// =========================
// ⏰ جدولة نهاية الموسم التلقائية (كل سبت 12:00 صباحاً بتوقيت السعودية)
// =========================

// ⚠️ القروبات اللي بيوصلها إعلان الفائز تلقائياً كل سبت
const WORLD_SEASON_GROUP_JID = [
    '120363020823525909@g.us',
    '120363409897316453@g.us',
    '120363116482407260@g.us'
]

const SAUDI_UTC_OFFSET_HOURS = 3


// =========================
// 📦 سكيمة تخزين نقاط كل عالم (محفوظة بقاعدة البيانات، ما تنمسح عند إعادة تشغيل البوت)
// =========================

const WorldSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    points: { type: Number, default: 0 },
    season: { type: Number, default: 1 }
})

const World = mongoose.models.World || mongoose.model('World', WorldSchema)

// يتأكد إن كل عالم عنده سجل بقاعدة البيانات (يُنشئه أول مرة بس، بقية المرات ما يسوي شي)
async function ensureWorldsExist() {
    for (const key of Object.keys(WORLDS)) {
        await World.updateOne(
            { key },
            { $setOnInsert: { key, points: 0, season: 1 } },
            { upsert: true }
        )
    }
}


// =========================
// 🤝 الانضمام لعالم
// =========================
// نادِ هذي الدالة أول شي بمعالج الرسائل (نفس مكان فحص أوامر الانضمام الثانية)
// ترجع true لو كان الأمر أمر انضمام وتم التعامل معه، وإلا ترجع false

async function handleJoinCommand(sock, jid, userId, text) {

    const worldKey = JOIN_COMMANDS[text]

    if (!worldKey) return false

    let player = await Player.findOne({ userId })

    if (!player) {
        player = await Player.create({ userId })
    }

    if (player.world === worldKey) {

        await sock.sendMessage(jid, {
            text: `⚠️ أنت أصلاً منضم لعالم ${WORLDS[worldKey].name}.`
        })

        return true
    }

    // 🔒 حماية: ممنوع الانضمام لعالم ثاني أو تغيير العالم أو الخروج منه
    // بعد ما تنضم لعالم، تبقى فيه لحد ما ينتهي الموسم
    if (player.world) {

        await sock.sendMessage(jid, {
            text:
`❌ أنت منضم أصلاً لعالم ${WORLDS[player.world].name}.

🔒 ما تقدر تغيّر عالمك أو تخرج منه إلا بعد انتهاء الموسم الحالي.`
        })

        return true
    }

    // 🔒 حماية: كل عالم أقصى 10 أعضاء بس
    const currentMembersCount =
        await Player.countDocuments({ world: worldKey })

    if (currentMembersCount >= MAX_WORLD_MEMBERS) {

        await sock.sendMessage(jid, {
            text:
`❌ عالم ${WORLDS[worldKey].name} مكتمل بالفعل (${MAX_WORLD_MEMBERS}/${MAX_WORLD_MEMBERS}).

جرب تنضم لعالم ثاني فيه مكان متاح.`
        })

        return true
    }

    player.world = worldKey
    player.worldPoints = 0

    await player.save()
    await ensureWorldsExist()

    await sock.sendMessage(jid, {
        text:
`✅ انضممت لعالم ${WORLDS[worldKey].name} بنجاح! (${currentMembersCount + 1}/${MAX_WORLD_MEMBERS})

كل شخصية SSS تسحبها، وكل تطوير توصل فيه لرتبة UR فأعلى، يحسب نقاط لك وللعالم كامل.

حظاً موفقاً 🔥`
    })

    return true
}


// =========================
// ⭐ منح نقاط عند سحب شخصية (نادها من داخل أمر .سحب_بنر بعد ما تعرف rarity الشخصية)
// =========================

async function awardPullPoints(sock, jid, userId, rarity) {
    await awardPoints(sock, jid, userId, PULL_POINTS[rarity])
}


// =========================
// ⭐ منح نقاط عند تطوير شخصية (نادها من داخل أمر .تطوير بعد ما تعرف newRank)
// =========================

async function awardEvolutionPoints(sock, jid, userId, newRank) {
    await awardPoints(sock, jid, userId, EVOLUTION_POINTS[newRank])
}


// =========================
// ⭐ منح نقطة عند الفوز بمعركة لاعب ضد لاعب (نادها من .مضاربة و .قتال_مجموع بعد تحديد الفائز)
// =========================

async function awardBattlePoints(sock, jid, winnerId) {
    await awardPoints(sock, jid, winnerId, BATTLE_WIN_POINTS)
}


// =========================
// ⭐ منح نقطة كل 5 هجمات على الزعيم (نادها من .هجوم بعد ما يزيد bossHits)
// hitsCount = عدد الهجمات الكلي للاعب بعد آخر تحديث (me.bossHits)
// تعطي نقطة بس لما يكون hitsCount من مضاعفات 5 بالضبط
// =========================

async function awardAttackPoints(sock, jid, userId, hitsCount) {

    if (!hitsCount || hitsCount % ATTACKS_PER_POINT !== 0) return

    await awardPoints(sock, jid, userId, ATTACK_POINTS)
}


// الدالة المشتركة اللي تسجل النقاط فعلياً (داخلية، ما تُستدعى مباشرة من index.js)
async function awardPoints(sock, jid, userId, points) {

    if (!points) return // الرتبة/الندرة ما تعطي نقاط

    const player = await Player.findOne({ userId })

    if (!player || !player.world) return // اللاعب مو منضم لأي عالم

    player.worldPoints = (player.worldPoints || 0) + points
    await player.save()

    await ensureWorldsExist()

    await World.updateOne(
        { key: player.world },
        { $inc: { points } }
    )

    await sock.sendMessage(jid, {
        text:
`🌍 +${points} نقطة لعالم ${WORLDS[player.world].name}!
📊 مجموع نقاطك: ${player.worldPoints}`
    })
}


// =========================
// 📊 عرض ترتيب العوالم (أمر .ترتيب_العوالم)
// =========================

async function showWorldStandings(sock, jid) {

    await ensureWorldsExist()

    const worlds = await World.find({}).sort({ points: -1 })

    let text = `🌍 ترتيب العوالم الحالي:\n\n`

    const medals = ['🥇', '🥈', '🥉', '4️⃣']

    for (let i = 0; i < worlds.length; i++) {

        const w = worlds[i]

        const memberCount =
            await Player.countDocuments({ world: w.key })

        text += `${medals[i] || '🏅'} ${WORLDS[w.key].name} — ${w.points} نقطة (👥 ${memberCount}/${MAX_WORLD_MEMBERS})\n`
    }

    await sock.sendMessage(jid, { text })
}


// =========================
// 📋 عرض تفاصيل كل عالم مع أعضائه ونقاط كل عضو (أمر .تفاصيل_العوالم)
// =========================

async function showWorldDetails(sock, jid) {

    await ensureWorldsExist()

    const worldsData =
        await World.find({}).sort({ points: -1 })

    const mentions = []

    let text = `🌍 ═══〔 تفاصيل العوالم 〕═══ 🌍\n\n`

    for (const w of worldsData) {

        const info = WORLDS[w.key]

        text += `${info.name} — ${w.points} نقطة\n`

        const members =
            await Player.find({ world: w.key })
                .sort({ worldPoints: -1 })

        if (!members.length) {

            text += `لا يوجد أعضاء بعد\n\n`
            continue

        }

        members.forEach((m, i) => {

            text += `${i + 1}. @${m.userId.split('@')[0]} — ${m.worldPoints || 0} نقطة\n`

            mentions.push(m.userId)

        })

        text += `\n`

    }

    await sock.sendMessage(jid, {
        text: text.trim(),
        mentions
    })

}


// =========================
// 🏆 إنهاء الموسم وتوزيع الجوائز على كل أعضاء العالم الفائز (أمر إداري)
// =========================

async function endWorldSeason(sock, jidOrJids) {

    const jids = Array.isArray(jidOrJids) ? jidOrJids : [jidOrJids]

    await ensureWorldsExist()

    const worlds = await World.find({}).sort({ points: -1 })

    if (!worlds.length || worlds[0].points === 0) {

        for (const jid of jids) {
            await sock.sendMessage(jid, {
                text: '⚠️ ما فيه نقاط كافية لإنهاء الموسم الحالي.'
            })
        }

        return
    }

    const winningWorld = worlds[0]

    const members = await Player.find({ world: winningWorld.key })

    if (!members.length) {

        for (const jid of jids) {
            await sock.sendMessage(jid, {
                text: `🏆 عالم ${WORLDS[winningWorld.key].name} فاز، لكن ما فيه أعضاء مسجلين حالياً.`
            })
        }

        return
    }

    let winnersText =
`🌌 ═══════〔 نهاية الموسم 〕═══════ 🌌

⚔️ بعد أسابيع من الصراع بين العوالم الأربعة...
🔥 عالم واحد فقط يستحق التاج 👑

╭━━━━━━━━━━━━━━━━━━━╮
   🏆 العالم الفائز
   ${WORLDS[winningWorld.key].name}
╰━━━━━━━━━━━━━━━━━━━╯

📊 مجموع النقاط: ${winningWorld.points} نقطة
🗓️ الموسم القادم يبدأ الآن!

━━━━━━━━━━━━━━━━━━━━
👑 المحاربون الفائزون:

`

    const mentions = []

    for (const member of members) {

        await member.addMoney(WORLD_REWARD_MONEY)

        for (let i = 0; i < WORLD_REWARD_SSS_COUNT; i++) {
            grantRandomSSSCharacter(member)
        }

        await member.save()

        mentions.push(member.userId)
    }

    // 🔄 بعد توزيع الجوائز، تُفرّغ كل العوالم من أعضائها (الفائزين والخاسرين)
    // عشان الموسم الجديد يبدأ من الصفر ويقدر الكل ينضم من جديد
    await Player.updateMany(
        { world: { $ne: null } },
        { $set: { world: null, worldPoints: 0 } }
    )

    winnersText += mentions
        .map(id => `@${id.split('@')[0]}`)
        .join(' ')

    winnersText +=
`

━━━━━━━━━━━━━━━━━━━━
🎁 كل بطل حصل على:
💰 ${WORLD_REWARD_MONEY.toLocaleString()} مال
⭐ ${WORLD_REWARD_SSS_COUNT} شخصية SSS

🌟 استعدوا للموسم القادم!

🔄 كل العوالم صارت فاضية الآن — اكتب أمر الانضمام من جديد لأي عالم تبيه.`

    for (const jid of jids) {
        await sock.sendMessage(jid, {
            text: winnersText,
            mentions
        })
    }

    // تصفير كل العوالم وبدء موسم جديد
    for (const key of Object.keys(WORLDS)) {
        await World.updateOne(
            { key },
            { $set: { points: 0 }, $inc: { season: 1 } }
        )
    }
}


// يمنح شخصية SSS عشوائية للاعب (يستخدم نفس بيانات characters.json الحقيقية)
function grantRandomSSSCharacter(player) {

    const sssPool = characters.filter(c => c.rarity === 'SSS')

    if (!sssPool.length) return null

    const randomCharacter =
        sssPool[Math.floor(Math.random() * sssPool.length)]

    player.characters.push({
        ...randomCharacter,
        originalPower: randomCharacter.power,
        evolutionLevel: 0,
        urAbilities: []
    })

    return randomCharacter
}


// =========================
// ⏰ جدولة إنهاء الموسم تلقائياً كل سبت الساعة 12:00 صباحاً بتوقيت السعودية
// =========================
// نادِ هذي الدالة مرة وحدة بعد ما يتصل البوت (سوكيت جاهز)

let seasonSchedulerStarted = false

// يحسب كم مللي ثانية باقية لأقرب يوم سبت الساعة 00:00 بتوقيت السعودية (UTC+3)
// يعتمد على وقت UTC مباشرة عشان ما يتأثر بتوقيت السيرفر نفسه
function msUntilNextSaturdayMidnightKSA() {

    const now = Date.now()

    // نمثل الوقت الحالي كأنه بتوقيت السعودية (بإضافة 3 ساعات على UTC)
    const nowKSA = new Date(now + SAUDI_UTC_OFFSET_HOURS * 60 * 60 * 1000)

    const dayOfWeek = nowKSA.getUTCDay() // 0 = الأحد ... 6 = السبت

    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7

    const targetKSA = new Date(Date.UTC(
        nowKSA.getUTCFullYear(),
        nowKSA.getUTCMonth(),
        nowKSA.getUTCDate() + daysUntilSaturday,
        0, 0, 0, 0
    ))

    // لو الهدف نفسه صار بالماضي (يعني إحنا بالفعل بعد منتصف ليل السبت) نروح للسبت الجاي
    if (targetKSA.getTime() <= nowKSA.getTime()) {
        targetKSA.setUTCDate(targetKSA.getUTCDate() + 7)
    }

    // نرجع الهدف لتوقيت UTC الحقيقي عشان نحسب الفرق الصحيح عن الآن
    const targetUTC = targetKSA.getTime() - SAUDI_UTC_OFFSET_HOURS * 60 * 60 * 1000

    return targetUTC - now
}

// يبدأ الجدولة الأسبوعية (يُستدعى مرة وحدة بس، مثلاً عند اتصال البوت)
function startWorldSeasonScheduler(sock, jid = WORLD_SEASON_GROUP_JID) {

    if (seasonSchedulerStarted) return
    seasonSchedulerStarted = true

    const runSeasonEnd = async () => {
        try {
            await endWorldSeason(sock, jid)
        } catch (err) {
            console.log('World Season Scheduler Error:', err)
        }
    }

    const firstDelay = msUntilNextSaturdayMidnightKSA()

    console.log(
        `🌍 جدولة نهاية موسم العوالم: بعد ${Math.round(firstDelay / (60 * 60 * 1000))} ساعة (أول سبت 12:00 ص بتوقيت السعودية)`
    )

    setTimeout(() => {

        runSeasonEnd()

        // كل سبت بعدين (كل 7 أيام بالضبط، ما فيه توقيت صيفي بالسعودية فما يحتاج إعادة حساب)
        setInterval(runSeasonEnd, 7 * 24 * 60 * 60 * 1000)

    }, firstDelay)
}


module.exports = {
    WORLDS,
    JOIN_COMMANDS,
    handleJoinCommand,
    awardPullPoints,
    awardEvolutionPoints,
    awardBattlePoints,
    awardAttackPoints,
    showWorldStandings,
    showWorldDetails,
    endWorldSeason,
    startWorldSeasonScheduler
}
