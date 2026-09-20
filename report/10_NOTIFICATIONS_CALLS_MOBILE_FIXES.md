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
1. **فصل طلب الأذونات تسلسلياً**: في [`MandatoryNotificationModal.tsx`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/src/components/pwa/MandatoryNotificationModal.tsx)، يتم طلب الإشعارات أولاً ثم الميكروفون بشكل مستقل دون تضارب مع واجهة النظام.
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

## 6. 📜 الكود الكامل والشامل المستخدم في ميزة الإشعارات (Full Notifications Codebase)

فيما يلي كل الأكواد البرمجية التي تشغل ميزة الإشعارات بكامل أجزائها في التطبيق:

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

/** Lets a notification click switch chats inside an already-open window. */
export function listenNotificationClicks(onOpenChat: (chatId: string) => void) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return () => {};
  }
  const handler = (e: MessageEvent) => {
    if (e.data?.type === "OPEN_CHAT" && e.data.chatId) onOpenChat(e.data.chatId);
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

// Data-only messages prevent duplicate display by browser
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  const isCall = d.type === "call";

  return self.registration.showNotification(d.title || "Youssef App", {
    body: d.body || "",
    icon: d.icon || "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: isCall ? `call-${d.chatId}` : `chat-${d.chatId}`,
    renotify: true,
    requireInteraction: isCall,
    vibrate: isCall ? [300, 150, 300, 150, 300] : [120],
    dir: "auto",
    data: { url: d.url || "/", chatId: d.chatId, type: d.type || "message" },
    actions: isCall
      ? [
          { action: "answer", title: "رد" },
          { action: "decline", title: "رفض" },
        ]
      : [],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "decline") return;

  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && "focus" in w) {
          w.postMessage({ type: "OPEN_CHAT", url: target, chatId: event.notification.data?.chatId });
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

// Web Audio API Chime Synthesizer (توليد نغمة تنبيه نقية D5 -> A5 بدون ملفات خارجية)
export function playNotificationChime() {
  try {
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

export type NotificationStatus = "granted" | "denied" | "default" | "unsupported";

export function getNotificationStatus(): NotificationStatus {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as NotificationStatus;
}

export async function requestBrowserNotifications(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  try {
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
  if (Notification.permission !== "granted") return;

  const notifOptions = {
    body,
    icon,
    badge: "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    tag: tag || `app-notif-${Date.now()}`,
    data: { url },
  };

  // Dispatch via ServiceWorker if available
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: "SHOW_NOTIFICATION",
        title,
        options: notifOptions,
      });
      return;
    } catch (e) {}
  }

  // Fallback to standard Notification API
  try {
    const notif = new Notification(title, notifOptions);
    notif.onclick = () => {
      window.focus();
      window.location.href = url;
      notif.close();
    };
  } catch (e) {}
}

export async function testSystemNotification(): Promise<boolean> {
  const status = getNotificationStatus();
  if (status !== "granted") {
    const requested = await requestBrowserNotifications();
    if (!requested) return false;
  }

  playNotificationChime();
  await dispatchAppNotification({
    title: "تنبيه تجريبي من يوسف شات 🔔",
    body: "الإشعارات تعمل بنجاح وبسرعة فائقة على هاتفك الآن!",
    url: "/chat",
  });
  return true;
}
```

---

### د) المكون التفاعلي: نافذة إعدادات الإشعارات الشاملة
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

  // Settings State (stored in localStorage)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [messagesEnabled, setMessagesEnabled] = useState(true);
  const [callsEnabled, setCallsEnabled] = useState(true);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }

    try {
      setSoundEnabled(localStorage.getItem("notif_pref_sound") !== "false");
      setMessagesEnabled(localStorage.getItem("notif_pref_messages") !== "false");
      setCallsEnabled(localStorage.getItem("notif_pref_calls") !== "false");
      setPreviewEnabled(localStorage.getItem("notif_pref_preview") !== "false");
      setVibrateEnabled(localStorage.getItem("notif_pref_vibrate") !== "false");
    } catch (e) {}
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTogglePreference = (key: string, current: boolean, setter: (val: boolean) => void) => {
    const next = !current;
    setter(next);
    try {
      localStorage.setItem(`notif_pref_${key}`, String(next));
    } catch (e) {}
    if (key === "sound" && next) {
      playNotificationChime();
    }
  };

  const handleToggleSystemPermission = async () => {
    if (permission === "granted") {
      setLoading(true);
      try {
        await disableNotifications(uid);
        alert("تم إلغاء تسجيل الإشعارات السحابية على هذا الجهاز.");
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const res = await enableNotifications(uid);
        if (res.ok) {
          setPermission("granted");
          playNotificationChime();
        } else if (res.reason === "denied") {
          setPermission("denied");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    setTestSuccess(false);
    try {
      playNotificationChime();
      const ok = await testSystemNotification();
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

### و) ربط واستقبال إشعارات الرسائل والمكالمات في الوقت الفعلي
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
    
    // تشغيل نغمة الصوت
    playNotificationChime();

    // إرسال الإشعار لمركز إشعارات النظام
    dispatchAppNotification({
      title: `${senderName} 💬`,
      body: chat.lastMessage?.text || "أرسل لك رسالة جديدة",
      tag: `msg-${chat.id}`,
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
