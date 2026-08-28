import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { dbError } from '@/lib/api-wrapper'
import {
  ListingError,
  ensurePrimaryListing,
  requireOwnedSalon,
} from '@/modules/rentals/listing.service'

/**
 * Echter Datei-Upload für Logo, Galerie, Zertifikate und Inserats-Fotos.
 *
 * Ersetzt die Data-URLs, die `UploadField` bisher in localStorage abgelegt hat.
 *
 * Ablage: privater Bucket `cm-uploads`. In der DB landet nur der storage_path;
 * ausgeliefert wird über `/api/uploads/{id}`, das pro Request eine frische
 * Signed URL erzeugt. Deshalb steht in `salons.logo_url` /
 * `rental_equipment.images` eine stabile App-URL statt einer Storage-URL,
 * die nach einer Stunde tot wäre.
 */

export const runtime = 'nodejs'

const BUCKET = 'cm-uploads'
const MAX_SIZE_BYTES = 5 * 1024 * 1024
const MAX_GALLERY = 12
const MAX_LISTING_PHOTOS = 8

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const DOC_TYPES = [...IMAGE_TYPES, 'application/pdf'] as const

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

const TARGETS = ['salon_logo', 'salon_gallery', 'salon_certificate', 'listing_photo'] as const
type Target = (typeof TARGETS)[number]

/** Zertifikate sind nie öffentlich — alles andere erscheint auf der Salonseite. */
const PUBLIC_TARGETS: ReadonlySet<Target> = new Set<Target>([
  'salon_logo',
  'salon_gallery',
  'listing_photo',
])

function allowedTypes(target: Target): readonly string[] {
  return target === 'salon_certificate' ? DOC_TYPES : IMAGE_TYPES
}

/** Stabile App-URL, die in salons/rental_equipment gespeichert wird. */
function publicRef(uploadId: string): string {
  return `/api/uploads/${uploadId}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const rawTarget = new URL(req.url).searchParams.get('target')
  if (!rawTarget || !(TARGETS as readonly string[]).includes(rawTarget)) {
    return NextResponse.json(
      { error: `Ungültiges target. Erlaubt: ${TARGETS.join(', ')}` },
      { status: 400 },
    )
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('user_uploads')
    .select('id, target, doc_key, mime_type, size_bytes, created_at')
    .eq('user_id', session.user.id)
    .eq('target', rawTarget)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('uploads GET failed:', error)
    return NextResponse.json({ error: 'Dateien konnten nicht geladen werden' }, { status: 500 })
  }

  const uploads = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    url: publicRef(String(row.id)),
  }))
  return NextResponse.json({ uploads })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }
  const userId = session.user.id

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Formular-Body' }, { status: 400 })
  }

  const rawTarget = String(form.get('target') ?? '')
  if (!(TARGETS as readonly string[]).includes(rawTarget)) {
    return NextResponse.json(
      { error: `Ungültiges target. Erlaubt: ${TARGETS.join(', ')}` },
      { status: 400 },
    )
  }
  const target = rawTarget as Target

  const file = form.get('file')
  if (!file || typeof file === 'string' || typeof (file as File).arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 })
  }
  const upload = file as File

  const permitted = allowedTypes(target)
  if (!permitted.includes(upload.type)) {
    const labels = permitted.map(t => EXT_BY_MIME[t]?.toUpperCase() ?? t).join(', ')
    return NextResponse.json(
      { error: `Ungültiger Dateityp. Erlaubt: ${labels}` },
      { status: 400 },
    )
  }
  if (upload.size <= 0) {
    return NextResponse.json({ error: 'Datei ist leer' }, { status: 400 })
  }
  if (upload.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Datei zu groß. Maximal 5 MB erlaubt' }, { status: 400 })
  }

  const docKey = target === 'salon_certificate' ? String(form.get('docKey') ?? '').trim() : ''
  if (target === 'salon_certificate' && !/^[a-z0-9_-]{1,40}$/i.test(docKey)) {
    return NextResponse.json({ error: 'docKey fehlt oder ist ungültig' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  try {
    // Besitz prüfen und Ziel-Datensatz auflösen, BEVOR etwas hochgeladen wird.
    let salonId: string | null = null
    let equipmentId: string | null = null
    let currentGallery: string[] = []
    let currentImages: string[] = []

    if (target === 'listing_photo') {
      const listing = await ensurePrimaryListing(supabase, userId)
      equipmentId = listing.id
      salonId = listing.salon_id
      currentImages = (listing.images ?? []).map(String)
      if (currentImages.length >= MAX_LISTING_PHOTOS) {
        return NextResponse.json(
          { error: `Maximal ${MAX_LISTING_PHOTOS} Fotos — bitte zuerst eines löschen` },
          { status: 409 },
        )
      }
    } else {
      const salon = await requireOwnedSalon(supabase, userId)
      salonId = salon.id

      if (target === 'salon_gallery') {
        const { data: row } = await supabase
          .from('salons')
          .select('gallery')
          .eq('id', salon.id)
          .single()
        currentGallery = ((row?.gallery as unknown[] | null) ?? []).map(String)
        if (currentGallery.length >= MAX_GALLERY) {
          return NextResponse.json(
            { error: `Maximal ${MAX_GALLERY} Bilder — bitte zuerst eines löschen` },
            { status: 409 },
          )
        }
      }
    }

    const ext = EXT_BY_MIME[upload.type] ?? 'bin'
    const storagePath = `${userId}/${target}/${crypto.randomUUID()}.${ext}`

    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, upload, { contentType: upload.type, upsert: false })

    if (storageError) {
      console.error('uploads storage failed:', storageError)
      return dbError('uploads-storage', storageError)
    }

    // Zertifikate: pro (salon, docKey) genau eines — das alte weicht.
    let replaced: { id: string; storage_path: string } | null = null
    if (target === 'salon_certificate') {
      const { data: old } = await supabase
        .from('user_uploads')
        .select('id, storage_path')
        .eq('salon_id', salonId)
        .eq('target', 'salon_certificate')
        .eq('doc_key', docKey)
        .limit(1)
      replaced = (old?.[0] as { id: string; storage_path: string } | undefined) ?? null
      if (replaced) {
        await supabase.from('user_uploads').delete().eq('id', replaced.id)
        await supabase.storage.from(BUCKET).remove([replaced.storage_path])
      }
    }

    const { data: record, error: insertError } = await supabase
      .from('user_uploads')
      .insert({
        user_id: userId,
        target,
        salon_id: salonId,
        equipment_id: equipmentId,
        doc_key: docKey || null,
        bucket: BUCKET,
        storage_path: storagePath,
        mime_type: upload.type,
        size_bytes: upload.size,
        is_public: PUBLIC_TARGETS.has(target),
      })
      .select('id, target, doc_key, mime_type, size_bytes')
      .single()

    if (insertError || !record) {
      // DB-Zeile fehlgeschlagen → die Datei wäre sonst verwaist.
      await supabase.storage.from(BUCKET).remove([storagePath])
      console.error('uploads insert failed:', insertError)
      return NextResponse.json({ error: 'Datenbankfehler beim Upload' }, { status: 500 })
    }

    const url = publicRef(String(record.id))

    // Verknüpfung in den fachlichen Datensatz schreiben.
    if (target === 'salon_logo') {
      await supabase
        .from('salons')
        .update({ logo_url: url, updated_at: new Date().toISOString() })
        .eq('id', salonId)
      // Alte Logo-Datei aufräumen — es gibt immer nur eins.
      const { data: stale } = await supabase
        .from('user_uploads')
        .select('id, storage_path')
        .eq('salon_id', salonId)
        .eq('target', 'salon_logo')
        .neq('id', record.id)
      for (const row of (stale ?? []) as { id: string; storage_path: string }[]) {
        await supabase.from('user_uploads').delete().eq('id', row.id)
        await supabase.storage.from(BUCKET).remove([row.storage_path])
      }
    } else if (target === 'salon_gallery') {
      await supabase
        .from('salons')
        .update({ gallery: [...currentGallery, url], updated_at: new Date().toISOString() })
        .eq('id', salonId)
    } else if (target === 'listing_photo') {
      await supabase
        .from('rental_equipment')
        .update({ images: [...currentImages, url], updated_at: new Date().toISOString() })
        .eq('id', equipmentId)
    }

    return NextResponse.json({ upload: { ...record, url } }, { status: 201 })
  } catch (err) {
    if (err instanceof ListingError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('uploads POST error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
