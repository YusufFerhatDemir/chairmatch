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

export default function InvestorMetrikenPage() {
  const [data, setData] = useState<InvestorData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/investor').then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--stone)' }}>Laden...</div>
  if (!data) return <EmptyState icon="🔒" title="Keine Daten" />

  const growthLabels = Object.keys(data.growth.userGrowth)
  const growthValues = Object.values(data.growth.userGrowth)

  return (
    <div>
      <SectionHeader title="Plattform-Metriken" subtitle="Echtzeit-Daten aus der Produktion" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        <StatCard label="Nutzer" value={data.platform.users} color="gold" />
        <StatCard label="Salons" value={data.platform.salons} sub={`${data.platform.verifiedSalons} verifiziert`} color="gold" />
        <StatCard label="Buchungen" value={data.platform.bookings} color="green" />
        <StatCard label="Bestellungen" value={data.platform.orders} color="blue" />
        <StatCard label="Bewertungen" value={data.platform.reviews} color="gold" />
        <StatCard label="Städte" value={data.platform.cities} color="green" />
      </div>

      <SectionHeader title="Nutzerwachstum" subtitle="Monatlich" />
      <div style={{ background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.08)', borderRadius: 12, padding: 20, marginBottom: 32 }}>
        {growthValues.length > 0 ? (
          <MiniChart data={growthValues} labels={growthLabels.map(k => k.slice(5))} height={160} color="var(--gold2)" type="bar" />
        ) : (
          <EmptyState icon="📈" title="Noch keine Wachstumsdaten" />
        )}
      </div>

      <SectionHeader title="Revenue-Übersicht" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <StatCard label="Buchungsumsatz" value={`€${data.revenue.bookingRevenue.toFixed(0)}`} color="green" />
        <StatCard label="Shop-Umsatz" value={`€${data.revenue.orderRevenue.toFixed(0)}`} color="blue" />
        <StatCard label="Gesamt" value={`€${data.revenue.totalRevenue.toFixed(0)}`} color="gold" />
      </div>
    </div>
  )
}
