# ChairMatch – Lücken & Verbesserungsvorschläge

Was noch fehlt und was du verbessern kannst.

---

## 1. Lücken (noch nicht umgesetzt)

### Compliance & Recht
- **Location-Compliance:** Keine Uploads für Hygiene-Plan, Reinigung, Hausordnung, Geräteliste, Abfallkonzept, OP-Checkliste.
- **Provider-Compliance:** Keine Nachweise (Qualifikation, Versicherung/Protect). Keine Ampel.
- **Risk-Gating:** Kein risk_level an Services/Kategorien; Buchung wird nicht blockiert bei fehlender Versicherung.
- **Medizinischer Consent:** Kein digitaler Consent vor Buchung bei riskanten Behandlungen.
- **ChairMatch Protect:** Kein Produkt, keine Preise, keine Stripe-Anbindung.

### Behörden & Geld
- **Behördenpaket:** Kein kostenloses Paket (ZIP/PDF + mailto).
- **Einreich-Service:** Keine Tickets, keine Pläne (99€/299€/39€), kein Admin-Workflow.
- **Zahlungen:** Kein Stripe (weder Buchung noch Protect noch Einreich-Service). Nur „Bezahlung vor Ort“.

### Rollen & Admin
- **Owner-Rolle:** Kein eigenes Portal für Standortanbieter (Locations, Compliance, Behörden).
- **Admin-Screens fehlen:** Documents Verification, Submission Tickets, Risk Settings, Protect Pricing, Compliance Plans, Reviews Moderation, Audit-Logs-UI.
- **Besucher-Tracking:** Keine Übersicht, wer die App/Seite besucht (IP, Herkunft, Seiten) – wird ergänzt.

### Produkt
- **Rooms & Availability:** Keine Tabelle `rooms` (Stuhl/Kabine/OP pro Location), keine `availability_slots`; Buchung nutzt feste Zeiten.
- **No-Show Protection:** Keine Karte hinterlegen, keine Stornierungsregeln.
- **Reviews:** Kein Report-Button, keine Moderation (published/hidden), kein Admin-Review-Screen.
- **SEO:** Keine dedizierten Landings für OP-Raum pro Stadt.

---

## 2. Verbesserungsvorschläge (bestehende Features)

### UX & Conversion
- **Onboarding:** Nach Rolle „Anbieter“ direkt zu „Stuhl/Kabine anbieten?“ und Register-Anbieter verlinken.
- **Buchungsabschluss:** Optional E-Mail-Bestätigung an Kunde + Salon (mit Kalender-Link).
- **Salon-Detail:** Klare CTAs: „Termin buchen“ vs. „Stuhl mieten“ (B2B).
- **Suche:** Suchfeld mit Vorschlägen (wie jetzt) + „Beliebte Suchen“ (z. B. „Barber Frankfurt“).

### Trust & Sicherheit
- **Verified-Badge:** Deutlicher sichtbar (z. B. neben Salon-Name). Kurzer Tooltip „Von ChairMatch verifiziert“.
- **Datenschutz/Impressum:** Link zu „Wie wir deine Daten nutzen“ (inkl. Besucher-Logging, sobald aktiv).
- **AGB:** Optional Abschnitt zu Stornierung, No-Show, Zahlung (wenn Stripe kommt).

### Admin
- **Ein Dashboard pro Rolle:** Kunde sieht „Meine Buchungen“, Anbieter „Mein Salon / Buchungen“, Admin alles.
- **Export:** Admin kann Buchungen/User/Salons als CSV exportieren (DSGVO-konform, Zweck angeben).
- **Sperren/Ban:** Klare Aktion „Benutzer sperren“ (Account deaktivieren), Grund optional.

### Technik
- **Fehlerbehandlung:** Einheitliche Error-Boundaries und „Etwas ist schiefgelaufen“-Seiten.
- **Ladezustände:** Skeleton oder Spinner bei allen Listen (Salons, Buchungen, Admin-Tabellen).
- **Mobile:** Bottom-Nav prüfen (Safe Area), Buttons groß genug (min 44px touch).

### Rechtliches
- **Cookie-Banner:** Link zu Datenschutz + optional „Nur notwendige“ / „Alle“ (wenn du Marketing-Cookies nutzt).
- **Besucher-Logging:** In Datenschutz erwähnen: Speicherdauer, Zweck (Betrieb, Statistik, Missbrauchsabwehr), keine Weitergabe an Dritte ohne Grund.

---

## 3. Prioritäten (Empfehlung)

1. **Sofort:** Besucher-Tracking + Admin-Übersicht (Steuerung & Transparenz).
2. **Kurzfristig:** Audit-Logs im Admin sichtbar machen; Statistik erweitern.
3. **Mittelfristig:** Risk-Level + Protect + Consent (Compliance-Kern); danach Behördenpaket + Einreich-Service.
4. **Langfristig:** Stripe (Buchung + Protect + Einreich); Owner-Portal; Reviews-Moderation.

Wenn du willst, können wir die nächsten konkreten Tickets (z. B. „API /api/analytics/visit“, „Admin-Seite Besucher“) daraus ableiten.
