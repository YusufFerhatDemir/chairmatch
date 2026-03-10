# ChairMatch – Roadmap

Priorisierte Phasen bis zum vollständigen MVP aus dem Master-Plan.

---

## Phase 1: Steuerung & Transparenz (sofort / kurzfristig)

| # | Thema | Beschreibung | Status |
|---|--------|--------------|--------|
| 1.1 | **Besucher-Tracking** | Admin sieht: wer kommt auf die App/Seite, IP, Herkunft (Land), besuchte Seiten, Zeit. DSGVO-konform (minimal, Zweck: Betrugsprävention/Statistik). | In Arbeit |
| 1.2 | **Admin-Übersicht** | Eine zentrale Übersicht: was kann Admin alles steuern (Salons, User, Buchungen, Inhalte, Einstellungen). Link zu allen Bereichen. | Geplant |
| 1.3 | **Audit-Logs UI** | Admin-Screen „Audit-Logs“: wer hat wann was gemacht (Buchungen, Reviews, Admin-Aktionen). | Offen |
| 1.4 | **Statistik vertiefen** | Mehr KPIs im Dashboard: Buchungen pro Tag/Woche, Top-Salons, Conversion (Besucher → Buchung). | Offen |

---

## Phase 2: Compliance & Rechtssicherheit

| # | Thema | Beschreibung |
|---|--------|--------------|
| 2.1 | **Dokumente & Ampel** | DB: `documents` (Location + Provider). Upload für Hygiene, Versicherung, Qualifikation. Ampel RED/YELLOW/GREEN. |
| 2.2 | **Risk-Level** | Kategorien/Services: risk_level (LOW/HIGH/VERY_HIGH). Buchung nur wenn Standort + Behandler GREEN. |
| 2.3 | **ChairMatch Protect** | DB: `insurance_policies`, `protect_pricing`. UI: Provider kann Protect buchen (Day/Month/Year). Stripe Checkout. |
| 2.4 | **Consent (Kunde)** | Für HIGH/VERY_HIGH: digitaler Consent (Risiken, Kontraindikationen) vor Buchungsbestätigung. DB: `consents`. |

---

## Phase 3: Behörden & Monetarisierung

| # | Thema | Beschreibung |
|---|--------|--------------|
| 3.1 | **Behördenpaket (kostenlos)** | „Paket erstellen“ → ZIP/PDF aus Standort-Docs. „E-Mail vorbereiten“ → mailto mit Anhang. User sendet selbst. |
| 3.2 | **Einreich-Service (Paid)** | DB: `authorities_packs`, `submission_tickets`. Pläne: 99€ einmal, 299€/Jahr, 39€/Monat. Ticket-Workflow, Admin lädt Proof hoch. |
| 3.3 | **Stripe Connect (Buchungen)** | Kunde zahlt online. Plattform-Fee 12/15/18 % je Risk. Auszahlung an Anbieter. |

---

## Phase 4: Produkt & Skalierung

| # | Thema | Beschreibung |
|---|--------|--------------|
| 4.1 | **Owner-Rolle** | Eigene Route-Gruppe `(owner)`: Locations, Compliance, Behördenpaket, Einreich-Tickets. |
| 4.2 | **Admin: Documents, Tickets, Pricing** | Screens: Dokumente prüfen, Submission-Tickets, Risk-Settings, Protect-Preise, Compliance-Pläne. |
| 4.3 | **Reviews-Moderation** | Report-Button, moderation_status, Admin „Reviews prüfen“. |
| 4.4 | **No-Show Protection** | Karte hinterlegen (Stripe), Stornierungsregeln (z. B. 24h vorher). |
| 4.5 | **SEO OP-Räume** | Landing-Pages: /op-raeume, /op-raum-mieten-[stadt]. |

---

## Phase 5: Optional (Post-MVP)

| # | Thema |
|---|--------|
| 5.1 | E-Commerce (Shop für Verbrauchsmaterial) |
| 5.2 | Filter „Heute/Morgen“ (Slots), „In 3 km“ (Geo) |
| 5.3 | Mehrsprachigkeit (EN/TR) |

---

## Zeitleiste (Vorschlag)

- **Jetzt:** Phase 1 (Besucher-Tracking, Admin-Übersicht, ggf. Audit-Logs UI).
- **Nächste 4–8 Wochen:** Phase 2 (Compliance, Risk, Protect, Consent).
- **Danach:** Phase 3 (Behördenpaket, Einreich-Service, Stripe).
- **Anschließend:** Phase 4 (Owner, Admin-Screens, Moderation, No-Show, SEO).

Die genaue Reihenfolge kannst du je nach Investor-/Partner-Fokus anpassen (z. B. zuerst Stripe, wenn Umsatz wichtig ist).
