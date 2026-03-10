'use client'

import { useState } from 'react'

const DOC_TYPES = [
  'Hygiene-Plan',
  'Reinigung & Desinfektion',
  'Hausordnung',
  'Geräteliste',
  'Abfallkonzept',
  'OP-Checkliste (bei OP-Raum)',
]

export function ComplianceDocumentForm({ locationId }: { locationId: string }) {
  const [docType, setDocType] = useState(DOC_TYPES[0])
  const [fileUrl, setFileUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/owner/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_type: 'location',
          owner_id: locationId,
          doc_type: docType,
          file_url: fileUrl || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage('Dokument eingereicht. Admin prüft es unter „Dokumente prüfen“.')
        setFileUrl('')
      } else {
        setMessage(data.error || 'Fehler beim Einreichen.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 16 }}>
      <p style={{ color: 'var(--cream)', fontWeight: 600, marginBottom: 10 }}>Dokument einreichen</p>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--stone)', marginBottom: 4 }}>Dokumenttyp</label>
      <select value={docType} onChange={e => setDocType(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 10, background: 'var(--c2)', border: '1px solid var(--border)', color: 'var(--cream)', fontSize: 13 }}>
        {DOC_TYPES.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--stone)', marginBottom: 4 }}>Link zu Datei (optional)</label>
      <input type="url" placeholder="https://…" value={fileUrl} onChange={e => setFileUrl(e.target.value)} className="inp" style={{ marginBottom: 12 }} />
      <p style={{ fontSize: 11, color: 'var(--stone2)', marginBottom: 10 }}>Du kannst später echte Uploads ergänzen. Hier erstmal Link angeben oder leer lassen.</p>
      {message && <p style={{ fontSize: 12, color: message.startsWith('Dokument') ? 'var(--green)' : 'var(--red)', marginBottom: 8 }}>{message}</p>}
      <button type="submit" disabled={loading} className="bgold" style={{ padding: '10px 16px', fontSize: 12 }}>{loading ? 'Wird gesendet…' : 'Einreichen'}</button>
    </form>
  )
}
