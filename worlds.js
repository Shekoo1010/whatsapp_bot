const mongoose = require('mongoose')
const Player = require('./models/Player')
const characters = require('./characters.json')
const { WORLD_CATALOG, WORLD_BY_KEY } = require('./worldsCatalog')

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// 🔁 إعادة محاولة الإرسال (مهم لرسالة نتائج الأسبوع)
async function sendMessageWithRetry(sock, jid, content, maxRetries = 5, delayMs = 3000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await sock.sendMessage(jid, content)
        } catch (err) {
            console.log(
                `⚠️ محاولة ${attempt}/${maxRetries} فشلت لإرسال رسالة العوالم لـ ${jid}:`,
                err?.message || err
            )
            if (attempt === maxRetries) throw err
            await sleep(delayMs)
        }
    }
}

// =====================================================================
// 🌍 نظام العوالم الجديد: 100 عالم أنمي — كل عالم للاعب واحد فقط
// منافسة أسبوعية، وكل أسبوع يُختار نظامان عشوائيان فقط لاحتساب النقاط
// =====================================================================

// ⚙️ إعدادات قابلة للتعديل ───────────────────────────────────────────

// أفضل كم عالم ياخذ جوائز المراكز
const TOP_RANKS = 5

// جوائز المراكز (تُمنح فقط لمن لديه نقطة أو أكثر)
const RANK_REWARDS = [
    { money: 5_000_000, sss: 2, boxes: { sss_chance: 1, sss_high: 1 } }, // 🥇
    { money: 3_500_000, sss: 1 },                                          // 🥈
    { money: 3_000_000, sss: 1 },                                          // 🥉
    { money: 2_500_000, sss: 1 },                                          // 4
    { money: 2_000_000, sss: 1 }                                           // 5
]

// جائزة كل باقي المشاركين
const PARTICIPANT_REWARD = { money: 500_000, legendary: 2 }

// عدد الأنظمة المحتسبة كل أسبوع
const WEEKLY_SYSTEMS_COUNT = 2

// هل يشترط أن يكون خصمك منضماً لعالم حتى تُحسب نقطة القتال؟
// (false = أي فوز يُحسب، تقدر ترجعها true لو تبي تمنع الاستغلال)
const REQUIRE_OPPONENT_IN_WORLD = false

// نقاط التطوير حسب الرتبة (نفس الجدول القديم)
const EVOLUTION_POINTS = {
    'SSS+':   1,
    'SSS++':  1,
    'UR I':   2,
    'UR II':  2,
    'UR III': 3,
    'EX':     5,
    'Ω':      10
}

// القروبات اللي يوصلها إعلان نهاية الأسبوع
const WORLD_SEASON_GROUP_JID = [
    '120363020823525909@g.us',
    '120363409897316453@g.us',
    '120363116482407260@g.us',
    '120363362807326585@g.us'
]

const SAUDI_UTC_OFFSET_HOURS = 3

// ─────────────────────────────────────────────────────────────────────
// 🎲 أنظمة النقاط (12 نظام — البوت يختار 2 منها كل أسبوع)
// type: event  = نقطة مباشرة
//       duel   = فوز +1 / خسارة المهاجم -1
//       counter= كل N مرة = نقطة
//       boss   = كل N ضربة على الزعيم
// ─────────────────────────────────────────────────────────────────────
const SYSTEMS = {
    pull_sss:     { icon: '🎰', title: 'سحب شخصية SSS',        desc: 'كل شخصية SSS تسحبها = نقطة',                 type: 'event' },
    group_battle: { icon: '⚔️', title: 'قتال المجموع',          desc: 'كل فوز بـ .قتال_مجموع = نقطة (والخسارة بالهجوم -1)', type: 'duel' },
    fight_normal: { icon: '🗡️', title: 'قتال الشخصيات العادية', desc: 'كل فوز بـ .قتال = نقطة (والخسارة بالهجوم -1)',       type: 'duel' },
    brawl:        { icon: '🥊', title: 'المضاربة',              desc: 'كل فوز بمضاربة = نقطة (والخسارة بالهجوم -1)',        type: 'duel' },
    challenge:    { icon: '🏆', title: 'التحدي',                desc: 'كل فوز بتحدي = نقطة (والخسارة بالهجوم -1)',          type: 'duel' },
    beast_hits:   { icon: '🦊', title: 'كوراما والجوبي',        desc: 'كل 3 ضربات على كوراما أو الجوبي = نقطة',     type: 'counter', per: 3, field: 'worldCtrBeast' },
    boss_hits:    { icon: '👹', title: 'الزعيم',                desc: 'كل 5 ضربات على الزعيم = نقطة',               type: 'boss',    per: 5 },
    pvp:          { icon: '🥇', title: 'قتال PvP',              desc: 'كل فوز بـ pvp = نقطة (والخسارة بالهجوم -1)',         type: 'duel' },
    weapon_pull:  { icon: '🔱', title: 'سحب الأسلحة',           desc: 'كل 5 سحبات سلاح = نقطة',                      type: 'counter', per: 5, field: 'worldCtrWeapon' },
    arena:        { icon: '🏟️', title: 'تحدي الأرينا',          desc: 'كل فوز بتحدي الأرينا = نقطة (والخسارة بالهجوم -1)', type: 'duel' },
    kingdom:      { icon: '🏰', title: 'غزو المملكة',           desc: 'كل طابقين تتجاوزهم = نقطة',                   type: 'counter', per: 2, field: 'worldCtrKingdom' },
    evolution:    { icon: '💎', title: 'تطوير الشخصيات',        desc: 'نقاط حسب رتبة التطوير (SSS+ ← 1 ... Ω ← 10)', type: 'event' }
}

const SYSTEM_KEYS = Object.keys(SYSTEMS)

// أسماء الحقول العدّادة (تُصفَّر مع بداية كل أسبوع)
const COUNTER_FIELDS = ['worldCtrBeast', 'worldCtrWeapon', 'worldCtrKingdom']

// =====================================================================
// 📚 الكتالوج + التوافق مع الكود القديم
// =====================================================================

// WORLDS[key] = { key, name: 'ون بيس 🏴‍☠️', icon } — نفس الشكل القديم
const WORLDS = {}
for (const w of WORLD_CATALOG) {
    WORLDS[w.key] = { key: w.key, name: `${w.name} ${w.icon}`, icon: w.icon }
}

// أوامر الانضمام القديمة ما زالت تشتغل
const JOIN_COMMANDS = {
    '.انضم_ونبيس':  'onepiece',
    '.انضم_بليتش':  'bleach',
    '.انضم_هنتر':   'hunter',
    '.انضم_دراغون': 'dragonball'
}

function worldName(key) {
    return WORLDS[key] ? WORLDS[key].name : String(key || '؟')
}

// =====================================================================
// 📦 قاعدة البيانات
// =====================================================================

// سجل لكل عالم: owner = اللاعب الوحيد داخل العالم
const WorldSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    owner: { type: String, default: null },
    points: { type: Number, default: 0 },
    season: { type: Number, default: 1 },
    rewardedUsers: { type: [String], default: [] }, // قديم — للتوافق فقط
    joinedAt: { type: Date, default: null },
    lastPointAt: { type: Date, default: null }
})

const World = mongoose.models.World || mongoose.model('World', WorldSchema)

// سجل واحد يخزن حالة الأسبوع الحالي (رقمه + الأنظمة المختارة + من استلم الجوائز)
const MetaSchema = new mongoose.Schema({
    _id: { type: String },
    season: { type: Number, default: 1 },
    systems: { type: [String], default: [] },
    previousSystems: { type: [String], default: [] },
    startedAt: { type: Date, default: Date.now },
    rewardedUsers: { type: [String], default: [] }
}, { versionKey: false })

const WorldMeta = mongoose.models.WorldMeta || mongoose.model('WorldMeta', MetaSchema)

// =====================================================================
// 🧠 حالة الأسبوع (مع كاش 30 ثانية حتى ما نضغط القاعدة مع كل أمر)
// =====================================================================

let metaCache = null
let metaCacheAt = 0
const META_TTL_MS = 30 * 1000

function shuffle(arr) {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

// يختار نظامين مختلفين عشوائياً (ويتجنب تكرار أنظمة الأسبوع الماضي لو أمكن)
function pickWeeklySystems(previous = []) {
    let pool = SYSTEM_KEYS.filter(k => !previous.includes(k))
    if (pool.length < WEEKLY_SYSTEMS_COUNT) pool = SYSTEM_KEYS.slice()
    return shuffle(pool).slice(0, WEEKLY_SYSTEMS_COUNT)
}

async function resetAllWorldsAndPlayers() {
    await Player.updateMany(
        { world: { $ne: null } },
        { $set: { world: null, worldPoints: 0, worldCtrBeast: 0, worldCtrWeapon: 0, worldCtrKingdom: 0 } }
    )
    await World.updateMany(
        {},
        { $set: { owner: null, points: 0, joinedAt: null, lastPointAt: null, rewardedUsers: [] } }
    )
}

// أول تشغيل للنظام الجديد: نصفّر العوالم القديمة (كانت 4 عوالم × 10 أعضاء) ونبدأ أسبوع 1
async function initMeta() {
    const existing = await WorldMeta.findById('main').lean()
    if (existing) return existing

    await resetAllWorldsAndPlayers()

    try {
        await WorldMeta.updateOne(
            { _id: 'main' },
            {
                $setOnInsert: {
                    season: 1,
                    systems: pickWeeklySystems([]),
                    previousSystems: [],
                    startedAt: new Date(),
                    rewardedUsers: []
                }
            },
            { upsert: true }
        )
    } catch (err) {
        if (!err || err.code !== 11000) throw err
    }

    return await WorldMeta.findById('main').lean()
}

async function getMeta(force = false) {
    if (!force && metaCache && Date.now() - metaCacheAt < META_TTL_MS) return metaCache
    let meta = await WorldMeta.findById('main').lean()
    if (!meta) meta = await initMeta()
    metaCache = meta
    metaCacheAt = Date.now()
    return meta
}

async function getActiveSystems() {
    const meta = await getMeta()
    return meta.systems || []
}

async function isActive(systemKey) {
    const list = await getActiveSystems()
    return list.includes(systemKey)
}

function describeSystems(keys, withDesc = true) {
    return (keys || [])
        .filter(k => SYSTEMS[k])
        .map(k => withDesc
            ? `${SYSTEMS[k].icon} ${SYSTEMS[k].title}\n   ↳ ${SYSTEMS[k].desc}`
            : `${SYSTEMS[k].icon} ${SYSTEMS[k].title}`)
        .join('\n')
}

// =====================================================================
// 🔎 بحث العوالم بالاسم أو الرقم
// =====================================================================

function normalizeText(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[^a-z0-9\u0621-\u064A]/g, '')
}

const SEARCH_INDEX = WORLD_CATALOG.map(w => ({
    w,
    names: [w.name, w.key, ...(w.aliases || [])].map(normalizeText).filter(Boolean)
}))

// يرجع { world } لو لقى عالم واحد، أو { many: [...] } لو أكثر من واحد، أو {} لو ما لقى
function findWorldByQuery(query) {
    const raw = String(query || '').trim()
    if (!raw) return {}

    if (/^\d{1,3}$/.test(raw)) {
        const w = WORLD_CATALOG[Number(raw) - 1]
        return w ? { world: w } : {}
    }

    const q = normalizeText(raw)
    if (!q) return {}

    const exact = SEARCH_INDEX.filter(e => e.names.includes(q))
    if (exact.length === 1) return { world: exact[0].w }
    if (exact.length > 1) return { many: exact.map(e => e.w).slice(0, 6) }

    const partial = SEARCH_INDEX.filter(e => e.names.some(n => n.includes(q)))
    if (partial.length === 1) return { world: partial[0].w }
    if (partial.length > 1) return { many: partial.map(e => e.w).slice(0, 6) }

    return {}
}

// =====================================================================
// 🤝 الانضمام (ذري: ما يقدر اثنين يدخلون نفس العالم حتى لو ضغطوا بنفس اللحظة)
// =====================================================================

// يرجع { ok:true, world } أو { ok:false, reason: 'already'|'taken'|'invalid'|'error', ... }
async function joinWorldByKey(userId, worldKey) {

    const info = WORLD_BY_KEY[worldKey]
    if (!info) return { ok: false, reason: 'invalid' }

    let player = await Player.findOne({ userId })
    if (!player) player = await Player.create({ userId })

    if (player.world) {
        return { ok: false, reason: 'already', current: player.world }
    }

    await getMeta() // يتأكد إن النظام مهيّأ (وتصفير القديم لو أول مرة)

    // 1) نحجز مكان اللاعب (يمنع الانضمام لعالمين بنفس اللحظة)
    const claimPlayer = await Player.updateOne(
        { userId, $or: [{ world: null }, { world: { $exists: false } }] },
        { $set: { world: worldKey, worldPoints: 0, worldCtrBeast: 0, worldCtrWeapon: 0, worldCtrKingdom: 0 } }
    )

    if (!claimPlayer.modifiedCount && !claimPlayer.nModified) {
        const fresh = await Player.findOne({ userId }).select('world').lean()
        return { ok: false, reason: 'already', current: fresh && fresh.world }
    }

    // 2) نحجز العالم نفسه (ذرياً)
    try {
        const meta = await getMeta()
        const claimWorld = await World.updateOne(
            { key: worldKey, owner: null },
            {
                $set: {
                    owner: userId,
                    points: 0,
                    joinedAt: new Date(),
                    lastPointAt: null,
                    season: meta.season
                }
            },
            { upsert: true }
        )

        if (!claimWorld.modifiedCount && !claimWorld.nModified && !claimWorld.upsertedCount && !claimWorld.upsertedId) {
            throw Object.assign(new Error('taken'), { code: 11000 })
        }
    } catch (err) {
        // فشل حجز العالم → نرجّع اللاعب بدون عالم
        await Player.updateOne(
            { userId, world: worldKey },
            { $set: { world: null, worldPoints: 0 } }
        ).catch(console.log)

        if (err && err.code === 11000) return { ok: false, reason: 'taken' }
        console.log('joinWorld error:', err)
        return { ok: false, reason: 'error' }
    }

    return { ok: true, world: info }
}

// =====================================================================
// ⭐ منح/خصم النقاط (الدالة الداخلية المشتركة)
// =====================================================================

// delta موجب = ربح، سالب = خسارة (النقاط لا تنزل تحت الصفر)
async function applyPoints(player, delta, role) {

    if (!player || !player.world || !delta) return null

    const before = player.worldPoints || 0
    const after = Math.max(0, before + delta)

    if (after === before) return null

    player.worldPoints = after
    await player.save()

    const set = { points: after }
    if (delta > 0) set.lastPointAt = new Date()

    await World.updateOne({ key: player.world }, { $set: set })

    const name = worldName(player.world)
    const icon = (WORLDS[player.world] && WORLDS[player.world].icon) || '🌍'
    const shortName = name.replace(icon, '').trim()

    // 🔔 إشعار بالموقع
    try {
        require('./systems/siteNotify').push(player.userId, {
            type: 'world',
            icon,
            title: delta > 0
                ? `+${delta} نقطة لعالم ${shortName}`
                : `${delta} نقطة من عالم ${shortName}`,
            text: `📊 مجموع نقاطك: ${after}`
        })
    } catch (e) { /* لا يوقف النقاط */ }

    // نص مختصر يوضح الدور (فائز/مهاجم خاسر) — يُستخدم برسائل القتال اللي فيها طرفين
    if (role) {
        return delta > 0
            ? `🌍 ${role}: +${delta} نقطة لعالم ${name} — 📊 ${after}`
            : `🌍 ${role}: ${delta} نقطة من عالم ${name} — 📊 ${after}`
    }

    if (delta > 0) {
        return `🌍 +${delta} نقطة لعالم ${name}!\n📊 مجموع نقاطك: ${after}`
    }

    return `🌍 ${delta} نقطة من عالم ${name} (خسارة بالهجوم)\n📊 مجموع نقاطك: ${after}`
}

// =====================================================================
// 🔌 دوال الربط مع index.js والأنظمة الأخرى
// كلها ترجع نص إشعار (أو null) لدمجه برسالة النتيجة
// =====================================================================

// 🎰 سحب شخصية — نادها بعد السحب مع الندرة
async function awardPullPoints(player, sock, jid, rarity) {
    if (rarity !== 'SSS') return null
    if (!player || !player.world) return null
    if (!(await isActive('pull_sss'))) return null
    return await applyPoints(player, 1)
}

// 💎 تطوير شخصية
async function awardEvolutionPoints(player, sock, jid, newRank) {
    const pts = EVOLUTION_POINTS[newRank]
    if (!pts) return null
    if (!player || !player.world) return null
    if (!(await isActive('evolution'))) return null
    return await applyPoints(player, pts)
}

// 👹 الزعيم — كل 5 ضربات (hitsCount = إجمالي ضربات اللاعب)
async function awardAttackPoints(player, sock, jid, hitsCount) {
    if (!player || !player.world) return null
    if (!hitsCount || hitsCount % SYSTEMS.boss_hits.per !== 0) return null
    if (!(await isActive('boss_hits'))) return null
    return await applyPoints(player, 1)
}

// 🔢 العدّادات: كوراما/الجوبي (3) — سحب سلاح (5) — غزو المملكة (طابق = amount)
// ملاحظة: العدّاد يتحدث بالقاعدة مباشرة (ذرياً) بدون ما يلمس كائن اللاعب بالذاكرة
async function awardCounter(player, sock, jid, systemKey, amount = 1) {

    const sys = SYSTEMS[systemKey]
    if (!sys || sys.type !== 'counter') return null
    if (!player || !player.world) return null
    if (!(await isActive(systemKey))) return null

    const field = sys.field
    const inc = Math.max(1, Math.floor(Number(amount) || 1))

    const doc = await Player.findOneAndUpdate(
        { userId: player.userId },
        { $inc: { [field]: inc } },
        { new: true, projection: { [field]: 1 } }
    ).lean()

    if (!doc) return null

    const total = doc[field] || 0
    const earned = Math.floor(total / sys.per)
    if (earned <= 0) return null

    // نخصم الدفعة اللي صارت نقاط من العدّاد
    await Player.updateOne(
        { userId: player.userId },
        { $inc: { [field]: -(earned * sys.per) } }
    )

    return await applyPoints(player, earned)
}

// ⚔️ القتال بكل أنواعه (قتال_مجموع، قتال، مضاربة، تحدي، pvp، أرينا)
// الفائز +1 — وإذا خسر المهاجم يُخصم منه 1 (المدافع الخاسر ما يُخصم منه)
// يرجع نص واحد لدمجه برسالة النتيجة (أو null)
//   opts: { winner, loser, attacker, sock, jid }
//   كلها كائنات Player محمّلة (attacker هو اللي بدأ الأمر)
async function awardDuel(systemKey, opts = {}) {

    const sys = SYSTEMS[systemKey]
    if (!sys || sys.type !== 'duel') return null

    const { winner, loser, attacker } = opts
    if (!winner && !loser) return null

    const winnerInWorld = !!(winner && winner.world)
    const loserInWorld = !!(loser && loser.world)

    if (!winnerInWorld && !loserInWorld) return null
    if (!(await isActive(systemKey))) return null

    if (REQUIRE_OPPONENT_IN_WORLD && !(winnerInWorld && loserInWorld)) return null

    const lines = []

    if (winnerInWorld) {
        const t = await applyPoints(winner, 1, '🏆 الفائز')
        if (t) lines.push(t)
    }

    // خسارة المهاجم فقط
    if (
        loserInWorld &&
        attacker &&
        loser.userId &&
        attacker.userId === loser.userId
    ) {
        const t = await applyPoints(loser, -1, '🔻 المهاجم الخاسر')
        if (t) lines.push(t)
    }

    return lines.length ? lines.join('\n') : null
}

// 🔁 توافق مع الأنظمة القديمة اللي تنادي awardBattlePoints(winner, sock, jid)
// بدون تحديد النظام — تُحسب لو مضاربة أو قتال مجموع شغّالين هذا الأسبوع
async function awardBattlePoints(winnerPlayer, sock, jid, systemKey) {

    if (!winnerPlayer || !winnerPlayer.world) return null

    let key = systemKey

    if (!key) {
        if (await isActive('brawl')) key = 'brawl'
        else if (await isActive('group_battle')) key = 'group_battle'
        else return null
    }

    if (!(await isActive(key))) return null

    return await applyPoints(winnerPlayer, 1)
}

// =====================================================================
// 🌍 أوامر الواتساب
// =====================================================================

function timeLeftText() {
    const ms = msUntilNextSaturdayMidnightKSA()
    const totalMin = Math.max(0, Math.floor(ms / 60000))
    const d = Math.floor(totalMin / 1440)
    const h = Math.floor((totalMin % 1440) / 60)
    const m = totalMin % 60
    if (d > 0) return `${d} يوم و ${h} ساعة`
    if (h > 0) return `${h} ساعة و ${m} دقيقة`
    return `${m} دقيقة`
}

async function ownersMap(userIds) {
    const ids = [...new Set((userIds || []).filter(Boolean))]
    if (!ids.length) return {}
    const rows = await Player.find({ userId: { $in: ids } }).select('userId username name').lean()
    const map = {}
    for (const r of rows) map[r.userId] = r
    return map
}

async function rankedWorlds() {
    return await World.find({ owner: { $ne: null } })
        .sort({ points: -1, lastPointAt: 1, joinedAt: 1 })
        .lean()
}

const PAGE_SIZE = 25

async function showWorldList(sock, jid, page) {

    const taken = new Set(
        (await World.find({ owner: { $ne: null } }).select('key').lean()).map(w => w.key)
    )

    const totalPages = Math.ceil(WORLD_CATALOG.length / PAGE_SIZE)
    const p = Math.min(Math.max(1, Number(page) || 1), totalPages)
    const slice = WORLD_CATALOG.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE)

    let text = `🌌 ═══〔 عوالم الأنمي 〕═══ 🌌\n\n`
    text += `✅ متاح   🔒 محجوز   (${taken.size}/${WORLD_CATALOG.length} محجوز)\n\n`

    for (const w of slice) {
        text += `${taken.has(w.key) ? '🔒' : '✅'} ${w.index}. ${w.icon} ${w.name}\n`
    }

    text += `\n📄 صفحة ${p}/${totalPages}`
    if (p < totalPages) text += ` — التالية: .العوالم ${p + 1}`
    text += `\n\n🚪 للانضمام: .انضم الاسم  أو  .انضم الرقم`
    text += `\nمثال: .انضم ناروتو   |   .انضم 3`
    text += `\n⚠️ كل عالم للاعب واحد فقط، وما تقدر تغيّر عالمك لين ينتهي الأسبوع.`

    await sock.sendMessage(jid, { text })
}

async function showMyWorld(sock, jid, userId) {

    const player = await Player.findOne({ userId }).select('world worldPoints').lean()
    const meta = await getMeta()

    if (!player || !player.world) {
        await sock.sendMessage(jid, {
            text:
`🌍 أنت ما انضممت لأي عالم بعد.

🎲 أنظمة النقاط هذا الأسبوع:
${describeSystems(meta.systems)}

📜 اكتب .العوالم لعرض القائمة ثم .انضم الاسم`
        })
        return
    }

    const ranked = await rankedWorlds()
    const pos = ranked.findIndex(w => w.owner === userId)

    await sock.sendMessage(jid, {
        text:
`🌍 ═══〔 عالمك 〕═══ 🌍

${worldName(player.world)}
📊 نقاطك: ${player.worldPoints || 0}
🏅 ترتيبك: ${pos >= 0 ? `${pos + 1}/${ranked.length}` : '—'}
⏳ ينتهي الأسبوع بعد: ${timeLeftText()}

🎲 الأنظمة المحتسبة هذا الأسبوع:
${describeSystems(meta.systems)}

🏆 أفضل ${TOP_RANKS} عوالم ياخذون جوائز كبيرة، والباقي 500 ألف + شخصيتين أسطوريتين.`
    })
}

// أمر الانضمام والأوامر المرتبطة — نادِ هذي أول شي بمعالج الرسائل
// ترجع true لو الأمر كان للعوالم وتم التعامل معه
async function handleJoinCommand(sock, jid, userId, text) {

    if (!text || text.charCodeAt(0) !== 46 /* '.' */) return false

    // ─── قائمة العوالم ───
    if (text === '.العوالم' || text.startsWith('.العوالم ') || text === '.عوالم' || text.startsWith('.عوالم ')) {
        const page = text.split(/\s+/)[1]
        await showWorldList(sock, jid, page)
        return true
    }

    // ─── عالمي ───
    if (text === '.عالمي') {
        await showMyWorld(sock, jid, userId)
        return true
    }

    // ─── انضم ───
    let arg = null

    if (JOIN_COMMANDS[text]) {
        arg = JOIN_COMMANDS[text]
    } else if (text === '.انضم' || text.startsWith('.انضم ') || text.startsWith('.انضم_')) {
        arg = text.slice('.انضم'.length).replace(/^[\s_]+/, '').trim()
    } else {
        return false
    }

    if (!arg) {
        await sock.sendMessage(jid, {
            text: `🌍 اكتب اسم العالم أو رقمه:\n\n.انضم ناروتو\n.انضم 3\n\n📜 للقائمة الكاملة: .العوالم`
        })
        return true
    }

    const found = findWorldByQuery(arg)

    if (found.many) {
        await sock.sendMessage(jid, {
            text:
`🔎 فيه أكثر من عالم يشبه "${arg}":

${found.many.map(w => `${w.index}. ${w.icon} ${w.name}`).join('\n')}

اكتب رقم العالم: .انضم الرقم`
        })
        return true
    }

    if (!found.world) {
        await sock.sendMessage(jid, {
            text: `❌ ما لقيت عالم باسم "${arg}"\n\n📜 اكتب .العوالم لعرض القائمة`
        })
        return true
    }

    const result = await joinWorldByKey(userId, found.world.key)

    if (!result.ok) {

        if (result.reason === 'already') {
            await sock.sendMessage(jid, {
                text:
`❌ أنت منضم أصلاً لعالم ${worldName(result.current)}.

🔒 ما تقدر تغيّر عالمك أو تخرج منه إلا بعد انتهاء الأسبوع.`
            })
        } else if (result.reason === 'taken') {
            await sock.sendMessage(jid, {
                text: `🔒 عالم ${WORLDS[found.world.key].name} محجوز للاعب ثاني.\n\nاختر عالم ثاني: .العوالم`
            })
        } else {
            await sock.sendMessage(jid, { text: '❌ صار خطأ أثناء الانضمام، حاول مرة ثانية.' })
        }

        return true
    }

    const meta = await getMeta()

    await sock.sendMessage(jid, {
        text:
`✨ ═══〔 تم الانضمام 〕═══ ✨

🌍 أصبحت حاكم عالم
${WORLDS[found.world.key].name}

👑 العالم لك وحدك — والمنافسة مع بقية العوالم!

🎲 الأنظمة المحتسبة هذا الأسبوع:
${describeSystems(meta.systems)}

⏳ ينتهي الأسبوع بعد: ${timeLeftText()}
🏆 جوائز أفضل ${TOP_RANKS} عوالم ضخمة 🔥`
    })

    return true
}

// 📊 ترتيب العوالم (.ترتيب_العوالم)
async function showWorldStandings(sock, jid) {

    const meta = await getMeta()
    const ranked = await rankedWorlds()

    if (!ranked.length) {
        await sock.sendMessage(jid, {
            text:
`🌍 ما فيه أحد منضم لأي عالم بعد.

🎲 أنظمة هذا الأسبوع:
${describeSystems(meta.systems, false)}

📜 .العوالم لعرض القائمة`
        })
        return
    }

    const owners = await ownersMap(ranked.map(w => w.owner))
    const mentions = []
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']

    let text = `🌍 ═══〔 ترتيب العوالم — الأسبوع ${meta.season} 〕═══ 🌍\n\n`

    ranked.slice(0, 10).forEach((w, i) => {
        text += `${medals[i] || '🏅'} ${worldName(w.key)} — ${w.points} نقطة\n`
        text += `   👑 @${String(w.owner).split('@')[0]}\n`
        mentions.push(w.owner)
    })

    text += `\n👥 المشاركون: ${ranked.length}/${WORLD_CATALOG.length}`
    text += `\n⏳ ينتهي بعد: ${timeLeftText()}`
    text += `\n\n🎲 الأنظمة المحتسبة:\n${describeSystems(meta.systems, false)}`

    void owners

    await sock.sendMessage(jid, { text, mentions })
}

// 📋 تفاصيل كل العوالم المحجوزة (.تفاصيل_العوالم — للمطور)
async function showWorldDetails(sock, jid) {

    const meta = await getMeta()
    const ranked = await rankedWorlds()
    const mentions = []

    let text = `🌍 ═══〔 تفاصيل العوالم 〕═══ 🌍\n\n`
    text += `📅 الأسبوع ${meta.season}\n`
    text += `🎲 ${describeSystems(meta.systems, false).replace(/\n/g, ' | ')}\n\n`

    if (!ranked.length) text += 'لا يوجد مشاركين بعد'

    ranked.forEach((w, i) => {
        text += `${i + 1}. ${worldName(w.key)} — @${String(w.owner).split('@')[0]} — ${w.points} نقطة\n`
        mentions.push(w.owner)
    })

    await sock.sendMessage(jid, { text: text.trim(), mentions })
}

// =====================================================================
// 🏆 إنهاء الأسبوع وتوزيع الجوائز
// =====================================================================

// يمنح شخصية عشوائية بندرة معينة (من characters.json)
function grantRandomCharacter(player, rarity) {

    const pool = characters.filter(c => c.rarity === rarity)
    if (!pool.length) return null

    const chosen = pool[Math.floor(Math.random() * pool.length)]

    player.characters.push({
        ...chosen,
        originalPower: chosen.power,
        evolutionLevel: 0,
        urAbilities: []
    })

    return chosen
}

// ابقاء الاسم القديم للتوافق
function grantRandomSSSCharacter(player) {
    return grantRandomCharacter(player, 'SSS')
}

const BOX_LABELS = {
    sss_chance: '🌟 صندوق فرصة SSS',
    sss_high: '💎 صندوق SSS عالي'
}

function rewardText(r) {
    const parts = []
    if (r.money) parts.push(`💰 ${r.money.toLocaleString()} مال`)
    if (r.sss) parts.push(`⭐ ${r.sss} شخصية SSS عشوائية`)
    if (r.legendary) parts.push(`👑 ${r.legendary} شخصية أسطورية`)
    if (r.boxes) {
        for (const [k, n] of Object.entries(r.boxes)) {
            parts.push(`${BOX_LABELS[k] || k}${n > 1 ? ` ×${n}` : ''}`)
        }
    }
    return parts.join(' + ')
}

async function giveReward(member, reward) {

    if (reward.money) await member.addMoney(reward.money)

    for (let i = 0; i < (reward.sss || 0); i++) grantRandomCharacter(member, 'SSS')
    for (let i = 0; i < (reward.legendary || 0); i++) grantRandomCharacter(member, 'اسطوري')

    if (reward.boxes) {
        member.boxes = member.boxes || {}
        for (const [k, n] of Object.entries(reward.boxes)) {
            member.boxes[k] = (member.boxes[k] || 0) + n
        }
        if (typeof member.markModified === 'function') member.markModified('boxes')
    }

    await member.save()
}

let seasonEnding = false

async function endWorldSeason(sock, jidOrJids) {

    if (seasonEnding) return
    seasonEnding = true

    try {
        const jids = Array.isArray(jidOrJids) ? jidOrJids : [jidOrJids]

        const meta = await getMeta(true)
        const ranked = await rankedWorlds()

        const announce = async (content) => {
            for (const jid of jids) {
                try {
                    await sendMessageWithRetry(sock, jid, content)
                } catch (err) {
                    console.log('World Season Announce Error:', err)
                }
            }
        }

        // ─── توزيع الجوائز ───
        const podium = []
        let participantsCount = 0
        const mentions = []

        for (let i = 0; i < ranked.length; i++) {

            const w = ranked[i]
            const userId = w.owner

            const isTop = i < TOP_RANKS && (w.points || 0) > 0
            const reward = isTop ? RANK_REWARDS[i] : PARTICIPANT_REWARD

            // 🔒 حجز ذري: كل لاعب ياخذ جائزته مرة وحدة بالأسبوع
            const claim = await WorldMeta.updateOne(
                { _id: 'main', rewardedUsers: { $ne: userId } },
                { $push: { rewardedUsers: userId } }
            )

            const already = !claim.modifiedCount && !claim.nModified

            if (!already) {
                try {
                    const member = await Player.findOne({ userId })
                    if (member) await giveReward(member, reward)
                } catch (err) {
                    await WorldMeta.updateOne(
                        { _id: 'main' },
                        { $pull: { rewardedUsers: userId } }
                    ).catch(console.log)
                    throw err
                }
            }

            if (isTop) {
                podium.push({ rank: i + 1, world: w, reward })
                mentions.push(userId)
            } else {
                participantsCount++
            }
        }

        // ─── جلب أنظمة الأسبوع القادم وتصفير الكل ───
        const nextSystems = pickWeeklySystems(meta.systems)

        await resetAllWorldsAndPlayers()

        const updated = await WorldMeta.findOneAndUpdate(
            { _id: 'main' },
            {
                $set: {
                    systems: nextSystems,
                    previousSystems: meta.systems || [],
                    startedAt: new Date(),
                    rewardedUsers: []
                },
                $inc: { season: 1 }
            },
            { new: true }
        ).lean()

        metaCache = updated
        metaCacheAt = Date.now()

        // ─── الإعلان ───
        if (!ranked.length) {
            await announce({
                text:
`🌍 انتهى أسبوع العوالم بدون مشاركين.

🔄 أسبوع جديد بدأ — الأنظمة المحتسبة:
${describeSystems(nextSystems)}

📜 اكتب .العوالم واختر عالمك!`
            })
            return
        }

        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']

        let textOut =
`🌌 ═══〔 نهاية أسبوع العوالم 〕═══ 🌌

⚔️ أسبوع كامل من الصراع بين عوالم الأنمي...
👑 وهؤلاء هم الحكّام الذين وصلوا للقمة:

`

        for (const p of podium) {
            textOut += `${medals[p.rank - 1]} ${worldName(p.world.key)} — ${p.world.points} نقطة\n`
            textOut += `   👑 @${String(p.world.owner).split('@')[0]}\n`
            textOut += `   🎁 ${rewardText(p.reward)}\n\n`
        }

        if (!podium.length) {
            textOut += `لم يحقق أحد نقاطاً هذا الأسبوع 😴\n\n`
        }

        const restCount = ranked.length - podium.length

        textOut +=
`━━━━━━━━━━━━━━━━━━━━
🎖️ باقي المشاركين (${restCount}):
🎁 ${rewardText(PARTICIPANT_REWARD)}

━━━━━━━━━━━━━━━━━━━━
🔄 تم تفريغ كل العوالم — أسبوع جديد بدأ!

🎲 الأنظمة المحتسبة هذا الأسبوع:
${describeSystems(nextSystems)}

📜 اكتب .العوالم واختر عالمك 🔥`

        void participantsCount

        await announce({ text: textOut, mentions })

    } finally {
        seasonEnding = false
    }
}

// =====================================================================
// ⏰ جدولة نهاية الأسبوع تلقائياً (كل سبت 12:00 صباحاً بتوقيت السعودية)
// =====================================================================

let seasonSchedulerStarted = false
let currentSock = null
let lastSeasonRunAt = 0

function setWorldsSocket(sock) {
    currentSock = sock
}

function msUntilNextSaturdayMidnightKSA() {

    const now = Date.now()
    const nowKSA = new Date(now + SAUDI_UTC_OFFSET_HOURS * 60 * 60 * 1000)
    const dayOfWeek = nowKSA.getUTCDay() // 0 = الأحد ... 6 = السبت
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7

    const targetKSA = new Date(Date.UTC(
        nowKSA.getUTCFullYear(),
        nowKSA.getUTCMonth(),
        nowKSA.getUTCDate() + daysUntilSaturday,
        0, 0, 0, 0
    ))

    if (targetKSA.getTime() <= nowKSA.getTime()) {
        targetKSA.setUTCDate(targetKSA.getUTCDate() + 7)
    }

    return targetKSA.getTime() - SAUDI_UTC_OFFSET_HOURS * 60 * 60 * 1000 - now
}

function startWorldSeasonScheduler(sock, jid = WORLD_SEASON_GROUP_JID) {

    if (seasonSchedulerStarted) return
    seasonSchedulerStarted = true

    if (!currentSock) currentSock = sock

    const runSeasonEnd = async () => {
        // حماية: لا نشغّلها مرتين خلال دقيقة
        if (Date.now() - lastSeasonRunAt < 60 * 1000) return
        lastSeasonRunAt = Date.now()

        try {
            await endWorldSeason(currentSock || sock, jid)
        } catch (err) {
            console.log('World Season Scheduler Error:', err)
        }
    }

    const scheduleNext = () => {
        const delay = Math.max(msUntilNextSaturdayMidnightKSA(), 60 * 1000)

        console.log(
            `🌍 جدولة نهاية أسبوع العوالم: بعد ${Math.round(delay / (60 * 60 * 1000))} ساعة (السبت 12:00 ص بتوقيت السعودية)`
        )

        const t = setTimeout(async () => {
            try {
                await runSeasonEnd()
            } catch (err) {
                console.log('World Season Scheduler Error:', err)
            }
            scheduleNext()
        }, delay)

        if (t && typeof t.unref === 'function') t.unref()
    }

    // نهيّئ الحالة أول مرة (يصفّر النظام القديم لو لزم) بدون ما نوقف التشغيل لو فشل
    getMeta().catch(err => console.log('Worlds init error:', err))

    scheduleNext()
}

// =====================================================================
// 🌐 واجهة الموقع (تستخدمها صفحة العوالم بالموقع: systems/siteWorlds.js)
// =====================================================================

async function getOverview(userId) {

    const meta = await getMeta()
    const ranked = await rankedWorlds()
    const owners = await ownersMap(ranked.map(w => w.owner))

    const takenByKey = {}
    ranked.forEach((w, i) => {
        const o = owners[w.owner] || {}
        takenByKey[w.key] = {
            rank: i + 1,
            points: w.points || 0,
            mine: !!userId && w.owner === userId,
            ownerName: o.username ? '@' + o.username : (o.name || 'لاعب')
        }
    })

    let me = null
    if (userId) {
        const p = await Player.findOne({ userId }).select('world worldPoints').lean()
        if (p && p.world) {
            const t = takenByKey[p.world]
            me = {
                world: p.world,
                name: WORLD_BY_KEY[p.world] ? WORLD_BY_KEY[p.world].name : p.world,
                icon: WORLD_BY_KEY[p.world] ? WORLD_BY_KEY[p.world].icon : '🌍',
                points: p.worldPoints || 0,
                rank: t ? t.rank : null
            }
        }
    }

    return {
        season: meta.season,
        endsInMs: msUntilNextSaturdayMidnightKSA(),
        systems: (meta.systems || []).filter(k => SYSTEMS[k]).map(k => ({
            key: k,
            icon: SYSTEMS[k].icon,
            title: SYSTEMS[k].title,
            desc: SYSTEMS[k].desc
        })),
        allSystems: SYSTEM_KEYS.map(k => ({ key: k, icon: SYSTEMS[k].icon, title: SYSTEMS[k].title })),
        rewards: RANK_REWARDS.map((r, i) => ({ rank: i + 1, text: rewardText(r) })),
        participantReward: rewardText(PARTICIPANT_REWARD),
        participants: ranked.length,
        total: WORLD_CATALOG.length,
        me,
        top: ranked.slice(0, 20).map((w, i) => ({
            rank: i + 1,
            key: w.key,
            name: WORLD_BY_KEY[w.key] ? WORLD_BY_KEY[w.key].name : w.key,
            icon: WORLD_BY_KEY[w.key] ? WORLD_BY_KEY[w.key].icon : '🌍',
            points: w.points || 0,
            owner: owners[w.owner] ? (owners[w.owner].username ? '@' + owners[w.owner].username : (owners[w.owner].name || 'لاعب')) : 'لاعب',
            mine: !!userId && w.owner === userId,
            _ownerId: w.owner // داخلي: يُحوَّل لصورة بروفايل بـ siteWorlds ثم يُحذف قبل الإرسال
        })),
        catalog: WORLD_CATALOG.map(w => ({
            index: w.index,
            key: w.key,
            name: w.name,
            icon: w.icon,
            taken: !!takenByKey[w.key],
            mine: !!(takenByKey[w.key] && takenByKey[w.key].mine),
            owner: takenByKey[w.key] ? takenByKey[w.key].ownerName : null,
            points: takenByKey[w.key] ? takenByKey[w.key].points : 0
        }))
    }
}

// انضمام من الموقع — نفس منطق الواتساب بالضبط
async function joinFromSite(userId, worldKey) {
    const r = await joinWorldByKey(userId, worldKey)
    if (r.ok) return { ok: true, world: r.world }
    const messages = {
        invalid: 'عالم غير موجود',
        already: 'أنت منضم لعالم بالفعل — ما تقدر تغيّره قبل نهاية الأسبوع',
        taken: 'هذا العالم محجوز للاعب ثاني',
        error: 'صار خطأ، حاول مرة ثانية'
    }
    return { ok: false, reason: r.reason, message: messages[r.reason] || messages.error }
}

module.exports = {
    // قديم (متوافق)
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
    startWorldSeasonScheduler,
    setWorldsSocket,
    // جديد
    SYSTEMS,
    WORLD_CATALOG,
    awardDuel,
    awardCounter,
    isActive,
    getActiveSystems,
    getOverview,
    joinFromSite,
    joinWorldByKey,
    findWorldByQuery,
    showWorldList,
    showMyWorld,
    grantRandomSSSCharacter
}
