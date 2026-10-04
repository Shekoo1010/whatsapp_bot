// =====================================================
// ⚙️ إعدادات نظام الأورب والبنر (مثل Genshin Impact Wish)
// كل الأرقام هنا — عدّلها من مكان واحد فقط
// =====================================================

const PULL_COST = 160            // سحبة واحدة
const MULTI_COUNT = 10           // سحبة متعددة
const MULTI_COST = PULL_COST * MULTI_COUNT   // 1600

const SSS_RATE = 5               // نسبة SSS الأساسية (%)
const SOFT_PITY_START = 40       // من هذه السحبة تبدأ النسبة بالارتفاع
const SOFT_PITY_STEP = 10        // زيادة % لكل سحبة بعد بداية soft pity
const HARD_PITY = 50             // ضمان SSS عند السحبة 50
const FEATURED_CHANCE = 0.70     // احتمال أن تكون الـ SSS هي شخصية البنر (70%)

// باقي الندرات (من السحبات اللي ما طلع فيها SSS)
const LEGENDARY_RATE = 17        // اسطوري %
const EXCELLENT_RATE = 28        // ممتاز %
// الباقي = عادي

// المهام اليومية للأورب — المجموع لازم يكون 1200 (× 7 أيام = 8400 أسبوعياً)
const DAILY_MISSIONS = [
    { key: 'daily',         name: 'استلام المكافأة اليومية',  cmd: '.يومي',          target: 1,  orbs: 150 },
    { key: 'fightWins',     name: 'الفوز في قتال عادي',        cmd: '.قتال',          target: 10, orbs: 150 },
    { key: 'arenaWins',     name: 'الفوز في الأرينا',          cmd: '.هجوم_ارينا',    target: 5,  orbs: 200 },
    { key: 'groupWins',     name: 'الفوز في قتال المجموعات',   cmd: '.قتال_مجموع',    target: 10, orbs: 200 },
    { key: 'pvpWins',       name: 'الفوز في PvP',              cmd: '.قتال pvp',      target: 10, orbs: 200 },
    { key: 'challengeWins', name: 'الفوز في التحدي',           cmd: '.تحدي',          target: 5,  orbs: 150 },
    { key: 'brawlWins',     name: 'الفوز في المضاربة',         cmd: '.مضاربة',        target: 10, orbs: 150 }
]

const DAILY_ORBS_TOTAL = DAILY_MISSIONS.reduce((s, m) => s + m.orbs, 0)   // 1200
const WEEKLY_ORBS_TOTAL = DAILY_ORBS_TOTAL * 7                            // 8400

// البنر: يتجدد كل خميس 12:00 ص بتوقيت السعودية
const BANNER_RESET_WEEKDAY = 4   // 0=الأحد ... 4=الخميس

// التصويت على البنر القادم: يفتح الأحد 5:00 م ويقفل بعد 24 ساعة (الاثنين 5:00 م) بتوقيت السعودية
const VOTE_OPEN_WEEKDAY = 0      // 0=الأحد
const VOTE_OPEN_HOUR = 17        // 5:00 م
const VOTE_DURATION_HOURS = 24
const VOTE_CANDIDATES = 3
const MIN_BANNER_POWER = 6000    // أقل قوة مسموحة لشخصية البنر والمرشحين
const RECENT_BANNERS_KEEP = 20       // ما تتكرر شخصية بنر قبل مرور 20 بنر
const RECENT_CANDIDATES_KEEP = 60    // والمرشحين ما يتكررون قبل 20 تصويت (3 × 20)

// القروبات اللي يُرسل لها إعلان البنر والتصويت
const BANNER_GROUPS = [
    '120363020823525909@g.us',
    '120363428933463078@g.us',
    '120363409897316453@g.us',
    '120363116482407260@g.us'
]

module.exports = {
    PULL_COST, MULTI_COUNT, MULTI_COST,
    SSS_RATE, SOFT_PITY_START, SOFT_PITY_STEP, HARD_PITY, FEATURED_CHANCE,
    LEGENDARY_RATE, EXCELLENT_RATE,
    DAILY_MISSIONS, DAILY_ORBS_TOTAL, WEEKLY_ORBS_TOTAL,
    BANNER_RESET_WEEKDAY,
    VOTE_OPEN_WEEKDAY, VOTE_OPEN_HOUR, VOTE_DURATION_HOURS, VOTE_CANDIDATES, MIN_BANNER_POWER,
    RECENT_BANNERS_KEEP, RECENT_CANDIDATES_KEEP,
    BANNER_GROUPS
}
