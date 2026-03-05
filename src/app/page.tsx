export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export default async function HomePage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  const salons = await prisma.salon.findMany({
    where: { isActive: true },
    include: {
      services: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, take: 3 },
    },
    orderBy: [{ avgRating: 'desc' }],
    take: 20,
  })

  return (
    <div className="shell">
      <div className="screen">
        {/* Logo Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0 10px' }}>
          <div style={{ animation: 'logoFloat 3s ease-in-out infinite, logoGlow 3s ease-in-out infinite', display: 'inline-block' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo_lockup_512x384.png" alt="ChairMatch" style={{ height: 140, objectFit: 'contain' }} />
          </div>
        </div>

        {/* Categories Grid */}
        <section style={{ padding: '0 var(--pad)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {categories.map((cat) => (
              <a key={cat.id} href={`/category/${cat.slug}`} style={{ textDecoration: 'none' }}>
                <div className="catcard">
                  <div className="caticon">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cat.iconUrl || `/icons/${getCategoryIcon(cat.slug)}`}
                      alt={cat.label}
                    />
                  </div>
                  <div className="catlbl">{cat.label}</div>
                  <div className="catsub">{cat.description || ''}</div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Salons List */}
        <section style={{ padding: '24px var(--pad) 0' }}>
          <h2 className="cinzel" style={{ fontSize: 'var(--font-lg)', color: 'var(--gold2)', marginBottom: 16 }}>
            Top Salons
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {salons.map((s) => (
              <a key={s.id} href={`/salon/${s.slug || s.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: 'var(--c3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 700, color: 'var(--cream)',
                    flexShrink: 0,
                  }}>
                    {s.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logoUrl} alt={s.name} style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover' }} />
                    ) : s.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-md)', color: 'var(--cream)' }}>{s.name}</div>
                    <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginTop: 2 }}>{s.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 'var(--font-sm)', color: 'var(--gold)' }}>★ {Number(s.avgRating).toFixed(1)}</span>
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--stone2)' }}>{s.city}</span>
                      {s.isVerified && <span className="badge badge-gold" style={{ fontSize: 8 }}>✓ Verifiziert</span>}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}

function getCategoryIcon(slug: string): string {
  const map: Record<string, string> = {
    barber: '01_barbershop_256x384.png',
    friseur: '02_friseur_256x384.png',
    kosmetik: '03_kosmetik_256x384.png',
    aesthetik: '04_aesthetik_256x384.png',
    nail: '05_nagelstudio_256x384.png',
    massage: '06_massage_256x384.png',
    lash: '07_lash_brows_256x384.png',
    arzt: '08_arzt_klinik_256x384.png',
    opraum: '09_op_raum_512x384.png',
  }
  return map[slug] || '01_barbershop_256x384.png'
}
