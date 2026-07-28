async function repayDebt(player, amount) {

    amount = Number(amount)

    if (!amount || amount <= 0)
        return 0

    if (!player.bank)
        return amount

    if (player.bank.debt <= 0)
        return amount

    // إذا كان الربح أقل من الدين
    if (amount <= player.bank.debt) {

        player.bank.debt -= amount

        if (player.bank.loanMoney > 0) {

            player.bank.loanMoney =
                Math.max(
                    0,
                    player.bank.loanMoney - amount
                )

        }

        await player.save()

        return 0

    }

    // إذا كان الربح أكبر من الدين
    const remaining =
        amount - player.bank.debt

    if (player.bank.loanMoney > 0) {

        player.bank.loanMoney =
            Math.max(
                0,
                player.bank.loanMoney - player.bank.debt
            )

    }

    player.bank.debt = 0

    await player.save()

    return remaining

}

module.exports = {

    repayDebt

}
