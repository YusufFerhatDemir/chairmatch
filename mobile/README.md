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

Einmalig: `npx eas init` (verknüpft EAS-Projekt, schreibt projectId in app.json — danach
liefert `registerForPushNotifications()` echte Expo-Push-Tokens).

```bash
npx eas build --platform ios --profile production
npx eas submit --platform ios
```

Profile in `eas.json`: `development` (Simulator, Dev-Client), `preview` (interne Verteilung), `production`.

## Konfiguration

Supabase-URL/Anon-Key sind in `src/lib/supabase.ts` hinterlegt (öffentlicher Key, RLS schützt)
und via `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` überschreibbar.
Bundle-ID: `de.chairmatch.app`.
