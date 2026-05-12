'use client'

import { BrandErrorScreen } from '@/components/BrandErrorScreen'

export default function ProviderError({
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
      source="provider-route"
      title="Dein Dashboard konnte nicht geladen werden"
      description="Es gab ein Problem beim Laden deiner Provider-Ansicht. Bitte versuche es erneut."
    />
  )
}
