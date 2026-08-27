# ADR 0002: CSP — keine Nonces in der durchgesetzten Policy, Nonce-Track als Report-Only

**Status:** Accepted
**Datum:** 2026-08-27
**Autor:** Hardening Phase 2 (CSP-Track)

## Kontext

Nach Phase 1 (Commit `054fe53`) stand die CSP noch auf
`script-src 'self' 'unsafe-inline' 'unsafe-eval' …` und
`style-src 'self' 'unsafe-inline' …`. Die JSON-LD-XSS war zwar durch Escaping
geschlossen, die Policy selbst hätte einen Treffer aber nicht abgefangen.

Auftrag war, `unsafe-inline` durch ein Nonce-System zu ersetzen und
`unsafe-eval` zu entfernen.

## Entscheidung

**Kein Nonce in der durchgesetzten Policy. Stattdessen:**

| Policy | Ort | Inhalt |
|---|---|---|
| `Content-Security-Policy` (enforced) | `next.config.ts` → `src/lib/csp.ts` | nonce- und hashfrei in `script-src`; `unsafe-eval` nur noch im Dev-Server; `style-src-elem` ohne `unsafe-inline` |
| `Content-Security-Policy-Report-Only` | `src/middleware.ts` | strikt: `'nonce-…' 'strict-dynamic'`, `script-src-attr 'none'`, meldet an `/api/csp-report` — nur auf `force-dynamic`-Pfaden |

## Warum kein durchgängiges Nonce

Zwei harte Randbedingungen, die zusammen keinen Spielraum lassen:

1. **Ein Nonce muss pro Request neu sein und im HTML stehen.** Beides zugleich
   geht nur bei Rendering pro Request. ChairMatch rendert die komplette
   öffentliche Fläche als ISR/Static — `revalidate` steht in fast jeder Seite,
   und `app/layout.tsx` trägt den ausdrücklichen Hinweis, dass weder
   `force-dynamic` noch `cookies()` ins Root-Layout dürfen (TTFB ~5s statt
   Edge-Cache). Auf einer gecachten Seite trifft ein frischer Header-Nonce auf
   HTML mit altem oder gar keinem Nonce.

2. **Nonce und `'unsafe-inline'` schließen sich aus.** Sobald `script-src`
   einen Nonce oder Hash enthält, ignorieren alle modernen Browser das
   `'unsafe-inline'` derselben Direktive. Ein „Nonce zusätzlich, unsafe-inline
   als Fallback" gibt es nicht.

Messung am gebauten Output (256 vorgerenderte Seiten): jede Seite enthält
~42 Inline-`<script>` von Next.js (`self.__next_f.push(...)`, Flight-Payload)
plus 3–7 JSON-LD-Blöcke. Ein Nonce-Enforcement hätte auf jeder dieser Seiten
die Hydration abgeschaltet — also praktisch die ganze Website.

Der im Auftrag genannte Fallback `'strict-dynamic'` löst das nicht: die
Direktive ist nur zusammen mit Nonce oder Hash wirksam und erbt damit
dasselbe Problem. Sie steckt deshalb in der Report-Only-Policy.

## Was stattdessen gehärtet wurde

- **`'unsafe-eval'` fällt in Produktion weg.** Nur der Dev-Server braucht es
  (Webpack liefert HMR-Module als `eval(...)`). Gegenprobe an den
  Client-Bundles: kein `new Function(` im Produktionsbuild. Keine der
  Abhängigkeiten (stripe-js, supabase-js, leaflet, sentry, zod, web-vitals,
  next-auth) verlangt es.
- **`style-src` aufgeteilt.** `style-src-elem` kommt ohne `'unsafe-inline'`
  aus — verifiziert daran, dass in allen 256 vorgerenderten Seiten **kein
  einziges** `<style>`-Element steht (Next.js verlinkt CSS ausschließlich per
  `<link>`). Die verbliebenen Inline-Stylesheets sind entweder nach
  `globals.css` gewandert oder laufen über SHA-256-Hashes.
  `style-src-attr` behält `'unsafe-inline'`: React liefert jedes `style={{…}}`
  als Attribut aus, und Attribut-Styles kennen weder Nonce noch Hash. Das ist
  die deutlich harmlosere Hälfte — damit lässt sich kein `<style>`-Element und
  kein Script einbringen. `style-src` bleibt als permissiver Fallback für
  Browser ohne `-elem`/`-attr` (Safari < 15.4) stehen.
- **Ausführbares eigenes Inline-JS gibt es nicht mehr.** Der
  Service-Worker-Kill-Switch aus dem Root-Layout ist eine reguläre
  Client-Component (`components/ServiceWorkerCleanup.tsx`).
- **`unsafe-inline` in `script-src` bleibt** — für Next.js' Flight-Payload und
  die ~35 JSON-LD-Blöcke. Beide hängen am Seiteninhalt, sind also weder
  hashbar noch externalisierbar.

## Der Nonce-Track als Messinstrument

Die strikte Zielpolicy läuft als Report-Only mit. Next.js liest den
Request-Header `content-security-policy-report-only` und versieht seine eigenen
Inline-Scripts automatisch mit dem Nonce
(`node_modules/next/dist/server/app-render/app-render.js:108`) — verifiziert:
auf `/karte` tragen 44 von 44 Next.js-Scripts den Header-Nonce.

Sie greift nur auf Pfaden mit `export const dynamic = 'force-dynamic'`
(`CSP_NONCE_CANARY_PATHS` / `_PREFIXES` in `src/middleware.ts`: `/search`,
`/karte`, `/preisvergleich`, `/rentals`, `/provider/*`). Auf gecachten Seiten
wäre jeder Report ein Fehlalarm, und der Endpunkt sähe vor Rauschen die echten
Treffer nicht.

Der erste Lauf hat sofort etwas gefunden: der zwischenzeitlich nach
`/sw-kill.js` ausgelagerte Kill-Switch wäre unter `'strict-dynamic'` blockiert
worden (strict-dynamic setzt `'self'` außer Kraft, ein `<script src>` im HTML
bräuchte einen eigenen Nonce). Deshalb jetzt die Client-Component.

## Konsequenzen

- Ein neues `<style>`-Element in einer Komponente wird in Produktion
  stillschweigend fallengelassen — kein Fehler, nur kaputtes Layout.
  `src/__tests__/csp-inline-guard.test.ts` macht daraus einen Testfehler.
- Neue Inline-Styles gehören nach `globals.css`. Nur wenn das Stylesheet
  nachweislich nicht geladen ist (`app/global-error.tsx`), kommt ein Block nach
  `src/lib/inline-css.ts` und wird dort automatisch gehasht.
- **Weg zur Durchsetzung:** wenn `/api/csp-report` über längere Zeit nur noch
  die JSON-LD-Blöcke meldet, kann für den `/provider`-Teilbaum eine eigene
  durchgesetzte Policy gesetzt werden — dort ist alles `force-dynamic`. Die
  öffentliche Fläche folgt erst, wenn ISR aufgegeben würde; das ist derzeit
  kein sinnvoller Tausch.
