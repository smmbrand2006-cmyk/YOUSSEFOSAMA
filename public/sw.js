// YOUSSEF APP - Service Worker (PWA & Notifications)
const CACHE_NAME = 'youssef-app-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first fetch handler
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Don't cache Firestore or Firebase API requests
  if (url.origin.includes('firestore') || url.origin.includes('googleapis') || url.origin.includes('firebase')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache static assets
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.startsWith('/icons/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.ico'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'YOUSSEF APP';
    const options = {
      body: data.body || 'رسالة جديدة في انتظارك',
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      vibrate: [150, 50, 150, 50, 200],
      tag: data.tag || 'youssef-app-notif',
      renotify: true,
      data: {
        url: data.url || '/chat',
        dateOfArrival: Date.now()
      }
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const title = 'YOUSSEF APP';
    const options = {
      body: event.data.text() || 'رسالة جديدة',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png'
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const isCall = notifData.type === 'call';
  const targetUrl = notifData.url || (isCall ? '/calls' : '/chat');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.startsWith(self.location.origin)) {
          if (isCall) {
            client.postMessage({
              type: 'OPEN_CALL',
              url: targetUrl,
              callId: notifData.callId,
            });
          } else {
            client.postMessage({
              type: 'OPEN_CHAT',
              url: targetUrl,
              chatId: notifData.chatId,
            });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle direct messages to show system notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    if (self.registration && self.registration.showNotification) {
      self.registration.showNotification(title || 'YOUSSEF APP', options || {});
    }
  }
});


