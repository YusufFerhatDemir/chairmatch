-- Rollback: 20260910_anon_insert_lockdown
--
-- ACHTUNG: Dieses Rollback stellt eine SICHERHEITSLUECKE wieder her.
-- Es existiert nur der Vollstaendigkeit halber. Vor dem Ausfuehren klaeren,
-- warum die anon-INSERT-Tuer zurueck soll — die Anwendung braucht sie
-- nachweislich nicht (alle Zugriffe laufen ueber getSupabaseAdmin()).

BEGIN;

ALTER TABLE public.visit_logs         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_tickets DISABLE ROW LEVEL SECURITY;

GRANT INSERT ON public.visit_logs         TO anon;
GRANT INSERT ON public.submission_tickets TO anon;

COMMIT;
