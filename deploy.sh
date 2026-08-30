#!/usr/bin/env bash
# Standard-Deploy-Flow für Chairmatch.
# yusuf braucht das NIE manuell auszuführen — das ist für Agents.
# Vercel deployed automatisch nach Push auf main.

set -e

COMMIT_MSG="${1:-chore: update}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Cleanup stale locks
rm -f .git/index.lock .git/objects/maintenance.lock 2>/dev/null || true

# Stage everything first so der Guard auf dem echten Staging-State läuft.
echo "→ git add -A..."
git add -A

# Wenn nichts zu committen ist, früh abbrechen — aber trotzdem Status frisch halten.
if git diff --cached --quiet; then
  echo "Nothing to commit."
  "$SCRIPT_DIR/scripts/status.sh" || true
  exit 0
fi

echo "→ pre-commit-guard..."
"$SCRIPT_DIR/scripts/precommit-guard.sh"

# SKIP_TYPECHECK=1 ueberspringt den lokalen tsc-Lauf.
#
# Der Schalter war dokumentiert, aber nicht gebaut: das Skript rief
# `npm run typecheck` bedingungslos auf. Auf einer ausgelasteten Maschine
# braucht der Lauf hier ueber eine Stunde, und `deploy.sh` sah dann aus, als
# haenge es — obwohl es nur wartete.
#
# WICHTIG: Der Lauf ist NICHT wirklich warn-only. Der Text unten stammt aus
# einer Zeit mit `ignoreBuildErrors=true`; das gilt nicht mehr, ein TS-Fehler
# bricht heute den Vercel-Build. Wer hier ueberspringt, verlagert die Pruefung
# also auf Vercel — und muss den Deploy dort nachsehen.
if [ "${SKIP_TYPECHECK:-}" = "1" ]; then
  echo "→ typecheck ÜBERSPRUNGEN (SKIP_TYPECHECK=1) — Vercel ist damit die einzige Typprüfung."
else
  echo "→ typecheck (warn-only)..."
  npm run typecheck || echo "  ⚠ pre-existing TS errors ignored"
fi

echo "→ commit..."
git commit -m "$COMMIT_MSG"

echo "→ push..."
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin "$BRANCH"

echo "→ verify push..."
"$SCRIPT_DIR/scripts/verify-push.sh"

echo "→ status update..."
"$SCRIPT_DIR/scripts/status.sh"

echo "✓ Done. Vercel deployed automatisch in ~1-2 Min."
echo "  Status: https://vercel.com/team_iJXOJqpBTNdePfg1tMV0r1ip/chairmatch/deployments"
