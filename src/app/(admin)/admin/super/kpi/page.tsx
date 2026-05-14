'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * KPI-Cockpit für Super-Admin.
 *
 * Operational Dashboard mit North-Star (Bookings 30d Growth) + Funnel +
 * Marketplace-Health + Milestones (Phase 2 / Phase 3).
 */

interface KpiData {
  timestamp: string
  funnel: {
    signups: { d1: number; d7: number; d30: number }
    salons: { total: number; active: number; new_7d: number }
    listings: { total: number; active: number; new_7d: number }
    conversations: { d7: number; d30: number }
    bookings: {
      d1: number
      d7: number
      d30: number
      prev_30d: number
      growth_pct: number
    }
    conversion: { conv_to_booking_pct: number }
  }
  marketplace_health: {
    bypass_blocked_7d: number
    reviews_7d: number
    affiliate_clicks_7d: number
  }
  seo: {
    salons_indexable: number
    newsletter_subscribers: number
  }
  engagement: {
    dau: number
    wau: number
    dau_wau_ratio: number
  }
  milestones: {
    phase_2_threshold: number
    phase_2_progress: number
    phase_3_threshold: number
    phase_3_progress: number
  }
}

export default function KpiPage() {
  const router = useRouter()
  const [data, setData] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/kpi')
      .then(r => {
        if (r.status === 403) { router.push('/'); return null }
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => { if (d) setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [router])

  if (loading) {
    return (
      <div className="shell"><div className="screen" style={{ padding: 20 }}>
        <p style={{ color: 'var(--stone)' }}>Lade KPIs …</p>
      </div></div>
    )
  }

  if (error || !data) {
    return (
      <div className="shell"><div className="screen" style={{ padding: 20 }}>
        <p style={{ color: 'var(--red)' }}>Fehler: {error || 'Keine Daten'}</p>
      </div></div>
    )
  }

  const growth = data.funnel.bookings.growth_pct
  const growthColor = growth >= 20 ? 'var(--green)' : growth >= 0 ? 'var(--gold)' : 'var(--red)'
  const phase2Color = data.milestones.phase_2_progress >= 100 ? 'var(--green)' : 'var(--gold2)'

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 20, maxWidth: 980, margin: '0 auto' }}>
        <h1 className="cinzel" style={{ color: 'var(--gold2)', fontSize: 22, marginBottom: 6 }}>
          KPI-Cockpit
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 12, marginBottom: 24 }}>
          Stand: {new Date(data.timestamp).toLocaleString('de-DE')}
        </p>

        {/* NORTH-STAR: Bookings 30d + Growth */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(176,144,96,0.04))',
          border: `2px solid ${growthColor}`,
          borderRadius: 14, padding: 20, marginBottom: 16,
        }}>
          <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
            ⭐ North-Star
          </p>
          <h2 style={{ color: 'var(--cream)', fontSize: 16, margin: '4px 0 12px' }}>
            Bestätigte Buchungen (30 Tage)
          </h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: 'var(--gold2)' }}>
              {data.funnel.bookings.d30}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: growthColor }}>
              {growth >= 0 ? '+' : ''}{growth}%
            </span>
            <span style={{ fontSize: 12, color: 'var(--stone)' }}>
              vs. vorherige 30d ({data.funnel.bookings.prev_30d})
            </span>
          </div>
        </section>

        {/* MILESTONES */}
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ color: 'var(--cream)', fontSize: 15, marginBottom: 10 }}>Wachstums-Meilensteine</h3>
          <MilestoneBar
            label={`Phase 2 erreicht (${data.milestones.phase_2_threshold} aktive Listings)`}
            value={data.milestones.phase_2_progress}
            color={phase2Color}
          />
          <MilestoneBar
            label={`Phase 3 erreicht (${data.milestones.phase_3_threshold} aktive Listings)`}
            value={data.milestones.phase_3_progress}
            color="var(--gold2)"
          />
        </section>

        {/* FUNNEL */}
        <h3 style={{ color: 'var(--cream)', fontSize: 15, margin: '24px 0 10px' }}>Akquise-Funnel</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <Stat label="Signups 7d" value={data.funnel.signups.d7} sub={`30d: ${data.funnel.signups.d30}`} />
          <Stat label="Anbieter aktiv" value={data.funnel.salons.active} sub={`+${data.funnel.salons.new_7d} (7d)`} />
          <Stat label="Listings aktiv" value={data.funnel.listings.active} sub={`+${data.funnel.listings.new_7d} (7d)`} />
          <Stat label="Conversations 30d" value={data.funnel.conversations.d30} sub={`7d: ${data.funnel.conversations.d7}`} />
          <Stat label="Bookings 7d" value={data.funnel.bookings.d7} sub={`1d: ${data.funnel.bookings.d1}`} />
          <Stat label="Conv→Booking" value={`${data.funnel.conversion.conv_to_booking_pct}%`} sub="(letzte 30d)" highlight />
        </div>

        {/* MARKETPLACE-HEALTH */}
        <h3 style={{ color: 'var(--cream)', fontSize: 15, margin: '24px 0 10px' }}>Marketplace-Gesundheit</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <Stat label="Bypass-Blocks 7d" value={data.marketplace_health.bypass_blocked_7d} warning={data.marketplace_health.bypass_blocked_7d > 20} />
          <Stat label="Reviews 7d" value={data.marketplace_health.reviews_7d} />
          <Stat label="Affiliate-Klicks 7d" value={data.marketplace_health.affiliate_clicks_7d} />
        </div>

        {/* ENGAGEMENT */}
        <h3 style={{ color: 'var(--cream)', fontSize: 15, margin: '24px 0 10px' }}>Engagement</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <Stat label="DAU" value={data.engagement.dau} sub="(Logins 24h)" />
          <Stat label="WAU" value={data.engagement.wau} sub="(Logins 7d)" />
          <Stat label="Stickiness" value={`${data.engagement.dau_wau_ratio}%`} sub="DAU/WAU" highlight={data.engagement.dau_wau_ratio >= 20} />
        </div>

        {/* SEO */}
        <h3 style={{ color: 'var(--cream)', fontSize: 15, margin: '24px 0 10px' }}>SEO & Reichweite</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <Stat label="Indexierbare Salons" value={data.seo.salons_indexable} sub="in Sitemap" />
          <Stat label="Newsletter-Abos" value={data.seo.newsletter_subscribers} sub="confirmed" />
        </div>

        <p style={{ fontSize: 10, color: 'var(--stone2)', marginTop: 32, textAlign: 'center' }}>
          KPI-Framework: siehe docs/seo/07-kpi-dashboard.md
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, highlight, warning }: {
  label: string; value: number | string; sub?: string; highlight?: boolean; warning?: boolean
}) {
  const valueColor = warning ? 'var(--red)' : highlight ? 'var(--green)' : 'var(--gold2)'
  return (
    <div style={{ background: 'var(--c2)', borderRadius: 10, padding: 12 }}>
      <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: valueColor, margin: '2px 0 0' }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: 'var(--stone2)', margin: '2px 0 0' }}>{sub}</p>}
    </div>
  )
}

function MilestoneBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--cream)' }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{ background: 'var(--c2)', height: 10, borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          width: `${value}%`,
          height: '100%',
          background: color,
          transition: 'width .3s ease',
        }} />
      </div>
    </div>
  )
}
