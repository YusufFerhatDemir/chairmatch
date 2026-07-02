// ISR statt force-dynamic: Homepage ist die meistgecrawlte Seite — 5 Min Cache
// senkt TTFB von ~5s auf Edge-Niveau. Greeting rechnet HomeClient client-seitig.
export const revalidate = 300

import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getCachedOnboardingSlides } from '@/lib/settings'
import OnboardingGate from '@/components/OnboardingGate'
import HomeClient from '@/components/HomeClient'
import { HomeHero, HomeSEOFooterContent } from '@/components/HomeSEOLanding'

export const metadata: Metadata = {
  title: {
    absolute: 'Stuhlmiete & Beauty-Workspace mieten — ChairMatch Deutschland',
  },
  description:
    'Friseurstuhl, Barberstuhl, Kosmetikraum, Lash-Platz und OP-Raum tageweise mieten oder als Salon vermieten. Marketplace für Beauty- & Medical-Workspace in Berlin, Hamburg, München, Köln, Frankfurt. Tagespreis ab 25 €. 0% Provision auf Buchungen.',
  keywords: [
    'Stuhlmiete',
    'Friseurstuhl mieten',
    'Barberstuhl mieten',
    'Kosmetikraum mieten',
    'Behandlungsraum mieten',
    'Lash Studio mieten',
    'Nagelstudio Platz mieten',
    'OP-Raum mieten',
    'Salon vermieten',
    'Workspace Beauty Deutschland',
    'Beauty Coworking',
    'Stuhlmietvertrag',
    'ChairMatch',
  ],
  alternates: {
    canonical: 'https://www.chairmatch.de/',
    languages: { 'de-DE': 'https://www.chairmatch.de/' },
  },
  openGraph: {
    title: 'Stuhlmiete & Beauty-Workspace mieten — ChairMatch Deutschland',
    description:
      'Deutschlands Marketplace für Stuhlmiete und Beauty-Workspace-Sharing. Tageweise Friseurstuhl, Barberstuhl, Kabine oder OP-Raum mieten — 0% Provision, sichere Online-Buchung.',
    url: 'https://www.chairmatch.de/',
    siteName: 'ChairMatch',
    locale: 'de_DE',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChairMatch — Stuhlmiete & Beauty-Workspace Deutschland' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stuhlmiete & Beauty-Workspace mieten — ChairMatch',
    description:
      'Marketplace für Stuhlmiete in Deutschland. Friseurstuhl, Kosmetikraum, OP-Raum tageweise mieten. 0% Provision.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default async function HomePage() {
  let categories: { id: string; slug: string; label: string; description: string | null; icon_url: string | null; sort_order: number; is_active: boolean }[] = []
  let salons: { id: string; name: string; slug: string | null; description: string | null; city: string | null; logo_url: string | null; avg_rating: number; is_verified: boolean; review_count: number; category: string; subscription_tier: string; street: string | null; services: { id: string; name: string; price_cents: number }[]; rental_equipment: { type: string; price_per_day_cents: number }[] }[] = []
  let topOfferPercent: number | null = null

  const slides = await getCachedOnboardingSlides().catch(() => [])

  try {
    const supabase = getSupabaseAdmin()

    const [catsRes, salonRes, offerRes] = await Promise.all([
      supabase
        .from('categories')
        .select('id, slug, label, description, icon_url, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('salons')
        .select('id, name, slug, description, city, logo_url, avg_rating, is_verified, review_count, category, subscription_tier, street, services(id, name, price_cents), rental_equipment(type, price_per_day_cents)')
        .eq('is_active', true)
        .order('avg_rating', { ascending: false })
        .limit(20),
      supabase
        .from('offers')
        .select('id, title, discount_percent')
        .eq('is_active', true)
        .order('discount_percent', { ascending: false })
        .limit(1),
    ])

    if (catsRes.data) categories = catsRes.data
    if (salonRes.data) salons = salonRes.data as typeof salons
    if (offerRes.data?.[0]?.discount_percent) topOfferPercent = offerRes.data[0].discount_percent
  } catch {
    // DB connection failed — render with demo data
  }

  const onboardingSlides = slides.map(s => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    icon: s.icon,
    imageUrl: s.imageUrl,
  }))

  return (
    <OnboardingGate slides={onboardingSlides}>
      <div className="shell">
        <div className="screen">
          {/* Server-rendered Hero — H1, dual CTAs, immer im HTML */}
          <HomeHero />

          <HomeClient
            categories={categories}
            dbSalons={salons}
            topOfferPercent={topOfferPercent}
          />

          {/* Server-rendered SEO Content + FAQ-Schema + interne Hub-Links */}
          <HomeSEOFooterContent />
        </div>
      </div>
    </OnboardingGate>
  )
}
