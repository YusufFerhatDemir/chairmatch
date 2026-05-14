'use client'

/**
 * WelcomeSplitter — First-Time-User-Experience (FTUE).
 *
 * Pattern: 3-Card Audience-Splitter horizontal (Kunde / Anbieter / Business)
 * + Trust-Badges-Triangle + Escape-Hatch "Ohne Anmeldung entdecken".
 *
 * Trigger: localStorage `cm_welcome_seen` ist nicht gesetzt.
 * Sobald User wählt → Flag wird gesetzt → kommt nie wieder.
 *
 * **REVERT:** in `src/app/page.tsx` einfach `<WelcomeGate>` durch das
 * alte `<OnboardingGate slides={...}>` ersetzen. 1 Zeile = vorheriger Zustand.
 *
 * **TEST/RESET:** `?welcome=1` an die URL hängen oder `localStorage.removeItem('cm_welcome_seen')`
 * in der DevTools-Konsole — Splitter erscheint wieder.
 */

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  CalendarCheck, Briefcase, Armchair,
  ShieldCheck, BadgeCheck, Building2, Eye,
  type LucideIcon,
} from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'

const STORAGE_KEY = 'cm_welcome_seen'

interface AudienceCard {
  id: 'kunde' | 'anbieter' | 'business'
  icon: LucideIcon
  title: string
  subtitle: string
  href: string
}

const CARDS: AudienceCard[] = [
  {
    id: 'kunde',
    icon: CalendarCheck,
    title: 'Kunde',
    subtitle: 'Ich suche Termine',
    href: '/explore',
  },
  {
    id: 'anbieter',
    icon: Briefcase,
    title: 'Anbieter',
    subtitle: 'Ich biete Services',
    href: '/anbieter/wie-es-funktioniert',
  },
  {
    id: 'business',
    icon: Armchair,
    title: 'Business',
    subtitle: 'Ich möchte Stuhl oder Kabine mieten',
    href: '/mieter/wie-es-funktioniert',
  },
]

interface TrustBadge {
  icon: LucideIcon
  title: string
  subtitle: string
}

const TRUST: TrustBadge[] = [
  { icon: ShieldCheck, title: 'Sichere', subtitle: 'Buchung' },
  { icon: BadgeCheck, title: 'Geprüfte', subtitle: 'Anbieter' },
  { icon: Building2, title: 'Flexible', subtitle: 'Vermietung' },
]

interface Props {
  children: React.ReactNode
}

/**
 * Wrapper mit Suspense — useSearchParams MUSS in Suspense gewrappt sein
 * in Next.js 15, sonst failt der Static-Pre-Render-Build.
 */
export function WelcomeGate({ children }: Props) {
  return (
    <Suspense fallback={<>{children}</>}>
      <WelcomeGateInner>{children}</WelcomeGateInner>
    </Suspense>
  )
}

function WelcomeGateInner({ children }: Props) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [seen, setSeen] = useState<boolean | null>(null)

  useEffect(() => {
    // Force-Show via ?welcome=1 URL-Param (für Testing/QA)
    if (searchParams.get('welcome') === '1') {
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* SSR */ }
      setSeen(false)
      return
    }
    try {
      const flag = localStorage.getItem(STORAGE_KEY)
      setSeen(flag === '1')
    } catch {
      // SSR / Privacy-Mode: Splitter zeigen
      setSeen(false)
    }
  }, [searchParams])

  function dismiss(role?: AudienceCard['id'], navigateTo?: string) {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
      if (role) localStorage.setItem('cm_role', role)
    } catch { /* ignore */ }
    setSeen(true)
    if (navigateTo) router.push(navigateTo as never)
  }

  // 1. Loading-Zustand → Children rendern (kein Flash)
  if (seen === null) return <>{children}</>

  // 2. Bereits gesehen ODER eingeloggter User → direkt Home
  if (seen || (status === 'authenticated' && session?.user)) {
    return <>{children}</>
  }

  // 3. FTUE — Splitter zeigen
  return (
    <div
      role="dialog"
      aria-label="Willkommen bei ChairMatch"
      style={{
        minHeight: '100vh',
        background: 'var(--c1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--pad)',
      }}
    >
      <div style={{ maxWidth: 480, width: '100%' }}>

        {/* Logo + Brand */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <BrandLogo size={64} variant="glow" animateStar={true} priority={true} />
          <p className="cinzel text-gold-metallic" style={{
            fontSize: 22, fontWeight: 700, letterSpacing: 4,
            margin: '12px 0 4px',
          }}>
            CHAIRMATCH
          </p>
          <p style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1, margin: 0 }}>
            BEAUTY · HEALTH · WORKSPACE
          </p>
        </div>

        {/* Tagline */}
        <p style={{
          textAlign: 'center', color: 'var(--cream)',
          fontSize: 14, lineHeight: 1.6, marginBottom: 28,
          padding: '0 8px',
        }}>
          Die Plattform für Termine, Premium-Behandlungen<br />
          und die Vermietung von Stühlen &amp; Kabinen.
        </p>

        {/* Section-Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 14,
          marginBottom: 18,
        }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--gold))' }} />
          <span className="cinzel" style={{
            fontSize: 16, fontWeight: 600, color: 'var(--gold2)',
            letterSpacing: 2,
          }}>
            Ich bin …
          </span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--gold), transparent)' }} />
        </div>

        {/* 3-Card-Grid (horizontal auf Tablet+, vertikal auf Mobile <360px) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 16,
        }}>
          {CARDS.map((card) => (
            <AudienceCardButton
              key={card.id}
              card={card}
              onClick={() => dismiss(card.id, card.href)}
            />
          ))}
        </div>

        {/* Escape-Hatch */}
        <button
          onClick={() => dismiss(undefined, '/')}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8,
            padding: '12px 16px',
            background: 'transparent',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: 12,
            color: 'var(--cream)',
            fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 22,
          }}
        >
          <Eye size={16} color="var(--gold)" strokeWidth={2} />
          <span>Ohne Anmeldung entdecken</span>
          <span style={{ color: 'var(--gold)' }}>›</span>
        </button>

        {/* Trust-Badges-Triangle */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 0,
          paddingTop: 14,
          borderTop: '1px solid var(--border)',
        }}>
          {TRUST.map((badge, idx) => {
            const Icon = badge.icon
            return (
              <div
                key={badge.title}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', textAlign: 'center',
                  padding: '0 4px',
                  borderLeft: idx > 0 ? '1px solid var(--border)' : 'none',
                }}
              >
                <Icon size={26} color="var(--gold)" strokeWidth={1.7} />
                <p style={{
                  fontSize: 11, color: 'var(--cream)', fontWeight: 700,
                  margin: '8px 0 0', lineHeight: 1.2,
                }}>
                  {badge.title}
                </p>
                <p style={{
                  fontSize: 10, color: 'var(--stone)', fontWeight: 500,
                  margin: '2px 0 0', lineHeight: 1.2,
                }}>
                  {badge.subtitle}
                </p>
              </div>
            )
          })}
        </div>

        {/* Login-Fallback */}
        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <Link
            href={"/auth" as never}
            style={{
              fontSize: 12, color: 'var(--stone)',
              textDecoration: 'none',
            }}
          >
            Schon ein Konto? <span style={{ color: 'var(--gold)', fontWeight: 600 }}>Anmelden</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

function AudienceCardButton({
  card,
  onClick,
}: {
  card: AudienceCard
  onClick: () => void
}) {
  const Icon = card.icon
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-between',
        gap: 8,
        padding: '18px 8px 14px',
        background: 'var(--c2)',
        border: '1px solid rgba(212, 175, 55, 0.25)',
        borderRadius: 14,
        cursor: 'pointer',
        fontFamily: 'inherit',
        minHeight: 180,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gold)'
        ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(212, 175, 55, 0.06)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(212, 175, 55, 0.25)'
        ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--c2)'
      }}
      aria-label={`${card.title}: ${card.subtitle}`}
    >
      <Icon size={32} color="var(--gold)" strokeWidth={1.6} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p className="cinzel" style={{
          fontSize: 14, fontWeight: 700, color: 'var(--gold2)',
          margin: '0 0 4px', lineHeight: 1.2,
        }}>
          {card.title}
        </p>
        <p style={{
          fontSize: 10, color: 'var(--stone)', fontWeight: 500,
          margin: 0, lineHeight: 1.3,
        }}>
          {card.subtitle}
        </p>
      </div>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        border: '1px solid var(--gold)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--gold)',
        fontSize: 13,
        lineHeight: 1,
      }}>
        ›
      </div>
    </button>
  )
}
