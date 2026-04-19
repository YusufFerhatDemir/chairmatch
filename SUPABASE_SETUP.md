# Supabase Datenbank-Setup — Ein Copy-Paste, fertig

Stell dir das wie IKEA-Aufbau vor: du brauchst nur einmal den Schlüssel anzusetzen.
Eine Datei, einmal ausführen, alle 10 Tabellen-Schemas sind drin.

---

## So geht's (3 Schritte)

### Schritt 1 — SQL-Editor öffnen

Direkt-Link zu deinem Supabase SQL-Editor:

```
https://supabase.com/dashboard/project/_/sql/new
```

> Falls der Link mit `_` nicht klappt: Supabase Dashboard → dein Projekt → linke Sidebar → **SQL Editor** → **New query**

---

### Schritt 2 — Bundle einfügen und ausführen

1. Öffne die Datei `supabase/migrations/_BUNDLED_FOR_PROD.sql` im Projekt
2. **Alles markieren** (Ctrl+A / Cmd+A) und kopieren
3. In den Supabase SQL-Editor einfügen
4. Auf **RUN** klicken (oder Ctrl+Enter / Cmd+Enter)
5. Warten bis unten **"Success. No rows returned"** oder ähnliches erscheint

Das war's. Alle 10 Migrationen sind jetzt in der Datenbank.

---

### Schritt 3 — Erfolg bestätigen

Mach kurz einen Screenshot oder überprüfe im **Table Editor** (linke Sidebar), dass diese Tabellen existieren:

- `newsletter` ✓
- `audit_logs` ✓
- `visit_logs` ✓
- `consent_logs` ✓
- `cookie_consents` ✓
- `payments` ✓
- `messages` ✓
- `product_categories` ✓
- `commissions` ✓

---

## Falls ein Fehler auftritt

**"table already exists"** oder ähnliches?

Kein Problem — das Bundle ist **idempotent** (wie ein Rezept, das du zweimal kochen kannst ohne dass die Küche abbrennt). Einfach nochmal ausführen, es überspringt was schon da ist.

**"relation does not exist"** für `profiles`, `salons`, `bookings`, `reviews` o. ä.?

Das bedeutet, dass die Basis-Tabellen noch nicht existieren. Diese kommen aus dem Supabase-Auth-System und deinem initialen Schema. Mögliche Lösung:
- Supabase Dashboard → Table Editor → prüfen ob `profiles`, `salons` existieren
- Falls nein: das initiale Schema muss zuerst eingerichtet werden (evtl. per Supabase-Onboarding oder separates Schema)

**Sonstiger Fehler?**

Kopiere die Fehlermeldung und die Zeilennummer aus dem SQL-Editor — dann kann das Bundle gezielt gefixt werden.

---

## Was das Bundle macht (Übersicht)

| Migration | Inhalt |
|-----------|--------|
| 1/10 | Newsletter, Favoriten, Salon-Spalten |
| 2/10 | Audit-Logs (wer hat was getan) |
| 3/10 | Besucheranalysen (DSGVO-minimal) |
| 4/10 | Compliance-Dokumente, Versicherungen, Preistabellen |
| 5/10 | Rollen-Prüfung, Consent-Logs, Cookie-Einwilligung, Login-Schutz |
| 6/10 | Soft-Delete für Konto-Löschung (DSGVO Art. 17) |
| 7/10 | Bewertungs-Meldung und Moderation (DSA) |
| 8/10 | Profil-Trigger bei Registrierung (auto-create Profile) |
| 9/10 | Zahlungen, Chat, Push-Notifications, 2FA |
| 10/10 | Produkte, Warenkorb, Bestellungen, Provisionen |

**Weiter mit:** → [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md)
