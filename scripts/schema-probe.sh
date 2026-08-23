#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Prueft, ob das Live-Schema noch zu dem passt, was der Code erwartet.
#
# Hintergrund: `supabase/migrations/*` ist fuer ChairMatch nicht die
# Wahrheit — mehrere Tabellen haben dort kein CREATE TABLE, andere weichen
# live ab. Zwei Produktionsfehler (fehlende Tabelle `notifications`,
# fehlende Spalten in `email_delivery_log`) sind genau daran entstanden und
# blieben von einer gruenen Testsuite gedeckt.
#
# Der ANON-Key reicht: PostgREST beantwortet eine unbekannte Spalte mit
# 42703, BEVOR es die Rechte prueft. Es wird ausschliesslich gelesen.
#
# Deutung:
#   OK       Tabelle/Spalte vorhanden
#   FEHLT    Spalte existiert nicht (42703)
#   KEINE    Tabelle existiert nicht (PGRST205)
#
# Die Sollwerte stehen in src/test/live-schema.ts. Weicht etwas ab, gehoert
# BEIDES angefasst: die Liste dort und der Code, der die Spalte schreibt.
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; . ./.env.local; set +a
U="${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL fehlt}"
K="${NEXT_PUBLIC_SUPABASE_ANON_KEY:?NEXT_PUBLIC_SUPABASE_ANON_KEY fehlt}"

fail=0

probe() { # tabelle spalte
  local body
  body=$(curl -s "$U/rest/v1/$1?select=$2&limit=1" \
    -H "apikey: $K" -H "Authorization: Bearer $K")
  if grep -q 'PGRST205' <<<"$body"; then
    printf '  KEINE  %s (Tabelle fehlt)\n' "$1"; fail=1; return 1
  elif grep -q '42703' <<<"$body"; then
    printf '  FEHLT  %s.%s\n' "$1" "$2"; fail=1
  fi
  return 0
}

# Erwartete Spalten je Tabelle — Spiegel von src/test/live-schema.ts.
while IFS='|' read -r table columns; do
  [ -z "$table" ] && continue
  printf '%s\n' "$table"
  for c in $columns; do probe "$table" "$c" || break; done
done <<'TABLES'
rental_requests|id equipment_id salon_id requester_id recipient_id request_type preferred_date preferred_time duration_unit units message estimated_cents status created_at updated_at
rental_request_dedupe|fingerprint requester_id equipment_id request_id claimed_at expires_at
email_delivery_log|id email_type reference_id recipient_email status provider_message_id error_message subject created_at updated_at
rental_equipment|id salon_id type name description price_per_day_cents price_per_hour_cents price_per_week_cents price_per_month_cents available_days available_from available_to features is_available images created_at updated_at
notification_log|id user_id title body type reference_id reference_type is_read created_at
user_uploads|id user_id target salon_id equipment_id doc_key bucket storage_path mime_type size_bytes is_public created_at
salons|id owner_id name city slug gallery logo_url created_at updated_at
rental_bookings|id equipment_id status created_at
TABLES

if [ "$fail" -eq 0 ]; then
  echo "Live-Schema deckt sich mit src/test/live-schema.ts."
else
  echo "Abweichung — src/test/live-schema.ts und den schreibenden Code pruefen." >&2
fi
exit "$fail"
