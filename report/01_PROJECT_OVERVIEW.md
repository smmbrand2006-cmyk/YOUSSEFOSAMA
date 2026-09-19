# 🌟 نظرة عامة شاملة على مشروع Youssef App (Project Overview)

مرحباً بك في التقرير الشامل لمشروع **Youssef App**؛ منصة المحادثات الفورية المتطورة المستوحاة من أفضل معايير تطبيق **WhatsApp Web & Mobile**، مبنية بأحدث تقنيات الويب العالمية مع معمارية سحابية قائمة على **Google Firebase** و **Next.js 15**.

---

## 🎯 1. أهداف المشروع ورؤيته (Project Vision)

تم تصميم وبناء التطبيق لتقديم تجربة تواصل متكاملة، فائقة السرعة، وآمنة بنسبة 100%، تجمع بين:
1. **المراسلة اللحظية في نفس الثانية (Real-time Instant Messaging)**:
   - وصول الرسائل بصفر تأخير عبر بروتوكول استماع Firestore اللحظي (`onSnapshot`).
   - دعم التحديث التفاؤلي الفوري (Optimistic UI Updates) لتظهر الرسالة فور ضغط زر الإرسال.
2. **الاتصال الصوتي والمرئي عالي الدقة (Peer-to-Peer WebRTC Audio/Video Calls)**:
   - مكالمات مباشرة ومجانية بين المستخدمين بجودة صوت وفيديو نقية مع إشارات سريعة عبر Firestore.
3. **تصميم متجاوب ذكي مزدوج (Adaptive Desktop & Mobile Experience)**:
   - **وضع سطح المكتب والمحاكي (Workstation Desktop)**: تجربة WhatsApp Web احترافية مع شريط جانبي للأيقونات (Icon Rail بعرض 70px)، هيدر علوي (56px)، وتقسيم شاشة بنسبة 46% للمحادثات، مع خلفية نقوش واتساب الداكنة الأصلية.
   - **وضع الموبايل (WhatsApp Mobile Layout)**: هيدر ثلاثي الطبقات (3-Tier Header بارتفاع h-44)، شريط فلاتر المحادثات، صف الدعم والمؤرشفة، صفوف محادثات بقطر 52px، زر عائم سفلي (FAB)، وشريط تنقل سفلي زجاجي خماسي الأقسام (`MobileBottomNav`).
4. **الدعم الفني المباشر والفوري (#123)**:
   - حساب دعم فني رسمي مدمج يعمل 24/7 ومثبت في أعلى قائمة المحادثات لخدمة جميع المستخدمين دون الحاجة لفتح تذاكر أو انتظار.
5. **نظام أكواد المستخدمين الفريدة (Unique User Codes)**:
   - تسجيل دخول وإنشاء حساب بدون شروط معقدة، حيث يحصل كل مستخدم على كود تعريفي فريد (مثل `#654321`) يتيح للآخرين العثور عليه ومحادثته مباشرة.
6. **الخصوصية التامة ونظام الحظر (Block & Privacy System)**:
   - إمكانية استعراض البروفايل لأي مستخدم مع خيار الحظر/إلغاء الحظر بنقرة واحدة، لمنع الرسائل والاتصالات غير المرغوبة.

---

## 🚀 2. أهم الميزات الوظيفية (Core Features)

| الميزة | الوصف الفني |
| :--- | :--- |
| **المراسلة الفورية** | إرسال نصوص، إيموجي، وسائط وصور مشفرة Base64، مع مؤشرات القراءة (صح مزدوج أخضر `done_all`). |
| **المكالمات الحية** | مكالمات صوت وفيديو عبر WebRTC مع واجهة منبثقة كاملة للرد، الرفض، كتم الصوت، والتحكم بالكاميرا. |
| **مؤشرات الكتابة والاتصال** | إظهار حالة "متصل الآن 🟢" وتوقيت آخر ظهور، وعبارة "يكتب الآن..." عبر Firebase Realtime Database. |
| **التوافق التام مع الأجهزة** | تبديل سلس وتلقائي بين واجهة سطح المكتب وواجهة الموبايل حسب حجم الشاشة. |
| **تثبيت المسارات (Point Zero)** | فتح وإعادة تحميل نظيف على مسار `/chat` لمنع أخطاء 404 أو حلقات إعادة التحميل (Reload Loops) على السيرفرات الثابتة. |
| **البحث الفوري المباشر** | بحث بالاسم أو كود المستخدم (#Code) مع إمكانية بدء المحادثة بنقرة واحدة. |
| **التخزين والمزامنة السحابية** | حفظ كافة الرسائل والبيانات بشكل مشفر ومؤمن داخل قواعد بيانات Google Firebase. |

---

## 📑 3. فهرس ملفات التقرير (Documentation Index)

للاطلاع على كافة تفاصيل المشروع الهندسية والبرمجية، تم تقسيم التوثيق في هذا المجلد (`report/`) على النحو التالي:

- **[01_PROJECT_OVERVIEW.md](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/report/01_PROJECT_OVERVIEW.md)**: هذه النظرة العامة والمميزات الأساسية.
- **[02_TECH_STACK_AND_LIBS.md](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/report/02_TECH_STACK_AND_LIBS.md)**: جدول التقنيات والمكتبات المستخدمة ودور كل واحدة.
- **[03_SYSTEM_ARCHITECTURE.md](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/report/03_SYSTEM_ARCHITECTURE.md)**: المعمارية الهندسية ومخططات تدفق البيانات (Data Flow Diagrams).
- **[04_FILE_STRUCTURE_AND_EXPLANATION.md](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/report/04_FILE_STRUCTURE_AND_EXPLANATION.md)**: شجرة ملفات المشروع بالكامل مع شرح دقيق لمحتوى ووظيفة كل ملف.
- **[05_DATABASE_AND_FIREBASE.md](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/report/05_DATABASE_AND_FIREBASE.md)**: هيكل قواعد البيانات (Collections, Subcollections, Fields, Rules).
- **[06_UI_UX_AND_RESPONSIVE_DESIGN.md](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/report/06_UI_UX_AND_RESPONSIVE_DESIGN.md)**: نظام التصميم، لوحة الألوان، ووضع الديسك توب والموبايل.
- **[07_DEPLOYMENT_AND_SCRIPTS.md](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/report/07_DEPLOYMENT_AND_SCRIPTS.md)**: إرشادات التشغيل المحلي، البناء الثابت، النشر على السيرفرات، وسكربتات المزامنة.
