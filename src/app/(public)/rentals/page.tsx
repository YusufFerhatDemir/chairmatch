export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'

interface Rental {
  id: string
  name: string | null
  type: string
  price_per_day_cents: number
  price_per_month_cents: number | null
  salon: {
    name: string
    city: string | null
  }
}

export default async function RentalsPage() {
  let rentals: Rental[] = []

  try {
    const supabase = getSupabaseAdmin()

    const { data } = await supabase
      .from('rental_equipment')
      .select('id, name, type, price_per_day_cents, price_per_month_cents, salon:salons(name, city)')
      .eq('is_available', true)
      .order('price_per_day_cents', { ascending: true })

    if (data) rentals = data as unknown as Rental[]
  } catch {
    // DB connection failed — render empty state
  }

  const typeLabels: Record<string, string> = {
    stuhl: 'Stuhl',
    liege: 'Liege',
    raum: 'Raum',
    opraum: 'OP-Raum',
  }

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky" style={{ padding: '0 var(--pad)' }}>
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)' }}>Stuhl · Kabine · OP-Raum</h1>
          <p style={{ color: 'var(--cream)', fontSize: 'var(--font-sm)', marginTop: 8, lineHeight: 1.45 }}>
            Als Friseur, Barber, Masseur oder Praxis: Hier Stuhl, Liege oder OP-Raum tageweise mieten. Oder als Salon Vermietung anbieten.
          </p>
          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-xs)', marginTop: 6 }}>
            {rentals.length} Angebote verf&uuml;gbar
          </p>
          <a href="/register/anbieter" style={{ display: 'inline-block', marginTop: 10, fontSize: 'var(--font-sm)', color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
            Stuhl oder Raum anbieten →
          </a>
        </div>
        <section style={{ padding: '0 var(--pad)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rentals.map(r => (
              <div key={r.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--cream)' }}>
                      {r.name || typeLabels[r.type] || r.type}
                    </div>
                    <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginTop: 2 }}>
                      {r.salon.name} &middot; {r.salon.city}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--gold)' }}>
                      {(r.price_per_day_cents / 100).toFixed(0)} &euro;/Tag
                    </div>
                    {r.price_per_month_cents && (
                      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>
                        {(r.price_per_month_cents / 100).toFixed(0)} &euro;/Monat
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
