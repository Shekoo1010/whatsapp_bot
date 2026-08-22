function getTotalStats(player) {

    // 🔧 إصلاح: كانت atk = 0 ثابتة دايماً (كود ميت ما يقرأ من player إطلاقاً)،
    // فإحصائية الهجوم الأساسية للاعب كانت تتصفر بالكامل بكل قتال PvP فعلي
    // (.هجوم الخصم/.مهارة/.ألتميت)، وما يبقى يأثر على الضرر غير بونص
    // المعدات الصغير + power. الآن تقرأ player.attack بنفس الافتراضي (500)
    // المستخدم بمكان آخر بالكود (بداية .قتال pvp) عشان يتطابق الحساب
    let atk = player.attack || 500
    let hp = player.hp || 0

    let crit = player.crit || 0
    let dodge = player.dodge || 0

    let defense = player.defense || 0
let accuracy = player.accuracy || 100
let critRate = player.critRate || 5
let critDamage = player.critDamage || 50
let shield = player.shield || 0
let lifesteal = player.lifesteal || 0

    return {
        attack: atk,
        hp,
        crit,
        dodge,
        defense,
        accuracy,
        critRate,
        critDamage,
        shield,
        lifesteal
    }
}

module.exports = {
    getTotalStats
}
