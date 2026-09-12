/**
 * Listing-Detail-Page: einzelner Stuhl-/Liegen-/Raum-Slot eines Salons.
 *
 * Phase-2-Money-Page: konkretes Asset mit Preis/Tag, Verfügbarkeit, Anbieter.
 * Indexierung nur wenn Salon aktiv UND Listing veröffentlicht.
 *
 * URL: /listings/[slug] — slug = "<salon-slug>-<service-slug>" oder service.id
 */

export const revalidate = 600 // ISR: 10 Min

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { listingSchema, listingProductSchema, speakableSchema, jsonLd } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

interface Props {
  params: Promise<{ slug: string }>
}

interface ListingRow {
  id: string
  salon_id: string
  name: string
  description: string | null
  category: string | null
  duration_minutes: number
  price_cents: number
  currency: string
  is_active: boolean
  slug?: string | null
  created_at: string
}

interface SalonRow {
  id: string
  slug: string
  name: string
  city: string | null
  category: string | null
  description: string | null
  avg_rating: number | null
  review_count: number | null
  is_active: boolean
  // Optional: Salon-Koordinaten — Spalten existieren (Stand heute) noch nicht
  // in der salons-Tabelle, werden aber automatisch genutzt sobald eine
  // Migration sie ergänzt und das Select unten erweitert wird.
  latitude?: number | null
  longitude?: number | null
}

interface SalonImageRow {
  url: string
  image_type: string
}

/*
 * Das Ergebnis trennt drei Faelle, nicht zwei.
 *
 * Bis hierher gab `loadListing` bei JEDEM Ausgang `null` zurueck — der
 * unbekannte Slug, das abgeschaltete Inserat, der gesperrte Salon UND der
 * Verbindungsabbruch, der abgelaufene Schluessel, der Timeout. Der Rumpf
 * beantwortete alles davon mit `notFound()`. Faellt also die Datenbank aus,
 * antwortete jedes BESTEHENDE Inserat mit „Seite nicht gefunden" — und weil
 * die Seite mit ISR laeuft (revalidate 600), stand diese Auskunft bis zu
 * zehn Minuten fuer alle Besucher und fuer Google.
 *
 * `src/app/(public)/salon/[slug]/page.tsx` hat dieselbe Falle schon
 * abgeraeumt; diese Route war die letzte mit der alten Form.
 */
type ListingErgebnis =
  | { status: 'gefunden'; listing: ListingRow; salon: SalonRow; salonLogo: string | null }
  /** Abfrage lief, es gibt nichts (oder nichts Oeffentliches) → 404. */
  | { status: 'fehlt' }
  /** Abfrage lief NICHT sauber → kein 404, sondern `(public)/error.tsx`. */
  | { status: 'lesefehler' }

async function loadListing(slug: string): Promise<ListingErgebnis> {
  try {
    const supabase = getSupabaseAdmin()

    // Variante 1: explizites slug-Feld auf services
    const { data: bySlug, error: slugFehler } = await supabase
      .from('services')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    if (slugFehler) return { status: 'lesefehler' }

    let listing = bySlug as ListingRow | null

    // Variante 2: id als slug
    if (!listing) {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', slug)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (error) return { status: 'lesefehler' }
      listing = data as ListingRow | null
    }

    if (!listing) return { status: 'fehlt' }

    const { data: salon, error: salonFehler } = await supabase
      .from('salons')
      .select('id, slug, name, city, category, description, avg_rating, review_count, is_active')
      .eq('id', listing.salon_id)
      .limit(1)
      .maybeSingle()
    if (salonFehler) return { status: 'lesefehler' }

    if (!salon || !salon.is_active) return { status: 'fehlt' }

    // Logo des Salons holen — optional, ein Fehler darf die Seite nicht kosten.
    let salonLogo: string | null = null
    try {
      const { data: imgs } = await supabase
        .from('salon_images')
        .select('url, image_type')
        .eq('salon_id', listing.salon_id)
        .eq('image_type', 'logo')
        .limit(1)
        .maybeSingle()
      salonLogo = ((imgs as SalonImageRow | null)?.url) || null
    } catch { /* logo optional */ }

    return { status: 'gefunden', listing, salon: salon as SalonRow, salonLogo }
  } catch {
    return { status: 'lesefehler' }
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await loadListing(slug)

  /*
   * HIER STEHT BEWUSST KEIN `notFound()`. Zwei Messungen vom 12.09.2026.
   *
   * Ausgangslage: diese Route und `/salon/[slug]` beantworten jeden
   * unbekannten Slug mit Status 200 und dem Rumpf „Seite nicht gefunden".
   * Nachgemessen gegen Produktion UND gegen einen lokalen Produktionsbuild
   * auf Port 3210 — beide identisch:
   *
   *     /listings/00000000-0000-4000-a000-000000000000   → 200
   *     /salon/gibt-es-nicht-xyz                         → 200
   *     /category/quatsch      (dynamicParams = false)   → 404
   *
   * VERSUCH 1 — `notFound()` in `generateMetadata` statt im Rumpf.
   * Gedanke: die Metadaten werden vor dem Rumpf aufgeloest, da kann der
   * Status noch gesetzt werden. Gebaut, mit `CM_404_PROBE=1` erzwungen,
   * gemessen auf Port 3211:
   *
   *     /salon/gibt-es-nicht-xyz  → 200   (<title>Seite nicht gefunden</title>)
   *
   * Der Titel belegt, dass `notFound()` LIEF — er kam aus der globalen
   * `not-found.tsx` statt aus den Routen-Metadaten. Gelaufen, Status
   * trotzdem 200. WIDERLEGT.
   *
   * VERSUCH 2 — die Hypothese, die im Kopfkommentar von
   * `salon/[slug]/page.tsx` stand: `(public)/loading.tsx` setzt eine
   * Suspense-Grenze, an der Next die Huelle mitsamt Status hinausschiebt.
   * Dort war daraus geschlossen, die Heilung koste den Ladebildschirm des
   * gesamten oeffentlichen Bereichs — „eine Produktentscheidung".
   * `(public)/loading.tsx` entfernt, neu gebaut (im Build-Ausgang liegt
   * kein loading-Chunk mehr unter `(public)/`), `notFound()` im Rumpf
   * erzwungen:
   *
   *     /salon/gibt-es-nicht-xyz  → 200
   *
   * Ebenfalls WIDERLEGT. Der Ladebildschirm ist NICHT der Preis — er war
   * nie die Ursache.
   *
   * WAS UEBRIG BLEIBT: der einzige gemessene Unterschied ist
   * `dynamicParams`. Jede Route mit `dynamicParams = false` antwortet
   * sauber mit 404, jede mit ISR-Rendern auf Anfrage mit 200 — auch ohne
   * jede Suspense-Grenze. Das deutet auf die On-Demand-ISR-Auslieferung
   * selbst, nicht auf den Seitenbaum. Hier ist `dynamicParams = false`
   * keine Option: ein neu freigeschaltetes Inserat muss ohne Deploy
   * erreichbar sein.
   *
   * Der SEO-Schaden ist unabhaengig vom Status abgedeckt: `robots: { index:
   * false }` steht unten in den Notfall-Metadaten, die Seite wird also nicht
   * indiziert. Wer den Status angeht, faengt bei ISR an — nicht bei
   * `loading.tsx` und nicht bei `generateMetadata`.
   */
  if (data.status !== 'gefunden') {
    return {
      title: 'Listing nicht gefunden — ChairMatch',
      robots: { index: false, follow: true },
    }
  }

  const { listing, salon } = data
  const priceEur = (listing.price_cents / 100).toFixed(0)
  const city = salon.city || 'Deutschland'
  const title = `${listing.name} — ${priceEur} €/Tag bei ${salon.name} in ${city} | ChairMatch`
  const description = listing.description
    ? `${listing.description.slice(0, 155)}`
    : `${listing.name} bei ${salon.name} in ${city} mieten. ${priceEur} € pro Tag. Verifizierter Anbieter, sichere Zahlung über ChairMatch.`

  return {
    title,
    description,
    keywords: [
      listing.name,
      listing.category || '',
      salon.name,
      city,
      'stuhl mieten',
      'beauty workspace',
      'ChairMatch',
    ].filter(Boolean).join(', '),
    alternates: { canonical: `https://www.chairmatch.de/listings/${slug}` },
    openGraph: {
      title: `${listing.name} — ${priceEur} €/Tag in ${city}`,
      description,
      url: `https://www.chairmatch.de/listings/${slug}`,
      type: 'website',
      locale: 'de_DE',
      siteName: 'ChairMatch',
    },
    twitter: { card: 'summary', title, description },
  }
}

export default async function ListingDetailPage({ params }: Props) {
  const { slug } = await params
  const data = await loadListing(slug)

  if (data.status === 'fehlt') notFound()

  // Kein `notFound()` fuer den Lesefehler: das waere die Auskunft „gibt es
  // nicht" fuer ein Inserat, das es gibt — mit ISR (revalidate 600) bis zu
  // zehn Minuten lang. Der geworfene Fehler landet in `(public)/error.tsx`.
  if (data.status === 'lesefehler') {
    throw new Error('Inserat konnte nicht geladen werden')
  }

  const { listing, salon, salonLogo } = data
  const priceEur = listing.price_cents / 100
  const city = salon.city || 'Deutschland'

  const listingInput = {
    id: listing.id,
    slug,
    name: listing.name,
    description: listing.description,
    pricePerDayEur: priceEur,
    category: listing.category || salon.category || 'Beauty Workspace',
    salon: {
      slug: salon.slug,
      name: salon.name,
      city: salon.city,
    },
    availability: 'InStock' as const,
  }

  const baseSchema = listingSchema(listingInput)

  // Product-Node zusätzlich zum Service: Google Rich-Results mit Preis,
  // AggregateRating nur aus echten Salon-Bewertungen (nie erfunden).
  const productSchema = listingProductSchema(
    listingInput,
    salon.avg_rating && salon.review_count
      ? { ratingValue: salon.avg_rating, reviewCount: salon.review_count }
      : null,
  )

  // Salon-Koordinaten (falls vorhanden) als GeoCoordinates am provider-LocalBusiness —
  // stärkt das Lokal-Signal, ohne ein zweites LocalBusiness-Schema zu emittieren.
  // Greift erst, sobald die salons-Tabelle Koordinaten-Spalten bekommt (s. SalonRow).
  const schemaJson = salon.latitude && salon.longitude
    ? {
        ...baseSchema,
        provider: {
          ...baseSchema.provider,
          geo: {
            '@type': 'GeoCoordinates',
            latitude: salon.latitude,
            longitude: salon.longitude,
          },
        },
      }
    : baseSchema

  const faqs = [
    {
      question: `Was kostet ${listing.name}?`,
      answer: `${priceEur.toFixed(0)} € pro Tag. Wochen- oder Monatspakete oft günstiger — direkt beim Anbieter ${salon.name} erfragen.`,
    },
    {
      question: 'Was ist im Tagespreis enthalten?',
      answer: 'Standard inkludiert Strom, Wasser, Klima/Heizung, Wartebereich, WLAN. Werkzeuge und Produkte bringst du selbst mit.',
    },
    {
      question: 'Wie buche ich diesen Stuhlplatz?',
      answer: 'Über den Button „Anfragen" startest du eine geschützte Konversation mit dem Anbieter. Nach Bestätigung läuft die Zahlung sicher über ChairMatch (Stripe Connect, 14 Tage Geld-zurück bei No-Show).',
    },
    {
      question: 'Brauche ich einen Vertrag?',
      answer: 'Ja — ChairMatch generiert den Standard-Mietvertrag automatisch. Beide Seiten unterschreiben digital. Versicherung läuft separat (eigene Berufshaftpflicht empfohlen).',
    },
  ]

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: jsonLd({
            '@context': 'https://schema.org',
            '@graph': [
              schemaJson,
              productSchema,
              speakableSchema(
                `https://www.chairmatch.de/listings/${slug}`,
                `${listing.name} — ${priceEur.toFixed(0)} €/Tag bei ${salon.name} in ${city}`,
              ),
            ],
          }) }}
        />
        {/* BreadcrumbList & FAQPage kommen aus den Komponenten <Breadcrumbs>/<FAQ>
            — hier KEINE manuellen Scripts, sonst doppeltes Schema (Google
            ignoriert dann ggf. beide Rich-Result-Kandidaten). */}
        <Breadcrumbs items={[
          { name: 'Stuhlplätze', url: '/explore' },
          { name: salon.name, url: `/salon/${salon.slug}` },
          { name: listing.name, url: `/listings/${slug}` },
        ]} />

        {/* HERO mit Salon-Logo (Lieferando-Style) */}
        <header style={{ marginBottom: 24, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {salonLogo && (
            <div style={{
              width: 56, height: 56,
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--c2)',
              border: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <Image
                src={salonLogo}
                alt={`${salon.name} Logo`}
                width={56}
                height={56}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}
          <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            {listing.category || 'Stuhlplatz'} · {city}
          </p>
          <h1 className="cinzel speakable-headline" style={{
            fontSize: 26, fontWeight: 700, color: 'var(--gold2)',
            margin: '0 0 8px', lineHeight: 1.2,
          }}>
            {listing.name}
          </h1>
          <p className="speakable-summary" style={{ color: 'var(--cream)', fontSize: 14, marginBottom: 12 }}>
            bei <Link href={`/salon/${salon.slug}`} style={{ color: 'var(--gold)', textDecoration: 'underline' }}>{salon.name}</Link>
            {salon.avg_rating && salon.review_count ? (
              <span style={{ marginLeft: 8, color: 'var(--stone)' }}>
                ★ {salon.avg_rating.toFixed(1)} ({salon.review_count})
              </span>
            ) : null}
          </p>
          </div>
        </header>

        {/* PREIS-CARD */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.14), rgba(176,144,96,0.04))',
          border: '2px solid var(--gold)',
          borderRadius: 14, padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--gold2)' }}>
              {priceEur.toFixed(0)} €
            </span>
            <span style={{ color: 'var(--stone)', fontSize: 14 }}>/ Tag</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--stone)', margin: '0 0 14px' }}>
            inkl. Strom, Wasser, Klima · Werkzeuge & Produkte bringst du mit
          </p>
          <Link
            href={`/booking/${salon.id}?service=${listing.id}`}
            className="bgold"
            style={{ display: 'inline-block', padding: '12px 28px', textDecoration: 'none', fontSize: 14 }}
          >
            Jetzt anfragen →
          </Link>
        </section>

        {/* BESCHREIBUNG */}
        {listing.description && (
          <section style={{ marginBottom: 20 }}>
            <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 10 }}>
              Beschreibung
            </h2>
            <p style={{ color: 'var(--cream)', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {listing.description}
            </p>
          </section>
        )}

        {/* WHAT'S INCLUDED */}
        <section style={{
          background: 'var(--c2)', borderRadius: 14, padding: 18, marginBottom: 20, border: '1px solid var(--border)',
        }}>
          <h2 className="cinzel" style={{ fontSize: 16, color: 'var(--gold2)', margin: '0 0 12px' }}>
            Was ist enthalten?
          </h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
            {[
              'Stuhl mit Spiegel und Beleuchtung',
              'Strom + Wasser inklusive',
              'Klima-/Heizungs-Anlage',
              'Wartebereich für deine Kunden',
              'WLAN für Kunden + dich',
              'Sterilisator für Klingen / Werkzeuge',
            ].map((item) => (
              <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--cream)', fontSize: 13 }}>
                <span style={{ color: 'var(--green)', fontSize: 14 }}>✓</span> {item}
              </li>
            ))}
          </ul>
        </section>

        {/* TRUST */}
        <section style={{
          background: 'var(--c2)', borderRadius: 14, padding: 18, marginBottom: 20, border: '1px solid var(--border)',
        }}>
          <h2 className="cinzel" style={{ fontSize: 16, color: 'var(--gold2)', margin: '0 0 10px' }}>
            Sicher buchen mit ChairMatch
          </h2>
          <div style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--stone)' }}>
            <p style={{ margin: 0 }}>✓ Anbieter verifiziert (Gewerbeschein + Identität)</p>
            <p style={{ margin: 0 }}>✓ Stripe-gesicherte Zahlung — kein Cash-Risiko</p>
            <p style={{ margin: 0 }}>✓ Standard-Mietvertrag automatisch generiert</p>
            <p style={{ margin: 0 }}>✓ 14-Tage-Geld-zurück-Garantie bei No-Show</p>
          </div>
        </section>

        {/* FAQ */}
        <FAQ items={faqs} title="Häufige Fragen" />

        {/* CTA */}
        <section style={{ textAlign: 'center', padding: '24px 0 12px' }}>
          <Link
            href={`/booking/${salon.id}?service=${listing.id}`}
            className="bgold"
            style={{ display: 'inline-block', padding: '12px 28px', textDecoration: 'none', fontSize: 14 }}
          >
            Stuhlplatz anfragen →
          </Link>
          <p style={{ fontSize: 11, color: 'var(--stone2)', marginTop: 12 }}>
            Antwort meist innerhalb 24h · Buchung verpflichtet noch nicht
          </p>
        </section>
      </div>
    </div>
  )
}
