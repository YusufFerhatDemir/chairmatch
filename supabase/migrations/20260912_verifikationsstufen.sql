-- 20260912_verifikationsstufen.sql
--
-- NICHT ANGEWENDET — in dieser Session gibt es keinen DDL-Zugang
-- (service_role rotiert, psql ohne IPv6-Route zum AAAA-only-Host, Pooler
-- ENOTFOUND, CLI ohne Token, kein Supabase-MCP). Anwenden kann das nur
-- jemand mit Dashboard-Zugang.
--
-- ══════════════════════════════════════════════════════════════════════
-- WOFUER
-- ══════════════════════════════════════════════════════════════════════
--
-- `salons.is_verified` ist heute EIN Bit und traegt eine Aussage, die es
-- nicht tragen kann. Gesetzt wird es an einer einzigen Stelle
-- (`src/app/api/admin/route.ts`, Aktion `salon-status` = `approved`), und
-- diese Stelle verlangt nichts. Dem gegenueber stehen 100 Stellen in 35
-- Dateien, die oeffentlich „verifiziert" sagen, davon 21 ueber Heilberufe.
--
-- Das Stufenmodell steht im Code und ist getestet:
-- `src/modules/verification/verification.ts`.
--
-- ══════════════════════════════════════════════════════════════════════
-- DER ALTBESTAND LANDET AUF 'UNVERIFIED' — UND DAS IST DER PUNKT
-- ══════════════════════════════════════════════════════════════════════
--
-- Heute traegt JEDER freigeschaltete Salon `is_verified = true`. Die
-- naheliegende Migration waere, daraus eine Stufe zu machen. Sie waere
-- falsch: hinter dem Flag steht ein Admin-Klick und kein Nachweis, und jede
-- Stufe ausser `UNVERIFIED` wuerde eine Pruefung behaupten, die es nie gab.
--
-- Deshalb ZWEI Felder statt einem:
--
--   verification_tier = 'UNVERIFIED'   -- was geprueft wurde: nichts
--   legacy_verified   = true           -- dass die Plattform freigegeben hat
--
-- Es geht damit keine Information verloren — der Admin-Klick bleibt
-- sichtbar und auswertbar —, und trotzdem behauptet niemand eine Pruefung.
-- Die oeffentliche Anzeige haengt an `verification_tier`, nie an
-- `legacy_verified`.
--
-- `is_verified` selbst bleibt unveraendert stehen. Es zu loeschen wuerde
-- schlagartig aendern, was auf 100 oeffentlichen Stellen behauptet wird,
-- ohne dass jemand entschieden haette, was dort kuenftig stehen soll.
-- `salonIsPubliclyVisible` / `salonAcceptsBusiness` haengen ohnehin an
-- `is_active`, nicht hieran.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_tier') THEN
    CREATE TYPE public.verification_tier AS ENUM
      ('UNVERIFIED', 'BASIC', 'CONTACT', 'BUSINESS', 'PROFESSIONAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_state') THEN
    -- Je Dimension. `not_collected` ist ein eigener Zustand und NICHT
    -- dasselbe wie `pending`: das eine heisst „fuer diese Pruefung gibt es
    -- keinen Vorgang", das andere „laeuft, Ergebnis steht aus". Wer beides
    -- zu false zusammenzieht, kann hinterher nicht sagen, ob jemand
    -- durchgefallen ist oder nie gefragt wurde.
    CREATE TYPE public.verification_state AS ENUM
      ('not_collected', 'pending', 'confirmed', 'rejected');
  END IF;
END $$;

-- ── profiles ─────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_tier public.verification_tier
    NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS verif_email         public.verification_state NOT NULL DEFAULT 'not_collected',
  ADD COLUMN IF NOT EXISTS verif_phone         public.verification_state NOT NULL DEFAULT 'not_collected',
  ADD COLUMN IF NOT EXISTS verif_identity      public.verification_state NOT NULL DEFAULT 'not_collected',
  ADD COLUMN IF NOT EXISTS verif_business      public.verification_state NOT NULL DEFAULT 'not_collected',
  ADD COLUMN IF NOT EXISTS verif_qualification public.verification_state NOT NULL DEFAULT 'not_collected',
  ADD COLUMN IF NOT EXISTS verified_at            timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by            uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verification_evidence  text,
  ADD COLUMN IF NOT EXISTS verification_expiry    timestamptz;

-- ── salons ───────────────────────────────────────────────────────────
-- Gewerbe und Qualifikation haengen am BETRIEB, nicht an der Person: ein
-- Inhaber mit zwei Salons kann fuer den einen eine Gewerbeanmeldung
-- vorgelegt haben und fuer den anderen nicht.
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS verification_tier public.verification_tier
    NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS legacy_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verif_business      public.verification_state NOT NULL DEFAULT 'not_collected',
  ADD COLUMN IF NOT EXISTS verif_qualification public.verification_state NOT NULL DEFAULT 'not_collected',
  ADD COLUMN IF NOT EXISTS verified_at            timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by            uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verification_evidence  text,
  ADD COLUMN IF NOT EXISTS verification_expiry    timestamptz;

-- Der EINZIGE Backfill: der Admin-Klick wird uebernommen, aber als das,
-- was er ist. Die Stufe bleibt UNVERIFIED.
UPDATE public.salons
   SET legacy_verified = true
 WHERE is_verified IS TRUE
   AND legacy_verified IS FALSE;

-- Eine bestaetigte oder abgelehnte Stufe ohne Pruefer und Zeitpunkt ist
-- kein Vorgang, sondern wieder nur eine Behauptung. `not_collected` und
-- `pending` bleiben frei.
ALTER TABLE public.salons
  DROP CONSTRAINT IF EXISTS salons_verification_has_record;
ALTER TABLE public.salons
  ADD CONSTRAINT salons_verification_has_record CHECK (
    (verif_business      IN ('not_collected', 'pending')
     AND verif_qualification IN ('not_collected', 'pending'))
    OR (verified_by IS NOT NULL AND verified_at IS NOT NULL)
  );

-- Ein Ablaufdatum vor dem Pruefdatum ist ein Tippfehler, kein Zustand.
ALTER TABLE public.salons
  DROP CONSTRAINT IF EXISTS salons_verification_expiry_nach_pruefung;
ALTER TABLE public.salons
  ADD CONSTRAINT salons_verification_expiry_nach_pruefung CHECK (
    verification_expiry IS NULL
    OR verified_at IS NULL
    OR verification_expiry > verified_at
  );

CREATE INDEX IF NOT EXISTS salons_verification_tier_idx
  ON public.salons (verification_tier)
  WHERE verification_tier <> 'UNVERIFIED';

-- Diese Spalten gehoeren niemandem ausser dem Dienstschluessel. `anon` und
-- `authenticated` haben auf beiden Tabellen ohnehin kein Recht
-- (nachgemessen 12.09.2026: 42501) — die Zeilen halten das fest.
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.salons   FROM anon, authenticated, PUBLIC;

COMMIT;

-- GEGENPROBE NACH DEM ANWENDEN:
--   SELECT verification_tier, legacy_verified, count(*)
--     FROM public.salons GROUP BY 1, 2;
--   -- erwartet: ausschliesslich UNVERIFIED; legacy_verified spiegelt is_verified
--   bash scripts/anon-perimeter-probe.sh   -- unveraendert dicht erwartet
--   npm test -- --run                      -- Stufenmodell-Tests bleiben gruen
