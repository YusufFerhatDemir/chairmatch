'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const STATUS_LABEL: Record<string, string> = { pending: 'Offen', approved: 'Freigegeben', rejected: 'Abgelehnt' }

interface Doc {
  id: string
  owner_type: string
  owner_id: string
  doc_type: string
  verified_status: string
  created_at: string
}

export function DocumentRow({ d }: { d: Doc }) {
  const router = useRouter()
  const [status, setStatus] = useState(d.verified_status)
  const [loading, setLoading] = useState(false)

  async function setVerify(newStatus: 'approved' | 'rejected') {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/documents/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified_status: newStatus }),
      })
      if (res.ok) {
        setStatus(newStatus)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, flexWrap: 'wrap', gap: 8 }}>
      <div>
        <span style={{ color: 'var(--cream)', fontWeight: 600 }}>{d.doc_type}</span>
        <span style={{ color: 'var(--stone)', fontSize: 12, marginLeft: 8 }}>{d.owner_type} · {d.owner_id.slice(0, 8)}…</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {status === 'pending' && (
          <>
            <button onClick={() => setVerify('approved')} disabled={loading} className="badge badge-green" style={{ border: 'none', cursor: loading ? 'not-allowed' : 'pointer', padding: '6px 12px', fontSize: 11 }}>Freigeben</button>
            <button onClick={() => setVerify('rejected')} disabled={loading} style={{ background: 'rgba(232,80,64,0.2)', color: '#E85040', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, cursor: loading ? 'not-allowed' : 'pointer' }}>Ablehnen</button>
          </>
        )}
        <span className={`badge ${status === 'approved' ? 'badge-green' : status === 'rejected' ? 'badge' : 'badge-gold'}`} style={{ fontSize: 10 }}>{STATUS_LABEL[status] || status}</span>
      </div>
    </div>
  )
}
