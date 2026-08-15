function getTotalStats(player) {

    let atk = 0
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
