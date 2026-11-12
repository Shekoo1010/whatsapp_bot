// =========================
// 🔒 قفل مشترك لكل عمليات الكو اوب (coopBattle + coopManager)
// يمنع VersionError: عمليات حفظ وثيقة CoOp تمشي واحدة ورا الثانية
// =========================

let chain = Promise.resolve()

function runLocked(fn) {

    const run = chain.then(fn, fn)

    // السلسلة ما تنكسر لو فشلت عملية
    chain = run.catch(() => {})

    return run

}

function isVersionError(err) {

    return !!err && (
        err.name === 'VersionError' ||
        /No matching document found/i.test(err.message || '')
    )

}

// تشغيل دالة داخل القفل، ولو صار تعارض إصدار نعيدها (تحمّل الوثيقة من جديد)
function locked(fn) {

    return function (...args) {

        return runLocked(async () => {

            let lastErr

            for (let i = 0; i < 3; i++) {

                try {

                    return await fn(...args)

                } catch (err) {

                    if (!isVersionError(err)) throw err

                    lastErr = err

                    await new Promise(r => setTimeout(r, 50 * (i + 1)))

                }

            }

            throw lastErr

        })

    }

}

module.exports = { runLocked, locked, isVersionError }
