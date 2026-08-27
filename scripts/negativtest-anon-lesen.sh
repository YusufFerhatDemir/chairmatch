#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# NEGATIVTEST: anon darf diese Tabellen NICHT lesen. READ ONLY.
#
# Scharfe Ja/Nein-Antwort auf genau eine Frage — im Unterschied zur
# Uebersicht in rls-anon-probe.sh, die alle Tabellen inventarisiert.
#
# Gemessen wird der HTTP-Status einer anon-Abfrage auf /rest/v1/<tabelle>:
#
#   401 + "permission denied for table"  BESTANDEN — kein Tabellenrecht
#   200                                  DURCHGEFALLEN — die Abfrage LIEF.
#                                        Dass gerade 0 Zeilen zurueckkommen,
#                                        ist kein Schutz: das heisst nur, dass
#                                        RLS filtert oder nichts drinsteht.
#                                        Mit der ersten Zeile bzw. der ersten
#                                        zu weit gefassten Policy liegt der
#                                        Inhalt oeffentlich vor.
#
# Erwartung VOR 20260827_anon_grant_lockdown.sql: 8 durchgefallen.
# Erwartung DANACH:                               0 durchgefallen.
#
# Nutzung:  ./scripts/negativtest-anon-lesen.sh [pfad-zur-env]   (default .env.local)
# ──────────────────────────────────────────────────────────────────────
set -uo pipefail
ENVF="${1:-.env.local}"

# Deckungsgleich mit der ARRAY-Liste in der Lockdown-Migration und mit
# GESPERRT in rls-anon-probe.sh. src/__tests__/anon-exposure-and-mock-residue
# haelt die drei Listen zusammen.
TABELLEN=(
  newsletter_sends        # Kampagne <-> Abonnent: wer hat was bekommen/geoeffnet
  newsletter_campaigns
  payout_accounts         # Bankverbindung
  tenant_profiles         # Klarname, Beruf, Lizenznummer
  rental_requests         # Freitext-Nachrichten beider Parteien
  rental_request_dedupe
  user_uploads            # storage_path auch privater Zertifikate
  staff
  user_2fa
)

ANON=$(grep -E "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" "$ENVF" | head -1 | sed -E 's/^[^=]+=//; s/^"//; s/"$//')
URL=$(grep -E "^NEXT_PUBLIC_SUPABASE_URL=" "$ENVF" | head -1 | sed -E 's/^[^=]+=//; s/^"//; s/"$//')
[ -z "$ANON" ] && { echo "Kein Anon-Key in $ENVF"; exit 2; }

DURCH=0
echo "Negativtest — anon darf NICHT lesen   ($URL)"
echo "--------------------------------------------------------------------"
for T in "${TABELLEN[@]}"; do
  C=$(curl -s -o /dev/null -w "%{http_code}" "$URL/rest/v1/$T?select=*&limit=1" \
        -H "apikey: $ANON" -H "Authorization: Bearer $ANON")
  if [ "$C" = "401" ]; then
    printf "  BESTANDEN      %-24s (HTTP 401, kein Tabellenrecht)\n" "$T"
  elif [ "$C" = "404" ]; then
    printf "  uebersprungen  %-24s (Tabelle existiert nicht)\n" "$T"
  else
    printf "  DURCHGEFALLEN  %-24s (HTTP %s — anon darf abfragen)\n" "$T" "$C"
    DURCH=$((DURCH+1))
  fi
done
echo "--------------------------------------------------------------------"
echo "Durchgefallen: $DURCH von ${#TABELLEN[@]}"
[ "$DURCH" -eq 0 ] && { echo "ERGEBNIS: bestanden."; exit 0; }
echo "ERGEBNIS: NICHT bestanden — supabase/migrations/20260827_anon_grant_lockdown.sql anwenden."
exit 1
