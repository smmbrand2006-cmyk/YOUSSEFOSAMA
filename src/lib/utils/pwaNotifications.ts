"use client";

// Web Audio API Chime Synthesizer (Zero external dependencies, always plays)
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

// Dispatch browser notification
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

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon,
          badge: "/icons/icon-192.png",
          vibrate: [150, 60, 150],
          tag: tag || `app-notif-${Date.now()}`,
          data: { url },
        } as any);
        return;
      }
    }

    // Fallback standard notification
    new Notification(title, {
      body,
      icon,
      tag: tag || `app-notif-${Date.now()}`,
    });
  } catch (err) {
    console.warn("Failed to dispatch notification:", err);
  }
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
