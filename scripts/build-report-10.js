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
const clientManagerTsx = read("src/components/pwa/PWAClientManager.tsx");
const swWorkerJs = read("public/sw.js");
const redirectsTxt = read("public/_redirects");
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

### 7) إصلاح ثغرة إغلاق المودال قبل تسجيل التوكن (Mandatory Notification Modal Bug):
- **المشكلة السابقة:** كان المودال يقوم بحفظ \`youssef_permissions_confirmed = "true"\` في \`localStorage\` بمجرد أن يكون الإذن \`granted\`، حتى لو فشلت دالة \`enableNotifications\` في استخراج أو تسجيل الـ FCM Token في Firestore (بسبب بطء تحميل الـ uid، أو عدم إدخال الـ VAPID Key، أو مشاكل الاتصال). وكان المودال يختفي للأبد والمستخدم لا يعلم سبب عدم وصول الإشعارات في الخلفية.
- **الحل المطبق:**
  1. اشتراط وجود \`userProfile?.uid\` قبل محاولة التفعيل، وإظهار تنبيه توجيهي باللغة العربية: \`"استنى ثواني لحد ما الحساب يتحمّل وحاول تاني"\`.
  2. عدم حفظ تأكيد الأذونات في \`localStorage\` إطلاقاً إلا إذا رجعت دالة التسجيل بنجاح (\`notifResult === true\` أو \`res.ok === true\`).
  3. ربط زر "التحقق اليدوي" باستدعاء \`enableNotifications(userProfile.uid)\` للتأكد من وجود الـ Token في Firestore وتنبيه المستخدم عند أي فشل للإنترنت.

### 8) فصل مسارات إشعارات المكالمات والرسائل في Service Worker:
- **المشكلة السابقة:** كان زر "رفض" في إشعار المكالمة يقوم فقط بإغلاق الإشعار محلياً (\`event.notification.close()\`) دون تحديث حالة المكالمة في Firestore، فكان المتصل يظل يرن دون أن يعلم أن الطرف الآخر رفض. كما كان السيرفيس وركر يرسل \`OPEN_CHAT\` ويضع \`callId\` كبديل للـ \`chatId\`، مما يجعل مستمع النقر يفتح شات برقم المكالمة بالخطأ!
- **الحل المطبق:**
  1. إزالة زر "رفض" الوهمي من إشعار المكالمة، وجعل الزر الأساسي \`فتح المكالمة 📞\` يوجه مباشرة إلى صفحة المكالمات \`/calls\`.
  2. إرسال حدث \`OPEN_CALL\` للمكالمات بدلاً من \`OPEN_CHAT\`، وتحديث دالة \`listenNotificationClicks\` لتدعم مسار المكالمات \`onOpenCall\` بشكل مستقل تماماً.

### 9) المزامنة والتحديث الصامت المستمر للتوكن (\`PWAClientManager\`):
- تم حقن \`useAuth()\` داخل [\`PWAClientManager.tsx\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/pwa/PWAClientManager.tsx) في الـ Root Layout:
  1. يقوم تلقائياً باستدعاء \`refreshToken(userProfile.uid)\` بشكل صامت فور تحميل الحساب إذا كان إذن الإشعارات مفعلاً مسبقاً، لمواجهة تدوير التوكنات (Token Rotation) التي تجريها جوجل كل فترة.
  2. يستمع عالمياً لأحداث النقر على الإشعارات ويوجه لـ \`/chat/\${chatId}\` أو \`/calls\`.

### 10) تفادي خطأ 404 عند النقر على الإشعار والتطبيق مغلق (SPA Static Export):
- لأن التطبيق مبني بـ Next.js مع \`output: 'export'\`، فإن صفحات الشات المتغيرة مثل \`/chat/<id>\` لا يتم توليد ملف HTML ثابت لكل معرف منها عند البناء.
- لتفادي ظهور صفحة 404 عند تشغيل التطبيق من إشعار سحابي عبر \`clients.openWindow('/chat/<id>')\`:
  - تم إنشاء ملف [\`public/_redirects\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/_redirects):
    \`\`\`text
    /chat/* /chat/direct.html 200
    /* /index.html 200
    \`\`\`
  - يدعم هذا الملف مع إعداد \`"not_found_handling": "single-page-application"\` في \`wrangler.jsonc\` توجيه أي رابط لشات مغلق مباشرة لـ \`/chat/direct.html\` بكود 200، حيث يقرأ كود \`ChatClient\` المعرف من \`window.location.pathname\` ويفتح المحادثة المطلوبة فوراً.

### 11) إصلاح أخطاء الصياغة في \`public/sw.js\` وتوافق الرنين:
- تم تصحيح القوس غير المغلق في \`event.waitUntil\` داخل مستمع \`notificationclick\` في [\`public/sw.js\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/sw.js).
- تم ضبط خيار \`renotify: isCall\` في \`dispatchAppNotification\` حتى لا يصدر المتصفح رنيناً مزدوجاً عند وصول إشعار الدفع السحابي والإشعار المحلي معاً لنفس الرسالة.

### 12) تدقيق الأمان والخصوصية (SignOut & Blocked Users):
- تم التحقق من أن دالة \`signOut()\` في [\`auth.ts\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/firebase/auth.ts) تستدعي دائماً \`await disableNotifications(currentUid)\` قبل تسجيل الخروج لمسح التوكن من وثيقة المستخدم وإلغائه من Firebase Messaging، لحماية خصوصية المستخدمين ومنع وصول إشعارات المستخدم السابق للجهاز بعد تسجيل الخروج.
- تم التحقق من مطابقة اسم حقل المستخدمين المحظورين في الـ Cloud Function \`blockedUsers\` مع اسم الحقل المستخدم في استدعاءات \`blockUser\` في الواجهة، وإضافة حظر إشعارات المكالمات الواردة أيضاً في حال كان المتصل ضمن قائمة الحظر.

---

## 8. ☁️ كود الـ Cloud Functions المحدث لإرسال الإشعارات عند إغلاق التطبيق

لضمان وصول الإشعارات والمكالمات في الخلفية حتى عندما يكون التطبيق مقفولاً تماماً أو الهاتف في وضع السكون، هذا هو كود الـ Cloud Functions المحدث بالكامل:

**الملف:** [\`functions/src/index.ts\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/functions/src/index.ts)
\`\`\`typescript
\${functionsIndexTs}
\`\`\`

---

## 9. 📱 كود إدارة PWA والسيرفيس وركر وإعادة التوجيه (PWA Client & Routing)

### 1) ملف المدير العام للـ PWA والتحديث الصامت للتوكنات:
**الملف:** [\`src/components/pwa/PWAClientManager.tsx\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/pwa/PWAClientManager.tsx)
\`\`\`typescript
\${clientManagerTsx}
\`\`\`

### 2) ملف السيرفيس وركر الأساسي للتطبيق PWA:
**الملف:** [\`public/sw.js\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/sw.js)
\`\`\`javascript
\${swWorkerJs}
\`\`\`

### 3) ملف إعادة التوجيه لضمان فتح الشات من الإشعارات دون 404:
**الملف:** [\`public/_redirects\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/_redirects)
\`\`\`text
\${redirectsTxt}
\`\`\`

---

## 10. 🎯 خطوات تفعيل واختبار الإشعارات السحابية في بيئة الإنتاج:

1. **نشر الدوال والتحقق من الـ Region:**
   \`\`\`bash
   firebase deploy --only functions
   \`\`\`
   > **ملاحظة هامة:** إذا ظهر خطأ في الـ region أثناء الرفع، افتح Firebase Console ← Firestore Database ← إعدادات الموقع، وتأكد أن المتغير \`REGION\` في [\`functions/src/index.ts\`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/functions/src/index.ts) يطابق موقع قاعدة البيانات (مثلاً \`europe-west1\` لقواعد \`eur3\` أو \`us-central1\` لقواعد \`nam5\`).

2. **شهادة Web Push (VAPID Key):**
   - استخراج المفتاح العام من: Firebase Console ← Project Settings ← Cloud Messaging ← Web Push certificates.
   - وضعه في ملف \`.env.local\` كـ \`NEXT_PUBLIC_FIREBASE_VAPID_KEY=...\` وفي متغيرات البيئة بـ Cloudflare Pages.

3. **قواعد أمان Firestore:**
   - تم التحقق من أنها تسمح للمستخدم بتحديث التفضيلات \`notificationPreferences\` وتوكنات \`fcmTokens\`:
     \`\`\`javascript
     match /users/{userId} {
       allow read: if true;
       allow write: if request.auth != null;

       match /fcmTokens/{token} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
     \`\`\`

4. **طريقة الاختبار الحقيقي على الهاتف:**
   - بعد تفعيل الإشعارات، افتح Firestore Console وتأكد من إنشاء وثيقة للتوكن داخل:
     \`users/{uid}/fcmTokens/<token>\`
   - قم بإغلاق التطبيق تماماً (Swiping it away) وقفل شاشة الهاتف.
   - أرسل رسالة من هاتف أو حساب آخر.
   - ستصل الرسالة كإشعار دفع سحابي حتى مع إغلاق التطبيق، وبمجرد النقر عليها سيفتح التطبيق ويوجهك مباشرة لصفحة المحادثة!
`;

fs.writeFileSync(path.join(root, "report/10_NOTIFICATIONS_CALLS_MOBILE_FIXES.md"), content, "utf8");
console.log("Successfully rebuilt report/10_NOTIFICATIONS_CALLS_MOBILE_FIXES.md with authentic source code!");
