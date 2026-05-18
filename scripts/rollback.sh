#!/usr/bin/env bash
# rollback.sh — revertiert die letzten N Commits auf dem aktuellen Branch via safe revert.
# Kein force-push, History bleibt nachvollziehbar.
# Usage: ./scripts/rollback.sh [N]   — default: 1

set -e

N="${1:-1}"

if ! [[ "$N" =~ ^[0-9]+$ ]] || [ "$N" -lt 1 ]; then
  echo "❌ Ungültiges N: '$N'. Muss positive ganze Zahl sein."
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "→ Branch: $BRANCH"
echo "→ Werde diese $N Commit(s) revertieren:"
git log --oneline -n "$N"
echo ""

# Revertiere in einem einzelnen Commit (--no-commit + manueller commit) damit History sauber bleibt.
# `git revert HEAD~N..HEAD` mit --no-edit erzeugt N Revert-Commits — das ist gewollt, weil
# einzelne Reverts klarer nachvollziehbar sind und keine Konflikt-Cascade verursachen.
git revert --no-edit "HEAD~$N..HEAD"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "→ push origin $BRANCH..."
git push origin "$BRANCH"

echo "→ verify push..."
"$SCRIPT_DIR/verify-push.sh"

echo "→ status update..."
"$SCRIPT_DIR/status.sh"

echo "✓ Rollback durch. $N Commit(s) revertiert auf $BRANCH."
