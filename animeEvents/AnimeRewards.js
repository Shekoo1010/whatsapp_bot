const Player = require("../models/Player")
const characters = require("../characters.json")

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomSSS() {

    const list = characters.filter(
        c => c.rarity === "SSS"
    )

    if (!list.length) return null

    return JSON.parse(
        JSON.stringify(
            list[Math.floor(Math.random() * list.length)]
        )
    )

}

function randomLegendary() {

    const list = characters.filter(
        c => c.rarity === "اسطوري"
    )

    if (!list.length) return null

    return JSON.parse(
        JSON.stringify(
            list[Math.floor(Math.random() * list.length)]
        )
    )

}

async function giveAnimeReward(player) {

    const roll = Math.random() * 100

    // =========================
    // 💰 المال 20%
    // =========================
    if (roll < 20) {

        const amount = random(10000, 1000000)

        player.money += amount

        await player.save()

        return {
            type: "money",
            text:
`💰 المال

+${amount.toLocaleString()}`
        }

    }

    // =========================
    // 📚 XP 20%
    // =========================
    if (roll < 40) {

        const xp = random(1000, 10000)

        player.xp += xp

        await player.save()

        return {
            type: "xp",
            text:
`📚 الخبرة

+${xp.toLocaleString()} XP`
        }

    }

    // =========================
    // 🎟️ التذاكر 20%
    // =========================
    if (roll < 60) {

        const tickets = random(1, 5)

        player.eggTickets += tickets

        await player.save()

        return {

            type: "tickets",

            text:
`🎟️ التذاكر

+${tickets}`

        }

    }

    // =========================
    // 🌟 شخصية أسطورية 10%
    // =========================
    if (roll < 70) {

        const char = randomLegendary()

        if (!char) {

            return {
                type: "none",
                text: "❌ لا توجد شخصيات أسطورية."
            }

        }

        player.characters.push(char)

        await player.save()

        return {

            type: "legendary",

            text:
`🌟 شخصية أسطورية

👤 ${char.name}

⚔️ ${char.power}`

        }

    }

    // =========================
    // 📦 صندوق أسطوري 15%
    // =========================
    if (roll < 85) {

        player.boxes.legendary += 1

        await player.save()

        return {

            type: "legendary_box",

            text:
`📦 صندوق أسطوري

+1`

        }

    }

    // =========================
    // ⭐ شخصية SSS 5%
    // =========================
    if (roll < 90) {

        const char = randomSSS()

        if (!char) {

            return {
                type: "none",
                text: "❌ لا توجد شخصيات SSS."
            }

        }

        player.characters.push(char)

        await player.save()

        return {

            type: "sss",

            text:
`⭐ شخصية SSS

👤 ${char.name}

⚔️ ${char.power}`

        }

    }

    // =========================
    // 📦 صندوق SSS High 5%
    // =========================
    if (roll < 95) {

        player.boxes.sss_high += 1

        await player.save()

        return {

            type: "sss_high",

            text:
`📦 صندوق SSS High

+1`

        }

    }

    // =========================
    // 📦 صندوق SSS Chance 5%
    // =========================

    player.boxes.sss_chance += 1

    await player.save()

    return {

        type: "sss_chance",

        text:
`📦 صندوق SSS Chance

+1`

    }

}

module.exports = {
    giveAnimeReward
}
