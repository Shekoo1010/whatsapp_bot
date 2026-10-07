// =====================================================================
// systems/kingdomRaidSystem.js — غزو المملكة من الموقع
// نفس منطق أمر .غزو بالبوت بالضبط (مراحل/قوة/مكافأة، استنزاف الشخصية،
// بونص رفيق شادو، XP، إنجاز "kingdom") ويشارك raidLocks مع الأمر.
// =====================================================================
const KINGDOM_STAGES = [
    { name: '🏰 بوابة المملكة', power: 4500, reward: 100000 },
    { name: '⚔️ حرس العاصمة', power: 5000, reward: 120000 },
    { name: '🛡️ الفرسان الملكيون', power: 5500, reward: 140000 },
    { name: '👑 قاعة العرش', power: 6000, reward: 160000 },
    { name: '🏹 أبراج المراقبة', power: 6500, reward: 180000 },
    { name: '🔥 ساحة الحرب الكبرى', power: 7000, reward: 200000 },
    { name: '🌑 الحصن المظلم', power: 7500, reward: 240000 },
    { name: '⚜️ مقر النبلاء', power: 8000, reward: 260000 },
    { name: '🐉 التنين الحارس', power: 8500, reward: 280000 },
    { name: '👑 العرش الإمبراطوري', power: 9000, reward: 320000 }
]

function createKingdomRaidSystem(deps) {
    const { Player, companionsData, raidLocks, addCommandXp, xpPerStage, checkAndGrantAchievement, getSock, getNotifyJid } = deps

    const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })

    function freshRaid() {
        return { stage: 0, usedCharacters: [], lastReset: today(), totalEarned: 0 }
    }

    // نسبة بونص شادو (نفس شرط الأمر: رفيق شادو ومستوى >= 1)
    function shadowPercent(player) {
        const c = player.companion
        if (c && c.key === 'shadow' && (c.level || 0) >= 1) {
            return companionsData.getCompanionBonus('shadow', c.level) || 0
        }
        return 0
    }

    // total = إجمالي أرباح الغزو مدى الحياة (kingdomTotalEarned) — لا يقل عن أرباح اليوم
    const stateOut = (raid, life) => ({
        stage: raid.stage || 0,
        used: (raid.usedCharacters || []).map(String),
        earned: raid.totalEarned || 0,
        total: Math.max(Number(life) || 0, raid.totalEarned || 0)
    })

    // قراءة فقط (لا تحفظ شيئاً): لو اليوم تغيّر يُعرض غزو جديد
    async function getState(userId) {
        const p = await Player.findOne({ userId }).select('characters kingdomRaid companion kingdomTotalEarned').lean()
        if (!p) return null
        const raid = (p.kingdomRaid && p.kingdomRaid.lastReset === today()) ? p.kingdomRaid : freshRaid()
        const c = p.companion || {}
        return {
            state: stateOut(raid, p.kingdomTotalEarned),
            // i = رقم الشخصية بالضبط كما بأمر .غزو رقم_الشخصية
            characters: (p.characters || []).map((ch, i) => ({ i: i + 1, ch })),
            companion: { key: c.key || null, level: c.level || 0, pct: shadowPercent(p) }
        }
    }

    async function attack({ userId, charIndex }) {
        const fail = (code, message, extra = {}) => ({ ok: false, code, message, ...extra })

        if (raidLocks.has(userId)) return fail('BUSY', '⏳ انتظر حتى تنتهي عملية الغزو السابقة.')
        raidLocks.add(userId)
        const lockTimer = setTimeout(() => raidLocks.delete(userId), 20000)

        try {
            const player = await Player.findOne({ userId })
            if (!player) return fail('NO_PLAYER', '❌ لا يوجد حساب')

            if (!player.kingdomRaid || player.kingdomRaid.lastReset !== today()) {
                player.kingdomRaid = freshRaid()
            }
            const raid = player.kingdomRaid

            const index = parseInt(charIndex, 10) - 1
            if (isNaN(index)) return fail('BAD_INDEX', '❌ اختيار غير صحيح')

            const char = player.characters[index]
            if (!char) return fail('NO_CHAR', '❌ الشخصية غير موجودة', { state: stateOut(raid, player.kingdomTotalEarned) })

            if (raid.usedCharacters.includes(char.name)) {
                return fail('USED', `🔒 ${char.name}\nتم استنزاف هذه الشخصية اليوم`, { state: stateOut(raid, player.kingdomTotalEarned) })
            }

            if (raid.stage >= 10) return fail('DONE', '🏆 أكملت الغزو اليومي', { state: stateOut(raid, player.kingdomTotalEarned) })

            const stage = KINGDOM_STAGES[raid.stage]

            if (char.power < stage.power) {
                return fail('WEAK', '❌ فشل الاقتحام — القوة لا تكفي', {
                    power: char.power, need: stage.power, state: stateOut(raid, player.kingdomTotalEarned)
                })
            }

            // ⚫ بونص رفيق شادو على مال هذي المرحلة بالذات
            const pct = shadowPercent(player)
            const extra = pct > 0 ? Math.floor(stage.reward * pct / 100) : 0
            const total = stage.reward + extra

            await player.addMoney(total)

            // 🏦 إجمالي مدى الحياة (يبدأ من أرباح اليوم الحالية للاعبين القدامى)
            player.kingdomTotalEarned = Math.max(player.kingdomTotalEarned || 0, raid.totalEarned || 0) + total
            raid.totalEarned = (raid.totalEarned || 0) + total
            raid.usedCharacters.push(char.name)
            raid.stage++

            player.kingdomTotalStages = (player.kingdomTotalStages || 0) + 1
            player.markModified('kingdomRaid')
            addCommandXp(player, xpPerStage)

            await player.save()

            // الإنجاز يُرسل لخاص اللاعب (فشله لا يكسر الغزو)
            try {
                const sock = getSock && getSock()
                const jid = sock && getNotifyJid ? await getNotifyJid(userId) : null
                if (sock && jid) await checkAndGrantAchievement(player, 'kingdom', player.kingdomTotalStages, sock, jid)
            } catch (e) { console.error('kingdom achievement error:', e) }

            return {
                ok: true,
                name: char.name,
                reward: stage.reward,
                extra,
                total,
                state: stateOut(player.kingdomRaid, player.kingdomTotalEarned)
            }
        } catch (err) {
            console.error('kingdom attack error:', err)
            return fail('SERVER', 'خطأ بالخادم')
        } finally {
            clearTimeout(lockTimer)
            raidLocks.delete(userId)
        }
    }

    return { getState, attack, STAGES: KINGDOM_STAGES }
}

module.exports = { createKingdomRaidSystem, KINGDOM_STAGES }
