'use client'

import { useMemo, useState } from 'react'
import type { DashboardResponse, DashboardTransaction } from '@/modules/provider/dashboard.types'
import { StatCard, EmptyState, StatusBadge, SectionHeader } from '@/components/dashboard'

interface Props {
  data: DashboardResponse
  subscriptionTier: 'starter' | 'premium' | 'gold' | null
  salonName: string | null
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function formatEUR(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatEURCents(cents: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function txTypeLabel(t: DashboardTransaction['type']): string {
  switch (t) {
    case 'booking': return 'Buchung'
    case 'chair_rental': return 'Stuhl-Vermietung'
    case 'opraum_rental': return 'OP-Raum-Vermietung'
    case 'subscription': return 'Abo'
    case 'affiliate': return 'Affiliate'
    case 'refund': return 'Refund'
    default: return t
  }
}

function statusLabel(s: DashboardTransaction['status']): string {
  switch (s) {
    case 'succeeded': return 'Succeeded'
    case 'pending': return 'Pending'
    case 'failed': return 'Failed'
    case 'refunded': return 'Refunded'
    default: return s
  }
}

function isoFromDateInput(d: string, end = false): string {
  // d ist im Format YYYY-MM-DD
  if (!d) return ''
  return end ? `${d}T23:59:59.999Z` : `${d}T00:00:00.000Z`
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function firstDayOfMonth(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), 1)
  return d.toISOString().slice(0, 10)
}

function firstDayOfLastMonth(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return d.toISOString().slice(0, 10)
}

function lastDayOfLastMonth(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), 0)
  return d.toISOString().slice(0, 10)
}

function firstDayOfQuarter(date = new Date()): string {
  const q = Math.floor(date.getMonth() / 3)
  const d = new Date(date.getFullYear(), q * 3, 1)
  return d.toISOString().slice(0, 10)
}

function firstDayOfYear(date = new Date()): string {
  return `${date.getFullYear()}-01-01`
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export default function DashboardClient({ data, subscriptionTier, salonName }: Props) {
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(data.transactions.length / PAGE_SIZE))
  const visibleTxs = useMemo(
    () => data.transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data.transactions, page],
  )

  function applyPreset(preset: 'month' | 'lastMonth' | 'quarter' | 'year') {
    const today = todayISO()
    if (preset === 'month') {
      setFrom(firstDayOfMonth())
      setTo(today)
    } else if (preset === 'lastMonth') {
      setFrom(firstDayOfLastMonth())
      setTo(lastDayOfLastMonth())
    } else if (preset === 'quarter') {
      setFrom(firstDayOfQuarter())
      setTo(today)
    } else if (preset === 'year') {
      setFrom(firstDayOfYear())
      setTo(today)
    }
  }

  function handleExport() {
    const params = new URLSearchParams()
    if (from) params.set('from', isoFromDateInput(from, false))
    if (to) params.set('to', isoFromDateInput(to, true))
    const qs = params.toString()
    window.location.href = `/api/provider/dashboard/export${qs ? `?${qs}` : ''}`
  }

  function handleUpgrade() {
    alert('Stripe noch nicht live. Bald verfügbar.')
  }

  function handleStripeOnboarding() {
    alert('Stripe-Onboarding wird vorbereitet. Demnächst verfügbar.')
  }

  // ─── Subscription Tier Text ─────────────────────────────
  const tier = subscriptionTier ?? 'starter'
  const tierLabel = tier === 'gold' ? 'Gold' : tier === 'premium' ? 'Premium' : 'Free / Starter'
  const showUpgrade = tier !== 'gold'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ═══ Header / Greeting ═══ */}
      <div>
        <p style={{ fontSize: 12, color: 'var(--stone)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
          Provider Dashboard
        </p>
        <h1 className="cinzel" style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--gold2)',
          letterSpacing: 1,
          margin: 0,
        }}>
          Einnahmen-Übersicht
        </h1>
        {salonName && (
          <p style={{ fontSize: 13, color: 'var(--stone)', marginTop: 4 }}>{salonName}</p>
        )}
      </div>

      {/* ═══ Stripe Connect Banner ═══ */}
      {!data.stripeConnected && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(176,144,96,0.18) 0%, rgba(176,144,96,0.06) 100%)',
          border: '1px solid rgba(176,144,96,0.35)',
          borderRadius: 18,
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              fontSize: 26,
              flexShrink: 0,
              filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.4))',
            }}>⚠️</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold2)', margin: 0 }}>
                Stripe-Anbindung noch nicht aktiv
              </p>
              <p style={{ fontSize: 12, color: 'var(--stone)', margin: '4px 0 0', lineHeight: 1.5 }}>
                Aktiviere Stripe Connect, um Auszahlungen direkt auf dein Bankkonto zu erhalten.
              </p>
            </div>
          </div>
          <button
            onClick={handleStripeOnboarding}
            className="bgold"
            style={{ maxWidth: 260, width: '100%' }}
          >
            Stripe-Anbindung aktivieren
          </button>
        </div>
      )}

      {/* ═══ Hero Stat-Cards ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}>
        <StatCard
          label="Heute"
          value={formatEUR(data.earnings.today)}
          sub="Bis jetzt"
          icon="📅"
          color="gold"
        />
        <StatCard
          label="Dieser Monat"
          value={formatEUR(data.earnings.month)}
          sub="Laufender Monat"
          icon="📈"
          color="gold"
        />
        <StatCard
          label="Gesamt"
          value={formatEUR(data.earnings.total)}
          sub="Lifetime"
          icon="💰"
          color="green"
        />
        <StatCard
          label="Pending"
          value={formatEUR(data.pending)}
          sub="Noch nicht ausgezahlt"
          icon="⏳"
          color={data.pending > 0 ? 'gold' : 'gold'}
        />
      </div>

      {/* ═══ Transaktionen + Export ═══ */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header: Filter + Export */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cream)', margin: 0 }}>
              Transaktionen
            </h2>
            <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
              {data.transactions.length} Einträge
            </p>
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'flex-end',
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--stone)', letterSpacing: 0.5 }}>VON</span>
                <input
                  type="date"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="inp"
                  style={{ padding: '8px 10px', fontSize: 12, minWidth: 130 }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--stone)', letterSpacing: 0.5 }}>BIS</span>
                <input
                  type="date"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="inp"
                  style={{ padding: '8px 10px', fontSize: 12, minWidth: 130 }}
                />
              </label>
            </div>

            <button
              onClick={handleExport}
              className="bgold"
              style={{ padding: '10px 16px', fontSize: 12, width: 'auto' }}
            >
              CSV exportieren
            </button>
          </div>
        </div>

        {/* Date Range Presets */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <PresetBtn label="Diesen Monat" onClick={() => applyPreset('month')} />
          <PresetBtn label="Letzter Monat" onClick={() => applyPreset('lastMonth')} />
          <PresetBtn label="Quartal" onClick={() => applyPreset('quarter')} />
          <PresetBtn label="Dieses Jahr" onClick={() => applyPreset('year')} />
          {(from || to) && (
            <button
              onClick={() => { setFrom(''); setTo('') }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(232,80,64,0.25)',
                color: 'var(--red)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Zurücksetzen
            </button>
          )}
        </div>

        {/* Table or Empty State */}
        {data.transactions.length === 0 ? (
          <EmptyState
            icon="📍"
            title="Noch keine Einnahmen"
            description="Sobald deine erste Buchung kommt, siehst du sie hier."
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                minWidth: 720,
              }}>
                <thead>
                  <tr style={{ background: 'rgba(176,144,96,0.04)' }}>
                    <Th>Datum</Th>
                    <Th>Typ</Th>
                    <Th>Kunde</Th>
                    <Th align="right">Brutto</Th>
                    <Th align="right">Provision</Th>
                    <Th align="right">Netto</Th>
                    <Th>Status</Th>
                    <Th align="right">Aktionen</Th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTxs.map((t) => (
                    <tr key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <Td>
                        <span style={{ color: 'var(--cream)' }}>{formatDateTime(t.createdAt)}</span>
                      </Td>
                      <Td>
                        <span style={{ color: 'var(--cream)' }}>{txTypeLabel(t.type)}</span>
                      </Td>
                      <Td>
                        <span style={{ color: 'var(--stone)' }}>—</span>
                      </Td>
                      <Td align="right">
                        <span style={{ color: 'var(--cream)' }}>{formatEURCents(t.amountCents)}</span>
                      </Td>
                      <Td align="right">
                        <span style={{ color: 'var(--stone)' }}>−{formatEURCents(t.platformFeeCents)}</span>
                      </Td>
                      <Td align="right">
                        <span style={{ color: 'var(--gold2)', fontWeight: 700 }}>
                          {formatEURCents(t.providerShareCents)}
                        </span>
                      </Td>
                      <Td>
                        <StatusBadge status={statusLabel(t.status)} />
                      </Td>
                      <Td align="right">
                        <button
                          onClick={() => alert(`Transaktion ${t.id}\nNoch keine Details verfügbar.`)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--gold2)',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Details
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 11,
                color: 'var(--stone)',
              }}>
                <span>Seite {page} von {totalPages}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <PagerBtn disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Zurück</PagerBtn>
                  <PagerBtn disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Weiter →</PagerBtn>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ Payout-Info Box ═══ */}
      <div className="card" style={{
        padding: 18,
        background: 'rgba(74,138,90,0.06)',
        border: '1px solid rgba(74,138,90,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ fontSize: 22, flexShrink: 0 }}>🏦</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', margin: 0 }}>
              Auszahlung
            </p>
            <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 6, lineHeight: 1.6 }}>
              Auszahlungsrhythmus: alle 7 Tage automatisch auf dein Bankkonto (Stripe Standard).
              Optional: Instant-Payout für 1,5 % Gebühr — Geld in &lt;30 Min auf deiner Debitkarte.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Subscription-Status-Widget ═══ */}
      <SectionHeader title="Abo-Status" subtitle="Premium-Features freischalten" />
      <div className="card" style={{
        padding: 22,
        background: 'linear-gradient(135deg, rgba(176,144,96,0.06) 0%, var(--c1) 60%, rgba(179,135,40,0.04) 100%)',
        border: '1px solid rgba(176,144,96,0.18)',
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 18,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1, textTransform: 'uppercase' }}>
              Dein aktuelles Abo
            </p>
            <p className="cinzel" style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--gold2)',
              marginTop: 4,
              letterSpacing: 1,
            }}>
              {tierLabel}
            </p>
            {tier === 'starter' ? (
              <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 8, lineHeight: 1.5 }}>
                Du nutzt aktuell Free. Premium-Features (Featured-Listing, Marketing-Tools) bekommst du ab 49 €/Mo.
              </p>
            ) : tier === 'premium' ? (
              <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 8, lineHeight: 1.5 }}>
                Premium aktiv — du bist sichtbar im Featured-Listing und kannst Marketing-Tools nutzen.
              </p>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 8, lineHeight: 1.5 }}>
                Gold-Stufe aktiv — du erhältst maximale Sichtbarkeit, Priority-Support und alle Premium-Tools.
              </p>
            )}
          </div>

          {showUpgrade && (
            <button
              onClick={handleUpgrade}
              className="bgold"
              style={{ width: 'auto', padding: '14px 22px', minWidth: 220 }}
            >
              {tier === 'starter' ? 'Upgrade auf Premium 49 €/Mo' : 'Upgrade auf Gold'}
            </button>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div style={{ height: 32 }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th style={{
      padding: '10px 14px',
      textAlign: align,
      fontSize: 10,
      fontWeight: 700,
      color: 'var(--stone)',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>{children}</th>
  )
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <td style={{
      padding: '12px 14px',
      textAlign: align,
      fontSize: 12,
      whiteSpace: 'nowrap',
    }}>{children}</td>
  )
}

function PresetBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: '1px solid rgba(176,144,96,0.25)',
        color: 'var(--gold2)',
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background .15s, border-color .15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(176,144,96,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
    </button>
  )
}

function PagerBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        color: disabled ? 'var(--stone2)' : 'var(--gold2)',
        borderRadius: 6,
        padding: '6px 12px',
        fontSize: 11,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}
