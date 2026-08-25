const mongoose = require('mongoose')

// 📌 مستند وحيد (singleton) يخزّن حالات عامة للبوت لازم تصمد عبر
// الريستارت والـ redeploy (بعكس متغيرات الذاكرة اللي تنمسح مع أي
// إعادة تشغيل، أو ملفات القرص اللي تنمسح مع الـ redeploy على
// استضافات القرص المؤقت زي Render). أي حالة جديدة من هذا النوع
// (حارس "مرة وحدة باليوم/بالساعة" مثلاً) تنضاف كحقل هنا بدل ما
// تصير متغير `let` بأعلى index.js.
const BotStateSchema = new mongoose.Schema({

    // آخر تاريخ (بصيغة getSaudiDate) تم فيه توزيع جوائز المساهمات اليومية
    lastContribRewardDate: {
        type: String,
        default: null
    },

    // 🔒 إصلاح: هذا الحقل كان يُكتب من index.js (نظام تصفير سحبات
    // الأسلحة اليومي) لكنه ما كان معرّف هنا بالسكيمة. بوضع Mongoose
    // الافتراضي (strict: true)، أي حقل مو معرّف بالسكيمة يُتجاهل
    // بصمت عند $set — يعني lastWeaponResetDate ما كان ينحفظ أبداً
    // بقاعدة البيانات رغم إن الكود يبدو ناجح. النتيجة: عند قراءته
    // كان يرجع null دايماً، فالشرط "ما صفّرنا اليوم بعد" يتحقق مع
    // كل إعادة تشغيل للبوت (بأي ساعة، مو بس منتصف الليل)، ويصفّر
    // سحبات كل اللاعبين بالغلط.
    lastWeaponResetDate: {
        type: String,
        default: null
    }

})

module.exports =
    mongoose.model(
        'BotState',
        BotStateSchema
    )
