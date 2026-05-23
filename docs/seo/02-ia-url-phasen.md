# ChairMatch IA + URL + Phasenmodell — v2.0 (Stand 23.05.2026)

Architektur-Dokument für SEO-konforme Skalierung. Vorbedingung: Module 0 (Recon
inkl. Update 2026-05-22) + 1 (Audit v2, Stand 23.05.2026) gelesen.

> **Was hat sich gegenüber v1.0 (14.05.2026) geändert?**
> - Phase 1 ist faktisch zu ~70% live (alle Vertical-DE-Hubs, alle Phase-1-Stadt-Hubs, Stadt × Vertical, 13 Categories, 5 Medical-Money-Pages, Magazin mit 10 Artikel-Skeletten, FAQ-Page, was-ist-chairmatch, provisionsmodell).
> - „Stuhlmiete"-Sprachgebrauch aus Recon 22.05 ist eingearbeitet (§2.6, §4.6).
> - Drei neue Page-Typen-Cluster: Shop/Products, Medical-Money, Tools (Freelancer-Rechner).
> - **F-144 Anbieter/Vermieter/Mieter-Rollen-Konflikt** ist als Blocker markiert (§9 Q-A).
> - Phase 1 wird in **Phase 1a (Live), Phase 1b (Lücken-Schließung)** unterteilt.

---

## 1. Seitentypen-Inventar (aktualisiert)

Status-Spalte: ✅ live in Code | 🟡 teilweise live | ❌ fehlt | ⛔ explizit ausgeschlossen

| ID | Seitentyp | URL-Pattern | Indexieren? | Status | Phase |
|---|---|---|---|---|---|
| P-01 | Home | `/` | ✅ | ✅ live (`app/page.tsx`) | 1a |
| P-02 | Was-ist-ChairMatch | `/was-ist-chairmatch` | ✅ | ✅ live | 1a |
| P-03a | Wie-es-funktioniert (Anbieter) | `/anbieter/wie-es-funktioniert` | ✅ | ✅ live | 1a |
| P-03b | Wie-es-funktioniert (Mieter) | `/mieter/wie-es-funktioniert` | ✅ | ✅ live | 1a |
| P-03c | Wie-es-funktioniert (Vermieter) | `/vermieter/wie-es-funktioniert` | ⚠️ siehe Q-A | ❌ fehlt | 1b |
| P-04 | Provisionsmodell | `/provisionsmodell` | ✅ | ✅ live | 1a |
| P-05 | FAQ | `/faq` | ✅ | ✅ live mit FAQPage-Schema | 1a |
| P-06 | Stadt-Hub | `/[stadt]` | ⚠️ bei ≥3 Salons (`shouldIndex`) | ✅ live (5 Phase-1-Städte) | 1a |
| P-07 | Stadt × Vertical | `/[stadt]/[vertical]` | ⚠️ bei ≥3 Salons | ✅ live | 1a |
| P-08 | Stadt × Vertical × Asset | `/[stadt]/[vertical]/[asset]-mieten` | ⚠️ bei ≥3 Salons | ❌ fehlt | 2 (verschoben aus 1) |
| P-09 | Vertical-Deutschland-Hub | `/[vertical]-deutschland` | ✅ | ✅ live (5 Pages) | 1a |
| P-10 | Lexikon-Eintrag | `/lexikon/[term]` | ✅ | ❌ fehlt | 1b |
| P-11 | Listing-Detail | `/listings/[slug]` | ✅ | ✅ live (mit OG-Image) | 1b |
| P-12 | Salon-Detail | `/salon/[slug]` | ✅ | ✅ live (ISR 300s) | 1a |
| P-13 | Freelancer/Mieter-Profil | `/freelancer/[slug]` | ⛔ Privatsphäre | ❌ bewusst weg | — |
| P-14 | Magazin-Übersicht | `/magazin` | ✅ | ✅ live | 1a |
| P-15 | Magazin-Artikel | `/magazin/[slug]` | ✅ | ✅ live (10 Skelette) | 1a |
| P-16 | Help-Center-Übersicht | `/hilfe` | ✅ | ❌ fehlt | 2 |
| P-17 | Help-Center-Artikel | `/hilfe/[slug]` | ✅ | ❌ fehlt | 2 |
| P-18 | Impressum | `/impressum` | ✅ (TMG-Pflicht) | ✅ live | 1a |
| P-19 | Datenschutz | `/datenschutz` | ✅ (DSGVO-Pflicht) | ✅ live | 1a |
| P-20 | AGB (Kunde) | `/agb` | ✅ | ✅ live | 1a |
| P-21 | AGB (Provider) | `/agb-provider` | ✅ | ✅ live | 1a |
| P-22 | Widerruf | `/widerruf` | ✅ | ✅ live | 1a |
| P-23 | Cookie-Settings | `/cookie-settings` | ⛔ noindex (UX-Page) | ✅ live | — |
| P-24 | Auth | `/auth`, `/auth/*` | ⛔ noindex | 🟡 live aber in Sitemap (Bug, siehe Modul 1 F-140) | — |
| P-25 | Account-Dashboard | `/account/*` | ⛔ noindex (`(protected)`) | ✅ live (in robots disallowed) | — |
| P-26 | Provider-Dashboard | `/provider/*` | ⛔ noindex | ✅ live (in robots disallowed) | — |
| P-27 | Owner-Bereich | `/owner/*` | ⛔ noindex | ✅ live (in robots disallowed) | — |
| P-28 | Investor-Bereich | `/investor/*` | ⛔ noindex | ✅ live (in robots disallowed) | — |
| P-29 | Admin-Panel | `/admin/*` | ⛔ noindex | ✅ live (in robots disallowed) | — |
| P-30 | API-Routes | `/api/*` | ⛔ (kein Crawl) | ✅ disallowed in robots.ts | — |
| P-31 | Search | `/search` | ⛔ noindex (Modul 1 F-133) | 🟡 live, aber indexierbar (Bug) | — |
| P-32 | Explore (Discovery) | `/explore` | ✅ index (Hub mit Mehrwert) | ✅ live (Metadata fehlt) | 1a |
| P-33 | Offers | `/offers` | ✅ | ✅ live (Metadata fehlt) | 1a |
| P-34 | Rentals | `/rentals` | ✅ | ✅ live (Metadata fehlt) | 1a |
| P-35 | Landing (Marketing) | `/landing` | ✅ | ✅ live | 1a |
| P-36 | Pitch (Investor) | `/pitch` | ⚠️ bisher indexiert | 🟡 live (siehe Q-G) | — |
| P-37 | Statistik (Trust) | `/statistik` | ✅ | ✅ live | 1a |
| P-38 | Kategorie-Hub | `/category/[categoryId]` | ✅ | ✅ live (13 Kategorien) | 1a |
| P-39 | Medical-Money Page | `/{thema}` (5 Pages) | ✅ | ✅ live | 1a |
| P-40 | Premium (Money-Hub) | `/premium` | ✅ | ✅ live | 1a |
| P-41 | Products / Shop-Übersicht | `/products` | ⚠️ siehe Q-E | ✅ live | 1a |
| P-42 | Produkt-Detail | `/shop/[slug]` | ⚠️ siehe Q-E | ✅ live | 1a |
| P-43 | Freelancer-Rechner (Tool) | `/freelancer-rechner` | ✅ | ✅ live | 1a |
| P-44 | Empfehlungen | `/empfehlungen` | ⚠️ siehe Q-F | ✅ live, Status unklar | 1b |
| P-45 | Konto | `/konto` | ⚠️ siehe Q-F | ✅ live, Status unklar | 1b |
| P-46 | Inserat | `/inserat` | ⚠️ siehe Q-F | ✅ live, Status unklar | 1b |
| P-47 | Nachrichten | `/nachrichten` | ⛔ noindex (User-spezifisch) | ✅ live, Status unklar | — |
| P-48 | Termine | `/termine` | ⛔ noindex | ✅ live, Status unklar | — |

**5 Medical-Money-Pages (Detail P-39)**: `/haartransplantation`, `/zahnimplantate`, `/augenlasern`, `/longevity`, `/iv-infusionen`.

**5 Vertical-Deutschland-Hubs (Detail P-09)**: `/barbershop-deutschland`, `/friseur-deutschland`, `/kosmetik-deutschland`, `/nagelstudio-deutschland`, `/lash-brows-deutschland`.

**13 Category-Slugs (P-38)**: `barber, friseur, kosmetik, aesthetik, haartransplantation, zahnimplantate, augenlasern, longevity, infusion, nail, massage, lash, arzt, opraum`.

---

## 2. URL-Konventionen

### 2.1 Pflicht-Regeln (unverändert zu v1.0)

1. **Sprache**: Phase 1 ohne Sprach-Prefix (`/koeln/friseur`). Phase 2 mit 301 auf `/de/koeln/friseur` wenn EN/TR/FR aktiviert. Entscheidung steht (Q-D).
2. **Slug-Stil**: `kebab-case`, ASCII-only — Umlaut-Mapping in `cityToSlug()` (`src/lib/seo.ts:362-371`):
   - ä → ae, ö → oe, ü → ue, ß → ss
   - kein Leerzeichen, kein Underscore
   - Stop-Words raus: „in", „der", „die", „das", „bei"
3. **Trailing-Slash**: KEIN trailing slash (`/koeln` nicht `/koeln/`). Next.js Default.
4. **Case-Sensitivity**: lowercase. Middleware-Redirect für uppercase-Varianten.
5. **Stabilität**: Einmal ausgegeben, NIE wieder ändern. Bei Bedarf 301.

### 2.2 Stadt-Slug-Whitelist (live in Code)

`PHASE_1_CITIES` (`src/lib/seo-data/cities.ts`): **berlin, hamburg, muenchen, koeln, frankfurt**.

Erweiterung Phase 2: `duesseldorf, stuttgart, leipzig, dresden, hannover, nuernberg, bremen, dortmund, essen, bonn`.
Phase 3: `mainz, mannheim, karlsruhe, wiesbaden, augsburg` + Top-50.

### 2.3 Vertical-Slug-Whitelist (live in Code)

`VERTICALS` (`src/lib/seo-data/verticals.ts`): **barbershop, friseur, kosmetik, nagelstudio, lash-brows** (5 für Vertical-Deutschland-Hubs).

Category-Slug-Liste ist breiter (13 Kategorien): siehe P-38.

### 2.4 Asset-Slug-Vorschlag (für P-08, noch nicht implementiert)

```
stuhl, liege, kabine, salonplatz, behandlungsraum,
op-raum, beauty-workspace
```

URL-Pattern: `/[stadt]/[vertical]/[asset]-mieten` (z.B. `/koeln/friseur/stuhl-mieten`).

### 2.5 Beispiel-URLs

```
✅ Gut (live):
  /koeln                             — Stadt-Hub (noindex bis 3 Salons)
  /koeln/friseur                     — Stadt × Vertical
  /friseur-deutschland               — Vertical-DE-Hub
  /magazin/wie-funktioniert-stuhl-miete
  /salon/maison-haarwerk-duesseldorf
  /haartransplantation               — Medical-Money

✅ Geplant (Phase 1b / 2):
  /koeln/friseur/stuhl-mieten        — P-08
  /lexikon/chair-rental              — P-10
  /vermieter/wie-es-funktioniert     — P-03c
  /tools/stuhlmietvertrag-vorlage    — neu aus Recon 22.05

❌ Schlecht:
  /Koeln/Friseur/                    — Case + Trailing Slash
  /salons/maison-haarwerk?lang=de    — Sprache via Query
  /city/koeln                        — überflüssige Zwischenebene
  /salons/123-maison-haarwerk        — ID + Slug doppelt
```

### 2.6 „Stuhlmiete" vs. „Stuhl mieten" — URL-Entscheidung

Recon-Update vom 22.05 zeigt klar: „Stuhlmiete" ist das dominante Branchenwort.

**Drei Optionen** (aus Modul 1 F-146):

| Option | Beschreibung | Risiko | Aufwand |
|---|---|---|---|
| A | Neue URL `/stuhlmiete/[stadt]/[vertical]` mit 301 von alter | Hoch (URL-Churn) | Hoch |
| B | Beide URLs parallel, eine canonical auf die andere — A/B-Test | Mittel | Mittel |
| C | URL bleibt `/[stadt]/[vertical]`, ABER H1/Body/Keywords nutzen BEIDE Varianten | Niedrig | Niedrig (Quick Win) |

**Empfehlung Phase 1**: **C**. Beispiel-H1: „Friseurstuhl mieten in Köln — Stuhlmiete & Salonplatz".

**Phase 2 Re-Eval**: Wenn nach 6 Wochen die Money-Keywords nicht Top-10 ranken → Option B testen.

---

## 3. Phasenmodell (v2)

### 3.1 Phase 1a — Lighthouses Live (0–50 Anbieter, Stand JETZT)

**Erreicht**:
- 5 Vertical-Deutschland-Hubs indexiert
- 5 Stadt-Hubs angelegt (noindex bis 3 Salons via `shouldIndex`)
- 25 Stadt × Vertical-Pages dynamisch (noindex bis 3 Salons)
- 13 Category-Pages indexiert
- 5 Medical-Money-Pages indexiert (Premium-Track)
- 10 Magazin-Artikel-Skelette (Publishing-Status siehe Modul 1 F-128)
- FAQ-Page, was-ist-chairmatch, provisionsmodell, anbieter-wie, mieter-wie live
- Demo-Salons (PROVS) in Sitemap → Crawler findet Inhalte trotz 0 echter Provider

**Phase-Gate zu 1b**: F-144 entschieden (Rollen-Konflikt) + Modul 1 Quick-Wins QW-1–QW-10 umgesetzt.

### 3.2 Phase 1b — Lücken schließen (0–50 Anbieter, NEXT 2 Wochen)

**To-Do**:
- `/vermieter/wie-es-funktioniert` (P-03c) — nach Rollen-Entscheidung
- `/lexikon/[term]` mit 5 Initial-Einträgen (P-10)
- `/tools/stuhlmietvertrag-vorlage` (Lead-Magnet aus Recon 22.05)
- Magazin-Artikel #11 Scheinselbstständigkeit (Modul 1 F-129)
- Magazin-Artikel #12 Was kostet Stuhlmiete (Calculator-Style)
- Stadt × Vertical × Asset Routes (P-08): nur 5 Top-Kombinationen vorbereiten
- Quick-Win-Sprint aus Modul 1 §4 abarbeiten

**Threshold zu Phase 2**:
- ≥50 aktive Anbieter UND
- ≥3 Anbieter in mind. 5 Stadt+Vertical-Kombinationen UND
- ≥3 Stadt-Hubs auf Position 1-10 für die Top-3 Money-Keywords

### 3.3 Phase 2 — Selective Programmatic (50–500 Anbieter)

**Aktivieren**:
- 10 weitere Städte (Phase 2 city-list: Düsseldorf, Stuttgart, Leipzig, Dresden, Hannover, Nürnberg, Bremen, Dortmund, Essen, Bonn)
- Stadt × Vertical × Asset (P-08) automatisch ab Threshold
- Help-Center (P-16, P-17)
- 20 weitere Magazin-Artikel
- hreflang aktivieren für DE→EN (Modul 1 F-118)
- ggf. Option B Stuhlmiete-URLs aktivieren (siehe §2.6)

**Threshold zu Phase 3**:
- ≥500 aktive Anbieter UND
- ≥20 Städte mit ≥3 Anbietern UND
- Aggregate-Traffic > 50k organic visits/Monat

### 3.4 Phase 3 — Full Skalierung (500+ Anbieter)

- Top-50-Städte automatisch indexiert
- Mikro-Standorte: `/koeln/ehrenfeld/friseur` (Stadtteil-Ebene)
- Asset-Typ-Differenzierung: `/koeln/friseur/stuhl` vs. `/koeln/friseur/kabine`
- i18n-Rollout: TR, EN zuerst, dann FR/ES/IT/PL/AR
- Programmatic Magazin-Generation (mit human-curated Review-Loop)

---

## 4. URL-Map Phase 1 (Stand-Inventar + Geplant)

### 4.1 Statische Pflicht-Pages (alle live)

```
/                                        (P-01)
/was-ist-chairmatch                      (P-02)
/anbieter/wie-es-funktioniert            (P-03a)
/mieter/wie-es-funktioniert              (P-03b)
/provisionsmodell                        (P-04)
/faq                                     (P-05)
/magazin                                 (P-14)
/impressum                               (P-18)
/datenschutz                             (P-19)
/agb                                     (P-20)
/agb-provider                            (P-21)
/widerruf                                (P-22)
/landing                                 (P-35)
/statistik                               (P-37)
/freelancer-rechner                      (P-43)
/premium                                 (P-40)
```

### 4.2 Vertical-Deutschland-Hubs (alle live, alle indexiert)

```
/barbershop-deutschland
/friseur-deutschland
/kosmetik-deutschland
/nagelstudio-deutschland
/lash-brows-deutschland
```

### 4.3 Medical-Money-Pages (alle live, alle indexiert)

```
/haartransplantation     (Premium-Track)
/zahnimplantate          (Premium-Track)
/augenlasern             (Premium-Track)
/longevity               (Premium-Track)
/iv-infusionen           (Premium-Track)
```

### 4.4 Stadt-Hubs Phase 1 (live, noindex bis 3 Salons)

```
/berlin
/hamburg
/muenchen
/koeln
/frankfurt
```

### 4.5 Stadt × Vertical Phase 1 (25 Pages dynamisch, noindex bis 3 Salons)

```
/berlin/barbershop    /berlin/friseur    /berlin/kosmetik    /berlin/nagelstudio    /berlin/lash-brows
/hamburg/barbershop   /hamburg/friseur   /hamburg/kosmetik   /hamburg/nagelstudio   /hamburg/lash-brows
/muenchen/barbershop  /muenchen/friseur  /muenchen/kosmetik  /muenchen/nagelstudio  /muenchen/lash-brows
/koeln/barbershop     /koeln/friseur     /koeln/kosmetik     /koeln/nagelstudio     /koeln/lash-brows
/frankfurt/barbershop /frankfurt/friseur /frankfurt/kosmetik /frankfurt/nagelstudio /frankfurt/lash-brows
```

### 4.6 Stadt × Vertical × Asset Phase 1b — NEU PRIORISIERT (basierend auf Recon 22.05 Top-10)

```
1. /berlin/friseur/stuhl-mieten             — größter Markt
2. /koeln/friseur/stuhl-mieten              — Yusufs lokales Netz
3. /frankfurt/friseur/stuhl-mieten          — Yusufs lokales Netz
4. /berlin/kosmetik/raum-mieten             — Coworking-Konkurrenz schwach
5. /muenchen/kosmetik/raum-mieten           — Dollea ist Single-Location
6. /berlin/barbershop/stuhl-mieten          — Volumen
7. /hamburg/friseur/stuhl-mieten            — Volumen
8. /muenchen/friseur/stuhl-mieten           — Volumen
9. /koeln/kosmetik/raum-mieten              — Coworking-Lücke
10. /frankfurt/op-raum-mieten               — Premium-Nische
```

Hinweis: URL-Slug der Asset-Ebene angepasst — „raum-mieten" statt „kabine-mieten" für Kosmetik, weil Recon zeigt dass „Raum" der natürlichere Term ist (Schönheitsloft, Beauty Coworking nutzen alle „Raum").

### 4.7 Magazin-Artikel Phase 1 (10 Skelette live, Content-Status siehe Modul 1 F-128)

`MAGAZIN_ARTIKEL[]` in `src/lib/seo-data/magazin.ts:21+`:

```
/magazin/wie-funktioniert-stuhl-miete          ✅ Skelett
+ 9 weitere Slugs (zu verifizieren)
```

**NEU Phase 1b (aus Recon 22.05)**:

```
/magazin/scheinselbststaendigkeit-stuhlmiete   — #1 PAA-Pain (Modul 1 F-129)
/magazin/was-kostet-stuhlmiete                 — Calculator-Anker
/magazin/stuhlmietvertrag-was-rein-muss        — verlinkt auf Vorlage-Tool
```

### 4.8 Lexikon Phase 1b — NEU (aktuell nicht im Code)

```
/lexikon/chair-rental
/lexikon/salon-coworking
/lexikon/stuhlmiete
/lexikon/freelancer-friseur
/lexikon/op-raum-vermietung
```

### 4.9 Category-Pages Phase 1 (alle live)

```
/category/barber     /category/friseur     /category/kosmetik     /category/aesthetik
/category/nail       /category/massage     /category/lash         /category/arzt
/category/opraum     /category/haartransplantation
/category/zahnimplantate /category/augenlasern /category/longevity /category/infusion
```

### 4.10 Shop & Tools (Phase 1)

```
/products              — Übersicht (in Sitemap mit Priority 0.85)
/shop/[slug]           — Produkt-Detail (dynamisch aus DB)
/freelancer-rechner    — Lead-Magnet Tool
```

**Phase 1 Total**: ~65 indexierbare URLs in 1a + ~15 zusätzlich in 1b = ~80 sichtbare Launch-URLs.

---

## 5. Interne Verlinkungs-Architektur

### 5.1 Hub-and-Spoke pro Stadt

```
                  /koeln (Stadt-Hub)
                 /  |  |  |  \
                /   |  |  |   \
   /koeln/barbershop  /koeln/friseur  /koeln/kosmetik  /koeln/nagelstudio  /koeln/lash-brows
        |                  |                |                |                  |
   3-5 Salons          3-5 Salons      3-5 Salons      3-5 Salons         3-5 Salons
```

Die Stadt-Hub-Page enthält (laut existierender Implementierung `/[stadt]/page.tsx`):
- 5 große Vertical-Cards mit jeweils Top-Salons (aus DB)
- serviceAreaSchema-LD
- breadcrumbSchema-LD
- FAQ-Komponente (Modul 1 F-114)
- **Offen** (Modul 1 F-136): 300+ Wörter Stadt-Marktinfo („Warum ist Köln ein Markt für Stuhlmiete?")

### 5.2 Vertical-Hub-Cross-Linking

`/friseur-deutschland` → linkt zu allen `/[stadt]/friseur`-Pages.
`/koeln/friseur` → linkt zurück zu `/friseur-deutschland` UND seitlich zu `/koeln/barbershop` (verwandte Kategorie).

### 5.3 Footer-Mega-Links (`SeoFooter`-Komponente)

Bereits implementiert: `src/app/(public)/layout.tsx` rendert `<SeoFooter />`. Inhalt muss verifiziert werden — Empfehlung Layout:

```
Spalte 1 — Vermieter:        Spalte 2 — Städte:         Spalte 3 — Kategorien:
- Vermieter werden            - Stuhlmiete Köln          - Friseur Deutschland
- Provisionsmodell            - Stuhlmiete Berlin        - Barbershop Deutschland
- Provider-AGB                - Kosmetikraum Berlin      - Kosmetik Deutschland
- Help-Center                 - Stuhlmiete Frankfurt     - Nagelstudio Deutschland
- Magazin                     - Lash-Studio Berlin       - Lash & Brows Deutschland

Spalte 4 — Mieter:            Spalte 5 — Tools:          Spalte 6 — Premium:
- Mieter werden               - Freelancer-Rechner       - Haartransplantation
- FAQ                         - Stuhlmietvertrag-Vorlage - Zahnimplantate
- Magazin                     - Lexikon                  - Longevity
- Was ist ChairMatch?         - Statistik                - Augenlasern
```

20-30 Links, alle in Phase-1-Inventar.

### 5.4 Magazin → Money-Page Internal Links

Jeder Magazin-Artikel: 3-5 kontextuelle Anchor-Texts zu Money-Pages.

Beispiel `/magazin/wie-funktioniert-stuhl-miete`:
> „Wer in Köln einen [Friseurstuhl mieten](/koeln/friseur) will, hat aktuell zwei Optionen..."

Beispiel `/magazin/scheinselbststaendigkeit-stuhlmiete`:
> „Bevor du einen [Stuhlmietvertrag unterschreibst](/tools/stuhlmietvertrag-vorlage), prüfe die [Checkliste der Pflichten](/magazin/stuhlmietvertrag-was-rein-muss)."

### 5.5 „Ähnliche Salons"-Modul

Auf Salon-Detail-Pages: 4 Boxen mit:
- Salons gleicher Kategorie in derselben Stadt
- Salons in benachbarter Stadt mit gleicher Kategorie

Implementierung: noch nicht im Code verifiziert — Open in Modul 3.

---

## 6. Indexierungs-Strategie pro Seitentyp (komplett aktualisiert)

| Seitentyp | robots-Meta | Canonical | Sitemap | Implementierungs-Status |
|---|---|---|---|---|
| Home `/` | index,follow | self | ✅ | ✅ live |
| Was-ist | index,follow | self | ✅ | ✅ live |
| Anbieter/Mieter-Funkt. | index,follow | self | ✅ | ✅ live |
| Vermieter-Funkt. | index,follow | self | ✅ | ❌ fehlt (siehe Q-A) |
| Provisionsmodell | index,follow | self | ✅ | ✅ live |
| FAQ | index,follow | self | ✅ | ✅ live + FAQ-Schema |
| Stadt-Hub | bedingt (≥3) via `robotsForListingPage` | self | bedingt | ✅ live |
| Stadt × Vertical | bedingt (≥3) | self | bedingt | ✅ live |
| Stadt × Vertical × Asset | bedingt | self | bedingt | ❌ fehlt (Phase 1b) |
| Vertical-DE-Hub | index,follow | self | ✅ (immer) | ✅ live |
| Salon-Detail | index,follow | self | ✅ | ✅ live |
| Magazin-Übersicht | index,follow | self | ✅ | ✅ live |
| Magazin-Artikel | index,follow | self | ✅ | ✅ live + Article-Schema |
| Listings-Detail | index,follow | self | ✅ | ✅ live + dyn. OG-Image |
| Lexikon | index,follow | self | ✅ | ❌ fehlt |
| Impressum/AGB/etc | index,follow | self | ✅ | ✅ live |
| Cookie-Settings | noindex,follow | self | ❌ | ✅ |
| Auth | noindex,follow | self | ❌ | 🟡 Bug: in Sitemap, kein robots:noindex (Modul 1 F-140) |
| `/account/*` | noindex,nofollow | n/a | ❌ | ✅ disallowed via robots.ts |
| `/provider/*` | noindex,nofollow | n/a | ❌ | ✅ disallowed |
| `/owner/*` | noindex,nofollow | n/a | ❌ | ✅ disallowed |
| `/investor/*` | noindex,nofollow | n/a | ❌ | ✅ disallowed |
| `/admin/*` | noindex,nofollow | n/a | ❌ | ✅ disallowed |
| `/api/*` | n/a (robots-only) | n/a | ❌ | ✅ |
| `/search` | noindex,follow | `/search` | ❌ | 🟡 Bug: in Sitemap, kein robots:noindex (Modul 1 F-133) |
| `/explore` | index,follow | `/explore` | ✅ | 🟡 Metadata fehlt |
| `/offers` | index,follow | self | ✅ | 🟡 Metadata fehlt |
| `/rentals` | index,follow | self | ✅ | 🟡 Metadata fehlt |
| `/landing` | index,follow | self | ✅ | ✅ |
| `/pitch` | siehe Q-G | n/a | ⚠️ Priority 0.5 | 🟡 |
| `/statistik` | index,follow | self | n/a | ✅ |
| `/category/*` | index,follow | self | ✅ | ✅ live |
| Medical-Money (5) | index,follow | self | ✅ Priority 0.95 | ✅ live |
| `/premium` | index,follow | self | ✅ | ✅ live |
| `/products`, `/shop/*` | siehe Q-E | self | ✅ | ✅ live |
| `/freelancer-rechner` | index,follow | self | ✅ | ✅ live |
| `/empfehlungen`, `/inserat`, `/konto` | siehe Q-F | n/a | ❌ | 🟡 unklar |
| `/nachrichten`, `/termine` | noindex,nofollow | n/a | ❌ | 🟡 unklar |

---

## 7. Faceted-Search-Handling

### 7.1 Problem

`/explore?category=barber&city=koeln&priceMin=20&priceMax=80` ergibt beliebige Kombinationen — kombinatorische Explosion ist SEO-Gift.

### 7.2 Aktuelle Implementation

`src/app/robots.ts` blockt:
- `/search?` (Disallow-Pattern)
- `/explore?` (Disallow-Pattern)
- `/*?_rsc=*`, `/*?_next=*` (Next.js intern)

**Lücke**: Kein Canonical-Tag der Filter-URLs auf die Basis kanonisiert (Modul 1 F-135). Crawler die robots.txt ignorieren würden Duplicate sehen.

### 7.3 Soll-Strategie

**Whitelist-Strategie** + Canonical:

1. `/explore` mit Filter-Query: `<meta name="robots" content="noindex,follow">` + `<link rel="canonical" href="/explore">` (oder wenn Filter-Kombination einer indexierbaren Page entspricht → canonical zu der Page).
2. `/search` analog mit `canonical="/search"` ABER zusätzlich `noindex` auch für die Base-URL (Modul 1 F-133).

### 7.4 Wann ist eine Filter-URL indexierbar?

Nur bei diesen Filter-Kombinationen — alle haben EIGENE Pretty-URL als Ziel:

- City-Only: `/explore?city=koeln` → canonical zu `/koeln`
- Category-Only: `/explore?category=friseur` → canonical zu `/friseur-deutschland`
- City + Category: → canonical zu `/koeln/friseur`
- Sonst: `noindex` + canonical zur Basis

---

## 8. Next.js App Router File-Tree (aktualisiert für Stand 23.05.2026)

Tatsächlicher Ist-Stand:

```
src/app/
├── layout.tsx                                # Root-Layout + Org-LD + WebSite-LD
├── page.tsx                                  # P-01 Home (force-dynamic, statisches Metadata)
├── sitemap.ts                                # P-30 Sitemap-Generator
├── robots.ts                                 # Robots-Generator
├── opengraph-image.tsx                       # Default OG-Image (Edge)
├── (auth)/                                   # Auth-Flows (4 Pages, noindex)
│   ├── auth/
│   ├── auth/forgot-password/
│   ├── auth/reset-password/
│   └── auth/change-password/
├── (protected)/                              # 5 Pages, noindex via Middleware
│   ├── account/
│   ├── favorites/
│   └── booking/[salonId]/
├── (provider)/provider/                      # noindex
├── (owner)/owner/                            # noindex + 3 Subpages
├── (investor)/investor/                      # noindex + 2 Subpages
├── (admin)/                                  # noindex (23 Pages)
├── (public)/                                 # SEO-relevante Route-Group, layout.tsx mit SeoFooter
│   ├── layout.tsx                            # rendert SeoFooter
│   ├── [stadt]/                              # P-06 Stadt-Hub (ISR 3600s)
│   │   ├── page.tsx                          
│   │   └── [vertical]/page.tsx               # P-07 Stadt × Vertical
│   │   # FEHLT: [asset]-mieten/page.tsx      # P-08 Phase 1b
│   ├── [vertical]-deutschland/page.tsx       # P-09 (5 statische via generateStaticParams)
│   ├── was-ist-chairmatch/page.tsx           # P-02
│   ├── anbieter/wie-es-funktioniert/page.tsx # P-03a
│   ├── mieter/wie-es-funktioniert/page.tsx   # P-03b
│   # FEHLT: vermieter/wie-es-funktioniert/page.tsx  # P-03c
│   ├── provisionsmodell/page.tsx             # P-04
│   ├── faq/page.tsx                          # P-05 + FAQPage-Schema
│   ├── magazin/                              # P-14, P-15
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       ├── page.tsx                      # + articleSchema
│   │       └── opengraph-image.tsx           # ❌ FEHLT (Modul 1 F-137)
│   ├── salon/[slug]/                         # P-12 (ISR 300s)
│   │   ├── page.tsx                          # + Inline-BeautySalon-LD (Modul 1 F-112)
│   │   └── opengraph-image.tsx               # ❌ FEHLT
│   ├── listings/[slug]/                      # P-11
│   │   ├── page.tsx
│   │   └── opengraph-image.tsx               # ✅ live
│   ├── category/[categoryId]/page.tsx        # P-38 (13 Slugs)
│   ├── shop/[slug]/page.tsx                  # P-42
│   ├── products/page.tsx                     # P-41
│   ├── premium/page.tsx                      # P-40
│   ├── haartransplantation/page.tsx          # P-39
│   ├── zahnimplantate/page.tsx               # P-39
│   ├── augenlasern/page.tsx                  # P-39
│   ├── longevity/page.tsx                    # P-39
│   ├── iv-infusionen/page.tsx                # P-39
│   ├── freelancer-rechner/page.tsx           # P-43
│   ├── barbershop-deutschland/page.tsx       # P-09 (alternative explizite Route?)
│   ├── friseur-deutschland/page.tsx
│   ├── kosmetik-deutschland/page.tsx
│   ├── nagelstudio-deutschland/page.tsx
│   ├── lash-brows-deutschland/page.tsx
│   ├── explore/page.tsx                      # P-32 (Metadata fehlt)
│   ├── search/page.tsx                       # P-31 (noindex fehlt)
│   ├── offers/page.tsx                       # P-33 (Metadata fehlt)
│   ├── rentals/page.tsx                      # P-34 (Metadata fehlt)
│   ├── landing/page.tsx                      # P-35
│   ├── pitch/page.tsx                        # P-36
│   ├── statistik/page.tsx                    # P-37
│   ├── empfehlungen/page.tsx                 # P-44 (Status klären, Q-F)
│   ├── konto/page.tsx                        # P-45 (Status klären)
│   ├── inserat/page.tsx                      # P-46 (Status klären)
│   ├── nachrichten/page.tsx                  # P-47 (Status klären)
│   ├── termine/page.tsx                      # P-48 (Status klären)
│   ├── anbieter/onboarding/
│   ├── anbieter/mein-salon/
│   ├── mieter/onboarding/
│   ├── mieter/mein-bereich/
│   ├── vermieter/onboarding/
│   ├── vermieter/mein-inserat/
│   ├── impressum/page.tsx                    # P-18
│   ├── datenschutz/page.tsx                  # P-19
│   ├── agb/page.tsx                          # P-20
│   ├── agb-provider/page.tsx                 # P-21
│   ├── widerruf/page.tsx                     # P-22
│   ├── cookie-settings/page.tsx              # P-23
│   ├── test-i18n-check/page.tsx              # ⚠️ Dev-Page, sollte noindex sein
│   ├── error.tsx
│   └── loading.tsx
└── api/                                      # Server-Endpoints (alle disallowed)
```

**Inkonsistenz beobachtet**: Es gibt sowohl `/[vertical]-deutschland/page.tsx` (dynamische Route) als auch explizite `/barbershop-deutschland/page.tsx` etc. Eine der beiden Implementierungen sollte gewinnen — sonst Risiko von Routing-Konflikt. **Action für Modul 3**: verifizieren welche aktiv ist.

---

## 9. Open Questions an Yusuf (Pflicht vor Modul 3)

### Q-A: Anbieter vs. Vermieter (BLOCKER für Phase 1b)

Aktuell drei Rollen-Namen parallel:
- `/anbieter/*` (Anbieter = Salon der Stuhl vermietet?)
- `/mieter/*` (Mieter = Freelancer der Stuhl mietet)
- `/vermieter/*` (Vermieter = ?)

**Vorschlag**: 2 Rollen.
- **„Vermieter"** = Marketplace-Salon (vermietet Stühle/Räume)
- **„Mieter"** = Freelancer (mietet Stuhl/Raum)
- 301-Redirect: `/anbieter/*` → `/vermieter/*`
- Konsistenz-Update: llms.txt, SeoFooter, alle Schema-Texte, FAQ-Antworten

**Alternative**: „Anbieter" + „Mieter" behalten, `/vermieter/*` löschen. Aber „Anbieter" ist weniger eindeutig.

**Entscheidung erforderlich**.

### Q-B: Stuhlmiete-URL-Pattern

Empfehlung Phase 1: **Option C** (H1/Body, URL bleibt). Phase 2 ggf. Re-Eval mit A/B-Test.

**OK so?**

### Q-C: MedicalBusiness-Schema für 5 Medical-Pages

Empfehlung: **MedicalBusiness**, nicht MedicalClinic (Marketplace listet keine eigene Klinik).

**OK?**

### Q-D: Sprach-Prefix (`/de/...`)

Phase 1 ohne, Phase 2 mit 301-Redirect — wie ursprünglich.

**Bestätigung erforderlich**.

### Q-E: Products vs. Salonplatz — Strategie

`/products` und `/shop/[slug]` sind im Code aber unklar:
- B2B-Equipment-Verkauf (Kassen, Stühle, Werkzeuge)? → indexieren ✅
- Inventar-Listings (Stühle die vermietet werden)? → dann mit `/listings/[slug]` konsolidieren

**Entscheidung beeinflusst Sitemap-Priorität und Internal-Linking.**

### Q-F: `/empfehlungen`, `/inserat`, `/konto`, `/nachrichten`, `/termine` — Public oder Account?

Diese Pages liegen in `(public)/` aber Naming suggeriert Account-Tools. Klären:
- Wenn Public-Pages mit echtem SEO-Wert → in IA aufnehmen, Sitemap-Entry erstellen
- Wenn Account-Tools → nach `(protected)` verschieben + `noindex`

**Action**: Yusuf entscheidet pro Page.

### Q-G: `/pitch` (Investor-Pitch-Page) — index oder noindex?

Aktuell in Sitemap mit Priority 0.5 → indexiert. Investor-Pitch öffentlich indexiert ist normalerweise unüblich.

**Vorschlag**: noindex, mit Token-basiertem Share-Link für Investoren.

### Q-H: Threshold per Vertical

Empfehlung: Für `op-raum`, `longevity` Threshold auf 1 setzen (Premium-Nischen mit wenigen aber wertvollen Listings).

Konkret: `INDEX_THRESHOLDS = { default: 3, 'op-raum': 1, 'longevity': 1, 'iv-infusionen': 1 }` (in `src/lib/seo.ts`).

**OK?**

### Q-I: hreflang für Phase 1

Nur DE Phase 1 → kein hreflang nötig. Bei Phase-2-Migration nach `/de/`-Prefix kommen hreflang-Tags automatisch.

**OK?**

### Q-J: `/test-i18n-check` Dev-Page

Existiert in `(public)/`. Sollte `noindex` oder gelöscht werden.

**Confirmation**: kann gelöscht werden?

---

## 10. Übergabe-Status an Modul 3 (Tech-SEO-Implementation)

Modul 3 kann jetzt:

1. **Quick-Win-Sprint** aus `01-audit-prio-matrix.md §4` abarbeiten (QW-1 bis QW-10, ~5,5h Gesamtaufwand)
2. Nach Yusufs Entscheidung Q-A: **Rollen-Refactor** (URL-Redirects + Content-Anpassungen)
3. **Phase 1b URL-Implementierung**: Stadt × Vertical × Asset (5 Top-Kombinationen), Lexikon (5 Einträge), Vermieter-wie-Page, Stuhlmietvertrag-Tool
4. **Salon-Detail-Schema-Refactor** (F-112)
5. **Sitemap-Bugs fixen** (F-133, F-140, F-141)

Module 4 (Schema-Tiefe), 5 (Content), 6 (CRO) können parallel zu Modul 3 starten — siehe `docs/seo/PROMPT_LIBRARY.md` für die Prompts. **Hinweis**: Module 3–7 sind in `PROMPT_LIBRARY.md` (Stand 23.05.2026) noch NICHT spezifiziert — yusuf muss die noch liefern.

---

## 11. Anhang — Mappings zu Modul 0 / Modul 1

### 11.1 Wo wurden Recon-Findings (Modul 0) eingearbeitet?

| Recon-Finding | Wo in diesem Doc |
|---|---|
| §0.1 „Stuhlmiete" Sprachgebrauch | §2.6, §4.6, §4.7 |
| §0.2 Wettbewerber-Liste | §3.4 (Phase-3-Skalierung gegen Konkurrenten), Modul 5 |
| §0.4 PAA-Topthemen | §4.7 (Magazin), §4.8 (Lexikon), §4.10 (Tools) |
| §0.6 Top-10 Quick-Win-Targets | §4.6 (alle in URL-Map integriert) |

### 11.2 Wo wurden Audit-Findings (Modul 1) eingearbeitet?

| Audit-Finding | Wo in diesem Doc |
|---|---|
| F-112 Salon-Schema | §10 (Phase 1b) |
| F-118 hreflang | §3.3 Phase 2 |
| F-133 Search noindex | §1 P-31, §6, §7 |
| F-140 Auth aus Sitemap | §1 P-24, §6 |
| F-144 Rollen-Klärung | §1 P-03a/b/c, §9 Q-A |
| F-146 Stuhlmiete-URL | §2.6 |
| F-147 Products-Strategie | §1 P-41/P-42, §9 Q-E |
| F-148 Medical-Schema | §9 Q-C |
| F-150 Unklare Public-Routes | §1 P-44–P-48, §9 Q-F |
