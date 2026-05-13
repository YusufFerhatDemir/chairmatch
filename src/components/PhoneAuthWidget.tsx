'use client'

import { useState } from 'react'
import { useTranslations } from '@/i18n/client'

/**
 * Phone-Auth-Widget für SMS-OTP-Verifizierung.
 *
 * Zwei Stufen:
 * 1. Nummer eingeben → POST /api/auth/phone/send → 6-Stellen-Code per SMS
 * 2. Code eingeben → POST /api/auth/phone/verify → Erfolg/Fehler
 *
 * Wird beim Erfolg `onVerified(phone)` aufgerufen — der Caller entscheidet
 * was als nächstes passiert (Profil speichern, weiter zum nächsten Step, etc.).
 */
export interface PhoneAuthWidgetProps {
  initialPhone?: string
  onVerified?: (phone: string) => void
  /** Optional: Beschriftung des Submit-Buttons im Code-Step */
  verifyLabel?: string
}

export function PhoneAuthWidget({ initialPhone = '', onVerified, verifyLabel }: PhoneAuthWidgetProps) {
  const t = useTranslations()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState(initialPhone)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [resendIn, setResendIn] = useState(0)

  async function sendCode() {
    if (loading) return
    setError(''); setInfo('')
    if (!phone || phone.replace(/\D/g, '').length < 7) {
      setError(t('phoneAuth.invalidNumber') || 'Bitte eine gültige Nummer eingeben.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || (t('phoneAuth.sendFailed') || 'Konnte SMS nicht senden.'))
        return
      }
      setInfo(data.devNote || (t('phoneAuth.codeSent') || 'Code gesendet — bitte SMS checken.'))
      setStep('code')
      // 30s Cooldown bevor man neu anfordern kann
      setResendIn(30)
      const tick = setInterval(() => {
        setResendIn(s => {
          if (s <= 1) { clearInterval(tick); return 0 }
          return s - 1
        })
      }, 1000)
    } catch {
      setError(t('phoneAuth.connectionError') || 'Verbindungsfehler.')
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode() {
    if (loading) return
    setError(''); setInfo('')
    if (!/^\d{6}$/.test(code)) {
      setError(t('phoneAuth.codeFormat') || 'Code besteht aus 6 Ziffern.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        setError(data.error || (t('phoneAuth.wrongCode') || 'Falscher oder abgelaufener Code.'))
        return
      }
      setInfo(t('phoneAuth.verified') || 'Nummer verifiziert ✓')
      onVerified?.(data.phone || phone)
    } catch {
      setError(t('phoneAuth.connectionError') || 'Verbindungsfehler.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {step === 'phone' && (
        <>
          <input
            className="inp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+49 170 1234567"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendCode() }}
          />
          <button className="bgold" disabled={loading} onClick={sendCode}>
            {loading ? '…' : (t('phoneAuth.sendCode') || 'Code per SMS senden')}
          </button>
        </>
      )}
      {step === 'code' && (
        <>
          <p style={{ fontSize: 13, color: 'var(--stone)', textAlign: 'center', margin: 0 }}>
            {t('phoneAuth.codeSentTo') || 'Code an'} <strong style={{ color: 'var(--gold2)' }}>{phone}</strong>
          </p>
          <input
            className="inp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter') verifyCode() }}
            style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: 18 }}
          />
          <button className="bgold" disabled={loading || code.length !== 6} onClick={verifyCode}>
            {loading ? '…' : (verifyLabel || t('phoneAuth.verify') || 'Code bestätigen')}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <button
              type="button"
              onClick={() => { setStep('phone'); setCode(''); setError(''); setInfo('') }}
              style={{ background: 'none', border: 'none', color: 'var(--stone)', textDecoration: 'underline', cursor: 'pointer' }}
            >
              ← {t('common.back') || 'Zurück'}
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || loading}
              onClick={sendCode}
              style={{ background: 'none', border: 'none', color: resendIn > 0 ? 'var(--stone2)' : 'var(--gold2)', textDecoration: 'underline', cursor: resendIn > 0 ? 'not-allowed' : 'pointer' }}
            >
              {resendIn > 0
                ? `${t('phoneAuth.resendIn') || 'Neuer Code in'} ${resendIn}s`
                : (t('phoneAuth.resend') || 'Neuen Code anfordern')}
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" style={{ fontSize: 12, color: 'var(--red)', margin: 0 }}>{error}</p>
      )}
      {info && !error && (
        <p style={{ fontSize: 12, color: 'var(--green)', margin: 0 }}>{info}</p>
      )}
    </div>
  )
}
