// =====================================================================
// systems/galleryTournament.js
// -----------------------------------------------------------------
// نظام بطولة "أجمل معرض" — تسجيل عشوائي، قرعة، تصويت لكل مباراة على
// حدة، وتوزيع جوائز لأول مركزين فقط. مستقل بالكامل (نفس فكرة
// werewolfGame / codenamesGame): index.js يستدعي handleMessage()
// أول شي بمعالج الرسائل، ولو رجعت true معناها الرسالة اتّهلكت هنا.
//
// التصميم (الصور) بملف منفصل: systems/galleryTournamentDesign.js
// هذا الملف فيه فقط منطق اللعبة (تسجيل/قرعة/تصويت/جوائز) بدون أي HTML.
//
// ─── الأوامر ───
// .مسابقه_معرض         → المطور فقط: يفتح باب التسجيل بالقروب
// .دخول_معرض           → أي شخص عنده معرض محفوظ (.المعرض) ينضم
// .خروج_معرض           → ينسحب وقت التسجيل فقط
// .بدء_فوري_معرض       → المطور فقط: يبدأ فورًا لو العدد المسجَّل
//                          بالضبط 4 أو 8 أو 16 (16 يبدأ تلقائيًا لحاله)
// .اصوت 1 / .اصوت 2    → أي شخص (غير طرفي المباراة الحالية) يصوّت
// =====================================================================

const Player = require('../models/Player')
const { getGalleryCharacters } = require('./gallerySystem')
const { renderRosterImage } = require('./myRosterCard')
const design = require('./galleryTournamentDesign')

// ─── انسخ دوال الجوائز من systems/RollRewards.js بالضبط كما طلب
// المستخدم ("انسخ دالتهم في ملف البطولة الجديد") — هذا الملف
// مستقل ولا يعتمد على RollRewards.js إطلاقًا ───
const characters = require('../characters.json')
const urAbilities = require('../urAbilities')

function getRandomSSSCharacter() {
    const sssCharacters = characters.filter(c => c.rarity === 'SSS')
    return JSON.parse(JSON.stringify(
        sssCharacters[Math.floor(Math.random() * sssCharacters.length)]
    ))
}

function addRandomAbilities(character, count) {
    const pool = [...urAbilities]
    character.urAbilities = []
    while (character.urAbilities.length < count && pool.length) {
        const totalChance = pool.reduce((sum, a) => sum + a.chance, 0)
        let roll = Math.random() * totalChance
        let index = 0
        for (let i = 0; i < pool.length; i++) {
            roll -= pool[i].chance
            if (roll <= 0) { index = i; break }
        }
        character.urAbilities.push(pool[index])
        pool.splice(index, 1)
    }
    return character
}

// 🥇 جائزة المركز الأول — نفس بالضبط createEXReward بـ RollRewards.js
async function createEXReward() {
    const character = getRandomSSSCharacter()
    character.rarity = 'SSS'
    character.power = 25000
    character.evolutionLevel = 6
    character.evolutionType = 'fixed'
    addRandomAbilities(character, 7)
    return character
}

// 🥈 جائزة المركز الثاني — نفس بالضبط createURIIIReward بـ RollRewards.js
async function createURIIIReward() {
    const character = getRandomSSSCharacter()
    character.rarity = 'SSS'
    character.power = 19000
    character.evolutionLevel = 4
    character.evolutionType = 'fixed'
    addRandomAbilities(character, 4)
    return character
}

// =====================================================================
// إعدادات + حالة اللعبة (بالذاكرة، لكل قروب على حدة)
// =====================================================================
const MAX_ENTRANTS = 16
const VALID_INSTANT_SIZES = [4, 8, 16]
const VOTE_DURATION_MS = 90 * 1000   // 90 ثانية للتصويت العادي
const GRACE_DURATION_MS = 60 * 1000  // دقيقة إضافية عند التعادل

const states = new Map() // groupId -> state

function getState(groupId) {
    if (!states.has(groupId)) {
        states.set(groupId, {
            phase: null,       // null | 'registration' | 'active'
            registered: [],     // [{ userId, name }]
            roundName: '',

            // 🌳 شجرة البطولة الكاملة (تُبنى مرة وحدة بـ initBracket عند البدء
            // وتبقى نفسها طول البطولة — كل مباراة تتحدّث بمكانها، ما فيه حذف)
            bracketSize: 0,          // 16 | 8 | 4 (عدد المتسابقين عند البدء)
            bracket: null,           // { matchNum: { aId,bId,aName,bName,aSeed,bSeed,
                                     //   fromA,fromB, winnerId,winnerName,
                                     //   loserId,loserName, decided } }
            roundsMatchCounts: [],   // عدد مباريات كل دور بالترتيب، مثلاً [8,4,2,1]
            roundStartNums: [],      // أول رقم مباراة بكل دور، مثلاً [1,9,13,15]
            roundIdx: 0,             // فهرس الدور الحالي بـ roundsMatchCounts
            currentMatchNums: [],    // أرقام مباريات الدور الحالي بالترتيب

            matchIndex: 0,
            voting: null,       // { aId, bId, votes: Map, firstVote, graceUsed, timer }
            names: new Map(),   // userId -> pushName (نفس فكرة werewolfGame: احتياطي للاسم
                                 // بدل طباعة رقم الجوال لو مافيه username محفوظ باللاعب)
        })
    }
    return states.get(groupId)
}

function resetState(groupId) {
    const t = states.get(groupId)
    if (t?.voting?.timer) clearTimeout(t.voting.timer)
    states.delete(groupId)
}

function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

function pairUp(list) {
    const pairs = []
    for (let i = 0; i < list.length; i += 2) {
        pairs.push([list[i], list[i + 1]])
    }
    return pairs
}

function sizeToRoundName(size) {
    if (size === 16) return 'دور الـ16'
    if (size === 8) return 'دور الثمانية'
    if (size === 4) return 'نصف النهائي'
    if (size === 2) return 'النهائي'
    return `دور الـ${size}`
}

// 🏷️ نفس فكرة دالة الاسم بلعبة المستذئبين: لو ماكو username محفوظ باللاعب،
// نرجع لآخر pushName محفوظ له (بدل ما نطبع رقم جواله وكأنه "منشن" مطبوع).
function displayName(player, userId, t) {
    if (player?.username) return player.username
    const saved = t && t.names && t.names.get(userId)
    if (saved) return saved
    return userId.split('@')[0]
}

// 🔒 يُستخدم من index.js كبوابة إيقاف — لما البطولة "شغالة فعليًا"
// (بعد اكتمال العدد وبدء المباريات، مو فترة التسجيل) توقف كل باقي
// أوامر البوت بهذا القروب حتى تنتهي البطولة بالكامل
function isActive(groupId) {
    const t = states.get(groupId)
    return !!t && t.phase === 'active'
}

// =====================================================================
// تدفق البطولة
// =====================================================================

async function announceMatch(sock, groupId) {
    const t = getState(groupId)
    const match = t.bracket[t.currentMatchNums[t.matchIndex]]

    const [playerA, playerB] = await Promise.all([
        Player.findOne({ userId: match.aId }),
        Player.findOne({ userId: match.bId }),
    ])

    // 🏷️ الأسماء أصلاً محفوظة بخانة المباراة (match.aName/bName) من
    // beginRound، لكن نمرّرها بـ displayName برضو كاحتياط لو تغيّر
    // username اللاعب بينها وبين لحظة الإعلان
    const nameA = displayName(playerA, match.aId, t)
    const nameB = displayName(playerB, match.bId, t)

    // 🖼️ يرسل معرض الشخصيات الفعلي لكل متسابق (آخر حفظ بـ .المعرض)
    // 📌 مع منشن حقيقي لصاحب المعرض بكابشن الصورة (يضغط عليه)
    try {
        const galleryA = getGalleryCharacters(playerA)
        const imgA = await renderRosterImage(galleryA, { title: nameA, subtitle: 'GALLERY 1' })
        await sock.sendMessage(groupId, {
            image: imgA,
            caption: `🖼️ معرض 1️⃣ — @${match.aId.split('@')[0]}`,
            mentions: [match.aId]
        })

        const galleryB = getGalleryCharacters(playerB)
        const imgB = await renderRosterImage(galleryB, { title: nameB, subtitle: 'GALLERY 2' })
        await sock.sendMessage(groupId, {
            image: imgB,
            caption: `🖼️ معرض 2️⃣ — @${match.bId.split('@')[0]}`,
            mentions: [match.bId]
        })
    } catch (err) {
        console.log('gallery tournament match image error:', err)
    }

    await sock.sendMessage(groupId, {
        text:
`⚔️ ${t.roundName} — مباراة ${t.matchIndex + 1}/${t.currentMatchNums.length}

1️⃣ @${match.aId.split('@')[0]}
2️⃣ @${match.bId.split('@')[0]}

🗳️ صوّتوا بـ .اصوت 1 أو .اصوت 2
⏳ عندكم 90 ثانية

⚠️ المتسابقان ممنوعان من التصويت بجولتهم (لا لنفسه ولا لخصمه)`,
        mentions: [match.aId, match.bId]
    })

    t.voting = {
        aId: match.aId,
        bId: match.bId,
        votes: new Map(),   // userId -> 'a' | 'b'
        firstVote: null,    // { side, time }
        graceUsed: false,
        timer: setTimeout(() => {
            resolveVoting(sock, groupId).catch(err =>
                console.log('gallery tournament resolveVoting error:', err))
        }, VOTE_DURATION_MS)
    }
}

async function resolveVoting(sock, groupId) {
    const t = getState(groupId)
    const v = t.voting
    if (!v) return

    let aVotes = 0, bVotes = 0
    for (const choice of v.votes.values()) {
        if (choice === 'a') aVotes++
        else bVotes++
    }

    // ⚖️ تعادل أول مرة → مهلة إضافية دقيقة واحدة فقط
    if (aVotes === bVotes && !v.graceUsed) {
        v.graceUsed = true
        await sock.sendMessage(groupId, {
            text: `⚖️ تعادل (${aVotes} - ${bVotes})! مهلة إضافية دقيقة واحدة للتصويت...`
        })
        v.timer = setTimeout(() => {
            resolveVoting(sock, groupId).catch(err =>
                console.log('gallery tournament resolveVoting error:', err))
        }, GRACE_DURATION_MS)
        return
    }

    let winnerSide
    let byTiebreak = false

    if (aVotes === bVotes) {
        // ⏱️ لسا متعادلين بعد المهلة → يحسم أول صوت انحسب بالمباراة
        byTiebreak = true
        winnerSide = v.firstVote ? v.firstVote.side : (Math.random() < 0.5 ? 'a' : 'b')
    } else {
        winnerSide = aVotes > bVotes ? 'a' : 'b'
    }

    const winnerId = winnerSide === 'a' ? v.aId : v.bId
    const loserId = winnerSide === 'a' ? v.bId : v.aId

    // 📌 نحدّث خانة المباراة نفسها بالشجرة الدائمة (t.bracket) — هذا
    // اللي يخلي الشجرة "تتذكر" كل نتيجة سابقة بدل ما تُحذف. loserId
    // المخزّن هنا هو اللي يخلي renderBracketTreeImage يرسم خط الشطب
    // على اسم الخاسر بكل صورة قادمة.
    const match = t.bracket[t.currentMatchNums[t.matchIndex]]
    match.winnerId = winnerId
    match.loserId = loserId
    match.winnerName = winnerSide === 'a' ? match.aName : match.bName
    match.loserName = winnerSide === 'a' ? match.bName : match.aName
    match.decided = true

    const winnerName = match.winnerName

    await sock.sendMessage(groupId, {
        text:
`🏆 فاز @${winnerId.split('@')[0]} (${aVotes} - ${bVotes})${byTiebreak ? ' — بالحسم التلقائي (أول صوت)' : ''}

✅ ${winnerName} ينتقل للدور القادم
❌ @${loserId.split('@')[0]} يودّع البطولة`,
        mentions: [winnerId, loserId]
    })

    t.voting = null
    t.matchIndex++

    if (t.matchIndex < t.currentMatchNums.length) {
        // 🔁 لسا فيه مباريات بنفس الدور
        await announceMatch(sock, groupId)
    } else if (t.roundIdx === t.roundsMatchCounts.length - 1) {
        // 🏁 هذي كانت آخر مباراة بآخر دور (النهائي) → خلصت البطولة
        await finishTournament(sock, groupId, winnerId, match)
    } else {
        // ➡️ انتهى الدور الحالي بالكامل → ننتقل للدور التالي
        await beginRound(sock, groupId, t.roundIdx + 1)
    }
}

// ---------------------------------------------------------------
// 🌳 بناء "هيكل" الشجرة الكاملة مرة وحدة عند بدء البطولة
// ---------------------------------------------------------------

// يحسب عدد مباريات كل دور وأول رقم مباراة له، بالاعتماد على عدد
// المتسابقين عند البدء (16/8/4). مثال لـ 16: counts=[8,4,2,1],
// starts=[1,9,13,15] (نفس الترقيم المستخدم بالتصميم دائمًا)
function buildRoundStructure(size) {
    const counts = []
    let n = size / 2
    while (n >= 1) {
        counts.push(n)
        n = n / 2
    }
    const starts = []
    let num = 1
    for (const c of counts) {
        starts.push(num)
        num += c
    }
    return { counts, starts }
}

function initBracket(t, participantIds) {
    const size = participantIds.length
    const { counts, starts } = buildRoundStructure(size)

    t.bracketSize = size
    t.roundsMatchCounts = counts
    t.roundStartNums = starts
    t.roundIdx = 0
    t.bracket = {}

    // الدور الأول: خانات حقيقية (aId/bId معروفين من التقرعة)
    const pairs = pairUp(participantIds)
    pairs.forEach(([a, b], i) => {
        const num = starts[0] + i
        t.bracket[num] = {
            num,
            aId: a, bId: b,
            aName: null, bName: null,
            aSeed: i * 2 + 1, bSeed: i * 2 + 2,
            fromA: null, fromB: null,
            winnerId: null, winnerName: null,
            loserId: null, loserName: null,
            decided: false
        }
    })

    // بقية الأدوار: خانات فاضية لسا (تتحدد لاحقًا من نتيجة المباريات
    // اللي تغذّيها — fromA/fromB)
    for (let r = 1; r < counts.length; r++) {
        for (let i = 0; i < counts[r]; i++) {
            const num = starts[r] + i
            t.bracket[num] = {
                num,
                aId: null, bId: null,
                aName: null, bName: null,
                aSeed: null, bSeed: null,
                fromA: starts[r - 1] + i * 2,
                fromB: starts[r - 1] + i * 2 + 1,
                winnerId: null, winnerName: null,
                loserId: null, loserName: null,
                decided: false
            }
        }
    }
}

// ---------------------------------------------------------------
// ▶️ بدء دور جديد (يشمل الدور الأول) — يملّي أسماء مباريات هذا
// الدور بالشجرة الدائمة، يرسل صورة الشجرة الكاملة المحدَّثة (فيها
// كل الأدوار السابقة بخط شطب على كل خاسر + الدور الحالي بأسماء
// حقيقية + الأدوار القادمة "الفائز من مباراة N")، ثم يبدأ أول مباراة
// ---------------------------------------------------------------
async function beginRound(sock, groupId, roundIdx) {
    const t = getState(groupId)
    t.roundIdx = roundIdx

    const counts = t.roundsMatchCounts
    const starts = t.roundStartNums
    const roundEntrants = counts[roundIdx] * 2
    t.roundName = sizeToRoundName(roundEntrants)

    const matchNums = []
    for (let i = 0; i < counts[roundIdx]; i++) matchNums.push(starts[roundIdx] + i)
    t.currentMatchNums = matchNums
    t.matchIndex = 0

    // نملّي أسماء مباريات هذا الدور: إما من قاعدة اللاعبين (الدور
    // الأول) أو من نتيجة المباريات المغذّية (fromA/fromB) بالأدوار اللي بعده
    for (const num of matchNums) {
        const m = t.bracket[num]

        if (roundIdx === 0) {
            const [pa, pb] = await Promise.all([
                Player.findOne({ userId: m.aId }),
                Player.findOne({ userId: m.bId }),
            ])
            m.aName = displayName(pa, m.aId, t)
            m.bName = displayName(pb, m.bId, t)
        } else {
            const fromA = t.bracket[m.fromA]
            const fromB = t.bracket[m.fromB]
            m.aId = fromA.winnerId
            m.bId = fromB.winnerId
            m.aName = fromA.winnerName
            m.bName = fromB.winnerName
        }
    }

    // 🖼️ صورة الشجرة الكاملة المحدَّثة — نفس الصورة دائمًا من أول
    // دور لآخر دور، ما فيه صورة منفصلة/مقصوصة ولا حذف لأي دور سابق
    try {
        const img = await design.renderBracketTreeImage({
            size: t.bracketSize,
            matches: t.bracket,
            roundBadge: t.roundName
        })

        const caption = roundIdx === 0
            ? '🏆 اكتملت القرعة! هذي شجرة البطولة الكاملة'
            : (roundEntrants === 2
                ? '🏆 وصلنا للنهائي!'
                : `📋 قرعة ${t.roundName} — تحديث شجرة البطولة`)

        await sock.sendMessage(groupId, { image: img, caption })
    } catch (err) {
        console.log('gallery tournament round image error:', err)
    }

    await announceMatch(sock, groupId)
}

async function finishTournament(sock, groupId, championId, finalMatch) {
    const t = getState(groupId)
    // ✅ finalMatch وصل هنا وهو أصلاً "محسوم" (decided=true) من
    // resolveVoting، فـ loserId محفوظ جاهز مباشرة بخانة المباراة
    const loserId = finalMatch.loserId

    const [champion, runnerUp] = await Promise.all([
        Player.findOne({ userId: championId }),
        Player.findOne({ userId: loserId }),
    ])

    if (champion) {
        const reward = await createEXReward()
        champion.characters = champion.characters || []
        champion.characters.push(reward)
        await champion.save()
    }

    if (runnerUp) {
        const reward = await createURIIIReward()
        runnerUp.characters = runnerUp.characters || []
        runnerUp.characters.push(reward)
        await runnerUp.save()
    }

    const champName = displayName(champion, championId, t)
    const runnerName = displayName(runnerUp, loserId, t)

    try {
        const img = await design.renderChampionImage({
            championName: champName,
            runnerUpName: runnerName
        })
        await sock.sendMessage(groupId, { image: img, caption: '🏆 انتهت بطولة أجمل معرض!' })
    } catch (err) {
        console.log('gallery tournament champion image error:', err)
    }

    await sock.sendMessage(groupId, {
        text:
`🎉 ═══〔 نتيجة البطولة 〕═══ 🎉

🥇 البطل: @${championId.split('@')[0]}
🎁 الجائزة: شخصية SSS بقوة 25000 (Power)

🥈 الوصيف: @${loserId.split('@')[0]}
🎁 الجائزة: شخصية SSS بقوة 19000 (Power)

━━━━━━━━━━━━━━━━━━
تم تسليم الجوائز مباشرة بمعرض الشخصيات 🎊`,
        mentions: [championId, loserId]
    })

    resetState(groupId)
}

// =====================================================================
// أوامر التسجيل والبدء
// =====================================================================

async function openRegistration(sock, groupId) {
    const t = getState(groupId)

    if (t.phase) {
        return sock.sendMessage(groupId, {
            text: t.phase === 'registration'
                ? `📝 التسجيل مفتوح أصلاً (${t.registered.length}/${MAX_ENTRANTS}) — اكتب .دخول_معرض`
                : '⚔️ فيه بطولة شغالة حاليًا بهذا القروب'
        })
    }

    t.phase = 'registration'
    t.registered = []

    return sock.sendMessage(groupId, {
        text:
`🏆 ═══〔 بطولة أجمل معرض 〕═══ 🏆

📝 باب التسجيل مفتوح الآن!
✍️ اكتب .دخول_معرض للانضمام (لازم يكون عندك معرض محفوظ بـ .المعرض)

👥 الحد الأقصى: ${MAX_ENTRANTS} متسابق
⚡ عند اكتمال ${MAX_ENTRANTS} تبدأ البطولة تلقائيًا
🎮 أو يقدر المطور يبدأها فورًا عند وصول العدد لـ 4 أو 8 أو 16`
    })
}

async function joinRegistration(sock, groupId, userId, pushName) {
    const t = getState(groupId)
    if (pushName) t.names.set(userId, pushName)

    if (t.phase !== 'registration') {
        return sock.sendMessage(groupId, {
            text: '❌ ما فيه تسجيل مفتوح حاليًا لبطولة أجمل معرض'
        })
    }

    if (t.registered.some(r => r.userId === userId)) {
        return sock.sendMessage(groupId, { text: '✅ أنت مسجّل أصلاً بالبطولة' })
    }

    if (t.registered.length >= MAX_ENTRANTS) {
        return sock.sendMessage(groupId, { text: '❌ التسجيل مكتمل (16/16)' })
    }

    const player = await Player.findOne({ userId })
    const gallery = getGalleryCharacters(player)

    if (!gallery.length) {
        return sock.sendMessage(groupId, {
            text: '❌ لازم يكون عندك معرض محفوظ أول — استخدم .المعرض اضف رقم ثم حاول ثانية'
        })
    }

    t.registered.push({ userId, name: displayName(player, userId, t) })

    await sock.sendMessage(groupId, {
        text: `✅ انضم @${userId.split('@')[0]} للبطولة (${t.registered.length}/${MAX_ENTRANTS})`,
        mentions: [userId]
    })

    if (t.registered.length === MAX_ENTRANTS) {
        await beginTournament(sock, groupId)
    }
}

async function leaveRegistration(sock, groupId, userId) {
    const t = getState(groupId)

    if (t.phase !== 'registration') {
        return sock.sendMessage(groupId, { text: '❌ ما فيه تسجيل مفتوح حاليًا' })
    }

    const before = t.registered.length
    t.registered = t.registered.filter(r => r.userId !== userId)

    if (t.registered.length === before) {
        return sock.sendMessage(groupId, { text: '❌ أنت مو مسجّل بالبطولة' })
    }

    return sock.sendMessage(groupId, {
        text: `👋 انسحبت من البطولة (${t.registered.length}/${MAX_ENTRANTS})`
    })
}

async function instantStart(sock, groupId) {
    const t = getState(groupId)

    if (t.phase !== 'registration') {
        return sock.sendMessage(groupId, { text: '❌ ما فيه تسجيل مفتوح حاليًا' })
    }

    const count = t.registered.length

    if (!VALID_INSTANT_SIZES.includes(count)) {
        return sock.sendMessage(groupId, {
            text: `❌ لازم يكون العدد بالضبط 4 أو 8 أو 16 للبدء الفوري (الحالي: ${count})`
        })
    }

    await beginTournament(sock, groupId)
}

async function beginTournament(sock, groupId) {
    const t = getState(groupId)
    const ids = shuffle(t.registered.map(r => r.userId))

    t.phase = 'active'
    t.registered = []

    await sock.sendMessage(groupId, {
        text: `🚨 اكتمل العدد (${ids.length}) — تبدأ الآن بطولة أجمل معرض! بالتوفيق للجميع 🎉`
    })

    initBracket(t, ids)
    await beginRound(sock, groupId, 0)
}

// =====================================================================
// التصويت
// =====================================================================

async function handleVote(sock, groupId, userId, text, pushName) {
    const t = getState(groupId)
    if (pushName) t.names.set(userId, pushName)

    if (t.phase !== 'active' || !t.voting) {
        return sock.sendMessage(groupId, { text: '❌ ما فيه مباراة تصويت شغالة حاليًا' })
    }

    const args = text.trim().split(/\s+/)
    const choice = args[1]

    if (choice !== '1' && choice !== '2') {
        return sock.sendMessage(groupId, { text: '❌ استخدم: .اصوت 1 أو .اصوت 2' })
    }

    const v = t.voting

    if (userId === v.aId || userId === v.bId) {
        return sock.sendMessage(groupId, {
            text: '🚫 ما تقدر تصوّت بجولتك — لا لنفسك ولا لخصمك'
        })
    }

    // 🔒 التصويت الأول بس هو المحسوب، ما تقدر تغيّره بعدها
    if (v.votes.has(userId)) {
        return sock.sendMessage(groupId, {
            text: '❌ صوّتّ من قبل، التصويت الأول بس هو المحسوب وما تقدر تغيّره.'
        })
    }

    const side = choice === '1' ? 'a' : 'b'
    v.votes.set(userId, side)

    if (!v.firstVote) {
        v.firstVote = { side, time: Date.now() }
    }

    await sock.sendMessage(groupId, { text: '🗳️ تم تسجيل صوتك' })

    // ⚡ إذا كنا بمهلة التعادل الإضافية (الدقيقة الإضافية) وهذا الصوت
    // الجديد فكّ التعادل، نحسم فورًا بدون انتظار باقي المهلة
    if (v.graceUsed) {
        let aVotes = 0, bVotes = 0
        for (const c of v.votes.values()) {
            if (c === 'a') aVotes++
            else bVotes++
        }
        if (aVotes !== bVotes) {
            if (v.timer) clearTimeout(v.timer)
            return resolveVoting(sock, groupId)
        }
    }
}

// =====================================================================
// نقطة الدخول الوحيدة — نفس نمط werewolfGame.handleMessage
// =====================================================================

async function handleMessage(sock, groupId, userId, text, pushName, isOwnerFlag) {
    if (!text || !text.startsWith('.')) return false

    if (text === '.مسابقه_معرض') {
        if (!isOwnerFlag) {
            await sock.sendMessage(groupId, { text: '🚫 هذا الأمر للمطور فقط' })
            return true
        }
        await openRegistration(sock, groupId)
        return true
    }

    if (text === '.دخول_معرض') {
        await joinRegistration(sock, groupId, userId, pushName)
        return true
    }

    if (text === '.خروج_معرض') {
        await leaveRegistration(sock, groupId, userId)
        return true
    }

    if (text === '.بدء_فوري_معرض') {
        if (!isOwnerFlag) {
            await sock.sendMessage(groupId, { text: '🚫 هذا الأمر للمطور فقط' })
            return true
        }
        await instantStart(sock, groupId)
        return true
    }

    if (text.startsWith('.اصوت')) {
        await handleVote(sock, groupId, userId, text, pushName)
        return true
    }

    return false
}

module.exports = {
    handleMessage,
    isActive,
}
