-- ──────────────────────────────────────────────────────────────────────
-- anon-Leserechte auf PII- und Betriebstabellen entziehen
-- ──────────────────────────────────────────────────────────────────────
-- Befund (Live-Sonde 2026-08-27, nur mit dem oeffentlichen ANON-Key):
--
-- Die Rolle `anon` hat auf einer Reihe von Tabellen ein Tabellen-SELECT-
-- GRANT, das sie nicht braucht. Bewiesen ueber PostgREST: eine Abfrage auf
-- eine erfundene Spalte antwortet mit 42703 ("column does not exist") statt
-- 42501 ("permission denied for table") — der Rechte-Check ist also schon
-- durch, und nur die Spalte fehlt. Zum Vergleich: newsletter_subscribers
-- antwortet 42501, dort ist kein GRANT gesetzt.
--
-- Was heute schuetzt, ist ausschliesslich RLS: die Tabellen haben entweder
-- gar keine Policy (newsletter_*) oder eine, die auf `authenticated` und die
-- eigene Zeile eingeschraenkt ist. Das ist EINE Schicht. Faellt sie — eine
-- versehentlich permissive Policy, ein `ALTER TABLE ... DISABLE ROW LEVEL
-- SECURITY`, eine Tabelle, die per CREATE TABLE ohne ENABLE nachgezogen wird
-- — liegt der Inhalt sofort oeffentlich unter /rest/v1/<tabelle> vor.
--
-- Konkret betroffen waere:
--   newsletter_sends       Kampagne ↔ Abonnent, also ein Zustellprotokoll:
--                          wer hat welche Mail bekommen, geoeffnet, geklickt.
--                          Heute 0 Zeilen — der Leak beginnt mit der ersten.
--   payout_accounts        Bankverbindung (iban, iban_last4, Kontoinhaber)
--   tenant_profiles        Klarname, Beruf, Lizenz-/Meisternummer
--   rental_requests        Freitext-Nachrichten, Wunschtermine, beide Parteien
--   user_uploads           storage_path auch nicht-oeffentlicher Zertifikate
--   staff                  Mitarbeitende der Salons
--   user_2fa               2FA-Zustand je Konto
--   rental_request_dedupe  Anfrage-Fingerprints je Nutzer
--   newsletter_campaigns   unversandte Entwuerfe
--
-- KEIN Client liest diese Tabellen: seit Track 6/7 macht keine einzige
-- 'use client'-Datei mehr ein .from(), und der ANON-Key wird serverseitig nur
-- noch fuer supabase.auth.* sowie profiles/consent_logs/login_attempts
-- benutzt. Jeder Zugriff hier laeuft ueber getSupabaseAdmin() (service_role),
-- und service_role ist von REVOKE ... FROM anon nicht betroffen.
--
-- Bewusst NICHT angefasst: categories, product_categories, onboarding_slides,
-- services, rental_equipment, salon_images. Die tragen oeffentlichen Katalog-
-- inhalt (keine PII), sind heute anon lesbar und sollen es bleiben.
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1. anon verliert jedes Recht auf den PII- und Betriebstabellen
-- ══════════════════════════════════════════════════════════════════════
-- REVOKE auf einer nicht existierenden Tabelle ist ein harter Fehler, und
-- das Live-Schema deckt sich nicht mit dem Repo (siehe schema-probe.sh).
-- Deshalb je Tabelle nur revoken, wenn sie wirklich da ist.
DO $$
DECLARE
  t text;
  gesperrt text[] := ARRAY[
    'newsletter_sends',
    'newsletter_campaigns',
    'payout_accounts',
    'tenant_profiles',
    'rental_requests',
    'rental_request_dedupe',
    'user_uploads',
    'staff',
    'user_2fa'
  ];
BEGIN
  FOREACH t IN ARRAY gesperrt LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
      -- RLS als zweite Schicht sicherstellen. Die Tabellen sollen sie laut
      -- ihrer anlegenden Migration ohnehin haben; hier steht sie nur nach,
      -- falls eine davon live ohne ENABLE entstanden ist.
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 2. payout_accounts: die IBAN-Sperre wirksam machen
-- ══════════════════════════════════════════════════════════════════════
-- 20260821_persistence_uploads_rentals.sql wollte die Klartext-IBAN auf
-- PostgREST-Ebene sperren:
--
--     REVOKE SELECT (iban) ON public.payout_accounts FROM anon, authenticated;
--
-- Das ist wirkungslos, solange daneben ein Tabellen-GRANT SELECT steht:
-- PostgreSQL prueft erst das Tabellenrecht, und das deckt ALLE Spalten ab —
-- ein Spalten-REVOKE kann ein Tabellenrecht nicht loechern. Live bestaetigt:
-- /rest/v1/payout_accounts?select=iban antwortet dem ANON-Key mit 200 (leeres
-- Ergebnis nur, weil die RLS-Policy `TO authenticated` lautet), nicht mit 42501.
--
-- Richtig ist: Tabellenrecht wegnehmen, dann die erlaubten Spalten einzeln
-- geben. anon bekommt oben schon gar nichts mehr, hier geht es um
-- `authenticated` — dort soll die Policy `payout_accounts_own_select`
-- weiterhin greifen, aber ohne die Klartext-IBAN.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'payout_accounts' AND c.relkind = 'r'
  ) THEN
    REVOKE ALL ON TABLE public.payout_accounts FROM authenticated;
    GRANT SELECT (user_id, context, iban_last4, account_holder, created_at, updated_at)
      ON public.payout_accounts TO authenticated;
  END IF;
END $$;

COMMIT;
