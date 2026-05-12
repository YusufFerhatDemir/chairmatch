'use client'

import { useEffect, useState } from 'react'

const PARTNERS = ['amazon', 'douglas', 'notino', 'flaconi', 'direct'] as const
type Partner = (typeof PARTNERS)[number]

interface AffiliateProduct {
  id: string
  partner: Partner
  product_name: string
  product_url: string
  category: string | null
  commission_rate: number | null
  image_url: string | null
  price_cents: number | null
  is_active: boolean
  created_at: string
  stats: {
    clicks: number
    conversions: number
    revenue_cents: number
    commission_cents: number
  }
}

interface FormState {
  partner: Partner
  product_name: string
  product_url: string
  category: string
  commission_rate: string
  image_url: string
  price_cents: string
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  partner: 'amazon',
  product_name: '',
  product_url: '',
  category: 'Haarpflege',
  commission_rate: '5',
  image_url: '',
  price_cents: '',
  is_active: true,
}

const CATEGORIES = ['Haarpflege', 'Gesichtspflege', 'Make-up', 'Tools', 'Sonstiges']

function fmtEuro(cents: number | null): string {
  if (cents == null) return '–'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export default function AdminAffiliateClient() {
  const [products, setProducts] = useState<AffiliateProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/affiliate/products')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'Fehler beim Laden')
        return
      }
      const data = await res.json()
      setProducts(data.products || [])
      setError(null)
    } catch {
      setError('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  function startEdit(p: AffiliateProduct) {
    setEditingId(p.id)
    setForm({
      partner: p.partner,
      product_name: p.product_name,
      product_url: p.product_url,
      category: p.category ?? '',
      commission_rate: p.commission_rate != null ? String(p.commission_rate) : '5',
      image_url: p.image_url ?? '',
      price_cents: p.price_cents != null ? String(p.price_cents) : '',
      is_active: p.is_active,
    })
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        partner: form.partner,
        product_name: form.product_name.trim(),
        product_url: form.product_url.trim(),
        category: form.category.trim() || null,
        commission_rate: form.commission_rate ? Number(form.commission_rate) : null,
        image_url: form.image_url.trim() || null,
        price_cents: form.price_cents ? Number(form.price_cents) : null,
        is_active: form.is_active,
      }
      const url = editingId
        ? `/api/admin/affiliate/products?id=${encodeURIComponent(editingId)}`
        : '/api/admin/affiliate/products'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || 'Speichern fehlgeschlagen')
        return
      }
      resetForm()
      await load()
    } catch {
      setError('Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(p: AffiliateProduct) {
    const res = await fetch(`/api/admin/affiliate/products?id=${encodeURIComponent(p.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !p.is_active }),
    })
    if (res.ok) load()
  }

  async function remove(p: AffiliateProduct) {
    if (!confirm(`Produkt "${p.product_name}" wirklich löschen?`)) return
    const res = await fetch(`/api/admin/affiliate/products?id=${encodeURIComponent(p.id)}`, {
      method: 'DELETE',
    })
    if (res.ok) load()
  }

  const totalClicks = products.reduce((s, p) => s + p.stats.clicks, 0)
  const totalConversions = products.reduce((s, p) => s + p.stats.conversions, 0)
  const totalCommission = products.reduce((s, p) => s + p.stats.commission_cents, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--stone)' }}>Produkte</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold2)' }}>{products.length}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--stone)' }}>Klicks gesamt</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold2)' }}>{totalClicks}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--stone)' }}>Conversions</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold2)' }}>{totalConversions}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--stone)' }}>Provision</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold2)' }}>{fmtEuro(totalCommission)}</div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: 'var(--cream)' }}>
            {editingId ? 'Produkt bearbeiten' : 'Neues Produkt hinzufügen'}
          </strong>
          {editingId && (
            <button type="button" className="boutline" onClick={resetForm} style={{ fontSize: 11, padding: '4px 10px' }}>
              Abbrechen
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--stone)' }}>
            Partner
            <select
              className="inp"
              value={form.partner}
              onChange={e => setForm(f => ({ ...f, partner: e.target.value as Partner }))}
              required
            >
              {PARTNERS.map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--stone)' }}>
            Kategorie
            <select
              className="inp"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--stone)' }}>
            Provision %
            <input
              className="inp"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.commission_rate}
              onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--stone)' }}>
            Preis (Cents)
            <input
              className="inp"
              type="number"
              min={0}
              step={1}
              placeholder="z. B. 2890 = 28,90 €"
              value={form.price_cents}
              onChange={e => setForm(f => ({ ...f, price_cents: e.target.value }))}
            />
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--stone)' }}>
          Produktname
          <input
            className="inp"
            type="text"
            value={form.product_name}
            onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
            required
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--stone)' }}>
          Affiliate-URL (mit Tracking-ID)
          <input
            className="inp"
            type="url"
            placeholder="https://amazon.de/dp/B07PRODUCT?tag=chairmatch-21"
            value={form.product_url}
            onChange={e => setForm(f => ({ ...f, product_url: e.target.value }))}
            required
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--stone)' }}>
          Bild-URL
          <input
            className="inp"
            type="url"
            placeholder="https://..."
            value={form.image_url}
            onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--cream)' }}>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
          />
          Aktiv (für Kunden sichtbar)
        </label>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="submit" className="bgold" disabled={submitting} style={{ fontSize: 12, padding: '8px 16px' }}>
            {submitting ? 'Speichern…' : editingId ? 'Aktualisieren' : 'Hinzufügen'}
          </button>
        </div>
      </form>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && <div style={{ color: 'var(--stone)', fontSize: 13 }}>Lade Produkte…</div>}
        {!loading && products.length === 0 && (
          <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--stone)' }}>
            Noch keine Affiliate-Produkte. Füge oben dein erstes Produkt hinzu.
          </div>
        )}
        {products.map(p => (
          <div key={p.id} className="card" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 8, overflow: 'hidden',
              background: 'var(--c3)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--stone)', fontSize: 22,
            }}>
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : '🛍️'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.product_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
                    {p.partner.toUpperCase()} · {p.category || '—'} · {p.commission_rate ?? '–'}% · {fmtEuro(p.price_cents)}
                  </div>
                </div>
                <span className="badge" style={{
                  fontSize: 9,
                  background: p.is_active ? 'rgba(74,138,90,0.15)' : 'rgba(232,80,64,0.1)',
                  color: p.is_active ? '#6ABF80' : 'var(--red)',
                  border: `1px solid ${p.is_active ? 'rgba(74,138,90,0.3)' : 'rgba(232,80,64,0.2)'}`,
                }}>{p.is_active ? 'AKTIV' : 'INAKTIV'}</span>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--stone)' }}>
                <span>👆 <strong style={{ color: 'var(--gold2)' }}>{p.stats.clicks}</strong> Klicks</span>
                <span>💰 <strong style={{ color: 'var(--gold2)' }}>{p.stats.conversions}</strong> Conv.</span>
                <span>💶 <strong style={{ color: 'var(--gold2)' }}>{fmtEuro(p.stats.revenue_cents)}</strong> Umsatz</span>
                <span>🎯 <strong style={{ color: 'var(--gold2)' }}>{fmtEuro(p.stats.commission_cents)}</strong> Provision</span>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                <button className="boutline" onClick={() => startEdit(p)} style={{ fontSize: 11, padding: '6px 12px' }}>
                  ✏ Bearbeiten
                </button>
                <button className="boutline" onClick={() => toggleActive(p)} style={{ fontSize: 11, padding: '6px 12px' }}>
                  {p.is_active ? '⏸ Deaktivieren' : '▶ Aktivieren'}
                </button>
                <button
                  className="boutline"
                  onClick={() => remove(p)}
                  style={{ fontSize: 11, padding: '6px 12px', color: 'var(--red)', borderColor: 'rgba(232,80,64,0.3)' }}
                >
                  🗑 Löschen
                </button>
                <a
                  href={p.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="boutline"
                  style={{ fontSize: 11, padding: '6px 12px', textDecoration: 'none' }}
                >
                  🔗 Vorschau
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
