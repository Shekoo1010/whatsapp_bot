// =====================================================================
// systems/siteAuth.js
// أدوات تسجيل الدخول لموقع الشخصيات (بدون أي مكتبة خارجية):
//  - تشفير كلمة المرور بـ crypto.scrypt + salt عشوائي
//  - جلسة بكوكي موقّعة بـ HMAC (بدون تخزين في الذاكرة)
//  - حماية CSRF
//  - حد محاولات تسجيل الدخول
// يتطلب متغير بيئة SESSION_SECRET (نص عشوائي طويل 32+ حرف).
// =====================================================================

const crypto = require('crypto')
const { promisify } = require('util')
const scrypt = promisify(crypto.scrypt)

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const COOKIE_SESSION = 'cs'
const COOKIE_VIEW = 'vo'
const MIN_PASSWORD = 6
const MAX_PASSWORD = 64

function secret() { return process.env.SESSION_SECRET || '' }
function authEnabled() { return secret().length >= 16 }

function b64u(buf) { return Buffer.from(buf).toString('base64url') }
function hmac(data) { return crypto.createHmac('sha256', secret()).update(data).digest('base64url') }
function safeEq(a, b) {
    const x = Buffer.from(String(a)), y = Buffer.from(String(b))
    return x.length === y.length && crypto.timingSafeEqual(x, y)
}

// ---------------------------------------------------------------
// كلمة المرور
// ---------------------------------------------------------------
function normalizePassword(pw) { return String(pw ?? '').normalize('NFKC') }

function validatePasswordFormat(pw) {
    const s = String(pw ?? '')
    if (s.length < MIN_PASSWORD) return `❌ كلمة المرور قصيرة — الحد الأدنى ${MIN_PASSWORD} خانات.`
    if (s.length > MAX_PASSWORD) return `❌ كلمة المرور طويلة — الحد الأقصى ${MAX_PASSWORD} خانة.`
    return null
}

async function derive(pw, saltHex) {
    return scrypt(normalizePassword(pw), Buffer.from(saltHex, 'hex'), 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
}

async function hashPassword(pw) {
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = (await derive(pw, salt)).toString('hex')
    return { hash, salt }
}

async function verifyPassword(pw, hashHex, saltHex) {
    if (!hashHex || !saltHex) return false
    try {
        const got = await derive(pw, saltHex)
        const want = Buffer.from(hashHex, 'hex')
        return got.length === want.length && crypto.timingSafeEqual(got, want)
    } catch (e) { return false }
}

// نفس الزمن تقريباً حتى لو اليوزر غير موجود (يمنع كشف وجود الحسابات بالتوقيت)
let _dummy = null
async function dummyVerify(pw) {
    if (!_dummy) _dummy = await hashPassword('dummy-password-for-timing')
    await verifyPassword(pw, _dummy.hash, _dummy.salt)
    return false
}

// ---------------------------------------------------------------
// الكوكيز
// ---------------------------------------------------------------
function parseCookies(req) {
    const out = {}
    const raw = req.headers.cookie
    if (!raw) return out
    for (const part of raw.split(';')) {
        const i = part.indexOf('=')
        if (i < 0) continue
        out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
    }
    return out
}

function isHttps() { return /^https:\/\//i.test(process.env.RENDER_EXTERNAL_URL || '') }

function cookieString(name, value, maxAgeSec) {
    return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${isHttps() ? '; Secure' : ''}`
}

function appendCookie(res, str) {
    const prev = res.getHeader('Set-Cookie')
    res.setHeader('Set-Cookie', prev ? [].concat(prev, str) : [str])
}

// ---------------------------------------------------------------
// الجلسة (موقّعة، بدون تخزين)
// ---------------------------------------------------------------
function createSessionToken(userId, version) {
    const payload = {
        u: userId,
        v: version || 0,
        n: crypto.randomBytes(12).toString('hex'),
        exp: Date.now() + SESSION_TTL_MS
    }
    const body = b64u(JSON.stringify(payload))
    return `${body}.${hmac('s|' + body)}`
}

function readSession(req) {
    if (!authEnabled()) return null
    const tok = parseCookies(req)[COOKIE_SESSION]
    if (!tok) return null
    const [body, sig] = tok.split('.')
    if (!body || !sig || !safeEq(sig, hmac('s|' + body))) return null
    try {
        const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
        if (!p || typeof p.u !== 'string' || !p.exp || p.exp < Date.now()) return null
        return p
    } catch (e) { return null }
}

function setSessionCookie(res, userId, version) {
    appendCookie(res, cookieString(COOKIE_SESSION, createSessionToken(userId, version), Math.floor(SESSION_TTL_MS / 1000)))
}
function clearSessionCookie(res) { appendCookie(res, cookieString(COOKIE_SESSION, '', 0)) }

function setViewOnlyCookie(res) { appendCookie(res, cookieString(COOKIE_VIEW, '1', 12 * 60 * 60)) }
function hasViewOnly(req) { return parseCookies(req)[COOKIE_VIEW] === '1' }
function clearViewOnlyCookie(res) { appendCookie(res, cookieString(COOKIE_VIEW, '', 0)) }

// ---------------------------------------------------------------
// CSRF
// ---------------------------------------------------------------
function csrfForSession(session) { return hmac('c|' + session.n) }
function verifyCsrf(session, token) { return !!session && !!token && safeEq(token, csrfForSession(session)) }

// قبل تسجيل الدخول: توكن موقّع بوقت (صالح ساعة)
function makeLoginCsrf() {
    const ts = String(Date.now())
    return `${ts}.${hmac('l|' + ts)}`
}
function verifyLoginCsrf(token) {
    const [ts, sig] = String(token || '').split('.')
    if (!ts || !sig || !safeEq(sig, hmac('l|' + ts))) return false
    const age = Date.now() - Number(ts)
    return age >= 0 && age < 60 * 60 * 1000
}

// حماية إضافية: لو وصل Origin يجب أن يطابق الـ Host
function sameOrigin(req) {
    const origin = req.headers.origin
    if (!origin) return true
    try { return new URL(origin).host === req.headers.host } catch (e) { return false }
}

// ---------------------------------------------------------------
// حد المحاولات (بالذاكرة — يتصفر مع إعادة التشغيل وهذا مقبول للحماية من التخمين)
// ---------------------------------------------------------------
function createLimiter({ max, windowMs, lockMs }) {
    const map = new Map()
    const timer = setInterval(() => {
        const now = Date.now()
        for (const [k, v] of map) if ((v.lockedUntil || 0) < now && now - v.first > windowMs) map.delete(k)
    }, 5 * 60 * 1000)
    if (timer.unref) timer.unref()

    return {
        check(key) {
            const v = map.get(key)
            if (v && v.lockedUntil && v.lockedUntil > Date.now()) {
                return { blocked: true, retryAfter: Math.ceil((v.lockedUntil - Date.now()) / 1000) }
            }
            return { blocked: false, retryAfter: 0 }
        },
        fail(key) {
            const now = Date.now()
            let v = map.get(key)
            if (!v || now - v.first > windowMs) v = { fails: 0, first: now, lockedUntil: 0 }
            v.fails++
            if (v.fails >= max) { v.lockedUntil = now + lockMs; v.fails = 0; v.first = now }
            map.set(key, v)
        },
        reset(key) { map.delete(key) }
    }
}

function clientIp(req) {
    const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    return xf || req.socket?.remoteAddress || 'unknown'
}

module.exports = {
    authEnabled, hashPassword, verifyPassword, dummyVerify, validatePasswordFormat,
    readSession, setSessionCookie, clearSessionCookie,
    setViewOnlyCookie, hasViewOnly, clearViewOnlyCookie,
    csrfForSession, verifyCsrf, makeLoginCsrf, verifyLoginCsrf, sameOrigin,
    createLimiter, clientIp, parseCookies, MIN_PASSWORD, MAX_PASSWORD
}
