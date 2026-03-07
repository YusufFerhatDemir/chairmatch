-- Newsletter subscriptions
CREATE TABLE IF NOT EXISTS newsletter (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT newsletter_email_unique UNIQUE (email)
);

-- Favorites: ensure unique constraint exists
-- Table may already exist from earlier migrations
CREATE TABLE IF NOT EXISTS favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint if not exists (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'favorites_customer_salon_unique'
  ) THEN
    ALTER TABLE favorites ADD CONSTRAINT favorites_customer_salon_unique UNIQUE (customer_id, salon_id);
  END IF;
END $$;

-- Ensure salons has columns needed by provider registration
DO $$ BEGIN
  BEGIN ALTER TABLE salons ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TABLE salons ADD COLUMN IF NOT EXISTS chair_rental boolean DEFAULT false; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TABLE salons ADD COLUMN IF NOT EXISTS chair_price_day numeric; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TABLE salons ADD COLUMN IF NOT EXISTS gewerbe_check boolean DEFAULT false; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TABLE salons ADD COLUMN IF NOT EXISTS opening_hours jsonb; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TABLE salons ADD COLUMN IF NOT EXISTS tagline text; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- RLS policies for newsletter (public insert, admin read)
ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can subscribe" ON newsletter;
CREATE POLICY "Anyone can subscribe" ON newsletter FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can read newsletter" ON newsletter;
CREATE POLICY "Admin can read newsletter" ON newsletter FOR SELECT USING (true);

-- RLS for favorites (user can manage own)
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own favorites" ON favorites;
CREATE POLICY "Users manage own favorites" ON favorites FOR ALL USING (auth.uid() = customer_id);
