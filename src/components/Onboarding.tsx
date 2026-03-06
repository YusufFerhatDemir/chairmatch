import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { t } from '@/i18n'

const ONBOARDING_KEY = 'chairmatch_onboarded'

export function useOnboarding() {
  const [done, setDone] = useState(() => {
    try { return localStorage.getItem(ONBOARDING_KEY) === '1' } catch { return false }
  })

  const finish = () => {
    try { localStorage.setItem(ONBOARDING_KEY, '1') } catch { /* noop */ }
    setDone(true)
  }

  return { done, finish }
}

/* ═══ SLIDES ═══ */

const slides = [
  {
    icon: '/icons/logo_lockup_512x384.png',
    titleKey: 'ob_welcome' as const,
    subKey: 'ob_welcome_sub' as const,
  },
  {
    icon: '/icons/11_termin_256x384.png',
    titleKey: 'ob_book' as const,
    subKey: 'ob_book_sub' as const,
  },
  {
    icon: '/icons/12_stuhlvermietung_512x384.png',
    titleKey: 'ob_discover' as const,
    subKey: 'ob_discover_sub' as const,
  },
]

/* ═══ STYLES ═══ */

const s = {
  wrap: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    padding: '40px 24px',
    textAlign: 'center' as const,
  },
  logo: { marginBottom: 32 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: {
    fontFamily: "'Cinzel Decorative', serif",
    fontSize: 24,
    fontWeight: 700 as const,
    color: 'var(--gold)',
    letterSpacing: 3,
    marginBottom: 12,
  },
  sub: {
    fontSize: 15,
    color: 'var(--stone)',
    maxWidth: 320,
    lineHeight: 1.5,
    marginBottom: 32,
  },
  dots: {
    display: 'flex',
    gap: 8,
    marginBottom: 32,
  },
  dot: (active: boolean) => ({
    width: active ? 24 : 8,
    height: 8,
    borderRadius: 4,
    background: active ? 'var(--gold)' : 'var(--c3)',
    transition: 'all 0.3s ease',
  }),
  btn: {
    width: '100%',
    maxWidth: 320,
    padding: '16px 32px',
    borderRadius: 16,
    background: 'linear-gradient(135deg, var(--gold), var(--gold2))',
    color: '#000',
    fontSize: 17,
    fontWeight: 700 as const,
    cursor: 'pointer',
    border: 'none',
    marginBottom: 16,
  },
  loginBtn: {
    color: 'var(--gold)',
    fontSize: 14,
    fontWeight: 600 as const,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: '8px 16px',
    marginBottom: 8,
  },
  skipBtn: {
    color: 'var(--stone)',
    fontSize: 13,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: '8px 16px',
  },
}

/* ═══ COMPONENT ═══ */

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const slide = slides[step]
  const isLast = step === slides.length - 1

  const handleNext = () => {
    if (isLast) {
      onFinish()
    } else {
      setStep(step + 1)
    }
  }

  const handleLogin = () => {
    onFinish()
    navigate('/auth')
  }

  return (
    <div style={s.wrap}>
      <div style={s.logo}>
        <Logo size={80} />
      </div>

      <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 20, letterSpacing: 4, color: 'var(--cream)', marginBottom: 4 }}>
        CHAIRMATCH
      </div>
      <div style={{ fontSize: 11, letterSpacing: 6, color: 'var(--stone)', marginBottom: 28 }}>
        DEUTSCHLAND
      </div>

      <div style={s.title}>{t(slide.titleKey)}</div>
      <div style={s.sub}>{t(slide.subKey)}</div>

      {/* Dots */}
      <div style={s.dots}>
        {slides.map((_, i) => (
          <div key={i} style={s.dot(i === step)} />
        ))}
      </div>

      {/* Main button */}
      <button style={s.btn} onClick={handleNext}>
        {isLast ? t('ob_start') : t('next')}
      </button>

      {/* Login button - always visible */}
      <button style={s.loginBtn} onClick={handleLogin}>
        {t('ob_login')}
      </button>

      {/* Skip - only on non-last slides */}
      {!isLast && (
        <button style={s.skipBtn} onClick={onFinish}>
          {t('ob_skip')}
        </button>
      )}
    </div>
  )
}
