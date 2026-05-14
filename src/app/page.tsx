export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import HomeClient from '@/components/HomeClient'
import { WelcomeGate } from '@/components/WelcomeSplitter'
import { getTranslations } from '@/i18n/server'

// REVERT-ANLEITUNG (falls Splitter doch nicht gefällt):
// 1. Diesen Import wieder hinzufügen:
//      import { getCachedOnboardingSlides } from '@/lib/settings'
//      import OnboardingGate from '@/components/OnboardingGate'
// 2. Im JSX <WelcomeGate> durch <OnboardingGate slides={onboardingSlides}> ersetzen
// 3. `const slides = await getCachedOnboardingSlides().catch(() => [])` wieder einfügen
// Die OnboardingGate-Komponente bleibt unverändert im Repo.

export default async function HomePage() {
  let categories: { id: string; slug: string; label: string; description: string | null; icon_url: string | null; sort_order: number; is_active: boolean }[] = []
  let salons: { id: string; name: string; slug: string | null; description: string | null; city: string | null; logo_url: string | null; avg_rating: number; is_verified: boolean; review_count: number; category: string; subscription_tier: string; street: string | null; services: { id: string; name: string; price_cents: number }[]; rental_equipment: { type: string; price_per_day_cents: number }[] }[] = []
  let topOfferPercent: number | null = null

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

  const hour = new Date().getHours()
  const tGreeting = await getTranslations('greeting')
  const greeting = hour < 12 ? tGreeting('morning') : hour < 17 ? tGreeting('day') : tGreeting('evening')

  return (
    <WelcomeGate>
      <div className="shell">
        <div className="screen">
          <HomeClient
            categories={categories}
            dbSalons={salons}
            greeting={greeting}
            topOfferPercent={topOfferPercent}
          />
        </div>
      </div>
    </WelcomeGate>
  )
}
