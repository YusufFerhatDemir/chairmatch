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

-- ══════════════════════════════════════════════════════════════════════
-- DER PRUEFVORGANG
-- ══════════════════════════════════════════════════════════════════════
--
-- Die Spalten oben sagen, WAS geprueft ist. Diese Tabelle sagt, WIE es dazu
-- kam: wer eingereicht hat, wer angesehen hat, wer entschieden hat, und bei
-- einer Ablehnung warum. Ohne diesen Teil bliebe das Stufenmodell eine
-- Behauptung mit besserer Struktur — genau der Vorwurf, den es an
-- `salons.is_verified` richtet.
--
-- Logik und Uebergangstabelle stehen in src/modules/verification/review.ts
-- und sind dort getestet.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
    -- `expired` ist ein EIGENER Zustand: „war einmal belegt, ist es nicht
    -- mehr" ist etwas anderes als `rejected` (geprueft, durchgefallen) und
    -- als `not_submitted` (nie versucht).
    CREATE TYPE public.review_status AS ENUM
      ('not_submitted', 'submitted', 'in_review', 'info_requested',
       'approved', 'rejected', 'expired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rejection_reason') THEN
    CREATE TYPE public.rejection_reason AS ENUM
      ('unreadable', 'expired_document', 'mismatch', 'wrong_document',
       'suspected_forgery', 'incomplete', 'other');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.verification_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Auf wen oder was sich der Vorgang bezieht. Gewerbe und Qualifikation
  -- haengen am BETRIEB, Identitaet an der PERSON — deshalb beides moeglich.
  subject_type  text NOT NULL CHECK (subject_type IN ('profile', 'salon')),
  subject_id    uuid NOT NULL,
  dimension     text NOT NULL CHECK (dimension IN
                  ('email', 'telefon', 'identitaet', 'gewerbe', 'qualifikation')),
  status        public.review_status NOT NULL DEFAULT 'not_submitted',
  reviewer_id       uuid REFERENCES auth.users(id),
  reviewed_at       timestamptz,
  rejection_reason  public.rejection_reason,
  rejection_note    text,
  -- NULL = unbefristet. Welche Nachweisart wie lange gilt, ist offen
  -- (BUSINESS_DECISION_REQUIRED in review.ts).
  expires_at        timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- Eine Entscheidung ohne Namen ist keine.
  CONSTRAINT verification_reviews_decision_has_reviewer CHECK (
    status NOT IN ('approved', 'rejected')
    OR (reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  -- Eine Ablehnung ohne Grund ist fuer den Betroffenen nicht handhabbar.
  CONSTRAINT verification_reviews_rejection_has_reason CHECK (
    (status = 'rejected') = (rejection_reason IS NOT NULL)
  ),
  -- Nur ein genehmigter Nachweis kann ablaufen.
  CONSTRAINT verification_reviews_expiry_only_approved CHECK (
    expires_at IS NULL OR status IN ('approved', 'expired')
  )
);

-- Ein laufender Vorgang je Subjekt und Dimension. Abgeschlossene blockieren
-- einen neuen Versuch nicht.
CREATE UNIQUE INDEX IF NOT EXISTS verification_reviews_ein_laufender
  ON public.verification_reviews (subject_type, subject_id, dimension)
  WHERE status IN ('submitted', 'in_review', 'info_requested');

-- Fuer den Ablauf-Lauf: welche Nachweise sind faellig?
CREATE INDEX IF NOT EXISTS verification_reviews_expiry_idx
  ON public.verification_reviews (expires_at)
  WHERE status = 'approved' AND expires_at IS NOT NULL;

-- Die eingereichten Dateien liegen in `documents`; hier nur die Zuordnung.
CREATE TABLE IF NOT EXISTS public.verification_review_documents (
  review_id   uuid NOT NULL REFERENCES public.verification_reviews(id) ON DELETE CASCADE,
  document_id uuid NOT NULL,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, document_id)
);

-- Der Verlauf. Ein Vorgang ohne Protokoll ist eine Behauptung.
CREATE TABLE IF NOT EXISTS public.verification_review_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  uuid NOT NULL REFERENCES public.verification_reviews(id) ON DELETE CASCADE,
  at         timestamptz NOT NULL DEFAULT now(),
  -- NULL bei Ereignissen, die das System ausloest (Ablauf).
  by_user    uuid REFERENCES auth.users(id),
  status     public.review_status NOT NULL,
  note       text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS verification_review_events_review_idx
  ON public.verification_review_events (review_id, at);

REVOKE ALL ON TABLE public.verification_reviews           FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.verification_review_documents  FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.verification_review_events     FROM anon, authenticated, PUBLIC;

ALTER TABLE public.verification_reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_review_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_review_events    ENABLE ROW LEVEL SECURITY;

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
