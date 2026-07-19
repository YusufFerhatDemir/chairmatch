import { MetadataRoute } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { PROVS } from '@/lib/demo-data'
import { PHASE_1_CITIES } from '@/lib/seo-data/cities'
import { VERTICALS } from '@/lib/seo-data/verticals'
import { MAGAZIN_ARTIKEL } from '@/lib/seo-data/magazin'
import { PHASE_1B_ASSET_COMBOS } from '@/lib/seo-data/assets'
import { shouldIndex } from '@/lib/seo'

// 24h-Cache statt force-dynamic: die Sitemap lief sonst bei JEDEM Crawler-Hit
// komplett gegen Supabase (gemessen ~9s TTFB). Inhalte ändern sich ~wöchentlich.
export const revalidate = 86400

const CATEGORY_SLUGS = [
  'barber', 'friseur', 'kosmetik', 'aesthetik',
  'haartransplantation', 'zahnimplantate', 'augenlasern', 'longevity', 'infusion',
  'nail', 'massage', 'lash', 'arzt', 'opraum',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://www.chairmatch.de'

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
    { url: `${base}/stuhlvermietung-guide`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/pitch`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/register/anbieter`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/vermieter/wie-es-funktioniert`, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/datenschutz`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/agb`, changeFrequency: 'monthly', priority: 0.3 },
    // /impressum, /agb-provider, /cookie-settings sind bewusst auf noindex —
    // sie gehören dann NICHT in die Sitemap (GSC meldet sonst den Widerspruch
    // "gesendet, aber durch noindex ausgeschlossen").
    { url: `${base}/faq`, changeFrequency: 'monthly', priority: 0.85 },
    // /products existiert NICHT als Route (Shop lebt unter /shop) — der Eintrag
    // erzeugte einen 404 in der Sitemap (GSC „Nicht gefunden (404)").
    // next.config.ts leitet /products jetzt per 308 auf /shop um.
    { url: `${base}/shop`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/empfehlungen`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${base}/statistik`, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${base}/widerruf`, changeFrequency: 'monthly', priority: 0.3 },
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

    // Stadt-Hubs + Stadt × Vertical + Asset-Kombis: alle Counts aus EINER
    // Query aggregieren statt ~280 sequenzielle count-Queries pro Request
    // (sitemap ist force-dynamic — das lief bei jedem Crawler-Hit).
    const { data: activeSalons } = await supabase
      .from('salons')
      .select('city, category')
      .eq('is_active', true)
      .limit(20000)

    const cityCounts = new Map<string, number>()
    const cityVerticalCounts = new Map<string, number>()
    for (const s of activeSalons ?? []) {
      if (!s.city) continue
      const cityKey = s.city.trim().toLowerCase()
      cityCounts.set(cityKey, (cityCounts.get(cityKey) ?? 0) + 1)
      if (s.category) {
        const cvKey = `${cityKey}|${s.category}`
        cityVerticalCounts.set(cvKey, (cityVerticalCounts.get(cvKey) ?? 0) + 1)
      }
    }

    const cityHubs: MetadataRoute.Sitemap = []
    const cityVerticalPages: MetadataRoute.Sitemap = []
    for (const c of PHASE_1_CITIES) {
      const cityKey = c.name.toLowerCase()
      if (shouldIndex(cityCounts.get(cityKey) ?? 0)) {
        cityHubs.push({
          url: `${base}/${c.slug}`,
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
      for (const v of VERTICALS) {
        if (shouldIndex(cityVerticalCounts.get(`${cityKey}|${v.slug}`) ?? 0)) {
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
      const cvCount = cityVerticalCounts.get(`${city.name.toLowerCase()}|${combo.vertical}`) ?? 0
      if (shouldIndex(cvCount)) {
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
      // Produkt-Detailseiten leben unter /shop/[slug] (NICHT /products/…) und
      // die Route lädt ausschließlich per slug — Produkte ohne Slug wären 404.
      productPages = (products ?? [])
        .filter((p: { slug?: string | null }) => !!p.slug)
        .map((p: { slug?: string | null; updated_at?: string }) => ({
          url: `${base}/shop/${p.slug}`,
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

    // Tool-Seiten (Lead-Magnets & Differenzierungs-Features)
    const toolPages: MetadataRoute.Sitemap = [
      {
        url: `${base}/freelancer-rechner`,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      },
      {
        url: `${base}/match`,
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      },
      {
        url: `${base}/karte`,
        changeFrequency: 'daily' as const,
        priority: 0.9,
      },
      {
        url: `${base}/vertrag-generator`,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      },
      {
        url: `${base}/preisvergleich`,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      },
    ]

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
