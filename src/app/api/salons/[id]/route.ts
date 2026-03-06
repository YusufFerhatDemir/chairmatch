import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    // Find salon by slug first, fallback to id
    let salon = null
    const { data: bySlug } = await supabase
      .from('salons')
      .select('*')
      .eq('slug', id)
      .limit(1)
      .maybeSingle()
    if (bySlug) {
      salon = bySlug
    } else {
      const { data: byId } = await supabase
        .from('salons')
        .select('*')
        .eq('id', id)
        .limit(1)
        .maybeSingle()
      salon = byId
    }
    const error = !salon

    if (error || !salon) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    // Fetch related data in parallel
    const [servicesResult, staffResult, rentalEquipmentResult] = await Promise.all([
      supabase
        .from('services')
        .select('*')
        .eq('salon_id', salon.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('staff')
        .select('*')
        .eq('salon_id', salon.id)
        .eq('is_active', true),
      supabase
        .from('rental_equipment')
        .select('*')
        .eq('salon_id', salon.id)
        .eq('is_available', true),
    ])

    const result = {
      ...salon,
      services: servicesResult.data || [],
      staff: staffResult.data || [],
      rentalEquipment: rentalEquipmentResult.data || [],
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
