import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/modules/auth/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase-server'

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (!['admin', 'super_admin'].includes(role || '')) {
    return null
  }
  return session
}

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ]
  return lines.join('\n')
}

export async function GET(request: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (!type || !['bookings', 'users', 'revenue', 'compliance'].includes(type)) {
    return NextResponse.json(
      { error: 'Ungültiger Exporttyp. Erlaubt: bookings, users, revenue, compliance' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdmin()

  try {
    let csv = ''
    let filename = ''

    if (type === 'bookings') {
      const { data } = await supabase
        .from('bookings')
        .select('id, salon_id, customer_id, status, total_price, booking_date, start_time, created_at')
        .order('created_at', { ascending: false })
        .limit(10000)

      const headers = ['ID', 'Salon ID', 'Kunden ID', 'Status', 'Preis', 'Datum', 'Uhrzeit', 'Erstellt']
      const rows = (data ?? []).map((b: Record<string, unknown>) => [
        String(b.id ?? ''),
        String(b.salon_id ?? ''),
        String(b.customer_id ?? ''),
        String(b.status ?? ''),
        String(b.total_price ?? '0'),
        String(b.booking_date ?? ''),
        String(b.start_time ?? ''),
        String(b.created_at ?? ''),
      ])
      csv = toCsv(headers, rows)
      filename = 'buchungen'
    }

    if (type === 'users') {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(10000)

      const headers = ['ID', 'Email', 'Name', 'Rolle', 'Aktiv', 'Erstellt']
      const rows = (data ?? []).map((u: Record<string, unknown>) => [
        String(u.id ?? ''),
        String(u.email ?? ''),
        String(u.full_name ?? ''),
        String(u.role ?? ''),
        String(u.is_active ?? ''),
        String(u.created_at ?? ''),
      ])
      csv = toCsv(headers, rows)
      filename = 'benutzer'
    }

    if (type === 'revenue') {
      const { data } = await supabase
        .from('bookings')
        .select('id, salon_id, total_price, status, created_at')
        .in('status', ['completed', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(10000)

      const headers = ['ID', 'Salon ID', 'Preis', 'Status', 'Erstellt']
      const rows = (data ?? []).map((b: Record<string, unknown>) => [
        String(b.id ?? ''),
        String(b.salon_id ?? ''),
        String(b.total_price ?? '0'),
        String(b.status ?? ''),
        String(b.created_at ?? ''),
      ])
      csv = toCsv(headers, rows)
      filename = 'umsatz'
    }

    if (type === 'compliance') {
      const { data: salons } = await supabase
        .from('salons')
        .select('id, name, is_active, is_verified')

      const { data: documents } = await supabase
        .from('owner_documents')
        .select('salon_id, doc_type, status')

      const docsPerSalon: Record<string, { total: number; approved: number; types: string[] }> = {}
      for (const doc of documents ?? []) {
        const sid = (doc as { salon_id: string }).salon_id
        if (!docsPerSalon[sid]) docsPerSalon[sid] = { total: 0, approved: 0, types: [] }
        docsPerSalon[sid].total += 1
        if ((doc as { status?: string }).status === 'approved') {
          docsPerSalon[sid].approved += 1
        }
        docsPerSalon[sid].types.push((doc as { doc_type?: string }).doc_type || 'unknown')
      }

      const headers = ['Salon ID', 'Name', 'Aktiv', 'Verifiziert', 'Dokumente eingereicht', 'Dokumente genehmigt', 'Dokumenttypen']
      const rows = (salons ?? []).map((s: Record<string, unknown>) => {
        const sid = String(s.id)
        const docs = docsPerSalon[sid] || { total: 0, approved: 0, types: [] }
        return [
          sid,
          String(s.name ?? ''),
          String(s.is_active ?? ''),
          String(s.is_verified ?? ''),
          String(docs.total),
          String(docs.approved),
          docs.types.join('; '),
        ]
      })
      csv = toCsv(headers, rows)
      filename = 'compliance'
    }

    const timestamp = new Date().toISOString().slice(0, 10)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="chairmatch-${filename}-${timestamp}.csv"`,
      },
    })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
