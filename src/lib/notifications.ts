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
