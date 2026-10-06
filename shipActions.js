// =========================================================================
// shipActions.js — منطق السفينة المشترك بين أوامر الواتس والموقع
// =========================================================================
// هدفه: الشراء + هجوم الزعيم + استدعاؤه + حالة الحروب تمشي من "مصدر واحد"،
// فأي عملية من الواتس أو الموقع تعدّل نفس البيانات بنفس القواعد بالضبط.
//
// • buyShipItem          → نفس منطق .شراء_سفينة (حد أسبوعي، عملات، فتح بالمستوى)
// • attackBossLocked     → attackShipBoss داخل قفل لكل سفينة (يمنع ضياع ضرر
//                          الضربات المتزامنة أو توزيع الجوائز مرتين)
// • siteAttackBoss / siteSummonBoss → نسخ للموقع بنفس الرسائل
// • getShipStatus        → حالة حية للصفحة (دم الزعيم، دمك القتالي، حروب اليوم، ...)
// • formatBossAttackText → نص نتيجة الهجوم نفسه المستخدم بالواتس
//
// القفل داخل نفس العملية (البوت والموقع يشتغلون بنفس الـ process) فيكفي Map بالذاكرة.
// =========================================================================

const Ship = require('./models/Ship')
const Player = require('./models/Player')
const ShipWar = require('./models/ShipWar')
const { getShipShop } = require('./shipShop')
const { attackShipBoss, summonShipBoss, getPlayerCombatMaxHp } = require('./shipBoss')

// نفس القيمة بـ shipCommands.js (رصيد مشترك .حرب_سفينة + .حرب_طاقم_كامل)
const MAX_DAILY_WARS = 10

// =========================================================
// 🔒 قفل بسيط بالذاكرة: عمليات نفس المفتاح تمشي واحدة ورا الثانية
// =========================================================
const locks = new Map()

async function withLock(key, fn) {
    const prev = locks.get(key) || Promise.resolve()
    let release
    const gate = new Promise(r => { release = r })
    const chain = prev.then(() => gate)
    locks.set(key, chain)
    await prev
    try {
        return await fn()
    } finally {
        release()
        if (locks.get(key) === chain) locks.delete(key)
    }
}

// =========================================================
// 🗓️ مفتاح الأسبوع (الأحد 00:00 بتوقيت السعودية) — نسخة مطابقة
// لـ getShipWeekKey بـ shipCommands.js
// =========================================================
function getShipWeekKey() {
    const riyadh = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }))
    const sunday = new Date(riyadh)
    sunday.setDate(riyadh.getDate() - riyadh.getDay())
    sunday.setHours(0, 0, 0, 0)
    return sunday.toISOString().slice(0, 10)
}

function todayRiyadh() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })
}

const fail = (code, message, extra = {}) => ({ ok: false, code, message, ...extra })

// =========================================================
// 🛒 الشراء — نفس منطق .شراء_سفينة بالضبط (نفس الرسائل والقيود)
// sel: { index } (0-based، نفس ترتيب .متجر_السفينة) أو { itemId }
// =========================================================
async function buyShipItem(userId, sel = {}) {

    return withLock('user:' + userId, async () => {

        const player = await Player.findOne({ userId })

        if (!player || !player.shipId) {
            return fail('NO_SHIP', '❌ أنت لست على متن أي سفينة.')
        }

        const ship = await Ship.findOne({ shipId: player.shipId })

        if (!ship) return fail('NO_SHIP', '❌ لم يتم العثور على السفينة.')

        const shop = getShipShop(ship.level)

        const idx = Number.isInteger(sel.index)
            ? sel.index
            : shop.findIndex(i => i.id === sel.itemId)

        const item = shop[idx]

        if (!item) return fail('NO_ITEM', '❌ العنصر غير موجود.')

        if (item.locked) {
            return fail('LOCKED', `❌ هذا العنصر يفتح عند مستوى ${item.unlockLevel}.`)
        }

        const week = getShipWeekKey()

        if (!player.shipShop) player.shipShop = {}
        if (!player.shipShop[week]) player.shipShop[week] = {}

        const bought = player.shipShop[week][item.id] || 0

        if (bought >= item.limit) {
            return fail('LIMIT', '❌ وصلت للحد الأسبوعي لهذا العنصر.')
        }

        if ((player.shipCoins || 0) < item.price) {
            return fail('COINS', '❌ لا تملك عملات سفينة كافية.')
        }

        // ─── فحوصات خاصة بالعنصر (قبل أي خصم، فما يضيع شيء لو رفض) ───
        if (item.id === 'storage' && (player.shipStorageExpire || 0) > Date.now()) {
            return fail('STORAGE_ACTIVE', '❌ لديك زيادة سعة فعالة بالفعل.\nيمكنك شراء زيادة جديدة بعد انتهاء 14 يوم.')
        }

        if (item.id === 'rename' && userId !== ship.captain) {
            return fail('CAPTAIN_ONLY', '❌ القبطان فقط يستطيع شراء تغيير الاسم.')
        }

        // ─── اختيار الشظية العشوائية قبل الخصم ───
        let shardName = null

        if (item.id === 'sss_shard') {

            let catalog = []
            try { catalog = require('./characters.json') } catch (e) { /* يتعامل معها تحت */ }

            const names = [...new Set(
                (Array.isArray(catalog) ? catalog : [])
                    .filter(c => c && c.rarity === 'SSS' && c.name)
                    .map(c => c.name)
            )]

            if (!names.length) {
                return fail('NO_SHARD_POOL', '❌ تعذّر اختيار شظية الآن، ما تم خصم أي شيء.')
            }

            shardName = names[Math.floor(Math.random() * names.length)]
        }

        // ─── التنفيذ ───
        player.shipCoins -= item.price
        player.shipShop[week][item.id] = bought + 1
        player.markModified('shipShop')

        let bossGranted = false

        switch (item.id) {

            case 'pull_ticket':
                player.pulls += 1
                break

            case 'legendary_box':
                player.boxes.legendary += 1
                break

            case 'sss_chance':
                player.boxes.sss_chance += 1
                break

            case 'sss_high':
                player.boxes.sss_high += 1
                break

            case 'storage':
                player.shipStorageBonus += 5
                player.maxCharacters += 5
                player.shipStorageExpire = Date.now() + (14 * 24 * 60 * 60 * 1000)
                break

            case 'sss_shard': {
                // نفس صيغة الشظايا بـ index.js: Map بمفتاح اسم الشخصية (النقاط تتحول لـ ．)
                if (!player.shards) player.shards = new Map()
                const key = shardName.replace(/\./g, '．')
                player.shards.set(key, (player.shards.get(key) || 0) + 1)
                player.markModified('shards')
                break
            }

            case 'summon_boss':
                bossGranted = true
                break

            case 'rename':
                player.renameShipTicket = (player.renameShipTicket || 0) + 1
                break
        }

        await player.save()

        // updateOne بدل ship.save() عشان ما نكتب فوق تغييرات الزعيم الجارية
        if (bossGranted) {
            await Ship.updateOne({ shipId: ship.shipId }, { $set: { bossAvailable: true } })
        }

        return {
            ok: true,
            item: { id: item.id, name: item.name, price: item.price, limit: item.limit },
            remaining: item.limit - (bought + 1),
            coins: player.shipCoins,
            shardName
        }
    })
}

// نص رسالة الشراء (نفس نص الواتس + سطر الشظية الجديد)
function formatBuyText(r) {
    return `✅ تم شراء:\n\n${r.item.name}\n\n💰 -${r.item.price} 🪙\n\n📦 المتبقي:\n${r.remaining}/${r.item.limit}` +
        (r.shardName ? `\n\n🧩 حصلت على شظية: ${r.shardName}` : '')
}

// =========================================================
// 👹 هجوم الزعيم (داخل قفل السفينة) + استدعاؤه
// =========================================================
function attackBossLocked(shipId, userId) {
    return withLock('ship:' + shipId, () => attackShipBoss(shipId, userId))
}

function summonBossLocked(shipId, opts) {
    return withLock('ship:' + shipId, () => summonShipBoss(shipId, opts))
}

// نفس نصوص الواتس بالضبط
function bossAttackErrorText(result) {
    if (result.error === 'no_active_boss') return '❌ لا يوجد زعيم مستدعى حالياً على سفينتك.'
    if (result.error === 'not_crew_member') return '❌ يجب أن تكون عضواً مسجلاً بنفس السفينة لمهاجمة زعيمها.'
    if (result.error === 'player_dead') {
        const secs = Math.ceil(result.remainingMs / 1000)
        return `💀 أنت ميت بمعركة الزعيم!\n⏳ تقدر تهاجم بعد ${secs} ثانية.`
    }
    return '❌ حدث خطأ أثناء الهجوم.'
}

// نص نتيجة الهجوم — نفس رسالة الواتس. nameOf يحدد كيف يُكتب اسم اللاعب بالترتيب
function formatBossAttackText(result, nameOf) {

    const nm = nameOf || (id => '@' + String(id).split('@')[0])

    if (result.defeated) {

        const medals = ['🥇', '🥈', '🥉', '🏅']

        const leaderboardText = result.leaderboard
            .map((r, i) =>
                `${medals[i] || '▪️'} ${i + 1}. ${nm(r.userId)}\n` +
                `   💥 ${r.damage.toLocaleString()} ضرر — 💰 ${r.money.toLocaleString()} — 🪙 ${r.shipCoins}`
            )
            .join('\n\n')

        return `💥 ضربة أخيرة!\n\n👹 تم القضاء على ${result.bossName}!\n\n⚔️ ضررك الأخير: ${result.damage.toLocaleString()}\n${result.playerAbility ? `✨ قدرتك: ${result.playerAbility}\n` : ''}\n🏆 ترتيب الدمج (حسب الضرر):\n\n${leaderboardText}\n\n✨ +${result.shipXpReward.toLocaleString()} خبرة للسفينة`
    }

    let extra = ''

    if (result.playerAbility) {
        extra += `\n✨ قدرتك: ${result.playerAbility}`
    }

    if (result.bossAbilityUsed) {
        extra += `\n\n😈 رد الزعيم بـ: ${result.bossAbilityUsed}\n💥 ضررك: -${result.counterDamage.toLocaleString()}`
    }

    if (result.died) {
        extra += `\n\n💀 مت! دمك القتالي وصل صفر.\n⏳ ما تقدر تهاجم لمدة دقيقتين.`
    } else {
        extra += `\n\n❤️ دمك القتالي: ${result.playerHp.toLocaleString()}/${result.playerMaxHp.toLocaleString()}`
    }

    return `⚔️ ضربت الزعيم!\n\n💥 الضرر: ${result.damage.toLocaleString()}\n\n❤️ HP المتبقي للزعيم: ${result.remainingHp.toLocaleString()}/${result.maxHp.toLocaleString()}${extra}`
}

// ─── للموقع: هجوم ───
async function siteAttackBoss(userId) {

    const player = await Player.findOne({ userId }).select('shipId').lean()

    if (!player || !player.shipId) return fail('NO_SHIP', '❌ أنت لست على متن أي سفينة.')

    const result = await attackBossLocked(player.shipId, userId)

    if (result.error) {
        return fail(String(result.error).toUpperCase(), bossAttackErrorText(result), {
            remainingMs: result.remainingMs || 0
        })
    }

    // أسماء الترتيب بدل المنشن (الموقع ما فيه منشن)
    let nameOf
    if (result.defeated) {
        const docs = await Player.find({ userId: { $in: result.leaderboard.map(r => r.userId) } })
            .select('userId name username').lean()
        const map = new Map(docs.map(d => [d.userId, d.username ? '@' + d.username : (d.name || 'لاعب')]))
        nameOf = id => map.get(id) || '@' + String(id).split('@')[0]
    }

    return { ok: true, result, text: formatBossAttackText(result, nameOf) }
}

// ─── للموقع: استدعاء الزعيم (نفس شروط .استدعاء_زعيم_السفينة) ───
async function siteSummonBoss(userId) {

    const player = await Player.findOne({ userId }).select('shipId').lean()

    if (!player || !player.shipId) return fail('NO_SHIP', '❌ أنت لست على متن أي سفينة.')

    const result = await summonBossLocked(player.shipId, { auto: false })

    if (result.error === 'boss_not_purchased') {
        return fail('NOT_PURCHASED', '❌ سفينتك لا تملك زعيماً بعد.\nاشترِ "استدعاء زعيم السفينة" من متجر السفينة أولاً.\n\n(أو انتظر — الزعيم يظهر تلقائياً كل يوم الساعة 12 ظهراً بتوقيت السعودية).')
    }

    if (result.error === 'boss_already_active') {
        return fail('ALREADY_ACTIVE', '❌ يوجد زعيم مستدعى بالفعل على متن سفينتك.')
    }

    if (result.error) return fail('SERVER', '❌ حدث خطأ أثناء الاستدعاء.')

    return {
        ok: true,
        text: `👹 ظهر زعيم على متن السفينة!\n\n😈 ${result.ship.bossName}\n📺 ${result.ship.bossSeries}\n\n❤️ HP: ${result.ship.bossHp.toLocaleString()}/${result.ship.bossMaxHp.toLocaleString()}`
    }
}

// =========================================================
// 📊 حالة حية للصفحة — قراءة فقط، من نفس بيانات الواتس
// =========================================================
async function getShipStatus(userId) {

    const player = await Player.findOne({ userId })
        .select('userId shipId shipCoins shipShop shipCombatSessionId shipCombatHp shipCombatMaxHp shipDeathUntil')
        .lean()

    if (!player || !player.shipId) return null

    const ship = await Ship.findOne({ shipId: player.shipId }).lean()

    if (!ship) return null

    // ─── محاولات الحروب (نفس إعادة التصفير الكسولة بأوامر الحرب) ───
    const warsLeft = ship.lastWarReset !== todayRiyadh()
        ? MAX_DAILY_WARS
        : Math.max(0, Number(ship.dailyWars) || 0)

    // ─── حرب جارية/معلقة ───
    let war = null
    const w = await ShipWar.findOne({
        status: { $in: ['pending', 'accepted'] },
        $or: [{ attackerShip: ship.shipId }, { defenderShip: ship.shipId }]
    }).lean()

    if (w) {
        const enemyId = w.attackerShip === ship.shipId ? w.defenderShip : w.attackerShip
        const enemy = await Ship.findOne({ shipId: enemyId }).select('name emoji').lean()
        war = {
            status: w.status,
            mode: w.mode || 'member',
            enemy: enemy ? `${enemy.emoji || '🚢'} ${enemy.name}` : '—',
            asAttacker: w.attackerShip === ship.shipId,
            round: w.currentRound || 0,
            rounds: (w.rounds || []).length
        }
    }

    // ─── دمك القتالي بمعركة الزعيم (نفس تهيئة attackShipBoss) ───
    const maxHp = getPlayerCombatMaxHp()
    const sameSession = !!ship.bossSessionId && player.shipCombatSessionId === ship.bossSessionId
    const hp = sameSession ? Math.max(0, Number(player.shipCombatHp) || 0) : maxHp
    const deathMs = sameSession && player.shipDeathUntil && Date.now() < player.shipDeathUntil
        ? player.shipDeathUntil - Date.now()
        : 0

    return {
        player: { userId: player.userId, coins: Number(player.shipCoins) || 0 },
        ship,
        bought: (player.shipShop && player.shipShop[getShipWeekKey()]) || {},
        wars: { left: warsLeft, max: MAX_DAILY_WARS, war },
        combat: { hp, maxHp: sameSession ? (Number(player.shipCombatMaxHp) || maxHp) : maxHp, deathMs }
    }
}

module.exports = {
    MAX_DAILY_WARS,
    withLock,
    getShipWeekKey,
    buyShipItem,
    formatBuyText,
    attackBossLocked,
    summonBossLocked,
    bossAttackErrorText,
    formatBossAttackText,
    siteAttackBoss,
    siteSummonBoss,
    getShipStatus
}
