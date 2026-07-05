'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useEquipmentTemplateStore, type EquipmentTemplate } from '@/stores/equipmentTemplateStore'

interface ProviderEquipmentManagerProps {
  salonId: string
  salonCategory: string
}

interface SalonEquipment {
  id: string
  name: string
  icon: string
  price_per_day: number
  is_active: boolean
}

export function ProviderEquipmentManager({ salonId, salonCategory }: ProviderEquipmentManagerProps) {
  const templateStore = useEquipmentTemplateStore()
  const [equipment, setEquipment] = useState<SalonEquipment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  // We'll store equipment as services with category='equipment' for simplicity
  // since there's no dedicated salon_equipment table
  // Actually, let's use a localStorage approach similar to index.html, or store in salon's JSON field
  // Better: use the rental_equipment table with a special convention

  useEffect(() => {
    templateStore.loadTemplates()
    loadEquipment()
  }, [salonId])

  async function loadEquipment() {
    setLoading(true)
    // Store equipment selections in localStorage keyed by salonId
    const stored = localStorage.getItem(`cm_equip_${salonId}`)
    if (stored) {
      setEquipment(JSON.parse(stored))
    }
    setLoading(false)
  }

  function saveEquipment(items: SalonEquipment[]) {
    setEquipment(items)
    localStorage.setItem(`cm_equip_${salonId}`, JSON.stringify(items))
  }

  function showMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  function isAdded(template: EquipmentTemplate) {
    return equipment.some(e => e.name === template.name)
  }

  function addFromTemplate(template: EquipmentTemplate) {
    if (isAdded(template)) return
    const updated = [...equipment, {
      id: `eq_${Date.now()}`,
      name: template.name,
      icon: template.icon,
      price_per_day: template.default_price_per_day,
      is_active: true,
    }]
    saveEquipment(updated)
    showMsg(`${template.name} hinzugefügt!`)
  }

  function toggleEquip(id: string) {
    const updated = equipment.map(e => e.id === id ? { ...e, is_active: !e.is_active } : e)
    saveEquipment(updated)
  }

  function removeEquip(id: string) {
    const updated = equipment.filter(e => e.id !== id)
    saveEquipment(updated)
    showMsg('Entfernt!')
  }

  function updatePrice(id: string, price: number) {
    const updated = equipment.map(e => e.id === id ? { ...e, price_per_day: price } : e)
    saveEquipment(updated)
    showMsg('Preis gespeichert!')
  }

  const categoryTemplates = templateStore.getByCategory(salonCategory)
  const activeCount = equipment.filter(e => e.is_active).length

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

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, fontSize: 13 }}>
        <span style={{
          padding: '4px 10px', borderRadius: 8, background: 'rgba(200,168,75,0.08)',
          fontWeight: 700, color: 'var(--gold2)',
        }}>
          {activeCount} aktiv
        </span>
        <span style={{
          padding: '4px 10px', borderRadius: 8, background: 'var(--c2)',
          fontWeight: 700, color: 'var(--stone)',
        }}>
          {equipment.length} gesamt
        </span>
      </div>

      {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>Lade...</div>}

      {/* My Equipment */}
      <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>
        Meine Ausstattung
      </h3>

      {equipment.length === 0 && !loading && (
        <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginBottom: 12 }}>
          Noch keine Ausstattung hinzugefügt. Wähle aus dem Katalog unten.
        </p>
      )}

      {equipment.map(eq => (
        <div key={eq.id} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          opacity: eq.is_active ? 1 : 0.45,
        }}>
          <button onClick={() => toggleEquip(eq.id)} style={{
            width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: eq.is_active ? 'var(--gold)' : 'var(--c3)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <span style={{
              position: 'absolute', top: 2, left: eq.is_active ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{eq.icon}</span>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--cream)' }}>
            {eq.name}
          </div>
          <span style={{ color: 'var(--gold2)', fontWeight: 600, fontSize: 13 }}>
            {eq.price_per_day > 0 ? `${eq.price_per_day} €/Tag` : 'inkl.'}
          </span>
          <button onClick={() => removeEquip(eq.id)}
            style={{ color: '#f66', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
            🗑
          </button>
        </div>
      ))}

      {/* Template Catalog */}
      {categoryTemplates.length > 0 && (
        <>
          <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: 'var(--gold2)', marginTop: 16, marginBottom: 8 }}>
            Katalog — {salonCategory.charAt(0).toUpperCase() + salonCategory.slice(1)}
          </h3>
          {categoryTemplates.map(tmpl => {
            const added = isAdded(tmpl)
            return (
              <div key={tmpl.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: added ? 0.4 : 1,
              }}>
                <span style={{ fontSize: 18 }}>{tmpl.icon}</span>
                <span style={{ flex: 1, color: 'var(--cream)', fontSize: 13 }}>{tmpl.name}</span>
                <span style={{ color: 'var(--gold2)', fontWeight: 600, fontSize: 13 }}>
                  {tmpl.default_price_per_day > 0 ? `${tmpl.default_price_per_day} €/Tag` : 'inkl.'}
                </span>
                <button
                  onClick={() => addFromTemplate(tmpl)}
                  disabled={added}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: added ? 'var(--c3)' : 'var(--gold)',
                    color: added ? 'var(--stone)' : '#080706',
                    border: 'none', cursor: added ? 'default' : 'pointer',
                    fontSize: 14, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {added ? '✓' : '+'}
                </button>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
