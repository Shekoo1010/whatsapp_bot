const Ship = require('../models/Ship')
const Player = require('../models/Player')
const getPlayerPower = require('./getPlayerPower')

async function updateShipPower(shipId) {

    const ship = await Ship.findOne({ shipId })

    if (!ship) return

    let totalPower = 0

    // ⚡ استعلام واحد خفيف (power فقط) لكل أعضاء السفينة
    // بدل findOne بمستند كامل (بكل شخصياته) لكل عضو بالتتابع — نفس المجموع بالضبط
    const members = [...new Set(ship.members || [])]

    if (members.length) {
        const docs = await Player.find({ userId: { $in: members } })
            .select('userId characters.power')
            .lean()

        for (const player of docs) {
            totalPower += getPlayerPower(player)
        }
    }

    ship.power = totalPower

    await ship.save()

    return totalPower

}

module.exports = updateShipPower
