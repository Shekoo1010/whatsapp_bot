const Bank = require("../models/Bank")

const { takeLoan } = require("./loan")
const { repayDebt } = require("./repay")
const { startBankReset } = require("./bankReset")

async function getBank() {

    let bank = await Bank.findOne()

    if (!bank) {

        bank = await Bank.create({

            money: 100000000,

            lastReset: ""

        })

    }

    return bank

}

async function loan(player, amount) {

    const bank = await getBank()

    return await takeLoan(
        bank,
        player,
        amount
    )

}

async function repay(player, amount) {

    return await repayDebt(
        player,
        amount
    )

}

async function bankInfo() {

    return await getBank()

}

function start(sock) {

    startBankReset()

    console.log(
        "🏦 Bank Scheduler Started"
    )

}

module.exports = {

    start,

    loan,

    repay,

    bankInfo

}
