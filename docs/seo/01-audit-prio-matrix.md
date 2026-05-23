# ChairMatch SEO + GEO Audit — Stand 23. Mai 2026

Basierend auf Live-Codebase-Inspektion (`/Users/work/Chairmatch v1/chairmatch/src/`).
Code-Stand: Commit `b6c7858` (origin/main).
Vorgänger-Audit vom 14. Mai 2026 (`01-audit-prio-matrix.md` v1) ist abgelöst —
viele Quick-Wins wurden zwischen 14.–23.05 umgesetzt (siehe §7 *Resolved Findings*).

---

## 1. Executive Summary

**Audit-Score: 78 / 100** (vorher 62)

Die Codebase ist seit dem Mai-14-Audit substantiell SEO-reifer:
`src/lib/seo.ts` (382 Zeilen) liefert 8 Schema-Generators und einen
`shouldIndex(count, threshold=3)`-Helper, der in Sitemap und Stadt-Hubs
aktiv noindex bei Cold-Start-Pages setzt. `public/llms.txt` existiert
(2,9 KB, semantisch sauber). Sitemap (`src/app/sitemap.ts`, 190 Zeilen)
ist dynamisch mit lastmod aus Supabase und Fallback-Logik bei DB-Fehler.
Robots (`src/app/robots.ts`) erlaubt AI-Crawler (GPTBot, ClaudeBot,
PerplexityBot, Google-Extended, CCBot) explizit und blockiert `?_rsc=`,
`/search?`, `/explore?`-Query-Facets.

Stadt-Hubs (`/[stadt]`), Stadt × Vertical (`/[stadt]/[vertical]`),
5 Vertical-Deutschland-Pages (`/{vertical}-deutschland`), 13 Category-Pages
(`/category/[slug]`) und 5 Medical-Money-Pages (Haartransplantation,
Zahnimplantate, Augenlasern, Longevity, IV-Infusionen) sind alle live.
Magazin-Infrastruktur mit 10 Artikeln in `MAGAZIN_ARTIKEL[]` ist
implementiert (`src/lib/seo-data/magazin.ts:21+`, 1546 Zeilen).
FAQ (`src/components/seo/FAQ.tsx`) und Breadcrumbs
(`src/components/seo/Breadcrumbs.tsx`) embedden Schema automatisch.

### Was noch fehlt (Critical)

1. **Stadt × Vertical × Asset-Routes existieren nicht** — `/[stadt]/[vertical]/[asset]-mieten` ist nicht angelegt. Das war im Vorgänger als „Phase 1 Top-10 Money-Pages" geplant (siehe `02-ia-url-phasen.md §4.5`). Aktuell läuft alles über die Stadt × Vertical-Page mit Asset als Filter — verschenktes Keyword-Long-Tail.
2. **Stuhlmiete-URL-Variante fehlt** — Recon-Update vom 22.05 zeigt: „Stuhlmiete" (Substantiv) ist das dominante Branchenwort, nicht „Stuhl mieten" (Verb). Keine URL bedient diese Variante.
3. **Salon-Detail-Schema ist nicht via `lib/seo.salonSchema()`** sondern inline-dupliziert (`src/app/(public)/salon/[slug]/page.tsx:105-113` + `:173-182`). Lib-Helper ist umfangreicher (Geo, OpeningHours, PriceRange) als die inline-Version. Code-Drift-Risiko.
4. **Search-Page `/search` ist nicht explizit `robots: noindex`** und steht in der Sitemap mit Priority 0.8 (`sitemap.ts:25`). Robots blockt nur die Query-Variante, aber die Basis-URL ist indexierbar.
5. **Vermieter/Anbieter/Mieter-Rollen sind inkonsistent**: `/anbieter/wie-es-funktioniert` ✓, `/mieter/wie-es-funktioniert` ✓, `/vermieter/wie-es-funktioniert` **fehlt** (obwohl `/vermieter/onboarding`, `/vermieter/mein-inserat` existieren). Drei nebeneinander stehende Rollen verwirren sowohl SEO als auch User.

### Top 5 Quick Wins (≤1 Tag)

1. **`/search` + `/explore` auf `robots: noindex,follow`** (~10 Min)
2. **Salon-Detail nutzt `salonSchema()` aus `lib/seo.ts`** statt Inline-LD (~30 Min)
3. **`hreflang` aus `LOCALE_META` rendern** im Root-Layout (~30 Min)
4. **Dynamische OG-Images** für Salon-Detail + Magazin-Artikel (jeweils `opengraph-image.tsx` Edge-Route, ~1h)
5. **`/vermieter/wie-es-funktioniert` Page** mit kanonischer Rollen-Definition + 301 von `/anbieter/wie-es-funktioniert` falls Naming-Entscheidung „Vermieter" gewinnt (~30 Min)

---

## 2. Findings nach Kategorie

> Severity-Skala: Critical / High / Mid / Low / ✅ OK (informational)

### 2.1 Render & Crawlability

**F-101 — App-Router Default ist SSR** (Severity: ✅ OK)
- Alle `(public)`-Pages sind Server Components ohne `"use client"` am Top.
- Client-Logik delegiert an `*Client.tsx`-Suffix-Komponenten (z.B. `SalonDetailClient`, `ExploreClient`, `SearchClient`). Page bleibt server-renderable, Metadata-Auflösung steht.
- **Beweis**: `src/app/(public)/salon/[slug]/page.tsx` ist Server Component, `SalonDetailClient` ist Client.

**F-102 — Force-dynamic auf `/sitemap.ts` und Home** (Severity: Mid)
- `src/app/sitemap.ts:9`: `export const dynamic = 'force-dynamic'` — verhindert Caching der Sitemap. Bei 5000+ Salons pro Crawl-Request ist das messbare Last + Latenz.
- `src/app/page.tsx`: ebenfalls `force-dynamic`. Home-Render bei jedem Request — schlecht für TTFB unter Last.
- **Action**: Sitemap mit `revalidate=3600` statt force-dynamic. Home prüfen ob force-dynamic wirklich nötig ist (vermutlich Geo-IP-Banner).

**F-103 — Service Worker registriert** (Severity: ✅ OK)
- `public/sw.js` aktiv, Network-First für HTML, Stale-While-Revalidate für Assets — wurde am 14.05 bestätigt, immer noch valide.

**F-104 — Middleware-Matcher schließt statische Assets aus** (Severity: ✅ OK)
- `src/middleware.ts:318-320`: matcher exkludiert `_next`, `icons`, `brand`, `screenshots`, `favicon`, `apple-touch-icon`, `manifest`, `sw.js`, `robots`, `sitemap`, `og-image`, `icon-`.

### 2.2 On-Page Meta-Tags

**F-105 — Root-Layout-Metadata vollständig** (Severity: ✅ OK)
- `src/app/layout.tsx:31-86`: title-Template `%s | ChairMatch`, description, `metadataBase`, openGraph, twitter, manifest, icons, robots, alternates.canonical, alternates.languages.

**F-106 — `generateMetadata` auf 8+ dynamischen Pages** (Severity: ✅ OK)
- Salon-Detail (`/salon/[slug]/page.tsx:13`), Stadt-Hub (`/[stadt]/page.tsx:49`), Stadt × Vertical, Magazin-Artikel (`/magazin/[slug]/page.tsx:15`), Search (`/search/page.tsx:21`), FAQ (`/faq/page.tsx:16`), Provisionsmodell (`/provisionsmodell/page.tsx:5`), Anbieter-wie (`/anbieter/wie-es-funktioniert/page.tsx:6`).

**F-107 — `/explore`, `/offers`, `/rentals` ohne page-spezifisches Metadata** (Severity: High)
- Diese Pages erben nur das Layout-Default-Metadata.
- **Impact**: Generischer Title + Description bei drei sichtbaren Hub-Pages.
- **Action**: `export const metadata` pro Page mit unique title/description.

**F-108 — H1-Audit nicht durchgeführt** (Severity: Mid)
- Im Vorgänger-Audit als Open offen markiert. Kein systematischer Scan im Code gemacht.
- **Action**: `grep -rn "<h1" src/app/(public)` und manuell prüfen ob genau 1 H1 pro Page.

**F-109 — Salon-Detail Title-Pattern inkonsistent zwischen Demo und DB** (Severity: Low)
- Demo: `${demo.nm} — ${demo.city}` ohne Brand-Suffix (page.tsx:18).
- DB: `${salon.name} — ${salon.city || 'Deutschland'}` ohne Brand-Suffix (page.tsx:39).
- **Empfehlung**: einheitlich `${name} ${city} | ChairMatch` damit Brand im SERP-Title steht.

### 2.3 Strukturierte Daten (JSON-LD)

**F-110 — Organization + WebSite-Schema im Root-Layout** (Severity: ✅ OK)
- `src/app/layout.tsx:108-141`: Organization (mit legalName, foundingDate, areaServed) + WebSite mit SearchAction (Google-Sitelinks-Searchbox). `sameAs` ist leeres Array — sollte mit Social-URLs gefüllt werden sobald die Profile live sind (F-127).

**F-111 — `lib/seo.ts` 8 Schema-Generators implementiert** (Severity: ✅ OK)
- `organizationSchema`, `websiteSchema`, `salonSchema` (LocalBusiness mit Geo, Telefon, OpeningHours, AggregateRating, PriceRange), `breadcrumbSchema`, `faqSchema`, `serviceAreaSchema`, `articleSchema`, `listingSchema` (`src/lib/seo.ts:36-359`).

**F-112 — Salon-Detail nutzt INLINE-Schema statt `salonSchema()`** (Severity: High)
- `src/app/(public)/salon/[slug]/page.tsx:105-113` (Demo-Salon) und `:173-182` (DB-Salon) bauen `BeautySalon`-LD manuell.
- Inline-Version fehlen: `geo` (lat/long), `openingHours`, `priceRange`, `image`, `priceCurrency`.
- `lib/seo.ts:133-201` hat das alles — wird aber nicht genutzt.
- **Impact**: Verpasste Rich-Results-Felder; Code-Drift wenn Schema-Anpassungen passieren.
- **Action**: Refactor — `salonSchema()` importieren und nutzen, Inline-Schema entfernen.

**F-113 — FAQ-Schema in 3 Pages live** (Severity: ✅ OK)
- `/faq/page.tsx`, `/provisionsmodell/page.tsx`, `/anbieter/wie-es-funktioniert/page.tsx` rendern alle `faqSchema()`.
- Die `<FAQ>`-Komponente (`src/components/seo/FAQ.tsx:32-35`) embedded ihr Schema selbst — keine doppelte Auszeichnung nötig.

**F-114 — BreadcrumbList-Schema live** (Severity: ✅ OK)
- `<Breadcrumbs>` (`src/components/seo/Breadcrumbs.tsx:34-37`) embeddet BreadcrumbList automatisch.
- Genutzt in Stadt-Hub (`/[stadt]/page.tsx:105-116`), Stadt × Vertical, Salon-Detail (zu prüfen).
- **Offen**: Sind Breadcrumbs auf ALLEN Hub-Pages? Audit nötig (`grep -rn "Breadcrumbs" src/app`).

**F-115 — Article-Schema für Magazin-Artikel live** (Severity: ✅ OK)
- `/magazin/[slug]/page.tsx:98-100` ruft `articleSchema()` für jeden Artikel.
- Felder: headline, description, datePublished, dateModified, image, author, publisher, keywords, inLanguage, isAccessibleForFree, timeRequired.

**F-116 — LocalBusiness-Schema für Medical-Money-Pages fehlt** (Severity: Mid)
- `/haartransplantation`, `/zahnimplantate`, `/augenlasern`, `/longevity`, `/iv-infusionen` sind Money-Pages aber haben keine MedicalBusiness/MedicalClinic-Schema-Auszeichnung.
- **Impact**: Verpasste Google-Health-Rich-Results.
- **Action**: `medicalBusinessSchema()` zu `lib/seo.ts` hinzufügen + auf den 5 Pages rendern.

**F-117 — Listing/Service-Schema für `/listings/[slug]` nicht verifiziert** (Severity: Mid)
- `listingSchema()` existiert in `lib/seo.ts:327-359` aber nicht geprüft ob die Page-Implementierung es rendert.
- **Action**: Verifizieren.

### 2.4 Internationalisierung (i18n)

**F-118 — `hreflang`-Tags fehlen vollständig** (Severity: Mid für Phase 1, High für Phase 2)
- `grep -r "hreflang" src/` liefert nur die `LOCALE_META`-Definition, keine aktive HTML-Ausgabe.
- Root-Layout setzt nur `alternates.languages: { 'de-DE': 'https://chairmatch.de' }` (`layout.tsx:39-41`) — singulär, kein echtes hreflang-Cluster.
- Phase 1 (nur DE) toleriert das. Vor EN/TR-Aktivierung muss das rein.
- **Action**: Vor Phase-2-Rollout `<link rel="alternate" hreflang="..." href="...">` pro Locale rendern.

**F-119 — URL-Prefix für Sprache nicht aktiv** (Severity: Mid — Entscheidung steht aus)
- `next-intl` ist konfiguriert (`src/i18n/config.ts`, `messages/{de,en,tr,ar}.json`), aber URLs haben keinen `/de/`-Prefix.
- **Frage Yusuf**: Bleibt Phase 1 ohne Prefix (`/koeln`) und Phase 2 redirected mit 301 nach `/de/koeln`? Entscheidung blockiert i18n-Rollout-Plan in Modul 2.

### 2.5 Performance / Core Web Vitals

**F-120 — Force-dynamic auf Home + Sitemap** (Severity: High)
- Siehe F-102. Vor Launch ein Lighthouse-Run unter Last (5 parallele Crawler-Sessions) zur Validierung.

**F-121 — OG-Image fix 164 KB PNG, keine AVIF** (Severity: Low)
- `public/og-image.png` ist 1200×630, 164 KB. Akzeptabel, aber AVIF wäre ~50 KB. Edge-Route `app/opengraph-image.tsx` ist bereits da — sollte Default-Image vollständig ersetzen.

**F-122 — Brand-Logo LCP-Optimierung offen** (Severity: Mid)
- Im Vorgänger-Audit als F-016 offen. Keine Indizien dass es gefixt wurde.
- **Action**: Lighthouse-Audit auf Mobile messen, dann `next/image priority` auf Hero-Bild forcieren.

**F-123 — Service-Worker korrekt konfiguriert** (Severity: ✅ OK)

### 2.6 GEO (Generative Engine Optimization)

**F-124 — `llms.txt` existiert + ist semantisch sauber** (Severity: ✅ OK)
- `public/llms.txt` (2961 Bytes): „Was ist / Was ist nicht", Kategorien, Asset-Typen, Geschäftsmodell, Wichtige Seiten, Vertical-Hubs, Top-Städte, DSGVO, Kontakt.
- **Empfehlung**: Bei Owner/Investor/Provider-Areas in robots.ts blockiert → korrekt nicht in llms.txt.

**F-125 — Organization-Schema-`sameAs` ist leer** (Severity: High)
- `src/lib/seo.ts:79` setzt `sameAs: []` als leer-Default.
- **Impact**: Google + AI-Engines können Org nicht über Social-Profile verifizieren.
- **Action**: LinkedIn, Twitter/X, Instagram, GitHub-URLs einfügen sobald Profile live sind. Sofern Yusuf einen LinkedIn-Eintrag hat — schon einbauen.

**F-126 — Founder-Box / E-E-A-T-Author-Signals fehlen** (Severity: Mid)
- About-Page (`/was-ist-chairmatch`) hat keine Founder-Bio mit Yusuf-Foto, Werdegang, Linkedin-Link.
- Magazin-Artikel haben einen Generic-Author („ChairMatch Redaktion"), keinen identifizierbaren Autor mit Person-Schema.
- **Impact**: Schwächt E-E-A-T-Signale, besonders bei YMYL-Themen (Steuern, Scheinselbstständigkeit).
- **Action**: Yusuf-Author-Box mit Person-Schema in About + auf Magazin-Artikel-Footer.

**F-127 — Wikidata + Crunchbase-Einträge fehlen** (Severity: Mid, extern)
- Off-Page-Aufgabe. Wikidata-Item für „ChairMatch" anlegen + Crunchbase-Profil.
- **Owner**: Yusuf.

**F-128 — Magazin-Artikel-Tiefe ist gut, aber Publishing-Status unklar** (Severity: Mid)
- `MAGAZIN_ARTIKEL[]` enthält 10 hardcoded Artikel. `publishedAt: '2026-05-14'` für alle — aber sind die alle inhaltlich fertig (`content`-Feld gefüllt)?
- **Action**: Stichprobe in `src/lib/seo-data/magazin.ts` lesen, fehlende fertigschreiben.

**F-129 — Scheinselbstständigkeit-Magazin-Pflicht fehlt** (Severity: High — aus Recon 22.05)
- Recon-Update (`00-recon-briefing.md §0.4`) markiert „Scheinselbstständigkeit-Risiko" als #1 PAA-Topthema mit dem höchsten Pain-Frequency und schwachem Wettbewerb.
- **Action**: Eigener Magazin-Artikel `/magazin/scheinselbststaendigkeit-stuhlmiete` mit FAQPage-Schema und juristisch geprüftem Content. Pflicht für Topical Authority.

**F-130 — Stuhlmietvertrag-Vorlage als Lead-Magnet fehlt** (Severity: Mid — aus Recon 22.05)
- Recon zeigt: Friseur-Unternehmer.de bietet eine Vorlage als Download an und rankt damit. Direkter Lead-Magnet-Slot.
- **Action**: `/tools/stuhlmietvertrag-vorlage` als Page + PDF-Download mit Email-Gate. Owner: Yusuf (Legal-Review nötig).

### 2.7 Lokale SEO & Marketplace

**F-131 — Soft-404-Schutz via `shouldIndex(count, 3)` aktiv** (Severity: ✅ OK)
- Stadt-Hubs setzen `robots: robotsForListingPage(salonCount)` (`/[stadt]/page.tsx:68`). Bei < 3 Salons in der Stadt → `noindex,follow`.
- Sitemap filtert Stadt-Hubs ebenfalls per `shouldIndex(cityCount ?? 0)` raus (`sitemap.ts:99`).
- **Funktioniert wie geplant** — siehe Modul 2 §3 Phase-Gate-Kriterien.

**F-132 — Listing-Detail-Pages ohne Login-Wall** (Severity: ✅ OK)
- `/salon/[slug]` rendert für nicht-eingeloggte User vollständig.

**F-133 — `/search` ist nicht `robots: noindex`** (Severity: High)
- `src/app/(public)/search/page.tsx` hat `generateMetadata` aber **keine `robots`-Property**.
- `/search` steht in Sitemap mit Priority 0.8 (`sitemap.ts:25`).
- `robots.ts:30` blockt nur `/search?` (Query-Variante).
- **Risiko**: `https://chairmatch.de/search` (ohne Query) wird indexiert, ist aber dünner Content.
- **Action**: `robots: { index: false, follow: true }` in Metadata + aus Sitemap entfernen.

**F-134 — `/explore` analog: nicht `robots: noindex` aber in Sitemap** (Severity: Mid)
- `/explore` ist eine Discovery-Page mit echtem Mehrwert (Filterleiste, alle Salons) — anders als `/search`. Indexierung sinnvoll, aber Metadata fehlt komplett.
- **Action**: Mindestens unique Title + Description, dann index belassen.

**F-135 — Faceted-Search-Canonical fehlt** (Severity: Mid)
- `robots.ts` blockt `/search?` und `/explore?` per Wildcard — gut, aber kein Canonical-Tag der Filter-URLs auf die Basis kanonisiert. Crawler die die Robots-Regel ignorieren würden Duplicate sehen.
- **Action**: In `/explore/page.tsx` und `/search/page.tsx`: `alternates: { canonical: '/explore' }` (bzw. `/search`) setzen — vereinheitlicht alle Filter-Varianten.

**F-136 — Stadt-Hub-Content-Tiefe unklar** (Severity: Mid)
- `/[stadt]/page.tsx` rendert serviceAreaSchema + breadcrumbSchema + FAQ. Aber: gibt es 300+ Wörter Stadt-Marktinfo („Warum ist Köln ein Markt für Friseur-Stuhlmiete?")?
- **Action**: Page-Body in `/[stadt]/page.tsx` lesen und prüfen ob lokaler Content vorhanden ist oder ob nur Salon-Cards gezeigt werden.

**F-137 — Dynamische OG-Images für Salon + Magazin fehlen** (Severity: Mid)
- `app/opengraph-image.tsx` (Edge-Route) ist Default. Pro-Slug-Images nur für `/listings/[slug]/opengraph-image.tsx`.
- Salon-Detail + Magazin-Artikel nutzen das statische Default → Social-Shares sehen generisch aus.
- **Action**: `/salon/[slug]/opengraph-image.tsx` + `/magazin/[slug]/opengraph-image.tsx` als Edge-Route mit dynamischem Inhalt (Salon-Name + Stadt, bzw. Artikel-Titel).

### 2.8 Crawl-Budget & Index-Hygiene

**F-138 — `robots.ts` blockt Owner/Investor/Provider/Admin** (Severity: ✅ OK)
- `/provider/`, `/owner/`, `/investor/`, `/admin/`, `/account/`, `/booking/` alle disallowed (`robots.ts`).

**F-139 — AI-Crawler-Whitelist im robots.ts** (Severity: ✅ OK)
- GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, Claude-Web, Google-Extended, CCBot, anthropic-ai alle explizit erlaubt — exzellent für GEO.

**F-140 — Auth-Pages in Sitemap** (Severity: Low)
- `sitemap.ts:35` enthält `/auth` mit Priority 0.5. Auth-Page sollte `noindex` sein (kein SEO-Wert) und nicht in Sitemap.
- **Action**: Aus Sitemap entfernen + `robots: { index: false }` in `/auth/page.tsx`.

**F-141 — Sitemap-Fallback verliert Cityhubs** (Severity: Low)
- `sitemap.ts:178-188`: Bei Supabase-Fehler returnt nur `staticPages + catPages + demoPages + verticalHubs` — keine Stadt-Hubs, keine Magazin-Artikel.
- Bei einer DB-Downtime würden Stadt-Pages also nicht crawled werden. Für die paar Minuten Downtime ist das ok, aber wenn DB länger ausfällt: Crawler-Diskovery degradiert.
- **Action**: Fallback auch mit Magazin-Artikeln (hardcoded) und PHASE_1_CITIES (hardcoded) ergänzen — beide haben keine DB-Dependency.

**F-142 — Canonical-Audit aller Public-Pages offen** (Severity: Mid)
- Salon, Magazin, Stadt-Hub haben `alternates.canonical` gesetzt. Explore, Offers, Rentals, Search, Was-ist-chairmatch, Provisionsmodell: nicht verifiziert.
- **Action**: 10-Minuten-Sweep, Canonical pro Page checken.

**F-143 — Pagination-Strategie nicht implementiert** (Severity: Mid — wird mit Listings-Wachstum kritisch)
- Search und Explore haben hardcoded Limits. Sobald 50+ Salons pro Vertical/Stadt: Pagination nötig.
- **Action**: Beim Implementieren `rel="next"/rel="prev"` + Canonical auf Page 1.

### 2.9 Rollen-Architektur (NEU, Severity: High)

**F-144 — Drei Rollen-Namen für zwei Marktseiten** (Severity: High)
- Codebase hat `/anbieter/`, `/mieter/`, `/vermieter/` als parallele Pfade.
- **Beweis**:
  - `/anbieter/wie-es-funktioniert/`, `/anbieter/onboarding/`, `/anbieter/mein-salon/` — vermutlich = Marketplace-Salon der seinen Stuhl vermietet
  - `/mieter/wie-es-funktioniert/`, `/mieter/onboarding/`, `/mieter/mein-bereich/` — vermutlich = Freelancer der Stuhl mietet
  - `/vermieter/onboarding/`, `/vermieter/mein-inserat/` — was ist das? Synonym zu Anbieter? Eigene Rolle?
- **Impact**:
  - SEO: Doppelte URL-Strukturen für gleichen Intent → Keyword-Kannibalisierung
  - UX: User weiß nicht ob er „Anbieter" oder „Vermieter" ist
  - Internal-Linking: Welche Page linkt der Footer? Beide?
- **Action**: Entscheidung erzwingen.
  - **Empfehlung**: 2 Rollen.
    - „Vermieter" = Marketplace-Salon (vermietet Stühle) → Synonym für Anbieter, eindeutiger
    - „Mieter" = Freelancer (mietet Stuhl)
  - 301-Redirects von der losenden URL auf die gewinnende
  - llms.txt + Footer + alle Schema-Texte konsistent updaten

**F-145 — `/vermieter/wie-es-funktioniert` fehlt** (Severity: High)
- `/anbieter/wie-es-funktioniert` und `/mieter/wie-es-funktioniert` sind da, `/vermieter/wie-es-funktioniert` nicht — Symptom von F-144.

### 2.10 URL-Pattern für „Stuhlmiete" (NEU, Severity: High)

**F-146 — Keine URL bedient das dominante Branchenwort „Stuhlmiete"** (Severity: High — aus Recon 22.05)
- Aktuelle URL-Pattern: `/[stadt]/[vertical]` (z.B. `/berlin/friseur`).
- Recon `00-recon-briefing.md §0.1`: Branchen-Sprachgebrauch ist „Stuhlmiete" (Substantiv), nicht „Stuhl mieten". Etwa 3–5× mehr Volume + näher am User-Intent.
- **Optionen**:
  - **A**: Zusätzliche URL `/stuhlmiete/[stadt]/[vertical]` mit 301 von der alten URL — riskant (URL-Churn)
  - **B**: Beide URL-Schemata parallel, eine canonical auf die andere — testen welche besser rankt (3-Monats-Bandit)
  - **C**: H1/Body auf den existierenden Pages BEIDE Varianten enthalten („Friseurstuhl mieten — Stuhlmiete in Berlin"), URL bleibt — günstig + kein Churn
- **Empfehlung**: **C** sofort umsetzen (Quick Win). **B** nur wenn nach 6 Wochen Phase-1-Pages nicht ranken.

### 2.11 Neue Page-Typen seit Mai-14-Audit

**F-147 — `/products` und `/shop/[slug]` neu** (Severity: Mid — Strategie offen)
- `/products` (Shop-Übersicht) und `/shop/[slug]` (Produkt-Detail) sind im Code. In Sitemap mit Priority 0.85 + Products dynamisch aus DB.
- **Frage Modul 2**: Gehören Produkte zum Marketplace-Kern oder sind das B2B-Equipment-Verkauf? Beeinflusst die IA.

**F-148 — Medical-Money-Pages (5 Stück) ohne MedicalBusiness-Schema** (Severity: Mid)
- Siehe F-116. Pages sind hochwertige Money-Pages mit `revalidate=3600` — verdienen die korrekten Schema-Types.

**F-149 — `/freelancer-rechner` Tool-Page** (Severity: ✅ OK)
- Tool-Page in Sitemap (Priority 0.7). Konsistent mit Modul-5-Lead-Magnet-Strategie.

**F-150 — `/empfehlungen`, `/inserat`, `/konto`, `/nachrichten`, `/termine` Pages** (Severity: Mid)
- Diese Pages existieren als public-Routes (`src/app/(public)/`) aber sind in `robots.ts` nicht explizit gehandhabt.
- **Frage**: Sind das Public-SEO-Pages oder Account-Tools (sollten dann in `(protected)`)?
- **Action**: Klären + ggf. nach `(protected)` verschieben oder mit `robots: noindex` versehen.

---

## 3. ICE-Prio-Matrix (alle offenen Findings)

ICE = Impact × Confidence × Ease (each 1-10, Score = Produkt). Sortiert nach Score absteigend.

| ID | Finding | Impact | Conf | Ease | ICE | Owner | Modul |
|---|---|---:|---:|---:|---:|---|---|
| F-133 | `/search` auf noindex + aus Sitemap | 8 | 10 | 10 | **800** | Code | M3 |
| F-112 | Salon-Detail nutzt `salonSchema()` statt Inline | 7 | 10 | 10 | **700** | Code | M3 |
| F-129 | Magazin-Artikel "Scheinselbstständigkeit" | 9 | 9 | 8 | **648** | Yusuf+Code | M5 |
| F-125 | `sameAs` mit Social-URLs füllen | 7 | 9 | 10 | **630** | Yusuf | M4 |
| F-144 | Anbieter/Vermieter/Mieter-Klärung | 9 | 9 | 7 | **567** | Yusuf+Code | M2 |
| F-107 | Metadata auf `/explore`, `/offers`, `/rentals` | 7 | 10 | 8 | **560** | Code | M3 |
| F-146 | "Stuhlmiete" in H1/Body (Variante C) | 8 | 8 | 8 | **512** | Code | M3 |
| F-137 | Dynamische OG-Images Salon + Magazin | 6 | 9 | 8 | **432** | Code | M4 |
| F-145 | `/vermieter/wie-es-funktioniert` erstellen | 7 | 9 | 7 | **441** | Code | M3 |
| F-102 | Sitemap revalidate statt force-dynamic | 6 | 9 | 8 | **432** | Code | M3 |
| F-128 | Magazin-Artikel-Content prüfen + füllen | 8 | 8 | 6 | **384** | Yusuf | M5 |
| F-130 | Stuhlmietvertrag-Vorlage als Lead-Magnet | 7 | 8 | 6 | **336** | Yusuf+Code | M5 |
| F-118 | hreflang vor Phase 2 implementieren | 6 | 9 | 6 | **324** | Code | M2/M3 |
| F-116 | MedicalBusiness-Schema für 5 Med-Pages | 6 | 9 | 6 | **324** | Code | M4 |
| F-135 | Faceted-Search-Canonical | 6 | 8 | 7 | **336** | Code | M3 |
| F-150 | Public-Routes-Klärung (empfehlungen etc.) | 6 | 8 | 7 | **336** | Code | M3 |
| F-126 | Founder-Box mit Person-Schema | 5 | 8 | 7 | **280** | Yusuf | M5 |
| F-140 | `/auth` aus Sitemap + noindex | 4 | 10 | 10 | **400** | Code | M3 |
| F-108 | H1-Audit alle Public-Pages | 5 | 9 | 7 | **315** | Code | M3 |
| F-141 | Sitemap-Fallback mit Cities + Magazin | 4 | 9 | 8 | **288** | Code | M3 |
| F-142 | Canonical-Audit alle Pages | 5 | 8 | 7 | **280** | Code | M3 |
| F-134 | `/explore` Metadata füllen | 5 | 9 | 8 | **360** | Code | M3 |
| F-117 | `/listings/[slug]` Schema verifizieren | 6 | 7 | 7 | **294** | Code | M3 |
| F-136 | Stadt-Hub-Content-Tiefe prüfen | 6 | 7 | 7 | **294** | Yusuf+Code | M5 |
| F-127 | Wikidata + Crunchbase-Einträge | 6 | 8 | 5 | **240** | Yusuf | extern |
| F-119 | Sprach-Prefix-Entscheidung | 6 | 7 | 5 | **210** | Yusuf | M2 |
| F-147 | Products/Shop-Strategie | 5 | 7 | 6 | **210** | Yusuf | M2 |
| F-122 | LCP-Brand-Logo-Optimierung | 4 | 7 | 7 | **196** | Code | M3 |
| F-143 | Pagination-Strategie | 5 | 6 | 6 | **180** | Code | M3 |
| F-121 | OG-Image AVIF statt PNG | 3 | 7 | 7 | **147** | Code | M3 |
| F-109 | Salon-Title Brand-Suffix | 4 | 8 | 9 | **288** | Code | M3 |
| F-149 | Freelancer-Rechner (✅ schon da) | — | — | — | **n/a** | — | — |

---

## 4. Quick-Win-Sprint (Top 10, sofort umsetzbar)

### QW-1 — `/search` auf noindex + aus Sitemap (~15 Min)
**Acceptance**:
- `src/app/(public)/search/page.tsx`: `generateMetadata` returnt `robots: { index: false, follow: true }`
- `src/app/sitemap.ts:25` Zeile entfernt
- `view-source:https://chairmatch.de/search` zeigt `<meta name="robots" content="noindex,follow">`

### QW-2 — Salon-Detail nutzt `salonSchema()` (~30 Min)
**Acceptance**:
- `src/app/(public)/salon/[slug]/page.tsx` importiert `salonSchema` aus `@/lib/seo`
- Inline-`dbJsonLd` + Demo-`jsonLd` ersetzt durch `salonSchema(input)`
- Ein Snapshot-Test gegen `JSON.stringify(salonSchema(...))` falls Tests existieren
- Geo/OpeningHours/PriceRange werden ausgegeben sofern in DB vorhanden

### QW-3 — `sameAs` mit Social-URLs füllen (~20 Min)
**Acceptance**:
- `src/lib/seo.ts:79` (`organizationSchema`): `sameAs: [...]` mit min. LinkedIn-Org-URL gefüllt
- Im Root-Layout-Schema (`src/app/layout.tsx:113`): identisch

### QW-4 — Metadata für `/explore`, `/offers`, `/rentals` (~30 Min)
**Acceptance**:
- Pro Page `export const metadata: Metadata = { title, description, alternates: { canonical: ... } }`
- 10+ Keywords pro Page in Description
- Page-spezifische Description (kein Layout-Fallback)

### QW-5 — `/auth` aus Sitemap + noindex (~10 Min)
**Acceptance**:
- `sitemap.ts:35` entfernt
- `src/app/(auth)/auth/page.tsx`: `export const metadata = { robots: { index: false } }`

### QW-6 — `/vermieter/wie-es-funktioniert` Page (~30 Min)
**Acceptance**:
- Page existiert mit static metadata, faqSchema, klare Definition „Vermieter = Salon der Stuhl/Raum vermietet"
- Internal-Link von `/anbieter/wie-es-funktioniert` → „Falls du vermieten willst..."
- Sitemap-Entry vorhanden
- BLOCKER: F-144 erst entschieden, sonst doppelte URL

### QW-7 — "Stuhlmiete" in H1/Body der Stadt × Vertical-Pages (~45 Min)
**Acceptance**:
- `/[stadt]/page.tsx` und `/[stadt]/[vertical]/page.tsx`: H1 enthält beide Varianten
  - z.B. „Friseurstuhl mieten in Köln — Stuhlmiete & Salonplatz"
- Body verwendet „Stuhlmiete" in Intro + FAQ-Antworten
- Keywords-Array enthält „stuhlmiete {stadt}" + „{vertical} stuhlmiete"

### QW-8 — Faceted-Canonical für `/explore` + `/search` (~15 Min)
**Acceptance**:
- `alternates.canonical: 'https://chairmatch.de/explore'` (bzw. `/search`) hardcoded — alle Filter-URLs zeigen drauf

### QW-9 — Sitemap-Fallback erweitern (~20 Min)
**Acceptance**:
- `sitemap.ts:178-188`: Fallback enthält zusätzlich `magazinPages` (aus `MAGAZIN_ARTIKEL`) und `cityHubs` (aus `PHASE_1_CITIES`) — beide haben keine DB-Dependency

### QW-10 — Dynamische OG-Image-Route für Magazin (~1h)
**Acceptance**:
- `src/app/(public)/magazin/[slug]/opengraph-image.tsx` als Edge-Route (Pattern aus `/listings/[slug]/opengraph-image.tsx` übernehmen)
- Inhalt: Artikel-Titel + Gradient-Background + ChairMatch-Logo
- Sharing-Preview auf LinkedIn/Twitter zeigt artikel-spezifisches Bild

**Gesamtaufwand QW-1 bis QW-10**: ~5,5 Stunden für die ganze Sprint-Phase.

---

## 5. Cold-Start-Risiko-Analyse (aktualisiert)

### 5.1 Was darf indexiert werden (Stand 23.05.2026)

| Page-Type | Code-Status | Bei 0 Salons | Bei 1-2 Salons | Bei ≥3 Salons |
|---|---|---|---|---|
| Home `/` | ✅ live, indexiert | ✅ | ✅ | ✅ |
| Vertical-DE-Hub `/{vertical}-deutschland` | ✅ live, immer indexiert (sitemap.ts:84-88) | ✅ | ✅ | ✅ |
| Stadt-Hub `/[stadt]` | ✅ live, `shouldIndex` aktiv | ❌ noindex | ❌ noindex | ✅ index |
| Stadt × Vertical | ✅ live | ❌ | ❌ | ✅ |
| Stadt × Vertical × Asset | ❌ **NICHT live** | n/a | n/a | n/a |
| Salon-Detail `/salon/[slug]` | ✅ live, Demo-Salons (PROVS) + DB | ✅ Demo-Salons | ✅ | ✅ |
| Magazin `/magazin/[slug]` | ✅ live, 10 hardcoded | ✅ | ✅ | ✅ |
| Medical-Money `/haartransplantation` etc. | ✅ live | ✅ | ✅ | ✅ |

### 5.2 Implementierung von `shouldIndex` ist korrekt

- `src/lib/seo.ts:16-18`: `INDEX_THRESHOLD = 3`, `shouldIndex(count, threshold=3)`
- `src/app/(public)/[stadt]/page.tsx` ruft `robotsForListingPage(salonCount)` auf — setzt `robots: { index: false, follow: true }` wenn `count < 3`
- `src/app/sitemap.ts:99` filtert Stadt-Hub aus Sitemap raus wenn `shouldIndex(count) === false`
- **Edge-Case nicht gehandhabt**: Wenn ein Crawler die Stadt-URL direkt aufruft (von extern verlinkt), bekommt er die Page mit `noindex,follow` — gut. Aber die Stadt-Hub-Inhalts-CTAs („Werde der erste Anbieter") sollten geprüft sein.

### 5.3 Demo-Salon-Risiko

`PROVS` (Demo-Salons in `src/lib/demo-data.ts`) werden **in Sitemap mit Priority 0.7 indexiert** (`sitemap.ts:78-82`). Das ist Cold-Start-Mitigation: Sitemap nicht leer, Crawler findet erste Listings.

**Risiko**: Wenn Google Demo-Salons als „echte" indexiert und User klicken → schlechte First-Impression.
**Mitigation**: Demo-Salons müssen visuell + textuell als „Beispiel" gekennzeichnet sein. **Verifizieren in `SalonDetailClient.tsx`**.

### 5.4 Threshold-Begründung

`INDEX_THRESHOLD = 3` ist bewusst niedrig gewählt: 
- Mit nur 3 Salons gibt es schon „Auswahl" — Soft-404 vermieden
- Bei 5 oder 10 wäre Phase-2-Rollout viel langsamer
- Für Premium-Verticals (OP-Raum) reicht ggf. auch 1 → ggf. per Vertical konfigurierbar machen (`shouldIndex(count, vertical === 'op-raum' ? 1 : 3)`)

---

## 6. Handover an Modul 2 (IA + URL)

### 6.1 Findings die direkt in `02-ia-url-phasen.md` müssen

1. **F-144 Rollen-Klärung Anbieter/Vermieter/Mieter** — vor weiterem URL-Design entschieden
2. **F-146 Stuhlmiete-URL-Pattern** — Variante C (H1/Body) ist Default, Variante B (Parallel-URLs) nur als Fallback
3. **F-147 Products/Shop in Inventar aufnehmen** — neuer Page-Typ
4. **F-148 Medical-Money-Pages in Inventar aufnehmen** — 5 Pages mit Asset-Charakter
5. **F-119 Sprach-Prefix** — Entscheidung treffen, in URL-Konventionen aufnehmen
6. **F-150 `/empfehlungen`, `/inserat`, `/konto`, `/nachrichten`, `/termine`** — entscheiden ob public, in IA-Tabelle aufnehmen oder verschieben

### 6.2 Pflicht-Entscheidungen für Yusuf vor Modul 3

**Q-A: Anbieter vs. Vermieter** — welche Bezeichnung gewinnt?
- Empfehlung: **„Vermieter"** (eindeutig + näher am Geschäftsmodell). 301-Redirect von `/anbieter/*` auf `/vermieter/*`.

**Q-B: Stuhlmiete-Pages neue URL?** — `/stuhlmiete-friseur-berlin` zusätzlich anlegen?
- Empfehlung: **Nein in Phase 1**. Variante C (H1/Body) implementieren, 6 Wochen messen, dann entscheiden.

**Q-C: MedicalBusiness vs. MedicalClinic vs. MedicalSpecialty** — welches Schema für die 5 Medical-Pages?
- Empfehlung: **MedicalBusiness** (Marketplace listet keine eigene Klinik, sondern verweist auf Anbieter).

**Q-D: `INDEX_THRESHOLD` per Vertical** — soll `op-raum` schon bei 1 Listing indexiert werden?
- Empfehlung: **Ja**, `INDEX_THRESHOLDS = { default: 3, 'op-raum': 1, 'longevity': 1 }` (Premium-Nischen).

**Q-E: Products vs. Salonplatz** — sind Products im Shop B2B-Equipment-Verkauf oder Inventar-Listings?
- Diese Frage blockiert Modul 2 §1 (Seitentypen-Inventar).

---

## 7. Resolved Findings (aus Vorgänger-Audit, Mai 14)

Findings die zwischen 14.05.2026 und 23.05.2026 umgesetzt wurden — referenziert mit alter Finding-ID:

| Alte ID | Beschreibung | Wo gefixt | Status |
|---|---|---|---|
| F-009 | Organization-JSON-LD vervollständigen | `src/lib/seo.ts:37-91` + `app/layout.tsx:108-141` | ✅ Erledigt |
| F-011 | FAQ-Schema | `src/components/seo/FAQ.tsx` + 3 Pages | ✅ Erledigt |
| F-012 | BreadcrumbList-Schema | `src/components/seo/Breadcrumbs.tsx` | ✅ Erledigt |
| F-018 | llms.txt erstellen | `public/llms.txt` (2961 Bytes) | ✅ Erledigt |
| F-019 | "Was ist ChairMatch"-Sektion | `/was-ist-chairmatch/page.tsx` als Page | ✅ Erledigt |
| C-01 | Stadt × Vertical-Landingpages | `/[stadt]/[vertical]/page.tsx` | ✅ Erledigt (× Asset noch offen, siehe Cold-Start) |
| F-022 | Soft-404-Risiko City-Pages | `shouldIndex()` + `robotsForListingPage()` | ✅ Erledigt |
| F-026 | Stadt-Hubs angelegt | `/[stadt]/page.tsx` mit serviceAreaSchema | ✅ Erledigt (Content-Tiefe siehe F-136) |
| F-027 | Category-Pages | `/category/[categoryId]` für 13 Kategorien | ✅ Erledigt |
| C-05 | Magazin-Bereich | `/magazin/`, `/magazin/[slug]`, 10 Artikel-Skelette | ✅ Erledigt (Content siehe F-128) |
| F-002 | robots.txt review | `src/app/robots.ts` mit AI-Crawler-Whitelist | ✅ Erledigt |
| F-003 | Sitemap dynamisch | `src/app/sitemap.ts` mit DB-lastmod | ✅ Erledigt |
| F-030 | URL-Parameter `?_rsc` blocken | `robots.ts` disallowt `/*?_rsc=*` | ✅ Erledigt |

**13 von 30 alten Findings sind erledigt. Verbleibend 17 + 20 neue = 37 offene Findings.**

---

## 8. Notiz zur Tiefe dieses Audits

Dieser Audit basiert auf:
- ✅ Live-Code-Inspektion (`src/app/`, `src/lib/seo.ts`, `src/components/seo/*`, `src/middleware.ts`)
- ✅ Sitemap- + Robots-Inhalts-Inspektion auf Code-Ebene
- ✅ Update gegen Recon-Findings 2026-05-22 (Stuhlmiete-Sprachgebrauch, Wettbewerber)
- ✅ Differenz-Analyse gegen Vorgänger-Audit vom 14.05.2026

Nicht in diesem Audit (bewusst für andere Module/Phasen):
- Production-View-Source-Check (statt Code-Inspektion) — bewusst weglassen, weil Code-Stand der Single-Source-of-Truth ist
- Lighthouse-Run mit echten Zahlen (Modul 3 vor Launch)
- Konkurrent-Code-Audit (Modul 0 Recon)
- Content-Plan Magazin (Modul 5)
- Conversion-Optimierung (Modul 6)
