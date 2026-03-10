'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'SUBMITTED', 'DONE'] as const
const STATUS_LABEL: Record<string, string> = { OPEN: 'Offen', IN_PROGRESS: 'In Bearbeitung', SUBMITTED: 'Eingereicht', DONE: 'Erledigt' }

interface Ticket {
  id: string
  location_id: string
  plan_type: string
  status: string
  admin_notes: string | null
  created_at: string
}

interface Props {
  t: Ticket
  salonName: string
}

export function TicketCard({ t, salonName }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(t.status)
  const [notes, setNotes] = useState(t.admin_notes || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/tickets/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: notes }),
      })
      if (res.ok) router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'var(--cream)', fontWeight: 600 }}>{salonName}</span>
        <span className="badge badge-gold" style={{ fontSize: 10 }}>{STATUS_LABEL[status] || status}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 10 }}>Plan: {t.plan_type} · {new Date(t.created_at).toLocaleDateString('de-DE')}</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--c2)', border: '1px solid var(--border)', color: 'var(--cream)', fontSize: 12 }}>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <button onClick={save} disabled={saving} className="bgold" style={{ padding: '8px 14px', fontSize: 12 }}>{saving ? 'Speichern…' : 'Speichern'}</button>
      </div>
      <textarea placeholder="Admin-Notizen…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ width: '100%', padding: 10, borderRadius: 10, background: 'var(--c2)', border: '1px solid var(--border)', color: 'var(--cream)', fontSize: 12, resize: 'vertical' }} />
    </div>
  )
}
