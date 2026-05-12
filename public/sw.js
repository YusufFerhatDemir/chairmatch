// ============================================================
// CHAIRMATCH SERVICE WORKER — DEAKTIVIERT (Self-Destruct)
// ============================================================
// Cache-Stress war groesser als der Offline-Nutzen waehrend
// der Entwicklung. SW deinstalliert sich, alle Caches weg.
// Re-Aktivierung kommt spaeter wenn stable.
// ============================================================

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});

self.addEventListener('fetch', () => {
  // Pass-through, kein Caching
});
