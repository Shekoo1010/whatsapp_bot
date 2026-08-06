const domains = require('../data/domainMonsters')

const equipmentSystem = require('./equipmentSystem')

// =========================
// إعدادات النظام
// =========================

const STAMINA_MAX = 150

// 150 نقطة تتجدد كل 24 ساعة = نقطة كل 9.6 دقيقة
const REGEN_INTERVAL_MS =
    Math.floor((24 * 60 * 60 * 1000) / STAMINA_MAX)

const DOMAIN_COST = 40

const TEAM_SIZE = 3

// جدول ندرة مكافآت الدومين (مستقل عن صناديق المتجر العادية)
const REWARD_TABLE = [

    { rarity: "Rare", chance: 50 },
    { rarity: "Epic", chance: 33 },
    { rarity: "Legendary", chance: 14 },
    { rarity: "Mythical", chance: 3 }

]

// =========================
// Helpers
// =========================

function random(min, max) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min

}

function rollRewardRarity() {

    const roll = random(1, 100)

    let total = 0

    for (const entry of REWARD_TABLE) {

        total += entry.chance

        if (roll <= total) {

            return entry.rarity

        }

    }

    return REWARD_TABLE[0].rarity

}

function makeUid() {

    return (

        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8)

    )

}

// =========================
// تهيئة الستامينا + الفرق لأول مرة
// =========================

function ensureDomainDefaults(player) {

    if (player.stamina === undefined || player.stamina === null) {

        player.stamina = STAMINA_MAX

    }

    if (!player.staminaUpdatedAt) {

        player.staminaUpdatedAt = Date.now()

    }

    if (!player.domainTeams) {

        player.domainTeams = {}

    }

}

// =========================
// تطبيق تجدد الستامينا حسب الوقت المنقضي
// (نفس منطق الوذرينق: نقطة نقطة كل فترة ثابتة)
// =========================

function applyStaminaRegen(player) {

    ensureDomainDefaults(player)

    if (player.stamina >= STAMINA_MAX) {

        player.staminaUpdatedAt = Date.now()

        return player

    }

    const elapsed =
        Date.now() - player.staminaUpdatedAt

    if (elapsed < REGEN_INTERVAL_MS) {

        return player

    }

    const gained =
        Math.floor(elapsed / REGEN_INTERVAL_MS)

    if (gained <= 0) {

        return player

    }

    player.stamina =
        Math.min(
            STAMINA_MAX,
            player.stamina + gained
        )

    // نحتفظ بالباقي (المدة اللي ما اكتملت لنقطة كاملة)
    // عشان ما نخسر وقت تجدد اللاعب
    player.staminaUpdatedAt +=
        gained * REGEN_INTERVAL_MS

    return player

}

// =========================
// معلومات الستامينا للعرض
// =========================

function getStaminaInfo(player) {

    applyStaminaRegen(player)

    let msToNext = 0

    if (player.stamina < STAMINA_MAX) {

        msToNext =
            REGEN_INTERVAL_MS -
            (Date.now() - player.staminaUpdatedAt)

        if (msToNext < 0) msToNext = 0

    }

    return {

        current: player.stamina,
        max: STAMINA_MAX,
        msToNext,
        cost: DOMAIN_COST

    }

}

// =========================
// قائمة الدومينات (للعرض)
// =========================

function listDomains() {

    return Object.values(domains)

}

function getDomain(domainId) {

    return domains[domainId] || null

}

// =========================
// تحديد فريق دومين معين
// indices: مصفوفة أرقام الشخصيات كما تظهر في .شخصياتي (1-based)
// =========================

function setDomainTeam(player, domainId, indices) {

    ensureDomainDefaults(player)

    const domain = getDomain(domainId)

    if (!domain) {

        return {

            success: false,
            message: "❌ رقم الدومين غير صحيح."

        }

    }

    if (!indices || !indices.length) {

        return {

            success: false,
            message: "❌ لازم تحدد شخصيات للفريق."

        }

    }

    if (indices.length > TEAM_SIZE) {

        return {

            success: false,
            message: `❌ الفريق يقبل بحد أقصى ${TEAM_SIZE} شخصيات.`

        }

    }

    const unique = [...new Set(indices)]

    if (unique.length !== indices.length) {

        return {

            success: false,
            message: "❌ لا تكرر نفس الشخصية بالفريق."

        }

    }

    for (const i of indices) {

        if (

            i < 1 ||
            i > player.characters.length

        ) {

            return {

                success: false,
                message: `❌ لا توجد شخصية برقم ${i}.`

            }

        }

    }

    player.domainTeams[domainId] = indices

    if (player.markModified) {

        player.markModified('domainTeams')

    }

    return {

        success: true,
        domain,
        indices

    }

}

// =========================
// إرجاع شخصيات فريق دومين معين (لايف من player.characters
// عشان يعكس آخر معدات/ليفل بدون نسخ قديمة)
// =========================

function getDomainTeamCharacters(player, domainId) {

    ensureDomainDefaults(player)

    const indices = player.domainTeams[domainId]

    if (!indices || !indices.length) {

        return []

    }

    const team = []

    for (const i of indices) {

        const character = player.characters[i - 1]

        if (character) {

            team.push(character)

        }

    }

    return team

}

// =========================
// محاكاة معركة الدومين
// فريق اللاعب (مع بونص معداتهم) ضد موجة وحوش الدومين
// الشخصيات "تترست" تلقائياً كل دخول (HP مؤقت لهذي المحاولة بس)
// =========================

function simulateDomainBattle(team, domain) {

    const fighters = team.map(character => {

        const eq =
            equipmentSystem.calculateEquipmentStats(character)

        const maxHp =
            (character.power || 100) +
            (eq.hp || 0)

        return {

            name: character.name,

            hp: maxHp,
            maxHp,

            attack:
                Math.floor((character.power || 100) * 0.4) +
                (eq.attack || 0),

            defense: eq.defense || 0,
            critRate: eq.critRate || 0,
            critDamage: eq.critDamage || 0,
            dodge: eq.dodge || 0,
            lifesteal: eq.lifesteal || 0

        }

    })

    const monsters = domain.monsters.map(m => ({

        name: m.name,
        emoji: m.emoji,

        hp: m.hp,
        maxHp: m.hp,

        attack: m.attack,
        defense: m.defense

    }))

    const log = []

    log.push(`${domain.emoji} دخلت ${domain.name}`)

    let round = 1
    const MAX_ROUNDS = 40

    function aliveFighters() {

        return fighters.filter(f => f.hp > 0)

    }

    function aliveMonsters() {

        return monsters.filter(m => m.hp > 0)

    }

    while (

        aliveFighters().length &&
        aliveMonsters().length &&
        round <= MAX_ROUNDS

    ) {

        // فريق اللاعب يهاجم أول وحش حي
        for (const fighter of aliveFighters()) {

            const target = aliveMonsters()[0]

            if (!target) break

            let damage = fighter.attack - target.defense

            if (damage < 1) damage = 1

            const isCrit =
                Math.random() * 100 <= fighter.critRate

            if (isCrit) {

                damage = Math.floor(
                    damage * (1.5 + fighter.critDamage / 100)
                )

            }

            target.hp -= damage

            if (fighter.lifesteal > 0) {

                fighter.hp = Math.min(
                    fighter.maxHp,
                    fighter.hp + Math.floor(
                        damage * fighter.lifesteal / 100
                    )
                )

            }

            if (target.hp <= 0) {

                target.hp = 0

                log.push(
                    `${target.emoji} ${target.name} قُضي عليه!`
                )

            }

        }

        // الوحوش الأحياء ترد الهجوم على فريق عشوائي
        for (const monster of aliveMonsters()) {

            const targets = aliveFighters()

            if (!targets.length) break

            const fighter =
                targets[random(0, targets.length - 1)]

            const dodged =
                Math.random() * 100 <= fighter.dodge

            if (dodged) continue

            let damage = monster.attack - fighter.defense

            if (damage < 1) damage = 1

            fighter.hp -= damage

            if (fighter.hp <= 0) {

                fighter.hp = 0

            }

        }

        round++

    }

    const win =
        aliveMonsters().length === 0 &&
        aliveFighters().length > 0

    return {

        win,
        rounds: round - 1,
        log,
        survivors: aliveFighters().length,
        totalFighters: fighters.length

    }

}

// =========================
// دخول الدومين (الوظيفة الرئيسية)
// =========================

function enterDomain(player, domainId) {

    ensureDomainDefaults(player)

    const domain = getDomain(domainId)

    if (!domain) {

        return {

            success: false,
            message: "❌ رقم الدومين غير صحيح.\n\n📌 المتاح: 1 (إكسسوار) / 2 (سلاح) / 3 (درع)"

        }

    }

    const team = getDomainTeamCharacters(player, domainId)

    if (!team.length) {

        return {

            success: false,
            message:
`❌ ما حددت فريق لهذا الدومين بعد.

📌 حدده أول بـ:
.فريق_دومين ${domainId} 123

(الأرقام = أرقام شخصياتك من .شخصياتي، أقصى 3)`

        }

    }

    const stamina = getStaminaInfo(player)

    if (stamina.current < DOMAIN_COST) {

        const minutes = Math.ceil(stamina.msToNext / 60000)

        return {

            success: false,

            message:
`⚡ ستامينتك ما تكفي.

📊 ${stamina.current}/${stamina.max}
💸 التكلفة: ${DOMAIN_COST}

⏳ أقرب نقطة تتجدد خلال ${minutes} دقيقة`

        }

    }

    player.stamina -= DOMAIN_COST

    const result = simulateDomainBattle(team, domain)

    if (!result.win) {

        return {

            success: true,
            win: false,

            domain,
            battle: result,

            staminaLeft: player.stamina,

            message:
`${domain.emoji} خسرت بدومين ${domain.name}!

💀 فريقك ما قدر يتخطى الموجة.

⚡ الستامينا المتبقية: ${player.stamina}/${STAMINA_MAX}`

        }

    }

    const rarity = rollRewardRarity()

    const item =
        equipmentSystem.generateDomainEquipment(
            rarity,
            domain.equipType
        )

    if (item) {

        item.uid = makeUid()

        if (

            !player.inventory ||
            player.inventory.length < player.maxInventory

        ) {

            player.inventory = player.inventory || []
            player.inventory.push(item)

        }

    }

    return {

        success: true,
        win: true,

        domain,
        battle: result,
        item,

        staminaLeft: player.stamina,

        message:
`${domain.emoji} فزت بدومين ${domain.name}!

⚔️ نجا ${result.survivors}/${result.totalFighters} من فريقك

${item ?

`🎁 حصلت على:
${item.name}
🏷 ${item.rarity}
${"⭐".repeat(item.stars || 1)}` :

"⚠️ الحقيبة ممتلئة، ما قدرنا نعطيك المكافأة."}

⚡ الستامينا المتبقية: ${player.stamina}/${STAMINA_MAX}`

    }

}

// =========================
// Exports
// =========================

module.exports = {

    STAMINA_MAX,
    DOMAIN_COST,
    TEAM_SIZE,

    listDomains,
    getDomain,

    getStaminaInfo,
    applyStaminaRegen,

    setDomainTeam,
    getDomainTeamCharacters,

    enterDomain

}
