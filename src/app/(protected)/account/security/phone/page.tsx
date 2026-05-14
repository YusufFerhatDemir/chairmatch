'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PhoneAuthWidget } from '@/components/PhoneAuthWidget'
import { BackButton } from '@/components/BackButton'

/**
 * Phone-Nummer-Verifizierung im Account-Bereich.
 * Nutzt das PhoneAuthWidget (Send + Verify).
 */
export default function PhoneVerifyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [verified, setVerified] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth?callbackUrl=/account/security/phone')
  }, [status, router])

  if (status === 'loading' || !session?.user) {
    return <div className="shell"><div className="screen" style={{ padding: 20 }}>
      <p style={{ color: 'var(--stone)' }}>Lade …</p>
    </div></div>
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <div style={{ marginBottom: 14 }}>
          <BackButton href="/account/security" label="Zurück" />
        </div>
        <h1 className="cinzel" style={{ color: 'var(--gold2)', fontSize: 22, marginTop: 12, marginBottom: 8 }}>Telefonnummer verifizieren</h1>

        {verified ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(74,138,90,.15)', border: '2px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'var(--green)', margin: '0 auto 16px' }}>
              ✓
            </div>
            <h2 style={{ color: 'var(--cream)', fontSize: 18, margin: '0 0 8px' }}>Nummer verifiziert</h2>
            <p style={{ color: 'var(--gold2)', fontSize: 16, marginBottom: 20 }}>{verified}</p>
            <Link href="/account/security" className="bgold" style={{ display: 'inline-block', padding: '12px 24px', textDecoration: 'none' }}>
              Zurück zur Sicherheit
            </Link>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--stone)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              Verifiziere deine Telefonnummer per SMS. Wir verwenden sie für:
            </p>
            <ul style={{ color: 'var(--stone)', fontSize: 13, paddingLeft: 18, marginBottom: 24, lineHeight: 1.8 }}>
              <li>Account-Recovery falls du dein Passwort vergisst</li>
              <li>Wichtige Buchungsbenachrichtigungen</li>
              <li>Verifizierung bei sicherheitsrelevanten Aktionen</li>
            </ul>
            <PhoneAuthWidget onVerified={(phone) => setVerified(phone)} />
          </>
        )}
      </div>
    </div>
  )
}
