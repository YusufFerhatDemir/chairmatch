-- Soft-Delete für Konto-Löschung (DSGVO Art. 17)
-- Hard-Delete nach 30 Tagen per Cron

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS delete_requested_at timestamptz;
CREATE INDEX IF NOT EXISTS profiles_deleted_at_idx ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;
