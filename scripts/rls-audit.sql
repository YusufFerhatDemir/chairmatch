-- ──────────────────────────────────────────────────────────────────────
-- ChairMatch RLS-Audit — Ist-Stand der Datenbank auslesen
-- ──────────────────────────────────────────────────────────────────────
-- Ausführen im Supabase SQL-Editor (Projekt pwdbjqfpgumyfktbfswg) oder:
--   psql "$DIRECT_URL" -f scripts/rls-audit.sql
--
-- Dieses Skript ändert NICHTS. Es beantwortet Schritt 1 des Security-Fix:
-- welche Tabellen/Views haben kein RLS, welche haben RLS ohne Policy,
-- und welche Policies sind zu weit gefasst.
-- ──────────────────────────────────────────────────────────────────────

\echo '=== 1. Tabellen ohne RLS bzw. ohne Policy ==='
SELECT t.tablename,
       t.rowsecurity                        AS rls_enabled,
       COALESCE(p.cnt, 0)                   AS policy_count,
       CASE
         WHEN NOT t.rowsecurity        THEN 'KRITISCH: RLS_DISABLED'
         WHEN COALESCE(p.cnt, 0) = 0   THEN 'OK-ish: RLS an, keine Policy (deny-all, nur service_role)'
         ELSE 'RLS + Policies vorhanden'
       END                                  AS status
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) AS cnt
  FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename
) p ON p.tablename = t.tablename
WHERE t.schemaname = 'public'
ORDER BY t.rowsecurity ASC, COALESCE(p.cnt, 0) ASC, t.tablename;

\echo ''
\echo '=== 2. Views (SECURITY DEFINER Views umgehen RLS der Basistabellen) ==='
SELECT c.relname AS view_name,
       CASE WHEN c.relkind = 'm' THEN 'materialized' ELSE 'view' END AS kind,
       pg_get_userbyid(c.relowner) AS owner,
       COALESCE(
         (SELECT option_value FROM pg_options_to_table(c.reloptions)
          WHERE option_name = 'security_invoker'), 'false'
       ) AS security_invoker
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('v','m')
ORDER BY c.relname;

\echo ''
\echo '=== 3. Alle Policies im Detail (Rollen, Kommando, USING/WITH CHECK) ==='
SELECT tablename, policyname, cmd,
       array_to_string(roles, ',') AS roles,
       qual        AS using_expr,
       with_check  AS check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

\echo ''
\echo '=== 4. VERDÄCHTIG: Policies die alles erlauben (USING true) ==='
SELECT tablename, policyname, cmd, array_to_string(roles, ',') AS roles, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename, policyname;

\echo ''
\echo '=== 5. Direkte Table-Grants an anon/authenticated (umgehen RLS NICHT, aber relevant) ==='
SELECT table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon','authenticated')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

\echo ''
\echo '=== 6. SECURITY DEFINER Funktionen (laufen mit Owner-Rechten) ==='
SELECT p.proname,
       pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef                 AS security_definer,
       COALESCE(array_to_string(p.proconfig, ','), '(kein search_path gesetzt!)') AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
ORDER BY p.proname;

\echo ''
\echo '=== 7. Storage-Buckets: public/private + Policies ==='
SELECT id, name, public, file_size_limit FROM storage.buckets ORDER BY name;

SELECT policyname, cmd, array_to_string(roles, ',') AS roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

\echo ''
\echo '=== 8. Tabellen die die App nutzt — Abgleich mit Ist-Schema ==='
-- Liste stammt aus grep über src/**: .from('<table>')
WITH app_tables(name) AS (
  VALUES ('salons'),('bookings'),('profiles'),('rental_bookings'),
         ('newsletter_subscribers'),('reviews'),('audit_logs'),
         ('newsletter_campaigns'),('rental_equipment'),('services'),
         ('platform_transactions'),('orders'),('products'),
         ('onboarding_slides'),('compliance_documents'),('affiliate_products'),
         ('provider_stripe_accounts'),('cart_items'),('product_recommendations'),
         ('newsletter_sends'),('conversations'),('salon_images'),
         ('phone_verifications'),('notifications'),('conversation_participants'),
         ('categories'),('user_2fa'),('payments'),('favorites'),('error_logs'),
         ('customer_salon_history'),('consent_logs'),('app_settings'),
         ('visit_logs'),('push_subscriptions'),('promo_codes'),('messages'),
         ('login_attempts'),('documents'),('commissions'),('wait_list'),
         ('submission_tickets'),('staff'),('sellers'),('order_items'),
         ('offers'),('idempotency_keys'),('authorities_packs'),
         ('analytics_events'),('affiliate_clicks'),('protect_pricing'),
         ('product_categories'),('newsletter'),('cookie_consents'),
         ('consents'),('compliance_plans'),('commission_rates'),
         ('booking_policies'),('affiliate_conversions')
)
SELECT a.name AS app_table,
       CASE WHEN t.tablename IS NULL THEN 'FEHLT IN DB' ELSE 'vorhanden' END AS existiert,
       t.rowsecurity AS rls_enabled,
       COALESCE(p.cnt, 0) AS policy_count
FROM app_tables a
LEFT JOIN pg_tables t ON t.tablename = a.name AND t.schemaname = 'public'
LEFT JOIN (
  SELECT tablename, COUNT(*) AS cnt FROM pg_policies
  WHERE schemaname = 'public' GROUP BY tablename
) p ON p.tablename = a.name
ORDER BY (t.tablename IS NULL) DESC, t.rowsecurity ASC, a.name;
