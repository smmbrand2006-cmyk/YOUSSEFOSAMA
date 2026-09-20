const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const notificationsTs = read("src/lib/notifications.ts");
const swJs = read("public/firebase-messaging-sw.js");
const pwaNotifsTs = read("src/lib/utils/pwaNotifications.ts");
const modalTsx = read("src/components/chat/NotificationSettingsModal.tsx");
const promptTsx = read("src/components/NotificationPrompt.tsx");
const mandatoryModalTsx = read("src/components/pwa/MandatoryNotificationModal.tsx");
const functionsIndexTs = read("functions/src/index.ts");

const content = `# 🔔 التقرير العاشر: إعدادات الإشعارات الشاملة، إصلاحات الميكروفون، مكالمات WebRTC، وهندسة واجهة الموبايل

يغطي هذا التقرير التحديثات الهندسية والإصلاحات الجذرية التي تم تطبيقها، مع **عرض كامل ومفصل لجميع الأكواد والملفات البرمجية المستخدمة في ميزة ونظام الإشعارات والتنبيهات** في تطبيق Youssef App.

---

## 1. ⚡ إصلاح ارتداد المحادثة لأسفل القائمة عند إرسال رسالة

### تحليل المشكلة:
عند إرسال رسالة في أي محادثة، يقوم المتصفح بتنفيذ كتابة متفائلة (Optimistic write) في Firestore عبر \`serverTimestamp()\`. قبل أن يؤكد سيرفر Google Firestore العملية (خلال 200 إلى 400 مللي ثانية)، كان الحقل \`lastMessage.createdAt\` يرجع كقيمة غير معرفة أو \`null\`، مما كان يجعل وقت آخر رسالة يُحسب كـ \`0\`. وبناءً على ذلك، كان الشات يهبط لحظياً إلى أسفل قائمة المحادثات، وبمجرد وصول تأكيد السيرفر بالوقت الحقيقي كان يرتد سريعاً إلى قمة القائمة.

### الحل المطبق:
1. **تقدير التايمستامب المحلي**: تفعيل خيار \`{ serverTimestamps: 'estimate' }\` في استدعاء \`d.data()\` داخل دالة \`listenToChats\` في [\`firestore.ts\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/firebase/firestore.ts).
2. **التايمستامب اللحظي للعميل**: إضافة حقل \`clientTimestamp: Date.now()\` داخل كائن \`lastMessage\` ووثيقة الرسالة عند استدعاء \`sendMessage\`.
3. **دالة فرز ذكية ومحمية**: دالة \`getChatLastActivityTime(chat)\` تتحقق بالتسلسل من \`clientTimestamp\`، توقيت السيرفر بالمللي ثانية، الثواني، أو كائن \`Date\`. وإذا كانت هناك رسالة حديثة لم تستقر بعد، تعتبر وقتها اللحظة الحالية فوراً، مما يضمن ثبات الشات في أعلى القائمة بنسبة 100% دون أي اهتزاز أو ارتداد.

---

## 2. 🎙️ حل مشكلة صلاحية الميكروفون على الهواتف وتطبيق PWA

### تحليل المشكلة:
عند تنزيل وتثبيت التطبيق على الهواتف أو استخدام متصفحات Chrome وSafari، كان نظام التشغيل يرفض طلب الميكروفون أو يظهر للمستخدم "مفيش سماح من موبايل"؛ وذلك بسبب محاولة طلب إذن الميكروفون والكاميرا والإشعارات في نفس اللحظة بالتزامن في مودال التشغيل، وهو ما تقوم المتصفحات الحديثة بحظره تلقائياً لحماية الخصوصية.

### الحل المطبق:
1. **فصل طلب الأذونات تسلسلياً**: في [\`MandatoryNotificationModal.tsx\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/pwa/MandatoryNotificationModal.tsx)، يتم طلب الإشعارات أولاً مع تسجيل توكن FCM فوراً، ثم طلب الميكروفون بشكل مستقل دون تضارب مع واجهة النظام.
2. **قيود صوتية مرنة للموبايل**: في [\`ChatClient.tsx\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/app/chat/[chatId]/ChatClient.tsx)، يتم طلب الميكروفون بقيود متقدمة:
   \`\`\`typescript
   { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }
   \`\`\`
   مع مسار بديل آمن \`{ audio: true }\` ليتوافق مع أجهزة أندرويد وiOS بكافة إصداراتها.
3. **دليل إرشادي عربي تفاعلي**: في حال كان الإذن محظوراً سابقاً، يتم عرض تنبيه توجيهي واضح ومفصل باللغة العربية يوضح للمستخدم كيفية فك الحظر عبر النقر على رمز القفل 🔒 بجوار الرابط أو الدخول لإعدادات التطبيق والسماح للميكروفون، مع زر لإعادة التحقق فوراً.

---

## 3. 📞 ضمان سماع الطرفين لبعضهما في المكالمات (WebRTC Audio Guarantees)

### تحليل المشكلة:
في بعض المكالمات، كان أحد الطرفين يشتكي من عدم سماع الآخر لثلاثة أسباب رئيسية:
- تأخر ربط مستمع الصوت البعيد \`ontrack\` في Callee بعد تعيين الـ SDP.
- حظر المتصفحات على الموبايل لتشغيل الصوت التلقائي (Autoplay Policy).
- توليد مسار صوتي صامت افتراضي عند غياب إذن الميكروفون دون تنبيه المستخدم.

### الحل المطبق:
1. **الربط الفوري للمسارات**: في [\`webrtc.ts\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/firebase/webrtc.ts)، تم تمرير رد نداء \`onRemoteStream\` مباشرة لكل من \`createCall\` و \`answerCall\` لربط مستمع \`peerConnection.ontrack\` فور إنشاء الـ PeerConnection وقبل أي معالجة للـ SDP.
2. **تأكيد تشغيل المسارات الصوتية**: ضبط \`track.enabled = true\` صراحة على جميع مسارات الصوت المحلية والبعيدة.
3. **تخطي حظر الصوت التلقائي (Autoplay Unlock)**: في [\`CallOverlay.tsx\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/calls/CallOverlay.tsx)، إذا منع المتصفح تشغيل الصوت تلقائياً، يظهر شريط تنبيه واضح ويتم تشغيل الصوت واستئناف الـ AudioContext تلقائياً مع أول لمسة للمستخدم على شاشة المكالمة.
4. **مؤشرات تفاعل صوتي حية (Live Speaking Indicators)**:
   - استخدام Web Audio API (\`AnalyserNode\`) لقياس مستوى الصوت الفعلي لحظة بلحظة.
   - إشارة ضوئية خضراء تومض مع موجات صوتية ("أنت تتحدث 🎙️") تؤكد للمستخدم أن ميكروفونه يلتقط صوته ويرسله.
   - إشارة زرقاء تومض عند تحدث الطرف الآخر ("الطرف الآخر يتحدث 🔊") لتأكيد وصول واستلام الصوت.
   - تحذير أحمر فوري إذا كان ميكروفون أحد الطرفين غير نشط أو صامتاً.

---

## 4. 📱 ضبط أبعاد الموبايل ومنع تداخل النصوص في الهيدر

### تحليل المشكلة:
على الهواتف ذات الشاشات الصغيرة (320px إلى 400px)، كان اسم المستخدم وحالته يتداخلان وينزلان فوق بعضهما في هيدر الشات الداخلي بسبب قلة المساحة وضخامة الـ padding ووجود أزرار المكالمات.

### الحل المطبق:
في [\`chat.module.css\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/styles/chat.module.css):
1. **مرونة الحاويات**: إعطاء \`.chatTopProfile\` و \`.chatTopInfo\` خاصية \`flex: 1; min-width: 0; overflow: hidden;\`.
2. **قص النصوص الطويلة تلقائياً**: تطبيق \`white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\` على كل من \`.chatTopName\` و \`.chatTopStatus\`.
3. **تنسيقات مخصصة للشاشات الصغيرة**:
   - تقليص الـ padding في الهيدر إلى \`10px\` على الموبايل و \`6px\` على الشاشات تحت \`380px\`.
   - ضبط أحجام أزرار الاتصال وإخفاء الفواصل غير الضرورية على الموبايل لتوفير أقصى مساحة ممكنة لاسم جهة الاتصال.
   - إخفاء بانرات الإشعار العائمة عند فتح شاشة المحادثة المباشرة لتفادي إزاحة الهيدر لأسفل.

---

## 5. 🏛️ تعديل الهوية الرسمية: استبدال "Chats" بـ "YOUSSEF APP"

- تم استيراد خطوط جوجل الهندسية الرسمية (\`Space Grotesk\` و \`Outfit\`) داخل [\`src/app/layout.tsx\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/app/layout.tsx).
- تم تغيير الكلمة في الهيدر العلوي لشريط الموبايل وقائمة الديسكتوب في [\`ChatSidebar.tsx\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/chat/ChatSidebar.tsx) إلى:
   \`\`\`html
   <span className={styles.brandTitleText}>YOUSSEF APP</span>
   \`\`\`
- تم تصميم الفونت بخصائص رسمية صارمة: زوايا عمودية هندسية، تباعد أحرف متناسق (\`letter-spacing: 0.08em; font-weight: 800; text-transform: uppercase;\`) مع تدرج معدني عالي التباين.
- تحديث تسمية التبويب في الموبايل إلى "الرسائل" داخل [\`MobileBottomNav.tsx\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/chat/MobileBottomNav.tsx).

---

## 6. 📜 الأكواد الفعلية الكاملة لنظام الإشعارات من الملفات المصدرية

فيما يلي الأكواد البرمجية الحية والمحدثة بالكامل التي تشغل ميزة ونظام الإشعارات في المشروع:

### أ) محرك إشعارات Firebase Cloud Messaging (FCM)
**الملف:** [\`src/lib/notifications.ts\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/notifications.ts)
\`\`\`typescript
${notificationsTs}
\`\`\`

---

### ب) سيرفيس وركر إشعارات الخلفية (Background Messaging Service Worker)
**الملف:** [\`public/firebase-messaging-sw.js\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/firebase-messaging-sw.js)
\`\`\`javascript
${swJs}
\`\`\`

---

### ج) أداة توليد نغمة التنبيه الصوتية وتجربة الإشعارات (Chime & Dispatcher)
**الملف:** [\`src/lib/utils/pwaNotifications.ts\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/utils/pwaNotifications.ts)
\`\`\`typescript
${pwaNotifsTs}
\`\`\`

---

### د) المكون التفاعلي: نافذة إعدادات الإشعارات الشاملة (Firestore Sync + Resync + Safe Disable)
**الملف:** [\`src/components/chat/NotificationSettingsModal.tsx\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/chat/NotificationSettingsModal.tsx)
\`\`\`tsx
${modalTsx}
\`\`\`

---

### هـ) مكوّن بانر طلب الإشعارات العائم (Notification Prompt Banner)
**الملف:** [\`src/components/NotificationPrompt.tsx\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/NotificationPrompt.tsx)
\`\`\`tsx
${promptTsx}
\`\`\`

---

### و) نافذة التشغيل الإلزامية للأذونات (Mandatory Permission Modal)
**الملف:** [\`src/components/pwa/MandatoryNotificationModal.tsx\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/pwa/MandatoryNotificationModal.tsx)
\`\`\`tsx
${mandatoryModalTsx}
\`\`\`

---

### ز) ربط واستقبال إشعارات الرسائل والمكالمات في الوقت الفعلي مع حجب الشفرة
**في سياق المحادثات [\`src/lib/contexts/ChatContext.tsx\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/contexts/ChatContext.tsx):**
\`\`\`typescript
// رصد وصول رسائل جديدة أثناء خفاء النافذة أو في محادثة أخرى وتشغيل النغمة والإشعار
if (hasNewMessage) {
  const isWindowHidden = typeof document !== "undefined" && document.hidden;
  const isDifferentChat = activeChatRef.current?.id !== chat.id;

  if (isWindowHidden || isDifferentChat) {
    const senderName =
      chat.participantNames?.[chat.lastMessage?.senderId || ""] ||
      (chat.type === "direct" ? "رسالة جديدة 💬" : (chat.name || "رسالة جديدة 💬"));
    const rawText = chat.lastMessage?.text || "أرسل لك رسالة جديدة";
    const messageText = rawText.startsWith("🔒#YF:") ? "🔒 رسالة جديدة" : rawText;

    // تشغيل نغمة الصوت (باحترام تفضيل المستخدم لكتم الصوت)
    playNotificationChime();

    // إرسال الإشعار لمركز إشعارات النظام بتطابق الـ tag ومنع التكرار
    dispatchAppNotification({
      title: \`\${senderName} 💬\`,
      body: messageText,
      tag: \`chat-\${chat.id}\`,
      url: \`/chat/\${chat.id}\`,
    });
  }
}
\`\`\`

**في سياق المكالمات [\`src/lib/contexts/CallContext.tsx\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/contexts/CallContext.tsx):**
\`\`\`typescript
// الاستماع لطلبات المكالمات الواردة وتشغيل الرنين والتنبيه اللحظي
const unsub = listenForIncomingCalls(userProfile.uid, (call) => {
  if (!isCallActive) {
    setIncomingCall(call);
    if (call) {
      playNotificationChime();
      dispatchAppNotification({
        title: "مكالمة واردة 📞",
        body: \`مكالمة \${call.type === "video" ? "فيديو" : "صوتية"} من \${call.callerName || "مستخدم"}\`,
        tag: \`call-\${call.id}\`,
        url: "/calls",
      });
    }
  }
});
\`\`\`

---

## 7. 🛡️ المعالجة الجذرية للثغرات الدقيقة (Backend Push & Silent Failure Fixes)

بناءً على الفحص المعماري الدقيق لبيئة تشغيل PWA وسيرفيس وركر الخلفية على الهواتف، تم تطبيق التحسينات الهندسية التالية:

### 1) حل الفشل الصامت في \`dispatchAppNotification\`:
- **سبب المشكلة السابقة:** كانت الدالة ترسل \`postMessage\` لـ \`navigator.serviceWorker.controller\`. لكن سيرفيس وركر FCM مسجل على نطاق مخصص (\`/firebase-cloud-messaging-push-scope\`)، مما يجعله ليس الـ controller للمجال العام. وكان الاستدعاء يرجع مبكراً قبل الوصول للـ fallback. كما أن الـ fallback باستخدام \`new Notification()\` يرمي خطأ \`TypeError: Illegal constructor\` على نظام أندرويد وChrome للموبايل.
- **الحل الجذري المطبق:** 
  1. الاستعلام المباشر عن تسجيل الـ SW بنطاق FCM المخصص عبر \`navigator.serviceWorker.getRegistration(SW_SCOPE)\` ثم \`reg.showNotification(title, notifOptions)\`.
  2. إضافة مستمع لرسائل \`message\` داخل [\`public/firebase-messaging-sw.js\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/firebase-messaging-sw.js) لدعم \`SHOW_NOTIFICATION\`.
  3. حماية محتوى الإشعار من إظهار التشفير: إذا بدأ النص بـ \`🔒#YF:\` يتم تحويله تلقائياً إلى \`🔒 رسالة جديدة\`.

### 2) القضاء على الإشعارات المكررة بتوحيد الـ Tags:
- تم توحيد وسوم الإشعار بين الواجهة الأمامية، السيرفيس وركر، والـ Cloud Function:
  - للرسائل: \`chat-\${chatId}\` (استبدال \`msg-\${chat.id}\`)
  - للمكالمات: \`call-\${callId}\` و \`call-\${d.callId || d.chatId}\`
- هذا يضمن أنه حتى لو استقبل الهاتف إشعار الدفع السحابي (Push) وتزامن معه استماع Firestore المحلي في نفس اللحظة، سيقوم نظام التشغيل باستبدال الإشعار بنفس التاج تلقائياً دون أي تكرار مزعج.

### 3) حفظ تفضيلات الإشعارات في السيرفر وقراءتها في الـ Cloud Function:
- تم ربط مفاتيح التبديل في [\`NotificationSettingsModal.tsx\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/chat/NotificationSettingsModal.tsx) لتقوم بتحديث وثيقة المستخدم \`users/{uid}\` بالحقل \`notificationPreferences\`، بالإضافة إلى \`localStorage\`.
- تم تحديث دوال \`playNotificationChime\` و \`dispatchAppNotification\` لاحترام إعدادات كتم الصوت أو حظر الرسائل أو المعاينة محلياً.
- تقوم الـ Cloud Function في السيرفر بقراءة \`notificationPreferences\`:
  - إذا عطل المستخدم تنبيهات الرسائل (\`messages: false\`)، يتم تخطي الإرسال سحابياً.
  - إذا عطل المعاينة (\`preview: false\`)، يتم إرسال النص العام المجهل "رسالة جديدة 💬" بدلاً من نص الرسالة.
  - إذا عطل المكالمات (\`calls: false\`)، يتم تخطي رنين المكالمات السحابي.

### 4) تصحيح سلوك زر "إعادة المزامنة":
- الزر كان يستدعي \`disableNotifications\` سابقاً عند كون الإذن \`granted\`، مما كان يعطل إشعارات المستخدم بالخطأ!
- تم تصحيحه ليستدعي \`enableNotifications(uid)\` ويعيد تسجيل وتحديث التوكن، مع إضافة زر منفصل أحمر خاص لإيقاف الإشعارات.

### 5) معالجة سقف حمولة FCM (4KB Limit) ومنع فشل إرسال Base64 Photos:
- تم إضافة دالة \`getSafeIcon\` داخل الـ Cloud Functions للتأكد من أن صورة المستخدم المرسلة في الـ Push تبدأ بـ \`https://\` فقط، وتجنب وضع صور Base64 الطويلة التي تتجاوز سقف 4096 بايت المسموح به في Firebase FCM.

### 6) منع تخزين الـ Service Worker في كاش المتصفح:
- تم إنشاء ملف [\`public/_headers\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/_headers) لإجبار خوادم Cloudflare Pages على إرسال ترويسة \`Cache-Control: no-cache, no-store, must-revalidate\` لملفات السيرفيس وركر، مما يضمن تحديثها فورياً على جميع الهواتف.

---

## 8. ☁️ كود الـ Cloud Functions المحدث لإرسال الإشعارات عند إغلاق التطبيق

لكي تصل الإشعارات والمكالمات في الخلفية حتى عندما يكون التطبيق مقفولاً تماماً أو الهاتف في وضع السكون، هذا هو كود الـ Cloud Functions المحدث بالكامل:

**الملف:** [\`functions/src/index.ts\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/functions/src/index.ts)
\`\`\`typescript
${functionsIndexTs}
\`\`\`

### خطوات تفعيل واختبار الإشعارات السحابية في بيئة الإنتاج:
1. **نشر الدوال:**
   \`\`\`bash
   firebase deploy --only functions
   \`\`\`
   *(يتطلب ترقية مشروع Firebase لخطة Blaze المجانية حتى حدود الاستخدام).*
2. **شهادة Web Push (VAPID Key):**
   - استخراج المفتاح العام من: Firebase Console ← Project Settings ← Cloud Messaging ← Web Push certificates.
   - وضعه في ملف \`.env.local\` كـ \`NEXT_PUBLIC_FIREBASE_VAPID_KEY=...\` وفي إعدادات متغيرات البيئة في Cloudflare Pages قبل بناء المشروع.
3. **قواعد أمان Firestore:**
   - تسمح للمستخدم بتحديث تفضيلاته وتوكنات FCM الخاصة به تحت:
     \`match /users/{userId}/fcmTokens/{token} { allow read, write: if request.auth.uid == userId; }\`
4. **طريقة الاختبار الحقيقي على الهاتف:**
   - تأكد من وجود توكن مسجل في Firestore تحت \`users/{uid}/fcmTokens\`.
   - قم بإغلاق التطبيق تماماً وقفل شاشة الهاتف.
   - أرسل رسالة أو ابدأ مكالمة من حساب آخر.
   - ستصل الرسالة أو رنين المكالمة عبر إشعار الدفع السحابي بنجاح.
`;

fs.writeFileSync(path.join(root, "report/10_NOTIFICATIONS_CALLS_MOBILE_FIXES.md"), content, "utf8");
console.log("Successfully rebuilt report/10_NOTIFICATIONS_CALLS_MOBILE_FIXES.md with authentic source code!");
