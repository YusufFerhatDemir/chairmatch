#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# RLS Anon-Expositions-Probe — READ ONLY, veraendert NICHTS.
#
# Prueft aus der Sicht eines beliebigen Angreifers (nur mit dem
# oeffentlichen NEXT_PUBLIC_SUPABASE_ANON_KEY), welche Tabellen Daten
# herausgeben. Braucht KEINEN service_role-Key und KEINEN DB-Zugang.
#
# ZWEI Spalten, weil eine nicht reicht:
#
#   ZEILEN  Was anon HEUTE sieht. > 0 ist ein Leck, das bereits laeuft.
#   GRANT   Ob anon ueberhaupt ein Tabellen-SELECT-Recht hat. Das ist der
#           Unterschied zwischen "sicher" und "heute zufaellig leer".
#
# Bis 2026-08-27 gab es nur ZEILEN. Eine leere Tabelle mit offenem GRANT
# stand damit als "ok (keine Zeilen sichtbar)" da — obwohl sie mit der ersten
# eingefuegten Zeile oeffentlich wird, ohne dass irgendjemand etwas an den
# Rechten aendert. Genau so ist newsletter_sends (Kampagne <-> Abonnent)
# durchgerutscht.
#
# Der GRANT steht im HTTP-Status, nicht im Zeileninhalt:
#   401 + "permission denied for table"  -> anon hat KEIN Recht    (zu)
#   200                                  -> die Abfrage LIEF       (offen)
#                                           0 Zeilen heisst dann nur, dass RLS
#                                           filtert ODER nichts drinsteht.
#
# NICHT brauchbar als Test ist eine Abfrage auf eine erfundene Spalte:
# PostgREST prueft Spaltennamen gegen seinen eigenen Schema-Cache und
# antwortet 42703, ohne die Abfrage je an PostgreSQL zu schicken. Das meldet
# auch fuer nachweislich gesperrte Tabellen (profiles) "offen".
#
# Nutzung:  ./scripts/rls-anon-probe.sh [pfad-zur-env]   (default .env.local)
# Exit 1, sobald eine Tabelle Zeilen ausliefert ODER eine Tabelle aus der
# Sperrliste unten wieder ein GRANT hat.
# ──────────────────────────────────────────────────────────────────────
set -uo pipefail
ENVF="${1:-.env.local}"

# Tabellen, die anon NIE lesen koennen darf (PII/Betrieb). Deckungsgleich mit
# supabase/migrations/20260827_anon_grant_lockdown.sql.
GESPERRT=" newsletter_sends newsletter_campaigns payout_accounts tenant_profiles rental_requests rental_request_dedupe user_uploads staff user_2fa "

# Tabellen mit oeffentlichem Inhalt (keine PII) — anon-lesbar gewollt.
# Stichprobe 2026-08-27 des Inhalts, nicht nur des Namens:
#   app_settings       17 Zeilen, ausschliesslich Design-Tokens
#                      (logo/*_url, layout/*_radius, theme/*, animation/*)
#   affiliate_products Produktempfehlungen fuer /empfehlungen
OEFFENTLICH=" categories product_categories onboarding_slides services rental_equipment salon_images app_settings affiliate_products "

ANON=$(grep -E "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" "$ENVF" | head -1 | sed -E 's/^[^=]+=//; s/^"//; s/"$//')
URL=$(grep -E "^NEXT_PUBLIC_SUPABASE_URL=" "$ENVF" | head -1 | sed -E 's/^[^=]+=//; s/^"//; s/"$//')
[ -z "$ANON" ] && { echo "Kein Anon-Key in $ENVF"; exit 1; }
B="$URL/rest/v1"

TABLES=$( { grep -rhoiE 'CREATE TABLE (IF NOT EXISTS )?(public\.)?"?([a-z_][a-z0-9_]*)"?' supabase/migrations/*.sql \
             | sed -E 's/.*(TABLE|EXISTS) +//; s/public\.//; s/"//g' | tr 'A-Z' 'a-z'
           grep -rhoE "\.from\(['\"]([a-zA-Z_][a-zA-Z0-9_]*)['\"]\)" src/ \
             | sed -E "s/\.from\(['\"]//; s/['\"]\)//"; } | sort -u | grep -v '^$' )

LECK=0        # anon sieht echte Zeilen
OFFEN=0       # anon hat GRANT auf einer Tabelle aus GESPERRT
printf "%-30s | %-6s | %-6s | %-6s | %s\n" TABELLE HTTP ZEILEN GRANT BEFUND
printf -- "-------------------------------------------------------------------------------------\n"
for T in $TABLES; do
  R=$(curl -s -w "|%{http_code}" "$B/$T?select=*&limit=1" -H "apikey: $ANON" -H "Authorization: Bearer $ANON")
  C=${R##*|}; BD=${R%|*}

  case "$C" in
    200) G="offen" ;;
    401) G="zu" ;;
    *)   G="-" ;;
  esac

  N=""
  if [ "$C" = "200" ]; then
    N=$(curl -s -D - -o /dev/null "$B/$T?select=*&limit=0" -H "apikey: $ANON" \
        -H "Authorization: Bearer $ANON" -H "Prefer: count=exact" \
        | grep -i '^content-range' | tr -d '\r' | sed 's#.*/##')
  fi

  if [ "$C" = "404" ]; then
    S="Tabelle existiert nicht"
  elif [ "$G" != "offen" ]; then
    S="zu: $(echo "$BD" | sed -E 's/.*"message":"([^"]*)".*/\1/' | head -c 44)"
  elif [[ "$OEFFENTLICH" == *" $T "* ]]; then
    # Bewusst oeffentlich. Zeilen sind hier kein Befund.
    S="offen (oeffentlicher Inhalt — gewollt)"
  elif [[ "$GESPERRT" == *" $T "* ]]; then
    if [ "${N:-0}" -gt 0 ] 2>/dev/null; then
      S="!!! ANON LIEST PII !!!"; LECK=$((LECK+1))
    else
      S="!!! GRANT OFFEN — leer, aber lesbar sobald Zeilen kommen !!!"; OFFEN=$((OFFEN+1))
    fi
  elif [ "${N:-0}" -gt 0 ] 2>/dev/null; then
    S="!!! ANON LIEST DATEN — unklassifiziert !!!"; LECK=$((LECK+1))
  else
    S="GRANT offen, heute leer — pruefen ob gewollt"
  fi
  printf "%-30s | %-6s | %-6s | %-6s | %s\n" "$T" "$C" "${N:--}" "$G" "$S"
done
echo
echo "Tabellen mit anon-lesbaren Daten:            $LECK"
echo "Gesperrte Tabellen mit offenem anon-GRANT:   $OFFEN"
[ "$LECK" -gt 0 ] || [ "$OFFEN" -gt 0 ] && exit 1 || exit 0
