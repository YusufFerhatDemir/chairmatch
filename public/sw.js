// ============================================================
// CHAIRMATCH SERVICE WORKER — v2.0 (Production-Ready)
// ============================================================
// Strategie:
// - Network-First für HTML & API (frische Daten haben Vorrang)
// - Stale-While-Revalidate für statische Assets (JS/CSS/Images)
// - Offline-Fallback-Seite für Navigationen
// - Auto-Update wenn neuer SW verfügbar
// - KEIN Caching von Auth/Session-Endpoints (Sicherheit)
// ============================================================

const SW_VERSION = 'v3.0.0-2026-05-14-welcome-splitter'
const STATIC_CACHE = `cm-static-${SW_VERSION}`
const RUNTIME_CACHE = `cm-runtime-${SW_VERSION}`

// Assets die wir SOFORT beim Install pre-cachen
const PRECACHE_URLS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon-32.png',
  '/brand/chairmatch_logo_pin_symbol_gradient_512.png',
]

// Pfade die NIEMALS gecached werden dürfen — sonst Auth-Bugs
const NEVER_CACHE = [
  '/api/auth/',
  '/api/bookings',
  '/api/stripe',
  '/api/cron',
  '/api/_log',
]

// Hilfsfunktion: ist diese Request cache-fähig?
function isCacheable(request) {
  if (request.method !== 'GET') return false
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return false
  if (NEVER_CACHE.some(p => url.pathname.startsWith(p))) return false
  return true
}

// ─── Install ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(() => {/* offline at install time → ignore */}))
      .then(() => self.skipWaiting())
  )
})

// ─── Activate: alte Caches löschen ───────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter(k => k.startsWith('cm-') && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map(k => caches.delete(k))
      )
      await self.clients.claim()
    })()
  )
})

// ─── Fetch: Strategie pro Request-Typ ────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (!isCacheable(request)) return // Pass-through (Browser default)

  const url = new URL(request.url)

  // 1) HTML-Navigationen → Network-First mit Offline-Fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }

  // 2) API-Calls → Network-First (kurzes Timeout) mit Cache-Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCacheFallback(request, 4000))
    return
  }

  // 3) Static Assets (_next/static, /icons, /brand, woff, png, css, js) → Stale-While-Revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/brand/') ||
    /\.(?:woff2?|ttf|otf|png|jpg|jpeg|webp|svg|css|js)$/i.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // Default: Network mit Cache-Fallback
  event.respondWith(networkFirstWithCacheFallback(request, 4000))
})

// ─── Strategien ──────────────────────────────────────────────

async function networkFirstWithOfflineFallback(request) {
  try {
    const network = await fetch(request)
    if (network && network.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, network.clone()).catch(() => {})
    }
    return network
  } catch {
    const cache = await caches.open(RUNTIME_CACHE)
    const cached = await cache.match(request)
    if (cached) return cached
    // Offline-Fallback-Seite (minimal, inline)
    return new Response(offlinePage(), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

async function networkFirstWithCacheFallback(request, timeoutMs) {
  const cache = await caches.open(RUNTIME_CACHE)
  try {
    const network = await fetchWithTimeout(request, timeoutMs)
    if (network && network.ok) {
      cache.put(request, network.clone()).catch(() => {})
    }
    return network
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    // 503-Equivalent so dass die UI sauber 'offline' anzeigen kann
    return new Response(JSON.stringify({ error: 'Offline', code: 'OFFLINE' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  const networkPromise = fetch(request)
    .then(resp => {
      if (resp && resp.ok) cache.put(request, resp.clone()).catch(() => {})
      return resp
    })
    .catch(() => null)
  return cached || networkPromise || fetch(request)
}

function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    fetch(request).then(
      (r) => { clearTimeout(t); resolve(r) },
      (e) => { clearTimeout(t); reject(e) },
    )
  })
}

function offlinePage() {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline — ChairMatch</title><style>body{margin:0;background:#0B0B0F;color:#F5F5F7;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}h1{color:#C4A86A;margin:0 0 12px}p{color:rgba(245,245,247,.6);max-width:340px}button{margin-top:24px;background:linear-gradient(135deg,#D4AF37,#B8962E);border:none;color:#1a1000;padding:14px 28px;border-radius:14px;font-weight:700;font-size:14px;cursor:pointer}</style></head><body><div><div style="font-size:48px;margin-bottom:8px">📡</div><h1>Du bist offline</h1><p>Keine Internetverbindung. Sobald du wieder online bist, lädt ChairMatch automatisch.</p><button onclick="location.reload()">Erneut versuchen</button></div></body></html>`
}

// ─── Push-Notifications (vorbereitet, nutzt VAPID) ──────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = {}
  try { payload = event.data.json() } catch { payload = { title: 'ChairMatch', body: event.data.text() } }
  const { title = 'ChairMatch', body = '', url = '/', icon = '/icon-192.png', badge = '/icon-192.png', tag } = payload
  event.waitUntil(
    self.registration.showNotification(title, {
      body, icon, badge, tag,
      data: { url },
      vibrate: [60, 30, 60],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin))
      if (existing) {
        existing.focus()
        return existing.navigate(url)
      }
      return self.clients.openWindow(url)
    })
  )
})

// Message-Channel für gezielte Cache-Invalidierung von der App aus
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    )
  }
})
