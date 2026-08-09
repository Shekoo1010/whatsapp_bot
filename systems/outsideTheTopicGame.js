// =========================================================
// 🎭 لعبة "برا السالفة" (Spyfall Style)
// =========================================================
// الفكرة:
// - يبدأ أحدهم اللعبة بتحديد category، يشارك 4-10 لاعبين.
// - البوت يختار كلمة عشوائية من الـ category ويرسل بالخاص:
//     * لأغلب اللاعبين: الكلمة (داخل السالفة)
//     * لواحد أو اثنين (لو العدد فوق 8): "أنت برا السالفة" بدون الكلمة
// - جولة تلقائية: البوت يمنشن شخصين "فلان اسأل فلان"، فلان يسأل
//   بالشات، والمسؤول يجاوب نعم/لا فقط، وينتقل تلقائي للزوج التالي
//   حتى يمر على الكل.
// - كل دور (تلقائي أو حر) عنده مهلة دقيقتين: لو ما جاوب المسؤول
//   بالوقت، البوت ينتقل تلقائياً للدور التالي.
// - بعدها فترة أسئلة حرة: أي مشارك يطلب يسأل شخص محدد.
// - .تصويت يفتح التصويت، كل واحد يصوت برقم اللي يشك فيه.
// - يكشف البوت مين "برا السالفة" ويوزع نقاط.
// - جولة جديدة بنفس اللاعبين مع category جديد، أو إنهاء اللعبة
//   وعرض الترتيب النهائي.
// =========================================================

// ---------------------------------------------------------
// 1) بنك الكلمات لكل category — زد عليها براحتك
// ---------------------------------------------------------
const CATEGORY_WORDS = {
    'انمي': ['ناروتو', 'ون بيس', 'اتاك اون تايتن', 'دراغون بول', 'بليتش', 'ديث نوت', 'جوجتسو كايسن', 'ديمون سلاير', 'فيري تيل', 'هجوم العمالقة'],
    'رياضه': ['كرة القدم', 'كرة السلة', 'التنس', 'السباحة', 'الملاكمة', 'الجودو', 'كرة الطائرة', 'الجري', 'ركوب الخيل', 'الغولف'],
    'فواكه': ['تفاح', 'موز', 'عنب', 'بطيخ', 'مانجو', 'فراولة', 'أناناس', 'برتقال', 'رمان', 'كيوي'],
    'دول': ['السعودية', 'مصر', 'اليابان', 'كوريا الجنوبية', 'فرنسا', 'البرازيل', 'ألمانيا', 'الإمارات', 'تركيا', 'إيطاليا'],
    'اكلات': ['كبسة', 'مندي', 'برجر', 'بيتزا', 'شاورما', 'سوشي', 'مقلوبة', 'فول', 'كنافة', 'باستا']
}

const MIN_PLAYERS = 4
const MAX_PLAYERS = 10
const LOBBY_WAIT_MS = 5 * 60 * 1000
const TURN_TIMEOUT_MS = 2 * 60 * 1000 // ⏱️ مهلة دقيقتين لكل دور
const CORRECT_VOTE_POINTS = 100
const OUTSIDE_SURVIVE_POINTS = 150

// groupId -> gameState
const games = new Map()

function newScoreboard(players, existing) {
    const scores = new Map()
    players.forEach(p => scores.set(p, (existing && existing.get(p)) || 0))
    return scores
}

function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

function mentionTag(userId) {
    return `@${userId.split('@')[0]}`
}

// ---------------------------------------------------------
// إدارة مؤقّت الدور (دقيقتين) — دالة واحدة تُستخدم بكل مكان
// يبدأ فيه دور جديد، عشان ما يتكرر المنطق
// ---------------------------------------------------------
function clearTurnTimer(state) {
    if (state.pendingTimer) {
        clearTimeout(state.pendingTimer)
        state.pendingTimer = null
    }
}

async function setPendingTurn(sock, groupId, state, turn, announce = true) {
    clearTurnTimer(state)
    state.pendingTurn = turn

    if (announce) {
        await sock.sendMessage(groupId, {
            text: `🎙️ ${mentionTag(turn.asker)} اسأل ${mentionTag(turn.answerer)}\n\n(${mentionTag(turn.answerer)} جاوب بـ "نعم" أو "لا" فقط — عندك دقيقتين ⏱️)`,
            mentions: [turn.asker, turn.answerer]
        })
    }

    state.pendingTimer = setTimeout(() => {
        onTurnTimeout(sock, groupId).catch(console.log)
    }, TURN_TIMEOUT_MS)
}

// ---------------------------------------------------------
// لما تنتهي المهلة بدون رد — ننتقل تلقائياً للي بعده
// ---------------------------------------------------------
async function onTurnTimeout(sock, groupId) {
    const state = games.get(groupId)
    if (!state || !state.pendingTurn) return

    const { answerer, type } = state.pendingTurn
    state.pendingTurn = null
    state.pendingTimer = null

    await sock.sendMessage(groupId, {
        text: `⏱️ انتهت مهلة الدقيقتين ولم يجاوب ${mentionTag(answerer)}، ننتقل تلقائياً للي بعده...`,
        mentions: [answerer]
    })

    if (type === 'auto') {
        state.turnIndex++
        return announceNextAutoTurn(sock, groupId)
    }

    // نوع 'extra': خذ التالي من الطابور لو موجود، وإلا انتظر طلبات جديدة
    if (state.extraQueue.length) {
        const next = state.extraQueue.shift()
        return setPendingTurn(sock, groupId, state, { asker: next.asker, answerer: next.answerer, type: 'extra' })
    }
}

// ---------------------------------------------------------
// 2) بدء اللوبي (فتح باب الانضمام)
// ---------------------------------------------------------
async function startLobby(sock, groupId, category, starterId) {
    if (games.has(groupId)) {
        return sock.sendMessage(groupId, { text: '⚠️ فيه لعبة برا السالفة شغالة حالياً بهذا الجروب.' })
    }

    const cat = (category || '').trim()
    if (!CATEGORY_WORDS[cat]) {
        return sock.sendMessage(groupId, {
            text: `❌ الفئة غير موجودة. الفئات المتاحة:\n${Object.keys(CATEGORY_WORDS).join(' / ')}`
        })
    }

    const state = {
        phase: 'lobby',
        category: cat,
        word: null,
        players: [starterId],
        roles: new Map(),
        scores: new Map(),
        turnOrder: [],
        turnIndex: 0,
        extraQueue: [],
        pendingTurn: null,
        pendingTimer: null,
        votes: new Map(),
        outsiders: [],
        lobbyTimer: null
    }

    games.set(groupId, state)

    state.lobbyTimer = setTimeout(() => {
        beginRound(sock, groupId).catch(console.log)
    }, LOBBY_WAIT_MS)

    return sock.sendMessage(groupId, {
        text: `🎭 ═══〔 لعبة برا السالفة 〕═══ 🎭

📂 الفئة: ${cat}
👥 من ${MIN_PLAYERS} إلى ${MAX_PLAYERS} لاعبين

✅ انضم بكتابة: .انضم_برا_السالفه
⏱️ اللعبة تبدأ تلقائياً بعد 5 دقايق، أو اكتب .ابدأ_الجولة إذا اكتمل العدد

المشاركين حالياً (1):
${mentionTag(starterId)}`,
        mentions: [starterId]
    })
}

// ---------------------------------------------------------
// 3) الانضمام للوبي
// ---------------------------------------------------------
async function joinLobby(sock, groupId, userId) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'lobby') {
        return sock.sendMessage(groupId, { text: '❌ ماكو لعبة برا السالفة مفتوحة للانضمام حالياً.' })
    }

    if (state.players.includes(userId)) {
        return sock.sendMessage(groupId, { text: '✅ انت مسجل بالفعل.' })
    }

    if (state.players.length >= MAX_PLAYERS) {
        return sock.sendMessage(groupId, { text: '❌ اكتمل العدد الأقصى (10 لاعبين).' })
    }

    state.players.push(userId)

    return sock.sendMessage(groupId, {
        text: `✅ ${mentionTag(userId)} انضم للعبة! (${state.players.length}/${MAX_PLAYERS})`,
        mentions: [userId]
    })
}

// ---------------------------------------------------------
// 4) بدء الجولة: اختيار الكلمة، توزيع الأدوار، إرسال الخاص
// ---------------------------------------------------------
async function beginRound(sock, groupId) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'lobby') return

    if (state.lobbyTimer) clearTimeout(state.lobbyTimer)
    state.lobbyTimer = null

    if (state.players.length < MIN_PLAYERS) {
        games.delete(groupId)
        return sock.sendMessage(groupId, {
            text: `❌ العدد ما وصل ${MIN_PLAYERS} لاعبين، تم إلغاء اللعبة.`
        })
    }

    const words = CATEGORY_WORDS[state.category]
    state.word = words[Math.floor(Math.random() * words.length)]

    const outsiderCount = state.players.length > 8 ? 2 : 1
    const shuffled = shuffle(state.players)
    state.outsiders = shuffled.slice(0, outsiderCount)

    state.roles = new Map()
    state.players.forEach(p => {
        state.roles.set(p, state.outsiders.includes(p) ? 'outside' : 'inside')
    })

    if (!state.scores.size) state.scores = newScoreboard(state.players, state.scores)
    else state.players.forEach(p => { if (!state.scores.has(p)) state.scores.set(p, 0) })

    // إرسال الأدوار بالخاص
    for (const player of state.players) {
        const role = state.roles.get(player)
        const text = role === 'outside'
            ? `🎭 برا السالفة!\n\nأنت "برا السالفة" 🚫 — ما تعرف الكلمة.\nفئة هذي الجولة: ${state.category}\nحاول تفهم من أسئلة وأجوبة الباقين وما تنكشف!`
            : `🎭 داخل السالفة ✅\n\nالفئة: ${state.category}\nالكلمة: 🔑 ${state.word}\n\nجاوب بذكاء بدون ما تفضح الكلمة لمن هو برا السالفة!`

        try {
            await sock.sendMessage(player, { text })
        } catch (err) {
            console.log('فشل إرسال الخاص لـ', player, err)
        }
    }

    state.phase = 'auto_round'
    state.turnOrder = shuffle(state.players)
    state.turnIndex = 0

    await sock.sendMessage(groupId, {
        text: `🎬 بدأت الجولة!\n\n📂 الفئة: ${state.category}\n👥 اللاعبين: ${state.players.length}\n🚫 عدد اللي برا السالفة: ${outsiderCount}\n\n📩 تم إرسال دوركم بالخاص، تأكدوا من فتح الخاص مع البوت.\n\nجاوبوا بـ "نعم" أو "لا" فقط عند دوركم، عندكم دقيقتين لكل دور ⏱️`
    })

    return announceNextAutoTurn(sock, groupId)
}

// ---------------------------------------------------------
// 5) الجولة التلقائية — يمر على كل اللاعبين زوج زوج
// ---------------------------------------------------------
async function announceNextAutoTurn(sock, groupId) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'auto_round') return

    if (state.turnIndex >= state.turnOrder.length) {
        state.phase = 'extra'
        clearTurnTimer(state)
        return sock.sendMessage(groupId, {
            text: `✅ انتهت الجولة التلقائية!\n\n💬 حد يبي يسأل شخص معين؟\nاكتب: .اريد_اسال @الشخص\n\nأو اكتب .تصويت إذا خلصتوا الأسئلة.`
        })
    }

    const asker = state.turnOrder[state.turnIndex]
    const answerer = state.turnOrder[(state.turnIndex + 1) % state.turnOrder.length]

    return setPendingTurn(sock, groupId, state, { asker, answerer, type: 'auto' })
}

// ---------------------------------------------------------
// 6) استقبال إجابة نعم/لا (تلقائي أو سؤال حر)
// ---------------------------------------------------------
async function handleAnswer(sock, groupId, senderId, text) {
    const state = games.get(groupId)
    if (!state || !state.pendingTurn) return false

    const { answerer, type } = state.pendingTurn
    if (senderId !== answerer) return false

    const clean = text.trim()
    if (clean !== 'نعم' && clean !== 'لا') return false

    clearTurnTimer(state)
    state.pendingTurn = null

    await sock.sendMessage(groupId, {
        text: `✅ ${mentionTag(answerer)} جاوب: "${clean}"`,
        mentions: [answerer]
    })

    if (type === 'auto') {
        state.turnIndex++
        await announceNextAutoTurn(sock, groupId)
        return true
    }

    // سؤال حر: خذ التالي من الطابور لو موجود
    if (state.extraQueue.length) {
        const next = state.extraQueue.shift()
        await setPendingTurn(sock, groupId, state, { asker: next.asker, answerer: next.answerer, type: 'extra' })
    }

    return true
}

// ---------------------------------------------------------
// 7) طلب سؤال شخص معين (فترة الأسئلة الحرة)
// ---------------------------------------------------------
async function requestQuestion(sock, groupId, senderId, targetId) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'extra') {
        return sock.sendMessage(groupId, { text: '❌ ماكو فترة أسئلة حرة شغالة حالياً.' })
    }

    if (!state.players.includes(senderId) || !state.players.includes(targetId)) {
        return sock.sendMessage(groupId, { text: '❌ لازم تكون أنت والشخص المطلوب من ضمن اللاعبين.' })
    }

    if (senderId === targetId) {
        return sock.sendMessage(groupId, { text: '❌ ما تقدر تسأل نفسك 😄' })
    }

    if (!state.pendingTurn) {
        return setPendingTurn(sock, groupId, state, { asker: senderId, answerer: targetId, type: 'extra' })
    }

    state.extraQueue.push({ asker: senderId, answerer: targetId })
    return sock.sendMessage(groupId, { text: `📥 تم إضافة سؤالك للطابور، دورك جاي.` })
}

// ---------------------------------------------------------
// 8) بدء التصويت
// ---------------------------------------------------------
async function startVoting(sock, groupId) {
    const state = games.get(groupId)
    if (!state || (state.phase !== 'extra' && state.phase !== 'auto_round')) {
        return sock.sendMessage(groupId, { text: '❌ ما تقدر تبدأ التصويت الآن.' })
    }

    clearTurnTimer(state)
    state.phase = 'voting'
    state.votes = new Map()
    state.pendingTurn = null

    let list = ''
    state.players.forEach((p, i) => { list += `${i + 1}- ${mentionTag(p)}\n` })

    return sock.sendMessage(groupId, {
        text: `🗳️ ═══〔 التصويت 〕═══ 🗳️\n\nمين برا السالفة برأيكم؟ صوّتوا بكتابة: .اصوت <الرقم>\n\n${list}`,
        mentions: state.players
    })
}

// ---------------------------------------------------------
// 9) تسجيل صوت
// ---------------------------------------------------------
async function castVote(sock, groupId, voterId, numberStr) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'voting') {
        return sock.sendMessage(groupId, { text: '❌ ماكو تصويت شغال حالياً.' })
    }

    if (!state.players.includes(voterId)) {
        return sock.sendMessage(groupId, { text: '❌ انت مو من ضمن اللاعبين.' })
    }

    const idx = parseInt(numberStr, 10) - 1
    if (isNaN(idx) || idx < 0 || idx >= state.players.length) {
        return sock.sendMessage(groupId, { text: '❌ رقم غير صحيح.' })
    }

    state.votes.set(voterId, state.players[idx])

    await sock.sendMessage(groupId, { text: `✅ تم تسجيل صوتك (${state.votes.size}/${state.players.length})` })

    if (state.votes.size >= state.players.length) {
        return revealResults(sock, groupId)
    }
}

// ---------------------------------------------------------
// 10) كشف النتيجة وتوزيع النقاط
// ---------------------------------------------------------
async function revealResults(sock, groupId) {
    const state = games.get(groupId)
    if (!state) return

    const tally = new Map()
    for (const target of state.votes.values()) {
        tally.set(target, (tally.get(target) || 0) + 1)
    }

    let resultText = `🎭 ═══〔 النتيجة 〕═══ 🎭\n\n🔑 الكلمة كانت: ${state.word}\n🚫 اللي كانوا برا السالفة:\n`
    state.outsiders.forEach(o => { resultText += `${mentionTag(o)}\n` })
    resultText += '\n📊 توزيع الأصوات:\n'

    for (const [target, count] of tally.entries()) {
        resultText += `${mentionTag(target)} → ${count} صوت\n`
    }

    resultText += '\n🏆 النقاط:\n'

    for (const [voter, target] of state.votes.entries()) {
        if (state.outsiders.includes(target)) {
            state.scores.set(voter, (state.scores.get(voter) || 0) + CORRECT_VOTE_POINTS)
            resultText += `${mentionTag(voter)} ✅ +${CORRECT_VOTE_POINTS}\n`
        }
    }

    state.outsiders.forEach(o => {
        const votesAgainst = tally.get(o) || 0
        const majority = votesAgainst > state.players.length / 2
        if (!majority) {
            state.scores.set(o, (state.scores.get(o) || 0) + OUTSIDE_SURVIVE_POINTS)
            resultText += `${mentionTag(o)} 🎭 نجا! +${OUTSIDE_SURVIVE_POINTS}\n`
        }
    })

    state.phase = 'round_over'

    await sock.sendMessage(groupId, {
        text: resultText,
        mentions: state.players
    })

    return sock.sendMessage(groupId, {
        text: `➡️ لبدء جولة جديدة اكتب: .جولة_برا_السالفه <الفئة>\nالفئات المتاحة: ${Object.keys(CATEGORY_WORDS).join(' / ')}\n\nأو لإنهاء اللعبة: .انهي_برا_السالفه`
    })
}

// ---------------------------------------------------------
// 11) جولة جديدة بنفس اللاعبين والنقاط
// ---------------------------------------------------------
async function nextRound(sock, groupId, category) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'round_over') {
        return sock.sendMessage(groupId, { text: '❌ ما تقدر تبدأ جولة جديدة الآن.' })
    }

    const cat = (category || '').trim()
    if (!CATEGORY_WORDS[cat]) {
        return sock.sendMessage(groupId, {
            text: `❌ الفئة غير موجودة. الفئات المتاحة:\n${Object.keys(CATEGORY_WORDS).join(' / ')}`
        })
    }

    clearTurnTimer(state)

    state.category = cat
    state.word = null
    state.turnOrder = []
    state.turnIndex = 0
    state.extraQueue = []
    state.pendingTurn = null
    state.votes = new Map()
    state.outsiders = []
    state.phase = 'lobby' // نبدأ الجولة مباشرة بنفس اللاعبين المسجلين

    return beginRound(sock, groupId)
}

// ---------------------------------------------------------
// 12) إنهاء اللعبة والترتيب النهائي
// ---------------------------------------------------------
async function endGame(sock, groupId) {
    const state = games.get(groupId)
    if (!state) {
        return sock.sendMessage(groupId, { text: '❌ ماكو لعبة شغالة حالياً.' })
    }

    clearTurnTimer(state)
    if (state.lobbyTimer) clearTimeout(state.lobbyTimer)

    const ranking = [...state.scores.entries()].sort((a, b) => b[1] - a[1])

    let text = `🏁 ═══〔 نهاية لعبة برا السالفة 〕═══ 🏁\n\n`

    ranking.forEach(([player, score], i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎖️'
        text += `${medal} ${mentionTag(player)} — ${score} نقطة\n`
    })

    if (ranking.length) {
        text += `\n👑 الفائز: ${mentionTag(ranking[0][0])}`
    }

    games.delete(groupId)

    return sock.sendMessage(groupId, {
        text,
        mentions: state.players
    })
}

// ---------------------------------------------------------
// 13) نقطة الدخول الموحدة — استدعيها من index.js لكل رسالة
// ترجع true إذا استهلكت الرسالة (توقف باقي الأوامر)
// ---------------------------------------------------------
async function handleMessage(sock, msg, groupId, senderId, text, mentionedJids = []) {
    if (text.startsWith('.لعبة_برا_السالفه ')) {
        const category = text.replace('.لعبة_برا_السالفه', '').trim()
        await startLobby(sock, groupId, category, senderId)
        return true
    }

    if (text === '.انضم_برا_السالفه') {
        await joinLobby(sock, groupId, senderId)
        return true
    }

    if (text === '.ابدأ_الجولة') {
        await beginRound(sock, groupId)
        return true
    }

    if (text.startsWith('.اريد_اسال')) {
        const target = mentionedJids[0]
        if (!target) {
            await sock.sendMessage(groupId, { text: '❌ لازم تمنشن الشخص اللي تبي تسأله.' })
            return true
        }
        await requestQuestion(sock, groupId, senderId, target)
        return true
    }

    if (text === '.تصويت') {
        await startVoting(sock, groupId)
        return true
    }

    if (text.startsWith('.اصوت ')) {
        const num = text.split(' ')[1]
        await castVote(sock, groupId, senderId, num)
        return true
    }

    if (text.startsWith('.جولة_برا_السالفه')) {
        const category = text.replace('.جولة_برا_السالفه', '').trim()
        await nextRound(sock, groupId, category)
        return true
    }

    if (text === '.انهي_برا_السالفه') {
        await endGame(sock, groupId)
        return true
    }

    // إجابات نعم/لا أثناء الأدوار (تلقائي أو حر)
    if (games.has(groupId)) {
        const consumed = await handleAnswer(sock, groupId, senderId, text)
        if (consumed) return true
    }

    return false
}

module.exports = {
    handleMessage
}
