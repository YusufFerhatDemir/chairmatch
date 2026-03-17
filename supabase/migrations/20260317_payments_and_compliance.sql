-- ═══════════════════════════════════════════════════════
-- ChairMatch V3: Payments, Compliance, Chat, Notifications
-- ═══════════════════════════════════════════════════════

-- ── 1. Payments Table ──
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','succeeded','failed','refunded','cancelled')),
  payment_method TEXT DEFAULT 'card',
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_intent ON payments(stripe_payment_intent);

-- ── 2. Add payment columns to bookings ──
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','pending','paid','refunded','failed'));
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ── 3. Add stripe_customer_id to profiles ──
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter';
EXCEPTION WHEN others THEN NULL;
END $$;

-- ── 4. Messages/Chat Table ──
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON messages(receiver_id, is_read) WHERE NOT is_read;

-- Conversations table for chat list
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_provider ON conversations(provider_id);

-- Conversation participants (for flexible chat routing)
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants ON conversation_participants(user_id, conversation_id);

-- ── 5. Push Notification Subscriptions ──
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- ── 6. Compliance Documents (Gesundheitsamt etc.) ──
CREATE TABLE IF NOT EXISTS compliance_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL
    CHECK (document_type IN (
      'gewerbeanmeldung',
      'gesundheitszeugnis',
      'hygienezertifikat',
      'berufsqualifikation',
      'haftpflichtversicherung',
      'datenschutzerklaerung',
      'preisliste_aushang',
      'erste_hilfe',
      'brandschutz',
      'kassenbuch',
      'meisterbrief'
    )),
  file_url TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','expired')),
  expires_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_salon ON compliance_documents(salon_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance_documents(status);

-- ── 7. Notification Log (In-App) ──
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info'
    CHECK (type IN ('info','booking','payment','message','offer','system','compliance')),
  reference_id TEXT,
  reference_type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notification_log(user_id, is_read, created_at DESC);

-- ── 8. 2FA Secrets ──
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_secret TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ── 9. Image Gallery for Salons ──
CREATE TABLE IF NOT EXISTS salon_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  image_type TEXT DEFAULT 'gallery'
    CHECK (image_type IN ('logo','cover','gallery','before_after','team')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salon_images ON salon_images(salon_id, sort_order);

-- ── 10. Enable RLS on new tables ──
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Payments: users can see their own
CREATE POLICY payments_select ON payments FOR SELECT USING (
  booking_id IN (SELECT id FROM bookings WHERE customer_id = auth.uid())
);

-- Messages: users can see their own
CREATE POLICY messages_select ON messages FOR SELECT USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);
CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
);

-- Conversations: participants only
CREATE POLICY conversations_select ON conversations FOR SELECT USING (
  customer_id = auth.uid() OR provider_id = auth.uid()
);

-- Push: own subscriptions
CREATE POLICY push_select ON push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY push_insert ON push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY push_delete ON push_subscriptions FOR DELETE USING (user_id = auth.uid());

-- Compliance: salon owner or admin
CREATE POLICY compliance_select ON compliance_documents FOR SELECT USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);

-- Notifications: own only
CREATE POLICY notifications_select ON notification_log FOR SELECT USING (user_id = auth.uid());

-- Salon images: public read
CREATE POLICY salon_images_select ON salon_images FOR SELECT USING (true);

-- ── 11. 2FA Secrets Table ──
CREATE TABLE IF NOT EXISTS user_2fa (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_2fa ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_2fa_select ON user_2fa FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_2fa_insert ON user_2fa FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_2fa_update ON user_2fa FOR UPDATE USING (user_id = auth.uid());
