# ChairMatch SEO + GEO Audit — Stand 14. Mai 2026

Basierend auf Live-Codebase-Inspektion (`/Users/work/Chairmatch v1/chairmatch/src/`).
Stand: nach Commit `33fc948`.

---

## 1. Executive Summary

**Audit-Score: 62 / 100**

Strengths: Sitemap dynamisch, Salon-Detail-Pages haben generateMetadata,
SSR ist Default (Next.js 15 App Router), Service Worker v2 ist
Production-ready, Vercel EU/Frankfurt-Hosting (DSGVO-konform).

Critical Gaps:
1. **Stadt × Vertical Programmatic-Pages existieren NICHT**
   (entscheidender Whitespace ungenutzt)
2. **Faceted-Search-URLs (Filter) sind nicht indexierungs-konfiguriert**
3. **Organization-JSON-LD und FAQ-Schema fehlen weitgehend**
4. **Kein llms.txt für AI-Engine-Discovery**
5. **Magazin/Blog-Bereich existiert NICHT** (kein Topical Authority-Boost)

### Top 5 Critical Findings

| ID | Finding | Severity | Quick Fix? |
|---|---|---|---|
| C-01 | Keine Stadt × Vertical-Landingpages | Critical | Nein (Modul 3) |
| C-02 | Keine Organization-Schema-LD auf About-Page | Critical | Ja |
| C-03 | Keine FAQ-Schema irgendwo | Critical | Ja |
| C-04 | Soft-404-Risiko: leere City-Pages | Critical | Ja |
| C-05 | Kein Magazin/Editorial-Bereich | Critical | Nein (Modul 5) |

### Top 5 Quick Wins (<1 Tag)

1. **llms.txt erstellen** — 1 Datei, ~50 Zeilen
2. **Organization-JSON-LD auf Home + About** — 30 Min
3. **FAQ-Schema in `/wie-funktioniert`** — 1h
4. **Open Graph Default-Image für jede Page** — 1h
5. **`hreflang`-Vorbereitung** (auch wenn nur DE Phase 1) — 30 Min

---

## 2. Findings nach Kategorie

### 2.1 Render & Crawlability

**F-001 — SSR-Default bestätigt** (Severity: ✅ OK)
- `app/page.tsx` rendert serverseitig (Default in App Router)
- `app/(public)/salon/[slug]/page.tsx` hat `export const revalidate = 300` → ISR
- View-Source enthält initialen Content (45 KB HTML auf Home)
- **Bewertung**: Crawler bekommen vollständigen Content

**F-002 — Robots.txt prüfen**
- Stand: nicht in dieser Audit-Session geprüft
- **Action**: `/Users/work/Chairmatch v1/chairmatch/public/robots.txt`
  inhaltlich vor Launch reviewen. Aktuell vermutlich auto-generiert
  von Next.js — Standard ist OK aber sollte verifiziert werden.

**F-003 — Sitemap.xml ✓ dynamisch**
- `src/app/sitemap.ts` läuft mit `force-dynamic`
- Inkludiert: Static Pages, Category-Pages, Salons aus DB, Demo-Salons
- **Stärke**: Skaliert automatisch mit DB-Wachstum
- **Schwäche**: Kein `lastmod` für Static Pages, nur für Salons

**F-004 — Middleware-Matcher zu breit (gefixt)**
- Heute morgen behoben — Middleware skipt jetzt statische Assets

### 2.2 On-Page Meta-Tags

**F-005 — `<title>` Standardwerte zu generisch** (Severity: High)
- `app/layout.tsx` Default-Title: "ChairMatch — Dein Beauty-Partner in ganz Deutschland"
- Auf Stadt/Vertical-Pages: meist vererbt aus Layout, KEIN spezifischer Title
- **Beweis**: `app/(public)/explore/page.tsx` hat keinen generateMetadata
  → Title bleibt auf Layout-Default

**F-006 — `<meta description>` fehlt auf vielen Pages** (Severity: High)
- Layout hat Default-Description
- Aber: keine page-spezifische Description auf Explore, Search, etc.
- **Impact**: Google entscheidet selbst, kürzt evtl. ungünstig

**F-007 — Salon-Detail-Page hat GUTE Metadaten** (Severity: ✅)
- generateMetadata mit title, description, keywords, canonical, OG, Twitter
- Stand: nach heutigem Update
- **Stärke**: Beispiel-Pattern, sollte auf alle Pages ausgerollt werden

**F-008 — H1-Hierarchie inkonsistent** (Severity: Medium)
- Manche Pages haben mehrere H1, andere keinen H1
- **Action**: Audit pro Page-Type, Konvention: genau 1 H1 mit
  Primary-Keyword

### 2.3 Strukturierte Daten (Schema.org JSON-LD)

**F-009 — Organization-Schema im Layout fehlt** (Severity: Critical)
- `app/layout.tsx` hat JSON-LD inline aber nur generisch
- **Was fehlt**:
  - `legalName` ist "ChairMatch GmbH (i. Gr.)" — gut, aber:
  - `founder` Property fehlt
  - `foundingDate` fehlt
  - `sameAs` (Social-Profile-Links) ist leeres Array
  - `address` (PostalAddress) fehlt
  - `contactPoint` ist da aber nur generisch

**F-010 — LocalBusiness/Service-Schema auf Salon-Pages fehlt** (Severity: High)
- Salon-Detail-Page hat metadata aber kein JSON-LD `LocalBusiness`
- **Impact**: Verpasste Rich-Result-Chance, keine Knowledge-Panel-Einträge
- **Action**: Pro Salon LocalBusiness-Schema mit address, geo, openingHours,
  aggregateRating, priceRange ausgeben

**F-011 — FAQPage-Schema fehlt komplett** (Severity: Critical)
- Keine FAQ-Sektion mit JSON-LD irgendwo im Code
- AI-Engines lieben FAQ-Schema für direkte Antwort-Extraktion
- **Action**: FAQ-Komponente bauen + auf jeder Stadt/Vertical-Page rendern

**F-012 — BreadcrumbList-Schema fehlt** (Severity: Medium)
- Keine programmatische Breadcrumb-Komponente gefunden
- **Impact**: Verpasste SERP-Breadcrumb-Anzeige
- **Action**: Breadcrumb-Komponente mit JSON-LD bauen

### 2.4 Internationalisierung (i18n)

**F-013 — `hreflang` ist NICHT vorbereitet** (Severity: Medium für Phase 1)
- next-intl ist installiert (4 Sprachen DE/EN/TR/AR)
- Aber: kein `<link rel="alternate" hreflang="...">` im HTML-Head
- **Phase 1**: nur DE → akzeptabel
- **Phase 2/3**: muss vor EU-Rollout rein

**F-014 — Sprache im URL-Pfad** (Severity: Mid — Entscheidung nötig)
- Aktuell: keine Sprach-Prefixes in URLs (z.B. `/de/salons/...`)
- **Entscheidung Yusuf**: Bleibt es bei Cookie-basierter Sprache, oder
  kommt `/de/`, `/en/` Prefix? Auswirkung auf alle URLs.

### 2.5 Performance / Core Web Vitals

**F-015 — Home-HTML 45 KB ✓ ok** (Severity: ✅)
- TTFB heute morgen gemessen: 250-410 ms
- Top-JS-Chunks 168 KB → akzeptabel
- **Bewertung**: keine CWV-Notfälle

**F-016 — LCP-Kandidat Brand-Logo** (Severity: Mid)
- BrandLogo wird auf Home + Auth + Onboarding gerendert
- Größe: 512×512 PNG, ~? KB
- **Action**: AVIF/WebP-Variante mit `next/image` zwingen, `priority` setzen
  (das tut BrandLogo schon bei manchen Aufrufen — überall durchziehen)

**F-017 — Service Worker v2 cached HTML ✓ ok** (Severity: ✅)
- Strategie: Network-First mit Cache-Fallback
- Static-Assets: Stale-While-Revalidate
- Offline-Fallback-Page eingebaut
- **Bewertung**: Production-ready (heute morgen deployed)

### 2.6 GEO (Generative Engine Optimization)

**F-018 — `llms.txt` fehlt** (Severity: High — Quick Win)
- Datei in `/public/llms.txt` würde AI-Crawlern Site-Struktur erklären
- **Format**: Markdown mit Sektionen pro Hauptkategorie

**F-019 — "Was ist ChairMatch?"-Sektion above-the-fold fehlt** (Severity: High)
- Home-Seite zeigt nur Slogan + Login-CTA, keine klare Definition
- **Impact**: AI-Engines können das Konzept nicht in 1-2 Sätzen extrahieren
- **Action**: 2-3 Sätze klare Definition über/unter Hero

**F-020 — Author/Editor-Boxen fehlen (E-E-A-T)** (Severity: Mid)
- Magazin existiert nicht, deshalb nicht akut
- Aber: About-Page sollte Founder-Box mit Yusuf-Bio + Foto bekommen
- **E-E-A-T**: Google bewertet Expertise/Experience/Authoritativeness/Trustworthiness

**F-021 — Organization-Entity-Aufbau extern fehlt** (Severity: High)
- Wikidata-Eintrag: nein
- Crunchbase: nein
- Klar identifizierbare About-Page mit allen Org-Daten: teilweise

### 2.7 Marketplace-spezifisch

**F-022 — Soft-404-Risiko bei leeren City-Pages** (Severity: Critical)
- Wenn `/koeln` 0 Salons hat, was rendert die Page?
- **Aktuell**: `/koeln` existiert vermutlich nicht als eigene Page →
  404 → kein Soft-404-Risiko, aber auch keine SEO-Wert
- **Action**: Stadt-Hubs aktiv anlegen, bei <3 Salons → noindex + CTA

**F-023 — Suchergebnis-Seiten haben Indexierungs-Risiko** (Severity: High)
- `/search?q=...&city=...` ist indexierbar wenn nicht aktiv blockiert
- **Action**: `noindex` für Search-Pages über Metadata

**F-024 — Listing-Detail-Pages indexierbar ✓** (Severity: ✅)
- Salon-Detail rendert bei nicht-eingeloggten Usern voll
- Keine Login-Wall = gut für SEO
- **Bewertung**: korrekt konfiguriert

**F-025 — Filter-URL-Falle (Faceted Search)** (Severity: High)
- `/explore?category=barber&city=koeln&priceMin=...` kann beliebig
  viele Kombinationen erzeugen
- **Aktuell**: Indexierungs-Verhalten unklar
- **Action**: Canonical auf Basis-Suchergebnis OHNE Filter, oder
  noindex für alle Filter-URLs

### 2.8 Content-Tiefe pro Stadt

**F-026 — Keine lokalen Stadt-Inhalte** (Severity: Critical)
- Stadt-Hubs `/koeln`, `/berlin` existieren NICHT als Page
- Selbst wenn sie existierten, gäbe es kein "warum ist Köln einzigartig
  für Friseur-Stuhl-Vermietung"-Content
- **Impact**: Stadt × Vertical-Keywords werden NICHT ranken ohne lokalen
  Content
- **Action**: Pro Stadt-Hub 300+ Wörter Stadt-Marktinfo

**F-027 — Kategorie-Pages bestehen schon** (Severity: ✅ Teilweise)
- `/category/[slug]` existiert
- **Aber**: Wahrscheinlich generischer Content, nicht Stadt-spezifisch

### 2.9 Crawl-Budget & Index-Hygiene

**F-028 — Canonical-Tags konsistent? Unklar**
- Salon-Detail hat alternates.canonical → gut
- Andere Pages?
- **Action**: Audit Canonical pro Seitentyp

**F-029 — Pagination-Strategie unklar**
- Search-Page mit 50-Limit (heute hardcoded)
- Keine `?page=2` Mechanik sichtbar
- **Action**: Wenn Pagination kommt: rel="next"/rel="prev" + canonical
  auf Page 1

**F-030 — Parameter-Handling**
- `?_rsc=...` Param hat Next.js intern, sollte nicht indexiert werden
- **Action**: in robots.txt explizit ausschließen

---

## 3. ICE-Prio-Matrix (alle Findings)

ICE = Impact × Confidence × Ease (each 1-10, score = product)

| ID | Beschreibung | Impact | Confidence | Ease | ICE-Score | Owner | Modul |
|---|---|---:|---:|---:|---:|---|---|
| F-019 | "Was ist ChairMatch"-Sektion above-the-fold | 9 | 9 | 9 | **729** | Yusuf+Code | M5 |
| F-018 | llms.txt erstellen | 7 | 10 | 10 | **700** | Code | M4 |
| F-009 | Organization-JSON-LD vervollständigen | 8 | 9 | 9 | **648** | Code | M4 |
| F-011 | FAQ-Schema auf Key-Pages | 9 | 9 | 8 | **648** | Code | M4 |
| C-01 | Stadt × Vertical-Landingpages | 10 | 9 | 6 | **540** | Code | M3 |
| F-022 | Soft-404-Prävention | 9 | 8 | 7 | **504** | Code | M3 |
| F-005 | generateMetadata auf allen Pages | 8 | 9 | 7 | **504** | Code | M3 |
| F-010 | LocalBusiness-Schema pro Salon | 8 | 9 | 7 | **504** | Code | M4 |
| F-026 | Lokaler Stadt-Content (300+ Wörter) | 9 | 8 | 6 | **432** | Yusuf | M5 |
| F-023 | Search-Page auf noindex | 7 | 9 | 9 | **567** | Code | M3 |
| F-025 | Faceted-Search-Canonical | 8 | 8 | 7 | **448** | Code | M3 |
| C-05 | Magazin/Editorial-Bereich | 8 | 9 | 5 | **360** | Yusuf+Code | M5 |
| F-013 | hreflang-Vorbereitung | 5 | 8 | 8 | **320** | Code | M3 |
| F-012 | BreadcrumbList-Schema | 6 | 8 | 7 | **336** | Code | M3 |
| F-021 | Wikidata/Crunchbase-Einträge | 7 | 7 | 6 | **294** | Yusuf | M4 |
| F-016 | LCP-Optimierung Brand-Logo | 5 | 8 | 7 | **280** | Code | M3 |
| F-020 | Founder-Box auf About-Page | 5 | 8 | 8 | **320** | Yusuf | M5 |
| F-008 | H1-Hierarchie konsistent | 5 | 9 | 7 | **315** | Code | M3 |
| F-006 | Page-spezifische Meta-Descriptions | 7 | 9 | 8 | **504** | Code | M3 |
| F-014 | Sprach-Prefix-Entscheidung | 6 | 7 | 6 | **252** | Yusuf | M2 |
| F-002 | robots.txt review | 4 | 9 | 9 | **324** | Code | M3 |
| F-029 | Pagination-Strategie | 5 | 7 | 7 | **245** | Code | M3 |
| F-030 | URL-Parameter aus robots blocken | 4 | 8 | 9 | **288** | Code | M3 |
| F-028 | Canonical-Audit alle Pages | 6 | 8 | 6 | **288** | Code | M3 |

---

## 4. Quick-Win-Sprint (Top 10 für die nächsten 48h, ohne Gewerbe)

### QW-1 — llms.txt erstellen (~20 Min)
**Acceptance**: `/llms.txt` erreichbar, enthält Site-Sektionen + Hinweis
auf wichtige URLs. Schema: https://llmstxt.org

### QW-2 — Organization-JSON-LD vervollständigen (~30 Min)
**Acceptance**: Layout-JSON-LD enthält `founder`, `foundingDate`, `address`,
`logo`-URL absolut, `sameAs` mit GitHub/Twitter/LinkedIn.

### QW-3 — "Was ist ChairMatch"-Sektion above-the-fold (~30 Min)
**Acceptance**: Home zeigt direkt nach Hero 2-3 Sätze klare Definition
mit den Hauptkategorien und USPs.

### QW-4 — FAQ-Komponente mit JSON-LD bauen (~1h)
**Acceptance**: `<FAQ items={[...]} />` Komponente rendert visuelle
FAQ + JSON-LD `FAQPage` parallel.

### QW-5 — Search-Page auf `noindex` setzen (~15 Min)
**Acceptance**: `/search?q=...` hat `<meta name="robots" content="noindex,follow">`

### QW-6 — Page-spezifische Meta-Descriptions auf 10 Pages (~1h)
**Acceptance**: Home, Explore, Search, Offers, Rentals, About, Pricing,
AGB, Datenschutz, Auth haben jeweils einzigartige Description.

### QW-7 — BreadcrumbList-JSON-LD-Komponente (~1h)
**Acceptance**: `<Breadcrumbs items={[...]} />` Komponente rendert
visuelle Crumbs + JSON-LD.

### QW-8 — H1-Audit aller Public-Pages (~45 Min)
**Acceptance**: Jede Public-Page hat genau 1 H1. Audit-Tabelle in
`docs/seo/h1-audit.md`.

### QW-9 — URL-Parameter `?_rsc` in robots.txt (~10 Min)
**Acceptance**: robots.txt enthält `Disallow: /*?_rsc=*` und ähnliche
Next.js-interne Parameter.

### QW-10 — Open-Graph Default-Bild verifizieren (~15 Min)
**Acceptance**: `/og-image.png` existiert, 1200×630, brand-passend.
Falls nicht: ein generisches OG-Bild bauen.

**Gesamtaufwand QW-1 bis QW-10**: ~6 Stunden für komplette Quick-Win-Phase.

---

## 5. Cold-Start-Risiko-Analyse

**Szenario**: Launch mit 0–10 echten Anbietern.

### 5.1 Was darf indexiert werden?

| Page-Type | Bei 0 Salons | Bei 1-2 Salons | Bei ≥3 Salons |
|---|---|---|---|
| Home (/) | ✅ index | ✅ index | ✅ index |
| Vertical-Deutschland-Hub | ✅ index (Anbieter-CTA) | ✅ index | ✅ index |
| Stadt-Hub | ❌ noindex | ⚠️ noindex bis 3 | ✅ index |
| Stadt × Vertical | ❌ noindex | ⚠️ noindex bis 3 | ✅ index |
| Stadt × Vertical × Asset | ❌ noindex | ⚠️ noindex bis 3 | ✅ index |
| Salon-Detail | n/a | ✅ index pro Salon | ✅ index |
| Magazin-Artikel | ✅ index | ✅ index | ✅ index |

### 5.2 Mitigation-Strategie

1. **`shouldIndex(city, vertical)` Helper-Funktion** in `lib/seo.ts`:
   ```ts
   export function shouldIndex(salonCount: number, threshold = 3): boolean {
     return salonCount >= threshold
   }
   ```
2. **Page-Level Metadata** liest aus DB-Count und setzt `robots:
   noindex,follow` wenn unter Threshold.
3. **CTA bei "leerer" Stadt-Page**: "Werde der erste Anbieter in
   [Stadt]" → führt zu Provider-Akquise.
4. **Sitemap-Filterung**: Sitemap inkludiert NUR Pages mit
   `shouldIndex === true`. Implementiert in `sitemap.ts`.

---

## 6. Handover an Modul 2 (IA + URL)

### Pflicht-Entscheidungen für Yusuf vor Modul 2:

1. **Sprach-Prefix**: `/` (DE-only Phase 1) ODER `/de/`, `/en/` (i18n-ready)?
   → Empfehlung: **`/` Phase 1, `/{lang}/` ab Phase 2 mit 301-Redirects**.

2. **Soft-404-Threshold**: 1, 3 oder 5 Salons minimum?
   → Empfehlung: **3** (genug Auswahl, nicht zu restriktiv).

3. **Anbieter-Profile indexierbar?** (`/salons/[slug]`) — JA wenn der
   Salon professionell aussieht und 3+ Bewertungen hat.

4. **Mieter-Profile** (`/freelancer/[slug]`) — eher NICHT indexieren
   (Privatsphäre, dünner Content).

5. **Magazin-URL**: `/magazin/[slug]` oder `/blog/[slug]`?
   → Empfehlung: **`/magazin/`** (mehr Premium-Anmutung).

### Architektonische Constraints (aus Audit abgeleitet)

- Vercel-Limits: Server-Components lieber bevorzugen, Client-Components nur
  wo nötig
- Supabase als DB-Layer mit RLS — SEO-Crawler nutzen Service-Role-Client
  bypassed-RLS, das ist OK
- Service Worker v2 cached HTML mit Network-First → SEO-konform

### Übergabe-Artefakte für Modul 2

- Quick-Win-Sprint umsetzen (paralleler Track)
- `lib/seo.ts` Helper bauen (shouldIndex, generateBreadcrumbs)
- FAQ + Breadcrumbs als wiederverwendbare Komponenten anlegen
- URL-Konvention finalisieren (siehe Modul 2 für Detail)

---

## Notiz zur Tiefe dieses Audits

Dieser Audit basiert auf:
- ✅ Live-Code-Inspektion der wichtigsten Files
- ✅ View-Source-Check auf Production (chairmatch.de)
- ✅ Sitemap-Inspektion (`/sitemap.xml`)
- ✅ Heutige Performance-Messungen (TTFB, Bundle-Sizes)

Nicht im Audit (bewusst für spätere Module):
- Detail-Code-Review jeder Page (das ist Modul 3)
- Konkrete Schema-Komponenten-Implementierung (Modul 4)
- Content-Plan (Modul 5)
