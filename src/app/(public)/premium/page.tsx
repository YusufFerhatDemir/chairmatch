/**
 * /premium — Hub-Page für alle Medical-Beauty-Premium-Services.
 *
 * Strategie: zentrale Übersicht aller hochpreisigen Behandlungen,
 * SEO-Boost durch interne Verlinkung zu allen Money-Pages.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { BackButton } from '@/components/BackButton'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { PHASE_1_CITIES } from '@/lib/seo-data/cities'
import {
  Sparkles, Scissors, Smile, Eye, Snowflake, Syringe,
  type LucideIcon,
} from 'lucide-react'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Medical Beauty Premium — Haartransplantation, Zähne, Augenlasern | ChairMatch',
  description: 'Verifizierte Premium-Kliniken in Deutschland: Haartransplantation, Zahnimplantate, Augenlasern, Longevity, IV-Infusionen, Ästhetik. Transparente Preise.',
  keywords: 'medical beauty deutschland, schönheitsklinik, haartransplantation, zahnimplantate, augenlasern, longevity, anti aging, biohacking',
  alternates: { canonical: 'https://www.chairmatch.de/premium' },
  openGraph: {
    title: 'Medical Beauty Premium — Verifizierte Kliniken in Deutschland',
    description: 'Haartransplantation, Zahnimplantate, Augenlasern, Longevity, IV-Infusionen, Ästhetik — transparente Preise, verifizierte Anbieter.',
    url: 'https://www.chairmatch.de/premium',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChairMatch — Medical Beauty Premium' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Medical Beauty Premium — Verifizierte Kliniken | ChairMatch',
    description: 'Haartransplantation, Zahnimplantate, Augenlasern, Longevity & mehr — transparente Preise, verifizierte Anbieter.',
    images: ['/og-image.png'],
  },
}

// Service-Schema: ChairMatch vermittelt Raum-/Arbeitsplatz-Vermietung an Ärzte
// und Kliniken — bewusst OHNE medizinische Claims (kein MedicalClinic/MedicalProcedure).
const SERVICE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': 'https://www.chairmatch.de/premium#service',
  name: 'OP-Raum & Behandlungsraum Vermittlung für Medical-Beauty-Praxen',
  serviceType: 'OP-Raum & Behandlungsraum Vermietung',
  provider: { '@id': 'https://www.chairmatch.de/#organization' },
  areaServed: { '@type': 'Country', name: 'Germany' },
  url: 'https://www.chairmatch.de/premium',
}

interface PremiumService {
  slug: string
  title: string
  tagline: string
  priceFrom: string
  icon: LucideIcon
  highlight?: boolean
}

const SERVICES: PremiumService[] = [
  {
    slug: 'haartransplantation',
    title: 'Haartransplantation',
    tagline: 'FUE · DHI · Saphir',
    priceFrom: 'ab 2.490 €',
    icon: Scissors,
    highlight: true,
  },
  {
    slug: 'zahnimplantate',
    title: 'Zahnimplantate',
    tagline: 'Implantate · All-on-4 · Veneers',
    priceFrom: 'ab 1.490 €',
    icon: Smile,
    highlight: true,
  },
  {
    slug: 'augenlasern',
    title: 'Augenlasern',
    tagline: 'LASIK · Femto · ReLEx Smile',
    priceFrom: 'ab 1.490 €',
    icon: Eye,
    highlight: true,
  },
  {
    slug: 'longevity',
    title: 'Longevity-Center',
    tagline: 'Cryo · HBOT · HIFU · EMS',
    priceFrom: 'ab 29 €',
    icon: Snowflake,
  },
  {
    slug: 'iv-infusionen',
    title: 'IV-Infusionen',
    tagline: 'NAD+ · Glutathion · Vitamin-Drips',
    priceFrom: 'ab 79 €',
    icon: Syringe,
  },
  {
    slug: 'category/aesthetik',
    title: 'Ästhetik',
    tagline: 'Botox · Filler · Anti-Aging',
    priceFrom: 'ab 290 €',
    icon: Sparkles,
  },
]

export default function PremiumHubPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        {/* BreadcrumbList-Schema kommt aus der <Breadcrumbs>-Komponente — hier bewusst kein zweites. */}
        <script type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_SCHEMA) }} />

        <div style={{ marginBottom: 14 }}>
          <BackButton href="/" label="Zurück zur Startseite" />
        </div>
        <Breadcrumbs items={[{ name: 'Medical Beauty', url: '/premium' }]} />

        <section style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: 'var(--gold2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
            Premium-Kliniken · Verifiziert
          </p>
          <h1 className="cinzel" style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold2)', lineHeight: 1.2, margin: '0 0 12px' }}>
            Medical Beauty Deutschland
          </h1>
          <p style={{ color: 'var(--cream)', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
            Verifizierte Premium-Kliniken in deiner Stadt — von Haartransplantation bis Anti-Aging.
            Deutsche Approbation, transparente Preise, ohne Türkei-Risiko.
          </p>
          <p style={{ color: 'var(--stone)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
            Alle Anbieter werden geprüft (Approbation, Versicherung, Erfahrung) bevor sie hier gelistet werden.
          </p>
        </section>

        {/* Premium Services Grid */}
        <section style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
          {SERVICES.map((service) => {
            const Icon = service.icon
            return (
              <Link
                key={service.slug}
                href={`/${service.slug}` as never}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 16,
                  background: service.highlight
                    ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(176,144,96,0.04))'
                    : 'var(--c2)',
                  border: service.highlight ? '2px solid var(--gold)' : '1px solid var(--border)',
                  borderRadius: 14,
                  textDecoration: 'none',
                  transition: 'transform .2s, border-color .2s',
                }}
              >
                <div style={{
                  width: 48, height: 48,
                  borderRadius: 12,
                  background: service.highlight
                    ? 'linear-gradient(135deg, var(--gold), var(--gold2))'
                    : 'var(--c3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={22} color={service.highlight ? '#080706' : 'var(--gold)'} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="cinzel" style={{
                    fontSize: 16, fontWeight: 700, color: 'var(--cream)',
                    margin: '0 0 2px', lineHeight: 1.2,
                  }}>
                    {service.title}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0 }}>
                    {service.tagline}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 12, color: 'var(--gold2)', fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>
                    {service.priceFrom}
                  </p>
                  <p style={{ fontSize: 18, color: 'var(--gold)', margin: '2px 0 0' }}>→</p>
                </div>
              </Link>
            )
          })}
        </section>

        {/* Warum ChairMatch */}
        <section style={{
          background: 'var(--c2)', borderRadius: 14, padding: 20, marginBottom: 24,
          border: '1px solid var(--border)',
        }}>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', margin: '0 0 14px' }}>
            Warum ChairMatch?
          </h2>
          <div style={{ display: 'grid', gap: 10, fontSize: 13, color: 'var(--cream)' }}>
            <Bullet text="Nur Kliniken mit deutscher Approbation + Versicherung" />
            <Bullet text="Transparente Preise vor Buchung — keine versteckten Kosten" />
            <Bullet text="Echte Patientenbewertungen — keine gekauften Testimonials" />
            <Bullet text="Deutsche Nachsorge ohne 2. Türkei-Reise" />
            <Bullet text="Bei Komplikationen deutsches Patientenrecht" />
            <Bullet text="Erstberatung oft kostenlos" />
          </div>
        </section>

        <section style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ fontSize: 13, color: 'var(--cream)', margin: '0 0 14px' }}>
            Du bist Klinik-Inhaber und willst dich listen?
          </p>
          <Link href="/anbieter/wie-es-funktioniert" className="boutline" style={{
            display: 'inline-block', padding: '10px 22px',
            fontSize: 12, fontWeight: 700,
            textDecoration: 'none', borderRadius: 10,
          }}>
            Als Premium-Klinik registrieren →
          </Link>
        </section>

        {/* Interne Verlinkung: Stadt-Hubs (Stil analog [stadt]-Cross-Links) */}
        <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 12 }}>Räume &amp; Arbeitsplätze in deiner Stadt:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PHASE_1_CITIES.filter((c) => c.phase <= 2).map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Bullet({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ color: 'var(--green)', fontSize: 14, flexShrink: 0, marginTop: -1 }}>✓</span>
      <span style={{ flex: 1 }}>{text}</span>
    </div>
  )
}
