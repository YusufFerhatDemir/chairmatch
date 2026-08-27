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

# Erwartete Spalten je Tabelle — SOLL-Zustand, nicht Ist-Zustand.
#
# Die unteren vier Bloecke (newsletter_*, analytics_events) beschreiben das
# Schema NACH den offenen Migrationen:
#   supabase/migrations/20260525_analytics_events.sql
#   supabase/migrations/20260824_newsletter_schema_repair.sql
#   supabase/migrations/20260824_schema_drift_repair.sql
# Solange die nicht eingespielt sind, meldet die Probe dort KEINE/FEHLT — das
# ist der erwartete Befund, kein neuer Fehler. src/test/live-schema.ts fuehrt
# dagegen den tatsaechlichen Ist-Zustand, damit die Tests ehrlich bleiben.
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
salons|id owner_id name city slug gallery logo_url created_at updated_at category is_active opening_hours state street house_number postal_code avg_rating review_count description phone
bookings|id customer_id salon_id service_id staff_id booking_date start_time end_time status price_cents notes cancellation_reason created_at updated_at provider_id resource_id booking_type payment_status stripe_session_id stripe_payment_intent is_first_visit
booking_policies|id salon_id deposit_percent cancellation_hours no_show_fee_cents created_at updated_at
staff|id salon_id name title is_active
consents|id user_id booking_id type given created_at
audit_logs|id user_id action entity entity_id details created_at
promo_codes|id code discount type is_active expires_at max_uses used_count
rental_bookings|id equipment_id status created_at
conversations|id salon_id created_at last_message_at
conversation_participants|id conversation_id user_id
messages|id conversation_id sender_id content is_read created_at
error_logs|id message stack url user_agent ip user_id severity component context created_at
visit_logs|id path ip country region city user_agent created_at
salon_images|id salon_id url image_type sort_order storage_path bucket created_at
services|id salon_id name slug price_cents duration_minutes category is_active sort_order created_at description currency risk_level
documents|id salon_id user_id type status name url created_at
authorities_packs|id salon_id created_by status created_at
submission_tickets|id salon_id user_id status plan_type admin_notes created_at updated_at
newsletter_subscribers|id email name source status tags unsubscribe_token last_sent_at is_confirmed subscribed_at unsubscribed_at
newsletter_campaigns|id subject preview_text html_content audience_filter status total_recipients total_sent total_opened total_clicked total_bounced sent_at created_by created_at updated_at
newsletter_sends|id campaign_id subscriber_id status resend_email_id error_message sent_at opened_at clicked_at created_at
analytics_events|id event_name session_id user_id path props source country region city user_agent created_at
TABLES

if [ "$fail" -eq 0 ]; then
  echo "Live-Schema deckt sich mit src/test/live-schema.ts."
else
  echo "Abweichung — src/test/live-schema.ts und den schreibenden Code pruefen." >&2
fi
exit "$fail"
