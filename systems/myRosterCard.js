// =====================================================================
// systems/myRosterCard.js
// -----------------------------------------------------------------
// نظام تصميم بطاقة "شخصياتي" — ملف مستقل بالكامل عن باقي البوت.
// مسؤول فقط عن: تحويل قائمة شخصيات (name/anime/rarity/power/image)
// إلى صورة PNG جاهزة للإرسال بالواتساب.
//
// ما فيه أي منطق لعبة هنا (شظايا/فلوس/تطوير). فقط عرض.
// =====================================================================

const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

// يحوّل image الشخصية (رابط خارجي أو مسار ملف محلي نسبي لجذر المشروع،
// نفس منطق .عرض) إلى مصدر يقدر Puppeteer يعرضه دايمًا. الروابط
// الخارجية تُستخدم كما هي، والملفات المحلية تُقرأ وتُحوَّل base64
// عشان ما تعتمد على مسار قابل للوصول من المتصفح.
function resolveImageSrc(imagePath) {
    if (!imagePath) return null
    if (/^https?:\/\//i.test(imagePath)) return imagePath

    try {
        const abs = path.isAbsolute(imagePath)
            ? imagePath
            : path.join(__dirname, '..', imagePath)

        const buf = fs.readFileSync(abs)
        const ext = (path.extname(abs).replace('.', '') || 'jpg').toLowerCase()
        return `data:image/${ext};base64,${buf.toString('base64')}`
    } catch (err) {
        return null
    }
}

// ---------------------------------------------------------------
// 1) جدول الندرات بالكامل — من "عادي" لحد "Ω أوميقا"
//    كل ندرة: كم نجمة ثابتة + لون إطار مختلف + هل اسمها عربي أو إنجليزي
// ---------------------------------------------------------------
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
const TIERS = Object.fromEntries(TIER_ORDER.map(t => [t.key, t]))

// شخصية مطوَّرة عبر .تطوير تجي رتبتها كـ char.rarity = 'SSS' + evolutionLevel (0-7)
// هذي الدالة تحول (rarity الأصلية + evolutionLevel) إلى مفتاح TIERS الصحيح
function resolveTierKey(rarity, evolutionLevel = 0) {
    if (rarity !== 'SSS' || !evolutionLevel) return rarity
    const evoMap = ['SSS', 'SSS+', 'SSS++', 'UR I', 'UR II', 'UR III', 'EX', 'Ω OMEGA']
    return evoMap[evolutionLevel] || 'Ω OMEGA'
}

// ملاحظة: ما نحتاج نبحث بملف characters.json هنا — عناصر
// player.characters بالداتابيس أصلاً نسخة كاملة من الشخصية وقت
// سحبها (فيها name/anime/image/rarity/power)، وأمر .تطوير يحدّث
// power و evolutionLevel على نفس الكائن. فهذا الملف يستقبل الكائن
// جاهز كما هو من player.characters ولا يحتاج مصدر ثاني.

// ---------------------------------------------------------------
// 2) توزيع البطاقات على صفوف — أقصى 6 بالصف الواحد، وتوزيع متساوي
//    (10 شخصيات => صفين 5+5، مو صف 6 وصف 4 لوحيد)
// ---------------------------------------------------------------
const MAX_PER_ROW = 6

function splitIntoRows(items) {
    const n = items.length
    if (n === 0) return []
    const rowCount = Math.max(1, Math.ceil(n / MAX_PER_ROW))
    const base = Math.floor(n / rowCount)
    let extra = n % rowCount
    const rows = []
    let i = 0
    for (let r = 0; r < rowCount; r++) {
        const size = base + (extra > 0 ? 1 : 0)
        if (extra > 0) extra--
        rows.push(items.slice(i, i + size))
        i += size
    }
    return rows
}

// ---------------------------------------------------------------
// 3) بناء HTML لبطاقة واحدة
// ---------------------------------------------------------------
function starGlyphs(n) { return '★'.repeat(n) }

function tierLabelHTML(tierKey) {
    const t = TIERS[tierKey] || TIERS['SSS']
    const cls = t.lang === 'ar' ? 'ar' : 'en'
    return `<span class="tier-name ${cls}">${tierKey}</span>`
}

function cardHTML(char) {
    const tierKey = resolveTierKey(char.rarity, char.evolutionLevel)
    const t = TIERS[tierKey] || TIERS['SSS']
    const isOmega = tierKey === 'Ω OMEGA'
    const artStyle = char.image
        ? `background-image:url('${char.image}')`
        : `background:linear-gradient(160deg,#333,#111)`
    const power = Number(char.power || 0).toLocaleString('en-US')

    return `
    <div class="card ${isOmega ? 'omega' : ''}" style="--tier:${t.color}">
      <div class="tier-tag">${tierLabelHTML(tierKey)}<span class="pwr-badge">${power} PWR</span></div>
      <div class="stars">${starGlyphs(t.stars)}</div>
      <div class="art" style="${artStyle}"><div class="fade"></div></div>
      <div class="plate">
        <div class="name-en">${char.name}</div>
        <div class="anime-chip">${char.anime}</div>
      </div>
    </div>`
}

function rowHTML(rowChars) {
    return `<div class="roster">${rowChars.map(cardHTML).join('')}</div>`
}

// ---------------------------------------------------------------
// 4) الصفحة الكاملة (نفس تصميم المعاينة اللي وافق عليها المستخدم)
// ---------------------------------------------------------------
function fullPageHTML(characters, title = 'شخصياتي', subtitle = 'MY CHARACTERS') {
    const rows = splitIntoRows(characters)
    const rowsHTML = rows.map(rowHTML).join('')

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#0a0d16; --bg2:#0f1422; --line:rgba(240,192,74,.18);
    --gold:#f0c04a; --gold-dim:#8a6d24;
    --text:#eef1f8; --text-dim:#8891a3;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{
    background:
      radial-gradient(1200px 500px at 50% -10%, rgba(240,192,74,.08), transparent 60%),
      linear-gradient(180deg,#070911,#0a0d16 40%,#070911);
    color:var(--text); font-family:'Cairo',sans-serif;
    padding:50px 40px 60px;
  }
  .frame{max-width:1470px; margin:0 auto; position:relative;}
  .corner{position:absolute; width:46px; height:46px; border-color:var(--gold-dim); opacity:.7;}
  .corner.tl{top:-30px; right:-10px; border-top:2px solid var(--gold-dim); border-right:2px solid var(--gold-dim);}
  .corner.br{bottom:-30px; left:-10px; border-bottom:2px solid var(--gold-dim); border-left:2px solid var(--gold-dim);}
  .eyebrow{text-align:center; font-family:'Oswald',sans-serif; letter-spacing:.45em; font-size:11px; color:var(--gold-dim); text-transform:uppercase; margin-bottom:10px;}
  h1{text-align:center; font-size:52px; font-weight:900; background:linear-gradient(180deg,#fff6d8,var(--gold) 55%,#a9791f); -webkit-background-clip:text; background-clip:text; color:transparent;}
  .sub{text-align:center; font-family:'Oswald',sans-serif; font-size:13px; letter-spacing:.35em; color:var(--text-dim); margin:6px 0 40px; text-transform:uppercase;}

  .roster{display:flex; flex-wrap:wrap; justify-content:center; gap:18px; margin-bottom:18px;}
  .card{
    position:relative; width:230px; flex:0 0 230px; border-radius:10px; overflow:hidden; background:var(--bg2);
    border:1.5px solid var(--tier); display:flex; flex-direction:column;
    box-shadow:0 10px 26px rgba(0,0,0,.45), 0 0 18px color-mix(in srgb, var(--tier) 35%, transparent);
  }
  .card.omega{border-image:linear-gradient(135deg,#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860) 1;}
  .tier-tag{display:flex; align-items:center; justify-content:space-between; padding:8px 10px 4px;}
  .tier-name{font-size:12px; font-weight:700; color:var(--tier);}
  .tier-name.en{font-family:'Oswald',sans-serif; letter-spacing:.14em; text-transform:uppercase; font-size:10.5px; direction:ltr;}
  .tier-name.ar{font-family:'Cairo',sans-serif; font-weight:800;}
  .pwr-badge{font-family:'Oswald',sans-serif; font-size:9.5px; font-weight:600; color:#0a0d16; background:var(--tier); padding:1px 6px; border-radius:20px; direction:ltr;}
  .stars{padding:0 10px 8px; font-size:12px; letter-spacing:1px; color:var(--tier); text-shadow:0 0 6px color-mix(in srgb, var(--tier) 60%, transparent); direction:ltr; text-align:right; line-height:1.3;}
  .art{position:relative; flex:1; min-height:270px; background-size:cover; background-position:center top; background-color:#151a28;}
  .art .fade{position:absolute; inset:0; background:linear-gradient(180deg, transparent 55%, rgba(10,13,22,.92) 100%);}
  .plate{padding:10px 10px 12px; text-align:center; background:linear-gradient(180deg, transparent, rgba(0,0,0,.5));}
  .name-en{font-family:'Oswald',sans-serif; font-weight:600; font-size:14.5px; letter-spacing:.03em; color:#fff; direction:ltr;}
  .anime-chip{margin-top:7px; display:inline-block; font-size:9.5px; font-family:'Oswald',sans-serif; letter-spacing:.08em; color:var(--tier); border:1px solid color-mix(in srgb, var(--tier) 50%, transparent); border-radius:20px; padding:2px 9px; text-transform:uppercase; background:color-mix(in srgb, var(--tier) 10%, transparent); direction:ltr;}
</style>
</head>
<body>
  <div class="frame" id="capture">
    <div class="corner tl"></div>
    <div class="corner br"></div>
    <div class="eyebrow">Character Roster</div>
    <h1>${title}</h1>
    <div class="sub">${subtitle}</div>
    ${rowsHTML}
  </div>
</body>
</html>`
}

// ---------------------------------------------------------------
// 4.5) بطاقة شخصية واحدة كبيرة — نفس تصميم/ألوان إطار .المعرض
//    بالضبط (TIERS نفسها)، لكن كصورة مستقلة كبيرة بدل كرت صغير
//    بشبكة. تُستخدم بأوامر .عرض / .بروفايل / .تطوير (EX وأوميقا)
//    فقط — لا علاقة لها بـ renderRosterImage ولا تؤثر بالمعرض أبدًا.
// ---------------------------------------------------------------
function singleCardHTML(char) {
    const tierKey = resolveTierKey(char.rarity, char.evolutionLevel)
    const t = TIERS[tierKey] || TIERS['SSS']
    const isOmega = tierKey === 'Ω OMEGA'
    const imgSrc = resolveImageSrc(char.image)
    const artStyle = imgSrc
        ? `background-image:url('${imgSrc}')`
        : `background:linear-gradient(160deg,#333,#111)`
    const power = Number(char.power || 0).toLocaleString('en-US')

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#0a0d16;}
  .card{
    position:relative; width:760px; height:1140px; border-radius:24px; overflow:hidden; background:#0f1422;
    border:5px solid ${t.color}; display:flex; flex-direction:column;
    box-shadow:0 24px 70px rgba(0,0,0,.55), 0 0 50px color-mix(in srgb, ${t.color} 45%, transparent);
  }
  .card.omega{border-image:linear-gradient(135deg,#ff3860,#f0c04a,#3ea8ff,#c04aff,#ff3860) 1;}
  .tier-tag{display:flex; align-items:center; justify-content:space-between; padding:30px 34px 12px;}
  .tier-name{font-size:32px; font-weight:700; color:${t.color};}
  .tier-name.en{font-family:'Oswald',sans-serif; letter-spacing:.16em; text-transform:uppercase; font-size:28px; direction:ltr;}
  .tier-name.ar{font-family:'Cairo',sans-serif; font-weight:900;}
  .pwr-badge{font-family:'Oswald',sans-serif; font-size:23px; font-weight:600; color:#0a0d16; background:${t.color}; padding:7px 20px; border-radius:30px; direction:ltr;}
  .stars{padding:0 34px 18px; font-size:32px; letter-spacing:4px; color:${t.color}; text-shadow:0 0 16px color-mix(in srgb, ${t.color} 60%, transparent); direction:ltr; text-align:right;}
  .art{position:relative; flex:1; background-size:cover; background-position:center top; background-color:#151a28;}
  .art .fade{position:absolute; inset:0; background:linear-gradient(180deg, transparent 55%, rgba(10,13,22,.94) 100%);}
  .plate{padding:24px 26px 32px; text-align:center; background:linear-gradient(180deg, transparent, rgba(0,0,0,.55));}
  .name-en{font-family:'Oswald',sans-serif; font-weight:600; font-size:46px; letter-spacing:.03em; color:#fff; direction:ltr;}
  .anime-chip{margin-top:16px; display:inline-block; font-size:21px; font-family:'Oswald',sans-serif; letter-spacing:.08em; color:${t.color}; border:2px solid color-mix(in srgb, ${t.color} 50%, transparent); border-radius:30px; padding:7px 24px; text-transform:uppercase; background:color-mix(in srgb, ${t.color} 10%, transparent); direction:ltr;}
</style>
</head>
<body>
  <div class="card ${isOmega ? 'omega' : ''}" id="capture">
    <div class="tier-tag">${tierLabelHTML(tierKey)}<span class="pwr-badge">${power} PWR</span></div>
    <div class="stars">${starGlyphs(t.stars)}</div>
    <div class="art" style="${artStyle}"><div class="fade"></div></div>
    <div class="plate">
      <div class="name-en">${char.name}</div>
      <div class="anime-chip">${char.anime}</div>
    </div>
  </div>
</body>
</html>`
}

/**
 * يولّد صورة PNG لبطاقة شخصية واحدة بنفس تصميم إطار .المعرض
 * (لون حسب الرتبة + نجوم + شارة القوة + الاسم + شريحة الأنمي).
 * البيانات (name/anime/rarity/power/image/evolutionLevel) تُقرأ من
 * الكائن اللي تمرره مباشرة — فأي تعديل بـ characters.json ينعكس
 * تلقائيًا بمجرد ما .عرض/.بروفايل/.تطوير يجيبون أحدث نسخة (نفس
 * الطريقة الحالية بالضبط)، بدون أي تغيير بمنطق المعرض.
 * @param {Object} char - {name, anime, rarity, power, image, evolutionLevel?}
 * @returns {Promise<Buffer>} PNG buffer
 */
async function renderSingleCharacterCard(char) {
    if (!char) {
        throw new Error('لا يوجد شخصية لعرضها')
    }

    const html = singleCardHTML(char)

    const browser = await getBrowser()
    const page = await browser.newPage()
    try {
        await page.setViewport({
            width: 800,
            height: 1180,
            deviceScaleFactor: 2
        })
        await page.setContent(html, { waitUntil: 'networkidle0' })
        const el = await page.$('#capture')
        const shot = await el.screenshot({ type: 'png' })
        return Buffer.from(shot)
    } finally {
        await page.close()
    }
}

// ---------------------------------------------------------------
// 5) تحويل HTML لصورة PNG عبر Puppeteer
//    (نعيد استخدام نفس المتصفح لو موجود عشان السرعة)
// ---------------------------------------------------------------
let browserInstance = null

async function getBrowser() {
    if (browserInstance && browserInstance.isConnected()) return browserInstance
    browserInstance = await puppeteer.launch({
        headless: 'new',
        executablePath: process.env.CHROME_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    return browserInstance
}

/**
 * @param {Array} characters - [{name, anime, rarity, power, image, evolutionLevel?}]
 * @param {Object} opts - {title, subtitle}
 * @returns {Promise<Buffer>} PNG buffer
 */
async function renderRosterImage(characters, opts = {}) {
    if (!characters || characters.length === 0) {
        throw new Error('لا يوجد شخصيات لعرضها')
    }

    const html = fullPageHTML(characters, opts.title, opts.subtitle)

    const browser = await getBrowser()
    const page = await browser.newPage()
    try {
        const rowCount = Math.ceil(characters.length / MAX_PER_ROW)
        await page.setViewport({
            width: 1560,
            height: 260 + rowCount * 400,
            deviceScaleFactor: 2
        })
        await page.setContent(html, { waitUntil: 'networkidle0' })
        const el = await page.$('#capture')
        const shot = await el.screenshot({ type: 'png' })
        // ⚠️ Puppeteer v23+ يرجع Uint8Array بدل Buffer (breaking change رسمي).
        // Baileys يتحقق بـ Buffer.isBuffer() قبل الإرسال — لو مو Buffer حقيقي
        // يفتكره رابط ويحاول .toString() عليه فينهار. لازم نحوله صراحة هنا.
        return Buffer.from(shot)
    } finally {
        await page.close()
    }
}

module.exports = {
    TIER_ORDER,
    TIERS,
    resolveTierKey,
    renderRosterImage,
    fullPageHTML, // مفيدة للتجربة/الديبق بدون puppeteer
    renderSingleCharacterCard,
}
