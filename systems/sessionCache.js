'use strict'
// ⚡ كاش قصير لفحص نسخة الجلسة (sessionVersion) — بدل رحلة قاعدة بيانات مع كل طلب API بالموقع.
// TTL قصير (15ث) + invalidate فوري عند تغيير كلمة المرور من نفس العملية.
const TTL_MS = 15000
const MAX = 5000
const cache = new Map() // userId -> { v, at }

async function get(Player, userId) {
    if (!userId) return null
    const hit = cache.get(userId)
    if (hit && Date.now() - hit.at < TTL_MS) return hit.v === null ? null : { sessionVersion: hit.v }
    const me = await Player.findOne({ userId }).select('sessionVersion').lean()
    cache.delete(userId)
    cache.set(userId, { v: me ? (me.sessionVersion || 0) : null, at: Date.now() })
    if (cache.size > MAX) cache.delete(cache.keys().next().value)
    return me
}

function invalidate(userId) { if (userId) cache.delete(userId); else cache.clear() }

module.exports = { get, invalidate }
