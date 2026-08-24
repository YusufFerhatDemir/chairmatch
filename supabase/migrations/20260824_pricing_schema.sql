-- ──────────────────────────────────────────────────────────────────────
-- ChairMatch — Preis-/Compliance-Schema (Stand 2026-08-24)
-- ──────────────────────────────────────────────────────────────────────
-- Befund (PostgREST-Spaltenprobe gegen pwdbjqfpgumyfktbfswg, ANON-Key,
-- ?select=<spalte> → 42703 wenn die Spalte fehlt — der Fehler kommt vor der
-- Rechtepruefung):
--
--   protect_pricing   live: id, created_at        — sonst NICHTS
--   compliance_plans  live: id, created_at        — sonst NICHTS
--
-- Der Code erwartet dagegen (src/lib/database.types.ts:592-598,
-- src/app/(admin)/admin/pricing/page.tsx):
--   protect_pricing:  risk_level, day_price_cents, month_price_cents,
--                     year_price_cents, currency, active
--   compliance_plans: plan_type, price_cents, included_submissions,
--                     min_term_months, extra_submission_price_cents
--
-- 20260310_compliance_and_plans.sql beschreibt diese Spalten zwar, wurde live
-- aber nie in dieser Form angewendet: `CREATE TABLE IF NOT EXISTS` ist auf
-- einer bereits bestehenden Tabelle wirkungslos. Deshalb hier ausschliesslich
-- ALTER … ADD COLUMN IF NOT EXISTS.
--
-- ‼️ BUSINESS_INPUT_REQUIRED ‼️
-- Diese Migration legt STRUKTUR an, KEINE Preise. Beide Tabellen bleiben nach
-- dem Lauf leer. Welche Risikostufen und welche Betraege verkauft werden, ist
-- eine Geschaeftsentscheidung von yusuf — sie darf nicht aus Migrations- oder
-- Anzeigecode erraten werden. Die Betraege in 20260310 (2900/12900/89900 bzw.
-- 9900/29900/3900) sind Beispielwerte aus einem Entwurf und gelten NICHT.
-- Befuellt wird ueber `supabase/seed/pricing.seed.template.sql`.
--
-- Muss im Supabase-SQL-Editor angewendet werden.
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1. protect_pricing — Preis-Konfiguration ChairMatch Protect
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.protect_pricing
  ADD COLUMN IF NOT EXISTS risk_level        text,
  ADD COLUMN IF NOT EXISTS day_price_cents   integer,
  ADD COLUMN IF NOT EXISTS month_price_cents integer,
  ADD COLUMN IF NOT EXISTS year_price_cents  integer,
  ADD COLUMN IF NOT EXISTS currency          text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS active            boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz NOT NULL DEFAULT now();

-- NOT NULL nur setzen, wenn die Tabelle leer ist. Auf einer befuellten
-- Tabelle wuerde SET NOT NULL hart scheitern und die ganze Migration
-- zurueckrollen — die Meldung sagt dann, was zu tun ist.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.protect_pricing;
  IF n = 0 THEN
    ALTER TABLE public.protect_pricing
      ALTER COLUMN risk_level        SET NOT NULL,
      ALTER COLUMN day_price_cents   SET NOT NULL,
      ALTER COLUMN month_price_cents SET NOT NULL,
      ALTER COLUMN year_price_cents  SET NOT NULL;
  ELSE
    RAISE NOTICE 'protect_pricing hat % Zeile(n) — NOT NULL uebersprungen. Zeilen pruefen/befuellen, dann SET NOT NULL manuell nachziehen.', n;
  END IF;
END $$;

-- Eine Zeile pro Risikostufe — verhindert zwei konkurrierende Preise fuer
-- dieselbe Stufe und macht `ON CONFLICT (risk_level)` im Seed moeglich.
CREATE UNIQUE INDEX IF NOT EXISTS protect_pricing_risk_level_key
  ON public.protect_pricing (risk_level);

-- Erlaubte Stufen = die Stufen, die der Code kennt
-- (src/components/RiskBadge.tsx:3). Keine erfundene Taxonomie.
ALTER TABLE public.protect_pricing DROP CONSTRAINT IF EXISTS protect_pricing_risk_level_chk;
ALTER TABLE public.protect_pricing ADD CONSTRAINT protect_pricing_risk_level_chk
  CHECK (risk_level IN ('LOW', 'MED', 'HIGH', 'VERY_HIGH'));

-- Preise: Cent-Integer, nie negativ. 0 ist bewusst erlaubt (Freistufe).
ALTER TABLE public.protect_pricing DROP CONSTRAINT IF EXISTS protect_pricing_prices_chk;
ALTER TABLE public.protect_pricing ADD CONSTRAINT protect_pricing_prices_chk
  CHECK (day_price_cents >= 0 AND month_price_cents >= 0 AND year_price_cents >= 0);

-- Kein CHECK auf day <= month <= year: dass ein Jahr teurer sein muss als ein
-- Tag ist eine Preisannahme, keine technische Invariante. Wenn das Modell
-- feststeht, kann es hier nachgezogen werden.

ALTER TABLE public.protect_pricing DROP CONSTRAINT IF EXISTS protect_pricing_currency_chk;
ALTER TABLE public.protect_pricing ADD CONSTRAINT protect_pricing_currency_chk
  CHECK (currency ~ '^[A-Z]{3}$');

-- ══════════════════════════════════════════════════════════════════════
-- 2. compliance_plans — Preis-Konfiguration Einreich-Service
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.compliance_plans
  ADD COLUMN IF NOT EXISTS plan_type                    text,
  ADD COLUMN IF NOT EXISTS price_cents                  integer,
  ADD COLUMN IF NOT EXISTS included_submissions         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_term_months              integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_submission_price_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency                     text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS active                       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at                   timestamptz NOT NULL DEFAULT now();

DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.compliance_plans;
  IF n = 0 THEN
    ALTER TABLE public.compliance_plans
      ALTER COLUMN plan_type   SET NOT NULL,
      ALTER COLUMN price_cents SET NOT NULL;
  ELSE
    RAISE NOTICE 'compliance_plans hat % Zeile(n) — NOT NULL uebersprungen. Zeilen pruefen/befuellen, dann SET NOT NULL manuell nachziehen.', n;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS compliance_plans_plan_type_key
  ON public.compliance_plans (plan_type);

-- Plan-Namen (NICHT Preise) aus 20260310_compliance_and_plans.sql
-- uebernommen — das sind die einzigen Bezeichner, die im Repo existieren.
-- ‼️ BUSINESS_INPUT_REQUIRED: braucht das Angebot weitere Plaene, gehoert
-- diese Liste erweitert, bevor der Seed laeuft.
ALTER TABLE public.compliance_plans DROP CONSTRAINT IF EXISTS compliance_plans_plan_type_chk;
ALTER TABLE public.compliance_plans ADD CONSTRAINT compliance_plans_plan_type_chk
  CHECK (plan_type IN ('one_time', 'yearly', 'monthly'));

ALTER TABLE public.compliance_plans DROP CONSTRAINT IF EXISTS compliance_plans_prices_chk;
ALTER TABLE public.compliance_plans ADD CONSTRAINT compliance_plans_prices_chk
  CHECK (price_cents >= 0 AND extra_submission_price_cents >= 0);

ALTER TABLE public.compliance_plans DROP CONSTRAINT IF EXISTS compliance_plans_counts_chk;
ALTER TABLE public.compliance_plans ADD CONSTRAINT compliance_plans_counts_chk
  CHECK (included_submissions >= 0 AND min_term_months >= 0);

ALTER TABLE public.compliance_plans DROP CONSTRAINT IF EXISTS compliance_plans_currency_chk;
ALTER TABLE public.compliance_plans ADD CONSTRAINT compliance_plans_currency_chk
  CHECK (currency ~ '^[A-Z]{3}$');

-- ══════════════════════════════════════════════════════════════════════
-- 3. RLS — beide Tabellen sind reine Server-Konfiguration
-- ══════════════════════════════════════════════════════════════════════
-- Gelesen werden sie ausschliesslich in /admin/pricing ueber
-- getSupabaseAdmin() (service_role umgeht RLS). Kein Client braucht Zugriff.
--
-- Stand der Probe 2026-08-24: `compliance_plans` antwortet anon bereits mit
-- 42501 (dicht). `protect_pricing` antwortet anon mit HTTP 200 — die Tabelle
-- ist also weiterhin offen, 20260819_rls_close_gaps.sql ist live nicht
-- angewendet. Solange keine Preise drinstehen, ist der Schaden null; mit
-- Preisen waere es eine Integritaetsluecke. Deshalb hier mitgeschlossen.

ALTER TABLE public.protect_pricing  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_plans ENABLE ROW LEVEL SECURITY;

-- Alt-Policies aus frueheren Entwuerfen entfernen (FOR ALL USING (true)
-- haette RLS wirkungslos gemacht).
DROP POLICY IF EXISTS "protect_pricing_all"          ON public.protect_pricing;
DROP POLICY IF EXISTS "protect_pricing_public_read"  ON public.protect_pricing;
DROP POLICY IF EXISTS "compliance_plans_all"         ON public.compliance_plans;
DROP POLICY IF EXISTS "compliance_plans_public_read" ON public.compliance_plans;

-- Bewusst KEINE Policy: RLS an + keine Policy = deny fuer anon/authenticated.
REVOKE ALL ON public.protect_pricing  FROM anon, authenticated;
REVOKE ALL ON public.compliance_plans FROM anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 4. Preise — BEWUSST NICHT ENTHALTEN
-- ══════════════════════════════════════════════════════════════════════
-- ‼️ BUSINESS_INPUT_REQUIRED ‼️
-- Hier steht absichtlich kein INSERT. Nach dieser Migration sind beide
-- Tabellen strukturell vollstaendig und leer, /admin/pricing meldet
-- "Keine Eintraege. Migration ausfuehren." statt "Tabelle unvollstaendig".
-- Befuellt wird ueber supabase/seed/pricing.seed.template.sql, sobald yusuf
-- die Betraege festgelegt hat.

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- 5. Schritt 2 — Fremdschluessel, ERST NACH dem Befuellen ausfuehren
-- ══════════════════════════════════════════════════════════════════════
-- `insurance_policies` fuehrt live `risk_level` und `plan_type` als freien
-- Text. Sobald protect_pricing/compliance_plans befuellt sind, koennen diese
-- Spalten per FK gebunden werden — vorher nicht: gegen eine leere
-- Referenztabelle scheitert jede bestehende Zeile.
--
-- Der Block laeuft absichtlich NICHT automatisch mit. Er ist auskommentiert,
-- damit ein versehentlicher Gesamtlauf dieser Datei nichts sperrt.
--
--   BEGIN;
--   -- Vorpruefung: welche Werte wuerden den FK verletzen?
--   SELECT DISTINCT ip.risk_level
--     FROM public.insurance_policies ip
--    WHERE ip.risk_level IS NOT NULL
--      AND NOT EXISTS (SELECT 1 FROM public.protect_pricing p
--                       WHERE p.risk_level = ip.risk_level);
--   -- Leeres Ergebnis => FK kann gesetzt werden:
--   ALTER TABLE public.insurance_policies
--     ADD CONSTRAINT insurance_policies_risk_level_fkey
--     FOREIGN KEY (risk_level) REFERENCES public.protect_pricing (risk_level)
--     ON UPDATE CASCADE ON DELETE RESTRICT;
--   COMMIT;
--
-- Fuer submission_tickets.plan_type -> compliance_plans.plan_type gilt
-- dasselbe Muster. Achtung: submission_tickets.plan_type ist live NULLABLE
-- und wird derzeit von keinem API-Pfad geschrieben — der FK waere heute
-- folgenlos und sollte erst mit dem Buchungspfad zusammen kommen.
