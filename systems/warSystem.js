// =====================================================================
// systems/warSystem.js
// ⚔️ حرب الأعلام للموقع — نفس فكرة .حرب / .انضم / .اذهب بالقواعد المعتمدة من المعاينة:
//  • الفوز لمن يملك أعلاماً أكثر عند انتهاء الـ5 دقائق (بدون نقاط) — التعادل بعدد الأعلام = تعادل
//  • استحواذ علم محايد 15 ثانية، وعلم الخصم: 15 ثانية لإلغاء استحواذه ثم 15 لتملّكه (لاعب واحد)
//    كل لاعب إضافي من نفس الفريق على العلم +10% سرعة (حتى 4 لاعبين)
//  • بعد كل .اذهب انتظار 30 ثانية قبل التحرك لعلم آخر، والقتال تلقائي داخل العلم
//  • الحالة بالذاكرة (حرب واحدة بكل البوت مثل القديمة). الجوائز: فائز 5000+1000xp، غيره 2000+300xp
// المنطق كله هنا؛ الموقع (characterSite.js) مسارات رفيعة فوقه.
// WAR_MAX_PLAYERS (متغير بيئة اختياري 2..6) للتجربة: مثلاً 2 = مبارزة 1 ضد 1.
// =====================================================================

const FL = ['A', 'B', 'C', 'D', 'E']
const MAX = Math.max(2, Math.min(6, Number(process.env.WAR_MAX_PLAYERS) || 6))
const END = 5 * 60 * 1000
const CD = 30 * 1000          // انتظار بين كل تحرك
const CAP_PER_TICK = 100 / 15 // تقدم الاستحواذ بالثانية للاعب واحد (15 ثانية)
const FIGHT_EVERY = 3000
const FIGHT_FIRST = 1500
const RESPAWN = 30 * 1000
const COUNTDOWN = 10 * 1000
const LOBBY_TTL = 10 * 60 * 1000
const RESULT_TTL = 2 * 60 * 1000
const REWARD = { win: { money: 5000, xp: 1000 }, lose: { money: 2000, xp: 300 } }

function createWarSystem({ Player, applyDogBonus, now = Date.now }) {
    let W = null

    const fail = (code, message) => ({ ok: false, code, message })
    const snap = c => ({
        name: String(c.name || '?'), power: Math.max(1, Number(c.power) || 1),
        rarity: c.rarity, form: c.form, evolutionLevel: Number(c.evolutionLevel) || 0,
        image: c.image, customImage: c.customImage, anime: c.anime
    })

    function ev(k, o) {
        W.ev.push({ id: ++W.eid, k, ...o })
        if (W.ev.length > 120) W.ev.shift()
    }
    // who: رقم لاعب أو مصفوفة أرقام = الرسالة تظهر لهم فقط (وإلا للجميع)
    const say = (t, who) => ev('say', { t, w: who })

    const on = f => W.players.filter(p => p.alive && p.flag === f)
    const tcol = t => (t === 'red' ? '🔴' : '🔵')

    function newWar(uid) {
        const F = {}
        FL.forEach(f => { F[f] = { owner: null, pr: 0, ct: null, cp: [] } })
        return {
            phase: 'lobby', by: uid, at: now(), players: [], F, fights: [], caps: {}, resp: [],
            t: 0, startAt: 0, cdAt: 0, eid: 0, ev: [], fb: 0, w1: 0, w2: 0, result: null, endedAt: 0
        }
    }

    // ───── اللوبي ─────
    async function create(uid) {
        if (W && W.phase !== 'ended') return fail('BUSY', '❌ توجد حرب جارية بالفعل')
        const p = await Player.findOne({ userId: uid }).select('userId').lean()
        if (!p) return fail('NO_ACCOUNT', '❌ لم يتم العثور على حسابك')
        if (W && W.phase !== 'ended') return fail('BUSY', '❌ توجد حرب جارية بالفعل')
        W = newWar(uid)
        say('⚔️ تم إنشاء حرب جديدة — للانضمام اختر شخصيتين')
        return { ok: true }
    }

    function cancel(uid) {
        if (!W || W.phase !== 'lobby') return fail('NO_WAR', '❌ لا يوجد لوبي لإلغائه')
        if (W.by !== uid) return fail('NOT_OWNER', '❌ فقط من أنشأ الحرب يقدر يلغيها')
        W = null
        return { ok: true }
    }

    // ia / ib: فهرس الشخصية (0-based) = نفس رقم .شخصياتي ناقص 1 (مثل .انضم 1 2)
    async function join(uid, ia, ib) {
        const w = W
        if (!w) return fail('NO_WAR', '❌ لا توجد حرب حالياً')
        if (w.phase !== 'lobby') return fail('STARTED', '❌ الحرب بدأت بالفعل')
        const ok = n => Number.isInteger(n) && n >= 0 && n < 100000
        if (!ok(ia) || !ok(ib)) return fail('BAD_INDEX', '❌ رقم شخصية غير صحيح')
        if (ia === ib) return fail('SAME', '❌ اختر شخصيتين مختلفتين')
        if (w.players.some(p => p.uid === uid)) return fail('JOINED', '❌ أنت منضم بالفعل')

        const doc = await Player.findOne({ userId: uid }).select('userId name username characters').lean()
        if (!doc) return fail('NO_ACCOUNT', '❌ لم يتم العثور على حسابك')
        const c1 = doc.characters && doc.characters[ia]
        const c2 = doc.characters && doc.characters[ib]
        if (!c1 || !c2) return fail('BAD_INDEX', '❌ رقم شخصية غير صحيح')

        // الحالة قد تتغير أثناء القراءة
        if (W !== w || w.phase !== 'lobby' || w.players.length >= MAX || w.players.some(p => p.uid === uid)) {
            return fail('CHANGED', '❌ تغيّرت حالة اللوبي، حدّث الصفحة وحاول مرة ثانية.')
        }
        const red = w.players.filter(p => p.team === 'red').length
        const blue = w.players.length - red
        const team = red > blue ? 'blue' : 'red'
        const main = snap(c1)
        const p = {
            i: w.players.length, uid, u: doc.username ? '@' + doc.username : (doc.name || 'لاعب'), team,
            main, sec: snap(c2), cur: main, us: 0, hp: main.power, alive: 1, flag: null, cd: 0, rs: 0,
            kills: 0, deaths: 0, captures: 0, fg: 0
        }
        w.players.push(p)
        say(`✅ ${p.u} انضم للحرب ${tcol(team)} (${main.name} + ${p.sec.name}) · ${w.players.length}/${MAX}`)
        if (w.players.length >= MAX) {
            w.phase = 'countdown'
            w.cdAt = now()
            say(`⚔️ اكتمل اللوبي — تبدأ الحرب خلال ${COUNTDOWN / 1000} ثوانٍ`)
        }
        return { ok: true, team }
    }

    // ───── التحرك والاستحواذ والقتال ─────
    function go(uid, flag) {
        if (!W || W.phase !== 'war') return fail('NO_WAR', '❌ لا توجد حرب نشطة')
        if (!FL.includes(flag)) return fail('BAD_FLAG', '❌ اختر علماً صحيحاً (A-E)')
        const p = W.players.find(x => x.uid === uid)
        if (!p) return fail('NOT_IN', '❌ أنت لست داخل الحرب')
        if (p.rs) return fail('DEAD', '⏳ أنت ميت حالياً، انتظر الـ Respawn')
        if (W.t < p.cd) return fail('COOLDOWN', `⏳ انتظر ${Math.ceil((p.cd - W.t) / 1000)} ثانية قبل التحرك لعلم آخر`)
        if (p.fg) return fail('FIGHTING', '⚔️ أنت في اشتباك، لا يمكنك المغادرة')
        if (p.flag === flag) return fail('SAME_FLAG', `✅ أنت على العلم ${flag} بالفعل`)
        const old = p.flag
        p.flag = flag
        p.cd = W.t + CD
        ev('go', { p: p.i, f: flag })
        say(`🏃‍♂️ توجهت إلى العلم ${flag}\n⏱️ التحرك التالي بعد 30 ثانية`, p.i)
        if (old) resolve(old)
        resolve(flag)
        return { ok: true }
    }

    // يوزّع الموجودين على العلم: اشتباكات أولاً، وإلا استحواذ جماعي لفريق واحد
    function resolve(f) {
        const d = W.F[f]
        while (fight(f));
        const o = on(f)
        const R = o.filter(p => p.team === 'red')
        const B = o.filter(p => p.team === 'blue')
        if (R.length && B.length) return
        const T = R.length ? 'red' : B.length ? 'blue' : null
        if (!T || (d.owner === T && d.pr >= 100)) return
        d.ct = T
        d.cp = o.filter(p => !p.fg)
        if (d.cp.length && !W.caps[f]) {
            W.caps[f] = W.t + 1000
            say(`🏴 بدأ الالتقاط على ${f} · 👥 ${d.cp.length}`, d.cp.map(p => p.i))
        }
    }

    function capTick(f) {
        const d = W.F[f]
        if (on(f).some(p => p.team !== d.ct)) { delete W.caps[f]; resolve(f); return }
        d.cp = on(f).filter(p => p.team === d.ct && !p.fg)
        if (!d.cp.length) { delete W.caps[f]; d.ct = null; return }
        const dl = CAP_PER_TICK * (1 + 0.1 * (Math.min(d.cp.length, 4) - 1))
        if (d.owner && d.owner !== d.ct) {
            d.pr -= dl
            if (d.pr <= 0) { d.pr = 0; d.owner = null; ev('neu', { f }); say(`🏴 العلم ${f} أصبح محايداً ⚪`) }
        } else {
            d.pr += dl
            if (d.pr >= 100) {
                d.pr = 100
                d.owner = d.ct
                delete W.caps[f]
                d.cp.forEach(p => { p.captures++ })
                ev('cap', { f, team: d.owner, by: d.cp.map(p => p.i) })
                say(`🏆 تم احتلال العلم ${f} ${tcol(d.owner)}`)
                d.ct = null
                d.cp = []
            }
        }
    }

    function fight(f) {
        const o = on(f)
        const a = o.find(p => p.team === 'red' && !p.fg)
        const b = o.find(p => p.team === 'blue' && !p.fg)
        if (!a || !b) return 0
        a.fg = b.fg = 1
        delete W.caps[f]
        W.F[f].ct = null
        W.F[f].cp = []
        W.fights.push({ a, b, f, at: W.t + FIGHT_FIRST })
        say(`⚔️ اشتباك تلقائي على العلم ${f}\n🔴 ${a.u} (${a.cur.name}) 🆚 🔵 ${b.u} (${b.cur.name})`)
        return 1
    }

    function hit(x, y, f) {
        if (Math.random() < 0.15) { ev('dmg', { f, d: 0, m: 1, y: y.i }); return 0 }
        let d = Math.floor(x.cur.power * (0.9 + Math.random() * 0.3))
        const c = Math.random() < 0.2
        if (c) d = Math.floor(d * 1.8)
        y.hp = Math.max(0, y.hp - d)
        ev('dmg', { f, d, c: c ? 1 : 0, y: y.i })
        return d
    }

    // true = انتهى الاشتباك
    function fTick(F) {
        const { a, b, f } = F
        if (!a.alive || !b.alive) { a.fg = b.fg = 0; return true }
        const d1 = hit(a, b, f)
        const d2 = b.hp > 0 ? hit(b, a, f) : 0
        say(`⚔️ جولة تبادل - العلم ${f}\n${a.cur.name} 💥${d1} ← ${b.cur.name} ❤️${b.hp}\n${b.cur.name} 💥${d2} ← ${a.cur.name} ❤️${a.hp}`, [a.i, b.i])
        for (const [df, at] of [[b, a], [a, b]]) {
            if (df.hp <= 0 && df.alive) {
                if (!df.us && df.sec) {
                    df.us = 1
                    df.cur = df.sec
                    df.hp = df.sec.power
                    ev('swap', { p: df.i })
                    say(`☠️ ماتت الشخصية الأولى\n🔥 دخل: ${df.cur.name}`)
                    continue
                }
                at.kills++
                df.deaths++
                df.alive = 0
                df.flag = null
                df.rs = 1
                const first = !W.fb
                W.fb = 1
                ev('kill', { f, a: at.i, d: df.i, fb: first ? 1 : 0 })
                say(`☠️ ${df.cur.name} هُزم نهائياً · ⏳ Respawn خلال 30 ثانية`)
                W.resp.push({ p: df, at: W.t + RESPAWN })
                at.fg = df.fg = 0
                return true
            }
        }
        return false
    }

    function step() {
        W.t += 100
        const later = []
        for (const f of FL) {
            if (W.caps[f] && W.t >= W.caps[f]) { W.caps[f] = W.t + 1000; capTick(f) }
        }
        W.fights = W.fights.filter(F => {
            if (W.t < F.at) return true
            F.at = W.t + FIGHT_EVERY
            if (fTick(F)) { later.push(F.f); return false }
            return true
        })
        W.resp = W.resp.filter(r => {
            if (W.t < r.at) return true
            const p = r.p
            p.alive = 1; p.rs = 0; p.cd = 0; p.cur = p.main; p.us = 0; p.hp = p.main.power
            ev('res', { p: p.i })
            say(`🔄 عاد ${p.cur.name} إلى المعركة`)
            return false
        })
        later.forEach(resolve)
        if (!W.w1 && W.t >= END - 60000) { W.w1 = 1; ev('ban', { t: '1:00 LEFT', c: '#f0c04a' }) }
        if (!W.w2 && W.t >= END - 30000) { W.w2 = 1; ev('ban', { t: 'FINAL 30s', c: '#ff3860' }) }
        if (W.t >= END) finish()
    }

    const flagCount = () => {
        let r = 0, b = 0
        FL.forEach(f => { if (W.F[f].owner === 'red') r++; if (W.F[f].owner === 'blue') b++ })
        return [r, b]
    }

    function finish() {
        const w = W
        const [rf, bf] = flagCount()
        const winner = rf > bf ? 'red' : bf > rf ? 'blue' : 'tie'
        const score = p => p.kills * 2 + p.captures * 5 - p.deaths
        const mvp = w.players.slice().sort((a, b) => score(b) - score(a))[0]
        w.phase = 'ended'
        w.endedAt = now()
        w.result = { winner, rf, bf, mvp: mvp ? mvp.i : -1, reward: REWARD }
        ev('end', { winner })
        // الجوائز (نفس طريقة الحرب القديمة)
        ;(async () => {
            for (const p of w.players) {
                try {
                    const doc = await Player.findOne({ userId: p.uid })
                    if (!doc) continue
                    const r = winner === p.team ? REWARD.win : REWARD.lose
                    await doc.addMoney(r.money)
                    doc.xp += applyDogBonus(doc, r.xp)
                    await doc.save()
                } catch (err) {
                    console.error('war reward error:', err.message)
                }
            }
        })()
    }

    function loop() {
        if (!W) return
        const n = now()
        if (W.phase === 'lobby' && n - W.at > LOBBY_TTL) { W = null; return }
        if (W.phase === 'countdown' && n >= W.cdAt + COUNTDOWN) {
            W.phase = 'war'
            W.startAt = n
            W.t = 0
            ev('ban', { t: 'BATTLE START', c: '#f0c04a' })
            say('⚔️ بدأت الحرب — الفوز لمن يملك أعلاماً أكثر عند النهاية')
        }
        if (W.phase === 'war') {
            const el = n - W.startAt
            let guard = 0
            while (W.t + 100 <= el && W.phase === 'war' && guard++ < 300) step()
        }
        if (W && W.phase === 'ended' && n - W.endedAt > RESULT_TTL) W = null
    }
    const timer = setInterval(loop, 100)
    if (timer.unref) timer.unref()

    // ───── الحالة للواجهة (شخصيات خام؛ الموقع يحوّل الصور) ─────
    function getState(uid, since = 0) {
        if (!W) return { ok: true, phase: 'none', max: MAX }
        const me = W.players.findIndex(p => p.uid === uid)
        const rsOf = p => { const r = W.resp.find(x => x.p === p); return r ? Math.max(0, r.at - W.t) : 0 }
        return {
            ok: true, phase: W.phase, max: MAX, me, creator: W.by === uid, id: W.at,
            cdLeft: W.phase === 'countdown' ? Math.max(0, W.cdAt + COUNTDOWN - now()) : 0,
            left: W.phase === 'war' ? Math.max(0, END - W.t) : W.phase === 'ended' ? 0 : END,
            flags: Object.fromEntries(FL.map(f => [f, { owner: W.F[f].owner, pr: Math.round(W.F[f].pr * 10) / 10, ct: W.F[f].ct }])),
            fights: W.fights.map(F => ({ f: F.f, a: F.a.i, b: F.b.i })),
            players: W.players.map(p => ({
                i: p.i, u: p.u, team: p.team, main: p.main, sec: p.sec, cur: p.cur, us: p.us, hp: p.hp,
                alive: !!p.alive, flag: p.flag, fg: !!p.fg, cd: Math.max(0, p.cd - W.t), rs: rsOf(p),
                kills: p.kills, deaths: p.deaths, captures: p.captures
            })),
            result: W.result,
            eid: W.eid,
            events: W.ev.filter(e => e.id > since).slice(-40)
        }
    }

    return { create, cancel, join, go, getState, FLAGS: FL, MAX_PLAYERS: MAX, _loop: loop, _peek: () => W }
}

module.exports = { createWarSystem, WAR_REWARD: REWARD }
