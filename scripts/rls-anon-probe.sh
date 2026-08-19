#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# RLS Anon-Expositions-Probe — READ ONLY, veraendert NICHTS.
#
# Prueft aus der Sicht eines beliebigen Angreifers (nur mit dem
# oeffentlichen NEXT_PUBLIC_SUPABASE_ANON_KEY), welche Tabellen Daten
# herausgeben. Braucht KEINEN service_role-Key und KEINEN DB-Zugang.
#
# Nutzung:  ./scripts/rls-anon-probe.sh [pfad-zur-env]   (default .env.prod)
# ──────────────────────────────────────────────────────────────────────
set -uo pipefail
ENVF="${1:-.env.prod}"
ANON=$(grep -E "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" "$ENVF" | head -1 | sed -E 's/^[^=]+=//; s/^"//; s/"$//')
URL=$(grep -E "^NEXT_PUBLIC_SUPABASE_URL=" "$ENVF" | head -1 | sed -E 's/^[^=]+=//; s/^"//; s/"$//')
[ -z "$ANON" ] && { echo "Kein Anon-Key in $ENVF"; exit 1; }
B="$URL/rest/v1"

TABLES=$( { grep -rhoiE 'CREATE TABLE (IF NOT EXISTS )?(public\.)?"?([a-z_][a-z0-9_]*)"?' supabase/migrations/*.sql \
             | sed -E 's/.*(TABLE|EXISTS) +//; s/public\.//; s/"//g' | tr 'A-Z' 'a-z'
           grep -rhoE "\.from\(['\"]([a-zA-Z_][a-zA-Z0-9_]*)['\"]\)" src/ \
             | sed -E "s/\.from\(['\"]//; s/['\"]\)//"; } | sort -u | grep -v '^$' )

FAIL=0
printf "%-32s | %-6s | %-8s | %s\n" TABELLE HTTP ZEILEN BEFUND
printf -- "----------------------------------------------------------------------------\n"
for T in $TABLES; do
  R=$(curl -s -w "|%{http_code}" "$B/$T?select=*&limit=1" -H "apikey: $ANON" -H "Authorization: Bearer $ANON")
  C=${R##*|}; BD=${R%|*}
  N=""
  if [ "$C" = "200" ]; then
    N=$(curl -s -D - -o /dev/null "$B/$T?select=*&limit=0" -H "apikey: $ANON" \
        -H "Authorization: Bearer $ANON" -H "Prefer: count=exact" \
        | grep -i '^content-range' | tr -d '\r' | sed 's#.*/##')
    if [ "${N:-0}" -gt 0 ] 2>/dev/null; then S="!!! ANON LIEST DATEN !!!"; FAIL=$((FAIL+1)); else S="ok (keine Zeilen sichtbar)"; fi
  elif [ "$C" = "404" ]; then S="Tabelle existiert nicht"
  else S="blockiert: $(echo "$BD" | sed -E 's/.*"message":"([^"]*)".*/\1/' | head -c 50)"; fi
  printf "%-32s | %-6s | %-8s | %s\n" "$T" "$C" "${N:--}" "$S"
done
echo
echo "Tabellen mit anon-lesbaren Daten: $FAIL"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
