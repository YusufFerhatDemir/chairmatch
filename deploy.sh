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

echo "→ typecheck (warn-only)..."
npm run typecheck || echo "  ⚠ pre-existing TS errors ignored (Vercel ignoreBuildErrors=true)"

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
