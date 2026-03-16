'use client'

import { useState } from 'react'

interface Salon { id: string; name: string; category: string; city: string; subscription_tier: string; avg_rating: number; is_live: boolean; status: string }

export default function AdminSalonActions({ salons: init }: { salons: Salon[] }) {
  const [salons, setSalons] = useState(init)
  const [loading, setLoading] = useState<string | null>(null)

  async function act(id: string, action: string, data: Record<string, unknown>) {
    setLoading(id)
    const res = await fetch('/api/admin', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id, data }),
    })
    if (res.ok) {
      if (action === 'salon-status') {
        setSalons(p => p.map(s => s.id === id ? { ...s, status: data.status as string, is_live: data.status === 'approved' } : s))
      }
      if (action === 'salon-toggle-live') {
        setSalons(p => p.map(s => s.id === id ? { ...s, is_live: data.is_live as boolean } : s))
      }
    }
    setLoading(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {salons.map(s => (
        <div key={s.id} className="card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--stone)' }}>{s.category} · {s.city} · {s.subscription_tier}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 12 }}>★ {Number(s.avg_rating).toFixed(1)}</span>
              <span className="badge" style={{
                fontSize: 9,
                background: s.status === 'approved' ? 'rgba(74,138,90,0.15)' : s.status === 'pending' ? 'rgba(214,177,90,0.1)' : 'rgba(232,80,64,0.1)',
                color: s.status === 'approved' ? '#6ABF80' : s.status === 'pending' ? 'var(--gold)' : 'var(--red)',
                border: `1px solid ${s.status === 'approved' ? 'rgba(74,138,90,0.3)' : s.status === 'pending' ? 'rgba(214,177,90,0.2)' : 'rgba(232,80,64,0.2)'}`,
              }}>{s.status.toUpperCase()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {s.status !== 'approved' && (
              <button className="bgold" disabled={loading === s.id} style={{ fontSize: 11, padding: '6px 12px' }}
                onClick={() => act(s.id, 'salon-status', { status: 'approved' })}>
                Freischalten
              </button>
            )}
            {s.status !== 'suspended' && (
              <button className="boutline" disabled={loading === s.id} style={{ fontSize: 11, padding: '6px 12px', color: 'var(--red)', borderColor: 'rgba(232,80,64,0.3)' }}
                onClick={() => act(s.id, 'salon-status', { status: 'suspended' })}>
                Sperren
              </button>
            )}
            <button className="boutline" disabled={loading === s.id} style={{ fontSize: 11, padding: '6px 12px' }}
              onClick={() => act(s.id, 'salon-toggle-live', { is_live: !s.is_live })}>
              {s.is_live ? '🔴 Offline setzen' : '🟢 Online setzen'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
