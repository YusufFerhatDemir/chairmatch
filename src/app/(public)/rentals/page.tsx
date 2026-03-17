export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Stuhlvermietung & OP-Raum mieten — ChairMatch',
  description: 'Stuhl, Liege, Kabine oder OP-Raum tageweise mieten. Für Friseure, Barber, Kosmetiker, Ärzte. Ab 25€/Tag.',
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
    stuhl: 'Stuhl',
    liege: 'Liege',
    raum: 'Raum',
    opraum: 'OP-Raum',
  }

  const filters = [
    { key: '', label: 'Alle' },
    { key: 'stuhl', label: 'Stuhl' },
    { key: 'liege', label: 'Liege' },
    { key: 'raum', label: 'Raum' },
    { key: 'opraum', label: 'OP-Raum' },
  ]

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky" style={{ padding: '0 var(--pad)' }}>
          <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
            &larr; Zur&uuml;ck
          </Link>
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginTop: 8 }}>Stuhl · Kabine · OP-Raum</h1>
          <p style={{ color: 'var(--cream)', fontSize: 'var(--font-sm)', marginTop: 8, lineHeight: 1.45 }}>
            Als Friseur, Barber, Masseur oder Praxis: Hier Stuhl, Liege oder OP-Raum tageweise mieten.
          </p>

          {/* Type Filter */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {filters.map(f => (
              <a
                key={f.key}
                href={f.key ? `/rentals?type=${f.key}` : '/rentals'}
                className={(!filterType && !f.key) || filterType === f.key ? 'bgold' : 'boutline'}
                style={{ padding: '8px 16px', fontSize: 12, whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block', borderRadius: 20 }}
              >
                {f.label}
              </a>
            ))}
          </div>

          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-xs)', marginTop: 8 }}>
            {rentals.length} Angebote verf&uuml;gbar
          </p>
        </div>

        <section style={{ padding: '0 var(--pad)' }}>
          {rentals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: 'var(--stone)', fontSize: 14, marginBottom: 16 }}>
                Noch keine Mietangebote in dieser Kategorie.
              </p>
              <a href="/register/anbieter" className="bgold" style={{ display: 'inline-block', padding: '12px 24px', textDecoration: 'none', fontSize: 13 }}>
                Stuhl oder Raum anbieten
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
                      <div style={{ fontSize: 10, color: 'var(--stone)' }}>pro Tag</div>
                      {r.price_per_month_cents && (
                        <div style={{ fontSize: 12, color: 'var(--stone)', marginTop: 2 }}>
                          {(r.price_per_month_cents / 100).toFixed(0)} &euro;/Monat
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
                      Salon ansehen
                    </Link>
                    <Link
                      href={`/booking/${r.salon.id}?rental=${r.id}`}
                      className="boutline"
                      style={{ flex: 1, textAlign: 'center', padding: '10px 0', fontSize: 12, textDecoration: 'none' }}
                    >
                      Anfrage senden
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ padding: '24px var(--pad)', textAlign: 'center' }}>
          <a href="/register/anbieter" style={{ fontSize: 'var(--font-sm)', color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
            Stuhl oder Raum anbieten →
          </a>
        </div>
        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}
