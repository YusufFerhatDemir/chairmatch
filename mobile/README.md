# ChairMatch Mobile (iOS)

Native App für **ChairMatch — Deutschlands Marktplatz für Stuhlmiete in der Beauty-Branche**.
React Native + Expo (SDK 57), expo-router, TypeScript. Nutzt dieselbe Supabase-Instanz wie die Web-App.

## Struktur

```
src/
  app/                 expo-router Screens
    (tabs)/            Start · Suche · Profil
    inserat/[id]/      Inserat-Detail + Kontakt/Anfrage
    login.tsx          Anmelden (Supabase Auth)
    register.tsx       Registrieren (Profil via DB-Trigger)
  components/          GoldButton, Input, Chip, ListingCard, BrandHeader
  context/auth.tsx     Auth-Provider (Session, Sign-in/up/out)
  lib/
    supabase.ts        Supabase-Client (AsyncStorage-Session)
    rentals.ts         Inserate laden/filtern (rental_equipment + salons)
    anfragen.ts        Lokale Anfrage-Ablage (wie Web: cm_mietanfragen)
    notifications.ts   Push-Vorbereitung (expo-notifications)
    theme.ts           Champagne-Gold-Designsystem (aus globals.css)
```

## Lokal starten

```bash
cd mobile
npm install
npx expo start          # QR-Code mit Expo Go scannen, oder:
npx expo run:ios        # iOS-Simulator (braucht Xcode)
```

## iOS-Build (App Store / TestFlight)

**Setup-Stand (verifiziert Juli 2026):**
- ✅ `eas-cli` global installiert (v20.5.1)
- ✅ `eas.json` fertig konfiguriert: `production` (autoIncrement, Channel), `preview` (intern), `development` (Simulator); `appVersionSource: remote` — buildNumber verwaltet EAS
- ✅ `app.json` vollständig: `bundleIdentifier: de.chairmatch.app`, `version: 1.0.0`, Icon/Splash, `ITSAppUsesNonExemptEncryption: false` (kein Export-Compliance-Dialog)
- ✅ Bundle baut lokal: `npx expo export --platform ios` ohne Fehler, `expo-doctor` 20/20, `tsc` 0 Fehler
- ⏳ **Blockiert auf Account-Logins** (die einzigen manuellen Schritte):
  1. **Expo-Account**: auf [expo.dev](https://expo.dev) registrieren/einloggen → Account Settings → *Access Tokens* → Token erstellen und dem Agent geben. Damit läuft `eas init` + `eas build` non-interaktiv (`EXPO_TOKEN`).
  2. **Apple Developer** (99 $/Jahr, [developer.apple.com](https://developer.apple.com)): beim ersten `eas build` fragt EAS nach Apple-Login und legt Zertifikate/Profile automatisch an. Alternativ App-Store-Connect-API-Key (.p8) im Browser erzeugen und dem Agent geben.

Danach (macht der Agent):

```bash
EXPO_TOKEN=<token> eas init --non-interactive   # schreibt extra.eas.projectId in app.json
EXPO_TOKEN=<token> eas build --platform ios --profile production
EXPO_TOKEN=<token> eas submit --platform ios
```

Nach `eas init` liefert `registerForPushNotifications()` echte Expo-Push-Tokens.

## Konfiguration

Supabase-URL/Anon-Key sind in `src/lib/supabase.ts` hinterlegt (öffentlicher Key, RLS schützt)
und via `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` überschreibbar.
Bundle-ID: `de.chairmatch.app`.
