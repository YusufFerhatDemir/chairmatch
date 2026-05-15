-- ──────────────────────────────────────────────────────────────────────
-- WAIT-LIST: User die sich für Stadt-Benachrichtigung eintragen
-- ──────────────────────────────────────────────────────────────────────
-- Wenn ein User nach einer Stadt sucht in der noch keine Salons gelistet
-- sind, kann er sich eintragen. Sobald >= 3 Salons in der Stadt aktiv
-- sind, kommt eine automatische Benachrichtigung (manuell oder via Cron).
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wait_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  city TEXT,
  source TEXT,
  ip TEXT,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS wait_list_email_city_uidx
  ON public.wait_list (email, COALESCE(city, ''));

CREATE INDEX IF NOT EXISTS wait_list_city_idx ON public.wait_list (city);
CREATE INDEX IF NOT EXISTS wait_list_created_at_idx ON public.wait_list (created_at);

-- RLS: nur Admin liest, Backend (service-role) inserts
ALTER TABLE public.wait_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wait_list_admin_select" ON public.wait_list;
CREATE POLICY "wait_list_admin_select" ON public.wait_list
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Inserts kommen nur über Backend (service-role bypasst RLS)
