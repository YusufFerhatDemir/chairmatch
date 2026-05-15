#!/usr/bin/env bash
# ChairMatch Quick-Deploy-Script
# Verwendung: ./deploy.sh "commit message"
# Oder: ./deploy.sh   (nimmt default message)

set -e
cd "$(dirname "$0")"

MSG="${1:-chore: deploy update}"

echo "🧹 Lock-File entfernen falls vorhanden..."
rm -f .git/index.lock 2>/dev/null || true

echo "📦 Änderungen stagen..."
git add -A

if git diff --cached --quiet; then
  echo "✨ Keine Änderungen — nichts zu committen."
else
  echo "💾 Committing: $MSG"
  git commit -m "$MSG"
fi

echo "🚀 Push zu GitHub..."
git push origin main

echo ""
echo "✅ Deploy ausgelöst!"
echo "📡 Vercel deployed automatisch in 2-3 Min."
echo "🌐 Check: https://chairmatch.de"
echo "📊 Status: https://vercel.com/yusufferhatdemirs-projects/chairmatch/deployments"
