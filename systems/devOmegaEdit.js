// =====================================================================
// systems/devOmegaEdit.js
// أمر المطور: .تعديل_اوميقا — تغيير نوع قدرة أوميقا على شخصيتك (مثلاً دفاع ← هجوم)
//
// كيف يشتغل "بكل الأماكن":
// كل أنظمة البوت (هجوم الزعيم، القتال، التحدي، المضاربة، الموقع، .شخصياتي ...)
// تقرأ قدرات الشخصية من character.urAbilities حسب (type / value).
// فالأمر يعدّل نفس الكائن المحفوظ بقاعدة البيانات، وبالتالي التغيير يظهر فوراً بكل مكان
// بدون ما نلمس أي نظام ثاني.
//
// الصيغ:
//   .تعديل_اوميقا                           ← شرح + الأنواع
//   .تعديل_اوميقا 2                         ← قدرات الشخصية رقم 2 (الأوميقا معلّمة 🌌)
//   .تعديل_اوميقا 2 5 هجوم                  ← القدرة رقم 5 تصير هجوم (تحافظ على نفس القيمة)
//   .تعديل_اوميقا 2 5 هجوم 45               ← نفس الشي لكن بقيمة 45%
// =====================================================================

// اسم النوع بالعربي/الإنجليزي ← النوع الداخلي المستخدم بأنظمة البوت
const TYPE_ALIASES = {
    attack: 'attack', 'هجوم': 'attack',
    bossDamage: 'bossDamage', 'زعيم': 'bossDamage', 'بوس': 'bossDamage', 'ضرر_الزعماء': 'bossDamage', 'ضرر_زعيم': 'bossDamage',
    defense: 'defense', 'دفاع': 'defense',
    lifesteal: 'lifesteal', 'امتصاص': 'lifesteal', 'مص': 'lifesteal',
    critRate: 'critRate', 'حرج': 'critRate', 'كريت': 'critRate',
    shield: 'shield', 'درع': 'shield',
    reflect: 'reflect', 'عكس': 'reflect',
    dodge: 'dodge', 'مراوغة': 'dodge'
}

const TYPE_LABEL = {
    attack: '⚔️ هجوم', bossDamage: '👹 ضرر الزعماء', defense: '🛡️ دفاع',
    lifesteal: '🩸 امتصاص حياة', critRate: '🎯 حرج', shield: '💎 درع',
    reflect: '🪞 عكس ضرر', dodge: '👻 مراوغة'
}

const HELP =
`🛠️ تعديل قدرة أوميقا (للمطور فقط)

.تعديل_اوميقا <رقم الشخصية>
↳ يعرض قدرات الشخصية

.تعديل_اوميقا <رقم الشخصية> <رقم القدرة> <النوع> [القيمة]
↳ يغيّر نوع القدرة (القيمة اختيارية)

الأنواع: هجوم · زعيم · دفاع · امتصاص · حرج · درع · عكس · مراوغة

مثال: .تعديل_اوميقا 2 5 هجوم
مثال: .تعديل_اوميقا 2 5 هجوم 45`

function parseType(word) {
    if (!word) return null
    const w = String(word).trim().replace(/\s+/g, '_')
    return TYPE_ALIASES[w] || TYPE_ALIASES[w.toLowerCase()] || null
}

function toNum(s) {
    const n = Number(String(s).replace('%', ''))
    return Number.isFinite(n) ? n : null
}

// يختار من بنك أوميقا قدرة بنفس النوع الجديد وأقرب قيمة للمطلوبة (للاسم والوصف فقط)،
// ولو في أكثر من خيار بنفس القيمة يفضّل اللي ما هي موجودة على الشخصية
function pickReplacement(omegaAbilities, type, wantedValue, takenNames) {
    const pool = omegaAbilities.filter(a => a.type === type)
    if (!pool.length) return null
    const ranked = pool
        .map(a => ({ a, diff: Math.abs(a.value - wantedValue), taken: takenNames.has(a.name) ? 1 : 0 }))
        .sort((x, y) => (x.diff - y.diff) || (x.taken - y.taken))
    return ranked[0].a
}

function abilityLine(a, i, omegaNames) {
    const mark = omegaNames.has(a.name) ? '🌌' : '▫️'
    return `${i + 1}) ${mark} ${a.name} — ${TYPE_LABEL[a.type] || a.type} ${a.value}%`
}

async function handleEditOmega({ text, msg, Player, safeSend, isOwner, omegaAbilities, userId }) {
    const jid = msg.key.remoteJid
    const reply = t => safeSend(jid, { text: t })

    if (!isOwner(msg)) return reply('❌ هذا الأمر للمطور فقط')

    const args = String(text).trim().split(/\s+/).slice(1)
    if (!args.length) return reply(HELP)

    const player = await Player.findOne({ userId })
    if (!player) return reply('❌ ما لقيت حسابك.')

    const charIndex = parseInt(args[0], 10)
    const char = (player.characters || [])[charIndex - 1]
    if (!char) return reply('❌ رقم الشخصية غير صحيح.')

    const list = Array.isArray(char.urAbilities) ? char.urAbilities : []
    const omegaNames = new Set(omegaAbilities.map(a => a.name))

    // عرض القدرات فقط
    if (args.length === 1) {
        if (!list.length) return reply(`❌ ${char.name} ما عندها قدرات.`)
        return reply(
`🧿 ${char.name} — القدرات
(🌌 = قدرة أوميقا قابلة للتعديل)

${list.map((a, i) => abilityLine(a, i, omegaNames)).join('\n')}

للتعديل: .تعديل_اوميقا ${charIndex} <رقم القدرة> <النوع> [القيمة]`)
    }

    const abIndex = parseInt(args[1], 10)
    const current = list[abIndex - 1]
    if (!current) return reply('❌ رقم القدرة غير صحيح.')

    if (!omegaNames.has(current.name)) {
        return reply('❌ هذي مو قدرة أوميقا — الأمر يعدّل قدرات الأوميقا فقط (المعلّمة بـ 🌌).')
    }

    const newType = parseType(args[2])
    if (!newType) return reply('❌ نوع غير معروف.\n\n' + HELP)

    let wanted = current.value
    if (args[3] !== undefined) {
        wanted = toNum(args[3])
        if (wanted === null || wanted <= 0 || wanted > 100) {
            return reply('❌ القيمة لازم تكون رقم بين 1 و 100.')
        }
    }

    const taken = new Set(list.filter((_, i) => i !== abIndex - 1).map(a => a.name))
    const picked = pickReplacement(omegaAbilities, newType, wanted, taken)
    if (!picked) return reply('❌ ما فيه قدرة أوميقا بهذا النوع.')

    // القيمة دائماً = المطلوبة (أو قيمة القدرة الحالية لو ما حددت)، والوصف يتحدّث معها
    const value = wanted
    const description = value === picked.value
        ? picked.description
        : picked.description.replace(/\+?\d+(?:\.\d+)?%/, `+${value}%`)

    const before = abilityLine(current, abIndex - 1, omegaNames)

    // ⚠️ نكتب نسخة جديدة — لا نعدّل كائن البنك المشترك (omegaAbilities) أبداً
    char.urAbilities[abIndex - 1] = { ...picked, value, description }

    player.markModified('characters')
    await player.save()

    return reply(
`✅ تم تعديل القدرة على ${char.name}

قبل: ${before}
بعد: ${abilityLine(char.urAbilities[abIndex - 1], abIndex - 1, omegaNames)}

🌐 يسري فوراً على الزعيم والقتال والتحدي والمضاربة وكل الأوامر.`)
}

module.exports = { handleEditOmega, parseType, pickReplacement, TYPE_ALIASES }
