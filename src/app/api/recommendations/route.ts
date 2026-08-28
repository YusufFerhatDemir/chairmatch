import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  createRecommendation,
  getRecommendationsForCustomer,
  markRecommendationViewed,
} from '@/modules/marketplace/recommendation.service'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const createSchema = z.object({
  bookingId: z.string().regex(UUID),
  productId: z.string().regex(UUID),
  staffId: z.string().regex(UUID).optional(),
  message: z.string().max(500).optional(),
})

const viewSchema = z.object({
  action: z.literal('view'),
  recommendationId: z.string().regex(UUID),
})

/** Get unviewed recommendations for current user */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    const recs = await getRecommendationsForCustomer(session.user.id)
    return NextResponse.json(recs)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/** Create recommendation (provider) or mark as viewed (customer) */
export async function POST(req: NextRequest) {
  try {
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

    // Mark as viewed
    const viewParsed = viewSchema.safeParse(body)
    if (viewParsed.success) {
      await markRecommendationViewed(viewParsed.data.recommendationId, session.user.id)
      return NextResponse.json({ success: true })
    }

    // Create recommendation (provider only)
    const role = (session.user as { role?: string }).role
    if (role !== 'anbieter' && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Nur für Anbieter' }, { status: 403 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { bookingId, productId, staffId, message } = parsed.data
    const supabase = getSupabaseAdmin()

    // Booking laden, Inhaber pruefen, Kunden ableiten.
    // customerId kommt NICHT aus dem Request — wer die Empfehlung anlegt
    // bestimmt nicht, an wen sie geht. Das steht in der Buchung.
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, user_id, salon_id, salons!inner(owner_id)')
      .eq('id', bookingId)
      .maybeSingle()

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 })
    }

    const salon = booking.salons as unknown as { owner_id: string } | null
    if (salon?.owner_id !== session.user.id && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Keine Berechtigung für diesen Salon' }, { status: 403 })
    }

    const { data, error } = await createRecommendation({
      bookingId,
      salonId: booking.salon_id,
      staffId,
      productId,
      customerId: booking.user_id,
      message,
    })

    if (error) return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
