// 🏆 ترتيب أقوى الشخصيات — حسب منطق الشخصية نفسه في محرك الدرافت (engine.js) وليس نتائج قتال:
// يقرأ قدرات كل شخصية (ضربات قاتلة، ضرر، تخدير، علاج، تقوية، تحصين) + المناعات والمقاومات ونقاط الضعف
// + الإحياء/عدم الموت/التكيّف، ويجمعها في درجة قوة من 100. تتغير الدرجة تلقائياً لو عدّلت بيانات الشخصية في engine.js.
// الاستخدام: const { loadRanking } = require('./draftArena/rank'); const list = await loadRanking()
'use strict'
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const ENGINE_PATH = path.join(__dirname, 'engine.js')

// ───────── أوزان التقييم (عدّلها هنا لو أردت تغيير فلسفة الترتيب) ─────────
const W = {
    killBase: 34, killPerCostSaved: 3, killErase: 6, killIgnoreGuard: 6, killExtra: .5, // ضربة قاتلة: كلما كانت أرخص طاقة أقوى
    atkPeak: .6, atkTop3: .4, atkEff: .5, atkErase: 2, atkIg: 2,                         // ضرر مباشر
    stun: 8, stunExtra: 3, heal: 8, buff: 6, guard: 5,                                   // مهارات مساندة
    imm: 14, res: 5, weak: -8, rev: 12, undying: 30, adapt: 60, coverage: 1.5              // دفاع وخصائص
}
const ERS = 'ers' // وسوم الهجمات التي تخترق التحصين (نفس قاعدة المحرك)

function loadChars(src) {
    const a = src.indexOf('const IDS=['), b = src.indexOf('/* ===== واجهة القتال')
    if (a < 0 || b < 0) throw new Error('rank: تعذّر تحديد بيانات الشخصيات في engine.js')
    const ctx = vm.createContext({ Math, console })
    vm.runInContext(`let LR=Math.random;${src.slice(a, b)};this.__CHR=CHR;this.__IDS=IDS`, ctx, { filename: 'engine-data.vm.js' })
    return { CHR: ctx.__CHR, IDS: ctx.__IDS }
}

function scoreChar(c) {
    const ab = c.ab || []
    // ⚔️ هجوم
    const kills = ab.filter(x => x.t === 'K').sort((x, y) => x.c - y.c)
    let atk = 0
    kills.forEach((k, i) => { atk += (W.killBase + (7 - Math.min(7, k.c)) * W.killPerCostSaved + (ERS.includes(k.tag) ? W.killErase : 0) + (k.ig ? W.killIgnoreGuard : 0)) * (i ? W.killExtra : 1) })
    const hits = ab.filter(x => x.t === 'A').sort((x, y) => y.v - x.v)
    if (hits.length) {
        const top3 = hits.slice(0, 3).reduce((s, x) => s + x.v, 0) / Math.min(3, hits.length)
        const eff = hits.map(x => x.v / (x.c + 2)).sort((x, y) => y - x).slice(0, 2).reduce((s, v) => s + v, 0) / 2
        atk += hits[0].v * W.atkPeak + top3 * W.atkTop3 + eff * W.atkEff
        hits.forEach(x => { if (ERS.includes(x.tag)) atk += W.atkErase; if (x.ig) atk += W.atkIg })
    }
    // ✨ مهارات مساندة
    let util = 0
    const stuns = ab.filter(x => x.t === 'S').length
    if (stuns) util += W.stun + (stuns - 1) * W.stunExtra
    if (ab.some(x => x.t === 'H')) util += W.heal * Math.min(1, Math.max(...ab.filter(x => x.t === 'H').map(x => x.v)) / 50)
    if (ab.some(x => x.t === 'B')) util += W.buff
    if (ab.some(x => x.t === 'G')) util += W.guard
    util += new Set(ab.filter(x => x.t === 'A' || x.t === 'K').map(x => x.tag)).size * W.coverage
    // 🛡️ دفاع وخصائص
    let def = (c.imm || '').length * W.imm + (c.res || '').length * W.res + (c.weak || '').length * W.weak
    if (c.rev) def += W.rev
    if (c.undying) def += W.undying
    if (c.adapt) def += (c.adapt === 1 ? .25 : c.adapt) * W.adapt
    return { atk, util, def: Math.max(0, def) }
}

function computeRanking(src = fs.readFileSync(ENGINE_PATH, 'utf8')) {
    const { CHR, IDS } = loadChars(src)
    const raw = IDS.map(id => ({ id, ...scoreChar(CHR[id]) }))
    raw.forEach(r => { r.total = r.atk + r.util + r.def })
    const mx = k => Math.max(...raw.map(r => r[k])) || 1
    const m = { total: mx('total'), atk: mx('atk'), util: mx('util'), def: mx('def') }
    const list = raw.map(r => ({
        id: r.id,
        score: +(r.total / m.total * 100).toFixed(1),   // الدرجة الكلية من 100 (الأقوى = 100)
        atk: Math.round(r.atk / m.atk * 100),           // هجوم
        def: Math.round(r.def / m.def * 100),           // دفاع
        util: Math.round(r.util / m.util * 100)         // مهارات
    }))
    list.sort((a, b) => b.score - a.score || b.atk - a.atk || a.id.localeCompare(b.id))
    list.forEach((r, i) => { r.rank = i + 1 })
    return list
}

let memo = null
function loadRanking() {
    if (!memo) { try { memo = computeRanking() } catch (e) { console.log('ranking error:', e.message); return Promise.resolve([]) } }
    return Promise.resolve(memo)
}

module.exports = { loadRanking, computeRanking }
if (require.main === module) computeRanking().forEach(r => console.log(r.rank, r.id.padEnd(10), r.score, `⚔️${r.atk} 🛡️${r.def} ✨${r.util}`))
