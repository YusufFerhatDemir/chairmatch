// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { decideAuthAccess } from '@/middleware'

/**
 * decideAuthAccess — die RBAC-Kette der Middleware (Session → Passwort-Zwang
 * → Rollen-Praefixe), direkt pruefbar ohne NextRequest/NextAuth-Mock.
 *
 * Bis jetzt lief dieser Pfad nur indirekt mit: `isPublicPath` und die reinen
 * rbac.ts-Funktionen hatten eigene Tests, aber die Verdrahtung selbst — dass
 * eine fehlende Session auf API-Routen 401 statt Redirect gibt, dass der
 * Passwort-Zwang vor der Rollenpruefung greift, dass /owner auch PROVIDER
 * durchlaesst — stand nirgends unter Test. Genau diese Verdrahtung war es,
 * die bei den Admin-API-Praefixen bis 2026-08-27 gefehlt hat (s. Kommentar
 * bei providerPaths in middleware.ts).
 */

describe('decideAuthAccess — oeffentliche Pfade', () => {
  it('laesst oeffentliche Pfade immer durch, auch ohne Session', () => {
    expect(decideAuthAccess({ pathname: '/', session: null })).toEqual({ kind: 'pass' })
    expect(decideAuthAccess({ pathname: '/salon/foo', session: null })).toEqual({ kind: 'pass' })
  })

  it('laesst oeffentliche Pfade durch, auch mit Session und egal welcher Rolle', () => {
    expect(
      decideAuthAccess({ pathname: '/explore', session: { role: 'kunde' } }),
    ).toEqual({ kind: 'pass' })
  })
})

describe('decideAuthAccess — ohne Session', () => {
  it('gibt API-Routen 401 statt Redirect', () => {
    expect(
      decideAuthAccess({ pathname: '/api/account/export', session: null }),
    ).toEqual({ kind: 'unauthorized' })
  })

  it('schickt echte geschuetzte Seiten-Bereiche auf die Login-Wall', () => {
    for (const p of ['/account', '/booking', '/favorites', '/provider', '/owner', '/investor', '/admin']) {
      expect(decideAuthAccess({ pathname: p, session: null }), p).toEqual({ kind: 'login_redirect' })
    }
  })

  it('schickt Unterpfade geschuetzter Bereiche ebenfalls auf die Login-Wall', () => {
    expect(
      decideAuthAccess({ pathname: '/admin/kpi', session: null }),
    ).toEqual({ kind: 'login_redirect' })
  })

  it('laesst unbekannte oder nicht gelistete Seiten-Pfade durch (SEO-Fix, kein Default-Deny)', () => {
    expect(decideAuthAccess({ pathname: '/ads', session: null })).toEqual({ kind: 'pass' })
    expect(decideAuthAccess({ pathname: '/karte', session: null })).toEqual({ kind: 'pass' })
  })
})

describe('decideAuthAccess — erzwungener Passwortwechsel', () => {
  const mustChange = { role: 'anbieter', passwordMustChange: true }

  it('blockiert API-Routen mit 403 PW_MUST_CHANGE', () => {
    expect(
      decideAuthAccess({ pathname: '/api/provider/bookings', session: mustChange }),
    ).toEqual({ kind: 'password_change_required' })
  })

  it('schickt Seiten-Routen auf /auth/change-password', () => {
    expect(
      decideAuthAccess({ pathname: '/provider', session: mustChange }),
    ).toEqual({ kind: 'password_change_redirect' })
  })

  it('laesst /auth/change-password selbst durch, trotz Zwang', () => {
    expect(
      decideAuthAccess({ pathname: '/auth/change-password', session: mustChange }),
    ).toEqual({ kind: 'pass' })
  })

  it('laesst /api/auth/* durch, trotz Zwang (NextAuth braucht das Callback)', () => {
    expect(
      decideAuthAccess({ pathname: '/api/auth/session', session: mustChange }),
    ).toEqual({ kind: 'pass' })
  })

  it('greift vor der Rollenpruefung — auch bei fehlender Berechtigung zuerst der Passwort-Redirect', () => {
    const customerMustChange = { role: 'kunde', passwordMustChange: true }
    expect(
      decideAuthAccess({ pathname: '/admin', session: customerMustChange }),
    ).toEqual({ kind: 'password_change_redirect' })
  })
})

describe('decideAuthAccess — RBAC pro Rollen-Praefix', () => {
  it('/provider verlangt PROVIDER oder hoeher', () => {
    expect(decideAuthAccess({ pathname: '/provider', session: { role: 'kunde' } })).toEqual({ kind: 'forbidden' })
    expect(decideAuthAccess({ pathname: '/provider', session: { role: 'anbieter' } })).toEqual({ kind: 'pass' })
    expect(decideAuthAccess({ pathname: '/provider', session: { role: 'admin' } })).toEqual({ kind: 'pass' })
  })

  it('/api/provider ist genauso geschuetzt wie /provider', () => {
    expect(
      decideAuthAccess({ pathname: '/api/provider/kpi', session: { role: 'kunde' } }),
    ).toEqual({ kind: 'forbidden' })
    expect(
      decideAuthAccess({ pathname: '/api/provider/kpi', session: { role: 'anbieter' } }),
    ).toEqual({ kind: 'pass' })
  })

  it('/owner laesst BUSINESS_OWNER UND PROVIDER durch, aber nicht CUSTOMER', () => {
    expect(decideAuthAccess({ pathname: '/owner', session: { role: 'kunde' } })).toEqual({ kind: 'forbidden' })
    expect(decideAuthAccess({ pathname: '/owner', session: { role: 'anbieter' } })).toEqual({ kind: 'pass' })
    expect(decideAuthAccess({ pathname: '/owner', session: { role: 'b2b' } })).toEqual({ kind: 'pass' })
    expect(decideAuthAccess({ pathname: '/owner', session: { role: 'admin' } })).toEqual({ kind: 'pass' })
  })

  it('/investor liegt neben der Leiter — nur INVESTOR, ADMIN, SUPER_ADMIN', () => {
    expect(decideAuthAccess({ pathname: '/investor', session: { role: 'kunde' } })).toEqual({ kind: 'forbidden' })
    // PROVIDER und BUSINESS_OWNER stehen auf der Leiter UNTER ADMIN — trotzdem
    // kein Zugriff, weil INVESTOR neben der Leiter liegt (s. rbac.ts).
    expect(decideAuthAccess({ pathname: '/investor', session: { role: 'anbieter' } })).toEqual({ kind: 'forbidden' })
    expect(decideAuthAccess({ pathname: '/investor', session: { role: 'b2b' } })).toEqual({ kind: 'forbidden' })
    expect(decideAuthAccess({ pathname: '/investor', session: { role: 'investor' } })).toEqual({ kind: 'pass' })
    expect(decideAuthAccess({ pathname: '/investor', session: { role: 'admin' } })).toEqual({ kind: 'pass' })
  })

  it('/admin verlangt ADMIN oder SUPER_ADMIN', () => {
    expect(decideAuthAccess({ pathname: '/admin', session: { role: 'b2b' } })).toEqual({ kind: 'forbidden' })
    expect(decideAuthAccess({ pathname: '/admin', session: { role: 'investor' } })).toEqual({ kind: 'forbidden' })
    expect(decideAuthAccess({ pathname: '/admin', session: { role: 'admin' } })).toEqual({ kind: 'pass' })
    expect(decideAuthAccess({ pathname: '/admin', session: { role: 'super_admin' } })).toEqual({ kind: 'pass' })
  })

  it('/api/admin ist genauso geschuetzt wie /admin — die 2026-08-27-Luecke bleibt zu', () => {
    expect(
      decideAuthAccess({ pathname: '/api/admin/kpi', session: { role: 'kunde' } }),
    ).toEqual({ kind: 'forbidden' })
    expect(
      decideAuthAccess({ pathname: '/api/admin/kpi', session: { role: 'admin' } }),
    ).toEqual({ kind: 'pass' })
  })

  it('gibt bei API-Verstoessen 403 ueber `forbidden`, unabhaengig von der Antwortform (die entscheidet route())', () => {
    // decideAuthAccess unterscheidet API/Seite bewusst nicht mehr im `forbidden`-Fall —
    // das JSON-vs-Redirect wird in middleware.ts anhand von pathname.startsWith('/api/') gebaut.
    expect(
      decideAuthAccess({ pathname: '/api/investor/kpi', session: { role: 'kunde' } }),
    ).toEqual({ kind: 'forbidden' })
  })

  it('Bereiche ohne Rollen-Praefix (authOnlyPaths) verlangen nur eine Session, keine Rolle', () => {
    expect(decideAuthAccess({ pathname: '/account', session: { role: 'kunde' } })).toEqual({ kind: 'pass' })
    expect(decideAuthAccess({ pathname: '/booking', session: { role: 'kunde' } })).toEqual({ kind: 'pass' })
  })
})
