// =====================================================================
// systems/galleryTournamentDesign.js
// -----------------------------------------------------------------
// التصميم فقط لبطولة "أفضل معرض" — مسؤول عن تحويل بيانات كل دور
// (مباريات الدور الحالي) إلى صورة PNG بنفس هوية التصميم الذهبي
// اللي تمت الموافقة عليه (كحلي غامق + إطارات ذهبية).
//
// ⚠️ صورة البطولة (renderBracketTreeImage) هي دائمًا "شجرة كاملة"
// واحدة من أول دور لآخر دور — ما فيه صور منفصلة/مقصوصة لكل دور ولا
// حذف لأي دور سابق. كل ما انتهى دور، تُحدَّث نفس الشجرة: أسماء
// الدور المنتهي تبقى ظاهرة مع خط شطب احترافي على كل خاسر، والدور
// الجديد يعرض أسماء حقيقية، والأدوار القادمة "الفائز من مباراة N".
//
// ما فيه أي منطق لعبة/تصويت/قرعة هنا — فقط عرض. المنطق بملف
// systems/galleryTournament.js
// =====================================================================

const puppeteer = require('puppeteer')

// ---------------------------------------------------------------
// متصفح مشترك (نفس فكرة myRosterCard.js) — يعاد استخدامه للسرعة
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

// ---------------------------------------------------------------
// القالب المشترك (الألوان + الخطوط) لكل صور البطولة
// ---------------------------------------------------------------
function baseStyles() {
    return `
    :root{
        --gold:#f0c04a; --gold-soft:#c99b2e; --gold-dim:#6b5320;
        --text:#f3f5fb; --text-dim:#8891a8;
        --card:#0f1426; --card2:#141a30;
        --line:rgba(240,192,74,.2);
    }
    *{box-sizing:border-box; margin:0; padding:0;}
    body{
        background:
            radial-gradient(1100px 520px at 50% -6%, rgba(240,192,74,.10), transparent 60%),
            radial-gradient(900px 500px at 15% 100%, rgba(255,59,92,.06), transparent 55%),
            radial-gradient(900px 500px at 85% 100%, rgba(255,59,92,.06), transparent 55%),
            linear-gradient(180deg,#04060c,#070a14 45%,#04060c);
        color:var(--text);
        font-family:'Cairo',sans-serif;
        padding:46px 40px 54px;
    }
    .wrap{max-width:1000px; margin:0 auto;}
    header{text-align:center; margin-bottom:8px;}
    .eyebrow{font-size:12px; letter-spacing:.5em; color:var(--gold-dim); text-transform:uppercase; margin-bottom:10px; font-weight:700;}
    .trophy{font-size:38px; margin-bottom:4px; filter:drop-shadow(0 0 18px rgba(240,192,74,.5));}
    h1{
        font-size:42px; font-weight:900;
        background:linear-gradient(180deg,#fff8e0,var(--gold) 55%,#9c7420);
        -webkit-background-clip:text; background-clip:text; color:transparent;
    }
    .sub{font-size:13px; letter-spacing:.22em; color:var(--text-dim); margin-top:8px; text-transform:uppercase; font-weight:600;}
    .divider{width:200px; height:2px; margin:20px auto 0; background:linear-gradient(90deg, transparent, var(--gold), transparent);}

    .grid{display:flex; flex-direction:column; gap:16px; margin-top:40px;}
    .match{
        position:relative; background:linear-gradient(180deg, var(--card2), var(--card));
        border:1.5px solid var(--line); border-radius:14px;
        padding:18px 24px; box-shadow:0 10px 26px rgba(0,0,0,.4);
        display:flex; align-items:center; justify-content:space-between; gap:18px;
    }
    .slot{display:flex; align-items:center; gap:12px; flex:1; min-width:0;}
    .slot.b{flex-direction:row-reverse; text-align:left;}
    .num{
        display:inline-flex; align-items:center; justify-content:center; flex:none;
        width:28px; height:28px; border-radius:8px;
        background:rgba(240,192,74,.10); border:1px solid var(--gold-dim);
        color:var(--gold); font-size:12px; font-weight:800;
    }
    .name{font-size:19px; font-weight:800; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
    .vs{
        flex:none; font-size:12px; letter-spacing:.25em; color:var(--gold-dim); font-weight:800;
        border:1px solid var(--gold-dim); border-radius:20px; padding:5px 12px;
    }

    footer{
        text-align:center; margin-top:44px; padding-top:20px; border-top:1px solid var(--line);
        color:var(--text-dim); font-size:12px; letter-spacing:.15em;
    }
    footer b{color:var(--gold-soft);}
    `
}

function fontLink() {
    return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">`
}

// ⚠️ الأسماء تجي من مستخدمين حقيقيين، ما نضمن خلوها من < > & إلخ —
// escape بسيط يمنع كسر الـ HTML أو حقن وسوم غريبة داخل الصورة
function escapeHTML(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------
// 1) صورة دور عادي (دور الـ16 / دور الثمانية / نصف النهائي)
//    matches: [{ aNum, aName, bNum, bName }]
// ---------------------------------------------------------------
function roundHTML({ roundTitle, roundBadge, matches }) {
    const rows = matches.map(m => `
        <div class="match">
            <div class="slot a">
                ${m.aNum ? `<span class="num">${m.aNum}</span>` : ''}
                <span class="name">${escapeHTML(m.aName)}</span>
            </div>
            <div class="vs">VS</div>
            <div class="slot b">
                ${m.bNum ? `<span class="num">${m.bNum}</span>` : ''}
                <span class="name">${escapeHTML(m.bName)}</span>
            </div>
        </div>
    `).join('')

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
${fontLink()}
<style>${baseStyles()}</style>
</head>
<body>
    <div class="wrap" id="capture">
        <header>
            <div class="eyebrow">TOP GALLERY TOURNAMENT</div>
            <div class="trophy">🏆</div>
            <h1>بطولة أجمل معرض</h1>
            <div class="sub">${roundBadge}</div>
            <div class="divider"></div>
        </header>
        <div class="grid">${rows}</div>
        <footer>اكتب <b>.اصوت 1</b> أو <b>.اصوت 2</b> لدعم المعرض المفضل لك</footer>
    </div>
</body>
</html>`
}

async function renderRoundImage({ roundTitle, roundBadge, matches }) {
    if (!matches || !matches.length) {
        throw new Error('لا يوجد مباريات لعرضها')
    }

    const html = roundHTML({ roundTitle, roundBadge, matches })

    const browser = await getBrowser()
    const page = await browser.newPage()
    try {
        await page.setViewport({
            width: 1080,
            height: 420 + matches.length * 120,
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
// 1.5) صورة الشجرة الكاملة (دور الـ16 ← الثمانية ← نصف النهائي ← النهائي)
//      تُرسل مرة وحدة فقط عند اكتمال العدد وبدء البطولة — تعرض
//      أسماء دور الـ16 الحقيقية (8 مباريات) وبقية الأدوار تُكتب
//      "الفائز من مباراة N" لأنها لسا ما تحددت. رقم كل مباراة
//      (الدائرة الذهبية) هو ترتيب المباراة نفسها، مو رقم المتسابق.
//
//      matches: مصفوفة من 8 عناصر بترتيب مباريات دور الـ16
//      (نفس ترتيب t.matches بعد pairUp) → [{ aName, bName }, ...]
//      matches[0..3] = النصف الأيسر بصريًا (مباريات 1-4)
//      matches[4..7] = النصف الأيمن بصريًا (مباريات 5-8)
// ---------------------------------------------------------------

// 🧱 بلوكات مباراة مشتركة (يُعاد استخدامها بكل صور شجرة البطولة)
// حتى ما يتكرر نفس الـ HTML
//
// ⚠️ خلّاص ما فيه صورة "منفصلة" لكل دور تحذف اللي قبلها — صار عندنا
// دالة واحدة توحّد رسم أي خانة متسابق (renderSlot) بثلاث حالات:
//   1) لسا ما تحددت (aName/bName لسا null) → "الفائز من مباراة N"
//   2) تحددت ولسا في البطولة (لم يُحسم مصيرها بعد) → اسم عادي
//   3) تحددت وخسرت مباراتها (decided + loserId) → شطب احترافي على
//      الاسم (خط بلون أحمر خافت + شفافية) بدل حذف الاسم بالكامل
function renderSlot(m, side, opts = {}) {
    const name = side === 'a' ? m.aName : m.bName
    const id = side === 'a' ? m.aId : m.bId
    const seed = side === 'a' ? m.aSeed : m.bSeed
    const fromNum = side === 'a' ? m.fromA : m.fromB
    const big = opts.big ? ' big' : ''

    if (!name) {
        return `<div class="fromMatch${big}">الفائز من مباراة <b>${fromNum}</b></div>`
    }

    const isLoser = !!(m.decided && m.loserId && id === m.loserId)
    const cls = isLoser ? 'pname lost' : 'pname'

    return `
        <div class="slot${big}">
            ${seed ? `<span class="seed">${seed}</span>` : ''}
            <span class="${cls}">${escapeHTML(name)}</span>
        </div>`
}

function matchCellHTML(m) {
    return `
        <div class="match"><span class="mnum">${m.num}</span>
            ${renderSlot(m, 'a')}
            <div class="vsline"><div class="bar"></div><span>VS</span><div class="bar"></div></div>
            ${renderSlot(m, 'b')}
        </div>`
}

function finalCellHTML(m) {
    return `
        <div class="final-col">
            <div class="final-medal">🏆</div>
            <div class="final-match">
                <span class="mnum">${m.num}</span>
                ${renderSlot(m, 'a', { big: true })}
                <div class="vsline"><div class="bar"></div><span>VS</span><div class="bar"></div></div>
                ${renderSlot(m, 'b', { big: true })}
            </div>
            <div class="champion-tag">CHAMPION</div>
        </div>`
}

// 🎨 الـ CSS المشترك لكل صور "الشجرة" (الكاملة وشجرة كل مرحلة تالية)
function bracketBaseStyles() {
    return `
    .wrap{max-width:2000px;}
    h1{font-size:58px;}
    .trophy{font-size:56px;}
    .round-labels{display:flex; justify-content:space-between; margin-top:56px; padding:0 6px;}
    .round-labels .label{flex:1; text-align:center; display:flex; flex-direction:column; align-items:center; gap:8px;}
    .round-labels .badge{
        width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center;
        background:rgba(240,192,74,.08); border:1.5px solid var(--gold-dim); color:var(--gold); font-weight:800; font-size:15px;
    }
    .round-labels .txt{font-size:14px; font-weight:800; color:var(--text-dim);}
    .bracket{display:flex; align-items:stretch; margin-top:22px; height:900px;}
    .round{display:flex; flex-direction:column; justify-content:space-around; flex:1; padding:0 22px;}
    .pair{display:flex; flex-direction:column; justify-content:space-around; flex:1; position:relative;}
    .match{
        position:relative; background:linear-gradient(180deg, var(--card2), var(--card));
        border:1.5px solid var(--line); border-radius:14px; box-shadow:0 10px 26px rgba(0,0,0,.45);
        padding:14px 18px; z-index:2;
    }
    .match .mnum{
        position:absolute; top:-11px; right:16px;
        background:var(--gold); color:#1a1204; font-weight:900; font-size:12px;
        width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center;
        box-shadow:0 4px 12px rgba(240,192,74,.5); border:2px solid #1a1204;
    }
    .slot{display:flex; align-items:center; gap:10px; padding:6px 0;}
    .seed{
        flex:none; width:24px; height:24px; border-radius:7px; display:flex; align-items:center; justify-content:center;
        background:rgba(240,192,74,.09); border:1px solid var(--gold-dim); color:var(--gold); font-size:11px; font-weight:800;
    }
    .pname{font-size:16px; font-weight:800; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
    .fromMatch{font-size:14px; font-weight:700; color:var(--text-dim);}
    .fromMatch b{color:var(--gold-soft); font-weight:800;}

    /* ❌ شطب احترافي على اسم الخاسر — خط أحمر خافت + تعتيم، بدون
       حذف الاسم أبدًا حتى تبقى الشجرة الكاملة تحكي قصة البطولة */
    .pname.lost{
        color:var(--text-dim);
        text-decoration:line-through;
        text-decoration-color:rgba(255,59,92,.85);
        text-decoration-thickness:2.5px;
        opacity:.55;
    }
    .slot.big .pname{font-size:20px;}
    .slot.big .seed{width:28px; height:28px; font-size:12px;}
    .fromMatch.big{font-size:18px; text-align:center; font-weight:900; color:var(--text);}
    .vsline{display:flex; align-items:center; gap:8px; margin:2px 0;}
    .vsline .bar{flex:1; height:1px; background:var(--line);}
    .vsline span{font-size:10px; letter-spacing:.2em; color:var(--gold-dim); font-weight:800;}
    .side-left .round:not(.final) .match::after{
        content:''; position:absolute; top:50%; right:100%; width:22px; height:0; border-top:2px solid var(--gold-dim); z-index:1;
    }
    .side-left .pair::before{
        content:''; position:absolute; top:25%; bottom:25%; right:-22px; width:2px; background:var(--gold-dim); z-index:1;
    }
    .side-left .round:not(.round-r16):not(.final) .match::before{
        content:''; position:absolute; top:50%; left:100%; width:22px; height:0; border-top:2px solid var(--gold-dim); z-index:1;
    }
    .side-right .round:not(.final) .match::before{
        content:''; position:absolute; top:50%; left:100%; width:22px; height:0; border-top:2px solid var(--gold-dim); z-index:1;
    }
    .side-right .pair::after{
        content:''; position:absolute; top:25%; bottom:25%; left:-22px; width:2px; background:var(--gold-dim); z-index:1;
    }
    .side-right .round:not(.round-r16):not(.final) .match::after{
        content:''; position:absolute; top:50%; right:100%; width:22px; height:0; border-top:2px solid var(--gold-dim); z-index:1;
    }
    .final-col{display:flex; flex-direction:column; justify-content:center; align-items:center; flex:1.3; position:relative;}
    .final-medal{font-size:34px; margin-bottom:14px; filter:drop-shadow(0 0 20px rgba(240,192,74,.6));}
    .final-match{
        width:100%; max-width:300px; background:linear-gradient(180deg,#1c1730,#0d0f1e);
        border:2px solid var(--gold); border-radius:18px; padding:22px 20px;
        box-shadow:0 0 0 1px rgba(240,192,74,.3), 0 24px 50px rgba(240,192,74,.22); position:relative; z-index:2;
    }
    .final-match .mnum{
        position:absolute; top:-13px; right:50%; transform:translateX(50%);
        background:var(--gold); color:#1a1204; font-weight:900; font-size:13px;
        width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center;
        box-shadow:0 4px 14px rgba(240,192,74,.55); border:2px solid #1a1204;
    }
    .champion-tag{margin-top:16px; font-size:12px; letter-spacing:.35em; text-align:center; color:var(--gold-dim); text-transform:uppercase; font-weight:800;}
    .final-col::before, .final-col::after{content:''; position:absolute; top:50%; width:22px; height:0; border-top:2px solid var(--gold);}
    .final-col::before{ right:100%; }
    .final-col::after{ left:100%; }
    `
}

// ---------------------------------------------------------------
// 🗂️ ترتيب/ترقيم المباريات حسب حجم البطولة (16/8/4 متسابق) — نفس
// المنطق يُستخدم بمنطق اللعبة (galleryTournament.js) لبناء الشجرة،
// هنا نستخدمه فقط لمعرفة أي رقم مباراة يروح بأي عمود/صف بالتصميم.
// 16 → [8,4,2,1] (دور16:1-8, ثمانية:9-12, نصف:13-14, نهائي:15)
// 8  → [4,2,1]   (ثمانية:1-4, نصف:5-6, نهائي:7)
// 4  → [2,1]     (نصف:1-2, نهائي:3)
// ---------------------------------------------------------------

// دور الـ16 → الثمانية → نصف النهائي → النهائي (3 أعمدة بكل جهة + النهائي بالوسط)
function treeBodySize16(matches) {
    const g = n => matches[n]
    return `
    <div class="bracket">
        <div class="side-left" style="display:flex; flex:3;">
            <div class="round round-r16">
                <div class="pair">
                    ${matchCellHTML(g(1))}
                    ${matchCellHTML(g(2))}
                </div>
                <div class="pair">
                    ${matchCellHTML(g(3))}
                    ${matchCellHTML(g(4))}
                </div>
            </div>
            <div class="round">
                <div class="pair">
                    ${matchCellHTML(g(9))}
                    ${matchCellHTML(g(10))}
                </div>
            </div>
            <div class="round">
                <div class="pair">
                    ${matchCellHTML(g(13))}
                </div>
            </div>
        </div>

        ${finalCellHTML(g(15))}

        <div class="side-right" style="display:flex; flex:3;">
            <div class="round">
                <div class="pair">
                    ${matchCellHTML(g(14))}
                </div>
            </div>
            <div class="round">
                <div class="pair">
                    ${matchCellHTML(g(11))}
                    ${matchCellHTML(g(12))}
                </div>
            </div>
            <div class="round round-r16">
                <div class="pair">
                    ${matchCellHTML(g(5))}
                    ${matchCellHTML(g(6))}
                </div>
                <div class="pair">
                    ${matchCellHTML(g(7))}
                    ${matchCellHTML(g(8))}
                </div>
            </div>
        </div>
    </div>`
}

// دور الثمانية → نصف النهائي → النهائي (بطولة بدأت بـ 8 متسابقين)
function treeBodySize8(matches) {
    const g = n => matches[n]
    return `
    <div class="bracket">
        <div class="side-left" style="display:flex; flex:2;">
            <div class="round round-r16">
                <div class="pair">
                    ${matchCellHTML(g(1))}
                    ${matchCellHTML(g(2))}
                </div>
            </div>
            <div class="round">
                <div class="pair">${matchCellHTML(g(5))}</div>
            </div>
        </div>

        ${finalCellHTML(g(7))}

        <div class="side-right" style="display:flex; flex:2;">
            <div class="round">
                <div class="pair">${matchCellHTML(g(6))}</div>
            </div>
            <div class="round round-r16">
                <div class="pair">
                    ${matchCellHTML(g(3))}
                    ${matchCellHTML(g(4))}
                </div>
            </div>
        </div>
    </div>`
}

// نصف النهائي → النهائي (بطولة بدأت بـ 4 متسابقين)
function treeBodySize4(matches) {
    const g = n => matches[n]
    return `
    <div class="bracket">
        <div class="side-left" style="display:flex; flex:1;">
            <div class="round round-r16">${matchCellHTML(g(1))}</div>
        </div>

        ${finalCellHTML(g(3))}

        <div class="side-right" style="display:flex; flex:1;">
            <div class="round round-r16">${matchCellHTML(g(2))}</div>
        </div>
    </div>`
}

function roundLabelsHTML(size) {
    if (size === 16) {
        return `
        <div class="round-labels">
            <div class="label"><span class="badge">16</span><span class="txt">دور الـ16</span></div>
            <div class="label"><span class="badge">8</span><span class="txt">دور الثمانية</span></div>
            <div class="label"><span class="badge">4</span><span class="txt">نصف النهائي</span></div>
            <div class="label"><span class="badge">🏆</span><span class="txt">النهائي</span></div>
            <div class="label"><span class="badge">4</span><span class="txt">نصف النهائي</span></div>
            <div class="label"><span class="badge">8</span><span class="txt">دور الثمانية</span></div>
            <div class="label"><span class="badge">16</span><span class="txt">دور الـ16</span></div>
        </div>`
    }
    if (size === 8) {
        return `
        <div class="round-labels">
            <div class="label"><span class="badge">8</span><span class="txt">دور الثمانية</span></div>
            <div class="label"><span class="badge">4</span><span class="txt">نصف النهائي</span></div>
            <div class="label"><span class="badge">🏆</span><span class="txt">النهائي</span></div>
            <div class="label"><span class="badge">4</span><span class="txt">نصف النهائي</span></div>
            <div class="label"><span class="badge">8</span><span class="txt">دور الثمانية</span></div>
        </div>`
    }
    return `
    <div class="round-labels">
        <div class="label"><span class="badge">4</span><span class="txt">نصف النهائي</span></div>
        <div class="label"><span class="badge">🏆</span><span class="txt">النهائي</span></div>
        <div class="label"><span class="badge">4</span><span class="txt">نصف النهائي</span></div>
    </div>`
}

// كل ما صغر حجم البطولة كبّرنا الخط/البطاقات شوي حتى ما تطلع الصورة
// صغيرة وفاضية رغم قلة الأعمدة
function sizeScaleStyles(size) {
    const scale = size === 16 ? 1 : size === 8 ? 1.2 : 1.4
    const maxWidth = size === 16 ? 2000 : size === 8 ? 1500 : 1100
    return `
    .wrap{max-width:${maxWidth}px;}
    h1{font-size:${Math.round(58 * scale)}px;}
    .trophy{font-size:${Math.round(56 * scale)}px;}
    .pname{font-size:${Math.round(16 * scale)}px;}
    .fromMatch{font-size:${Math.round(14 * scale)}px;}
    .seed{width:${Math.round(24 * scale)}px; height:${Math.round(24 * scale)}px; font-size:${Math.round(11 * scale)}px;}
    .match{padding:${Math.round(14 * scale)}px ${Math.round(18 * scale)}px;}
    .final-match{padding:${Math.round(22 * scale)}px ${Math.round(20 * scale)}px; max-width:${Math.round(300 * scale)}px;}
    .final-medal{font-size:${Math.round(34 * scale)}px;}
    .champion-tag{font-size:${Math.round(12 * scale)}px;}
    .round-labels .badge{width:${Math.round(40 * scale)}px; height:${Math.round(40 * scale)}px; font-size:${Math.round(15 * scale)}px;}
    .round-labels .txt{font-size:${Math.round(14 * scale)}px;}
    .slot.big .pname{font-size:${Math.round(20 * scale)}px;}
    .fromMatch.big{font-size:${Math.round(18 * scale)}px;}
    `
}

// ---------------------------------------------------------------
// 🌳 صورة "شجرة البطولة" — الدالة الوحيدة لصورة كل الأدوار من الآن
// فصاعدًا. تُرسل هذي الصورة عند بداية كل دور (دور الـ16 / الثمانية
// / نصف النهائي / النهائي) وهي دائمًا الشجرة الكاملة من أولها
// لآخرها — ما فيه "حذف" لأي دور سابق ولا صورة مقصوصة:
//   • الأدوار المنتهية: أسماء حقيقية + خط شطب احترافي على كل خاسر
//   • الدور الحالي: أسماء حقيقية (تحددت بالتو) بدون شطب لأنها لسا
//     ما لعبت مباراتها
//   • الأدوار القادمة: "الفائز من مباراة N" لأنها لسا ما تحددت
//
// matches: كائن (object) مفاتيحه أرقام المباريات (1..N) وقيمته
// { aId, bId, aName, bName, aSeed, bSeed, fromA, fromB,
//   winnerId, loserId, decided }  — نفس الشكل المُدار بـ
// galleryTournament.js (t.bracket)
// ---------------------------------------------------------------
function bracketTreeHTML({ size, matches, roundBadge }) {
    const body =
        size === 16 ? treeBodySize16(matches) :
        size === 8 ? treeBodySize8(matches) :
        treeBodySize4(matches)

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
${fontLink()}
<style>
${baseStyles()}
${bracketBaseStyles()}
${sizeScaleStyles(size)}
</style>
</head>
<body>
<div class="wrap" id="capture">
    <header>
        <div class="eyebrow">TOP GALLERY TOURNAMENT</div>
        <div class="trophy">🏆</div>
        <h1>بطولة أجمل معرض</h1>
        <div class="sub">${roundBadge}</div>
        <div class="divider"></div>
    </header>

    ${roundLabelsHTML(size)}
    ${body}

    <footer>
        اكتب <b>.اصوت 1</b> أو <b>.اصوت 2</b> لدعم المعرض المفضل لك — الفائز يتقدم للدور القادم
        <div style="margin-top:10px; font-size:12px; opacity:.75;">
            الدائرة الذهبية أعلى كل مباراة = رقم المباراة (وليس رقم المتسابق) · الاسم المشطوب = خرج من البطولة · نظام البطولة: Single Elimination
        </div>
    </footer>
</div>
</body>
</html>`
}

async function renderBracketTreeImage({ size, matches, roundBadge }) {
    if (![16, 8, 4].includes(size)) {
        throw new Error('حجم بطولة غير مدعوم لصورة الشجرة (المتوقع 16 أو 8 أو 4)')
    }
    if (!matches) {
        throw new Error('لا يوجد بيانات مباريات لعرض شجرة البطولة')
    }

    const html = bracketTreeHTML({ size, matches, roundBadge })

    const viewport =
        size === 16 ? { width: 2000, height: 1250 } :
        size === 8 ? { width: 1500, height: 1050 } :
        { width: 1100, height: 950 }

    const browser = await getBrowser()
    const page = await browser.newPage()
    try {
        await page.setViewport({ ...viewport, deviceScaleFactor: 2 })
        await page.setContent(html, { waitUntil: 'networkidle0' })
        const el = await page.$('#capture')
        const shot = await el.screenshot({ type: 'png' })
        return Buffer.from(shot)
    } finally {
        await page.close()
    }
}

// ---------------------------------------------------------------
// 2) صورة النهائي — تصميم خاص (كرت مركزي مذهّب + كأس)
//    ⚠️ لم تعد تُستخدم بتدفق البطولة (النهائي الآن جزء من شجرة
//    renderBracketTreeImage نفسها، بنفس هوية التصميم) — أُبقيها
//    مصدّرة للتوافق فقط لو استُخدمت بمكان آخر
// ---------------------------------------------------------------
function finalHTML({ aName, bName }) {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
${fontLink()}
<style>
${baseStyles()}
.final-card{
    margin-top:40px; text-align:center;
    background:linear-gradient(180deg,#1a1428,#0d0f1e);
    border:2px solid var(--gold); border-radius:20px;
    box-shadow:0 0 0 1px rgba(240,192,74,.3), 0 20px 46px rgba(240,192,74,.2);
    padding:40px 30px;
}
.final-trophy{font-size:50px; margin-bottom:10px; filter:drop-shadow(0 0 20px rgba(240,192,74,.6));}
.final-names{display:flex; align-items:center; justify-content:center; gap:26px; margin-top:14px;}
.final-name{font-size:26px; font-weight:900; color:var(--text);}
.final-vs{font-size:14px; letter-spacing:.3em; color:var(--gold-dim); font-weight:800;}
.champion-tag{
    margin-top:20px; font-size:12px; letter-spacing:.35em;
    color:var(--gold-dim); text-transform:uppercase; font-weight:800;
}
</style>
</head>
<body>
    <div class="wrap" id="capture">
        <header>
            <div class="eyebrow">TOP GALLERY TOURNAMENT</div>
            <div class="trophy">🏆</div>
            <h1>بطولة أجمل معرض</h1>
            <div class="sub">النهائي الكبير</div>
            <div class="divider"></div>
        </header>
        <div class="final-card">
            <div class="final-trophy">🏆</div>
            <div class="final-names">
                <span class="final-name">${escapeHTML(aName)}</span>
                <span class="final-vs">VS</span>
                <span class="final-name">${escapeHTML(bName)}</span>
            </div>
            <div class="champion-tag">Champion</div>
        </div>
        <footer>اكتب <b>.اصوت 1</b> أو <b>.اصوت 2</b> — الفائز يتوّج بطلاً للبطولة</footer>
    </div>
</body>
</html>`
}

async function renderFinalImage({ aName, bName }) {
    const html = finalHTML({ aName, bName })

    const browser = await getBrowser()
    const page = await browser.newPage()
    try {
        await page.setViewport({ width: 900, height: 720, deviceScaleFactor: 2 })
        await page.setContent(html, { waitUntil: 'networkidle0' })
        const el = await page.$('#capture')
        const shot = await el.screenshot({ type: 'png' })
        return Buffer.from(shot)
    } finally {
        await page.close()
    }
}

// ---------------------------------------------------------------
// 3) صورة إعلان البطل النهائي
// ---------------------------------------------------------------
function championHTML({ championName, runnerUpName }) {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
${fontLink()}
<style>
${baseStyles()}
.champ-card{
    margin-top:40px; text-align:center;
    background:linear-gradient(180deg,#1a1428,#0d0f1e);
    border:2px solid var(--gold); border-radius:20px;
    box-shadow:0 0 0 1px rgba(240,192,74,.3), 0 20px 46px rgba(240,192,74,.2);
    padding:44px 30px;
}
.big-trophy{font-size:64px; margin-bottom:14px; filter:drop-shadow(0 0 24px rgba(240,192,74,.65));}
.champ-name{font-size:32px; font-weight:900; color:var(--gold); margin-bottom:6px;}
.champ-label{font-size:12px; letter-spacing:.3em; color:var(--text-dim); text-transform:uppercase; font-weight:700; margin-bottom:26px;}
.runner{font-size:16px; color:var(--text-dim); font-weight:700;}
.runner b{color:var(--text);}
</style>
</head>
<body>
    <div class="wrap" id="capture">
        <header>
            <div class="eyebrow">TOP GALLERY TOURNAMENT</div>
            <div class="sub">نتيجة البطولة النهائية</div>
            <div class="divider"></div>
        </header>
        <div class="champ-card">
            <div class="big-trophy">🏆</div>
            <div class="champ-name">${escapeHTML(championName)}</div>
            <div class="champ-label">Champion · أجمل معرض</div>
            <div class="runner">🥈 وصيف البطولة: <b>${escapeHTML(runnerUpName)}</b></div>
        </div>
    </div>
</body>
</html>`
}

async function renderChampionImage({ championName, runnerUpName }) {
    const html = championHTML({ championName, runnerUpName })

    const browser = await getBrowser()
    const page = await browser.newPage()
    try {
        await page.setViewport({ width: 900, height: 760, deviceScaleFactor: 2 })
        await page.setContent(html, { waitUntil: 'networkidle0' })
        const el = await page.$('#capture')
        const shot = await el.screenshot({ type: 'png' })
        return Buffer.from(shot)
    } finally {
        await page.close()
    }
}

module.exports = {
    renderRoundImage,
    renderBracketTreeImage,
    renderFinalImage,
    renderChampionImage,
}
