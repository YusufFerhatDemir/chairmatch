'use client'

import { useState } from 'react'

interface ColorPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export default function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [hex, setHex] = useState(value)

  function handleChange(newValue: string) {
    setHex(newValue)
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input
        type="color"
        value={hex}
        onChange={e => handleChange(e.target.value)}
        style={{
          width: 36, height: 36, border: 'none', borderRadius: 8,
          cursor: 'pointer', background: 'transparent',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--cream)', fontWeight: 600 }}>{label}</div>
        <input
          className="inp"
          value={hex}
          onChange={e => handleChange(e.target.value)}
          style={{ marginTop: 4, fontSize: 'var(--font-sm)', padding: '8px 10px' }}
          maxLength={7}
        />
      </div>
    </div>
  )
}
