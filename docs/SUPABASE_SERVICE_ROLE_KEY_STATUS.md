# Supabase Service-Role-Key — Status 24.08.2026

Projekt: `pwdbjqfpgumyfktbfswg`
Geprüft mit einer Live-Probe gegen `/rest/v1` und `/auth/v1/admin/users`.
**In diesem Dokument steht kein Key-Wert** — nur Herkunft, Rolle, Ergebnis.

---

## Kurzfassung

| Ort | Key vorhanden | Funktioniert | Folge |
|---|---|---|---|
| Vercel **Production** | ja | **ja** | Produktion läuft normal |
| Vercel **Preview** | **nein** | — | 🔴 Jede Preview-Deployment-Seite mit DB-Zugriff wirft |
| `.env.prod` (lokal) | ja | **nein — "Invalid API key"** | 🔴 Alle lokalen Skripte/Audits tot |
| `.env.local` (lokal) | **nein** | — | 🔴 `npm run dev` wirft auf jedem Admin-Pfad |

Der frühere Befund „Service-Role-Key ist tot" stimmt — **aber nur für die
lokalen Kopien.** Der Key in Vercel Production ist gültig.

---

## Wo der Key benutzt wird

Ein einziger Einstiegspunkt: `getSupabaseAdmin()` in `src/lib/supabase-server.ts`.
Er liest `process.env.SUPABASE_SERVICE_ROLE_KEY` und wirft bewusst, statt auf
den Anon-Key zurückzufallen (sonst kämen unter RLS still leere Ergebnisse).

- **153 Dateien** unter `src/` rufen `getSupabaseAdmin()`
- davon **85 API-Routen** unter `src/app/api/`
- dazu Server-Komponenten: `sitemap.ts`, `page.tsx`, alle `(owner)`- und
  `(admin)`-Seiten, `/unsubscribe`, `opengraph-image.tsx`

Es gibt keinen zweiten Ort, an dem der Key gelesen wird — ein Austausch ist
reine ENV-Arbeit, kein Code-Change.

---

## Beleg: Production ist in Ordnung

`https://www.chairmatch.de/sitemap.xml` liefert 105 URLs, darunter
`/salon/naillab-by-lena`, `/salon/haarmonie-stuttgart`, `/salon/skin-atelier`.

Diese Slugs stehen **nicht** in `src/lib/demo-data.ts` (die Demo-Provider
heißen `s1`…`s14`) und `salons` ist für den Anon-Key gesperrt. Sie können
also nur aus `sitemap.ts:76` stammen — und das läuft über
`getSupabaseAdmin()`. Wäre der Production-Key tot, stünde dort nichts.

---

## Beleg: die lokale Kopie ist tot

Der Key in `.env.prod` ist strukturell einwandfrei:

- gültiges JWT, drei Segmente
- `role = service_role`
- `ref = pwdbjqfpgumyfktbfswg` (richtiges Projekt)
- `iat = 2026-02-25`, `exp = 2036-02-25` → **nicht abgelaufen**

Trotzdem antwortet Supabase auf beiden Endpunkten:

```
HTTP 401 — {"message":"Invalid API key",
            "hint":"Double check your Supabase `anon` or `service_role` API key."}
```

Nicht abgelaufen + trotzdem abgelehnt = **der Key wurde im Dashboard rotiert
oder widerrufen.** Zum Vergleich: derselbe Aufruf mit dem Anon-Key aus
`.env.local` kommt bis in die Datenbank (er scheitert erst an RLS mit `42501`),
der Anon-Key ist also gültig.

---

## 🔴 EXTERN_BLOCKIERT — was yusuf im Dashboard tun muss

Alles drei sind Klick-Aktionen in fremden Oberflächen. Kein Code-Change nötig.

### 1. Neuen Service-Role-Key holen (5 Min)
Supabase Dashboard → Project `pwdbjqfpgumyfktbfswg` → **Settings → API Keys**
→ `service_role` / `secret` kopieren.
Wenn dort nur noch `sb_secret_…`-Keys stehen: das ist das neue Format und
funktioniert mit `@supabase/supabase-js` genauso.

> ⚠️ Der Key umgeht RLS vollständig. Nie in den Browser, nie in eine
> `NEXT_PUBLIC_*`-Variable, nie in einen Commit.

### 2. Preview-Umgebung in Vercel nachziehen (2 Min) — **wichtigster Punkt**
Vercel → chairmatch → Settings → Environment Variables →
`SUPABASE_SERVICE_ROLE_KEY`.

Aktuell ist die Variable **nur für Production** gesetzt. Jede
Preview-Deployment — also jeder PR, jeder Branch-Push — läuft ohne sie, und
`getSupabaseAdmin()` wirft dort auf **jeder** der 153 Stellen. Preview-Tests
prüfen damit heute eine App, die es so in Produktion nicht gibt.

→ Denselben Key zusätzlich für **Preview** eintragen.

### 3. Lokale Dateien reparieren (2 Min)
- `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=…` **fehlt komplett** →
  ergänzen, sonst wirft `npm run dev` auf jedem Admin-Pfad.
- `.env.prod`: enthält den widerrufenen Key → ersetzen oder Zeile löschen.

Beide Dateien stehen in `.gitignore` und werden nicht committet.

### Gegenprobe nach dem Austausch
`./scripts/schema-probe.sh` läuft mit dem Anon-Key und sagt nichts über den
Service-Key. Stattdessen: `npm run dev` starten und `/admin/pricing` öffnen —
lädt die Seite ohne „SUPABASE_SERVICE_ROLE_KEY fehlt", ist der Key gültig.

---

## Nebenbefund: `protect_pricing` ist anon offen

Bei derselben Probe:

| Tabelle | Anon-Antwort | Deutung |
|---|---|---|
| `compliance_plans` | `42501 permission denied` | dicht |
| `protect_pricing` | `HTTP 200`, `[]` | **offen** — `20260819_rls_close_gaps.sql` ist live nicht angewendet |
| `salons` | `42501 permission denied for function is_admin_or_super` | dicht, aber die RLS-Policy ruft eine Funktion auf, die `anon` nicht ausführen darf — die Ablehnung passiert aus dem falschen Grund |

Solange in `protect_pricing` keine Preise stehen, ist der Schaden null. Mit
Preisen wäre es eine Integritätslücke. `supabase/migrations/20260824_pricing_schema.sql`
schließt das mit.
