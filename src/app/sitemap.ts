import { MetadataRoute } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { PROVS } from '@/lib/demo-data'
import { PHASE_1_CITIES } from '@/lib/seo-data/cities'
import { VERTICALS } from '@/lib/seo-data/verticals'
import { MAGAZIN_ARTIKEL } from '@/lib/seo-data/magazin'
import { PHASE_1B_ASSET_COMBOS } from '@/lib/seo-data/assets'
import { shouldIndex } from '@/lib/seo'

export const dynamic = 'force-dynamic'

const CATEGORY_SLUGS = [
  'barber', 'friseur', 'kosmetik', 'aesthetik',
  'haartransplantation', 'zahnimplantate', 'augenlasern', 'longevity', 'infusion',
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
    // /search bewusst nicht in Sitemap — noindex,follow (interne Suche, kein SEO-Wert).
    // /auth bewusst nicht in Sitemap — Login-Page hat keinen SEO-Wert.
    { url: `${base}/landing`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/was-ist-chairmatch`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/anbieter/wie-es-funktioniert`, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/mieter/wie-es-funktioniert`, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/provisionsmodell`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/magazin`, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${base}/pitch`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/register/anbieter`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/vermieter/wie-es-funktioniert`, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/datenschutz`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/impressum`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/agb`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/agb-provider`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/cookie-settings`, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${base}/faq`, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/products`, changeFrequency: 'daily', priority: 0.85 },
    // Premium Medical-Beauty Money-Pages
    { url: `${base}/premium`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/haartransplantation`, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${base}/zahnimplantate`, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${base}/augenlasern`, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${base}/longevity`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/iv-infusionen`, changeFrequency: 'weekly', priority: 0.9 },
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
      .limit(5000)

    const salonPages: MetadataRoute.Sitemap = (salons ?? []).map(s => ({
      url: `${base}/salon/${s.slug}`,
      lastModified: s.updated_at || undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    // Demo-Salons (PROVS) auch indexieren bis echte Provider live sind
    const demoPages: MetadataRoute.Sitemap = PROVS.map(p => ({
      url: `${base}/salon/${p.id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    // Vertical-Deutschland-Hubs (alle Phase 1 — immer indexiert)
    const verticalHubs: MetadataRoute.Sitemap = VERTICALS.map((v) => ({
      url: `${base}/${v.slug}-deutschland`,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    }))

    // Stadt-Hubs + Stadt × Vertical — nur in Sitemap wenn >= Threshold Salons
    const cityHubs: MetadataRoute.Sitemap = []
    const cityVerticalPages: MetadataRoute.Sitemap = []
    for (const c of PHASE_1_CITIES) {
      const { count: cityCount } = await supabase
        .from('salons')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .ilike('city', c.name)
      if (shouldIndex(cityCount ?? 0)) {
        cityHubs.push({
          url: `${base}/${c.slug}`,
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
      for (const v of VERTICALS) {
        const { count: cvCount } = await supabase
          .from('salons')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .ilike('city', c.name)
          .eq('category', v.slug)
        if (shouldIndex(cvCount ?? 0)) {
          cityVerticalPages.push({
            url: `${base}/${c.slug}/${v.slug}`,
            changeFrequency: 'weekly',
            priority: 0.75,
          })
        }
      }
    }

    // Stadt × Vertical × Asset (Welle-1 Phase-1b Top-Kombinationen aus Modul 2 §4.6)
    const assetPages: MetadataRoute.Sitemap = []
    for (const combo of PHASE_1B_ASSET_COMBOS) {
      const city = PHASE_1_CITIES.find((c) => c.slug === combo.stadt)
      if (!city) continue
      const { count: cvCount } = await supabase
        .from('salons')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .ilike('city', city.name)
        .eq('category', combo.vertical)
      if (shouldIndex(cvCount ?? 0)) {
        assetPages.push({
          url: `${base}/${combo.stadt}/${combo.vertical}/${combo.asset}`,
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
    }

    // Magazin-Artikel
    const magazinPages: MetadataRoute.Sitemap = MAGAZIN_ARTIKEL.map((a) => ({
      url: `${base}/magazin/${a.slug}`,
      lastModified: a.publishedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    // Produkte (Marketplace)
    let productPages: MetadataRoute.Sitemap = []
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: products } = await (supabase as any)
        .from('products')
        .select('id, slug, updated_at')
        .eq('is_active', true)
        .limit(5000)
      productPages = (products ?? []).map((p: { id: string; slug?: string | null; updated_at?: string }) => ({
        url: `${base}/products/${p.slug || p.id}`,
        lastModified: p.updated_at,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    } catch {
      // ok
    }

    // Listings (aktive Services mit Slug)
    let listingPages: MetadataRoute.Sitemap = []
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: services } = await (supabase as any)
        .from('services')
        .select('id, slug, created_at')
        .eq('is_active', true)
        .limit(5000)
      listingPages = (services ?? []).map((s: { id: string; slug?: string | null; created_at?: string }) => ({
        url: `${base}/listings/${s.slug || s.id}`,
        lastModified: s.created_at,
        changeFrequency: 'weekly' as const,
        priority: 0.75,
      }))
    } catch {
      // Falls services-Tabelle Schema-Mismatch hat — ignorieren
    }

    // Freelancer-Rechner (Lead-Magnet)
    const toolPages: MetadataRoute.Sitemap = [{
      url: `${base}/freelancer-rechner`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }]

    return [...staticPages, ...catPages, ...salonPages, ...demoPages, ...verticalHubs, ...cityHubs, ...cityVerticalPages, ...assetPages, ...magazinPages, ...listingPages, ...productPages, ...toolPages]
  } catch {
    const demoPages: MetadataRoute.Sitemap = PROVS.map(p => ({
      url: `${base}/salon/${p.id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
    const verticalHubs: MetadataRoute.Sitemap = VERTICALS.map((v) => ({
      url: `${base}/${v.slug}-deutschland`,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    }))
    return [...staticPages, ...catPages, ...demoPages, ...verticalHubs]
  }
}
