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

## Gesamtstand

- **Total Migrationen in Supabase**: 48
- **Letzte Version**: 20260827222303
- **HEAD**: 2737dde
