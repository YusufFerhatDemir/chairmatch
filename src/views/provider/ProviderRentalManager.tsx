'use client'

import { useEffect, useState } from 'react'
import { useRentalStore, RENTAL_TYPE_LABELS } from '@/stores/rentalStore'

const RENTAL_TYPES = [
  { type: 'stuhl', label: 'Barber-Stuhl', icon: '💺', defaultPrice: 4500, desc: 'Friseur-/Barber-Arbeitsplatz mit Stuhl' },
  { type: 'liege', label: 'Massage-/Kosmetik-Liege', icon: '🛋️', defaultPrice: 3800, desc: 'Massage- oder Kosmetik-Liege' },
  { type: 'raum', label: 'Behandlungsraum', icon: '🏠', defaultPrice: 6000, desc: 'Behandlungsraum / geschlossene Kabine' },
  { type: 'opraum', label: 'OP-Raum (steril)', icon: '🏥', defaultPrice: 35000, desc: 'Steriler Operationssaal' },
] as const

interface ProviderRentalManagerProps {
  salonId: string
}

export function ProviderRentalManager({ salonId }: ProviderRentalManagerProps) {
  const store = useRentalStore()
  const [loaded, setLoaded] = useState(false)
  const [toast, setToast] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addType, setAddType] = useState('stuhl')
  const [addName, setAddName] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addPrice, setAddPrice] = useState(45)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loaded) {
      store.loadMyEquipment(salonId)
      setLoaded(true)
    }
  }, [loaded, salonId])

  function showMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  async function handleAdd() {
    if (!addName.trim()) return
    setSaving(true)
    const ok = await store.addEquipment({
      salon_id: salonId,
      type: addType as 'stuhl',
      name: addName,
      description: addDesc || null,
      price_per_day_cents: Math.round(addPrice * 100),
      is_available: true,
    })
    if (ok) {
      setAddName('')
      setAddDesc('')
      setAddPrice(45)
      setShowAdd(false)
      showMsg('Mietangebot erstellt!')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Mietangebot wirklich löschen?')) return
    await store.deleteEquipment(id)
    showMsg('Gelöscht!')
  }

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--gold)', color: '#080706', padding: '10px 20px',
          borderRadius: 12, fontSize: 13, fontWeight: 700, zIndex: 999,
        }}>
          {toast}
        </div>
      )}

      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginBottom: 14, lineHeight: 1.5 }}>
        Biete Arbeitsplätze, Liegen und Räume zur Miete an. Freelancer und andere Professionals können hier buchen.
      </p>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <span style={{
          padding: '4px 10px', borderRadius: 8, background: 'rgba(200,168,75,0.08)',
          fontWeight: 700, fontSize: 13, color: 'var(--gold2)',
        }}>
          {store.myEquipment.filter(e => e.is_available).length} aktiv
        </span>
        <span style={{
          padding: '4px 10px', borderRadius: 8, background: 'var(--c2)',
          fontWeight: 700, fontSize: 13, color: 'var(--stone)',
        }}>
          {store.myEquipment.length} gesamt
        </span>
      </div>

      {store.loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>Lade...</div>}

      {/* My Rentals */}
      {store.myEquipment.map(eq => (
        <div key={eq.id} className="card" style={{ marginBottom: 8, opacity: eq.is_available ? 1 : 0.45 }}>
          <div style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge bgd" style={{ fontSize: 9, marginBottom: 4, display: 'inline-block' }}>
                  {RENTAL_TYPE_LABELS[eq.type] || eq.type}
                </span>
                <div style={{ fontWeight: 700, color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 4 }}>
                  {eq.name}
                </div>
                {eq.description && (
                  <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginTop: 2 }}>
                    {eq.description}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: 'var(--gold2)', fontWeight: 700, fontSize: 'var(--font-md)' }}>
                  {(eq.price_per_day_cents / 100).toFixed(0)} €
                </div>
                <div style={{ fontSize: 10, color: 'var(--stone)' }}>pro Tag</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button onClick={() => store.toggleAvailable(eq.id)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: eq.is_available ? '#f66' : '#6f6', cursor: 'pointer', fontWeight: 600,
                }}>
                {eq.is_available ? '⏸ Deaktivieren' : '▶ Aktivieren'}
              </button>
              <button onClick={() => handleDelete(eq.id)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12,
                  border: '1px solid #f44', background: 'transparent',
                  color: '#f44', cursor: 'pointer', fontWeight: 600,
                }}>
                🗑 Löschen
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Add Form */}
      {showAdd ? (
        <div style={{
          padding: 14, background: 'var(--c2)', borderRadius: 12,
          border: '1px solid var(--border)', marginTop: 12,
        }}>
          <h4 style={{ fontSize: 'var(--font-md)', color: 'var(--gold2)', fontWeight: 700, marginBottom: 10 }}>
            Neues Mietangebot
          </h4>

          <span style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Typ</span>
          <select className="inp" value={addType} onChange={(e) => setAddType(e.target.value)}
            style={{ marginBottom: 8, fontSize: 14, padding: '10px 14px' }}>
            {RENTAL_TYPES.map(rt => (
              <option key={rt.type} value={rt.type}>{rt.icon} {rt.label}</option>
            ))}
          </select>

          <input className="inp" placeholder="Name (z.B. Stuhlplatz 1)" value={addName}
            onChange={(e) => setAddName(e.target.value)} style={{ marginBottom: 8 }} />

          <textarea className="inp" placeholder="Beschreibung (optional)"
            value={addDesc} onChange={(e) => setAddDesc(e.target.value)}
            style={{ marginBottom: 8, minHeight: 60, resize: 'vertical' }} />

          <span style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
            Preis pro Tag (€)
          </span>
          <input className="inp" type="number" value={addPrice}
            onChange={(e) => setAddPrice(Number(e.target.value))} style={{ marginBottom: 10 }} />

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="bgold" style={{ flex: 1, minHeight: 40, fontSize: 13 }}
              onClick={handleAdd} disabled={saving}>
              {saving ? 'Erstellen...' : 'Erstellen'}
            </button>
            <button className="boutline" style={{ flex: 1, minHeight: 40, fontSize: 13 }}
              onClick={() => setShowAdd(false)}>
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button className="boutline" onClick={() => setShowAdd(true)}
          style={{ width: '100%', marginTop: 12, fontSize: 'var(--font-sm)' }}>
          + Neues Mietangebot erstellen
        </button>
      )}

      {/* Available Types Info */}
      <div style={{ marginTop: 20 }}>
        <h4 style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', fontWeight: 700, marginBottom: 8 }}>
          Verfügbare Miettypen
        </h4>
        {RENTAL_TYPES.map(rt => (
          <div key={rt.type} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{ fontSize: 22 }}>{rt.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)' }}>{rt.label}</div>
              <div style={{ fontSize: 11, color: 'var(--stone)' }}>{rt.desc}</div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--gold2)', fontWeight: 600 }}>
              ab {(rt.defaultPrice / 100).toFixed(0)} €/Tag
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
