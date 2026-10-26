const Player = require('../models/Player')

const rewards = require('../data/coopRewards')

// =========================
// Helpers
// =========================

function random(min, max) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min

}

function chance(percent) {

    return Math.random() * 100 < percent

}
// =========================
// Give Rewards
// =========================

async function giveRewards(coop) {

    const table = rewards[
        coop.boss.rank
    ]

    if (!table) {

        return []

    }

    const result = []

    const leaderboard =

        [...coop.leaderboard]

        .sort(

            (a, b) =>

            b.damage - a.damage

        )

    for (let i = 0; i < leaderboard.length; i++) {

        const row = leaderboard[i]

        const player =

            await Player.findOne({

                userId: row.userId

            })

        if (!player) {

            continue

        }

        const reward = {

            gold: random(

                table.gold.min,

                table.gold.max

            ),

            exp: random(

                table.exp.min,

                table.exp.max

            ),

            coins: random(

                table.coins.min,

                table.coins.max

            ),

            boxes: []

        }
              // =========================
        // Equipment Boxes
        // =========================

        for (const box of table.boxes) {

            if (

                chance(box.chance)

            ) {

                reward.boxes.push({

                    id: box.id,

                    amount: box.amount

                })

            }

        }

        // =========================
        // Top 3 Bonus
        // =========================

        if (i === 0) {

            reward.gold += 500000
            reward.coins += 150

            reward.boxes.push({

                id: "sssHigh",

                amount: 1

            })

        }

        else if (i === 1) {

            reward.gold += 300000
            reward.coins += 100

            reward.boxes.push({

                id: "sssChance",

                amount: 1

            })

        }

        else if (i === 2) {

            reward.gold += 150000
            reward.coins += 50

        }

        // =========================
        // Give Rewards
        // =========================

        // مفاتيح الصناديق عند اللاعب (player.boxes): sss_chance / sss_high
        const BOX_KEYS = {
            sssChance: "sss_chance",
            sssHigh: "sss_high"
        }

        player.money = (player.money || 0) + reward.gold

        // الخبرة: الحقل xp (والرفع التلقائي يتم عند save)
        player.xp = (player.xp || 0) + reward.exp

        player.coopCoins =
            (player.coopCoins || 0)
            + reward.coins

        if (!player.boxes) {
            player.boxes = {}
        }

        for (const box of reward.boxes) {

            const key = BOX_KEYS[box.id] || box.id

            player.boxes[key] =
                (player.boxes[key] || 0)
                + box.amount

        }

        if (player.markModified) player.markModified('boxes')

        await player.save()

        result.push({

            rank: i + 1,

            userId: row.userId,

            name: row.name,

            damage: row.damage,

            rewards: reward

        })

    }

    return result

}
// =========================
// Exports
// =========================

module.exports = {

    giveRewards

}
