'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface Slide {
  id: string
  title: string
  subtitle: string
  icon: string | null
  imageUrl: string | null
}

interface Props {
  slides: Slide[]
  children: React.ReactNode
}

export default function OnboardingGate({ slides, children }: Props) {
  const { data: session } = useSession()
  const [step, setStep] = useState(0) // 0..slides.length = slides, slides.length = role select
  const [done, setDone] = useState<boolean | null>(null)

  useEffect(() => {
    if (session) {
      setDone(true)
      return
    }
    const v = sessionStorage.getItem('cm_onboarded')
    setDone(v === '1')
  }, [session])

  if (done === null) return null // hydration guard
  if (done) return <>{children}</>

  const isRoleSelect = step >= slides.length

  function nextSlide() {
    if (step < slides.length) {
      setStep(step + 1)
    }
  }

  function selectRole(role: string) {
    sessionStorage.setItem('cm_onboarded', '1')
    sessionStorage.setItem('cm_role', role)
    setDone(true)
  }

  if (isRoleSelect) {
    return (
      <div className="shell" style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg)' }}>
        <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '60px 26px 40px' }}>
          {/* Logo */}
          <div style={{ marginBottom: 20, animation: 'logoFloat 3s ease-in-out infinite, logoGlow 3s ease-in-out infinite', display: 'inline-block' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo_lockup_512x384.png" alt="ChairMatch" style={{ height: 140, objectFit: 'contain' }} />
          </div>

          <p className="cinzel" style={{ fontSize: 20, fontWeight: 600, textAlign: 'center', marginBottom: 20, color: 'var(--gold2)' }}>
            Ich bin...
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            {[
              ['Kunde — ich suche Termine', 'CUSTOMER'],
              ['Anbieter — ich biete Services', 'PROVIDER'],
              ['B2B — Stuhl / Kabine mieten', 'B2B'],
            ].map(([label, role]) => (
              <button
                key={role}
                className="boutline"
                style={{ padding: 17, fontSize: 14, fontWeight: 700, textAlign: 'left' }}
                onClick={() => selectRole(role)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const slide = slides[step] || { title: 'Willkommen', subtitle: '', icon: null, imageUrl: null }
  const isFirst = step === 0
  const isLast = step === slides.length - 1

  return (
    <div className="shell" style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg)' }}>
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '100vh', padding: 30 }}>
        {isFirst ? (
          <div style={{ marginBottom: 10, animation: 'logoFloat 3s ease-in-out infinite, logoGlow 3s ease-in-out infinite', display: 'inline-block' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo_lockup_512x384.png" alt="ChairMatch" style={{ height: 140, objectFit: 'contain' }} />
          </div>
        ) : slide.imageUrl ? (
          <div style={{ marginBottom: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.imageUrl} alt={slide.title} style={{ height: 100, objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{ fontSize: 60, marginBottom: 20 }}>{slide.icon || '✨'}</div>
        )}

        <p className="cinzel" style={{ fontSize: 22, fontWeight: 600, marginBottom: 10, lineHeight: 1.3, color: 'var(--gold2)' }}>
          {slide.title}
        </p>
        <p style={{ fontSize: 14, color: 'var(--stone)', lineHeight: 1.7, marginBottom: 44 }}>
          {slide.subtitle}
        </p>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 30 }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 22 : 8,
              height: 8,
              borderRadius: 4,
              background: i === step ? 'var(--gold)' : 'var(--c4)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        <button
          className="bgold"
          style={{ width: 'auto', padding: '15px 36px', fontSize: 14 }}
          onClick={nextSlide}
        >
          {isLast ? "Los geht's" : 'Weiter →'}
        </button>
      </div>
    </div>
  )
}
