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
# WARUM AUCH LOESCHEN GEPRUEFT WIRD (seit 2026-09-12)
# Die Sonde kannte bis dahin nur Lesen und Einfuegen. `spatial_ref_sys`
# traegt fuer `anon` aber ALLE vier Rechte — gefunden erst, als jemand von
# Hand danach sah. Der Loeschtest nutzt einen Filter, der sich selbst
# widerspricht:
#
#   DELETE /tabelle?id=eq.<A>&id=eq.<B>      (A != B)
#
# PostgREST verbindet beide mit UND, die Menge ist damit beweisbar leer —
# egal, was in der Tabelle steht. Zurueck kommt 204 (Recht vorhanden, null
# Zeilen betroffen) oder 401 (kein Recht). Der sonst naheliegende Weg ueber
# einen ungueltigen Typ im Filter taugt hier NICHT: bei DELETE und PATCH
# wertet PostgREST den Filter VOR der Berechtigung aus, `salons` antwortet
# dann ebenfalls 22P02, obwohl `anon` dort kein Loeschrecht hat. Nur beim
# INSERT greift die Berechtigung zuerst — nachgemessen an vier
# Kontrolltabellen.
#
# WAS DIE SONDE NICHT KANN
# Sie kennt nur die Tabellen in der Liste unten. PostgREST wuerde sie ueber
# `GET /rest/v1/` mit `Accept: application/openapi+json` selbst aufzaehlen,
# aber Supabase beantwortet diese Wurzel dem anon-Schluessel mit 401
# (nachgemessen 2026-09-12). Wer eine Tabelle anlegt, traegt sie hier ein —
# sonst meldet die Sonde weiter „dicht" und meint damit nur „dicht, soweit
# ich hingesehen habe".
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
spatial_ref_sys geography_columns geometry_columns
"

# `categories` ist bewusst oeffentlich lesbar: Kategoriekatalog, steht
# ohnehin auf jeder oeffentlichen Seite, keine personenbezogenen Daten.
LESEN_ERLAUBT="categories"

# Reine SICHTEN. PostgREST kann in sie nicht einfuegen, ein INSERT-Test
# sagt dort also nichts ueber Rechte aus. Das Lesen wird trotzdem geprueft.
SICHTEN="geography_columns geometry_columns"

# Die meisten Tabellen haben eine `id` vom Typ uuid. Wo nicht, steht hier
# die Spalte, an der die Sonde ansetzt — sonst antwortet PostgREST mit
# PGRST204 („column not found"), und das ist ueberhaupt kein Rechtetest,
# sondern eine Fehlanzeige, die frueher wie Ruhe aussah.
#
# GEFUNDEN AM 12.09.2026: sieben der fuenfzig Eintraege liefen in genau
# diese Falle — `rental_request_dedupe`, `payout_accounts`, `user_2fa`,
# `tenant_profiles` und die drei PostGIS-Eintraege. Darunter sind
# Bankverbindungen (`payout_accounts`) und 2FA-Geheimnisse (`user_2fa`).
# Sie sind, wie die Nachmessung mit der richtigen Spalte zeigt, alle dicht
# (42501) — aber die Sonde hatte es nie gewusst und trotzdem „dicht"
# gemeldet. Deshalb zaehlt unten jedes nicht auswertbare Ergebnis als
# UNGEPRUEFT und laesst den Lauf durchfallen.
schluessel_spalte() {
  case "$1" in
    spatial_ref_sys) echo "srid" ;;
    payout_accounts|user_2fa|tenant_profiles) echo "user_id" ;;
    # `fingerprint` ist der Primaerschluessel, aber vom Typ text — dort ist
    # kein Wert ungueltig. Die uuid-Spalte daneben taugt fuer den Test.
    rental_request_dedupe) echo "requester_id" ;;
    *) echo "id" ;;
  esac
}

# Zwei Werte, die beide fuer die Spalte gueltig sind und nie gleichzeitig
# zutreffen koennen.
schluessel_werte() {
  case "$1" in
    spatial_ref_sys) echo "0 1" ;;
    *) echo "00000000-0000-4000-a000-000000000000 11111111-1111-4111-8111-111111111111" ;;
    # uuid-Spalten teilen sich den Default; nur nicht-uuid braucht einen Fall.
  esac
}

# Ungueltiger Wert fuer den INSERT-Test — bricht an der Typumwandlung ab.
ungueltiger_wert() {
  case "$1" in
    spatial_ref_sys) echo "KEINE-ZAHL" ;;
    *) echo "KEINE-UUID" ;;
  esac
}

echo "═══════════════════════════════════════════════════════════════"
echo " ANON-PERIMETER — $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo " $U"
echo "═══════════════════════════════════════════════════════════════"
echo

lese_offen=0
schreib_offen=0
loesch_offen=0
ungepruef=0
gepruef=0

for t in $TABELLEN; do
  [ -z "$t" ] && continue
  gepruef=$((gepruef + 1))

  spalte=$(schluessel_spalte "$t")
  set -- $(schluessel_werte "$t")
  wert_a="$1"; wert_b="$2"
  murks=$(ungueltiger_wert "$t")

  get=$(curl -s -o /dev/null -w '%{http_code}' -m 20 \
        "$U/rest/v1/$t?select=*&limit=1" -H "apikey: $A")

  # Ungueltiger Wert: bricht an der Typumwandlung ab, schreibt nichts.
  post_body=$(curl -s -m 20 -X POST "$U/rest/v1/$t" -H "apikey: $A" \
              -H 'Content-Type: application/json' -d "{\"$spalte\":\"$murks\"}")
  post_code=$(printf '%s' "$post_body" | sed -n 's/.*"code":"\([A-Z0-9]*\)".*/\1/p')

  # Widerspruechlicher Filter: die Menge ist leer, egal was drinsteht.
  del_code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 -X DELETE \
             "$U/rest/v1/$t?$spalte=eq.$wert_a&$spalte=eq.$wert_b" -H "apikey: $A")

  meldung=""
  if [ "$get" = "200" ]; then
    case " $LESEN_ERLAUBT " in
      *" $t "*) meldung="  (lesbar — bewusst so)" ;;
      *) meldung="  ← ANON KANN LESEN"; lese_offen=$((lese_offen + 1)) ;;
    esac
  fi

  # 22P02 = die Anweisung kam bis zur Typumwandlung, also existiert das
  # INSERT-Recht. 42501 = vorher an der Berechtigung gescheitert.
  #
  # ALLES ANDERE IST KEINE ANTWORT, SONDERN EINE FEHLANZEIGE. Vor allem
  # PGRST204 („column not found"): den beantwortet PostgREST selbst, die
  # Anweisung erreicht Postgres nie, und ueber Rechte ist damit nichts
  # gesagt. Frueher fiel das unter den Tisch — die Zeile bekam keine
  # Meldung und der Lauf endete mit „Perimeter dicht". Jetzt zaehlt es als
  # UNGEPRUEFT und laesst den Lauf durchfallen: eine Sonde, die eine Tabelle
  # nicht pruefen kann, darf sie nicht als geprueft ausweisen.
  case " $SICHTEN " in
    *" $t "*)
      # Sichten nehmen kein INSERT entgegen; das ist kein Rechtebefund.
      meldung="$meldung  (Sicht — INSERT nicht anwendbar)"
      ;;
    *)
      if [ "$post_code" = "22P02" ]; then
        meldung="$meldung  ← ANON KANN SCHREIBEN"
        schreib_offen=$((schreib_offen + 1))
      elif [ "$post_code" != "42501" ]; then
        meldung="$meldung  ← INSERT UNGEPRUEFT (${post_code:-keine Antwort})"
        ungepruef=$((ungepruef + 1))
      fi
      ;;
  esac

  # 204 = geloescht (null Zeilen, der Filter ist leer), also besteht das
  # Recht. 401 = verweigert.
  if [ "$del_code" = "204" ]; then
    meldung="$meldung  ← ANON KANN LOESCHEN"
    loesch_offen=$((loesch_offen + 1))
  fi

  [ -n "$meldung" ] && printf '  %-26s GET %s INSERT %-6s DELETE %s%s\n' \
    "$t" "$get" "${post_code:-—}" "$del_code" "$meldung"
done

echo
echo "═══════════════════════════════════════════════════════════════"
printf ' %d Tabellen geprueft\n' "$gepruef"
printf ' unerwartet lesbar:    %d\n' "$lese_offen"
printf ' beschreibbar:         %d\n' "$schreib_offen"
printf ' loeschbar:            %d\n' "$loesch_offen"
printf ' INSERT ungeprueft:    %d\n' "$ungepruef"
echo "═══════════════════════════════════════════════════════════════"

if [ "$ungepruef" -gt 0 ]; then
  echo
  echo "UNGEPRUEFT: fuer diese Tabellen hat der INSERT-Test Postgres nie"
  echo "erreicht — meist, weil die Schluesselspalte anders heisst als 'id'."
  echo "Den richtigen Namen in schluessel_spalte() eintragen. Bis dahin ist"
  echo "ueber diese Tabellen NICHTS ausgesagt."
fi

if [ "$lese_offen" -gt 0 ] || [ "$schreib_offen" -gt 0 ] || [ "$loesch_offen" -gt 0 ]; then
  echo
  echo "OFFENE TUER GEFUNDEN. Zu schliessen ueber eine Migration nach dem"
  echo "Muster von 20260910_anon_insert_lockdown.sql (erst REVOKE, dann RLS)."
fi

if [ "$lese_offen" -gt 0 ] || [ "$schreib_offen" -gt 0 ] || [ "$loesch_offen" -gt 0 ] \
   || [ "$ungepruef" -gt 0 ]; then
  exit 1
fi

echo
echo "Perimeter dicht."
exit 0
