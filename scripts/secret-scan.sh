#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# Secret-Scan ueber den GESAMTEN getrackten Bestand
# ══════════════════════════════════════════════════════════════════════
#
# WARUM ZUSAETZLICH ZU precommit-guard.sh
#
# Der Pre-Commit-Guard prueft den STAGED DIFF. Er sieht nur, was gerade
# hinzukommt — und ist damit blind fuer alles, was schon drinsteht.
#
# Genau das ist passiert: `index_legacy.html` trug seit dem 08.03.2026
# einen FUNKTIONIERENDEN Supabase-anon-Key fuer ein fremdes Projekt
# (vlrviyrgggzhayepfmop, nicht ChairMatch). Das Repository ist oeffentlich.
# Der Guard haette die Zeile heute erwischt — sein Muster passt —, aber sie
# wurde committet, bevor es ihn gab, und danach hat nie wieder jemand
# hingesehen.
#
# Dieses Skript sieht hin: `git ls-files`, also der ganze Bestand.
#
# WAS ES NICHT KANN: die HISTORIE. Ein einmal committeter Schluessel bleibt
# in alten Commits stehen, auch wenn die Datei heute sauber ist. Ein Fund
# heisst deshalb immer BEIDES — entfernen UND rotieren.
#
# NUTZUNG
#   bash scripts/secret-scan.sh     # Exit 1 bei Fund
# ══════════════════════════════════════════════════════════════════════
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# Platzhalter-Dateien. Bewusst eng gehalten: `.env.example` DOKUMENTIERT
# die Formate („beginnt mit sk_live_…", „whsec_DEIN_WEBHOOK_SECRET") und
# enthaelt keine echten Werte. Wer hier etwas ergaenzt, nimmt eine Datei aus
# der Pruefung — das gehoert begruendet.
AUSNAHMEN='^(\.env\.example|scripts/secret-scan\.sh|scripts/precommit-guard\.sh)$'

# Echte Schluessel, keine Formatbeschreibungen. `sk_live_` allein reicht
# nicht — erst mit Nutzlast dahinter ist es ein Schluessel.
MUSTER='(re_[a-zA-Z0-9]{20,}|sk_live_[a-zA-Z0-9]{10,}|rk_live_[a-zA-Z0-9]{10,}|pk_live_[a-zA-Z0-9]{10,}|whsec_[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{36}|eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,})'

echo "═══════════════════════════════════════════════════════════════"
echo " SECRET-SCAN — $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "═══════════════════════════════════════════════════════════════"

TREFFER=0
while IFS= read -r datei; do
  printf '%s' "$datei" | grep -qE "$AUSNAHMEN" && continue
  [ -f "$datei" ] || continue
  ZEILEN=$(grep -nE "$MUSTER" "$datei" 2>/dev/null | head -3)
  if [ -n "$ZEILEN" ]; then
    TREFFER=$((TREFFER + 1))
    echo
    echo "  $datei"
    # Nur den Anfang zeigen — der Fund soll auffindbar sein, nicht lesbar.
    printf '%s\n' "$ZEILEN" | cut -c1-90 | sed 's/^/      /'
  fi
done < <(git ls-files)

echo
echo "═══════════════════════════════════════════════════════════════"
if [ "$TREFFER" -gt 0 ]; then
  printf ' %d Datei(en) mit moeglichem Schluessel\n' "$TREFFER"
  echo "═══════════════════════════════════════════════════════════════"
  echo
  echo "ENTFERNEN REICHT NICHT. Die Historie bleibt oeffentlich —"
  echo "der Schluessel gehoert im betroffenen Dienst ROTIERT."
  exit 1
fi
echo " Kein Schluessel im getrackten Bestand."
echo "═══════════════════════════════════════════════════════════════"
exit 0
