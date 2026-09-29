// =====================================================
// 🔨 المزاد الحي بين اللاعبين (Live Auction)
// -----------------------------------------------------
// - الأوامر:
//     .مزاد_حي رقم_الشخصية سعر_البداية [دقائق 5-10]   ← فتح مزاد
//     .مزاد_حي                                         ← حالة المزاد الحالي
//     .بيعت                                            ← البائع ينهي المزاد ويبيع لآخر مزايد
//     .الغاء_مزاد_حي                                   ← البائع (أو المطور) يلغي المزاد
// - المزايدة بدون أي أمر: اللاعب يكتب المبلغ فقط كرقم بدون فواصل
//     مثال:  5000000
// - ينتهي تلقائياً بعد المدة المحددة (5-10 دقائق) ويُباع لأعلى مزايد.
// - مزاد واحد نشط لكل قروب، والبائع مزاد واحد فقط بنفس الوقت.
// - لا يوجد حد أدنى للزيادة ولا سقف للسعر: أي مبلغ أعلى من الحالي مقبول.
// - لا يُحجز شي (لا شخصية ولا فلوس) أثناء المزاد، كل التحقق والنقل
//   يصير لحظة البيع داخل Transaction ذرية (إما تنجح كلها أو تتراجع).
//   يعني لو انطفى البوت أثناء المزاد ما يضيع شي عند أحد.
// =====================================================

const mongoose = require('mongoose')
const Player = require('./models/Player')

const MIN_MINUTES = 5
const MAX_MINUTES = 10
const DEFAULT_MINUTES = 5
const MAX_PRICE = 1e15

// أرقام فقط (إنجليزي أو عربي-هندي) بدون فواصل أو رموز
const BID_RE = /^[0-9\u0660-\u0669]{1,15}$/
const START_RE = /^\.مزاد[ _]حي(?:\s+(.*))?$/

const EVOLUTION_RANKS = ['SSS', 'SSS+', 'SSS++', 'UR I', 'UR II', 'UR III', 'EX', 'Ω']

// groupId -> auction
const auctions = new Map()

// آخر sock حي (يتحدث مع كل رسالة) — التايمر يشتغل بدون رسالة،
// فلازم يستخدم الاتصال الشغال وقتها مو اللي انفتح فيه المزاد
let latestSock = null
let latestResort = null
let latestGiftLocks = null

const sleep = ms => new Promise(r => setTimeout(r, ms))

function toLatinDigits(s) {
    return String(s).replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
}

function fmt(n) {
    return Number(n).toLocaleString('en-US')
}

function tag(userId) {
    return '@' + String(userId).split('@')[0]
}

function rankLabel(c) {
    const lvl = c.evolutionLevel || 0
    return lvl > 0 && EVOLUTION_RANKS[lvl] ? EVOLUTION_RANKS[lvl] : c.rarity
}

// بصمة الشخصية — نستخدمها لحظة البيع نتأكد إن البائع لسا يملكها
function charSignature(c) {
    return [c.name, c.rarity, c.power, c.evolutionLevel || 0, c.form || ''].join('|')
}

function remainingText(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000))
    const m = Math.floor(s / 60)
    const r = s % 60
    return m > 0 ? `${m} د ${r} ث` : `${r} ث`
}

async function send(sock, jid, content) {
    try {
        return await (latestSock || sock).sendMessage(jid, content)
    } catch (err) {
        console.log('LiveAuction send error:', err?.message || err)
    }
}

async function react(sock, msg, emoji) {
    try {
        await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } })
    } catch (err) { /* تفاعل اختياري */ }
}

// -----------------------------------------------------
// إنهاء المزاد وتنفيذ الصفقة
// -----------------------------------------------------

// قفل الطرفين بنفس قفل الإهداء عشان ما تصير عمليتين على نفس الحساب بنفس اللحظة
async function withLocks(ids, fn) {
    const locks = latestGiftLocks

    if (!locks) return fn()

    for (let attempt = 0; attempt < 6; attempt++) {

        if (!ids.some(id => locks.has(id))) {

            ids.forEach(id => locks.add(id))

            try {
                return await fn()
            } finally {
                ids.forEach(id => locks.delete(id))
            }
        }

        await sleep(1500)
    }

    return { status: 'busy' }
}

// محاولة بيع لمزايد واحد. القراءة والتحقق والكتابة كلها داخل الـ Transaction
// (وتُعاد القراءة من جديد لو انعادت المحاولة) فما فيه أي خطر خصم مزدوج.
async function trySale(auction, bid) {

    const session = await mongoose.startSession()
    let outcome = { status: 'error' }

    try {

        await session.withTransaction(async () => {

            outcome = { status: 'error' }

            const seller = await Player.findOne({ userId: auction.sellerId }).session(session)

            const idx = seller
                ? (seller.characters || []).findIndex(c => c && charSignature(c) === auction.signature)
                : -1

            if (idx === -1) {
                outcome = { status: 'nochar' }
                return
            }

            const buyer = await Player.findOne({ userId: bid.userId }).session(session)

            if (!buyer) {
                outcome = { status: 'skip', why: 'ما عنده حساب' }
                return
            }

            if ((buyer.money || 0) < bid.amount) {
                outcome = { status: 'skip', why: 'رصيده ما عاد يكفي' }
                return
            }

            buyer.characters = buyer.characters || []

            if (buyer.characters.length >= (buyer.maxCharacters || 30)) {
                outcome = { status: 'skip', why: 'مخزونه ممتلئ' }
                return
            }

            const [character] = seller.characters.splice(idx, 1)
            seller.markModified('characters')

            seller.money = (seller.money || 0) + bid.amount
            buyer.money = (buyer.money || 0) - bid.amount

            buyer.characters.push(character)

            if (latestResort) latestResort(buyer)

            await seller.save({ session })
            await buyer.save({ session })

            outcome = { status: 'sold', character }
        })

    } catch (err) {

        console.log('❌ LiveAuction transaction error:', err)
        outcome = { status: 'error' }

    } finally {
        await session.endSession()
    }

    return outcome
}

async function finalizeAuction(auction, reason) {

    if (auction.finalizing) return

    auction.finalizing = true
    clearTimeout(auction.timer)

    if (auctions.get(auction.groupId) === auction) {
        auctions.delete(auction.groupId)
    }

    const sock = latestSock || auction.sock
    const jid = auction.groupId
    const name = auction.character.name

    try {

        if (!auction.bids.length) {

            await send(sock, jid, {
                text:
`⌛ ═════〔 انتهى المزاد الحي 〕═════ ⌛

🎁 ${name}

😕 ما أحد زايد، والشخصية باقية مع صاحبها ${tag(auction.sellerId)}`,
                mentions: [auction.sellerId]
            })

            return
        }

        // من الأعلى للأدنى — لو الأعلى ما قدر يدفع ننتقل للي بعده
        const candidates = [...auction.bids].reverse().slice(0, 5)

        const skippedLines = []

        for (const bid of candidates) {

            const outcome = await withLocks(
                [auction.sellerId, bid.userId],
                () => trySale(auction, bid)
            )

            if (outcome.status === 'sold') {

                const c = outcome.character

                const skipText = skippedLines.length
                    ? `\n\n${skippedLines.join('\n')}`
                    : ''

                await send(sock, jid, {
                    text:
`🔨 ═════〔 تم البيع 〕═════ 🔨

🎁 ${c.name}
🌟 ${rankLabel(c)}
⚔️ ${c.power}

👑 البائع: ${tag(auction.sellerId)}
🏆 المشتري: ${tag(bid.userId)}

💰 السعر: ${fmt(bid.amount)}

✅ انتقلت الشخصية للمشتري وانحوّل المبلغ للبائع${reason === 'seller' ? '\n🗣️ أنهى البائع المزاد' : ''}${skipText}`,
                    mentions: [auction.sellerId, bid.userId]
                })

                return
            }

            if (outcome.status === 'nochar') {

                await send(sock, jid, {
                    text:
`❌ أُلغي المزاد

${tag(auction.sellerId)} ما عاد يملك ${name} (انباعت أو انهدت أو تغيّرت)`,
                    mentions: [auction.sellerId]
                })

                return
            }

            if (outcome.status === 'skip') {
                skippedLines.push(`⚠️ تعذّرت مزايدة ${tag(bid.userId)} (${fmt(bid.amount)}): ${outcome.why}`)
                continue
            }

            // busy أو error
            await send(sock, jid, {
                text:
`❌ تعذّر إتمام الصفقة الآن بسبب خطأ تقني

✅ ما انخصم شي من أحد، والشخصية باقية مع ${tag(auction.sellerId)}`,
                mentions: [auction.sellerId]
            })

            return
        }

        await send(sock, jid, {
            text:
`❌ انتهى المزاد بدون بيع

${skippedLines.join('\n')}

✅ الشخصية باقية مع ${tag(auction.sellerId)}`,
            mentions: [auction.sellerId, ...candidates.map(b => b.userId)]
        })

    } catch (err) {
        console.log('❌ LiveAuction finalize error:', err)
    }
}

// -----------------------------------------------------
// فتح مزاد
// -----------------------------------------------------

async function startAuction(ctx, argsText) {

    const { sock, msg, userId, groupId, safeSend, resolveImage } = ctx

    const usage =
`🔨 ═════〔 المزاد الحي 〕═════ 🔨

لفتح مزاد:
.مزاد_حي رقم_الشخصية سعر_البداية

أو بمدة (من 5 إلى 10 دقائق):
.مزاد_حي رقم_الشخصية سعر_البداية 10

مثال:
.مزاد_حي 3 5000000

📌 الأرقام بدون فواصل
📌 رقم الشخصية من .شخصياتي
📌 اللاعبين يزايدون بكتابة المبلغ فقط بدون أي أمر
📌 لإنهاء المزاد قبل وقته والبيع لآخر مزايد اكتب .بيعت`

    const raw = (argsText || '').trim()

    if (!raw) {
        return safeSend(groupId, { text: usage })
    }

    if (/[,،٬.]/.test(raw)) {
        return safeSend(groupId, { text: '❌ اكتب الأرقام بدون فواصل أو نقاط\n\nمثال: .مزاد_حي 3 5000000' })
    }

    const tokens = toLatinDigits(raw).split(/\s+/)

    if (
        tokens.length < 2 ||
        tokens.length > 3 ||
        tokens.some(t => !/^\d+$/.test(t))
    ) {
        return safeSend(groupId, { text: usage })
    }

    const charNumber = parseInt(tokens[0], 10)
    const startPrice = Number(tokens[1])
    const minutes = tokens[2] !== undefined ? parseInt(tokens[2], 10) : DEFAULT_MINUTES

    if (!Number.isInteger(charNumber) || charNumber < 1) {
        return safeSend(groupId, { text: '❌ رقم الشخصية غير صحيح — شوفه من .شخصياتي' })
    }

    if (!Number.isFinite(startPrice) || startPrice < 1 || startPrice > MAX_PRICE) {
        return safeSend(groupId, { text: '❌ سعر البداية لازم يكون رقم أكبر من صفر' })
    }

    if (minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
        return safeSend(groupId, { text: `❌ مدة المزاد من ${MIN_MINUTES} إلى ${MAX_MINUTES} دقائق` })
    }

    if (auctions.has(groupId)) {
        return safeSend(groupId, { text: '❌ فيه مزاد حي شغال بهذا القروب، انتظر ينتهي' })
    }

    for (const a of auctions.values()) {
        if (a.sellerId === userId) {
            return safeSend(groupId, { text: '❌ عندك مزاد حي شغال بالفعل' })
        }
    }

    const seller = await Player.findOne({ userId })

    if (!seller) {
        return safeSend(groupId, { text: '❌ لا تملك حساباً' })
    }

    const character = (seller.characters || [])[charNumber - 1]

    if (!character) {
        return safeSend(groupId, { text: '❌ رقم الشخصية غير موجود — اكتب .شخصياتي عشان تشوف الأرقام' })
    }

    // 🌌 نفس حماية .مزاد و.بيع و.اهداء: أوميقا Ω ما تنباع
    if (character.evolutionLevel === 7) {
        return safeSend(groupId, {
            text: `🌌 شخصية ${character.name} وصلت رتبة أوميقا Ω، ما تقدر تعرضها بالمزاد أبداً.`
        })
    }

    // ممكن اللاعب فتح مزاد بنفس اللحظة من رسالتين — نتأكد ثاني مرة بعد الـ await
    if (auctions.has(groupId)) {
        return safeSend(groupId, { text: '❌ فيه مزاد حي شغال بهذا القروب، انتظر ينتهي' })
    }

    const durationMs = minutes * 60 * 1000

    const auction = {
        groupId,
        sellerId: userId,
        sock,
        character: JSON.parse(JSON.stringify(character)),
        signature: charSignature(character),
        startPrice,
        highestBid: 0,
        highestBidder: null,
        bids: [],
        endsAt: Date.now() + durationMs,
        finalizing: false,
        timer: null
    }

    auction.timer = setTimeout(() => {
        finalizeAuction(auction, 'time').catch(err =>
            console.log('LiveAuction timer error:', err)
        )
    }, durationMs)

    auctions.set(groupId, auction)

    const caption =
`🔨 ═════〔 مزاد حي 〕═════ 🔨

👑 البائع: ${tag(userId)}

🧿 ${character.name}
🌟 ${rankLabel(character)}
⚔️ القوة: ${character.power}

💰 سعر البداية: ${fmt(startPrice)}
⏳ المدة: ${minutes} دقائق

━━━━━━━━━━━━━━

✍️ للمزايدة اكتب المبلغ فقط كرقم بدون فواصل
مثال: ${startPrice}

🗣️ البائع يكتب .بيعت لإنهاء المزاد وبيعها لآخر مزايد`

    let sent = false

    if (resolveImage) {
        try {
            const image = await resolveImage(character.customImage || character.image)

            if (image) {
                await sock.sendMessage(groupId, { image, caption, mentions: [userId] })
                sent = true
            }
        } catch (err) {
            console.log('LiveAuction image error:', err?.message || err)
        }
    }

    if (!sent) {
        await safeSend(groupId, { text: caption, mentions: [userId] })
    }
}

// -----------------------------------------------------
// مزايدة (رقم فقط بدون أمر)
// -----------------------------------------------------

async function handleBid(ctx, auction, amount) {

    const { sock, msg, userId, groupId, safeSend, isBanned } = ctx

    if (userId === auction.sellerId) return true
    if (isBanned && isBanned(userId)) return true
    if (auction.finalizing) return true

    const currentFloor = () =>
        auction.highestBid > 0 ? auction.highestBid + 1 : auction.startPrice

    if (!Number.isSafeInteger(amount) || amount > MAX_PRICE || amount < currentFloor()) {
        await react(sock, msg, '❌')
        return true
    }

    const [info] = await Player.aggregate([
        { $match: { userId } },
        {
            $project: {
                money: 1,
                maxCharacters: 1,
                count: { $size: { $ifNull: ['$characters', []] } }
            }
        }
    ])

    if (!info) {
        await safeSend(groupId, { text: `❌ ${tag(userId)} لا تملك حساباً`, mentions: [userId] })
        return true
    }

    if ((info.money || 0) < amount) {
        await safeSend(groupId, {
            text: `❌ ${tag(userId)} رصيدك ما يكفي\n\n💳 رصيدك: ${fmt(info.money || 0)}`,
            mentions: [userId]
        })
        return true
    }

    if (info.count >= (info.maxCharacters || 30)) {
        await safeSend(groupId, {
            text: `❌ ${tag(userId)} مخزونك ممتلئ، ما تقدر تشتري شخصية`,
            mentions: [userId]
        })
        return true
    }

    // أثناء الـ await ممكن انتهى المزاد أو وصلت مزايدة أعلى
    if (auction.finalizing || auctions.get(groupId) !== auction || amount < currentFloor()) {
        await react(sock, msg, '❌')
        return true
    }

    auction.highestBid = amount
    auction.highestBidder = userId
    auction.bids.push({ userId, amount })

    await safeSend(groupId, {
        text:
`🔨 مزايدة جديدة

🏆 ${tag(userId)}
💰 ${fmt(amount)}

🎁 ${auction.character.name}
⏳ باقي: ${remainingText(auction.endsAt - Date.now())}`,
        mentions: [userId]
    })

    return true
}

// -----------------------------------------------------
// نقطة الدخول من index.js
// ترجع true لو الرسالة تخص المزاد الحي (فيوقف index.js معالجتها)
// -----------------------------------------------------

async function handleLiveAuction(ctx) {

    const { sock, msg, text, userId, groupId, safeSend, resort, giftLocks } = ctx

    latestSock = sock
    if (resort) latestResort = resort
    if (giftLocks) latestGiftLocks = giftLocks

    const t = (text || '').trim()
    const auction = auctions.get(groupId)

    // ⚡ المسار السريع: أغلب الرسائل تنتهي هنا بدون أي عمل
    const startMatch = t.startsWith('.مزاد') ? t.match(START_RE) : null
    const isSold = t === '.بيعت'
    const isCancel = t === '.الغاء_مزاد_حي'
    const isBid = !!auction && BID_RE.test(t)

    if (!startMatch && !isSold && !isCancel && !isBid) return false

    try {

        if (isBid) {
            return await handleBid(ctx, auction, Number(toLatinDigits(t)))
        }

        if (isSold) {

            if (!auction) {
                await safeSend(groupId, { text: '❌ لا يوجد مزاد حي نشط حالياً' })
                return true
            }

            if (userId !== auction.sellerId) {
                await safeSend(groupId, { text: '❌ فقط صاحب المزاد يقدر ينهيه' })
                return true
            }

            await finalizeAuction(auction, 'seller')
            return true
        }

        if (isCancel) {

            if (!auction) {
                await safeSend(groupId, { text: '❌ لا يوجد مزاد حي نشط حالياً' })
                return true
            }

            if (userId !== auction.sellerId && !ctx.isOwnerUser) {
                await safeSend(groupId, { text: '❌ فقط صاحب المزاد يقدر يلغيه' })
                return true
            }

            auction.finalizing = true
            clearTimeout(auction.timer)
            auctions.delete(groupId)

            await safeSend(groupId, {
                text: `🚫 أُلغي المزاد الحي على ${auction.character.name}\n\n✅ ما تغيّر شي عند أحد`
            })
            return true
        }

        // .مزاد_حي
        const argsText = startMatch[1] || ''

        if (!argsText.trim() && auction) {

            const leader = auction.highestBidder
                ? `${tag(auction.highestBidder)} بمبلغ ${fmt(auction.highestBid)}`
                : `لا أحد بعد (السعر يبدأ من ${fmt(auction.startPrice)})`

            await safeSend(groupId, {
                text:
`🔨 ═════〔 المزاد الحي الحالي 〕═════ 🔨

🎁 ${auction.character.name} (${rankLabel(auction.character)}) ⚔️ ${auction.character.power}
👑 البائع: ${tag(auction.sellerId)}

🏆 الأعلى: ${leader}
⏳ باقي: ${remainingText(auction.endsAt - Date.now())}

✍️ للمزايدة اكتب المبلغ فقط كرقم بدون فواصل`,
                mentions: [auction.sellerId, ...(auction.highestBidder ? [auction.highestBidder] : [])]
            })
            return true
        }

        await startAuction(ctx, argsText)
        return true

    } catch (err) {

        console.log('❌ LiveAuction error:', err)

        await safeSend(groupId, { text: '❌ حدث خطأ بالمزاد الحي' })

        return true
    }
}

module.exports = { handleLiveAuction }
