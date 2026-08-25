const axios = require('axios')
const Waifu = require('./models/Waifu')

// 📂 عدّل هذا المسار لو حطيت ملف الشخصيات باسم/مكان مختلف
const characters = require('./characters.json')

// =========================================================
// ⚙️ إعدادات قابلة للتعديل
// =========================================================

// 🎯 نسب التوزيع حسب الشهرة (favourites بـAniList) للشخصيات
// اللي لقيناها فعليًا — الباقي (٪ المتبقية) تنزل S
const TOP_PERCENT_SSS = 0.15   // أعلى 15% شهرة → SSS
const NEXT_PERCENT_SS = 0.35   // الـ35% اللي بعدها → SS
// الباقي (50%) → S

// 💎 نفس سلّم القيم المستخدم أصلاً بـ importGamesWaifus.js
const VALUE_BY_RARITY = {
    SSS: 3000,
    SS: 1200,
    S: 600
}

// ⏱️ تأخير بين كل طلب AniList وثاني (عشان ما نطلع بالـ rate limit)
const REQUEST_DELAY_MS = 2000

function normalize(str) {
    return (str || '').trim().toLowerCase()
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// 🔍 يبحث عن شخصية بـAniList ويرجع عدد المفضّلين (favourites)
// كمقياس شهرة حقيقي. يرجع null لو ما لقاها (شخصية لعبة/مانهوا
// غير موجودة بقاعدة AniList غالبًا).
async function fetchAniListFavourites(name) {

    const query = `
        query ($search: String) {
            Character(search: $search) {
                favourites
                name {
                    full
                }
            }
        }
    `

    try {

        const res = await axios.post(
            'https://graphql.anilist.co',
            {
                query,
                variables: { search: name }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        )

        const character = res.data?.data?.Character

        if (!character) return null

        return {
            favourites: character.favourites || 0,
            matchedName: character.name?.full || name
        }

    } catch (err) {

        // 404 = ما لقى الشخصية إطلاقًا (غالبًا شخصية لعبة/مانهوا)
        if (err.response?.status === 404) {
            return null
        }

        // 429 = تجاوزنا حد الطلبات — ننتظر أكثر ونجرب مرة ثانية
        if (err.response?.status === 429) {

            const retryAfter =
                parseInt(err.response.headers['retry-after']) || 10

            console.log(
                `⏳ Rate limit، ننتظر ${retryAfter}s...`
            )

            await sleep(retryAfter * 1000)

            return fetchAniListFavourites(name)
        }

        console.log(
            `⚠️ فشل البحث عن "${name}":`,
            err.message
        )

        return null
    }
}

module.exports = async function importSSSCharacters() {

    const sssList =
        characters.filter(
            c => c.rarity === 'SSS'
        )

    console.log(
        `🔍 لقيت ${sssList.length} شخصية SSS بالملف`
    )

    // نجيب كل الشخصيات الموجودة حاليًا مرة وحدة (اسم + أنمي)
    // بدل ما نسأل الداتابيس لكل شخصية لحالها
    const existingDocs =
        await Waifu.find({}, 'name anime')

    const existingKeys =
        new Set(
            existingDocs.map(
                w => `${normalize(w.name)}|${normalize(w.anime)}`
            )
        )

    // نستثني الموجود مسبقًا قبل ما نبدأ نسأل AniList (توفير وقت/طلبات)
    const candidates = []

    for (const c of sssList) {

        const key =
            `${normalize(c.name)}|${normalize(c.anime)}`

        if (existingKeys.has(key)) continue

        existingKeys.add(key)
        candidates.push(c)
    }

    console.log(
        `📋 ${candidates.length} شخصية بعد استثناء الموجود مسبقًا — بدء البحث بـAniList...`
    )

    // =========================================================
    // 🌐 نجيب شهرة كل شخصية من AniList (بطيء عمدًا لتفادي rate limit)
    // =========================================================
    const found = []      // { char, favourites }
    const notFound = []   // char فقط (غالبًا شخصيات ألعاب/مانهوا)

    for (let i = 0; i < candidates.length; i++) {

        const c = candidates[i]

        const result =
            await fetchAniListFavourites(c.name)

        if (result) {
            found.push({
                char: c,
                favourites: result.favourites
            })
        } else {
            notFound.push(c)
        }

        if ((i + 1) % 50 === 0) {
            console.log(
                `... ${i + 1}/${candidates.length}`
            )
        }

        await sleep(REQUEST_DELAY_MS)
    }

    console.log(
        `✅ لقينا ${found.length} بـAniList، ${notFound.length} ما لقيناهم (غالبًا ألعاب/مانهوا)`
    )

    // =========================================================
    // 📊 نوزّع اللي لقيناهم على S/SS/SSS حسب ترتيبهم النسبي
    // (percentile) بعدد المفضّلين — مو أرقام ثابتة، يتأقلم تلقائيًا
    // =========================================================
    found.sort(
        (a, b) => b.favourites - a.favourites
    )

    const sssCount =
        Math.ceil(found.length * TOP_PERCENT_SSS)

    const ssCount =
        Math.ceil(found.length * NEXT_PERCENT_SS)

    const toInsert = []

    found.forEach((entry, index) => {

        let rarity

        if (index < sssCount) {
            rarity = 'SSS'
        } else if (index < sssCount + ssCount) {
            rarity = 'SS'
        } else {
            rarity = 'S'
        }

        toInsert.push({
            name: entry.char.name,
            anime: entry.char.anime,
            source: 'Cards',
            image: entry.char.image,
            rarity,
            value: VALUE_BY_RARITY[rarity]
        })
    })

    // =========================================================
    // 🎲 اللي ما لقيناهم بـAniList (شخصيات ألعاب/مانهوا) —
    // توزيع عشوائي بين SS/SSS بس (حسب طلبك، بدون S)
    // =========================================================
    notFound.forEach(c => {

        const rarity =
            Math.random() < 0.5 ? 'SS' : 'SSS'

        toInsert.push({
            name: c.name,
            anime: c.anime,
            source: 'Cards',
            image: c.image,
            rarity,
            value: VALUE_BY_RARITY[rarity]
        })
    })

    if (toInsert.length) {
        await Waifu.insertMany(toInsert)
    }

    const summary = {
        imported: toInsert.length,
        skipped: sssList.length - candidates.length,
        foundOnAniList: found.length,
        randomAssigned: notFound.length,
        breakdown: {
            SSS: toInsert.filter(w => w.rarity === 'SSS').length,
            SS: toInsert.filter(w => w.rarity === 'SS').length,
            S: toInsert.filter(w => w.rarity === 'S').length
        }
    }

    console.log(
        `✅ تم استيراد ${summary.imported} شخصية`
    )

    console.log(
        `📊 التوزيع: SSS=${summary.breakdown.SSS} | SS=${summary.breakdown.SS} | S=${summary.breakdown.S}`
    )

    return summary
}
