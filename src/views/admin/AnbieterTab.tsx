import { useEffect, useState, useRef } from 'react'
import {
  useProviderManagementStore,
  type ManagedProvider,
  type ManagedService,
} from '@/stores/providerManagementStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

/* ═══ CATEGORY OPTIONS ═══ */
const CATS = [
  { value: 'barber', label: 'Barbershop' },
  { value: 'friseur', label: 'Friseur' },
  { value: 'kosmetik', label: 'Kosmetik' },
  { value: 'aesthetik', label: 'Ästhetik' },
  { value: 'nail', label: 'Nagelstudio' },
  { value: 'massage', label: 'Massage' },
  { value: 'lash', label: 'Lash & Brows' },
  { value: 'arzt', label: 'Arzt / Klinik' },
  { value: 'opraum', label: 'OP-Raum' },
]

const TIERS = ['starter', 'premium', 'gold']

/* ═══ STYLES ═══ */
const s = {
  wrap: { padding: 'var(--pad)' },
  row: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap' as const,
  },
  card: {
    padding: 14,
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: { fontWeight: 700 as const, fontSize: 14, color: 'var(--cream)' },
  sub: { fontSize: 12, color: 'var(--stone)', marginTop: 2 },
  badges: { display: 'flex', gap: 4, flexWrap: 'wrap' as const },
  form: {
    padding: 16,
    background: 'var(--c2)',
    borderRadius: 12,
    marginBottom: 16,
    border: '1px solid var(--border)',
  },
  formTitle: {
    fontWeight: 700 as const,
    fontSize: 15,
    color: 'var(--gold2)',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: 600 as const,
    color: 'var(--stone)',
    marginBottom: 4,
    marginTop: 10,
    display: 'block' as const,
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--c1)',
    color: 'var(--cream)',
    fontSize: 14,
  },
  svcCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  count: {
    fontSize: 13,
    color: 'var(--stone)',
    marginBottom: 12,
  },
  imgUpload: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    border: '2px dashed var(--border)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    cursor: 'pointer' as const,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    background: 'var(--c1)',
  },
  imgPreview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  galleryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
    marginTop: 8,
  },
  galleryItem: {
    position: 'relative' as const,
    aspectRatio: '1',
    borderRadius: 8,
    overflow: 'hidden' as const,
  },
  galleryImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  galleryDelete: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.7)',
    color: '#f66',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    fontSize: 12,
    cursor: 'pointer' as const,
    border: 'none' as const,
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--c1)',
    color: 'var(--cream)',
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    minHeight: 70,
  },
}

/* ═══ IMAGE UPLOAD BUTTON ═══ */
function ImageUploadBox({
  url,
  onUpload,
  label,
  height = 120,
  uploading,
}: {
  url: string | null
  onUpload: (file: File) => void
  label: string
  height?: number
  uploading?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div>
      <span style={s.label}>{label}</span>
      <div
        style={{ ...s.imgUpload, height }}
        onClick={() => ref.current?.click()}
      >
        {uploading ? (
          <span style={{ color: 'var(--stone)', fontSize: 13 }}>Hochladen...</span>
        ) : url ? (
          <img src={url} alt={label} style={s.imgPreview} />
        ) : (
          <span style={{ color: 'var(--stone)', fontSize: 13 }}>📷 {label} hochladen</span>
        )}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

/* ═══ SERVICE LIST ═══ */
function ServiceList({ providerId }: { providerId: string }) {
  const store = useProviderManagementStore()
  const [showForm, setShowForm] = useState(false)
  const [svcName, setSvcName] = useState('')
  const [svcDur, setSvcDur] = useState(30)
  const [svcPrice, setSvcPrice] = useState(0)

  useEffect(() => {
    store.loadServicesForProvider(providerId)
  }, [providerId])

  const handleAdd = async () => {
    if (!svcName.trim()) return
    const ok = await store.addService(providerId, {
      name: svcName,
      duration_minutes: svcDur,
      price_cents: Math.round(svcPrice * 100),
    })
    if (ok) {
      setSvcName('')
      setSvcDur(30)
      setSvcPrice(0)
      setShowForm(false)
    }
  }

  const handleDelete = async (id: string) => {
    await store.deleteService(id)
  }

  return (
    <div style={{ marginTop: 12, padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold2)' }}>
          Dienstleistungen ({store.services.length})
        </span>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            fontSize: 12,
            color: 'var(--gold)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          {showForm ? '✕ Abbrechen' : '+ Hinzufügen'}
        </button>
      </div>

      {showForm && (
        <div style={{ ...s.form, marginBottom: 12 }}>
          <Input placeholder="Dienstleistung Name" value={svcName} onChange={(e) => setSvcName(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <span style={s.label}>Dauer (Min)</span>
              <Input type="number" value={svcDur} onChange={(e) => setSvcDur(Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={s.label}>Preis (€)</span>
              <Input type="number" value={svcPrice} onChange={(e) => setSvcPrice(Number(e.target.value))} />
            </div>
          </div>
          <Button variant="gold" onClick={handleAdd} style={{ marginTop: 10, width: '100%' }}>
            Speichern
          </Button>
        </div>
      )}

      {store.loadingServices && (
        <div style={{ color: 'var(--stone)', fontSize: 12 }}>Lade...</div>
      )}

      {store.services.map((svc) => (
        <div key={svc.id} style={s.svcCard}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)' }}>{svc.name}</div>
            <div style={{ fontSize: 11, color: 'var(--stone)' }}>
              {svc.duration_minutes} Min · {(svc.price_cents / 100).toFixed(2)} €
            </div>
          </div>
          <button
            onClick={() => handleDelete(svc.id)}
            style={{ color: '#f66', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
          >
            🗑
          </button>
        </div>
      ))}
    </div>
  )
}

/* ═══ PROVIDER FORM ═══ */
function ProviderForm({
  provider,
  onSave,
  onCancel,
}: {
  provider?: ManagedProvider
  onSave: (data: Partial<ManagedProvider>) => void
  onCancel: () => void
}) {
  const store = useProviderManagementStore()
  const galleryRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(provider?.name || '')
  const [category, setCategory] = useState(provider?.category || 'barber')
  const [city, setCity] = useState(provider?.city || 'Berlin')
  const [street, setStreet] = useState(provider?.street || '')
  const [postal, setPostal] = useState(provider?.postal_code || '')
  const [phone, setPhone] = useState(provider?.phone || '')
  const [email, setEmail] = useState(provider?.email || '')
  const [tier, setTier] = useState(provider?.subscription_tier || 'starter')
  const [description, setDescription] = useState(provider?.description || '')
  const [website, setWebsite] = useState(provider?.website || '')
  const [coverUrl, setCoverUrl] = useState(provider?.cover_url || '')
  const [logoUrl, setLogoUrl] = useState(provider?.logo_url || '')
  const [gallery, setGallery] = useState<string[]>(provider?.gallery || [])
  const [uploading, setUploading] = useState<string | null>(null)

  const handleImageUpload = async (file: File, type: 'cover' | 'logo' | 'gallery') => {
    if (!provider?.id) return
    setUploading(type)
    const ext = file.name.split('.').pop() || 'jpg'
    const ts = Date.now()
    const path = `${provider.id}/${type}_${ts}.${ext}`
    const url = await store.uploadImage(file, path)
    setUploading(null)

    if (!url) return

    if (type === 'cover') {
      setCoverUrl(url)
    } else if (type === 'logo') {
      setLogoUrl(url)
    } else {
      setGallery(prev => [...prev, url])
    }
  }

  const removeGalleryImage = (index: number) => {
    setGallery(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    onSave({
      name, category, city, street, postal_code: postal,
      phone: phone || null, email: email || null,
      subscription_tier: tier,
      description: description || null,
      website: website || null,
      cover_url: coverUrl || null,
      logo_url: logoUrl || null,
      gallery: gallery.length > 0 ? gallery : null,
    })
  }

  return (
    <div style={s.form}>
      <div style={s.formTitle}>{provider ? 'Anbieter bearbeiten' : 'Neuer Anbieter'}</div>

      {/* Cover Photo */}
      {provider && (
        <ImageUploadBox
          url={coverUrl || null}
          onUpload={(f) => handleImageUpload(f, 'cover')}
          label="Titelbild"
          height={140}
          uploading={uploading === 'cover'}
        />
      )}

      {/* Logo + Name Row */}
      <div style={{ display: 'flex', gap: 12, marginTop: provider ? 12 : 0, alignItems: 'flex-end' }}>
        {provider && (
          <div style={{ width: 70, flexShrink: 0 }}>
            <ImageUploadBox
              url={logoUrl || null}
              onUpload={(f) => handleImageUpload(f, 'logo')}
              label="Logo"
              height={70}
              uploading={uploading === 'logo'}
            />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <Input placeholder="Name *" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>

      <span style={s.label}>Kategorie</span>
      <select style={s.select} value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATS.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      {/* Description */}
      <span style={s.label}>Beschreibung</span>
      <textarea
        style={s.textarea}
        placeholder="Beschreibung des Salons..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <Input placeholder="Stadt" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <Input placeholder="PLZ" value={postal} onChange={(e) => setPostal(e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <Input placeholder="Straße" value={street} onChange={(e) => setStreet(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <Input placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <Input placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      {/* Website */}
      <div style={{ marginTop: 8 }}>
        <Input placeholder="Website (https://...)" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <span style={s.label}>Abo-Stufe</span>
      <select style={s.select} value={tier} onChange={(e) => setTier(e.target.value)}>
        {TIERS.map((t) => (
          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
        ))}
      </select>

      {/* Gallery */}
      {provider && (
        <div style={{ marginTop: 12 }}>
          <span style={s.label}>Galerie</span>
          <div style={s.galleryGrid}>
            {gallery.map((img, i) => (
              <div key={i} style={s.galleryItem}>
                <img src={img} alt={`Galerie ${i + 1}`} style={s.galleryImg} />
                <button style={s.galleryDelete} onClick={() => removeGalleryImage(i)}>✕</button>
              </div>
            ))}
            <div
              style={{
                ...s.galleryItem,
                border: '2px dashed var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: 'var(--c1)',
                borderRadius: 8,
              }}
              onClick={() => galleryRef.current?.click()}
            >
              {uploading === 'gallery' ? (
                <span style={{ color: 'var(--stone)', fontSize: 11 }}>...</span>
              ) : (
                <span style={{ color: 'var(--stone)', fontSize: 20 }}>+</span>
              )}
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file, 'gallery')
                  e.target.value = ''
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <Button variant="gold" onClick={handleSubmit} style={{ flex: 1 }}>
          Speichern
        </Button>
        <Button variant="outline" onClick={onCancel} style={{ flex: 1 }}>
          Abbrechen
        </Button>
      </div>
    </div>
  )
}

/* ═══ MAIN COMPONENT ═══ */
export function AnbieterTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const store = useProviderManagementStore()
  const [loaded, setLoaded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) {
      store.loadProviders()
      setLoaded(true)
    }
  }, [loaded])

  const filtered = store.getFilteredProviders()

  const handleSave = async (data: Partial<ManagedProvider>) => {
    if (editingId) {
      await store.updateProvider(editingId, data)
      setEditingId(null)
    } else {
      await store.addProvider(data)
    }
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    if (isSuperAdmin) {
      await store.deleteProvider(id)
    }
  }

  return (
    <div style={s.wrap}>
      {/* Stats */}
      <div style={s.count}>
        👤 {store.providers.length} Anbieter ·{' '}
        ✅ {store.providers.filter(p => p.is_active).length} Aktiv ·{' '}
        ⭐ {store.providers.filter(p => p.is_verified).length} Verifiziert
      </div>

      {/* Search + Add */}
      <div style={s.row}>
        <div style={{ flex: 1 }}>
          <Input
            placeholder="Suche nach Name, Stadt, Kategorie..."
            value={store.searchQuery}
            onChange={(e) => store.setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="gold" onClick={() => { setShowForm(true); setEditingId(null) }}>
          + Neu
        </Button>
      </div>

      {/* New Form */}
      {showForm && !editingId && (
        <ProviderForm
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Error */}
      {store.error && (
        <div style={{
          padding: 12, marginBottom: 12, borderRadius: 10,
          background: 'rgba(220,50,50,0.1)', color: '#f66', fontSize: 13,
        }}>
          ⚠️ {store.error}
        </div>
      )}

      {/* Loading */}
      {store.loading && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>
          Lade Anbieter...
        </div>
      )}

      {/* Provider List */}
      {filtered.map((prov) => (
        <div key={prov.id}>
          {editingId === prov.id ? (
            <ProviderForm
              provider={prov}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div
              style={{
                ...s.card,
                background: expandedId === prov.id ? 'rgba(200,168,75,0.04)' : 'transparent',
              }}
            >
              <div
                style={s.cardTop}
                onClick={() => setExpandedId(expandedId === prov.id ? null : prov.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  {prov.logo_url ? (
                    <img src={prov.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--c3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--stone)' }}>
                      {prov.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={s.name}>
                      {prov.name}
                      {!prov.is_active && <span style={{ color: '#f66', marginLeft: 6 }}>⏸</span>}
                    </div>
                    <div style={s.sub}>
                      {CATS.find(c => c.value === prov.category)?.label || prov.category} ·{' '}
                      {prov.city || '—'} ·{' '}
                      ⭐ {prov.avg_rating.toFixed(1)} ({prov.review_count})
                    </div>
                  </div>
                </div>
                <div style={s.badges}>
                  <Badge variant={prov.subscription_tier === 'gold' ? 'gold' : 'green'}>
                    {prov.subscription_tier}
                  </Badge>
                  {prov.is_verified && <Badge variant="gold">✓</Badge>}
                </div>
              </div>

              {/* Expanded: actions + services */}
              {expandedId === prov.id && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  {/* Preview info */}
                  {prov.cover_url && (
                    <img src={prov.cover_url} alt="Cover" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
                  )}
                  {prov.description && (
                    <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 8, lineHeight: 1.5 }}>{prov.description}</p>
                  )}

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    <button
                      onClick={() => { setEditingId(prov.id); setShowForm(false) }}
                      style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 12,
                        border: '1px solid var(--gold)', background: 'transparent',
                        color: 'var(--gold)', cursor: 'pointer', fontWeight: 600,
                      }}
                    >
                      ✏️ Bearbeiten
                    </button>
                    <button
                      onClick={() => store.toggleLive(prov.id)}
                      style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 12,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: prov.is_active ? '#f66' : '#6f6', cursor: 'pointer', fontWeight: 600,
                      }}
                    >
                      {prov.is_active ? '⏸ Deaktivieren' : '▶ Aktivieren'}
                    </button>
                    <button
                      onClick={() => store.toggleVerified(prov.id)}
                      style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 12,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: prov.is_verified ? 'var(--stone)' : 'var(--gold)',
                        cursor: 'pointer', fontWeight: 600,
                      }}
                    >
                      {prov.is_verified ? '✕ Unverifiziert' : '✓ Verifizieren'}
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDelete(prov.id)}
                        style={{
                          padding: '5px 12px', borderRadius: 6, fontSize: 12,
                          border: '1px solid #f44', background: 'transparent',
                          color: '#f44', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        🗑 Löschen
                      </button>
                    )}
                  </div>

                  {/* Gallery preview */}
                  {prov.gallery && prov.gallery.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8, overflowX: 'auto' }}>
                      {prov.gallery.map((img, i) => (
                        <img key={i} src={String(img)} alt={`${i + 1}`} style={{ width: 50, height: 50, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                      ))}
                    </div>
                  )}

                  {/* Services */}
                  <ServiceList providerId={prov.id} />
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {!store.loading && filtered.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>
          Keine Anbieter gefunden.
        </div>
      )}
    </div>
  )
}
