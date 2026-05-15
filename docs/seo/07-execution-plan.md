# Modul 7 — 90-Tage Execution-Plan

Stand: 14. Mai 2026. Für Solo-Founder Yusuf, realistisch 25-35 h/Woche.

---

## Executive Summary

Drei Phasen, jeweils 30 Tage:
- **Tage 1–30: Foundation** — Tech, Content, Trust live. Erste 5-10 Salons
- **Tage 31–60: Acquisition** — Cold-Start-Spielbuch, erste 20-50 Salons + 100 Mieter
- **Tage 61–90: Optimization** — A/B-Tests, Pricing-Tuning, Phase-2-Vorbereitung

**Stop-Bedingungen** (jederzeit):
- Wenn nach Tag 60 weniger als 20 aktive Listings → Strategie-Reset
- Wenn Burnout-Symptome → 1 Woche Pause + Mentor-Call
- Wenn organische Impressionen Tag 45 < 1.000/Woche → Tech-Sprint-Schalter

---

## Sprint 1 (Woche 1) — Launch-Foundation finalisieren

**Ziel**: Gewerbe angemeldet. Stripe live. Resend versendet. Legal sauber.

| Deliverable | Stunden | Owner | Acceptance |
|---|---:|---|---|
| Gewerbeanmeldung beim Kölner Gewerbeamt | 1 | Yusuf | Bescheinigung in der Hand |
| Stripe-Account verifizieren (KYC) | 2 | Yusuf | Erste Test-Zahlung in Test-Mode klappt |
| Resend-Account + DNS bei Strato | 1 | Yusuf | TXT-Records gesetzt, Test-Mail kommt an |
| Twilio-Trial-Account anmelden | 0.5 | Yusuf | SMS an dein eigenes Handy erfolgreich |
| Legal-Platzhalter mit Firmendaten ersetzen | 2 | Yusuf+Cowork | Impressum/AGB/Datenschutz korrekt |
| Production-Test-Lauf E2E (Anbieter+Kunde) | 2 | Yusuf+Cowork | 1 vollständige Buchung mit echter Stripe-Test-Zahlung |
| Vercel ENVs alle korrekt | 1 | Yusuf | /admin/super/health zeigt 9/9 grün |

**Total**: ~10 Stunden. Rest der Woche: Recovery + erste Outreach-Liste vorbereiten.

**Risiko**: Gewerbeanmeldung verzögert sich (Gewerbeamt-Termin). Mitigation: Online-Anmeldung über elster.de versuchen.

---

## Sprint 2 (Woche 2) — Anbieter-Outreach Start

**Ziel**: 5 verifizierte Founding-Salons in Köln onboarded.

| Deliverable | Stunden | Owner | Acceptance |
|---|---:|---|---|
| Liste 50 Beauty-Salons Köln recherchieren | 4 | Yusuf | Spreadsheet mit Name, Insta, Telefon, Stadtteil |
| Insta-DM-Outreach (10/Tag = 50 in der Woche) | 5 | Yusuf | 50 DMs gesendet, 5-10 Antworten |
| 3 Onboarding-Calls (à 30 min) | 1.5 | Yusuf | 3 Verträge signiert |
| Concierge-Listings für die 3 Salons erstellen | 6 | Yusuf | 3 Live-Listings auf chairmatch.de |
| Foto-Session bei 1 Founding-Salon (Köln) | 3 | Yusuf | 10+ Profi-Fotos für Salon-Profil |
| Sentry-Account anlegen + DSN in Vercel | 0.5 | Yusuf | SENTRY_DSN in Vercel ENV → /admin/super/health zeigt grün |
| Provider-Welcome-Mail in Resend testen | 1 | Yusuf | Test-Provider erhält saubere Mail mit PW |

**Stop**: Wenn nach Tag 14 keine 3 Salons unterschrieben haben → Outreach-Skript überarbeiten.

---

## Sprint 3 (Woche 3) — Content-Push + erste Magazin-Artikel

**Ziel**: Stadt-Hubs für 5 Städte sichtbar (durch Listings), 3 Magazin-Artikel live.

| Deliverable | Stunden | Owner | Acceptance |
|---|---:|---|---|
| 5 weitere Salons Köln + 3 in Frankfurt onboarden | 8 | Yusuf | Total 11+ aktive Listings |
| Magazin-Artikel 1: "Wie funktioniert Stuhl-Miete?" | 4 | Yusuf+Cowork | 1500 Wörter, FAQ-Schema, live |
| Magazin-Artikel 2: "Steuern bei Stuhl-Miete" | 4 | Yusuf+Cowork | 1500 Wörter, mit Steuerberater verifizieren |
| Magazin-Artikel 3: "Checkliste Salonplatz mieten" | 3 | Yusuf+Cowork | 1200 Wörter |
| Google Search Console anmelden | 0.5 | Yusuf | Domain verifiziert, Sitemap eingereicht |
| Bing Webmaster Tools anmelden | 0.5 | Yusuf | Sitemap eingereicht |
| Lighthouse-Audit Top-5-Routes | 2 | Yusuf | Performance ≥ 90 mobile, SEO 100 |

---

## Sprint 4 (Woche 4) — Mieter-Akquise + Calculator

**Ziel**: Freelancer-Calculator live. 50+ Newsletter-Anmeldungen. Friseur-Schulen-Outreach gestartet.

| Deliverable | Stunden | Owner | Acceptance |
|---|---:|---|---|
| Calculator-Page bauen (/freelancer-rechner) | 6 | Cowork | Live, mit Tracking |
| 10 Friseur-Schulen anschreiben (Email-Template) | 4 | Yusuf | 10 Mails raus, 2-3 Antworten |
| 1 Workshop bei Schule pitchen | 2 | Yusuf | 1 Workshop-Termin gebucht |
| Türkische Insta-Influencer-Outreach (5 Profile) | 3 | Yusuf | 5 DMs, 1-2 Partnerschaften |
| Newsletter-Anmeldung-Banner auf Home + Magazin | 2 | Cowork | Banner live, Klick-Tracking |
| Provider-Empfehlungs-Programm: 50 € Credit | 4 | Cowork | Referral-Link generierbar |

---

## Sprint 5-6 (Wochen 5-6) — Scale Supply-Side

**Ziel**: 25 aktive Anbieter, 3 Städte mit ≥3 Anbietern pro Kategorie.

Wochen-Rhythmus:
- Mo: 10 neue DMs/Outreach
- Di: 2-3 Onboarding-Calls
- Mi: Concierge-Listings erstellen
- Do: Magazin-Artikel veröffentlichen (1/Woche)
- Fr: Metrics-Review + Sprint-Plan nächste Woche

Deliverables:
- Wochenende-Aktivität: Foto-Sessions bei 2-3 Salons
- Salon-of-the-Week-Programm starten
- Stadt-Hubs für Köln + Frankfurt + Berlin gehen auf "index" (≥3 Salons/Vertical)
- 2 Magazin-Artikel pro Woche

**Acceptance**: Tag 42:
- 25 verifizierte Anbieter (5 Köln + 5 Frankfurt + 5 Berlin + 5 München + 5 Hamburg)
- 100 Newsletter-Abonnenten
- 6 Magazin-Artikel live
- 5 Stadt × Vertical-Pages indexiert

---

## Sprint 7-8 (Wochen 7-8) — Demand-Side hochfahren

**Ziel**: 50 aktive Mieter mit Profil. Erste 10 Buchungen. CRO-Optimierung beginnt.

Deliverables:
- Lash-Influencer-Kampagne (3 Posts)
- 100 Freelancer-Calculator-Leads (über Insta-Ads ~200 € Budget)
- Friseur-Schule-Workshops (1-2 abgehalten)
- Erste 10 Buchungen über die Plattform
- Mieter-Welcome-Sequenz testen + optimieren
- Bewertungs-Aufforderung 24h post-Booking als Cron-Job

---

## Sprint 9-10 (Wochen 9-10) — A/B-Tests + Optimization

**Ziel**: Top-5 A/B-Tests gestartet. Conversion-Rate-Verbesserungen messen.

Tests (siehe Modul 6 Roadmap):
1. Trust-Bar über Hero
2. Founding-Salon-Badge
3. Sozial-Logins
4. Empty-State-CTA
5. Bewertungs-Aufforderung

Plus:
- Performance-Audit Lighthouse (CWV-Optimierung wenn nötig)
- Provider-Wizard 3-Step (siehe Modul 6 Test #20)
- Indexing-API + IndexNow-Integration

---

## Sprint 11-12 (Wochen 11-12) — Phase-1-Bilanz + Phase-2-Vorbereitung

**Ziel**: 90-Tage-Bilanz ziehen. Phase-Gate-Entscheidung treffen.

Deliverables:
- 90-Tage-Report (GMV, Listings, Mieter, Conversions)
- Phase-Gate-Check: Phase 1 → 2 (siehe unten)
- Wenn Gate erreicht: Phase-2-Plan starten (10 weitere Städte)
- Wenn Gate nicht erreicht: Strategie-Reset-Workshop (mit Mentor)

---

## Phase-Gate-Kriterien (operationalisiert)

### Phase 1 → Phase 2 (geplant: Tag 90)

**Mindestens 4 von 5 müssen erfüllt sein:**

1. **≥30 aktive Listings** über alle 5 Phase-1-Städte verteilt
2. **≥5 verifizierte Anbieter pro Stadt** in min. 3 Städten
3. **≥15 abgeschlossene Buchungen** mit Stripe-Zahlung
4. **≥500 organische Impressionen / Woche** in Google Search Console
5. **NPS ≥7** bei ersten 10 Mieter-Befragungen

**Wenn Gate erreicht**: Phase 2 starten (10 weitere Städte, programmatic Pages aktivieren).
**Wenn Gate nicht erreicht**: Strategie-Reset, kein Skalierungs-Druck.

### Phase 2 → Phase 3 (geplant: Monat 9-12)

- ≥500 aktive Listings über 15+ Städte
- ≥10.000 € GMV/Monat
- ≥3 Städte mit ≥10 Listings pro Top-Vertical
- Repeat-Booking-Rate ≥20 % bei aktiven Mietern

---

## Risk Register (Top 10)

| # | Risiko | Prob (1-5) | Impact (1-5) | Mitigation | Trigger-Signal |
|---|---|---:|---:|---|---|
| R-01 | Stripe-Connect-KYC dauert >14 Tage | 3 | 4 | Demo-Mode bis dahin, Test-Anbieter | Tag 14 noch nicht durch → eskalieren |
| R-02 | Salonkee oder Treatwell launchen DE-Vermietung | 2 | 5 | Differentiation: Anti-Bypass, Türk-Community, Köln-Fokus | Wettbewerb-PR-Coverage |
| R-03 | Google bestraft thin city-pages | 3 | 5 | Threshold-Logik im Code (heute live) | Search Console Coverage-Errors |
| R-04 | Burnout Yusuf (Solo-Founder) | 4 | 5 | 1 Tag/Woche komplett offline. Wöchentlicher Mentor-Call. | <30 % Wochen-Output-Rate |
| R-05 | Keine Anbieter trotz Outreach | 3 | 5 | Founding-Salon-Programm aufstocken (3 → 6 Monate 0%) | <5 Salons in Woche 4 |
| R-06 | DSGVO-Abmahnung wegen unsauberen Texten | 2 | 4 | Anwalt-Review vor Launch (~400 €) | Anwaltsschreiben |
| R-07 | Stripe-Connect-Compliance-Issue mit OP-Räumen | 2 | 3 | OP-Räume Phase 2 verschieben falls Risiko | Stripe-Mail mit Compliance-Anfrage |
| R-08 | Vercel/Supabase-Kostenexplosion bei Scale | 2 | 3 | Monitoring + Limit-Alerts setzen | Rechnung >100€/Monat |
| R-09 | Türkische Community reagiert nicht auf Outreach | 3 | 3 | Pivot auf deutsche/internationale Zielgruppe | <2 Influencer-Partnerschaften Tag 30 |
| R-10 | Anti-Bypass funktioniert nicht (Bypass-Rate >30%) | 3 | 5 | Vertragsstrafen-Klausel + Audit | >5 nachweisliche Bypass-Fälle |

---

## Weekly Operating Rhythm

### Montag (45 min): Sprint-Plan
- Letzte Woche: was wurde geliefert? was nicht?
- Diese Woche: Top-5-Deliverables in Reihenfolge
- Blocker identifizieren

### Mittwoch (30 min): Mid-Sprint-Check
- Bin ich auf Kurs?
- Wo hänge ich fest?
- Brauche ich Hilfe (Mentor, Anwalt, Designer)?

### Freitag (60 min): Review + Metrics
- KPI-Dashboard checken (siehe `07-kpi-dashboard.md`)
- Was hat funktioniert?
- Was nicht?
- Lessons Learned dokumentieren

### Stand-Up-Template (Self-Talk, 10 min täglich)

```
1. Was hab ich gestern geschafft?
2. Was mache ich heute?
3. Was blockiert mich?
4. Bin ich noch im Plan oder driftet was?
5. Wann nehme ich mir heute 30 min Pause?
```

---

## Externes Budget (90 Tage)

| Posten | Monatlich | 90-Tage-Gesamt |
|---|---:|---:|
| Vercel Pro | 20 € | 60 € |
| Supabase Pro | 25 € | 75 € |
| Resend (10k Mails/Monat) | 20 € | 60 € |
| Twilio (SMS-Trial → Pay-as-you-go) | 15 € | 45 € |
| AWS S3 (Bildspeicher) | 10 € | 30 € |
| Domain (chairmatch.de) | — | 12 € (jährlich) |
| Apple Developer | — | 99 € (jährlich) |
| Google Play | — | 25 € (einmalig) |
| Stripe-Connect-Fees | (variabel) | ~50 € |
| Legal Review (Anwalt) | — | 400 € einmalig |
| Designer-Stunden für Marketing | 200 € | 600 € |
| Ahrefs Lite | 99 € | 297 € |
| Marketing-Ads (Insta/Meta) | 300 € | 900 € |
| Buchhaltungstools (Lexware o.ä.) | 20 € | 60 € |
| Sentry (kostenlos bis 50k Errors) | 0 € | 0 € |
| **TOTAL** | | **~2.700 €** |

Plus: Eigene Arbeitszeit (75 % der Wertschöpfung).

---

## Stop-Conditions

**Stop 1 (Tag 30)**: Wenn weniger als 5 Founding-Salons signed:
- Schritt zurück: Outreach-Script überarbeiten
- 1 Mentor-Call (Marketplace-erfahrener Gründer)
- Wenn Tag 45 immer noch nicht 10 Salons: Pivot-Diskussion

**Stop 2 (Tag 45)**: Wenn organische Impressionen <500/Woche:
- Tech-Sprint einschieben (Indexierung debuggen, Sitemap-Submission-Check)
- Search Console manuelle Inspection für Top-10-URLs

**Stop 3 (Tag 60)**: Wenn keine Buchungen über Plattform:
- Bypass-Audit: machen Anbieter Buchungen außerhalb?
- Anti-Bypass-UX verschärfen
- Booking-Funnel-Drop-Off analysieren

**Stop 4 (Tag 75)**: CWV-Regression:
- Wenn Lighthouse Performance unter 75 fällt → 2-Tage-Tech-Sprint

**Burnout-Stop (jederzeit)**: 
- 3 Tage in Folge <30 % Output → 1 Woche Pause, kein Slack/Outreach
