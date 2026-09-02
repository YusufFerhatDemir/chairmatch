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
