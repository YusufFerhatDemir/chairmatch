#!/usr/bin/env bash
# ChairMatch — One-Command-Deploy
# ───────────────────────────────────────────────────────────────────────
# Nutzung:
#   ./deploy.sh                       → committed mit "chore: update"
#   ./deploy.sh "fix login bug"       → committed mit eigener Message
#
# Was es macht (in dieser Reihenfolge):
#   1. .git-Lock-Files aufräumen (häufiges macOS-Problem)
#   2. lokalen Stand mit Remote rebasen (verhindert "non-fast-forward" reject)
#   3. add + commit (skipped wenn nichts neu)
#   4. push
#   5. Vercel deployed automatisch via Git-Hook
# ───────────────────────────────────────────────────────────────────────

set -e

# Farben für lesbare Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

COMMIT_MSG="${1:-chore: update}"

echo -e "${BLUE}▸ Aufräumen alter Git-Locks…${NC}"
rm -f .git/index.lock .git/objects/maintenance.lock 2>/dev/null || true

echo -e "${BLUE}▸ Holen was auf GitHub neu ist (rebase)…${NC}"
# Falls es uncommitted changes gibt, müssen wir die stashen vor dem Rebase
STASHED=0
if ! git diff --quiet || ! git diff --cached --quiet; then
  git stash push -u -m "auto-stash-before-deploy-$(date +%s)" >/dev/null
  STASHED=1
fi

git pull --rebase origin main || {
  echo -e "${RED}✗ Rebase-Konflikt!${NC} Bitte manuell auflösen, dann nochmal ./deploy.sh"
  [ "$STASHED" -eq 1 ] && git stash pop || true
  exit 1
}

# Stash wieder zurückholen
if [ "$STASHED" -eq 1 ]; then
  git stash pop || {
    echo -e "${RED}✗ Konflikt beim Stash-Pop!${NC} Bitte manuell prüfen."
    exit 1
  }
fi

echo -e "${BLUE}▸ Änderungen einsammeln…${NC}"
git add -A

if git diff --cached --quiet; then
  echo -e "${YELLOW}⚠ Nichts zu committen — push entfällt.${NC}"
  exit 0
fi

# Zeig die geänderten Dateien
echo -e "${BLUE}▸ Diese Dateien werden gepusht:${NC}"
git diff --cached --name-status | sed 's/^/    /'

echo -e "${BLUE}▸ Commit & Push…${NC}"
git commit -m "$COMMIT_MSG"
git push origin main

echo ""
echo -e "${GREEN}✓ Erfolgreich gepusht!${NC}"
echo -e "  Vercel deployed automatisch — Live in ~1-2 Min auf chairmatch.de"
echo -e "  Status checken: ${BLUE}https://vercel.com/yusufferhatdemir/chairmatch${NC}"
