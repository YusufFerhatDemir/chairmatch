'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'

/**
 * Bezahl-Seite — /salon/[slug]/buchen/zahlen
 *
 * Schritt 3/3 im Buchen-Flow. Erhält Service/Datum/Slot/Preis via URL-Query.
 *
 * PHASE 1 (heute live): UI komplett. Bezahl-Button zeigt eleganten Toast
 *   „Bezahlung wird gerade angeschlossen", speichert Buchung in localStorage
 *   und leitet weiter zu /salon/[slug]?booked=1.
 *
 * PHASE 2 (später, wenn Stripe + Resend live): echte Stripe-Session,
 *   echte Email-Bestätigung via Resend.
 *
 * Layout: 1:1 nach SLIDE_bezahlung_v4.html — dunkler ChairMatch-Brand mit
 *   echtem Pin-Logo + Cinzel-Gold-Headlines + Wallet/Card-Buttons mit echten
 *   Marken-Logos (Apple/Google/Visa/MC/Amex/PayPal/Klarna/SEPA).
 */

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

type PayMethod = 'card' | 'sepa' | 'klarna' | 'paypal'

export default function ZahlenPageWrapper() {
  return (
    <Suspense fallback={<div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--stone)' }}>…</div>}>
      <ZahlenPage />
    </Suspense>
  )
}

function ZahlenPage() {
  const router = useRouter()
  const params = useParams()
  const search = useSearchParams()
  const slug = (params?.slug as string) || ''

  const serviceName = search.get('service') || 'Damenschnitt + Föhnen'
  const priceCents = parseInt(search.get('price') || '4500', 10)
  const priceEuro = (priceCents / 100).toFixed(2).replace('.', ',')
  const yearStr = search.get('y')
  const monthStr = search.get('m')
  const dayStr = search.get('d')
  const timeSlot = search.get('t') || '14:30'
  const dateLabel = (yearStr && monthStr && dayStr)
    ? `${dayStr}. ${MONTHS[parseInt(monthStr, 10)]} · ${timeSlot}`
    : `${timeSlot}`

  const [pm, setPm] = useState<PayMethod>('card')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Form state (Karte)
  const [cardNum, setCardNum] = useState('')
  const [cardExp, setCardExp] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [cardHolder, setCardHolder] = useState('')

  function handlePay() {
    setSubmitting(true)
    // PHASE 1: Demo-Toast + Buchung speichern
    setToast('Bezahlung wird gerade angeschlossen — wir melden uns sobald aktiv. Buchung wurde trotzdem gespeichert.')
    setTimeout(() => {
      try {
        const booking = {
          slug,
          service: { name: serviceName, price: priceCents / 100 },
          date: yearStr && monthStr && dayStr
            ? { y: parseInt(yearStr, 10), m: parseInt(monthStr, 10), d: parseInt(dayStr, 10) }
            : null,
          timeSlot,
          paymentMethod: pm,
          bookedAt: new Date().toISOString(),
          status: 'confirmed',
        }
        const existing = JSON.parse(localStorage.getItem('cm_bookings') || '[]')
        existing.unshift(booking)
        localStorage.setItem('cm_bookings', JSON.stringify(existing.slice(0, 20)))
      } catch { /* ignore */ }
      router.push(`/salon/${slug}?booked=1` as never)
    }, 1500)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--c1)',
      display: 'flex', justifyContent: 'center',
      padding: '30px 12px 50px',
    }}>
      <div style={{
        width: '100%', maxWidth: 430,
        background: 'var(--c1)',
        borderRadius: 36, overflow: 'hidden',
        boxShadow: '0 40px 100px rgba(0,0,0,0.65), inset 0 1px 0 rgba(196,168,106,0.1)',
        border: '1px solid rgba(196,168,106,0.18)',
      }}>
        <div style={{
          margin: 18, background: 'var(--c2)', borderRadius: 24,
          padding: '22px 18px', border: '0.5px solid rgba(196,168,106,0.18)',
        }}>

          {/* Top: Back + Schritt-Indikator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <button
              onClick={() => router.back()}
              aria-label="Zurück"
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: 'var(--cream)', fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >‹</button>
            <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(196,168,106,0.7)', fontWeight: 600 }}>
              SCHRITT 3 / 3
            </div>
            <div style={{ width: 32 }} />
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 22 }}>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'linear-gradient(90deg,#BF953F,#FCF6BA)' }} />
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'linear-gradient(90deg,#BF953F,#FCF6BA)' }} />
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'linear-gradient(90deg,#BF953F,#FCF6BA)' }} />
          </div>

          {/* Title block — Pin + Cinzel-Gold */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ marginBottom: 8, filter: 'drop-shadow(0 0 16px rgba(212,175,55,0.45))' }}>
              <BrandLogo size={78} variant="glow" animateStar={false} priority={false} />
            </div>
            <h1 className="cinzel text-gold-metallic" style={{
              fontSize: 22, fontWeight: 500, letterSpacing: '1px', margin: '0 0 6px',
            }}>Bezahlen</h1>
            <p style={{ fontSize: 11.5, color: 'var(--stone)', lineHeight: 1.5, margin: 0 }}>
              Sicher · Verschlüsselt · Kostenlose Stornierung 24h vorher
            </p>
          </div>

          {/* Summary */}
          <div style={{
            background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.18)',
            borderRadius: 14, padding: '12px 14px', marginBottom: 14,
          }}>
            <SumRow label="Salon" val="Salon Anna · Premium" />
            <SumRow label="Service" val={serviceName} />
            <SumRow label="Datum · Uhrzeit" val={dateLabel} />
            <div style={{ borderTop: '1px solid rgba(196,168,106,0.18)', marginTop: 6, paddingTop: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
              <span style={{ color: 'var(--stone)' }}>Gesamt</span>
              <span className="text-gold-metallic" style={{ fontSize: 16, fontWeight: 700 }}>{priceEuro} €</span>
            </div>
          </div>

          {/* Wallet Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <button
              onClick={handlePay}
              disabled={submitting}
              style={{
                height: 44, borderRadius: 10, background: '#000', color: '#fff',
                border: '1px solid rgba(255,255,255,0.08)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: submitting ? 'wait' : 'pointer',
                fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
              }}
            >
              <svg viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg" style={{ width: 18, height: 22, fill: '#fff' }}>
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
              </svg>
              <span>Pay</span>
            </button>
            <button
              onClick={handlePay}
              disabled={submitting}
              style={{
                height: 44, borderRadius: 10, background: '#fff', color: '#3C4043',
                border: 'none', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 5,
                cursor: submitting ? 'wait' : 'pointer',
                fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 256 262">
                <path fill="#4285F4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.243 1.622 38.737 30.023 2.684.268c24.659-22.774 38.893-56.282 38.893-96.027" />
                <path fill="#34A853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" />
                <path fill="#FBBC05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" />
                <path fill="#EB4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" />
              </svg>
              <span>Pay</span>
            </button>
          </div>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            margin: '12px 0', color: 'rgba(245,245,247,0.45)',
            fontSize: 10, letterSpacing: 1.5,
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(196,168,106,0.18)' }} />
            ODER MIT KARTE / DIENST
            <div style={{ flex: 1, height: 1, background: 'rgba(196,168,106,0.18)' }} />
          </div>

          {/* Pay-Methods Grid 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            <PmCard selected={pm === 'card'} onClick={() => setPm('card')} label="Kredit / Debit">
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ height: 11, background: '#1A1F71', color: '#fff', fontStyle: 'italic', fontWeight: 900, fontSize: 9, letterSpacing: 0.5, padding: '1px 4px', borderRadius: 2, display: 'flex', alignItems: 'center', fontFamily: 'Arial' }}>VISA</span>
                <McLogo />
                <span style={{ height: 11, background: '#006FCF', color: '#fff', fontWeight: 900, fontSize: 7, letterSpacing: 0.3, padding: '1px 3px', borderRadius: 1, display: 'flex', alignItems: 'center', fontFamily: 'Arial' }}>AMEX</span>
              </div>
            </PmCard>
            <PmCard selected={pm === 'sepa'} onClick={() => setPm('sepa')} label="Lastschrift">
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 13, height: 13, borderRadius: '50%', background: '#10298E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFCC00', fontSize: 8 }}>★</span>
                <span style={{ color: '#10298E', fontWeight: 800, fontSize: 10, letterSpacing: 0.2 }}>SEPA</span>
              </div>
            </PmCard>
            <PmCard selected={pm === 'klarna'} onClick={() => setPm('klarna')} label="Rate · später">
              <span style={{ background: '#FFA8CD', color: '#0F0F0F', fontWeight: 700, fontSize: 10, padding: '2px 7px', borderRadius: 4 }}>Klarna.</span>
            </PmCard>
            <PmCard selected={pm === 'paypal'} onClick={() => setPm('paypal')} label="PayPal">
              <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: -0.4, fontFamily: 'Arial', display: 'flex' }}>
                <span style={{ color: '#003087' }}>Pay</span>
                <span style={{ color: '#0070BA' }}>Pal</span>
              </span>
            </PmCard>
          </div>

          {/* Form (nur sichtbar für Karte) */}
          {pm === 'card' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              <input
                value={cardNum} onChange={e => setCardNum(e.target.value)}
                placeholder="Karten-Nr.  ••••  ••••  ••••  ••••"
                style={inpStyle}
                inputMode="numeric"
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input value={cardExp} onChange={e => setCardExp(e.target.value)} placeholder="MM / JJ" style={inpStyle} inputMode="numeric" />
                <input value={cardCvc} onChange={e => setCardCvc(e.target.value)} placeholder="CVC" style={inpStyle} inputMode="numeric" />
              </div>
              <input value={cardHolder} onChange={e => setCardHolder(e.target.value)} placeholder="Inhaber des Kontos" style={inpStyle} />
            </div>
          )}

          {/* Phase 1 Demo-Note */}
          <div style={{
            background: 'rgba(229,181,58,0.08)', border: '1px solid rgba(229,181,58,0.30)',
            borderRadius: 10, padding: '8px 10px', marginBottom: 10,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', background: '#E5B53A',
              marginTop: 5, flexShrink: 0, boxShadow: '0 0 6px rgba(229,181,58,0.6)',
            }} />
            <p style={{ fontSize: 10.5, color: 'var(--cream)', lineHeight: 1.45, margin: 0 }}>
              <b style={{ color: '#E5B53A' }}>Phase 1 — heute live:</b> Bezahlung wird gerade angeschlossen. Deine Buchung wird trotzdem reserviert. Echte Zahlung folgt sobald Stripe aktiv ist.
            </p>
          </div>

          {/* Pay-Button */}
          <button
            onClick={handlePay}
            disabled={submitting}
            style={{
              width: '100%', padding: 14, borderRadius: 14,
              background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
              color: '#1a1000', border: 'none', cursor: submitting ? 'wait' : 'pointer',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
              boxShadow: '0 0 20px rgba(196,168,106,0.25)',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Wird verarbeitet…' : `${priceEuro} € zahlen 🔒`}
          </button>

          <div style={{ textAlign: 'center', fontSize: 9.5, color: 'rgba(245,245,247,0.45)', marginTop: 10, letterSpacing: 0.5 }}>
            Powered by stripe · SSL · PCI DSS
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          maxWidth: 400, width: 'calc(100% - 32px)', zIndex: 1000,
          background: 'linear-gradient(145deg, rgba(196,168,106,0.18), rgba(26,26,31,0.95))',
          border: '1px solid rgba(196,168,106,0.4)', borderRadius: 14,
          padding: '14px 18px', color: 'var(--cream)', fontSize: 12.5,
          lineHeight: 1.5, boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function SumRow({ label, val }: { label: string; val: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 11.5 }}>
      <span style={{ color: 'var(--stone)' }}>{label}</span>
      <span style={{ color: 'var(--cream)', fontWeight: 600 }}>{val}</span>
    </div>
  )
}

function McLogo() {
  return (
    <span style={{ position: 'relative', width: 22, height: 14, display: 'inline-block' }}>
      <span style={{ position: 'absolute', top: 0, left: 0, width: 14, height: 14, borderRadius: '50%', background: '#EB001B' }} />
      <span style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: '#F79E1B', opacity: 0.92, mixBlendMode: 'multiply' }} />
    </span>
  )
}

function PmCard({ selected, onClick, label, children }: { selected: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: selected ? 'linear-gradient(145deg, rgba(191,149,63,0.10), var(--c1))' : 'var(--c1)',
        border: selected ? '1px solid var(--gold2)' : '0.5px solid rgba(196,168,106,0.18)',
        borderRadius: 12, padding: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', minHeight: 62, gap: 5,
        boxShadow: selected ? '0 0 14px rgba(191,149,63,0.12)' : 'none',
        fontFamily: 'inherit',
      }}
    >
      {children}
      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--cream)' }}>{label}</div>
    </button>
  )
}

const inpStyle: React.CSSProperties = {
  background: 'var(--c1)',
  border: '0.5px solid rgba(196,168,106,0.18)',
  borderRadius: 10,
  padding: '11px 12px',
  color: 'var(--cream)',
  fontFamily: 'inherit',
  fontSize: 12,
  outline: 'none',
}
