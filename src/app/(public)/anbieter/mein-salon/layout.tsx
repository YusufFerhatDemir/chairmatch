import type { Metadata } from 'next'

// Interner App-Bereich: kein SEO-Wert, soll nicht in den Google-Index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return children
}
