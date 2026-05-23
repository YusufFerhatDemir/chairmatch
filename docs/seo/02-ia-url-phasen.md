# ChairMatch IA + URL + Phasenmodell — v3.0 (Stand 23.05.2026)

Architektur-Dokument für SEO-konforme Skalierung als **Multi-Vertical-Marktplatz**.
Vorbedingung: Module 0 (Recon inkl. Update 2026-05-22) + 1 (Audit v2, Stand
23.05.2026) gelesen.

> **Was hat sich gegenüber v2.0 (23.05.2026 vormittags) geändert?**
>
> - **Plattform-Modell explizit dokumentiert**: ChairMatch ist eine reine Vermittler-Plattform nach Airbnb-Prinzip — betreibt nichts selbst, verkauft nichts selbst, behandelt nichts selbst. Einnahmen ausschließlich aus Abo + Provision + Vermittlungsmarge.
> - **5 Geschäftsbereiche** sind jetzt vollständig in der IA: Vermietung, Drittanbieter, Shop/Affiliate, Beauty-Tourismus, Versicherung.
> - **Risiko-gestaffeltes Launch-Modell** (Wellen 🟢/🟡/🔴) statt monolithischer „Phase 1".
> - **Rollen-Modell finalisiert** (siehe §0): Mieter = Freelancer, Vermieter = Betreiber, Anbieter = Dienstleister-Rolle (kann jeder haben).
> - **Beauty-Tourismus-Bereich** ist im Code anzulegen, aber per `noindex` + Sitemap-Exclude + nicht in Navigation **gated** bis Medizinrecht-/HWG-Anwalt freigegeben hat.
> - Neue Seitentypen-Cluster: Drittanbieter (P-50..P-54), Versicherung (P-60..P-62), Beauty-Tourismus (P-70..P-74), Affiliate-Shop-Vendor-Profile (P-49).

---

## 0. Rollen-Modell (verbindlich, vom Gründer bestätigt)

| Rolle | Definition | URL-Namespace | Indexierbares öffentliches Profil? |
|---|---|---|---|
| **Mieter** | Freelancer / Selbstständiger, der einen Stuhl, Platz oder Raum mietet | `/mieter/*` | ❌ nein (Privatsphäre) — Profile nur intern sichtbar |
| **Vermieter** | Betreiber, der einen Salon / Räume besitzt und Stühle/Plätze/Räume vermietet | `/vermieter/*` | ✅ ja (Salon-Detail-Page als „Marketplace-Schaufenster") |
| **Anbieter** | Dienstleister-Rolle. Freelancer ist IMMER Anbieter. Vermieter KANN Anbieter sein. Externe Drittanbieter ebenfalls. | `/anbieter/[slug]` | ✅ ja (öffentliches Dienstleister-Profil) |

**Wichtig**: „Anbieter" ist **keine eigene User-Rolle**, sondern ein **Status / Feature-Flag** für jeden Account, der öffentlich Dienstleistungen anbietet. Im Code: `user.has_provider_profile = true`.

**Redirects zu setzen** (Modul 3):

```
/anbieter/wie-es-funktioniert  →  bleibt (öffentliche Erklärseite für die Rolle)
/anbieter/onboarding           →  bleibt (Setup-Flow für Dienstleister)
/vermieter/wie-es-funktioniert →  Phase 1b neu anlegen
```

**F-144 aufgelöst** durch dieses Modell: Drei Pfade nebeneinander sind OK, weil drei semantisch unterschiedliche Konzepte (Mieter-Flow, Vermieter-Flow, Anbieter-Profil).

---

## 0a. Die 5 Geschäftsbereiche (Multi-Vertical-Marktplatz)

Plattform-Prinzip: **Airbnb-Modell** — ChairMatch besitzt nichts, verkauft nichts, behandelt nichts. Sämtliche Verträge laufen zwischen den Marktplatz-Teilnehmern; ChairMatch ist nur Vermittler.

| # | Bereich | Was wird vermittelt? | Einnahmequelle ChairMatch | Risiko-Welle |
|---|---|---|---|---|
| 1 | **Vermietung** | Stuhl / Platz / Raum zwischen Vermieter und Mieter | Abo (Vermieter) + Vermittlungsmarge | 🟢 Welle 1 |
| 2 | **Drittanbieter** | Externe Dienstleister (z.B. Haartransplantations-Anbieter) mieten Räume über die App. Optionaler Zusatzservice: **reine Bearbeitungsgebühr** für Dokumenten-Anträge beim Gesundheitsamt (KEINE Genehmigungs-Garantie). | Abo + Vermittlungsmarge + ggf. Bearbeitungs-Pauschale | 🟡 Welle 2 |
| 3 | **Shop / Affiliate** | Beauty-Produkte (Wax, Gel, Kosmetik). ChairMatch verkauft **nichts selbst**, hat **keine** Eigenmarke, **keine** Vertriebspartnerschaften. Verkäufer bieten an, tragen die Produkthaftung. | Abo (Verkäufer) + Marge pro Transaktion | 🟢 Welle 1 (Grundstruktur) |
| 4 | **Beauty-Tourismus** | Anbieter — überwiegend Türkei — bewerben Behandlungen (Haartransplantation, Zähne, Augen, ästhetische Eingriffe). Vermittlung an deutsche Endkunden. | Vermittlungsprovision pro Kunde | 🔴 Welle 3 (gated bis Anwalt) |
| 5 | **Versicherung** | Versicherungs-Vermittlung (Berufshaftpflicht für Freelancer, Inhalts-Versicherung für Vermieter usw.). Nur Marktplatz, keine eigene Vermittler-Lizenz aktivieren bis geklärt. | Vermittlungsprovision | 🟡 Welle 2 |

**Glasklare Formulierungs-Regeln** (für ALLE Bereiche):

- Bereich 2 (Gesundheitsamt-Bearbeitung): **„Bearbeitungsgebühr für die Antragsstellung — KEINE Garantie für Genehmigung, KEINE Rechtsberatung, KEINE Erfolgshaftung."** Muss auf jeder relevanten Page als Disclaimer erscheinen.
- Bereich 3 (Shop): **„ChairMatch betreibt einen Marktplatz. Verkäufer tragen die Produkthaftung gemäß § 1 ProdHaftG. Wir verkaufen nichts selbst und führen keine Qualitätsprüfung durch."**
- Bereich 4 (Beauty-Tourismus): **„ChairMatch ist Vermittler nach § 312k BGB analog, kein medizinischer Dienstleister. Wir geben keine medizinische Empfehlung, keine Wirksamkeits-Garantie. Behandlungen erfolgen ausschließlich beim ausgewählten Anbieter unter dessen alleiniger Verantwortung."** — UND HWG-konforme Restriktion bei Vorher/Nachher-Bildern bis Anwalt-Freigabe.
- Bereich 5 (Versicherung): **„ChairMatch ist Vermittler nach § 34d GewO und vermittelt ausschließlich zwischen Nutzern und lizenzierten Versicherungsunternehmen. Eigene Vertragspartner werden wir erst, wenn die Lizenz beantragt wurde — siehe RECHTLICHES_SETUP.md."**

---

## 0b. Risiko-gestaffeltes Wellen-Launch-Modell

Statt einer monolithischen „Phase 1" wird der Launch in **drei Wellen** gestaffelt — orientiert am rechtlichen Risiko, NICHT am Code-Aufwand.

### 🟢 Welle 1 — sofort live, geringes Risiko

**Inhalt**:
- Vermietung (Bereich 1): vollständig (Vermieter/Mieter-Flows, Salon-Detail, Stadt × Vertical, Anbieter-Profile)
- Shop / Affiliate (Bereich 3): Grundstruktur (`/shop`, `/produkte/...`, Vendor-Profile) — Verkäufer-Onboarding manuell + AGB mit klarer Produkthaftungs-Verlagerung

**Voraussetzung Launch**: Generator-erstellte Pflicht-Rechtstexte (siehe `RECHTLICHES_SETUP.md`), funktionierende Melde-/Reporting-Funktion (DSA), Cookie-Consent.

**Indexierung**: `index, follow` für alle Hub- und Money-Pages.

### 🟡 Welle 2 — nach Stabilisierung Welle 1 (4–8 Wochen)

**Inhalt**:
- Drittanbieter (Bereich 2): Raum-Vermietung an externe Dienstleister + optionale Bearbeitungsgebühr für Gesundheitsamts-Anträge mit klar formulierten Disclaimern
- Versicherungs-Vermittlung (Bereich 5): nur als Markt­platz-Listing-Funktion (kein eigener Vertrieb)

**Voraussetzung**:
- Welle 1 läuft stabil (≥4 Wochen Live ohne Major-Incident)
- AGB-Ergänzung für Drittanbieter (Generator-Vorlage + interne Review)
- Versicherungs-Welle braucht Klarstellung: NUR Vermittlung. Kein Eigenvertrieb.

**Indexierung**: `index, follow` mit erhöhter Disclaimer-Sichtbarkeit (Sticky-Banner auf den Page-Templates).

### 🔴 Welle 3 — gated, NICHT öffentlich, NICHT indexiert

**Inhalt**:
- Beauty-Tourismus (Bereich 4): vollständige Code-Struktur (URLs, Templates, DB-Schema), aber:
  - `<meta name="robots" content="noindex, nofollow">` hart in der Page-Metadata
  - **NICHT in `sitemap.ts` enthalten**
  - **NICHT in Navigation, Footer, internen Links**
  - Zugang nur via Direct-Link + ggf. Token (z.B. `/beauty-reisen?token=...`)
  - Klarer „Pre-Launch / Anwalt-Review läuft"-Banner

**Voraussetzung Freigabe → Welle 3 live**:
1. Schriftliche Freigabe durch Medizinrecht-/HWG-Anwalt (`docs/legal/HWG-FREIGABE.md` als Hash-Hinterlegung)
2. Vermittler-Disclaimer rechtsverbindlich abgenommen
3. Anbieter-Vetting-Prozess (Lizenz-Check) dokumentiert
4. Vorher/Nachher-Bilder-Policy HWG-konform (§ 11 HWG)
5. „Sterilität/Klinik-Standard"-Aussagen entfernt oder fachärztlich verifiziert

Erst dann: `robots: { index: true }`, Sitemap-Aufnahme, Navigation-Link.

**Wichtig für Modul 3**: Welle-3-Routen werden **gebaut**, aber die Sitemap-Logik schließt sie standardmäßig per Feature-Flag aus:

```typescript
// src/lib/seo-data/wellen.ts (NEU, Modul 3)
export const WELLEN_FREIGABE = {
  vermietung: true,        // Welle 1
  shop: true,              // Welle 1
  drittanbieter: false,    // Welle 2 — aktivieren wenn AGB-Ergänzung live
  versicherung: false,     // Welle 2
  beauty_reisen: false,    // Welle 3 — aktivieren NACH Anwalt-Freigabe
} as const
```

`sitemap.ts` und `robots.ts` lesen diesen Flag.

---

## 1. Seitentypen-Inventar (Multi-Vertical-Vollausbau)

Status-Spalte: ✅ live in Code | 🟡 teilweise live | ❌ fehlt | ⛔ explizit ausgeschlossen | 🆕 NEU in v3.0

### 1.1 Bereich 1 — Vermietung (Welle 🟢 1)

| ID | Seitentyp | URL-Pattern | Indexieren? | Status | Phase |
|---|---|---|---|---|---|
| P-01 | Home | `/` | ✅ | ✅ live | 1a |
| P-02 | Was-ist-ChairMatch | `/was-ist-chairmatch` | ✅ | ✅ live | 1a |
| P-03a | Wie-es-funktioniert (Anbieter) | `/anbieter/wie-es-funktioniert` | ✅ | ✅ live | 1a |
| P-03b | Wie-es-funktioniert (Mieter) | `/mieter/wie-es-funktioniert` | ✅ | ✅ live | 1a |
| P-03c | Wie-es-funktioniert (Vermieter) | `/vermieter/wie-es-funktioniert` | ✅ | ❌ fehlt | 1b |
| P-04 | Provisionsmodell | `/provisionsmodell` | ✅ | ✅ live | 1a |
| P-05 | FAQ | `/faq` | ✅ | ✅ live | 1a |
| P-06 | Stadt-Hub | `/[stadt]` | ⚠️ bei ≥3 Salons | ✅ live (5 Phase-1-Städte) | 1a |
| P-07 | Stadt × Vertical | `/[stadt]/[vertical]` | ⚠️ bei ≥3 Salons | ✅ live | 1a |
| P-08 | Stadt × Vertical × Asset | `/[stadt]/[vertical]/[asset]-mieten` | ⚠️ bei ≥3 Salons | ❌ fehlt | 1b |
| P-09 | Vertical-Deutschland-Hub | `/[vertical]-deutschland` | ✅ | ✅ live (5 Pages) | 1a |
| P-10 | Lexikon-Eintrag | `/lexikon/[term]` | ✅ | ❌ fehlt | 1b |
| P-11 | Listing-Detail | `/listings/[slug]` | ✅ | ✅ live | 1b |
| P-12 | Salon-Detail | `/salon/[slug]` | ✅ | ✅ live | 1a |
| P-13 | Mieter-Profil (intern) | `/mieter/mein-bereich` | ⛔ noindex | ✅ live | — |
| P-14 | Magazin-Übersicht | `/magazin` | ✅ | ✅ live | 1a |
| P-15 | Magazin-Artikel | `/magazin/[slug]` | ✅ | ✅ live | 1a |
| P-16 | Help-Center-Übersicht | `/hilfe` | ✅ | ❌ fehlt | 2 |
| P-17 | Help-Center-Artikel | `/hilfe/[slug]` | ✅ | ❌ fehlt | 2 |
| P-32 | Explore (Discovery) | `/explore` | ✅ | ✅ live | 1a |
| P-33 | Offers | `/offers` | ✅ | ✅ live | 1a |
| P-34 | Rentals | `/rentals` | ✅ | ✅ live | 1a |
| P-37 | Statistik (Trust) | `/statistik` | ✅ | ✅ live | 1a |
| P-38 | Kategorie-Hub | `/category/[categoryId]` | ✅ | ✅ live | 1a |
| P-43 | Freelancer-Rechner (Tool) | `/freelancer-rechner` | ✅ | ✅ live | 1a |
| P-90 🆕 | Anbieter-Profil (öffentlich) | `/anbieter/[slug]` | ✅ | ❌ fehlt | 1b |
| P-91 🆕 | Anbieter-Übersicht | `/anbieter` (Verzeichnis) | ✅ | ❌ fehlt | 1b |

### 1.2 Bereich 3 — Shop / Affiliate (Welle 🟢 1)

| ID | Seitentyp | URL-Pattern | Indexieren? | Status | Phase |
|---|---|---|---|---|---|
| P-41 | Shop-Übersicht | `/produkte` (Konsolidierung von `/products`) | ✅ | 🟡 als `/products` live | 1a |
| P-42 | Produkt-Detail | `/produkte/[slug]` (statt `/shop/[slug]`) | ✅ | 🟡 als `/shop/[slug]` live | 1a |
| P-49 🆕 | Verkäufer-Profil | `/verkaeufer/[slug]` | ✅ | ❌ fehlt | 1b |
| P-92 🆕 | Produkt-Kategorie | `/produkte/[kategorie]` (z.B. `/produkte/wax`, `/produkte/gel`, `/produkte/kosmetik`) | ✅ | ❌ fehlt | 1b |
| P-93 🆕 | Verkäufer werden | `/verkaeufer/onboarding` | ⛔ noindex | ❌ fehlt | 1b |
| P-94 🆕 | Verkäufer-AGB | `/agb-verkaeufer` | ✅ | ❌ fehlt | 1a (vor Launch Welle 1) |

**Wichtig**: Bisherige `/products` und `/shop/[slug]` bleiben mit 301-Redirect erhalten — neue Canonical-URLs sind `/produkte` und `/produkte/[slug]`. Begründung: deutsche Slugs konsistent zum Rest der Plattform.

### 1.3 Bereich 2 — Drittanbieter (Welle 🟡 2)

| ID | Seitentyp | URL-Pattern | Indexieren? | Status | Phase |
|---|---|---|---|---|---|
| P-50 🆕 | Drittanbieter-Übersicht | `/drittanbieter` | ✅ (nach Freigabe Welle 2) | ❌ fehlt | 2 |
| P-51 🆕 | Drittanbieter „Wie es funktioniert" | `/drittanbieter/wie-es-funktioniert` | ✅ | ❌ fehlt | 2 |
| P-52 🆕 | Raum-Vermietung für Externe | `/drittanbieter/raum-mieten` | ✅ | ❌ fehlt | 2 |
| P-53 🆕 | Antragsservice Gesundheitsamt | `/drittanbieter/antragsservice` | ✅ mit Disclaimer-Sticky | ❌ fehlt | 2 |
| P-54 🆕 | Drittanbieter-AGB | `/agb-drittanbieter` | ✅ | ❌ fehlt | 2 (vor Launch Welle 2) |

**Disclaimer-Pflicht P-53**:
> „Diese Bearbeitungsgebühr deckt ausschließlich die formale Antragsstellung beim zuständigen Gesundheitsamt ab. ChairMatch garantiert KEINE Genehmigung, übernimmt KEINE Rechtsberatung, übernimmt KEINE Erfolgshaftung. Der Anbieter trägt die volle Verantwortung für die Richtigkeit der Antragsunterlagen und die Einhaltung aller gesundheits- und gewerberechtlichen Vorgaben."

### 1.4 Bereich 5 — Versicherung (Welle 🟡 2)

| ID | Seitentyp | URL-Pattern | Indexieren? | Status | Phase |
|---|---|---|---|---|---|
| P-60 🆕 | Versicherung-Übersicht | `/versicherung` | ✅ (nach Freigabe Welle 2) | ❌ fehlt | 2 |
| P-61 🆕 | Versicherungs-Angebote | `/versicherung/[produkt]` (z.B. `/versicherung/berufshaftpflicht`, `/versicherung/inhaltsversicherung`) | ✅ | ❌ fehlt | 2 |
| P-62 🆕 | Versicherungs-Vermittler-Hinweis | `/versicherung/vermittler-hinweis` (§ 34d GewO Pflicht-Info, sobald Lizenz vorhanden) | ✅ | ❌ fehlt | 2 |

**Wichtig**: Welle 2 startet zunächst als reine **Vergleichs-/Vermittler-Listings-Page** ohne Provision (Affiliate-Modell). Provisions-Vermittlung erst, sobald § 34d GewO-Lizenz vorliegt.

### 1.5 Bereich 4 — Beauty-Tourismus (Welle 🔴 3 — GATED)

| ID | Seitentyp | URL-Pattern | Indexieren? | Status | Phase |
|---|---|---|---|---|---|
| P-70 🆕 | Beauty-Tourismus-Hub | `/beauty-reisen` | ⛔ **noindex bis Anwalt** | ❌ fehlt | 3 |
| P-71 🆕 | Behandlungs-Übersicht | `/beauty-reisen/[behandlung]` (z.B. `/beauty-reisen/haartransplantation`) | ⛔ noindex bis Anwalt | ❌ fehlt | 3 |
| P-72 🆕 | Anbieter-Detail | `/beauty-reisen/anbieter/[slug]` | ⛔ noindex bis Anwalt | ❌ fehlt | 3 |
| P-73 🆕 | Standort-Hub | `/beauty-reisen/[land]/[stadt]` (z.B. `/beauty-reisen/tuerkei/istanbul`) | ⛔ noindex bis Anwalt | ❌ fehlt | 3 |
| P-74 🆕 | Beauty-Reisen-Disclaimer | `/beauty-reisen/disclaimer` | ⛔ noindex bis Anwalt | ❌ fehlt | 3 |

**Gating-Mechanik (Modul 3 Implementation)**:
1. Alle Routen existieren im Code unter `(public)/beauty-reisen/...`
2. Layout-File `(public)/beauty-reisen/layout.tsx` setzt **hart** `export const metadata = { robots: { index: false, follow: false } }`
3. `sitemap.ts` schließt `/beauty-reisen/*` per Feature-Flag aus (`WELLEN_FREIGABE.beauty_reisen`)
4. Keine internen Links aus Navigation, Footer, anderen Pages
5. Optional: Mittlere-Sicherheit-Token in URL (`?preview={{TOKEN}}`)
6. **Banner-Komponente** „🔴 Pre-Launch — Anwalt-Review läuft" auf jeder Welle-3-Page

**HWG-spezifische Content-Regeln** (für Modul 5 / Content-Team):
- Keine Heilversprechen, keine Vorher/Nachher-Bilder ohne Aufklärung gemäß § 11 HWG
- Keine Preise als Marketing-Hook
- Reisemedizinische Risiken müssen genannt sein
- Sprache: Niemals „garantiert", „risikofrei", „100% sicher"

### 1.6 Pflicht-Rechtsseiten (alle Wellen)

| ID | Seitentyp | URL-Pattern | Indexieren? | Status | Phase |
|---|---|---|---|---|---|
| P-18 | Impressum | `/impressum` | ✅ (TMG-Pflicht) | ✅ live | 1a |
| P-19 | Datenschutz | `/datenschutz` | ✅ (DSGVO-Pflicht) | ✅ live | 1a |
| P-20 | AGB (Kunde) | `/agb` | ✅ | ✅ live | 1a |
| P-21 | AGB (Provider) | `/agb-provider` | ✅ | ✅ live | 1a |
| P-22 | Widerruf | `/widerruf` | ✅ | ✅ live | 1a |
| P-23 | Cookie-Settings | `/cookie-settings` | ⛔ noindex | ✅ live | — |
| P-95 🆕 | DSA-Melde-Funktion (Trusted Flagger) | `/melden` | ✅ | ❌ fehlt | 1a (vor Launch) |
| P-94 🆕 | Verkäufer-AGB | `/agb-verkaeufer` | ✅ | ❌ fehlt | 1a (vor Welle 1 Shop) |
| P-54 🆕 | Drittanbieter-AGB | `/agb-drittanbieter` | ✅ | ❌ fehlt | 2 |
| P-96 🆕 | Beauty-Reisen-AGB | `/agb-beauty-reisen` | ⛔ noindex bis Anwalt | ❌ fehlt | 3 |

### 1.7 Account / Geschützte Bereiche (unverändert)

| ID | Seitentyp | URL-Pattern | Indexieren? | Status | Phase |
|---|---|---|---|---|---|
| P-24 | Auth | `/auth`, `/auth/*` | ⛔ noindex | 🟡 Bug F-140 | — |
| P-25 | Account-Dashboard | `/account/*` | ⛔ noindex | ✅ | — |
| P-26 | Provider-Dashboard | `/provider/*` | ⛔ noindex | ✅ | — |
| P-27 | Owner-Bereich | `/owner/*` | ⛔ noindex | ✅ | — |
| P-28 | Investor-Bereich | `/investor/*` | ⛔ noindex | ✅ | — |
| P-29 | Admin-Panel | `/admin/*` | ⛔ noindex | ✅ | — |
| P-30 | API-Routes | `/api/*` | ⛔ | ✅ | — |
| P-31 | Search | `/search` | ⛔ noindex | 🟡 Bug F-133 | — |
| P-47 | Nachrichten | `/nachrichten` | ⛔ noindex | ✅ | — |
| P-48 | Termine | `/termine` | ⛔ noindex | ✅ | — |

### 1.8 Medical-Money-Pages (Bestand, Welle 🟢 1 — als Vermietungs-Vertical, NICHT Beauty-Reisen)

> **Abgrenzung Welle 1 vs. Welle 3**: Die existierenden Medical-Money-Pages (`/haartransplantation`, `/zahnimplantate`, `/augenlasern`, `/longevity`, `/iv-infusionen`) sind **DE-Standorte für Stuhl-/Raum-Vermietung an Fachärzte** — also Bereich 1 (Vermietung), NICHT Bereich 4 (Beauty-Tourismus). Sie bleiben indexiert.
>
> Beauty-Tourismus = grenzüberschreitende Behandlungsvermittlung (Patient reist ins Ausland). Das ist eine andere Sache und bleibt in Welle 3 gated.
>
> **Action für Modul 5**: Content der Medical-Money-Pages prüfen — Begriffe wie „beste Klinik", „Anbieter-Empfehlung" entfernen. Pure SEO-Hubs für Salon-/Raumvermietung in dieser Branche.

| ID | URL | Status |
|---|---|---|
| P-39a | `/haartransplantation` | ✅ live |
| P-39b | `/zahnimplantate` | ✅ live |
| P-39c | `/augenlasern` | ✅ live |
| P-39d | `/longevity` | ✅ live |
| P-39e | `/iv-infusionen` | ✅ live |
| P-40 | `/premium` (Money-Hub) | ✅ live |

---

## 2. URL-Konventionen

### 2.1 Pflicht-Regeln (unverändert)

1. **Sprache**: Phase 1 ohne Sprach-Prefix. Phase 2 mit `/de/...` 301.
2. **Slug-Stil**: `kebab-case`, ASCII-only, Umlaut-Mapping (`ae`, `oe`, `ue`, `ss`).
3. **Trailing-Slash**: KEIN trailing slash.
4. **Case-Sensitivity**: lowercase. Middleware-Redirect für uppercase.
5. **Stabilität**: Einmal ausgegeben, NIE wieder ändern. Bei Bedarf 301.

### 2.2 Stadt-Slug-Whitelist (unverändert)

`PHASE_1_CITIES`: **berlin, hamburg, muenchen, koeln, frankfurt**.
`PHASE_2_CITIES`: `duesseldorf, stuttgart, leipzig, dresden, hannover, nuernberg, bremen, dortmund, essen, bonn`.

### 2.3 Vertical-Slug-Whitelist (Welle 1)

`VERTICALS`: **barbershop, friseur, kosmetik, nagelstudio, lash-brows**.

### 2.4 Asset-Slug (Welle 1 / 1b)

```
stuhl, liege, kabine, salonplatz, behandlungsraum, op-raum, beauty-workspace, raum
```

### 2.5 Neue Namespaces v3.0 (Multi-Vertical)

| Namespace | Bereich | Welle | Beispiele |
|---|---|---|---|
| `/produkte/*` | Shop | 🟢 1 | `/produkte/wax`, `/produkte/gel-xy-12345` |
| `/verkaeufer/*` | Shop | 🟢 1 | `/verkaeufer/beauty-store-mueller` |
| `/anbieter/[slug]` | Vermietung | 🟢 1 (1b) | `/anbieter/maria-friseurmeisterin-koeln` |
| `/drittanbieter/*` | Drittanbieter | 🟡 2 | `/drittanbieter/raum-mieten` |
| `/versicherung/*` | Versicherung | 🟡 2 | `/versicherung/berufshaftpflicht` |
| `/beauty-reisen/*` | Beauty-Tourismus | 🔴 3 (gated) | `/beauty-reisen/tuerkei/istanbul` |

### 2.6 „Stuhlmiete" vs. „Stuhl mieten" — URL-Entscheidung (unverändert)

Empfehlung: **Option C** (H1/Body, URL bleibt). Phase 2 ggf. Re-Eval.

---

## 3. Wellen-zu-Sub-Phasen-Mapping

| Welle | Bereiche | Sub-Phasen | Zielmetrik |
|---|---|---|---|
| 🟢 1 | Vermietung, Shop | 1a (live, ~70%), 1b (Lücken nächste 2 Wochen) | 50 Anbieter, 5 Stadt-Hubs Top-10 |
| 🟡 2 | Drittanbieter, Versicherung | 2 (4–8 Wochen nach Welle 1 stabil) | 10 Drittanbieter, 3 Versicherungs-Partner |
| 🔴 3 | Beauty-Tourismus | 3 (gated, Anwalt-Freigabe) | Erste 5 vertraute Anbieter, manuell vetted |
| ⚪ 4 | Programmatic-Skalierung (alle Bereiche) | „Phase 3" — wie v2.0 §3.4 | 500+ Anbieter, Top-50-Städte |

---

## 4. URL-Map Welle 1 (Stand-Inventar + Geplant)

### 4.1 Statische Pflicht-Pages (alle live)

```
/                                        (P-01)
/was-ist-chairmatch                      (P-02)
/anbieter/wie-es-funktioniert            (P-03a)
/mieter/wie-es-funktioniert              (P-03b)
/vermieter/wie-es-funktioniert           (P-03c, fehlt — Phase 1b)
/provisionsmodell                        (P-04)
/faq                                     (P-05)
/magazin                                 (P-14)
/impressum                               (P-18)
/datenschutz                             (P-19)
/agb                                     (P-20)
/agb-provider                            (P-21)
/agb-verkaeufer                          (P-94, fehlt — vor Welle-1-Shop-Launch)
/widerruf                                (P-22)
/landing                                 (P-35)
/statistik                               (P-37)
/freelancer-rechner                      (P-43)
/premium                                 (P-40)
/melden                                  (P-95, fehlt — DSA-Pflicht)
```

### 4.2 Vertical-Deutschland-Hubs (alle live)

```
/barbershop-deutschland
/friseur-deutschland
/kosmetik-deutschland
/nagelstudio-deutschland
/lash-brows-deutschland
```

### 4.3 Medical-Money-Pages (Welle 1, alle live)

```
/haartransplantation     (Bereich 1 — DE-Standort-Vermietung)
/zahnimplantate
/augenlasern
/longevity
/iv-infusionen
```

### 4.4 Stadt-Hubs Welle 1

```
/berlin    /hamburg    /muenchen    /koeln    /frankfurt
```

### 4.5 Stadt × Vertical Welle 1 (25 Pages dynamisch)

(Siehe v2.0 §4.5 — unverändert)

### 4.6 Stadt × Vertical × Asset Welle 1b (Top-10 priorisiert)

(Siehe v2.0 §4.6 — unverändert)

### 4.7 Shop-Bereich Welle 1 (NEU)

```
/produkte                              (P-41, Übersicht)
/produkte/wax                          (P-92, Kategorie)
/produkte/gel                          (P-92, Kategorie)
/produkte/kosmetik                     (P-92, Kategorie)
/produkte/werkzeug                     (P-92, Kategorie)
/produkte/[product-slug]               (P-42, Detail)
/verkaeufer                            (P-91 analog, Verzeichnis)
/verkaeufer/[seller-slug]              (P-49, Profil)
/verkaeufer/onboarding                 (P-93, intern)
```

### 4.8 Anbieter-Bereich Welle 1b (NEU)

```
/anbieter                              (P-91, Verzeichnis aller Dienstleister)
/anbieter/[slug]                       (P-90, öffentliches Profil)
```

### 4.9 Drittanbieter Welle 2 (gebaut, aber via Flag ein/aus)

```
/drittanbieter                         (P-50)
/drittanbieter/wie-es-funktioniert     (P-51)
/drittanbieter/raum-mieten             (P-52)
/drittanbieter/antragsservice          (P-53, mit Disclaimer-Sticky)
/agb-drittanbieter                     (P-54)
```

### 4.10 Versicherung Welle 2 (gebaut, aber via Flag ein/aus)

```
/versicherung                          (P-60)
/versicherung/berufshaftpflicht        (P-61)
/versicherung/inhaltsversicherung      (P-61)
/versicherung/vermittler-hinweis       (P-62)
```

### 4.11 Beauty-Tourismus Welle 3 (gebaut, HART noindex, NICHT in Sitemap)

```
/beauty-reisen                         (P-70, noindex)
/beauty-reisen/haartransplantation     (P-71, noindex)
/beauty-reisen/zaehne                  (P-71, noindex)
/beauty-reisen/augen                   (P-71, noindex)
/beauty-reisen/aesthetik               (P-71, noindex)
/beauty-reisen/tuerkei                 (P-73, noindex)
/beauty-reisen/tuerkei/istanbul        (P-73, noindex)
/beauty-reisen/anbieter/[slug]         (P-72, noindex)
/beauty-reisen/disclaimer              (P-74, noindex)
/agb-beauty-reisen                     (P-96, noindex)
```

**Total Welle 1 indexierbar**: ~80 Pages (wie v2.0) + ~10 Shop-/Anbieter-Pages = ~90 URLs.
**Total Welle 2 indexierbar nach Freigabe**: +10 Pages = ~100 URLs.
**Total Welle 3 gated (gebaut, nicht indexiert)**: ~10 Pages.

---

## 5. Interne Verlinkungs-Architektur (erweitert um Multi-Vertical)

### 5.1 Footer-Mega-Links (Multi-Vertical-Layout)

```
Spalte 1 — Vermietung:        Spalte 2 — Städte:         Spalte 3 — Kategorien:
- Vermieter werden            - Stuhlmiete Köln          - Friseur Deutschland
- Mieter werden               - Stuhlmiete Berlin        - Barbershop Deutschland
- Anbieter-Verzeichnis        - Kosmetikraum Berlin      - Kosmetik Deutschland
- Provisionsmodell            - Stuhlmiete Frankfurt     - Nagelstudio Deutschland
- Provider-AGB                - Lash-Studio Berlin       - Lash & Brows Deutschland

Spalte 4 — Shop:              Spalte 5 — Tools:          Spalte 6 — Premium / Vertical:
- Produkte                    - Freelancer-Rechner       - Haartransplantation (DE-Standorte)
- Verkäufer werden            - Stuhlmietvertrag-Vorlage - Zahnimplantate
- Verkäufer-Verzeichnis       - Lexikon                  - Longevity
- Verkäufer-AGB               - Statistik                - Augenlasern

Spalte 7 — Welle 2 (nach Freigabe):    Spalte 8 — Rechtliches:
- Drittanbieter (Räume)                - Impressum
- Versicherung-Vergleich               - Datenschutz
- Antragsservice                       - AGB
                                       - Widerruf
                                       - Inhalt melden (DSA)

(Welle 3 / Beauty-Reisen erscheint NICHT im Footer bis Freigabe.)
```

### 5.2 Hub-and-Spoke pro Bereich (unverändert in der Logik, erweitert)

(Siehe v2.0 §5.1–5.5 — übernommen)

### 5.3 Cross-Vertical-Linking

Beispiel: `/anbieter/[slug]` (Friseur in Köln) → linkt zu:
- Salon der/die er gerade vermietet (Vermietung-Bereich)
- Produkte, die er nutzt (Shop, wenn Affiliate-Link konfiguriert)
- ⛔ KEIN Auto-Link zu Beauty-Reisen (auch nach Welle 3 — nur opt-in)

---

## 6. Indexierungs-Strategie pro Seitentyp (Multi-Vertical-Vollausbau)

Zusätzlich zur v2.0-Tabelle:

| Seitentyp | robots-Meta | Canonical | Sitemap | Welle |
|---|---|---|---|---|
| **Vermietung (Bereich 1)** | | | | |
| `/anbieter/[slug]` (P-90) | index,follow | self | ✅ | 1b |
| `/anbieter` (P-91) | index,follow | self | ✅ | 1b |
| **Shop (Bereich 3)** | | | | |
| `/produkte` (P-41) | index,follow | self | ✅ Priority 0.85 | 1 |
| `/produkte/[slug]` (P-42) | index,follow | self | ✅ | 1 |
| `/produkte/[kategorie]` (P-92) | index,follow | self | ✅ | 1b |
| `/verkaeufer/[slug]` (P-49) | index,follow | self | ✅ | 1b |
| `/verkaeufer/onboarding` (P-93) | noindex,nofollow | n/a | ❌ | 1b |
| **Drittanbieter (Bereich 2)** | | | | |
| `/drittanbieter` (P-50) | bedingt: `WELLEN_FREIGABE.drittanbieter` | self | bedingt | 2 |
| `/drittanbieter/wie-es-funktioniert` (P-51) | bedingt | self | bedingt | 2 |
| `/drittanbieter/raum-mieten` (P-52) | bedingt | self | bedingt | 2 |
| `/drittanbieter/antragsservice` (P-53) | bedingt + Sticky-Disclaimer | self | bedingt | 2 |
| **Versicherung (Bereich 5)** | | | | |
| `/versicherung` (P-60) | bedingt: `WELLEN_FREIGABE.versicherung` | self | bedingt | 2 |
| `/versicherung/[produkt]` (P-61) | bedingt | self | bedingt | 2 |
| **Beauty-Tourismus (Bereich 4) — HART GATED** | | | | |
| `/beauty-reisen` (P-70) | **noindex,nofollow** (hart) bis `WELLEN_FREIGABE.beauty_reisen=true` | self | ❌ ausschließen | 3 |
| `/beauty-reisen/*` (P-71..P-74) | **noindex,nofollow** | self | ❌ | 3 |
| `/agb-beauty-reisen` (P-96) | **noindex** | self | ❌ | 3 |
| **DSA / Compliance** | | | | |
| `/melden` (P-95) | index,follow | self | ✅ | 1 |

---

## 7. Faceted-Search-Handling (unverändert v2.0 §7)

Whitelist + Canonical für `/explore?...`, `/search?...`. (Detail siehe v2.0 §7)

---

## 8. Next.js App Router File-Tree (Multi-Vertical-Vollausbau)

Erweitert um Welle-1/2/3-Strukturen. **Welle-3-Pfade EXISTIEREN, sind aber per Layout-`robots`-Meta und Feature-Flag-Sitemap-Exclude inaktiv.**

```
src/app/
├── layout.tsx                                # Root-Layout + Org-LD + WebSite-LD
├── page.tsx                                  # P-01 Home
├── sitemap.ts                                # liest WELLEN_FREIGABE für Filter
├── robots.ts
├── opengraph-image.tsx
├── (auth)/...                                # noindex
├── (protected)/...                           # noindex
├── (provider)/provider/...                   # noindex
├── (owner)/owner/...                         # noindex
├── (investor)/investor/...                   # noindex
├── (admin)/...                               # noindex
├── (public)/
│   ├── layout.tsx                            # SeoFooter
│   │
│   # ── Bereich 1: Vermietung (Welle 🟢 1) ──────────────────────────
│   ├── [stadt]/
│   │   ├── page.tsx                          # P-06
│   │   ├── [vertical]/page.tsx               # P-07
│   │   └── [vertical]/[asset]-mieten/page.tsx # P-08 (Welle 1b)
│   ├── [vertical]-deutschland/page.tsx       # P-09
│   ├── was-ist-chairmatch/page.tsx           # P-02
│   ├── anbieter/
│   │   ├── page.tsx                          # P-91 NEU (Verzeichnis)
│   │   ├── [slug]/page.tsx                   # P-90 NEU (Profil)
│   │   ├── wie-es-funktioniert/page.tsx      # P-03a
│   │   └── onboarding/page.tsx               # intern
│   ├── mieter/
│   │   ├── wie-es-funktioniert/page.tsx      # P-03b
│   │   ├── onboarding/page.tsx
│   │   └── mein-bereich/page.tsx
│   ├── vermieter/
│   │   ├── wie-es-funktioniert/page.tsx      # P-03c NEU (fehlt)
│   │   ├── onboarding/page.tsx
│   │   └── mein-inserat/page.tsx
│   ├── provisionsmodell/page.tsx             # P-04
│   ├── faq/page.tsx                          # P-05
│   ├── lexikon/                              # P-10 (Welle 1b) NEU
│   │   ├── page.tsx
│   │   └── [term]/page.tsx
│   ├── magazin/
│   │   ├── page.tsx                          # P-14
│   │   └── [slug]/page.tsx                   # P-15
│   ├── salon/[slug]/page.tsx                 # P-12
│   ├── listings/[slug]/page.tsx              # P-11
│   ├── category/[categoryId]/page.tsx        # P-38
│   ├── freelancer-rechner/page.tsx           # P-43
│   ├── statistik/page.tsx                    # P-37
│   ├── explore/page.tsx                      # P-32
│   ├── offers/page.tsx                       # P-33
│   ├── rentals/page.tsx                      # P-34
│   ├── premium/page.tsx                      # P-40
│   ├── haartransplantation/page.tsx          # P-39a
│   ├── zahnimplantate/page.tsx               # P-39b
│   ├── augenlasern/page.tsx                  # P-39c
│   ├── longevity/page.tsx                    # P-39d
│   ├── iv-infusionen/page.tsx                # P-39e
│   │
│   # ── Bereich 3: Shop / Affiliate (Welle 🟢 1) ───────────────────
│   ├── produkte/                             # P-41, P-42, P-92 NEU
│   │   ├── page.tsx                          # P-41 Übersicht
│   │   ├── [slug]/page.tsx                   # P-42 Detail
│   │   └── (kategorie-routes)/...            # P-92 (wax, gel, kosmetik)
│   ├── verkaeufer/                           # P-49, P-91, P-93 NEU
│   │   ├── page.tsx                          # Verzeichnis
│   │   ├── [slug]/page.tsx                   # Profil
│   │   └── onboarding/page.tsx               # noindex
│   ├── agb-verkaeufer/page.tsx               # P-94 NEU
│   │
│   # ── Bereich 2: Drittanbieter (Welle 🟡 2, Feature-Flag) ────────
│   ├── drittanbieter/                        # NEU (Welle 2)
│   │   ├── layout.tsx                        # NEU: liest WELLEN_FREIGABE.drittanbieter
│   │   ├── page.tsx                          # P-50
│   │   ├── wie-es-funktioniert/page.tsx      # P-51
│   │   ├── raum-mieten/page.tsx              # P-52
│   │   └── antragsservice/page.tsx           # P-53 (mit Sticky-Disclaimer)
│   ├── agb-drittanbieter/page.tsx            # P-54 NEU
│   │
│   # ── Bereich 5: Versicherung (Welle 🟡 2, Feature-Flag) ─────────
│   ├── versicherung/                         # NEU (Welle 2)
│   │   ├── layout.tsx                        # NEU: liest WELLEN_FREIGABE.versicherung
│   │   ├── page.tsx                          # P-60
│   │   ├── [produkt]/page.tsx                # P-61
│   │   └── vermittler-hinweis/page.tsx       # P-62
│   │
│   # ── Bereich 4: Beauty-Tourismus (Welle 🔴 3, HART GATED) ────────
│   ├── beauty-reisen/                        # NEU (Welle 3)
│   │   ├── layout.tsx                        # NEU: hart `robots: { index: false }`
│   │   ├── page.tsx                          # P-70
│   │   ├── [behandlung]/page.tsx             # P-71
│   │   ├── [land]/[stadt]/page.tsx           # P-73
│   │   ├── anbieter/[slug]/page.tsx          # P-72
│   │   └── disclaimer/page.tsx               # P-74
│   ├── agb-beauty-reisen/page.tsx            # P-96 NEU (noindex)
│   │
│   # ── Pflicht-Rechtsseiten (alle Wellen) ─────────────────────────
│   ├── impressum/page.tsx                    # P-18
│   ├── datenschutz/page.tsx                  # P-19
│   ├── agb/page.tsx                          # P-20
│   ├── agb-provider/page.tsx                 # P-21
│   ├── widerruf/page.tsx                     # P-22
│   ├── cookie-settings/page.tsx              # P-23
│   ├── melden/page.tsx                       # P-95 NEU (DSA-Pflicht)
│   │
│   ├── nachrichten/page.tsx                  # P-47 (noindex)
│   ├── termine/page.tsx                      # P-48 (noindex)
│   ├── konto/page.tsx                        # P-45
│   ├── inserat/page.tsx                      # P-46
│   ├── empfehlungen/page.tsx                 # P-44
│   ├── search/page.tsx                       # P-31 (noindex, Bug F-133)
│   ├── landing/page.tsx                      # P-35
│   ├── pitch/page.tsx                        # P-36
│   ├── register/page.tsx
│   ├── test-i18n-check/page.tsx              # ⚠️ Dev-Page → löschen
│   ├── error.tsx
│   └── loading.tsx
└── api/...                                   # disallowed
```

**Wichtig**: Die Welle-2/3-Routen sind **explizit anzulegen** mit Stub-Content + `robots: { index: false }` + Banner „Pre-Launch — Welle X — Anwalt-Review läuft" (Welle 3) bzw. „Pre-Launch — AGB-Review läuft" (Welle 2). Damit ist die Plattform-Architektur sichtbar im Code und einfach scharfschalten.

---

## 9. Feature-Flag-Schema für Wellen

Neuer Modul-3-Auftrag: `src/lib/seo-data/wellen.ts`:

```typescript
/**
 * Welle 1: aktiv ab Launch
 * Welle 2: aktiviert nach AGB-Ergänzung + 4 Wochen stabile Welle 1
 * Welle 3: aktiviert NUR nach schriftlicher Anwalt-Freigabe (siehe docs/legal/HWG-FREIGABE.md)
 */
export const WELLEN_FREIGABE = {
  vermietung: true,         // Welle 1
  shop: true,               // Welle 1
  drittanbieter: false,     // Welle 2 — manuell aktivieren
  versicherung: false,      // Welle 2 — manuell aktivieren
  beauty_reisen: false,     // Welle 3 — manuell aktivieren NUR nach Anwalt
} as const

export type WellenBereich = keyof typeof WELLEN_FREIGABE
```

Konsumiert von:
- `src/app/sitemap.ts` — schließt nicht-freigegebene Bereiche aus
- `src/app/(public)/{drittanbieter,versicherung,beauty-reisen}/layout.tsx` — setzt `robots: { index: WELLEN_FREIGABE[...] }`
- Navigation/Footer-Komponenten — rendert Welle-2/3-Links nur bei `true`

---

## 10. Open Questions an Yusuf — v3.0 Update

Bestehende offene Fragen aus v2.0 (Q-A bis Q-J) bleiben relevant. NEU dazu:

### Q-K (NEU): Drittanbieter-Bereich — Bearbeitungsgebühr-Modell
- Pauschal pro Antrag oder erfolgsbasiert? **Erfolgshaftung explizit AUS.**
- Wer ist Vertragspartner: Drittanbieter ↔ Gesundheitsamt oder Drittanbieter ↔ ChairMatch ↔ Gesundheitsamt?
- **Empfehlung**: Drittanbieter ist immer Vertragspartner des Amts; ChairMatch erbringt nur Bearbeitungsdienstleistung (analog Steuerberater-Modell, aber explizit OHNE Steuerberatungs-Eigenschaft).

### Q-L (NEU): Shop-Produktkategorien
- Welche 4–6 Top-Kategorien für Welle-1-Launch? Empfehlung: `wax, gel, kosmetik, werkzeug, hygiene, accessoires`.
- Wie wird Produkthaftung in den Verkäufer-AGB verlagert? (Generator-Standardtext + Plattform-Disclaimer reicht für Lean-Start; bei Skalierung Anwalt.)

### Q-M (NEU): Versicherung — Eigenlizenz oder Affiliate?
- Welle-2-Start als reine **Affiliate-Vergleichsseite** (kein § 34d nötig) — OK?
- Eigenvermittlung erst nach Lizenz-Antrag — Roadmap in 6+ Monaten.

### Q-N (NEU): Beauty-Tourismus — Anwalts-Auftragsverfahren
- Wann holt yusuf den Medizinrecht-/HWG-Anwalt ein? Empfehlung: **bevor** Welle 1 Traffic aufbaut (Bot-Crawl von gated URLs ist trotz `noindex` nicht 100% vermeidbar; lieber NIE versehentlich live).
- Anwalts-Budget? Realistisch € 3.000–8.000 für initiale Freigabe inkl. AGB-Beauty-Reisen + Vorher/Nachher-Bild-Policy.

### Q-O (NEU): DSA-Melde-Funktion (`/melden`)
- Soll das eine eigene Page mit Formular werden ODER nur ein E-Mail-Link (`melden@chairmatch.de`)?
- **Empfehlung**: Formular mit Kategorien (Fake-Bewertung / falscher Anbieter / unrechtmäßige Inhalte / sonstiges) + Pflicht-Antwort-Zeit 24h.

---

## 11. Übergabe-Status an Modul 3

Modul 3 (Tech-SEO-Implementation) kann sofort:

1. `src/lib/seo-data/wellen.ts` mit Feature-Flag-Schema erstellen.
2. Welle-2- und Welle-3-Routen anlegen (Stub-Pages mit Pre-Launch-Banner + `robots:noindex`).
3. `sitemap.ts` um Welle-Filter erweitern.
4. Welle-1-Lücken (P-03c, P-90, P-91, P-95, P-94) implementieren.
5. Quick-Win-Sprint aus Modul 1.

---

## 12. Anhang — Verweise auf Schwester-Dokumente

| Dokument | Inhalt |
|---|---|
| `docs/seo/00-recon-briefing.md` | Wettbewerbs- und Keyword-Recon |
| `docs/seo/01-audit-prio-matrix.md` | Tech-SEO-Audit, Quick-Wins |
| **`docs/seo/02-ia-url-phasen.md` (dieses)** | IA + URL + Wellen-Modell |
| `docs/seo/03-04-05-implementation.md` | Module-3/4/5-Implementation |
| `docs/seo/06-cro-trust.md` | CRO + Trust-Elemente |
| `docs/seo/07-execution-plan.md` | Sprint-Plan |
| **`RECHTLICHES_SETUP.md`** (Root) | Lean-Legal-Guide (Generator-Anleitung) |
| `docs/legal/HWG-FREIGABE.md` (zu erstellen) | Anwalts-Freigabe für Welle 3 (Hash-Hinterlegung) |
