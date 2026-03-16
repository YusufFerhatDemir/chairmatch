'use client'

import { useState } from 'react'

const ROLES = ['kunde', 'anbieter', 'b2b', 'admin', 'super_admin']

interface User { id: string; full_name: string | null; email: string | null; role: string; preferred_language: string | null }

export default function AdminUserActions({ users: init }: { users: User[] }) {
  const [users, setUsers] = useState(init)
  const [changing, setChanging] = useState<string | null>(null)

  async function changeRole(id: string, role: string) {
    setChanging(id)
    const res = await fetch('/api/admin', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'user-role', id, data: { role } }),
    })
    if (res.ok) {
      setUsers(p => p.map(u => u.id === id ? { ...u, role } : u))
    }
    setChanging(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {users.map(u => (
        <div key={u.id} className="card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--cream)' }}>{u.full_name || 'Kein Name'}</div>
              <div style={{ fontSize: 11, color: 'var(--stone)' }}>{u.email || 'Keine E-Mail'}</div>
            </div>
            <select
              value={u.role}
              onChange={e => changeRole(u.id, e.target.value)}
              disabled={changing === u.id}
              style={{
                background: 'var(--c3)', color: 'var(--gold2)', border: '1px solid rgba(214,177,90,0.2)',
                borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      ))}
    </div>
  )
}
