// ============================================================
// CHAIRMATCH SERVICE WORKER — SELF-DESTRUCT MODE
// ============================================================
// Wir hatten zu viele Cache-Probleme während der rapiden Entwicklung.
// Dieser SW deinstalliert sich beim nächsten Page-Load und löscht
// ALLE alten Caches. Danach ist die Seite "normal" — alles kommt
// frisch vom Vercel-Edge mit Standard-Browser-Cache.
//
// Re-Aktivierung des SW kommt später, wenn wir Offline-Support brauchen.
// ============================================================

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Alle Caches loeschen
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));

      // 2. SW selbst deinstallieren
      await self.registration.unregister();

      // 3. Alle Clients reloaden (zeigt frische Seite)
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});

// Fetch: einfach weiterleiten, kein Caching mehr
self.addEventListener('fetch', () => {
  // SW macht nichts mehr — Network requests laufen normal durch
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
