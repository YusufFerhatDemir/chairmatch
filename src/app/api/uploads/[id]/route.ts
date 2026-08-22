import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Auslieferung und Löschung einer hochgeladenen Datei.
 *
 * GET erzeugt pro Aufruf eine frische Signed URL und leitet dorthin um.
 * Damit bleibt der Bucket privat, ohne dass eine ablaufende URL in der DB
 * oder im HTML landet: gespeichert wird immer nur `/api/uploads/{id}`.
 *
 * Zertifikate (is_public = false) sehen nur Eigentümer und Admins.
 */

export const runtime = 'nodejs'

const SIGNED_URL_TTL_SECONDS = 60 * 60

interface UploadRow {
  id: string
  user_id: string
  target: string
  salon_id: string | null
  equipment_id: string | null
  bucket: string
  storage_path: string
  mime_type: string
  is_public: boolean
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function loadUpload(id: string): Promise<UploadRow | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('user_uploads')
    .select('id, user_id, target, salon_id, equipment_id, bucket, storage_path, mime_type, is_public')
    .eq('id', id)
    .limit(1)

  if (error) throw error
  return (data?.[0] as UploadRow | undefined) ?? null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 })
    }

    const upload = await loadUpload(id)
    if (!upload) {
      return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 })
    }

    if (!upload.is_public) {
      const session = await getServerSession()
      const role = (session?.user as { role?: string } | undefined)?.role
      const isOwner = session?.user?.id === upload.user_id
      const isAdmin = ['admin', 'super_admin'].includes(role ?? '')
      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          { error: session?.user ? 'Kein Zugriff auf diese Datei' : 'Nicht authentifiziert' },
          { status: session?.user ? 403 : 401 },
        )
      }
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.storage
      .from(upload.bucket)
      .createSignedUrl(upload.storage_path, SIGNED_URL_TTL_SECONDS)

    if (error || !data?.signedUrl) {
      console.error('uploads signed-url failed:', error)
      return NextResponse.json({ error: 'Datei konnte nicht geladen werden' }, { status: 500 })
    }

    return NextResponse.redirect(data.signedUrl, {
      status: 307,
      // Öffentliche Bilder dürfen kurz im Browser-Cache liegen; die Signed URL
      // lebt eine Stunde, der Redirect wird deutlich früher neu geholt.
      headers: upload.is_public
        ? { 'Cache-Control': 'private, max-age=300' }
        : { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('uploads GET error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 })
    }

    const upload = await loadUpload(id)
    if (!upload) {
      return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 })
    }
    if (upload.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Kein Zugriff auf diese Datei' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()
    const ref = `/api/uploads/${upload.id}`

    // Zuerst die Verknüpfung lösen — sonst zeigt die Galerie auf eine
    // Datei, die es nicht mehr gibt.
    if (upload.target === 'salon_logo' && upload.salon_id) {
      await supabase.from('salons').update({ logo_url: null }).eq('id', upload.salon_id)
    } else if (upload.target === 'salon_gallery' && upload.salon_id) {
      const { data: row } = await supabase
        .from('salons')
        .select('gallery')
        .eq('id', upload.salon_id)
        .single()
      const gallery = ((row?.gallery as unknown[] | null) ?? []).map(String).filter(u => u !== ref)
      await supabase.from('salons').update({ gallery }).eq('id', upload.salon_id)
    } else if (upload.target === 'listing_photo' && upload.equipment_id) {
      const { data: row } = await supabase
        .from('rental_equipment')
        .select('images')
        .eq('id', upload.equipment_id)
        .single()
      const images = ((row?.images as unknown[] | null) ?? []).map(String).filter(u => u !== ref)
      await supabase.from('rental_equipment').update({ images }).eq('id', upload.equipment_id)
    }

    await supabase.from('user_uploads').delete().eq('id', upload.id)
    await supabase.storage.from(upload.bucket).remove([upload.storage_path])

    return NextResponse.json({ deleted: upload.id })
  } catch (err) {
    console.error('uploads DELETE error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
