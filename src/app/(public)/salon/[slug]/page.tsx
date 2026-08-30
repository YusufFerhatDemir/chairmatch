export const revalidate = 300 // ISR: 5 Minuten

import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import SalonDetailClient from '@/components/SalonDetailClient'
import { PROVS } from '@/lib/demo-data'
import { getReviews } from '@/modules/reviews/review.actions'
import { salonSchema, geoMeta, cityToSlug, type BreadcrumbItem, jsonLd as jsonLdScript } from '@/lib/seo'
import { getCityBySlug } from '@/lib/seo-data/cities'
import { salonIsPubliclyVisible } from '@/lib/salon-status'

interface Props {
  params: Promise<{ slug: string }>
}

/**
 * Breadcrumb-Kette für Salon-Seiten: Stadt nur verlinken,
 * wenn es dafür eine Stadt-Hub-Route gibt (PHASE_1_CITIES).
 */
function salonBreadcrumbs(name: string, slug: string, city: string | null): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = []
  if (city) {
    const citySlug = cityToSlug(city)
    if (getCityBySlug(citySlug)) {
      items.push({ name: city, url: `/${citySlug}` })
    }
  }
  items.push({ name, url: `/salon/${slug}` })
  return items
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const demo = PROVS.find(p => p.id === slug)
  if (demo) {
    return {
      title: `${demo.nm} — ${demo.city}`,
      description: `${demo.tl}. ★ ${demo.rt} (${demo.rc} Bewertungen). Jetzt Termin buchen bei ${demo.nm} in ${demo.city}.`,
      alternates: { canonical: `https://www.chairmatch.de/salon/${slug}` },
      openGraph: {
        title: `${demo.nm} — Termin buchen | ChairMatch`,
        description: `${demo.tl}. ★ ${demo.rt} Bewertung. ${demo.city}.`,
        url: `https://www.chairmatch.de/salon/${slug}`,
        type: 'website',
      },
    }
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data: salon } = await supabase
      .from('salons')
      .select('name, description, city, avg_rating, review_count, is_active')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()

    // Kein Titel, keine Beschreibung, keine Geo-Meta fuer einen Salon, den
    // die Seite selbst mit 404 beantwortet (siehe unten). Sonst stuenden
    // Name und Stadt eines nicht freigegebenen Salons weiter im
    // <head> — und damit in jeder Vorschau, die einen Link aufloest.
    if (salon && salonIsPubliclyVisible(salon)) {
      // Klassische Geo-Meta-Tags (geo.placename, geo.position, ICBM, geo.region).
      // Salons haben (noch) keine eigenen Koordinaten in der DB — als
      // Lokal-Signal dienen die Stadtzentrum-Koordinaten aus cities.ts.
      const cityData = salon.city ? getCityBySlug(cityToSlug(salon.city)) : undefined

      return {
        title: `${salon.name} — ${salon.city || 'Deutschland'}`,
        description: `${salon.description || salon.name}. ★ ${salon.avg_rating} (${salon.review_count} Bewertungen). Jetzt Termin buchen.`,
        alternates: { canonical: `https://www.chairmatch.de/salon/${slug}` },
        openGraph: {
          title: `${salon.name} — Termin buchen | ChairMatch`,
          description: `${salon.description || salon.name}. ★ ${salon.avg_rating} Bewertung.`,
          url: `https://www.chairmatch.de/salon/${slug}`,
          type: 'website',
        },
        ...(salon.city
          ? {
              other: geoMeta({
                name: salon.city,
                lat: cityData?.lat,
                lng: cityData?.lng,
                regionCode: cityData?.regionCode,
              }),
            }
          : {}),
      }
    }
  } catch {}

  /*
   * Hier landet JEDER Slug, den die Seite anschliessend mit `notFound()`
   * beantwortet: der unbekannte, der gesperrte, der nie freigeschaltete.
   *
   * DASS DAS EIGENE METADATEN BRAUCHT, liegt am Statuscode — und der ist
   * nicht 404, sondern 200. Nachgemessen am 30.08.2026:
   *
   *     GET https://www.chairmatch.de/salon/gibtsnicht-xyz  →  200
   *
   * Der Rumpf ist korrekt („Seite nicht gefunden"), nur der Status nicht.
   * Denselben Soft-404 hat `magazin/[slug]/page.tsx` schon beschrieben —
   * „Ohne dies streamte Next bei on-demand-Rendern bereits 200, bevor
   * notFound() griff". Dort war er mit `dynamicParams = false` zu loesen,
   * weil alle gueltigen Slugs zur Bauzeit feststehen; hier stehen sie in der
   * Datenbank, und ein neu freigeschalteter Salon muss ohne Deploy erreichbar
   * sein. Die Messung stuetzt das: JEDE Route mit `dynamicParams = false`
   * (/magazin, /category, /[stadt]) antwortet sauber mit 404, und genau die
   * zwei ohne (/salon, /listings) antworten mit 200.
   *
   * NAHELIEGENDE, ABER NICHT NACHGEMESSENE URSACHE: unter `(public)` liegt
   * ein `loading.tsx` und damit eine Suspense-Grenze, an der Next die Huelle
   * mitsamt Status hinausschiebt, bevor die Abfrage hier zurueck ist. Wer das
   * angeht, misst es bitte zuerst nach.
   *
   * Was blieb, war der SEO-Schaden, und der hing NICHT am Status allein:
   * hier stand bis hierher `{ title: 'Salon — ChairMatch' }` und sonst
   * nichts. Eine Seite mit Status 200, ohne `noindex`, mit einem generischen
   * Titel — das ist die Einladung, jeden Tippfehler-Link und jeden gesperrten
   * Salon als eigene Seite in den Index zu nehmen. `/listings/[slug]` macht
   * es im selben Repo seit jeher richtig (`robots: { index: false }`).
   *
   * Der Statuscode bleibt offen und ist im Bericht als solcher vermerkt: ihn
   * zu heilen hiesse, die Suspense-Grenze fuer den gesamten oeffentlichen
   * Bereich aufzugeben, und damit den Ladebildschirm. Das ist eine
   * Produktentscheidung, keine, die ein Haerte-Track still trifft.
   */
  return {
    title: 'Salon nicht gefunden — ChairMatch',
    robots: { index: false, follow: true },
  }
}

export default async function SalonDetailPage({ params }: Props) {
  const { slug } = await params

  // Check if this is a demo provider ID (p1, p2, etc.)
  const demoProvider = PROVS.find(p => p.id === slug)

  if (demoProvider) {
    // Render from demo data
    const salonData = {
      id: demoProvider.id,
      name: demoProvider.nm,
      slug: demoProvider.id,
      description: demoProvider.tl,
      category: demoProvider.cat,
      city: demoProvider.city,
      street: demoProvider.st,
      avg_rating: demoProvider.rt,
      review_count: demoProvider.rc,
      is_verified: demoProvider.ver,
      subscription_tier: demoProvider.tier,
      tagline: demoProvider.tl,
      tags: demoProvider.tags,
      phone: null,
      opening_hours: {
        mo: { open: '09:00', close: '18:00' },
        di: { open: '09:00', close: '18:00' },
        mi: { open: '09:00', close: '18:00' },
        do: { open: '09:00', close: '20:00' },
        fr: { open: '09:00', close: '18:00' },
        sa: { open: '10:00', close: '16:00' },
        so: null,
      },
    }

    const services = demoProvider.svs.map(s => ({
      id: s.id, name: s.nm, duration_minutes: s.dur, price_cents: s.pr * 100,
    }))

    const reviews = demoProvider.revs.map((r, i) => ({
      id: `dr${i}`, rating: r.s, comment: r.t, reply: null,
      customer: { full_name: r.u }, created_at: r.d,
    }))

    const rentals = demoProvider.rental.map((r, i) => ({
      id: `rl${i}`, type: r.type,
      name: r.type === 'stuhl' ? 'Stuhl' : r.type === 'liege' ? 'Liege' : r.type === 'opraum' ? 'OP-Raum' : 'Raum',
      price_per_day_cents: r.pr * 100, description: null,
    }))

    const jsonLd = salonSchema({
      id: demoProvider.id,
      name: demoProvider.nm,
      slug: demoProvider.id,
      description: demoProvider.tl,
      category: demoProvider.cat,
      street: demoProvider.st,
      city: demoProvider.city,
      avg_rating: demoProvider.rt,
      review_count: demoProvider.rc,
    })

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
        <SalonDetailClient
          salon={salonData}
          services={services}
          staff={[]}
          reviews={reviews}
          rentals={rentals}
          breadcrumbs={salonBreadcrumbs(demoProvider.nm, slug, demoProvider.city)}
        />
      </>
    )
  }

  // Otherwise try DB
  try {
    const supabase = getSupabaseAdmin()

    let salon = null
    const { data: bySlug } = await supabase
      .from('salons')
      .select('*')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()
    if (bySlug) {
      salon = bySlug
    } else {
      const { data: byId } = await supabase
        .from('salons')
        .select('*')
        .eq('id', slug)
        .limit(1)
        .maybeSingle()
      salon = byId
    }

    if (!salon) notFound()

    /*
     * Track 20: `is_active` entscheidet auch ueber die SICHTBARKEIT.
     *
     * Track 15 hat den nicht freigegebenen Salon von den Geldstrecken
     * genommen und den Direktlink stehen lassen. Diese Seite war der
     * Direktlink: sie hat jeden Salon gerendert, den sie in der Datenbank
     * fand — auch den gerade gesperrten und den, der sich vor fuenf Minuten
     * ueber das oeffentliche Formular selbst eingetragen hat. Mit
     * Geschaeftsname, Adresse, Telefonnummer, Preisliste und einem
     * LocalBusiness-JSON-LD fuer Suchmaschinen.
     *
     * OPERATIVE FOLGE: ein Anbieter sieht seine oeffentliche Seite erst nach
     * dem Freischalten in /admin/anbieter. Vorher ist sie 404 — auch fuer
     * ihn selbst. Die Session hier zu lesen waere der falsche Preis: die
     * Seite laeuft mit ISR (revalidate 300), `cookies()` wuerde sie in
     * dynamisches Rendern zwingen und die Zwischenspeicherung fuer alle
     * kosten. Sein eigener Stand steht ohnehin im Anbieter-Bereich.
     */
    if (!salonIsPubliclyVisible(salon)) notFound()

    /*
     * Bewertungen kommen ueber `getReviews`, NICHT ueber eine eigene Abfrage.
     *
     * Hier stand bis Track 9 ein direktes
     * `from('reviews').select('*, customer:profiles(full_name)')` ohne jeden
     * Filter auf den Bewertungstyp. Miet-Bewertungen tragen aus
     * Legacy-Gruenden dieselbe `salon_id`, sind aber double-blind: sie werden
     * erst sichtbar, wenn beide Seiten bewertet haben oder 14 Tage vergangen
     * sind (`published`, /api/cron/publish-reviews). Diese Seite hat sie
     * ausnahmslos veroeffentlicht — auch die noch gesperrten, mit dem Namen
     * des Bewertenden daneben. Genau die Sperre, die /api/reviews/rental und
     * /api/reviews/aggregate sorgfaeltig durchsetzen, war ueber die
     * oeffentliche Salonseite zu umgehen.
     *
     * `getReviews` haelt die Regel an einer Stelle (`isSalonReview`). Die
     * Begrenzung auf zehn passiert NACH dem Filter — vorher haette ein Salon
     * mit zehn Miet-Bewertungen gar keine Kundenbewertung mehr gezeigt.
     */
    const [servicesRes, alleSalonReviews, staffRes, rentalsRes] = await Promise.all([
      supabase.from('services').select('*').eq('salon_id', salon.id).eq('is_active', true).order('sort_order', { ascending: true }),
      getReviews(salon.id),
      supabase.from('staff').select('*').eq('salon_id', salon.id).eq('is_active', true),
      supabase.from('rental_equipment').select('*').eq('salon_id', salon.id).eq('is_available', true),
    ])
    const reviewsSichtbar = alleSalonReviews.slice(0, 10)

    const salonData = {
      id: salon.id,
      name: salon.name,
      slug: salon.slug,
      description: salon.description,
      category: salon.category || 'barber',
      city: salon.city,
      street: salon.street,
      avg_rating: salon.avg_rating,
      review_count: salon.review_count,
      is_verified: salon.is_verified,
      subscription_tier: salon.subscription_tier || 'starter',
      tagline: salon.description || '',
      tags: [] as string[],
      phone: salon.phone,
      opening_hours: salon.opening_hours as Record<string, { open: string; close: string } | null> | null,
    }

    const dbJsonLd = salonSchema({
      id: salon.id,
      name: salon.name,
      slug: salon.slug || salon.id,
      description: salon.description,
      category: salon.category,
      street: salon.street,
      postal_code: salon.postal_code,
      city: salon.city,
      phone: salon.phone,
      avg_rating: salon.avg_rating,
      review_count: salon.review_count,
      price_range: salon.price_range,
      opening_hours: salon.opening_hours as Record<string, string> | null,
      latitude: salon.latitude,
      longitude: salon.longitude,
    })

    return (
      <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(dbJsonLd) }} />
      <SalonDetailClient
        salon={salonData}
        services={(servicesRes.data || []).map(s => ({ id: s.id, name: s.name, duration_minutes: s.duration_minutes, price_cents: s.price_cents }))}
        staff={(staffRes.data || []).map(m => ({ id: m.id, name: m.name, title: m.title, avatar_url: m.avatar_url }))}
        reviews={reviewsSichtbar.map(r => ({ id: r.id, rating: r.rating, comment: r.comment, reply: r.reply, customer: r.customer, created_at: r.created_at }))}
        rentals={(rentalsRes.data || []).map(r => ({ id: r.id, type: r.type, name: r.name, price_per_day_cents: r.price_per_day_cents, description: r.description }))}
        breadcrumbs={salonBreadcrumbs(salon.name, slug, salon.city)}
      />
      </>
    )
  } catch {
    notFound()
  }
}
