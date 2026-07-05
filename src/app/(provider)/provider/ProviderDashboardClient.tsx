'use client'

import { useState } from 'react'
import { ProviderServiceManager } from '@/views/provider/ProviderServiceManager'
import { ProviderEquipmentManager } from '@/views/provider/ProviderEquipmentManager'
import { ProviderRentalManager } from '@/views/provider/ProviderRentalManager'

interface SalonData {
  id: string
  name: string
  category: string
  avgRating: number
  reviewCount: number
  openBookings: number
  activeServices: number
  tier: string
  isVerified: boolean
  isActive: boolean
  recentReviews: {
    id: string
    rating: number
    comment: string | null
    createdAt: string
    customerName: string
  }[]
}

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'services', label: 'Services', icon: '✂️' },
  { key: 'equipment', label: 'Ausstattung', icon: '🔧' },
  { key: 'rentals', label: 'Vermietung', icon: '🪑' },
  { key: 'settings', label: 'Einstellungen', icon: '⚙️' },
]

export default function ProviderDashboardClient({ salon }: { salon: SalonData }) {
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="shell">
      <div className="screen" style={{ paddingBottom: 60 }}>
        {/* Header */}
        <div style={{ padding: 'var(--pad)', paddingBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)' }}>
              Dashboard
            </h1>
            <div style={{ display: 'flex', gap: 4 }}>
              <span className="badge bgd" style={{ fontSize: 9 }}>{salon.tier.toUpperCase()}</span>
              {salon.isVerified && <span className="badge bgr" style={{ fontSize: 9 }}>✓</span>}
            </div>
          </div>
          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginBottom: 14 }}>{salon.name}</p>
        </div>

        {/* Tab Bar */}
        <div style={{
          display: 'flex', gap: 2, padding: '0 var(--pad)', marginBottom: 16,
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              border: tab === t.key ? '1.5px solid var(--gold)' : '1.5px solid var(--border)',
              background: tab === t.key ? 'rgba(200,168,75,0.12)' : 'transparent',
              color: tab === t.key ? 'var(--gold2)' : 'var(--stone)',
              transition: 'all 0.2s',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 var(--pad)' }}>
          {/* Dashboard Tab */}
          {tab === 'dashboard' && (
            <div>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--gold)' }}>★ {salon.avgRating.toFixed(1)}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Bewertung</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{salon.reviewCount}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Bewertungen</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{salon.openBookings}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Offene Buchungen</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{salon.activeServices}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Dienste</div>
                </div>
              </div>

              {/* Status */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)' }}>Status</span>
                  <span className={`badge ${salon.isActive ? 'bgr' : 'brd'}`} style={{ fontSize: 10 }}>
                    {salon.isActive ? 'LIVE' : 'INAKTIV'}
                  </span>
                </div>
              </div>

              {/* Recent Reviews */}
              <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 10 }}>
                Neueste Bewertungen
              </h2>
              {salon.recentReviews.length === 0 ? (
                <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)' }}>Noch keine Bewertungen.</p>
              ) : salon.recentReviews.map(r => (
                <div key={r.id} className="card" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, color: 'var(--cream)', fontSize: 'var(--font-sm)' }}>{r.customerName}</span>
                    <span style={{ color: 'var(--gold)', fontSize: 'var(--font-sm)' }}>{'★'.repeat(r.rating)}</span>
                  </div>
                  {r.comment && (
                    <p style={{ color: 'var(--stone)', fontSize: 'var(--font-xs)', marginTop: 4 }}>{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Services Tab */}
          {tab === 'services' && (
            <ProviderServiceManager salonId={salon.id} salonCategory={salon.category} />
          )}

          {/* Equipment Tab */}
          {tab === 'equipment' && (
            <ProviderEquipmentManager salonId={salon.id} salonCategory={salon.category} />
          )}

          {/* Rentals Tab */}
          {tab === 'rentals' && (
            <ProviderRentalManager salonId={salon.id} />
          )}

          {/* Settings Tab */}
          {tab === 'settings' && (
            <div>
              <div className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--cream)', fontWeight: 600, fontSize: 'var(--font-md)' }}>Salon</span>
                  <span style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)' }}>{salon.name}</span>
                </div>
              </div>
              <div className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--cream)', fontWeight: 600, fontSize: 'var(--font-md)' }}>Kategorie</span>
                  <span style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)' }}>{salon.category}</span>
                </div>
              </div>
              <div className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--cream)', fontWeight: 600, fontSize: 'var(--font-md)' }}>Abo-Stufe</span>
                  <span className="badge bgd">{salon.tier.toUpperCase()}</span>
                </div>
              </div>
              <div className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--cream)', fontWeight: 600, fontSize: 'var(--font-md)' }}>Verifiziert</span>
                  <span className={`badge ${salon.isVerified ? 'bgr' : 'brd'}`} style={{ fontSize: 10 }}>
                    {salon.isVerified ? 'JA' : 'NEIN'}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginTop: 16, lineHeight: 1.5 }}>
                Kontaktiere den Support, um dein Profil zu bearbeiten, dein Abo zu upgraden oder dein Konto zu verifizieren.
              </p>
            </div>
          )}
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
