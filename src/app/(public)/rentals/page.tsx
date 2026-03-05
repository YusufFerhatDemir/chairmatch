export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export default async function RentalsPage() {
  const rentals = await prisma.rentalEquipment.findMany({
    where: { isAvailable: true },
    include: {
      salon: { select: { name: true, city: true } },
    },
    orderBy: { pricePerDayCents: 'asc' },
  })

  const typeLabels: Record<string, string> = {
    stuhl: 'Stuhl',
    liege: 'Liege',
    raum: 'Raum',
    opraum: 'OP-Raum',
  }

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky">
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)' }}>Stuhlvermietung</h1>
          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginTop: 4 }}>
            {rentals.length} Angebote verfügbar
          </p>
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
                      {r.salon.name} · {r.salon.city}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--gold)' }}>
                      {(r.pricePerDayCents / 100).toFixed(0)} €/Tag
                    </div>
                    {r.pricePerMonthCents && (
                      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>
                        {(r.pricePerMonthCents / 100).toFixed(0)} €/Monat
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
