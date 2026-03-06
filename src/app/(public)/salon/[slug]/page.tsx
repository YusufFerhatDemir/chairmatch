export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function SalonDetailPage({ params }: Props) {
  const { slug } = await params

  try {
    const supabase = getSupabaseAdmin()

    // 1. Get salon by slug first, fallback to id
    let salon = null
    const { data: bySlug } = await supabase
      .from('salons')
      .select('*')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()
    if (bySlug) {
      salon = bySlug
    } else {
      const { data: byId } = await supabase
        .from('salons')
        .select('*')
        .eq('id', slug)
        .limit(1)
        .maybeSingle()
      salon = byId
    }

    if (!salon) notFound()

    // 2. Get active services ordered by sort_order
    const { data: services } = await supabase
      .from('services')
      .select('*')
      .eq('salon_id', salon.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    // 3. Get reviews with customer name, ordered by created_at desc, limit 10
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*, customer:profiles(full_name)')
      .eq('salon_id', salon.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // 4. Get active staff
    const { data: staff } = await supabase
      .from('staff')
      .select('*')
      .eq('salon_id', salon.id)
      .eq('is_active', true)

    // 5. Get available rental equipment
    const { data: rentalEquipment } = await supabase
      .from('rental_equipment')
      .select('*')
      .eq('salon_id', salon.id)
      .eq('is_available', true)

    const salonServices = services || []
    const salonReviews = reviews || []
    const salonStaff = staff || []
    const salonRentals = rentalEquipment || []

    // Parse opening hours from JSONB
    const openingHoursData = (salon.opening_hours || {}) as Record<string, { open: string; close: string } | null>
    const dayLabels: Record<string, string> = { mo: 'Mo', di: 'Di', mi: 'Mi', do: 'Do', fr: 'Fr', sa: 'Sa', so: 'So' }

    return (
      <div className="shell">
        <div className="screen">
          {/* Header */}
          <div style={{ padding: '20px var(--pad)', background: 'var(--c1)' }}>
            <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
              &larr; Zur&uuml;ck
            </Link>
            <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 12 }}>
              {salon.name}
            </h1>
            <p style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', marginTop: 4 }}>{salon.description}</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
              <span style={{ color: 'var(--gold)', fontWeight: 700 }}>&star; {Number(salon.avg_rating).toFixed(1)}</span>
              <span style={{ color: 'var(--stone2)', fontSize: 'var(--font-sm)' }}>
                {salon.review_count} Bewertungen
              </span>
              <span style={{ color: 'var(--stone2)', fontSize: 'var(--font-sm)' }}>{salon.city}</span>
            </div>
          </div>

          {/* Services */}
          <section style={{ padding: '16px var(--pad)' }}>
            <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>
              Dienstleistungen
            </h2>
            {salonServices.map(s => (
              <div key={s.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--cream)' }}>{s.name}</div>
                  <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)' }}>{s.duration_minutes} Min.</div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{(s.price_cents / 100).toFixed(0)} &euro;</div>
              </div>
            ))}
            <Link href={`/booking/${salon.id}`} className="bgold" style={{ display: 'block', marginTop: 16, textDecoration: 'none' }}>
              Termin buchen
            </Link>
          </section>

          {/* Team */}
          {salonStaff.length > 0 && (
            <section style={{ padding: '16px var(--pad)' }}>
              <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>
                Team
              </h2>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
                {salonStaff.map(member => (
                  <div key={member.id} style={{
                    textAlign: 'center', minWidth: 80, flexShrink: 0,
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: 'var(--c3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, color: 'var(--cream)', margin: '0 auto 6px',
                    }}>
                      {member.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={member.avatar_url} alt={member.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : member.name.charAt(0)}
                    </div>
                    <div style={{ fontSize: 'var(--font-sm)', color: 'var(--cream)' }}>{member.name}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>{member.title}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reviews */}
          <section style={{ padding: '16px var(--pad)' }}>
            <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>
              Bewertungen ({salon.review_count})
            </h2>
            {salonReviews.map(r => (
              <div key={r.id} className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--cream)' }}>{r.customer?.full_name || 'Gast'}</span>
                  <span style={{ color: 'var(--gold)', fontSize: 'var(--font-sm)' }}>{'★'.repeat(r.rating)}</span>
                </div>
                {r.comment && <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)' }}>{r.comment}</p>}
                {r.reply && (
                  <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
                    <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', fontStyle: 'italic' }}>
                      Antwort: {r.reply}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* Opening Hours */}
          <section style={{ padding: '16px var(--pad)' }}>
            <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>
              &Ouml;ffnungszeiten
            </h2>
            {Object.entries(dayLabels).map(([key, label]) => {
              const h = openingHoursData[key]
              return (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--cream)', fontSize: 'var(--font-md)' }}>{label}</span>
                  <span style={{ color: 'var(--stone)', fontSize: 'var(--font-md)' }}>
                    {h ? `${h.open} – ${h.close}` : 'Geschlossen'}
                  </span>
                </div>
              )
            })}
          </section>

          <div style={{ height: 40 }} />
        </div>
      </div>
    )
  } catch {
    notFound()
  }
}
