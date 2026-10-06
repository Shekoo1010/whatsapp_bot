// =====================================================
// 🌌 systems/bannerPullSystem.js
// سحب البنر من الموقع — نفس منطق أمر .سحب_بنر بالواتس بالضبط:
//   • نفس الأورب (160 / 1600) ونفس الضمان و 70% للبنر و 50/50
//   • نفس قفل pullLocks (ما يصير سحبتين متزامنتين: موقع + واتساب)
//   • نفس فحص المخزون، المهام اليومية، XP، الإنجازات، نقاط العوالم
//   • نفس استرجاع الأورب لو صار خطأ بعد الخصم وقبل حفظ الشخصيات
// الحساب كله بالسيرفر — الصفحة تعرض النتيجة فقط.
// =====================================================

const { PULL_COST, MULTI_COUNT, MULTI_COST, SSS_RATE, SOFT_PITY_START, HARD_PITY, FEATURED_CHANCE, LEGENDARY_RATE, EXCELLENT_RATE } = require('./orbConfig')

function createBannerPullSystem(deps) {
    const {
        Player,
        pullLocks,
        orbs,                 // systems/orbSystem
        bannerMgr,            // systems/bannerManager
        resetDailyMissions,
        trackWeeklyPull,
        addCommandXp,
        COMMAND_XP,
        checkAndGrantAchievement,
        worlds,
        isBanned,
        botAvailable,
        isOwnerId,
        getSock,
        getNotifyJid
    } = deps

    // ───────────── معلومات البنر الحالي + رصيد اللاعب (لصفحة البنر) ─────────────
    async function getBannerInfo({ userId }) {
        try {
            const state = await bannerMgr.refreshBanner(getSock ? getSock() : null)

            if (!state || !state.character) return { ok: false, code: 'NO_BANNER' }

            const doc = await orbs.getStatus(userId)
            const b = state.character

            let next = null
            if (state.nextCharacter && state.nextCharacter.name) {
                next = { kind: 'next', name: String(state.nextCharacter.name) }
            } else if (bannerMgr.isVoteOpen(state)) {
                next = { kind: 'vote' }
            }

            return {
                ok: true,
                banner: b,                                   // الشخصية كاملة (الموقع يفلتر الحقول)
                bannerName: state.bannerName || b.name,
                endsAt: bannerMgr.getBannerEndsAtMs(state.weekKey),   // أسبوع كامل: الخميس 12 ص
                orbs: Number(doc?.orbs) || 0,
                pity: Number(doc?.pity) || 0,
                guaranteed: !!doc?.guaranteedFeatured,
                next,
                cfg: {
                    pullCost: PULL_COST, multiCount: MULTI_COUNT, multiCost: MULTI_COST,
                    sssRate: SSS_RATE, softPity: SOFT_PITY_START, hardPity: HARD_PITY,
                    featured: Math.round(FEATURED_CHANCE * 100),
                    legendary: LEGENDARY_RATE, excellent: EXCELLENT_RATE
                }
            }
        } catch (e) {
            console.log('bannerInfo error:', e)
            return { ok: false, code: 'SERVER' }
        }
    }

    // ───────────── السحب (1 أو 10) ─────────────
    async function pullBanner({ userId, count }) {
        const n = Number(count)
        if (n !== 1 && n !== MULTI_COUNT) return { ok: false, code: 'BAD_COUNT' }

        if (isBanned && isBanned(userId)) return { ok: false, code: 'BANNED' }
        if (botAvailable && !botAvailable() && !(isOwnerId && isOwnerId(userId))) return { ok: false, code: 'CLOSED' }

        const sock = getSock ? getSock() : null
        if (!sock) return { ok: false, code: 'OFFLINE' }

        const cost = n === 1 ? PULL_COST : MULTI_COST

        // 🔒 نفس قفل .اسحب و .سحب_بنر
        if (pullLocks.has(userId)) return { ok: false, code: 'BUSY' }
        pullLocks.add(userId)
        const lockTimeout = setTimeout(() => pullLocks.delete(userId), 20000)

        let charged = false

        try {
            const bannerState = await bannerMgr.refreshBanner(sock)
            if (!bannerState || !bannerState.character) return { ok: false, code: 'NO_BANNER' }

            const player = await Player.findOne({ userId })
            if (!player) return { ok: false, code: 'NO_PLAYER' }

            // المخزون لازم يكفي لكل السحبات
            const max = player.maxCharacters || 30
            const free = max - player.characters.length
            if (free < n) return { ok: false, code: 'FULL', capacity: max, free: Math.max(0, free), need: n }

            // خصم الأورب (ذري — يفشل لو الرصيد ما يكفي)
            const spentDoc = await orbs.spendOrbs(userId, cost)
            if (!spentDoc) {
                const cur = await orbs.getStatus(userId)
                return { ok: false, code: 'NO_ORBS', have: Number(cur?.orbs) || 0, need: cost }
            }
            charged = true

            // 🎲 السحب
            const rolled = bannerMgr.rollPulls(n, spentDoc, bannerState.character)

            // ✅ تصفير مهام اليوم الجديد قبل حساب السحبات
            await resetDailyMissions(player)

            for (const r of rolled.results) {
                const c = r.character

                if (player.dailyMissions) {
                    player.dailyMissions.pulls += 1
                    if (c.rarity === 'اسطوري') player.dailyMissions.gotLegendary += 1
                    if (c.rarity === 'SSS') player.dailyMissions.gotSSS = true
                    player.markModified('dailyMissions')
                }

                trackWeeklyPull(player, c)

                player.characters.push({
                    ...c,
                    originalPower: c.power,
                    evolutionLevel: 0,
                    urAbilities: []
                })

                player.totalPulls = (player.totalPulls || 0) + 1
                addCommandXp(player, COMMAND_XP.bannerPull)
            }

            await player.save()
            charged = false // الشخصيات انحفظت — ما نسترجع الأورب بعد كذا

            // من هنا وطالع: أي فشل ما يلغي السحبة (الشخصيات انحفظت والأورب انخصم)
            let orbDocAfter = null
            try {
                orbDocAfter = await bannerMgr.savePullState(userId, rolled, bannerState.bannerName)
            } catch (e) {
                console.log('banner site savePullState error:', e)
            }
            if (!orbDocAfter) {
                try { orbDocAfter = await orbs.getStatus(userId) } catch (e) { orbDocAfter = spentDoc }
            }

            const jid = await getNotifyJid(userId)

            try {
                await checkAndGrantAchievement(player, 'pulls', player.totalPulls, sock, jid)
                await checkAndGrantAchievement(player, 'collection', player.characters.length, sock, jid)
            } catch (e) {
                console.log('banner site achievement error:', e?.message || e)
            }

            // ⚡ نقاط العوالم (تندمج بنتيجة السحب)
            const worldTexts = []
            for (const r of rolled.results) {
                try {
                    const wt = await worlds.awardPullPoints(player, sock, jid, r.rarity)
                    if (wt) worldTexts.push(wt)
                } catch (e) {
                    console.log('banner site world points error:', e?.message || e)
                }
            }

            return {
                ok: true,
                count: n,
                cost,
                results: rolled.results,
                orbs: Number(orbDocAfter?.orbs) || 0,
                pity: Number(orbDocAfter?.pity) || 0,
                guaranteed: !!orbDocAfter?.guaranteedFeatured,
                charCount: player.characters.length,
                capacity: max,
                worldTexts: [...new Set(worldTexts)]
            }
        } catch (e) {
            console.log('banner site pull error:', e)

            // فشل بعد الخصم وقبل حفظ الشخصيات → نسترجع الأورب (نفس الأمر)
            if (charged) {
                try {
                    await orbs.refundOrbs(userId, cost)
                } catch (re) {
                    console.log('refund orbs error:', re)
                }
            }

            return { ok: false, code: 'SERVER', refunded: charged }
        } finally {
            clearTimeout(lockTimeout)
            pullLocks.delete(userId)
        }
    }

    return { getBannerInfo, pullBanner }
}

module.exports = { createBannerPullSystem }
