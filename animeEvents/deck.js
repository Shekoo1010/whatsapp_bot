// يمر على كل الأسئلة مرة واحدة بترتيب عشوائي، وبعد ما تنتهي يعيد الخلط من جديد.
// لكل (حدث + قروب) دورة مستقلة.

const decks = new Map()

function shuffleIndexes(length, avoidFirst) {

    const arr = Array.from({ length }, (_, i) => i)

    for (let i = arr.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1))

        ;[arr[i], arr[j]] = [arr[j], arr[i]]

    }

    // لا يبدأ الدور الجديد بنفس آخر سؤال طلع
    if (length > 1 && arr[0] === avoidFirst) {

        const k = 1 + Math.floor(Math.random() * (length - 1))

        ;[arr[0], arr[k]] = [arr[k], arr[0]]

    }

    return arr

}

function nextIndex(key, length) {

    if (!length) return -1

    let deck = decks.get(key)

    // إذا انتهت الدورة أو تغير عدد الأسئلة نعيد الخلط
    if (!deck || deck.total !== length || deck.order.length === 0) {

        deck = {
            total: length,
            last: deck ? deck.last : -1,
            order: shuffleIndexes(length, deck ? deck.last : -1)
        }

        decks.set(key, deck)

    }

    const index = deck.order.shift()

    deck.last = index

    return index

}

module.exports = { nextIndex }
