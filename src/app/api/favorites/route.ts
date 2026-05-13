import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { auth } from '@/modules/auth/auth.config'
import { withApi, apiError } from '@/lib/api-wrapper'

const favSchema = z.object({
  salonId: z.string().uuid(),
  action: z.enum(['add', 'remove']),
})

export const POST = withApi(async (req: Request) => {
  const session = await auth()
  if (!session?.user?.id) return apiError('Nicht angemeldet', 401)

  const raw = await (req as NextRequest).json().catch(() => null)
  const parsed = favSchema.safeParse(raw)
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400)

  const { salonId, action } = parsed.data
  const supabase = getSupabaseAdmin()

  if (action === 'add') {
    const { error } = await supabase
      .from('favorites')
      .upsert({ customer_id: session.user.id, salon_id: salonId }, { onConflict: 'customer_id,salon_id' })
    if (error) return apiError(error.message, 500)
  } else {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('customer_id', session.user.id)
      .eq('salon_id', salonId)
    if (error) return apiError(error.message, 500)
  }

  return NextResponse.json({ success: true })
})

export const GET = withApi(async () => {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ favorites: [] })

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('favorites')
    .select('salon_id')
    .eq('customer_id', session.user.id)

  return NextResponse.json({
    favorites: (data ?? []).map((f: { salon_id: string }) => f.salon_id)
  })
})
