# ChairMatch — RLS Security Fix Report

**Projekt:** ChairMatch — Supabase `pwdbjqfpgumyfktbfswg`
**Datum:** 2026-08-19
**Basis-Commit:** `e537f76`
**Commit-ID dieses Fixes:** `0bb4f1b`
**Status:** Code-Fix deployed · SQL-Migration **wartet auf manuelle Anwendung** · RLS-Tests **nicht gelaufen** (API-Keys ungültig)

---

## 1. Kurzfassung

| Punkt | Status |
|---|---|
| `getSupabaseAdmin()` fällt still auf Anon-Key zurück (P0) | ✅ **GEFIXT** — wirft jetzt |
| RLS fehlt auf `protect_pricing`, `compliance_plans`, `conversation_participants` (P0) | 🟡 Migration liegt bereit, **manuell anzuwenden** |
| `user_2fa` gibt TOTP-Secret per Policy an den Client (P0) | ⛔ **EXTERNAL_BLOCKER** — braucht DB-Zugriff |
| ~12 weitere Tabellen (`salons`, `rental_bookings`, `notifications`, `phone_verifications`, …) | ⛔ **UNVERIFIZIERT** — Schema nicht im Repo |
| Supabase API-Keys / DB-Passwort | ⛔ **EXTERNAL_BLOCKER** — alle rotiert, müssen vom GF aktualisiert werden |

---

## 2. Betroffene Tabellen

### 2.1 RLS fehlte — verifiziert im Repo

Statische Analyse über `supabase-setup.sql` + `supabase/migrations/*.sql`:
**54 Tabellen definiert, 51 mit RLS, 3 ohne.**

| Tabelle | Definiert in | RLS | Policies | Risiko |
|---|---|---|---|---|
| `protect_pricing` | `20260310_compliance_and_plans.sql:88` | ❌ | 0 | Preise per Anon-Key manipulierbar (Integrität) |
| `compliance_plans` | `20260310_compliance_and_plans.sql:104` | ❌ | 0 | Preise per Anon-Key manipulierbar (Integrität) |
| `conversation_participants` | `20260317_payments_and_compliance.sql:81` | ❌ | 0 | Social Graph lesbar **und** beschreibbar (DSGVO) |

Ohne RLS gibt PostgREST eine Tabelle mit dem öffentlichen `NEXT_PUBLIC_SUPABASE_ANON_KEY` für
`SELECT/INSERT/UPDATE/DELETE` frei. Dieser Key steht per Definition im Browser-Bundle.

**Absichern bricht nichts** — jeder Zugriffspfad wurde geprüft:

| Tabelle | Einziger Zugriff im Code | Client | RLS-relevant? |
|---|---|---|---|
| `protect_pricing` | `src/app/(admin)/admin/pricing/page.tsx:9` | `getSupabaseAdmin()` | nein — `service_role` umgeht RLS |
| `compliance_plans` | `src/app/(admin)/admin/pricing/page.tsx:10` | `getSupabaseAdmin()` | nein — `service_role` umgeht RLS |
| `conversation_participants` | `src/app/api/messages/route.ts`, `src/app/api/messages/[conversationId]/route.ts` | `getSupabaseAdmin()` | nein — `service_role` umgeht RLS |

### 2.2 Weitere betroffene Tabellen — Schema unbekannt (kein `CREATE TABLE` im Repo)

Diese Tabellen nutzt die App, sie sind aber in **keiner** Migration definiert — sie wurden live
per SQL-Editor/Dashboard angelegt. RLS-Status **unbekannt**:

`salons`, `rental_bookings`, `rental_equipment`, `notifications`, `staff`, `offers`,
`idempotency_keys`, `phone_verifications`, `error_logs`, `app_settings`, `booking_policies`,
`newsletter_subscribers`, `newsletter_campaigns`, `newsletter_sends`, `onboarding_slides`,
`loyalty_cards`

Höchstes Schadenspotenzial:

* **`rental_bookings`** — wird in `src/app/(public)/vermieter/mein-inserat/umsatz/page.tsx:276`
  **client-seitig mit dem Anon-Key** gelesen, gefiltert per `.eq('salon_id', …)`. Ohne RLS kann
  jeder die Filterbedingung im Browser ändern und **fremde Umsatzdaten** abrufen.
* **`salons`** — ebenfalls client-seitig mit Anon-Key (`owner_id`-Filter).
* **`phone_verifications`**, **`error_logs`**, **`newsletter_subscribers`** — PII.

Für diese Tabellen wurden **bewusst keine Policies geschrieben** — ohne Kenntnis der Spalten und
bestehenden Policies wäre das Raten. `scripts/rls-audit.sql` (Abschnitt 8) gleicht die Liste gegen
das Live-Schema ab, sobald Zugang besteht.

---

## 3. P0 — `getSupabaseAdmin()` Fallback auf Anon-Key · **GEFIXT**

**Vorher** (`src/lib/supabase-server.ts:4`):

```ts
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
```

Fehlte `SUPABASE_SERVICE_ROLE_KEY`, lief **jede** vermeintliche Admin-Abfrage still als `anon`.
Auf Tabellen ohne RLS funktionierte trotzdem alles — der Fehler blieb unbemerkt, Admin-Daten
liefen über den öffentlichen Key. Nach dem RLS-Fix hätten Admin-Seiten still leere Listen
geliefert statt eines klaren Fehlers.

**Jetzt:** `getSupabaseAdmin()` wirft, wenn `SUPABASE_SERVICE_ROLE_KEY` (oder
`NEXT_PUBLIC_SUPABASE_URL`) fehlt. Kein Fallback mehr. Der Check liegt **in der Funktion**, nicht
auf Modulebene — ein blosser Import bricht damit nichts.

**⚠️ Deploy-Relevanz (verifiziert):** Ohne gesetzten Service-Key **schlägt der Next-Build jetzt
hart fehl** — beim Prerender von `/shop`:

```
Error occurred prerendering page "/shop"
Error: SUPABASE_SERVICE_ROLE_KEY fehlt — getSupabaseAdmin() faellt bewusst NICHT auf den Anon-Key zurueck.
```

Mit gesetztem Key läuft der Build vollständig durch (beides lokal gegengeprüft). Vercel
**Production** hat den Key (bestätigt via `.env.prod` aus `vercel env pull`). Für **Preview**- und
**Development**-Environments ist das **ungeprüft** — falls der Key dort nicht gesetzt ist, schlagen
Preview-Builds ab sofort fehl. Das ist gewolltes Fail-Fast, muss aber im Vercel-Dashboard einmal
kontrolliert werden.

Lokal fehlt der Key in `.env.local` — dort muss er nachgetragen werden (siehe Blocker unten).

---

## 4. P0 — `user_2fa` gibt TOTP-Secret an den Client · **EXTERNAL_BLOCKER**

`supabase/migrations/20260317_payments_and_compliance.sql:233`

```sql
CREATE POLICY user_2fa_select ON user_2fa FOR SELECT USING (user_id = auth.uid());
```

Die Spalte `secret` (TOTP-Seed) ist damit für den eingeloggten User per Anon-Key lesbar. Das
untergräbt den zweiten Faktor komplett: wer die Session hat, bekommt auch den Seed und kann
beliebig gültige Codes erzeugen. Ein 2FA-Secret darf den Server nie verlassen.

**Nicht gefixt.** Der korrekte Fix (SELECT nur auf `enabled`/`verified_at` per View oder
Spalten-Grant, `secret` ausschliesslich über `service_role`) verändert den 2FA-Verifikationsflow.
Ohne Live-DB kann dieser Flow nicht durchgespielt werden — ein blinder Policy-Wechsel würde
riskieren, 2FA für bestehende User zu brechen. **Eigener Task, sobald DB-Zugriff besteht.**

---

## 5. Migration — liegt bereit, muss MANUELL angewendet werden

`supabase/migrations/20260819_rls_close_gaps.sql`

```sql
ALTER TABLE IF EXISTS public.protect_pricing            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.compliance_plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversation_participants  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_participants_own_select" ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

| Tabelle | SELECT | INSERT | UPDATE | DELETE | Begründung |
|---|---|---|---|---|---|
| `protect_pricing` | deny | deny | deny | deny | Nur Admin-Seite liest, via `service_role` |
| `compliance_plans` | deny | deny | deny | deny | Identisch |
| `conversation_participants` | `user_id = auth.uid()` (nur `authenticated`) | deny | deny | deny | User sieht eigene Mitgliedschaft; Schreiben nur Backend — verhindert Selbst-Eintragen in fremde Chats. Kein Self-Join → keine RLS-Rekursion |

RLS ohne Policy = deny-by-default für `anon`/`authenticated`; `service_role` (`BYPASSRLS`) kommt
weiterhin durch. `FORCE ROW LEVEL SECURITY` wurde bewusst weggelassen — der Tabellen-Owner
(`postgres` vs. `prisma_app`) ist ohne DB-Zugriff nicht feststellbar, ein `FORCE` könnte den
direkten SQL-Pfad brechen.

> **Wichtig:** `./deploy.sh` pusht nach Git und triggert Vercel — es wendet **keine** SQL-Migration
> auf Supabase an. Die Datei muss per `supabase db push` oder im Supabase SQL-Editor manuell
> ausgeführt werden. Bis dahin ist die RLS-Lücke in der Live-DB **offen**.

Weitere ausgelieferte Dateien:

* `scripts/rls-audit.sql` — read-only Ist-Stand-Audit (8 Abschnitte: Tabellen ohne RLS/Policy,
  Views inkl. `security_invoker`, alle Policies, `USING (true)`-Policies, Grants an
  `anon`/`authenticated`, `SECURITY DEFINER`-Funktionen ohne `search_path`, Storage-Buckets,
  Abgleich App-Tabellen ↔ Live-Schema).
* `scripts/rls-security-test.mjs` — automatisierte RLS-Tests (unauth / cross-user / legitimer Flow /
  `service_role`), inkl. Preflight-Guard, der bei ungültigem Anon-Key mit Exit 2 abbricht statt ein
  falsches Grün zu melden.

---

## 6. EXTERNAL_BLOCKER — Supabase-Zugangsdaten alle ungültig

| Zugangsweg | Ergebnis |
|---|---|
| `psql "$DATABASE_URL"` (Pooler, `prisma_app`) | ❌ `FATAL: tenant/user prisma_app.pwdbjqfpgumyfktbfswg not found` |
| `psql "$DIRECT_URL"` | ❌ `FATAL: password authentication failed for user "prisma_app"` |
| `SUPABASE_SERVICE_ROLE_KEY` gegen PostgREST | ❌ HTTP 401 `Invalid API key` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (alle 3 Env-Dateien) | ❌ HTTP 401 `Invalid API key` |
| `supabase` CLI | ❌ nicht eingeloggt, kein `SUPABASE_ACCESS_TOKEN` |
| `vercel` CLI | ❌ nicht eingeloggt |

Alle Keys und das DB-Passwort wurden rotiert, ohne dass die lokalen Env-Dateien nachgezogen wurden.
**Der GF muss die Keys aktualisieren.** Eines davon genügt, um weiterzuarbeiten:

1. `SUPABASE_ACCESS_TOKEN` → `supabase link` + `db push` + Audit, **oder**
2. aktuelles DB-Passwort für `DIRECT_URL`, **oder**
3. einmalig `vercel login` durchklicken → Keys per `vercel env pull` selbst ziehen.

Zusätzlich: `.env.local` enthält gar keinen `SUPABASE_SERVICE_ROLE_KEY` — nach dem Fix aus
Abschnitt 3 läuft lokal damit kein Build mehr. Muss mit nachgetragen werden.

---

## 7. Tests

| Test | Ergebnis | Anmerkung |
|---|---|---|
| TypeScript (`npm run typecheck`) | ✅ **grün** | `tsc --noEmit`, keine Fehler |
| ESLint (`npm run lint`) | ✅ **grün** | 0 Errors, 15 Warnings (alle vorbestehend: `react/no-danger`, `no-img-element`) |
| Build (`npm run build`) **mit** Service-Key | ✅ **grün** | 327 Seiten, vollständig durch |
| Build **ohne** Service-Key | ⚠️ **bricht ab** (gewollt) | Fail-Fast bei `/shop`-Prerender — siehe Abschnitt 3 |
| **RLS-Security-Tests** | ⛔ **NICHT GELAUFEN** | Preflight bricht ab: Anon-Key HTTP 401 |
| **Supabase-Security-Check (Dashboard)** | ⛔ **NICHT GELAUFEN** | Kein Zugriff |
| Unit-Tests (`npm run test`) | ⚠️ vorbestehend rot | `jsdom` fehlt; Vitest zieht Playwright-`e2e/*.spec.ts` mit rein — nicht durch diese Arbeit verursacht |

---

## 8. Offene Punkte / Nächste Schritte

1. **Migration anwenden** — `supabase db push` bzw. SQL-Editor (Abschnitt 5).
2. **Keys aktualisieren** (GF) — Abschnitt 6, inkl. `.env.local`.
3. `psql "$DIRECT_URL" -f scripts/rls-audit.sql` → echter Ist-Stand, Abgleich mit Abschnitt 2.
4. `node scripts/rls-security-test.mjs` vor **und** nach dem Fix laufen lassen.
5. Policies für die unverifizierten Tabellen (Abschnitt 2.2) auf Basis des echten Schemas ergänzen —
   Priorität `rental_bookings`, `salons`.
6. `user_2fa`-Fix als eigener Task (Abschnitt 4).
7. Vercel Preview/Development-Env auf `SUPABASE_SERVICE_ROLE_KEY` prüfen (Abschnitt 3).
8. Storage-Buckets und Object-Policies prüfen — bisher komplett ungeprüft.
9. `supabase db pull` — Repo-Migrationen und Live-Schema wieder zusammenführen.
