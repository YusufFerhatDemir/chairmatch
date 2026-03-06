import type { Metadata, Viewport } from 'next'
import { DM_Sans, Cinzel, Cormorant_Garamond } from 'next/font/google'
import { Providers } from './providers'
import DynamicTheme from '@/components/DynamicTheme'
import BottomNav from '@/components/BottomNav'
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
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  )
}
