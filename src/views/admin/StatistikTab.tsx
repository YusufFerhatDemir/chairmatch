import { useEffect, useState } from 'react'
import { useStatistikStore } from '@/stores/statistikStore'
import { Button } from '@/components/ui/Button'

/* ═══ STYLES ═══ */

const s = {
  wrap: { padding: 'var(--pad)' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 10,
    marginBottom: 20,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    background: 'var(--c2)',
    border: '1px solid var(--border)',
    textAlign: 'center' as const,
  },
  cardIcon: { fontSize: 20, marginBottom: 4 },
  cardNum: { fontSize: 22, fontWeight: 700 as const, color: 'var(--gold2)' },
  cardLabel: { fontSize: 11, color: 'var(--stone)', fontWeight: 600 as const, marginTop: 2 },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 700 as const,
    fontSize: 15,
    color: 'var(--gold2)',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  barContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 12,
    color: 'var(--cream)',
    width: 120,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: 18,
    borderRadius: 9,
    background: 'var(--c3)',
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  barFill: (pct: number, color: string) => ({
    width: `${Math.min(100, pct)}%`,
    height: '100%',
    borderRadius: 9,
    background: color,
    transition: 'width 0.5s ease',
    minWidth: pct > 0 ? 4 : 0,
  }),
  barValue: {
    fontSize: 11,
    color: 'var(--stone)',
    fontWeight: 700 as const,
    width: 50,
    textAlign: 'right' as const,
    flexShrink: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13,
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    borderBottom: '2px solid var(--border)',
    fontSize: 11,
    fontWeight: 700 as const,
    color: 'var(--gold2)',
    textTransform: 'uppercase' as const,
  },
  td: {
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
    color: 'var(--cream)',
  },
}

function formatEuro(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

/* ═══ STAT CARD ═══ */

function StatCard({ icon, value, label, color }: {
  icon: string
  value: number | string
  label: string
  color?: string
}) {
  return (
    <div style={s.card}>
      <div style={s.cardIcon}>{icon}</div>
      <div style={{ ...s.cardNum, color: color || 'var(--gold2)' }}>{value}</div>
      <div style={s.cardLabel}>{label}</div>
    </div>
  )
}

/* ═══ BAR CHART ═══ */

function BarChart({ data, color }: {
  data: { label: string; value: number }[]
  color: string
}) {
  const max = Math.max(1, ...data.map(d => d.value))
  return (
    <div>
      {data.map((d, i) => (
        <div key={i} style={s.barContainer}>
          <div style={s.barLabel}>{d.label}</div>
          <div style={s.barTrack}>
            <div style={s.barFill((d.value / max) * 100, color)} />
          </div>
          <div style={s.barValue as React.CSSProperties}>{d.value}</div>
        </div>
      ))}
    </div>
  )
}

/* ═══ MAIN COMPONENT ═══ */

export function StatistikTab() {
  const store = useStatistikStore()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!loaded) {
      store.loadStats()
      setLoaded(true)
    }
  }, [loaded])

  const st = store.stats

  if (store.loading || !st) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--stone)' }}>
        Lade Statistiken...
      </div>
    )
  }

  if (store.error) {
    return (
      <div style={{ padding: 20, color: '#f66' }}>⚠️ {store.error}</div>
    )
  }

  return (
    <div style={s.wrap}>
      {/* Refresh */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="outline" onClick={() => store.loadStats()}>
          🔄 Aktualisieren
        </Button>
      </div>

      {/* ═══ USERS ═══ */}
      <div style={s.section}>
        <div style={s.sectionTitle}>👥 Benutzer</div>
        <div style={s.grid}>
          <StatCard icon="👥" value={st.totalUsers} label="Gesamt" />
          <StatCard icon="👤" value={st.kundeCount} label="Kunden" color="#7EC8E3" />
          <StatCard icon="💼" value={st.anbieterCount} label="Anbieter" color="#82ca9d" />
          <StatCard icon="🛡" value={st.adminCount} label="Admins" color="#C8A84B" />
          <StatCard icon="⭐" value={st.superAdminCount} label="Super Admin" color="#E8D06A" />
          <StatCard icon="🔴" value={st.inactiveUsers} label="Inaktiv" color="#f66" />
        </div>

        <BarChart
          color="var(--gold)"
          data={[
            { label: 'Kunden', value: st.kundeCount },
            { label: 'Anbieter', value: st.anbieterCount },
            { label: 'Admins', value: st.adminCount },
            { label: 'Super Admin', value: st.superAdminCount },
          ]}
        />
      </div>

      {/* ═══ PROVIDERS ═══ */}
      <div style={s.section}>
        <div style={s.sectionTitle}>🏪 Anbieter</div>
        <div style={s.grid}>
          <StatCard icon="🏪" value={st.totalProviders} label="Gesamt" />
          <StatCard icon="🟢" value={st.liveProviders} label="Online" color="#82ca9d" />
          <StatCard icon="✅" value={st.verifiedProviders} label="Verifiziert" color="#7EC8E3" />
        </div>
      </div>

      {/* ═══ BOOKINGS ═══ */}
      <div style={s.section}>
        <div style={s.sectionTitle}>📅 Buchungen</div>
        <div style={s.grid}>
          <StatCard icon="📅" value={st.totalBookings} label="Gesamt" />
          <StatCard icon="📆" value={st.todayBookings} label="Heute" color="#82ca9d" />
          <StatCard icon="📊" value={st.weekBookings} label="Diese Woche" color="#7EC8E3" />
          <StatCard icon="📈" value={st.monthBookings} label="Diesen Monat" color="#C8A84B" />
          <StatCard icon="✅" value={st.confirmedBookings} label="Bestätigt" color="#6ABF80" />
          <StatCard icon="❌" value={st.cancelledBookings} label="Storniert" color="#f66" />
        </div>
      </div>

      {/* ═══ REVENUE ═══ */}
      <div style={s.section}>
        <div style={s.sectionTitle}>💰 Umsatz</div>
        <div style={s.grid}>
          <StatCard icon="💰" value={formatEuro(st.totalRevenueCents)} label="Gesamt" />
          <StatCard icon="📊" value={formatEuro(st.weekRevenueCents)} label="Diese Woche" color="#82ca9d" />
          <StatCard icon="📈" value={formatEuro(st.monthRevenueCents)} label="Diesen Monat" color="#C8A84B" />
        </div>
      </div>

      {/* ═══ TOP PROVIDERS ═══ */}
      {st.topProviders.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>🏆 Top Anbieter</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>Anbieter</th>
                <th style={s.th}>Buchungen</th>
                <th style={s.th}>Umsatz</th>
              </tr>
            </thead>
            <tbody>
              {st.topProviders.map((p, i) => (
                <tr key={i}>
                  <td style={s.td}>{i + 1}</td>
                  <td style={s.td}>{p.name}</td>
                  <td style={s.td}>{p.bookings}</td>
                  <td style={s.td}>{formatEuro(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ PROMO CODES ═══ */}
      <div style={s.section}>
        <div style={s.sectionTitle}>🎫 Promo Codes</div>
        <div style={s.grid}>
          <StatCard icon="🎫" value={st.totalPromoCodes} label="Gesamt" />
          <StatCard icon="✅" value={st.activePromoCodes} label="Aktiv" color="#82ca9d" />
          <StatCard icon="🔢" value={st.totalPromoUsage} label="Nutzungen" color="#7EC8E3" />
        </div>
      </div>

      {/* ═══ WHATSAPP ═══ */}
      <div style={s.section}>
        <div style={s.sectionTitle}>💬 WhatsApp</div>
        <div style={s.grid}>
          <StatCard icon="💬" value={st.totalMessages} label="Gesamt" />
          <StatCard icon="📤" value={st.sentMessages} label="Gesendet" color="#82ca9d" />
          <StatCard icon="✅" value={st.deliveredMessages} label="Zugestellt" color="#7EC8E3" />
          <StatCard icon="❌" value={st.failedMessages} label="Fehler" color="#f66" />
        </div>

        {st.totalMessages > 0 && (
          <BarChart
            color="#25D366"
            data={[
              { label: 'Gesendet', value: st.sentMessages },
              { label: 'Zugestellt', value: st.deliveredMessages },
              { label: 'Fehler', value: st.failedMessages },
            ]}
          />
        )}
      </div>
    </div>
  )
}
