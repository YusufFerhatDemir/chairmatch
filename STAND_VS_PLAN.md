# ChairMatch – Stand vs. Master-Plan

Vergleich: Was der Plan vorsah vs. was aktuell umgesetzt ist.

---

## ✅ Bereits umgesetzt (oder teilweise)

### 1) Produkt & Basis
| Plan | Stand |
|------|--------|
| B2C Booking (Kunde bucht Service) | ✅ Buchungsflow: Salon → Service → Datum/Uhrzeit → Kontakt → Bestätigung + Success-Seite |
| Behandler/Provider bieten Services an | ✅ Anbieter = Salon-Owner; Services pro Salon; Register-Anbieter-Flow |
| Standort/Räume (Stuhl, OP-Raum) | ✅ `rental_equipment`, `/rentals`, Vermietung-Tab im Salon, CTA auf Home |
| Admin verifiziert / verwaltet | ✅ Admin-Panel (KPIs, Salons, Benutzer, Buchungen, Statistik); Super-Admin (Einstellungen, Logo, Kategorien, Onboarding) |
| Kategorien (Barber, Friseur, Kosmetik, …) | ✅ Kategorien mit Icons, `/category/[slug]`, DB + Demo-Daten |
| OP-Raum als Kategorie/Icon | ✅ Kategorie „OP-Raum“, Icon, in Rentals/CTA sichtbar |
| Deploy Vercel, Next.js App Router, TypeScript, Supabase | ✅ |
| Icons/Logo: PNG 1:1, Labels im UI | ✅ BrandLogo, Kategorie-Icons, Hochformat-Rahmen |

### 2) Rollen (RBAC)
| Plan | Stand |
|------|--------|
| CUSTOMER, PROVIDER, OWNER, ADMIN | ⚠️ **Teilweise:** `kunde` | `anbieter` | `admin` | `super_admin` (+ `b2b` im Onboarding). **Kein separates OWNER** – Owner = Salon-`owner_id` (Anbieter) |
| Route Guards server-side | ✅ Middleware: `/provider`, `/admin` nach Rolle; (protected) für Buchung/Account |
| app/(customer)/… (provider)/… (owner)/… (admin)/… | ⚠️ **(public)** statt (customer); **(provider)**; **(admin)**; **(protected)**. **Kein (owner)** – Owner-Funktionen fehlen als eigene Route-Gruppe |

### 3) Booking & Kunde
| Plan | Stand |
|------|--------|
| Kunde bucht Service | ✅ |
| Buchungsliste für Kunde | ✅ Account: „Buchungen“ (API `/api/bookings`) |
| Buchungsstatus (pending, confirmed, completed, cancelled, no_show) | ✅ Status + Transitions (provider: confirm, complete, no_show, cancel) |
| Promo-Codes | ✅ Promo-Codes bei Buchung, DB `promo_codes` |
| Audit-Logs für Buchungen | ✅ `audit_logs` (booking created/cancelled/confirmed/completed/no_show) |

### 4) Reviews
| Plan | Stand |
|------|--------|
| Nach COMPLETED: Kunde bewertet | ✅ Reviews (customer → salon, mit booking_id), Reply durch Salon-Owner |
| Report / Moderation | ❌ Kein Report-Button, kein `moderation_status` / `reported_flag` in DB |
| Admin Reviews-Moderation | ❌ Kein Admin-Screen „Reviews Moderation“ |

### 5) Admin-Panel
| Plan | Stand |
|------|--------|
| Dashboard (KPIs) | ✅ Salons, Buchungen, Bewertungen, Benutzer + Letzte Buchungen |
| Users (ban/unban) | ✅ Benutzer verwalten (Rolle ändern) – Ban/Unban unklar |
| Providers/Salons verwalten | ✅ Anbieter/Salons verwalten |
| Buchungen | ✅ Admin Buchungen-Liste |
| Statistik | ✅ Statistik-Seite |
| Super-Admin: Einstellungen, Logo, Kategorien, Onboarding | ✅ |
| **Documents Verification** (approve/reject) | ❌ Fehlt |
| **Risk Settings** (category risk, service overrides) | ❌ Fehlt |
| **Protect Pricing Table** | ❌ Fehlt |
| **Compliance Plans & Submission Pricing** | ❌ Fehlt |
| **Submission Tickets** (Workflow + Proof) | ❌ Fehlt |
| **Reviews Moderation** | ❌ Fehlt |
| **Audit Logs** (eigener Screen) | ❌ Nur in DB genutzt, kein Admin-UI |

### 6) DB-Schema
| Plan | Stand |
|------|--------|
| users/profiles, salons, services, staff, bookings | ✅ (profiles, salons, services, staff, bookings) |
| rooms (chair/bed/op_room), availability_slots | ❌ Keine `rooms`; keine `availability_slots` (Buchung nutzt feste Slots/Zeiten) |
| documents (owner_type, doc_type, verified_status) | ❌ Fehlt |
| insurance_policies (Protect) | ❌ Fehlt |
| authorities_packs, submission_tickets | ❌ Fehlt |
| consents (booking_id, signed_pdf_url) | ❌ Fehlt |
| reviews (moderation_status, reported_flag) | ⚠️ reviews vorhanden, aber ohne moderation/reported |
| audit_logs | ✅ Wird beschrieben/genutzt (Tabelle muss existieren) |
| protect_pricing, compliance_plans (Config) | ❌ Fehlt |
| rental_equipment, rental_bookings | ✅ |
| promo_codes, offers, favorites, onboarding_slides | ✅ (bzw. in Nutzung) |

### 7) Wettbewerbs-Features (6 Punkte)
| Plan | Stand |
|------|--------|
| 1) Filter/Chips: Heute, Morgen, Unter 30€, In 3km, Top bewertet | ⚠️ **Teilweise:** Filter: Stadt, Mindestbewertung (★), Maximalpreis, „Nur Verfügbare“, „Nur Rabatte“. Keine Chips „Heute/Morgen“ (nur Badge „Heute verfügbar“), kein „In 3km“ (kein Geo) |
| 2) Verified Badges | ✅ `is_verified` (Salons), in UI nutzbar |
| 3) No-show protection (Karte hinterlegen, Stornierungsregeln) | ❌ Nur „No-Show markieren“ für Provider, keine Karte/Stornierungsregeln |
| 4) Schnelles Onboarding (3-Step) für Provider/Owner | ✅ Onboarding (Slides, Rolle, Kunde/Anbieter/B2B), Register-Anbieter mehrstufig |
| 5) Boost/Featured Listing | ✅ `boost`, `tier` (gold/premium/free), Sortierung nach boost |
| 6) Compliance as Product (Pläne + Ticket-Service) | ❌ Nicht umgesetzt |

---

## ❌ Noch nicht umgesetzt (Kern des Plans)

### Compliance Center (komplett offen)
- **Location Compliance (Owner):** hygiene_plan_pdf, cleaning_disinfection_plan, house_rules_pdf, equipment_list, waste_disposal, op_sterile_checklist, device_docs – **alles fehlt**
- **Provider Compliance:** eligibility_proof, insurance_policy_pdf ODER ChairMatch Protect – **fehlt**
- **Ampel RED/YELLOW/GREEN** für Standort + Behandler – **fehlt**
- Keine `documents`-Tabelle, kein Upload, kein Verify-Workflow

### Risk-Gating (komplett offen)
- **risk_level** (LOW / HIGH / VERY_HIGH) pro Service/Kategorie – **nicht in DB, nicht in Logik**
- Buchung nur wenn location_compliance GREEN, provider_compliance GREEN – **fehlt**
- HIGH/VERY_HIGH: insurance_ok (Policy oder Protect) Pflicht – **fehlt**
- HIGH/VERY_HIGH: Consent (digital signiert) vor Zahlung/Bestätigung – **fehlt** (nur Cookie-Consent-Banner vorhanden)

### ChairMatch Protect (komplett offen)
- In-App-Versicherungs-Add-on (Day/Month/Year, HIGH/VERY_HIGH Preise) – **fehlt**
- Stripe Checkout für Protect, Webhook → Policy aktiv – **fehlt**
- Keine `insurance_policies`-Tabelle, kein Protect-UI für Provider

### Consent (Kunde, medizinisch)
- Informed consent + Contraindications + Privacy vor Zahlung/Bestätigung für HIGH/VERY_HIGH – **fehlt**
- consent PDF + timestamp + checksum an booking – **fehlt** (keine `consents`-Tabelle)

### Behördenpaket + Einreich-Service
- **Kostenlos:** Behördenpaket erstellen (ZIP/PDF), E-Mail vorbereiten (mailto), User sendet selbst – **fehlt**
- **Paid:** ChairMatch Einreich-Service (99€ einmal, 299€/Jahr, 39€/Monat), Ticket-Workflow (OPEN → … → DONE), Admin Proof-Upload – **fehlt**
- Keine `authorities_packs`, keine `submission_tickets`

### Payments (Marketplace)
- **Stripe Connect** für Buchungszahlung (Kunde zahlt, Plattform-Fee 12/15/18 %) – **fehlt** (Bezahlung „vor Ort“)
- Stripe für Protect (Provider zahlt) – **fehlt**
- Stripe für Authorities-Service (Owner zahlt) – **fehlt**
- Keine Stripe-Integration im Code (nur CSP erwähnt Stripe)

### Auth
- Plan: login/page, signup/page | **Stand:** eine `auth/page` (Login; Signup/Register teils über Onboarding + Register-Anbieter)

### App-Router-Struktur (Plan vs. Stand)
| Plan | Stand |
|------|--------|
| app/(customer)/bookings/page.tsx | ❌ Stattdessen: (protected)/account mit Buchungsliste; (protected)/booking/[salonId] |
| app/(provider)/dashboard, compliance, protect | ⚠️ **provider/page** (Dashboard), **keine** provider/compliance, provider/protect |
| app/(owner)/locations, compliance, authorities | ❌ **Kein (owner)**; keine Owner-spezifischen Seiten |
| app/(admin)/documents, tickets, risk-settings, pricing | ❌ Alles fehlt |
| lib/rbac.ts | ⚠️ Rolle in session + requireRole(), keine zentrale rbac.ts mit allen Regeln |
| CategoryCard, PricingCards, ComplianceStatusPill, RiskBadge | ⚠️ Karten/Category-UI ja; **keine** PricingCards (Protect/Compliance), **kein** ComplianceStatusPill, **kein** RiskBadge |

### SEO
- OP-Räume eigene Landing (/op-raeume, /op-raum-mieten-[stadt]) – **nur** Kategorie + Rentals, keine dedizierten SEO-Landing-Pages

### E-Commerce Add-on (optional)
- Shop für Verbrauchsmaterial – **nicht umgesetzt** (laut Plan optional für MVP)

---

## Kurzfassung

- **Läuft schon:** B2C-Buchung, Anbieter-Registrierung, Salons/Services/Kategorien, Rentals (Stuhl/Kabine/OP), Reviews (ohne Moderation), Admin Grundfunktionen, Super-Admin, Favoriten, Promo, Audit-Logs für Buchungen, Basis-RBAC, Filter (Stadt, Bewertung, Preis, Verfügbar, Rabatt), Verified, Boost/Tier.
- **Fehlt komplett:** Compliance (Location + Provider), Ampel, Risk-Gating, ChairMatch Protect, medizinischer Consent, Behördenpaket + Einreich-Service, Stripe (Buchung + Protect + Authorities), Owner-Rolle/Seiten, Admin: Documents/Tickets/Risk-Settings/Pricing/Reviews-Moderation/Audit-UI, No-show protection (Karte/Stornoregeln), DB-Tabellen: documents, insurance_policies, authorities_packs, submission_tickets, consents, protect_pricing, compliance_plans, rooms, availability_slots; erweiterte reviews (moderation/reported).

Wenn du willst, können wir als Nächstes eine **priorisierte Roadmap** (z. B. Phase 1: Protect + Risk + Consent, Phase 2: Compliance + Behördenpaket, Phase 3: Stripe) daraus ableiten.
