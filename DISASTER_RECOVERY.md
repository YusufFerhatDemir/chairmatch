# Chairmatch — Disaster Recovery & Incident Runbook

**Stand:** 2026-05-11
**Verantwortlich:** Yusuf Demir (Founder & CEO)
**Notfall-Kontakt:** y.cilcioglu@googlemail.com

---

## 1. Was ist gesichert — Backup-Strategie

### Supabase (PostgreSQL-Datenbank)
- **Automatische Daily Backups** durch Supabase (Free + Pro Tier)
- Retention: 7 Tage (Free), 30 Tage (Pro)
- Point-in-Time-Recovery (PITR): nur Pro Tier (35 €/Monat)
- **Was gesichert wird:** alle Tabellen (`profiles`, `salons`, `bookings`, `reviews`, `compliance_documents`, `chairs`, `messages`, `error_logs`, etc.)
- **Wo:** Supabase eigene S3-Buckets, EU-Region (eu-west-1)
- **Zugriff:** Dashboard → Project → Database → Backups → Restore

### Vercel (Static Assets + Build-Output)
- Vercel deployt aus Git — jeder Build ist reproduzierbar
- **Wiederherstellung:** `git checkout <commit>` + `vercel --prod`
- Aktuelle Deploys bleiben in Vercel-History (unbegrenzt)
- Rollback per Klick: Deployments → Promote zu Production

### Stripe (Zahlungsdaten)
- Komplett bei Stripe gehostet (PCI-DSS Level 1)
- Wir speichern nur `stripe_customer_id` und `stripe_subscription_id` in unserer DB
- Im Notfall: Stripe Dashboard → Customers → Suchen
- **Kein Backup nötig** — Stripe ist Single Source of Truth

### Resend (E-Mail-Versand-Historie)
- Email-Logs in Resend Dashboard für 7 Tage einsehbar
- Templates in Code (`src/lib/email.ts`) — durch Git versioniert
- **Backup-Pflicht: keine.** Im Notfall E-Mails manuell neu schicken.

### Code & Konfiguration
- **GitHub-Repository:** Source-of-Truth
- **Backup:** GitHub spiegelt automatisch
- `.env.local` ist NICHT committed (in `.gitignore`) — separat sichern
- Wichtige Secrets dupliziert: lokal + Vercel + 1Password (oder Bitwarden)

---

## 2. Backup-Sicherheitsprüfung — was DU monatlich machen musst

| Frequenz | Aktion | Wo |
|---|---|---|
| Wöchentlich | Vercel Build-Logs durchsehen — gibt es failed Deploys? | vercel.com/yusufferhatdemirs-projects/chairmatch/deployments |
| Wöchentlich | Supabase Project Health: Connection-Limit, Storage, CPU-Last | Supabase Dashboard → Reports |
| Monatlich | **Backup-Drill:** Test-Restore aus Supabase-Backup in neue Branch-DB → Vergleich Row-Count letzte 30 Tage | Siehe Abschnitt 5 |
| Monatlich | Stripe Webhook-Failure-Quote prüfen (sollte < 1% sein) | dashboard.stripe.com/webhooks |
| Monatlich | Resend-Bounce-Rate prüfen (Ziel < 5%) | resend.com/domains |
| Quartalsweise | Secrets-Rotation: API-Keys neu generieren, in Vercel ENV ersetzen | Vercel + Supabase Dashboards |
| Quartalsweise | DSGVO-Daten-Lösch-Prüfung: alte gelöschte User wirklich weg? | `SELECT * FROM profiles WHERE deleted_at < NOW() - INTERVAL '30 days'` |

---

## 3. Incident-Severity-Levels

| Level | Beispiel | Reaktionszeit | Wer |
|---|---|---|---|
| **SEV-1: Outage** | chairmatch.de offline, keine Buchungen möglich, Zahlungen failen | sofort | Yusuf + ggf. Vercel-Support |
| **SEV-2: Major degradation** | Login-Funktion broken, E-Mails kommen nicht an, Push tot | < 30 Min | Yusuf |
| **SEV-3: Feature broken** | Bestimmte Buchungsart broken, Bilder laden nicht, Review-Submit failed | < 4h | Yusuf |
| **SEV-4: Minor** | Typos, einzelne UI-Glitches, Edge-Case-Bugs | nächster Werktag | Yusuf |

---

## 4. Incident-Response — Schritt für Schritt

### Phase 1: Detektion
- Quellen: User-Beschwerden (Support-Mail), Vercel-Alarme, Supabase-Alarme, Sentry/Error-Logs im MIS-Portal (Admin-Dashboard → Fehler-Log)
- **Erste 5 Min:** Severity einschätzen (siehe oben)

### Phase 2: Mitigation (sofort)
1. **chairmatch.de offline?** → Vercel-Status prüfen (status.vercel.com)
   - Falls Vercel down: nichts zu tun außer warten. User per Twitter/Status-Page informieren.
   - Falls unsere App down: letzten erfolgreichen Deploy in Vercel → "Promote to Production" (= Rollback)
2. **Datenbank-Errors?** → Supabase-Status prüfen (status.supabase.com)
   - Connection Pool voll? → Connection-Limit in `DATABASE_URL` erhöhen
   - Quota überschritten (Free Tier 500 MB)? → Upgrade auf Pro (25 $/Monat)
3. **Zahlungen failen?** → Stripe-Webhook-Logs in Dashboard prüfen
   - Webhook-Signing-Secret korrekt in Vercel? (`STRIPE_WEBHOOK_SECRET`)
   - Webhook-URL aktuell? (`https://chairmatch.de/api/stripe/webhook`)
4. **E-Mails kommen nicht?** → Resend-Logs prüfen
   - Domain noch verifiziert? DNS-TXT-Records intakt?
   - API-Key in Vercel gültig?

### Phase 3: Communication
- Bei SEV-1: Twitter/Instagram-Post "Wir sind aware, arbeiten dran, ETA X"
- Falls Buchungen verloren: betroffene User per E-Mail (manuell aus Buchungs-Tabelle exportieren)

### Phase 4: Post-Mortem
- Nach Incident-Resolution: 1-Pager Post-Mortem schreiben
- **5 Fragen:** Was ist passiert? Warum? Wie haben wir es entdeckt? Wie haben wir es gefixt? Wie verhindern wir Wiederholung?
- Ablage in `/docs/post-mortems/YYYY-MM-DD-incident-name.md`

---

## 5. Recovery-Prozedur — Datenbank wiederherstellen

### Szenario: "Ich habe versehentlich `DELETE FROM bookings` ausgeführt"

**Wenn Pro Tier mit PITR (Point-in-Time-Recovery):**
1. Supabase Dashboard → Database → Backups → "Restore to point in time"
2. Zeitstempel wählen (z. B. 5 Min vor dem fatalen DELETE)
3. **Restore in NEUEN Branch-DB** (NICHT direkt in Production!)
4. SQL-Query: missing rows aus Branch-DB exportieren
5. In Production-DB re-importieren

**Wenn Free Tier (nur Daily Backups):**
1. Dashboard → Database → Backups → letzten verfügbaren Daily-Snapshot wählen
2. **NEUEN Branch erstellen** (NICHT in Production restoren — sonst werden alle Daten seit letztem Backup gelöscht!)
3. Aus Branch fehlende Daten manuell migrieren

**Maximaler Datenverlust:**
- Free Tier: bis zu 24h (zwischen Daily-Backups)
- Pro Tier: < 1 Min (PITR)
- **Empfehlung:** Bei mehr als 100 zahlenden Kunden: Pro Tier (25 $/Monat) Pflicht.

### Szenario: "Die ganze Vercel-Production ist broken nach einem Deploy"

1. Vercel Dashboard → Deployments → vorletzter Production-Deploy
2. "..." → **Promote to Production** → bestätigen
3. ~20 Sekunden bis Live
4. Bug in lokaler Branch fixen, neu deployen

---

## 6. Secrets-Rotation — wann + wie

**Wann zwingend rotieren:**
- Bei Verdacht auf Leak (z. B. versehentlich committed in Git)
- Bei Mitarbeiter-Offboarding (sobald wir Team-Mitglieder haben)
- Alle 90 Tage als Routine

**Was zu rotieren:**
- `SUPABASE_SERVICE_ROLE_KEY` → Supabase Dashboard → Settings → API → Reveal → "Rotate" Button
- `STRIPE_SECRET_KEY` → Stripe Dashboard → Developers → API Keys → Roll
- `STRIPE_WEBHOOK_SECRET` → bei Webhook-URL-Änderung: Dashboard → Webhooks → endpoint → Reveal
- `RESEND_API_KEY` → Resend → API Keys → "Create new" → alt deaktivieren
- `NEXTAUTH_SECRET` → `openssl rand -base64 32` → in Vercel ENV ersetzen (User werden ausgeloggt!)
- `VAPID_PRIVATE_KEY` → vorsicht: bestehende Push-Subscriptions werden invalid → User müssen neu subscriben

**Wo überall ersetzen:**
1. Vercel → Settings → Environment Variables → Edit
2. `.env.local` auf deinem Mac
3. Falls weitere Devs: 1Password / Bitwarden / Doppler

---

## 7. Datenschutz-Notfall (GDPR-relevant)

### Wenn User-Daten geleakt wurden:

**Frist nach DSGVO Art. 33:** 72 Stunden zur Meldung an Aufsichtsbehörde.

1. **Sofort:** Leak stoppen (kompromittierte Keys rotieren, Logs analysieren)
2. **Innerhalb 24h:** Umfang dokumentieren — welche User, welche Daten?
3. **Innerhalb 72h:** Meldung an Landesdatenschutzbehörde
   - Bayern: BayLDA → www.lda.bayern.de
   - Berlin: BlnBDI → www.datenschutz-berlin.de
   - NRW: LDI → www.ldi.nrw.de
   - Bundesländer-abhängig: deinen Sitz prüfen
4. **Falls "hohes Risiko" für Betroffene:** Direkt-Information jedes betroffenen Users
5. **Anwalt einschalten:** Fachanwalt für Datenschutzrecht (ca. 250-400 €/Stunde)

### Sofortige Daten-Lösch-Anfrage (DSGVO Art. 17):

User schreibt an support@chairmatch.de. Innerhalb 30 Tagen löschen:
- Soft-Delete: `UPDATE profiles SET deleted_at = NOW() WHERE id = ?`
- Hard-Delete nach 30 Tagen Grace-Period: `/api/cron/hard-delete` Route (existiert bereits)

---

## 8. Notfall-Kontakte

| Anbieter | Kontakt | Auth-Methode |
|---|---|---|
| Vercel | vercel.com/help | Login + 2FA |
| Supabase | supabase.com/dashboard/support/new | Login |
| Stripe | dashboard.stripe.com/support | Login + 2FA |
| Resend | support@resend.com | E-Mail |
| Domain-Registrar | (dein Anbieter) | Login + ggf. Telefon-Verification |
| BayLDA (falls Sitz Bayern) | poststelle@lda.bayern.de | Postalisch |
| Fachanwalt Datenschutz | (vorher recherchieren, Kontakt griffbereit halten!) | – |

---

## 9. Was im "Schlimmsten Fall" passiert

| Szenario | Worst-Case-Impact | Mitigation |
|---|---|---|
| Vercel pleite | Site offline, Code-Migration zu Cloudflare/Netlify (2 Tage Arbeit) | Code ist in GitHub, kein Vendor-Lock-In bei Vercel |
| Supabase pleite | DB-Export aus Backup, Migration zu RDS/Neon (3-5 Tage Arbeit) | pg_dump aus Backup-File jederzeit möglich |
| Stripe sperrt Account | Zahlungen offline bis Klärung — kann Wochen dauern | Stripe-T&Cs einhalten, KYC sauber durchziehen |
| chairmatch.de wird gehackt | User-Daten potenziell exfiltriert → DSGVO-Meldung, PR-Krise | Security-Layer in Phase 1 gehärtet, Pen-Test nach Launch |
| Großer Anbieter klagt | Anwaltskosten 5-15k €, Reputationsrisiko | AGB sauber drafted (Phase 1, Task #11), Versicherung erwägen |

---

## 10. Was als nächstes verbessert werden sollte

- [ ] **Externer Pen-Test** nach ersten 100 Nutzern (~5k €)
- [ ] **Sentry-Integration** für Error-Tracking statt nur DB-Logs
- [ ] **PagerDuty-Setup** für SEV-1-Alarme (wenn Team größer wird)
- [ ] **Bug-Bounty-Programm** (HackerOne / Intigriti) ab ~10k MAU
- [ ] **SOC-2-Type-I-Audit** wenn B2B-Anbieter wie Großkliniken fragen
- [ ] **Backup-Drills** automatisieren — monatlicher CI-Job, der Test-Restore macht und Row-Counts vergleicht
