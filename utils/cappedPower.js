// =====================================================================
// utils/cappedPower.js
// قوة اللاعب للترتيب = مجموع قوة أول N شخصية بنفس ترتيب .شخصياتي (المخزّن بالمصفوفة)،
// حيث N = سعة مخزونه (maxCharacters). الشخصيات تترتب تلقائياً (رتبة ثم قوة،
// والشخصية رقم 1 ثابتة) فأول N هي الأعلى رتبة/قوة، والزائدة عن المخزون لا تُحسب.
// مثال: 180 شخصية والمخزون 170 → تُحسب أول 170 فقط.
// يُستخدم بنفس الطريقة في موقع الترتيب وفي أمر .الترتيب بالواتس.
// =====================================================================

const DEFAULT_CAP = 30

function getCap(player) {
    const c = Math.floor(Number(player && player.maxCharacters))
    return c > 0 ? c : DEFAULT_CAP
}

function cappedPower(player) {
    const chars = (player && Array.isArray(player.characters)) ? player.characters : []
    const cap = getCap(player)
    let total = 0
    for (let i = 0; i < chars.length && i < cap; i++) total += Number(chars[i] && chars[i].power) || 0
    return total
}

module.exports = { cappedPower, getCap, DEFAULT_CAP }
