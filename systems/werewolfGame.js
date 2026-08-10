// =========================================================
// 🐺 لعبة "المستذئبين" (Werewolf / Mafia Style)
// =========================================================
// الأدوار: مستذئب - مستذئب ألفا - قروي عادي - طبيب - عراف - صياد
//
// التسلسل:
// - .سجل_ذئاب          → فتح التسجيل (لوبي) بالقروب
// - .ذئاب               → الانضمام للعبة
// - .ابدأ_الذئاب        → بدء فوري (حتى لو لم يكتمل العدد، بشرط تحقق الحد الأدنى)
// - .انهاء_الذئاب       → إلغاء/إنهاء اللعبة (لصاحب الطلب فقط)
// - .اختيار <رقم>       → مزدوج الاستخدام:
//       * بالخاص: اختيار الذئب/الطبيب/العراف ليلاً، أو ثأر الصياد
//       * بالقروب: التصويت النهاري
// - .اوافق_ذئب / .ارفض_ذئب → رد الذئب الثاني على اقتراح الذئب الأول (بالخاص فقط)
//
// كل ليلة: 2 دقيقة لأصحاب القدرات → إعلان النتيجة → 5 دقائق نقاش
// → دقيقتين تصويت → إعدام/تعادل بدون إعدام → ليلة جديدة... حتى الحسم.
// =========================================================

const MIN_PLAYERS = 4
const MAX_PLAYERS = 15
const LOBBY_WAIT_MS = 5 * 60 * 1000
const NIGHT_TIMEOUT_MS = 2 * 60 * 1000
const DISCUSS_MS = 5 * 60 * 1000
const VOTE_MS = 2 * 60 * 1000
const HUNTER_REVENGE_MS = 2 * 60 * 1000

const ROLE_INFO = {
    wolf: { name: 'مستذئب 🐺', team: 'wolves' },
    alpha: { name: 'مستذئب ألفا 🐺👑', team: 'wolves' },
    doctor: { name: 'طبيب 💉', team: 'villagers' },
    seer: { name: 'عراف 🔮', team: 'villagers' },
    hunter: { name: 'صياد 🏹', team: 'villagers' },
    villager: { name: 'قروي عادي 👤', team: 'villagers' }
}

// groupId -> gameState
const games = new Map()
// userId -> groupId (لتوجيه الرسائل الخاصة لصاحب اللعبة الصحيحة)
const playerGameMap = new Map()

function mentionTag(userId) {
    return `@${userId.split('@')[0]}`
}

function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

function isWolfRole(role) {
    return role === 'wolf' || role === 'alpha'
}

function aliveList(state) {
    return state.players.filter(p => state.alive.has(p))
}

function aliveWolves(state) {
    return aliveList(state).filter(p => isWolfRole(state.roles.get(p)))
}

async function dm(sock, userId, text) {
    try {
        await sock.sendMessage(userId, { text })
    } catch (err) {
        console.log('فشل إرسال خاص للمستذئبين لـ', userId, err)
        return false
    }
    return true
}

function clearAllTimers(state) {
    if (state.lobbyTimer) clearTimeout(state.lobbyTimer)
    if (state.night && state.night.timer) clearTimeout(state.night.timer)
    if (state.discussTimer) clearTimeout(state.discussTimer)
    if (state.voteTimer) clearTimeout(state.voteTimer)
    if (state.hunterRevenge && state.hunterRevenge.timer) clearTimeout(state.hunterRevenge.timer)
}

function cleanupGame(groupId, state) {
    clearAllTimers(state)
    if (state.players) {
        state.players.forEach(p => {
            if (playerGameMap.get(p) === groupId) playerGameMap.delete(p)
        })
    }
    games.delete(groupId)
}

// ---------------------------------------------------------
// 1) فتح التسجيل
// ---------------------------------------------------------
async function startLobby(sock, groupId, starterId) {
    if (games.has(groupId)) {
        return sock.sendMessage(groupId, { text: '⚠️ فيه لعبة مستذئبين شغالة حالياً بهذا الجروب.' })
    }

    const state = {
        phase: 'lobby',
        starterId,
        players: [starterId],
        roles: new Map(),
        alive: new Set(),
        round: 0,
        night: null,
        votes: new Map(),
        voteTimer: null,
        discussTimer: null,
        hunterRevenge: null,
        lobbyTimer: null
    }

    games.set(groupId, state)
    playerGameMap.set(starterId, groupId)

    state.lobbyTimer = setTimeout(() => {
        beginGame(sock, groupId, { forced: false }).catch(console.log)
    }, LOBBY_WAIT_MS)

    return sock.sendMessage(groupId, {
        text: `🐺 ═══〔 لعبة المستذئبين 〕═══ 🐺

👥 من ${MIN_PLAYERS} إلى ${MAX_PLAYERS} لاعب

✅ انضم بكتابة: .ذئاب
⏱️ تبدأ تلقائياً بعد 5 دقايق، أو اكتب .ابدأ_الذئاب للبدء فوراً (بشرط اكتمال الحد الأدنى)

📩 مهم: لازم تكون فاتح الخاص مع البوت عشان توصلك أدوارك واختياراتك.

المشاركين حالياً (1):
${mentionTag(starterId)}`,
        mentions: [starterId]
    })
}

// ---------------------------------------------------------
// 2) الانضمام
// ---------------------------------------------------------
async function joinLobby(sock, groupId, userId) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'lobby') {
        return sock.sendMessage(groupId, { text: '❌ ماكو تسجيل مفتوح للمستذئبين حالياً.' })
    }

    if (state.players.includes(userId)) {
        return sock.sendMessage(groupId, { text: '✅ انت مسجل بالفعل.' })
    }

    if (state.players.length >= MAX_PLAYERS) {
        return sock.sendMessage(groupId, { text: `❌ اكتمل العدد الأقصى (${MAX_PLAYERS} لاعب).` })
    }

    state.players.push(userId)
    playerGameMap.set(userId, groupId)

    return sock.sendMessage(groupId, {
        text: `✅ ${mentionTag(userId)} انضم للعبة! (${state.players.length}/${MAX_PLAYERS})`,
        mentions: [userId]
    })
}

// ---------------------------------------------------------
// 3) إلغاء/إنهاء اللعبة يدوياً
// ---------------------------------------------------------
async function forceEndGame(sock, groupId, senderId) {
    const state = games.get(groupId)
    if (!state) {
        return sock.sendMessage(groupId, { text: '❌ ماكو لعبة مستذئبين شغالة حالياً.' })
    }

    if (senderId !== state.starterId) {
        return sock.sendMessage(groupId, { text: '❌ بس الشخص اللي فتح اللعبة يقدر يلغيها.' })
    }

    cleanupGame(groupId, state)
    return sock.sendMessage(groupId, { text: '🛑 تم إنهاء لعبة المستذئبين.' })
}

// ---------------------------------------------------------
// 4) توزيع الأدوار حسب عدد اللاعبين
// ---------------------------------------------------------
function assignRoles(players) {
    const n = players.length
    const shuffled = shuffle(players)
    const roles = new Map()
    let idx = 0

    const wolvesCount = n > 7 ? 2 : 1
    const wolfRoles = wolvesCount === 2 ? ['alpha', 'wolf'] : ['wolf']
    wolfRoles.forEach(r => roles.set(shuffled[idx++], r))

    const specialPool = []
    if (n >= 5) specialPool.push('doctor')
    if (n >= 6) specialPool.push('seer')
    if (n >= 7) specialPool.push('hunter')
    specialPool.forEach(r => roles.set(shuffled[idx++], r))

    while (idx < shuffled.length) {
        roles.set(shuffled[idx++], 'villager')
    }

    return roles
}

// ---------------------------------------------------------
// 5) بدء اللعبة الفعلي
// ---------------------------------------------------------
async function beginGame(sock, groupId, { forced }) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'lobby') {
        if (forced) {
            return sock.sendMessage(groupId, { text: '❌ ما تقدر تبدأ الآن.' })
        }
        return
    }

    if (state.lobbyTimer) clearTimeout(state.lobbyTimer)
    state.lobbyTimer = null

    if (state.players.length < MIN_PLAYERS) {
        cleanupGame(groupId, state)
        return sock.sendMessage(groupId, {
            text: `❌ العدد ما وصل الحد الأدنى (${MIN_PLAYERS} لاعبين)، تم إلغاء اللعبة.`
        })
    }

    state.roles = assignRoles(state.players)
    state.alive = new Set(state.players)
    state.round = 1

    // إرسال الأدوار بالخاص
    const failed = []
    for (const player of state.players) {
        const role = state.roles.get(player)
        const info = ROLE_INFO[role]
        let extra = ''

        if (role === 'wolf' || role === 'alpha') {
            const packMates = state.players.filter(p => p !== player && isWolfRole(state.roles.get(p)))
            extra = packMates.length
                ? `\n🐾 رفيقك بالذئاب: ${packMates.map(p => `@${p.split('@')[0]}`).join('، ')}`
                : '\n🐾 انت الذئب الوحيد هذي الجولة.'
            if (role === 'alpha') extra += '\n👑 أنت الألفا: العراف لو حقق عنك بيشوفك "قروي" مو ذئب.'
        }

        const ok = await dm(sock, player,
            `🐺 ═══〔 لعبة المستذئبين 〕═══ 🐺\n\nدورك: ${info.name}${extra}\n\nستوصلك التعليمات بالخاص كل ليلة إذا كان عندك قدرة.\nحظ موفق! 🎭`)

        if (!ok) failed.push(player)
    }

    state.phase = 'night'

    let startText = `🎬 بدأت اللعبة!\n\n👥 اللاعبين: ${state.players.length}\n📩 تم إرسال الأدوار بالخاص لكل واحد.`
    if (failed.length) {
        startText += `\n\n⚠️ ما وصلت الرسالة الخاصة لـ: ${failed.map(mentionTag).join('، ')}\nلازم تفتحون الخاص مع البوت عشان تلعبون بشكل صحيح!`
    }

    await sock.sendMessage(groupId, { text: startText, mentions: state.players })

    return startNight(sock, groupId, state)
}

// ---------------------------------------------------------
// 6) بداية الليل — إرسال قوائم الاختيار بالخاص
// ---------------------------------------------------------
async function startNight(sock, groupId, state) {
    state.phase = 'night'

    const wolves = aliveWolves(state)
    const alivePlayers = aliveList(state)
    const doctor = alivePlayers.find(p => state.roles.get(p) === 'doctor')
    const seer = alivePlayers.find(p => state.roles.get(p) === 'seer')

    state.night = {
        wolves,
        wolfProposal: null,     // { proposerId, target }
        wolfConfirmed: false,
        wolfDone: wolves.length === 0,
        doctor,
        doctorProtect: null,
        doctorDone: !doctor,
        seer,
        seerDone: !seer,
        timer: null
    }

    await sock.sendMessage(groupId, {
        text: `🌙 ═══〔 الليلة ${state.round} 〕═══ 🌙\n\nنام القرويون... 😴\nمن عنده قدرة يتحقق من رسائله الخاصة.\n⏱️ عندكم دقيقتين.`
    })

    // قائمة أهداف الذئاب: كل الأحياء غير الذئاب
    if (wolves.length) {
        const targets = alivePlayers.filter(p => !isWolfRole(state.roles.get(p)))
        let list = ''
        targets.forEach((p, i) => { list += `${i + 1}- ${mentionTag(p)}\n` })

        const introExtra = wolves.length === 2
            ? '\n\n⚠️ لازم تتفقوا على نفس الضحية. أول واحد يختار، والثاني يرد بـ .اوافق_ذئب أو .ارفض_ذئب.'
            : ''

        for (const w of wolves) {
            await dm(sock, w, `🐺 اختر ضحية الليلة:\n\n${list}\nاكتب: .اختيار <الرقم>${introExtra}`)
        }
    }

    if (doctor) {
        let list = ''
        alivePlayers.forEach((p, i) => { list += `${i + 1}- ${mentionTag(p)}\n` })
        await dm(sock, doctor, `💉 اختر شخص تحميه الليلة (تقدر تحمي نفسك):\n\n${list}\nاكتب: .اختيار <الرقم>`)
    }

    if (seer) {
        const targets = alivePlayers.filter(p => p !== seer)
        let list = ''
        targets.forEach((p, i) => { list += `${i + 1}- ${mentionTag(p)}\n` })
        await dm(sock, seer, `🔮 اختر شخص تكشف حقيقته:\n\n${list}\nاكتب: .اختيار <الرقم>`)
    }

    state.night.timer = setTimeout(() => {
        resolveNight(sock, groupId, state).catch(console.log)
    }, NIGHT_TIMEOUT_MS)
}

function maybeResolveNight(sock, groupId, state) {
    const n = state.night
    if (!n) return
    if (n.wolfDone && n.doctorDone && n.seerDone) {
        if (n.timer) clearTimeout(n.timer)
        n.timer = null
        resolveNight(sock, groupId, state).catch(console.log)
    }
}

// ---------------------------------------------------------
// 7) استقبال أفعال الليل (تصل بالخاص)
// ---------------------------------------------------------
async function handleNightAction(sock, senderId, text, groupId, state) {
    const n = state.night
    if (!n || state.phase !== 'night') return false
    if (!state.alive.has(senderId)) return false

    const role = state.roles.get(senderId)

    // ===== الذئب / الألفا =====
    if (isWolfRole(role)) {
        if (text.startsWith('.اختيار ')) {
            const alivePlayers = aliveList(state)
            const targets = alivePlayers.filter(p => !isWolfRole(state.roles.get(p)))
            const idx = parseInt(text.split(' ')[1], 10) - 1

            if (isNaN(idx) || idx < 0 || idx >= targets.length) {
                await dm(sock, senderId, '❌ رقم غير صحيح.')
                return true
            }

            const target = targets[idx]

            if (n.wolves.length === 1) {
                n.wolfProposal = { proposerId: senderId, target }
                n.wolfConfirmed = true
                n.wolfDone = true
                await dm(sock, senderId, `✅ تم اختيار ${mentionTag(target)} كضحية الليلة.`)
                maybeResolveNight(sock, groupId, state)
                return true
            }

            // فيه ذئبين — لازم اتفاق
            n.wolfProposal = { proposerId: senderId, target }
            n.wolfConfirmed = false
            n.wolfDone = false

            const other = n.wolves.find(w => w !== senderId)
            await dm(sock, senderId, `📨 تم إرسال اقتراحك (${mentionTag(target)}) لرفيقك بانتظار موافقته.`)
            if (other) {
                await dm(sock, other, `🐺 رفيقك يقترح طرد ${mentionTag(target)}.\nهل توافق؟ اكتب .اوافق_ذئب أو .ارفض_ذئب`)
            }
            return true
        }

        if (text === '.اوافق_ذئب' || text === '.ارفض_ذئب') {
            if (!n.wolfProposal || n.wolfProposal.proposerId === senderId) {
                await dm(sock, senderId, '❌ ماكو اقتراح بانتظار ردك حالياً.')
                return true
            }

            if (text === '.ارفض_ذئب') {
                n.wolfProposal = null
                n.wolfConfirmed = false
                await dm(sock, senderId, '❌ تم الرفض. خبّر رفيقك يختار ضحية ثانية.')
                const proposer = n.wolves.find(w => w !== senderId)
                if (proposer) await dm(sock, proposer, '❌ رفيقك رفض اقتراحك، اختر ضحية ثانية بـ .اختيار <الرقم>')
                return true
            }

            // موافقة
            n.wolfConfirmed = true
            n.wolfDone = true
            await dm(sock, senderId, `✅ تم الاتفاق على ${mentionTag(n.wolfProposal.target)}.`)
            const proposer = n.wolves.find(w => w !== senderId)
            if (proposer) await dm(sock, proposer, `✅ رفيقك وافق، تم الاتفاق على ${mentionTag(n.wolfProposal.target)}.`)
            maybeResolveNight(sock, groupId, state)
            return true
        }

        return false
    }

    // ===== الطبيب =====
    if (role === 'doctor' && senderId === n.doctor) {
        if (!text.startsWith('.اختيار ')) return false
        const alivePlayers = aliveList(state)
        const idx = parseInt(text.split(' ')[1], 10) - 1

        if (isNaN(idx) || idx < 0 || idx >= alivePlayers.length) {
            await dm(sock, senderId, '❌ رقم غير صحيح.')
            return true
        }

        n.doctorProtect = alivePlayers[idx]
        n.doctorDone = true
        await dm(sock, senderId, `✅ تم اختيار حماية ${mentionTag(n.doctorProtect)} الليلة.`)
        maybeResolveNight(sock, groupId, state)
        return true
    }

    // ===== العراف =====
    if (role === 'seer' && senderId === n.seer) {
        if (!text.startsWith('.اختيار ')) return false
        const targets = aliveList(state).filter(p => p !== senderId)
        const idx = parseInt(text.split(' ')[1], 10) - 1

        if (isNaN(idx) || idx < 0 || idx >= targets.length) {
            await dm(sock, senderId, '❌ رقم غير صحيح.')
            return true
        }

        const target = targets[idx]
        const targetRole = state.roles.get(target)
        const result = isWolfRole(targetRole) && targetRole !== 'alpha' ? 'ذئب 🐺' : 'قروي 👤'

        n.seerDone = true
        await dm(sock, senderId, `🔮 نتيجة التحقيق عن ${mentionTag(target)}: ${result}`)
        maybeResolveNight(sock, groupId, state)
        return true
    }

    return false
}

// ---------------------------------------------------------
// 8) حسم الليل
// ---------------------------------------------------------
async function resolveNight(sock, groupId, state) {
    if (!games.has(groupId)) return
    const n = state.night
    if (n && n.timer) clearTimeout(n.timer)

    let victim = null
    if (n && n.wolfConfirmed && n.wolfProposal) {
        victim = n.wolfProposal.target
    }

    const protectedId = n ? n.doctorProtect : null
    state.night = null

    let deathText
    let killedRole = null

    if (victim && victim === protectedId) {
        deathText = `🛡️ ═══〔 نهاية الليل 〕═══ 🛡️\n\nحاول الذئاب افتراس ${mentionTag(victim)} لكن الطبيب أنقذه! نجا الجميع الليلة.`
    } else if (victim) {
        state.alive.delete(victim)
        killedRole = state.roles.get(victim)
        deathText = `☠️ ═══〔 نهاية الليل 〕═══ ☠️\n\nالذئاب افترست: ${mentionTag(victim)}\n(كان دوره: ${ROLE_INFO[killedRole].name})`
    } else {
        deathText = `🌅 ═══〔 نهاية الليل 〕═══ 🌅\n\nلم يتفق الذئاب على ضحية، نجا الجميع الليلة.`
    }

    await sock.sendMessage(groupId, { text: deathText, mentions: victim ? [victim] : [] })

    if (victim && killedRole === 'hunter') {
        return triggerHunterRevenge(sock, groupId, state, victim, () => afterNightResolved(sock, groupId, state))
    }

    return afterNightResolved(sock, groupId, state)
}

async function afterNightResolved(sock, groupId, state) {
    if (!games.has(groupId)) return
    if (await handleWinIfAny(sock, groupId, state)) return
    return startDiscussion(sock, groupId, state)
}

// ---------------------------------------------------------
// 9) ثأر الصياد
// ---------------------------------------------------------
async function triggerHunterRevenge(sock, groupId, state, hunterId, onDone) {
    const candidates = aliveList(state)

    if (!candidates.length) {
        state.hunterRevenge = null
        return onDone()
    }

    let list = ''
    candidates.forEach((p, i) => { list += `${i + 1}- ${mentionTag(p)}\n` })

    await sock.sendMessage(groupId, {
        text: `🏹 ${mentionTag(hunterId)} كان الصياد! عنده فرصة أخيرة يأخذ ثأره...`,
        mentions: [hunterId]
    })

    await dm(sock, hunterId, `🏹 قبل ما تموت، اختر شخص تاخذه معك:\n\n${list}\nاكتب: .اختيار <الرقم>\n⏱️ عندك دقيقتين.`)

    state.hunterRevenge = {
        hunterId,
        candidates,
        timer: setTimeout(() => {
            finishHunterRevenge(sock, groupId, state, null, onDone).catch(console.log)
        }, HUNTER_REVENGE_MS),
        onDone
    }
}

async function finishHunterRevenge(sock, groupId, state, target, onDone) {
    if (!games.has(groupId)) return
    if (state.hunterRevenge && state.hunterRevenge.timer) clearTimeout(state.hunterRevenge.timer)
    state.hunterRevenge = null

    if (target) {
        state.alive.delete(target)
        const role = state.roles.get(target)
        await sock.sendMessage(groupId, {
            text: `🏹 أخذ الصياد ثأره من ${mentionTag(target)}! (كان دوره: ${ROLE_INFO[role].name})`,
            mentions: [target]
        })
    } else {
        await sock.sendMessage(groupId, { text: '⌛ لم يستخدم الصياد قدرته بالوقت المحدد.' })
    }

    return onDone()
}

async function handleHunterRevengeAction(sock, senderId, text, groupId, state) {
    const hr = state.hunterRevenge
    if (!hr || hr.hunterId !== senderId) return false
    if (!text.startsWith('.اختيار ')) return false

    const idx = parseInt(text.split(' ')[1], 10) - 1
    if (isNaN(idx) || idx < 0 || idx >= hr.candidates.length) {
        await dm(sock, senderId, '❌ رقم غير صحيح.')
        return true
    }

    const target = hr.candidates[idx]
    const onDone = hr.onDone
    await finishHunterRevenge(sock, groupId, state, target, onDone)
    return true
}

// ---------------------------------------------------------
// 10) فترة النقاش
// ---------------------------------------------------------
async function startDiscussion(sock, groupId, state) {
    state.phase = 'discuss'

    await sock.sendMessage(groupId, {
        text: `🗣️ ═══〔 وقت النقاش 〕═══ 🗣️\n\nعندكم 5 دقائق للنقاش قبل التصويت.`
    })

    state.discussTimer = setTimeout(() => {
        startVoting(sock, groupId, state).catch(console.log)
    }, DISCUSS_MS)
}

// ---------------------------------------------------------
// 11) التصويت النهاري
// ---------------------------------------------------------
async function startVoting(sock, groupId, state) {
    if (state.discussTimer) clearTimeout(state.discussTimer)
    state.discussTimer = null

    state.phase = 'voting'
    state.votes = new Map()

    const alivePlayers = aliveList(state)
    let list = ''
    alivePlayers.forEach((p, i) => { list += `${i + 1}- ${mentionTag(p)}\n` })
    const skipNumber = alivePlayers.length + 1

    state.voteSkipNumber = skipNumber
    state.voteCandidates = alivePlayers

    await sock.sendMessage(groupId, {
        text: `🗳️ ═══〔 وقت التصويت 〕═══ 🗳️\n\nمين المستذئب برأيكم؟ صوّتوا بكتابة: .اختيار <الرقم>\n\n${list}${skipNumber}- 🚫 امتناع (سكب)\n\n⏱️ عندكم دقيقتين، أو حتى يصوّت الجميع.`,
        mentions: alivePlayers
    })

    state.voteTimer = setTimeout(() => {
        resolveVoting(sock, groupId, state).catch(console.log)
    }, VOTE_MS)
}

async function handleVoteAction(sock, senderId, text, groupId, state) {
    if (state.phase !== 'voting') return false
    if (!text.startsWith('.اختيار ')) return false
    if (!state.alive.has(senderId)) return false

    const idx = parseInt(text.split(' ')[1], 10) - 1
    const total = state.voteCandidates.length

    if (isNaN(idx) || idx < 0 || idx > total) {
        await sock.sendMessage(groupId, { text: '❌ رقم غير صحيح.' })
        return true
    }

    const target = idx === total ? 'skip' : state.voteCandidates[idx]
    state.votes.set(senderId, target)

    await sock.sendMessage(groupId, {
        text: `✅ تم تسجيل صوت ${mentionTag(senderId)} (${state.votes.size}/${state.alive.size})`,
        mentions: [senderId]
    })

    if (state.votes.size >= state.alive.size) {
        return resolveVoting(sock, groupId, state)
    }
    return true
}

async function resolveVoting(sock, groupId, state) {
    if (!games.has(groupId)) return
    if (state.voteTimer) clearTimeout(state.voteTimer)
    state.voteTimer = null
    state.phase = 'vote_resolving'

    const tally = new Map()
    for (const target of state.votes.values()) {
        if (target === 'skip') continue
        tally.set(target, (tally.get(target) || 0) + 1)
    }

    let resultText = '📊 ═══〔 نتيجة التصويت 〕═══ 📊\n\n'
    for (const [target, count] of tally.entries()) {
        resultText += `${mentionTag(target)} → ${count} صوت\n`
    }
    if (!tally.size) resultText += 'ما فيه أصوات ضد أحد.\n'

    let maxCount = 0
    let topCandidates = []
    for (const [target, count] of tally.entries()) {
        if (count > maxCount) {
            maxCount = count
            topCandidates = [target]
        } else if (count === maxCount) {
            topCandidates.push(target)
        }
    }

    let eliminated = null
    if (maxCount > 0 && topCandidates.length === 1) {
        eliminated = topCandidates[0]
    }

    if (!eliminated) {
        resultText += '\n🤝 تعادل أو ما حد حسم الأغلبية، ما حد يُعدم اليوم.'
        await sock.sendMessage(groupId, { text: resultText, mentions: state.alive.size ? [...state.alive] : [] })
        return afterVoteResolved(sock, groupId, state)
    }

    state.alive.delete(eliminated)
    const role = state.roles.get(eliminated)
    resultText += `\n⚖️ تم إعدام: ${mentionTag(eliminated)}\n(كان دوره: ${ROLE_INFO[role].name})`

    await sock.sendMessage(groupId, { text: resultText, mentions: [eliminated] })

    if (role === 'hunter') {
        return triggerHunterRevenge(sock, groupId, state, eliminated, () => afterVoteResolved(sock, groupId, state))
    }

    return afterVoteResolved(sock, groupId, state)
}

async function afterVoteResolved(sock, groupId, state) {
    if (!games.has(groupId)) return
    if (await handleWinIfAny(sock, groupId, state)) return
    state.round++
    return startNight(sock, groupId, state)
}

// ---------------------------------------------------------
// 12) التحقق من شرط الفوز
// ---------------------------------------------------------
async function handleWinIfAny(sock, groupId, state) {
    const wolves = aliveWolves(state).length
    const villagers = state.alive.size - wolves

    let winner = null
    if (wolves === 0) winner = 'villagers'
    else if (wolves >= villagers) winner = 'wolves'

    if (!winner) return false

    let reveal = ''
    state.players.forEach(p => {
        const role = state.roles.get(p)
        reveal += `${mentionTag(p)} — ${ROLE_INFO[role].name}\n`
    })

    const winText = winner === 'wolves'
        ? '🐺 فاز المستذئبون! 🐺'
        : '🛡️ فاز القرويون! 🛡️'

    await sock.sendMessage(groupId, {
        text: `🏁 ═══〔 انتهت اللعبة 〕═══ 🏁\n\n${winText}\n\n📋 الأدوار الحقيقية:\n${reveal}`,
        mentions: state.players
    })

    cleanupGame(groupId, state)
    return true
}

// ---------------------------------------------------------
// 13) نقطة الدخول — رسائل القروب
// ---------------------------------------------------------
async function handleMessage(sock, groupId, senderId, text) {
    if (text === '.سجل_ذئاب') {
        await startLobby(sock, groupId, senderId)
        return true
    }

    if (text === '.ذئاب') {
        await joinLobby(sock, groupId, senderId)
        return true
    }

    if (text === '.ابدأ_الذئاب') {
        await beginGame(sock, groupId, { forced: true })
        return true
    }

    if (text === '.انهاء_الذئاب') {
        await forceEndGame(sock, groupId, senderId)
        return true
    }

    const state = games.get(groupId)
    if (state && state.phase === 'voting') {
        const consumed = await handleVoteAction(sock, senderId, text, groupId, state)
        if (consumed) return true
    }

    return false
}

// ---------------------------------------------------------
// 14) نقطة الدخول — الرسائل الخاصة (أدوار الليل + ثأر الصياد + رد الذئب الثاني)
// ترجع true إذا استهلكت الرسالة
// ---------------------------------------------------------
async function handlePrivateMessage(sock, senderId, text) {
    const groupId = playerGameMap.get(senderId)
    if (!groupId) return false

    const state = games.get(groupId)
    if (!state) {
        playerGameMap.delete(senderId)
        return false
    }

    if (state.hunterRevenge && state.hunterRevenge.hunterId === senderId) {
        return handleHunterRevengeAction(sock, senderId, text, groupId, state)
    }

    if (state.phase === 'night') {
        return handleNightAction(sock, senderId, text, groupId, state)
    }

    return false
}

module.exports = {
    handleMessage,
    handlePrivateMessage
}
