const Ship = require('./models/Ship')
const Player = require('./models/Player')

// نفس القيم بالضبط من clanLevel.js (المستوى الأقصى، الخبرة المطلوبة، المكافآت)

const MAX_LEVEL = 25

// =========================================================
// 📈 منحنى خبرة السفينة — تم تعديله ليكون "صعب شوي" (متوسط) بدل
// المنحنى الخطي القديم، عشان التلفيل ياخذ وقت ومتعة ولا يصير سريع.
// المنحنى تربيعي: كل ما زاد المستوى، تزيد الخبرة المطلوبة بشكل
// متسارع (مو ثابت الزيادة زي قبل). عدّل BASE / STEP / CURVE براحتك.
// =========================================================
const BASE_XP = 1500      // خبرة اللفل الأول (كانت 1000)
const STEP_XP = 700       // زيادة خطية أساسية لكل مستوى (كانت 500)
const CURVE_XP = 35       // مُعامل التسارع التربيعي (0 = يرجع خطي زي قبل)

function getRequiredXP(level) {

    const n = Math.max(0, level - 1)

    return BASE_XP + (n * STEP_XP) + Math.floor(n * n * CURVE_XP)

}

async function addShipXP(shipId, amount) {

    const ship = await Ship.findOne({
        shipId
    })

    if (!ship) return null

    if (ship.level >= MAX_LEVEL) {

        return {
            ship,
            leveledUp: false
        }

    }

    ship.xp += amount

    let leveledUp = false

    while (

        ship.level < MAX_LEVEL &&
        ship.xp >= ship.nextLevelXp

    ) {

        ship.xp -= ship.nextLevelXp

        ship.level++

        // مكافأة كل عضو بالطاقم

        for (const memberId of ship.members) {

            await Player.updateOne(

                {
                    userId: memberId
                },

                {
                    $inc: {

                        money: 250000,

                        shipCoins: 50

                    }

                }

            )

        }

        if (ship.level >= MAX_LEVEL) {

            ship.level = MAX_LEVEL
            ship.xp = 0
            ship.nextLevelXp = 0

            break

        }

        ship.nextLevelXp =
            getRequiredXP(ship.level)

        leveledUp = true

    }

    await ship.save()

    return {

        ship,

        leveledUp

    }

}

module.exports = {

    MAX_LEVEL,

    getRequiredXP,

    addShipXP

}
