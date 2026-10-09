function calculateDamageAdvanced(attacker, defender) {

    // التفادي
    const dodgeChance =
        Math.max(
            0,
            (defender.dodge || 0) - ((attacker.accuracy || 0) / 2)
        )

    const dodge =
        Math.random() * 100 < dodgeChance

    if (dodge) {
        return {
            damage: 0,
            crit: false,
            dodge: true
        }
    }

    // الهجوم الأساسي
    let damage =
        (attacker.power || 0) +
        (attacker.attack || 0)

    // 📖 بونص كتاب المجموعة: هجوم في المضاربات (One Piece / Wuthering Waves)
    if ((attacker.codexSpec || 0) > 0) {
        damage = Math.floor(damage * (1 + attacker.codexSpec / 100))
    }

    // الدفاع
    damage -=
        (defender.defense || 0)

    if (damage < 1) {
        damage = 1
    }

    // الدرع
    if ((defender.shield || 0) > 0) {

        damage -= defender.shield

        if (damage < 1) {
            damage = 1
        }
    }

    // كريتيكال
    let crit = false

    const critChance =
        (attacker.critRate || 0) +
        (attacker.crit || 0)

    if (Math.random() * 100 < critChance) {

        crit = true

        const critBonus =
            attacker.critDamage || 50

        damage = Math.floor(
            damage * (1 + critBonus / 100)
        )
    }

    return {
        damage: Math.floor(damage),
        crit,
        dodge: false
    }
}

module.exports = {
    calculateDamageAdvanced
}
