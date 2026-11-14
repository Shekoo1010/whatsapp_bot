'use strict'
// 🐢 slowTrace — يكتشف "مين" يجمّد البوت (قياس فقط، لا يغيّر أي منطق)
//
// الفكرة: كل 30ث نقيس تأخر حلقة الأحداث. لو p99 > 150ms (أو max > 1000ms) نشغّل
// مقياس CPU خفيف (Sampling Profiler) لمدة 15ث ثم نطبع في Logs ملخصاً:
//   🐢 SLOW-TRACE ... busy=..% gc=..% | الملفات الأثقل | الدوال الأثقل | الأوامر اللي مرّت وقتها
// بعدها استراحة 2 دقيقة، فالتكلفة قليلة جداً.
//
// تعطيله بالكامل: SLOW_TRACE=0  (متغير بيئة)
// ضبط: SLOW_P99_MS (افتراضي 150) • SLOW_MAX_MS (1000) • SLOW_PROFILE_MS (15000) • SLOW_COOLDOWN_MS (120000)

const path = require('path')

const P99_LIMIT = Number(process.env.SLOW_P99_MS || 150)
const MAX_LIMIT = Number(process.env.SLOW_MAX_MS || 1000)
const PROFILE_MS = Number(process.env.SLOW_PROFILE_MS || 15000)
const COOLDOWN_MS = Number(process.env.SLOW_COOLDOWN_MS || 120000)

const fs = require('fs')
// 🧯 قراءة تقييد المعالج من cgroup (لو متاح بالحاوية): كم مرة وكم مدة أوقفه النظام بسبب سقف الـCPU
function readThrottle() {
    try {
        for (const f of ['/sys/fs/cgroup/cpu.stat', '/sys/fs/cgroup/cpu/cpu.stat']) {
            if (!fs.existsSync(f)) continue
            const o = {}
            for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
                const [k, v] = line.trim().split(/\s+/)
                if (k && v !== undefined) o[k] = Number(v)
            }
            const n = o.nr_throttled
            const ms = o.throttled_usec !== undefined ? o.throttled_usec / 1000 : (o.throttled_time !== undefined ? o.throttled_time / 1e6 : null)
            if (n !== undefined) return { n, ms, periods: o.nr_periods }
        }
    } catch (_) { /* اختياري */ }
    return null
}

let started = false
let profiling = false
let lastRunAt = 0
let session = null
const cmds = []          // [{ t, c }] أوامر الواتس الأخيرة (أول كلمة فقط)

// ───────── تسجيل الأوامر (نحفظ فقط أول كلمة من الأمر، بدون أي محتوى آخر) ─────────
function note(m) {
    try {
        const msg = m && m.message
        if (!msg) return
        const text = msg.conversation || (msg.extendedTextMessage && msg.extendedTextMessage.text) ||
            (msg.imageMessage && msg.imageMessage.caption) || (msg.videoMessage && msg.videoMessage.caption) || ''
        const t = String(text).trim()
        if (!t || t[0] !== '.') return
        const word = t.split(/\s+/)[0].slice(0, 24)
        const now = Date.now()
        cmds.push({ t: now, c: word })
        while (cmds.length && now - cmds[0].t > 60000) cmds.shift()   // نحتفظ بآخر دقيقة فقط
        if (cmds.length > 200) cmds.splice(0, cmds.length - 200)
    } catch (_) { /* قياس فقط */ }
}

// ───────── تحويل مسار الملف إلى اسم قصير مفهوم ─────────
function shortFile(url) {
    if (!url) return '(native)'
    let u = String(url).replace(/^file:\/\//, '')
    const nm = u.lastIndexOf('node_modules/')
    if (nm >= 0) {
        const rest = u.slice(nm + 13).split('/')
        return 'pkg:' + (rest[0].startsWith('@') ? rest[0] + '/' + rest[1] : rest[0])
    }
    if (u.startsWith('node:')) return u
    const base = path.basename(path.dirname(u)) + '/' + path.basename(u)
    return base
}

function summarize(profile, fromTs, toTs) {
    const nodes = new Map()
    for (const n of profile.nodes) nodes.set(n.id, n)
    const samples = profile.samples || []
    const deltas = profile.timeDeltas || []
    const byFn = new Map(), byFile = new Map(), byNode = new Map()
    const parent = new Map()
    for (const n of profile.nodes) for (const c of (n.children || [])) parent.set(c, n.id)
    let total = 0, idle = 0, gc = 0, program = 0
    for (let i = 0; i < samples.length; i++) {
        const dt = deltas[i] || 0
        total += dt
        const n = nodes.get(samples[i])
        if (!n) continue
        byNode.set(n.id, (byNode.get(n.id) || 0) + dt)
        const cf = n.callFrame || {}
        const name = cf.functionName || '(anonymous)'
        if (name === '(idle)') { idle += dt; continue }
        if (name === '(garbage collector)') gc += dt
        if (name === '(program)') program += dt
        const file = shortFile(cf.url)
        const fnKey = `${name} ${file}:${(cf.lineNumber | 0) + 1}`
        byFn.set(fnKey, (byFn.get(fnKey) || 0) + dt)
        byFile.set(file, (byFile.get(file) || 0) + dt)
    }
    const busy = total - idle
    const pct = x => (total ? Math.round(x / total * 100) : 0)
    const top = (map, k) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, k)
        .map(([key, v]) => `${key} ${Math.round(v / 1000)}ms`)
    // الأوامر اللي مرّت بنافذة القياس
    const cnt = new Map()
    for (const x of cmds) if (x.t >= fromTs && x.t <= toTs) cnt.set(x.c, (cnt.get(x.c) || 0) + 1)
    const cmdTxt = [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => `${c}×${n}`).join(' ') || 'لا أوامر'
    // 🧵 مسار الاستدعاء (من استدعى الدالة الثقيلة) لأثقل 3 عقد — يكشف مين يستدعي الأشياء الـnative
    const label = n => {
        const cf = n.callFrame || {}
        return `${cf.functionName || '(anonymous)'} ${shortFile(cf.url)}:${(cf.lineNumber | 0) + 1}`
    }
    const skipName = new Set(['(idle)', '(program)', '(garbage collector)', '(root)'])
    const paths = [...byNode.entries()]
        .filter(([id]) => !skipName.has((nodes.get(id).callFrame || {}).functionName))
        .sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([id, dt]) => {
            const chain = []
            let cur = id
            for (let k = 0; k < 5 && cur !== undefined; k++) {
                const nd = nodes.get(cur)
                if (!nd) break
                if ((nd.callFrame || {}).functionName !== '(root)') chain.push(label(nd))
                cur = parent.get(cur)
            }
            return `${Math.round(dt / 1000)}ms: ${chain.join(' ← ')}`
        })
    return {
        busyPct: pct(busy), gcPct: pct(gc), programPct: pct(program),
        files: top(byFile, 5), funcs: top(byFn, 8), paths, cmdTxt
    }
}

function runProfile(reason) {
    if (profiling) return
    profiling = true
    lastRunAt = Date.now()
    const fromTs = Date.now()
    const th0 = readThrottle()
    try {
        const inspector = require('inspector')
        session = new inspector.Session()
        session.connect()
        const post = (m, p) => new Promise((res, rej) => session.post(m, p || {}, (e, r) => e ? rej(e) : res(r)))
        post('Profiler.enable')
            .then(() => post('Profiler.setSamplingInterval', { interval: 5000 }))
            .then(() => post('Profiler.start'))
            .then(() => new Promise(r => setTimeout(r, PROFILE_MS).unref()))
            .then(() => post('Profiler.stop'))
            .then(({ profile }) => {
                const s = summarize(profile, fromTs, Date.now())
                console.log(`🐢 SLOW-TRACE (${Math.round(PROFILE_MS / 1000)}s | ${reason}) busy=${s.busyPct}% gc=${s.gcPct}% native=${s.programPct}%`)
                console.log(`   📁 ملفات: ${s.files.join(' | ')}`)
                console.log(`   🔧 دوال: ${s.funcs.join(' | ')}`)
                for (const p of s.paths) console.log(`   🧵 ${p}`)
                const th1 = readThrottle()
                if (th0 && th1) {
                    const dn = th1.n - th0.n, dp = th1.periods - th0.periods
                    console.log(`   🧯 تقييد المعالج بالنافذة: ${dn} مرة من ${dp} فترة` + (th1.ms !== null ? ` (${Math.round(th1.ms - th0.ms)}ms متوقف)` : ''))
                } else {
                    console.log('   🧯 تقييد المعالج: غير متاح بهذي الحاوية')
                }
                console.log(`   💬 أوامر وقتها: ${s.cmdTxt}`)
            })
            .catch(e => console.log('slowTrace profile error:', e && e.message))
            .finally(() => {
                try { session.post('Profiler.disable'); session.disconnect() } catch (_) {}
                session = null
                profiling = false
            })
    } catch (e) {
        console.log('slowTrace start error:', e && e.message)
        profiling = false
    }
}

function start() {
    if (started || process.env.SLOW_TRACE === '0') return
    started = true
    try {
        const { monitorEventLoopDelay } = require('perf_hooks')
        const h = monitorEventLoopDelay({ resolution: 20 })
        h.enable()
        setInterval(() => {
            const p99 = h.percentile(99) / 1e6, mx = h.max / 1e6
            h.reset()
            if (profiling) return
            if ((p99 > P99_LIMIT || mx > MAX_LIMIT) && Date.now() - lastRunAt > COOLDOWN_MS) {
                runProfile(`p99=${p99.toFixed(0)}ms max=${mx.toFixed(0)}ms`)
            }
        }, 30000).unref()
        console.log('🐢 slowTrace جاهز (SLOW_TRACE=0 لتعطيله)')
    } catch (e) { console.log('slowTrace init error:', e && e.message) }
}

module.exports = { start, note, _runProfile: runProfile, _summarize: summarize }
