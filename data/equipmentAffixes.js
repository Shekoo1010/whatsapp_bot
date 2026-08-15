// =========================
// 🎲 بنك الساب ستات (Sub Stats Pool)
// كل قطعة إيكو تسحب 3 ساب ستات بالضبط (تنفتح عند لفل 5 / 10 / 15)
// فيه أزواج % وflat لنفس الستات (هجوم/HP) زي وذرنق بالضبط
// =========================

const affixes = [

    // 🗡️ هجوم — نسخة مباشرة (Flat) ونسخة نسبة (%)
    { type: 'attack', name: 'هجوم', min: 8, max: 25 },
    { type: 'attackPercent', name: 'هجوم %', min: 3, max: 7 },

    // ❤️ HP — نسخة مباشرة (Flat) ونسخة نسبة (%)
    { type: 'hp', name: 'HP', min: 80, max: 250 },
    { type: 'hpPercent', name: 'HP %', min: 3, max: 7 },

    // 🛡️ دفاع
    { type: 'defense', name: 'دفاع', min: 6, max: 18 },

    // 💥 كريتيكال
    { type: 'critRate', name: 'نسبة الحرج', min: 2, max: 5 },
    { type: 'critDamage', name: 'ضرر الحرج', min: 4, max: 9 },

    // 🌪 مراوغة / دقة
    { type: 'dodge', name: 'مراوغة', min: 2, max: 5 },
    { type: 'accuracy', name: 'دقة', min: 2, max: 6 },

    // 🩸 امتصاص / انعكاس
    { type: 'lifesteal', name: 'امتصاص حياة', min: 2, max: 5 },
    { type: 'reflect', name: 'انعكاس ضرر', min: 2, max: 6 },

    // 👑 ضرر ضد الزعيم
    { type: 'bossDamage', name: 'ضرر بوس', min: 3, max: 7 }

]

module.exports = { affixes }
