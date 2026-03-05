'use client'

import { useState } from 'react'
import { createSlide, updateSlide, deleteSlide, reorderSlides } from '@/modules/super-admin/super-admin.actions'

type Slide = {
  id: string
  title: string
  subtitle: string
  imageUrl: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
}

interface OnboardingEditorProps {
  initialSlides: Slide[]
}

export default function OnboardingEditor({ initialSlides }: OnboardingEditorProps) {
  const [slides, setSlides] = useState<Slide[]>(initialSlides)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [newSlide, setNewSlide] = useState({ title: '', subtitle: '', icon: '' })
  const [showNew, setShowNew] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  async function handleCreate() {
    if (!newSlide.title || !newSlide.subtitle) return
    setSaving(true)
    const result = await createSlide({
      title: newSlide.title,
      subtitle: newSlide.subtitle,
      icon: newSlide.icon || null,
    })
    if (result.slide) {
      setSlides(prev => [...prev, result.slide as Slide])
      setNewSlide({ title: '', subtitle: '', icon: '' })
      setShowNew(false)
      showToast('Slide erstellt!')
    }
    setSaving(false)
  }

  async function handleUpdate(id: string, data: Partial<Slide>) {
    setSaving(true)
    const result = await updateSlide(id, data)
    if (result.slide) {
      setSlides(prev => prev.map(s => s.id === id ? { ...s, ...result.slide } as Slide : s))
      setEditing(null)
      showToast('Gespeichert!')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Slide wirklich löschen?')) return
    setSaving(true)
    await deleteSlide(id)
    setSlides(prev => prev.filter(s => s.id !== id))
    showToast('Gelöscht!')
    setSaving(false)
  }

  async function moveSlide(index: number, direction: -1 | 1) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= slides.length) return
    const newSlides = [...slides]
    const tmp = newSlides[index]
    newSlides[index] = newSlides[newIndex]
    newSlides[newIndex] = tmp
    setSlides(newSlides)
    await reorderSlides(newSlides.map(s => s.id))
  }

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--green)', color: '#fff', padding: '10px 20px',
          borderRadius: 12, fontSize: 'var(--font-sm)', fontWeight: 700, zIndex: 999,
        }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {slides.map((slide, i) => (
          <div key={slide.id} className="card" style={{ opacity: slide.isActive ? 1 : 0.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 24 }}>{slide.icon || '📄'}</span>
                  <span style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>#{i + 1}</span>
                </div>

                {editing === slide.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input className="inp" value={slide.title}
                      onChange={e => setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, title: e.target.value } : s))}
                      placeholder="Titel" />
                    <input className="inp" value={slide.subtitle}
                      onChange={e => setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, subtitle: e.target.value } : s))}
                      placeholder="Untertitel" />
                    <input className="inp" value={slide.icon || ''}
                      onChange={e => setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, icon: e.target.value } : s))}
                      placeholder="Icon (Emoji)" style={{ maxWidth: 100 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="bgold" style={{ fontSize: 'var(--font-sm)', padding: '8px 14px' }}
                        onClick={() => handleUpdate(slide.id, { title: slide.title, subtitle: slide.subtitle, icon: slide.icon })}
                        disabled={saving}>
                        Speichern
                      </button>
                      <button className="boutline" style={{ fontSize: 'var(--font-sm)', padding: '8px 14px' }}
                        onClick={() => setEditing(null)}>
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => setEditing(slide.id)} style={{ cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700, color: 'var(--cream)', fontSize: 'var(--font-md)' }}>{slide.title}</div>
                    <div style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginTop: 2 }}>{slide.subtitle}</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                <button onClick={() => moveSlide(i, -1)} disabled={i === 0}
                  style={{ background: 'var(--c3)', border: 'none', borderRadius: 6, padding: '4px 8px', color: 'var(--cream)', cursor: 'pointer', fontSize: 12 }}>
                  ↑
                </button>
                <button onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1}
                  style={{ background: 'var(--c3)', border: 'none', borderRadius: 6, padding: '4px 8px', color: 'var(--cream)', cursor: 'pointer', fontSize: 12 }}>
                  ↓
                </button>
                <button onClick={() => handleUpdate(slide.id, { isActive: !slide.isActive })}
                  style={{
                    background: slide.isActive ? 'var(--green)' : 'var(--c3)',
                    border: 'none', borderRadius: 6, padding: '4px 8px', color: '#fff', cursor: 'pointer', fontSize: 10,
                  }}>
                  {slide.isActive ? 'AN' : 'AUS'}
                </button>
                <button onClick={() => handleDelete(slide.id)}
                  style={{ background: 'var(--red)', border: 'none', borderRadius: 6, padding: '4px 8px', color: '#fff', cursor: 'pointer', fontSize: 10 }}>
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add new slide */}
      {showNew ? (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ fontSize: 'var(--font-md)', color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>Neue Slide</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="inp" placeholder="Titel" value={newSlide.title}
              onChange={e => setNewSlide(prev => ({ ...prev, title: e.target.value }))} />
            <input className="inp" placeholder="Untertitel" value={newSlide.subtitle}
              onChange={e => setNewSlide(prev => ({ ...prev, subtitle: e.target.value }))} />
            <input className="inp" placeholder="Icon (Emoji)" value={newSlide.icon}
              onChange={e => setNewSlide(prev => ({ ...prev, icon: e.target.value }))}
              style={{ maxWidth: 100 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="bgold" onClick={handleCreate} disabled={saving}
                style={{ fontSize: 'var(--font-sm)', padding: '8px 14px' }}>
                {saving ? 'Erstellen...' : 'Erstellen'}
              </button>
              <button className="boutline" onClick={() => setShowNew(false)}
                style={{ fontSize: 'var(--font-sm)', padding: '8px 14px' }}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button className="boutline" onClick={() => setShowNew(true)}
          style={{ marginTop: 12, width: '100%', fontSize: 'var(--font-sm)' }}>
          + Neue Slide hinzufügen
        </button>
      )}
    </div>
  )
}
