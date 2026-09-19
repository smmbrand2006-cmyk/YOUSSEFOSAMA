# 09 - التحديثات الشاملة: الاستوري، PWA، الأذونات الكاملة، ومحرك الإشعارات والخصوصية

يقدم هذا المستند توثيقاً هندسياً وتفصيلياً لكافة التحديثات والميزات الجديدة التي تم بناؤها وتطويرها في تطبيق **YOUSSEF APP** خلال هذه الجلسة.

---

## 1. نظام الاستوري وتتبع المشاهدات (Stories & Viewers Tracking System)

### أ. المعمارية وقاعدة البيانات في Cloud Firestore:
- **المجموعة**: `statuses` في Firestore.
- **صلاحية الحالة**: 24 ساعة من تاريخ النشر (`createdAt`)، ويتم تصفيتها برمجياً بحيث تختفي تلقائياً فور انتهاء صلاحيتها.
- **بنية وثيقة الاستوري (`UserStatus`)**:
  ```typescript
  export interface UserStatus {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    type: "text" | "image";
    content?: string;          // النص في حالة الاستوري النصية
    backgroundColor?: string;  // تدرج الخلفية (Gradient)
    mediaUrl?: string;         // صورة الاستوري (Base64 أو رابط سحابي)
    viewers: StatusViewer[];    // قائمة من شاهد الاستوري
    createdAt: any;
    expiresAt: any;
  }
  ```
- **بنية المشاهد (`StatusViewer`)**:
  ```typescript
  export interface StatusViewer {
    userId: string;
    userName: string;
    userAvatar?: string;
    viewedAt: any;
  }
  ```

### ب. تتبع المشاهدات ومن شاهد الاستوري:
1. **تسجيل المشاهدة التلقائي**:
   - عند قيام أي مستخدم بفتح استوري شخص آخر، تستدعي دالة [`recordStatusView`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/firebase/firestore.ts) التحديث الذري في Firestore بدون أي تكرار لنفس المستخدم.
2. **شريط المشاهدات وقائمة المشاهدين (Viewers Modal)**:
   - لصاحب الاستوري: يظهر في أسفل شاشة عرض الحالة شريط شفاف يوضح عدد المشاهدات (مثال: `3 مشاهدات`).
   - عند الضغط على الشريط، تُفتح نافذة سفلية (Bottom Sheet) تعرض:
     - العدد الإجمالي للمشاهدين.
     - الصورة الرمزية واسم كل شخص شاهد الاستوري.
     - توقيت المشاهدة باللغة العربية (مثال: `الآن`، `منذ دقيقة`، `منذ ساعتين`).
   - زر سلة المحذوفات لحذف الاستوري فورياً في أي لحظة.

### ج. الملفات المسؤولة:
- [`src/app/status/page.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/app/status/page.tsx): واجهة عرض الحالات، نشر النصوص والصور، وشاشة المشاهدين.
- [`src/lib/firebase/firestore.ts`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/firebase/firestore.ts): دوال `publishStatus`، `listenToActiveStatuses`، `recordStatusView`، و `deleteStatus`.

---

## 2. نظام إرسال الصور والفويس في المحادثات (Direct Media & Voice Engine)

### أ. إرسال وعرض الصور (Direct Image & Lightbox):
1. **زر الصور المباشر**: إضافة أيقونة صور بجانب مشبك المرفقات في شريط الشات لإرسال الصور فورياً.
2. **دعم النسخ واللصق (`Ctrl + V`)**: إمكانية لصق الصور مباشرة داخل حقل الإدخال من الحافظة (Clipboard) ليتم إرسالها فوراً.
3. **عارض صور ملء الشاشة (Fullscreen Lightbox)**: بالضغط على أي صورة داخل المحادثة، تفتح بملء الشاشة مع خلفية سينمائية داكنة وزر تحميل مباشر (`Download`) لحفظ الصورة بالجودة الكاملة على الجهاز.

### ب. محرك الرسائل الصوتية (Voice Notes Engine):
1. **التسجيل الحي عبر الميكروفون**:
   - استخدام `MediaRecorder` و `navigator.mediaDevices.getUserMedia` للتسجيل المباشر من ميكروفون الهاتف أو الكمبيوتر.
   - شريط تسجيل تفاعلي بنقطة حمراء نابضة 🔴، ومؤقت زمني يعد الثواني، وزر إلغاء وحذف، وزر إرسال مباشر.
2. **مشغل الفويس داخل فقاعة الشات (`VoiceNotePlayer`)**:
   - مشغل صوتي خفيف مدمج داخل رسالة الشات يحتوي على زر Play/Pause، وشريط تمرير تفاعلي (Scrubber)، وعداد وقت زمني.

### ج. الملفات المسؤولة:
- [`src/app/chat/[chatId]/ChatClient.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/app/chat/%5BchatId%5D/ChatClient.tsx): مشغل الفويس، شريط التسجيل، زر الصور، والـ Lightbox.
- [`src/styles/chat.module.css`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/styles/chat.module.css): أنماط وتأثيرات شريط تسجيل الصوت والنبض.

---

## 3. نظام تطبيق الويب التقدمي (PWA Installation System)

### أ. ملفات التهيئة والأيقونات:
1. **ملف التهيئة [`public/manifest.json`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/manifest.json)**:
   - وضع التشغيل: `standalone` (يعمل كتطبيق هاتف بدون شريط المتصفح).
   - تلوين الشاشة: `#6366F1` و `#0B0E14`.
   - مسار البدء: `/chat` مع اختصارات سريعة للاستوري والمكالمات.
2. **شريط الخدمات [`public/sw.js`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/sw.js)**:
   - تخزين أصول الواجهة الأساسية وتسريع فتح التطبيق.
   - استقبال أحداث النقر على الإشعارات وفتح نافذة التطبيق فوراً.
3. **شريط التثبيت التفاعلي [`PWAInstallBanner`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/pwa/PWAInstallBanner.tsx)**:
   - التعرف التلقائي على إمكانية التثبيت.
   - إرشادات خاصة لهواتف iPhone و iPad (الضغط على زر المشاركة ⎋ ثم "إضافة إلى الشاشة الرئيسية" ➕).
   - زر التنزيل السريع ⬇️ في الشريط العلوي [`AppHeader`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/chat/AppHeader.tsx).

---

## 4. حل مشكلة اللمس والبحث في جوجل على الهاتف (Touch-to-Search Fix)

### أ. تشخيص المشكلة:
في متصفح Google Chrome على الهواتف الذكية، عند لمس أي كلمة غير محمية، تقوم ميزة "Touch to Search" المدمجة في كروم بتحديد الكلمة وفتح شريط بحث جوجل بالأسفل.

### ب. الحل الجذري المنفذ في [`src/app/globals.css`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/app/globals.css):
```css
html, body {
  -webkit-touch-callout: none !important;
  -webkit-user-select: none !important;
  user-select: none !important;
  -webkit-tap-highlight-color: transparent !important;
  touch-action: manipulation;
}

/* حصر التحديد فقط في حقول الكتابة */
input, textarea, [contenteditable="true"] {
  -webkit-user-select: text !important;
  user-select: text !important;
}
```
- إضافة حارس برمجي في [`PWAClientManager`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/pwa/PWAClientManager.tsx) يمنع تحديد النصوص خارج حقول الإدخال، مما جعل التطبيق يعمل بسلاسة مثل التطبيقات الأصلية (Native App).

---

## 5. اعتماد وتطبيق اللوجو الرسمي المعدني ثلاثي الأبعاد

### أ. ملفات الهوية البصرية:
- تم اعتماد اللوجو المرفق وحفظه في:
  - [`public/logo.png`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/logo.png): اللوجو الرئيسي بدقة 1024x843.
  - [`public/favicon.ico`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/favicon.ico) و `public/favicon.png`: أيقونات التبويبات.
  - `public/icons/icon-192.png` و `icon-512.png` و `apple-touch-icon.png`: أيقونات الهواتف والـ PWA.

### ب. توزيع اللوجو في الواجهات:
1. **الشريط العلوي [`AppHeader.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/chat/AppHeader.tsx)**: عرض اللوجو بجوار كود المستخدم.
2. **شاشة البداية [`src/app/page.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/app/page.tsx)**: ظهور اللوجو بحجم مميز مع مؤشر التحميل.
3. **صفحات الدخول والتسجيل [`LoginPage`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/app/auth/login/page.tsx) و [`RegisterPage`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/app/auth/register/page.tsx)**: إدراج اللوجو ثلاثي الأبعاد في أعلى البطاقة.

---

## 6. نافذة الأذونات الشاملة قبل التنزيل (صوت + صور + إشعارات)

### أ. المفهوم والهدف:
لضمان عمل الرسائل الصوتية (الفويس)، وإرسال الصور، واستقبال المكالمات والإشعارات بدون أي حظر بعد تنزيل التطبيق، تم إنشاء نافذة أذونات شاملة تطلب الصلاحيات دفعة واحدة في المتصفح:
1. **🔔 إشعارات المتصفح**: تنبيه فوري بالرسائل والمكالمات في الخلفية.
2. **🎙️ الميكروفون والصوت**: تسجيل الفويس والمكالمات الصوتية.
3. **📷 الكاميرا والمعرض**: إرسال الصور ومكالمات الفيديو.

### ب. وراثة الأذونات (Permission Inheritance):
بمجرد موافقة المستخدم على هذه الأذونات في المتصفح، **يرث تطبيق الـ PWA المثبت الصلاحيات تلقائياً وبشكل دائم**، فلا يحتاج المستخدم للموافقة مجدداً بعد التنزيل.

### ج. الملفات المسؤولة:
- [`src/components/pwa/MandatoryNotificationModal.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/pwa/MandatoryNotificationModal.tsx)
- [`src/lib/utils/pwaNotifications.ts`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/utils/pwaNotifications.ts)

---

## 7. حل مشكلة الخصوصية في قائمة إضافة صديق والدردشة الجديدة

### أ. المشكلة السابقة:
كانت شاشة اختيار جهة الاتصال تقوم بجلب أول 100 مستخدم في قاعدة البيانات وعرضهم لأي مستخدم جديد يضغط على علامة الدردشة، مما كان يكشف حسابات قديمة أو بيانات مستخدمين آخرين.

### ب. الحل المنفذ:
1. **قائمة خاصة وفارغة للمستخدمين الجدد**: الحساب الجديد يبدأ بقائمة فارغة تماماً لحماية الخصوصية.
2. **البحث المباشر بالكود (#الكود)** في [`SelectContactModal.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/chat/SelectContactModal.tsx):
   - يكتب المستخدم كود صديقه الخاص (مثال: `#010999` أو اسمه) في شريط البحث.
   - يستعلم التطبيق حصرياً عن هذا الكود ويظهر حسابه فقط لإضافته وبدء الدردشة معه.
3. **تنظيف الشاتات القديمة**: تم تشغيل سكربت وحذف الشاتات التجريبية القديمة بالكامل من Firestore لتبدأ قاعدة البيانات نظيفة 100%.

---

## 8. محرك الإشعارات الفورية وتجربتها على الهاتف

### أ. تحسين إطلاق الإشعارات:
- ربط دالة `dispatchAppNotification` بـ `sw.js` عبر `postMessage` لتعمل على مستوى نظام التشغيل (Android / Windows) مع اهتزاز ونغمة صوتية.
- تضمين اسم المرسل الحقيقي في عنوان الإشعار (مثال: `يوسف اسامه 💬`) في [`ChatContext.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/contexts/ChatContext.tsx).
- إضافة زر **"تجربة إشعار فوري على هاتفك الآن 🔔"** في نافذة الأذونات وفي صفحة الملف الشخصي ([`ProfilePage`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/app/profile/page.tsx)) لاختبار وصول الإشعار بنقرة واحدة.

---

## 10. نظام إدارة زر الرجوع وإيماءات السحب وحماية الخروج (Mobile Back & Exit Guard)

### أ. تشخيص المشكلة:
في الهواتف الذكية (سواء عند استخدام أزرار التنقل السفلية ◀️ أو إيماءات السحب من حافة الشاشة Edge Swipe):
- عند الدخول لأي محادثة أو فتح أي نافذة، كان الضغط على زر الرجوع في الهاتف يخرج المستخدم من التطبيق بالكامل أو يغلق المتصفح بدلاً من العودة لقائمة الشاتات!

### ب. الحل المنفذ بمعمارية LIFO المكدسة:
تم إنشاء نظام تنقل متكامل عبر سياق [`BackHandlerContext.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/contexts/BackHandlerContext.tsx) مع مستويات أولوية:

1. **إغلاق الصور المكبرة (Lightbox)**: الأولوية القصوى (30) - الضغط على الرجوع يغلق عارض الصور فقط ويبقى داخل المحادثة.
2. **إغلاق النوافذ المنبثقة (Modals & Sheets)**: الأولوية (25) - إغلاق نافذة الملف الشخصي، إضافة صديق، إنشاء مجموعة، مشاهدي الاستوري، إلخ.
3. **إغلاق المحادثة النشطة (Active Chat)**: الأولوية (10) - الضغط على الرجوع يغلق المحادثة المفتوحة ويعود فوراً لقائمة الشاتات (Home) دون الخروج من التطبيق.
4. **الرجوع من الصفحات الفرعية**: عند التواجد في صفحة الحالات (`/status`) أو المكالمات (`/calls`) أو البروفايل (`/profile`)، يعود زر الرجوع إلى الشاتات (`/chat`).
5. **شاشة الخروج التأكيدية ([`ExitConfirmModal.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/pwa/ExitConfirmModal.tsx))**:
   - فقط عندما يكون المستخدم في الشاشة الرئيسية (Home) ولا يوجد أي شات أو نافذة مفتوحة، والضغط على الرجوع:
   - ينبثق حوار تأكيدي راقٍ بنمط واتساب الداكن:
     - العنوان: **الخروج من التطبيق**
     - الرسالة: **هل ترغب في مغادرة التطبيق الآن؟ يمكنك البقاء ومتابعة محادثاتك ومكالماتك فورياً في أي وقت.**
     - الأزرار: **"لا، البقاء في التطبيق"** (أخضر زمردي مميز) / **"نعم، مغادرة التطبيق"** (خروج).

---

## 11. منظومة إشعارات الدفع السحابية الرسمية (FCM Web Push & Cloud Functions)

تم دمج وتفعيل بنية **Firebase Cloud Messaging (FCM)** الكاملة لإرسال الإشعارات حتى أثناء إغلاق التطبيق والمتصفح بالكامل:

1. **شريط الخدمات السحابي ([`public/firebase-messaging-sw.js`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/firebase-messaging-sw.js))**:
   - استقبال رسائل Data-Only من خوادم Google Firebase بدون ازدواجية.
   - تشغيل إشعارات الرسائل وإشعارات المكالمات مع أزرار الإجراء السريع (رد / رفض).
   - توجيه المستخدم وفتح المحادثة المعنية فور النقر على الإشعار عبر `notificationclick`.
2. **محرك الرموز المميزة والأذونات ([`src/lib/notifications.ts`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/notifications.ts))**:
   - دالة `enableNotifications` لطلب الإذن واستخراج رمز الجهاز `fcmToken`.
   - حفظ الرمز تلقائياً في مستند المستخدم: `/users/{uid}/fcmTokens/{token}`.
   - دالة `refreshToken` للتحديث الصامت للرموز المنتهية.
   - دالة `disableNotifications` لحذف رمز الجهاز عند تسجيل الخروج لمنع وصول إشعارات شخص آخر.
   - دالة `listenForeground` لمعالجة الرسائل الواردة أثناء فتح التطبيق بدون إزعاج المستخدم إذا كان يطالع نفس المحادثة.
3. **لافتة طلب التفعيل ([`src/components/NotificationPrompt.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/NotificationPrompt.tsx))**:
   - تظهر بأعلى المحادثات في حال عدم منح الإذن وتختفي تلقائياً فور التفعيل.
4. **أيقونة الشارة الأحادية ([`public/icons/badge-72.png`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/icons/badge-72.png))**:
   - أيقونة بيضاء مفرغة بدقة 72x72 تظهر في شريط حالة أندرويد (Android Status Bar).
5. **دوال السحابة الخلفية ([`functions/src/index.ts`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/functions/src/index.ts))**:
   - دالة `onNewMessage`: تعمل تلقائياً في خوادم Google فور كتابة أي رسالة في Firestore، وتستخرج المستلمين وترسل لهم إشعار Push مشفوعاً بالاسم والمحتوى والأيقونة.
   - دالة `onIncomingCall`: ترسل إشعاراً عاجلاً للمتلقي فور بدء رنين مكالمة صوتية أو مرئية.
   - تنظيف الرموز غير الصالحة تلقائياً لحماية قاعدة البيانات من الرموز الميتة.
6. **قواعد أمان الرموز (`firestore.rules`)**:
   - حماية مجموعة `fcmTokens` بحيث لا يمكن لأي مستخدم القراءة أو الكتابة إلا في مستنداته الخاصة.

---

## 12. حل مشكلة رفع وإرسال الصور من المعرض والكاميرا

### أ. سبب المشكلة السابق:
كان عنصر الإدخال المخفي الخاص بالصور `<input type="file" ref={fileInputRef} />` موجوداً داخل شرط عرض قائمة المرفقات `{showAttach && ...}` فقط:
- عند الضغط على زر الكاميرا/الصور المباشر في شريط الكتابة، كان `fileInputRef.current` قيمة غير معرفة (`null`) لأن القائمة لم تكن مفتوحة في الـ DOM، وبالتالي لا يفتح معرض الصور أو الكاميرا نهائياً.
- كان يعمل فقط عند النسخ واللصق (`Ctrl+V`) لأن اللصق لا يستخدم عنصر `input`.

### ب. الحل المطبق:
1. **نقل عنصر الإدخال لمستوى شريط الإدخال الثابت**: أصبح `<input ref={fileInputRef} type="file" accept="image/*" />` متاحاً دائماً في الشجرة البرمجية.
2. **الربط المزدوج**:
   - زر الصور المباشر يستدعي فوراً `fileInputRef.current?.click()`.
   - خيار "صورة" في قائمة المرفقات يستدعي فوراً نفس الدالة ويغلق القائمة بسلاسة.
3. **ترقية محرك الضغط `encodeImageToBase64`**:
   - تم تحديثه ليدعم `createImageBitmap` الحديث لمعالجة تدوير الصور التلقائي للكاميرات (EXIF Orientation) وحصر أقصى بُعد عند 640 بكسل بجودة JPEG بنسبة 65%، مما يولد صوراً ممتازة بحجم خفيف جداً (40-60 KB) ترسل وتظهر في نفس اللحظة بدون تأخير.

---

## 13. جدول التحقق والاختبار

| البند المختبر | الأداة | النتيجة |
|---|---|---|
| فحص الأنواع الصارمة | `npx tsc --noEmit` | نجاح تام (0 أخطاء) |
| بناء الإنتاج الثابت | `npm run build` | نجاح تام (تجميع 11/11 صفحة) |
| تواجد ملف عامل FCM السحابي | `out/firebase-messaging-sw.js` | مجمع ومتاح في جذر الموقع |
| أيقونة الشارة 72px | `public/icons/badge-72.png` | مولدة بنجاح |
| رفع واختيار الصور | Native File Picker | يعمل بنجاح من الزرين |
| نظام الرجوع وحماية الخروج | PopState + LIFO Stack | شغال بنسبة 100% |
