// =====================================================================
// systems/bossPush.js
// 🔔 إشعارات الهاتف (Web Push) عند ظهور زعيم جديد
// - اللاعب يفعّل/يعطّل من زر الجرس بصفحة الزعيم (بجانب زر الصوت)
// - الاشتراكات تُحفظ بقاعدة البيانات (BossPushSub) مربوطة بـ userId
// - يتطلب: npm i web-push  +  موقع HTTPS
// - مفاتيح VAPID: من متغيرات البيئة VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
//   (أو تُولَّد تلقائياً وتُحفظ بـ data/vapid.json — على الاستضافات اللي تمسح الملفات استخدم المتغيرات)
// - VAPID_SUBJECT (اختياري): mailto:you@domain.com
// =====================================================================

const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')

let webpush = null
try { webpush = require('web-push') } catch (e) {
    console.log('⚠️ حزمة web-push غير مثبتة — إشعارات الهاتف معطّلة. ثبّتها بـ: npm i web-push')
}

const MAX_SUBS_PER_USER = 5
const SEND_CHUNK = 50
const CODE_RE = /^[a-f0-9]{10}$/

const SW_SOURCE = `
self.addEventListener('install', function (e) { self.skipWaiting() })
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()) })
self.addEventListener('push', function (e) {
  var d = {}
  try { d = e.data ? e.data.json() : {} } catch (_) {}
  var opt = {
    body: d.body || '',
    tag: d.tag || 'boss-spawn',
    renotify: true,
    lang: 'ar',
    dir: 'rtl',
    data: { url: d.url || '/' }
  }
  if (d.icon) { opt.icon = d.icon; opt.badge = d.icon }
  e.waitUntil(self.registration.showNotification(d.title || 'ظهر زعيم جديد!', opt))
})
self.addEventListener('notificationclick', function (e) {
  e.notification.close()
  var url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.indexOf(url) !== -1 && 'focus' in list[i]) return list[i].focus()
    }
    return self.clients.openWindow(url)
  }))
})
`

// صورة الإشعار: https أو custom_images فقط (نفس قاعدة safeImageUrl بالموقع)
function iconUrl(img) {
    if (!img || typeof img !== 'string') return undefined
    if (/^https:\/\/[^\s'"()\\]+$/i.test(img)) return img
    if (/^\.?\/?custom_images\/[\w.\-]+$/i.test(img)) return '/custom_images/' + img.split('/').pop()
    return undefined
}

function loadVapid() {
    const envPub = process.env.VAPID_PUBLIC_KEY
    const envPriv = process.env.VAPID_PRIVATE_KEY
    if (envPub && envPriv) return { publicKey: envPub, privateKey: envPriv }
    const file = path.join(__dirname, '..', 'data', 'vapid.json')
    try {
        const j = JSON.parse(fs.readFileSync(file, 'utf8'))
        if (j && j.publicKey && j.privateKey) return j
    } catch (_) { /* لا يوجد ملف بعد */ }
    const k = webpush.generateVAPIDKeys()
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, JSON.stringify(k), { mode: 0o600 })
        console.log('🔑 تم توليد مفاتيح VAPID وحفظها بـ data/vapid.json')
    } catch (e) {
        console.error('bossPush: تعذّر حفظ مفاتيح VAPID (ستتغير عند كل إعادة تشغيل — استخدم متغيرات البيئة):', e.message)
    }
    return k
}

function createBossPush({ Player }) {
    const enabled = !!webpush
    let vapid = null
    if (enabled) {
        try {
            vapid = loadVapid()
            webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', vapid.publicKey, vapid.privateKey)
        } catch (e) {
            console.error('bossPush: إعداد VAPID فشل:', e)
            vapid = null
        }
    }
    const ready = enabled && !!vapid

    const Sub = mongoose.models.BossPushSub || mongoose.model('BossPushSub', new mongoose.Schema({
        userId: { type: String, index: true },
        endpoint: { type: String, unique: true },
        p256dh: String,
        auth: String,
        createdAt: { type: Date, default: Date.now }
    }))

    const hits = new Map()
    function rate(userId) {
        const now = Date.now()
        const arr = (hits.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 10) { hits.set(userId, arr); return false }
        arr.push(now); hits.set(userId, arr); return true
    }

    // يُستدعى من registerCharacterSite — يسجّل المسارات (sw.js / manifest / push/*)
    function mount(app, { express, auth }) {
        const jsonBody = express.json({ limit: '8kb' })

        app.get('/sw.js', (req, res) => {
            res.set({
                'Content-Type': 'application/javascript; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Service-Worker-Allowed': '/'
            })
            res.send(SW_SOURCE)
        })

        // مانيفست بسيط (مطلوب للآيفون ليعمل الإشعار بعد «إضافة للشاشة الرئيسية»)
        app.get('/manifest.webmanifest', (req, res) => {
            const c = String(req.query.c || '')
            const start = CODE_RE.test(c) ? `/u/${c}/boss` : '/'
            res.set({ 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-cache' })
            res.send(JSON.stringify({
                name: 'هجوم الزعيم', short_name: 'الزعيم', lang: 'ar', dir: 'rtl',
                start_url: start, scope: '/', display: 'standalone',
                background_color: '#0b0710', theme_color: '#0b0710'
            }))
        })

        app.get('/push/key', (req, res) => {
            res.set('Cache-Control', 'no-store')
            if (!ready || !auth.authEnabled()) return res.json({ ok: false })
            res.json({ ok: true, key: vapid.publicKey })
        })

        // جلسة + حماية: نفس الأصل + CSRF + نسخة الجلسة
        async function guard(req, res, body) {
            res.set('Cache-Control', 'no-store')
            const fail = (st, message) => { res.status(st).json({ ok: false, message }); return null }
            if (!ready || !auth.authEnabled()) return fail(503, 'الإشعارات غير مفعّلة حالياً.')
            if (!auth.sameOrigin(req)) return fail(403, 'طلب غير مسموح.')
            const sess = auth.readSession(req)
            if (!sess) return fail(401, 'انتهت الجلسة — سجّل الدخول من جديد.')
            if (!auth.verifyCsrf(sess, body.csrf)) return fail(403, 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
            if (!rate(sess.u)) return fail(429, 'طلبات كثيرة، انتظر دقيقة.')
            const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
            if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'انتهت الجلسة — سجّل الدخول من جديد.')
            return sess
        }

        app.post('/push/state', jsonBody, async (req, res) => {
            try {
                const b = req.body || {}
                const sess = await guard(req, res, b)
                if (!sess) return
                const ep = String(b.endpoint || '').slice(0, 1000)
                const row = ep ? await Sub.findOne({ endpoint: ep, userId: sess.u }).select('_id').lean() : null
                res.json({ ok: true, on: !!row })
            } catch (err) {
                console.error('push state error:', err)
                res.status(500).json({ ok: false, message: 'خطأ بالخادم' })
            }
        })

        app.post('/push/subscribe', jsonBody, async (req, res) => {
            try {
                const b = req.body || {}
                const sess = await guard(req, res, b)
                if (!sess) return
                const s = b.sub || {}
                const endpoint = typeof s.endpoint === 'string' ? s.endpoint : ''
                const p256dh = s.keys && typeof s.keys.p256dh === 'string' ? s.keys.p256dh : ''
                const authKey = s.keys && typeof s.keys.auth === 'string' ? s.keys.auth : ''
                if (!/^https:\/\//i.test(endpoint) || endpoint.length > 1000 || !p256dh || p256dh.length > 200 || !authKey || authKey.length > 100) {
                    return res.status(400).json({ ok: false, message: 'اشتراك غير صحيح.' })
                }
                await Sub.updateOne({ endpoint }, { $set: { userId: sess.u, p256dh, auth: authKey, createdAt: new Date() } }, { upsert: true })
                // حد أقصى لأجهزة اللاعب: نحذف الأقدم
                const mine = await Sub.find({ userId: sess.u }).sort({ createdAt: -1 }).select('_id').lean()
                if (mine.length > MAX_SUBS_PER_USER) {
                    await Sub.deleteMany({ _id: { $in: mine.slice(MAX_SUBS_PER_USER).map(x => x._id) } })
                }
                res.json({ ok: true })
            } catch (err) {
                console.error('push subscribe error:', err)
                res.status(500).json({ ok: false, message: 'خطأ بالخادم' })
            }
        })

        app.post('/push/unsubscribe', jsonBody, async (req, res) => {
            try {
                const b = req.body || {}
                const sess = await guard(req, res, b)
                if (!sess) return
                const ep = String(b.endpoint || '').slice(0, 1000)
                if (ep) await Sub.deleteOne({ endpoint: ep, userId: sess.u })
                res.json({ ok: true })
            } catch (err) {
                console.error('push unsubscribe error:', err)
                res.status(500).json({ ok: false, message: 'خطأ بالخادم' })
            }
        })
    }

    // 👑 يرسل إشعار ظهور الزعيم لكل المشتركين — لا يرمي أخطاء أبداً
    async function notifyBossSpawn(boss) {
        if (!ready || !boss) return { sent: 0, failed: 0 }
        let sent = 0, failed = 0
        try {
            const subs = await Sub.find({}).lean()
            if (!subs.length) return { sent, failed }

            const ids = [...new Set(subs.map(s => s.userId))]
            const players = await Player.find({ userId: { $in: ids } }).select('userId siteCode').lean()
            const codeBy = new Map(players.map(p => [p.userId, p.siteCode]))

            const name = String(boss.name || 'زعيم جديد').slice(0, 60)
            const icon = iconUrl(boss.image)
            const dead = []

            for (let i = 0; i < subs.length; i += SEND_CHUNK) {
                const chunk = subs.slice(i, i + SEND_CHUNK)
                const results = await Promise.allSettled(chunk.map(s => {
                    const code = codeBy.get(s.userId)
                    if (!code) { dead.push(s._id); return Promise.resolve('skip') }
                    const payload = JSON.stringify({
                        title: '👑 ظهر زعيم جديد!',
                        body: `«${name}» نزل الآن — ادخل واضرب قبل غيرك ⚔️`,
                        icon,
                        tag: 'boss-spawn',
                        url: `/u/${code}/boss`
                    })
                    return webpush.sendNotification(
                        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                        payload,
                        { TTL: 900, urgency: 'high', topic: 'bossspawn' }
                    )
                }))
                results.forEach((r, k) => {
                    if (r.status === 'fulfilled') { if (r.value !== 'skip') sent++ }
                    else {
                        failed++
                        const st = r.reason && r.reason.statusCode
                        if (st === 404 || st === 410) dead.push(chunk[k]._id)
                    }
                })
            }
            if (dead.length) await Sub.deleteMany({ _id: { $in: dead } })
            console.log(`🔔 إشعار الزعيم: أُرسل ${sent} · فشل ${failed}`)
        } catch (err) {
            console.error('bossPush notify error:', err)
        }
        return { sent, failed }
    }

    return { mount, notifyBossSpawn, enabled: ready }
}

module.exports = { createBossPush }
