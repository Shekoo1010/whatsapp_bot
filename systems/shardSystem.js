// =====================================================================
// systems/shardSystem.js
// 🧩 الشظايا + 💎 التطوير + ♻️ الاسترجاع من الموقع
// نفس منطق أوامر الواتس بالضبط: .شظايا  /  .تطوير رقم  /  .استرجاع رقم
// (منقول من index.js بدون أي تغيير بالأرقام أو الشروط أو ترتيب الفحوصات)
// =====================================================================

const RANKS = ['SSS', 'SSS+', 'SSS++', 'UR I', 'UR II', 'UR III', 'EX']
const POWERS = [7000, 10000, 13000, 16000, 19000, 22000, 25000]
const COSTS = [1000000, 1500000, 2000000, 2500000, 3000000, 3500000]
const OMEGA = { shards: 12, cost: 15000000, power: 40000 }

const entriesOf = s => !s ? [] : (s instanceof Map ? [...s.entries()] : Object.entries(s))
const normKey = n => String(n).replace(/\./g, '．')
const byName = (a, b) => a[0].localeCompare(b[0], 'en', { sensitivity: 'base' })
const fmt = n => Number(n).toLocaleString()

function createShardSystem(d) {
    const { Player, giftLocks, pullLocks, getCatalog, resortPlayerCharacters,
        urAbilities, omegaAbilities, checkAndGrantAchievement, worlds, getSock, getNotifyJid } = d
    const MAX_OMEGA = Number(d.maxOmega) || 10
    const busy = new Set()
    const fail = (code, message, extra = {}) => ({ ok: false, code, message, ...extra })

    async function guard(userId, fn) {
        if (busy.has(userId) || (giftLocks && giftLocks.has(userId)) || (pullLocks && pullLocks.has(userId))) {
            return fail('BUSY', '⏳ عملية أخرى جارية على حسابك، انتظر ثواني وأعد المحاولة.')
        }
        busy.add(userId)
        try { return await fn() } catch (err) {
            console.error('shard system error:', err)
            return fail('SERVER', '❌ حدث خطأ بالخادم، حاول مرة ثانية.')
        } finally { busy.delete(userId) }
    }

    // اختيار قدرة بالاحتمالات (نفس .تطوير)
    function pickWeighted(list) {
        if (!list.length) return null
        const total = list.reduce((s, a) => s + a.chance, 0)
        let roll = Math.random() * total
        for (const a of list) { roll -= a.chance; if (roll <= 0) return a }
        return null
    }

    // ───────────── .شظايا (+ قائمة الشخصيات القابلة للتطوير) ─────────────
    async function getState(userId) {
        const p = await Player.findOne({ userId }).lean()
        if (!p) return fail('NO_ACCOUNT', '❌ لا يوجد حساب')
        const chars = p.characters || []
        const catalog = (getCatalog && getCatalog()) || []
        const all = entriesOf(p.shards)
        const map = new Map(all)

        const shards = all.sort(byName).filter(([, a]) => a > 0).map(([key, amount], i) => {
            const name = key.split('|')[0].replaceAll('_', ' ')
            const owned = chars.find(c => c.name === name || c.name.replace(/\./g, '．') === key)
            const omega = !!owned && owned.evolutionLevel === 6
            const bare = key.replace(/．/g, '.')
            const cat = catalog.find(c => c.rarity === 'SSS' && (c.name === bare || c.name.replace(/\./g, '．') === key))
            return { n: i + 1, key, name, amount, target: omega ? 12 : 2, omega, owned, cat }
        })

        const evo = []
        chars.forEach((c, index) => {
            if (c.rarity !== 'SSS' || (c.evolutionLevel || 0) >= 7) return
            const level = c.evolutionLevel || 0
            const type = c.evolutionType || (c.power >= 6600 ? 'fixed' : c.power >= 5400 ? 'medium' : 'low')
            evo.push({
                index, char: c, level,
                have: map.get(normKey(c.name)) || 0,
                need: level === 6 ? OMEGA.shards : 2,
                cost: level === 6 ? OMEGA.cost : COSTS[level],
                nextPower: level === 6 ? OMEGA.power : (type === 'fixed' ? POWERS[level + 1] : c.power + (type === 'medium' ? 2500 : 2000)),
                blocked: chars.some(x => x !== c && x.name === c.name && (x.evolutionLevel || 0) > 0),
                omegaLimit: level === 6 && (p.omegaEvolutions || 0) >= MAX_OMEGA
            })
        })
        return {
            ok: true, sessionVersion: p.sessionVersion || 0, money: Number(p.money) || 0,
            omegaUsed: p.omegaEvolutions || 0, maxOmega: MAX_OMEGA, shards, evo
        }
    }

    // ───────────── .استرجاع ─────────────
    // key = مفتاح الشظية كما بقائمة .شظايا (رقمها بالقائمة = رقم .استرجاع)
    function restoreShard({ userId, key }) {
        return guard(userId, async () => {
            const player = await Player.findOne({ userId })
            if (!player) return fail('NO_ACCOUNT', '❌ لا يوجد حساب')

            const shards = player.shards || new Map()
            const available = [...shards.entries()]
                .filter(([, amount]) => amount > 0)
                .sort(byName)
                .map(([name, amount]) => ({ name, amount }))
            const shardData = available.find(s => s.name === key)
            if (!shardData) return fail('BAD_INDEX', '❌ رقم غير صحيح')

            const name = shardData.name.replace(/．/g, '.')
            const char = ((getCatalog && getCatalog()) || []).find(c =>
                c.rarity === 'SSS' && (c.name === name || c.name.replace(/\./g, '．') === shardData.name))
            if (!char) return fail('NOT_FOUND', '❌ لم يتم العثور على الشخصية')

            player.characters.push({ ...char })
            resortPlayerCharacters(player)
            player.shards.set(name.replace(/\./g, '．'), shardData.amount - 1)
            player.markModified('characters')
            player.markModified('shards')
            await player.save()

            const owned = player.characters.find(c => c.name === char.name && c.evolutionLevel === 6)
            return {
                ok: true, name: char.name, left: shardData.amount - 1, target: owned ? 12 : 2,
                message: `♻️ تم الاسترجاع\n\n👑 ${char.name}\n\n🧩 الشظايا المتبقية:\n\n${shardData.amount - 1}/${owned ? 12 : 2}`
            }
        })
    }

    // ───────────── .تطوير ─────────────
    // index = رقم الشخصية (index بمصفوفة player.characters مثل .تطوير رقم) + name للتحقق
    function evolveCharacter({ userId, index, name }) {
        return guard(userId, async () => {
            const player = await Player.findOne({ userId })
            if (!player) return fail('NO_ACCOUNT', '❌ لا يوجد حساب')
            if (!Number.isInteger(index) || index < 0) return fail('BAD_INDEX', '❌ الاستخدام الصحيح\n.تطوير 1')

            const char = player.characters[index]
            if (!char) return fail('NO_CHAR', '❌ الشخصية غير موجودة')
            if (name != null && String(name) !== char.name) return fail('STALE', '❌ تغيّر ترتيب شخصياتك، حدّث الصفحة وأعد المحاولة.')

            const alreadyEvolved = player.characters.find(c =>
                c.name === char.name && (c.evolutionLevel || 0) > 0 && c !== char)
            if (alreadyEvolved) {
                return fail('DUP_EVOLVED', `❌ ${char.name}\nيوجد لديك نسخة أخرى مطورة من هذه الشخصية بالفعل\n👑 لا يمكن تطوير أكثر من نسخة واحدة من نفس الشخصية\n💎 استخدم المكررات للشظايا عبر:\n.حول رقم_الشخصية`)
            }

            if (char.evolutionLevel === undefined) char.evolutionLevel = 0
            if (!char.urAbilities) char.urAbilities = []
            if (char.rarity !== 'SSS') return fail('NOT_SSS', '❌ فقط شخصيات SSS يمكن تطويرها')
            if (!player.shards) player.shards = new Map()

            const shardKey = char.name.replace(/\./g, '．')
            const currentLevel = char.evolutionLevel || 0
            if (currentLevel >= 7) {
                return fail('MAXED', `👑 ${char.name}\n🌌 وصلت الشخصية إلى رتبة Ω أوميقا بالفعل، أعلى رتبة ممكنة`)
            }

            const catalog = (getCatalog && getCatalog()) || []
            const sock = getSock && getSock()
            const jid = getNotifyJid ? await getNotifyJid(userId).catch(() => null) : null

            // 🌌 تطوير أوميقا Ω (بعد EX — 10 تطويرات فقط مدى الحياة)
            if (currentLevel === 6) {
                if ((player.omegaEvolutions || 0) >= MAX_OMEGA) {
                    return fail('OMEGA_LIMIT', `❌ وصلت للحد الأقصى\n🌌 تقدر تطور ${MAX_OMEGA} شخصيات فقط لرتبة Ω أوميقا مدى الحياة\n👑 استخدمت جميع محاولاتك (${MAX_OMEGA}/${MAX_OMEGA})`)
                }
                const omegaShards = player.shards.get(shardKey) || 0
                if (omegaShards < OMEGA.shards) {
                    return fail('NO_SHARDS', `❌ لا تملك شظايا كافية لتطوير أوميقا\n🧩 ${char.name}\n📦 ${omegaShards}/${OMEGA.shards}`)
                }
                if (player.money < OMEGA.cost) return fail('NO_MONEY', `❌ تحتاج\n💰 ${fmt(OMEGA.cost)}`)

                player.money -= OMEGA.cost
                player.shards.set(shardKey, omegaShards - OMEGA.shards)
                player.markModified('shards')
                char.evolutionLevel = 7
                char.power = OMEGA.power
                player.omegaEvolutions = (player.omegaEvolutions || 0) + 1

                const avail = omegaAbilities.filter(a => !char.urAbilities.some(o => o.name === a.name))
                let omegaAbility = null
                if (avail.length) omegaAbility = pickWeighted(avail) || avail[avail.length - 1]
                if (omegaAbility) char.urAbilities.push(omegaAbility)

                player.markModified('characters')
                const latest = catalog.find(c => c.name === char.name && c.rarity === 'SSS')
                if (latest?.image) char.image = latest.image
                await player.save()

                let worldText = ''
                try { await checkAndGrantAchievement(player, 'omega', player.omegaEvolutions, sock, jid) } catch (e) { console.error('omega achievement error:', e?.message || e) }
                try { worldText = (await worlds.awardEvolutionPoints(player, sock, jid, 'Ω')) || '' } catch (e) { console.error('evolution points error:', e?.message || e) }

                return {
                    ok: true, omega: true, name: char.name, oldRank: 'EX', newRank: 'Ω', newLevel: 7,
                    power: char.power, cost: OMEGA.cost, shardsUsed: OMEGA.shards,
                    abilities: omegaAbility ? [{ name: omegaAbility.name, description: omegaAbility.description }] : [],
                    omegaUsed: player.omegaEvolutions, maxOmega: MAX_OMEGA, worldText,
                    message: `🌌 OMEGA ASCENSION\n👑 ${char.name}\nEX ➜ Ω\n⚔️ ${char.power.toLocaleString()}\n💰 ${fmt(OMEGA.cost)}\n🧩 ${OMEGA.shards}\n🏆 ${player.omegaEvolutions}/${MAX_OMEGA}`
                }
            }

            const shards = player.shards.get(shardKey) || 0
            if (shards < 2) return fail('NO_SHARDS', `❌ لا تملك شظايا كافية\n🧩 ${char.name}\n📦 ${shards}/2`)
            const cost = COSTS[currentLevel]
            if (player.money < cost) return fail('NO_MONEY', `❌ تحتاج\n💰 ${fmt(cost)}`)

            player.money -= cost
            player.shards.set(shardKey, shards - 2)
            player.markModified('shards')

            const oldLevel = currentLevel
            char.evolutionLevel++
            const newLevel = char.evolutionLevel
            if (!char.evolutionType) {
                if (char.power >= 6600) char.evolutionType = 'fixed'
                else if (char.power >= 5400) char.evolutionType = 'medium'
                else char.evolutionType = 'low'
            }
            if (char.evolutionType === 'fixed') char.power = POWERS[newLevel]
            else if (char.evolutionType === 'medium') char.power += 2500
            else char.power += 2000

            const availableAbilities = urAbilities.filter(a => !char.urAbilities.some(o => o.name === a.name))
            let randomAbility = null
            let exAbility = null
            if (availableAbilities.length) {
                randomAbility = pickWeighted(availableAbilities)
            }
            if (randomAbility) char.urAbilities.push(randomAbility)

            if (newLevel === 6) {
                const left = urAbilities.filter(a => !char.urAbilities.some(o => o.name === a.name))
                if (left.length) {
                    exAbility = left[Math.floor(Math.random() * left.length)]
                    char.urAbilities.push(exAbility)
                }
            }

            player.markModified('characters')
            const latest = catalog.find(c => c.name === char.name && c.rarity === 'SSS')
            if (latest?.image) char.image = latest.image
            await player.save()

            const oldRank = RANKS[oldLevel]
            const newRank = RANKS[newLevel]
            let worldText = ''
            try { worldText = (await worlds.awardEvolutionPoints(player, sock, jid, newRank)) || '' } catch (e) { console.error('evolution points error:', e?.message || e) }

            return {
                ok: true, omega: false, name: char.name, oldRank, newRank, newLevel,
                power: char.power, cost, shardsUsed: 2,
                abilities: [randomAbility, exAbility].filter(Boolean).map(a => ({ name: a.name, description: a.description })),
                worldText,
                message: `🌌 EVOLUTION\n👑 ${char.name}\n🌟 ${oldRank} ⬇️ ${newRank}\n⚔️ ${char.power}\n💰 ${fmt(cost)}\n🧩 2`
            }
        })
    }

    return { getState, restoreShard, evolveCharacter, MAX_OMEGA }
}

module.exports = { createShardSystem }
