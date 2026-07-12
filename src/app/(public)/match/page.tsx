import type { Metadata } from 'next'
import Link from 'next/link'
import MatchClient from './MatchClient'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Match-Finder: Der passende Stuhl für dich',
  description:
    'KI-gestütztes Matching für Beauty-Profis: Sag uns Beruf, Stadt und Budget — der ChairMatch Match-Finder bewertet jedes Inserat mit einem transparenten Match-Score und zeigt dir die besten Plätze zuerst.',
  keywords:
    'stuhl finden, friseurstuhl matching, salonplatz finden, stuhlmiete empfehlung, beauty workspace match',
  alternates: { canonical: 'https://www.chairmatch.de/match' },
  openGraph: {
    title: 'Match-Finder: Der passende Stuhl für dich | ChairMatch',
    description:
      'Beruf, Stadt, Budget — und der Match-Finder zeigt dir die passendsten Plätze mit transparentem Match-Score.',
    url: 'https://www.chairmatch.de/match',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

export default function MatchPage() {
  return (
    <div className="shell">
      <div className="screen">
        <div style={{ padding: '0 var(--pad)' }}>
          <Link href="/rentals" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
            &larr; Alle Inserate
          </Link>
          <Breadcrumbs items={[{ name: 'Match-Finder', url: '/match' }]} />
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginTop: 8 }}>
            Match-Finder
          </h1>
          <p style={{ color: 'var(--cream)', fontSize: 'var(--font-sm)', marginTop: 8, lineHeight: 1.5 }}>
            Drei Angaben — und unser Matching-Algorithmus bewertet jedes verfügbare Inserat für dich:
            Standort, Budget, Spezialisierung und Salon-Qualität fließen in einen transparenten Match-Score ein.
          </p>
        </div>
        <MatchClient />
      </div>
    </div>
  )
}
