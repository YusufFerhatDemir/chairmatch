# Capacitor iOS-Build: CocoaPods-Pfad-Issue

## Problem

Beim Versuch `npx cap sync ios` oder `npx cap open ios` zu laufen, schlägt CocoaPods mit einem Encoding-Error fehl. Ursache: der Projekt-Pfad enthält ein Leerzeichen (`/Users/work/Chairmatch v1/...`). CocoaPods (Ruby-basiert) verarbeitet Pfade mit Spaces in einigen Fällen nicht korrekt.

## Workaround (sofort einsetzbar)

### Option A — Symlink ohne Spaces

```bash
# Einmalig: Symlink auf einen Pfad ohne Spaces anlegen
ln -s "/Users/work/Chairmatch v1/chairmatch" /Users/work/chairmatch-app

# Ab jetzt aus dem Symlink-Pfad arbeiten:
cd /Users/work/chairmatch-app
npx cap sync ios
npx cap open ios
```

Der Symlink ist transparent für Xcode und Capacitor. Beide arbeiten auf den dahinterliegenden Files. Vorteil: keine Daten-Migration nötig.

### Option B — Repo-Folder umbenennen

Wenn du den Symlink nicht magst:

```bash
mv "/Users/work/Chairmatch v1" /Users/work/chairmatch
cd /Users/work/chairmatch/chairmatch
```

Achtung: `cowork` zeigt dann auf einen nicht-existierenden Pfad und müsste neu konfiguriert werden. Symlink (Option A) ist deshalb risikoärmer.

## Permanente Lösung (für später)

Capacitor 7 (in Beta seit Q2 2026) löst das Problem nativ — der CocoaPods-Wrapper escaped Pfade korrekt. Update sobald 7.0 stable ist:

```bash
npm install @capacitor/core@7 @capacitor/cli@7 @capacitor/ios@7 @capacitor/android@7
npx cap sync
```

## Warum nicht jetzt?

Für die aktuelle Phase ist das **kein Blocker für den Launch**:

1. **Web-App live**: chairmatch.de läuft, PWA-Installation funktioniert (Add-to-Homescreen iOS+Android)
2. **Capacitor-App-Hülle**: technisch konfiguriert (capacitor.config.ts ist sauber), Bundle-IDs reserviert
3. **App-Store-Submission**: kommt nach Apple Developer Account + UG-Registrierung — beides sowieso noch ausstehend

Die App-Store-Submission ist in Task #17 dokumentiert und braucht:
- ✅ Apple Developer Account ($99/year) — wartet auf UG
- ✅ Google Play Developer Account ($25 once) — wartet auf UG
- ✅ App-Icon-Set + Screenshots — kann ich parallel vorbereiten
- ✅ Privacy Policy URL (chairmatch.de/datenschutz — vorhanden)

## Test-Sequenz wenn der Workaround eingesetzt wird

```bash
cd /Users/work/chairmatch-app  # Symlink

# 1. Dependencies prüfen
node --version  # >= 18
xcodebuild -version
pod --version

# 2. Sync
npx cap sync ios

# 3. Open Xcode
npx cap open ios

# 4. In Xcode:
# - Signing → Team auswählen (Yusufs Apple-Developer-Team-ID)
# - Bundle-ID: de.chairmatch.app
# - Build → Run on Simulator

# 5. Erste TestFlight-Submission
# Archive → Distribute → App Store Connect → TestFlight
```

## Bundle-IDs (reserviert in capacitor.config.ts)

- iOS: `de.chairmatch.app`
- Android: `de.chairmatch.app`

⚠️ Nach erster Store-Submission unveränderbar.
