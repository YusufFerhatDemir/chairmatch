import { NextRequest, NextResponse } from 'next/server'
import { getAggregateRatings } from '@/modules/reviews/review.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const salonId = searchParams.get('salonId')

    if (!salonId) {
      return NextResponse.json({ error: 'salonId erforderlich' }, { status: 400 })
    }

    const ratings = await getAggregateRatings(salonId)
    return NextResponse.json(ratings)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
