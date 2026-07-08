/**
 * SEO-Helpers: shouldIndex, Schema-Generators, Breadcrumbs.
 *
 * Wird von Page-Templates und Schema-Komponenten benutzt.
 * Single source of truth für SEO-Logik.
 */

/** Schwelle für Soft-404-Schutz: Stadt/Vertical wird nur indexiert,
 *  wenn min. so viele Listings vorhanden sind. */
export const INDEX_THRESHOLD = 3

/**
 * Entscheidet ob eine Listing-aggregierte Seite indexiert werden darf.
 * Wenn unter Threshold → Robots-Meta auf noindex.
 */
export function shouldIndex(listingCount: number, threshold = INDEX_THRESHOLD): boolean {
  return listingCount >= threshold
}

/**
 * Robots-Meta-Helper für generateMetadata().
 * Beispiel:
 *   robots: robotsForListingPage(salonCount)
 */
export function robotsForListingPage(listingCount: number): { index: boolean; follow: boolean } {
  return {
    index: shouldIndex(listingCount),
    follow: true,
  }
}

// ─────────────────────────────────────────────────────────────
// Schema.org JSON-LD Generators
// ─────────────────────────────────────────────────────────────

/** Organization-Schema für Layout-Head (vervollständigt) */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://www.chairmatch.de/#organization',
    name: 'ChairMatch',
    alternateName: ['Chair Match', 'Chairmatch', 'chairmatch.de'],
    slogan: 'Deutschlands #1 Marketplace für Beauty-Workspace-Sharing',
    brand: {
      '@type': 'Brand',
      name: 'ChairMatch',
      logo: 'https://www.chairmatch.de/icons/chairmatch-pin-logo.png',
    },
    legalName: 'ChairMatch GmbH (i. Gr.)',
    url: 'https://www.chairmatch.de',
    logo: {
      '@type': 'ImageObject',
      url: 'https://www.chairmatch.de/icons/chairmatch-pin-logo.png',
      width: 512,
      height: 512,
    },
    description: 'Deutschlands Marketplace für Beauty-Workspace-Sharing. Stühle, Liegen, Kabinen und Räume tageweise mieten und vermieten.',
    foundingDate: '2026',
    founder: {
      '@type': 'Person',
      name: 'Yusuf Ferhat Demir',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Germany',
    },
    sameAs: [
      'https://www.linkedin.com/company/chairmatch',
      'https://www.instagram.com/chairmatch.de',
      // weitere Profile (X/Twitter, Facebook, YouTube, TikTok) bitte hier eintragen sobald live.
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'legal@chairmatch.de',
      contactType: 'customer service',
      availableLanguage: ['German', 'English', 'Turkish'],
      areaServed: 'DE',
    },
    knowsAbout: [
      'Chair Rental',
      'Salon Coworking',
      'Beauty Workspace Sharing',
      'Friseurstuhl Vermietung',
      'Barberstuhl Miete',
      'Kosmetikraum',
      'OP-Raum Vermietung',
    ],
  }
}

/** Website-Schema mit SearchAction (für Google Sitelinks Searchbox) */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://www.chairmatch.de/#website',
    url: 'https://www.chairmatch.de',
    name: 'ChairMatch',
    publisher: { '@id': 'https://www.chairmatch.de/#organization' },
    inLanguage: 'de-DE',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.chairmatch.de/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/** LocalBusiness-Schema für Salon-Detail-Pages */
export interface SalonSchemaInput {
  id: string
  name: string
  slug: string
  description?: string | null
  // Salon-Kategorie (barber, friseur, …) → spezifischer @type via SALON_CATEGORY_TYPE_MAP
  category?: string | null
  street?: string | null
  postal_code?: string | null
  city?: string | null
  phone?: string | null
  avg_rating?: number | null
  review_count?: number | null
  price_range?: string | null
  // String-Format ("09:00 - 18:00" / "geschlossen") ODER DB-jsonb-Format
  // ({ open, close } | null) — salonSchema verarbeitet beide.
  opening_hours?: Record<string, string | { open?: string; close?: string } | null> | null
  latitude?: number | null
  longitude?: number | null
}

// Kategorie → spezifischer schema.org-Typ (ehem. in components/SchemaOrg.tsx).
// Unbekannte/fehlende Kategorie fällt auf generisches LocalBusiness zurück.
const SALON_CATEGORY_TYPE_MAP: Record<string, string> = {
  barber: 'BarberShop',
  friseur: 'HairSalon',
  kosmetik: 'BeautySalon',
  aesthetik: 'BeautySalon',
  lash: 'BeautySalon',
  nail: 'NailSalon',
  massage: 'DaySpa',
  arzt: 'MedicalClinic',
  opraum: 'MedicalClinic',
  // Vertical-Slugs (seo-data/verticals.ts) — DB-Kategorien der SEO-Routen
  barbershop: 'BarberShop',
  nagelstudio: 'NailSalon',
  'lash-brows': 'BeautySalon',
}

export function salonSchema(salon: SalonSchemaInput) {
  const url = `https://www.chairmatch.de/salon/${salon.slug}`
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': (salon.category && SALON_CATEGORY_TYPE_MAP[salon.category]) || 'LocalBusiness',
    '@id': `${url}#localbusiness`,
    name: salon.name,
    url,
    description: salon.description || `${salon.name} in ${salon.city || 'Deutschland'} — Termine online buchen.`,
  }

  if (salon.street && salon.city) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: salon.street,
      postalCode: salon.postal_code || undefined,
      addressLocality: salon.city,
      addressCountry: 'DE',
    }
  }

  if (salon.latitude && salon.longitude) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: salon.latitude,
      longitude: salon.longitude,
    }
    // Google-Maps-Link als hasMap — stärkt das Lokal-Signal der Entität
    schema.hasMap = `https://www.google.com/maps/search/?api=1&query=${salon.latitude},${salon.longitude}`
  }

  if (salon.phone) {
    schema.telephone = salon.phone
  }

  if (salon.avg_rating && salon.review_count) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: salon.avg_rating,
      reviewCount: salon.review_count,
      bestRating: 5,
      worstRating: 1,
    }
  }

  if (salon.price_range) {
    schema.priceRange = salon.price_range
  }

  if (salon.opening_hours && typeof salon.opening_hours === 'object') {
    // Keys case-insensitiv: DB-Seeds nutzen 'mo'/'di'/…, ältere Daten 'Mo'/'Di'/…
    const dayMap: Record<string, string> = {
      mo: 'Monday', di: 'Tuesday', mi: 'Wednesday',
      do: 'Thursday', fr: 'Friday', sa: 'Saturday', so: 'Sunday',
    }
    const specs: Array<Record<string, unknown>> = []
    for (const [day, hours] of Object.entries(salon.opening_hours as Record<string, unknown>)) {
      if (!hours) continue
      let opens: string | undefined
      let closes: string | undefined
      if (typeof hours === 'string') {
        // Alt-Format: "09:00 - 18:00" oder "geschlossen"
        if (hours.toLowerCase().includes('geschlossen')) continue
        const m = hours.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/)
        if (!m) continue
        opens = `${m[1].padStart(2, '0')}:${m[2]}`
        closes = `${m[3].padStart(2, '0')}:${m[4]}`
      } else if (typeof hours === 'object') {
        // DB-Format (jsonb): { open: "09:00", close: "18:00" } | null
        // WICHTIG: früher warf hours.toLowerCase() hier einen TypeError, der
        // via catch{notFound()} in salon/[slug]/page.tsx JEDE DB-Salon-Seite
        // als Soft-404 (HTTP 200 + "Seite nicht gefunden") rendern ließ.
        const h = hours as { open?: unknown; close?: unknown }
        if (typeof h.open !== 'string' || typeof h.close !== 'string') continue
        opens = h.open
        closes = h.close
      } else {
        continue
      }
      specs.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: dayMap[day.toLowerCase()] || day,
        opens,
        closes,
      })
    }
    if (specs.length > 0) schema.openingHoursSpecification = specs
  }

  return schema
}

/** BreadcrumbList-Schema + visuelle Crumbs */
export interface BreadcrumbItem {
  name: string
  url: string
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `https://www.chairmatch.de${item.url}`,
    })),
  }
}

/** FAQ-Schema (FAQPage) — für FAQ-Komponente */
export interface FaqItem {
  question: string
  answer: string
}

export function faqSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

/**
 * Geo-Input für Stadt-bezogene Schemas & Meta-Tags.
 * Kompatibel mit CityData aus seo-data/cities.ts — einfach die Stadt durchreichen.
 */
export interface CityGeoInput {
  name: string
  state?: string
  lat?: number
  lng?: number
  regionCode?: string
  wikipedia?: string
}

/**
 * Schema.org-City-Node mit GeoCoordinates + Wikipedia-sameAs.
 * Als areaServed in Service-Schemas einsetzen — die Koordinaten und die
 * Entity-Verknüpfung sind das stärkste Lokal-Signal für Google & AI-Engines.
 */
export function cityPlace(city: CityGeoInput) {
  const node: Record<string, unknown> = {
    '@type': 'City',
    name: city.name,
    containedInPlace: city.state
      ? {
          '@type': 'State',
          name: city.state,
          containedInPlace: { '@type': 'Country', name: 'Germany' },
        }
      : { '@type': 'Country', name: 'Germany' },
  }
  if (city.lat && city.lng) {
    node.geo = { '@type': 'GeoCoordinates', latitude: city.lat, longitude: city.lng }
  }
  if (city.wikipedia) node.sameAs = city.wikipedia
  return node
}

/**
 * Klassische Geo-Meta-Tags (geo.region, geo.placename, geo.position, ICBM)
 * für generateMetadata() → `other`. Kein Ranking-Wunder, aber ein
 * konsistentes Lokalisierungs-Signal für regionale Suche & Verzeichnisse.
 */
export function geoMeta(city: CityGeoInput): Record<string, string> {
  const meta: Record<string, string> = { 'geo.placename': city.name }
  if (city.regionCode) meta['geo.region'] = city.regionCode
  if (city.lat && city.lng) {
    meta['geo.position'] = `${city.lat};${city.lng}`
    meta['ICBM'] = `${city.lat}, ${city.lng}`
  }
  return meta
}

/** Preis-Spanne wie "45-75 €/Tag" → { low: '45', high: '75' } (fail-soft) */
export function parsePriceRange(range: string): { low: string; high: string } | null {
  const m = range.match(/(\d+)\s*[–-]\s*(\d+)/)
  if (!m) return null
  return { low: m[1], high: m[2] }
}

/**
 * ServiceArea-Schema für Stadt-Hubs (kein physischer Standort).
 * Akzeptiert weiterhin einen reinen String ("Deutschland" auf der Homepage);
 * mit CityGeoInput kommen GeoCoordinates, Bundesland und Wikipedia-Entity dazu.
 * priceRangePerDay (z.B. "45-75 €/Tag") ergänzt ein AggregateOffer.
 */
export function serviceAreaSchema(
  city: string | CityGeoInput,
  vertical?: string,
  priceRangePerDay?: string,
) {
  const cityInput: CityGeoInput = typeof city === 'string' ? { name: city } : city
  const isCountry = cityInput.name === 'Deutschland'
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: vertical
      ? `${vertical} Workspace mieten in ${cityInput.name}`
      : `Beauty Workspace mieten in ${cityInput.name}`,
    provider: { '@id': 'https://www.chairmatch.de/#organization' },
    areaServed: isCountry
      ? { '@type': 'Country', name: 'Germany' }
      : cityPlace(cityInput),
    serviceType: 'Workspace Rental',
  }
  const price = priceRangePerDay ? parsePriceRange(priceRangePerDay) : null
  if (price) {
    schema.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: price.low,
      highPrice: price.high,
      unitText: 'DAY',
    }
  }
  return schema
}

/**
 * Article-Schema für Magazin-Artikel.
 *
 * Optimiert für Google Discover, AI-Engines (ChatGPT, Claude, Perplexity)
 * und Top-Stories-Karussell. Mit Image (OG-Image-Route auto-discovered)
 * und author/publisher/dateModified.
 */
export interface ArticleSchemaInput {
  slug: string
  title: string
  description: string
  publishedAt: string
  modifiedAt?: string
  category: string
  keywords: string[]
  readMinutes?: number
}

export function articleSchema(a: ArticleSchemaInput) {
  const url = `https://www.chairmatch.de/magazin/${a.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: a.title,
    description: a.description,
    datePublished: a.publishedAt,
    dateModified: a.modifiedAt || a.publishedAt,
    image: [`${url}/opengraph-image`],
    author: {
      '@type': 'Person',
      name: 'Yusuf Ferhat Demir',
      url: 'https://www.chairmatch.de/was-ist-chairmatch',
    },
    publisher: { '@id': 'https://www.chairmatch.de/#organization' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: a.keywords.join(', '),
    articleSection: a.category,
    inLanguage: 'de-DE',
    isAccessibleForFree: true,
    ...(a.readMinutes ? { timeRequired: `PT${a.readMinutes}M` } : {}),
  }
}

/**
 * Service+Offer-Schema für Listing-Detail-Pages.
 *
 * Repräsentiert ein einzelnes Stuhl-/Liegen-/Raum-Angebot eines Salons
 * mit konkretem Preis/Tag und Verfügbarkeit. Wird mit LocalBusiness des
 * Salons über provider.@id verknüpft.
 */
export interface ListingSchemaInput {
  id: string
  slug: string
  name: string
  description?: string | null
  pricePerDayEur: number
  category: string
  salon: {
    slug: string
    name: string
    city?: string | null
  }
  availability?: 'InStock' | 'OutOfStock' | 'LimitedAvailability'
}

export function listingSchema(input: ListingSchemaInput) {
  const url = `https://www.chairmatch.de/listings/${input.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    name: input.name,
    description: input.description || `${input.name} — Stuhl-Miete bei ${input.salon.name}${input.salon.city ? ` in ${input.salon.city}` : ''}`,
    serviceType: input.category,
    provider: {
      '@type': 'LocalBusiness',
      '@id': `https://www.chairmatch.de/salon/${input.salon.slug}#localbusiness`,
      name: input.salon.name,
    },
    areaServed: input.salon.city
      ? { '@type': 'City', name: input.salon.city }
      : { '@type': 'Country', name: 'Germany' },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'EUR',
      price: input.pricePerDayEur.toFixed(2),
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: input.pricePerDayEur.toFixed(2),
        priceCurrency: 'EUR',
        unitText: 'DAY',
      },
      availability: `https://schema.org/${input.availability || 'InStock'}`,
      seller: { '@id': 'https://www.chairmatch.de/#organization' },
    },
  }
}

/** City-Slug-Konverter — Umlaute zu ASCII */
export function cityToSlug(city: string): string {
  return city
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/** Reverse: Slug zu schöner Display-Name */
export function slugToCity(slug: string): string {
  const map: Record<string, string> = {
    muenchen: 'München',
    koeln: 'Köln',
    duesseldorf: 'Düsseldorf',
    nuernberg: 'Nürnberg',
    muenster: 'Münster',
  }
  return map[slug] || slug.charAt(0).toUpperCase() + slug.slice(1)
}
