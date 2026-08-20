// =========================================================
// 🎭 لعبة "برا السالفة" (Spyfall Style)
// =========================================================
// الفكرة:
// - يبدأ أحدهم اللعبة بتحديد category، يشارك 4-10 لاعبين.
// - البوت يختار كلمة عشوائية من الـ category ويرسل بالخاص:
//     * لأغلب اللاعبين: الكلمة (داخل السالفة)
//     * لواحد أو اثنين (لو العدد فوق 8): "أنت برا السالفة" بدون الكلمة
// - جولة تلقائية: البوت يمنشن شخصين "فلان اسأل فلان"، فلان يسأل
//   بالشات، والمسؤول يجاوب نعم/لا فقط، وينتقل تلقائي للزوج التالي
//   حتى يمر على الكل.
// - كل دور (تلقائي أو حر) عنده مهلة دقيقتين: لو ما جاوب المسؤول
//   بالوقت، البوت ينتقل تلقائياً للدور التالي.
// - بعدها فترة أسئلة حرة: أي مشارك يطلب يسأل شخص محدد.
// - .تصويت يفتح التصويت، كل واحد يصوت برقم اللي يشك فيه.
// - بعد اكتمال التصويت: قبل ما تظهر النتيجة، يحصل اللي "برا السالفة"
//   على فرصة أخيرة (.اختار <رقم>) يخمّن فيها الكلمة الصحيحة من
//   قائمة 5 خيارات، ولو صاب ياخذ نقاط إضافية.
// - يكشف البوت مين "برا السالفة" ويوزع نقاط.
// - جولة جديدة بنفس اللاعبين مع category جديد، أو إنهاء اللعبة
//   وعرض الترتيب النهائي (مع تعادل بين أكثر من فائز لو تساووا بالنقاط).
// =========================================================

// ---------------------------------------------------------
// 1) بنك الكلمات لكل category — زد عليها براحتك
// ---------------------------------------------------------
const CATEGORY_WORDS = {
    'انمي': [
        'ناروتو','بوروتو','ون بيس','هجوم العمالقة','دراغون بول','بونقو ستراي دوغز','سولو ليفيلينغ',
        'بليتش','ديث نوت','جوجوتسو كايسن','ديمون سلاير','فيري تيل','فول ميتال الكيميست','سلام دانك',
        'هنتر × هنتر','ون بانش مان','كود جياس','إيفانجيليون','نو غيم نو لايف','ري زيرو',
        'سورد آرت أونلاين','طوكيو غول','بلاك كلوفر','الخطايا السبع المميته','ذا برومس نيفرلاند',
        'هايكيو','كوروكو نو باسكيت','بوكو نو هيرو','كابتن تسوباسا','سباي × فاميلي',
        'جوجو','دكتور ستون','أوفرلورد','المحقق كونان','هاجيمي نو ايبو','فينلاند ساغا',
        'فاير فورس','جينتاما','بيرسيرك','فيت زيرو','كايجو 8',
        'اكامي غا كيل','فصل النخبه','فصل الاغتيال','كذبتك في ابريل',
        'السلايم','هيلسنج','بلو لوك','كينغدوم','فايوليت ايفرجاردين',
        'نوراغامي','سايكو باس','الطفيليات '
    ],
    'رياضه': [
    'كرة القدم','كرة السلة','الكرة الطائرة','التنس','السباحة','الملاكمة','الجودو','الكاراتيه',
    'التايكوندو','المصارعة','رفع الأثقال','كمال الأجسام','ركوب الخيل','الغولف','الجري','الماراثون',
    'كرة اليد','الهوكي على الجليد','الرغبي','البيسبول','الكريكيت','تنس الطاولة','الريشة الطائرة',
    'السكواش','البلياردو','البولينج','ركوب الدراجات','سباق السيارات','سباق الدراجات النارية',
    'التجديف','الإبحار','تسلق الجبال','الغطس','الرماية','رمي الرمح',
    'سباق الحواجز','سباق التتابع','الجمباز','الشطرنج',
    'المبارزة بالسيف','الرماية بالقوس','شد الحبل','التزلج على الجليد','التزلج على الثلج',
    'التزلج على الماء','ركوب الأمواج','الغوص الحر','الدراجات الجبلية',
    'كرة القدم الأمريكية','الكرة الطائرة الشاطئية','الهوكي','الرجبي الأمريكي','كرة القدم الشاطئية'
],
    'فواكه': [
    'تفاح','موز','عنب','بطيخ','شمام','مانجو','فراولة','أناناس',
    'برتقال','يوسفي','رمان','كيوي','خوخ','كمثرى','برقوق','كرز',
    'مشمش','تين','تمر','جوافة','بابايا','جوز الهند','ليمون',
    'ليمون أخضر','جريب فروت','كاكي','سفرجل','زيتون','أفوكادو',
    'تمر هندي','عنب أسود','عنب أخضر','تين شوكي','توت أزرق',
    'بطيخ أصفر'
],
    'دول': [
        'السعودية','مصر','اليابان','كوريا الجنوبية','فرنسا','البرازيل','ألمانيا','الإمارات','تركيا',
        'إيطاليا','إسبانيا','البرتغال','بريطانيا','أمريكا','كندا','المكسيك','الأرجنتين','الصين',
        'الهند','باكستان','إندونيسيا','ماليزيا','تايلاند','فيتنام','الفلبين','سنغافورة','أستراليا',
        'نيوزيلندا','روسيا','أوكرانيا','بولندا','هولندا','بلجيكا','سويسرا','النمسا','السويد','النرويج',
        'الدنمارك','فنلندا','اليونان','قبرص','المغرب','الجزائر','تونس','ليبيا','السودان','الأردن',
        'لبنان','سوريا','العراق','الكويت','قطر','البحرين','عُمان','اليمن','فلسطين','إيران','أفغانستان',
        'بنغلاديش','سريلانكا','نيبال','منغوليا','كازاخستان','أوزبكستان','جورجيا','أرمينيا',
        'أذربيجان','كوريا الشمالية','تايوان','هونغ كونغ','جنوب أفريقيا','نيجيريا','كينيا','إثيوبيا',
        'غانا','السنغال','تشيلي','بيرو','كولومبيا','فنزويلا','الإكوادور','بوليفيا','أوروغواي',
        'كوبا','جامايكا','آيسلندا','آيرلندا','اسكتلندا','ويلز','التشيك','المجر','رومانيا','بلغاريا',
        'صربيا','كرواتيا'
    ],
    'اكلات': [
    'كبسة','مندي','مضغوط','مظبي','جريش','قرصان','مرقوق',
    'هريس','ثريد','مقلوبة','مندي دجاج','مندي لحم','برياني',
    'شاورما','فلافل','حمص','متبل','تبولة','فتوش','فتة حمص',
    'كباب','شيش طاووق','مشاوي مشكلة','دجاج مشوي','سمك مشوي','روبيان',
    'كبة','سمبوسة','ورق عنب','فطيرة سبانخ','معجنات جبن','بيض بالطماطم',
    'ملوخية','بامية','مسقعة','شوربة عدس','شوربة خضار','مرق لحم',
    'مكرونة','باستا','سباغيتي','لازانيا','سباغيتي بولونيز',
    'مكرونة بالبشاميل',
    'بيتزا','بيتزا مارغريتا','بيتزا بيبروني',
    'برجر','همبرغر','هوت دوغ','ناجتس','دجاج مقلي','ساندويتش تونة',
    'ستيك لحم','ستيك دجاج','بطاطس مقلية','ساندويتش دجاج',
    'سوشي','رامن','دجاج بالكاري','أرز بالخضار',
    'سلطة خضراء','سلطة بطاطس','سلطة مكرونة',
    'كنافة','بقلاوة','قطايف','معمول','لقيمات','أم علي',
    'رز باللبن','بسبوسة','هريسة','كيك شوكولاتة',
    'تشيز كيك','دونات','بان كيك','وافل','كريب','آيس كريم',
    'حريرة مغربية','طاجين لحم','فتة شاورما'
],
    'مسلسلات وافلام': [
        'صراع العروش','بريكينج باد','فريندز','ذا اوفيس','سترينجر ثينجز','ذا كراون','مانيفست',
        'داون آبي','شيرلوك','ذا ويتشر','دارك','ذا بويز','لوسيفر','لا كازا دي بابل',
        'سكويد غيم','ذا لاست اوف اس','هاوس اوف ذا دراغون','ذا ماندالوريان',
        'وستوورلد','بلاك ميرور','ذا هاندميدز تيل','13 ريزنز واي','ريفرديل','بريدجرتون',
        'اوزارك','ذا كوين قامبت','هاوس اوف كاردز','ذا فلاش','اروو','سوبرمان اند لويس','باتمان',
        'الرجل الحديدي','المنتقمون','الرجل العنكبوت','جوكر','جون ويك','فاست اند فيوريوس',
        'ميشن إمبوسيبل','جيمس بوند','هاري بوتر','رب الخواتم','الهوبيت','افاتار','تايتانيك',
        'انسبشن','انترستيلر','ذا ديار نايت','جوراسيك بارك','ذا ماتريكس','باك تو ذا فيوتشر',
        'فورست غامب','ذا شوشانك ريدمبشن','ذا غودفازر','بالب فيكشن','فايت كلوب','جوكر',
        'باربي','اوبنهايمر','دون','توب غان مافريك','بلاك بانثر','ذا وايلد روبوت','انكانتو',
        'فروزن','موانا','كوكو','اب','إنسايد اوت','زوتوبيا','قصة لعبة',
        'ريو','مدغشقر','عصر جليدي','شريك','كونغ فو باندا','هاو تو ترين يور دراغون','ميغا مايند',
        'رالف المدمر','لوكا','تيرنينج ريد','السنافر','عائلة مدريجال','ذا سيمبسونز','فاميلي غاي',
        'ساوث بارك','ريك اند مورتي','بيغ بانغ ثيوري','مودرن فاميلي','هاو آي ميت يور مذر',
        'ستار وورز','ستار تريك','بريدج اوف سبايز','قائمة شندلر',
        'سيفن','سبايدر مان لا واي هوم','دوكتور سترينج','ثور','بلاك ويدو','كابتن مارفل','اكوامان',
        'وندر وومن','مان اوف ستيل','باتمان بيغينز','ذا دارك نايت','باراسايت',
        'ذا كونجورينغ','انسيديوس','هاليدي','سكريم','فرايداي ذا 13'
    ],
    'قيمرز (العاب)': [
        'فورتنايت','ببجي','فري فاير','ماين كرافت','روبلوكس','كول اوف ديوتي','فيفا','بيس',
        'جراند ثفت اوتو','جي تي ايه 5','ريد ديد ريدمبشن','ذا ويتشر 3','دارك سولز','الدن رينج',
        'سايبربانك 2077','هالو','فالورانت','ليج اوف ليجندز','دوتا 2','كاونتر سترايك',
        'اوفرووتش','ابيكس ليجندز','فورزا','نيد فور سبيد','سونيك','ماريو',
        'زيلدا','ماريو كارت','سوبر سماش براذرز','ستريت فايتر','مورتال كومبات','تيكن',
        'ديابلو','وورلد اوف ووركرافت','ستاركرافت','فاينل فانتازي','كينغدوم هارتس',
        'بيرسونا','دراغون كويست','بوكيمون غو','انيمال كروسينغ','ذا سيمز','سيتي سكايلاينز',
        'سيفيلايزيشن','ايج اوف امباير','هيرثستون','كلاش اوف كلانز','كلاش رويال',
        'كاندي كراش','بريو ستارز','جينشين إمباكت','هونكاي ستار ريل',
        'اسسسنز كريد','فار كراي','واتش دوغز','ديترويت بيكم هيومن',
        'اتشارتد','قود اوف وور','هورايزون زيرو داون','بلود بورن','سيكيرو','ريزيدنت إيفل',
        'سايلنت هيل','دد سبيس','تيراريا','ستاردو فالي','هولو نايت',
        'سيليست','فول قاي','امونق اس','بيت سيبر',
        'إن بي إيه 2K','ماذن إن إف إل','دونكي كونغ','كراش بانديكوت','سبايرو',
        'راتشيت اند كلانك','ليتل بيغ بلانيت','جست دانس','أوسو',
        'رست','فولاوت','اليدر سكرولز سكايرم','بورتال','هاف لايف',
        'تيم فورترس','باتلفيلد','هيتمان','ديث سترانديد'
    ],
    'شخصيات انمي او مسلسلات وافلام': [
        'ناروتو أوزوماكي','ساسكي أوتشيها','مونكي دي لوفي','زورو رورونوا','ايس',
        'ايرين ييغر','ميكاسا اكرمان','ليفاي أكرمان','جوكو سون','فيجيتا','ليلوش',
        'ايدوارد الريك','تانجيرو كامادو','نيزوكو كامادو','ديكو ميدوريا','باكوغو',
        'لايت ياغامي','ال','كاكاشي هاتاكه','سايتاما','جينوس',
        'كيليوا زولديك','غون فريكس','سبايك سبيغل','باتمان','بروس واين',
        'جوكر','سوبرمان','كلارك كنت','واندر وومن','سبايدر مان','بيتر باركر',
        'الرجل الحديدي','توني ستارك','ثور','هالك','كابتن أمريكا','دكتور سترينج',
        'شيرلوك هولمز','دكتور واتسون','هاري بوتر','رون ويزلي','هيرميون غرينجر',
        'فولدمورت','جاندالف','فرودو','ارجورن','ليجولاس','دارث فيدر','لوك سكايووكر',
        'يودا','جيمس بوند','جون ويك','نيو','فورست غامب','جاك سبارو',
        'والتر وايت','جيسي بينكمان','دون كورليوني','مايكل كورليوني',
        'توني سوبرانو','رايتشل غرين','روس غيلر','مونيكا غيلر','جوي تريبياني',
        'تشاندلر بينغ','شيلدون كوبر','هومر سيمبسون','بيتر غريفن','ستيوي غريفن',
        'ريك سانشيز','مورتي سميث','ميكي ماوس','دونالد داك','سبونج بوب',
        'باتريك النجمة','سكوبي دو','توم وجيري','بغز باني','سنو وايت','سندريلا',
        'إلسا','آنا','موانا','سيمبا','شريك','دوري','نيمو',
        'وولفرين','ديدبول','هارلي كوين','بن تن'
    ],
    'كرتون': [
        'كابتن ماجد','غرندايزر','ساسكي','عدنان ولينا','ريمي','سالي الصغيرة','بائعة الخبز الصغيرة',
        'جزيرة الكنز','المحقق كونان','يوغي أوه','بوكيمون','ديجيمون','دراغون بول','دراغون بول زد',
        'ون بيس','ناروتو','سلاحف النينجا','باور رينجرز','بن تن','سبونج بوب','توم وجيري','سكوبي دو',
        'عالم غمبول المذهل','تايتنز الصغار','فيني وفيرب','ريجولار شو','مغامرة الزمن','جرافيتي فولز',
        'السنافر','بينكي وبرين','ميكي ماوس','دونالد داك','توتلي سبايز','وينكس كلوب'
    ],
    'مشروبات': [
        'ماء','شاي','قهوة','قهوة عربية','قهوة تركية','اسبريسو','كابتشينو','لاتيه',
        'موكا','امريكانو','شاي أخضر','شاي أحمر','شاي بالنعناع','شاي بالحليب',
        'كولا','بيبسي','سفن أب','سبرايت','فانتا','مياه غازية','عصير برتقال','عصير تفاح',
        'عصير مانجو','عصير أناناس','عصير عنب','عصير رمان','عصير ليمون','عصير فراولة',
        'سموذي فواكه','ميلك شيك','حليب','حليب شوكولاتة','لبن رائب','زبادي شرب',
        'كركديه','سحلب','ليموناضة','شاي مثلج','قهوة مثلجة','فرابتشينو','ماتشا',
        'شاي كمومي','زنجبيل مغلي','مشروب طاقة','ريد بول','مونستر إنرجي',
        'كوكاكولا زيرو','بيبسي دايت','ميرندا','شاني'
    ],
    'سيارات': [
        'تويوتا كامري','تويوتا كورولا','تويوتا لاند كروزر','تويوتا هايلكس','هوندا سيفيك',
        'هوندا أكورد','نيسان التيما','نيسان باترول','هيونداي سوناتا',
        'هيونداي النترا','هيونداي توسان','كيا سيراتو','كيا سبورتاج','فورد موستنج',
        'فورد اكسبلورر','فورد F150','شفروليه كامارو','شفروليه تاهو','شفروليه سلفرادو',
        'جي ام سي يوكن','دودج تشارجر','دودج تشالنجر','مرسيدس بنز C كلاس',
        'مرسيدس بنز E كلاس','مرسيدس بنز S كلاس','مرسيدس بنز جي كلاس','بي ام دبليو الفئة الثالثة',
        'بي ام دبليو الفئة الخامسة','بي ام دبليو اكس 5','اودي A4','اودي A6','اودي Q7',
        'بورش كايين','بورش 911','فيراري 488','لامبورغيني هوراكان','لامبورغيني اوروس',
        'ماكلارين 720','استون مارتن فانتيج','بنتلي كونتيننتال','رولز رويس فانتوم',
        'رينج روفر','لاند روفر ديفندر','جيب رانجلر','جيب جراند شيروكي','لكزس ES',
        'لكزس LX','لكزس RX','مازدا 6','مازدا CX5','سوبارو فورستر',
        'ميتسوبيشي لانسر','ميتسوبيشي باجيرو','سوزوكي فيتارا',
        'فولكس فاجن جولف','فولكس فاجن باسات','فولكس فاجن تيغوان','بيجو 508',
        'ميني كوبر','تسلا موديل S','تسلا موديل 3','تسلا موديل X','تسلا موديل Y',
        'فولفو XC90','جاكوار F-Pace','مازيراتي غيبلي',
        'تويوتا راف 4','نيسان اكس تريل','كيا كرنفال','هيونداي باليساد',
        'تويوتا يارس','نيسان مورانو','هيونداي كريتا','كيا بيكانتو',
        'مرسيدس بنز A كلاس','اودي A3','بورش ماكان'
    ],
    'خضار': [
    'طماطم','خيار','بصل','ثوم','جزر','بطاطس','بطاطا حلوة',
    'فلفل حلو','فلفل حار','باذنجان','كوسا','قرنبيط','بروكلي',
    'ملفوف','فجل','سبانخ','جرجير','بقدونس','كزبرة',
    'نعناع','بامية','فاصوليا خضراء','بازلاء','ذرة','قرع','يقطين',
    'شمندر','كرفس','فطر','بصل أخضر','كراث','سلق',
    'خس','بطاطا','فلفل أخضر','فلفل أحمر','فلفل أصفر',
    'فاصوليا','لوبيا','ملوخية','ورق عنب','زنجبيل',
    'قرع أخضر','فاصوليا بيضاء','عدس','حمص','فول سوداني'
],
    'الجاسوس': [
        'طائرة','بنك','شاطئ','كازينو','كاتدرائية','خيمة سيرك','حفلة شركة','سفارة',
        'مستشفى','فندق','قاعدة عسكرية','استوديو أفلام','باخرة سياحية','قطار ركاب',
        'سفينة قراصنة','محطة قطبية','مركز شرطة','مطعم','مدرسة','محطة وقود','محطة فضائية',
        'غواصة','سوبر ماركت','مسرح','جامعة','مدينة ملاهي','متحف فني','مصنع حلويات',
        'مقبرة','منجم فحم','منتجع صحي','ملعب هوكي جليد','سجن','نادي جاز',
        'مكتبة','ملهى ليلي','منصة نفط','دار أوبرا','حلبة سباق','دار مسنين','حفلة روك',
        'حافلة سياحية','ملعب رياضي','مترو أنفاق','حفل زفاف','حديقة حيوان','حوض أسماك',
        'مخبز','مسرح باليه','مزرعة','مخيم غابة','معرض ألعاب فيديو',
        'ملعب غولف','نادي رياضي','ميناء','روضة أطفال','منارة','مسجد','كنيسة','معبد',
        'منتجع جبلي','متحف','قصر','حديقة عامة','مرصد فلكي','صيدلية','هرم',
        'محمية طبيعية','منتجع تزلج','بورصة الأسهم','مخيم صيفي','حمام سباحة',
        'استوديو تلفزيون','منتزه مائي','محمية حياة برية',
        'صالة ألعاب','معرض فني','صالة بولينج',
        'محطة حافلات','مقهى','معرض سيارات','كرنفال','قلعة','كهف','سينما',
        'موقع بناء','محكمة','عيادة أسنان','مخيم صحراوي','مصنع','عرض أزياء',
        'محطة إطفاء','قارب صيد','محل زهور','ملعب كرة قدم','محطة بنزين','صالون حلاقة',
        'محل آيس كريم','غابة استوائية','مطبخ مطعم','مختبر','مغسلة ملابس','مركز تسوق',
        'سوق شعبي','دير','متحف فنون','مهرجان موسيقي','سوق ليلي','حضانة أطفال',
        'مرصد فضائي','بستان فاكهة','مرآب سيارات',
        'محل حيوانات أليفة','مطعم بيتزا','قبة سماوية','ملعب أطفال','مكتب بريد',
        'منتجع','ضفة نهر','قارب شراعي','شاطئ رملي',
        'حافلة مدرسية','نُزل تزلج',
        'مكوك فضائي','محطة مترو','مطعم سوشي',
        'حمام سباحة عام','بيت شاي','حديقة ألعاب','محطة قطار','نفق','حرم جامعي',
        'سوق خضار','عيادة بيطرية','قرية','بركان','مستودع','برج مياه','قاعة أفراح',
        'قبو نبيذ','ورشة عمل','يخت'
    ]
}

const MIN_PLAYERS = 4
const MAX_PLAYERS = 10
const LOBBY_WAIT_MS = 5 * 60 * 1000
const TURN_TIMEOUT_MS = 2 * 60 * 1000 // ⏱️ مهلة دقيقتين لكل دور
const GUESS_TIMEOUT_MS = 60 * 1000 // ⏱️ مهلة دقيقة لتخمين الكلمة
const CORRECT_VOTE_POINTS = 100
const OUTSIDE_SURVIVE_POINTS = 100
const WORD_GUESS_POINTS = 100

// groupId -> gameState
const games = new Map()

function newScoreboard(players, existing) {
    const scores = new Map()
    players.forEach(p => scores.set(p, (existing && existing.get(p)) || 0))
    return scores
}

function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

function mentionTag(userId) {
    return `@${userId.split('@')[0]}`
}

// ---------------------------------------------------------
// إدارة مؤقّت الدور (دقيقتين) — دالة واحدة تُستخدم بكل مكان
// يبدأ فيه دور جديد، عشان ما يتكرر المنطق
// ---------------------------------------------------------
function clearTurnTimer(state) {
    if (state.pendingTimer) {
        clearTimeout(state.pendingTimer)
        state.pendingTimer = null
    }
}

function clearGuessTimer(state) {
    if (state.guessTimer) {
        clearTimeout(state.guessTimer)
        state.guessTimer = null
    }
}

async function setPendingTurn(sock, groupId, state, turn, announce = true) {
    clearTurnTimer(state)
    state.pendingTurn = turn

    if (announce) {
        await sock.sendMessage(groupId, {
            text: `🎙️ ${mentionTag(turn.asker)} اسأل ${mentionTag(turn.answerer)}\n\n(${mentionTag(turn.answerer)} جاوب بـ "نعم" أو "لا" فقط — عندك دقيقتين ⏱️)`,
            mentions: [turn.asker, turn.answerer]
        })
    }

    state.pendingTimer = setTimeout(() => {
        onTurnTimeout(sock, groupId).catch(console.log)
    }, TURN_TIMEOUT_MS)
}

// ---------------------------------------------------------
// لما تنتهي المهلة بدون رد — ننتقل تلقائياً للي بعده
// ---------------------------------------------------------
async function onTurnTimeout(sock, groupId) {
    const state = games.get(groupId)
    if (!state || !state.pendingTurn) return

    const { answerer, type } = state.pendingTurn
    state.pendingTurn = null
    state.pendingTimer = null

    await sock.sendMessage(groupId, {
        text: `⏱️ انتهت مهلة الدقيقتين ولم يجاوب ${mentionTag(answerer)}، ننتقل تلقائياً للي بعده...`,
        mentions: [answerer]
    })

    if (type === 'auto') {
        state.turnIndex++
        return announceNextAutoTurn(sock, groupId)
    }

    // نوع 'extra': خذ التالي من الطابور لو موجود، وإلا انتظر طلبات جديدة
    if (state.extraQueue.length) {
        const next = state.extraQueue.shift()
        return setPendingTurn(sock, groupId, state, { asker: next.asker, answerer: next.answerer, type: 'extra' })
    }
}

// ---------------------------------------------------------
// 2) بدء اللوبي (فتح باب الانضمام)
// ---------------------------------------------------------
async function startLobby(sock, groupId, category, starterId) {
    if (games.has(groupId)) {
        return sock.sendMessage(groupId, { text: '⚠️ فيه لعبة برا السالفة شغالة حالياً بهذا الجروب.' })
    }

    const cat = (category || '').trim()
    if (!CATEGORY_WORDS[cat]) {
        return sock.sendMessage(groupId, {
            text: `❌ الفئة غير موجودة. الفئات المتاحة:\n${Object.keys(CATEGORY_WORDS).join(' / ')}`
        })
    }

    const state = {
        phase: 'lobby',
        category: cat,
        word: null,
        players: [starterId],
        roles: new Map(),
        scores: new Map(),
        turnOrder: [],
        turnIndex: 0,
        extraQueue: [],
        pendingTurn: null,
        pendingTimer: null,
        votes: new Map(),
        outsiders: [],
        wordChoices: [],
        guesses: new Map(),
        guessTimer: null,
        lobbyTimer: null
    }

    games.set(groupId, state)

    state.lobbyTimer = setTimeout(() => {
        beginRound(sock, groupId).catch(console.log)
    }, LOBBY_WAIT_MS)

    return sock.sendMessage(groupId, {
        text: `🎭 ═══〔 لعبة برا السالفة 〕═══ 🎭

📂 الفئة: ${cat}
👥 من ${MIN_PLAYERS} إلى ${MAX_PLAYERS} لاعبين

✅ انضم بكتابة: .انضم_برا_السالفه
⏱️ اللعبة تبدأ تلقائياً بعد 5 دقايق، أو اكتب .ابدأ_الجولة إذا اكتمل العدد

المشاركين حالياً (1):
${mentionTag(starterId)}`,
        mentions: [starterId]
    })
}

// ---------------------------------------------------------
// 3) الانضمام للوبي
// ---------------------------------------------------------
async function joinLobby(sock, groupId, userId) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'lobby') {
        return sock.sendMessage(groupId, { text: '❌ ماكو لعبة برا السالفة مفتوحة للانضمام حالياً.' })
    }

    if (state.players.includes(userId)) {
        return sock.sendMessage(groupId, { text: '✅ انت مسجل بالفعل.' })
    }

    if (state.players.length >= MAX_PLAYERS) {
        return sock.sendMessage(groupId, { text: '❌ اكتمل العدد الأقصى (10 لاعبين).' })
    }

    state.players.push(userId)

    return sock.sendMessage(groupId, {
        text: `✅ ${mentionTag(userId)} انضم للعبة! (${state.players.length}/${MAX_PLAYERS})`,
        mentions: [userId]
    })
}

// ---------------------------------------------------------
// 4) بدء الجولة: اختيار الكلمة، توزيع الأدوار، إرسال الخاص
// ---------------------------------------------------------
async function beginRound(sock, groupId) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'lobby') return

    if (state.lobbyTimer) clearTimeout(state.lobbyTimer)
    state.lobbyTimer = null

    if (state.players.length < MIN_PLAYERS) {
        games.delete(groupId)
        return sock.sendMessage(groupId, {
            text: `❌ العدد ما وصل ${MIN_PLAYERS} لاعبين، تم إلغاء اللعبة.`
        })
    }

    const words = CATEGORY_WORDS[state.category]
    state.word = words[Math.floor(Math.random() * words.length)]

    const outsiderCount = state.players.length > 8 ? 2 : 1
    const shuffled = shuffle(state.players)
    state.outsiders = shuffled.slice(0, outsiderCount)

    state.roles = new Map()
    state.players.forEach(p => {
        state.roles.set(p, state.outsiders.includes(p) ? 'outside' : 'inside')
    })

    if (!state.scores.size) state.scores = newScoreboard(state.players, state.scores)
    else state.players.forEach(p => { if (!state.scores.has(p)) state.scores.set(p, 0) })

    // إرسال الأدوار بالخاص (بفاصل 4 ثواني بين كل رسالة عشان ما يتبند الرقم)
    let isFirst = true
    for (const player of state.players) {
        if (!isFirst) await new Promise(resolve => setTimeout(resolve, 4000))
        isFirst = false

        const role = state.roles.get(player)
        const text = role === 'outside'
            ? `🎭 برا السالفة!\n\nأنت "برا السالفة" 🚫 — ما تعرف الكلمة.\nفئة هذي الجولة: ${state.category}\nحاول تفهم من أسئلة وأجوبة الباقين وما تنكشف! وبعد التصويت بتحصل فرصة تخمّن الكلمة وتاخذ نقاط إضافية.`
            : `🎭 داخل السالفة ✅\n\nالفئة: ${state.category}\nالكلمة: 🔑 ${state.word}\n\nجاوب بذكاء بدون ما تفضح الكلمة لمن هو برا السالفة!`

        try {
            await sock.sendMessage(player, { text })
        } catch (err) {
            console.log('فشل إرسال الخاص لـ', player, err)
        }
    }

    state.phase = 'auto_round'
    state.turnOrder = shuffle(state.players)
    state.turnIndex = 0

    await sock.sendMessage(groupId, {
        text: `🎬 بدأت الجولة!\n\n📂 الفئة: ${state.category}\n👥 اللاعبين: ${state.players.length}\n🚫 عدد اللي برا السالفة: ${outsiderCount}\n\n📩 تم إرسال دوركم بالخاص، تأكدوا من فتح الخاص مع البوت.\n\nجاوبوا بـ "نعم" أو "لا" فقط عند دوركم، عندكم دقيقتين لكل دور ⏱️`
    })

    return announceNextAutoTurn(sock, groupId)
}

// ---------------------------------------------------------
// 5) الجولة التلقائية — يمر على كل اللاعبين زوج زوج
// ---------------------------------------------------------
async function announceNextAutoTurn(sock, groupId) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'auto_round') return

    if (state.turnIndex >= state.turnOrder.length) {
        state.phase = 'extra'
        clearTurnTimer(state)
        return sock.sendMessage(groupId, {
            text: `✅ انتهت الجولة التلقائية!\n\n💬 حد يبي يسأل شخص معين؟\nاكتب: .اريد_اسال @الشخص\n\nأو اكتب .تصويت إذا خلصتوا الأسئلة.`
        })
    }

    const asker = state.turnOrder[state.turnIndex]
    const answerer = state.turnOrder[(state.turnIndex + 1) % state.turnOrder.length]

    return setPendingTurn(sock, groupId, state, { asker, answerer, type: 'auto' })
}

// ---------------------------------------------------------
// 6) استقبال إجابة نعم/لا (تلقائي أو سؤال حر)
// ---------------------------------------------------------
async function handleAnswer(sock, groupId, senderId, text) {
    const state = games.get(groupId)
    if (!state || !state.pendingTurn) return false

    const { answerer, type } = state.pendingTurn
    if (senderId !== answerer) return false

    const clean = text.trim()
    if (clean !== 'نعم' && clean !== 'لا') return false

    clearTurnTimer(state)
    state.pendingTurn = null

    await sock.sendMessage(groupId, {
        text: `✅ ${mentionTag(answerer)} جاوب: "${clean}"`,
        mentions: [answerer]
    })

    if (type === 'auto') {
        state.turnIndex++
        await announceNextAutoTurn(sock, groupId)
        return true
    }

    // سؤال حر: خذ التالي من الطابور لو موجود
    if (state.extraQueue.length) {
        const next = state.extraQueue.shift()
        await setPendingTurn(sock, groupId, state, { asker: next.asker, answerer: next.answerer, type: 'extra' })
    }

    return true
}

// ---------------------------------------------------------
// 7) طلب سؤال شخص معين (فترة الأسئلة الحرة)
// ---------------------------------------------------------
async function requestQuestion(sock, groupId, senderId, targetId) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'extra') {
        return sock.sendMessage(groupId, { text: '❌ ماكو فترة أسئلة حرة شغالة حالياً.' })
    }

    if (!state.players.includes(senderId) || !state.players.includes(targetId)) {
        return sock.sendMessage(groupId, { text: '❌ لازم تكون أنت والشخص المطلوب من ضمن اللاعبين.' })
    }

    if (senderId === targetId) {
        return sock.sendMessage(groupId, { text: '❌ ما تقدر تسأل نفسك 😄' })
    }

    if (!state.pendingTurn) {
        return setPendingTurn(sock, groupId, state, { asker: senderId, answerer: targetId, type: 'extra' })
    }

    state.extraQueue.push({ asker: senderId, answerer: targetId })
    return sock.sendMessage(groupId, { text: `📥 تم إضافة سؤالك للطابور، دورك جاي.` })
}

// ---------------------------------------------------------
// 8) بدء التصويت
// ---------------------------------------------------------
async function startVoting(sock, groupId) {
    const state = games.get(groupId)
    if (!state || (state.phase !== 'extra' && state.phase !== 'auto_round')) {
        return sock.sendMessage(groupId, { text: '❌ ما تقدر تبدأ التصويت الآن.' })
    }

    clearTurnTimer(state)
    state.phase = 'voting'
    state.votes = new Map()
    state.pendingTurn = null

    let list = ''
    state.players.forEach((p, i) => { list += `${i + 1}- ${mentionTag(p)}\n` })

    return sock.sendMessage(groupId, {
        text: `🗳️ ═══〔 التصويت 〕═══ 🗳️\n\nمين برا السالفة برأيكم؟ صوّتوا بكتابة: .اصوت <الرقم>\n\n${list}`,
        mentions: state.players
    })
}

// ---------------------------------------------------------
// 9) تسجيل صوت — عند اكتمال الكل ننتقل لفرصة تخمين الكلمة
// ---------------------------------------------------------
async function castVote(sock, groupId, voterId, numberStr) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'voting') {
        return sock.sendMessage(groupId, { text: '❌ ماكو تصويت شغال حالياً.' })
    }

    if (!state.players.includes(voterId)) {
        return sock.sendMessage(groupId, { text: '❌ انت مو من ضمن اللاعبين.' })
    }

    const idx = parseInt(numberStr, 10) - 1
    if (isNaN(idx) || idx < 0 || idx >= state.players.length) {
        return sock.sendMessage(groupId, { text: '❌ رقم غير صحيح.' })
    }

    if (state.players[idx] === voterId) {
        return sock.sendMessage(groupId, { text: '❌ ما تقدر تصوّت على نفسك 😄' })
    }

    state.votes.set(voterId, state.players[idx])

    await sock.sendMessage(groupId, { text: `✅ تم تسجيل صوتك (${state.votes.size}/${state.players.length})` })

    if (state.votes.size >= state.players.length) {
        return startWordGuess(sock, groupId)
    }
}

// ---------------------------------------------------------
// 10) فرصة أخيرة: اللي "برا السالفة" يخمّن الكلمة من 5 خيارات
// تُستدعى بعد اكتمال التصويت، وقبل ما تُرسل النتيجة النهائية
// ---------------------------------------------------------
async function startWordGuess(sock, groupId) {
    const state = games.get(groupId)
    if (!state) return

    state.phase = 'guessing'
    state.guesses = new Map()

    const pool = CATEGORY_WORDS[state.category]
    const others = shuffle(pool.filter(w => w !== state.word)).slice(0, 4)
    state.wordChoices = shuffle([state.word, ...others])

    let list = ''
    state.wordChoices.forEach((w, i) => { list += `${i + 1}- ${w}\n` })

    const mentionsText = state.outsiders.map(o => mentionTag(o)).join(' ')

    await sock.sendMessage(groupId, {
        text: `🧩 ═══〔 فرصة أخيرة! 〕═══ 🧩\n\n${mentionsText} 👋 هذي فرصتكم تاخذون نقاط إضافية!\nخمّنوا الكلمة الصحيحة من القائمة:\n\n${list}\nاكتبوا: .اختار <الرقم>\n\n⏱️ عندكم دقيقة واحدة، وبعدها تظهر النتيجة تلقائياً.`,
        mentions: state.outsiders
    })

    clearGuessTimer(state)
    state.guessTimer = setTimeout(() => {
        finalizeRound(sock, groupId).catch(console.log)
    }, GUESS_TIMEOUT_MS)
}

// ---------------------------------------------------------
// 11) استقبال تخمين اللي "برا السالفة"
// ---------------------------------------------------------
async function submitGuess(sock, groupId, senderId, numberStr) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'guessing') {
        return sock.sendMessage(groupId, { text: '❌ ماكو فرصة تخمين شغالة حالياً.' })
    }

    if (!state.outsiders.includes(senderId)) {
        return sock.sendMessage(groupId, { text: '❌ هذا الأمر خاص باللي كانوا "برا السالفة" بس.' })
    }

    if (state.guesses.has(senderId)) {
        return sock.sendMessage(groupId, { text: '✅ انت خمّنت بالفعل، استنى النتيجة.' })
    }

    const idx = parseInt(numberStr, 10) - 1
    if (isNaN(idx) || idx < 0 || idx >= state.wordChoices.length) {
        return sock.sendMessage(groupId, { text: '❌ رقم غير صحيح.' })
    }

    state.guesses.set(senderId, state.wordChoices[idx])

    await sock.sendMessage(groupId, { text: `✅ تم تسجيل اختيارك (${state.guesses.size}/${state.outsiders.length})` })

    if (state.guesses.size >= state.outsiders.length) {
        clearGuessTimer(state)
        return finalizeRound(sock, groupId)
    }
}

// ---------------------------------------------------------
// 12) كشف النتيجة النهائية وتوزيع النقاط (أصوات + تخمين الكلمة)
// ---------------------------------------------------------
async function finalizeRound(sock, groupId) {
    const state = games.get(groupId)
    if (!state) return

    clearGuessTimer(state)

    const tally = new Map()
    for (const target of state.votes.values()) {
        tally.set(target, (tally.get(target) || 0) + 1)
    }

    let resultText = `🎭 ═══〔 النتيجة 〕═══ 🎭\n\n🔑 الكلمة كانت: ${state.word}\n🚫 اللي كانوا برا السالفة:\n`
    state.outsiders.forEach(o => { resultText += `${mentionTag(o)}\n` })
    resultText += '\n📊 توزيع الأصوات:\n'

    for (const [target, count] of tally.entries()) {
        resultText += `${mentionTag(target)} → ${count} صوت\n`
    }

    resultText += '\n🧩 محاولة تخمين الكلمة:\n'
    state.outsiders.forEach(o => {
        const guess = state.guesses.get(o)
        if (!guess) {
            resultText += `${mentionTag(o)} ⌛ ما خمّن بالوقت\n`
        } else if (guess === state.word) {
            resultText += `${mentionTag(o)} ✅ خمّن صح (${guess})\n`
        } else {
            resultText += `${mentionTag(o)} ❌ خمّن غلط (${guess})\n`
        }
    })

    resultText += '\n🏆 النقاط:\n'

    for (const [voter, target] of state.votes.entries()) {
        if (state.outsiders.includes(target)) {
            state.scores.set(voter, (state.scores.get(voter) || 0) + CORRECT_VOTE_POINTS)
            resultText += `${mentionTag(voter)} ✅ تصويت صحيح +${CORRECT_VOTE_POINTS}\n`
        }
    }

    state.outsiders.forEach(o => {
        const votesAgainst = tally.get(o) || 0
        const majority = votesAgainst > state.players.length / 2

        if (!majority) {
            state.scores.set(o, (state.scores.get(o) || 0) + OUTSIDE_SURVIVE_POINTS)
            resultText += `${mentionTag(o)} 🎭 نجا! +${OUTSIDE_SURVIVE_POINTS}\n`
        }

        const guess = state.guesses.get(o)
        if (guess && guess === state.word) {
            // ✅ كل من خمّن صح ياخذ النقاط، مو بس أول واحد
            state.scores.set(o, (state.scores.get(o) || 0) + WORD_GUESS_POINTS)
            resultText += `${mentionTag(o)} 🧩 خمّن الكلمة! +${WORD_GUESS_POINTS}\n`
        }
    })

    state.phase = 'round_over'

    await sock.sendMessage(groupId, {
        text: resultText,
        mentions: state.players
    })

    return sock.sendMessage(groupId, {
        text: `➡️ لبدء جولة جديدة اكتب: .جولة_برا_السالفه <الفئة>\nالفئات المتاحة: ${Object.keys(CATEGORY_WORDS).join(' / ')}\n\nأو لإنهاء اللعبة: .انهي_برا_السالفه`
    })
}

// ---------------------------------------------------------
// 13) جولة جديدة بنفس اللاعبين والنقاط
// ---------------------------------------------------------
async function nextRound(sock, groupId, category) {
    const state = games.get(groupId)
    if (!state || state.phase !== 'round_over') {
        return sock.sendMessage(groupId, { text: '❌ ما تقدر تبدأ جولة جديدة الآن.' })
    }

    const cat = (category || '').trim()
    if (!CATEGORY_WORDS[cat]) {
        return sock.sendMessage(groupId, {
            text: `❌ الفئة غير موجودة. الفئات المتاحة:\n${Object.keys(CATEGORY_WORDS).join(' / ')}`
        })
    }

    clearTurnTimer(state)
    clearGuessTimer(state)

    state.category = cat
    state.word = null
    state.turnOrder = []
    state.turnIndex = 0
    state.extraQueue = []
    state.pendingTurn = null
    state.votes = new Map()
    state.outsiders = []
    state.wordChoices = []
    state.guesses = new Map()
    state.phase = 'lobby' // نبدأ الجولة مباشرة بنفس اللاعبين المسجلين

    return beginRound(sock, groupId)
}

// ---------------------------------------------------------
// 14) إنهاء اللعبة والترتيب النهائي (تعادل = أكثر من فائز)
// ---------------------------------------------------------
async function endGame(sock, groupId) {
    const state = games.get(groupId)
    if (!state) {
        return sock.sendMessage(groupId, { text: '❌ ماكو لعبة شغالة حالياً.' })
    }

    clearTurnTimer(state)
    clearGuessTimer(state)
    if (state.lobbyTimer) clearTimeout(state.lobbyTimer)

    const ranking = [...state.scores.entries()].sort((a, b) => b[1] - a[1])
    const maxScore = ranking.length ? ranking[0][1] : 0
    const winners = ranking
        .filter(([, score]) => score === maxScore && maxScore > 0)
        .map(([player]) => player)

    let text = `🏁 ═══〔 نهاية لعبة برا السالفة 〕═══ 🏁\n\n`

    ranking.forEach(([player, score], i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎖️'
        text += `${medal} ${mentionTag(player)} — ${score} نقطة\n`
    })

    if (winners.length === 1) {
        text += `\n👑 الفائز: ${mentionTag(winners[0])}`
    } else if (winners.length > 1) {
        // 🏆 لو أكثر من شخص متعادلين بأعلى نقاط، الكل يُعتبر فائز
        text += `\n👑 تعادل! الفائزون: ${winners.map(mentionTag).join('، ')}`
    }

    games.delete(groupId)

    return sock.sendMessage(groupId, {
        text,
        mentions: state.players
    })
}

// ---------------------------------------------------------
// 15) نقطة الدخول الموحدة — استدعيها من index.js لكل رسالة
// ترجع true إذا استهلكت الرسالة (توقف باقي الأوامر)
// ---------------------------------------------------------
async function handleMessage(sock, msg, groupId, senderId, text, mentionedJids = []) {
    if (text.startsWith('.لعبة_برا_السالفه ')) {
        const category = text.replace('.لعبة_برا_السالفه', '').trim()
        await startLobby(sock, groupId, category, senderId)
        return true
    }

    if (text === '.انضم_برا_السالفه') {
        await joinLobby(sock, groupId, senderId)
        return true
    }

    if (text === '.ابدأ_الجولة') {
        await beginRound(sock, groupId)
        return true
    }

    if (text.startsWith('.اريد_اسال')) {
        const target = mentionedJids[0]
        if (!target) {
            await sock.sendMessage(groupId, { text: '❌ لازم تمنشن الشخص اللي تبي تسأله.' })
            return true
        }
        await requestQuestion(sock, groupId, senderId, target)
        return true
    }

    if (text === '.تصويت') {
        await startVoting(sock, groupId)
        return true
    }

    if (text.startsWith('.اصوت ')) {
        const num = text.split(' ')[1]
        await castVote(sock, groupId, senderId, num)
        return true
    }

    if (text.startsWith('.اختار ')) {
        const num = text.split(' ')[1]
        await submitGuess(sock, groupId, senderId, num)
        return true
    }

    if (text.startsWith('.جولة_برا_السالفه')) {
        const category = text.replace('.جولة_برا_السالفه', '').trim()
        await nextRound(sock, groupId, category)
        return true
    }

    if (text === '.انهي_برا_السالفه') {
        await endGame(sock, groupId)
        return true
    }

    // إجابات نعم/لا أثناء الأدوار (تلقائي أو حر)
    if (games.has(groupId)) {
        const consumed = await handleAnswer(sock, groupId, senderId, text)
        if (consumed) return true
    }

    return false
}

module.exports = {
    handleMessage
}
