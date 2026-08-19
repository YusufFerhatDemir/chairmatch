-- ──────────────────────────────────────────────────────────────────────
-- RLS SECURITY FIX v2 — LIVE-VERIFIZIERTE Lücken (Stand 2026-08-19)
-- ──────────────────────────────────────────────────────────────────────
-- STATUS: VORBEREITET, NOCH NICHT ANGEWENDET (kein service_role/DB-Zugang).
--
-- Grundlage: im Gegensatz zu v1 (rein statische Repo-Analyse) beruht diese
-- Migration auf einem LIVE-Read-Only-Test gegen pwdbjqfpgumyfktbfswg mit
-- dem öffentlichen Anon-Key. Der Anon-Key ist GÜLTIG — die Annahme der
-- Vorsession ("alle Credentials tot") war für den Anon-Key falsch.
--
-- Live gemessene Exposition (anon, ohne jeden Login):
--   profiles           50 Zeilen  — inkl. email (50/50), role, totp_secret,
--                                   stripe_customer_id, referral_balance_cents
--                                   4 davon admin/super_admin
--   reviews            48 Zeilen  — inkl. customer_id/reviewer_id/comment,
--                                   alle 48 mit moderation_status != 'approved'
--   promo_codes         3 Zeilen  — code, discount, max_uses, used_count
--   commission_rates    5 Zeilen  — interne Margen (rate/min/max_percent)
--   app_settings       17 Zeilen  — Branding-/Theme-Konfiguration
--   services           64 Zeilen  — Katalogdaten (öffentlich gewollt)
--   categories/product_categories/onboarding_slides/rental_equipment
--                                 — Katalogdaten (öffentlich gewollt)
--
-- Warum der Lockdown NICHTS bricht (verifiziert, keine Vermutung):
--   * Alle Zugriffe auf profiles (26 Dateien), reviews (12), promo_codes (2),
--     commission_rates (1), app_settings (2), services (8), categories (4),
--     product_categories (1), onboarding_slides (2) laufen ausschliesslich
--     ueber getSupabaseAdmin() = service_role. service_role umgeht RLS.
--   * Der Browser-Client (src/lib/supabase.ts, Anon-Key) liest NUR
--     rental_equipment, salons und rental_bookings — rental_equipment behaelt
--     deshalb unten bewusst seine oeffentliche Lesepolicy.
--   * Es gibt KEINEN einzigen Schreibzugriff ueber den Browser-Client.
--     Jeder INSERT/UPDATE/DELETE laeuft ueber service_role.
--
-- Prinzip: deny by default. Kein FORCE ROW LEVEL SECURITY (Owner unbekannt).
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

-- ──────────────────────────────────────────────────────────────────────
-- 1. profiles — KRITISCH (P0). 50 Datensaetze inkl. E-Mail oeffentlich.
--    SELECT: nur die eigene Zeile. Schreiben: nur service_role.
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_public_read"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_all"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_select"   ON public.profiles;

CREATE POLICY "profiles_own_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Defense in depth: das TOTP-Secret darf selbst der Eigentuemer nicht ueber
-- PostgREST lesen. Aktuell sind alle Werte NULL — die Luecke ist latent und
-- wuerde exakt in dem Moment scharf, in dem 2FA genutzt wird.
REVOKE SELECT (totp_secret) ON public.profiles FROM anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 2. reviews — 48 Zeilen inkl. Verfasser-IDs und unmoderierter Texte.
--    Die oeffentliche Anzeige laeuft ueber service_role, daher hier zu.
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_read" ON public.reviews;
DROP POLICY IF EXISTS "reviews_select_all"  ON public.reviews;
DROP POLICY IF EXISTS "reviews_all"         ON public.reviews;
DROP POLICY IF EXISTS "reviews_own_select"  ON public.reviews;

CREATE POLICY "reviews_own_select" ON public.reviews
  FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid() OR reviewee_user_id = auth.uid() OR customer_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────
-- 3. promo_codes / commission_rates / app_settings
--    Rein interne Konfiguration. RLS an, KEINE Policy => deny by default.
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.promo_codes      ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promo_codes_public_read" ON public.promo_codes;
DROP POLICY IF EXISTS "promo_codes_all"         ON public.promo_codes;

ALTER TABLE IF EXISTS public.commission_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commission_rates_public_read" ON public.commission_rates;
DROP POLICY IF EXISTS "commission_rates_all"         ON public.commission_rates;

ALTER TABLE IF EXISTS public.app_settings     ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_settings_public_read" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_all"         ON public.app_settings;

-- ──────────────────────────────────────────────────────────────────────
-- 4. Oeffentliche Katalogdaten — Lesen bleibt erlaubt (so ist es gewollt),
--    aber Schreiben wird geschlossen. Vorher war ohne RLS auch
--    INSERT/UPDATE/DELETE fuer anon moeglich.
-- ──────────────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'categories', 'product_categories', 'onboarding_slides',
    'services', 'rental_equipment'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_public_read', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_all', t);
      -- nur SELECT, kein WITH CHECK => Schreiben nur noch via service_role
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
        t||'_public_read', t);
    END IF;
  END LOOP;
END $$;

COMMIT;
