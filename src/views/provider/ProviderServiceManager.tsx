'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useServiceTemplateStore, type ServiceTemplate } from '@/stores/serviceTemplateStore'

interface ProviderServiceManagerProps {
  salonId: string
  salonCategory: string
}

interface SalonService {
  id: string
  name: string
  duration_minutes: number
  price_cents: number
  is_active: boolean
  sort_order: number
}

export function ProviderServiceManager({ salonId, salonCategory }: ProviderServiceManagerProps) {
  const templateStore = useServiceTemplateStore()
  const [services, setServices] = useState<SalonService[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customDur, setCustomDur] = useState(30)
  const [customPrice, setCustomPrice] = useState(0)

  useEffect(() => {
    templateStore.loadTemplates()
    loadServices()
  }, [salonId])

  async function loadServices() {
    setLoading(true)
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('salon_id', salonId)
      .order('sort_order', { ascending: true })

    setServices((data || []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      name: s.name as string,
      duration_minutes: (s.duration_minutes as number) || 30,
      price_cents: (s.price_cents as number) || 0,
      is_active: (s.is_active as boolean) ?? true,
      sort_order: (s.sort_order as number) || 0,
    })))
    setLoading(false)
  }

  function showMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  // Check if a template is already added
  function isAdded(template: ServiceTemplate) {
    return services.some(s => s.name === template.name)
  }

  // Add service from template
  async function addFromTemplate(template: ServiceTemplate) {
    if (isAdded(template)) return
    setSaving(true)
    const { error } = await supabase.from('services').insert({
      salon_id: salonId,
      name: template.name,
      duration_minutes: template.duration_minutes,
      price_cents: Math.round(template.default_price * 100),
      is_active: true,
      sort_order: services.length,
    } as never)
    if (!error) {
      await loadServices()
      showMsg(`${template.name} hinzugefügt!`)
    }
    setSaving(false)
  }

  // Remove service
  async function removeService(id: string) {
    setSaving(true)
    await supabase.from('services').delete().eq('id', id)
    await loadServices()
    showMsg('Entfernt!')
    setSaving(false)
  }

  // Toggle active
  async function toggleActive(id: string) {
    const svc = services.find(s => s.id === id)
    if (!svc) return
    await supabase.from('services').update({ is_active: !svc.is_active } as never).eq('id', id)
    await loadServices()
  }

  // Update price
  async function updatePrice(id: string, newPrice: number) {
    await supabase.from('services').update({ price_cents: Math.round(newPrice * 100) } as never).eq('id', id)
    await loadServices()
    showMsg('Preis gespeichert!')
  }

  // Add custom service
  async function addCustom() {
    if (!customName.trim()) return
    setSaving(true)
    await supabase.from('services').insert({
      salon_id: salonId,
      name: customName,
      duration_minutes: customDur,
      price_cents: Math.round(customPrice * 100),
      is_active: true,
      sort_order: services.length,
    } as never)
    await loadServices()
    setCustomName('')
    setCustomDur(30)
    setCustomPrice(0)
    setShowCustom(false)
    showMsg('Service erstellt!')
    setSaving(false)
  }

  // Alle aktivieren/deaktivieren
  async function toggleAll(active: boolean) {
    setSaving(true)
    for (const s of services) {
      await supabase.from('services').update({ is_active: active } as never).eq('id', s.id)
    }
    await loadServices()
    showMsg(active ? 'Alle aktiviert!' : 'Alle deaktiviert!')
    setSaving(false)
  }

  // Templates for this category
  const categoryTemplates = templateStore.getByCategory(salonCategory)
  const activeCount = services.filter(s => s.is_active).length

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

      {/* Stats */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14, fontSize: 13, color: 'var(--stone)',
      }}>
        <span style={{
          padding: '4px 10px', borderRadius: 8, background: 'rgba(200,168,75,0.08)',
          fontWeight: 700, color: 'var(--gold2)',
        }}>
          {activeCount} aktiv
        </span>
        <span style={{
          padding: '4px 10px', borderRadius: 8, background: 'var(--c2)', fontWeight: 700,
        }}>
          {services.length} gesamt
        </span>
      </div>

      {/* Bulk actions */}
      {services.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <button className="boutline" style={{ fontSize: 11, padding: '6px 12px', minHeight: 32 }}
            onClick={() => toggleAll(true)} disabled={saving}>
            Alle aktivieren
          </button>
          <button className="boutline" style={{ fontSize: 11, padding: '6px 12px', minHeight: 32 }}
            onClick={() => toggleAll(false)} disabled={saving}>
            Alle deaktivieren
          </button>
        </div>
      )}

      {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>Lade...</div>}

      {/* My Services */}
      <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>
        Meine Services
      </h3>
      {services.map(svc => (
        <ServiceRow
          key={svc.id}
          service={svc}
          onToggle={() => toggleActive(svc.id)}
          onRemove={() => removeService(svc.id)}
          onPriceChange={(p) => updatePrice(svc.id, p)}
        />
      ))}

      {/* Custom service */}
      {showCustom ? (
        <div style={{
          padding: 14, background: 'var(--c2)', borderRadius: 12,
          border: '1px solid var(--border)', marginTop: 10, marginBottom: 14,
        }}>
          <input className="inp" placeholder="Name *" value={customName}
            onChange={(e) => setCustomName(e.target.value)} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 600 }}>Dauer (Min)</span>
              <input className="inp" type="number" value={customDur}
                onChange={(e) => setCustomDur(Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 600 }}>Preis (€)</span>
              <input className="inp" type="number" value={customPrice}
                onChange={(e) => setCustomPrice(Number(e.target.value))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="bgold" style={{ flex: 1, minHeight: 36, fontSize: 13 }}
              onClick={addCustom} disabled={saving}>
              Speichern
            </button>
            <button className="boutline" style={{ flex: 1, minHeight: 36, fontSize: 13 }}
              onClick={() => setShowCustom(false)}>
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button className="boutline" onClick={() => setShowCustom(true)}
          style={{ width: '100%', marginTop: 10, marginBottom: 14, fontSize: 'var(--font-sm)' }}>
          + Eigenen Service erstellen
        </button>
      )}

      {/* Template Catalog */}
      {categoryTemplates.length > 0 && (
        <>
          <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: 'var(--gold2)', marginTop: 16, marginBottom: 8 }}>
            Vorlagen — {salonCategory.charAt(0).toUpperCase() + salonCategory.slice(1)}
          </h3>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginBottom: 10 }}>
            Tippe auf +, um einen Service aus dem Katalog hinzuzufügen.
          </p>
          {categoryTemplates.map((tmpl) => {
            const added = isAdded(tmpl)
            return (
              <div key={tmpl.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                opacity: added ? 0.4 : 1,
              }}>
                <div>
                  <span style={{ color: 'var(--cream)', fontSize: 13 }}>{tmpl.name}</span>
                  <span style={{ color: 'var(--stone)', fontSize: 11, marginLeft: 8 }}>{tmpl.duration_minutes} Min</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--gold2)', fontWeight: 600, fontSize: 13 }}>
                    {tmpl.default_price.toFixed(0)} €
                  </span>
                  <button
                    onClick={() => addFromTemplate(tmpl)}
                    disabled={added || saving}
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
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

function ServiceRow({
  service,
  onToggle,
  onRemove,
  onPriceChange,
}: {
  service: SalonService
  onToggle: () => void
  onRemove: () => void
  onPriceChange: (price: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState((service.price_cents / 100).toFixed(0))

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      opacity: service.is_active ? 1 : 0.45,
    }}>
      {/* Toggle */}
      <button
        onClick={onToggle}
        style={{
          width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: service.is_active ? 'var(--gold)' : 'var(--c3)',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 2,
          left: service.is_active ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s',
        }} />
      </button>

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)' }}>{service.name}</div>
        <div style={{ fontSize: 11, color: 'var(--stone)' }}>{service.duration_minutes} Min</div>
      </div>

      {/* Price */}
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input className="inp" type="number" value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ width: 60, padding: '4px 8px', fontSize: 13, textAlign: 'right' }} />
          <span style={{ color: 'var(--stone)', fontSize: 11 }}>€</span>
          <button onClick={() => { onPriceChange(Number(price)); setEditing(false) }}
            style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            ✓
          </button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)}
          style={{ color: 'var(--gold2)', fontWeight: 600, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>
          {(service.price_cents / 100).toFixed(0)} €
        </button>
      )}

      {/* Delete */}
      <button onClick={onRemove}
        style={{ color: '#f66', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
        🗑
      </button>
    </div>
  )
}
