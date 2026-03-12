# ChairMatch — Durum & Eksikler (Status & Lücken)

Stand: März 2026

---

## ✅ TAMAMLANAN (Spec V2)

| # | Özellik | Durum |
|---|---------|-------|
| 1 | **RBAC** | CUSTOMER, PROVIDER, BUSINESS_OWNER, ADMIN, SUPER_ADMIN — lib/rbac.ts, Middleware |
| 2 | **consent_logs** | Signup'ta AGB, Datenschutz, Marketing kaydı |
| 3 | **cookie_consents** | TTDSG Cookie-Banner (granular), /cookie-settings |
| 4 | **availability_blocks** | DB-Tabelle (Urlaub/Sperrzeiten) |
| 5 | **login_attempts** | Rate-Limit 10/15min pro IP, Brute-Force-Schutz |
| 6 | **Compliance-Seiten** | Impressum, Datenschutz, AGB, AGB-Provider |
| 7 | **Storno-Policy** | AGB § 4a (24h kostenlos, 50% < 24h, 100% No-Show) |
| 8 | **Availability API** | APPOINTMENT (salonId+serviceId), RENTAL (resourceId) |
| 9 | **Passwort-Policy** | Min 10 Zeichen, 1 Großbuchstabe, 1 Zahl, 1 Sonderzeichen |
| 10 | **Betroffenenrechte** | Daten-Export (JSON), Konto-Löschung (Soft-Delete) |
| 11 | **Security Headers** | HSTS, X-Content-Type-Options, X-Frame-Options |
| 12 | **Booking** | booking_type, resource_id (APPOINTMENT vs RENTAL) |

---

## ⚠️ KISMI TAMAMLANAN

| # | Özellik | Eksik |
|---|---------|-------|
| 1 | **Auth** | JWT 15min + Refresh 30 Tage — NextAuth JWT kullanıyor, DB-Refresh yok |
| 2 | **Session-Limit** | Max 5 aktive Sessions — implementiert değil |
| 3 | **Account-Lockout** | 5 Fehlversuche → E-Mail — sadece Rate-Limit var, Lockout E-Mail yok |
| 4 | **Compliance-Ampel** | documents, insurance_policies tabloları var — Ampel-Logik (RED/YELLOW/GREEN) eksik |
| 5 | **Risk-Gating** | services.risk_level var — Buchung block wenn nicht GREEN/Protect eksik |
| 6 | **Behördenpaket** | authorities_packs, submission_tickets — ZIP/PDF export placeholder, mailto |
| 7 | **Storno im Buchungs-Flow** | AGB'de yazıyor — Step 3'te gösterim eksik |

---

## ✅ EK TAMAMLANAN (Bu Oturumda)

| # | Özellik |
|---|---------|
| 1 | **Storno im Buchungs-Flow** | Step 3'te Storno-Policy anzeigen |
| 2 | **Hard-Delete Cron** | Vercel Cron täglich 02:00, 30 Tage nach Soft-Delete |
| 3 | **DSA Review Melden** | POST /api/reviews/[id]/report, Melden-Button pro Review |
| 4 | **Passwort-Reset** | /auth/forgot-password, /auth/reset-password, Supabase |

## ❌ EKSİK (Spec)

| # | Özellik | Açıklama |
|---|---------|----------|
| 1 | **E-Mail-Verifikation** | Pflicht nach Signup — Supabase veya Resend |
| 2 | **MFA/TOTP** | Optional, Account-Settings'de aktivierbar |
| 4 | **Social Login** | Google OAuth, Apple Sign-In (Phase 2) |
| 5 | **i18n** | 8 Sprachen (de, en, tr, fr, es, it, pl, ar) — next-intl |
| 6 | **Stripe Connect** | Buchungen, Protect, Einreich-Service — Payment |
| 7 | **DAC7** | Provider: TIN, IBAN, Umsätze — Jahresreport CSV/PDF |
| 8 | **DSA** | Review "Melden" → Moderation, Statement of Reasons |
| 9 | **P2B** | Provider-EULA vollständig (externe Beschwerdestelle, etc.) |
| 10 | **Cron: Hard-Delete** | 30 Tage nach Soft-Delete → Löschung |
| 11 | **Cron: DAC7** | 1. Januar Meldepflicht-Erinnerung |
| 12 | **zxcvbn** | Passwort-Stärke-Anzeige im UI |
| 13 | **CSRF** | NextAuth CSRF — prüfen |
| 14 | **CSP** | Content-Security-Policy — nur basis headers |
| 15 | **Registrierung** | Telefonnummer + Rolle (Customer/Provider/BO) — optional |

---

## 📋 MIGRATIONEN (Supabase)

```sql
-- Ausführen in Supabase SQL Editor:
-- 1. supabase/migrations/20260311_spec_v2.sql
-- 2. supabase/migrations/20260312_account_deletion.sql
```

---

## 🎯 ÖNCELİK (Öneri)

| Priorität | Thema | Aufwand |
|-----------|-------|---------|
| 1 | E-Mail-Verifikation (Resend) | Mittel |
| 2 | Storno im Buchungs-Flow anzeigen | Klein |
| 3 | Hard-Delete Cron (Vercel Cron) | Klein |
| 4 | i18n (de + en zuerst) | Groß |
| 5 | Stripe Connect (Phase 2) | Groß |
