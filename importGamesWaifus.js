const axios = require('axios')
const Waifu = require('./models/Waifu')

// 🎯 نفس سلّم ندرة الأنمي بالضبط (B/A/S/SS/SSS) — عشان شخصيات
// الألعاب (جينشين/HSR/WuWa) ما تصير بسلّم منفصل بقيمة ثابتة عالية
// بمعزل عن باقي الويفوز، وتنسجم مع أي فلترة/عرض حسب الندرة بالبوت.
//
// 5⭐ (النادرة/المحدودة) → SS
// 4⭐ → A
// أقل من ذلك (احتياط) → B
function convertRarity(stars) {

    if (stars >= 5)
        return 'SS'

    if (stars >= 4)
        return 'A'

    return 'B'
}

// نفس نطاقات قيمة شخصيات الأنمي تقريباً حسب الندرة، بدل رقم ثابت
// مقطوع عن الباقي (كانت UR = 1500 دائماً بغض النظر عن كل شي)
function getValue(rarity) {

    switch (rarity) {

        case 'SSS':
            return 3000

        case 'SS':
            return 1200

        case 'S':
            return 600

        case 'A':
            return 300

        default:
            return 120
    }
}

const maleGenshin = [
    'Alhaitham','Ayato','Baizhu','Bennett',
    'Childe','Cyno','Diluc','Freminet',
    'Gaming','Gorou','Heizou','Itto',
    'Kaeya','Kaveh','Kazuha','Lyney',
    'Mika','Neuvillette','Razor',
    'Sethos','Thoma','Tighnari',
    'Venti','Wanderer','Wriothesley',
    'Xiao','Xingqiu','Zhongli',
    'Albedo','Chongyun'
]

const maleHSR = [
    'Argenti','Arlan','Aventurine',
    'Blade','Boothill','Dan Heng',
    'Gallagher','Gepard','Jing Yuan',
    'Luka','Luocha','Moze',
    'Misha','Mydei','Sampo',
    'Sunday','Welt','Yanqing'
]

const maleWuWa = [
    'Jiyan','Calcharo',
    'Mortefi','Yuanwu',
    'Aalto','Brant',
    'Lingyang','Xiangli Yao'
]

module.exports = async function importGamesWaifus() {

    const count =
    await Waifu.countDocuments({
        source: 'Game'
    })

if (count > 0) {
    console.log(
        'Game waifus already imported'
    )
    return
}

let imported = 0

    // ====================
    // GENSHIN
    // ====================

    try {

    const list =
        await axios.get(
            'https://genshin.jmp.blue/characters'
        )

    for (const slug of list.data) {

        const char =
            await axios.get(
                `https://genshin.jmp.blue/characters/${slug}`
            )

        const c = char.data

        if (
            maleGenshin.includes(
                c.name
            )
        ) {
            continue
        }

            const exists =
                await Waifu.findOne({
                    name: c.name,
                    anime: 'Genshin Impact'
                })

            if (exists)
                continue

            const rarity =
                convertRarity(
                    c.rarity || 5
                )

            await Waifu.create({

                name: c.name,

                anime:
                    'Genshin Impact',

                source: 'Game',

                image:
                    `https://genshin.jmp.blue/characters/${slug}/icon-big`,

                gender: 'Female',

                rarity,

                value:
                    getValue(
                        rarity
                    )
            })

            imported++
        }

        console.log(
            'Genshin done'
        )

    } catch (err) {

        console.log(
            'Genshin failed',
            err.message
        )
    }

    // ====================
    // HSR
    // ====================

    try {

        const res =
            await axios.get(
                'https://hsr-api.vercel.app/api/v1/characters'
            )

        for (const c of res.data) {

            if (
                maleHSR.includes(
                    c.name
                )
            ) {
                continue
            }

            const exists =
                await Waifu.findOne({
                    name: c.name,
                    anime:
                        'Honkai Star Rail'
                })

            if (exists)
                continue

            const rarity =
                convertRarity(
                    c.rarity || 5
                )

            await Waifu.create({

                name: c.name,

                anime:
                    'Honkai Star Rail',

                source: 'Game',

                image:
                    c.image || '',

                gender: 'Female',

                rarity,

                value:
                    getValue(
                        rarity
                    )
            })

            imported++
        }

        console.log(
            'HSR done'
        )

    } catch (err) {

        console.log(
            'HSR failed',
            err.message
        )
    }
// ====================
// WUTHERING WAVES
// ====================

try {

    const res =
        await axios.get(
            'https://wutheringwaves.fandom.com/api.php',
            {
                params: {
                    action: 'query',
                    list: 'categorymembers',
                    cmtitle:
                        'Category:Resonators_by_Release_Date',
                    cmlimit: 500,
                    format: 'json'
                }
            }
        )

    const males = [

    'Aalto',
    'Brant',
    'Calcharo',
    'Jiyan',
    'Lingyang',
    'Mortefi',
    'Xiangli Yao',
    'Yuanwu',
    'Rover',
    'Luuk Herssen'
]

    const fourStars = [

        'Yangyang',
        'Chixia',
        'Baizhi',
        'Sanhua',
        'Taoqi',
        'Youhu'
    ]

    const characters =
        res.data.query.categorymembers

    for (const char of characters) {

        const name =
            char.title.trim()

        if (
            males.includes(name)
        ) {
            continue
        }

        const exists =
            await Waifu.findOne({
                name,
                anime:
                    'Wuthering Waves'
            })

        if (exists)
            continue

        let image = ''

        try {

            const page =
                await axios.get(
                    'https://wutheringwaves.fandom.com/api.php',
                    {
                        params: {
                            action: 'query',
                            prop:
                                'pageimages',
                            titles:
                                name,
                            piprop:
                                'original',
                            format:
                                'json'
                        }
                    }
                )

            const pages =
                page.data.query.pages

            const pageData =
                Object.values(
                    pages
                )[0]

            image =
                pageData.original?.source ||
                ''

        } catch {}

        const stars =
            fourStars.includes(name)
                ? 4
                : 5

        const rarity =
            convertRarity(stars)

        await Waifu.create({

            name,

            anime:
                'Wuthering Waves',

            source:
                'Game',

            image,

            gender:
                'Female',

            rarity,

            value:
                getValue(
                    rarity
                )
        })

        imported++

        console.log(
            'Imported WuWa:',
            name
        )
    }

    console.log(
        'WuWa done'
    )

} catch (err) {

    console.log(
        'WuWa failed',
        err.message
    )
}
    console.log(
        `Imported ${imported} game waifus`
    )
}
