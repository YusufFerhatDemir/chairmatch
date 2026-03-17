const CACHE_NAME = 'chairmatch-v10';
const PRECACHE_URLS = [
  '/',
  '/explore',
  '/offers',
  '/auth',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-180.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Push Notifications ────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'ChairMatch', body: 'Neue Benachrichtigung', icon: '/icon-192.png', badge: '/icon-192.png', data: { url: '/' } };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      vibrate: [200, 100, 200],
      data: data.data || { url: '/' },
      actions: [
        { action: 'open', title: 'Öffnen' },
        { action: 'dismiss', title: 'Schließen' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// ─── Offline Fallback Page ─────────────────────────────────
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ChairMatch — Offline</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#060504;color:#F5F0E8;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}
h1{font-size:24px;color:#D4AF37;margin-bottom:12px}
p{color:#9B9385;font-size:14px;line-height:1.6;max-width:300px}
button{margin-top:20px;padding:12px 28px;border-radius:12px;border:none;background:linear-gradient(135deg,#D4AF37,#B8963A);color:#060504;font-weight:700;font-size:14px;cursor:pointer}
</style></head>
<body><div>
<h1>Offline</h1>
<p>Du bist gerade nicht mit dem Internet verbunden. Bitte prüfe deine Verbindung und versuche es erneut.</p>
<button onclick="location.reload()">Erneut versuchen</button>
</div></body></html>`;

// ─── Fetch / Cache Strategy ────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http
  if (!url.protocol.startsWith('http')) return;

  // Network-first for API calls
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for static assets
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => caches.match(request))
      )
    );
    return;
  }

  // Network-first for navigation with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() =>
        caches.match(request).then((cached) =>
          cached || new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html' } })
        )
      )
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    }).catch(() => caches.match(request))
  );
});
