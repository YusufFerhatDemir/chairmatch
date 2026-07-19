import type { NextConfig } from 'next'
import { getAllMagazinSlugs } from './src/lib/seo-data/magazin'

// Bekannte Magazin-Slugs als Regex-Alternation für redirects(). Slugs sind
// [a-z0-9-], brauchen daher kein Escaping. Nur diese Slugs dürfen 1:1 auf
// /magazin/:slug zeigen — die Magazin-Route hat dynamicParams=false, jeder
// unbekannte Slug wäre also ein Redirect→404 (Soft-Error für Google, Link-
// Signale verpuffen). Alles Unbekannte fällt stattdessen auf /magazin.
const MAGAZIN_SLUGS = getAllMagazinSlugs().join('|')

const nextConfig: NextConfig = {
  // TypeScript-Fehler blockieren den Build jetzt wieder: die einzige
  // Fehlerquelle war verwaister zustand-Provider-Code (ProviderDashboardClient
  // + Manager-Views + rentalStore), der nie gerendert wurde und entfernt ist.
  // ESLint bleibt build-tolerant — reine Warnings (unused vars etc.) sollen
  // keinen Deploy blocken, werden aber laufend abgebaut.
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
      { source: '/ratgeber', destination: '/magazin', permanent: true },
      // Bekannte Artikel-Slugs 1:1 auf den Magazin-Artikel — auch wenn sie
      // als letztes Segment einer mehrsegmentigen Alt-URL stehen (WordPress-
      // Permalinks wie /blog/2024/01/wie-funktioniert-stuhl-miete).
      { source: `/blog/:slug(${MAGAZIN_SLUGS})`, destination: '/magazin/:slug', permanent: true },
      { source: `/blog/:path*/:slug(${MAGAZIN_SLUGS})`, destination: '/magazin/:slug', permanent: true },
      { source: `/ratgeber/:slug(${MAGAZIN_SLUGS})`, destination: '/magazin/:slug', permanent: true },
      { source: `/ratgeber/:path*/:slug(${MAGAZIN_SLUGS})`, destination: '/magazin/:slug', permanent: true },
      // Alles andere unter /blog & /ratgeber (unbekannte Slugs, /blog/feed,
      // /blog/category/*, /blog/page/2, alte Sitemaps …) auf die Übersicht.
      // Vorher lief /blog/:slug generisch auf /magazin/:slug und landete für
      // jeden nicht existierenden Artikel im 404.
      { source: '/blog/:path*', destination: '/magazin', permanent: true },
      { source: '/ratgeber/:path*', destination: '/magazin', permanent: true },
      // WordPress-Feed-Reste auf Root-Ebene (bisher 404). Es gibt keinen
      // RSS-Feed — die Magazin-Übersicht ist das inhaltliche Äquivalent.
      { source: '/:feed(feed|rss|rss\\.xml|feed\\.xml|atom\\.xml|index\\.xml)', destination: '/magazin', permanent: true },
      // /ads/* existiert nicht als Route (keine Seite, kein Verweis im Code).
      // Alte Google-Ads-/Kampagnen-URLs, die noch gecrawlt werden, sollen keinen
      // 404 (und erst recht keinen 307→/auth) liefern, sondern per 308 auf die
      // Startseite zeigen — Link-Signale werden dort konsolidiert, Klicks landen
      // im Funnel statt auf einer Fehlerseite. Für ein spezifisches Ziel
      // (z.B. /premium) genügt es, destination hier anzupassen.
      { source: '/ads', destination: '/', permanent: true },
      { source: '/ads/:path*', destination: '/', permanent: true },
      // GSC-Fixes (Juli 2026): URLs, die Google crawlt, aber in den 404 laufen.
      // /products war nie eine Route (der Shop lebt unter /shop), stand aber in
      // der Sitemap. /salons, /so-funktionierts und /fuer-vermieter sind
      // Alt-Pfade aus früheren Versionen bzw. externen Links — 308 auf das
      // inhaltliche Äquivalent statt Redirect→404 (GSC: „Umleitungsfehler").
      { source: '/products', destination: '/shop', permanent: true },
      { source: '/products/:slug', destination: '/shop/:slug', permanent: true },
      { source: '/salons', destination: '/explore', permanent: true },
      { source: '/so-funktionierts', destination: '/was-ist-chairmatch', permanent: true },
      { source: '/fuer-vermieter', destination: '/vermieter/wie-es-funktioniert', permanent: true },
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
    // AVIF zuerst (kleinste Dateien), WebP als Fallback — Browser ohne
    // AVIF-Support bekommen automatisch WebP.
    formats: ['image/avif', 'image/webp'],
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
