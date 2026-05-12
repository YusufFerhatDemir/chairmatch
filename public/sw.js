// ============================================================
// CHAIRMATCH SERVICE WORKER — Offline-Capable
// ============================================================
// Strategie:
//  - HTML/Navigation: network-first mit 3s-Timeout, dann Cache, dann Offline-Page
//  - Statische Assets (Next.js Chunks): cache-first + stale-while-revalidate
//  - Bilder/Logos/Brand: stale-while-revalidate (sofort gecached, Update im Hintergrund)
//  - API-Calls: network-only (niemals cachen)
//  - Push-Notifications: nativ via APNs/FCM
//
// Cache-Versionierung: SW_VERSION wird bei jedem Deploy gebumpt.
// Bei neuer Version: ALLE alten Caches werden im activate-Event geloescht.
// ============================================================

const SW_VERSION = 'v20.0';
const CACHE_HTML   = `chairmatch-html-${SW_VERSION}`;
const CACHE_STATIC = `chairmatch-static-${SW_VERSION}`;
const CACHE_IMAGES = `chairmatch-images-${SW_VERSION}`;

const PRECACHE_HTML = [
  '/',
  '/explore',
  '/offers',
  '/rentals',
  '/auth',
];

const PRECACHE_STATIC = [
  '/manifest.json',
  '/icon.svg',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon-32.png',
];

// ── Offline-Fallback-Page (im Brand-Design) ─────────────────
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ChairMatch — Offline</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#080706;color:#F5F0E8;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}
  .wrap{max-width:340px}
  h1{font-size:24px;color:#D4AF37;margin-bottom:14px;font-weight:700;letter-spacing:2px}
  p{color:#9B9385;font-size:14px;line-height:1.7;margin-bottom:24px}
  button{padding:14px 32px;border-radius:14px;border:none;background:linear-gradient(135deg,#D4AF37,#B8963A);color:#080706;font-weight:700;font-size:14px;cursor:pointer;width:100%}
  .pin{width:64px;height:64px;margin:0 auto 24px;display:block}
  small{color:#5F5E5A;font-size:11px;margin-top:18px;display:block}
</style>
</head>
<body>
<div class="wrap">
  <svg class="pin" viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FCF6BA"/><stop offset="50%" stop-color="#D4AF37"/><stop offset="100%" stop-color="#AA771C"/>
    </linearGradient></defs>
    <path d="M50 6C28.5 6 11 23.5 11 45C11 70 50 124 50 124C50 124 89 70 89 45C89 23.5 71.5 6 50 6Z" stroke="url(#g)" stroke-width="2.5" fill="none"/>
    <circle cx="50" cy="45" r="22" stroke="url(#g)" stroke-width="1.8" fill="none"/>
    <path d="M50 28L53.5 40.5L66 45L53.5 49.5L50 62L46.5 49.5L34 45L46.5 40.5Z" fill="url(#g)" opacity="0.9"/>
  </svg>
  <h1>OFFLINE</h1>
  <p>Du bist gerade nicht mit dem Internet verbunden. Sobald du wieder online bist, kannst du normal weitermachen.</p>
  <button onclick="location.reload()">Erneut versuchen</button>
  <small>Bereits geladene Seiten funktionieren weiter</small>
</div>
</body>
</html>`;

// ── Install: Precache critical assets ───────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_HTML).then(c => c.addAll(PRECACHE_HTML).catch(() => {})),
      caches.open(CACHE_STATIC).then(c => c.addAll(PRECACHE_STATIC).catch(() => {})),
    ]).then(() => self.skipWaiting())
  );
});

// ── Activate: Alte Caches loeschen ──────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const validNames = new Set([CACHE_HTML, CACHE_STATIC, CACHE_IMAGES]);
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => !validNames.has(k)).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// ── Message-Handler: SKIP_WAITING ────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Helper: Network-first mit Timeout ───────────────────────
async function networkFirstWithTimeout(request, cacheName, timeoutMs = 3000) {
  const cache = await caches.open(cacheName);
  try {
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
    const response = await Promise.race([networkPromise, timeoutPromise]);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Letzter Fallback: Offline-Page
    return new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

// ── Helper: Stale-while-revalidate ──────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((response) => {
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  }).catch(() => cached);
  return cached || networkPromise;
}

// ── Fetch: Routing nach Request-Typ ─────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Nur GET-Requests cachen
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  if (url.origin !== self.location.origin) return;

  // API + Supabase: niemals cachen
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    return;
  }

  // Next.js Static Chunks (/_next/static/): cache-first + revalidate
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
    return;
  }

  // Bilder + Brand-Assets: stale-while-revalidate
  if (
    url.pathname.startsWith('/brand/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/screenshots/') ||
    url.pathname.match(/\.(png|jpe?g|webp|svg|ico|gif)$/i)
  ) {
    event.respondWith(staleWhileRevalidate(request, CACHE_IMAGES));
    return;
  }

  // HTML / Navigation: network-first mit Offline-Fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirstWithTimeout(request, CACHE_HTML, 3000));
    return;
  }

  // Andere statische Assets (CSS, Fonts): cache-first
  if (request.destination === 'style' || request.destination === 'font' || request.destination === 'script') {
    event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
    return;
  }

  // Default: network mit Cache-Fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ── Push Notifications ──────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'ChairMatch', body: 'Neue Benachrichtigung', icon: '/icon-192.png', badge: '/icon-192.png', data: { url: '/' } };
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; } catch { data.body = event.data.text(); }
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
