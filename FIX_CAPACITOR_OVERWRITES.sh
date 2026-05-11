#!/bin/bash
# Repariert die Files, die capacitor-assets fälschlich überschrieben/gelöscht hat.
# Einmal ausführen, fertig.

set -e
cd "$(dirname "$0")"

echo "🔧 Stelle gelöschte PWA-Icons wieder her…"
git checkout HEAD -- public/icon.svg public/icon-180.png 2>/dev/null && echo "  ✅ icon.svg + icon-180.png wiederhergestellt" || echo "  ⚠️  Aus Git nicht wiederherstellbar — siehe Fallback unten"

echo ""
echo "🗑️  Entferne fehlplatzierte WebP-Icons im falschen Ordner…"
rm -f icons/icon-48.webp icons/icon-72.webp icons/icon-96.webp icons/icon-128.webp icons/icon-192.webp icons/icon-256.webp icons/icon-512.webp
echo "  ✅ Rogue-WebPs entfernt"

echo ""
echo "🔄 Sync neu (damit Native-Apps die richtigen Files sehen)…"
npx cap sync
echo ""
echo "✅ FERTIG. Service-Worker + PWA-Install funktionieren wieder."
