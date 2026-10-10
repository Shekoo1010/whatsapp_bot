// =====================================================================
// systems/characterSite.js
// موقع عرض شخصيات اللاعب — رابط خاص لكل لاعب: /u/<siteCode>
// - الشخصيات SSS وما فوق: بطاقة بنفس إطار/ألوان .المعرض مع الصورة
// - الباقي (عادي / ممتاز / اسطوري): أسماء فقط
// - كل صفحة 40 شخصية (غيّر PAGE_SIZE)
// =====================================================================

const crypto = require('crypto')
const fs = require('fs')
const pathMod = require('path')
const { charHash, MAX_GIFT_CHARACTERS } = require('./giftSystem')
const mongoose = require('mongoose')
const { nextPayoutAt } = require('./galleryRewards') // موعد تصفير لايكات المعارض (العدّاد التنازلي)
const { getGalleryCharacters, resolveLiveCharacterData, MAX_GALLERY } = require('./gallerySystem') // نفس اختيار .المعرض (player.gallery)
const { cappedPower, DEFAULT_CAP } = require('../utils/cappedPower') // قوة الترتيب = أول N شخصية (ترتيب .شخصياتي) حسب سعة المخزون
const TITLES = require('./titleSystem') // 🏅 نظام الألقاب (الندرة/الأنميشن/التفعيل)
const NOTIFY = require('./siteNotify') // 🔔 إشعارات من أعلى الشاشة (إنجاز / عالم / مستوى / خاص)
const PWA = require('./sitePwa') // 📲 تثبيت الموقع كتطبيق (Nami) — manifest + أيقونات فقط
const kingdom = require('./kingdomGroups') // توب قروبات المملكة (Tsuki / Yama / Nakama) + إشعارات الجوائز
const { warPageHTML } = require('./warPage') // ⚔️ صفحة حرب الأعلام (systems/warSystem.js)
const { shardPageHTML } = require('./shardPage') // 🧩 صفحة الشظايا والتطوير والاسترجاع (نفس .شظايا / .تطوير / .استرجاع)

const PAGE_SIZE = 40
const TOP_LIMIT = 30                    // عدد اللاعبين بصفحة أقوى اللاعبين
const TOP_CACHE_MS = 3 * 60 * 1000      // مدة تخزين الترتيب بالذاكرة (3 دقائق)

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
    { key: 'Ω OMEGA', lang: 'en', stars: 11, color: '#ffc933' },
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
    // الأقواس/الفاصلة العليا بالرابط (مثل -(1).jpg) تكسر CSS url() — نشفّرها بدل رفض الرابط
    if (/^https:\/\//i.test(img)) img = img.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/'/g, '%27')
    if (/^https:\/\//i.test(img) && !/['"()\s\\]/.test(img)) return img
    if (/^\.?\/?custom_images\/[\w.\-]+$/i.test(img)) {
        return '/custom_images/' + img.split('/').pop()
    }
    return null
}

// 🖼️ صور الكتالوج المحلية (./characters/xxx.jpg) — للرتب تحت SSS فقط وبصفحة السحب فقط.
// اسم الملف فقط (بدون أي مجلدات) + يتأكد إن الملف موجود، وإلا ترجع null (تظهر البطاقة بدون صورة مثل قبل)
const _localImgCache = new Map()
function localCharImageUrl(img) {
    if (!img || typeof img !== 'string') return null
    const m = /^\.?\/?characters\/([\p{L}\p{N}_.\-]+\.(?:jpe?g|png|webp|gif))$/iu.exec(img)
    if (!m) return null
    const name = m[1]
    if (!_localImgCache.has(name)) {
        let ok = false
        try { ok = fs.existsSync(pathMod.join(__dirname, '..', 'characters', name)) } catch (e) { ok = false }
        _localImgCache.set(name, ok)
    }
    return _localImgCache.get(name) ? '/characters/' + encodeURIComponent(name) : null
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
    const filled = Math.max(0, Math.min(evo, 7))
    const evoHTML = isOmega
        ? `<span class="sh-stars">${'★'.repeat(7)}</span> <b>(7/7) Ω</b>`
        : `<span class="sh-stars">${'★'.repeat(filled)}${'☆'.repeat(7 - filled)}</span> <b>(${filled}/7)</b>`
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
    <div class="card ${isOmega ? 'omega' : (t.idx >= FIRST_IMAGE_TIER ? 'top' : '')}" style="--tier:${t.color}" data-d="${char.__num}" tabindex="0" role="button" aria-label="تفاصيل ${esc(char.name)}">
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
        `<a class="pg ${cls}" href="${base}${String(base).includes('?') ? '&' : '?'}page=${p}">${label}</a>`
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
    background:linear-gradient(#0f1422,#0f1422) padding-box, conic-gradient(from var(--a,0deg),#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860) border-box;
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
    background:linear-gradient(180deg,#121830,#0c101e) padding-box, conic-gradient(from var(--a,0deg),#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860) border-box;
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
${TITLES.HEAD}${PWA.HEAD}${NOTIFY.HEAD}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${BASE_CSS}${EXTRA_CSS}.card.omega,.sheet.omega{animation:rot 5s linear infinite}.card.omega .stars,.sheet.omega .sh-stars{color:#ffc933;text-shadow:0 0 8px rgba(255,201,51,.6)}
.card.top{border-color:transparent;background:linear-gradient(#0f1422,#0f1422) padding-box,conic-gradient(from var(--a,0deg),var(--tier),#fff6d8,var(--tier),color-mix(in srgb,var(--tier) 35%,#000),var(--tier)) border-box;animation:rot 6s linear infinite}
.card.top .art::after,.card.omega .art::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.24) 50%,transparent 60%);transform:translateX(-130%);animation:sw 4.5s ease-in-out infinite}
.card{transition:transform .2s}.card:hover{transform:translateY(-4px)}
@property --a{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes rot{to{--a:360deg}}
@keyframes sw{55%,100%{transform:translateX(130%)}}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(520px 320px at 15% 8%,rgba(62,168,255,.15),transparent 70%),radial-gradient(520px 320px at 90% 25%,rgba(192,74,255,.13),transparent 70%)}
body{padding-bottom:96px}
.bnav{position:fixed;bottom:calc(10px + env(safe-area-inset-bottom,0px));left:14px;right:14px;max-width:492px;margin:0 auto;z-index:40;display:flex;justify-content:space-around;padding:8px;border-radius:18px;background:rgba(10,13,22,.88);border:1px solid rgba(240,192,74,.3);backdrop-filter:blur(8px)}
.bnav a{font:800 12px 'Cairo',sans-serif;color:var(--text-dim);text-align:center;text-decoration:none;padding:4px 8px}
.bnav a.on{color:var(--gold)}.bnav i{display:block;font-style:normal;font-size:20px}
@media (prefers-reduced-motion:reduce){.card,.sheet{animation:none!important}.card .art::after{animation:none!important}}
</style>
<script>(function(){if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;addEventListener('DOMContentLoaded',function(){var c=document.createElement('canvas');c.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';document.body.appendChild(c);var x=c.getContext('2d'),W,H,P=[];function rs(){W=c.width=innerWidth;H=c.height=innerHeight}rs();addEventListener('resize',rs);for(var i=0;i<50;i++)P.push({x:Math.random(),y:Math.random(),r:Math.random()*1.7+.4,s:Math.random()*.0004+.0001,t:Math.random()*6});(function tk(){x.clearRect(0,0,W,H);for(var i=0;i<P.length;i++){var p=P[i];p.y-=p.s;p.t+=.03;if(p.y<0)p.y=1;x.globalAlpha=.3+.3*Math.sin(p.t);x.fillStyle=i%5?'#fff':'#f0c04a';x.beginPath();x.arc(p.x*W,p.y*H,p.r,0,6.3);x.fill()}requestAnimationFrame(tk)})()})})();</script>
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

// ☰ زر القائمة الجانبية (يوضع داخل .topbar) + القائمة نفسها (navDrawerHTML)
const NAV_BTN = `<button class="nvbtn" id="nv-open" type="button" aria-label="القائمة" aria-expanded="false" aria-controls="nv-dr"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>`

// code: كود الصفحة · csrf: توكن الخروج · current: home|pull|boss|chat|top|gallery|ship|gift|sell|log · name: اسم اللاعب (اختياري)
function navDrawerHTML(code, csrf, current, name) {
    const c = esc(code)
    const items = [
        ['home', '🏠', 'العرض الرئيسي', `/u/${c}`],
        ['pull', '🎴', 'سحب شخصية', `/u/${c}/pull`],
        ['wheel', '🎡', 'عجلة الحظ', `/u/${c}/wheel`],
        ['banner', '🌌', 'بنر الأسبوع', `/u/${c}/banner`],
        ['shop', '🏪', 'متجر الشخصيات', `/u/${c}/shop`],
        ['boss', '👑', 'هجوم الزعيم', `/u/${c}/boss`],
        ['challenge', '⚔️', 'التحدي (PvP)', `/u/${c}/challenge`],
        ['arena', '🏟️', 'الأرينا PvP', `/u/${c}/pvp`],
        ['arenachallenge', '⚔️', 'تحدي ارينا', `/u/${c}/arena-challenge`],
        ['xo', '❌', 'XO أونلاين', `/u/${c}/xo`],
        ['kingdom', '🏰', 'غزو المملكة', `/u/${c}/kingdom`],
        ['raid', '🐉', 'الغزو العالمي (رايد)', `/u/${c}/raid`],
        ['chat', '💬', 'الدردشة', `/u/${c}/chat`],
        ['top', '🏆', 'أقوى اللاعبين', `/u/${c}/top`],
        ['gallery', '🖼️', 'المعارض', `/u/${c}/gallery`],
        ['ship', '🚢', 'سفينتي', `/u/${c}/ship`],
        ['gift', '🎁', 'وضع الإهداء', `/u/${c}/gift`],
        ['sell', '💰', 'بيع شخصيات', `/u/${c}/sell`],
        ['shards', '🧩', 'الشظايا والتطوير', `/u/${c}/shards`],
        ['players', '👥', 'اللاعبون', `/u/${c}/players`],
        ['war', '⚔️', 'حرب الأعلام', `/u/${c}/war`],
        ['log', '📜', 'سجل الإهداءات', `/u/${c}/log`],
        ['book', '📖', 'كتاب المجموعة', `/u/${c}/book`],
        ['titles', '🏅', 'الألقاب', `/u/${c}/titles`],
        ['rewards', '🎁', 'سجل الجوائز', `/u/${c}/rewards`],
        ['missions', '🎯', 'المهام اليومية والأسبوعية', '/missions']
    ]
    const list = items.map(([k, ic, label, href]) =>
        `<a class="nvit${k === current ? ' on' : ''}" href="${href}"${k === current ? ' aria-current="page"' : ''}><span class="nvic">${ic}</span>${label}${k === 'boss' && current !== 'boss' ? '<small class="nvcd" id="nv-bcd" hidden></small>' : ''}</a>`
    ).join('')
    const showCd = current !== 'boss'
    const bn = [['home', '🏠', 'مجموعتي', `/u/${c}`], ['pull', '✨', 'سحب', `/u/${c}/pull`], ['boss', '⚔️', 'الزعيم', `/u/${c}/boss`], ['top', '🏆', 'الأقوى', `/u/${c}/top`], ['gift', '🎁', 'إهداء', `/u/${c}/gift`], ['sell', '💰', 'بيع', `/u/${c}/sell`]]
        .map(([k, ic, l, h]) => `<a${k === current ? ' class="on"' : ''} href="${h}"><i>${ic}</i>${l}</a>`).join('')
    return `<div class="nvbd" id="nv-bd" hidden></div>
<nav class="nvdr" id="nv-dr" aria-label="القائمة" aria-hidden="true">
  <div class="nvhd">
    <span class="nvwho">${name ? `مسجّل كـ <b>${esc(name)}</b>` : 'القائمة'}</span>
    <button class="nvx" id="nv-close" type="button" aria-label="إغلاق">✕</button>
  </div>
  <div class="nvls">${list}
    <div class="nvsep"></div>
    <form method="post" action="/logout"><input type="hidden" name="csrf" value="${esc(csrf)}"><input type="hidden" name="code" value="${c}"><button class="nvit nvout" type="submit"><span class="nvic">🚪</span>خروج</button></form>
  </div>
</nav>
<style>
.nvbtn{width:40px;height:40px;border-radius:12px;border:1px solid var(--gold-dim);background:#0f1422;color:var(--gold);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;vertical-align:middle;flex:none}
.nvbtn:active{transform:scale(.95)}
.tb-l{display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap}
.nvbd{position:fixed;inset:0;z-index:60;background:rgba(3,4,9,.7);opacity:0;transition:opacity .2s}
.nvbd.on{opacity:1}
.nvdr{position:fixed;top:0;bottom:0;right:0;width:min(82vw,320px);z-index:61;background:#0f1422;border-left:1px solid #1f2740;transform:translateX(100%);transition:transform .25s;visibility:hidden;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px);font-family:'Cairo',sans-serif;direction:rtl}
.nvdr.on{transform:none;visibility:visible}
.nvhd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid #1f2740}
.nvwho{color:var(--text-dim);font-size:14px}.nvwho b{color:var(--gold)}
.nvx{width:34px;height:34px;border-radius:10px;border:1px solid #1f2740;background:transparent;color:var(--text-dim);font-size:16px;cursor:pointer}
.nvls{overflow-y:auto;padding:8px 0 calc(16px + env(safe-area-inset-bottom,0px))}
.nvit{display:flex;align-items:center;gap:12px;width:100%;padding:14px 18px;font-family:'Cairo',sans-serif;font-weight:800;font-size:15px;color:var(--text);text-decoration:none;background:transparent;border:0;border-inline-start:3px solid transparent;cursor:pointer;text-align:start}
.nvit:hover{background:#151b2e}
.nvit.on{background:#171d30;border-inline-start-color:var(--gold);color:var(--gold)}
.nvic{width:24px;text-align:center;font-size:18px}
.nvcd{margin-inline-start:auto;font-size:11px;font-weight:800;color:var(--gold);white-space:nowrap}
.nvsep{height:1px;background:#1f2740;margin:8px 0}
.nvout{color:#ff6b86}
.nvls form{margin:0}
@media(max-width:400px){.bnav{left:8px;right:8px;padding:6px 4px}.bnav a{padding:4px 3px;font-size:11px}}
</style>
<script>
(function(){
  var bt=document.getElementById('nv-open'), dr=document.getElementById('nv-dr'), bd=document.getElementById('nv-bd'), cl=document.getElementById('nv-close');
  if(!bt||!dr||!bd) return;
  var cd=document.getElementById('nv-bcd'), end=0, fin=false, known=false, lastLoad=0, t1=0, t2=0;
  function mm(ms){ var s=Math.ceil(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), r=s%60; function z(n){ return (n<10?'0':'')+n; } return (h>0?h+':'+z(m):m)+':'+z(r); }
  function render(){
    if(!cd) return;
    if(!fin){ cd.hidden=true; return; }
    cd.hidden=false;
    var l=end-Date.now();
    if(known && l<=0 && Date.now()-lastLoad>4000) load();
    cd.textContent=known?(l>0?'⏳ '+mm(l):'جارٍ الاستدعاء…'):'⏳ رأس الساعة';
  }
  function load(){
    if(!cd||document.hidden) return; lastLoad=Date.now();
    fetch('/boss/state?since=999999999',{credentials:'same-origin'})
      .then(function(r){ return r.ok?r.json():null; })
      .then(function(j){
        if(!j||!j.ok||!j.state||!j.state.boss){ fin=false; render(); return; }
        var b=j.state.boss; fin=!!b.finished; known=(b.respawnInMs!=null);
        end=known?Date.now()+b.respawnInMs:0; render();
      }).catch(function(){});
  }
  function open(){
    bd.hidden=false; dr.setAttribute('aria-hidden','false'); bt.setAttribute('aria-expanded','true');
    void dr.offsetWidth; bd.classList.add('on'); dr.classList.add('on'); document.body.style.overflow='hidden';
    if(cd){ load(); t1=setInterval(load,15000); t2=setInterval(render,1000); }
    var f=dr.querySelector('.nvit.on')||dr.querySelector('.nvit'); if(f) f.focus({preventScroll:true});
  }
  function close(){
    bd.classList.remove('on'); dr.classList.remove('on'); dr.setAttribute('aria-hidden','true'); bt.setAttribute('aria-expanded','false');
    document.body.style.overflow=''; clearInterval(t1); clearInterval(t2);
    setTimeout(function(){ if(!dr.classList.contains('on')) bd.hidden=true; },250);
    bt.focus({preventScroll:true});
  }
  bt.addEventListener('click',open); cl.addEventListener('click',close); bd.addEventListener('click',close);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape' && dr.classList.contains('on')) close(); });
})();
</script>`
}

function viewerBarHTML(viewer, code) {
    if (!viewer) return ''
    if (viewer.isOwner) {
        return `<div class="topbar">
      <span class="tb-l">${NAV_BTN}<span class="who">مسجّل كـ <b>${esc(viewer.name)}</b></span></span>
    </div>
${navDrawerHTML(code, viewer.csrf, 'home', viewer.name)}`
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
            `<span class="lg-ch">${esc(String(c.name || ''))} <small>${esc(String(resolveTierKey(c.rarity, c.evolutionLevel) || ''))} · ⚡${Number(c.power) || 0}</small></span>`).join('')
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
<div class="topbar"><span class="tb-l">${NAV_BTN}<span class="gmode">📜 سجل الإهداءات (آخر 100)</span></span><a class="pill" href="/u/${esc(code)}">رجوع</a></div>
${navDrawerHTML(code, csrf, 'log')}
<div class="lg-wrap">${rows || '<div class="lg-empty">لا توجد إهداءات بعد.</div>'}</div>
</body></html>`
}

// 🎁 سجل الجوائز (آخر 30) — من العجلة والزعيم والمعرض وغيرها (systems/rewardLog.js)
function rewardsPageHTML({ log, code, csrf }) {
    const fmt = t => { try { return new Date(Number(t)).toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' }) } catch (e) { return '' } }
    const rows = log.map(e => `<div class="lg-row lg-in">
      <div class="lg-h"><b>${esc(String(e.icon || '🎁'))} ${esc(String(e.src || 'جائزة'))}</b><span class="lg-t">${esc(fmt(e.at))}</span></div>
      <div class="lg-c">${(Array.isArray(e.lines) ? e.lines : []).map(l => `<span class="lg-ch">${esc(String(l))}</span>`).join('')}</div></div>`).join('')
    return shellHead('سجل الجوائز') + `
<style>
.lg-wrap{max-width:760px;margin:0 auto;padding:16px}
.lg-row{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px;margin:10px 0}
.lg-in{border-inline-start:4px solid #f0c04a}
.lg-h{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.lg-t{opacity:.7;font-size:.85em}
.lg-ch{display:inline-block;background:rgba(255,255,255,.1);border-radius:8px;padding:3px 8px;margin:6px 4px 0 0}
.lg-empty{text-align:center;opacity:.7;padding:40px 0}
</style>
<body>
<div class="topbar"><span class="tb-l">${NAV_BTN}<span class="gmode">🎁 سجل الجوائز (آخر 30)</span></span><a class="pill" href="/u/${esc(code)}">رجوع</a></div>
${navDrawerHTML(code, csrf, 'rewards')}
<div class="lg-wrap">${rows || '<div class="lg-empty">ما وصلتك جوائز بعد — جرّب عجلة الحظ 🎡</div>'}</div>
</body></html>`
}

// تجهيز الهدايا غير المستلمة للعرض (الصورة الأحدث من الكتالوج، ونمرر فقط روابط آمنة)
function prepareGifts(inbox, catIdx) {
    return (inbox || [])
        .filter(g => g && !g.seen && g.kind !== 'reward')
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

// إشعارات جوائز الترتيب (قروبات المملكة) داخل نفس صندوق الهدايا
function prepareRewardGifts(list) {
    return (list || []).map(r => ({
        kind: 'reward',
        id: String(r.id || ''),
        group: String(r.group || ''),
        color: /^#[0-9a-fA-F]{6}$/.test(r.color) ? r.color : '#f0c04a',
        pos: Number(r.pos) || 0,
        period: String(r.period || ''),
        items: (r.items || []).map(x => String(x)),
        charName: String(r.charName || ''),
        charRarity: String(r.charRarity || ''),
        charPower: Number(r.charPower) || 0,
        img: safeImageUrl(r.charImage),
        at: Number(r.at) || Date.now()
    })).filter(r => /^[a-f0-9]{16}$/.test(r.id))
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
    if(g.kind==='reward'){
      var rt=el('div','g-top'); rt.appendChild(el('span','',(i+1)+' / '+G.length)); rt.appendChild(el('span','','🏆 جائزة ترتيب '+g.period)); box.appendChild(rt);
      var rl=el('div','g-line','المركز '); rl.appendChild(el('b','',String(g.pos))); rl.appendChild(document.createTextNode(' بقروب ')); var gb=el('b','',g.group); gb.style.direction='ltr'; gb.style.display='inline-block'; rl.appendChild(gb); box.appendChild(rl);
      var ra=el('div','g-art'); if(g.img){ ra.style.backgroundImage=\"url('\"+g.img+\"')\"; } else { ra.textContent='🏆'; } box.appendChild(ra);
      if(g.charName){ box.appendChild(el('div','g-name',g.charName)); if(g.charRarity) box.appendChild(el('div','g-chip',g.charRarity)); }
      g.items.forEach(function(t){ box.appendChild(el('div','g-line',t)); });
      box.appendChild(el('div','g-ago',ago(g.at)));
      var rb=el('button','btn purple','استلام والتالية'); rb.type='button';
      rb.onclick=function(){ rb.disabled=true; ack(g.id); i++; render(); };
      box.appendChild(rb); return;
    }
    var top=el('div','g-top'); top.appendChild(el('span','',(i+1)+' / '+G.length)); top.appendChild(el('span','','هدية جديدة')); box.appendChild(top);
    var line=el('div','g-line','أهداك '); line.appendChild(el('b','',g.from)); line.appendChild(document.createTextNode(' شخصية')); box.appendChild(line);
    var art=el('div','g-art'); if(g.img){ art.style.backgroundImage="url('"+g.img+"')"; } else { art.textContent='👤'; } box.appendChild(art);
    box.appendChild(el('div','g-name',g.name)); if(g.anime) box.appendChild(el('div','g-chip',g.anime));
    var st=el('div','g-stats'); var a=el('div'); a.appendChild(el('i','','القوة')); a.appendChild(el('b','',Number(g.power).toLocaleString('en-US'))); var b=el('div'); b.appendChild(el('i','','الرتبة')); b.appendChild(el('b','',g.tier)); st.appendChild(a); st.appendChild(b); box.appendChild(st);
    var evo=el('div','g-evo','التطوير '); var stars=g.omega? '★★★★★★★' : new Array(g.evo+1).join('★')+new Array(7-g.evo+1).join('☆'); var sp=el('span','',stars); if(g.omega) sp.style.color='#ffc933'; evo.appendChild(sp); evo.appendChild(document.createTextNode(g.omega? ' (Ω)' : ' ('+g.evo+'/6)')); box.appendChild(evo);
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
    <span class="tb-l">${NAV_BTN}<span class="gmode">وضع الإهداء</span></span>
    <a class="pill" href="/u/${code}">← رجوع للعرض</a>
  </div>
  ${navDrawerHTML(code, viewer.csrf, 'gift', viewer.name)}
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
    <span class="tb-l">${NAV_BTN}<span class="gmode">بيع الشخصيات</span></span>
    <a class="pill" href="/u/${code}">← رجوع للعرض</a>
  </div>
  ${navDrawerHTML(code, viewer.csrf, 'sell', viewer.name)}
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

// 🏪 متجر الشخصيات (نفس عروض .متجر بالواتس — تتجدد كل ساعة بتوقيت السعودية)
function shopItemOut(d, catIdx) {
    const c = (d && d.character) || {}
    const t = TIERS[c.rarity] || TIERS['عادي']
    // 🖼️ نفس نظام صفحة السحب: أحدث صورة من الكتالوج، SSS وفوق = رابط https فقط، والرتب الأقل = رابط أو ملف محلي من ./characters
    let disp = c
    try { if (catIdx) disp = resolveDisplayChar(c, catIdx) } catch (e) { disp = c }
    const imgUrl = t.idx >= FIRST_IMAGE_TIER
        ? (safeImageUrl(disp.image) || safeImageUrl(c.image) || '')
        : (safeImageUrl(disp.image) || localCharImageUrl(disp.image) || safeImageUrl(c.image) || localCharImageUrl(c.image) || '')
    return {
        id: String(d._id),
        name: String(c.name || '؟'),
        rarity: String(c.rarity || ''),
        power: Math.round(Number(c.power) || 0),
        form: String(c.form || 'عادي'),
        ability: String(c.ability || ''),
        price: Math.round(Number(d.price) || 0),
        img: imgUrl,
        color: t.color,
        stars: t.stars,
        en: t.lang === 'en'
    }
}

function shopPageHTML({ viewer, code, items, money, msLeft }) {
    return `${shellHead('متجر الشخصيات')}
<body><div style="padding:30px 16px 90px">
  <div class="topbar">
    <span class="tb-l">${NAV_BTN}<span class="gmode">🏪 متجر الشخصيات</span></span>
    <a class="pill" href="/u/${code}">← رجوع للعرض</a>
  </div>
  ${navDrawerHTML(code, viewer.csrf, 'shop', viewer.name)}
<style>
.sp{max-width:640px;margin:0 auto}
.sp-sub{text-align:center;color:var(--text-dim);font-size:12px;margin:6px 0 14px;line-height:1.8}
.sp-bar{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.sp-bar div{background:#0f1422;border:1px solid #222a42;border-radius:14px;padding:8px 10px;text-align:center}
.sp-bar small{display:block;color:var(--text-dim);font-size:11px}
.sp-bar b{display:block;font:700 20px 'Oswald',sans-serif;color:var(--gold);direction:ltr}
.sp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.sp-c{--t:#8b93a1;position:relative;display:flex;flex-direction:column;border-radius:16px;border:2px solid var(--t);background:#0f1422;overflow:hidden;box-shadow:0 0 14px color-mix(in srgb,var(--t) 30%,transparent);transition:opacity .3s,filter .3s}
.sp-c.sss{border-color:transparent;background:linear-gradient(#0f1422,#0f1422) padding-box,conic-gradient(from var(--a,0deg),#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860) border-box;animation:rot 5s linear infinite}
.sp-tt{display:flex;justify-content:space-between;align-items:center;padding:8px 10px 0}
.sp-tn{font-weight:900;font-size:13px;color:var(--t)}.sp-tn.en{font-family:'Oswald',sans-serif;letter-spacing:.1em}
.sp-pw{font:700 12px 'Oswald',sans-serif;color:var(--text-dim);direction:ltr}
.sp-st{padding:0 10px;color:var(--t);font-size:11px;letter-spacing:2px}
.sp-art{position:relative;margin:8px 10px;height:96px;border-radius:12px;overflow:hidden;display:grid;place-items:center;font:900 44px 'Cairo',sans-serif;color:var(--t);background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--t) 28%,#0f1422),#0a0d16)}
.sp-art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sp-nm{padding:0 10px;font-weight:900;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-ab{padding:0 10px;color:var(--text-dim);font-size:11.5px;min-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-pr{margin-top:auto;padding:8px 10px 6px;font:700 15px 'Oswald',sans-serif;color:var(--gold);direction:ltr;text-align:right}
.sp-buy{width:calc(100% - 20px);margin:0 10px 10px;padding:9px;border:0;border-radius:12px;font:900 14px 'Cairo',sans-serif;cursor:pointer;color:#0a0d16;background:linear-gradient(90deg,var(--gold-dim),var(--gold))}
.sp-buy:focus-visible{outline:2px solid #fff;outline-offset:2px}
.sp-buy:disabled{opacity:.5;cursor:not-allowed;filter:grayscale(.6)}
.sp-c.gone,.sp-c.mine{opacity:.5;filter:grayscale(.7)}
.sp-c.mine{opacity:.75;filter:none}
.sp-c.gone .sp-buy{background:#3a1d24;color:#ff9aa6}
.sp-c.mine .sp-buy{background:#173a28;color:#4fe08a}
.sp-empty{text-align:center;color:var(--text-dim);padding:50px 10px;line-height:2}
.sp-toast{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom,0px));transform:translate(-50%,30px);opacity:0;pointer-events:none;background:#151b2e;border:1px solid var(--gold-dim);border-radius:14px;padding:12px 16px;font-weight:700;font-size:14px;transition:.3s;max-width:92%;text-align:center;z-index:70}
.sp-toast.on{transform:translate(-50%,0);opacity:1}.sp-toast.good{border-color:#4fe08a}.sp-toast.bad{border-color:#ff6b6b;color:#ff9aa6}
@media (prefers-reduced-motion:reduce){.sp-c.sss{animation:none}.sp-toast{transition:none}}
</style>
  <div class="sp">
    <p class="sp-sub">10 شخصيات جديدة عند رأس كل ساعة بتوقيت السعودية<br>كل شخصية تُباع لمشترٍ واحد فقط — الأسرع يحصل عليها</p>
    <div class="sp-bar"><div><small>💳 رصيدك</small><b id="sp-money">0</b></div><div><small>⏳ التجديد بعد</small><b id="sp-cd">--:--</b></div></div>
    <div class="sp-grid" id="sp-grid"></div>
    <div class="sp-empty" id="sp-empty" hidden>🏪 المتجر فارغ حالياً<br>تظهر عروض جديدة عند رأس الساعة القادمة</div>
  </div>
</div>
<div class="sp-toast" id="sp-toast" role="status" aria-live="polite"></div>
<script>
(function(){
  var CODE=${jsonForScript(code)}, CSRF=${jsonForScript(viewer.csrf)};
  var items=${jsonForScript(items)}, money=${Number(money) || 0}, end=Date.now()+${Math.max(0, Math.round(Number(msLeft) || 0))};
  var gone={}, mine={}, busy={}, polling=false, lastPoll=Date.now(), th=0;
  function $(i){ return document.getElementById(i); }
  function fm(n){ return Number(n).toLocaleString('en-US'); }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function toast(m,k){ var t=$('sp-toast'); t.textContent=m; t.className='sp-toast on '+(k||''); clearTimeout(th); th=setTimeout(function(){ t.className='sp-toast'; },3200); }
  function card(it){
    var st=mine[it.id]?'mine':(gone[it.id]?'gone':'');
    var label=st==='mine'?'تم الشراء ✅':st==='gone'?'نفذت الكمية':(money<it.price?'رصيدك لا يكفي':'اشترِ الشخصية');
    var dis=(st||busy[it.id]||money<it.price)?' disabled':'';
    return '<article class="sp-c'+(it.rarity==='SSS'?' sss':'')+(st?' '+st:'')+'" style="--t:'+esc(it.color)+'">'
      +'<div class="sp-tt"><span class="sp-tn'+(it.en?' en':'')+'">'+esc(it.rarity)+'</span><span class="sp-pw">'+fm(it.power)+' PWR</span></div>'
      +'<div class="sp-st">'+new Array(it.stars+1).join('★')+'</div>'
      +'<div class="sp-art">'+esc(Array.from(it.name)[0]||'?')+(it.img?'<img src="'+esc(it.img)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'')+'</div>'
      +'<div class="sp-nm">'+esc(it.name)+'</div>'
      +'<div class="sp-ab">✨ '+esc(it.ability||'لا يوجد')+'</div>'
      +'<div class="sp-pr">💰 '+fm(it.price)+'</div>'
      +'<button class="sp-buy" type="button" data-id="'+esc(it.id)+'"'+dis+'>'+label+'</button></article>';
  }
  function draw(){
    $('sp-money').textContent=fm(money);
    $('sp-grid').innerHTML=items.map(card).join('');
    $('sp-empty').hidden=items.length>0;
  }
  function buy(id,btn){
    if(busy[id]||gone[id]||mine[id]) return;
    busy[id]=1; btn.disabled=true; btn.textContent='جارٍ الشراء…';
    fetch('/shop/buy',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:CSRF,code:CODE,id:id})})
    .then(function(r){ return r.json().catch(function(){ return {ok:false,message:'رد غير مفهوم من السيرفر'}; }).then(function(j){ return {s:r.status,j:j}; }); })
    .then(function(x){
      delete busy[id];
      if(x.s===401){ location.href='/login?code='+CODE; return; }
      if(x.j.ok){ mine[id]=1; if(x.j.money!=null) money=x.j.money; toast(x.j.message,'good'); }
      else if(x.j.code==='SOLD_OUT'){ gone[id]=1; toast(x.j.message,'bad'); }
      else { toast(x.j.message||'فشل الشراء','bad'); }
      draw(); poll(true);
    })
    .catch(function(){ delete busy[id]; toast('لم يصلنا رد من السيرفر — حدّث الصفحة وتأكد من رصيدك قبل إعادة المحاولة.','bad'); draw(); });
  }
  $('sp-grid').addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.sp-buy'); if(b&&!b.disabled) buy(b.getAttribute('data-id'),b);
  });
  // مزامنة حيّة: لو اشترى غيرك عرضاً يتحول عندك فوراً إلى «نفذت الكمية»، وعند رأس الساعة يتجدد المتجر
  function poll(force){
    if(polling||(document.hidden&&!force)) return; polling=true; lastPoll=Date.now();
    fetch('/shop/state',{credentials:'same-origin',cache:'no-store'})
    .then(function(r){ if(r.status===401){ location.href='/login?code='+CODE; return null; } return r.ok?r.json():null; })
    .then(function(j){
      polling=false; if(!j||!j.ok) return;
      money=j.money; end=Date.now()+j.msLeft;
      var known={}; items.forEach(function(it){ known[it.id]=1; });
      var fresh=j.items.some(function(it){ return !known[it.id]; });
      if(fresh){ items=j.items; gone={}; mine={}; toast('🔄 تم تجديد المتجر — عروض جديدة','good'); }
      else {
        var live={}; j.items.forEach(function(it){ live[it.id]=1; });
        items.forEach(function(it){ if(!live[it.id]&&!mine[it.id]) gone[it.id]=1; });
      }
      draw();
    })
    .catch(function(){ polling=false; });
  }
  function tick(){
    var l=end-Date.now();
    if(l<=0){ $('sp-cd').textContent='00:00'; if(Date.now()-lastPoll>2500) poll(true); return; }
    var s=Math.ceil(l/1000), m=Math.floor(s/60), r=s%60;
    $('sp-cd').textContent=(m<10?'0':'')+m+':'+(r<10?'0':'')+r;
  }
  draw(); tick(); setInterval(tick,1000); setInterval(poll,5000);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) poll(true); });
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
body::before{content:'';position:fixed;inset:-20%;z-index:-1;pointer-events:none;background:radial-gradient(40% 35% at 20% 20%,rgba(91,42,122,.5),transparent 70%),radial-gradient(45% 40% at 80% 30%,rgba(18,71,107,.55),transparent 70%),radial-gradient(50% 45% at 50% 95%,rgba(240,192,74,.16),transparent 70%);animation:paNeb 26s ease-in-out infinite alternate;}
body::after{content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;background-image:radial-gradient(1.5px 1.5px at 12% 22%,#fff,transparent),radial-gradient(1px 1px at 33% 64%,#ffe9a8,transparent),radial-gradient(1.5px 1.5px at 58% 18%,#fff,transparent),radial-gradient(1px 1px at 76% 52%,#bfe3ff,transparent),radial-gradient(1.5px 1.5px at 90% 80%,#fff,transparent),radial-gradient(1px 1px at 22% 88%,#ffe9a8,transparent),radial-gradient(1px 1px at 66% 90%,#fff,transparent);animation:paTw 5s ease-in-out infinite alternate;}
@keyframes paNeb{to{transform:translate(4%,-3%) rotate(6deg) scale(1.12);}}
@keyframes paTw{from{opacity:.35;}to{opacity:.95;}}
@media (prefers-reduced-motion:reduce){body::before,body::after{animation:none;}}
#pa-stage{position:fixed;inset:0;z-index:70;background:#05070d;display:none;overflow:hidden;}
#pa-fx{position:absolute;inset:0;width:100%;height:100%;}
#pa-flash{position:absolute;inset:0;opacity:0;pointer-events:none;z-index:4;}
.pa-bar{position:absolute;left:0;right:0;height:9vh;background:#000;z-index:3;transition:transform 1.2s cubic-bezier(.2,.8,.2,1);}
.pa-bar.t{top:0;transform:translateY(-100%);}.pa-bar.b{bottom:0;transform:translateY(100%);}
#pa-stage.cin .pa-bar{transform:none;}
#pa-rv{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:11vh 16px;z-index:2;pointer-events:none;perspective:1000px;}
#pa-rv>*{pointer-events:auto;}
.pa-bn{text-align:center;font-family:'Cairo',sans-serif;font-weight:900;font-size:44px;color:#fff;text-shadow:0 0 20px var(--pt),0 0 50px var(--pt);line-height:1.1;opacity:0;animation:paBnA 1.2s cubic-bezier(.2,.8,.2,1) forwards;}
.pa-bn.en{font-family:'Oswald',sans-serif;font-weight:700;font-size:58px;animation-name:paBnE;animation-duration:1.4s;}
.pa-bn small{display:block;margin-top:8px;font-family:'Cairo',sans-serif;font-size:14px;font-weight:800;color:var(--pt);letter-spacing:0;}
.pa-bn::after{content:'';display:block;height:2px;margin:10px auto 0;width:0;background:linear-gradient(90deg,transparent,var(--pt),transparent);animation:paLn 1.2s .5s forwards;}
@keyframes paBnA{from{opacity:0;transform:scale(1.7);filter:blur(8px);}to{opacity:1;transform:none;filter:none;}}
@keyframes paBnE{from{opacity:0;letter-spacing:.8em;filter:blur(8px);}to{opacity:1;letter-spacing:.14em;filter:none;}}
@keyframes paLn{to{width:min(300px,80vw);}}
.pa-cw{transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .15s;}
.pa-fl{position:relative;width:min(270px,66vw);transform-style:preserve-3d;animation:paFlip 1.4s .8s cubic-bezier(.3,1,.3,1) both;}
@keyframes paFlip{from{transform:rotateY(180deg) translateY(60px) scale(.7);}60%{transform:rotateY(20deg) translateY(-10px) scale(1.06);}to{transform:none;}}
.pa-fl .card{width:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden;}
.pa-fl .art{flex:none;min-height:0;height:min(270px,32vh);}
.pa-fl .tier-tag{padding:10px 14px 4px;}
.pa-fl .stars{padding:0 14px 8px;font-size:18px;min-height:30px;}
.pa-fl .plate{padding:12px 12px 14px;}
.pa-fl .name-en{font-size:21px;}
.pa-fl .anime-chip{margin-top:8px;font-size:13px;}
.pa-bk{position:absolute;inset:0;border-radius:15px;border:2.5px solid var(--pt);backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:rotateY(180deg);display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 45%,color-mix(in srgb,var(--pt) 45%,#0b0e18),#06080f 75%);box-shadow:0 0 40px var(--pt);}
.pa-bk i{width:62%;aspect-ratio:1;border-radius:50%;border:2px solid var(--pt);display:flex;align-items:center;justify-content:center;color:var(--pt);font-size:56px;font-style:normal;box-shadow:inset 0 0 30px var(--pt);}
.pa-star{display:inline-block;opacity:0;animation:paSp .45s cubic-bezier(.2,.9,.2,1.4) forwards;animation-delay:calc(2.3s + var(--i)*.3s);}
@keyframes paSp{from{opacity:0;transform:scale(3);}to{opacity:1;transform:none;}}
.pa-plate{opacity:0;animation:paFi .6s forwards;animation-delay:calc(2.4s + var(--n)*.3s);}
@keyframes paFi{to{opacity:1;}}
.pa-foil{position:absolute;inset:0;z-index:3;pointer-events:none;mix-blend-mode:color-dodge;opacity:.45;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.4) 44%,rgba(255,80,160,.35) 50%,rgba(80,200,255,.35) 56%,transparent 70%);background-size:260% 100%;background-position:calc(var(--mx,.5)*100%) 0;}
#pa-rv.fast .pa-fl,#pa-rv.fast .pa-star,#pa-rv.fast .pa-plate,#pa-rv.fast .pa-bn,#pa-rv.fast .pa-bn::after{animation-duration:.01s!important;animation-delay:0s!important;}
.pa-acts{display:flex;gap:10px;opacity:0;animation:paFi .5s forwards;}
.pa-acts button{font-family:inherit;font-weight:800;font-size:15px;padding:10px 20px;border-radius:12px;cursor:pointer;border:1.5px solid var(--gold);background:#0b0e18;color:var(--gold);}
.pa-acts button.p{background:var(--gold);color:#0a0d16;}
#pa-skip{position:absolute;top:calc(10vh + env(safe-area-inset-top,0px));left:14px;z-index:6;font-family:inherit;font-weight:700;font-size:13px;color:#cfd6e6;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:20px;padding:6px 14px;cursor:pointer;}
</style>
<body><div style="padding:30px 16px 60px">
  <div class="topbar">
    <span class="tb-l">${NAV_BTN}<span class="gmode">سحب شخصية</span></span>
    <a class="pill" href="/u/${code}">← رجوع للعرض</a>
  </div>
  ${navDrawerHTML(code, viewer.csrf, 'pull', viewer.name)}
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

<div id="pa-stage" aria-hidden="true"><canvas id="pa-fx"></canvas><div class="pa-bar t"></div><div class="pa-bar b"></div><div id="pa-flash"></div><div id="pa-rv"></div><button id="pa-skip" type="button">تخطي ⏭</button></div>
<script>
(function(){
  var CODE=${jsonForScript(code)}, CSRF=${jsonForScript(viewer.csrf)}, S=${jsonForScript(state)};
  var busy=false, hist=[], endAt=Date.now()+S.resetIn*1000, reloading=false;
  function $(id){ return document.getElementById(id); }
  function el(tag,cls,txt){ var e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
  function show(kind,text){ var m=$('msg'); if(!text){ m.hidden=true; return; } m.className='gp-msg '+kind; m.textContent=text; m.hidden=false; }
  function stats(){
    $('s-pulls').textContent=S.pulls+'/'+S.max+(S.bonus>0?' +'+S.bonus+'🎡':'');
    $('s-pity').textContent=S.pity+'/'+S.pityMax;
    $('s-cap').textContent=S.count+'/'+S.cap;
    $('go').disabled=busy;
    $('mg-good').disabled=busy; $('mg-leg').disabled=busy;
  }
  function tick(){
    var s=Math.max(0,Math.ceil((endAt-Date.now())/1000));
    $('reset').textContent='🎁 تتجدد السحبات عند رأس الساعة — بعد '+Math.floor(s/60)+' دقيقة '+(s%60)+' ثانية';
    if(s<=0 && !reloading && S.pulls<=0 && !paOn){ reloading=true; location.reload(); }
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
  // ===== أنميشن السحب (بوابة الاستدعاء) — شكلي فقط، السحب الفعلي تم بالسيرفر قبل ما يبدأ =====
  var PA_T={'عادي':{stars:1,A:1900,T:5200,np:70,rings:1,star:0},'ممتاز':{stars:2,A:2600,T:6500,np:140,rings:2,star:0},'اسطوري':{stars:3,A:3400,T:8000,np:260,rings:3,star:1},'SSS':{stars:4,A:4600,T:10000,np:440,rings:4,star:2}};
  var PA_COL={'عادي':'#aab2c0','ممتاز':'#3ea8ff','اسطوري':'#f0c04a','SSS':'#ff3860'};
  var PA_NB=[{x:.2,y:.25,r:.55,c:'#3a2a8a',s:1,p:0},{x:.8,y:.3,r:.5,c:'#6a2a7a',s:1.3,p:2},{x:.5,y:.8,r:.6,c:'#0f4a6b',s:.8,p:4},{x:.15,y:.85,r:.4,c:'#2a3a8a',s:1.1,p:1},{x:.9,y:.85,r:.4,c:'#5a2a6a',s:.9,p:3}];
  var PA_RB=['#ff3860','#f0c04a','#b83fff','#00e5ff'];
  var paRaf=0, paOn=false;
  function paRgba(h,a){ var n=parseInt(h.slice(1),16); return 'rgba('+(n>>16)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
  function paMix(a,b,m,al){ var x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16),f=function(i){ return Math.round(((x>>i)&255)*(1-m)+((y>>i)&255)*m); }; return 'rgba('+f(16)+','+f(8)+','+f(0)+','+al+')'; }
  function paTier(c){ if(c.sss) return 'SSS'; var s=Number(c.stars)||1; return s>=4?'SSS':(s===3?'اسطوري':(s===2?'ممتاز':'عادي')); }
  function paPlay(c,done){
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){ done(false); return; }
    var tier=paTier(c), col=/^#[0-9a-f]{6}$/i.test(c.color||'')?c.color:PA_COL[tier], cfg=Object.assign({},PA_T[tier],{c:col});
    var A=cfg.A, T=cfg.T, st=$('pa-stage'), rv=$('pa-rv'), fl=$('pa-flash'), sk=$('pa-skip'), cv=$('pa-fx'), ctx=cv.getContext('2d');
    var W=innerWidth, H=innerHeight, dpr=Math.min(2,window.devicePixelRatio||1);
    var cx=W/2, cy=H*.44, R=Math.min(W,H*.9)*.3, inw=[], parts=[], rings=[], dust=[], sf=[], streak=-1, last=performance.now(), t0=last, fin=false, skipped=false;
    function initBg(){ cv.width=W*dpr; cv.height=H*dpr; sf=[]; for(var k=0;k<170;k++) sf.push({a:Math.random()*6.283,d:Math.random(),z:.3+Math.random()*.7}); dust=[]; for(var i=0;i<90;i++) dust.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.8+.4,ph:Math.random()*6,v:.1+Math.random()*.3}); }
    function onRs(){ W=innerWidth; H=innerHeight; cx=W/2; cy=H*.44; R=Math.min(W,H*.9)*.3; initBg(); }
    function onKey(e){ if(e.key==='Escape'||e.key==='Enter'||e.key===' '){ if(!fin){ e.preventDefault(); skipNow(); } } }
    function skipNow(){ if(fin||skipped) return; skipped=true; t0=performance.now()-T-1; rv.classList.add('fast'); }
    function end(again){
      cancelAnimationFrame(paRaf); removeEventListener('resize',onRs); document.removeEventListener('keydown',onKey);
      st.onpointermove=null; st.style.display='none'; paOn=false; done(again);
    }
    function burst(t,n,big,white){
      rings.push({t:t,max:Math.max(W,H)*(big?.95:.6),c:white?'#ffffff':cfg.c});
      fl.style.background=white?'#fff':cfg.c; if(fl.animate) fl.animate([{opacity:white?.95:.6},{opacity:0}],{duration:white?1200:700});
      for(var i=0;i<n;i++){ var a=Math.random()*6.283, v=2+Math.random()*(big?13:8);
        var cc=tier==='SSS'&&Math.random()<.5?'hsl('+Math.floor(Math.random()*360)+',95%,66%)':(Math.random()<.5?cfg.c:'#fff');
        parts.push({x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1,l:1400+Math.random()*1900,m:3300,s:1+Math.random()*3,c:cc}); }
    }
    function reveal(){
      var b=el('div','pa-bn'+(tier==='SSS'?' en':''),tier==='SSS'?'SSS':(c.tier||tier));
      if(tier==='SSS') b.appendChild(el('small','','🌌 إيقاظ أسطوري 🌌'));
      rv.appendChild(b);
      var cw=el('div','pa-cw'), f=el('div','pa-fl'); cw.id='pa-cw';
      var bk=el('div','pa-bk'); bk.appendChild(el('i','','★')); f.appendChild(bk);
      var cd=card(c); cd.classList.remove('pl-pop');
      var sd=cd.querySelector('.stars'); if(sd){ sd.textContent=''; for(var i=0;i<c.stars;i++){ var sp=el('span','pa-star','★'); sp.style.setProperty('--i',i); sd.appendChild(sp); } }
      var pl=cd.querySelector('.plate'); if(pl){ pl.classList.add('pa-plate'); pl.style.setProperty('--n',c.stars); }
      if(c.stars>=3) cd.appendChild(el('div','pa-foil'));
      f.appendChild(cd); cw.appendChild(f); rv.appendChild(cw);
    }
    function finish(){
      if(fin) return; fin=true; sk.style.display='none';
      var a=el('div','pa-acts'), ok=el('button','','✔ تم');
      ok.onclick=function(){ end(false); }; a.appendChild(ok);
      if(S.pulls>0){ var ag=el('button','p','🎴 اسحب مرة ثانية'); ag.onclick=function(){ end(true); }; a.appendChild(ag); }
      rv.appendChild(a);
    }
    var ev=[{at:A-300,f:function(){ st.classList.add('cin'); }},{at:A,f:function(t){ burst(t,cfg.np,tier==='SSS'||tier==='اسطوري',true); streak=t; }},{at:A+250,f:reveal},
            {at:A+2450,f:function(t){ if(tier!=='عادي') burst(t,tier==='SSS'?200:90,false,false); }}];
    if(tier==='SSS') ev.push({at:A+1500,f:function(t){ burst(t,240,true,true); }});
    ev.push({at:T,f:finish});
    paOn=true; st.style.display='block'; st.classList.remove('cin'); rv.innerHTML=''; rv.className=''; rv.style.setProperty('--pt',cfg.c); sk.style.display='block'; sk.onclick=skipNow;
    initBg(); addEventListener('resize',onRs); document.addEventListener('keydown',onKey);
    st.onpointermove=function(e){ var cw=$('pa-cw'); if(!cw) return; var x=e.clientX/W-.5, y=e.clientY/H-.5; cw.style.setProperty('--ry',(x*22)+'deg'); cw.style.setProperty('--rx',(-y*18)+'deg'); var f=cw.querySelector('.pa-foil'); if(f) f.style.setProperty('--mx',(x+.5).toFixed(2)); };
    function frame(now){
      var t=now-t0, dt=Math.min(50,now-last); last=now;
      var build=Math.min(1,t/(A*.55)), charge=Math.max(0,Math.min(1,(t-A*.3)/(A*.7)));
      var bc=tier==='SSS'?(charge<.6?'#f0c04a':'#ff3860'):cfg.c;
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1;
      var sh=(t<A&&charge>.6&&tier!=='عادي')?(tier==='SSS'?6:3)*charge:0;
      ctx.translate((Math.random()-.5)*sh*2,(Math.random()-.5)*sh*2);
      ctx.fillStyle='#04060d'; ctx.fillRect(-20,-20,W+40,H+40);
      var warp=t<A?charge:Math.max(0,1-(t-A)/1200), mx=Math.min(1,charge*.85+(t>A?.3:0)), MR=Math.max(W,H);
      ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
      for(var bi=0;bi<PA_NB.length;bi++){ var nb=PA_NB[bi], bx=W*(nb.x+.09*Math.sin(t/(5200/nb.s)+nb.p)), by=H*(nb.y+.07*Math.cos(t/(6100/nb.s)+nb.p)), brr=MR*nb.r*(1+.15*mx), tc=(tier==='SSS'&&t>A)?PA_RB[bi%4]:bc;
        var ng=ctx.createRadialGradient(bx,by,0,bx,by,brr); ng.addColorStop(0,paMix(nb.c,tc,mx,.32+.2*mx)); ng.addColorStop(1,paMix(nb.c,tc,mx,0)); ctx.fillStyle=ng; ctx.fillRect(-20,-20,W+40,H+40); }
      for(var si=0;si<sf.length;si++){ var s0=sf[si], d0=s0.d; s0.d+=(.00005+.0011*warp*warp)*s0.z*dt*(.3+s0.d); if(s0.d>1.05){ s0.d=Math.random()*.05; s0.a=Math.random()*6.283; }
        var ca=Math.cos(s0.a), sa2=Math.sin(s0.a), rr0=MR*.8; ctx.strokeStyle=warp>.4?paRgba(bc,Math.min(1,.2+s0.d*s0.z)):'rgba(255,255,255,'+Math.min(1,.12+s0.d*s0.z)+')'; ctx.lineWidth=s0.z*1.7;
        ctx.beginPath(); ctx.moveTo(cx+ca*d0*rr0,cy+sa2*d0*rr0); ctx.lineTo(cx+ca*s0.d*rr0,cy+sa2*s0.d*rr0); ctx.stroke(); }
      for(var i=0;i<dust.length;i++){ var d=dust[i]; d.y-=d.v; if(d.y<-5) d.y=H+5; ctx.fillStyle='rgba(255,230,170,'+(.15+.25*Math.sin(t/500+d.ph))+')'; ctx.fillRect(d.x,d.y,d.r,d.r); }
      var fade=t<A?1:Math.max(0,1-(t-A)/900);
      if(fade>0){
        ctx.save(); ctx.translate(cx,cy); ctx.globalAlpha=fade; ctx.strokeStyle=paRgba(bc,.9); ctx.shadowColor=bc; ctx.shadowBlur=14;
        var rot=t/1000, pul=1+.03*Math.sin(t/120)*charge;
        for(var r=0;r<cfg.rings;r++){ var rr=cfg.rings===1?R*pul:R*(.5+.5*r/Math.max(1,cfg.rings-1))*pul;
          ctx.save(); ctx.rotate(rot*(r%2?-.9:.7)*(1+r*.3)); ctx.lineWidth=1.5+(r===cfg.rings-1?1.5:0); ctx.setLineDash(r%2?[3,9]:[]); ctx.beginPath(); ctx.arc(0,0,rr,0,6.283*build); ctx.stroke();
          if(r===cfg.rings-1){ ctx.setLineDash([]); for(var k=0;k<48*build;k++){ var an=k*6.283/48; ctx.beginPath(); ctx.moveTo(Math.cos(an)*rr,Math.sin(an)*rr); var l=k%4?6:14; ctx.lineTo(Math.cos(an)*(rr+l),Math.sin(an)*(rr+l)); ctx.stroke(); } }
          ctx.restore(); }
        for(var s=0;s<cfg.star;s++){ var n=s?9:7, kk=s?4:3, rs=R*(s?1.05:.85)*pul; ctx.save(); ctx.rotate(rot*(s?.5:-.4)); ctx.lineWidth=1.2; ctx.beginPath();
          var segs=Math.floor(n*build); for(var q=0;q<=segs;q++){ var a2=(q*kk%n)*6.283/n-1.57, px=Math.cos(a2)*rs, py=Math.sin(a2)*rs; if(q) ctx.lineTo(px,py); else ctx.moveTo(px,py); } ctx.stroke(); ctx.restore(); }
        ctx.restore();
        if(charge>0){
          if(t<A) for(var z=0;z<(tier==='SSS'?3:1.5);z++) if(Math.random()<.8) inw.push({a:Math.random()*6.283,r:R*(1.1+Math.random()*1.2),sp:1.5+charge*5,s:1+Math.random()*2,c:Math.random()<.5?bc:'#fff'});
          var orb=(8+75*charge*charge)*(1+.08*Math.sin(t/(90-60*charge))), og=ctx.createRadialGradient(cx,cy,0,cx,cy,orb*2.2);
          og.addColorStop(0,'rgba(255,255,255,'+fade+')'); og.addColorStop(.35,paRgba(bc,.8*fade)); og.addColorStop(1,paRgba(bc,0)); ctx.fillStyle=og; ctx.beginPath(); ctx.arc(cx,cy,orb*2.2,0,6.283); ctx.fill();
        }
        if(build>=1&&t<A){ var pw=(tier==='SSS'?70:40)*charge, pg=ctx.createLinearGradient(cx-pw,0,cx+pw,0); pg.addColorStop(0,paRgba(bc,0)); pg.addColorStop(.5,'rgba(255,255,255,'+(.55*charge)+')'); pg.addColorStop(1,paRgba(bc,0)); ctx.fillStyle=pg; ctx.fillRect(cx-pw,0,pw*2,cy); }
      }
      for(var m=inw.length-1;m>=0;m--){ var p=inw[m]; p.r-=p.sp*dt/16; p.a+=.035; if(p.r<12){ inw.splice(m,1); continue; }
        ctx.fillStyle=p.c; ctx.globalAlpha=Math.min(1,p.r/R); ctx.beginPath(); ctx.arc(cx+Math.cos(p.a)*p.r,cy+Math.sin(p.a)*p.r,p.s,0,6.283); ctx.fill(); }
      ctx.globalAlpha=1;
      if(t>A){ var ra=Math.min(1,(t-A)/1000)*.38, RR=Math.max(W,H), ro=(t-A)/6000;
        for(var j=0;j<12;j++){ var an2=j*.5236+ro, rg=ctx.createRadialGradient(cx,cy,0,cx,cy,RR), c2=tier==='SSS'?'hsla('+((j*30+t/10)%360)+',95%,62%,'+ra+')':paRgba(cfg.c,ra);
          rg.addColorStop(0,c2); rg.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=rg; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(an2-.07)*RR,cy+Math.sin(an2-.07)*RR); ctx.lineTo(cx+Math.cos(an2+.07)*RR,cy+Math.sin(an2+.07)*RR); ctx.closePath(); ctx.fill(); } }
      if(streak>=0){ var age=(t-streak)/1700; if(age<1){ var sa=1-age, sg=ctx.createLinearGradient(0,0,W,0); sg.addColorStop(0,paRgba(cfg.c,0)); sg.addColorStop(.5,'rgba(255,255,255,'+sa+')'); sg.addColorStop(1,paRgba(cfg.c,0)); ctx.fillStyle=sg; var hh=3+10*sa*(tier==='SSS'?2:1); ctx.fillRect(0,cy-hh/2,W,hh); if(tier==='SSS') ctx.fillRect(cx-hh/2,0,hh,H); } }
      for(var r2=rings.length-1;r2>=0;r2--){ var rg2=rings[r2], ag=(t-rg2.t)/1400; if(ag>=1){ rings.splice(r2,1); continue; } ctx.strokeStyle=paRgba(rg2.c,1-ag); ctx.lineWidth=1+7*(1-ag); ctx.beginPath(); ctx.arc(cx,cy,(1-Math.pow(1-ag,3))*rg2.max,0,6.283); ctx.stroke(); }
      for(var u=parts.length-1;u>=0;u--){ var pp=parts[u]; pp.l-=dt; if(pp.l<=0){ parts.splice(u,1); continue; } pp.x+=pp.vx*dt/16; pp.y+=pp.vy*dt/16; pp.vx*=.985; pp.vy=pp.vy*.985-.012;
        ctx.globalAlpha=Math.max(0,pp.l/pp.m); ctx.fillStyle=pp.c; ctx.beginPath(); ctx.arc(pp.x,pp.y,pp.s,0,6.283); ctx.fill(); }
      ctx.globalAlpha=1;
      while(ev.length&&t>=ev[0].at) ev.shift().f(t);
      paRaf=requestAnimationFrame(frame);
    }
    paRaf=requestAnimationFrame(frame);
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
        if(j.state.bonus!=null) S.bonus=j.state.bonus;
        if(j.state.pity!=null) S.pity=j.state.pity;
        if(j.state.count!=null) S.count=j.state.count;
        if(j.state.cap!=null) S.cap=j.state.cap;
        if(j.state.resetIn!=null){ S.resetIn=j.state.resetIn; endAt=Date.now()+S.resetIn*1000; }
      }
      if(j.ok){
        // 🎬 أنميشن السحب (شكلي فقط) ثم تظهر البطاقة بالنتيجة المعتادة
        busy=true;
        try{ paPlay(j.card,function(again){ busy=false; renderResult(j); stats(); if(again&&S.pulls>0) setTimeout(function(){ $('go').click(); },60); }); }
        catch(e){ paOn=false; $('pa-stage').style.display='none'; busy=false; renderResult(j); }
      } else { show('bad',j.message||'فشل السحب'); }
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

// =====================================================================
// 🏠 الصفحة الرئيسية — نفس تصميم «مثال تصميم الموقع» بالضبط
// (شريط علوي + بطاقة اللاعب + الإحصائيات + خانات التصفية بالرتب/التطوير/أوميقا + شبكة البطاقات)
// =====================================================================

const HOME_TIER_KEY = c => resolveTierKey(c.rarity, c.evolutionLevel)

// خانات التصفية بالرئيسية (تشمل خانات التطوير وأوميقا)
const HOME_FILTERS = [
    { k: 'all',   label: 'الكل',          test: () => true },
    { k: 'evo',   label: '⭐ المطوّرة',    test: c => (Number(c.evolutionLevel) || 0) > 0 },
    { k: 'omega', label: 'Ω أوميقا',      test: c => HOME_TIER_KEY(c) === 'Ω OMEGA' },
    { k: 'ex',    label: 'EX',            test: c => HOME_TIER_KEY(c) === 'EX' },
    { k: 'ur',    label: 'UR',            test: c => /^UR /.test(HOME_TIER_KEY(c)) },
    { k: 'sssp',  label: 'SSS+ / SSS++',  test: c => ['SSS+', 'SSS++'].includes(HOME_TIER_KEY(c)) },
    { k: 'sss',   label: 'SSS',           test: c => HOME_TIER_KEY(c) === 'SSS' },
    { k: 'leg',   label: 'أسطوري',        test: c => HOME_TIER_KEY(c) === 'اسطوري' },
    { k: 'epic',  label: 'ممتاز',         test: c => HOME_TIER_KEY(c) === 'ممتاز' },
    { k: 'com',   label: 'عادي',          test: c => HOME_TIER_KEY(c) === 'عادي' }
]

const HOME_CSS = `:root{--bg:#0a0d16;--bg2:#0f1422;--gold:#f0c04a;--text:#eef1f8;--dim:#8891a3;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--text);font-family:'Cairo',sans-serif;overflow-x:hidden;min-height:100%}
#bg{position:fixed;inset:0;width:100%;height:100%;z-index:0}
.glow{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(520px 320px at 15% 8%,rgba(62,168,255,.18),transparent 70%),radial-gradient(520px 320px at 90% 25%,rgba(192,74,255,.16),transparent 70%),radial-gradient(500px 300px at 50% 100%,rgba(240,192,74,.12),transparent 70%);animation:dr 14s ease-in-out infinite alternate}
@keyframes dr{to{transform:translate3d(0,-16px,0) scale(1.06)}}
.wrap{position:relative;z-index:1;max-width:520px;margin:0 auto;padding:14px 14px 40px}
.top{display:flex;align-items:center;justify-content:space-between;padding:8px 4px 14px}
.menu{width:42px;height:42px;border-radius:12px;border:1px solid rgba(240,192,74,.45);background:rgba(15,20,34,.7);color:var(--gold);font-size:20px;cursor:pointer}
.logo{font-weight:900;font-size:20px;background:linear-gradient(180deg,#fff6d8,var(--gold) 60%,#a9791f);-webkit-background-clip:text;background-clip:text;color:transparent}
.coins{font-family:'Oswald',sans-serif;font-size:15px;color:var(--gold);border:1px solid rgba(240,192,74,.45);border-radius:20px;padding:5px 12px;background:rgba(15,20,34,.7);direction:ltr}
.hero{position:relative;border-radius:20px;padding:3px;background:conic-gradient(from var(--a,0deg),#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860);animation:rot 6s linear infinite}
@property --a{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes rot{to{--a:360deg}}
.hero-in{border-radius:17px;background:linear-gradient(160deg,#18204a,#0d1224 65%);padding:18px;display:flex;gap:14px;align-items:center;overflow:hidden;position:relative}
.hero-in::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.12) 50%,transparent 60%);transform:translateX(-130%);animation:sw 5s ease-in-out infinite 1s}
@keyframes sw{55%,100%{transform:translateX(130%)}}
.av{flex:0 0 64px;height:64px;border-radius:50%;border:2px solid var(--gold);background:#27305a;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:var(--gold)}
.who b{font-size:19px;display:block}
.who span{font-size:13px;color:var(--dim)}
.xp{height:6px;border-radius:5px;background:rgba(255,255,255,.1);margin-top:8px;overflow:hidden;width:170px;max-width:100%}
.xp i{display:block;height:100%;width:68%;background:linear-gradient(90deg,#3ea8ff,var(--gold))}
.stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}
.st{padding:12px;border-radius:14px;background:rgba(15,20,34,.75);border:1px solid rgba(255,255,255,.08);text-align:center}
.st b{display:block;font-family:'Oswald',sans-serif;font-size:22px;direction:ltr}
.st span{font-size:12px;color:var(--dim)}
.chips{display:flex;gap:8px;overflow-x:auto;padding:4px 0 12px;scrollbar-width:none}
.chip{flex:0 0 auto;font-family:'Cairo',sans-serif;font-weight:800;font-size:13px;color:var(--dim);background:rgba(15,20,34,.75);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:6px 16px;cursor:pointer}
.chip.on{color:#0a0d16;background:var(--gold);border-color:var(--gold)}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.cd{--t:#8891a3;position:relative;border-radius:16px;border:2px solid var(--t);background:#0f1422;overflow:hidden;cursor:pointer;transition:transform .2s,box-shadow .2s;box-shadow:0 0 14px color-mix(in srgb,var(--t) 30%,transparent)}
.cd:active,.cd:hover{transform:translateY(-4px) scale(1.02);box-shadow:0 0 26px color-mix(in srgb,var(--t) 60%,transparent)}
.cd .ar{height:150px;display:flex;align-items:center;justify-content:center;font-size:64px;font-weight:900;color:rgba(255,255,255,.16);background:linear-gradient(160deg,color-mix(in srgb,var(--t) 40%,#12172b),#12172b)}
.cd .rt{position:absolute;top:8px;right:8px;font-family:'Oswald',sans-serif;font-size:12px;color:#0a0d16;background:var(--t);padding:2px 9px;border-radius:12px}
.cd .pw{position:absolute;top:8px;left:8px;font-family:'Oswald',sans-serif;font-size:12px;background:rgba(8,10,18,.75);border:1px solid var(--t);border-radius:8px;padding:2px 7px;direction:ltr}
.cd .pl{padding:9px 10px 11px;text-align:center}
.cd .n{font-family:'Oswald',sans-serif;font-size:16px;direction:ltr}
.cd .a{font-size:12px;color:var(--t);margin-top:2px}
.cd.sss{border-color:transparent;background:linear-gradient(#0f1422,#0f1422) padding-box,conic-gradient(from var(--a,0deg),#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860) border-box;animation:rot 5s linear infinite;--t:#f0c04a}
.cd.sss .ar::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.28) 50%,transparent 60%);transform:translateX(-130%);animation:sw 4s ease-in-out infinite}
.cd.sss .ar{position:relative;overflow:hidden}
.cd.leg{--t:#ff9a3d}.cd.epic{--t:#c04aff}.cd.com{--t:#8891a3}
.cd.hide{display:none}
.nav{position:sticky;bottom:10px;margin-top:18px;display:flex;justify-content:space-around;padding:8px;border-radius:18px;background:rgba(10,13,22,.88);border:1px solid rgba(240,192,74,.3);backdrop-filter:blur(8px)}
.nav a{font-weight:800;font-size:12px;color:var(--dim);text-align:center;text-decoration:none;padding:4px 8px}
.nav a.on{color:var(--gold)}
.nav i{display:block;font-style:normal;font-size:20px}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01s!important;animation-iteration-count:1!important}}
/* ───── إضافات تشغيلية (بدون تغيير الشكل) ───── */
:root{--gold-dim:#8a6d24;--text-dim:#8891a3}
.wrap{padding-bottom:110px}
.top .nvbtn{width:42px;height:42px;border-radius:12px;border:1px solid rgba(240,192,74,.45);background:rgba(15,20,34,.7);color:var(--gold)}
.menu-sp{width:42px;height:42px;display:inline-block}
a.coins{text-decoration:none;font-family:'Cairo',sans-serif;font-weight:800;font-size:13px;direction:rtl}
.av{overflow:hidden;background-size:cover;background-position:center top}
.who b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:210px}
a.chip{text-decoration:none;display:inline-block}
.chip small{font-family:'Oswald',sans-serif;font-size:11px;margin-inline-start:6px;opacity:.75;direction:ltr;display:inline-block}
.chip.zero:not(.on){opacity:.5}
.chips{padding-top:6px}
.cd:not([data-d]){cursor:default}
.cd .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cd .a{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cd .ar{background-size:cover;background-position:center top}
.cd .no{position:absolute;left:8px;bottom:62px;font-family:'Oswald',sans-serif;font-size:11px;color:#fff;background:rgba(8,10,18,.7);border:1px solid var(--t);border-radius:8px;padding:1px 7px;direction:ltr;z-index:2}
.cd.com .ar,.cd.epic .ar,.cd.leg .ar{font-size:64px}
.cd .ev{display:flex;gap:3px;justify-content:center;margin-top:7px}
.cd .ev i{width:14px;height:4px;border-radius:2px;background:rgba(255,255,255,.14)}
.cd .ev i.on{background:var(--t);box-shadow:0 0 6px var(--t)}
.cd .ev.om i{background:linear-gradient(90deg,#ff3860,#f0c04a,#3ea8ff,#c04aff)}
.cd.om{box-shadow:0 0 24px rgba(255,201,51,.45)}
.st small{display:block;font-size:10px;color:var(--gold-dim);margin-top:2px}
.st.om b{background:linear-gradient(90deg,#ff3860,#f0c04a,#3ea8ff,#c04aff);-webkit-background-clip:text;background-clip:text;color:transparent}
.emp{grid-column:1/-1;text-align:center;color:var(--dim);padding:34px 10px;font-size:14px;line-height:1.9;border:1px dashed rgba(255,255,255,.14);border-radius:16px}
/* ───── بطاقة بصورة كاملة: الصورة تمتد لآخر الإطار والاسم فوقها (نفس ارتفاع الإطار القديم) ───── */
.cd .ar,.cd.sss .ar{position:absolute;inset:0;height:auto;z-index:0;overflow:hidden}
.cd .pl{position:relative;z-index:1;margin-top:150px;background:linear-gradient(180deg,rgba(8,10,18,.55),rgba(8,10,18,.94))}
.cd .pl::before{content:"";position:absolute;left:0;right:0;bottom:100%;height:38px;background:linear-gradient(180deg,rgba(8,10,18,0),rgba(8,10,18,.55));pointer-events:none}
.cd .rt,.cd .pw,.cd .no{z-index:2}
.cd .n,.cd .a{text-shadow:0 1px 6px #000}
/* ───── أوميقا: نجوم التطوير فقط صفراء (الإطار بألوان المعرض كما هو) ───── */
.cd .ev.om i{background:#ffc933;box-shadow:0 0 6px #ffc933}
.card.omega .stars,.sheet.omega .sh-stars{color:#ffc933;text-shadow:0 0 8px rgba(255,201,51,.6)}
/* ───── إطارات البطاقات = نفس إطارات المعرض (myRosterCard): خط بلون الرتبة، وأوميقا بتدرّج الألوان الأربعة ───── */
.cd{border:2.5px solid var(--t);box-shadow:0 8px 18px rgba(0,0,0,.45),0 0 18px color-mix(in srgb,var(--t) 35%,transparent)}
.cd.sss{border-color:var(--t);background:#0f1422;animation:none}
.cd.om{border-color:transparent;background:linear-gradient(#0f1422,#0f1422) padding-box,linear-gradient(135deg,#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860) border-box}
.pager{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:16px}
.pg{font-family:'Oswald',sans-serif;color:var(--text);text-decoration:none;border:1px solid rgba(240,192,74,.45);border-radius:10px;padding:7px 14px;background:rgba(15,20,34,.75)}
.pg.cur{background:var(--gold);color:#0a0d16;font-weight:700;border-color:var(--gold)}
.bnav{position:fixed;bottom:calc(10px + env(safe-area-inset-bottom,0px));left:14px;right:14px;max-width:492px;margin:0 auto;z-index:40;display:flex;justify-content:space-around;padding:8px;border-radius:18px;background:rgba(10,13,22,.88);border:1px solid rgba(240,192,74,.3);backdrop-filter:blur(8px)}
.bnav a{font-weight:800;font-size:12px;color:var(--dim);text-align:center;text-decoration:none;padding:4px 8px;font-family:'Cairo',sans-serif}
.bnav a.on{color:var(--gold)}
.bnav i{display:block;font-style:normal;font-size:20px}
/* ───── نافذة تفاصيل الشخصية + نافذة الهدايا ───── */
  /* ===== لوحة التفاصيل ===== */
  .overlay{position:fixed; inset:0; z-index:50; background:rgba(3,4,9,.8); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:16px; padding-top:calc(16px + env(safe-area-inset-top,0px)); padding-bottom:calc(16px + env(safe-area-inset-bottom,0px));}
  .overlay[hidden]{display:none;}
  .sheet{
    width:100%; max-width:580px; max-height:100%; overflow:hidden; display:flex; flex-direction:column;
    background:linear-gradient(180deg,#121830,#0c101e); border:2px solid var(--tier); border-radius:20px;
    box-shadow:0 0 40px color-mix(in srgb, var(--tier) 30%, transparent), 0 20px 60px rgba(0,0,0,.6);
  }
  .sheet.omega{
    border-color:transparent;
    background:linear-gradient(180deg,#121830,#0c101e) padding-box, conic-gradient(from var(--a,0deg),#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860) border-box;
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
.gbox{width:100%;max-width:420px;max-height:100%;overflow-y:auto;background:linear-gradient(180deg,#121830,#0c101e);border:2px solid var(--tier,#b83fff);border-radius:22px;padding:16px;box-shadow:0 0 40px color-mix(in srgb,var(--tier,#b83fff) 30%,transparent),0 20px 60px rgba(0,0,0,.6)}
.g-top{display:flex;justify-content:space-between;font-size:13px;color:var(--tier,#b83fff)}
.g-line{text-align:center;margin:12px 0;color:#fff;font-size:15px}.g-line b{color:var(--tier,#b83fff)}
.g-art{height:230px;border-radius:16px;border:2px solid var(--tier,#b83fff);background:color-mix(in srgb,var(--tier,#b83fff) 14%,#0c101e);background-size:cover;background-position:center top;display:flex;align-items:center;justify-content:center;font-size:72px;color:var(--tier,#b83fff)}
.g-name{font-family:'Oswald',sans-serif;font-size:28px;font-weight:600;color:#fff;text-align:center;direction:ltr;margin:14px 0 8px;word-break:break-word}
.g-chip{display:table;margin:0 auto 14px;font-family:'Oswald',sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--tier,#b83fff);border:1px solid var(--tier,#b83fff);border-radius:20px;padding:3px 14px;direction:ltr}
.g-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.g-stats div{padding:10px 6px;text-align:center;border-radius:12px;background:#0b0e18;border:1px solid #1f2740}
.g-stats i{display:block;font-style:normal;font-size:12px;color:var(--dim)}.g-stats b{font-family:'Oswald',sans-serif;font-size:20px;color:var(--tier,#b83fff);direction:ltr;display:inline-block}
.g-evo{text-align:center;font-size:14px;color:var(--dim)}.g-evo span{color:var(--tier,#b83fff);letter-spacing:2px;direction:ltr;display:inline-block}
.g-ago{text-align:center;font-size:12px;color:var(--dim);margin:6px 0 12px}
.btn{display:block;width:100%;font-family:'Cairo',sans-serif;font-weight:800;font-size:16px;padding:14px;border-radius:14px;border:1.5px solid var(--gold);cursor:pointer;text-align:center;margin-top:10px;color:#fff;background:#080b14}
.btn.purple{background:#b83fff;border-color:#b83fff;color:#fff}
.btn:disabled{opacity:.4;cursor:not-allowed}

.plbtn{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0;padding:14px 16px;border-radius:16px;text-decoration:none;color:#0a0d16;font:900 16px 'Cairo',sans-serif;background:linear-gradient(135deg,#f6d26b,#c8921e);box-shadow:0 0 22px rgba(240,192,74,.35)}
.plbtn small{display:block;font:600 11px 'Cairo',sans-serif;opacity:.75}.plbtn .ar{font-size:22px}
.vbar{margin:8px 0;text-align:center;font:700 12px 'Cairo',sans-serif;color:#8891a3;border:1px dashed #1f2740;border-radius:12px;padding:6px}.vbar b{color:#f0c04a}
.backfab{position:fixed;bottom:calc(16px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);z-index:60;background:linear-gradient(135deg,#f6d26b,#c8921e);color:#0a0d16;font:900 14px 'Cairo',sans-serif;padding:10px 20px;border-radius:30px;box-shadow:0 4px 20px rgba(0,0,0,.6);text-decoration:none}
`

function homeCardHTML(char) {
    const tierKey = resolveTierKey(char.rarity, char.evolutionLevel)
    const t = TIERS[tierKey] || TIERS['عادي']
    const top = t.idx >= FIRST_IMAGE_TIER
    const isOmega = tierKey === 'Ω OMEGA'
    const evo = Number(char.evolutionLevel) || 0
    const src = top ? safeImageUrl(char.image) : (safeImageUrl(char.image) || localCharImageUrl(char.image))
    const letter = esc((Array.from(String(char.name || '?'))[0] || '?').toUpperCase())
    const cls = top ? 'sss' : (tierKey === 'اسطوري' ? 'leg' : tierKey === 'ممتاز' ? 'epic' : 'com')
    // الألوان: SSS الأساسية والرتب الأدنى بنفس ألوان المثال، وما فوق SSS (التطوير/UR/EX/أوميقا) بلون رتبته
    // لون الإطار لكل رتبة = نفس لون إطار المعرض (t.color)
    const inlineT = ` style="--t:${t.color}"`
    const artStyle = src ? ` style="background-image:url('${esc(src)}')"` : ''
    const pips = top
        ? `<div class="ev${isOmega ? ' om' : ''}">${[1, 2, 3, 4, 5, 6, 7].map(n => `<i${(isOmega || n <= evo) ? ' class="on"' : ''}></i>`).join('')}</div>`
        : ''
    const power = Number(char.power || 0).toLocaleString('en-US')
    return `<div class="cd ${cls}${isOmega ? ' om' : ''}"${inlineT}${top ? ` data-d="${char.__num}" tabindex="0" role="button" aria-label="تفاصيل ${esc(char.name)}"` : ''}>
      <div class="ar"${artStyle}>${src ? '' : letter}</div>
      <span class="rt">${esc(isOmega ? 'Ω OMEGA' : tierKey)}</span>
      <span class="pw">${power}</span>
      <span class="no">#${char.__num}</span>
      <div class="pl"><div class="n">${esc(char.name)}</div><div class="a">${esc(char.anime || '')}</div>${pips}</div>
    </div>`
}

function pageHTML({ title, total, counts, items, page, pages, base, viewer, code, hero, stats, chips, backTo }) {
    const withImg = items.filter(c => (TIERS[resolveTierKey(c.rarity, c.evolutionLevel)] || TIERS['عادي']).idx >= FIRST_IMAGE_TIER)
    const isOwner = !!(viewer && viewer.isOwner)
    const h = hero || {}
    const initial = esc((Array.from(String(title || '?'))[0] || '?').toUpperCase())
    const avStyle = h.img ? ` style="background-image:url('${esc(h.img)}')"` : ''

    const topLeft = isOwner ? NAV_BTN : '<span class="menu-sp"></span>'
    const topRight = isOwner
        ? `<span class="coins">${esc(h.money || '0')}</span>`
        : `<a class="coins" href="/login?code=${esc(code)}">🔐 تسجيل دخول</a>`

    const statsHTML = (stats || []).map(([n, label, cls]) =>
        `<div class="st${cls ? ' ' + cls : ''}"><b>${esc(n)}</b><span>${esc(label)}</span></div>`).join('')

    const chipsHTML = (chips || []).map(c =>
        `<a class="chip${c.on ? ' on' : ''}${c.n ? '' : ' zero'}" href="${esc(c.href)}">${esc(c.label)}<small>${c.n}</small></a>`).join('')

    const cardsHTML = items.length
        ? items.map(homeCardHTML).join('')
        : '<div class="emp">لا توجد شخصيات في هذه الخانة بعد</div>'

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
${TITLES.HEAD}${PWA.HEAD}${NOTIFY.HEAD}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
${HOME_CSS}
</style>
</head>
<body>
<canvas id="bg"></canvas>
<div class="glow"></div>
<div class="wrap">
  <div class="top">${topLeft}<span class="logo">عالم الشخصيات</span>${topRight}</div>
  ${isOwner ? navDrawerHTML(code, viewer.csrf, 'home', viewer.name) : ''}
  ${backTo ? `<div class="vbar">👁 تشاهد مجموعة <b>${esc(title)}</b> — مشاهدة فقط</div>` : ''}
  <div class="hero"><div class="hero-in">
    <div class="av"${avStyle}>${h.img ? '' : initial}</div>
    <div class="who"><b>${esc(title)}</b>${TITLES.wrap(h.t)}<span>المستوى ${esc(h.level || 1)}</span><div class="xp"><i style="width:${Number(h.xpPct) || 0}%"></i></div></div>
  </div></div>
  <div class="stats">${statsHTML}</div>
  ${isOwner ? `<a class="plbtn" href="/u/${esc(code)}/players"><span>👥 شخصيات اللاعبين<small>تصفّح مجموعات الآخرين بيوزرهم — بدون رابط</small></span><span class="ar">‹</span></a>` : ''}
  <div class="chips" id="chips">${chipsHTML}</div>
  <div class="grid" id="grid">${cardsHTML}</div>
  ${pagerHTML(base, page, pages)}
</div>
<div id="tpls" hidden>${withImg.map(detailHTML).join('')}</div>
<div class="overlay" id="ov" hidden><div class="sheet" id="sheet" role="dialog" aria-modal="true"></div></div>
<script>
(function(){
var c=document.getElementById('bg'),x=c.getContext('2d'),W,H,P=[];
function rs(){W=c.width=innerWidth;H=c.height=innerHeight}
rs();addEventListener('resize',rs);
for(var i=0;i<60;i++)P.push({x:Math.random(),y:Math.random(),r:Math.random()*1.7+.4,s:Math.random()*.0004+.0001,t:Math.random()*6});
function tick(){x.clearRect(0,0,W,H);for(var i=0;i<P.length;i++){var p=P[i];p.y-=p.s;p.t+=.03;if(p.y<0)p.y=1;x.globalAlpha=.3+.3*Math.sin(p.t);x.fillStyle=i%5?'#fff':'#f0c04a';x.beginPath();x.arc(p.x*W,p.y*H,p.r,0,6.3);x.fill()}requestAnimationFrame(tick)}
tick();
})();
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
    var card=e.target.closest&&e.target.closest('.cd[data-d]');
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
      var c=document.activeElement; if(c && c.matches && c.matches('.cd[data-d]')){ e.preventDefault(); openSheet(c.getAttribute('data-d')); }
    }
  });
})();
</script>
${inboxPopupHTML(viewer)}
${backTo ? `<a class="backfab" href="${esc(backTo)}">← اللاعبون</a>` : ''}
</body>
</html>`
}

// =====================================================================
// 👥 صفحة اللاعبين  /u/:code/players
// (صفحة اللاعبين: بيانات من /players/list، والبطاقات تفتح /players/open)
// =====================================================================
const PLAYERS_CSS = `
.srch{display:flex;gap:8px;margin:12px 0}.srch input{flex:1;background:#0f1422;border:1px solid #1f2740;border-radius:14px;color:#eef1f8;font:700 15px 'Cairo',sans-serif;padding:12px 14px;outline:0;direction:ltr;text-align:right}
.srch input:focus{border-color:#f0c04a;box-shadow:0 0 0 3px rgba(240,192,74,.15)}
.pnote{font:600 12px 'Cairo',sans-serif;color:#8891a3;text-align:center;margin:4px 0 10px}
.plist{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-top:12px}
.pc{--t:#f0c04a;display:flex;gap:12px;align-items:center;background:linear-gradient(180deg,#141b30,#0f1422);border:1px solid #1f2740;border-radius:18px;padding:12px;text-decoration:none;color:inherit;transition:.25s;animation:plrise .5s both}
.pc:hover{transform:translateY(-3px);border-color:var(--t);box-shadow:0 8px 28px rgba(0,0,0,.45)}
@keyframes plrise{from{opacity:0;transform:translateY(16px)}}
.pav{width:64px;height:64px;flex:none;border-radius:50%;background-size:cover;background-position:center;border:3px solid var(--t);box-shadow:0 0 16px var(--t);display:flex;align-items:center;justify-content:center;font:800 24px 'Oswald',sans-serif;background-color:#151b2e}
.pi{flex:1;min-width:0}
.pi b{display:block;font:800 16px 'Oswald','Cairo',sans-serif;direction:ltr;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pm{display:flex;gap:10px;margin-top:5px;font:600 12px 'Cairo',sans-serif;color:#8891a3}.pm b{display:inline;font:700 12px 'Oswald',sans-serif;color:#eef1f8}
.ptop{display:inline-block;margin-top:5px;font:800 11px 'Oswald',sans-serif;color:#0a0d16;background:var(--t);border-radius:10px;padding:2px 9px;direction:ltr}
.pme{font:800 10px 'Cairo',sans-serif;color:#0a0d16;background:#f0c04a;border-radius:8px;padding:1px 7px;margin-inline-start:6px}
.pgo{font-size:22px;color:#8891a3}
.pemp{text-align:center;color:#8891a3;padding:50px 0;font:700 15px 'Cairo',sans-serif;grid-column:1/-1}
.pmore{display:block;margin:16px auto;background:#0f1422;border:1px solid #f0c04a;color:#f0c04a;border-radius:14px;padding:10px 26px;font:800 14px 'Cairo',sans-serif;cursor:pointer}
`

// واجهة صفحة اللاعبين (تُحقن كنص عبر toString)
function playersClient(CODE) {
    const SORTS = [['pw', '⚔️ الأقوى'], ['lv', '🏆 الأعلى مستوى'], ['chars', '🧿 الأكثر شخصيات'], ['u', '🔤 أبجدي']]
    const st = { q: '', s: 'pw', o: 0, total: 0, busy: false }
    const $ = id => document.getElementById(id)
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    const f = n => Number(n).toLocaleString('en-US')
    function sortBar() {
        $('sort').innerHTML = SORTS.map(x => '<a class="chip' + (x[0] === st.s ? ' on' : '') + '" data-s="' + x[0] + '" style="cursor:pointer">' + x[1] + '</a>').join('')
    }
    function card(p, k) {
        const t = p.top
        const col = t ? t.color : '#f0c04a'
        const letter = esc((Array.from(String(p.u).replace(/^@/, ''))[0] || '?').toUpperCase())
        const av = p.av ? ' style="background-image:url(\'' + esc(p.av) + '\')"' : ''
        return '<a class="pc" href="/players/open?id=' + esc(p.id) + '&b=' + esc(CODE) + '" style="--t:' + esc(col) + ';animation-delay:' + Math.min(k, 12) * 0.05 + 's">' +
            '<div class="pav"' + av + '>' + (p.av ? '' : letter) + '</div><div class="pi"><b>' + esc(p.u) + (p.me ? '<span class="pme">أنت</span>' : '') + '</b>' +
            (p.tw ? '<div>' + p.tw + '</div>' : '') +
            '<div class="pm"><span>🏆 <b>' + f(p.lv) + '</b></span><span>🧿 <b>' + f(p.chars) + '</b></span><span>⚔️ <b>' + f(p.pw) + '</b></span></div>' +
            (t ? '<span class="ptop">' + esc(t.name) + ' · ' + esc(t.tier) + '</span>' : '') + '</div><span class="pgo">‹</span></a>'
    }
    async function load(append) {
        if (st.busy) return
        st.busy = true
        if (!append) st.o = 0
        try {
            const r = await fetch('/players/list?q=' + encodeURIComponent(st.q) + '&s=' + st.s + '&o=' + st.o, { credentials: 'same-origin', cache: 'no-store' })
            if (r.status === 401) { location.href = '/u/' + CODE; return }
            const j = await r.json()
            if (!j || !j.ok) { $('list').innerHTML = '<div class="pemp">' + esc((j && j.message) || '❌ تعذّر تحميل اللاعبين') + '</div>'; return }
            st.total = j.total
            const html = j.players.map((p, k) => card(p, k)).join('')
            if (append) $('list').insertAdjacentHTML('beforeend', html)
            else $('list').innerHTML = html || '<div class="pemp">🔍 ما فيه لاعب بهذا اليوزر</div>'
            st.o += j.players.length
            $('cnt').textContent = f(j.total) + ' لاعب'
            $('more').style.display = st.o < st.total ? 'block' : 'none'
        } catch (e) {
            $('list').innerHTML = '<div class="pemp">❌ تعذّر الاتصال بالخادم</div>'
        } finally { st.busy = false }
    }
    let tm = 0
    $('q').oninput = () => { clearTimeout(tm); tm = setTimeout(() => { st.q = $('q').value.trim(); load(false) }, 250) }
    $('sort').onclick = e => { const c = e.target.closest('[data-s]'); if (c) { st.s = c.getAttribute('data-s'); sortBar(); load(false) } }
    $('more').onclick = () => load(true)
    sortBar(); load(false)
}

function playersPageHTML({ code, viewer }) {
    const isOwner = !!(viewer && viewer.isOwner)
    const topLeft = isOwner ? NAV_BTN : `<a class="coins" href="/u/${esc(code)}">← رجوع</a>`
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
${TITLES.HEAD}${PWA.HEAD}${NOTIFY.HEAD}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>اللاعبون</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
${HOME_CSS}
${PLAYERS_CSS}
</style>
</head>
<body>
<canvas id="bg"></canvas>
<div class="glow"></div>
<div class="wrap">
  <div class="top">${topLeft}<span class="logo">👥 اللاعبون</span><span class="coins" id="cnt">…</span></div>
  ${isOwner ? navDrawerHTML(code, viewer.csrf, 'players', viewer.name) : ''}
  <div class="srch"><input id="q" type="search" inputmode="latin" maxlength="32" placeholder="ابحث بيوزر اللاعب  @username" autocomplete="off"></div>
  <div class="pnote">اللاعبون اللي فعّلوا رابطهم بالبوت (.رابط) — اضغط على لاعب لمشاهدة مجموعته</div>
  <div class="chips" id="sort"></div>
  <div class="plist" id="list"></div>
  <button class="pmore" id="more" style="display:none">عرض المزيد</button>
</div>
<script>
(function(){
var c=document.getElementById('bg'),x=c.getContext('2d'),W,H,P=[];
function rs(){W=c.width=innerWidth;H=c.height=innerHeight}
rs();addEventListener('resize',rs);
for(var i=0;i<60;i++)P.push({x:Math.random(),y:Math.random(),r:Math.random()*1.7+.4,s:Math.random()*.0004+.0001,t:Math.random()*6});
function tick(){x.clearRect(0,0,W,H);for(var i=0;i<P.length;i++){var p=P[i];p.y-=p.s;p.t+=.03;if(p.y<0)p.y=1;x.globalAlpha=.3+.3*Math.sin(p.t);x.fillStyle=i%5?'#fff':'#f0c04a';x.beginPath();x.arc(p.x*W,p.y*H,p.r,0,6.3);x.fill()}requestAnimationFrame(tick)}
tick();
})();
(${playersClient.toString()})(${JSON.stringify(String(code))})
</script>
</body>
</html>`
}

// 🖼️ صفحة المعارض  /u/:code/gallery
// تصميم مطابق لملف gallery-site-preview.html (منصة أول 3 + أعلى 10 + كل المعارض + صفحة المعرض
// مع اللايك والتكبير). البيانات حقيقية: معرض اللاعب = نفس اختيار .المعرض (player.gallery)
// =====================================================================
const GAL_CSS = String.raw`
@property --a{syntax:'<angle>';initial-value:0deg;inherits:false}
:root{--bg:#0a0d16;--panel:#0f1422;--panel2:#151b2e;--line:#1f2740;--tx:#eef1f8;--mut:#8891a3;--gold:#f0c04a;--gold-dim:#8a6d24;--pink:#ff3860;--text:#eef1f8;--text-dim:#8891a3;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0a0d16;--panel:#0f1422;--tx:#eef1f8;--mut:#8891a3}}
:root[data-theme="dark"]{--bg:#0a0d16;--panel:#0f1422;--tx:#eef1f8;--mut:#8891a3}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*{box-sizing:border-box;margin:0;padding:0}
body{background:radial-gradient(900px 400px at 50% -10%,#f0c04a14,transparent 60%),var(--bg);color:var(--tx);font-family:'Cairo',Tahoma,sans-serif;min-height:100vh;padding-bottom:40px}
.wrap{max-width:1100px;margin:0 auto;padding:0 14px}.narrow{max-width:560px;margin:0 auto}
.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:#0a0d16ee;backdrop-filter:blur(8px);border-bottom:1px solid var(--line);padding:12px 14px;display:flex;align-items:center;gap:10px}
.top b{flex:1;font-weight:900;font-size:16px}
.ic{width:40px;height:40px;border-radius:12px;border:1px solid var(--gold-dim);background:var(--panel);color:var(--gold);font-size:18px;display:grid;place-items:center;cursor:pointer;font-family:inherit;text-decoration:none}
h2{font-size:15px;font-weight:900;color:var(--gold);margin:24px 0 10px;display:flex;align-items:center;gap:8px}h2 small{color:var(--mut);font-weight:700;font-size:12px}
.g1{--rc:#f0c04a}.g2{--rc:#c9d3e6}.g3{--rc:#d98a4e}
.pod{display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:10px;align-items:end;margin-top:18px}
.pc{position:relative;overflow:hidden;background:linear-gradient(180deg,var(--panel2),var(--panel));border:2px solid var(--rc);border-radius:18px;padding:14px 6px 12px;text-align:center;cursor:pointer;animation:rise .7s cubic-bezier(.2,.9,.3,1) both,glow 2.6s ease-in-out infinite}
.pc.g1{padding-top:22px;animation-delay:.25s,.25s}.pc.g2{animation-delay:.1s,.1s}.pc.g3{animation-delay:.4s,.4s}
.pc::after{content:"";position:absolute;top:0;bottom:0;width:40%;left:-60%;background:linear-gradient(100deg,transparent,#ffffff30,transparent);transform:skewX(-18deg);animation:sweep 3.2s ease-in-out infinite}
.pc.g2::after{animation-delay:.8s}.pc.g3::after{animation-delay:1.6s}
.md{font-size:28px;display:inline-block;animation:bob 2.2s ease-in-out infinite}.g1 .md{font-size:38px}
.crown{position:absolute;top:-2px;left:50%;transform:translateX(-50%);font-size:0}
.spk{position:absolute;font-size:12px;animation:tw 2s ease-in-out infinite;opacity:0}
.nm{font-weight:900;font-size:13px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px}
.lk{color:var(--pink);font-weight:900;font-size:13px;margin-top:2px}
@keyframes rise{from{opacity:0;transform:translateY(28px) scale(.9)}to{opacity:1;transform:none}}
@keyframes glow{50%{box-shadow:0 0 26px -2px var(--rc)}0%,100%{box-shadow:0 0 6px -4px var(--rc)}}
@keyframes sweep{0%{left:-60%}55%,100%{left:130%}}
@keyframes bob{50%{transform:translateY(-5px) rotate(-6deg)}}
@keyframes tw{50%{opacity:1;transform:scale(1.4) rotate(20deg)}}
@keyframes spin{to{--a:360deg}}
.av{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:17px;background:var(--panel2);border:2px solid var(--c);flex:none}
.row{display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:10px 12px;margin-bottom:8px;cursor:pointer;transition:border-color .2s,transform .15s}
.row:active{transform:scale(.985)}.row:hover{border-color:var(--gold-dim)}
.row.top3{border:2px solid transparent;background:linear-gradient(var(--panel),var(--panel)) padding-box,conic-gradient(from var(--a),var(--rc),transparent 30%,var(--rc) 55%,transparent 80%,var(--rc)) border-box;animation:spin 3.5s linear infinite}
.rk{width:28px;text-align:center;font-weight:900;color:var(--mut)}.top3 .rk{font-size:20px}
.who{flex:1;min-width:0}.who b{display:block;font-size:14px}.who small{color:var(--mut);font-size:12px}
.lkc{font-weight:900;font-size:13px;color:var(--pink);white-space:nowrap}
.search{width:100%;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:11px 14px;color:var(--tx);font-family:inherit;font-size:14px}
.search:focus{outline:none;border-color:var(--gold)}
.bar{display:flex;gap:10px;align-items:stretch;margin:16px 0 4px;flex-wrap:wrap}
.like{flex:1;min-width:180px;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--panel);border:1.5px solid var(--pink);color:var(--pink);border-radius:14px;padding:11px;font-family:inherit;font-weight:900;font-size:16px;cursor:pointer;transition:all .2s}
.like.on{background:var(--pink);color:#fff;box-shadow:0 0 24px -4px var(--pink)}.like:active{transform:scale(.97)}
.like .h{display:inline-block;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}.like.on .h{transform:scale(1.3)}
.zm{border:1px solid var(--gold-dim);background:var(--panel);color:var(--gold);border-radius:14px;padding:0 16px;font-family:inherit;font-weight:900;font-size:14px;cursor:pointer;min-height:46px}
.ribbon{margin:14px auto 0;width:max-content;max-width:100%;padding:6px 18px;border-radius:30px;font-weight:900;font-size:14px;color:#0a0d16;background:linear-gradient(100deg,var(--rc) 30%,#fff 50%,var(--rc) 70%);background-size:250% 100%;animation:shim 2.6s linear infinite}
@keyframes shim{to{background-position:-250% 0}}
#bx{margin-top:14px;border-radius:18px;overflow-x:hidden}
.board{width:max-content;padding:36px 30px 40px;position:relative;background:radial-gradient(1200px 500px at 50% -10%,#f0c04a14,transparent 60%),linear-gradient(180deg,#070911,#0a0d16 40%,#070911);border:1px solid var(--line);border-radius:18px}
.board.top3{border:2px solid var(--rc);animation:glow 2.6s ease-in-out infinite}
.cn{position:absolute;width:46px;height:46px;border-color:var(--gold-dim);opacity:.7}
.cn.tl{top:12px;right:12px;border-top:2px solid;border-right:2px solid}.cn.br{bottom:12px;left:12px;border-bottom:2px solid;border-left:2px solid}
.eb{text-align:center;font-family:'Oswald',sans-serif;letter-spacing:.45em;font-size:11px;color:var(--gold-dim);text-transform:uppercase;margin-bottom:8px}
.board h1{text-align:center;font-size:44px;font-weight:900;background:linear-gradient(180deg,#fff6d8,var(--gold) 55%,#a9791f);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{text-align:center;font-family:'Oswald',sans-serif;font-size:13px;letter-spacing:.35em;color:var(--mut);margin:4px 0 30px;text-transform:uppercase}
.roster{display:flex;justify-content:center;gap:18px;margin-bottom:20px}
.card{position:relative;width:260px;flex:0 0 260px;border-radius:15px;overflow:hidden;background:#0f1422;border:2.5px solid var(--t);display:flex;flex-direction:column;box-shadow:0 14px 34px #0007,0 0 26px color-mix(in srgb,var(--t) 35%,transparent);animation:rise .6s both}
.card.om{border-color:transparent;background:linear-gradient(#0f1422,#0f1422) padding-box,linear-gradient(135deg,#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860) border-box}
.tt{display:flex;justify-content:space-between;align-items:center;padding:10px 14px 4px}
.tn{font-family:'Oswald',sans-serif;font-weight:600;letter-spacing:.14em;text-transform:uppercase;font-size:15px;color:var(--t);direction:ltr}.tn.ar{font-family:'Cairo';letter-spacing:0;font-weight:800;font-size:16px}
.pw{font-family:'Oswald',sans-serif;font-size:12px;font-weight:600;color:#0a0d16;background:var(--t);padding:3px 10px;border-radius:20px;direction:ltr}
.st{padding:0 14px 8px;font-size:15px;letter-spacing:1px;color:var(--t);direction:ltr;text-align:right;text-shadow:0 0 8px color-mix(in srgb,var(--t) 60%,transparent)}
.card.om .st{color:#ffc933;text-shadow:0 0 8px rgba(255,201,51,.6)}
.art{position:relative;height:300px;display:grid;place-items:center;font-size:84px;background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--t) 50%,transparent),transparent 72%),#151a28}
.art.has{background-size:cover;background-position:center top;background-repeat:no-repeat;font-size:0}
.art::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,#0a0d16eb)}
.pl{padding:12px 12px 16px;text-align:center;background:linear-gradient(180deg,transparent,#00000080)}
.card{height:420px}
.art,.art.has{position:absolute;inset:0;height:auto;z-index:0}
.art::after{background:linear-gradient(180deg,#0a0d16d9 0,#0a0d1600 30%,#0a0d1600 52%,#0a0d16f0 100%)}
.tt{position:absolute;top:0;left:0;right:0;z-index:2}
.st{position:absolute;top:38px;left:0;right:0;z-index:2;padding-bottom:0}
.pl{position:absolute;bottom:0;left:0;right:0;z-index:2;background:none;text-shadow:0 2px 8px #000}
.ac{background:#080a12a6}
.ne{font-family:'Oswald',sans-serif;font-weight:600;font-size:20px;color:#fff;direction:ltr}
.ac{margin-top:8px;display:inline-block;font-size:12px;color:var(--t);border:1px solid color-mix(in srgb,var(--t) 50%,transparent);border-radius:20px;padding:2px 12px}
.cd{margin:14px 0 0;padding:10px 12px;text-align:center;border:1px solid var(--gold-dim);border-radius:12px;background:linear-gradient(135deg,#f0c04a14,var(--panel));color:var(--mut);font-size:13px;font-weight:700}.cd b{color:var(--gold);font-weight:900;direction:ltr;display:inline-block}
.note{margin:18px 0 0;padding:12px;border:1px dashed var(--gold-dim);border-radius:12px;color:var(--mut);font-size:12px;line-height:1.8}
.toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:70;background:#151b2e;border:1px solid var(--gold-dim);color:var(--tx);padding:10px 18px;border-radius:30px;font-weight:800;font-size:13px;max-width:90vw;text-align:center}
.av.has{background-size:cover;background-position:center top;background-repeat:no-repeat;font-size:0}
.row .av.has{width:46px;height:46px;border-radius:12px}
.pc.pi{display:flex;flex-direction:column;justify-content:flex-end;aspect-ratio:3/4.3;padding:0 4px 12px}
.pc.pi.g1{aspect-ratio:3/4.9;padding-top:0}
.pim{position:absolute;inset:0;background-size:cover;background-position:center top;background-repeat:no-repeat;background-color:#151a28}
.pc.pi::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,#0a0d1666 0,transparent 28%,transparent 48%,#080b14f0 100%)}
.pc.pi .md{position:absolute;top:8px;inset-inline-start:8px;z-index:3;font-size:26px}.pc.pi.g1 .md{font-size:32px}
.pc.pi .spk{z-index:3}.pc.pi .nm,.pc.pi .lk{position:relative;z-index:3;text-shadow:0 2px 8px #000}
.pc.pi .nm{font-size:14px}.pc.pi.g1 .nm{font-size:16px}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.pc,.card{opacity:1!important}}
.mg{width:100%;margin:16px 0 0;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;background:linear-gradient(135deg,#f0c04a22,var(--panel));border:1.5px solid var(--gold);color:var(--gold);border-radius:14px;padding:12px;font-family:inherit;font-weight:900;font-size:15px;cursor:pointer}.mg small{color:var(--mut);font-weight:700;font-size:11px}
.mhead{display:flex;align-items:center;justify-content:space-between;margin:20px 0 10px;font-weight:900;color:var(--gold);font-size:15px}.mhead b{color:var(--tx)}
.mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:10px}
.mc{position:relative;display:flex;flex-direction:column;background:var(--panel);border:2px solid var(--t);border-radius:12px;overflow:hidden;box-shadow:0 0 14px -6px var(--t)}
.mi{height:104px;display:grid;place-items:center;font-size:34px;font-weight:900;color:var(--t);background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--t) 45%,transparent),transparent 72%),#151a28}
.mi.has{background-size:cover;background-position:center top;background-repeat:no-repeat;font-size:0}
.mn{font-weight:900;font-size:12px;padding:6px 6px 0;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mt{font-size:10.5px;color:var(--mut);text-align:center;padding:2px 4px 6px;direction:ltr}
.x{position:absolute;top:6px;left:6px;width:30px;height:30px;border-radius:50%;border:none;background:#000b;color:#fff;font-size:14px;cursor:pointer;display:grid;place-items:center}.x:disabled,.ad:disabled{opacity:.5}
.ad,.ok{margin:0 6px 8px;padding:6px 4px;border-radius:9px;font-family:inherit;font-weight:900;font-size:12px;text-align:center}
.ad{border:1px solid var(--gold);background:var(--panel2);color:var(--gold);cursor:pointer}
.ok{color:var(--mut);border:1px dashed var(--line)}
.mact{display:flex;gap:10px;margin-top:12px}.mact .zm{flex:1}
[hidden]{display:none!important}
`

const GAL_JS = String.raw`
var G=window.__GAL||{},owners=[],zoom=false,cur=null,$=function(s){return document.querySelector(s)};
G.off=(G.now||Date.now())-Date.now();
function cdTxt(){var s=Math.floor((G.next-(Date.now()+G.off))/1000);if(s<=0)return 'جارٍ التوزيع…';var d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),x=s%60;return (d?d+' يوم ':'')+h+' س '+m+' د '+x+' ث'}
function cdBox(){return G.next?'<div class="cd">⏳ تصفير اللايكات وتوزيع الجوائز بعد <b id="cdv">'+cdTxt()+'</b></div>':''}
function cdTick(){var e=$('#cdv');if(e&&G.next)e.textContent=cdTxt()}
setInterval(cdTick,1000);
var MD=['🥇','🥈','🥉'];
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function J(u,o){return fetch(u,Object.assign({credentials:'same-origin'},o||{})).then(function(r){return r.json().catch(function(){return{ok:false}})}).catch(function(){return{ok:false,message:'تعذر الاتصال بالسيرفر'}})}
function toast(m){var t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove()},2600)}
function av(o){if(o.i)return '<div class="av has" style="--c:hsl('+o.h+' 75% 62%);background-image:url(\''+esc(o.i)+'\')"></div>';return '<div class="av" style="--c:hsl('+o.h+' 75% 62%)">'+esc(Array.from(o.u.replace(/^@/,''))[0]||'?')+'</div>'}
function rowH(o,rk){return '<div class="row'+(rk&&rk<=3?' top3 g'+rk:'')+'" data-u="'+esc(o.id)+'"><div class="rk">'+(rk&&rk<=3?MD[rk-1]:(rk||''))+'</div>'+av(o)+'<div class="who"><b>'+esc(o.u)+'</b>'+(o.t?'<div class="ttw">'+TB(o.t,1)+'</div>':'')+'<small>'+o.n+' شخصيات</small></div><div class="lkc">❤️ '+o.l+'</div></div>'}
function list(){
 if(!owners.length){$('#app').innerHTML='<div class="narrow">'+mineBar()+'<div class="note" style="margin-top:24px">ما فيه معارض بعد'+(G.owner?' — ابدأ بمعرضك من زر إدارة معرضي':'')+'</div></div>';bindMg();return}
 var top=owners.slice(0,10),pod=[[top[1],2],[top[0],1],[top[2],3]].filter(function(p){return p[0]});
 var h='<div class="narrow">'+mineBar()+'<div class="pod">'+pod.map(function(p){var o=p[0],k=p[1];return '<div class="pc g'+k+(o.i?' pi':'')+'" data-u="'+esc(o.id)+'">'+(o.i?'<div class="pim" style="background-image:url(\''+esc(o.i)+'\')"></div>':'')+'<span class="spk" style="top:8px;right:10px">✨</span><span class="spk" style="top:30px;left:10px;animation-delay:.7s">✨</span><div class="md">'+MD[k-1]+'</div>'+(o.i?'':'<div style="display:flex;justify-content:center;margin-top:6px">'+av(o)+'</div>')+'<div class="nm">'+esc(o.u)+'</div>'+(o.t?'<div class="ttw">'+TB(o.t,1)+'</div>':'')+'<div class="lk">❤️ '+o.l+'</div></div>'}).join('')+'</div>';
 h+='<h2>🏆 أعلى 10 معارض <small>حسب اللايكات</small></h2>'+top.map(function(o,i){return rowH(o,i+1)}).join('');
 h+='<h2>🖼️ كل المعارض <small>('+owners.length+')</small></h2><input class="search" id="q" placeholder="ابحث باسم اللاعب…"><div id="all" style="margin-top:12px"></div></div>';
 $('#app').innerHTML=h;all();$('#q').oninput=all;bindMg();
}
function all(){var q=($('#q').value||'').trim().toLowerCase();$('#all').innerHTML=owners.filter(function(o){return !q||o.u.toLowerCase().indexOf(q)>-1}).map(function(o){return rowH(o,0)}).join('')||'<div class="note">لا يوجد معرض بهذا الاسم</div>'}
function rows(a){var n=a.length,rc=Math.max(1,Math.ceil(n/6)),b=Math.floor(n/rc),x=n%rc,r=[],i=0;for(var k=0;k<rc;k++){var z=b+(x>0?1:0);if(x>0)x--;r.push(a.slice(i,i+z));i+=z}return r}
function cardH(c,i){return '<div class="card'+(c.om?' om':'')+'" style="--t:'+esc(c.c)+';animation-delay:'+(i*.07)+'s"><div class="tt"><span class="tn'+(/[a-zA-Z]/.test(c.t)?'':' ar')+'">'+esc(c.t)+'</span><span class="pw">'+Number(c.p).toLocaleString('en-US')+' PWR</span></div><div class="st">'+'★'.repeat(c.s)+'</div><div class="art'+(c.i?' has':'')+'"'+(c.i?' style="background-image:url(\''+esc(c.i)+'\')"':'')+'>'+(c.i?'':esc(Array.from(c.n)[0]||'?'))+'</div><div class="pl"><div class="ne">'+esc(c.n)+'</div><div class="ac">'+esc(c.a)+'</div></div></div>'}
function likeBtn(){var b=$('#lk');if(!b||!cur)return;b.className='like'+(cur.liked?' on':'');b.innerHTML='<span class="h">'+(cur.liked?'❤️':'🤍')+'</span> '+cur.l+' لايك'}
function show(id){
 J('/gallery/one?id='+encodeURIComponent(id)).then(function(d){
  if(!d||!d.ok){toast((d&&d.message)||'تعذر فتح المعرض');return}
  cur=d;var rank=d.rank,i=0;
  $('#back').hidden=false;$('#menu').hidden=true;$('#ttl').textContent='🖼️ معرض '+cur.u;
  var rb=rows(cur.cs).map(function(r){return '<div class="roster">'+r.map(function(c){return cardH(c,i++)}).join('')+'</div>'}).join('');
  $('#app').innerHTML='<div class="narrow">'+(rank<=3?'<div class="ribbon g'+rank+'">'+MD[rank-1]+' المركز '+['الأول','الثاني','الثالث'][rank-1]+' بالمعارض</div>':(rank<=10?'<div class="ribbon" style="--rc:#8b93a1;animation:none">🏆 الترتيب #'+rank+'</div>':''))+
  '<div class="bar"><button class="like" id="lk"></button><button class="zm" id="zm">'+(zoom?'🔎 ملء الشاشة':'🔍 تكبير')+'</button>'+(cur.mine?'<button class="zm" id="ed">✏️ تعديل</button>':'')+'</div></div>'+
  '<div id="bx"><div class="board'+(rank<=3?' top3 g'+rank:'')+'" id="bd"><div class="cn tl"></div><div class="cn br"></div><div class="eb">Character Roster</div><h1>معرض '+esc(cur.u)+'</h1>'+(cur.t?'<div class="ttw" style="text-align:center">'+TB(cur.t)+'</div>':'')+'<div class="sub">'+cur.cs.length+' / 10 CHARACTERS</div>'+rb+'</div></div>';
  likeBtn();
  $('#lk').onclick=function(){
   if(!G.owner){toast('سجّل دخول بحسابك عشان تعطي لايك');return}
   if(cur.mine){toast('ما تقدر تعطي لايك لمعرضك');return}
   J('/gallery/like',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:cur.id,csrf:G.csrf})}).then(function(r){
    if(!r||!r.ok){toast((r&&r.message)||'تعذر تنفيذ اللايك');return}
    cur.liked=r.liked;cur.l=r.likes;likeBtn();
    for(var k=0;k<owners.length;k++){if(owners[k].id===cur.id){owners[k].l=r.likes;break}}
   })};
  $('#zm').onclick=function(){zoom=!zoom;fit()};var ed=$('#ed');if(ed)ed.onclick=manage;
  try{history.replaceState(null,'','#'+id)}catch(e){}
  fit();scrollTo(0,0)
 })
}
function fit(){
 var bx=$('#bx'),bd=$('#bd');if(!bd)return;
 bd.style.zoom=1;var w=bd.offsetWidth,avw=bx.clientWidth,sc=zoom?Math.min(1,Math.max(.5,avw/w*2)):Math.min(1,avw/w);
 bd.style.zoom=sc;bx.style.overflowX=zoom?'auto':'hidden';
 var zb=$('#zm');if(zb)zb.textContent=zoom?'🔎 ملء الشاشة':'🔍 تكبير'
}
var M=null,busy=false;
function mineBar(){return cdBox()+(G.owner?'<button class="mg" id="mg">✏️ إدارة معرضي <small>إضافة وحذف الشخصيات</small></button>':'')}
function bindMg(){var b=$('#mg');if(b)b.onclick=manage}
function inG(k){for(var i=0;i<M.g.length;i++){if(M.g[i].k===k)return true}return false}
function chip(c,tail){return '<div class="mc" style="--t:'+esc(c.c)+'"><div class="mi'+(c.i?' has':'')+'"'+(c.i?' style="background-image:url(\''+esc(c.i)+'\')"':'')+'>'+(c.i?'':esc(Array.from(c.n)[0]||'?'))+'</div><div class="mn">'+esc(c.n)+'</div><div class="mt">'+esc(c.t)+' · '+Number(c.p).toLocaleString('en-US')+'</div>'+tail+'</div>'}
function drawG(){
 $('#mcnt').textContent=M.g.length+' / '+M.max;
 $('#mgg').innerHTML=M.g.length?M.g.map(function(c){return chip(c,'<button class="x" data-rm="'+esc(c.k)+'" aria-label="حذف من المعرض">✕</button>')}).join(''):'<div class="note" style="grid-column:1/-1;margin:0">معرضك فاضي — اختر شخصيات من القائمة تحت</div>';
 $('#mview').hidden=!M.g.length}
function drawPool(){
 var q=($('#mq').value||'').trim().toLowerCase(),full=M.g.length>=M.max;
 var a=M.pool.filter(function(c){return !q||(c.n+' '+c.a+' '+c.t).toLowerCase().indexOf(q)>-1});
 $('#pcnt').textContent='('+M.pool.length+')';
 $('#mpool').innerHTML=a.map(function(c){return chip(c,inG(c.k)?'<div class="ok">✓ بالمعرض</div>':(full?'<div class="ok">المعرض ممتلئ</div>':'<button class="ad" data-ad="'+esc(c.k)+'">＋ إضافة</button>'))}).join('')||'<div class="note" style="grid-column:1/-1;margin:0">'+(M.pool.length?'ما فيه شخصية بهذا الاسم':'ما عندك شخصيات بعد')+'</div>'}
function manage(){
 cur=null;$('#back').hidden=false;$('#menu').hidden=true;$('#ttl').textContent='✏️ إدارة معرضي';
 try{history.replaceState(null,'','#manage')}catch(e){}
 $('#app').innerHTML='<div class="narrow"><div class="note" style="margin-top:24px">جاري التحميل…</div></div>';
 J('/gallery/mine').then(function(d){
  if(!d||!d.ok){toast((d&&d.message)||'تعذر تحميل معرضك');home();return}
  M=d;
  $('#app').innerHTML='<div class="narrow"><div class="mhead">🖼️ معرضك <b id="mcnt"></b></div><div class="mgrid" id="mgg"></div><div class="mact"><button class="zm" id="mview">👁 شوف معرضي</button></div><h2>🎴 شخصياتك <small id="pcnt"></small></h2><input class="search" id="mq" placeholder="ابحث باسم الشخصية أو الأنمي أو الرتبة…"><div class="mgrid" id="mpool" style="margin-top:12px"></div></div>';
  $('#mq').oninput=drawPool;
  $('#mview').onclick=function(){show(M.id)};
  drawG();drawPool();scrollTo(0,0)})}
function act(url,k,btn){
 if(busy||!M)return;busy=true;btn.disabled=true;
 J(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({k:k,csrf:G.csrf})}).then(function(r){
  busy=false;
  if(r&&r.g)M.g=r.g;
  toast((r&&r.message)||'تعذر تنفيذ العملية');
  drawG();drawPool()})}
function home(){cur=null;$('#back').hidden=true;$('#menu').hidden=false;$('#ttl').textContent='🖼️ معارض الأكاديمية';
 try{history.replaceState(null,'',location.pathname)}catch(e){}
 J('/gallery/list').then(function(d){owners=(d&&d.ok&&d.owners)||[];list();scrollTo(0,0)})}
$('#back').onclick=home;addEventListener('resize',fit);
document.addEventListener('click',function(e){
 var b=e.target.closest('[data-u]');if(b){show(b.dataset.u);return}
 var r=e.target.closest('[data-rm]');if(r){act('/gallery/remove',r.dataset.rm,r);return}
 var a=e.target.closest('[data-ad]');if(a){act('/gallery/add',a.dataset.ad,a)}
});
var h0=(location.hash||'').slice(1);
if(/^[a-f0-9]{12}$/.test(h0)){J('/gallery/list').then(function(d){owners=(d&&d.ok&&d.owners)||[];show(h0)})}else if(h0==='manage'&&G.owner){manage()}else{home()}
`

function galleryPageHTML({ code, viewer }) {
    const c = esc(code)
    const menu = viewer.isOwner ? `<button class="ic" id="nv-open" type="button" aria-label="القائمة" aria-expanded="false" aria-controls="nv-dr">☰</button>` : `<a class="ic" href="/u/${c}" aria-label="رجوع للموقع">🏠</a>`
    const cfg = jsonForScript({ owner: !!viewer.isOwner, csrf: viewer.isOwner ? viewer.csrf : '', next: nextPayoutAt(), now: Date.now() })
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
${TITLES.HEAD}${PWA.HEAD}${NOTIFY.HEAD}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>معارض الأكاديمية</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Oswald:wght@500;600&display=swap" rel="stylesheet">
<style>${GAL_CSS}</style>
</head>
<body>
<div class="top"><button class="ic" id="back" hidden aria-label="رجوع">➜</button><span id="menu">${menu}</span><b id="ttl">🖼️ معارض الأكاديمية</b></div>
<div class="wrap" id="app"></div>
${viewer.isOwner ? navDrawerHTML(code, viewer.csrf, 'gallery', viewer.name) : ''}
<script>window.__GAL=${cfg};</script>
<script>${GAL_JS}</script>
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

// ---------------------------------------------------------------
// 🌌 صفحة بنر الأسبوع (نفس منطق .بنر و .سحب_بنر بالواتس — الحساب كله بالسيرفر
// عبر systems/bannerPullSystem.js، والصفحة تعرض النتيجة بأنيميشن)
// عنوان البنر = ability الشخصية الحالية (يتغير تلقائياً مع شخصية البنر)
// الصور: تُضبط تلقائياً حسب نسبة الصورة (طويلة / عادية / عريضة) بالمتصفح
// ---------------------------------------------------------------
const BANNER_ERRORS = {
    BUSY: '⏳ انتظر حتى تنتهي عملية السحب السابقة.',
    NO_PLAYER: 'حسابك غير موجود.',
    NO_BANNER: '❌ لا يوجد بنر حالياً.',
    BANNED: '🚫 حسابك محظور من استخدام البوت.',
    CLOSED: '⏰ البوت خارج وقت العمل (من 10:00 صباحاً حتى 12:05 منتصف الليل بتوقيت الرياض).',
    OFFLINE: '📡 البوت غير متصل حالياً، حاول بعد قليل.',
    BAD_COUNT: '❌ عدد السحبات غير صحيح.',
    SERVER: '❌ صار خطأ بالخادم أثناء السحب — حدّث الصفحة وتأكد من شخصياتك ورصيدك قبل إعادة المحاولة.'
}

function bannerErrorMessage(r) {
    if (r.code === 'FULL') return `❌ المخزون لا يكفي\n\n📦 السعة: ${Number(r.capacity) || 30}\n🆓 المتاح: ${Number(r.free) || 0}\n🎟️ المطلوب: ${Number(r.need) || 1}`
    if (r.code === 'NO_ORBS') return `❌ الأورب غير كافية\n\n🔮 رصيدك: ${(Number(r.have) || 0).toLocaleString('en-US')}\n🎟️ المطلوب: ${(Number(r.need) || 0).toLocaleString('en-US')}\n\n📜 اربح الأورب من المهام اليومية بالواتس: .اورب`
    if (r.code === 'SERVER' && r.refunded) return BANNER_ERRORS.SERVER + '\n🔮 تم استرجاع الأورب'
    return BANNER_ERRORS[r.code] || BANNER_ERRORS.SERVER
}

function bannerPageHTML({ viewer, code, data }) {
    return `${shellHead('بنر الأسبوع')}
<style>
.bp-wrap{max-width:560px;margin:0 auto}
.bp-bn{position:relative;height:230px;border-radius:18px;overflow:hidden;border:2px solid var(--gold);background:#f6efe0;direction:ltr;color:#2a2418}
.bp-bn::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,#f6efe0f5 0,#f6efe0f5 36%,#f6efe000 62%)}
.bp-bgb{position:absolute;inset:-24px;background-size:cover;background-position:center;background-repeat:no-repeat;filter:blur(22px) saturate(1.25)}
.bp-art{position:absolute;top:0;bottom:0;right:0;width:min(70%,330px);background-repeat:no-repeat;background-size:cover;background-position:50% 30%;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 24%);mask-image:linear-gradient(90deg,transparent 0,#000 24%)}
.bp-bt{position:absolute;z-index:3;top:0;left:0;background:#d9a55c;color:#fff;font-weight:800;font-size:11px;padding:3px 12px;border-radius:0 0 12px 0}
.bp-bl{position:absolute;z-index:2;left:12px;top:28px;width:46%;direction:rtl;text-align:right}
.bp-bl h1{font-size:22px;font-weight:900;line-height:1.15;color:#b8772e;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.bp-bl b{display:block;font-size:12px;margin-top:8px;font-weight:900}
.bp-bl p{font-size:10.5px;background:#d9a55c;color:#fff;padding:5px 7px;border-radius:4px;margin-top:5px;line-height:1.5}
.bp-bl small{display:block;font-size:10.5px;margin-top:6px;font-weight:800;color:#4a4033}
.bp-nb{position:absolute;z-index:3;right:10px;bottom:10px;background:#0b0f1ccc;padding:5px 12px 7px;color:#fff;max-width:62%}
.bp-nb h3{font-family:'Oswald',sans-serif;font-size:22px;font-weight:600;line-height:1.1;overflow-wrap:anywhere}
.bp-nb h3 em{font-style:normal;color:#ffd966;font-size:11px;margin-left:4px;vertical-align:top}
.bp-nb s{text-decoration:none;display:block;color:#ff3860;letter-spacing:2px;font-size:14px;text-shadow:0 0 8px #ff386088}
.bp-nb span{display:inline-block;background:#26346c;border-radius:3px;font-size:11px;padding:1px 8px;margin-top:3px}
.bp-row{display:flex;justify-content:space-between;align-items:center;margin:14px 0 8px;gap:10px;flex-wrap:wrap}
.bp-bal{font-size:20px;font-weight:900;background:#0f1422;border:1px solid #1f2740;padding:6px 16px;border-radius:30px;color:var(--gold)}
.bp-inv{font-size:13px;font-weight:800;color:var(--text-dim)}
.bp-pt{font-size:13px;color:var(--text-dim);font-weight:700}.bp-pt b{color:var(--gold)}
.bp-bar{height:6px;border-radius:6px;background:#1f2740;margin-top:5px;overflow:hidden}.bp-bar i{display:block;height:100%;background:linear-gradient(90deg,#4aa8ff,#ffb83d);transition:width .4s}
.bp-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
.bp-pb{font:inherit;display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px;border-radius:16px;border:2px solid #1f2740;background:#0f1422;color:var(--text);cursor:pointer}
.bp-pb b{font-size:18px;font-weight:900}.bp-pb small{color:var(--text-dim);font-weight:800}
.bp-pb.g{border-color:var(--gold);background:linear-gradient(135deg,#f0c04a33,#0f1422)}.bp-pb:disabled{opacity:.4;cursor:not-allowed}.bp-pb:active{transform:scale(.97)}
.bp-rt{font-size:11px;color:var(--text-dim);text-align:center;line-height:1.8}
.bp-nx{text-align:center;font-size:13px;font-weight:800;color:var(--gold);margin-top:8px}
.bp-h{font-size:14px;font-weight:900;color:var(--gold);margin:18px 0 8px}
#bp-hist{display:flex;flex-wrap:wrap;gap:5px}#bp-hist i{width:44px;height:60px;border-radius:7px;border:2px solid var(--t);background-color:#151a28;background-repeat:no-repeat}
#bp-ov{position:fixed;inset:0;z-index:70;overflow:hidden;display:none;align-items:center;justify-content:center;padding:env(safe-area-inset-top,0px) 12px env(safe-area-inset-bottom,0px);background:radial-gradient(ellipse at 50% 105%,#2d2058,transparent 60%),radial-gradient(circle at 50% 40%,#16204a,#05060c 75%)}
.bp-ry{position:absolute;left:50%;top:50%;width:250vmax;height:250vmax;margin:-125vmax;background:repeating-conic-gradient(color-mix(in srgb,var(--b) 18%,transparent) 0 5deg,transparent 5deg 20deg);animation:bpsp 30s linear infinite;opacity:0;transition:opacity .8s}.bp-rs .bp-ry{opacity:1}
@keyframes bpsp{to{transform:rotate(360deg)}}
.bp-mt{position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px;border-radius:50%;background:#fff;box-shadow:0 0 24px 10px var(--b),0 0 70px 26px var(--b);animation:bpmt 1.5s cubic-bezier(.55,0,.95,.65) forwards}
.bp-mt::before{content:"";position:absolute;top:50%;right:50%;width:min(60vw,320px);height:6px;border-radius:6px;background:linear-gradient(to left,#fff,var(--b),transparent);transform-origin:right center;transform:translateY(-50%) rotate(50deg)}
@keyframes bpmt{from{transform:translate(-48vw,-58vh) scale(.6)}to{transform:translate(0,0) scale(1.6)}}
.bp-fl{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}.bp-fl.on{animation:bpfl .8s ease-out}
@keyframes bpfl{0%{opacity:0}20%{opacity:1}100%{opacity:0}}
.bp-rg{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px;border-radius:50%;border:3px solid var(--b);opacity:0}.bp-rg.on{animation:bprg .9s ease-out}
@keyframes bprg{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(30)}}
#bp-ov.bp-shk{animation:bpshk .5s}@keyframes bpshk{20%{transform:translate(-6px,4px)}40%{transform:translate(5px,-5px)}60%{transform:translate(-4px,-2px)}80%{transform:translate(3px,3px)}}
.bp-cs{position:relative;z-index:2}
.bp-cs.n1 .bpc{width:min(62vw,250px);font-size:16px}
.bp-cs.n10{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;width:100%;max-width:520px}.bp-cs.n10 .bpc{font-size:8.5px}
.bpc{position:relative;aspect-ratio:3/4.3;perspective:700px;cursor:pointer;animation:bpdr .5s cubic-bezier(.2,1.3,.4,1) both}.bpc.f{z-index:2}
@keyframes bpdr{from{opacity:0;transform:translateY(-70px) scale(.5) rotate(-12deg)}to{opacity:1;transform:none}}
.bpi{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.3,1.2,.5,1)}.bpc.f .bpi{transform:rotateY(180deg)}
.bpk,.bpf{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:.9em;border:2.5px solid var(--t);overflow:hidden}
.bpk{background:linear-gradient(160deg,#1b2140,#0a0d1a);box-shadow:0 0 1.4em color-mix(in srgb,var(--t) 70%,transparent);display:grid;place-items:center;font-size:3.5em;color:var(--t);text-shadow:0 0 12px var(--t);animation:bpbk 1.6s ease-in-out infinite}
@keyframes bpbk{50%{box-shadow:0 0 2.4em color-mix(in srgb,var(--t) 95%,transparent)}}
.bpf{transform:rotateY(180deg);background-color:#151a28;color:#fff;direction:ltr;box-shadow:inset 0 0 0 .3em #0a0d16aa,inset 0 0 0 .36em color-mix(in srgb,var(--t) 60%,transparent)}
.bpa{position:absolute;inset:0;background-repeat:no-repeat;background-size:cover;background-position:50% 25%}
.bpf::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(#0a0d16d9,#0a0d1600 30%,#0a0d1600 55%,#0a0d16f0)}
.bpf::after{content:"";position:absolute;inset:0;z-index:3;background:linear-gradient(115deg,transparent 35%,#ffffff55 50%,transparent 65%);transform:translateX(-120%);pointer-events:none}
.bpc.f .bpf::after{animation:bpsh 1.2s .5s ease-out forwards}@keyframes bpsh{to{transform:translateX(120%)}}
.bph,.bps,.bpt{position:absolute;left:0;right:0;z-index:2}
.bph{top:0;padding:.6em .7em;display:flex;justify-content:space-between;align-items:center;font-family:'Oswald',Impact,sans-serif}
.bpw{font-size:.95em;font-weight:600;color:#0a0d16;background:var(--t);padding:.2em .6em;border-radius:2em}
.bptn{font-weight:600;color:var(--t);letter-spacing:.08em}.bptn.ar{font-family:'Cairo',sans-serif;letter-spacing:0;font-weight:800}
.bps{top:2.5em;padding:0 .7em;color:var(--t);font-size:.95em;text-shadow:0 0 8px var(--t)}
.bps i{font-style:normal;display:inline-block;opacity:0;transform:scale(2.4) rotate(-40deg)}
.bpc.f .bps i{animation:bppp .35s calc(.45s + var(--n)*.12s) cubic-bezier(.3,1.6,.5,1) forwards}@keyframes bppp{to{opacity:1;transform:none}}
.bpt{bottom:0;padding:.6em .5em .8em;text-align:center;display:flex;flex-direction:column;align-items:center;gap:.4em}
.bpn{font-family:'Oswald',Impact,sans-serif;font-weight:600;font-size:1.3em;line-height:1.1;text-shadow:0 2px 8px #000;overflow-wrap:anywhere}
.bpan{font-size:.8em;color:var(--t);border:1px solid var(--t);border-radius:2em;padding:.1em .8em;background:#080a12a6;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bpfe{position:absolute;z-index:3;top:3.6em;right:.6em;font-size:.85em;font-weight:800;background:#0a0d16cc;color:#ffd966;border:1px solid #ffd966;border-radius:2em;padding:.05em .6em;font-family:'Cairo',sans-serif}
.bp-cs.n10 .bps,.bp-cs.n10 .bpan,.bp-cs.n10 .bpw,.bp-cs.n10 .bpfe{display:none}.bp-cs.n10 .bpn{font-size:1.15em}
.bpc.bst::after{content:"";position:absolute;inset:-3px;border-radius:1em;border:3px solid var(--t);animation:bpbs .9s ease-out forwards;pointer-events:none}
@keyframes bpbs{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(1.6)}}
.bp-ctl{position:absolute;z-index:4;bottom:calc(22px + env(safe-area-inset-bottom,0px));left:0;right:0;display:flex;gap:10px;justify-content:center}
.bp-ctl button{font:inherit;font-weight:800;padding:10px 24px;border-radius:30px;border:1.5px solid #ffffff55;background:#0009;color:#fff;cursor:pointer}
.bp-sp{position:absolute;bottom:-10px;border-radius:50%;background:var(--b);box-shadow:0 0 8px 2px var(--b);animation:bpup linear infinite;opacity:0;pointer-events:none}
@keyframes bpup{0%{transform:translateY(0) scale(.5);opacity:0}15%{opacity:1}100%{transform:translateY(-105vh) scale(1);opacity:0}}
@media (prefers-reduced-motion:reduce){.bp-mt,.bp-ry,.bp-sp,.bpk{animation:none}}
</style>
<body><div style="padding:30px 16px 60px">
  <div class="topbar">
    <span class="tb-l">${NAV_BTN}<span class="gmode">بنر الأسبوع</span></span>
    <a class="pill" href="/u/${code}">← رجوع للعرض</a>
  </div>
  ${navDrawerHTML(code, viewer.csrf, 'banner', viewer.name)}
  <div class="bp-wrap">
    <div class="bp-bn" id="bp-bn"><div class="bp-bgb" id="bp-bgb"></div><div class="bp-art" id="bp-art"></div>
      <div class="bp-bt">بنر الشخصية</div>
      <div class="bp-bl"><h1 id="bp-ab"></h1><b>احتمال أعلى!</b><p id="bp-note"></p><small id="bp-left"></small></div>
      <div class="bp-nb"><h3><span id="bp-nm"></span><em>UP!</em></h3><s>★★★★</s><span id="bp-an"></span></div>
    </div>
    <div class="bp-nx" id="bp-nx" hidden></div>
    <div class="bp-row"><div class="bp-bal">🔮 <span id="bp-orbs">0</span></div><div class="bp-inv">📦 المخزون <span id="bp-inv">-</span></div></div>
    <div class="bp-pt">🎯 ضمان SSS: <b id="bp-pt">0</b>/<span id="bp-hp"></span><div class="bp-bar"><i id="bp-pb"></i></div><div id="bp-gt" style="margin-top:4px"></div></div>
    <div class="gp-msg" id="bp-msg" hidden style="white-space:pre-wrap;margin-top:12px"></div>
    <div class="bp-btns">
      <button id="bp-b1" class="bp-pb" type="button"><b>سحبة x1</b><small id="bp-c1"></small></button>
      <button id="bp-b10" class="bp-pb g" type="button"><b id="bp-t10"></b><small id="bp-c10"></small></button>
    </div>
    <div class="bp-rt" id="bp-rt"></div>
    <div class="bp-rt" style="margin-top:6px">📜 اربح الأورب من المهام اليومية بالواتس: .اورب</div>
    <div id="bp-hw" hidden><div class="bp-h">آخر سحباتك في هذه الجلسة</div><div id="bp-hist"></div></div>
  </div>
</div>
<div id="bp-ov" aria-hidden="true"></div>
<script>
(function(){
  var CODE=${jsonForScript(code)}, CSRF=${jsonForScript(viewer.csrf)}, D=${jsonForScript(data)};
  var busy=false, hist=[], ending=false;
  function $(id){ return document.getElementById(id); }
  function el(tag,cls,txt){ var e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
  function fmt(n){ return Number(n||0).toLocaleString('en-US'); }
  function show(kind,text){ var m=$('bp-msg'); if(!text){ m.hidden=true; return; } m.className='gp-msg '+kind; m.textContent=text; m.hidden=false; }

  // 🖼️ ضبط الصورة حسب نسبتها: طويلة / عادية / عريضة (يُحدَّد من الأبعاد الفعلية)
  function fitOf(w,h){
    var r=w/h;
    if(r<.75) return {bp:'50% 40%',cp:'50% 24%'};   // طويلة: الوجه بالأعلى
    if(r>1.4) return {bp:'50% 38%',cp:'50% 30%'};   // عريضة
    return {bp:'50% 28%',cp:'50% 22%'};              // عادية
  }
  function fitInto(url,cb){
    if(!url) return;
    var im=new Image();
    im.onload=function(){ try{ cb(fitOf(im.naturalWidth||1,im.naturalHeight||1)); }catch(e){} };
    im.src=url;
  }
  function setBg(node,url){ node.style.backgroundImage="url('"+url+"')"; }

  // ───── البنر (العنوان = ability الشخصية) ─────
  function renderBanner(){
    var b=D.banner, c=D.cfg;
    $('bp-ab').textContent=b.ability||'بنر الشخصية';
    $('bp-nm').textContent=b.name; $('bp-an').textContent=b.anime||'';
    $('bp-note').textContent='ضمان SSS عند '+c.hardPity+' سحبة — '+c.featured+'% من الـ SSS تكون شخصية البنر.';
    $('bp-hp').textContent=c.hardPity;
    $('bp-c1').textContent='🔮 '+fmt(c.pullCost);
    $('bp-t10').textContent='سحبة x'+c.multiCount;
    $('bp-c10').textContent='🔮 '+fmt(c.multiCost);
    $('bp-rt').textContent='SSS '+c.sssRate+'% (ترتفع من السحبة '+c.softPity+') · اسطوري '+c.legendary+'% · ممتاز '+c.excellent+'% · عادي الباقي';
    if(b.img){ setBg($('bp-bgb'),b.img); setBg($('bp-art'),b.img); fitInto(b.img,function(f){ $('bp-art').style.backgroundPosition=f.bp; }); }
    var nx=$('bp-nx');
    if(D.next&&D.next.kind==='next'){ nx.textContent='📅 البنر القادم: '+D.next.name; nx.hidden=false; }
    else if(D.next&&D.next.kind==='vote'){ nx.textContent='🗳️ التصويت على البنر القادم مفتوح — اكتب .تص بالواتس'; nx.hidden=false; }
  }
  function stats(){
    var c=D.cfg;
    $('bp-orbs').textContent=fmt(D.orbs);
    $('bp-pt').textContent=D.pity;
    $('bp-pb').style.width=Math.min(100,D.pity/c.hardPity*100)+'%';
    $('bp-gt').textContent=D.guaranteed?'⭐ الـ SSS القادمة مضمونة من البنر':'⭐ الـ SSS القادمة '+c.featured+'% للبنر';
    $('bp-inv').textContent=(D.count!=null?D.count:'-')+'/'+(D.cap!=null?D.cap:'-');
    $('bp-b1').disabled=busy||D.orbs<c.pullCost;
    $('bp-b10').disabled=busy||D.orbs<c.multiCost;
  }
  function tick(){
    var ms=D.endsAt-Date.now();
    if(ms<=0){ $('bp-left').textContent='⏳ جارٍ تجديد البنر…'; if(!ending&&!busy){ ending=true; setTimeout(function(){ location.reload(); },4000); } return; }
    var s=Math.floor(ms/1000), d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60);
    $('bp-left').textContent='الوقت المتبقي: '+(d>0?d+' يوم ':'')+h+' ساعة '+(d>0?'':m+' دقيقة');
  }

  // ───── الأنميشن ─────
  function mkCard(c,k){
    var w=el('div','bpc'); w.style.setProperty('--t',c.color); w.style.animationDelay=(k*.07)+'s';
    var inn=el('div','bpi'), bk=el('div','bpk'); bk.appendChild(el('span','','✦'));
    var fr=el('div','bpf'), art=el('div','bpa');
    if(c.img){ setBg(art,c.img); fitInto(c.img,function(f){ art.style.backgroundPosition=f.cp; }); }
    fr.appendChild(art);
    var hd=el('div','bph'); hd.appendChild(el('span','bpw',fmt(c.power)+' PWR')); hd.appendChild(el('span','bptn '+(c.lang||''),c.tier)); fr.appendChild(hd);
    var st=el('div','bps'); for(var j=0;j<c.stars;j++){ var si=el('i','','★'); si.style.setProperty('--n',j); st.appendChild(si); } fr.appendChild(st);
    if(c.featured) fr.appendChild(el('div','bpfe','👑 البنر'));
    var ft=el('div','bpt'); ft.appendChild(el('div','bpn',c.name)); if(c.anime) ft.appendChild(el('span','bpan',c.anime)); fr.appendChild(ft);
    inn.appendChild(bk); inn.appendChild(fr); w.appendChild(inn);
    return w;
  }
  function play(cards,done){
    var o=$('bp-ov'), n=cards.length, left=n, bursted=false, best=cards[0];
    cards.forEach(function(c){ if(c.stars>best.stars) best=c; });
    o.className=''; o.style.display='flex'; o.setAttribute('aria-hidden','false'); o.style.setProperty('--b',best.color);
    o.innerHTML='';
    ['bp-ry','bp-fl','bp-rg'].forEach(function(cl){ o.appendChild(el('div',cl)); });
    var mw=el('div','bp-mw'); mw.style.cssText='position:absolute;inset:0'; mw.appendChild(el('div','bp-mt')); o.appendChild(mw);
    var cs=el('div','bp-cs n'+n); o.appendChild(cs);
    var ctl=el('div','bp-ctl'), sk=el('button','','تخطي ⏭'); sk.type='button'; ctl.appendChild(sk); o.appendChild(ctl);
    var t1=setTimeout(burst,1500); sk.onclick=function(){ clearTimeout(t1); burst(); };
    function burst(){
      if(bursted) return; bursted=true; mw.remove();
      o.querySelector('.bp-fl').classList.add('on'); o.querySelector('.bp-rg').classList.add('on'); o.classList.add('bp-shk');
      setTimeout(deal,450);
    }
    function deal(){
      o.classList.add('bp-rs');
      for(var k=0;k<22;k++){ var d=el('div','bp-sp'), z=3+Math.random()*5; d.style.cssText='left:'+Math.random()*100+'%;width:'+z+'px;height:'+z+'px;animation-duration:'+(4+Math.random()*5)+'s;animation-delay:'+Math.random()*4+'s'; o.appendChild(d); }
      var els=cards.map(function(c,k){ var e=mkCard(c,k); cs.appendChild(e); return e; });
      ctl.innerHTML='';
      var al=el('button','',n>1?'كشف الكل':'اضغط البطاقة للكشف'); al.type='button'; ctl.appendChild(al);
      function flip(k){
        var e=els[k]; if(e.classList.contains('f')) return; e.classList.add('f');
        if(cards[k].stars>=3){ var q=o.querySelector('.bp-fl'); q.style.background=cards[k].color; q.classList.remove('on'); void q.offsetWidth; q.classList.add('on'); setTimeout(function(){ e.classList.add('bst'); },350); }
        if(--left===0){ ctl.innerHTML=''; var dn=el('button','','تم ✓'); dn.type='button'; dn.onclick=close; ctl.appendChild(dn); }
      }
      els.forEach(function(e,k){ e.onclick=function(){ flip(k); }; });
      al.onclick=function(){ els.forEach(function(e,k){ setTimeout(function(){ flip(k); },k*140); }); };
    }
    function close(){ o.style.display='none'; o.setAttribute('aria-hidden','true'); o.innerHTML=''; done(); }
  }
  function addHist(cards){
    cards.slice().reverse().forEach(function(c){ hist.unshift(c); });
    hist=hist.slice(0,30);
    var h=$('bp-hist'); h.innerHTML='';
    hist.forEach(function(c){ var i=el('i'); i.style.setProperty('--t',c.color); if(c.img){ setBg(i,c.img); i.style.backgroundSize='cover'; i.style.backgroundPosition='50% 24%'; fitInto(c.img,function(f){ i.style.backgroundPosition=f.cp; }); } h.appendChild(i); });
    $('bp-hw').hidden=!hist.length;
  }

  // ───── السحب ─────
  function pull(n){
    if(busy) return;
    busy=true; stats(); show(null);
    var ctl=('AbortController' in window)?new AbortController():null; var tm=setTimeout(function(){ if(ctl) ctl.abort(); },30000);
    fetch('/banner/pull',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:ctl?ctl.signal:undefined,body:JSON.stringify({csrf:CSRF,code:CODE,count:n})})
    .then(function(r){ return r.json().catch(function(){ return {ok:false,message:'رد غير مفهوم من السيرفر'}; }).then(function(j){ return {s:r.status,j:j}; }); })
    .then(function(x){
      clearTimeout(tm);
      if(x.s===401){ location.href='/login?code='+CODE; return; }
      var j=x.j;
      if(j.state){
        if(j.state.orbs!=null) D.orbs=j.state.orbs;
        if(j.state.pity!=null) D.pity=j.state.pity;
        if(j.state.guaranteed!=null) D.guaranteed=j.state.guaranteed;
        if(j.state.count!=null) D.count=j.state.count;
        if(j.state.cap!=null) D.cap=j.state.cap;
      }
      if(j.ok){
        var fin=function(){ busy=false; addHist(j.cards); stats(); var notes=(j.notes||[]).join(String.fromCharCode(10)); if(notes) show('good',notes); };
        try{ play(j.cards,fin); }catch(e){ $('bp-ov').style.display='none'; fin(); }
      } else { busy=false; show('bad',j.message||'فشل السحب'); stats(); }
    })
    .catch(function(){
      clearTimeout(tm); busy=false;
      show('warn','لم يصلنا رد من السيرفر — قد تكون السحبة تمت. حدّث الصفحة للتأكد من رصيدك ومخزونك قبل المحاولة من جديد.');
      stats();
    });
  }
  $('bp-b1').addEventListener('click',function(){ pull(1); });
  $('bp-b10').addEventListener('click',function(){ pull(D.cfg.multiCount); });
  renderBanner(); stats(); tick(); setInterval(tick,1000);
})();
</script></body></html>`
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
        // SSS كما هي بدون تغيير — الرتب الأقل تقبل كمان صور ./characters المحلية
        img: tierKey === 'SSS' ? safeImageUrl(disp.image) : (safeImageUrl(disp.image) || localCharImageUrl(disp.image)),
        sss: tierKey === 'SSS'
    }
}

// ---------------------------------------------------------------
// 👑 صفحة هجوم الزعيم (نفس منطق .هجوم بالواتس — الحساب كله بالسيرفر
// عبر systems/bossAttackSystem.js، والصفحة تعرض النتيجة بأنيميشن)
// ---------------------------------------------------------------
// =====================================================================
// 👑 صفحة هجوم الزعيم — نفس تصميم «مثال الزعيم بصورك» بالضبط
// (ثيمات القلعة/البركان/الساكورا + الزعيم بالمنتصف + الأتباع تنزل من فوق + الحشد + لوحة الضرر)
// منطق الهجوم/الخادم/الأحداث كما هو — تغيّر الشكل فقط.
// =====================================================================

const BOSS_CSS = `:root{--bg:#0b0710;--red:#ff3860;--gold:#f0c04a;--text:#eef1f8;--dim:#9a8fa8;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--text);font-family:'Cairo',sans-serif;overflow-x:hidden;min-height:100%}
#bg{position:fixed;inset:0;width:100%;height:100%;z-index:0}
.mist{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(500px 340px at 50% 15%,rgba(255,56,96,.2),transparent 70%),radial-gradient(500px 300px at 10% 90%,rgba(192,74,255,.14),transparent 70%)}
.wrap{position:relative;z-index:1;max-width:520px;margin:0 auto;padding:12px 12px 36px}
.top{display:flex;align-items:center;justify-content:space-between;padding:6px 2px 10px}
.menu{width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,56,96,.5);background:rgba(20,10,24,.75);color:var(--red);font-size:20px}
.ttl{font-weight:900;font-size:18px}
.live{font-size:12px;color:#7dffb0;border:1px solid rgba(125,255,176,.4);border-radius:20px;padding:4px 10px;background:rgba(20,10,24,.75)}
.live b{font-family:'Oswald',sans-serif}
.arena{position:relative;border-radius:20px;overflow:hidden;border:1.5px solid rgba(255,56,96,.45);background:linear-gradient(180deg,#1b0d26,#0b0710 85%);box-shadow:0 0 30px rgba(255,56,96,.2);padding:14px 8px 10px}
.bossbox{position:relative;height:232px;display:flex;justify-content:center}
.boss.shield{filter:saturate(.5) brightness(.75)}
.fol{position:absolute;bottom:2px;width:74px;text-align:center;animation:drop .8s cubic-bezier(.3,1.5,.5,1) both}
@keyframes drop{from{transform:translateY(-220px);opacity:0}}
.fol .fi{width:74px;height:74px;border-radius:14px;border:2px solid #f0c04a;background-size:cover;background-position:center top;box-shadow:0 0 14px rgba(240,192,74,.55)}
.fol .fh{height:5px;border-radius:3px;background:rgba(255,255,255,.12);margin-top:3px;overflow:hidden}
.fol .fh i{display:block;height:100%;width:100%;background:#ff3860;transition:width .3s}
.fol .fn{font-size:11px;color:#fff;margin-top:1px;white-space:nowrap}
.fol.hit .fi{animation:shake .3s}
.fol.dead{animation:fdie .7s forwards}
@keyframes fdie{to{transform:translateY(20px) scale(.4) rotate(14deg);opacity:0}}
.boss{position:relative;width:150px;height:214px;border-radius:18px;border:2px solid var(--red);background:#10162a center 15%/cover;box-shadow:0 0 40px rgba(255,56,96,.55);animation:fl 3.2s ease-in-out infinite}
@keyframes fl{50%{transform:translateY(-8px)}}
.boss.hit{animation:shake .3s}
@keyframes shake{25%{transform:translateX(-7px);filter:brightness(2)}60%{transform:translateX(7px)}}
.boss.dead{animation:die 1.2s forwards}
@keyframes die{to{transform:scale(.5) rotate(10deg);opacity:0}}
.hpt{display:flex;justify-content:space-between;font-size:13px;color:var(--dim);margin:8px 2px 3px}
.hpt b{font-family:'Oswald',sans-serif;color:#fff;direction:ltr}
.hp{height:14px;border-radius:9px;background:rgba(255,255,255,.1);border:1px solid rgba(255,56,96,.4);overflow:hidden;position:relative}
.hp i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#ff3860,#ff8a5c);transition:width .4s}
.crowd{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px 4px;margin-top:12px}
.pl{position:relative;text-align:center;z-index:2}
.av{position:relative;width:54px;height:54px;margin:0 auto;border-radius:50%;background-size:cover;background-position:center top;border:2px solid hsl(var(--h) 80% 60%);display:flex;box-shadow:0 0 10px hsl(var(--h) 80% 50% / .45)}
.pl .nm{font-size:11px;font-weight:800;color:var(--dim);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl.me .av{border-color:var(--gold);box-shadow:0 0 14px var(--gold)}
.dmg{position:fixed;font-family:'Oswald',sans-serif;font-size:20px;color:#fff;text-shadow:0 0 8px var(--red),0 2px 0 #000;pointer-events:none;z-index:9;animation:up .9s ease-out forwards}
.dmg.crit{color:var(--gold);font-size:28px}
@keyframes up{from{opacity:1;transform:translateY(0) scale(.8)}to{opacity:0;transform:translateY(-60px) scale(1.1)}}
.btn{margin-top:12px;width:100%;font-family:'Cairo',sans-serif;font-weight:900;font-size:17px;padding:14px;border-radius:14px;border:0;color:#fff;background:linear-gradient(180deg,#ff5a7c,#d81f47);box-shadow:0 6px 22px rgba(255,56,96,.4)}
.btn:active{transform:scale(.97)}
.lb{margin-top:14px;border-radius:16px;background:rgba(20,10,24,.82);border:1px solid rgba(255,255,255,.08);padding:12px 10px}
.lbh{display:flex;justify-content:space-between;font-weight:900;margin-bottom:8px}
.lbh span{font-size:12px;font-weight:600;color:var(--dim)}
.rows{position:relative}
.row{position:absolute;left:0;right:0;height:40px;display:flex;align-items:center;gap:8px;transition:transform .5s cubic-bezier(.2,.9,.3,1)}
.rk{flex:0 0 24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Oswald',sans-serif;font-size:12px;background:#2a1b36}
.row.r1 .rk{background:var(--gold);color:#0a0d16}.row.r2 .rk{background:#c9ced8;color:#0a0d16}.row.r3 .rk{background:#d08a4c;color:#0a0d16}
.mini{flex:0 0 28px;height:28px;border-radius:50%;border:1.5px solid hsl(var(--h) 80% 60%);background-size:cover;background-position:center top}
.bw{flex:1;min-width:0}
.bn{display:flex;justify-content:space-between;font-size:12px;font-weight:800}.bn span{display:inline-flex;align-items:center;gap:2px;min-width:0;overflow:hidden;white-space:nowrap}.bn span .ttl{font-size:9.5px;padding:0 6px;margin-inline-start:4px;flex:none}
.bn b{font-family:'Oswald',sans-serif;color:var(--gold);direction:ltr;font-weight:500}
.bar{height:5px;border-radius:4px;background:rgba(255,255,255,.08);margin-top:2px;overflow:hidden}
.bar i{display:block;height:100%;width:0;background:hsl(var(--h) 80% 60%);transition:width .4s}
.toast{position:fixed;left:50%;top:70px;transform:translateX(-50%) translateY(-20px);opacity:0;z-index:20;background:#1b0d26;border:1.5px solid var(--gold);color:var(--gold);font-weight:900;padding:10px 20px;border-radius:14px;transition:.4s;text-align:center}
.toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01s!important;transition-duration:.01s!important}}
.themes{display:flex;gap:8px;margin-bottom:10px}
.th{flex:1;font-family:'Cairo',sans-serif;font-weight:800;font-size:12px;color:var(--dim);background:rgba(20,10,24,.75);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:7px 4px}
.th.on{color:#0a0d16;background:var(--gold);border-color:var(--gold)}
.arena{isolation:isolate;padding-top:18px}
.scene{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.scene svg{position:absolute;inset:0;width:100%;height:100%}
.arena>.hpt,.arena>.hp,.arena>.crowd{position:relative;z-index:2}
.hpt{text-shadow:0 1px 4px #000}
.crowd{background:rgba(8,5,16,.5);border-radius:14px;padding:8px 4px}
.beam{transform-origin:50% 0;animation:bm 6s ease-in-out infinite alternate}
@keyframes bm{from{opacity:.35}to{opacity:.8}}
.moon{animation:mn 5s ease-in-out infinite alternate}
@keyframes mn{to{opacity:.75}}
.cloud{animation:cl 40s linear infinite}
@keyframes cl{from{transform:translateX(-120px)}to{transform:translateX(520px)}}
.pt{position:absolute;border-radius:50%;opacity:0;animation:rise var(--d) linear var(--w) infinite}
.pt.fall{border-radius:60% 0 60% 0;animation-name:fall}
@keyframes rise{0%{transform:translate(0,0);opacity:0}15%{opacity:.9}100%{transform:translate(var(--dx),-420px);opacity:0}}
@keyframes fall{0%{transform:translate(0,-20px) rotate(0);opacity:0}15%{opacity:.9}100%{transform:translate(var(--dx),430px) rotate(300deg);opacity:0}}
.ph{width:46px;height:5px;border-radius:3px;background:rgba(255,255,255,.14);margin:3px auto 0;overflow:hidden}
.ph i{display:block;height:100%;width:100%;background:#4ade80;transition:width .3s,background .3s}
.ring{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;border:4px solid #ff9a3d;box-shadow:0 0 22px #ff7a3a,inset 0 0 22px #ff7a3a;z-index:3;pointer-events:none;animation:rg .9s ease-out forwards}
@keyframes rg{from{transform:scale(1);opacity:1}to{transform:scale(16);opacity:0}}
.aflash{position:absolute;inset:0;z-index:4;pointer-events:none;background:rgba(255,56,96,.38);opacity:0}
.aflash.go{animation:af .6s ease-out}
@keyframes af{0%{opacity:0}20%{opacity:1}100%{opacity:0}}
.hurt{animation:hurt .45s}
@keyframes hurt{20%{transform:translateX(-6px);filter:brightness(2) saturate(2)}50%{transform:translateX(6px)}80%{transform:translateX(-3px)}}
.dmg.foe{color:#ff6b86}
/* ───── إضافات تشغيلية (بدون تغيير الشكل) ───── */
:root{--gold-dim:#8a6d24;--text-dim:#9a8fa8}
.wrap{padding-bottom:110px}
.top .nvbtn{width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,56,96,.5);background:rgba(20,10,24,.75);color:var(--red)}
.topr{display:flex;gap:6px;align-items:center}
button.live{font-family:inherit;cursor:pointer;line-height:1.4}
#pbell[hidden]{display:none}
.boss{overflow:hidden}
.bs-flash{position:absolute;inset:0;background:#ff3860;opacity:0;pointer-events:none}
.bs-rage{display:inline-block;font-size:11px;font-weight:800;color:#fff;background:#ff3860;border-radius:20px;padding:1px 9px;margin-inline-start:6px}
.bs-rage[hidden]{display:none}
.hpt b{font-size:13px}
.pl .mh{font-family:'Oswald',sans-serif;font-size:9px;color:var(--dim);direction:ltr;margin-top:1px}
.bs-sel{width:100%;margin-top:12px;padding:11px;border-radius:12px;background:rgba(20,10,24,.82);color:#fff;border:1px solid rgba(255,255,255,.14);font-family:'Cairo',sans-serif;font-size:14px}
.btn{position:relative;overflow:hidden}
.btn:disabled{opacity:.55}
.bs-cd{position:absolute;bottom:0;right:0;height:4px;width:0;background:#fff;opacity:.85}
.bs-resp{text-align:center;margin:10px 0 0;padding:10px;border-radius:12px;background:rgba(20,10,24,.82);border:1px dashed rgba(240,192,74,.5);color:var(--gold);font-weight:800;font-size:14px}
.bs-resp[hidden]{display:none}
.gp-msg{text-align:center;font-size:14px;line-height:1.8;margin:10px 0 0;padding:9px;border-radius:12px;white-space:pre-wrap}
.gp-msg[hidden]{display:none}
.gp-msg.bad{color:#ff8aa0;background:rgba(255,56,96,.12)}.gp-msg.good{color:#7dffb0;background:rgba(60,255,140,.1)}.gp-msg.warn{color:var(--gold);background:rgba(240,192,74,.1)}
.mini{position:relative}
.row.me .bn span{color:var(--gold)}
.row.act .mini::after{content:'';position:absolute;right:-2px;bottom:-2px;width:9px;height:9px;border-radius:50%;background:#4ade80;border:1.5px solid #140a18;animation:bsaura 1.2s ease-in-out infinite alternate}
.lb-empty{text-align:center;color:var(--dim);font-size:13px;padding:8px}
.lbh span{text-align:left;color:#7dffb0}
@keyframes bsaura{from{opacity:.55;transform:scale(.92)}to{opacity:1;transform:scale(1.08)}}
@keyframes bsrage{0%,100%{box-shadow:0 0 0 rgba(255,56,96,0)}50%{box-shadow:0 0 36px rgba(255,56,96,.8)}}
@keyframes bsin{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.bs-slash{position:absolute;width:120px;height:120px;pointer-events:none;opacity:0;z-index:6}
.bs-slash i{position:absolute;left:-10px;top:50%;width:140px;height:5px;border-radius:3px;background:linear-gradient(90deg,transparent,#fff,transparent);box-shadow:0 0 12px 3px #ffe08a;transform:rotate(-38deg)}
.bs-slash i+i{transform:rotate(-38deg) translateY(16px);opacity:.7}
.bs-sp{position:absolute;width:6px;height:6px;border-radius:50%;background:#ffd24a;z-index:6;pointer-events:none;box-shadow:0 0 8px 2px #ffb300}
.bs-ring{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:3px solid rgba(255,150,60,.9);box-shadow:0 0 14px rgba(255,120,40,.8);pointer-events:none;z-index:2}
.bs-dmg{position:absolute;font-family:'Oswald',sans-serif;font-weight:700;pointer-events:none;white-space:nowrap;text-shadow:0 0 8px var(--red),0 2px 0 #000;z-index:7}
.fol .ff{position:absolute;inset:0;background:#ff2a4a;opacity:0;pointer-events:none;mix-blend-mode:screen;border-radius:10px}
.fol .fi{position:relative;overflow:hidden}
.bs-msg{background:rgba(20,10,24,.82);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px 14px;margin-top:10px;font-size:14px;line-height:1.9;animation:bsin .35s ease-out}
.bs-msg.pub{border-color:rgba(255,56,96,.35)}
.bs-msg b.t{display:block;color:var(--gold);font-weight:900;margin-bottom:2px}
.bs-msg .sec{color:var(--gold);font-weight:800;margin-top:8px}
.bs-msg .sep{border:0;border-top:1px dashed rgba(255,255,255,.14);margin:8px 0}
.bs-msg .ln{white-space:pre-wrap}
.bs-img{height:120px;border-radius:10px;background:#10162a center/cover no-repeat;margin-bottom:8px}
.bs-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.bs-chips span{font-size:12.5px;padding:2px 10px;border-radius:14px;background:rgba(255,56,96,.1);border:1px solid rgba(255,56,96,.35);color:#ffb3c2}
.bs-h{text-align:center;font-weight:800;color:var(--dim);margin:22px 0 4px;font-size:15px}
.bs-num{font-family:'Oswald',sans-serif;direction:ltr;font-size:14px;color:var(--dim)}
.bs-res{margin-top:18px;background:rgba(20,10,24,.82);border:1px solid rgba(240,192,74,.5);border-radius:18px;padding:16px}
.bs-res h3{text-align:center;color:var(--gold);font-size:18px;font-weight:900;margin-bottom:6px}
.bs-rk{border-top:1px dashed rgba(255,255,255,.14);padding:10px 0;line-height:1.9;font-size:14px}
.bs-rk .sec{color:var(--gold);font-weight:800}
.bs-rk .who2{font-weight:900;color:#fff;font-size:15px}
.bnav{position:fixed;bottom:calc(10px + env(safe-area-inset-bottom,0px));left:14px;right:14px;max-width:492px;margin:0 auto;z-index:40;display:flex;justify-content:space-around;padding:8px;border-radius:18px;background:rgba(11,7,16,.9);border:1px solid rgba(255,56,96,.35);backdrop-filter:blur(8px)}
.bnav a{font-weight:800;font-size:12px;color:var(--dim);text-align:center;text-decoration:none;padding:4px 8px;font-family:'Cairo',sans-serif}
.bnav a.on{color:var(--gold)}
.bnav i{display:block;font-style:normal;font-size:20px}
@media (prefers-reduced-motion:reduce){.fol,.boss{animation:none!important}}
`

function bossPageHTML({ viewer, code, data }) {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
${TITLES.HEAD}${PWA.HEAD}${NOTIFY.HEAD}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>هجوم الزعيم</title>
<link rel="manifest" href="/manifest.webmanifest?c=${esc(code)}">
<meta name="theme-color" content="#0b0710">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${BOSS_CSS}</style>
</head>
<body>
<canvas id="bg"></canvas><div class="mist"></div>
<div class="toast" id="toast"></div>
<div class="wrap">
  <div class="top">${NAV_BTN}<span class="ttl">هجوم الزعيم</span><span class="topr"><button type="button" class="live" id="vmute" aria-label="كتم/تشغيل أصوات الزعماء">🔊</button><button type="button" class="live" id="pbell" aria-label="تفعيل/تعطيل إشعار ظهور الزعيم" aria-pressed="false" hidden>🔕</button><span class="live" id="live">متصل <b id="cnt">0</b></span></span></div>
  ${navDrawerHTML(code, viewer.csrf, 'boss', viewer.name)}
  <div class="themes" id="themes"><button type="button" class="th on">قلعة الظلام</button><button type="button" class="th">بركان</button><button type="button" class="th">ساكورا الليل</button></div>
  <div class="arena" id="arena"><div class="scene" id="scene"></div><div class="aflash" id="aflash"></div>
    <div class="bossbox" id="bossbox"><div class="boss" id="fboss"><div class="bs-flash" id="flash"></div></div><div id="fols"></div></div>
    <div class="hpt"><span><span id="bn">الزعيم</span><span class="bs-rage" id="rage" hidden>غضب</span></span><b id="bhpt"></b></div>
    <div class="hp"><i id="bhp"></i></div>
    <div class="crowd" id="crowd"><div class="pl me" id="mecell" style="--h:45"><div class="av" id="fme"></div><div class="nm" id="fmen">أنت</div><div class="ph"><i id="mhp"></i></div><div class="mh" id="mhpt"></div></div></div>
  </div>
  <select class="bs-sel" id="sel" aria-label="اختيار الشخصية"></select>
  <div class="bs-resp" id="resp" hidden></div>
  <div class="gp-msg" id="msg" hidden></div>
  <button class="btn" id="go" type="button"><span id="lbl">هجوم</span><div class="bs-cd" id="cd"></div></button>
  <div class="lb">
    <div class="lbh">الضرر على هذا الزعيم<span id="lbn"></span></div>
    <div class="rows" id="lbrows"></div>
  </div>
  <div id="log"></div>
  <div id="resbox" hidden></div>
  <div class="bs-h">أحداث الزعيم العامة</div>
  <div id="pub"></div>
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

  function toast(t){ var e=$('toast'); e.textContent=t; e.classList.add('on'); clearTimeout(toast._t); toast._t=setTimeout(function(){ e.classList.remove('on'); },2200); }
  function hueOf(name){ var h=0,s=String(name||''); for(var i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))%360; } return h; }

  var c=document.getElementById('bg'),x=c.getContext('2d'),W,H,P=[];
  function rs(){W=c.width=innerWidth;H=c.height=innerHeight}rs();addEventListener('resize',rs);
  for(var i=0;i<50;i++)P.push({x:Math.random(),y:Math.random(),r:Math.random()*1.7+.4,s:Math.random()*.0005+.0002,t:Math.random()*6});
  (function tk(){x.clearRect(0,0,W,H);P.forEach(function(p,i){p.y-=p.s;p.t+=.04;if(p.y<0)p.y=1;x.globalAlpha=.3+.3*Math.sin(p.t);x.fillStyle=i%4?'#ff7a96':'#f0c04a';x.beginPath();x.arc(p.x*W,p.y*H,p.r,0,6.3);x.fill()});requestAnimationFrame(tk)})();
var TH=[
{sky:['#120d33','#4a2a78','#e98a4b'],orb:'#fff3c4',orbx:300,orby:70,mt:'#2a1d54',mt2:'#1d1540',ground:'#0d1a12',pt:'#ffe38a',ptn:20,dir:'rise',beam:'#ffd98a',sil:'castle'},
{sky:['#1a0505','#6b1a0a','#ff6a1f'],orb:'#ffb36b',orbx:90,orby:90,mt:'#3a0f0a',mt2:'#250907',ground:'#1a0a08',pt:'#ff8a3d',ptn:26,dir:'rise',beam:'#ff7a3a',sil:'volcano'},
{sky:['#1b1038','#6a3a8a','#ffb4c8'],orb:'#ffffff',orbx:310,orby:66,mt:'#3a2358',mt2:'#241437',ground:'#1a1024',pt:'#ffc2d6',ptn:22,dir:'fall',beam:'#ffd6e6',sil:'torii'}
];
function silhouette(t,c){
  if(t==='castle')return '<g fill="'+c+'"><rect x="40" y="170" width="30" height="80"/><polygon points="36,170 55,135 74,170"/><rect x="95" y="150" width="46" height="100"/><polygon points="90,150 118,100 146,150"/><rect x="170" y="185" width="26" height="65"/><polygon points="166,185 183,155 200,185"/><rect x="60" y="215" width="120" height="35"/></g><g fill="#ffd98a"><rect x="112" y="170" width="5" height="9"/><rect x="123" y="190" width="5" height="9"/><rect x="50" y="195" width="4" height="8"/></g>';
  if(t==='volcano')return '<polygon points="230,250 300,110 330,110 410,250" fill="'+c+'"/><polygon points="296,112 314,150 330,112" fill="#ff5a1f" opacity=".85"/><path d="M314 150 L305 215 L322 250" stroke="#ff8a3d" stroke-width="4" fill="none" opacity=".8"/>';
  return '<g fill="'+c+'"><rect x="258" y="140" width="9" height="110"/><rect x="333" y="140" width="9" height="110"/><rect x="246" y="136" width="108" height="9" rx="2"/><rect x="254" y="156" width="92" height="6"/></g><g fill="#ff5a7c"><rect x="256" y="148" width="5" height="4"/></g>';
}
function setTheme(i){
  var t=TH[i],sc=document.getElementById('scene');
  document.querySelectorAll('.th').forEach(function(b,k){b.classList.toggle('on',k===i)});
  var stars='';for(var k=0;k<22;k++){stars+='<circle cx="'+(Math.round(Math.random()*400))+'" cy="'+(Math.round(Math.random()*130))+'" r="'+(Math.random()*1.2+.4).toFixed(1)+'" fill="#fff" opacity=".75"/>'}
  sc.innerHTML='<svg viewBox="0 0 400 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+t.sky[0]+'"/><stop offset=".55" stop-color="'+t.sky[1]+'"/><stop offset="1" stop-color="'+t.sky[2]+'"/></linearGradient><radialGradient id="ob"><stop offset="0" stop-color="'+t.orb+'" stop-opacity=".95"/><stop offset=".35" stop-color="'+t.orb+'" stop-opacity=".25"/><stop offset="1" stop-color="'+t.orb+'" stop-opacity="0"/></radialGradient><linearGradient id="bmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+t.beam+'" stop-opacity=".55"/><stop offset="1" stop-color="'+t.beam+'" stop-opacity="0"/></linearGradient><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+t.ground+'"/><stop offset="1" stop-color="#05030a"/></linearGradient></defs>'
  +'<rect width="400" height="420" fill="url(#sk)"/>'+stars
  +'<circle class="moon" cx="'+t.orbx+'" cy="'+t.orby+'" r="90" fill="url(#ob)"/><circle cx="'+t.orbx+'" cy="'+t.orby+'" r="26" fill="'+t.orb+'"/>'
  +'<g class="cloud" fill="#fff" opacity=".07"><ellipse cx="0" cy="60" rx="70" ry="10"/><ellipse cx="40" cy="52" rx="40" ry="9"/></g>'
  +'<path d="M0 230 L55 175 L110 215 L170 160 L235 220 L300 170 L360 215 L400 180 L400 420 L0 420Z" fill="'+t.mt+'"/>'
  +'<g transform="translate(0,0)">'+silhouette(t.sil,t.mt2)+'</g>'
  +'<path d="M0 262 Q100 235 200 258 T400 250 L400 420 L0 420Z" fill="'+t.mt2+'"/>'
  +'<polygon class="beam" points="170,0 230,0 330,300 70,300" fill="url(#bmg)"/>'
  +'<rect y="300" width="400" height="120" fill="url(#gr)"/>'
  +'<rect width="400" height="420" fill="none"/></svg>';
  for(var k=0;k<t.ptn;k++){
    var d=document.createElement('i');d.className='pt'+(t.dir==='fall'?' fall':'');
    var sz=Math.random()*4+3;
    d.style.cssText='left:'+(Math.random()*100)+'%;'+(t.dir==='fall'?'top:0;':'bottom:0;')+'width:'+sz+'px;height:'+sz+'px;background:'+t.pt+';box-shadow:0 0 8px '+t.pt+';--d:'+(5+Math.random()*6)+'s;--w:'+(-Math.random()*8)+'s;--dx:'+((Math.random()-.5)*60)+'px';
    sc.appendChild(d);
  }
}


  document.querySelectorAll('.th').forEach(function(b,k){ b.onclick=function(){ setTheme(k); try{ localStorage.setItem('bossTheme',String(k)); }catch(e){} }; });
  var th0=0; try{ th0=Number(localStorage.getItem('bossTheme'))||0; }catch(e){} if(th0<0||th0>2) th0=0; setTheme(th0);

  // ───── 🔊 أصوات الزعماء (كتم/تشغيل محفوظ بالمتصفح) ─────
  var VOICES={}, vMuted=false, vAud=null, vLast=null;
  try{ vMuted=localStorage.getItem('bossMute')==='1'; }catch(e){}
  function vBtn(){ var b=$('vmute'); if(b) b.textContent=vMuted?'🔇':'🔊'; }
  vBtn();
  (function(){ var b=$('vmute'); if(!b) return;
    b.addEventListener('click',function(){
      vMuted=!vMuted; try{ localStorage.setItem('bossMute',vMuted?'1':'0'); }catch(e){}
      if(vMuted && vAud){ try{ vAud.pause(); }catch(e){} }
      vBtn();
    });
  })();

  // ───── 🔔 إشعار ظهور الزعيم للهاتف (Web Push) — الجرس بجانب الصوت للتفعيل/التعطيل ─────
  (function(){
    var b=$('pbell'); if(!b) return;
    var KEY=null, busy=false, on=false;
    var okSupport=('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window);
    function paint(){ b.textContent=on?'🔔':'🔕'; b.title=on?'إشعار ظهور الزعيم: مفعّل':'إشعار ظهور الزعيم: معطّل'; b.setAttribute('aria-pressed',on?'true':'false'); }
    function b64(s){ var p='='.repeat((4-s.length%4)%4), r=(s+p).replace(/-/g,'+').replace(/_/g,'/'), raw=atob(r), a=new Uint8Array(raw.length); for(var i=0;i<raw.length;i++) a[i]=raw.charCodeAt(i); return a; }
    function post(url,body){ body.csrf=CSRF; return fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){ return r.json().catch(function(){ return {ok:false}; }); }); }
    function sync(){
      navigator.serviceWorker.getRegistration('/').then(function(reg){ return reg?reg.pushManager.getSubscription():null; }).then(function(sub){
        if(!sub||Notification.permission!=='granted') return;
        return post('/push/state',{endpoint:sub.endpoint}).then(function(j){ on=!!(j&&j.ok&&j.on); paint(); });
      }).catch(function(){});
    }
    function enable(){
      if(Notification.permission==='denied'){ toast('الإشعارات محظورة من إعدادات المتصفح'); return Promise.resolve(); }
      return Notification.requestPermission().then(function(p){
        if(p!=='granted'){ toast('لم تسمح بالإشعارات'); return; }
        return navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(function(){ return navigator.serviceWorker.ready; }).then(function(reg){
          return reg.pushManager.getSubscription().then(function(s){ return s||reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(KEY)}); });
        }).then(function(sub){ return post('/push/subscribe',{sub:sub.toJSON()}); }).then(function(j){
          if(j&&j.ok){ on=true; toast('تم تفعيل إشعار ظهور الزعيم'); } else { toast((j&&j.message)||'تعذّر التفعيل'); }
        });
      });
    }
    function disable(){
      return navigator.serviceWorker.getRegistration('/').then(function(reg){ return reg?reg.pushManager.getSubscription():null; }).then(function(sub){
        if(!sub){ on=false; return; }
        return post('/push/unsubscribe',{endpoint:sub.endpoint}).then(function(){ return sub.unsubscribe(); }).then(function(){ on=false; toast('تم إيقاف إشعار الزعيم'); });
      });
    }
    b.addEventListener('click',function(){
      if(busy) return;
      if(!okSupport){ toast(/iPhone|iPad|iPod/i.test(navigator.userAgent)?'على الآيفون: أضف الموقع للشاشة الرئيسية ثم افتحه منها':'متصفحك لا يدعم الإشعارات'); return; }
      busy=true;
      (on?disable():enable()).catch(function(){ toast('تعذّر تغيير الإشعارات'); }).then(function(){ busy=false; paint(); });
    });
    fetch('/push/key',{credentials:'same-origin'}).then(function(r){ return r.json(); }).then(function(j){
      if(!j||!j.ok||!j.key) return;
      KEY=j.key; b.hidden=false; paint();
      if(okSupport) sync();
    }).catch(function(){});
  })();
  var vReady=false, vPend=null, vIntro={}, vFirstAt=0, vFirstName='', VFIRST_MS=30000;
  fetch('/boss-voice/manifest.json').then(function(r){ return r.json(); }).then(function(j){ VOICES=j||{}; }).catch(function(){}).then(function(){ vReady=true; if(S&&S.boss) vCheck(S.boss); });
  function vPlay(name,slot,retry){
    if(vMuted) return;
    var l=VOICES[name], u=l&&l[slot-1]; if(!u) return;
    try{ if(vAud) vAud.pause(); vAud=new Audio(u); var p=vAud.play(); if(p&&p.catch) p.catch(function(){ if(retry) vPend={name:name,slot:slot}; }); }catch(e){}
  }
  // المتصفح قد يمنع التشغيل قبل أول لمسة: نحتفظ بصوت الظهور ونشغّله عند أول لمسة للصفحة
  function vUnlock(){ if(!vPend) return; var x=vPend; vPend=null; vPlay(x.name,x.slot,false); }
  ['pointerdown','touchstart','keydown'].forEach(function(ev){ document.addEventListener(ev,vUnlock,{passive:true}); });
  // هل سمع هذا المتصفح صوت ظهور هذا الزعيم؟ (اسم الزعيم يتكرر كل 10 زعماء، فنعتبره جديداً بعد 3 ساعات)
  function vIntroDone(name){
    var t=vIntro[name]||0;
    try{ t=Math.max(t,Number(localStorage.getItem('bossV1:'+name))||0); }catch(e){}
    return Date.now()-t<3*3600*1000;
  }
  function vIntroMark(name){
    vIntro[name]=Date.now();
    try{ localStorage.setItem('bossV1:'+name,String(vIntro[name])); }catch(e){}
  }
  // 1=أول هجوم على الزعيم (للجميع، ومن يدخل خلال 30 ثانية منه يسمعه مرة وحدة، وأيضاً عند ضغطه هجوم داخل النافذة) · 2=دم 75% · 3=ظهور الأتباع · 4=دم 10%
  function vCheck(b){
    if(!b) return;
    var dead=!!b.finished||b.hp<=0, p=b.maxHp>0?b.hp/b.maxHp:0, fol=(b.followers||[]).length>0, L=vLast;
    vLast={name:b.name,p:p,fol:fol,dead:dead};
    // وقت أول هجوم بساعة المتصفح (نحدّثه مع كل حالة من السيرفر) لنعرف هل ما زلنا بنافذة الصوت الأول
    if(b.firstHitAgoMs!=null){ vFirstAt=Date.now()-b.firstHitAgoMs; vFirstName=b.name; }
    if(dead||!vReady) return;
    var l1=VOICES[b.name]&&VOICES[b.name][0];
    // صوت 1: لمن يكون داخل الصفحة وقت أول هجوم، أو يدخل خلال 30 ثانية منه (بعدها لا يُشغَّل لأحد)
    var ago=(b.firstHitAgoMs==null)?null:b.firstHitAgoMs;
    var seen=!!(L&&!L.dead&&L.name===b.name&&L.p>=1&&p<1);
    if(l1 && p<1 && !vIntroDone(b.name) && (ago==null?seen:ago<=VFIRST_MS)){ vIntroMark(b.name); vPlay(b.name,1,true); return; }
    if(!L||L.dead||L.name!==b.name) return;
    if(L.p>0.10 && p<=0.10){ vPlay(b.name,4); return; }
    if(!L.fol && fol){ vPlay(b.name,3); return; }
    if(L.p>0.75 && p<=0.75){ vPlay(b.name,2); return; }
  }

  // 🔊 ضغط «هجوم» = لمسة من المستخدم (المتصفح يسمح بالصوت): لو لسه داخل 30 ثانية من أول هجوم ولم يسمع الصوت الأول، يشغَّل له الآن
  function vOnAttackClick(){
    var b=S&&S.boss; if(!b||b.finished||!vReady||vMuted) return;
    var l1=VOICES[b.name]&&VOICES[b.name][0];
    if(!l1||vIntroDone(b.name)) return;
    if(vFirstName===b.name && vFirstAt && Date.now()-vFirstAt<=VFIRST_MS){ vIntroMark(b.name); vPlay(b.name,1,false); }
  }

  // ───── عرض الحالة ─────
  function renderBoss(b){
    if(!b){ $('bn').textContent='لا يوجد زعيم'; $('bhpt').textContent=''; $('bhp').style.width='0%'; clearFol(); return; }
    $('bn').textContent=b.name; img($('fboss'),b.img);
    $('rage').hidden=!b.enraged;
    var sameBoss=(lastBossName===b.name && !b.finished && b.hp>0);
    bossDrop=(sameBoss && lastBossHp!=null)?Math.max(0,lastBossHp-b.hp):0;
    lastBossName=b.name; lastBossHp=b.hp;
    collectFol=(polling && sameBoss);
    if(bossDeadShown && !b.finished && b.hp>0){ bossDeadShown=false; $('fboss').getAnimations().forEach(function(a){ if(!(window.CSSAnimation && a instanceof CSSAnimation)) a.cancel(); }); }
    $('bhp').style.width=pct(b.hp,b.maxHp)+'%';
    $('bhpt').textContent=fmt(b.hp)+' / '+fmt(b.maxHp);
    renderFollowers(b.followers||[]);
    $('fboss').classList.toggle('shield',Object.keys(fmap).length>0);
    vCheck(b);
  }

  // ───── الأتباع: يظهرون بجوانب الزعيم (2.5D) — نزول من فوق / HP / موت مثل موت الزعيم ─────
  var fmap={}, folInit=false, collectFol=false, polling=false, folHits=[], lastBossName=null, lastBossHp=null, bossDrop=0;
  function folKeys(list){ var occ={}; return list.map(function(x){ occ[x.name]=(occ[x.name]||0)+1; return x.name+'#'+occ[x.name]; }); }
  function folNode(key){ return fmap[key]?fmap[key].fg:null; }
  function clearFol(){ Object.keys(fmap).forEach(function(k){ fmap[k].el.remove(); delete fmap[k]; }); }

  // هبوط تابع: موجة صدمة + شرارات + اهتزاز خفيف للساحة
  function landFx(w){
    var A=$('arena'), a=A.getBoundingClientRect(), r=w.getBoundingClientRect();
    var cx=r.left-a.left+r.width/2, cy=r.bottom-a.top-4;
    var ring=el('i','bs-ring'); ring.style.left=cx+'px'; ring.style.top=cy+'px'; A.appendChild(ring);
    ring.animate([{transform:'scale(1,.35)',opacity:.9},{transform:'scale(7,2.4)',opacity:0}],{duration:620,easing:'ease-out'}).onfinish=function(){ ring.remove(); };
    for(var i=0;i<8;i++){
      var p=el('i','bs-sp'), sz=3+Math.random()*3;
      p.style.left=cx+'px'; p.style.top=cy+'px'; p.style.width=sz+'px'; p.style.height=sz+'px'; p.style.background='#ffb36b'; p.style.boxShadow='0 0 6px 1px #ff7a1f';
      A.appendChild(p);
      var dx=(i%2?1:-1)*(14+Math.random()*34), dy=-(10+Math.random()*28);
      p.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+(dx*.6)+'px,'+dy+'px) scale(.9)',opacity:1,offset:.45},{transform:'translate('+dx+'px,'+(dy+30)+'px) scale(.2)',opacity:0}],{duration:620+Math.random()*200,easing:'ease-out'}).onfinish=(function(q){ return function(){ q.remove(); }; })(p);
    }
    A.animate([{transform:'translateY(0)'},{transform:'translateY(3px)'},{transform:'translateY(-2px)'},{transform:'translateY(0)'}],{duration:260});
  }
  // موت تابع: وميض ثم يتبخر لجمر يتصاعد
  function dieFx(n){
    var A=$('arena'), a=A.getBoundingClientRect(), r=n.el.getBoundingClientRect();
    var cx=r.left-a.left+r.width/2, cy=r.top-a.top+r.height/2;
    var ff=n.fg.querySelector('.ff'); if(ff) ff.animate([{opacity:0},{opacity:.95,offset:.25},{opacity:.5}],{duration:900,fill:'forwards'});
    for(var i=0;i<16;i++){
      var p=el('i','bs-sp'), c=(i%3===0)?'#ffd24a':'#ff9a3d', sz=3+Math.random()*4;
      p.style.left=cx+'px'; p.style.top=cy+'px'; p.style.width=sz+'px'; p.style.height=sz+'px'; p.style.background=c; p.style.boxShadow='0 0 8px 2px '+c;
      A.appendChild(p);
      var dx=(Math.random()-.5)*r.width*1.6, dy=-(30+Math.random()*80);
      p.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+dx+'px,'+dy+'px) scale(.2)',opacity:0}],{duration:800+Math.random()*500,delay:Math.random()*150,easing:'ease-out',fill:'both'}).onfinish=(function(q){ return function(){ q.remove(); }; })(p);
    }
  }
  function renderFollowers(list){
    var A=$('arena'), keys=folKeys(list), alive={}, animate=folInit, dying=[], spawned=0, had=Object.keys(fmap).length>0;
    list.forEach(function(x,i){
      var k=keys[i]; alive[k]=1;
      var n=fmap[k];
      if(!n){
        var used={}; Object.keys(fmap).forEach(function(q){ used[fmap[q].slot]=1; }); var sl=0; while(used[sl]) sl++;
        var w=el('div','fol');
        w.innerHTML='<div class="fi"><div class="ff"></div></div><div class="fh"><i></i></div><div class="fn"></div>';
        w.style[(sl%2)?'right':'left']=(4+Math.floor(sl/2)*76)+'px';
        w.style.animationDelay=(spawned*.15)+'s';
        n={el:w,fg:w.querySelector('.fi'),bar:w.querySelector('.fh i'),nm:w.querySelector('.fn'),max:Math.max(1,x.hp||1),slot:sl,hp:(x.hp||0)};
        fmap[k]=n; $('fols').appendChild(w); spawned++;
        if(animate){ setTimeout((function(ww){ return function(){ if(ww.isConnected) landFx(ww); }; })(w), spawned*150+560); }
      }
      if((x.hp||0)>n.max) n.max=x.hp;
      if(collectFol && animate && n.hp!=null && (x.hp||0)<n.hp){ folHits.push({node:n.fg,dmg:n.hp-(x.hp||0)}); }
      n.hp=(x.hp||0);
      if(x.img) img(n.fg,x.img);
      n.nm.textContent=x.name;
      n.el.title=x.name+' — '+fmt(x.hp)+' HP';
      n.bar.style.width=pct(x.hp,n.max)+'%';
    });
    Object.keys(fmap).forEach(function(k){
      if(alive[k]) return;
      var n=fmap[k]; delete fmap[k];
      if(!animate){ n.el.remove(); return; }
      if(collectFol && n.hp>0){ folHits.push({node:n.fg,dmg:n.hp}); }
      dieFx(n);
      var an=n.el.animate([{transform:'translateY(0) scale(1)',opacity:1},{transform:'translateY(-6px) scale(1.14) rotate(-3deg)',opacity:1,offset:.22},{transform:'translateY(20px) scale(.4) rotate(14deg)',opacity:0}],{duration:700,easing:'ease-in',fill:'forwards'});
      dying.push(an.finished.then(function(){ n.el.remove(); }).catch(function(){ n.el.remove(); }));
    });
    folInit=true;
    if(animate && spawned) toast('ظهر الأتباع! اقضوا عليهم أولًا');
    if(animate && had && !Object.keys(fmap).length) toast('سقط كل الأتباع! الزعيم مكشوف');
    return Promise.all(dying);
  }

  // ضربة على تابع: شرارات + وميض أحمر + اهتزاز + رقم الضرر (نفس ضربة الزعيم)
  function hitFollower(node,dmg,crit){
    if(!node) return;
    var sh=crit?10:7;
    node.animate([{transform:'translateX(0) scale(1)'},{transform:'translateX('+(-sh)+'px) scale(.92)',offset:.2},{transform:'translateX('+sh+'px) scale(1.04)',offset:.5},{transform:'translateX('+(-sh/2)+'px) scale(.99)',offset:.75},{transform:'translateX(0) scale(1)'}],{duration:420});
    hitFx(node);
    var f=node.querySelector('.ff'); if(f) f.animate([{opacity:.65},{opacity:0}],{duration:380});
    floatNum(node,(crit?'🎯 ':'')+fmt(dmg),crit?'#f0c04a':'#ff5c7a',crit?30:22);
  }
  function crSetHp(n,d){ n.php=Math.max(8,Math.min(100,n.php-d)); n.hp.style.width=n.php+'%'; n.hp.style.background=n.php>55?'#4ade80':n.php>28?'#facc15':'#f87171'; }
  function renderMe(m){
    var p=pct(m.hp,m.maxHp), i=$('mhp');
    i.style.width=p+'%'; i.style.background=p>55?'#4ade80':p>28?'#facc15':'#f87171';
    $('mhpt').textContent=fmt(m.hp)+' / '+fmt(m.maxHp);
  }

  function curChar(){ var i=Number($('sel').value)||1; for(var k=0;k<S.characters.length;k++){ if(S.characters[k].index===i) return S.characters[k]; } return S.characters[0]||null; }
  function renderChar(){ var c=curChar(); if(!c) return; img($('fme'),c.img); $('fme').title=c.name; }

  function renderSel(){
    var s=$('sel'); s.innerHTML='';
    S.characters.forEach(function(c){ var o=el('option','','#'+c.index+' — '+c.name+(c.tier?' ['+c.tier+']':'')+' ('+fmt(c.power)+' PWR)'); o.value=String(c.index); s.appendChild(o); });
    renderChar();
  }
  function applyState(st){
    S.open=st.open; S.boss=st.boss; S.me=st.me; S.cooldownMs=st.cooldownMs;
    if(st.characters && st.characters.length){ S.characters=st.characters; }
    cdEnd=Date.now()+(st.cooldownMs||0);
    setResp(st.boss);
    polling=true;
    try{ renderBoss(st.boss); renderMe(st.me); if(st.board) renderBoard(st.board); }
    finally{ polling=false; collectFol=false; }
  }

  // ───── الحشد (أسفل الساحة) + 🏆 ترتيب الضرر المباشر ─────
  var LBH=44, lbMap={};
  var crMap={}, crInit=false;

  function crowdHit(av,dd){
    var a=av.getBoundingClientRect(), b=$('fboss').getBoundingClientRect();
    var dx=b.left+b.width/2-(a.left+a.width/2), dy=b.top+b.height*.6-(a.top+a.height/2);
    av.animate([{transform:'translate(0,0) scale(1)'},{transform:'translate('+dx+'px,'+dy+'px) scale(1.15)',offset:.45},{transform:'translate(0,0) scale(1)'}],{duration:520,easing:'ease-in-out'});
    setTimeout(function(){ shake($('fboss'),5); floatNum($('fboss'),fmt(dd),'#ffd24a',20); },230);
  }
  // اختيار ضربة تابع تخص هذا المهاجم (حسب الضرر، أو أول ضربة لو الزعيم ما نقص دمه)
  function pickFolHit(dd){
    if(!folHits.length) return null;
    var i=-1;
    for(var k=0;k<folHits.length;k++){ if(folHits[k].dmg===dd){ i=k; break; } }
    if(i<0 && bossDrop<=0) i=0;
    if(i<0) return null;
    return folHits.splice(i,1)[0];
  }
  // مهاجم آخر يضرب تابع: صورته تطير للتابع + شرارات + وميض + اهتزاز + رقم الضرر (مثل ضربة الزعيم)
  function crowdHitFol(av,h){
    var a=av.getBoundingClientRect(), b=h.node.getBoundingClientRect();
    var dx=b.left+b.width/2-(a.left+a.width/2), dy=b.top+b.height*.6-(a.top+a.height/2);
    av.animate([{transform:'translate(0,0) scale(1)'},{transform:'translate('+dx+'px,'+dy+'px) scale(1.15)',offset:.45},{transform:'translate(0,0) scale(1)'}],{duration:520,easing:'ease-in-out'});
    setTimeout(function(){ if(h.node.isConnected){ shake($('arena'),h.crit?5:3); hitFollower(h.node,h.dmg,!!h.crit); } },230);
  }
  // ضربات أتباع ما انربطت بمهاجم معين: نحركها بأي مهاجم من الحشد (أو مباشرة لو ما في حشد)
  function flushFolHits(){
    var list=folHits.splice(0), ks=Object.keys(crMap);
    list.forEach(function(h,i){
      setTimeout(function(){
        if(!h.node.isConnected) return;
        if(ks.length){ var c=crMap[ks[Math.floor(Math.random()*ks.length)]]; if(c){ crowdHitFol(c.av,h); return; } }
        shake($('arena'),3); hitFollower(h.node,h.dmg,false);
      },i*350);
    });
  }
  function renderCrowd(b){
    var box=$('crowd'); if(!box||!b||!b.crowd) return;
    var cn=$('cnt'); if(cn) cn.textContent=b.online||0;
    var occ={}, keep={}, first=!crInit, shown=0; crInit=true;
    b.crowd.forEach(function(r){
      if(r.me||shown>=9) return;
      occ[r.name]=(occ[r.name]||0)+1; var k=r.name+'#'+occ[r.name], n=crMap[k]; keep[k]=1; shown++;
      if(!n){
        var d=el('div','pl'); d.style.setProperty('--h',hueOf(r.name));
        d.innerHTML='<div class="av"></div><div class="nm"></div><div class="ph"><i></i></div>';
        box.appendChild(d); n={el:d,av:d.querySelector('.av'),nm:d.querySelector('.nm'),hp:d.querySelector('.ph i'),dmg:r.damage,php:100}; crMap[k]=n;
      }
      n.nm.textContent=r.name;
      if(r.img) n.av.style.backgroundImage="url('"+r.img+"')";
      var dd=r.damage-n.dmg; n.dmg=r.damage;
      if(!first && dd>0){ var fh=pickFolHit(dd); if(fh) crowdHitFol(n.av,fh); else crowdHit(n.av,dd); }
    });
    Object.keys(crMap).forEach(function(k){ if(!keep[k]){ crMap[k].el.remove(); delete crMap[k]; } });
  }
  setInterval(function(){ Object.keys(crMap).forEach(function(k){ var n=crMap[k]; if(n.php<100) crSetHp(n,-3); }); },1000);
  function renderBoard(b){
    renderCrowd(b);
    var box=$('lbrows'); if(!box||!b||!b.rows) return;
    $('lbn').textContent=(b.online>0?'🟢 '+b.online+' يهاجمون الآن':'')+(b.myRank?(b.online>0?' · ':'')+'ترتيبك #'+b.myRank:'');
    var emp=box.querySelector('.lb-empty');
    if(!b.rows.length){
      Object.keys(lbMap).forEach(function(k){ lbMap[k].el.remove(); delete lbMap[k]; });
      box.style.height='auto'; if(!emp) box.appendChild(el('div','lb-empty','لا أحد هاجم هذا الزعيم بعد')); return;
    }
    if(emp) emp.remove();
    box.style.height=(b.rows.length*LBH)+'px';
    var top=Math.max(1,b.rows[0].damage), keep={}, occ={};
    b.rows.forEach(function(r,i){
      occ[r.name]=(occ[r.name]||0)+1; var k=r.name+'#'+occ[r.name], n=lbMap[k]; keep[k]=1;
      if(!n){
        var w=el('div','row'); w.style.setProperty('--h',hueOf(r.name));
        w.innerHTML='<span class="rk"></span><span class="mini"></span><div class="bw"><div class="bn"><span></span><b>0</b></div><div class="bar"><i></i></div></div>';
        box.appendChild(w); w.style.transform='translateY('+(i*LBH)+'px)';
        n={el:w,k:w.querySelector('.rk'),m:w.querySelector('.mini'),nm:w.querySelector('.bn span'),d:w.querySelector('.bn b'),bar:w.querySelector('.bar i'),dmg:r.damage}; lbMap[k]=n;
      }
      n.el.style.transform='translateY('+(i*LBH)+'px)';
      n.el.className='row'+(r.me?' me':'')+(i<3?' r'+(i+1):'')+(r.active?' act':'');
      n.k.textContent=i+1; n.nm.textContent=(r.me?'أنت · ':'')+r.name; if(r.t&&window.TB)n.nm.insertAdjacentHTML('beforeend',TB(r.t,1)); n.d.textContent=fmt(r.damage); n.bar.style.width=(r.damage/top*100)+'%';
      if(r.img) n.m.style.backgroundImage="url('"+r.img+"')";
      if(r.damage>n.dmg){ n.d.animate([{transform:'scale(1.35)'},{transform:'scale(1)'}],{duration:500}); }
      n.dmg=r.damage;
    });
    Object.keys(lbMap).forEach(function(k){ if(!keep[k]){ lbMap[k].el.remove(); delete lbMap[k]; } });
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
  // مهاجمي: صورتي تطير نحو الهدف ثم ترجع (مثل المثال)
  function fly(av,target){
    var a=av.getBoundingClientRect(), b=target.getBoundingClientRect();
    var dx=(b.left+b.width/2)-(a.left+a.width/2), dy=(b.top+b.height*.7)-(a.top+a.height/2);
    return av.animate([{transform:'translate(0,0) scale(1)'},{transform:'translate('+dx+'px,'+dy+'px) scale(1.15)',offset:.45},{transform:'translate(0,0) scale(1)'}],{duration:520,easing:'ease-in-out'});
  }
  // ضربة الزعيم الفردية: الزعيم يندفع نحو الهدف (مثل المثال)
  function bossStrike(target){
    var bo=$('fboss'), a=target.getBoundingClientRect(), b=bo.getBoundingClientRect();
    var dx=(a.left+a.width/2)-(b.left+b.width/2), dy=(a.top+a.height/2)-(b.top+b.height/2);
    return bo.animate([{transform:'translate(0,0) scale(1)'},{transform:'translate(0,-14px) scale(1.06)',offset:.2},{transform:'translate('+(dx*.55)+'px,'+(dy*.55)+'px) scale(.9)',offset:.5},{transform:'translate(0,0) scale(1)'}],{duration:760,easing:'ease-in-out'});
  }
  function hurtAv(av){ av.classList.remove('hurt'); void av.offsetWidth; av.classList.add('hurt'); }
  // ضربة الزعيم الجماعية: حلقة نارية + وميض أحمر + الكل يتضرر (مثل المثال)
  function raidFx(drop){
    var A=$('arena'), ar=A.getBoundingClientRect(), b=$('fboss').getBoundingClientRect();
    $('fboss').animate([{transform:'scale(1)'},{transform:'scale(1.22) translateY(-10px)',offset:.35},{transform:'scale(1)'}],{duration:700,easing:'ease-in-out'});
    setTimeout(function(){
      var ring=el('div','ring'); ring.style.left=(b.left+b.width/2-ar.left)+'px'; ring.style.top=(b.top+b.height/2-ar.top)+'px';
      A.appendChild(ring); setTimeout(function(){ ring.remove(); },950);
      var af=$('aflash'); af.classList.remove('go'); void af.offsetWidth; af.classList.add('go');
      toast('ضربة جماعية!');
      var ks=Object.keys(crMap);
      [$('fme')].concat(ks.map(function(k){ return crMap[k].av; })).forEach(function(av,i){
        setTimeout(function(){
          hurtAv(av);
          if(i===0){ if(drop>0) floatNum(av,'-'+fmt(drop),'#ff6b86',22); }
          else crSetHp(crMap[ks[i-1]],14+Math.floor(Math.random()*10));
        },i*70);
      });
    },380);
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
  // وميض ضربة + شرارات فوق الهدف داخل الساحة
  function hitFx(target){
    if(!target) return;
    var box=$('arena'), a=box.getBoundingClientRect(), r=target.getBoundingClientRect();
    var cx=r.left-a.left+r.width/2, cy=r.top-a.top+r.height/2;
    var s=el('div','bs-slash'); s.style.left=(cx-60)+'px'; s.style.top=(cy-60)+'px'; s.appendChild(el('i','')); s.appendChild(el('i',''));
    box.appendChild(s);
    s.animate([{opacity:0,transform:'scale(.4)'},{opacity:1,transform:'scale(1)',offset:.3},{opacity:0,transform:'scale(1.15)'}],{duration:380}).onfinish=function(){ s.remove(); };
    for(var i=0;i<10;i++){
      var p=el('i','bs-sp'); p.style.left=cx+'px'; p.style.top=cy+'px'; box.appendChild(p);
      var ang=Math.random()*6.283, dist=30+Math.random()*40;
      p.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+Math.cos(ang)*dist+'px,'+Math.sin(ang)*dist+'px) scale(.2)',opacity:0}],{duration:520,easing:'ease-out'}).onfinish=(function(n){ return function(){ n.remove(); }; })(p);
    }
  }
  // زمجرة الزعيم بعد تلقي الضربة
  function roar(){ $('fboss').animate([{transform:'scale(1) rotate(0)'},{transform:'translateX(-16px) scale(1.09) rotate(-3deg)'},{transform:'scale(1) rotate(0)'}],{duration:480,easing:'ease-in-out'}); }

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
    if(ev.type==='follower_hit') return;
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
    if(ev.anim==='hit_me'){ var hb=bossStrike($('fme')); await wait(380); flash(); hurtAv($('fme')); if(ev.amount) floatNum($('fme'),'-'+fmt(ev.amount),'#ff6b86',22); await hb.finished; }
    else if(ev.anim==='ability'){ $('fboss').animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:600}); }
    else if(ev.anim==='buff'){ $('fboss').animate([{filter:'brightness(1)'},{filter:'brightness(1.8)'},{filter:'brightness(1)'}],{duration:600}); }
    else if(ev.anim==='kill'){ /* موت التابع يُعرض على بطاقته (renderFollowers) */ }
    else if(ev.anim==='enrage'){ toast('الزعيم غاضب!'); $('fboss').animate([{transform:'scale(1)'},{transform:'scale(1.15)'},{transform:'scale(1)'}],{duration:700}); $('fboss').style.animation='bsrage 1.2s 3'; setTimeout(function(){ $('fboss').style.animation=''; },3700); }
    else if(ev.anim==='raid'){ raidFx(ev.amount||0); }
    else if(ev.anim==='counter'){ var b=bossStrike($('fme')); await wait(380); flash(); hurtAv($('fme')); if(ev.amount) floatNum($('fme'),'-'+fmt(ev.amount),'#ff6b86',22); await b.finished; }
    else if(ev.anim==='player_dead'){ $('fme').animate([{opacity:1,filter:'grayscale(0)'},{opacity:.4,filter:'grayscale(1)'}],{duration:800,fill:'forwards'}); }
    else if(ev.anim==='boss_dead'){ bossDeadShown=true; toast('سقط الزعيم!'); await $('fboss').animate([{transform:'scale(1)',opacity:1},{transform:'scale(1.2)',opacity:.7,offset:.4},{transform:'scale(.6) rotate(8deg)',opacity:0}],{duration:1400,fill:'forwards'}).finished; }
    await wait(450);
  }

  async function playAttack(j){
    var ev=j.events||[], pre=[], post=[];
    ev.forEach(function(e){ (e.type==='ability'||e.type==='fx'?pre:post).push(e); });
    for(var i=0;i<pre.length;i++){ await playEvent(pre[i]); }

    var r=j.report, crit=!!r.crit;
    var isFol=(r.kind==='follower'), fnode=null;
    if(isFol){ var fk=folKeys(S.boss.followers||[])[0]; fnode=folNode(fk); }
    var l=fly($('fme'),fnode||$('fboss'));
    await wait(240);
    if(isFol){
      shake($('arena'),crit?5:3);
      hitFollower(fnode,r.damage,crit);
    } else {
      flash(); shake($('fboss'),crit?13:7); shake($('arena'),crit?5:3); hitFx($('fboss'));
      floatNum($('fboss'),(crit?'🎯 ':'')+fmt(r.damage),crit?'#f0c04a':'#ff5c7a',crit?30:22);
    }
    var st=j.state;
    if(!isFol && st.bossHp>0 && !post.length){ setTimeout(roar,520); }
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
    vOnAttackClick();
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
      busy=false; tick(); setTimeout(poll,900);
    })
    .catch(function(){
      clearTimeout(tm); busy=false;
      show('warn','لم يصلنا رد من السيرفر — قد يكون الهجوم تم. حدّث الصفحة للتأكد.');
      tick();
    });
  });
  $('sel').addEventListener('change',renderChar);
  // ───── ضربة لاعب آخر على تابع (حدث من السيرفر): صورته تطير للتابع + نفس تأثيرات الضربة ─────
  function findFolNode(name){
    var all=document.querySelectorAll('#fols .fol'), first=null;
    for(var i=0;i<all.length;i++){
      var fi=all[i].querySelector('.fi'), nm=all[i].querySelector('.fn');
      if(!fi) continue; if(!first) first=fi;
      if(nm && nm.textContent===name) return fi;
    }
    return first;
  }
  function playFolHitEv(e){
    var node=findFolNode(e.follower); if(!node) return;
    var h={node:node,dmg:e.amount||0,crit:!!e.crit}, av=null, ks=Object.keys(crMap);
    for(var i=0;i<ks.length;i++){ if(ks[i].indexOf(e.attacker+'#')===0){ av=crMap[ks[i]].av; break; } }
    if(!av && ks.length) av=crMap[ks[Math.floor(Math.random()*ks.length)]].av;
    if(av) crowdHitFol(av,h);
    else { shake($('arena'),h.crit?5:3); hitFollower(node,h.dmg,h.crit); }
  }
  // ───── أنيميشن الأحداث العامة لباقي اللاعبين (غير المهاجم) ─────
  async function animPublic(ev,drop){
    if(ev.anim==='raid'){
      raidFx(drop);
    }
    else if(ev.anim==='enrage'){ toast('الزعيم غاضب!'); $('fboss').animate([{transform:'scale(1)'},{transform:'scale(1.15)'},{transform:'scale(1)'}],{duration:700}); $('fboss').style.animation='bsrage 1.2s 3'; setTimeout(function(){ $('fboss').style.animation=''; },3700); }
    else if(ev.anim==='boss_dead'){ bossDeadShown=true; toast('سقط الزعيم!'); await $('fboss').animate([{transform:'scale(1)',opacity:1},{transform:'scale(1.2)',opacity:.7,offset:.4},{transform:'scale(.6) rotate(8deg)',opacity:0}],{duration:1400,fill:'forwards'}).finished; }
    await wait(450);
  }
  async function runPubQ(){
    if(pubRun) return; pubRun=true;
    try{ while(pubQ.length){ var x=pubQ.shift(); await animPublic(x.ev,x.drop); } } finally { pubRun=false; }
  }

  // ───── متابعة أحداث الزعيم العامة (Polling) ─────
  function poll(){
    if(document.hidden) return;
    var wasBusy=busy;
    fetch('/boss/state?since='+lastId,{credentials:'same-origin'})
    .then(function(r){ if(r.status===401){ location.href='/login?code='+CODE; return null; } return r.json(); })
    .then(function(j){
      if(!j||!j.ok) return;
      // أثناء أنيميشن هجومي: نحدّث لوحة الضرر فقط (بدون المساس بالزعيم/الدم المعروض)
      if(wasBusy||busy){ if(j.state&&j.state.board) renderBoard(j.state.board); return; }
      var keepChars=S.characters, hpBefore=(S.me&&S.me.hp)||0;
      applyState(j.state); S.characters=keepChars;
      var drop=Math.max(0,hpBefore-((S.me&&S.me.hp)||0)), fresh=[];
      (j.feed||[]).forEach(function(e){ var isNew=!(e.id&&seen[e.id]); addPub(e); if(isNew && e.type!=='results') fresh.push(e); });
      var hitEvs=fresh.filter(function(e){ return e.type==='follower_hit' && !e.mine; });
      if(hitEvs.length){ folHits.length=0; hitEvs.slice(-8).forEach(function(e,i){ setTimeout(function(){ playFolHitEv(e); },i*380); }); }
      else { flushFolHits(); }
      fresh.filter(function(e){ return e.type!=='follower_hit'; }).slice(-3).forEach(function(e){ if(e.anim==='raid'||e.anim==='enrage'||e.anim==='boss_dead'){ pubQ.push({ev:e,drop:(e.anim==='raid'?drop:0)}); if(e.anim==='raid') drop=0; } });
      runPubQ();
    }).catch(function(){});
  }

  S.characters=S.characters||[];
  setResp(S.boss);
  renderSel(); renderBoss(S.boss); renderMe(S.me); renderBoard(S.board); cdEnd=Date.now()+(S.cooldownMs||0);
  (D.feed||[]).filter(function(e){ return e.type!=='results'; }).forEach(function(e){ seen[e.id]=1; });
  (D.feed||[]).slice().reverse().forEach(function(e){ if(e.type!=='results' && e.type!=='follower_hit') addTo($('pub'),eventNode(e,true),12); });
  if(D.results) renderResults(D.results);
  tick(); setInterval(tick,500); pollTimer=setInterval(poll,3000);
})();
</script></body></html>`
}

// =====================================================================
// 🏆 صفحة أقوى اللاعبين  /u/:code/top
// الترتيب حسب مجموع power لكل شخصيات اللاعب (نفس حساب البوت)، أول 30 لاعب
// =====================================================================
function fmtInt(v) { return Math.round(Number(v) || 0).toLocaleString('en-US') }

const TOP_CSS = `
.tp{--tg:#f0c04a;--tgd:#8a6d24;--tt:#eef1f8;--td:#8891a3;--tl:#222a42;--silver:#c9d3e6;--bronze:#e0905a;max-width:760px;margin-inline:auto;padding:14px 16px 150px;position:relative;color:var(--tt);font-family:'Cairo',system-ui,sans-serif}
.tp *{box-sizing:border-box}
.tp-bg{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;background:#0a0d16}
.tp-bg i{position:absolute;border-radius:50%;filter:blur(70px);opacity:.55;will-change:transform}
.tp-bg i:nth-child(1){width:60vmax;height:60vmax;left:-20vmax;top:-22vmax;background:radial-gradient(circle,rgba(240,192,74,.38),transparent 65%);animation:tpDrift1 18s ease-in-out infinite alternate}
.tp-bg i:nth-child(2){width:56vmax;height:56vmax;right:-22vmax;top:8vh;background:radial-gradient(circle,rgba(124,77,255,.34),transparent 65%);animation:tpDrift2 22s ease-in-out infinite alternate}
.tp-bg i:nth-child(3){width:52vmax;height:52vmax;left:-10vmax;bottom:-24vmax;background:radial-gradient(circle,rgba(62,168,255,.28),transparent 65%);animation:tpDrift3 26s ease-in-out infinite alternate}
.tp-bg canvas{position:absolute;inset:0;width:100%;height:100%}
@keyframes tpDrift1{to{transform:translate(18vmax,12vmax) scale(1.15)}}
@keyframes tpDrift2{to{transform:translate(-16vmax,10vmax) scale(.9)}}
@keyframes tpDrift3{to{transform:translate(14vmax,-12vmax) scale(1.2)}}
.tp .topbar{margin-bottom:6px}
.tp-eb{text-align:center;font-family:'Oswald',sans-serif;letter-spacing:.45em;font-size:11px;color:var(--tgd);text-transform:uppercase;margin-top:14px}
.tp h1{text-align:center;margin:4px 0;font-size:clamp(34px,8vw,56px);font-weight:900;line-height:1.15;text-wrap:balance;background:linear-gradient(110deg,#fff6d8 20%,var(--tg) 40%,#fff 50%,var(--tg) 60%,#a9791f 80%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:tpShine 6s linear infinite}
@keyframes tpShine{to{background-position:-250% 0}}
.tp-sub{text-align:center;color:var(--td);font-size:14px;margin:0 0 14px}
.tp-orn{display:flex;align-items:center;justify-content:center;gap:10px;color:var(--tgd);margin:0 auto 10px;max-width:320px}
.tp-orn::before,.tp-orn::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--tgd))}
.tp-orn::after{transform:scaleX(-1)}
.tp-podium{display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:10px;align-items:end;direction:ltr;padding:34px 8px 22px;margin-inline:-8px;overflow:hidden}
.tp-slot{position:relative;direction:rtl;animation:tpRise .9s cubic-bezier(.2,.8,.2,1) both}
.tp-slot.r1{order:2;animation-delay:.25s}.tp-slot.r2{order:1;animation-delay:.05s}.tp-slot.r3{order:3;animation-delay:.15s}
@keyframes tpRise{from{opacity:0;transform:translateY(46px) scale(.92)}to{opacity:1;transform:none}}
.tp-rays{position:absolute;left:50%;top:38%;width:230%;aspect-ratio:1;transform:translate(-50%,-50%);z-index:0;pointer-events:none;background:repeating-conic-gradient(from 0deg,rgba(240,192,74,.20) 0 5deg,transparent 5deg 15deg);-webkit-mask-image:radial-gradient(circle,#000 0,transparent 60%);mask-image:radial-gradient(circle,#000 0,transparent 60%);animation:tpSpin 40s linear infinite}
@keyframes tpSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}
.tp-pc{--c:var(--tg);position:relative;z-index:1;border-radius:18px;border:2.5px solid transparent;overflow:hidden;background:linear-gradient(#0f1422,#0f1422) padding-box,conic-gradient(from var(--a,0deg),var(--c),#fff,var(--c),color-mix(in srgb,var(--c) 30%,#000),var(--c)) border-box;animation:tpRot 5s linear infinite,tpFloat 5.5s ease-in-out infinite,tpGlow 3.2s ease-in-out infinite}
.r2 .tp-pc{--c:var(--silver);animation-delay:0s,.6s,.4s}.r3 .tp-pc{--c:var(--bronze);animation-delay:0s,1.2s,.8s}
.r1 .tp-pc{animation-duration:4s,5s,2.6s}
@keyframes tpRot{to{--a:360deg}}
@keyframes tpFloat{50%{transform:translateY(-8px)}}
@keyframes tpGlow{0%,100%{box-shadow:0 8px 26px -10px var(--c)}50%{box-shadow:0 10px 44px -4px var(--c)}}
.tp-art{position:relative;aspect-ratio:3/4.3;overflow:hidden;display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 70% at 50% 100%,var(--t) 0%,transparent 65%),linear-gradient(170deg,#1a2140,#0b0f1d 70%)}
.r1 .tp-art{aspect-ratio:3/4.9}
.tp-art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;animation:tpKen 10s ease-in-out infinite alternate}
@keyframes tpKen{from{transform:scale(1)}to{transform:scale(1.09) translateY(1.5%)}}
.tp-ph{font-family:'Oswald',sans-serif;font-weight:700;font-size:clamp(70px,22vw,150px);color:rgba(255,255,255,.1);line-height:1;animation:tpPulse 4s ease-in-out infinite}
@keyframes tpPulse{50%{transform:scale(1.07);color:rgba(255,255,255,.16)}}
.tp-art::before{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.3) 50%,transparent 60%);transform:translateX(-130%);animation:tpSweep 4.2s ease-in-out infinite}
.r2 .tp-art::before{animation-delay:1.4s}.r3 .tp-art::before{animation-delay:2.6s}
@keyframes tpSweep{55%,100%{transform:translateX(130%)}}
.tp-art::after{content:"";position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,transparent 45%,rgba(8,11,20,.94) 100%);pointer-events:none}
.tp-medal{position:absolute;z-index:4;top:8px;inset-inline-start:8px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Oswald',sans-serif;font-weight:700;font-size:17px;color:#0a0d16;background:var(--c);box-shadow:0 2px 10px rgba(0,0,0,.5)}
.r1 .tp-medal{width:40px;height:40px;font-size:20px}
.tp-crown{position:absolute;z-index:5;top:-26px;left:50%;font-size:30px;filter:drop-shadow(0 3px 8px rgba(240,192,74,.7));transform:translateX(-50%);animation:tpCrown 2.6s ease-in-out infinite}
@keyframes tpCrown{50%{transform:translateX(-50%) translateY(-6px) rotate(-6deg)}}
.tp-tier{position:absolute;z-index:4;top:10px;inset-inline-end:8px;font-family:'Oswald',sans-serif;font-size:11px;font-weight:600;letter-spacing:.06em;color:var(--t);border:1px solid var(--t);border-radius:20px;padding:2px 8px;background:rgba(8,11,20,.72);direction:ltr}
.tp-info{position:absolute;z-index:4;inset-inline:0;bottom:0;padding:10px 8px 12px;text-align:center}
.tp-cn{font-size:12px;color:var(--c);font-weight:800;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tp-un{font-weight:900;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.r1 .tp-un{font-size:18px}
.tp-you{font-style:normal;font-size:10px;font-weight:800;color:#0a0d16;background:var(--tg);border-radius:20px;padding:1px 7px;margin-inline-start:4px;vertical-align:middle}
.tp-pw{display:inline-flex;align-items:baseline;gap:5px;margin-top:4px;font-family:'Oswald',sans-serif;font-weight:700;font-size:18px;color:var(--c);direction:ltr;font-variant-numeric:tabular-nums}
.r1 .tp-pw{font-size:24px}
.tp-pw small{font-family:'Cairo',sans-serif;font-size:10px;color:var(--td);font-weight:600}
.tp-sec{display:flex;align-items:center;justify-content:space-between;margin:6px 2px 10px;color:var(--tg);font-weight:800;font-size:15px}
.tp-sec span{color:var(--td);font-weight:600;font-size:12px}
.tp-list{display:flex;flex-direction:column;gap:8px}
.tp-row{--t:#8891a3;display:grid;grid-template-columns:38px 46px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 12px 8px 14px;border-radius:14px;background:rgba(15,20,34,.82);border:1px solid var(--tl);backdrop-filter:blur(6px);animation:tpRow .55s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i)*45ms + .7s);transition:transform .2s,border-color .2s}
.tp-row:hover{transform:translateX(-4px);border-color:var(--t)}
@keyframes tpRow{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:none}}
.tp-rk{font-family:'Oswald',sans-serif;font-weight:700;font-size:18px;color:var(--td);text-align:center;font-variant-numeric:tabular-nums}
.tp-th{position:relative;width:46px;height:46px;border-radius:12px;border:1.5px solid var(--t);background:linear-gradient(160deg,#1c2448,#0d1120);display:flex;align-items:center;justify-content:center;font-family:'Oswald',sans-serif;font-weight:700;color:var(--t);overflow:hidden}
.tp-th img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top}
.tp-mid{min-width:0}
.tp-mid b{display:block;font-weight:800;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tp-mid span{display:block;font-size:12px;color:var(--td);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tp-mid span i{font-style:normal;color:var(--t);font-weight:700}
.tp-sc{font-family:'Oswald',sans-serif;font-weight:600;font-size:17px;color:var(--tt);direction:ltr;text-align:end;font-variant-numeric:tabular-nums}
.tp-sc small{display:block;font-family:'Cairo',sans-serif;font-size:10px;color:var(--td);font-weight:600}
.tp-row.me{border-color:var(--tg);background:linear-gradient(90deg,rgba(240,192,74,.14),rgba(15,20,34,.85))}
.tp-empty{text-align:center;color:var(--td);padding:40px 0}
.tp-me{position:fixed;inset-inline:0;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:35;padding-inline:16px;pointer-events:none}
.tp-me.nb{bottom:calc(14px + env(safe-area-inset-bottom,0px))}
.tp-me div{pointer-events:auto;max-width:760px;margin-inline:auto;display:flex;align-items:center;gap:12px;padding:9px 14px;border-radius:14px;background:rgba(15,20,34,.96);border:1.5px solid var(--tg);box-shadow:0 8px 24px rgba(0,0,0,.55)}
.tp-me b{font-family:'Oswald',sans-serif;color:var(--tg);font-size:18px;direction:ltr}
.tp-me .t{flex:1;min-width:0;font-weight:800;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tp-me .p{font-family:'Oswald',sans-serif;font-weight:600;direction:ltr}
@media(max-width:420px){
  .tp-podium{gap:6px}.tp-info{padding-inline:4px}.tp-un{font-size:13px}.r1 .tp-un{font-size:15px}.tp-cn{font-size:11px}
  .tp-pw{font-size:15px}.r1 .tp-pw{font-size:19px}.tp-tier{font-size:9px;padding:1px 6px}
  .tp-row{grid-template-columns:30px 42px minmax(0,1fr) auto;gap:8px;padding-inline:10px}.tp-th{width:42px;height:42px}
}
.gt-tabs{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:0 0 16px}
.gt-tab{--g:#f0c04a;font:800 14px 'Cairo',sans-serif;color:var(--td);background:rgba(15,20,34,.85);border:1.5px solid var(--tl);border-radius:22px;padding:7px 16px;text-decoration:none;transition:.2s;direction:ltr;unicode-bidi:isolate}
.gt-tab.on{color:#0a0d16;background:var(--g);border-color:var(--g);box-shadow:0 0 18px -2px var(--g)}
.gt-tab:not(.on):hover{border-color:var(--g);color:var(--g)}
@media (prefers-reduced-motion:reduce){.tp *,.tp-bg i{animation:none!important}.tp-bg canvas{display:none}}
`

const TOP_JS = `(function(){
  // صورة فشلت بالتحميل: نشيلها ويظهر الحرف الأول بداله
  document.addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='IMG'&&t.closest('.tp')){t.remove()}},true);
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  // عدّاد القوة يرتفع من 0 للرقم النهائي
  document.querySelectorAll('[data-n]').forEach(function(el){
    var to=+el.getAttribute('data-n')||0, t0=0, d=1400;
    function f(n){return n.toLocaleString('en-US')}
    function step(t){var k=Math.min(1,(t-t0)/d); k=1-Math.pow(1-k,3); el.textContent=f(Math.round(to*k)); if(k<1) requestAnimationFrame(step); else el.textContent=f(to)}
    el.textContent='0'; setTimeout(function(){requestAnimationFrame(function(t){t0=t;step(t)})},500);
  });
  // شرارات ذهبية وزرقاء تصعد بالخلفية
  var c=document.getElementById('tp-fx'); if(!c) return; var x=c.getContext('2d'); if(!x) return;
  var W=0,H=0,P=[],dpr=Math.min(2,devicePixelRatio||1);
  function size(){W=c.clientWidth;H=c.clientHeight;c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0)}
  function mk(init){return{x:Math.random()*W,y:init?Math.random()*H:H+10,r:Math.random()*2+.6,v:Math.random()*.6+.25,s:Math.random()*Math.PI*2,a:Math.random()*.6+.25,g:Math.random()<.78}}
  size(); addEventListener('resize',size);
  var N=Math.round(Math.min(70,Math.max(30,innerWidth/14)));
  for(var i=0;i<N;i++)P.push(mk(true));
  function loop(){
    if(document.hidden){requestAnimationFrame(loop);return}
    x.clearRect(0,0,W,H);
    for(var i=0;i<P.length;i++){var p=P[i];p.y-=p.v;p.s+=.02;p.x+=Math.sin(p.s)*.35;
      if(p.y<-10){P[i]=mk(false);continue}
      var al=p.a*Math.min(1,p.y/(H*.25),(H-p.y)/40+.2);
      x.beginPath();x.fillStyle=p.g?'rgba(240,192,74,'+al+')':'rgba(160,190,255,'+al+')';
      x.shadowColor=p.g?'#f0c04a':'#8fb0ff';x.shadowBlur=8;x.arc(p.x,p.y,p.r,0,6.283);x.fill()}
    requestAnimationFrame(loop)}
  loop();
})();`

// podium: أول 3 · rows: من 4 فصاعداً · me: ترتيب صاحب الصفحة
// كل عنصر: { rank, who, charName, tier, color, img, total, isMe }
function topPageHTML({ code, viewer, podium, rows, me, updatedText, tabs = [], subText = null, emptyText = null }) {
    const youLabel = viewer.isOwner ? 'أنت' : 'صاحب الصفحة'
    const initial = s => esc(Array.from(String(s || '?'))[0] || '?')
    const you = d => d.isMe ? ` <em class="tp-you">${youLabel}</em>` : ''

    const slot = (d, i) => `<div class="tp-slot r${i + 1}">${i === 0 ? '<div class="tp-rays"></div>' : ''}<article class="tp-pc" style="--t:${d.color}"><div class="tp-art">${i === 0 ? '<span class="tp-crown">👑</span>' : ''}<span class="tp-medal">${i + 1}</span><span class="tp-tier">${esc(d.tier)}</span><span class="tp-ph">${initial(d.charName)}</span>${d.img ? `<img src="${esc(d.img)}" alt="" referrerpolicy="no-referrer">` : ''}</div><div class="tp-info"><div class="tp-cn">${esc(d.charName)}</div><div class="tp-un">${esc(d.who)}${you(d)}</div>${TITLES.wrap(d.t, true)}<div class="tp-pw"><span data-n="${Math.round(d.total)}">${fmtInt(d.total)}</span> <small>قوة</small></div></div></article></div>`

    const row = (d, i) => `<div class="tp-row${d.isMe ? ' me' : ''}" style="--t:${d.color};--i:${i}"><div class="tp-rk">${d.rank}</div><div class="tp-th"><span>${initial(d.charName)}</span>${d.img ? `<img src="${esc(d.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</div><div class="tp-mid"><b>${esc(d.who)}${you(d)}</b>${TITLES.wrap(d.t, true)}<span><i>${esc(d.tier)}</i> · ${esc(d.charName)}</span></div><div class="tp-sc">${fmtInt(d.total)}<small>مجموع القوة</small></div></div>`

    const topbar = viewer.isOwner
        ? `<div class="topbar"><span class="tb-l">${NAV_BTN}<span class="gmode">🏆 أقوى اللاعبين</span></span><a class="pill" href="/u/${esc(code)}">← رجوع للعرض</a></div>`
        : `<div class="topbar"><span class="who">وضع المشاهدة</span><a class="pill" href="/u/${esc(code)}">← رجوع للعرض</a></div>`

    const body = podium.length
        ? `<section class="tp-podium">${podium.map(slot).join('')}</section>
  ${rows.length ? `<div class="tp-sec">الترتيب من 4 إلى ${3 + rows.length}<span>آخر تحديث: ${esc(updatedText)}</span></div>
  <section class="tp-list">${rows.map(row).join('')}</section>` : `<div class="tp-sec"><span>آخر تحديث: ${esc(updatedText)}</span></div>`}`
        : `<div class="tp-empty">${esc(emptyText || 'لا يوجد لاعبون في الترتيب بعد.')}</div>`

    return `${shellHead('أقوى اللاعبين')}
<body>
<style>${TOP_CSS}</style>
<div class="tp-bg" aria-hidden="true"><i></i><i></i><i></i><canvas id="tp-fx"></canvas></div>
<div class="tp">
  ${topbar}
  <div class="tp-eb">Top Players</div>
  <h1>أقوى اللاعبين</h1>
  <p class="tp-sub">${esc(subText || `الترتيب حسب مجموع قوة شخصيات اللاعب (بحدّ سعة مخزونه)، أول ${TOP_LIMIT} لاعب`)}</p>
  <div class="tp-orn">◆</div>
  ${tabs.length ? `<nav class="gt-tabs">${tabs.map(t => `<a class="gt-tab${t.on ? ' on' : ''}" style="--g:${esc(t.color)}" href="${esc(t.href)}">${esc(t.label)}</a>`).join('')}</nav>` : ''}
  ${body}
</div>
<div class="tp-me${viewer.isOwner ? '' : ' nb'}"><div><b>${me.rank ? '#' + fmtInt(me.rank) : '—'}</b><span class="t">${viewer.isOwner ? 'ترتيبك' : 'ترتيبه'}: ${esc(me.who)}</span>${TITLES.wrap(me.t, true)}<span class="p">⚔️ ${fmtInt(me.total)}</span></div></div>
${viewer.isOwner ? navDrawerHTML(code, viewer.csrf, 'top', viewer.name) : ''}
<script>${TOP_JS}</script>
</body></html>`
}

// =====================================================================
// 🚢 صفحة سفينتي  /u/:code/ship  (+ مشهد البحر المتحرك /u/:code/ship/scene)
// قراءة فقط: بيانات السفينة والطاقم من نفس نماذج البوت (Ship / Player).
// مظهر السفينة يتطور تلقائياً مع المستوى، وعند المستوى الأقصى (25) تصل لآخر شكل بتاج.
// =====================================================================
const SHIP_MAX_CREW = 4        // نفس MAX_CREW بـ shipCommands.js
const SHIP_MAX_LEVEL = 25      // نفس MAX_LEVEL بـ shipLevel.js
// [أول مستوى يظهر عنده الشكل، الاسم] — الترتيب = رقم الشكل بملف المشهد
const SHIP_LOOKS = [
    [1, 'ثاوزند ساني'], [4, 'ميري (بحرية)'], [8, 'سفينة الأفعى (كوجا)'], [11, 'سفينة الغراب الأسود'],
    [14, 'سفينة الجمجمة البيضاء'], [17, 'سفينة الأفعى الذهبية'], [20, 'سفينة اللحية السوداء'], [25, 'أورو جاكسون']
]
function shipLookIndex(level) {
    let idx = 0
    for (let i = 0; i < SHIP_LOOKS.length; i++) if (level >= SHIP_LOOKS[i][0]) idx = i
    return idx
}

// نفس getShipWeekKey بـ shipCommands.js بالضبط: بداية الأسبوع الأحد 00:00 بتوقيت السعودية
function getShipWeekKey() {
    const riyadh = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }))
    const sunday = new Date(riyadh)
    sunday.setDate(riyadh.getDate() - riyadh.getDay())
    sunday.setHours(0, 0, 0, 0)
    return sunday.toISOString().slice(0, 10)
}

let _shipSceneTpl = null
function shipSceneHTML(level) {
    if (_shipSceneTpl === null) {
        try { _shipSceneTpl = fs.readFileSync(pathMod.join(__dirname, 'shipScene.html'), 'utf8') } catch (e) { _shipSceneTpl = '' }
    }
    if (!_shipSceneTpl) return '<!doctype html><meta charset="utf-8"><body style="background:#0a0d16;color:#8891a3;font:14px sans-serif;text-align:center;padding:40px">ملف المشهد shipScene.html غير موجود</body>'
    const lv = Math.max(1, Math.min(SHIP_MAX_LEVEL, Math.floor(Number(level)) || 1))
    return _shipSceneTpl.replace('__LEVEL__', String(lv)).replace('__TIER__', String(shipLookIndex(lv)))
}

const SHIP_CSS = `
.shp{--g:#f0c04a;--gd:#8a6d24;--t:#eef1f8;--d:#8891a3;--l:#222a42;--c:#0f1422;max-width:620px;margin-inline:auto;padding:14px 14px 150px;color:var(--t);font-family:'Cairo',system-ui,sans-serif}
.shp *{box-sizing:border-box}
.shp h1{margin:6px 0 2px;text-align:center;font-weight:900;font-size:28px;color:var(--g)}
.shp .sh-sub{text-align:center;color:var(--d);font-size:12px;margin:0 0 10px}
.sh-scene{position:relative;border-radius:20px;overflow:hidden;border:1.5px solid var(--gd);height:330px;box-shadow:0 10px 40px -12px #000;background:#0a0d16}
.sh-scene iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
.sh-hd{display:flex;align-items:center;gap:12px;margin:14px 0 6px}
.sh-lv{font:700 22px 'Oswald',sans-serif;color:#0a0d16;background:var(--g);border-radius:12px;padding:4px 12px}
.sh-hd b{font-size:18px;font-weight:900;display:block}.sh-hd small{display:block;color:var(--d);font-size:12px}
.sh-bar{height:12px;background:#151b2e;border:1px solid var(--l);border-radius:20px;overflow:hidden}
.sh-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--gd),var(--g))}
.sh-bar.hp i{background:linear-gradient(90deg,#a3202f,#ff4d5e)}
.sh-xt{display:flex;justify-content:space-between;color:var(--d);font-size:12px;margin:4px 2px 12px;direction:ltr}
.sh-st{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
.sh-st div{background:var(--c);border:1px solid var(--l);border-radius:12px;padding:8px 4px;text-align:center}
.sh-st b{display:block;font:700 16px 'Oswald',sans-serif;color:var(--g)}.sh-st span{font-size:11px;color:var(--d)}
.sh-sec{display:flex;justify-content:space-between;align-items:center;font-weight:900;font-size:15px;margin:16px 2px 8px}
.sh-sec span{font-size:12px;color:var(--d);font-weight:600}
.sh-row{display:flex;align-items:center;gap:10px;background:var(--c);border:1px solid var(--l);border-radius:14px;padding:10px 12px;margin-bottom:8px}
.sh-row .e{font-size:24px;width:34px;text-align:center}.sh-row .m{flex:1;min-width:0}
.sh-row .m b{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sh-row .m span{font-size:12px;color:var(--d)}
.sh-row.me{border-color:var(--g);box-shadow:0 0 16px -8px var(--g)}
.sh-row.lock{opacity:.5;filter:grayscale(.7)}.sh-row.vac{border-style:dashed;opacity:.55}.sh-row.gone{opacity:.6}
.sh-tag{font-size:11px;font-weight:800;border-radius:20px;padding:2px 9px;border:1px solid var(--g);color:var(--g);white-space:nowrap}
.sh-tag.o{border-color:#7cc4e6;color:#7cc4e6}.sh-tag.s{border-color:var(--d);color:var(--d)}.sh-tag.x{border-color:#ff6b6b;color:#ff6b6b}
.sh-pw{font:700 13px 'Oswald',sans-serif;color:var(--g);direction:ltr;white-space:nowrap}
.sh-note{color:var(--d);font-size:12px;text-align:center;margin:10px 0 0;line-height:1.7}
.sh-empty{text-align:center;color:var(--d);padding:50px 10px;line-height:2}.sh-empty b{display:block;color:var(--g);font-size:20px}
.sh-empty code{background:#151b2e;border:1px solid var(--l);border-radius:8px;padding:2px 8px;color:var(--t);direction:ltr;display:inline-block}
.sh-btn{display:block;width:100%;margin:8px 0 2px;padding:12px;border:0;border-radius:14px;font:900 15px 'Cairo',sans-serif;cursor:pointer;color:#0a0d16;background:linear-gradient(90deg,var(--gd),var(--g))}
.sh-btn.atk{background:linear-gradient(90deg,#a3202f,#ff4d5e);color:#fff}
.sh-btn:disabled{opacity:.45;cursor:not-allowed;filter:grayscale(.6)}
.sh-buy{border:1px solid var(--g);background:transparent;color:var(--g);border-radius:20px;padding:4px 14px;font:800 12px 'Cairo',sans-serif;cursor:pointer;white-space:nowrap}
.sh-buy:disabled{opacity:.4;cursor:not-allowed;border-color:var(--d);color:var(--d)}
.sh-msg{white-space:pre-wrap;line-height:1.9;font-size:14px;background:var(--c);border:1px solid var(--gd);border-radius:14px;padding:12px 14px;margin:12px 0 0}
.sh-msg.bad{border-color:#ff6b6b;color:#ff9aa6}.sh-msg.good{border-color:#4fe08a}
.sh-me{margin:10px 2px 4px;font-size:13px;color:var(--d);display:flex;justify-content:space-between}
.sh-bar.me i{background:linear-gradient(90deg,#1f8f55,#4fe08a)}
.sh-dead{color:#ff8aa0;font-size:13px;text-align:center;margin:8px 0 0}
#dyn.hit .sh-bar.hp{animation:shk .45s}
@keyframes shk{20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
`

// الجزء "الحي" من صفحة السفينة (الزعيم + حروب اليوم + المتجر) — يُرسم من السيرفر
// فقط (نفس الدالة للتحميل الأول وللتحديث كل ثواني) فما يصير فرق بين الحالتين.
function shipDynHTML({ ship, shop, bought, coins, wars, combat, isOwner, lvl }) {
    let boss
    if (ship.bossActive) {
        const mx = Number(ship.bossMaxHp) || 1, hp = Math.max(0, Number(ship.bossHp) || 0)
        boss = `<div class="sh-row"><span class="e">👹</span><div class="m"><b>${esc(ship.bossName || 'زعيم')}</b><span>${esc(ship.bossSeries || '')} · زعيم نشط</span></div><span class="sh-tag">${Math.ceil(hp / mx * 100)}%</span></div>
<div class="sh-bar hp"><i style="width:${Math.min(100, hp / mx * 100)}%"></i></div><div class="sh-xt"><span>${fmtInt(hp)} / ${fmtInt(mx)}</span><span>HP</span></div>`
        if (isOwner && combat) {
            const chp = Math.max(0, Number(combat.hp) || 0), cmx = Math.max(1, Number(combat.maxHp) || 1)
            const dead = Number(combat.deathMs) > 0
            boss += `<div class="sh-me"><span>❤️ دمك القتالي</span><span>${fmtInt(chp)} / ${fmtInt(cmx)}</span></div>
<div class="sh-bar me"><i style="width:${Math.min(100, chp / cmx * 100)}%"></i></div>`
            if (dead) boss += `<div class="sh-dead">💀 أنت ميت بمعركة الزعيم — تقدر تهاجم بعد <b class="cd" data-ms="${Math.floor(combat.deathMs)}">${Math.ceil(combat.deathMs / 1000)}</b> ثانية</div>`
            boss += `<button class="sh-btn atk" data-act="atk"${dead ? ' disabled' : ''}>⚔️ هجوم على الزعيم</button>`
        } else if (!isOwner) {
            boss += `<div class="sh-note">الهجوم متاح لأعضاء الطاقم من صفحتهم أو من الواتس</div>`
        }
    } else {
        boss = `<div class="sh-row${ship.bossAvailable ? '' : ' lock'}"><span class="e">👹</span><div class="m"><b>${ship.bossAvailable ? 'زعيمك جاهز للاستدعاء' : 'لا يوجد زعيم نشط'}</b><span>${ship.bossAvailable ? 'اضغط استدعاء أو اكتب .استدعاء_زعيم_السفينة' : 'يُشترى من متجر السفينة (مستوى 12+) أو يظهر تلقائياً 12 ظهراً'}</span></div></div>`
        if (isOwner && ship.bossAvailable) boss += `<button class="sh-btn" data-act="summon">👹 استدعاء الزعيم</button>`
    }

    // ─── حروب السفينة: رصيد اليوم المشترك + الحرب الجارية ───
    let warsHtml = ''
    if (wars) {
        const w = wars.war
        const warRow = !w ? '' : `<div class="sh-row"><span class="e">${w.status === 'accepted' ? '🔥' : '⏳'}</span><div class="m"><b>${w.status === 'accepted' ? 'حرب جارية' : 'طلب حرب معلق'} — ${esc(w.enemy)}</b><span>${w.mode === 'full' ? 'طاقم كامل' : 'مبارزات 1 ضد 1'}${w.status === 'accepted' && w.rounds ? ' · الجولة ' + w.round + '/' + w.rounds : ''}${w.status === 'pending' ? (w.asAttacker ? ' · بانتظار القبول' : ' · بانتظار قبول قبطانك') : ''}</span></div></div>`
        warsHtml = `<div class="sh-sec">⚔️ حروب السفينة<span>تتجدد 12:00 ص (السعودية)</span></div>
<div class="sh-row${wars.left <= 0 ? ' lock' : ''}"><span class="e">⚔️</span><div class="m"><b>المحاولات المتبقية اليوم</b><span>رصيد واحد مشترك للطاقم كله (.حرب_سفينة و .حرب_طاقم_كامل)</span></div><span class="sh-tag${wars.left <= 0 ? ' x' : ''}">${wars.left}/${wars.max}</span></div>
${warRow}<div class="sh-note">إعلان الحرب وقبولها من الواتس (يحتاج قبول قبطان السفينة الثانية)</div>`
    }

    // ─── المتجر (حالة الشراء الحقيقية من player.shipShop تظهر لصاحب الصفحة فقط) ───
    const shopRows = shop.map(i => {
        const lock = lvl < i.unlockLevel
        const got = isOwner && bought ? (Number(bought[i.id]) || 0) : 0
        const full = isOwner && !lock && got >= i.limit
        const sub = lock ? '🔒 يفتح عند مستوى ' + i.unlockLevel
            : full ? `✅ وصلت للحد الأسبوعي (${got}/${i.limit}) — يتجدد الأحد`
            : isOwner ? `المتبقي هذا الأسبوع: ${i.limit - got} من ${i.limit}`
            : 'الحد الأسبوعي لكل عضو: ' + i.limit
        const afford = (Number(coins) || 0) >= i.price
        const btn = isOwner && !lock && !full
            ? `<button class="sh-buy" data-act="buy" data-id="${esc(i.id)}"${afford ? '' : ' disabled'}>${afford ? 'شراء' : 'عملات ناقصة'}</button>` : ''
        return `<div class="sh-row${lock || full ? ' lock' : ''}"><span class="e">${esc(String(i.name).split(' ')[0])}</span><div class="m"><b>${esc(String(i.name).split(' ').slice(1).join(' '))}</b><span>${sub}</span></div><span class="sh-tag">${i.price} 🪙</span>${btn}</div>`
    }).join('')

    return `<div class="sh-sec">👹 زعيم السفينة</div>
${boss}
${warsHtml}
<div class="sh-sec">🛒 متجر السفينة<span>${isOwner ? '🪙 رصيدك: ' + fmtInt(coins) : 'للشراء: .متجر_السفينة'}</span></div>
${shopRows}`
}

// سكربت صفحة السفينة لصاحبها: أزرار الشراء/الهجوم/الاستدعاء + تحديث حي كل 5 ثواني
function shipScript(code, csrf) {
    return `<script>
(function(){
  var CSRF=${jsonForScript(csrf)}, dyn=document.getElementById('dyn'), box=document.getElementById('shmsg'), busy=false;
  function show(t,k){ box.textContent=t; box.className='sh-msg '+(k||''); box.hidden=false; }
  function lock(on){ var b=dyn.querySelectorAll('button'); for(var i=0;i<b.length;i++){ if(on){ b[i].setAttribute('data-was', b[i].disabled?'1':'0'); b[i].disabled=true; } else if(b[i].getAttribute('data-was')==='0'){ b[i].disabled=false; } } }
  function tick(){ var els=dyn.querySelectorAll('.cd'); for(var i=0;i<els.length;i++){ if(!els[i]._end) els[i]._end=Date.now()+Number(els[i].getAttribute('data-ms')||0); } }
  function put(h){ if(typeof h==='string'){ dyn.innerHTML=h; tick(); } }
  function post(url,body){
    busy=true; lock(true);
    return fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({csrf:CSRF},body||{}))})
      .then(function(r){ return r.json().catch(function(){ return {ok:false,message:'خطأ بالخادم'}; }); })
      .catch(function(){ return {ok:false,message:'تعذّر الاتصال بالخادم'}; })
      .then(function(j){ busy=false; return j; });
  }
  function done(j,hit){
    show(j.text||j.message||(j.ok?'تم':'فشل'), j.ok?'good':'bad');
    if(j.html){ put(j.html); } else { lock(false); }
    if(hit){ dyn.classList.remove('hit'); void dyn.offsetWidth; dyn.classList.add('hit'); }
  }
  dyn.addEventListener('click',function(e){
    var b=e.target.closest('button[data-act]'); if(!b||b.disabled||busy) return;
    var a=b.getAttribute('data-act');
    if(a==='buy') post('/ship/buy',{id:b.getAttribute('data-id')}).then(function(j){ done(j,false); });
    else if(a==='atk') post('/ship/boss/attack').then(function(j){ done(j,j.ok); });
    else if(a==='summon') post('/ship/boss/summon').then(function(j){ done(j,false); });
  });
  function refresh(){
    if(busy||document.hidden) return;
    fetch('/ship/dyn',{credentials:'same-origin',cache:'no-store'}).then(function(r){ return r.ok?r.json():null; })
      .then(function(j){ if(j&&j.ok&&!busy) put(j.html); }).catch(function(){});
  }
  setInterval(function(){
    var els=dyn.querySelectorAll('.cd'), over=false;
    for(var i=0;i<els.length;i++){ var s=Math.max(0,Math.ceil((els[i]._end-Date.now())/1000)); els[i].textContent=s; if(s<=0) over=true; }
    if(over) refresh();
  },1000);
  setInterval(refresh,5000);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) refresh(); });
  tick();
})();
</script>`
}

function shipPageHTML({ code, viewer, ship, crew, totalPower, shop, ownerName, bought, coins, status }) {
    const topbar = viewer.isOwner
        ? `<div class="topbar"><span class="tb-l">${NAV_BTN}<span class="gmode">🚢 سفينتي</span></span><a class="pill" href="/u/${esc(code)}">← رجوع للعرض</a></div>`
        : `<div class="topbar"><span class="who">وضع المشاهدة</span><a class="pill" href="/u/${esc(code)}">← رجوع للعرض</a></div>`
    const drawer = viewer.isOwner ? navDrawerHTML(code, viewer.csrf, 'ship', viewer.name) : ''
    const wrap = inner => `${shellHead('سفينتي')}
<body>
<style>${SHIP_CSS}</style>
<div class="shp">
  ${topbar}
  ${inner}
</div>
${drawer}
</body></html>`

    if (!ship) {
        return wrap(`<div class="sh-empty"><b>🚢 لا توجد سفينة</b>${esc(ownerName)} ليس على متن أي سفينة حالياً.<br>أنشئ سفينتك من البوت بالأمر:<br><code>.انشاء_سفينة 🚢 الاسم</code></div>`)
    }

    const lvl = Math.max(1, Math.min(SHIP_MAX_LEVEL, Number(ship.level) || 1))
    const maxed = lvl >= SHIP_MAX_LEVEL
    const need = Number(ship.nextLevelXp) || 0
    const xpPct = maxed ? 100 : (need > 0 ? Math.max(0, Math.min(100, (Number(ship.xp) || 0) / need * 100)) : 0)
    const lookIdx = shipLookIndex(lvl)
    const nextLook = SHIP_LOOKS[lookIdx + 1]
    const ranks = { captain: ['👑', 'قبطان', ''], officer: ['🎖️', 'ضابط', 'o'], sailor: ['⚓', 'بحّار', 's'] }

    const crewRows = crew.map(m => {
        const r = ranks[m.role]
        return `<div class="sh-row${m.isMe ? ' me' : ''}${m.exists ? '' : ' gone'}"><span class="e">${r[0]}</span><div class="m"><b>${esc(m.name)}${m.isMe ? ' (أنت)' : ''}</b><span>${m.exists ? 'قوة ' + fmtInt(m.power) : 'الحساب غير موجود بقاعدة اللاعبين'}</span></div>${m.exists ? '' : '<span class="sh-tag x">غير موجود</span>'}<span class="sh-tag ${r[2]}">${r[1]}</span></div>`
    }).join('')
    const vacant = Math.max(0, SHIP_MAX_CREW - crew.length)
    const vacRows = Array.from({ length: vacant }, () => `<div class="sh-row vac"><span class="e">➕</span><div class="m"><b>مقعد شاغر</b><span>.دعوة @لاعب</span></div></div>`).join('')

    const dynHTML = shipDynHTML({ ship, shop, bought, coins, wars: status && status.wars, combat: status && status.combat, isOwner: viewer.isOwner, lvl })

    return wrap(`
  <h1>${esc(ship.emoji || '🚢')} ${esc(ship.name)}</h1>
  <p class="sh-sub">${esc(ship.shipId)} · ${esc(SHIP_LOOKS[lookIdx][1])}${nextLook ? ' · الشكل التالي عند مستوى ' + nextLook[0] : ' · أقصى شكل 👑'}</p>
  <div class="sh-scene"><iframe src="/u/${esc(code)}/ship/scene" title="مشهد السفينة" loading="lazy"></iframe></div>
  <div class="sh-hd"><span class="sh-lv">Lv ${lvl}</span><div><b>${esc(ship.name)}</b><small>${crew.length}/${SHIP_MAX_CREW} من الطاقم</small></div></div>
  <div class="sh-bar"><i style="width:${xpPct}%"></i></div>
  <div class="sh-xt"><span>${maxed ? 'MAX' : fmtInt(ship.xp) + ' / ' + fmtInt(need) + ' XP'}</span><span>${maxed ? 'المستوى الأقصى 👑' : 'المستوى القادم: ' + (lvl + 1)}</span></div>
  <div class="sh-st"><div><b>${fmtInt(totalPower)}</b><span>القوة</span></div><div><b>${fmtInt(ship.wins)}</b><span>انتصار</span></div><div><b>${fmtInt(ship.losses)}</b><span>هزيمة</span></div><div><b>${fmtInt(ship.rankPoints)}</b><span>نقاط الرتبة</span></div></div>
  <div class="sh-sec">👥 الطاقم<span>${crew.length}/${SHIP_MAX_CREW}</span></div>
  ${crewRows}${vacRows}
  <div id="dyn">${dynHTML}</div>
  <div id="shmsg" class="sh-msg" hidden></div>
  <p class="sh-note">${viewer.isOwner ? 'الشراء وهجوم الزعيم من هنا أو من الواتس — نفس البيانات بالضبط وتتحدث تلقائياً. إعلان الحروب من الواتس.' : 'وضع المشاهدة — الشراء والهجوم لصاحب السفينة.'}</p>${viewer.isOwner ? shipScript(code, viewer.csrf) : ''}`)
}

// =====================================================================
// 💬 الدردشة (عامة + أصدقاء) — صفحة /u/:code/chat
// الواجهة داكنة بألوان الموقع + أنميشن. الخادم والتخزين داخل registerCharacterSite (آخر الملف)
// =====================================================================
const CHAT_REACT = ['❤️', '😂', '😮', '🔥', '😭', '👏', '✨', '💎']
const CHAT_CD_MS = 15000          // انتظار بين رسالتك والتي بعدها
const CHAT_ONLINE_MS = 20000      // يُعتبر متصل لو فتح الدردشة خلال آخر 20 ثانية
const CHAT_MAX_FRIENDS = 30
const CHAT_GRAD = ['linear-gradient(135deg,#ff3860,#ff9a3d)', 'linear-gradient(135deg,#7c4dff,#4dc3ff)', 'linear-gradient(135deg,#ff6fb5,#ffb86f)', 'linear-gradient(135deg,#1fbf75,#4dc3ff)']
const CHAT_STICKERS = [['✨', 'SSS طلعت!'], ['💎', 'نفرة!!'], ['🎰', 'سحبة وحدة بس'], ['🎁', 'صندوق ليجندري'], ['😭', 'مكرر مرة ثانية'], ['🔥', 'هجوم قاتل!'], ['👑', 'أنا الملك'], ['⭐', '5 نجوم'], ['🍀', 'حظ اليوم'], ['💀', 'مت بالزعيم']]
    .map(([em, tx], i) => ({ em, tx, bg: CHAT_GRAD[(i + 1) % 4] }))

const CHAT_CSS = `:root{color-scheme:dark;--bg:#0a0d16;--panel:#0f1422;--panel2:#151b2e;--line:#1f2740;--tx:#eef1f8;--mut:#8891a3;--gold:#f0c04a;--pink:#ff3860;--you:#171d30}
:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{font-family:'Cairo',system-ui,sans-serif;color:var(--tx);background:radial-gradient(500px 300px at 20% 0,rgba(240,192,74,.07),transparent),radial-gradient(500px 300px at 90% 30%,rgba(123,108,255,.12),transparent),var(--bg)}
button{font-family:inherit;cursor:pointer}
#app{height:100%;display:flex;flex-direction:column;max-width:560px;margin:0 auto}
header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:linear-gradient(180deg,#151b2e,#0f1422);color:var(--gold);border-bottom:1px solid var(--line);border-radius:0 0 22px 22px;box-shadow:0 8px 24px -10px #000}
header b{font-size:18px;font-weight:900}.on-pill{color:var(--tx);background:rgba(0,0,0,.35);border:1px solid var(--line);border-radius:20px;padding:3px 12px;font-size:13px;font-weight:700}
#view{flex:1;min-height:0;display:flex;flex-direction:column;overflow-y:auto}#view.chat{overflow:hidden}
#list{flex:1;overflow-y:auto;padding:6px 12px}
.bar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line)}
.bar>b{flex:1}.bar em{font-style:normal;color:var(--gold);font-size:13px}
.who .ttl{margin-inline-start:0;margin-top:2px}.nm .ttl{margin-inline-start:6px}.who{flex:1;min-width:0}.who small{display:block;color:var(--mut);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.note{text-align:center;font-size:12px;color:var(--mut);padding:6px;background:var(--panel2)}
.av{position:relative;flex:none;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font-size:23px;background:var(--panel2);border:2.5px solid var(--c);box-shadow:0 0 12px -2px var(--c)}
.av.im{background-size:cover;background-position:center top;background-repeat:no-repeat}
.dot{position:absolute;left:-2px;bottom:-1px;width:12px;height:12px;border-radius:50%;background:#35e08a;border:2px solid var(--panel);animation:pls 1.8s infinite}
.strip{display:flex;gap:10px;overflow-x:auto;padding:10px 12px;flex:none}
.sp{flex:none;width:54px;text-align:center}.sp .av{margin:auto}.sp small{display:block;font-size:10px;color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.msg{display:flex;gap:8px;margin:10px 0;align-items:flex-end}.msg:not(.me){flex-direction:row-reverse}
.mb{max-width:76%;display:flex;flex-direction:column}.me .mb{align-items:flex-start}.msg:not(.me) .mb{align-items:flex-end}
.nm{font-size:12px;font-weight:800;margin-bottom:2px}.mb small{font-size:10px;color:var(--mut);margin-top:2px}
/* 🏅 اللقب بالدردشة: يظهر كامل ويلتف لسطر ثاني لو طويل (overflow:hidden يبقى لقص لمعة الليجند/الميثيك فقط) */
.mb .nm{display:block;width:max-content;max-width:100%}
.nm .ttl{display:inline-flex!important;flex:none;width:max-content!important;max-width:100%!important;height:auto!important;min-height:0!important;aspect-ratio:auto!important;white-space:normal!important;word-break:break-word;border-radius:16px;padding:2px 11px}
.nm .ttl .tei{flex:none}.nm .ttl .tn{min-width:0;white-space:normal}
.bub{padding:9px 14px;border-radius:18px;line-height:1.6;background:var(--you);word-break:break-word}
.me .bub{background:linear-gradient(135deg,#5b4bd6,#a23bd6);color:#fff}
.stk{display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 20px;border-radius:22px;color:#fff;font-weight:900;font-size:15px;box-shadow:0 8px 20px -8px #000,inset 0 0 0 2px rgba(255,255,255,.35)}
.stk i{font-style:normal;font-size:46px;filter:drop-shadow(0 3px 6px rgba(0,0,0,.4));animation:bob 2s ease-in-out infinite}
@keyframes bob{50%{transform:translateY(-4px) scale(1.06)}}@keyframes pop{from{transform:scale(.8);opacity:0}}
.rcs{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
.qt{display:flex;flex-direction:column;gap:1px;font-size:12px;background:#ffffff0f;border-inline-start:3px solid var(--gold);border-radius:8px;padding:4px 8px;margin-bottom:3px;max-width:240px;cursor:pointer}
.qt b{font-size:11px}.qt span{color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rpv{display:flex;align-items:center;gap:8px;background:var(--panel2);border-top:1px solid var(--line);border-inline-start:3px solid var(--gold);padding:6px 12px}
.rpv>div{flex:1;min-width:0;display:flex;flex-direction:column}.rpv b{font-size:12px;color:var(--gold)}
.rpv small{color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rpv button{background:none;border:0;color:var(--mut);font-size:16px}
.rc{background:var(--panel2);border:1px solid var(--line);border-radius:14px;padding:1px 9px;color:var(--tx);font-weight:700;font-size:12px}
.rc.on{border-color:var(--gold);background:rgba(255,216,107,.2)}
.rbar{display:flex;gap:2px;background:var(--panel);border:1px solid var(--line);border-radius:24px;padding:4px 8px;margin-top:5px;box-shadow:0 8px 20px -8px #000;animation:pop .18s}
.rbar button{font-size:22px;background:none;border:0;padding:2px 4px}
.fr{display:flex;align-items:center;gap:12px;padding:11px 14px;border-bottom:1px solid var(--line);cursor:pointer}
.bd{background:var(--pink);color:#fff;border-radius:12px;padding:1px 9px;font-size:12px;font-weight:800}
.add{border:0;border-radius:20px;padding:6px 14px;font-weight:800;font-size:13px;color:#2a1c00;background:linear-gradient(90deg,#ffd86b,#ffae3d)}
.bk{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--panel2);color:var(--tx);font-size:15px}
.pk{background:var(--panel);border-top:1px solid var(--line);padding:8px}.pt{display:flex;gap:6px;margin-bottom:8px}
.pt button{flex:1;padding:7px;border-radius:12px;border:1px solid var(--line);background:var(--panel2);color:var(--tx);font-weight:800;font-size:13px}
.pt .on{background:linear-gradient(90deg,#5b4bd6,#a23bd6);color:#fff;border-color:transparent}
.pg{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;max-height:230px;overflow-y:auto}
.pg button{font-size:24px;background:none;border:0;padding:4px}
.pg.g{grid-template-columns:repeat(2,1fr);gap:8px}
.pg .sk{display:flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:14px;padding:10px 6px;color:#fff;font-weight:800;font-size:14px}.sk i{font-style:normal;font-size:24px}
.cmp{display:flex;gap:8px;padding:8px 10px;background:var(--panel);align-items:center;border-top:1px solid var(--line)}
.cmp input,#q{flex:1;min-width:0;background:var(--panel2);border:1px solid var(--line);border-radius:22px;padding:11px 16px;color:var(--tx);font:inherit;font-size:15px;outline:0}
.sm,.snd{flex:none;width:42px;height:42px;border-radius:50%;border:0;font-size:19px;color:#fff;background:linear-gradient(135deg,#5b4bd6,#a23bd6)}.sm{background:var(--panel2);color:var(--tx);border:1px solid var(--line)}
#nav{display:flex;background:var(--panel);border-top:1px solid var(--line)}
#nav button{position:relative;flex:1;background:none;border:0;border-top:3px solid transparent;padding:8px 0 6px;color:var(--mut);font-size:20px;display:flex;flex-direction:column;align-items:center}
#nav button span{font-size:11px;font-weight:800}#nav .on{color:var(--gold);border-top-color:var(--gold)}
#nav b{position:absolute;top:4px;right:34%;background:var(--pink);color:#fff;border-radius:10px;font-size:10px;padding:0 6px}
#sheet{position:fixed;inset:0;z-index:20;background:rgba(5,6,16,.7);display:flex;align-items:flex-end;justify-content:center}#sheet[hidden]{display:none}
.box{width:100%;max-width:560px;max-height:75%;overflow-y:auto;background:var(--bg);border-radius:22px 22px 0 0;border:1px solid var(--line)}
#q{display:block;margin:10px 14px;width:calc(100% - 28px);flex:none}
#toast{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));left:50%;transform:translate(-50%,-90px);background:var(--panel);border:1px solid var(--gold);border-radius:20px;padding:8px 18px;font-weight:800;font-size:14px;transition:transform .25s;z-index:30}#toast.show{transform:translate(-50%,0)}

/* animations */
@keyframes pls{0%{box-shadow:0 0 0 0 rgba(53,224,138,.6)}100%{box-shadow:0 0 0 8px rgba(53,224,138,0)}}
@keyframes msgIn{from{opacity:0;transform:translate(var(--x),12px) scale(.92)}}
@keyframes bubIn{from{transform:scale(.6)}60%{transform:scale(1.05)}}
@keyframes stkIn{from{transform:scale(.3) rotate(-14deg);opacity:0}60%{transform:scale(1.12) rotate(4deg)}}
@keyframes up{from{transform:translateY(24px);opacity:0}}
@keyframes fade{from{opacity:0}}
@keyframes slide{from{opacity:0;transform:translateX(26px)}}
@keyframes dots{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}
@keyframes glow{50%{box-shadow:0 0 18px 0 var(--c)}}
.msg{--x:-26px}.msg.me{--x:26px}
.msg.in{animation:msgIn .42s cubic-bezier(.2,.9,.3,1) both}
.msg.in .bub{animation:bubIn .5s cubic-bezier(.34,1.56,.64,1) both;transform-origin:bottom}
.msg.in .stk{animation:stkIn .6s cubic-bezier(.34,1.56,.64,1) both}
.msg .av{animation:glow 3.5s ease-in-out infinite}
.typ .bub{display:flex;gap:5px;padding:13px 16px}
.typ .bub i{width:7px;height:7px;border-radius:50%;background:var(--mut);animation:dots 1.1s infinite}
.typ .bub i:nth-child(2){animation-delay:.15s}.typ .bub i:nth-child(3){animation-delay:.3s}
.vin{animation:fade .3s}
.vin .fr{animation:slide .35s both}.vin .fr:nth-child(2){animation-delay:.05s}.vin .fr:nth-child(3){animation-delay:.1s}.vin .fr:nth-child(4){animation-delay:.15s}.vin .fr:nth-child(5){animation-delay:.2s}.vin .fr:nth-child(n+6){animation-delay:.25s}
.vin .sp{animation:up .4s both}
.pk{animation:up .25s}.box{animation:up .3s cubic-bezier(.2,.9,.3,1)}#sheet:not([hidden]){animation:fade .2s}
.rc{animation:pop .2s}
#nav button{transition:color .2s,border-color .2s}#nav button:active,.snd:active,.sm:active{transform:scale(.88)}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
/* تكامل مع الموقع */
:root{--gold-dim:#8a6d24;--text:#eef1f8;--text-dim:#8891a3}
header{gap:10px}header b{flex:1}
.bnav{display:none!important}
.strip:empty{display:none}
`

// كود المتصفح — يُكتب كدالة عادية ويُحقن بالصفحة عبر toString()
function chatClient() {
    var C = window.__CHAT
    var $ = function (s) { return document.querySelector(s) }
    var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return ESC[c] }) }
    var EM = '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 😉 😊 😇 🥰 😍 🤩 😘 😋 😛 😜 🤪 😎 🤓 🥳 🤗 🤭 🤫 🤔 😏 😒 🙄 😬 😴 🤤 😪 😢 😭 🥹 😤 😡 🤬 😱 😨 😰 🥶 🥵 🤯 😳 🥺 😈 👿 💀 ☠️ 👻 👽 🤖 💩 🙈 🙉 🙊 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💖 💗 💘 💝 💔 ❣️ 💯 💢 💥 💫 💦 💨 🔥 ✨ ⭐ 🌟 ⚡ 🌈 ☀️ 🌙 ❄️ 🌸 🌺 🍀 🍁 👍 👎 👏 🙌 🙏 💪 🤝 ✌️ 🤞 🤟 🤘 👌 👊 ✊ 🫶 👀 🧠 👑 💎 🎰 🎁 🎴 🃏 🎲 🎮 🏆 🥇 🎯 🔮 🧿 🗡️ ⚔️ 🛡️ 🏹 💣 🚢 ⚓ 🏴‍☠️ 🐉 🐲 🦊 🐺 🐱 🐶 🐯 🦁 🐻 🐰 🐼 🦄 🦅 🦋 🍥 🍙 🍜 🍣 🍡 🍰 🍩 🍓 🍎 🍕 🍔 🥤 🍵 🎌 ⛩️ 🏯 🎋 🎐 🎆 🎉 🎊 🔔 🚀 💰 💸'.split(' ')
    var S = { tab: 'pub', dm: null, open: null, pk: null, msgs: [], ppl: {}, on: [], onSet: {}, fr: [], pu: 0, sig: '', cd: 0, busy: false, first: true, sr: [], rp: null }
    var seen = {}, polling = false, again = false
    var tm = function (t) { return new Date(t).toLocaleTimeString('ar-u-nu-latn', { hour: '2-digit', minute: '2-digit' }) }
    var P = function (id) { return id === C.me.id ? C.me : (S.ppl[id] || { id: id, n: 'لاعب', h: 200 }) }
    var col = function (p) { return 'hsl(' + p.h + ' 75% 62%)' }
    var isOn = function (id) { return id === C.me.id || !!S.onSet[id] }
    var left = function () { return Math.max(0, S.cd - Date.now()) }
    var friend = function (id) { for (var i = 0; i < S.fr.length; i++) if (S.fr[i].id === id) return S.fr[i]; return null }
    function av(p) { return '<div class="av' + (p.i ? ' im' : '') + '" style="--c:' + col(p) + (p.i ? ';background-image:url(' + esc(p.i) + ')' : '') + '">' + (p.i ? '' : esc(Array.from(p.n)[0] || '؟')) + (isOn(p.id) ? '<i class="dot"></i>' : '') + '</div>' }
    function toast(t) { var e = $('#toast'); e.textContent = t; e.className = 'show'; clearTimeout(toast.h); toast.h = setTimeout(function () { e.className = '' }, 2200) }
    function api(url, body) {
        body = body || {}; body.csrf = C.csrf
        return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            .then(function (r) { if (r.status === 401) { location.href = '/login?code=' + C.code; return { ok: false } } return r.json() })
            .catch(function () { return { ok: false, message: 'تعذّر الاتصال بالخادم' } })
    }
    function mh(m) {
        var p = P(m.f), st = m.s >= 0 ? C.stk[m.s] : null
        var body = st ? '<div class="stk" style="background:' + st.bg + '"><i>' + st.em + '</i><span>' + esc(st.tx) + '</span></div>' : '<div class="bub">' + esc(m.x) + '</div>'
        var re = Object.keys(m.r).map(function (e) { var r = m.r[e]; return '<button class="rc' + (r.me ? ' on' : '') + '" data-a="re" data-m="' + m.id + '" data-e="' + e + '">' + e + ' ' + r.n + '</button>' }).join('')
        var qt = ''
        if (m.q) { var qp = P(m.q.f); qt = '<div class="qt" data-a="jq" data-m="' + m.q.id + '"><b style="color:' + col(qp) + '">' + esc(qp.n) + '</b><span>' + (m.q.s >= 0 && C.stk[m.q.s] ? C.stk[m.q.s].em + ' ستيكر' : esc(m.q.x)) + '</span></div>' }
        var bar = S.open === m.id ? '<div class="rbar"><button data-a="rp" data-m="' + m.id + '" title="رد">↩️</button>' + C.re.map(function (e) { return '<button data-a="re" data-m="' + m.id + '" data-e="' + e + '">' + e + '</button>' }).join('') + '</div>' : ''
        return '<div class="msg' + (m.me ? ' me' : '') + (seen[m.id] ? '' : ' in') + '" id="m-' + m.id + '">' + av(p) + '<div class="mb">' + (m.me ? (p.t ? '<div class="nm">' + TB(p.t, 1) + '</div>' : '') : '<div class="nm" style="color:' + col(p) + '">' + esc(p.n) + (p.t ? TB(p.t, 1) : '') + '</div>') + '<div data-a="op" data-m="' + m.id + '">' + qt + body + '</div>' + bar + (re ? '<div class="rcs">' + re + '</div>' : '') + '<small>' + tm(m.t) + '</small></div></div>'
    }
    function rList(f) {
        var l = $('#list'); if (!l) return
        var near = l.scrollHeight - l.scrollTop - l.clientHeight < 90
        l.innerHTML = S.msgs.map(mh).join('') || '<div class="note">' + (S.dm ? 'ابدأ المحادثة 👋' : 'كن أول من يكتب 👋') + '</div>'
        S.msgs.forEach(function (m) { seen[m.id] = 1 })
        if (f || near) l.scrollTop = l.scrollHeight
    }
    function hd() {
        $('#oc').textContent = S.on.length + 1
        var pn = $('#pn'); if (pn) pn.textContent = '🌐 رسالة عامة — تصل لكل المتصلين (' + (S.on.length + 1) + ')'
    }
    function rNav() {
        var du = 0; S.fr.forEach(function (f) { du += f.un || 0 })
        $('#nav').innerHTML = '<button class="' + (S.tab === 'pub' ? 'on' : '') + '" data-a="tab" data-v="pub">🌐<span>العام</span>' + (S.pu ? '<b>' + S.pu + '</b>' : '') + '</button><button class="' + (S.tab === 'fr' ? 'on' : '') + '" data-a="tab" data-v="fr">👥<span>الأصدقاء</span>' + (du ? '<b>' + du + '</b>' : '') + '</button>'
    }
    function rStrip() {
        var s = $('#strip'); if (!s) return
        s.innerHTML = S.on.map(function (id) { var p = P(id); return '<div class="sp">' + av(p) + '<small>' + esc(p.n) + '</small></div>' }).join('')
    }
    function rSt() {
        var s = $('#st'), f = friend(S.dm); if (!s || !f) return
        s.textContent = isOn(S.dm) ? '🟢 متصل' : '⚫ غير متصل — توصله الرسالة عند دخوله'
    }
    function rFr() {
        var b = $('#frl'); if (!b) return
        b.innerHTML = S.fr.map(function (f) {
            var p = P(f.id), l = f.last
            var pv = l ? (l.me ? 'أنت: ' : '') + (l.s >= 0 ? C.stk[l.s].em + ' ستيكر' : esc(l.x)) : 'ابدأ المحادثة'
            return '<div class="fr" data-a="dm" data-v="' + f.id + '">' + av(p) + '<div class="who"><b style="color:' + col(p) + '">' + esc(p.n) + '</b>' + (p.t ? TB(p.t, 1) : '') + '<small>' + pv + '</small></div>' + (f.un ? '<b class="bd">' + f.un + '</b>' : '') + '</div>'
        }).join('') || '<div class="note">ما عندك أصدقاء بعد</div>'
        var c = $('#fc'); if (c) c.textContent = S.fr.length + '/' + C.maxFr
    }
    function rView() {
        var v = $('#view'), h = ''
        v.className = S.dm != null || S.tab === 'pub' ? 'chat' : ''
        if (S.dm != null) {
            var p = P(S.dm)
            h = '<div class="bar"><button class="bk" data-a="bk">➜</button>' + av(p) + '<div class="who"><b style="color:' + col(p) + '">' + esc(p.n) + '</b>' + (p.t ? TB(p.t, 1) : '') + '<small id="st"></small></div><button class="bk" data-a="rmf" data-v="' + S.dm + '" title="حذف الصديق">💔</button></div><div class="note">🔒 رسالة خاصة — ما يشوفها غيركم</div><div id="list"></div>'
        } else if (S.tab === 'pub') {
            h = '<div class="strip" id="strip"></div><div class="note" id="pn"></div><div id="list"></div>'
        } else {
            h = '<div class="bar"><b>👥 أصدقائي <em id="fc"></em></b><button class="add" data-a="add">➕ إضافة صديق</button></div><div id="frl"></div>'
        }
        v.innerHTML = h
        rStrip(); rFr(); rSt(); hd()
    }
    function rFoot() {
        var f = $('#foot'), old = ($('#in') || {}).value || ''
        if (S.tab === 'fr' && S.dm == null) { f.innerHTML = ''; return }
        var pk = ''
        if (S.pk) {
            var g = S.pk === 'e' ? EM.map(function (e) { return '<button data-a="em" data-v="' + e + '">' + e + '</button>' }).join('') : C.stk.map(function (s, i) { return '<button class="sk" data-a="sk" data-v="' + i + '" style="background:' + s.bg + '"><i>' + s.em + '</i><span>' + esc(s.tx) + '</span></button>' }).join('')
            pk = '<div class="pk"><div class="pt">' + [['e', '😊 إيموجي'], ['g', '🎴 ستيكرات غاتشا']].map(function (k) { return '<button class="' + (S.pk === k[0] ? 'on' : '') + '" data-a="pk" data-v="' + k[0] + '">' + k[1] + '</button>' }).join('') + '</div><div class="pg ' + S.pk + '">' + g + '</div></div>'
        }
        var rv = ''
        if (S.rp) { var rpp = P(S.rp.f); rv = '<div class="rpv"><div><b>↩️ رد على ' + esc(rpp.n) + '</b><small>' + (S.rp.s >= 0 && C.stk[S.rp.s] ? C.stk[S.rp.s].em + ' ستيكر' : esc(S.rp.x)) + '</small></div><button data-a="rpx">✕</button></div>' }
        f.innerHTML = pk + rv + '<div class="cmp"><button class="sm" data-a="pk" data-v="' + (S.pk ? '' : 'e') + '">' + (S.pk ? '⌨️' : '😊') + '</button><input id="in" maxlength="200" autocomplete="off" placeholder="' + (S.dm != null ? 'رسالة خاصة…' : 'اكتب للجميع…') + '"><button class="snd" data-a="snd">➤</button></div>'
        $('#in').value = old
    }
    function go() {
        S.open = null; S.sig = ''; S.first = true; S.msgs = []; S.rp = null
        rView(); rFoot(); rNav()
        var v = $('#view'); v.classList.remove('vin'); void v.offsetWidth; v.classList.add('vin')
        poll()
    }
    function apply(j) {
        S.ppl = j.people || {}; S.on = j.online || []; S.fr = j.friends || []; S.pu = j.pubUnread || 0
        S.onSet = {}; S.on.forEach(function (id) { S.onSet[id] = 1 }); S.fr.forEach(function (f) { if (f.on) S.onSet[f.id] = 1 })
        if ((j.view || '') !== (S.dm || '')) return
        if (S.dm != null && j.notFriend) { S.dm = null; S.tab = 'fr'; return go() }
        var msgs = j.msgs || []
        var sig = msgs.map(function (m) { var pt = S.ppl[m.f]; return m.id + JSON.stringify(m.r) + (pt && pt.t ? pt.t.n : '') }).join('|')
        var changed = sig !== S.sig || S.first
        S.msgs = msgs; S.sig = sig
        if (S.first) { msgs.forEach(function (m) { seen[m.id] = 1 }) }
        hd(); rNav(); rStrip(); rSt()
        if (changed) { rList(S.first); S.first = false }
        if (S.tab === 'fr' && S.dm == null) rFr()
    }
    function poll() {
        if (polling) { again = true; return }
        polling = true
        fetch('/chat/poll?to=' + encodeURIComponent(S.dm || ''), { credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { if (r.status === 401) { location.href = '/login?code=' + C.code; throw 0 } return r.json() })
            .then(function (j) { if (j && j.ok) apply(j) })
            .catch(function () { })
            .then(function () { polling = false; if (again) { again = false; poll() } })
    }
    function send(x, s) {
        if (!x && s == null) return
        if (S.tab === 'fr' && S.dm == null) return
        var l = left(); if (l > 0) return toast('⏳ انتظر ' + Math.ceil(l / 1000) + ' ثانية قبل رسالتك التالية')
        if (S.busy) return
        S.busy = true
        api('/chat/send', { to: S.dm || '', x: x || '', s: s == null ? -1 : s, q: S.rp ? S.rp.id : '' }).then(function (j) {
            S.busy = false
            if (!j.ok) { if (j.retryInMs) S.cd = Date.now() + j.retryInMs; return toast(j.message || 'تعذّر الإرسال') }
            S.cd = Date.now() + C.cd
            var i = $('#in'); if (x && i) i.value = ''
            if (S.rp) { S.rp = null; rFoot() }
            S.first = false; poll()
        })
    }
    function fill() {
        var l = $('#sl'); if (!l) return
        l.innerHTML = S.sr.map(function (p) { return '<div class="fr">' + av(p) + '<div class="who"><b style="color:' + col(p) + '">' + esc(p.n) + '</b>' + (p.t ? TB(p.t, 1) : '') + '<small>@' + esc(p.u) + ' · ' + (isOn(p.id) ? '🟢 متصل' : '⚫ غير متصل') + '</small></div><button class="add" data-a="addf" data-v="' + p.id + '">إضافة</button></div>' }).join('') || '<div class="note">' + (($('#q') || {}).value && $('#q').value.trim().length > 1 ? 'لا يوجد لاعبين' : 'اكتب حرفين على الأقل من اليوزر') + '</div>'
        var c = $('#sc'); if (c) c.textContent = S.fr.length + '/' + C.maxFr
    }
    var srT = 0
    function search() {
        clearTimeout(srT)
        srT = setTimeout(function () {
            var q = ($('#q') || {}).value || ''; q = q.trim()
            if (q.length < 2) { S.sr = []; return fill() }
            fetch('/chat/search?q=' + encodeURIComponent(q), { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json() }).then(function (j) { S.sr = (j && j.ok) ? j.items : []; fill() }).catch(function () { })
        }, 300)
    }
    function sheet() {
        var s = $('#sheet'); s.hidden = false; S.sr = []
        s.innerHTML = '<div class="box"><div class="bar"><b>➕ إضافة صديق <em id="sc"></em></b><button class="bk" data-a="x">✕</button></div><input id="q" placeholder="ابحث باليوزر…" autocomplete="off" maxlength="20"><div id="sl"></div></div>'
        s.onclick = function (e) { if (e.target === s) s.hidden = true }
        $('#q').oninput = search; fill()
    }
    document.addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]'); if (!b) return
        var a = b.dataset.a, v = b.dataset.v
        if (a === 'tab') { S.tab = v; S.dm = null; S.pk = null; go() }
        else if (a === 'dm') { S.dm = v; S.pk = null; go() }
        else if (a === 'bk') { S.dm = null; S.pk = null; go() }
        else if (a === 'op') { var m = b.dataset.m; S.open = S.open === m ? null : m; rList() }
        else if (a === 're') { var mid = b.dataset.m; S.open = null; api('/chat/react', { id: mid, e: b.dataset.e }).then(function (j) { if (!j.ok) toast(j.message || 'تعذّر التفاعل'); S.sig = ''; poll() }); rList() }
        else if (a === 'rp') {
            var rm = null; S.msgs.forEach(function (z) { if (z.id === b.dataset.m) rm = z })
            if (rm) { S.rp = { id: rm.id, f: rm.f, x: rm.x, s: rm.s }; S.open = null; rList(); rFoot(); var ri = $('#in'); if (ri) ri.focus() }
        }
        else if (a === 'rpx') { S.rp = null; rFoot() }
        else if (a === 'jq') {
            var tg = document.getElementById('m-' + b.dataset.m)
            if (tg) { tg.scrollIntoView({ block: 'center', behavior: 'smooth' }); tg.animate([{ background: '#ffffff22' }, { background: 'transparent' }], { duration: 1200 }) }
            else toast('الرسالة الأصلية قديمة')
        }
        else if (a === 'pk') { S.pk = v || null; rFoot() }
        else if (a === 'em') { $('#in').value += v }
        else if (a === 'sk') { send(null, +v); S.pk = null; rFoot() }
        else if (a === 'snd') { b.animate([{ transform: 'scale(1)' }, { transform: 'scale(.78) rotate(-25deg)' }, { transform: 'scale(1)' }], { duration: 280 }); send($('#in').value.trim()) }
        else if (a === 'add') sheet()
        else if (a === 'addf') {
            api('/chat/friend', { op: 'add', id: v }).then(function (j) {
                if (!j.ok) return toast(j.message || 'تعذّرت الإضافة')
                toast(j.message || 'تمت الإضافة 💖'); S.sr = S.sr.filter(function (p) { return p.id !== v })
                S.fr.push({ id: v, on: 0, un: 0, last: null }); fill(); poll()
            })
        }
        else if (a === 'rmf') {
            if (!confirm('حذف هذا الصديق؟')) return
            api('/chat/friend', { op: 'remove', id: v }).then(function (j) { if (!j.ok) return toast(j.message || 'تعذّر الحذف'); toast('تم حذف الصديق 💔'); S.dm = null; S.fr = S.fr.filter(function (f) { return f.id !== v }); go() })
        }
        else if (a === 'x') $('#sheet').hidden = true
    })
    document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'in') send(e.target.value.trim()) })
    setInterval(function () { var b = document.querySelector('.snd'); if (!b) return; var l = left(); b.textContent = l > 0 ? Math.ceil(l / 1000) : '➤'; b.style.opacity = l > 0 ? .55 : 1 }, 300)
    setInterval(function () { if (!document.hidden) poll() }, 3000)
    document.addEventListener('visibilitychange', function () { if (!document.hidden) poll() })
    go()
}

function chatPageHTML({ viewer, code }) {
    const cfg = { code, csrf: viewer.csrf, me: viewer.me, stk: CHAT_STICKERS, re: CHAT_REACT, cd: CHAT_CD_MS, maxFr: CHAT_MAX_FRIENDS }
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
${TITLES.HEAD}${PWA.HEAD}${NOTIFY.HEAD}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>دردشة الأكاديمية</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>${CHAT_CSS}</style>
</head>
<body>
<div id="app"><header>${NAV_BTN}<b>💬 دردشة الأكاديمية</b><span class="on-pill">🟢 <span id="oc">1</span> متصل</span></header><main id="view"></main><footer id="foot"></footer><nav id="nav"></nav></div>
${navDrawerHTML(code, viewer.csrf, 'chat', viewer.name)}
<div id="sheet" hidden></div><div id="toast"></div>
<script>window.__CHAT=${jsonForScript(cfg)};</script>
<script>(${chatClient.toString()})()</script>
</body>
</html>`
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
    // 🔢 ترتيب الشخصيات بالموقع = نفس دالة .شخصياتي بالبوت (الشخصية 1 ثابتة، الباقي حسب الرتبة ثم القوة) فتتطابق الأرقام
    const sortChars = typeof opts.sortCharactersKeepFirst === 'function' ? opts.sortCharactersKeepFirst : sortCharactersKeepFirst
    const usernameCost = Number(opts.usernameCost) || 20000
    const notifyDm = opts.notifyDm || (async () => {})
    const notifyOwner = opts.notifyOwner || (async () => {})
    const pullCharacter = opts.pullCharacter // من systems/pullSystem.js (نفس منطق .اسحب)
    const sellCharacters = opts.sellCharacters // من systems/characterTradeSystem.js (نفس منطق .بيع)
    const mergeAll = opts.mergeAll     // من systems/characterTradeSystem.js (نفس منطق .دمج_الكل)
    const bossAttack = opts.bossAttack // من systems/bossAttackSystem.js (نفس منطق .هجوم)
    const bossPush = opts.bossPush     // من systems/bossPush.js (إشعارات الهاتف عند ظهور الزعيم)
    const bannerInfo = opts.bannerInfo // من systems/bannerPullSystem.js (معلومات البنر + رصيد الأورب)
    const bannerPull = opts.bannerPull // من systems/bannerPullSystem.js (نفس منطق .سحب_بنر)
    const kingdomRaid = opts.kingdomRaid // من systems/kingdomRaidSystem.js (نفس منطق .غزو)
    const raidSock = opts.raidSock // اختياري: () => sock — لإرسال جوائز/تحرير الرايد لقروبات الواتساب لما يُقتل الزعيم من الموقع
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
            bonus: Number(player.bonusPulls) || 0, // 🎡 عملات العجلة
            pityMax: 30,
            count: (player.characters || []).length,
            cap: Number(player.maxCharacters) || 30,
            resetIn: Math.ceil((COOLDOWN - (Date.now() % COOLDOWN)) / 1000)
        }
    }

    const CODE_RE = /^[a-f0-9]{10}$/

    // 🖼️ عرض الشخصية (مشترك بين التحدي والأرينا)
    const siteCharView = (c, req) => {
        const disp = resolveDisplayChar(c || {}, getCatalogIndex(getCatalog))
        const tier = TIERS[resolveTierKey(disp.rarity, disp.evolutionLevel)] || TIERS['عادي']
        const showImg = tier.idx >= FIRST_IMAGE_TIER
        let img = showImg ? safeImageUrl(disp.image) : null
        if (img && img.startsWith('/') && req) {
            const proto = String(req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim()
            img = `${proto}://${req.get('host')}${img}`
        }
        return {
            n: String(disp.name || (c && c.name) || '—'),
            r: tier.key, c: tier.color, s: tier.stars,
            k: showImg ? 1 : 0, en: tier.lang === 'en',
            p: Number(c && c.power) || 0, i: img
        }
    }

    // 🏅 الألقاب — /u/:code/titles + POST /titles/equip (systems/titleSystem.js)
    try {
        TITLES.mount(app, { Player, auth, jsonBody, securityHeaders, CODE_RE, html404, ownerSession, esc, navDrawerHTML, NAV_BTN, shellHead, onChange: opts.onTitleChange })
    } catch (e) { console.error('site titles mount error:', e) }

    // 📲 تثبيت كتطبيق — manifest + أيقونات (systems/sitePwa.js) بدون Service Worker وبدون أي تغيير بالمنطق
    try { PWA.mount(app, { CODE_RE }) } catch (e) { console.error('site pwa mount error:', e) }
    try { NOTIFY.mount(app, { Player, auth }) } catch (e) { console.error('site notify mount error:', e) }

    // ⚔️ التحدي المباشر (PvP) — الدعوات اللحظية + الساحة (systems/siteChallenge.js)
    // يُسجَّل مبكراً عشان يحقن سكربت الدعوات بكل صفحات /u/:code
    if (opts.challenge) {
        try {
            opts.challenge.mount(app, {
                auth, jsonBody, bossSession, securityHeaders, CODE_RE, html404, ownerSession, esc,
                navDrawerHTML, NAV_BTN, cappedPower, titles: TITLES,
                charView: siteCharView
            })
        } catch (e) { console.error('site challenge mount error:', e) }
    }

    // ❌⭕ XO أونلاين — /u/:code/xo (systems/siteXO.js)
    if (opts.xo) {
        try {
            opts.xo.mount(app, { auth, jsonBody, bossSession, securityHeaders, CODE_RE, html404, ownerSession })
        } catch (e) { console.error('site xo mount error:', e) }
    }

    // 🏟️ أرينا PvP (النسخة 3) — /u/:code/pvp (systems/siteArena.js)
    // ملاحظة: /u/:code/arena مستخدم لساحة قتال التحدي (siteChallenge.js) — لا تستخدمه للأرينا
    if (opts.arena) {
        try {
            opts.arena.mount(app, {
                auth, jsonBody, bossSession, securityHeaders, CODE_RE, html404, ownerSession, esc,
                navDrawerHTML, NAV_BTN, titles: TITLES, charView: siteCharView
            })
        } catch (e) { console.error('site arena mount error:', e) }
    }

    // 🏟️ تحدي ارينا — /u/:code/arena-challenge (systems/siteArenaChallenge.js)
    // نفس أرينا البوت (فريق/رتب/متجر/ترتيب) بمعركة فريق 3 ضد 3 بنمط BBS
    if (opts.arenaChallenge) {
        try {
            opts.arenaChallenge.mount(app, {
                auth, jsonBody, securityHeaders, CODE_RE, html404, ownerSession, esc,
                navDrawerHTML, NAV_BTN, charView: siteCharView
            })
        } catch (e) { console.error('site arena challenge mount error:', e) }
    }

    // 🎡 عجلة الحظ اليومية — /u/:code/wheel (systems/siteWheel.js)
    if (opts.wheel) {
        try {
            opts.wheel.mount(app, {
                auth, jsonBody, securityHeaders, CODE_RE, html404, ownerSession, esc,
                navDrawerHTML, NAV_BTN
            })
        } catch (e) { console.error('site wheel mount error:', e) }
    }

    // 📖 كتاب المجموعة — /u/:code/book (systems/siteCodexBook.js)
    if (opts.codexBook) {
        try {
            opts.codexBook.mount(app, {
                auth, jsonBody, securityHeaders, CODE_RE, html404, ownerSession, esc,
                navDrawerHTML, NAV_BTN, shellHead
            })
        } catch (e) { console.error('site codex book mount error:', e) }
    }

    // صور .استبدال المحلية
    app.use('/custom_images', express.static(path.join(__dirname, '..', 'custom_images'), { maxAge: '1d' }))
    // صور الكتالوج المحلية (./characters/xxx.jpg) — تُعرض فقط بصفحة السحب للرتب تحت SSS
    app.use('/characters', express.static(path.join(__dirname, '..', 'characters'), { maxAge: '1d', index: false, dotfiles: 'ignore' }))
    // 🔊 أصوات الزعماء (systems/bossVoice.js) — الملفات في ./boss_voices
    try {
        require('./bossVoice').mountBossVoice(app, express, {
            dir: path.join(__dirname, '..', 'boss_voices'),
            bosses: require('../bosses')
        })
    } catch (e) { console.error('boss voice mount error:', e) }
    // 🔔 إشعارات الهاتف: /sw.js و /manifest.webmanifest و /push/*
    if (bossPush) {
        try { bossPush.mount(app, { express, auth }) } catch (e) { console.error('boss push mount error:', e) }
    }

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
                .select('userId name username characters weaponsInventory giftInbox sessionVersion money xp level titles activeTitle')
                .lean()
            if (!player) return html404(res)

            const title = player.username || player.name || 'شخصياتي'
            const sess = ownerSession(req, player)
            const all = sortChars(player.characters || [])

            // الشاشة الأولى: مشاهدة فقط / تسجيل دخول
            if (!sess && !auth.hasViewOnly(req)) {
                return res.send(gateHTML({ code, title, total: all.length }))
            }

            // خانات التصفية (الكل / المطوّرة / أوميقا / EX / UR / SSS+ ... / أسطوري / ممتاز / عادي)
            const F = HOME_FILTERS.find(f => f.k === String(req.query.t || 'all')) || HOME_FILTERS[0]
            // 👥 جاي من صفحة اللاعبين: pb = كود صفحة الزائر لزر الرجوع
            const pb = (!sess && CODE_RE.test(String(req.query.pb || ''))) ? String(req.query.pb) : null
            const withPb = u => pb ? u + (u.includes('?') ? '&' : '?') + 'pb=' + pb : u
            const catIdx = getCatalogIndex(getCatalog)
            // الرقم يبقى رقم الشخصية الحقيقي بقائمتك (حتى مع التصفية)
            const numbered = all.map((c, i) => ({ c, num: i + 1 }))
            const filtered = numbered.filter(x => F.test(x.c))

            const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
            const page = Math.min(pages, Math.max(1, parseInt(req.query.page, 10) || 1))
            const offset = (page - 1) * PAGE_SIZE
            const items = filtered.slice(offset, offset + PAGE_SIZE)
                .map(x => ({
                    ...resolveDisplayChar(x.c, catIdx),
                    __num: x.num,
                    __weapon: (player.weaponsInventory || []).find(w => w && w.equippedTo === x.c.name) || null
                }))

            const chips = HOME_FILTERS.map(f => ({
                k: f.k,
                label: f.label,
                n: all.filter(f.test).length,
                on: f.k === F.k,
                href: withPb(`/u/${code}${f.k === 'all' ? '' : '?t=' + f.k}`)
            }))

            const topCount = all.filter(c => {
                const t = TIERS[HOME_TIER_KEY(c)]
                return t && t.idx >= FIRST_IMAGE_TIER
            }).length
            const stats = [
                [all.length, 'شخصية في مجموعتك'],
                [topCount, 'شخصية SSS وما فوق'],
                [all.filter(c => (Number(c.evolutionLevel) || 0) > 0).length, 'شخصية مطوّرة'],
                [all.filter(c => HOME_TIER_KEY(c) === 'Ω OMEGA').length, 'شخصية أوميقا Ω', 'om']
            ]

            // بطاقة اللاعب: المستوى + شريط الخبرة (نفس مصدر أمر البوت)
            const level = Number(player.level) || 1
            let need = 0
            try { need = Number(Player.xpForLevel(level)) || 0 } catch (_) { need = 0 }
            const maxLv = Number(Player.MAX_LEVEL) || 0
            const xpPct = (maxLv && level >= maxLv) ? 100
                : (need > 0 ? Math.max(0, Math.min(100, Math.round((Number(player.xp) || 0) / need * 100))) : 0)
            const firstChar = all[0] ? resolveDisplayChar(all[0], catIdx) : null
            const hero = {
                level, xpPct,
                img: firstChar ? safeImageUrl(firstChar.image) : null,
                money: Number(player.money || 0).toLocaleString('en-US'),
                t: TITLES.compactOf(player) // 🏅 اللقب المفعّل
            }

            const viewer = sess
                ? {
                    isOwner: true,
                    name: player.name || player.username || 'لاعب',
                    csrf: auth.csrfForSession(sess),
                    gifts: prepareGifts(player.giftInbox, catIdx)
                        .concat(await kingdom.getUnseenRewards(player.userId).then(prepareRewardGifts).catch(() => []))
                        .concat(prepareRewardGifts((player.giftInbox || []).filter(g => g && g.kind === 'reward' && !g.seen)))
                        .sort((a, b) => (a.at || 0) - (b.at || 0))
                }
                : { isOwner: false }

            res.send(pageHTML({
                title, total: all.length, counts: [], items, page, pages,
                base: withPb(`/u/${code}${F.k === 'all' ? '' : '?t=' + F.k}`),
                viewer, code, hero, stats, chips,
                backTo: pb ? `/u/${pb}/players` : null
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

            const all = sortChars(player.characters || [])
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
                .select('userId name username characters sessionVersion pulls lastReset sssPity maxCharacters bonusPulls')
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
                    bonus: Number(r.bonusLeft) || 0,
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

    // ─────────────── 🌌 بنر الأسبوع (نفس .بنر و .سحب_بنر بالواتس) ───────────────
    // شكل آمن للمتصفح: حقول محددة فقط + روابط صور مفلترة. العنوان = ability شخصية البنر الحالية.
    function bannerDataOut(info, player) {
        const catIdx = getCatalogIndex(getCatalog)
        const b = info.banner || {}
        const disp = resolveDisplayChar(b, catIdx)
        return {
            banner: {
                name: String(disp.name || b.name || ''),
                anime: String(disp.anime || b.anime || ''),
                power: Number(disp.power) || 0,
                ability: String(b.ability || disp.ability || ''),
                img: safeImageUrl(disp.image) || localCharImageUrl(disp.image) || null
            },
            endsAt: Number(info.endsAt) || 0,
            orbs: Number(info.orbs) || 0,
            pity: Number(info.pity) || 0,
            guaranteed: !!info.guaranteed,
            next: info.next && info.next.kind
                ? { kind: info.next.kind === 'next' ? 'next' : 'vote', name: String(info.next.name || '') }
                : null,
            cfg: {
                pullCost: Number(info.cfg.pullCost) || 0, multiCount: Number(info.cfg.multiCount) || 10, multiCost: Number(info.cfg.multiCost) || 0,
                sssRate: Number(info.cfg.sssRate) || 0, softPity: Number(info.cfg.softPity) || 0, hardPity: Number(info.cfg.hardPity) || 0,
                featured: Number(info.cfg.featured) || 0, legendary: Number(info.cfg.legendary) || 0, excellent: Number(info.cfg.excellent) || 0
            },
            count: (player.characters || []).length,
            cap: Number(player.maxCharacters) || 30
        }
    }

    app.get('/u/:code/banner', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)

            const player = await Player.findOne({ siteCode: code })
                .select('userId name username characters sessionVersion maxCharacters')
                .lean()
            if (!player) return html404(res)

            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)

            if (typeof bannerInfo !== 'function') return res.status(503).send('البنر من الموقع غير مفعّل حالياً.')

            const info = await bannerInfo({ userId: player.userId })
            if (!info || !info.ok) return res.status(503).send(info && info.code === 'NO_BANNER' ? 'لا يوجد بنر حالياً.' : 'تعذر تحميل البنر، حاول بعد قليل.')

            res.send(bannerPageHTML({
                viewer: { name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) },
                code,
                data: bannerDataOut(info, player)
            }))
        } catch (err) {
            console.error('banner page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    app.post('/banner/pull', jsonBody, async (req, res) => {
        const g = await tradeGuard(req, res, bannerPull)
        if (!g || !g.sess) return
        try {
            const count = parseInt(g.body.count, 10)
            const r = await bannerPull({ userId: g.sess.u, count })
            if (!r.ok) {
                const status = r.code === 'BUSY' ? 409 : r.code === 'SERVER' ? 500 : r.code === 'OFFLINE' ? 503 : 400
                const extra = {}
                if (r.code === 'NO_ORBS') extra.state = { orbs: Number(r.have) || 0 }
                return g.fail(status, r.code, bannerErrorMessage(r), extra)
            }

            const catIdx = getCatalogIndex(getCatalog)
            const cards = (r.results || []).map(x => ({
                ...pullCardData(resolveDisplayChar(x.character, catIdx)),
                featured: !!x.featured,
                pityAt: Number(x.pityAt) || 0
            }))

            res.json({
                ok: true,
                cards,
                notes: (r.worldTexts || []).map(String),
                state: {
                    orbs: Number(r.orbs) || 0,
                    pity: Number(r.pity) || 0,
                    guaranteed: !!r.guaranteed,
                    count: Number(r.charCount) || 0,
                    cap: Number(r.capacity) || 30
                }
            })
        } catch (err) {
            console.error('banner pull route error:', err)
            return g.fail(500, 'SERVER', BANNER_ERRORS.SERVER)
        }
    })

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

            const all = sortChars(player.characters || [])
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

    // ─────────────── 🧩 الشظايا + 💎 التطوير + ♻️ الاسترجاع (نفس .شظايا / .تطوير / .استرجاع بالواتس) ───────────────
    // كل المنطق بـ systems/shardSystem.js (منقول من index.js بدون أي تغيير). هنا فقط: صفحة + مسارات آمنة.
    const shardSystem = opts.shardSystem
    const shardPollHits = new Map()
    function shardPollRate(userId) {
        const now = Date.now()
        const arr = (shardPollHits.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 30) { shardPollHits.set(userId, arr); return false }
        arr.push(now); shardPollHits.set(userId, arr); return true
    }

    // رابط صورة آمن (https أو custom_images محوّل لرابط كامل) — نفس أسلوب siteCharView
    function shardImg(c, req) {
        if (!c) return null
        const disp = resolveDisplayChar(c, getCatalogIndex(getCatalog))
        let img = safeImageUrl(disp.image)
        if (img && img.startsWith('/') && req) {
            const proto = String(req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim()
            img = `${proto}://${req.get('host')}${img}`
        }
        return img || null
    }

    // شكل آمن للمتصفح من ناتج shardSystem.getState (حقول محددة فقط)
    function shardOut(st, req) {
        const catIdx = getCatalogIndex(getCatalog)
        const animeOf = c => { try { return String(resolveDisplayChar(c || {}, catIdx).anime || (c && c.anime) || '') } catch (e) { return '' } }
        return {
            ok: true,
            money: Number(st.money) || 0,
            omegaUsed: Number(st.omegaUsed) || 0,
            maxOmega: Number(st.maxOmega) || 10,
            shards: (st.shards || []).map(s => {
                const src = s.owned || s.cat || null
                return {
                    key: String(s.key),
                    name: String(s.name),
                    anime: animeOf(src),
                    amount: Number(s.amount) || 0,
                    target: Number(s.target) || 2,
                    omega: !!s.omega,
                    lv: s.owned ? Math.min(6, Math.max(0, Number(s.owned.evolutionLevel) || 0)) : 0,
                    img: shardImg(src, req)
                }
            }),
            evo: (st.evo || []).map(e => ({
                index: Number(e.index),
                name: String(e.char.name),
                anime: animeOf(e.char),
                level: Number(e.level) || 0,
                power: Number(e.char.power) || 0,
                have: Number(e.have) || 0,
                need: Number(e.need) || 2,
                cost: Number(e.cost) || 0,
                nextPower: Number(e.nextPower) || 0,
                blocked: !!e.blocked,
                omegaLimit: !!e.omegaLimit,
                img: shardImg(e.char, req)
            }))
        }
    }

    const shardStatus = code => code === 'BUSY' ? 409 : code === 'SERVER' ? 500 : 400

    app.get('/u/:code/shards', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)

            const player = await Player.findOne({ siteCode: code })
                .select('userId name username sessionVersion').lean()
            if (!player) return html404(res)

            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)
            if (!shardSystem) return res.status(503).send('صفحة الشظايا غير مفعّلة حالياً')

            const st = await shardSystem.getState(player.userId)
            if (!st.ok) return res.status(500).send('خطأ بالخادم')

            res.send(shardPageHTML({
                viewer: { name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) },
                code,
                state: shardOut(st, req),
                navDrawerHTML, NAV_BTN, titlesHead: TITLES.HEAD
            }))
        } catch (err) {
            console.error('shards page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    // إعادة قراءة الحالة بعد كل عملية (الواجهة ما تحسب شيء بنفسها)
    app.get('/shards/state', async (req, res) => {
        res.set('Cache-Control', 'no-store')
        try {
            if (!shardSystem || !auth.authEnabled()) return res.status(503).json({ ok: false, message: 'غير مفعّل حالياً' })
            const sess = auth.readSession(req)
            if (!sess) return res.status(401).json({ ok: false })
            if (!shardPollRate(sess.u)) return res.status(429).json({ ok: false, message: 'طلبات كثيرة، انتظر قليلاً.' })
            const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
            if (!me || (me.sessionVersion || 0) !== sess.v) return res.status(401).json({ ok: false })
            const st = await shardSystem.getState(sess.u)
            if (!st.ok) return res.status(400).json({ ok: false, code: st.code, message: st.message })
            res.json(shardOut(st, req))
        } catch (err) {
            console.error('shards state error:', err)
            res.status(500).json({ ok: false, message: '❌ حدث خطأ بالخادم، حاول مرة ثانية.' })
        }
    })

    // 💎 .تطوير رقم
    app.post('/shards/evolve', jsonBody, async (req, res) => {
        const g = await tradeGuard(req, res, shardSystem && shardSystem.evolveCharacter)
        if (!g || !g.sess) return
        try {
            const idx = Number(g.body.index)
            const name = typeof g.body.name === 'string' ? g.body.name.slice(0, 120) : ''
            if (!Number.isInteger(idx) || idx < 0 || idx > 100000 || !name) return g.fail(400, 'BAD_INDEX', '❌ اختيار غير صحيح، حدّث الصفحة.')

            const r = await shardSystem.evolveCharacter({ userId: g.sess.u, index: idx, name })
            if (!r.ok) return g.fail(shardStatus(r.code), r.code, String(r.message || '❌ تعذّر التطوير'))
            res.json({
                ok: true,
                omega: !!r.omega,
                name: String(r.name),
                oldRank: String(r.oldRank), newRank: String(r.newRank), newLevel: Number(r.newLevel) || 0,
                power: Number(r.power) || 0, cost: Number(r.cost) || 0, shardsUsed: Number(r.shardsUsed) || 0,
                abilities: (r.abilities || []).map(a => ({ name: String(a.name || ''), description: String(a.description || '') })),
                omegaUsed: r.omegaUsed != null ? Number(r.omegaUsed) : undefined,
                maxOmega: r.maxOmega != null ? Number(r.maxOmega) : undefined,
                worldText: String(r.worldText || ''),
                message: String(r.message || '')
            })
        } catch (err) {
            console.error('shards evolve route error:', err)
            return g.fail(500, 'SERVER', '❌ حدث خطأ بالخادم، حاول مرة ثانية.')
        }
    })

    // ♻️ .استرجاع رقم (المفتاح = نفس شظية القائمة؛ الخادم يعيد بناء القائمة ويطابقه)
    app.post('/shards/restore', jsonBody, async (req, res) => {
        const g = await tradeGuard(req, res, shardSystem && shardSystem.restoreShard)
        if (!g || !g.sess) return
        try {
            const key = typeof g.body.key === 'string' ? g.body.key : ''
            if (!key || key.length > 200) return g.fail(400, 'BAD_INDEX', '❌ رقم غير صحيح')

            const r = await shardSystem.restoreShard({ userId: g.sess.u, key })
            if (!r.ok) return g.fail(shardStatus(r.code), r.code, String(r.message || '❌ تعذّر الاسترجاع'))
            res.json({
                ok: true,
                name: String(r.name),
                left: Number(r.left) || 0,
                target: Number(r.target) || 2,
                message: String(r.message || '')
            })
        } catch (err) {
            console.error('shards restore route error:', err)
            return g.fail(500, 'SERVER', '❌ حدث خطأ بالخادم، حاول مرة ثانية.')
        }
    })

    // ─────────────── 🏪 متجر الشخصيات (نفس .متجر / .شراءمتجر بالواتس) ───────────────
    // الشراء عبر systems/characterShopSystem.js: حجز ذري للعرض (لاعب واحد فقط يشتريه) + دفع ذري
    const shopSystem = opts.shopSystem
    const shopPollHits = new Map()
    function shopPollRate(userId) {
        const now = Date.now()
        const arr = (shopPollHits.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 30) { shopPollHits.set(userId, arr); return false }
        arr.push(now); shopPollHits.set(userId, arr); return true
    }

    function shopErrorMessage(r) {
        const E = (shopSystem && shopSystem.ERRORS) || {}
        if (r.code === 'NO_MONEY' && r.need != null && r.have != null) {
            return `${E.NO_MONEY || '❌ لا تملك مالاً كافياً'}\n💰 المطلوب: ${Number(r.need).toLocaleString('en-US')}\n💳 رصيدك: ${Number(r.have).toLocaleString('en-US')}`
        }
        return E[r.code] || E.SERVER || '❌ حدث خطأ أثناء الشراء'
    }

    app.get('/u/:code/shop', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)

            const player = await Player.findOne({ siteCode: code })
                .select('userId name username money sessionVersion').lean()
            if (!player) return html404(res)

            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)
            if (!shopSystem) return res.status(503).send('المتجر غير مفعّل حالياً')

            const list = await shopSystem.listShop()
            res.send(shopPageHTML({
                viewer: { name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) },
                code,
                items: list.map(d => shopItemOut(d, getCatalogIndex(getCatalog))),
                money: Number(player.money) || 0,
                msLeft: shopSystem.msUntilNextHour()
            }))
        } catch (err) {
            console.error('shop page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    // حالة المتجر الحيّة (تُستدعى كل ثواني من الصفحة: عروض متبقية + رصيدك + الوقت لرأس الساعة)
    app.get('/shop/state', async (req, res) => {
        res.set('Cache-Control', 'no-store')
        try {
            if (!shopSystem || !auth.authEnabled()) return res.status(503).json({ ok: false })
            const sess = auth.readSession(req)
            if (!sess) return res.status(401).json({ ok: false })
            if (!shopPollRate(sess.u)) return res.status(429).json({ ok: false })
            const me = await Player.findOne({ userId: sess.u }).select('money sessionVersion').lean()
            if (!me || (me.sessionVersion || 0) !== sess.v) return res.status(401).json({ ok: false })
            const list = await shopSystem.listShop()
            res.json({
                ok: true,
                money: Number(me.money) || 0,
                msLeft: shopSystem.msUntilNextHour(),
                items: list.map(d => shopItemOut(d, getCatalogIndex(getCatalog)))
            })
        } catch (err) {
            console.error('shop state error:', err)
            res.status(500).json({ ok: false })
        }
    })

    app.post('/shop/buy', jsonBody, async (req, res) => {
        const g = await tradeGuard(req, res, shopSystem && shopSystem.buyShopItem)
        if (!g || !g.sess) return
        try {
            const id = String(g.body.id || '')
            if (!/^[a-f0-9]{24}$/.test(id)) return g.fail(400, 'BAD_ID', shopErrorMessage({ code: 'BAD_ID' }))

            const r = await shopSystem.buyShopItem({ userId: g.sess.u, shopId: id })
            if (!r.ok) {
                const status = r.code === 'SOLD_OUT' ? 409 : r.code === 'SERVER' ? 500 : 400
                return g.fail(status, r.code, shopErrorMessage(r))
            }
            res.json({
                ok: true,
                id: r.id,
                money: r.money,
                message: `✅ تم شراء ${r.name} (${r.rarity}) بسعر ${Number(r.price).toLocaleString('en-US')} — رصيدك ${Number(r.money).toLocaleString('en-US')}`
            })
        } catch (err) {
            console.error('shop buy route error:', err)
            return g.fail(500, 'SERVER', shopErrorMessage({ code: 'SERVER' }))
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
    // 🏅 يلصق اللقب المفعّل (t) بصفوف فيها userId أو اسم فقط (ترتيب الزعيم/الرايد). الاسم المكرّر = بلا لقب (تفادي الالتباس)
    async function attachTitles(rows, selfId) {
        try {
            const arr = (rows || []).filter(r => r && typeof r === 'object')
            if (!arr.length) return rows
            const idOf = r => r.userId || r.uid || (typeof r.id === 'string' && r.id.includes('@') ? r.id : null)
            const ids = [...new Set(arr.map(idOf).filter(x => typeof x === 'string' && x.length < 80))]
            if (selfId) ids.push(selfId)
            const names = [...new Set(arr.filter(r => !idOf(r) && r.name).map(r => String(r.name).slice(0, 80)))]
            const or = []
            if (ids.length) or.push({ userId: { $in: ids } })
            if (names.length) { or.push({ name: { $in: names } }); or.push({ username: { $in: names.map(n => n.replace(/^@/, '')) } }) }
            if (!or.length) return rows
            const docs = await Player.find({ $or: or }).select('userId name username titles activeTitle').lean()
            const byId = new Map(docs.map(d => [d.userId, d]))
            const byName = new Map()
            for (const d of docs) for (const k of [d.name, d.username, d.username ? '@' + d.username : null]) {
                if (!k) continue
                const a = byName.get(k) || []
                if (!a.includes(d)) a.push(d)
                byName.set(k, a)
            }
            for (const r of arr) {
                let d = idOf(r) ? byId.get(idOf(r)) : null
                if (!d && r.isMe && selfId) d = byId.get(selfId) || null
                if (!d && r.name) { const a = byName.get(String(r.name)); if (a && a.length === 1) d = a[0] }
                r.t = d ? TITLES.compactOf(d) : null
            }
        } catch (e) { console.error('attachTitles error:', e) }
        return rows
    }

    async function bossStateOut(st, selfId) {
        if (st && st.board) await attachTitles(st.board.rows, selfId)
        const catIdx = getCatalogIndex(getCatalog)
        return {
            open: st.open,
            cooldownMs: st.cooldownMs,
            boss: st.boss ? {
                name: st.boss.name, img: safeImageUrl(st.boss.image),
                hp: st.boss.hp, maxHp: st.boss.maxHp, enraged: st.boss.enraged, finished: st.boss.finished,
                respawnInMs: st.boss.respawnInMs,
                firstHitAgoMs: st.boss.firstHitAgoMs == null ? null : st.boss.firstHitAgoMs,
                followers: (st.boss.followers || []).map(f => ({ name: f.name, hp: f.hp, img: safeImageUrl(f.image) }))
            } : null,
            me: st.me,
            board: st.board ? {
                crowd: (st.board.crowd || []).map(r => {
                    const d = r.first ? resolveDisplayChar(r.first, catIdx) : null
                    const tk = d ? resolveTierKey(d.rarity, d.evolutionLevel) : null
                    return { name: String(r.name || 'لاعب'), damage: Number(r.damage) || 0, me: !!r.isMe,
                        img: d ? safeImageUrl(d.image) : null, color: tk && TIERS[tk] ? TIERS[tk].color : null }
                }),
                online: Number(st.board.online) || 0,
                myRank: st.board.myRank || null,
                rows: (st.board.rows || []).map(r => {
                    const d = r.first ? resolveDisplayChar(r.first, catIdx) : null
                    const tk = d ? resolveTierKey(d.rarity, d.evolutionLevel) : null
                    return {
                        name: String(r.name || 'لاعب'), damage: Number(r.damage) || 0, hits: Number(r.hits) || 0,
                        active: !!r.active, me: !!r.isMe, t: r.t || null,
                        img: d ? safeImageUrl(d.image) : null,
                        color: tk && TIERS[tk] ? TIERS[tk].color : null
                    }
                })
            } : null,
            characters: (st.characters || []).map(c => {
                const disp = resolveDisplayChar(c, catIdx)
                const tk = resolveTierKey(disp.rarity, disp.evolutionLevel)
                return { index: c.index, name: c.name, power: c.power, img: safeImageUrl(disp.image), tier: tk, color: TIERS[tk] ? TIERS[tk].color : null }
            })
        }
    }

    function bossEventsOut(events, viewerId) {
        return (events || []).map(e => {
            const out = {
                id: e.id, type: e.type, anim: e.anim, title: e.title,
                lines: (e.lines || []).map(String), amount: e.amount,
                img: safeImageUrl(e.image)
            }
            if (e.type === 'follower_hit') {
                out.attacker = String(e.attacker || '')
                out.follower = String(e.follower || '')
                out.crit = !!e.crit
                out.dead = !!e.dead
                out.mine = !!viewerId && e.by === viewerId
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
                    state: await bossStateOut(st, player.userId),
                    feed: bossEventsOut(bossAttack.getFeed(Math.max(0, bossAttack.latestFeedId() - 15)), player.userId),
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
            res.json({ ok: true, state: await bossStateOut(st, sess.u), feed: bossEventsOut(bossAttack.getFeed(since), sess.u) })
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


    // ─────────────── غزو المملكة (نفس منطق .غزو بالبوت) ───────────────
    const { kingdomPageHTML } = require('./kingdomPage')
    const kingdomHits = new Map()
    function kingdomRate(userId) {
        const now = Date.now()
        const arr = (kingdomHits.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 30) { kingdomHits.set(userId, arr); return false }
        arr.push(now); kingdomHits.set(userId, arr); return true
    }

    app.get('/u/:code/kingdom', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)

            const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion').lean()
            if (!player) return html404(res)

            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)
            if (!kingdomRaid) return res.status(503).send('غزو المملكة من الموقع غير مفعّل حالياً.')

            const st = await kingdomRaid.getState(player.userId)
            if (!st) return html404(res)

            const catIdx = getCatalogIndex(getCatalog)
            const chars = st.characters.map(({ i, ch }) => {
                const d = resolveDisplayChar(ch, catIdx)
                return { i, name: String(ch.name || ''), power: Number(ch.power) || 0, img: safeImageUrl(d.image) || '', emoji: '⚔️' }
            }).sort((a, b) => b.power - a.power || a.i - b.i)

            res.send(kingdomPageHTML({
                code,
                data: {
                    stages: kingdomRaid.STAGES.map(s => [s.name, s.power, s.reward]),
                    chars,
                    state: st.state,
                    csrf: auth.csrfForSession(sess),
                    companion: st.companion
                }
            }))
        } catch (err) {
            console.error('kingdom page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    app.post('/kingdom/attack', jsonBody, async (req, res) => {
        res.set('Cache-Control', 'no-store')
        const fail = (status, code, message, extra = {}) => res.status(status).json({ ok: false, code, message, ...extra })
        try {
            if (!kingdomRaid || !auth.authEnabled()) return fail(503, 'DISABLED', 'غزو المملكة من الموقع غير مفعّل حالياً.')
            if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')

            const sess = auth.readSession(req)
            if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

            const b = req.body || {}
            if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
            if (!kingdomRate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')

            const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
            if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

            const r = await kingdomRaid.attack({ userId: sess.u, charIndex: b.index })
            if (!r.ok) {
                const status = r.code === 'BUSY' ? 409 : r.code === 'SERVER' ? 500 : 400
                return fail(status, r.code, r.message || 'فشل الغزو', { power: r.power, need: r.need, state: r.state })
            }
            res.json(r)
        } catch (err) {
            console.error('kingdom attack route error:', err)
            return fail(500, 'SERVER', 'خطأ بالخادم')
        }
    })

    // ─────────────── الغزو العالمي (الرايد) — نفس منطق raidBattle.js حرفياً ───────────────
    // الصفحة: systems/raidPage.html (نفس تصميم raid-battle-2d5.html) · الوسيط: systems/raidSite.js
    // الهجوم من الموقع يستدعي attackRaid() الأصلي نفسه بدون أي تعديل (كولداون 30ث، ضرر، باسف، قدرات، مراحل، جوائز).
    let raidSite = null
    let raidPageHTML = null
    try {
        raidPageHTML = require('./raidPage').raidPageHTML
        raidSite = require('./raidSite').createRaidSite({
            Player,
            getSock: raidSock,
            charImage: (ch, req) => {
                const disp = resolveDisplayChar(ch || {}, getCatalogIndex(getCatalog))
                let img = safeImageUrl(disp.image)
                if (img && img.startsWith('/') && req) {
                    const proto = String(req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim()
                    img = `${proto}://${req.get('host')}${img}`
                }
                return img || ''
            }
        })
    } catch (e) { console.error('raid site init error:', e) }

    const raidStateHits = new Map()
    const raidAttackHits = new Map()
    function raidRate(map, userId, max) {
        const now = Date.now()
        const arr = (map.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= max) { map.set(userId, arr); return false }
        arr.push(now); map.set(userId, arr); return true
    }

    app.get('/u/:code/raid', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)

            const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion').lean()
            if (!player) return html404(res)

            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)
            if (!raidSite || !raidPageHTML) return res.status(503).send('الغزو العالمي من الموقع غير مفعّل حالياً.')

            const st = await raidSite.getState(player.userId, req)
            if (!st) return html404(res)
            if (Array.isArray(st.board)) await attachTitles(st.board, player.userId) // 🏅 ألقاب ترتيب الرايد

            res.send(TITLES.inject(raidPageHTML({
                data: { ...st, csrf: auth.csrfForSession(sess), code, loadedAt: Date.now(), board: st.board || [] }
            }), st.board))
        } catch (err) {
            console.error('raid page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    app.get('/raid/state', async (req, res) => {
        res.set('Cache-Control', 'no-store')
        try {
            if (!raidSite || !auth.authEnabled()) return res.status(503).json({ ok: false })
            const sess = await bossSession(req)
            if (!sess) return res.status(401).json({ ok: false })
            if (!raidRate(raidStateHits, sess.u, 60)) return res.status(429).json({ ok: false })
            const st = await raidSite.getState(sess.u, req)
            if (!st) return res.status(404).json({ ok: false })
            if (Array.isArray(st.board)) await attachTitles(st.board, sess.u)
            res.json({ ok: true, ...st, board: st.board || [] })
        } catch (err) {
            console.error('raid state error:', err)
            res.status(500).json({ ok: false })
        }
    })

    app.post('/raid/attack', jsonBody, async (req, res) => {
        res.set('Cache-Control', 'no-store')
        const fail = (status, code, message, extra = {}) => res.status(status).json({ ok: false, code, message, ...extra })
        try {
            if (!raidSite || !auth.authEnabled()) return fail(503, 'DISABLED', 'الغزو العالمي من الموقع غير مفعّل حالياً.')
            if (!auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')

            const sess = auth.readSession(req)
            if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

            const b = req.body || {}
            if (!auth.verifyCsrf(sess, b.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
            if (!raidRate(raidAttackHits, sess.u, 30)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')

            const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
            if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')

            const r = await raidSite.attack(sess.u)
            if (!r.ok) {
                const status = r.code === 'SERVER' ? 500 : r.code === 'COOLDOWN' ? 429 : 400
                return fail(status, r.code, r.message || 'فشل الهجوم', r.retryInMs != null ? { retryInMs: r.retryInMs } : {})
            }
            res.json(r)
        } catch (err) {
            console.error('raid attack route error:', err)
            return fail(500, 'SERVER', 'خطأ بالخادم')
        }
    })

    // ─────────────── سجل الإهداءات ───────────────
    app.get('/u/:code/rewards', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)
            const player = await Player.findOne({ siteCode: code })
                .select('userId name username rewardLog sessionVersion')
                .lean()
            if (!player) return html404(res)
            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)
            const log = (player.rewardLog || []).filter(Boolean).slice().sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 30)
            res.send(rewardsPageHTML({ log, code, csrf: auth.csrfForSession(sess) }))
        } catch (err) {
            console.error('rewards page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

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

    // ─────────────── 🏆 أقوى اللاعبين ───────────────
    // قوة الترتيب = مجموع قوة أول N شخصية بنفس ترتيب .شخصياتي (المخزّن بالمصفوفة)،
    // حيث N = سعة مخزون اللاعب (maxCharacters). الزائد عن المخزون لا يُحسب.
    // مثال: 180 شخصية والمخزون 170 → تُحسب أول 170 فقط.
    // الحساب بتجميع واحد على قاعدة البيانات ويُخزَّن بالذاكرة (TOP_CACHE_MS).
    const CAP_EXPR = { $cond: [{ $gt: [{ $ifNull: ['$maxCharacters', 0] }, 0] }, '$maxCharacters', DEFAULT_CAP] }
    let totalsCache = null   // { at, rows }  rows مرتبة تنازلياً: { _id, userId, name, username, total }
    let totalsPending = null
    let topCache = null      // { at, list }
    let topPending = null

    function getTotals() {
        const now = Date.now()
        if (totalsCache && now - totalsCache.at < TOP_CACHE_MS) return Promise.resolve(totalsCache)
        if (totalsPending) return totalsPending
        totalsPending = (async () => {
            try {
                const rows = await Player.aggregate([
                    { $match: { 'characters.0': { $exists: true } } },
                    {
                        $project: {
                            userId: 1, name: 1, username: 1,
                            total: { $sum: { $slice: [{ $ifNull: ['$characters.power', []] }, CAP_EXPR] } }
                        }
                    },
                    { $match: { total: { $gt: 0 } } },
                    { $sort: { total: -1, _id: 1 } }
                ]).allowDiskUse(true)
                totalsCache = { at: Date.now(), rows }
                return totalsCache
            } catch (err) {
                if (totalsCache) return totalsCache // لو فشل التحديث نعرض آخر نسخة بدل الخطأ
                throw err
            } finally {
                totalsPending = null
            }
        })()
        return totalsPending
    }

    function getTopList() {
        if (topPending) return topPending
        topPending = (async () => {
            try {
                const snap = await getTotals()
                if (topCache && topCache.at === snap.at) return topCache

                const head = snap.rows.slice(0, TOP_LIMIT)
                const tops = head.length ? await Player.aggregate([
                    { $match: { _id: { $in: head.map(r => r._id) } } },
                    {
                        $addFields: {
                            top: {
                                $reduce: {
                                    input: '$characters',
                                    initialValue: null,
                                    in: {
                                        $cond: [
                                            { $gt: [{ $ifNull: ['$$this.power', 0] }, { $ifNull: ['$$value.power', -1] }] },
                                            '$$this',
                                            '$$value'
                                        ]
                                    }
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            'top.name': 1, 'top.rarity': 1, 'top.form': 1, 'top.evolutionLevel': 1,
                            'top.image': 1, 'top.customImage': 1, 'top.power': 1
                        }
                    }
                ]).allowDiskUse(true) : []
                const topMap = new Map(tops.map(t => [String(t._id), t.top]))

                const list = head.map(r => ({
                    userId: r.userId, name: r.name, username: r.username, total: r.total,
                    top: topMap.get(String(r._id)) || null
                }))
                topCache = { at: snap.at, list }
                return topCache
            } catch (err) {
                if (topCache) return topCache
                throw err
            } finally {
                topPending = null
            }
        })()
        return topPending
    }

    // ترتيب لاعب خارج الأول 30 = عدد اللاعبين الأقوى منه + 1 (من نفس القائمة المحسوبة بحدّ المخزون)
    async function getOutsideRank(userId, total) {
        const snap = await getTotals()
        let n = 0
        for (const r of snap.rows) {
            if (r.total > total) n++
            else break // القائمة مرتبة تنازلياً
        }
        return n + 1
    }

    function agoText(ms) {
        const m = Math.floor(ms / 60000)
        if (m < 1) return 'الآن'
        if (m === 1) return 'قبل دقيقة'
        if (m === 2) return 'قبل دقيقتين'
        return `قبل ${m} ${m <= 10 ? 'دقائق' : 'دقيقة'}`
    }

    app.get('/u/:code/top', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)

            const player = await Player.findOne({ siteCode: code })
                .select('userId name username characters maxCharacters sessionVersion')
                .lean()
            if (!player) return html404(res)

            // نفس شرط الصفحة الرئيسية: مالك مسجّل أو مشاهدة فقط، وإلا الشاشة الأولى
            const sess = ownerSession(req, player)
            if (!sess && !auth.hasViewOnly(req)) return res.redirect(303, `/u/${code}`)

            // تبويبات القروبات: ?g=tsuki|yama|nakama (بدونها = الترتيب العام)
            const gTabs = kingdom.getTabs()
            const grp = gTabs.find(t => t.k === String(req.query.g || '')) || null
            const tabs = gTabs.length
                ? [{ label: '🏆 العام', color: '#f0c04a', on: !grp, href: `/u/${code}/top` }]
                    .concat(gTabs.map(t => ({ label: t.label, color: t.color, on: !!grp && grp.k === t.k, href: `/u/${code}/top?g=${t.k}` })))
                : []
            const snap = grp ? await kingdom.getBoard(grp.k) : await getTopList()
            const catIdx = getCatalogIndex(getCatalog)
            const tMap = await TITLES.lookupMany(Player, snap.list.map(d => d.userId).concat(player.userId)) // 🏅 ألقاب اللاعبين

            const toEntry = (d, i) => {
                const disp = resolveDisplayChar(d.top || {}, catIdx)
                const tier = TIERS[resolveTierKey(disp.rarity, disp.evolutionLevel)] || TIERS['عادي']
                return {
                    rank: i + 1,
                    who: d.username ? '@' + d.username : (d.name || 'لاعب'),
                    charName: String(disp.name || '—'),
                    tier: tier.key,
                    color: tier.color,
                    // الصورة من SSS وفوق فقط (مثل بقية الموقع)
                    img: tier.idx >= FIRST_IMAGE_TIER ? safeImageUrl(disp.image) : null,
                    total: Number(d.total) || 0,
                    isMe: d.userId === player.userId,
                    t: tMap.get(d.userId) || null
                }
            }
            const entries = snap.list.map(toEntry)

            // ترتيب صاحب الصفحة (للشريط السفلي)
            const myTotal = cappedPower(player) // أول N شخصية (بترتيب .شخصياتي) حسب سعة المخزون
            const myIdx = snap.list.findIndex(d => d.userId === player.userId)
            let myRank = null
            if (myIdx >= 0) myRank = myIdx + 1
            else if (!grp && myTotal > 0) myRank = await getOutsideRank(player.userId, myTotal)
            const me = {
                rank: myRank,
                total: myIdx >= 0 ? Number(snap.list[myIdx].total) || 0 : myTotal,
                who: player.username ? '@' + player.username : (player.name || 'لاعب'),
                t: tMap.get(player.userId) || null
            }

            const viewer = sess
                ? { isOwner: true, name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) }
                : { isOwner: false }

            res.send(topPageHTML({
                code, viewer,
                podium: entries.slice(0, 3),
                rows: entries.slice(3),
                me,
                updatedText: grp ? 'يتجدد يومياً 1:00 ص' : agoText(Date.now() - snap.at),
                tabs,
                subText: grp ? `ترتيب أعضاء قروب ${grp.label} فقط، أول ${kingdom.TOP_GROUP_LIMIT} لاعب` : null,
                emptyText: grp ? `لا يوجد لاعبون في قروب ${grp.label} بعد.` : null
            }))
        } catch (err) {
            console.error('top players page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    // ─────────────── ⚔️ حرب الأعلام  /u/:code/war ───────────────
    // كل المنطق بـ systems/warSystem.js (حالة بالذاكرة، حرب واحدة). هنا: صفحة + مسارات آمنة.
    // الصفحة تستطلع /war/state كل ثانية؛ الإجراءات (إنشاء/انضمام/اذهب/إلغاء) POST بحماية CSRF ونفس أصل.
    const warSystem = opts.warSystem
    const warPollHits = new Map()
    function warPollRate(userId) {
        const now = Date.now()
        const arr = (warPollHits.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 120) { warPollHits.set(userId, arr); return false }
        arr.push(now); warPollHits.set(userId, arr); return true
    }
    const warImgCache = new WeakMap()
    function warChar(c, req) {
        if (!c) return null
        if (warImgCache.has(c)) return warImgCache.get(c)
        const o = { n: String(c.name || '?'), p: Number(c.power) || 1, img: shardImg(c, req) }
        warImgCache.set(c, o)
        return o
    }
    function warOut(st, req) {
        if (st.phase === 'none') return { ok: true, phase: 'none', max: st.max }
        return {
            ok: true, phase: st.phase, max: st.max, me: st.me, creator: st.creator, id: st.id,
            cdLeft: st.cdLeft, left: st.left, flags: st.flags, fights: st.fights, eid: st.eid, events: st.events,
            result: st.result,
            players: st.players.map(p => ({
                i: p.i, u: p.u, team: p.team,
                main: warChar(p.main, req), sec: warChar(p.sec, req), cur: warChar(p.cur, req), us: p.us,
                hp: p.hp, alive: p.alive, flag: p.flag, fg: p.fg, cd: p.cd, rs: p.rs,
                kills: p.kills, deaths: p.deaths, captures: p.captures
            }))
        }
    }
    async function warSession(req) {
        const sess = auth.readSession(req)
        if (!sess) return null
        const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
        return me && (me.sessionVersion || 0) === sess.v ? sess : null
    }

    app.get('/u/:code/war', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)
            const player = await Player.findOne({ siteCode: code })
                .select('userId name username sessionVersion').lean()
            if (!player) return html404(res)
            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)
            if (!warSystem) return res.status(503).send('حرب الأعلام غير مفعّلة حالياً')
            res.send(warPageHTML({
                code,
                viewer: { name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) },
                navDrawerHTML, NAV_BTN, titlesHead: TITLES.HEAD
            }))
        } catch (err) {
            console.error('war page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    app.get('/war/state', async (req, res) => {
        res.set('Cache-Control', 'no-store')
        try {
            if (!warSystem || !auth.authEnabled()) return res.status(503).json({ ok: false, message: 'غير مفعّل حالياً' })
            const sess = await warSession(req)
            if (!sess) return res.status(401).json({ ok: false })
            if (!warPollRate(sess.u)) return res.status(429).json({ ok: false, message: 'طلبات كثيرة، انتظر قليلاً.' })
            const since = Math.max(0, parseInt(req.query.since, 10) || 0)
            res.json(warOut(warSystem.getState(sess.u, since), req))
        } catch (err) {
            console.error('war state error:', err)
            res.status(500).json({ ok: false, message: '❌ حدث خطأ بالخادم، حاول مرة ثانية.' })
        }
    })

    // شخصياتك بنفس أرقام .شخصياتي (للاختيار قبل الانضمام)، 24 بالدفعة
    app.get('/war/chars', async (req, res) => {
        res.set('Cache-Control', 'no-store')
        try {
            if (!warSystem || !auth.authEnabled()) return res.status(503).json({ ok: false })
            const sess = await warSession(req)
            if (!sess) return res.status(401).json({ ok: false })
            if (!warPollRate(sess.u)) return res.status(429).json({ ok: false, message: 'طلبات كثيرة، انتظر قليلاً.' })
            const off = Math.max(0, Math.min(100000, parseInt(req.query.o, 10) || 0))
            const doc = await Player.findOne({ userId: sess.u }).select('characters').lean()
            const all = (doc && doc.characters) || []
            const catIdx = getCatalogIndex(getCatalog)
            const chars = all.slice(off, off + 24).map((c, i) => {
                const d = resolveDisplayChar(c, catIdx)
                return { no: off + i + 1, n: String(d.name || c.name || '?'), p: Number(c.power) || 0, img: shardImg(c, req) }
            })
            res.json({ ok: true, chars, more: off + 24 < all.length })
        } catch (err) {
            console.error('war chars error:', err)
            res.status(500).json({ ok: false, message: '❌ حدث خطأ بالخادم.' })
        }
    })

    const warStatus = code => (code === 'BUSY' ? 409 : 400)

    app.post('/war/create', jsonBody, async (req, res) => {
        const g = await tradeGuard(req, res, warSystem && warSystem.create)
        if (!g || !g.sess) return
        try {
            const r = await warSystem.create(g.sess.u)
            if (!r.ok) return g.fail(warStatus(r.code), r.code, String(r.message || '❌ تعذّر إنشاء الحرب'))
            res.json({ ok: true })
        } catch (err) {
            console.error('war create error:', err)
            return g.fail(500, 'SERVER', '❌ حدث خطأ بالخادم، حاول مرة ثانية.')
        }
    })

    app.post('/war/join', jsonBody, async (req, res) => {
        const g = await tradeGuard(req, res, warSystem && warSystem.join)
        if (!g || !g.sess) return
        try {
            // الأرقام مثل .انضم 1 2 (تبدأ من 1)
            const a = Number(g.body.a) - 1, b = Number(g.body.b) - 1
            const r = await warSystem.join(g.sess.u, a, b)
            if (!r.ok) return g.fail(warStatus(r.code), r.code, String(r.message || '❌ تعذّر الانضمام'))
            res.json({ ok: true, team: r.team })
        } catch (err) {
            console.error('war join error:', err)
            return g.fail(500, 'SERVER', '❌ حدث خطأ بالخادم، حاول مرة ثانية.')
        }
    })

    app.post('/war/go', jsonBody, async (req, res) => {
        const g = await tradeGuard(req, res, warSystem && warSystem.go)
        if (!g || !g.sess) return
        try {
            const flag = String(g.body.flag || '').toUpperCase().slice(0, 1)
            const r = warSystem.go(g.sess.u, flag)
            if (!r.ok) return g.fail(400, r.code, String(r.message || '❌ تعذّر التحرك'))
            res.json({ ok: true })
        } catch (err) {
            console.error('war go error:', err)
            return g.fail(500, 'SERVER', '❌ حدث خطأ بالخادم، حاول مرة ثانية.')
        }
    })

    app.post('/war/cancel', jsonBody, async (req, res) => {
        const g = await tradeGuard(req, res, warSystem && warSystem.cancel)
        if (!g || !g.sess) return
        try {
            const r = warSystem.cancel(g.sess.u)
            if (!r.ok) return g.fail(400, r.code, String(r.message || '❌ تعذّر الإلغاء'))
            res.json({ ok: true })
        } catch (err) {
            console.error('war cancel error:', err)
            return g.fail(500, 'SERVER', '❌ حدث خطأ بالخادم، حاول مرة ثانية.')
        }
    })

    // ─────────────── 👥 اللاعبون  /u/:code/players ───────────────
    // دليل اللاعبين اللي فعّلوا رابطهم (.رابط). نفس شرط بقية الصفحات: مالك مسجّل أو مشاهدة فقط.
    // لا يُكشف كود صفحة أي لاعب بالقائمة: كل لاعب له معرّف عام مشتق (مثل المعارض) ويفتح عبر /players/open.
    // القائمة تُحسب بتجميع واحد على قاعدة البيانات وتُخزَّن بالذاكرة (PL_TTL).
    const plHits = new Map()
    function plRate(key) {
        const now = Date.now()
        const arr = (plHits.get(key) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 60) { plHits.set(key, arr); return false }
        arr.push(now); plHits.set(key, arr); return true
    }
    const plId = userId => crypto.createHash('sha256').update('pl:' + String(userId)).digest('hex').slice(0, 12)
    const PL_TTL = 60 * 1000
    const PL_PAGE = 40
    let plSnap = { at: 0, list: [], byId: new Map() }
    let plPending = null
    function playersDirectory() {
        if (Date.now() - plSnap.at < PL_TTL) return Promise.resolve(plSnap)
        if (plPending) return plPending
        plPending = (async () => {
            try {
                const rows = await Player.aggregate([
                    { $match: { siteCode: { $type: 'string', $ne: '' } } },
                    {
                        $addFields: {
                            n: { $size: { $ifNull: ['$characters', []] } },
                            total: { $sum: { $slice: [{ $ifNull: ['$characters.power', []] }, CAP_EXPR] } },
                            first: { $arrayElemAt: [{ $ifNull: ['$characters', []] }, 0] },
                            top: {
                                $reduce: {
                                    input: { $ifNull: ['$characters', []] },
                                    initialValue: null,
                                    in: {
                                        $cond: [
                                            { $gt: [{ $ifNull: ['$$this.power', 0] }, { $ifNull: ['$$value.power', -1] }] },
                                            '$$this',
                                            '$$value'
                                        ]
                                    }
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            userId: 1, name: 1, username: 1, siteCode: 1, level: 1, titles: 1, activeTitle: 1, n: 1, total: 1,
                            'first.name': 1, 'first.rarity': 1, 'first.form': 1, 'first.evolutionLevel': 1, 'first.image': 1, 'first.customImage': 1,
                            'top.name': 1, 'top.rarity': 1, 'top.form': 1, 'top.evolutionLevel': 1, 'top.power': 1
                        }
                    }
                ]).allowDiskUse(true)
                const catIdx = getCatalogIndex(getCatalog)
                const list = []
                const byId = new Map()
                for (const r of rows) {
                    const id = plId(r.userId)
                    let top = null
                    if (r.top && r.top.name) {
                        const d = resolveDisplayChar(r.top, catIdx)
                        const k = resolveTierKey(d.rarity, d.evolutionLevel)
                        const t = TIERS[k] || TIERS['عادي']
                        top = { name: String(d.name || '—'), tier: k === 'Ω OMEGA' ? 'Ω' : String(k), color: String(t.color) }
                    }
                    let av = null
                    if (r.first && r.first.name) av = safeImageUrl(resolveDisplayChar(r.first, catIdx).image)
                    let tw = ''
                    try { tw = String(TITLES.wrap(TITLES.compactOf(r)) || '') } catch (e) { tw = '' }
                    const u = r.username ? '@' + r.username : (r.name || 'لاعب')
                    list.push({
                        id, userId: r.userId, u,
                        ul: (String(r.username || '') + ' ' + String(r.name || '')).toLowerCase(),
                        lv: Number(r.level) || 1, chars: Number(r.n) || 0, pw: Number(r.total) || 0,
                        top, av, tw
                    })
                    byId.set(id, r.siteCode)
                }
                plSnap = { at: Date.now(), list, byId }
                return plSnap
            } catch (err) {
                if (plSnap.at) return plSnap // لو فشل التحديث نعرض آخر نسخة
                throw err
            } finally {
                plPending = null
            }
        })()
        return plPending
    }

    app.get('/u/:code/players', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)
            const player = await Player.findOne({ siteCode: code })
                .select('userId name username sessionVersion').lean()
            if (!player) return html404(res)
            const sess = ownerSession(req, player)
            if (!sess && !auth.hasViewOnly(req)) return res.redirect(303, `/u/${code}`)
            const viewer = sess
                ? { isOwner: true, name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) }
                : { isOwner: false }
            res.send(playersPageHTML({ code, viewer }))
        } catch (err) {
            console.error('players page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    app.get('/players/list', async (req, res) => {
        res.set('Cache-Control', 'no-store')
        try {
            securityHeaders(res)
            const v = await galViewer(req)
            if (!v.ok) return res.status(401).json({ ok: false, message: 'سجّل الدخول أو افتح وضع المشاهدة.' })
            if (!plRate(v.sess ? v.sess.u : String(req.ip))) return res.status(429).json({ ok: false, message: 'طلبات كثيرة، انتظر قليلاً.' })

            const snap = await playersDirectory()
            const q = String(req.query.q || '').trim().replace(/^@/, '').toLowerCase().slice(0, 32)
            const sort = ['pw', 'lv', 'chars', 'u'].includes(String(req.query.s)) ? String(req.query.s) : 'pw'
            const off = Math.max(0, Math.min(100000, parseInt(req.query.o, 10) || 0))

            let list = q ? snap.list.filter(x => x.ul.includes(q)) : snap.list.slice()
            if (sort === 'u') list.sort((a, b) => a.u.localeCompare(b.u, 'ar'))
            else list.sort((a, b) => (b[sort] - a[sort]) || (b.pw - a.pw) || a.u.localeCompare(b.u, 'ar'))

            res.json({
                ok: true,
                total: list.length,
                players: list.slice(off, off + PL_PAGE).map(x => ({
                    id: x.id, u: x.u, lv: x.lv, chars: x.chars, pw: x.pw, top: x.top, av: x.av, tw: x.tw,
                    me: !!(v.sess && v.sess.u === x.userId)
                }))
            })
        } catch (err) {
            console.error('players list error:', err)
            res.status(500).json({ ok: false, message: 'خطأ بالخادم' })
        }
    })

    // فتح مجموعة لاعب بمشاهدة فقط (نفس /u/:code/view) من معرّفه العام
    app.get('/players/open', async (req, res) => {
        try {
            securityHeaders(res)
            const v = await galViewer(req)
            if (!v.ok) return res.redirect(303, '/')
            if (!plRate(v.sess ? v.sess.u : String(req.ip))) return res.status(429).send('طلبات كثيرة، انتظر قليلاً.')
            const id = String(req.query.id || '')
            if (!/^[a-f0-9]{12}$/.test(id)) return html404(res)
            let snap = await playersDirectory()
            let siteCode = snap.byId.get(id)
            if (!siteCode) return html404(res)
            const b = String(req.query.b || '')
            auth.setViewOnlyCookie(res)
            res.redirect(303, `/u/${siteCode}${CODE_RE.test(b) ? '?pb=' + b : ''}`)
        } catch (err) {
            console.error('players open error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    // ─────────────── 🖼️ المعارض  /u/:code/gallery ───────────────
    // الترتيب حسب اللايكات. اللايك لحسابات الموقع المسجّلة فقط (لايك واحد لكل لاعب، وما تقدر تلايك معرضك).
    // اللايكات تُحفظ بحقل Player.galleryLikes (مصفوفة userId) — الأفضل إضافته بالموديل (شوف الملاحظة).
    const galHits = new Map()
    function galRate(userId) {
        const now = Date.now()
        const arr = (galHits.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 30) { galHits.set(userId, arr); return false }
        arr.push(now); galHits.set(userId, arr); return true
    }
    function galId(userId) {
        // مُعرّف عام مشتق من userId — ما يكشف رقم اللاعب ولا كود صفحته الخاص
        return crypto.createHash('sha256').update('gal:' + String(userId)).digest('hex').slice(0, 12)
    }
    const GAL_TTL = 30 * 1000
    let galSnap = { at: 0, list: [] }
    async function galleryOwners() {
        if (Date.now() - galSnap.at < GAL_TTL) return galSnap
        const docs = await Player.find({ 'gallery.0': { $exists: true } })
            .select('userId name username gallery galleryLikes characters titles activeTitle')
            .lean()
        const list = []
        const catIdx = getCatalogIndex(getCatalog)
        for (const d of docs) {
            const n = getGalleryCharacters(d).length
            if (!n) continue
            const id = galId(d.userId)
            // 🖼️ صورة اللاعب بالمعارض = شخصية البروفايل (أول شخصية بـ .شخصياتي — ثابتة رقم 1)
            const first = Array.isArray(d.characters) && d.characters[0] ? resolveDisplayChar(d.characters[0], catIdx) : null
            list.push({
                id, userId: d.userId,
                i: first ? safeImageUrl(first.image) : null,
                u: d.username ? '@' + d.username : (d.name || 'لاعب'),
                l: Array.isArray(d.galleryLikes) ? d.galleryLikes.length : 0,
                t: TITLES.compactOf(d),
                n, h: parseInt(id.slice(0, 4), 16) % 360
            })
        }
        list.sort((a, b) => (b.l - a.l) || (b.n - a.n) || a.u.localeCompare(b.u, 'ar'))
        galSnap = { at: Date.now(), list }
        return galSnap
    }

    // نفس شرط بقية الصفحات: مالك مسجّل (جلسة صالحة) أو مشاهدة فقط
    async function galViewer(req) {
        const s = auth.readSession(req)
        if (s) {
            const me = await Player.findOne({ userId: s.u }).select('sessionVersion').lean()
            if (me && (me.sessionVersion || 0) === s.v) return { sess: s, ok: true }
        }
        return { sess: null, ok: !!auth.hasViewOnly(req) }
    }

    app.get('/u/:code/gallery', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)
            const player = await Player.findOne({ siteCode: code })
                .select('userId name username sessionVersion').lean()
            if (!player) return html404(res)
            const sess = ownerSession(req, player)
            if (!sess && !auth.hasViewOnly(req)) return res.redirect(303, `/u/${code}`)
            const viewer = sess
                ? { isOwner: true, name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) }
                : { isOwner: false }
            res.send(galleryPageHTML({ code, viewer }))
        } catch (err) {
            console.error('gallery page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    app.get('/gallery/list', async (req, res) => {
        try {
            securityHeaders(res)
            const v = await galViewer(req)
            if (!v.ok) return res.status(401).json({ ok: false, message: 'سجّل الدخول أو افتح وضع المشاهدة.' })
            const snap = await galleryOwners()
            res.json({ ok: true, owners: snap.list.map(o => ({ id: o.id, u: o.u, l: o.l, n: o.n, h: o.h, i: o.i, t: o.t || null })) })
        } catch (err) {
            console.error('gallery list error:', err)
            res.status(500).json({ ok: false, message: 'خطأ بالخادم' })
        }
    })

    app.get('/gallery/one', async (req, res) => {
        try {
            securityHeaders(res)
            const v = await galViewer(req)
            if (!v.ok) return res.status(401).json({ ok: false, message: 'سجّل الدخول أو افتح وضع المشاهدة.' })
            const id = String(req.query.id || '')
            if (!/^[a-f0-9]{12}$/.test(id)) return res.status(404).json({ ok: false, message: 'المعرض غير موجود' })
            const snap = await galleryOwners()
            const idx = snap.list.findIndex(o => o.id === id)
            if (idx < 0) return res.status(404).json({ ok: false, message: 'المعرض غير موجود' })
            const entry = snap.list[idx]
            const p = await Player.findOne({ userId: entry.userId })
                .select('userId name username gallery galleryLikes characters').lean()
            if (!p) return res.status(404).json({ ok: false, message: 'المعرض غير موجود' })

            const cs = getGalleryCharacters(p).map(ch => {
                const tierKey = resolveTierKey(ch.rarity, ch.evolutionLevel)
                const t = TIERS[tierKey] || TIERS['عادي']
                const om = tierKey === 'Ω OMEGA'
                return {
                    n: String(ch.name || '?'),
                    a: String(ch.anime || ''),
                    i: safeImageUrl(ch.image) || localCharImageUrl(ch.image) || null,
                    t: tierKey, c: t.color,
                    s: om ? 7 : t.stars,          // أوميقا: 7 نجوم تطوير صفراء
                    p: Number(ch.power) || 0,
                    om
                }
            })
            const likes = Array.isArray(p.galleryLikes) ? p.galleryLikes : []
            res.json({
                ok: true, id, u: entry.u, t: entry.t || null, l: likes.length, rank: idx + 1, cs,
                liked: !!(v.sess && likes.includes(v.sess.u)),
                mine: !!(v.sess && v.sess.u === p.userId)
            })
        } catch (err) {
            console.error('gallery one error:', err)
            res.status(500).json({ ok: false, message: 'خطأ بالخادم' })
        }
    })

    app.post('/gallery/like', jsonBody, async (req, res) => {
        try {
            securityHeaders(res)
            const bad = (status, message) => res.status(status).json({ ok: false, message })
            if (!auth.authEnabled()) return bad(503, 'تسجيل الدخول غير مفعّل حالياً.')
            if (!auth.sameOrigin(req)) return bad(403, 'طلب غير مسموح.')
            const sess = auth.readSession(req)
            if (!sess) return bad(401, 'سجّل دخول بحسابك عشان تعطي لايك.')
            const b = req.body || {}
            if (!auth.verifyCsrf(sess, b.csrf)) return bad(403, 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
            if (!galRate(sess.u)) return bad(429, 'طلبات كثيرة، انتظر دقيقة.')
            const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
            if (!me || (me.sessionVersion || 0) !== sess.v) return bad(401, 'انتهت الجلسة — سجّل الدخول من جديد.')

            const id = String(b.id || '')
            if (!/^[a-f0-9]{12}$/.test(id)) return bad(404, 'المعرض غير موجود')
            const snap = await galleryOwners()
            const entry = snap.list.find(o => o.id === id)
            if (!entry) return bad(404, 'المعرض غير موجود')
            if (entry.userId === sess.u) return bad(400, 'ما تقدر تعطي لايك لمعرضك.')

            const cur = await Player.findOne({ userId: entry.userId }).select('galleryLikes').lean()
            if (!cur) return bad(404, 'المعرض غير موجود')
            const had = Array.isArray(cur.galleryLikes) && cur.galleryLikes.includes(sess.u)
            // strict:false عشان يشتغل حتى لو الحقل ما انضاف للموديل بعد
            await Player.updateOne(
                { userId: entry.userId },
                had ? { $pull: { galleryLikes: sess.u } } : { $addToSet: { galleryLikes: sess.u } },
                { strict: false }
            )
            const after = await Player.findOne({ userId: entry.userId }).select('galleryLikes').lean()
            const likes = Array.isArray(after && after.galleryLikes) ? after.galleryLikes.length : 0
            galSnap.at = 0 // يحدّث الترتيب فوراً
            res.json({ ok: true, liked: !had, likes })
        } catch (err) {
            console.error('gallery like error:', err)
            res.status(500).json({ ok: false, message: 'خطأ بالخادم' })
        }
    })

    // ─────────────── ✏️ إدارة المعرض من الموقع (إضافة / حذف) ───────────────
    // نفس بيانات .المعرض بالبوت: player.gallery = مصفوفة _id للنسخ المختارة (الحد MAX_GALLERY)،
    // فأي تعديل من الموقع يظهر بالبوت والعكس. للمالك المسجّل فقط (جلسة + CSRF).
    // التعديل بعمليات ذرّية على حقل gallery فقط ($push / $pull) — ما نلمس characters
    // إلا لتوليد _id للنسخ القديمة اللي ما عندها (نفس ensureCharId بالبوت، بس بتحديث موضعي آمن).
    const galEditHits = new Map()
    function galEditRate(userId) {
        const now = Date.now()
        const arr = (galEditHits.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 40) { galEditHits.set(userId, arr); return false }
        arr.push(now); galEditHits.set(userId, arr); return true
    }

    async function galEditGuard(req, res, isPost) {
        res.set('Cache-Control', 'no-store')
        const fail = (status, message, extra = {}) => res.status(status).json({ ok: false, message, ...extra })
        try {
            if (!auth.authEnabled()) return fail(503, 'تسجيل الدخول غير مفعّل حالياً.')
            if (isPost && !auth.sameOrigin(req)) return fail(403, 'طلب غير مسموح.')
            const sess = auth.readSession(req)
            if (!sess) return fail(401, 'سجّل دخول بحسابك عشان تعدّل معرضك.')
            const body = isPost ? (req.body || {}) : {}
            if (isPost && !auth.verifyCsrf(sess, body.csrf)) return fail(403, 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
            if (!galEditRate(sess.u)) return fail(429, 'طلبات كثيرة، انتظر دقيقة.')
            const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
            if (!me || (me.sessionVersion || 0) !== sess.v) return fail(401, 'انتهت الجلسة — سجّل الدخول من جديد.')
            return { sess, body, fail }
        } catch (err) {
            console.error('gallery edit guard error:', err)
            return fail(500, 'خطأ بالخادم')
        }
    }

    // يولّد _id للنسخ القديمة اللي ما عندها (تحديث موضعي مشروط بالاسم، ما يكتب فوق تعديل متزامن)
    async function galEnsureIds(userId) {
        for (let attempt = 0; attempt < 2; attempt++) {
            const p = await Player.findOne({ userId }).select('characters gallery').lean()
            if (!p) return null
            const set = {}
            const filter = { userId }
            ;(p.characters || []).forEach((c, i) => {
                if (c && !c._id) {
                    set[`characters.${i}._id`] = new mongoose.Types.ObjectId()
                    filter[`characters.${i}._id`] = { $exists: false }
                    filter[`characters.${i}.name`] = c.name == null ? null : c.name
                }
            })
            if (!Object.keys(set).length) return p
            await Player.updateOne(filter, { $set: set }, { strict: false })
        }
        return Player.findOne({ userId }).select('characters gallery').lean()
    }

    // يرجع حالة المعرض بعد تنظيف المعرّفات اللي ما عاد لها شخصية (انباعت/انهدت) — نفس تجاهل getGalleryCharacters
    async function galLoadMine(userId) {
        const p = await galEnsureIds(userId)
        if (!p) return null
        const ids = new Set((p.characters || []).filter(c => c && c._id).map(c => String(c._id)))
        const raw = Array.isArray(p.gallery) ? p.gallery.map(String) : []
        const dead = raw.filter(id => !ids.has(id))
        if (dead.length) {
            await Player.updateOne({ userId }, { $pull: { gallery: { $in: dead } } }, { strict: false })
            galSnap.at = 0
        }
        const gallery = raw.filter(id => ids.has(id))
        return { p: { ...p, gallery }, gallery }
    }

    function galCardData(ch) {
        const tierKey = resolveTierKey(ch.rarity, ch.evolutionLevel)
        const t = TIERS[tierKey] || TIERS['عادي']
        const om = tierKey === 'Ω OMEGA'
        return {
            k: String(ch._id),
            n: String(ch.name || '?'),
            a: String(ch.anime || ''),
            i: safeImageUrl(ch.image) || localCharImageUrl(ch.image) || null,
            t: tierKey, c: t.color,
            s: om ? 7 : t.stars,
            p: Number(ch.power) || 0,
            om
        }
    }
    const galMineCards = p => getGalleryCharacters(p).map(galCardData)

    app.get('/gallery/mine', async (req, res) => {
        const g = await galEditGuard(req, res, false)
        if (!g || !g.sess) return
        try {
            const m = await galLoadMine(g.sess.u)
            if (!m) return g.fail(404, 'حسابك غير موجود')
            const pool = sortChars(m.p.characters || [])
                .filter(c => c && c._id)
                .map(c => galCardData(resolveLiveCharacterData(c)))
            res.json({ ok: true, id: galId(g.sess.u), max: MAX_GALLERY, g: galMineCards(m.p), pool })
        } catch (err) {
            console.error('gallery mine error:', err)
            g.fail(500, 'خطأ بالخادم')
        }
    })

    app.post('/gallery/add', jsonBody, async (req, res) => {
        const g = await galEditGuard(req, res, true)
        if (!g || !g.sess) return
        try {
            const k = String(g.body.k || '')
            if (!/^[a-f0-9]{24}$/.test(k)) return g.fail(400, 'اختيار غير صحيح، حدّث الصفحة.')
            const m = await galLoadMine(g.sess.u)
            if (!m) return g.fail(404, 'حسابك غير موجود')
            const cards = () => galMineCards(m.p)
            const ch = (m.p.characters || []).find(c => c && c._id && String(c._id) === k)
            if (!ch) return g.fail(409, 'هذي الشخصية ما عاد عندك (انباعت أو انهدت) — حدّث الصفحة.', { g: cards() })
            if (m.gallery.includes(k)) return g.fail(400, `هذي النسخة بالضبط من ${ch.name} موجودة بالمعرض أصلاً`, { g: cards() })
            if (m.gallery.length >= MAX_GALLERY) return g.fail(400, `المعرض ممتلئ (${MAX_GALLERY}/${MAX_GALLERY}) — احذف وحدة أول`, { g: cards() })

            // شرط الحد وعدم التكرار داخل نفس العملية الذرّية (حماية من طلبين متزامنين)
            const r = await Player.updateOne(
                { userId: g.sess.u, gallery: { $ne: k }, [`gallery.${MAX_GALLERY - 1}`]: { $exists: false } },
                { $push: { gallery: k } },
                { strict: false }
            )
            const matched = r.matchedCount ?? r.n ?? r.nMatched
            galSnap.at = 0
            if (matched === 0) {
                const again = await galLoadMine(g.sess.u)
                return g.fail(409, 'تغيّر معرضك للتو — أعد المحاولة.', again ? { g: galMineCards(again.p) } : {})
            }
            m.p.gallery = m.gallery.concat(k)
            res.json({ ok: true, g: cards(), message: `✅ انضافت ${ch.name} للمعرض (${m.p.gallery.length}/${MAX_GALLERY})` })
        } catch (err) {
            console.error('gallery add error:', err)
            g.fail(500, 'خطأ بالخادم')
        }
    })

    app.post('/gallery/remove', jsonBody, async (req, res) => {
        const g = await galEditGuard(req, res, true)
        if (!g || !g.sess) return
        try {
            const k = String(g.body.k || '')
            if (!/^[a-f0-9]{24}$/.test(k)) return g.fail(400, 'اختيار غير صحيح، حدّث الصفحة.')
            const m = await galLoadMine(g.sess.u)
            if (!m) return g.fail(404, 'حسابك غير موجود')
            if (!m.gallery.includes(k)) return g.fail(400, 'هذي الشخصية مو بمعرضك (يمكن انحذفت).', { g: galMineCards(m.p) })
            const ch = (m.p.characters || []).find(c => c && c._id && String(c._id) === k)
            await Player.updateOne({ userId: g.sess.u }, { $pull: { gallery: k } }, { strict: false })
            galSnap.at = 0
            m.p.gallery = m.gallery.filter(x => x !== k)
            res.json({ ok: true, g: galMineCards(m.p), message: `🗑️ انحذفت ${ch ? ch.name : 'الشخصية'} من المعرض (${m.p.gallery.length}/${MAX_GALLERY})` })
        } catch (err) {
            console.error('gallery remove error:', err)
            g.fail(500, 'خطأ بالخادم')
        }
    })

    // ─────────────── 🚢 أوامر السفينة من الموقع ───────────────
    // نفس منطق الواتس بالضبط عبر shipActions.js (شراء، هجوم زعيم، استدعاء) — مصدر واحد للبيانات والقواعد
    let shipActions = null
    try { shipActions = require('../shipActions') } catch (e) { console.error('ship actions: shipActions.js غير موجود', e.message) }

    // حد عدد الطلبات: 30 بالدقيقة لكل لاعب (حماية فقط — القيود الحقيقية بمنطق السفينة نفسه)
    const shipHits = new Map()
    function shipRate(userId) {
        const now = Date.now()
        const arr = (shipHits.get(userId) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 30) { shipHits.set(userId, arr); return false }
        arr.push(now); shipHits.set(userId, arr); return true
    }

    function shipShopItems() {
        try { return require('../shipShop').SHOP_ITEMS || [] } catch (e) { return [] }
    }

    // الجزء الحي من الصفحة لصاحبها (يرسله السيرفر جاهز بعد كل عملية وكل تحديث)
    async function shipDynFor(userId) {
        const st = await shipActions.getShipStatus(userId)
        if (!st) return null
        const lvl = Math.max(1, Math.min(SHIP_MAX_LEVEL, Number(st.ship.level) || 1))
        return shipDynHTML({
            ship: st.ship, shop: shipShopItems(), bought: st.bought, coins: st.player.coins,
            wars: st.wars, combat: st.combat, isOwner: true, lvl
        })
    }

    // حماية موحّدة للمسارات: نفس الموقع + جلسة + CSRF + حد طلبات + نسخة الجلسة
    async function shipGuard(req, res) {
        res.set('Cache-Control', 'no-store')
        const bad = (status, code, message) => { res.status(status).json({ ok: false, code, message }); return null }
        if (!shipActions || !auth.authEnabled()) return bad(503, 'DISABLED', 'أوامر السفينة من الموقع غير مفعّلة حالياً.')
        if (!auth.sameOrigin(req)) return bad(403, 'ORIGIN', 'طلب غير مسموح.')
        const sess = auth.readSession(req)
        if (!sess) return bad(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
        const b = req.body || {}
        if (!auth.verifyCsrf(sess, b.csrf)) return bad(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
        if (!shipRate(sess.u)) return bad(429, 'RATE', 'طلبات كثيرة، انتظر دقيقة.')
        const me = await Player.findOne({ userId: sess.u }).select('sessionVersion').lean()
        if (!me || (me.sessionVersion || 0) !== sess.v) return bad(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
        return { sess, body: b }
    }

    // تحديث حي للصفحة (دم الزعيم، دمك، المشتريات، الحروب) — قراءة فقط
    app.get('/ship/dyn', async (req, res) => {
        res.set('Cache-Control', 'no-store')
        try {
            if (!shipActions || !auth.authEnabled()) return res.status(503).json({ ok: false })
            const sess = await bossSession(req)
            if (!sess) return res.status(401).json({ ok: false })
            const html = await shipDynFor(sess.u)
            if (!html) return res.status(404).json({ ok: false })
            res.json({ ok: true, html })
        } catch (err) {
            console.error('ship dyn error:', err)
            res.status(500).json({ ok: false })
        }
    })

    app.post('/ship/buy', jsonBody, async (req, res) => {
        try {
            const g = await shipGuard(req, res)
            if (!g) return
            const id = typeof g.body.id === 'string' ? g.body.id.slice(0, 40) : ''
            const r = await shipActions.buyShipItem(g.sess.u, { itemId: id })
            const html = await shipDynFor(g.sess.u)
            if (!r.ok) return res.status(400).json({ ok: false, code: r.code, message: r.message, html })
            res.json({ ok: true, text: shipActions.formatBuyText(r), html })
        } catch (err) {
            console.error('ship buy error:', err)
            res.status(500).json({ ok: false, code: 'SERVER', message: 'خطأ بالخادم' })
        }
    })

    app.post('/ship/boss/attack', jsonBody, async (req, res) => {
        try {
            const g = await shipGuard(req, res)
            if (!g) return
            const r = await shipActions.siteAttackBoss(g.sess.u)
            const html = await shipDynFor(g.sess.u)
            if (!r.ok) return res.status(400).json({ ok: false, code: r.code, message: r.message, html })
            res.json({ ok: true, text: r.text, defeated: !!r.result.defeated, html })
        } catch (err) {
            console.error('ship boss attack error:', err)
            res.status(500).json({ ok: false, code: 'SERVER', message: 'خطأ بالخادم' })
        }
    })

    app.post('/ship/boss/summon', jsonBody, async (req, res) => {
        try {
            const g = await shipGuard(req, res)
            if (!g) return
            const r = await shipActions.siteSummonBoss(g.sess.u)
            const html = await shipDynFor(g.sess.u)
            if (!r.ok) return res.status(400).json({ ok: false, code: r.code, message: r.message, html })
            res.json({ ok: true, text: r.text, html })
        } catch (err) {
            console.error('ship boss summon error:', err)
            res.status(500).json({ ok: false, code: 'SERVER', message: 'خطأ بالخادم' })
        }
    })

    // ─────────────── 🚢 صفحة سفينتي ───────────────
    // يحمّل سفينة صاحب الصفحة + الطاقم (القبطان والضباط والأعضاء) من قاعدة البيانات.
    async function loadShipView(player) {
        let Ship = null
        try { Ship = require('../models/Ship') } catch (e) { console.error('ship page: models/Ship غير موجود', e.message) }
        if (!Ship || !player.shipId) return { ship: null, crew: [], totalPower: 0 }
        const ship = await Ship.findOne({ shipId: player.shipId }).lean()
        if (!ship) return { ship: null, crew: [], totalPower: 0 }

        // الطاقم = القبطان + الضباط + الأعضاء (بدون تكرار) — القبطان يظهر دائماً حتى لو غاب من members
        const officers = ship.officers || []
        const ids = [...new Set([ship.captain, ...officers, ...(ship.members || [])].filter(Boolean))]
        const docs = await Player.find({ userId: { $in: ids } }).select('userId name username characters').lean()
        const byId = new Map(docs.map(d => [d.userId, d]))
        const order = { captain: 0, officer: 1, sailor: 2 }
        const crew = ids.map(id => {
            const d = byId.get(id)
            const role = id === ship.captain ? 'captain' : officers.includes(id) ? 'officer' : 'sailor'
            return {
                id, role, exists: !!d,
                name: d ? (d.username ? '@' + d.username : (d.name || 'لاعب')) : '@' + String(id).split('@')[0],
                power: d ? (d.characters || []).reduce((s, c) => s + (Number(c && c.power) || 0), 0) : 0,
                isMe: id === player.userId
            }
        }).sort((a, b) => order[a.role] - order[b.role] || b.power - a.power)
        return { ship, crew, totalPower: crew.reduce((s, m) => s + m.power, 0) }
    }

    app.get('/u/:code/ship', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)
            const player = await Player.findOne({ siteCode: code })
                .select('userId name username shipId shipCoins shipShop sessionVersion').lean()
            if (!player) return html404(res)
            const sess = ownerSession(req, player)
            if (!sess && !auth.hasViewOnly(req)) return res.redirect(303, `/u/${code}`)

            const { ship, crew, totalPower } = await loadShipView(player)
            // حروب اليوم + دمك القتالي (نفس بيانات الواتس) — فشلها ما يكسر الصفحة
            let status = null
            try { if (shipActions && ship) status = await shipActions.getShipStatus(player.userId) } catch (e) { console.error('ship status error:', e) }
            let shop = []
            try { shop = require('../shipShop').SHOP_ITEMS || [] } catch (e) { /* بدون متجر */ }
            const viewer = sess
                ? { isOwner: true, name: player.name || player.username || 'لاعب', csrf: auth.csrfForSession(sess) }
                : { isOwner: false }
            res.send(shipPageHTML({
                code, viewer, ship, crew, totalPower, shop,
                bought: (player.shipShop && player.shipShop[getShipWeekKey()]) || {},
                coins: Number(player.shipCoins) || 0,
                status,
                ownerName: player.username ? '@' + player.username : (player.name || 'اللاعب')
            }))
        } catch (err) {
            console.error('ship page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    // مشهد البحر (يُعرض داخل iframe بنفس الموقع) — المستوى يُقرأ من قاعدة البيانات لا من الرابط
    app.get('/u/:code/ship/scene', async (req, res) => {
        try {
            securityHeaders(res)
            res.set({
                'X-Frame-Options': 'SAMEORIGIN',
                'Content-Security-Policy':
                    "default-src 'self'; img-src data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                    "font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'"
            })
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)
            const player = await Player.findOne({ siteCode: code }).select('userId shipId sessionVersion').lean()
            if (!player) return html404(res)
            const sess = ownerSession(req, player)
            if (!sess && !auth.hasViewOnly(req)) return res.status(403).send('')
            let level = 1
            try {
                if (player.shipId) {
                    const s = await require('../models/Ship').findOne({ shipId: player.shipId }).select('level').lean()
                    if (s) level = s.level
                }
            } catch (e) { /* مستوى 1 */ }
            res.type('html').send(shipSceneHTML(level))
        } catch (err) {
            console.error('ship scene error:', err)
            res.status(500).send('')
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
            await kingdom.markRewardSeen(sess.u, id) // إشعارات جوائز الترتيب
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

    // ─────────────── 💬 الدردشة: التخزين + المسارات ───────────────
    // لا نغيّر Player — نماذج مستقلة: رسائل (تنحذف تلقائياً بعد 14 يوم) + قائمة الأصدقاء
    const chatMg = Player.base
    const ChatMsg = Player.db.models.SiteChatMsg || Player.db.model('SiteChatMsg', (() => {
        const s = new chatMg.Schema({
            k: String,                                   // 'pub' أو مفتاح المحادثة الخاصة (معرّفان مرتبان)
            f: String,                                   // userId المرسل (لا يُرسل للمتصفح أبداً)
            x: { type: String, default: '' },
            s: { type: Number, default: -1 },            // رقم الستيكر أو -1
            t: { type: Date, default: Date.now },
            r: { type: chatMg.Schema.Types.Mixed, default: {} },  // { إيموجي: [userId] }
            q: { type: chatMg.Schema.Types.Mixed, default: null } // رد على رسالة: { id, f, x, s } (لقطة من الأصلية)
        }, { minimize: false })
        s.index({ k: 1, t: -1 })
        s.index({ t: 1 }, { expireAfterSeconds: 14 * 24 * 3600 })
        return s
    })())
    const ChatFr = Player.db.models.SiteChatFr || Player.db.model('SiteChatFr', new chatMg.Schema({
        u: { type: String, unique: true },
        fr: [String],
        seen: { type: chatMg.Schema.Types.Mixed, default: {} }  // { pub|معرّف-الصديق: وقت آخر قراءة }
    }, { minimize: false }))

    // معرّف عام مجهول لكل لاعب (HMAC) — حتى لا يظهر userId/الرقم للمتصفح
    const chatSecret = String(process.env.SESSION_SECRET || 'chat-fallback-salt')
    const pidMap = new Map()
    function pidOf(u) {
        const p = crypto.createHmac('sha256', chatSecret).update('chat:' + u).digest('hex').slice(0, 12)
        if (!pidMap.has(p)) { if (pidMap.size > 20000) pidMap.clear(); pidMap.set(p, u) }
        return p
    }
    const chatPresence = new Map(), chatLast = new Map(), chatNames = new Map(), chatHits = new Map()

    function chatRate(u) {
        const now = Date.now()
        const arr = (chatHits.get(u) || []).filter(t => now - t < 60 * 1000)
        if (arr.length >= 120) { chatHits.set(u, arr); return false }
        arr.push(now); chatHits.set(u, arr); return true
    }

    async function chatNamesFor(ids) {
        const now = Date.now(), out = new Map(), miss = []
        for (const u of new Set(ids)) {
            const c = chatNames.get(u)
            if (c && c.exp > now) out.set(u, c.n); else miss.push(u)
        }
        if (miss.length) {
            const rows = await Player.find({ userId: { $in: miss } }).select('userId name username').lean()
            for (const r of rows) {
                const n = String(r.name || r.username || 'لاعب').slice(0, 24)
                chatNames.set(r.userId, { n, exp: now + 5 * 60 * 1000 }); out.set(r.userId, n)
            }
            for (const u of miss) if (!out.has(u)) out.set(u, 'لاعب')
        }
        if (chatNames.size > 5000) chatNames.clear()
        return out
    }
    // 🏅 ألقاب الشات (كاش قصير 30ث عشان التبديل يظهر بسرعة)
    const chatTitles = new Map()
    async function chatTitlesFor(ids) {
        const now = Date.now(), out = new Map(), miss = []
        for (const u of new Set(ids)) {
            const c = chatTitles.get(u)
            if (c && c.exp > now) out.set(u, c.t); else miss.push(u)
        }
        if (miss.length) {
            try {
                const rows = await Player.find({ userId: { $in: miss } }).select('userId titles activeTitle').lean()
                for (const r of rows) { const t = TITLES.compactOf(r); chatTitles.set(r.userId, { t, exp: now + 30 * 1000 }); out.set(r.userId, t) }
                for (const u of miss) if (!out.has(u)) out.set(u, null)
            } catch (e) { console.error('chat titles error:', e) }
        }
        if (chatTitles.size > 5000) chatTitles.clear()
        return out
    }
    // 🖼️ صورة الشات = شخصية البروفايل (أول شخصية بـ .شخصياتي — ثابتة رقم 1) نفس منطق المعارض
    const chatImgs = new Map()
    async function chatImgsFor(ids) {
        const now = Date.now(), out = new Map(), miss = []
        for (const u of new Set(ids)) {
            const c = chatImgs.get(u)
            if (c && c.exp > now) out.set(u, c.i); else miss.push(u)
        }
        if (miss.length) {
            try {
                const rows = await Player.find({ userId: { $in: miss } }).select({ userId: 1, characters: { $slice: 1 } }).lean()
                const catIdx = getCatalogIndex(getCatalog)
                for (const r of rows) {
                    const f = Array.isArray(r.characters) && r.characters[0] ? resolveDisplayChar(r.characters[0], catIdx) : null
                    const i = f ? safeImageUrl(f.image) : null
                    chatImgs.set(r.userId, { i, exp: now + 60 * 1000 }); out.set(r.userId, i)
                }
                for (const u of miss) if (!out.has(u)) out.set(u, null)
            } catch (e) { console.error('chat images error:', e) }
        }
        if (chatImgs.size > 5000) chatImgs.clear()
        return out
    }
    function chatPerson(u, names, extra) {
        const id = pidOf(u)
        return [id, { id, n: names.get(u) || 'لاعب', h: parseInt(id.slice(0, 3), 16) % 360, ...(extra || {}) }]
    }
    const chatPairKey = (a, b) => [a, b].sort().join('|')

    // يتحقق من الجلسة (+ الأصل وCSRF للطلبات المعدِّلة) ويرد بنفسه عند الفشل
    async function chatAuth(req, res, mutate) {
        res.set('Cache-Control', 'no-store')
        const fail = (st, code, message) => { res.status(st).json({ ok: false, code, message }); return null }
        if (!auth.authEnabled()) return fail(503, 'DISABLED', 'الدردشة غير مفعّلة حالياً.')
        if (mutate && !auth.sameOrigin(req)) return fail(403, 'ORIGIN', 'طلب غير مسموح.')
        const sess = await bossSession(req)
        if (!sess) return fail(401, 'AUTH', 'انتهت الجلسة — سجّل الدخول من جديد.')
        if (mutate && !auth.verifyCsrf(sess, req.body && req.body.csrf)) return fail(403, 'CSRF', 'انتهت صلاحية الصفحة — حدّثها وأعد المحاولة.')
        if (!chatRate(sess.u)) return fail(429, 'RATE', 'طلبات كثيرة، انتظر قليلاً.')
        return sess
    }

    app.get('/u/:code/chat', async (req, res) => {
        try {
            securityHeaders(res)
            const code = String(req.params.code || '')
            if (!CODE_RE.test(code)) return html404(res)
            const player = await Player.findOne({ siteCode: code }).select('userId name username sessionVersion titles activeTitle').lean()
            if (!player) return html404(res)
            const sess = ownerSession(req, player)
            if (!sess) return res.redirect(303, `/login?code=${code}`)
            if (!auth.authEnabled()) return res.status(503).send('الدردشة غير مفعّلة حالياً.')
            const nm = String(player.name || player.username || 'لاعب').slice(0, 24)
            const myImg = (await chatImgsFor([player.userId])).get(player.userId) || null
            const [, me] = chatPerson(player.userId, new Map([[player.userId, nm]]), { t: TITLES.compactOf(player), i: myImg })
            res.send(chatPageHTML({ viewer: { name: nm, csrf: auth.csrfForSession(sess), me }, code }))
        } catch (err) {
            console.error('chat page error:', err)
            res.status(500).send('خطأ بالخادم')
        }
    })

    // ⚡ تخزين رسائل الدردشة العامة بالذاكرة لثواني قليلة: استعلام واحد يخدم كل اللاعبين
    // بدل استعلام لكل لاعب كل 3 ثوان. يُبطَل فوراً عند إرسال رسالة عامة أو التفاعل معها.
    const PUB_CACHE_MS = 2500
    const pubCache = { at: 0, msgs: null, pending: null, ver: 0 }
    function pubCacheBust() { pubCache.ver++; pubCache.at = 0; pubCache.pending = null }
    // يرجع { msgs, at }: at = لحظة بدء الاستعلام الذي حمّل هذه الرسائل (تُستخدم لعلامة "آخر قراءة")
    function getRecentMsgs(key) {
        if (key !== 'pub') {
            const at = Date.now()
            return ChatMsg.find({ k: key }).sort({ t: -1 }).limit(60).lean().then(r => ({ msgs: r.reverse(), at }))
        }
        if (pubCache.msgs && Date.now() - pubCache.at < PUB_CACHE_MS) return Promise.resolve({ msgs: pubCache.msgs, at: pubCache.at })
        if (pubCache.pending) return pubCache.pending
        const ver = pubCache.ver, at = Date.now()
        const p = ChatMsg.find({ k: 'pub' }).sort({ t: -1 }).limit(60).lean().then(r => {
            const list = r.reverse()
            if (ver === pubCache.ver) { pubCache.msgs = list; pubCache.at = at }
            return { msgs: list, at }
        }).finally(() => { if (pubCache.pending === p) pubCache.pending = null })
        pubCache.pending = p
        return p
    }

    // استطلاع الحالة كل ~3 ثوان: المتصلون + الأصدقاء + رسائل العرض الحالي
    app.get('/chat/poll', async (req, res) => {
        try {
            const sess = await chatAuth(req, res, false)
            if (!sess) return
            const me = sess.u, now = Date.now()
            chatPresence.set(me, now)
            if (chatPresence.size > 3000) for (const [u, t] of chatPresence) if (now - t > CHAT_ONLINE_MS) chatPresence.delete(u)

            const doc = await ChatFr.findOne({ u: me }).lean()
            const frIds = (doc && doc.fr) || []
            const seenMap = { ...((doc && doc.seen) || {}) }
            const setSeen = {}
            const isOn = u => now - (chatPresence.get(u) || 0) < CHAT_ONLINE_MS

            const toPid = String(req.query.to || '').slice(0, 20)
            let key = 'pub', notFriend = false
            if (toPid) {
                const pu = pidMap.get(toPid)
                if (!pu || !frIds.includes(pu)) notFriend = true; else key = chatPairKey(me, pu)
            }
            let msgs = [], loadedAt = now
            if (!notFriend) { const got = await getRecentMsgs(key); msgs = got.msgs; loadedAt = got.at }

            // أول مرة: لا نعتبر الرسائل القديمة غير مقروءة بالعام
            if (seenMap.pub == null) { seenMap.pub = now; setSeen['seen.pub'] = now }
            if (!notFriend) {
                const sk = toPid || 'pub'
                const newest = msgs.length ? +msgs[msgs.length - 1].t : 0
                if (newest > (seenMap[sk] || 0) || (toPid && seenMap[sk] == null)) { const rd = Math.max(loadedAt, newest); seenMap[sk] = rd; setSeen['seen.' + sk] = rd }
            }
            if (Object.keys(setSeen).length) await ChatFr.updateOne({ u: me }, { $set: setSeen }, { upsert: true })

            let pubUnread = 0
            if (toPid) {
                pubUnread = (await ChatMsg.find({ k: 'pub', f: { $ne: me }, t: { $gt: new Date(seenMap.pub || now) } }).select('_id').limit(99).lean()).length
            }

            // الأصدقاء: آخر رسالة + غير المقروء
            const keys = frIds.map(u => chatPairKey(me, u))
            const lastRows = frIds.length ? await ChatMsg.aggregate([{ $match: { k: { $in: keys } } }, { $sort: { t: -1 } }, { $group: { _id: '$k', m: { $first: '$$ROOT' } } }]) : []
            const lastBy = new Map(lastRows.map(r => [r._id, r.m]))
            let inc = []
            if (frIds.length) {
                const minSeen = Math.min(...frIds.map(u => seenMap[pidOf(u)] || 0))
                inc = await ChatMsg.find({ k: { $in: keys }, f: { $ne: me }, t: { $gt: new Date(minSeen) } }).select('k t').limit(600).lean()
            }
            const friends = frIds.map(u => {
                const id = pidOf(u), k = chatPairKey(me, u), l = lastBy.get(k), sn = seenMap[id] || 0
                return {
                    id, on: isOn(u) ? 1 : 0,
                    un: inc.filter(m => m.k === k && +m.t > sn).length,
                    last: l ? { x: String(l.x || '').slice(0, 60), s: l.s, me: l.f === me } : null
                }
            })

            const onlineIds = [...chatPresence].filter(([u, t]) => u !== me && now - t < CHAT_ONLINE_MS).map(([u]) => u).slice(0, 60)
            const msgUsers = [...msgs.map(m => m.f), ...msgs.filter(m => m.q && m.q.f).map(m => m.q.f)]
            const names = await chatNamesFor([me, ...onlineIds, ...frIds, ...msgUsers])
            const tms = await chatTitlesFor([...onlineIds, ...frIds, ...msgUsers])
            const ims = await chatImgsFor([...onlineIds, ...frIds, ...msgUsers])
            const people = Object.fromEntries([...new Set([...onlineIds, ...frIds, ...msgUsers])].map(u => chatPerson(u, names, { t: tms.get(u) || null, i: ims.get(u) || null })))

            res.json({
                ok: true, view: toPid, notFriend, pubUnread, friends, people,
                online: onlineIds.map(pidOf),
                msgs: msgs.map(m => ({
                    id: String(m._id), f: pidOf(m.f), me: m.f === me, x: m.x || '', s: m.s, t: +m.t,
                    q: m.q && m.q.id ? { id: String(m.q.id), f: pidOf(m.q.f), x: String(m.q.x || '').slice(0, 80), s: Number.isInteger(m.q.s) ? m.q.s : -1 } : null,
                    r: Object.fromEntries(Object.entries(m.r || {}).filter(([, a]) => Array.isArray(a) && a.length).map(([e, a]) => [e, { n: a.length, me: a.includes(me) }]))
                }))
            })
        } catch (err) {
            console.error('chat poll error:', err)
            res.status(500).json({ ok: false })
        }
    })

    app.post('/chat/send', jsonBody, async (req, res) => {
        const fail = (st, code, message, extra = {}) => res.status(st).json({ ok: false, code, message, ...extra })
        try {
            const sess = await chatAuth(req, res, true)
            if (!sess) return
            const me = sess.u, b = req.body || {}
            let x = typeof b.x === 'string'
                ? b.x.replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
                : ''
            const s = Number.isInteger(b.s) && b.s >= 0 && b.s < CHAT_STICKERS.length ? b.s : -1
            if (s >= 0) x = ''
            if (!x && s < 0) return fail(400, 'EMPTY', 'اكتب رسالة أولاً.')

            let key = 'pub'
            const toPid = String(b.to || '').slice(0, 20)
            if (toPid) {
                const pu = pidMap.get(toPid)
                const doc = await ChatFr.findOne({ u: me }).select('fr').lean()
                if (!pu || !doc || !doc.fr.includes(pu)) return fail(403, 'NOT_FRIEND', 'هذا اللاعب ليس في قائمة أصدقائك.')
                key = chatPairKey(me, pu)
            }
            const now = Date.now(), wait = CHAT_CD_MS - (now - (chatLast.get(me) || 0))
            if (wait > 0) return fail(429, 'COOLDOWN', `⏳ انتظر ${Math.ceil(wait / 1000)} ثانية قبل رسالتك التالية`, { retryInMs: wait })
            chatLast.set(me, now)
            if (chatLast.size > 5000) for (const [u, t] of chatLast) if (now - t > CHAT_CD_MS) chatLast.delete(u)
            let q = null
            const qid = String(b.q || '')
            if (/^[a-f0-9]{24}$/.test(qid)) {
                const qm = await ChatMsg.findById(qid).select('k f x s').lean()
                if (qm && qm.k === key) q = { id: qid, f: qm.f, x: String(qm.x || '').slice(0, 80), s: Number.isInteger(qm.s) ? qm.s : -1 }
            }
            const m = await ChatMsg.create({ k: key, f: me, x, s, t: new Date(now), r: {}, q })
            if (key === 'pub') pubCacheBust()
            res.json({ ok: true, id: String(m._id) })
        } catch (err) {
            console.error('chat send error:', err)
            fail(500, 'SERVER', 'خطأ بالخادم')
        }
    })

    app.post('/chat/react', jsonBody, async (req, res) => {
        const fail = (st, code, message) => res.status(st).json({ ok: false, code, message })
        try {
            const sess = await chatAuth(req, res, true)
            if (!sess) return
            const me = sess.u, b = req.body || {}
            const id = String(b.id || ''), e = String(b.e || '')
            if (!/^[a-f0-9]{24}$/.test(id) || !CHAT_REACT.includes(e)) return fail(400, 'BAD', 'طلب غير صحيح.')
            const m = await ChatMsg.findById(id).select('k r').lean()
            if (!m || (m.k !== 'pub' && !m.k.split('|').includes(me))) return fail(404, 'NONE', 'الرسالة غير موجودة.')
            const has = Array.isArray(m.r && m.r[e]) && m.r[e].includes(me)
            await ChatMsg.updateOne({ _id: id }, has ? { $pull: { ['r.' + e]: me } } : { $addToSet: { ['r.' + e]: me } })
            if (m.k === 'pub') pubCacheBust()
            res.json({ ok: true })
        } catch (err) {
            console.error('chat react error:', err)
            fail(500, 'SERVER', 'خطأ بالخادم')
        }
    })

    app.get('/chat/search', async (req, res) => {
        try {
            const sess = await chatAuth(req, res, false)
            if (!sess) return
            const q = String(req.query.q || '').trim().slice(0, 20)
            if (q.length < 2) return res.json({ ok: true, items: [] })
            const doc = await ChatFr.findOne({ u: sess.u }).select('fr').lean()
            const have = new Set((doc && doc.fr) || [])
            const rows = await Player.find({ username: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
                .select('userId name username titles activeTitle').limit(15).lean()
            const sims = await chatImgsFor(rows.map(r => r.userId))
            const items = rows.filter(r => r.userId !== sess.u && !have.has(r.userId)).slice(0, 12).map(r => {
                const [, p] = chatPerson(r.userId, new Map([[r.userId, String(r.name || r.username || 'لاعب').slice(0, 24)]]), { u: String(r.username || '').slice(0, 20), t: TITLES.compactOf(r), i: sims.get(r.userId) || null })
                return p
            })
            res.json({ ok: true, items })
        } catch (err) {
            console.error('chat search error:', err)
            res.status(500).json({ ok: false })
        }
    })

    // إضافة/حذف صديق (متبادلة: الطرفان يظهران عند بعض)
    app.post('/chat/friend', jsonBody, async (req, res) => {
        const fail = (st, code, message) => res.status(st).json({ ok: false, code, message })
        try {
            const sess = await chatAuth(req, res, true)
            if (!sess) return
            const me = sess.u, b = req.body || {}
            const other = pidMap.get(String(b.id || '').slice(0, 20))
            if (!other || other === me) return fail(400, 'BAD', 'لاعب غير صحيح — ابحث عنه من جديد.')

            if (b.op === 'remove') {
                await ChatFr.updateOne({ u: me }, { $pull: { fr: other } })
                await ChatFr.updateOne({ u: other }, { $pull: { fr: me } })
                return res.json({ ok: true })
            }
            if (b.op !== 'add') return fail(400, 'BAD', 'طلب غير صحيح.')

            const target = await Player.findOne({ userId: other }).select('userId name username').lean()
            if (!target) return fail(404, 'NONE', 'اللاعب غير موجود.')
            const [mine, theirs] = await Promise.all([ChatFr.findOne({ u: me }).select('fr').lean(), ChatFr.findOne({ u: other }).select('fr').lean()])
            if (mine && mine.fr.includes(other)) return fail(400, 'DUP', 'هو صديقك بالفعل.')
            if (mine && mine.fr.length >= CHAT_MAX_FRIENDS) return fail(400, 'LIMIT', `وصلت للحد الأقصى: ${CHAT_MAX_FRIENDS} صديق 🚫`)
            if (theirs && theirs.fr.length >= CHAT_MAX_FRIENDS) return fail(400, 'LIMIT_OTHER', 'قائمة أصدقاء هذا اللاعب ممتلئة.')
            await ChatFr.updateOne({ u: me }, { $addToSet: { fr: other } }, { upsert: true })
            await ChatFr.updateOne({ u: other }, { $addToSet: { fr: me } }, { upsert: true })
            res.json({ ok: true, message: `تمت إضافة ${String(target.name || target.username || 'اللاعب').slice(0, 24)} 💖` })
        } catch (err) {
            console.error('chat friend error:', err)
            fail(500, 'SERVER', 'خطأ بالخادم')
        }
    })
}

module.exports = { registerCharacterSite, shipPageHTML, shipSceneHTML, shipLookIndex, generateSiteCode, bossPageHTML, pageHTML, sortCharacters, sortCharactersKeepFirst, getCatalogIndex, resolveDisplayChar }
