const useEXAbilities = require("./utils/useEXAbilities")

// =========================================================
// نفس معادلة حساب القوة الموجودة بالضبط في clanBattleEngine.js
// (لم تتغير أي قيمة أو معامل)
// =========================================================

function calculatePower(player) {

    let totalPower = 0

    for (const character of player.characters) {

        let power = character.power || 0

        const ex = useEXAbilities(character)

        power += ex.attackBonus * 100
        power += ex.defenseBonus * 80
        power += ex.critRate * 60
        power += ex.critDamage * 40
        power += ex.dodge * 50
        power += ex.shield * 40
        power += ex.lifesteal * 50
        power += ex.reflect * 50

        totalPower += power

    }

    return Math.floor(totalPower)

}

async function shipBattle(playerA, playerB) {

    const powerA = calculatePower(playerA)
    const powerB = calculatePower(playerB)

    return {

        powerA,
        powerB,

        winner:
            powerA >= powerB
                ? playerA.userId
                : playerB.userId

    }

}

module.exports = shipBattle
module.exports.calculatePower = calculatePower
