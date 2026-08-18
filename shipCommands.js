// =========================================================================
// نظام السفن الكامل — بديل نظام العشائر
// ملف واحد مستقل يحتوي كل أوامر السفن، عشان تسهل الصيانة بدل
// تفتيت الكود داخل index.js الضخم.
//
// طريقة الربط بـ index.js: راجع INTEGRATION.md المرفق.
//
// الأوامر:
//   .انشاء_سفينة <ايموجي؟> <اسم>        إنشاء سفينة (1,500,000)
//   .سفينتي                             معلومات سفينتك
//   .السفن                              ترتيب كل السفن
//   .دعوة @لاعب                          دعوة (قبطان/ضابط)
//   .قبول / .رفض                        قبول أو رفض دعوة الانضمام
//   .طرد @لاعب                           طرد عضو (قبطان فقط)
//   .ترقية @لاعب                         ترقية عضو لرتبة ضابط (قبطان فقط)
//   .تنزيل @لاعب                         تنزيل ضابط لعضو عادي (قبطان فقط)
//   .خروج / .تأكيد_الخروج               مغادرة السفينة
//   .متجر_السفينة                        عرض متجر السفينة (خاص بك أنت فقط)
//   .شراء_سفينة <رقم>                    شراء عنصر من المتجر
//   .استدعاء_زعيم_السفينة                استدعاء يدوي للزعيم بعد شرائه
//                                        (وأيضاً يظهر تلقائياً يومياً
//                                        الساعة 12 ظهراً بتوقيت السعودية)
//   .هجوم_زعيم_السفينة                   هجوم عضو مسجل على زعيم سفينته
//                                        (زعيم من 10 من عالم الأنمي،
//                                        يرد عليك ويقدر يقتلك مؤقتاً)
//   .حرب_سفينة @قبطان                    تحدي حرب مبارزات 1 ضد 1
//   .قبول_الحرب / .رفض_الحرب            قبول أو رفض تحدي الحرب
//   .حرب_طاقم_كامل @قبطان                مواجهة مجموع قوة الطاقمين كاملة
//   .تسمية_السفينة <اسم جديد>            تغيير اسم السفينة (يستهلك تذكرة)
//   .الغاء_حروب_السفينة                  قبطان فقط - يلغي حروب سفينته المعلقة
//   .تصفير_السفن                         للمالك فقط - يصفر بيانات كل السفن
//   .حذف_السفن_الفارغة                   للمالك فقط - يحذف السفن بدون أعضاء
//   .حذف_كل_العشائر                      للمالك فقط - يحذف نظام العشائر بالكامل
//                                        (عشائر + حروبها) ويبدأ الجميع من صفر
//                                        بنظام السفن
// =========================================================================

const Player = require('./models/Player')
const Ship = require('./models/Ship')
const ShipWar = require('./models/ShipWar')
const { getShipShop } = require('./shipShop')
const { addShipXP } = require('./shipLevel')
const shipBattle = require('./shipBattleEngine')
const { calculatePower } = require('./shipBattleEngine')
const updateShipPower = require('./utils/updateShipPower')
const { summonShipBoss, attackShipBoss, autoSpawnAllShipBosses } = require('./shipBoss')
const { generateId } = require('./utils/id')

const MAX_CREW = 4
const SHIP_CREATION_COST = 1500000

// 🗓️ الحد اليومي المشترك لحروب السفن — بين .حرب_سفينة (1 ضد 1) و
// .حرب_طاقم_كامل (مجموع الطاقم) معًا بنفس الرصيد؛ كل قتال من أي نوع
// يستهلك محاولة وحدة من نفس الـ10. يتجدد يوميًا الساعة 12:00 صباحًا
// بتوقيت السعودية (راجع resetShipWars بالأسفل).
const MAX_DAILY_WARS = 10

// نفس قيمة ownerId الموجودة بأعلى index.js (السطر تقريباً 424) —
// إذا غيّرتها هناك يوماً، حدّثها هنا أيضاً.
const OWNER_ID = "175114725408817"

// =========================================================
// 🗓️ مفتاح الأسبوع الحالي (بتوقيت السعودية) — يُستخدم كحد أسبوعي
// لمشتريات متجر السفينة. الأسبوع يبدأ يوم الأحد الساعة 00:00.
// =========================================================
function getShipWeekKey() {

    const now = new Date()

    const riyadh = new Date(
        now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })
    )

    const day = riyadh.getDay() // 0 = الأحد ... 6 = السبت

    const sunday = new Date(riyadh)
    sunday.setDate(riyadh.getDate() - day)
    sunday.setHours(0, 0, 0, 0)

    return sunday.toISOString().slice(0, 10)
}

function isOwner(msg) {
    const sender =
        (msg.key.participant || msg.key.remoteJid).split("@")[0]
    return sender === OWNER_ID
}

function mentionedJid(msg) {
    return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null
}

function allMentioned(msg) {
    return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
}

function getRank(ship, userId) {
    if (ship.captain === userId) return 'captain'
    if (ship.officers.includes(userId)) return 'officer'
    return 'crew'
}

function canInvite(ship, userId) {
    return ship.captain === userId || ship.officers.includes(userId)
}

function canManage(ship, userId) {
    // طرد / ترقية / تنزيل / بدء حرب / رفض حرب / إعادة تسمية = قبطان فقط
    return ship.captain === userId
}

// =========================================================================
// الأمر الرئيسي — يرجع true لو تم التعامل مع الرسالة
// =========================================================================

async function handleShipCommand({ sock, msg, text, userId, safeSend }) {

    // ─────────────────────────────────────────────
    // إنشاء سفينة
    // ─────────────────────────────────────────────
    if (text.startsWith('.انشاء_سفينة')) {

        const args = text.replace('.انشاء_سفينة', '').trim()

        if (!args) {
            await safeSend(msg.key.remoteJid, {
                text: '❌ الاستخدام:\n.انشاء_سفينة 🚢 اسم السفينة'
            })
            return true
        }

        const player = await Player.findOne({ userId })
        if (!player) return true

        if (player.shipId) {
            await safeSend(msg.key.remoteJid, {
                text: '❌ أنت داخل سفينة بالفعل.'
            })
            return true
        }

        if (player.money < SHIP_CREATION_COST) {
            await safeSend(msg.key.remoteJid, {
                text: `❌ تحتاج ${SHIP_CREATION_COST.toLocaleString()} لإنشاء سفينة.`
            })
            return true
        }

        const split = args.split(' ')
        let emoji = '🚢'

        if (/\p{Extended_Pictographic}/u.test(split[0])) {
            emoji = split.shift()
        }

        const shipName = split.join(' ').trim()

        if (!shipName) {
            await safeSend(msg.key.remoteJid, {
                text: '❌ اكتب اسم السفينة.'
            })
            return true
        }

        const exists = await Ship.findOne({ name: shipName })

        if (exists) {
            await safeSend(msg.key.remoteJid, {
                text: '❌ يوجد سفينة بهذا الاسم.'
            })
            return true
        }

        const lastShip = await Ship.findOne().sort({ shipId: -1 })
        let lastNumber = 0

        if (lastShip) {
            lastNumber = parseInt(lastShip.shipId.replace('SH', '')) || 0
        }

        const shipId = `SH${String(lastNumber + 1).padStart(3, '0')}`

        await Ship.create({
            shipId,
            name: shipName,
            emoji,
            captain: userId,
            members: [userId]
        })

        await updateShipPower(shipId)

        player.money -= SHIP_CREATION_COST
        player.shipId = shipId
        await player.save()

        await safeSend(msg.key.remoteJid, {
            text:
`🎉 تم إنشاء السفينة بنجاح

${emoji} ${shipName}

🆔 ${shipId}

⚓ القبطان:
@${userId.split('@')[0]}

💰 تم خصم ${SHIP_CREATION_COST.toLocaleString()}`,
            mentions: [userId]
        })

        return true
    }

    // ─────────────────────────────────────────────
    // معلومات السفينة
    // ─────────────────────────────────────────────
    if (text === '.سفينتي') {

        const player = await Player.findOne({ userId })

        if (!player || !player.shipId) {
            await safeSend(msg.key.remoteJid, {
                text: '❌ أنت لست على متن أي سفينة.'
            })
            return true
        }

        const ship = await Ship.findOne({ shipId: player.shipId })

        if (!ship) {
            player.shipId = null
            await player.save()
            await safeSend(msg.key.remoteJid, {
                text: '❌ لم يتم العثور على السفينة.'
            })
            return true
        }

        let totalPower = 0
        const mentions = []
        let membersText = ''

        for (const memberId of ship.members) {

            const member = await Player.findOne({ userId: memberId })
            if (member?.characters) {
                for (const ch of member.characters) {
                    totalPower += Number(ch.power || 0)
                }
            }

            mentions.push(memberId)

            let icon = '⚓' // بحار عادي
            if (memberId === ship.captain) icon = '👑'
            else if (ship.officers.includes(memberId)) icon = '🎖️'

            membersText += `${icon} @${memberId.split('@')[0]}\n`
        }

        const bossText = ship.bossActive
            ? `\n👹 زعيم نشط: ${ship.bossName} (${ship.bossSeries})\n❤️ ${ship.bossHp.toLocaleString()}/${ship.bossMaxHp.toLocaleString()}\n↳ .هجوم_زعيم_السفينة\n`
            : ''

        await safeSend(msg.key.remoteJid, {
            text:
`${ship.emoji} ${ship.name}

🆔 ${ship.shipId}

⭐ المستوى: ${ship.level}
✨ الخبرة: ${ship.xp}/${ship.nextLevelXp}

👑 القبطان:
@${ship.captain.split('@')[0]}

👥 الطاقم: ${ship.members.length}/${MAX_CREW}

⚔️ قوة السفينة: ${Number(totalPower || 0).toLocaleString()}

🏆 الانتصارات: ${ship.wins}
💀 الهزائم: ${ship.losses}
${bossText}
━━━━━━━━━━━━

👥 الطاقم

${membersText}`,
            mentions
        })

        return true
    }

    // ─────────────────────────────────────────────
    // قائمة السفن
    // ─────────────────────────────────────────────
    if (text === '.السفن') {

        const ships = await Ship.find().sort({ level: -1, power: -1 })

        if (!ships.length) {
            await safeSend(msg.key.remoteJid, {
                text: '❌ لا توجد أي سفن.'
            })
            return true
        }

        let txt = `🚢 قائمة السفن\n\n━━━━━━━━━━━━━━\n\n`
        const mentions = []

        for (let i = 0; i < ships.length; i++) {

            const ship = ships[i]
            let totalPower = 0

            for (const memberId of ship.members) {
                const member = await Player.findOne({ userId: memberId })
                if (!member) continue
                for (const ch of member.characters || []) {
                    totalPower += Number(ch.power || 0)
                }
            }

            mentions.push(ship.captain)

            txt +=
`${i + 1}- ${ship.emoji} ${ship.name}

👑 القبطان:
@${ship.captain.split('@')[0]}

⭐ المستوى: ${ship.level}

👥 الطاقم:
${ship.members.length}/${MAX_CREW}

⚔️ القوة:
${totalPower.toLocaleString()}

━━━━━━━━━━━━━━

`
        }

        await safeSend(msg.key.remoteJid, { text: txt, mentions })
        return true
    }

    // ─────────────────────────────────────────────
    // دعوة عضو (قبطان أو ضابط)
    // ─────────────────────────────────────────────
    if (text.startsWith('.دعوة')) {

        const mentioned = mentionedJid(msg)

        if (!mentioned) {
            await safeSend(msg.key.remoteJid, { text: '❌ قم بمنشن اللاعب.' })
            return true
        }

        const player = await Player.findOne({ userId })

        if (!player || !player.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ أنت لست على متن أي سفينة.' })
            return true
        }

        const ship = await Ship.findOne({ shipId: player.shipId })
        if (!ship) return true

        if (!canInvite(ship, userId)) {
            await safeSend(msg.key.remoteJid, {
                text: '❌ فقط القبطان أو الضباط يقدرون يدعون أعضاء.'
            })
            return true
        }

        if (ship.members.length >= MAX_CREW) {
            await safeSend(msg.key.remoteJid, { text: '❌ السفينة ممتلئة.' })
            return true
        }

        const target = await Player.findOne({ userId: mentioned })

        if (!target) {
            await safeSend(msg.key.remoteJid, { text: '❌ اللاعب غير موجود.' })
            return true
        }

        if (target.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ اللاعب على متن سفينة بالفعل.' })
            return true
        }

        if (ship.invites.includes(mentioned)) {
            await safeSend(msg.key.remoteJid, { text: '❌ تمت دعوته مسبقاً.' })
            return true
        }

        ship.invites.push(mentioned)
        await ship.save()

        await safeSend(msg.key.remoteJid, {
            text:
`📨 تمت دعوة

@${mentioned.split('@')[0]}

للانضمام إلى

${ship.emoji} ${ship.name}

اكتب:
.قبول
أو
.رفض`,
            mentions: [mentioned]
        })

        return true
    }

    // ─────────────────────────────────────────────
    // قبول دعوة الانضمام
    // ─────────────────────────────────────────────
    if (text === '.قبول') {

        const player = await Player.findOne({ userId })
        if (!player) return true

        if (player.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ أنت على متن سفينة بالفعل.' })
            return true
        }

        if (player.shipCooldown && player.shipCooldown > Date.now()) {

            const remaining = player.shipCooldown - Date.now()
            const hours = Math.floor(remaining / (1000 * 60 * 60))
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

            await safeSend(msg.key.remoteJid, {
                text:
`⏳ لا يمكنك الانضمام إلى سفينة الآن.

الوقت المتبقي:
🕒 ${hours} ساعة ${minutes} دقيقة`
            })
            return true
        }

        const ship = await Ship.findOne({ invites: userId })

        if (!ship) {
            await safeSend(msg.key.remoteJid, { text: '❌ لا توجد لديك أي دعوة.' })
            return true
        }

        if (ship.members.length >= MAX_CREW) {
            ship.invites = ship.invites.filter(id => id !== userId)
            await ship.save()
            await safeSend(msg.key.remoteJid, { text: '❌ السفينة أصبحت ممتلئة.' })
            return true
        }

        ship.members.push(userId)
        ship.invites = ship.invites.filter(id => id !== userId)
        await ship.save()

        await updateShipPower(ship.shipId)

        player.shipId = ship.shipId
        await player.save()

        await safeSend(msg.key.remoteJid, {
            text:
`✅ انضممت إلى

${ship.emoji} ${ship.name}

مرحباً بك على متن الطاقم!

👤 @${userId.split('@')[0]}`,
            mentions: [userId]
        })

        return true
    }

    // ─────────────────────────────────────────────
    // رفض دعوة الانضمام
    // ─────────────────────────────────────────────
    if (text === '.رفض') {

        const player = await Player.findOne({ userId })
        if (!player) return true

        if (player.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ أنت على متن سفينة بالفعل.' })
            return true
        }

        const ship = await Ship.findOne({ invites: userId })

        if (!ship) {
            await safeSend(msg.key.remoteJid, { text: '❌ لا توجد لديك أي دعوة.' })
            return true
        }

        ship.invites = ship.invites.filter(id => id !== userId)
        await ship.save()

        await safeSend(msg.key.remoteJid, { text: '❌ تم رفض دعوة الانضمام.' })
        return true
    }

    // ─────────────────────────────────────────────
    // طرد عضو (قبطان فقط)
    // ─────────────────────────────────────────────
    if (text.startsWith('.طرد')) {

        const player = await Player.findOne({ userId })

        if (!player || !player.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ أنت لست على متن أي سفينة.' })
            return true
        }

        const ship = await Ship.findOne({ shipId: player.shipId })
        if (!ship) return true

        if (!canManage(ship, userId)) {
            await safeSend(msg.key.remoteJid, { text: '❌ فقط القبطان يقدر يطرد الأعضاء.' })
            return true
        }

        const mentioned = allMentioned(msg)

        if (!mentioned || mentioned.length === 0) {
            await safeSend(msg.key.remoteJid, { text: '❌ قم بمنشن العضو الذي تريد طرده.' })
            return true
        }

        const targetId = mentioned[0]

        if (targetId === ship.captain) {
            await safeSend(msg.key.remoteJid, { text: '❌ لا يمكنك طرد نفسك.' })
            return true
        }

        if (!ship.members.includes(targetId)) {
            await safeSend(msg.key.remoteJid, { text: '❌ هذا اللاعب ليس على متن سفينتك.' })
            return true
        }

        const targetPlayer = await Player.findOne({ userId: targetId })

        ship.members = ship.members.filter(id => id !== targetId)
        ship.officers = ship.officers.filter(id => id !== targetId)
        await ship.save()

        await updateShipPower(ship.shipId)

        if (targetPlayer) {

            targetPlayer.shipId = null
            targetPlayer.shipCooldown = Date.now() + (24 * 60 * 60 * 1000)

            targetPlayer.maxCharacters -= (targetPlayer.shipStorageBonus || 0)
            if (targetPlayer.maxCharacters < 30) targetPlayer.maxCharacters = 30

            targetPlayer.shipStorageBonus = 0
            targetPlayer.shipStorageExpire = 0
            targetPlayer.shipCoins = 0
            targetPlayer.shipShop = {}
            targetPlayer.renameShipTicket = 0

            await targetPlayer.save()
        }

        await safeSend(msg.key.remoteJid, {
            text: `✅ تم طرد\n\n@${targetId.split('@')[0]}\n\nمن السفينة.`,
            mentions: [targetId]
        })

        return true
    }

    // ─────────────────────────────────────────────
    // ترقية عضو لضابط (قبطان فقط)
    // ─────────────────────────────────────────────
    if (text.startsWith('.ترقية')) {

        const player = await Player.findOne({ userId })

        if (!player || !player.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ أنت لست على متن أي سفينة.' })
            return true
        }

        const ship = await Ship.findOne({ shipId: player.shipId })
        if (!ship) return true

        if (!canManage(ship, userId)) {
            await safeSend(msg.key.remoteJid, { text: '❌ فقط القبطان يقدر يرقي أعضاء الطاقم.' })
            return true
        }

        const mentioned = mentionedJid(msg)

        if (!mentioned) {
            await safeSend(msg.key.remoteJid, { text: '❌ قم بمنشن العضو الذي تريد ترقيته.' })
            return true
        }

        if (!ship.members.includes(mentioned)) {
            await safeSend(msg.key.remoteJid, { text: '❌ هذا اللاعب ليس على متن سفينتك.' })
            return true
        }

        if (mentioned === ship.captain) {
            await safeSend(msg.key.remoteJid, { text: '❌ القبطان أعلى رتبة بالفعل.' })
            return true
        }

        if (ship.officers.includes(mentioned)) {
            await safeSend(msg.key.remoteJid, { text: '❌ هذا العضو ضابط بالفعل.' })
            return true
        }

        ship.officers.push(mentioned)
        await ship.save()

        await safeSend(msg.key.remoteJid, {
            text: `🎖️ تمت ترقية @${mentioned.split('@')[0]} إلى رتبة ضابط.\n\nصلاحيات الضابط: دعوة أعضاء جدد.`,
            mentions: [mentioned]
        })

        return true
    }

    // ─────────────────────────────────────────────
    // تنزيل ضابط (قبطان فقط)
    // ─────────────────────────────────────────────
    if (text.startsWith('.تنزيل')) {

        const player = await Player.findOne({ userId })

        if (!player || !player.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ أنت لست على متن أي سفينة.' })
            return true
        }

        const ship = await Ship.findOne({ shipId: player.shipId })
        if (!ship) return true

        if (!canManage(ship, userId)) {
            await safeSend(msg.key.remoteJid, { text: '❌ فقط القبطان يقدر ينزل رتبة الضباط.' })
            return true
        }

        const mentioned = mentionedJid(msg)

        if (!mentioned) {
            await safeSend(msg.key.remoteJid, { text: '❌ قم بمنشن العضو الذي تريد تنزيله.' })
            return true
        }

        if (!ship.officers.includes(mentioned)) {
            await safeSend(msg.key.remoteJid, { text: '❌ هذا اللاعب ليس ضابطاً.' })
            return true
        }

        ship.officers = ship.officers.filter(id => id !== mentioned)
        await ship.save()

        await safeSend(msg.key.remoteJid, {
            text: `📉 تم تنزيل @${mentioned.split('@')[0]} إلى رتبة بحار عادي.`,
            mentions: [mentioned]
        })

        return true
    }

    // ─────────────────────────────────────────────
    // مغادرة السفينة
    // ─────────────────────────────────────────────
    if (text === '.خروج') {

        const player = await Player.findOne({ userId })

        if (!player || !player.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ أنت لست على متن أي سفينة.' })
            return true
        }

        player.pendingShipLeave = Date.now()
        await player.save()

        setTimeout(async () => {
            const p = await Player.findOne({ userId })
            if (p && p.pendingShipLeave) {
                p.pendingShipLeave = null
                await p.save()
            }
        }, 60000)

        await safeSend(msg.key.remoteJid, {
            text:
`⚠️ هل أنت متأكد من مغادرة السفينة؟

• سيتم خروجك فوراً.
• لن تتمكن من الانضمام إلى أي سفينة لمدة *24 ساعة*.
• ستفقد جميع زيادات مخزون السفينة.
• سيتم إلغاء الطلب تلقائياً بعد دقيقة.

اكتب:
*.تأكيد_الخروج*`
        })

        return true
    }

    if (text === '.تأكيد_الخروج') {

        const player = await Player.findOne({ userId })

        if (!player || !player.pendingShipLeave) {
            await safeSend(msg.key.remoteJid, { text: '❌ لا يوجد طلب خروج.' })
            return true
        }

        if (Date.now() - player.pendingShipLeave > 60000) {
            player.pendingShipLeave = null
            await player.save()
            await safeSend(msg.key.remoteJid, { text: '❌ انتهت صلاحية طلب الخروج.' })
            return true
        }

        if (!player.shipId) {
            player.pendingShipLeave = null
            await player.save()
            await safeSend(msg.key.remoteJid, { text: '❌ أنت لست على متن أي سفينة.' })
            return true
        }

        const ship = await Ship.findOne({ shipId: player.shipId })

        if (!ship) {
            player.shipId = null
            player.pendingShipLeave = null
            await player.save()
            await safeSend(msg.key.remoteJid, { text: '❌ السفينة غير موجودة.' })
            return true
        }

        if (player.shipStorageBonus > 0) {
            player.maxCharacters -= player.shipStorageBonus
            if (player.maxCharacters < 30) player.maxCharacters = 30
        }

        player.shipStorageBonus = 0
        player.shipStorageExpire = 0
        player.shipCoins = 0
        player.shipShop = {}
        player.renameShipTicket = 0

        player.shipId = null
        player.pendingShipLeave = null
        player.shipCooldown = Date.now() + (24 * 60 * 60 * 1000)

        await player.save()

        ship.members = ship.members.filter(id => id !== userId)
        ship.officers = ship.officers.filter(id => id !== userId)

        let deleted = false

        if (ship.members.length === 0) {

            await Ship.deleteOne({ shipId: ship.shipId })

            await ShipWar.deleteMany({
                $or: [
                    { attackerShip: ship.shipId },
                    { defenderShip: ship.shipId }
                ]
            })

            deleted = true

        } else {

            if (ship.captain === userId) {
                ship.captain = ship.members[0]
                ship.officers = ship.officers.filter(id => id !== ship.captain)
            }

            await ship.save()
            await updateShipPower(ship.shipId)
        }

        await safeSend(msg.key.remoteJid, {
            text: deleted
                ? `✅ غادرت السفينة.\n\n🗑️ لم يتبق أي عضو بالطاقم.\n\nتم حذف السفينة تلقائياً.`
                : `✅ غادرت السفينة بنجاح.\n\n❌ تمت إزالة جميع مزايا السفينة.\n\n⏳ يمكنك الانضمام إلى سفينة أخرى بعد 24 ساعة.`
        })

        return true
    }

    // ─────────────────────────────────────────────
    // متجر السفينة — 4 متاجر مستقلة
    // ─────────────────────────────────────────────
    if (text === '.متجر_السفينة') {

        const player = await Player.findOne({ userId })

        if (!player || !player.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ أنت لست على متن أي سفينة.' })
            return true
        }

        const ship = await Ship.findOne({ shipId: player.shipId })

        if (!ship) {
            await safeSend(msg.key.remoteJid, { text: '❌ لم يتم العثور على السفينة.' })
            return true
        }

        const shop = getShipShop(ship.level)

        let txt = `🏪 متجر السفينة\n\n🪙 عملاتك: ${player.shipCoins || 0}\n\n━━━━━━━━━━━━━━\n\n`

        shop.forEach((item, index) => {
            if (item.locked) {
                txt += `${index + 1}- ${item.name} 🔒\n🔓 يفتح عند المستوى ${item.unlockLevel}\n\n`
            } else {
                txt += `${index + 1}- ${item.name}\n\n💰 السعر: ${item.price} 🪙\n📦 الحد الأسبوعي: ${item.limit}\n\n`
            }
        })

        txt += `━━━━━━━━━━━━━━\n\nللشراء:\n.شراء_سفينة رقم`

        await safeSend(msg.key.remoteJid, { text: txt })
        return true
    }

    // ─────────────────────────────────────────────
    // شراء من متجر سفينة محدد
    // ─────────────────────────────────────────────
    if (text.startsWith('.شراء_سفينة')) {

        const args = text.split(' ')
        const itemIndex = Number(args[1]) - 1

        if (isNaN(itemIndex)) {
            await safeSend(msg.key.remoteJid, { text: '❌ مثال:\n.شراء_سفينة 1' })
            return true
        }

        const player = await Player.findOne({ userId })

        if (!player || !player.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ أنت لست على متن أي سفينة.' })
            return true
        }

        const ship = await Ship.findOne({ shipId: player.shipId })

        if (!ship) {
            await safeSend(msg.key.remoteJid, { text: '❌ لم يتم العثور على السفينة.' })
            return true
        }

        const shop = getShipShop(ship.level)
        const item = shop[itemIndex]

        if (!item) {
            await safeSend(msg.key.remoteJid, { text: '❌ العنصر غير موجود.' })
            return true
        }

        if (item.locked) {
            await safeSend(msg.key.remoteJid, { text: `❌ هذا العنصر يفتح عند مستوى ${item.unlockLevel}.` })
            return true
        }

        // تتبّع المشتريات مخزّن بجانب اللاعب نفسه فقط (player.shipShop)،
        // يعني كل عضو بالطاقم له حده الأسبوعي الخاص فيه بشكل مستقل
        // تماماً عن بقية أعضاء نفس السفينة. الأسبوع يبدأ يوم الأحد
        // 00:00 بتوقيت السعودية (getShipWeekKey).
        const week = getShipWeekKey()

        if (!player.shipShop) player.shipShop = {}
        if (!player.shipShop[week]) player.shipShop[week] = {}

        const bought = player.shipShop[week][item.id] || 0

        if (bought >= item.limit) {
            await safeSend(msg.key.remoteJid, { text: '❌ وصلت للحد الأسبوعي لهذا العنصر.' })
            return true
        }

        if (player.shipCoins < item.price) {
            await safeSend(msg.key.remoteJid, { text: '❌ لا تملك عملات سفينة كافية.' })
            return true
        }

        player.shipCoins -= item.price
        player.shipShop[week][item.id] = bought + 1
        player.markModified('shipShop')

        switch (item.id) {

            case 'pull_ticket':
                player.pulls += 1
                break

            case 'legendary_box':
                player.boxes.legendary += 1
                break

            case 'sss_chance':
                player.boxes.sss_chance += 1
                break

            case 'sss_high':
                player.boxes.sss_high += 1
                break

            case 'storage': {

                const now = Date.now()

                if (player.shipStorageExpire > now) {
                    await safeSend(msg.key.remoteJid, {
                        text: '❌ لديك زيادة سعة فعالة بالفعل.\nيمكنك شراء زيادة جديدة بعد انتهاء 14 يوم.'
                    })
                    return true
                }

                player.shipStorageBonus += 5
                player.maxCharacters += 5
                player.shipStorageExpire = now + (14 * 24 * 60 * 60 * 1000)

                break
            }

            case 'sss_shard':
                if (!player.shards) player.shards = {}
                break

            case 'summon_boss':
                ship.bossAvailable = true
                break

            case 'rename':

                if (userId !== ship.captain) {
                    await safeSend(msg.key.remoteJid, {
                        text: '❌ القبطان فقط يستطيع شراء تغيير الاسم.'
                    })
                    return true
                }

                player.renameShipTicket = (player.renameShipTicket || 0) + 1
                break
        }

        await player.save()
        await ship.save()

        const remaining = item.limit - (bought + 1)

        await safeSend(msg.key.remoteJid, {
            text:
`✅ تم شراء:

${item.name}

💰 -${item.price} 🪙

📦 المتبقي:
${remaining}/${item.limit}`
        })

        return true
    }

    // ─────────────────────────────────────────────
    // استدعاء زعيم السفينة يدوياً (بعد شرائه من المتجر)
    // ملاحظة: بالإضافة لهذا، الزعيم يظهر تلقائياً كل يوم الساعة 12
    // ظهراً بتوقيت السعودية بدون أي شراء (شوف autoSpawnAllShipBosses
    // بـ shipBoss.js وربطها بـ startShipDailyReset بالأسفل).
    // ─────────────────────────────────────────────
    if (text === '.استدعاء_زعيم_السفينة') {

        const player = await Player.findOne({ userId })

        if (!player || !player.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ أنت لست على متن أي سفينة.' })
            return true
        }

        const result = await summonShipBoss(player.shipId, { auto: false })

        if (result.error === 'boss_not_purchased') {
            await safeSend(msg.key.remoteJid, {
                text: '❌ سفينتك لا تملك زعيماً بعد.\nاشترِ "استدعاء زعيم السفينة" من متجر السفينة أولاً.\n\n(أو انتظر — الزعيم يظهر تلقائياً كل يوم الساعة 12 ظهراً بتوقيت السعودية).'
            })
            return true
        }

        if (result.error === 'boss_already_active') {
            await safeSend(msg.key.remoteJid, { text: '❌ يوجد زعيم مستدعى بالفعل على متن سفينتك.' })
            return true
        }

        if (result.error) {
            await safeSend(msg.key.remoteJid, { text: '❌ حدث خطأ أثناء الاستدعاء.' })
            return true
        }

        const ship = result.ship
        const boss = result.boss

        const abilitiesText =
            boss.abilities.map(a => `• ${a.name}`).join('\n')

        const bossCard = {
            text:
`👹 ظهر زعيم على متن السفينة!

${ship.emoji} ${ship.name}

😈 ${ship.bossName}
📺 ${ship.bossSeries}

❤️ HP: ${ship.bossHp.toLocaleString()}/${ship.bossMaxHp.toLocaleString()}
⚔️ هجومه: ${ship.bossAttack.toLocaleString()}

✨ قدراته:
${abilitiesText}

⚠️ يرد على المهاجمين أحياناً — لو نزل دمك القتالي لصفر تموت
وتصير ما تقدر تهاجم لمدة دقيقتين.

⚔️ فقط أعضاء طاقمك المسجلين يقدرون يهاجموه.

للهجوم:
.هجوم_زعيم_السفينة`
        }

        if (ship.bossImage) {
            await safeSend(msg.key.remoteJid, {
                image: { url: ship.bossImage },
                caption: bossCard.text
            })
        } else {
            await safeSend(msg.key.remoteJid, bossCard)
        }

        return true
    }

    // ─────────────────────────────────────────────
    // هجوم على زعيم السفينة — أعضاء مسجلين فقط
    // ─────────────────────────────────────────────
    if (text === '.هجوم_زعيم_السفينة') {

        const player = await Player.findOne({ userId })

        if (!player || !player.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ أنت لست على متن أي سفينة.' })
            return true
        }

        const result = await attackShipBoss(player.shipId, userId)

        if (result.error === 'no_active_boss') {
            await safeSend(msg.key.remoteJid, { text: '❌ لا يوجد زعيم مستدعى حالياً على سفينتك.' })
            return true
        }

        if (result.error === 'not_crew_member') {
            // هذا هو القيد المطلوب: فقط أعضاء نفس السفينة المسجلين
            await safeSend(msg.key.remoteJid, { text: '❌ يجب أن تكون عضواً مسجلاً بنفس السفينة لمهاجمة زعيمها.' })
            return true
        }

        if (result.error === 'player_dead') {
            const secs = Math.ceil(result.remainingMs / 1000)
            await safeSend(msg.key.remoteJid, {
                text: `💀 أنت ميت بمعركة الزعيم!\n⏳ تقدر تهاجم بعد ${secs} ثانية.`
            })
            return true
        }

        if (result.error) {
            await safeSend(msg.key.remoteJid, { text: '❌ حدث خطأ أثناء الهجوم.' })
            return true
        }

        if (result.defeated) {

            const medals = ['🥇', '🥈', '🥉', '🏅']

            const leaderboardText = result.leaderboard
                .map((r, i) =>
                    `${medals[i] || '▪️'} ${i + 1}. @${r.userId.split('@')[0]}\n` +
                    `   💥 ${r.damage.toLocaleString()} ضرر — 💰 ${r.money.toLocaleString()} — 🪙 ${r.shipCoins}`
                )
                .join('\n\n')

            await safeSend(msg.key.remoteJid, {
                text:
`💥 ضربة أخيرة!

👹 تم القضاء على ${result.bossName}!

⚔️ ضررك الأخير: ${result.damage.toLocaleString()}
${result.playerAbility ? `✨ قدرتك: ${result.playerAbility}\n` : ''}
🏆 ترتيب الدمج (حسب الضرر):

${leaderboardText}

✨ +${result.shipXpReward.toLocaleString()} خبرة للسفينة`,
                mentions: result.leaderboard.map(r => r.userId)
            })

            return true
        }

        let extra = ''

        if (result.playerAbility) {
            extra += `\n✨ قدرتك: ${result.playerAbility}`
        }

        if (result.bossAbilityUsed) {
            extra += `\n\n😈 رد الزعيم بـ: ${result.bossAbilityUsed}\n💥 ضررك: -${result.counterDamage.toLocaleString()}`
        }

        if (result.died) {
            extra += `\n\n💀 مت! دمك القتالي وصل صفر.\n⏳ ما تقدر تهاجم لمدة دقيقتين.`
        } else {
            extra += `\n\n❤️ دمك القتالي: ${result.playerHp.toLocaleString()}/${result.playerMaxHp.toLocaleString()}`
        }

        await safeSend(msg.key.remoteJid, {
            text:
`⚔️ ضربت الزعيم!

💥 الضرر: ${result.damage.toLocaleString()}

❤️ HP المتبقي للزعيم: ${result.remainingHp.toLocaleString()}/${result.maxHp.toLocaleString()}${extra}`
        })

        return true
    }

    // ─────────────────────────────────────────────
    // تحدي حرب سفن (مبارزات 1 ضد 1)
    // ─────────────────────────────────────────────
    if (text.startsWith('.حرب_سفينة')) {

        const mentioned = mentionedJid(msg)

        if (!mentioned) {
            await safeSend(msg.key.remoteJid, {
                text: '❌ يجب منشن قبطان السفينة الأخرى.\n\nمثال:\n.حرب_سفينة @القبطان'
            })
            return true
        }

        const myShip = await Ship.findOne({ captain: userId })

        if (!myShip) {
            await safeSend(msg.key.remoteJid, { text: '❌ فقط قبطان السفينة يستطيع بدء الحرب.' })
            return true
        }

        const enemyShip = await Ship.findOne({ captain: mentioned })

        if (!enemyShip) {
            await safeSend(msg.key.remoteJid, { text: '❌ الشخص الممنشن ليس قبطان أي سفينة.' })
            return true
        }

        if (myShip.shipId === enemyShip.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ لا يمكنك تحدي سفينتك.' })
            return true
        }

        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })

        if (myShip.lastWarReset !== today) {
            myShip.dailyWars = MAX_DAILY_WARS
            myShip.lastWarReset = today
            await myShip.save()
        }

        if (myShip.dailyWars <= 0) {
            await safeSend(msg.key.remoteJid, {
                text: '❌ انتهت محاولات الحروب اليومية.\n\nتتجدد الساعة 12:00 صباحاً بتوقيت السعودية.'
            })
            return true
        }

        const pending = await ShipWar.findOne({
            status: { $in: ['pending', 'accepted'] },
            $or: [{ attackerShip: myShip.shipId }, { defenderShip: myShip.shipId }]
        })

        if (pending) {
            await safeSend(msg.key.remoteJid, { text: '❌ لديك طلب حرب معلق بالفعل.' })
            return true
        }

        const war = await ShipWar.create({
            warId: generateId(),
            chatId: msg.key.remoteJid,
            attackerShip: myShip.shipId,
            defenderShip: enemyShip.shipId,
            attackerCaptain: userId,
            defenderCaptain: mentioned,
            status: 'pending',
            mode: 'member'
        })

        myShip.dailyWars--
        await myShip.save()

        setTimeout(async () => {
            const p = await ShipWar.findOne({ warId: war.warId })
            if (p && p.status === 'pending') {
                p.status = 'expired'
                await p.save()
            }
        }, 60000)

        await safeSend(msg.key.remoteJid, {
            text:
`━━━━━━━━━━━━━━

⚔️ طلب حرب سفن

${myShip.emoji} ${myShip.name}

تتحدى

${enemyShip.emoji} ${enemyShip.name}

👑 قبطان السفينة الأخرى:
@${mentioned.split('@')[0]}

━━━━━━━━━━━━━━

للقبول:
.قبول_الحرب

للرفض:
.رفض_الحرب

⏳ ينتهي الطلب خلال دقيقة.

━━━━━━━━━━━━━━`,
            mentions: [mentioned]
        })

        return true
    }

    if (text === '.قبول_الحرب') {

        function shuffle(array) {
            const arr = [...array]
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                    ;[arr[i], arr[j]] = [arr[j], arr[i]]
            }
            return arr
        }

        const myShip = await Ship.findOne({ captain: userId })

        if (!myShip) {
            await safeSend(msg.key.remoteJid, { text: '❌ فقط قبطان السفينة يستطيع قبول الحرب.' })
            return true
        }

        const war = await ShipWar.findOne({ defenderShip: myShip.shipId, status: 'pending' })

        if (!war) {
            await safeSend(msg.key.remoteJid, { text: '❌ لا يوجد طلب حرب معلق.' })
            return true
        }

        const attackerShip = await Ship.findOne({ shipId: war.attackerShip })
        const defenderShip = await Ship.findOne({ shipId: war.defenderShip })

        const attackerMembers = shuffle([...attackerShip.members])
        const defenderMembers = shuffle([...defenderShip.members])

        if (attackerMembers.length === 0 || defenderMembers.length === 0) {
            await safeSend(msg.key.remoteJid, { text: '❌ إحدى السفينتين لا تحتوي على أعضاء.' })
            return true
        }

        war.status = 'accepted'
        if (!war.chatId) war.chatId = msg.key.remoteJid
        war.currentRound = 1
        war.rounds = []

        const totalRounds = Math.min(attackerMembers.length, defenderMembers.length)

        for (let i = 0; i < totalRounds; i++) {
            war.rounds.push({
                round: i + 1,
                attacker: attackerMembers[i],
                defender: defenderMembers[i],
                winner: null,
                finished: false
            })
        }

        await war.save()

        let draw = `🎲 نتائج القرعة\n\n━━━━━━━━━━━━━━\n\n`

        war.rounds.forEach(r => {
            draw += `${r.round}️⃣\n@${r.attacker.split('@')[0]}\n🆚\n@${r.defender.split('@')[0]}\n━━━━━━━━━━━━━━\n\n`
        })

        draw += `⏳ تبدأ الجولة الأولى خلال لحظات.`

        await safeSend(msg.key.remoteJid, {
            text: draw,
            mentions: [...attackerMembers, ...defenderMembers]
        })

        await startShipWar(war.warId, sock, safeSend)

        return true
    }

    if (text === '.رفض_الحرب') {

        const myShip = await Ship.findOne({ captain: userId })

        if (!myShip) {
            await safeSend(msg.key.remoteJid, { text: '❌ فقط قبطان السفينة يستطيع رفض الحرب.' })
            return true
        }

        const war = await ShipWar.findOne({ defenderShip: myShip.shipId, status: 'pending' })

        if (!war) {
            await safeSend(msg.key.remoteJid, { text: '❌ لا يوجد طلب حرب معلق.' })
            return true
        }

        const attackerShip = await Ship.findOne({ shipId: war.attackerShip })

        if (attackerShip) {
            attackerShip.dailyWars = (attackerShip.dailyWars || 0) + 1
            await attackerShip.save()
        }

        war.status = 'rejected'
        await war.save()

        await safeSend(msg.key.remoteJid, {
            text:
`━━━━━━━━━━━━━━

❌ تم رفض طلب الحرب.

${myShip.emoji} ${myShip.name}

رفضت التحدي.

━━━━━━━━━━━━━━

🔄 تمت إعادة محاولة الحرب
للسفينة المهاجمة.

━━━━━━━━━━━━━━`
        })

        return true
    }

    // ─────────────────────────────────────────────
    // حرب طاقم كامل — مجموع قوة الطاقمين المسجلين كاملة
    // ─────────────────────────────────────────────
    if (text.startsWith('.حرب_طاقم_كامل')) {

        const mentioned = mentionedJid(msg)

        if (!mentioned) {
            await safeSend(msg.key.remoteJid, {
                text: '❌ يجب منشن قبطان السفينة الأخرى.\n\nمثال:\n.حرب_طاقم_كامل @القبطان'
            })
            return true
        }

        const myShip = await Ship.findOne({ captain: userId })

        if (!myShip) {
            await safeSend(msg.key.remoteJid, { text: '❌ فقط قبطان السفينة يستطيع بدء هذه المواجهة.' })
            return true
        }

        const enemyShip = await Ship.findOne({ captain: mentioned })

        if (!enemyShip) {
            await safeSend(msg.key.remoteJid, { text: '❌ الشخص الممنشن ليس قبطان أي سفينة.' })
            return true
        }

        if (myShip.shipId === enemyShip.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ لا يمكنك تحدي سفينتك.' })
            return true
        }

        if (myShip.members.length === 0 || enemyShip.members.length === 0) {
            await safeSend(msg.key.remoteJid, { text: '❌ إحدى السفينتين لا تحتوي على أعضاء.' })
            return true
        }

        // 🗓️ نفس رصيد المحاولات اليومية المشترك مع .حرب_سفينة (10 محاولات
        // إجمالاً بين النوعين)، يتجدد الساعة 12:00 صباحاً بتوقيت السعودية.
        const todayFullWar = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })

        if (myShip.lastWarReset !== todayFullWar) {
            myShip.dailyWars = MAX_DAILY_WARS
            myShip.lastWarReset = todayFullWar
            await myShip.save()
        }

        if (myShip.dailyWars <= 0) {
            await safeSend(msg.key.remoteJid, {
                text: '❌ انتهت محاولات الحروب اليومية.\n\nتتجدد الساعة 12:00 صباحاً بتوقيت السعودية.'
            })
            return true
        }

        myShip.dailyWars--
        await myShip.save()

        // 🧮 يجمع قوة كل شخصيات كل عضو مسجل بالطاقمين
        let myTotal = 0
        let enemyTotal = 0

        for (const id of myShip.members) {
            const p = await Player.findOne({ userId: id })
            if (!p) continue
            myTotal += calculatePower(p)
        }

        for (const id of enemyShip.members) {
            const p = await Player.findOne({ userId: id })
            if (!p) continue
            enemyTotal += calculatePower(p)
        }

        const winnerShip = myTotal >= enemyTotal ? myShip : enemyShip
        const loserShip = myTotal >= enemyTotal ? enemyShip : myShip

        winnerShip.wins++
        loserShip.losses++

        await winnerShip.save()
        await loserShip.save()

        await addShipXP(winnerShip.shipId, 300)
        await addShipXP(loserShip.shipId, 100)

        const winnerMoney = 300000
        const loserMoney = 150000

        for (const id of winnerShip.members) {
            const p = await Player.findOne({ userId: id })
            if (!p) continue
            await p.addMoney(winnerMoney)
            p.shipCoins = (p.shipCoins || 0) + 10
            await p.save()
        }

        for (const id of loserShip.members) {
            const p = await Player.findOne({ userId: id })
            if (!p) continue
            await p.addMoney(loserMoney)
            await p.save()
        }

        await safeSend(msg.key.remoteJid, {
            text:
`⚔️ مواجهة طاقم كامل

━━━━━━━━━━━━━━

${myShip.emoji} ${myShip.name}
👥 ${myShip.members.length} أعضاء
⚔️ مجموع القوة: ${myTotal.toLocaleString()}

🆚

${enemyShip.emoji} ${enemyShip.name}
👥 ${enemyShip.members.length} أعضاء
⚔️ مجموع القوة: ${enemyTotal.toLocaleString()}

━━━━━━━━━━━━━━

🏆 الفائز:
${winnerShip.emoji} ${winnerShip.name}

🎉 طاقم ${winnerShip.name}
💰 +${winnerMoney.toLocaleString()}
🪙 +10 عملة سفينة
✨ +300 خبرة للسفينة

${loserShip.name}
💰 +${loserMoney.toLocaleString()}
📉 خسارة المواجهة`
        })

        return true
    }

    // ─────────────────────────────────────────────
    // تسمية السفينة — يستهلك تذكرة renameShipTicket
    // (تُشترى من المتجر عبر عنصر "rename"، قبطان فقط)
    // ─────────────────────────────────────────────
    if (text.startsWith('.تسمية_السفينة')) {

        const newName = text.replace('.تسمية_السفينة', '').trim()

        if (!newName) {
            await safeSend(msg.key.remoteJid, {
                text: '❌ الاستخدام:\n.تسمية_السفينة اسم جديد'
            })
            return true
        }

        const player = await Player.findOne({ userId })

        if (!player || !player.shipId) {
            await safeSend(msg.key.remoteJid, { text: '❌ أنت لست على متن أي سفينة.' })
            return true
        }

        const ship = await Ship.findOne({ shipId: player.shipId })
        if (!ship) return true

        if (userId !== ship.captain) {
            await safeSend(msg.key.remoteJid, { text: '❌ القبطان فقط يستطيع تسمية السفينة.' })
            return true
        }

        if (!player.renameShipTicket || player.renameShipTicket <= 0) {
            await safeSend(msg.key.remoteJid, {
                text: '❌ لا تملك تذكرة تسمية.\nاشترِ "تغيير اسم السفينة" من متجر السفينة أولاً.'
            })
            return true
        }

        const exists = await Ship.findOne({ name: newName })

        if (exists) {
            await safeSend(msg.key.remoteJid, { text: '❌ يوجد سفينة بهذا الاسم.' })
            return true
        }

        const oldName = ship.name
        ship.name = newName
        await ship.save()

        player.renameShipTicket -= 1
        await player.save()

        await safeSend(msg.key.remoteJid, {
            text:
`✅ تم تغيير اسم السفينة

${ship.emoji} ${oldName}
⬅️
${ship.emoji} ${newName}`
        })

        return true
    }

    // ─────────────────────────────────────────────
    // إلغاء حروب سفينتي المعلقة (قبطان فقط)
    // نفس فكرة ".الغاء_الحروب" القديمة بالضبط
    // ─────────────────────────────────────────────
    if (text === '.الغاء_حروب_السفينة') {

        const myShip = await Ship.findOne({ captain: userId })

        if (!myShip) {
            await safeSend(msg.key.remoteJid, { text: '❌ فقط قبطان السفينة يستطيع استخدام هذا الأمر.' })
            return true
        }

        const result = await ShipWar.deleteMany({
            status: { $in: ['pending', 'accepted', 'started'] },
            $or: [
                { attackerShip: myShip.shipId },
                { defenderShip: myShip.shipId }
            ]
        })

        myShip.dailyWars = MAX_DAILY_WARS
        await myShip.save()

        await safeSend(msg.key.remoteJid, {
            text:
`✅ تم إلغاء ${result.deletedCount} حرب معلقة لسفينتك.

⚔️ تمت إعادة محاولات الحرب اليومية إلى ${MAX_DAILY_WARS}.`
        })

        return true
    }

    // ─────────────────────────────────────────────
    // تصفير بيانات كل السفن (للمالك فقط)
    // نفس فكرة ".تصفير_العشائر" القديمة بالضبط
    // ─────────────────────────────────────────────
    if (text === '.تصفير_السفن') {

        if (!isOwner(msg)) {
            await safeSend(msg.key.remoteJid, { text: '❌ هذا الأمر للمالك فقط.' })
            return true
        }

        try {

            await Ship.updateMany(
                {},
                {
                    $set: {
                        wins: 0,
                        losses: 0,
                        rankPoints: 1000,
                        dailyWars: MAX_DAILY_WARS,
                        warCooldown: 0
                    }
                }
            )

            await safeSend(msg.key.remoteJid, {
                text:
`✅ تم تصفير جميع بيانات السفن.

🏆 الانتصارات: 0
❌ الخسائر: 0
🏅 التصنيف: 1000
⚔️ محاولات الحرب: 5`
            })

        } catch (err) {
            console.log(err)
            await safeSend(msg.key.remoteJid, { text: `❌ حدث خطأ.\n\n${err.message}` })
        }

        return true
    }

    // ─────────────────────────────────────────────
    // حذف السفن الفارغة (للمالك فقط)
    // نفس فكرة ".حذف_العشائر_الفارغة" القديمة بالضبط
    // ─────────────────────────────────────────────
    if (text === '.حذف_السفن_الفارغة') {

        if (!isOwner(msg)) {
            await safeSend(msg.key.remoteJid, { text: '❌ هذا الأمر للمالك فقط.' })
            return true
        }

        const result = await Ship.deleteMany({
            members: { $size: 0 }
        })

        await safeSend(msg.key.remoteJid, {
            text: `✅ تم حذف ${result.deletedCount} سفينة فارغة.`
        })

        return true
    }

    // ─────────────────────────────────────────────
    // حذف جميع العشائر القديمة والبدء من جديد بنظام السفن
    // (للمالك فقط) — يحذف كل العشائر وحروبها المعلقة،
    // ويصفّر ربط اللاعبين بأي عشيرة قديمة
    // ─────────────────────────────────────────────
    if (text === '.حذف_كل_العشائر') {

        if (!isOwner(msg)) {
            await safeSend(msg.key.remoteJid, { text: '❌ هذا الأمر للمالك فقط.' })
            return true
        }

        try {

            const clansResult = await Clan.deleteMany({})
            const warsResult = await ClanWar.deleteMany({})

            const playersResult = await Player.updateMany(
                { clanId: { $ne: null } },
                {
                    $set: {
                        clanId: null,
                        clanCooldown: 0
                    }
                }
            )

            await safeSend(msg.key.remoteJid, {
                text:
`✅ تم حذف نظام العشائر بالكامل.

🗑️ عشائر محذوفة: ${clansResult.deletedCount}
🗑️ حروب عشائر محذوفة: ${warsResult.deletedCount}
👤 لاعبين تم فك ارتباطهم: ${playersResult.modifiedCount}

⛵ يمكن للجميع الآن البدء من جديد بنظام السفن.`
            })

        } catch (err) {
            console.log(err)
            await safeSend(msg.key.remoteJid, { text: `❌ حدث خطأ.\n\n${err.message}` })
        }

        return true
    }

    return false
}

// =========================================================================
// محرك جولات حرب السفن (mode: "member") — نفس منطق العشائر القديم بالضبط
// =========================================================================

async function startShipWar(warId, sock, safeSend) {

    const war = await ShipWar.findOne({ warId })
    if (!war) return
    if (war.rounds.length === 0) return

    war.currentRound = 1
    await war.save()

    return runShipRound(warId, sock, safeSend)
}

async function runShipRound(warId, sock, safeSend) {

    const war = await ShipWar.findOne({ warId })
    if (!war) return

    const round = war.rounds.find(x => x.round === war.currentRound)

    if (!round) {
        return finishShipWar(warId, safeSend)
    }

    const attacker = await Player.findOne({ userId: round.attacker })
    const defender = await Player.findOne({ userId: round.defender })

    if (!attacker || !defender) {

        round.finished = true
        round.winner = null
        await war.save()

        war.currentRound++
        await war.save()

        return runShipRound(warId, sock, safeSend)
    }

    await safeSend(war.chatId, {
        text:
`🥊 الجولة ${round.round}

━━━━━━━━━━━━━━

@${round.attacker.split('@')[0]}

🆚

@${round.defender.split('@')[0]}

⚔️ بدأ القتال...

━━━━━━━━━━━━━━`,
        mentions: [round.attacker, round.defender].filter(jid =>
            typeof jid === 'string' && (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid'))
        )
    })

    let result

    try {
        result = await shipBattle(attacker, defender)
    } catch (err) {
        console.log('Ship Battle Error:', err)
        await safeSend(war.chatId, {
            text: `❌ حدث خطأ أثناء الجولة ${round.round}\n\n${err.message}`
        })
        return
    }

    let winner

    if (result.winner === attacker.userId) {
        winner = round.attacker
        war.attackerScore++
    } else {
        winner = round.defender
        war.defenderScore++
    }

    round.winner = winner
    round.finished = true
    await war.save()

    await safeSend(war.chatId, {
        text:
`🏆 انتهت الجولة ${round.round}

الفائز:

@${winner.split('@')[0]}

━━━━━━━━━━━━━━

⚔️ قوة المهاجم:
${result.powerA.toLocaleString()}

🛡️ قوة المدافع:
${result.powerB.toLocaleString()}

━━━━━━━━━━━━━━

🚢 ${war.attackerScore}

🆚

🚢 ${war.defenderScore}`,
        mentions: [winner].filter(jid =>
            typeof jid === 'string' && (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid'))
        )
    })

    war.currentRound++
    await war.save()

    if (war.currentRound <= war.rounds.length) {
        return setTimeout(() => {
            runShipRound(warId, sock, safeSend)
        }, 5000)
    }

    return finishShipWar(warId, safeSend)
}

async function finishShipWar(warId, safeSend) {

    const war = await ShipWar.findOne({ warId })
    if (!war) return

    const attackerShip = await Ship.findOne({ shipId: war.attackerShip })
    const defenderShip = await Ship.findOne({ shipId: war.defenderShip })

    let winnerShip
    let loserShip

    if (war.attackerScore > war.defenderScore) {
        winnerShip = attackerShip
        loserShip = defenderShip
    } else if (war.defenderScore > war.attackerScore) {
        winnerShip = defenderShip
        loserShip = attackerShip
    } else {

        // تعادل → نحسمها بمجموع قوة الطاقم الكامل (نفس فكرة حرب الطاقم الكامل)
        let attackerPower = 0
        let defenderPower = 0

        for (const id of attackerShip.members) {
            const p = await Player.findOne({ userId: id })
            if (!p) continue
            attackerPower += calculatePower(p)
        }

        for (const id of defenderShip.members) {
            const p = await Player.findOne({ userId: id })
            if (!p) continue
            defenderPower += calculatePower(p)
        }

        if (attackerPower >= defenderPower) {
            winnerShip = attackerShip
            loserShip = defenderShip
        } else {
            winnerShip = defenderShip
            loserShip = attackerShip
        }
    }

    const winnerMoney = 300000
    const loserMoney = 150000
    const winnerCoins = 10
    const winnerXP = 250
    const loserXP = 125
    const winnerRating = 25

    for (const id of winnerShip.members) {
        const player = await Player.findOne({ userId: id })
        if (!player) continue
        await player.addMoney(winnerMoney)
        player.shipCoins = (player.shipCoins || 0) + winnerCoins
        player.xp += winnerXP
        await player.save()
    }

    winnerShip.rankPoints += winnerRating
    winnerShip.wins++
    await addShipXP(winnerShip.shipId, winnerXP)
    await winnerShip.save()

    for (const id of loserShip.members) {
        const player = await Player.findOne({ userId: id })
        if (!player) continue
        await player.addMoney(loserMoney)
        player.xp += loserXP
        await player.save()
    }

    loserShip.losses++
    await addShipXP(loserShip.shipId, loserXP)
    await loserShip.save()

    war.status = 'finished'
    await war.save()

    if (!war.chatId || typeof war.chatId !== 'string') {
        console.log('Invalid chatId:', war.chatId)
        return
    }

    await safeSend(war.chatId, {
        text:
`🏆 انتهت الحرب

━━━━━━━━━━━━━━

🥇 الفائز

${winnerShip.emoji} ${winnerShip.name}

${war.attackerScore}

🆚

${war.defenderScore}

${loserShip.emoji} ${loserShip.name}

━━━━━━━━━━━━━━

🎉 جميع أعضاء طاقم ${winnerShip.name}

💰 +300,000

🪙 +10 عملة سفينة

⭐ +250 XP

🚢 +25 Rating للسفينة

━━━━━━━━━━━━━━

${loserShip.name}

💰 +150,000

⭐ +125 XP

📉 خسارة الحرب`
    })
}

// =========================================================================
// إعادة تعيين محاولات حروب السفن اليومية (منتصف الليل بتوقيت السعودية)
// نفس منطق resetClanWars القديم بالضبط — استدعِها مرة وحدة عند تشغيل البوت
// =========================================================================

async function resetShipWars() {

    try {

        const now = new Date()

        const riyadh = new Date(
            now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })
        )

        if (riyadh.getHours() === 0 && riyadh.getMinutes() === 0) {

            await Ship.updateMany(
                {},
                {
                    $set: {
                        dailyWars: MAX_DAILY_WARS,
                        lastWarReset: riyadh.toISOString().slice(0, 10)
                    }
                }
            )

            console.log('✅ تم إعادة محاولات حروب السفن.')
        }

    } catch (err) {
        console.log(err)
    }
}

// =========================================================================
// 👹 استدعاء زعيم السفينة تلقائياً كل يوم الساعة 12 ظهراً بتوقيت السعودية
// (بدون شراء تذكرة) — لكل سفينة ما عندها زعيم نشط حالياً. لو الزعيم
// السابق لسا حي (ما ماتوه)، يبقى كما هو ولا يُستبدل — بس أول ما يموت
// بيتجدد تلقائياً بأقرب تشيك يومي الساعة 12.
// =========================================================================
let lastShipBossSpawnDate = null

async function dailyShipBossSpawn() {

    try {

        const now = new Date()

        const riyadh = new Date(
            now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })
        )

        const today = riyadh.toISOString().slice(0, 10)

        if (
            riyadh.getHours() === 12 &&
            riyadh.getMinutes() === 0 &&
            lastShipBossSpawnDate !== today
        ) {

            lastShipBossSpawnDate = today

            const result = await autoSpawnAllShipBosses()

            console.log(
                `👹 زعماء السفن التلقائيين: ${result.spawned}/${result.total}`
            )
        }

    } catch (err) {
        console.log('Daily Ship Boss Spawn Error:', err)
    }
}

function startShipDailyReset() {
    setInterval(resetShipWars, 60000)
    setInterval(dailyShipBossSpawn, 60000)
}

module.exports = {
    handleShipCommand,
    startShipDailyReset,
    resetShipWars
}
