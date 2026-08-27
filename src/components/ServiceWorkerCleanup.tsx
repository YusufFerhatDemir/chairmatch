'use client'

import { useEffect } from 'react'

/**
 * SERVICE-WORKER-KILL-SWITCH
 *
 * Ehemals registrierte Service Worker werden deinstalliert und alle Caches
 * geleert. So lange der Cache-Stress eingependelt ist, KEIN SW. Bei Bedarf
 * spaeter wieder aktivieren (Offline-Modus etc.).
 *
 * Wanderung dieses Codes, weil beide Zwischenstufen an der CSP scheiterten:
 * urspruenglich ein Inline-`<script>` im Root-Layout (braucht
 * `script-src 'unsafe-inline'`), dann kurz eine eigene Datei unter
 * `/sw-kill.js` — die aber unter `'strict-dynamic'` blockiert wird, weil
 * strict-dynamic das `'self'` in script-src ausser Kraft setzt und ein
 * `<script src>` im HTML damit einen eigenen Nonce braeuchte. Einen Nonce kann
 * das Root-Layout nicht liefern, ohne `headers()` zu lesen und damit ISR fuer
 * die gesamte App abzuschalten.
 *
 * Als regulaeres Client-Component-Modul stellt sich die Frage nicht mehr: der
 * Code liegt im normalen Chunk, den Next.js' eigene (nonce-tragende) Scripts
 * nachladen. Dass die Bereinigung erst nach der Hydration laeuft statt im
 * <head>, ist unerheblich — es ist Aufraeumarbeit ohne Eile.
 */
export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        regs.forEach((r) => {
          r.unregister().catch(() => {})
        })
      })
      .catch(() => {})

    if (typeof caches !== 'undefined') {
      caches
        .keys()
        .then((keys) => {
          keys.forEach((k) => {
            caches.delete(k).catch(() => {})
          })
        })
        .catch(() => {})
    }
  }, [])

  return null
}
