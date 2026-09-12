# Migration Ledger — ChairMatch

> Erstellt: 2026-08-28 | Projekt: pwdbjqfpgumyfktbfswg
> Regeln: Neue Migrationen NUR mit realem Timestamp.

## Bekannte Duplikate in History

| Name | Versionen | Ursache |
|---|---|---|
| `analytics_events_rls_fix` | 20260827101920, 20260827222253 | Doppelte Anwendung während Entwicklung |

## Risikobewertung

- Keine Future-Timestamp-Probleme
- Migration-History weitgehend sauber
- 1 harmloses Duplikat (kein funktionales Problem)

## Applied Entries

| Repo-Datei | Repo-Timestamp | Supabase-Version | Supabase-Name | Track | Methode | Status |
|---|---|---|---|---|---|---|
| `20260828_miet_marktplatz_haertung.sql` | 20260828 | 20260828230000 | `20260828_miet_marktplatz_haertung` | CM22 | execute_sql (3 Chunks) | PROVEN_LIVE |

### CM22 Verification — Beweis (2026-08-28)

- **publish_review_pair**: rental_bookings-Lookup + 14-days-Interval vorhanden ✓
- **anon REVOKED**: Kein SELECT auf rental_equipment ✓
- **authenticated REVOKED**: Kein Grant auf rental_equipment ✓
- **RLS enabled**: rental_equipment ✓
- **Constraints live**: 7/7 ✓
  - rental_bookings_date_order ✓
  - rental_bookings_total_nonnegative ✓
  - rental_bookings_payment_status_check ✓
  - rental_equipment_type_check ✓
  - rental_equipment_prices_nonnegative ✓
  - rental_equipment_online_needs_price ✓
  - rental_equipment_time_window ✓
- **schema_migrations**: version=20260828230000 ✓

## Offen (committet, NICHT angewendet)

| Repo-Datei | Repo-Timestamp | Track | Inhalt |
|---|---|---|---|
| `20260902_rls_restliche_tabellen.sql` | 20260902 | P3 | `ENABLE`+`FORCE ROW LEVEL SECURITY` und `REVOKE ALL FROM anon, authenticated` auf den neun Live-Tabellen, fuer die es im Repo kein `ENABLE ROW LEVEL SECURITY` gibt: `salons`, `services`, `bookings`, `booking_policies`, `staff`, `promo_codes`, `rental_bookings`, `error_logs`, `newsletter_sends`. Antwort auf die Dashboard-Meldung „RLS disabled in public". Keine Policies — kein Client liest diese Tabellen direkt. |
| `20260828170738_benachrichtigungswege_haertung.sql` | 20260828170738 | CM23 | `push_subscriptions.updated_at`; Arbiter-fähiger UNIQUE auf `wait_list(email, city)`; 6 CHECK-Constraints (Endpunkt https, Schlüsselmaterial, E-Mail normalisiert, Stadt nicht leer, `choices` vollständig); `DROP POLICY cookie_consents_insert_anon`; `REVOKE ALL … FROM anon` auf `push_subscriptions`, `notification_log`, `wait_list`, `cookie_consents` |
| `20260910_anon_insert_lockdown.sql` | 20260910 | P7 | `REVOKE ALL FROM anon, PUBLIC` + `ENABLE ROW LEVEL SECURITY` auf `visit_logs` und `submission_tickets`. **Gemessen, nicht vermutet:** beide nehmen am 2026-09-10 einen anonymen INSERT an (`POST {}` → 201; mit ungueltiger UUID → 22P02 statt 42501, also existiert das Recht). GET antwortet dagegen 401 — reines Lesen haette die Luecke nicht gefunden. Beide Tabellen werden ausschliesslich ueber `getSupabaseAdmin()` bedient, das REVOKE bricht nichts. **Nicht abgedeckt von `20260902_rls_restliche_tabellen.sql`** — die nennt neun andere Tabellen. Gegenprobe: `bash scripts/anon-perimeter-probe.sh` |

### Track I, 2026-09-12 vormittags — spatial_ref_sys ist WEITER OFFEN

`20260912_spatial_ref_sys_lockdown.sql` ist **nicht angewendet**. Nachgemessen
um 07:55Z mit `bash scripts/anon-perimeter-probe.sh`:

```
  spatial_ref_sys   GET 200  INSERT 22P02  DELETE 204
                    ← ANON KANN LESEN  ← ANON KANN SCHREIBEN  ← ANON KANN LOESCHEN

  50 Tabellen geprueft · lesbar 3 · beschreibbar 1 · loeschbar 1 · Exit 1
```

Kein Weg zum Anwenden: service_role 401, `psql` scheitert an der fehlenden
IPv6-Route zum AAAA-only-Host, CLI ohne Token, kein `SUPABASE_ACCESS_TOKEN`
in Umgebung oder `.env*`. **Die Sicherheitslage ist an dieser Stelle NICHT
geschlossen** — das ist erst der Fall, wenn die Sonde mit Exit 0 endet.

### Die Sonde hatte einen zweiten blinden Fleck — sieben Tabellen

Beim Nachmessen der PII-Tabellen fiel auf, dass der INSERT-Test bei sieben
Eintraegen gar nicht bis Postgres kam: er schickt `{"id": …}`, und diese
Tabellen haben keine Spalte `id`. PostgREST antwortet dann selbst mit
`PGRST204 column not found` — **kein Rechtetest**, sondern eine Fehlanzeige.
Die Sonde hat sie stillschweigend als unauffaellig gewertet:

| Tabelle | Schluessel | vorher | nachgemessen |
|---|---|---|---|
| `payout_accounts` | `user_id` | PGRST204 | **42501** |
| `user_2fa` | `user_id` | PGRST204 | **42501** |
| `tenant_profiles` | `user_id` | PGRST204 | **42501** |
| `rental_request_dedupe` | `requester_id` | PGRST204 | **42501** |
| `geography_columns` / `geometry_columns` | — | PGRST204 | Sichten, INSERT nicht anwendbar |

Alle vier Tabellen sind **dicht** — aber die Sonde hatte es nie geprueft und
trotzdem „Perimeter dicht" gemeldet. Unter ihnen `payout_accounts`
(Bankverbindungen) und `user_2fa` (2FA-Geheimnisse).

Behoben: Schluesselspalte je Tabelle konfigurierbar, Sichten ausdruecklich
ausgenommen, und **jedes nicht auswertbare Ergebnis zaehlt als UNGEPRUEFT und
laesst den Lauf durchfallen**. Eine Sonde, die eine Tabelle nicht pruefen
kann, darf sie nicht als geprueft ausweisen. Gegenprobe gefahren: nimmt man
die Spalten-Zuordnung wieder heraus, meldet der Lauf „INSERT ungeprueft: 3".

### PII-Tabellen einzeln, 2026-09-12

`profiles`, `messages`, `conversations`, `consents`, `consent_logs`,
`audit_logs`, `payments`, `payout_accounts`, `login_attempts`, `user_2fa`,
`push_subscriptions`, `cookie_consents`, `newsletter_subscribers`,
`newsletter_sends`, `user_uploads`, `documents`, `tenant_profiles`, `orders`,
`bookings` — **alle** `SELECT 401 · INSERT 42501 · DELETE 401`.

Nicht pruefbar bleibt die Rolle `authenticated`: dafuer braucht es ein
Nutzer-JWT, und das gaebe es nur durch Anlegen eines echten Kontos in der
Produktion. Ein Schreibvorgang in Produktivdaten fuer eine Messung ist die
falsche Wahl; der Punkt bleibt offen und ist als offen gekennzeichnet.
`TRUNCATE` kennt PostgREST nicht — pruefbar ist es von aussen nicht, aber das
nachgewiesene DELETE-Recht auf `spatial_ref_sys` reicht ohnehin aus, um die
Tabelle zu leeren.

### Nachmessung 2026-09-12 — die P7-Luecke ist ZU, aber nicht durch diese Datei

`bash scripts/anon-perimeter-probe.sh` am 2026-09-12T00:07:47Z, derselbe
Schluessel, dasselbe Skript:

```
  categories                 GET 200 INSERT 42501  (lesbar — bewusst so)

  47 Tabellen geprueft · unerwartet lesbar: 0 · beschreibbar: 0
```

`beschreibbar` ist von 2 auf 0 gefallen. Einzelnachweis:

```
  visit_logs          GET 401  {"code":"42501","message":"permission denied for table visit_logs"}
  submission_tickets  GET 401  {"code":"42501","message":"permission denied for table submission_tickets"}
```

WAS DARAUS FOLGT UND WAS NICHT: die Tueren sind zu — das ist gemessen. Ob
`20260910_anon_insert_lockdown.sql` dafuer angewendet wurde oder jemand die
Rechte im Dashboard von Hand gezogen hat, ist von aussen NICHT zu
unterscheiden: dazu muesste man `supabase_migrations.schema_migrations`
lesen, und dafuer fehlt der Zugang (siehe unten). Die Zeile bleibt deshalb
unter „Offen" stehen, bis jemand mit Dashboard-Zugang die Version bestaetigt.

### Zugangslage am 2026-09-12 — kein DDL moeglich

| Weg | Ergebnis | Beweis |
|---|---|---|
| anon-Key (`.env.local`) | **gueltig**, nur Lesen im Rahmen der Rechte | `GET /rest/v1/categories` → 200 |
| service_role (`.env.prod`) | **rotiert/tot** | `GET /rest/v1/categories` → 401 `Invalid API key` — obwohl der Payload `ref=pwdbjqfpgumyfktbfswg`, `role=service_role`, `exp=2087573420` traegt |
| `psql` via `DATABASE_URL` | **Passwort tot** | `FATAL: password authentication failed for user "prisma_app"` (psql selbst ist installiert und erreicht den Host — der fruehere Befund „psql blockiert" stimmt nicht mehr) |
| Supabase-CLI 2.113.0 | installiert, **kein Access-Token** | kein `~/.supabase/access-token` |
| Supabase-MCP | **in dieser Session nicht vorhanden** | keine `execute_sql`-Funktion im Toolset |

Produktion selbst hat einen funktionierenden Dienstschluessel — `GET
https://www.chairmatch.de/api/rental-listings` liefert anonym 5 echte
Inserate aus der Datenbank. Tot ist nur die Kopie im Repo.

### P7 — Der Perimeter war nur beim LESEN dicht (2026-09-10)

`bash scripts/anon-perimeter-probe.sh` misst alle 47 bekannten Tabellen mit
dem oeffentlichen Schluessel — lesend UND schreibend. Ergebnis:

```
  submission_tickets   GET 401  INSERT 22P02   ← ANON KANN SCHREIBEN
  visit_logs           GET 401  INSERT 22P02   ← ANON KANN SCHREIBEN
  categories           GET 200  INSERT 42501   (lesbar — bewusst so)

  47 Tabellen geprueft · unerwartet lesbar: 0 · beschreibbar: 2
```

Das Lesen ist also dicht (46 von 47 antworten 401, `categories` ist eine
bewusste Ausnahme). Beim Schreiben standen zwei Tueren offen.

**Warum das lange unbemerkt blieb:** Jede bisherige Sonde in diesem Repo hat
nur gelesen. Eine Tabelle kann `anon` mit 401 antworten und trotzdem ein
INSERT-Recht tragen — genau diese Kombination lag hier vor. Auch die erste
Fassung der neuen Sonde meldete noch „Perimeter dicht": sie testete den
INSERT mit `Prefer: return=representation`, und der antwortet bei fehlendem
SELECT ebenfalls 401. Erst der Umweg ueber eine ungueltige UUID trennt
„kein Recht" (42501) von „Recht vorhanden, Anweisung abgebrochen" (22P02) —
und schreibt dabei nichts.

**Rueckstand aus der Messung:** Die erste, noch nicht seiteneffektfreie
Probe hat je Tabelle EINE leere Zeile erzeugt (`POST {}` → 201). Sie sind
mit dem anon-Key weder lesbar noch loeschbar; das Aufraeumen steht als
SQL am Ende von `20260910_anon_insert_lockdown.sql`.

### CM23 — Teilbefund aus der Produktionssonde (2026-08-28)

`bash scripts/prod-probe.sh` hat den REVOKE-Teil der Migration gegen die
laufende Instanz geprüft. Alle vier Zieltabellen sind für den anon-Key bereits
gesperrt:

| Tabelle | anon (live) |
|---|---|
| `push_subscriptions` | 401 |
| `notification_log` | 401 |
| `wait_list` | 401 |
| `cookie_consents` | 401 |

Der sicherheitsrelevante Teil von CM23 ist damit **live wirksam** — ob durch
diese Migration oder weil nie ein GRANT bestand, ist von außen nicht zu
unterscheiden. Offen bleibt der Schema-Teil (`push_subscriptions.updated_at`,
der arbiterfähige UNIQUE auf `wait_list(email, city)`, die sechs CHECKs). Der
ist von hier aus **nicht prüfbar**: die Sonde ist bei gesperrten Tabellen blind
(401 verdeckt 42703), der Dienstschlüssel ist ungültig, und ein direkter
Datenbankzugang steht Agents nicht zur Verfügung.

Der Produktivcode aus CM23 läuft **ohne** diese Migration: er schreibt kein
`updated_at` und benutzt an den betroffenen Stellen kein `ON CONFLICT` mehr.
Die Migration schreibt die Regeln zusätzlich in die Datenbank; jeder Constraint
zählt vorher die verletzenden Zeilen und bricht mit klarer Meldung ab.

---

## CM24 — `services` und `salon_images` sind für anon offen (Track E, 30.08.2026)

| Repo-Datei | Repo-Timestamp | Track | Status |
|---|---|---|---|
| `20260830_services_anon_lockdown.sql` | 20260830 | CM24 | **OFFEN — nicht angewendet** |

### Befund (nur lesend, nur mit dem öffentlichen ANON-Key)

`GET /rest/v1/services?select=*` antwortet mit **200** und liefert alle 64
Zeilen. Sie verteilen sich auf **16** Salons — öffentlich sichtbar sind aber
nur **15**:

```
GET /api/salons/cccccccc-0000-4000-a000-000000000003   →  404
GET /rest/v1/services?salon_id=eq.cccccccc-…-000003    →  200
    Botox Behandlung   299,00 €
    Hyaluron Filler    399,00 €
    PRP Therapie           …
```

Der Salon ist `is_active = false`, `salonIsPubliclyVisible` verbirgt ihn — und
seine vollständige Preisliste steht trotzdem unter dem öffentlichen Schlüssel.
Das ist der Rest des Track-20-Befunds eine Ebene tiefer.

`salon_images` gehört zur selben Klasse (heute 0 Zeilen, also noch ohne
Schaden) und wird mitgesperrt.

### Warum das stehenblieb

`20260827_anon_grant_lockdown.sql` hat beide ausdrücklich ausgenommen
(„tragen öffentlichen Katalog-inhalt … sollen es bleiben"). Diese Einschätzung
stammt von **vor** Track 20, seit dem „welcher Salon ist öffentlich" eine
Entscheidung der Plattform ist. `rental_equipment` aus derselben Aufzählung
wurde in Track 22 aus genau diesem Grund gesperrt.

### Risiko der Anwendung: gering

Alle sechs lesenden Stellen im Code laufen über `getSupabaseAdmin()`
(`service_role`), und `service_role` ist von `REVOKE … FROM anon` nicht
betroffen. Es gibt keinen Client, der `services` oder `salon_images` direkt
liest. Gegenprobe nach der Anwendung:

```
bash scripts/negativtest-anon-lesen.sh      # services → 401 statt 200
curl -s -o /dev/null -w '%{http_code}' https://www.chairmatch.de/salon/naillab-by-lena   # muss 200 bleiben
```

## Gesamtstand

- **Total Migrationen in Supabase**: 49
- **Letzte Version**: 20260828230000
- **Offen**: CM23 (Schema-Teil), CM24 (`services`/`salon_images` anon-Lockdown)
