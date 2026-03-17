import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { auth } from '@/modules/auth/auth.config'
import { isAdminOrAbove } from '@/lib/rbac'

/**
 * PUT /api/compliance/[id]
 * Update compliance document status (admin only: approve/reject with notes).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const role = (session.user as { role?: string })?.role
    if (!isAdminOrAbove(role)) {
      return NextResponse.json({ error: 'Nur Admins dürfen den Status ändern' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { status, notes } = body

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json(
        { error: 'status muss "approved" oder "rejected" sein' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('compliance_documents')
      .update({
        status,
        reviewer_notes: notes || null,
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/**
 * DELETE /api/compliance/[id]
 * Remove a compliance document.
 * Admin can delete any; salon owner can delete their own pending documents.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabaseAdmin()
    const role = (session.user as { role?: string })?.role
    const isAdmin = isAdminOrAbove(role)

    if (!isAdmin) {
      // Non-admin: can only delete own pending documents
      const { data: doc } = await supabase
        .from('compliance_documents')
        .select('salon_id, status')
        .eq('id', id)
        .single()

      if (!doc) {
        return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 })
      }

      // Verify salon ownership
      const { data: salon } = await supabase
        .from('salons')
        .select('owner_id')
        .eq('id', doc.salon_id)
        .single()

      if (!salon || salon.owner_id !== session.user.id) {
        return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 })
      }

      if (doc.status !== 'pending') {
        return NextResponse.json(
          { error: 'Nur ausstehende Dokumente können gelöscht werden' },
          { status: 400 }
        )
      }
    }

    const { error } = await supabase
      .from('compliance_documents')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
