// =========================================================
// 🏆 نظام الإنجازات - التعريفات الأساسية
// =========================================================
//
// كل تصنيف يملك 5 مستويات متصاعدة (target تراكمي).
// عند وصول قيمة اللاعب الحالية لمستوى لم يُستلم بعد،
// يتم منح الجائزة تلقائياً وتسجيله كمُستلم.
//
// شكل الجائزة لكل مستوى:
// {
//   tier: 1-5,
//   target: الرقم المطلوب للوصول لهذا المستوى,
//   label: اسم المستوى (بالعربي مع رمز),
//   money: مبلغ المال الممنوح,
//   xp: كمية الخبرة الممنوحة,
//   boxes: { basic: n, rare: n, epic: n, legendary: n, sss_chance: n, sss_high: n },
//   sssCharacter: true/false -> يمنح شخصية SSS عشوائية مباشرة (المستوى الأسطوري فقط),
//   title: نص اللقب الدائم أو null
// }

function tierSet(category, targets) {

    const tierLabels = [
        '🥉 برونزي',
        '🥈 فضي',
        '🥇 ذهبي',
        '💎 بلاتيني',
        '👑 أسطوري'
    ]

    const tierRewards = [
        { money: 5000, xp: 100, boxes: {}, sssCharacter: false },
        { money: 20000, xp: 300, boxes: { basic: 2 }, sssCharacter: false },
        { money: 75000, xp: 800, boxes: { rare: 2 }, sssCharacter: false },
        { money: 200000, xp: 2000, boxes: { epic: 1, legendary: 1 }, sssCharacter: false },
        { money: 500000, xp: 5000, boxes: { sss_chance: 1 }, sssCharacter: true }
    ]

    return targets.map((target, i) => ({
        tier: i + 1,
        target,
        label: tierLabels[i],
        money: tierRewards[i].money,
        xp: tierRewards[i].xp,
        boxes: tierRewards[i].boxes,
        sssCharacter: tierRewards[i].sssCharacter,
        title: i === 4 ? category.title5 : null
    }))
}

const ACHIEVEMENTS = {

    pvp: {
        icon: '⚔️',
        name: 'القتال (PvP)',
        title5: '🏆 أسطورة الحلبة',
        tiers: tierSet(
            { title5: '🏆 أسطورة الحلبة' },
            [10, 50, 150, 400, 1000]
        )
    },

    boss: {
        icon: '👑',
        name: 'الزعيم العالمي',
        tiers: tierSet(
            { title5: '👑 قاهر العالم' },
            [50000, 250000, 1000000, 5000000, 20000000]
        )
    },

    beasts: {
        icon: '🐉',
        name: 'جمع الوحوش',
        tiers: tierSet(
            { title5: '🐉 سيد الوحوش' },
            [3, 5, 7, 9, 10]
        )
    },

    brawl: {
        icon: '🥋',
        name: 'المضاربة',
        tiers: tierSet(
            { title5: '🥋 ملك الشوارع' },
            [10, 30, 75, 150, 300]
        )
    },

    tower: {
        icon: '🗼',
        name: 'برج التحدي',
        tiers: tierSet(
            { title5: '🗼 فاتح البرج' },
            [5, 15, 30, 45, 60]
        )
    },

    kingdom: {
        icon: '🏰',
        name: 'غزو الممالك',
        tiers: tierSet(
            { title5: '🏰 غازي الممالك' },
            [2, 4, 6, 8, 10]
        )
    },

    omega: {
        icon: '🌌',
        name: 'تطوير أوميقا',
        tiers: tierSet(
            { title5: '🌌 المتطور الأوميغا' },
            [1, 2, 3, 4, 5]
        )
    },

    pulls: {
        icon: '🎰',
        name: 'السحب',
        tiers: tierSet(
            { title5: '🎰 صياد الحظ' },
            [50, 200, 500, 1500, 5000]
        )
    },

    boxes: {
        icon: '📦',
        name: 'فتح الصناديق',
        tiers: tierSet(
            { title5: '📦 جامع الصناديق' },
            [25, 100, 300, 800, 2000]
        )
    },

    daily: {
        icon: '📅',
        name: 'المواظبة اليومية',
        tiers: tierSet(
            { title5: '📅 المواظب الأسطوري' },
            [3, 7, 14, 30, 60]
        )
    },

    wealth: {
        icon: '💰',
        name: 'الثروة',
        tiers: tierSet(
            { title5: '💰 امبراطور المال' },
            [100000, 1000000, 5000000, 20000000, 100000000]
        )
    },

    collection: {
        icon: '🧿',
        name: 'جمع الشخصيات',
        tiers: tierSet(
            { title5: '🧿 جامع الأساطير' },
            [10, 30, 60, 100, 150]
        )
    },

    fusion: {
        icon: '🔗',
        name: 'دمج الشخصيات',
        tiers: tierSet(
            { title5: '🔗 سيد الدمج' },
            [10, 30, 75, 150, 300]
        )
    }
}

// يرجع قائمة المستويات المُفتوحة حديثاً (لم تُستلم من قبل)
// ويُحدّث player.achievements مباشرة (يحتاج الاستدعاء الخارجي لعمل save بعدها)
function getNewlyUnlockedTiers(player, categoryKey, currentValue) {

    const def = ACHIEVEMENTS[categoryKey]

    if (!def) return []

    if (!player.achievements) {
        player.achievements = {}
    }

    if (!player.achievements[categoryKey]) {
        player.achievements[categoryKey] = { claimedTiers: [] }
    }

    const claimed =
        player.achievements[categoryKey].claimedTiers || []

    const unlocked = []

    for (const tierDef of def.tiers) {

        if (
            !claimed.includes(tierDef.tier) &&
            currentValue >= tierDef.target
        ) {

            claimed.push(tierDef.tier)
            unlocked.push(tierDef)
        }
    }

    player.achievements[categoryKey].claimedTiers = claimed
    player.markModified('achievements')

    return unlocked
}

// يرجع نسبة التقدم الحالي لكل تصنيف (لأمر عرض الإنجازات .انجازاتي)
function getProgressSummary(player, categoryKey, currentValue) {

    const def = ACHIEVEMENTS[categoryKey]

    if (!def) return null

    const claimed =
        (player.achievements &&
        player.achievements[categoryKey] &&
        player.achievements[categoryKey].claimedTiers) || []

    const nextTier =
        def.tiers.find(t => !claimed.includes(t.tier))

    return {
        icon: def.icon,
        name: def.name,
        claimedCount: claimed.length,
        totalTiers: def.tiers.length,
        currentValue,
        nextTier: nextTier || null
    }
}

module.exports = {
    ACHIEVEMENTS,
    getNewlyUnlockedTiers,
    getProgressSummary
}
