const { MIN_LOAN, MAX_LOAN } = require("./config")

async function takeLoan(bankData, player, amount) {

    amount = Number(amount)

    if (isNaN(amount)) {
        return {
            ok: false,
            message: "❌ اكتب مبلغًا صحيحًا."
        }
    }

    if (amount < MIN_LOAN) {
        return {
            ok: false,
            message:
`❌ أقل مبلغ يمكن اقتراضه هو ${MIN_LOAN.toLocaleString()}`
        }
    }

    if (amount > MAX_LOAN) {
        return {
            ok: false,
            message:
`❌ أعلى مبلغ يمكن اقتراضه هو ${MAX_LOAN.toLocaleString()}`
        }
    }

    if (player.bank.borrowedToday) {
        return {
            ok: false,
            message: "❌ لقد اقترضت اليوم بالفعل."
        }
    }

    if (bankData.money < amount) {
        return {
            ok: false,
            message:
`🏦 البنك لا يملك هذا المبلغ.

الرصيد الحالي:
${bankData.money.toLocaleString()}`
        }
    }

    bankData.money -= amount

player.money += amount          // <-- أضف هذا السطر

player.bank.loanMoney += amount
player.bank.debt += amount
player.bank.borrowedToday = true
player.bank.lastBorrowDate = new Date().toISOString()

    await bankData.save()
    await player.save()

    return {
        ok: true,
        message:
`🏦 تم منحك قرضًا بقيمة:

💰 ${amount.toLocaleString()}

📌 سيتم خصمه تلقائيًا من أي أرباح تحصل عليها حتى يتم سداد الدين بالكامل.`
    }

}

module.exports = {
    takeLoan
}
