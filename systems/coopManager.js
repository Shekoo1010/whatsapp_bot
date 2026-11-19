const CoOp = require('../models/CoOp')

const bosses = require('../data/CoOpBosses')

const battle = require('./coopBattle')

const { runLocked, locked } = require('./coopLock')

const Player = require('../models/Player')

// =========================
// Helpers
// =========================

function random(min, max) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min

}

function choose(list) {

    return list[
        random(
            0,
            list.length - 1
        )
    ]

}


// =========================
// 🔁 دورة البوسيز + رايد مرة باليوم
// - كل بوس يطلع مرة قبل ما يتكرر أي بوس (دورة عشوائية بدون تكرار حتى تخلص الكل)
// - بوسات RAID: مرة واحدة باليوم (بتوقيت السعودية)، تطلع أول ظهور بعد RAID_HOUR
//   وبقية اليوم يطلع A وSS فقط
// =========================
const SAUDI_OFFSET_MS = 3 * 60 * 60 * 1000
const RAID_HOUR = 20 // 8 م بتوقيت السعودية

function saudiNow() {
    const d = new Date(Date.now() + SAUDI_OFFSET_MS)
    return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours() }
}

function pickBoss(coop) {
    const { day, hour } = saudiNow()
    const isRaid = b => b.rank === 'RAID'
    const raids = bosses.filter(isRaid)
    const normal = bosses.filter(b => !isRaid(b))
    let cycle = Array.isArray(coop.bossCycle) ? coop.bossCycle.map(String) : []

    const wantRaid = raids.length > 0 && coop.lastRaidDay !== day && hour >= RAID_HOUR
    let group = wantRaid ? raids : (normal.length ? normal : bosses)

    let pool = group.filter(b => !cycle.includes(String(b.id)))
    if (!pool.length) {
        // خلصت دورة هذه الفئة: نبدأها من جديد
        const ids = new Set(group.map(b => String(b.id)))
        cycle = cycle.filter(id => !ids.has(id))
        pool = group
    }

    const boss = choose(pool)
    cycle.push(String(boss.id))
    coop.bossCycle = cycle
    if (isRaid(boss)) coop.lastRaidDay = day
    return boss
}

let sockRef = null

function setSock(sock) {
    if (sock) sockRef = sock
}

function getSock() {
    return sockRef
}

// =========================
// Configuration
// =========================

const CONFIG = {

    spawnEvery: 4 * 60 * 60 * 1000,

    // لا يوجد وقت تسجيل: الكو اوب مفتوح حتى ينضم 5 لاعبين
    startDelay: 5000,

    // يظهر زر "استعداد" عند وصول هذا العدد، وإذا ضغطه الجميع يبدأ القتال فوراً
    readyMin: 8,

    maxPlayers: {

        A: 15,

        SS: 15,

        RAID: 15

    },

    groups: [

        "120363409897316453@g.us"

    ]

}
// =========================
// Create Co-Op
// =========================

async function _createCoOp() {

    let coop = await CoOp.findOne()

    if (!coop) {

        coop = new CoOp()

    }

    const boss = pickBoss(coop)

    coop.active = true

    coop.status = "waiting"

    coop.round = 1

    coop.currentTurn = 0

    coop.players = []

    coop.leaderboard = []

    coop.battleLog = []

    coop.rewardsClaimed = []

    coop.joinEnd = 0

    coop.startAt = 0

    coop.ready = []

    coop.turnEnd = 0

    coop.boss = {

        id: boss.id,

        name: boss.name,

        anime: boss.anime,

        rank: boss.rank,

        image: boss.image,

        hp: boss.hp,

        maxHp: boss.hp,

        shield: 0,

        phase: 1,

        rage: false,

        skills: boss.skills,

        buffs: [],

        debuffs: []

    }

    

    await coop.save()

    return coop

}

const createCoOp = locked(_createCoOp)
// =========================
// Announce Co-Op
// =========================

async function announceCoOp(sock) {

    const coop = await createCoOp()

    const maxPlayers =
        CONFIG.maxPlayers[
            coop.boss.rank
        ]

    const text =
`╭━━━〔 🌍 CO-OP RAID 〕━━━⬣

👹 *${coop.boss.name}*

🎮 ${coop.boss.anime}

🏆 Rank : ${coop.boss.rank}

❤️ HP : ${coop.boss.maxHp.toLocaleString()}

👥 Players : 0/${maxPlayers}

━━━━━━━━━━━━━━

⏳ التسجيل مفتوح حتى يكتمل الفريق (${maxPlayers} لاعبين)،
أو يبدأ فوراً إذا ضغط الجميع «استعداد» (من 8 لاعبين).

🌐 الانضمام والقتال من الموقع فقط (صفحة الكو اوب).

━━━━━━━━━━━━━━

⚔ جهز أقوى 3 شخصيات لديك!

╰━━━━━━━━━━━━━━━━⬣`

    for (const group of CONFIG.groups) {

        try {

            await sock.sendMessage(

                group,

                {

                    image: {

                        url: coop.boss.image

                    },

                    caption: text

                }

            )

        } catch (err) {

            console.log(

                "Co-Op Announcement Error:",

                err.message

            )

        }

    }

}
// =========================
// Lock: يمنع تعارض الانضمام المتزامن (كان يسبب وصول الفريق 15/15 بدون أن ينتبه أحد لاكتماله)
// =========================

function withLock(fn) {
    return runLocked(fn)
}

// تعديل وثيقة الكو اوب داخل القفل: تحميل جديد ← تعديل ← حفظ
const mutate = locked(async (fn) => {
    const c = await CoOp.findOne()
    if (!c) return null
    await fn(c)
    await c.save()
    return c
})

function joinPlayer(userId, name) {
    return withLock(() => _joinPlayer(userId, name))
}

function setReady(userId) {
    return withLock(() => _setReady(userId))
}

// =========================
// Join Player
// =========================

async function _joinPlayer(userId, name) {

    const coop = await CoOp.findOne()

    if (

        !coop ||

        !coop.active ||

        coop.status !== "waiting"

    ) {

        return {

            success: false,

            message: "لا يوجد Co-Op حالياً."

        }

    }

    if (

        coop.players.find(

            p => p.userId === userId

        )

    ) {

        return {

            success: false,

            message: "لقد انضممت بالفعل."

        }

    }

    const player = await Player.findOne({

        userId

    })

    if (!player) {

        return {

            success: false,

            message: "لا يوجد حساب."

        }

    }

    if (

        !player.characters ||

        player.characters.length < 3

    ) {

        return {

            success: false,

            message: "يجب أن تمتلك 3 شخصيات على الأقل."

        }

    }

    const limit =

        CONFIG.maxPlayers[
            coop.boss.rank
        ]

    if (

        coop.players.length >= limit

    ) {

        return {

            success: false,

            message: "الفريق مكتمل."

        }

    }

    // =========================
    // تجهيز أقوى 3 شخصيات
    // =========================

    // 🎯 الفريق المختار من الموقع (player.coopTeam) وإلا أقوى 3
    const characters =

        pickCoopTeam(player.characters, player.coopTeam)

        .map(({ character, index }) => {

            const c = character.toObject
                ? character.toObject()
                : character

            return {

                ...c,

                charIndex: index,

                image: c.customImage || c.image || "",

                hp: c.power,

                maxHp: c.power,

                shield: 0,

                alive: true,

                buffs: [],

                debuffs: []

            }

        })

    coop.players.push({

        userId,

        name,

        damage: 0,

        totalDamage: 0,

        currentCharacter: 0,

        finished: false,

        characters

    })

    const full = coop.players.length >= limit

    if (full) {
        coop.startAt = Date.now() + CONFIG.startDelay
    }

    await coop.save()

    if (full) scheduleStart(sockRef)

    return {

        success: true,

        players: coop.players.length,

        maxPlayers: limit,

        player: {

            userId,

            name

        }

    }

}
// =========================
// Ready (استعداد) — يظهر عند 8 لاعبين
// =========================

async function _setReady(userId) {

    const coop = await CoOp.findOne()

    if (!coop || !coop.active || coop.status !== "waiting") {
        return { success: false, message: "لا يوجد Co-Op بانتظار اللاعبين." }
    }

    if (!coop.players.find(p => p.userId === userId)) {
        return { success: false, message: "لم تنضم لهذا الـ Co-Op." }
    }

    if (coop.players.length < CONFIG.readyMin) {
        return {
            success: false,
            message: `يتفعل الاستعداد عند ${CONFIG.readyMin} لاعبين.`
        }
    }

    const ready = new Set(coop.ready || [])

    if (ready.has(userId)) ready.delete(userId)
    else ready.add(userId)

    coop.ready = [...ready]

    const everyone = coop.players.every(p => ready.has(p.userId))

    if (everyone) coop.startAt = Date.now()

    await coop.save()

    if (everyone) scheduleStart(sockRef, 0)

    return {
        success: true,
        ready: ready.has(userId),
        readyCount: coop.ready.length,
        players: coop.players.length,
        started: everyone
    }

}

// =========================
// Auto Start (بعد اكتمال الفريق بـ 5 ثوانٍ)
// =========================

let startTimer = null

function scheduleStart(sock, delay = CONFIG.startDelay) {

    if (startTimer) return

    startTimer = setTimeout(async () => {

        startTimer = null

        try {
            await startBattle(sock || sockRef)
        } catch (err) {
            console.log('Co-Op startBattle Error:', err)
        }

    }, delay)

}

// =========================
// Start Battle
// =========================

const _prepareBattle = locked(async () => {

    const coop = await CoOp.findOne()

    if (

        !coop ||

        !coop.active ||

        coop.status !== "waiting"

    ) return null

    if (coop.players.length === 0) {

        coop.active = false

        coop.status = "idle"

        await coop.save()

        return null

    }

    coop.status = "battle"

    await coop.save()

    return coop

})

async function startBattle(sock) {

    const coop = await _prepareBattle()

    if (!coop) return

    await battle.startBattle(

        sock,

        coop

    )

}

// =========================
// Finish Co-Op
// =========================

const finishCoOp = locked(async function (sock) {

    const coop = await CoOp.findOne()

    if (!coop) return

    coop.active = false
    coop.status = "idle"
    coop.players = []
    coop.leaderboard = []
    coop.battleLog = []
    coop.rewardsClaimed = []
    coop.currentTurn = 0
    coop.round = 1
    coop.boss = {}
    coop.turnEnd = 0
    coop.joinEnd = 0
    coop.startAt = 0
    coop.ready = []

    await coop.save()

    if (sock) {
        scheduleNextCoOp(sock)
    }

})

// =========================
// Co-Op Loop
// =========================

let coopTimer = null
let finishedSeenAt = 0

async function scheduleNextCoOp(sock) {

    if (coopTimer) {
        clearTimeout(coopTimer)
        coopTimer = null
    }

    let coop = await CoOp.findOne()

    if (!coop) {
        coop = new CoOp({
            active: false,
            status: "idle",
            nextSpawn: Date.now() + CONFIG.spawnEvery
        })

        await coop.save()
    }

    // إذا لم يكن هناك موعد محفوظ
    if (!coop.nextSpawn || coop.nextSpawn <= 0) {

        const ns = Date.now() + CONFIG.spawnEvery

        await mutate(c => { c.nextSpawn = ns })

        coop.nextSpawn = ns
    }

    // إذا كان هناك Co-Op نشط فلا ننشئ واحداً جديداً
    if (coop.active) {

        try {

            // 🛟 القتال انتهى لكن التنظيف/الجوائز تعطّل فبقيت الحالة "finished" والكو اوب نشط للأبد:
            // لو بقيت كذلك أكثر من 90 ثانية نصفّر الكو اوب ليظهر التالي
            if (coop.status === "finished") {

                if (!finishedSeenAt) {
                    finishedSeenAt = Date.now()
                } else if (Date.now() - finishedSeenAt > 90000) {
                    console.log('Co-Op watchdog: عالق على finished (hp=' + (coop.boss && coop.boss.hp) + ')، تصفير الكو اوب')
                    finishedSeenAt = 0
                    await finishCoOp(sock || sockRef)
                    return
                }

            } else {
                finishedSeenAt = 0
            }

            const max = CONFIG.maxPlayers[coop.boss && coop.boss.rank] || 15

            // 🛟 الفريق مكتمل أو الكل ضغط استعداد لكن القتال ما بدأ (تعارض/إعادة تشغيل): نبدأه
            if (coop.status === "waiting" && coop.players.length > 0) {

                const full = coop.players.length >= max

                const allReady =
                    coop.players.length >= CONFIG.readyMin &&
                    coop.players.every(p => (coop.ready || []).includes(p.userId))

                if (full || allReady) {

                    if (!coop.startAt) {
                        const sa = Date.now() + (allReady && !full ? 0 : CONFIG.startDelay)
                        await mutate(c => { if (!c.startAt) c.startAt = sa })
                        coop.startAt = sa
                    }

                    scheduleStart(sock, Math.max(0, coop.startAt - Date.now()))

                }

            }

            // 🛟 القتال واقف (مؤقت الدور ضاع بإعادة تشغيل/خطأ): نكمل بهجوم تلقائي
            if (
                coop.status === "battle" &&
                coop.turnEnd > 0 &&
                Date.now() > coop.turnEnd + 8000
            ) {
                console.log('Co-Op watchdog: القتال واقف، نكمل الدور')
                await battle.autoAttack(sock || sockRef)
            }

        } catch (err) {
            console.log('Co-Op watchdog Error:', err)
        }

        coopTimer = setTimeout(() => {
            scheduleNextCoOp(sock).catch(console.log)
        }, 15000) // يفحص كل 15 ثانية

        return
    }

    const now = Date.now()

    // إذا حان الوقت أو تأخرنا عنه (البوت كان مطفياً)
    if (now >= coop.nextSpawn) {

        await announceCoOp(sock)

await mutate(c => { c.nextSpawn = now + CONFIG.spawnEvery })

// ⚠️ كان هنا return بدون إعادة تشغيل الحلقة فتموت المراقبة بعد أول ظهور
coopTimer = setTimeout(() => {
    scheduleNextCoOp(sock).catch(console.log)
}, 15000)

return
    }

    // الوقت المتبقي
    const delay = coop.nextSpawn - now

    coopTimer = setTimeout(() => {

        scheduleNextCoOp(sock).catch(console.log)

    }, delay)

}
function startLoop(sock) {
    setSock(sock)
    scheduleNextCoOp(sock).catch(console.log)
}
// =========================
// Force Spawn
// =========================

async function forceSpawn(sock) {

    setSock(sock)

    const coop = await CoOp.findOne()

    if (

        coop &&

        coop.active

    ) {

        return false

    }

    await announceCoOp(sock)
    await mutate(c => { c.nextSpawn = Date.now() + CONFIG.spawnEvery })

scheduleNextCoOp(sock).catch(console.log)

    return true

}
// 🎯 يختار 3 شخصيات للكو اوب: المختارة بالأسماء (إن وُجدت، وأقوى نسخة لو تكرر الاسم)
// وأي نقص يُكمَّل بأقوى الباقي. لو ما اختار شي = أقوى 3 (نفس السلوك القديم).
function pickCoopTeam(chars, savedNames) {
    const list = Array.from(chars || []).map((character, index) => ({ character, index }))
    const pw = x => Number(x.character && x.character.power) || 0
    const picked = []
    const used = new Set()

    for (const name of Array.from(savedNames || []).slice(0, 3)) {
        let best = null
        for (const x of list) {
            if (used.has(x.index) || !x.character || x.character.name !== name) continue
            if (!best || pw(x) > pw(best)) best = x
        }
        if (best) { used.add(best.index); picked.push(best) }
    }

    if (picked.length < 3) {
        const rest = list
            .filter(x => !used.has(x.index))
            .sort((a, b) => pw(b) - pw(a) || a.index - b.index)
        for (const x of rest) {
            if (picked.length >= 3) break
            picked.push(x)
        }
    }

    return picked
}

module.exports = {
    pickCoopTeam,
    createCoOp,
    announceCoOp,
    joinPlayer,
    startBattle,
    finishCoOp,
    startLoop,
    forceSpawn,
    setSock,
    getSock,
    setReady,
    CONFIG
}
