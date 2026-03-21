import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import {
  createRecommendation,
  getRecommendationsForCustomer,
  markRecommendationViewed,
} from '@/modules/marketplace/recommendation.service'

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

    const body = await req.json()

    // Mark as viewed
    if (body.action === 'view' && body.recommendationId) {
      await markRecommendationViewed(body.recommendationId, session.user.id)
      return NextResponse.json({ success: true })
    }

    // Create recommendation (provider only)
    const role = (session.user as { role?: string }).role
    if (role !== 'anbieter' && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Nur für Anbieter' }, { status: 403 })
    }

    const { bookingId, salonId, staffId, productId, customerId, message } = body
    if (!bookingId || !salonId || !productId || !customerId) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 })
    }

    const { data, error } = await createRecommendation({
      bookingId,
      salonId,
      staffId,
      productId,
      customerId,
      message,
    })

    if (error) return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
