'use client'

import { useState } from 'react'

interface Location { id: string; name: string }

export function BehoerdenpaketActions({ locations }: { locations: Location[] }) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ download_url: string } | null>(null)
  const [error, setError] = useState('')

  async function createPack() {
    if (!locationId) { setError('Bitte Standort wählen.'); return }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/owner/authorities-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: locationId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Fehler'); return }
      setResult({ download_url: data.download_url })
    } finally {
      setLoading(false)
    }
  }

  const subject = encodeURIComponent('Behördenpaket ChairMatch')
  const body = result ? encodeURIComponent(`Hallo,\n\nanbei mein Behördenpaket (ChairMatch).\n\nDownload: ${result.download_url}\n\nMit freundlichen Grüßen`) : ''

  return (
    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      <p style={{ color: 'var(--gold2)', fontWeight: 600, marginBottom: 8 }}>Kostenlos: Behördenpaket erstellen</p>
      <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 12 }}>Paket erstellen → Download → E-Mail vorbereiten → Du sendest selbst.</p>
      {locations.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--stone)' }}>Keine Standorte. Zuerst unter Anbieter-Registrierung einen Salon anlegen.</p>
      ) : (
        <>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--stone)', marginBottom: 6 }}>Standort</label>
          <select value={locationId} onChange={e => setLocationId(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 10, background: 'var(--c2)', border: '1px solid var(--border)', color: 'var(--cream)', fontSize: 13 }}>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          {error && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</p>}
          {!result ? (
            <button onClick={createPack} disabled={loading} className="boutline" style={{ padding: '10px 16px', fontSize: 12 }}>{loading ? 'Wird erstellt…' : 'Paket erstellen'}</button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href={result.download_url} target="_blank" rel="noopener noreferrer" className="bgold" style={{ padding: '10px 16px', fontSize: 12, textAlign: 'center', textDecoration: 'none', borderRadius: 10 }}>Download (TXT)</a>
              <a href={`mailto:?subject=${subject}&body=${body}`} className="boutline" style={{ padding: '10px 16px', fontSize: 12, textAlign: 'center', textDecoration: 'none', borderRadius: 10 }}>E-Mail vorbereiten</a>
              <button type="button" onClick={() => setResult(null)} style={{ fontSize: 11, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>Neues Paket erstellen</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
