# Modul 6 — CRO, Trust & Marketplace Activation

Stand: 14. Mai 2026.

---

## 1. Trust-Signal-Inventar

| ID | Badge | Substanz (real?) | Verwendung |
|---|---|---|---|
| T-01 | Stripe-gesichert | ✅ Stripe PCI-DSS Level 1 | Listing, Booking-Page, Footer |
| T-02 | DSGVO-konform | ✅ Vercel EU + Cookie-Consent + Daten-Export | Footer, About |
| T-03 | Vercel EU Frankfurt | ✅ Hosting verifiziert | Footer |
| T-04 | Made in Germany | ✅ Gegründet in Köln, deutsche Server | Footer, Hero |
| T-05 | Verifizierter Anbieter | ✅ Admin-Check (Gewerbe, Adresse, ≥1 Bewertung) | Salon-Detail |
| T-06 | Top-Anbieter | ✅ Rating ≥4.7 + ≥10 Bewertungen | Salon-Detail (bedingt) |
| T-07 | Aktiv seit X Monaten | ✅ aus `created_at` berechnet | Salon-Detail |
| T-08 | Response-Time | ⚠️ erst ab Buchungen vorhanden | Salon-Detail (Phase 2) |
| T-09 | Cancellation-Policy | ✅ aus Vertrags-Snapshot | Booking-Page |
| T-10 | Anti-Bypass-Notice | ✅ erklärt Schutz-Logik | Listing-Detail, vor Booking |

Implementiert in: `src/components/cro/TrustBadges.tsx`

**Regel**: KEIN Badge zeigt etwas Falsches. Wenn ein Salon nicht
verifiziert ist, zeigt der Badge nicht "Verifiziert prüfen" — er
zeigt NICHTS. Fake-Trust ist langfristig giftig.

---

## 2. Anti-Bypass-Architektur

### 2.1 Was ist Bypass und warum ist das tödlich?

"Bypass" = ein User findet einen Salon auf ChairMatch, kontaktiert
ihn direkt (Telefon, Insta), bucht außerhalb der Plattform. Wir
sehen keine Buchung, verdienen keine Provision, haben aber den
Vermittlungs-Wert geliefert.

In Marketplaces wie Airbnb, Uber war das in Frühphase ein
existenzielles Problem. Lösung: technische + UX + rechtliche
Maßnahmen kombiniert.

### 2.2 ChairMatch Anti-Bypass-Schichten

**Schicht 1: Kontaktdaten-Verschleierung (vor Booking)**

- Salon-Profil zeigt: Name, Stadt, Stadtteil, Kategorie, Services,
  Bilder, Bewertungen
- Salon-Profil zeigt NICHT (bis Booking confirmed):
  - Exakte Adresse (Hausnummer wird auf "X" maskiert)
  - Telefonnummer
  - Direkt-Email
  - Externe Website-Links
  - Instagram-Handle (nur wenn Provider aktiv erlaubt)

**Schicht 2: In-App Messaging (nach Buchung)**

- Mieter und Anbieter chatten über ChairMatch-Messaging
- Server-side Regex-Filter blockiert:
  - Telefonnummern (DE-Format: 0xxx-..., +49...)
  - Email-Adressen
  - "WhatsApp", "Insta", "ig:", "DM mir"
- Bei Treffer: Warnung an Sender + Soft-Block des Outbound-Texts
- Repeat Offender (>3 Treffer): Account-Review durch Admin

**Schicht 3: Booking-Lock**

- Adresse + Telefonnummer werden ERST nach erfolgreicher
  Stripe-Zahlung in das Account-Dashboard des Mieters geschrieben
- Anbieter sieht Mieter-Kontaktdaten ebenfalls erst nach Zahlung

**Schicht 4: Vertragliche Anti-Bypass-Klausel (AGB)**

- §X der AGB: Beide Parteien verpflichten sich, Kontakte aus
  ChairMatch nur über die Plattform abzurechnen
- Verstoß: Vertragsstrafe in Höhe einer Jahres-Provision

**Schicht 5: Garantie nur bei Plattform-Buchung**

- "Zahlungsschutz", "No-Show-Garantie", "Streit-Schlichtung"
  greifen nur bei Plattform-Buchungen
- Klar in jedem Listing kommuniziert: außerhalb buchen = auf
  eigene Gefahr

### 2.3 Kommunikation

NICHT: "Wir bestehen darauf"
SONDERN: "Schutz für beide Seiten — bei Streit greift unsere Garantie
nur bei Plattform-Buchungen"

Code: `<AntiBypassNotice />` in `src/components/cro/TrustBadges.tsx`

---

## 3. Cold-Start-Spielbuch (Operations Playbook)

### 3.1 Supply-Side (Anbieter) — Wochen 1-4

**Founding-Salon-Programm**
- Erste **50 Salons pro Stadt** kostenlos onboarden
- **6 Monate 0 % Provision** (statt 3 Monaten Standard-Welcome)
- Dedizierter Onboarding-Call (15-30 min, Yusuf persönlich)
- "Founding Salon"-Badge auf Profil (lebenslang)
- Priorität in Suchergebnissen für 12 Monate

**Concierge-Listing-Erstellung**
- Yusuf erstellt das Listing für den Salon (Fotos, Beschreibung,
  Preise) statt auf Self-Service zu warten
- Übergabe an Salon nur zur Freigabe (15 min Aufwand für Salon
  statt 60+ min)
- 10-15 Salons pro Woche realistisch

**Outreach-Templates** (für Yusufs LinkedIn/Insta/WhatsApp):

```
INSTAGRAM-DM-Template (warme Outreach):

Hey [Salonname]-Team 👋

Ich hab euer Profil gesehen — eure Cuts/Brows/Behandlungen sind richtig
stark.

Kurze Frage: Habt ihr Tage in der Woche, an denen einer eurer Stühle
oder Kabinen leer steht?

Wir bauen gerade ChairMatch — die erste deutsche Plattform für
Stuhl-Vermietung an Beauty-Freelancer. Über 0 % Provision in den
ersten 6 Monaten, Zahlung via Stripe gesichert.

Wäre 10 Min Call für euch okay diese Woche?

Lieber Gruß,
Yusuf (Gründer, ChairMatch.de)
```

```
LINKEDIN-Nachricht (Salon-Inhaber B2B):

Hi [Vorname],

Ich gründe gerade ChairMatch — Deutschlands erste digitale Plattform
für Stuhl-Vermietung in der Beauty-Branche.

Konkretes Problem das wir lösen: Salons haben freie Plätze an
Wochenenden / Wochentagen, vermieten aber unzuverlässig über eBay
Kleinanzeigen. Wir verbinden seriös und nehmen 10 % Vermittlungs-
provision (für Founding-Salons: 0 % für 6 Monate).

Hättest du 15 Min Zeit, dass ich dir kurz zeige wie das funktioniert?

Beste Grüße,
Yusuf Demir
ChairMatch.de
```

**Referral-Program**
- 50 € Credit pro geworbenem Salon (für den werbenden Salon nach
  dessen Listing-Aktivierung)
- 50 € Welcome-Credit für den geworbenen Salon (auf erste
  Provisionen)

### 3.2 Demand-Side (Mieter) — Wochen 5-8

**Friseur-/Beauty-Schulen B2B-Partner**

Zielliste DE (verifizieren + ansprechen):
- Frankfurt: Hessische Friseur-Innung, Akademie HOS
- Berlin: Friseurakademie Berlin, Bel'Air Beauty
- München: Bayerische Akademie für Frisuren, Schwarzkopf-Akademie
- Hamburg: Friseur-Akademie Hamburg
- Köln: Akademie Kölner Friseur-Innung, Cologne Beauty Academy

Angebot: kostenlose ChairMatch-Workshop-Stunde an Schüler im
Abschluss-Semester. Jeder Schüler bekommt 30 € Plattform-Credit.

**Türkisch-sprachige Community-Multiplikatoren**

- 5 türkische Beauty-Influencer in DE identifizieren (50k+ Follower,
  Beauty-Profis)
- Partnerschaft: 100 € pro vermittelten verifizierten Anbieter
- Insta-Reels mit "Wie wir auf ChairMatch arbeiten"-Story

**Lead-Magnet: Freelancer-Calculator**

Page: `/freelancer-rechner`
Eingabe: aktuelles Brutto-Gehalt, Stunden/Woche, Stadt
Ausgabe: realistisches Selbstständigen-Einkommen bei
Stuhl-Miet-Modell (mit Steuer-Abzug, Versicherungen)
→ Lead in Newsletter, dann Email-Sequenz

### 3.3 Wochen-Aktionen-Plan

| Woche | Anbieter-Akquise | Mieter-Akquise | Output |
|---|---|---|---|
| 1 | 5 Insta-DMs/Tag = 35/Woche | — | 1-2 Founding-Salons |
| 2 | LinkedIn-Outreach 10/Tag | Schulen-Outreach starten | 3-5 Salons |
| 3 | Concierge-Onboarding für ersten Salons | Calculator-Page live | 5-8 Salons |
| 4 | Türk. Influencer-Outreach | Freelancer-Newsletter-Start | 10+ Salons |
| 5-8 | Skalieren auf 25-50 Salons | 100+ Mieter im Funnel | Phase-1-Ziel |

---

## 4. Virale Mechaniken

### 4.1 Shared Listings (umgesetzt via Salon-Detail)
- Jede `/salon/[slug]`-Page hat eigene OG-Card → WhatsApp/Insta
  zeigt Salon-Name + Bewertung + Stadt
- Cleaner: dynamische OG-Image-Generierung pro Salon (TODO Phase 2)

### 4.2 "Mein Salon ist auf ChairMatch"-Embed-Widget
- HTML/JS-Snippet das Salon-Inhaber auf ihre eigene Website packen
- Zeigt: ChairMatch-Logo + Link zum Profil + "Hier Stuhl mieten"-CTA
- Erzeugt Backlinks → SEO-Boost ChairMatch

### 4.3 "Salon-of-the-Week"-Programm
- Jeden Montag: Top-Salon auf Home-Hero featured
- Insta-Story-Highlight von @chairmatch_de
- Bedingung für Teilnahme: ≥3 Bewertungen, vollständiges Profil
- Salon bekommt Trust-Boost, ChairMatch bekommt Content

### 4.4 Tracking-Setup

Pro virale-Mechanik:
- UTM-Parameter: `?utm_source=embed&utm_medium=widget&utm_campaign=salon_{id}`
- Tracking-Pixel in OG-Card-Render
- Wöchentlicher Bericht: welche Mechanik bringt wie viel

---

## 5. Psychologische Trigger pro Seitentyp

### 5.1 Listing-Detail
- **Knappheit (nur wenn echt)**: "Diesen Monat noch 8 Tage frei"
  — basiert auf echten Slots, niemals Fake
- **Social Proof**: "12 Freelancer haben hier in den letzten 90 Tagen
  gearbeitet" — aus DB
- **Loss Aversion**: "Speichern" mit "X andere haben das gespeichert"

### 5.2 Stadt × Vertical
- **Empty State**: bei 0 Listings → "Sei der Erste — Founding-Salon-
  Programm" mit Direkt-CTA
- **FOMO**: "Berlin hat 30 verifizierte Plätze — Frankfurt nur 8.
  Sei früh dabei."

### 5.3 Sign-Up
- **3-Step-Onboarding** statt 1 Riesen-Formular (bereits implementiert)
- **Sozial-Logins** Google, Apple (NICHT Facebook — Zielgruppe
  vermeidet das)
- **Verifiziert über Steuer-ID** optional als Trust-Boost (Phase 2)

---

## 6. Pricing-Transparenz

### 6.1 Vergleichs-Calculator (`/provisionsmodell`)

Side-by-side:

| Plattform | Provision | Bezahlung | Schutz | Bewertungen |
|---|---|---|---|---|
| **ChairMatch** | 10 % (Stuhl) / 8 % (OP) | Stripe gesichert | Ja, Garantie | Verifiziert |
| eBay Kleinanzeigen | 0 % | Direkt | Nein | Keine |
| Facebook-Gruppe | 0 % | Direkt | Nein | Inkonsistent |
| Salonkee | 15-20 % | Stripe | Ja | Ja |

### 6.2 Schmerzfrei-Kommunikation

"10 % klingt viel — aber pro 100 € Vermittlung sind das 10 €. Dafür
bekommst du: garantierte Zahlung, Streit-Schlichtung, professionelle
Listings, kein Insta-DM-Stress, automatische Buchhaltungs-CSV."

---

## 7. A/B-Test-Roadmap (20 Hypothesen priorisiert)

| # | Hypothese | Impact | Conf | Effort | ICE | Phase |
|---|---|---:|---:|---:|---:|---|
| 1 | Trust-Bar über Hero erhöht Anbieter-Signup +15 % | 9 | 7 | 9 | 567 | 1 |
| 2 | "Founding-Salon"-Badge erhöht Listing-Klicks +20 % | 8 | 8 | 9 | 576 | 1 |
| 3 | Sozial-Logins erhöhen Signup-Completion +25 % | 8 | 9 | 7 | 504 | 1 |
| 4 | Calculator-Page bringt 30+ Leads/Woche | 9 | 6 | 6 | 324 | 2 |
| 5 | Insta-Mit-Sharing-Buttons im Listing → 5 % Shares | 6 | 7 | 8 | 336 | 1 |
| 6 | Empty-State CTA "erste Anbieter werden" konvertiert | 9 | 7 | 9 | 567 | 1 |
| 7 | "Verifiziert"-Badge erhöht Booking-Anfragen +15 % | 8 | 8 | 8 | 512 | 1 |
| 8 | Top-Anbieter-Tag in Suchergebnissen → +20 % Clicks | 7 | 7 | 8 | 392 | 1 |
| 9 | Anti-Bypass-Notice oben statt unten reduziert Bypass | 7 | 6 | 9 | 378 | 1 |
| 10 | Sticky CTA "Termin anfragen" auf mobile | 8 | 8 | 8 | 512 | 1 |
| 11 | Magazin-Artikel → Money-Page Conversion >5 % | 8 | 6 | 6 | 288 | 2 |
| 12 | Stadt-Hub "Stadtteile"-Filter erhöht Time-on-Page | 5 | 7 | 7 | 245 | 2 |
| 13 | FAQ-Section above Listings statt below | 5 | 6 | 9 | 270 | 1 |
| 14 | "Aktiv seit X Monaten" steigert Trust signifikant | 6 | 7 | 9 | 378 | 1 |
| 15 | Phone-Verify im Onboarding erhöht Quality der Profile | 7 | 8 | 7 | 392 | 1 |
| 16 | Bewertungs-Aufforderung 24h nach Booking | 8 | 9 | 8 | 576 | 1 |
| 17 | Salon-of-the-Week → +50 % Profilaufrufe für Featured | 7 | 8 | 7 | 392 | 2 |
| 18 | Embed-Widget auf 10 Salon-Websites → SEO-Backlinks | 7 | 6 | 5 | 210 | 2 |
| 19 | Türk-sprachige Landing für türk-Beauty-Profis | 8 | 7 | 5 | 280 | 2 |
| 20 | Provider-Onboarding 3-Step statt 5-Step | 7 | 7 | 6 | 294 | 2 |

**Top 5 für Q3 2026** (Phase 1 sofort starten):
1. T-02 Founding-Salon-Badge (#2, ICE 576)
2. Bewertungs-Aufforderung 24h post-Booking (#16, ICE 576)
3. Trust-Bar über Hero (#1, ICE 567)
4. Empty-State-CTA optimieren (#6, ICE 567)
5. Sozial-Logins (#3, ICE 504)

---

## 8. Onboarding-Email-Sequenzen

### 8.1 Anbieter-Sequenz (3 Mails über 14 Tage)

**Mail 1 — sofort nach Signup**: Welcome + Initial-Passwort
(bereits implementiert in `sendProviderWelcomeEmail`)

**Mail 2 — Tag 3**: "Dein Profil ist 70 % fertig — fehlen noch Fotos"
Subject: 📸 [Vorname], dein Listing braucht noch 3 Fotos
Body: Daten was fehlt, direkt-Link zum Profil, "Concierge-Foto-Service"
für 50 € als Bonus

**Mail 3 — Tag 7**: Wenn Listing live aber 0 Buchungen: Marketing-Tipps
Subject: 🎯 So machst du dein Listing sichtbar
Body: 3 Tipps (gute Beschreibung, Stadtteil im Title, Insta-Story-Tag)

**Mail 4 — Tag 14**: Wenn 0 Listings: Reaktivierung
Subject: Lass uns kurz reden — Yusuf von ChairMatch
Body: 15-min-Call-Buchung-Link

### 8.2 Mieter-Sequenz (3 Mails über 14 Tage)

**Mail 1 — sofort**: Welcome (bereits `sendWelcomeEmail`)

**Mail 2 — Tag 3**: Day-3 Engagement (`sendDay3OnboardingEmail` schon
implementiert)

**Mail 3 — Tag 7 nach erste Buchung**: Review-Aufforderung
Subject: ⭐ Wie war deine Buchung bei [Salon]?
Body: 1-Klick-Sterne + optional Text. Anreiz: 5 € Credit für
ausführliche Bewertung mit Foto.

**Mail 4 — Tag 14 ohne Buchung**: Re-Engagement
(`sendReEngagementEmail` schon implementiert)

### 8.3 Trigger-System

In `lib/email-sequencer.ts` (zukünftig):
```ts
trigger('provider.signup', delay='3d', mail='provider-day3')
trigger('booking.completed', delay='24h', mail='review-request')
```

Implementiert über Cron-Job `/api/cron/onboarding-emails` (heute live).

---

## 9. Übergabe an Modul 7

Modul 7 nutzt diese Outputs:
- Trust-Komponenten-Inventar → Acceptance Criteria pro Sprint
- Cold-Start-Wochen-Plan → direkter Input für 90-Tage-Plan
- A/B-Test-Roadmap → KPI-Definitionen
- Email-Sequenzen → operational schon umsetzbar (Resend vorausgesetzt)
