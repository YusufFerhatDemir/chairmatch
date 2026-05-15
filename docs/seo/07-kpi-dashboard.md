# ChairMatch KPI Dashboard

Stand: 14. Mai 2026. Datenquellen: Supabase + Google Search Console + Stripe.

---

## North Star Metric

**Wöchentlich abgeschlossene Buchungen mit Stripe-Zahlung.**

Warum: Misst echten Marketplace-Value. Beide Seiten zufrieden (Mieter
zahlt → Anbieter liefert) ist der Kern-Beweis dass ChairMatch
funktioniert.

Zielwert Tag 90: **≥10 Buchungen / Woche**.

SQL:
```sql
SELECT COUNT(*) FROM bookings
WHERE status IN ('confirmed', 'completed')
  AND created_at >= now() - interval '7 days'
  AND payment_status = 'paid'
```

---

## Leading Indicators (täglich/wöchentlich)

### LI-01: Indexierte Seiten in Google
- **Frequenz**: wöchentlich
- **Quelle**: Google Search Console → Coverage
- **Zielwert Tag 90**: ≥40 indexierte URLs (Phase 1: 35 Pages + Salon-Details)
- **Warum**: Sichtbarkeitsbasis. Ohne Indexierung kein Traffic.

### LI-02: Organische Klicks/Woche
- **Frequenz**: wöchentlich
- **Quelle**: Search Console → Performance
- **Zielwert Tag 30 / 60 / 90**: 20 / 100 / 500
- **Warum**: Direkter Beweis von SEO-Funktion.

### LI-03: Anzahl aktiver Listings
- **Frequenz**: täglich
- **Quelle**: Supabase
- **Zielwert Tag 90**: ≥30
- SQL:
```sql
SELECT COUNT(*) FROM salons WHERE is_active = true AND is_verified = true
```

### LI-04: Anbieter-Signups / Woche
- **Frequenz**: wöchentlich
- **Quelle**: Supabase profiles
- **Zielwert Tag 30 / 60 / 90**: 3 / 8 / 5 (Spitze Woche 5-6, danach plateau)
- SQL:
```sql
SELECT COUNT(*) FROM profiles
WHERE role = 'anbieter'
  AND created_at >= now() - interval '7 days'
```

### LI-05: Mieter-Signups / Woche
- **Frequenz**: wöchentlich
- **Quelle**: Supabase profiles
- **Zielwert Tag 90**: ≥10/Woche
- SQL:
```sql
SELECT COUNT(*) FROM profiles
WHERE role = 'kunde'
  AND created_at >= now() - interval '7 days'
```

### LI-06: Conversion Listing-View → Booking-Anfrage
- **Frequenz**: wöchentlich
- **Quelle**: visit_logs JOIN bookings
- **Zielwert**: ≥2 %
- SQL-Skizze:
```sql
WITH listing_views AS (
  SELECT path, COUNT(*) as views
  FROM visit_logs
  WHERE path LIKE '/salon/%'
    AND created_at >= now() - interval '7 days'
  GROUP BY path
),
booking_anfragen AS (
  SELECT salon_id, COUNT(*) as anfragen
  FROM bookings
  WHERE created_at >= now() - interval '7 days'
  GROUP BY salon_id
)
SELECT
  SUM(lv.views) as total_views,
  SUM(ba.anfragen) as total_anfragen,
  ROUND(100.0 * SUM(ba.anfragen) / NULLIF(SUM(lv.views), 0), 2) as conv_pct
FROM listing_views lv
LEFT JOIN salons s ON s.slug = SUBSTRING(lv.path FROM 8)
LEFT JOIN booking_anfragen ba ON ba.salon_id = s.id
```

### LI-07: Conversion Booking-Anfrage → Confirmed
- **Frequenz**: wöchentlich
- **Quelle**: bookings
- **Zielwert**: ≥60 %
- SQL:
```sql
SELECT
  COUNT(*) FILTER (WHERE status IN ('confirmed','completed')) * 100.0
  / NULLIF(COUNT(*), 0) AS conv_pct
FROM bookings
WHERE created_at >= now() - interval '7 days'
```

### LI-08: Top-Listing-Page-Views (Konzentration)
- **Frequenz**: wöchentlich
- **Quelle**: visit_logs
- **Zielwert**: Top-3-Listings ≤30 % der Listing-Views (= breite Verteilung)
- **Warum**: Wenn Verteilung sehr konzentriert → schlechte Discovery

---

## Lagging Indicators (monatlich)

### LA-01: GMV (Gross Merchandise Value)
- **Frequenz**: monatlich
- **Quelle**: bookings.price_cents SUM
- **Zielwert Monat 3**: ≥3.000 €
- SQL:
```sql
SELECT SUM(price_cents) / 100.0 AS gmv_eur
FROM bookings
WHERE status = 'completed'
  AND created_at >= date_trunc('month', now())
```

### LA-02: Net Revenue (Provision)
- **Frequenz**: monatlich
- **Quelle**: bookings.platform_fee_cents
- **Zielwert Monat 3**: ≥250 € (10 % von 2.500 GMV ohne 0%-Stuhl-Buchungen)

### LA-03: Repeat-Booking-Rate
- **Frequenz**: monatlich
- **Quelle**: bookings JOIN profiles
- **Zielwert Monat 3**: ≥25 %
- SQL:
```sql
SELECT
  COUNT(DISTINCT customer_id) FILTER (WHERE booking_count > 1) * 100.0
  / NULLIF(COUNT(DISTINCT customer_id), 0) AS repeat_pct
FROM (
  SELECT customer_id, COUNT(*) AS booking_count
  FROM bookings
  WHERE status = 'completed'
  GROUP BY customer_id
) c
```

### LA-04: NPS (Net Promoter Score)
- **Frequenz**: monatlich, ab Monat 2
- **Quelle**: eigene Mini-Survey via Email (Resend)
- **Zielwert Monat 3**: ≥30
- **Format**: "Wie wahrscheinlich (0-10) empfiehlst du ChairMatch?"
  - Promoters (9-10): + 1
  - Detractors (0-6): − 1
  - Passives (7-8): 0
  - NPS = % Promoters − % Detractors

### LA-05: CAC (Customer Acquisition Cost) — Anbieter
- **Frequenz**: monatlich
- **Quelle**: Marketing-Budget / Neue Anbieter
- **Zielwert**: ≤30 € pro Anbieter

---

## Dashboard-Layout

Single Page: `/admin/super/kpi`

Layout (top-to-bottom):
1. **Hero-Number**: North Star (Bookings/Woche) — riesig in Mitte
2. **Trend-Chart**: Letzte 8 Wochen
3. **Funnel**: Visits → Listing-View → Booking-Anfrage → Confirmed → Completed
4. **Leading-Indicators-Grid**: 8 Karten 2×4
5. **Lagging-Indicators-Tabelle**: GMV, Revenue, Repeat-Rate, NPS
6. **Risk-Indikatoren**: Error-Rate, Bypass-Verdacht, CWV-Regression

Implementierung: API-Endpoint `/api/admin/kpi` (analog zu existierendem
`/api/admin/health`) + Client-Page mit Chart.js.

---

## Wöchentlicher Report-Template

Yusuf schickt sich SELBST jeden Freitag um 18:00 (Cron-Job-fähig) eine
Email mit:

```
ChairMatch Weekly Report — KW [N]

═══════════════════════════════════════
NORTH STAR
═══════════════════════════════════════
Buchungen diese Woche:    [N]
Δ zur Vorwoche:            [+N or -N]
North-Star-Score (Tag X/90): X %

═══════════════════════════════════════
LEADING INDICATORS
═══════════════════════════════════════
Indexierte Seiten:        [N]    (Ziel Tag 90: 40)
Organische Klicks:        [N]/W  (Ziel: nach Sprint-Plan)
Aktive Listings:          [N]    (Ziel: 30)
Anbieter-Signups:         [N]/W
Mieter-Signups:           [N]/W
Conv Listing → Booking:   [N]%
Conv Anfrage → Confirmed: [N]%

═══════════════════════════════════════
TOP 3 WINS DIESE WOCHE
═══════════════════════════════════════
1. ...
2. ...
3. ...

═══════════════════════════════════════
TOP 3 BLOCKER / SORGEN
═══════════════════════════════════════
1. ...
2. ...
3. ...

═══════════════════════════════════════
NÄCHSTE WOCHE — TOP 5 DELIVERABLES
═══════════════════════════════════════
1. ...
2. ...
3. ...
4. ...
5. ...

═══════════════════════════════════════
RISIKO-STATUS (Top 10 Register)
═══════════════════════════════════════
[Liste Risiken die diese Woche aktiv triggern]
```

---

## Implementation als API-Route (Stub)

`src/app/api/admin/kpi/route.ts` (zukünftig):
```ts
export const GET = withApi(async () => {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== 'super_admin') {
    return apiError('Forbidden', 403)
  }
  const supabase = getSupabaseAdmin()

  // North Star
  const northStar = await supabase.from('bookings').select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo).in('status', ['confirmed', 'completed'])

  // LI-03 aktive Listings
  const activeListings = await supabase.from('salons').select('*', { count: 'exact', head: true })
    .eq('is_active', true).eq('is_verified', true)

  // ... weitere Indicators
  return NextResponse.json({ northStar: northStar.count, activeListings: activeListings.count, ... })
})
```

---

## Tracking-Setup

### Pixel-Tracking pro Mechanik

**Salon-View-Tracking** (existiert bereits):
- `POST /api/analytics/visit` mit `{path, referrer, utm_*}`
- Geschrieben in `visit_logs`-Tabelle
- Geo-IP-Hash (DSGVO-konform, kein direktes Tracking)

**Booking-Funnel-Events**:
- `salon_view`: `/salon/[slug]` aufgerufen
- `booking_started`: `/booking/[salonId]` aufgerufen
- `booking_submitted`: POST `/api/bookings` ok
- `booking_confirmed`: Stripe Webhook `payment.succeeded`
- `booking_completed`: Anbieter markiert als completed

Storage: `visit_logs.event_type` Spalte (bereits da)

---

## Open Items

- [ ] `/api/admin/kpi`-Endpoint implementieren (auf Basis von /health)
- [ ] `/admin/super/kpi`-Page bauen mit Chart.js (Modul 6 Komponenten
      nutzen für Trust-Bars)
- [ ] Wöchentlicher Email-Report als Cron-Job (Resend abhängig)
- [ ] NPS-Survey-Tool integrieren (Phase 2)
- [ ] GA4 oder Plausible für externes Backup (optional)
