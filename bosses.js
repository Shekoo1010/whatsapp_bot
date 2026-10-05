const bosses = [

{
name: "Aizen",
hp: 300000000,
maxHp: 300000000,
attack: 4000,

followers: [
{
    name: "Gin",
    hp: 30000000,
    ability: "poison",
    image: "https://i.postimg.cc/PrHmLXHc/e7fcde08945493ce824c0e2a26465c86.jpg"
},
{
    name: "Tosen",
    hp: 30000000,
    ability: "blind",
    image: "https://i.postimg.cc/wjTLVw7F/42f3accb5e639d3515f7e08c8f5b5841-(1).jpg"
}
],

image: "https://i.ibb.co/9ksxPcRw/527968451e980d63fa2d4a7c1895b289.jpg",

ability: {
name: "Kyoka Suigetsu",
description: "قام أيزن بخداع الجميع وخفض الضرر القادم 50%",
effect: "halfDamage"
}
},

{
name: "Yhwach",
hp: 289000000,
maxHp: 289000000,
attack: 3900,

followers: [
{
    name: "Jugram",
    hp: 34500000,
    ability: "reflect",
    image: "https://i.postimg.cc/5tXvcj5z/0075c3dc645323b4cee3e60be0b79920-(2).jpg"
},
{
    name: "Uryu",
    hp: 34500000,
    ability: "dodge",
    image: "https://i.postimg.cc/SKH9mqVD/33381cdf77d9c49d5b1ea80cf23bda8f.jpg"
}
],

image: "https://i.ibb.co/HW8VPVx/52432833eade63aa7067622060e66183.jpg",

ability: {
name: "The Almighty",
description: "رأى يوهاباخ المستقبل وتجنب الهجمة بالكامل",
effect: "dodge"
}
},

{
name: "Tokinada",
hp: 267000000,
maxHp: 267000000,
attack: 3700,

followers: [
{
    name: "Hikone",
    hp: 46500000,
    ability: "bonusDamage",
    image: "https://i.postimg.cc/pT8FT71w/cc1932e20e9a6cb5f04606800ed245eb-(1).jpg"
},
{
    name: "Aura",
    hp: 46500000,
    ability: "healBoss",
    image: "https://i.postimg.cc/J05H3X8q/c6231805e68261298f9813c0d32dcb76.jpg"
}
],

image: "https://i.ibb.co/LDdFC0sT/17145c15b01b425c4562f5dedda5ae28.jpg",

ability: {
name: "Enrakyoten",
description: "نسخ قدرة قوية واستعاد 4000 HP",
effect: "heal"
}
},

{
name: "Imu",
hp: 300000000,
maxHp: 300000000,
  attack: 4000,
followers: [
{
    name: "Saturn",
    hp: 30000000,
    ability: "healBoss",
    image: "https://i.postimg.cc/WpGZcBZz/520dc23ffe96b0d72f827430c4002e36-(1).jpg"
},
{
    name: "Garling",
    hp: 30000000,
    ability: "bonusDamage",
    image: "https://i.postimg.cc/3J9Dd2nW/22d9e421a4d24659222126244119ccbf-(1).jpg"
}
],

  
image: "https://i.ibb.co/pvVx2yTN/24f563ae16e1fd49977688a5c800c7e6.jpg",
ability: {
name: "Unknown Power",
description: "استعاد 10000 HP من قوته الغامضة",
effect: "bigHeal"
}
},

{
name: "Joy Boy",
hp: 281000000,
maxHp: 281000000,
  attack: 3950,

followers: [
{
    name: "Zoro",
    hp: 45000000,
    ability: "bonusDamage",
    image: "https://i.postimg.cc/QdtK5Vyg/2b7579b629c4edd81e5e6f995742727f.jpg"
},
{
    name: "Sanji",
    hp: 45000000,
    ability: "healBoss",
    image: "https://i.postimg.cc/52RYm1hg/0278746f6933b1c289bd7f2564ed1678.jpg"
}
],

  
image: "https://i.ibb.co/fGMK2s9z/c59baa23779c58bc8351e2f4a308d419.jpg",
ability: {
name: "Nika",
description: "أطلق قوة نيكا وألحق ضرراً مضاعفاً",
effect: "doubleDamage"
}
},

{
name: "Madara",
hp: 237000000,
maxHp: 237000000,
  attack: 3600,

followers: [
{
    name: "Obito",
    hp: 45000000,
    ability: "dodge",
    image: "https://i.postimg.cc/26p1PG8q/a2ef69a608eb7eacf8f89b4df1098a4b.jpg"
},
{
    name: "Pain",
    hp: 45000000,
    ability: "reflect",
    image: "https://i.postimg.cc/D0n8zzG1/c4aae53579d7026a8894a01fb22a8c4b-(4).jpg"
}
],

  
image: "https://i.ibb.co/whT9p1GX/6d2b34e75a541170762589b638248d60.jpg",
ability: {
name: "Susanoo",
description: "استدعى السوسانو واستعاد 5000 HP",
effect: "heal"
}
},

{
name: "Kaido",
hp: 252000000,
maxHp: 252000000,
  attack: 3650,

followers: [
{
    name: "King",
    hp: 45000000,
    ability: "reduceDamage",
    image: "https://i.postimg.cc/3rFkcgMq/9c6e1efe477b8471177188caedd1fc2b-(1).jpg"
},
{
    name: "Queen",
    hp: 45000000,
    ability: "poison",
    image: "https://i.postimg.cc/DyC82nwZ/9912f2a02a2076b8d9c168e712a0f6cf-(1).jpg"
}
],
  
image: "https://i.ibb.co/m531jPmT/3efd2af2492ded6dc0c1f69b1c65c533.jpg",
ability: {
name: "Dragon Form",
description: "تحول إلى تنين وخفض الضرر المستلم",
effect: "reduceDamage"
}
},

{
name: "Roger",
hp: 259000000,
maxHp: 259000000,
  attack: 3800,

followers: [
{
    name: "Rayleigh",
    hp: 60000000,
    ability: "bonusDamage",
    image: "https://i.postimg.cc/5tz0qzqf/91d59ef4bafacaf87004be232498c7c4-(1).jpg"
},
{
    name: "Gaban",
    hp: 60000000,
    ability: "reflect",
    image: "https://i.postimg.cc/mgthkJP0/78831eae80634cedc043efda76284c38.jpg"
}
],

  
image: "https://i.ibb.co/rKwwTPhv/49eabbd5a9f5ee5fd47ed6eef7ac1156.jpg",
ability: {
name: "Conqueror Haki",
description: "أطلق الهاكي الملكي وأضعف المهاجمين",
effect: "reduceDamage"
}
},

{
name: "Meruem",
hp: 200000000,
maxHp: 200000000,
  attack: 3200,

followers: [
{
    name: "Youpi",
    hp: 30000000,
    ability: "bonusDamage",
    image: "https://i.postimg.cc/fbdLjdj8/6ee6b6c9c88b245e91a757e3af5664cf-(1).jpg"
},
{
    name: "Pouf",
    hp: 30000000,
    ability: "healBoss",
    image: "https://i.postimg.cc/d1mVgKf1/d7b51b93c9a1ff8ace6b303d5ed005e0.jpg"
}
],
  
image: "https://i.ibb.co/M5Jkz69y/af5a90f6f02b1b6671b51a4c701a5ed6.jpg",
ability: {
name: "Evolution",
description: "تطور ميرويم واستعاد 3000 HP",
effect: "heal"
}
},

{
name: "Teach",
hp: 219000000,
maxHp: 219000000,
  attack: 3400,

followers: [
{
    name: "Shiryu",
    hp: 45000000,
    ability: "dodge",
    image: "https://i.postimg.cc/SRgNNfqf/4a4411a0c5fbd643b2849f92fbd591c6.jpg"
},
{
    name: "Burgess",
    hp: 45000000,
    ability: "critical",
    image: "https://i.postimg.cc/7P9LVw7V/f804b10aefd3626a3112e22fd2e50e58.jpg"
}
],
  
image: "https://i.ibb.co/ns9FFjSG/4905692f38d6e5225eab3be16b5ab855.jpg",
ability: {
name: "Darkness",
description: "ابتلع الظلام جزءاً من الضرر",
effect: "halfDamage"
}
}

]

module.exports = bosses
