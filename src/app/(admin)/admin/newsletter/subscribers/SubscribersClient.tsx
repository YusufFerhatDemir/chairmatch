'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface Subscriber {
  id: string
  email: string
  name: string | null
  status: 'active' | 'unsubscribed' | 'bounced'
  source: string | null
  tags: string[] | null
  subscribed_at: string
  unsubscribed_at: string | null
  last_sent_at: string | null
}

interface ApiResponse {
  subscribers: Subscriber[]
  pagination: { page: number; perPage: number; total: number }
  stats: { total: number; active: number; unsubscribed: number }
}

export default function SubscribersClient() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'' | 'active' | 'unsubscribed' | 'bounced'>('')
  const [page, setPage] = useState(1)
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [bulkTagInput, setBulkTagInput] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = new URL('/api/admin/newsletter/subscribers', window.location.origin)
      if (q) url.searchParams.set('q', q)
      if (status) url.searchParams.set('status', status)
      url.searchParams.set('page', String(page))
      url.searchParams.set('per_page', '50')

      const res = await fetch(url.toString())
      const body: ApiResponse = await res.json()
      setData(body)
    } catch {
      setMsg({ type: 'error', text: 'Fehler beim Laden' })
    } finally {
      setLoading(false)
    }
  }, [q, status, page])

  useEffect(() => {
    load()
  }, [load])

  async function setRowStatus(id: string, newStatus: 'active' | 'unsubscribed' | 'bounced') {
    try {
      const res = await fetch('/api/admin/newsletter/subscribers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setMsg({ type: 'error', text: b.error || 'Fehler beim Aktualisieren' })
        return
      }
      await load()
    } catch {
      setMsg({ type: 'error', text: 'Netzwerkfehler' })
    }
  }

  async function deleteRow(id: string) {
    if (!confirm('Subscriber endgültig löschen? (DSGVO)')) return
    try {
      const url = new URL('/api/admin/newsletter/subscribers', window.location.origin)
      url.searchParams.set('id', id)
      const res = await fetch(url.toString(), { method: 'DELETE' })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setMsg({ type: 'error', text: b.error || 'Fehler' })
        return
      }
      await load()
    } catch {
      setMsg({ type: 'error', text: 'Netzwerkfehler' })
    }
  }

  async function bulkAddTag() {
    const tag = bulkTagInput.trim()
    if (!tag || selected.size === 0) return
    try {
      // Sequentiell PATCHen — bei 1000+ würde man das in einer API-Route bulk-machen
      for (const id of Array.from(selected)) {
        const sub = data?.subscribers.find(s => s.id === id)
        if (!sub) continue
        const newTags = Array.from(new Set([...(sub.tags || []), tag]))
        await fetch('/api/admin/newsletter/subscribers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, tags: newTags }),
        })
      }
      setMsg({ type: 'success', text: `Tag "${tag}" zu ${selected.size} Subscribern hinzugefügt` })
      setSelected(new Set())
      setBulkTagInput('')
      await load()
    } catch {
      setMsg({ type: 'error', text: 'Bulk-Tagging fehlgeschlagen' })
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function toggleSelectAll() {
    if (!data) return
    if (selected.size === data.subscribers.length) setSelected(new Set())
    else setSelected(new Set(data.subscribers.map(s => s.id)))
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportBusy(true)
    setMsg(null)
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length === 0) {
        setMsg({ type: 'error', text: 'CSV ist leer oder ungültig.' })
        return
      }
      const res = await fetch('/api/admin/newsletter/subscribers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, defaultSource: 'csv_import' }),
      })
      const body = await res.json()
      if (!res.ok) {
        setMsg({ type: 'error', text: body.error || 'Import fehlgeschlagen' })
      } else {
        setMsg({
          type: 'success',
          text: `Import: ${body.inserted} neu, ${body.skipped} schon vorhanden (von ${body.totalRows} Zeilen).`,
        })
        await load()
      }
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Datei konnte nicht gelesen werden' })
    } finally {
      setImportBusy(false)
      e.target.value = ''
    }
  }

  function exportCsv() {
    if (!data) return
    const header = 'email,name,status,source,tags,subscribed_at\n'
    const lines = data.subscribers.map(s => [
      s.email,
      (s.name || '').replace(/,/g, ' '),
      s.status,
      s.source || '',
      (s.tags || []).join('|'),
      s.subscribed_at,
    ].join(','))
    const csv = header + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `chairmatch-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const subs = data?.subscribers || []
  const stats = data?.stats

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--cream)', margin: 0 }}>Subscriber</h2>
          {stats && (
            <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 4 }}>
              {stats.total} gesamt · {stats.active} aktiv · {stats.unsubscribed} abgemeldet
            </p>
          )}
        </div>
        <Link href="/admin/newsletter" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'none' }}>
          ← Zur Übersicht
        </Link>
      </div>

      {msg && (
        <div style={{
          padding: '12px 16px',
          background: msg.type === 'success' ? 'rgba(74,138,90,0.15)' : msg.type === 'error' ? 'rgba(232,80,64,0.15)' : 'rgba(176,144,96,0.10)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(74,138,90,0.3)' : msg.type === 'error' ? 'rgba(232,80,64,0.3)' : 'rgba(176,144,96,0.3)'}`,
          color: msg.type === 'success' ? '#9DD8A8' : msg.type === 'error' ? '#FBA39A' : 'var(--cream)',
          borderRadius: 10,
          fontSize: 13,
          marginBottom: 16,
        }}>{msg.text}</div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1) }}
          placeholder="E-Mail suchen..."
          style={{
            flex: '1 1 200px',
            background: 'var(--c2, #1A1A1F)',
            border: '1px solid rgba(176,144,96,0.18)',
            borderRadius: 10,
            padding: '10px 12px',
            color: 'var(--cream)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <select
          value={status}
          onChange={e => { setStatus(e.target.value as 'active' | 'unsubscribed' | 'bounced' | ''); setPage(1) }}
          style={{
            background: 'var(--c2, #1A1A1F)',
            border: '1px solid rgba(176,144,96,0.18)',
            borderRadius: 10,
            padding: '10px 12px',
            color: 'var(--cream)',
            fontSize: 14,
          }}
        >
          <option value="">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="unsubscribed">Abgemeldet</option>
          <option value="bounced">Bounced</option>
        </select>

        <label style={{
          background: 'transparent',
          color: 'var(--gold)',
          padding: '10px 16px',
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 13,
          border: '1px solid rgba(176,144,96,0.30)',
          cursor: 'pointer',
        }}>
          {importBusy ? 'Importiere...' : 'CSV importieren'}
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvImport}
            disabled={importBusy}
            style={{ display: 'none' }}
          />
        </label>

        <button
          type="button"
          onClick={exportCsv}
          style={{
            background: 'transparent',
            color: 'var(--gold)',
            padding: '10px 16px',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            border: '1px solid rgba(176,144,96,0.30)',
            cursor: 'pointer',
          }}
        >
          Sichtbare exportieren
        </button>
      </div>

      {/* Bulk-Toolbar */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          padding: 12,
          background: 'rgba(176,144,96,0.06)',
          border: '1px solid rgba(176,144,96,0.18)',
          borderRadius: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, color: 'var(--cream)', fontWeight: 600 }}>{selected.size} ausgewählt</span>
          <input
            type="text"
            value={bulkTagInput}
            onChange={e => setBulkTagInput(e.target.value)}
            placeholder="Tag hinzufügen (z.B. vip)"
            style={{
              background: 'var(--c2, #1A1A1F)',
              border: '1px solid rgba(176,144,96,0.18)',
              borderRadius: 8,
              padding: '6px 10px',
              color: 'var(--cream)',
              fontSize: 13,
              flex: '1 1 160px',
            }}
          />
          <button
            type="button"
            onClick={bulkAddTag}
            disabled={!bulkTagInput.trim()}
            style={{
              background: 'linear-gradient(135deg,#D4AF37,#FCF6BA)',
              color: '#1A1000',
              padding: '6px 12px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Tag setzen
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            style={{
              background: 'transparent',
              color: 'var(--stone)',
              padding: '6px 12px',
              fontSize: 12,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Auswahl aufheben
          </button>
        </div>
      )}

      {/* Tabelle */}
      <div style={{
        background: 'var(--cardbg, #111114)',
        border: '1px solid rgba(176,144,96,0.10)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800 }}>
            <thead>
              <tr style={{ background: 'rgba(176,144,96,0.06)', borderBottom: '1px solid rgba(176,144,96,0.12)' }}>
                <th style={th}>
                  <input
                    type="checkbox"
                    checked={subs.length > 0 && selected.size === subs.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={th}>E-Mail</th>
                <th style={th}>Name</th>
                <th style={th}>Status</th>
                <th style={th}>Source</th>
                <th style={th}>Tags</th>
                <th style={th}>Angemeldet</th>
                <th style={th}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--stone)' }}>Lädt...</td></tr>
              )}
              {!loading && subs.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--stone)' }}>Keine Subscriber gefunden.</td></tr>
              )}
              {!loading && subs.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(176,144,96,0.06)' }}>
                  <td style={td}>
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                    />
                  </td>
                  <td style={{ ...td, color: 'var(--cream)', fontWeight: 600 }}>{s.email}</td>
                  <td style={td}>{s.name || '—'}</td>
                  <td style={td}>
                    <span style={{
                      background: s.status === 'active' ? 'rgba(74,138,90,0.20)' : s.status === 'unsubscribed' ? 'rgba(232,80,64,0.20)' : 'rgba(245,158,11,0.20)',
                      color: s.status === 'active' ? '#9DD8A8' : s.status === 'unsubscribed' ? '#FBA39A' : '#FCD34D',
                      padding: '3px 10px',
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 700,
                    }}>{s.status}</span>
                  </td>
                  <td style={td}>{s.source || '—'}</td>
                  <td style={td}>
                    {(s.tags || []).length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(s.tags || []).map(t => (
                          <span key={t} style={{
                            background: 'rgba(176,144,96,0.10)',
                            color: 'var(--gold2)',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                          }}>{t}</span>
                        ))}
                      </div>
                    ) : <span style={{ color: 'var(--stone2)' }}>—</span>}
                  </td>
                  <td style={td}>{new Date(s.subscribed_at).toLocaleDateString('de-DE')}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {s.status !== 'active' && (
                        <button onClick={() => setRowStatus(s.id, 'active')} style={miniBtn}>
                          Aktivieren
                        </button>
                      )}
                      {s.status === 'active' && (
                        <button onClick={() => setRowStatus(s.id, 'unsubscribed')} style={miniBtn}>
                          Abmelden
                        </button>
                      )}
                      <button onClick={() => deleteRow(s.id)} style={{ ...miniBtn, color: '#FBA39A' }}>
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.pagination.total > data.pagination.perPage && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...miniBtn, opacity: page === 1 ? 0.4 : 1 }}
          >← Zurück</button>
          <span style={{ fontSize: 12, color: 'var(--stone)' }}>
            Seite {page} von {Math.ceil(data.pagination.total / data.pagination.perPage)}
          </span>
          <button
            type="button"
            onClick={() => setPage(p => p + 1)}
            disabled={page * data.pagination.perPage >= data.pagination.total}
            style={{ ...miniBtn, opacity: page * data.pagination.perPage >= data.pagination.total ? 0.4 : 1 }}
          >Weiter →</button>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  color: 'var(--stone)',
}

const td: React.CSSProperties = {
  padding: '10px 12px',
  color: 'var(--cream)',
  verticalAlign: 'middle',
}

const miniBtn: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--gold)',
  padding: '4px 10px',
  borderRadius: 6,
  fontWeight: 600,
  fontSize: 11,
  border: '1px solid rgba(176,144,96,0.25)',
  cursor: 'pointer',
}

/**
 * Sehr einfacher CSV-Parser für: email,name,tags
 * Erkennt Header automatisch.
 * Tags optional, durch | oder ; getrennt.
 */
function parseCsv(text: string): Array<{ email: string; name?: string; tags?: string[] }> {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return []

  // Header sniff
  const first = lines[0].toLowerCase()
  let startIdx = 0
  let emailIdx = 0
  let nameIdx = -1
  let tagsIdx = -1

  if (first.includes('email') || first.includes('e-mail')) {
    const cols = lines[0].split(/[,;]/).map(c => c.trim().toLowerCase())
    emailIdx = cols.findIndex(c => c === 'email' || c === 'e-mail')
    nameIdx = cols.findIndex(c => c === 'name')
    tagsIdx = cols.findIndex(c => c === 'tags' || c === 'tag')
    if (emailIdx < 0) emailIdx = 0
    startIdx = 1
  }

  const out: Array<{ email: string; name?: string; tags?: string[] }> = []
  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(/[,;]/).map(c => c.trim().replace(/^"|"$/g, ''))
    const email = cols[emailIdx] || ''
    if (!email || !email.includes('@')) continue
    const name = nameIdx >= 0 ? cols[nameIdx] || undefined : undefined
    const rawTags = tagsIdx >= 0 ? cols[tagsIdx] || '' : ''
    const tags = rawTags
      ? rawTags.split(/[|;]/).map(t => t.trim()).filter(Boolean)
      : undefined
    out.push({ email, name, tags })
  }
  return out
}
