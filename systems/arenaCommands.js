// =========================
// 🏟️ ARENA SYSTEM — COMMANDS
// =========================
// كل أوامر الأرينا بملف واحد منفصل. index.js يستدعي handleArenaCommand()
// فقط — لا حاجة لأي منطق أرينا إضافي بالملف الرئيسي.
//
// طريقة الربط بـ index.js (راجع ARENA_INTEGRATION.md المرفق):
//
//   const { handleArenaCommand, ARENA_HELP, startArenaSchedulers } = require('./systems/arenaCommands')
//   ...
//   const arenaHandled = await handleArenaCommand({ sock, msg, text, userId, safeSend, Player })
//   if (arenaHandled) return

const {
    STAT_KEYS,
    STAT_LABEL,
    STAT_CAP,
    getCharDev,
    simulateArenaBattle,
    formatDuelMessage,
    applyBattleResult,
    ensureShopFresh,
    ensureDailyAttempts,
    ensureArenaObject,
    getArenaRankName,
    getRankZone,
    ZONE_EMOJI,
    isArenaEligible,
    getArenaChar,
    COLOR_EMOJI,
    ARENA_CHARACTERS
} = require('./arenaSystem')

const DAILY_ATTEMPTS = 10

function tag(jid) {
    return `@${jid.split('@')[0]}`
}

// يرجع فقط الشخصيات المملوكة اللي مؤهّلة للأرينا مع رقمها الأصلي بالروستر
function getOwnedArenaChars(player) {

    const out = []

    ;(player.characters || []).forEach((char, i) => {
        if (char && isArenaEligible(char.name)) {
            out.push({ index: i, char })
        }
    })

    return out
}

async function handleArenaCommand({ sock, msg, text, userId, safeSend, Player }) {

    const jid = msg.key.remoteJid

    // =========================
    // .شخصيات_ارينا — عرض شخصياتك المؤهلة للأرينا + تطويرها
    // =========================
    if (text === '.شخصيات_ارينا') {

        const player = await Player.findOne({ userId })

        if (!player) {
            await safeSend(jid, { text: '❌ لا يوجد حساب' })
            return true
        }

        ensureArenaObject(player)
        await player.save()

        const owned = getOwnedArenaChars(player)

        if (!owned.length) {
            await safeSend(jid, {
                text: '❌ ما عندك أي شخصية مؤهّلة للأرينا حالياً\n\nاستخدم .تص_ارينا لمعرفة قائمة الشخصيات المؤهّلة'
            })
            return true
        }

        let listText = `🏟️ شخصياتك المؤهّلة للأرينا (${owned.length})\n\n`

        for (const { index, char } of owned) {

            const base = getArenaChar(char.name)
            const dev = getCharDev(player, char.name)

            listText +=
`${index + 1}. ${COLOR_EMOJI[base.arenaColor]} ${char.name}
   🎯${dev.focus} ⚡${dev.sp} 🛡️${dev.def} ❤️${dev.stamina}
`
        }

        listText += `\nفريق دفاعك الحالي: ${
            player.arena.team.length === 3
                ? player.arena.team.map(i => (player.characters[i] ? player.characters[i].name : '؟')).join(' + ')
                : 'لم يُحدَّد بعد — استخدم .فريق_ارينا'
        }`

        await safeSend(jid, { text: listText })
        return true
    }

    // =========================
    // .تص_ارينا — القائمة الكاملة للشخصيات المؤهّلة (60 شخصية) وألوانها
    // =========================
    if (text === '.تص_ارينا') {

        let out = `🏟️ الشخصيات المؤهّلة للأرينا (${ARENA_CHARACTERS.length})\n\n`

        for (const c of ARENA_CHARACTERS) {
            out += `${COLOR_EMOJI[c.arenaColor]} ${c.name}\n`
        }

        await safeSend(jid, { text: out })
        return true
    }

    // =========================
    // .فريق_ارينا 1 2 3 — تحديد فريق الدفاع (3 شخصيات مؤهّلة بالضبط)
    // =========================
    if (text.startsWith('.فريق_ارينا')) {

        const player = await Player.findOne({ userId })

        if (!player) {
            await safeSend(jid, { text: '❌ لا يوجد حساب' })
            return true
        }

        ensureArenaObject(player)

        const args = text.split(' ')

        if (args.length < 4) {
            await safeSend(jid, {
                text:
`❌ الاستخدام الصحيح
.فريق_ارينا 1 2 3

(الأرقام من قائمة .شخصيات_ارينا)`
            })
            return true
        }

        const indexes = [
            parseInt(args[1]) - 1,
            parseInt(args[2]) - 1,
            parseInt(args[3]) - 1
        ]

        if (indexes.some(i => isNaN(i))) {
            await safeSend(jid, { text: '❌ أرقام غير صحيحة' })
            return true
        }

        if (new Set(indexes).size !== 3) {
            await safeSend(jid, { text: '❌ لا يمكن تكرار نفس الشخصية' })
            return true
        }

        for (const i of indexes) {

            const char = player.characters[i]

            if (!char) {
                await safeSend(jid, { text: `❌ الشخصية رقم ${i + 1} غير موجودة بروسترك` })
                return true
            }

            if (!isArenaEligible(char.name)) {
                await safeSend(jid, { text: `❌ ${char.name} غير مؤهّلة للأرينا` })
                return true
            }
        }

        player.arena.team = indexes
        await player.save()

        const names = indexes.map(i => {
            const c = player.characters[i]
            const base = getArenaChar(c.name)
            return `${COLOR_EMOJI[base.arenaColor]} ${c.name}`
        })

        await safeSend(jid, {
            text:
`✅ تم تحديد فريق دفاعك بالأرينا

${names.join('\n')}`
        })

        return true
    }

    // =========================
    // .هجوم_ارينا @شخص — هجوم غير متزامن على فريق دفاع لاعب آخر
    // =========================
    if (text.startsWith('.هجوم_ارينا')) {

        const target =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!target) {
            await safeSend(jid, { text: '❌ مثال: .هجوم_ارينا @شخص' })
            return true
        }

        if (target === userId) {
            await safeSend(jid, { text: '❌ لا يمكنك مهاجمة نفسك' })
            return true
        }

        const attacker = await Player.findOne({ userId })
        const defender = await Player.findOne({ userId: target })

        if (!attacker) {
            await safeSend(jid, { text: '❌ لا يوجد حساب' })
            return true
        }

        if (!defender) {
            await safeSend(jid, { text: '❌ اللاعب المستهدف لا يملك حساباً' })
            return true
        }

        ensureArenaObject(attacker)
        ensureArenaObject(defender)

        if (attacker.arena.team.length !== 3) {
            await safeSend(jid, { text: '❌ حدد فريق دفاعك أولاً: .فريق_ارينا 1 2 3' })
            return true
        }

        if (defender.arena.team.length !== 3) {
            await safeSend(jid, { text: '❌ هذا اللاعب لم يحدد فريق دفاع بالأرينا بعد' })
            return true
        }

        if ((attacker.arena.attemptsToday || 0) <= 0) {
            await safeSend(jid, {
                text: `❌ انتهت محاولات هجوم الأرينا اليوم\n\n⏳ تتجدد ${DAILY_ATTEMPTS} محاولات يومياً عند منتصف الليل (توقيت السعودية)`
            })
            return true
        }

        attacker.arena.attemptsToday -= 1

        const attackerNames = attacker.arena.team.map(i => attacker.characters[i]?.name)
        const defenderNames = defender.arena.team.map(i => defender.characters[i]?.name)

        if (attackerNames.some(n => !n) || defenderNames.some(n => !n)) {
            await safeSend(jid, { text: '❌ بيانات فريق تالفة، أعد تحديد الفريق بـ .فريق_ارينا' })
            return true
        }

        const battle = simulateArenaBattle(
            attackerNames,
            defenderNames,
            (name) => getCharDev(attacker, name),
            (name) => getCharDev(defender, name)
        )

        const attackerWon = battle.winnerSide === 'a'

        applyBattleResult(attacker, defender, attackerWon)

        await attacker.save()
        await defender.save()

        const atkTag = tag(userId)
        const defTag = tag(target)

        // 3 رسائل منفصلة — رسالة واحدة لكل جولة (مبارزة)
        for (const duel of battle.duels) {
            await safeSend(jid, {
                text: formatDuelMessage(duel, atkTag, defTag),
                mentions: [userId, target]
            })
        }

        const scoreLine = `${battle.scoreA} - ${battle.scoreB}`

        await safeSend(jid, {
            text:
`🏟️ نتيجة معركة الأرينا

${atkTag} ⚔️ ${defTag}
📊 النتيجة: ${scoreLine}

🏆 الفائز: ${attackerWon ? atkTag : defTag}

${attackerWon
    ? `+${20} 🏆 ترافي لك | -${10} 🏆 للخصم\n+${15} 🥇 ميداليات أرينا`
    : `-${8} 🏆 ترافي لك | +${5} 🏆 للخصم\n+${5} 🥇 ميداليات أرينا`}

🎖️ رتبتك الآن: ${attacker.arena.rank}
⏳ محاولاتك المتبقية اليوم: ${attacker.arena.attemptsToday}`,
            mentions: [userId, target]
        })

        return true
    }

    // =========================
    // .متجر_الارينا — عرض عروض اليوم (تتجدد 11:30م بتوقيت السعودية)
    // =========================
    if (text === '.متجر_الارينا') {

        const player = await Player.findOne({ userId })

        if (!player) {
            await safeSend(jid, { text: '❌ لا يوجد حساب' })
            return true
        }

        ensureArenaObject(player)
        await player.save()

        let out =
`🛒 متجر الأرينا (خاص بك)
🥇 رصيدك: ${player.arena.medals} ميدالية

`

        player.arena.shop.items.forEach((item, i) => {
            out += `${i + 1}. ${STAT_LABEL[item.stat]} +${item.amount} — 🥇${item.cost}\n`
        })

        out += player.arena.shop.purchasedToday
            ? `\n✅ استخدمت شراءك اليومي بالفعل — يتجدد المتجر 11:30م بتوقيت السعودية`
            : `\n📌 للشراء: .شراء_ارينا [رقم العرض] [رقم الشخصية]\n(شراء واحد باليوم فقط)`

        await safeSend(jid, { text: out })
        return true
    }

    // =========================
    // .شراء_ارينا [رقم العرض] [رقم الشخصية] — شراء ترقية من متجر اليوم
    // =========================
    if (text.startsWith('.شراء_ارينا')) {

        const player = await Player.findOne({ userId })

        if (!player) {
            await safeSend(jid, { text: '❌ لا يوجد حساب' })
            return true
        }

        ensureArenaObject(player)

        const args = text.split(' ')

        if (args.length < 3) {
            await safeSend(jid, { text: '❌ الاستخدام: .شراء_ارينا [رقم العرض] [رقم الشخصية]' })
            return true
        }

        if (player.arena.shop.purchasedToday) {
            await safeSend(jid, { text: '❌ استخدمت شراءك اليومي بالفعل — يتجدد المتجر 11:30م بتوقيت السعودية' })
            return true
        }

        const itemIdx = parseInt(args[1]) - 1
        const charIdx = parseInt(args[2]) - 1

        const item = player.arena.shop.items[itemIdx]

        if (!item) {
            await safeSend(jid, { text: '❌ رقم عرض غير صحيح' })
            return true
        }

        const char = player.characters[charIdx]

        if (!char || !isArenaEligible(char.name)) {
            await safeSend(jid, { text: '❌ رقم شخصية غير صحيح أو غير مؤهّلة للأرينا' })
            return true
        }

        if ((player.arena.medals || 0) < item.cost) {
            await safeSend(jid, { text: `❌ ميدالياتك غير كافية (تحتاج 🥇${item.cost})` })
            return true
        }

        const dev = getCharDev(player, char.name)
        const newVal = Math.min(STAT_CAP, dev[item.stat] + item.amount)
        const actualGain = newVal - dev[item.stat]

        if (actualGain <= 0) {
            await safeSend(jid, { text: `❌ ${char.name} وصلت للحد الأقصى بخانة ${STAT_LABEL[item.stat]}` })
            return true
        }

        dev[item.stat] = newVal
        player.arena.charDev[char.name] = dev
        player.markModified('arena.charDev')

        player.arena.medals -= item.cost
        player.arena.shop.purchasedToday = true

        await player.save()

        await safeSend(jid, {
            text:
`✅ تم التطوير

${char.name}: ${STAT_LABEL[item.stat]} +${actualGain} (الآن ${newVal})
🥇 المتبقي: ${player.arena.medals}`
        })

        return true
    }

    // =========================
    // .رتبتي_ارينا — عرض رتبتك ونقاطك ونسبة فوزك
    // =========================
    if (text === '.رتبتي_ارينا') {

        const player = await Player.findOne({ userId })

        if (!player) {
            await safeSend(jid, { text: '❌ لا يوجد حساب' })
            return true
        }

        ensureArenaObject(player)
        await player.save()

        const wins = player.arena.wins || 0
        const losses = player.arena.losses || 0
        const total = wins + losses
        const winRate = total ? Math.round((wins / total) * 100) : 0

        const { zone } = getRankZone(player.arena.points)

        await safeSend(jid, {
            text:
`🎖️ ملفك بالأرينا — ${tag(userId)}

الرتبة: ${player.arena.rank} ${ZONE_EMOJI[zone]}
🏆 الترافي: ${player.arena.points}
📊 فوز/خسارة: ${wins}/${losses} (${winRate}%)
🥇 الميداليات: ${player.arena.medals}
⏳ محاولات اليوم: ${player.arena.attemptsToday}`,
            mentions: [userId]
        })

        return true
    }

    // =========================
    // .توب_ارينا — أفضل 15 لاعب بالأرينا
    // =========================
    if (text === '.توب_ارينا') {

        const top = await Player.find({ 'arena.points': { $gt: 0 } })
            .sort({ 'arena.points': -1 })
            .limit(15)

        if (!top.length) {
            await safeSend(jid, { text: '❌ لا يوجد تصنيف بعد' })
            return true
        }

        let out = `🏆 توب 15 — أرينا\n\n`
        const mentions = []

        top.forEach((p, i) => {

            const wins = p.arena?.wins || 0
            const losses = p.arena?.losses || 0
            const total = wins + losses
            const winRate = total ? Math.round((wins / total) * 100) : 0

            const medal =
                i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`

            out += `${medal} ${tag(p.userId)} — ${p.arena.rank} | 🏆${p.arena.points} | ${winRate}%\n`
            mentions.push(p.userId)
        })

        await safeSend(jid, { text: out, mentions })
        return true
    }

    return false
}

const ARENA_HELP = {
    '.شخصيات_ارينا': 'يعرض شخصياتك المؤهّلة للأرينا مع مستوى تطويرها (تركيز/ضغط روحي/دفاع/تحمل).',
    '.تص_ارينا': 'يعرض القائمة الكاملة لكل الشخصيات المؤهّلة للأرينا وألوانها.',
    '.فريق_ارينا': 'يحدد فريق دفاعك بالأرينا (3 شخصيات مؤهّلة). مثال: .فريق_ارينا 1 2 3',
    '.هجوم_ارينا': 'يهاجم فريق دفاع لاعب آخر بالأرينا (لا يحتاج يكون أونلاين). مثال: .هجوم_ارينا @شخص',
    '.متجر_الارينا': 'يعرض عروض متجر الأرينا الخاصة بك اليوم (تتجدد يومياً 11:30م بتوقيت السعودية).',
    '.شراء_ارينا': 'يشتري ترقية من متجر الأرينا اليومي. مثال: .شراء_ارينا 1 3',
    '.رتبتي_ارينا': 'يعرض رتبتك ونقاطك ونسبة فوزك بالأرينا.',
    '.توب_ارينا': 'يعرض أفضل 15 لاعب بتصنيف الأرينا.'
}

module.exports = {
    handleArenaCommand,
    ARENA_HELP,
    DAILY_ATTEMPTS
}
