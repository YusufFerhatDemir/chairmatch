import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { auth } from '@/modules/auth/auth.config'
import { isAdminOrAbove } from '@/lib/rbac'

const REQUIRED_DOCUMENTS = [
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

const DOC_LABELS: Record<string, string> = {
  gewerbeanmeldung: 'Gewerbeanmeldung',
  gesundheitszeugnis: 'Gesundheitszeugnis',
  hygienezertifikat: 'Hygienezertifikat',
  berufsqualifikation: 'Berufsqualifikation',
  haftpflichtversicherung: 'Haftpflichtversicherung',
  datenschutzerklaerung: 'Datenschutzerklärung',
  preisliste_aushang: 'Preisliste / Aushang',
  erste_hilfe: 'Erste-Hilfe-Nachweis',
  brandschutz: 'Brandschutznachweis',
  kassenbuch: 'Kassenbuch',
  meisterbrief: 'Meisterbrief',
}

interface DocumentStatus {
  documentType: string
  label: string
  status: 'present' | 'missing' | 'expired' | 'pending' | 'rejected'
  documentId?: string
  expiresAt?: string | null
}

/**
 * GET /api/compliance/check?salonId=xxx
 * Returns compliance status for a salon:
 * - Per-document status (present, missing, expired, pending, rejected)
 * - Compliance score as percentage
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

    // Non-admin: verify ownership
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

    const { data: documents, error } = await supabase
      .from('compliance_documents')
      .select('id, document_type, status, expires_at')
      .eq('salon_id', salonId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const now = new Date().toISOString()

    // Build a map of best document per type (approved > pending > rejected)
    const docMap = new Map<string, { id: string; status: string; expires_at: string | null }>()
    for (const doc of documents ?? []) {
      const existing = docMap.get(doc.document_type)
      const priority = (s: string) => (s === 'approved' ? 3 : s === 'pending' ? 2 : 1)
      if (!existing || priority(doc.status) > priority(existing.status)) {
        docMap.set(doc.document_type, {
          id: doc.id,
          status: doc.status,
          expires_at: doc.expires_at,
        })
      }
    }

    const statuses: DocumentStatus[] = []
    let approvedCount = 0

    for (const docType of REQUIRED_DOCUMENTS) {
      const doc = docMap.get(docType)

      if (!doc) {
        statuses.push({
          documentType: docType,
          label: DOC_LABELS[docType] || docType,
          status: 'missing',
        })
        continue
      }

      // Check expiry for approved documents
      if (doc.status === 'approved' && doc.expires_at && doc.expires_at < now) {
        statuses.push({
          documentType: docType,
          label: DOC_LABELS[docType] || docType,
          status: 'expired',
          documentId: doc.id,
          expiresAt: doc.expires_at,
        })
        continue
      }

      if (doc.status === 'approved') {
        approvedCount++
        statuses.push({
          documentType: docType,
          label: DOC_LABELS[docType] || docType,
          status: 'present',
          documentId: doc.id,
          expiresAt: doc.expires_at,
        })
      } else if (doc.status === 'pending') {
        statuses.push({
          documentType: docType,
          label: DOC_LABELS[docType] || docType,
          status: 'pending',
          documentId: doc.id,
          expiresAt: doc.expires_at,
        })
      } else {
        statuses.push({
          documentType: docType,
          label: DOC_LABELS[docType] || docType,
          status: 'rejected',
          documentId: doc.id,
        })
      }
    }

    const total = REQUIRED_DOCUMENTS.length
    const score = Math.round((approvedCount / total) * 100)

    const missing = statuses.filter(s => s.status === 'missing').map(s => s.label)
    const expired = statuses.filter(s => s.status === 'expired').map(s => s.label)

    return NextResponse.json({
      salonId,
      score,
      total,
      approved: approvedCount,
      level: score >= 100 ? 'GREEN' : score >= 50 ? 'YELLOW' : 'RED',
      documents: statuses,
      missing,
      expired,
    })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
