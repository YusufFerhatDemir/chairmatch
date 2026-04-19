# ChairMatch — Launch Checklist

Alles was du selbst erledigen musst, bevor die App live geht.
Code, Templates und Routen sind fertig — diese Liste sind die „letzten 20 %", die echte Accounts und Keys brauchen.

---

## 1. Supabase — 10 Migrationen ausführen

Die Datenbank-Schemas existieren als SQL-Dateien in `supabase/migrations/`. Führe sie **in dieser Reihenfolge** im Supabase SQL-Editor aus:

> Supabase Dashboard → dein Prod-Projekt → **SQL Editor** → neue Query → Inhalt reinkopieren → **Run**

| # | Datei | Was sie macht |
|---|-------|---------------|
| 1 | `20260307_ensure_tables.sql` | Basis-Tabellen (Newsletter, etc.) |
| 2 | `20260309_audit_logs.sql` | Audit-Log-Tabelle |
| 3 | `20260309_visit_logs.sql` | Besucher-Analytics (DSGVO-konform) |
| 4 | `20260310_compliance_and_plans.sql` | Compliance-Dokumente, Abo-Pläne |
| 5 | `20260311_spec_v2.sql` | RBAC-Rollen, Consent, Cookies, Verfügbarkeit |
| 6 | `20260312_account_deletion.sql` | Soft-Delete für DSGVO Art. 17 |
| 7 | `20260313_reviews_report.sql` | Bewertungs-Moderation (DSA) |
| 8 | `20260316_fix_register_trigger.sql` | Profil-Trigger bei Registrierung |
| 9 | `20260317_payments_and_compliance.sql` | Zahlungen, Compliance, Chat, Notifications |
| 10 | `20260321_marketplace_and_commissions.sql` | Marktplatz & Provisionen |

**Alternativ per CLI** (wenn Supabase CLI installiert):
```bash
supabase db push --db-url "postgresql://postgres:[DB_PASSWORT]@db.[PROJEKT_ID].supabase.co:5432/postgres"
```
Das DB-Passwort findest du in: Supabase → Settings → Database → Connection string.

---

## 2. Vercel — Umgebungsvariablen eintragen

> Vercel Dashboard → dein Projekt → **Settings → Environment Variables**
> Für alle Variablen: Environment = **Production** (+ Preview wenn gewünscht)

### Supabase
| Variable | Wo du den Wert findest |
|----------|------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (**geheim!**) |

### Stripe
| Variable | Wo du den Wert findest |
|----------|------------------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API Keys → Publishable key |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API Keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → dein Endpoint → Signing secret |
| `STRIPE_PRICE_STARTER` | Stripe → Products → Starter → Price ID |
| `STRIPE_PRICE_PREMIUM` | Stripe → Products → Premium → Price ID |
| `STRIPE_PRICE_GOLD` | Stripe → Products → Gold → Price ID |

### E-Mail (Resend)
| Variable | Wo du den Wert findest |
|----------|------------------------|
| `RESEND_API_KEY` | resend.com → API Keys → Create API Key |
| `RESEND_FROM_EMAIL` | `ChairMatch <noreply@chairmatch.de>` (nach Domain-Verifizierung) |

### Push Notifications (VAPID)
| Variable | Wie generieren |
|----------|----------------|
| `VAPID_PUBLIC_KEY` | Terminal: `npx web-push generate-vapid-keys` — Public Key |
| `VAPID_PRIVATE_KEY` | Terminal: `npx web-push generate-vapid-keys` — Private Key |
| `VAPID_EMAIL` | `mailto:admin@chairmatch.de` |

### App & Security
| Variable | Wert |
|----------|------|
| `NEXT_PUBLIC_APP_URL` | `https://chairmatch.de` |
| `ADMIN_SETUP_KEY` | `openssl rand -hex 32` im Terminal ausführen |
| `CRON_SECRET` | `openssl rand -hex 32` im Terminal ausführen |

---

## 3. Resend — Domain verifizieren

Buchungsbestätigungs-Emails werden nur zugestellt, wenn `chairmatch.de` als verifizierte Absender-Domain in Resend eingetragen ist.

1. resend.com → **Domains** → **Add Domain** → `chairmatch.de` eingeben
2. Resend zeigt dir DNS-Einträge (SPF, DKIM, DMARC)
3. Diese Einträge bei deinem DNS-Provider (z. B. Cloudflare, IONOS) eintragen
4. Auf Verifizierung warten (meist 5–30 Minuten)
5. Danach: `RESEND_API_KEY` in Vercel eintragen → E-Mails fließen

---

## 4. Stripe — Produkte und Webhook anlegen

### Abo-Produkte anlegen
1. Stripe → **Products** → **Add product**
2. Für jedes Tier (Starter, Premium, Gold): Preis in EUR festlegen, monatlich
3. Nach dem Anlegen: **Price ID** (beginnt mit `price_...`) kopieren → in Vercel eintragen

### Webhook für Prod einrichten
1. Stripe → **Developers → Webhooks → Add endpoint**
2. URL: `https://chairmatch.de/api/webhooks/stripe`
3. Events abonnieren: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. **Signing secret** (beginnt mit `whsec_`) → als `STRIPE_WEBHOOK_SECRET` in Vercel eintragen

---

## 5. Legal-Seiten — Platzhalter ersetzen

In den Legal-Seiten sind Platzhalter hinterlassen, die du VOR dem Launch ersetzen musst:

### `src/app/(public)/impressum/page.tsx`
- `{{HANDELSREGISTERGERICHT}}` → z. B. `Amtsgericht Frankfurt am Main`
- `{{HRB_NUMMER}}` → deine HRB-Nummer nach GmbH-Eintragung
- `{{UMSATZSTEUER_ID}}` → deine DE-USt-IdNr. (nach Finanzamt-Vergabe)
- `GmbH i. Gr.` → nach Eintragung zu `GmbH` ändern

### `src/app/(public)/datenschutz/page.tsx`
- `{{DATENSCHUTZBEAUFTRAGTER_NAME}}` → falls kein DSB benötigt: Abschnitt löschen
- `{{DSB_EMAIL}}` → E-Mail des DSB (oder Abschnitt löschen)

### `src/lib/email.ts`
- Zeile 8: `FROM_ADDRESS` ggf. aktualisieren (stimmt schon auf `noreply@chairmatch.de`)
- Button-URLs auf `https://chairmatch.de` prüfen (schon korrekt)

---

## 6. Anwaltliche Prüfung (obligatorisch vor Launch)

Die Legal-Seiten (Impressum, Datenschutzerklärung, AGB, AGB-Provider) sind ein technisches Gerüst — **kein Rechtsrat**. Folgendes muss ein Anwalt prüfen:

- [ ] Datenschutzerklärung: alle Auftragsverarbeiter korrekt benannt, AVV geschlossen?
- [ ] AGB: Widerrufsbelehrung für dein Geschäftsmodell korrekt formuliert?
- [ ] AGB-Provider: P2B-Verordnung korrekt umgesetzt?
- [ ] Impressum: Angaben vollständig (USt-ID, HRB nach Eintragung)?
- [ ] DAC7-Meldepflicht: ab 30 Transaktionen/Anbieter/Jahr Meldung ans Finanzamt

Empfehlung: IT-/Datenschutz-Anwalt oder Dienst wie e-recht24.de / WBS-Law.

---

## 7. Domain und DNS

- [ ] Domain `chairmatch.de` auf Vercel gezeigt (CNAME oder A-Record)
- [ ] HTTPS-Zertifikat in Vercel ausgestellt (automatisch über Let's Encrypt)
- [ ] DNS-Einträge für Resend (SPF, DKIM, DMARC) gesetzt
- [ ] `NEXT_PUBLIC_APP_URL=https://chairmatch.de` in Vercel gesetzt

---

## 8. Admin-Account einrichten

Nach dem ersten Nutzer-Signup:
1. Nutzer-ID aus Supabase Dashboard kopieren
2. API-Call: `POST https://chairmatch.de/api/setup/promote-admin` mit Header `x-setup-key: [ADMIN_SETUP_KEY]`
3. Danach: `ADMIN_SETUP_KEY` aus Vercel löschen (einmaliger Gebrauch!)

---

## 9. Vor-Launch-Test

- [ ] Testbuchung durchführen → Buchungsbestätigung kommt per E-Mail an?
- [ ] Datenschutz-Seite aufrufen → alle Informationen korrekt?
- [ ] Cookie-Banner erscheint → Einstellungen speicherbar?
- [ ] Anbieter-Registrierung → Provider-Notification E-Mail kommt an?
- [ ] Stripe Test-Zahlung → Webhook empfangen?
- [ ] Push-Notifications → Einwilligung + Zustellung testen

---

## Zusammenfassung

| Bereich | Aufwand | Status |
|---------|---------|--------|
| Supabase Migrationen | ~15 Min | ☐ |
| Vercel Env-Vars | ~20 Min | ☐ |
| Resend Domain | ~30 Min | ☐ |
| Stripe Produkte + Webhook | ~30 Min | ☐ |
| Legal Platzhalter ersetzen | ~15 Min | ☐ |
| Anwaltliche Prüfung | ~1–3 Tage | ☐ |
| Domain/DNS | ~15 Min | ☐ |
| Admin-Account | ~5 Min | ☐ |
| End-to-End-Test | ~1h | ☐ |
