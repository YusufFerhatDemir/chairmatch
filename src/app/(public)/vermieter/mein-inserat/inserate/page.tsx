'use client'

/**
 * Mietobjekt-Verwaltung (Track E).
 *
 * `rental_equipment` wurde an 13 Stellen gelesen, aber nirgends geschrieben —
 * Vermieter konnten weder ein zweites Objekt anlegen noch eines löschen oder
 * offline nehmen. Diese Seite ist der Schreibpfad dazu.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MeinBereichSubPage, { GoldButton } from '@/components/MeinBereichSubPage'
import { apiGet, apiSend, ApiError } from '@/lib/client-api'
import { useTranslations } from '@/i18n/client'

interface Equipment {
  id: string
  name: string
  type: string
  price_per_day_cents: number
  is_available: boolean
}

const TYPES = [
  { id: 'stuhl',  label: 'Stuhl' },
  { id: 'liege',  label: 'Liege' },
  { id: 'raum',   label: 'Kabine / Raum' },
  { id: 'opraum', label: 'OP-Raum' },
] as const

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', background: 'var(--c2)', color: 'var(--cream)',
  border: '0.5px solid rgba(196,168,106,0.22)', borderRadius: 10,
  fontSize: 14, fontFamily: 'inherit',
}

export default function Page() {
  const t = useTranslations()
  const router = useRouter()

  const [items, setItems] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<string>('stuhl')
  const [newPrice, setNewPrice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ equipment: Equipment[] }>('/api/rental-equipment')
      setItems(res.equipment)
      setError(null)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/auth')
        return
      }
      setError(err instanceof Error ? err.message : 'Mietobjekte konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { void load() }, [load])

  async function create() {
    if (creating) return
    setError(null)

    const euros = Number(String(newPrice).replace(',', '.'))
    if (newName.trim().length < 2) { setError('Bitte einen Namen mit mindestens 2 Zeichen angeben'); return }
    if (!Number.isFinite(euros) || euros <= 0) { setError('Bitte einen Tagespreis größer 0 angeben'); return }

    setCreating(true)
    try {
      const res = await apiSend<{ equipment: Equipment }>('/api/rental-equipment', 'POST', {
        name: newName.trim(),
        type: newType,
        price_per_day_cents: Math.round(euros * 100),
        is_available: true,
      })
      setItems(prev => [...prev, res.equipment])
      setNewName('')
      setNewPrice('')
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mietobjekt konnte nicht angelegt werden')
    } finally {
      setCreating(false)
    }
  }

  async function toggleAvailable(item: Equipment) {
    if (busyId) return
    setBusyId(item.id)
    setError(null)
    try {
      const res = await apiSend<{ equipment: Equipment }>(`/api/rental-equipment/${item.id}`, 'PATCH', {
        is_available: !item.is_available,
      })
      setItems(prev => prev.map(i => (i.id === item.id ? res.equipment : i)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status konnte nicht geändert werden')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(item: Equipment) {
    if (busyId) return
    if (!confirm(`„${item.name}" wirklich löschen?`)) return
    setBusyId(item.id)
    setError(null)
    try {
      await apiSend(`/api/rental-equipment/${item.id}`, 'DELETE')
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mietobjekt konnte nicht gelöscht werden')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel={t('meinInserat.title')}
      title={t('meinInserat.listings')}
      subtitle={t('meinInserat.listingsSub')}
      showSave={false}
      role="vermieter"
    >
      {loading && <p style={{ fontSize: 12, color: 'var(--stone)' }}>Mietobjekte werden geladen…</p>}

      {error && (
        <div role="alert" style={{
          padding: '11px 14px', borderRadius: 12,
          background: 'rgba(232,80,64,0.10)', border: '1px solid rgba(232,80,64,0.32)',
          color: '#FF8888', fontSize: 12, lineHeight: 1.5,
        }}>{error}</div>
      )}

      {!loading && items.length === 0 && !error && (
        <p style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.5 }}>
          Noch kein Mietobjekt angelegt. Leg eines an, damit dein Platz in der Suche auftaucht.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(item => (
          <div key={item.id} style={{
            background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.18)',
            borderRadius: 14, padding: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--cream)' }}>{item.name}</p>
                <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
                  {TYPES.find(tp => tp.id === item.type)?.label ?? item.type} ·{' '}
                  {(item.price_per_day_cents / 100).toFixed(0)} € / Tag
                </p>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6, letterSpacing: 1, flexShrink: 0,
                background: item.is_available ? 'rgba(74,138,90,0.15)' : 'rgba(232,80,64,0.15)',
                color: item.is_available ? '#6ABF80' : '#FF8888',
              }}>{item.is_available ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => toggleAvailable(item)}
                disabled={busyId === item.id}
                style={{
                  flex: 1, padding: 9, borderRadius: 10,
                  background: 'transparent', color: 'var(--gold2)',
                  border: '1px solid rgba(196,168,106,0.3)',
                  fontFamily: 'inherit', fontWeight: 600, fontSize: 12,
                  cursor: busyId === item.id ? 'wait' : 'pointer',
                  opacity: busyId === item.id ? 0.6 : 1,
                }}
              >{item.is_available ? 'Offline nehmen' : 'Online stellen'}</button>
              <button
                onClick={() => remove(item)}
                disabled={busyId === item.id}
                style={{
                  flex: 1, padding: 9, borderRadius: 10,
                  background: 'transparent', color: '#FF8888',
                  border: '1px solid rgba(232,80,64,0.3)',
                  fontFamily: 'inherit', fontWeight: 600, fontSize: 12,
                  cursor: busyId === item.id ? 'wait' : 'pointer',
                  opacity: busyId === item.id ? 0.6 : 1,
                }}
              >✕ Löschen</button>
            </div>
          </div>
        ))}
      </div>

      {showForm ? (
        <div style={{
          background: 'var(--c1)', border: '1px solid rgba(196,168,106,0.28)',
          borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <label htmlFor="eq-name" style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Name</label>
          <input id="eq-name" type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="z.B. Stuhl am Fenster" style={fieldStyle} />

          <label htmlFor="eq-type" style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Art</label>
          <select id="eq-type" value={newType} onChange={e => setNewType(e.target.value)} style={fieldStyle}>
            {TYPES.map(tp => <option key={tp.id} value={tp.id}>{tp.label}</option>)}
          </select>

          <label htmlFor="eq-price" style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Preis pro Tag (€)</label>
          <input id="eq-price" type="number" min="1" value={newPrice} onChange={e => setNewPrice(e.target.value)}
            placeholder="90" style={fieldStyle} />

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={() => { setShowForm(false); setError(null) }}
              disabled={creating}
              style={{
                flex: 1, padding: 11, borderRadius: 12, background: 'transparent', color: 'var(--stone)',
                border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
                cursor: creating ? 'not-allowed' : 'pointer',
              }}
            >Abbrechen</button>
            <button
              onClick={create}
              disabled={creating}
              style={{
                flex: 2, padding: 11, borderRadius: 12,
                background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
                color: '#1a1000', border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
                cursor: creating ? 'wait' : 'pointer', opacity: creating ? 0.7 : 1,
              }}
            >{creating ? 'Wird angelegt…' : 'Anlegen'}</button>
          </div>
        </div>
      ) : (
        <GoldButton onClick={() => setShowForm(true)}>+ Mietobjekt anlegen</GoldButton>
      )}
    </MeinBereichSubPage>
  )
}
