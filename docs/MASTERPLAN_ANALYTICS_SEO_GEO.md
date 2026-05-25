# MASTERPLAN — Analytics, SEO & GEO (Generative Engine Optimization)

Stand: 2026-05-25 · Autor: Lead Fullstack + SEO/GEO + Analytics
Scope: Web (chairmatch.de) + spätere Native-App (Capacitor → iOS/Android)
Status: **Architektur-Dokument. Noch nicht implementiert.**

---

## 0. Executive Summary

ChairMatch hat eine solide SEO-Foundation (Schema.org, Sitemap, Robots,
Magazin, Stadt-/Vertical-Hubs, IndexNow). Was fehlt, ist **Mess- und
Steuerungsinfrastruktur**: GA4, Search Console-Anbindung, Meta-Pixel,
Core-Web-Vitals-Reporting, ein internes Marketing-Dashboard und
GEO-Optimierung speziell für AI-Suchmaschinen (ChatGPT, Claude,
Perplexity, Gemini, Copilot).

Dieser Plan bringt das in **3 Wellen** live:

- **Welle 1 (Foundation, ~2 Wochen):** GA4 + GSC + Consent Mode v2 + CWV-Stream + erweitertes Schema/GEO + Meta-Pixel mit CAPI-Vorbereitung.
- **Welle 2 (Internal Dashboard, ~3 Wochen):** Eigenes Admin-Analytics-Dashboard das GA4 + GSC + Stripe + Supabase aggregiert. Keine Vendor-Lock-Bindung.
- **Welle 3 (Scale, ~4 Wochen):** Server-side Tagging via GTM/Edge, Audience-Sync zu Meta/Google, Wikidata-Eintrag, App-Tracking, Attribution-Modell.

**Kostenrahmen:** 0 € laufend für Foundation. Erst bei Werbeschaltung
fallen Werbekosten an (kein Tool-Cost). Optional späterer GTM-Server
auf Cloud Run: ~5 €/Monat.

---

## 1. Ist-Analyse (was DA ist · was FEHLT)

### 1.1 Analytics & Tracking

| Bereich | Ist-Stand | Bewertung |
|---|---|---|
| **GA4** | ❌ Nicht installiert. Layout hat `verification: {}` leer | Fehlt komplett |
| **Google Search Console (GSC)** | 🟡 Setup-Doku vorhanden (`docs/seo/SEARCH-CONSOLE-SETUP.md`), aber keine API-Integration | Manueller Setup nötig + API-Pull noch nicht angeschlossen |
| **Bing Webmaster Tools** | ❌ Nicht eingerichtet | Fehlt |
| **Meta-Pixel / Conversions API** | ❌ Nicht installiert | Fehlt komplett |
| **Google Ads Conversion Tracking** | ❌ Nicht installiert | Fehlt |
| **Core Web Vitals (Echtnutzer)** | ❌ Kein `web-vitals` package, kein RUM | Fehlt |
| **Eigenes Visit-Tracking** | ✅ `VisitTracker.tsx` + `/api/analytics/visit` + Supabase `visit_logs` | Vorhanden, aber sehr minimal — nur Pfad/IP/Country/UA, keine Events |
| **Admin-Analytics-Dashboard** | 🟡 `/admin/besucher` listet rohe Visits, `/admin/statistik`, `/admin/mis` existieren — Inhalt minimal | Vorhanden, aber kein konsolidiertes Dashboard |
| **Consent-Banner / DSGVO** | ✅ `ConsentBanner.tsx` mit 3 Kategorien (necessary/statistics/marketing), Supabase `cookie_consents` | Solide, aber noch nicht an Consent Mode v2 angeschlossen |
| **Sentry (Error-Tracking)** | ✅ `@sentry/nextjs ^9` in `instrumentation.ts`, opt-in via ENV `SENTRY_DSN` | Vorhanden |

### 1.2 SEO

| Bereich | Ist-Stand | Bewertung |
|---|---|---|
| **Metadata** | ✅ Root-`layout.tsx` mit OG/Twitter/Manifest/Icons/Apple-WebApp, `metadataBase` gesetzt | Stark |
| **JSON-LD Schema** | ✅ `Organization` + `WebSite` global; `LocalBusiness`, `BreadcrumbList`, `FAQPage`, `Service+Offer`, `Article`, `ServiceArea` als Helper in `src/lib/seo.ts` | Sehr stark |
| **Sitemap** | ✅ `app/sitemap.ts` mit Static + Categories + Salons (DB+Demo) + Vertical-Hubs + City-Hubs (Threshold) + Magazin + Listings + Products | Sehr stark |
| **Robots** | ✅ `app/robots.ts` mit AI-Crawler explizit (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, anthropic-ai) | Stark |
| **IndexNow** | ✅ `src/lib/indexing.ts` + `/api/indexnow/key`. Key über ENV | Stark |
| **Google Indexing API** | ✅ Code-Pfad vorhanden in `indexing.ts` (für JobPosting/LiveStream) | Vorhanden, aktuell wenig Nutzen für unsere Content-Typen |
| **OG-Images** | ✅ `app/opengraph-image.tsx` + Listing-Variante | Vorhanden, ausbaubar |
| **hreflang / i18n** | 🟡 Layout hat nur `de-DE` in `alternates.languages`. App hat 4 Sprachen (DE/EN/TR/AR) | Fehlt mehrsprachiges hreflang |
| **Soft-404-Schutz** | ✅ `shouldIndex(count, INDEX_THRESHOLD=3)` für Listing-Aggregate | Stark |
| **Magazin/Content-Hub** | ✅ `MAGAZIN_ARTIKEL` Datenstamm, Article-Schema | Vorhanden |
| **City × Vertical Pages** | ✅ Generator für `PHASE_1_CITIES × VERTICALS` | Vorhanden |
| **Breadcrumbs** | ✅ Komponente + Schema | Vorhanden |

### 1.3 GEO (Generative Engine Optimization)

| Bereich | Ist-Stand | Bewertung |
|---|---|---|
| **AI-Crawler-Zugriff in robots.txt** | ✅ Alle relevanten Bots erlaubt | Stark |
| **Q&A-Format / FAQPage-Schema** | ✅ `FAQ.tsx` + `faq-master.ts` + `faqSchema()` | Stark |
| **Entitäten-Schema (Organization mit `knowsAbout`)** | ✅ `knowsAbout` Array vorhanden | Vorhanden |
| **`sameAs` zu Wikidata / Social** | ❌ Leer (TODO in `seo.ts:69`) | Fehlt — wichtig für Entity-Anker |
| **Author-Bio mit Schema** | 🟡 `author.url` zeigt auf `/was-ist-chairmatch`, kein Person-Schema | Ausbaufähig |
| **llms.txt** | ❌ Nicht vorhanden | Fehlt (neuer Standard für AI-Crawler) |
| **Wikidata-Eintrag für "ChairMatch"** | ❌ Existiert nicht | Fehlt |
| **Quotable Content (Stats, Zitate, Listen)** | 🟡 Magazin hat erste Artikel — noch keine konsequente Q&A-Antwort-Architektur | Ausbaufähig |

### 1.4 Performance / Core Web Vitals

| Bereich | Ist-Stand | Bewertung |
|---|---|---|
| **`web-vitals` RUM** | ❌ Nicht integriert | Fehlt |
| **Bilder via `next/image`** | 🟡 Teilweise, manche `<img>` direkt | Audit nötig |
| **Service Worker** | ❌ Aktiv deaktiviert (Kill-Switch in `layout.tsx:154`) | Bewusste Entscheidung — wieder aktivieren wenn CWV stabil |
| **Font-Loading** | ✅ `next/font` mit `display: swap` für DM Sans + Cinzel | Optimal |
| **Lab-Daten (Lighthouse)** | ❓ Kein automatisierter Lauf in CI | Fehlt |

### 1.5 Datenbank / Supabase

| Tabelle | Zweck | Status |
|---|---|---|
| `visit_logs` | Roh-Page-Views aus `VisitTracker` | ✅ Migration `20260309_visit_logs.sql` |
| `cookie_consents` | Consent-Wahl pro Session-ID + Choices JSON | ✅ Migration in `20260311_spec_v2.sql` |
| `audit_logs` | Admin-Audit | ✅ Migration `20260309_audit_logs.sql` |
| **`analytics_events`** | Strukturierte Events (search, view, booking_start, booking_confirm, …) | ❌ Fehlt |
| **`web_vitals`** | LCP/INP/CLS/TTFB-Datenstrom pro Pfad | ❌ Fehlt |
| **`seo_rankings`** | GSC-Snapshot pro Tag × Query × Page | ❌ Fehlt |
| **`ga4_aggregates`** | GA4-Pulls pro Tag | ❌ Fehlt |

---

## 2. Prioritäten-Matrix

### Foundation Layer (Welle 1 — MUSS sofort)

| # | Item | Aufwand | Impact | Begründung |
|---|---|---|---|---|
| F1 | GA4 + GTag in Layout, gated durch Consent Mode v2 | S | Sehr hoch | Ohne GA4 fliegen wir blind |
| F2 | GSC verifizieren + Sitemap einreichen + Bing Webmaster | S | Sehr hoch | Indexierung beschleunigen, Query-Daten freischalten |
| F3 | Consent Mode v2 (Google-Standard) + Anbindung an `ConsentBanner` | M | Hoch | DSGVO-Konformität + GA4-Modellierung |
| F4 | `web-vitals` RUM → eigenes API + Supabase + GA4 Event | S | Hoch | CWV ist Ranking-Signal — wir brauchen Echtnutzerdaten |
| F5 | Schema-Erweiterung: hreflang DE/EN/TR/AR, `sameAs`, Person-Schema | S | Hoch | Internationalisierung + Entity-Anker für GEO |
| F6 | `llms.txt` + AI-bezogene Meta-Verbesserungen | XS | Mittel | Neuer De-facto-Standard, billiges Win |
| F7 | Meta-Pixel + Vorbereitung Conversions API (CAPI) | S | Hoch | Wenn Werbung anrollt, sofort messbar |
| F8 | Strukturierte Events-Tabelle `analytics_events` | M | Hoch | Eigene Source-of-Truth, unabhängig von GA4-Sampling |

### Scale Layer (Welle 2+3 — danach)

| # | Item | Aufwand | Impact |
|---|---|---|---|
| S1 | Internes Marketing-Dashboard (`/admin/marketing`) mit GA4 + GSC + Stripe + Supabase | L | Sehr hoch |
| S2 | Server-side Tagging (GTM Server-Container auf Cloud Run oder Edge-API) | L | Hoch (Adblock-resistent, präziseres CAPI) |
| S3 | Audience-Sync (Custom Audiences zu Meta + Google Ads via APIs) | M | Mittel |
| S4 | Wikidata-Eintrag + Knowledge-Graph-Optimierung | M | Mittel |
| S5 | Native-App-Tracking (GA4 for Firebase, Branch/Deep-Links) | M | Mittel |
| S6 | Attributionsmodell (Multi-Touch / First-Click / Last-Click) | L | Mittel |
| S7 | Programmatic-SEO-Skalierung über Magazin + Bezirks-Subseiten | L | Hoch (langfristig) |

---

## 3. Architektur (Next.js, modular)

```
src/
├── analytics/                          # NEU — modularer Analytics-Layer
│   ├── client.ts                       # Public-API: track(), pageview(), identify()
│   ├── consent.ts                      # Consent-Status lesen, Listener
│   ├── gtag.ts                         # GA4-Provider (gated)
│   ├── meta-pixel.ts                   # Meta-Pixel-Provider (gated)
│   ├── web-vitals.ts                   # CWV-Beacon
│   ├── events.ts                       # Event-Schema (TypeScript)
│   └── server/
│       ├── ga4-data-api.ts             # GA4 Data API client
│       ├── gsc-api.ts                  # Search Console API client
│       ├── meta-capi.ts                # Conversions API (server-side)
│       └── google-ads-api.ts           # später
│
├── components/
│   ├── analytics/
│   │   ├── GAProvider.tsx              # Client-Component, lädt gtag.js wenn consent.statistics
│   │   ├── MetaPixelProvider.tsx       # dito für Pixel wenn consent.marketing
│   │   ├── ConsentModeBootstrap.tsx    # Setzt gtag('consent','default',...) VOR allen Tags
│   │   └── WebVitalsReporter.tsx       # useReportWebVitals → Beacon
│   ├── ConsentBanner.tsx               # BESTEHEND — erweitern: feuert Consent-Mode-Updates
│   └── VisitTracker.tsx                # BESTEHEND — bleibt als first-party Fallback
│
├── app/
│   ├── llms.txt/route.ts               # NEU — /llms.txt für AI-Crawler
│   ├── api/
│   │   ├── analytics/
│   │   │   ├── visit/route.ts          # BESTEHEND
│   │   │   ├── event/route.ts          # NEU — strukturierte Events
│   │   │   └── web-vitals/route.ts     # NEU — CWV-Beacon-Endpoint
│   │   ├── meta/
│   │   │   └── capi/route.ts           # NEU — Server-side Conversions API Relay
│   │   └── seo/
│   │       ├── gsc-pull/route.ts       # NEU — Cron-getriggert, lädt GSC-Daten
│   │       └── ga4-pull/route.ts       # NEU — Cron-getriggert, lädt GA4-Aggregates
│   └── (admin)/admin/
│       ├── marketing/                  # NEU — konsolidiertes Dashboard
│       │   ├── page.tsx                # Übersicht (KPIs)
│       │   ├── traffic/page.tsx        # GA4-Pull-Daten
│       │   ├── search/page.tsx         # GSC-Daten (Queries, CTR, Position)
│       │   ├── conversions/page.tsx    # Bookings-Funnel + ROAS
│       │   └── seo-health/page.tsx     # CWV + Indexierungsstatus
│       ├── besucher/page.tsx           # BESTEHEND — bleibt für Roh-Visits
│       └── statistik/page.tsx          # BESTEHEND — ggf. konsolidieren
│
└── lib/
    ├── seo.ts                          # BESTEHEND — erweitern (hreflang-Helper, Person-Schema, sameAs)
    ├── seo-data/
    │   ├── entities.ts                 # NEU — Wikidata-IDs, Founder-Bio strukturiert
    │   └── ai-answers.ts               # NEU — kuratiertere Q&A-Snippets für GEO
    └── indexing.ts                     # BESTEHEND
```

**Designprinzip:**
- Alles Analytics liegt unter `src/analytics/` als **eigenständiges Modul**. Provider-Tausch (z.B. später PostHog statt GA4) ändert nur dieses Modul.
- Public API in `src/analytics/client.ts` ist provider-agnostisch:
  ```ts
  track('booking_confirmed', { listing_id, value_eur, currency: 'EUR' })
  ```
  intern wird zu GA4 + Meta-Pixel + eigener Event-API gesendet.

---

## 4. Datenfluss

```
                                  Browser (Client)
                                        │
            ┌───────────────────────────┼──────────────────────────────┐
            │                           │                              │
        Pageview                   User-Action                    Web-Vitals
            │                           │                              │
            ▼                           ▼                              ▼
    [VisitTracker]              [analytics.track()]           [WebVitalsReporter]
    fetch /api/analytics/visit  fan-out:                      fetch /api/analytics/web-vitals
                                │                                     │
                                ├── gtag (GA4) — wenn consent.statistics
                                ├── fbq (Meta) — wenn consent.marketing
                                └── fetch /api/analytics/event (first-party always)
                                                                     │
                                                                     ▼
                                                              Supabase
                                                              ├── visit_logs
                                                              ├── analytics_events
                                                              └── web_vitals

         ───────────────────────  CRON (jeden Tag 03:00 UTC)  ───────────────────────
         /api/seo/gsc-pull   ──►  GSC Search Analytics API   ──►  seo_rankings
         /api/seo/ga4-pull   ──►  GA4 Data API               ──►  ga4_aggregates
         /api/meta/capi-sync ──►  Meta Conversions API       ──►  meta_send_log

         ───────────────────────  ADMIN /admin/marketing  ─────────────────────────
         Server-Components lesen Supabase + ggf. Live-API
         Eine einzige Stelle für: Traffic · Search · Conversions · CWV · SEO-Health
```

**Warum first-party Event-Stream zusätzlich zu GA4?**
1. Adblock-resistent (ca. 30–40 % der DACH-Nutzer blocken GA4).
2. Eigene Daten, kein Sampling, beliebig lange Aufbewahrung.
3. Stripe-Daten direkt joinable → echte Conversion-Wahrheit.

---

## 5. API-Struktur

### 5.1 Client-seitig (öffentlich)
- `POST /api/analytics/visit` — bestehend, bleibt.
- `POST /api/analytics/event` — **NEU**. Body: `{ name, params, session_id, anon_id, consent_status }`.
- `POST /api/analytics/web-vitals` — **NEU**. Body: `{ metric: 'LCP'|'INP'|'CLS'|'TTFB'|'FCP', value, rating, path, id, navigationType }`.

### 5.2 Server-seitig (intern, Service-Account/OAuth)

**GA4 Data API**
- Auth: Service-Account-JSON in ENV `GA4_SERVICE_ACCOUNT_JSON` (base64).
- Endpoint: `https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport`.
- Aufruf: täglich via Vercel-Cron `/api/seo/ga4-pull` (oder Supabase Cron).
- Ergebnis → `ga4_aggregates`.

**Google Search Console API**
- Auth: OAuth 2.0 (Service-Account funktioniert NICHT für GSC — User-OAuth nötig).
- Variante A: Manuell einmalig OAuth-Refresh-Token holen, in `GSC_REFRESH_TOKEN` ENV speichern.
- Variante B (sauberer): Supabase-OAuth-Connector mit Google-Provider.
- Endpoint: `https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`.
- Cron: täglich `/api/seo/gsc-pull` → `seo_rankings`.

**Meta Conversions API (CAPI)**
- Auth: Long-lived Access Token aus Meta Business Manager.
- Endpoint: `https://graph.facebook.com/v21.0/{PIXEL_ID}/events`.
- Trigger: Server-side bei `booking_confirmed` (in `/api/bookings/.../confirm` als Side-Effect).
- Dedupe: `event_id` matched mit Browser-Pixel-Event.

**Indexing**
- Bereits vorhanden: `notifyIndexers()` in `lib/indexing.ts`.
- Hook erweitern: Bei jedem neuen Salon/Listing/Magazin-Artikel auto-ping.

### 5.3 ENV-Variablen (neu)

```bash
# GA4
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_PROPERTY_ID=123456789
GA4_SERVICE_ACCOUNT_JSON=base64(...)

# GSC
GSC_SITE_URL=sc-domain:chairmatch.de
GSC_CLIENT_ID=...
GSC_CLIENT_SECRET=...
GSC_REFRESH_TOKEN=...

# Meta
NEXT_PUBLIC_META_PIXEL_ID=1234567890
META_CAPI_ACCESS_TOKEN=...
META_CAPI_TEST_EVENT_CODE=TEST12345         # nur in dev

# Google Ads (Welle 3)
GOOGLE_ADS_CONVERSION_ID=AW-XXXXXXXX
GOOGLE_ADS_CONVERSION_LABEL=abc123/abc

# Bing
BING_WMT_API_KEY=...                        # für API-Sitemap-Submission

# Bereits vorhanden: INDEXNOW_KEY, SENTRY_DSN
```

Alle `NEXT_PUBLIC_*` werden in Layout/Client geladen, nicht-Public bleiben Server-only.

---

## 6. Datenbank — SQL-Skizzen

### 6.1 `analytics_events`

```sql
-- Migration: 20260601_analytics_events.sql
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name text NOT NULL,                    -- 'pageview' | 'search' | 'salon_view' |
                                               -- 'booking_start' | 'booking_confirmed' | …
  session_id text,                             -- aus sessionStorage (cm_session_id)
  anon_id text,                                -- aus localStorage (cm_anon_id, persistent)
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  params jsonb DEFAULT '{}'::jsonb,            -- event-spezifische Parameter
  consent_statistics boolean DEFAULT false,
  consent_marketing boolean DEFAULT false,
  ip text,
  country text,
  region text,
  city text,
  user_agent text,
  device_type text,                            -- 'mobile' | 'tablet' | 'desktop'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX analytics_events_name_created_idx ON analytics_events(event_name, created_at DESC);
CREATE INDEX analytics_events_session_idx     ON analytics_events(session_id);
CREATE INDEX analytics_events_user_idx        ON analytics_events(user_id);
CREATE INDEX analytics_events_utm_campaign_idx ON analytics_events(utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX analytics_events_path_idx        ON analytics_events(path);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert from anyone" ON analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read" ON analytics_events FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin'))
);
```

### 6.2 `web_vitals`

```sql
CREATE TABLE IF NOT EXISTS web_vitals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  metric text NOT NULL,                        -- 'LCP' | 'INP' | 'CLS' | 'TTFB' | 'FCP'
  value numeric NOT NULL,
  rating text NOT NULL,                        -- 'good' | 'needs-improvement' | 'poor'
  path text,
  navigation_type text,                        -- 'navigate' | 'reload' | 'back_forward' | 'prerender'
  device_type text,
  connection_type text,                        -- '4g' | 'wifi' | …
  session_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX web_vitals_metric_created_idx ON web_vitals(metric, created_at DESC);
CREATE INDEX web_vitals_path_idx           ON web_vitals(path);

ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert from anyone" ON web_vitals FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read" ON web_vitals FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin'))
);
```

### 6.3 `seo_rankings`

```sql
CREATE TABLE IF NOT EXISTS seo_rankings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date date NOT NULL,
  query text NOT NULL,
  page text NOT NULL,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  ctr numeric,
  avg_position numeric,
  country text,
  device text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(snapshot_date, query, page, country, device)
);

CREATE INDEX seo_rankings_date_idx     ON seo_rankings(snapshot_date DESC);
CREATE INDEX seo_rankings_query_idx    ON seo_rankings(query);
CREATE INDEX seo_rankings_page_idx     ON seo_rankings(page);
```

### 6.4 `ga4_aggregates`

```sql
CREATE TABLE IF NOT EXISTS ga4_aggregates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date date NOT NULL,
  dimension text NOT NULL,                     -- 'source' | 'page' | 'country' | 'device' | …
  dimension_value text NOT NULL,
  sessions integer,
  active_users integer,
  engaged_sessions integer,
  conversions integer,
  total_revenue numeric,
  bounce_rate numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(snapshot_date, dimension, dimension_value)
);

CREATE INDEX ga4_aggregates_date_idx ON ga4_aggregates(snapshot_date DESC);
```

### 6.5 `meta_send_log` (CAPI Audit)

```sql
CREATE TABLE IF NOT EXISTS meta_send_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL,                      -- dedupe-key gegen Browser-Pixel
  event_name text NOT NULL,
  value_eur numeric,
  user_hash text,                              -- email_sha256 etc.
  status integer,
  response jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX meta_send_log_event_id_idx ON meta_send_log(event_id);
```

---

## 7. Schritt-für-Schritt Umsetzung (Wellen)

### Welle 1 — Foundation (Ziel: alles messbar, ~2 Wochen)

**W1.1 — Consent Mode v2 (Tag 1)**
- `src/components/analytics/ConsentModeBootstrap.tsx` lädt VOR allen Tags:
  ```js
  gtag('consent', 'default', {
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'analytics_storage': 'denied',
    'functionality_storage': 'granted',
    'security_storage': 'granted',
    'wait_for_update': 500
  })
  ```
- `ConsentBanner.tsx` (bestehend) erweitern: nach `save()` → `gtag('consent', 'update', {...})`.

**W1.2 — GA4 Tag (Tag 1-2)**
- Paket: `@next/third-parties/google` (offizielles Next-Wrapper, DSGVO-konform integrierbar).
- In `layout.tsx`:
  ```tsx
  import { GoogleAnalytics } from '@next/third-parties/google'
  // … nach </body>:
  {process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID && (
    <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID} />
  )}
  ```
- Yusuf: GA4-Property anlegen, Measurement-ID in Vercel-ENV setzen.

**W1.3 — Search Console + Bing (Tag 2)**
- Yusuf: `chairmatch.de` Domain-Property anlegen (Doku in `docs/seo/SEARCH-CONSOLE-SETUP.md` existiert).
- TXT-Record in DNS, Sitemap einreichen, IndexNow-Key aktivieren.
- Gleiche Domain bei Bing Webmaster.

**W1.4 — Core Web Vitals RUM (Tag 2-3)**
- Paket: `web-vitals` (Google, ~1 KB gzipped).
- `src/components/analytics/WebVitalsReporter.tsx` mit `useReportWebVitals()` (Next.js 15 native).
- `/api/analytics/web-vitals/route.ts` → Supabase `web_vitals`.
- Zusätzlich an GA4 als Custom Events senden.

**W1.5 — Meta-Pixel + CAPI-Vorbereitung (Tag 3-4)**
- `src/components/analytics/MetaPixelProvider.tsx` (gated durch `consent.marketing`).
- `src/app/api/meta/capi/route.ts` — initial Stub; Verkabelung im `/api/bookings/confirm` als async Side-Effect.
- Yusuf: Meta Business Manager-Account, Pixel-ID, Access-Token.

**W1.6 — Strukturierte Events (Tag 4-6)**
- Migration `analytics_events`.
- `src/analytics/client.ts` mit zentraler `track()`-Funktion.
- `src/analytics/events.ts` TypeScript-Schema:
  ```ts
  type Events =
    | { name: 'pageview'; params: { path: string; referrer?: string } }
    | { name: 'search'; params: { query: string; filters: object; result_count: number } }
    | { name: 'salon_view'; params: { salon_id: string; city: string; vertical: string } }
    | { name: 'booking_start'; params: { listing_id: string; date: string } }
    | { name: 'booking_confirmed'; params: { booking_id: string; value_eur: number; currency: 'EUR' } }
    | { name: 'lead_capture'; params: { source: string; campaign?: string } }
    // …
  ```
- Verkabelung in Hot-Pfaden: Search-Page, Salon-Detail, Booking-Flow.

**W1.7 — Schema-Erweiterungen für GEO (Tag 6-8)**
- `seo.ts`: hreflang-Helper für `de-DE`/`en-US`/`tr-TR`/`ar-SA`.
- Layout: `alternates.languages` füllen.
- `seo.ts`: `personSchema()` für Founder, `sameAs` mit Wikidata-Q-ID (sobald angelegt).
- `app/llms.txt/route.ts` — kuratierte Liste der wichtigsten Content-URLs für AI-Crawler (was-ist-chairmatch, magazin, hubs).

**W1.8 — Indexing-Auto-Ping (Tag 8)**
- Bestehender `notifyIndexers()` in Hooks einbauen: Salon-Update, Listing-Create, Magazin-Publish.

**Welle-1-Acceptance:**
- GA4 zeigt erste Sessions, gated nach Consent.
- GSC zeigt Sitemap-Status grün.
- CWV-Stream in Supabase >100 Datenpunkte.
- Meta-Pixel feuert auf Booking-Confirm.
- hreflang validiert über GSC Coverage.

---

### Welle 2 — Internal Marketing-Dashboard (~3 Wochen)

**W2.1 — Cron-Pulls aufsetzen**
- Vercel-Cron (oder Supabase pg_cron) für `/api/seo/gsc-pull` + `/api/seo/ga4-pull` täglich 03:00 UTC.
- Pulls schreiben in `seo_rankings` / `ga4_aggregates`.

**W2.2 — `/admin/marketing` Übersicht**
- KPIs: Sessions (7T/30T/90T), Bookings, Revenue, Top-Queries, Top-Pages, CWR Score.
- Quellen: Supabase (eigene Tabellen) — keine Live-API-Aufrufe in Page-Render.

**W2.3 — Sub-Pages**
- `/admin/marketing/traffic` — GA4-Aggregate, Sources/Channels.
- `/admin/marketing/search` — GSC-Queries mit Filter (Pos<10, CTR<2 %), Click-Trend.
- `/admin/marketing/conversions` — Funnel: Visit → Search → Salon-View → Booking-Start → Confirm. Drop-offs.
- `/admin/marketing/seo-health` — CWV-Verteilung pro Pfad, p75-Werte, Vergleich Tag-über-Tag.

**W2.4 — Alerts**
- Daily-Digest-Email an Yusuf (über bestehendes Resend-Setup) wenn CWV-p75 außerhalb "good" oder GSC-Errors steigen.

---

### Welle 3 — Scale Layer (~4 Wochen)

**W3.1 — Server-side Tagging**
- Option A (empfohlen): Edge-Function `/api/tagging/proxy` als Reverse-Proxy zu GA4 (`region1.google-analytics.com/g/collect`). Adblock-resistent.
- Option B: GTM Server-Container auf Cloud Run (~5 €/Monat).
- CAPI über Server bereits eingebaut → Audience-Quality steigt.

**W3.2 — Audience-Sync**
- Eigene API → Custom Audience Upload zu Meta (Conversions API + Audience API).
- Google Ads Customer Match.

**W3.3 — Wikidata + Knowledge-Graph**
- Wikidata-Item für "ChairMatch" anlegen (Q-ID besorgen, in `sameAs` referenzieren).
- Yusuf-Bio mit Person-Schema + `sameAs` zu LinkedIn/X.

**W3.4 — Native-App-Tracking**
- GA4 for Firebase im Capacitor-Wrapper.
- Branch oder Firebase Dynamic Links für Deep-Linking + Install-Attribution.
- Pixel-Setup parallel (Meta SDK for iOS/Android).

**W3.5 — Attribution & ROAS**
- Multi-Touch-Attribution: jeder Event speichert `utm_*` + `referrer` → in Supabase joinable mit Bookings.
- Dashboard zeigt CPL/CPA/ROAS pro Kanal.

---

## 8. Pakete & Bibliotheken (konkret)

| Paket | Version | Zweck | Welle |
|---|---|---|---|
| `@next/third-parties` | ^15 | Offizieller GA4/GTM-Wrapper für Next 15 | W1 |
| `web-vitals` | ^4 | Core Web Vitals SDK | W1 |
| `google-auth-library` | ^9 | OAuth/Service-Account für GA4/GSC | W2 |
| `googleapis` | ^144 | GSC/GA4 Data API Clients | W2 |
| `@types/gtag.js` | ^0 | TS-Types für gtag | W1 |

**Keine neuen großen Frameworks.** Bewusste Entscheidung gegen PostHog/Plausible/Umami: Wir bauen first-party Event-Stream selbst (Supabase haben wir eh), spart Vendor-Cost und vermeidet Datenabfluss.

---

## 9. Externe Services & Kostenschätzung

| Service | Kosten | Pflicht | Notizen |
|---|---|---|---|
| Google Analytics 4 | 0 € | Welle 1 | Property neu anlegen |
| Google Search Console | 0 € | Welle 1 | Property neu anlegen (Domain) |
| Bing Webmaster Tools | 0 € | Welle 1 | dito |
| IndexNow | 0 € | bereits live | Key in ENV |
| Meta Business Manager / Pixel / CAPI | 0 € | Welle 1 | Werbekosten getrennt |
| Google Ads Account | 0 € + Werbebudget | Welle 3 | nur wenn Ads geschaltet werden |
| Cloud Run (sst-GTM optional) | ~5 €/Monat | Welle 3 | Nur wenn server-side GTM gewünscht |
| Sentry | 0 € (free tier) | bereits live | |
| Wikidata-Eintrag | 0 € | Welle 3 | Manuell anlegen |

**Summe laufend: 0 €** für Welle 1+2. Ab Welle 3 optional ~5 €/Monat.

---

## 10. App-Erweiterung (Capacitor → iOS/Android)

Aktuell: `@capacitor/*` v6 in `package.json`. App ist Hybrid-WebView.

**Implikation:** Solange die App den gleichen `chairmatch.de`-Origin lädt, läuft GA4/Pixel automatisch mit. Aber:
- App-spezifische Events fehlen (Install, Push-Open, Foreground-Time).
- Attribution ist schwächer (kein Install-Source).

**Empfehlung Welle 3:**
1. **Firebase Project anlegen** (kostenlos im Spark-Plan).
2. **`@capacitor-firebase/analytics` Plugin** integrieren → eigene App-Stream-ID in GA4 (selbe Property, eigener Stream).
3. **Deep Linking:**
   - Universal Links (iOS) + App Links (Android) für `chairmatch.de/*`.
   - Capacitor-Config: `appUrlOpen` → in App-Router pushen.
   - `apple-app-site-association` + `assetlinks.json` unter `public/.well-known/` deployen.
4. **Branch.io oder Firebase Dynamic Links** für Install-Attribution (Tracking welche Werbung zu Installs führt).
5. **Meta SDK for iOS/Android** als Capacitor-Plugin (Community `@capacitor-community/facebook-login` o. eigenes Wrapper) — für App-Install-Events + CAPI.

**Schema für native:** App-Schema (`MobileApplication`) im Layout-JSON-LD ergänzen, App-Store-Links via `RelatedApplication` referenzieren — hilft Google App-Indexing.

---

## 11. 5 Workstreams (Arbeitspaket-Gliederung)

### Workstream A — SEO (Organic Search)
- **Eigentümer:** SEO-Engineer (Yusuf + Claude)
- **Ziel:** Top-3 für "Friseurstuhl mieten [Stadt]", "OP-Raum mieten [Stadt]" in DE.
- **Pakete:**
  - A1: hreflang + mehrsprachige Layouts (DE/EN/TR/AR) → W1
  - A2: Bezirks-Seiten (`/berlin/mitte`, `/berlin/kreuzberg/barber`) → W3
  - A3: Magazin-Skalierung (1 Artikel/Woche, City-Guides) → laufend
  - A4: Backlink-Strategie (Branchenverzeichnisse, Gastartikel) → ab W2
  - A5: GSC-Health-Loop: jede Woche Coverage-Errors triagieren → laufend

### Workstream B — GEO (AI Search)
- **Eigentümer:** Content + SEO
- **Ziel:** Bei ChatGPT/Claude/Perplexity-Anfragen "wo kann ich einen Friseurstuhl mieten in Berlin" zitiert werden.
- **Pakete:**
  - B1: `llms.txt` + Person-Schema Founder → W1
  - B2: Q&A-Architektur in jedem Stadt-Hub (10 Fragen pro Hub) → W2
  - B3: Wikidata-Eintrag + Knowledge-Graph → W3
  - B4: AI-Crawler-Monitoring: Log-Analyse welche Bots was holen (Vercel-Logs) → W2
  - B5: "Quotable Stats"-Seiten (Marktdaten, Studien) → W3

### Workstream C — Analytics (Measurement)
- **Eigentümer:** Analytics-Engineer (Claude)
- **Ziel:** Jede Buchung end-to-end attribuierbar.
- **Pakete:**
  - C1: GA4 + Consent Mode v2 + CWV → W1
  - C2: First-party Event-Stream → W1
  - C3: Daily Cron-Pulls GA4/GSC → W2
  - C4: Marketing-Dashboard → W2
  - C5: Server-side Tagging → W3

### Workstream D — Meta Ads (Paid Social)
- **Eigentümer:** Performance-Marketing (Yusuf + Tool)
- **Ziel:** CPL < 10 €, ROAS > 3.
- **Pakete:**
  - D1: Pixel + CAPI live → W1
  - D2: Standard-Events: ViewContent, Search, Lead, Purchase → W1
  - D3: 3 Test-Kampagnen (Mieter / Anbieter / Premium-Vertical) → W2
  - D4: Custom Audiences via API-Sync → W3
  - D5: Lookalike + DPA (Dynamic Product Ads für Listings) → W3

### Workstream E — Performance & CWV
- **Eigentümer:** Frontend (Claude)
- **Ziel:** Mobile p75 LCP < 2.5s, INP < 200ms, CLS < 0.1.
- **Pakete:**
  - E1: web-vitals Stream → W1
  - E2: `next/image` Audit + Conversion aller `<img>` → W2
  - E3: Lighthouse CI in GitHub Actions → W2
  - E4: Bundle-Analysis (`@next/bundle-analyzer`) + Code-Splitting-Review → W2
  - E5: Service Worker reaktivieren (gezielt, mit Strategie) → W3

---

## 12. DSGVO / Consent Mode v2

**Status quo:** ConsentBanner ✅ vorhanden, 3 Kategorien, Persistierung in `cookie_consents`.

**Erweiterung für Welle 1:**

1. **Consent Mode v2 (verpflichtend in EU seit März 2024)**

   Setzt zwei neue Signale obligatorisch für Google-Tags:
   - `ad_user_data` (darf Daten geteilt werden)
   - `ad_personalization` (darf für Personalisierung verwendet werden)

   Mapping zu unserem Banner:
   - `analytics_storage` ↔ `choices.statistics`
   - `ad_storage`, `ad_user_data`, `ad_personalization` ↔ `choices.marketing`
   - `functionality_storage`, `security_storage` ↔ immer `granted` (necessary)

2. **`gtag('consent','default',...)` MUSS vor jedem anderen `gtag('config',...)` feuern.** Deswegen `ConsentModeBootstrap.tsx` als inline-Script direkt im `<head>` (kein React-Hydration-Delay).

3. **Banner-UX-Anforderungen DSGVO:**
   - Accept ⇔ Reject auf gleicher Ebene (✅ schon umgesetzt).
   - "Settings"-Link führt zu granularer Kontrolle (✅).
   - Persistierung serverseitig: Wir loggen Consent in `cookie_consents` — ✅ schon.
   - Datenschutzerklärung: Eintrag in `/datenschutz` über GA4/Pixel/CAPI ergänzen (Empfänger, Rechtsgrundlage Art. 6 Abs. 1 lit. a DSGVO).

4. **IP-Anonymisierung:**
   - In GA4 standardmäßig aktiv (kein `anonymizeIp`-Flag mehr nötig in GA4, war nur UA-Sache).
   - In unserem `visit_logs` + `analytics_events`: IP nur kurzfristig (90 Tage) speichern, danach automatisch nullen → Cron-Job.
   - SQL für Retention:
     ```sql
     UPDATE visit_logs SET ip = NULL WHERE created_at < now() - interval '90 days';
     UPDATE analytics_events SET ip = NULL WHERE created_at < now() - interval '90 days';
     ```

5. **Meta-Pixel + CAPI:**
   - Browser-Pixel nur laden wenn `choices.marketing = true`.
   - Server-side CAPI darf auch ohne Browser-Pixel feuern, aber DARF nicht ohne Consent. → CAPI-Aufruf nur, wenn der User beim Booking eingewilligt hat (Consent zum Zeitpunkt des Confirms checken, in Booking-Row mit speichern).

6. **Recht auf Löschung:**
   - Bestehender `/api/account/delete` muss Events anonymisieren: `UPDATE analytics_events SET user_id = NULL, ip = NULL WHERE user_id = ?`.

---

## 13. Risiken & Gegenmaßnahmen

| Risiko | Wahrscheinlichkeit | Impact | Gegenmaßnahme |
|---|---|---|---|
| Adblock blockt GA4 → Datenlücke 30–40 % | Hoch | Mittel | First-party Event-Stream + server-side Tagging (W3) |
| GSC-OAuth-Refresh-Token läuft ab | Mittel | Niedrig | Token-Renewal-Cron + Alert |
| Meta-Pixel-Kosten = 0 € aber CAPI-Token-Ablauf | Mittel | Niedrig | Long-lived System User-Token (60 Tage Auto-Refresh) |
| CWV verschlechtert sich durch Tag-Loading | Mittel | Mittel | `@next/third-parties` lädt mit `strategy="lazyOnload"` |
| DSGVO-Anfechtung Consent-Banner | Niedrig | Hoch | Banner-UX nach EuGH "Planet49"-Standard halten, Dokumentation der Implementierung |
| Sitemap > 50.000 URLs | Mittel (langfristig) | Niedrig | Sitemap-Index implementieren wenn > 40.000 (aktuell sicher unterhalb) |

---

## 14. Was Yusuf besorgen / klicken muss (Externe Accounts/Keys)

**Welle 1:**
1. **Google Search Console:** Domain `chairmatch.de` als Property anlegen, DNS-TXT, Sitemap einreichen.
2. **Google Analytics 4:** Property anlegen → Measurement-ID `G-XXXXXXXXXX` an Claude geben (Vercel-ENV `NEXT_PUBLIC_GA4_MEASUREMENT_ID`).
3. **GA4 Data API:** Service-Account in Google Cloud Console anlegen, JSON-Key herunterladen, Service-Account-Email in GA4 Property hinzufügen als Viewer. JSON base64-encoded an Claude.
4. **Bing Webmaster Tools:** Property anlegen, DNS-TXT, Sitemap einreichen.
5. **Meta Business Manager:** Account → Datenquellen → Pixel anlegen → Pixel-ID + Access-Token an Claude.
6. **(Optional)** Wikidata-Account anlegen (wenn Welle 3 ansteht).

**Welle 2:**
7. **GSC OAuth:** Google Cloud Console → OAuth-Consent-Screen + OAuth-Credentials (Web Application). Refresh-Token einmal manuell via Playground holen, in ENV.

**Welle 3:**
8. **Google Ads-Konto** (wenn Schaltung beginnt).
9. **Firebase-Projekt** für App-Tracking.

Alles andere (Code, Deploys, Cron, Schema, Pages) macht Claude direkt.

---

## 15. Akzeptanzkriterien pro Welle

**Welle 1 — Foundation grün wenn:**
- [ ] GA4 zeigt > 100 Echtnutzer-Sessions in 48 h
- [ ] GSC Coverage zeigt Sitemap-Status "Erfolgreich"
- [ ] CWV-Datenstrom in Supabase > 500 Beacons / Tag
- [ ] Meta-Pixel feuert messbar auf Booking-Confirm (Test-Event-Code)
- [ ] hreflang-Tags validiert (z.B. via merkle.io/hreflang)
- [ ] `llms.txt` unter https://chairmatch.de/llms.txt erreichbar
- [ ] Consent Mode v2 verifiziert über Tag Assistant
- [ ] `analytics_events` > 1000 Events / Tag

**Welle 2 — Dashboard grün wenn:**
- [ ] `/admin/marketing` zeigt 30-Tage-KPIs aus 3 Quellen (Supabase + GA4 + GSC)
- [ ] Cron-Pulls laufen seit > 7 Tagen ohne Fehler
- [ ] Funnel-View zeigt Drop-off-Rates korrekt
- [ ] CWV-Trend sichtbar mit p75-Linie

**Welle 3 — Scale grün wenn:**
- [ ] Server-side Tagging-Proxy umgeht Adblock (verifizierbar via Test mit uBlock)
- [ ] App-Stream in GA4 zeigt mobile App-Events
- [ ] Wikidata-Q-ID in `sameAs` referenziert
- [ ] CAPI Match-Quality > 7/10 in Meta Events Manager
- [ ] ROAS-Reporting im Dashboard funktional

---

## 16. Offene Fragen für Yusuf (vor Welle-1-Start)

1. **Wikidata-Founder-Bio:** Yusuf-Profil auf LinkedIn aktuell? Welche Quellen können wir als `sameAs` referenzieren?
2. **Meta-Werbebudget:** Wann startet erste Kampagne? (Pixel-Setup priorisieren je nach Datum.)
3. **App-Launch-Datum:** Native iOS/Android — Welle 3 priorisieren wenn früher.
4. **GTM (Server-side):** Self-hosted auf Cloud Run akzeptabel oder lieber bei Vendor? (5 € vs. 0 € Aufwand.)
5. **Magazin-Frequenz:** 1 Artikel/Woche realistisch? (Für GEO-Performance entscheidend.)

---

## 17. Anhang — Mapping zu bestehenden Docs

- `docs/seo/00-recon-briefing.md` — Recon-Phase (Welle 0)
- `docs/seo/01-audit-prio-matrix.md` — bisheriges SEO-Audit (überschneidet sich mit §1.2)
- `docs/seo/02-ia-url-phasen.md` — URL/IA-Struktur (relevant für Workstream A)
- `docs/seo/03-04-05-implementation.md` — bisherige Implementation-Notes
- `docs/seo/06-cro-trust.md` — CRO-Trust-Layer
- `docs/seo/07-execution-plan.md` + `07-kpi-dashboard.md` — bisheriger KPI-Plan (ersetzt durch §2 + Workstreams)
- `docs/seo/SEARCH-CONSOLE-SETUP.md` — Setup-Anleitung für Welle-1-Schritt W1.3
- `docs/SENTRY-SETUP.md` — Fehler-Monitoring (bleibt)
- `docs/marketing/90-day-launch-plan.md` — Marketing-Launchplan (Workstream D speist sich hier ein)

Dieses Masterplan-Dokument ist die **konsolidierte, technische Zentralquelle** über alle bisherigen SEO/Marketing-Docs hinweg.

---

**Ende Masterplan.** Nach Yusuf-Approval beginnt Welle 1 mit W1.1 (Consent Mode v2) — kleinster Risikoschritt, validiert Architektur.
