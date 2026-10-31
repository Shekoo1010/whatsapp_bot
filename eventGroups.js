// 🆔 المكان الوحيد لايدي قروب الفعاليات — غيّره هنا فقط
// (يقدر أي ملف يستدعيه بدون مشكلة require دائري لأنه ما يستدعي أي ملف ثاني)
const EVENT_GROUP = process.env.EVENT_GROUP_ID || '120363409897316453@g.us'

// لو عندك أكثر من قروب للفعاليات أضفها هنا
const EVENT_GROUPS = [EVENT_GROUP]

module.exports = { EVENT_GROUP, EVENT_GROUPS }
