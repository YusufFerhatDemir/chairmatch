/**
 * GET /api/salons/[id]/images — alle Bilder eines Salons abrufen.
 *
 * Public-Read: sichtbar für jeden (für Salon-Detail-Page).
 * Filterbar nach `?type=logo|cover|gallery|team|before_after`.
 *
 * Datenshape ist auf das nötigste reduziert (id, url, type, sort) —
 * keine internen Felder wie storage_path leaken.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_TYPES = new Set(['logo', 'cover', 'gallery', 'before_after', 'team'])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Ungültige Salon-ID' }, { status: 400 })
    }

    const url = new URL(request.url)
    const typeFilter = url.searchParams.get('type')

    const supabase = getSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from('salon_images')
      .select('id, image_type, url, sort_order, created_at')
      .eq('salon_id', id)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (typeFilter && VALID_TYPES.has(typeFilter)) {
      q = q.eq('image_type', typeFilter)
    }

    const { data, error } = await q
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ images: data || [] })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
