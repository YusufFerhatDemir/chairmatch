#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# Was kann der ANON-Schluessel wirklich?
# ══════════════════════════════════════════════════════════════════════
#
# WOZU
# Das Supabase-Dashboard meldet „Tabellen im Schema public ohne RLS",
# nennt aber keine Tabelle. Diese Sonde beantwortet die Frage von aussen:
# sie fragt jede bekannte Tabelle mit dem OEFFENTLICHEN Schluessel ab und
# zeigt, wo tatsaechlich eine Tuer offen steht.
#
# WARUM LESEN ALLEIN NICHT REICHT
# Eine Tabelle kann `anon` mit 401 antworten und trotzdem ein
# INSERT-Recht tragen. Genau das war am 2026-09-10 bei `visit_logs` und
# `submission_tickets` der Fall: GET 401, POST 201. Wer nur liest,
# uebersieht die gefaehrlichere Haelfte.
#
# WARUM DER POST-TEST NICHTS SCHREIBT
# Der Schreibtest sendet `{"id":"KEINE-UUID"}`. Postgres bricht die
# Anweisung dann an der Typumwandlung ab — BEVOR eine Zeile entsteht.
# Welcher Fehler zurueckkommt, verraet die Rechtelage eindeutig:
#
#   42501  permission denied      → kein INSERT-Recht          (gewollt)
#   22P02  invalid input syntax   → INSERT-Recht VORHANDEN     (OFFENE TUER)
#
# Der Umweg ist noetig, weil `anon` auf diesen Tabellen INSERT ohne SELECT
# haelt: ein einfacher POST antwortet dann 201 und HINTERLAESST eine Zeile,
# und `Prefer: return=representation` antwortet 401 mit 42501 im Rumpf —
# also genau wie eine verweigerte Berechtigung. Beide Wege taugen nicht:
# der eine schreibt, der andere verwechselt offen mit zu.
#
# Genau diese Verwechslung ist bei der ersten Fassung dieser Sonde
# passiert: sie meldete „Perimeter dicht", waehrend zwei Tueren offen
# standen.
#
# NUTZUNG
#   bash scripts/anon-perimeter-probe.sh
#
# Braucht NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY aus
# .env.local. Kein Dienstschluessel, kein psql.
# ══════════════════════════════════════════════════════════════════════
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1
[ -f .env.local ] && { set -a; . ./.env.local; set +a; }

U="${NEXT_PUBLIC_SUPABASE_URL:-}"
A="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
if [ -z "$U" ] || [ -z "$A" ]; then
  echo "FEHLT: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY" >&2
  exit 2
fi

TABELLEN="
rental_requests rental_request_dedupe email_delivery_log rental_equipment
push_subscriptions wait_list cookie_consents notification_log user_uploads
salons bookings services booking_policies staff consents audit_logs
promo_codes rental_bookings favorites products product_variants cart_items
orders order_items sellers profiles payout_accounts conversations
conversation_participants messages error_logs newsletter_subscribers
newsletter_campaigns newsletter_sends analytics_events salon_images
documents authorities_packs submission_tickets visit_logs categories
platform_transactions payments login_attempts consent_logs user_2fa
tenant_profiles
"

# `categories` ist bewusst oeffentlich lesbar: Kategoriekatalog, steht
# ohnehin auf jeder oeffentlichen Seite, keine personenbezogenen Daten.
LESEN_ERLAUBT="categories"

echo "═══════════════════════════════════════════════════════════════"
echo " ANON-PERIMETER — $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo " $U"
echo "═══════════════════════════════════════════════════════════════"
echo

lese_offen=0
schreib_offen=0
gepruef=0

for t in $TABELLEN; do
  [ -z "$t" ] && continue
  gepruef=$((gepruef + 1))

  get=$(curl -s -o /dev/null -w '%{http_code}' -m 20 \
        "$U/rest/v1/$t?select=*&limit=1" -H "apikey: $A")

  # Ungueltige UUID: bricht an der Typumwandlung ab, schreibt nichts.
  post_body=$(curl -s -m 20 -X POST "$U/rest/v1/$t" -H "apikey: $A" \
              -H 'Content-Type: application/json' -d '{"id":"KEINE-UUID"}')
  post_code=$(printf '%s' "$post_body" | sed -n 's/.*"code":"\([A-Z0-9]*\)".*/\1/p')

  meldung=""
  if [ "$get" = "200" ]; then
    case " $LESEN_ERLAUBT " in
      *" $t "*) meldung="  (lesbar — bewusst so)" ;;
      *) meldung="  ← ANON KANN LESEN"; lese_offen=$((lese_offen + 1)) ;;
    esac
  fi

  # 22P02 = die Anweisung kam bis zur Typumwandlung, also existiert das
  # INSERT-Recht. 42501 = vorher an der Berechtigung gescheitert.
  if [ "$post_code" = "22P02" ]; then
    meldung="$meldung  ← ANON KANN SCHREIBEN"
    schreib_offen=$((schreib_offen + 1))
  fi

  [ -n "$meldung" ] && printf '  %-26s GET %s INSERT %s%s\n' "$t" "$get" "${post_code:-—}" "$meldung"
done

echo
echo "═══════════════════════════════════════════════════════════════"
printf ' %d Tabellen geprueft\n' "$gepruef"
printf ' unerwartet lesbar:    %d\n' "$lese_offen"
printf ' beschreibbar:         %d\n' "$schreib_offen"
echo "═══════════════════════════════════════════════════════════════"

if [ "$lese_offen" -gt 0 ] || [ "$schreib_offen" -gt 0 ]; then
  echo
  echo "OFFENE TUER GEFUNDEN. Zu schliessen ueber eine Migration nach dem"
  echo "Muster von 20260910_anon_insert_lockdown.sql (erst REVOKE, dann RLS)."
  exit 1
fi

echo
echo "Perimeter dicht."
exit 0
