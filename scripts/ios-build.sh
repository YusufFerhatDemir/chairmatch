#!/usr/bin/env bash
# =============================================================================
# ChairMatch — iOS Build (Capacitor, Remote-WebView)
#
# Einfachster Weg der funktioniert. Kein EAS, kein Expo — reines Capacitor+Xcode.
# yusuf braucht das NIE manuell: läuft lokal auf dem Mac ODER in GitHub Actions.
#
# Modi:
#   ./scripts/ios-build.sh verify    # Simulator-Build, KEINE Signatur nötig
#                                     #  -> beweist, dass das Projekt sauber baut
#   ./scripts/ios-build.sh archive   # signiertes .xcarchive (braucht APPLE_TEAM_ID)
#   ./scripts/ios-build.sh ipa       # archive + IPA-Export nach build/ios/
#   ./scripts/ios-build.sh upload    # ipa + Upload zu TestFlight (App Store Connect API-Key)
#
# Nötige Env-Variablen für signierte Builds (aus Apple Developer Account):
#   APPLE_TEAM_ID          10-stellige Team ID (z.B. AB12CD34EF)
# Nur für 'upload':
#   ASC_KEY_ID             App Store Connect API Key ID
#   ASC_ISSUER_ID          App Store Connect Issuer ID
#   ASC_KEY_P8_PATH        Pfad zur AuthKey_XXXX.p8 (oder ASC_KEY_P8_BASE64 in CI)
# =============================================================================
set -euo pipefail

MODE="${1:-verify}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT/ios/App"
WORKSPACE="$IOS_DIR/App.xcworkspace"
SCHEME="App"
CONFIG="Release"
BUILD_DIR="$ROOT/build/ios"
ARCHIVE_PATH="$BUILD_DIR/App.xcarchive"
EXPORT_DIR="$BUILD_DIR/export"

echo "→ ChairMatch iOS-Build — Modus: $MODE"
cd "$ROOT"

# --- 1. Web-Assets & native Projekt synchronisieren -------------------------
# Remote-WebView: kein 'next build' nötig, webDir=public reicht als Fallback.
echo "→ npx cap sync ios..."
npx cap sync ios

# --- 2. CocoaPods installieren ----------------------------------------------
echo "→ pod install..."
( cd "$IOS_DIR" && pod install )

# --- 3. Build je nach Modus -------------------------------------------------
case "$MODE" in
  verify)
    # Simulator-Build: keine Signatur, keine Team-ID nötig. Perfekt als CI-Gate.
    echo "→ xcodebuild (Simulator, unsigned) — verifiziert nur die Baubarkeit..."
    xcodebuild \
      -workspace "$WORKSPACE" \
      -scheme "$SCHEME" \
      -configuration "$CONFIG" \
      -sdk iphonesimulator \
      -destination 'generic/platform=iOS Simulator' \
      CODE_SIGNING_ALLOWED=NO \
      build
    echo "✓ Build erfolgreich — Projekt baut sauber (unsigned)."
    ;;

  archive|ipa|upload)
    : "${APPLE_TEAM_ID:?APPLE_TEAM_ID muss gesetzt sein (Apple Developer Team ID) für '$MODE'}"

    echo "→ Archiv erstellen (signiert, Team $APPLE_TEAM_ID)..."
    mkdir -p "$BUILD_DIR"
    xcodebuild \
      -workspace "$WORKSPACE" \
      -scheme "$SCHEME" \
      -configuration "$CONFIG" \
      -sdk iphoneos \
      -destination 'generic/platform=iOS' \
      -archivePath "$ARCHIVE_PATH" \
      DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
      CODE_SIGN_STYLE=Automatic \
      -allowProvisioningUpdates \
      archive
    echo "✓ Archiv: $ARCHIVE_PATH"
    [ "$MODE" = "archive" ] && exit 0

    # ExportOptions.plist mit echter Team-ID rendern (Template bleibt unberührt).
    RENDERED_OPTS="$BUILD_DIR/ExportOptions.rendered.plist"
    sed "s/__TEAM_ID__/$APPLE_TEAM_ID/" "$IOS_DIR/ExportOptions.plist" > "$RENDERED_OPTS"

    echo "→ IPA exportieren..."
    xcodebuild \
      -exportArchive \
      -archivePath "$ARCHIVE_PATH" \
      -exportOptionsPlist "$RENDERED_OPTS" \
      -exportPath "$EXPORT_DIR" \
      -allowProvisioningUpdates
    IPA="$(ls "$EXPORT_DIR"/*.ipa 2>/dev/null | head -1)"
    echo "✓ IPA: $IPA"
    [ "$MODE" = "ipa" ] && exit 0

    # --- Upload zu TestFlight via App Store Connect API-Key -----------------
    : "${ASC_KEY_ID:?ASC_KEY_ID nötig für upload}"
    : "${ASC_ISSUER_ID:?ASC_ISSUER_ID nötig für upload}"

    # In CI kommt der .p8-Key base64-kodiert als Secret; lokal als Datei-Pfad.
    if [ -n "${ASC_KEY_P8_BASE64:-}" ]; then
      KEY_PATH="$BUILD_DIR/AuthKey_${ASC_KEY_ID}.p8"
      echo "$ASC_KEY_P8_BASE64" | base64 --decode > "$KEY_PATH"
    else
      KEY_PATH="${ASC_KEY_P8_PATH:?ASC_KEY_P8_PATH oder ASC_KEY_P8_BASE64 nötig}"
    fi

    echo "→ Upload zu TestFlight..."
    xcrun altool --upload-app -f "$IPA" -t ios \
      --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
    echo "✓ Upload gestartet — erscheint in ~5-15 Min in TestFlight."
    ;;

  *)
    echo "Unbekannter Modus: $MODE (erlaubt: verify | archive | ipa | upload)" >&2
    exit 1
    ;;
esac
