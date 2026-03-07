import { MetadataRoute } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://chairmatch.de'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/explore`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/offers`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/rentals`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/datenschutz`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/impressum`, changeFrequency: 'monthly', priority: 0.3 },
  ]

  // Dynamic: salons
  const supabase = getSupabaseAdmin()
  const { data: salons } = await supabase
    .from('salons')
    .select('slug, updated_at')
    .eq('is_live', true)
    .limit(500)

  const salonPages: MetadataRoute.Sitemap = (salons ?? []).map(s => ({
    url: `${base}/salon/${s.slug}`,
    lastModified: s.updated_at || undefined,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Dynamic: categories
  const { data: categories } = await supabase
    .from('categories')
    .select('slug')
    .eq('is_active', true)

  const catPages: MetadataRoute.Sitemap = (categories ?? []).map(c => ({
    url: `${base}/category/${c.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...salonPages, ...catPages]
}
