// =====================================================================
// systems/characterTradeSystem.js
// بيع + دمج الشخصيات من صفحة السحب بالموقع — نفس منطق الأوامر بالبوت بالضبط:
//   • sellCharacters : نفس .بيع  (السعر = max(100, power/2) + بونص القط، وأوميقا Ω ما تُباع)
//                      يختار اللاعب من القائمة ويكتب «تأكيد» (يغني عن .نعم للـ SSS والمطوّرة)
//   • mergeAll   : نفس .دمج_الكل (كل 5 ممتاز ➜ اسطوري ، كل 5 اسطوري ➜ SSS)
// يشارك أقفال giftLocks و pullLocks فما تتعارض مع سحب/إهداء/نقل متزامن.
// =====================================================================

const { charHash } = require('./giftSystem')

const MERGE_RULES = {
    'ممتاز': { result: 'اسطوري' },
    'اسطوري': { result: 'SSS' }
}

function normRarity(r) {
    const s = String(r || '').trim()
    return s === 'أسطوري' ? 'اسطوري' : s
}

function createCharacterTradeSystem({
    Player,
    giftLocks,
    pullLocks,
    applyCatBonus,
    getCatalog,                 // () => مصفوفة characters.json
    checkAndGrantAchievement,   // اختياري
    getSock,                    // اختياري
    getNotifyJid                // اختياري
}) {

    async function withLocks(userId, fn) {
        if (giftLocks.has(userId) || pullLocks.has(userId)) return { ok: false, code: 'BUSY' }
        giftLocks.add(userId)
        pullLocks.add(userId)
        try {
            return await fn()
        } finally {
            giftLocks.delete(userId)
            pullLocks.delete(userId)
        }
    }

    // ─────────── بيع شخصيات مختارة (نفس .بيع: نصف القوة بحد أدنى 100 + بونص القط) ───────────
    // hashes: مصفوفة charHash (نفس مفاتيح صفحة الإهداء). النسخ المتطابقة تُباع بعددها.
    // الكل أو لا شيء: لو أي اختيار ما انوجد أو فيه أوميقا ما يُباع شيء.
    async function sellCharacters({ userId, hashes }) {
        return withLocks(userId, async () => {
            try {
                const player = await Player.findOne({ userId })
                if (!player) return { ok: false, code: 'NO_PLAYER' }
                player.characters = player.characters || []

                const used = new Set()
                const picked = []
                for (const h of hashes) {
                    let idx = -1
                    for (let i = 0; i < player.characters.length; i++) {
                        if (used.has(i)) continue
                        const c = player.characters[i]
                        if (c && charHash(c) === h) { idx = i; break }
                    }
                    if (idx < 0) return { ok: false, code: 'STALE' }
                    used.add(idx)
                    picked.push(idx)
                }

                // 🌌 حماية: شخصية أوميقا Ω ما تُباع أبداً
                if (picked.some(i => player.characters[i].evolutionLevel === 7)) {
                    return { ok: false, code: 'OMEGA' }
                }

                let total = 0
                const names = []
                for (const i of picked) {
                    const c = player.characters[i]
                    total += Math.max(100, Math.floor((Number(c.power) || 0) / 2))
                    names.push(c.name)
                }

                // نفس البوت بالضبط: الشخصية المهمة (SSS أو مطوّرة) تمر على مسار .نعم
                // اللي يضيف المال عبر player.addMoney (القط مربوط داخلها)، والعادية
                // على مسار .بيع المباشر (applyCatBonus ثم player.money). كلها بحفظ واحد.
                const important = picked.some(i => {
                    const c = player.characters[i]
                    return c.rarity === 'SSS' || c.evolutionLevel > 0
                })

                picked.sort((x, y) => y - x).forEach(i => player.characters.splice(i, 1))
                player.markModified('characters')

                const moneyBefore = player.money || 0
                if (important && typeof player.addMoney === 'function') {
                    await player.addMoney(total)   // تحفظ المستند بنفسها (يشمل إزالة الشخصيات)
                    await player.save()
                } else {
                    player.money = moneyBefore + applyCatBonus(player, total)
                    await player.save()
                }
                const credited = (player.money || 0) - moneyBefore

                return { ok: true, sold: picked.length, gained: credited, money: player.money || 0, names, count: player.characters.length }
            } catch (err) {
                console.error('sellCharacters error:', err)
                return { ok: false, code: 'SERVER' }
            }
        })
    }

    // ─────────── دمج الكل (نفس .دمج_الكل) ───────────
    async function mergeAll({ userId, rarity }) {
        return withLocks(userId, async () => {
            try {
                const rar = normRarity(rarity)
                const rule = MERGE_RULES[rar]
                if (!rule) return { ok: false, code: 'BAD_RARITY' }

                const player = await Player.findOne({ userId })
                if (!player) return { ok: false, code: 'NO_PLAYER' }
                player.characters = player.characters || []

                const matchingIndexes = []
                player.characters.forEach((c, i) => {
                    if (c && c.rarity === rar) matchingIndexes.push(i)
                })

                if (matchingIndexes.length < 5) {
                    return { ok: false, code: 'NOT_ENOUGH', have: matchingIndexes.length, rarity: rar }
                }

                const catalog = (typeof getCatalog === 'function' ? getCatalog() : []) || []
                const rewardPool = catalog.filter(c => c.rarity === rule.result)
                if (!rewardPool.length) return { ok: false, code: 'NO_POOL', rarity: rule.result }

                const times = Math.floor(matchingIndexes.length / 5)
                const consumed = matchingIndexes.slice(0, times * 5).sort((a, b) => b - a)
                for (const i of consumed) player.characters.splice(i, 1)

                const rewards = []
                for (let k = 0; k < times; k++) {
                    const reward = JSON.parse(JSON.stringify(
                        rewardPool[Math.floor(Math.random() * rewardPool.length)]
                    ))
                    player.characters.push(reward)
                    rewards.push(reward)
                }

                player.markModified('characters')
                player.totalMerges = (player.totalMerges || 0) + rewards.length
                await player.save()

                // الإنجاز (غير حرج — فشله ما يلغي الدمج)
                // الدالة تمنح المكافآت وتحفظ اللاعب أولاً ثم ترسل الإشعار داخل try/catch،
                // فنستدعيها دائماً حتى لو الإشعار ما وصل (sock/jid غير متوفرين)
                if (typeof checkAndGrantAchievement === 'function') {
                    try {
                        const jid = typeof getNotifyJid === 'function' ? await getNotifyJid(userId) : null
                        const sock = typeof getSock === 'function' ? getSock() : null
                        await checkAndGrantAchievement(player, 'fusion', player.totalMerges, sock, jid)
                    } catch (e) {
                        console.error('mergeAll achievement error:', e?.message || e)
                    }
                }

                return {
                    ok: true,
                    from: rar,
                    to: rule.result,
                    consumed: times * 5,
                    rewards: rewards.map(r => ({ name: r.name, rarity: r.rarity, power: Number(r.power) || 0 })),
                    count: player.characters.length
                }
            } catch (err) {
                console.error('mergeAll error:', err)
                return { ok: false, code: 'SERVER' }
            }
        })
    }

    return { sellCharacters, mergeAll }
}

module.exports = { createCharacterTradeSystem }
