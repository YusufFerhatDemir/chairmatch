# ChairMatch – Setup & Migrationen

## Datenbank-Migrationen (Supabase)

Die Migrationen liegen unter `supabase/migrations/`. Damit alle Features (Besucher-Tracking, Audit-Logs) funktionieren, müssen die Tabellen existieren.

### Option A: Supabase CLI (lokal)

```bash
# Projekt mit Supabase verknüpfen (einmalig)
npx supabase link --project-ref DEINE_PROJECT_REF

# Migrationen anwenden
npx supabase db push
```

### Option B: SQL im Supabase Dashboard

1. Supabase Dashboard → dein Projekt → **SQL Editor**
2. Die folgenden Dateien nacheinander ausführen (Inhalt kopieren & Run):
   - `supabase/migrations/20260307_ensure_tables.sql`
   - `supabase/migrations/20260309_visit_logs.sql`
   - `supabase/migrations/20260309_audit_logs.sql`

### Wichtige Tabellen

- **visit_logs** – Besucher-Analytics (path, ip, country, …). Admin: `/admin/besucher`
- **audit_logs** – Wer hat wann was gemacht. Admin: `/admin/audit-logs`

Falls die Tabellen schon existieren (z. B. durch frühere manuelle Anlage), können die Migrationen mit `IF NOT EXISTS` ohne Fehler erneut ausgeführt werden.

## Umgebungsvariablen

In `.env.local` (oder Vercel):

- `NEXTAUTH_SECRET` – für Session-Verschlüsselung
- `NEXTAUTH_URL` – z. B. `https://chairmatch.de`
- `AUTH_SUPABASE_URL` – Supabase Projekt-URL
- `AUTH_SUPABASE_SERVICE_ROLE_KEY` – Service-Role-Key (für Admin/Sever-seitige DB-Zugriffe)

## Admin-Zugang

- URL: `/admin` (nach Login als Admin/Super-Admin)
- Demo-Accounts (siehe Auth-Config): z. B. `admin@chairmatch.de` / `admin123`, `super@chairmatch.de` / `super123`

## Deploy (Vercel)

- Push auf `main` erzeugt automatisch Preview/Production.
- Nach neuen Migrationen: Migrationen in Supabase ausführen (siehe oben), danach ist die App bereit.
