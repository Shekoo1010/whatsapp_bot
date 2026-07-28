const Player = require("../models/Player")
const Bank = require("../models/Bank")

const { DAILY_BANK_MONEY } = require("./config")

async function resetBank() {

    // إعادة رصيد البنك
    await Bank.updateOne(
        {},

        {
            $set: {
                money: DAILY_BANK_MONEY,
                lastReset: new Date().toISOString()
            }
        },

        {
            upsert: true
        }
    )

    // إعادة السماح بالاقتراض
    await Player.updateMany(
        {},

        {
            $set: {
                "bank.borrowedToday": false
            }
        }
    )

    console.log(
        "🏦 Bank Reset Completed"
    )

}

function millisecondsUntilMidnight() {

    const now = new Date()

    const saudiNow = new Date(
        now.toLocaleString(
            "en-US",
            {
                timeZone: "Asia/Riyadh"
            }
        )
    )

    const next = new Date(saudiNow)

    next.setDate(
        next.getDate() + 1
    )

    next.setHours(0,0,0,0)

    return next - saudiNow

}

function startBankReset() {

    const firstDelay =
        millisecondsUntilMidnight()

    setTimeout(() => {

        resetBank()

        setInterval(
            resetBank,
            24 * 60 * 60 * 1000
        )

    }, firstDelay)

}

module.exports = {

    resetBank,

    startBankReset

}
