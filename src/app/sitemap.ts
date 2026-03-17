import { MetadataRoute } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const CATEGORY_SLUGS = [
  'barber', 'friseur', 'kosmetik', 'aesthetik',
  'nail', 'massage', 'lash', 'arzt', 'opraum',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://chairmatch.de'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/explore`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/offers`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/rentals`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/auth`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/register/anbieter`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/datenschutz`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/impressum`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/agb`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/agb-provider`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/cookie-settings`, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${base}/search`, changeFrequency: 'daily', priority: 0.8 },
  ]

  // Category pages (all 9 categories)
  const catPages: MetadataRoute.Sitemap = CATEGORY_SLUGS.map(slug => ({
    url: `${base}/category/${slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  try {
    const supabase = getSupabaseAdmin()

    // Dynamic: salons from Supabase
    const { data: salons } = await supabase
      .from('salons')
      .select('slug, updated_at')
      .eq('is_active', true)
      .limit(500)

    const salonPages: MetadataRoute.Sitemap = (salons ?? []).map(s => ({
      url: `${base}/salon/${s.slug}`,
      lastModified: s.updated_at || undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    return [...staticPages, ...catPages, ...salonPages]
  } catch {
    // If DB fails, still return static + category pages
    return [...staticPages, ...catPages]
  }
}
