import type { Metadata, Viewport } from 'next'
import { DM_Sans, Cinzel } from 'next/font/google'
import { Providers } from './providers'
import DynamicTheme from '@/components/DynamicTheme'
import ConsentBanner from '@/components/ConsentBanner'
import VisitTracker from '@/components/VisitTracker'
import ConsentModeBootstrap from '@/components/analytics/ConsentModeBootstrap'
import GA4 from '@/components/analytics/GA4'
import MetaPixel from '@/components/analytics/MetaPixel'
import WebVitalsReporter from '@/components/analytics/WebVitalsReporter'
import ChatWidget from '@/components/ChatWidget'
import FloatingLanguageSwitcher from '@/components/FloatingLanguageSwitcher'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import NetworkBanner from '@/components/NetworkBanner'
import PageReadyWatcher from '@/components/PageReadyWatcher'
import { organizationSchema, websiteSchema } from '@/lib/seo'
import './globals.css'


// KEIN force-dynamic und KEIN cookies()-Zugriff im Root-Layout: beides würde
// ISR/Static-Rendering für ALLE Routen deaktivieren (TTFB ~5s statt Edge-Cache).
// Locale: SSR rendert Deutsch (SEO-Sprache); I18nProvider liest das Cookie
// beim Mount client-seitig und korrigiert <html lang/dir> + Texte.
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
})


export const metadata: Metadata = {
  title: {
    default: 'ChairMatch — Dein Beauty-Partner in ganz Deutschland',
    template: '%s | ChairMatch',
  },
  description: 'Buche Termine bei Top-Salons, Barbershops, Friseuren & Kosmetikstudios in ganz Deutschland. 0% Provision. Stuhlvermietung, OP-Raum mieten, Angebote entdecken.',
  keywords: ['Friseur buchen', 'Barbershop Termin', 'Kosmetikstudio', 'Beauty Booking', 'Stuhlvermietung', 'Stuhlvermietung Beauty', 'Stuhl mieten Friseur', 'Stuhlvermietung Kosmetik Frankfurt', 'Salon buchen Deutschland', 'Nagelstudio', 'Massage Termin', 'Ästhetik', 'Lash Extensions', 'OP-Raum mieten', 'ChairMatch'],
  metadataBase: new URL('https://www.chairmatch.de'),
  // Kein hreflang: Sprache wird per Cookie umgeschaltet, es gibt keine
  // locale-spezifischen URLs — identische hreflang-Ziele wären ein
  // fehlerhaftes Signal für Google.
  // KEIN layout-weites alternates.canonical: Next.js vererbt Metadata an alle
  // Pages ohne eigenes alternates — die würden dann die Homepage als Canonical
  // deklarieren (Deindex-Risiko). Jede Page setzt ihr Canonical selbst.
  openGraph: {
    title: 'ChairMatch — Beauty Booking Deutschland',
    description: 'Buche Termine bei Top-Salons, Barbershops & Kosmetikstudios in ganz Deutschland. 0% Provision.',
    url: 'https://www.chairmatch.de',
    siteName: 'ChairMatch',
    locale: 'de_DE',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChairMatch — Beauty Booking Deutschland' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChairMatch — Beauty Booking Deutschland',
    description: 'Buche Termine bei Top-Salons, Barbershops & Kosmetikstudios. 0% Provision.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon-32.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ChairMatch',
    startupImage: '/icon-512.png',
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  verification: { google: "x1kL07ajESTjwOc_fqJDAgON2FkFqbCLB3owYNF5fmI" },
  category: 'beauty',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zoom NICHT blockieren — WCAG 1.4.4 (Text-Resize bis 200%); iOS ignoriert
  // user-scalable=no ohnehin seit iOS 10, Android-User brauchen den Zoom.
  viewportFit: 'cover',
  themeColor: '#080706',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" dir="ltr" className={`${dmSans.variable} ${cinzel.variable}`}>
      <head>
        <ConsentModeBootstrap />
      </head>
      <body className={dmSans.className}>
        <a href="#main" className="skip-link">Zum Inhalt springen</a>
        {/* Organization + WebSite aus lib/seo.ts — dort ist die vollständige
            (Brand, Slogan, Founder, knowsAbout) Single-Source-of-Truth. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema()) }}
        />
        <DynamicTheme />
        <NetworkBanner />
        <PageReadyWatcher />
        <Providers>
          <ErrorBoundary>
            <VisitTracker />
            <WebVitalsReporter />
            <main id="main">{children}</main>
            <ChatWidget />
            <FloatingLanguageSwitcher />
            <ConsentBanner />
          </ErrorBoundary>
        </Providers>
        <GA4 />
        <MetaPixel />
        <script dangerouslySetInnerHTML={{ __html: `
          /* SERVICE WORKER KILL-SWITCH
             Ehemals registrierte SWs werden deinstalliert + alle Caches geleert.
             So lange der Cache-Stress eingependelt ist, KEIN SW. Bei Bedarf
             später wieder aktivieren (Offline-Modus etc.). */
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
              regs.forEach(r => r.unregister().catch(() => {}));
            }).catch(() => {});
            if (typeof caches !== 'undefined') {
              caches.keys().then(keys => {
                keys.forEach(k => caches.delete(k).catch(() => {}));
              }).catch(() => {});
            }
          }
        ` }} />
      </body>
    </html>
  )
}
