// =====================================================================
// systems/kingdomPage.js — صفحة غزو المملكة بالموقع (/u/<كود>/kingdom)
// الواجهة (kingdomPage.css + kingdomPage.client.js) تُحقن داخل الصفحة،
// والبيانات تصل كـ JSON آمن (يُهرَّب منه "<").
// =====================================================================
const fs = require('fs')
const path = require('path')

const CSS = fs.readFileSync(path.join(__dirname, 'kingdomPage.css'), 'utf8')
const JS = fs.readFileSync(path.join(__dirname, 'kingdomPage.client.js'), 'utf8')

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]))

// data: { stages, chars, state, csrf, companion: { key, level, pct } }
function kingdomPageHTML({ code, data }) {
    const c = data.companion
    const cmp = c && c.key === 'shadow' && c.pct > 0
        ? `<div class="cmp on">⚫ رفيقك شادو — مستوى <b>${esc(c.level)}</b> · <b>+${esc(c.pct)}%</b> على مال كل مرحلة</div>`
        : `<div class="cmp">⚫ لا يوجد معك رفيق شادو — بدون بونص مال إضافي</div>`
    const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>غزو المملكة</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="top"><a href="/u/${esc(code)}" aria-label="رجوع">→</a><span>👑 غزو المملكة</span></div>
<div class="wrap">
 <div class="cd">⏳ يتجدد الغزو عند 12:00 ليلاً — بعد <b id="cdv"></b></div>
 <div class="dots" id="dots"></div>
 <div class="info"><span class="tt">💰 أرباح اليوم <b id="earn">0</b><i>|</i>🏦 إجمالي الأرباح <b id="tot">0</b></span><span id="prog"></span></div>
 ${cmp}
 <div id="scene" style="margin-top:10px">
  <div id="cam">
   <div class="ly" id="sky"></div><div class="ly" id="far"></div><div class="ly" id="art"></div><div class="ly" id="mid"></div>
   <div class="ly" id="amb"></div>
   <div class="unit" id="boss"></div><div class="unit" id="hero"></div>
  </div>
  <div class="sname" id="sname"></div>
  <div id="flash"></div><div id="card"><div><em id="cn"></em><b id="ct"></b><hr></div></div>
 </div>
 <div id="pick"></div>
</div>
<div class="dock" id="dock"><button class="go" id="go" type="button">⚔️ اقتحام</button></div>
<script type="application/json" id="kd">${json}</script>
<script>${JS}</script>
</body></html>`
}

module.exports = { kingdomPageHTML }
