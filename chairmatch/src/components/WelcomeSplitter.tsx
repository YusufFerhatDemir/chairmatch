'use client'

/**
 * WelcomeSplitter — First-Time-User-Experience (FTUE) v11
 *
 * Layout v11 (2026-05-15):
 *   1. Pin-Logo XL + "CHAIRMATCH" + "DEUTSCHLAND" + Tagline
 *   2. Gold-CTA "Jetzt kostenlos registrieren" + Outline "Bereits Konto? Anmelden"
 *   3. "Ich bin …" Trennlinien-Sektion
 *   4. 2x2 Grid mit 4 Rollen: Kunde / Anbieter / Mieter / Vermieter (Pin-Logo 1:1 in jeder Karte)
 *   5. "Ohne Anmeldung entdecken" Outline-Button
 *   6. Trust-Section: Sichere Buchung · Geprüfte Anbieter · Flexible Vermietung
 *
 * Trigger: localStorage `cm_welcome_seen` ist nicht gesetzt.
 * Sobald User wählt → Flag wird gesetzt → kommt nie wieder.
 *
 * **TEST/RESET:** `?welcome=1` an die URL hängen oder `localStorage.removeItem('cm_welcome_seen')`
 * in der DevTools-Konsole — Splitter erscheint wieder.
 */

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ShieldCheck, BadgeCheck, Building2, Eye, Sparkles, User, ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'

const STORAGE_KEY = 'cm_welcome_seen'

interface RoleCard {
  id: 'kunde' | 'anbieter' | 'mieter' | 'vermieter'
  title: string
  subtitle: React.ReactNode
  href: string
}

const ROLES: RoleCard[] = [
  {
    id: 'kunde',
    title: 'Kunde',
    subtitle: <>Ich suche<br />Termine</>,
    href: '/explore',
  },
  {
    id: 'anbieter',
    title: 'Anbieter',
    subtitle: <>Ich biete<br />Services</>,
    href: '/anbieter/wie-es-funktioniert',
  },
  {
    id: 'mieter',
    title: 'Mieter',
    subtitle: <>Stuhl / Kabine<br />mieten</>,
    href: '/mieter/wie-es-funktioniert',
  },
  {
    id: 'vermieter',
    title: 'Vermieter',
    subtitle: <>Stuhl / Kabine<br />vermieten</>,
    href: '/vermieter/wie-es-funktioniert',
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
    if (searchParams.get('welcome') === '1') {
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* SSR */ }
      setSeen(false)
      return
    }
    try {
      const flag = localStorage.getItem(STORAGE_KEY)
      setSeen(flag === '1')
    } catch {
      setSeen(false)
    }
  }, [searchParams])

  function dismiss(role?: RoleCard['id'], navigateTo?: string) {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
      if (role) localStorage.setItem('cm_role', role)
    } catch { /* ignore */ }
    setSeen(true)
    if (navigateTo) router.push(navigateTo as never)
  }

  if (seen === null) return <>{children}</>
  if (seen || (status === 'authenticated' && session?.user)) {
    return <>{children}</>
  }

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
        justifyContent: 'flex-start',
        padding: '32px 20px 40px',
      }}
    >
      <div style={{ maxWidth: 520, width: '100%' }}>

        {/* Header — Pin-Logo + CHAIRMATCH + DEUTSCHLAND + Tagline */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <BrandLogo size={130} variant="glow" animateStar={true} priority={true} />
          <p className="cinzel text-gold-metallic" style={{
            fontSize: 34, fontWeight: 600, letterSpacing: '0.16em',
            margin: '16px 0 6px',
          }}>
            CHAIRMATCH
          </p>
          <p className="cinzel" style={{
            fontSize: 13, color: 'var(--stone)', letterSpacing: '0.45em',
            margin: '0 0 18px',
          }}>
            DEUTSCHLAND
          </p>
          <p style={{
            fontSize: 14, color: 'var(--cream)', lineHeight: 1.55,
            margin: 0, padding: '0 8px',
          }}>
            Die Plattform für Termine, Services und die Vermietung von Stühlen &amp; Kabinen.
          </p>
        </div>

        {/* Primary Gold CTA — Jetzt kostenlos registrieren */}
        <Link
          href={"/auth?mode=register" as never}
          onClick={() => { try { localStorage.setItem(STORAGE_KEY, '1') } catch {} }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, width: '100%',
            padding: '15px 22px',
            background: 'var(--gold-gradient)',
            color: '#1A1308',
            fontSize: 15, fontWeight: 600, letterSpacing: '0.02em',
            border: 'none', borderRadius: 12,
            textDecoration: 'none', cursor: 'pointer',
            marginBottom: 10,
            boxShadow: '0 6px 24px rgba(196,168,106,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          <Sparkles size={18} color="#1A1308" strokeWidth={2.2} />
          <span>Jetzt kostenlos registrieren</span>
          <ArrowRight size={18} color="#1A1308" strokeWidth={2.4} style={{ marginLeft: 'auto' }} />
        </Link>

        {/* Secondary Outline CTA — Bereits Konto? Anmelden */}
        <Link
          href={"/auth" as never}
          onClick={() => { try { localStorage.setItem(STORAGE_KEY, '1') } catch {} }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, width: '100%',
            padding: '13px 22px',
            background: 'transparent',
            color: 'var(--cream)',
            fontSize: 14, letterSpacing: '0.02em',
            border: '1px solid rgba(196,168,106,0.4)', borderRadius: 12,
            textDecoration: 'none', cursor: 'pointer',
            marginBottom: 28,
          }}
        >
          <User size={16} color="var(--gold)" strokeWidth={2} />
          <span>Bereits Konto? Anmelden</span>
        </Link>

        {/* Section Divider — Ich bin ... */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 14,
          marginBottom: 18,
        }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--gold2))' }} />
          <span className="cinzel" style={{
            fontSize: 15, color: 'var(--gold2)',
            letterSpacing: '0.28em', whiteSpace: 'nowrap',
          }}>
            Ich bin …
          </span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--gold2), transparent)' }} />
        </div>

        {/* 2x2 Grid — Kunde, Anbieter, Mieter, Vermieter */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 18,
        }}>
          {ROLES.map((role) => (
            <RoleCardButton
              key={role.id}
              role={role}
              onClick={() => dismiss(role.id, role.href)}
            />
          ))}
        </div>

        {/* Ohne Anmeldung entdecken */}
        <button
          onClick={() => dismiss(undefined, '/')}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 12,
            padding: '14px 20px',
            background: 'transparent',
            border: '1px solid rgba(196,168,106,0.45)',
            borderRadius: 14,
            color: 'var(--cream)',
            fontSize: 14, letterSpacing: '0.02em',
            cursor: 'pointer',
            fontFamily: 'inherit',
            marginBottom: 24,
          }}
        >
          <Eye size={18} color="var(--gold2)" strokeWidth={2} />
          <span>Ohne Anmeldung entdecken</span>
          <span style={{ color: 'var(--gold2)', fontSize: 14, marginLeft: 'auto' }}>›</span>
        </button>

        {/* Trust Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 0,
          paddingTop: 22,
          borderTop: '1px solid rgba(176,144,96,0.22)',
        }}>
          {TRUST.map((badge, idx) => {
            const Icon = badge.icon
            return (
              <div
                key={badge.title}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', textAlign: 'center',
                  padding: '0 6px',
                  position: 'relative',
                  borderLeft: idx > 0 ? '1px solid rgba(196,168,106,0.18)' : 'none',
                }}
              >
                <Icon
                  size={30}
                  color="var(--gold2)"
                  strokeWidth={1.7}
                  style={{ filter: 'drop-shadow(0 0 8px rgba(196,168,106,0.35))', marginBottom: 8 }}
                />
                <p style={{
                  fontSize: 13, color: 'var(--cream)', fontWeight: 500,
                  margin: '0 0 2px', lineHeight: 1.2,
                }}>
                  {badge.title}
                </p>
                <p style={{
                  fontSize: 12, color: 'var(--stone)',
                  margin: 0, lineHeight: 1.2,
                }}>
                  {badge.subtitle}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RoleCardButton({
  role,
  onClick,
}: {
  role: RoleCard
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-between',
        gap: 0,
        padding: '22px 16px 18px',
        background: 'var(--c2)',
        border: '1px solid rgba(176,144,96,0.22)',
        borderRadius: 14,
        cursor: 'pointer',
        fontFamily: 'inherit',
        minHeight: 200,
        transition: 'all .25s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(196,168,106,0.6)'
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(176,144,96,0.22)'
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
      }}
      aria-label={role.title}
    >
      {/* Pin-Logo 1:1 */}
      <div style={{ marginBottom: 14 }}>
        <BrandLogo size={58} variant="glow" animateStar={false} priority={false} />
      </div>
      {/* Rollen-Name in Cinzel Gold */}
      <p className="cinzel" style={{
        fontSize: 20, fontWeight: 500,
        color: 'var(--gold2)',
        margin: '0 0 10px', lineHeight: 1.2,
      }}>
        {role.title}
      </p>
      {/* Subtitle — 2 Zeilen */}
      <p style={{
        fontSize: 13, color: 'var(--cream)', lineHeight: 1.4,
        margin: '0 0 14px', minHeight: 34,
      }}>
        {role.subtitle}
      </p>
      {/* Pfeil-Button */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        border: '1px solid rgba(196,168,106,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--gold2)',
        fontSize: 14, lineHeight: 1,
      }}>
        ›
      </div>
    </button>
  )
}
