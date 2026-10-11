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

    // حماية: لاعب بدون صناديق أو شخصيات ما يسبب كراش
    player.boxes = player.boxes || {}
    if (!Array.isArray(player.characters)) player.characters = []

    const roll = Math.random() * 100

    // =========================
    // 💰 المال 20%
    // =========================
    if (roll < 20) {

        const amount = random(10000, 1000000)

        player.money = (player.money || 0) + amount

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

        const xp = random(100, 1000)

        player.xp = (player.xp || 0) + xp

        await player.save()

        return {
            type: "xp",
            text:
`📚 الخبرة

+${xp.toLocaleString()} XP`
        }

    }

    // =========================
// 🎟️ السحبات 20%
// =========================
if (roll < 60) {

    const pulls = random(1, 5)

player.pulls = (player.pulls || 0) + pulls

await player.save()

return {

    type: "pulls",

    text:
`🎟️ السحبات

+${pulls}`

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

        player.boxes.legendary = (player.boxes.legendary || 0) + 1

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

        player.boxes.sss_high = (player.boxes.sss_high || 0) + 1

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

    player.boxes.sss_chance = (player.boxes.sss_chance || 0) + 1

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
