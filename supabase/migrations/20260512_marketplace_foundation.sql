-- Marketplace Foundation: Stripe Connect + Modell C
-- 0% Buchungen | 10% Stuhl-/Liegen-Vermietung | 8% OP-Raum | Abos (Free/Premium/Gold) | Affiliate-Tracking
-- Migration ist idempotent (IF NOT EXISTS + DROP POLICY IF EXISTS)

-- Stripe Connect Account pro Anbieter
CREATE TABLE IF NOT EXISTS provider_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  account_type TEXT NOT NULL DEFAULT 'express',
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  country TEXT DEFAULT 'DE',
  default_currency TEXT DEFAULT 'eur',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_provider_stripe_user ON provider_stripe_accounts(user_id);
ALTER TABLE provider_stripe_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User sees own stripe account" ON provider_stripe_accounts;
CREATE POLICY "User sees own stripe account" ON provider_stripe_accounts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admin sees all" ON provider_stripe_accounts;
CREATE POLICY "Admin sees all" ON provider_stripe_accounts FOR ALL USING ((select auth.jwt()->>'role') IN ('admin', 'super_admin'));

-- Plattform-Umsatz pro Transaktion
CREATE TABLE IF NOT EXISTS platform_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('booking', 'chair_rental', 'opraum_rental', 'subscription', 'affiliate', 'refund')),
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  provider_share_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'eur',
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_transfer_id TEXT,
  provider_user_id UUID REFERENCES profiles(id),
  customer_user_id UUID REFERENCES profiles(id),
  booking_id UUID,
  rental_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pltx_provider ON platform_transactions(provider_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pltx_customer ON platform_transactions(customer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pltx_type ON platform_transactions(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pltx_status ON platform_transactions(status);
ALTER TABLE platform_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Provider sees own tx" ON platform_transactions;
CREATE POLICY "Provider sees own tx" ON platform_transactions FOR SELECT USING (auth.uid() = provider_user_id);
DROP POLICY IF EXISTS "Customer sees own tx" ON platform_transactions;
CREATE POLICY "Customer sees own tx" ON platform_transactions FOR SELECT USING (auth.uid() = customer_user_id);
DROP POLICY IF EXISTS "Admin sees all tx" ON platform_transactions;
CREATE POLICY "Admin sees all tx" ON platform_transactions FOR ALL USING ((select auth.jwt()->>'role') IN ('admin', 'super_admin'));

-- Abo-System pro Anbieter
CREATE TABLE IF NOT EXISTS provider_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'premium', 'gold')),
  stripe_subscription_id TEXT UNIQUE,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('inactive', 'trialing', 'active', 'past_due', 'cancelled')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_provsub_user ON provider_subscriptions(user_id);
ALTER TABLE provider_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User sees own sub" ON provider_subscriptions;
CREATE POLICY "User sees own sub" ON provider_subscriptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admin sees all subs" ON provider_subscriptions;
CREATE POLICY "Admin sees all subs" ON provider_subscriptions FOR ALL USING ((select auth.jwt()->>'role') IN ('admin', 'super_admin'));

-- Affiliate-Tracking
CREATE TABLE IF NOT EXISTS affiliate_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner TEXT NOT NULL CHECK (partner IN ('amazon', 'douglas', 'notino', 'flaconi', 'direct')),
  product_name TEXT NOT NULL,
  product_url TEXT NOT NULL,
  category TEXT,
  commission_rate DECIMAL(5,2) DEFAULT 5.0,
  image_url TEXT,
  price_cents INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public reads active products" ON affiliate_products;
CREATE POLICY "Public reads active products" ON affiliate_products FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admin manages" ON affiliate_products;
CREATE POLICY "Admin manages" ON affiliate_products FOR ALL USING ((select auth.jwt()->>'role') IN ('admin', 'super_admin'));

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES affiliate_products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  session_id TEXT,
  source TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affclick_product ON affiliate_clicks(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affclick_user ON affiliate_clicks(user_id, created_at DESC);
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads clicks" ON affiliate_clicks;
CREATE POLICY "Admin reads clicks" ON affiliate_clicks FOR SELECT USING ((select auth.jwt()->>'role') IN ('admin', 'super_admin'));

CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES affiliate_products(id),
  user_id UUID REFERENCES profiles(id),
  click_id UUID REFERENCES affiliate_clicks(id),
  order_value_cents INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  external_order_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'paid')),
  reported_by TEXT,
  reported_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affconv_status ON affiliate_conversions(status, reported_at DESC);
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads conversions" ON affiliate_conversions;
CREATE POLICY "Admin reads conversions" ON affiliate_conversions FOR SELECT USING ((select auth.jwt()->>'role') IN ('admin', 'super_admin'));
