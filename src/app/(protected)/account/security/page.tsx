'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

/**
 * Account-Security-Übersicht.
 *
 * - Passwort ändern
 * - 2FA-Status + Setup
 * - Telefonnummer verifizieren
 * - Aktive Sessions (TODO)
 * - Account löschen (TODO)
 */
export default function SecurityPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [twoFA, setTwoFA] = useState<{ enabled: boolean | null }>({ enabled: null })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth?callbackUrl=/account/security')
  }, [status, router])

  useEffect(() => {
    if (!session?.user?.id) return
    fetch('/api/auth/2fa/setup')
      .then(r => r.json())
      .then(d => setTwoFA({ enabled: !!d.enabled }))
      .catch(() => setTwoFA({ enabled: false }))
  }, [session])

  if (status === 'loading' || !session?.user) {
    return (
      <div className="shell"><div className="screen" style={{ padding: 20 }}>
        <p style={{ color: 'var(--stone)' }}>Lade …</p>
      </div></div>
    )
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/account" style={{ color: 'var(--stone)', fontSize: 14, textDecoration: 'none' }}>← Zum Konto</Link>
        <h1 className="cinzel" style={{ color: 'var(--gold2)', fontSize: 22, marginTop: 12, marginBottom: 24 }}>Sicherheit</h1>

        {/* Passwort */}
        <SecuritySection
          title="Passwort"
          subtitle="Sicheres Passwort: 10+ Zeichen, Großbuchstabe, Zahl, Sonderzeichen."
          actionLabel="Passwort ändern"
          actionHref="/auth/change-password"
          status="active"
        />

        {/* 2FA */}
        <SecuritySection
          title="Zwei-Faktor-Authentifizierung (2FA)"
          subtitle={twoFA.enabled
            ? 'Aktiv — beim Login wird zusätzlich ein Code aus deiner Authenticator-App verlangt.'
            : 'Schützt deinen Account auch wenn jemand dein Passwort kennt. Empfohlen für Provider und Admins.'}
          actionLabel={twoFA.enabled ? '2FA deaktivieren' : '2FA aktivieren'}
          actionHref="/account/security/2fa"
          status={twoFA.enabled === null ? 'loading' : twoFA.enabled ? 'active' : 'inactive'}
        />

        {/* Telefon */}
        <SecuritySection
          title="Telefonnummer"
          subtitle="Verifizierte Nummer für SMS-Codes bei Account-Recovery."
          actionLabel="Nummer verifizieren"
          actionHref="/account/security/phone"
          status="inactive"
        />

        {/* DSGVO Daten-Export */}
        <SecuritySection
          title="Meine Daten herunterladen"
          subtitle="DSGVO Art. 20: Alle deine Daten als JSON-Export. Innerhalb 72 h verfügbar."
          actionLabel="Export anfordern"
          actionHref="/api/account/export"
          status="active"
          external
        />
      </div>
    </div>
  )
}

function SecuritySection({
  title, subtitle, actionLabel, actionHref, status, external,
}: {
  title: string
  subtitle: string
  actionLabel: string
  actionHref: string
  status: 'active' | 'inactive' | 'loading'
  external?: boolean
}) {
  const dot = status === 'active' ? 'var(--green)' : status === 'inactive' ? 'var(--red)' : 'var(--stone)'
  const dotLabel = status === 'active' ? 'aktiv' : status === 'inactive' ? 'inaktiv' : '…'
  return (
    <div style={{ background: 'var(--c2)', borderRadius: 14, padding: 16, marginBottom: 12, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <h3 style={{ color: 'var(--cream)', fontSize: 15, margin: 0, fontWeight: 600 }}>{title}</h3>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
          background: 'rgba(0,0,0,0.3)', color: dot, whiteSpace: 'nowrap',
        }}>
          ● {dotLabel}
        </span>
      </div>
      <p style={{ color: 'var(--stone)', fontSize: 12, lineHeight: 1.5, margin: '0 0 12px' }}>
        {subtitle}
      </p>
      {external ? (
        <a href={actionHref} style={{ color: 'var(--gold2)', fontSize: 13, textDecoration: 'underline' }}>
          {actionLabel} →
        </a>
      ) : (
        <Link href={actionHref} style={{ color: 'var(--gold2)', fontSize: 13, textDecoration: 'underline' }}>
          {actionLabel} →
        </Link>
      )}
    </div>
  )
}
