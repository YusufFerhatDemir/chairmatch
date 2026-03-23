'use client'

import { useState } from 'react'

interface Salon { id: string; name: string; category: string; city: string | null; subscription_tier: string; avg_rating: number; is_verified: boolean; is_active: boolean }

export default function AdminSalonActions({ salons: init }: { salons: Salon[] }) {
  const [salons, setSalons] = useState(init)
  const [loading, setLoading] = useState<string | null>(null)

  async function act(id: string, action: string, data: Record<string, unknown>) {
    setLoading(id)
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, data }),
      })
      if (res.ok) {
        if (action === 'salon-status') {
          const status = data.status as string
          setSalons(p => p.map(s => s.id === id ? {
            ...s,
            is_verified: status === 'approved',
            is_active: status === 'approved' ? true : status === 'suspended' ? false : s.is_active,
          } : s))
        }
        if (action === 'salon-toggle-active') {
          setSalons(p => p.map(s => s.id === id ? { ...s, is_active: data.is_active as boolean } : s))
        }
      }
    } catch {
      // network error — don't leave UI stuck
    } finally {
      setLoading(null)
    }
  }

  function getStatus(s: Salon): string {
    if (s.is_verified && s.is_active) return 'approved'
    if (!s.is_active) return 'suspended'
    return 'pending'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {salons.map(s => {
        const status = getStatus(s)
        return (
          <div key={s.id} className="card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--stone)' }}>{s.category} · {s.city || '—'} · {s.subscription_tier}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 12 }}>★ {Number(s.avg_rating).toFixed(1)}</span>
                <span className="badge" style={{
                  fontSize: 9,
                  background: status === 'approved' ? 'rgba(74,138,90,0.15)' : status === 'pending' ? 'rgba(176,144,96,0.1)' : 'rgba(232,80,64,0.1)',
                  color: status === 'approved' ? '#6ABF80' : status === 'pending' ? 'var(--gold)' : 'var(--red)',
                  border: `1px solid ${status === 'approved' ? 'rgba(74,138,90,0.3)' : status === 'pending' ? 'rgba(176,144,96,0.2)' : 'rgba(232,80,64,0.2)'}`,
                }}>{status.toUpperCase()}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {!s.is_verified && (
                <button className="bgold" disabled={loading === s.id} style={{ fontSize: 11, padding: '6px 12px' }}
                  onClick={() => act(s.id, 'salon-status', { status: 'approved' })}>
                  Freischalten
                </button>
              )}
              {s.is_active && (
                <button className="boutline" disabled={loading === s.id} style={{ fontSize: 11, padding: '6px 12px', color: 'var(--red)', borderColor: 'rgba(232,80,64,0.3)' }}
                  onClick={() => act(s.id, 'salon-status', { status: 'suspended' })}>
                  Sperren
                </button>
              )}
              <button className="boutline" disabled={loading === s.id} style={{ fontSize: 11, padding: '6px 12px' }}
                onClick={() => act(s.id, 'salon-toggle-active', { is_active: !s.is_active })}>
                {s.is_active ? '🔴 Offline setzen' : '🟢 Online setzen'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
