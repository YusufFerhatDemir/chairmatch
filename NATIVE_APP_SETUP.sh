#!/bin/bash
# ============================================================
# ChairMatch — Native App Setup (iOS + Android via Capacitor)
# ============================================================
# Voraussetzungen auf deinem Mac:
#   - Node 18+ (du hast 22 ✓)
#   - Xcode 15+ (für iOS-Build)
#   - Android Studio (für Android-Build) — Download: https://developer.android.com/studio
#   - Apple Developer Account (du hast einen ✓)
#   - Google Play Console Account (du hast einen ✓)
#
# Was dieses Script macht:
#   1. Installiert Capacitor + alle Plugins (npm install)
#   2. Initialisiert iOS-Projekt (Xcode-fähig)
#   3. Initialisiert Android-Projekt (Studio-fähig)
#   4. Generiert alle App-Icons + Splash-Screens für beide Plattformen
#   5. Synced den Web-Content in die nativen Projekte
#
# Wie ausführen:
#   cd ~/Chairmatch\ v1/chairmatch
#   chmod +x NATIVE_APP_SETUP.sh
#   ./NATIVE_APP_SETUP.sh
# ============================================================

set -e  # Bei Fehler abbrechen

echo ""
echo "🚀 ChairMatch — Native App Setup startet…"
echo "============================================================"
echo ""

cd "$(dirname "$0")"

echo "📦 Schritt 1/5: NPM-Dependencies installieren…"
npm install
echo "✅ Installiert."
echo ""

echo "📱 Schritt 2/5: iOS-Projekt initialisieren…"
if [ -d "ios" ]; then
  echo "ℹ️  ios/-Ordner existiert schon, überspringe Erstellung."
else
  npx cap add ios
fi
echo "✅ iOS-Projekt bereit."
echo ""

echo "🤖 Schritt 3/5: Android-Projekt initialisieren…"
if [ -d "android" ]; then
  echo "ℹ️  android/-Ordner existiert schon, überspringe Erstellung."
else
  npx cap add android
fi
echo "✅ Android-Projekt bereit."
echo ""

echo "🎨 Schritt 4/5: App-Icons + Splash-Screens generieren…"
npx capacitor-assets generate \
  --iconBackgroundColor '#080706' \
  --iconBackgroundColorDark '#080706' \
  --splashBackgroundColor '#080706' \
  --splashBackgroundColorDark '#080706'
echo "✅ Assets generiert."
echo ""

echo "🔄 Schritt 5/5: Web-Content in native Projekte syncen…"
npx cap sync
echo "✅ Sync fertig."
echo ""

echo "============================================================"
echo "🎉 SETUP KOMPLETT!"
echo "============================================================"
echo ""
echo "Nächste Schritte:"
echo ""
echo "📱 iOS in Xcode öffnen:"
echo "   npm run cap:open:ios"
echo "   → Xcode öffnet sich → Signing & Capabilities → Team auswählen"
echo "   → Product → Archive → Distribute App → App Store Connect"
echo ""
echo "🤖 Android in Studio öffnen:"
echo "   npm run cap:open:android"
echo "   → Build → Generate Signed Bundle → AAB → Upload zur Play Console"
echo ""
echo "🔄 Nach Code-Änderungen auf chairmatch.de:"
echo "   → KEIN Re-Build nötig! App lädt chairmatch.de live."
echo "   → Nur bei nativen Änderungen (Plugins, Icons): npm run cap:sync"
echo ""
