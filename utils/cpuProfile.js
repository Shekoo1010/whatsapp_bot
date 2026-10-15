'use strict'

// 🔬 بروفايل CPU مؤقت (قراءة فقط): يعمل فقط إذا ضبطت CPU_PROFILE_SECONDS في Environment.
// يسجّل أين يقضي البوت وقت المعالج لمدة N ثانية ثم يطبع أعلى الدوال في Logs ويتوقف.
// لا يغيّر أي سلوك. احذف المتغير بعد أخذ النتيجة.

const inspector = require('inspector')

function shortName(cf) {
    const fn = cf.functionName || '(anonymous)'
    const url = String(cf.url || '')
        .replace(/^file:\/\//, '')
        .replace(/^.*\/node_modules\//, 'node_modules/')
        .replace(/^\/opt\/render\/project\/src\//, '')
    return url ? `${fn}  ${url}:${(cf.lineNumber || 0) + 1}` : fn
}

function run({ seconds = 30, top = 25 } = {}) {
    if (global.__cpuProfileRan) return
    global.__cpuProfileRan = true

    let session
    try {
        session = new inspector.Session()
        session.connect()
    } catch (e) {
        console.log('🔬 CPU PROFILE unavailable:', e?.message || e)
        return
    }

    const post = (method, params) => new Promise((resolve, reject) => {
        session.post(method, params || {}, (err, res) => (err ? reject(err) : resolve(res)))
    })

    ;(async () => {
        await post('Profiler.enable')
        await post('Profiler.setSamplingInterval', { interval: 2000 })
        await post('Profiler.start')
        console.log(`🔬 CPU PROFILE started for ${seconds}s (جرّب أوامر الآن)`)

        await new Promise(r => setTimeout(r, seconds * 1000))

        const { profile } = await post('Profiler.stop')
        try { session.disconnect() } catch (_) { /* لا شي */ }

        const nodes = new Map(profile.nodes.map(n => [n.id, n]))
        const self = new Map()
        let total = 0

        for (let i = 0; i < profile.samples.length; i++) {
            const node = nodes.get(profile.samples[i])
            if (!node) continue
            const ms = (profile.timeDeltas[i] || 0) / 1000
            const key = shortName(node.callFrame)
            self.set(key, (self.get(key) || 0) + ms)
            total += ms
        }

        const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)
        console.log(`🔬 CPU PROFILE result (${Math.round(total)}ms sampled) — الأعلى استهلاكاً:`)
        for (const [name, ms] of rows) {
            console.log(`🔬 ${Math.round(ms)}ms (${((ms / total) * 100).toFixed(1)}%)  ${name}`)
        }
    })().catch((e) => {
        console.log('🔬 CPU PROFILE failed:', e?.message || e)
        try { session.disconnect() } catch (_) { /* لا شي */ }
    })
}

module.exports = { run }
