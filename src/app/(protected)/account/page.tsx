'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function AccountPage() {
  const { data: session } = useSession()
  const router = useRouter()

  if (!session?.user) {
    router.push('/auth')
    return null
  }

  const user = session.user
  const role = (user as { role?: string }).role || 'customer'

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginBottom: 24 }}>
          Mein Konto
        </h1>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--c3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 20, color: 'var(--cream)',
            }}>
              {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{user.name || 'Benutzer'}</div>
              <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)' }}>{user.email}</div>
              <div className="badge badge-gold" style={{ marginTop: 4 }}>{role}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a href="/favorites" className="card" style={{ textDecoration: 'none', display: 'block' }}>
            <span style={{ color: 'var(--cream)' }}>❤️ Favoriten</span>
          </a>

          {['anbieter', 'provider', 'admin', 'super_admin'].includes(role) && (
            <a href="/provider" className="card" style={{ textDecoration: 'none', display: 'block' }}>
              <span style={{ color: 'var(--cream)' }}>📊 Provider Dashboard</span>
            </a>
          )}

          {['admin', 'super_admin'].includes(role) && (
            <a href="/admin" className="card" style={{ textDecoration: 'none', display: 'block' }}>
              <span style={{ color: 'var(--cream)' }}>⚙️ Admin Panel</span>
            </a>
          )}

          <a href="/datenschutz" className="card" style={{ textDecoration: 'none', display: 'block' }}>
            <span style={{ color: 'var(--stone)' }}>Datenschutz</span>
          </a>

          <a href="/impressum" className="card" style={{ textDecoration: 'none', display: 'block' }}>
            <span style={{ color: 'var(--stone)' }}>Impressum</span>
          </a>

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="boutline"
            style={{ marginTop: 16, color: 'var(--red)', borderColor: 'rgba(232, 80, 64, 0.3)' }}
          >
            Abmelden
          </button>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
