// =====================================================================
// systems/galleryRewards.js
// -----------------------------------------------------------------
// 🖼️ جوائز لايكات المعارض — أسبوعية، كل خميس 1:00 صباحًا بتوقيت السعودية.
//
//   المركز 1  : شخصية SSS عشوائية + 1,000,000 + صندوقين sss_high
//   المركز 2  : شخصية SSS عشوائية + 700,000   + صندوق sss_chance
//   المركز 3  : شخصية SSS عشوائية + 500,000
//   المراكز 4–15: شخصية اسطوري عشوائية + 300,000
//
// الترتيب = نفس ترتيب صفحة المعارض بالموقع (اللايكات ثم عدد الشخصيات).
// يشارك فقط من عنده لايك واحد على الأقل ومعرضه فيه شخصية.
//
// الجوائز توصل لصندوق الهدايا بالموقع (player.giftInbox بنوع reward).
//
// 🛡️ الحماية:
//   • كل جائزة لها معرّف ثابت (period+userId) — لو اللاعب استلمها من قبل
//     تتخطّى، فما تتكرر أبدًا حتى لو انعاد التشغيل.
//   • كل لاعب يُمنح بحفظ واحد (شخصية+مال+صناديق+هدية معًا) — يا كله يا ولا شي.
//   • كل خطوة مغلّفة بإعادة محاولة 3 مرات.
//   • اللايكات ما تُصفَّر إلا بعد نجاح منح *كل* الجوائز؛ لو فشل شي
//     يعيد التشغيل كامل بعد 10 دقايق (والجوائز السابقة ما تتكرر).
// =====================================================================

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const Player = require('../models/Player')
const characters = require('../characters.json')
const { getGalleryCharacters } = require('./gallerySystem')

// ─── الإعدادات ───────────────────────────────────────────────────────
const KSA_OFFSET_MS = 3 * 60 * 60 * 1000      // السعودية UTC+3 (بدون توقيت صيفي)
const PAYOUT_DAY = 4                           // الخميس (0=الأحد … 4=الخميس)
const PAYOUT_HOUR = 1                          // 1:00 صباحًا
const MAX_WINNERS = 15
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 3000
const FAILURE_COOLDOWN_MS = 10 * 60 * 1000     // بعد فشل كامل ننتظر قبل ما نعيد
const TICK_MS = 60 * 1000
const STATE_FILE = path.join(__dirname, '..', 'galleryRewardsState.json')

const PRIZES = {
    1: { rarity: 'SSS', money: 1000000, boxes: { sss_high: 2 }, color: '#f0c04a' },
    2: { rarity: 'SSS', money: 700000, boxes: { sss_chance: 1 }, color: '#c9d1d9' },
    3: { rarity: 'SSS', money: 500000, boxes: {}, color: '#d08a4a' },
    rest: { rarity: 'اسطوري', money: 300000, boxes: {}, color: '#a78bfa' }
}

const BOX_LABELS = {
    sss_high: '💎 صندوق SSS عالي',
    sss_chance: '🌟 صندوق فرصة SSS'
}

// ─── أدوات عامة ──────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function withRetry(label, fn, attempts = MAX_ATTEMPTS) {
    let lastErr
    for (let i = 1; i <= attempts; i++) {
        try {
            return await fn()
        } catch (err) {
            lastErr = err
            console.log(`[galleryRewards] ${label} فشل (${i}/${attempts}):`, err?.message || err)
            if (i < attempts) await sleep(RETRY_DELAY_MS * i)
        }
    }
    throw lastErr
}

// آخر خميس 1:00 ص (بتوقيت السعودية) <= الآن. المفتاح = تاريخه YYYY-MM-DD
function currentPeriod(nowMs = Date.now()) {
    const ksa = new Date(nowMs + KSA_OFFSET_MS) // نقرأ منه بـ getUTC* فيصير توقيت السعودية
    const daysBack = (ksa.getUTCDay() - PAYOUT_DAY + 7) % 7
    let slot = Date.UTC(
        ksa.getUTCFullYear(), ksa.getUTCMonth(), ksa.getUTCDate() - daysBack,
        PAYOUT_HOUR, 0, 0
    )
    if (slot > ksa.getTime()) slot -= 7 * 24 * 60 * 60 * 1000
    return new Date(slot).toISOString().slice(0, 10)
}

// موعد التوزيع/التصفير القادم (الخميس 1:00 ص بتوقيت السعودية) بالمللي ثانية
function nextPayoutAt(nowMs = Date.now()) {
    const current = Date.parse(currentPeriod(nowMs) + 'T00:00:00Z') // تاريخ الخميس (بتوقيت السعودية)
    const slotUtc = current + PAYOUT_HOUR * 60 * 60 * 1000 - KSA_OFFSET_MS
    return slotUtc > nowMs ? slotUtc : slotUtc + 7 * 24 * 60 * 60 * 1000
}

function readState() {
    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    } catch {
        return null
    }
}

function writeState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state))
}

function giftId(period, userId) {
    return crypto.createHash('sha256')
        .update(`galrw:${period}:${userId}`)
        .digest('hex')
        .slice(0, 16)
}

function pickRandomCharacter(rarity) {
    const pool = characters.filter(c => c.rarity === rarity)
    if (!pool.length) throw new Error(`لا توجد شخصيات بالرتبة ${rarity}`)
    const picked = JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]))
    return {
        ...picked,
        originalPower: picked.power,
        evolutionLevel: 0,
        urAbilities: []
    }
}

// ─── الترتيب (نفس منطق صفحة المعارض) ─────────────────────────────────
async function getRanking() {
    const docs = await Player.find({
        'gallery.0': { $exists: true },
        'galleryLikes.0': { $exists: true }
    })
        .select('userId name username gallery galleryLikes characters')
        .lean()

    const list = []
    for (const d of docs) {
        const n = getGalleryCharacters(d).length
        const likes = Array.isArray(d.galleryLikes) ? d.galleryLikes.length : 0
        if (!n || likes < 1) continue
        list.push({
            userId: d.userId,
            name: d.username ? '@' + d.username : (d.name || 'لاعب'),
            likes,
            n
        })
    }

    list.sort((a, b) => (b.likes - a.likes) || (b.n - a.n) || a.name.localeCompare(b.name, 'ar'))
    return list.slice(0, MAX_WINNERS)
}

// ─── منح جائزة للاعب (حفظ واحد = ذرّي) ───────────────────────────────
async function grantPrize(entry, pos, period) {
    const prize = PRIZES[pos] || PRIZES.rest
    const id = giftId(period, entry.userId)

    const player = await Player.findOne({ userId: entry.userId })
    if (!player) return 'missing'

    player.giftInbox = Array.isArray(player.giftInbox) ? player.giftInbox : []
    if (player.giftInbox.some(g => g && g.id === id)) return 'already'

    const char = pickRandomCharacter(prize.rarity)

    player.characters = player.characters || []
    player.characters.push(char)

    player.money = (player.money || 0) + prize.money
    player.totalEarnedMoney = (player.totalEarnedMoney || 0) + prize.money

    player.boxes = player.boxes || {}
    for (const [key, count] of Object.entries(prize.boxes)) {
        player.boxes[key] = (player.boxes[key] || 0) + count
    }

    const items = [`💰 ${prize.money.toLocaleString('en-US')} مال`]
    for (const [key, count] of Object.entries(prize.boxes)) {
        items.push(`${BOX_LABELS[key] || key} × ${count}`)
    }
    items.push(`❤️ بعدد ${entry.likes} لايك`)

    player.giftInbox.push({
        kind: 'reward',
        id,
        group: 'المعارض',
        color: prize.color,
        pos,
        period: `المعارض — ${period}`,
        items,
        charName: char.name,
        charRarity: char.rarity,
        charPower: Number(char.power) || 0,
        charImage: char.image || '',
        at: Date.now(),
        seen: false
    })

    player.markModified('characters')
    player.markModified('boxes')
    player.markModified('giftInbox')

    await player.save()
    return 'granted'
}

// ─── تصفير اللايكات ──────────────────────────────────────────────────
async function resetAllLikes() {
    const res = await Player.updateMany(
        { 'galleryLikes.0': { $exists: true } },
        { $set: { galleryLikes: [] } },
        { strict: false }
    )
    return res.modifiedCount ?? res.nModified ?? 0
}

// ─── التشغيل الكامل لفترة واحدة ──────────────────────────────────────
async function runPeriod(period) {
    const ranking = await withRetry('جلب الترتيب', getRanking)

    let granted = 0
    let already = 0
    const failed = []

    for (let i = 0; i < ranking.length; i++) {
        const entry = ranking[i]
        const pos = i + 1
        try {
            const r = await withRetry(`منح المركز ${pos} (${entry.userId})`, () => grantPrize(entry, pos, period))
            if (r === 'granted') granted++
            else if (r === 'already') already++
        } catch (err) {
            failed.push({ pos, userId: entry.userId, error: err?.message || String(err) })
        }
    }

    // ⛔ لو في أحد فشل: ما نصفّر اللايكات، ونعيد من جديد بعد فترة (المنوحين ما يتكررون)
    if (failed.length) {
        const e = new Error(`فشل منح ${failed.length} جائزة: ` + failed.map(f => `#${f.pos}`).join(', '))
        e.failed = failed
        throw e
    }

    const reset = await withRetry('تصفير اللايكات', resetAllLikes)

    return { winners: ranking.length, granted, already, reset }
}

// ─── الجدولة ─────────────────────────────────────────────────────────
let started = false
let running = false
let cooldownUntil = 0

/**
 * يشغّل المجدول مرة وحدة. notifyOwner(text) اختياري لإشعار المطور.
 */
function startScheduler(notifyOwner) {
    if (started) return
    started = true

    // أول تشغيل بدون ملف حالة: نعتبر الفترة الحالية منتهية عشان ما نوزّع
    // جوائز فترة قديمة فور النشر. التوزيع يبدأ من الخميس القادم.
    if (!readState()) {
        writeState({ lastPeriod: currentPeriod() })
    }

    const tick = async () => {
        if (running || Date.now() < cooldownUntil) return

        const period = currentPeriod()
        const state = readState()
        if (state && state.lastPeriod === period) return

        running = true
        try {
            const r = await runPeriod(period)
            writeState({ lastPeriod: period })
            console.log(`[galleryRewards] ✅ ${period}:`, r)
            if (notifyOwner) {
                await notifyOwner(
                    `🖼️ جوائز المعارض (${period})\n` +
                    `🏆 الفائزون: ${r.winners}\n` +
                    `✅ تم منحهم: ${r.granted}` +
                    (r.already ? ` | سبق منحهم: ${r.already}` : '') +
                    `\n🔄 اللايكات صُفّرت لـ ${r.reset} لاعب`
                ).catch(() => { })
            }
        } catch (err) {
            cooldownUntil = Date.now() + FAILURE_COOLDOWN_MS
            console.error('[galleryRewards] ❌ فشل التوزيع:', err?.message || err)
            if (notifyOwner) {
                await notifyOwner(
                    `❌ فشل توزيع جوائز المعارض (${period})\n${err?.message || err}\n` +
                    `اللايكات ما صُفّرت — بيعيد المحاولة تلقائيًا بعد 10 دقايق.`
                ).catch(() => { })
            }
        } finally {
            running = false
        }
    }

    setInterval(tick, TICK_MS)
    setTimeout(tick, 15 * 1000)
}

module.exports = {
    startScheduler,
    runPeriod,       // للاختبار اليدوي
    currentPeriod,
    nextPayoutAt,    // للعدّاد التنازلي بصفحة المعارض
    getRanking,
    resetAllLikes
}
