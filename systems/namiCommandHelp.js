'use strict'

// =====================================================================
// 📖 systems/namiCommandHelp.js — نامي تشرح أي أمر أو ميزة بالبوت (v2)
// ---------------------------------------------------------------------
// أمثلة:  نامي اشرحي لي .هجوم | نامي اشرحي لي حرب سفينة | نامي اشرحي لي المعرض بالموقع
//
// كيف تعمل:
//  1) فهرسة كل ملفات المشروع (.js) تلقائياً — أي أمر له معالج بأي ملف يُلتقط
//     (if / case / جدول أوامر)، وكذلك مسارات الموقع (app.get / router.post ...)
//  2) شرح القاموس commandExplanations (إن وُجد) يُستخدم كمرجع رسمي
//  3) عند السؤال: يُستخرج كود المعالج + الدوال التي يستدعيها (حتى لو بملف آخر)
//     لتشرح نامي الآلية الداخلية (الشروط، الحسابات، التكلفة، الكولداون...)
// =====================================================================

const fs = require('fs')
const path = require('path')

const DIACRITICS = /[\u064B-\u065F\u0670\u0640]/g

function norm(s) {
    return String(s || '')
        .replace(DIACRITICS, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
        .toLowerCase()
        .replace(/[_\-.\/:]+/g, ' ')
        .replace(/[؟?!،,;"'“”()\[\]{}*~`]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function tokenize(s) {
    return norm(s)
        .split(' ')
        .filter(Boolean)
        .map(t => (t.length > 3 && t.startsWith('ال')) ? t.slice(2) : t)
}

const TRIGGERS = new Set([
    'اشرح', 'اشرحي', 'شرح', 'وضح', 'وضحي', 'فسر', 'فسري', 'علمني', 'علميني',
    'عرفني', 'عرفيني', 'اخبرني', 'اخبريني', 'قولي', 'وش', 'ايش', 'شو', 'ماذا',
    'ما', 'ماهو', 'ماهي', 'كيف', 'طريقه', 'استخدام', 'استخدم', 'استعمل',
    'يسوي', 'تسوي', 'يفعل', 'تفعل', 'يعمل', 'تعمل', 'فايده', 'وظيفه', 'معني',
    'يفيد', 'تفيد', 'متي', 'الايه', 'اليه', 'تشتغل', 'يشتغل', 'اشتغال'
])

const FILLERS = new Set([
    ...TRIGGERS, 'لي', 'لنا', 'عن', 'امر', 'اوامر', 'هذا', 'هذه', 'هو', 'هي',
    'في', 'بوت', 'ممكن', 'ياريت', 'تكفين', 'بالتفصيل', 'تفصيل', 'مفصل', 'كامل',
    'كاملا', 'يا', 'نامي', 'لو', 'سمحتي', 'سمحت', 'كل', 'جميع', 'قسم', 'شرحا',
    'بشكل', 'وكيف', 'لوحدك', 'الي', 'اللي', 'ب', 'ال'
])

// كلمات تعني "عن البوت نفسه" (للجدد): نامي اشرحي لي عن البوت / عرّفيني بالبوت / اشرحي البوت للجدد
const ABOUT_EXTRA = new Set(['نفسك', 'جديد', 'جدد', 'للجدد', 'جديدين', 'للجديدين', 'مبتدئ', 'مبتدئين', 'للمبتدئين', 'بداية', 'ابدا', 'تعريف', 'نبذه', 'ملخص', 'كامل', 'بالكامل', 'عام', 'عامه', 'علي', 'حول', 'معلومات', 'بخصوص', 'ب'])
const SITE_WORDS = new Set(['موقع', 'صفحه', 'سايت', 'تطبيق', 'بالموقع', 'بالتطبيق', 'website'])

// أسماء بديلة (إنجليزية/قديمة) → الأمر الأصلي
const ALIASES = {
    'echoes': '.ايكو', 'ايكوزاتي': '.ايكو', 'echo families': '.عوائل_الايكو',
    'domain': '.دومين', 'domains': '.دومين', 'domain team': '.فريق_دومين',
    'enter domain': '.دخول_دومين', 'sellitem': '.بيع_ايكو'
}

const EXT_BLACKLIST = new Set([
    'png', 'jpg', 'jpeg', 'json', 'js', 'mp3', 'mp4', 'webp', 'gif', 'txt', 'html', 'css',
    'svg', 'ogg', 'pdf', 'csv', 'env', 'md', 'ico', 'wav', 'zip', 'mjs', 'cjs', 'ejs', 'map',
    'ttf', 'woff', 'woff2', 'xml', 'yml', 'yaml', 'lock', 'log'
])

const CALL_SKIP = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'await', 'async', 'typeof',
    'require', 'console', 'safeSend', 'Number', 'String', 'Boolean', 'Math', 'JSON', 'Date',
    'Object', 'Array', 'Promise', 'parseInt', 'parseFloat', 'setTimeout', 'setInterval',
    'clearTimeout', 'Set', 'Map', 'Error', 'isNaN', 'isFinite', 'Symbol', 'BigInt', 'sleep',
    'push', 'map', 'filter', 'find', 'join', 'split', 'replace', 'trim', 'toString', 'slice',
    'test', 'match', 'startsWith', 'endsWith', 'then', 'finally', 'includes', 'new', 'else',
    'delete', 'void', 'throw', 'try', 'case', 'default', 'break', 'continue', 'sock', 'msg',
    'sendMessage', 'log', 'now', 'floor', 'round', 'ceil', 'random', 'max', 'min', 'abs'
])

const SECRET_LINE = /process\.env|api[_-]?key|secret|bearer|mongodb(\+srv)?:\/\//i
const OWNER_HINT = /isOwner\s*\(|OWNER_|ADMIN_IDS|isDeveloper|isDev\s*\(/

function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// هل الأمر يظهر بالسطر بصيغة إيجابية؟ (يتجاهل !== و !text.startsWith('...') وما شابه)
const NEG_BEFORE = /(?:!==?\s*|!\s*[\w$.()]*(?:startsWith|includes|has)\(\s*|!\s*[\w$.]*\(\s*)$/
function positiveOccurrence(line, rx) {
    const g = new RegExp(rx.source, 'g')
    let m
    while ((m = g.exec(line))) {
        const before = line.slice(Math.max(0, m.index - 45), m.index)
        if (!NEG_BEFORE.test(before)) return true
        if (m.index === g.lastIndex) g.lastIndex++
    }
    return false
}

function clip(L, n = 240) {
    return L.length > n ? L.slice(0, n) + '…' : L
}

function createNamiCommandHelp({
    commandExplanations,
    extra = {},
    projectRoot = process.cwd(),
    extraRoots = [],
    maxDepth = 5,
    featureAliases = {},     // { 'المعرض': '/gallery', 'البنر': '/banner' } عبارة عربية → جزء من المسار
    limits = null            // [ {modules: 20000}, {...}, {...} ] تعديل ميزانية السياق لكل مستوى (0 كامل، 1 أخف، 2 أخف)
} = {}) {

    // ───────────── 1) فهرس القاموس ─────────────
    const entries = []
    const byKey = new Map()

    const add = (cmd, desc, category, extraProps = {}) => {
        cmd = String(cmd).trim()
        const key = tokenize(cmd).join(' ')
        if (!key || byKey.has(key)) return null
        const entry = {
            kind: 'command',
            cmd,
            key,
            keyTokens: key.split(' '),
            desc: String(desc || '').trim(),
            category,
            descTokens: new Set(tokenize(desc || '')),
            catTokens: new Set(tokenize(String(category))),
            devOnly: /للمطور|لصاحب البوت|للمالك/.test(desc || ''),
            documented: !!desc,
            ...extraProps
        }
        entries.push(entry)
        byKey.set(key, entry)
        return entry
    }

    for (const cat of Object.keys(commandExplanations || {})) {
        const v = commandExplanations[cat]
        if (v && typeof v === 'object') {
            for (const k of Object.keys(v)) {
                if (typeof v[k] === 'string') add(k, v[k], cat)
            }
        } else if (typeof v === 'string') {
            for (const line of v.split('\n')) {
                const m = line.match(/^\s*\S{0,4}\s*(\.[\u0600-\u06FFA-Za-z0-9_]+)/)
                if (m) add(m[1], line.trim(), cat)
            }
        }
    }
    for (const k of Object.keys(extra || {})) add(k, extra[k], 'إضافات')

    // ───────────── 2) فهرسة ملفات المشروع (كسولة) ─────────────
    let _files = null
    let _scanned = false
    const features = []          // مسارات الموقع وميزاته
    const stats = { files: 0, discovered: 0, routes: 0, truncated: false }

    function loadFiles() {
        if (_files) return _files
        _files = []
        const skip = new Set(['node_modules', 'uploads', 'auth_info', 'sessions', 'auth', 'tmp', 'temp', 'logs', 'backup', 'backups', 'dist', 'build', 'coverage'])
        let totalBytes = 0
        const CAP = 60 * 1024 * 1024
        const roots = [projectRoot, ...extraRoots]
        const seen = new Set()

        const walk = (dir, depth) => {
            let list = []
            try { list = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
            for (const d of list) {
                const p = path.join(dir, d.name)
                if (d.isDirectory()) {
                    if (depth < maxDepth && !skip.has(d.name) && !d.name.startsWith('.')) walk(p, depth + 1)
                } else if (d.isFile() && /\.(js|mjs|cjs)$/.test(d.name) && !/\.min\.js$/.test(d.name)) {
                    if (seen.has(p)) continue
                    seen.add(p)
                    try {
                        const size = fs.statSync(p).size
                        if (size > 8 * 1024 * 1024) continue
                        if (totalBytes + size > CAP) { stats.truncated = true; continue }
                        totalBytes += size
                        const text = fs.readFileSync(p, 'utf8')
                        _files.push({
                            name: path.relative(projectRoot, p).replace(/\\/g, '/'),
                            abs: p,
                            text,
                            lines: text.split('\n'),
                            _imports: null,
                            _funcCache: new Map()
                        })
                    } catch { /* تجاهل */ }
                }
            }
        }
        for (const r of roots) walk(r, 0)
        // الملفات الأصغر أولاً عدا index.js (معالجات الأوامر غالباً هناك)
        _files.sort((a, b) => (b.name === 'index.js') - (a.name === 'index.js'))
        stats.files = _files.length
        return _files
    }

    function isCommentLine(t) {
        return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')
    }

    function commentAbove(lines, i, max = 4) {
        const out = []
        for (let j = i - 1; j >= 0 && out.length < max; j--) {
            const t = lines[j].trim()
            if (/^\/\//.test(t)) {
                const c = t.replace(/^\/\/+\s*/, '').replace(/[=━─\-]{3,}/g, '').trim()
                if (c) out.unshift(c)
            } else if (t === '') {
                if (out.length) break
            } else break
        }
        return out.join(' ')
    }

    // أوامر ومسارات مكتشفة من الكود
    function scanProject() {
        if (_scanned) return
        _scanned = true
        const files = loadFiles()
        const condRe = /===|==|startsWith\(|\bcase\s|\.test\(|\.has\(|\.includes\(/
        const cmdRe = /['"`](\.[\u0600-\u06FFA-Za-z][\u0600-\u06FFA-Za-z0-9_\-]*)/g
        const routeRe = /\b(?:app|router|\w*[Rr]outer|server)\.(get|post|put|patch|delete|all)\(\s*(['"`])([^'"`]+)\2/

        for (const f of files) {
            for (let i = 0; i < f.lines.length; i++) {
                const line = f.lines[i]
                if (line.length < 4) continue
                const t = line.trim()
                if (isCommentLine(t)) continue

                // مسار موقع
                if (line.includes('(') && /\.(get|post|put|patch|delete|all)\(/.test(line)) {
                    const rm = line.match(routeRe)
                    if (rm && features.length < 600) {
                        const route = rm[3]
                        const comment = commentAbove(f.lines, i)
                        features.push({
                            kind: 'feature',
                            method: rm[1].toUpperCase(),
                            route,
                            comment,
                            file: f.name,
                            line: i,
                            tokens: new Set(tokenize(route.replace(/:\w+/g, ' ') + ' ' + comment))
                        })
                        stats.routes++
                    }
                }

                // أوامر بصيغة شرط
                if (line.includes('.') && condRe.test(line)) {
                    cmdRe.lastIndex = 0
                    let m
                    while ((m = cmdRe.exec(line))) {
                        const c = m[1]
                        if (NEG_BEFORE.test(line.slice(Math.max(0, m.index - 45), m.index))) continue
                        const ext = c.slice(1).toLowerCase()
                        if (EXT_BLACKLIST.has(ext)) continue
                        const key = tokenize(c).join(' ')
                        if (!key || byKey.has(key)) continue
                        const e = add(c, '', 'غير_مصنف', { file: f.name, line: i, discoveredComment: commentAbove(f.lines, i, 3) })
                        if (e) stats.discovered++
                    }
                    continue
                }

                // جدول أوامر:  '.cmd': handler
                const tm = t.match(/^['"`](\.[\u0600-\u06FF][\u0600-\u06FFA-Za-z0-9_\-]*)['"`]\s*:\s*(.*)$/)
                if (tm && !/^['"`]/.test(tm[2])) {
                    const key = tokenize(tm[1]).join(' ')
                    if (key && !byKey.has(key)) {
                        const e = add(tm[1], '', 'غير_مصنف', { file: f.name, line: i, discoveredComment: commentAbove(f.lines, i, 3) })
                        if (e) stats.discovered++
                    }
                }
            }
        }
    }

    function applyFeatureAliases() {
        for (const phrase of Object.keys(featureAliases || {})) {
            const part = String(featureAliases[phrase])
            const toks = tokenize(phrase)
            for (const ft of features) {
                if (ft.route.includes(part)) toks.forEach(t => ft.tokens.add(t))
            }
        }
    }

    // ───────────── 3) تحليل السؤال ─────────────
    function longestPrefix(tokens) {
        for (let k = Math.min(4, tokens.length); k >= 1; k--) {
            const phrase = tokens.slice(0, k).join(' ')
            const hit = byKey.get(phrase) ||
                (ALIASES[phrase] && byKey.get(tokenize(ALIASES[phrase]).join(' ')))
            if (hit) return { entry: hit, k }
        }
        return null
    }

    function findRelated(tokens, main) {
        return entries
            .filter(e => e !== main && tokens.length > 0 && tokens.every(t => e.keyTokens.includes(t)))
            .slice(0, 3)
    }

    function bestFeature(subj) {
        let best = null
        for (const ft of features) {
            if (!subj.every(t => ft.tokens.has(t))) continue
            const score = subj.length / (ft.tokens.size || 1)
            if (!best || score > best.score) best = { ft, score }
        }
        return best ? best.ft : null
    }

    function resolve(question) {
        const raw = String(question || '').trim()
        if (!raw) return null
        scanProject()
        applyFeatureAliases._done || (applyFeatureAliases(), applyFeatureAliases._done = true)

        // (أ) أمر بنقطة
        const dotted = raw.match(/(?:^|\s)\.([^\s.][^\n]*)/)
        if (dotted) {
            const tokens = tokenize(dotted[1])
            const hit = longestPrefix(tokens)
            if (hit) {
                return {
                    kind: 'command',
                    entry: hit.entry,
                    related: findRelated(tokens.slice(0, hit.k + 1), hit.entry)
                }
            }
        }

        const allTokens = tokenize(raw)
        if (!allTokens.some(t => TRIGGERS.has(t))) return null

        const hasCmdWord = allTokens.includes('امر') || allTokens.includes('اوامر')
        const hasSiteWord = allTokens.some(t => SITE_WORDS.has(t))
        const subject = allTokens.filter(t => !FILLERS.has(t))

        // "اشرحي لي عن البوت" (بدون أمر أو ميزة محددة): تعريف للجدد
        if ((allTokens.includes('بوت') || allTokens.includes('نفسك')) && !hasCmdWord && !hasSiteWord && subject.every(t => ABOUT_EXTRA.has(t))) {
            return { kind: 'about' }
        }

        if (!subject.length) return hasCmdWord ? { kind: 'all' } : null

        // إن ذكر "الموقع" صراحة: نفضّل ميزة/صفحة الموقع على أمر الواتساب المشابه
        if (hasSiteWord) {
            const siteSubj = subject.filter(t => !SITE_WORDS.has(t))
            if (!siteSubj.length) return { kind: 'site' }
            const ft = bestFeature(siteSubj)
            if (ft) return { kind: 'feature', feature: ft }
        }

        // (ب) أمر بدون نقطة
        const hit = longestPrefix(subject)
        if (hit) {
            const trailing = subject.slice(hit.k)
            const e = hit.entry
            const ok = trailing.every(t =>
                e.keyTokens.includes(t) || e.descTokens.has(t) || e.catTokens.has(t) || SITE_WORDS.has(t))
            if (ok && subject.length <= 5) {
                return { kind: 'command', entry: e, related: findRelated(subject.slice(0, hit.k + 1), e) }
            }
        }

        // (ج) قسم كامل
        if (hasCmdWord || allTokens.includes('قسم')) {
            const cats = [...new Set(entries.map(e => e.category))]
            for (const cat of cats) {
                const ct = tokenize(String(cat))
                if (ct.length && ct.every(t => subject.includes(t))) {
                    return { kind: 'category', category: cat, list: entries.filter(e => e.category === cat) }
                }
            }
            if (subject.length <= 4) {
                const cands = entries
                    .filter(e => e.keyTokens.every(t => subject.includes(t)))
                    .sort((a, b) => b.keyTokens.length - a.keyTokens.length)
                if (cands.length) return { kind: 'command', entry: cands[0], related: cands.slice(1, 3) }
            }
        }

        // (د) ميزة/صفحة بالموقع (بدون ذكر كلمة موقع: نشترط كلمتين فأكثر)
        const siteSubject = subject.filter(t => !SITE_WORDS.has(t))
        if (siteSubject.length >= 2) {
            const ft = bestFeature(siteSubject)
            if (ft) return { kind: 'feature', feature: ft }
        }

        return null
    }

    // ───────────── 4) استخراج كود المعالج + الدوال المستدعاة ─────────────
    function isHandlerLine(line, cmd, rx) {
        const t = line.trim()
        if (isCommentLine(t)) return false
        if (!line.includes(cmd)) return false
        if (/^['"`]\.[^'"`]+['"`]\s*:\s*['"`]/.test(t)) return false          // سطر قاموس وصف
        if (!rx.test(line)) return false
        if (!positiveOccurrence(line, rx)) return false
        return /===|==|startsWith\(|\bcase\s|\.test\(|\.has\(|^['"`]\.[^'"`]+['"`]\s*:/.test(t) || /^['"`]\.[^'"`]+['"`]\s*:/.test(t)
    }

    function locateCommand(cmd, hint) {
        const files = loadFiles()
        const tries = [...new Set([cmd, cmd.split(/\s+/)[0]])]
        for (const c of tries) {
            const rx = new RegExp('[\'"`]' + escapeRe(c) + '[\'"`\\s]')
            if (hint && c === cmd) {
                const f = files.find(x => x.name === hint.file)
                if (f && hint.line != null) return { file: f, idx: hint.line }
            }
            for (const f of files) {
                for (let i = 0; i < f.lines.length; i++) {
                    if (isHandlerLine(f.lines[i], c, rx)) return { file: f, idx: i }
                }
            }
        }
        return null
    }

    function sanitizeLines(arr) {
        return arr.map(L => SECRET_LINE.test(L) ? '// ...' : clip(L))
    }

    function excerptAt(lines, i, maxChars) {
        let s = i
        while (s > 0 && i - s < 6 && /^\s*\/\//.test(lines[s - 1])) s--
        const baseIndent = lines[i].match(/^\s*/)[0].length
        const out = []
        let chars = 0
        for (let j = s; j < Math.min(lines.length, i + 260); j++) {
            const L = lines[j]
            const ind = L.match(/^\s*/)[0].length
            if (j > i + 1 && ind <= baseIndent && /^\s*(async\s+)?function\s+\w+\s*\(/.test(L)) break
            if (j > i + 1 && ind <= baseIndent && /^\s*(case\s|default\s*:)/.test(L)) break
            if (j > i + 8 && ind <= baseIndent &&
                (/^\s*if\s*\(.*(===|startsWith)/.test(L) ||
                    /^\s*\/\/ ─── /.test(L) ||
                    /^\s*(case\s|default\s*:)/.test(L) ||
                    /^\s*(async\s+)?function\s+\w+\s*\(/.test(L) ||
                    /^\s*(app|router|\w*[Rr]outer|server)\.(get|post|put|patch|delete|all)\(/.test(L))) break
            out.push(L)
            chars += L.length
            if (chars > maxChars) break
        }
        return sanitizeLines(out).join('\n')
    }

    function getImports(f) {
        if (f._imports) return f._imports
        const map = new Map()   // محلي → { file, member }
        const resolveSpec = (spec) => {
            const base = path.resolve(path.dirname(f.abs), spec)
            const cands = [base, base + '.js', path.join(base, 'index.js')]
            return (_files || []).find(x => cands.includes(x.abs)) || null
        }
        let m
        const re1 = /(?:const|let|var)\s*\{([^}]*)\}\s*=\s*require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g
        while ((m = re1.exec(f.text))) {
            const target = resolveSpec(m[2])
            if (!target) continue
            for (const part of m[1].split(',')) {
                const p = part.trim()
                if (!p) continue
                const [remote, local] = p.split(':').map(x => x.trim())
                map.set(local || remote, { file: target, member: remote })
            }
        }
        const re2 = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g
        while ((m = re2.exec(f.text))) {
            const target = resolveSpec(m[2])
            if (target) map.set(m[1], { file: target, member: null })
        }
        f._imports = map
        return map
    }

    function findFunction(f, name) {
        if (f._funcCache.has(name)) return f._funcCache.get(name)
        const n = escapeRe(name)
        const res = [
            new RegExp('^\\s*(?:export\\s+)?(?:async\\s+)?function\\s*\\*?\\s*' + n + '\\s*\\('),
            new RegExp('^\\s*(?:(?:module\\.)?exports\\.)?(?:const|let|var)?\\s*' + n + '\\s*[:=]\\s*(?:async\\s*)?(?:function\\b|\\([^)]*\\)\\s*=>|[\\w$]+\\s*=>)'),
            new RegExp('^\\s*(?:async\\s+)?' + n + '\\s*\\([^)]*\\)\\s*\\{')
        ]
        let found = -1
        for (let i = 0; i < f.lines.length && found < 0; i++) {
            const L = f.lines[i]
            if (!L.includes(name)) continue
            if (res.some(r => r.test(L))) found = i
        }
        f._funcCache.set(name, found)
        return found
    }

    function extractBlock(lines, idx, maxChars) {
        const out = []
        let depth = 0
        let seen = false
        let chars = 0
        for (let j = idx; j < Math.min(lines.length, idx + 320); j++) {
            const L = lines[j]
            out.push(L)
            chars += L.length
            for (const ch of L) {
                if (ch === '{') { depth++; seen = true } else if (ch === '}') depth--
            }
            if (seen && depth <= 0) break
            if (chars > maxChars) break
        }
        return sanitizeLines(out).join('\n')
    }

    function followCalls(f, code, budget, limit = 4) {
        const out = []
        const imports = getImports(f)
        const tried = new Set()
        let used = 0

        const tryAdd = (file, name, label) => {
            const id = file.name + '::' + name
            if (tried.has(id) || out.length >= limit) return
            tried.add(id)
            const idx = findFunction(file, name)
            if (idx < 0) return
            const left = budget - used
            if (left < 400) return
            const body = extractBlock(file.lines, idx, Math.min(left, 2600))
            used += body.length
            out.push({ label, file: file.name, code: body })
        }

        let m
        const memberRe = /(?<![.\w$])([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\(/g
        while ((m = memberRe.exec(code))) {
            const imp = imports.get(m[1])
            if (imp && imp.member === null) tryAdd(imp.file, m[2], m[1] + '.' + m[2])
            else if (imp) tryAdd(imp.file, m[2], m[1] + '.' + m[2])
        }
        const callRe = /(?<![.\w$])([A-Za-z_$][\w$]{2,})\s*\(/g
        while ((m = callRe.exec(code))) {
            const name = m[1]
            if (CALL_SKIP.has(name)) continue
            const imp = imports.get(name)
            if (imp && imp.member) tryAdd(imp.file, imp.member, name)
            else if (!imp) tryAdd(f, name, name)
        }
        return out
    }

    // قيم الثوابت (مثل COOLDOWN_MS / WAR_COST) المستخدمة بالكود المقتطع، ليكون الشرح بأرقام حقيقية
    function collectConstants(parts) {
        const names = new Set()
        for (const p of parts) {
            for (const m of p.code.matchAll(/\b[A-Z][A-Z0-9_]{2,}\b/g)) names.add(m[0])
        }
        const out = []
        for (const name of names) {
            if (out.length >= 60) break
            if (['JSON', 'NaN', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(name)) continue
            const rx = new RegExp('^\\s*(?:export\\s+)?(?:const|let|var)\\s+' + escapeRe(name) + '\\s*=\\s*(.+)$')
            let val = null
            // الملفات التي ظهرت فيها الأجزاء أولاً، ثم بقية المشروع
            const order = [...new Set(parts.map(p => p.file))]
                .map(n => loadFiles().find(f => f.name === n)).filter(Boolean)
            for (const f of [...order, ...loadFiles()]) {
                for (let i = 0; i < f.lines.length; i++) {
                    const L = f.lines[i]
                    if (!L.includes(name)) continue
                    const m = L.match(rx)
                    if (m && !/require\(/.test(m[1])) { val = m[1].trim().replace(/;$/, ''); break }
                }
                if (val) break
            }
            if (val && !SECRET_LINE.test(val)) out.push(`${name} = ${clip(val, 140)}`)
        }
        return out
    }

    // ───────────── 4-ب) قراءة النظام كاملاً (الملفات المرتبطة بالأمر) ─────────────
    // الأمر غالباً مجرد بوابة؛ المنطق الحقيقي في ملف نظام (systems/xxx.js) يُستدعى من الأمر ومن الموقع.
    // هنا نربط الأمر بملف النظام (استيراد يستدعيه المعالج / تعليق يذكر الأمر مع مسار الملف / مصنع النظام)،
    // ونقرأ الملف كاملاً إن وسعته الميزانية، وإلا: ملخص (ثوابت + فهرس دوال) + أهم الدوال بنصها.
    const _defaultLimits = [
        { main: 3000, follow: 2500, followN: 3, modules: 12000, moduleN: 2, callsite: 1500, usages: 3, usageChars: 1200, notes: 1200, globals: 2200, digestOnly: false },
        { main: 2000, follow: 0, followN: 0, modules: 6000, moduleN: 1, callsite: 1200, usages: 1, usageChars: 900, notes: 700, globals: 600, digestOnly: false },
        { main: 1200, follow: 0, followN: 0, modules: 2500, moduleN: 1, callsite: 0, usages: 0, usageChars: 0, notes: 0, globals: 0, digestOnly: true }
    ]
    const LIMITS = _defaultLimits.map((d, i) => ({ ...d, ...((limits && limits[i]) || {}) }))

    const DOMAIN_RX = /attack|hit|damage|dmg|cooldown|cd|reward|drop|cost|price|buy|sell|win|lose|start|finish|kill|spawn|summon|rage|follower|crit|heal|revive|death|dead|die|ability|skill|process|handle|compute|calc|apply|resolve|execute|round|turn|war|boss/i
    const FN_DECL = [
        /^\s*(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/,
        /^\s*(?:(?:module\.)?exports\.)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[\w$]+\s*=>)/,
        /^\s+(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{\s*$/
    ]
    const ROUTE_RX = /\b(?:app|router|\w*[Rr]outer|server)\.(get|post|put|patch|delete|all)\(\s*(['"`])([^'"`]+)\2/

    function compressForPrompt(lines) {
        const out = []
        for (const L of lines) {
            const t = L.trim()
            if (!t) continue
            if (/^console\.(log|error|warn|info)\(/.test(t)) continue
            if (/^(?:const|let|var)\s.*=\s*require\(/.test(t)) continue
            if (SECRET_LINE.test(L)) { out.push('// ...'); continue }
            const lead = L.match(/^\s*/)[0].length
            out.push(' '.repeat(Math.ceil(lead / 2)) + clip(t, 170))
        }
        return out
    }

    function compressedLen(f) {
        if (f._clen == null) f._clen = compressForPrompt(f.lines).join('\n').length
        return f._clen
    }

    function blockEnd(lines, idx, maxLines = 700) {
        let depth = 0
        let seen = false
        for (let j = idx; j < Math.min(lines.length, idx + maxLines); j++) {
            const s = lines[j].replace(/\/\/.*$/, '')
            for (const ch of s) {
                if (ch === '{') { depth++; seen = true } else if (ch === '}') depth--
            }
            if (seen && depth <= 0) return j
            if (!seen && j > idx + 2) return idx
        }
        return Math.min(lines.length - 1, idx + maxLines - 1)
    }

    function listFunctions(f) {
        if (f._fns) return f._fns
        const res = []
        const n = f.lines.length
        if (n <= 6000) {
            for (let i = 0; i < n; i++) {
                const L = f.lines[i]
                if (L.length > 300) continue
                let name = null
                for (const rx of FN_DECL) { const m = L.match(rx); if (m) { name = m[1]; break } }
                if (!name || CALL_SKIP.has(name)) continue
                const end = blockEnd(f.lines, i)
                res.push({ name, idx: i, end, comment: commentAbove(f.lines, i, 2), wrapper: (end - i) > n * 0.55 })
            }
        }
        // دالة تضم 3 دوال داخلية فأكثر = غلاف (مصنع): نقرأ دواله الداخلية كل على حدة
        for (const x of res) {
            let inner = 0
            for (const y of res) if (y !== x && y.idx > x.idx && y.idx <= x.end) inner++
            if (inner >= 3) x.wrapper = true
        }
        f._fns = res
        return res
    }

    // ما يصدّره الملف: factory (module.exports) + api (return { ... } داخل المصنع)
    function moduleExports(f) {
        if (f._exp) return f._exp
        const api = new Set()
        const factory = new Set()
        const L = f.lines
        const collect = (i, set) => {
            for (let j = i; j < Math.min(L.length, i + 60); j++) {
                let s = L[j].replace(/\/\/.*$/, '')
                if (j === i) s = s.slice(s.indexOf('{') + 1)
                for (const m of s.matchAll(/[A-Za-z_$][\w$]*/g)) set.add(m[0])
                if (s.includes('}')) break
            }
        }
        for (let i = L.length - 1; i >= Math.max(0, L.length - 200); i--) {
            const t = L[i]
            if (/module\.exports\s*=\s*\{/.test(t)) collect(i, factory)
            else if (/module\.exports\s*=\s*([A-Za-z_$][\w$]*)\s*;?\s*$/.test(t)) factory.add(t.match(/module\.exports\s*=\s*([A-Za-z_$][\w$]*)/)[1])
            else if (/^\s{0,8}return\s*\{/.test(t) && !api.size) collect(i, api)
            else {
                const m = t.match(/^\s*(?:module\.)?exports\.([\w$]+)\s*=/)
                if (m) factory.add(m[1])
            }
        }
        f._exp = { api, factory }
        return f._exp
    }

    function resolveSpecFrom(f, spec) {
        const base = path.resolve(path.dirname(f.abs), spec)
        const cands = [base, base + '.js', path.join(base, 'index.js')]
        return (_files || []).find(x => cands.includes(x.abs)) || null
    }

    function resolveFileRef(ref) {
        const r = String(ref).replace(/^\.\//, '')
        return loadFiles().find(f => f.name === r || f.name.endsWith('/' + r)) || null
    }

    // متغيرات الأنظمة: const bossAttackSystem = createBossAttackSystem({...})  أو  const { a, b } = createXSystem({...})
    let _inst = null
    function getInstIndex() {
        if (_inst) return _inst
        _inst = new Map()
        const files = loadFiles()
        const factories = new Map()
        for (const f of files) {
            if (f.lines.length > 6000) continue
            for (const n of moduleExports(f).factory) if (/^(create|make|init|setup|build)[A-Z]/.test(n)) factories.set(n, f)
        }
        const rx = /(?:const|let|var)\s+(?:\{([^}]*)\}|([A-Za-z_$][\w$]*))\s*=\s*(?:await\s+)?([A-Za-z_$][\w$]*)\s*\(/
        for (const f of files) {
            for (let i = 0; i < f.lines.length; i++) {
                const L = f.lines[i]
                if (L.length > 300 || !/(?:const|let|var)\s/.test(L) || isCommentLine(L.trim())) continue
                const m = L.match(rx)
                if (!m) continue
                const mod = factories.get(m[3])
                if (!mod || mod === f) continue
                const names = m[2] ? [m[2]] : m[1].split(',').map(s => s.split(':').pop().trim()).filter(Boolean)
                for (const n of names) if (!_inst.has(n)) _inst.set(n, { module: mod, callFile: f, idx: i, destructured: !m[2] })
            }
        }
        return _inst
    }

    function instInfoFor(modFile) {
        let first = null
        const names = []
        for (const [n, v] of getInstIndex()) {
            if (v.module !== modFile) continue
            if (!first) first = v
            if (v.idx === first.idx && v.callFile === first.callFile) names.push(n)
        }
        return first ? { ...first, names } : null
    }

    function readModule(f, budget, kw, digestOnly) {
        const total = f.text.length
        if (!digestOnly) {
            const all = compressForPrompt(f.lines).join('\n')
            if (all.length <= budget) return { code: all, mode: 'full', total, read: all.length, included: [], omitted: [] }
        }
        const fns = listFunctions(f).filter(x => !x.wrapper)
        const ex = moduleExports(f)
        const consts = []
        for (const L of f.lines) {
            if (consts.length >= 40) break
            const m = L.match(/^\s*(?:export\s+)?(?:const|let|var)\s+[A-Z][A-Z0-9_]{2,}\s*=\s*(.+)$/)
            if (m && !/require\(/.test(L) && !SECRET_LINE.test(L)) consts.push(clip(L.trim().replace(/;$/, ''), 150))
        }
        const header = compressForPrompt(f.lines.slice(0, Math.min(45, f.lines.length)))
            .filter(l => /^\s*\/\//.test(l)).slice(0, 14).join('\n')
        let head = (header ? header + '\n' : '') + (consts.length ? '── ثوابت الملف ──\n' + consts.join('\n') + '\n' : '')
        const headCap = Math.floor(budget * 0.3)
        if (head.length > headCap) head = head.slice(0, headCap) + '\n// … (اقتُطع)\n'

        // 1) أهم الدوال بنصّها (مرتبة بالصلة بالأمر)، مع حجز مساحة للفهرس
        const included = []
        const chosen = []
        let used = head.length
        if (!digestOnly) {
            const kwSet = new Set(kw)
            const scored = fns.map(x => {
                const bt = tokenize(x.name.replace(/([a-z])([A-Z])/g, '$1 $2') + ' ' + x.comment)
                let sc = 0
                for (const t of bt) if (kwSet.has(t)) sc += 6
                let bodyHits = 0
                for (const t of tokenize(f.lines.slice(x.idx, Math.min(x.end + 1, x.idx + 60)).join(' ').slice(0, 1500))) if (kwSet.has(t)) bodyHits++
                sc += Math.min(bodyHits, 8)
                if (ex.api.has(x.name)) sc += 4
                if (DOMAIN_RX.test(x.name)) sc += 3
                if (x.comment) sc += 2
                return { x, sc }
            }).sort((a, b) => b.sc - a.sc || (b.x.end - b.x.idx) - (a.x.end - a.x.idx))
            const bodyBudget = budget - Math.min(1800, Math.floor(budget * 0.25))
            const covered = []
            for (const { x } of scored) {
                if (covered.some(c => x.idx >= c[0] && x.end <= c[1])) continue
                const left = bodyBudget - used
                if (left < 400) break
                const body = compressForPrompt(f.lines.slice(x.idx, x.end + 1)).join('\n')
                const cap = Math.min(left, 3800)
                const take = body.length > cap ? body.slice(0, cap) + '\n// … (اقتُطع)' : body
                used += take.length + 20
                chosen.push({ x, code: take })
                covered.push([x.idx, x.end])
                included.push(x.name + (take.length < body.length ? ' (مقتطعة)' : ''))
            }
            chosen.sort((a, b) => a.x.idx - b.x.idx)
        }
        let code = head
        if (chosen.length) code += '── أهم الدوال (بنصّها) ──\n' + chosen.map(c => `// ${c.x.name}\n${c.code}`).join('\n') + '\n'
        const incNames = new Set(included.map(s => s.replace(/ \(مقتطعة\)$/, '')))
        const rest = fns.filter(x => !incNames.has(x.name))

        // 2) فهرس بقية الدوال (التي لها شرح بتعليق أولاً) بما تبقى من الميزانية
        const sorted = [...rest.filter(x => x.comment), ...rest.filter(x => !x.comment)]
        const lines = []
        let idxUsed = code.length
        for (const x of sorted) {
            const line = `- ${x.name}${x.comment ? ' — ' + clip(x.comment, 90) : ''}`
            if (idxUsed + line.length + 1 > budget - 60) break
            lines.push(line); idxUsed += line.length + 1
        }
        if (lines.length) code += '── دوال أخرى بالملف (فهرس) ──\n' + lines.join('\n') + (lines.length < rest.length ? `\n… و${rest.length - lines.length} دالة أخرى` : '')
        const omitted = rest.map(x => x.name)
        return { code, mode: digestOnly ? 'digest' : 'partial', total, read: code.length, included, omitted }
    }

    function linkedModules(loc, cmd, mainCode) {
        const files = loadFiles()
        const cand = new Map()
        const bump = (f, w, why) => {
            if (!f || f === loc.file || f.lines.length > 20000) return
            const c = cand.get(f.name) || { file: f, score: 0, why: [] }
            c.score += w
            if (!c.why.includes(why)) c.why.push(why)
            cand.set(f.name, c)
        }
        // 1) استيرادات يستدعيها المعالج مباشرة
        for (const [local, imp] of getImports(loc.file)) {
            if (new RegExp('(?<![\\w$.])' + escapeRe(local) + '\\s*[.(]').test(mainCode)) bump(imp.file, 5, 'يستدعيه المعالج')
        }
        // 2) أنظمة (مصانع) يستدعي المعالج متغيراتها
        for (const [name, info] of getInstIndex()) {
            if (new RegExp('(?<![\\w$.])' + escapeRe(name) + '\\s*[.(]').test(mainCode)) bump(info.module, 6, 'نظام يستدعيه المعالج')
        }
        // 3) تعليقات المطوّر التي تذكر الأمر مع مسار ملف أو بجانب require
        if (cmd) {
            const rx = new RegExp(escapeRe(cmd) + '(?![\\u0600-\\u06FFA-Za-z0-9_])')
            for (const f of files) {
                for (let i = 0; i < f.lines.length; i++) {
                    const L = f.lines[i]
                    const ci = L.indexOf('//')
                    if (ci < 0 || !L.includes(cmd) || L.length > 400) continue
                    const cm = L.slice(ci)
                    if (!rx.test(cm)) continue
                    let hit = false
                    for (const pm of cm.matchAll(/([\w\-]+(?:\/[\w\-]+)*\.js)\b/g)) {
                        const t = resolveFileRef(pm[1])
                        if (t) { bump(t, 8, 'مذكور بتعليق مع الأمر'); hit = true }
                    }
                    const rm = L.slice(0, ci).match(/require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/)
                    if (rm) {
                        const t = resolveSpecFrom(f, rm[1])
                        if (t) { bump(t, 8, 'تعليق بجانب استيراده يذكر الأمر'); hit = true }
                    }
                    if (!hit && f !== loc.file) bump(f, 1, 'يذكر الأمر بتعليقاته')
                }
            }
        }
        return [...cand.values()].sort((a, b) => b.score - a.score)
    }

    // أقرب دالة تحيط بالسطر (نفضّل الدوال القريبة من هامش الملف على الدوال المساعدة الداخلية)
    function enclosingFn(lines, i, maxUp = 150) {
        let best = null
        for (let j = i; j >= Math.max(0, i - maxUp); j--) {
            const fm = lines[j].match(FN_DECL[0]) || lines[j].match(FN_DECL[1])
            if (!fm) continue
            const indent = lines[j].match(/^\s*/)[0].length
            if (!best || indent < best.indent) best = { name: fm[1], idx: j, indent }
            if (indent === 0) break
        }
        return best
    }

    function findSiteUsages(info, modFile, limit, maxChars) {
        if (!info || !info.names.length || !limit) return []
        const files = loadFiles()
        const names = new Set(info.names)
        // أسماء مستعارة عند تمريره لملف آخر:  bossAttack: bossAttackSystem
        if (!info.destructured) {
            for (const f of files) {
                for (let i = 0; i < f.lines.length; i++) {
                    const L = f.lines[i]
                    if (L.length > 200 || !L.includes(':')) continue
                    for (const n of info.names) {
                        if (!L.includes(n)) continue
                        const m = L.match(new RegExp('^\\s*([A-Za-z_$][\\w$]*)\\s*:\\s*' + escapeRe(n) + '\\s*,?\\s*(?://.*)?$'))
                        if (m) names.add(m[1])
                    }
                }
            }
        }
        const alt = [...names].map(escapeRe).join('|')
        const rx = info.destructured
            ? new RegExp('(?<![\\w$.])(?:' + alt + ')\\s*\\(')
            : new RegExp('(?<![\\w$])(?:' + alt + ')\\.[A-Za-z_$][\\w$]*\\s*\\(')
        const routes = []
        const fnUses = []
        const seen = new Set()
        for (const f of files) {
            if (f === modFile) continue
            for (let i = 0; i < f.lines.length; i++) {
                const L = f.lines[i]
                if (L.length > 300 || !rx.test(L) || isCommentLine(L.trim()) || /require\(/.test(L)) continue
                if (f === info.callFile && i === info.idx) continue
                let found = false
                for (let j = i; j >= Math.max(0, i - 150); j--) {
                    const rm = f.lines[j].match(ROUTE_RX)
                    if (rm) {
                        const id = f.name + ':' + j
                        if (!seen.has(id)) { seen.add(id); routes.push({ route: rm[1].toUpperCase() + ' ' + rm[3], file: f.name, code: excerptAt(f.lines, j, maxChars) }) }
                        found = true
                        break
                    }
                }
                if (found) continue
                const ef = enclosingFn(f.lines, i, 200)
                if (ef) {
                    const id = f.name + ':' + ef.idx
                    if (!seen.has(id)) { seen.add(id); fnUses.push({ route: 'دالة ' + ef.name, file: f.name, code: excerptAt(f.lines, Math.max(ef.idx, i - 3), maxChars) }) }
                }
            }
        }
        return [...routes, ...fnUses].slice(0, limit)
    }

    function globalsBlock(texts, maxChars) {
        const names = new Set()
        for (const t of texts) for (const m of String(t).matchAll(/\bglobal\.([A-Za-z_$][\w$]*)/g)) names.add(m[1])
        const out = []
        const seenFn = new Set()
        let used = 0
        for (const n of [...names].slice(0, 6)) {
            const rx = new RegExp('\\bglobal\\.' + escapeRe(n) + '\\s*=(?!=)')
            let c = 0
            for (const f of loadFiles()) {
                for (let i = 0; i < f.lines.length && c < 3; i++) {
                    const L = f.lines[i]
                    if (!rx.test(L) || isCommentLine(L.trim())) continue
                    let s = ''
                    const ef = enclosingFn(f.lines, i, 160)
                    if (ef) {
                        const id = f.name + ':' + ef.idx
                        if (seenFn.has(id)) continue
                        seenFn.add(id)
                        const cm = commentAbove(f.lines, ef.idx, 2)
                        const end = blockEnd(f.lines, ef.idx, 90)
                        const body = compressForPrompt(f.lines.slice(ef.idx, end + 1)).join('\n')
                        s = `// ${ef.name}${cm ? ': ' + cm : ''}\n` + body.slice(0, 900)
                    }
                    if (!s) { const cm2 = commentAbove(f.lines, i, 2); s = (cm2 ? '// ' + cm2 + '\n' : '') + clip(L.trim(), 180) }
                    if (used + s.length > maxChars) return out.join('\n')
                    out.push(s); used += s.length; c++
                }
                if (c >= 3) break
            }
        }
        return out.join('\n')
    }

    // تعليقات المطوّر التي تذكر الأمر نفسه (وصف سلوك، تعطيل، توقيت...)
    function commentNotes(cmd, maxChars) {
        if (!cmd || !maxChars) return ''
        const rx = new RegExp(escapeRe(cmd) + '(?![\\u0600-\\u06FFA-Za-z0-9_])')
        const out = []
        const seen = new Set()
        let used = 0
        for (const f of loadFiles()) {
            for (let i = 0; i < f.lines.length; i++) {
                const t = f.lines[i].trim()
                if (!t.startsWith('//') || !t.includes(cmd) || !rx.test(t)) continue
                const s = clip(t.replace(/^\/\/+\s*/, '').replace(/[=━─\-]{3,}/g, '').trim(), 200)
                if (!s || seen.has(s) || SECRET_LINE.test(s) || /نامي اشرحي|شرح الأوامر والميزات/.test(s)) continue
                if (used + s.length > maxChars) return out.join('\n')
                seen.add(s); out.push(s); used += s.length
            }
        }
        return out.join('\n')
    }

    function buildSystemParts(loc, cmd, mainCode, L) {
        const parts = []
        const cov = []
        const mods = L.modules ? linkedModules(loc, cmd, mainCode).slice(0, L.moduleN) : []
        const kw = cmd ? tokenize(cmd) : []
        const texts = [mainCode]
        // الأصغر أولاً: تأخذ حقها كاملاً ويتبقى للأكبر ميزانية أوسع
        let remaining = L.modules
        const results = new Map()
        for (const m of [...mods].sort((a, b) => compressedLen(a.file) - compressedLen(b.file))) {
            const left = mods.filter(x => !results.has(x.file.name)).length
            const r = readModule(m.file, Math.max(1500, Math.floor(remaining / left)), kw, L.digestOnly)
            remaining -= r.read
            results.set(m.file.name, r)
        }
        for (const m of mods) {
            const r = results.get(m.file.name)
            const modeLabel = r.mode === 'full' ? 'الملف كاملاً' : r.mode === 'partial' ? 'ملخص + أهم الدوال' : 'ملخص فقط'
            parts.push({ label: `ملف النظام — ${modeLabel}`, file: m.file.name, code: r.code })
            texts.push(r.code)
            const entry = { file: m.file.name, why: m.why.join('، '), mode: r.mode, total: r.total, read: r.read, omitted: r.omitted, linked: [] }
            cov.push(entry)
            const info = L.callsite || L.usages ? instInfoFor(m.file) : null
            if (info && L.callsite) {
                const code = extractBlock(info.callFile.lines, info.idx, L.callsite)
                parts.push({ label: 'ربط النظام وما يُمرَّر له من قيم', file: info.callFile.name, code })
                texts.push(code)
                entry.linked.push('ربط/تمرير القيم: ' + info.callFile.name + ':' + (info.idx + 1))
            }
            if (info && L.usages) {
                for (const u of findSiteUsages(info, m.file, L.usages, L.usageChars)) {
                    parts.push({ label: `استخدام النظام من الموقع (${u.route})`, file: u.file, code: u.code })
                    texts.push(u.code)
                    entry.linked.push('مسار موقع: ' + u.route)
                }
            }
        }
        if (L.globals) {
            const g = globalsBlock(texts, L.globals)
            if (g) { parts.push({ label: 'حالة عامة يضبطها البوت (متغيرات global)', file: '(عدة ملفات)', code: g }); cov.push({ file: '(global)', why: 'متغيرات عامة يقرؤها النظام', mode: 'notes', total: g.length, read: g.length, omitted: [], linked: [] }) }
        }
        const notes = commentNotes(cmd, L.notes)
        if (notes) parts.push({ label: 'ملاحظات المطوّر بالتعليقات عن الأمر', file: '(عدة ملفات)', code: notes })
        return { parts, cov }
    }

    const _ctxCache = new Map()

    function getContext(target, level) {
        const key = (target.cmd || target.route) + '|' + level
        if (_ctxCache.has(key)) return _ctxCache.get(key)
        let ctx = { parts: [], located: false, ownerOnly: false }
        try {
            let loc = null
            if (target.kind === 'feature') {
                const f = loadFiles().find(x => x.name === target.file)
                if (f) loc = { file: f, idx: target.line }
            } else {
                loc = locateCommand(target.cmd, target.file ? { file: target.file, line: target.line } : null)
            }
            if (loc) {
                ctx.located = true
                const L = LIMITS[Math.min(level, LIMITS.length - 1)]
                const code = excerptAt(loc.file.lines, loc.idx, L.main)
                ctx.parts.push({ label: 'معالج الأمر', file: loc.file.name, code })
                // حارس "للمطور فقط": نفحص أسطر بداية المعالج فقط، ونتوقف عند بداية معالج/case آخر
                const guard = [loc.file.lines[loc.idx]]
                for (let j = loc.idx + 1; j < Math.min(loc.file.lines.length, loc.idx + 12); j++) {
                    if (/^\s*(case\s|default\s*:|\/\/ ─── )/.test(loc.file.lines[j]) ||
                        /^\s*if\s*\(.*(===|startsWith)/.test(loc.file.lines[j])) break
                    guard.push(loc.file.lines[j])
                }
                ctx.ownerOnly = OWNER_HINT.test(guard.join('\n'))
                ctx.handler = { file: loc.file.name, line: loc.idx + 1 }
                if (L.follow > 0) {
                    const followed = followCalls(loc.file, code, L.follow, L.followN)
                    for (const p of followed) ctx.parts.push(p)
                }
                // قراءة النظام كاملاً: ملف النظام + ربطه + استخدامه من الموقع + المتغيرات العامة
                const sys = buildSystemParts(loc, target.cmd || null, code, L)
                for (const p of sys.parts) ctx.parts.push(p)
                ctx.coverage = sys.cov
                ctx.constants = collectConstants(ctx.parts)
            }
        } catch (e) {
            console.log('namiCommandHelp context error:', e && e.message)
        }
        _ctxCache.set(key, ctx)
        return ctx
    }

    // ───────────── 5) بناء الرد ─────────────
    const SECTIONS = `ابدئي مباشرة بالشرح بهذا الترتيب (احذفي القسم الذي لا معلومة مؤكدة فيه):
📌 *الاسم*
📝 *ما وظيفته*
⌨️ *طريقة الاستخدام* (كل الصيغ الممكنة مع أمثلة بصيغة الأمر الحقيقية)
⚙️ *كيف يعمل خطوة بخطوة* (الآلية الداخلية: ما يُفحص أولاً، الحسابات والمعادلات، ما الذي يتغير عند النجاح أو الفشل أو الموت)
🌐 *من الموقع* (إن كان النظام يُستخدم من الموقع: كيف يدخل اللاعب وماذا يضغط وما الذي يظهر له)
💰 *التكلفة والمكافآت والكولداون والحدود* (بأرقامها الدقيقة)
🚫 *القيود وحالات الرفض* (أين يعمل: قروب/خاص، من يستطيع استخدامه، الوقت، وما معنى رسائل الخطأ)
🔗 *أوامر وأنظمة مرتبطة*
💡 *نصيحة سريعة*`

    const RULES = `القواعد الصارمة:
- المرجع الداخلي قد يضم عدة ملفات تمثل النظام كله (معالج الأمر + ملف النظام + ما يُمرَّر له من قيم + استخدامه من الموقع + ملاحظات المطوّر): اشرحي النظام كاملاً من بدايته إلى نهايته (متى يعمل، الحسابات، الأحداث الخاصة، ما يحدث عند الموت أو الفشل، الجوائز والنتائج، وكيف يُستخدم من الموقع) ولا تقتصري على سطر الأمر. وإن كان الأمر معطّلاً بالواتساب فاشرحي النظام كما يعمل من الموقع.
- اعتمدي على المعلومات أدناه فقط. لا تخترعي أي رقم أو شرط أو مكافأة أو آلية غير موجودة فيها.
- إن كانت قيمة ما غير ظاهرة (متغير غير معروف القيمة) فقولي "قيمتها يحددها النظام" ولا تخمّني.
- لا تنقلي الكود ولا أسماء المتغيرات والدوال، ولا تذكري أنك اطلعتِ على كود أو ملفات؛ اشرحي بلغة اللاعب.
- اشرحي المعادلات والحسابات بالكلمات والأرقام (مثال: "الضرر = الهجوم × المضاعف").
- اكتبي أسماء الأوامر بنقطتها كما هي.
- تنسيق واتساب: *نص عريض* فقط، بلا جداول وبلا عناوين ماركداون.
- الشرح كامل ومفصل ومنظم وغير مكرر، مع لمسة نامي خفيفة في سطر واحد فقط.`

    function renderParts(parts, constants) {
        const body = parts.map(p => `── ${p.label} ──\n\`\`\`\n${p.code}\n\`\`\``).join('\n')
        return constants && constants.length
            ? body + '\n── قيم الثوابت المستخدمة ──\n```\n' + constants.join('\n') + '\n```'
            : body
    }

    function buildPrompt({ match, question, status, isOwner, moodPrompt, level = 0 }) {
        const head = `أنت نامي من One Piece، تتحدثين بالعربية الفصحى السليمة بأسلوب مرح ولبق دون عامية.${moodPrompt ? '\n' + moodPrompt : ''}

مهمتك: شرح مفصل وكامل وشامل لما يسأل عنه المستخدم، يغطي الآلية الداخلية كاملة وليس مجرد وصف.`

        if (match.kind === 'site') {
            scanProject()
            const list = features
                .filter(f => f.method === 'GET' && !/^\/(api|static|assets|public)\b/.test(f.route))
                .slice(0, 40)
                .map(f => `${f.route}${f.comment ? ' — ' + f.comment : ''}`).join('\n')
            return `${head}

الموضوع: موقع البوت (صفحات اللاعبين). المسارات المتوفرة:
${list || '(لا توجد معلومات مسارات)'}

${SECTIONS.replace('الاسم', 'الموقع')}

${RULES}

سؤال المستخدم: ${question}`
        }

        if (match.kind === 'about') {
            scanProject()
            const perCat = level === 0 ? 4 : level === 1 ? 2 : 0
            const cats = new Map()
            for (const e of entries) {
                if (!e.documented || e.devOnly || !e.category || e.category === 'غير_مصنف') continue
                if (!cats.has(e.category)) cats.set(e.category, [])
                cats.get(e.category).push(e)
            }
            const catText = [...cats.entries()].slice(0, 30).map(([c, list]) => {
                const head = `• ${String(c).replace(/_/g, ' ')} (${list.length} أمر)`
                if (!perCat) return head
                return head + '\n' + list.slice(0, perCat).map(e => `   ${e.cmd} — ${clip(e.desc, 80)}`).join('\n')
            }).join('\n')
            const siteList = features
                .filter(f => f.method === 'GET' && f.comment && !/^\/(api|static|assets|public)\b/.test(f.route))
                .slice(0, level === 0 ? 20 : 8)
                .map(f => `${f.route} — ${clip(f.comment, 80)}`).join('\n')
            return `${head}

الموضوع: تعريف بالبوت نفسه للاعبين الجدد (لعبة واتساب بشخصيات وقتال وزعماء وموقع مرافق).
أقسام أوامر البوت وبعض أوامرها:
${catText || '(لا توجد أقسام)'}
${siteList ? '\nصفحات الموقع:\n' + siteList + '\n' : ''}
اكتبي تعريفاً مرحباً بالجدد بهذا الترتيب (احذفي ما لا معلومة مؤكدة فيه):
🏴‍☠️ *ما هو البوت* (فكرته بجملتين)
🚀 *كيف تبدأ* (3 إلى 5 خطوات بأوامر حقيقية من القائمة أعلاه فقط)
🧩 *أهم الأنظمة* (قسم بقسم، سطر لكل قسم مهم)
🌐 *الموقع* (ما يفعله اللاعب فيه وكيف يدخل إن ذُكر)
💡 *نصائح للجدد*
وأخيراً: "اسألوني عن أي أمر وسأشرحه" مع مثال: نامي اشرحي لي .أمر

${RULES}

سؤال المستخدم: ${question}`
        }

        if (match.kind === 'feature') {
            const ft = match.feature
            const ctx = getContext({ ...ft, cmd: null }, level)
            return `${head}

الموضوع: ميزة/صفحة بموقع البوت
المسار: ${ft.method} ${ft.route}
${ft.comment ? 'وصف مختصر: ' + ft.comment + '\n' : ''}
${ctx.parts.length ? 'مرجع داخلي (للفهم فقط، لا تنقليه):\n' + renderParts(ctx.parts, ctx.constants) : ''}

${SECTIONS.replace('الاسم', 'الميزة')}

${RULES}

سؤال المستخدم: ${question}`
        }

        const e = match.entry
        const devBlocked = (e.devOnly) && !isOwner
        const ctx = devBlocked ? { parts: [], located: false } : getContext(e, level)
        const ownerCode = !isOwner && ctx.ownerOnly
        const parts = ownerCode ? [] : ctx.parts
        const related = (match.related || []).map(r => `${r.cmd}${r.desc ? ' — ' + r.desc : ''}`).join('\n')
        const officialDesc = e.desc || e.discoveredComment || ''

        return `${head}

الأمر: ${e.cmd}
${e.category && e.category !== 'غير_مصنف' ? 'القسم: ' + String(e.category).replace(/_/g, ' ') + '\n' : ''}${officialDesc ? 'الشرح الرسمي: ' + officialDesc + '\n' : ''}${status ? `حالة الأمر الحالية (تتقدم على أي شرح آخر إن تعارضا): ${status}\n` : ''}${related ? 'أوامر قريبة:\n' + related + '\n' : ''}${devBlocked || ownerCode ? '\nهذا الأمر للمطور فقط: اذكري ذلك في جملتين بلا أي تفاصيل تشغيلية أو آلية.\n' : ''}${parts.length ? '\nمرجع داخلي لاستخراج الشروط والحسابات والتكلفة والقيود فقط (لا تنقليه ولا تذكري وجوده):\n' + renderParts(parts, ctx.constants) + '\n' : ''}
${devBlocked || ownerCode ? '' : SECTIONS.replace('الاسم', 'اسم الأمر')}

${RULES}

سؤال المستخدم: ${question}`
    }

    function fallbackText(match, status) {
        if (match.kind === 'feature') {
            const f = match.feature
            return `📌 *${f.route}*\n━━━━━━━━━━━━━━\n📝 ${f.comment || 'صفحة/ميزة بموقع البوت.'}`
        }
        if (match.kind === 'site') return 'ℹ️ لم أستطع جلب شرح الموقع الآن، جرّب بعد قليل.'
        if (match.kind === 'about') return '🏴‍☠️ *عن البوت*\n━━━━━━━━━━━━━━\nأهلاً بك! هذه أقسام البوت، اسألني عن أي قسم أو أمر وسأشرحه لك.\n\n' + allText()
        const e = match.entry
        const d = e.desc || e.discoveredComment || 'أمر موجود بالبوت (لا يوجد له وصف مسجّل).'
        return `📌 *${e.cmd}*\n━━━━━━━━━━━━━━\n📝 ${d}` +
            (status ? `\n\n⚠️ ${status}` : '') +
            `\n\n💡 لمزيد من التفاصيل اكتب: .شرح`
    }

    function categoryText(match) {
        const cat = String(match.category).replace(/_/g, ' ')
        const names = match.list.map(e => e.cmd).join('\n')
        return `📂 *أوامر قسم ${cat}*\n━━━━━━━━━━━━━━\n${names}\n━━━━━━━━━━━━━━\n` +
            `💬 اسألني عن أي أمر منها وسأشرحه لك بالتفصيل، مثال: نامي اشرحي لي ${match.list[0] ? match.list[0].cmd : '.اسحب'}`
    }

    function allText() {
        const cats = [...new Set(entries.filter(e => e.documented).map(e => e.category))]
        const list = cats.map((c, i) => `${i + 1}. ${String(c).replace(/_/g, ' ')}`).join('\n')
        return `📚 *أقسام أوامر البوت*\n━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━\n` +
            `💬 اسألني عن قسم أو أمر محدد، مثال:\nنامي اشرحي لي أوامر الزعماء\nنامي اشرحي لي .اسحب\nنامي اشرحي لي الموقع`
    }

    // تقسيم الرد الطويل لرسائل واتساب مريحة
    function splitMessage(text, limit = 3300) {
        const t = String(text || '').trim()
        if (t.length <= limit) return [t]
        const paras = t.split(/\n\s*\n/)
        const out = []
        let cur = ''
        for (const p of paras) {
            if ((cur + '\n\n' + p).length > limit && cur) { out.push(cur.trim()); cur = p }
            else cur = cur ? cur + '\n\n' + p : p
        }
        if (cur) out.push(cur.trim())
        // فقرة واحدة أطول من الحد
        return out.flatMap(c => {
            if (c.length <= limit + 400) return [c]
            const parts = []
            for (let i = 0; i < c.length; i += limit) parts.push(c.slice(i, i + limit))
            return parts
        })
    }

    // فحص للمطور: ماذا فُهرس وما الأوامر التي لم يُعثر على معالجها
    function diagnostics() {
        scanProject()
        const missingHandler = []
        for (const e of entries) {
            if (!e.documented && e.file) continue
            if (!locateCommand(e.cmd, e.file ? { file: e.file, line: e.line } : null)) missingHandler.push(e.cmd)
        }
        const undocumented = entries.filter(e => !e.documented).map(e => e.cmd)
        return {
            files: stats.files,
            truncated: stats.truncated,
            commandsDocumented: entries.filter(e => e.documented).length,
            commandsDiscovered: undocumented.length,
            routes: stats.routes,
            missingHandler,
            undocumented
        }
    }

    function diagnosticsText() {
        const d = diagnostics()
        const sample = (a, n) => a.slice(0, n).join(' ') + (a.length > n ? ` … (+${a.length - n})` : '')
        return `🔎 *فحص نظام الشرح*\n━━━━━━━━━━━━━━\n` +
            `📁 ملفات مفهرسة: ${d.files}${d.truncated ? ' (تجاوز حد الحجم)' : ''}\n` +
            `📖 أوامر بالقاموس: ${d.commandsDocumented}\n` +
            `🧭 أوامر مكتشفة من الكود بلا شرح بالقاموس: ${d.commandsDiscovered}\n` +
            `🌐 مسارات الموقع: ${d.routes}\n` +
            `⚠️ أوامر بالقاموس لم يُعثر على معالجها: ${d.missingHandler.length}\n` +
            (d.missingHandler.length ? sample(d.missingHandler, 25) + '\n' : '') +
            (d.undocumented.length ? `\n🧭 مكتشفة بلا شرح:\n${sample(d.undocumented, 30)}` : '')
    }

    // فحص للمطور: ماذا قرأت نامي فعلاً لشرح أمر معيّن (هل قرأت النظام كاملاً؟)
    function coverageText(rest) {
        const q = String(rest || '').trim()
        if (!q) return 'اكتب اسم الأمر بعد الفحص، مثال: نامي فحص الشرح .هجوم'
        const m = resolve(q.startsWith('.') ? q : 'اشرحي ' + q)
        if (!m || (m.kind !== 'command' && m.kind !== 'feature')) return '🔎 لم أتعرّف على أمر أو ميزة بهذا الاسم.'
        const target = m.kind === 'feature' ? { ...m.feature, cmd: null } : m.entry
        const name = m.kind === 'feature' ? `${m.feature.method} ${m.feature.route}` : m.entry.cmd
        const rows = [`🔎 *فحص قراءة: ${name}*`, '━━━━━━━━━━━━━━']
        const ctx0 = getContext(target, 0)
        if (!ctx0.located) {
            rows.push('⚠️ لم يُعثر على معالج لهذا الأمر بالملفات (تُستخدم أوصاف القاموس فقط).')
            return rows.join('\n')
        }
        rows.push(`📍 المعالج: ${ctx0.handler.file}:${ctx0.handler.line}${ctx0.ownerOnly ? ' (للمطور فقط)' : ''}`)
        if (!ctx0.coverage || !ctx0.coverage.length) {
            rows.push('📂 لم أجد ملف نظام مرتبطاً بالأمر؛ المعالج وما يستدعيه فقط.')
        }
        for (const c of ctx0.coverage || []) {
            if (c.file === '(global)') { rows.push(`🌐 متغيرات عامة: ${c.read} حرف`); continue }
            const pct = c.total ? Math.min(100, Math.round(c.read / c.total * 100)) : 100
            const modeTxt = c.mode === 'full' ? '✅ قُرئ كاملاً' : c.mode === 'partial' ? '🟡 ملخص + أهم الدوال' : '🟠 ملخص فقط'
            rows.push(`📄 ${c.file}\n   ${modeTxt} (${c.read}/${c.total} حرف ≈ ${pct}%) — سبب الربط: ${c.why}`)
            if (c.omitted && c.omitted.length) rows.push(`   دوال لم يُرسل نصها: ${c.omitted.slice(0, 14).join('، ')}${c.omitted.length > 14 ? ` … (+${c.omitted.length - 14})` : ''}`)
            for (const l of c.linked || []) rows.push('   🔗 ' + l)
        }
        rows.push(`🔢 ثوابت مقروءة بقيمها: ${(ctx0.constants || []).length}`)
        const sizes = [0, 1, 2].map(l => {
            const c = getContext(target, l)
            return c.parts.reduce((n, p) => n + p.code.length, 0) + (c.constants || []).join('\n').length
        })
        rows.push(`📏 حجم السياق المرسل لـ Groq: كامل ${sizes[0]} حرف، أخف ${sizes[1]}، الأخف ${sizes[2]}`)
        return rows.join('\n')
    }

    function warmUp() {
        try { scanProject() } catch (e) { console.log('namiCommandHelp warmUp error:', e && e.message) }
    }

    return {
        resolve, buildPrompt, fallbackText, categoryText, allText,
        splitMessage, diagnostics, diagnosticsText, coverageText, warmUp,
        _entries: entries, _features: features
    }
}

module.exports = { createNamiCommandHelp }
