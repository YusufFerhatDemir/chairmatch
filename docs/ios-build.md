# iOS-Build — ChairMatch (Capacitor, NICHT Expo)

ChairMatch ist eine **Capacitor Remote-WebView**-App: das native iOS-Shell lädt
`https://chairmatch.de` live. Deshalb ist der einfachste Build-Weg **nicht EAS/Expo**,
sondern **Capacitor + Xcode** direkt.

- Xcode-Projekt: `ios/App/App.xcworkspace` (immer das **`.xcworkspace`** öffnen, nicht `.xcodeproj` — wegen CocoaPods)
- Bundle-ID: `de.chairmatch.app`
- Scheme: `App` (shared, in CI nutzbar)
- Version: `MARKETING_VERSION` = 1.0, `CURRENT_PROJECT_VERSION` = 1 (in `ios/App/App.xcodeproj/project.pbxproj`)

---

## TL;DR

```bash
# 1. Baut das Projekt sauber? (keine Apple-Signatur nötig)
npm run ios:verify

# 2. Signiertes IPA lokal bauen (braucht Apple Team ID)
export APPLE_TEAM_ID=AB12CD34EF
npm run ios:ipa

# 3. Direkt nach TestFlight hochladen
export APPLE_TEAM_ID=AB12CD34EF ASC_KEY_ID=... ASC_ISSUER_ID=... ASC_KEY_P8_PATH=~/keys/AuthKey_XXXX.p8
npm run ios:upload
```

Alles läuft über `scripts/ios-build.sh` (Modi: `verify` | `archive` | `ipa` | `upload`).

---

## Konfigurationsstand des Xcode-Projekts

| Punkt | Status |
|---|---|
| Bundle-ID `de.chairmatch.app` | ✅ gesetzt (Debug + Release) |
| Signing-Style | ✅ `Automatic` |
| Shared Scheme `App` | ✅ vorhanden (`ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`) |
| ExportOptions | ✅ Template `ios/App/ExportOptions.plist` (Team-ID zur Build-Zeit injiziert) |
| **`DEVELOPMENT_TEAM`** | ⚠️ **bewusst leer** — kommt per `APPLE_TEAM_ID` aus Env/Secret, kein Hardcoding |
| Push-Notifications | ⚠️ Plugin konfiguriert, aber noch keine `.entitlements` + Capability. Erst nötig, wenn Push aktiv wird (siehe unten). |

> Das Fehlen von `DEVELOPMENT_TEAM` im `project.pbxproj` ist **Absicht**: die Team-ID ist
> account-spezifisch und wird nicht ins Repo eingecheckt. `xcodebuild` bekommt sie über
> `DEVELOPMENT_TEAM=$APPLE_TEAM_ID` auf der Kommandozeile.

---

## Voraussetzungen (einmalig, im Apple Developer Account)

Diese Klick-Schritte macht **yusuf** (externe Logins — siehe CLAUDE.md):

1. **Apple Developer Program** ($99/Jahr) aktiv.
2. **Team ID** notieren: developer.apple.com → Membership → *Team ID* (10 Zeichen) → `APPLE_TEAM_ID`.
3. **App Store Connect API-Key** (für Upload ohne Passwort/2FA):
   App Store Connect → Users and Access → Integrations → App Store Connect API →
   Key erzeugen (Rolle *App Manager*). Notieren: **Key ID** (`ASC_KEY_ID`), **Issuer ID**
   (`ASC_ISSUER_ID`), und die **`AuthKey_XXXX.p8`**-Datei herunterladen (nur einmal möglich!).
4. **App-Eintrag** in App Store Connect mit Bundle-ID `de.chairmatch.app` anlegen.

Für **CI (GitHub Actions)** zusätzlich ein Distribution-Zertifikat als `.p12`:
Xcode → Settings → Accounts → Manage Certificates → *Apple Distribution* exportieren (mit Passwort).

---

## Lokaler Build (Mac)

`scripts/ios-build.sh` erledigt `cap sync` + `pod install` + `xcodebuild` automatisch.

| Modus | Was passiert | Braucht |
|---|---|---|
| `verify` | Simulator-Build, **unsigniert** — prüft nur Baubarkeit | nichts |
| `archive` | signiertes `build/ios/App.xcarchive` | `APPLE_TEAM_ID` |
| `ipa` | `archive` + IPA nach `build/ios/export/` | `APPLE_TEAM_ID` |
| `upload` | `ipa` + Upload zu TestFlight | `APPLE_TEAM_ID` + ASC-Key |

```bash
export APPLE_TEAM_ID=AB12CD34EF
export ASC_KEY_ID=ABC123DEFG
export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
export ASC_KEY_P8_PATH="$HOME/keys/AuthKey_ABC123DEFG.p8"
npm run ios:upload
```

---

## CI-Build (GitHub Actions)

Workflow: `.github/workflows/ios-build.yml` (Runner: `macos-14`).

- **Bei jedem Push/PR auf `ios/**`**: unsignierter Build als Gate — **braucht keine Secrets**.
- **Bei Tag `ios-v*`** oder manuellem Start (`workflow_dispatch`): signierter Build + TestFlight-Upload,
  aktiviert sich automatisch, sobald die Secrets vorhanden sind.

Release auslösen:
```bash
git tag ios-v1.0.0 && git push origin ios-v1.0.0
```

### Nötige Repository-Secrets (GitHub → Settings → Secrets and variables → Actions)

| Secret | Herkunft |
|---|---|
| `APPLE_TEAM_ID` | Membership → Team ID |
| `ASC_KEY_ID` | App Store Connect API Key ID |
| `ASC_ISSUER_ID` | App Store Connect Issuer ID |
| `ASC_KEY_P8_BASE64` | `base64 -i AuthKey_XXXX.p8 \| pbcopy` |
| `IOS_DIST_CERT_P12_BASE64` | `base64 -i dist.p12 \| pbcopy` |
| `IOS_DIST_CERT_PASSWORD` | Passwort des `.p12`-Exports |

Ohne diese Secrets läuft weiterhin der unsignierte Gate-Build — CI bleibt grün und nützlich.

---

## Version erhöhen (vor jedem Store-Release)

In `ios/App/App.xcodeproj/project.pbxproj` (beide Configs, Debug + Release):

- `MARKETING_VERSION` → sichtbare Version (z.B. `1.1`)
- `CURRENT_PROJECT_VERSION` → Build-Nummer, **muss pro Upload steigen** (z.B. `2`)

---

## Push-Notifications aktivieren (später)

Das Capacitor-`PushNotifications`-Plugin ist konfiguriert, aber die native Capability fehlt noch.
Wenn Push live gehen soll:

1. In Xcode → Target `App` → *Signing & Capabilities* → **+ Push Notifications**.
2. Das erzeugt `ios/App/App/App.entitlements` mit `aps-environment`. Committen.
3. In der Apple Developer Console die Push-Capability für `de.chairmatch.app` aktivieren.

Bis dahin baut die App problemlos — Push ist nur zur Laufzeit inaktiv.

---

## Troubleshooting

- **CocoaPods-Fehler bei Pfad mit Leerzeichen** → siehe `docs/capacitor-cocoapods-fix.md`.
  Aktueller Repo-Pfad (`/Users/work/chairmatch`) hat keine Spaces, also i.d.R. kein Problem.
- **`scheme "App" not found`** → das shared Scheme fehlt. Es liegt jetzt im Repo; bei Verlust
  in Xcode: *Product → Scheme → Manage Schemes → App → Shared* anhaken.
- **`No profiles for 'de.chairmatch.app'`** → `-allowProvisioningUpdates` + gültiger ASC-Key/Team-ID.
