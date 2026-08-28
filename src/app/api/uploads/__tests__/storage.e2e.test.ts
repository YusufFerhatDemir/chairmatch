// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { fakeDb, type Row } from '@/test/fake-supabase'
import { applyLiveSchema } from '@/test/live-schema'

/**
 * Upload-Kette (Track 7b, Punkt 4): Datei → Storage → DB-Zeile →
 * Verknuepfung im fachlichen Datensatz → Auslieferung → Loeschung.
 *
 * Die Kette hat zwei Systeme, die auseinanderlaufen koennen: den Bucket und
 * die Datenbank. Genau die Uebergaenge werden hier geprueft — vor allem der
 * unangenehme Fall, dass die Datei schon liegt, die DB-Zeile aber scheitert.
 * Ohne Aufraeumen bliebe eine bezahlte, unerreichbare Datei im Bucket zurueck.
 *
 * Gemockt sind Session und `crypto.randomUUID` (fuer stabile Pfade).
 * Datenbank UND Storage laufen als Fake mit echtem Verhalten: die Fake-DB
 * setzt das Produktionsschema durch, der Fake-Bucket weist einen belegten
 * Pfad ab und loescht wirklich.
 */

const auth = vi.hoisted(() => ({
  session: null as { user?: { id?: string; role?: string } } | null,
}))

vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => auth.session,
}))

vi.mock('@/lib/supabase-server', async () => {
  const { fakeDb: db } = await import('@/test/fake-supabase')
  return { getSupabaseAdmin: () => db }
})

// ── Fixtures ────────────────────────────────────────────────────────────────

const OWNER_ID = '11111111-1111-4111-8111-111111111111'
const STRANGER_ID = '99999999-9999-4999-8999-999999999999'
const SALON_ID = '22222222-2222-4222-8222-222222222222'
const EQUIPMENT_ID = '33333333-3333-4333-8333-333333333333'
const UPLOAD_ID = '44444444-4444-4444-8444-444444444444'

const BUCKET = 'cm-uploads'
const MAX_SIZE_BYTES = 5 * 1024 * 1024

type Handler = (req: NextRequest, ctx?: unknown) => Promise<Response>
let uploadFile: Handler
let listUploads: Handler
let serveUpload: Handler
let deleteUpload: Handler

beforeAll(async () => {
  const collection = await import('@/app/api/uploads/route')
  const single = await import('@/app/api/uploads/[id]/route')
  uploadFile = collection.POST as unknown as Handler
  listUploads = collection.GET as unknown as Handler
  serveUpload = single.GET as unknown as Handler
  deleteUpload = single.DELETE as unknown as Handler
})

/**
 * Eine Datei, wie sie aus einem `<input type="file">` kommt. `arrayBuffer`
 * muss existieren — die Route benutzt sie als Erkennungsmerkmal gegenueber
 * einem einfachen Formularfeld.
 */
function fakeFile(type: string, size: number, name = 'bild.jpg'): File {
  return {
    name,
    type,
    size,
    arrayBuffer: async () => new ArrayBuffer(size),
  } as unknown as File
}

function uploadRequest(fields: Record<string, unknown>): NextRequest {
  const form = new Map(Object.entries(fields))
  return {
    url: 'https://www.chairmatch.de/api/uploads',
    method: 'POST',
    formData: async () => ({ get: (key: string) => form.get(key) ?? null }),
  } as unknown as NextRequest
}

function plainRequest(url = 'https://www.chairmatch.de/api/uploads'): NextRequest {
  return { url, method: 'GET' } as unknown as NextRequest
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

async function readJson(res: Response) {
  return { status: res.status, json: (await res.json()) as Record<string, unknown> }
}

const uploadRows = () => fakeDb.rows('user_uploads')
const salonRow = () => fakeDb.rows('salons')[0]
const equipmentRow = () => fakeDb.rows('rental_equipment')[0]

function seedDatabase() {
  fakeDb.reset()
  applyLiveSchema(fakeDb)

  fakeDb.seed('salons', [
    {
      id: SALON_ID,
      owner_id: OWNER_ID,
      name: 'Salon Nord',
      city: 'Köln',
      gallery: [],
      logo_url: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ])

  fakeDb.rows('rental_equipment').push({
    id: EQUIPMENT_ID,
    salon_id: SALON_ID,
    type: 'stuhl',
    name: 'Stuhl 1',
    price_per_day_cents: 4000,
    is_available: true,
    images: [],
    created_at: '2026-01-02T00:00:00.000Z',
    salons: { id: SALON_ID, owner_id: OWNER_ID, name: 'Salon Nord' },
  })
}

/** Damit die Storage-Pfade im Test vorhersagbar sind. */
let uuidCounter = 0
beforeEach(() => {
  seedDatabase()
  auth.session = { user: { id: OWNER_ID } }
  uuidCounter = 0
  vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(
    () => `dddddddd-dddd-4ddd-8ddd-${String(++uuidCounter).padStart(12, '0')}` as `${string}-${string}-${string}-${string}-${string}`,
  )
})

// ── 1. Happy Path: Datei landet im Bucket UND in der DB ─────────────────────

describe('POST /api/uploads — Datei, Storage und DB-Zeile', () => {
  it('legt die Datei im privaten Bucket ab und verknuepft sie mit dem Salon', async () => {
    const { status, json } = await readJson(
      await uploadFile(uploadRequest({ target: 'salon_logo', file: fakeFile('image/jpeg', 2048) })),
    )

    expect(status).toBe(201)

    // Storage
    expect(fakeDb.storage.paths()).toEqual([
      `${BUCKET}/${OWNER_ID}/salon_logo/dddddddd-dddd-4ddd-8ddd-000000000001.jpg`,
    ])

    // DB-Zeile
    expect(uploadRows()).toHaveLength(1)
    const stored = uploadRows()[0]
    expect(stored.user_id).toBe(OWNER_ID)
    expect(stored.bucket).toBe(BUCKET)
    expect(stored.mime_type).toBe('image/jpeg')
    expect(stored.size_bytes).toBe(2048)
    expect(stored.is_public).toBe(true)

    // Verknuepfung: in der DB steht die App-URL, nicht die Storage-URL —
    // eine Signed URL waere nach einer Stunde tot.
    const upload = json.upload as Row
    expect(upload.url).toBe(`/api/uploads/${stored.id}`)
    expect(salonRow().logo_url).toBe(`/api/uploads/${stored.id}`)
    expect(String(salonRow().logo_url)).not.toContain('storage')
  })

  it('haengt ein Galeriebild hinten an, statt die Galerie zu ersetzen', async () => {
    salonRow().gallery = ['/api/uploads/bestehend']

    await uploadFile(uploadRequest({ target: 'salon_gallery', file: fakeFile('image/png', 1024) }))

    const gallery = salonRow().gallery as string[]
    expect(gallery).toHaveLength(2)
    expect(gallery[0]).toBe('/api/uploads/bestehend')
    expect(gallery[1]).toBe(`/api/uploads/${uploadRows()[0].id}`)
  })

  it('haengt ein Inseratsfoto an das Haupt-Inserat', async () => {
    await uploadFile(uploadRequest({ target: 'listing_photo', file: fakeFile('image/webp', 4096) }))

    expect((equipmentRow().images as string[])[0]).toBe(`/api/uploads/${uploadRows()[0].id}`)
    expect(uploadRows()[0].equipment_id).toBe(EQUIPMENT_ID)
  })

  it('legt Zertifikate nicht-oeffentlich ab', async () => {
    const { status } = await readJson(
      await uploadFile(
        uploadRequest({
          target: 'salon_certificate',
          docKey: 'gewerbeschein',
          file: fakeFile('application/pdf', 8192, 'schein.pdf'),
        }),
      ),
    )

    expect(status).toBe(201)
    expect(uploadRows()[0].is_public).toBe(false)
    expect(uploadRows()[0].doc_key).toBe('gewerbeschein')
  })

  it('ersetzt ein Zertifikat desselben Typs und raeumt die alte Datei weg', async () => {
    await uploadFile(
      uploadRequest({
        target: 'salon_certificate',
        docKey: 'gewerbeschein',
        file: fakeFile('application/pdf', 100, 'alt.pdf'),
      }),
    )
    const firstPath = fakeDb.storage.paths()[0]

    await uploadFile(
      uploadRequest({
        target: 'salon_certificate',
        docKey: 'gewerbeschein',
        file: fakeFile('application/pdf', 200, 'neu.pdf'),
      }),
    )

    expect(uploadRows()).toHaveLength(1)
    expect(uploadRows()[0].size_bytes).toBe(200)
    // Der Bucket darf die alte Datei nicht behalten — sie ist unerreichbar.
    expect(fakeDb.storage.paths()).toHaveLength(1)
    expect(fakeDb.storage.paths()[0]).not.toBe(firstPath)
  })

  it('behaelt ein Zertifikat mit anderem docKey', async () => {
    for (const docKey of ['gewerbeschein', 'haftpflicht']) {
      await uploadFile(
        uploadRequest({ target: 'salon_certificate', docKey, file: fakeFile('application/pdf', 100) }),
      )
    }

    expect(uploadRows()).toHaveLength(2)
    expect(fakeDb.storage.paths()).toHaveLength(2)
  })
})

// ── 2. Validierung ──────────────────────────────────────────────────────────

describe('POST /api/uploads — Dateityp und Groesse', () => {
  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
  ])('akzeptiert %s als Bild', async (mime, ext) => {
    const { status } = await readJson(
      await uploadFile(uploadRequest({ target: 'salon_logo', file: fakeFile(mime, 1000) })),
    )

    expect(status).toBe(201)
    expect(fakeDb.storage.paths()[0].endsWith(`.${ext}`)).toBe(true)
  })

  it.each(['application/pdf', 'image/svg+xml', 'text/html', 'application/octet-stream'])(
    'weist %s als Bild ab',
    async (mime) => {
      const { status, json } = await readJson(
        await uploadFile(uploadRequest({ target: 'salon_logo', file: fakeFile(mime, 1000) })),
      )

      expect(status).toBe(400)
      expect(String(json.error)).toContain('Dateityp')
      // Nichts darf den Bucket erreicht haben.
      expect(fakeDb.storage.paths()).toHaveLength(0)
      expect(uploadRows()).toHaveLength(0)
    },
  )

  it('erlaubt PDF nur bei Zertifikaten', async () => {
    const { status } = await readJson(
      await uploadFile(
        uploadRequest({
          target: 'salon_certificate',
          docKey: 'gewerbeschein',
          file: fakeFile('application/pdf', 1000),
        }),
      ),
    )
    expect(status).toBe(201)
  })

  it('weist eine Datei ueber 5 MB ab', async () => {
    const { status, json } = await readJson(
      await uploadFile(
        uploadRequest({ target: 'salon_logo', file: fakeFile('image/jpeg', MAX_SIZE_BYTES + 1) }),
      ),
    )

    expect(status).toBe(400)
    expect(String(json.error)).toContain('5 MB')
    expect(fakeDb.storage.paths()).toHaveLength(0)
  })

  it('akzeptiert eine Datei genau an der 5-MB-Grenze', async () => {
    const { status } = await readJson(
      await uploadFile(
        uploadRequest({ target: 'salon_logo', file: fakeFile('image/jpeg', MAX_SIZE_BYTES) }),
      ),
    )
    expect(status).toBe(201)
  })

  it('weist eine leere Datei ab', async () => {
    const { status, json } = await readJson(
      await uploadFile(uploadRequest({ target: 'salon_logo', file: fakeFile('image/jpeg', 0) })),
    )

    expect(status).toBe(400)
    expect(String(json.error)).toContain('leer')
  })

  it('weist ein unbekanntes target ab', async () => {
    const { status, json } = await readJson(
      await uploadFile(uploadRequest({ target: 'systemdatei', file: fakeFile('image/jpeg', 100) })),
    )

    expect(status).toBe(400)
    expect(String(json.error)).toContain('target')
  })

  it('verlangt bei Zertifikaten einen sauberen docKey', async () => {
    const { status, json } = await readJson(
      await uploadFile(
        uploadRequest({
          target: 'salon_certificate',
          docKey: '../../../etc/passwd',
          file: fakeFile('application/pdf', 100),
        }),
      ),
    )

    expect(status).toBe(400)
    expect(String(json.error)).toContain('docKey')
    expect(fakeDb.storage.paths()).toHaveLength(0)
  })

  it('weist einen Request ohne Datei ab', async () => {
    const { status, json } = await readJson(await uploadFile(uploadRequest({ target: 'salon_logo' })))

    expect(status).toBe(400)
    expect(String(json.error)).toContain('Keine Datei')
  })

  it('behandelt ein Textfeld nicht als Datei', async () => {
    const { status } = await readJson(
      await uploadFile(uploadRequest({ target: 'salon_logo', file: 'nur-ein-string' })),
    )
    expect(status).toBe(400)
  })

  it('verlangt eine Anmeldung', async () => {
    auth.session = null
    const { status } = await readJson(
      await uploadFile(uploadRequest({ target: 'salon_logo', file: fakeFile('image/jpeg', 100) })),
    )

    expect(status).toBe(401)
    expect(fakeDb.storage.paths()).toHaveLength(0)
  })
})

// ── 3. Mengengrenzen ────────────────────────────────────────────────────────

describe('POST /api/uploads — Mengengrenzen', () => {
  it('deckelt die Salongalerie bei 12 Bildern', async () => {
    salonRow().gallery = Array.from({ length: 12 }, (_, i) => `/api/uploads/bild-${i}`)

    const { status, json } = await readJson(
      await uploadFile(uploadRequest({ target: 'salon_gallery', file: fakeFile('image/jpeg', 100) })),
    )

    expect(status).toBe(409)
    expect(String(json.error)).toContain('12')
    expect(fakeDb.storage.paths()).toHaveLength(0)
  })

  it('deckelt Inseratsfotos bei 8', async () => {
    equipmentRow().images = Array.from({ length: 8 }, (_, i) => `/api/uploads/foto-${i}`)

    const { status, json } = await readJson(
      await uploadFile(uploadRequest({ target: 'listing_photo', file: fakeFile('image/jpeg', 100) })),
    )

    expect(status).toBe(409)
    expect(String(json.error)).toContain('8')
    expect(fakeDb.storage.paths()).toHaveLength(0)
  })
})

// ── 4. Der unangenehme Fall: Bucket ok, Datenbank nicht ─────────────────────

describe('POST /api/uploads — Bucket und Datenbank auseinander', () => {
  it('loescht die hochgeladene Datei wieder, wenn die DB-Zeile scheitert', async () => {
    fakeDb.failOn('user_uploads.insert', { code: '57014', message: 'statement timeout' })

    const { status, json } = await readJson(
      await uploadFile(uploadRequest({ target: 'salon_logo', file: fakeFile('image/jpeg', 100) })),
    )

    expect(status).toBe(500)
    expect(String(json.error)).toContain('Datenbankfehler')
    // Kein verwaister Bucket-Inhalt: die Datei waere sonst weder erreichbar
    // noch loeschbar, weil kein Datensatz mehr auf sie zeigt.
    expect(fakeDb.storage.paths()).toHaveLength(0)
    expect(uploadRows()).toHaveLength(0)
  })

  it('schreibt keine DB-Zeile, wenn der Bucket den Upload ablehnt', async () => {
    fakeDb.failOn('storage.cm-uploads.upload', { message: 'Bucket not found' })

    const { status, json } = await readJson(
      await uploadFile(uploadRequest({ target: 'salon_logo', file: fakeFile('image/jpeg', 100) })),
    )

    expect(status).toBe(500)
    expect(String(json.error)).toContain('Interner Fehler')
    expect(uploadRows()).toHaveLength(0)
    expect(salonRow().logo_url).toBeNull()
  })

  it('faellt bei einem DB-Fehler nicht auf einen Ersatzspeicher zurueck', async () => {
    fakeDb.failOn('user_uploads.insert', { code: '57014', message: 'statement timeout' })

    const { status } = await readJson(
      await uploadFile(uploadRequest({ target: 'salon_logo', file: fakeFile('image/jpeg', 100) })),
    )

    // ChairMatch speichert bei einem DB-Fehler bewusst NIRGENDWO sonst —
    // ein „gespeichert" ohne Datensatz waere die schlimmere Antwort.
    expect(status).toBe(500)
    expect(salonRow().logo_url).toBeNull()
  })
})

// ── 5. Auslieferung ─────────────────────────────────────────────────────────

describe('GET /api/uploads/[id] — Auslieferung', () => {
  function seedUpload(overrides: Row = {}) {
    fakeDb.rows('user_uploads').push({
      id: UPLOAD_ID,
      user_id: OWNER_ID,
      target: 'salon_logo',
      salon_id: SALON_ID,
      equipment_id: null,
      doc_key: null,
      bucket: BUCKET,
      storage_path: `${OWNER_ID}/salon_logo/datei.jpg`,
      mime_type: 'image/jpeg',
      size_bytes: 100,
      is_public: true,
      created_at: '2026-08-01T00:00:00.000Z',
      ...overrides,
    })
    fakeDb.storage.from(BUCKET).upload(`${OWNER_ID}/salon_logo/datei.jpg`, { size: 100 }, {})
  }

  it('leitet ein oeffentliches Bild ohne Anmeldung auf eine Signed URL um', async () => {
    seedUpload()
    auth.session = null

    const res = await serveUpload(plainRequest(), ctx(UPLOAD_ID))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('storage.test')
  })

  it('haelt ein Zertifikat von Unangemeldeten fern', async () => {
    seedUpload({ target: 'salon_certificate', is_public: false })
    auth.session = null

    const { status } = await readJson(await serveUpload(plainRequest(), ctx(UPLOAD_ID)))
    expect(status).toBe(401)
  })

  it('haelt ein fremdes Zertifikat von anderen Nutzern fern', async () => {
    seedUpload({ target: 'salon_certificate', is_public: false })
    auth.session = { user: { id: STRANGER_ID } }

    const { status, json } = await readJson(await serveUpload(plainRequest(), ctx(UPLOAD_ID)))

    expect(status).toBe(403)
    expect(String(json.error)).toContain('Kein Zugriff')
  })

  it('laesst den Eigentuemer an sein Zertifikat', async () => {
    seedUpload({ target: 'salon_certificate', is_public: false })

    const res = await serveUpload(plainRequest(), ctx(UPLOAD_ID))
    expect(res.status).toBe(307)
    // Nicht-oeffentliche Dateien duerfen nirgends zwischengespeichert werden.
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('laesst einen Admin an ein fremdes Zertifikat', async () => {
    seedUpload({ target: 'salon_certificate', is_public: false })
    auth.session = { user: { id: STRANGER_ID, role: 'admin' } }

    const res = await serveUpload(plainRequest(), ctx(UPLOAD_ID))
    expect(res.status).toBe(307)
  })

  it('antwortet auf eine unbekannte ID mit 404', async () => {
    const { status } = await readJson(
      await serveUpload(plainRequest(), ctx('55555555-5555-4555-8555-555555555555')),
    )
    expect(status).toBe(404)
  })

  it('weist eine ID ab, die keine UUID ist', async () => {
    const { status } = await readJson(await serveUpload(plainRequest(), ctx('../../secret')))

    expect(status).toBe(400)
    expect(fakeDb.access.filter((a) => a.table === 'user_uploads')).toHaveLength(0)
  })
})

// ── 6. Loeschen ─────────────────────────────────────────────────────────────

describe('DELETE /api/uploads/[id] — loeschen', () => {
  function seedLinkedUpload(target: string, overrides: Row = {}) {
    const path = `${OWNER_ID}/${target}/datei.jpg`
    fakeDb.rows('user_uploads').push({
      id: UPLOAD_ID,
      user_id: OWNER_ID,
      target,
      salon_id: SALON_ID,
      equipment_id: target === 'listing_photo' ? EQUIPMENT_ID : null,
      doc_key: null,
      bucket: BUCKET,
      storage_path: path,
      mime_type: 'image/jpeg',
      size_bytes: 100,
      is_public: true,
      created_at: '2026-08-01T00:00:00.000Z',
      ...overrides,
    })
    fakeDb.storage.from(BUCKET).upload(path, { size: 100 }, {})
  }

  it('loescht Datei, Datensatz und Logo-Verknuepfung zusammen', async () => {
    seedLinkedUpload('salon_logo')
    salonRow().logo_url = `/api/uploads/${UPLOAD_ID}`

    const { status, json } = await readJson(await deleteUpload(plainRequest(), ctx(UPLOAD_ID)))

    expect(status).toBe(200)
    expect(json.deleted).toBe(UPLOAD_ID)
    expect(uploadRows()).toHaveLength(0)
    expect(fakeDb.storage.paths()).toHaveLength(0)
    expect(salonRow().logo_url).toBeNull()
  })

  it('nimmt nur das geloeschte Bild aus der Galerie', async () => {
    seedLinkedUpload('salon_gallery')
    salonRow().gallery = ['/api/uploads/anderes', `/api/uploads/${UPLOAD_ID}`, '/api/uploads/drittes']

    await deleteUpload(plainRequest(), ctx(UPLOAD_ID))

    expect(salonRow().gallery).toEqual(['/api/uploads/anderes', '/api/uploads/drittes'])
  })

  it('nimmt nur das geloeschte Foto aus dem Inserat', async () => {
    seedLinkedUpload('listing_photo')
    equipmentRow().images = [`/api/uploads/${UPLOAD_ID}`, '/api/uploads/anderes']

    await deleteUpload(plainRequest(), ctx(UPLOAD_ID))

    expect(equipmentRow().images).toEqual(['/api/uploads/anderes'])
  })

  it('laesst niemanden fremde Dateien loeschen', async () => {
    seedLinkedUpload('salon_logo')
    auth.session = { user: { id: STRANGER_ID } }

    const { status } = await readJson(await deleteUpload(plainRequest(), ctx(UPLOAD_ID)))

    expect(status).toBe(403)
    expect(uploadRows()).toHaveLength(1)
    expect(fakeDb.storage.paths()).toHaveLength(1)
  })

  it('verlangt eine Anmeldung', async () => {
    seedLinkedUpload('salon_logo')
    auth.session = null

    const { status } = await readJson(await deleteUpload(plainRequest(), ctx(UPLOAD_ID)))

    expect(status).toBe(401)
    expect(uploadRows()).toHaveLength(1)
  })
})

// ── 7. Eigene Dateien auflisten ─────────────────────────────────────────────

describe('GET /api/uploads — eigene Dateien', () => {
  it('liefert nur die Dateien des angemeldeten Nutzers zum gefragten target', async () => {
    fakeDb.rows('user_uploads').push(
      { id: UPLOAD_ID, user_id: OWNER_ID, target: 'salon_gallery', bucket: BUCKET, storage_path: 'a', mime_type: 'image/jpeg', size_bytes: 1, is_public: true, created_at: '2026-08-01T00:00:00.000Z' },
      { id: '66666666-6666-4666-8666-666666666666', user_id: OWNER_ID, target: 'salon_logo', bucket: BUCKET, storage_path: 'b', mime_type: 'image/jpeg', size_bytes: 1, is_public: true, created_at: '2026-08-02T00:00:00.000Z' },
      { id: '77777777-7777-4777-8777-777777777777', user_id: STRANGER_ID, target: 'salon_gallery', bucket: BUCKET, storage_path: 'c', mime_type: 'image/jpeg', size_bytes: 1, is_public: true, created_at: '2026-08-03T00:00:00.000Z' },
    )

    const { status, json } = await readJson(
      await listUploads(plainRequest('https://www.chairmatch.de/api/uploads?target=salon_gallery')),
    )

    expect(status).toBe(200)
    const uploads = json.uploads as Row[]
    expect(uploads).toHaveLength(1)
    expect(uploads[0].id).toBe(UPLOAD_ID)
    expect(uploads[0].url).toBe(`/api/uploads/${UPLOAD_ID}`)
    // Der Storage-Pfad ist intern und hat in der Antwort nichts verloren.
    expect(uploads[0].storage_path).toBeUndefined()
  })

  it('verlangt ein gueltiges target', async () => {
    const { status, json } = await readJson(
      await listUploads(plainRequest('https://www.chairmatch.de/api/uploads?target=alles')),
    )

    expect(status).toBe(400)
    expect(String(json.error)).toContain('target')
  })

  it('verlangt eine Anmeldung', async () => {
    auth.session = null
    const { status } = await readJson(
      await listUploads(plainRequest('https://www.chairmatch.de/api/uploads?target=salon_logo')),
    )
    expect(status).toBe(401)
  })
})
