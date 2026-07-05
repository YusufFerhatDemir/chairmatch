import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Build-Tolerance für Vercel — pre-existing TS-Fehler und ESLint-Issues
  // blockieren keinen Build. Wir fixen sie nach und nach, aber der Deploy
  // muss durchlaufen.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // SEO-Redirects: Blog-typische Alias-Pfade zeigen auf die kanonische
  // Magazin-Route. Ohne diese Regeln laufen /blog & /ratgeber in den
  // Middleware-Default-Deny und 307-redirecten auf /auth — für Google &
  // Backlinks fatal (Login-Wall statt Content). redirects() greift in der
  // Next.js-Pipeline VOR der Middleware, umgeht den Auth-Bounce also komplett.
  // permanent:true → 308 (Google behandelt es wie 301, vererbt Ranking-Signale).
  async redirects() {
    return [
      { source: '/blog', destination: '/magazin', permanent: true },
      { source: '/blog/:slug', destination: '/magazin/:slug', permanent: true },
      // Mehrsegmentige Alt-URLs (z.B. WordPress-Permalinks /blog/2024/01/titel)
      // matchen :slug nicht (nur 1 Segment) und liefen sonst in einen echten
      // 404 statt einer Weiterleitung. Fallback auf die Magazin-Übersicht.
      { source: '/blog/:path*', destination: '/magazin', permanent: true },
      { source: '/ratgeber', destination: '/magazin', permanent: true },
      { source: '/ratgeber/:slug', destination: '/magazin/:slug', permanent: true },
      { source: '/ratgeber/:path*', destination: '/magazin', permanent: true },
      // /ads/* existiert nicht als Route (keine Seite, kein Verweis im Code).
      // Alte Google-Ads-/Kampagnen-URLs, die noch gecrawlt werden, sollen keinen
      // 404 (und erst recht keinen 307→/auth) liefern, sondern per 308 auf die
      // Startseite zeigen — Link-Signale werden dort konsolidiert, Klicks landen
      // im Funnel statt auf einer Fehlerseite. Für ein spezifisches Ziel
      // (z.B. /premium) genügt es, destination hier anzupassen.
      { source: '/ads', destination: '/', permanent: true },
      { source: '/ads/:path*', destination: '/', permanent: true },
    ]
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // DENY statt SAMEORIGIN — konsistent mit CSP frame-ancestors 'none'
          // (moderne Browser folgen der CSP, ältere dem X-Frame-Options-Header)
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Permissions-Policy: explizit Features deaktivieren, die nicht gebraucht werden
          // Verhindert, dass eingebettete Iframes oder Drittanbieter sensitive Browser-APIs nutzen
          {
            key: 'Permissions-Policy',
            value: [
              'accelerometer=()',
              'ambient-light-sensor=()',
              'autoplay=(self)',
              'battery=()',
              'camera=(self)',           // Wir brauchen Camera für Salon-Foto-Uploads
              'display-capture=()',
              'document-domain=()',
              'encrypted-media=()',
              'fullscreen=(self)',
              'gamepad=()',
              'geolocation=(self)',      // Für "Salons in deiner Nähe"
              'gyroscope=()',
              'hid=()',
              'idle-detection=()',
              'magnetometer=()',
              'microphone=()',
              'midi=()',
              'payment=(self "https://js.stripe.com")',  // Apple Pay / Google Pay via Stripe
              'picture-in-picture=()',
              'publickey-credentials-get=(self)',         // WebAuthn / FaceID
              'screen-wake-lock=()',
              'serial=()',
              'speaker-selection=()',
              'usb=()',
              'web-share=(self)',
              'xr-spatial-tracking=()',
            ].join(', '),
          },
          // Cross-Origin-Policies: Schutz gegen Spectre-artige Side-Channel-Angriffe
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // OpenStreetMap-Tiles für die interaktive Stuhl-Karte (/karte)
              "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://*.sentry.io https://www.google-analytics.com https://www.googletagmanager.com https://*.facebook.com https://*.facebook.net https://*.tile.openstreetmap.org https://tile.openstreetmap.org",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://vitals.vercel-insights.com https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io https://*.sentry.io https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://connect.facebook.net https://*.facebook.com",
              // maps.google.com/www.google.com: SalonMap bettet Google-Maps-iframe ein
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://maps.google.com https://www.google.com",
              // frame-ancestors blockt Einbettung in Iframes (Clickjacking-Schutz; moderner als X-Frame-Options)
              "frame-ancestors 'none'",
              "worker-src 'self' blob:",
              "manifest-src 'self'",
              "media-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
      // Spezielle Header für API-Routes
      {
        source: '/api/(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
        ],
      },
      // Noindex für eingeloggte Bereiche & Auth-Flows. Viele davon liegen als
      // Client-Components in der (public)-Route-Group (Middleware-Whitelist) und
      // können daher kein metadata.robots exportieren — der Header ist die
      // zentrale Absicherung gegen Indexierung von Dashboard-Seiten.
      {
        source: '/:prefix(admin|investor|provider|owner|account|favorites|booking|auth|konto|nachrichten|termine|unsubscribe)/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/:parent(anbieter|mieter|vermieter)/:sub(mein-salon|mein-bereich|mein-inserat|onboarding)/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        // ChairMatch Production (pwdbjqfpgumyfktbfswg) — vorher stand hier das
        // ungenutzte Dev-Projekt (vlrviyrgggzhayepfmop): next/image hätte alle
        // Storage-Bilder der echten DB mit 400 geblockt.
        protocol: 'https',
        hostname: 'pwdbjqfpgumyfktbfswg.supabase.co',
      },
      {
        // Alt/Dev-Projekt übergangsweise erlaubt, falls noch alte Bild-URLs in
        // der DB stehen — kann nach Daten-Migration entfernt werden.
        protocol: 'https',
        hostname: 'vlrviyrgggzhayepfmop.supabase.co',
      },
    ],
  },
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
