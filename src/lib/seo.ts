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
    '@id': 'https://chairmatch.de/#organization',
    name: 'ChairMatch',
    legalName: 'ChairMatch GmbH (i. Gr.)',
    url: 'https://chairmatch.de',
    logo: {
      '@type': 'ImageObject',
      url: 'https://chairmatch.de/icons/chairmatch-pin-logo.png',
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
      // TODO: Yusuf — bitte aktuelle URLs eintragen sobald vorhanden:
      // 'https://www.linkedin.com/company/chairmatch',
      // 'https://www.instagram.com/chairmatch',
      // 'https://twitter.com/chairmatch_de',
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
    '@id': 'https://chairmatch.de/#website',
    url: 'https://chairmatch.de',
    name: 'ChairMatch',
    publisher: { '@id': 'https://chairmatch.de/#organization' },
    inLanguage: 'de-DE',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://chairmatch.de/search?q={search_term_string}',
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
  category?: string | null
  street?: string | null
  postal_code?: string | null
  city?: string | null
  phone?: string | null
  avg_rating?: number | null
  review_count?: number | null
  price_range?: string | null
  opening_hours?: Record<string, string> | null
  latitude?: number | null
  longitude?: number | null
}

export function salonSchema(salon: SalonSchemaInput) {
  const url = `https://chairmatch.de/salon/${salon.slug}`
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
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
    const dayMap: Record<string, string> = {
      Mo: 'Monday', Di: 'Tuesday', Mi: 'Wednesday',
      Do: 'Thursday', Fr: 'Friday', Sa: 'Saturday', So: 'Sunday',
    }
    const specs: Array<Record<string, unknown>> = []
    for (const [day, hours] of Object.entries(salon.opening_hours)) {
      if (!hours || hours.toLowerCase().includes('geschlossen')) continue
      const m = hours.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/)
      if (!m) continue
      specs.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: dayMap[day] || day,
        opens: `${m[1].padStart(2, '0')}:${m[2]}`,
        closes: `${m[3].padStart(2, '0')}:${m[4]}`,
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
      item: item.url.startsWith('http') ? item.url : `https://chairmatch.de${item.url}`,
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

/** ServiceArea-Schema für Stadt-Hubs (kein physischer Standort) */
export function serviceAreaSchema(city: string, vertical?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: vertical
      ? `${vertical} Workspace mieten in ${city}`
      : `Beauty Workspace mieten in ${city}`,
    provider: { '@id': 'https://chairmatch.de/#organization' },
    areaServed: {
      '@type': 'City',
      name: city,
      containedInPlace: { '@type': 'Country', name: 'Germany' },
    },
    serviceType: 'Workspace Rental',
  }
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
  const url = `https://chairmatch.de/magazin/${a.slug}`
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
      url: 'https://chairmatch.de/was-ist-chairmatch',
    },
    publisher: { '@id': 'https://chairmatch.de/#organization' },
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
  const url = `https://chairmatch.de/listings/${input.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    name: input.name,
    description: input.description || `${input.name} — Stuhl-Miete bei ${input.salon.name}${input.salon.city ? ` in ${input.salon.city}` : ''}`,
    serviceType: input.category,
    provider: {
      '@type': 'LocalBusiness',
      '@id': `https://chairmatch.de/salon/${input.salon.slug}#localbusiness`,
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
      seller: { '@id': 'https://chairmatch.de/#organization' },
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
  }
  return map[slug] || slug.charAt(0).toUpperCase() + slug.slice(1)
}
