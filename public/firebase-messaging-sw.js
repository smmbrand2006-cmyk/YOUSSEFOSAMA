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
          { action: "answer", title: "رد" },
          { action: "decline", title: "رفض" },
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
