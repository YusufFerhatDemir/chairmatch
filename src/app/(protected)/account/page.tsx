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

/**
 * 2FA-Kachel.
 *
 * Bis Track 21 hat sie eine Schutzwirkung behauptet, die es nicht gab: nach
 * dem Klick auf „Aktivieren" setzte sie `enabled = true` und zeigte „Aktiv" —
 * geschrieben hatte die Route zu diesem Zeitpunkt aber `enabled: false`. Das
 * wird erst mit einem gueltigen Code aus /api/auth/2fa/verify wahr, und einen
 * Ort, an dem dieser Code haette eingegeben werden koennen, gab es in der
 * gesamten Oberflaeche nicht. Der Nutzer las also „Aktiv" und meldete sich
 * danach weiter allein mit seinem Passwort an.
 *
 * Jetzt hat die Kachel den zweiten Schritt: Geheimnis anzeigen, Code
 * eingeben, bestaetigen. „Aktiv" steht erst da, wenn der Server es sagt.
 */
function TwoFactorToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  /** Geheimnis der laufenden Einrichtung — erst nach Bestaetigung wirksam. */
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [hinweis, setHinweis] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    safeFetchJson<{ enabled?: boolean }>('/api/auth/2fa/setup', { timeoutMs: 6000, retries: 1 })
      .then((res) => {
        if (cancelled) return
        if (res.ok) setEnabled(res.data?.enabled === true)
        else setEnabled(false)
      })
    return () => { cancelled = true }
  }, [])

  async function starten() {
    setLoading(true)
    setHinweis(null)
    try {
      const r = await safeFetch('/api/auth/2fa/setup', { method: 'POST', timeoutMs: 8000, retries: 1 })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        if (r.status === 409) setEnabled(true)
        setHinweis(d?.error || 'Einrichtung fehlgeschlagen.')
        return
      }
      if (d?.qrUrl) window.open(d.qrUrl, '_blank')
      setSecret(typeof d?.secret === 'string' ? d.secret : '')
      setHinweis('Code aus der Authenticator-App eintragen — 2FA ist erst danach aktiv.')
    } catch {
      setHinweis('Einrichtung fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  async function bestaetigen() {
    setLoading(true)
    setHinweis(null)
    try {
      const r = await safeFetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
        timeoutMs: 8000,
        retries: 0,
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setHinweis(d?.error || 'Code nicht akzeptiert.')
        return
      }
      setSecret(null)
      setCode('')
      setEnabled(true)
    } catch {
      setHinweis('Code konnte nicht geprüft werden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--cream)', fontSize: 13 }}>🔐 Zwei-Faktor-Auth (2FA)</span>
        {enabled === null ? (
          <span style={{ fontSize: 11, color: 'var(--stone)' }}>...</span>
        ) : enabled ? (
          <span className="badge badge-gold" style={{ fontSize: 9 }}>Aktiv</span>
        ) : secret === null ? (
          <button
            className="boutline"
            disabled={loading}
            onClick={starten}
            style={{ fontSize: 11, padding: '4px 12px' }}
          >
            {loading ? '...' : 'Aktivieren'}
          </button>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--stone)' }}>Noch nicht aktiv</span>
        )}
      </div>

      {secret !== null && !enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {secret && (
            <code style={{ fontSize: 11, color: 'var(--stone)', wordBreak: 'break-all' }}>{secret}</code>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input aria-label="6-stelliger Code"
              className="inp"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-stelliger Code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ fontSize: 12 }}
            />
            <button
              className="bgold"
              disabled={loading || code.length !== 6}
              onClick={bestaetigen}
              style={{ fontSize: 11, padding: '4px 12px', whiteSpace: 'nowrap' }}
            >
              {loading ? '...' : 'Bestätigen'}
            </button>
          </div>
        </div>
      )}

      {hinweis && <span style={{ fontSize: 11, color: 'var(--stone)' }}>{hinweis}</span>}
    </div>
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
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Redirect als Effect, nicht während des Renderns — router.push im Render-Body
  // warf beim Prerender (keine Session) serverseitig "location is not defined".
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth')
  }, [status, router])

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

  if (!session?.user) {
    return null
  }

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
            <button className="bgold" style={{ width: 'auto', padding: '10px 14px', fontSize: 12 }}>Empfehlen</button>
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

          {deleteError && (
            <p role="alert" style={{ marginTop: 16, fontSize: 12, color: 'var(--red)', lineHeight: 1.6 }}>
              {deleteError}
            </p>
          )}
          <button
            disabled={deleting}
            onClick={async () => {
              // Der Endpunkt verlangt die eigene E-Mail als Bestaetigung — ein
              // reines confirm() genuegt fuer eine unumkehrbare Loeschung nicht.
              // Der Login ist danach gesperrt und die Kontaktdaten sind weg;
              // das gehoert vorher gesagt, nicht hinterher.
              const bestaetigung = window.prompt(
                'Konto endgültig löschen?\n\n' +
                  'Dein Zugang wird sofort gesperrt und deine Kontaktdaten werden gelöscht. ' +
                  'Die endgültige Löschung erfolgt nach 30 Tagen. Das lässt sich nicht rückgängig machen.\n\n' +
                  'Zur Bestätigung bitte die E-Mail-Adresse dieses Kontos eingeben:',
              )
              if (bestaetigung === null) return

              if (bestaetigung.trim().toLowerCase() !== (user.email ?? '').trim().toLowerCase()) {
                setDeleteError('Die eingegebene E-Mail-Adresse stimmt nicht mit diesem Konto überein. Das Konto wurde nicht gelöscht.')
                return
              }

              setDeleteError(null)
              setDeleting(true)
              try {
                const r = await safeFetch('/api/account/delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ confirmEmail: bestaetigung.trim() }),
                  timeoutMs: 10000,
                  retries: 0,
                })
                if (r.ok) {
                  await signOut({ callbackUrl: '/' })
                  router.push('/')
                  return
                }
                // Fehlschlag nicht verschlucken: vorher blieb der Nutzer ohne
                // jede Rueckmeldung auf der Seite und wusste nicht, ob geloescht
                // wurde oder nicht.
                const body = (await r.json().catch(() => null)) as { error?: string } | null
                setDeleteError(body?.error ?? 'Das Konto konnte nicht gelöscht werden. Bitte später erneut versuchen.')
              } catch {
                setDeleteError('Keine Verbindung zum Server. Das Konto wurde nicht gelöscht.')
              } finally {
                setDeleting(false)
              }
            }}
            className="boutline"
            style={{ marginTop: 16, color: 'var(--red)', borderColor: 'rgba(232, 80, 64, 0.3)', width: '100%' }}
          >
            {deleting ? 'Wird gelöscht…' : '🗑️ Konto löschen'}
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
