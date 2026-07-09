'use client'

import { useState, useEffect, useRef } from 'react'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

/* ═══════════════════════════════════════════════════════════════
 * SingleImageUpload — z.B. Logo / Profilbild
 * ═══════════════════════════════════════════════════════════════ */

export function SingleImageUpload({ storageKey, placeholder = 'YD' }: { storageKey: string; placeholder?: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey)
      if (v) setDataUrl(v)
    } catch {}
  }, [storageKey])

  async function handleFile(f: File | null) {
    if (!f) return
    setError(null)
    if (!f.type.startsWith('image/')) {
      setError('Nur Bilder erlaubt')
      return
    }
    if (f.size > MAX_BYTES) {
      setError(`Datei zu groß (${formatSize(f.size)}). Max 5 MB.`)
      return
    }
    try {
      const url = await readFileAsDataURL(f)
      setDataUrl(url)
      try { localStorage.setItem(storageKey, url) } catch {
        setError('Speicher voll — älteres Bild zuerst löschen')
      }
    } catch {
      setError('Fehler beim Lesen der Datei')
    }
  }

  function removeImage() {
    setDataUrl(null)
    try { localStorage.removeItem(storageKey) } catch {}
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      background: 'linear-gradient(145deg, rgba(191,149,63,0.05) 0%, var(--c1) 50%, rgba(179,135,40,0.03) 100%)',
      border: '1px solid rgba(191,149,63,0.22)',
      borderRadius: 18, padding: 24,
    }}>
      <span style={{ fontSize: 10, letterSpacing: 2, color: 'var(--stone)', textTransform: 'uppercase', fontWeight: 600 }}>Aktuell</span>
      <div style={{
        width: 140, height: 140, borderRadius: '50%',
        overflow: 'hidden', border: '2px solid var(--gold2)',
        background: 'linear-gradient(135deg, #2A2418, #161210)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {dataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={dataUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span className="cinzel text-gold-metallic" style={{ fontSize: 42, fontWeight: 600 }}>{placeholder}</span>
        )}
      </div>
      {dataUrl ? (
        <p style={{ fontSize: 11, color: '#6ABF80', textAlign: 'center' }}>✓ Bild hochgeladen</p>
      ) : (
        <p style={{ fontSize: 11, color: 'var(--stone)', textAlign: 'center' }}>Noch kein Bild · Initialen werden angezeigt</p>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />

      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            flex: 1, padding: 10, borderRadius: 12,
            background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
            color: '#1a1000', border: 'none',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >📷 {dataUrl ? 'Anderes Bild' : 'Bild auswählen'}</button>
        {dataUrl && (
          <button
            onClick={removeImage}
            style={{
              flex: 1, padding: 10, borderRadius: 12,
              background: 'transparent', color: '#FF8888',
              border: '1px solid rgba(232,80,64,0.3)',
              fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >✕ Entfernen</button>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 11, color: '#FF8888', textAlign: 'center', marginTop: -4 }}>{error}</p>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
 * GalleryUpload — z.B. Salon-Galerie, Vermieter-Fotos
 * ═══════════════════════════════════════════════════════════════ */

export function GalleryUpload({ storageKey, maxImages = 12, label = 'Bilder' }: { storageKey: string; maxImages?: number; label?: string }) {
  const [images, setImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey)
      if (v) setImages(JSON.parse(v))
    } catch {}
  }, [storageKey])

  async function handleFiles(files: FileList | null) {
    if (!files) return
    setError(null)
    const newImages: string[] = []
    const remaining = maxImages - images.length
    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const f = files[i]
      if (!f.type.startsWith('image/')) continue
      if (f.size > MAX_BYTES) {
        setError(`${f.name}: zu groß (max 5 MB)`)
        continue
      }
      try {
        const url = await readFileAsDataURL(f)
        newImages.push(url)
      } catch {}
    }
    if (newImages.length === 0) return
    const merged = [...images, ...newImages].slice(0, maxImages)
    setImages(merged)
    try { localStorage.setItem(storageKey, JSON.stringify(merged)) } catch {
      setError('Speicher voll — älteres Bild zuerst löschen')
    }
  }

  function removeImage(idx: number) {
    const next = images.filter((_, i) => i !== idx)
    setImages(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
  }

  const slotsLeft = maxImages - images.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 11, color: 'var(--stone)', textAlign: 'center' }}>
        <b style={{ color: 'var(--gold2)', fontWeight: 700 }}>{images.length}</b> von <b style={{ color: 'var(--gold2)', fontWeight: 700 }}>{maxImages}</b> {label} hochgeladen
      </p>

      <input ref={inputRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} style={{ display: 'none' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {images.map((src, i) => (
          <div key={i} style={{
            aspectRatio: '1', borderRadius: 12, position: 'relative', overflow: 'hidden',
            background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.18)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Bild ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <span style={{
              position: 'absolute', bottom: 5, left: 5,
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              fontSize: 9, padding: '2px 6px', borderRadius: 6, fontWeight: 700,
            }}>{i + 1}</span>
            <button
              onClick={() => removeImage(i)}
              aria-label="Löschen"
              style={{
                position: 'absolute', top: 5, right: 5,
                width: 22, height: 22, borderRadius: '50%',
                background: 'rgba(11,11,15,0.85)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                border: '1px solid rgba(196,168,106,0.3)', cursor: 'pointer',
              }}
            >✕</button>
          </div>
        ))}
        {slotsLeft > 0 && (
          <button
            onClick={() => inputRef.current?.click()}
            style={{
              aspectRatio: '1', borderRadius: 12,
              background: 'var(--c1)',
              border: '1.5px dashed rgba(196,168,106,0.4)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gold2)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 32, lineHeight: 1 }}>+</span>
            <span style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>Bild</span>
          </button>
        )}
      </div>

      {error && <p style={{ fontSize: 11, color: '#FF8888', textAlign: 'center' }}>{error}</p>}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
 * DocumentUpload — z.B. Hygiene-Zertifikat, Approbation
 * ═══════════════════════════════════════════════════════════════ */

interface DocItem {
  id: string
  title: string
  sub: string
}

export function DocumentUpload({ storageKey, docs }: { storageKey: string; docs: DocItem[] }) {
  const [files, setFiles] = useState<Record<string, { name: string; size: number; dataUrl: string }>>({})
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey)
      if (v) setFiles(JSON.parse(v))
    } catch {}
  }, [storageKey])

  async function handleFile(docId: string, f: File | null) {
    if (!f) return
    setError(null)
    const ok = f.type.startsWith('image/') || f.type === 'application/pdf'
    if (!ok) {
      setError('Nur PDF oder Bilder erlaubt')
      return
    }
    if (f.size > MAX_BYTES) {
      setError(`${f.name}: zu groß (max 5 MB)`)
      return
    }
    try {
      const url = await readFileAsDataURL(f)
      const next = { ...files, [docId]: { name: f.name, size: f.size, dataUrl: url } }
      setFiles(next)
      try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {
        setError('Speicher voll — älteres Dokument zuerst löschen')
      }
    } catch {
      setError('Fehler beim Lesen der Datei')
    }
  }

  function removeFile(docId: string) {
    const next = { ...files }
    delete next[docId]
    setFiles(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {docs.map((d) => {
        const f = files[d.id]
        const status = f ? 'ok' : 'missing'
        return (
          <div key={d.id} style={{
            background: 'var(--c1)',
            border: '0.5px solid rgba(196,168,106,0.18)',
            borderRadius: 14, padding: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)' }}>{d.title}</p>
                <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>{d.sub}</p>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6, letterSpacing: 1, flexShrink: 0, marginLeft: 8,
                background: status === 'ok' ? 'rgba(74,138,90,0.15)' : 'rgba(232,80,64,0.15)',
                color: status === 'ok' ? '#6ABF80' : '#FF8888',
              }}>
                {status === 'ok' ? 'HOCHGELADEN' : 'FEHLT'}
              </span>
            </div>

            <input
              ref={(el) => { inputRefs.current[d.id] = el }}
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => handleFile(d.id, e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />

            {f ? (
              <>
                <div style={{
                  background: 'rgba(11,11,15,0.5)', borderRadius: 8, padding: '8px 10px',
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--cream)',
                  marginBottom: 8,
                }}>
                  <span style={{ fontSize: 18 }}>📄</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--stone)' }}>{formatSize(f.size)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => inputRefs.current[d.id]?.click()}
                    style={{
                      flex: 1, padding: 10, borderRadius: 10,
                      background: 'transparent', color: 'var(--gold2)',
                      border: '1px solid rgba(196,168,106,0.3)',
                      fontFamily: 'inherit', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                    }}
                  >↻ Ersetzen</button>
                  <button
                    onClick={() => removeFile(d.id)}
                    style={{
                      flex: 1, padding: 10, borderRadius: 10,
                      background: 'transparent', color: '#FF8888',
                      border: '1px solid rgba(232,80,64,0.3)',
                      fontFamily: 'inherit', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                    }}
                  >✕ Löschen</button>
                </div>
              </>
            ) : (
              <button
                onClick={() => inputRefs.current[d.id]?.click()}
                style={{
                  width: '100%', padding: 12, borderRadius: 12,
                  background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
                  color: '#1a1000', border: 'none',
                  fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span>📎</span><span>Dokument hochladen (PDF · JPG · max. 5 MB)</span>
              </button>
            )}
          </div>
        )
      })}

      {error && <p style={{ fontSize: 11, color: '#FF8888', textAlign: 'center' }}>{error}</p>}
    </div>
  )
}
