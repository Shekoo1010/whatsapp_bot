// systems/beastAttack.js
// 🦊🌌 هجوم كوراما (.اقضي) والجوبي (.اباده) — نسخة محسّنة
//
// الفكرة:
//  - قراءة خفيفة (lean + حقول محددة) بدل تحميل مستند اللاعب كاملاً
//  - لا يُحفظ اللاعب مع كل هجمة (يُكتب فقط عند تغيّر الاختيار/الإحياء)
//  - ضرر ذري على الوحش (findOneAndUpdate + $inc) بدل قراءة/تعديل/حفظ → لا يضيع ضرر أحد ولا تتكرر جوائز القتل
//  - الرد للاعب أولاً، وكل الباقي (نقاط العالم، الضربة الجماعية، الجوائز) بالخلفية
//  - الضربة الجماعية: استعلام واحد + bulkWrite واحد بدل findOne+save لكل مشارك
//  - الجوائز عند القتل: استعلام واحد + حفظ على دفعات (save يبقى عشان hook رفع المستوى)

const HIT_COOLDOWN_MS = 30 * 1000
const MASS_EVERY = 3                    // كل كم ضربة تصير ضربة جماعية
const PLAYER_HP = 60000                 // دم اللاعب ضد الوحش
const MASS_DEATH_MS = 5 * 60 * 1000     // مدة موت اللاعب بعد الضربة الجماعية
const RESPAWN_MS = 2 * 60 * 60 * 1000   // نفس القيمة القديمة بعد قتل الوحش
const SAVE_BATCH = 10

function createBeastAttack(deps) {

    const {
        Player,
        Beast,
        worlds,
        cooldowns,
        playerAbilities,
        getKuramaAbility,
        getJuubiAbility,
        beastRewards,
        applyCatBonus,
        scaledBossKillXp
    } = deps

    const CFG = {

        kurama: {
            key: 'kurama',
            name: 'كوراما',
            otherName: 'الجوبي',
            damageMult: 2,
            strictMax: true,
            fields: { hp: 'kuramaHp', max: 'kuramaMaxHp', dead: 'kuramaDead', respawn: 'kuramaRespawn' },
            getAbility: () => getKuramaAbility(),
            massDamage: a => (a.type === 'damage' || a.type === 'extraDamage') ? a.value : 3000,
            hitTitle: '🦊 هجوم على كوراما',
            hitAttack: '🔥 كرة البيجو العملاقة',
            massHeader: a => `🦊 كوراما غضب!\n\n🔥 القدرة:\n${a.name}\n\n`,
            killTitle: '🏆 تم القضاء على كوراما',
            rankTitle: '🥇 أفضل المقاتلين',
            killFooter: ''
        },

        juubi: {
            key: 'juubi',
            name: 'الجوبي',
            otherName: 'كوراما',
            damageMult: 5,
            strictMax: false,
            fields: { hp: 'juubiHp', max: 'juubiMaxHp', dead: 'juubiDead', respawn: 'juubiRespawn' },
            getAbility: () => getJuubiAbility(),
            massDamage: a => a.value || 5000,
            hitTitle: '🌌 هجوم على الجوبي',
            hitAttack: '☠️ قنبلة العشرة ذيول',
            massHeader: a => `🌌 الجوبي أطلق قدرة جماعية!\n\n☠️ ${a.name}\n\n`,
            killTitle: '🌌 تم إبادة الجوبي',
            rankTitle: '👑 أساطير المعركة',
            killFooter: '\n\n☠️ انتهت المعركة الكبرى'
        }
    }

    function logErr(label) {
        return err => console.log(`❌ [${label}]`, err?.message || err)
    }

    // قدرة اللاعب العشوائية (نفس المنطق القديم؛ الشفاء كان نصاً فقط ولا يُحفظ)
    function applyPlayerAbility(damage) {

        const ability = playerAbilities[Math.floor(Math.random() * playerAbilities.length)]

        if (!ability) return { damage, text: '' }

        const v = Number(ability.value) || 0
        let text = ''

        if (ability.type === 'damage') {
            if (ability.multiplier) damage += Math.floor(damage * (ability.multiplier - 1))
            text = `⚡ قدرة اللاعب: ${ability.name}`
        } else if (ability.type === 'lifesteal') {
            text = `🩸 ${ability.name} (+${v})`
        } else if (ability.type === 'buffDamage') {
            damage += Math.floor(damage * (v / 100))
            text = `💢 ${ability.name}`
        } else if (ability.type === 'extraDamage') {
            damage += v
            text = `☄️ ${ability.name}`
        }

        return { damage, text }
    }

    // =========================================================
    // 💥 الضربة الجماعية (كل 3 ضربات)
    // =========================================================
    async function massAttack(cfg, { sock, jid, beast }) {

        const F = cfg.fields
        const ability = cfg.getAbility()
        const baseDamage = cfg.massDamage(ability)

        const ids = Object.keys(beast.rankings || {})
        if (!ids.length) return

        const players = await Player.find({ userId: { $in: ids } })
            .select(`userId defense ${F.hp} ${F.max} ${F.dead}`)
            .lean()

        const respawnAt = new Date(Date.now() + MASS_DEATH_MS)
        const ops = []
        const mentions = []
        let text = cfg.massHeader(ability)

        for (const p of players) {

            // اللاعب الميت أصلاً ما نضربه مرة ثانية
            if (p[F.dead]) continue

            let dmg = baseDamage - Math.floor(baseDamage * ((p.defense || 0) / 100))
            dmg = Math.max(1, dmg)

            const before = p[F.hp] ?? PLAYER_HP
            const after = Math.max(0, before - dmg)
            const max = p[F.max] || PLAYER_HP
            const tag = p.userId.split('@')[0]

            mentions.push(p.userId)

            // تحديث ذري بالقاعدة (pipeline) — يطرح الضرر من القيمة الحالية فعلياً
            ops.push({
                updateOne: {
                    filter: { userId: p.userId, [F.dead]: { $ne: true } },
                    update: [
                        { $set: { [F.hp]: { $max: [0, { $subtract: [{ $ifNull: [`$${F.hp}`, PLAYER_HP] }, dmg] }] } } },
                        {
                            $set: {
                                [F.dead]: { $lte: [`$${F.hp}`, 0] },
                                [F.respawn]: { $cond: [{ $lte: [`$${F.hp}`, 0] }, respawnAt, `$${F.respawn}`] }
                            }
                        }
                    ]
                }
            })

            if (after <= 0) {
                text += `☠️ @${tag}\n\nتم القضاء عليه\n\n⏳ سيعود بعد 5 دقائق\n\n❤️ 0/${max.toLocaleString()}\n\n`
            } else {
                text += `⚔️ @${tag}\n\n💥 -${dmg.toLocaleString()}\n\n❤️ ${after.toLocaleString()}/${max.toLocaleString()}\n\n`
            }
        }

        if (!ops.length) return

        await Player.collection.bulkWrite(ops, { ordered: false })

        await sock.sendMessage(
            jid,
            beast.image
                ? { image: { url: beast.image }, caption: text, mentions }
                : { text, mentions }
        )
    }

    // =========================================================
    // 🏆 قتل الوحش + الجوائز (ينفّذ مرة واحدة فقط من الطلب الذي أسقطه)
    // =========================================================
    async function finishKill(cfg, { sock, jid, beast }) {

        // 1) تثبيت حالة الموت فوراً + تصفير الترتيب
        await Beast.updateOne(
            { _id: beast._id },
            {
                $set: {
                    hp: 0,
                    attackCounter: 0,
                    lastKilledAt: new Date(),
                    respawnAt: new Date(Date.now() + RESPAWN_MS),
                    rankings: {}
                }
            }
        )

        // 2) الترتيب من لقطة الترتيب وقت الضربة القاضية
        const ranking = Object.entries(beast.rankings || {})
            .sort((a, b) => b[1] - a[1])

        if (!ranking.length) return

        const players = await Player.find({ userId: { $in: ranking.map(([id]) => id) } })
        const byId = new Map(players.map(p => [p.userId, p]))

        const toSave = []
        const mentions = []
        let lines = ''

        ranking.forEach(([playerId, totalDamage], i) => {

            const p = byId.get(playerId)
            if (!p) return

            const rank = i + 1
            const reward = beastRewards.getEggCarrierReward(rank)

            const moneyBase =
                rank === 1 ? 1000000 :
                rank === 2 ? 750000 :
                rank === 3 ? 500000 : 400000

            const finalMoney = applyCatBonus(p, moneyBase)
            const xp = scaledBossKillXp(reward.xp)

            p.money = (p.money || 0) + finalMoney
            p.xp = (p.xp || 0) + xp
            p.eggTickets = (p.eggTickets || 0) + (reward.tickets || 0)

            // أول 3 فقط ياخذون بيضة — نوعها حسب حامل البيضة هالدورة
            if (rank <= 3) {
                if (beast.eggCarrier) {
                    p.companionEggs = (p.companionEggs || 0) + (reward.egg || 0)
                } else {
                    p.beastEggs = (p.beastEggs || 0) + (reward.egg || 0)
                }
            }

            toSave.push(p)
            mentions.push(playerId)

            if (rank <= 3) {
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
                const eggLabel = beast.eggCarrier ? '🥚 بيضة رفيق' : '📦 بيضة وحش'

                lines +=
`${medal} @${playerId.split('@')[0]}

💥 الضرر:
${totalDamage.toLocaleString()}

💰 ${finalMoney.toLocaleString()}
⭐ ${xp}
🎟️ ${reward.tickets || 0}
${eggLabel}: ${reward.egg || 0}

`
            }
        })

        // 3) حفظ على دفعات (save عشان hook رفع المستوى التلقائي)
        for (let i = 0; i < toSave.length; i += SAVE_BATCH) {
            await Promise.all(
                toSave.slice(i, i + SAVE_BATCH).map(p =>
                    p.save().catch(logErr(`حفظ جائزة ${cfg.name}`))
                )
            )
        }

        await sock.sendMessage(jid, {
            text:
`━━━━━━━━━━━━━━
${cfg.killTitle}
━━━━━━━━━━━━━━

${cfg.rankTitle}

${lines}━━━━━━━━━━━━━━

⏳ سيعود بعد ساعتين${cfg.killFooter}`,
            mentions
        })
    }

    // =========================================================
    // ⚔️ الهجوم نفسه
    // =========================================================
    async function attack(cfg, { sock, jid, userId }) {

        const F = cfg.fields
        const send = content => sock.sendMessage(jid, content)

        // 1) كولداون صامت (بدون رسالة وبدون قاعدة بيانات)
        const cdKey = `${userId}_${cfg.key}`
        const t0 = Date.now()
        const lastUse = cooldowns.get(cdKey)

        if (lastUse && t0 - lastUse < HIT_COOLDOWN_MS) return

        cooldowns.set(cdKey, t0)

        let hit = false
        try {
            await doAttack(cfg, { sock, jid, userId, send, markHit: () => { hit = true } })
        } finally {
            if (!hit) cooldowns.delete(cdKey)   // رفض/خطأ = ما يُحسب كولداون
        }
    }

    async function doAttack(cfg, { sock, jid, userId, send, markHit }) {

        const F = cfg.fields

        // 2) قراءة خفيفة بالتوازي
        const [player, beast] = await Promise.all([
            Player.findOne({ userId })
                .select(`userId world beastChoiceTarget beastChoiceCycle ${F.hp} ${F.max} ${F.dead} ${F.respawn} characters.name characters.power`)
                .lean(),
            Beast.findOne({ name: cfg.name })
                .select('hp maxHp respawnAt image eggCarrier')
                .lean()
        ])

        if (!player) return send({ text: '❌ ليس لديك حساب' })

        // ما نكتب اللاعب إلا لو فيه تغيير فعلي
        const playerSet = {}
        const reviveSet = {
            [F.hp]: PLAYER_HP,
            [F.max]: PLAYER_HP,
            [F.dead]: false,
            [F.respawn]: null
        }

        // 3) موت اللاعب
        if (player[F.dead]) {

            const respawnMs = player[F.respawn] ? new Date(player[F.respawn]).getTime() : 0

            if (Date.now() < respawnMs) {
                const mins = Math.ceil((respawnMs - Date.now()) / 60000)
                return send({ text: `☠️ أنت ميت حالياً\n\n⏳ المتبقي:\n${mins} دقيقة` })
            }

            Object.assign(playerSet, reviveSet)
        }

        if (!player.characters || !player.characters.length) {
            return send({ text: '❌ لا تملك شخصيات' })
        }

        if (!(player[F.hp] > 0) || (cfg.strictMax ? player[F.max] !== PLAYER_HP : !player[F.max])) {
            Object.assign(playerSet, reviveSet)
        }

        // 4) الوحش
        if (!beast || !(beast.hp > 0)) {

            const when = beast && beast.respawnAt
                ? `\n\n⏳ العودة:\n${new Date(beast.respawnAt).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}`
                : ''

            return send({ text: `❌ ${cfg.name} غير متاح حالياً${when}` })
        }

        // 5) الاختيار الحصري بين كوراما والجوبي (معرّف الدورة = respawnAt)
        const cycle = beast.respawnAt ? new Date(beast.respawnAt).getTime() : null
        const savedCycle = player.beastChoiceCycle ?? null

        if (
            player.beastChoiceTarget &&
            player.beastChoiceTarget !== cfg.key &&
            savedCycle === cycle
        ) {
            return send({
                text:
`❌ اخترت مهاجمة ${cfg.otherName} هالدورة

🔒 ما تقدر تهاجم ${cfg.name} بنفس الوقت — الاختيار يفتح من جديد بعد الريسبون القادم للوحوش.`
            })
        }

        if (player.beastChoiceTarget !== cfg.key || savedCycle !== cycle) {
            playerSet.beastChoiceTarget = cfg.key
            playerSet.beastChoiceCycle = cycle
        }

        // 6) حساب الضرر
        let strongest = null

        for (const c of player.characters) {
            if (!strongest || (c.power || 0) > (strongest.power || 0)) strongest = c
        }

        let damage = Math.floor((strongest.power || 0) * cfg.damageMult)

        const ab = applyPlayerAbility(damage)
        damage = Math.floor(ab.damage)

        if (!Number.isFinite(damage) || damage < 0) damage = 0

        // 7) الضرر ذري على الوحش (+ كتابة اللاعب بالتوازي لو لزم)
        const [updated] = await Promise.all([
            Beast.findOneAndUpdate(
                { name: cfg.name, hp: { $gt: 0 } },
                { $inc: { hp: -damage, attackCounter: 1, [`rankings.${userId}`]: damage } },
                { new: true }
            ).lean(),

            Object.keys(playerSet).length
                ? Player.updateOne({ userId }, { $set: playerSet }).catch(logErr('تحديث اللاعب'))
                : null
        ])

        if (!updated) return send({ text: `❌ ${cfg.name} سقط للتو` })

        markHit()

        const killed = updated.hp <= 0   // طلب واحد فقط يعبر الصفر (الفلتر hp > 0)
        const hpLeft = Math.max(0, updated.hp)

        // 8) الرد الفوري
        let worldText = null
        if (player.world) {
            worldText = await Promise.resolve(
                worlds.awardCounter({ userId, world: player.world }, sock, jid, 'beast_hits', 1)
            ).catch(err => { logErr('نقاط العالم')(err); return null })
        }

        const result = [
            cfg.hitTitle,
            ab.text,
            cfg.hitAttack,
            `⚔️ الشخصية:\n${strongest.name}`,
            `💥 الضرر:\n${damage.toLocaleString()}`,
            `👹 الوحش:\n${cfg.name}`,
            `❤️ المتبقي:\n${hpLeft.toLocaleString()}/${(updated.maxHp || 0).toLocaleString()}`,
            worldText
        ].filter(Boolean).join('\n\n')

        await send({ text: result })

        // 9) كل الباقي بالخلفية (ما نحجز طابور اللاعب)

        if (killed) {
            finishKill(cfg, { sock, jid, beast: updated }).catch(logErr(`قتل ${cfg.name}`))
            return
        }

        if (updated.attackCounter > 0 && updated.attackCounter % MASS_EVERY === 0) {
            massAttack(cfg, { sock, jid, beast: updated }).catch(logErr(`ضربة ${cfg.name} الجماعية`))
        }
    }

    return {
        kurama: ctx => attack(CFG.kurama, ctx),
        juubi: ctx => attack(CFG.juubi, ctx)
    }
}

module.exports = { createBeastAttack }
