# ChairMatch – Ende (Übersicht)

Stand nach Umsetzung der geplanten Bausteine. So siehst du „das Ende“.

---

## 1. Datenbank (Migrationen ausführen)

In Supabase nacheinander ausführen:

- `supabase/migrations/20260307_ensure_tables.sql`
- `supabase/migrations/20260309_visit_logs.sql`
- `supabase/migrations/20260309_audit_logs.sql`
- `supabase/migrations/20260310_compliance_and_plans.sql`

Damit sind vorhanden:

- **visit_logs** – Besucher-Tracking  
- **audit_logs** – Wer hat wann was gemacht  
- **documents** – Compliance-Dokumente (Standort + Behandler)  
- **insurance_policies** – ChairMatch Protect  
- **authorities_packs** – Behördenpaket  
- **submission_tickets** – Einreich-Service  
- **consents** – Kunden-Einwilligung (HIGH/VERY_HIGH)  
- **protect_pricing** – Protect-Preise (HIGH/VERY_HIGH)  
- **compliance_plans** – Einreich-Preise (99€/299€/39€)  
- **services.risk_level** – LOW / HIGH / VERY_HIGH  

---

## 2. Admin-Panel (`/admin`)

- **Dashboard** – KPIs, Letzte Buchungen, Links  
- **Salons verwalten** – Anbieter/Salons  
- **Benutzer verwalten** – Rollen  
- **Buchungen** – Liste, Status  
- **Statistik** – KPIs, Buchungen (7 Tage), Top-Salons  
- **Besucher & Analytics** – IP, Land, Seite, Zeit  
- **Audit-Logs** – Aktionen (Buchung, Review)  
- **Dokumente prüfen** – Liste, Status (pending/approved/rejected)  
- **Einreich-Tickets** – Status, Notizen  
- **Risk-Settings** – Kategorie-Standards (LOW/HIGH/VERY_HIGH)  
- **Pricing** – Protect-Preise + Compliance-Pläne  
- **Super-Admin** – Einstellungen, Logo, Kategorien, Onboarding  

---

## 3. Owner-Bereich (`/owner`)

- **/owner** → Weiterleitung zu `/owner/locations`  
- **/owner/locations** – Meine Standorte (Salons des Anbieters), Link zu Compliance  
- **/owner/compliance** – Platzhalter: Pflicht-Dokumente (Hygiene, Reinigung, Hausordnung, Geräteliste)  
- **/owner/authorities** – Platzhalter: Behördenpaket (kostenlos) + Einreich-Service (Paid)  

Zugriff: Anbieter (und Admin). Im Provider-Dashboard Link: „Standorte & Compliance →“.

---

## 4. Buchungsflow

- **Consent:** Wenn der gewählte Service **risk_level** HIGH oder VERY_HIGH hat, erscheint im letzten Schritt eine Checkbox: „Ich bestätige die Risikoaufklärung, Kontraindikationen und Datenschutz-Hinweise.“ Ohne Haken ist „Jetzt buchen“ deaktiviert.  
- Beim Absenden wird `consentGiven` mitgeschickt; das Backend speichert einen Eintrag in **consents** (booking_id, signed_at).  
- **services.risk_level** kommt aus der DB (Spalte `risk_level`). Ohne Migration ist das Feld leer → kein Consent-Schritt.  

---

## 5. Komponenten

- **ComplianceStatusPill** – RED / YELLOW / GREEN (z. B. für spätere Ampel-UI).  
- **RiskBadge** – LOW / MED / HIGH / VERY_HIGH (für Services/Kategorien).  

Einsatz: z. B. in Salon-Detail oder Admin nach Bedarf einbinden.

---

## 6. Was du siehst („das Ende“)

1. **Als Admin:** Einloggen → `/admin` → alle oben genannten Menüpunkte; Besucher, Audit-Logs, Dokumente, Tickets, Risk, Pricing.  
2. **Als Anbieter:** `/provider` → Dashboard + „Standorte & Compliance“ → `/owner/locations` → Compliance & Behördenpaket (Platzhalter).  
3. **Als Kunde:** Buchung eines Services mit **risk_level** HIGH/VERY_HIGH → im letzten Schritt Consent-Checkbox → nach Buchung Consent in DB.  
4. **Migrationen laufen** → Protect- und Compliance-Preise in Admin unter „Pricing“ sichtbar; Dokumente/Tickets-Listen nutzbar.  

---

## 7. Noch nicht umgesetzt (für später)

- Stripe (Buchung, Protect, Einreich-Service)  
- Echter Dokument-Upload und Freigabe-Workflow  
- Echter Ticket-Workflow (Status ändern, Proof hochladen)  
- Behördenpaket-Generierung (ZIP/PDF) und mailto  
- ChairMatch-Protect-Kauf (Stripe Checkout)  
- Location/Provider-Compliance-Ampel (RED/YELLOW/GREEN) und Gating  

Das sind die nächsten Schritte aus der ROADMAP; die Struktur (DB, Routen, UI-Platzhalter) steht.
