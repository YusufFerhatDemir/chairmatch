export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getTranslations } from '@/i18n/server'

export const metadata: Metadata = {
  // Layout-Template fügt "| ChairMatch" auto an.
  title: 'Stuhlmiete, Kabine & OP-Raum tageweise mieten',
  description: 'Stuhlmiete in Deutschland: Friseurstuhl, Barberstuhl, Kosmetik-Kabine, Lash-Workstation, Behandlungsraum oder OP-Raum tageweise mieten. Verifizierte Vermieter, Stripe-gesicherte Zahlung, ab 25 €/Tag. 0 % Provision für dich als Mieter.',
  keywords: 'stuhlmiete, friseurstuhl mieten, barberstuhl mieten, kosmetikkabine mieten, lash platz mieten, op raum mieten, behandlungsraum mieten, beauty workspace tageweise, chair rental, salonplatz miete',
  alternates: { canonical: 'https://www.chairmatch.de/rentals' },
  openGraph: {
    title: 'Stuhlmiete & Beauty-Workspace tageweise | ChairMatch',
    description: 'Friseurstuhl, Kosmetik-Kabine oder OP-Raum tageweise mieten — bundesweit, verifiziert, Stripe-gesichert.',
    url: 'https://www.chairmatch.de/rentals',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

interface Rental {
  id: string
  name: string | null
  type: string
  description: string | null
  price_per_day_cents: number
  price_per_month_cents: number | null
  salon: {
    name: string
    slug: string | null
    city: string | null
    id: string
  }
}

interface Props {
  searchParams: Promise<{ type?: string }>
}

export default async function RentalsPage({ searchParams }: Props) {
  const { type: filterType } = await searchParams
  const t = await getTranslations()
  let rentals: Rental[] = []

  try {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('rental_equipment')
      .select('id, name, type, description, price_per_day_cents, price_per_month_cents, salon:salons(id, name, slug, city)')
      .eq('is_available', true)
      .order('price_per_day_cents', { ascending: true })

    if (filterType && ['stuhl', 'liege', 'raum', 'opraum'].includes(filterType)) {
      query = query.eq('type', filterType)
    }

    const { data } = await query
    if (data) rentals = data as unknown as Rental[]
  } catch {
    // DB connection failed
  }

  const typeLabels: Record<string, string> = {
    stuhl: t('rentals.filterChair'),
    liege: t('rentals.filterBed'),
    raum: t('rentals.filterRoom'),
    opraum: t('rentals.filterOR'),
  }

  // Dynamischer Call-To-Action je nach aktivem Filter
  const ctaLabel = (() => {
    switch (filterType) {
      case 'stuhl': return t('rentals.rentChair')
      case 'liege': return t('rentals.rentBed')
      case 'raum': return t('rentals.rentRoom')
      case 'opraum': return t('rentals.rentOR')
      default: return t('rentals.rentAny')
    }
  })()

  // "Alle"-Filter entfernt — Filter klar getrennt nach Typ.
  // Klick auf den aktiven Filter erneut = Filter aus (toggle).
  const filters = [
    { key: 'stuhl', label: t('rentals.filterChair') },
    { key: 'liege', label: t('rentals.filterBed') },
    { key: 'raum', label: t('rentals.filterRoom') },
    { key: 'opraum', label: t('rentals.filterOR') },
  ]

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky" style={{ padding: '0 var(--pad)' }}>
          <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
            &larr; {t('common.back')}
          </Link>
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginTop: 8 }}>{t('rentals.title')}</h1>
          <p style={{ color: 'var(--cream)', fontSize: 'var(--font-sm)', marginTop: 8, lineHeight: 1.45 }}>
            {t('rentals.description')}
          </p>

          {/* Type Filter — Klick auf aktiven Filter = Filter aus (toggle) */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {filters.map(f => {
              const isActive = filterType === f.key
              return (
                <a
                  key={f.key}
                  href={isActive ? '/rentals' : `/rentals?type=${f.key}`}
                  className={isActive ? 'bgold' : 'boutline'}
                  style={{ padding: '8px 16px', fontSize: 12, whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block', borderRadius: 20 }}
                >
                  {f.label}
                </a>
              )
            })}
          </div>

          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-xs)', marginTop: 8 }}>
            {t('rentals.available', { count: rentals.length })}
          </p>

          {/* Differenzierungs-Tools: Karte + Match-Finder */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <Link
              href={filterType ? `/karte?type=${filterType}` : '/karte'}
              className="boutline"
              style={{ padding: '8px 16px', fontSize: 12, whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block', borderRadius: 20 }}
            >
              🗺 Kartenansicht
            </Link>
            <Link
              href="/match"
              className="boutline"
              style={{ padding: '8px 16px', fontSize: 12, whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block', borderRadius: 20 }}
            >
              ✨ Match-Finder
            </Link>
          </div>
        </div>

        <section style={{ padding: '0 var(--pad)' }}>
          {rentals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: 'var(--stone)', fontSize: 14, marginBottom: 16 }}>
                {t('rentals.empty')}
              </p>
              <a href="/register/anbieter" className="bgold" style={{ display: 'inline-block', padding: '12px 24px', textDecoration: 'none', fontSize: 13 }}>
                {ctaLabel}
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rentals.map(r => (
                <div key={r.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="badge badge-gold" style={{ fontSize: 9 }}>
                          {typeLabels[r.type] || r.type}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--cream)', fontSize: 15 }}>
                          {r.name || typeLabels[r.type] || r.type}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginTop: 2 }}>
                        {r.salon.name} &middot; {r.salon.city}
                      </div>
                      {r.description && (
                        <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 6, lineHeight: 1.4 }}>
                          {r.description}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 18 }}>
                        {(r.price_per_day_cents / 100).toFixed(0)} &euro;
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--stone)' }}>{t('common.perDay')}</div>
                      {r.price_per_month_cents && (
                        <div style={{ fontSize: 12, color: 'var(--stone)', marginTop: 2 }}>
                          {(r.price_per_month_cents / 100).toFixed(0)} &euro;/{t('common.perMonth')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <Link
                      href={`/salon/${r.salon.slug || r.salon.id}`}
                      className="bgold"
                      style={{ flex: 1, textAlign: 'center', padding: '10px 0', fontSize: 12, textDecoration: 'none' }}
                    >
                      {t('rentals.viewSalon')}
                    </Link>
                    <Link
                      href={`/booking/${r.salon.id}?rental=${r.id}`}
                      className="boutline"
                      style={{ flex: 1, textAlign: 'center', padding: '10px 0', fontSize: 12, textDecoration: 'none' }}
                    >
                      {t('rentals.sendRequest')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ padding: '24px var(--pad)', textAlign: 'center' }}>
          <a href="/register/anbieter" style={{ fontSize: 'var(--font-sm)', color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
            {t('rentals.offerOwn')}
          </a>
        </div>
        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}
