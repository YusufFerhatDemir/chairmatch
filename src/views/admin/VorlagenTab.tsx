import { useEffect, useState } from 'react'
import { useServiceTemplateStore, type ServiceTemplate } from '@/stores/serviceTemplateStore'
import { useEquipmentTemplateStore, type EquipmentTemplate } from '@/stores/equipmentTemplateStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const CATS = [
  'barber', 'friseur', 'kosmetik', 'aesthetik',
  'nail', 'massage', 'lash', 'arzt', 'opraum',
]

const CAT_LABELS: Record<string, string> = {
  barber: 'Barbershop', friseur: 'Friseur', kosmetik: 'Kosmetik',
  aesthetik: 'Ästhetik', nail: 'Nagelstudio', massage: 'Massage',
  lash: 'Lash & Brows', arzt: 'Arzt / Klinik', opraum: 'OP-Raum',
}

const s = {
  wrap: { padding: 'var(--pad)' },
  section: { marginBottom: 24 },
  toggle: {
    display: 'flex',
    gap: 6,
    marginBottom: 16,
  },
  toggleBtn: (active: boolean) => ({
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700 as const,
    cursor: 'pointer' as const,
    border: active ? '1.5px solid var(--gold)' : '1.5px solid var(--border)',
    background: active ? 'rgba(200,168,75,0.12)' : 'transparent',
    color: active ? 'var(--gold2)' : 'var(--stone)',
  }),
  catHeader: {
    fontSize: 14,
    fontWeight: 700 as const,
    color: 'var(--gold2)',
    padding: '10px 0 6px',
    borderBottom: '1px solid var(--border)',
    marginBottom: 6,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    fontSize: 13,
  },
  form: {
    padding: 14,
    background: 'var(--c2)',
    borderRadius: 10,
    marginBottom: 12,
    border: '1px solid var(--border)',
  },
  label: { fontSize: 11, color: 'var(--stone)', fontWeight: 600 as const, marginBottom: 3, display: 'block' as const },
}

type ViewMode = 'services' | 'equipment'

export function VorlagenTab() {
  const svcStore = useServiceTemplateStore()
  const eqStore = useEquipmentTemplateStore()
  const [mode, setMode] = useState<ViewMode>('services')
  const [loaded, setLoaded] = useState(false)
  const [addCat, setAddCat] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newDur, setNewDur] = useState(30)
  const [newPrice, setNewPrice] = useState(0)
  const [newIcon, setNewIcon] = useState('')

  useEffect(() => {
    if (!loaded) {
      svcStore.loadTemplates()
      eqStore.loadTemplates()
      setLoaded(true)
    }
  }, [loaded])

  const handleAddService = async (cat: string) => {
    if (!newName.trim()) return
    await svcStore.addTemplate({
      category: cat, name: newName,
      duration_minutes: newDur, default_price: newPrice,
    })
    setNewName(''); setNewDur(30); setNewPrice(0); setAddCat(null)
  }

  const handleAddEquipment = async (cat: string) => {
    if (!newName.trim()) return
    await eqStore.addTemplate({
      category: cat, name: newName,
      default_price_per_day: newPrice, icon: newIcon,
    })
    setNewName(''); setNewPrice(0); setNewIcon(''); setAddCat(null)
  }

  const loading = mode === 'services' ? svcStore.loading : eqStore.loading
  const error = mode === 'services' ? svcStore.error : eqStore.error

  return (
    <div style={s.wrap}>
      {/* Toggle */}
      <div style={s.toggle}>
        <button style={s.toggleBtn(mode === 'services')} onClick={() => setMode('services')}>
          📋 Service Vorlagen ({svcStore.templates.length})
        </button>
        <button style={s.toggleBtn(mode === 'equipment')} onClick={() => setMode('equipment')}>
          🔧 Equipment Vorlagen ({eqStore.templates.length})
        </button>
      </div>

      {loading && <div style={{ color: 'var(--stone)', padding: 16, textAlign: 'center' }}>Lade...</div>}
      {error && <div style={{ color: '#f66', fontSize: 13, marginBottom: 8 }}>⚠️ {error}</div>}

      {/* Service Templates */}
      {mode === 'services' && CATS.map((cat) => {
        const items = svcStore.getByCategory(cat)
        if (items.length === 0 && addCat !== cat) return null
        return (
          <div key={cat} style={s.section}>
            <div style={s.catHeader}>
              {CAT_LABELS[cat]} ({items.length})
              <button
                onClick={() => setAddCat(addCat === cat ? null : cat)}
                style={{ float: 'right', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
              >
                {addCat === cat ? '✕' : '+ Neu'}
              </button>
            </div>

            {addCat === cat && (
              <div style={s.form}>
                <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <div style={{ flex: 1 }}>
                    <span style={s.label}>Dauer (Min)</span>
                    <Input type="number" value={newDur} onChange={(e) => setNewDur(Number(e.target.value))} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={s.label}>Preis (€)</span>
                    <Input type="number" value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} />
                  </div>
                </div>
                <Button variant="gold" onClick={() => handleAddService(cat)} style={{ marginTop: 8, width: '100%' }}>
                  Speichern
                </Button>
              </div>
            )}

            {items.map((t) => (
              <div key={t.id} style={s.row}>
                <div>
                  <span style={{ color: 'var(--cream)' }}>{t.name}</span>
                  <span style={{ color: 'var(--stone)', marginLeft: 8, fontSize: 11 }}>
                    {t.duration_minutes} Min
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--gold2)', fontWeight: 600 }}>{t.default_price.toFixed(0)} €</span>
                  <button
                    onClick={() => svcStore.deleteTemplate(t.id)}
                    style={{ color: '#f66', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {/* Equipment Templates */}
      {mode === 'equipment' && CATS.map((cat) => {
        const items = eqStore.getByCategory(cat)
        if (items.length === 0 && addCat !== cat) return null
        return (
          <div key={cat} style={s.section}>
            <div style={s.catHeader}>
              {CAT_LABELS[cat]} ({items.length})
              <button
                onClick={() => setAddCat(addCat === cat ? null : cat)}
                style={{ float: 'right', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
              >
                {addCat === cat ? '✕' : '+ Neu'}
              </button>
            </div>

            {addCat === cat && (
              <div style={s.form}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 50 }}>
                    <Input placeholder="Icon" value={newIcon} onChange={(e) => setNewIcon(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: 6 }}>
                  <span style={s.label}>Preis/Tag (€)</span>
                  <Input type="number" value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} />
                </div>
                <Button variant="gold" onClick={() => handleAddEquipment(cat)} style={{ marginTop: 8, width: '100%' }}>
                  Speichern
                </Button>
              </div>
            )}

            {items.map((t) => (
              <div key={t.id} style={s.row}>
                <div>
                  <span style={{ marginRight: 6 }}>{t.icon}</span>
                  <span style={{ color: 'var(--cream)' }}>{t.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--gold2)', fontWeight: 600 }}>
                    {t.default_price_per_day > 0 ? `${t.default_price_per_day.toFixed(0)} €/Tag` : 'inkl.'}
                  </span>
                  <button
                    onClick={() => eqStore.deleteTemplate(t.id)}
                    style={{ color: '#f66', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
