// =====================================================
// 🌌 نظام البنر الجديد (مثل Genshin Impact)
// - يتجدد كل خميس 12:00 ص بتوقيت السعودية
// - السحب بالأورب: 160 / 1600
// - الضمان 50 (soft pity من 40) + 70% للبنر + ضمان 50/50 بعد الخسارة
// - البوت يرسل 3 مرشحين للقروبات والأعضاء يصوّتون على بنر الأسبوع القادم
// =====================================================

const fs = require('fs')
const path = require('path')

const characters = require('../characters.json')
const Player = require('../models/Player')
const BannerState = require('../models/BannerState')
const BannerVote = require('../models/BannerVote')
const PlayerOrbs = require('../models/PlayerOrbs')
const { bar, formatDuration } = require('./orbSystem')

const {
    PULL_COST, MULTI_COUNT, MULTI_COST,
    SSS_RATE, SOFT_PITY_START, SOFT_PITY_STEP, HARD_PITY, FEATURED_CHANCE,
    LEGENDARY_RATE, EXCELLENT_RATE,
    BANNER_RESET_WEEKDAY,
    VOTE_OPEN_WEEKDAY, VOTE_OPEN_HOUR, VOTE_DURATION_HOURS, VOTE_CANDIDATES, MIN_BANNER_POWER,
    RECENT_BANNERS_KEEP, RECENT_CANDIDATES_KEEP,
    BANNER_GROUPS
} = require('./orbConfig')

const NUM_EMOJI = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣']
const RARITY_EMOJI = { 'SSS': '🌟', 'اسطوري': '🔶', 'ممتاز': '🟣', 'عادي': '⚪' }
const sleep = ms => new Promise(r => setTimeout(r, ms))

// =========================
// التواريخ
// =========================

function getSaudiDate() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })
}

// مفتاح البنر = تاريخ آخر خميس (شامل اليوم لو خميس) بتوقيت الرياض
function getBannerWeekKey() {
    const d = new Date(getSaudiDate() + 'T00:00:00Z')
    const diff = (d.getUTCDay() - BANNER_RESET_WEEKDAY + 7) % 7
    d.setUTCDate(d.getUTCDate() - diff)
    return d.toISOString().slice(0, 10)
}

function getBannerEndsAtMs(weekKey) {
    return Date.parse(weekKey + 'T00:00:00+03:00') + 7 * 24 * 3600 * 1000
}

// =========================
// الحالة
// =========================

async function getState() {
    let state = await BannerState.findOne({ key: 'main' })
    if (!state) {
        try {
            state = await BannerState.create({ key: 'main' })
        } catch (e) {
            if (e && e.code === 11000) state = await BannerState.findOne({ key: 'main' })
            else throw e
        }
    }
    return state
}

// الاسم القديم (للتوافق)
const getBanner = getState

function getBannerCharacters() {
    return characters.filter(c => c.rarity === 'SSS' && c.power >= MIN_BANNER_POWER)
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle(arr) {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

// يختار شخصيات ما ظهرت مؤخراً. لو القائمة ما كفت، نخفف الاستبعاد من الأقدم للأحدث
function pickFresh(pool, recent, count, alsoExclude = []) {
    const base = new Set(alsoExclude)
    let available = []

    for (let relax = 0; relax <= recent.length; relax++) {
        const ex = new Set([...recent.slice(relax), ...base])
        available = pool.filter(c => !ex.has(c.name))
        if (available.length >= count) break
    }

    if (available.length < count) {
        available = pool.filter(c => !base.has(c.name))
    }

    return shuffle(available).slice(0, count)
}

// =========================
// توقيت التصويت (الأحد 5 م → الاثنين 5 م بتوقيت السعودية)
// =========================

const RIYADH_OFFSET_MS = 3 * 3600 * 1000   // السعودية UTC+3 ثابت بدون توقيت صيفي

// آخر مرة فُتح فيها التصويت (الأحد 5 م) قبل الآن — بالـ UTC ms
function latestVoteStartMs(nowMs = Date.now()) {
    const r = new Date(nowMs + RIYADH_OFFSET_MS)   // حقول UTC هنا = الوقت بالرياض

    const dayStart = Date.UTC(r.getUTCFullYear(), r.getUTCMonth(), r.getUTCDate())
    const daysSince = (r.getUTCDay() - VOTE_OPEN_WEEKDAY + 7) % 7

    let startFake = dayStart - daysSince * 86400000 + VOTE_OPEN_HOUR * 3600000
    if (startFake > r.getTime()) startFake -= 7 * 86400000   // اليوم الأحد لكن قبل 5 م

    return startFake - RIYADH_OFFSET_MS
}

function voteIdFromStart(startMs) {
    return new Date(startMs + RIYADH_OFFSET_MS).toISOString().slice(0, 10)
}

// =========================
// الأصوات
// =========================

async function getVoteCounts(voteId, n) {
    const rows = await BannerVote.aggregate([
        { $match: { voteId } },
        { $group: { _id: '$choice', count: { $sum: 1 } } }
    ])
    const counts = Array(n).fill(0)
    for (const r of rows) {
        if (r._id >= 1 && r._id <= n) counts[r._id - 1] = r.count
    }
    return counts
}

function isVoteOpen(state) {
    const v = state.vote
    return !!(v && v.voteId && !v.closed && v.closesAt && Date.now() < new Date(v.closesAt).getTime())
}

async function castVote(userId, choice) {
    const state = await getState()
    const cands = state.vote?.candidates || []

    if (!cands.length || !isVoteOpen(state)) return { ok: false, reason: 'closed' }
    if (!Number.isInteger(choice) || choice < 1 || choice > cands.length) {
        return { ok: false, reason: 'badChoice', n: cands.length }
    }

    const voteId = state.vote.voteId

    // الصوت نهائي: يُحفظ مرة واحدة فقط ولا يمكن تغييره
    const before = await BannerVote.findOne({ voteId, userId }).lean()
    if (before) {
        return {
            ok: false,
            reason: 'alreadyVoted',
            candidate: cands[before.choice - 1],
            choice: before.choice
        }
    }

    try {
        await BannerVote.create({ voteId, userId, choice })
    } catch (e) {
        // تصويتان متزامنان من نفس اللاعب: الفهرس الفريد يقبل واحداً فقط
        if (e && e.code === 11000) {
            const existing = await BannerVote.findOne({ voteId, userId }).lean()
            return {
                ok: false,
                reason: 'alreadyVoted',
                candidate: cands[(existing?.choice || choice) - 1],
                choice: existing?.choice || choice
            }
        }
        throw e
    }

    return { ok: true, candidate: cands[choice - 1] }
}

async function buildVoteText(userId) {
    const state = await getState()
    const v = state.vote || {}
    const cands = v.candidates || []

    if (!cands.length || !v.voteId) {
        return '❌ لا يوجد تصويت حالياً\n\n🗳️ يفتح كل أحد 5:00 م 🇸🇦'
    }

    const counts = await getVoteCounts(v.voteId, cands.length)
    const total = counts.reduce((a, b) => a + b, 0)
    const open = isVoteOpen(state)
    const mine = userId ? await BannerVote.findOne({ voteId: v.voteId, userId }).lean() : null

    let rows = ''
    cands.forEach((c, i) => {
        const pct = total ? Math.round((counts[i] / total) * 100) : 0
        rows += `${NUM_EMOJI[i + 1]} ${c.name}\n${bar(counts[i], Math.max(total, 1))} ${pct}% (${counts[i]})\n\n`
    })

    const status = open
        ? `⏳ يغلق بعد ➤ ${formatDuration(new Date(v.closesAt).getTime() - Date.now())}\n🕔 الاثنين 5:00 م 🇸🇦\n\n🎮 للتصويت:\n.تص 1  |  .تص 2  |  .تص 3`
        : `🔒 التصويت مغلق${v.result?.winner ? `\n🏆 البنر القادم ➤ ${v.result.winner}` : ''}`

    return (
`🗳️ ═══〔 التصويت على البنر القادم 〕═══ 🗳️

${rows}━━━━━━━━━━━━━━

👥 إجمالي الأصوات ➤ ${total}
${mine ? `✅ صوتك ➤ ${NUM_EMOJI[mine.choice]} ${cands[mine.choice - 1]?.name || ''} 🔒 (نهائي)` : (open ? '❌ لم تصوّت بعد' : '')}

${status}`
    ).replace(/\n{3,}/g, '\n\n')
}

// =========================
// دورة التصويت (فتح الأحد 5 م / قفل الاثنين 5 م)
// =========================

async function processVote(sock) {
    const now = Date.now()
    const startMs = latestVoteStartMs(now)
    const closesMs = startMs + VOTE_DURATION_HOURS * 3600 * 1000
    const voteId = voteIdFromStart(startMs)

    let state = await getState()

    // ===== 1) فتح تصويت جديد =====
    // لو البوت كان مطفي ورجع بعد انتهاء نافذة التصويت، ما نفتح تصويت متأخر
    // (تجديد الخميس يختار عشوائياً كبديل)
    if (state.vote?.voteId !== voteId && now < closesMs && state.character) {

        const pool = getBannerCharacters()

        const cands = pickFresh(
            pool,
            [...(state.recentCandidates || []), ...(state.recentBanners || [])],
            VOTE_CANDIDATES,
            [state.character.name, state.nextCharacter?.name].filter(Boolean)
        )

        if (cands.length === VOTE_CANDIDATES) {

            const claimed = await BannerState.findOneAndUpdate(
                { _id: state._id, 'vote.voteId': { $ne: voteId } },
                {
                    $set: {
                        vote: {
                            voteId,
                            candidates: cands,
                            openedAt: new Date(startMs),
                            closesAt: new Date(closesMs),
                            closed: false,
                            used: false,
                            announcedOpen: false,
                            announcedClose: false,
                            result: null
                        },
                        recentCandidates: [
                            ...(state.recentCandidates || []),
                            ...cands.map(c => c.name)
                        ].slice(-RECENT_CANDIDATES_KEEP)
                    }
                },
                { new: true }
            )

            if (claimed) state = claimed
            else state = await getState()
        } else {
            console.log('processVote: عدد الشخصيات المؤهلة لا يكفي للتصويت')
        }
    }

    // ===== 2) قفل التصويت وتحديد البنر القادم =====
    if (
        state.vote?.voteId &&
        !state.vote.closed &&
        state.vote.closesAt &&
        now >= new Date(state.vote.closesAt).getTime()
    ) {
        const cands = state.vote.candidates || []

        const counts = await getVoteCounts(state.vote.voteId, cands.length)
        const total = counts.reduce((a, b) => a + b, 0)

        let idx, method
        if (total > 0) {
            const max = Math.max(...counts)
            const tied = counts.map((c, i) => (c === max ? i : -1)).filter(i => i >= 0)
            idx = pickRandom(tied)
            method = 'vote'
        } else {
            idx = Math.floor(Math.random() * cands.length)
            method = 'noVotes'
        }

        const winner =
            getBannerCharacters().find(c => c.name === cands[idx].name) || cands[idx]

        const claimed = await BannerState.findOneAndUpdate(
            { _id: state._id, 'vote.voteId': state.vote.voteId, 'vote.closed': false },
            {
                $set: {
                    'vote.closed': true,
                    'vote.result': {
                        winner: winner.name,
                        counts,
                        total,
                        method,
                        winnerVotes: counts[idx]
                    },
                    nextCharacter: winner
                }
            },
            { new: true }
        )

        state = claimed || await getState()
    }

    // ===== 3) الإعلانات (مرة واحدة فقط لكل حدث) =====
    if (sock) {
        if (state.vote?.voteId && !state.vote.announcedOpen && !state.vote.closed) {
            const c = await BannerState.findOneAndUpdate(
                { _id: state._id, 'vote.voteId': state.vote.voteId, 'vote.announcedOpen': false },
                { $set: { 'vote.announcedOpen': true } },
                { new: true }
            )
            if (c) {
                sendToAllGroups(sock, g => announceVoteOpen(sock, g, c))
                    .catch(e => console.log('announceVoteOpen error:', e))
            }
        }

        if (state.vote?.closed && !state.vote.announcedClose && state.vote.result) {
            // فتح التصويت المتأخر ما يُعلن (أُغلق قبل ما يُعلن عنه)
            const c = await BannerState.findOneAndUpdate(
                { _id: state._id, 'vote.voteId': state.vote.voteId, 'vote.announcedClose': false },
                { $set: { 'vote.announcedClose': true, 'vote.announcedOpen': true } },
                { new: true }
            )
            if (c) {
                sendToAllGroups(sock, g => announceVoteResult(sock, g, c))
                    .catch(e => console.log('announceVoteResult error:', e))
            }
        }
    }

    return state
}

// =========================
// تجديد البنر (كل خميس)
// =========================

async function applyRotation(prev, weekKey) {
    const pool = getBannerCharacters()
    if (!pool.length) throw new Error('لا توجد شخصيات SSS مؤهلة للبنر')

    let chosen = null
    let info = { method: 'random', votes: 0, total: 0 }

    // 1) نتيجة التصويت المقفل
    if (prev.nextCharacter && prev.nextCharacter.name) {
        chosen = prev.nextCharacter
        const r = prev.vote?.result || {}
        info = { method: r.method || 'vote', votes: r.winnerVotes || 0, total: r.total || 0 }
    }

    // 2) تصويت ما انقفل (البوت كان مطفي) ولسا ما استُخدم
    if (!chosen && prev.vote?.voteId && !prev.vote.used && (prev.vote.candidates || []).length) {
        const cands = prev.vote.candidates
        const counts = await getVoteCounts(prev.vote.voteId, cands.length)
        const total = counts.reduce((a, b) => a + b, 0)

        if (total > 0) {
            const max = Math.max(...counts)
            const tied = counts.map((c, i) => (c === max ? i : -1)).filter(i => i >= 0)
            const i = pickRandom(tied)
            chosen = cands[i]
            info = { method: 'vote', votes: counts[i], total }
        } else {
            chosen = pickRandom(cands)
            info = { method: 'noVotes', votes: 0, total: 0 }
        }
    }

    // 3) ما فيه تصويت أصلاً → عشوائي
    if (!chosen) {
        chosen = pickFresh(pool, prev.recentBanners || [], 1)[0]
    }

    // أحدث بيانات الشخصية من characters.json
    const banner = pool.find(c => c.name === chosen.name) || chosen

    const recentBanners = [...(prev.recentBanners || []), banner.name]
        .slice(-RECENT_BANNERS_KEEP)

    return BannerState.findOneAndUpdate(
        { _id: prev._id },
        {
            $set: {
                character: banner,
                bannerName: banner.name,
                startedAt: new Date(),
                nextCharacter: null,
                'vote.used': true,
                recentBanners,
                lastRotation: { ...info, winner: banner.name }
            }
        },
        { new: true }
    )
}

let announcing = false

async function refreshBanner(sock) {
    let state = await getState()
    const weekKey = getBannerWeekKey()

    if (state.weekKey !== weekKey) {
        const prevWeek = state.weekKey

        // 🔒 قفل ذري: عملية واحدة فقط تجدد البنر حتى لو جاءت طلبات متزامنة
        const claimed = await BannerState.findOneAndUpdate(
            { _id: state._id, weekKey: prevWeek },
            { $set: { weekKey } },
            { new: false }
        )

        if (claimed) {
            try {
                state = await applyRotation(claimed, weekKey)
            } catch (e) {
                // فشل التجديد → نرجع القفل عشان يعاد المحاولة
                await BannerState.updateOne({ _id: state._id }, { $set: { weekKey: prevWeek } })
                throw e
            }
        } else {
            state = await getState()
        }
    }

    // إعلان بداية البنر (خميس) — مرة واحدة لكل تجديد
    if (sock && state.announcedWeek !== state.weekKey && !announcing) {
        announceBanner(sock).catch(e => console.log('announceBanner error:', e))
    }

    // دورة التصويت (فتح الأحد 5 م / قفل الاثنين 5 م)
    try {
        state = await processVote(sock)
    } catch (e) {
        console.log('processVote error:', e)
    }

    return state
}

// =========================
// إرسال الرسائل
// =========================

async function sendCharacterMessage(sock, jid, character, caption, mentions) {
    const extra = mentions && mentions.length ? { mentions } : {}

    try {
        const img = character && character.image

        if (img && String(img).startsWith('http')) {
            return await sock.sendMessage(jid, { image: { url: img }, caption, ...extra })
        }

        if (img) {
            const imagePath = path.join(__dirname, '..', img)
            if (fs.existsSync(imagePath)) {
                return await sock.sendMessage(jid, {
                    image: await fs.promises.readFile(imagePath),
                    caption,
                    ...extra
                })
            }
        }
    } catch (e) {
        console.log('sendCharacterMessage image error:', e?.message || e)
    }

    return sock.sendMessage(jid, { text: caption, ...extra })
}

async function sendToAllGroups(sock, fn) {
    for (const jid of BANNER_GROUPS) {
        try {
            await fn(jid)
        } catch (e) {
            console.log('banner group send error:', jid, e?.message || e)
        }
        await sleep(2000)
    }
}

// 🗳️ الأحد 5 م — أسماء وأرقام فقط (بدون صور) + منشن للمسجلين فقط
async function announceVoteOpen(sock, jid, state) {
    const cands = state.vote?.candidates || []
    if (!cands.length) return

    let tagIds = []
    try {
        const meta = await sock.groupMetadata(jid)
        const ids = meta.participants.map(p => p.id)
        const players = await Player.find({ userId: { $in: ids } }).select('userId').lean()
        tagIds = players.map(p => p.userId)
    } catch (e) {
        console.log('vote announce groupMetadata error:', jid, e?.message || e)
    }

    const list = cands.map((c, i) => `${NUM_EMOJI[i + 1]} ${c.name}`).join('\n')

    const body =
`🗳️ ═══〔 التصويت على البنر القادم 〕═══ 🗳️

${list}

━━━━━━━━━━━━━━

🎮 للتصويت اكتب:
.تص 1  |  .تص 2  |  .تص 3

⏳ يغلق الاثنين 5:00 م 🇸🇦 (24 ساعة)
🌌 الأكثر أصواتاً يصير بنر الخميس`

    const CHUNK = 50

    if (!tagIds.length) {
        await sock.sendMessage(jid, { text: body })
        return
    }

    for (let i = 0; i < tagIds.length; i += CHUNK) {
        const part = tagIds.slice(i, i + CHUNK)
        const tags = part.map(id => '@' + id.split('@')[0]).join(' ')

        if (i > 0) await sleep(1200)

        await sock.sendMessage(jid, {
            text: i === 0 ? `${body}\n\n👥 ${tags}` : tags,
            mentions: part
        })
    }
}

// 🏆 الاثنين 5 م — صورة الشخصية المختارة واسمها (بدون منشن)
async function announceVoteResult(sock, jid, state) {
    const r = state.vote?.result
    const c = state.nextCharacter
    if (!r || !c) return

    const how =
        r.method === 'vote'
            ? `🗳️ فازت بـ ${r.winnerVotes} صوت من ${r.total}`
            : '🎲 لم يصوّت أحد — اختيرت عشوائياً من المرشحين'

    const caption =
`🏆 ═══〔 نتيجة التصويت 〕═══ 🏆

👑 ${c.name}
${how}

🌌 بنر الأسبوع القادم
📅 يبدأ الخميس 12:00 ص 🇸🇦`

    await sendCharacterMessage(sock, jid, c, caption)
}

// 🌌 الخميس 12 ص — بداية البنر الجديد
async function announceBannerToGroup(sock, jid, state) {
    const b = state.character
    const rot = state.lastRotation || {}

    let source = ''
    if (rot.method === 'vote') {
        source = `\n🗳️ اختاره الأعضاء بـ ${rot.votes} صوت من ${rot.total}`
    } else if (rot.method === 'noVotes') {
        source = '\n🎲 اختير عشوائياً من المرشحين'
    }

    const caption =
`🌌 ═════〔 LIMITED BANNER 〕═════ 🌌

🎉 بنر جديد بدأ!

👑 ${b.name}
🌌 ${b.anime}
⚔ القوة ➤ ${b.power}${source}

━━━━━━━━━━━━━━

🔮 السحبة ➤ ${PULL_COST}  |  ×${MULTI_COUNT} ➤ ${MULTI_COST}
🎯 ضمان SSS ➤ ${HARD_PITY} سحبة
⭐ ${Math.round(FEATURED_CHANCE * 100)}% الـ SSS تكون شخصية البنر

⏳ حتى الخميس القادم 12:00 ص 🇸🇦

🎮 .بنر  •  .سحب_بنر  •  .اورب`

    await sendCharacterMessage(sock, jid, b, caption)
}

async function announceBanner(sock) {
    if (announcing) return
    announcing = true

    try {
        const state = await getState()

        // قفل ذري: الإعلان يخرج مرة واحدة فقط لكل تجديد
        const claimed = await BannerState.findOneAndUpdate(
            { _id: state._id, announcedWeek: { $ne: state.weekKey }, character: { $ne: null } },
            { $set: { announcedWeek: state.weekKey } },
            { new: true }
        )

        if (!claimed) return

        await sendToAllGroups(sock, jid => announceBannerToGroup(sock, jid, claimed))
    } finally {
        announcing = false
    }
}

// =========================
// محرك السحب
// =========================

function sssChance(pullNumber) {
    if (pullNumber >= HARD_PITY) return 100
    if (pullNumber >= SOFT_PITY_START) {
        return Math.min(100, SSS_RATE + (pullNumber - SOFT_PITY_START + 1) * SOFT_PITY_STEP)
    }
    return SSS_RATE
}

function rollOne(st, banner) {
    const n = st.pity + 1

    if (Math.random() * 100 < sssChance(n)) {
        const featured = st.guaranteed || Math.random() < FEATURED_CHANCE

        let character = banner
        if (!featured) {
            const others = characters.filter(c => c.rarity === 'SSS' && c.name !== banner.name)
            character = others.length ? pickRandom(others) : banner
        }

        const isFeatured = character.name === banner.name

        st.pity = 0
        st.guaranteed = !isFeatured   // خسرت 50/50 → الجاية مضمونة للبنر

        return { character, rarity: 'SSS', featured: isFeatured, pityAt: n }
    }

    st.pity = n

    const r = Math.random() * 100
    let rarity = 'عادي'
    if (r < LEGENDARY_RATE) rarity = 'اسطوري'
    else if (r < LEGENDARY_RATE + EXCELLENT_RATE) rarity = 'ممتاز'

    let pool = characters.filter(c => c.rarity === rarity)
    if (!pool.length) pool = characters.filter(c => c.rarity !== 'SSS')

    return { character: pickRandom(pool), rarity, featured: false, pityAt: n }
}

function rollPulls(count, orbDoc, banner) {
    const st = {
        pity: orbDoc?.pity || 0,
        guaranteed: !!orbDoc?.guaranteedFeatured
    }

    const results = []
    for (let i = 0; i < count; i++) results.push(rollOne(st, banner))

    return { results, pity: st.pity, guaranteedFeatured: st.guaranteed }
}

async function savePullState(userId, rolled, bannerName) {
    const entries = rolled.results.map(r => ({
        name: r.character.name,
        rarity: r.rarity,
        featured: r.featured,
        pityAt: r.pityAt,
        banner: bannerName,
        at: new Date()
    }))

    return PlayerOrbs.findOneAndUpdate(
        { userId },
        {
            $set: { pity: rolled.pity, guaranteedFeatured: rolled.guaranteedFeatured },
            $inc: { totalBannerPulls: rolled.results.length },
            $push: { history: { $each: entries, $slice: -100 } }
        },
        { new: true }
    )
}

// =========================
// نصوص العرض
// =========================

function nextPullHint(orbDoc) {
    if (orbDoc?.guaranteedFeatured) return '⭐ الـ SSS القادمة مضمونة من البنر'
    return `⭐ الـ SSS القادمة ${Math.round(FEATURED_CHANCE * 100)}% للبنر`
}

function buildBannerCaption(state, orbDoc, voteSummary) {
    const b = state.character
    const pity = orbDoc?.pity || 0
    const orbs = orbDoc?.orbs || 0
    const left = getBannerEndsAtMs(state.weekKey) - Date.now()

    if (!voteSummary) {
        if (state.nextCharacter && state.nextCharacter.name) {
            voteSummary = `📅 البنر القادم ➤ ${state.nextCharacter.name}`
        } else if (isVoteOpen(state)) {
            voteSummary = '🗳️ التصويت على البنر القادم مفتوح ➤ .تص'
        }
    }

    return (
`╔═══════════════════╗
  🌌 LIMITED BANNER 🌌
╚═══════════════════╝

👑 ${b.name}
🌌 ${b.anime}
⚔ القوة ➤ ${b.power}

━━━━━━━━━━━━━━

🔮 الأورب: ${orbs.toLocaleString()}  (${Math.floor(orbs / PULL_COST)} سحبة)
🎯 الضمان: ${bar(pity, HARD_PITY)} ${pity}/${HARD_PITY}
${nextPullHint(orbDoc)}

━━━━━━━━━━━━━━

📊 النسب
🌟 SSS ➤ ${SSS_RATE}% (ترتفع من السحبة ${SOFT_PITY_START})
🔶 اسطوري ➤ ${LEGENDARY_RATE}%
🟣 ممتاز ➤ ${EXCELLENT_RATE}%
⚪ عادي ➤ الباقي

━━━━━━━━━━━━━━

⏳ ينتهي بعد ➤ ${formatDuration(left)}
🕛 الخميس 12:00 ص 🇸🇦
${voteSummary ? `\n${voteSummary}\n` : ''}
🎮 .سحب_بنر  ➤  ${PULL_COST} 🔮
🎮 .سحب_بنر 10  ➤  ${MULTI_COST} 🔮
🗳️ .تص  •  🔮 .اورب`
    )
}

function buildSingleResult(r, orbDoc, state, cost, extra = '') {
    const c = r.character
    const pity = orbDoc.pity || 0

    let note = ''
    if (r.rarity === 'SSS') {
        note = r.featured
            ? '👑 شخصية البنر المميزة!\n\n'
            : '✨ SSS خارج البنر\n🎯 الجاية مضمونة من البنر!\n\n'
    }

    return (
`╭━━〔 🌌 LIMITED BANNER 🌌 〕━━╮

${RARITY_EMOJI[r.rarity] || '⚪'} ${r.rarity === 'SSS' ? '✨ SSS ✨' : r.rarity}

👑 ${c.name}
⚔ القوة ➤ ${c.power}
🌌 الأنمي ➤ ${c.anime}

${note}━━━━━━━━━━━━━━

🔮 الأورب ➤ ${(orbDoc.orbs || 0).toLocaleString()}  (‎-${cost})
🎯 الضمان ➤ ${bar(pity, HARD_PITY)} ${pity}/${HARD_PITY}
${r.pityAt >= HARD_PITY && r.rarity === 'SSS' ? '🎯 حصلت عليها من ضمان البنر!\n' : ''}${orbDoc.guaranteedFeatured ? '⭐ الـ SSS القادمة مضمونة من البنر\n' : ''}
╰━━━━━━━━━━━━━━━━━━━━━━╯${extra}`
    ).replace(/\n{3,}/g, '\n\n')
}

function buildMultiResult(results, orbDoc, cost, extra = '') {
    const pity = orbDoc.pity || 0
    const counts = { 'SSS': 0, 'اسطوري': 0, 'ممتاز': 0, 'عادي': 0 }

    let list = ''
    results.forEach((r, i) => {
        counts[r.rarity] = (counts[r.rarity] || 0) + 1
        const star = r.rarity === 'SSS' ? (r.featured ? ' 👑' : ' ✨') : ''
        list += `${String(i + 1).padStart(2, ' ')}. ${RARITY_EMOJI[r.rarity] || '⚪'} ${r.character.name}${star}\n`
    })

    return (
`╭━━〔 🌌 سحب ×${results.length} 🌌 〕━━╮

${list}
━━━━━━━━━━━━━━

🌟 ${counts['SSS']}  🔶 ${counts['اسطوري']}  🟣 ${counts['ممتاز']}  ⚪ ${counts['عادي']}

🔮 الأورب ➤ ${(orbDoc.orbs || 0).toLocaleString()}  (‎-${cost})
🎯 الضمان ➤ ${bar(pity, HARD_PITY)} ${pity}/${HARD_PITY}
${orbDoc.guaranteedFeatured ? '⭐ الـ SSS القادمة مضمونة من البنر\n' : ''}
╰━━━━━━━━━━━━━━━━━━━━━━╯${extra}`
    ).replace(/\n{3,}/g, '\n\n')
}

// أفضل نتيجة لعرض صورتها (SSS للبنر > SSS > أسطوري ...)
function bestResult(results) {
    const score = r => (r.rarity === 'SSS' ? (r.featured ? 5 : 4) : r.rarity === 'اسطوري' ? 3 : r.rarity === 'ممتاز' ? 2 : 1)
    return results.reduce((a, b) => (score(b) > score(a) ? b : a), results[0])
}

module.exports = {
    getSaudiDate,
    getBanner,
    getState,
    getBannerCharacters,
    getBannerWeekKey,
    getBannerEndsAtMs,
    refreshBanner,
    announceBanner,
    processVote,
    latestVoteStartMs,
    isVoteOpen,

    castVote,
    buildVoteText,
    getVoteCounts,

    sendCharacterMessage,
    rollPulls,
    savePullState,
    buildBannerCaption,
    buildSingleResult,
    buildMultiResult,
    bestResult
}
