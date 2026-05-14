/**
 * Magazin-Artikel-Daten — strukturiert für Phase-1.
 *
 * 10 Artikel aus Modul 0 PAA-Recherche.
 * Phase 1: erste 3-5 schreiben + publizieren.
 */

export interface MagazinArtikel {
  slug: string
  title: string
  description: string
  publishedAt: string  // ISO date
  readMinutes: number
  category: string
  keywords: string[]
  faqs: Array<{ question: string; answer: string }>
  /** Markdown-Inhalt (server-side gerendert) */
  content: string
}

export const MAGAZIN_ARTIKEL: MagazinArtikel[] = [
  {
    slug: 'wie-funktioniert-stuhl-miete',
    title: 'Wie funktioniert Stuhl-Miete? Der vollständige Guide für Beauty-Profis',
    description: 'Stuhl-Miete einfach erklärt: Was bekomme ich, was kostet es, welche Verträge brauche ich, wie viel verdiene ich? Der Praxis-Guide für Selbstständige.',
    publishedAt: '2026-05-14',
    readMinutes: 8,
    category: 'Grundlagen',
    keywords: ['stuhl miete', 'friseurstuhl mieten', 'chair rental', 'selbstständig friseur'],
    faqs: [
      { question: 'Was kostet ein Friseurstuhl pro Tag?', answer: 'Im Bundesdurchschnitt 40-70 €/Tag. Premium-Lagen (München, Frankfurt-Westend) bis 90 €. Wochenpakete oft 10-15 % günstiger.' },
      { question: 'Brauche ich einen Meisterbrief für Stuhl-Miete?', answer: 'Bei Friseur-Tätigkeit ja (HwO Anlage A). Bei Kosmetik, Barber, Lash, Nail nein — einfache Gewerbeanmeldung reicht.' },
      { question: 'Wie hoch ist der Tagesumsatz realistisch?', answer: 'Anfänger 80-150 €, etablierte Selbstständige 200-400 €. Spezialisten (Lash-Volume, Color, Barber) 250-500 €.' },
    ],
    content: `
## Was ist Stuhl-Miete genau?

Stuhl-Miete bedeutet: Ein Salon vermietet dir tageweise einen Arbeitsplatz. Du bezahlst eine feste Tagesmiete (z.B. 50 €) und behältst **100 % deines Behandlungsumsatzes**. Der Salon übernimmt Strom, Wasser, Möbel, Klimaanlage — du bringst deine eigenen Werkzeuge, deine Produkte und deine Kunden.

Das ist das Gegenmodell zur klassischen Anstellung. Dort bekommst du Festgehalt, aber dein Kundenstamm gehört dem Salon. Bei Stuhl-Miete ist alles dein.

## Was ist im Tagespreis enthalten?

**Standard-Ausstattung:**
- Friseurstuhl mit Spiegel
- Waschbecken + warmes/kaltes Wasser
- Strom für deine Werkzeuge
- Klimaanlage / Heizung
- Wartebereich für deine Kunden
- WLAN (in den meisten Salons)
- Sterilisator für Klingen / Werkzeuge

**Was du selbst mitbringst:**
- Eigene Werkzeuge (Schere, Maschine, Bürsten)
- Eigene Produkte (Shampoo, Wachs, Color)
- Berufshaftpflicht-Versicherung (15-30 €/Monat)

## Welche Verträge brauchst du?

Mündliche Absprachen kommen vor — sind aber rechtlich riskant. Ein **schriftlicher Mietvertrag** sollte mindestens enthalten:

1. **Laufzeit und Kündigungsfrist** (typisch monatsweise, 2-Wochen-Kündigung)
2. **Tagessatz oder Wochenpaket-Preis**
3. **Was inkludiert ist** (Strom, Wasser, Klima) und was nicht
4. **Konkurrenzschutz** — meist KEIN Konkurrenzverbot, aber prüfe dass dein Kundenstamm bei Vertragsende dir gehört
5. **Stornierungsbedingungen** für beide Seiten
6. **Versicherungs-Klausel** (deine BHV, seine Inhalts-Versicherung)

Auf ChairMatch generieren wir den Standard-Mietvertrag automatisch — beide Seiten unterschreiben digital.

## Wie viel verdienst du wirklich?

Realistische Rechnung für selbstständige Friseure in einer mittleren Stadt:

| Position | Tag |
|---|---:|
| Tagespreis Stuhl | -45 € |
| 4 Kunden à 60 € Behandlung | +240 € |
| Produkt-Kosten (Color, Pflege) | -25 € |
| **Tages-Brutto-Gewinn** | **+170 €** |

Bei 18 Arbeitstagen/Monat: **~3.000 € Brutto-Gewinn**. Davon gehen Steuern, Sozialversicherung, Werkzeug-Investitionen, Marketing ab. Realistischer Netto-Gewinn nach allen Abzügen: **1.800-2.400 €/Monat**.

In München, Frankfurt oder bei Spezialisierung deutlich mehr. In B-Städten oder Anfängern weniger.

## Welche Steuern fallen an?

Du bist Selbstständig, also:

- **Einkommensteuer** auf deinen Gewinn (nach Freibetrag ~10.000 €)
- **Gewerbesteuer** ab 24.500 € Gewinn (bei Beauty oft erst Jahr 2)
- **Umsatzsteuer** — Kleinunternehmerregelung (§19 UStG) wenn unter 22.000 € Umsatz/Jahr, sonst 19 % MwSt
- **Krankenversicherung** privat oder gesetzlich (oft das größte Kostenelement: 400-800 €/Monat)
- **Rentenversicherung** freiwillig, dringend empfohlen

Wichtig: Stuhl-Miete als Selbstständige ist NICHT Scheinselbstständigkeit, wenn folgende Punkte alle stimmen:
- Du hast eigene Kunden (nicht Salon-Kunden)
- Du nutzt eigene Werkzeuge
- Du entscheidest deine Arbeitszeiten selbst
- Du hast eigene Kasse (kein POS-Anschluss zum Salon-System)
- Du arbeitest für mindestens 2-3 verschiedene Auftraggeber (alternativ: erkennbar als eigenes Geschäft)

## Wie findest du den richtigen Salon?

Klassisch: eBay Kleinanzeigen, Facebook-Gruppen, persönliche Empfehlungen. Risiken: keine Verifikation, keine Bewertungen, keine Zahlungssicherheit.

Moderne Lösung: **ChairMatch.de** — alle Salons sind verifiziert, alle Mieten laufen über Stripe-gesicherte Zahlungen, alle Verträge sind standardisiert. Plus: Du siehst Bewertungen anderer Mieter, kannst gezielt nach Stadtteil oder Ausstattung filtern.

## Drei Praxis-Tipps für den Start

1. **Beginne mit 2-3 Tagen/Woche**, nicht direkt mit 5. Du musst erst deinen Kundenstamm aufbauen.
2. **Mach Fotos** von deinen besten Arbeiten + nutze Instagram aktiv. Stammkunden kommen über persönliche Beziehung, neue über Insta.
3. **Spar von Anfang an für die Steuer** — 25-30 % aller Einnahmen auf ein separates Konto. Sonst wird die erste Steuererklärung schmerzhaft.

## Fazit

Stuhl-Miete ist eine der flexibelsten Selbstständigkeits-Formen in der Beauty-Branche. Du behältst Kunden, Werkzeuge und Termine — und zahlst nur für den Tag, den du wirklich arbeitest. Bei guter Vorbereitung (Kundenstamm, Marketing, Steuer-Disziplin) verdienst du als selbstständiger Stuhl-Mieter typisch 30-50 % mehr als angestellt.
`.trim(),
  },
  {
    slug: 'steuern-bei-stuhl-miete',
    title: 'Steuern bei Stuhl-Miete: Was du als selbstständiger Friseur wissen musst',
    description: 'Einkommensteuer, Umsatzsteuer, Gewerbesteuer, Krankenversicherung: Der komplette Steuer-Guide für Beauty-Selbstständige mit Stuhl-Mietverhältnis.',
    publishedAt: '2026-05-14',
    readMinutes: 10,
    category: 'Steuern & Recht',
    keywords: ['stuhl miete steuern', 'selbstständig friseur steuer', 'kleinunternehmer beauty', 'scheinselbstständigkeit'],
    faqs: [
      { question: 'Bin ich Kleinunternehmer?', answer: 'Wenn dein Umsatz unter 22.000 €/Jahr liegt und unter 50.000 €/Jahr im Folgejahr bleibt: ja. Dann zahlst du keine Umsatzsteuer und schreibst auch keine.' },
      { question: 'Welche Belege brauche ich?', answer: 'Alle Einnahmen-Quittungen (über deine eigene Kasse oder Apps wie SumUp), alle Ausgaben-Rechnungen (Werkzeuge, Produkte, Stuhl-Miete, Versicherungen, Weiterbildung).' },
      { question: 'Wann lohnt sich ein Steuerberater?', answer: 'Ab dem ersten Monat. 60-100 €/Monat sparen dir oft 1000 €+ pro Jahr durch korrekte Abschreibungen + verhindern Fehler die zu Nachzahlungen führen.' },
    ],
    content: `
## Selbstständig — was bedeutet das steuerlich?

Als Stuhl-Mieter bist du Selbstständige(r) im Sinne des Steuerrechts. Das heißt:

- Du musst dich beim **Gewerbeamt** anmelden (außer du fällst unter freie Berufe — bei Friseur und Kosmetik fällst du das nicht)
- Du bekommst eine **Steuernummer** vom Finanzamt
- Du musst jährlich eine **Einkommensteuererklärung + EÜR** (Einnahmen-Überschuss-Rechnung) machen
- Eventuell zusätzlich **Umsatzsteuervoranmeldungen** + Jahreserklärung
- Eventuell **Gewerbesteuererklärung** (ab Gewinn > 24.500 €)

## Die 4 Steuer-Arten im Überblick

### 1. Einkommensteuer (immer)

Auf deinen Jahres-Gewinn. Gewinn = Einnahmen minus Betriebs-Ausgaben.

Steuersatz:
- Bis 10.908 € (Grundfreibetrag 2024) → 0 %
- 10.909 € bis 15.999 € → 14-24 % (Progressionszone)
- 16.000 € bis 62.809 € → 24-42 %
- Darüber: 42 % Spitzensteuer, ab 277.000 € 45 %

Tipp: Lege jeden Monat **25-30 % deiner Einnahmen** auf ein separates Konto. Sonst wird die erste Einkommensteuer-Vorauszahlung im Folgejahr ein Schock.

### 2. Umsatzsteuer (oft nicht)

Wenn dein Vor-Jahres-Umsatz unter 22.000 € lag und der laufende Jahres-Umsatz unter 50.000 € bleibt: **Kleinunternehmer (§19 UStG)** — keine USt. auf deinen Rechnungen, aber auch kein Vorsteuer-Abzug.

Sobald du drüber kommst: **19 % USt.** auf alle Behandlungs-Rechnungen. Du musst USt-Voranmeldungen machen (monatlich oder quartalsweise) und führst die Steuer ans Finanzamt ab.

### 3. Gewerbesteuer (ab 24.500 €)

Ab 24.500 € Gewinn pro Jahr fällt Gewerbesteuer an (Freibetrag). Hebesatz je nach Stadt verschieden (Frankfurt 460 %, Köln 475 %, Berlin 410 %).

Ab Gewerbesteuerpflicht: du wirst auch zur **IHK-Beitragspflicht** kommen (~200-400 €/Jahr).

### 4. Sozialversicherungen

Als Selbstständige(r) musst du dich selbst um Versicherungen kümmern:

- **Krankenversicherung**: Pflicht. Gesetzlich (TK, AOK, Barmer): 14-15 % deines Einkommens, Mindestbeitrag ~420 €/Monat. Privat oft günstiger ab ~250 €/Monat aber Vorsicht bei Alter + Vorerkrankungen.
- **Rentenversicherung**: NICHT Pflicht für Friseure (außer du warst Pflichtversichert in den letzten Jahren). Aber dringend empfohlen — private Altersvorsorge oder freiwillige gesetzliche Beiträge.
- **Unfallversicherung**: Pflicht für Friseure über die BGW (Berufsgenossenschaft).
- **Berufshaftpflicht**: technisch nicht Pflicht, aber dringend empfohlen (15-30 €/Monat).

## Beispiel-Rechnung: Was bleibt vom Brutto?

Selbstständige Friseurin in Köln, Stuhl-Miete:

| Posten | Jahres-Wert |
|---|---:|
| Brutto-Umsatz (4 Kunden × 60 € × 18 Tage × 11 Monate) | **47.520 €** |
| − Stuhl-Miete (45 € × 18 × 11) | -8.910 € |
| − Produkte | -3.500 € |
| − Werkzeuge & Equipment | -800 € |
| − Versicherungen | -600 € |
| − Weiterbildung | -1.200 € |
| **Brutto-Gewinn (EÜR-Ergebnis)** | **32.510 €** |
| − Krankenversicherung | -5.400 € |
| − Einkommensteuer (ca.) | -5.800 € |
| − Gewerbesteuer (Köln) | -1.450 € |
| **Netto pro Jahr** | **~19.860 €** |
| **Netto pro Monat** | **~1.655 €** |

Klingt erstmal okay — aber: kein Urlaubsgeld, kein Weihnachtsgeld, kein bezahlter Urlaub, kein Krankengeld in den ersten 6 Wochen. Und: davon musst du noch privat fürs Alter sparen.

Bei Spezialisierung (Color, Brautstyling), höheren Tagesumsätzen oder Premium-Lagen verdoppelt sich das schnell.

## 5 Praxis-Tipps zur Steuer

1. **Nutze ein Buchhaltungstool** ab Tag 1. Lexware, Sevdesk, FastBill — 15-30 €/Monat. Spart 100+ Stunden im Jahr.
2. **Separate Konten**: ein Geschäfts-Konto + ein Steuer-Konto (25-30 % aller Einnahmen direkt rüber).
3. **Belege digital sammeln**: per Foto mit dem Handy in dein Buchhaltungstool. Papier verliert sich.
4. **Steuerberater einbinden** ab Monat 3 — 60-100 €/Monat, spart oft 4-stellig pro Jahr.
5. **Vorauszahlungen einplanen**: Im ersten Jahr fallen oft KEINE Vorauszahlungen an. Im zweiten Jahr kommt die Steuer für Jahr 1 + die Vorauszahlung für Jahr 2 zusammen — kann doppelt-belastend sein.

## Disclaimer

Dies ist eine Übersicht, **kein Steuerrat**. Steuerrecht ist komplex und ändert sich. Für deine konkrete Situation hol dir einen Steuerberater. Die Investition zahlt sich aus.
`.trim(),
  },
  {
    slug: 'checkliste-salonplatz-mieten',
    title: 'Checkliste: Was du beim Salonplatz-Mieten prüfen musst',
    description: 'Bevor du einen Salonplatz mietest, gibt es 15 Dinge die du checken solltest. Vom Mietvertrag über die Ausstattung bis zur Lage-Analyse — die komplette Checkliste.',
    publishedAt: '2026-05-14',
    readMinutes: 6,
    category: 'Praxis-Guides',
    keywords: ['salonplatz mieten checkliste', 'stuhl miete worauf achten', 'salon vermieter prüfen'],
    faqs: [
      { question: 'Was sind die Top-3 Vertragsfallen?', answer: '1) Konkurrenzverbote die dich nach Vertragsende blockieren. 2) Unklare Kosten-Aufteilung bei Strom/Wasser. 3) Lange Kündigungsfristen ohne Sonderkündigungsrecht.' },
      { question: 'Wie erkenne ich einen seriösen Vermieter?', answer: 'Hat einen ordnungsgemäßen Gewerbeschein, Inhalts-Versicherung, schriftlichen Mustervertrag bereit, lässt dich vor Vertragsabschluss den Platz besichtigen, hat Bewertungen anderer Mieter.' },
      { question: 'Was wenn ich Probleme habe?', answer: 'Auf ChairMatch: Streit-Schlichtung in 48h, Stripe-Zahlungs-Garantie. Außerhalb: Verbraucherschutz, Anwalt — teuer und langsam.' },
    ],
    content: `
## Vor dem Vertrag

### 1. Besichtige den Salon LIVE
Niemals nur nach Fotos buchen. Geh hin, schau dir den Platz an, sprich mit dem Inhaber.

### 2. Frage nach anderen aktuellen Mietern
Falls schon andere selbstständig dort arbeiten: sprich mit ihnen. 5 Minuten Gespräch sagen mehr als 10 Insta-Posts.

### 3. Check die Lage
- Wie ist der Fußweg-Verkehr?
- Wo sind die nächsten konkurrierenden Salons?
- Wie ist die Erreichbarkeit (ÖPNV, Parkplätze)?
- Wie ist das Stadtteil-Image (passt zu deiner Zielgruppe)?

### 4. Frage nach Kunden-Pipeline des Salons
Stammkunden des Salons können auch zu dir kommen — wenn der Salon-Inhaber das mit dir teilt. Bei Stuhl-Miete oft "deine Kunden vs. seine Kunden" — kläre vorher klar ab.

### 5. Wie viele Stühle / Plätze gibt es?
Wenn du der dritte oder vierte Selbstständige bist, kann es eng werden (Wartebereich, Geräusche, Atmosphäre).

## Im Mietvertrag

### 6. Kündigungsfrist und Probezeit
Ideal: Monatsweise Kündigung mit 2-4 Wochen Frist. Vorsicht bei: 6-Monats-Bindung ohne Sonderkündigungsrecht.

### 7. Tagespreis vs. Wochenpaket vs. Monatspaket
Vergleiche die effektiven Tagessätze. Ein Monatspaket sollte 15-25 % günstiger sein als 22 Einzeltage.

### 8. Was ist im Preis enthalten?
Detaillierte Liste! Standard:
- ✅ Strom, Wasser, Heizung
- ✅ Möbel + Spiegel
- ✅ Klima
- ✅ Wartebereich + WC für Kunden
- ⚠️ WLAN (Pflicht abklären)
- ⚠️ Sterilisator-Zugang
- ❌ Deine Werkzeuge
- ❌ Deine Produkte

### 9. Konkurrenzschutz-Klausel
Manche Salons verbieten dir, nach Vertragsende in einem Umkreis (z.B. 1 km) selbstständig zu arbeiten oder deine Kunden mitzunehmen. **Lass das streichen** — dein Kundenstamm gehört dir.

### 10. Versicherungs-Anforderungen
Du brauchst Berufshaftpflicht (BHV). Manche Vermieter wollen mind. 1 Mio € Deckung. Frage nach.

### 11. Storno-Bedingungen für beide Seiten
Was passiert wenn:
- Du krank wirst? (Attest, dann meist kostenfrei)
- Du absagst? (typisch: bis 48h kostenfrei, danach 50-100 %)
- DER VERMIETER absagt? (sollte mindestens den Tagespreis als Entschädigung geben)

### 12. Eskalations-Klausel
Bei Streit: was passiert? Schiedsstelle? Direkt vor Gericht? Auf ChairMatch: integrierte Schlichtung.

## Beim Platz

### 13. Ist die Ausstattung ok?
Stuhl-Hydraulik funktioniert? Spiegel intakt? Wasserdruck am Becken ausreichend? Sterilisator vorhanden + sauber?

### 14. Hygiene-Standards
Bei Beauty-Berufen kommt das Gesundheitsamt. Frage nach:
- RKI-konforme Reinigungsprotokolle vorhanden?
- Wer säubert wann was?
- Wer übernimmt die Hygiene-Verantwortung im Mietraum?

### 15. Wie ist die Atmosphäre?
- Laut oder ruhig?
- Hip oder klassisch?
- Welche Musik läuft?
- Wie ist der Kunden-Mix?

Manchmal entscheidet das mehr über deinen Erfolg als der Preis.

## Bonus: Red Flags

🚩 Kein schriftlicher Vertrag — "wir handhaben das informell"
🚩 "Du musst meine Produkte verwenden" (kann aber legitim sein wenn der Salon das klar abrechnet)
🚩 "Stammkunden kannst du nicht behalten" — bei seinem Geschäftsmodell vielleicht ok, aber das ist Anstellung-Lite
🚩 Salon-Inhaber kann keine Bewertungen anderer Mieter zeigen
🚩 Salon ist immer leer wenn du vorbei kommst
🚩 Konkurrenzverbot über 6+ Monate nach Vertragsende

## Checkliste zum Abhaken

Beim Salon-Besuch:
- [ ] Andere Mieter angesprochen?
- [ ] Wartebereich gesehen?
- [ ] Stuhl-Hydraulik getestet?
- [ ] Wasserdruck ok?
- [ ] WLAN-Geschwindigkeit getestet?
- [ ] Sterilisator funktioniert?
- [ ] Klima-Anlage hörbar leise?
- [ ] Parkplätze für Kunden ok?

Im Vertrag:
- [ ] Kündigungsfrist ≤ 1 Monat
- [ ] Konkurrenzverbot gestrichen
- [ ] Strom/Wasser inkludiert
- [ ] Stornobedingungen fair für beide Seiten
- [ ] Versicherungs-Klausel klar

Steuer-Vorbereitung:
- [ ] Gewerbe angemeldet
- [ ] Steuernummer vorhanden
- [ ] Buchhaltungstool aktiviert
- [ ] Steuer-Konto eingerichtet
`.trim(),
  },
]

export function getMagazinArtikel(slug: string): MagazinArtikel | undefined {
  return MAGAZIN_ARTIKEL.find((a) => a.slug === slug)
}

export function getAllMagazinSlugs(): string[] {
  return MAGAZIN_ARTIKEL.map((a) => a.slug)
}
