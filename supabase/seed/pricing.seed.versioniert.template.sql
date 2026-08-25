-- ──────────────────────────────────────────────────────────────────────
-- ChairMatch — Preis-Seed MIT Gueltigkeitszeitraum (TEMPLATE, nicht lauffaehig)
-- ──────────────────────────────────────────────────────────────────────
-- ‼️ BUSINESS_INPUT_REQUIRED ‼️
--
-- Diese Datei enthaelt bewusst KEINE Betraege. Jeder Platzhalter der Form
-- <<<…>>> ist absichtlich SQL-ungueltig: laeuft die Datei ungefuellt,
-- bricht Postgres mit einem Syntaxfehler ab, statt still Fantasiepreise
-- anzulegen.
--
-- ── WANN DIESE DATEI STATT pricing.seed.template.sql ──────────────────
-- Nur NACH `supabase/migrations/20260826_pricing_gueltigkeit.sql`.
--
-- Der Unterschied ist nicht kosmetisch. Das alte Template ueberschreibt
-- den laufenden Preis (`ON CONFLICT … DO UPDATE`) — danach ist nicht mehr
-- feststellbar, welcher Preis zum Zeitpunkt eines Vertrags galt. Diese
-- Datei schliesst stattdessen den laufenden Preis ab und legt den neuen
-- als eigene Zeile an.
--
-- Nach der Gueltigkeitsmigration gibt es den UNIQUE-Index auf
-- `risk_level` / `plan_type` nicht mehr; das alte Template scheitert dort
-- mit 42P10 („no unique constraint matching ON CONFLICT"). Das ist
-- Absicht — es soll auffallen, nicht durchlaufen.
--
-- Ablauf:
--   1. Betraege festlegen (Netto in CENT, ohne Punkt/Komma:
--      49,00 EUR => 4900).
--   2. Stichtag festlegen: ab wann gilt der neue Preis?
--      Der laufende Preis wird zum SELBEN Datum beendet — der Zeitraum
--      ist halboffen, der Stichtag gehoert dem NEUEN Preis.
--   3. Diese Datei kopieren nach
--      supabase/seed/pricing.seed.versioniert.sql, Platzhalter ersetzen,
--      nicht verkaufte Zeilen streichen.
--   4. Im Supabase-SQL-Editor ausfuehren.
--
--   Nicht verkaufte Stufen: Zeile STREICHEN, nicht mit 0 befuellen.
--   0 heisst „gratis", nicht „gibt es nicht".
--
-- Offene Geschaeftsfragen — unveraendert aus pricing.seed.template.sql:
--   * Welche Risikostufen werden ueberhaupt verkauft?
--   * Sind die Betraege netto oder brutto?
--   * Bleibt es bei one_time / yearly / monthly?
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 0. Stichtag
-- ══════════════════════════════════════════════════════════════════════
-- Ein Wert, an zwei Stellen benutzt: Ende des alten, Beginn des neuen
-- Preises. Zwei getrennt eingetippte Daten waeren die naheliegende
-- Fehlerquelle — ein Tag Luecke oder ein Tag Ueberlappung.
CREATE TEMP TABLE _stichtag AS SELECT DATE '<<<GUELTIG_AB_JJJJ_MM_TT>>>' AS ab;

-- ══════════════════════════════════════════════════════════════════════
-- 1. Laufende Preise abschliessen
-- ══════════════════════════════════════════════════════════════════════
-- Nur die offenen (effective_to IS NULL) und nur die, die zum Stichtag
-- schon laufen. Ein bereits geplanter Zukunftspreis wird nicht angefasst.
UPDATE public.protect_pricing p
   SET effective_to = s.ab, updated_at = now()
  FROM _stichtag s
 WHERE p.effective_to IS NULL
   AND p.active
   AND p.effective_from < s.ab;

UPDATE public.compliance_plans c
   SET effective_to = s.ab, updated_at = now()
  FROM _stichtag s
 WHERE c.effective_to IS NULL
   AND c.active
   AND c.effective_from < s.ab;

-- ══════════════════════════════════════════════════════════════════════
-- 2. ChairMatch Protect — eine Zeile je verkaufter Risikostufe
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.protect_pricing
  (risk_level, day_price_cents, month_price_cents, year_price_cents,
   currency, active, effective_from, effective_to)
SELECT v.risk_level, v.tag, v.monat, v.jahr, 'EUR', true, s.ab, NULL
  FROM _stichtag s,
       (VALUES
          ('HIGH',      <<<TAG_CENT>>>, <<<MONAT_CENT>>>, <<<JAHR_CENT>>>),
          ('VERY_HIGH', <<<TAG_CENT>>>, <<<MONAT_CENT>>>, <<<JAHR_CENT>>>)
       ) AS v(risk_level, tag, monat, jahr);

-- ══════════════════════════════════════════════════════════════════════
-- 3. Einreich-Service — eine Zeile je angebotenem Plan
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.compliance_plans
  (plan_type, price_cents, included_submissions, min_term_months,
   extra_submission_price_cents, currency, active, effective_from, effective_to)
SELECT v.plan_type, v.preis, v.inkl, v.laufzeit, v.extra, 'EUR', true, s.ab, NULL
  FROM _stichtag s,
       (VALUES
          ('one_time', <<<PREIS_CENT>>>, <<<INKL_EINREICHUNGEN>>>, 0,
           <<<EXTRA_CENT>>>),
          ('yearly',   <<<PREIS_CENT>>>, <<<INKL_EINREICHUNGEN>>>, <<<LAUFZEIT_MONATE>>>,
           <<<EXTRA_CENT>>>),
          ('monthly',  <<<PREIS_CENT>>>, <<<INKL_EINREICHUNGEN>>>, <<<LAUFZEIT_MONATE>>>,
           <<<EXTRA_CENT>>>)
       ) AS v(plan_type, preis, inkl, laufzeit, extra);

DROP TABLE _stichtag;

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- Gegenprobe nach dem Lauf
-- ══════════════════════════════════════════════════════════════════════
-- Je Stufe darf es GENAU EINEN offenen Zeitraum geben:
--   SELECT risk_level, count(*) FILTER (WHERE effective_to IS NULL AND active)
--     FROM public.protect_pricing GROUP BY 1;      -- ueberall 1
--   SELECT plan_type, count(*) FILTER (WHERE effective_to IS NULL AND active)
--     FROM public.compliance_plans GROUP BY 1;     -- ueberall 1
--
-- Und keine Luecke zwischen alt und neu:
--   SELECT risk_level, effective_from, effective_to
--     FROM public.protect_pricing ORDER BY risk_level, effective_from;
