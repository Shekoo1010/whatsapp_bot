// =====================================================================
// systems/siteTower.js
// 🗼 برج الأبطال من الموقع — /u/:code/tower  +  POST /tower/climb
// نفس منطق أمر .طابق بالبوت حرفياً (نفس towerFloors و getTowerReward و createTowerReward):
//   • الطوابق بالترتيب، كل شخصية تُستعمل مرة وحدة (بالاسم)
//   • +5% هجوم لكل طابق حتى الطابق 30
//   • توقف عند أول فشل، والطوابق اللي نجحت تبقى محفوظة
//   • حد أقصى 10 شخصيات بالمحاولة الواحدة
// رقم الشخصية = ترتيبها داخل player.characters (نفس رقم .طابق N بالواتس)
// الصفحة: systems/towerPage.html
// =====================================================================

const fs = require('fs')
const path = require('path')

const MAX_BATCH = 10
const TPL = fs.readFileSync(path.join(__dirname, 'towerPage.html'), 'utf8')

function jsonForScript(o) {
    return JSON.stringify(o)
        .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

module.exports = function createSiteTower(deps) {
    const { Player, towerFloors, getTowerReward, createTowerReward, checkAndGrantAchievement, getSock, addCommandXp } = deps

    // 🔒 نفس قفل .طابق بالبوت (index.js يستعمل global.__towerLocks) — ما تتعارض عملية موقع مع عملية واتس
    const locks = global.__towerLocks || (global.__towerLocks = new Set())

    const hits = new Map()
    function rate(u) {
        const now = Date.now()
        const arr = (hits.get(u) || []).filter(t => now - t < 60000)
        if (arr.length >= 20) { hits.set(u, arr); return false }
        arr.push(now); hits.set(u, arr)
        if (hits.size > 5000) hits.clear()
        return true
    }

    const stateOf = p => ({
        floor: Number(p.towerFloor) || 1,
        atk: Number(p.attackBonus) || 0,
        tickets: Number(p.towerTickets) || 0,
        completed: !!p.towerCompleted,
        used: Array.isArray(p.usedCharacters) ? p.usedCharacters.map(String) : []
    })

    // ⚔️ طابق واحد — نفس runTowerFloor بالبوت
    async function runFloor(player, charIdx) {
        const floorNumber = player.towerFloor

        if (isNaN(floorNumber) || isNaN(charIdx)) return { error: '❌ يجب إدخال أرقام صحيحة' }

        const floor = towerFloors.find(f => f.floor === floorNumber)
        if (!floor) return { error: '❌ هذا الطابق غير موجود' }

        const character = player.characters?.[charIdx]
        if (!character) return { error: '❌ الشخصية غير موجودة' }

        if (player.usedCharacters?.includes(character.name)) {
            return { error: '❌ هذه الشخصية استعملتها سابقاً في البرج' }
        }

        const finalPower = Math.floor(character.power * (1 + (player.attackBonus || 0) / 100))

        if (finalPower < floor.power) {
            return { fail: { f: floor.floor, n: String(character.name), p: finalPower, need: floor.power } }
        }

        if (!player.usedCharacters) player.usedCharacters = []
        player.usedCharacters.push(character.name)

        const reward = getTowerReward(floor.floor) || {}
        let rewardCharacter = null

        if (floor.floor === 60) {
            rewardCharacter = await createTowerReward()
            player.characters.push(rewardCharacter)
        }

        player.towerFloor++
        player.towerTotalFloors = (player.towerTotalFloors || 0) + 1 // 🗼 عدّاد تراكمي للإنجاز (ما يتصفّر مع ريست البرج الأسبوعي)

        if (reward.money) await player.addMoney(reward.money)

        // ⭐ الخبرة تُضاف فعلياً (نفس addCommandXp بالبوت) والرقم المعروض = المضاف فعلاً بعد بونص الكلب/الكتاب
        if (reward.xp) reward.xp = typeof addCommandXp === 'function' ? addCommandXp(player, reward.xp) : 0

        if (reward.draws) player.towerTickets = (player.towerTickets || 0) + reward.draws

        if (reward.box) {
            if (!player.boxes) player.boxes = {}
            player.boxes[reward.box] = (player.boxes[reward.box] || 0) + 1
        }

        if (floor.floor <= 30) player.attackBonus = (player.attackBonus || 0) + 5

        if (floor.floor === 60) {
            player.towerCompleted = true
            if (!player.titles) player.titles = []
            if (!player.titles.includes('⚜️ سيد العروش')) player.titles.push('⚜️ سيد العروش')
            player.attackBonus += 10
            player.maxCharacters += 5
        }

        await player.save()

        return {
            ok: {
                f: floor.floor,
                rn: String(character.name),
                n: String(character.name),
                p: finalPower,
                need: floor.power,
                r: {
                    money: reward.money || 0,
                    xp: reward.xp || 0,
                    draws: reward.draws || 0,
                    box: reward.box || null
                },
                rc: rewardCharacter
            }
        }
    }

    async function climb(userId, nums) {
        if (locks.has(userId)) return { ok: false, code: 'BUSY', message: '⏳ انتظر حتى تنتهي عملية الطابق السابقة.' }
        locks.add(userId)
        const timer = setTimeout(() => locks.delete(userId), 30000)

        try {
            const player = await Player.findOne({ userId })
            if (!player) return { ok: false, code: 'NOPLAYER', message: '❌ لا تملك حساباً' }
            if (player.towerCompleted) return { ok: false, code: 'DONE', message: '👑 لقد أكملت البرج بالفعل' }

            const done = []
            let fail = null
            let stop = null

            for (const no of nums) {
                if (player.towerCompleted) { stop = '👑 لقد أكملت البرج بالفعل'; break }

                const r = await runFloor(player, no - 1)

                if (r.error) { stop = r.error; break }
                if (r.fail) {
                    fail = r.fail
                    stop = `❌ فشل الطابق ${r.fail.f}\n⚔️ قوة الشخصية: ${r.fail.p}\n🏰 المطلوب: ${r.fail.need}`
                    break
                }
                done.push(r.ok)
            }

            if (done.length) {
                try {
                    const sock = typeof getSock === 'function' ? getSock() : null
                    await checkAndGrantAchievement(player, 'tower', player.towerTotalFloors || 0, sock, player.userId)
                } catch (e) { console.error('site tower achievement error:', e?.message || e) }
            }

            return { ok: true, done, fail, stop, st: stateOf(player) }
        } catch (err) {
            console.error('site tower climb error:', err)
            return { ok: false, code: 'SERVER', message: 'خطأ بالخادم' }
        } finally {
            clearTimeout(timer)
            locks.delete(userId)
        }
    }

    function mount(app, h) {
        const { auth, jsonBody, securityHeaders, CODE_RE, html404, ownerSession, esc, navDrawerHTML, NAV_BTN, shellHead, charView } = h

        app.get('/u/:code/tower', async (req, res) => {
            try {
                securityHeaders(res)
                const code = String(req.params.code || '')
                if (!CODE_RE.test(code)) return html404(res)

                const player = await Player.findOne({ siteCode: code })
                    .select('userId name username sessionVersion characters usedCharacters towerFloor towerCompleted towerTickets attackBonus')
                    .lean()
                if (!player) return html404(res)

                const sess = ownerSession(req, player)
                if (!sess) return res.redirect(303, `/login?code=${code}`)

                const csrf = auth.csrfForSession(sess)
                const chars = (player.characters || []).map((c, i) => {
                    const v = charView(c, req)
                    return { no: i + 1, rn: String(c.name || ''), n: v.n, p: Number(c.power) || 0, i: v.i || null, c: v.c, r: v.r }
                })

                const data = {
                    code, csrf,
                    floors: towerFloors.map(f => ({ f: f.floor, p: f.power, i: f.image })),
                    st: stateOf(player),
                    chars
                }

                const top = `<div class="topbar">
    <span class="tb-l">${NAV_BTN}<span class="gmode">🗼 برج الأبطال</span></span>
    <a class="pill" href="/u/${esc(code)}">← رجوع للعرض</a>
  </div>
  ${navDrawerHTML(code, csrf, 'tower', player.name || player.username || '')}`

                res.send(`${shellHead('برج الأبطال')}\n<body>` +
                    TPL.replace('{{TOP}}', () => top).replace('{{DATA}}', () => jsonForScript(data)) +
                    `</body></html>`)
            } catch (err) {
                console.error('tower page error:', err)
                res.status(500).send('خطأ بالخادم')
            }
        })

        app.post('/tower/climb', jsonBody, async (req, res) => {
            res.set('Cache-Control', 'no-store')
            const fail = (status, code, message) => res.status(status).json({ ok: false, code, message })
            try {
                if (!auth.authEnabled()) return fail(503, 'DISABLED', 'البرج من الموقع غير مفعّل حالياً.')
                if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')

                const sess = auth.readSession(req)
                if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

                const b = req.body || {}
                if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
                if (!rate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')

                const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
                if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

                const nums = Array.isArray(b.nums) ? b.nums.map(Number) : []
                if (!nums.length) return fail(400, 'BAD', '❌ اختر شخصية واحدة على الأقل.')
                if (nums.length > MAX_BATCH) return fail(400, 'BAD', `❌ الحد الأقصى ${MAX_BATCH} شخصيات في المرة الواحدة`)
                if (nums.some(n => !Number.isInteger(n) || n < 1 || n > 100000)) return fail(400, 'BAD', '❌ يجب إدخال أرقام صحيحة')

                const r = await climb(sess.u, nums)
                if (!r.ok) return fail(r.code === 'SERVER' ? 500 : r.code === 'BUSY' ? 429 : 400, r.code, r.message)
                // 🌟 شخصية الطابق 60: نرسلها بالصورة والقدرات (حقول آمنة فقط)
                for (const d of r.done) {
                    if (!d.rc) continue
                    const v = charView(d.rc, req)
                    d.rc = {
                        n: v.n, r: v.r, c: v.c, i: v.i || null,
                        p: Number(d.rc.power) || 0,
                        ab: (Array.isArray(d.rc.urAbilities) ? d.rc.urAbilities : [])
                            .map(a => ({ n: String(a.name || ''), d: String(a.description || '') }))
                    }
                }
                res.json(r)
            } catch (err) {
                console.error('tower climb route error:', err)
                return fail(500, 'SERVER', 'خطأ بالخادم')
            }
        })
    }

    return { mount, climb }
}
