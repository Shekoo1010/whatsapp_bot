// =====================================================================
// systems/characterSite.js
// موقع عرض شخصيات اللاعب — رابط خاص لكل لاعب: /u/<siteCode>
// - الشخصيات SSS وما فوق: بطاقة بنفس إطار/ألوان .المعرض مع الصورة
// - الباقي (عادي / ممتاز / اسطوري): أسماء فقط
// - كل صفحة 40 شخصية (غيّر PAGE_SIZE)
// =====================================================================

const crypto = require('crypto')
const { charHash, MAX_GIFT_CHARACTERS } = require('./giftSystem')

const PAGE_SIZE = 40

// نفس جدول الرتب/الألوان/النجوم الموجود بـ myRosterCard.js
const TIER_ORDER = [
    { key: 'عادي',    lang: 'ar', stars: 1,  color: '#8b93a1' },
    { key: 'ممتاز',   lang: 'ar', stars: 2,  color: '#3ea8ff' },
    { key: 'اسطوري',  lang: 'ar', stars: 3,  color: '#f0c04a' },
    { key: 'SSS',     lang: 'en', stars: 4,  color: '#ff3860' },
    { key: 'SSS+',    lang: 'en', stars: 5,  color: '#ff6b3d' },
    { key: 'SSS++',   lang: 'en', stars: 6,  color: '#ff2f92' },
    { key: 'UR I',    lang: 'en', stars: 7,  color: '#b83fff' },
    { key: 'UR II',   lang: 'en', stars: 8,  color: '#7c4dff' },
    { key: 'UR III',  lang: 'en', stars: 9,  color: '#4d7cff' },
    { key: 'EX',      lang: 'en', stars: 10, color: '#00e5ff' },
    { key: 'Ω OMEGA', lang: 'en', stars: 11, color: '#c04aff' },
]
const TIERS = Object.fromEntries(TIER_ORDER.map((t, i) => [t.key, { ...t, idx: i }]))
const FIRST_IMAGE_TIER = TIERS['SSS'].idx // من SSS وفوق تظهر الصورة

function resolveTierKey(rarity, evolutionLevel = 0) {
    if (rarity !== 'SSS' || !evolutionLevel) return rarity
    const evoMap = ['SSS', 'SSS+', 'SSS++', 'UR I', 'UR II', 'UR III', 'EX', 'Ω OMEGA']
    return evoMap[evolutionLevel] || 'Ω OMEGA'
}

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]))
}

// يسمح فقط بروابط https أو صور custom_images (يمنع أي حقن)
function safeImageUrl(img) {
    if (!img || typeof img !== 'string') return null
    if (/^https:\/\//i.test(img) && !/['"()\s\\]/.test(img)) return img
    if (/^\.?\/?custom_images\/[\w.\-]+$/i.test(img)) {
        return '/custom_images/' + img.split('/').pop()
    }
    return null
}

function sortCharacters(chars) {
    return chars
        .map((c, i) => ({ c, i, t: TIERS[resolveTierKey(c.rarity, c.evolutionLevel)] || TIERS['عادي'] }))
        .sort((a, b) => (b.t.idx - a.t.idx) || ((b.c.power || 0) - (a.c.power || 0)) || (a.i - b.i))
        .map(x => x.c)
}

// ---------------------------------------------------------------
// 🔄 نفس منطق .عرض بالضبط: نجيب أحدث صورة/أنمي من كتالوج characters.json
// (مطابقة name + rarity + form)، ثم لو اللاعب مستبدل صورة الشخصية بـ
// .استبدال (customImage) تُفضَّل صورته. بدون هذا كانت الصفحة تعرض الصورة
// القديمة المنسوخة داخل مستند اللاعب وقت سحب الشخصية.
// الكتالوج يُجلب من نفس require('./characters.json') اللي يستخدمه البوت
// (نفس النسخة بالذاكرة) — فأي تحديث له يظهر بعد إعادة تشغيل البوت، مثل .عرض.
// ---------------------------------------------------------------
let _catalogSrc = null
let _catalogIdx = null

function loadCatalog(getCatalog) {
    try {
        return (typeof getCatalog === 'function' ? getCatalog() : require('../characters.json')) || []
    } catch (err) {
        console.error('character site: catalog load error:', err)
        return []
    }
}

function getCatalogIndex(getCatalog) {
    const cat = loadCatalog(getCatalog)
    if (cat !== _catalogSrc || !_catalogIdx) {
        const idx = new Map()
        for (const c of cat) {
            const key = `${c.name}|${c.rarity}|${c.form}`
            if (!idx.has(key)) idx.set(key, c) // أول تطابق (نفس سلوك .find)
        }
        _catalogSrc = cat
        _catalogIdx = idx
    }
    return _catalogIdx
}

function resolveDisplayChar(owned, catIdx) {
    const latest = catIdx.get(`${owned.name}|${owned.rarity}|${owned.form}`)
    const display = latest
        ? {
            ...owned,
            image: latest.image,
            anime: latest.anime,
            rarity: latest.rarity,
            form: latest.form || owned.form,
            ability: owned.ability || latest.ability
        }
        : { ...owned }
    if (owned.customImage) display.image = owned.customImage
    return display
}

// نفس ترتيب .شخصياتي بالضبط: الشخصية رقم 1 ثابتة، والباقي حسب الرتبة ثم القوة
function sortCharactersKeepFirst(chars) {
    if (!chars || chars.length <= 1) return chars || []
    const [first, ...rest] = chars
    return [first, ...sortCharacters(rest)]
}

// =====================================================================
// 🔍 لوحة التفاصيل (قدرات / إيكوز / سلاح) — تظهر عند الضغط على بطاقة الشخصية
// البيانات كلها من مستند اللاعب نفسه: character.urAbilities / character.echoes / player.weaponsInventory
// =====================================================================

let _weaponsCat = null
function getWeaponsCatalog() {
    if (_weaponsCat) return _weaponsCat
    try { _weaponsCat = require('../weapons').weapons || [] } catch (e) { _weaponsCat = [] }
    return _weaponsCat
}

let _familyMap = null
function getFamilyMap() {
    if (_familyMap) return _familyMap
    _familyMap = new Map()
    try { for (const f of require('../data/echoFamilies')) _familyMap.set(f.id, f) } catch (e) { /* بدون عوائل */ }
    return _familyMap
}

const STAT_BASE = {
    attack: '⚔️ هجوم', defense: '🛡️ دفاع', hp: '❤️ HP',
    critRate: '🎯 نسبة الحرج', critDamage: '💥 ضرر الحرج', bossDamage: '👹 ضرر الزعماء',
    dodge: '👻 مراوغة', accuracy: '🎯 دقة', shield: '🛡️ درع',
    lifesteal: '🩸 امتصاص حياة', reflect: '🪞 عكس ضرر'
}
function statLabel(t) {
    if (typeof t === 'string' && t.endsWith('Percent')) return (STAT_BASE[t.slice(0, -7)] || t) + ' %'
    return STAT_BASE[t] || String(t || '')
}
const FLAT_TYPES = new Set(['attack', 'defense', 'hp', 'shield'])
function fmtNum(v) { return String(Math.round((Number(v) || 0) * 10) / 10) }
// forcePct: الستات الرئيسي للإيكو دايماً نسبة % (حتى هجوم/دفاع/HP)
function fmtVal(type, v, forcePct) {
    return '+' + fmtNum(v) + ((forcePct || !FLAT_TYPES.has(type)) ? '%' : '')
}

const ECHO_SLOTS = [
    ['cost4', 'كوست 4', 4], ['cost3_1', 'كوست 3 (1)', 3], ['cost3_2', 'كوست 3 (2)', 3],
    ['cost1_1', 'كوست 1 (1)', 1], ['cost1_2', 'كوست 1 (2)', 1]
]
const ECHO_COST_ICON = { 4: '💠', 3: '🔷', 1: '🔹' }
const SUB_UNLOCK = [5, 10, 15]

function bonusText(bonus) {
    return Object.entries(bonus || {})
        .map(([t, v]) => `${esc(statLabel(t))} <b>${esc(fmtVal(t, v))}</b>`)
        .join(' · ')
}

function echoPieceHTML(label, cost, item) {
    const icon = ECHO_COST_ICON[cost] || '🔸'
    if (!item) {
        return `<div class="ep off"><div class="ep-h"><span class="ep-slot">${icon} ${esc(label)}</span><em>فاضي</em></div></div>`
    }
    const max = Number(item.maxLevel) || 15
    const lvl = Math.max(0, Math.min(max, Number(item.level) || 0))
    const main = item.mainStat || {}
    const subs = Array.isArray(item.subStats) ? item.subStats : []
    const fam = getFamilyMap().get(item.familyId)
    const famName = item.familyName || (fam && fam.name) || ''
    const famAr = item.familyNameAr || (fam && fam.nameAr) || ''

    const subRows = SUB_UNLOCK.map((u, i) => subs[i]
        ? `<div class="ep-sub"><span>${esc(subs[i].name || statLabel(subs[i].type))}</span><b>${esc(fmtVal(subs[i].type, subs[i].value))}</b></div>`
        : `<div class="ep-sub lock"><span>🔒 ساب ${i + 1}</span><b>يفتح بلفل ${u}</b></div>`
    ).join('')

    const monster = item.droppedBy && (item.droppedBy.nameAr || item.droppedBy.name)

    return `<div class="ep ${lvl >= max ? 'max' : ''}">
      <div class="ep-h"><span class="ep-slot">${icon} ${esc(label)}</span><em>Lv ${lvl}/${max}</em></div>
      <div class="ep-fam">${esc(famName)}${famAr ? ` · ${esc(famAr)}` : ''}</div>
      <div class="ep-bar"><i style="width:${Math.round(lvl / max * 100)}%"></i></div>
      <div class="ep-main"><span><small>رئيسي</small>${esc(statLabel(main.type))}</span><b>${esc(fmtVal(main.type, main.value, true))}</b></div>
      ${subRows}
      ${monster ? `<div class="ep-mon">🐉 ${esc(monster)}</div>` : ''}
    </div>`
}

function echoPaneHTML(char) {
    const echoes = (char && char.echoes) || {}
    const equipped = ECHO_SLOTS.filter(([k]) => echoes[k])
    if (!equipped.length) {
        return `<div class="empty"><div>🎐</div>لا يوجد أي إيكو مجهز على هذه الشخصية</div>`
    }

    const costSum = equipped.reduce((s, [, , c]) => s + c, 0)
    const slotsHTML = ECHO_SLOTS.map(([k, , c]) =>
        `<div class="sl ${echoes[k] ? 'on' : ''}"><i>${ECHO_COST_ICON[c]}</i><b>${c}</b></div>`).join('')

    const pieces = ECHO_SLOTS.map(([k, label, c]) => echoPieceHTML(label, c, echoes[k])).join('')

    // عوائل الطقم + بونص 2 / 5 قطع
    const counts = {}
    const meta = {}
    for (const [k] of equipped) {
        const it = echoes[k]
        counts[it.familyId] = (counts[it.familyId] || 0) + 1
        if (!meta[it.familyId]) meta[it.familyId] = it
    }
    const famMap = getFamilyMap()
    const total = {}
    const add = (t, v) => { total[t] = (total[t] || 0) + (Number(v) || 0) }

    for (const [k] of equipped) {
        const it = echoes[k]
        if (it.mainStat) {
            const t = it.mainStat.type
            add(['attack', 'defense', 'hp'].includes(t) ? t + 'Percent' : t, it.mainStat.value)
        }
        for (const s of (it.subStats || [])) add(s.type, s.value)
    }

    const famHTML = Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a])
        .map(id => {
            const n = counts[id]
            const f = famMap.get(id)
            const it = meta[id]
            const name = (f && f.name) || it.familyName || id
            const nameAr = (f && f.nameAr) || it.familyNameAr || ''
            if (f) {
                if (n >= 2 && f.bonus2) for (const t in f.bonus2) add(t, f.bonus2[t])
                if (n >= 5 && f.bonus5) for (const t in f.bonus5) add(t, f.bonus5[t])
            }
            const pips = [1, 2, 3, 4, 5].map(i => `<s class="${i <= n ? 'on' : ''}"></s>`).join('')
            const row = (need, bonus) => bonus
                ? `<div class="fam-r ${n >= need ? 'on' : ''}"><i>${n >= need ? '✅' : '🔒'} ${need === 2 ? 'قطعتان' : '5 قطع'}</i><span>${bonusText(bonus)}</span></div>`
                : ''
            return `<div class="fam ${n >= 5 ? 'full' : ''}">
          <div class="fam-h"><span>${esc(name)}${nameAr ? ` · ${esc(nameAr)}` : ''}</span><em>${n}/5</em></div>
          <div class="pips">${pips}</div>
          ${f ? row(2, f.bonus2) + row(5, f.bonus5) : ''}
          ${n >= 5 ? '<div class="full-tag">🌟 الطقم مكتمل 5/5</div>' : ''}
        </div>`
        }).join('')

    const totalHTML = Object.keys(total).filter(t => total[t])
        .map(t => `<span class="tot"><i>${esc(statLabel(t))}</i><b>${esc(fmtVal(t, total[t]))}</b></span>`).join('')

    return `<div class="ec-sum"><span>🎐 المجهز ${equipped.length}/5</span><em>COST ${costSum}/12</em></div>
      <div class="slots">${slotsHTML}</div>
      ${pieces}
      <div class="sec-t">🎼 تأثيرات العوائل (الطقم)</div>
      ${famHTML}
      <div class="sec-t">📊 إجمالي بونص الإيكوز</div>
      <div class="tots">${totalHTML}</div>
      <div class="note">يشمل الستات الرئيسي + الساب ستات + بونص العوائل المفعّل.</div>`
}

const WEAPON_ICON = { Broadblade: '🗡️', Sword: '⚔️', Gauntlet: '🥊', Rectifier: '🔮', Pistol: '🔫' }

function weaponPaneHTML(w) {
    if (!w) return `<div class="empty"><div>⚔️</div>لا يوجد سلاح مركب على هذه الشخصية</div>`
    // أحدث صورة من بنك الأسلحة (weapons.js) — مثل الشخصيات — وإلا الصورة المحفوظة بالسلاح
    const cat = getWeaponsCatalog().find(x => x.id === w.id)
    const src = safeImageUrl((cat && cat.image) || w.image)
    const icon = WEAPON_ICON[w.type] || '🗡️'
    const img = src
        ? `<div class="wp-img" style="background-image:url('${esc(src)}')"></div>`
        : `<div class="wp-img none">${icon}</div>`
    const rarity = Math.max(1, Math.min(5, Number(w.rarity) || 5))
    const hasSub = w.subStatType && Number(w.subStatValue)
    return `<div class="wp">
        ${img}
        <div class="wp-name">${esc(w.name)}</div>
        <div class="wp-chips"><span>${icon} ${esc(w.type || '')}</span><span class="st">${'★'.repeat(rarity)}</span></div>
        <div class="wp-stats">
          <div><i>⚡ الهجوم الأساسي</i><b>${esc(fmtNum(w.baseAtk))}</b></div>
          ${hasSub ? `<div><i>${esc(statLabel(w.subStatType))}</i><b>${esc(fmtVal(w.subStatType, w.subStatValue))}</b></div>` : ''}
        </div>
        <div class="note">يعطي الشخصية: ${esc(fmtNum(w.baseAtk))}+ هجوم أساسي${hasSub ? ` · ${esc(statLabel(w.subStatType).replace(/^\S+\s/, ''))} ${esc(fmtVal(w.subStatType, w.subStatValue))}` : ''}</div>
      </div>`
}

function abilityPaneHTML(char, evo, tierKey) {
    const list = Array.isArray(char.urAbilities) ? char.urAbilities : []
    if (list.length) {
        return list.map((a, i) => {
            const m = /^(\+?\d+(?:\.\d+)?%)\s*(.*)$/.exec(String(a.description || ''))
            const d = m ? `<b>${esc(m[1])}</b> ${esc(m[2])}` : esc(a.description || '')
            return `<div class="ab"><div class="ab-n">${i + 1}</div><div>
            <div class="ab-t">${esc(a.name)}</div>
            <div class="ab-d">${d}</div>
          </div></div>`
        }).join('')
    }
    if (char.ability) {
        return `<div class="ab"><div class="ab-n">1</div><div>
            <div class="ab-t">✨ ${esc(char.ability)}</div>
            <div class="ab-d">قدرة الشخصية الأساسية</div>
          </div></div>
          <div class="note">قدرات EX الإضافية تظهر بعد تطوير الشخصية إلى SSS+ وما فوق.</div>`
    }
    return `<div class="empty"><div>⚡</div>لا توجد قدرات لهذه الشخصية بعد</div>`
}

function detailHTML(char) {
    const tierKey = resolveTierKey(char.rarity, char.evolutionLevel)
    const t = TIERS[tierKey] || TIERS['SSS']
    const isOmega = tierKey === 'Ω OMEGA'
    const evo = Number(char.evolutionLevel) || 0
    const filled = Math.min(evo, 6)
    const evoHTML = isOmega
        ? `<span class="sh-stars">${'🌌'.repeat(7)}</span> <b>Ω (أقصى رتبة)</b>`
        : `<span class="sh-stars">${'★'.repeat(filled)}${'☆'.repeat(6 - filled)}</span> <b>(${filled}/6)</b>`
    const badge = tierKey === 'Ω OMEGA' ? 'Ω' : tierKey

    return `<template id="d-${char.__num}"><div data-tier="${t.color}" data-omega="${isOmega ? 1 : 0}">
      <div class="sh-head">
        <button class="close" type="button" data-close aria-label="إغلاق">✕</button>
        <div class="sh-badge">${esc(badge)} · DETAILS</div>
        <div class="sh-name">${esc(char.name)}</div>
        <div class="sh-meta">
          <span>🧿 رقم <b>${char.__num}</b></span>
          <span>⭐ التطوير ${evoHTML}</span>
        </div>
      </div>
      <div class="tabs">
        <button class="tab on" type="button" data-t="ab">⚡ القدرات</button>
        <button class="tab" type="button" data-t="ec">🎐 الإيكوز</button>
        <button class="tab" type="button" data-t="wp">⚔️ السلاح</button>
      </div>
      <div class="body">
        <div class="pane" data-p="ab">${abilityPaneHTML(char, evo, tierKey)}</div>
        <div class="pane" data-p="ec" hidden>${echoPaneHTML(char)}</div>
        <div class="pane" data-p="wp" hidden>${weaponPaneHTML(char.__weapon)}</div>
      </div>
    </div></template>`
}

function cardHTML(char) {
    const tierKey = resolveTierKey(char.rarity, char.evolutionLevel)
    const t = TIERS[tierKey] || TIERS['SSS']
    const isOmega = tierKey === 'Ω OMEGA'
    const src = safeImageUrl(char.image)
    const artStyle = src
        ? `background-image:url('${esc(src)}')`
        : 'background:linear-gradient(160deg,#333,#111)'
    const power = Number(char.power || 0).toLocaleString('en-US')

    return `
    <div class="card ${isOmega ? 'omega' : ''}" style="--tier:${t.color}" data-d="${char.__num}" tabindex="0" role="button" aria-label="تفاصيل ${esc(char.name)}">
      <div class="tier-tag"><span class="tier-name ${t.lang}">${esc(tierKey)}</span><span class="pwr-badge">${power} PWR</span></div>
      <div class="stars">${'★'.repeat(t.stars)}</div>
      <div class="art" style="${artStyle}"><span class="num">${char.__num}</span><div class="fade"></div></div>
      <div class="plate">
        <div class="name-en">${esc(char.name)}</div>
        <div class="anime-chip">${esc(char.anime)}</div>
        <span class="more">تفاصيل ▸</span>
      </div>
    </div>`
}

function chipHTML(char) {
    const tierKey = resolveTierKey(char.rarity, char.evolutionLevel)
    const t = TIERS[tierKey] || TIERS['عادي']
    return `<span class="chip" style="--tier:${t.color}"><i>${char.__num}</i>${esc(char.name)}</span>`
}

function pagerHTML(base, page, pages) {
    if (pages <= 1) return ''
    const link = (p, label, cls = '') =>
        `<a class="pg ${cls}" href="${base}?page=${p}">${label}</a>`
    let out = ''
    if (page > 1) out += link(page - 1, '→ السابق')
    for (let p = 1; p <= pages; p++) {
        out += p === page ? `<span class="pg cur">${p}</span>` : link(p, p)
    }
    if (page < pages) out += link(page + 1, 'التالي ←')
    return `<nav class="pager">${out}</nav>`
}

const BASE_CSS = `
  :root{ --bg:#0a0d16; --bg2:#0f1422; --gold:#f0c04a; --gold-dim:#8a6d24; --text:#eef1f8; --text-dim:#8891a3; }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{
    background: radial-gradient(1200px 500px at 50% -10%, rgba(240,192,74,.08), transparent 60%), linear-gradient(180deg,#070911,#0a0d16 40%,#070911);
    color:var(--text); font-family:'Cairo',sans-serif; padding:40px 20px 60px; min-height:100vh;
  }
  .frame{max-width:1700px; margin:0 auto;}
  .eyebrow{text-align:center; font-family:'Oswald',sans-serif; letter-spacing:.45em; font-size:11px; color:var(--gold-dim); text-transform:uppercase; margin-bottom:10px;}
  h1{text-align:center; font-size:clamp(30px,6vw,52px); font-weight:900; background:linear-gradient(180deg,#fff6d8,var(--gold) 55%,#a9791f); -webkit-background-clip:text; background-clip:text; color:transparent;}
  .sub{text-align:center; font-family:'Oswald',sans-serif; font-size:13px; letter-spacing:.3em; color:var(--text-dim); margin:6px 0 22px; text-transform:uppercase;}
  .counts{display:flex; flex-wrap:wrap; justify-content:center; gap:8px; margin-bottom:34px;}
  .count{font-family:'Oswald',sans-serif; font-size:14px; color:var(--tier); border:1px solid color-mix(in srgb, var(--tier) 50%, transparent); background:color-mix(in srgb, var(--tier) 10%, transparent); border-radius:20px; padding:3px 12px; direction:ltr;}
  .count b{color:#fff; margin-left:4px;}

  .roster{display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:26px; margin-bottom:34px;}
  .card{
    position:relative; width:100%; border-radius:15px; overflow:hidden; background:var(--bg2);
    border:2.5px solid var(--tier); display:flex; flex-direction:column;
    box-shadow:0 14px 34px rgba(0,0,0,.45), 0 0 26px color-mix(in srgb, var(--tier) 35%, transparent);
  }
  /* أوميقا: إطار متدرج بزوايا دائرية (بدل border-image المربع) + توهج بألوانها */
  .card.omega{
    border-color:transparent;
    background:linear-gradient(#0f1422,#0f1422) padding-box, linear-gradient(135deg,#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860) border-box;
    box-shadow:0 14px 34px rgba(0,0,0,.45), -6px -6px 28px rgba(255,56,96,.30), 6px -6px 28px rgba(62,168,255,.30), 6px 6px 28px rgba(192,74,255,.34), -6px 6px 28px rgba(240,192,74,.28);
  }
  .tier-tag{display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:nowrap; padding:13px 18px 7px;}
  .tier-name,.pwr-badge{white-space:nowrap;}
  .tier-name{font-size:20px; font-weight:700; color:var(--tier);}
  .tier-name.en{font-family:'Oswald',sans-serif; letter-spacing:.14em; text-transform:uppercase; font-size:18px; direction:ltr;}
  .tier-name.ar{font-family:'Cairo',sans-serif; font-weight:800;}
  .pwr-badge{font-family:'Oswald',sans-serif; font-size:15px; font-weight:600; color:#0a0d16; background:var(--tier); padding:4px 12px; border-radius:20px; direction:ltr;}
  .stars{padding:0 18px 13px; font-size:20px; letter-spacing:1.5px; color:var(--tier); text-shadow:0 0 8px color-mix(in srgb, var(--tier) 60%, transparent); direction:ltr; text-align:right; line-height:1.3;}
  .art{position:relative; flex:1; min-height:400px; background-size:cover; background-position:center top; background-color:#151a28;}
  .num{position:absolute; top:10px; left:10px; z-index:2; font-family:'Oswald',sans-serif; font-size:15px; font-weight:600; color:#fff; direction:ltr; line-height:1; padding:5px 10px; border-radius:10px; background:rgba(8,10,18,.72); border:1.5px solid var(--tier); box-shadow:0 0 10px color-mix(in srgb, var(--tier) 40%, transparent);}
  .art .fade{position:absolute; inset:0; background:linear-gradient(180deg, transparent 55%, rgba(10,13,22,.92) 100%);}
  .plate{padding:18px 18px 20px; text-align:center; background:linear-gradient(180deg, transparent, rgba(0,0,0,.5));}
  .name-en{font-family:'Oswald',sans-serif; font-weight:600; font-size:24px; letter-spacing:.03em; color:#fff; direction:ltr;}
  .anime-chip{margin-top:12px; display:inline-block; font-size:15px; font-family:'Oswald',sans-serif; letter-spacing:.08em; color:var(--tier); border:1px solid color-mix(in srgb, var(--tier) 50%, transparent); border-radius:20px; padding:4px 14px; text-transform:uppercase; background:color-mix(in srgb, var(--tier) 10%, transparent); direction:ltr;}

  .names-title{text-align:center; font-family:'Cairo',sans-serif; font-weight:800; color:var(--gold-dim); margin:10px 0 16px; font-size:18px;}
  .names{display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-bottom:34px;}
  .chip i{font-style:normal; font-size:13px; font-weight:600; color:var(--tier); margin-left:8px; padding-left:8px; border-left:1px solid color-mix(in srgb, var(--tier) 45%, transparent);}
  .chip{font-family:'Oswald',sans-serif; font-size:17px; color:#fff; direction:ltr; padding:6px 16px; border-radius:20px; border:1.5px solid var(--tier); background:color-mix(in srgb, var(--tier) 12%, #0f1422); box-shadow:0 0 12px color-mix(in srgb, var(--tier) 25%, transparent);}

  .pager{display:flex; flex-wrap:wrap; justify-content:center; gap:8px; margin-top:10px;}
  .pg{font-family:'Oswald',sans-serif; color:var(--text); text-decoration:none; border:1px solid var(--gold-dim); border-radius:10px; padding:7px 14px; background:#0f1422;}
  .pg.cur{background:var(--gold); color:#0a0d16; font-weight:700; border-color:var(--gold);}
  a.pg:hover{border-color:var(--gold); color:var(--gold);}
  /* ===== لوحة التفاصيل ===== */
  .card[data-d]{cursor:pointer; transition:transform .15s;}
  .card[data-d]:hover{transform:translateY(-3px);}
  .card[data-d]:focus-visible{outline:2px solid #fff; outline-offset:3px;}
  .more{display:inline-block; margin-top:12px; margin-right:6px; font-weight:800; font-size:13px; color:#0a0d16; background:var(--tier); border-radius:20px; padding:4px 14px;}
  .overlay{position:fixed; inset:0; z-index:50; background:rgba(3,4,9,.8); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:16px; padding-top:calc(16px + env(safe-area-inset-top,0px)); padding-bottom:calc(16px + env(safe-area-inset-bottom,0px));}
  .overlay[hidden]{display:none;}
  .sheet{
    width:100%; max-width:580px; max-height:100%; overflow:hidden; display:flex; flex-direction:column;
    background:linear-gradient(180deg,#121830,#0c101e); border:2px solid var(--tier); border-radius:20px;
    box-shadow:0 0 40px color-mix(in srgb, var(--tier) 30%, transparent), 0 20px 60px rgba(0,0,0,.6);
  }
  .sheet.omega{
    border-color:transparent;
    background:linear-gradient(180deg,#121830,#0c101e) padding-box, linear-gradient(135deg,#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860) border-box;
  }
  .sh-head{position:relative; padding:20px 20px 14px; text-align:center; border-bottom:1px solid color-mix(in srgb, var(--tier) 25%, transparent);}
  .close{position:absolute; top:12px; left:12px; width:34px; height:34px; border-radius:50%; border:1.5px solid color-mix(in srgb, var(--tier) 60%, transparent); background:rgba(0,0,0,.35); color:#fff; font-size:18px; cursor:pointer; line-height:1;}
  .sh-badge{display:inline-block; font-family:'Oswald',sans-serif; letter-spacing:.2em; font-size:12px; color:var(--tier); border:1px solid color-mix(in srgb, var(--tier) 55%, transparent); border-radius:20px; padding:3px 14px; background:color-mix(in srgb, var(--tier) 10%, transparent); direction:ltr; margin-bottom:10px;}
  .sh-name{font-family:'Oswald',sans-serif; font-size:30px; font-weight:600; color:#fff; direction:ltr; line-height:1.1; word-break:break-word;}
  .sh-meta{margin-top:8px; display:flex; flex-wrap:wrap; justify-content:center; gap:8px 16px; font-size:14px; color:var(--text-dim);}
  .sh-meta b{color:var(--tier); font-weight:800; direction:ltr; display:inline-block;}
  .sh-stars{color:var(--tier); letter-spacing:2px; text-shadow:0 0 8px color-mix(in srgb, var(--tier) 60%, transparent); direction:ltr; display:inline-block;}
  .tabs{display:flex; gap:6px; padding:10px 14px 0;}
  .tab{flex:1; font-family:'Cairo',sans-serif; font-weight:800; font-size:14px; color:var(--text-dim); background:transparent; border:0; border-bottom:3px solid transparent; padding:9px 4px; cursor:pointer;}
  .tab.on{color:var(--tier); border-bottom-color:var(--tier);}
  .body{padding:14px 16px 20px; overflow-y:auto; -webkit-overflow-scrolling:touch;}
  .pane[hidden]{display:none;}
  .ab{display:flex; gap:12px; align-items:flex-start; padding:13px 12px; border-radius:14px; margin-bottom:10px; background:color-mix(in srgb, var(--tier) 6%, #0f1422); border:1px solid color-mix(in srgb, var(--tier) 22%, transparent);}
  .ab-n{flex:0 0 32px; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Oswald',sans-serif; font-weight:700; font-size:15px; color:#0a0d16; background:var(--tier); box-shadow:0 0 10px color-mix(in srgb, var(--tier) 50%, transparent);}
  .ab-t{font-weight:800; font-size:17px; color:#fff; line-height:1.4;}
  .ab-d{margin-top:3px; font-size:14.5px; color:#b9c1d3; line-height:1.5;}
  .ab-d b{color:var(--tier); font-family:'Oswald',sans-serif; direction:ltr; display:inline-block;}
  .note{font-size:13px; color:var(--text-dim); text-align:center; margin-top:6px; line-height:1.7;}
  .empty{padding:36px 10px; text-align:center; color:var(--text-dim); font-size:14.5px; line-height:1.8;}
  .empty div{font-size:34px; margin-bottom:6px;}
  .wp{text-align:center;}
  .wp-img{height:230px; border-radius:16px; margin-bottom:14px; background-size:contain; background-repeat:no-repeat; background-position:center; background-color:#0b0e18; border:1px solid color-mix(in srgb, var(--tier) 28%, transparent);}
  .wp-img.none{display:flex; align-items:center; justify-content:center; font-size:64px; opacity:.5;}
  .wp-name{font-family:'Oswald',sans-serif; font-size:26px; font-weight:600; color:#fff; direction:ltr;}
  .wp-chips{display:flex; justify-content:center; gap:8px; margin:10px 0 14px;}
  .wp-chips span{font-family:'Oswald',sans-serif; font-size:14px; color:var(--tier); border:1px solid color-mix(in srgb, var(--tier) 50%, transparent); border-radius:20px; padding:3px 14px; background:color-mix(in srgb, var(--tier) 10%, transparent); direction:ltr;}
  .wp-stats{display:grid; grid-template-columns:1fr 1fr; gap:10px;}
  .wp-stats div{padding:12px 8px; border-radius:14px; background:color-mix(in srgb, var(--tier) 6%, #0f1422); border:1px solid color-mix(in srgb, var(--tier) 22%, transparent);}
  .wp-stats i{display:block; font-style:normal; font-size:13px; color:var(--text-dim); margin-bottom:4px;}
  .wp-stats b{font-family:'Oswald',sans-serif; font-size:22px; color:#fff; direction:ltr; display:inline-block;}
  @media (max-width:560px){ .sh-name{font-size:24px;} .more{font-size:11px; padding:3px 10px; margin-top:8px;} .wp-img{height:190px;} }

  html{scroll-padding-top:env(safe-area-inset-top,0px)}
  /* ===== إيكوز (على طريقة Wuthering Waves) ===== */
  .ec-sum{display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px; font-weight:800; font-size:15px; color:#fff;}
  .ec-sum em{font-style:normal; font-family:'Oswald',sans-serif; font-size:13px; color:var(--tier); direction:ltr;}
  .slots{display:grid; grid-template-columns:repeat(5,1fr); gap:6px; margin-bottom:14px;}
  .sl{text-align:center; padding:6px 0; border-radius:10px; border:1px dashed rgba(255,255,255,.15); color:var(--text-dim); opacity:.5;}
  .sl.on{opacity:1; color:#fff; border:1px solid var(--tier); background:color-mix(in srgb, var(--tier) 12%, #0f1422); box-shadow:0 0 10px color-mix(in srgb, var(--tier) 30%, transparent);}
  .sl i{display:block; font-style:normal; font-size:18px; line-height:1.2;}
  .sl b{font-family:'Oswald',sans-serif; font-size:12px;}
  .ep{padding:12px; border-radius:14px; margin-bottom:10px; background:color-mix(in srgb, var(--tier) 6%, #0f1422); border:1px solid color-mix(in srgb, var(--tier) 25%, transparent);}
  .ep.max{border-color:var(--tier); box-shadow:0 0 14px color-mix(in srgb, var(--tier) 22%, transparent);}
  .ep.off{opacity:.5; border-style:dashed;}
  .ep-h{display:flex; justify-content:space-between; align-items:center; gap:8px;}
  .ep-slot{font-weight:800; font-size:14px; color:#fff;}
  .ep-h em{font-style:normal; font-family:'Oswald',sans-serif; font-size:13px; color:var(--tier); direction:ltr; white-space:nowrap;}
  .ep-fam{font-weight:800; font-size:15px; color:#fff; margin:6px 0 7px; line-height:1.4;}
  .ep-bar{height:5px; border-radius:5px; background:rgba(255,255,255,.08); overflow:hidden; margin-bottom:10px;}
  .ep-bar i{display:block; height:100%; background:var(--tier); border-radius:5px;}
  .ep-main{display:flex; justify-content:space-between; align-items:center; gap:8px; padding:9px 10px; border-radius:10px; background:color-mix(in srgb, var(--tier) 14%, #0b0e18); margin-bottom:6px; font-weight:800; color:#fff; font-size:15px;}
  .ep-main small{display:block; font-size:11px; font-weight:600; color:var(--text-dim);}
  .ep-main b{font-family:'Oswald',sans-serif; font-size:20px; color:var(--tier); direction:ltr;}
  .ep-sub{display:flex; justify-content:space-between; gap:8px; font-size:14px; color:#d7ddea; padding:5px 4px; border-top:1px dashed rgba(255,255,255,.08);}
  .ep-sub b{font-family:'Oswald',sans-serif; color:var(--tier); direction:ltr; white-space:nowrap;}
  .ep-sub.lock{color:var(--text-dim);}
  .ep-sub.lock b{color:var(--text-dim); font-family:'Cairo',sans-serif; font-size:12px; font-weight:600;}
  .ep-mon{margin-top:6px; font-size:12px; color:var(--text-dim);}
  .sec-t{font-weight:800; color:var(--gold); font-size:15px; margin:18px 2px 8px;}
  .fam{padding:11px 12px; border-radius:14px; margin-bottom:8px; background:#0f1422; border:1px solid rgba(255,255,255,.08);}
  .fam.full{border-color:var(--tier); box-shadow:0 0 16px color-mix(in srgb, var(--tier) 28%, transparent);}
  .fam-h{display:flex; justify-content:space-between; gap:8px; font-weight:800; font-size:14.5px; color:#fff;}
  .fam-h em{font-style:normal; font-family:'Oswald',sans-serif; color:var(--tier); direction:ltr;}
  .pips{display:flex; gap:5px; margin:7px 0 6px;}
  .pips s{flex:1; height:6px; border-radius:4px; background:rgba(255,255,255,.1);}
  .pips s.on{background:var(--tier);}
  .fam-r{display:flex; gap:10px; font-size:13.5px; color:var(--text-dim); padding:4px 0; border-top:1px dashed rgba(255,255,255,.07);}
  .fam-r i{font-style:normal; flex:0 0 78px;}
  .fam-r.on{color:#e4e9f4;}
  .fam-r b{font-family:'Oswald',sans-serif; color:var(--tier); direction:ltr; display:inline-block;}
  .full-tag{margin-top:6px; font-weight:800; font-size:13px; color:var(--tier);}
  .tots{display:grid; grid-template-columns:1fr 1fr; gap:8px;}
  .tot{display:flex; justify-content:space-between; gap:6px; padding:8px 10px; border-radius:10px; background:color-mix(in srgb, var(--tier) 6%, #0f1422); border:1px solid color-mix(in srgb, var(--tier) 20%, transparent); font-size:13px;}
  .tot i{font-style:normal; color:var(--text-dim);}
  .tot b{font-family:'Oswald',sans-serif; color:var(--tier); direction:ltr; white-space:nowrap;}
  @media (max-width:560px){
    .roster{grid-template-columns:repeat(2,1fr); gap:12px;}
    .art{min-height:260px;}
    .tier-tag{padding:10px 10px 5px; gap:4px;}
    .tier-name,.tier-name.en{font-size:12px; letter-spacing:.05em;}
    .pwr-badge{font-size:11px; padding:3px 8px;}
    .stars{font-size:12px; letter-spacing:.5px; padding:0 10px 8px;}
    .num{font-size:12px; padding:4px 8px; top:8px; left:8px;}
    .plate{padding:12px 8px 14px;}
    .name-en{font-size:17px;}
    .anime-chip{font-size:11px; padding:3px 9px; margin-top:8px;}
    .chip{font-size:15px; padding:5px 12px;}
  }
`

// =====================================================================
// 🔐 واجهات تسجيل الدخول + الإهداء + صندوق الهدايا
// =====================================================================

const EXTRA_CSS = `
  .shell{min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px 16px;}
  .panel{width:100%; max-width:420px; background:#080b14; border:1px solid #1c2236; border-radius:22px; padding:28px 22px; text-align:center;}
  .panel h2{color:var(--gold); font-weight:800; font-size:28px; margin-bottom:18px;}
  .panel .q{margin:18px 0 6px; color:#dfe4f1;}
  .btn{display:block; width:100%; font-family:'Cairo',sans-serif; font-weight:800; font-size:16px; padding:14px; border-radius:14px; border:1.5px solid var(--gold); cursor:pointer; text-decoration:none; text-align:center; margin-top:10px; color:#fff; background:#080b14;}
  .btn.gold{background:var(--gold); color:#0a0d16;}
  .btn.line{border-color:var(--gold-dim);}
  .btn.danger{background:#ff3860; border-color:#ff3860; color:#fff;}
  .btn.purple{background:#b83fff; border-color:#b83fff; color:#fff;}
  .btn:disabled{opacity:.4; cursor:not-allowed;}
  .fld{width:100%; background:#0d1220; border:1px solid #1f2740; border-radius:14px; color:#fff; font-family:'Cairo',sans-serif; font-size:16px; padding:14px; margin-bottom:12px; direction:rtl;}
  .fld:focus{outline:none; border-color:var(--gold);}
  .hint{color:var(--text-dim); font-size:13px; line-height:1.9; margin-top:16px;}
  .hint code{color:var(--gold); font-family:'Oswald',sans-serif; direction:ltr; display:inline-block;}
  .err{color:#ff6b86; font-size:14px; margin:0 0 12px; line-height:1.7;}
  .topbar{display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px; max-width:1700px; margin:0 auto 20px;}
  .who{color:var(--text-dim); font-size:14px;} .who b{color:var(--gold);}
  .pill{display:inline-block; font-family:'Cairo',sans-serif; font-weight:800; font-size:13px; color:var(--gold); border:1px solid var(--gold-dim); border-radius:20px; padding:6px 14px; background:#0f1422; text-decoration:none; cursor:pointer;}
  .pill.fill{background:var(--gold); color:#0a0d16; border-color:var(--gold);}
  .tb-r{display:flex; gap:8px; align-items:center;} .tb-r form{display:inline;}
  .gbox{width:100%; max-width:420px; max-height:100%; overflow-y:auto; background:linear-gradient(180deg,#121830,#0c101e); border:2px solid var(--tier,#b83fff); border-radius:22px; padding:16px; box-shadow:0 0 40px color-mix(in srgb, var(--tier,#b83fff) 30%, transparent), 0 20px 60px rgba(0,0,0,.6);}
  .g-top{display:flex; justify-content:space-between; font-size:13px; color:var(--tier,#b83fff);}
  .g-line{text-align:center; margin:12px 0; color:#fff; font-size:15px;} .g-line b{color:var(--tier,#b83fff);}
  .g-art{height:230px; border-radius:16px; border:2px solid var(--tier,#b83fff); background:color-mix(in srgb, var(--tier,#b83fff) 14%, #0c101e); background-size:cover; background-position:center top; display:flex; align-items:center; justify-content:center; font-size:72px; color:var(--tier,#b83fff);}
  .g-name{font-family:'Oswald',sans-serif; font-size:28px; font-weight:600; color:#fff; text-align:center; direction:ltr; margin:14px 0 8px; word-break:break-word;}
  .g-chip{display:table; margin:0 auto 14px; font-family:'Oswald',sans-serif; font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--tier,#b83fff); border:1px solid var(--tier,#b83fff); border-radius:20px; padding:3px 14px; direction:ltr;}
  .g-stats{display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;}
  .g-stats div{padding:10px 6px; text-align:center; border-radius:12px; background:#0b0e18; border:1px solid #1f2740;}
  .g-stats i{display:block; font-style:normal; font-size:12px; color:var(--text-dim);} .g-stats b{font-family:'Oswald',sans-serif; font-size:20px; color:var(--tier,#b83fff); direction:ltr; display:inline-block;}
  .g-evo{text-align:center; font-size:14px; color:var(--text-dim);} .g-evo span{color:var(--tier,#b83fff); letter-spacing:2px; direction:ltr; display:inline-block;}
  .g-ago{text-align:center; font-size:12px; color:var(--text-dim); margin:6px 0 12px;}
  .gmode{display:inline-block; font-weight:800; font-size:12px; color:var(--gold); border:1px solid var(--gold-dim); border-radius:20px; padding:4px 12px;}
  .ginfo{max-width:1700px; margin:0 auto 18px; text-align:center; color:var(--text-dim); font-size:14px; line-height:1.9;}
  .ggrid{display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:14px; max-width:1700px; margin:0 auto 26px;}
  .gcard{position:relative; border:2.5px solid var(--tier); border-radius:14px; background:color-mix(in srgb, var(--tier) 8%, #0f1422); padding:8px; text-align:center; cursor:pointer; user-select:none; transition:transform .12s, box-shadow .12s;}
  .gcard .gt{font-family:'Oswald',sans-serif; font-size:12px; text-align:left; color:var(--tier); direction:ltr; letter-spacing:.08em; margin-bottom:6px;}
  .gcard .ga{height:150px; border-radius:10px; border:2px solid color-mix(in srgb, var(--tier) 70%, transparent); background-size:cover; background-position:center top; background-color:#151a28; display:flex; align-items:center; justify-content:center; font-size:44px; color:var(--tier);}
  .gcard .gn{margin-top:8px; font-family:'Oswald',sans-serif; font-size:15px; color:#fff; direction:ltr; word-break:break-word;}
  .gcard .gs{font-size:12px; color:var(--tier); min-height:18px; font-weight:800;}
  .gcard.on{box-shadow:0 0 22px color-mix(in srgb, var(--tier) 60%, transparent); transform:translateY(-2px); background:color-mix(in srgb, var(--tier) 22%, #0f1422);}
  .gcard.locked{opacity:.45; cursor:not-allowed; filter:grayscale(.5);}
  .gcard.text .ga{display:none;}
  .gpanel{max-width:560px; margin:0 auto 30px; background:#0f1426; border:1px solid #232b45; border-radius:20px; padding:18px;}
  .gp-count{text-align:center; font-weight:800; color:#fff;} .gp-count b{color:var(--gold);}
  .gp-price{text-align:center; color:var(--text-dim); font-size:14px; margin:6px 0 14px;}
  .gp-sum{font-size:14px; line-height:1.9; color:#cfd6e6; text-align:center; margin:0 0 12px; padding:10px; border-top:1px dashed #2a3350; border-bottom:1px dashed #2a3350;} .gp-sum b{color:var(--gold);}
  .gp-msg{text-align:center; font-size:14px; line-height:1.8; margin:0 0 10px; padding:9px; border-radius:12px;}
  .gp-msg.bad{color:#ff8aa0; background:rgba(255,56,96,.1);} .gp-msg.good{color:#7dffb0; background:rgba(60,255,140,.1);} .gp-msg.warn{color:var(--gold); background:rgba(240,192,74,.1);}
  .jump{position:fixed; bottom:calc(14px + env(safe-area-inset-bottom,0px)); left:50%; transform:translateX(-50%); z-index:40; background:var(--gold); color:#0a0d16; font-weight:800; border-radius:30px; padding:10px 22px; text-decoration:none; box-shadow:0 8px 24px rgba(0,0,0,.5); font-size:14px;}
  .jump[hidden]{display:none;}
`

function jsonForScript(o) {
    return JSON.stringify(o)
        .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

function shellHead(title) {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${BASE_CSS}${EXTRA_CSS}</style>
</head>`
}

// 1) الشاشة الأولى: مشاهدة فقط / تسجيل دخول
function gateHTML({ code, title, total }) {
    return `${shellHead(title)}
<body><div class="shell"><div class="panel">
  <div class="eyebrow">Character Roster</div>
  <h1 style="font-size:34px">شخصيات ${esc(title)}</h1>
  <div class="sub" style="margin-bottom:6px">CHARACTERS ${Number(total) || 0}</div>
  <div class="q">كيف تريد الدخول؟</div>
  <a class="btn line" href="/u/${code}/view">مشاهدة فقط</a>
  <a class="btn gold" href="/login?code=${code}">تسجيل دخول</a>
  <div class="hint">تسجيل الدخول لصاحب الحساب فقط،<br>ويفتح الإهداء وصندوق الهدايا.</div>
</div></div></body></html>`
}

// 2) شاشة تسجيل الدخول
function loginHTML({ code, csrf, error, disabled }) {
    return `${shellHead('تسجيل الدخول')}
<body><div class="shell"><div class="panel">
  <h2>تسجيل الدخول</h2>
  ${error ? `<p class="err">${esc(error)}</p>` : ''}
  ${disabled ? '' : `<form method="post" action="/login" autocomplete="on">
    <input type="hidden" name="csrf" value="${esc(csrf)}">
    <input type="hidden" name="code" value="${esc(code)}">
    <input class="fld" name="username" placeholder="اليوزر" autocomplete="username" maxlength="20" required>
    <input class="fld" name="password" type="password" placeholder="كلمة المرور" autocomplete="current-password" maxlength="200" required>
    <button class="btn gold" type="submit">دخول</button>
  </form>`}
  <a class="btn line" href="/u/${esc(code)}">رجوع</a>
  <div class="hint">نسيت كلمة المرور أو أول مرة؟<br>اكتب أمر السر للبوت في الخاص:<br><code>.كلمة_السر</code></div>
</div></div></body></html>`
}

function viewerBarHTML(viewer, code) {
    if (!viewer) return ''
    if (viewer.isOwner) {
        return `<div class="topbar">
      <span class="who">مسجّل كـ <b>${esc(viewer.name)}</b></span>
      <span class="tb-r">
        <a class="pill fill" href="/u/${code}/pull">🎴 سحب شخصية</a>
        <span class="bcdw"><a class="pill fill" href="/u/${code}/boss">👑 هجوم الزعيم</a><small class="bcd" id="bcd" hidden></small></span>
        <a class="pill fill" href="/u/${code}/gift">🎁 وضع الإهداء</a>
        <a class="pill fill" href="/u/${code}/sell">💰 بيع شخصيات</a>
        <a class="pill" href="/u/${code}/log">📜 سجل الإهداءات</a>
        <form method="post" action="/logout"><input type="hidden" name="csrf" value="${esc(viewer.csrf)}"><input type="hidden" name="code" value="${code}"><button class="pill" type="submit">خروج</button></form>
      </span></div>
<style>.bcdw{display:inline-flex;flex-direction:column;align-items:center;gap:3px;vertical-align:top}.bcd{font-size:11px;font-weight:800;color:var(--gold);font-family:'Cairo',sans-serif;white-space:nowrap}</style>
<script>
(function(){
  var el=document.getElementById('bcd'); if(!el) return;
  var end=0, fin=false, known=false, lastLoad=0;
  function mm(ms){ var s=Math.ceil(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), r=s%60; function z(n){ return (n<10?'0':'')+n; } return (h>0?h+':'+z(m):m)+':'+z(r); }
  function render(){
    if(!fin){ el.hidden=true; return; }
    el.hidden=false;
    var l=end-Date.now();
    if(known && l<=0 && Date.now()-lastLoad>4000) load();
    el.textContent=known?(l>0?'⏳ الزعيم القادم بعد '+mm(l):'جارٍ استدعاء الزعيم…'):'⏳ الزعيم القادم عند رأس الساعة';
  }
  function load(){
    if(document.hidden) return; lastLoad=Date.now();
    fetch('/boss/state?since=999999999',{credentials:'same-origin'})
      .then(function(r){ return r.ok?r.json():null; })
      .then(function(j){
        if(!j||!j.ok||!j.state||!j.state.boss){ fin=false; render(); return; }
        var b=j.state.boss; fin=!!b.finished; known=(b.respawnInMs!=null);
        end=known?Date.now()+b.respawnInMs:0; render();
      }).catch(function(){});
  }
  load(); setInterval(load,15000); setInterval(render,1000);
})();
</script>`
    }
    return `<div class="topbar"><span class="who">وضع المشاهدة</span><a class="pill" href="/login?code=${code}">🔐 تسجيل دخول</a></div>`
}

// صفحة سجل الإهداءات (للمالك فقط)
function logPageHTML({ log, code, csrf }) {
    const fmt = t => { try { return new Date(Number(t)).toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' }) } catch (e) { return '' } }
    const rows = log.map(e => {
        const out = e.dir === 'out'
        const who = esc(String(e.otherName || 'لاعب')) + (e.otherUsername ? ` <small>(@${esc(String(e.otherUsername))})</small>` : '')
        const chars = (Array.isArray(e.chars) ? e.chars : []).map(c =>
            `<span class="lg-ch">${esc(String(c.name || ''))} <small>${esc(String(c.rarity || ''))} · ⚡${Number(c.power) || 0}</small></span>`).join('')
        const cost = out && Number(e.cost) > 0 ? `<div class="lg-cost">💰 ${Number(e.cost).toLocaleString('en-US')}</div>` : ''
        return `<div class="lg-row ${out ? 'lg-out' : 'lg-in'}">
      <div class="lg-h"><b>${out ? '📤 أهديت إلى' : '📥 وصلتك هدية من'} ${who}</b><span class="lg-t">${esc(fmt(e.at))}${e.source === 'site' ? ' · من الموقع' : e.source === 'command' ? ' · بالأمر' : ''}</span></div>
      <div class="lg-c">${chars}</div>${cost}</div>`
    }).join('')
    return shellHead('سجل الإهداءات') + `
<style>
.lg-wrap{max-width:760px;margin:0 auto;padding:16px}
.lg-row{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px;margin:10px 0}
.lg-out{border-inline-start:4px solid #e67e22}.lg-in{border-inline-start:4px solid #2ecc71}
.lg-h{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.lg-t{opacity:.7;font-size:.85em}
.lg-ch{display:inline-block;background:rgba(255,255,255,.1);border-radius:8px;padding:3px 8px;margin:6px 4px 0 0}
.lg-cost{margin-top:6px;opacity:.85}.lg-empty{text-align:center;opacity:.7;padding:40px 0}
</style>
<body>
<div class="topbar"><span class="who">📜 سجل الإهداءات (آخر 100)</span><span class="tb-r"><a class="pill" href="/u/${esc(code)}">رجوع</a></span></div>
<div class="lg-wrap">${rows || '<div class="lg-empty">لا توجد إهداءات بعد.</div>'}</div>
</body></html>`
}

// تجهيز الهدايا غير المستلمة للعرض (الصورة الأحدث من الكتالوج، ونمرر فقط روابط آمنة)
function prepareGifts(inbox, catIdx) {
    return (inbox || [])
        .filter(g => g && !g.seen)
        .sort((a, b) => (a.at || 0) - (b.at || 0))
        .slice(0, 50)
        .map(g => {
            const tierKey = resolveTierKey(g.rarity, g.evolutionLevel)
            const t = TIERS[tierKey] || TIERS['SSS']
            const latest = catIdx.get(`${g.name}|${g.rarity}|${g.form}`)
            const evo = Number(g.evolutionLevel) || 0
            return {
                id: String(g.id || ''),
                from: String(g.fromName || 'لاعب'),
                name: String(g.name || ''),
                anime: String((latest && latest.anime) || g.anime || ''),
                tier: tierKey === 'Ω OMEGA' ? 'Ω OMEGA' : tierKey,
                color: t.color,
                power: Number(g.power) || 0,
                evo: tierKey === 'Ω OMEGA' ? 7 : Math.min(evo, 6),
                omega: tierKey === 'Ω OMEGA',
                img: safeImageUrl(g.image || (latest && latest.image)),
                at: Number(g.at) || Date.now()
            }
        })
        .filter(g => /^[a-f0-9]{16}$/.test(g.id))
}

// نافذة صندوق الهدايا عند الدخول
function inboxPopupHTML(viewer) {
    if (!viewer || !viewer.isOwner || !viewer.gifts || !viewer.gifts.length) return ''
    return `<div class="overlay" id="gov" hidden><div class="gbox" id="gbox"></div></div>
<script>
(function(){
  var G=${jsonForScript(viewer.gifts)}, CSRF=${jsonForScript(viewer.csrf)}, i=0;
  var ov=document.getElementById('gov'), box=document.getElementById('gbox');
  function ago(t){var s=Math.floor((Date.now()-t)/1000); if(s<120) return 'قبل قليل'; var m=Math.floor(s/60); if(m<60) return 'قبل '+m+' دقيقة'; var h=Math.floor(m/60); if(h<24) return 'قبل '+h+' ساعة'; return 'قبل '+Math.floor(h/24)+' يوم';}
  function el(tag,cls,txt){var e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e;}
  function ack(id){ try{ fetch('/gift/ack',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:CSRF,id:id})}).catch(function(){}); }catch(e){} }
  function render(){
    var g=G[i]; if(!g){ ov.hidden=true; document.body.style.overflow=''; return; }
    box.style.setProperty('--tier', g.color); box.innerHTML='';
    var top=el('div','g-top'); top.appendChild(el('span','',(i+1)+' / '+G.length)); top.appendChild(el('span','','هدية جديدة')); box.appendChild(top);
    var line=el('div','g-line','أهداك '); line.appendChild(el('b','',g.from)); line.appendChild(document.createTextNode(' شخصية')); box.appendChild(line);
    var art=el('div','g-art'); if(g.img){ art.style.backgroundImage="url('"+g.img+"')"; } else { art.textContent='👤'; } box.appendChild(art);
    box.appendChild(el('div','g-name',g.name)); if(g.anime) box.appendChild(el('div','g-chip',g.anime));
    var st=el('div','g-stats'); var a=el('div'); a.appendChild(el('i','','القوة')); a.appendChild(el('b','',Number(g.power).toLocaleString('en-US'))); var b=el('div'); b.appendChild(el('i','','الرتبة')); b.appendChild(el('b','',g.tier)); st.appendChild(a); st.appendChild(b); box.appendChild(st);
    var evo=el('div','g-evo','التطوير '); var stars=g.omega? '🌌' : new Array(g.evo+1).join('★')+new Array(6-g.evo+1).join('☆'); evo.appendChild(el('span','',stars)); evo.appendChild(document.createTextNode(g.omega? ' (Ω)' : ' ('+g.evo+'/6)')); box.appendChild(evo);
    box.appendChild(el('div','g-ago',ago(g.at)));
    var btn=el('button','btn purple','استلام والتالية'); btn.type='button';
    btn.onclick=function(){ btn.disabled=true; ack(g.id); i++; render(); };
    box.appendChild(btn);
  }
  ov.hidden=false; document.body.style.overflow='hidden'; render();
})();
</script>`
}

// 3) وضع الإهداء
function giftCardHTML(c) {
    const tierKey = resolveTierKey(c.rarity, c.evolutionLevel)
    const t = TIERS[tierKey] || TIERS['عادي']
    const omega = tierKey === 'Ω OMEGA' || Number(c.evolutionLevel) >= 7
    const hasImg = t.idx >= FIRST_IMAGE_TIER
    const src = hasImg ? safeImageUrl(c.image) : null
    const art = hasImg
        ? `<div class="ga" style="${src ? `background-image:url('${esc(src)}')` : ''}">${src ? '' : '👤'}</div>`
        : ''
    const data = omega ? '' : `data-k="${c.__key}" data-n="${esc(c.name)}"`
    return `<div class="gcard ${hasImg ? '' : 'text'} ${omega ? 'locked' : ''}" style="--tier:${t.color}" ${data} role="button" tabindex="0">
      <div class="gt">${esc(tierKey)}</div>${art}<div class="gn">${esc(c.name)}</div><div class="gs">${omega ? 'لا يُهدى' : ''}</div></div>`
}

function giftPageHTML({ title, viewer, items, page, pages, code, costText }) {
    return `${shellHead('وضع الإهداء')}
<body><div style="padding:30px 16px 90px">
  <div class="topbar">
    <span><span class="gmode">وضع الإهداء</span> <span class="who">مسجّل كـ <b>${esc(viewer.name)}</b></span></span>
    <a class="pill" href="/u/${code}">← رجوع للعرض</a>
  </div>
  <div class="ginfo">اختر الشخصيات التي تريد إهداءها<br>(الحد الأقصى خمس شخصيات — شخصيات Ω لا تُهدى)<br><small>الصفحة ${page}/${pages}</small></div>
  <div class="ggrid">${items.map(giftCardHTML).join('')}</div>
  ${pagerHTML(`/u/${code}/gift`, page, pages)}
  <section class="gpanel" id="gp" style="margin-top:26px">
    <div class="gp-count">المحددة: <b id="gc">0</b> من 5</div>
    <div class="gp-price">سعر الإهداء: ${esc(costText)}</div>
    <input class="fld" id="to" placeholder="يوزر المستلم" autocomplete="off" autocapitalize="off" maxlength="10">
    <div class="gp-sum" id="sum" hidden></div>
    <input class="fld" id="pw" type="password" placeholder="أعد كتابة كلمة المرور للتأكيد" autocomplete="current-password" maxlength="200">
    <div class="gp-msg" id="msg" hidden></div>
    <button class="btn danger" id="go" type="button" disabled>تأكيد الإهداء</button>
  </section>
  <a class="jump" id="jump" href="#gp" hidden></a>
</div>
<script>
(function(){
  var MAX=5, CODE=${jsonForScript(code)}, CSRF=${jsonForScript(viewer.csrf)}, KEY='gsel:'+CODE;
  var sel={}; try{ sel=JSON.parse(sessionStorage.getItem(KEY)||'{}')||{}; }catch(e){ sel={}; }
  var busy=false, op=uuid();
  function $(id){ return document.getElementById(id); }
  function uuid(){ if(window.crypto&&crypto.randomUUID) return crypto.randomUUID(); var s=''; for(var i=0;i<36;i++){ if(i==8||i==13||i==18||i==23) s+='-'; else s+=Math.floor(Math.random()*16).toString(16); } return s; }
  function save(){ try{ sessionStorage.setItem(KEY,JSON.stringify(sel)); }catch(e){} }
  function keys(){ return Object.keys(sel); }
  function validUser(v){ return /^[A-Za-z\u0600-\u06FF]{1,10}$/.test(v); }
  function show(kind,text){ var m=$('msg'); if(!text){ m.hidden=true; return; } m.className='gp-msg '+kind; m.textContent=text; m.hidden=false; }
  function rotate(){ op=uuid(); }
  function refresh(){
    var n=keys().length, to=$('to').value.trim(), pw=$('pw').value;
    $('gc').textContent=n;
    var cards=document.querySelectorAll('.gcard[data-k]');
    for(var i=0;i<cards.length;i++){ var on=!!sel[cards[i].getAttribute('data-k')]; cards[i].classList.toggle('on',on); cards[i].querySelector('.gs').textContent=on?'✓ محدد':''; }
    var sum=$('sum');
    if(n>0&&validUser(to)){ var names=keys().map(function(k){return sel[k];}).join('، '); sum.innerHTML=''; sum.appendChild(document.createTextNode('سيتم إهداء ')); var b=document.createElement('b'); b.textContent=names; sum.appendChild(b); sum.appendChild(document.createTextNode(' إلى @'+to+'. ستُخصم ${esc(costText)} ولا يمكن التراجع.')); sum.hidden=false; } else { sum.hidden=true; }
    $('go').disabled = busy || n<1 || !validUser(to) || !pw;
    var j=$('jump'); if(n>0){ j.textContent='المحددة '+n+'/'+MAX+' — متابعة ↓'; j.hidden=false; } else { j.hidden=true; }
  }
  function toggle(card){
    var k=card.getAttribute('data-k'); if(!k||busy) return;
    if(sel[k]){ delete sel[k]; } else { if(keys().length>=MAX){ show('warn','الحد الأقصى '+MAX+' شخصيات.'); return; } sel[k]=card.getAttribute('data-n'); }
    show(null); save(); rotate(); refresh();
  }
  document.addEventListener('click',function(e){ var c=e.target.closest&&e.target.closest('.gcard[data-k]'); if(c) toggle(c); });
  document.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ var c=document.activeElement; if(c&&c.matches&&c.matches('.gcard[data-k]')){ e.preventDefault(); toggle(c); } } });
  $('to').addEventListener('input',function(){ rotate(); refresh(); });
  $('pw').addEventListener('input',refresh);
  $('go').addEventListener('click',function(){
    if(busy) return;
    var to=$('to').value.trim(), pw=$('pw').value, ks=keys();
    if(ks.length<1||!validUser(to)||!pw) return;
    busy=true; $('go').disabled=true; $('go').textContent='جارٍ التنفيذ…'; show('warn','جارٍ تنفيذ الإهداء، لا تغلق الصفحة…');
    var picks=ks.map(function(k){ return k.split(':')[0]; });
    var ctl=('AbortController' in window)?new AbortController():null; var tm=setTimeout(function(){ if(ctl) ctl.abort(); },30000);
    fetch('/gift',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:ctl?ctl.signal:undefined,
      body:JSON.stringify({csrf:CSRF,code:CODE,op:op,picks:picks,to:to,password:pw})})
    .then(function(r){ return r.json().catch(function(){ return {ok:false,message:'رد غير مفهوم من السيرفر'}; }).then(function(j){ return {s:r.status,j:j}; }); })
    .then(function(x){
      clearTimeout(tm);
      if(x.j.ok){ sel={}; save(); $('pw').value=''; show('good',x.j.message); setTimeout(function(){ location.href='/u/'+CODE; },1800); return; }
      if(x.s===401){ location.href='/login?code='+CODE; return; }
      $('go').textContent='تأكيد الإهداء';
      if(x.j.code==='BAD_PW'){ $('pw').value=''; }
      if(x.j.code==='STALE'){ sel={}; save(); show('bad',x.j.message); setTimeout(function(){ location.reload(); },1800); return; }
      show('bad',x.j.message||'فشل الإهداء'); busy=false; refresh();
    })
    .catch(function(){
      clearTimeout(tm); $('go').textContent='تأكيد الإهداء';
      show('warn','لم يصلنا رد من السيرفر — قد تكون العملية تمت. افتح صفحة شخصياتك للتأكد. إعادة المحاولة آمنة ولن تكرر الإهداء.');
      busy=false; refresh();
    });
  });
  refresh();
})();
</script></body></html>`
}

// 3.5) صفحة بيع الشخصيات: اختيار من القائمة + كتابة «تأكيد»
function sellCardHTML(c) {
    const tierKey = resolveTierKey(c.rarity, c.evolutionLevel)
    const t = TIERS[tierKey] || TIERS['عادي']
    const omega = tierKey === 'Ω OMEGA' || Number(c.evolutionLevel) >= 7
    const hasImg = t.idx >= FIRST_IMAGE_TIER
    const src = hasImg ? safeImageUrl(c.image) : null
    const art = hasImg
        ? `<div class="ga" style="${src ? `background-image:url('${esc(src)}')` : ''}">${src ? '' : '👤'}</div>`
        : ''
    const price = Math.max(100, Math.floor((Number(c.power) || 0) / 2))
    const important = t.idx >= TIERS['SSS'].idx || Number(c.evolutionLevel) > 0
    const label = omega ? 'لا تُباع' : '💰 ' + price.toLocaleString('en-US')
    const data = omega ? '' : `data-k="${c.__key}" data-n="${esc(c.name)}" data-p="${price}" data-i="${important ? 1 : 0}" data-gs="${esc(label)}"`
    return `<div class="gcard ${hasImg ? '' : 'text'} ${omega ? 'locked' : ''}" style="--tier:${t.color}" ${data} role="button" tabindex="0">
      <div class="gt">${esc(tierKey)}</div>${art}<div class="gn">${esc(c.name)}</div><div class="gs">${esc(label)}</div></div>`
}

function sellPageHTML({ viewer, items, page, pages, code }) {
    return `${shellHead('بيع الشخصيات')}
<body><div style="padding:30px 16px 90px">
  <div class="topbar">
    <span><span class="gmode">بيع الشخصيات</span> <span class="who">مسجّل كـ <b>${esc(viewer.name)}</b></span></span>
    <a class="pill" href="/u/${code}">← رجوع للعرض</a>
  </div>
  <div class="ginfo">اختر الشخصيات التي تريد بيعها ثم اكتب «تأكيد»<br>(سعر الشخصية = نصف قوتها وبحد أدنى 100 — شخصيات Ω لا تُباع)<br><small>الصفحة ${page}/${pages}</small></div>
  <div class="ggrid">${items.map(sellCardHTML).join('')}</div>
  ${pagerHTML(`/u/${code}/sell`, page, pages)}
  <section class="gpanel" id="gp" style="margin-top:26px">
    <div class="gp-count">المحددة: <b id="gc">0</b></div>
    <div class="gp-price" id="gprice">إجمالي سعر البيع: 0</div>
    <div class="gp-sum" id="sum" hidden></div>
    <input class="fld" id="cf" placeholder="اكتب: تأكيد" autocomplete="off" maxlength="20">
    <div class="gp-msg" id="msg" hidden style="white-space:pre-wrap"></div>
    <button class="btn danger" id="go" type="button" disabled>تأكيد البيع</button>
  </section>
  <a class="jump" id="jump" href="#gp" hidden></a>
</div>
<script>
(function(){
  var MAX=50, CODE=${jsonForScript(code)}, CSRF=${jsonForScript(viewer.csrf)}, KEY='ssel:'+CODE;
  var sel={}; try{ sel=JSON.parse(sessionStorage.getItem(KEY)||'{}')||{}; }catch(e){ sel={}; }
  var busy=false;
  function $(id){ return document.getElementById(id); }
  function save(){ try{ sessionStorage.setItem(KEY,JSON.stringify(sel)); }catch(e){} }
  function keys(){ return Object.keys(sel); }
  function fm(n){ return Number(n).toLocaleString('en-US'); }
  function okWord(v){ return v.trim().replace(/[\\u0623\\u0625\\u0622]/g,'\\u0627')==='\\u062a\\u0627\\u0643\\u064a\\u062f'; }
  function show(kind,text){ var m=$('msg'); if(!text){ m.hidden=true; return; } m.className='gp-msg '+kind; m.textContent=text; m.hidden=false; }
  function refresh(){
    var ks=keys(), n=ks.length, total=0, imp=0;
    ks.forEach(function(k){ total+=sel[k].p; if(sel[k].i) imp++; });
    $('gc').textContent=n;
    $('gprice').textContent='إجمالي سعر البيع: '+fm(total);
    var cards=document.querySelectorAll('.gcard[data-k]');
    for(var i=0;i<cards.length;i++){ var on=!!sel[cards[i].getAttribute('data-k')]; cards[i].classList.toggle('on',on); cards[i].querySelector('.gs').textContent=on?'✓ محدد':cards[i].getAttribute('data-gs'); }
    var sum=$('sum');
    if(n>0){
      var names=ks.slice(0,8).map(function(k){ return sel[k].n; }).join('، ')+(n>8?' … و '+(n-8)+' أخرى':'');
      sum.innerHTML=''; sum.appendChild(document.createTextNode('سيتم بيع ')); var b=document.createElement('b'); b.textContent=names; sum.appendChild(b);
      sum.appendChild(document.createTextNode(' مقابل '+fm(total)+' (قبل بونص القط). لا يمكن التراجع.'+(imp?' ⚠️ منها '+imp+' شخصية مهمة (SSS أو مطوّرة).':'')));
      sum.hidden=false;
    } else { sum.hidden=true; }
    $('go').disabled = busy || n<1 || !okWord($('cf').value);
    var j=$('jump'); if(n>0){ j.textContent='المحددة '+n+' — متابعة ↓'; j.hidden=false; } else { j.hidden=true; }
  }
  function toggle(card){
    var k=card.getAttribute('data-k'); if(!k||busy) return;
    if(sel[k]){ delete sel[k]; } else {
      if(keys().length>=MAX){ show('warn','الحد الأقصى '+MAX+' شخصية بكل عملية.'); return; }
      sel[k]={n:card.getAttribute('data-n'),p:Number(card.getAttribute('data-p'))||0,i:card.getAttribute('data-i')==='1'};
    }
    show(null); save(); refresh();
  }
  document.addEventListener('click',function(e){ var c=e.target.closest&&e.target.closest('.gcard[data-k]'); if(c) toggle(c); });
  document.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ var c=document.activeElement; if(c&&c.matches&&c.matches('.gcard[data-k]')){ e.preventDefault(); toggle(c); } } });
  $('cf').addEventListener('input',refresh);
  $('go').addEventListener('click',function(){
    if(busy) return;
    var ks=keys(); if(ks.length<1||!okWord($('cf').value)) return;
    busy=true; $('go').disabled=true; $('go').textContent='جارٍ البيع…'; show('warn','جارٍ تنفيذ البيع، لا تغلق الصفحة…');
    var picks=ks.map(function(k){ return k.split(':')[0]; });
    var ctl=('AbortController' in window)?new AbortController():null; var tm=setTimeout(function(){ if(ctl) ctl.abort(); },30000);
    fetch('/sell',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:ctl?ctl.signal:undefined,
      body:JSON.stringify({csrf:CSRF,code:CODE,picks:picks,confirm:$('cf').value.trim()})})
    .then(function(r){ return r.json().catch(function(){ return {ok:false,message:'رد غير مفهوم من السيرفر'}; }).then(function(j){ return {s:r.status,j:j}; }); })
    .then(function(x){
      clearTimeout(tm);
      if(x.s===401){ location.href='/login?code='+CODE; return; }
      if(x.j.ok){ sel={}; save(); $('cf').value=''; show('good',x.j.message); setTimeout(function(){ location.reload(); },1800); return; }
      $('go').textContent='تأكيد البيع';
      if(x.j.code==='STALE'){ sel={}; save(); show('bad',x.j.message); setTimeout(function(){ location.reload(); },1800); return; }
      show('bad',x.j.message||'فشل البيع'); busy=false; refresh();
    })
    .catch(function(){
      clearTimeout(tm); $('go').textContent='تأكيد البيع';
      show('warn','لم يصلنا رد من السيرفر — قد يكون البيع تم. حدّث الصفحة للتأكد من شخصياتك ورصيدك قبل إعادة المحاولة.');
      busy=false; refresh();
    });
  });
  refresh();
})();
</script></body></html>`
}

// 4) صفحة السحب (.اسحب من الموقع)
function pullPageHTML({ viewer, code, state }) {
    return `${shellHead('سحب شخصية')}
<style>
.pl-wrap{max-width:560px;margin:0 auto;}
.pl-stats{display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px;}
.pl-st{padding:12px 6px; text-align:center; border-radius:14px; background:#0b0e18; border:1px solid #1f2740;}
.pl-st i{display:block; font-style:normal; font-size:12px; color:var(--text-dim); margin-bottom:2px;}
.pl-st b{font-family:'Oswald',sans-serif; font-size:22px; color:var(--gold); direction:ltr; display:inline-block;}
.pl-reset{text-align:center; font-size:13px; color:var(--text-dim); margin-bottom:14px; min-height:20px;}
.pl-res{display:flex; flex-direction:column; align-items:center; margin:22px 0 6px;}
.pl-res .card{width:100%; max-width:320px; cursor:default;}
.pl-res .art{min-height:340px;}
.pl-sss{font-weight:900; font-size:18px; color:#ff3860; text-align:center; margin-bottom:12px; text-shadow:0 0 14px rgba(255,56,96,.55);}
.pl-note{max-width:320px; width:100%; margin-top:12px; font-size:13.5px; line-height:1.9; text-align:center; color:#cfd6e6; white-space:pre-wrap;}
.pl-note b{color:var(--gold);}
.pl-pop{animation:plpop .45s ease-out;}
@keyframes plpop{from{opacity:0; transform:scale(.88) translateY(10px);} to{opacity:1; transform:none;}}
.pl-hist-t{text-align:center; font-weight:800; color:var(--gold-dim); margin:26px 0 10px; font-size:15px;}
.pl-hist{display:flex; flex-wrap:wrap; justify-content:center; gap:8px;}
.pl-hist .chip{font-size:14px; padding:4px 12px;}
.pl-sell{max-width:320px; width:100%;}
.pl-mg{margin-top:14px; padding-top:14px; border-top:1px solid #1f2740;}
.pl-mg-t{text-align:center; font-weight:800; color:var(--gold-dim); font-size:14px; margin-bottom:2px;}
@media (max-width:560px){ .pl-res .art{min-height:280px;} }
</style>
<body><div style="padding:30px 16px 60px">
  <div class="topbar">
    <span><span class="gmode">سحب شخصية</span> <span class="who">مسجّل كـ <b>${esc(viewer.name)}</b></span></span>
    <a class="pill" href="/u/${code}">← رجوع للعرض</a>
  </div>
  <div class="pl-wrap">
    <section class="gpanel" style="margin-top:0">
      <div class="pl-stats">
        <div class="pl-st"><i>🎟️ السحبات</i><b id="s-pulls">-</b></div>
        <div class="pl-st"><i>🎯 الضمان</i><b id="s-pity">-</b></div>
        <div class="pl-st"><i>📦 المخزون</i><b id="s-cap">-</b></div>
      </div>
      <div class="pl-reset" id="reset"></div>
      <div class="gp-msg" id="msg" hidden style="white-space:pre-wrap"></div>
      <button class="btn gold" id="go" type="button">🎴 اسحب</button>
      <div class="pl-mg">
        <div class="pl-mg-t">🔥 الدمج الشامل (كل 5 شخصيات ➜ شخصية أعلى)</div>
        <button class="btn purple" id="mg-good" type="button">🔥 دمج الكل ممتاز ➜ أسطوري</button>
        <button class="btn purple" id="mg-leg" type="button">🔥 دمج الكل أسطوري ➜ SSS</button>
      </div>
      <div class="pl-mg">
        <div class="pl-mg-t">💰 بيع الشخصيات (تختار اللي تبيعه وتكتب تأكيد)</div>
        <a class="btn danger" href="/u/${code}/sell">💰 بيع شخصيات</a>
      </div>
    </section>
    <div class="pl-res" id="res"></div>
    <div id="histw" hidden><div class="pl-hist-t">سحباتك في هذه الجلسة</div><div class="pl-hist" id="hist"></div></div>
  </div>
</div>
<script>
(function(){
  var CODE=${jsonForScript(code)}, CSRF=${jsonForScript(viewer.csrf)}, S=${jsonForScript(state)};
  var busy=false, hist=[], endAt=Date.now()+S.resetIn*1000, reloading=false;
  function $(id){ return document.getElementById(id); }
  function el(tag,cls,txt){ var e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
  function show(kind,text){ var m=$('msg'); if(!text){ m.hidden=true; return; } m.className='gp-msg '+kind; m.textContent=text; m.hidden=false; }
  function stats(){
    $('s-pulls').textContent=S.pulls+'/'+S.max;
    $('s-pity').textContent=S.pity+'/'+S.pityMax;
    $('s-cap').textContent=S.count+'/'+S.cap;
    $('go').disabled=busy;
    $('mg-good').disabled=busy; $('mg-leg').disabled=busy;
  }
  function tick(){
    var s=Math.max(0,Math.ceil((endAt-Date.now())/1000));
    $('reset').textContent='🎁 تتجدد السحبات عند رأس الساعة — بعد '+Math.floor(s/60)+' دقيقة '+(s%60)+' ثانية';
    if(s<=0 && !reloading && S.pulls<=0){ reloading=true; location.reload(); }
  }
  function card(c){
    var d=el('div','card pl-pop'); d.style.setProperty('--tier',c.color);
    var tt=el('div','tier-tag'); tt.appendChild(el('span','tier-name '+c.lang,c.tier)); tt.appendChild(el('span','pwr-badge',Number(c.power).toLocaleString('en-US')+' PWR')); d.appendChild(tt);
    d.appendChild(el('div','stars',new Array(c.stars+1).join('★')));
    var art=el('div','art'); if(c.img){ art.style.backgroundImage="url('"+c.img+"')"; } else { art.style.background='linear-gradient(160deg,#333,#111)'; } art.appendChild(el('div','fade')); d.appendChild(art);
    var pl=el('div','plate'); pl.appendChild(el('div','name-en',c.name)); if(c.anime) pl.appendChild(el('div','anime-chip',c.anime)); d.appendChild(pl);
    return d;
  }
  function renderResult(j){
    var r=$('res'); r.innerHTML='';
    var c=j.card;
    if(c.sss) r.appendChild(el('div','pl-sss','🌌 إيقاظ أسطوري 🌌'));
    r.appendChild(card(c));
    var notes=j.notes||[];
    if(notes.length){ var n=el('div','pl-note'); n.textContent=notes.join('\\n\\n'); r.appendChild(n); }

    hist.unshift(c); if(hist.length>12) hist.pop();
    var h=$('hist'); h.innerHTML='';
    hist.forEach(function(x,i){ var ch=el('span','chip'); ch.style.setProperty('--tier',x.color); var ix=el('i','',String(hist.length-i)); ch.appendChild(ix); ch.appendChild(document.createTextNode(x.name)); h.appendChild(ch); });
    $('histw').hidden=false;
  }
  function post(url,body,done){
    busy=true; stats();
    var ctl=('AbortController' in window)?new AbortController():null; var tm=setTimeout(function(){ if(ctl) ctl.abort(); },30000);
    body.csrf=CSRF; body.code=CODE;
    fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:ctl?ctl.signal:undefined,body:JSON.stringify(body)})
    .then(function(r){ return r.json().catch(function(){ return {ok:false,message:'رد غير مفهوم من السيرفر'}; }).then(function(j){ return {s:r.status,j:j}; }); })
    .then(function(x){
      clearTimeout(tm); busy=false;
      if(x.s===401){ location.href='/login?code='+CODE; return; }
      if(x.j.state && x.j.state.count!=null) S.count=x.j.state.count;
      done(x.j);
      stats();
    })
    .catch(function(){
      clearTimeout(tm); busy=false;
      show('warn','لم يصلنا رد من السيرفر — حدّث الصفحة للتأكد من شخصياتك ورصيدك قبل إعادة المحاولة.');
      stats();
    });
  }
  function mergeAll(rarity,label){
    if(busy) return;
    if(!window.confirm('تأكيد: '+label+'؟\\nسيتم دمج كل شخصياتك من هذه الرتبة (كل 5 تعطي شخصية).')) return;
    show(null);
    post('/pull/merge-all',{rarity:rarity},function(j){
      if(j.ok){
        var lines=['✨ الدمج الشامل','🔥 تم الحصول على '+j.rewards.length+' شخصية جديدة ('+j.to+')',''];
        j.rewards.slice(0,15).forEach(function(x,i){ lines.push((i+1)+'- 👑 '+x.name+' • ⚔️ '+Number(x.power).toLocaleString('en-US')); });
        if(j.rewards.length>15) lines.push('… و '+(j.rewards.length-15)+' أخرى');
        lines.push('','📦 تم استهلاك: '+j.consumed+' شخصية '+j.from);
        show('good',lines.join('\\n'));
      } else { show('bad',j.message||'فشل الدمج'); }
    });
  }
  $('mg-good').addEventListener('click',function(){ mergeAll('ممتاز','دمج الكل ممتاز ➜ أسطوري'); });
  $('mg-leg').addEventListener('click',function(){ mergeAll('اسطوري','دمج الكل أسطوري ➜ SSS'); });
  $('go').addEventListener('click',function(){
    if(busy) return;
    busy=true; $('go').disabled=true; $('go').textContent='جارٍ السحب…'; show(null);
    var ctl=('AbortController' in window)?new AbortController():null; var tm=setTimeout(function(){ if(ctl) ctl.abort(); },30000);
    fetch('/pull',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:ctl?ctl.signal:undefined,
      body:JSON.stringify({csrf:CSRF,code:CODE})})
    .then(function(r){ return r.json().catch(function(){ return {ok:false,message:'رد غير مفهوم من السيرفر'}; }).then(function(j){ return {s:r.status,j:j}; }); })
    .then(function(x){
      clearTimeout(tm); busy=false; $('go').textContent='🎴 اسحب';
      if(x.s===401){ location.href='/login?code='+CODE; return; }
      var j=x.j;
      if(j.state){
        if(j.state.pulls!=null) S.pulls=j.state.pulls;
        if(j.state.pity!=null) S.pity=j.state.pity;
        if(j.state.count!=null) S.count=j.state.count;
        if(j.state.cap!=null) S.cap=j.state.cap;
        if(j.state.resetIn!=null){ S.resetIn=j.state.resetIn; endAt=Date.now()+S.resetIn*1000; }
      }
      if(j.ok){ renderResult(j); } else { show('bad',j.message||'فشل السحب'); }
      stats();
    })
    .catch(function(){
      clearTimeout(tm); busy=false; $('go').textContent='🎴 اسحب';
      show('warn','لم يصلنا رد من السيرفر — قد تكون السحبة تمت. حدّث الصفحة للتأكد من سحباتك ومخزونك قبل المحاولة من جديد.');
      stats();
    });
  });
  stats(); tick(); setInterval(tick,1000);
})();
</script></body></html>`
}

function pageHTML({ title, total, counts, items, page, pages, base, viewer, code }) {
    const withImg = items.filter(c => (TIERS[resolveTierKey(c.rarity, c.evolutionLevel)] || TIERS['عادي']).idx >= FIRST_IMAGE_TIER)
    const namesOnly = items.filter(c => !withImg.includes(c))

    const countsHTML = counts
        .map(([k, n]) => `<span class="count" style="--tier:${TIERS[k].color}">${esc(k)} <b>${n}</b></span>`)
        .join('')

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
${BASE_CSS}${EXTRA_CSS}
</style>
</head>
<body>
  <div class="frame">
    ${viewerBarHTML(viewer, code)}
    <div class="eyebrow">Character Roster</div>
    <h1>${esc(title)}</h1>
    <div class="sub">${total} CHARACTERS · PAGE ${page}/${pages}</div>
    <div class="counts">${countsHTML}</div>
    ${withImg.length ? `<div class="roster">${withImg.map(cardHTML).join('')}</div>` : ''}
    ${namesOnly.length ? `<div class="names-title">باقي الشخصيات</div><div class="names">${namesOnly.map(chipHTML).join('')}</div>` : ''}
    ${pagerHTML(base, page, pages)}
  </div>
  <div id="tpls" hidden>${withImg.map(detailHTML).join('')}</div>
  <div class="overlay" id="ov" hidden><div class="sheet" id="sheet" role="dialog" aria-modal="true"></div></div>
<script>
(function(){
  var ov=document.getElementById('ov'), sheet=document.getElementById('sheet');
  function closeSheet(){ ov.hidden=true; sheet.innerHTML=''; document.body.style.overflow=''; }
  function openSheet(n){
    var t=document.getElementById('d-'+n); if(!t||!t.content) return;
    var root=t.content.firstElementChild; if(!root) return;
    sheet.innerHTML=root.innerHTML;
    ov.style.setProperty('--tier', root.getAttribute('data-tier')||'#ff3860');
    sheet.className='sheet'+(root.getAttribute('data-omega')==='1'?' omega':'');
    ov.hidden=false; document.body.style.overflow='hidden';
    var b=sheet.querySelector('.body'); if(b) b.scrollTop=0;
  }
  document.addEventListener('click',function(e){
    var card=e.target.closest&&e.target.closest('.card[data-d]');
    if(card && ov.hidden){ openSheet(card.getAttribute('data-d')); return; }
    if(e.target===ov || (e.target.closest&&e.target.closest('[data-close]'))){ closeSheet(); return; }
    var tab=e.target.closest&&e.target.closest('.tab');
    if(tab && sheet.contains(tab)){
      sheet.querySelectorAll('.tab').forEach(function(x){ x.classList.toggle('on', x===tab); });
      sheet.querySelectorAll('.pane').forEach(function(p){ p.hidden = (p.getAttribute('data-p') !== tab.getAttribute('data-t')); });
    }
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){ closeSheet(); return; }
    if((e.key==='Enter'||e.key===' ') && ov.hidden){
      var c=document.activeElement; if(c && c.matches && c.matches('.card[data-d]')){ e.preventDefault(); openSheet(c.getAttribute('data-d')); }
    }
  });
})();
</script>
${inboxPopupHTML(viewer)}
</body>
</html>`
}

function notFoundHTML() {
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>غير موجود</title></head>
<body style="background:#0a0d16;color:#eef1f8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">
<div><h2>❌ الرابط غير صحيح أو انتهت صلاحيته</h2><p style="color:#8891a3;margin-top:10px">اكتب .رابط بالبوت لتحصل على رابطك</p></div></body></html>`
}

// كود الرابط: 10 خانات عشوائية (لا يكشف رقم اللاعب)
function generateSiteCode() {
    return crypto.randomBytes(5).toString('hex')
}

const GIFT_ERRORS = {
    LOCKED: '⏳ فيه عملية إهداء شغالة على أحد الطرفين حالياً، حاول بعد ثواني.',
    NO_SENDER: 'حسابك غير موجود.',
    NO_TARGET: 'هذا اللاعب غير موجود.',
    SELF: 'لا يمكنك إهداء نفسك.',
    OMEGA: '🌌 شخصيات أوميقا Ω لا تُهدى.',
    STALE: 'تغيّرت قائمة شخصياتك (أو بيعت/أُهديت شخصية). سنحدّث الصفحة — أعد الاختيار.',
    TOO_MANY: `الحد الأقصى ${MAX_GIFT_CHARACTERS} شخصيات بكل عملية.`,
    BAD_PICKS: 'اختر شخصية واحدة على الأقل.',
    BAD_INDEX: 'اختيار غير صحيح.',
    DUP_INDEX: 'اختيار مكرر.',
    TX_FAILED: '❌ صار خطأ تقني — لم يُخصم منك شيء ولم تُنقل أي شخصية. حاول مرة ثانية.'
}

function giftErrorMessage(r, costText) {
    if (r.code === 'NO_MONEY') {
        return `تحتاج ${costText} لهذه العملية. رصيدك الحالي: ${Number(r.extra?.balance || 0).toLocaleString('en-US')}`
    }
    return GIFT_ERRORS[r.code] || GIFT_ERRORS.TX_FAILED
}

const PULL_ERRORS = {
    BUSY: '⏳ انتظر حتى تنتهي عملية السحب السابقة.',
    NO_PLAYER: 'حسابك غير موجود.',
    BANNED: '🚫 حسابك محظور من استخدام البوت.',
    CLOSED: '⏰ البوت خارج وقت العمل (من 10:00 صباحاً حتى 12:05 منتصف الليل بتوقيت الرياض).',
    OFFLINE: '📡 البوت غير متصل حالياً، حاول بعد قليل.',
    SERVER: '❌ صار خطأ بالخادم أثناء السحب — حدّث الصفحة وتأكد من شخصياتك قبل إعادة المحاولة.'
}

function pullErrorMessage(r) {
    if (r.code === 'FULL') return `❌ المخزون ممتلئ\n\n📦 السعة: ${Number(r.capacity) || 30}`
    if (r.code === 'NO_PULLS') {
        const sec = Math.max(0, Math.ceil((Number(r.retryInMs) || 0) / 1000))
        return `⏳ انتهت السحبات\n\n🕒 الوقت المتبقي: ${Math.floor(sec / 60)} دقيقة ${sec % 60} ثانية\n\n🎁 تتجدد السحبات تلقائياً عند رأس كل ساعة`
    }
    if (r.code === 'NO_POOL') return `❌ لا توجد شخصيات بهذا التصنيف: ${r.rarity || ''}`
    return PULL_ERRORS[r.code] || PULL_ERRORS.SERVER
}

const TRADE_ERRORS = {
    BUSY: '⏳ فيه عملية ثانية شغالة على حسابك، حاول بعد ثواني.',
    NO_PLAYER: 'حسابك غير موجود.',
    BAD_CONFIRM: 'اكتب كلمة «تأكيد» لإتمام البيع.',
    TOO_MANY: 'الحد الأقصى 50 شخصية بكل عملية بيع.',
    BAD_PICKS: 'اختر شخصية واحدة على الأقل.',
    OMEGA: '🌌 شخصية أوميقا Ω ما تقدر تبيعها أبداً.',
    STALE: 'تغيّرت قائمة شخصياتك (بيعت أو اندمجت أو أُهديت شخصية). سنحدّث الصفحة — أعد الاختيار.',
    BAD_RARITY: '❌ الدمج متاح فقط لرتبة ممتاز أو اسطوري.',
    SERVER: '❌ صار خطأ بالخادم — حدّث الصفحة وتأكد من شخصياتك قبل إعادة المحاولة.'
}

function tradeErrorMessage(r) {
    if (r.code === 'NOT_ENOUGH') return `❌ تحتاج إلى 5 شخصيات من رتبة ${r.rarity} على الأقل\n\n📦 لديك: ${Number(r.have) || 0}`
    if (r.code === 'NO_POOL') return `❌ لا توجد شخصيات من رتبة ${r.rarity || ''}`
    return TRADE_ERRORS[r.code] || TRADE_ERRORS.SERVER
}

// بيانات بطاقة نتيجة السحب (نفس ألوان/نجوم .المعرض) — تُرسل للمتصفح كـ JSON آمن
function pullCardData(disp) {
    const tierKey = resolveTierKey(disp.rarity, 0)
    const t = TIERS[tierKey] || TIERS['عادي']
    return {
        name: String(disp.name || ''),
        anime: String(disp.anime || ''),
        tier: tierKey,
        color: t.color,
        stars: t.stars,
        lang: t.lang,
        power: Number(disp.power) || 0,
        img: safeImageUrl(disp.image),
        sss: tierKey === 'SSS'
    }
}

// ---------------------------------------------------------------
// 👑 صفحة هجوم الزعيم (نفس منطق .هجوم بالواتس — الحساب كله بالسيرفر
// عبر systems/bossAttackSystem.js، والصفحة تعرض النتيجة بأنيميشن)
// ---------------------------------------------------------------
function bossPageHTML({ viewer, code, data }) {
    return `${shellHead('هجوم الزعيم')}
<style>
.bs-wrap{max-width:620px;margin:0 auto;}
.bs-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:6px;}
.bs-name{font-weight:900;font-size:19px;color:var(--gold);}
.bs-rage{display:inline-block;font-size:12px;font-weight:800;color:#fff;background:#ff3860;border-radius:20px;padding:2px 10px;margin-inline-start:6px;}
.bs-num{font-family:'Oswald',sans-serif;direction:ltr;font-size:14px;color:var(--text-dim);}
.bs-bar{height:14px;border-radius:8px;background:#0b0e18;border:1px solid #1f2740;overflow:hidden;}
.bs-fill{height:100%;width:100%;transition:width .9s cubic-bezier(.2,.8,.2,1);}
.bs-fill.boss{background:linear-gradient(90deg,#ff3860,#ff7a5c);}
.bs-fill.me{background:linear-gradient(90deg,#2ecc71,#7dffb0);}
.bs-fol{position:relative;direction:ltr;display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:10px 0 0;}
.bs-fol:empty{display:none;}
.bs-fc{position:relative;width:84px;aspect-ratio:3/4;border-radius:12px;border:2px solid #3a2330;background:#10162a center/cover no-repeat;overflow:hidden;will-change:transform;}
.bs-fc.front{border-color:#ff3860;box-shadow:0 0 14px rgba(255,56,96,.45);}
.bs-fc .fn{position:absolute;left:0;right:0;bottom:7px;padding:12px 3px 2px;font-size:11px;font-weight:800;text-align:center;direction:rtl;color:#fff;background:linear-gradient(transparent,rgba(5,7,14,.92));line-height:1.3;}
.bs-fc .fb{position:absolute;left:0;right:0;bottom:0;height:7px;background:#1a0f16;}
.bs-fc .fb i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#ff3860,#ff7a5c);transition:width .6s ease-out;}
.bs-arena{position:relative;direction:ltr;display:flex;justify-content:space-between;align-items:center;margin:16px 0 10px;padding:16px 10px;background:#0b0e18;border:1px solid #1f2740;border-radius:18px;overflow:hidden;}
.bs-fig{position:relative;width:41%;max-width:190px;aspect-ratio:3/4;border-radius:14px;border:2px solid var(--gold-dim);background:#10162a center/cover no-repeat;overflow:hidden;will-change:transform;}
.bs-fig.boss{border-color:#ff3860;}
.bs-fig .pl{position:absolute;left:0;right:0;bottom:0;padding:18px 6px 6px;font-size:12.5px;font-weight:800;text-align:center;direction:rtl;background:linear-gradient(transparent,rgba(5,7,14,.92));}
.bs-flash{position:absolute;inset:0;background:#ff3860;opacity:0;pointer-events:none;}
.bs-vs{font-family:'Oswald',sans-serif;font-size:22px;color:var(--gold-dim);}
.bs-dmg{position:absolute;font-family:'Oswald',sans-serif;font-weight:700;pointer-events:none;white-space:nowrap;text-shadow:0 2px 8px #000;z-index:5;}
.bs-sel{width:100%;margin:6px 0 4px;padding:11px;border-radius:12px;background:#080b14;color:#fff;border:1px solid #232b45;font-family:'Cairo',sans-serif;font-size:15px;}
.bs-go{position:relative;overflow:hidden;}
.bs-resp{text-align:center;margin:10px 0 0;padding:10px;border-radius:12px;background:#10162a;border:1px dashed var(--gold-dim);color:var(--gold);font-weight:800;font-size:14px;direction:rtl;}
.bs-cd{position:absolute;bottom:0;right:0;height:4px;width:0;background:#ff3860;}
.bs-stat{font-size:12.5px;color:var(--text-dim);display:flex;justify-content:space-between;margin:12px 0 4px;}
.bs-msg{background:#0f1426;border:1px solid #232b45;border-radius:14px;padding:12px 14px;margin-top:10px;font-size:14px;line-height:1.9;animation:bsin .35s ease-out;}
.bs-msg.pub{border-color:#5a3340;}
.bs-msg b.t{display:block;color:var(--gold);font-weight:900;margin-bottom:2px;}
.bs-msg .sec{color:var(--gold);font-weight:800;margin-top:8px;}
.bs-msg .sep{border:0;border-top:1px dashed #2a3350;margin:8px 0;}
.bs-msg .ln{white-space:pre-wrap;}
.bs-img{height:120px;border-radius:10px;background:#10162a center/cover no-repeat;margin-bottom:8px;}
.bs-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}
.bs-chips span{font-size:12.5px;padding:2px 10px;border-radius:14px;background:#1a0f16;border:1px solid #5a3340;color:#ffb3c2;}
.bs-h{text-align:center;font-weight:800;color:var(--gold-dim);margin:22px 0 4px;font-size:15px;}
.bs-res{margin-top:18px;background:#0f1426;border:1px solid var(--gold-dim);border-radius:18px;padding:16px;}
.bs-res h3{text-align:center;color:var(--gold);font-size:18px;font-weight:900;margin-bottom:6px;}
.bs-rk{border-top:1px dashed #2a3350;padding:10px 0;line-height:1.9;font-size:14px;}
.bs-rk .who2{font-weight:900;color:#fff;font-size:15px;}
@keyframes bsin{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
@keyframes bsrage{0%,100%{box-shadow:0 0 0 rgba(255,56,96,0)}50%{box-shadow:0 0 36px rgba(255,56,96,.8)}}
</style>
<body><div style="padding:30px 16px 60px">
  <div class="topbar">
    <span><span class="gmode">هجوم الزعيم</span> <span class="who">مسجّل كـ <b>${esc(viewer.name)}</b></span></span>
    <a class="pill" href="/u/${code}">← رجوع للعرض</a>
  </div>
  <div class="bs-wrap">
    <section class="gpanel" style="margin-top:0;max-width:none">
      <div class="bs-head"><span class="bs-name"><span id="bn">الزعيم</span><span class="bs-rage" id="rage" hidden>غضب</span></span><span class="bs-num" id="bhpt"></span></div>
      <div class="bs-bar"><div class="bs-fill boss" id="bhp"></div></div>
      <div class="bs-fol" id="fol"></div>

      <div class="bs-arena" id="arena">
        <div class="bs-fig" id="fme"><div class="pl" id="fmen"></div></div>
        <div class="bs-vs">VS</div>
        <div class="bs-fig boss" id="fboss"><div class="pl" id="fbn"></div><div class="bs-flash" id="flash"></div></div>
      </div>

      <div class="bs-stat"><span>❤️ دمك</span><span class="bs-num" id="mhpt"></span></div>
      <div class="bs-bar"><div class="bs-fill me" id="mhp"></div></div>

      <select class="bs-sel" id="sel" aria-label="اختيار الشخصية"></select>
      <div class="bs-resp" id="resp" hidden></div>
      <div class="gp-msg" id="msg" hidden style="white-space:pre-wrap;margin-top:10px"></div>
      <button class="btn danger bs-go" id="go" type="button"><span id="lbl">⚔️ هجوم</span><div class="bs-cd" id="cd"></div></button>
    </section>

    <div id="log"></div>

    <div id="resbox" hidden></div>

    <div class="bs-h">📢 أحداث الزعيم العامة</div>
    <div id="pub"></div>
  </div>
</div>
<script>
(function(){
  var CODE=${jsonForScript(code)}, CSRF=${jsonForScript(viewer.csrf)}, D=${jsonForScript(data)};
  var S=D.state, lastId=D.lastId||0, seen={}, busy=false, cdEnd=0, pollTimer=null, respEnd=0, bossDeadShown=false, pubQ=[], pubRun=false;
  function setResp(b){ respEnd=(b&&b.finished&&b.respawnInMs!=null)?Date.now()+b.respawnInMs:0; }
  function mmss(ms){ var s=Math.ceil(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), r=s%60; function z(n){ return (n<10?'0':'')+n; } return (h>0?h+':'+z(m):m)+':'+z(r); }
  function $(id){ return document.getElementById(id); }
  function el(tag,cls,txt){ var e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
  function fmt(n){ return Number(n||0).toLocaleString('en-US'); }
  function wait(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
  function img(node,url){ if(url){ node.style.backgroundImage="url('"+url+"')"; } }
  function show(kind,text){ var m=$('msg'); if(!text){ m.hidden=true; return; } m.className='gp-msg '+kind; m.textContent=text; m.hidden=false; }
  function pct(a,b){ return b>0?Math.max(0,Math.min(100,a/b*100)):0; }

  // ───── عرض الحالة ─────
  function renderBoss(b){
    if(!b){ $('bn').textContent='لا يوجد زعيم'; $('bhpt').textContent=''; $('bhp').style.width='0%'; $('fol').innerHTML=''; return; }
    $('bn').textContent=b.name; $('fbn').textContent=b.name; img($('fboss'),b.img);
    $('rage').hidden=!b.enraged;
    if(bossDeadShown && !b.finished && b.hp>0){ bossDeadShown=false; $('fboss').getAnimations().forEach(function(a){ a.cancel(); }); }
    $('bhp').style.width=pct(b.hp,b.maxHp)+'%';
    $('bhpt').textContent=fmt(b.hp)+' / '+fmt(b.maxHp);
    renderFollowers(b.followers||[]);
  }
  // ───── الأتباع: نزول من فوق / تحديث HP / تلاشي عند الموت ─────
  var fmap={}, folInit=false;
  function folKeys(list){ var occ={}; return list.map(function(x){ occ[x.name]=(occ[x.name]||0)+1; return x.name+'#'+occ[x.name]; }); }
  function folNode(key){ return fmap[key]?fmap[key].el:null; }
  function renderFollowers(list){
    var f=$('fol'), keys=folKeys(list), alive={}, animate=folInit, dying=[];
    list.forEach(function(x,i){
      var k=keys[i]; alive[k]=1;
      var n=fmap[k];
      if(!n){
        var c=el('div','bs-fc'); c.appendChild(el('div','fn','')); var bar=el('div','fb'); bar.appendChild(el('i','')); c.appendChild(bar);
        n={el:c,max:Math.max(1,x.hp||1)}; fmap[k]=n; f.appendChild(c);
        if(animate){ c.animate([{transform:'translateY(-90px) scale(.7)',opacity:0},{transform:'translateY(8px) scale(1.06)',opacity:1,offset:.65},{transform:'translateY(-3px) scale(.98)',offset:.82},{transform:'translateY(0) scale(1)',opacity:1}],{duration:750,easing:'ease-out',delay:i*120,fill:'backwards'}); }
      }
      if((x.hp||0)>n.max) n.max=x.hp;
      if(x.img) img(n.el,x.img);
      n.el.firstChild.textContent=x.name;
      n.el.title=x.name+' — '+fmt(x.hp)+' HP';
      n.el.lastChild.firstChild.style.width=pct(x.hp,n.max)+'%';
      n.el.classList.toggle('front',i===0);
    });
    Object.keys(fmap).forEach(function(k){
      if(alive[k]) return;
      var n=fmap[k]; delete fmap[k];
      if(!animate){ n.el.remove(); return; }
      n.el.classList.remove('front');
      dying.push(n.el.animate([{transform:'scale(1) rotate(0)',opacity:1,filter:'grayscale(0)'},{transform:'scale(1.12) rotate(-4deg)',opacity:.8,filter:'grayscale(.6) brightness(1.6)',offset:.35},{transform:'scale(.4) rotate(10deg) translateY(30px)',opacity:0,filter:'grayscale(1)'}],{duration:850,easing:'ease-in',fill:'forwards'}).finished.then(function(){ n.el.remove(); }));
    });
    folInit=true;
    return Promise.all(dying);
  }
  // ضربة على تابع: اهتزاز + وميض أحمر + رقم الضرر
  function hitFollower(node,dmg,crit){
    if(!node) return;
    shake(node,crit?9:6);
    node.animate([{filter:'brightness(1)'},{filter:'brightness(2.2) saturate(2)',offset:.25},{filter:'brightness(1)'}],{duration:420});
    floatNum(node,(crit?'🎯 ':'')+fmt(dmg),crit?'#f0c04a':'#ff5c7a',crit?24:18,$('fol'));
  }
  function renderMe(m){
    $('mhp').style.width=pct(m.hp,m.maxHp)+'%';
    $('mhpt').textContent=fmt(m.hp)+' / '+fmt(m.maxHp);
  }
  function curChar(){ var i=Number($('sel').value)||1; for(var k=0;k<S.characters.length;k++){ if(S.characters[k].index===i) return S.characters[k]; } return S.characters[0]||null; }
  function renderChar(){ var c=curChar(); if(!c) return; img($('fme'),c.img); $('fmen').textContent=c.name; }
  function renderSel(){
    var s=$('sel'); s.innerHTML='';
    S.characters.forEach(function(c){ var o=el('option','','#'+c.index+' — '+c.name+' ('+fmt(c.power)+' PWR)'); o.value=String(c.index); s.appendChild(o); });
    renderChar();
  }
  function applyState(st){
    S.open=st.open; S.boss=st.boss; S.me=st.me; S.cooldownMs=st.cooldownMs;
    if(st.characters && st.characters.length){ S.characters=st.characters; }
    cdEnd=Date.now()+(st.cooldownMs||0);
    setResp(st.boss);
    renderBoss(st.boss); renderMe(st.me);
  }

  // ───── زر الهجوم والكولداون ─────
  function tick(){
    var rs=$('resp');
    if(S.boss && S.boss.finished){
      var rl=Math.max(0,respEnd-Date.now());
      rs.hidden=false;
      rs.textContent=respEnd?(rl>0?'⏳ الزعيم القادم يظهر بعد '+mmss(rl):'👑 جارٍ استدعاء الزعيم القادم…'):'⏳ الزعيم القادم يظهر عند رأس الساعة';
    } else { rs.hidden=true; }
    var left=Math.max(0,cdEnd-Date.now());
    var btn=$('go'), lbl=$('lbl');
    if(busy){ btn.disabled=true; return; }
    if(!S.boss || S.boss.finished){ btn.disabled=true; lbl.textContent='👑 لا يوجد زعيم نشط'; $('cd').style.width='0'; return; }
    if(!S.open){ btn.disabled=true; lbl.textContent='🔴 باب الهجوم مغلق'; $('cd').style.width='0'; return; }
    if(S.me.dead && S.me.deadLeftMs>0){ btn.disabled=true; lbl.textContent='💀 أنت ميت'; return; }
    if(left>0){ btn.disabled=true; lbl.textContent='⏳ '+Math.ceil(left/1000)+' ث'; $('cd').style.width=(left/${'30000'}*100)+'%'; return; }
    btn.disabled=false; lbl.textContent='⚔️ هجوم'; $('cd').style.width='0';
  }

  // ───── أنيميشن ─────
  function shake(node,s){ node.animate([{transform:'translateX(0)'},{transform:'translateX('+(-s)+'px)'},{transform:'translateX('+s+'px)'},{transform:'translateX('+(-s/2)+'px)'},{transform:'translateX(0)'}],{duration:380}); }
  function lunge(from,to,dir){
    var f=from.getBoundingClientRect(), t=to.getBoundingClientRect();
    var x=dir>0?(t.left-f.right+16):-(f.left-t.right+16);
    from.style.zIndex=3;
    return from.animate([{transform:'translateX(0) scale(1)'},{transform:'translateX('+(dir>0?-8:8)+'px) scale(.95)',offset:.2},{transform:'translateX('+x+'px) scale(1.08)',offset:.55},{transform:'translateX(0) scale(1)'}],{duration:650,easing:'ease-in-out'});
  }
  function floatNum(target,text,color,size,box){
    box=box||$('arena');
    var a=box.getBoundingClientRect(), r=target.getBoundingClientRect();
    var d=el('div','bs-dmg',text); d.style.color=color; d.style.fontSize=size+'px';
    d.style.left=(r.left-a.left+r.width/2-40)+'px'; d.style.top=(r.top-a.top+r.height*0.25)+'px';
    box.appendChild(d);
    d.animate([{transform:'translateY(0) scale(.6)',opacity:0},{transform:'translateY(-20px) scale(1.15)',opacity:1,offset:.25},{transform:'translateY(-70px) scale(1)',opacity:0}],{duration:1200,easing:'ease-out'}).onfinish=function(){ d.remove(); };
  }
  function flash(){ $('flash').animate([{opacity:.6},{opacity:0}],{duration:380}); }

  // ───── رسائل (بنفس تقسيم رسالة الواتس) ─────
  function addTo(box,node,max){ box.insertBefore(node,box.firstChild); while(box.children.length>max) box.removeChild(box.lastChild); }
  function sec(m,title,lines,emptyTxt){
    m.appendChild(el('hr','sep'));
    m.appendChild(el('div','sec',title));
    var arr=(lines&&lines.length)?lines:[emptyTxt||'لا يوجد'];
    arr.forEach(function(l){ m.appendChild(el('div','ln',l)); });
  }
  function reportNode(r){
    var m=el('div','bs-msg');
    if(r.kind==='follower'){
      m.appendChild(el('b','t','⚔️ هجوم على تابع'));
      m.appendChild(el('div','ln','👥 التابع: '+r.follower.name));
      m.appendChild(el('div','ln','💥 الضرر: '+fmt(r.damage)));
      m.appendChild(el('div','ln','❤️ المتبقي: '+fmt(r.follower.remaining)));
      (r.notes||[]).forEach(function(n){ m.appendChild(el('div','ln',n)); });
      return m;
    }
    m.appendChild(el('b','t','⚔️ ═════〔 هجوم الزعيم 〕═════ ⚔️'));
    m.appendChild(el('div','ln','🧿 المهاجم: '+r.attacker.name));
    m.appendChild(el('div','ln','👑 الزعيم: '+r.bossName));
    sec(m,'👑 قدرات اللاعب',r.playerSkills);
    sec(m,'✨ قدرات EX',r.exSkills);
    sec(m,'🛡️ دمج الإيكوز '+r.attacker.name,r.equip,'لا توجد معدات مجهزة');
    sec(m,'⚔️ دمج السلاح '+r.attacker.name,r.weapon,'لا يوجد سلاح مركّب');
    sec(m,'🐾 دمج الرفيق',r.companion,'لا يوجد رفيق مؤثر بهجوم الزعيم');
    sec(m,'🩸 امتصاص الحياة',r.lifesteal?r.lifesteal.lines.concat(['❤️ استعدت '+fmt(r.lifesteal.heal)+' HP فعلي']):[]);
    sec(m,'📊 نتيجة الهجوم',['💥 الضرر: '+fmt(r.damage)+(r.crit?' (حرج 🎯)':''),'⭐ الخبرة: +'+fmt(r.xp)+' XP']);
    if(r.beastAssist){ sec(m,'🐉 مساعدة الوحش المركب',['👹 '+r.beastAssist.name,'💥 ضرر إضافي: '+fmt(r.beastAssist.damage)]); }
    if(r.worldPoints){ m.appendChild(el('hr','sep')); m.appendChild(el('div','ln',r.worldPoints)); }
    return m;
  }
  function eventNode(ev,pub){
    var m=el('div','bs-msg'+(pub?' pub':''));
    if(ev.img){ var i=el('div','bs-img'); img(i,ev.img); m.appendChild(i); }
    m.appendChild(el('b','t',ev.title||''));
    (ev.lines||[]).forEach(function(l){ m.appendChild(el('div','ln',l)); });
    if(ev.targets){ m.appendChild(el('div','sec','🎯 المتضررون ('+ev.targets.length+')')); var c=el('div','bs-chips'); ev.targets.forEach(function(t){ c.appendChild(el('span','',t.name)); }); m.appendChild(c); }
    return m;
  }
  function addPub(ev){
    if(ev.id){ if(seen[ev.id]) return; seen[ev.id]=1; if(ev.id>lastId) lastId=ev.id; }
    if(ev.type==='results'){ renderResults(ev.results); return; }
    addTo($('pub'),eventNode(ev,true),12);
  }

  // ───── رسالة نتائج الزعيم (نفس ترتيب رسالة الواتس) ─────
  function renderResults(R){
    if(!R||!R.entries) return;
    var box=$('resbox'); box.innerHTML=''; box.hidden=false;
    var w=el('div','bs-res'); box.appendChild(w);
    w.appendChild(el('h3','','🏆 ═════〔 نتائج الزعيم العالمي 〕═════ 🏆'));
    if(R.bossName) w.appendChild(el('div','bs-num',R.bossName)).style.textAlign='center';
    var heads=['🥇 ═══ المركز الأول ═══','🥈 ═══ المركز الثاني ═══','🥉 ═══ المركز الثالث ═══'];
    function rewardLines(e){ var l=['💰 '+fmt(e.money)+' مال','⭐ '+fmt(e.xp)+' XP']; (e.boxes||[]).forEach(function(b){ l.push('📦 '+b); }); return l; }
    for(var i=0;i<3;i++){
      var e=R.entries[i], d=el('div','bs-rk');
      d.appendChild(el('div','sec',heads[i]));
      d.appendChild(el('div','who2',e?e.name:'لا يوجد'));
      if(e) rewardLines(e).forEach(function(l){ d.appendChild(el('div','ln',l)); });
      w.appendChild(d);
    }
    var rest=R.entries.slice(3);
    if(rest.length){
      var d2=el('div','bs-rk'); d2.appendChild(el('div','sec','🎖️ بقية المشاركين'));
      rest.forEach(function(e){ d2.appendChild(el('div','ln',e.rank+'- '+e.name+' — 💰 '+fmt(e.money)+' ⭐ '+fmt(e.xp)+' XP 📦 '+(e.boxes||[]).join(' + '))); });
      w.appendChild(d2);
    }
    var dk=el('div','bs-rk'); dk.appendChild(el('div','sec','☠️ ═══ الضربة القاضية ═══'));
    dk.appendChild(el('div','who2',R.killer?R.killer.name:'لا يوجد'));
    if(R.killer) (R.killer.boxes||[]).forEach(function(b){ dk.appendChild(el('div','ln','🎁 '+b)); });
    w.appendChild(dk);
    var dr=el('div','bs-rk'); dr.appendChild(el('div','sec','📊 ═══ الترتيب النهائي ═══'));
    R.entries.forEach(function(e){ dr.appendChild(el('div','ln',e.rank+'- '+e.name+'  💥 الضرر: '+fmt(e.damage))); });
    w.appendChild(dr);
    var df=el('div','bs-rk'); df.appendChild(el('div','ln','🎉 تم توزيع جميع الجوائز بنجاح')); df.appendChild(el('div','ln','🌍 الزعيم العالمي سقط!')); df.appendChild(el('div','ln','⚔️ استعدوا للمعركة القادمة!')); w.appendChild(df);
  }

  // ───── تشغيل أحداث الهجوم بالترتيب مع أنيميشنها ─────
  async function playEvent(ev){
    if(ev.id) addPub(ev); else addTo($('log'),eventNode(ev,false),10);
    if(ev.anim==='hit_me'){ var hb=lunge($('fboss'),$('fme'),-1); await wait(360); flash(); shake($('fme'),9); if(ev.amount) floatNum($('fme'),'-'+fmt(ev.amount),'#ff5c7a',22); await hb.finished; }
    else if(ev.anim==='ability'){ $('fboss').animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:600}); }
    else if(ev.anim==='buff'){ $('fboss').animate([{filter:'brightness(1)'},{filter:'brightness(1.8)'},{filter:'brightness(1)'}],{duration:600}); }
    else if(ev.anim==='kill'){ /* موت التابع يُعرض على بطاقته (renderFollowers) */ }
    else if(ev.anim==='enrage'){ $('fboss').animate([{transform:'scale(1)'},{transform:'scale(1.15)'},{transform:'scale(1)'}],{duration:700}); $('fboss').style.animation='bsrage 1.2s 3'; setTimeout(function(){ $('fboss').style.animation=''; },3700); }
    else if(ev.anim==='raid'){ shake($('arena'),10); flash(); $('arena').animate([{background:'#2a0c14'},{background:'#0b0e18'}],{duration:900}); if(ev.amount){ shake($('fme'),9); floatNum($('fme'),'-'+fmt(ev.amount),'#ff5c7a',22); } }
    else if(ev.anim==='counter'){ var b=lunge($('fboss'),$('fme'),-1); await wait(360); flash(); shake($('fme'),10); if(ev.amount) floatNum($('fme'),'-'+fmt(ev.amount),'#ff5c7a',22); await b.finished; }
    else if(ev.anim==='player_dead'){ $('fme').animate([{opacity:1,filter:'grayscale(0)'},{opacity:.4,filter:'grayscale(1)'}],{duration:800,fill:'forwards'}); }
    else if(ev.anim==='boss_dead'){ bossDeadShown=true; await $('fboss').animate([{transform:'scale(1)',opacity:1},{transform:'scale(1.2)',opacity:.7,offset:.4},{transform:'scale(.6) rotate(8deg)',opacity:0}],{duration:1400,fill:'forwards'}).finished; }
    await wait(450);
  }

  async function playAttack(j){
    var ev=j.events||[], pre=[], post=[];
    ev.forEach(function(e){ (e.type==='ability'||e.type==='fx'?pre:post).push(e); });
    for(var i=0;i<pre.length;i++){ await playEvent(pre[i]); }

    var l=lunge($('fme'),$('fboss'),1);
    await wait(360);
    var r=j.report, crit=!!r.crit;
    var isFol=(r.kind==='follower'), fnode=null;
    if(isFol){
      var fk=folKeys(S.boss.followers||[])[0]; fnode=folNode(fk);
      hitFollower(fnode,r.damage,crit);
    } else {
      flash(); shake($('fboss'),crit?13:7); if(crit) shake($('arena'),5);
      floatNum($('fboss'),(crit?'🎯 ':'')+fmt(r.damage),crit?'#f0c04a':'#ff5c7a',crit?30:22);
    }
    var st=j.state;
    $('bhp').style.width=pct(st.bossHp,st.bossMax)+'%';
    $('bhpt').textContent=fmt(st.bossHp)+' / '+fmt(st.bossMax);
    addTo($('log'),reportNode(r),10);
    await l.finished;
    await wait(300);

    for(var k=0;k<post.length;k++){ await playEvent(post[k]); }

    S.boss.hp=st.bossHp; S.boss.maxHp=st.bossMax; S.boss.enraged=st.enraged; S.boss.followers=st.followers; S.boss.finished=(st.bossHp<=0);
    S.me.hp=st.myHp; S.me.maxHp=st.myMax;
    S.boss.respawnInMs=(st.respawnInMs!=null?st.respawnInMs:null); setResp(S.boss);
    renderBoss(S.boss); renderMe(S.me);
    await wait(isFol?700:0);
  }

  // ───── الإرسال ─────
  $('go').addEventListener('click',function(){
    if(busy) return;
    busy=true; $('go').disabled=true; $('lbl').textContent='جارٍ الهجوم…'; show(null);
    var ctl=('AbortController' in window)?new AbortController():null; var tm=setTimeout(function(){ if(ctl) ctl.abort(); },30000);
    fetch('/boss/attack',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:ctl?ctl.signal:undefined,
      body:JSON.stringify({csrf:CSRF,code:CODE,index:Number($('sel').value)||1})})
    .then(function(r){ return r.json().catch(function(){ return {ok:false,message:'رد غير مفهوم من السيرفر'}; }).then(function(j){ return {s:r.status,j:j}; }); })
    .then(async function(x){
      clearTimeout(tm);
      if(x.s===401){ location.href='/login?code='+CODE; return; }
      var j=x.j;
      if(j.ok){
        cdEnd=Date.now()+${'30000'};
        await playAttack(j);
      } else {
        if(j.code==='COOLDOWN'){ cdEnd=Date.now()+(j.retryInMs||${'30000'}); }
        else if(j.code==='DEAD'){ S.me.dead=true; S.me.deadLeftMs=j.retryInMs||0; show('bad',j.message); }
        else { show('bad',j.message||'فشل الهجوم'); }
      }
      busy=false; tick();
    })
    .catch(function(){
      clearTimeout(tm); busy=false;
      show('warn','لم يصلنا رد من السيرفر — قد يكون الهجوم تم. حدّث الصفحة للتأكد.');
      tick();
    });
  });
  $('sel').addEventListener('change',renderChar);

  // ───── أنيميشن الأحداث العامة لباقي اللاعبين (غير المهاجم) ─────
  async function animPublic(ev,drop){
    if(ev.anim==='raid'){
      shake($('arena'),10); flash(); $('arena').animate([{background:'#2a0c14'},{background:'#0b0e18'}],{duration:900});
      if(drop>0){ shake($('fme'),9); floatNum($('fme'),'-'+fmt(drop),'#ff5c7a',22); }
    }
    else if(ev.anim==='enrage'){ $('fboss').animate([{transform:'scale(1)'},{transform:'scale(1.15)'},{transform:'scale(1)'}],{duration:700}); $('fboss').style.animation='bsrage 1.2s 3'; setTimeout(function(){ $('fboss').style.animation=''; },3700); }
    else if(ev.anim==='boss_dead'){ bossDeadShown=true; await $('fboss').animate([{transform:'scale(1)',opacity:1},{transform:'scale(1.2)',opacity:.7,offset:.4},{transform:'scale(.6) rotate(8deg)',opacity:0}],{duration:1400,fill:'forwards'}).finished; }
    await wait(450);
  }
  async function runPubQ(){
    if(pubRun) return; pubRun=true;
    try{ while(pubQ.length){ var x=pubQ.shift(); await animPublic(x.ev,x.drop); } } finally { pubRun=false; }
  }

  // ───── متابعة أحداث الزعيم العامة (Polling) ─────
  function poll(){
    if(document.hidden||busy) return;
    fetch('/boss/state?since='+lastId,{credentials:'same-origin'})
    .then(function(r){ if(r.status===401){ location.href='/login?code='+CODE; return null; } return r.json(); })
    .then(function(j){
      if(!j||!j.ok) return;
      var keepChars=S.characters, hpBefore=(S.me&&S.me.hp)||0;
      applyState(j.state); S.characters=keepChars;
      var drop=Math.max(0,hpBefore-((S.me&&S.me.hp)||0)), fresh=[];
      (j.feed||[]).forEach(function(e){ var isNew=!(e.id&&seen[e.id]); addPub(e); if(isNew && e.type!=='results') fresh.push(e); });
      fresh.slice(-3).forEach(function(e){ if(e.anim==='raid'||e.anim==='enrage'||e.anim==='boss_dead'){ pubQ.push({ev:e,drop:(e.anim==='raid'?drop:0)}); if(e.anim==='raid') drop=0; } });
      runPubQ();
    }).catch(function(){});
  }

  S.characters=S.characters||[];
  setResp(S.boss);
  renderSel(); renderBoss(S.boss); renderMe(S.me); cdEnd=Date.now()+(S.cooldownMs||0);
  (D.feed||[]).filter(function(e){ return e.type!=='results'; }).forEach(function(e){ seen[e.id]=1; });
  (D.feed||[]).slice().reverse().forEach(function(e){ if(e.type!=='results') addTo($('pub'),eventNode(e,true),12); });
  if(D.results) renderResults(D.results);
  tick(); setInterval(tick,500); pollTimer=setInterval(poll,5000);
})();
</script></body></html>`
}

function securityHeaders(res) {
    res.set({
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'same-origin',
        'Content-Security-Policy':
            "default-src 'self'; img-src https: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'; " +
            "form-action 'self'; base-uri 'none'"
    })
}

/**
 * app: express app | Player: mongoose model
 * opts: {
 *   getCatalog,
 *   giftCharacters,           // من systems/giftSystem.js
 *   usernameCost,             // 20000
 *   notifyDm(userId, text),   // رسالة خاصة بالبوت (آمنة: لا ترمي أخطاء)
 *   notifyOwner(text)         // إشعار المالك
 * }
 * يسجّل المسارات: /u/:code و /login و /logout و /gift ...
 */
function registerCharacterSite(app, Player, opts = {}) {
    const getCatalog = opts.getCatalog
    const giftCharacters = opts.giftCharacters
    const usernameCost = Number(opts.usernameCost) || 20000
    const notifyDm = opts.notifyDm || (async () => {})
    const notifyOwner = opts.notifyOwner || (async () => {})
    const pullCharacter = opts.pullCharacter // من systems/pullSystem.js (نفس منطق .اسحب)
    const sellCharacters = opts.sellCharacters // من systems/characterTradeSystem.js (نفس منطق .بيع)
    const mergeAll = opts.mergeAll     // من systems/characterTradeSystem.js (نفس منطق .دمج_الكل)
    const bossAttack = opts.bossAttack // من systems/bossAttackSystem.js (نفس منطق .هجوم)
    const costText = 'عشرون ألف مال'

    const express = require('express')
    const path = require('path')
    const auth = require('./siteAuth')

    const urlenc = express.urlencoded({ extended: false, limit: '4kb' })
    const jsonBody = express.json({ limit: '8kb' })

    if (!auth.authEnabled()) {
        console.log('⚠️ SESSION_SECRET غير مضبوط (أو أقصر من 16 حرف) — تسجيل الدخول والإهداء من الموقع معطّلان')
    }

    const loginIp = auth.createLimiter({ max: 15, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 })
    const loginUser = auth.createLimiter({ max: 5, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 })
    const giftPw = auth.createLimiter({ max: 5, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 })

    // حد عدد الطلبات للإهداء: 12 بالدقيقة لكل لاعب
    const giftHits = new Map()
    function giftRate(userId) {
        const now = Date.now()
        const arr = (giftHits.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 12) { giftHits.set(userId, arr); return false }
        arr.push(now); giftHits.set(userId, arr); return true
    }

    // حد عدد طلبات السحب: 30 بالدقيقة لكل لاعب (حماية فقط — القيد الحقيقي هو رصيد السحبات)
    const pullHits = new Map()
    function pullRate(userId) {
        const now = Date.now()
        const arr = (pullHits.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 30) { pullHits.set(userId, arr); return false }
        arr.push(now); pullHits.set(userId, arr); return true
    }

    // حالة صفحة السحب (نفس حساب .اسحب: لو تغيّرت الساعة ورصيده أقل من 5 يعتبر 5)
    function pullState(player) {
        const COOLDOWN = 60 * 60 * 1000
        let pulls = Number(player.pulls) || 0
        if (player.lastReset !== Math.floor(Date.now() / COOLDOWN) && pulls < 5) pulls = 5
        return {
            pulls,
            max: 5,
            pity: Number(player.sssPity) || 0,
            pityMax: 30,
            count: (player.characters || []).length,
            cap: Number(player.maxCharacters) || 30,
            resetIn: Math.ceil((COOLDOWN - (Date.now() % COOLDOWN)) / 1000)
        }
    }

    const CODE_RE = /^[a-f0-9]{10}$/

    // صور .استبدال المحلية
    app.use('/custom_images', express.static(path.join(__dirname, '..', 'custom_images'), { maxAge: '1d' }))

    // جلسة المالك لهذه الصفحة (تتحقق من نسخة الجلسة من قاعدة البيانات)
    function ownerSession(req, player) {
        const s = auth.readSession(req)
        if (s && player && s.u === player.userId && s.v === (player.sessionVersion || 0)) return s
        return null
    }

    function html404(res) { return res.status(404).send(notFoundHTML()) }

    // ─────────────── الصفحة العامة / الرئيسية ───────────────
    app.get('/u/:code', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)

            const player = await Player.findOne({ siteCode: code })
                .select('userId name username characters weaponsInventory giftInbox sessionVersion')
                .lean()
            if (!player) return html404(res)

            const title = player.username || player.name || 'شخصياتي'
            const sess = ownerSession(req, player)
            const all = sortCharactersKeepFirst(player.characters || [])

            // الشاشة الأولى: مشاهدة فقط / تسجيل دخول
            if (!sess && !auth.hasViewOnly(req)) {
                return res.send(gateHTML({ code, title, total: all.length }))
            }

            const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
            const page = Math.min(pages, Math.max(1, parseInt(req.query.page, 10) || 1))
            const offset = (page - 1) * PAGE_SIZE
            const catIdx = getCatalogIndex(getCatalog)
            const items = all.slice(offset, offset + PAGE_SIZE)
                .map((c, i) => ({
                    ...resolveDisplayChar(c, catIdx),
                    __num: offset + i + 1,
                    __weapon: (player.weaponsInventory || []).find(w => w && w.equippedTo === c.name) || null
                }))

            const countMap = {}
            for (const c of all) {
                const k = resolveTierKey(c.rarity, c.evolutionLevel)
                if (TIERS[k]) countMap[k] = (countMap[k] || 0) + 1
            }
            const counts = Object.keys(countMap)
                .sort((a, b) => TIERS[b].idx - TIERS[a].idx)
                .map(k => [k, countMap[k]])

            const viewer = sess
                ? {
                    isOwner: true,
                    name: player.name || player.username || 'لاعب',
                    csrf: auth.csrfForSession(sess),
                    gifts: prepareGifts(player.giftInbox, catIdx)
                }
                : { isOwner: false }

            res.send(pageHTML({
                title, total: all.length, counts, items, page, pages,
                base: `/u/${code}`, viewer, code
            }))
        } catch (err) {
            console.error('character site error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    // مشاهدة فقط
    app.get('/u/:code/view', (req, res) => {
        securityHeaders(res)
        const code = String(req.params.code || '')
        if (!CODE_RE.test(code)) return html404(res)
        auth.setViewOnlyCookie(res)
        res.redirect(303, `/u/${code}`)
    })

    // ─────────────── تسجيل الدخول ───────────────
    app.get('/login', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.query.code || '')
            if (!CODE_RE.test(code)) return html404(res)
            const exists = await Player.exists({ siteCode: code })
            if (!exists) return html404(res)
            if (!auth.authEnabled()) {
                return res.send(loginHTML({ code, disabled: true, error: 'تسجيل الدخول غير مفعّل حالياً.' }))
            }
            res.send(loginHTML({ code, csrf: auth.makeLoginCsrf() }))
        } catch (err) {
            console.error('login page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    app.post('/login', urlenc, async (req, res) => {
        const code = String(req.body?.code || '')
        const back = (error, status = 200) => {
            securityHeaders(res)
            return res.status(status).send(loginHTML({ code, csrf: auth.makeLoginCsrf(), error }))
        }
        try {
            if (!CODE_RE.test(code)) return html404(res)
            if (!auth.authEnabled()) return back('تسجيل الدخول غير مفعّل حالياً.', 503)
            if (!auth.sameOrigin(req)) return back('طلب غير مسموح.', 403)
            if (!auth.verifyLoginCsrf(req.body?.csrf)) return back('انتهت صلاحية الصفحة، حاول مرة ثانية.', 403)

            const ip = auth.clientIp(req)
            const username = String(req.body?.username || '').trim().toLowerCase().slice(0, 30)
            const password = String(req.body?.password || '').slice(0, 200)
            const userKey = `${code}|${username}`

            const lim = loginIp.check(ip)
            const limU = loginUser.check(userKey)
            if (lim.blocked || limU.blocked) {
                const mins = Math.ceil(Math.max(lim.retryAfter, limU.retryAfter) / 60)
                return back(`محاولات كثيرة. حاول بعد ${mins} دقيقة.`, 429)
            }

            const player = await Player.findOne({ siteCode: code })
                .select('+passwordHash +passwordSalt userId username name sessionVersion')
                .lean()

            let ok = false
            if (player && player.username && player.username === username && player.passwordHash) {
                ok = await auth.verifyPassword(password, player.passwordHash, player.passwordSalt)
            } else {
                await auth.dummyVerify(password)
            }

            if (!ok) {
                loginIp.fail(ip); loginUser.fail(userKey)
                return back('اليوزر أو كلمة المرور غير صحيحة.', 401)
            }

            loginUser.reset(userKey)
            auth.setSessionCookie(res, player.userId, player.sessionVersion || 0)
            securityHeaders(res)
            res.redirect(303, `/u/${code}`)

            // 🔕 تم إيقاف إشعار المالك بتسجيل الدخول (بطلب المالك)
        } catch (err) {
            console.error('login error:', err)
            return back('صار خطأ بالخادم، حاول مرة ثانية.', 500)
        }
    })

    app.post('/logout', urlenc, (req, res) => {
        securityHeaders(res)
        const code = String(req.body?.code || '')
        const sess = auth.readSession(req)
        if (sess && auth.sameOrigin(req) && auth.verifyCsrf(sess, req.body?.csrf)) {
            auth.clearSessionCookie(res)
        }
        res.redirect(303, CODE_RE.test(code) ? `/u/${code}` : '/')
    })

    // ─────────────── وضع الإهداء ───────────────
    app.get('/u/:code/gift', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)

            const player = await Player.findOne({ siteCode: code })
                .select('userId name username characters sessionVersion')
                .lean()
            if (!player) return html404(res)

            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)

            const all = sortCharactersKeepFirst(player.characters || [])
            const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
            const page = Math.min(pages, Math.max(1, parseInt(req.query.page, 10) || 1))
            const offset = (page - 1) * PAGE_SIZE
            const catIdx = getCatalogIndex(getCatalog)

            // مفتاح فريد لكل بطاقة = hash المحتوى + رقم تكرار (لدعم نسختين متطابقتين)
            const seen = new Map()
            const keyed = all.map(c => {
                const h = charHash(c)
                const n = seen.get(h) || 0
                seen.set(h, n + 1)
                return { c, key: `${h}:${n}` }
            })

            const items = keyed.slice(offset, offset + PAGE_SIZE)
                .map(({ c, key }) => ({ ...resolveDisplayChar(c, catIdx), __key: key }))

            res.send(giftPageHTML({
                title: player.username || player.name || 'شخصياتي',
                viewer: { name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) },
                items, page, pages, code, costText
            }))
        } catch (err) {
            console.error('gift page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    // ─────────────── سحب شخصية (نفس .اسحب) ───────────────
    app.get('/u/:code/pull', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)

            const player = await Player.findOne({ siteCode: code })
                .select('userId name username characters sessionVersion pulls lastReset sssPity maxCharacters')
                .lean()
            if (!player) return html404(res)

            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)

            res.send(pullPageHTML({
                viewer: { name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) },
                code,
                state: pullState(player)
            }))
        } catch (err) {
            console.error('pull page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    app.post('/pull', jsonBody, async (req, res) => {
        res.set('Cache-Control', 'no-store')
        const fail = (status, code, message, extra = {}) => res.status(status).json({ ok: false, code, message, ...extra })
        try {
            if (typeof pullCharacter !== 'function') return fail(503, 'DISABLED', 'السحب من الموقع غير مفعّل حالياً.')
            if (!auth.authEnabled()) return fail(503, 'DISABLED', 'السحب من الموقع غير مفعّل حالياً.')
            if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')

            const sess = auth.readSession(req)
            if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

            const b = req.body || {}
            if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
            if (!pullRate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')

            // نسخة الجلسة (تتبدل لما يغيّر كلمة السر)
            const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
            if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

            const r = await pullCharacter({ userId: sess.u })

            if (!r.ok) {
                const status = r.code === 'BUSY' ? 409 : r.code === 'SERVER' ? 500 : r.code === 'OFFLINE' ? 503 : 400
                const extra = {}
                if (r.code === 'NO_PULLS') {
                    extra.state = { pulls: 0, resetIn: Math.ceil((Number(r.retryInMs) || 0) / 1000) }
                }
                return fail(status, r.code, pullErrorMessage(r), extra)
            }

            // نفس .اسحب: أحدث صورة/أنمي من الكتالوج (name + rarity + form)
            const disp = resolveDisplayChar(r.character, getCatalogIndex(getCatalog))

            const notes = []
            if (r.guaranteedSSS) notes.push('🎯 هذه الشخصية حصلت عليها من الضمان!')
            if (r.sonicBonusText) notes.push(r.sonicBonusText)
            if (r.worldPointsText) notes.push(String(r.worldPointsText))

            res.json({
                ok: true,
                card: pullCardData(disp),
                notes,
                state: {
                    pulls: Number(r.pullsLeft) || 0,
                    pity: Number(r.sssPity) || 0,
                    count: Number(r.charCount) || 0,
                    cap: Number(r.capacity) || 30
                }
            })
        } catch (err) {
            console.error('pull route error:', err)
            return fail(500, 'SERVER', PULL_ERRORS.SERVER)
        }
    })

    // ─────────────── 💰 بيع + 🔥 دمج من صفحة السحب ───────────────
    const tradeHits = new Map()
    function tradeRate(userId) {
        const now = Date.now()
        const arr = (tradeHits.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 30) { tradeHits.set(userId, arr); return false }
        arr.push(now); tradeHits.set(userId, arr); return true
    }

    // فحوصات مشتركة (نفس /pull): مفعّل، نفس الأصل، جلسة، CSRF، حد الطلبات، نسخة الجلسة
    async function tradeGuard(req, res, fn) {
        res.set('Cache-Control', 'no-store')
        const fail = (status, code, message, extra = {}) => res.status(status).json({ ok: false, code, message, ...extra })
        try {
            if (typeof fn !== 'function') return fail(503, 'DISABLED', 'هذه الميزة غير مفعّلة حالياً.')
            if (!auth.authEnabled()) return fail(503, 'DISABLED', 'هذه الميزة غير مفعّلة حالياً.')
            if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')

            const sess = auth.readSession(req)
            if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

            const b = req.body || {}
            if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
            if (!tradeRate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')

            const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
            if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

            return { sess, body: b, fail }
        } catch (err) {
            console.error('trade guard error:', err)
            return fail(500, 'SERVER', TRADE_ERRORS.SERVER)
        }
    }

    // ─────────────── 💰 صفحة بيع الشخصيات (قائمة + اختيار + كتابة تأكيد) ───────────────
    app.get('/u/:code/sell', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)

            const player = await Player.findOne({ siteCode: code })
                .select('userId name username characters sessionVersion')
                .lean()
            if (!player) return html404(res)

            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)

            const all = sortCharactersKeepFirst(player.characters || [])
            const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
            const page = Math.min(pages, Math.max(1, parseInt(req.query.page, 10) || 1))
            const offset = (page - 1) * PAGE_SIZE
            const catIdx = getCatalogIndex(getCatalog)

            // نفس مفاتيح صفحة الإهداء: hash المحتوى + رقم تكرار (لدعم نسختين متطابقتين)
            const seen = new Map()
            const keyed = all.map(c => {
                const h = charHash(c)
                const n = seen.get(h) || 0
                seen.set(h, n + 1)
                return { c, key: `${h}:${n}` }
            })

            const items = keyed.slice(offset, offset + PAGE_SIZE)
                .map(({ c, key }) => ({ ...resolveDisplayChar(c, catIdx), __key: key }))

            res.send(sellPageHTML({
                viewer: { name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) },
                items, page, pages, code
            }))
        } catch (err) {
            console.error('sell page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    app.post('/sell', jsonBody, async (req, res) => {
        const g = await tradeGuard(req, res, sellCharacters)
        if (!g || !g.sess) return
        try {
            const b = g.body
            const confirmWord = String(b.confirm || '').trim().replace(/[أإآ]/g, 'ا')
            if (confirmWord !== 'تاكيد') return g.fail(400, 'BAD_CONFIRM', TRADE_ERRORS.BAD_CONFIRM)

            const hashes = Array.isArray(b.picks) ? b.picks.map(String) : []
            if (hashes.length < 1) return g.fail(400, 'BAD_PICKS', TRADE_ERRORS.BAD_PICKS)
            if (hashes.length > 50) return g.fail(400, 'TOO_MANY', TRADE_ERRORS.TOO_MANY)
            if (hashes.some(h => !/^[a-f0-9]{40}$/.test(h))) return g.fail(400, 'BAD_PICKS', 'اختيار غير صحيح، حدّث الصفحة.')

            const r = await sellCharacters({ userId: g.sess.u, hashes })
            if (!r.ok) {
                const status = r.code === 'BUSY' ? 409 : r.code === 'SERVER' ? 500 : 400
                return g.fail(status, r.code, tradeErrorMessage(r))
            }
            res.json({
                ok: true,
                sold: Number(r.sold) || 0,
                gained: Number(r.gained) || 0,
                money: Number(r.money) || 0,
                names: (r.names || []).map(String),
                message: `✅ تم بيع ${Number(r.sold) || 0} شخصية\n💵 إجمالي الأرباح: ${(Number(r.gained) || 0).toLocaleString('en-US')}\n💳 رصيدك الحالي: ${(Number(r.money) || 0).toLocaleString('en-US')}`
            })
        } catch (err) {
            console.error('sell route error:', err)
            return g.fail(500, 'SERVER', TRADE_ERRORS.SERVER)
        }
    })

    app.post('/pull/merge-all', jsonBody, async (req, res) => {
        const g = await tradeGuard(req, res, mergeAll)
        if (!g || !g.sess) return
        try {
            const r = await mergeAll({ userId: g.sess.u, rarity: String(g.body.rarity || '') })
            if (!r.ok) {
                const status = r.code === 'BUSY' ? 409 : r.code === 'SERVER' ? 500 : 400
                return g.fail(status, r.code, tradeErrorMessage(r))
            }
            res.json({
                ok: true,
                from: String(r.from),
                to: String(r.to),
                consumed: Number(r.consumed) || 0,
                rewards: (r.rewards || []).map(x => ({ name: String(x.name || ''), rarity: String(x.rarity || ''), power: Number(x.power) || 0 })),
                state: { count: Number(r.count) || 0 }
            })
        } catch (err) {
            console.error('pull merge route error:', err)
            return g.fail(500, 'SERVER', TRADE_ERRORS.SERVER)
        }
    })


    // ─────────────── 👑 هجوم الزعيم ───────────────
    // حد عدد الطلبات: 20 بالدقيقة لكل لاعب (حماية فقط — القيد الحقيقي كولداون الـ30 ثانية)
    const bossHits = new Map()
    function bossRate(userId) {
        const now = Date.now()
        const arr = (bossHits.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 20) { bossHits.set(userId, arr); return false }
        arr.push(now); bossHits.set(userId, arr); return true
    }

    // يحوّل حالة الزعيم/اللاعب لشكل آمن للمتصفح (روابط صور مفلترة فقط)
    function bossStateOut(st) {
        const catIdx = getCatalogIndex(getCatalog)
        return {
            open: st.open,
            cooldownMs: st.cooldownMs,
            boss: st.boss ? {
                name: st.boss.name, img: safeImageUrl(st.boss.image),
                hp: st.boss.hp, maxHp: st.boss.maxHp, enraged: st.boss.enraged, finished: st.boss.finished,
                respawnInMs: st.boss.respawnInMs,
                followers: (st.boss.followers || []).map(f => ({ name: f.name, hp: f.hp, img: safeImageUrl(f.image) }))
            } : null,
            me: st.me,
            characters: (st.characters || []).map(c => {
                const disp = resolveDisplayChar(c, catIdx)
                return { index: c.index, name: c.name, power: c.power, img: safeImageUrl(disp.image) }
            })
        }
    }

    function bossEventsOut(events) {
        return (events || []).map(e => {
            const out = {
                id: e.id, type: e.type, anim: e.anim, title: e.title,
                lines: (e.lines || []).map(String), amount: e.amount,
                img: safeImageUrl(e.image)
            }
            if (e.targets) out.targets = e.targets.map(t => ({ name: String(t.name || '') }))
            if (e.results) out.results = { ...e.results, bossImage: safeImageUrl(e.results.bossImage) }
            return out
        })
    }

    async function bossSession(req) {
        const sess = auth.readSession(req)
        if (!sess) return null
        const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
        if (!me || (me.sessionVersion || 0) !== sess.v) return null
        return sess
    }

    app.get('/u/:code/boss', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)

            const player = await Player.findOne({ siteCode: code })
                .select('userId name username sessionVersion')
                .lean()
            if (!player) return html404(res)

            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)
            if (!bossAttack) return res.status(503).send('هجوم الزعيم من الموقع غير مفعّل حالياً.')

            const st = await bossAttack.getState(player.userId)
            if (!st) return html404(res)

            res.send(bossPageHTML({
                viewer: { name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) },
                code,
                data: {
                    state: bossStateOut(st),
                    feed: bossEventsOut(bossAttack.getFeed(Math.max(0, bossAttack.latestFeedId() - 15))),
                    lastId: bossAttack.latestFeedId(),
                    results: (() => {
                        const r = bossAttack.getLastResults()
                        return r ? { ...r, bossImage: safeImageUrl(r.bossImage) } : null
                    })()
                }
            }))
        } catch (err) {
            console.error('boss page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    app.get('/boss/state', async (req, res) => {
        res.set('Cache-Control', 'no-store')
        try {
            if (!bossAttack || !auth.authEnabled()) return res.status(503).json({ ok: false })
            const sess = await bossSession(req)
            if (!sess) return res.status(401).json({ ok: false })
            const since = Math.max(0, parseInt(req.query.since, 10) || 0)
            const st = await bossAttack.getState(sess.u)
            if (!st) return res.status(404).json({ ok: false })
            res.json({ ok: true, state: bossStateOut(st), feed: bossEventsOut(bossAttack.getFeed(since)) })
        } catch (err) {
            console.error('boss state error:', err)
            res.status(500).json({ ok: false })
        }
    })

    app.post('/boss/attack', jsonBody, async (req, res) => {
        res.set('Cache-Control', 'no-store')
        const fail = (status, code, message, extra = {}) => res.status(status).json({ ok: false, code, message, ...extra })
        try {
            if (!bossAttack || !auth.authEnabled()) return fail(503, 'DISABLED', 'هجوم الزعيم من الموقع غير مفعّل حالياً.')
            if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')

            const sess = auth.readSession(req)
            if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

            const b = req.body || {}
            if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
            if (!bossRate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')

            const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
            if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

            const r = await bossAttack.attack({ userId: sess.u, charIndex: b.index })

            if (!r.ok) {
                const status = r.code === 'BUSY' ? 409 : r.code === 'SERVER' ? 500 : r.code === 'OFFLINE' ? 503 : 400
                return fail(status, r.code, r.message || 'فشل الهجوم', r.retryInMs != null ? { retryInMs: Math.ceil(r.retryInMs) } : {})
            }

            // صورة المهاجم: نفس .هجوم (أحدث صورة من الكتالوج، أو صورة .استبدال)
            const ch = (r.report.attacker && r.report.attacker.character) || {}
            const disp = resolveDisplayChar({
                name: ch.name, rarity: ch.rarity, form: ch.form,
                customImage: ch.customImage, image: ch.image, anime: ch.anime
            }, getCatalogIndex(getCatalog))

            const report = {
                ...r.report,
                attacker: { name: r.report.attacker.name, index: r.report.attacker.index, img: safeImageUrl(disp.image) }
            }
            if (report.follower) report.follower = { ...report.follower, img: safeImageUrl(report.follower.image) }

            const st = r.state
            res.json({
                ok: true,
                kind: r.kind,
                report,
                events: bossEventsOut(r.events),
                state: {
                    bossHp: st.bossHp, bossMax: st.bossMax, myHp: st.myHp, myMax: st.myMax, enraged: st.enraged, respawnInMs: st.respawnInMs,
                    followers: (st.followers || []).map(f => ({ name: f.name, hp: f.hp, img: safeImageUrl(f.image) }))
                }
            })
        } catch (err) {
            console.error('boss attack route error:', err)
            return fail(500, 'SERVER', 'خطأ بالخادم')
        }
    })

    // ─────────────── سجل الإهداءات ───────────────
    app.get('/u/:code/log', async (req, res) => {
        try {
            securityHeaders(res)
            res.set('Cache-Control', 'no-store')
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)

            const player = await Player.findOne({ siteCode: code })
                .select('userId name username giftLog sessionVersion')
                .lean()
            if (!player) return html404(res)

            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)

            const log = (player.giftLog || []).filter(Boolean).slice().sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 100)
            res.send(logPageHTML({ log, code, csrf: auth.csrfForSession(sess) }))
        } catch (err) {
            console.error('gift log page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    // تأكيد استلام هدية (تعليم "مقروءة")
    app.post('/gift/ack', jsonBody, async (req, res) => {
        res.set('Cache-Control', 'no-store')
        try {
            const sess = auth.readSession(req)
            const b = req.body || {}
            if (!sess || !auth.sameOrigin(req) || !auth.verifyCsrf(sess, b.csrf)) return res.status(403).json({ ok: false })
            const id = String(b.id || '')
            if (!/^[a-f0-9]{16}$/.test(id)) return res.status(400).json({ ok: false })
            await Player.updateOne({ userId: sess.u, 'giftInbox.id': id }, { $set: { 'giftInbox.$.seen': true } })
            res.json({ ok: true })
        } catch (err) {
            console.error('gift ack error:', err)
            res.status(500).json({ ok: false })
        }
    })

    // تنفيذ الإهداء
    app.post('/gift', jsonBody, async (req, res) => {
        res.set('Cache-Control', 'no-store')
        const fail = (status, code, message) => res.status(status).json({ ok: false, code, message })
        try {
            if (!auth.authEnabled()) return fail(503, 'DISABLED', 'الإهداء من الموقع غير مفعّل حالياً.')
            if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')

            const sess = auth.readSession(req)
            if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

            const b = req.body || {}
            if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
            if (!giftRate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')

            // ── التحقق من المدخلات ──
            const op = String(b.op || '')
            if (!/^[0-9a-f-]{36}$/i.test(op)) return fail(400, 'BAD_OP', 'طلب غير صحيح، حدّث الصفحة.')

            const hashes = Array.isArray(b.picks) ? b.picks.map(String) : []
            if (hashes.length < 1) return fail(400, 'BAD_PICKS', GIFT_ERRORS.BAD_PICKS)
            if (hashes.length > MAX_GIFT_CHARACTERS) return fail(400, 'TOO_MANY', GIFT_ERRORS.TOO_MANY)
            if (hashes.some(h => !/^[a-f0-9]{40}$/.test(h))) return fail(400, 'BAD_PICKS', 'اختيار غير صحيح، حدّث الصفحة.')

            const to = String(b.to || '').trim().toLowerCase()
            if (!/^[a-z\u0600-\u06FF]{1,10}$/.test(to)) return fail(400, 'BAD_USER', 'يوزر المستلم غير صحيح (حروف فقط، حد أقصى 10).')

            const password = String(b.password || '')
            if (!password || password.length > 200) return fail(400, 'BAD_PW', 'أدخل كلمة المرور للتأكيد.')

            // ── كلمة المرور + حد المحاولات ──
            const lk = 'gp:' + sess.u
            const lc = giftPw.check(lk)
            if (lc.blocked) return fail(429, 'PW_LOCK', `محاولات خاطئة كثيرة. حاول بعد ${Math.ceil(lc.retryAfter / 60)} دقيقة.`)

            const me = await Player.findOne({ userId: sess.u })
                .select('+passwordHash +passwordSalt sessionVersion username')
                .lean()
            if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

            const pwOk = await auth.verifyPassword(password, me.passwordHash, me.passwordSalt)
            if (!pwOk) { giftPw.fail(lk); return fail(403, 'BAD_PW', 'كلمة المرور غير صحيحة.') }
            giftPw.reset(lk)

            // ── المستلم (باليوزر فقط → خصم 20 ألف مثل الأمر) ──
            const target = await Player.findOne({ username: to }, { userId: 1, username: 1 }).lean()
            if (!target) return fail(404, 'NO_TARGET', 'لا يوجد لاعب بهذا اليوزر.')
            if (target.userId === sess.u) return fail(400, 'SELF', GIFT_ERRORS.SELF)

            // ── التنفيذ (القفل + transaction + opKey داخل giftCharacters) ──
            const r = await giftCharacters({
                senderId: sess.u,
                targetId: target.userId,
                picks: { hashes },
                viaUsername: true,
                opKey: op,
                source: 'site'
            })

            if (!r.ok) {
                const status = r.code === 'LOCKED' ? 409 : r.code === 'TX_FAILED' ? 500 : 400
                return fail(status, r.code, giftErrorMessage(r, costText))
            }

            if (r.duplicate) {
                return res.json({ ok: true, duplicate: true, message: '✅ هذه العملية تمت سابقاً — لم يتكرر شيء.' })
            }

            const list = r.characters.map(c => `${c.name} (${c.rarity})`).join('، ')
            res.json({
                ok: true,
                message: `✅ تم إهداء ${r.characters.length} شخصية إلى @${target.username}. خُصم ${usernameCost.toLocaleString('en-US')} مال.`
            })

            // 📩 إشعارات بالخاص بعد النجاح (لا تدخل بالتراجع، وفشلها لا يؤثر على الإهداء)
            notifyDm(sess.u, `🎁 تم الإهداء من الموقع\n➡️ إلى: @${target.username}\n🧿 ${list}\n💰 خُصم ${usernameCost.toLocaleString('en-US')} مال — رصيدك: ${Number(r.senderBalance).toLocaleString('en-US')}`).catch(() => {})
            notifyDm(target.userId, `🎁 وصلتك هدية!\n👤 من: ${r.senderName}\n🧿 ${list}\n🌐 تجدها في صندوق الهدايا عند فتح رابطك (.رابط)`).catch(() => {})
        } catch (err) {
            console.error('gift route error:', err)
            return fail(500, 'SERVER', 'صار خطأ بالخادم — لم يتأكد تنفيذ الإهداء، تحقق من قائمتك قبل الإعادة (إعادة المحاولة آمنة).')
        }
    })
}

module.exports = { registerCharacterSite, generateSiteCode, bossPageHTML, pageHTML, sortCharacters, sortCharactersKeepFirst, getCatalogIndex, resolveDisplayChar }
