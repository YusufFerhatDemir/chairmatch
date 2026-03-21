-- ============================================================
-- ChairMatch Marketplace & Commission System
-- Migration: 20260321
-- ============================================================

-- 1. Product Categories (B2C + B2B)
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_slug TEXT REFERENCES product_categories(slug),
  target TEXT NOT NULL DEFAULT 'b2c' CHECK (target IN ('b2c','b2b','both')),
  icon_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed B2C categories
INSERT INTO product_categories (slug, name, target, sort_order) VALUES
  ('haarpflege', 'Haarpflege', 'b2c', 1),
  ('styling', 'Styling', 'b2c', 2),
  ('hautpflege', 'Hautpflege', 'b2c', 3),
  ('nagelpflege', 'Nagelpflege', 'b2c', 4),
  ('bartpflege', 'Bartpflege', 'b2c', 5),
  ('kosmetik-produkte', 'Kosmetik', 'b2c', 6)
ON CONFLICT (slug) DO NOTHING;

-- Seed B2B categories
INSERT INTO product_categories (slug, name, target, sort_order) VALUES
  ('profi-haarpflege', 'Profi-Haarpflege (Liter)', 'b2b', 10),
  ('chemie', 'Chemie (Farbe, Blondierung)', 'b2b', 11),
  ('werkzeug', 'Werkzeug (Scheren, Clipper)', 'b2b', 12),
  ('einwegmaterial', 'Einwegmaterial', 'b2b', 13),
  ('hygiene', 'Hygiene & Desinfektion', 'b2b', 14),
  ('moebel-ausstattung', 'Moebel & Ausstattung', 'b2b', 15),
  ('technik', 'Technik & Geraete', 'b2b', 16)
ON CONFLICT (slug) DO NOTHING;

-- 2. Sellers (salon, grosshaendler, affiliate)
CREATE TABLE IF NOT EXISTS sellers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  seller_type TEXT NOT NULL CHECK (seller_type IN ('salon','grosshaendler','affiliate')),
  company_name TEXT,
  description TEXT,
  logo_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  commission_rate_override NUMERIC(5,2),
  stripe_connect_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, seller_type)
);

CREATE INDEX IF NOT EXISTS idx_sellers_user ON sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_salon ON sellers(salon_id);

-- 3. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  category_id UUID REFERENCES product_categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  compare_at_price_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'eur',
  sku TEXT,
  barcode TEXT,
  weight_grams INTEGER,
  stock_quantity INTEGER DEFAULT 0,
  is_unlimited_stock BOOLEAN DEFAULT false,
  images JSONB DEFAULT '[]',
  target TEXT NOT NULL DEFAULT 'b2c' CHECK (target IN ('b2c','b2b','both')),
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  brand TEXT,
  tags TEXT[] DEFAULT '{}',
  affiliate_url TEXT,
  affiliate_source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(seller_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_salon ON products(salon_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, target);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- 4. Product Variants (sizes, volumes)
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  sku TEXT,
  stock_quantity INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- 5. Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_customer ON cart_items(customer_id);

-- 6. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'eur',
  shipping_name TEXT,
  shipping_street TEXT,
  shipping_city TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT DEFAULT 'DE',
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded')),
  notes TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

-- 7. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  fulfillment_status TEXT DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending','processing','shipped','delivered','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller ON order_items(seller_id);

-- 8. Commissions Ledger
CREATE TABLE IF NOT EXISTS commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('rental','new_customer','product_recommendation','product_sale')),
  source_type TEXT NOT NULL CHECK (source_type IN ('rental_booking','booking','order_item','recommendation')),
  source_id UUID NOT NULL,
  beneficiary_type TEXT NOT NULL CHECK (beneficiary_type IN ('platform','salon','provider')),
  beneficiary_id UUID,
  rate_percent NUMERIC(5,2) NOT NULL,
  base_amount_cents INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','paid_out','cancelled')),
  paid_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commissions_type ON commissions(type, status);
CREATE INDEX IF NOT EXISTS idx_commissions_beneficiary ON commissions(beneficiary_type, beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_commissions_source ON commissions(source_type, source_id);

-- 9. Commission Rates (configurable)
CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL UNIQUE CHECK (type IN ('rental','new_customer','product_recommendation_salon','product_recommendation_platform','product_sale_platform')),
  rate_percent NUMERIC(5,2) NOT NULL,
  min_rate_percent NUMERIC(5,2),
  max_rate_percent NUMERIC(5,2),
  effective_from TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO commission_rates (type, rate_percent, min_rate_percent, max_rate_percent) VALUES
  ('rental', 12.00, 12.00, 15.00),
  ('new_customer', 15.00, 15.00, 15.00),
  ('product_recommendation_salon', 7.50, 5.00, 10.00),
  ('product_recommendation_platform', 5.00, 3.00, 7.00),
  ('product_sale_platform', 10.00, 8.00, 15.00)
ON CONFLICT (type) DO NOTHING;

-- 10. Product Recommendations ("Dein Spezialist empfiehlt")
CREATE TABLE IF NOT EXISTS product_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id),
  staff_id UUID REFERENCES staff(id),
  product_id UUID NOT NULL REFERENCES products(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT,
  is_viewed BOOLEAN DEFAULT false,
  is_purchased BOOLEAN DEFAULT false,
  purchased_order_item_id UUID REFERENCES order_items(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_customer ON product_recommendations(customer_id, is_viewed);
CREATE INDEX IF NOT EXISTS idx_recommendations_booking ON product_recommendations(booking_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_salon ON product_recommendations(salon_id);

-- 11. Customer-Salon History (new customer tracking)
CREATE TABLE IF NOT EXISTS customer_salon_history (
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  first_booking_id UUID REFERENCES bookings(id),
  first_booking_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_bookings INTEGER DEFAULT 1,
  last_booking_date TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (customer_id, salon_id)
);

CREATE INDEX IF NOT EXISTS idx_csh_salon ON customer_salon_history(salon_id);

-- Additive changes to existing tables
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_first_visit BOOLEAN DEFAULT false;
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS commission_id UUID REFERENCES commissions(id);

-- RLS policies
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_salon_history ENABLE ROW LEVEL SECURITY;

-- Public read for products and categories
CREATE POLICY "product_categories_public_read" ON product_categories FOR SELECT USING (true);
CREATE POLICY "products_public_read" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "product_variants_public_read" ON product_variants FOR SELECT USING (is_active = true);
CREATE POLICY "commission_rates_public_read" ON commission_rates FOR SELECT USING (true);

-- Seller CRUD for own data
CREATE POLICY "sellers_own" ON sellers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "products_seller_manage" ON products FOR ALL USING (
  seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
);
CREATE POLICY "product_variants_seller_manage" ON product_variants FOR ALL USING (
  product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()))
);

-- Cart: own items only
CREATE POLICY "cart_own" ON cart_items FOR ALL USING (auth.uid() = customer_id);

-- Orders: own orders
CREATE POLICY "orders_own" ON orders FOR ALL USING (auth.uid() = customer_id);
CREATE POLICY "order_items_own" ON order_items FOR SELECT USING (
  order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid())
);

-- Recommendations: customer or salon owner
CREATE POLICY "recommendations_customer" ON product_recommendations FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "recommendations_salon" ON product_recommendations FOR ALL USING (
  salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid())
);

-- Commissions: beneficiary can see own
CREATE POLICY "commissions_own" ON commissions FOR SELECT USING (auth.uid() = beneficiary_id);

-- Customer salon history: own
CREATE POLICY "csh_own" ON customer_salon_history FOR SELECT USING (auth.uid() = customer_id);
