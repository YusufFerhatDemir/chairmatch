-- ──────────────────────────────────────────────────────────────────────
-- ChairMatch — Preis-Seed (TEMPLATE, nicht lauffaehig)
-- ──────────────────────────────────────────────────────────────────────
-- ‼️ BUSINESS_INPUT_REQUIRED ‼️
--
-- Diese Datei enthaelt bewusst KEINE Betraege. Jeder Platzhalter der Form
-- <<<…>>> ist absichtlich SQL-ungueltig: laeuft die Datei ungefuellt, bricht
-- Postgres mit einem Syntaxfehler ab, statt still Fantasiepreise anzulegen.
--
-- Voraussetzung: supabase/migrations/20260824_pricing_schema.sql ist
-- angewendet (sonst fehlen die Spalten).
--
-- Ablauf:
--   1. yusuf legt die Betraege fest (Netto in CENT, ohne Punkt/Komma:
--      49,00 EUR => 4900).
--   2. Diese Datei kopieren nach supabase/seed/pricing.seed.sql,
--      Platzhalter ersetzen, Zeilen streichen die es nicht geben soll.
--   3. Im Supabase-SQL-Editor ausfuehren.
--   4. supabase/seed/pricing.seed.sql NICHT committen, wenn die Preise
--      vertraulich sind — sonst mit Datum committen, damit die
--      Preisgeschichte nachvollziehbar bleibt.
--
-- Offene Geschaeftsfragen, die vor Schritt 1 beantwortet sein muessen:
--   * Wird Protect fuer alle vier Risikostufen verkauft oder — wie der
--     Buchungspfad heute annimmt (src/modules/booking/booking.actions.ts:40)
--     — nur fuer HIGH und VERY_HIGH? Nicht verkaufte Stufen: Zeile streichen,
--     NICHT mit 0 befuellen (0 heisst "gratis", nicht "gibt es nicht").
--   * Sind die Betraege netto oder brutto? Die Spalten heissen *_cents ohne
--     Steuerkennzeichen — die Konvention gehoert hier dokumentiert.
--   * Bleibt es bei den drei Plan-Namen one_time/yearly/monthly? Weitere
--     Namen brauchen zuerst eine Erweiterung von
--     compliance_plans_plan_type_chk in der Migration.
-- ──────────────────────────────────────────────────────────────────────

-- ── ACHTUNG: GILT NUR VOR 20260826_pricing_gueltigkeit.sql ────────────
-- Dieses Template ueberschreibt den laufenden Preis
-- (`ON CONFLICT … DO UPDATE`). Danach ist nicht mehr feststellbar, welcher
-- Preis zum Zeitpunkt eines Vertrags galt.
--
-- Sobald `supabase/migrations/20260826_pricing_gueltigkeit.sql`
-- angewendet ist, gibt es den UNIQUE-Index auf risk_level/plan_type nicht
-- mehr und diese Datei scheitert mit 42P10. Dann statt ihrer:
--   supabase/seed/pricing.seed.versioniert.template.sql
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- ChairMatch Protect — eine Zeile je verkaufter Risikostufe
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.protect_pricing
  (risk_level, day_price_cents, month_price_cents, year_price_cents, currency, active)
VALUES
  ('HIGH',      <<<TAG_CENT>>>, <<<MONAT_CENT>>>, <<<JAHR_CENT>>>, 'EUR', true),
  ('VERY_HIGH', <<<TAG_CENT>>>, <<<MONAT_CENT>>>, <<<JAHR_CENT>>>, 'EUR', true)
ON CONFLICT (risk_level) DO UPDATE SET
  day_price_cents   = EXCLUDED.day_price_cents,
  month_price_cents = EXCLUDED.month_price_cents,
  year_price_cents  = EXCLUDED.year_price_cents,
  currency          = EXCLUDED.currency,
  active            = EXCLUDED.active,
  updated_at        = now();

-- ══════════════════════════════════════════════════════════════════════
-- Einreich-Service — eine Zeile je angebotenem Plan
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.compliance_plans
  (plan_type, price_cents, included_submissions, min_term_months,
   extra_submission_price_cents, currency, active)
VALUES
  ('one_time', <<<PREIS_CENT>>>, <<<INKL_EINREICHUNGEN>>>, 0,
   <<<EXTRA_CENT>>>, 'EUR', true),
  ('yearly',   <<<PREIS_CENT>>>, <<<INKL_EINREICHUNGEN>>>, <<<LAUFZEIT_MONATE>>>,
   <<<EXTRA_CENT>>>, 'EUR', true),
  ('monthly',  <<<PREIS_CENT>>>, <<<INKL_EINREICHUNGEN>>>, <<<LAUFZEIT_MONATE>>>,
   <<<EXTRA_CENT>>>, 'EUR', true)
ON CONFLICT (plan_type) DO UPDATE SET
  price_cents                  = EXCLUDED.price_cents,
  included_submissions         = EXCLUDED.included_submissions,
  min_term_months              = EXCLUDED.min_term_months,
  extra_submission_price_cents = EXCLUDED.extra_submission_price_cents,
  currency                     = EXCLUDED.currency,
  active                       = EXCLUDED.active,
  updated_at                   = now();

COMMIT;

-- Gegenprobe nach dem Lauf (muss die eben gesetzten Zeilen zeigen):
--   SELECT risk_level, day_price_cents, month_price_cents, year_price_cents
--     FROM public.protect_pricing ORDER BY risk_level;
--   SELECT plan_type, price_cents, included_submissions, min_term_months,
--          extra_submission_price_cents
--     FROM public.compliance_plans ORDER BY plan_type;
