const mongoose = require('mongoose')

const schema = new mongoose.Schema({
    key: { type: String, default: 'main', unique: true },

    // البنر الحالي (يبدأ كل خميس 12 ص)
    weekKey: { type: String, default: '' },          // تاريخ آخر خميس (بداية البنر)
    character: { type: mongoose.Schema.Types.Mixed, default: null },
    bannerName: { type: String, default: '' },
    startedAt: { type: Date, default: null },

    // البنر القادم (يتحدد بنتيجة التصويت، ويبدأ الخميس)
    nextCharacter: { type: mongoose.Schema.Types.Mixed, default: null },

    // التصويت (يفتح الأحد 5 م، يقفل الاثنين 5 م)
    vote: {
        voteId: { type: String, default: '' },        // تاريخ يوم الأحد الذي فتح فيه التصويت
        candidates: { type: [mongoose.Schema.Types.Mixed], default: [] },
        openedAt: { type: Date, default: null },
        closesAt: { type: Date, default: null },
        closed: { type: Boolean, default: false },
        used: { type: Boolean, default: false },      // استُخدمت نتيجته في تجديد البنر
        announcedOpen: { type: Boolean, default: false },
        announcedClose: { type: Boolean, default: false },
        result: { type: mongoose.Schema.Types.Mixed, default: null }  // { winner, counts, total, method }
    },

    // آخر تجديد (للإعلان)
    lastRotation: { type: mongoose.Schema.Types.Mixed, default: null },
    announcedWeek: { type: String, default: '' },

    // منع التكرار
    recentBanners: { type: [String], default: [] },
    recentCandidates: { type: [String], default: [] }
}, { timestamps: true, minimize: false })

module.exports = mongoose.models.BannerState || mongoose.model('BannerState', schema)
