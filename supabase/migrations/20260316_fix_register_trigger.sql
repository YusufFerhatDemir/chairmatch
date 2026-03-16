-- Fix: Profile-Trigger für Registrierung
-- Matches actual profiles schema: id, email, full_name, phone, avatar_url, role, etc.

-- Trigger entfernen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Spalten ergänzen falls nicht vorhanden
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_done boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS delete_requested_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Reviews: Report-Feature Spalten
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reported_flag boolean DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reported_at timestamptz;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reported_by uuid;

-- Trigger: nur existierende Spalten verwenden
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  fname text := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  lname text := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  fullname text := COALESCE(NEW.raw_user_meta_data->>'full_name', TRIM(fname || ' ' || lname));
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email, referral_code)
  VALUES (
    NEW.id,
    'kunde',
    fullname,
    NEW.email,
    'CM-' || UPPER(SUBSTR(MD5(NEW.id::text), 1, 6))
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
