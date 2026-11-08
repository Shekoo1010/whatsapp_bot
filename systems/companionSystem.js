// =====================================================================
// systems/companionSystem.js
// 🐾 منطق الرفيق للموقع — نفس أوامر الواتس بالضبط (index.js):
//   .فقس_رفيق / .اطعام_رفيق / .شراء_طعام_رفيق / .تسمية_رفيق / .رفيق_صورة / .بيع_رفيق
// - نفس الحقول: companion{key,customName,level,foodProgress,imageIndex,obtainedAt}
//   companionFood · companionEggs · companionShop{lastReset,buysToday} · money · pikachuBonusUnlocked
// - كل عملية تحديث ذري (findOneAndUpdate بشرط) فلا يحصل تكرار/تجاوز لو ضغط اللاعب
//   من الموقع والواتس بنفس اللحظة.
// - الاستخدام (index.js):
//     const companionSystem = require('./systems/companionSystem').create({ Player, companionsData, getSaudiDate })
//     registerCharacterSite(app, Player, { ..., companionSystem })
// =====================================================================

const FOOD_PRICE = 1000       // نفس .شراء_طعام_رفيق
const SELL_PER_LEVEL = 300    // نفس .بيع_رفيق
const NAME_MAX = 20

const FIELDS = 'userId money companion companionFood companionEggs companionShop pikachuBonusUnlocked'

function create({ Player, companionsData, getSaudiDate }) {

    const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d }
    const hasComp = p => !!(p && p.companion && p.companion.key)
    const fail = (code, message) => ({ ok: false, code, message })

    // 🐱 بونص القط على مبلغ البيع (نفس applyCatBonus بالبوت)
    function catBonus(p, amount) {
        if (p && p.companion && p.companion.key === 'cat' && (p.companion.level || 0) >= 1) {
            const b = companionsData.getCompanionBonus('cat', p.companion.level)
            return Math.floor(amount * (1 + b / 100))
        }
        return amount
    }

    function buysTodayOf(p) {
        const shop = p.companionShop
        return shop && shop.lastReset === getSaudiDate() ? num(shop.buysToday) : 0
    }

    function toState(p) {
        const c = hasComp(p) ? p.companion : null
        return {
            companion: c ? {
                key: c.key,
                level: num(c.level),
                prog: num(c.foodProgress),
                name: c.customName || '',
                img: num(c.imageIndex)
            } : null,
            money: num(p.money),
            food: num(p.companionFood),
            eggs: num(p.companionEggs),
            buys: buysTodayOf(p),
            buyLimit: companionsData.getDailyFoodBuyLimit(p),
            foodPrice: FOOD_PRICE,
            sellGain: c ? catBonus(p, num(c.level) * SELL_PER_LEVEL) : 0
        }
    }

    const load = userId => Player.findOne({ userId }).select(FIELDS).lean()
    const OPTS = { new: true, strict: false, projection: FIELDS.split(' ').reduce((o, k) => (o[k] = 1, o), {}) }

    async function getState(userId) {
        const p = await load(userId)
        return p ? toState(p) : null
    }

    const nameOf = p => p.companion.customName || (companionsData.ANIMALS[p.companion.key] || {}).defaultName || 'الرفيق'
    const unitOf = key => (companionsData.ANIMALS[key] || {}).unit || ''

    // 🍖 .اطعام_رفيق
    async function feed(userId) {
        const p = await load(userId)
        if (!p) return fail('NO_ACCOUNT', '❌ لم يتم العثور على حسابك')
        if (!hasComp(p)) return fail('NO_COMPANION', '❌ ما عندك رفيق حالياً')
        const key = p.companion.key
        const level = num(p.companion.level)
        if (level >= companionsData.getMaxLevel(key)) return fail('MAX', '🌟 رفيقك وصل أعلى مستوى بالفعل')
        if (num(p.companionFood) < 1) return fail('NO_FOOD', '❌ ما عندك طعام رفيق — اشترِ من المتجر')

        let prog = num(p.companion.foodProgress) + 1
        const needed = companionsData.getFoodNeededForNextLevel(level)
        let newLevel = level
        let leveled = false
        if (prog >= needed) { prog = 0; newLevel = level + 1; leveled = true }

        const set = { 'companion.foodProgress': prog, 'companion.level': newLevel }
        // ⚡ بيكاتشو: عند الماكس يُفتح بونص 4 شراءات (يبقى حتى بعد البيع)
        let pikaNow = false
        if (!p.pikachuBonusUnlocked && companionsData.isPikachuMaxed({ companion: { key, level: newLevel } })) {
            set.pikachuBonusUnlocked = true
            pikaNow = true
        }

        // شرط يطابق القراءة: يمنع تنفيذين متزامنين من نفس الحالة
        const progCond = num(p.companion.foodProgress) === 0 ? { $in: [0, null] } : num(p.companion.foodProgress)
        const r = await Player.findOneAndUpdate(
            { userId, 'companion.key': key, 'companion.level': level, 'companion.foodProgress': progCond, companionFood: { $gte: 1 } },
            { $set: set, $inc: { companionFood: -1 } },
            OPTS
        ).lean()
        if (!r) return fail('BUSY', '⏳ تغيّرت حالة رفيقك للتو — حاول مرة ثانية')

        const name = nameOf(r)
        let message
        if (leveled) {
            const b = companionsData.getCompanionBonus(key, newLevel)
            message = `🍖 أطعمت ${name} — 🎉 ارتفع مستواه إلى ${newLevel}/${companionsData.getMaxLevel(key)} (+${b}${unitOf(key)})`
            if (pikaNow) message += ' ⚡ فُتح بونص بيكاتشو: صرت تشتري 4 طعام يومياً!'
        } else {
            message = `🍖 أطعمت ${name} — التقدم ${prog}/${needed}`
        }
        return { ok: true, leveled, message, state: toState(r) }
    }

    // 🛒 .شراء_طعام_رفيق 1
    async function buyFood(userId) {
        const p = await load(userId)
        if (!p) return fail('NO_ACCOUNT', '❌ لم يتم العثور على حسابك')
        const limit = companionsData.getDailyFoodBuyLimit(p)
        const today = getSaudiDate()
        const sameDay = !!(p.companionShop && p.companionShop.lastReset === today)
        const buys = sameDay ? num(p.companionShop.buysToday) : 0
        if (buys >= limit) return fail('LIMIT', `❌ خلّصت حد الشراء اليومي (${limit}/يوم) — يتجدد 12:00 ص بتوقيت السعودية`)
        if (num(p.money) < FOOD_PRICE) {
            return fail('NO_MONEY', `❌ مالك ما يكفي — المطلوب ${FOOD_PRICE.toLocaleString('en-US')} ورصيدك ${num(p.money).toLocaleString('en-US')}`)
        }

        const filter = sameDay
            ? { userId, money: { $gte: FOOD_PRICE }, 'companionShop.lastReset': today, 'companionShop.buysToday': { $lt: limit } }
            : { userId, money: { $gte: FOOD_PRICE }, 'companionShop.lastReset': { $ne: today } }
        const update = sameDay
            ? { $inc: { money: -FOOD_PRICE, companionFood: 1, 'companionShop.buysToday': 1 } }
            : { $set: { companionShop: { lastReset: today, buysToday: 1 } }, $inc: { money: -FOOD_PRICE, companionFood: 1 } }

        const r = await Player.findOneAndUpdate(filter, update, OPTS).lean()
        if (!r) return fail('BUSY', '❌ تعذّر الشراء (الرصيد أو الحد اليومي تغيّر) — حاول مرة ثانية')
        return { ok: true, message: `✅ اشتريت طعام رفيق بـ ${FOOD_PRICE.toLocaleString('en-US')} مال`, state: toState(r) }
    }

    // ✏️ .تسمية_رفيق (مرة وحدة)
    async function rename(userId, name) {
        const nm = String(name || '').trim()
        if (!nm || nm.length > NAME_MAX) return fail('BAD_NAME', '❌ اكتب اسم صحيح (حد أقصى 20 حرف)')
        const r = await Player.findOneAndUpdate(
            {
                userId,
                'companion.key': { $type: 'string' },
                $or: [{ 'companion.customName': null }, { 'companion.customName': '' }]
            },
            { $set: { 'companion.customName': nm } },
            OPTS
        ).lean()
        if (r) return { ok: true, message: `✅ تم تسمية رفيقك: ${nm}`, state: toState(r) }
        const p = await load(userId)
        if (!hasComp(p)) return fail('NO_COMPANION', '❌ ما عندك رفيق حالياً')
        return fail('NAMED', '🔒 سميت رفيقك بالفعل — التسمية مرة وحدة بس')
    }

    // 🎴 .رفيق_صورة <1-6>
    async function setImage(userId, index) {
        const i = Math.floor(num(index, -1))
        if (i < 0 || i >= companionsData.IMAGES_PER_ANIMAL) return fail('BAD_IMAGE', `❌ اكتب رقم صحيح من 1 إلى ${companionsData.IMAGES_PER_ANIMAL}`)
        const r = await Player.findOneAndUpdate(
            { userId, 'companion.key': { $type: 'string' } },
            { $set: { 'companion.imageIndex': i } },
            OPTS
        ).lean()
        if (!r) return fail('NO_COMPANION', '❌ ما عندك رفيق حالياً')
        return { ok: true, message: `✅ تم اختيار الصورة رقم ${i + 1} لرفيقك`, state: toState(r) }
    }

    // 💰 .بيع_رفيق (300 لكل مستوى + بونص القط، ويُحذف الرفيق)
    async function sell(userId) {
        const p = await load(userId)
        if (!p) return fail('NO_ACCOUNT', '❌ لم يتم العثور على حسابك')
        if (!hasComp(p)) return fail('NO_COMPANION', '❌ ما عندك رفيق حالياً')
        const key = p.companion.key
        const level = num(p.companion.level)
        const gain = catBonus(p, level * SELL_PER_LEVEL)
        const name = nameOf(p)
        const r = await Player.findOneAndUpdate(
            { userId, 'companion.key': key, 'companion.level': level },
            {
                $inc: { money: gain },
                $set: { companion: { key: null, customName: null, level: 0, foodProgress: 0, obtainedAt: null } }
            },
            OPTS
        ).lean()
        if (!r) return fail('BUSY', '⏳ تغيّرت حالة رفيقك للتو — حاول مرة ثانية')
        return { ok: true, message: `✅ بعت ${name} (لفل ${level}) وحصلت ${gain.toLocaleString('en-US')} مال`, state: toState(r) }
    }

    // 🥚 .فقس_رفيق (اختيار عشوائي بنفس أوزان البوت + صورة عشوائية)
    async function hatch(userId) {
        const p = await load(userId)
        if (!p) return fail('NO_ACCOUNT', '❌ لم يتم العثور على حسابك')
        if (num(p.companionEggs) < 1) return fail('NO_EGG', '❌ لا تملك أي بيضة رفيق — اشترها بأمر .شراء_وحش رفيق')
        if (hasComp(p)) return fail('HAS_COMPANION', `❌ عندك رفيق بالفعل: ${nameOf(p)} — بيعه أول لو تبي تبدأ من جديد`)

        const key = companionsData.pickRandomAnimalKey()
        const imageIndex = Math.floor(Math.random() * companionsData.IMAGES_PER_ANIMAL)
        const r = await Player.findOneAndUpdate(
            {
                userId,
                companionEggs: { $gte: 1 },
                $or: [{ companion: { $exists: false } }, { companion: null }, { 'companion.key': null }, { 'companion.key': { $exists: false } }]
            },
            {
                $inc: { companionEggs: -1 },
                $set: { companion: { key, customName: null, level: 0, foodProgress: 0, imageIndex, obtainedAt: Date.now() } }
            },
            OPTS
        ).lean()
        if (!r) return fail('BUSY', '⏳ تغيّرت حالتك للتو — حدّث الصفحة وحاول مرة ثانية')
        const a = companionsData.ANIMALS[key] || {}
        return { ok: true, message: `🥚 فقست البيضة! حصلت على: ${a.emoji || ''} ${a.defaultName || key}`, state: toState(r) }
    }

    return { getState, feed, buyFood, rename, setImage, sell, hatch }
}

module.exports = { create, FOOD_PRICE, SELL_PER_LEVEL }
