import { useEffect, useState } from 'react'
import { usePromoCodeStore, type PromoCodeEntry } from '@/stores/promoCodeStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const s = {
  wrap: { padding: 'var(--pad)' },
  form: {
    padding: 16,
    background: 'var(--c2)',
    borderRadius: 12,
    marginBottom: 16,
    border: '1px solid var(--border)',
  },
  formTitle: { fontWeight: 700 as const, fontSize: 15, color: 'var(--gold2)', marginBottom: 12 },
  label: { fontSize: 11, color: 'var(--stone)', fontWeight: 600 as const, marginBottom: 3, marginTop: 8, display: 'block' as const },
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottom: '1px solid var(--border)',
  },
  code: { fontFamily: 'monospace', fontWeight: 700 as const, fontSize: 15, color: 'var(--gold2)', letterSpacing: 2 },
  select: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--c1)',
    color: 'var(--cream)',
    fontSize: 14,
  },
  count: { fontSize: 13, color: 'var(--stone)', marginBottom: 12 },
}

export function PromoCodesTab() {
  const store = usePromoCodeStore()
  const [loaded, setLoaded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState(10)
  const [type, setType] = useState<'percent' | 'fixed'>('percent')
  const [maxUses, setMaxUses] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    if (!loaded) {
      store.loadCodes()
      setLoaded(true)
    }
  }, [loaded])

  const handleAdd = async () => {
    if (!code.trim()) return
    const ok = await store.addCode({
      code, discount, type,
      max_uses: maxUses ? parseInt(maxUses) : null,
      expires_at: expiresAt || null,
    })
    if (ok) {
      setCode(''); setDiscount(10); setType('percent')
      setMaxUses(''); setExpiresAt(''); setShowForm(false)
    }
  }

  return (
    <div style={s.wrap}>
      {/* Stats */}
      <div style={s.count}>
        🎫 {store.codes.length} Codes ·{' '}
        ✅ {store.codes.filter(c => c.is_active).length} Aktiv ·{' '}
        ⏸ {store.codes.filter(c => !c.is_active).length} Inaktiv
      </div>

      {/* Add button */}
      <div style={{ marginBottom: 12 }}>
        <Button variant="gold" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Abbrechen' : '+ Neuer Promo Code'}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={s.form}>
          <div style={s.formTitle}>Neuer Promo Code</div>
          <Input
            placeholder="CODE (z.B. SUMMER25)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{ fontFamily: 'monospace', letterSpacing: 2 }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <span style={s.label}>Rabatt</span>
              <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={s.label}>Typ</span>
              <select style={s.select} value={type} onChange={(e) => setType(e.target.value as 'percent' | 'fixed')}>
                <option value="percent">Prozent (%)</option>
                <option value="fixed">Festbetrag (€)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <span style={s.label}>Max. Nutzungen (leer = unbegrenzt)</span>
              <Input placeholder="∞" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={s.label}>Gültig bis</span>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>

          <Button variant="gold" onClick={handleAdd} style={{ marginTop: 12, width: '100%' }}>
            Speichern
          </Button>
        </div>
      )}

      {/* Error */}
      {store.error && (
        <div style={{ color: '#f66', fontSize: 13, marginBottom: 8, padding: 8, background: 'rgba(220,50,50,0.1)', borderRadius: 8 }}>
          ⚠️ {store.error}
        </div>
      )}

      {/* Loading */}
      {store.loading && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>Lade...</div>
      )}

      {/* Code List */}
      {store.codes.map((pc) => {
        const expired = pc.expires_at && new Date(pc.expires_at) < new Date()
        const maxed = pc.max_uses !== null && pc.used_count >= pc.max_uses

        return (
          <div key={pc.id} style={{ ...s.card, opacity: pc.is_active && !expired ? 1 : 0.5 }}>
            <div>
              <div style={s.code}>{pc.code}</div>
              <div style={{ fontSize: 12, color: 'var(--stone)', marginTop: 4 }}>
                {pc.type === 'percent' ? `${pc.discount}% Rabatt` : `${pc.discount} € Rabatt`}
                {pc.max_uses !== null && ` · ${pc.used_count}/${pc.max_uses} genutzt`}
                {pc.expires_at && ` · bis ${new Date(pc.expires_at).toLocaleDateString('de-DE')}`}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {expired && <Badge variant="red">Abgelaufen</Badge>}
              {maxed && <Badge variant="red">Aufgebraucht</Badge>}
              {!expired && !maxed && (
                <Badge variant={pc.is_active ? 'green' : 'red'}>
                  {pc.is_active ? 'Aktiv' : 'Inaktiv'}
                </Badge>
              )}
              <button
                onClick={() => store.toggleActive(pc.id)}
                style={{
                  padding: '4px 8px', borderRadius: 6, fontSize: 11,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--stone)', cursor: 'pointer',
                }}
              >
                {pc.is_active ? '⏸' : '▶'}
              </button>
              <button
                onClick={() => store.deleteCode(pc.id)}
                style={{ color: '#f66', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
              >
                🗑
              </button>
            </div>
          </div>
        )
      })}

      {!store.loading && store.codes.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>
          Keine Promo Codes vorhanden.
        </div>
      )}
    </div>
  )
}
