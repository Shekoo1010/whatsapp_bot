const Ship = require('../models/Ship')
const Player = require('../models/Player')
const getPlayerPower = require('./getPlayerPower')

async function updateShipPower(shipId) {

    const ship = await Ship.findOne({ shipId })

    if (!ship) return

    let totalPower = 0

    for (const memberId of ship.members) {

        const player = await Player.findOne({
            userId: memberId
        })

        if (!player) continue

        totalPower += getPlayerPower(player)

    }

    ship.power = totalPower

    await ship.save()

    return totalPower

}

module.exports = updateShipPower
