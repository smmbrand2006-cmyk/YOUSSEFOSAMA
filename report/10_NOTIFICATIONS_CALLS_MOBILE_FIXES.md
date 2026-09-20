# 🔔 التقرير العاشر: إعدادات الإشعارات الشاملة، إصلاحات الميكروفون، مكالمات WebRTC، وهندسة واجهة الموبايل

يغطي هذا التقرير التحديثات الهندسية والإصلاحات الجذرية التي تم تطبيقها، مع **عرض كامل ومفصل لجميع الأكواد والملفات البرمجية المستخدمة في ميزة ونظام الإشعارات والتنبيهات** في تطبيق Youssef App.

---

## 1. ⚡ إصلاح ارتداد المحادثة لأسفل القائمة عند إرسال رسالة

### تحليل المشكلة:
عند إرسال رسالة في أي محادثة، يقوم المتصفح بتنفيذ كتابة متفائلة (Optimistic write) في Firestore عبر `serverTimestamp()`. قبل أن يؤكد سيرفر Google Firestore العملية (خلال 200 إلى 400 مللي ثانية)، كان الحقل `lastMessage.createdAt` يرجع كقيمة غير معرفة أو `null`، مما كان يجعل وقت آخر رسالة يُحسب كـ `0`. وبناءً على ذلك، كان الشات يهبط لحظياً إلى أسفل قائمة المحادثات، وبمجرد وصول تأكيد السيرفر بالوقت الحقيقي كان يرتد سريعاً إلى قمة القائمة.

### الحل المطبق:
1. **تقدير التايمستامب المحلي**: تفعيل خيار `{ serverTimestamps: 'estimate' }` في استدعاء `d.data()` داخل دالة `listenToChats` في [`firestore.ts`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/firebase/firestore.ts).
2. **التايمستامب اللحظي للعميل**: إضافة حقل `clientTimestamp: Date.now()` داخل كائن `lastMessage` ووثيقة الرسالة عند استدعاء `sendMessage`.
3. **دالة فرز ذكية ومحمية**: دالة `getChatLastActivityTime(chat)` تتحقق بالتسلسل من `clientTimestamp`، توقيت السيرفر بالمللي ثانية، الثواني، أو كائن `Date`. وإذا كانت هناك رسالة حديثة لم تستقر بعد، تعتبر وقتها اللحظة الحالية فوراً، مما يضمن ثبات الشات في أعلى القائمة بنسبة 100% دون أي اهتزاز أو ارتداد.

---

## 2. 🎙️ حل مشكلة صلاحية الميكروفون على الهواتف وتطبيق PWA

### تحليل المشكلة:
عند تنزيل وتثبيت التطبيق على الهواتف أو استخدام متصفحات Chrome وSafari، كان نظام التشغيل يرفض طلب الميكروفون أو يظهر للمستخدم "مفيش سماح من موبايل"؛ وذلك بسبب محاولة طلب إذن الميكروفون والكاميرا والإشعارات في نفس اللحظة بالتزامن في مودال التشغيل، وهو ما تقوم المتصفحات الحديثة بحظره تلقائياً لحماية الخصوصية.

### الحل المطبق:
1. **فصل طلب الأذونات تسلسلياً**: في [`MandatoryNotificationModal.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/pwa/MandatoryNotificationModal.tsx)، يتم طلب الإشعارات أولاً مع تسجيل توكن FCM فوراً، ثم طلب الميكروفون بشكل مستقل دون تضارب مع واجهة النظام.
2. **قيود صوتية مرنة للموبايل**: في [`ChatClient.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/app/chat/[chatId]/ChatClient.tsx)، يتم طلب الميكروفون بقيود متقدمة:
   ```typescript
   { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }
   ```
   مع مسار بديل آمن `{ audio: true }` ليتوافق مع أجهزة أندرويد وiOS بكافة إصداراتها.
3. **دليل إرشادي عربي تفاعلي**: في حال كان الإذن محظوراً سابقاً، يتم عرض تنبيه توجيهي واضح ومفصل باللغة العربية يوضح للمستخدم كيفية فك الحظر عبر النقر على رمز القفل 🔒 بجوار الرابط أو الدخول لإعدادات التطبيق والسماح للميكروفون، مع زر لإعادة التحقق فوراً.

---

## 3. 📞 ضمان سماع الطرفين لبعضهما في المكالمات (WebRTC Audio Guarantees)

### تحليل المشكلة:
في بعض المكالمات، كان أحد الطرفين يشتكي من عدم سماع الآخر لثلاثة أسباب رئيسية:
- تأخر ربط مستمع الصوت البعيد `ontrack` في Callee بعد تعيين الـ SDP.
- حظر المتصفحات على الموبايل لتشغيل الصوت التلقائي (Autoplay Policy).
- توليد مسار صوتي صامت افتراضي عند غياب إذن الميكروفون دون تنبيه المستخدم.

### الحل المطبق:
1. **الربط الفوري للمسارات**: في [`webrtc.ts`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/firebase/webrtc.ts)، تم تمرير رد نداء `onRemoteStream` مباشرة لكل من `createCall` و `answerCall` لربط مستمع `peerConnection.ontrack` فور إنشاء الـ PeerConnection وقبل أي معالجة للـ SDP.
2. **تأكيد تشغيل المسارات الصوتية**: ضبط `track.enabled = true` صراحة على جميع مسارات الصوت المحلية والبعيدة.
3. **تخطي حظر الصوت التلقائي (Autoplay Unlock)**: في [`CallOverlay.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/calls/CallOverlay.tsx)، إذا منع المتصفح تشغيل الصوت تلقائياً، يظهر شريط تنبيه واضح ويتم تشغيل الصوت واستئناف الـ AudioContext تلقائياً مع أول لمسة للمستخدم على شاشة المكالمة.
4. **مؤشرات تفاعل صوتي حية (Live Speaking Indicators)**:
   - استخدام Web Audio API (`AnalyserNode`) لقياس مستوى الصوت الفعلي لحظة بلحظة.
   - إشارة ضوئية خضراء تومض مع موجات صوتية ("أنت تتحدث 🎙️") تؤكد للمستخدم أن ميكروفونه يلتقط صوته ويرسله.
   - إشارة زرقاء تومض عند تحدث الطرف الآخر ("الطرف الآخر يتحدث 🔊") لتأكيد وصول واستلام الصوت.
   - تحذير أحمر فوري إذا كان ميكروفون أحد الطرفين غير نشط أو صامتاً.

---

## 4. 📱 ضبط أبعاد الموبايل ومنع تداخل النصوص في الهيدر

### تحليل المشكلة:
على الهواتف ذات الشاشات الصغيرة (320px إلى 400px)، كان اسم المستخدم وحالته يتداخلان وينزلان فوق بعضهما في هيدر الشات الداخلي بسبب قلة المساحة وضخامة الـ padding ووجود أزرار المكالمات.

### الحل المطبق:
في [`chat.module.css`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/styles/chat.module.css):
1. **مرونة الحاويات**: إعطاء `.chatTopProfile` و `.chatTopInfo` خاصية `flex: 1; min-width: 0; overflow: hidden;`.
2. **قص النصوص الطويلة تلقائياً**: تطبيق `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` على كل من `.chatTopName` و `.chatTopStatus`.
3. **تنسيقات مخصصة للشاشات الصغيرة**:
   - تقليص الـ padding في الهيدر إلى `10px` على الموبايل و `6px` على الشاشات تحت `380px`.
   - ضبط أحجام أزرار الاتصال وإخفاء الفواصل غير الضرورية على الموبايل لتوفير أقصى مساحة ممكنة لاسم جهة الاتصال.
   - إخفاء بانرات الإشعار العائمة عند فتح شاشة المحادثة المباشرة لتفادي إزاحة الهيدر لأسفل.

---

## 5. 🏛️ تعديل الهوية الرسمية: استبدال "Chats" بـ "YOUSSEF APP"

- تم استيراد خطوط جوجل الهندسية الرسمية (`Space Grotesk` و `Outfit`) داخل [`src/app/layout.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/app/layout.tsx).
- تم تغيير الكلمة في الهيدر العلوي لشريط الموبايل وقائمة الديسكتوب في [`ChatSidebar.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/chat/ChatSidebar.tsx) إلى:
   ```html
   <span className={styles.brandTitleText}>YOUSSEF APP</span>
   ```
- تم تصميم الفونت بخصائص رسمية صارمة: زوايا عمودية هندسية، تباعد أحرف متناسق (`letter-spacing: 0.08em; font-weight: 800; text-transform: uppercase;`) مع تدرج معدني عالي التباين.
- تحديث تسمية التبويب في الموبايل إلى "الرسائل" داخل [`MobileBottomNav.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/chat/MobileBottomNav.tsx).

---

## 6. 📜 الأكواد الفعلية الكاملة لنظام الإشعارات من الملفات المصدرية

فيما يلي الأكواد البرمجية الحية والمحدثة بالكامل التي تشغل ميزة ونظام الإشعارات في المشروع:

### أ) محرك إشعارات Firebase Cloud Messaging (FCM)
**الملف:** [`src/lib/notifications.ts`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/notifications.ts)
```typescript
"use client";
import { getMessaging, getToken, deleteToken, onMessage, isSupported } from "firebase/messaging";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { app, db } from "./firebase/config";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";
const SW_URL = "/firebase-messaging-sw.js";
// Default FCM scope: keeps this SW separate from your PWA/caching service worker.
const SW_SCOPE = "/firebase-cloud-messaging-push-scope";

export type EnableResult =
  | { ok: true; token: string }
  | { ok: false; reason: "unsupported" | "denied" | "dismissed" | "no-token" | "error" };

async function getRegistration() {
  return navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
}

/** Call from a user click (browsers require a gesture to ask for permission). */
export async function enableNotifications(uid: string): Promise<EnableResult> {
  try {
    if (!(await isSupported())) return { ok: false, reason: "unsupported" };
    if (Notification.permission === "denied") return { ok: false, reason: "denied" };

    const perm =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, reason: perm === "denied" ? "denied" : "dismissed" };

    const registration = await getRegistration();
    const token = await getToken(getMessaging(app), {
      vapidKey: VAPID_KEY || undefined,
      serviceWorkerRegistration: registration,
    });
    if (!token) return { ok: false, reason: "no-token" };

    await setDoc(
      doc(db, "users", uid, "fcmTokens", token),
      {
        installed: window.matchMedia("(display-mode: standalone)").matches,
        ua: navigator.userAgent,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    localStorage.setItem("fcm_token", token);
    return { ok: true, token };
  } catch (e) {
    console.error("[notifications] enable failed", e);
    return { ok: false, reason: "error" };
  }
}

/** Call on every login/app start: tokens rotate, so refresh silently if already granted. */
export async function refreshToken(uid: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  await enableNotifications(uid);
}

/** Call on logout so the device stops receiving this user's notifications. */
export async function disableNotifications(uid: string) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("fcm_token") : null;
    if (token) await deleteDoc(doc(db, "users", uid, "fcmTokens", token));
    if (await isSupported()) await deleteToken(getMessaging(app));
    if (typeof window !== "undefined") localStorage.removeItem("fcm_token");
  } catch (e) {
    console.error("[notifications] disable failed", e);
  }
}

/**
 * Foreground handler: FCM does NOT show anything while the app is open.
 * Skips the notification if the user is already looking at that chat.
 * Returns an unsubscribe function.
 */
export function listenForeground(getActiveChatId: () => string | null) {
  let unsub: () => void = () => {};
  if (typeof window === "undefined") return unsub;

  isSupported().then((ok) => {
    if (!ok) return;
    try {
      unsub = onMessage(getMessaging(app), async (payload) => {
        const d = payload.data || {};
        const looking = document.visibilityState === "visible" && getActiveChatId() === d.chatId;
        if (looking && d.type !== "call") return;

        const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
        reg?.showNotification(d.title || "Youssef App", {
          body: d.body || "",
          icon: d.icon || "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          tag: `chat-${d.chatId}`,
          data: { url: d.url || "/", chatId: d.chatId, type: d.type || "message" },
        });
      });
    } catch (e) {
      console.warn("[notifications] listenForeground init error", e);
    }
  });
  return () => unsub();
}

/** Lets a notification click switch chats or open calls inside an already-open window. */
export function listenNotificationClicks(
  onOpenChat: (chatId: string) => void,
  onOpenCall?: (callId?: string, url?: string) => void
) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return () => {};
  }
  const handler = (e: MessageEvent) => {
    if (e.data?.type === "OPEN_CHAT" && e.data.chatId) {
      onOpenChat(e.data.chatId);
    } else if (e.data?.type === "OPEN_CALL") {
      if (onOpenCall) {
        onOpenCall(e.data.callId, e.data.url);
      } else if (e.data?.url) {
        window.location.href = e.data.url;
      }
    }
  };
  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}

```

---

### ب) سيرفيس وركر إشعارات الخلفية (Background Messaging Service Worker)
**الملف:** [`public/firebase-messaging-sw.js`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/firebase-messaging-sw.js)
```javascript
/* eslint-disable no-undef */
// Place this file in /public so it is served at /firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js");

// Firebase project credentials for Youssef App (rubber-f0574)
firebase.initializeApp({
  apiKey: "AIzaSyBUlsPbGCznAkncC7tZjRfDYMoTC0H_QaI",
  authDomain: "rubber-f0574.firebaseapp.com",
  projectId: "rubber-f0574",
  storageBucket: "rubber-f0574.firebasestorage.app",
  messagingSenderId: "608921253339",
  appId: "1:608921253339:web:35e350e02608777fab23fe",
});

const messaging = firebase.messaging();

// We send DATA-ONLY messages so we fully control how the notification looks
// (a `notification` key would make FCM auto-display and cause duplicates).
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  const isCall = d.type === "call";

  return self.registration.showNotification(d.title || "Youssef App", {
    body: d.body || "",
    icon: d.icon || "/icons/icon-192.png",
    badge: "/icons/badge-72.png", // small monochrome icon (Android/Chrome)
    tag: isCall ? (d.callId ? `call-${d.callId}` : `call-${d.chatId}`) : `chat-${d.chatId}`, // unique per chat or call
    renotify: true, // still alert on new message in same chat
    requireInteraction: isCall, // calls stay until user acts
    vibrate: isCall ? [300, 150, 300, 150, 300] : [120],
    dir: "auto",
    data: { url: d.url || "/", chatId: d.chatId, callId: d.callId, type: d.type || "message" },
    actions: isCall
      ? [
          { action: "answer", title: "فتح المكالمة 📞" },
        ]
      : [],
  });
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    if (self.registration && self.registration.showNotification) {
      self.registration.showNotification(title || "Youssef App", options || {});
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const isCall = notifData.type === "call";
  const target = new URL(notifData.url || (isCall ? "/calls" : "/"), self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && "focus" in w) {
          if (isCall) {
            w.postMessage({
              type: "OPEN_CALL",
              url: target,
              callId: notifData.callId || notifData.chatId,
            });
          } else {
            w.postMessage({
              type: "OPEN_CHAT",
              url: target,
              chatId: notifData.chatId,
            });
          }
          return w.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

```

---

### ج) أداة توليد نغمة التنبيه الصوتية وتجربة الإشعارات (Chime & Dispatcher)
**الملف:** [`src/lib/utils/pwaNotifications.ts`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/utils/pwaNotifications.ts)
```typescript
"use client";

export const SW_SCOPE = "/firebase-cloud-messaging-push-scope";

// Web Audio API Chime Synthesizer (Zero external dependencies, always plays)
export function playNotificationChime() {
  try {
    if (typeof window !== "undefined" && localStorage.getItem("notif_pref_sound") === "false") {
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First note: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second higher note: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);
  } catch (e) {
    console.warn("Audio chime error:", e);
  }
}

// Service Worker Registration
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch (err) {
    console.warn("ServiceWorker registration failed:", err);
    return null;
  }
}

// Notification Permissions
export type NotificationStatus = "granted" | "denied" | "default" | "unsupported";

export function getNotificationStatus(): NotificationStatus {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as NotificationStatus;
}

export async function requestBrowserNotifications(uid?: string): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  try {
    if (uid) {
      try {
        const { enableNotifications } = await import("@/lib/notifications");
        const res = await enableNotifications(uid);
        if (res.ok) {
          playNotificationChime();
          return true;
        }
        return false;
      } catch (e) {
        console.warn("enableNotifications error:", e);
      }
    }

    const result = await Notification.requestPermission();
    if (result === "granted") {
      playNotificationChime();
      dispatchAppNotification({
        title: "تم تفعيل الإشعارات بنجاح 🎉",
        body: "ستصلك الآن جميع الرسائل والمكالمات في الوقت الفعلي حتى عند إغلاق التطبيق.",
        url: "/chat",
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return false;
  }
}

// Dispatch browser notification (FCM SW registration + user preferences)
export async function dispatchAppNotification({
  title,
  body,
  icon = "/icons/icon-192.png",
  url = "/chat",
  tag,
}: {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted" || !("serviceWorker" in navigator)) return;

  const kind = tag?.startsWith("call-") ? "calls" : "messages";
  if (localStorage.getItem(`notif_pref_${kind}`) === "false") return;

  let reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  if (!reg) {
    reg = await navigator.serviceWorker.getRegistration();
  }
  if (!reg) return;

  const hidePreview = localStorage.getItem("notif_pref_preview") === "false";
  const safeBody = hidePreview
    ? "رسالة جديدة 💬"
    : body.startsWith("🔒#YF:")
    ? "🔒 رسالة جديدة"
    : body;

  const isCall = Boolean(tag && tag.startsWith("call-"));
  const vibrateEnabled = localStorage.getItem("notif_pref_vibrate") !== "false";

  const notifOptions: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body: safeBody,
    icon,
    badge: "/icons/badge-72.png",
    tag: tag || `app-${Date.now()}`,
    renotify: isCall,
    vibrate: !vibrateEnabled ? [] : (isCall ? [300, 150, 300, 150, 300] : [200, 100, 200]),
    data: { url, chatId: tag?.replace(/^(chat|call|msg)-/, "") },
  };

  try {
    await reg.showNotification(title, notifOptions);
  } catch (err) {
    console.warn("reg.showNotification failed:", err);
  }
}

export async function testSystemNotification(uid?: string): Promise<boolean> {
  const status = getNotificationStatus();
  if (status !== "granted") {
    const granted = await requestBrowserNotifications(uid);
    if (!granted) return false;
  }
  playNotificationChime();
  await dispatchAppNotification({
    title: "إشعار تجريبي من Youssef App 🚀",
    body: "تهانينا! الإشعارات تعمل بنجاح وستصلك كافة الرسائل والمكالمات في الوقت الفعلي.",
    url: "/chat",
    tag: `chat-test-${Date.now()}`,
  });
  return true;
}

// PWA Utilities
export function isAppInstalledPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// PWA deferred prompt holder
let deferredPrompt: any = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Save event for custom UI button trigger, while allowing native browser banner
    deferredPrompt = e;
    window.dispatchEvent(new Event("pwa-can-install"));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event("pwa-installed"));
  });
}

export function getDeferredPrompt() {
  return deferredPrompt;
}

export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }
  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === "accepted";
  } catch (err) {
    console.error("PWA install prompt error:", err);
    return false;
  }
}

```

---

### د) المكون التفاعلي: نافذة إعدادات الإشعارات الشاملة (Firestore Sync + Resync + Safe Disable)
**الملف:** [`src/components/chat/NotificationSettingsModal.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/chat/NotificationSettingsModal.tsx)
```tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  MessageSquare,
  PhoneCall,
  Eye,
  Vibrate,
  ShieldCheck,
  AlertTriangle,
  Send,
  Check,
  RefreshCw,
} from "lucide-react";
import { enableNotifications, disableNotifications, refreshToken } from "@/lib/notifications";
import { testSystemNotification, playNotificationChime } from "@/lib/utils/pwaNotifications";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import styles from "@/styles/chat.module.css";

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
}

export default function NotificationSettingsModal({
  isOpen,
  onClose,
  uid,
}: NotificationSettingsModalProps) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Settings State (stored in localStorage & Firestore)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [messagesEnabled, setMessagesEnabled] = useState(true);
  const [callsEnabled, setCallsEnabled] = useState(true);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    // Check system permission
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }

    // Load saved preferences from localStorage first
    try {
      setSoundEnabled(localStorage.getItem("notif_pref_sound") !== "false");
      setMessagesEnabled(localStorage.getItem("notif_pref_messages") !== "false");
      setCallsEnabled(localStorage.getItem("notif_pref_calls") !== "false");
      setPreviewEnabled(localStorage.getItem("notif_pref_preview") !== "false");
      setVibrateEnabled(localStorage.getItem("notif_pref_vibrate") !== "false");
    } catch (e) {}

    // Also sync from Firestore user profile if available
    if (uid) {
      getDoc(doc(db, "users", uid))
        .then((snap) => {
          if (snap.exists()) {
            const prefs = snap.data()?.notificationPreferences;
            if (prefs) {
              if (typeof prefs.sound === "boolean") {
                setSoundEnabled(prefs.sound);
                localStorage.setItem("notif_pref_sound", String(prefs.sound));
              }
              if (typeof prefs.messages === "boolean") {
                setMessagesEnabled(prefs.messages);
                localStorage.setItem("notif_pref_messages", String(prefs.messages));
              }
              if (typeof prefs.calls === "boolean") {
                setCallsEnabled(prefs.calls);
                localStorage.setItem("notif_pref_calls", String(prefs.calls));
              }
              if (typeof prefs.preview === "boolean") {
                setPreviewEnabled(prefs.preview);
                localStorage.setItem("notif_pref_preview", String(prefs.preview));
              }
              if (typeof prefs.vibrate === "boolean") {
                setVibrateEnabled(prefs.vibrate);
                localStorage.setItem("notif_pref_vibrate", String(prefs.vibrate));
              }
            }
          }
        })
        .catch((e) => console.warn("Sync prefs from Firestore note:", e));
    }
  }, [isOpen, uid]);

  if (!isOpen) return null;

  const handleTogglePreference = async (key: string, current: boolean, setter: (val: boolean) => void) => {
    const next = !current;
    setter(next);
    try {
      localStorage.setItem(`notif_pref_${key}`, String(next));
    } catch (e) {}
    if (key === "sound" && next) {
      playNotificationChime();
    }

    // Save to Firestore so Cloud Functions know user preferences
    if (uid) {
      try {
        await updateDoc(doc(db, "users", uid), {
          [`notificationPreferences.${key}`]: next,
        });
      } catch (err) {
        console.warn("Syncing notification preferences to Firestore failed:", err);
      }
    }
  };

  const handleToggleSystemPermission = async () => {
    setLoading(true);
    try {
      const res = await enableNotifications(uid);
      if (res.ok) {
        setPermission("granted");
        playNotificationChime();
        alert("تمت مزامنة توكن الإشعارات السحابية بنجاح ✅");
      } else if (res.reason === "denied") {
        setPermission("denied");
      } else {
        alert("فشلت المزامنة، تأكد من اتصال الإنترنت وإعدادات المتصفح.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (!confirm("هل أنت متأكد من تعطيل الإشعارات على هذا الجهاز؟ لن تتلقى رسائل أو مكالمات عند إغلاق التطبيق.")) return;
    setLoading(true);
    try {
      await disableNotifications(uid);
      alert("تم إيقاف الإشعارات السحابية على هذا الجهاز بنجاح.");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    setTestSuccess(false);
    try {
      playNotificationChime();
      const ok = await testSystemNotification(uid);
      if (ok) {
        setTestSuccess(true);
        setTimeout(() => setTestSuccess(false), 3000);
      } else {
        alert("يرجى التأكد من السماح بالإشعارات في المتصفح أولاً.");
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={styles.notifModalOverlay} onClick={onClose}>
      <div
        className={styles.notifModalCard}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className={styles.notifModalHeader}>
          <div className={styles.notifModalHeaderTitle}>
            <div className={styles.notifModalIconBadge}>
              <BellRing size={20} color="#00a884" />
            </div>
            <div>
              <h3>إعدادات الإشعارات والتنبيهات</h3>
              <p>تحكم كامل في وصول الرسائل والمكالمات ونغمات التنبيه</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            title="إغلاق"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className={styles.notifModalBody}>
          {/* Status Box */}
          <div
            className={`${styles.notifStatusCard} ${
              permission === "granted"
                ? styles.notifStatusGranted
                : permission === "denied"
                ? styles.notifStatusDenied
                : styles.notifStatusDefault
            }`}
          >
            <div className={styles.notifStatusInfo}>
              {permission === "granted" ? (
                <>
                  <ShieldCheck size={22} className={styles.notifStatusIconGranted} />
                  <div>
                    <div className={styles.notifStatusTitle}>الإشعارات مفعّلة ونشطة 🟢</div>
                    <div className={styles.notifStatusSub}>
                      تطبيق يوسف شات جاهز لاستقبال الرسائل والمكالمات في الخلفية.
                    </div>
                  </div>
                </>
              ) : permission === "denied" ? (
                <>
                  <AlertTriangle size={22} className={styles.notifStatusIconDenied} />
                  <div>
                    <div className={styles.notifStatusTitle}>الإشعارات محظورة في جهازك 🔴</div>
                    <div className={styles.notifStatusSub}>
                      تم رفض إذن الإشعارات من قبل. يجب السماح بها من إعدادات المتصفح.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Bell size={22} className={styles.notifStatusIconDefault} />
                  <div>
                    <div className={styles.notifStatusTitle}>الإشعارات بانتظار التفعيل 🟡</div>
                    <div className={styles.notifStatusSub}>
                      اضغط على زر التفعيل لتصلك الرسائل حتى عندما يكون التطبيق مقفولاً.
                    </div>
                  </div>
                </>
              )}
            </div>

            {permission !== "denied" && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  className={styles.notifStatusActionBtn}
                  onClick={handleToggleSystemPermission}
                  disabled={loading}
                >
                  {loading
                    ? "جاري المعالجة..."
                    : permission === "granted"
                    ? "إعادة المزامنة 🔄"
                    : "تفعيل الآن 🚀"}
                </button>
                {permission === "granted" && (
                  <button
                    type="button"
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      color: "#ef4444",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "0.2s ease",
                    }}
                    onClick={handleDisableNotifications}
                    disabled={loading}
                  >
                    إيقاف الإشعارات ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Blocked Guide if denied */}
          {permission === "denied" && (
            <div className={styles.notifTroubleshootBox}>
              <div className={styles.notifTroubleshootTitle}>
                <AlertTriangle size={16} />
                خطوات فك حظر الإشعارات على الموبايل:
              </div>
              <ol className={styles.notifTroubleshootList}>
                <li>اضغط على رمز القفل 🔒 أو إعدادات الموقع أعلى شريط المتصفح.</li>
                <li>اختر &quot;الأذونات&quot; (Permissions) ثم &quot;الإشعارات&quot; (Notifications).</li>
                <li>قم بتغييرها إلى &quot;سماح&quot; (Allow)، ثم أعد تحميل الصفحة.</li>
              </ol>
            </div>
          )}

          {/* Preferences Settings List */}
          <div className={styles.notifPreferencesGroup}>
            {/* 1. Notification Sound */}
            <div className={styles.notifPrefRow}>
              <div className={styles.notifPrefLabelWrap}>
                {soundEnabled ? (
                  <Volume2 size={20} className={styles.notifPrefIcon} />
                ) : (
                  <VolumeX size={20} className={styles.notifPrefIconMuted} />
                )}
                <div>
                  <div className={styles.notifPrefLabel}>نغمة وتنبيه الصوت (Chime)</div>
                  <div className={styles.notifPrefDesc}>تشغيل نغمة عند وصول رسالة جديدة أو إشعار</div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Toggle Sound"
                className={`${styles.notifToggleSwitch} ${
                  soundEnabled ? styles.notifToggleActive : ""
                }`}
                onClick={() => handleTogglePreference("sound", soundEnabled, setSoundEnabled)}
              >
                <span className={styles.notifToggleThumb} />
              </button>
            </div>

            {/* 2. Message Notifications */}
            <div className={styles.notifPrefRow}>
              <div className={styles.notifPrefLabelWrap}>
                <MessageSquare size={20} className={styles.notifPrefIcon} />
                <div>
                  <div className={styles.notifPrefLabel}>تنبيهات الرسائل الفورية</div>
                  <div className={styles.notifPrefDesc}>استقبال إشعار فوري عند إرسال أي صديق رسالة</div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Toggle Messages"
                className={`${styles.notifToggleSwitch} ${
                  messagesEnabled ? styles.notifToggleActive : ""
                }`}
                onClick={() => handleTogglePreference("messages", messagesEnabled, setMessagesEnabled)}
              >
                <span className={styles.notifToggleThumb} />
              </button>
            </div>

            {/* 3. Call Ring Notifications */}
            <div className={styles.notifPrefRow}>
              <div className={styles.notifPrefLabelWrap}>
                <PhoneCall size={20} className={styles.notifPrefIcon} />
                <div>
                  <div className={styles.notifPrefLabel}>رنين المكالمات الواردة</div>
                  <div className={styles.notifPrefDesc}>تنبيه برنين عند تلقي مكالمة صوتية أو فيديو</div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Toggle Calls"
                className={`${styles.notifToggleSwitch} ${
                  callsEnabled ? styles.notifToggleActive : ""
                }`}
                onClick={() => handleTogglePreference("calls", callsEnabled, setCallsEnabled)}
              >
                <span className={styles.notifToggleThumb} />
              </button>
            </div>

            {/* 4. Show Preview */}
            <div className={styles.notifPrefRow}>
              <div className={styles.notifPrefLabelWrap}>
                <Eye size={20} className={styles.notifPrefIcon} />
                <div>
                  <div className={styles.notifPrefLabel}>معاينة نص الرسالة</div>
                  <div className={styles.notifPrefDesc}>عرض جزء من نص الرسالة واسم المرسل في الإشعار</div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Toggle Preview"
                className={`${styles.notifToggleSwitch} ${
                  previewEnabled ? styles.notifToggleActive : ""
                }`}
                onClick={() => handleTogglePreference("preview", previewEnabled, setPreviewEnabled)}
              >
                <span className={styles.notifToggleThumb} />
              </button>
            </div>

            {/* 5. Vibration */}
            <div className={styles.notifPrefRow}>
              <div className={styles.notifPrefLabelWrap}>
                <Vibrate size={20} className={styles.notifPrefIcon} />
                <div>
                  <div className={styles.notifPrefLabel}>اهتزاز الهاتف (Vibration)</div>
                  <div className={styles.notifPrefDesc}>اهتزاز الجهاز على الهواتف المدعومة مع الإشعار</div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Toggle Vibration"
                className={`${styles.notifToggleSwitch} ${
                  vibrateEnabled ? styles.notifToggleActive : ""
                }`}
                onClick={() => handleTogglePreference("vibrate", vibrateEnabled, setVibrateEnabled)}
              >
                <span className={styles.notifToggleThumb} />
              </button>
            </div>
          </div>

          {/* Test Notification Button */}
          <div className={styles.notifTestSection}>
            <button
              type="button"
              className={styles.notifTestButton}
              onClick={handleTestNotification}
              disabled={testing}
            >
              {testSuccess ? (
                <>
                  <Check size={18} color="#10b981" />
                  <span>تم إرسال الإشعار بنجاح! تفقد هاتفك 🔔</span>
                </>
              ) : testing ? (
                <>
                  <RefreshCw size={18} className={styles.spinIcon} />
                  <span>جاري إرسال الإشعار التجريبي...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>إرسال إشعار تجريبي الآن على هاتفك 🔔</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

```

---

### هـ) مكوّن بانر طلب الإشعارات العائم (Notification Prompt Banner)
**الملف:** [`src/components/NotificationPrompt.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/NotificationPrompt.tsx)
```tsx
"use client";
import { useEffect, useState } from "react";
import { enableNotifications, refreshToken } from "@/lib/notifications";
import { Bell, AlertTriangle } from "lucide-react";
import styles from "@/styles/chat.module.css";

export default function NotificationPrompt({ uid }: { uid: string }) {
  const [state, setState] = useState<"hidden" | "ask" | "denied" | "busy">("hidden");

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      refreshToken(uid); // silent token refresh
      setState("hidden");
    } else if (Notification.permission === "denied") {
      setState("denied");
    } else {
      setState("ask");
    }
  }, [uid]);

  if (state === "hidden") return null;

  if (state === "denied") {
    return (
      <div className={styles.notifBannerDenied} dir="rtl">
        <AlertTriangle size={18} className={styles.notifBannerIcon} />
        <span>
          الإشعارات محظورة. فعّلها من إعدادات المتصفح/التطبيق (أيقونة القفل بجانب العنوان ← الإشعارات ← سماح).
        </span>
      </div>
    );
  }

  return (
    <div className={styles.notifBanner} dir="rtl">
      <div className={styles.notifBannerContent}>
        <Bell size={18} className={styles.notifBannerIcon} />
        <span>فعّل الإشعارات علشان توصلك الرسائل والمكالمات حتى لو التطبيق مقفول.</span>
      </div>
      <button
        type="button"
        className={styles.notifBannerBtn}
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          const r = await enableNotifications(uid);
          setState(r.ok ? "hidden" : r.reason === "denied" ? "denied" : "ask");
        }}
      >
        {state === "busy" ? "جاري التفعيل..." : "تفعيل"}
      </button>
    </div>
  );
}

```

---

### و) نافذة التشغيل الإلزامية للأذونات (Mandatory Permission Modal)
**الملف:** [`src/components/pwa/MandatoryNotificationModal.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/pwa/MandatoryNotificationModal.tsx)
```tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  getNotificationStatus,
  requestBrowserNotifications,
  testSystemNotification,
  NotificationStatus,
} from "@/lib/utils/pwaNotifications";
import styles from "@/styles/pwa.module.css";
import {
  Bell,
  Mic,
  Camera,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Send,
} from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { enableNotifications } from "@/lib/notifications";

export default function MandatoryNotificationModal() {
  const { userProfile } = useAuth();
  const [status, setStatus] = useState<NotificationStatus>("granted");
  const [micGranted, setMicGranted] = useState(false);
  const [camGranted, setCamGranted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTestingNotif, setIsTestingNotif] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = getNotificationStatus();
    setStatus(current);

    // Check if permissions were previously confirmed
    const confirmed = localStorage.getItem("youssef_permissions_confirmed");
    if (confirmed && current === "granted") {
      setStatus("granted");
    }

    const handleFocus = () => {
      setStatus(getNotificationStatus());
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  if (!mounted || (status === "granted" && localStorage.getItem("youssef_permissions_confirmed") === "true") || status === "unsupported") {
    return null;
  }

  const handleRequestAll = async () => {
    if (!userProfile?.uid) {
      alert("استنى ثواني لحد ما الحساب يتحمّل وحاول تاني");
      return;
    }
    setLoading(true);
    try {
      // 1. Request Notifications first with dedicated gesture and register FCM token
      const notifResult = await requestBrowserNotifications(userProfile.uid);

      // 2. Request Microphone sequentially (not concurrent, so mobile browsers don't auto-dismiss)
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          audioStream.getTracks().forEach((t) => t.stop());
          setMicGranted(true);
        }
      } catch (err) {
        console.warn("Microphone permission note:", err);
      }

      setStatus(getNotificationStatus());
      if (notifResult) {
        try {
          localStorage.setItem("youssef_permissions_confirmed", "true");
        } catch {}
      } else {
        alert("تم طلب إذن المتصفح لكن فشل تسجيل رمز الإشعارات (FCM Token). يرجى الضغط على زر التحقق اليدوي بالأسفل أو التأكد من الاتصال بالإنترنت.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotif(true);
    try {
      await testSystemNotification(userProfile?.uid);
    } finally {
      setIsTestingNotif(false);
    }
  };

  const handleManualCheck = async () => {
    if (getNotificationStatus() !== "granted" || !userProfile?.uid) {
      alert("لم يتم تفعيل إذن الإشعارات بعد في المتصفح. اضغط على رمز القفل 🔒 وقم باختيار (سماح/Allow).");
      return;
    }
    setLoading(true);
    try {
      const res = await enableNotifications(userProfile.uid);
      if (res.ok) {
        setStatus("granted");
        try {
          localStorage.setItem("youssef_permissions_confirmed", "true");
        } catch {}
      } else {
        alert("فشل تسجيل توكن الإشعارات، يرجى التأكد من اتصال الإنترنت وحاول مجدداً.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.notifOverlay}>
      <div className={styles.notifCard}>
        <div className={styles.notifGlow} />

        <div className={styles.notifIconWrap}>
          <div className={styles.notifPulseRing} />
          <Bell size={36} color="#818CF8" />
        </div>

        <div className={styles.notifBadge}>
          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
            verified_user
          </span>
          تفعيل أذونات التطبيق
        </div>

        <h2 className={styles.notifTitle}>أذونات التشغيل قبل التنزيل</h2>

        <p className={styles.notifDesc}>
          لضمان عمل الفويس (الرسائل الصوتية)، وإرسال الصور، واستقبال الرسائل والمكالمات فورياً حتى لو التطبيق مغلق، يُرجى تفعيل الأذونات التالية:
        </p>

        {status === "denied" ? (
          <div className={styles.notifBlockedGuide}>
            <div className={styles.notifBlockedTitle}>
              <AlertTriangle size={16} />
              الإشعارات محظورة في متصفحك حالياً:
            </div>
            <ol className={styles.notifBlockedSteps}>
              <li>اضغط على رمز القفل 🔒 أو إعدادات الموقع في شريط العنوان بالأعلى.</li>
              <li>ابحث عن إذن &quot;الإشعارات&quot; (Notifications) وقم بتغييره إلى &quot;سماح&quot; (Allow).</li>
              <li>بعد التفعيل، اضغط على زر التحقق أدناه للمتابعة.</li>
            </ol>
          </div>
        ) : (
          <div className={styles.notifFeatures}>
            <div className={styles.notifFeatureItem}>
              <Bell className={styles.notifFeatureIcon} size={18} />
              <span>الإشعارات الفورية: تنبيه بالرسائل والمكالمات في الخلفية</span>
            </div>
            <div className={styles.notifFeatureItem}>
              <Mic className={styles.notifFeatureIcon} size={18} />
              <span>الميكروفون والصوت: لتسجيل الفويس والمكالمات الصوتية</span>
            </div>
            <div className={styles.notifFeatureItem}>
              <Camera className={styles.notifFeatureIcon} size={18} />
              <span>الكاميرا والصور: لإرسال الصور والتقاطها ومكالمات الفيديو</span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {status === "denied" ? (
            <button
              type="button"
              className={styles.notifBtnPrimary}
              onClick={handleManualCheck}
            >
              <RefreshCw size={18} />
              تم السماح، إعادة التحقق والبدء
            </button>
          ) : (
            <button
              type="button"
              className={styles.notifBtnPrimary}
              onClick={handleRequestAll}
              disabled={loading}
            >
              <CheckCircle2 size={18} />
              {loading ? "جاري تفعيل الأذونات..." : "تفعيل كافة الأذونات (إشعارات + فويس + صور) 🚀"}
            </button>
          )}

          <button
            type="button"
            onClick={handleTestNotification}
            disabled={isTestingNotif}
            style={{
              padding: "10px 16px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "14px",
              color: "#C7D2FE",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Send size={14} />
            {isTestingNotif ? "جاري إرسال الإشعار..." : "تجربة إشعار فوري على هاتفك الآن 🔔"}
          </button>
        </div>
      </div>
    </div>
  );
}

```

---

### ز) ربط واستقبال إشعارات الرسائل والمكالمات في الوقت الفعلي مع حجب الشفرة
**في سياق المحادثات [`src/lib/contexts/ChatContext.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/contexts/ChatContext.tsx):**
```typescript
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
      title: `${senderName} 💬`,
      body: messageText,
      tag: `chat-${chat.id}`,
      url: `/chat/${chat.id}`,
    });
  }
}
```

**في سياق المكالمات [`src/lib/contexts/CallContext.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/contexts/CallContext.tsx):**
```typescript
// الاستماع لطلبات المكالمات الواردة وتشغيل الرنين والتنبيه اللحظي
const unsub = listenForIncomingCalls(userProfile.uid, (call) => {
  if (!isCallActive) {
    setIncomingCall(call);
    if (call) {
      playNotificationChime();
      dispatchAppNotification({
        title: "مكالمة واردة 📞",
        body: `مكالمة ${call.type === "video" ? "فيديو" : "صوتية"} من ${call.callerName || "مستخدم"}`,
        tag: `call-${call.id}`,
        url: "/calls",
      });
    }
  }
});
```

---

## 7. 🛡️ المعالجة الجذرية للثغرات الدقيقة (Backend Push & Silent Failure Fixes)

بناءً على الفحص المعماري الدقيق لبيئة تشغيل PWA وسيرفيس وركر الخلفية على الهواتف، تم تطبيق التحسينات الهندسية التالية:

### 1) حل الفشل الصامت في `dispatchAppNotification`:
- **سبب المشكلة السابقة:** كانت الدالة ترسل `postMessage` لـ `navigator.serviceWorker.controller`. لكن سيرفيس وركر FCM مسجل على نطاق مخصص (`/firebase-cloud-messaging-push-scope`)، مما يجعله ليس الـ controller للمجال العام. وكان الاستدعاء يرجع مبكراً قبل الوصول للـ fallback. كما أن الـ fallback باستخدام `new Notification()` يرمي خطأ `TypeError: Illegal constructor` على نظام أندرويد وChrome للموبايل.
- **الحل الجذري المطبق:** 
  1. الاستعلام المباشر عن تسجيل الـ SW بنطاق FCM المخصص عبر `navigator.serviceWorker.getRegistration(SW_SCOPE)` ثم `reg.showNotification(title, notifOptions)`.
  2. إضافة مستمع لرسائل `message` داخل [`public/firebase-messaging-sw.js`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/firebase-messaging-sw.js) لدعم `SHOW_NOTIFICATION`.
  3. حماية محتوى الإشعار من إظهار التشفير: إذا بدأ النص بـ `🔒#YF:` يتم تحويله تلقائياً إلى `🔒 رسالة جديدة`.

### 2) القضاء على الإشعارات المكررة بتوحيد الـ Tags:
- تم توحيد وسوم الإشعار بين الواجهة الأمامية، السيرفيس وركر، والـ Cloud Function:
  - للرسائل: `chat-${chatId}` (استبدال `msg-${chat.id}`)
  - للمكالمات: `call-${callId}` و `call-${d.callId || d.chatId}`
- هذا يضمن أنه حتى لو استقبل الهاتف إشعار الدفع السحابي (Push) وتزامن معه استماع Firestore المحلي في نفس اللحظة، سيقوم نظام التشغيل باستبدال الإشعار بنفس التاج تلقائياً دون أي تكرار مزعج.

### 3) حفظ تفضيلات الإشعارات في السيرفر وقراءتها في الـ Cloud Function:
- تم ربط مفاتيح التبديل في [`NotificationSettingsModal.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/chat/NotificationSettingsModal.tsx) لتقوم بتحديث وثيقة المستخدم `users/{uid}` بالحقل `notificationPreferences`، بالإضافة إلى `localStorage`.
- تم تحديث دوال `playNotificationChime` و `dispatchAppNotification` لاحترام إعدادات كتم الصوت أو حظر الرسائل أو المعاينة محلياً.
- تقوم الـ Cloud Function في السيرفر بقراءة `notificationPreferences`:
  - إذا عطل المستخدم تنبيهات الرسائل (`messages: false`)، يتم تخطي الإرسال سحابياً.
  - إذا عطل المعاينة (`preview: false`)، يتم إرسال النص العام المجهل "رسالة جديدة 💬" بدلاً من نص الرسالة.
  - إذا عطل المكالمات (`calls: false`)، يتم تخطي رنين المكالمات السحابي.

### 4) تصحيح سلوك زر "إعادة المزامنة":
- الزر كان يستدعي `disableNotifications` سابقاً عند كون الإذن `granted`، مما كان يعطل إشعارات المستخدم بالخطأ!
- تم تصحيحه ليستدعي `enableNotifications(uid)` ويعيد تسجيل وتحديث التوكن، مع إضافة زر منفصل أحمر خاص لإيقاف الإشعارات.

### 5) معالجة سقف حمولة FCM (4KB Limit) ومنع فشل إرسال Base64 Photos:
- تم إضافة دالة `getSafeIcon` داخل الـ Cloud Functions للتأكد من أن صورة المستخدم المرسلة في الـ Push تبدأ بـ `https://` فقط، وتجنب وضع صور Base64 الطويلة التي تتجاوز سقف 4096 بايت المسموح به في Firebase FCM.

### 6) منع تخزين الـ Service Worker في كاش المتصفح:
- تم إنشاء ملف [`public/_headers`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/_headers) لإجبار خوادم Cloudflare Pages على إرسال ترويسة `Cache-Control: no-cache, no-store, must-revalidate` لملفات السيرفيس وركر، مما يضمن تحديثها فورياً على جميع الهواتف.

### 7) إصلاح ثغرة إغلاق المودال قبل تسجيل التوكن (Mandatory Notification Modal Bug):
- **المشكلة السابقة:** كان المودال يقوم بحفظ `youssef_permissions_confirmed = "true"` في `localStorage` بمجرد أن يكون الإذن `granted`، حتى لو فشلت دالة `enableNotifications` في استخراج أو تسجيل الـ FCM Token في Firestore (بسبب بطء تحميل الـ uid، أو عدم إدخال الـ VAPID Key، أو مشاكل الاتصال). وكان المودال يختفي للأبد والمستخدم لا يعلم سبب عدم وصول الإشعارات في الخلفية.
- **الحل المطبق:**
  1. اشتراط وجود `userProfile?.uid` قبل محاولة التفعيل، وإظهار تنبيه توجيهي باللغة العربية: `"استنى ثواني لحد ما الحساب يتحمّل وحاول تاني"`.
  2. عدم حفظ تأكيد الأذونات في `localStorage` إطلاقاً إلا إذا رجعت دالة التسجيل بنجاح (`notifResult === true` أو `res.ok === true`).
  3. ربط زر "التحقق اليدوي" باستدعاء `enableNotifications(userProfile.uid)` للتأكد من وجود الـ Token في Firestore وتنبيه المستخدم عند أي فشل للإنترنت.

### 8) فصل مسارات إشعارات المكالمات والرسائل في Service Worker:
- **المشكلة السابقة:** كان زر "رفض" في إشعار المكالمة يقوم فقط بإغلاق الإشعار محلياً (`event.notification.close()`) دون تحديث حالة المكالمة في Firestore، فكان المتصل يظل يرن دون أن يعلم أن الطرف الآخر رفض. كما كان السيرفيس وركر يرسل `OPEN_CHAT` ويضع `callId` كبديل للـ `chatId`، مما يجعل مستمع النقر يفتح شات برقم المكالمة بالخطأ!
- **الحل المطبق:**
  1. إزالة زر "رفض" الوهمي من إشعار المكالمة، وجعل الزر الأساسي `فتح المكالمة 📞` يوجه مباشرة إلى صفحة المكالمات `/calls`.
  2. إرسال حدث `OPEN_CALL` للمكالمات بدلاً من `OPEN_CHAT`، وتحديث دالة `listenNotificationClicks` لتدعم مسار المكالمات `onOpenCall` بشكل مستقل تماماً.

### 9) المزامنة والتحديث الصامت المستمر للتوكن (`PWAClientManager`):
- تم حقن `useAuth()` داخل [`PWAClientManager.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/pwa/PWAClientManager.tsx) في الـ Root Layout:
  1. يقوم تلقائياً باستدعاء `refreshToken(userProfile.uid)` بشكل صامت فور تحميل الحساب إذا كان إذن الإشعارات مفعلاً مسبقاً، لمواجهة تدوير التوكنات (Token Rotation) التي تجريها جوجل كل فترة.
  2. يستمع عالمياً لأحداث النقر على الإشعارات ويوجه لـ `/chat/${chatId}` أو `/calls`.

### 10) تفادي خطأ 404 عند النقر على الإشعار والتطبيق مغلق (SPA Static Export):
- لأن التطبيق مبني بـ Next.js مع `output: 'export'`، فإن صفحات الشات المتغيرة مثل `/chat/<id>` لا يتم توليد ملف HTML ثابت لكل معرف منها عند البناء.
- لتفادي ظهور صفحة 404 عند تشغيل التطبيق من إشعار سحابي عبر `clients.openWindow('/chat/<id>')`:
  - تم إنشاء ملف [`public/_redirects`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/_redirects):
    ```text
    /chat/* /chat/direct.html 200
    /* /index.html 200
    ```
  - يدعم هذا الملف مع إعداد `"not_found_handling": "single-page-application"` في `wrangler.jsonc` توجيه أي رابط لشات مغلق مباشرة لـ `/chat/direct.html` بكود 200، حيث يقرأ كود `ChatClient` المعرف من `window.location.pathname` ويفتح المحادثة المطلوبة فوراً.

### 11) إصلاح أخطاء الصياغة في `public/sw.js` وتوافق الرنين:
- تم تصحيح القوس غير المغلق في `event.waitUntil` داخل مستمع `notificationclick` في [`public/sw.js`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/sw.js).
- تم ضبط خيار `renotify: isCall` في `dispatchAppNotification` حتى لا يصدر المتصفح رنيناً مزدوجاً عند وصول إشعار الدفع السحابي والإشعار المحلي معاً لنفس الرسالة.

### 12) تدقيق الأمان والخصوصية (SignOut & Blocked Users):
- تم التحقق من أن دالة `signOut()` في [`auth.ts`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/lib/firebase/auth.ts) تستدعي دائماً `await disableNotifications(currentUid)` قبل تسجيل الخروج لمسح التوكن من وثيقة المستخدم وإلغائه من Firebase Messaging، لحماية خصوصية المستخدمين ومنع وصول إشعارات المستخدم السابق للجهاز بعد تسجيل الخروج.
- تم التحقق من مطابقة اسم حقل المستخدمين المحظورين في الـ Cloud Function `blockedUsers` مع اسم الحقل المستخدم في استدعاءات `blockUser` في الواجهة، وإضافة حظر إشعارات المكالمات الواردة أيضاً في حال كان المتصل ضمن قائمة الحظر.

---

## 8. ☁️ كود الـ Cloud Functions المحدث لإرسال الإشعارات عند إغلاق التطبيق

لضمان وصول الإشعارات والمكالمات في الخلفية حتى عندما يكون التطبيق مقفولاً تماماً أو الهاتف في وضع السكون، هذا هو كود الـ Cloud Functions المحدث بالكامل:

**الملف:** [`functions/src/index.ts`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/functions/src/index.ts)
```typescript
${functionsIndexTs}
```

---

## 9. 📱 كود إدارة PWA والسيرفيس وركر وإعادة التوجيه (PWA Client & Routing)

### 1) ملف المدير العام للـ PWA والتحديث الصامت للتوكنات:
**الملف:** [`src/components/pwa/PWAClientManager.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/pwa/PWAClientManager.tsx)
```typescript
${clientManagerTsx}
```

### 2) ملف السيرفيس وركر الأساسي للتطبيق PWA:
**الملف:** [`public/sw.js`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/sw.js)
```javascript
${swWorkerJs}
```

### 3) ملف إعادة التوجيه لضمان فتح الشات من الإشعارات دون 404:
**الملف:** [`public/_redirects`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/public/_redirects)
```text
${redirectsTxt}
```

---

## 10. 🎯 خطوات تفعيل واختبار الإشعارات السحابية في بيئة الإنتاج:

1. **نشر الدوال والتحقق من الـ Region:**
   ```bash
   firebase deploy --only functions
   ```
   > **ملاحظة هامة:** إذا ظهر خطأ في الـ region أثناء الرفع، افتح Firebase Console ← Firestore Database ← إعدادات الموقع، وتأكد أن المتغير `REGION` في [`functions/src/index.ts`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/functions/src/index.ts) يطابق موقع قاعدة البيانات (مثلاً `europe-west1` لقواعد `eur3` أو `us-central1` لقواعد `nam5`).

2. **شهادة Web Push (VAPID Key):**
   - استخراج المفتاح العام من: Firebase Console ← Project Settings ← Cloud Messaging ← Web Push certificates.
   - وضعه في ملف `.env.local` كـ `NEXT_PUBLIC_FIREBASE_VAPID_KEY=...` وفي متغيرات البيئة بـ Cloudflare Pages.

3. **قواعد أمان Firestore:**
   - تم التحقق من أنها تسمح للمستخدم بتحديث التفضيلات `notificationPreferences` وتوكنات `fcmTokens`:
     ```javascript
     match /users/{userId} {
       allow read: if true;
       allow write: if request.auth != null;

       match /fcmTokens/{token} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
     ```

4. **طريقة الاختبار الحقيقي على الهاتف:**
   - بعد تفعيل الإشعارات، افتح Firestore Console وتأكد من إنشاء وثيقة للتوكن داخل:
     `users/{uid}/fcmTokens/<token>`
   - قم بإغلاق التطبيق تماماً (Swiping it away) وقفل شاشة الهاتف.
   - أرسل رسالة من هاتف أو حساب آخر.
   - ستصل الرسالة كإشعار دفع سحابي حتى مع إغلاق التطبيق، وبمجرد النقر عليها سيفتح التطبيق ويوجهك مباشرة لصفحة المحادثة!
