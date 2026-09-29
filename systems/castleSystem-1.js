// 🏰 نظام القلاع — القلعة + الترقية بالمال + الفرق + الغارات + الترتيب
// كل الأوامر تحت البادئة (.قلعتي / .قلعة / .قلعة_*) عشان ما تتعارض مع أي أمر ثاني بالبوت.
// الربط بـ index.js:
//   castleSystem.init({ equipmentSystem, getWeaponBonusForCharacter, companionsData })  (مرة وحدة)
//   castleSystem.isCastleCommand(text) ثم castleSystem.handle({ msg, text, userId, Player, safeSend })

const Castle = require('../models/Castle')
const battle = require('./castleBattle')

let deps = null
function init(d) { deps = d }

// =========================
// ⚙️ الإعدادات — غيّر الأرقام من هنا بس
// =========================
const MAX_LEVEL = 10
const MINE_HOLD_HOURS = 10
const TIME_GROWTH = 1.6

const CMD_COOLDOWN_MS = 2000       // كولداون صامت عام لكل لاعب
const RAID_COOLDOWN_MS = 30000     // كولداون صامت بين الغارات (نفس فكرة .هجوم)
const MAX_RAIDS_PER_DAY = 10
const SEARCH_EXPIRE_MS = 10 * 60000

// 💵 التكاليف بالمال الحقيقي (نفس رصيد .رصيدي)
const FOUND_COST = 300000                     // تأسيس القلعة (= القاعة مستوى 1)
const HALL_COST_L2 = 900000                   // القاعة مستوى 2
const HALL_COST_L10 = 10000000                // القاعة مستوى 10
const COST_FACTOR = { hall: 1, mine: 0.5, storage: 0.4, barracks: 0.6, towers: 0.6, walls: 0.5 }

// ⚔️ اقتصاد الغارات (ذهب/حديد القلعة)
const searchGoldCost = hall => 150 + 50 * hall
const raidIronCost = hall => 60 + 40 * hall
const STAR_LOOT_PCT = [0, 0.15, 0.30, 0.50]   // نسبة النهب حسب النجوم
const LOOT_PROTECTED_PCT = 0.20               // جزء من سعة المخزن محمي من النهب
const TROPHY_ATTACKER = [-8, 12, 22, 35]      // كؤوس المهاجم حسب النجوم (0 نجوم = خسارة)
const TROPHY_DEFENDER_WIN = 5                 // كؤوس المدافع لو صدّ الغارة
const SHIELD_HOURS = [0, 4, 6, 8]             // درع المدافع حسب النجوم

const BUILDINGS = {
    hall:     { name: 'القاعة الرئيسية', icon: '🏛️', minutes: 30 },
    mine:     { name: 'المناجم',          icon: '⛏️', minutes: 10 },
    storage:  { name: 'المخازن',          icon: '📦', minutes: 10 },
    barracks: { name: 'الثكنات',          icon: '⚔️', minutes: 20 },
    towers:   { name: 'الأبراج',          icon: '🗼', minutes: 20 },
    walls:    { name: 'الجدران',          icon: '🧱', minutes: 15 }
}

const ORDER = ['hall', 'mine', 'storage', 'barracks', 'towers', 'walls']
const NUM_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣']

const ALIASES = {
    hall:     ['قاعه', 'رئيسيه'],
    mine:     ['منجم', 'مناجم'],
    storage:  ['مخزن', 'مخازن'],
    barracks: ['ثكنه', 'ثكنات'],
    towers:   ['برج', 'ابراج'],
    walls:    ['جدار', 'جدران', 'سور', 'اسوار']
}

// =========================
// 🧮 المعادلات
// =========================
const goldRate = L => Math.round(300 * Math.pow(L, 1.3))
const ironRate = L => Math.round(100 * Math.pow(L, 1.3))
const storageCap = L => Math.round(5000 * Math.pow(1.7, L - 1))
const slotsFor = L => Math.min(5, 1 + Math.floor(L / 2))
const wallBonus = L => 4 * L

// تكلفة القاعة لمستوى L (2..10): منحنى من 900 ألف إلى 10 مليون
function hallCost(L) {
    const r = Math.pow(HALL_COST_L10 / HALL_COST_L2, 1 / 8)
    return Math.round((HALL_COST_L2 * Math.pow(r, L - 2)) / 10000) * 10000
}

// تكلفة ترقية أي مبنى للمستوى toLevel — بالمال
function upgradeCost(key, toLevel) {
    return Math.round((hallCost(toLevel) * COST_FACTOR[key]) / 10000) * 10000
}

function upgradeMs(key, toLevel) {
    return Math.round(BUILDINGS[key].minutes * Math.pow(TIME_GROWTH, toLevel - 2)) * 60000
}

// =========================
// 🧰 أدوات مساعدة
// =========================
const fmt = n => Math.floor(n).toLocaleString('en-US')
const stars = n => '⭐'.repeat(n) + '☆'.repeat(3 - n)
const tag = jid => '@' + String(jid).split('@')[0]
const dayKey = ms => new Date(ms + 3 * 3600000).toISOString().slice(0, 10) // بتوقيت السعودية

function unit(n, one, two, few, many) {
    if (n === 1) return one
    if (n === 2) return two
    return `${n} ${n >= 3 && n <= 10 ? few : many}`
}

function fmtDuration(ms) {
    const m = Math.max(1, Math.ceil(ms / 60000))
    const mins = n => unit(n, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة')
    const hrs = n => unit(n, 'ساعة', 'ساعتين', 'ساعات', 'ساعة')
    const days = n => unit(n, 'يوم', 'يومين', 'أيام', 'يوم')

    if (m < 60) return mins(m)
    const h = Math.floor(m / 60)
    const mm = m % 60
    if (h < 24) return mm ? `${hrs(h)} و${mins(mm)}` : hrs(h)
    const d = Math.floor(h / 24)
    const hh = h % 24
    return hh ? `${days(d)} و${hrs(hh)}` : days(d)
}

const norm = s => String(s)
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/^ال/, '')

function resolveBuilding(arg) {
    if (!arg) return null
    const n = norm(arg)
    if (/^[1-6]$/.test(n)) return ORDER[Number(n) - 1]
    for (const key of ORDER) {
        if (ALIASES[key].includes(n)) return key
    }
    return null
}

const shieldLeftMs = (c, nowMs) =>
    c.shieldUntil ? new Date(c.shieldUntil).getTime() - nowMs : 0

// =========================
// ⏱️ الإنتاج والترقية (تُحسب عند أي أمر — بدون مؤقتات)
// =========================
function isUpgrading(c) {
    return !!(c.upgrade && c.upgrade.building)
}

function accrue(c, untilMs) {
    const from = new Date(c.lastTick).getTime()
    if (untilMs <= from) return

    const hours = (untilMs - from) / 3600000
    const L = c.buildings.mine

    c.pendingGold = Math.min(goldRate(L) * MINE_HOLD_HOURS, (c.pendingGold || 0) + goldRate(L) * hours)
    c.pendingIron = Math.min(ironRate(L) * MINE_HOLD_HOURS, (c.pendingIron || 0) + ironRate(L) * hours)
    c.lastTick = new Date(untilMs)
}

function settle(c, nowMs) {
    const notes = []

    if (isUpgrading(c) && new Date(c.upgrade.endsAt).getTime() <= nowMs) {
        const key = c.upgrade.building
        const toLevel = c.upgrade.toLevel

        accrue(c, new Date(c.upgrade.endsAt).getTime())

        c.buildings[key] = toLevel
        notes.push(`✅ اكتملت ترقية ${BUILDINGS[key].icon} ${BUILDINGS[key].name} إلى مستوى ${toLevel}`)

        c.upgrade.building = null
        c.upgrade.toLevel = 0
        c.upgrade.endsAt = null
    }

    accrue(c, nowMs)
    return notes
}

// =========================
// 💵 المال (رصيد .رصيدي) — خصم ذري
// =========================
async function spendMoney(Player, userId, amount) {
    return Player.findOneAndUpdate(
        { userId, money: { $gte: amount } },
        { $inc: { money: -amount } },
        { new: true }
    )
}

async function refundMoney(Player, userId, amount) {
    await Player.updateOne({ userId }, { $inc: { money: amount } })
}

// =========================
// 💬 بناء الرسائل
// =========================
function buildingLine(c, key, i) {
    const b = BUILDINGS[key]
    const L = c.buildings[key]
    let extra = ''

    if (key === 'mine') extra = ` (💰 ${fmt(goldRate(L))}/س · ⛓️ ${fmt(ironRate(L))}/س)`
    if (key === 'storage') extra = ` (سعة ${fmt(storageCap(L))})`
    if (key === 'barracks') extra = ` (خانات الهجوم: ${slotsFor(L)})`
    if (key === 'towers') extra = ` (خانات الدفاع: ${slotsFor(L)})`
    if (key === 'walls') extra = ` (+${wallBonus(L)}% دم للمدافعين)`

    return `${NUM_EMOJI[i]} ${b.icon} ${b.name} — مستوى ${L}${extra}`
}

function upgradeStatusLine(c, nowMs) {
    if (!isUpgrading(c)) return ''
    const b = BUILDINGS[c.upgrade.building]
    const left = new Date(c.upgrade.endsAt).getTime() - nowMs
    return `🔨 قيد الترقية: ${b.icon} ${b.name} ← مستوى ${c.upgrade.toLevel} (باقي ${fmtDuration(left)})`
}

function buildCastleMessage(c, pushName, notes, nowMs) {
    const cap = storageCap(c.buildings.storage)
    const holdG = goldRate(c.buildings.mine) * MINE_HOLD_HOURS
    const holdI = ironRate(c.buildings.mine) * MINE_HOLD_HOURS

    const lines = []

    if (notes.length) lines.push(notes.join('\n'), '')

    lines.push(
        `🏰 *قلعة ${pushName || 'اللاعب'}*`,
        `🏆 الكؤوس: ${fmt(c.trophies || 0)}`
    )

    const sh = shieldLeftMs(c, nowMs)
    if (sh > 0) lines.push(`🛡️ درع الحماية: باقي ${fmtDuration(sh)}`)

    lines.push(
        '━━━━━━━━━━━━━━',
        `💰 الذهب: ${fmt(c.gold)} / ${fmt(cap)}`,
        `⛓️ الحديد: ${fmt(c.iron)} / ${fmt(cap)}`,
        `⛏️ بالمناجم: 💰 ${fmt(c.pendingGold)} / ${fmt(holdG)} · ⛓️ ${fmt(c.pendingIron)} / ${fmt(holdI)}`,
        '━━━━━━━━━━━━━━'
    )

    ORDER.forEach((key, i) => lines.push(buildingLine(c, key, i)))

    lines.push(
        '━━━━━━━━━━━━━━',
        `🗡️ فريق الهجوم: ${(c.attackSquad || []).join('، ') || 'غير محدد'}`,
        `🛡️ فريق الدفاع: ${(c.defenseSquad || []).join('، ') || 'غير محدد'}`
    )

    const status = upgradeStatusLine(c, nowMs)
    if (status) lines.push('', status)

    lines.push('', '📌 .قلعة للأوامر')

    return lines.join('\n')
}

function buildHelpMessage() {
    return [
        '🏰 *أوامر نظام القلاع*',
        '━━━━━━━━━━━━━━',
        '`.قلعة_تاسيس` ← تأسيس قلعتك',
        '`.قلعتي` ← عرض قلعتك',
        '`.قلعة_جمع` ← جمع الموارد من المناجم',
        '`.قلعة_ترقية` ← عرض الترقيات وترقية مبنى',
        '`.قلعة_هجوم` ← فريق الهجوم (مثال: .قلعة_هجوم 1 2 3)',
        '`.قلعة_دفاع` ← فريق الدفاع (مثال: .قلعة_دفاع 4 5)',
        '`.قلعة_بحث` ← البحث عن قلعة خصم',
        '`.قلعة_غارة` ← شن الغارة على الهدف',
        '`.قلعة_ترتيب` ← لوحة ترتيب الكؤوس',
        '',
        '💡 أرقام الشخصيات هي نفس أرقامها في .شخصياتي',
        '🌌 كل فريق (هجوم أو دفاع) يقبل أوميقا Ω واحدة فقط'
    ].join('\n')
}

function buildUpgradeMenu(c, notes, nowMs, money) {
    const hallLevel = c.buildings.hall
    const lines = []

    if (notes.length) lines.push(notes.join('\n'), '')

    lines.push('🔨 *ترقية المباني*', '━━━━━━━━━━━━━━')

    ORDER.forEach((key, i) => {
        const b = BUILDINGS[key]
        const L = c.buildings[key]

        lines.push(`${NUM_EMOJI[i]} ${b.icon} ${b.name} — مستوى ${L}`)

        if (L >= MAX_LEVEL) {
            lines.push('   ✅ أعلى مستوى')
            return
        }

        const next = L + 1

        if (key !== 'hall' && next > hallLevel) {
            lines.push(`   🔒 تحتاج القاعة الرئيسية مستوى ${next}`)
            return
        }

        lines.push(
            `   ← مستوى ${next}: 💵 ${fmt(upgradeCost(key, next))} · ⏳ ${fmtDuration(upgradeMs(key, next))}`
        )
    })

    lines.push('', `💳 رصيدك: ${fmt(money || 0)}`)

    const status = upgradeStatusLine(c, nowMs)
    if (status) lines.push(status)

    lines.push('', '📌 للترقية: `.قلعة_ترقية رقم`  (مثال: `.قلعة_ترقية 2`)')

    return lines.join('\n')
}

// =========================
// 🚦 التحكم بالتزامن والسبام
// =========================
const busy = new Set()
const lastCmdAt = new Map()
const lastRaidAt = new Map()

// =========================
// 🎮 الأوامر
// =========================
const CMD_RE = /^\.(قلعتي|قلعة(?:_\S+)?)(?:\s|$)/

const KNOWN = new Set([
    '.قلعتي', '.قلعة', '.قلعة_تاسيس', '.قلعة_جمع', '.قلعة_ترقية',
    '.قلعة_هجوم', '.قلعة_دفاع', '.قلعة_بحث', '.قلعة_غارة', '.قلعة_ترتيب'
])

function isCastleCommand(text) {
    return typeof text === 'string' && CMD_RE.test(text)
}

// يفسّر أرقام الشخصيات من .شخصياتي
function parseIndices(args) {
    const out = []
    for (const a of args) {
        const n = Number(norm(a))
        if (!Number.isInteger(n) || n < 1) return null
        out.push(n)
    }
    return out
}

// عرض/تحديد فريق (هجوم أو دفاع)
async function handleSquad({ kind, castle, notes, parts, player, send }) {
    const isAttack = kind === 'attack'
    const field = isAttack ? 'attackSquad' : 'defenseSquad'
    const otherField = isAttack ? 'defenseSquad' : 'attackSquad'
    const slots = slotsFor(isAttack ? castle.buildings.barracks : castle.buildings.towers)
    const title = isAttack ? '🗡️ *فريق الهجوم*' : '🛡️ *فريق الدفاع*'
    const cmdName = isAttack ? '.قلعة_هجوم' : '.قلعة_دفاع'
    const pre = notes.length ? notes.join('\n') + '\n\n' : ''

    const args = parts.slice(1)

    // ---- تحديد الفريق ----
    if (args.length) {

        if (norm(args[0]) === 'مسح') {
            castle[field] = []
            await castle.save()
            return send(pre + `✅ تم مسح ${isAttack ? 'فريق الهجوم' : 'فريق الدفاع'}.`)
        }

        const idx = parseIndices(args)
        const chars = player.characters || []

        if (!idx) {
            return send(pre + `❌ اكتب أرقام الشخصيات فقط.\nمثال: ${cmdName} 1 2 3`)
        }
        if (new Set(idx).size !== idx.length) {
            return send(pre + '❌ لا تكرر نفس الرقم.')
        }
        if (idx.length > slots) {
            return send(
                pre + `❌ عدد الخانات المتاحة: ${slots} فقط.\n` +
                `💡 رقّ ${isAttack ? 'الثكنات' : 'الأبراج'} لفتح خانات أكثر.`
            )
        }
        if (idx.some(n => n > chars.length)) {
            return send(pre + `❌ رقم غير صحيح، عندك ${chars.length} شخصيات فقط.\n💡 استخدم .شخصياتي لمعرفة الأرقام`)
        }

        const names = idx.map(n => chars[n - 1].name)

        if (new Set(names).size !== names.length) {
            return send(pre + '❌ اخترت شخصيات بنفس الاسم، اختر شخصيات مختلفة.')
        }

        // 🌌 أوميقا Ω وحدة فقط بالفريق (عشان الباقي ينافسون)
        const omegaNames = idx.map(n => chars[n - 1]).filter(battle.isOmega).map(c => c.name)
        if (omegaNames.length > battle.MAX_OMEGA_PER_SQUAD) {
            return send(
                pre + `❌ مسموح أوميقا Ω واحدة فقط بالفريق.\n` +
                `🌌 اخترت ${omegaNames.length}: ${omegaNames.join('، ')}\n` +
                '💡 اترك وحدة منهم وكمّل الباقي من شخصياتك الثانية.'
            )
        }

        const clash = names.filter(n => (castle[otherField] || []).includes(n))
        if (clash.length) {
            return send(
                pre + `❌ ${clash.join('، ')} موجودة بفريق ${isAttack ? 'الدفاع' : 'الهجوم'}.\n` +
                'الشخصية الوحدة تكون بفريق واحد بس.'
            )
        }

        castle[field] = names
        await castle.save()
    } else {
        await castle.save()
    }

    // ---- عرض الفريق ----
    const squadNames = castle[field] || []
    const lines = [pre + title, '━━━━━━━━━━━━━━']

    if (!squadNames.length) {
        lines.push('لم تحدد فريقاً بعد.')
    } else {
        let totalAtk = 0
        let totalHp = 0

        squadNames.forEach((n, i) => {
            const ch = (player.characters || []).find(c => c && c.name === n)
            if (!ch) {
                lines.push(`${i + 1}. ${n} — ⚠️ لم تعد موجودة`)
                return
            }
            const u = battle.buildUnit(player, ch, deps)
            totalAtk += u.atk
            totalHp += u.maxHp
            lines.push(`${i + 1}. ${u.name} — ⚔️ ${fmt(u.atk)} · ❤️ ${fmt(u.maxHp)}`)
        })

        lines.push('━━━━━━━━━━━━━━', `⚔️ مجموع الضرر: ${fmt(totalAtk)} · ❤️ مجموع الدم: ${fmt(totalHp)}`)
    }

    lines.push(
        `🔢 الخانات: ${squadNames.length}/${slots}`,
        `🌌 أوميقا Ω: وحدة فقط بالفريق`,
        '',
        `📌 ${cmdName} 1 2 3  ← تحديد الفريق (أرقام .شخصياتي)`,
        `📌 ${cmdName} مسح  ← مسح الفريق`
    )

    return send(lines.join('\n'))
}

// يجهّز الدفاع لقلعة (يحمّل اللاعب المدافع)
async function prepareDefense(Player, defCastle) {
    const defPlayer = await Player.findOne({ userId: defCastle.userId })
    if (!defPlayer || !(defPlayer.characters || []).length) return null

    const slots = slotsFor(defCastle.buildings.towers)
    const wall = wallBonus(defCastle.buildings.walls)
    const d = battle.buildDefenders(defPlayer, defCastle, slots, wall, deps)

    return Object.assign({ player: defPlayer }, d)
}

async function handle({ msg, text, userId, Player, safeSend }) {

    const parts = text.trim().split(/\s+/)
    if (parts[0] === '.قلعة_تأسيس') parts[0] = '.قلعة_تاسيس' // نقبل الكتابة بالهمزة وبدونها
    const cmd = parts[0]
    const jid = msg.key.remoteJid

    if (!KNOWN.has(cmd)) return false

    // 🤫 كولداون صامت + منع التنفيذ المتزامن
    const now = Date.now()
    if (now - (lastCmdAt.get(userId) || 0) < CMD_COOLDOWN_MS) return true
    if (busy.has(userId)) return true

    if (lastCmdAt.size > 5000) lastCmdAt.clear()
    lastCmdAt.set(userId, now)
    busy.add(userId)

    let lockedDefender = null

    const send = (body, mentions) =>
        safeSend(jid, mentions && mentions.length ? { text: body, mentions } : { text: body })

    try {

        if (cmd === '.قلعة') {
            await send(buildHelpMessage())
            return true
        }

        if (!deps) {
            await send('❌ نظام القلاع غير مهيّأ بعد، أخبر المطوّر.')
            return true
        }

        const castle = await Castle.findOne({ userId })

        // ---------- .قلعة_تأسيس ----------
        if (cmd === '.قلعة_تاسيس') {

            if (castle) {
                await send('🏰 عندك قلعة بالفعل! اكتب .قلعتي')
                return true
            }

            const pl = await Player.findOne({ userId })
            if (!pl) {
                await send('❌ لا يوجد لديك حساب.')
                return true
            }

            const paid = await spendMoney(Player, userId, FOUND_COST)
            if (!paid) {
                await send(
                    `❌ رصيدك ما يكفي لتأسيس القلعة.\n` +
                    `💵 التكلفة: ${fmt(FOUND_COST)}\n💳 رصيدك: ${fmt(pl.money || 0)}`
                )
                return true
            }

            try {
                await Castle.create({ userId })
            } catch (err) {
                await refundMoney(Player, userId, FOUND_COST)
                if (err && err.code === 11000) {
                    await send('🏰 عندك قلعة بالفعل! اكتب .قلعتي')
                    return true
                }
                throw err
            }

            await send(
                `🏰 *تم تأسيس قلعتك!*\n💸 خُصم ${fmt(FOUND_COST)} من رصيدك.\n\n` +
                '📌 .قلعتي لعرضها\n📌 .قلعة للأوامر'
            )
            return true
        }

        // ---------- ما عنده قلعة ----------
        if (!castle) {
            const pl = await Player.findOne({ userId })
            if (!pl) {
                await send('❌ لا يوجد لديك حساب.')
                return true
            }
            await send(
                '🏗️ ما عندك قلعة بعد!\n' +
                `💵 تكلفة التأسيس: ${fmt(FOUND_COST)}\n💳 رصيدك: ${fmt(pl.money || 0)}\n\n` +
                '📌 للتأسيس: .قلعة_تاسيس'
            )
            return true
        }

        const notes = settle(castle, now)

        // ---------- .قلعتي ----------
        if (cmd === '.قلعتي') {

            const mentions = []
            let reports = ''

            if ((castle.unread || 0) > 0 && (castle.log || []).length) {
                const recent = castle.log.slice(-Math.min(castle.unread, 5)).reverse()
                const rl = ['📨 *هجمات عليك أثناء غيابك:*']
                for (const e of recent) {
                    mentions.push(e.by)
                    rl.push(
                        `• ${tag(e.by)} ${e.stars ? stars(e.stars) : 'فشل'} ` +
                        (e.stars ? `— نهب 💰${fmt(e.gold)} ⛓️${fmt(e.iron)}${e.trophies ? ` (🏆 -${e.trophies})` : ''}` : '— صدّيت الهجوم 🛡️')
                    )
                }
                reports = rl.join('\n') + '\n\n'
                castle.unread = 0
            }

            await castle.save()
            await send(reports + buildCastleMessage(castle, msg.pushName, notes, now), mentions)
            return true
        }

        // ---------- .قلعة_جمع ----------
        if (cmd === '.قلعة_جمع') {

            const cap = storageCap(castle.buildings.storage)

            const takeG = Math.min(Math.floor(castle.pendingGold), Math.max(0, cap - castle.gold))
            const takeI = Math.min(Math.floor(castle.pendingIron), Math.max(0, cap - castle.iron))

            castle.gold += takeG
            castle.iron += takeI
            castle.pendingGold -= takeG
            castle.pendingIron -= takeI

            await castle.save()

            const out = []
            if (notes.length) out.push(notes.join('\n'), '')

            if (takeG + takeI === 0) {
                const storageFull = castle.gold >= cap || castle.iron >= cap
                out.push(
                    storageFull && (castle.pendingGold >= 1 || castle.pendingIron >= 1)
                        ? '📦 المخازن ممتلئة! رقّ المخازن أو اصرف موارد بالبحث والغارات أول.'
                        : '⛏️ ما في موارد جاهزة للجمع حالياً، ارجع بعد شوي.'
                )
            } else {
                out.push(`✅ تم الجمع:\n💰 +${fmt(takeG)}\n⛓️ +${fmt(takeI)}`)

                if (castle.pendingGold >= 1 || castle.pendingIron >= 1) {
                    out.push('', `📌 بقي بالمناجم: 💰 ${fmt(castle.pendingGold)} · ⛓️ ${fmt(castle.pendingIron)} (المخازن ما تكفي)`)
                }

                out.push('', `💰 ${fmt(castle.gold)} / ${fmt(cap)} · ⛓️ ${fmt(castle.iron)} / ${fmt(cap)}`)
            }

            await send(out.join('\n'))
            return true
        }

        // ---------- .قلعة_ترقية ----------
        if (cmd === '.قلعة_ترقية') {

            const pl = await Player.findOne({ userId })
            if (!pl) {
                await send('❌ لا يوجد لديك حساب.')
                return true
            }

            if (!parts[1]) {
                await castle.save()
                await send(buildUpgradeMenu(castle, notes, now, pl.money))
                return true
            }

            const key = resolveBuilding(parts[1])
            const pre = notes.length ? notes.join('\n') + '\n\n' : ''

            const reject = async body => {
                await castle.save()
                await send(pre + body)
                return true
            }

            if (!key) {
                return reject('❌ مبنى غير معروف.\n\n💡 استخدم .قلعة_ترقية لعرض المباني وأرقامها.')
            }

            const b = BUILDINGS[key]
            const L = castle.buildings[key]
            const next = L + 1

            if (isUpgrading(castle)) {
                return reject(upgradeStatusLine(castle, now) + '\n\n💡 وحدة بنفس الوقت، انتظر تخلص.')
            }

            if (L >= MAX_LEVEL) {
                return reject(`✅ ${b.icon} ${b.name} وصل لأعلى مستوى (${MAX_LEVEL}).`)
            }

            if (key !== 'hall' && next > castle.buildings.hall) {
                return reject(
                    `🔒 ترقية ${b.icon} ${b.name} إلى مستوى ${next} تحتاج القاعة الرئيسية مستوى ${next}.\n` +
                    `القاعة الحالية: مستوى ${castle.buildings.hall}`
                )
            }

            const cost = upgradeCost(key, next)
            const paid = await spendMoney(Player, userId, cost)

            if (!paid) {
                return reject(
                    `❌ رصيدك ما يكفي لترقية ${b.icon} ${b.name}.\n` +
                    `💵 التكلفة: ${fmt(cost)}\n💳 رصيدك: ${fmt(pl.money || 0)}`
                )
            }

            const ms = upgradeMs(key, next)
            castle.upgrade.building = key
            castle.upgrade.toLevel = next
            castle.upgrade.endsAt = new Date(now + ms)

            try {
                await castle.save()
            } catch (err) {
                await refundMoney(Player, userId, cost)
                throw err
            }

            await send(
                pre +
                `🔨 بدأت ترقية ${b.icon} ${b.name} إلى مستوى ${next}\n` +
                `💸 خُصم ${fmt(cost)} من رصيدك\n` +
                `⏳ تنتهي بعد ${fmtDuration(ms)}`
            )
            return true
        }

        // ---------- .قلعة_هجوم / .قلعة_دفاع ----------
        if (cmd === '.قلعة_هجوم' || cmd === '.قلعة_دفاع') {

            const pl = await Player.findOne({ userId })
            if (!pl || !(pl.characters || []).length) {
                await send('📭 لا توجد شخصيات لديك')
                return true
            }

            await handleSquad({
                kind: cmd === '.قلعة_هجوم' ? 'attack' : 'defense',
                castle, notes, parts, player: pl, send
            })
            return true
        }

        // ---------- .قلعة_بحث ----------
        if (cmd === '.قلعة_بحث') {

            const pre = notes.length ? notes.join('\n') + '\n\n' : ''

            const pl = await Player.findOne({ userId })
            if (!pl) {
                await send('❌ لا يوجد لديك حساب.')
                return true
            }

            const myUnits = battle.buildAttackers(pl, castle.attackSquad, deps)
            if (!myUnits.length) {
                await castle.save()
                await send(pre + '❌ حدد فريق الهجوم أول: .قلعة_هجوم 1 2 3')
                return true
            }

            const cost = searchGoldCost(castle.buildings.hall)
            if (castle.gold < cost) {
                await castle.save()
                await send(pre + `❌ البحث يكلّف 💰 ${fmt(cost)} ذهب.\nعندك: ${fmt(castle.gold)}\n💡 اجمع من المناجم بـ .قلعة_جمع`)
                return true
            }

            // نلقى هدف: بدون درع، قريب بمستوى القاعة، عنده شخصيات
            const hall = castle.buildings.hall
            const shieldOk = [{ shieldUntil: null }, { shieldUntil: { $lte: new Date(now) } }]

            let target = null
            let targetDef = null

            for (const range of [2, 10]) {
                const filter = {
                    userId: { $ne: userId },
                    'buildings.hall': { $gte: hall - range, $lte: hall + range },
                    $or: shieldOk
                }

                const n = await Castle.countDocuments(filter)
                if (!n) continue

                for (let tries = 0; tries < 6 && !target; tries++) {
                    const cand = await Castle.findOne(filter).skip(Math.floor(Math.random() * n))
                    if (!cand || cand.userId === userId) continue

                    const def = await prepareDefense(Player, cand)
                    if (def) {
                        target = cand
                        targetDef = def
                    }
                }

                if (target) break
            }

            if (!target) {
                await castle.save()
                await send(pre + '🔍 ما لقيت قلعة مناسبة حالياً (كلهم محميين أو ما في لاعبين)، جرّب بعد شوي. ما انخصم منك شي.')
                return true
            }

            castle.gold -= cost
            castle.raidTarget.userId = target.userId
            castle.raidTarget.expiresAt = new Date(now + SEARCH_EXPIRE_MS)
            castle.raidTarget.cost = cost
            await castle.save()

            const cap = storageCap(target.buildings.storage)
            const protectedAmt = Math.floor(cap * LOOT_PROTECTED_PCT)
            const lootG = Math.floor(Math.max(0, target.gold - protectedAmt) * STAR_LOOT_PCT[3])
            const lootI = Math.floor(Math.max(0, target.iron - protectedAmt) * STAR_LOOT_PCT[3])

            const myAtk = myUnits.reduce((s, u) => s + u.atk, 0)
            const defHp = targetDef.units.reduce((s, u) => s + u.maxHp, 0)

            await send(
                pre +
                `🎯 *لقيت قلعة!*\n━━━━━━━━━━━━━━\n` +
                `👤 ${tag(target.userId)}\n` +
                `🏛️ القاعة: مستوى ${target.buildings.hall} · 🏆 ${fmt(target.trophies || 0)}\n` +
                `🛡️ الدفاع: ${targetDef.units.length} شخصيات${targetDef.militia ? ' (حراس تلقائيين)' : ''} · ❤️ ${fmt(defHp)}\n` +
                `🗡️ فريقك: ${myUnits.length} شخصيات · ⚔️ ${fmt(myAtk)}\n` +
                `💰 أقصى نهب (3 نجوم): ~${fmt(lootG)} ذهب · ~${fmt(lootI)} حديد\n` +
                `━━━━━━━━━━━━━━\n` +
                `💸 كلفة البحث: 💰 ${fmt(cost)}\n` +
                `⏳ الهدف محجوز لك ${Math.round(SEARCH_EXPIRE_MS / 60000)} دقائق\n\n` +
                `📌 لشن الغارة: .قلعة_غارة (يكلّف ⛓️ ${fmt(raidIronCost(hall))})`,
                [target.userId]
            )
            return true
        }

        // ---------- .قلعة_غارة ----------
        if (cmd === '.قلعة_غارة') {

            const pre = notes.length ? notes.join('\n') + '\n\n' : ''

            const pl = await Player.findOne({ userId })
            if (!pl) {
                await send('❌ لا يوجد لديك حساب.')
                return true
            }

            // 🤫 كولداون الغارات صامت (نفس فكرة .هجوم)
            if (now - (lastRaidAt.get(userId) || 0) < RAID_COOLDOWN_MS) return true

            const myUnits = battle.buildAttackers(pl, castle.attackSquad, deps)
            if (!myUnits.length) {
                await castle.save()
                await send(pre + '❌ حدد فريق الهجوم أول: .قلعة_هجوم 1 2 3')
                return true
            }

            const rt = {
                userId: castle.raidTarget && castle.raidTarget.userId,
                expiresAt: castle.raidTarget && castle.raidTarget.expiresAt,
                cost: (castle.raidTarget && castle.raidTarget.cost) || 0
            }
            if (!rt.userId || !rt.expiresAt || new Date(rt.expiresAt).getTime() <= now) {
                await castle.save()
                await send(pre + '🔍 ما عندك هدف نشط. ابحث أول بـ .قلعة_بحث')
                return true
            }

            const today = dayKey(now)
            if (castle.raidsDay !== today) {
                castle.raidsDay = today
                castle.raidsToday = 0
            }
            if (castle.raidsToday >= MAX_RAIDS_PER_DAY) {
                await castle.save()
                await send(pre + `⛔ وصلت الحد اليومي للغارات (${MAX_RAIDS_PER_DAY}). يتجدد بعد منتصف الليل.`)
                return true
            }

            const ironCost = raidIronCost(castle.buildings.hall)
            if (castle.iron < ironCost) {
                await castle.save()
                await send(pre + `❌ الغارة تحتاج ⛓️ ${fmt(ironCost)} حديد تموين.\nعندك: ${fmt(castle.iron)}\n💡 اجمع من المناجم بـ .قلعة_جمع`)
                return true
            }

            // 🔒 قفل المدافع عشان ما يتخرب نهبه لو هاجمه أكثر من واحد بنفس اللحظة
            if (busy.has(rt.userId)) {
                await send(pre + '⏳ الهدف مشغول بهجوم ثاني، جرّب بعد ثواني.')
                return true
            }
            busy.add(rt.userId)
            lockedDefender = rt.userId

            const refundSearch = async why => {
                castle.gold = Math.min(storageCap(castle.buildings.storage), castle.gold + (rt.cost || 0))
                castle.raidTarget.userId = null
                castle.raidTarget.expiresAt = null
                castle.raidTarget.cost = 0
                await castle.save()
                await send(pre + `${why}\n💰 رجعنا لك تكلفة البحث. ابحث من جديد بـ .قلعة_بحث`)
                return true
            }

            const defCastle = await Castle.findOne({ userId: rt.userId })
            if (!defCastle) return refundSearch('⚠️ القلعة المستهدفة ما عادت موجودة.')

            const defSettleNotes = settle(defCastle, now) // eslint-disable-line no-unused-vars

            if (shieldLeftMs(defCastle, now) > 0) {
                await defCastle.save()
                return refundSearch('⚠️ الهدف صار محمي بدرع.')
            }

            const def = await prepareDefense(Player, defCastle)
            if (!def) {
                await defCastle.save()
                return refundSearch('⚠️ الهدف ما عنده شخصيات.')
            }

            // ⚔️ المعركة
            const result = battle.simulateRaid(myUnits, def.units, def.structHp)
            const s = result.stars

            // 💰 النهب (يتحدد بسعة مخزن المهاجم، والمدافع يخسر اللي أخذه المهاجم فقط)
            const defCap = storageCap(defCastle.buildings.storage)
            const protectedAmt = Math.floor(defCap * LOOT_PROTECTED_PCT)
            const atkCap = storageCap(castle.buildings.storage)

            const wantG = Math.floor(Math.max(0, defCastle.gold - protectedAmt) * STAR_LOOT_PCT[s])
            const wantI = Math.floor(Math.max(0, defCastle.iron - protectedAmt) * STAR_LOOT_PCT[s])

            const gotG = Math.min(wantG, Math.max(0, atkCap - castle.gold))
            const gotI = Math.min(wantI, Math.max(0, atkCap - (castle.iron - ironCost)))

            // 🏆 الكؤوس
            const oldAtkTrophies = castle.trophies || 0
            const nominalDelta = TROPHY_ATTACKER[s]
            castle.trophies = Math.max(0, oldAtkTrophies + nominalDelta)
            const atkTrophyDelta = castle.trophies - oldAtkTrophies

            const oldDefTrophies = defCastle.trophies || 0
            const defTrophyLoss = s > 0 ? Math.min(oldDefTrophies, Math.ceil(nominalDelta / 2)) : 0
            defCastle.trophies = s > 0
                ? oldDefTrophies - defTrophyLoss
                : oldDefTrophies + TROPHY_DEFENDER_WIN

            // المهاجم
            castle.iron -= ironCost
            castle.gold += gotG
            castle.iron += gotI
            castle.raidsToday += 1
            castle.raidTarget.userId = null
            castle.raidTarget.expiresAt = null
            castle.raidTarget.cost = 0

            let shieldBroke = false
            if (shieldLeftMs(castle, now) > 0) {
                castle.shieldUntil = null
                shieldBroke = true
            }

            // المدافع
            defCastle.gold -= gotG
            defCastle.iron -= gotI

            let shieldText = ''
            if (s > 0) {
                defCastle.shieldUntil = new Date(now + SHIELD_HOURS[s] * 3600000)
                shieldText = `🛡️ درع للمدافع: ${fmtDuration(SHIELD_HOURS[s] * 3600000)}`
            }

            defCastle.log.push({
                at: new Date(now),
                by: userId,
                stars: s,
                gold: gotG,
                iron: gotI,
                trophies: defTrophyLoss
            })
            while (defCastle.log.length > 10) defCastle.log.shift()
            defCastle.unread = Math.min(10, (defCastle.unread || 0) + 1)

            lastRaidAt.set(userId, now)

            await defCastle.save()
            await castle.save()

            // 📨 رسالة النتيجة
            const out = []
            if (pre) out.push(pre.trim(), '')

            out.push(
                '⚔️ *نتيجة الغارة*',
                `${tag(userId)} ⚔️ ${tag(defCastle.userId)}`,
                '━━━━━━━━━━━━━━',
                `${stars(s)}  ${s === 0 ? '❌ فشلت الغارة' : s === 3 ? '👑 دمار كامل!' : '✅ نجحت الغارة'}`,
                `🛡️ المدافعون: هُزم ${result.defDefeated}/${result.defTotal}${def.militia ? ' (حراس تلقائيين)' : ''}`
            )

            if (result.defDefeated === result.defTotal) {
                out.push(`🏛️ القاعة الرئيسية: ${result.hallDestroyed ? 'مدمّرة 💥' : 'سليمة'} · 🧱 الدمار: ${result.structPct}%`)
            }

            out.push(
                `🗡️ فريقك: نجا ${result.atkAlive}/${result.atkTotal} (${result.rounds} جولة)`,
                ...result.attackers.map(a => `   • ${a.name}: ${a.hpPct > 0 ? `❤️ ${a.hpPct}%` : '💀'}`),
                '━━━━━━━━━━━━━━'
            )

            if (s > 0) {
                out.push(`💰 نهبت: +${fmt(gotG)} ذهب · +${fmt(gotI)} حديد`)
                if (gotG < wantG || gotI < wantI) out.push('📦 (جزء من النهب ضاع لأن مخزنك ممتلئ)')
            }

            out.push(
                `🏆 كؤوسك: ${atkTrophyDelta >= 0 ? '+' : ''}${atkTrophyDelta} (المجموع ${fmt(castle.trophies)})`,
                `⛓️ تموين مصروف: ${fmt(ironCost)}`
            )

            if (shieldText) out.push(shieldText)
            if (shieldBroke) out.push('⚠️ انكسر درعك لأنك هاجمت.')

            await send(out.join('\n'), [userId, defCastle.userId])
            return true
        }

        // ---------- .قلعة_ترتيب ----------
        if (cmd === '.قلعة_ترتيب') {

            await castle.save()

            const top = await Castle.find({}).sort({ trophies: -1 }).limit(10)
            const myRank = (await Castle.countDocuments({ trophies: { $gt: castle.trophies || 0 } })) + 1

            const medals = ['🥇', '🥈', '🥉']
            const lines = ['🏆 *ترتيب القلاع*', '━━━━━━━━━━━━━━']
            const mentions = []

            top.forEach((c, i) => {
                mentions.push(c.userId)
                lines.push(`${medals[i] || `${i + 1}.`} ${tag(c.userId)} — 🏆 ${fmt(c.trophies || 0)} · 🏛️ ${c.buildings.hall}`)
            })

            lines.push('━━━━━━━━━━━━━━', `📍 ترتيبك: ${fmt(myRank)} · 🏆 ${fmt(castle.trophies || 0)}`)

            await send((notes.length ? notes.join('\n') + '\n\n' : '') + lines.join('\n'), mentions)
            return true
        }

        return false

    } catch (err) {
        console.log('Castle system error:', err)
        await send('❌ حدث خطأ في نظام القلاع، حاول مرة ثانية.')
        return true
    } finally {
        busy.delete(userId)
        if (lockedDefender) busy.delete(lockedDefender)
    }
}

module.exports = {
    init,
    isCastleCommand,
    handle,
    _internals: {
        BUILDINGS, ORDER, MAX_LEVEL, MINE_HOLD_HOURS, FOUND_COST,
        goldRate, ironRate, storageCap, slotsFor, wallBonus,
        hallCost, upgradeCost, upgradeMs, searchGoldCost, raidIronCost,
        settle, accrue, resolveBuilding
    }
}
