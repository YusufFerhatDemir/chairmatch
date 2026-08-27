export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { cityToCoords } from '@/lib/geo/city-coords'
import RentalsMap, { type MapListing } from '@/components/RentalsMap'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Stuhl-Karte: Verfügbare Plätze in Echtzeit',
  description:
    'Alle verfügbaren Friseurstühle, Kosmetik-Kabinen und Behandlungsräume auf einer interaktiven Karte — mit Tagespreis direkt am Pin. Finde freie Plätze in deiner Nähe.',
  keywords: 'stuhlmiete karte, friseurstuhl in der nähe, salonplatz karte, beauty workspace map',
  alternates: { canonical: 'https://www.chairmatch.de/karte' },
  openGraph: {
    title: 'Stuhl-Karte: Verfügbare Plätze in Echtzeit | ChairMatch',
    description: 'Interaktive Karte aller verfügbaren Stühle, Kabinen und Räume — Tagespreis direkt am Pin.',
    url: 'https://www.chairmatch.de/karte',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

interface RentalRow {
  id: string
  name: string | null
  type: string
  price_per_day_cents: number | null
  salon: {
    name: string
    slug: string | null
    city: string | null
    avg_rating: number | null
    is_verified: boolean | null
  } | null
}

/*
 * Bis 2026-08-27 stand hier `DEMO_LISTINGS`: drei erfundene Inserate mit
 * erfundenen Tagespreisen (45/55/65 EUR), erfundenen Bewertungen (4.7-4.9)
 * und erfundenen Salons ("Beispiel-Salon", "Beispiel-Studio",
 * "Beispiel-Barbershop"). Sie wurden immer dann eingeblendet, wenn
 * `listings.length === 0` war — und das galt fuer BEIDE voellig verschiedenen
 * Faelle:
 *
 *   a) die Abfrage ist gescheitert (DB weg, Rechte weg, Timeout)
 *   b) es gibt wirklich keine Inserate mit Kartenposition
 *
 * Der `catch`-Zweig schluckte den Fehler, und die Seite meldete in beiden
 * Faellen "Gerade keine Live-Inserate mit Kartenposition". Im Fall (a) ist
 * das schlicht falsch: die Inserate sind da, nur die Abfrage kam nicht durch
 * — genau der Fehlschlag, den Track 7 fuer die Mieter-Suche aufgedeckt hat.
 *
 * Erfundene Preise auf einer oeffentlichen Seite sind ausserdem nichts, was
 * ein Marktplatz zeigen darf: sie sehen aus wie Marktpreise von ChairMatch.
 *
 * Jetzt gibt es keinen Ersatzbestand mehr. Die Seite sagt, was Sache ist.
 */

const FILTERS = [
  { key: 'stuhl', label: 'Stühle' },
  { key: 'liege', label: 'Liegen' },
  { key: 'raum', label: 'Räume' },
  { key: 'opraum', label: 'OP-Räume' },
]

interface Props {
  searchParams: Promise<{ type?: string }>
}

export default async function KartePage({ searchParams }: Props) {
  const { type: filterType } = await searchParams

  const listings: MapListing[] = []
  let ohnePosition = 0
  let ladefehler = false

  try {
    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('rental_equipment')
      .select('id, name, type, price_per_day_cents, salon:salons(name, slug, city, avg_rating, is_verified)')
      .eq('is_available', true)
      .limit(1000)

    if (filterType && FILTERS.some(f => f.key === filterType)) {
      query = query.eq('type', filterType)
    }

    const { data, error } = await query
    if (error) throw error

    for (const row of (data ?? []) as unknown as RentalRow[]) {
      const coords = cityToCoords(row.salon?.city ?? null)
      if (!coords) {
        ohnePosition++
        continue
      }
      listings.push({
        id: row.id,
        name: row.name,
        type: row.type,
        priceDayCents: row.price_per_day_cents,
        city: row.salon?.city ?? null,
        lat: coords.lat,
        lng: coords.lng,
        salonName: row.salon?.name ?? null,
        salonSlug: row.salon?.slug ?? null,
        verified: row.salon?.is_verified ?? false,
        rating: row.salon?.avg_rating ?? null,
      })
    }
  } catch (e) {
    // Nicht verschlucken: ohne diese Zeile ist ein Rechte- oder
    // Verbindungsfehler in den Logs unsichtbar und sieht auf der Seite aus
    // wie "es gibt gerade nichts".
    console.error('[karte] rental_equipment konnte nicht geladen werden:', e)
    ladefehler = true
  }

  return (
    <div className="shell">
      <div className="screen">
        <div style={{ padding: '0 var(--pad)' }}>
          <Link href="/rentals" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
            &larr; Listenansicht
          </Link>
          <Breadcrumbs items={[{ name: 'Stuhl-Karte', url: '/karte' }]} />
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginTop: 8 }}>
            Stuhl-Karte
          </h1>
          <p style={{ color: 'var(--cream)', fontSize: 'var(--font-sm)', marginTop: 8, lineHeight: 1.45 }}>
            Alle verfügbaren Plätze auf einen Blick — Tagespreis direkt am Pin. Tippe auf einen Pin für Details.
          </p>

          <div style={{ display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {FILTERS.map(f => {
              const isActive = filterType === f.key
              return (
                <a
                  key={f.key}
                  href={isActive ? '/karte' : `/karte?type=${f.key}`}
                  className={isActive ? 'bgold' : 'boutline'}
                  style={{ padding: '8px 16px', fontSize: 12, whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block', borderRadius: 20 }}
                >
                  {f.label}
                </a>
              )
            })}
          </div>

          {ladefehler && (
            <p role="alert" style={{ color: '#FF8888', fontSize: 12, marginTop: 10, background: 'var(--c1)', borderRadius: 10, padding: '8px 12px', lineHeight: 1.45 }}>
              Die Karte konnte gerade nicht geladen werden — das heißt nicht, dass es keine Angebote gibt.
              Bitte gleich noch einmal versuchen oder die{' '}
              <Link href="/rentals" style={{ color: 'var(--gold2)' }}>Listenansicht</Link> nutzen.
            </p>
          )}

          {!ladefehler && listings.length === 0 && (
            <p style={{ color: 'var(--stone)', fontSize: 12, marginTop: 10, background: 'var(--c1)', borderRadius: 10, padding: '8px 12px', lineHeight: 1.45 }}>
              {filterType
                ? 'Für diesen Filter gibt es aktuell kein Inserat mit Kartenposition.'
                : 'Aktuell ist kein Inserat mit Kartenposition eingetragen.'}{' '}
              Alle Angebote stehen in der{' '}
              <Link href="/rentals" style={{ color: 'var(--gold2)' }}>Listenansicht</Link>.
            </p>
          )}
        </div>

        <section style={{ padding: '14px var(--pad) 8px' }}>
          <RentalsMap listings={listings} />
          {ohnePosition > 0 && (
            <p style={{ color: 'var(--stone)', fontSize: 12, marginTop: 8 }}>
              +{ohnePosition} weitere Inserate ohne Kartenposition — siehe{' '}
              <Link href="/rentals" style={{ color: 'var(--gold2)' }}>Listenansicht</Link>.
            </p>
          )}
        </section>

        <section style={{ padding: '8px var(--pad) 40px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <span style={{ color: 'var(--stone)', fontSize: 12 }}>
            <span style={{ display: 'inline-block', width: 26, textAlign: 'center', background: 'linear-gradient(135deg,#BF953F,#FCF6BA 50%,#B38728)', color: '#1a1000', borderRadius: 10, fontWeight: 700, fontSize: 10, padding: '2px 0', marginRight: 6 }}>€</span>
            Pin = Tagespreis
          </span>
          <Link href="/rentals" style={{ color: 'var(--gold2)', fontSize: 12, textDecoration: 'none' }}>
            Zur Listenansicht →
          </Link>
          <Link href="/match" style={{ color: 'var(--gold2)', fontSize: 12, textDecoration: 'none' }}>
            ✨ Match-Finder starten →
          </Link>
        </section>
      </div>
    </div>
  )
}
