// =========================================================
// متجر السفينة — متجر واحد، لكن خاص بكل عضو على حدة
// نفس عناصر وخصائص متجر العشيرة القديم (clanShop.js) بدون أي
// تغيير بالأسعار أو الحدود أو مستوى الفتح. مشتريات كل عضو
// تُحسب وتُخزَّن عنده هو فقط (بجانب Player)، فما تأثّر على بقية
// أعضاء نفس السفينة إطلاقاً.
// =========================================================

const SHOP_ITEMS = [

    {
        id: "pull_ticket",
        name: "🎟️ تذكرة سحب",
        type: "pulls",
        amount: 1,
        price: 10,
        limit: 5,
        unlockLevel: 1
    },

    {
        id: "legendary_box",
        name: "📦 صندوق ليجندري",
        type: "legendary_box",
        amount: 1,
        price: 10,
        limit: 5,
        unlockLevel: 1
    },

    {
        id: "sss_chance",
        name: "✨ SSS Chance",
        type: "sss_chance",
        amount: 1,
        price: 20,
        limit: 5,
        unlockLevel: 5
    },

    {
        id: "sss_high",
        name: "💎 SSS High",
        type: "sss_high",
        amount: 1,
        price: 20,
        limit: 5,
        unlockLevel: 15
    },

    {
        id: "storage",
        name: "📦 زيادة سعة +5",
        type: "storage",
        amount: 5,
        price: 100,
        limit: 1,
        unlockLevel: 10
    },

    {
        id: "summon_boss",
        name: "👹 استدعاء زعيم السفينة",
        type: "boss",
        amount: 1,
        price: 500,
        limit: 1,
        unlockLevel: 12
    },

    {
        id: "sss_shard",
        name: "🧩 شظية SSS عشوائية",
        type: "sss_shard",
        amount: 1,
        price: 200,
        limit: 1,
        unlockLevel: 18
    },

    {
        id: "rename",
        name: "✏️ تغيير اسم السفينة",
        type: "rename",
        amount: 1,
        price: 1000,
        limit: 1,
        unlockLevel: 25
    }

]

// شرط الفتح حسب مستوى السفينة، لكن المتجر نفسه واحد فقط —
// وكل عضو يشتري منه بشكل مستقل تماماً عن بقية الطاقم.
function getShipShop(level) {

    return SHOP_ITEMS.map(item => ({

        ...item,

        locked:
            level < item.unlockLevel

    }))

}

module.exports = {

    SHOP_ITEMS,

    getShipShop

}
