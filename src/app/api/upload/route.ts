import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, uploadToStorage } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const VALID_IMAGE_TYPES = ['logo', 'cover', 'gallery', 'before_after', 'team'] as const
type ImageType = (typeof VALID_IMAGE_TYPES)[number]

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const ALLOWED_BUCKETS = ['salon-images', 'salons', 'uploads']
    const requestedBucket = (formData.get('bucket') as string) || 'salon-images'
    const bucket = ALLOWED_BUCKETS.includes(requestedBucket) ? requestedBucket : 'salon-images'
    const salonId = formData.get('salonId') as string | null
    const imageType = formData.get('imageType') as string | null

    // Validate file presence
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Ungültiger Dateityp. Erlaubt: JPG, PNG, WebP' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Datei zu groß. Maximal 5 MB erlaubt' },
        { status: 400 }
      )
    }

    // Validate salonId
    if (!salonId) {
      return NextResponse.json({ error: 'salonId ist erforderlich' }, { status: 400 })
    }

    // Validate imageType
    if (!imageType || !VALID_IMAGE_TYPES.includes(imageType as ImageType)) {
      return NextResponse.json(
        { error: `Ungültiger imageType. Erlaubt: ${VALID_IMAGE_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify the user owns this salon or is admin
    const supabase = getSupabaseAdmin()
    const role = (session.user as { role?: string }).role
    if (!['admin', 'super_admin'].includes(role || '')) {
      const { data: salon } = await supabase
        .from('salons')
        .select('owner_id')
        .eq('id', salonId)
        .single()

      if (!salon || salon.owner_id !== session.user.id) {
        return NextResponse.json({ error: 'Kein Zugriff auf diesen Salon' }, { status: 403 })
      }
    }

    // Build a unique storage path — derive extension from validated MIME type
    const MIME_TO_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
    const ext = MIME_TO_EXT[file.type] || 'jpg'
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).slice(2, 8)
    const storagePath = `${salonId}/${imageType}/${timestamp}-${randomSuffix}.${ext}`

    // Upload to Supabase Storage
    const url = await uploadToStorage(bucket, storagePath, file)

    // Save record in salon_images table
    const { data: record, error: insertError } = await supabase
      .from('salon_images')
      .insert({
        salon_id: salonId,
        image_type: imageType,
        url,
        storage_path: storagePath,
        bucket,
        uploaded_by: session.user.id,
      })
      .select('id, url')
      .single()

    if (insertError) {
      // If DB insert fails, try to clean up the uploaded file
      await supabase.storage.from(bucket).remove([storagePath]).catch(() => {})
      return NextResponse.json({ error: `Datenbankfehler: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ url: record.url, id: record.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
