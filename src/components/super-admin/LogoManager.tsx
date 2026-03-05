'use client'

import { useState } from 'react'
import { saveSettings } from '@/modules/super-admin/super-admin.actions'
import ImageUploader from './ImageUploader'

type LogoSetting = {
  key: string
  value: string
  label: string | null
}

interface LogoManagerProps {
  logos: LogoSetting[]
}

export default function LogoManager({ logos: initialLogos }: LogoManagerProps) {
  const [logos, setLogos] = useState(initialLogos)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  async function handleUpload(key: string, url: string) {
    setLogos(prev => prev.map(l => l.key === key ? { ...l, value: url } : l))
    await saveSettings('logo', [{ key, value: url }])
    showToast('Logo aktualisiert!')
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {logos.map(logo => (
          <div key={logo.key} className="card">
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
              {logo.label || logo.key}
            </div>
            <div style={{
              background: 'var(--c2)', borderRadius: 12, padding: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 80, marginBottom: 8,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo.value}
                alt={logo.label || logo.key}
                style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>
            <ImageUploader
              currentUrl={null}
              bucket="app-assets"
              folder="logos"
              onUpload={url => handleUpload(logo.key, url)}
              label="Hochladen"
            />
            {logo.value && (
              <a
                href={logo.value}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', marginTop: 6, fontSize: 'var(--font-xs)',
                  color: 'var(--stone)', textAlign: 'center',
                }}
              >
                Herunterladen ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
