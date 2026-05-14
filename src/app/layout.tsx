import type { Metadata, Viewport } from 'next'
import { DM_Sans, Cinzel } from 'next/font/google'
import { Providers } from './providers'
import DynamicTheme from '@/components/DynamicTheme'
import BottomNav from '@/components/BottomNav'
import ConsentBanner from '@/components/ConsentBanner'
import VisitTracker from '@/components/VisitTracker'
import ChatWidget from '@/components/ChatWidget'
import FloatingLanguageSwitcher from '@/components/FloatingLanguageSwitcher'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import NetworkBanner from '@/components/NetworkBanner'
import PageReadyWatcher from '@/components/PageReadyWatcher'
import { getLocale } from '@/i18n/server'
import { isRTL, LOCALE_META } from '@/i18n/config'
import { organizationSchema, websiteSchema } from '@/lib/seo'
import './globals.css'

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
  metadataBase: new URL('https://chairmatch.de'),
  alternates: {
    canonical: 'https://chairmatch.de',
    languages: { 'de-DE': 'https://chairmatch.de' },
  },
  openGraph: {
    title: 'ChairMatch — Beauty Booking Deutschland',
    description: 'Buche Termine bei Top-Salons, Barbershops & Kosmetikstudios in ganz Deutschland. 0% Provision.',
    url: 'https://chairmatch.de',
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
  verification: {},
  category: 'beauty',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // A11y-Fix: Pinch-Zoom ERLAUBT — Apple/Google Store-Review verlangt das,
  // sonst werden Apps mit "Accessibility Concern" abgelehnt.
  // Max 5x reicht für sehbeeinträchtigte User.
  maximumScale: 5,
  userScalable: true,
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
      <body className={dmSans.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [organizationSchema(), websiteSchema()],
          }) }}
        />
        <DynamicTheme />
        <NetworkBanner />
        <PageReadyWatcher />
        <Providers initialLocale={locale}>
          <ErrorBoundary>
            <VisitTracker />
            {children}
            <BottomNav />
            <ChatWidget />
            <FloatingLanguageSwitcher />
            <ConsentBanner />
          </ErrorBoundary>
        </Providers>
        <script dangerouslySetInnerHTML={{ __html: `
          /* Service Worker v2 — Production-Ready.
             - Registriert sw.js
             - Erkennt neue Versionen und reloaded sanft beim nächsten Visit
             - Falls eine alte v1-Registrierung mit anderem scope/url existiert,
               wird sie unregistered (keine Konflikte)
             - Bei window.__CM_SW_DISABLE__ (Debug) keine Registrierung */
          if ('serviceWorker' in navigator && !window.__CM_SW_DISABLE__) {
            window.addEventListener('load', function() {
              // Alte Self-Destruct- oder Pre-v2-Worker raus
              navigator.serviceWorker.getRegistrations().then(function(regs) {
                regs.forEach(function(r) {
                  if (r.active && r.active.scriptURL && !r.active.scriptURL.endsWith('/sw.js')) {
                    r.unregister().catch(function() {});
                  }
                });
              }).catch(function() {});

              navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(function(reg) {
                  // Auto-Update Check alle 30 Min wenn Tab offen
                  setInterval(function() { reg.update().catch(function() {}); }, 30 * 60 * 1000);

                  // Wenn ein neuer SW installiert ist, beim nächsten Reload aktivieren
                  reg.addEventListener('updatefound', function() {
                    var nw = reg.installing;
                    if (!nw) return;
                    nw.addEventListener('statechange', function() {
                      if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                        // Neue Version verfügbar — sanft beim nächsten Navigieren übernehmen
                        nw.postMessage({ type: 'SKIP_WAITING' });
                      }
                    });
                  });
                })
                .catch(function() { /* SW-Registration silently failt — kein Console-Spam in Prod */ });

              // Wenn der neue SW die Kontrolle übernimmt, einmalig refreshen
              var refreshing = false;
              navigator.serviceWorker.addEventListener('controllerchange', function() {
                if (refreshing) return;
                refreshing = true;
                window.location.reload();
              });
            });
          }
        ` }} />
      </body>
    </html>
  )
}
