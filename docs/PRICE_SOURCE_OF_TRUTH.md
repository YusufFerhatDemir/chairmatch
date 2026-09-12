# Preise in ChairMatch — wo sie herkommen und wer sie entscheidet

> Stand 12.09.2026 · erzeugt aus `src/lib/pricing/price-audit.ts`
> (`npm run price-audit`, Gegenprobe `npm run price-audit:check`)
>
> **Dieses Dokument aendert keinen einzigen Preis.** Es ordnet die
> vorhandenen ein und sagt je Gruppe, wer darueber entscheiden muss.

## Die eine Regel

**Ein Preis gehoert in die Datenbank.** Steht eine Zahl im Quelltext, ist
sie dort entschieden worden — meistens beilaeufig, oft ohne dass jemand es
gemerkt hat. Genau diese Zahlen listet das Inventar.

Nicht gezaehlt wird die *Formatierung* eines Laufzeitwerts
(`{(cents / 100).toFixed(2)} €`, `toLocaleString`, `Intl.NumberFormat`):
dort steht die Zahl in der Datenbank und es gibt nichts zu entscheiden. Die
frueher berichtete Zahl „169 Literale" hat genau diese Unterscheidung nicht
gemacht und zusaetzlich `src/lib/seo-data/` uebersehen — dort liegen 84 %.

## Der Bestand

| Gruppe | Literale | Anteil |
|---|---:|---:|
| [Marktbehauptungen](#1-marktbehauptungen) | 1087 | 88 % |
| [Heilbehandlungspreise](#2-heilbehandlungspreise) | 93 | 8 % |
| [Ertragserwartungen](#3-ertragserwartungen) | 29 | 2 % |
| [Sonstiges (intern)](#5-sonstiges) | 14 | 1 % |
| [Eigene Produktpreise](#4-eigene-produktpreise) | 9 | < 1 % |
| [Testdaten](#6-testdaten) | 8 | < 1 % |
| **gesamt** | **1240** | |

Die Reihenfolge ist die des Bestands, nicht die der Dringlichkeit. Nach
Fallhoehe geordnet sind die Gruppen 3, 2 und 4 die, die zuerst eine
Entscheidung brauchen — sie sind Zusagen an einzelne Menschen, waehrend
Gruppe 1 Marketingtext ist.

---

### 1 · Marktbehauptungen

**1087 Literale**, davon 972 allein in `src/lib/seo-data/`.

| Datei | Literale |
|---|---:|
| `seo-data/magazin.ts` | 525 |
| `seo-data/magazin-2.ts` | 213 |
| `seo-data/cities.ts` | 152 |
| `seo-data/city-guides.ts` | 82 |
| `seo-data/verticals.ts` | 41 |
| `seo-data/faq-master.ts` | 28 |
| `(public)/preisvergleich`, `stuhlvermietung-guide`, `HomeSEOLanding`, u. a. | 46 |

Tagesmieten, Monatspauschalen, Stadtspannen, Startkapital, Fixkosten. **Keine
davon hat eine Quelle im Repo.** Sie werden als Marktwissen praesentiert —
nicht als Schaetzung, ohne Stand, ohne Erhebung.

Drei Stellen sind hier besonders heikel:

- **`verticals.ts` sagt „Tagespreis-Median: 45 €".** „Median" behauptet eine
  Erhebung. Es gibt keine.
- **`cities.ts` gibt Spannen je Stadt und Stadtteil** („Wedding, Neukoelln-Sued
  und Lichtenberg ab 25 €/Tag"). Das liest sich wie eine Marktbeobachtung,
  die der Nutzer gegen die echten Inserate halten kann — in der Datenbank
  stehen 15 Seed-Salons und eine Buchung.
- **Der Weg nach draussen wird leicht uebersehen:** die FAQ-Bloecke gehen
  ueber `<FAQ>` als **FAQPage-JSON-LD** an Suchmaschinen
  (`src/components/seo/FAQ.tsx`), und `faq-master.ts` speist zusaetzlich das
  **ChatWidget**. Dort liest sich eine Zahl wie eine Auskunft an genau
  diesen Nutzer, nicht wie Werbetext.

**Entscheidung:** Marketing/Redaktion. Entweder belegen (Quelle + Stand) oder
als Schaetzung kennzeichnen.

#### Sonderfall `/preisvergleich` — hier ist etwas richtig

Die Preistabelle rechnet **echte Mediane** aus `rental_equipment` und
kennzeichnet jede Zeile mit ihrer Quelle. Gemessen gegen die Produktion am
12.09.2026:

```
 10 Zeilen  „Live aus 1 Inserat"
114 Zeilen  „Marktdaten"        ← aus cities.ts, also Gruppe 1
```

Die Rechnung stimmt. Zwei Dinge stimmen trotzdem nicht: 114 von 124 Zeilen
sind unbelegte Benchmarks, und die zehn „Live"-Zeilen bilden je einen Median
ueber **genau ein Inserat**. Die Spalte gehoert erst ab einer Mindestzahl
gefuellt — oder anders beschriftet. Die `metadata.description` verspricht
ausserdem flach „Live-Marktpreise aus echten Inseraten"; das Verhaeltnis
114:10 traegt das nicht.

---

### 2 · Heilbehandlungspreise

**93 Literale** auf sechs oeffentlichen Seiten plus Startseite.

| Datei | Literale |
|---|---:|
| `(public)/longevity` | 21 |
| `(public)/zahnimplantate` | 19 |
| `(public)/iv-infusionen` | 17 |
| `(public)/haartransplantation` | 15 |
| `(public)/augenlasern` | 15 |
| `(public)/premium` | 6 |

Konkrete Behandlungspreise („FUE-Methode 2.490 – 4.990 €", „NAD+ 500mg
490 €", „All-on-4 11.900 – 14.900 € pro Kiefer"). Jede Seite gibt sie
dreifach aus: in `metadata.description` (also im Suchergebnis, bevor jemand
die Seite oeffnet), als FAQPage-JSON-LD und in den Preiskarten im Rumpf.

**Entscheidung:** Geschaeftsfuehrung **und** rechtliche Pruefung. Das ist
kein Stuhlmietpreis, sondern ein Heilbehandlungspreis; ob die Darstellung
als Preisliste hier zulaessig ist, ist mit dem Marker im Code ausdruecklich
**nicht** beantwortet, sondern nur aufgeschrieben.

---

### 3 · Ertragserwartungen — **keine Preise**

**29 Literale**, und die gefaehrlichste Gruppe.

| Datei | Aussage |
|---|---|
| `(public)/freelancer-rechner` (12) | „realistisch 2.200–3.800 € netto pro Monat", dagegen angestellt „1.400–1.800 €" |
| `components/HomeClient` (8) | „+800-1.500 €/Monat extra" — auf der **Startseite** |
| `(public)/register/anbieter` (5) | „Zusatzeinnahmen · ca. 80–150 €/Tag" — im **Anmeldeformular** |
| `freelancer-rechner/CalculatorClient` (4) | die Startwerte der Schieberegler |

Das sind keine Preisinformationen, sondern Aussagen darueber, **was jemand
verdienen wird** — an genau der Stelle, an der er sich entscheidet, seinen
Salon einzutragen oder sich selbststaendig zu machen.

Beim Rechner wiegt es doppelt: die `help`-Texte geben die Rechengroessen vor
(„Bundesdurchschnitt 45 €"), und die meisten Nutzer verschieben den Regler
nicht weit vom Vorschlag weg. Was dort steht, bestimmt das Ergebnis, das der
Nutzer als *sein* Ergebnis mitnimmt.

Die Datenbank kennt dazu nichts: 15 Salons, alle Seed-Daten, **eine**
Buchung (`/api/public-stats`).

**Entscheidung:** Geschaeftsfuehrung. Belegen, mit Spannbreite und Annahmen
kennzeichnen, oder streichen.

---

### 4 · Eigene Produktpreise

**9 Literale** — die einzige Gruppe, ueber die ChairMatch allein entscheidet.

| Ort | Inhalt |
|---|---|
| `(public)/pitch` | Abo-Stufen: Starter 29 €, Premium 49 €, Gold 99 € pro Monat |
| `(public)/provisionsmodell` | Rechenbeispiel 100 € → 90 € (also 10 %) |
| `lib/constants.ts` | `SVC_CATALOG` / `EQUIP_CATALOG` — Preiskataloge als blanke Zahlen (kein `€`, deshalb nicht im Literal-Inventar) |
| `lib/marketplace-rules.ts`, `modules/marketplace/commission.service.ts` | Provisionssaetze |

Zwei Dinge dazu:

- Die Abo-Preise auf `/pitch` versprechen ein Angebot, **das technisch nicht
  existiert**: Stripe ist in Produktion nicht konfiguriert, es gibt keine
  Preise dazu. `/pitch` steht in `publicPaths` und in der Sitemap, ist also
  nicht nur fuer geladene Investoren erreichbar.
- Der Provisionssatz steht im Rechenbeispiel als 10 % und in
  `COMMISSION_DEFAULTS` als Platzhalter. **Dieselbe Zahl darf nicht an einer
  Stelle unbestaetigt und an der anderen als Zusage stehen.**

**Entscheidung:** Geschaeftsfuehrung. Danach gehoeren die Werte an **eine**
Stelle, und die Seiten lesen von dort.

---

### 5 · Sonstiges

**14 Literale** in internen Ansichten (Investor-Seite, Owner-Bereich,
Provider-Dashboard, Warenkorb). Kein oeffentliches Versprechen, niedrige
Prioritaet — aber `(investor)/investor` wiederholt die Marktgroesse
„€15 Mrd.", die auch auf `/landing` und `/pitch` steht: drei Stellen, eine
Behauptung, keine Quelle, keine gemeinsame Konstante.

### 6 · Testdaten

**8 Literale** in `__tests__`. Werden nie ausgeliefert. Keine Entscheidung
noetig — aber Vorsicht: ein gruener Test mit erfundenem Preis belegt nur,
dass die Rechnung stimmt, nicht dass der Preis stimmt.

---

## Zielbild

1. **Produktpreise** (Gruppe 4) an eine Stelle, von dort gelesen.
2. **Marktpreise** (Gruppe 1) entweder aus `rental_equipment` rechnen — wie
   `/preisvergleich` es schon tut — oder als Schaetzung mit Stand
   kennzeichnen.
3. **Heilbehandlungspreise** (Gruppe 2) gehoeren zum Anbieter in die
   Datenbank, nicht in eine Seitenvorlage.
4. **Ertragserwartungen** (Gruppe 3) sind keine Preise und gehoeren nicht in
   dieselbe Schublade.

## Arbeitsweise

```bash
npm run price-audit          # Inventar neu erzeugen
npm run price-audit:check    # Exit 1, wenn es veraltet ist
grep -rl PRICE_DECISION_REQUIRED src/   # die Preisflaeche
```

`src/__tests__/preis-literale-markiert.test.ts` haelt die Grenze: jede
oeffentlich sichtbare Datei mit Preisliteralen braucht einen Marker. Wer
eine Preisangabe hinzufuegt, muss sagen, ob sie entschieden ist.

**Zwei Marker, ein Unterschied:** `BUSINESS_DECISION_REQUIRED` ist der
allgemeine Marker des Repos, `PRICE_DECISION_REQUIRED` der geldspezifische.
Heute sind sie deckungsgleich; wer die Preisflaeche sucht, greppt den
zweiten.
