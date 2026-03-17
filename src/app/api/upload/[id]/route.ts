import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabaseAdmin()

    // Fetch the image record
    const { data: image, error: fetchError } = await supabase
      .from('salon_images')
      .select('id, salon_id, storage_path, bucket')
      .eq('id', id)
      .single()

    if (fetchError || !image) {
      return NextResponse.json({ error: 'Bild nicht gefunden' }, { status: 404 })
    }

    // Verify ownership or admin role
    const role = (session.user as { role?: string }).role
    if (!['admin', 'super_admin'].includes(role || '')) {
      const { data: salon } = await supabase
        .from('salons')
        .select('owner_id')
        .eq('id', image.salon_id)
        .single()

      if (!salon || salon.owner_id !== session.user.id) {
        return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 })
      }
    }

    // Remove from Supabase Storage
    const bucket = image.bucket || 'salon-images'
    if (image.storage_path) {
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([image.storage_path])

      if (storageError) {
        console.error('Storage-Löschfehler:', storageError.message)
        // Continue with DB deletion even if storage removal fails
      }
    }

    // Remove from database
    const { error: deleteError } = await supabase
      .from('salon_images')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: `Datenbankfehler: ${deleteError.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
