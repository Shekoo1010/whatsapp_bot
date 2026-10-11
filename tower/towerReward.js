const characters = require("../characters.json")
const urAbilities = require("../urAbilities")

// 🔒 حدّ القوة الأدنى للشخصيات المسموحة كجائزة برج.
// الشخصيات الأضعف من هذا الحد ما تأتي بالجوائز، لأن جائزة البرج تُرفع لقوة
// 13000 (تطوير fixed)، فلو كانت قوتها الأصلية أقل تصير أقل من بقية الشخصيات
// بأمر .تطوير. (6600 = نفس حدّ evolutionType 'fixed' بأمر التطوير)
const MIN_REWARD_POWER = 6600

function getRandomSSSCharacter() {

    const allSSS = characters.filter(
        c => c.rarity === "SSS"
    )

    // نحتفظ فقط بالشخصيات قوتها 6600 وفوق
    const eligible = allSSS.filter(
        c => (Number(c.power) || 0) >= MIN_REWARD_POWER
    )

    // احتياط: لو ما بقي أي شخصية مؤهلة نرجع للقائمة الكاملة بدل ما يتعطل الأمر
    const sssCharacters = eligible.length ? eligible : allSSS

    return JSON.parse(
        JSON.stringify(
            sssCharacters[
                Math.floor(
                    Math.random() *
                    sssCharacters.length
                )
            ]
        )
    )

}

function addRandomAbilities(character, count) {

    const pool = [...urAbilities]

    character.urAbilities = []

    while (
        character.urAbilities.length < count &&
        pool.length
    ) {

        const totalChance =
            pool.reduce(
                (sum, a) => sum + a.chance,
                0
            )

        let roll =
            Math.random() * totalChance

        let index = 0

        for (
            let i = 0;
            i < pool.length;
            i++
        ) {

            roll -= pool[i].chance

            if (roll <= 0) {

                index = i
                break

            }

        }

        character.urAbilities.push(
            pool[index]
        )

        pool.splice(index, 1)

    }

    return character

}

async function createTowerReward() {

    const character =
        getRandomSSSCharacter()

    character.rarity = "SSS"
    character.power = 13000

    character.evolutionLevel = 2
    character.evolutionType = "fixed"

    addRandomAbilities(
        character,
        2
    )

    return character

}

module.exports = {

    createTowerReward

}
