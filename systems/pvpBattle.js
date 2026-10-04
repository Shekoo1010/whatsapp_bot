'use strict'

// ⚔️ نظام قتال PvP الجديد (.قتال pvp)
// محاكاة فورية غير متزامنة: فريق من 3 شخصيات ضد فريق الخصم.
// كل ثوابت الموازنة في CFG أدناه — عدّل الأرقام من هنا فقط.

const CFG = {
    MAX_ROUNDS: 20,          // أقصى عدد جولات
    ENRAGE_FROM: 8,          // بعدها يزيد الضرر لمنع التطويل
    ENRAGE_STEP: 0.12,       // +12% ضرر لكل جولة بعد ENRAGE_FROM

    POWER_EXP: 0.7,          // ضغط أثر القوة: 1 = خطي. أقل = الفروقات الصغيرة بالقوة أقل حسمًا
    REF_POWER: 6000,         // قوة مرجعية: عندها الضغط لا يغيّر شيئًا
    HP_PER_POWER: 8,         // HP الشخصية = قوتها المضغوطة × هذا الرقم (+ معدات)
    DEF_K: 5000,             // الضرر × K/(K+دفاع)

    SKILL_COOLDOWN: 2,       // المهارة كل جولتين من أفعال الشخصية
    ENERGY_PER_ACTION: 25,   // طاقة الألتميت تزيد مع كل فعل
    ENERGY_PER_HIT: 10,      // وتزيد عند تلقي ضربة
    ENERGY_ULT: 100,

    MULT: { basic: 1, skill: 1.6, ultimate: 2.6 },

    BURN_PCT: 0.04,          // الحرق: % من أقصى HP للمصاب كل دور
    BURN_TURNS: 2,
    BURN_CHANCE: 0.35,       // تأتي مع المهارة
    STUN_CHANCE: 0.30,       // تأتي مع الألتميت

    VARIANCE: 0.05,          // تذبذب الضرر ±5%

    CAPS: {
        dodge: 25,
        lifesteal: 15,
        reflect: 10,
        reduction: 60,       // أقصى تخفيض ضرر % (دفاع % + رفيق الدب)
        critDamage: 300      // أقصى ضرر كريتيكال إضافي %
    },

    ELO_K: 32,
    ELO_MIN_GAIN: 8,
    ELO_MAX_GAIN: 40,

    BASE_MONEY: 80000,
    MONEY_MULT_MIN: 0.5,
    MONEY_MULT_MAX: 1.75
}

function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v))
}

function num(v, d = 0) {
    const n = Number(v)
    return Number.isFinite(n) ? n : d
}

// نفس منطق rollCrit بالبوت: فايض الكريت فوق 100% يتحول لضرر حرج إضافي
function rollCrit(rate, dmg, rng) {
    const overflow = Math.max(0, rate - 100)
    const effectiveRate = clamp(rate, 0, 100)
    const effectiveDamage = Math.min(dmg + overflow, CFG.CAPS.critDamage)
    const isCrit = rng() * 100 < effectiveRate
    return { isCrit, multiplier: isCrit ? 1 + effectiveDamage / 100 : 1 }
}

// يضغط أثر القوة حتى لا يحسم فارق صغير (10%) المعركة بنسبة شبه كاملة
function compressPower(power) {
    if (power <= 0) return 0
    return Math.pow(CFG.REF_POWER, 1 - CFG.POWER_EXP) * Math.pow(power, CFG.POWER_EXP)
}

function mergeBonus(a, b) {
    const out = Object.assign({}, a || {})
    for (const k in (b || {})) out[k] = num(out[k]) + num(b[k])
    return out
}

// =========================
// 👤 بناء المقاتلين
// =========================

// يرجع شخصيات الفريق: من pvpBattleTeam (بالأسماء) أو أقوى 3 شخصيات إن لم يُحدَّد فريق
function resolveTeamCharacters(player) {
    const chars = Array.isArray(player.characters) ? player.characters : []
    const saved = Array.isArray(player.pvpBattleTeam) ? player.pvpBattleTeam : []

    const picked = []
    for (const name of saved) {
        const c = chars.find(x => x && x.name === name)
        if (c && !picked.includes(c)) picked.push(c)
    }

    const byPower = chars
        .filter(Boolean)
        .slice()
        .sort((a, b) => num(b.power) - num(a.power))

    // فريق محفوظ: لو شخصية منه اختفت (بيع/إهداء) نكمّل الناقص بأقوى المتبقين
    if (picked.length > 0) {
        for (const c of byPower) {
            if (picked.length >= 3) break
            if (!picked.includes(c)) picked.push(c)
        }
        return { characters: picked.slice(0, 3), auto: false }
    }

    return { characters: byPower.slice(0, 3), auto: true }
}

function buildFighter(character, side, ctx) {
    const s = ctx.stats || {}
    const extras = ctx.extras || {}

    // معدات + إيكو (equipmentSystem) + السلاح المركب على الشخصية
    let eq = {}
    try { eq = ctx.equipmentSystem.calculateEquipmentStats(character) || {} } catch (e) { eq = {} }
    let wp = {}
    try { wp = ctx.getWeaponBonus(ctx.player, character) || {} } catch (e) { wp = {} }
    eq = mergeBonus(eq, wp)

    const power = num(character.power)
    const effPower = compressPower(power)

    let atk = effPower + num(s.attack) + num(eq.attack)
    atk *= 1 + num(eq.attackPercent) / 100

    let maxHp = effPower * CFG.HP_PER_POWER + num(s.hp) / ctx.teamSize + num(eq.hp)
    maxHp *= 1 + num(eq.hpPercent) / 100
    maxHp = Math.max(100, Math.floor(maxHp))

    const reduction = clamp(
        num(eq.defensePercent) + num(extras.damageReduction),
        0,
        CFG.CAPS.reduction
    )

    return {
        name: character.name || 'شخصية',
        side,
        power,
        atk: Math.max(1, Math.floor(atk)),
        def: Math.max(0, num(s.defense) + num(eq.defense)),
        reduction,                                   // %
        maxHp,
        hp: maxHp,
        shield: Math.max(0, Math.floor(num(s.shield) / ctx.teamSize + num(eq.shield))),
        critRate: num(s.critRate) + num(eq.critRate) + num(extras.critRate),
        critDamage: num(s.critDamage, 50) + num(eq.critDamage),
        dodge: clamp(num(s.dodge) + num(eq.dodge), 0, CFG.CAPS.dodge),
        accuracy: num(s.accuracy, 100) + num(eq.accuracy),
        lifesteal: clamp(num(s.lifesteal) + num(eq.lifesteal), 0, CFG.CAPS.lifesteal),
        reflect: clamp(num(s.reflect) + num(eq.reflect), 0, CFG.CAPS.reflect),
        speed: 100 + num(s.speed) + num(eq.speed) + power / 1000,

        // حالة القتال
        energy: 0,
        skillCd: 0,
        burn: 0,
        stun: 0,
        stunImmune: 0
    }
}

// يبني فريق القتال الكامل للاعب
function buildTeam(player, side, deps) {
    const { characters, auto } = resolveTeamCharacters(player)

    let stats = {}
    try { stats = deps.getTotalStats(player) || {} } catch (e) { stats = {} }

    let extras = {}
    try { extras = deps.getExtras ? (deps.getExtras(player) || {}) : {} } catch (e) { extras = {} }

    const ctx = {
        player,
        stats,
        extras,
        teamSize: Math.max(1, characters.length),
        equipmentSystem: deps.equipmentSystem,
        getWeaponBonus: deps.getWeaponBonus
    }

    return {
        auto,
        fighters: characters.map(c => buildFighter(c, side, ctx))
    }
}

function teamPower(player) {
    return resolveTeamCharacters(player).characters.reduce((t, c) => t + num(c.power), 0)
}

// =========================
// ⚔️ المحاكاة
// =========================

function simulate(teamA, teamB, rng = Math.random) {
    const SIDE_ICON = { A: '🟦', B: '🟥' }
    const rounds = []          // [{ lines: [{text, notable}], summary }]
    const all = teamA.concat(teamB)

    const alive = team => team.some(f => f.hp > 0)
    const pct = team => {
        const cur = team.reduce((t, f) => t + Math.max(0, f.hp), 0)
        const max = team.reduce((t, f) => t + f.maxHp, 0)
        return max > 0 ? cur / max : 0
    }

    let roundNo = 0

    for (roundNo = 1; roundNo <= CFG.MAX_ROUNDS && alive(teamA) && alive(teamB); roundNo++) {

        const enrage = roundNo > CFG.ENRAGE_FROM
            ? 1 + (roundNo - CFG.ENRAGE_FROM) * CFG.ENRAGE_STEP
            : 1

        const lines = []
        const say = (text, notable = false) => lines.push({ text, notable })

        const order = all
            .filter(f => f.hp > 0)
            .map(f => ({ f, key: f.speed + rng() * 4 }))
            .sort((x, y) => y.key - x.key)
            .map(x => x.f)

        for (const f of order) {

            if (f.hp <= 0) continue
            if (!alive(teamA) || !alive(teamB)) break

            const icon = SIDE_ICON[f.side]

            // 🔥 الحرق يعمل على المصاب نفسه عند دوره
            if (f.burn > 0) {
                const burnDmg = Math.max(1, Math.ceil(f.maxHp * CFG.BURN_PCT))
                f.hp -= burnDmg
                f.burn--
                say(`🔥 ${icon}${f.name} احترق -${burnDmg}`)
                if (f.hp <= 0) {
                    f.hp = 0
                    say(`💀 ${icon}${f.name} سقط`, true)
                    continue
                }
            }

            // 💫 الذهول يضيّع الدور
            if (f.stun > 0) {
                f.stun--
                f.stunImmune = 2
                say(`💫 ${icon}${f.name} مذهول — خسر دوره`, true)
                continue
            }
            if (f.stunImmune > 0) f.stunImmune--

            const enemies = (f.side === 'A' ? teamB : teamA).filter(e => e.hp > 0)
            if (!enemies.length) break
            const t = enemies[Math.floor(rng() * enemies.length)]
            const tIcon = SIDE_ICON[t.side]

            // اختيار الفعل: ألتميت (طاقة) > مهارة (كولداون) > عادي
            let kind = 'basic'
            if (f.energy >= CFG.ENERGY_ULT) kind = 'ultimate'
            else if (f.skillCd <= 0) kind = 'skill'

            if (kind === 'ultimate') f.energy -= CFG.ENERGY_ULT
            if (kind === 'skill') f.skillCd = CFG.SKILL_COOLDOWN
            else if (f.skillCd > 0) f.skillCd--

            f.energy += CFG.ENERGY_PER_ACTION

            const label = kind === 'ultimate' ? '🌟 ألتميت' : kind === 'skill' ? '✨ مهارة' : '⚔️ ضربة'

            // 💨 التفادي (الدقة الزائدة فوق 100 تلغي جزءًا منه)
            const dodgeChance = clamp(t.dodge - Math.max(0, f.accuracy - 100), 0, CFG.CAPS.dodge)
            if (rng() * 100 < dodgeChance) {
                say(`💨 ${tIcon}${t.name} تفادى ${label} ${icon}${f.name}`)
                continue
            }

            // 💥 حساب الضرر
            let dmg = f.atk * CFG.MULT[kind] * enrage
            dmg *= CFG.DEF_K / (CFG.DEF_K + t.def)
            dmg *= 1 - t.reduction / 100
            dmg *= 1 + (rng() * 2 - 1) * CFG.VARIANCE

            const crit = rollCrit(f.critRate, f.critDamage, rng)
            dmg *= crit.multiplier
            dmg = Math.max(1, Math.floor(dmg))

            // 🛡️ الدرع يمتص أولًا
            let absorbed = 0
            if (t.shield > 0) {
                absorbed = Math.min(dmg, t.shield)
                t.shield -= absorbed
            }
            const real = dmg - absorbed
            t.hp -= real
            t.energy += CFG.ENERGY_PER_HIT

            let extra = ''

            // 🩸 امتصاص الحياة
            if (f.lifesteal > 0 && real > 0) {
                const heal = Math.floor(real * f.lifesteal / 100)
                f.hp = Math.min(f.maxHp, f.hp + heal)
            }

            // 🪞 عكس الضرر
            if (t.reflect > 0 && real > 0) {
                const back = Math.floor(real * t.reflect / 100)
                if (back > 0) {
                    f.hp -= back
                    extra += ` 🪞-${back}`
                }
            }

            // الحالات: حرق من المهارة، ذهول من الألتميت
            if (t.hp > 0) {
                if (kind === 'skill' && rng() < CFG.BURN_CHANCE) {
                    t.burn = CFG.BURN_TURNS
                    extra += ' 🔥'
                }
                if (kind === 'ultimate' && rng() < CFG.STUN_CHANCE && t.stun === 0 && t.stunImmune === 0) {
                    t.stun = 1
                    extra += ' 💫'
                }
            }

            say(
                `${label} ${icon}${f.name} ➜ ${tIcon}${t.name}: ${dmg.toLocaleString('en-US')}` +
                `${crit.isCrit ? ' 💥' : ''}${absorbed ? ` (🛡️${absorbed})` : ''}${extra}`,
                kind === 'ultimate' || crit.isCrit
            )

            if (t.hp <= 0) {
                t.hp = 0
                say(`💀 ${tIcon}${t.name} سقط`, true)
            }
            if (f.hp <= 0) {
                f.hp = 0
                say(`💀 ${icon}${f.name} سقط (ضرر منعكس)`, true)
            }
        }

        rounds.push({
            no: roundNo,
            lines,
            summary:
                `📊 🟦 ${Math.round(pct(teamA) * 100)}% | 🟥 ${Math.round(pct(teamB) * 100)}%` +
                (enrage > 1 ? ` | 😡 +${Math.round((enrage - 1) * 100)}% ضرر` : '')
        })
    }

    const aAlive = alive(teamA)
    const bAlive = alive(teamB)

    let winner
    let timeout = false

    if (aAlive && !bAlive) winner = 'A'
    else if (bAlive && !aAlive) winner = 'B'
    else {
        // انتهت الجولات: الأعلى نسبة صحة متبقية، وعند التعادل يفوز المدافع
        timeout = true
        const pa = pct(teamA)
        const pb = pct(teamB)
        winner = pa > pb ? 'A' : 'B'
    }

    return { winner, timeout, rounds, pctA: pct(teamA), pctB: pct(teamB) }
}

// نص السجل — لو طويل نعرض الأحداث المهمة فقط
function formatLog(sim, maxLines = 70) {
    const total = sim.rounds.reduce((t, r) => t + r.lines.length + 2, 0)
    const onlyNotable = total > maxLines

    const out = []
    for (const r of sim.rounds) {
        out.push(`\n🔁 الجولة ${r.no}`)
        for (const l of r.lines) {
            if (!onlyNotable || l.notable) out.push(l.text)
        }
        out.push(r.summary)
    }
    return out.join('\n')
}

// =========================
// 🏅 MMR و المكافآت
// =========================

// Elo: الفوز على الأقوى يعطي أكثر. صفري المجموع تقريبًا فلا يتضخم الـMMR
function eloChange(winnerMmr, loserMmr) {
    const expected = 1 / (1 + Math.pow(10, (loserMmr - winnerMmr) / 400))
    const gain = clamp(
        Math.round(CFG.ELO_K * (1 - expected)),
        CFG.ELO_MIN_GAIN,
        CFG.ELO_MAX_GAIN
    )
    return { gain, loss: gain }
}

// مكافأة المال تكبر عند الفوز على خصم أعلى منك
function moneyReward(winnerMmr, loserMmr) {
    const mult = clamp(
        1 + (loserMmr - winnerMmr) / 800,
        CFG.MONEY_MULT_MIN,
        CFG.MONEY_MULT_MAX
    )
    return { mult, money: Math.floor(CFG.BASE_MONEY * mult / 1000) * 1000 }
}

module.exports = {
    CFG,
    rollCrit,
    resolveTeamCharacters,
    buildFighter,
    buildTeam,
    teamPower,
    simulate,
    formatLog,
    eloChange,
    moneyReward
}
