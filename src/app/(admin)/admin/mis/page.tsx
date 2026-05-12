'use client'

import { useEffect, useState, useCallback } from 'react'

interface MISData {
  kpis: {
    totalRevenue: number
    totalBookings: number
    activeUsers: number
    activeProviders: number
    avgRating: number
    conversionRate: number
  }
  revenueByMonth: Record<string, number>
  bookingsByMonth: Record<string, number>
  bookingsByStatus: Record<string, number>
  bookingsByDay: Record<string, number>
  usersByRole: Record<string, number>
  userGrowth: Record<string, number>
  providers: { total: number; active: number; verified: number }
  reviewsByMonth: Record<string, number>
  compliance: { rate: number; compliant: number; total: number }
  topSalonsByRevenue: { id: string; name: string; revenue: number }[]
  topSalonsByRating: { id: string; name: string; avgRating: number; reviewCount: number }[]
  bookingFunnel?: {
    visits: number
    bookingsStarted: number
    paid: number
    completed: number
    visitToBooking: number
    bookingToPaid: number
    paidToCompleted: number
  }
  providerHealthScores?: { id: string; name: string; score: number; breakdown: Record<string, number> }[]
  atRiskProviders?: { id: string; name: string; score: number; breakdown: Record<string, number> }[]
  recentErrors?: { id: string; message: string; level: string; created_at: string }[]
  onboardingPipeline?: { registered: number; docsUploaded: number; verified: number; active: number }
  platformRevenue?: {
    totalCommissionEur: number
    thisMonthEur: number
    todayEur: number
    bySource: {
      booking: number
      chairRental: number
      opraumRental: number
      subscription: number
      affiliate: number
    }
  }
  recentRefunds?: { id: string; type: string; amountEur: number; platformFeeEur: number; createdAt: string }[]
  recentTransactions?: { id: string; type: string; amountEur: number; platformFeeEur: number; status: string; createdAt: string }[]
  generatedAt?: string
}

const GOLD = '#D4AF37'
const GOLD_DIM = 'rgba(212,175,55,0.25)'
const GOLD_GLOW = 'rgba(212,175,55,0.08)'
const TEXT = '#F5F0E8'
const TEXT_DIM = '#8A8477'
const BORDER = 'rgba(212,175,55,0.12)'

const cardStyle: React.CSSProperties = {
  background: 'var(--c1)',
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 20,
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

function shortMonth(key: string): string {
  const [, m] = key.split('-')
  const months = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  return months[parseInt(m, 10) - 1] || m
}

function shortDay(key: string): string {
  return key.slice(8, 10) + '.'
}

function KPICard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ ...cardStyle, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '18px 12px' }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: GOLD, letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function BarChart({ data, label, formatValue }: { data: Record<string, number>; label: (key: string) => string; formatValue?: (n: number) => string }) {
  const entries = Object.entries(data)
  const maxVal = Math.max(...entries.map(([, v]) => v), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, padding: '0 4px' }}>
      {entries.map(([key, val]) => {
        const pct = (val / maxVal) * 100
        return (
          <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 9, color: TEXT_DIM, whiteSpace: 'nowrap' }}>{formatValue ? formatValue(val) : val}</div>
            <div style={{ width: '100%', maxWidth: 40, height: `${Math.max(pct, 2)}%`, background: `linear-gradient(180deg, ${GOLD} 0%, rgba(212,175,55,0.4) 100%)`, borderRadius: '4px 4px 0 0', minHeight: 2 }} />
            <div style={{ fontSize: 8, color: TEXT_DIM, whiteSpace: 'nowrap', transform: 'rotate(-45deg)', transformOrigin: 'top center' }}>{label(key)}</div>
          </div>
        )
      })}
    </div>
  )
}

function LineChart({ data, label }: { data: Record<string, number>; label: (key: string) => string }) {
  const entries = Object.entries(data)
  const maxVal = Math.max(...entries.map(([, v]) => v), 1)
  const W = 600, H = 140, padX = 30, padY = 20
  const points = entries.map(([, val], i) => {
    const x = padX + (i / Math.max(entries.length - 1, 1)) * (W - padX * 2)
    const y = padY + (1 - val / maxVal) * (H - padY * 2)
    return { x, y }
  })
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = pathD + ` L ${points[points.length - 1]?.x ?? 0} ${H - padY} L ${points[0]?.x ?? 0} ${H - padY} Z`
  const labelIndices = entries.length <= 10 ? entries.map((_, i) => i) : entries.map((_, i) => i).filter(i => i % 5 === 0 || i === entries.length - 1)
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', height: 'auto' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(f => <line key={f} x1={padX} x2={W - padX} y1={padY + (1 - f) * (H - padY * 2)} y2={padY + (1 - f) * (H - padY * 2)} stroke="rgba(212,175,55,0.06)" strokeWidth={1} />)}
      <path d={areaD} fill="rgba(212,175,55,0.08)" />
      <path d={pathD} fill="none" stroke={GOLD} strokeWidth={2} strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={GOLD} />)}
      {labelIndices.map(i => <text key={i} x={points[i].x} y={H + 10} fill={TEXT_DIM} fontSize={8} textAnchor="middle">{label(entries[i][0])}</text>)}
      {[0, 0.5, 1].map(f => <text key={f} x={padX - 4} y={padY + (1 - f) * (H - padY * 2) + 3} fill={TEXT_DIM} fontSize={8} textAnchor="end">{Math.round(maxVal * f)}</text>)}
    </svg>
  )
}

function MISTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>{headers.map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : GOLD_GLOW }}>
              {row.map((cell, j) => <td key={j} style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, color: j === 0 ? TEXT : TEXT_DIM, fontWeight: j === 0 ? 600 : 400 }}>{cell}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={headers.length} style={{ padding: 20, color: TEXT_DIM, textAlign: 'center' }}>Keine Daten vorhanden</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function ComplianceGauge({ rate, compliant, total }: { rate: number; compliant: number; total: number }) {
  const c = 2 * Math.PI * 50
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
      <svg width={130} height={130} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(212,175,55,0.1)" strokeWidth={10} />
        <circle cx={60} cy={60} r={50} fill="none" stroke={GOLD} strokeWidth={10} strokeDasharray={c} strokeDashoffset={c - (rate / 100) * c} strokeLinecap="round" transform="rotate(-90 60 60)" />
        <text x={60} y={56} textAnchor="middle" fill={GOLD} fontSize={28} fontWeight={800}>{rate}%</text>
        <text x={60} y={74} textAnchor="middle" fill={TEXT_DIM} fontSize={10}>Compliant</text>
      </svg>
      <div>
        <div style={{ fontSize: 14, color: TEXT }}><strong>{compliant}</strong> von <strong>{total}</strong> Anbietern konform</div>
        <div style={{ fontSize: 12, color: TEXT_DIM }}>Gewerbeanmeldung, Hygienezertifikat, Haftpflichtversicherung</div>
      </div>
    </div>
  )
}

const sectionTitle: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 16, marginTop: 32 }
const exportBtn: React.CSSProperties = { background: 'transparent', border: `1px solid ${GOLD_DIM}`, color: GOLD, padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }

function RefundableTransactionsTable({
  transactions,
  onRefunded,
}: {
  transactions: { id: string; type: string; amountEur: number; platformFeeEur: number; status: string; createdAt: string }[]
  onRefunded: () => void
}) {
  const [refunding, setRefunding] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRefund = useCallback(async (txId: string) => {
    if (!window.confirm('Wirklich refunden? Diese Aktion markiert die Transaktion als refunded.')) return
    setRefunding(txId)
    setError(null)
    try {
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: txId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Refund fehlgeschlagen.')
        setRefunding(null)
        return
      }
      onRefunded()
    } catch (e) {
      setError((e as Error).message || 'Netzwerkfehler.')
    } finally {
      setRefunding(null)
    }
  }, [onRefunded])

  return (
    <div style={{ overflowX: 'auto' }}>
      {error && (
        <div style={{ padding: 8, marginBottom: 8, background: 'rgba(192,64,64,0.1)', border: '1px solid rgba(192,64,64,0.3)', borderRadius: 6, fontSize: 12, color: '#f87171' }}>
          ⚠ {error}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Zeit', 'Typ', 'Betrag', 'Fee', 'Status', 'Aktion'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => {
            const isRefunded = tx.status === 'refunded'
            const isPending = tx.status === 'pending'
            const statusColor = isRefunded ? '#f87171' : isPending ? GOLD : '#4ade80'
            return (
              <tr key={tx.id} style={{ background: i % 2 === 0 ? 'transparent' : GOLD_GLOW }}>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, color: TEXT_DIM, fontSize: 12 }}>
                  {new Date(tx.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, color: TEXT, fontWeight: 600 }}>
                  {tx.type}
                </td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, color: TEXT }}>
                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tx.amountEur)}
                </td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, color: GOLD, fontWeight: 600 }}>
                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tx.platformFeeEur)}
                </td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, color: statusColor, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>
                  {tx.status}
                </td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}` }}>
                  {isRefunded ? (
                    <span style={{ fontSize: 11, color: TEXT_DIM }}>—</span>
                  ) : (
                    <button
                      onClick={() => handleRefund(tx.id)}
                      disabled={refunding === tx.id}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(192,64,64,0.4)',
                        color: '#f87171',
                        padding: '4px 10px',
                        borderRadius: 5,
                        fontSize: 11,
                        cursor: refunding === tx.id ? 'wait' : 'pointer',
                        fontWeight: 600,
                        opacity: refunding === tx.id ? 0.5 : 1,
                      }}
                    >
                      {refunding === tx.id ? '...' : '↺ Refund'}
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
          {transactions.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 20, color: TEXT_DIM, textAlign: 'center' }}>Keine Transaktionen</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function MISPage() {
  const [data, setData] = useState<MISData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = useCallback(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    fetch('/api/admin/mis', { signal: controller.signal, cache: 'no-store' })
      .then(res => { if (!res.ok) throw new Error(res.status === 403 ? 'Keine Berechtigung' : 'Fehler'); return res.json() })
      .then(d => {
        setData(d)
        setLastRefresh(new Date())
        setError(null)
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => {
        clearTimeout(timeout)
        setLoading(false)
      })

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    const cleanup = fetchData()
    return cleanup
  }, [fetchData])

  // Auto-Refresh alle 60 Sekunden
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => { fetchData() }, 60_000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchData])

  const handleExport = useCallback((type: string) => { window.open(`/api/admin/export?type=${type}`, '_blank') }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${GOLD_DIM}`, borderTop: `3px solid ${GOLD}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ color: TEXT_DIM, fontSize: 14 }}>MIS Dashboard wird geladen...</div>
      </div>
    </div>
  )

  if (error || !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>!</div>
        <div style={{ color: 'var(--red)', fontSize: 16, fontWeight: 600 }}>{error || 'Fehler'}</div>
      </div>
    </div>
  )

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 8 }}>
        <KPICard label="Gesamtumsatz" value={formatCurrency(data.kpis.totalRevenue)} />
        <KPICard label="Buchungen" value={String(data.kpis.totalBookings)} />
        <KPICard label="Aktive Nutzer" value={String(data.kpis.activeUsers)} />
        <KPICard label="Aktive Anbieter" value={String(data.kpis.activeProviders)} />
        <KPICard label="Bewertung" value={`${data.kpis.avgRating}`} sub="Durchschnitt" />
        <KPICard label="Conversion" value={`${data.kpis.conversionRate}%`} sub="Abschlussrate" />
      </div>

      {/* Revenue */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...sectionTitle }}>
        <span>Umsatz (letzte 12 Monate)</span>
        <button style={exportBtn} onClick={() => handleExport('revenue')}>CSV Export</button>
      </div>
      <div style={cardStyle}><BarChart data={data.revenueByMonth} label={shortMonth} formatValue={n => n > 0 ? `${Math.round(n)}` : ''} /></div>

      {/* Booking Trend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...sectionTitle }}>
        <span>Buchungstrend (30 Tage)</span>
        <button style={exportBtn} onClick={() => handleExport('bookings')}>CSV Export</button>
      </div>
      <div style={cardStyle}><LineChart data={data.bookingsByDay} label={shortDay} /></div>

      {/* Bookings by Status */}
      <h3 style={sectionTitle}>Buchungen nach Status</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        {Object.entries(data.bookingsByStatus).map(([status, count]) => (
          <div key={status} style={{ ...cardStyle, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto', minWidth: 120 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: status === 'completed' ? '#4ade80' : status === 'confirmed' ? GOLD : status === 'cancelled' ? '#f87171' : TEXT_DIM }} />
            <span style={{ color: TEXT, fontWeight: 600, fontSize: 14 }}>{count}</span>
            <span style={{ color: TEXT_DIM, fontSize: 12, textTransform: 'capitalize' }}>{status}</span>
          </div>
        ))}
      </div>

      {/* User Growth */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...sectionTitle }}>
        <span>Nutzerwachstum</span>
        <button style={exportBtn} onClick={() => handleExport('users')}>CSV Export</button>
      </div>
      <div style={cardStyle}><BarChart data={data.userGrowth} label={shortMonth} /></div>

      {/* Users by Role */}
      <h3 style={sectionTitle}>Nutzer nach Rolle</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        {Object.entries(data.usersByRole).map(([role, count]) => (
          <div key={role} style={{ ...cardStyle, padding: '12px 20px', flex: '1 1 auto', minWidth: 120, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: GOLD }}>{count}</div>
            <div style={{ fontSize: 11, color: TEXT_DIM, textTransform: 'capitalize', marginTop: 4 }}>{role}</div>
          </div>
        ))}
      </div>

      {/* Providers */}
      <h3 style={sectionTitle}>Anbieter</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ ...cardStyle, textAlign: 'center', padding: '16px 12px' }}><div style={{ fontSize: 24, fontWeight: 800, color: GOLD }}>{data.providers.total}</div><div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>Gesamt</div></div>
        <div style={{ ...cardStyle, textAlign: 'center', padding: '16px 12px' }}><div style={{ fontSize: 24, fontWeight: 800, color: '#4ade80' }}>{data.providers.active}</div><div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>Aktiv</div></div>
        <div style={{ ...cardStyle, textAlign: 'center', padding: '16px 12px' }}><div style={{ fontSize: 24, fontWeight: 800, color: TEXT }}>{data.providers.verified}</div><div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>Verifiziert</div></div>
      </div>

      {/* Top Salons */}
      <h3 style={sectionTitle}>Top 10 Salons (Umsatz)</h3>
      <div style={cardStyle}><MISTable headers={['#', 'Salon', 'Umsatz']} rows={data.topSalonsByRevenue.map((s, i) => [i + 1, s.name, formatCurrency(s.revenue)])} /></div>

      <h3 style={sectionTitle}>Top 10 Salons (Bewertung)</h3>
      <div style={cardStyle}><MISTable headers={['#', 'Salon', 'Bewertung', 'Anzahl']} rows={data.topSalonsByRating.map((s, i) => [i + 1, s.name, `${s.avgRating} / 5`, s.reviewCount])} /></div>

      {/* Reviews */}
      <h3 style={sectionTitle}>Bewertungen pro Monat</h3>
      <div style={cardStyle}><BarChart data={data.reviewsByMonth} label={shortMonth} /></div>

      {/* Compliance */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...sectionTitle }}>
        <span>Compliance</span>
        <button style={exportBtn} onClick={() => handleExport('compliance')}>CSV Export</button>
      </div>
      <div style={cardStyle}><ComplianceGauge rate={data.compliance.rate} compliant={data.compliance.compliant} total={data.compliance.total} /></div>

      {/* Booking Funnel (Conversion-Trichter) */}
      {data.bookingFunnel && (
        <>
          <h3 style={sectionTitle}>Buchungs-Funnel (letzte 30 Tage)</h3>
          <div style={cardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, alignItems: 'end' }}>
              {[
                { label: 'Besuche', value: data.bookingFunnel.visits, rate: null, color: TEXT },
                { label: 'Buchung gestartet', value: data.bookingFunnel.bookingsStarted, rate: data.bookingFunnel.visitToBooking, color: GOLD },
                { label: 'Bezahlt', value: data.bookingFunnel.paid, rate: data.bookingFunnel.bookingToPaid, color: GOLD },
                { label: 'Abgeschlossen', value: data.bookingFunnel.completed, rate: data.bookingFunnel.paidToCompleted, color: '#4ade80' },
              ].map((stage, idx) => (
                <div key={stage.label} style={{ textAlign: 'center', position: 'relative' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: stage.color }}>{stage.value.toLocaleString('de-DE')}</div>
                  <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stage.label}</div>
                  {stage.rate !== null && (
                    <div style={{ fontSize: 10, color: stage.rate >= 30 ? '#4ade80' : stage.rate >= 10 ? GOLD : '#f87171', marginTop: 4 }}>
                      → {stage.rate}% Conversion
                    </div>
                  )}
                  {idx < 3 && <div style={{ position: 'absolute', right: -4, top: 18, color: TEXT_DIM, fontSize: 16 }}>→</div>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Onboarding Pipeline */}
      {data.onboardingPipeline && (
        <>
          <h3 style={sectionTitle}>Anbieter-Onboarding-Pipeline</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div style={{ ...cardStyle, textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800, color: TEXT_DIM }}>{data.onboardingPipeline.registered}</div><div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>Registriert</div></div>
            <div style={{ ...cardStyle, textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800, color: GOLD }}>{data.onboardingPipeline.docsUploaded}</div><div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>Docs hochgeladen</div></div>
            <div style={{ ...cardStyle, textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800, color: GOLD }}>{data.onboardingPipeline.verified}</div><div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>Verifiziert</div></div>
            <div style={{ ...cardStyle, textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>{data.onboardingPipeline.active}</div><div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>Aktiv</div></div>
          </div>
        </>
      )}

      {/* At-Risk Providers */}
      {data.atRiskProviders && data.atRiskProviders.length > 0 && (
        <>
          <h3 style={sectionTitle}>⚠️ Anbieter mit niedrigem Health-Score (&lt; 50)</h3>
          <div style={cardStyle}>
            <MISTable
              headers={['Salon', 'Score', 'Rating', 'Volumen', 'Compliance', 'Aktivität']}
              rows={data.atRiskProviders.map(p => [
                p.name,
                `${p.score}/100`,
                `${p.breakdown.rating}/30`,
                `${p.breakdown.volume}/25`,
                `${p.breakdown.compliance}/25`,
                `${p.breakdown.activity}/20`,
              ])}
            />
            <div style={{ marginTop: 8, fontSize: 11, color: TEXT_DIM }}>
              Score-Formel: Rating × 30% + Volumen × 25% + Compliance × 25% + Aktivität × 20%
            </div>
          </div>
        </>
      )}

      {/* Recent Errors */}
      {data.recentErrors && data.recentErrors.length > 0 && (
        <>
          <h3 style={sectionTitle}>🚨 Fehler-Log (letzte 24h)</h3>
          <div style={cardStyle}>
            <MISTable
              headers={['Zeit', 'Level', 'Nachricht']}
              rows={data.recentErrors.slice(0, 10).map(e => [
                new Date(e.created_at).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
                e.level?.toUpperCase() || 'ERROR',
                e.message.length > 120 ? e.message.slice(0, 120) + '…' : e.message,
              ])}
            />
            <div style={{ marginTop: 8, fontSize: 11, color: TEXT_DIM }}>
              Zeigt die letzten 10 von max. 20 Errors. Vollständige Logs in der Datenbank.
            </div>
          </div>
        </>
      )}

      {/* === PLATTFORM-UMSATZ === */}
      {data.platformRevenue && (
        <>
          <h3 style={{ ...sectionTitle, color: GOLD, borderBottom: `1px solid ${BORDER}`, paddingBottom: 8, marginTop: 40 }}>
            PLATTFORM-UMSATZ
          </h3>

          {/* KPI-Cards für Plattform-Gewinn */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <KPICard
              label="Plattform-Gewinn (Total)"
              value={formatCurrency(data.platformRevenue.totalCommissionEur)}
              sub="Kommission gesamt"
            />
            <KPICard
              label="Diesen Monat"
              value={formatCurrency(data.platformRevenue.thisMonthEur)}
            />
            <KPICard
              label="Heute"
              value={formatCurrency(data.platformRevenue.todayEur)}
            />
          </div>

          {/* Bar-Chart by Source */}
          <h4 style={{ ...sectionTitle, fontSize: 14, marginTop: 20 }}>Umsatz nach Quelle</h4>
          <div style={cardStyle}>
            <BarChart
              data={{
                'Buchung': data.platformRevenue.bySource.booking,
                'Stuhl-Miete': data.platformRevenue.bySource.chairRental,
                'OP-Raum': data.platformRevenue.bySource.opraumRental,
                'Abo': data.platformRevenue.bySource.subscription,
                'Affiliate': data.platformRevenue.bySource.affiliate,
              }}
              label={(k) => k}
              formatValue={(n) => n > 0 ? `€${Math.round(n)}` : ''}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}`, fontSize: 12, color: TEXT_DIM }}>
              <span>Quelle: <code>platform_transactions</code> (status = succeeded)</span>
              <span style={{ color: GOLD, fontWeight: 700 }}>
                Total: {formatCurrency(data.platformRevenue.totalCommissionEur)}
              </span>
            </div>
          </div>

          {/* Recent Transactions mit Refund-Button */}
          {data.recentTransactions && data.recentTransactions.length > 0 && (
            <>
              <h4 style={{ ...sectionTitle, fontSize: 14, marginTop: 20 }}>Letzte Transaktionen</h4>
              <div style={cardStyle}>
                <RefundableTransactionsTable transactions={data.recentTransactions} onRefunded={fetchData} />
              </div>
            </>
          )}

          {/* Recent Refunds */}
          {data.recentRefunds && data.recentRefunds.length > 0 && (
            <>
              <h4 style={{ ...sectionTitle, fontSize: 14, marginTop: 20 }}>Letzte Refunds</h4>
              <div style={cardStyle}>
                <MISTable
                  headers={['Zeit', 'Typ', 'Betrag', 'Plattform-Fee']}
                  rows={data.recentRefunds.map(r => [
                    new Date(r.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                    r.type,
                    formatCurrency(r.amountEur),
                    `-${formatCurrency(r.platformFeeEur)}`,
                  ])}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* Footer: Auto-Refresh-Toggle + Timestamp */}
      <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, color: TEXT_DIM, fontSize: 11 }}>
        <div>
          Stand: {lastRefresh ? lastRefresh.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–'}
          {data.generatedAt && (
            <span style={{ marginLeft: 8, fontSize: 10 }}>
              (Daten generiert: {new Date(data.generatedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})
            </span>
          )}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
          Auto-Refresh (60s)
          <button onClick={() => fetchData()} style={{ ...exportBtn, padding: '4px 10px', fontSize: 10, marginLeft: 8 }}>
            🔄 Jetzt aktualisieren
          </button>
        </label>
      </div>
    </div>
  )
}
