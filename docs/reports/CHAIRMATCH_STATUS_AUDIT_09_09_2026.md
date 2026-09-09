# ChairMatch — Vollständige Statusrekonstruktion

**Datum:** 09.09.2026 · **HEAD:** `8660a5c4d36ec89ebe0380cdc3082132a81b898a`
**Supabase-Projekt:** `pwdbjqfpgumyfktbfswg` · **Produktion:** https://www.chairmatch.de

> **Beweispflicht.** Jede Aussage in diesem Bericht ist entweder durch eine
> Kommandoausgabe, eine HTTP-Antwort der laufenden Instanz oder eine Codestelle
> belegt. Wo ein Beweis nicht möglich war, steht das ausdrücklich dabei —
> ungeprüfte Annahmen sind als solche gekennzeichnet und **nicht** als Status.

**Legende:** 🟢 belegt in Ordnung · 🟡 belegt eingeschränkt · 🔴 belegt kaputt/fehlend · ⚫ nicht prüfbar

---

## 0. Kurzfassung

| Bereich | Status | Kernaussage |
|---|---|---|
| Git | 🟢 | Sauber, synchron mit `origin/main`, keine offenen Änderungen |
| Typecheck | 🟢 | `tsc --noEmit` → Exit 0 |
| Unit-Tests | 🟢 | 96 Dateien, **1821 Tests, alle grün**, Exit 0 |
| ESLint | 🟢 | 0 Fehler, 13 Warnungen |
| `next build` | 🟢 | Mit gesetztem Service-Key **342/342 Seiten, Exit 0** (lokal ohne Key: Exit 1 — Umgebung, kein Codefehler) |
| CI (GitHub Actions) | 🟢 | Letzter Lauf `33949781013` **success** (05.09.2026) |
| Auth/RBAC/anon-Sperren | 🟢 | Produktionssonde: alle 21 Erwartungen erfüllt |
| Website (öffentlich) | 🟢 | 27 von 28 geprüften Routen antworten wie erwartet |
| Kalender/Verfügbarkeit | 🟢 | Live geprüft, echte Slots aus Öffnungszeiten |
| Mietsuche-API | 🔴 | **`/api/rental-listings` antwortet anonym 401** — Route ist als öffentlich gebaut, Middleware lässt sie nicht durch |
| Stripe | 🔴 | **In Produktion nicht konfiguriert** — kein Webhook-Secret, kein Publishable-Key. Zahlweg tot. |
| Abo-Modell | 🔴 | Hängt vollständig an Stripe → ebenfalls tot. Zwei widersprüchliche Stufen-Vokabulare im Code. |
| Rechnungen | 🔴 | **Existiert nicht** — kein Beleg-, Rechnungs- oder PDF-Pfad im Code |
| KYC | 🔴 | **Existiert nicht** als eigener Baustein; ausgelagert an Stripe Connect (= tot, s. o.) |
| Anti-Bypass | 🟢 | Implementiert und getestet |
| Bewertungen | 🟢 | Live funktionsfähig |
| Newsletter | 🟡 | Code vollständig, Versand extern nicht verifizierbar |
| Analytics | 🟡 | Sentry live scharf; **GA4 und Meta-Pixel ausgeliefert, aber ohne IDs → wirkungslos** |
| Datenbank-Inhalt | 🔴 | **Alle 15 Salons sind Seed-Daten** (synthetische UUIDs), 1 Buchung, 48 Bewertungen |
| Migrationen | 🔴 | 3 Migrationen committet und **nicht angewendet**; kein Runner, kein DB-Zugang |
| Preise/Provision | 🟡 | 4 Codestellen sauber markiert; **~155 literale Preisangaben auf 18 öffentlichen Seiten sind unmarkiert und live** |

---

## 1. Git-Status

### 1.1 `git log --oneline -30` (Auszug, Kopf)

```
8660a5c CM: STATUS.md + E2E-Report committed (P9.3 cleanup)
5ac29c4 RLS-Migration gehaertet, NICHT angewendet: Pre-Flight-Riegel gegen fehlendes BYPASSRLS …
9b0d714 STATUS.md nach P3-Deploy regeneriert
0a3635b P3: Salon-Onboarding bekommt eine Rueckseite — Wizard-Entwuerfe werden zu Salon, Leistungen und Inseraten
22ccde3 Alle hartkodierte Preise und Provisionssaetze mit BUSINESS_DECISION_REQUIRED markiert
f618099 feat: host-health-guard.sh + HOST_HEALTH_RUNBOOK.md — P0 Host Health Monitoring
eee867e fix: Code-Qualitaet + Barrierefreiheit — 31 Icon-Buttons und 71 Formularfelder bekommen Namen …
1ed7c4e Track D: Das Passwort-Orakel wird gedrosselt, gesperrte Anbieter verschwinden aus dem Matching
74245f2 Track C: Bericht
2cb81e7 Track C (5/n): Der Build-Fehler, den nur Vercel sieht, faellt jetzt vorher auf
```

**HEAD im Detail**

| Feld | Wert |
|---|---|
| Voller Hash | `8660a5c4d36ec89ebe0380cdc3082132a81b898a` |
| Autor | Yusuf |
| Datum | 2026-09-05 08:25:34 +0200 |
| Betreff | `CM: STATUS.md + E2E-Report committed (P9.3 cleanup)` |

### 1.2 `git status` 🟢

```
## main...origin/main
```

Keine unversionierten, keine geänderten, keine gestagten Dateien.

### 1.3 Lokal vs. Remote 🟢

```
$ git rev-list --left-right --count origin/main...HEAD
0	0
```

Null Commits voraus, null zurück. `origin` = `git@github.com:YusufFerhatDemir/chairmatch.git`.

### 1.4 `git branch -a` 🟡

`main` ist aktuell. Daneben liegen **13 verwaiste `claude/*`-Branches** plus ein
Backup-Branch. Der jüngste davon ist vom **25.05.2026** — also über drei Monate alt:

```
2026-02-25 origin/claude/prepare-app-publication
2026-02-25 origin/claude/test-booking-buttons-L9OX0
2026-02-26 origin/claude/merge-to-main-8ay6X
2026-02-27 origin/claude/deploy-icons-8ay6X
2026-03-02 origin/claude/investigate-current-status-8ay6X
2026-04-20 origin/claude/bold-morse-5cf5cb
2026-05-15 origin/claude/sleepy-moore-e3e244
2026-05-15 origin/claude/inspiring-jepsen-5cef28
2026-05-15 origin/backup-pre-rollback-20260515
2026-05-23 origin/claude/stupefied-chatterjee-32478a
2026-05-23 origin/claude/nostalgic-meitner-6eda3d
2026-05-25 origin/claude/sad-shtern-a08721
2026-05-25 origin/claude/dazzling-poitras-3c8719
2026-09-05 origin/main
```

**Risiko:** `.github/workflows/auto-create-pr.yml` merged **jeden Push auf einen
`claude/**`-Branch automatisch nach `main`** — ohne Review, ohne CI-Gate. Ein
versehentlicher Push auf einen dieser alten Branches würde drei Monate alten
Stand nach `main` mergen und damit einen Produktionsdeploy auslösen.

---

## 2. CI/CD — Beweise

### 2.1 `npm run typecheck` 🟢

```
> chairmatch@6.0.0 typecheck
> tsc --noEmit

TYPECHECK EXIT=0
```

### 2.2 `npm test` (vitest) 🟢

```
 Test Files  96 passed (96)
      Tests  1821 passed (1821)
   Start at  14:56:08
   Duration  89.18s (transform 41.33s, setup 47.50s, import 120.06s,
                     tests 57.88s, environment 169.29s)

VITEST EXIT=0
```

### 2.3 `npm run lint` 🟢

```
✖ 13 problems (0 errors, 13 warnings)
```

Die 13 Warnungen sind `react/no-danger` (JSON-LD-Einbettung) und
`@next/next/no-img-element`. Keine Fehler.

**Hinweis:** `next.config.ts` hat `eslint: { ignoreDuringBuilds: true }` — der
Vercel-Build prüft **kein** ESLint. Der einzige automatische Lint-Lauf ist der
CI-Schritt in `.github/workflows/ci.yml`.

### 2.4 `npm run build` 🟢 (mit Beweis-Gegenprobe)

**Erster Lauf, lokal, `.env.local` wie sie ist → Exit 1:**

```
 ✓ Compiled successfully in 6.5min
   Generating static pages (85/342)
Error occurred prerendering page "/category/arzt".
Error: Kategorie konnte nicht geladen werden
Export encountered an error on /(public)/category/[categoryId]/page: /category/arzt, exiting the build.
 ⨯ Next.js build worker exited with code: 1
BUILD EXIT=1
```

**Ursache, im Log wörtlich, 28×:**

```
Error: SUPABASE_SERVICE_ROLE_KEY fehlt — getSupabaseAdmin() faellt bewusst
NICHT auf den Anon-Key zurueck. Env-Variable in Vercel/.env.local setzen.
```

`.env.local` enthält **keinen** `SUPABASE_SERVICE_ROLE_KEY` (nachgesehen: die
Datei hat nur `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_*` und die beiden
öffentlichen Supabase-Werte). Die Seite `/category/[categoryId]` ist mit
`dynamicParams = false` vorgeneriert und wirft bei fehlender DB — 18 andere
Stellen (`[stadt]`, `offers`, `statistik`) fangen den Fehler ab und degradieren.

**Gegenprobe mit Platzhalter-Schlüssel → Exit 0:**

```
$ SUPABASE_SERVICE_ROLE_KEY="…platzhalter…" npm run build
 ✓ Compiled successfully in 8.6s
 ✓ Generating static pages (342/342)
BUILD-PLATZHALTER EXIT=0
```

**Urteil:** Der Build ist **in Ordnung**. Der lokale Fehlschlag ist ein reines
Umgebungsproblem der Arbeitsstation, kein Codefehler. Bestätigt durch die
Produktion: `https://www.chairmatch.de/category/arzt` → **HTTP 200**, und der
Antwortkopf trägt `x-nextjs-prerender: 1` — die Seite wurde auf Vercel
erfolgreich vorgeneriert.

### 2.5 Letzter CI-Lauf 🟢

```
$ gh run list --limit 10
completed  success    CM: STATUS.md + E2E-Report committed (P9.3 cleanup)   CI   main   33949781013   1m29s   2026-09-05T06:25:38Z
completed  success    RLS-Migration gehaertet, NICHT angewendet …           CI   main   33845665019   8m12s   2026-09-04T06:45:01Z
completed  success    STATUS.md nach P3-Deploy regeneriert                  CI   main   33627284846   1m37s   2026-09-02T11:57:15Z
completed  cancelled  P3: Salon-Onboarding bekommt eine Rueckseite …        CI   main   33627224606   1m8s    2026-09-02T11:56:34Z
completed  success    Alle hartkodierte Preise … BUSINESS_DECISION_R…       CI   main   33599939450   1m35s   2026-09-02T06:40:56Z
```

Der `cancelled`-Lauf ist kein Fehlschlag: `concurrency.cancel-in-progress: true`
bricht ältere Läufe desselben Branches ab.

**Was CI prüft:** `npx tsc --noEmit` → `npx vitest run` → `npm run lint`.
**Was CI NICHT prüft:** `npm run build` und `npm run test:e2e` (Playwright).
Der einzige `next build` läuft auf Vercel.

### 2.6 E2E-Tests (Playwright) 🟡

`playwright.config.ts` mit 4 Spec-Dateien (`e2e/api|home|protected-pages|public-pages.spec.ts`),
`webServer: npm run dev -- -p 3000`. **Läuft in keiner Automatisierung** — weder
in CI noch in `deploy.sh`. Nicht Teil der 1821 grünen Tests.

---

## 3. Projektstruktur

| Einheit | Anzahl |
|---|---|
| API-Routen (`route.ts`) | **107** |
| Seiten (`page.tsx`) | **135** |
| Komponenten (`src/components/**.tsx`) | **82** |
| Fachmodule (`src/modules/`) | **8** — `auth`, `booking`, `marketplace`, `onboarding`, `provider`, `rentals`, `reviews`, `super-admin` |
| Bibliotheksdateien (`src/lib/`) | **95** |
| Testdateien | **96** |
| Migrationsdateien | **41** |

**Route-Gruppen:** `(admin)` 24 Seiten · `(public)` ~80 · `(protected)` 5 ·
`(provider)` 3 · `(owner)` 4 · `(investor)` 3 · `(auth)` 4

**Migrationen (`supabase/migrations/`, chronologisch):** von
`20260307_ensure_tables.sql` bis `20260902_rls_restliche_tabellen.sql`, dazu
`_BUNDLED_FOR_PROD.sql`, `_OFFEN_2026-08-24.sql` und ein `rollback/`-Verzeichnis.

---

## 4. Features — einzeln geprüft

### 4.1 Website chairmatch.de 🟢

28 Routen live abgefragt, Ergebnis:

```
  /                            200      /sitemap.xml                 200
  /explore                     200      /robots.txt                  200
  /search                      200      /api/public-stats            200
  /shop                        200      /api/rental-listings         401  ← siehe 4.5
  /magazin                     200      /api/products                200
  /rentals                     200      /api/availability            400 (ohne Parameter korrekt)
  /karte                       200      /api/salons/x                404 (korrekt)
  /match                       200      /salon/naillab-by-lena       200
  /premium                     200      /statistik                   200
  /preisvergleich              200      /pitch                       200
  /faq                         200      /investor                    307 → /auth
  /impressum                   200      /konto                       200
  /datenschutz                 200      /termine                     307 → /auth
  /agb                         200      /nachrichten                 307 → /auth
```

Zusätzlich: gültiges TLS, HSTS `max-age=63072000; includeSubDomains; preload`,
vollständige CSP mit `frame-ancestors 'none'` und `object-src 'none'`.

### 4.2 Kunden-Bereich 🟢

`/account`, `/favorites`, `/booking/*` liegen in der Route-Gruppe `(protected)`.
Produktionssonde:

```
  ✓ /account → 307 /auth        ✓ /favorites → 307 /auth
```

`/konto` ist bewusst öffentlich (Login/Register-Seite). **Bekannte Altlast:**
`/konto` meldet über `supabase.auth` an, das Backend prüft NextAuth — zwei
getrennte Auth-Systeme (siehe Abschnitt 7.2).

### 4.3 Shop / Owner 🟢

`/shop`, `/shop/[slug]`, `/api/products` sind öffentlich und antworten mit 200.
Bestellstrecke: `/api/cart`, `/api/orders`, `/api/orders/[id]`.
`(owner)`-Bereich (`/owner`, `/owner/authorities`, `/owner/compliance`,
`/owner/locations`) hinter Rollenprüfung `ownerPaths` in der Middleware.
Preisquelle serverseitig in `createOrder` (`unit_price_cents`) — kein
Client-Preis. **Der Checkout selbst hängt an Stripe und ist damit tot (4.8).**

### 4.4 Freelancer / Provider 🟢 (Zugang) · 🟡 (Auszahlung)

`(provider)`-Gruppe plus 12 Seiten unter `/anbieter/mein-salon/*`
(Beschreibung, Services, Zeiten, Galerie, Logo, Zertifikate, Termine,
Bewertungen, Auszahlung). Produktionssonde:

```
  ✓ /provider → 307 /auth
```

Der Auszahlungspfad (`/anbieter/mein-salon/auszahlung`, `/api/me/payout-account`,
`/api/stripe/connect`) setzt Stripe Connect voraus → siehe 4.8.

### 4.5 Kalender / Buchungen 🟢 — mit einem 🔴 Nebenbefund

**Live geprüft, funktioniert:**

```
$ curl '…/api/availability?salonId=cccccccc-0000-4000-a000-000000000004
        &serviceId=dddddddd-0401-4000-a000-000000000000&date=2026-09-15'
{"slots":["09:00","09:15","09:30", … ,"17:00"],"durationMinutes":60}
  → HTTP 200
```

33 echte Slots, abgeleitet aus den Öffnungszeiten des Salons
(`{"mo":{"open":"09:00","close":"18:00"}, …}`). Öffnungszeiten- und
Feiertagsriegel sind seit Track 25 serverseitig in `createBooking`.

Zwei Buchungs-Oberflächen bestehen weiter parallel (`/booking/[salonId]` und
`/salon/[slug]/buchen`); beide fragen dieselbe `/api/availability`.

#### 🔴 P1 — `/api/rental-listings` ist anonym nicht erreichbar

```
$ curl -i https://www.chairmatch.de/api/rental-listings
HTTP 401
{"error":"Nicht authentifiziert","code":"UNAUTHORIZED"}

$ curl -o /dev/null -w '%{http_code}' '…/api/rental-listings?city=Berlin'
401
```

Die Route ist im Kopfkommentar von `src/app/api/rental-listings/route.ts`
ausdrücklich als öffentlich beschrieben:

> „Bewusst oeffentlich (keine Session noetig): Inserate sind oeffentliche Ware,
> und die Route liefert ausschliesslich Felder, die auch auf der Detailseite
> stehen — keine Besitzer-IDs, keine Kontaktdaten."

In `src/middleware.ts` steht sie **weder in `publicPaths` noch in
`publicPrefixes`** — der Default-Deny greift. Betroffen sind drei Seiten, die
selbst über den öffentlichen Präfix `/mieter/` erreichbar sind (alle live 200):

| Seite | Aufruf |
|---|---|
| `src/app/(public)/mieter/mein-bereich/suchen/page.tsx:83` | `/api/rental-listings?limit=100` |
| `src/app/(public)/mieter/mein-bereich/angebote/page.tsx:44` | `/api/rental-listings?limit=100` |
| `src/app/(public)/mieter/mein-bereich/favoriten/page.tsx:68` | `/api/rental-listings?ids=…` |

**Warum die 1821 grünen Tests das nicht sehen:** `route.e2e.test.ts` und
`gesperrter-salon.test.ts` importieren den Handler direkt
(`import { GET as rentalListingsRoute } from '@/app/api/rental-listings/route'`)
und laufen damit an der Middleware vorbei. `src/__tests__/middleware-public-paths.test.ts`
führt Positiv- und Negativliste, `/api/rental-listings` steht in **keiner** von beiden.

**Behebung:** ein Eintrag `'/api/rental-listings'` in `publicPaths` plus eine
Zeile in der Middleware-Testdatei. Nicht in diesem Audit ausgeführt — Auditlauf,
kein Änderungslauf.

### 4.6 Preise / Provision 🟡

**Sauber markiert (7 Fundstellen, Commit `22ccde3`):**

| Datei | Inhalt |
|---|---|
| `src/lib/marketplace-rules.ts:24` | Provisionssätze (0 % Buchung, 10 % Stuhl, 8 % OP-Raum, 100 % Affiliate) |
| `src/lib/marketplace-rules.ts:41` | Abo-Preise (49 € / 99 €) |
| `src/lib/constants.ts:59` | Alle Preise im Service-Katalog |
| `src/lib/constants.ts:137` | Alle Stundensätze im Equipment-Katalog |
| `src/lib/constants.ts:211` | Provisions-Bandbreiten |
| `src/modules/marketplace/commission.service.ts:13` | Notfall-Provisionssatz |
| `src/app/(public)/statistik/page.tsx:199` | „0 % Provision" |

#### 🟡 Lücke: ~155 literale Preisangaben auf 18 öffentlichen Seiten, unmarkiert und live

```
  preisvergleich/page.tsx          22 literale Preisangaben   Marker: 0
  longevity/page.tsx               21                          Marker: 0
  zahnimplantate/page.tsx          18                          Marker: 0
  iv-infusionen/page.tsx           17                          Marker: 0
  haartransplantation/page.tsx     15                          Marker: 0
  augenlasern/page.tsx             15                          Marker: 0
  freelancer-rechner/page.tsx      12                          Marker: 0
  premium/page.tsx                  6                          Marker: 0
  anbieter/onboarding/page.tsx      6                          Marker: 0
  register/anbieter/page.tsx        5                          Marker: 0
  … 8 weitere Dateien
```

Zwei Klassen, die man auseinanderhalten muss:

1. **Marktpreis-Behauptungen** (`/preisvergleich`, die Medical-Beauty-Seiten).
   Beispiel `preisvergleich/page.tsx:14` — live ausgeliefert:

   > „Stuhlmiete Kosten im Überblick: Friseurstuhl mieten ab 25 €/Tag …
   > **Live-Marktpreise aus echten Inseraten** + Break-Even-Rechner."

   Die Zahlen sind **hartkodiert im Seitenquelltext**, nicht aus Inseraten
   berechnet. Es gibt live 15 Seed-Salons und 1 Buchung (Abschnitt 5.3).
   Die Formulierung „Live-Marktpreise aus echten Inseraten" beschreibt damit
   nichts, was existiert.

2. **Verdienstversprechen** (`register/anbieter/page.tsx:21–60`):
   „Zusatzeinnahmen · ca. 80–150 €/Tag", „ca. 250–500 €/Tag" — auf der
   öffentlichen Anbieter-Registrierung, ohne Quelle und ohne Marker.

**Konsequenz für die Geschäftsführung:** die Markierung aus `22ccde3` deckt die
Konfigurationswerte im Code ab, aber **nicht die Zahlen, die Besucher tatsächlich
lesen.** Keine davon wurde in diesem Audit geändert oder ergänzt.

### 4.7 Abos 🔴

- Stufen-Vokabular **widersprüchlich**: `src/lib/marketplace-rules.ts:33`
  definiert `'free' | 'premium' | 'gold'`, während
  `src/lib/subscription-tier.ts:12`, `src/lib/types.ts:48`, `src/lib/stripe.ts:114`
  und die **Live-Datenbank** `'starter' | 'premium' | 'gold'` führen
  (live nachgesehen: `"subscription_tier":"starter"` in `/api/salons/naillab-by-lena`).
- `SUBSCRIPTION_TIERS` aus `marketplace-rules.ts` (mit 49 €/99 €) wird
  **nirgends importiert** — aus dieser Datei nutzt nur der Stripe-Webhook
  `calculateCommission`. Die Abo-Preistabelle ist tote Konfiguration.
- Die Freischaltung läuft über `tierForPriceId()` gegen `STRIPE_PRICE_STARTER/PREMIUM/GOLD`.
  Diese fehlen in Produktion (4.8) → `configuredPrices()` liefert dreimal `null`
  → `tierForPriceId()` liefert immer `null` → **keine Stufe kann je vergeben werden.**

### 4.8 Stripe 🔴 — in Produktion nicht konfiguriert (BLOCKED_EXTERNAL)

**Beweis 1 — serverseitig, über den öffentlichen Webhook.** Die Route
unterscheidet drei Zustände (`src/app/api/stripe/webhook/route.ts:729–751`):
ohne Signatur 400, ohne `STRIPE_WEBHOOK_SECRET` 500 „Webhook not configured",
ohne `STRIPE_SECRET_KEY` 503, sonst 400 „Invalid signature".

```
$ curl -X POST …/api/stripe/webhook -d '{}'
{"error":"Missing signature"}                 → HTTP 400

$ curl -X POST …/api/stripe/webhook -H 'stripe-signature: t=1,v1=00' -d '{}'
{"error":"Webhook not configured"}            → HTTP 500
```

Die zweite Antwort ist eindeutig: **`STRIPE_WEBHOOK_SECRET` ist in der
Produktion nicht gesetzt.**

**Beweis 2 — clientseitig.** 18 JS-Chunks der Startseite (1.058.091 Byte) und
18 Chunks der Zahlungsseite `/salon/…/buchen/zahlen` (964.299 Byte) heruntergeladen
und durchsucht: **kein einziges `pk_test_` oder `pk_live_`.**
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ist ebenfalls nicht gesetzt.

**Was das bedeutet:**

| Strecke | Zustand |
|---|---|
| Termin-Checkout | tot |
| Shop-Bestellung | tot |
| Miet-Checkout | tot |
| Stripe Connect (Anbieter-Auszahlung) | tot |
| Abo-Freischaltung | tot |
| Erstattung `/api/admin/refund` | tot |
| Provisionsbuchung `platform_transactions` | wird nie erreicht |

**Der Code selbst ist auf diesen Zustand vorbereitet** — `stripeUnavailable()`
in `src/lib/stripe-availability.ts` liefert an allen Einstiegen ein sauberes 503
mit der Nutzertext-Meldung „Online-Zahlung ist derzeit nicht verfügbar", statt
einen 500 zu werfen. Der Webhook antwortet bewusst 5xx statt 4xx, damit Stripe
später wiederholt statt zu verwerfen. Es fehlen **ausschließlich die 6
Umgebungsvariablen** in Vercel:
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PREMIUM`, `STRIPE_PRICE_GOLD`.

> Auftragsgemäß wurden **keine Stripe-Konten angelegt** und keine Schlüssel
> erzeugt. Das ist eine Klick-Aktion für yusuf im Stripe- und Vercel-Dashboard.

### 4.9 Rechnungen 🔴 — nicht vorhanden

Gesucht in `src/lib` und `src/modules` nach Rechnungs-, Beleg- und PDF-Erzeugung.
Gefunden wurden ausschließlich: `content-disposition.ts` (Download-Header),
`csv.ts` (Export), `vertrag/vertrag-template.ts` (Mietvertrags-Generator für
`/vertrag-generator`). **Es gibt keinen Rechnungs- oder Belegpfad** — keine
Rechnungsnummern, kein PDF, keine Umsatzsteuerausweisung, kein Rechnungsarchiv.
Für einen Marktplatz mit Provisionsabrechnung ist das eine offene
Grundfunktion, nicht ein Detail.

### 4.10 KYC 🔴 — nicht vorhanden

Volltextsuche nach `kyc` über `src/`: **null Treffer.** Es gibt weder
Identitätsprüfung noch Gewerbenachweis-Workflow. Die vorhandenen Bausteine
decken etwas anderes ab:

- `/anbieter/mein-salon/zertifikate` — Datei-Upload für Zertifikate,
  `is_public = false`, keine Prüfung
- `salons.is_verified` / `is_active` — manuelle Freischaltung durch Admin
  unter `/admin/anbieter`
- Echte Identitäts- und Bankprüfung wäre **Stripe Connect Express**
  (`createConnectAccount` in `src/lib/stripe.ts`) — und die ist tot (4.8).

### 4.11 Anti-Bypass 🟢

`src/lib/anti-bypass.ts` mit eigener Testdatei
(`src/lib/__tests__/anti-bypass.test.ts`). Regex-Erkennung von Telefonnummern
(inkl. Leerzeichen-Trick `1 5 x`), E-Mail-Adressen und Fremd-URLs im
In-App-Messaging. Die URL-Regel wurde gegen Lookalike-Domains gehärtet:
`https://chairmatch.de.evil.com/phish` galt vorher als eigene Domain und lief
ungeprüft durch. Jetzt muss auf den Hostnamen direkt ein Host-Ende folgen.

### 4.12 Bewertungen 🟢

```
$ curl '…/api/reviews/aggregate?salonId=cccccccc-0000-4000-a000-000000000004'
{"avgRating":4.666666666666667,"reviewCount":3}   → HTTP 200
```

Modul `src/modules/reviews/` (actions, schemas, service, types). Beidseitige
Bewertungen (Mieter ↔ Vermieter), Antwortfunktion, DSA-Meldung,
14-Tage-Freischaltung über `/api/cron/publish-reviews` (Vercel-Cron 03:30).
Live insgesamt 48 Bewertungen.

### 4.13 RLS / Security 🟢 (was messbar ist)

**Produktionssonde — 21 von 21 Erwartungen erfüllt:**

```
Erreichbarkeit
  ✓ Startseite 200
Geschuetzte Seiten leiten auf /auth um
  ✓ /account ✓ /favorites ✓ /admin ✓ /provider ✓ /admin/anbieter ✓ /admin/kpi   (alle 307)
Admin-Schnittstelle ohne Anmeldung
  ✓ /api/admin/kpi ✓ /api/admin/mis ✓ /api/admin/health ✓ /api/admin/export
  ✓ /api/admin/refund ✓ /api/admin/commissions ✓ /api/admin/tickets            (alle 401)
anon-Key auf gesperrten Tabellen
  ✓ push_subscriptions ✓ notification_log ✓ wait_list ✓ cookie_consents
  ✓ rental_equipment ✓ rental_bookings ✓ payout_accounts ✓ profiles            (alle 401)

Alle Erwartungen erfuellt.      PROBE EXIT=0
```

**Negativtest anon-Lesen — 0 von 9 durchgefallen:**

```
  BESTANDEN  newsletter_sends · newsletter_campaigns · payout_accounts
             tenant_profiles · rental_requests · rental_request_dedupe
             user_uploads · staff · user_2fa            (alle HTTP 401)
  ERGEBNIS: bestanden.
```

**Eigene Zusatzprobe auf die 9 Zieltabellen der offenen RLS-Migration + `salon_images`:**

```
  salons 401 · services 401 · bookings 401 · booking_policies 401 · staff 401
  promo_codes 401 · rental_bookings 401 · error_logs 401 · newsletter_sends 401
  salon_images 401 · analytics_events 401
```

**Einzige anon-lesbare Tabelle, die dabei gefunden wurde:**

```
  categories           200
```

`categories` trägt den Kategoriekatalog (Slug, Label, Beschreibung) und steht
ohnehin auf jeder öffentlichen Seite. Keine personenbezogenen Daten, kein
Freischalt-Flag — nach heutigem Stand unbedenklich, aber es ist die einzige
Tabelle im Schema `public`, die dem öffentlichen Schlüssel noch antwortet, und
gehört damit bewusst so entschieden statt übersehen.

Sicherheitsbausteine im Code: NextAuth mit `__Secure-`-Cookie-Präfix,
2FA (TOTP), Sitzungswiderruf über `audit_logs.SESSION_REVOKED` + `token.loginAt`,
Rollen-RBAC in Middleware **und** in jeder Route, Rate-Limits pro IP und pro
Konto, CSP mit Nonce, SSRF-Positivliste für Web-Push-Endpunkte,
RFC-8291-Verschlüsselung der Push-Nutzdaten.

#### ⚫ Nicht prüfbar: die `authenticated`-Rolle

Alle Proben oben laufen mit dem **anon**-Schlüssel. Der eigentliche Schaden
einer fehlenden RLS liegt bei der Rolle `authenticated`: besteht dort ein
Tabellen-GRANT und ist RLS aus, kann jedes angemeldete Konto mit seinem eigenen
JWT direkt unter `/rest/v1/<tabelle>` an der Anwendungslogik vorbei lesen und
schreiben. Das braucht ein echtes Nutzer-JWT und **ist in diesem Audit nicht
gemessen worden.**

#### ⚫ Zur Angabe „6 Tabellen bekamen gerade service_role policies"

**Von hier aus nicht verifizierbar, weder bestätigt noch widerlegt.** Belege:

| Zugangsweg | Ergebnis |
|---|---|
| Service-Role-Key aus `.env.prod` | **HTTP 401** — tot (rotiert) |
| `psql "$DATABASE_URL"` | vom Berechtigungssystem der Sitzung **blockiert** |
| Supabase CLI | installiert, aber ohne Access-Token |
| Supabase MCP | nicht verfügbar |
| Repo (`git log`, `supabase/migrations/`) | **kein Commit und keine Migration**, die service_role-Policies auf 6 Tabellen anlegt |
| `docs/MIGRATION_LEDGER.md` | kein entsprechender Eintrag unter „Applied Entries" |

Falls die Änderung im Supabase-Dashboard vorgenommen wurde, existiert sie
**nur dort** und nicht im Repo — damit ist sie bei einem Rebuild der Datenbank
verloren und für jede spätere Sitzung unsichtbar. Sie gehört als Migration
committet und in den Ledger.

### 4.14 Newsletter 🟡

Vollständige Strecke vorhanden: `/api/newsletter` (Anmeldung),
`/api/newsletter/unsubscribe`, `/api/newsletter/webhook` (Resend-Zustellstatus),
`/unsubscribe` (DSGVO, ohne Login), Admin unter `/admin/newsletter` mit
Kampagnen, Test-Versand, Abonnenten-Import. Der Doppelversand ist seit Track 20
über Compare-and-Swap auf `status` abgesichert (409 statt zweitem Volllauf).

**Nicht geprüft:** ob Resend in Produktion konfiguriert ist. Ein Test hätte
einen echten Datenbankeintrag oder eine echte Mail erzeugt — für ein Audit
unzulässig. `RESEND_*` ist in `.env.example` dokumentiert.

### 4.15 Analytics 🟡

| Baustein | Zustand | Beweis |
|---|---|---|
| **Sentry** | 🟢 **live scharf** | DSN im ausgelieferten Bundle gefunden: `…@o4511399051264000.ingest…` |
| **GA4** | 🔴 **wirkungslos** | `googletagmanager` und `gtag/js` sind im Bundle — aber **keine `G-…`-ID**. `GA4.tsx:15` rendert nur bei gesetztem `NEXT_PUBLIC_GA4_MEASUREMENT_ID`. |
| **Meta-Pixel** | 🔴 **wirkungslos** | `fbq`, `fbevents`, `connect.facebook.net` im Bundle — **keine Pixel-ID**. |
| **Eigene Analytik** | 🟢 | `/api/analytics/events`, `/visit`, `/vitals`, `/meta-capi`; `analytics_events` ist anon gesperrt (seit 27.08.2026) |
| **Consent** | 🟢 | Consent Mode v2, `/cookie-settings`, `/api/cookies/consent` mit HMAC-IP statt Klartext-IP |

Der Code ist also fertig verdrahtet und wartet auf zwei Umgebungsvariablen.
Die Meta-CAPI-Route ist gegen erfundene `Purchase`-Ereignisse abgesichert
(Positivliste aus 12 Ereignissen, 60/min/IP).

---

## 5. Datenbank

### 5.1 Welche Tabellen existieren 🟢

`scripts/schema-probe.sh` gegen die laufende Instanz — **33 Tabellen bestätigt,
und die Sonde meldet: „Live-Schema deckt sich mit `src/test/live-schema.ts`."**

```
rental_requests · rental_request_dedupe · email_delivery_log · rental_equipment
notification_log · push_subscriptions · wait_list · cookie_consents
user_uploads · salons · bookings · booking_policies · staff · consents
audit_logs · promo_codes · rental_bookings · favorites · profiles
conversations · conversation_participants · messages · error_logs · visit_logs
salon_images · services · documents · authorities_packs · submission_tickets
newsletter_subscribers · newsletter_campaigns · newsletter_sends · analytics_events
```

Dazu Shop-Tabellen aus `live-schema.ts` (`products`, `product_variants`,
`cart_items`, `orders`, `order_items`, `sellers`) sowie `payout_accounts`,
`tenant_profiles`, `user_2fa`, `login_attempts`, `consent_logs`,
`platform_transactions`, `payments`, `categories`.

**Wichtig:** `supabase/migrations/*` ist für dieses Projekt **nicht die Wahrheit**.
Das Live-Schema weicht ab; maßgeblich sind `scripts/schema-probe.sh` und
`src/test/live-schema.ts`.

### 5.2 RLS-Status 🔴 — drei Migrationen offen

| Migration | Track | Inhalt | Status |
|---|---|---|---|
| `20260828170738_benachrichtigungswege_haertung.sql` | CM23 | `push_subscriptions.updated_at`, arbiterfähiger UNIQUE auf `wait_list(email,city)`, 6 CHECK-Constraints | **Schema-Teil offen** (REVOKE-Teil live wirksam) |
| `20260830_services_anon_lockdown.sql` | CM24 | `services` + `salon_images` für `anon` sperren | **offen** (Wirkung inzwischen anderweitig da: beide live 401) |
| `20260902_rls_restliche_tabellen.sql` | P3 | `ENABLE` + `FORCE ROW LEVEL SECURITY` und `REVOKE ALL FROM PUBLIC, anon, authenticated` auf 9 Tabellen | **offen** |

Die P3-Migration ist gehärtet (Commit `5ac29c4`): Pre-Flight-Riegel, der
abbricht, falls `service_role` das Attribut `BYPASSRLS` fehlt — ohne diesen
Riegel würde `FORCE RLS` ohne Policies die Anwendung im selben Moment
stilllegen, in dem sie sie absichert. Die Annahme „alles läuft über
service_role" ist ausgezählt: **70 Dateien**, alle über `getSupabaseAdmin()`.

**Warum offen:** es gibt in diesem Projekt **keinen Migrations-Runner** und für
Agenten **keinen DB-Schreibzugang** (siehe Tabelle in 4.13). Zuletzt angewendet:
`20260828230000` (CM22, `PROVEN_LIVE` im Ledger).

### 5.3 Testdaten vs. reale Daten 🔴 — es sind Testdaten

```
$ curl …/api/public-stats
{"users":51,"salons":15,"bookings":1,"reviews":48,"cities":7,
 "cityList":["Berlin","Düsseldorf","Frankfurt","Hamburg","Köln","München","Stuttgart"],
 "categories":{"nail":2,"friseur":2,"kosmetik":2,"lash":1,"arzt":1,
               "barber":2,"massage":2,"aesthetik":1,"opraum":2}}
```

**Beweis, dass die 15 Salons Seed-Daten sind — die UUIDs sind fortlaufend
konstruiert:**

```
naillab-by-lena       "id":"cccccccc-0000-4000-a000-000000000004"
kings-cut-berlin      "id":"cccccccc-0000-4000-a000-000000000007"
haarmonie-stuttgart   "id":"cccccccc-0000-4000-a000-000000000008"
skin-atelier          "id":"cccccccc-0000-4000-a000-000000000009"
medcenter-op-raeume   "id":"cccccccc-0000-4000-a000-000000000015"
```

Dieselbe Handschrift bei den Leistungen (`dddddddd-0401-4000-a000-000000000000`).
Die Salondatensätze sind unvollständig: `phone: null`, `postal_code: null`,
`logo_url: null`, `gallery: []`, `website: null`.

**Die Zahlen sprechen für sich:** 48 Bewertungen bei **1** Buchung. Bewertungen
setzen abgeschlossene Buchungen voraus — dieses Verhältnis kann nicht aus
echter Nutzung entstanden sein.

**Zweite Demo-Schicht im Code:** `src/lib/demo-data.ts` mit **16** erfundenen
Anbietern (`PROVS`, `p1`…`p16`) plus Leistungs- und Bewertungskatalog. Wird als
Rückfall benutzt in `explore`, `search`, `category/[categoryId]`,
`salon/[slug]` und `booking/[salonId]`. Live sichtbar: `/explore` zeigt
`BlackLabel Barbershop`, `Derma Zentrum`, `Maison Haarwerk`, `SterileSpace` —
Namen, die sowohl in `PROVS` als auch in der Seed-Datenbank stehen.

**Urteil: Es gibt in ChairMatch derzeit keine einzige nachweisbar echte
Geschäftsbeziehung.** Das Entfernen beider Schichten ist eine
Produktentscheidung, keine technische.

---

## 6. Deployment

### 6.1 Vercel 🟢

| Feld | Wert |
|---|---|
| Production URL | https://www.chairmatch.de |
| Project ID | `prj_SeoqYHyYwv4tZV8skY8Ag5Dw8iuS` |
| Org ID | `team_iJXOJqpBTNdePfg1tMV0r1ip` |
| Framework | `nextjs` (Next.js 15.5.20) |
| Auslöser | Jeder Push auf `main` — kein manuelles `vercel deploy` |

**Live-Kopf der Startseite:**

```
server: Vercel
x-nextjs-prerender: 1
x-vercel-cache: STALE
x-nextjs-stale-time: 300
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-vercel-id: fra1::iad1::7vr8r-…
```

**Cron-Jobs aus `vercel.json`:**

| Pfad | Zeitplan |
|---|---|
| `/api/cron/hard-delete` | `0 2 * * *` |
| `/api/cron/publish-reviews` | `30 3 * * *` |
| `/api/cron/rental-payouts` | `0 4 * * *` |

Dazu Header-Regeln: `X-Robots-Tag: noindex, nofollow` + `no-store` auf `/api/*`,
`immutable`-Caching auf Icons, `no-store` auf `/sw.js`.

### 6.2 `deploy.sh` 🟡

Ablauf: Lock-Cleanup → `git add -A` → `precommit-guard.sh` → Typecheck →
Commit → Push (aktueller Branch) → `verify-push.sh` → `status.sh`.

**Zwei Einschränkungen, beide im Skript selbst dokumentiert:**

1. Der Typecheck ist mit `|| echo "⚠ pre-existing TS errors ignored"` verkettet —
   er ist **warn-only** und blockt nicht. Der Kommentar im Skript stellt richtig,
   dass das gefährlich ist: `ignoreBuildErrors=true` gilt nicht mehr, ein
   TS-Fehler bricht heute den Vercel-Build. Genau so ist Commit `0d00473`
   („drei Typfehler in der neuen Testdatei") entstanden.
2. `git add -A` erfasst **alles** im Arbeitsverzeichnis. Bei parallelen
   Sitzungen im selben Baum sammelt ein Deploy fremde Änderungen ein — das ist
   nachweislich schon passiert (Commit `5af4013`).

### 6.3 Ausgelieferte Absicherung 🟢

Vollständige CSP mit `frame-ancestors 'none'`, `object-src 'none'`,
`base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`;
HSTS mit `preload`; `/api/*` nicht indexierbar und nicht cachebar.

---

## 7. Offene Punkte, nach Dringlichkeit

### 🔴 P0 — blockiert den Betrieb als Marktplatz

| # | Punkt | Beleg |
|---|---|---|
| 1 | **Stripe ist in Produktion nicht konfiguriert.** Jede Geldstrecke ist tot: Termin, Shop, Miete, Connect, Abo, Erstattung. | Webhook antwortet `500 {"error":"Webhook not configured"}`; kein `pk_` in 2 MB Live-Bundle |
| 2 | **Es gibt keine echten Daten.** 15 Seed-Salons mit konstruierten UUIDs, 1 Buchung, 48 Bewertungen. | `cccccccc-0000-4000-a000-0000000000NN` |
| 3 | **Rechnungen existieren nicht.** Kein Beleg, keine Rechnungsnummer, kein PDF, keine USt. | Volltextsuche `src/lib`, `src/modules` |
| 4 | **KYC existiert nicht.** Volltextsuche `kyc` in `src/`: 0 Treffer. Identitätsprüfung wäre Stripe Connect → tot. | s. o. |

### 🔴 P1 — kaputt, klein zu beheben

| # | Punkt | Beleg |
|---|---|---|
| 5 | **`/api/rental-listings` antwortet anonym 401.** Route ist als öffentlich gebaut, fehlt in der Middleware-Positivliste. Drei öffentliche Mieter-Seiten laufen ins Leere. | Live 401; `src/middleware.ts` enthält den Pfad nicht |

### 🟡 P2 — Risiko und Wahrhaftigkeit

| # | Punkt | Beleg |
|---|---|---|
| 6 | **`auto-create-pr.yml` merged jeden `claude/**`-Push ohne Review nach `main`** und löst damit einen Produktionsdeploy aus. 13 verwaiste Branches liegen bereit, der jüngste vom 25.05.2026. | Workflow-Datei; `git for-each-ref` |
| 7 | **„Live-Marktpreise aus echten Inseraten"** auf `/preisvergleich` — die Zahlen sind hartkodiert, echte Inserate gibt es nicht. | `preisvergleich/page.tsx:14`, live ausgeliefert |
| 8 | **~155 literale Preis- und Verdienstangaben auf 18 öffentlichen Seiten** ohne `BUSINESS_DECISION_REQUIRED`, darunter „Zusatzeinnahmen ca. 250–500 €/Tag". | Auszählung in 4.6 |
| 9 | **3 Migrationen committet, nicht angewendet** (CM23-Schema, CM24, P3-RLS). Kein Runner, kein DB-Zugang. | `docs/MIGRATION_LEDGER.md` |
| 10 | **`ADMIN_SETUP_KEY` ist in Produktion gesetzt und scharf.** `/api/setup/promote-admin` antwortet `403 {"error":"Ungültiger Setup-Key"}` — bei fehlendem Key stünde dort „Setup endpoint deaktiviert". | Live-Antwort vs. `route.ts:78–111` |
| 11 | **GA4 und Meta-Pixel werden ausgeliefert, aber ohne IDs** — Marketing-Messung findet nicht statt. | Bundle-Analyse in 4.15 |
| 12 | **`deploy.sh`-Typecheck ist warn-only** und blockt nicht. | `deploy.sh` |
| 13 | **Zwei Auth-Systeme:** `/konto` meldet über `supabase.auth` an, das Backend prüft NextAuth. | bekannte Altlast |
| 14 | **Widersprüchliches Abo-Vokabular** (`free` vs. `starter`); `SUBSCRIPTION_TIERS` ist tote Konfiguration. | 4.7 |

### ⚫ Nicht prüfbar geblieben

| # | Punkt | Grund |
|---|---|---|
| 15 | RLS-Verhalten gegenüber der Rolle `authenticated` | braucht ein echtes Nutzer-JWT |
| 16 | Die gemeldeten „6 service_role-Policies" | kein DB-Zugang; nicht im Repo, nicht im Ledger |
| 17 | Resend-Konfiguration in Produktion | ein Test hätte echte Mails/Datensätze erzeugt |
| 18 | Playwright-E2E | läuft in keiner Automatisierung |

---

## 8. Antwort auf die drei Leitfragen

### Was ist produktionsreif? 🟢

Die **technische Plattform**. 107 API-Routen, 135 Seiten, 1821 grüne Tests,
sauberer Typecheck, sauberer Build, grüne CI. Auth, Rollentrennung,
Mandantentrennung, Rate-Limits, CSP, HSTS, anon-Sperren, 2FA,
Sitzungswiderruf, Anti-Bypass, SSRF-Schutz und verschlüsselte Push-Nutzdaten
sind gebaut und — soweit von außen messbar — wirksam. Die öffentliche Website
läuft stabil, der Buchungskalender liefert echte Slots, Bewertungen und Shop
antworten korrekt. Die Degradation bei fehlender Stripe-Konfiguration ist
bewusst gebaut und richtig (503 statt 500, 5xx statt 4xx im Webhook).

### Was ist Test? 🔴

**Der gesamte Inhalt.** Alle 15 Salons sind Seed-Datensätze mit konstruierten
UUIDs und ohne Telefonnummer, PLZ, Logo oder Galerie. Dazu 16 rein erfundene
Anbieter aus `src/lib/demo-data.ts`, die live auf Startseite, Suche, Explore und
Kategorieseiten mitlaufen. 48 Bewertungen stehen 1 Buchung gegenüber.
Die Preisangaben auf den öffentlichen Seiten sind gesetzte Platzhalter, keine
Marktdaten — auch dort, wo die Seite „Live-Marktpreise aus echten Inseraten"
verspricht.

### Was fehlt? 🔴

Vier Dinge, ohne die ChairMatch kein Geld verdienen und keinen Umsatz
abrechnen kann:

1. **Stripe-Konfiguration** (6 Umgebungsvariablen in Vercel) — Klick-Aktion für yusuf
2. **Rechnungswesen** — komplett ungebaut
3. **KYC / Identitätsprüfung** — komplett ungebaut, hängt an (1)
4. **Echte Anbieter** — Akquise, keine Technik

Dazu die Geschäftsentscheidungen, die niemand getroffen hat: Provisionssätze,
Abo-Preise, Katalogpreise und die Verdienstversprechen auf den öffentlichen
Seiten (7 markierte Codestellen + ~155 unmarkierte Live-Angaben).

---

## 9. Reproduktion dieses Berichts

```bash
git log --oneline -30 && git status --porcelain=v1 -b
git rev-list --left-right --count origin/main...HEAD
npm run typecheck                       # → Exit 0
npm test                                # → 96 Dateien, 1821 Tests, Exit 0
npm run lint                            # → 0 Fehler, 13 Warnungen
npm run build                           # → Exit 1 ohne Service-Key (Umgebung)
SUPABASE_SERVICE_ROLE_KEY="platzhalter" npm run build   # → 342/342, Exit 0
gh run list --limit 10
bash scripts/prod-probe.sh              # → 21/21, Exit 0
bash scripts/negativtest-anon-lesen.sh  # → 0 von 9 durchgefallen
bash scripts/schema-probe.sh            # → deckt sich mit live-schema.ts
curl -X POST https://www.chairmatch.de/api/stripe/webhook \
     -H 'stripe-signature: t=1,v1=00' -d '{}'          # → 500 Webhook not configured
curl -o /dev/null -w '%{http_code}' https://www.chairmatch.de/api/rental-listings  # → 401
```

---

_Erstellt am 09.09.2026 gegen `8660a5c`. Es wurde in diesem Lauf **kein
Produktivcode geändert**, kein Stripe-Konto angelegt, kein Preis gesetzt und
keine Migration angewendet._
