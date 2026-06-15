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
import { getLocale } from '@/i18n/server'
import { isRTL, LOCALE_META } from '@/i18n/config'
import './globals.css'


export const dynamic = 'force-dynamic'
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
  keywords: ['Friseur buchen', 'Barbershop Termin', 'Kosmetikstudio', 'Beauty Booking', 'Stuhlvermietung', 'Salon buchen Deutschland', 'Nagelstudio', 'Massage Termin', 'Ästhetik', 'Lash Extensions', 'OP-Raum mieten', 'ChairMatch'],
  metadataBase: new URL('https://www.chairmatch.de'),
  alternates: {
    canonical: 'https://www.chairmatch.de',
    languages: {
      'de-DE': 'https://www.chairmatch.de',
      'en-US': 'https://www.chairmatch.de',
      'tr-TR': 'https://www.chairmatch.de',
      'ar-SA': 'https://www.chairmatch.de',
      'x-default': 'https://www.chairmatch.de',
    },
  },
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#080706',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const dir = isRTL(locale) ? 'rtl' : 'ltr'
  const htmlLang = LOCALE_META[locale].htmlLang
  return (
    <html lang={htmlLang} dir={dir} className={`${dmSans.variable} ${cinzel.variable}`}>
      <head>
        <ConsentModeBootstrap />
      </head>
      <body className={dmSans.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://www.chairmatch.de/#organization',
                name: 'ChairMatch',
                legalName: 'ChairMatch GmbH (i. Gr.)',
                url: 'https://www.chairmatch.de',
                logo: 'https://www.chairmatch.de/icons/chairmatch-pin-logo.png',
                description: 'Deutschlands Beauty-Booking-Plattform. Buche Termine bei Top-Salons, Barbershops & Kosmetikstudios. 0% Provision.',
                foundingDate: '2026',
                areaServed: { '@type': 'Country', name: 'Germany' },
                sameAs: ['https://www.linkedin.com/company/chairmatch', 'https://www.instagram.com/chairmatch.de'],
                contactPoint: { '@type': 'ContactPoint', email: 'legal@chairmatch.de', contactType: 'customer service', availableLanguage: ['German', 'English', 'Turkish'] },
              },
              {
                '@type': 'WebSite',
                '@id': 'https://www.chairmatch.de/#website',
                url: 'https://www.chairmatch.de',
                name: 'ChairMatch',
                publisher: { '@id': 'https://www.chairmatch.de/#organization' },
                inLanguage: 'de-DE',
                potentialAction: {
                  '@type': 'SearchAction',
                  target: { '@type': 'EntryPoint', urlTemplate: 'https://www.chairmatch.de/search?q={search_term_string}' },
                  'query-input': 'required name=search_term_string',
                },
              },
            ],
          }) }}
        />
        <DynamicTheme />
        <NetworkBanner />
        <PageReadyWatcher />
        <Providers initialLocale={locale}>
          <ErrorBoundary>
            <VisitTracker />
            <WebVitalsReporter />
            {children}
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
