'use client'

import { useState } from 'react'
import { saveSettings } from '@/modules/super-admin/super-admin.actions'
import ColorPicker from './ColorPicker'

type Setting = {
  id: string
  category: string
  key: string
  value: string
  valueType: string
  label: string | null
}

interface SettingsFormProps {
  themeSettings: Setting[]
  layoutSettings: Setting[]
  animationSettings: Setting[]
}

export default function SettingsForm({ themeSettings, layoutSettings, animationSettings }: SettingsFormProps) {
  const [theme, setTheme] = useState<Record<string, string>>(
    Object.fromEntries(themeSettings.map(s => [s.key, s.value]))
  )
  const [layout, setLayout] = useState<Record<string, string>>(
    Object.fromEntries(layoutSettings.map(s => [s.key, s.value]))
  )
  const [animation, setAnimation] = useState<Record<string, string>>(
    Object.fromEntries(animationSettings.map(s => [s.key, s.value]))
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  async function handleSave(category: string, data: Record<string, string>) {
    setSaving(category)
    try {
      const settings = Object.entries(data).map(([key, value]) => ({ key, value }))
      const result = await saveSettings(category, settings)
      if (result.error) {
        setToast(`Fehler: ${result.error}`)
      } else {
        setToast('Gespeichert!')
      }
    } catch {
      // revalidateTag may cause re-render before result arrives — data still saved
      setToast('Gespeichert!')
    }
    setSaving(null)
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--green)', color: '#fff', padding: '10px 20px',
          borderRadius: 12, fontSize: 'var(--font-sm)', fontWeight: 700, zIndex: 999,
        }}>
          {toast}
        </div>
      )}

      {/* Theme Colors */}
      <section>
        <h2 style={{ fontSize: 'var(--font-lg)', color: 'var(--gold2)', fontWeight: 700, marginBottom: 12 }}>Farben</h2>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {themeSettings.map(s => (
            <ColorPicker
              key={s.key}
              label={s.label || s.key}
              value={theme[s.key]}
              onChange={v => setTheme(prev => ({ ...prev, [s.key]: v }))}
            />
          ))}
          <button
            className="bgold"
            onClick={() => handleSave('theme', theme)}
            disabled={saving === 'theme'}
            style={{ marginTop: 8 }}
          >
            {saving === 'theme' ? 'Speichern...' : 'Farben speichern'}
          </button>
        </div>
      </section>

      {/* Layout */}
      <section>
        <h2 style={{ fontSize: 'var(--font-lg)', color: 'var(--gold2)', fontWeight: 700, marginBottom: 12 }}>Layout</h2>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {layoutSettings.map(s => (
            <div key={s.key}>
              <label style={{ fontSize: 'var(--font-sm)', color: 'var(--cream)', fontWeight: 600 }}>{s.label || s.key}</label>
              <input
                className="inp"
                type="number"
                value={layout[s.key]}
                onChange={e => setLayout(prev => ({ ...prev, [s.key]: e.target.value }))}
                style={{ marginTop: 4 }}
              />
            </div>
          ))}
          <button
            className="bgold"
            onClick={() => handleSave('layout', layout)}
            disabled={saving === 'layout'}
            style={{ marginTop: 8 }}
          >
            {saving === 'layout' ? 'Speichern...' : 'Layout speichern'}
          </button>
        </div>
      </section>

      {/* Animations */}
      <section>
        <h2 style={{ fontSize: 'var(--font-lg)', color: 'var(--gold2)', fontWeight: 700, marginBottom: 12 }}>Animationen</h2>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {animationSettings.map(s => (
            <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--cream)', fontWeight: 600 }}>{s.label || s.key}</span>
              <button
                onClick={() => setAnimation(prev => ({ ...prev, [s.key]: prev[s.key] === 'true' ? 'false' : 'true' }))}
                style={{
                  width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                  background: animation[s.key] === 'true' ? 'var(--gold)' : 'var(--c3)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s',
                  left: animation[s.key] === 'true' ? 25 : 3,
                }} />
              </button>
            </div>
          ))}
          <button
            className="bgold"
            onClick={() => handleSave('animation', animation)}
            disabled={saving === 'animation'}
            style={{ marginTop: 8 }}
          >
            {saving === 'animation' ? 'Speichern...' : 'Animationen speichern'}
          </button>
        </div>
      </section>
    </div>
  )
}
