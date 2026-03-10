import type { Metadata, Viewport } from 'next'
import { DM_Sans, Cinzel, Cormorant_Garamond } from 'next/font/google'
import { Providers } from './providers'
import DynamicTheme from '@/components/DynamicTheme'
import BottomNav from '@/components/BottomNav'
import ConsentBanner from '@/components/ConsentBanner'
import VisitTracker from '@/components/VisitTracker'
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
  title: 'ChairMatch — Dein Beauty-Partner in ganz Deutschland',
  description: 'Buche Termine bei Top-Salons, Barbershops & Kosmetikstudios. 0% Provision.',
  metadataBase: new URL('https://chairmatch.de'),
  openGraph: {
    title: 'ChairMatch — Beauty Booking Deutschland',
    description: 'Buche Termine bei Top-Salons, Barbershops & Kosmetikstudios.',
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
        <DynamicTheme />
        <Providers>
          <VisitTracker />
          {children}
          <BottomNav />
          <ConsentBanner />
        </Providers>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}` }} />
      </body>
    </html>
  )
}
