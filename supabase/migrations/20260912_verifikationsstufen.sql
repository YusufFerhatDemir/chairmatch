-- 20260912_verifikationsstufen.sql
--
-- NICHT ANGEWENDET — in dieser Session gibt es keinen DDL-Zugang
-- (service_role rotiert, psql ohne IPv6-Route zum AAAA-only-Host, CLI ohne
-- Token, kein Supabase-MCP). Anwenden kann das nur jemand mit
-- Dashboard-Zugang.
--
-- ══════════════════════════════════════════════════════════════════════
-- WOFUER
-- ══════════════════════════════════════════════════════════════════════
--
-- `salons.is_verified` ist heute EIN Bit und traegt eine Aussage, die es
-- nicht tragen kann. Gesetzt wird es an einer einzigen Stelle
-- (`src/app/api/admin/route.ts`, Aktion `salon-status` = `approved`), und
-- diese Stelle verlangt nichts — keinen Ausweis, keine Gewerbeanmeldung,
-- keinen Registerauszug. Dem gegenueber stehen 100 Stellen in 35 Dateien,
-- die oeffentlich „verifiziert" sagen, davon 21 ueber Heilberufe.
--
-- Das Stufenmodell dazu steht bereits im Code und ist getestet:
-- `src/modules/verification/verification.ts`. Es rechnet heute aus Signalen,
-- die in drei verschiedenen Systemen liegen, und hat fuer alles, wofuer es
-- keine Quelle gibt, den ausdruecklichen Zustand `nicht_erhoben`. Diese
-- Migration gibt ihm einen Speicher.
--
-- WAS ES HEUTE AN QUELLEN GIBT (gemessen 12.09.2026):
--   email          auth.users.email_confirmed_at   — vorhanden, nicht gespiegelt
--   telefon        phone_verifications.verified    — vorhanden
--   identitaet     nichts
--   gewerbe        documents / authorities_packs   — Upload ja, Pruefung nein
--   qualifikation  nichts
--
-- ══════════════════════════════════════════════════════════════════════
-- WAS DIESE MIGRATION BEWUSST NICHT TUT
-- ══════════════════════════════════════════════════════════════════════
--
-- Sie fasst `is_verified` NICHT an. Das Feld bleibt, was es ist — die
-- Freigabe durch die Plattform —, und `salonIsPubliclyVisible` /
-- `salonAcceptsBusiness` haengen weiter an `is_active`, nicht hieran.
-- Wuerde diese Migration `is_verified` umdeuten oder loeschen, aenderte sich
-- schlagartig, was auf 100 oeffentlichen Stellen behauptet wird — und zwar
-- ohne dass jemand entschieden haette, was dort kuenftig stehen soll.
--
-- Sie setzt auch KEINE Stufe auf `bestaetigt`. Alle Spalten starten leer.
-- Ein Backfill aus `is_verified` waere genau der Fehler, den das Modell
-- beheben soll: aus einem Admin-Klick wuerden fuenf Pruefungen.

BEGIN;

-- Eine Stufe je Dimension. Der Default ist ausdruecklich `nicht_erhoben`
-- und nicht NULL: „wir haben nie gefragt" ist eine Aussage, kein fehlender
-- Wert, und NULL wuerde beim Lesen wieder zu „unbekannt" verschwimmen.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verifikationsstufe') THEN
    CREATE TYPE public.verifikationsstufe AS ENUM
      ('nicht_erhoben', 'offen', 'bestaetigt', 'abgelehnt');
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verif_email         public.verifikationsstufe NOT NULL DEFAULT 'nicht_erhoben',
  ADD COLUMN IF NOT EXISTS verif_telefon       public.verifikationsstufe NOT NULL DEFAULT 'nicht_erhoben',
  ADD COLUMN IF NOT EXISTS verif_identitaet    public.verifikationsstufe NOT NULL DEFAULT 'nicht_erhoben',
  ADD COLUMN IF NOT EXISTS verif_gewerbe       public.verifikationsstufe NOT NULL DEFAULT 'nicht_erhoben',
  ADD COLUMN IF NOT EXISTS verif_qualifikation public.verifikationsstufe NOT NULL DEFAULT 'nicht_erhoben';

-- WER hat wann geprueft. Ohne das ist eine Stufe eine Behauptung ohne
-- Vorgang — also genau der Zustand, den `is_verified` heute hat.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verif_geprueft_von uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verif_geprueft_am  timestamptz,
  ADD COLUMN IF NOT EXISTS verif_notiz        text;

-- Dieselben Spalten am Salon: die Gewerbe- und Qualifikationspruefung
-- haengt am BETRIEB, nicht an der Person. Ein Inhaber mit zwei Salons kann
-- fuer den einen eine Gewerbeanmeldung vorgelegt haben und fuer den anderen
-- nicht.
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS verif_gewerbe       public.verifikationsstufe NOT NULL DEFAULT 'nicht_erhoben',
  ADD COLUMN IF NOT EXISTS verif_qualifikation public.verifikationsstufe NOT NULL DEFAULT 'nicht_erhoben',
  ADD COLUMN IF NOT EXISTS verif_geprueft_von  uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verif_geprueft_am   timestamptz,
  ADD COLUMN IF NOT EXISTS verif_notiz         text;

-- Eine bestaetigte oder abgelehnte Stufe ohne Pruefer und Zeitpunkt ist
-- kein Vorgang. Der CHECK laesst `nicht_erhoben` und `offen` frei.
ALTER TABLE public.salons
  ADD CONSTRAINT salons_verif_hat_vorgang CHECK (
    (verif_gewerbe IN ('nicht_erhoben', 'offen')
     AND verif_qualifikation IN ('nicht_erhoben', 'offen'))
    OR (verif_geprueft_von IS NOT NULL AND verif_geprueft_am IS NOT NULL)
  );

-- Diese Spalten gehoeren niemandem ausser dem Dienstschluessel. `anon` und
-- `authenticated` haben auf `profiles` und `salons` ohnehin kein Recht
-- (nachgemessen: beide antworten 42501) — die Zeile haelt das fest, falls
-- das jemals aufgeweicht wird.
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.salons   FROM anon, authenticated, PUBLIC;

COMMIT;

-- GEGENPROBE NACH DEM ANWENDEN:
--   bash scripts/anon-perimeter-probe.sh     → unveraendert dicht erwartet
--   npm test -- --run                        → Stufenmodell-Tests bleiben gruen
