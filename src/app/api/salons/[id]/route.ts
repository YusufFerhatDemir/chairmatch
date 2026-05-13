import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withApi, apiError } from '@/lib/api-wrapper'

type Ctx = { params: Promise<{ id: string }> }

export const GET = withApi<Ctx>(async (_request, { params }) => {
  const { id } = await params
  if (!id || typeof id !== 'string') return apiError('Ungültige ID', 400)

  const supabase = getSupabaseAdmin()

  // Find salon by slug first, fallback to id
  let salon: { id: string } & Record<string, unknown> | null = null
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

  if (!salon) return apiError('Nicht gefunden', 404)

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

  return NextResponse.json({
    ...salon,
    services: servicesResult.data || [],
    staff: staffResult.data || [],
    rentalEquipment: rentalEquipmentResult.data || [],
  })
})
