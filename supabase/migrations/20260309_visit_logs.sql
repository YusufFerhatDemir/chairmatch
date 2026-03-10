-- Visit logs for admin analytics (who visits the app, IP, country, path)
-- DSGVO: minimal data, purpose: security, statistics. Mention in Datenschutz.

CREATE TABLE IF NOT EXISTS visit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  path text NOT NULL,
  ip text,
  country text,
  region text,
  city text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visit_logs_created_at_idx ON visit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS visit_logs_path_idx ON visit_logs(path);
CREATE INDEX IF NOT EXISTS visit_logs_country_idx ON visit_logs(country);

ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role / admin can read (via Supabase admin client in API)
DROP POLICY IF EXISTS "Admin read visit_logs" ON visit_logs;
CREATE POLICY "Admin read visit_logs" ON visit_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert visit_logs" ON visit_logs;
CREATE POLICY "Allow insert visit_logs" ON visit_logs FOR INSERT WITH CHECK (true);
