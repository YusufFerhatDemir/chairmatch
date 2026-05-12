'use client'

import { BrandErrorScreen } from '@/components/BrandErrorScreen'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <BrandErrorScreen
      error={error}
      reset={reset}
      source="admin-route"
      title="Admin-Bereich nicht erreichbar"
      description="Beim Laden der Admin-Ansicht ist ein Fehler aufgetreten. Bitte versuche es erneut."
    />
  )
}
