# CM Track 18: Datenintegritaet, Input-Validierung und Error-Handling

**Datum:** 2026-08-28
**Scope:** Alle `/api/*`-Routen, Server-Actions, Supabase-Abfragen, Datei-Uploads, Zeitzonen-Logik
**Methode:** Statische Analyse aller Route-Handler + vier parallele Audit-Agenten + Gegenproben als Tests
**Teststand:** 1295 bestehend, 47 neu, 1342 gesamt, 0 Fehler, Typecheck 0

---

## Zusammenfassung

Fuenfzehn Befunde in sechs Kategorien, alle behoben. Der schwerste (PostgREST-Filter-Injection in der Produktsuche) erlaubte einem Besucher, durch ein Komma im Suchfeld aus dem `ilike`-Filter auszubrechen und versteckte Produkte sichtbar zu machen. Zwei weitere (fehlende Rate-Limits auf Registrierung und 2FA-Verifizierung) oeffneten Brute-Force-Wege. Die groesste Breite hatte die Kategorie Error-Leaks: ueber 40 Stellen gaben rohe Supabase-Fehlermeldungen mit Tabellennamen, Spaltennamen und RLS-Policy-Namen an den Client zurueck.

---

## Befund 1: PostgREST-Filter-Injection in der Produktsuche (HOCH)

**WAS:** `getProducts()` in `src/modules/marketplace/marketplace.service.ts` interpolierte den Suchbegriff in einen `.or()`-String:
```
query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,description.ilike.%${q}%`)
```
Die Sanitisierung entfernte nur SQL-Wildcards (`%`, `_`), nicht die PostgREST-Metazeichen.

**WARUM GEFAEHRLICH:** Ein Komma im Suchfeld brach aus dem `ilike`-Wert aus und injizierte eine zweite Filterbedingung. `q = "x,is_active.eq.false"` erzeugte `name.ilike.%x` OR `is_active.eq.false` — die Route lieferte ausgelistete Produkte. Ein Punkt konnte die Operatorerkennung stoeren, Klammern die Gruppierung aendern.

**FIX:** Die Sanitisierung entfernt jetzt `[%_,.()"'\\]` — alle PostgREST-Metazeichen. Bei leerem Ergebnis nach dem Stripping wird der `.or()`-Aufruf uebersprungen.

**Datei:** `src/modules/marketplace/marketplace.service.ts`

---

## Befund 2: Registrierung ohne Rate-Limit (HOCH)

**WAS:** `POST /api/auth/register` hatte kein Rate-Limit. Die Middleware deckte `/api/auth/*` pauschal mit 10/min ab, aber das reichte nicht als Registrierungsschutz.

**WARUM GEFAEHRLICH:** Ein Angreifer konnte unbegrenzt Supabase-Auth-Konten anlegen. Jeder Aufruf erzeugte ein Konto, ein Profil und einen Consent-Eintrag.

**FIX:** In-Memory-Rate-Limit: 5 Registrierungen pro Stunde pro IP (Scope `auth-register`), geprueft vor jeder anderen Logik.

**Datei:** `src/app/api/auth/register/route.ts`

---

## Befund 3: 2FA-Verifizierung ohne Rate-Limit — TOTP-Brute-Force (HOCH)

**WAS:** `POST /api/auth/2fa/verify` akzeptierte unbegrenzt Versuche. Ein TOTP-Code hat 6 Ziffern (1.000.000 Moeglichkeiten), ein gueltiges Fenster von 30–90 Sekunden.

**WARUM GEFAEHRLICH:** Mit ~1.000 Requests pro Sekunde war ein Code in unter einer Minute erratbar. Der Endpunkt aktivierte 2FA — ein Angreifer mit Session-Cookie konnte das Opfer aussperren.

**FIX:** Rate-Limit: 5 Versuche pro 5 Minuten pro IP (Scope `2fa-verify`). Zusaetzlich: der Code wird jetzt mit `/^\d{6}$/` gegen Nicht-Ziffern geprueft.

**Datei:** `src/app/api/auth/2fa/verify/route.ts`

---

## Befund 4: 2FA-Setup ohne Rate-Limit

**WAS:** `POST /api/auth/2fa/setup` erzeugte bei jedem Aufruf ein neues TOTP-Secret. Kein Rate-Limit.

**FIX:** Rate-Limit: 10 Aufrufe pro Stunde pro IP (Scope `2fa-setup`).

**Datei:** `src/app/api/auth/2fa/setup/route.ts`

---

## Befund 5: Super-Admin-Upload ohne MIME-, Groessen- und Bucket-Validierung (HOCH)

**WAS:** `uploadImage()` in `src/modules/super-admin/super-admin.actions.ts` akzeptierte jede Datei: kein MIME-Check, kein Groessenlimit, die Extension kam aus dem Dateinamen, der Bucket aus dem Request ohne Whitelist.

**WARUM GEFAEHRLICH:** Ein kompromittiertes Super-Admin-Konto konnte HTML-Dateien mit JavaScript hochladen, die Supabase Storage als `text/html` auslieferte — Stored XSS ueber den CDN-Link.

**FIX:** MIME-Whitelist (`image/jpeg`, `image/png`, `image/webp`), 5-MB-Limit, Extension aus dem validierten MIME-Typ, Bucket-Whitelist (`app-assets`, `salon-images`, `gallery`).

**Datei:** `src/modules/super-admin/super-admin.actions.ts`

---

## Befund 6: Miet-Buchung prueft Vergangendatum in UTC statt Berlin-Zeit (MITTEL)

**WAS:** `POST /api/rental-bookings` und `/api/rental-bookings/[id]/cancel` benutzten `new Date().toISOString().slice(0, 10)` fuer die Tagesprüfung. Auf Vercel (UTC) ist zwischen 00:00 und 02:00 Berliner Zeit noch der Vortag.

**WARUM GEFAEHRLICH:** In diesem taeglichen Zweistundenfenster konnte eine Mietbuchung fuer ein bereits vergangenes Datum angelegt werden. Die Stornierungspruefung ("bereits begonnen") schlug im selben Fenster fehl.

**FIX:** `berlinToday()` aus `src/lib/berlin-time.ts` statt `new Date().toISOString().slice(0, 10)`. Der Termin-Buchungspfad nutzte `berlinWallClockToUtc()` bereits korrekt.

**Dateien:** `src/app/api/rental-bookings/route.ts`, `src/app/api/rental-bookings/[id]/cancel/route.ts`

---

## Befund 7: Ueber 40 Routen gaben rohe DB-Fehlermeldungen an den Client zurueck (MITTEL)

**WAS:** Muster wie `return NextResponse.json({ error: error.message }, { status: 500 })` leiteten Supabase/PostgREST-Fehlertexte ungefiltert weiter. Diese enthalten Tabellennamen, Spaltennamen, RLS-Policy-Namen und PostgreSQL-Fehlercodes.

**WARUM GEFAEHRLICH:** Ein Angreifer konnte aus den Fehlermeldungen das Datenbankschema und die Sicherheitsregeln rekonstruieren — wertvolles Aufklaerungsmaterial fuer gezielte Angriffe.

**FIX:** Neue Hilfsfunktion `dbError(label, error)` in `src/lib/api-wrapper.ts`. Loggt Code und Message serverseitig via `console.error`, gibt dem Client nur `'Interner Fehler'` zurueck. Angewendet auf alle 40+ Stellen in 25 Dateien:

- Nicht-Admin: `notifications`, `push/subscribe`, `push/send`, `analytics/events`, `auth/2fa/setup`, `auth/2fa/verify`, `compliance` (3 Dateien), `messages/[conversationId]`, `owner/authorities-pack`, `owner/documents`, `upload`, `uploads`, `errors`, `account/delete`, `setup/promote-admin`
- Admin: `admin/route`, `admin/tickets/[id]`, `admin/affiliate/products`, `admin/documents/[id]`, `admin/newsletter/campaigns`, `admin/newsletter/subscribers`, `admin/refund`

---

## Befund 8: ILIKE-Wildcard-Injection in Newsletter-Suche (NIEDRIG)

**WAS:** `GET /api/admin/newsletter/subscribers` interpolierte den `q`-Parameter direkt in `.ilike('email', '%${q}%')` ohne Entfernung von `%` und `_`.

**FIX:** `%`, `_` und `\` werden vor der Interpolation entfernt. Leerer Suchbegriff ueberspringt den Filter.

**Datei:** `src/app/api/admin/newsletter/subscribers/route.ts`

---

## Befund 9: Fehlende UUID-Validierung auf Pfad- und Query-Parametern (MITTEL)

**WAS:** Etwa 10 Routen akzeptierten beliebige Strings als UUIDs — der Wert landete in `.eq('id', ...)` und erzeugte einen PostgreSQL-Fehler `22P02`, dessen Meldung oft an den Client weitergegeben wurde.

**FIX:** UUID-Regex `/^[0-9a-f]{8}-…$/i` am Eintritt jeder betroffenen Route:
- `bookings/[id]` (GET, PATCH)
- `bookings/[id]/cancel` (POST) — plus `reason`-Laengenbegrenzung auf 500 Zeichen
- `orders/[id]` (GET, PATCH) — plus Status-Whitelist, `trackingNumber` max 100, `trackingUrl` max 500, JSON-Parse-Guard
- `rental-bookings/[id]/cancel` (POST)
- `notifications` PUT — jede ID im Array wird einzeln geprueft

---

## Befund 10: Register-Provider ohne Feldlaengenbegrenzung

**WAS:** `POST /api/register-provider` hatte Zod-Validierung, aber ohne `.max()` auf den String-Feldern. Ein Angreifer konnte megabyte-grosse Werte schicken.

**FIX:** `.max()` auf alle Felder: `vn(100)`, `nn(100)`, `tel(40)`, `geschaeft(200)`, `st(200)`, `plz(12)`, `city(100)`, `kat(80)`, `cpr(20)`.

**Datei:** `src/app/api/register-provider/route.ts`

---

## Befund 11: Forgot-Password ohne E-Mail-Formatpruefung

**WAS:** `POST /api/auth/forgot-password` pruefte nur `typeof email !== 'string'`. Jeder String wurde an Supabase weitergegeben.

**FIX:** Zusaetzliche Pruefung auf Laenge (max 255) und Vorhandensein von `@`.

**Datei:** `src/app/api/auth/forgot-password/route.ts`

---

## Befund 12: Export-Route ohne Datumsformat-Validierung

**WAS:** `GET /api/provider/dashboard/export` nahm `from`- und `to`-Parameter als rohe Strings und gab sie direkt an Supabase `.gte()` und `.lte()`.

**FIX:** ISO-Datumsformat-Regex (`/^\d{4}-\d{2}-\d{2}(T…)?$/`) vor der Weitergabe.

**Datei:** `src/app/api/provider/dashboard/export/route.ts`

---

## Befund 13: Push-Endpunkte ohne Laengenbegrenzung und JSON-Guard

**WAS:** `push/subscribe` und `push/send` hatten kein Limit auf String-Feldern und keinen `try/catch` auf `req.json()`.

**FIX:**
- `push/subscribe`: JSON-Guard, `endpoint` max 2000, `p256dh` max 500, `auth` max 500
- `push/send`: JSON-Guard, UUID-Check auf `userId`, `title` max 200, `body` max 2000

**Dateien:** `src/app/api/push/subscribe/route.ts`, `src/app/api/push/send/route.ts`

---

## Befund 14: Cookie-Consent mit unkontrollierter Session-ID

**WAS:** `POST /api/cookies/consent` akzeptierte eine beliebig lange `sessionId` ohne Typ- oder Laengenpruefung als oeffentlicher Schreibendpunkt.

**FIX:** Typ- und Laengenvalidierung: String, 1–128 Zeichen.

**Datei:** `src/app/api/cookies/consent/route.ts`

---

## Befund 15: analytics/visit speichert rohe IPs — DSGVO-Inkonsistenz

**WAS:** `POST /api/analytics/visit` speicherte die rohe IP-Adresse in `visit_logs.ip`, waehrend `/api/wait-list` korrekt `hashIp()` verwendete.

**FIX:** Import von `hashIp` aus `@/lib/ip-hash`, Hash vor dem Speichern.

**Datei:** `src/app/api/analytics/visit/route.ts`

---

## Ohne Befund (geprueft)

| Bereich | Ergebnis |
|---------|----------|
| **SQL-Injection / PostgREST-Injection** | Alle Supabase-Aufrufe nutzen parametrisierte `.eq()`/`.filter()` — keine String-Interpolation ausser dem behobenen `.or()` |
| **XSS ueber nutzergenerierte Inhalte** | React escaped automatisch; `dangerouslySetInnerHTML` nur fuer JSON-LD (korrekt via `jsonLd()` escaped) und statische Magazin-Artikel |
| **Datei-Uploads (regulaer)** | `/api/upload` und `/api/uploads` validieren MIME, Groesse, Extension aus MIME, UUID-Pfade, Eigentuemerpruefung |
| **Termin-Buchung Zeitzonen** | `createBooking` nutzt `berlinWallClockToUtc()` korrekt |
| **Stripe-Webhook-Signatur** | Verifiziert, kein Betrag aus dem Request |
| **Supabase RPC** | Nur `publish_review_pair` mit benanntem Parameter, nicht interpoliert |
| **SSRF** | Einziger Outbound-Fetch zu `graph.facebook.com` mit fester URL |
| **CSP** | Enforced + Report-Only Dual-Policy, `frame-ancestors 'none'`, Violation-Reporting |
| **Session-Revalidierung** | Rolle und Flags aus der DB pro Request (15s-Cache) |
| **Overlap-Defense Mietbuchungen** | SELECT + INSERT + DB-Constraint `23P01` — TOCTOU korrekt abgefangen |

---

## Bekannte Einschraenkungen / bewusst offen

1. **Rate-Limiting ist In-Memory pro Lambda-Instanz** — kein verteilter Schutz. Bei einem gezielten Angriff mit vielen parallelen Requests trifft jede Serverless-Instanz ihren eigenen Zaehler. Fuer echten Brute-Force-Schutz muesste ein externer Store (Redis, Upstash) her. Die Middleware-Schicht in `src/middleware.ts` bietet eine zweite Ebene (60/min fuer `/api/*`, 10/min fuer `/api/auth/*`).

2. **`withApi()`-Wrapper wird nur von ~10% der Routen genutzt** — die meisten Routen implementieren try/catch manuell. Die Qualitaet schwankt: einige Routen verschlucken Fehler als 200 mit leeren Daten (Investor-Dashboard, Public-Stats, Provider-Export). Das ist kein Sicherheitsproblem, aber ein Datenintegritaets-Risiko bei DB-Ausfaellen.

3. **Meta CAPI Route (`/api/analytics/meta-capi`)** ist unauthentifiziert und hat kein Rate-Limit — nicht in diesem Track behoben, weil die Route Ad-Tracking-Events an Meta weiterleitet und die Validierung von der Meta-API-Anbindung abhaengt. Empfehlung: Rate-Limit und `event_name`-Whitelist nachrüsten.

4. **`renderMarkdown()` in `/magazin/[slug]`** nutzt `dangerouslySetInnerHTML` ohne HTML-Sanitisierung — aktuell sicher, weil der Inhalt statisch im Code liegt. Wird latent gefaehrlich, sobald Magazin-Inhalte aus der Datenbank kommen.

---

## Aenderungen im Ueberblick

| Datei | Aenderung |
|-------|-----------|
| `src/lib/api-wrapper.ts` | `dbError()` Hilfsfunktion |
| `src/modules/marketplace/marketplace.service.ts` | PostgREST-Metazeichen-Sanitisierung |
| `src/modules/super-admin/super-admin.actions.ts` | MIME/Groesse/Bucket-Validierung |
| `src/app/api/auth/register/route.ts` | Rate-Limit |
| `src/app/api/auth/2fa/verify/route.ts` | Rate-Limit + Ziffern-Check + dbError |
| `src/app/api/auth/2fa/setup/route.ts` | Rate-Limit + dbError |
| `src/app/api/auth/forgot-password/route.ts` | E-Mail-Format-Validierung |
| `src/app/api/rental-bookings/route.ts` | `berlinToday()` statt UTC |
| `src/app/api/rental-bookings/[id]/cancel/route.ts` | `berlinToday()` + UUID-Check |
| `src/app/api/bookings/[id]/route.ts` | UUID-Check |
| `src/app/api/bookings/[id]/cancel/route.ts` | UUID-Check + reason-Laenge |
| `src/app/api/orders/[id]/route.ts` | UUID-Check + Status-Whitelist + JSON-Guard |
| `src/app/api/notifications/route.ts` | UUID-Check auf IDs + NaN-Guard + dbError |
| `src/app/api/register-provider/route.ts` | Zod `.max()` auf alle Felder |
| `src/app/api/provider/dashboard/export/route.ts` | Datumsformat-Validierung |
| `src/app/api/push/subscribe/route.ts` | JSON-Guard + Laengenlimits + dbError |
| `src/app/api/push/send/route.ts` | JSON-Guard + UUID-Check + Laengenlimits + dbError |
| `src/app/api/cookies/consent/route.ts` | sessionId-Validierung |
| `src/app/api/analytics/visit/route.ts` | `hashIp()` statt rohe IP |
| `src/app/api/admin/newsletter/subscribers/route.ts` | ILIKE-Wildcard-Sanitisierung + dbError |
| 16 weitere Dateien | `dbError()` statt `error.message` (siehe Befund 7) |
