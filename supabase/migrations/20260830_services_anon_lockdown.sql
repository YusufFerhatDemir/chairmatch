-- ══════════════════════════════════════════════════════════════════════════
-- Track E — die Preisliste eines nicht freigegebenen Salons ist oeffentlich
-- ══════════════════════════════════════════════════════════════════════════
-- Erhoben am 30.08.2026 gegen pwdbjqfpgumyfktbfswg, ausschliesslich LESEND
-- und ausschliesslich mit dem oeffentlichen ANON-Key (der in jedem
-- ausgelieferten Browser-Bundle steht).
--
-- BEFUND
--
-- `services` antwortet dem ANON-Key mit HTTP 200 und liefert alle 64 Zeilen
-- aus, mit jeder Spalte:
--
--     GET /rest/v1/services?select=*  →  200, 64 Zeilen
--
-- Diese Zeilen verteilen sich auf 16 Salons. Oeffentlich sichtbar sind aber
-- nur 15: `GET /api/salons/cccccccc-0000-4000-a000-000000000003` antwortet
-- mit 404, weil `salonIsPubliclyVisible` dort `is_active = false` sieht.
-- Genau dieser Salon liefert ueber `services` weiterhin:
--
--     Botox Behandlung      299,00 €
--     Hyaluron Filler       399,00 €
--     PRP Therapie              …
--
-- Das ist der Rest des Befunds, den Track 20 eine Ebene hoeher geschlossen
-- hat. Dort wurde `/salon/<slug>` und `GET /api/salons/<slug>` fuer nicht
-- freigegebene Salons auf 404 gesetzt — mit der ausdruecklichen Begruendung,
-- dass „Leistungen mit Preisen" eines Salons, den noch nie ein Admin
-- angesehen hat, nicht oeffentlich stehen sollen. Die Tabelle darunter war
-- weiter offen, und `/rest/v1/services` braucht weder die Anwendung noch
-- einen Slug: es reicht der oeffentliche Schluessel.
--
-- Warum das bis hierher stehenblieb, steht schwarz auf weiss in
-- `20260827_anon_grant_lockdown.sql`:
--
--     "Bewusst NICHT angefasst: categories, product_categories,
--      onboarding_slides, services, rental_equipment, salon_images. Die
--      tragen oeffentlichen Katalog-inhalt (keine PII), sind heute anon
--      lesbar und sollen es bleiben."
--
-- Diese Einschaetzung stammt von VOR Track 20. Seither ist „welcher Salon ist
-- oeffentlich" eine Entscheidung, die die Plattform trifft — und `services`
-- kennt sie nicht. `rental_equipment` aus derselben Aufzaehlung wurde in
-- Track 22 aus demselben Grund gesperrt; diese Migration zieht `services` und
-- `salon_images` nach.
--
-- WARUM REVOKE UND KEINE FEINERE POLICY
--
-- Eine Policy „nur Leistungen aktiver Salons" waere die genauere Antwort,
-- braucht aber einen Unterabfrage-Join auf `salons` in JEDER Zeilenpruefung —
-- und `salons` ist fuer `anon` selbst gesperrt (42501), der Join liefe also
-- ins Leere. Vor allem aber liest KEIN Client diese Tabellen direkt:
--
--   src/app/(public)/salon/[slug]/page.tsx      getSupabaseAdmin()
--   src/app/(public)/listings/[slug]/page.tsx   getSupabaseAdmin()
--   src/app/(public)/listings/[slug]/opengraph-image.tsx  getSupabaseAdmin()
--   src/app/(provider)/provider/bilder/page.tsx getSupabaseAdmin()
--   src/app/sitemap.ts                          getSupabaseAdmin()
--   src/app/api/salons/[id]/route.ts            getSupabaseAdmin()
--
-- Alle sechs Stellen laufen ueber `service_role`, und `service_role` ist von
-- `REVOKE ... FROM anon` nicht betroffen. Die einzige verbliebene
-- 'use client'-Datei mit einem Supabase-Client ist
-- src/app/(auth)/auth/reset-password/page.tsx, und die spricht nur
-- `supabase.auth.*` an.
--
-- ANWENDEN — DANACH GEGENPROBE
--
--     bash scripts/negativtest-anon-lesen.sh
--
-- Erwartung nach dieser Migration: `services` und `salon_images` antworten
-- dem ANON-Key mit 401/42501 statt 200. Die oeffentliche Salonseite und
-- `/api/salons/<slug>` muessen unveraendert 200 liefern — sie lesen ueber
-- den Dienstschluessel.
-- ══════════════════════════════════════════════════════════════════════════

BEGIN;

-- REVOKE auf einer nicht existierenden Tabelle ist ein harter Fehler, und das
-- Live-Schema deckt sich nicht durchgaengig mit dem Repo (siehe
-- scripts/schema-probe.sh). Deshalb je Tabelle nur revoken, wenn sie da ist.
DO $$
DECLARE
  t text;
  gesperrt text[] := ARRAY['services', 'salon_images'];
BEGIN
  FOREACH t IN ARRAY gesperrt LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      RAISE NOTICE 'anon gesperrt: %', t;
    ELSE
      RAISE NOTICE 'uebersprungen (Tabelle fehlt): %', t;
    END IF;
  END LOOP;
END $$;

COMMIT;
