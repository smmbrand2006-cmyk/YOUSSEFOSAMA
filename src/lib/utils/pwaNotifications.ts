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
