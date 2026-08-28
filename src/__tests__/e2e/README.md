# ChairMatch E2E-Tests

End-to-End-Tests für die drei tragenden Flows: **Buchung**, **Zahlung**, **Auth**.

```bash
npm test                              # gesamte Suite
npx vitest run src/__tests__/e2e      # nur diese Tests
npx vitest src/__tests__/e2e          # Watch-Modus
```

## Was hier „E2E" heißt

Getestet wird der **komplette Server-Pfad**: Route-Handler → Action → Service →
Datenzugriff, mit echten Zod-Schemata, echter Preis-/Provisionsberechnung und
echten Statusübergängen. Ersetzt sind nur die drei Außenkanten:

| Außenkante | Ersatz | Warum |
|---|---|---|
| Supabase | `_harness/fake-supabase.ts` (In-Memory-Query-Builder) | Produktion und Tests teilen sich dasselbe Projekt `pwdbjqfpgumyfktbfswg`. Tests dürfen dort keine echten Buchungen, Zahlungen und Audit-Logs erzeugen. |
| Stripe | `_harness/stripe-harness.ts` | Geprüft wird, was ChairMatch mit den Stripe-Antworten macht — nicht, ob Stripe funktioniert. |
| E-Mail | `vi.mock('@/lib/email')` | Kein Versand aus Tests. |

Der gesamte Serverzugriff läuft über `getSupabaseAdmin()` (`service_role`,
umgeht RLS). Genau diese eine Fabrik wird ersetzt — deshalb bleibt der
Produktivcode unangetastet testbar.

## Dateien

| Datei | Inhalt |
|---|---|
| `booking-flow.test.ts` | Suche/Filter (`/api/match`), Buchung anlegen, Promo-Codes, Bestätigung, Stornierung, Doppelbuchung, Miet-Buchungen |
| `payment-flow.test.ts` | Checkout-Sessions, Webhook-Verarbeitung (Idempotenz, Doppelzahlung, SEPA, Expiry), Refunds, Abo- und Connect-Events |
| `auth-flow.test.ts` | Registrierung inkl. Einwilligungen, Login, Rate-Limit, Session-/Cookie-Härtung, Passwort-Reset |
| `permissions.test.ts` | Rollen-Hierarchie, Salon-Inhaber vs. Mieter, Admin-Aktionen, Sichtbarkeit von Buchungen |
| `error-cases.test.ts` | Timeouts, DB-/Stripe-Ausfälle, gleichzeitige Zugriffe |
| `stripe-nicht-konfiguriert.test.ts` | Verhalten OHNE `STRIPE_SECRET_KEY` — der aktuelle Zustand der Produktion. Jeder Zahlweg muss 503 melden statt 500/400 |
| `inserat-lebenszyklus.test.ts` | Stuhl-Inserat (`/api/me/listing`): anlegen, bepreisen, online/offline, Mandantentrennung |
| `miet-bewertung-freischaltung.test.ts` | Miet-Bewertung abgeben → 14 Tage unsichtbar → Cron schaltet frei → öffentlich sichtbar |

## Warum Playwright (`/e2e`) NICHT in CI läuft

Unter `/e2e` liegen Playwright-Specs. Sie brauchen einen laufenden Server, und
der benutzt dieselben Supabase-Zugangsdaten wie die Produktion — Tests und
Produktion teilen sich das Projekt `pwdbjqfpgumyfktbfswg`. Ein CI-Lauf würde
also in echten Tabellen schreiben. Genau deshalb existiert die Suite hier.

Die Zusage, um die es dort geht („geschützte Seiten leiten auf `/auth` um"),
ist doppelt belegt, ohne Produktionsdaten anzufassen:

- **in CI**: `src/__tests__/middleware-auth-decision.test.ts` und
  `middleware-public-paths.test.ts` prüfen die Umleitungsentscheidung für
  `/account`, `/favorites`, `/admin` und `/provider`.
- **gegen die echte Instanz**: `bash scripts/prod-probe.sh` sondet dieselben
  Pfade live (307 auf `/auth?callbackUrl=…`), dazu die Admin-Schnittstelle
  (401 ohne Anmeldung) und die anon-Rechte auf den PII-Tabellen.

Die Playwright-Specs bleiben als manuelle Gegenprobe gegen eine echte Instanz.

## RLS — wichtige Einordnung

Die Datentrennung zwischen Nutzenden entsteht in ChairMatch **nicht** in der
Datenbank: alle Server-Zugriffe laufen mit `service_role` und umgehen RLS.
Die Grenzen ziehen die Route-Handler — genau die prüft `permissions.test.ts`.

Der Browser-Client (`@/lib/supabase`, Anon-Key) unterliegt RLS und darf laut
Migration `20260819_rls_close_gaps_v2.sql` nur lesen. Der letzte Test in
`permissions.test.ts` scannt den Quellcode und schlägt an, sobald dort ein
Schreibzugriff dazukommt.

## Neue Tests schreiben

1. Fake-DB und Session in `beforeEach` setzen (`createDb()`, `sessionFor(...)`).
2. Route-Handler direkt aufrufen — `postRequest()` / `ctx()` aus `_harness/fixtures.ts`.
3. Ergebnis **am Zustand** prüfen (`db().row('bookings', id)`), nicht nur am Statuscode.

Fehlerfälle werden über die Harness gesteuert:

```ts
db().failOn('bookings', 'insert', { code: '08006', message: '…', details: null, hint: null })
enableOverlapConstraint(db())            // EXCLUDE-Constraint rental_bookings_no_overlap
state.stripe.createRefund.mockRejectedValueOnce(new Error('ETIMEDOUT'))
```
