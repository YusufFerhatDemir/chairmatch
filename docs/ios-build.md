# iOS-Build — ChairMatch (Expo/EAS)

ChairMatch ist eine **native Expo-App** (Expo SDK 57, React Native, expo-router) im
Verzeichnis `mobile/`. Gebaut wird **in der EAS-Cloud** — lokal ist weder Xcode noch
CocoaPods nötig. Die frühere Capacitor-Variante (`ios/`, `android/`, `capacitor.config.ts`)
wurde am 2026-07-04 vollständig entfernt; diese Anleitung ersetzt die alte Capacitor-Doku.

- App-Code: `mobile/` (Expo SDK 57, expo-router)
- Bundle-ID: `de.chairmatch.app` (im Apple Developer Portal registriert, Team `J6H5J2XVL7`)
- EAS-Projekt: `yusufferhatdemirs-team/chairmatch` (projectId `18d077a8-c1f5-4c1a-bdd0-6e9e416a4ac4`)
- Provisioning-Profil: gültig bis **2027-07-02**
- Deep Links: Expo Linking, Scheme `chairmatch` (in `mobile/app.json`)

---

## TL;DR

```bash
# 1. Production-Build in der EAS-Cloud (vom Repo-Root)
npm run ios:build

# 2. Letzten Build nach TestFlight schicken
npm run ios:submit
```

Beide Skripte wrappen `eas-cli` via `npx` — es muss nichts global installiert sein.

---

## Voraussetzungen

Lokal ist **nichts** einzurichten:

| Punkt | Status |
|---|---|
| `eas-cli` | läuft via `npx`, keine globale Installation nötig |
| Xcode / CocoaPods | **nicht nötig** — Build passiert in der EAS-Cloud |
| Signatur-Credentials | ✅ `mobile/credentials.json` (lokal, gitignored) mit `dist.p12` + `profile.mobileprovision` — `credentialsSource: "local"` in `eas.json` |
| ASC-API-Key für Submit | ✅ in `mobile/eas.json` unter `submit.production.ios` konfiguriert (verweist auf lokale `.p8`-Datei) |
| Versionsverwaltung | `appVersionSource: "remote"` + `autoIncrement` — die buildNumber zählt EAS automatisch hoch |

> `mobile/credentials.json` und die Zertifikatsdateien sind bewusst **nicht** im Repo
> (siehe `mobile/.gitignore`). Bei Verlust lassen sie sich über das Apple Developer
> Portal bzw. `npx eas-cli credentials` neu erzeugen.

---

## Build (EAS Cloud)

```bash
# Vom Repo-Root (empfohlen):
npm run ios:build

# Oder direkt:
cd mobile && npx eas-cli build --platform ios --profile production
```

- Profil `production` (in `mobile/eas.json`): `autoIncrement`, Channel `production`, lokale Credentials.
- Weitere Profile: `development` (Simulator, Dev-Client) und `preview` (internal distribution).
- Build-Status und Artefakte: [expo.dev](https://expo.dev) → Projekt `chairmatch`.

**Icons & Splash** müssen nicht manuell gepflegt werden: Quelle ist `mobile/app.json`
(Icon-Pfade + `expo-splash-screen`-Plugin), Expo/EAS generiert daraus alle Größen automatisch.

---

## Submit (TestFlight)

```bash
# Vom Repo-Root — nimmt automatisch den letzten fertigen Build (--latest):
npm run ios:submit

# Oder direkt:
cd mobile && npx eas-cli submit --platform ios --profile production --latest
```

Der Upload läuft über den **ASC-API-Key** aus `mobile/eas.json` (`submit.production.ios`) —
kein Apple-ID-Login, kein 2FA nötig.

**Wichtig:** Sobald der App-Eintrag in App Store Connect existiert (siehe Status unten),
sollte die zugehörige **`ascAppId`** in `mobile/eas.json` unter `submit.production.ios`
eingetragen werden, damit der Submit die App eindeutig zuordnen kann.

---

## Status (Stand 2026-07-04)

| Punkt | Status |
|---|---|
| Erster Production-Build | ✅ **`ac481b48`** erfolgreich (Version 1.0.0, buildNumber 3, 2026-07-04) |
| Bundle-ID + Profil | ✅ registriert, Profil gültig bis 2027-07-02 |
| Submit-Konfiguration | ✅ ASC-API-Key in `eas.json` hinterlegt |
| **App-Eintrag in App Store Connect** | ⚠️ **fehlt noch** — einzige offene manuelle Aktion |

### Einmalige manuelle Aktion (yusuf, externes Login)

Auf [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → *Meine Apps* → *+ Neue App*:

- **Name:** ChairMatch
- **Bundle-ID:** `de.chairmatch.app`
- **Sprache:** Deutsch
- **SKU:** `chairmatch-de-app`

Danach `ascAppId` in `mobile/eas.json` nachtragen — ab dann läuft `npm run ios:submit`
komplett ohne weitere Klicks.

---

## Android (später)

Android läuft ebenfalls über EAS — das Package `de.chairmatch.app` ist in
`mobile/app.json` bereits konfiguriert (inkl. Adaptive Icon). Es fehlt nur der
Google-Play-Teil (Konto, Signing, Submit-Profil), wenn es soweit ist.

---

## Analytics (nativ)

Falls native Analytics dazukommen: **Expo-kompatible Pakete** nutzen
(z.B. `react-native-firebase` oder `expo-insights`) — **nicht** `@capacitor-firebase`,
das gehörte zum entfernten Capacitor-Setup.

---

## Troubleshooting

```bash
cd mobile

# Projekt-Gesundheitscheck (Konfiguration, Dependencies, bekannte Probleme):
npx expo-doctor

# Dependency-Versionen gegen das SDK abgleichen und ggf. fixen:
npx expo install --check
```

- **Build schlägt in der Cloud fehl** → Build-Log auf expo.dev öffnen; meist Dependency-Mismatch, den `npx expo install --check` findet.
- **Credentials-Fehler** → prüfen, ob `mobile/credentials.json` vorhanden ist und auf existierende `dist.p12`/`profile.mobileprovision`-Dateien zeigt.
- **Submit-Fehler „App nicht gefunden“** → App-Eintrag in App Store Connect fehlt noch bzw. `ascAppId` ist nicht in `eas.json` eingetragen (siehe Status).
