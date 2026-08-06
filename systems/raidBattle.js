const Player =
require('../models/Player')

const Raid =
require('../models/Raid')

const kingdoms =
require('./raidKingdoms')

const raidAbilities =
require('./raidAbilities')

const {
    calculatePlayerDamage
} =
require('./raidUtils')

const {
    topReward,
    normalReward
} =
require('./raidRewards')

// =========================
// إعدادات الرايد
// =========================

const ATTACK_COOLDOWN =
30000

const RAGE_PHASE_1 =
50

const RAGE_PHASE_2 =
20

// ضربة الزعيم الحرجة (bossCritRate) تضاعف الضرر بهالنسبة
const BOSS_CRIT_MULTIPLIER =
1.5

// =========================
// الشخصية الحية الحالية
// =========================

function getAliveCharacter(player){

    if(
        !player.characters ||
        !player.characters.length
    ){
        return null
    }

    for(
        const character
        of player.characters
    ){

        if(character.dead)
            continue

        if(
            character.currentHp ===
            undefined
        ){

            character.currentHp =
            character.power

        }

        if(
            character.currentHp > 0
        ){

            return character

        }

    }

    return null

}

// =========================
// هل اللاعب انتهى؟
// =========================

function isPlayerDead(player){

    return !getAliveCharacter(
        player
    )

}

// =========================
// إعادة الشخصيات للحياة
// =========================

function resetCharacters(player){

    if(
        !player.characters
    ) return

    for(
        const character
        of player.characters
    ){

        character.dead = false

        character.currentHp =
        character.power

    }

    // إعادة البونصات للوضع الطبيعي
    player.damageBonus = 0
    player.defenseBonus = 0
    player.critRateBonus = 0
    player.critDamageBonus = 0
    player.dodgeBonus = 0

}

// =========================
// مرحلة غضب البوس
// =========================

function getBossPhase(raid){

    const percent =
    (
        raid.hp /
        raid.maxHp
    ) * 100

    // =====================
    // passive: berserk
    // الزعيم يدخل مراحل الغضب أبكر من العادي
    // =====================

    let phase1Threshold =
        RAGE_PHASE_1

    let phase2Threshold =
        RAGE_PHASE_2

    if(
        raid.passive ===
        'berserk'
    ){

        const boost =
            (raid.passiveValue || 0) /
            100

        phase1Threshold =
        Math.min(
            90,
            RAGE_PHASE_1 *
            (1 + boost)
        )

        phase2Threshold =
        Math.min(
            phase1Threshold - 5,
            RAGE_PHASE_2 *
            (1 + boost)
        )

    }

    if(
        percent <=
        phase2Threshold
    ){

        return 3

    }

    if(
        percent <=
        phase1Threshold
    ){

        return 2

    }

    return 1

}

// =========================
// ترتيب أعلى الضرر
// =========================

function getRanking(raid){

    return Object
    .entries(
        raid.damageMap || {}
    )
    .sort(
        (a,b)=>
        b[1]-a[1]
    )

}
// =========================
// هجوم الزعيم
// =========================

function bossAttack(
    raid,
    player
){

    const character =
        getAliveCharacter(player)

    if(!character){

        return{

            playerDead:true,

            damage:0,

            text:
"☠️ جميع شخصياتك سقطت."

        }

    }

    // =====================
    // المرحلة الحالية
    // =====================

    const phase =
        getBossPhase(raid)

    let damage =
        raid.bossAttack

    if(phase === 2){

        damage =
        Math.floor(
            damage * 1.35
        )

    }

    else if(phase === 3){

        damage =
        Math.floor(
            damage * 1.8
        )

    }

    let battleText = ''

    // =====================
    // bossCritRate — فرصة ضربة حرجة من الزعيم
    // =====================

    const bossCritRate =
        raid.bossCritRate || 0

    if(
        Math.random()*100 <=
        bossCritRate
    ){

        damage =
        Math.floor(
            damage *
            BOSS_CRIT_MULTIPLIER
        )

        battleText +=

`💢 ضربة حرجة من
${raid.bossName}!

`

    }

    // =====================
    // passive: rage
    // كل ما نزلت صحة الزعيم، يزيد ضرره تدريجياً
    // (مستقل عن مراحل الغضب الثابتة)
    // =====================

    if(
        raid.passive ===
        'rage'
    ){

        const hpPercent =
        (
            raid.hp /
            raid.maxHp
        ) * 100

        const missingPercent =
            100 - hpPercent

        const rageBonus =
        (
            missingPercent / 100
        ) *
        (
            (raid.passiveValue || 0) /
            100
        )

        damage =
        Math.floor(
            damage *
            (1 + rageBonus)
        )

    }

    // =====================
    // passive: lightning
    // فرصة صاعقة إضافية تزيد الضرر
    // =====================

    if(
        raid.passive ===
        'lightning' &&
        Math.random()*100 <=
        (raid.passiveValue || 0)
    ){

        damage =
        Math.floor(
            damage * 1.3
        )

        battleText +=

`⚡ صاعقة برق إضافية
ضربتك بقوة!

`

    }

    // =====================
    // passive: summon
    // أعوان الزعيم يشاركون بالهجوم كل جولة
    // =====================

    if(
        raid.passive ===
        'summon'
    ){

        const summonDamage =
        Math.floor(
            raid.bossAttack *
            0.1 *
            (raid.passiveValue || 0)
        )

        if(summonDamage > 0){

            damage +=
            summonDamage

            battleText +=

`👥 استدعى
${raid.bossName}

أعوانه لمهاجمتك أيضاً!

`

        }

    }

    // =====================
    // قدرة المملكة
    // =====================

    const kingdom =
        kingdoms.find(
            k =>
            k.name ===
            raid.kingdom
        )

    // =====================
    // قدرة البوس الخاصة
    // تُختار عشوائياً من قائمة قدرات مملكته (kingdom.abilities)
    // ثم تُبحث بالاسم داخل raidAbilities
    // =====================

    if(
        kingdom &&
        kingdom.abilities &&
        kingdom.abilities.length
    ){

        const abilityName =
            kingdom.abilities[
                Math.floor(
                    Math.random() *
                    kingdom.abilities.length
                )
            ]

        const skill =
            raidAbilities[
                abilityName
            ]

        if(
            skill &&
            Math.random()*100 <=
            skill.chance
        ){

            damage =
            Math.floor(
                damage *
                skill.damageMultiplier
            )

            battleText +=

`${skill.message}

`

        }

    }

    // =====================
    // دودج
    // =====================

    const dodgeChance =

        (player.dodge || 0)+

        (player.dodgeBonus || 0)

    if(
        Math.random()*100 <=
        dodgeChance
    ){

        return{

            playerDead:false,

            dodged:true,

            damage:0,

            current:character,

            text:

`${battleText}
🌀

${character.name}

تفادى الهجوم بنجاح.`

        }

    }

    // =====================
    // الدرع
    // =====================

    if(
        player.shield > 0
    ){

        const absorbed =
        Math.min(
            damage,
            player.shield
        )

        player.shield -=
        absorbed

        damage -=
        absorbed

        battleText +=

`🛡️ امتص الدرع

${absorbed.toLocaleString()}

ضرر

`

    }

    // =====================
    // الدفاع
    // =====================

    damage -=

    (player.defense||0)

    +

    (player.defenseBonus||0)

    if(
        damage < 1
    ){

        damage = 1

    }

    // =====================
    // passive: burn / poison
    // ضرر مستمر كل جولة، يتجاوز الدرع والدفاع
    // (لا يُحتسب إذا تفادى اللاعب الهجوم أصلاً)
    // =====================

    if(
        raid.passive === 'burn' ||
        raid.passive === 'poison'
    ){

        const dotDamage =
        Math.floor(
            character.power *
            (raid.passiveValue || 0) /
            100
        )

        if(dotDamage > 0){

            damage +=
            dotDamage

            const dotIcon =
                raid.passive === 'burn'
                ? '🔥'
                : '☠️'

            const dotLabel =
                raid.passive === 'burn'
                ? 'الحريق المستمر'
                : 'السم المستمر'

            battleText +=

`${dotIcon} ${dotLabel}
يلحق بك ضرر إضافي
${dotDamage.toLocaleString()}

`

        }

    }

    character.currentHp -=
    damage
      // =====================
    // الشخصية ماتت
    // =====================

    if(
        character.currentHp <= 0
    ){

        character.currentHp = 0

        character.dead = true

        const nextCharacter =
            getAliveCharacter(
                player
            )

        // =====================
        // يوجد شخصية أخرى
        // =====================

        if(nextCharacter){

            return{

                playerDead:false,

                damage,

                current:
                nextCharacter,

                text:

`${battleText}
╔══════『 💀 سقوط مقاتل 』══════╗

⚔️ الزعيم

${raid.bossName}

ألحق

💥 ${damage.toLocaleString()}

ضرر

━━━━━━━━━━━━━━━━━━

❌ تم القضاء على

👤 ${character.name}

━━━━━━━━━━━━━━━━━━

⚔️ دخل أرض المعركة

👤 ${nextCharacter.name}

❤️ HP

${nextCharacter.currentHp.toLocaleString()}

╚══════════════════════╝`

            }

        }

        // =====================
        // جميع الشخصيات ماتت
        // =====================

        return{

            playerDead:true,

            damage,

            current:null,

            text:

`${battleText}
╔══════『 ☠️ الهزيمة 』══════╗

💀

سقطت جميع شخصياتك

━━━━━━━━━━━━━━━━━━

🏴 انتهت مشاركتك

في هذا الغزو

💔 حاول مجدداً

في الغزو القادم

╚══════════════════════╝`

        }

    }

    // =====================
    // الشخصية بقيت حية
    // =====================

    return{

        playerDead:false,

        damage,

        current:character,

        text:

`${battleText}
╔══════『 ⚔️ هجوم الزعيم 』══════╗

👹

${raid.bossName}

━━━━━━━━━━━━━━━━━━

💥 الضرر

${damage.toLocaleString()}

━━━━━━━━━━━━━━━━━━

👤

${character.name}

❤️ المتبقي

${character.currentHp.toLocaleString()} HP

╚══════════════════════╝`

    }

}
// =========================
// هجوم اللاعب
// =========================

async function attackRaid({

    sock,
    jid,
    userId

}){

    const raid =
    await Raid.findOne({

        active:true

    })

    if(!raid){

        return sock.sendMessage(

            jid,

            {

text:

`❌ لا يوجد أي غزو نشط حالياً.

استخدم

.رايد

لمعرفة موعد الغزو القادم.`

            }

        )

    }

    const player =
    await Player.findOne({

        userId

    })

    if(!player){

        return sock.sendMessage(

            jid,

            {

                text:
"❌ لا يوجد حساب."

            }

        )

    }
// =====================
// تفعيل الباسف للشخصيات
// =====================

    // =====================
    // جميع الشخصيات ماتت
    // =====================

    if(

        isPlayerDead(player)

    ){

        return sock.sendMessage(

            jid,

            {

text:

`☠️ جميع شخصياتك سقطت.

لا يمكنك المشاركة

حتى ينتهي الرايد.`

            }

        )

    }

    // =====================
    // كولداون
    // =====================

    const now = Date.now()

    if(

        player.lastRaidAttack &&

        now -

        player.lastRaidAttack

        < ATTACK_COOLDOWN

    ){

        const remain =

        Math.ceil(

            (

                ATTACK_COOLDOWN -

                (

                    now -

                    player.lastRaidAttack

                )

            ) / 1000

        )

        return sock.sendMessage(

            jid,

            {

text:

`⏳ انتظر

${remain}

ثانية

ثم هاجم مرة أخرى.`

            }

        )

    }

    player.lastRaidAttack = now

    // =====================
    // حساب ضرر اللاعب
    // =====================

    const battle =

    calculatePlayerDamage(

        player

    )

    let damage =
    battle.damage

    let abilityText =
    battle.abilityText

    let passiveText = ""

    // =====================
    // passive: shield
    // يمتص الزعيم نسبة من ضررك
    // =====================

    if(
        raid.passive ===
        'shield'
    ){

        const absorbed =
        Math.floor(
            damage *
            (raid.passiveValue || 0) /
            100
        )

        if(absorbed > 0){

            damage -=
            absorbed

            if(damage < 1){

                damage = 1

            }

            passiveText +=

`🛡️ درع
${raid.bossName}

امتص
${absorbed.toLocaleString()}

من ضررك

`

        }

    }

    // =====================
    // passive: counter
    // يرد الزعيم نسبة من ضررك على شخصيتك مباشرة
    // =====================

    if(
        raid.passive ===
        'counter'
    ){

        const activeCharacter =
            getAliveCharacter(
                player
            )

        if(activeCharacter){

            const reflected =
            Math.floor(
                damage *
                (raid.passiveValue || 0) /
                100
            )

            if(reflected > 0){

                activeCharacter.currentHp -=
                reflected

                if(
                    activeCharacter.currentHp <= 0
                ){

                    activeCharacter.currentHp = 0
                    activeCharacter.dead = true

                }

                passiveText +=

`🔁
${raid.bossName}

رد عليك
${reflected.toLocaleString()}

ضرر مرتد

`

            }

        }

    }

    // =====================
    // مرحلة البوس
    // =====================

    const phase =

    getBossPhase(

        raid

    )

    let phaseText = ""

    if(

        phase === 2 &&

        !raid.phase2

    ){

        raid.phase2 = true

        phaseText =

`🔥════════════════════

😡 دخل الزعيم

مرحلة الغضب

━━━━━━━━━━━━━━

زاد ضرره بنسبة

35%

════════════════════🔥`

    }

    if(

        phase === 3 &&

        !raid.phase3

    ){

        raid.phase3 = true

        phaseText =

`☠️════════════════════

👹 الزعيم

فقد السيطرة

━━━━━━━━━━━━━━

دخل المرحلة الأخيرة

وزاد ضرره بشكل هائل

════════════════════☠️`

    }

    raid.hp -= damage

if (raid.hp <= 0) {

    raid.hp = 0

}

// =====================
// passive: heal
// يشفي الزعيم نفسه كل جولة طالما بقي حياً
// =====================

if(
    raid.passive === 'heal' &&
    raid.hp > 0
){

    const healAmount =
    Math.floor(
        raid.maxHp *
        (raid.passiveValue || 0) /
        100
    )

    if(healAmount > 0){

        raid.hp =
        Math.min(
            raid.maxHp,
            raid.hp + healAmount
        )

        passiveText +=

`💚
${raid.bossName}

استعاد
${healAmount.toLocaleString()}

من صحته

`

    }

}

// =====================
// حفظ الضرر
// (damageMap حقل من نوع كائن حر (Mixed) داخل الموديل،
//  والتعديل المباشر على خصائصه الفرعية لا يُكتشف تلقائياً
//  من طرف Mongoose، لذلك يجب استدعاء markModified حتى
//  يتم حفظ ضرر كل لاعب فعلياً ولا يُفقد عند أول قراءة جديدة
//  للرايد من قِبل لاعب آخر — وهذا هو سبب ظهور "آخر ضرر فقط")
// =====================

raid.damageMap[userId] =
(
    raid.damageMap[userId] || 0
) + damage

raid.markModified('damageMap')

raid.totalDamage =
(
    raid.totalDamage || 0
) + damage

// =====================
// إذا مات الزعيم
// لا يهاجم اللاعب
// =====================

let bossResult = {

    text: "🏆 تم القضاء على الزعيم!",

    damage: 0,

    playerDead: false

}

if (raid.hp > 0) {

    bossResult = bossAttack(
        raid,
        player
    )

}
    

    // =====================
    // نسبة الصحة
    // =====================

    const hpPercent =
    Math.floor(

        (
            raid.hp /
            raid.maxHp
        ) * 100

    )

    const barLength = 20

const filled = Math.round(
    (hpPercent / 100) * barLength
)

const hpBar =
    "█".repeat(filled) +
    "░".repeat(barLength - filled)

// =====================
// رسالة القتال
// =====================

await sock.sendMessage(

    jid,

    {


text:

`🏰 ═════〔 غــزو المملكة 〕═════ 🏰

⚔️ المهاجم

👤 @${userId.split("@")[0]}

━━━━━━━━━━━━━━━━━━

👹 الزعيم

${raid.bossName}

🏰 المملكة

${raid.kingdom}

━━━━━━━━━━━━━━━━━━

${phaseText}

${passiveText}

${abilityText || "⚔️ هجوم عادي"}

${battle.crit ? "🔥 ضربة حرجة" : ""}

━━━━━━━━━━━━━━━━━━

💥 الضرر

${damage.toLocaleString()}

━━━━━━━━━━━━━━━━━━

❤️ صحة الزعيم

${hpBar}

${hpPercent}%

${raid.hp.toLocaleString()} / ${raid.maxHp.toLocaleString()}

━━━━━━━━━━━━━━━━━━

${bossResult.text}`,

mentions:[
userId
]

        }

    )
    // =====================
// إزالة البونصات المؤقتة
// =====================
await raid.save()
player.damageBonus = 0
player.defenseBonus = 0
player.critRateBonus = 0
player.critDamageBonus = 0
player.dodgeBonus = 0

// characters من نوع Array عام في الموديل، والتعديل المباشر
// على currentHp / dead داخل عناصره لا يُكتشف تلقائياً من Mongoose
// (نفس سبب مشكلة damageMap أعلاه) لذلك نستخدم markModified هنا أيضاً
player.markModified('characters')

await player.save()
    
      // =====================
    // انتهاء الرايد
    // =====================

    if (raid.hp <= 0) {

        raid.active = false

        const ranking =
            getRanking(raid)

        await sock.sendMessage(jid, {

text:

`🎉 ═════〔 تم تحرير المملكة 〕═════ 🎉

🏰 المملكة

${raid.kingdom}

👹 الزعيم

${raid.bossName}

تمت هزيمته بنجاح!

━━━━━━━━━━━━━━━━━━

🏆 يتم الآن احتساب الجوائز...

🎁 يرجى الانتظار...`

        })

        for (

            let i = 0;

            i < ranking.length;

            i++

        ) {

            const [

                targetId,

                totalDamage

            ] = ranking[i]

            // أي خطأ في توزيع جائزة لاعب واحد (مثلاً حساب تالف)
            // لا يجب أن يوقف توزيع بقية الجوائز على باقي المشاركين
            try {

            const targetPlayer =
                await Player.findOne({

                    userId: targetId

                })

            if (!targetPlayer)
                continue

            let reward

            if (i < 3) {

                reward =
                    topReward(

                        i + 1,

                        raid.anime,

                        raid.rewardMultiplier

                    )

            }

            else {

                reward =
                    normalReward(
                        raid.rewardMultiplier
                    )

            }

            // =====================
            // فلوس
            // =====================

            targetPlayer.money +=
                reward.money

            // =====================
            // الصناديق
            // =====================

            if (!targetPlayer.boxes) {

                targetPlayer.boxes = {}

            }

            if (reward.boxes) {

                targetPlayer.boxes.sss_chance =
                    (targetPlayer.boxes.sss_chance || 0) +
                    (reward.boxes.sss_chance || 0)

                targetPlayer.boxes.sss_high =
                    (targetPlayer.boxes.sss_high || 0) +
                    (reward.boxes.sss_high || 0)

            }

            // =====================
            // شخصية SSS
            // =====================

            if (reward.character) {

                targetPlayer.characters.push({

                    ...reward.character,

                    originalPower:
                        reward.character.power,

                    evolutionLevel: 0,

                    urAbilities: [],

                    currentHp:
                        reward.character.power,

                    dead: false

                })

            }

            // =====================
            // إعادة الشخصيات للحياة
            // =====================

            resetCharacters(
                targetPlayer
            )

            targetPlayer.markModified('characters')
            targetPlayer.markModified('boxes')

            await targetPlayer.save()

            // =====================
            // رسالة الجائزة
            // =====================

            await sock.sendMessage(jid, {

text:

`🏆 ═════〔 الجائزة 〕═════ 🏆

${i == 0 ? "🥇 الأول" :
i == 1 ? "🥈 الثاني" :
i == 2 ? "🥉 الثالث" :
"🎖️ مشارك"}

👤 @${targetId.split("@")[0]}

━━━━━━━━━━━━━━━━━━

💰 ${reward.money.toLocaleString()}

${reward.character ?

`🌟 حصل على

${reward.character.name}

⭐ SSS`

:

"❌ لم يحصل على شخصية SSS"

}

🎁 SSS Chance ×${reward.boxes.sss_chance}

🎁 SSS High ×${reward.boxes.sss_high}

💥 إجمالي الضرر

${totalDamage.toLocaleString()}`,

mentions: [

targetId

]

            })

            } catch (rewardErr) {

                console.log(
                    "Raid Reward Error for",
                    targetId,
                    ":",
                    rewardErr
                )

            }

        }

        raid.active = false

raid.phase2 = false
raid.phase3 = false

raid.totalDamage = 0
raid.damageMap = {}

raid.hp = 0
raid.maxHp = 0

raid.endedAt = Date.now()

await raid.save()

    }

}
// =========================
// هل يوجد رايد؟
// =========================

async function isRaidRunning(){

    return await Raid.findOne({

        active:true

    })

}

// =========================
// معلومات الرايد
// =========================

async function getRaidInfo(){

    return await Raid.findOne({

        active:true

    })

}

// =========================
// EXPORTS
// =========================

module.exports = {

    attackRaid,

    isRaidRunning,

    getRaidInfo

}
