import type { Metadata, Viewport } from 'next'
import { DM_Sans, Cinzel, Cormorant_Garamond } from 'next/font/google'
import { Providers } from './providers'
import DynamicTheme from '@/components/DynamicTheme'
import BottomNav from '@/components/BottomNav'
import ConsentBanner from '@/components/ConsentBanner'
import VisitTracker from '@/components/VisitTracker'
import ChatWidget from '@/components/ChatWidget'
import { ErrorBoundary } from '@/components/ErrorBoundary'
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

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
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
    icon: '/icon.svg',
    apple: '/icon-180.png',
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#080706',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className={`${dmSans.variable} ${cinzel.variable} ${cormorant.variable}`}>
      <body className={dmSans.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://chairmatch.de/#organization',
                name: 'ChairMatch',
                legalName: 'ChairMatch GmbH (i. Gr.)',
                url: 'https://chairmatch.de',
                logo: 'https://chairmatch.de/icons/chairmatch-pin-logo.png',
                description: 'Deutschlands Beauty-Booking-Plattform. Buche Termine bei Top-Salons, Barbershops & Kosmetikstudios. 0% Provision.',
                foundingDate: '2026',
                areaServed: { '@type': 'Country', name: 'Germany' },
                sameAs: [],
                contactPoint: { '@type': 'ContactPoint', email: 'legal@chairmatch.de', contactType: 'customer service', availableLanguage: ['German', 'English', 'Turkish'] },
              },
              {
                '@type': 'WebSite',
                '@id': 'https://chairmatch.de/#website',
                url: 'https://chairmatch.de',
                name: 'ChairMatch',
                publisher: { '@id': 'https://chairmatch.de/#organization' },
                inLanguage: 'de-DE',
                potentialAction: {
                  '@type': 'SearchAction',
                  target: { '@type': 'EntryPoint', urlTemplate: 'https://chairmatch.de/search?q={search_term_string}' },
                  'query-input': 'required name=search_term_string',
                },
              },
            ],
          }) }}
        />
        <DynamicTheme />
        <Providers>
          <ErrorBoundary>
            <VisitTracker />
            {children}
            <BottomNav />
            <ChatWidget />
            <ConsentBanner />
          </ErrorBoundary>
        </Providers>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}` }} />
      </body>
    </html>
  )
}
