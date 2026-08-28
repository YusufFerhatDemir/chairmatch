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

## Gesamtstand

- **Total Migrationen in Supabase**: 49
- **Letzte Version**: 20260828230000
- **HEAD**: bf6fcf6
