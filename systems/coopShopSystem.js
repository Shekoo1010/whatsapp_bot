// =====================================================================
// systems/coopShopSystem.js
// متجر الكو اوب: يصرف player.coopCoins على عناصر data/coopShop.js
// مع حد أسبوعي لكل عنصر (يتصفّر كل اثنين بتوقيت السعودية).
//
// GRANTERS: كيف يُمنح كل عنصر للاعب. أي عنصر بلا granter يظهر بالمتجر
// "غير متاح" ولا يمكن شراؤه (حتى لا تُصرف العملات بلا فائدة).
// =====================================================================

const items = require('../data/coopShop')

const SAUDI_OFFSET_MS = 3 * 60 * 60 * 1000

// بداية الأسبوع (الاثنين) بتوقيت السعودية كنص YYYY-MM-DD
function weekKey(now = Date.now()) {
    const d = new Date(now + SAUDI_OFFSET_MS)
    const day = (d.getUTCDay() + 6) % 7 // الاثنين = 0
    d.setUTCDate(d.getUTCDate() - day)
    return d.toISOString().slice(0, 10)
}

function addBox(player, key, n) {
    if (!player.boxes) player.boxes = {}
    player.boxes[key] = (player.boxes[key] || 0) + n
    if (typeof player.markModified === 'function') player.markModified('boxes')
}

const GRANTERS = {
    gold:       (p, n) => { p.money = (p.money || 0) + n },
    xp:         (p, n) => { p.xp = (p.xp || 0) + n },
    pullTicket: (p, n) => { p.pulls = (p.pulls || 0) + n },
    sss_chance: (p, n) => addBox(p, 'sss_chance', n),
    sss_high:   (p, n) => addBox(p, 'sss_high', n),
    // 🎲 تذكرة Reroll = نفس رصيد سحبات .اسحب (player.pulls)
    rerollTicket: (p, n) => { p.pulls = (p.pulls || 0) + n },

    // 🧩 شظية شخصية: تحتاج اسم شخصية SSS يملكها اللاعب (opts.character) — نفس مفتاح الشظايا بالبوت
    characterShard: (p, n, opts) => {
        const name = String((opts && opts.character) || '')
        if (!name) throw Object.assign(new Error('اختر الشخصية'), { code: 'TARGET' })
        const owns = (p.characters || []).some(c => c.name === name && c.rarity === 'SSS')
        if (!owns) throw Object.assign(new Error('لا تملك هذه الشخصية (SSS)'), { code: 'TARGET' })
        const key = name.replace(/\./g, '．')
        if (!p.shards) p.shards = new Map()
        p.shards.set(key, (p.shards.get(key) || 0) + n)
        if (typeof p.markModified === 'function') p.markModified('shards')
    }
}

// عناصر تحتاج اختيار هدف من اللاعب قبل الشراء
const NEEDS_TARGET = { characterShard: 'character' }

function createCoopShopSystem({ Player, extraGranters = {}, onXp = null } = {}) {

    const granters = { ...GRANTERS, ...extraGranters }
    const locks = new Set()

    function boughtMap(player, now = Date.now()) {
        const wk = weekKey(now)
        const data = player.coopShopBought || {}
        return data.week === wk ? (data.items || {}) : {}
    }

    function view(player) {
        const bought = boughtMap(player)
        return {
            coins: player.coopCoins || 0,
            week: weekKey(),
            items: items.map(it => {
                const count = bought[it.id] || 0
                return {
                    id: it.id,
                    name: it.name,
                    price: it.price,
                    amount: it.amount,
                    weeklyLimit: it.weeklyLimit,
                    bought: count,
                    left: Math.max(0, it.weeklyLimit - count),
                    available: !!granters[it.id],
                    needsTarget: NEEDS_TARGET[it.id] || null
                }
            })
        }
    }

    async function getShop(userId) {
        const player = await Player.findOne({ userId }).select('coopCoins coopShopBought')
        if (!player) return null
        return view(player)
    }

    // أسماء شخصيات SSS (بدون تكرار) لاختيار هدف الشظية
    async function getShardTargets(userId) {
        const player = await Player.findOne({ userId }).select('characters')
        if (!player) return []
        return [...new Set((player.characters || []).filter(c => c.rarity === 'SSS').map(c => c.name))]
    }

    async function buy(userId, itemId, opts = {}) {
        const fail = (code, message) => ({ ok: false, code, message })

        const item = items.find(i => i.id === itemId)
        if (!item) return fail('NO_ITEM', '❌ عنصر غير موجود')
        if (!granters[item.id]) return fail('UNAVAILABLE', '🚧 هذا العنصر غير متاح حالياً')

        if (locks.has(userId)) return fail('BUSY', '⏳ عملية شراء جارية، انتظر لحظة')
        locks.add(userId)

        try {
            const player = await Player.findOne({ userId })
            if (!player) return fail('NO_ACCOUNT', '❌ لا تملك حساباً')

            const wk = weekKey()
            if (!player.coopShopBought || player.coopShopBought.week !== wk) {
                player.coopShopBought = { week: wk, items: {} }
            }

            const bought = player.coopShopBought.items || {}
            const count = bought[item.id] || 0

            if (count >= item.weeklyLimit) {
                return fail('LIMIT', `❌ وصلت الحد الأسبوعي (${item.weeklyLimit}) لهذا العنصر`)
            }

            if ((player.coopCoins || 0) < item.price) {
                return fail('COINS', `❌ تحتاج ${item.price} عملة كو اوب (لديك ${player.coopCoins || 0})`)
            }

            // نمنح أولاً: لو فشل الهدف (شخصية غير صالحة) لا تُخصم العملات
            try {
                granters[item.id](player, item.amount, opts)
            } catch (e) {
                if (e.code === 'TARGET') return fail('TARGET', `❌ ${e.message}`)
                throw e
            }

            player.coopCoins = (player.coopCoins || 0) - item.price

            player.coopShopBought = { week: wk, items: { ...bought, [item.id]: count + 1 } }
            if (typeof player.markModified === 'function') player.markModified('coopShopBought')

            await player.save()

            if (item.id === 'xp' && onXp) {
                try { await onXp(player, item.amount) } catch (e) {}
            }

            return { ok: true, item: { id: item.id, name: item.name }, shop: view(player) }
        } catch (err) {
            console.error('coop shop buy error:', err)
            return fail('SERVER', '❌ خطأ بالخادم')
        } finally {
            locks.delete(userId)
        }
    }

    return { getShop, getShardTargets, buy, weekKey }
}

module.exports = { createCoopShopSystem, weekKey }
