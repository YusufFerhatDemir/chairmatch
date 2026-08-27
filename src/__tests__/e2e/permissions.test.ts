// @vitest-environment node
/**
 * E2E: Berechtigungsgrenzen — Mieter vs. Salon-Inhaber vs. Admin.
 *
 * Wichtig zum Verständnis: ChairMatch greift serverseitig ausschließlich mit
 * `service_role` auf Supabase zu (siehe supabase-server.ts). service_role
 * umgeht RLS vollständig — die Datentrennung entsteht also NICHT in der
 * Datenbank, sondern in den Route-Handlern. Genau die werden hier geprüft.
 *
 * Der Browser-Client (Anon-Key, RLS greift) darf laut Migration
 * 20260819_rls_close_gaps_v2.sql nur lesen; der letzte Test hält das fest.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createDb, sessionFor, postRequest, rawRequest, ctx, IDS, BUSY_DAY } from './_harness/fixtures'
import type { FakeSupabase } from './_harness/fake-supabase'
import {
  toSpecRole,
  isCustomer,
  isProviderOrAbove,
  isBusinessOwnerOrAbove,
  isAdminOrAbove,
  isSuperAdmin,
  ROLES,
} from '@/lib/rbac'

const state = vi.hoisted(() => {
  process.env.AUTH_SECRET ??= 'test-secret-nur-fuer-vitest'
  return {
    db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
    session: null as import('./_harness/fixtures').TestSession | null,
  }
})

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  invalidateAccountState: () => {},
}))
vi.mock('@/modules/auth/auth.config', () => ({ auth: async () => state.session }))
vi.mock('@/lib/indexing', () => ({ notifyIndexers: vi.fn(async () => undefined) }))
vi.mock('@/lib/stripe', () => ({
  createConnectAccount: vi.fn(async () => ({ id: 'acct_test_neu' })),
  createConnectAccountLink: vi.fn(async () => ({ url: 'https://connect.stripe.com/setup/x' })),
}))

import { PATCH as adminRoute } from '@/app/api/admin/route'
import { PATCH as providerSalonRoute } from '@/app/api/provider/salon/route'
import { GET as getBookingRoute } from '@/app/api/bookings/[id]/route'
import { POST as connectRoute } from '@/app/api/stripe/connect/route'

function db(): FakeSupabase {
  return state.db
}

beforeEach(() => {
  state.db = createDb()
  state.session = sessionFor('customer')
})

// ────────────────────────────────────────────────────────────────
describe('Rollen-Hierarchie (lib/rbac)', () => {
  it('bildet die Alt-Rollen der Datenbank auf die Spec-Rollen ab', () => {
    expect(toSpecRole('kunde')).toBe(ROLES.CUSTOMER)
    expect(toSpecRole('anbieter')).toBe(ROLES.PROVIDER)
    expect(toSpecRole('b2b')).toBe(ROLES.BUSINESS_OWNER)
    expect(toSpecRole('super_admin')).toBe(ROLES.SUPER_ADMIN)
  })

  it('stuft unbekannte oder fehlende Rollen auf CUSTOMER herunter (fail-safe)', () => {
    expect(toSpecRole(null)).toBe(ROLES.CUSTOMER)
    expect(toSpecRole(undefined)).toBe(ROLES.CUSTOMER)
    expect(toSpecRole('root')).toBe(ROLES.CUSTOMER)
    expect(toSpecRole('')).toBe(ROLES.CUSTOMER)
  })

  it.each([
    ['kunde', { customer: true, provider: false, business: false, admin: false, superAdmin: false }],
    ['anbieter', { customer: false, provider: true, business: false, admin: false, superAdmin: false }],
    ['b2b', { customer: false, provider: true, business: true, admin: false, superAdmin: false }],
    ['admin', { customer: false, provider: true, business: true, admin: true, superAdmin: false }],
    ['super_admin', { customer: false, provider: true, business: true, admin: true, superAdmin: true }],
  ])('Rechte-Matrix für %s', (role, expected) => {
    expect(isCustomer(role)).toBe(expected.customer)
    expect(isProviderOrAbove(role)).toBe(expected.provider)
    expect(isBusinessOwnerOrAbove(role)).toBe(expected.business)
    expect(isAdminOrAbove(role)).toBe(expected.admin)
    expect(isSuperAdmin(role)).toBe(expected.superAdmin)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Salon-Inhaber vs. Mieter (PATCH /api/provider/salon)', () => {
  it('Inhaber ändert die Daten des eigenen Salons', async () => {
    state.session = sessionFor('owner')
    const res = await providerSalonRoute(
      postRequest('https://www.chairmatch.de/api/provider/salon', {
        name: 'Salon Sonnenschein — Mitte',
        city: 'Berlin',
      }),
    )
    expect(res.status).toBe(200)
    expect(db().row('salons', IDS.salon)?.name).toBe('Salon Sonnenschein — Mitte')
  })

  it('übernimmt nur freigegebene Felder — Eigentümer und Verifizierung bleiben', async () => {
    state.session = sessionFor('owner')
    await providerSalonRoute(
      postRequest('https://www.chairmatch.de/api/provider/salon', {
        name: 'Neuer Name',
        owner_id: IDS.customer,
        is_verified: false,
        subscription_tier: 'gold',
      }),
    )
    const salon = db().row('salons', IDS.salon)
    expect(salon?.owner_id).toBe(IDS.owner)
    expect(salon?.is_verified).toBe(true)
    expect(salon?.subscription_tier).toBe('free')
  })

  it('Mieter ohne eigenen Salon läuft ins Leere (404) statt fremde Daten zu ändern', async () => {
    const res = await providerSalonRoute(
      postRequest('https://www.chairmatch.de/api/provider/salon', { name: 'Übernommen' }),
    )
    expect(res.status).toBe(404)
    expect(db().row('salons', IDS.salon)?.name).toBe('Salon Sonnenschein')
  })

  it('antwortet 401 ohne Anmeldung', async () => {
    state.session = null
    const res = await providerSalonRoute(
      postRequest('https://www.chairmatch.de/api/provider/salon', { name: 'X' }),
    )
    expect(res.status).toBe(401)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Admin-Aktionen (PATCH /api/admin)', () => {
  const approveSalon = {
    action: 'salon-status',
    id: IDS.salon,
    data: { status: 'approved' },
  }

  it.each(['customer', 'otherCustomer', 'owner'] as const)(
    'verweigert %s den Zugriff (403)',
    async who => {
      state.session = sessionFor(who)
      const res = await adminRoute(
        postRequest('https://www.chairmatch.de/api/admin', approveSalon),
      )
      expect(res.status).toBe(403)
    },
  )

  it('verweigert nicht angemeldeten Aufrufern den Zugriff (403)', async () => {
    state.session = null
    const res = await adminRoute(
      postRequest('https://www.chairmatch.de/api/admin', approveSalon),
    )
    expect(res.status).toBe(403)
  })

  it('Admin schaltet einen Salon frei', async () => {
    state.session = sessionFor('admin')
    db().row('salons', IDS.salon)!.is_verified = false
    const res = await adminRoute(
      postRequest('https://www.chairmatch.de/api/admin', approveSalon),
    )
    expect(res.status).toBe(200)
    expect(db().row('salons', IDS.salon)).toMatchObject({ is_active: true, is_verified: true })
  })

  it('Admin darf KEINE Admin-Rollen vergeben — nur super_admin (403)', async () => {
    state.session = sessionFor('admin')
    const res = await adminRoute(
      postRequest('https://www.chairmatch.de/api/admin', {
        action: 'user-role',
        id: IDS.customer,
        data: { role: 'admin' },
      }),
    )
    expect(res.status).toBe(403)
    expect(db().row('profiles', IDS.customer)?.role).toBe('kunde')
  })

  it('super_admin darf Admin-Rollen vergeben', async () => {
    state.session = sessionFor('superAdmin')
    const res = await adminRoute(
      postRequest('https://www.chairmatch.de/api/admin', {
        action: 'user-role',
        id: IDS.customer,
        data: { role: 'admin' },
      }),
    )
    expect(res.status).toBe(200)
    expect(db().row('profiles', IDS.customer)?.role).toBe('admin')
  })

  it('Admin darf einfache Rollen weiterhin ändern', async () => {
    state.session = sessionFor('admin')
    const res = await adminRoute(
      postRequest('https://www.chairmatch.de/api/admin', {
        action: 'user-role',
        id: IDS.customer,
        data: { role: 'anbieter' },
      }),
    )
    expect(res.status).toBe(200)
    expect(db().row('profiles', IDS.customer)?.role).toBe('anbieter')
  })

  it.each([
    ['unbekannte Aktion', { action: 'drop-table', id: IDS.salon, data: { x: 1 } }],
    ['unbekannte Rolle', { action: 'user-role', id: IDS.customer, data: { role: 'root' } }],
    ['unbekannter Salon-Status', { action: 'salon-status', id: IDS.salon, data: { status: 'geloescht' } }],
    ['unbekannter Buchungsstatus', { action: 'booking-status', id: IDS.bookingConfirmed, data: { status: 'weg' } }],
    ['fehlende Felder', { action: 'salon-status' }],
  ])('weist ungültige Admin-Anfrage ab: %s', async (_label, body) => {
    state.session = sessionFor('admin')
    const res = await adminRoute(
      postRequest('https://www.chairmatch.de/api/admin', body),
    )
    expect(res.status).toBe(400)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Sichtbarkeit von Buchungen', () => {
  it('Salon-Inhaber sieht nur Buchungen seines eigenen Salons', async () => {
    // Zweiter Salon mit eigener Inhaberin
    db().rows('salons').push({
      id: '44444444-4444-4444-8444-44444444444b',
      name: 'Fremder Salon',
      slug: 'fremder-salon',
      category: 'friseur',
      city: 'Köln',
      owner_id: IDS.otherCustomer,
      is_active: true,
    })
    db().rows('bookings').push({
      id: '66666666-6666-4666-8666-66666666666b',
      customer_id: IDS.customer,
      salon_id: '44444444-4444-4444-8444-44444444444b',
      service_id: IDS.service,
      booking_date: BUSY_DAY,
      start_time: '09:00:00',
      end_time: '10:00:00',
      status: 'confirmed',
      price_cents: 4000,
    })

    state.session = sessionFor('owner')
    const eigene = await getBookingRoute(
      rawRequest(`https://www.chairmatch.de/api/bookings/${IDS.bookingConfirmed}`),
      ctx({ id: IDS.bookingConfirmed }),
    )
    expect(eigene.status).toBe(200)

    const fremde = await getBookingRoute(
      rawRequest('https://www.chairmatch.de/api/bookings/66666666-6666-4666-8666-66666666666b'),
      ctx({ id: '66666666-6666-4666-8666-66666666666b' }),
    )
    expect(fremde.status).toBe(403)
  })

  it('antwortet 401 ohne Anmeldung und 404 für unbekannte Buchungen', async () => {
    state.session = null
    const anon = await getBookingRoute(
      rawRequest(`https://www.chairmatch.de/api/bookings/${IDS.bookingConfirmed}`),
      ctx({ id: IDS.bookingConfirmed }),
    )
    expect(anon.status).toBe(401)

    state.session = sessionFor('admin')
    const missing = await getBookingRoute(
      rawRequest(`https://www.chairmatch.de/api/bookings/${IDS.unknown}`),
      ctx({ id: IDS.unknown }),
    )
    expect(missing.status).toBe(404)
  })
})

// ────────────────────────────────────────────────────────────────
describe('RLS-Annahme: der Browser-Client schreibt nie', () => {
  /**
   * Die RLS-Härtung 20260819_rls_close_gaps_v2.sql sperrt alle Schreibrechte
   * für `anon`. Das ist nur zulässig, solange der Browser-Client
   * (`@/lib/supabase`, Anon-Key) ausschließlich liest. Sobald jemand dort
   * einen Insert/Update/Delete ergänzt, schlägt dieser Test an, bevor der
   * stille 403 in Produktion auffällt.
   */
  function tsFiles(dir: string): string[] {
    const out: string[] = []
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '__tests__') continue
        out.push(...tsFiles(full))
      } else if (/\.tsx?$/.test(entry)) {
        out.push(full)
      }
    }
    return out
  }

  it('kein Insert/Update/Delete über den Anon-Key', () => {
    const srcDir = join(process.cwd(), 'src')
    const verstoesse: string[] = []

    for (const file of tsFiles(srcDir)) {
      const content = readFileSync(file, 'utf8')
      if (!/from '@\/lib\/supabase'/.test(content)) continue

      // Jede supabase.from(...)-Kette isolieren und auf Schreibzugriffe prüfen
      const chains = content.matchAll(/\bsupabase\s*\r?\n?\s*\.from\(/g)
      for (const chain of chains) {
        const start = chain.index ?? 0
        const window = content.slice(start, start + 800).split('\n\n')[0]
        const write = window.match(/\.(insert|update|delete|upsert)\(/)
        if (write) {
          verstoesse.push(`${file.replace(process.cwd() + '/', '')}: ${write[1]}()`)
        }
      }
    }

    expect(verstoesse).toEqual([])
  })
})

// ────────────────────────────────────────────────────────────────
describe('Stripe-Connect-Onboarding (POST /api/stripe/connect)', () => {
  /**
   * Regression: `isBusinessOwnerOrAbove()` lieferte für jede Rolle `true`
   * (BUSINESS_OWNER fehlte in der ROLE_MAP). Damit konnte jede angemeldete
   * Kundin ein Auszahlungskonto anlegen. Siehe lib/rbac.ts.
   */
  it('Kundin darf kein Auszahlungskonto anlegen (403)', async () => {
    state.session = sessionFor('customer')
    const res = await connectRoute(
      postRequest('https://www.chairmatch.de/api/stripe/connect', {}),
    )
    expect(res.status).toBe(403)
    expect((await res.json()).error).toMatch(/Anbieter/)
  })

  it('Anbieter darf das Onboarding starten', async () => {
    state.session = sessionFor('owner')
    const res = await connectRoute(
      postRequest('https://www.chairmatch.de/api/stripe/connect', {}),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).url).toContain('connect.stripe.com')
  })

  it('antwortet 401 ohne Anmeldung', async () => {
    state.session = null
    const res = await connectRoute(
      postRequest('https://www.chairmatch.de/api/stripe/connect', {}),
    )
    expect(res.status).toBe(401)
  })
})
