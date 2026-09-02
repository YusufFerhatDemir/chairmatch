-- ──────────────────────────────────────────────────────────────────────
-- RLS auf den Tabellen, die keine Migration je eingeschaltet hat
-- ──────────────────────────────────────────────────────────────────────
-- ANLASS
--
-- Supabase meldet mindestens eine Tabelle im Schema `public` OHNE Row Level
-- Security. Die Meldung nennt keine Tabelle, deshalb ist sie hier gegen den
-- Repo-Bestand gegengerechnet worden:
--
--   $ grep -rhoiE 'alter table .* enable row level security' \
--       supabase/migrations/*.sql
--
-- Das ergibt 53 Tabellen. Die Live-Tabellenliste aus `scripts/schema-probe.sh`
-- enthaelt darueber hinaus NEUN Tabellen, fuer die es im ganzen Repo kein
-- `ENABLE ROW LEVEL SECURITY` gibt:
--
--   salons, services, bookings, booking_policies, staff, promo_codes,
--   rental_bookings, error_logs, newsletter_sends
--
-- Ob RLS live trotzdem an ist, laesst sich von aussen NICHT feststellen:
-- `supabase/migrations/*` ist fuer dieses Projekt nicht die Wahrheit (siehe
-- Kopfkommentar von scripts/schema-probe.sh), und die Meldung im Dashboard
-- ist der einzige Hinweis darauf, dass mindestens eine davon offen ist.
--
-- ══════════════════════════════════════════════════════════════════════
-- WAS DIE SONDE SCHON ZEIGT — UND WAS NICHT
-- ══════════════════════════════════════════════════════════════════════
--
-- Gegen die laufende Instanz geprueft (2026-09-02, nur lesend, ANON-Key):
--
--   salons 401 · services 401 · bookings 401 · booking_policies 401
--   staff 401 · promo_codes 401 · rental_bookings 401 · error_logs 401
--   newsletter_sends 401
--
-- Fuer `anon` ist also alles zu. (Nebenbefund: `services` und
-- `newsletter_sends` waren frueher anon lesbar — das ist inzwischen
-- geschlossen.)
--
-- Das deckt aber nur die HALBE Frage ab. Der eigentliche Schaden einer
-- fehlenden RLS liegt bei der Rolle `authenticated`: besteht dort ein
-- Tabellen-GRANT und ist RLS aus, kann JEDES angemeldete Konto mit seinem
-- eigenen JWT direkt unter /rest/v1/<tabelle> lesen und schreiben — an der
-- gesamten Anwendungslogik vorbei. Bei `bookings` und `staff` waere das
-- Fremd-PII, bei `promo_codes` die Rabattlogik, bei `salons` das
-- Freischalt-Flag `is_active`.
--
-- Diese Probe braucht ein echtes Nutzer-JWT und ist deshalb hier nicht
-- gelaufen.
--
-- ══════════════════════════════════════════════════════════════════════
-- WARUM DIESE MIGRATION GEFAHRLOS IST
-- ══════════════════════════════════════════════════════════════════════
--
-- `service_role` unterliegt weder RLS noch REVOKE. Die Anwendung greift auf
-- alle neun Tabellen ausschliesslich ueber `getSupabaseAdmin()`
-- (= service_role) zu; die einzige Datei, die den Browser-Client aus
-- src/lib/supabase.ts importiert, ist src/app/(public)/konto/page.tsx, und
-- die ruft dort nur `supabase.auth.*` auf — kein einziges `.from()`.
--
-- Es gibt bewusst KEINE Policies dazu: eine Policy ohne Client, der sie
-- nutzt, ist geratene Zugriffslogik. Wer spaeter direkten Client-Zugriff
-- braucht, schreibt die Policy zusammen mit dem Client.
--
-- ══════════════════════════════════════════════════════════════════════
-- STATUS: COMMITTET, NICHT ANGEWENDET
-- ══════════════════════════════════════════════════════════════════════
-- Es gibt in diesem Projekt keinen Migrations-Runner. Nach dem Einspielen
-- gehoert der Eintrag in docs/MIGRATION_LEDGER.md unter „Applied Entries" —
-- mit dem Ergebnis der Gegenprobe am Ende dieser Datei.
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

DO $$
DECLARE
  t text;
  ziele text[] := ARRAY[
    'salons',
    'services',
    'bookings',
    'booking_policies',
    'staff',
    'promo_codes',
    'rental_bookings',
    'error_logs',
    'newsletter_sends'
  ];
BEGIN
  FOREACH t IN ARRAY ziele LOOP
    -- Die Live-Tabellenliste deckt sich nicht mit dem Repo. Ein ALTER TABLE
    -- auf eine fehlende Tabelle ist ein harter Fehler und wuerde die ganze
    -- Transaktion kippen — deshalb je Tabelle pruefen.
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      -- FORCE gilt auch fuer den Tabellen-Eigentuemer. Ohne das umgeht ein
      -- Zugriff unter der Owner-Rolle die Policies stillschweigend.
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', t);
      RAISE NOTICE 'RLS + REVOKE gesetzt: %', t;
    ELSE
      RAISE NOTICE 'uebersprungen (Tabelle fehlt live): %', t;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- GEGENPROBE NACH DEM EINSPIELEN
-- ══════════════════════════════════════════════════════════════════════
--
-- (1) RLS steht auf allen neun — erwartet: neun Zeilen, alle `true`.
--
--   SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
--     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname = 'public'
--      AND c.relname IN ('salons','services','bookings','booking_policies',
--                        'staff','promo_codes','rental_bookings',
--                        'error_logs','newsletter_sends')
--    ORDER BY c.relname;
--
-- (2) Keine Tabelle im public-Schema ohne RLS — erwartet: 0 Zeilen.
--     Das ist die Abfrage, die die Dashboard-Meldung beantwortet.
--
--   SELECT c.relname
--     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
--    ORDER BY c.relname;
--
-- (3) Kein GRANT mehr fuer anon/authenticated — erwartet: 0 Zeilen.
--
--   SELECT table_name, grantee, privilege_type
--     FROM information_schema.role_table_grants
--    WHERE table_schema = 'public'
--      AND grantee IN ('anon','authenticated')
--      AND table_name IN ('salons','services','bookings','booking_policies',
--                         'staff','promo_codes','rental_bookings',
--                         'error_logs','newsletter_sends');
--
-- (4) Die Anwendung laeuft weiter: `bash scripts/prod-probe.sh` und
--     `bash scripts/schema-probe.sh` muessen unveraendert durchlaufen.
--     Beide gehen ueber PostgREST und wuerden einen Bruch sofort zeigen.
