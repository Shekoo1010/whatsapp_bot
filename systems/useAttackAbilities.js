const PLAYER_SKILLS = {

"👁️ شارينغان": {
    multiplier: 1.8,
    text: "👁️ شارينغان ×1.8"
},

"⚔️ عين الصقر": {
    multiplier: 1.25,
    text: "⚔️ عين الصقر +25%"
},

"💀 سوسانو": {
    multiplier: 1.20,
    text: "💀 سوسانو +20%"
},

"🐉 تنين الأساطير": {
    multiplier: 1.30,
    text: "🐉 تنين الأساطير +30%"
},

"☄️ قوة الكواكب": {
    multiplier: 1.35,
    text: "☄️ قوة الكواكب +35%"
},

"⚔️ سيد المعارك": {
    multiplier: 1.50,
    text: "⚔️ سيد المعارك +50%"
},

"👹 قوة الشياطين": {
    multiplier: 1.45,
    text: "👹 قوة الشياطين +45%"
},

"🌟 الحاكم المطلق": {
    multiplier: 2.0,
    text: "🌟 الحاكم المطلق ×2"
}

}

// ⚡ تم حذف نظام "القدرات العشوائية" بالكامل من هذا الملف —
// ما عاد فيه أي Math.random() هنا. الدالة الآن تطبّق فقط قدرات
// اللاعب الدائمة (PLAYER_SKILLS)، وكل قدرة يملكها اللاعب
// (player.specialAbilities) تُفعَّل 100% في كل هجوم، بدون فحص فرصة.
function useAttackAbilities({ player, character, damage }) {

    let playerText = ''

    const addSkill = (name) => {

        const skill = PLAYER_SKILLS[name]

        if (!skill) return

        if (player.specialAbilities?.includes(name)) {

            damage = Math.floor(
                damage * skill.multiplier
            )

            playerText += `${skill.text}\n`
        }

    }

    addSkill("👁️ شارينغان")
    addSkill("⚔️ عين الصقر")
    addSkill("💀 سوسانو")
    addSkill("🐉 تنين الأساطير")
    addSkill("☄️ قوة الكواكب")
    addSkill("⚔️ سيد المعارك")
    addSkill("👹 قوة الشياطين")
    addSkill("🌟 الحاكم المطلق")

    return {
        damage,
        playerText
    }

}

module.exports = useAttackAbilities
