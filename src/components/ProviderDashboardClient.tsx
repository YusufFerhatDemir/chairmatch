'use client'

import { useState } from 'react'
import { ComplianceStatus } from '@/components/ComplianceStatus'

interface Salon {
  id: string; name: string; description: string | null; city: string | null
  street: string | null; house_number: string | null; postal_code: string | null
  phone: string | null; email: string | null
  website: string | null; avg_rating: number
  review_count: number; is_active: boolean; is_verified: boolean
  opening_hours: Record<string, string> | null
}

interface Service {
  id: string; name: string; description: string | null
  duration_minutes: number; price_cents: number; is_active: boolean; sort_order: number
}

interface Booking {
  id: string; booking_date: string; start_time: string; status: string
  service: { name: string } | null; customer: { full_name: string } | null
}

interface Review {
  id: string; rating: number; comment: string | null
  customer: { full_name: string } | null; created_at: string
}

interface Props {
  salon: Salon
  services: Service[]
  bookings: Booking[]
  reviews: Review[]
}

type Tab = 'overview' | 'edit' | 'services' | 'bookings' | 'fotos' | 'statistik'

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

export default function ProviderDashboardClient({ salon, services: initServices, bookings, reviews }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [form, setForm] = useState({
    name: salon.name, description: salon.description || '', city: salon.city || '',
    street: salon.street || '', house_number: salon.house_number || '',
    postal_code: salon.postal_code || '',
    phone: salon.phone || '', email: salon.email || '',
    website: salon.website || '',
  })
  const [hours, setHours] = useState<Record<string, string>>(salon.opening_hours || {})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [services, setServices] = useState(initServices)
  const [newSvc, setNewSvc] = useState({ name: '', price: '', duration: '30' })
  const [editSvc, setEditSvc] = useState<string | null>(null)

  async function saveSalon() {
    setSaving(true); setSaveMsg('')
    const res = await fetch('/api/provider/salon', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, opening_hours: hours }),
    })
    setSaving(false)
    setSaveMsg(res.ok ? 'Gespeichert!' : 'Fehler beim Speichern')
    setTimeout(() => setSaveMsg(''), 3000)
  }

  async function addService() {
    if (!newSvc.name) return
    const res = await fetch('/api/provider/services', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newSvc.name,
        price_cents: Math.round(parseFloat(newSvc.price || '0') * 100),
        duration_minutes: parseInt(newSvc.duration) || 30,
      }),
    })
    if (res.ok) {
      const svc = await res.json()
      setServices(prev => [...prev, svc])
      setNewSvc({ name: '', price: '', duration: '30' })
    }
  }

  async function deleteService(id: string) {
    const res = await fetch('/api/provider/services', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setServices(prev => prev.filter(s => s.id !== id))
  }

  async function updateService(svc: Service) {
    await fetch('/api/provider/services', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(svc),
    })
    setEditSvc(null)
  }

  async function updateBookingStatus(id: string, status: string) {
    await fetch(`/api/bookings/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    window.location.reload()
  }

  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  async function loadPhotos() {
    const res = await fetch(`/api/upload?salonId=${salon.id}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setPhotos(data)
    }
  }

  async function uploadPhoto(file: File) {
    setUploadingPhoto(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('salonId', salon.id)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (res.ok) {
      const img = await res.json()
      setPhotos(prev => [...prev, img])
    }
    setUploadingPhoto(false)
  }

  async function deletePhoto(id: string) {
    const res = await fetch(`/api/upload/${id}`, { method: 'DELETE' })
    if (res.ok) setPhotos(prev => prev.filter(p => p.id !== id))
  }

  // Revenue and stats
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed')
  const pendingBookings = bookings.filter(b => b.status === 'pending')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Übersicht' },
    { key: 'edit', label: 'Salon' },
    { key: 'services', label: 'Services' },
    { key: 'bookings', label: 'Termine' },
    { key: 'fotos', label: 'Fotos' },
    { key: 'statistik', label: 'Statistik' },
  ]

  const inp = { className: 'inp', style: { width: '100%' } as const }
  const lbl = { style: { fontSize: 12, color: 'var(--stone)', display: 'block', marginBottom: 4 } as const }

  const address = [salon.street, salon.house_number].filter(Boolean).join(' ')
  const statusLabel = salon.is_active ? (salon.is_verified ? 'Verifiziert' : 'Aktiv') : 'Inaktiv'

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginBottom: 4 }}>Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)' }}>
            {salon.name} · <span aria-label={salon.is_active ? 'Online' : 'Offline'}>{salon.is_active ? '🟢 Online' : '🔴 Offline'}</span> · {statusLabel}
          </p>
          <ComplianceStatus salonId={salon.id} compact />
        </div>
        <p style={{ marginBottom: 16 }}>
          <a href="/owner/locations" style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}>Standorte &amp; Compliance →</a>
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={tab === t.key ? 'bgold' : 'boutline'}
              style={{ padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { v: `★ ${Number(salon.avg_rating).toFixed(1)}`, l: 'Bewertung', c: 'var(--gold)' },
                { v: salon.review_count, l: 'Bewertungen', c: 'var(--cream)' },
                { v: bookings.length, l: 'Offene Termine', c: 'var(--cream)' },
                { v: services.length, l: 'Services', c: 'var(--cream)' },
              ].map((k, i) => (
                <div key={i} className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: k.c }}>{k.v}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>{k.l}</div>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Neueste Bewertungen</h2>
            {reviews.length === 0 ? <p style={{ color: 'var(--stone)', marginBottom: 24 }}>Keine Bewertungen.</p> : reviews.map(r => (
              <div key={r.id} className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, color: 'var(--cream)' }}>{r.customer?.full_name || 'Gast'}</span>
                  <span style={{ color: 'var(--gold)' }}>{'★'.repeat(r.rating)}</span>
                </div>
                {r.comment && <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginTop: 4 }}>{r.comment}</p>}
              </div>
            ))}
          </>
        )}

        {/* EDIT SALON */}
        {tab === 'edit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {([
              ['Salonname', 'name', 'text'],
              ['Stadt', 'city', 'text'], ['Straße', 'street', 'text'],
              ['Hausnr.', 'house_number', 'text'], ['PLZ', 'postal_code', 'text'],
              ['Telefon', 'phone', 'tel'], ['E-Mail', 'email', 'email'],
              ['Website', 'website', 'url'],
            ] as const).map(([label, key, type]) => (
              <div key={key}>
                <label {...lbl}>{label}</label>
                <input {...inp} type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label {...lbl}>Beschreibung</label>
              <textarea className="inp" rows={4} style={{ width: '100%', resize: 'vertical' }}
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', marginTop: 8 }}>Öffnungszeiten</h3>
            {DAYS.map(day => (
              <div key={day} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ width: 90, fontSize: 12, color: 'var(--stone)' }}>{day}</span>
                <input {...inp} placeholder="09:00 - 18:00" value={hours[day] || ''}
                  onChange={e => setHours(p => ({ ...p, [day]: e.target.value }))} style={{ flex: 1 }} />
              </div>
            ))}

            <button className="bgold" onClick={saveSalon} disabled={saving} style={{ marginTop: 8 }}>
              {saving ? 'Speichern...' : 'Änderungen speichern'}
            </button>
            {saveMsg && <p style={{ fontSize: 12, color: saveMsg === 'Gespeichert!' ? 'var(--gold2)' : 'var(--red)', marginTop: 4 }}>{saveMsg}</p>}
          </div>
        )}

        {/* SERVICES */}
        {tab === 'services' && (
          <>
            <div className="card" style={{ padding: 14, marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', marginBottom: 10 }}>Neuen Service hinzufügen</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input {...inp} placeholder="Name (z.B. Herrenschnitt)" value={newSvc.name} onChange={e => setNewSvc(p => ({ ...p, name: e.target.value }))} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input {...inp} type="number" placeholder="Preis €" value={newSvc.price} onChange={e => setNewSvc(p => ({ ...p, price: e.target.value }))} style={{ flex: 1 }} />
                  <input {...inp} type="number" placeholder="Min." value={newSvc.duration} onChange={e => setNewSvc(p => ({ ...p, duration: e.target.value }))} style={{ flex: 1 }} />
                </div>
                <button className="bgold" onClick={addService} style={{ fontSize: 13 }}>+ Hinzufügen</button>
              </div>
            </div>

            {services.length === 0 ? <p style={{ color: 'var(--stone)' }}>Keine Services angelegt.</p> : services.map(svc => (
              <div key={svc.id} className="card" style={{ marginBottom: 8, padding: 12 }}>
                {editSvc === svc.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input {...inp} value={svc.name} onChange={e => setServices(p => p.map(s => s.id === svc.id ? { ...s, name: e.target.value } : s))} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input {...inp} type="number" value={(svc.price_cents / 100).toString()} style={{ flex: 1 }}
                        onChange={e => setServices(p => p.map(s => s.id === svc.id ? { ...s, price_cents: Math.round(parseFloat(e.target.value) * 100) } : s))} />
                      <input {...inp} type="number" value={svc.duration_minutes.toString()} style={{ flex: 1 }}
                        onChange={e => setServices(p => p.map(s => s.id === svc.id ? { ...s, duration_minutes: parseInt(e.target.value) || 30 } : s))} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="bgold" onClick={() => updateService(svc)} style={{ flex: 1, fontSize: 12 }}>Speichern</button>
                      <button className="boutline" onClick={() => setEditSvc(null)} style={{ flex: 1, fontSize: 12 }}>Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--cream)' }}>{svc.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--stone)' }}>{(svc.price_cents / 100).toFixed(0)}€ · {svc.duration_minutes} Min.</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setEditSvc(svc.id)} aria-label="Service bearbeiten" style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 13 }}>✎</button>
                      <button onClick={() => deleteService(svc.id)} aria-label="Service löschen" style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}>✕</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* BOOKINGS */}
        {tab === 'bookings' && (
          <>
            {bookings.length === 0 ? <p style={{ color: 'var(--stone)' }}>Keine offenen Termine.</p> : bookings.map(b => (
              <div key={b.id} className="card" style={{ marginBottom: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--cream)' }}>{b.service?.name || 'Service'}</div>
                    <div style={{ fontSize: 12, color: 'var(--stone)' }}>
                      {new Date(b.booking_date).toLocaleDateString('de-DE')} · {b.start_time?.slice(0, 5)} · {b.customer?.full_name || 'Gast'}
                    </div>
                  </div>
                  <span className="badge badge-gold" style={{ fontSize: 10 }}>{b.status}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {b.status === 'pending' && (
                    <button className="bgold" onClick={() => updateBookingStatus(b.id, 'confirmed')} style={{ flex: 1, fontSize: 12, padding: '8px 0' }}>
                      Bestätigen
                    </button>
                  )}
                  {['pending', 'confirmed'].includes(b.status) && (
                    <button className="boutline" onClick={() => updateBookingStatus(b.id, 'cancelled')} style={{ flex: 1, fontSize: 12, padding: '8px 0' }}>
                      Absagen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* FOTOS */}
        {tab === 'fotos' && (
          <>
            <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Salon-Fotos</h2>
            <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 16 }}>Max. 5 MB pro Bild · JPG, PNG oder WebP</p>

            <label
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 120, borderRadius: 16, border: '2px dashed rgba(176,144,96,0.3)',
                background: 'rgba(176,144,96,0.04)', cursor: 'pointer', marginBottom: 16,
                color: 'var(--gold)', fontSize: 14, fontWeight: 600,
              }}
            >
              {uploadingPhoto ? 'Hochladen...' : '+ Foto hochladen'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) uploadPhoto(f)
                  e.target.value = ''
                }}
                disabled={uploadingPhoto}
              />
            </label>

            {photos.length === 0 && !uploadingPhoto && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ color: 'var(--stone)', fontSize: 13 }}>Noch keine Fotos hochgeladen.</p>
                <button className="boutline" onClick={loadPhotos} style={{ marginTop: 8, fontSize: 12 }}>Fotos laden</button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {photos.map(p => (
                <div key={p.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(176,144,96,0.15)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="Salon" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                  <button
                    onClick={() => deletePhoto(p.id)}
                    style={{
                      position: 'absolute', top: 6, right: 6, width: 28, height: 28,
                      borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none',
                      color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* STATISTIK */}
        {tab === 'statistik' && (
          <>
            <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 16 }}>Statistik</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold)' }}>{confirmedBookings.length}</div>
                <div style={{ fontSize: 11, color: 'var(--stone)' }}>Bestätigte Termine</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--cream)' }}>{pendingBookings.length}</div>
                <div style={{ fontSize: 11, color: 'var(--stone)' }}>Ausstehend</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold)' }}>★ {Number(salon.avg_rating).toFixed(1)}</div>
                <div style={{ fontSize: 11, color: 'var(--stone)' }}>Durchschnitt</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--cream)' }}>{salon.review_count}</div>
                <div style={{ fontSize: 11, color: 'var(--stone)' }}>Bewertungen</div>
              </div>
            </div>

            {/* Rating breakdown */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Bewertungsverteilung</h3>
              {[5, 4, 3, 2, 1].map(star => {
                const count = reviews.filter(r => r.rating === star).length
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                return (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--gold)', width: 20 }}>{star}★</span>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--c3)' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, var(--gold), var(--gold2))' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--stone)', width: 30, textAlign: 'right' }}>{count}</span>
                  </div>
                )
              })}
            </div>

            {/* Service popularity */}
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Services</h3>
              {services.length === 0 ? (
                <p style={{ color: 'var(--stone)', fontSize: 12 }}>Keine Services.</p>
              ) : services.map(svc => (
                <div key={svc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(176,144,96,0.06)' }}>
                  <span style={{ fontSize: 13, color: 'var(--cream)' }}>{svc.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold2)' }}>{(svc.price_cents / 100).toFixed(0)} €</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}
