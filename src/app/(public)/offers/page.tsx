export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import Link from 'next/link'

interface Offer {
  id: string
  title: string
  description: string | null
  discount_percent: number | null
  salon: {
    id: string
    name: string
    slug: string | null
    city: string | null
  }
}

export default async function OffersPage() {
  let offers: Offer[] = []

  try {
    const supabase = getSupabaseAdmin()

    const { data } = await supabase
      .from('offers')
      .select('id, title, description, discount_percent, salon:salons(id, name, slug, city)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (data) offers = data as unknown as Offer[]
  } catch {
    // DB connection failed — render empty state
  }

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky">
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)' }}>Angebote</h1>
        </div>
        <section style={{ padding: '0 var(--pad)' }}>
          {offers.length === 0 ? (
            <p style={{ color: 'var(--stone)', textAlign: 'center', padding: '40px 0' }}>Keine Angebote verf&uuml;gbar.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {offers.map(o => (
                <Link key={o.id} href={`/salon/${o.salon.slug || o.salon.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 14,
                      background: 'var(--c3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 700, color: 'var(--cream)', flexShrink: 0,
                    }}>
                      {o.salon.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{o.title}</div>
                      <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)' }}>{o.salon.name} &middot; {o.salon.city}</div>
                      {o.description && (
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone2)', marginTop: 2 }}>{o.description}</div>
                      )}
                    </div>
                    {o.discount_percent && (
                      <span className="badge badge-green" style={{ fontSize: 'var(--font-md)', fontWeight: 700 }}>
                        -{o.discount_percent}%
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
