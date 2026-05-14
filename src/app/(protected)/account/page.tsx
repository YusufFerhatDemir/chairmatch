 'use client'

import { BrandLogo } from '@/components/BrandLogo'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { safeFetch, safeFetchJson } from '@/lib/safe-fetch'

function NotificationBell() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let cancelled = false
    safeFetchJson<{ unreadCount?: number }>('/api/notifications', { timeoutMs: 6000, retries: 1 })
      .then((res) => {
        if (cancelled) return
        if (res.ok && res.data?.unreadCount) setCount(res.data.unreadCount)
      })
    return () => { cancelled = true }
  }, [])
  return (
    <div className="card" style={{ padding: '13px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--cream)', fontSize: 13 }}>🔔 Benachrichtigungen</span>
      {count > 0 && (
        <span style={{ background: 'var(--gold)', color: '#060504', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10 }}>
          {count}
        </span>
      )}
    </div>
  )
}

function TwoFactorToggle() {
  // Card verweist zur neuen Security-Übersicht (saubere QR-UI dort, statt
  // window.open auf rohes otpauth://-URL).
  const [enabled, setEnabled] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    safeFetchJson<{ enabled?: boolean }>('/api/auth/2fa/setup', { timeoutMs: 6000, retries: 1 })
      .then((res) => {
        if (cancelled) return
        setEnabled(res.ok ? res.data?.enabled === true : false)
      })
    return () => { cancelled = true }
  }, [])
  return (
    <>
    <Link href="/account/security" style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: '13px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
        <span style={{ color: 'var(--cream)', fontSize: 13 }}>🔐 Sicherheit & Login</span>
        {enabled === null ? (
          <span style={{ fontSize: 11, color: 'var(--stone)' }}>…</span>
        ) : enabled ? (
          <span className="badge badge-gold" style={{ fontSize: 9 }}>2FA aktiv</span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--gold2)' }}>Einrichten →</span>
        )}
      </div>
    </Link>
    <Link href={"/account/bewertungen" as never} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: '13px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
        <span style={{ color: 'var(--cream)', fontSize: 13 }}>⭐ Meine Bewertungen</span>
        <span style={{ fontSize: 11, color: 'var(--gold2)' }}>Öffnen →</span>
      </div>
    </Link>
    </>
  )
}

interface Booking {
  id: string
  date?: string
  booking_date?: string
  start_time: string
  status: string
  price_cents: number
  salon: { name: string } | null
  service: { name: string } | null
}

export default function AccountPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    if (!session?.user) return
    let cancelled = false
    safeFetchJson<Booking[]>('/api/bookings', { timeoutMs: 8000, retries: 1 })
      .then((res) => {
        if (cancelled) return
        if (res.ok && Array.isArray(res.data)) setBookings(res.data.slice(0, 5))
      })
    return () => { cancelled = true }
  }, [session])

  // B2-Fix: router.push DARF NICHT im Render-Pfad stehen — sonst React-Crash
  // "Cannot update during render" + ggf. Endlos-Redirect-Loop.
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth?callbackUrl=/account')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="shell">
        <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(176,144,96,0.2)', borderTopColor: '#B09060', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    )
  }
  if (!session?.user) return null

  const user = session.user
  const role = (user as { role?: string }).role || 'kunde'

  const statusColor: Record<string, string> = {
    confirmed: '#4A8A5A',
    pending: 'var(--gold)',
    cancelled: '#C04040',
    completed: '#3A7A4A',
    no_show: '#8A4A4A',
    failed: '#C04040',
  }

  const statusLabel: Record<string, string> = {
    confirmed: 'Bestätigt',
    pending: 'Ausstehend',
    cancelled: 'Storniert',
    completed: 'Abgeschlossen',
    no_show: 'Nicht erschienen',
    failed: 'Fehlgeschlagen',
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: '20px var(--pad) 0' }}>
        {/* Logo Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ animation: 'logoFloat 3s ease-in-out infinite, logoGlow 3s ease-in-out infinite', display: 'inline-block', flexShrink: 0 }}>
            <BrandLogo size={36} variant="dark" animateStar />
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
            <button
              onClick={async () => {
                const url = `${window.location.origin}/?ref=${session?.user?.id ?? ''}`
                const text = `Probiere ChairMatch — Deutschlands Marketplace für Beauty-Workspace-Sharing. Mit meiner Empfehlung beide 15 € Rabatt: ${url}`
                if (navigator.share) {
                  try { await navigator.share({ title: 'ChairMatch empfehlen', text, url }) } catch { /* user cancelled */ }
                } else {
                  try {
                    await navigator.clipboard.writeText(url)
                    alert('Link in die Zwischenablage kopiert!')
                  } catch {
                    prompt('Empfehlungs-Link:', url)
                  }
                }
              }}
              className="bgold"
              style={{ width: 'auto', padding: '10px 14px', fontSize: 12, border: 'none', cursor: 'pointer' }}
            >
              Empfehlen
            </button>
          </div>
        </div>

        {/* Stuhl Vermieten CTA */}
        {role === 'kunde' && (
          <Link href="/register/anbieter" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: 0, marginBottom: 14, background: 'linear-gradient(135deg, #1A1608, #100E04)', border: '1px solid rgba(176,144,96,0.2)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flexShrink: 0, width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0A0600, #180C04)', borderRight: '1px solid rgba(176,144,96,0.12)' }}>
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
                  {b.price_cents ? (b.price_cents / 100).toFixed(0) + ' €' : ''}
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

          <NotificationBell />

          <TwoFactorToggle />

          <LanguageSwitcher variant="inline" />

          {(role === 'anbieter' || role === 'provider' || role === 'b2b' || role === 'admin' || role === 'super_admin') && (
            <>
              <Link href="/provider" className="card" style={{ textDecoration: 'none', display: 'block', padding: '13px 15px' }}>
                <span style={{ color: 'var(--cream)', fontSize: 13 }}>📊 Provider Dashboard</span>
              </Link>
              <Link href="/owner/compliance" className="card" style={{ textDecoration: 'none', display: 'block', padding: '13px 15px' }}>
                <span style={{ color: 'var(--cream)', fontSize: 13 }}>📋 Compliance & Dokumente</span>
              </Link>
            </>
          )}

          {['admin', 'super_admin'].includes(role) && (
            <>
              {/* Prominenter Admin-Hero-Button */}
              <Link
                href="/admin/mis"
                style={{
                  textDecoration: 'none',
                  display: 'block',
                  marginTop: 6,
                  marginBottom: 4,
                  padding: '18px 18px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #2A1F08 0%, #1A1408 50%, #0E0A04 100%)',
                  border: '1px solid rgba(212,175,55,0.35)',
                  boxShadow: '0 4px 18px rgba(212,175,55,0.12), inset 0 1px 0 rgba(212,175,55,0.08)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    flexShrink: 0,
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #D4AF37 0%, #B89030 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    boxShadow: '0 2px 8px rgba(212,175,55,0.4)',
                  }}>
                    ⚙️
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="cinzel" style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: 'var(--gold2)',
                      letterSpacing: '0.05em',
                      marginBottom: 3,
                      lineHeight: 1.2,
                    }}>
                      MIS-Portal & Admin
                    </p>
                    <p style={{
                      fontSize: 11,
                      color: 'var(--stone)',
                      lineHeight: 1.35,
                    }}>
                      Umsatz · Buchungen · Anbieter · Health-Scores
                    </p>
                  </div>
                  <span style={{
                    color: 'var(--gold)',
                    fontSize: 20,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}>›</span>
                </div>
              </Link>

              {/* Admin Sub-Links */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                <Link href="/admin/anbieter" className="card" style={{ textDecoration: 'none', display: 'block', padding: '10px 12px', textAlign: 'center' }}>
                  <span style={{ color: 'var(--cream)', fontSize: 11, fontWeight: 600 }}>🏢 Anbieter</span>
                </Link>
                <Link href="/admin/affiliate" className="card" style={{ textDecoration: 'none', display: 'block', padding: '10px 12px', textAlign: 'center' }}>
                  <span style={{ color: 'var(--cream)', fontSize: 11, fontWeight: 600 }}>🛒 Affiliate</span>
                </Link>
                <Link href="/admin/pricing" className="card" style={{ textDecoration: 'none', display: 'block', padding: '10px 12px', textAlign: 'center' }}>
                  <span style={{ color: 'var(--cream)', fontSize: 11, fontWeight: 600 }}>💰 Pricing</span>
                </Link>
                <Link href="/admin/audit-logs" className="card" style={{ textDecoration: 'none', display: 'block', padding: '10px 12px', textAlign: 'center' }}>
                  <span style={{ color: 'var(--cream)', fontSize: 11, fontWeight: 600 }}>📜 Audit-Logs</span>
                </Link>
              </div>
            </>
          )}

          {/* Super-Admin Promote-Link (sichtbar für alle, da Setup-Key-geschützt) */}
          {!['admin', 'super_admin'].includes(role) && (
            <Link href="/account/promote-admin" className="card" style={{ textDecoration: 'none', display: 'block', padding: '13px 15px', opacity: 0.6 }}>
              <span style={{ color: 'var(--stone)', fontSize: 12 }}>🔑 Super-Admin Setup</span>
            </Link>
          )}
        </div>

        {/* Betroffenenrechte (DSGVO) */}
        <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid rgba(176,144,96,0.08)' }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 10 }}>
            Meine Daten
          </p>
          <button
            onClick={async () => {
              try {
                const r = await safeFetch('/api/account/export', {
                  timeoutMs: 15000,
                  retries: 0,
                })
                if (!r.ok) return
                const blob = await r.blob()
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = `chairmatch-export-${new Date().toISOString().slice(0, 10)}.json`
                a.click()
              } catch {
                /* swallow — UI stays usable */
              }
            }}
            className="boutline"
            style={{ width: '100%', marginBottom: 8, textAlign: 'left', padding: '12px 14px' }}
          >
            📤 Daten exportieren (JSON)
          </button>
        </div>

        {/* Rechtliches */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(176,144,96,0.08)' }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 10 }}>
            Rechtliches
          </p>
          {([
            ['📋 Datenschutzerklärung (DSGVO)', '/datenschutz'] as const,
            ['📄 Impressum', '/impressum'] as const,
            ['📜 AGB', '/agb'] as const,
            ['🍪 Cookie-Einstellungen', '/cookie-settings'] as const,
            ['💺 Als Anbieter registrieren', '/register/anbieter'] as const,
          ]).map(([label, href]) => (
            <Link key={href} href={href} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(176,144,96,0.06)' }}>
              <span style={{ fontSize: 13, color: 'var(--cream)' }}>{label}</span>
              <span style={{ color: 'var(--stone)' }}>›</span>
            </Link>
          ))}

          <button
            onClick={async () => {
              if (!confirm('Konto wirklich löschen? Nach 30 Tagen erfolgt die endgültige Löschung.')) return
              try {
                const r = await safeFetch('/api/account/delete', {
                  method: 'POST',
                  timeoutMs: 10000,
                  retries: 0,
                })
                if (r.ok) {
                  await signOut({ callbackUrl: '/' })
                  router.push('/')
                }
              } catch {
                /* keep user on page — they can retry */
              }
            }}
            className="boutline"
            style={{ marginTop: 16, color: 'var(--red)', borderColor: 'rgba(232, 80, 64, 0.3)', width: '100%' }}
          >
            🗑️ Konto löschen
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="boutline"
            style={{ marginTop: 8, borderColor: 'rgba(176,144,96,0.3)', width: '100%' }}
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
