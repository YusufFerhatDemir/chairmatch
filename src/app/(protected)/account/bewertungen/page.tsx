/**
 * /account/bewertungen — Offene Bewertungen + erhaltene Bewertungen.
 *
 * Zeigt:
 * - Offene Bewertungs-Aufgaben (Bookings completed, noch nicht bewertet)
 * - Erhaltene Bewertungen als Mieter
 * - Erhaltene Bewertungen als Anbieter (falls Salon-Owner)
 */

import { redirect } from 'next/navigation'
import { getServerSession } from '@/modules/auth/session'
import { getPendingReviews, getUserReviews } from '@/modules/reviews/review.actions'
import { ReviewsPageClient } from './ReviewsPageClient'

export const metadata = { title: 'Meine Bewertungen — ChairMatch' }

export default async function ReviewsPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect('/auth?next=/account/bewertungen')

  const userId = session.user.id
  const [pending, asTenant, asProvider] = await Promise.all([
    getPendingReviews(userId),
    getUserReviews(userId, 'provider_to_tenant'),
    getUserReviews(userId, 'tenant_to_provider'),
  ])

  return (
    <ReviewsPageClient
      pending={pending}
      asTenant={asTenant}
      asProvider={asProvider}
    />
  )
}
