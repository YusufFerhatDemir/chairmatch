'use client'

import { StatCard, SectionHeader, DataTable, StatusBadge, EmptyState } from '@/components/dashboard'

interface Props {
  stats: {
    users: number
    activeUsers: number
    salons: number
    verifiedSalons: number
    providers: number
    bookings: number
    pendingBookings: number
    reviews: number
    orders: number
    totalRevenueCents: number
  }
  recentBookings: Record<string, unknown>[]
  recentUsers: Record<string, unknown>[]
  pendingSalons: Record<string, unknown>[]
}

export default function AdminDashboardClient({ stats, recentBookings, recentUsers, pendingSalons }: Props) {
  const revenue = (stats.totalRevenueCents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })

  return (
    <div>
      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
        <StatCard label="Benutzer gesamt" value={stats.users} icon="👥" sub={`${stats.activeUsers} aktiv`} color="gold" />
        <StatCard label="Salons" value={stats.salons} icon="💇" sub={`${stats.verifiedSalons} verifiziert`} color="gold" />
        <StatCard label="Anbieter" value={stats.providers} icon="🏢" color="blue" />
        <StatCard label="Buchungen" value={stats.bookings} icon="📅" sub={`${stats.pendingBookings} ausstehend`} color="green" />
        <StatCard label="Bewertungen" value={stats.reviews} icon="⭐" color="gold" />
        <StatCard label="Bestellungen" value={stats.orders} icon="📦" color="blue" />
        <StatCard label="Umsatz" value={revenue} icon="💰" color="green" />
      </div>

      {/* Pending verifications */}
      <div style={{ marginBottom: 32 }}>
        <SectionHeader title="Ausstehende Verifizierungen" subtitle={`${pendingSalons.length} Salons warten`} action={{ label: 'Alle anzeigen', href: '/admin/anbieter' }} />
        {pendingSalons.length > 0 ? (
          <DataTable
            columns={[
              { key: 'name', label: 'Salon' },
              { key: 'city', label: 'Stadt' },
              { key: 'category', label: 'Kategorie' },
              { key: 'created_at', label: 'Erstellt', render: (r) => {
                const d = r.created_at as string
                return d ? new Date(d).toLocaleDateString('de-DE') : '—'
              }},
            ]}
            data={pendingSalons}
            emptyMessage="Keine ausstehenden Verifizierungen"
          />
        ) : (
          <EmptyState icon="✅" title="Alles verifiziert" description="Keine Salons warten auf Verifizierung." />
        )}
      </div>

      {/* Recent bookings */}
      <div style={{ marginBottom: 32 }}>
        <SectionHeader title="Letzte Buchungen" action={{ label: 'Alle anzeigen', href: '/admin/buchungen' }} />
        <DataTable
          columns={[
            { key: 'service', label: 'Service', render: (r) => {
              const s = r.service as { name?: string } | null
              return s?.name || '—'
            }},
            { key: 'salon', label: 'Salon', render: (r) => {
              const s = r.salon as { name?: string } | null
              return s?.name || '—'
            }},
            { key: 'customer', label: 'Kunde', render: (r) => {
              const c = r.customer as { full_name?: string } | null
              return c?.full_name || 'Gast'
            }},
            { key: 'booking_date', label: 'Datum', render: (r) => {
              const d = r.booking_date as string
              const t = r.start_time as string
              return d ? `${new Date(d).toLocaleDateString('de-DE')} ${t?.slice(0, 5) || ''}` : '—'
            }},
            { key: 'price_cents', label: 'Preis', align: 'right', render: (r) => {
              const p = Number(r.price_cents) || 0
              return `${(p / 100).toFixed(2)} €`
            }},
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status || 'pending')} /> },
          ]}
          data={recentBookings}
          maxRows={10}
          emptyMessage="Noch keine Buchungen vorhanden"
        />
      </div>

      {/* Recent users */}
      <div style={{ marginBottom: 32 }}>
        <SectionHeader title="Neueste Benutzer" action={{ label: 'Alle anzeigen', href: '/admin/benutzer' }} />
        <DataTable
          columns={[
            { key: 'full_name', label: 'Name', render: (r) => String(r.full_name || 'Unbekannt') },
            { key: 'email', label: 'E-Mail' },
            { key: 'role', label: 'Rolle', render: (r) => <StatusBadge status={String(r.role || 'kunde')} /> },
            { key: 'is_active', label: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'aktiv' : 'inaktiv'} /> },
            { key: 'created_at', label: 'Erstellt', render: (r) => {
              const d = r.created_at as string
              return d ? new Date(d).toLocaleDateString('de-DE') : '—'
            }},
          ]}
          data={recentUsers}
          maxRows={10}
          emptyMessage="Noch keine Benutzer registriert"
        />
      </div>
    </div>
  )
}
