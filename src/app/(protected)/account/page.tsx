'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Booking {
  id: string
  date?: string
  booking_date?: string
  start_time: string
  status: string
  total_price_cents: number
  salon: { name: string } | null
  service: { name: string } | null
}

export default function AccountPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    if (!session?.user) return
    fetch('/api/bookings')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setBookings(d.slice(0, 5)) })
      .catch(() => {})
  }, [session])

  if (!session?.user) {
    router.push('/auth')
    return null
  }

  const user = session.user
  const role = (user as { role?: string }).role || 'customer'

  const statusColor: Record<string, string> = {
    confirmed: '#4A8A5A',
    pending: 'var(--gold)',
    cancelled: '#C04040',
  }

  const statusLabel: Record<string, string> = {
    confirmed: 'Bestätigt',
    pending: 'Ausstehend',
    cancelled: 'Storniert',
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: '20px var(--pad) 0' }}>
        {/* Logo Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ animation: 'logoFloat 3s ease-in-out infinite, logoGlow 3s ease-in-out infinite', display: 'inline-block', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo_symbol_512x512.png" width={36} height={36} alt="ChairMatch" style={{ objectFit: 'contain' }} />
          </div>
          <div>
            <p className="cinzel" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, color: 'var(--gold2)', lineHeight: 1 }}>
              CHAIR<span style={{ color: 'var(--gold3)' }}>MATCH</span>
            </p>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--stone)', marginTop: 2 }}>DEUTSCHLAND</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="card" style={{ padding: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--c3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 18, color: 'var(--cream)', flexShrink: 0,
          }}>
            {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: 'var(--cream)', fontSize: 15 }}>{user.name || 'Benutzer'}</div>
            <div style={{ fontSize: 12, color: 'var(--stone)', marginTop: 2 }}>{user.email}</div>
            <div className="badge badge-gold" style={{ marginTop: 6, fontSize: 9 }}>{role}</div>
          </div>
        </div>

        {/* Referral Credit Card */}
        <div className="card" style={{ padding: 15, marginBottom: 14, background: 'linear-gradient(135deg, #1E1A08, #141008)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 3 }}>
                Referral Guthaben
              </p>
              <p className="cinzel" style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold2)' }}>0,00 €</p>
            </div>
            <button className="bgold" style={{ width: 'auto', padding: '10px 14px', fontSize: 12 }}>Empfehlen</button>
          </div>
        </div>

        {/* Stuhl Vermieten CTA */}
        {role === 'customer' && (
          <Link href="/register/anbieter" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: 0, marginBottom: 14, background: 'linear-gradient(135deg, #1A1608, #100E04)', border: '1px solid rgba(200,168,75,0.2)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flexShrink: 0, width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0A0600, #180C04)', borderRight: '1px solid rgba(200,168,75,0.12)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/12_stuhlvermietung_512x384.png" alt="Stuhl" style={{ height: 80, objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, padding: '14px 14px' }}>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 6 }}>
                    Stuhl vermieten
                  </p>
                  <p className="cinzel" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold2)', lineHeight: 1.3, marginBottom: 6 }}>
                    Premium Stuhl<br />& Kabinen
                  </p>
                  <span className="badge badge-gold" style={{ fontSize: 9 }}>→ Anbieter werden</span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Buchungen */}
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 10 }}>
          Buchungen
        </p>
        {bookings.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--stone)', padding: '16px 0' }}>Keine Buchungen vorhanden.</p>
        ) : (
          bookings.map(b => (
            <div key={b.id} className="card" style={{ padding: '13px 15px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>{b.salon?.name || 'Salon'}</p>
                <span style={{ fontSize: 12, fontWeight: 700, color: statusColor[b.status] || 'var(--stone)' }}>
                  {statusLabel[b.status] || b.status}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 2 }}>{b.service?.name || 'Service'}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--stone)' }}>
                  {b.booking_date || b.date} · {b.start_time?.slice(0, 5)}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold2)' }}>
                  {b.total_price_cents ? (b.total_price_cents / 100).toFixed(0) + ' €' : ''}
                </span>
              </div>
            </div>
          ))
        )}

        {/* Quick Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          <Link href="/favorites" className="card" style={{ textDecoration: 'none', display: 'block', padding: '13px 15px' }}>
            <span style={{ color: 'var(--cream)', fontSize: 13 }}>❤️ Favoriten</span>
          </Link>

          {['anbieter', 'provider', 'admin', 'super_admin'].includes(role) && (
            <Link href="/provider" className="card" style={{ textDecoration: 'none', display: 'block', padding: '13px 15px' }}>
              <span style={{ color: 'var(--cream)', fontSize: 13 }}>📊 Provider Dashboard</span>
            </Link>
          )}

          {['admin', 'super_admin'].includes(role) && (
            <Link href="/admin" className="card" style={{ textDecoration: 'none', display: 'block', padding: '13px 15px' }}>
              <span style={{ color: 'var(--cream)', fontSize: 13 }}>⚙️ Admin Panel</span>
            </Link>
          )}
        </div>

        {/* Rechtliches */}
        <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid rgba(200,168,75,0.08)' }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 10 }}>
            Rechtliches
          </p>
          {([
            ['📋 Datenschutzerklärung (DSGVO)', '/datenschutz'] as const,
            ['📄 Impressum', '/impressum'] as const,
            ['📜 AGB', '/agb'] as const,
            ['💺 Als Anbieter registrieren', '/register/anbieter'] as const,
          ]).map(([label, href]) => (
            <Link key={href} href={href} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(200,168,75,0.06)' }}>
              <span style={{ fontSize: 13, color: 'var(--cream)' }}>{label}</span>
              <span style={{ color: 'var(--stone)' }}>›</span>
            </Link>
          ))}

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="boutline"
            style={{ marginTop: 16, color: 'var(--red)', borderColor: 'rgba(232, 80, 64, 0.3)', width: '100%' }}
          >
            Abmelden
          </button>

          <p style={{ fontSize: 11, color: 'var(--stone2)', marginTop: 14, textAlign: 'center', lineHeight: 1.7 }}>
            ChairMatch GmbH (i. Gr.) · Deutschland · v6.0 · © 2026
          </p>
        </div>

        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}
