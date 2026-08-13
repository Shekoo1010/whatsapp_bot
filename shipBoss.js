// =========================================================================
// زعيم السفينة (Ship Boss) — النسخة الكاملة
// =========================================================================
// ✅ التحديثات المطلوبة (راجع الأرقام لو تبي تعدلها، كلها بالأعلى بمتغيرات
//    واضحة عشان التوازن يكون سهل التعديل بدون ما تلمس المنطق):
//
//   • 10 زعماء بأسماء ثابتة من الأنمي (مو أسامي عشوائية) + حقل صورة
//     (image) لكل زعيم — الحقل فاضي '' لأنه ما يصير أجيب صور شخصيات
//     محمية بحقوق نشر تلقائياً؛ حطّ رابط صورة مباشر (زي روابط ibb.co
//     المستخدمة بباقي index.js) بكل عنصر لتفعيل إرسالها.
//   • كل زعيم عنده 3 قدرات خاصة (BOSS ABILITIES) يرد فيها على اللاعب
//     اللي يهاجمه (كاونتر أتاك) بنسبة معينة كل ضربة.
//   • اللاعبين عندهم "دم" خاص بمعركة الزعيم (shipCombatHp) منفصل عن
//     أي نظام HP ثاني بالبوت. اللي يوصل دمه صفر "يموت" ويصير ما يقدر
//     يهاجم لمدة دقيقتين (DEATH_COOLDOWN_MS).
//   • اللاعبين كمان عندهم قدراتهم الخاصة (PLAYER_ABILITIES) تطلع
//     عشوائياً كل ضربة (ضربة حاسمة / تفادي / امتصاص حياة / درع).
//   • ضرر الضربة الواحدة (الدمج الكلي لكل الطاقم يتحسب من مجموع
//     هالضربات عبر bossDamage) محصور بين MERGE_HIT_MIN و MERGE_HIT_MAX.
//   • دم الزعيم نفسه من 100 مليون وفوق (BASE_BOSS_HP وما فوق حسب
//     مستوى السفينة وترتيب الزعيم).
//   • بما إن أقصى عدد أعضاء بالطاقم 4 (MAX_CREW بـ shipCommands.js)،
//     جوائز القضاء على الزعيم تُوزَّع كترتيب "دمج" مرقّم بين كل من
//     شارك: 1️⃣ 1,500,000 + 50 عملة سفينة | 2️⃣ 1,000,000 + 40 |
//     3️⃣ 700,000 + 30 | 4️⃣ 500,000 + 20 — حسب مين سوّى أعلى ضرر.
//   • الزعيم يظهر تلقائياً مرة كل يوم الساعة 12 ظهراً بتوقيت السعودية
//     (autoSpawnAllShipBosses، مربوطة بـ startShipDailyReset الموجودة
//     أصلاً بـ shipCommands.js فما احتجنا نلمس index.js الضخم).
//     يبقى الزعيم موجود لين يموت، ولو ماتوه قبل الظهر يصير ما فيه
//     زعيم لين تشيك الجدولة اليومية الجاية الساعة 12 وتستدعي التالي
//     تلقائياً (بالدورة: زعيم 1 ← 2 ← ... ← 10 ← 1 ...).
//
// ⚠️ الأرقام المتعلقة بالتوازن (HP/Attack/نسب القدرات) من تصميمي أنا
// (Claude) عشان يشتغل نظام كامل ومتزن — عدّلها براحتك.
// =========================================================================

const Ship = require('./models/Ship')
const Player = require('./models/Player')
const { calculatePower } = require('./shipBattleEngine')
const { addShipXP } = require('./shipLevel')

// =========================================================
// 👹 قائمة الزعماء العشرة — بالترتيب من الأضعف للأقوى (index 0-9)
// =========================================================
const BOSSES = [
    {
        name: 'فريزا',
        series: 'دراغون بول Z',
        image: '',
        abilities: [
            { name: '💥 شعاع الموت', mult: 1.0 },
            { name: '❄️ التجمد الكوني', mult: 0.8 },
            { name: '👑 الشكل الأخير', mult: 1.3 }
        ]
    },
    {
        name: 'ديو براندو',
        series: 'JoJo\'s Bizarre Adventure',
        image: '',
        abilities: [
            { name: '⏳ إيقاف الزمن (ذا وورلد)', mult: 1.2 },
            { name: '🩸 امتصاص الدم', mult: 0.9 },
            { name: '👊 موضا موضا موضا', mult: 1.1 }
        ]
    },
    {
        name: 'مادارا أوتشيها',
        series: 'ناروتو',
        image: '',
        abilities: [
            { name: '🌙 تسوكويومي اللانهائي', mult: 1.1 },
            { name: '🔥 قصف سوسانوو', mult: 1.2 },
            { name: '🌲 شيبو تينسي (الشجرة الإلهية)', mult: 1.0 }
        ]
    },
    {
        name: 'غريفيث',
        series: 'برسيرك',
        image: '',
        abilities: [
            { name: '🦅 فيمتو المجنّح', mult: 1.3 },
            { name: '⚔️ سيف الحكم', mult: 1.0 },
            { name: '🌑 كسوف الشياطين', mult: 1.4 }
        ]
    },
    {
        name: 'سوسكي آيزن',
        series: 'بليتش',
        image: '',
        abilities: [
            { name: '🌀 كيوكا سويغيتسو (الوهم التام)', mult: 1.2 },
            { name: '💠 هوغيوكو', mult: 1.3 },
            { name: '🗡️ زانباكوتو المطلق', mult: 1.1 }
        ]
    },
    {
        name: 'دوفلامينغو',
        series: 'ون بيس',
        image: '',
        abilities: [
            { name: '🧵 خيوط التحكم', mult: 1.1 },
            { name: '👑 حكم السماء', mult: 1.2 },
            { name: '⛓️ سجن الخيوط الملكي', mult: 1.3 }
        ]
    },
    {
        name: 'مزان كيبوتسوجي',
        series: 'مبيد الشياطين',
        image: '',
        abilities: [
            { name: '🩸 تحول الدم الشيطاني', mult: 1.3 },
            { name: '🌒 هجوم منتصف الليل', mult: 1.2 },
            { name: '♾️ التجدد الفوري', mult: 1.0 }
        ]
    },
    {
        name: 'أول فور وان',
        series: 'أكاديمية الأبطال',
        image: '',
        abilities: [
            { name: '💪 سرقة القدرات', mult: 1.4 },
            { name: '🌊 موجة الطاقة المركّزة', mult: 1.2 },
            { name: '🛡️ الدرع اللامتناهي', mult: 1.1 }
        ]
    },
    {
        name: 'ميروم',
        series: 'هانتر × هانتر',
        image: '',
        abilities: [
            { name: '👑 إرادة الملك', mult: 1.4 },
            { name: '🐜 وخز النيميليس', mult: 1.2 },
            { name: '🧠 استيعاب المعرفة', mult: 1.3 }
        ]
    },
    {
        name: 'إيرين ييغر',
        series: 'هجوم العمالقة',
        image: '',
        abilities: [
            { name: '🌍 صراخ المؤسس', mult: 1.5 },
            { name: '🦴 عملاق الهجوم', mult: 1.3 },
            { name: '💀 دوس المطارق', mult: 1.4 }
        ]
    }
]

// =========================================================
// ⚔️ قدرات اللاعبين — تطلع عشوائياً بكل ضربة (نسب من 0 إلى 1)
// =========================================================
const PLAYER_ABILITIES = [
    { id: 'crit', name: '💢 ضربة حاسمة', chance: 0.15, damageMult: 1.5 },
    { id: 'dodge', name: '💨 تفادي', chance: 0.20 },
    { id: 'lifesteal', name: '🩸 امتصاص حياة', chance: 0.15, healPercent: 0.20 },
    { id: 'shield', name: '🛡️ درع مؤقت', chance: 0.20, counterReduction: 0.5 }
    // الباقي (30%) = ضربة عادية بدون قدرة
]

function rollPlayerAbility() {

    const roll = Math.random()
    let acc = 0

    for (const ability of PLAYER_ABILITIES) {

        acc += ability.chance

        if (roll <= acc) return ability
    }

    return null // ضربة عادية
}

// =========================================================
// 📊 إعدادات التوازن — عدّل هذي القيم براحتك
// =========================================================

const BASE_BOSS_HP = 100000000        // 100 مليون كحد أدنى لأضعف زعيم بأقل مستوى
const BOSS_HP_PER_INDEX = 20000000    // كل زعيم أقوى من اللي قبله بـ 20 مليون
const BOSS_HP_LEVEL_GROWTH = 0.035    // %3.5 زيادة لكل مستوى سفينة فوق الأول

// ⚔️ إحصائية "هجوم" الزعيم المعروضة بالكارد — أساس حساب رد الزعيم
// (counterDamage) قبل ما ينحصر بحد BOSS_COUNTER_MAX بالأسفل
const BASE_BOSS_ATTACK = 800
const BOSS_ATTACK_PER_INDEX = 150
const BOSS_ATTACK_LEVEL_GROWTH = 0.03

// 🗡️ دمج ضربة اللاعبين (اللعيبة) على الزعيم — من 400 ألف إلى 40 مليون
const MERGE_HIT_MIN = 400000
const MERGE_HIT_MAX = 40000000
const POWER_REFERENCE = 500000         // القوة اللي عندها اللاعب يوصل قريب من أعلى ضرر ممكن

// 😈 رد الزعيم (الضرر اللي يوخذه اللاعب المهاجم) — محصور 6000 وتحت دايماً
const BOSS_COUNTER_MIN = 200
const BOSS_COUNTER_MAX = 6000

// ❤️ دم قتالي ثابت لكل لاعب بمعركة زعيم السفينة (نفس القيمة للجميع)
const PLAYER_COMBAT_HP = 100000

const COUNTER_CHANCE = 0.5             // احتمال رد الزعيم بعد كل ضربة
const DEATH_COOLDOWN_MS = 2 * 60 * 1000 // دقيقتين

const TIER_REWARDS = [
    { place: 1, money: 1500000, shipCoins: 50 },
    { place: 2, money: 1000000, shipCoins: 40 },
    { place: 3, money: 700000, shipCoins: 30 },
    { place: 4, money: 500000, shipCoins: 20 }
]

function getBossStats(shipLevel, bossIndex) {

    const boss = BOSSES[bossIndex % BOSSES.length]

    const baseHp = BASE_BOSS_HP + (bossIndex * BOSS_HP_PER_INDEX)
    const baseAttack = BASE_BOSS_ATTACK + (bossIndex * BOSS_ATTACK_PER_INDEX)

    const levelFactor = Math.max(0, (shipLevel || 1) - 1)

    const hp = Math.floor(
        baseHp + (baseHp * BOSS_HP_LEVEL_GROWTH * levelFactor)
    )

    const attack = Math.floor(
        baseAttack + (baseAttack * BOSS_ATTACK_LEVEL_GROWTH * levelFactor)
    )

    return { hp, attack, name: boss.name, series: boss.series, image: boss.image }
}

// خبرة السفينة عند إسقاط الزعيم — تزيد شوي مع المستوى
function getShipXpReward(shipLevel) {
    return 1200 + ((shipLevel || 1) * 40)
}

// =========================================================
// 🎯 حساب ضرر الضربة الواحدة (محصور بين MERGE_HIT_MIN و MERGE_HIT_MAX)
// =========================================================
function calculateHitDamage(power) {

    const normalized = Math.min(1, Math.max(0, power / POWER_REFERENCE))

    const variance = 0.9 + (Math.random() * 0.2) // 90% - 110%

    const raw =
        MERGE_HIT_MIN +
        (normalized * (MERGE_HIT_MAX - MERGE_HIT_MIN) * variance)

    return Math.min(
        MERGE_HIT_MAX,
        Math.max(MERGE_HIT_MIN, Math.floor(raw))
    )
}

// دم قتالي خاص باللاعب لمعركة الزعيم — ثابت 100 ألف للجميع
function getPlayerCombatMaxHp() {
    return PLAYER_COMBAT_HP
}

// =========================================================
// استدعاء الزعيم
// auto=true  → استدعاء تلقائي يومي (بدون تذكرة، الساعة 12 ظهراً)
// auto=false → استدعاء يدوي (لازم يشتري "استدعاء زعيم السفينة" من المتجر)
// =========================================================
async function summonShipBoss(shipId, { auto = false } = {}) {

    const ship = await Ship.findOne({ shipId })

    if (!ship) return { error: 'ship_not_found' }

    if (ship.bossActive) {
        return { error: 'boss_already_active' }
    }

    if (!auto) {

        if (!ship.bossAvailable) {
            return { error: 'boss_not_purchased' }
        }

        ship.bossAvailable = false
        ship.bossPurchasedAt = Date.now()
    }

    const nextIndex = ((ship.bossIndex ?? -1) + 1) % BOSSES.length

    const { hp, attack, name, series, image } =
        getBossStats(ship.level, nextIndex)

    ship.bossActive = true
    ship.bossIndex = nextIndex
    ship.bossName = name
    ship.bossSeries = series
    ship.bossImage = image
    ship.bossHp = hp
    ship.bossMaxHp = hp
    ship.bossAttack = attack
    ship.bossDamage = new Map()
    ship.bossSessionId = Date.now()

    await ship.save()

    return { ship, boss: BOSSES[nextIndex] }
}

// =========================================================
// 🌅 استدعاء تلقائي يومي لكل السفن اللي ما عندها زعيم نشط حالياً
// تُستدعى من الجدولة اليومية (شوف shipCommands.js → startShipDailyReset)
// =========================================================
async function autoSpawnAllShipBosses() {

    const ships = await Ship.find({ bossActive: false })

    let spawned = 0

    for (const ship of ships) {

        try {

            const result = await summonShipBoss(ship.shipId, { auto: true })

            if (!result.error) spawned++

        } catch (err) {
            console.log('❌ خطأ باستدعاء زعيم تلقائي للسفينة', ship.shipId, err)
        }
    }

    return { spawned, total: ships.length }
}

// =========================================================
// هجوم على الزعيم — أعضاء الطاقم المسجلين بنفس السفينة فقط
// =========================================================
async function attackShipBoss(shipId, userId) {

    const ship = await Ship.findOne({ shipId })

    if (!ship) return { error: 'ship_not_found' }

    if (!ship.bossActive) {
        return { error: 'no_active_boss' }
    }

    if (!ship.members.includes(userId)) {
        return { error: 'not_crew_member' }
    }

    const player = await Player.findOne({ userId })

    if (!player) return { error: 'player_not_found' }

    // ─── جلسة قتال جديدة؟ (زعيم جديد) → صفّر دم اللاعب القتالي ───
    if (player.shipCombatSessionId !== ship.bossSessionId) {

        const initPower = calculatePower(player)

        player.shipCombatSessionId = ship.bossSessionId
        player.shipCombatMaxHp = getPlayerCombatMaxHp(initPower)
        player.shipCombatHp = player.shipCombatMaxHp
        player.shipDeathUntil = 0
    }

    // ─── اللاعب "ميت" حالياً؟ ───
    const now = Date.now()

    if (player.shipDeathUntil && now < player.shipDeathUntil) {

        return {
            error: 'player_dead',
            remainingMs: player.shipDeathUntil - now
        }
    }

    const power = calculatePower(player)

    // ─── ضرر ضربة اللاعب (قدرة اللاعب ممكن تعدّلها) ───
    const playerAbility = rollPlayerAbility()

    let damage = calculateHitDamage(power)

    if (playerAbility?.id === 'crit') {
        damage = Math.min(
            MERGE_HIT_MAX,
            Math.floor(damage * playerAbility.damageMult)
        )
    }

    const prevDamage = ship.bossDamage.get(userId) || 0
    ship.bossDamage.set(userId, prevDamage + damage)

    ship.bossHp = Math.max(0, ship.bossHp - damage)

    // ─── الزعيم انتهى ───
    if (ship.bossHp <= 0) {

        const ranked = [...ship.bossDamage.entries()]
            .sort((a, b) => b[1] - a[1])

        const shipXpReward = getShipXpReward(ship.level)

        const rewardsGiven = []

        for (let i = 0; i < ranked.length; i++) {

            const [pid, dmg] = ranked[i]
            const tier = TIER_REWARDS[i] // undefined لو أكثر من 4 (مستحيل، الطاقم أقصاه 4)

            const money = tier ? tier.money : 0
            const shipCoins = tier ? tier.shipCoins : 0

            await Player.updateOne(
                { userId: pid },
                {
                    $inc: {
                        money,
                        totalEarnedMoney: money,
                        shipCoins,
                        xp: 150
                    },
                    $set: {
                        shipCombatHp: 0,
                        shipCombatMaxHp: 0,
                        shipDeathUntil: 0
                    }
                }
            )

            rewardsGiven.push({
                userId: pid,
                place: i + 1,
                damage: dmg,
                money,
                shipCoins
            })
        }

        ship.bossActive = false
        ship.bossHp = 0
        ship.bossDamage = new Map()

        await ship.save()

        await addShipXP(shipId, shipXpReward)

        return {
            defeated: true,
            damage,
            playerAbility: playerAbility?.name || null,
            bossName: ship.bossName,
            shipXpReward,
            leaderboard: rewardsGiven
        }
    }

    // ─── الزعيم لسا حي → هل يرد؟ ───
    let bossAbilityUsed = null
    let counterDamage = 0
    let died = false

    const dodged = playerAbility?.id === 'dodge'

    if (!dodged && Math.random() < COUNTER_CHANCE) {

        const boss = BOSSES[ship.bossIndex] || BOSSES[0]
        const ability =
            boss.abilities[
                Math.floor(Math.random() * boss.abilities.length)
            ]

        bossAbilityUsed = ability.name

        const variance = 0.9 + (Math.random() * 0.2)

        counterDamage = Math.min(
            BOSS_COUNTER_MAX,
            Math.max(
                BOSS_COUNTER_MIN,
                Math.floor(ship.bossAttack * ability.mult * variance)
            )
        )

        if (playerAbility?.id === 'shield') {
            counterDamage = Math.floor(
                counterDamage * playerAbility.counterReduction
            )
        }

        player.shipCombatHp = Math.max(0, player.shipCombatHp - counterDamage)

        if (player.shipCombatHp <= 0) {
            died = true
            player.shipDeathUntil = now + DEATH_COOLDOWN_MS
        }
    }

    // ─── امتصاص حياة (لو صار) ───
    if (playerAbility?.id === 'lifesteal') {

        const heal = Math.floor(damage * playerAbility.healPercent)

        player.shipCombatHp = Math.min(
            player.shipCombatMaxHp,
            player.shipCombatHp + heal
        )
    }

    await player.save()
    await ship.save()

    return {
        defeated: false,
        damage,
        playerAbility: playerAbility?.name || null,
        bossAbilityUsed,
        counterDamage,
        died,
        deathCooldownMs: died ? DEATH_COOLDOWN_MS : 0,
        remainingHp: ship.bossHp,
        maxHp: ship.bossMaxHp,
        playerHp: player.shipCombatHp,
        playerMaxHp: player.shipCombatMaxHp
    }
}

module.exports = {
    BOSSES,
    PLAYER_ABILITIES,
    TIER_REWARDS,
    DEATH_COOLDOWN_MS,
    summonShipBoss,
    autoSpawnAllShipBosses,
    attackShipBoss,
    getBossStats,
    getShipXpReward,
    calculateHitDamage,
    getPlayerCombatMaxHp
}
