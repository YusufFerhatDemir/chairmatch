import { NextRequest, NextResponse } from 'next/server'
import { createReview, getReviews } from '@/modules/reviews/review.actions'
import { getServerSession } from '@/modules/auth/session'
import { withApi, apiError } from '@/lib/api-wrapper'

export const POST = withApi(async (request: Request) => {
  const session = await getServerSession()
  if (!session?.user?.id) return apiError('Nicht authentifiziert', 401)

  const body = await (request as NextRequest).json().catch(() => null)
  if (!body || typeof body !== 'object') return apiError('Ungültige Anfrage', 400)

  // Backward-Compat: wenn Frontend kein reviewType schickt aber salonId + bookingId,
  // dann ist es eine "customer_to_salon" Bewertung (klassisch)
  const safeBody = body as Record<string, unknown>
  const normalizedBody = {
    ...safeBody,
    reviewType: safeBody.reviewType || 'customer_to_salon',
  }

  const result = await createReview(normalizedBody)
  if ('error' in result) return apiError(result.error ?? 'Review konnte nicht erstellt werden', 400)
  return NextResponse.json(result, { status: 201 })
})

export const GET = withApi(async (request: Request) => {
  const { searchParams } = new URL((request as NextRequest).url)
  const salonId = searchParams.get('salonId')
  if (!salonId) return apiError('salonId erforderlich', 400)

  const reviews = await getReviews(salonId)
  return NextResponse.json(reviews)
})
