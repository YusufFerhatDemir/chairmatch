-- ──────────────────────────────────────────────────────────────────────
-- ChairMatch — Zeitliche Gueltigkeit fuer Preise (Stand 2026-08-25)
-- ──────────────────────────────────────────────────────────────────────
-- ‼️ NICHT ANGEWENDET. Muss im Supabase-SQL-Editor ausgefuehrt werden,
--    und zwar bewusst — sie aendert die Seed-Semantik (siehe unten).
--
-- ── BEFUND, DER DAZU FUEHRT ──────────────────────────────────────────
-- 20260824_pricing_schema.sql legt genau EINE Zeile je Risikostufe bzw.
-- je Plan-Typ an (UNIQUE-Index). Das verhindert wirksam zwei
-- konkurrierende aktive Preise — hat aber eine Kehrseite:
--
--   Es gibt keine Preisgeschichte. Der Seed schreibt per
--   `ON CONFLICT … DO UPDATE` ueber den alten Wert. Zu einem Vertrag von
--   gestern laesst sich danach nicht mehr feststellen, welcher Preis
--   damals galt.
--
-- Solange beide Tabellen leer sind, ist der Schaden null. Mit dem ersten
-- verkauften Vertrag ist es eine Nachweisluecke — gegenueber dem Kunden
-- und gegenueber dem Finanzamt.
--
-- ── WAS DIESE MIGRATION AENDERT ──────────────────────────────────────
--   1. `effective_from` / `effective_to` auf beiden Preistabellen.
--   2. Der UNIQUE-Index je Stufe/Plan faellt weg — sonst waere genau eine
--      Preiszeile moeglich und Versionierung unmoeglich.
--   3. An seine Stelle tritt ein EXCLUDE-Constraint: fuer dieselbe Stufe
--      duerfen sich die Gueltigkeitszeitraeume AKTIVER Zeilen nicht
--      ueberschneiden. Das ist die staerkere Zusicherung — sie gilt auch
--      dann noch, wenn es mehrere Zeilen gibt.
--
-- ── FOLGE FUER DEN SEED ──────────────────────────────────────────────
-- `supabase/seed/pricing.seed.template.sql` benutzt
-- `ON CONFLICT (risk_level)` bzw. `(plan_type)`. Dieser Konfliktziel-
-- Ausdruck braucht den UNIQUE-Index — nach dieser Migration gibt es ihn
-- nicht mehr, und der alte Seed scheitert mit 42P10.
--
-- Deshalb liegt daneben:
--   `supabase/seed/pricing.seed.versioniert.template.sql`
-- Es schliesst den laufenden Preis ab (setzt `effective_to`) und legt den
-- neuen als neue Zeile an, statt zu ueberschreiben.
--
-- REIHENFOLGE: erst diese Migration, dann NUR noch das versionierte
-- Template benutzen. Wer beide mischt, bekommt entweder 42P10 oder zwei
-- offene Preiszeitraeume.
--
-- ── BUSINESS_INPUT_REQUIRED BLEIBT ───────────────────────────────────
-- Auch diese Datei legt KEINEN Preis an. Sie aendert nur, wie Preise
-- gespeichert werden koennen.
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

-- btree_gist wird gebraucht, damit ein EXCLUDE-Constraint eine
-- Gleichheitsbedingung (risk_level =) mit einer Ueberlappungsbedingung
-- (daterange &&) kombinieren kann. Ohne die Erweiterung kennt gist den
-- `=`-Operator auf text nicht und die Migration scheitert mit 42883.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ══════════════════════════════════════════════════════════════════════
-- 1. protect_pricing
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.protect_pricing
  ADD COLUMN IF NOT EXISTS effective_from date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS effective_to   date;

-- Offenes Ende ist der Normalfall: `effective_to IS NULL` heisst „gilt
-- bis auf Weiteres". Ein Ende VOR dem Beginn ist immer ein Tippfehler.
ALTER TABLE public.protect_pricing DROP CONSTRAINT IF EXISTS protect_pricing_zeitraum_chk;
ALTER TABLE public.protect_pricing ADD CONSTRAINT protect_pricing_zeitraum_chk
  CHECK (effective_to IS NULL OR effective_to > effective_from);

-- Der bisherige Eindeutigkeits-Index muss weichen — er erlaubte nur EINE
-- Zeile je Stufe und damit keine zweite Preisperiode.
DROP INDEX IF EXISTS public.protect_pricing_risk_level_key;

-- Kein Ueberlappen AKTIVER Zeitraeume je Risikostufe.
--
-- `WHERE active` ist Absicht: eine abgeschaltete Altzeile darf im
-- Zeitraum einer neuen liegen (sie wird nicht mehr gelesen). Waere der
-- Filter nicht da, muesste man Historie loeschen, um einen Preis
-- korrigieren zu koennen — und genau das soll aufhoeren.
--
-- `daterange(effective_from, effective_to, '[)')` ist halboffen: ein
-- Preis, der am 01.03. endet, und einer, der am 01.03. beginnt,
-- ueberlappen NICHT. Mit '[]' waere der 01.03. doppelt belegt.
ALTER TABLE public.protect_pricing DROP CONSTRAINT IF EXISTS protect_pricing_kein_ueberlapp;
ALTER TABLE public.protect_pricing ADD CONSTRAINT protect_pricing_kein_ueberlapp
  EXCLUDE USING gist (
    risk_level WITH =,
    daterange(effective_from, effective_to, '[)') WITH &&
  ) WHERE (active);

CREATE INDEX IF NOT EXISTS protect_pricing_aktuell_idx
  ON public.protect_pricing (risk_level, effective_from DESC)
  WHERE active;

-- ══════════════════════════════════════════════════════════════════════
-- 2. compliance_plans
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.compliance_plans
  ADD COLUMN IF NOT EXISTS effective_from date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS effective_to   date;

ALTER TABLE public.compliance_plans DROP CONSTRAINT IF EXISTS compliance_plans_zeitraum_chk;
ALTER TABLE public.compliance_plans ADD CONSTRAINT compliance_plans_zeitraum_chk
  CHECK (effective_to IS NULL OR effective_to > effective_from);

DROP INDEX IF EXISTS public.compliance_plans_plan_type_key;

ALTER TABLE public.compliance_plans DROP CONSTRAINT IF EXISTS compliance_plans_kein_ueberlapp;
ALTER TABLE public.compliance_plans ADD CONSTRAINT compliance_plans_kein_ueberlapp
  EXCLUDE USING gist (
    plan_type WITH =,
    daterange(effective_from, effective_to, '[)') WITH &&
  ) WHERE (active);

CREATE INDEX IF NOT EXISTS compliance_plans_aktuell_idx
  ON public.compliance_plans (plan_type, effective_from DESC)
  WHERE active;

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- Gegenprobe nach dem Lauf
-- ══════════════════════════════════════════════════════════════════════
--   SELECT conname, contype FROM pg_constraint
--    WHERE conrelid IN ('public.protect_pricing'::regclass,
--                       'public.compliance_plans'::regclass)
--      AND conname LIKE '%ueberlapp%';        -- muss 2 Zeilen liefern, contype = 'x'
--
--   -- Der Constraint muss WIRKEN. Diese beiden INSERTs sind ein Test,
--   -- kein Seed — die zweite Anweisung MUSS mit 23P01 scheitern:
--   -- BEGIN;
--   --   INSERT INTO public.protect_pricing
--   --     (risk_level, day_price_cents, month_price_cents, year_price_cents,
--   --      effective_from) VALUES ('LOW', 0, 0, 0, '2026-01-01');
--   --   INSERT INTO public.protect_pricing
--   --     (risk_level, day_price_cents, month_price_cents, year_price_cents,
--   --      effective_from) VALUES ('LOW', 0, 0, 0, '2026-06-01');
--   -- ROLLBACK;
