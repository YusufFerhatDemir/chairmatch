#!/usr/bin/env bash
#
# Produktionssonde — was sich von aussen ueber die laufende Instanz
# nachweisen laesst, ohne Anmeldung und ohne Dienstschluessel.
#
# Hintergrund: der Dienstschluessel (SUPABASE_SERVICE_ROLE_KEY in .env.prod)
# ist ungueltig (401), und ein direkter Datenbankzugang steht Agents nicht zur
# Verfuegung. Nachweisbar ist damit nicht der Inhalt der Tabellen, wohl aber
# ihr ZUGANG — und genau das ist die Frage, die bei Admin-Oberflaeche und
# anon-Rechten zaehlt.
#
# Gesondet wird dreierlei:
#   1. Geschuetzte Seiten leiten Nicht-Angemeldete auf /auth um (307).
#   2. Die Admin-Schnittstelle antwortet ohne Anmeldung mit 401.
#   3. Die PII-Tabellen sind fuer den anon-Key gesperrt (401).
#
# Aufruf:  bash scripts/prod-probe.sh
# Beendet sich mit 1, sobald eine Erwartung nicht erfuellt ist.

set -uo pipefail

SITE="${SITE:-https://www.chairmatch.de}"
ENV_DATEI="${ENV_DATEI:-.env.local}"

# shellcheck disable=SC1090
if [ -f "$ENV_DATEI" ]; then set -a; . "./$ENV_DATEI"; set +a; fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"

fehler=0
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
nok()  { printf '  \033[31m✗\033[0m %s\n' "$1"; fehler=$((fehler + 1)); }

status() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$1"; }

echo
echo "Produktionssonde — $SITE   ($(date '+%Y-%m-%d %H:%M'))"

# ── 1. Erreichbarkeit ────────────────────────────────────────────────
echo
echo "Erreichbarkeit"
code=$(status "$SITE/")
[ "$code" = "200" ] && ok "Startseite 200" || nok "Startseite $code (erwartet 200)"

# ── 2. Geschuetzte Seiten ────────────────────────────────────────────
echo
echo "Geschuetzte Seiten leiten auf /auth um"
for pfad in /account /favorites /admin /provider /admin/anbieter /admin/kpi; do
  antwort=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 20 "$SITE$pfad")
  code=${antwort%% *}
  ziel=${antwort#* }
  if [ "$code" = "307" ] && [[ "$ziel" == *"/auth?callbackUrl="* ]]; then
    ok "$pfad → 307 /auth"
  else
    nok "$pfad → $code $ziel (erwartet 307 auf /auth)"
  fi
done

# ── 3. Admin-Schnittstelle ───────────────────────────────────────────
echo
echo "Admin-Schnittstelle ohne Anmeldung"
for pfad in /api/admin/kpi /api/admin/mis /api/admin/health /api/admin/export \
            /api/admin/refund /api/admin/commissions /api/admin/tickets; do
  code=$(status "$SITE$pfad")
  [ "$code" = "401" ] && ok "$pfad → 401" || nok "$pfad → $code (erwartet 401)"
done

# ── 4. anon-Rechte auf den PII-Tabellen ──────────────────────────────
echo
echo "anon-Key auf gesperrten Tabellen"
if [ -z "$SUPABASE_URL" ] || [ -z "$ANON_KEY" ]; then
  nok "NEXT_PUBLIC_SUPABASE_URL/ANON_KEY fehlen (aus $ENV_DATEI) — Abschnitt uebersprungen"
else
  for tabelle in push_subscriptions notification_log wait_list cookie_consents \
                 rental_equipment rental_bookings payout_accounts profiles; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
      "$SUPABASE_URL/rest/v1/$tabelle?select=*&limit=1" -H "apikey: $ANON_KEY")
    # 401 = kein GRANT (gewollt). 200 waere ein offener Lesezugang.
    [ "$code" = "401" ] && ok "$tabelle → 401 (gesperrt)" \
                        || nok "$tabelle → $code (erwartet 401)"
  done
fi

# ── 5. Oeffentliche Kennzahlen ───────────────────────────────────────
echo
echo "Oeffentliche Kennzahlen (/api/public-stats)"
stats=$(curl -s --max-time 20 "$SITE/api/public-stats")
if echo "$stats" | grep -q '"salons"'; then
  ok "$(echo "$stats" | head -c 200)"
else
  nok "keine verwertbare Antwort: $(echo "$stats" | head -c 120)"
fi

echo
if [ "$fehler" -eq 0 ]; then
  printf '\033[32mAlle Erwartungen erfuellt.\033[0m\n\n'
else
  printf '\033[31m%d Abweichung(en).\033[0m\n\n' "$fehler"
fi
exit $([ "$fehler" -eq 0 ] && echo 0 || echo 1)
