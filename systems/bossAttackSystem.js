// =====================================================================
// systems/bossAttackSystem.js
// هجوم الزعيم من الموقع — نفس منطق أمر .هجوم بالواتس (index.js) بالضبط:
// الضرر، المعدات/السلاح/الرفقاء/الوحش، الحرج، قدرات EX، قدرات الزعيم،
// الأتباع، الغضب، الضربة الجماعية، موت الزعيم وتوزيع الجوائز.
//
// الفرق الوحيد: بدل sock.sendMessage للقروب، كل رسالة تتحول إلى "حدث"
// (event) يرجع للموقع. الأحداث العامة (غضب، ضربة جماعية، سقوط، جوائز)
// تتخزن بسجل عام يشوفه كل اللاعبين بالموقع — ولا يُرسل شيء لأي قروب.
//
// يشارك مع أمر الواتس: كولداون 30 ثانية (fastCd + lastBossAttack بقاعدة
// البيانات) وحالة الزعيم نفسها (currentBoss).
// =====================================================================

// ═══════════════════════════════════════════════════════════
// 👑 جوائز الزعيم العالمي — مصدر واحد (عدّل الأرقام هنا فقط)
// التوزيع الفعلي + رسالة النتائج + .جوائز + .زعيم كلها تقرأ من هنا تلقائياً
// boxes: مفتاح الصندوق بقاعدة البيانات : العدد
// ═══════════════════════════════════════════════════════════
const BOSS_REWARDS = {
    first:  { money: 1000000, xp: 1000, boxes: { sss_chance: 1, sss_high: 1 } },
    second: { money: 700000,  xp: 500,  boxes: { sss_high: 1, legendary: 1 } },
    third:  { money: 500000,  xp: 500,  boxes: { legendary: 1, epic: 1 } },
    rest:   { money: 300000,  xp: 500,  boxes: { epic: 2 } },        // بقية المشاركين
    killer: { money: 0,       xp: 0,    boxes: { sss_high: 1 } }     // الضربة القاضية (إضافي)
}
const BOSS_BOX_LABELS = {
    sss_chance: 'SSS Chance Box',
    sss_high: 'SSS High Box',
    legendary: 'Legendary Box',
    epic: 'Epic Box'
}
function bossBoxLabel(key) { return BOSS_BOX_LABELS[key] || key }
function bossFmt(n) { return Number(n || 0).toLocaleString('en') }
// يضيف صناديق الجائزة للاعب
function bossGiveBoxes(player, boxes) {
    player.boxes = player.boxes || {}
    for (const [k, n] of Object.entries(boxes || {})) {
        player.boxes[k] = (player.boxes[k] || 0) + n
    }
}
// أسطر نصية: "📦 1 SSS Chance Box"
function bossBoxLines(boxes) {
    return Object.entries(boxes || {}).map(([k, n]) => `📦 ${n} ${bossBoxLabel(k)}`)
}
// قائمة نصية للموقع: ['1 SSS Chance Box', ...]
function bossBoxList(boxes) {
    return Object.entries(boxes || {}).map(([k, n]) => `${n} ${bossBoxLabel(k)}`)
}
// نص مختصر لأمر .زعيم
function bossRewardsShortText() {
    const R = BOSS_REWARDS
    const blk = r => `${bossFmt(r.money)} مال\n${bossFmt(r.xp)} XP\n` + Object.entries(r.boxes).map(([k, n]) => `${n} ${bossBoxLabel(k)}`).join('\n')
    return `🥇 الأول:\n${blk(R.first)}\n\n🥈 الثاني:\n${blk(R.second)}\n\n🥉 الثالث:\n${blk(R.third)}\n\n🎖️ بقية المشاركين:\n${blk(R.rest)}\n\n☠️ الضربة القاضية:\n${bossBoxList(R.killer.boxes).join('\n')} إضافي`
}
// نص كامل لأمر .جوائز
function bossRewardsFullText() {
    const R = BOSS_REWARDS
    const blk = r => `💰 ${bossFmt(r.money)} مال\n⭐ ${bossFmt(r.xp)} XP\n` + bossBoxLines(r.boxes).join('\n')
    const sep = '\n\n━━━━━━━━━━━━━━━━━━\n\n'
    return `🏆 جوائز الزعيم العالمي 🏆\n\n🥇 المركز الأول\n\n${blk(R.first)}${sep}🥈 المركز الثاني\n\n${blk(R.second)}${sep}🥉 المركز الثالث\n\n${blk(R.third)}${sep}🎖️ بقية المشاركين\n\n${blk(R.rest)}${sep}☠️ الضربة القاضية\n\n🎁 ${bossBoxList(R.killer.boxes).join(' + ')} إضافي${sep}⚔️ يتم تحديد الفائزين حسب\nإجمالي الضرر المسبب للزعيم\n\n📊 استخدم .زعيم لمعرفة الزعيم الحالي`
}

const COOLDOWN_MS = 30000

// 👹 قوة قدرات/بونصات "ضرر الزعيم" مقارنة بالهجوم: 1 = نفس الهجوم، 1.5 = كل +50% ضرر زعيم تعمل كأنها +75%
// (تطبق على هجوم الزعيم بالموقع فقط — عدّل الرقم لتغيير قوتها)
const BOSS_DAMAGE_EFFECT = 1.5

// ⚔️ وزن "هجوم EX" على الزعيم بالموقع: 1 = كامل، 0.5 = نصف قوته (عشان ضرر الزعيم يبقى أقوى من الهجوم)
const BOSS_EX_ATTACK_WEIGHT = 0.5
const RESPAWN_MS = 5 * 60 * 1000

// 🔥 رفيق بليز: الكولداون يختلف لكل لاعب — نحفظ آخر كولداون محسوب لكل لاعب
// بكاش مشترك مع الواتس (يُخزَّن على نفس Map الـ fastCd عشان index.js يقرأه)
function getCdCache(fastCd) {
    if (!fastCd.cdByUser) fastCd.cdByUser = new Map()
    return fastCd.cdByUser
}

// 🥊 يضيف ضرر ناكلز المرتد (اللي ما انحسب بعد) إلى ضرر اللاعب: ضرر الزعيم الحالي + الإجمالي + اليومي
// (يعتمد عليه الترتيب وتوزيع الجوائز). يُستدعى قبل كل حفظ، ولا يحسب نفس الضرر مرتين.
function creditKnucklesDamage(player) {
    const total = Number(player._knucklesReflectTotal) || 0
    const add = total - (Number(player._knucklesCredited) || 0)
    if (add <= 0) return 0
    player.bossDamage = (player.bossDamage || 0) + add
    player.totalBossDamage = (player.totalBossDamage || 0) + add
    player.dailyBossDamage = (player.dailyBossDamage || 0) + add
    player._knucklesCredited = total
    return add
}

// 🥊 رفيق ناكلز: يعكس على الزعيم نسبة من الضرر اللي ضربك به (يُنفَّذ بكل مصدر ضرر من الزعيم عليك)
function applyKnucklesReflect(companionsData, player, boss, damageTaken) {
    const reflected = companionsData.getKnucklesReflect(player, damageTaken)
    if (!reflected || !boss) return 0
    boss.hp = Math.max(0, (Number(boss.hp) || 0) - reflected)
    // لو فيه أتباع نشطين الزعيم ما ينقتل بالانعكاس (القتل يمر بمسار الهجوم المباشر فقط)
    if (boss.hp <= 0 && boss.activeFollowers && boss.activeFollowers.length > 0) boss.hp = 1
    player._knucklesReflectTotal = (player._knucklesReflectTotal || 0) + reflected
    return reflected
}

function createBossAttackSystem(deps) {
    const {
        Player, Boss, getBoss, setBoss, fastCd,
        equipmentSystem, getWeaponBonusForCharacter, companionsData,
        rollCrit, useEXAbilities, useAttackAbilities, applyCatBonus,
        bumpWeekly, getSaudiDate, resetDailyMissions, checkAndGrantAchievement,
        worlds, isBanned, getSock, getNotifyJid, isAttackOpen, closeWindow,
        xp = {}, allowResummonFollowers = false
    } = deps
    const cdByUser = getCdCache(fastCd)

    const XP_DIVISOR = xp.divisor ?? 1000
    const XP_MIN = xp.min ?? 5
    const XP_CAP = xp.cap ?? 1000
    const FOLLOWER_DROP_XP = xp.followerDrop ?? 100

    // ───────────── السجل العام (يشوفه كل اللاعبين بالموقع) ─────────────
    const feed = []
    let feedSeq = 0
    let lastResults = null

    // 📡 مشتركو البث المباشر (SSE من الموقع) — يستلمون كل حدث عام لحظة حدوثه
    const subs = new Set()
    function notifySubs(ev) {
        subs.forEach(fn => { try { fn(ev) } catch (_) {} })
    }
    function subscribe(fn) {
        subs.add(fn)
        return () => subs.delete(fn)
    }

    function pushPublic(ev) {
        ev.id = ++feedSeq
        ev.t = Date.now()
        feed.push(ev)
        if (feed.length > 40) feed.shift()
        notifySubs(ev)
        return ev
    }

    // 🗡️ ضربات الأتباع: سجل منفصل حتى ما تزاحم أحداث الزعيم المهمة بسجل الـ40
    const hitFeed = []
    function pushHit(ev) {
        ev.id = ++feedSeq
        ev.t = Date.now()
        hitFeed.push(ev)
        if (hitFeed.length > 60) hitFeed.shift()
        notifySubs(ev)
        return ev
    }

    // 💾 كتابة الزعيم للقاعدة مجمّعة (مرة كل ~0.8ث) بدل كل ضربة
    let _pTimer = null
    function persistBossSoon() {
        if (_pTimer) return
        const ref = getBoss()
        _pTimer = setTimeout(async () => {
            _pTimer = null
            const b = getBoss()
            if (!b || b !== ref) return // تغيّر الزعيم (رسبن) — لا نكتب فوق الجديد
            try {
                await Boss.updateOne({}, { $set: {
                    hp: b.hp, attack: b.attack, enraged: b.enraged,
                    activeFollowers: b.activeFollowers, followersDefeated: !!b.followersDefeated,
                    groupAttackCount: b.groupAttackCount, killer: b.killer, finished: b.finished
                } })
            } catch (e) { console.log('boss persist error:', e?.message || e) }
        }, 800)
    }

    // 📡 بث دم الزعيم والأتباع مباشرة لكل المتصفحات (بحد أقصى مرة كل 0.7ث) بدل ما كل متصفح يستطلع
    let _hpLast = 0, _hpTimer = null
    function broadcastHp() {
        if (_hpTimer) return
        _hpTimer = setTimeout(() => {
            _hpTimer = null; _hpLast = Date.now()
            const b = getBoss(); if (!b) return
            notifySubs({
                type: 'hp', hp: Math.max(0, Number(b.hp) || 0), maxHp: Number(b.maxHp) || 0,
                enraged: !!b.enraged,
                followers: followersView(b).map(f => ({ name: f.name, hp: f.hp, image: f.image }))
            })
        }, Math.max(0, 700 - (Date.now() - _hpLast)))
    }

    function getFeed(sinceId = 0) {
        return feed.concat(hitFeed).filter(e => e.id > sinceId).sort((a, b) => a.id - b.id)
    }
    function latestFeedId() { return feedSeq }
    function getLastResults() { return lastResults }

    const nameOf = p => p.username || p.name || String(p.userId || '').split('@')[0]

    // ───────────── أدوات عرض (نفس نص رسالة الواتس) ─────────────
    function gearLines(bonus) {
        const lines = []
        if (bonus.attack) lines.push(`⚔️ هجوم +${bonus.attack}`)
        if (bonus.attackPercent) lines.push(`⚔️ هجوم +${bonus.attackPercent}%`)
        if (bonus.defense) lines.push(`🛡️ دفاع +${bonus.defense}`)
        if (bonus.defensePercent) lines.push(`🛡️ دفاع +${bonus.defensePercent}%`)
        if (bonus.hp) lines.push(`❤️ HP +${bonus.hp}`)
        if (bonus.hpPercent) lines.push(`❤️ HP +${bonus.hpPercent}%`)
        if (bonus.critRate) lines.push(`🎯 حرج +${bonus.critRate}%`)
        if (bonus.critDamage) lines.push(`💥 ضرر حرج +${bonus.critDamage}%`)
        if (bonus.dodge) lines.push(`👻 مراوغة +${bonus.dodge}%`)
        if (bonus.accuracy) lines.push(`🎯 دقة +${bonus.accuracy}%`)
        if (bonus.shield) lines.push(`🛡️ درع +${bonus.shield}`)
        if (bonus.lifesteal) lines.push(`🩸 امتصاص حياة +${bonus.lifesteal}%`)
        if (bonus.reflect) lines.push(`🪞 عكس ضرر +${bonus.reflect}%`)
        if (bonus.bossDamage) lines.push(`👹 ضرر الزعيم +${bonus.bossDamage}%`)
        return lines
    }

    // ───────────── حالة الصفحة ─────────────
    // 🖼️ صورة التابع دائماً من bosses.js (آخر نسخة) — الزعيم الحالي مخزّن بقاعدة البيانات
    // بروابط وقت ظهوره، فلو غيّرت الروابط ما تتحدّث عليه إلا بعد زعيم جديد
    let _bossesList = null
    function latestFollowerImage(boss, f) {
        try {
            if (!_bossesList) _bossesList = require('../bosses')
            const b = _bossesList.find(x => x.name === boss.name)
            const ff = b && (b.followers || []).find(x => x.name === f.name)
            if (ff && ff.image) return ff.image
        } catch (_) {}
        return (f && f.image) || null
    }

    function followersView(boss) {
        return (boss.activeFollowers || []).map(f => ({
            name: f.name, hp: Math.max(0, Number(f.hp) || 0), image: latestFollowerImage(boss, f)
        }))
    }

    // ───────────── 🏆 ترتيب الضرر على الزعيم الحالي (أعلى 10) ─────────────
    // يقرأ bossDamage من قاعدة البيانات مباشرة، فيشمل هجمات الواتس والموقع معاً.
    // كاش قصير (1.5 ث) مشترك بين كل اللاعبين عشان استطلاع الصفحات كل ثواني ما يضغط القاعدة،
    // ويُصفَّر فوراً عند أي هجوم من الموقع عشان ضرر المهاجم يظهر بدون تأخير.
    const BOARD_LIMIT = 10
    const BOARD_ACTIVE_MS = 90 * 1000
    const BOARD_TTL_MS = 3000   // كانت 1500
    let _boardCache = { at: 0, top: [], online: 0, crowd: [] }

    function invalidateBoard() { _boardCache.at = 0 }

    async function loadBoardBase() {
        const now = Date.now()
        if (_boardCache.at && now - _boardCache.at < BOARD_TTL_MS) return _boardCache
        const [top, online, crowd] = await Promise.all([
            Player.find(
                { bossDamage: { $gt: 0 } },
                {
                    userId: 1, name: 1, username: 1, bossDamage: 1, bossHits: 1,
                    lastBossAttack: 1, characters: { $slice: 1 }
                }
            ).sort({ bossDamage: -1 }).limit(BOARD_LIMIT).lean(),
            Player.countDocuments({ lastBossAttack: { $gte: now - BOARD_ACTIVE_MS } }),
            Player.find(
                { lastBossAttack: { $gte: now - BOARD_ACTIVE_MS } },
                { userId: 1, name: 1, username: 1, bossDamage: 1, characters: { $slice: 1 } }
            ).sort({ lastBossAttack: -1 }).limit(BOARD_LIMIT).lean()
        ])
        _boardCache = { at: now, top, online, crowd }
        return _boardCache
    }

    async function getBoard(userId, me) {
        try {
            const base = await loadBoardBase()
            const now = Date.now()

            const rows = base.top.map(p => ({
                userId: p.userId,
                name: nameOf(p),
                damage: Number(p.bossDamage) || 0,
                hits: Number(p.bossHits) || 0,
                active: !!p.lastBossAttack && now - Number(p.lastBossAttack) < BOARD_ACTIVE_MS,
                isMe: p.userId === userId,
                first: (p.characters && p.characters[0]) || null
            }))

            let myRank = null
            const idx = rows.findIndex(r => r.isMe)
            if (idx !== -1) {
                myRank = idx + 1
            } else if (me && (Number(me.bossDamage) || 0) > 0) {
                // خارج أعلى 10: نحسب ترتيبه الحقيقي
                const ahead = await Player.countDocuments({ bossDamage: { $gt: Number(me.bossDamage) } })
                myRank = ahead + 1
            }

            // 👥 المتصلون الآن (يهاجمون خلال آخر 90 ثانية) — يظهرون لكل اللاعبين بساحة الزعيم
            const crowd = (base.crowd || []).map(p => ({
                userId: p.userId, name: nameOf(p), damage: Number(p.bossDamage) || 0,
                isMe: p.userId === userId, first: (p.characters && p.characters[0]) || null
            }))

            return { online: base.online, myRank, rows, crowd }
        } catch (err) {
            console.error('boss board error:', err)
            return { online: 0, myRank: null, rows: [], crowd: [] }
        }
    }

    // lite = استطلاع الصفحة كل ثواني: بدون قائمة الشخصيات (الصفحة تحتفظ بقائمتها) → قراءة أخف بكثير
    async function getState(userId, opts = {}) {
        const lite = !!opts.lite
        const boss = getBoss()
        const me = await Player.findOne({ userId })
            .select('userId name username ' + (lite ? '' : 'characters ') + 'companion bossHp bossMaxHp bossDead bossRespawn lastBossAttack bossDamage bossHits') // 🔥 companion مطلوب لحساب تخفيض بليز
            .lean()
        if (!me) return null

        const now = Date.now()

        // 🔊 وقت أول هجوم على الزعيم (لصوت الزعيم رقم 1 بالموقع):
        // لو شفنا الزعيم كامل الدم ثم نزل، نسجّل وقت أول نزول (يغطي هجوم الواتس أيضاً)
        if (boss) {
            const _hp = Number(boss.hp) || 0, _mx = Number(boss.maxHp) || 0
            if (_hp >= _mx) boss._sawFull = true
            else if (boss._sawFull && !boss.firstHitAt) boss.firstHitAt = now
        }
        const last = Math.max(Number(me.lastBossAttack) || 0, fastCd.get(userId) || 0)
        const myCdMs = companionsData.getBossCooldownMs(me, COOLDOWN_MS) // 🔥 بليز
        cdByUser.set(userId, myCdMs)
        const cdLeft = Math.max(0, myCdMs - (now - last))

        let deadLeftMs = 0
        if (me.bossDead) {
            const respawn = me.bossRespawn ? new Date(me.bossRespawn).getTime() : 0
            deadLeftMs = Math.max(0, respawn - now)
        }

        const board = await getBoard(userId, me)

        return {
            open: !!isAttackOpen(),
            boss: boss ? {
                name: boss.name,
                image: boss.image || null,
                hp: Math.max(0, Number(boss.hp) || 0),
                maxHp: Number(boss.maxHp) || 0,
                enraged: !!boss.enraged,
                finished: !!boss.finished || (Number(boss.hp) || 0) <= 0,
                // ⏳ كم باقي على ظهور الزعيم القادم (null = غير معروف)
                respawnInMs: (!!boss.finished || (Number(boss.hp) || 0) <= 0) && boss.respawnAt
                    ? Math.max(0, new Date(boss.respawnAt).getTime() - now)
                    : null,
                followers: followersView(boss),
                // كم مضى على أول هجوم (null = غير معروف)
                firstHitAgoMs: boss.firstHitAt ? Math.max(0, now - boss.firstHitAt) : null
            } : null,
            me: {
                hp: me.bossHp || me.bossMaxHp || 0,
                maxHp: me.bossMaxHp || 0,
                dead: !!me.bossDead && deadLeftMs > 0,
                deadLeftMs,
                damage: me.bossDamage || 0,
                hits: me.bossHits || 0
            },
            cooldownMs: cdLeft,
            cooldownTotalMs: myCdMs,
            board,
            ...(lite ? {} : {
                characters: (me.characters || []).map((c, i) => ({
                    index: i + 1, name: c.name, rarity: c.rarity, power: c.power || 0,
                    evolutionLevel: c.evolutionLevel || 0, image: c.image || null,
                    customImage: c.customImage || null, form: c.form, anime: c.anime
                }))
            })
        }
    }

    // ───────────── توزيع الجوائز (نفس distributeBossRewards بالواتس) ─────────────
    async function grantRewards(boss) {
        const rewardLog = require('./rewardLog')

        // نفس الحقول المستبعدة في attack() — ذاكرة أقل ولا تمس هوكات المستوى/المهام/الإنجازات
        const players = await Player.find({ bossDamage: { $gt: 0 } })
            .select('-giftInbox -giftLog -giftOpKeys -galleryLikes -gallery -domainTeams -inventory')
        const killerId = boss?.killer

        if (!players.length) return null

        players.sort((a, b) => (b.bossDamage || 0) - (a.bossDamage || 0))

        const entries = new Array(players.length)
        let killerEntry = null

        const grantOne = async (p, i) => {
            p.boxes = p.boxes || {}
            const isKiller = p.userId === killerId
            const R = i === 0 ? BOSS_REWARDS.first
                : i === 1 ? BOSS_REWARDS.second
                : i === 2 ? BOSS_REWARDS.third
                : BOSS_REWARDS.rest
            const money = applyCatBonus(p, R.money)
            const xpGain = R.xp
            bossGiveBoxes(p, R.boxes)
            const boxes = bossBoxList(R.boxes)

            // 🗡️ صندوق الضربة القاضية يُضاف بنفس الحفظ (حفظ واحد للقاتل بدل اثنين)
            if (isKiller) bossGiveBoxes(p, BOSS_REWARDS.killer.boxes)

            p.money = (p.money || 0) + money
            p.xp = (p.xp || 0) + xpGain
            await p.save()

            // 🎁 سجل الجوائز بالموقع
            rewardLog.logReward(p.userId, {
                src: `الزعيم — المركز ${i + 1}`,
                icon: ['👑', '🥈', '🥉'][i] || '🏅',
                lines: [`💰 ${bossFmt(money)} مال`, `⭐ ${bossFmt(xpGain)} XP`, ...boxes.map(b => `📦 ${b}`)]
            })

            if (isKiller) {
                rewardLog.logReward(p.userId, { src: 'الزعيم — الضربة القاضية', icon: '🗡️', lines: bossBoxLines(BOSS_REWARDS.killer.boxes).map(l => l + ' إضافي') })
                killerEntry = { userId: p.userId, name: nameOf(p), boxes: bossBoxList(BOSS_REWARDS.killer.boxes).map(b => b + ' إضافي') }
            }

            entries[i] = {
                rank: i + 1, userId: p.userId, name: nameOf(p),
                damage: p.bossDamage || 0, money, xp: xpGain, boxes
            }
        }

        // ⚡ دفعات متوازية صغيرة بدل لاعب بعد لاعب (كل لاعب مستند مستقل، والهوكات آمنة)
        const BATCH = 15
        for (let s = 0; s < players.length; s += BATCH) {
            await Promise.all(players.slice(s, s + BATCH).map((p, k) => grantOne(p, s + k)))
        }

        // ⚡ تصفير الضرر لمن شارك فقط (نفس النتيجة بكتابة أقل)
        await Player.updateMany(
            { $or: [{ bossDamage: { $gt: 0 } }, { bossHits: { $gt: 0 } }] },
            { $set: { bossDamage: 0, bossHits: 0 } }
        )

        return {
            bossName: boss?.name || '',
            bossImage: boss?.image || null,
            entries,
            killer: killerEntry,
            at: Date.now()
        }
    }

    // يُستدعى من distributeBossRewards بالواتس أيضاً — عشان نتائج الزعيم تظهر بالموقع
    // حتى لو سقط الزعيم من الواتس (بدون أي إرسال إضافي).
    function recordResults(results) {
        if (!results) return
        lastResults = results
        pushPublic({ type: 'results', results })
    }

    // ───────────── الهجوم ─────────────
    async function attack({ userId, charIndex }) {
        const events = []
        const emit = (ev, isPublic) => {
            if (isPublic) pushPublic(ev)
            events.push(ev)
            return ev
        }
        const fail = (code, message, extra = {}) => {
            if (code !== 'COOLDOWN') fastCd.delete(userId) // الفشل لا يستهلك الكولداون
            return { ok: false, code, message, ...extra }
        }

        try {
            if (isBanned && isBanned(userId)) return fail('BANNED', '❌ حسابك محظور.')

            // 🌐 الهجوم من الموقع ما يعتمد على اتصال الواتساب: لو الـ sock غير متاح نستخدم بديل صامت
            // (الإنجازات/نقاط العالم تظهر بالموقع عبر siteNotify، وإرسال الواتساب يُتجاهل)
            // 🔕 الإشعارات (إنجازات/نقاط عالم) تظهر بالموقع فقط — نمرّر sock صامت فلا يُرسل شيء للواتساب
            const sock = { sendMessage: async () => {} }

            if (!isAttackOpen()) {
                return fail('CLOSED', '🔴 باب الهجوم مغلق الآن — يفتح رأس كل ساعة.')
            }

            // 🤫 كولداون 30 ثانية (كاش بالذاكرة مشترك مع الواتس)
            const nowT = Date.now()
            const lastFast = fastCd.get(userId) || 0
            const cachedCd = cdByUser.get(userId) || COOLDOWN_MS // 🔥 بليز: آخر كولداون محسوب للاعب
            if (nowT - lastFast < cachedCd) {
                return fail('COOLDOWN', 'cooldown', { retryInMs: cachedCd - (nowT - lastFast) })
            }
            fastCd.set(userId, nowT) // حجز فوري قبل أي await (يمنع الضغطتين المتزامنتين)

            const boss = getBoss()

            if (!boss) return fail('NO_BOSS', '❌ لا يوجد زعيم حالياً')
            if (boss.hp <= 0) return fail('BOSS_DEAD', '❌ تم هزيمة الزعيم بالفعل')

            // ⚡ جلب أخف: نستبعد فقط الحقول الثقيلة التي لا يلمسها الهجوم ولا دوال المستوى/الإنجازات/المهام
            // (صندوق وسجل الهدايا، لايكات/معرض، فرق الدومين، حقيبة الإيكو). باقي الحقول كما هي، والحفظ يكتب المتغيّر فقط.
            const me = await Player.findOne({ userId })
                .select('-giftInbox -giftLog -giftOpKeys -galleryLikes -gallery -domainTeams -inventory')
            if (!me) return fail('NO_ACCOUNT', '❌ لا تملك حساباً، أنشئ حساب أولاً')
            if (!me.characters.length) return fail('NO_CHARS', '❌ لا تملك شخصيات')

            // ===== BOSS HP SYSTEM =====
            if (me.bossDead) {
                const respawn = me.bossRespawn ? new Date(me.bossRespawn).getTime() : 0
                if (Date.now() >= respawn) {
                    me.bossDead = false
                    me.bossHp = Math.floor(me.bossMaxHp / 2)
                    me.bossRespawn = null
                    await me.save()
                } else {
                    const left = Math.ceil((respawn - Date.now()) / 60000)
                    return fail('DEAD', `💀 أنت ميت\n\n⏳ العودة بعد ${left} دقيقة`, { retryInMs: respawn - Date.now() })
                }
            }

            const bossNow = Date.now()

            const myCooldownMs = companionsData.getBossCooldownMs(me, COOLDOWN_MS) // 🔥 بليز
            cdByUser.set(userId, myCooldownMs)

            if (me.lastBossAttack && bossNow - me.lastBossAttack < myCooldownMs) {
                return fail('COOLDOWN', 'cooldown', { retryInMs: myCooldownMs - (bossNow - me.lastBossAttack) })
            }

            fastCd.set(userId, bossNow)
            me.lastBossAttack = bossNow

            // 🔢 اختيار الشخصية بالرقم (نفس ترتيب .شخصياتي) — بدون رقم = رقم 1
            let idx = 1
            if (charIndex !== undefined && charIndex !== null && charIndex !== '') {
                const parsed = parseInt(charIndex, 10)
                if (isNaN(parsed) || parsed < 1 || parsed > me.characters.length) {
                    return fail('BAD_INDEX', '❌ رقم غير صحيح')
                }
                idx = parsed
            }

            const strongest = me.characters[idx - 1]
            const fighter = strongest

            let damage = strongest.power

            const bossEquipBonus = equipmentSystem.calculateEquipmentStats(strongest)
            const bossWeaponBonus = getWeaponBonusForCharacter(me, strongest)

            const combinedGearBonus = {}
            for (const key of new Set([...Object.keys(bossEquipBonus), ...Object.keys(bossWeaponBonus)])) {
                combinedGearBonus[key] = (bossEquipBonus[key] || 0) + (bossWeaponBonus[key] || 0)
            }

            damage += (combinedGearBonus.attack || 0)

            if ((combinedGearBonus.attackPercent || 0) > 0) {
                damage = Math.floor(damage * (1 + combinedGearBonus.attackPercent / 100))
            }

            // 🐯 رفيق النمر
            let tigerCritBonus = 0
            if (me.companion && me.companion.key === 'tiger' && (me.companion.level || 0) >= 1) {
                tigerCritBonus = companionsData.getCompanionBonus('tiger', me.companion.level)
            }

            // 🔮 رفيق سيلفر — ضرر كريت إضافي
            const silverCritBonus = companionsData.getSilverCritDamage(me)

            // 🎯 كريت موحّد (مثل Wuthering Waves): رمية واحدة بمجموع نسبة الكريت من كل المصادر
            // (معدات/سلاح + نمر + قدرات EX) وضرر الكريت = مجموع ضرر المعدات + EX.
            // الفايض فوق 100% يتحول ضرر كريت إضافي (داخل rollCrit).
            const hasEXAbilities = !!(
                strongest.evolutionLevel >= 1 &&
                strongest.urAbilities &&
                strongest.urAbilities.length > 0
            )
            const exEarly = hasEXAbilities ? useEXAbilities(strongest) : null

            const totalCrit = rollCrit(
                (combinedGearBonus.critRate || 0) + tigerCritBonus + (exEarly ? exEarly.critRate : 0),
                (combinedGearBonus.critDamage || 0) + silverCritBonus + (exEarly ? exEarly.critDamage : 0)
            )

            let bossHitWasCrit = false
            if (totalCrit.isCrit) {
                damage = Math.floor(damage * totalCrit.multiplier)
                bossHitWasCrit = true
            }

            // 🐻 رفيق الدب
            let bearMaxHp = me.maxHp || 10000
            let bearHpBonus = 0
            if (me.companion && me.companion.key === 'bear' && (me.companion.level || 0) >= 1) {
                bearHpBonus = companionsData.getCompanionBonus('bear', me.companion.level)
                bearMaxHp = Math.floor(bearMaxHp * (1 + bearHpBonus / 100))
            }

            // 🦁 رفيق الأسد
            let lionBossDamageBonus = 0
            if (me.companion && me.companion.key === 'lion' && (me.companion.level || 0) >= 1) {
                lionBossDamageBonus = companionsData.getCompanionBonus('lion', me.companion.level)
                damage = Math.floor(damage * (1 + (lionBossDamageBonus / 100)))
            }

            // ❤️ امتصاص الحياة
            let realLifestealHeal = 0
            let lifestealText = ''

            if ((combinedGearBonus.lifesteal || 0) > 0) {
                const equipHeal = Math.floor(damage * (combinedGearBonus.lifesteal || 0) / 100)
                me.hp = Math.min(bearMaxHp, (me.hp || 10000) + equipHeal)
                realLifestealHeal += equipHeal
                lifestealText += `🛡️ امتصاص حياة المعدات/السلاح +${combinedGearBonus.lifesteal}%\n`
            }

            let abilityText = ''
            let exSkillsText = ''
            let playerSkillsText = ''

            let ex = null

            if (hasEXAbilities) {
                ex = exEarly

                damage = Math.floor(damage * (1 + (ex.attackBonus * BOSS_EX_ATTACK_WEIGHT) / 100))
                damage = Math.floor(damage * (1 + (ex.bossDamage * BOSS_DAMAGE_EFFECT) / 100))

                damage = Math.floor(damage * (1 + ((me.attackBonus || 0) / 100)))

                damage = Math.floor(
                    damage * (1 + ((((me.bossDamageBonus || 0) + (combinedGearBonus.bossDamage || 0)) * BOSS_DAMAGE_EFFECT) / 100))
                )

                damage = Math.floor(damage * (1 + ((me.damageBonus || 0) / 100)))

                if (ex.lifesteal > 0) {
                    const heal = Math.floor(damage * ex.lifesteal / 100)
                    me.hp = Math.min(me.maxHp || 10000, (me.hp || 10000) + heal)
                    realLifestealHeal += heal
                    lifestealText += `⚔️ امتصاص حياة قدرات الشخصية +${ex.lifesteal}%\n`
                }

                me.urShield = ex.shield
                me.urReflect = ex.reflect
                me.urDodge = ex.dodge

                for (const ability of (ex.abilitiesUsed || [])) {
                    exSkillsText += `⚔️ ${ability.name}\n`
                }
            }

            // 📖 بونص كتاب المجموعة: هجوم على الزعيم (Bleach / Kingdom) — يشمل كل الشخصيات
            try { damage = Math.floor(damage * require('./siteCodexBook').bonusMult(me.userId, 'boss')) } catch (e) {}

            const result = useAttackAbilities({ player: me, character: strongest, damage })
            damage = result.damage
            playerSkillsText = (playerSkillsText || '') + (result.playerText || '')

            boss.turnCounter = (boss.turnCounter || 0) + 1

            // ───────────── قدرة الزعيم الخاصة (كل 4 أدوار، 60%) ─────────────
            if (boss.turnCounter % 4 === 0 && Math.random() <= 0.60) {

                const ability = boss.abilities[Math.floor(Math.random() * boss.abilities.length)]

                emit({
                    type: 'ability', anim: 'ability', title: `👑 ${boss.name}`,
                    lines: ['✨ فعل القدرة الخاصة', `⚡ ${ability.name}`, `📖 ${ability.description}`]
                })

                const hitMe = (title, lines, amount) => {
                    me.bossHp = Math.max(0, (me.bossHp || me.bossMaxHp) - amount)
                    applyKnucklesReflect(companionsData, me, boss, amount) // 🥊 ناكلز
                    emit({ type: 'fx', anim: 'hit_me', title, lines: [`👑 ${boss.name}`, ...lines], amount })
                }
                const note = (title, lines, anim = 'debuff') =>
                    emit({ type: 'fx', anim, title, lines: [`👑 ${boss.name}`, ...lines] })

                if (ability.effect === 'heal') boss.hp += 5000
                if (ability.effect === 'bigHeal') boss.hp += 10000

                if (boss.hp > boss.maxHp) boss.hp = boss.maxHp

                if (ability.effect === 'halfDamage') damage = Math.floor(damage / 2)
                if (ability.effect === 'dodge') damage = 0
                if (ability.effect === 'reduceDamage') damage = Math.floor(damage * 0.7)

                if (ability.effect === 'megaAttack') {
                    hitMe('💀 ضربة الإبادة', [`💥 ألحق بك 5000 ضرر إضافي!`], 5000)
                }

                if (ability.effect === 'lifesteal') {
                    boss.hp = Math.min(boss.maxHp, boss.hp + 8000)
                    note('🩸 امتصاص الحياة', ['❤️ استعاد 8000 HP'], 'buff')
                }

                if (ability.effect === 'summon') {
                    if (
                        (!boss.activeFollowers || boss.activeFollowers.length === 0) &&
                        (allowResummonFollowers || !boss.followersDefeated)
                    ) {
                        boss.activeFollowers = JSON.parse(JSON.stringify(boss.followers || []))
                        note('👥 استدعاء الأتباع', ['⚔️ استدعى جميع أتباعه إلى المعركة!'], 'buff')
                    }
                }

                if (ability.effect === 'storm') hitMe('🌪️ عاصفة الدمار', ['💥 أصابتك العاصفة', '❤️ -3000 HP'], 3000)

                if (ability.effect === 'curse') {
                    damage = Math.floor(damage * 0.5)
                    note('☠️ اللعنة المظلمة', ['📉 تم تخفيض ضررك 50%'])
                }

                if (ability.effect === 'reflect') {
                    const reflected = Math.floor(damage * 0.30)
                    hitMe('🪞 انعكاس الضرر', [`💥 ارتد إليك ${reflected} ضرر`], reflected)
                }

                if (ability.effect === 'burn') hitMe('🔥 لهيب الجحيم', ['❤️ -2000 HP'], 2000)

                if (ability.effect === 'lightning') hitMe('⚡ صاعقة الدمار', ['💥 أصابتك صاعقة مدمرة', '❤️ -4000 HP'], 4000)

                if (ability.effect === 'freeze') {
                    damage = Math.floor(damage * 0.75)
                    note('❄️ تجميد الزمن', ['📉 تم تخفيض ضررك 25%'])
                }

                if (ability.effect === 'rage') {
                    boss.attack = Math.floor((boss.attack || 3000) * 1.25)
                    note('😡 غضب الإمبراطور', ['⚔️ زادت قوة هجومه 25%'], 'buff')
                }

                if (ability.effect === 'doubleAttack') {
                    damage = Math.floor(damage * 0.5)
                    note('👁️ عين الخراب', ['🛡️ خفضت ضررك 50%'])
                }

                if (ability.effect === 'worldEclipse') {
                    damage = Math.floor(damage * 0.6)
                    note('🌑 كسوف العالم', ['📉 انخفض الضرر 40%'])
                }

                if (ability.effect === 'demonPower') {
                    boss.attack = Math.floor((boss.attack || 3000) * 1.5)
                    note('👹 قوة الشياطين', ['🔥 زادت قوة هجومه 50%'], 'buff')
                }

                if (ability.effect === 'volcano') hitMe('🌋 ثوران الجحيم', ['💥 انفجار مدمر', '❤️ -6000 HP'], 6000)

                if (ability.effect === 'dimensionCollapse') {
                    hitMe('🌌 انهيار الأبعاد', ['☠️ قدرة أسطورية أصابتك', '❤️ -10000 HP'], 10000)
                }
            }

            if (!boss || typeof boss.hp !== 'number') {
                return fail('BOSS_ERR', '❌ خطأ في بيانات الزعيم')
            }

            if (!damage || isNaN(damage)) damage = 0

            // 🐉 مساعدة الوحش المركب
            let beastAssist = null

            if (me.equippedBeast) {
                const beastsList = require('./beasts')
                const riddenBeast = beastsList.find(b => b.id === me.equippedBeast)

                if (riddenBeast) {
                    const beastPercent =
                        (riddenBeast.attack || 0) + (riddenBeast.defense || 0) +
                        (riddenBeast.hp || 0) + (riddenBeast.crit || 0) +
                        (riddenBeast.dodge || 0) + (riddenBeast.reflect || 0)

                    const attackNumber = (me.bossHits || 0) + 1

                    if (attackNumber % 5 === 0 && beastPercent > 0) {
                        const beastFullDamage = Math.floor(damage * (beastPercent / 100))
                        if (beastFullDamage > 0) {
                            damage += beastFullDamage
                            beastAssist = { name: riddenBeast.name, damage: beastFullDamage }
                        }
                    }
                }
            }

            const xpGain = Math.min(XP_CAP, Math.max(XP_MIN, Math.floor(damage / XP_DIVISOR)))

            // 🐶 رفيق الكلب
            let dogXpGain = xpGain
            if (me.companion && me.companion.key === 'dog' && (me.companion.level || 0) >= 1) {
                const dogBonus = companionsData.getCompanionBonus('dog', me.companion.level)
                dogXpGain = Math.floor(xpGain * (1 + dogBonus / 100))
            }

            me.xp = (me.xp || 0) + dogXpGain

            // ───────────── ملخص الهجوم (نفس أقسام رسالة الواتس) ─────────────
            const companionLines = []
            if (tigerCritBonus) companionLines.push(`🐯 رفيق النمر — حرج +${tigerCritBonus}%`)
            if (silverCritBonus) companionLines.push(`🔮 رفيق سيلفر — ضرر حرج +${silverCritBonus}%`)
            if (bearHpBonus) companionLines.push(`🐻 رفيق الدب — حد أقصى للدم +${bearHpBonus}%`)
            if (lionBossDamageBonus) companionLines.push(`🦁 رفيق الأسد — ضرر الزعيم +${lionBossDamageBonus}%`)

            const buildReport = (kind, extra = {}) => ({
                kind,
                attacker: { name: strongest.name, index: idx, character: fighter },
                bossName: boss.name,
                crit: bossHitWasCrit,
                playerSkills: playerSkillsText ? playerSkillsText.trim().split('\n').filter(Boolean) : [],
                exSkills: exSkillsText.trim() ? exSkillsText.trim().split('\n').filter(Boolean) : [],
                equip: gearLines(bossEquipBonus),
                weapon: gearLines(bossWeaponBonus),
                companion: me._knucklesReflectTotal
                    ? [...companionLines, `🥊 رفيق ناكلز — انعكس على الزعيم ${me._knucklesReflectTotal.toLocaleString()} ضرر`]
                    : companionLines,
                lifesteal: realLifestealHeal > 0
                    ? { lines: lifestealText.trim().split('\n').filter(Boolean), heal: realLifestealHeal }
                    : null,
                damage,
                xp: xpGain,
                beastAssist,
                ...extra
            })

            const snapshot = () => ({
                bossHp: Math.max(0, Number(boss.hp) || 0),
                bossMax: Number(boss.maxHp) || 0,
                myHp: me.bossHp || me.bossMaxHp || 0,
                myMax: me.bossMaxHp || 0,
                enraged: !!boss.enraged,
                respawnInMs: boss.respawnAt
                    ? Math.max(0, new Date(boss.respawnAt).getTime() - Date.now())
                    : null,
                followers: followersView(boss)
            })

            // ───────────── هجوم على تابع ─────────────
            if (boss.activeFollowers && boss.activeFollowers.length > 0) {

                const follower = boss.activeFollowers[0]

                if (follower.ability === 'dodge' && Math.random() <= 0.20) {
                    damage = 0
                    abilityText += `🌀 ${follower.name} — 💨 تفادى الهجمة بالكامل\n`
                }
                if (follower.ability === 'healBoss' && Math.random() <= 0.20) {
                    boss.hp = Math.min(boss.maxHp, boss.hp + 3000)
                    abilityText += `❤️ ${follower.name} — ✨ عالج الزعيم +3000 HP\n`
                }
                if (follower.ability === 'reflect' && Math.random() <= 0.20) {
                    const reflectDamage = Math.floor(damage * 0.30)
                    me.bossHp = Math.max(0, (me.bossHp || me.bossMaxHp) - reflectDamage)
                    applyKnucklesReflect(companionsData, me, boss, reflectDamage) // 🥊 ناكلز
                    abilityText += `⚫ ${follower.name} — 💥 عكس الضرر ❤️ -${reflectDamage} HP\n`
                }
                if (follower.ability === 'bonusDamage' && Math.random() <= 0.20) {
                    me.bossHp = Math.max(0, (me.bossHp || me.bossMaxHp) - 1500)
                    applyKnucklesReflect(companionsData, me, boss, 1500) // 🥊 ناكلز
                    abilityText += `⚔️ ${follower.name} — 💥 هجوم إضافي ❤️ -1500 HP\n`
                }
                if (follower.ability === 'critical' && Math.random() <= 0.20) {
                    me.bossHp = Math.max(0, (me.bossHp || me.bossMaxHp) - 3000)
                    applyKnucklesReflect(companionsData, me, boss, 3000) // 🥊 ناكلز
                    abilityText += `🎯 ${follower.name} — 💥 ضربة حرجة ❤️ -3000 HP\n`
                }

                let followerDamage = damage

                if (
                    strongest.evolutionLevel >= 1 &&
                    strongest.urAbilities &&
                    strongest.urAbilities.length > 0
                ) {
                    followerDamage = Math.floor(followerDamage * (1 + ex.bossDamage / 100))
                }

                follower.hp -= followerDamage

                // 🗡️ حدث عام لكل ضربة على تابع (يشوفه باقي اللاعبين بالموقع كأنيميشن)
                if (followerDamage > 0) {
                    pushHit({
                        type: 'follower_hit', anim: 'follower_hit', by: userId,
                        attacker: nameOf(me), follower: follower.name,
                        amount: followerDamage, crit: !!bossHitWasCrit,
                        dead: follower.hp <= 0
                    })
                }

                if (follower.hp <= 0) {

                    // 🔒 نشيل التابع فوراً (نفس إصلاح السباق بالواتس)
                    const killedFollowerIndex = boss.activeFollowers.indexOf(follower)
                    if (killedFollowerIndex === -1) {
                        return fail('BUSY', '⏳ هجوم متزامن — حاول من جديد.')
                    }

                    boss.activeFollowers.splice(killedFollowerIndex, 1)

                    const allFollowersDead = boss.activeFollowers.length === 0
                    if (allFollowersDead) boss.followersDefeated = true

                    emit({
                        type: 'follower_dead', anim: 'kill', image: latestFollowerImage(boss, follower),
                        title: '💀 تم القضاء على التابع',
                        lines: [`⚔️ ${follower.name}`, '🎉 أصبح الطريق إلى الزعيم أقرب!']
                    }, true)

                    const dropRoll = Math.random() * 100

                    if (dropRoll <= 20) {
                        const followerDrop = applyCatBonus(me, 1000)
                        me.money = (me.money || 0) + followerDrop
                        emit({
                            type: 'drop', anim: 'drop', title: `💰 ${follower.name}`,
                            lines: [`🎁 أسقط ${followerDrop.toLocaleString()} مال`]
                        })
                    } else if (dropRoll <= 35) {
                        me.xp = (me.xp || 0) + FOLLOWER_DROP_XP
                        emit({
                            type: 'drop', anim: 'drop', title: `⭐ ${follower.name}`,
                            lines: [`🎁 أسقط ${FOLLOWER_DROP_XP} XP`]
                        })
                    }

                    if (allFollowersDead) {
                        emit({
                            type: 'followers_cleared', anim: 'info', title: '✅ تم القضاء على جميع الأتباع',
                            lines: ['👑 يمكنكم مهاجمة الزعيم مباشرة الآن!']
                        }, true)
                    }
                }

                await me.save()

                persistBossSoon()
                broadcastHp()

                return {
                    ok: true,
                    kind: 'follower',
                    report: buildReport('follower', {
                        follower: { name: follower.name, remaining: Math.max(0, follower.hp), image: latestFollowerImage(boss, follower) },
                        notes: abilityText.trim() ? abilityText.trim().split('\n') : []
                    }),
                    events,
                    state: snapshot()
                }
            }

            // ───────────── هجوم على الزعيم ─────────────
            // 🔊 أول ضربة على الزعيم: نسجّل وقتها بدقة
            if (!boss.firstHitAt && damage > 0 && (Number(boss.hp) || 0) >= (Number(boss.maxHp) || 0)) boss.firstHitAt = Date.now()
            boss.hp = Math.max(0, (boss.hp || 0) - damage)

            persistBossSoon()

            // 😡 الغضب عند نصف الصحة
            if (!boss.enraged && boss.hp <= boss.maxHp / 2) {

                boss.enraged = true
                boss.attack = Math.floor((boss.attack || 3000) * 1.5)
                boss.activeFollowers = JSON.parse(JSON.stringify(boss.followers || []))
                boss.followersDefeated = false

                emit({
                    type: 'enrage', anim: 'enrage', image: boss.image,
                    title: `😡 ${boss.name}`,
                    lines: [
                        'دخل حالة الغضب!',
                        '👥 استدعى أتباعه:',
                        ...boss.activeFollowers.map(f => `⚔️ ${f.name}`),
                        '🔥 الضرر زاد 50%',
                        '⚔️ احذروا... الزعيم أصبح أخطر!'
                    ]
                }, true)
            }

            if (boss.hp <= 0) {
                boss.hp = 0

                if (!boss.killer) {
                    boss.killer = userId
                    me.dailyLastHits = (me.dailyLastHits || 0) + 1
                }
            }

            me.bossDamage = (me.bossDamage || 0) + damage
            me.totalBossDamage = (me.totalBossDamage || 0) + damage
            me.bossHits = (me.bossHits || 0) + 1
            me.dailyBossDamage = (me.dailyBossDamage || 0) + damage
            creditKnucklesDamage(me) // 🥊 ضرر ناكلز المرتد يدخل بالضرر الكلي
            me.dailyBossHits = (me.dailyBossHits || 0) + 1

            if (me.dailyMissions) {
                const today = getSaudiDate()
                if (me.dailyMissions.lastReset !== today) {
                    await resetDailyMissions(me)
                }
                if (me.dailyMissions.bossKills < 2) {
                    me.dailyMissions.bossKills += 1
                    me.markModified('dailyMissions')
                }
            }

            bumpWeekly(me, 'bossHits', 1)

            await me.save()
            if (Date.now() - _boardCache.at > 1000) invalidateBoard()

            // الإشعارات الجانبية (إنجاز/نقاط عالم) تروح لخاص اللاعب — ولا شيء للقروب
            const notifyJid = null // 🔕 لا إرسال للواتساب — لا حاجة لاستعلام رقم اللاعب

            await checkAndGrantAchievement(me, 'boss', me.totalBossDamage, sock, notifyJid)
            await checkAndGrantAchievement(me, 'wealth', me.totalEarnedMoney, sock, notifyJid)

            const worldPointsText = await worlds.awardAttackPoints(me, sock, notifyJid, me.bossHits)

            boss.groupAttackCount = (boss.groupAttackCount || 0) + 1

            // ───────────── الضربة الجماعية (كل 15 هجمة) ─────────────
            if (boss.groupAttackCount >= 15) {

                boss.groupAttackCount = 0

                const players = await Player.find({
                    bossDead: { $ne: true },
                    bossHits: { $gt: 0 }
                }).select('userId name username bossHp bossMaxHp bossRespawn').lean()

                const raidDamage = Math.floor((boss.attack || 3000) * 1.5)

                const raidRespawn = new Date(Date.now() + RESPAWN_MS)
                const raidOps = players.map(p => {
                    const newHp = Math.max(0, (p.bossHp || p.bossMaxHp) - raidDamage)
                    // مزامنة نسخة اللاعب المهاجم بالذاكرة مع ضرر الضربة الجماعية، عشان
                    // الضربة المرتدة وحفظها بعدها يبنون على الدم الصحيح (ما يضيع ضرر الجماعية)
                    if (String(p._id) === String(me._id)) {
                        me.bossHp = newHp
                        me.bossDead = newHp <= 0
                        me.bossRespawn = newHp <= 0 ? raidRespawn : p.bossRespawn
                    }
                    return {
                        updateOne: {
                            filter: { _id: p._id },
                            update: {
                                $set: {
                                    bossHp: newHp,
                                    bossDead: newHp <= 0,
                                    bossRespawn: newHp <= 0 ? raidRespawn : p.bossRespawn
                                }
                            }
                        }
                    }
                })
                // ⚡ عملية واحدة بدل N عملية منفصلة
                if (raidOps.length) await Player.bulkWrite(raidOps, { ordered: false })

                // أسماء/يوزرات كل من تضرر (بدل المنشن بالقروب)
                emit({
                    type: 'raid', anim: 'raid', image: boss.image,
                    title: `🌋 ${boss.name}`,
                    lines: ['💥 أطلق ضربة جماعية', `⚔️ أصاب ${players.length} مقاتل`, `❤️ الضرر: ${raidDamage}`],
                    amount: raidDamage,
                    targets: players.map(p => ({ userId: p.userId, name: nameOf(p) }))
                }, true)

                if (Math.random() <= 0.85) {

                    let bossDamage = boss.attack || 3000

                    if (me.urShield) {
                        bossDamage = Math.floor(bossDamage * (1 - me.urShield / 100))
                    }

                    if (me.urDodge && Math.random() * 100 <= me.urDodge) {
                        bossDamage = 0
                    }

                    me.bossHp = Math.max(0, (me.bossHp || me.bossMaxHp) - bossDamage)

                    // 🥊 رفيق ناكلز: يرجّع على الزعيم نسبة من الضرر اللي ضربك به
                    applyKnucklesReflect(companionsData, me, boss, bossDamage)

                    if (me.urReflect && bossDamage > 0) {
                        const reflected = Math.floor(bossDamage * me.urReflect / 100)
                        boss.hp = Math.max(0, boss.hp - reflected)
                    }

                    if (me.bossHp <= 0) {

                        me.bossHp = 0
                        me.bossDead = true
                        me.bossRespawn = new Date(Date.now() + RESPAWN_MS)

                        emit({
                            type: 'player_dead', anim: 'player_dead', image: boss.image,
                            title: `💀 ${boss.name} قضى عليك`,
                            lines: ['⏳ ستعود بعد 5 دقائق', '❤️ ستعود بنصف HP']
                        })

                    } else {

                        const attacks = ['🔥 انفجار الجحيم', '⚡ صاعقة الدمار', '💀 قبضة الموت', '🌪️ الإعصار الأسود']
                        const attackName = attacks[Math.floor(Math.random() * attacks.length)]

                        emit({
                            type: 'counter', anim: 'counter', image: boss.image,
                            title: `👑 ${boss.name}`,
                            lines: [
                                attackName,
                                `🎯 استهدف: ${nameOf(me)}`,
                                `💥 الضرر: ${bossDamage}`,
                                `❤️ HP: ${me.bossHp}/${me.bossMaxHp}`
                            ],
                            amount: bossDamage
                        })
                    }
                }

                // 💾 حفظ دم اللاعب/موته بعد الضربة المرتدة (كان يضيع عند إعادة التشغيل)
                creditKnucklesDamage(me) // 🥊 ناكلز من الضربة المرتدة
                try {
                    await me.save()
                } catch (err) {
                    console.log('خطأ حفظ اللاعب بعد الضربة المرتدة (موقع):', err)
                }
            }

            // ───────────── نهاية الزعيم ─────────────
            if (boss.hp <= 0) {

                if (boss.finished) return fail('BUSY', '⏳ الزعيم سقط للتو.')

                boss.finished = true

                // ⏰ وقت الرسبن = رأس الساعة القادمة — نكتبه فورًا مع finished
                // (قبل توزيع الجوائز) عشان حلقة الرسبن ما تلقى finished بدون respawnAt وتسبّن زعيم جديد فورًا
                const earlyNextHour = new Date()
                earlyNextHour.setMinutes(0, 0, 0)
                earlyNextHour.setHours(earlyNextHour.getHours() + 1)
                boss.respawnAt = earlyNextHour.getTime()

                try {
                    await Boss.updateOne({}, { $set: { finished: true, hp: 0, respawnAt: boss.respawnAt } })
                } catch (err) {
                    console.log('خطأ حفظ finished فورًا عند موت الزعيم (موقع):', err)
                }

                try {
                    const results = await grantRewards(boss)

                    boss.hp = 0
                    boss.finished = true

                    const nextHour = new Date()
                    nextHour.setMinutes(0)
                    nextHour.setSeconds(0)
                    nextHour.setMilliseconds(0)
                    nextHour.setHours(nextHour.getHours() + 1)

                    boss.respawnAt = nextHour.getTime()

                    await me.save()

                    await Boss.updateOne({}, {
                        $set: {
                            hp: boss.hp,
                            attack: boss.attack,
                            enraged: boss.enraged,
                            activeFollowers: boss.activeFollowers,
                            groupAttackCount: boss.groupAttackCount,
                            killer: boss.killer,
                            finished: boss.finished,
                            respawnAt: boss.respawnAt
                        }
                    })

                    // 🔴 إغلاق باب الهجوم فورًا لجميع اللاعبين بمجرد سقوط الزعيم
                    try { if (closeWindow) closeWindow() } catch (_) {}

                    emit({
                        type: 'boss_dead', anim: 'boss_dead', image: boss.image,
                        title: '👑 تم هزيمة الزعيم!',
                        lines: [worldPointsText || ''].filter(Boolean)
                    }, true)

                    if (results) {
                        lastResults = results
                        emit({ type: 'results', results }, true)
                    }

                    broadcastHp()
                    return {
                        ok: true, kind: 'kill',
                        report: buildReport('kill', { worldPoints: worldPointsText || '' }),
                        events, state: snapshot(), results
                    }

                } catch (e) {
                    console.log('Boss reward error (موقع):', e)
                    setBoss(null)
                    return fail('SERVER', '❌ حدث خطأ أثناء توزيع الجوائز')
                }
            }

            broadcastHp()
            return {
                ok: true,
                kind: 'boss',
                report: buildReport('boss', { worldPoints: worldPointsText || '' }),
                events,
                state: snapshot()
            }

        } catch (err) {
            console.error('bossAttack error:', err)
            return fail('SERVER', '❌ خطأ بالخادم')
        }
    }

    return { attack, getState, getFeed, latestFeedId, getLastResults, recordResults, subscribe, COOLDOWN_MS }
}

module.exports = {
    createBossAttackSystem,
    // 👑 جوائز الزعيم — يستخدمها index.js أيضاً
    BOSS_REWARDS, BOSS_BOX_LABELS, bossBoxLabel, bossFmt, bossGiveBoxes,
    bossBoxLines, bossBoxList, bossRewardsShortText, bossRewardsFullText
}
