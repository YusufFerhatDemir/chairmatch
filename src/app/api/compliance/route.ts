import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { auth } from '@/modules/auth/auth.config'
import { isAdminOrAbove } from '@/lib/rbac'

const VALID_DOC_TYPES = [
  'gewerbeanmeldung',
  'gesundheitszeugnis',
  'hygienezertifikat',
  'berufsqualifikation',
  'haftpflichtversicherung',
  'datenschutzerklaerung',
  'preisliste_aushang',
  'erste_hilfe',
  'brandschutz',
  'kassenbuch',
  'meisterbrief',
] as const

export type ComplianceDocumentType = (typeof VALID_DOC_TYPES)[number]

/**
 * GET /api/compliance?salonId=xxx
 * List compliance documents for a salon.
 * Admin sees all; salon owner sees only their own.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const salonId = request.nextUrl.searchParams.get('salonId')
    if (!salonId) {
      return NextResponse.json({ error: 'salonId ist erforderlich' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const role = (session.user as { role?: string })?.role
    const isAdmin = isAdminOrAbove(role)

    // Non-admin: verify the user owns this salon
    if (!isAdmin) {
      const { data: salon } = await supabase
        .from('salons')
        .select('owner_id')
        .eq('id', salonId)
        .single()

      if (!salon || salon.owner_id !== session.user.id) {
        return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 })
      }
    }

    const { data, error } = await supabase
      .from('compliance_documents')
      .select('*')
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ documents: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/**
 * POST /api/compliance
 * Upload a new compliance document.
 * Body: { salonId, documentType, fileUrl, fileName, expiresAt? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { salonId, documentType, fileUrl, fileName, expiresAt } = body

    if (!salonId || typeof salonId !== 'string') {
      return NextResponse.json({ error: 'salonId ist erforderlich' }, { status: 400 })
    }
    if (!documentType || !VALID_DOC_TYPES.includes(documentType)) {
      return NextResponse.json(
        { error: `Ungültiger documentType. Erlaubt: ${VALID_DOC_TYPES.join(', ')}` },
        { status: 400 }
      )
    }
    if (!fileUrl || typeof fileUrl !== 'string') {
      return NextResponse.json({ error: 'fileUrl ist erforderlich' }, { status: 400 })
    }
    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'fileName ist erforderlich' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const role = (session.user as { role?: string })?.role
    const isAdmin = isAdminOrAbove(role)

    // Non-admin: verify ownership
    if (!isAdmin) {
      const { data: salon } = await supabase
        .from('salons')
        .select('owner_id')
        .eq('id', salonId)
        .single()

      if (!salon || salon.owner_id !== session.user.id) {
        return NextResponse.json({ error: 'Kein Zugriff auf diesen Salon' }, { status: 403 })
      }
    }

    const { data, error } = await supabase
      .from('compliance_documents')
      .insert({
        salon_id: salonId,
        document_type: documentType,
        file_url: fileUrl,
        file_name: fileName,
        expires_at: expiresAt || null,
        status: 'pending',
        uploaded_by: session.user.id,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
