// =====================================================================
// systems/echoSiteSystem.js
// 🎐 منطق صفحة الإيكوز بالموقع — يستدعي equipmentSystem و domainSystem مباشرة
// نفس أوامر البوت: .ايكو / .لبس / .ازالة / .تطوير_ايكو / .بيع_ايكو / .دومين / .فريق_دومين / .دخول_دومين
// الواجهة ما تحسب أي شيء: كل نتيجة (فوز/خسارة، رمية النرد، القطعة) تُحسب هنا ثم تُعرض بحركة.
// =====================================================================

const equipmentSystem = require('./equipmentSystem')
const domainSystem = require('./domainSystem')
const echoFamilies = require('../data/echoFamilies')
const echoMonsters = require('../data/echoMonsters')

const PER_PAGE = 8
const FIELDS = 'userId name username characters inventory echoTuners money maxInventory stamina staminaUpdatedAt domainTeams'
const SLOT_KEYS = equipmentSystem.SLOT_KEYS
const MAX_LEVEL = equipmentSystem.MAX_LEVEL
// نفس .تطوير_ايكو: 400,000 للقطعة كاملة (0→15) مقسومة على 15 لفل
const LEVEL_MONEY = Math.round(400000 / MAX_LEVEL)

const fail = (code, message) => ({ ok: false, code, message })
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))

function createEchoSystem({ Player, giftLocks, pullLocks }) {

    const echoLocks = new Set()

    // قفل لكل لاعب (يشارك giftLocks/pullLocks مثل الشظايا) — يمنع عمليتين متزامنتين على نفس الحساب
    async function guarded(userId, fn) {
        const uid = String(userId)
        if (echoLocks.has(uid) || (giftLocks && giftLocks.has(uid)) || (pullLocks && pullLocks.has(uid))) {
            return fail('BUSY', '⏳ فيه عملية ثانية شغالة على حسابك، انتظر ثواني وحاول.')
        }
        echoLocks.add(uid)
        try {
            return await fn()
        } catch (err) {
            if (err && err.name === 'VersionError') return fail('BUSY', '⏳ تغيّر حسابك أثناء العملية، حاول مرة ثانية.')
            console.error('echo system error:', err)
            return fail('SERVER', '❌ حدث خطأ بالخادم، حاول مرة ثانية.')
        } finally {
            echoLocks.delete(uid)
        }
    }

    const load = userId => Player.findOne({ userId }).select(FIELDS)

    // ───────── أشكال آمنة للمتصفح ─────────
    function pieceOut(it, n) {
        if (!it) return null
        return {
            n,
            uid: String(it.uid),
            cost: Number(it.cost) || 1,
            fam: String(it.familyId || ''),
            lvl: Number(it.level) || 0,
            max: Number(it.maxLevel) || MAX_LEVEL,
            main: { t: String(it.mainStat && it.mainStat.type || ''), v: Number(it.mainStat && it.mainStat.value) || 0 },
            subs: (it.subStats || []).map(s => ({ t: String(s.type), name: String(s.name || ''), v: Number(s.value) || 0 })),
            mon: it.droppedBy ? String(it.droppedBy.nameAr || it.droppedBy.name || '') : ''
        }
    }

    function charOut(c, index, mapImg) {
        const ec = (c && c.echoes) || {}
        return {
            index,
            name: String(c.name || ''),
            power: Number(c.power) || 0,
            img: mapImg ? mapImg(c) : null,
            slots: SLOT_KEYS.map(k => !!ec[k])
        }
    }

    // بيانات ثابتة (عوائل + وحوش + صعوبات) تُحقن مرة بالصفحة
    let _static = null
    function staticData() {
        if (_static) return _static
        _static = {
            fams: echoFamilies.map(f => {
                const m = echoMonsters[f.id] || {}
                const nm = a => (a || []).map(x => String(x.nameAr || x.name))
                return {
                    id: String(f.id),
                    e: (String(f.name).match(/^\S+/) || ['🎐'])[0],
                    en: String(f.name).replace(/^\S+\s*/, ''),
                    ar: String(f.nameAr),
                    b2: f.bonus2 || {},
                    b5: f.bonus5 || {},
                    m: { 1: nm(m.cost1), 3: nm(m.cost3), 4: nm(m.cost4) }
                }
            }),
            diff: Object.fromEntries(Object.entries(domainSystem.DIFFICULTY_LEVELS).map(([k, d]) => [k, {
                cost: d.cost, req: d.requiredPower, base: d.baseWinChance
            }])),
            sell: equipmentSystem.SELL_PRICE_BY_COST,
            lvlCost: LEVEL_MONEY,
            maxLevel: MAX_LEVEL,
            tunersPerWin: equipmentSystem.TUNERS_PER_DOMAIN_WIN,
            staCost: domainSystem.DOMAIN_COST
        }
        return _static
    }

    function pickChar(player, index, name) {
        const c = (player.characters || [])[index]
        if (!c || String(c.name) !== String(name)) return null
        return c
    }

    // ───────── قراءة الحالة (نفس .ايكو + .دومين + فريق الدومين) ─────────
    async function getState({ userId, charIndex, domainId, mapImg }) {
        const player = await load(userId)
        if (!player) return fail('NO_ACCOUNT', '❌ لا يوجد حساب.')

        domainSystem.applyStaminaRegen(player)
        const sta = domainSystem.getStaminaInfo(player)

        const chars = player.characters || []
        const ci = Number.isInteger(charIndex) && charIndex >= 0 && charIndex < chars.length ? charIndex : 0
        const c = chars[ci]

        const did = Number.isInteger(domainId) && domainId >= 1 && domainId <= echoFamilies.length ? domainId : 1
        const idxs = (((player.domainTeams || {})[did]) || []).filter(i => chars[i - 1])
        const teamChars = idxs.map(i => chars[i - 1])
        const teamPower = teamChars.length ? domainSystem.calculateTeamPower(teamChars) : 0

        const chances = {}
        for (const [k, d] of Object.entries(domainSystem.DIFFICULTY_LEVELS)) {
            chances[k] = clamp(d.baseWinChance * clamp(teamPower / d.requiredPower, 0.4, 1.5), 0.05, 0.95)
        }

        const ec = (c && c.echoes) || {}
        const echoes = {}
        for (const k of SLOT_KEYS) echoes[k] = pieceOut(ec[k], 0)

        return {
            ok: true,
            money: Number(player.money) || 0,
            tuners: Number(player.echoTuners) || 0,
            maxInv: Number(player.maxInventory) || equipmentSystem.DEFAULT_MAX_INVENTORY,
            stamina: { current: sta.current, max: sta.max, cost: domainSystem.DOMAIN_COST, msToNext: sta.msToNext },
            inv: (player.inventory || []).map((it, i) => pieceOut(it, i + 1)),
            charCount: chars.length,
            char: c ? { index: ci, name: String(c.name || ''), power: Number(c.power) || 0, img: mapImg ? mapImg(c) : null, echoes } : null,
            dom: did,
            team: idxs.map(i => charOut(chars[i - 1], i - 1, mapImg)),
            teamPower,
            chances,
            ...(getState._withStatic === false ? {} : { cfg: staticData() })
        }
    }

    // ───────── قائمة الشخصيات بصفحات + بحث (لاعب عنده 200+ شخصية) ─────────
    async function listChars({ userId, page, q, mapImg }) {
        const player = await Player.findOne({ userId }).select('characters')
        if (!player) return fail('NO_ACCOUNT', '❌ لا يوجد حساب.')
        const chars = player.characters || []
        const needle = String(q || '').trim().toLowerCase().slice(0, 60)
        let list = chars.map((c, i) => [c, i])
        if (needle) list = list.filter(([c, i]) => String(c.name || '').toLowerCase().includes(needle) || String(i + 1) === needle)
        const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
        const pg = clamp(Number(page) || 0, 0, pages - 1)
        return {
            ok: true, total: list.length, pages, page: pg,
            items: list.slice(pg * PER_PAGE, pg * PER_PAGE + PER_PAGE).map(([c, i]) => charOut(c, i, mapImg))
        }
    }

    // ───────── .لبس / لبس بخانة محددة ─────────
    const equip = ({ userId, charIndex, name, uid, slot }) => guarded(userId, async () => {
        const player = await load(userId)
        if (!player) return fail('NO_ACCOUNT', '❌ لا يوجد حساب.')
        const character = pickChar(player, charIndex, name)
        if (!character) return fail('BAD_CHAR', '❌ الشخصية تغيّرت، حدّث الصفحة.')
        const invIndex = (player.inventory || []).findIndex(i => i && i.uid === uid)
        if (invIndex < 0) return fail('BAD_ITEM', '❌ القطعة غير موجودة بالحقيبة، حدّث الصفحة.')

        // بدون خانة = نفس .لبس بالضبط (equipByIndex يختار الخانة حسب الكوست)، وبخانة = equipItem
        const r = slot
            ? equipmentSystem.equipItem(player, character, uid, slot)
            : equipmentSystem.equipByIndex(player, charIndex + 1, invIndex + 1)
        if (!r.success) return fail('RULE', r.message)

        await player.save()
        return { ok: true, slot: r.slotKey || slot || null, name: String(character.name) }
    })

    // ───────── .ازالة ─────────
    const unequip = ({ userId, charIndex, name, slot }) => guarded(userId, async () => {
        const player = await load(userId)
        if (!player) return fail('NO_ACCOUNT', '❌ لا يوجد حساب.')
        const character = pickChar(player, charIndex, name)
        if (!character) return fail('BAD_CHAR', '❌ الشخصية تغيّرت، حدّث الصفحة.')
        if (!SLOT_KEYS.includes(slot)) return fail('BAD_SLOT', '❌ سلوت غير صحيح.')
        const r = equipmentSystem.unequipItem(player, character, slot)
        if (!r.success) return fail('RULE', r.message)
        await player.save()
        return { ok: true }
    })

    // ───────── .تطوير_ايكو (تيونر + مال، القطعة لازم تكون بالحقيبة) ─────────
    const level = ({ userId, uid, levels }) => guarded(userId, async () => {
        const player = await load(userId)
        if (!player) return fail('NO_ACCOUNT', '❌ لا يوجد حساب.')
        const item = (player.inventory || []).find(i => i && i.uid === uid)
        if (!item) return fail('BAD_ITEM', '❌ القطعة غير موجودة بالحقيبة (لازم تكون غير مجهزة).')
        if (item.level >= MAX_LEVEL) return fail('RULE', `❌ هذي القطعة وصلت أقصى لفل (${MAX_LEVEL}/${MAX_LEVEL}) بالفعل.`)

        const tuners = player.echoTuners || 0
        if (tuners <= 0) return fail('RULE', `❌ ما عندك ${equipmentSystem.TUNER_NAME_AR} كفاية.\n💡 اكسب تيونرات عن طريق الفوز بدومين.`)

        const apply = Math.min(Math.max(1, levels | 0), tuners, MAX_LEVEL - item.level)
        const cost = LEVEL_MONEY * apply
        if ((player.money || 0) < cost) {
            return fail('RULE', `❌ ما تملك مال كافي للتطوير\n💰 التكلفة: ${cost.toLocaleString()}\n🪙 رصيدك: ${(player.money || 0).toLocaleString()}`)
        }

        const { unlockedSubStats } = equipmentSystem.levelUpEchoBy(item, apply)
        player.money -= cost
        player.echoTuners = tuners - apply
        if (player.markModified) { player.markModified('inventory'); player.markModified('echoTuners') }
        await player.save()

        return {
            ok: true, applied: apply, cost,
            unlocked: (unlockedSubStats || []).map(s => ({ t: String(s.type), name: String(s.name || ''), v: Number(s.value) || 0 }))
        }
    })

    // ───────── .بيع_ايكو (قطعة أو أكثر) ─────────
    const sell = ({ userId, uids }) => guarded(userId, async () => {
        const player = await load(userId)
        if (!player) return fail('NO_ACCOUNT', '❌ لا يوجد حساب.')
        let gold = 0, sold = 0
        for (const uid of uids) {
            const r = equipmentSystem.sellEquipment(player, uid)
            if (r.success) { gold += r.gold; sold++ }
        }
        if (!sold) return fail('BAD_ITEM', '❌ ما قدرت أبيع أي قطعة، حدّث الصفحة.')
        await player.save()
        return { ok: true, sold, gold, money: Number(player.money) || 0 }
    })

    // ───────── .فريق_دومين (3 شخصيات مختلفة بالضبط، محفوظ لكل دومين) ─────────
    const setTeam = ({ userId, domainId, chars }) => guarded(userId, async () => {
        const player = await load(userId)
        if (!player) return fail('NO_ACCOUNT', '❌ لا يوجد حساب.')
        const indices = []
        for (const c of chars) {
            if (!pickChar(player, c.index, c.name)) return fail('BAD_CHAR', '❌ إحدى الشخصيات تغيّرت، حدّث الصفحة.')
            indices.push(c.index + 1)
        }
        const r = domainSystem.setDomainTeam(player, domainId, indices)
        if (!r.success) return fail('RULE', r.message)
        await player.save()
        return { ok: true }
    })

    // ───────── .دخول_دومين ─────────
    const enter = ({ userId, domainId, difficulty, mapImg }) => guarded(userId, async () => {
        const player = await load(userId)
        if (!player) return fail('NO_ACCOUNT', '❌ لا يوجد حساب.')

        const r = domainSystem.enterDomain(player, domainId, difficulty)
        if (!r.success) return fail('RULE', r.message)
        await player.save()

        const chars = player.characters || []
        const idxs = (((player.domainTeams || {})[domainId]) || []).filter(i => chars[i - 1])
        const key = r.difficultyKey || domainSystem.normalizeDifficulty(difficulty)
        const stored = !!(r.won && r.item && (player.inventory || []).some(i => i && i.uid === r.item.uid))

        return {
            ok: true,
            won: !!r.won,
            luckRoll: Number(r.luckRoll) || 0,
            monster: r.monster ? String(r.monster.nameAr || r.monster.name || '') : '',
            teamPower: Number(r.teamPower) || 0,
            winChance: Number(r.winChance) || 0,
            difficulty: key,
            cost: domainSystem.DIFFICULTY_LEVELS[key].cost,
            staminaLeft: Number(r.staminaLeft) || 0,
            item: r.won && r.item ? pieceOut(r.item, 0) : null,
            stored,
            tunersGained: r.won ? equipmentSystem.TUNERS_PER_DOMAIN_WIN : 0,
            team: idxs.map(i => charOut(chars[i - 1], i - 1, mapImg))
        }
    })

    return { getState, listChars, equip, unequip, level, sell, setTeam, enter, staticData }
}

module.exports = { createEchoSystem }
