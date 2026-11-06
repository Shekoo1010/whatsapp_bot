// =====================================================================
// systems/pullSystem.js
// منطق .اسحب (Gacha) كدالة مستقلة تُستخدم من الموقع (/u/<code>/pull)
// ---------------------------------------------------------------------
// ⚠️ هذا نفس منطق أمر .اسحب الموجود في index.js بالضبط، خطوة بخطوة:
//   بوابات (تبنيد / وقت العمل) → قفل pullLocks (المشترك مع .اسحب و .سحب_بنر)
//   → مخزون ممتلئ → تجديد السحبات كل ساعة → لا سحبات → ضمان SSS كل 30
//   → فرصة الندرة (+3 لفل 10) → المفضلة → مهام يومية/أسبوعية → إضافة الشخصية
//   → بونص سونيك → خصم سحبة + totalPulls + خبرة → حفظ → إنجازات → نقاط العالم
// الفرق الوحيد: بدل ما يرسل رسالة واتساب، يرجّع كائن نتيجة للموقع.
// =====================================================================

function createPullSystem(deps) {
    const {
        Player,
        pullLocks,               // نفس Set الموجود بـ index.js (مشترك مع الأمر)
        getCharsByRarityFast,
        getCharByNameRarityFast,
        companionsData,
        trackWeeklyPull,
        addCommandXp,
        COMMAND_XP,
        checkAndGrantAchievement,
        worlds,
        isBanned,
        botAvailable,
        isOwnerId,               // (userId) => boolean
        getSock,                 // () => sock الحي
        getNotifyJid             // async (userId) => قروب آخر نشاط أو الخاص
    } = deps

    const COOLDOWN = 60 * 60 * 1000
    const PULLS_PER_HOUR = 5
    const PITY_CAP = 30
    const MAX_MULTI = 5 // أقصى عدد سحبات بالطلب الواحد (زر ×N بالموقع)

    const fail = (code, extra = {}) => ({ ok: false, code, ...extra })

    // 🎴 السحب المتعدد: نفس منطق .اسحب بالضبط لكل سحبة، بحفظ واحد بالنهاية
    async function pullMany({ userId, count = 1 }) {

        count = Math.max(1, Math.min(MAX_MULTI, Math.floor(Number(count)) || 1))

        if (!userId) return fail('NO_PLAYER')

        // 🚫 نفس بوابة التبنيد (المالك مستثنى)
        if (isBanned(userId) && !isOwnerId(userId)) return fail('BANNED')

        // ⏰ نفس بوابة أوقات عمل البوت (المالك مستثنى)
        if (!botAvailable() && !isOwnerId(userId)) return fail('CLOSED')

        // 📡 الأمر أصلاً ما يشتغل والبوت غير متصل
        const sock = getSock()
        // 🌐 السحب من الموقع لا يحتاج اتصال الواتساب (الإنجازات/نقاط العالم داخل try/catch)

        // 🔒 نفس قفل .اسحب (يمنع سحبتين متزامنتين لنفس اللاعب، حتى بين الموقع والأمر)
        if (pullLocks.has(userId)) return fail('BUSY')

        pullLocks.add(userId)

        // 🛡️ نفس حماية الأمر: فك القفل تلقائياً بعد 20 ثانية
        const pullLockTimeout = setTimeout(() => {
            pullLocks.delete(userId)
        }, 20000)

        try {

            const player = await Player.findOne({ userId })

            if (!player) return fail('NO_PLAYER')

            // 📦 المخزون ممتلئ
            if (player.characters.length >= (player.maxCharacters || 30)) {
                return fail('FULL', { capacity: player.maxCharacters || 30 })
            }

            // 🔄 تجديد السحبات عند رأس كل ساعة
            const currentPeriod = Math.floor(Date.now() / COOLDOWN)

            if (player.lastReset !== currentPeriod) {

                if (player.pulls < PULLS_PER_HOUR) {
                    player.pulls = PULLS_PER_HOUR
                }

                player.lastReset = currentPeriod

                await player.save()
            }

            // 🎡 عملات سحب العجلة: لما تنتهي السحبات العادية تتحول عملة وحدة لسحبة
            // (بعد فحص المخزون والتجديد — فما تضيع عملة لو السحب انرفض، ومحفوظة ولا تتصفّر)
            if (player.pulls <= 0 && (player.bonusPulls || 0) > 0) {
                const bonusClaim = await Player.findOneAndUpdate(
                    { userId, bonusPulls: { $gt: 0 }, pulls: { $lte: 0 } },
                    { $inc: { bonusPulls: -1, pulls: 1 } },
                    { new: true, strict: false }
                )
                if (bonusClaim) {
                    player.pulls = bonusClaim.pulls
                    player.bonusPulls = bonusClaim.bonusPulls
                    player.unmarkModified('pulls')
                    player.unmarkModified('bonusPulls')
                }
            }

            // ⏳ لا توجد سحبات
            if (player.pulls <= 0) {
                return fail('NO_PULLS', {
                    retryInMs: COOLDOWN - (Date.now() % COOLDOWN)
                })
            }

            // 📦 المساحة المتبقية بالمخزون — ما نسحب أكثر من اللي يتسع
            const capacity = player.maxCharacters || 30
            const space = capacity - player.characters.length

            // عدد السحبات الفعلي = الأقل بين المطلوب والرصيد والمساحة
            const total = Math.min(count, player.pulls, space)

            const results = []

            for (let n = 0; n < total; n++) {

                // 🎯 عداد الضمان
                player.sssPity = (player.sssPity || 0) + 1

                let guaranteedSSS = false

                if (player.sssPity >= PITY_CAP) {
                    guaranteedSSS = true
                    player.sssPity = 0
                }

                // 🍀 بونص الحظ من لفل 10
                let luckBonus = 0

                if ((player.level || 1) >= 10) {
                    luckBonus = 3
                }

                // 🎲 تحديد الندرة
                let rarity = 'عادي'

                if (guaranteedSSS) {

                    rarity = 'SSS'

                } else {

                    let chance = Math.random() * 100

                    chance -= luckBonus

                    // 🦇 رفيق روج: يرفع النسبة الكلية لـ SSS (مثلاً 8% + 10% = 18%) — بقية الرتب ما تتغير
                    const rougeBonus = companionsData.getRougeSssBonus(player)

                    if (chance <= 5 + rougeBonus) {
                        rarity = 'SSS'
                    } else if (chance <= 22) {
                        rarity = 'اسطوري'
                    } else if (chance <= 50) {
                        rarity = 'ممتاز'
                    }
                }

                const filteredCharacters = getCharsByRarityFast(rarity)

                if (!filteredCharacters.length) {
                    // أول سحبة: نفشل مثل الأمر. بنص الدفعة: نوقف ونحفظ اللي انسحب
                    if (!results.length) {
                        player.sssPity = Math.max(0, (player.sssPity || 0) - 1)
                        return fail('NO_POOL', { rarity })
                    }
                    player.sssPity = Math.max(0, (player.sssPity || 0) - 1)
                    break
                }

                let randomCharacter
                let isFavoritePull = false

                // 💖 الشخصية المفضلة (SSS فقط، نسختين كحد أقصى)
                if (
                    rarity === 'SSS' &&
                    player.favoriteCharacter &&
                    player.favoriteObtained < 2 &&
                    player.favoriteExpires > Date.now()
                ) {

                    const favorite =
                        (
                            player.favoriteCharacter &&
                            player.favoriteExpires > Date.now() &&
                            player.favoriteObtained < 2
                        )
                            ? getCharByNameRarityFast(player.favoriteCharacter, 'SSS')
                            : null

                    if (favorite) {

                        randomCharacter = favorite

                        isFavoritePull = true

                        player.favoriteObtained =
                            (player.favoriteObtained || 0) + 1

                        if (player.favoriteObtained >= 2) {

                            player.favoriteObtained = 2

                            // إيقاف ظهور المفضلة بعد النسختين
                            player.favoriteCharacter = null
                        }
                    }
                }

                if (!randomCharacter) {

                    randomCharacter =
                        filteredCharacters[
                            Math.floor(Math.random() * filteredCharacters.length)
                        ]
                }

                if (
                    player.favoriteCharacter &&
                    player.favoriteExpires <= Date.now()
                ) {

                    player.favoriteCharacter = null
                    player.favoriteObtained = 0
                    player.sonicBonusUsed = 0
                    player.favoriteExpires = 0
                }

                // 📅 المهام اليومية
                if (player.dailyMissions) {

                    player.dailyMissions.pulls += 1

                    if (randomCharacter.rarity === 'اسطوري') {
                        player.dailyMissions.gotLegendary += 1
                    }

                    if (randomCharacter.rarity === 'SSS') {
                        player.dailyMissions.gotSSS = true
                    }

                    player.markModified('dailyMissions')
                }

                // 📅 المهام الأسبوعية
                trackWeeklyPull(player, randomCharacter)

                // ➕ إضافة الشخصية
                player.characters.push({
                    ...randomCharacter,
                    originalPower: randomCharacter.power,
                    evolutionLevel: 0,
                    urAbilities: []
                })

                // 💙 بونص رفيق سونيك — يجدد فرصة سحب المفضلة
                let sonicBonusText = ''

                if (
                    isFavoritePull &&
                    player.companion &&
                    player.companion.key === 'sonic' &&
                    (player.companion.level || 0) >= 1
                ) {

                    const sonicChance =
                        companionsData.getCompanionBonus('sonic', player.companion.level)

                    // 💙 حد أقصى: نسختين مضافتين من سونيك لكل مفضلة (2 أساسية + 2 مضافة = 4)
                    // ⚠️ يحتاج حقل sonicBonusUsed بـ Player.js — لو غير موجود نوقف البونص (أمان)
                    const sonicBonusUsed = player.sonicBonusUsed || 0
                    const sonicFieldOk = !!Player.schema.path('sonicBonusUsed')

                    if (
                        sonicFieldOk &&
                        sonicBonusUsed < 2 &&
                        Math.random() * 100 < sonicChance
                    ) {

                        player.sonicBonusUsed = sonicBonusUsed + 1

                        // هذي السحبة ما تُحسب من رصيد المفضلة
                        player.favoriteObtained =
                            Math.max(0, (player.favoriteObtained || 0) - 1)

                        if (!player.favoriteCharacter) {
                            player.favoriteCharacter = randomCharacter.name
                        }

                        sonicBonusText = '💙 رفيقك سونيك جدد فرصة سحب المفضلة! هذي السحبة ما تُحسب من رصيدك'
                    }
                }

                player.pulls -= 1
                player.totalPulls = (player.totalPulls || 0) + 1
                addCommandXp(player, COMMAND_XP.pull)

                results.push({
                    character: randomCharacter,
                    guaranteedSSS,
                    isFavoritePull,
                    sonicBonusText,
                    worldPointsText: '',
                    totalPullsAt: player.totalPulls,
                    charCountAt: player.characters.length
                })
            }

            await player.save()

            // ─────────────────────────────────────────────
            // من هنا السحبة انحفظت فعلياً — أي خطأ بالإضافات التالية
            // (إنجازات / نقاط عالم) ما يُرجع فشل للموقع
            // ─────────────────────────────────────────────
            let notifyJid = userId

            try {
                notifyJid = (await getNotifyJid(userId)) || userId
            } catch (e) { /* نكمل بالخاص */ }

            // 🏆 الإنجازات + 🌍 نقاط العالم لكل سحبة (نفس الأمر)، بعد الحفظ الواحد
            for (const r of results) {

                try {
                    await checkAndGrantAchievement(player, 'pulls', r.totalPullsAt, sock, notifyJid)
                    await checkAndGrantAchievement(player, 'collection', r.charCountAt, sock, notifyJid)
                } catch (err) {
                    console.log('site pull achievements error:', err)
                }

                try {
                    r.worldPointsText = (await worlds.awardPullPoints(
                        player,
                        sock,
                        notifyJid,
                        r.character.rarity
                    )) || ''
                } catch (err) {
                    console.log('site pull world points error:', err)
                }

                delete r.totalPullsAt
                delete r.charCountAt
            }

            return {
                ok: true,
                results,
                pullsLeft: player.pulls,
                bonusLeft: player.bonusPulls || 0,
                sssPity: player.sssPity,
                charCount: player.characters.length,
                capacity
            }

        } catch (err) {

            console.log('site pull error:', err)

            return fail('SERVER')

        } finally {

            clearTimeout(pullLockTimeout)
            pullLocks.delete(userId)
        }
    }

    // 🎴 سحبة وحدة — نفس الشكل القديم تماماً (يستخدمه /pull العادي)
    async function pullCharacter({ userId }) {

        const r = await pullMany({ userId, count: 1 })

        if (!r.ok) return r

        const one = r.results[0]

        return {
            ok: true,
            character: one.character,
            guaranteedSSS: one.guaranteedSSS,
            isFavoritePull: one.isFavoritePull,
            sonicBonusText: one.sonicBonusText,
            worldPointsText: one.worldPointsText,
            pullsLeft: r.pullsLeft,
            bonusLeft: r.bonusLeft,
            sssPity: r.sssPity,
            charCount: r.charCount,
            capacity: r.capacity
        }
    }

    return { pullCharacter, pullMany, MAX_MULTI, PULLS_PER_HOUR, PITY_CAP, COOLDOWN }
}

module.exports = { createPullSystem }
