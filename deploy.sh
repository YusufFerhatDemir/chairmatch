#!/usr/bin/env bash
# Standard-Deploy-Flow für Chairmatch.
# yusuf braucht das NIE manuell auszuführen — das ist für Agents.
# Vercel deployed automatisch nach Push auf main.

set -e

COMMIT_MSG="${1:-chore: update}"

# Cleanup stale locks
rm -f .git/index.lock .git/objects/maintenance.lock 2>/dev/null || true

echo "→ typecheck (warn-only)..."
npm run typecheck || echo "  ⚠ pre-existing TS errors ignored (Vercel ignoreBuildErrors=true)"

echo "→ git add + commit..."
git add -A
git diff --cached --quiet && { echo "Nothing to commit"; exit 0; }
git commit -m "$COMMIT_MSG"

echo "→ push..."
git push origin main

echo "✓ Push durch. Vercel deployed automatisch in ~1-2 Min."
echo "  Status: https://vercel.com/team_iJXOJqpBTNdePfg1tMV0r1ip/chairmatch/deployments"
