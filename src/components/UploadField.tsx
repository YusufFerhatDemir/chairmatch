'use client'

/**
 * Upload-Felder für Logo, Galerie, Inserats-Fotos und Zertifikate.
 *
 * Vorher lagen die Dateien als Data-URL in localStorage — sie existierten nur
 * im Browser des Nutzers, waren nach dem Cache-Leeren weg und sprengten bei
 * mehreren Bildern das 5-MB-Limit von localStorage. Jetzt geht jede Datei an
 * `POST /api/uploads`, landet im privaten Bucket und wird über
 * `/api/uploads/{id}` (frische Signed URL pro Abruf) ausgeliefert.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { apiGet, apiSend, apiUpload } from '@/lib/client-api'

const MAX_BYTES = 5 * 1024 * 1024
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp']

export type UploadTarget = 'salon_logo' | 'salon_gallery' | 'salon_certificate' | 'listing_photo'

export interface UploadRecord {
  id: string
  url: string
  target: UploadTarget
  doc_key: string | null
  mime_type: string
  size_bytes: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

/** Client-Vorprüfung — der Server prüft dasselbe nochmal verbindlich. */
function localReject(file: File, allowed: string[]): string | null {
  if (!allowed.includes(file.type)) {
    return allowed.includes('application/pdf')
      ? 'Nur PDF, JPG, PNG oder WebP erlaubt'
      : 'Nur JPG, PNG oder WebP erlaubt'
  }
  if (file.size > MAX_BYTES) return `${file.name}: zu groß (${formatSize(file.size)}, max 5 MB)`
  if (file.size === 0) return `${file.name}: Datei ist leer`
  return null
}

async function uploadFile(file: File, target: UploadTarget, docKey?: string): Promise<UploadRecord> {
  const form = new FormData()
  form.append('file', file)
  form.append('target', target)
  if (docKey) form.append('docKey', docKey)
  const res = await apiUpload<{ upload: UploadRecord }>('/api/uploads', form)
  return res.upload
}

/** Lädt die bereits hochgeladenen Dateien eines Ziels. */
function useUploads(target: UploadTarget) {
  const [items, setItems] = useState<UploadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ uploads: UploadRecord[] }>(`/api/uploads?target=${target}`)
      setItems(res.uploads)
      setError(null)
    } catch (err) {
      setError(errorText(err, 'Dateien konnten nicht geladen werden'))
    } finally {
      setLoading(false)
    }
  }, [target])

  useEffect(() => { void reload() }, [reload])

  return { items, setItems, loading, error, setError }
}

const goldButtonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
  color: '#1a1000', border: 'none',
  fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return <p role="alert" style={{ fontSize: 11, color: '#FF8888', textAlign: 'center' }}>{children}</p>
}

/* ═══════════════════════════════════════════════════════════════
 * SingleImageUpload — z.B. Logo / Profilbild
 * ═══════════════════════════════════════════════════════════════ */

export function SingleImageUpload({
  target = 'salon_logo',
  placeholder = 'YD',
}: {
  target?: UploadTarget
  placeholder?: string
}) {
  const { items, setItems, loading, error, setError } = useUploads(target)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const current = items[items.length - 1] ?? null

  async function handleFile(f: File | null) {
    if (!f || busy) return
    const reject = localReject(f, IMAGE_MIMES)
    if (reject) { setError(reject); return }

    setBusy(true)
    setError(null)
    try {
      const record = await uploadFile(f, target)
      // Logo ersetzt das vorige — der Server räumt die alte Datei mit auf.
      setItems([record])
    } catch (err) {
      setError(errorText(err, 'Upload fehlgeschlagen'))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function removeImage() {
    if (!current || busy) return
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/uploads/${current.id}`, 'DELETE')
      setItems([])
    } catch (err) {
      setError(errorText(err, 'Löschen fehlgeschlagen'))
    } finally {
      setBusy(false)
    }
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
        {current ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={current.url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span className="cinzel text-gold-metallic" style={{ fontSize: 42, fontWeight: 600 }}>{placeholder}</span>
        )}
      </div>

      {loading ? (
        <p style={{ fontSize: 11, color: 'var(--stone)' }}>Lade…</p>
      ) : current ? (
        <p style={{ fontSize: 11, color: '#6ABF80', textAlign: 'center' }}>✓ Bild gespeichert</p>
      ) : (
        <p style={{ fontSize: 11, color: 'var(--stone)', textAlign: 'center' }}>Noch kein Bild · Initialen werden angezeigt</p>
      )}

      <input ref={inputRef} type="file" accept={IMAGE_MIMES.join(',')} onChange={(e) => handleFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />

      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy || loading}
          style={{ ...goldButtonStyle, flex: 1, padding: 10, borderRadius: 12, fontSize: 12.5, opacity: busy || loading ? 0.6 : 1 }}
        >📷 {busy ? 'Lädt hoch…' : current ? 'Anderes Bild' : 'Bild auswählen'}</button>
        {current && (
          <button
            onClick={removeImage}
            disabled={busy}
            style={{
              flex: 1, padding: 10, borderRadius: 12,
              background: 'transparent', color: '#FF8888',
              border: '1px solid rgba(232,80,64,0.3)',
              fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5, cursor: busy ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: busy ? 0.6 : 1,
            }}
          >✕ Entfernen</button>
        )}
      </div>

      {error && <ErrorLine>{error}</ErrorLine>}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
 * GalleryUpload — Salon-Galerie, Vermieter-Fotos
 * ═══════════════════════════════════════════════════════════════ */

export function GalleryUpload({
  target = 'salon_gallery',
  maxImages = 12,
  label = 'Bilder',
}: {
  target?: UploadTarget
  maxImages?: number
  label?: string
}) {
  const { items, setItems, loading, error, setError } = useUploads(target)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || busy) return
    setError(null)

    const remaining = maxImages - items.length
    if (remaining <= 0) {
      setError(`Maximal ${maxImages} Bilder — bitte zuerst eines löschen`)
      return
    }

    setBusy(true)
    const uploaded: UploadRecord[] = []
    let firstError: string | null = null

    // Sequenziell: parallele Uploads würden beim Server-Limit gegeneinander
    // laufen und der Nutzer bekäme eine zufällige Auswahl statt der ersten n.
    for (const file of Array.from(files).slice(0, remaining)) {
      const reject = localReject(file, IMAGE_MIMES)
      if (reject) { firstError ??= reject; continue }
      try {
        uploaded.push(await uploadFile(file, target))
      } catch (err) {
        firstError ??= errorText(err, `${file.name}: Upload fehlgeschlagen`)
        break
      }
    }

    if (uploaded.length > 0) setItems(prev => [...prev, ...uploaded])
    if (firstError) setError(firstError)
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function removeImage(id: string) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/uploads/${id}`, 'DELETE')
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      setError(errorText(err, 'Löschen fehlgeschlagen'))
    } finally {
      setBusy(false)
    }
  }

  const slotsLeft = maxImages - items.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 11, color: 'var(--stone)', textAlign: 'center' }}>
        {loading ? 'Lade…' : (
          <>
            <b style={{ color: 'var(--gold2)', fontWeight: 700 }}>{items.length}</b> von{' '}
            <b style={{ color: 'var(--gold2)', fontWeight: 700 }}>{maxImages}</b> {label} hochgeladen
          </>
        )}
      </p>

      <input ref={inputRef} type="file" accept={IMAGE_MIMES.join(',')} multiple onChange={(e) => handleFiles(e.target.files)} style={{ display: 'none' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{
            aspectRatio: '1', borderRadius: 12, position: 'relative', overflow: 'hidden',
            background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.18)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={`Bild ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <span style={{
              position: 'absolute', bottom: 5, left: 5,
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              fontSize: 9, padding: '2px 6px', borderRadius: 6, fontWeight: 700,
            }}>{i + 1}</span>
            <button
              onClick={() => removeImage(item.id)}
              disabled={busy}
              aria-label="Löschen"
              style={{
                position: 'absolute', top: 5, right: 5,
                width: 22, height: 22, borderRadius: '50%',
                background: 'rgba(11,11,15,0.85)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                border: '1px solid rgba(196,168,106,0.3)', cursor: busy ? 'wait' : 'pointer',
              }}
            >✕</button>
          </div>
        ))}
        {slotsLeft > 0 && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy || loading}
            style={{
              aspectRatio: '1', borderRadius: 12,
              background: 'var(--c1)',
              border: '1.5px dashed rgba(196,168,106,0.4)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gold2)', cursor: busy || loading ? 'wait' : 'pointer', fontFamily: 'inherit',
              opacity: busy || loading ? 0.6 : 1,
            }}
          >
            <span style={{ fontSize: 32, lineHeight: 1 }}>{busy ? '…' : '+'}</span>
            <span style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>Bild</span>
          </button>
        )}
      </div>

      {error && <ErrorLine>{error}</ErrorLine>}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
 * DocumentUpload — Hygiene-Zertifikat, Approbation, …
 * ═══════════════════════════════════════════════════════════════ */

interface DocItem {
  id: string
  title: string
  sub: string
}

const DOC_MIMES = [...IMAGE_MIMES, 'application/pdf']

export function DocumentUpload({ docs }: { docs: DocItem[] }) {
  const { items, setItems, loading, error, setError } = useUploads('salon_certificate')
  const [busyDoc, setBusyDoc] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const byDocKey = new Map(items.map(i => [i.doc_key ?? '', i]))

  async function handleFile(docId: string, f: File | null) {
    if (!f || busyDoc) return
    const reject = localReject(f, DOC_MIMES)
    if (reject) { setError(reject); return }

    setBusyDoc(docId)
    setError(null)
    try {
      const record = await uploadFile(f, 'salon_certificate', docId)
      // Pro docKey genau ein Dokument — das alte wird serverseitig ersetzt.
      setItems(prev => [...prev.filter(i => i.doc_key !== docId), record])
    } catch (err) {
      setError(errorText(err, 'Upload fehlgeschlagen'))
    } finally {
      setBusyDoc(null)
      const input = inputRefs.current[docId]
      if (input) input.value = ''
    }
  }

  async function removeFile(docId: string) {
    const existing = byDocKey.get(docId)
    if (!existing || busyDoc) return
    setBusyDoc(docId)
    setError(null)
    try {
      await apiSend(`/api/uploads/${existing.id}`, 'DELETE')
      setItems(prev => prev.filter(i => i.id !== existing.id))
    } catch (err) {
      setError(errorText(err, 'Löschen fehlgeschlagen'))
    } finally {
      setBusyDoc(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {docs.map((d) => {
        const f = byDocKey.get(d.id)
        const status = f ? 'ok' : 'missing'
        const busy = busyDoc === d.id
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
                {loading ? 'LÄDT' : status === 'ok' ? 'HOCHGELADEN' : 'FEHLT'}
              </span>
            </div>

            <input
              ref={(el) => { inputRefs.current[d.id] = el }}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
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
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--gold2)', textDecoration: 'none' }}
                  >
                    {f.mime_type === 'application/pdf' ? 'Dokument (PDF)' : 'Dokument (Bild)'}
                  </a>
                  <span style={{ fontSize: 10, color: 'var(--stone)' }}>{formatSize(f.size_bytes)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => inputRefs.current[d.id]?.click()}
                    disabled={busy}
                    style={{
                      flex: 1, padding: 10, borderRadius: 10,
                      background: 'transparent', color: 'var(--gold2)',
                      border: '1px solid rgba(196,168,106,0.3)',
                      fontFamily: 'inherit', fontWeight: 600, fontSize: 12, cursor: busy ? 'wait' : 'pointer',
                      opacity: busy ? 0.6 : 1,
                    }}
                  >↻ {busy ? 'Lädt…' : 'Ersetzen'}</button>
                  <button
                    onClick={() => removeFile(d.id)}
                    disabled={busy}
                    style={{
                      flex: 1, padding: 10, borderRadius: 10,
                      background: 'transparent', color: '#FF8888',
                      border: '1px solid rgba(232,80,64,0.3)',
                      fontFamily: 'inherit', fontWeight: 600, fontSize: 12, cursor: busy ? 'wait' : 'pointer',
                      opacity: busy ? 0.6 : 1,
                    }}
                  >✕ Löschen</button>
                </div>
              </>
            ) : (
              <button
                onClick={() => inputRefs.current[d.id]?.click()}
                disabled={busy || loading}
                style={{ ...goldButtonStyle, width: '100%', padding: 12, borderRadius: 12, fontSize: 12.5, gap: 8, opacity: busy || loading ? 0.6 : 1 }}
              >
                <span>📎</span>
                <span>{busy ? 'Lädt hoch…' : 'Dokument hochladen (PDF · JPG · max. 5 MB)'}</span>
              </button>
            )}
          </div>
        )
      })}

      {error && <ErrorLine>{error}</ErrorLine>}
    </div>
  )
}
