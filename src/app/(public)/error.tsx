'use client'

import { BrandErrorScreen } from '@/components/BrandErrorScreen'

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <BrandErrorScreen error={error} reset={reset} source="public-route" />
}
