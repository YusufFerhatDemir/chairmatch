import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'ChairMatch Statistik — Plattform in Zahlen',
  description: 'Aktuelle Zahlen und Statistiken der ChairMatch Beauty-Plattform: Salons, Buchungen, Nutzer und mehr.',
}

export const dynamic = 'force-dynamic'

export default async function StatistikPage() {
  const supabase = getSupabaseAdmin()

  const [
    { count: userCount },
    { count: salonCount },
    { count: bookingCount },
    { count: reviewCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('salons').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
  ])

  const { data: salonCities } = await supabase.from('salons').select('city').not('city', 'is', null)
  const cities = new Set((salonCities || []).map(s => s.city).filter(Boolean))

  const { data: salonCats } = await supabase.from('salons').select('category').not('category', 'is', null)
  const catCounts: Record<string, number> = {}
  for (const s of salonCats || []) {
    if (s.category) catCounts[s.category] = (catCounts[s.category] || 0) + 1
  }

  const CAT_LABELS: Record<string, string> = {
    barber: 'Barbershop', friseur: 'Friseur', kosmetik: 'Kosmetik', aesthetik: 'Ästhetik',
    nail: 'Nagelstudio', massage: 'Massage', lash: 'Lash & Brows', arzt: 'Arzt / Klinik', opraum: 'OP-Raum',
  }

  const stats = [
    { value: userCount ?? 0, label: 'Registrierte Nutzer', icon: '👥' },
    { value: salonCount ?? 0, label: 'Salons', icon: '💇' },
    { value: bookingCount ?? 0, label: 'Buchungen', icon: '📅' },
    { value: reviewCount ?? 0, label: 'Bewertungen', icon: '⭐' },
    { value: cities.size, label: 'Städte', icon: '📍' },
    { value: Object.keys(catCounts).length, label: 'Kategorien', icon: '🏷' },
  ]

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', padding: '32px 0 28px' }}>
          <Link href="/" style={{ color: 'var(--stone)', fontSize: 11, textDecoration: 'none', display: 'block', marginBottom: 16 }}>
            ← Zurück zur App
          </Link>
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', letterSpacing: 2, margin: 0 }}>
            CHAIRMATCH IN ZAHLEN
          </h1>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginTop: 8, lineHeight: 1.6 }}>
            Live-Statistiken unserer Beauty-Plattform
          </p>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 32 }}>
          {stats.map(s => (
            <div key={s.label} style={{
              background: 'rgba(176,144,96,0.06)',
              border: '1px solid rgba(176,144,96,0.12)',
              borderRadius: 16,
              padding: '20px 16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--gold2)', letterSpacing: -0.5 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 600, marginTop: 4, letterSpacing: 0.3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Categories */}
        {Object.keys(catCounts).length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Salons nach Kategorie</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(catCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count]) => {
                  const max = Math.max(...Object.values(catCounts), 1)
                  const pct = (count / max) * 100
                  return (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--cream)', fontWeight: 600, minWidth: 100 }}>
                        {CAT_LABELS[cat] || cat}
                      </span>
                      <div style={{ flex: 1, height: 8, background: 'rgba(176,144,96,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gold2)', borderRadius: 4, minWidth: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--gold2)', fontWeight: 700, minWidth: 24, textAlign: 'right' }}>{count}</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Cities */}
        {cities.size > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Aktive Städte</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Array.from(cities).map(city => (
                <span key={city} style={{
                  fontSize: 12, color: 'var(--gold2)', fontWeight: 600,
                  padding: '6px 12px', background: 'rgba(176,144,96,0.08)',
                  border: '1px solid rgba(176,144,96,0.12)', borderRadius: 8,
                }}>
                  {city}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Platform features */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--cream)', marginBottom: 16 }}>Unsere Plattform</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[
              { val: '0%', label: 'Provision für Salons' },
              { val: '24/7', label: 'Online-Buchung' },
              { val: 'PWA', label: 'App ohne Download' },
              { val: 'DSGVO', label: 'Datenschutz konform' },
            ].map(f => (
              <div key={f.label} style={{
                padding: '14px 12px', background: 'rgba(176,144,96,0.06)', borderRadius: 12,
                border: '1px solid rgba(176,144,96,0.10)',
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold2)' }}>{f.val}</div>
                <div style={{ fontSize: 10, color: 'var(--stone)', marginTop: 4 }}>{f.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/register/anbieter" className="bgold" style={{ textDecoration: 'none', display: 'inline-block', padding: '12px 28px' }}>
            Salon jetzt registrieren
          </Link>
        </div>

        <Footer />
        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}
