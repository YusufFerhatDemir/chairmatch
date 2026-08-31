// @vitest-environment node
/**
 * Track 21: Anmeldung, Sitzungen und Mandantentrennung.
 *
 * Angriffssicht, nicht Benutzersicht: jeder Test hier ist der Versuch, mit
 * einem gueltigen Konto etwas zu erreichen, das diesem Konto nicht gehoert.
 *
 * (1) 2FA liess sich mit einem einzigen POST abschalten,
 * (2) ein `admin` konnte jeden `super_admin` herabstufen,
 * (3) `staff_id` einer Buchung durfte aus einem fremden Salon stammen,
 * (4) /api/recommendations lief in eine tote Spalte und nahm fremde
 *     Mitarbeitende sowie unbekannte Produkte an,
 * (5) der Super-Admin-Upload nahm einen frei gewaehlten Pfad im Bucket.
 *
 * Der Sitzungs-Widerruf (Passwortwechsel und Passwort-Reset) steht in
 * track-21-sitzungswiderruf.test.ts — er braucht das ECHTE Session-Modul und
 * vertraegt sich deshalb nicht mit dessen Mock hier.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createDb,
  sessionFor,
  postRequest,
  IDS,
  FREE_DAY,
  type TestSession,
} from './e2e/_harness/fixtures'
import { pgError, type FakeSupabase } from './e2e/_harness/fake-supabase'

const state = vi.hoisted(() => {
  process.env.AUTH_SECRET ??= 'test-secret-nur-fuer-vitest'
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://pwdbjqfpgumyfktbfswg.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-test-key'
  return {
    db: undefined as unknown as import('./e2e/_harness/fake-supabase').FakeSupabase,
    session: null as TestSession | null,
    uploaded: [] as { bucket: string; path: string }[],
  }
})

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: () => state.db,
  uploadToStorage: async (bucket: string, path: string) => {
    state.uploaded.push({ bucket, path })
    return `https://storage.example/${bucket}/${path}`
  },
}))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  requireAuth: async () => state.session,
  requireRole: async () => state.session,
  invalidateAccountState: () => undefined,
}))
vi.mock('@/lib/error-tracking', () => ({
  logApiError: vi.fn(async () => undefined),
  logError: vi.fn(async () => undefined),
  isSentryConfigured: () => false,
}))
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: async () => ({ success: true }),
  sendProviderNotification: async () => ({ success: true }),
  // Track C: `cancelBooking` benachrichtigt jetzt die Gegenseite.
  sendBookingCancellation: vi.fn(async () => ({ ok: true })),
}))
vi.mock('next/cache', () => ({ revalidateTag: () => undefined }))

// ── Imports nach den Mocks ──────────────────────────────────────
import { __resetRateLimits } from '@/lib/rate-limit'
import { POST as twoFaSetup, GET as twoFaStatus } from '@/app/api/auth/2fa/setup/route'
import { PATCH as adminPatch } from '@/app/api/admin/route'
import { POST as bookingsPost } from '@/app/api/bookings/route'
import { POST as recommendationsPost } from '@/app/api/recommendations/route'
import { uploadImage } from '@/modules/super-admin/super-admin.actions'

function db(): FakeSupabase {
  return state.db
}

/** Zweiter Salon mit eigenem Inhaber — der „andere Mandant". */
const SALON_B = IDS.salonZwei
const OWNER_B = '22222222-2222-4222-8222-222222222223'
const STAFF_A = '19191919-1919-4191-8191-191919191911'
const STAFF_B = '19191919-1919-4191-8191-191919191912'
const STAFF_A_INAKTIV = '19191919-1919-4191-8191-191919191913'

function seedZweiterMandant(): void {
  db().rows('profiles').push({
    id: OWNER_B,
    email: 'inhaber-b@example.de',
    full_name: 'Bea Inhaberin',
    role: 'anbieter',
    is_active: true,
  })
  db().rows('salons').push({
    id: SALON_B,
    name: 'Salon Konkurrenz',
    slug: 'salon-konkurrenz',
    category: 'friseur',
    city: 'Hamburg',
    owner_id: OWNER_B,
    is_active: true,
    is_verified: true,
  })
  db().rows('staff').push(
    { id: STAFF_A, salon_id: IDS.salon, name: 'Ali Stylist', title: 'Barber', is_active: true },
    { id: STAFF_A_INAKTIV, salon_id: IDS.salon, name: 'Ex Mitarbeiter', title: null, is_active: false },
    { id: STAFF_B, salon_id: SALON_B, name: 'Bea Stylistin', title: 'Meisterin', is_active: true },
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  state.session = null
  state.uploaded = []
  __resetRateLimits()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

// ═══════════════════════════════════════════════════════════════
// (1) 2FA laesst sich nicht mit einem Aufruf abschalten
// ═══════════════════════════════════════════════════════════════

describe('Track 21 — aktive 2FA ueberlebt einen erneuten Setup-Aufruf', () => {
  const SETUP_URL = 'https://www.chairmatch.de/api/auth/2fa/setup'

  function aktive2faFuer(userId: string) {
    db().rows('user_2fa').push({
      user_id: userId,
      secret: 'JBSWY3DPEHPK3PXP',
      enabled: true,
      updated_at: '2026-08-01T00:00:00.000Z',
    })
  }

  it('schaltet aktive 2FA NICHT ab und meldet 409', async () => {
    state.session = sessionFor('customer')
    aktive2faFuer(IDS.customer)

    const res = await twoFaSetup(postRequest(SETUP_URL))

    expect(res.status).toBe(409)
    // Der eigentliche Schaden: die Zeile darf nicht auf enabled=false stehen.
    const row = db().rows('user_2fa').find(r => r.user_id === IDS.customer)
    expect(row?.enabled).toBe(true)
    expect(row?.secret).toBe('JBSWY3DPEHPK3PXP')
  })

  it('gibt kein neues Geheimnis heraus, wenn 2FA schon aktiv ist', async () => {
    state.session = sessionFor('customer')
    aktive2faFuer(IDS.customer)

    const res = await twoFaSetup(postRequest(SETUP_URL))
    const json = (await res.json()) as { secret?: string; qrUrl?: string; enabled?: boolean }

    expect(json.secret).toBeUndefined()
    expect(json.qrUrl).toBeUndefined()
    expect(json.enabled).toBe(true)
  })

  it('die Anmeldung verlangt danach weiterhin einen Code (Status bleibt aktiv)', async () => {
    state.session = sessionFor('customer')
    aktive2faFuer(IDS.customer)

    await twoFaSetup(postRequest(SETUP_URL))

    const res = await twoFaStatus()
    expect(await res.json()).toEqual({ enabled: true })
  })

  it('richtet 2FA weiterhin ein, wenn noch keine aktiv ist', async () => {
    state.session = sessionFor('customer')

    const res = await twoFaSetup(postRequest(SETUP_URL))
    const json = (await res.json()) as { secret?: string; qrUrl?: string }

    expect(res.status).toBe(200)
    expect(typeof json.secret).toBe('string')
    expect(json.qrUrl).toContain('otpauth')
    const row = db().rows('user_2fa').find(r => r.user_id === IDS.customer)
    // Erst /verify macht daraus true — hier bewusst noch nicht.
    expect(row?.enabled).toBe(false)
  })

  it('ueberschreibt eine begonnene, aber nie bestaetigte Einrichtung weiterhin', async () => {
    state.session = sessionFor('customer')
    db().rows('user_2fa').push({
      user_id: IDS.customer,
      secret: 'ALTESGEHEIMNIS',
      enabled: false,
      updated_at: '2026-08-01T00:00:00.000Z',
    })

    const res = await twoFaSetup(postRequest(SETUP_URL))
    expect(res.status).toBe(200)
    const row = db().rows('user_2fa').find(r => r.user_id === IDS.customer)
    expect(row?.secret).not.toBe('ALTESGEHEIMNIS')
  })

  it('schreibt nichts, wenn der Zustand nicht lesbar ist (fail closed)', async () => {
    state.session = sessionFor('customer')
    aktive2faFuer(IDS.customer)
    db().failOn('user_2fa', 'select', pgError('08006', 'connection failure'))

    const res = await twoFaSetup(postRequest(SETUP_URL))

    expect(res.status).toBe(500)
    const row = db().rows('user_2fa').find(r => r.user_id === IDS.customer)
    expect(row?.enabled).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// (2) Rollen-Eskalation nach UNTEN
// ═══════════════════════════════════════════════════════════════

describe('Track 21 — ein admin kann keine Admin-Rollen entziehen', () => {
  const ADMIN_URL = 'https://www.chairmatch.de/api/admin'

  function rolleSetzen(callerAs: 'admin' | 'superAdmin', zielId: string, role: string) {
    state.session = sessionFor(callerAs)
    return adminPatch(
      postRequest(ADMIN_URL, { action: 'user-role', id: zielId, data: { role } }),
    )
  }

  function rolleVon(id: string): unknown {
    return db().rows('profiles').find(p => p.id === id)?.role
  }

  it('laesst einen admin einen super_admin NICHT auf kunde setzen', async () => {
    const res = await rolleSetzen('admin', IDS.superAdmin, 'kunde')

    expect(res.status).toBe(403)
    expect(rolleVon(IDS.superAdmin)).toBe('super_admin')
  })

  it('laesst einen admin auch einen anderen admin nicht herabstufen', async () => {
    db().rows('profiles').push({
      id: OWNER_B,
      email: 'zweiter-admin@example.de',
      full_name: 'Zweiter Admin',
      role: 'admin',
      is_active: true,
    })

    const res = await rolleSetzen('admin', OWNER_B, 'kunde')

    expect(res.status).toBe(403)
    expect(rolleVon(OWNER_B)).toBe('admin')
  })

  it('erlaubt dem super_admin das Herabstufen eines admin', async () => {
    const res = await rolleSetzen('superAdmin', IDS.admin, 'kunde')

    expect(res.status).toBe(200)
    expect(rolleVon(IDS.admin)).toBe('kunde')
  })

  it('laesst einen admin weiterhin einen Kunden zum Anbieter machen', async () => {
    const res = await rolleSetzen('admin', IDS.customer, 'anbieter')

    expect(res.status).toBe(200)
    expect(rolleVon(IDS.customer)).toBe('anbieter')
  })

  it('verweigert die Aenderung der EIGENEN Rolle — auch dem super_admin', async () => {
    const res = await rolleSetzen('superAdmin', IDS.superAdmin, 'kunde')

    expect(res.status).toBe(403)
    expect(rolleVon(IDS.superAdmin)).toBe('super_admin')
  })

  it('meldet 404 statt still nichts zu tun, wenn es das Ziel nicht gibt', async () => {
    const res = await rolleSetzen('superAdmin', IDS.unknown, 'anbieter')
    expect(res.status).toBe(404)
  })

  it('aendert nichts, wenn das Ziel nicht lesbar ist (fail closed)', async () => {
    db().failOn('profiles', 'select', pgError('08006', 'connection failure'))
    const res = await rolleSetzen('superAdmin', IDS.admin, 'kunde')

    expect(res.status).toBe(500)
    expect(rolleVon(IDS.admin)).toBe('admin')
  })
})

// ═══════════════════════════════════════════════════════════════
// (3) staff_id gehoert zum gebuchten Salon
// ═══════════════════════════════════════════════════════════════

describe('Track 21 — eine Buchung kann keinen fremden Mitarbeitenden tragen', () => {
  const BOOKINGS_URL = 'https://www.chairmatch.de/api/bookings'

  function buchen(staffId?: string) {
    return bookingsPost(
      postRequest(BOOKINGS_URL, {
        salonId: IDS.salon,
        serviceId: IDS.service,
        date: FREE_DAY,
        startTime: '09:00',
        ...(staffId ? { staffId } : {}),
      }),
      undefined,
    )
  }

  beforeEach(() => {
    seedZweiterMandant()
    state.session = sessionFor('customer')
  })

  it('lehnt einen Mitarbeitenden aus einem anderen Salon ab', async () => {
    const res = await buchen(STAFF_B)

    expect(res.status).toBe(400)
    // Nur die Bestandsbuchung aus dem Seed — nichts angelegt.
    expect(db().rows('bookings')).toHaveLength(1)
  })

  it('verraet dabei nicht, dass es den Mitarbeitenden gibt', async () => {
    const fremd = await buchen(STAFF_B)
    const erfunden = await buchen(IDS.unknown)

    expect(await fremd.json()).toEqual(await erfunden.json())
  })

  it('lehnt einen inaktiven Mitarbeitenden des eigenen Salons ab', async () => {
    const res = await buchen(STAFF_A_INAKTIV)
    expect(res.status).toBe(400)
    expect(db().rows('bookings')).toHaveLength(1)
  })

  it('nimmt den eigenen, aktiven Mitarbeitenden an und schreibt ihn in die Zeile', async () => {
    const res = await buchen(STAFF_A)
    expect(res.status).toBe(201)

    const { bookingId } = (await res.json()) as { bookingId: string }
    const row = db().rows('bookings').find(b => b.id === bookingId)
    expect(row?.staff_id).toBe(STAFF_A)
  })

  it('bucht weiterhin ohne Zuordnung, wenn kein Mitarbeitender gewaehlt wurde', async () => {
    const res = await buchen()
    expect(res.status).toBe(201)
    const { bookingId } = (await res.json()) as { bookingId: string }
    expect(db().rows('bookings').find(b => b.id === bookingId)?.staff_id).toBeNull()
  })

  it('bucht nicht, wenn die Mitarbeiter-Pruefung selbst ausfaellt (fail closed)', async () => {
    db().failOn('staff', 'select', pgError('08006', 'connection failure'))
    const res = await buchen(STAFF_A)

    expect(res.status).toBe(503)
    expect(db().rows('bookings')).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// (4) Empfehlungen: tote Spalte, fremde Mitarbeitende, tote Produkte
// ═══════════════════════════════════════════════════════════════

describe('Track 21 — Produktempfehlung', () => {
  const REC_URL = 'https://www.chairmatch.de/api/recommendations'

  function empfehlen(body: Record<string, unknown>) {
    return recommendationsPost(postRequest(REC_URL, body))
  }

  beforeEach(() => {
    seedZweiterMandant()
    state.session = sessionFor('owner')
  })

  it('legt eine Empfehlung an — bis Track 21 endete jeder Aufruf in 404', async () => {
    const res = await empfehlen({
      bookingId: IDS.bookingConfirmed,
      productId: IDS.productBillig,
    })

    expect(res.status).toBe(201)
    const rows = db().rows('product_recommendations')
    expect(rows).toHaveLength(1)
    // Der Empfaenger kommt aus der Buchung, nicht aus dem Request.
    expect(rows[0].customer_id).toBe(IDS.customer)
    expect(rows[0].salon_id).toBe(IDS.salon)
  })

  it('lehnt einen Mitarbeitenden aus einem fremden Salon ab', async () => {
    const res = await empfehlen({
      bookingId: IDS.bookingConfirmed,
      productId: IDS.productBillig,
      staffId: STAFF_B,
    })

    expect(res.status).toBe(400)
    expect(db().rows('product_recommendations')).toHaveLength(0)
  })

  it('nimmt den eigenen Mitarbeitenden an', async () => {
    const res = await empfehlen({
      bookingId: IDS.bookingConfirmed,
      productId: IDS.productBillig,
      staffId: STAFF_A,
    })

    expect(res.status).toBe(201)
    expect(db().rows('product_recommendations')[0].staff_id).toBe(STAFF_A)
  })

  it('lehnt ein ausgelistetes Produkt ab', async () => {
    const res = await empfehlen({
      bookingId: IDS.bookingConfirmed,
      productId: IDS.productInaktiv,
    })

    expect(res.status).toBe(400)
    expect(db().rows('product_recommendations')).toHaveLength(0)
  })

  it('lehnt eine unbekannte Produkt-ID mit 400 ab, nicht mit 500', async () => {
    const res = await empfehlen({
      bookingId: IDS.bookingConfirmed,
      productId: IDS.unknown,
    })

    expect(res.status).toBe(400)
  })

  it('laesst einen fremden Anbieter nicht in die Buchung eines anderen Salons schreiben', async () => {
    state.session = {
      user: { id: OWNER_B, email: 'inhaber-b@example.de', name: 'Bea', role: 'anbieter' },
    }

    const res = await empfehlen({
      bookingId: IDS.bookingConfirmed,
      productId: IDS.productBillig,
    })

    expect(res.status).toBe(403)
    expect(db().rows('product_recommendations')).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// (5) Super-Admin-Upload: Pfad im Bucket
// ═══════════════════════════════════════════════════════════════

describe('Track 21 — Super-Admin-Upload waehlt keinen freien Pfad', () => {
  function formular(folder: string): FormData {
    const form = new FormData()
    form.set('file', new File([new Uint8Array([1, 2, 3])], 'bild.png', { type: 'image/png' }))
    form.set('bucket', 'app-assets')
    form.set('folder', folder)
    return form
  }

  beforeEach(() => {
    state.session = sessionFor('superAdmin')
  })

  it('lehnt einen Ordnernamen mit Pfadwechsel ab', async () => {
    const res = await uploadImage(formular('../salon-images/logos'))

    expect(res).toEqual({ error: 'Ungueltiger Ordnername' })
    expect(state.uploaded).toHaveLength(0)
  })

  it('lehnt einen Ordnernamen mit Schraegstrich ab', async () => {
    const res = await uploadImage(formular('uploads/tief/tiefer'))
    expect(res).toEqual({ error: 'Ungueltiger Ordnername' })
    expect(state.uploaded).toHaveLength(0)
  })

  it('laesst einen gewoehnlichen Ordnernamen durch', async () => {
    const res = await uploadImage(formular('onboarding'))

    expect(res).toMatchObject({ success: true })
    expect(state.uploaded).toHaveLength(1)
    expect(state.uploaded[0].path.startsWith('onboarding/')).toBe(true)
  })
})
