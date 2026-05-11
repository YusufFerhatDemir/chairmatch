import type { CapacitorConfig } from '@capacitor/cli';

/**
 * ChairMatch — Native App Configuration
 *
 * Architektur: Remote-WebView (lädt chairmatch.de live).
 * Vorteil: Updates auf chairmatch.de = Updates in der App in Sekunden,
 * kein Apple-Review-Zyklus nötig (außer bei nativen Änderungen).
 *
 * Bundle-ID: de.chairmatch.app — steht im App Store / Play Store
 * unveränderbar nach erster Submission.
 */
const config: CapacitorConfig = {
  appId: 'de.chairmatch.app',
  appName: 'ChairMatch',
  webDir: 'public', // Fallback-Assets (Icons, Manifest), Hauptinhalt kommt remote
  server: {
    url: 'https://chairmatch.de',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: [
      'chairmatch.de',
      '*.chairmatch.de',
      '*.supabase.co',
      'api.stripe.com',
      'js.stripe.com',
      'checkout.stripe.com',
      'hooks.stripe.com',
    ],
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#080706',
    scheme: 'ChairMatch',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#080706',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    overrideUserAgent: undefined,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#080706',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#c9a063',
      splashFullScreen: true,
      splashImmersive: true,
      useDialog: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080706',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
    App: {
      // Deep-Linking: chairmatch://salon/123 etc.
    },
    Haptics: {},
  },
};

export default config;
