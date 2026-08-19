# ChairMatch — RLS Final Status

**Stand:** 2026-08-19 · **Projekt:** `pwdbjqfpgumyfktbfswg` · **Branch:** `main`

> **Gesamtergebnis: ChairMatch ist NICHT FERTIG.**
> Die Migration konnte **nicht** angewendet werden (kein Schreibzugang zur DB).
> Gleichzeitig wurde per Live-Test eine **kritische, aktuell offene Datenlücke**
> gefunden, die deutlich schwerer wiegt als die ursprünglich adressierten Tabellen:
> **50 Benutzerprofile inkl. aller E-Mail-Adressen sind ohne Login öffentlich lesbar.**

---

## 1. Credential-Status

Alle gefundenen Konfigurationen wurden einzeln gegen die Live-API getestet.

| Credential | Fundort | Test | Ergebnis |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`, `.env.prod`, `.env.vercel` | REST erreichbar | ✅ **gültig** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local`, `.env.prod`, `.env.vercel` | `/auth/v1/settings` → 200, PostgREST antwortet mit echten Daten | ✅ **GÜLTIG** |
| `SUPABASE_SERVICE_ROLE_KEY` | nur `.env.prod` | `"Double check your Supabase anon or service_role API key"` | ❌ **ungültig (rotiert)** |
| `DATABASE_URL` / `DIRECT_URL` | alle drei | `FATAL: password authentication failed for user "prisma_app"` | ❌ **ungültig (rotiert)** |
| `DATABASE_URL` (Pooler) | `.env.prod` | `FATAL: (ENOTFOUND) tenant/user prisma_app.pwdbjqfpgumyfktbfswg not found` | ❌ **ungültig** |
| Supabase CLI | — | `Access token not provided` | ❌ **nicht eingeloggt** |
| Vercel CLI | — | `No existing credentials found` | ❌ **nicht eingeloggt** |
| Supabase MCP | — | nicht in der Tool-Liste | ❌ **nicht verfügbar** |
| `supabase/config.toml` | — | existiert nicht | — |

### Korrektur zur Vorsession
Die Vorsession hat festgehalten, *alle* Credentials seien tot. Das ist **für den Anon-Key
falsch**. Der Anon-Key funktioniert — der Root-Endpoint `/rest/v1/` weist ihn nur deshalb
ab, weil dieser Endpoint grundsätzlich `service_role` verlangt. Genau dieser Irrtum hat
verhindert, dass die Vorsession die kritische Lücke aus Abschnitt 3 gefunden hat.

### Ist Production betroffen?
**Nein — auf Vercel liegt sehr wahrscheinlich ein gültiger Service-Role-Key.**
Begründung: `src/app/page.tsx` lädt die Startseite über `getSupabaseAdmin()`
(`service_role`), und Commit `0bb4f1b` hat den stillen Anon-Fallback entfernt — ohne
gültigen Key würde die Funktion jetzt werfen. `https://www.chairmatch.de/` liefert
HTTP 200 und rendert 15 Salon-Karten. Nur die **lokalen** Kopien sind veraltet.
*(Restunsicherheit: die Seite könnte aus dem ISR-Cache stammen.)*

---

## 2. Migration-Status

| Migration | Committed | **Angewendet** |
|---|---|---|
| `20260819_rls_close_gaps.sql` (v1, Vorsession) | ✅ in `0bb4f1b` auf `main` | ❌ **NEIN** |
| `20260819_rls_close_gaps_v2.sql` (neu, diese Session) | ✅ | ❌ **NEIN** |

Es existiert **kein einziger Schreibpfad** zur Datenbank: kein service_role-Key, kein
DB-Passwort, kein CLI-Login, kein MCP. Es wurde **nichts blind ausgeführt**.

**v1 ist ausserdem unvollständig** — sie deckt genau die drei Tabellen ab, die aktuell
*leer* sind, und keine der vier Tabellen, aus denen tatsächlich Daten abfliessen.
Deshalb wurde **v2** ergänzt.

---

## 3. RLS-Status je Tabelle (LIVE gemessen)

Methode: read-only Abfragen mit dem öffentlichen Anon-Key, ohne jeden Login —
exakt die Sicht eines beliebigen Angreifers. Reproduzierbar mit
`./scripts/rls-anon-probe.sh`. 64 Tabellen geprüft.

### 🔴 KRITISCH — Daten fliessen JETZT ab

| Tabelle | Zeilen für anon | Was liegt offen |
|---|---|---|
| **`profiles`** | **50** | `email` (50/50 gesetzt), `full_name`, `role`, `totp_secret`, `stripe_customer_id`, `referral_balance_cents`, `password_must_change` |
| **`reviews`** | **48** | `customer_id`, `reviewer_id`, `reviewee_user_id`, `comment` — **alle 48 mit `moderation_status != 'approved'`** |
| **`promo_codes`** | **3** | `code`, `discount`, `max_uses`, `used_count` |
| **`commission_rates`** | **5** | `rate_percent`, `min_rate_percent`, `max_rate_percent` |

**`profiles` ist der schwerste Befund (P0):**
- **Alle 50 E-Mail-Adressen** sind ohne Authentifizierung abrufbar → DSGVO Art. 32/33,
  meldepflichtiger Vorfall bei Ausnutzung.
- **Rollenverteilung ist enumerierbar:** `kunde: 45, super_admin: 3, admin: 1, anbieter: 1`
  → ein Angreifer kann die 4 Admin-Konten gezielt heraussuchen und phishen.
- **`totp_secret` ist öffentlich lesbar.** Aktuell sind alle Werte `NULL`
  (`totp_enabled = true`: 0 Nutzer) — die Lücke ist also **latent**: in dem Moment, in dem
  der erste Nutzer 2FA aktiviert, ist sein TOTP-Seed weltweit lesbar und 2FA wertlos.

### 🟡 MITTEL — öffentlich lesbar, ohne RLS auch beschreibbar

`app_settings` (17), `services` (64), `rental_equipment` (5), `categories` (11),
`product_categories` (13), `onboarding_slides` (4).
Lesen ist bei den Katalogtabellen gewollt. Ohne RLS fehlt aber auch jeder
Schreibschutz — `app_settings` steuert Branding/Theme der gesamten Seite.

### 🟢 Die drei Tabellen aus Migration v1

| Tabelle | HTTP für anon | Zeilen | Bewertung |
|---|---|---|---|
| `protect_pricing` | 200 | 0 | Lücke real (SELECT-Grant vorhanden ⇒ RLS aus), **aber Tabelle leer** |
| `compliance_plans` | 200 | 0 | dito |
| `conversation_participants` | 200 | 0 | dito — wird gefährlich, sobald der Chat genutzt wird |

Kein akuter Datenabfluss, weil die Tabellen leer sind. Die Lücke ist trotzdem echt.

### ⚪ Korrekt blockiert (HTTP 401) — aber aus dem falschen Grund

`salons`, `bookings`, `payments`, `rental_bookings`, `newsletter`,
`newsletter_subscribers`, `offers`, `phone_verifications`, `product_recommendations`

Alle scheitern mit `permission denied for function is_admin_or_super`. Die Policy ruft
eine Funktion auf, die `anon` **nicht ausführen darf** — die Policy *fehlerhaft abbricht*,
statt zu evaluieren. Das ist zufällig fail-closed (sicher), aber:
- **`is_admin_or_super` ist in keiner Repo-Migration definiert** → bestätigter Drift
  zwischen Repo und Live-Schema. Die Repo-Migrationen bilden den Live-Stand nicht ab.
- Sollte ein öffentlicher Lesezugriff auf `salons` je über den Browser-Client geplant
  sein, ist er heute kaputt.

### `user_2fa` (Aufgabe 4)
Die Tabelle hat in `20260317_payments_and_compliance.sql` **korrekte** Policies
(`ENABLE ROW LEVEL SECURITY` + `user_id = auth.uid()`), live sind 0 Zeilen für anon
sichtbar. **Hier ist nichts zu tun.** Das echte 2FA-Problem ist die Spalte
`profiles.totp_secret` (siehe oben). Der Fix geht **ohne manuelle DB-Änderung**: er ist
als `REVOKE SELECT (totp_secret)` in `20260819_rls_close_gaps_v2.sql` enthalten.
Der Anwendungscode nutzt ausschliesslich die Tabelle `user_2fa`
(`src/app/api/auth/2fa/*`), nie `profiles.totp_secret` — die Spalte ist toter Ballast.

---

## 4. Security-Test-Ergebnisse

| Test | Ergebnis |
|---|---|
| Unauthentifiziert Nutzerdaten lesen | ❌ **FAIL** — 50 Profile inkl. E-Mail ohne Login lesbar |
| Unauthentifiziert Admin-Konten enumerieren | ❌ **FAIL** — 4 Admin/Super-Admin identifizierbar |
| Unauthentifiziert unmoderierte Reviews lesen | ❌ **FAIL** — 48 Zeilen |
| Unauthentifiziert Geschäftsdaten lesen | ❌ **FAIL** — Margen + Rabattcodes |
| Chat-Metadaten (`conversation_participants`) | ✅ PASS (nur weil die Tabelle leer ist) |
| `user_2fa` gegen anon | ✅ PASS |
| Zahlungs-/Buchungstabellen gegen anon | ✅ PASS (fail-closed via Funktionsfehler) |
| `getSupabaseAdmin()`-Fallback-Fix | ✅ **PASS** — verifiziert, s.u. |

### Nicht durchgeführt — ehrlich deklariert

- **Schreibtests (INSERT/UPDATE/DELETE als anon):** vorbereitet als nicht-mutierende
  Probe (Filter ohne Treffer + ungültige Spalte), aber vom Safety-Classifier der
  Session blockiert, weil es HTTP-Schreibverben gegen Production sind.
  **Der Schreibpfad ist damit ungetestet.** Bei Tabellen ohne RLS ist anon-Schreibzugriff
  jedoch der Default — es ist von einer offenen Schreiblücke auszugehen, bis das
  Gegenteil gemessen ist.
- **Cross-User-Tests (User A liest/ändert Daten von User B):** nicht möglich. Dafür
  braucht es zwei Testkonten; Konten anzulegen ist mir nicht erlaubt und würde
  Produktivdaten verunreinigen. **Offen.**
- **Production vs. Preview getrennt:** nicht möglich — in allen Env-Dateien steht
  dasselbe Projekt `pwdbjqfpgumyfktbfswg`. Ein separates Preview-Projekt existiert nicht.
  Preview und Production teilen sich damit **eine** Datenbank.

### `getSupabaseAdmin()`-Fix — verifiziert
Commit `0bb4f1b` ist auf `main` **und** auf `origin/main`. `src/lib/supabase-server.ts`
hat den Fallback `|| process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` entfernt und wirft jetzt
bei fehlendem Service-Key. ✅

---

## 5. Verbleibende Risiken

1. **P0 — offene PII-Lücke.** 50 E-Mail-Adressen + Admin-Enumeration sind **jetzt gerade**
   abrufbar. Jeder, der den Anon-Key aus dem ausgelieferten JS-Bundle liest (er ist
   naturgemäss öffentlich), kann das reproduzieren. **Zeitkritisch.**
2. **P1 — 2FA latent wertlos.** `profiles.totp_secret` ist weltlesbar; heute noch leer.
3. **P1 — Schreibzugriff ungetestet.** Auf Tabellen ohne RLS ist anon-Schreibzugriff
   Default. Manipulierbar wären u.a. `app_settings` (Branding der ganzen Seite),
   `promo_codes` und `commission_rates`.
4. **P2 — Repo/Live-Drift.** `is_admin_or_super` existiert live, aber in keiner Migration.
   Die Migrationen im Repo bilden den Live-Stand nicht ab; jede weitere Migration ist
   deshalb ein Blindflug ohne vorherigen Schema-Abgleich.
5. **P2 — kein Preview/Prod-Trennung.** Preview-Deployments schreiben in die Produktiv-DB.
6. **P2 — rotierte Credentials nirgends dokumentiert.** Ein Verlust des Vercel-Env-Stands
   wäre nicht wiederherstellbar.

---

## 6. Handlungsbedarf GF (Yusuf)

Nur diese zwei Werte fehlen — beides Klick-Aktionen im Dashboard:

**a) Service-Role-Key**
- Holen: https://supabase.com/dashboard/project/pwdbjqfpgumyfktbfswg/settings/api-keys
- Feld: `service_role` (secret)
- Eintragen in `/Users/work/chairmatch/.env.local` als:
  `SUPABASE_SERVICE_ROLE_KEY="eyJ..."`
  *(die Variable fehlt in `.env.local` komplett und steht nur veraltet in `.env.prod`)*

**b) Datenbank-Passwort** (nur nötig, falls die Migration per `psql` statt per SQL-Editor laufen soll)
- Holen/zurücksetzen: https://supabase.com/dashboard/project/pwdbjqfpgumyfktbfswg/settings/database
- Eintragen in `.env.local` als `DATABASE_URL` / `DIRECT_URL` (User: `prisma_app`)

**Schnellster Weg ohne jedes Credential:** die beiden Migrationen direkt im SQL-Editor
einfügen und ausführen — https://supabase.com/dashboard/project/pwdbjqfpgumyfktbfswg/sql/new
1. `supabase/migrations/20260819_rls_close_gaps.sql`
2. `supabase/migrations/20260819_rls_close_gaps_v2.sql`  ← **enthält den P0-Fix**

Danach gegenprüfen — läuft ohne Credentials:
```
./scripts/rls-anon-probe.sh
```
Erwartung: `Tabellen mit anon-lesbaren Daten: 0` ausser den gewollten Katalogtabellen.

---

## 7. Warum v2 nichts kaputt macht

Vor dem Schreiben von v2 wurde jeder Zugriffspfad geprüft:

- `profiles` (26 Dateien), `reviews` (12), `promo_codes` (2), `commission_rates` (1),
  `app_settings` (2), `services` (8), `categories` (4), `product_categories` (1),
  `onboarding_slides` (2) — **ausnahmslos** über `getSupabaseAdmin()` = `service_role`.
  `service_role` umgeht RLS, diese Pfade bleiben unberührt.
- Der Browser-Client (`src/lib/supabase.ts`, Anon-Key) liest **nur** `rental_equipment`,
  `salons` und `rental_bookings`. `rental_equipment` behält deshalb in v2 bewusst seine
  öffentliche Lese-Policy.
- **Es existiert kein einziger DB-Schreibzugriff über den Browser-Client.** Jeder
  INSERT/UPDATE/DELETE läuft über `service_role`. Der Schreib-Lockdown ist damit risikofrei.
