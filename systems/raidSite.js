// =====================================================================
// systems/raidSite.js — الغزو العالمي (الرايد) من الموقع
//
// ⚠️ لا يحتوي أي منطق قتال خاص به. الهجوم من الموقع يشغّل نفس الدالة
//    attackRaid() الموجودة في raidBattle.js حرفياً (نفس الضرر، الكولداون،
//    الباسف، قدرات الزعيم، المراحل، الجوائز...) بدون تعديل أي سطر منها،
//    بس نمرّر لها sock وهمي يلتقط الرسائل، ثم نحوّلها لبيانات تعرضها الصفحة.
// =====================================================================

const Raid = require('../models/Raid')
const kingdoms = require('./raidKingdoms')
const raidAbilities = require('./raidAbilities')
const raidBattle = require('./raidBattle')
const raidManager = require('./raidManager')
const beastFxConfig = require('./beastFxConfig') // روابط صور أنميشن كوراما/الجوبي

// رابط الصورة من beastFxConfig (https فقط، وإلا نرجع للصورة المدمجة بالصفحة)
const beastImgUrl = id => { const u = String((beastFxConfig && beastFxConfig[id]) || '').trim(); return /^https:\/\/[^\s'"()\\<>]+$/i.test(u) ? u : '' }

// نفس قيمة ATTACK_COOLDOWN في raidBattle.js (30 ثانية) — تُؤخذ منه إن صُدّرت
const ATTACK_COOLDOWN = Number(raidBattle.ATTACK_COOLDOWN) || 30000

// أقصى عدد مشاركين تعرضهم الساحة (أنت + الأعلى ضرراً)
const MAX_STAGE_PLAYERS = 8

// هل نرسل تقرير كل ضربة (من الموقع) لقروبات الرايد؟ (جوائز نهاية الغزو تُرسل دائماً)
const FORWARD_BATTLE_REPORT = false

// آخر غزو انتهى بهجوم من الموقع (لعرض الجوائز بشاشة النهاية)
let lastEnd = null

// =========================
// أدوات
// =========================

const clean = s => String(s == null ? '' : s).replace(/[<>&"'`\\]/g, '').trim()

const num = s => {
    const n = Number(String(s == null ? '' : s).replace(/[^\d]/g, ''))
    return Number.isFinite(n) ? n : 0
}

// نفس getAliveCharacter في raidBattle.js (للعرض فقط)
function charHp(c) {
    const hp = c.currentHp === undefined ? c.power : c.currentHp
    return Number(hp)
}

function aliveIndex(chars) {
    for (let i = 0; i < (chars || []).length; i++) {
        const c = chars[i]
        if (c.dead) continue
        if (charHp(c) > 0) return i
    }
    return -1
}

// damageMap قد يكون Map أو كائن عادي — نقرأ الاثنين
function damageEntries(raid) {
    const m = raid && raid.damageMap
    if (!m) return []
    const out = new Map()
    if (m instanceof Map) {
        for (const [k, v] of m.entries()) out.set(String(k), Number(v) || 0)
    }
    for (const k of Object.keys(m)) {
        const v = m[k]
        if (typeof v === 'number') out.set(k, v)
    }
    return [...out.entries()].sort((a, b) => b[1] - a[1])
}

function charView(c, i, charImage) {
    const max = Number(c.power) || 0
    let hp = charHp(c)
    if (!(hp >= 0)) hp = 0
    return {
        i,
        name: clean(c.name) || '—',
        power: max,
        hp: Math.min(hp, max || hp),
        max,
        dead: !!c.dead || !(charHp(c) > 0),
        img: (charImage && charImage(c)) || ''
    }
}

function raidView(raid) {
    const idx = kingdoms.findIndex(k => k.name === raid.kingdom)
    const kd = idx >= 0 ? kingdoms[idx] : null
    return {
        name: clean(raid.kingdom),
        anime: clean(raid.anime),
        boss: clean(raid.bossName),
        bossImage: /^https:\/\/[^\s'"()\\]+$/i.test(raid.bossImage || '') ? raid.bossImage : '',
        hp: Math.max(0, Number(raid.hp) || 0),
        max: Math.max(0, Number(raid.maxHp) || 0),
        total: Number(raid.totalDamage) || 0,
        diff: Number(raid.difficulty) || 1,
        rm: Number(raid.rewardMultiplier) || 1,
        passive: raid.passive || '',
        pv: Number(raid.passiveValue) || 0,
        theme: idx >= 0 ? idx : 0,
        endsAt: Number(raid.endsAt) || 0,
        ab: kd ? kd.abilities.slice() : []
    }
}

// الحقول الوحيدة التي يحتاجها الهجوم من الشخصيات (بدون صور/معدات/إيكوز...)
const LIGHT_PLAYER_FIELDS = 'userId characters.name characters.power characters.currentHp characters.dead'

// حقول لا تُقرأ ولا تُكتب في مسار الهجوم (استثناؤها آمن: الحفظ يكتب الحقول المعدّلة فقط)
const HEAVY_UNUSED_EXCLUDE = '-giftInbox -giftLog -rewardLog -galleryLikes'

function createRaidSite({ Player, getSock, charImage }) {

    // تسلسل كل الهجمات (الرايد مستند واحد مشترك، نمنع تداخل القراءة/الكتابة بين لاعبين من الموقع)
    let chain = Promise.resolve()
    function serial(fn) {
        const p = chain.then(fn)
        chain = p.catch(() => {})
        return p
    }

    async function loadPlayers(ids) {
        if (!ids.length) return new Map()
        const list = await Player.find({ userId: { $in: ids } })
            .select('userId name username characters.name characters.power characters.currentHp characters.dead')
            .lean()
        return new Map(list.map(p => [p.userId, p]))
    }

    // =========================
    // حالة الصفحة
    // =========================

    async function getState(userId, req) {

        // ⚡ قراءتان بالتوازي (بدل الواحدة بعد الأخرى) + نجلب فقط حقول اللاعب اللازمة
        const [player, activeRaid] = await Promise.all([
            Player.findOne({ userId }).select('name username characters lastRaidAttack').lean(),
            Raid.findOne({ active: true }).lean()
        ])
        if (!player) return null

        const chars = player.characters || []
        const meView = {
            id: userId,
            name: clean(player.name || player.username) || 'لاعب',
            cdMs: Math.max(0, ATTACK_COOLDOWN - (Date.now() - (player.lastRaidAttack || 0))),
            chars: chars.map((c, i) => charView(c, i, ch => charImage && charImage(ch, req))),
            dmg: 0
        }

        const raid = activeRaid

        if (!raid) {
            const any = await Raid.findOne().lean()
            return {
                active: false,
                nextAt: raidManager.getNextRaidTime().getTime(),
                killed: !!(any && any.endedAt > 0 && any.hp <= 0),
                last: lastEnd,
                me: meView
            }
        }

        const entries = damageEntries(raid)
        const mine = entries.find(e => e[0] === userId)
        meView.dmg = mine ? mine[1] : 0

        const others = entries.filter(e => e[0] !== userId).slice(0, MAX_STAGE_PLAYERS - 1)
        const stage = [...others]
        const pmap = await loadPlayers(stage.map(e => e[0]))

        const board = stage.map(([id, dmg]) => {
            const p = pmap.get(id)
            const pc = (p && p.characters) || []
            const ai = aliveIndex(pc)
            return {
                id,
                name: clean(p && (p.name || p.username)) || clean(id.split('@')[0]).slice(-6),
                dmg,
                out: ai < 0,
                cn: ai >= 0 ? clean(pc[ai].name) : ''
            }
        })

        return {
            active: true,
            raid: raidView(raid),
            me: meView,
            board,
            count: entries.length,
            cdTotal: ATTACK_COOLDOWN,
            last: lastEnd
        }
    }

    // =========================
    // تحليل نص رسالة الهجوم (نفس النصوص اللي يرسلها raidBattle.js)
    // =========================

    function parseHit(t) {

        const dmgs = [...t.matchAll(/💥 الضرر\s+([\d,]+)/g)].map(m => num(m[1]))

        const tags = []
        let best = 1
        const crit = /🔥 ضربة حرجة/.test(t)
        if (crit) tags.push('ضربة حرجة')

        for (const line of t.split('\n')) {
            const m = line.match(/^\s*(.+?)\s*×\s*([\d.]+)\s*$/)
            if (!m) continue
            const name = m[1].replace(/^[^\p{L}\p{N}]+/u, '').trim()
            const mult = Number(m[2])
            if (!name || !(mult > 0)) continue
            tags.push(`${name} ×${mult}`)
            best = Math.max(best, mult)
        }

        const pick = re => { const m = t.match(re); return m ? num(m[1]) : 0 }

        return {
            dmg: dmgs[0] || 0,
            crit,
            tags,
            best,
            absorbed: pick(/امتص\s+([\d,]+)\s+من ضررك/),
            reflect: pick(/رد عليك\s+([\d,]+)\s+ضرر مرتد/),
            heal: pick(/استعاد\s+([\d,]+)\s+من صحته/),
            bossDmg: dmgs[1] || 0,
            beast: (/كوراما\s+هجم معك/.test(t) ? 'kurama' : /الجوبي\s+هجم معك/.test(t) ? 'juubi' : '')
        }
    }

    function parseRewards(msgs) {
        const rows = []
        for (const m of msgs) {
            if (!m.startsWith('🏆 ═════〔 الجائزة')) continue
            const id = (m.match(/@(\d+)/) || [])[1]
            if (!id) continue
            const ch = m.match(/🌟 حصل على\s+(.+?)\s+⭐ SSS/s)
            rows.push({
                num: id,
                money: num((m.match(/💰\s*([\d,]+)/) || [])[1]),
                character: ch ? clean(ch[1]) : '',
                chance: num((m.match(/SSS Chance ×(\d+)/) || [])[1]),
                high: num((m.match(/SSS High ×(\d+)/) || [])[1]),
                dmg: num((m.match(/إجمالي الضرر\s+([\d,]+)/) || [])[1])
            })
        }
        return rows
    }

    async function nameRows(rows) {
        if (!rows.length) return rows
        const ors = rows.map(r => ({ userId: { $regex: `^${r.num}@` } }))
        const list = await Player.find({ $or: ors }).select('userId name username').lean()
        for (const r of rows) {
            const p = list.find(x => String(x.userId).split('@')[0] === r.num)
            r.id = p ? p.userId : ''
            r.name = clean(p && (p.name || p.username)) || r.num.slice(-6)
        }
        return rows
    }

    // =========================
    // الهجوم — يستدعي attackRaid الحقيقي بدون أي تغيير
    // =========================

    async function attack(userId) {
        return serial(async () => {

            const T0 = Date.now()

            // ⚡ نحمّل الغارة واللاعب مرة واحدة (بالتوازي) ونمررهما لـ attackRaid
            // — نفس الاستعلامين اللي كان يعملهم attackRaid بنفسه، بدون قراءات مكررة قبل/بعد.
            const [raidDoc, playerDoc] = await Promise.all([
                Raid.findOne({ active: true }),
                // ⚡ نستثني فقط مصفوفات صغيرة مسقوفة لا يلمسها الهجوم ولا خطّافات الحفظ:
                // صندوق/سجل الإهداء (≤50/≤100) وسجل الجوائز (≤30) ولايكات المعرض.
                // لا نستثني أي حقل آخر (المهام/الإنجازات/المستوى/المعدات/الأسلحة/الرفيق كلها لازمة).
                Player.findOne({ userId }).select(HEAVY_UNUSED_EXCLUDE)
            ])
            if (!raidDoc) return { ok: false, code: 'NO_RAID', message: 'لا يوجد غزو نشط حالياً.' }
            if (!playerDoc) return { ok: false, code: 'NO_PLAYER', message: 'لا يوجد حساب.' }

            // لقطة "قبل الهجوم" (attackRaid يعدّل المستند نفسه، فنحفظ الأرقام الآن)
            const raidBefore = { kingdom: raidDoc.kingdom, bossName: raidDoc.bossName }
            const bChars = (playerDoc.characters || []).map(c => ({
                name: c.name, power: c.power, currentHp: c.currentHp, dead: c.dead
            }))
            const a0 = aliveIndex(bChars)
            const hp0 = a0 >= 0 ? charHp(bChars[a0]) : 0

            // sock وهمي يلتقط كل رسائل attackRaid
            const sent = []
            const cap = {
                sendMessage: async (jid, content) => {
                    sent.push(content || {})
                    return {}
                }
            }

            try {
                await raidBattle.attackRaid({ sock: cap, jid: 'site@raid', userId, preload: { raid: raidDoc, player: playerDoc } })
            } catch (err) {
                console.error('raid site attack error:', err)
                return { ok: false, code: 'SERVER', message: 'خطأ بالخادم' }
            }

            const msgs = sent.map(c => String(c.text || c.caption || ''))
            const first = msgs[0] || ''

            // ردود الرفض (نفس رسائل attackRaid)
            if (/^⏳ انتظر/.test(first)) {
                const sec = num((first.match(/انتظر\s+(\d+)\s+ثانية/) || [])[1]) || 1
                return { ok: false, code: 'COOLDOWN', message: 'انتظر قبل الهجوم القادم.', retryInMs: sec * 1000 }
            }
            if (/^☠️ جميع شخصياتك سقطت/.test(first)) {
                return { ok: false, code: 'DEAD', message: 'سقطت جميع شخصياتك — لا يمكنك المشاركة حتى ينتهي الرايد.' }
            }
            if (/^❌/.test(first)) {
                return { ok: false, code: first.includes('حساب') ? 'NO_PLAYER' : 'NO_RAID', message: first.replace(/^❌\s*/, '').split('\n')[0] }
            }

            if (FORWARD_BATTLE_REPORT) await forward(sent.slice(0, 1))

            const killed = /تم القضاء على الزعيم/.test(first)

            // ⚡ ما بعد الهجوم: نقرأ من نفس المستندات المحفوظة بدل إعادة القراءة.
            // استثناء: عند قتل الزعيم تُعاد الشخصيات للحياة بقاعدة البيانات (resetAllRaidCharacters)
            // فنعيد قراءة اللاعب لنفس السلوك القديم.
            const raidAfter = { hp: raidDoc.hp, totalDamage: raidDoc.totalDamage }
            let aChars
            if (killed) {
                const after = await Player.findOne({ userId }).select(LIGHT_PLAYER_FIELDS).lean()
                aChars = (after && after.characters) || []
            } else {
                aChars = playerDoc.characters || []
            }

            const hit = parseHit(first)
            const boss = {}

            // ----- الارتداد (counter) قد يقتل الشخصية الحالية قبل هجوم الزعيم -----
            const reflectKill = hit.reflect > 0 && a0 >= 0 && hp0 - hit.reflect <= 0

            let target = a0
            if (reflectKill) {
                target = -1
                for (let i = 0; i < bChars.length; i++) {
                    if (i === a0 || bChars[i].dead) continue
                    if (charHp(bChars[i]) > 0) { target = i; break }
                }
            }

            const kd = kingdoms.find(k => k.name === raidBefore.kingdom)
            let ab = ''
            if (kd) {
                for (const name of kd.abilities) {
                    const s = raidAbilities[name]
                    if (s && s.message && first.includes(s.message)) { ab = name; break }
                }
            }

            let bossOut = null
            if (!killed && target >= 0) {

                const dodged = /تفادى الهجوم بنجاح/.test(first)
                const died = /سقوط مقاتل|『 ☠️ الهزيمة 』/.test(first)
                const out = /『 ☠️ الهزيمة 』/.test(first)
                const tc = aChars[target] || {}

                const startHp = target === a0 ? hp0 - hit.reflect : charHp(bChars[target])
                let dmg = hit.bossDmg
                if (!dmg) {
                    const m = first.match(/ألحق\s+💥\s*([\d,]+)/)
                    dmg = m ? num(m[1]) : 0
                }
                if (!dmg && !dodged) dmg = Math.max(1, startHp - Math.max(0, charHp(tc) || 0))
                if (dodged) dmg = 0

                const dot = num((first.match(/يلحق بك ضرر إضافي\s+([\d,]+)/) || [])[1])

                bossOut = {
                    ci: target,
                    dodged,
                    died: !!died,
                    out: !!out,
                    dmg,
                    dot,
                    ab,
                    crit: /💢 ضربة حرجة من/.test(first),
                    hpAfter: Math.max(0, charHp(tc) || 0)
                }
            }

            const res = {
                ok: true,
                cdMs: ATTACK_COOLDOWN,
                hit: {
                    dmg: hit.dmg,
                    crit: hit.crit,
                    tags: hit.tags,
                    best: hit.best,
                    absorbed: hit.absorbed,
                    reflect: hit.reflect,
                    heal: hit.heal,
                    beast: hit.beast,
                    beastImg: hit.beast ? beastImgUrl(hit.beast) : '',
                    reflectKill
                },
                boss: bossOut,
                bossDead: killed,
                chars: aChars.map((c, i) => charView(c, i, null)),
                raid: {
                    hp: killed ? 0 : Math.max(0, Number(raidAfter && raidAfter.hp) || 0),
                    total: Number(raidAfter && raidAfter.totalDamage) || 0
                }
            }

            if (killed) {
                const rows = await nameRows(parseRewards(msgs.slice(1)))
                const end = {
                    ts: Date.now(),
                    win: true,
                    kingdom: clean(raidBefore.kingdom),
                    boss: clean(raidBefore.bossName),
                    rows: rows.map(r => ({
                        id: r.id, name: r.name, dmg: r.dmg, money: r.money,
                        character: r.character, chance: r.chance, high: r.high
                    }))
                }
                lastEnd = end
                res.end = end

                // رسائل النهاية (تحرير المملكة + الجوائز) تنرسل لقروبات الرايد مثل ما تنرسل من .غزو_رايد
                await forward(sent.slice(1))
            }

            // ⏱️ للتشخيص فقط: فعّل RAID_TIMING=1 بمتغيرات البيئة لطباعة زمن الهجوم بالخادم
            if (process.env.RAID_TIMING) console.log('[raid-attack] ' + (Date.now() - T0) + 'ms total (بدون انتظار الطابور)')

            return res
        })
    }

    async function forward(contents) {
        try {
            const sock = typeof getSock === 'function' ? getSock() : null
            const groups = raidManager.RAID_GROUPS || []
            if (!sock || !groups.length) return
            for (const jid of groups) {
                for (const c of contents) {
                    try { await sock.sendMessage(jid, c) } catch (e) { /* قروب واحد فاشل ما يوقف البقية */ }
                }
            }
        } catch (e) {
            console.error('raid site forward error:', e.message)
        }
    }

    return { getState, attack, ATTACK_COOLDOWN }
}

module.exports = { createRaidSite }
