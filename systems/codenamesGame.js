// =========================================================
// 🎯 لعبة "كود نيمز" (Codenames) — نسخة عربية لواتساب
// =========================================================
// التسلسل:
// - .كود_نيمز              → فتح التسجيل (لوبي) بالقروب
// - .ازرق                   → الانضمام كمشارك بالفريق الأزرق
// - .برتقالي  / .احمر       → الانضمام كمشارك بالفريق البرتقالي
// - .مشارك ازرق/برتقالي     → نفس فكرة الانضمام كمشارك (صيغة صريحة)
// - .سباي_ازرق              → الانضمام كجاسوس الفريق الأزرق (واحد فقط)
// - .سباي_برتقالي / .سباي_احمر → الانضمام كجاسوس الفريق البرتقالي
// - .سباي ازرق / .سباي برتقالي → نفس فكرة أوامر الجاسوس أعلاه
// - .ابدأ_كود_نيمز          → بدء اللعبة (يحتاج جاسوس + مشارك واحد بالأقل بكل فريق)
// - .انهاء_كود_نيمز         → إلغاء/إنهاء اللعبة
// - .فريق                   → عرض قائمة المشاركين بكل فريق مع منشنهم
//
// بالخاص (الجاسوس فقط):
// - .تلميح <كلمة> <رقم> [(1)]  → إرسال التلميح (كلمة واحدة فقط + عدد الكلمات المقصودة)
//       الحد الأقصى للتخمين = الرقم + 1 (زائد 1 إضافية لو أُرسل "(1)" كمكافأة من دور سابق)
//
// بالقروب (أثناء دور فريقك فقط، للمشاركين لا الجاسوس):
// - .كلمة <رقم>              → اختيار كلمة من اللوحة (يحتاج تأكيد)
// - .متاكد                   → تأكيد آخر اختيار مُرسَل
// - .انهاء_دور               → إنهاء دور فريقكم مبكراً والانتقال للفريق الآخر
//
// كل جولة: 25 كلمة (9 لفريق البداية + 8 للفريق الآخر + 7 محايدة + 1 قاتل).
// الفريق الذي يملك 9 كلمات يبدأ أول دائماً، ويتحدد عشوائياً كل لعبة.
// دور الجاسوس: 3 دقائق لإرسال التلميح وإلا ينتقل الدور تلقائياً.
// دور التخمين: 3 دقائق نقاش/تخمين وإلا ينتقل الدور تلقائياً.
// =========================================================

const MIN_PLAYERS = 4
const MAX_PLAYERS = 12
const HINT_TIMEOUT_MS = 3 * 60 * 1000
const GUESS_TIMEOUT_MS = 3 * 60 * 1000
const CONFIRM_TIMEOUT_MS = 45 * 1000
const LOBBY_TIMEOUT_MS = 10 * 60 * 1000

const BOARD_WORDS = 25
const START_TEAM_COUNT = 9
const OTHER_TEAM_COUNT = 8
const NEUTRAL_COUNT = 7
const ASSASSIN_COUNT = 1

// =========================================================
// 📚 بنك الكلمات (+400 كلمة عربية) — تُختار 25 عشوائية كل جولة
// =========================================================
const RAW_WORDS_POOL = [
    // حيوانات
    'أسد', 'نمر', 'فيل', 'زرافة', 'قرد', 'دب', 'ذئب', 'ثعلب', 'أرنب', 'غزال',
    'جمل', 'حصان', 'حمار', 'بقرة', 'خروف', 'ماعز', 'كلب', 'قطة', 'فأر', 'سنجاب',
    'قنفذ', 'تمساح', 'ثعبان', 'سلحفاة', 'ضفدع', 'سمكة', 'قرش', 'حوت', 'دولفين', 'أخطبوط',
    'نسر', 'صقر', 'بومة', 'بطة', 'دجاجة', 'ديك', 'طاووس', 'ببغاء', 'نعامة', 'بطريق',
    // حشرات
    'نحلة', 'فراشة', 'نملة', 'عنكبوت', 'صرصور', 'يعسوب', 'جرادة', 'دعسوقة', 'بعوضة', 'دودة',
    // أعضاء الجسم
    'رأس', 'عين', 'أذن', 'أنف', 'فم', 'يد', 'قدم', 'ركبة', 'كتف', 'ظهر',
    'بطن', 'قلب', 'رئة', 'كبد', 'دماغ', 'أصبع', 'شعر', 'لسان', 'سن', 'جلد',
    // مهن
    'طبيب', 'مهندس', 'معلم', 'شرطي', 'طيار', 'نجار', 'حداد', 'خباز', 'طباخ', 'صياد',
    'مزارع', 'محامي', 'قاضي', 'ممرضة', 'صحفي', 'مصور', 'رسام', 'موسيقي', 'ممثل', 'لاعب',
    'بحار', 'جندي', 'حارس', 'بواب', 'سائق', 'مدرب', 'حكم',
    // أماكن
    'مدرسة', 'مستشفى', 'مطار', 'ميناء', 'سوق', 'مسجد', 'كنيسة', 'قصر', 'حديقة', 'غابة',
    'صحراء', 'جبل', 'بحر', 'نهر', 'بحيرة', 'شاطئ', 'جزيرة', 'مدينة', 'قرية', 'مزرعة',
    'مصنع', 'مكتبة', 'متحف', 'ملعب', 'فندق',
    // أدوات وأشياء
    'مطرقة', 'منشار', 'مفك', 'مسمار', 'برغي', 'سلم', 'حبل', 'دلو', 'مقص', 'إبرة',
    'خيط', 'مرآة', 'ساعة', 'نظارة', 'مصباح', 'شمعة', 'مفتاح', 'قفل', 'حقيبة', 'محفظة',
    'مظلة', 'فرشاة', 'صابون', 'منشفة', 'وسادة', 'بطانية', 'سرير', 'كرسي', 'طاولة', 'باب',
    'نافذة', 'سلة', 'صندوق', 'كوب', 'صحن',
    // مركبات
    'سيارة', 'دراجة', 'قطار', 'طائرة', 'سفينة', 'حافلة', 'شاحنة', 'مركب', 'صاروخ', 'غواصة',
    'زورق', 'عربة', 'دبابة', 'مروحية', 'يخت',
    // طعام
    'تفاح', 'موز', 'برتقال', 'عنب', 'فراولة', 'بطيخ', 'أناناس', 'مانجو', 'خوخ', 'ليمون',
    'طماطم', 'بطاطس', 'جزر', 'خيار', 'بصل', 'ثوم', 'أرز', 'خبز', 'لحم', 'دجاج',
    'سمك', 'بيض', 'حليب', 'جبن', 'زبدة', 'عسل', 'سكر', 'ملح', 'شاي', 'قهوة',
    // طبيعة
    'شمس', 'قمر', 'نجمة', 'سحاب', 'مطر', 'ثلج', 'رياح', 'رعد', 'برق', 'نار',
    'ماء', 'تراب', 'حجر', 'رمل', 'جليد', 'بركان', 'زلزال', 'غيوم', 'ضباب', 'وادي',
    'هضبة', 'سهل', 'شلال', 'بستان',
    // رياضة
    'كرة', 'ملاكمة', 'سباحة', 'جري', 'قفز', 'تزلج', 'تنس', 'غولف', 'كاراتيه', 'جودو',
    'رماية', 'تجديف', 'رقص', 'يوغا', 'مصارعة', 'مضرب', 'شبكة', 'هدف', 'صافرة', 'ميدالية',
    'كأس', 'راية', 'بطولة', 'دوري', 'منتخب', 'جمهور',
    // تقنية
    'حاسوب', 'هاتف', 'تلفاز', 'راديو', 'كاميرا', 'طابعة', 'لوحة', 'فأرة', 'سماعة', 'شاشة',
    'كابل', 'بطارية', 'شاحن', 'روبوت', 'رادار', 'ليزر', 'شريحة', 'دائرة', 'تطبيق',
    // ملابس
    'قميص', 'بنطال', 'فستان', 'جاكيت', 'معطف', 'قبعة', 'حذاء', 'جورب', 'وشاح', 'قفاز',
    'حزام', 'خاتم', 'عقد', 'سوار',
    // مجردات
    'حرية', 'سلام', 'حرب', 'حب', 'صداقة', 'عدالة', 'شجاعة', 'صبر', 'أمل', 'حلم',
    'ذكرى', 'وقت', 'مال', 'ذهب', 'فضة', 'ماس', 'نفط', 'كهرباء', 'مغناطيس', 'طاقة',
    'ضوء', 'ظل', 'صوت', 'صدى', 'رائحة', 'طعم', 'لون', 'شكل', 'حجم', 'وزن',
    // ألوان
    'أصفر', 'أخضر', 'بنفسجي', 'وردي', 'بني', 'رمادي', 'أسود', 'أبيض', 'ذهبي', 'فضي',
    // مباني
    'برج', 'جسر', 'نفق', 'سد', 'قلعة', 'كوخ', 'خيمة', 'مصعد', 'درج', 'مدخنة',
    'سور', 'بوابة', 'رصيف', 'مرآب',
    // فضاء
    'كوكب', 'مذنب', 'مجرة', 'فضاء', 'رائد', 'مركبة', 'نيزك', 'ثقب', 'مسبار',
    // موسيقى
    'بيانو', 'غيتار', 'طبلة', 'ناي', 'كمان', 'ترومبيت', 'ميكروفون', 'نوتة', 'أغنية', 'لحن',
    // أسلحة وتاريخ
    'سيف', 'درع', 'رمح', 'قوس', 'سهم', 'خنجر', 'مدفع', 'تاج', 'عرش',
    // أدوات مدرسية
    'كتاب', 'قلم', 'دفتر', 'ممحاة', 'مسطرة', 'سبورة', 'طباشير', 'حاسبة', 'ملصق',
    // وقت وفصول
    'صباح', 'مساء', 'ليل', 'نهار', 'أسبوع', 'شهر', 'سنة', 'فصل', 'ربيع', 'صيف',
    'خريف', 'شتاء',
    // عائلة وأشخاص
    'أب', 'أم', 'أخ', 'أخت', 'جد', 'جدة', 'عم', 'خال', 'صديق', 'جار',
    'ضيف', 'غريب', 'طفل', 'شاب', 'عجوز',
    // مشاعر
    'فرح', 'حزن', 'غضب', 'خوف', 'قلق', 'دهشة', 'ملل', 'راحة', 'تعب', 'نشاط',
    // مطبخ
    'ملعقة', 'شوكة', 'سكين', 'طنجرة', 'مقلاة', 'فرن', 'ثلاجة', 'خلاط', 'غلاية', 'صينية',
    'وعاء', 'مصفاة', 'منخل', 'قدر'
]

const WORDS_POOL = Array.from(new Set(RAW_WORDS_POOL.filter(Boolean)))

// =========================================================
// 🎨 معلومات الفرق
// =========================================================
const TEAM_INFO = {
    blue: { name: 'الأزرق', emoji: '🔵', square: '🟦' },
    orange: { name: 'البرتقالي', emoji: '🟠', square: '🟧' }
}
const NEUTRAL_SQUARE = '⬜'
const ASSASSIN_SQUARE = '⬛'

const TEAM_ALIASES = {
    'ازرق': 'blue',
    'الازرق': 'blue',
    'برتقالي': 'orange',
    'البرتقالي': 'orange',
    'احمر': 'orange',
    'الاحمر': 'orange'
}

function otherTeam(team) {
    return team === 'blue' ? 'orange' : 'blue'
}

// groupId -> gameState
const games = new Map()
// userId -> groupId (لتوجيه رسائل الخاص "التلميح" للعبة الصحيحة)
const playerGameMap = new Map()

function mentionTag(userId) {
    return `@${userId.split('@')[0]}`
}

function displayName(state, userId) {
    const name = state && state.names && state.names.get(userId)
    return name ? `@${name}` : mentionTag(userId)
}

function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

async function dm(sock, userId, text) {
    try {
        await sock.sendMessage(userId, { text })
        return true
    } catch (err) {
        console.log('فشل إرسال خاص لكود نيمز لـ', userId, err)
        return false
    }
}

async function toGroup(sock, groupId, text, mentions = []) {
    try {
        await sock.sendMessage(groupId, { text, mentions })
    } catch (err) {
        console.log('فشل إرسال رسالة كود نيمز للقروب:', err)
    }
}

// =========================================================
// 1) أدوات مساعدة على الحالة
// =========================================================
function newTeamState() {
    return { participants: [], spy: null }
}

function getAssignment(state, userId) {
    for (const team of ['blue', 'orange']) {
        const t = state.teams[team]
        if (t.spy === userId) return { team, role: 'spy' }
        if (t.participants.includes(userId)) return { team, role: 'participant' }
    }
    return null
}

function totalPlayers(state) {
    return (
        state.teams.blue.participants.length +
        (state.teams.blue.spy ? 1 : 0) +
        state.teams.orange.participants.length +
        (state.teams.orange.spy ? 1 : 0)
    )
}

function clearAllTimers(state) {
    if (state.lobbyTimer) clearTimeout(state.lobbyTimer)
    if (state.hintTimer) clearTimeout(state.hintTimer)
    if (state.guessTimer) clearTimeout(state.guessTimer)
    if (state.confirmTimer) clearTimeout(state.confirmTimer)
}

function cleanupGame(groupId, state) {
    clearAllTimers(state)
    if (state.names) {
        for (const userId of state.names.keys()) {
            if (playerGameMap.get(userId) === groupId) playerGameMap.delete(userId)
        }
    }
    games.delete(groupId)
}

// =========================================================
// 2) بدء التسجيل (اللوبي)
// =========================================================
async function startLobby(sock, groupId, senderId, pushName) {
    if (games.has(groupId)) {
        await toGroup(sock, groupId, '❌ يوجد بالفعل تسجيل أو لعبة كود نيمز شغالة بهذا الجروب.')
        return
    }

    const state = {
        phase: 'lobby',
        hostId: senderId,
        teams: { blue: newTeamState(), orange: newTeamState() },
        names: new Map(),
        round: 0
    }

    games.set(groupId, state)

    state.lobbyTimer = setTimeout(async () => {
        const s = games.get(groupId)
        if (!s || s.phase !== 'lobby') return
        await toGroup(sock, groupId, '⌛ انتهت مهلة تسجيل كود نيمز بدون بدء اللعبة، تم الإلغاء.')
        cleanupGame(groupId, s)
    }, LOBBY_TIMEOUT_MS)

    await toGroup(
        sock,
        groupId,
        `🎯 ═══〔 تسجيل كود نيمز 〕═══ 🎯

الحد الأدنى للبدء: ${MIN_PLAYERS} — الحد الأقصى: ${MAX_PLAYERS}

🔵 للانضمام كمشارك بالفريق الأزرق: .ازرق
🟠 للانضمام كمشارك بالفريق البرتقالي: .برتقالي
🔵 لتصبح جاسوس الأزرق (واحد فقط): .سباي_ازرق
🟠 لتصبح جاسوس البرتقالي (واحد فقط): .سباي_برتقالي

⚠️ بعد ما تدخل فريق ما تقدر تنتقل لفريق ثاني.
لبدء اللعبة اكتب: .ابدأ_كود_نيمز`
    )
}

async function joinGame(sock, groupId, senderId, pushName, team, role) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'lobby') {
        await toGroup(sock, groupId, '❌ ماكو تسجيل كود نيمز مفتوح حالياً. اكتب .كود_نيمز للبدء بالتسجيل.')
        return
    }

    const existing = getAssignment(state, senderId)
    if (existing) {
        await toGroup(
            sock,
            groupId,
            `❌ ${mentionTag(senderId)} أنت بالفعل ${existing.role === 'spy' ? 'جاسوس' : 'مشارك'} بالفريق ${TEAM_INFO[existing.team].name}، ما تقدر تنتقل.`,
            [senderId]
        )
        return
    }

    if (role === 'spy') {
        if (state.teams[team].spy) {
            await toGroup(sock, groupId, `❌ الفريق ${TEAM_INFO[team].name} عنده جاسوس بالفعل.`)
            return
        }
        state.teams[team].spy = senderId
    } else {
        if (totalPlayers(state) >= MAX_PLAYERS) {
            await toGroup(sock, groupId, `❌ اكتمل العدد الأقصى (${MAX_PLAYERS} لاعب).`)
            return
        }
        state.teams[team].participants.push(senderId)
    }

    state.names.set(senderId, pushName || senderId.split('@')[0])
    playerGameMap.set(senderId, groupId)

    const roleLabel = role === 'spy' ? `جاسوس ${TEAM_INFO[team].emoji}` : `مشارك ${TEAM_INFO[team].emoji}`
    await toGroup(
        sock,
        groupId,
        `✅ ${mentionTag(senderId)} انضم كـ${roleLabel} بالفريق ${TEAM_INFO[team].name}\n\n🔵 الأزرق: ${state.teams.blue.participants.length + (state.teams.blue.spy ? 1 : 0)} | 🟠 البرتقالي: ${state.teams.orange.participants.length + (state.teams.orange.spy ? 1 : 0)}`,
        [senderId]
    )
}

// =========================================================
// 3) بدء اللعبة الفعلية
// =========================================================
function pickRandomWords(n) {
    return shuffle(WORDS_POOL).slice(0, n)
}

function buildBoard(startTeam) {
    const words = pickRandomWords(BOARD_WORDS)
    const other = otherTeam(startTeam)

    const colors = []
    for (let i = 0; i < START_TEAM_COUNT; i++) colors.push(startTeam)
    for (let i = 0; i < OTHER_TEAM_COUNT; i++) colors.push(other)
    for (let i = 0; i < NEUTRAL_COUNT; i++) colors.push('neutral')
    for (let i = 0; i < ASSASSIN_COUNT; i++) colors.push('assassin')

    const shuffledColors = shuffle(colors)

    return words.map((word, i) => ({
        id: i + 1,
        word,
        color: shuffledColors[i],
        revealed: false
    }))
}

async function startGame(sock, groupId, requesterId) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'lobby') {
        await toGroup(sock, groupId, '❌ ماكو تسجيل كود نيمز مفتوح حالياً.')
        return
    }

    const blue = state.teams.blue
    const orange = state.teams.orange

    if (!blue.spy || !orange.spy) {
        await toGroup(sock, groupId, '❌ لازم كل فريق (الأزرق والبرتقالي) يكون عنده جاسوس واحد قبل البدء.')
        return
    }

    if (blue.participants.length < 1 || orange.participants.length < 1) {
        await toGroup(sock, groupId, '❌ لازم كل فريق يكون عنده مشارك واحد بالأقل قبل البدء.')
        return
    }

    if (totalPlayers(state) < MIN_PLAYERS) {
        await toGroup(sock, groupId, `❌ لازم ${MIN_PLAYERS} لاعبين بالأقل للبدء (الحالي: ${totalPlayers(state)}).`)
        return
    }

    if (state.lobbyTimer) clearTimeout(state.lobbyTimer)

    const startTeam = Math.random() < 0.5 ? 'blue' : 'orange'

    state.board = buildBoard(startTeam)
    state.startTeam = startTeam
    state.currentTeam = startTeam
    state.round = 1
    state.currentHint = null
    state.pendingGuess = null

    state.remaining = {
        blue: state.board.filter(c => c.color === 'blue').length,
        orange: state.board.filter(c => c.color === 'orange').length
    }

    await toGroup(
        sock,
        groupId,
        `🎯 بدأت لعبة كود نيمز! 🎯\n\nالفريق الذي يبدأ أولاً: ${TEAM_INFO[startTeam].emoji} ${TEAM_INFO[startTeam].name} (9 كلمات)\nالفريق الآخر: ${TEAM_INFO[otherTeam(startTeam)].emoji} ${TEAM_INFO[otherTeam(startTeam)].name} (8 كلمات)\n\n${renderPublicBoard(state)}`
    )

    for (const team of ['blue', 'orange']) {
        await dm(sock, state.teams[team].spy, renderSpyBoard(state, team))
    }

    await beginHintPhase(sock, groupId, state, true)
}

// =========================================================
// 4) عرض اللوحة
// =========================================================
function chunk3(arr) {
    const rows = []
    for (let i = 0; i < arr.length; i += 3) rows.push(arr.slice(i, i + 3))
    return rows
}

function renderPublicBoard(state) {
    const cells = state.board.map(c => {
        if (c.revealed) {
            const square =
                c.color === 'blue' ? TEAM_INFO.blue.square :
                c.color === 'orange' ? TEAM_INFO.orange.square :
                c.color === 'assassin' ? ASSASSIN_SQUARE :
                NEUTRAL_SQUARE
            return square
        }
        return `${String(c.id).padStart(2, ' ')} ${c.word}`
    })

    const rows = chunk3(cells).map(r => r.join('   ')).join('\n')

    const hintLine = state.currentHint
        ? `💬 التلميح الحالي: "${state.currentHint.word}" (${state.currentHint.count})`
        : '💬 بانتظار تلميح الجاسوس...'

    const turnEmoji = TEAM_INFO[state.currentTeam].emoji

    return `🎯 كود نيمز
${turnEmoji} الدور: **الفريق ${TEAM_INFO[state.currentTeam].name}** | النتيجة 🔵${state.remaining.blue} 🟠${state.remaining.orange}

${rows}

${hintLine}`
}

function renderSpyBoard(state, spyTeam) {
    const enemyTeam = otherTeam(spyTeam)

    const cells = state.board.map(c => {
        const square =
            c.color === 'blue' ? TEAM_INFO.blue.square :
            c.color === 'orange' ? TEAM_INFO.orange.square :
            c.color === 'assassin' ? ASSASSIN_SQUARE :
            NEUTRAL_SQUARE

        // بعد ما تنكشف الكلمة، تختفي وتصير مربع اللون فقط (زي لوحة المشاركين تماماً)
        if (c.revealed) {
            return square
        }

        return `${square}${String(c.id).padStart(2, ' ')} ${c.word}`
    })

    const rows = chunk3(cells).map(r => r.join('   ')).join('\n')

    const ownCount = state.board.filter(c => c.color === spyTeam).length
    const enemyCount = state.board.filter(c => c.color === enemyTeam).length
    const neutralCount = state.board.filter(c => c.color === 'neutral').length
    const assassinCount = state.board.filter(c => c.color === 'assassin').length

    return `🎯 لوحة الجاسوس (سري) 🔒
${TEAM_INFO[spyTeam].emoji} دورك: الفريق ${TEAM_INFO[spyTeam].name}

${rows}

${TEAM_INFO[spyTeam].square} فريقك (${ownCount})  ${TEAM_INFO[enemyTeam].square} فريق الخصم (${enemyCount})
${NEUTRAL_SQUARE} محايد (${neutralCount})   ${ASSASSIN_SQUARE} القاتل 💀 (${assassinCount})`
}

// =========================================================
// 5) دور التلميح
// =========================================================
async function beginHintPhase(sock, groupId, state, isFirstTurn) {
    if (!games.has(groupId)) return

    state.phase = 'hint'
    state.currentHint = null
    state.pendingGuess = null
    if (state.confirmTimer) clearTimeout(state.confirmTimer)

    if (!isFirstTurn) {
        await toGroup(
            sock,
            groupId,
            `➡️ ═══〔 دور جديد 〕═══ ➡️\n\nالدور الآن لـ **الفريق ${TEAM_INFO[state.currentTeam].name}** ${TEAM_INFO[state.currentTeam].emoji}\nبانتظار تلميح الجاسوس...`
        )
    }

    const spyId = state.teams[state.currentTeam].spy
    await dm(
        sock,
        spyId,
        `🎯 دورك الآن! أرسل تلميحك خلال 3 دقائق بهذا الشكل:\n.تلميح <كلمة> <رقم>\n\nمثال: .تلميح سريع 2`
    )

    state.hintTimer = setTimeout(async () => {
        const s = games.get(groupId)
        if (!s || s.phase !== 'hint') return
        await toGroup(sock, groupId, `⌛ انتهت مهلة الجاسوس لإرسال التلميح، ينتقل الدور تلقائياً.`)
        await switchTurn(sock, groupId, s, false)
    }, HINT_TIMEOUT_MS)
}

async function handleHintMessage(sock, senderId, text) {
    const groupId = playerGameMap.get(senderId)
    if (!groupId) return false

    const state = games.get(groupId)
    if (!state) {
        playerGameMap.delete(senderId)
        return false
    }

    if (state.phase !== 'hint') return false
    if (state.teams[state.currentTeam].spy !== senderId) return false

    const parts = text.trim().split(/\s+/)
    if (parts[0] !== '.تلميح') return false

    const word = parts[1]
    const countRaw = parts[2]
    const bonusFlag = parts[3] === '(1)'

    if (!word || /\d/.test(word)) {
        await dm(sock, senderId, '❌ صيغة غير صحيحة. اكتب: .تلميح <كلمة واحدة> <رقم>')
        return true
    }

    const count = parseInt(countRaw, 10)
    if (!countRaw || isNaN(count) || count < 1 || count > 9) {
        await dm(sock, senderId, '❌ الرقم لازم يكون بين 1 و 9. مثال: .تلميح سريع 2')
        return true
    }

    const boardHasWord = state.board.some(c => c.word.trim() === word.trim())
    if (boardHasWord) {
        await dm(sock, senderId, '❌ ما تقدر تستخدم كلمة موجودة على اللوحة كتلميح.')
        return true
    }

    if (state.hintTimer) clearTimeout(state.hintTimer)

    const bonus = bonusFlag ? 1 : 0
    state.currentHint = {
        word,
        count,
        guessLimit: count + 1 + bonus,
        guessesMade: 0
    }

    state.phase = 'guessing'

    await dm(sock, senderId, `✅ تم إرسال تلميحك: "${word}" (${count}) — تم إعلانه للقروب.`)

    await toGroup(
        sock,
        groupId,
        `💬 ═══〔 تلميح جديد 〕═══ 💬\n\nدور **الفريق ${TEAM_INFO[state.currentTeam].name}** ${TEAM_INFO[state.currentTeam].emoji}\nالتلميح: "${word}" (${count})${bonus ? ' (1)' : ''}\nيقدرون يخمنون حتى ${state.currentHint.guessLimit} كلمات.\n\nاختاروا بكتابة: .كلمة <رقم>\nولإنهاء الدور مبكراً: .انهاء_دور`
    )

    // نرسل اللوحة من جديد بعد التلميح عشان المشاركين يشوفون الأرقام الحالية
    await toGroup(sock, groupId, renderPublicBoard(state))

    state.guessTimer = setTimeout(async () => {
        const s = games.get(groupId)
        if (!s || s.phase !== 'guessing') return
        await toGroup(sock, groupId, `⌛ انتهت مهلة التخمين، ينتقل الدور تلقائياً.`)
        await switchTurn(sock, groupId, s, false)
    }, GUESS_TIMEOUT_MS)

    return true
}

// =========================================================
// 6) دور التخمين
// =========================================================
async function switchTurn(sock, groupId, state, announceBoard) {
    if (!games.has(groupId)) return
    if (state.guessTimer) clearTimeout(state.guessTimer)
    if (state.confirmTimer) clearTimeout(state.confirmTimer)

    if (announceBoard) {
        await toGroup(sock, groupId, renderPublicBoard(state))

        // ينتهي الدور → نرسل اللوحة المحدثة لكل جاسوس بالخاص (مرة وحدة بس، مو كل تخمين)
        for (const team of ['blue', 'orange']) {
            await dm(sock, state.teams[team].spy, renderSpyBoard(state, team))
        }
    }

    state.currentTeam = otherTeam(state.currentTeam)
    await beginHintPhase(sock, groupId, state, false)
}

async function endGameWithResult(sock, groupId, state, winner, reasonText) {
    const cells = state.board.map(c => {
        const square =
            c.color === 'blue' ? TEAM_INFO.blue.square :
            c.color === 'orange' ? TEAM_INFO.orange.square :
            c.color === 'assassin' ? ASSASSIN_SQUARE :
            NEUTRAL_SQUARE
        return `${square} ${c.word}`
    })

    const reveal = chunk3(cells).map(r => r.join('   ')).join('\n')

    await toGroup(
        sock,
        groupId,
        `🏁 ═══〔 انتهت لعبة كود نيمز 〕═══ 🏁\n\n${reasonText}\n\n🏆 الفائز: ${TEAM_INFO[winner].emoji} الفريق ${TEAM_INFO[winner].name}\n\n📋 اللوحة كاملة:\n${reveal}`
    )

    cleanupGame(groupId, state)
}

async function checkWinCondition(sock, groupId, state) {
    if (state.remaining.blue <= 0) {
        await endGameWithResult(sock, groupId, state, 'blue', '🔵 الفريق الأزرق أوجد كل كلماته!')
        return true
    }
    if (state.remaining.orange <= 0) {
        await endGameWithResult(sock, groupId, state, 'orange', '🟠 الفريق البرتقالي أوجد كل كلماته!')
        return true
    }
    return false
}

async function proposeGuess(sock, groupId, senderId, text) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'guessing') {
        await toGroup(sock, groupId, '❌ ماكو دور تخمين شغال حالياً.')
        return true
    }

    const assignment = getAssignment(state, senderId)
    if (!assignment || assignment.team !== state.currentTeam || assignment.role !== 'participant') {
        await toGroup(sock, groupId, `❌ بس مشاركين الفريق ${TEAM_INFO[state.currentTeam].name} يقدرون يخمنون الآن.`)
        return true
    }

    const idRaw = text.trim().split(/\s+/)[1]
    const id = parseInt(idRaw, 10)

    if (!idRaw || isNaN(id) || id < 1 || id > BOARD_WORDS) {
        await toGroup(sock, groupId, '❌ اكتب رقم كلمة صحيح. مثال: .كلمة 5')
        return true
    }

    const cell = state.board.find(c => c.id === id)
    if (!cell || cell.revealed) {
        await toGroup(sock, groupId, '❌ هذي الكلمة تم اختيارها من قبل أو رقمها غير موجود.')
        return true
    }

    if (state.pendingGuess) {
        await toGroup(
            sock,
            groupId,
            `⚠️ فيه اختيار قيد التأكيد من ${mentionTag(state.pendingGuess.userId)}، انتظروا تأكيده أو انتهاء المهلة.`,
            [state.pendingGuess.userId]
        )
        return true
    }

    if (state.confirmTimer) clearTimeout(state.confirmTimer)

    state.pendingGuess = { userId: senderId, cellId: id }
    state.confirmTimer = setTimeout(async () => {
        const s = games.get(groupId)
        if (!s || !s.pendingGuess || s.pendingGuess.userId !== senderId) return
        s.pendingGuess = null
        await toGroup(sock, groupId, `⌛ انتهت مهلة التأكيد لاختيار ${mentionTag(senderId)}، اختاروا كلمة من جديد.`, [senderId])
    }, CONFIRM_TIMEOUT_MS)

    await toGroup(
        sock,
        groupId,
        `❓ ${mentionTag(senderId)} هل أنت متأكد باختيارك -${cell.word}-؟\nاكتب .متاكد للتأكيد.`,
        [senderId]
    )
    return true
}

async function confirmGuess(sock, groupId, senderId) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'guessing' || !state.pendingGuess) {
        await toGroup(sock, groupId, '❌ ماكو اختيار قيد الانتظار.')
        return true
    }

    if (state.pendingGuess.userId !== senderId) {
        await toGroup(sock, groupId, '❌ بس اللي اختار الكلمة يقدر يؤكدها.')
        return true
    }

    if (state.confirmTimer) clearTimeout(state.confirmTimer)

    const cellId = state.pendingGuess.cellId
    state.pendingGuess = null

    const cell = state.board.find(c => c.id === cellId)
    if (!cell || cell.revealed) {
        await toGroup(sock, groupId, '❌ هذي الكلمة انكشفت من قبل.')
        return true
    }

    cell.revealed = true

    const revealEmoji =
        cell.color === 'blue' ? TEAM_INFO.blue.square :
        cell.color === 'orange' ? TEAM_INFO.orange.square :
        cell.color === 'assassin' ? ASSASSIN_SQUARE :
        NEUTRAL_SQUARE

    await toGroup(sock, groupId, `${mentionTag(senderId)} اخترتوا -${cell.word}- وطلعت ${revealEmoji}`, [senderId])

    // 💀 القاتل: خسارة فورية للفريق الحالي
    if (cell.color === 'assassin') {
        await endGameWithResult(
            sock,
            groupId,
            state,
            otherTeam(state.currentTeam),
            `☠️ الفريق ${TEAM_INFO[state.currentTeam].name} اختار كلمة القاتل!`
        )
        return true
    }

    if (cell.color === state.currentTeam) {
        state.remaining[state.currentTeam]--
        state.currentHint.guessesMade++

        if (await checkWinCondition(sock, groupId, state)) return true

        if (state.currentHint.guessesMade >= state.currentHint.guessLimit) {
            await toGroup(sock, groupId, `📌 وصلتوا للحد الأقصى من التخمينات، ينتقل الدور.`)
            await switchTurn(sock, groupId, state, true)
            return true
        }

        return true
    }

    // كلمة الفريق الآخر أو كلمة محايدة → ينتهي الدور فوراً
    if (cell.color !== 'neutral') {
        state.remaining[cell.color]--
        if (await checkWinCondition(sock, groupId, state)) return true
    }

    await switchTurn(sock, groupId, state, true)
    return true
}

async function endTurnEarly(sock, groupId, senderId) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'guessing') {
        await toGroup(sock, groupId, '❌ ماكو دور تخمين شغال حالياً.')
        return true
    }

    const assignment = getAssignment(state, senderId)
    if (!assignment || assignment.team !== state.currentTeam || assignment.role !== 'participant') {
        await toGroup(sock, groupId, `❌ بس مشاركين الفريق ${TEAM_INFO[state.currentTeam].name} يقدرون ينهون الدور.`)
        return true
    }

    await toGroup(sock, groupId, `🛑 ${mentionTag(senderId)} أنهى دور الفريق ${TEAM_INFO[state.currentTeam].name}.`, [senderId])
    await switchTurn(sock, groupId, state, true)
    return true
}

// =========================================================
// 7) قائمة الفرق
// =========================================================
async function showRoster(sock, groupId) {
    const state = games.get(groupId)
    if (!state) {
        await toGroup(sock, groupId, '❌ ماكو تسجيل أو لعبة كود نيمز شغالة حالياً.')
        return
    }

    function teamBlock(team) {
        const t = state.teams[team]
        const spyLine = t.spy ? `جاسوس: ${mentionTag(t.spy)}` : 'جاسوس: —'
        const list = t.participants.length
            ? t.participants.map(p => mentionTag(p)).join('، ')
            : '—'
        return `${TEAM_INFO[team].emoji} الفريق ${TEAM_INFO[team].name}\n${spyLine}\nالمشاركون: ${list}`
    }

    const mentions = [
        state.teams.blue.spy, ...state.teams.blue.participants,
        state.teams.orange.spy, ...state.teams.orange.participants
    ].filter(Boolean)

    await toGroup(
        sock,
        groupId,
        `👥 ═══〔 فرق كود نيمز 〕═══ 👥\n\n${teamBlock('blue')}\n\n${teamBlock('orange')}`,
        mentions
    )
}

async function forceEndGame(sock, groupId, senderId) {
    const state = games.get(groupId)
    if (!state) {
        await toGroup(sock, groupId, '❌ ماكو تسجيل أو لعبة كود نيمز شغالة حالياً بهذا الجروب.')
        return
    }

    if (senderId !== state.hostId) {
        await toGroup(sock, groupId, '❌ بس اللي فتح التسجيل يقدر يلغي/ينهي اللعبة.')
        return
    }

    await toGroup(sock, groupId, '🛑 تم إنهاء/إلغاء لعبة كود نيمز.')
    cleanupGame(groupId, state)
}

// =========================================================
// 8) نقطة الدخول — رسائل القروب
// =========================================================
async function handleMessage(sock, groupId, senderId, text, pushName) {
    const trimmed = text.trim()

    if (trimmed === '.كود_نيمز') {
        await startLobby(sock, groupId, senderId, pushName)
        return true
    }

    if (trimmed === '.ازرق') {
        await joinGame(sock, groupId, senderId, pushName, 'blue', 'participant')
        return true
    }

    if (trimmed === '.برتقالي' || trimmed === '.احمر') {
        await joinGame(sock, groupId, senderId, pushName, 'orange', 'participant')
        return true
    }

    if (trimmed.startsWith('.مشارك ')) {
        const arg = trimmed.split(/\s+/)[1]
        const team = TEAM_ALIASES[arg]
        if (!team) {
            await toGroup(sock, groupId, '❌ استخدم: .مشارك ازرق أو .مشارك برتقالي')
            return true
        }
        await joinGame(sock, groupId, senderId, pushName, team, 'participant')
        return true
    }

    if (trimmed === '.سباي_ازرق') {
        await joinGame(sock, groupId, senderId, pushName, 'blue', 'spy')
        return true
    }

    if (trimmed === '.سباي_برتقالي' || trimmed === '.سباي_احمر') {
        await joinGame(sock, groupId, senderId, pushName, 'orange', 'spy')
        return true
    }

    if (trimmed.startsWith('.سباي ')) {
        const arg = trimmed.split(/\s+/)[1]
        const team = TEAM_ALIASES[arg]
        if (!team) {
            await toGroup(sock, groupId, '❌ استخدم: .سباي ازرق أو .سباي برتقالي')
            return true
        }
        await joinGame(sock, groupId, senderId, pushName, team, 'spy')
        return true
    }

    if (trimmed === '.ابدأ_كود_نيمز' || trimmed === '.ابدا_كود_نيمز') {
        await startGame(sock, groupId, senderId)
        return true
    }

    if (trimmed === '.انهاء_كود_نيمز') {
        await forceEndGame(sock, groupId, senderId)
        return true
    }

    if (trimmed === '.فريق') {
        await showRoster(sock, groupId)
        return true
    }

    const state = games.get(groupId)
    if (!state) return false

    if (trimmed.startsWith('.كلمة ')) {
        return await proposeGuess(sock, groupId, senderId, trimmed)
    }

    if (trimmed === '.متاكد') {
        return await confirmGuess(sock, groupId, senderId)
    }

    if (trimmed === '.انهاء_دور') {
        return await endTurnEarly(sock, groupId, senderId)
    }

    return false
}

// =========================================================
// 9) نقطة الدخول — الرسائل الخاصة (تلميح الجاسوس فقط)
// =========================================================
async function handlePrivateMessage(sock, senderId, text) {
    return await handleHintMessage(sock, senderId, text)
}

module.exports = {
    handleMessage,
    handlePrivateMessage
}
