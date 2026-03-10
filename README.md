# ChairMatch

Dein Beauty-Partner in ganz Deutschland. Finde und buche deinen perfekten Friseur- oder Beauty-Termin.

## Tech

- Next.js (App Router), TypeScript, Supabase, Vercel
- Buchungen, Reviews, Favoriten, Anbieter-Registrierung, Rentals (Stuhl/Kabine/OP-Raum)
- Admin: Dashboard, Salons, Benutzer, Buchungen, Statistik, Besucher-Analytics, Audit-Logs, Super-Admin (Logo, Kategorien, Onboarding)

## Setup

- `npm install` → `npm run dev`
- Umgebungsvariablen (NextAuth, Supabase) in `.env.local`
- **Migrationen:** Siehe `docs/SETUP_MIGRATIONS.md` – Tabellen `visit_logs` und `audit_logs` müssen in Supabase angelegt werden.