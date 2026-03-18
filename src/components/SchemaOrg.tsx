interface SchemaOrgProps {
  salon: {
    name: string
    slug?: string | null
    category: string
    city?: string | null
    street?: string | null
    postal_code?: string | null
    avg_rating?: number
    review_count?: number
  }
}

const CATEGORY_TYPE_MAP: Record<string, string> = {
  barber: 'BarberShop',
  friseur: 'HairSalon',
  kosmetik: 'BeautySalon',
  aesthetik: 'BeautySalon',
  nail: 'NailSalon',
  massage: 'DaySpa',
  lash: 'BeautySalon',
  arzt: 'MedicalClinic',
  opraum: 'MedicalClinic',
}

export default function SchemaOrg({ salon }: SchemaOrgProps) {
  const schemaType = CATEGORY_TYPE_MAP[salon.category] || 'LocalBusiness'

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: salon.name,
    url: `https://chairmatch.de/salon/${salon.slug || encodeURIComponent(salon.name.toLowerCase().replace(/\s+/g, '-'))}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: salon.street || '',
      addressLocality: salon.city || '',
      postalCode: salon.postal_code || '',
      addressCountry: 'DE',
    },
  }

  if (salon.avg_rating && salon.review_count && salon.review_count > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: salon.avg_rating,
      reviewCount: salon.review_count,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
