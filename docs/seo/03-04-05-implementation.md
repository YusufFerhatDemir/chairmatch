# Module 3 + 4 + 5 — Implementation Status

Stand: 14. Mai 2026, Commit `a4272b1`.

---

## Modul 3 — Templates (Code live)

### Erstellt

| Route | File | Schema | Indexierung | ISR |
|---|---|---|---|---|
| `/[stadt]` | `app/(public)/[stadt]/page.tsx` | Service + BreadcrumbList + FAQPage | bedingt (≥3 Salons) | 3600s |
| `/[vertical]-deutschland` | `app/(public)/[vertical]-deutschland/page.tsx` | BreadcrumbList + FAQPage | immer | 21600s |
| `/salon/[slug]` | (existierte, heute upgegradet) | LocalBusiness (via `salonSchema()`) | immer | 300s |

### Geplant aber nicht in dieser Session

- `/[stadt]/[vertical]` — Stadt × Vertical-Template
- `/[stadt]/[vertical]/[asset]-mieten` — Asset-Detail
- `/listings/[slug]` — Einzel-Asset-Page (Phase 2)
- `/magazin` + `/magazin/[slug]` — Editorial-Bereich

### shared Components

- `components/seo/FAQ.tsx` ✅ mit FAQPage-Schema
- `components/seo/Breadcrumbs.tsx` ✅ mit BreadcrumbList-Schema

### Phasenmodell-Enforcement (Code-Snippet)

```ts
// lib/seo.ts
export function shouldIndex(listingCount: number, threshold = 3): boolean {
  return listingCount >= threshold
}

// In generateMetadata einer City-Page:
return {
  robots: robotsForListingPage(salonCount),  // index: salonCount >= 3
}
```

---

## Modul 4 — Content Library (teilweise live)

### Daten-Files erstellt

| File | Inhalt | Wörter |
|---|---|---|
| `lib/seo-data/cities.ts` | 5 Städte × (intro, neighborhoods, priceRange, 5 FAQs) | ~1500 |
| `lib/seo-data/verticals.ts` | 5 Verticals × (pillarIntro, benefits, marketStats, legalNote, 6 FAQs) | ~3000 |

### Pro Stadt enthalten

- 150-200 Wörter lokaler Intro (Frankfurt vs. Berlin vs. München klar
  unterscheidbar — Sanity-Check bestanden)
- 6-7 Stadtteile mit Beauty-Relevanz
- Preisspannen für Stuhl / Kabine / Raum
- 5 stadtspezifische FAQs

### Pro Vertical enthalten

- 200-300 Wörter Pillar-Intro
- 5 Tenant-Benefits + 5 Provider-Benefits
- Markt-Statistik (1-2 Sätze)
- Rechtlicher Hinweis (Meisterpflicht, Gewerbeanmeldung etc.)
- 5-6 Vertical-spezifische FAQs

### Tonalität-Check

- ✅ "Du"-Ansprache durchgängig
- ✅ Konkrete Zahlen statt Adjektive ("45-75 €/Tag" > "günstig")
- ✅ Keine AI-Floskeln ("innovative Plattform", "Entfache deine Leidenschaft")
- ✅ Türkisch-sprachige Zielgruppe mitgedacht (kein Wortspiel)
- ⚠️ Stadt-Intros bewusst NICHT austauschbar (kopiere Köln-Text, ersetze
  "Köln" durch "Frankfurt" → ergibt Unsinn = gut)

### Geplant aber nicht in dieser Session

- 100+ FAQ-Master-Bibliothek (aktuell ~50 verteilt)
- About-Page-Content `/was-ist-chairmatch`
- 10 Magazin-Artikel-Outlines (Briefings für später)
- CTA-Variants A/B-Test-Ready
- City × Vertical × Asset Content (25 Kombinationen)

---

## Modul 5 — Tech SEO + GEO (teilweise live)

### Live in Production

| Datei | Zweck | Status |
|---|---|---|
| `app/sitemap.ts` | Dynamische Sitemap mit Stadt+Vertical-Threshold | ✅ |
| `app/robots.ts` | AI-Crawler-Whitelist + Disallow-Regeln | ✅ |
| `public/llms.txt` | Maschinen-lesbare Site-Definition | ✅ |
| `lib/seo.ts` | Schema-Generators (Organization, Website, LocalBusiness, Breadcrumb, FAQ, Service) | ✅ |
| `app/layout.tsx` | Organization + WebSite JSON-LD im Head | ✅ |

### robots.ts Whitelist für AI

Folgende AI-Crawler sind EXPLIZIT zugelassen (entgegen vieler
Marketplaces die diese blocken):
- GPTBot (OpenAI Training)
- ChatGPT-User (Live-Browse)
- ClaudeBot, Claude-Web (Anthropic)
- PerplexityBot
- Google-Extended (Gemini)
- CCBot (Common Crawl)
- anthropic-ai

**Begründung**: Sichtbarkeit in AI-Antworten = neue SEO. ChairMatch
ist Cold-Start — wir wollen zitiert werden.

### Sitemap-Splitting

Aktuell: ein einziger sitemap.xml. Bei >5000 URLs → Splitting in:
- sitemap-static.xml (Marketing-Pages)
- sitemap-cities.xml (Stadt-Hubs)
- sitemap-salons.xml (alle Salon-Detail-Pages)
- sitemap-magazin.xml (zukünftig)

**Phase-Trigger**: erst splitten wenn URL-Count >5000. Aktuell ~80 URLs.

### Indexing-API-Setup

NICHT in dieser Session implementiert. Empfehlung:
- BullMQ-Worker, der bei `salon.insert` oder `salon.update` ein
  Indexing-Job submittet
- Google Indexing API (nur für Job-Postings strikt erlaubt — für
  Salons-as-Service-Provider Grauzone, aber pragmatisch nutzbar)
- IndexNow (Bing/Yandex) — sauberer Standard, ein Ping reicht
- Implementierung: `lib/seo/indexing.ts` + BullMQ-Job

### Open Graph Default

- `/og-image.png` 1200×630 existiert
- Per-Route dynamische OG-Images via `opengraph-image.tsx` NICHT
  implementiert — Phase 2

---

## Was offen ist (für Modul-Komplettierung)

### Modul 3 Rest

- [ ] Stadt × Vertical-Template (`/[stadt]/[vertical]`)
- [ ] Stadt × Vertical × Asset-Template
- [ ] Listing-Detail-Page
- [ ] opengraph-image.tsx pro Route-Group

### Modul 4 Rest

- [ ] About-Page-Inhalt
- [ ] 100+ FAQ-Items zentralisiert in JSON
- [ ] CTA-Bibliothek mit A/B-IDs
- [ ] Magazin-Roadmap mit 10 Outlines

### Modul 5 Rest

- [ ] Indexing-API-Worker
- [ ] OG-Image-Generator pro Route
- [ ] Search-Console-Onboarding-Doku
- [ ] Analytics-Strategie (Plausible/Vercel/Umami)
- [ ] hreflang-Implementation (für Phase 2)
- [ ] Lighthouse-CI im Vercel-Build

---

## Test-Plan

### Pre-Launch Smoke-Tests

```bash
# Sitemap erreichbar + valides XML
curl -s https://chairmatch.de/sitemap.xml | xmllint --noout -

# Robots erreichbar
curl -s https://chairmatch.de/robots.txt | head -20

# llms.txt erreichbar
curl -s https://chairmatch.de/llms.txt | head

# Stadt-Hub rendert
curl -s -o /dev/null -w "%{http_code}\n" https://chairmatch.de/koeln

# Vertical-Hub rendert
curl -s -o /dev/null -w "%{http_code}\n" https://chairmatch.de/friseur-deutschland

# JSON-LD validation: per Browser auf der Page → View-Source → JSON-LD
# herauskopieren → https://validator.schema.org/ einfügen
```

### Rich-Results-Test-URLs

Sobald deployed:
- https://search.google.com/test/rich-results?url=https://chairmatch.de/koeln
- https://search.google.com/test/rich-results?url=https://chairmatch.de/friseur-deutschland
- https://search.google.com/test/rich-results?url=https://chairmatch.de/salon/zenflow-massage

### Lighthouse-Ziele (Mobile)

- Performance: ≥ 90
- Accessibility: ≥ 95
- Best Practices: ≥ 95
- SEO: 100

---

## Übergabe an Module 6 + 7

Modul 6 (Local SEO) kann jetzt:
- Google Business Profile-Strategie definieren
- Local-Pack-Optimierung
- NAP-Konsistenz dokumentieren

Modul 7 (Monitoring) kann jetzt:
- Search Console anmelden
- Rank-Tracking aufsetzen
- Conversion-Tracking für Sign-ups

Beide bauen auf den jetzt vorhandenen Daten-Strukturen
(`lib/seo-data/cities.ts`, `lib/seo-data/verticals.ts`) auf.
