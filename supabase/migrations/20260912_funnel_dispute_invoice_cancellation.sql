-- 20260912_funnel_dispute_invoice_cancellation.sql
--
-- NICHT ANGEWENDET — kein DDL-Zugang in dieser Session (service_role
-- rotiert, psql ohne IPv6-Route zum AAAA-only-Host, Pooler ENOTFOUND, CLI
-- ohne Token, kein Supabase-MCP). Anwenden nur ueber das Dashboard.
--
-- Die dazugehoerige Logik steht bereits im Code und ist getestet:
--   src/modules/booking/dispute.ts       + Tests
--   src/modules/booking/invoice.ts       + Tests
--   src/modules/booking/cancellation.ts  + Tests
--
-- ══════════════════════════════════════════════════════════════════════
-- WAS HIER BEWUSST FEHLT
-- ══════════════════════════════════════════════════════════════════════
--
-- KEIN Standardwert fuer irgendeine Gebuehr, keinen Steuersatz, keine
-- Stornostaffel. Die oeffentlich genannten „50-100 % des Tagespreises"
-- stammen aus einem Marketingtext und aus keiner Entscheidung; sie hier als
-- DEFAULT einzutragen waere dieselbe erfundene Zahl, nur mit
-- Datenbankgewicht. Alle Regelfelder sind NULL-bar, und NULL heisst
-- „unbestimmt" — der Code behandelt das als eigenen Fall und nicht als 0.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · STORNOREGELN
-- ══════════════════════════════════════════════════════════════════════
--
-- Bis heute gibt es nur `booking_policies.no_show_fee_cents`. Fuer das
-- ABSAGEN existiert kein Feld — `cancelBooking` sagt das im eigenen
-- Kommentar und weigert sich deshalb, einen Betrag zu bilden.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cancellation_fee_type') THEN
    CREATE TYPE public.cancellation_fee_type AS ENUM ('none', 'fixed', 'percent');
  END IF;
END $$;

ALTER TABLE public.booking_policies
  ADD COLUMN IF NOT EXISTS cancellation_window_hours integer,
  ADD COLUMN IF NOT EXISTS cancellation_fee_type     public.cancellation_fee_type,
  -- Bei 'fixed' Cent, bei 'percent' 0-100. Zwei Bedeutungen in einer
  -- Spalte sind vertretbar, weil `cancellation_fee_type` daneben steht und
  -- der CHECK beide Faelle trennt.
  ADD COLUMN IF NOT EXISTS cancellation_fee_value    integer,
  -- Die Staffel. NULL = keine; dann gilt das Einzelfenster darueber.
  ADD COLUMN IF NOT EXISTS cancellation_tiers        jsonb;

ALTER TABLE public.booking_policies
  DROP CONSTRAINT IF EXISTS booking_policies_cancellation_sane;
ALTER TABLE public.booking_policies
  ADD CONSTRAINT booking_policies_cancellation_sane CHECK (
    (cancellation_window_hours IS NULL OR cancellation_window_hours >= 0)
    AND (cancellation_fee_value IS NULL OR cancellation_fee_value >= 0)
    -- Ein Prozentsatz ueber 100 ist kein Anteil.
    AND (cancellation_fee_type IS DISTINCT FROM 'percent'
         OR cancellation_fee_value IS NULL
         OR cancellation_fee_value <= 100)
    -- Eine Gebuehrenart ohne Wert ist unbestimmt, kein Nulltarif.
    AND (cancellation_fee_type IS NULL
         OR cancellation_fee_type = 'none'
         OR cancellation_fee_value IS NOT NULL)
  );

-- ══════════════════════════════════════════════════════════════════════
-- 2 · STREITFALL
-- ══════════════════════════════════════════════════════════════════════
--
-- Die Plattform verspricht oeffentlich „Streit-Schlichtung in 48h" — an
-- drei Stellen. Es gab dafuer bisher nichts.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_status') THEN
    CREATE TYPE public.dispute_status AS ENUM
      ('open', 'awaiting_response', 'in_review', 'escalated', 'resolved', 'withdrawn');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_resolution') THEN
    CREATE TYPE public.dispute_resolution AS ENUM
      ('in_favour_of_customer', 'in_favour_of_provider', 'partial_refund',
       'goodwill_credit', 'no_action');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.disputes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  opened_by       uuid NOT NULL REFERENCES auth.users(id),
  -- 'customer' oder 'provider' — die Plattform eroeffnet nicht gegen sich selbst.
  opened_by_role  text NOT NULL CHECK (opened_by_role IN ('customer', 'provider')),
  reason          text NOT NULL CHECK (reason IN
                    ('not_as_described', 'access_denied', 'hygiene',
                     'no_show_provider', 'damage', 'payment', 'other')),
  status          public.dispute_status NOT NULL DEFAULT 'open',
  opened_at       timestamptz NOT NULL DEFAULT now(),
  -- Die Frist entsteht MIT dem Fall, nicht spaeter. 48 Stunden, weil das
  -- oeffentlich zugesagt ist (siehe DISPUTE_RESPONSE_HOURS im Code).
  response_due_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  resolution      public.dispute_resolution,
  resolved_at     timestamptz,
  -- KEIN Betrag. Was entschieden wurde, steht in `resolution`; wie viel
  -- Geld fliesst, haengt an der Stornoregel und wird dort protokolliert.
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Ein Abschluss ohne Ausgang ist kein Abschluss.
  CONSTRAINT disputes_resolved_has_outcome CHECK (
    (status <> 'resolved') OR (resolution IS NOT NULL AND resolved_at IS NOT NULL)
  ),
  -- Und ein Ausgang gehoert nur an den Abschluss.
  CONSTRAINT disputes_outcome_only_when_resolved CHECK (
    (status = 'resolved') OR resolution IS NULL
  )
);

-- Ein offener Fall je Buchung reicht. Teilindex, damit abgeschlossene
-- Faelle einen neuen nicht blockieren.
CREATE UNIQUE INDEX IF NOT EXISTS disputes_ein_offener_je_buchung
  ON public.disputes (booking_id)
  WHERE status NOT IN ('resolved', 'withdrawn');

CREATE INDEX IF NOT EXISTS disputes_frist_idx
  ON public.disputes (response_due_at)
  WHERE status NOT IN ('resolved', 'withdrawn');

-- Der Verlauf. Ein Fall ohne Protokoll ist eine Behauptung.
CREATE TABLE IF NOT EXISTS public.dispute_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id  uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  at          timestamptz NOT NULL DEFAULT now(),
  by_user     uuid REFERENCES auth.users(id),
  by_role     text NOT NULL CHECK (by_role IN ('customer', 'provider', 'platform')),
  note        text NOT NULL,
  status      public.dispute_status
);

CREATE INDEX IF NOT EXISTS dispute_events_dispute_idx
  ON public.dispute_events (dispute_id, at);

-- ══════════════════════════════════════════════════════════════════════
-- 3 · RECHNUNG
-- ══════════════════════════════════════════════════════════════════════
--
-- Beleg und Zahlungsstand. KEIN Geldtransfer, kein Stripe.
--
-- `tax_rate_percent` hat bewusst KEINEN Default: ob eine Stuhlmiete
-- umsatzsteuerfrei ist (§ 4 Nr. 12 UStG), mit 19 % zu behandeln ist oder
-- der Anbieter Kleinunternehmer nach § 19 UStG ist, haengt am Einzelfall.
-- Ein Default von 19 waere eine steuerliche Aussage, die niemand getroffen
-- hat.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE public.invoice_status AS ENUM
      ('draft', 'issued', 'paid', 'partially_paid', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Fortlaufend und luechenlos — die Vergabestrategie ist offen, deshalb
  -- NULL-bar und nur UNIQUE. Eine Sequence waere hier falsch: sie laeuft
  -- bei ROLLBACK weiter und reisst genau die Luecke, die nicht sein darf.
  number            text UNIQUE,
  booking_id        uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  issuer_id         uuid NOT NULL REFERENCES auth.users(id),
  recipient_id      uuid NOT NULL REFERENCES auth.users(id),
  status            public.invoice_status NOT NULL DEFAULT 'draft',
  issued_at         timestamptz,
  due_at            timestamptz,
  tax_rate_percent  numeric(5,2) CHECK (tax_rate_percent IS NULL
                                        OR (tax_rate_percent >= 0 AND tax_rate_percent <= 100)),
  paid_cents        integer NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- Ausgestellt heisst: Nummer, Datum und Steuersatz stehen fest.
  CONSTRAINT invoices_issued_is_complete CHECK (
    status = 'draft'
    OR (number IS NOT NULL AND issued_at IS NOT NULL AND tax_rate_percent IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.invoice_lines (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description      text NOT NULL,
  quantity         numeric(10,2) NOT NULL CHECK (quantity > 0),
  -- NETTO. Kommt aus der Buchung, nie aus einer Vorlage.
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  sort_order       integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS invoice_lines_invoice_idx
  ON public.invoice_lines (invoice_id, sort_order);

CREATE INDEX IF NOT EXISTS invoices_recipient_idx ON public.invoices (recipient_id);
CREATE INDEX IF NOT EXISTS invoices_issuer_idx    ON public.invoices (issuer_id);

-- ══════════════════════════════════════════════════════════════════════
-- 4 · PERIMETER
-- ══════════════════════════════════════════════════════════════════════
--
-- Alle vier Tabellen enthalten personenbezogene und finanzielle Daten und
-- werden ausschliesslich ueber `getSupabaseAdmin()` bedient. Erst REVOKE,
-- dann RLS — dasselbe Muster wie 20260910_anon_insert_lockdown.sql.
REVOKE ALL ON TABLE public.disputes       FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.dispute_events FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.invoices       FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.invoice_lines  FROM anon, authenticated, PUBLIC;

ALTER TABLE public.disputes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines  ENABLE ROW LEVEL SECURITY;

COMMIT;

-- GEGENPROBE NACH DEM ANWENDEN:
--   bash scripts/anon-perimeter-probe.sh
--   Die vier neuen Tabellen in TABELLEN= eintragen, damit die Sonde sie
--   kennt — sonst meldet sie „dicht" und meint nur „dicht, soweit ich
--   hingesehen habe".
