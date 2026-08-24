# Preis-/Compliance-Schema — Stand 24.08.2026

Betrifft `protect_pricing` (ChairMatch Protect) und `compliance_plans`
(Einreich-Service).

## Was live wirklich existiert

Spaltenprobe per PostgREST (`?select=<spalte>` → `42703`, wenn die Spalte
fehlt; der Fehler kommt vor der Rechteprüfung, deshalb reicht der Anon-Key):

| Tabelle | Live vorhanden | Vom Code erwartet |
|---|---|---|
| `protect_pricing` | `id`, `created_at` | + `risk_level`, `day_price_cents`, `month_price_cents`, `year_price_cents`, `currency`, `active` |
| `compliance_plans` | `id`, `created_at` | + `plan_type`, `price_cents`, `included_submissions`, `min_term_months`, `extra_submission_price_cents` |

`20260310_compliance_and_plans.sql` beschreibt die Spalten zwar, hat sie live
aber nie angelegt: `CREATE TABLE IF NOT EXISTS` ist auf einer bereits
bestehenden Tabelle wirkungslos. Deshalb arbeitet die neue Migration
ausschließlich mit `ALTER … ADD COLUMN IF NOT EXISTS`.

## Was die Migration tut

`supabase/migrations/20260824_pricing_schema.sql` — im Supabase-SQL-Editor
anzuwenden.

**Spalten** ergänzen (beide Tabellen zusätzlich `currency`, `active`,
`updated_at`).

**Constraints:**

| Art | Regel | Begründung |
|---|---|---|
| NOT NULL | `risk_level`, alle drei Protect-Preise, `plan_type`, `price_cents` | ein Preis ohne Betrag ist kein Preis |
| UNIQUE | `protect_pricing.risk_level`, `compliance_plans.plan_type` | eine Zeile je Stufe/Plan, macht `ON CONFLICT` im Seed möglich |
| CHECK | `risk_level IN ('LOW','MED','HIGH','VERY_HIGH')` | genau die Stufen, die `src/components/RiskBadge.tsx` kennt |
| CHECK | `plan_type IN ('one_time','yearly','monthly')` | Namen aus `20260310` übernommen — Namen, nicht Beträge |
| CHECK | alle `*_cents >= 0`, alle Zähler `>= 0` | `0` bleibt erlaubt (Freistufe) |
| CHECK | `currency ~ '^[A-Z]{3}$'` | ISO-4217-Form |
| FK | vorbereitet, **nicht aktiv** | siehe unten |

Die NOT-NULL-Schritte laufen in einem `DO`-Block, der nur greift, wenn die
Tabelle leer ist — sonst würde ein einzelner Altbestand die ganze Migration
zurückrollen. Stattdessen kommt eine `RAISE NOTICE`.

**Bewusst kein CHECK** auf `day ≤ month ≤ year`: dass ein Jahr teurer sein
muss als ein Tag ist eine Preisannahme, keine technische Invariante.

**RLS:** beide Tabellen werden geschlossen (RLS an, keine Policy, Grants für
`anon`/`authenticated` entzogen). Gelesen werden sie ausschließlich in
`/admin/pricing` über `getSupabaseAdmin()`, und `service_role` umgeht RLS.
`compliance_plans` war schon dicht, `protect_pricing` antwortete `anon` noch
mit `HTTP 200`.

**Fremdschlüssel** stehen als auskommentierter Schritt 2 am Dateiende.
`insurance_policies.risk_level` und `submission_tickets.plan_type` sind live
freier Text. Ein FK auf die heute **leeren** Referenztabellen würde an jeder
bestehenden Zeile scheitern — er kann erst nach dem Befüllen gesetzt werden.
Der Block enthält die Vorprüfungs-Query dafür.

## ‼️ BUSINESS_INPUT_REQUIRED

Die Migration legt **Struktur an, keine Preise**. Nach dem Lauf sind beide
Tabellen strukturell vollständig und leer; `/admin/pricing` meldet dann
„Struktur steht, aber noch keine Preise hinterlegt" statt wie bisher
„Tabelle unvollständig".

Die Beträge in `20260310_compliance_and_plans.sql` (2900/12900/89900 bzw.
9900/29900/3900) sind Entwurfswerte und gelten **nicht**.

Befüllt wird über `supabase/seed/pricing.seed.template.sql`. Jeder Platzhalter
dort ist absichtlich SQL-ungültig (`<<<TAG_CENT>>>`), damit ein versehentlicher
Lauf mit Syntaxfehler abbricht statt still Fantasiepreise anzulegen.

**Vorher zu entscheiden:**

1. Wird Protect für alle vier Risikostufen verkauft, oder — wie der
   Buchungspfad heute annimmt (`booking.actions.ts:40`) — nur für `HIGH` und
   `VERY_HIGH`? Nicht verkaufte Stufen: Zeile streichen, **nicht** mit `0`
   befüllen (`0` heißt „gratis", nicht „gibt es nicht").
2. Netto oder brutto? Die Spalten heißen `*_cents` ohne Steuerkennzeichen.
3. Bleibt es bei `one_time` / `yearly` / `monthly`? Weitere Pläne brauchen
   zuerst eine Erweiterung von `compliance_plans_plan_type_chk`.
4. Beträge in Cent, ohne Trennzeichen: 49,00 EUR → `4900`.
