const mongoose = require('mongoose')

// 💍 هذا الموديل هو مصدر الحقيقة الوحيد لملكية الويفوهات الآن.
// بدل ما نعتمد على Waifu.claimedBy (ملكية عامة واحدة لكل الشخصية
// بكل القروبات)، كل سجل هنا يربط شخصية (waifuId) بمالك (userId)
// داخل قروب معيّن (groupId) فقط — فنفس الشخصية تقدر تنمتلك بشكل
// مستقل تمامًا بكل قروب.
const waifuClaimSchema =
new mongoose.Schema({

    waifuId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Waifu',
        required: true
    },

    groupId: {
        type: String,
        required: true
    },

    userId: {
        type: String,
        required: true
    },

    claimedAt: {
        type: Date,
        default: Date.now
    }

})

// شخصية وحدة ما تنملك أكثر من مرة بنفس القروب (نفس منطق
// claimedBy القديم، بس معزول حسب groupId)
waifuClaimSchema.index(
    { waifuId: 1, groupId: 1 },
    { unique: true }
)

// يسرّع استعلامات "مجموعتي" / ".اعرض" وغيرها اللي تجيب
// كل ويفوهات لاعب معيّن داخل قروب معيّن
waifuClaimSchema.index(
    { userId: 1, groupId: 1 }
)

module.exports =
mongoose.model(
    'WaifuClaim',
    waifuClaimSchema
)
