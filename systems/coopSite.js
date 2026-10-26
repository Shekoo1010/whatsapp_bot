// =====================================================================
// systems/coopSite.js
// صفحة الكو اوب + المتجر بالموقع. تُسجَّل من characterSite.js عبر:
//   registerCoopSite(app, ctx)
// الراوتات:
//   GET  /u/:code/coop            الصفحة
//   GET  /coop/state              حالة الكو اوب (استطلاع)
//   POST /coop/join               انضمام
//   POST /coop/ready              استعداد (يظهر عند 8 لاعبين)
//   POST /coop/attack             هجوم (دورك فقط)
//   GET  /coop/shop               حالة المتجر
//   POST /coop/shop/buy           شراء {id, character?}
// =====================================================================

const CoOp = require('../models/CoOp')
const coopManager = require('./coopManager')
const coopBattle = require('./coopBattle')
const COOP_CSS = require('./coopSiteCss')
const COOP_CLIENT = require('./coopSiteClient')

function registerCoopSite(app, ctx) {

    const {
        Player, auth, jsonBody, esc, securityHeaders, html404, CODE_RE,
        ownerSession, bossSession, safeImageUrl, shell, shop
    } = ctx

    const hits = new Map()
    function rate(userId, max = 40) {
        const now = Date.now()
        const arr = (hits.get(userId) || []).filter(t => now - t < 60000)
        if (arr.length >= max) { hits.set(userId, arr); return false }
        arr.push(now); hits.set(userId, arr); return true
    }

    const cleanLog = t => String(t || '').replace(/[*_~`]/g, '').replace(/[╭╰━┃⬣〔〕]/g, '').trim()

    // ───────────── حالة آمنة للمتصفح ─────────────
    async function stateOut(userId) {
        const coop = await CoOp.findOne()
        const me = await Player.findOne({ userId }).select('coopCoins').lean()
        const base = { coins: (me && me.coopCoins) || 0, readyMin: coopManager.CONFIG.readyMin }

        if (!coop || !coop.active) {
            const last = coopBattle.getLastResult()
            return {
                ...base, phase: 'idle',
                nextSpawnIn: coop && coop.nextSpawn ? Math.max(0, coop.nextSpawn - Date.now()) : null,
                result: last && Date.now() - last.at < 30 * 60 * 1000 ? {
                    victory: last.victory,
                    boss: { name: last.boss.name, anime: last.boss.anime, rank: last.boss.rank, image: safeImageUrl(last.boss.image) },
                    rows: (last.rows || []).map(r => ({
                        rank: r.rank, name: r.name, damage: r.damage, mine: r.userId === userId, rewards: r.rewards
                    }))
                } : null
            }
        }

        const max = coopManager.CONFIG.maxPlayers[coop.boss.rank] || 15
        const alive = coop.players.filter(p => !p.finished)
        const turnP = coop.status === 'battle' ? alive[coop.currentTurn] : null
        const mine = coop.players.find(p => p.userId === userId)
        const ready = new Set(coop.ready || [])

        return {
            ...base,
            phase: coop.status === 'battle' ? 'battle' : 'waiting',
            round: coop.round,
            max,
            turnEndsIn: coop.status === 'battle' ? Math.max(0, (coop.turnEnd || 0) - Date.now()) : null,
            startsIn: coop.startAt ? Math.max(0, coop.startAt - Date.now()) : null,
            boss: {
                name: coop.boss.name, anime: coop.boss.anime, rank: coop.boss.rank,
                image: safeImageUrl(coop.boss.image),
                hp: coop.boss.hp, maxHp: coop.boss.maxHp, shield: coop.boss.shield || 0,
                phase: coop.boss.phase || 1, rage: !!coop.boss.rage
            },
            players: coop.players.map(p => ({
                id: p.userId === userId ? 'me' : undefined,
                name: p.name, damage: p.totalDamage, finished: !!p.finished,
                ready: ready.has(p.userId), turn: !!turnP && turnP.userId === p.userId,
                cur: p.currentCharacter,
                chars: p.userId === userId || coop.status === 'battle' ? p.characters.map(c => ({
                    name: c.name, power: c.power, hp: c.hp, maxHp: c.maxHp, alive: !!c.alive, img: safeImageUrl(c.image)
                })) : []
            })),
            order: alive.map(p => p.name),
            me: mine ? { joined: true, ready: ready.has(userId), myTurn: !!turnP && turnP.userId === userId } : { joined: false, ready: false, myTurn: false },
            canReady: coop.status === 'waiting' && coop.players.length >= coopManager.CONFIG.readyMin,
            readyCount: ready.size,
            leaderboard: (coop.leaderboard || []).slice(0, 10).map(r => ({ name: r.name, damage: r.damage })),
            log: (coop.battleLog || []).slice(-25).map(cleanLog)
        }
    }

    // ───────────── الصفحة ─────────────
    app.get('/u/:code/coop', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)
            const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion').lean()
            if (!player) return html404(res)
            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)
            res.send(coopPageHTML({
                shell, code,
                viewer: { name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) },
                data: { state: await stateOut(player.userId), shop: await shop.getShop(player.userId) }
            }))
        } catch (err) {
            console.error('coop page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    const guard = fn => async (req, res) => {
        res.set('Cache-Control', 'no-store')
        const fail = (status, code, message) => res.status(status).json({ ok: false, code, message })
        try {
            if (!auth.authEnabled()) return fail(503, 'DISABLED', 'غير مفعّل حالياً.')
            const sess = await bossSession(req)
            if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
            if (req.method === 'POST') {
                if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')
                if (!auth.verifyCsrf(sess, (req.body || {}).csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها.')
            }
            if (!rate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر قليلاً.')
            await fn(req, res, sess, fail)
        } catch (err) {
            console.error('coop route error:', err)
            fail(500, 'SERVER', 'خطأ بالخادم')
        }
    }

    app.get('/coop/state', guard(async (req, res, sess) => {
        res.json({ ok: true, state: await stateOut(sess.u) })
    }))

    app.post('/coop/join', jsonBody, guard(async (req, res, sess, fail) => {
        const p = await Player.findOne({ userId: sess.u }).select('name username').lean()
        const r = await coopManager.joinPlayer(sess.u, (p && (p.name || p.username)) || 'لاعب')
        if (!r.success) return fail(400, 'JOIN', r.message || 'تعذر الانضمام')
        res.json({ ok: true, state: await stateOut(sess.u) })
    }))

    app.post('/coop/ready', jsonBody, guard(async (req, res, sess, fail) => {
        const r = await coopManager.setReady(sess.u)
        if (!r.success) return fail(400, 'READY', r.message || 'تعذر الاستعداد')
        res.json({ ok: true, state: await stateOut(sess.u) })
    }))

    app.post('/coop/attack', jsonBody, guard(async (req, res, sess, fail) => {
        const r = await coopBattle.playerAttack(coopManager.getSock(), sess.u)
        if (!r || !r.success) return fail(400, 'ATTACK', (r && r.message) || 'تعذر الهجوم')
        res.json({ ok: true, hit: { damage: r.damage, critical: !!r.critical }, state: await stateOut(sess.u) })
    }))

    app.get('/coop/shop', guard(async (req, res, sess) => {
        res.json({ ok: true, shop: await shop.getShop(sess.u), targets: await shop.getShardTargets(sess.u) })
    }))

    app.post('/coop/shop/buy', jsonBody, guard(async (req, res, sess, fail) => {
        const b = req.body || {}
        const r = await shop.buy(sess.u, String(b.id || ''), { character: typeof b.character === 'string' ? b.character.slice(0, 80) : '' })
        if (!r.ok) return fail(400, r.code, r.message)
        res.json({ ok: true, item: r.item, shop: r.shop })
    }))
}

function coopPageHTML({ shell, viewer, code, data }) {
    const js = COOP_CLIENT
        .replace('__CODE__', () => shell.jsonForScript(code))
        .replace('__CSRF__', () => shell.jsonForScript(viewer.csrf))
        .replace('__DATA__', () => shell.jsonForScript(data))
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
${shell.head}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>الكو اوب</title>
<meta name="theme-color" content="#0a0d16">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;800&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet">
<style>${COOP_CSS}</style>
</head>
<body>
<div class="wrap">
  <div class="topbar">${shell.navBtn}<span class="ttl">CO-OP RAID</span></div>
  ${shell.navDrawer(code, viewer.csrf, 'coop', viewer.name)}
  <div class="tabs"><button type="button" id="tr" class="on">⚔ الريد</button><button type="button" id="ts">🪙 المتجر</button></div>
  <div class="msg" id="msg"></div>
  <section id="view"></section>
  <section id="shop" hidden><div class="coins" id="coinsv"></div><div id="shopv"></div></section>
</div>
<script>${js}</script>
</body>
</html>`
}

module.exports = { registerCoopSite, coopPageHTML }
