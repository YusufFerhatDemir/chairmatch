'use client'

import { useEffect, useState } from 'react'
import { StatCard, SectionHeader, MiniChart, EmptyState } from '@/components/dashboard'

interface InvestorData {
  platform: {
    users: number; salons: number; verifiedSalons: number; providers: number
    bookings: number; orders: number; reviews: number; cities: number; categories: number
  }
  revenue: { bookingRevenue: number; orderRevenue: number; totalRevenue: number }
  growth: { userGrowth: Record<string, number> }
}

const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

export default function InvestorPage() {
  const [data, setData] = useState<InvestorData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/investor')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div style={{ color: 'var(--stone)', fontSize: 14 }}>Lade Investoren-Daten...</div>
    </div>
  )

  if (!data) return <EmptyState icon="🔒" title="Zugriff verweigert" description="Bitte mit Investor-Konto anmelden." />

  const p = data.platform
  const growthLabels = Object.keys(data.growth.userGrowth)
  const growthValues = Object.values(data.growth.userGrowth)

  return (
    <div>
      {/* Company summary */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(176,144,96,0.08), rgba(176,144,96,0.02))',
        border: '1px solid rgba(176,144,96,0.15)',
        borderRadius: 16, padding: '24px 20px', marginBottom: 28,
      }}>
        <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', margin: '0 0 8px', letterSpacing: 2 }}>CHAIRMATCH</h2>
        <p style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.7, margin: 0 }}>
          Deutschlands erste provisionsfreie Beauty-Plattform. Salons zahlen 0% Provision auf Buchungen.
          Wir digitalisieren die Beauty-Branche mit Buchungssystem, Stuhlvermietung, Marketplace und Compliance-Tools.
        </p>
        <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
          <div><span style={{ fontSize: 11, color: 'var(--stone)' }}>Rechtsform</span><br/><span style={{ fontSize: 13, color: 'var(--cream)', fontWeight: 600 }}>GmbH (i. Gr.)</span></div>
          <div><span style={{ fontSize: 11, color: 'var(--stone)' }}>Standort</span><br/><span style={{ fontSize: 13, color: 'var(--cream)', fontWeight: 600 }}>Deutschland</span></div>
          <div><span style={{ fontSize: 11, color: 'var(--stone)' }}>Phase</span><br/><span style={{ fontSize: 13, color: 'var(--cream)', fontWeight: 600 }}>Pre-Seed</span></div>
          <div><span style={{ fontSize: 11, color: 'var(--stone)' }}>Modell</span><br/><span style={{ fontSize: 13, color: 'var(--cream)', fontWeight: 600 }}>SaaS + Marketplace</span></div>
        </div>
      </div>

      {/* Traction KPIs */}
      <SectionHeader title="Plattform-Traction" subtitle="Live-Daten aus der Produktion" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        <StatCard label="Registrierte Nutzer" value={p.users} icon="👥" color="gold" />
        <StatCard label="Salons" value={p.salons} icon="💇" sub={`${p.verifiedSalons} verifiziert`} color="gold" />
        <StatCard label="Anbieter" value={p.providers} icon="🏢" color="blue" />
        <StatCard label="Buchungen" value={p.bookings} icon="📅" color="green" />
        <StatCard label="Bestellungen" value={p.orders} icon="📦" color="blue" />
        <StatCard label="Bewertungen" value={p.reviews} icon="⭐" color="gold" />
        <StatCard label="Städte" value={p.cities} icon="📍" color="green" />
        <StatCard label="Kategorien" value={p.categories} icon="🏷" color="gold" />
      </div>

      {/* Revenue */}
      <SectionHeader title="Umsatz" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
        <StatCard label="Buchungsumsatz" value={fmt(data.revenue.bookingRevenue)} color="green" />
        <StatCard label="Shop-Umsatz" value={fmt(data.revenue.orderRevenue)} color="blue" />
        <StatCard label="Gesamt" value={fmt(data.revenue.totalRevenue)} color="gold" />
      </div>

      {/* Growth chart */}
      <SectionHeader title="Nutzerwachstum" subtitle="Letzte 6 Monate" />
      <div style={{ background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.08)', borderRadius: 12, padding: 20, marginBottom: 32 }}>
        {growthValues.length > 0 ? (
          <MiniChart
            data={growthValues}
            labels={growthLabels.map(k => k.slice(5))}
            height={140}
            color="var(--gold2)"
            type="bar"
          />
        ) : (
          <EmptyState icon="📈" title="Noch keine Wachstumsdaten" description="Daten werden angezeigt, sobald Nutzer registriert sind." />
        )}
      </div>

      {/* Market opportunity */}
      <SectionHeader title="Marktchance" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'TAM Deutschland', value: '83.000+', sub: 'Friseursalons' },
          { label: 'Beauty-Markt', value: '€15 Mrd.', sub: 'Jährlich in DE' },
          { label: 'Digitalisierungsgrad', value: '<5%', sub: 'Aktuell digital gebucht' },
          { label: 'Stuhlvermietung', value: '€2 Mrd.', sub: 'Marktvolumen geschätzt' },
        ].map(m => (
          <div key={m.label} style={{
            background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.08)',
            borderRadius: 12, padding: '16px 14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold2)' }}>{m.value}</div>
            <div style={{ fontSize: 12, color: 'var(--cream)', fontWeight: 600, marginTop: 4 }}>{m.label}</div>
            <div style={{ fontSize: 10, color: 'var(--stone)', marginTop: 2 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Business model */}
      <SectionHeader title="Geschäftsmodell" />
      <div style={{ background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.08)', borderRadius: 12, padding: 20, marginBottom: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { title: 'Starter (Kostenlos)', items: ['Basis-Profil', 'Buchungssystem', '0% Provision'] },
            { title: 'Premium (€49/Monat)', items: ['Erweiterte Statistiken', 'Marketing-Tools', 'Priority-Support'] },
            { title: 'Gold (€99/Monat)', items: ['Alle Features', 'API-Zugang', 'Dedicated Account Manager'] },
            { title: 'Marketplace', items: ['5-10% Produktvermittlung', '12% Stuhlvermietung', '15% Neukunden-Provision'] },
          ].map(tier => (
            <div key={tier.title}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold2)', marginBottom: 8 }}>{tier.title}</p>
              <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'disc' }}>
                {tier.items.map(item => (
                  <li key={item} style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 4, lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap */}
      <SectionHeader title="Roadmap & Meilensteine" />
      <div style={{ background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.08)', borderRadius: 12, padding: 20, marginBottom: 32 }}>
        {[
          { q: 'Q1 2026', status: 'done', items: ['MVP Live', 'PWA App Store Ready', 'Buchungssystem', 'Stuhlvermietung'] },
          { q: 'Q2 2026', status: 'active', items: ['Marketplace Launch', 'Stripe Payments', 'Commission System', 'Investor Portal'] },
          { q: 'Q3 2026', status: 'planned', items: ['B2B Großhändler-Marktplatz', 'Native App (iOS/Android)', '50 aktive Salons'] },
          { q: 'Q4 2026', status: 'planned', items: ['Expansion DE-weit', 'Premium Subscriptions', 'Break-Even Target'] },
        ].map(m => (
          <div key={m.q} style={{ display: 'flex', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(176,144,96,0.06)' }}>
            <div style={{ minWidth: 70 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
                background: m.status === 'done' ? 'rgba(74,138,90,0.12)' : m.status === 'active' ? 'rgba(176,144,96,0.12)' : 'rgba(245,245,247,0.05)',
                color: m.status === 'done' ? 'var(--green)' : m.status === 'active' ? 'var(--gold2)' : 'var(--stone)',
              }}>{m.q}</span>
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'disc' }}>
              {m.items.map(item => (
                <li key={item} style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 3, lineHeight: 1.5 }}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Funding */}
      <SectionHeader title="Finanzierung" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
        <div style={{ background: 'rgba(176,144,96,0.06)', border: '1px solid rgba(176,144,96,0.12)', borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold2)' }}>€150K</div>
          <div style={{ fontSize: 12, color: 'var(--cream)', fontWeight: 600, marginTop: 4 }}>Pre-Seed Ziel</div>
        </div>
        <div style={{ background: 'rgba(176,144,96,0.06)', border: '1px solid rgba(176,144,96,0.12)', borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold2)' }}>Monat 18</div>
          <div style={{ fontSize: 12, color: 'var(--cream)', fontWeight: 600, marginTop: 4 }}>Break-Even Target</div>
        </div>
        <div style={{ background: 'rgba(176,144,96,0.06)', border: '1px solid rgba(176,144,96,0.12)', borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold2)' }}>SaaS + GMV</div>
          <div style={{ fontSize: 12, color: 'var(--cream)', fontWeight: 600, marginTop: 4 }}>Revenue-Modell</div>
        </div>
      </div>

      {/* Investor deck placeholder */}
      <SectionHeader title="Dokumente" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <a href="/pitch" style={{
          background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.12)', borderRadius: 12,
          padding: 20, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 28 }}>📊</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', margin: 0 }}>Pitch Deck</p>
            <p style={{ fontSize: 11, color: 'var(--stone)', margin: '2px 0 0' }}>Online ansehen</p>
          </div>
        </a>
        <div style={{
          background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.12)', borderRadius: 12,
          padding: 20, display: 'flex', alignItems: 'center', gap: 12, opacity: 0.6,
        }}>
          <span style={{ fontSize: 28 }}>📋</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', margin: 0 }}>Cap Table</p>
            <p style={{ fontSize: 11, color: 'var(--stone)', margin: '2px 0 0' }}>Wird vorbereitet</p>
          </div>
        </div>
        <div style={{
          background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.12)', borderRadius: 12,
          padding: 20, display: 'flex', alignItems: 'center', gap: 12, opacity: 0.6,
        }}>
          <span style={{ fontSize: 28 }}>📑</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', margin: 0 }}>Term Sheet</p>
            <p style={{ fontSize: 11, color: 'var(--stone)', margin: '2px 0 0' }}>Auf Anfrage</p>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div style={{ marginTop: 40, textAlign: 'center', padding: 24, background: 'var(--c1)', borderRadius: 12, border: '1px solid rgba(176,144,96,0.08)' }}>
        <p style={{ fontSize: 13, color: 'var(--cream)', fontWeight: 600 }}>Kontakt für Investoren</p>
        <p style={{ fontSize: 12, color: 'var(--gold2)', marginTop: 4 }}>legal@chairmatch.de</p>
      </div>
    </div>
  )
}
