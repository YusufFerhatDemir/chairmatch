export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function SalonDetailPage({ params }: Props) {
  const { slug } = await params

  const salon = await prisma.salon.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: {
      services: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { customer: { select: { fullName: true } } },
      },
      staff: { where: { isActive: true } },
      rentalEquipment: { where: { isAvailable: true } },
    },
  })

  if (!salon) notFound()

  // Parse opening hours from JSONB
  const openingHoursData = (salon.openingHours || {}) as Record<string, { open: string; close: string } | null>
  const dayLabels: Record<string, string> = { mo: 'Mo', di: 'Di', mi: 'Mi', do: 'Do', fr: 'Fr', sa: 'Sa', so: 'So' }

  return (
    <div className="shell">
      <div className="screen">
        {/* Header */}
        <div style={{ padding: '20px var(--pad)', background: 'var(--c1)' }}>
          <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
            ← Zurück
          </Link>
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 12 }}>
            {salon.name}
          </h1>
          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', marginTop: 4 }}>{salon.description}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>★ {Number(salon.avgRating).toFixed(1)}</span>
            <span style={{ color: 'var(--stone2)', fontSize: 'var(--font-sm)' }}>
              {salon.reviewCount} Bewertungen
            </span>
            <span style={{ color: 'var(--stone2)', fontSize: 'var(--font-sm)' }}>{salon.city}</span>
          </div>
        </div>

        {/* Services */}
        <section style={{ padding: '16px var(--pad)' }}>
          <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>
            Dienstleistungen
          </h2>
          {salon.services.map(s => (
            <div key={s.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--cream)' }}>{s.name}</div>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)' }}>{s.durationMinutes} Min.</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{(s.priceCents / 100).toFixed(0)} €</div>
            </div>
          ))}
          <Link href={`/booking/${salon.id}`} className="bgold" style={{ display: 'block', marginTop: 16, textDecoration: 'none' }}>
            Termin buchen
          </Link>
        </section>

        {/* Team */}
        {salon.staff.length > 0 && (
          <section style={{ padding: '16px var(--pad)' }}>
            <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>
              Team
            </h2>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
              {salon.staff.map(member => (
                <div key={member.id} style={{
                  textAlign: 'center', minWidth: 80, flexShrink: 0,
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'var(--c3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, color: 'var(--cream)', margin: '0 auto 6px',
                  }}>
                    {member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.avatarUrl} alt={member.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
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
            Bewertungen ({salon.reviewCount})
          </h2>
          {salon.reviews.map(r => (
            <div key={r.id} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: 'var(--cream)' }}>{r.customer?.fullName || 'Gast'}</span>
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
            Öffnungszeiten
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
}
