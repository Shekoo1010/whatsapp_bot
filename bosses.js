// ✅ كل زعيم له 3 قدرات ثابتة (abilities) وكل تابع له قدرتان (abilities)
// الزعيم القديم: ability مفردة محفوظة للتوافق.
const bosses = [
  {
    "name": "Aizen",
    "hp": 1000000000,
    "maxHp": 1000000000,
    "attack": 4000,
    "followers": [
      {
        "name": "Gin",
        "hp": 150000000,
        "ability": "poison",
        "image": "https://i.postimg.cc/PrHmLXHc/e7fcde08945493ce824c0e2a26465c86.jpg",
        "abilities": [
          "poison",
          "drainHp"
        ]
      },
      {
        "name": "Tosen",
        "hp": 150000000,
        "ability": "blind",
        "image": "https://i.postimg.cc/wjTLVw7F/42f3accb5e639d3515f7e08c8f5b5841-(1).jpg",
        "abilities": [
          "blind",
          "weaken"
        ]
      }
    ],
    "image": "https://i.ibb.co/9ksxPcRw/527968451e980d63fa2d4a7c1895b289.jpg",
    "ability": {
      "name": "Kyoka Suigetsu",
      "description": "قام أيزن بخداع الجميع وخفض الضرر القادم 50%",
      "effect": "halfDamage"
    },
    "abilities": [
      {
        "name": "Kyoka Suigetsu",
        "description": "خدع أيزن الجميع وخفض الضرر القادم 50%",
        "effect": "halfDamage"
      },
      {
        "name": "Hogyoku",
        "description": "الهوغيوكو جدد جزءاً من دم أيزن",
        "effect": "regen"
      },
      {
        "name": "Kurohitsugi",
        "description": "التابوت الأسود حاصر المهاجم بانفجار مدمر",
        "effect": "volcano"
      }
    ]
  },
  {
    "name": "Yhwach",
    "hp": 956000000,
    "maxHp": 956000000,
    "attack": 3900,
    "followers": [
      {
        "name": "Jugram",
        "hp": 144000000,
        "ability": "reflect",
        "image": "https://i.postimg.cc/5tXvcj5z/0075c3dc645323b4cee3e60be0b79920-(2).jpg",
        "abilities": [
          "reflect",
          "lastStand"
        ]
      },
      {
        "name": "Uryu",
        "hp": 144000000,
        "ability": "dodge",
        "image": "https://i.postimg.cc/SKH9mqVD/33381cdf77d9c49d5b1ea80cf23bda8f.jpg",
        "abilities": [
          "dodge",
          "mark"
        ]
      }
    ],
    "image": "https://i.ibb.co/HW8VPVx/52432833eade63aa7067622060e66183.jpg",
    "ability": {
      "name": "Future Sight",
      "description": "رأى يوهاباخ المستقبل وتجنب الهجمة بالكامل",
      "effect": "dodge"
    },
    "abilities": [
      {
        "name": "Future Sight",
        "description": "رأى يوهاباخ المستقبل وتجنب الهجمة بالكامل",
        "effect": "dodge"
      },
      {
        "name": "Auswahlen",
        "description": "سرق جزءاً من دم المهاجم وعالج نفسه به",
        "effect": "drainLife"
      },
      {
        "name": "Schrift: Sternritter",
        "description": "مجده أعطاه قوة هجومية للضربة الجماعية القادمة",
        "effect": "warcry"
      }
    ]
  },
  {
    "name": "Tokinada",
    "hp": 868000000,
    "maxHp": 868000000,
    "attack": 3700,
    "followers": [
      {
        "name": "Hikone",
        "hp": 134000000,
        "ability": "bonusDamage",
        "image": "https://i.postimg.cc/pT8FT71w/cc1932e20e9a6cb5f04606800ed245eb-(1).jpg",
        "abilities": [
          "bonusDamage",
          "weaken"
        ]
      },
      {
        "name": "Aura",
        "hp": 134000000,
        "ability": "healBoss",
        "image": "https://i.postimg.cc/J05H3X8q/c6231805e68261298f9813c0d32dcb76.jpg",
        "abilities": [
          "healBoss",
          "shieldBoss"
        ]
      }
    ],
    "image": "https://i.ibb.co/LDdFC0sT/17145c15b01b425c4562f5dedda5ae28.jpg",
    "ability": {
      "name": "Enrakyoten",
      "description": "نسخ قدرة قوية واستعاد 4000 HP",
      "effect": "heal"
    },
    "abilities": [
      {
        "name": "Enrakyoten",
        "description": "نسخ قدرة قوية واستعاد HP",
        "effect": "heal"
      },
      {
        "name": "Copycat",
        "description": "عكس جزءاً من الضرر على المهاجم وعالج نفسه",
        "effect": "reflectHeal"
      },
      {
        "name": "Dark Tide",
        "description": "المد المظلم كتم الضربات الحرجة",
        "effect": "critSeal"
      }
    ]
  },
  {
    "name": "Imu",
    "hp": 1000000000,
    "maxHp": 1000000000,
    "attack": 4000,
    "followers": [
      {
        "name": "Saturn",
        "hp": 150000000,
        "ability": "healBoss",
        "image": "https://i.postimg.cc/WpGZcBZz/520dc23ffe96b0d72f827430c4002e36-(1).jpg",
        "abilities": [
          "healBoss",
          "shieldBoss"
        ]
      },
      {
        "name": "Garling",
        "hp": 150000000,
        "ability": "bonusDamage",
        "image": "https://i.postimg.cc/3J9Dd2nW/22d9e421a4d24659222126244119ccbf-(1).jpg",
        "abilities": [
          "bonusDamage",
          "buffBoss"
        ]
      }
    ],
    "image": "https://i.ibb.co/pvVx2yTN/24f563ae16e1fd49977688a5c800c7e6.jpg",
    "ability": {
      "name": "Unknown Power",
      "description": "استعاد 10000 HP من قوته الغامضة",
      "effect": "bigHeal"
    },
    "abilities": [
      {
        "name": "Unknown Power",
        "description": "استعاد HP من قوته الغامضة",
        "effect": "bigHeal"
      },
      {
        "name": "Empty Throne",
        "description": "العرش الفارغ سحق المهاجم بضربة قاسية",
        "effect": "dimensionCollapse"
      },
      {
        "name": "Erasure",
        "description": "علّم هدفاً للمحو... ضربته القادمة ستكون قاتلة",
        "effect": "markHunt"
      }
    ]
  },
  {
    "name": "Joy Boy",
    "hp": 924000000,
    "maxHp": 924000000,
    "attack": 3950,
    "followers": [
      {
        "name": "Zoro",
        "hp": 140000000,
        "ability": "bonusDamage",
        "image": "https://i.postimg.cc/QdtK5Vyg/2b7579b629c4edd81e5e6f995742727f.jpg",
        "abilities": [
          "bonusDamage",
          "mark"
        ]
      },
      {
        "name": "Sanji",
        "hp": 140000000,
        "ability": "healBoss",
        "image": "https://i.postimg.cc/52RYm1hg/0278746f6933b1c289bd7f2564ed1678.jpg",
        "abilities": [
          "healBoss",
          "buffBoss"
        ]
      }
    ],
    "image": "https://i.ibb.co/fGMK2s9z/c59baa23779c58bc8351e2f4a308d419.jpg",
    "ability": {
      "name": "Nika",
      "description": "أطلق قوة نيكا وألحق ضرراً مضاعفاً",
      "effect": "doubleDamage"
    },
    "abilities": [
      {
        "name": "Nika",
        "description": "ضربة إضافية بقوة نيكا",
        "effect": "doubleDamage"
      },
      {
        "name": "Drums of Liberation",
        "description": "طبول التحرير رفعت هجوم الضربة الجماعية القادمة",
        "effect": "warcry"
      },
      {
        "name": "Gear 5 Rubber",
        "description": "الجسد المطاطي ارتد بجزء من الضرر",
        "effect": "reflect"
      }
    ]
  },
  {
    "name": "Madara",
    "hp": 748000000,
    "maxHp": 748000000,
    "attack": 3600,
    "followers": [
      {
        "name": "Obito",
        "hp": 118000000,
        "ability": "dodge",
        "image": "https://i.postimg.cc/26p1PG8q/a2ef69a608eb7eacf8f89b4df1098a4b.jpg",
        "abilities": [
          "dodge",
          "mark"
        ]
      },
      {
        "name": "Pain",
        "hp": 118000000,
        "ability": "reflect",
        "image": "https://i.postimg.cc/D0n8zzG1/c4aae53579d7026a8894a01fb22a8c4b-(4).jpg",
        "abilities": [
          "reflect",
          "weaken"
        ]
      }
    ],
    "image": "https://i.ibb.co/whT9p1GX/6d2b34e75a541170762589b638248d60.jpg",
    "ability": {
      "name": "Susanoo",
      "description": "استدعى السوسانو واستعاد 5000 HP",
      "effect": "heal"
    },
    "abilities": [
      {
        "name": "Susanoo",
        "description": "سوسانو غطى مادارا بدرع يمتص الضرر",
        "effect": "bossShield"
      },
      {
        "name": "Limbo Clones",
        "description": "استخدم نسخة وهمية وتفادى الهجمة",
        "effect": "dodge"
      },
      {
        "name": "Meteor",
        "description": "نيزك ساحق سقط على المهاجم",
        "effect": "volcano"
      }
    ]
  },
  {
    "name": "Kaido",
    "hp": 808000000,
    "maxHp": 808000000,
    "attack": 3650,
    "followers": [
      {
        "name": "King",
        "hp": 126000000,
        "ability": "reduceDamage",
        "image": "https://i.postimg.cc/3rFkcgMq/9c6e1efe477b8471177188caedd1fc2b-(1).jpg",
        "abilities": [
          "reduceDamage",
          "lastStand"
        ]
      },
      {
        "name": "Queen",
        "hp": 126000000,
        "ability": "poison",
        "image": "https://i.postimg.cc/DyC82nwZ/9912f2a02a2076b8d9c168e712a0f6cf-(1).jpg",
        "abilities": [
          "poison",
          "drainHp"
        ]
      }
    ],
    "image": "https://i.ibb.co/m531jPmT/3efd2af2492ded6dc0c1f69b1c65c533.jpg",
    "ability": {
      "name": "Dragon Form",
      "description": "تحول إلى تنين وخفض الضرر المستلم",
      "effect": "reduceDamage"
    },
    "abilities": [
      {
        "name": "Dragon Form",
        "description": "تحول إلى تنين وخفض الضرر القادم",
        "effect": "reduceDamage"
      },
      {
        "name": "Thunder Bagua",
        "description": "صاعقة ضربت المهاجم",
        "effect": "lightning"
      },
      {
        "name": "Blast Breath",
        "description": "نفس مدمر أحرق المهاجم",
        "effect": "storm"
      }
    ]
  },
  {
    "name": "Roger",
    "hp": 836000000,
    "maxHp": 836000000,
    "attack": 3800,
    "followers": [
      {
        "name": "Rayleigh",
        "hp": 130000000,
        "ability": "bonusDamage",
        "image": "https://i.postimg.cc/5tz0qzqf/91d59ef4bafacaf87004be232498c7c4-(1).jpg",
        "abilities": [
          "bonusDamage",
          "buffBoss"
        ]
      },
      {
        "name": "Gaban",
        "hp": 130000000,
        "ability": "reflect",
        "image": "https://i.postimg.cc/mgthkJP0/78831eae80634cedc043efda76284c38.jpg",
        "abilities": [
          "reflect",
          "shieldBoss"
        ]
      }
    ],
    "image": "https://i.ibb.co/rKwwTPhv/49eabbd5a9f5ee5fd47ed6eef7ac1156.jpg",
    "ability": {
      "name": "Conqueror Haki",
      "description": "أطلق الهاكي الملكي وأضعف المهاجمين",
      "effect": "reduceDamage"
    },
    "abilities": [
      {
        "name": "Conqueror Haki",
        "description": "هاكي الملوك أضعف ضرر المهاجم",
        "effect": "curse"
      },
      {
        "name": "Voice of All Things",
        "description": "سمع نية المهاجم... ضربته القادمة ستكون مضاعفة",
        "effect": "markHunt"
      },
      {
        "name": "Grand Departure",
        "description": "ضربة ساحقة أصابت المهاجم",
        "effect": "dimensionCollapse"
      }
    ]
  },
  {
    "name": "Meruem",
    "hp": 600000000,
    "maxHp": 600000000,
    "attack": 3200,
    "followers": [
      {
        "name": "Youpi",
        "hp": 100000000,
        "ability": "bonusDamage",
        "image": "https://i.postimg.cc/CLvHWyyj/fccac1cad24ec38c1f6575f5c9d2528f.jpg",
        "abilities": [
          "bonusDamage",
          "buffBoss"
        ]
      },
      {
        "name": "Pouf",
        "hp": 100000000,
        "ability": "healBoss",
        "image": "https://i.postimg.cc/d1mVgKf1/d7b51b93c9a1ff8ace6b303d5ed005e0.jpg",
        "abilities": [
          "healBoss",
          "shieldBoss"
        ]
      }
    ],
    "image": "https://i.ibb.co/M5Jkz69y/af5a90f6f02b1b6671b51a4c701a5ed6.jpg",
    "ability": {
      "name": "Evolution",
      "description": "تطور ميرويم واستعاد 3000 HP",
      "effect": "heal"
    },
    "abilities": [
      {
        "name": "Evolution",
        "description": "تطور وجدد جزءاً من دمه",
        "effect": "regen"
      },
      {
        "name": "Adaptation",
        "description": "تأقلم مع شخصية المهاجم فقل ضررها تراكمياً",
        "effect": "adapt"
      },
      {
        "name": "Gyo Rage",
        "description": "غضب ميروم رفع هجوم الضربة الجماعية القادمة",
        "effect": "warcry"
      }
    ]
  },
  {
    "name": "Teach",
    "hp": 676000000,
    "maxHp": 676000000,
    "attack": 3400,
    "followers": [
      {
        "name": "Shiryu",
        "hp": 110000000,
        "ability": "dodge",
        "image": "https://i.postimg.cc/SRgNNfqf/4a4411a0c5fbd643b2849f92fbd591c6.jpg",
        "abilities": [
          "dodge",
          "drainHp"
        ]
      },
      {
        "name": "Burgess",
        "hp": 110000000,
        "ability": "critical",
        "image": "https://i.postimg.cc/7P9LVw7V/f804b10aefd3626a3112e22fd2e50e58.jpg",
        "abilities": [
          "critical",
          "lastStand"
        ]
      }
    ],
    "image": "https://i.ibb.co/ns9FFjSG/4905692f38d6e5225eab3be16b5ab855.jpg",
    "ability": {
      "name": "Darkness",
      "description": "ابتلع الظلام جزءاً من الضرر",
      "effect": "halfDamage"
    },
    "abilities": [
      {
        "name": "Darkness",
        "description": "الظلام ابتلع نصف الضرر",
        "effect": "halfDamage"
      },
      {
        "name": "Dual Fruits",
        "description": "عكس جزءاً من الضرر وعالج نفسه",
        "effect": "reflectHeal"
      },
      {
        "name": "Black Hole",
        "description": "الثقب الأسود سرق من دم المهاجم",
        "effect": "drainLife"
      }
    ]
  }
]

module.exports = bosses
