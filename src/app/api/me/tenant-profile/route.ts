import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Mieter-Profil + Suchradius.
 *
 * Ersetzt die localStorage-Keys `cm_mieter_profil` und `cm_mieter_radius`.
 * Beide Seiten schreiben in dieselbe Zeile (tenant_profiles), deshalb ist
 * PUT ein Teil-Update: nicht gesendete Felder bleiben unangetastet.
 */

const putSchema = z
  .object({
    display_name: z.string().trim().max(120).optional(),
    job: z.string().trim().max(80).optional(),
    license_number: z.string().trim().max(80).optional(),
    search_radius_km: z.coerce.number().int().min(1).max(50).optional(),
    search_city: z.string().trim().max(120).optional(),
  })
  .strict()

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tenant_profiles')
    .select('display_name, job, license_number, search_radius_km, search_city')
    .eq('user_id', session.user.id)
    .limit(1)

  if (error) {
    console.error('tenant-profile GET failed:', error)
    return NextResponse.json({ error: 'Profil konnte nicht geladen werden' }, { status: 500 })
  }

  // Noch nie gespeichert → Defaults, damit das Formular nicht leer bleibt.
  const row = data?.[0] ?? null
  return NextResponse.json({
    profile: {
      display_name: row?.display_name ?? '',
      job: row?.job ?? '',
      license_number: row?.license_number ?? '',
      search_radius_km: row?.search_radius_km ?? 10,
      search_city: row?.search_city ?? '',
    },
  })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Keine Änderungen übermittelt' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tenant_profiles')
    .upsert(
      { user_id: session.user.id, ...parsed.data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select('display_name, job, license_number, search_radius_km, search_city')
    .single()

  if (error) {
    console.error('tenant-profile PUT failed:', error)
    return NextResponse.json({ error: 'Profil konnte nicht gespeichert werden' }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}
