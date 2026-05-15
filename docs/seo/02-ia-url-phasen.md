# ChairMatch IA + URL + Phasenmodell — v1.0

Architektur-Dokument für SEO-konforme Skalierung. Vorbedingung: Module 0 + 1 gelesen.

---

## 1. Seitentypen-Inventar

| ID | Seitentyp | URL-Pattern | Indexieren? | Phase |
|---|---|---|---|---|
| P-01 | Home | `/` | ✅ | 1 |
| P-02 | Was-ist-ChairMatch | `/was-ist-chairmatch` | ✅ | 1 |
| P-03 | Wie-es-funktioniert (Anbieter) | `/anbieter/wie-es-funktioniert` | ✅ | 1 |
| P-04 | Wie-es-funktioniert (Mieter) | `/mieter/wie-es-funktioniert` | ✅ | 1 |
| P-05 | Pricing/Provisionsmodell | `/provisionsmodell` | ✅ | 1 |
| P-06 | Stadt-Hub | `/[stadt]` | ⚠️ bei ≥3 Salons | 2 |
| P-07 | Stadt × Vertical | `/[stadt]/[vertical]` | ⚠️ bei ≥3 Salons | 2 |
| P-08 | Stadt × Vertical × Asset | `/[stadt]/[vertical]/[asset]-mieten` | ⚠️ bei ≥3 Salons | 2 |
| P-09 | Vertical-Deutschland-Hub | `/[vertical]-deutschland` | ✅ | 1 |
| P-10 | Asset-Glossar | `/lexikon/[term]` | ✅ | 1 |
| P-11 | Listing-Detail (Asset) | `/listings/[slug]` | ✅ | 1 |
| P-12 | Anbieter-Profil (Salon) | `/salons/[slug]` | ✅ | 1 |
| P-13 | Mieter-Profil | `/freelancer/[slug]` | ❌ Privatsphäre | — |
| P-14 | Magazin-Übersicht | `/magazin` | ✅ | 1 |
| P-15 | Magazin-Artikel | `/magazin/[slug]` | ✅ | 1 |
| P-16 | Help-Center | `/hilfe` | ✅ | 1 |
| P-17 | Help-Artikel | `/hilfe/[slug]` | ✅ | 1 |
| P-18 | Impressum | `/impressum` | ✅ (TMG Pflicht) | 1 |
| P-19 | Datenschutz | `/datenschutz` | ✅ (DSGVO Pflicht) | 1 |
| P-20 | AGB | `/agb` | ✅ | 1 |
| P-21 | AGB-Provider | `/agb-provider` | ✅ | 1 |
| P-22 | Cookie-Settings | `/cookie-settings` | ❌ noindex | — |
| P-23 | Auth (Login) | `/auth` | ❌ noindex | — |
| P-24 | Account-Dashboard | `/account/*` | ❌ noindex | — |
| P-25 | Admin-Dashboard | `/admin/*` | ❌ noindex | — |
| P-26 | API-Routes | `/api/*` | ❌ noindex (kein Crawl) | — |
| P-27 | Search-Ergebnisse | `/search?...` | ❌ noindex | — |
| P-28 | Suche/Explore | `/explore` | ⚠️ index aber dünn | 1 |
| P-29 | Offers/Angebote | `/offers` | ✅ | 1 |
| P-30 | Rentals | `/rentals` | ✅ | 1 |
| P-31 | Landing (Marketing) | `/landing` | ✅ | 1 |
| P-32 | Pitch (Investor) | `/pitch` | ⚠️ noindex (nicht Public) | — |
| P-33 | Statistik (Trust) | `/statistik` | ✅ | 1 |

---

## 2. URL-Konventionen

### 2.1 Pflicht-Regeln

1. **Sprache**: Phase 1 **OHNE** Sprach-Prefix (`/koeln/friseur`).
   Phase 2 mit 301 auf `/de/koeln/friseur` wenn EN/TR/FR aktiviert.
2. **Slug-Stil**: `kebab-case`, ASCII-only:
   - ä → ae, ö → oe, ü → ue, ß → ss
   - kein Leerzeichen, kein Underscore
   - Stop-Words raus: "in", "der", "die", "das"
3. **Trailing-Slash**: KEIN trailing slash (`/koeln` nicht `/koeln/`).
   In Next.js: `trailingSlash: false` (Default).
4. **Case-Sensitivity**: Komplett lowercase. Middleware redirect für
   uppercase-Varianten.
5. **Stabilität**: Einmal ausgegeben, NIE wieder ändern. Bei Bedarf
   301-Redirect.

### 2.2 Stadt-Slug-Whitelist

```
frankfurt, berlin, muenchen, hamburg, koeln,
duesseldorf, stuttgart, leipzig, dresden, hannover,
nuernberg, bremen, dortmund, essen, bonn,
mainz, mannheim, karlsruhe, wiesbaden, augsburg
```

Phase 1: nur die ersten 5. Phase 2: 6-10. Phase 3: alle 20+.

### 2.3 Vertical-Slug-Whitelist

```
barbershop, friseur, kosmetik, aesthetik, nagelstudio,
massage, lash-brows, arzt, op-raum
```

### 2.4 Asset-Slug-Whitelist

```
stuhl, liege, kabine, salonplatz, behandlungsraum,
op-raum, beauty-workspace
```

### 2.5 Beispiel-URLs

```
✅ Gut:
  /koeln
  /koeln/friseur
  /koeln/friseur/stuhl-mieten
  /friseur-deutschland
  /magazin/wie-funktioniert-stuhl-miete
  /lexikon/chair-rental
  /salons/maison-haarwerk-duesseldorf

❌ Schlecht:
  /Koeln/Friseur/                    — case + trailing slash
  /salons/maison-haarwerk?lang=de    — Sprache via Query
  /city/koeln                        — überflüssige Zwischenebene
  /salons/123-maison-haarwerk         — ID + Slug doppelt
```

---

## 3. Phasenmodell

### Phase 1 — Manual Lighthouses (0–50 Anbieter)

**Ziel**: SEO-Traffic AUFBAUEN bevor Listings da sind. Mit handgemachtem
Content + Topical Authority Top-3 in Money-Keywords erreichen.

**URL-Inventar Phase 1**:

- 5 Stadt-Hubs (Frankfurt, Berlin, München, Hamburg, Köln) —
  zunächst alle `noindex`, sobald 3+ Salons → index
- 5 Vertical-Deutschland-Hubs — alle indexiert (CTA Anbieter)
- 25 Stadt × Vertical-Pages — alle zunächst noindex, dynamisch
  freigeschaltet
- 10 Magazin-Artikel (aus den 20 PAA-Fragen Modul 0 → erste 10)
- 5 Lexikon-Einträge (chair-rental, salon-coworking, stuhl-miete,
  freelancer-friseur, op-raum-vermietung)
- Statische Pflicht-Pages (P-01 bis P-05, P-18 bis P-21) = ~10 Pages

**Total Phase 1: ~60 URLs sichtbar/indexierbar, ~25 latent (warten auf Listings)**

**Indexierungs-Strategie Phase 1**:
- Statische Pflicht-Pages: alle indexiert ab Tag 1
- Vertical-Hubs: alle indexiert ab Tag 1 (sind Provider-Akquise-Trichter)
- Stadt-Hubs: noindex bis 3+ Salons/Stadt
- Stadt × Vertical: noindex bis 3+ Salons/Stadt+Vertical
- Salon-Detail: indexiert pro Salon ab Activation
- Magazin: alle indexiert ab Publishing

### Phase 2 — Selective Programmatic (50–500 Anbieter)

**Phase-Gate-Bedingung**: ≥50 aktive Anbieter UND ≥3 Anbieter in
mind. 5 Stadt+Vertical-Kombinationen.

**Was passiert**:
- Stadt-Hubs der ersten 10 Städte werden aktiv indexiert
- Stadt × Vertical: pro Kombi mit ≥3 Listings → `index`, sonst `noindex`
- Stadt × Vertical × Asset: nur die TOP-5 Kombinationen pro Vertical
- 10 weitere Magazin-Artikel
- i18n-Vorbereitung: hreflang für DE→EN aktivieren

### Phase 3 — Full Skalierung (500+ Anbieter)

**Phase-Gate-Bedingung**: ≥500 aktive Anbieter UND ≥20 Städte mit
≥3 Anbietern.

**Was passiert**:
- Top-50-Städte automatisch indexiert
- Mikro-Standorte (Stadtteile) als URL: `/koeln/ehrenfeld/friseur`
- Asset-Typ-Differenzierung: `/koeln/friseur/stuhl` vs.
  `/koeln/friseur/kabine`
- i18n-Rollout: TR, EN, FR, ES, IT, PL, AR
- Programmatic Magazin-Generation (mit human-curated review!)

---

## 4. URL-Map Phase 1 (komplette Launch-URL-Liste)

### 4.1 Statische Pflicht-Pages (10)

```
/
/was-ist-chairmatch
/anbieter/wie-es-funktioniert
/mieter/wie-es-funktioniert
/provisionsmodell
/magazin
/hilfe
/impressum
/datenschutz
/agb
/agb-provider
```

### 4.2 Vertical-Deutschland-Hubs (5)

```
/barbershop-deutschland
/friseur-deutschland
/kosmetik-deutschland
/nagelstudio-deutschland
/lash-brows-deutschland
```

### 4.3 Stadt-Hubs Phase 1 (5, alle latent)

```
/frankfurt
/berlin
/muenchen
/hamburg
/koeln
```

### 4.4 Stadt × Vertical Phase 1 (25, alle latent)

```
/frankfurt/barbershop  /berlin/barbershop  /muenchen/barbershop  /hamburg/barbershop  /koeln/barbershop
/frankfurt/friseur     /berlin/friseur     /muenchen/friseur     /hamburg/friseur     /koeln/friseur
/frankfurt/kosmetik    /berlin/kosmetik    /muenchen/kosmetik    /hamburg/kosmetik    /koeln/kosmetik
/frankfurt/nagelstudio /berlin/nagelstudio /muenchen/nagelstudio /hamburg/nagelstudio /koeln/nagelstudio
/frankfurt/lash-brows  /berlin/lash-brows  /muenchen/lash-brows  /hamburg/lash-brows  /koeln/lash-brows
```

### 4.5 Stadt × Vertical × Asset Phase 1 (Top-10 Kombis)

```
/frankfurt/barbershop/stuhl-mieten
/frankfurt/friseur/stuhl-mieten
/berlin/lash-brows/platz-mieten
/muenchen/kosmetik/kabine-mieten
/hamburg/friseur/stuhl-mieten
/koeln/friseur/stuhl-mieten
/koeln/kosmetik/kabine-mieten
/frankfurt/op-raum-mieten
/berlin/op-raum-mieten
/duesseldorf/friseur/stuhl-mieten  (Bonus, falls Köln-Cluster)
```

### 4.6 Magazin-Artikel Phase 1 (10)

```
/magazin/wie-funktioniert-stuhl-miete
/magazin/checkliste-salonplatz-mieten
/magazin/steuern-bei-stuhl-miete
/magazin/scheinselbstaendigkeit-vermeiden
/magazin/preise-friseurstuhl-miete-deutschland
/magazin/freelancer-friseur-werden
/magazin/op-raum-vermietung-hygienevorschriften
/magazin/lash-business-aufbauen-stuhl-miete
/magazin/passives-einkommen-salon-vermietung
/magazin/vertrag-stuhl-miete-was-rein-muss
```

### 4.7 Lexikon Phase 1 (5)

```
/lexikon/chair-rental
/lexikon/salon-coworking
/lexikon/stuhl-miete
/lexikon/freelancer-friseur
/lexikon/op-raum-vermietung
```

**Phase 1 Total**: ~60 indexierbare + 30 latente URLs.

---

## 5. Interne Verlinkungs-Architektur

### 5.1 Hub-and-Spoke pro Stadt

```
                  /koeln (Stadt-Hub)
                 /  |  |  |  \
                /   |  |  |   \
   /koeln/barber  /koeln/friseur  /koeln/kosmetik  /koeln/nail  /koeln/lash
        |              |               |                |             |
   3-5 Salons      3-5 Salons      3-5 Salons      3-5 Salons    3-5 Salons
```

Die Stadt-Hub-Page enthält:
- 5 große Vertical-Cards mit jeweils 3 Top-Salons als Preview
- Stadt-Marktinfo (300+ Wörter)
- Lokale FAQ (5-7 Fragen)
- Breadcrumb: Home → Köln

### 5.2 Vertical-Hub-Cross-Linking

`/friseur-deutschland` linkt zu allen Stadt × Friseur-Pages.
`/koeln/friseur` linkt zurück zu `/friseur-deutschland` UND
seitlich zu `/koeln/barbershop` (verwandte Kategorie).

### 5.3 Footer-Mega-Links

20-30 wichtige URLs im Footer für Crawl-Discovery:

```
Spalte 1 — Beauty-Profis:    Spalte 2 — Städte:       Spalte 3 — Kategorien:
- Anbieter werden            - Friseurstuhl Köln       - Friseur Deutschland
- Provisionsmodell           - Barberstuhl Frankfurt   - Barbershop Deutschland
- Provider-AGB               - Kosmetikraum Berlin     - Kosmetik Deutschland
- Help-Center                - Friseurstuhl München    - Nagelstudio Deutschland
- Magazin                    - Lash-Studio Berlin      - Lash & Brows Deutschland
```

### 5.4 Magazin → Money-Page Internal Links

Jeder Magazin-Artikel enthält 3-5 kontextuelle Anchor-Texts die zu
Money-Pages führen. Beispiel:

`/magazin/wie-funktioniert-stuhl-miete` enthält:
> "Wer in Köln einen [Friseurstuhl mieten](/koeln/friseur/stuhl-mieten)
> will, hat aktuell zwei Optionen..."

### 5.5 "Ähnliche Listings"-Module

Auf Salon-Detail-Pages: 4 Boxen mit
- Salons gleicher Kategorie in derselben Stadt
- Salons in benachbarter Stadt mit gleicher Kategorie

---

## 6. Indexierungs-Strategie pro Seitentyp (komplett)

| Seitentyp | robots-Meta | Canonical | Sitemap | Begründung |
|---|---|---|---|---|
| Home | index,follow | self | ✅ | Pflicht |
| Was-ist | index,follow | self | ✅ | Entity-Aufbau |
| Anbieter-Funkt. | index,follow | self | ✅ | Provider-Akquise |
| Mieter-Funkt. | index,follow | self | ✅ | Mieter-Akquise |
| Provisionsmodell | index,follow | self | ✅ | Trust-Signal |
| Stadt-Hub | bedingt (≥3 Salons) | self | bedingt | Soft-404-Schutz |
| Stadt × Vertical | bedingt (≥3 Salons) | self | bedingt | Soft-404-Schutz |
| Stadt × Vertical × Asset | bedingt | self | bedingt | Soft-404-Schutz |
| Vertical-DE-Hub | index,follow | self | ✅ | Provider-Akquise |
| Salon-Detail | index,follow | self | ✅ | Money-Page |
| Magazin-Übersicht | index,follow | self | ✅ | Hub-Page |
| Magazin-Artikel | index,follow | self | ✅ | Topical Authority |
| Help-Center | index,follow | self | ✅ | E-E-A-T |
| Lexikon | index,follow | self | ✅ | Glossar-Authority |
| Impressum/AGB/etc | index,follow | self | ✅ | Trust + TMG-Pflicht |
| Cookie-Settings | noindex,follow | self | ❌ | UX-Page, kein SEO-Wert |
| Auth | noindex,follow | self | ❌ | Funktional |
| /account/* | noindex,nofollow | n/a | ❌ | Privat |
| /admin/* | noindex,nofollow | n/a | ❌ | Privat |
| /api/* | n/a (robots.txt) | n/a | ❌ | Maschinen-API |
| /search | noindex,follow | /explore | ❌ | Duplicate-Risk |
| /explore | index,follow | self | ✅ | Discovery-Page |
| /offers | index,follow | self | ✅ | Conversion-Page |
| /pitch | noindex,nofollow | n/a | ❌ | Investor-only |

---

## 7. Faceted-Search-Handling

### 7.1 Problem

`/explore?category=barber&city=koeln&priceMin=20&priceMax=80` ergibt
beliebige Kombinationen — kombinatorische Explosion ist SEO-Gift.

### 7.2 Lösung

**Whitelist-Strategie**: Nur SAUBERE URLs werden indexierbar:
- `/koeln/barbershop` ✅ index
- `/explore?category=barber&city=koeln` ❌ noindex + canonical zu `/koeln/barbershop`

**Konkrete Implementierung**:

1. `/explore` mit Filter-Query: `<meta name="robots" content="noindex,follow">`
2. `<link rel="canonical" href="/[stadt]/[vertical]">` (falls die
   Filter-Kombination einer indexierbaren Page entspricht).
3. Falls die Filter-Kombination KEINE eigene Page hat (z.B.
   `priceMin=50&priceMax=70`): canonical zur Basis-`/explore` ohne Filter.

### 7.3 Filter-URL-Indexierung — wann ja?

Nur bei diesen Filter-Kombinationen ist eine indexierbare Filter-URL
sinnvoll:

- City-Only: `/explore?city=koeln` → canonical zu `/koeln`
- Category-Only: `/explore?category=friseur` → canonical zu `/friseur-deutschland`
- City + Category: → canonical zu `/koeln/friseur`
- Alles andere: `noindex` + canonical zur Basis

---

## 8. Next.js App Router File-Tree (Phase 1)

```
src/app/
├── (marketing)/                          # NEUE GROUP
│   ├── page.tsx                          # P-01 Home (umzieht aus root)
│   ├── was-ist-chairmatch/
│   │   └── page.tsx                      # P-02
│   ├── anbieter/
│   │   └── wie-es-funktioniert/
│   │       └── page.tsx                  # P-03
│   ├── mieter/
│   │   └── wie-es-funktioniert/
│   │       └── page.tsx                  # P-04
│   ├── provisionsmodell/
│   │   └── page.tsx                      # P-05
│   ├── [stadt]/                          # Dynamic Stadt-Hub
│   │   ├── page.tsx                      # P-06 (bedingt indexiert)
│   │   ├── [vertical]/                   # Stadt × Vertical
│   │   │   ├── page.tsx                  # P-07
│   │   │   └── [asset]-mieten/
│   │   │       └── page.tsx              # P-08
│   ├── [vertical]-deutschland/           # Vertical-Hubs
│   │   └── page.tsx                      # P-09 (5 statische)
│   ├── magazin/
│   │   ├── page.tsx                      # P-14
│   │   └── [slug]/
│   │       └── page.tsx                  # P-15
│   ├── hilfe/
│   │   ├── page.tsx                      # P-16
│   │   └── [slug]/
│   │       └── page.tsx                  # P-17
│   └── lexikon/
│       └── [term]/
│           └── page.tsx                  # P-10
├── (public)/                             # EXISTIEREND, behalten
│   ├── salon/[slug]/page.tsx             # P-12
│   ├── explore/page.tsx                  # P-28
│   ├── offers/page.tsx                   # P-29
│   ├── rentals/page.tsx                  # P-30
│   ├── search/page.tsx                   # P-27 (noindex)
│   ├── statistik/page.tsx                # P-33
│   ├── impressum/page.tsx                # P-18
│   ├── datenschutz/page.tsx              # P-19
│   ├── agb/page.tsx                      # P-20
│   └── agb-provider/page.tsx             # P-21
├── listings/
│   └── [slug]/
│       └── page.tsx                      # P-11 (zukünftig — Phase 2)
└── ...
```

---

## 9. Open Questions an Yusuf (vor Modul 3)

### Q-1: Phase-1 Stadt-Auswahl bestätigt?

Frankfurt, Berlin, München, Hamburg, Köln — oder andere?
Vorschlag-Begründung: 5 größte DE-Beauty-Märkte mit etablierten
Freelancer-Szenen.

### Q-2: Sprach-Prefix in URLs

Phase 1 ohne Prefix (`/koeln`), Phase 2 mit 301-Redirect zu `/de/koeln`.
**OK?**

### Q-3: Schwelle für Soft-404-Schutz

≥3 Listings pro Stadt+Vertical für Indexierung.
**OK oder anpassen?**

### Q-4: Magazin-Brand-Name

"Magazin" oder "Blog" oder "ChairMatch Journal"?
Empfehlung: **"Magazin"** (premium-Anmutung, B2B-passend).

### Q-5: Anbieter-Profil-Slug

`/salons/maison-haarwerk` ODER `/salons/maison-haarwerk-duesseldorf`?
Letzteres ist SEO-stärker (Stadt im Slug). Empfehlung:
**`{name}-{stadt}`-Format**.

### Q-6: Listing vs. Salon

ChairMatch hat 2 Konzepte:
- **Salon** = Anbieter-Geschäft (z.B. "Maison Haarwerk")
- **Listing** = einzelnes Asset (z.B. "Stuhl 3 bei Maison Haarwerk")

URL-Frage: Hat jedes Listing eine eigene Page (`/listings/[slug]`)
ODER nur eine Anchor auf der Salon-Detail-Page?
Empfehlung Phase 1: **Listings nur als Anchor**.
Phase 2: eigene Pages für Top-Listings (Long-Tail-Money).

### Q-7: Investor-Pitch-Page

`/pitch` ist aktuell public. Soll Investor-Pitch INDEX bleiben
(Trust-Signal) oder noindex (Privatsphäre)?
Empfehlung: **noindex**, mit Token-basiertem Share-Link für Investoren.

### Q-8: hreflang-Pflicht für Phase 1?

Nur DE Phase 1 → kein hreflang nötig. Bei Phase-2-Migration nach
`/de/`-Prefix kommen hreflang-Tags automatisch.
**OK so?**

---

## Übergabe-Status für Modul 3

Modul 3 (Tech-SEO-Implementation) kann jetzt:
1. URL-Routen anlegen exakt nach File-Tree (§8)
2. `lib/seo.ts` Helper bauen: `shouldIndex()`, `generateBreadcrumbs()`, etc.
3. Quick-Wins aus Modul 1 (QW-1 bis QW-10) parallel umsetzen
4. Phase 1 URL-Map (§4) als Sprint-Backlog nutzen

Module 4, 5, 6 können parallel zu Modul 3 starten sobald URLs stehen.
