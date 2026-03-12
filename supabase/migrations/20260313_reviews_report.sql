-- DSA: Review Report & Moderation
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reported_flag boolean DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'published' CHECK (moderation_status IN ('published','hidden','pending'));
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reported_at timestamptz;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
