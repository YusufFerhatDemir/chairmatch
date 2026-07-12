import type { Metadata } from 'next'
import Link from 'next/link'
import { MAGAZIN_ARTIKEL, getMagazinArtikel, type MagazinArtikel } from '@/lib/seo-data/magazin'
import { PHASE_1_CITIES } from '@/lib/seo-data/cities'
import { speakableSchema } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

const URL = 'https://www.chairmatch.de/stuhlvermietung-guide'

export const metadata: Metadata = {
  title: 'Stuhlvermietung Guide 2026 — Stuhl mieten & vermieten in der Beauty-Branche | ChairMatch',
  description: 'Der komplette Ratgeber zur Stuhlvermietung: Kosten, Mietmodelle, Verträge, Recht und Praxis-Guides für Friseure, Barber, Kosmetikerinnen, Nail- und Lash-Profis — plus Vermieter-Wissen für Salonbetreiber.',
  keywords: 'stuhlvermietung, stuhl mieten, friseurstuhl mieten, stuhlmiete guide, chair rental deutschland',
  alternates: { canonical: URL },
  openGraph: {
    title: 'Stuhlvermietung Guide 2026 — der komplette Ratgeber',
    description: 'Kosten, Verträge, Mietmodelle und Berufs-Guides rund um Stuhl-Miete in der Beauty-Branche.',
    url: URL,
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

/**
 * Themen-Cluster der Pillar-Page. Slugs referenzieren MAGAZIN_ARTIKEL —
 * getMagazinArtikel() löst sie auf; unbekannte Slugs fallen still raus,
 * damit ein umbenannter Artikel die Page nicht bricht.
 */
const CLUSTER: Array<{ heading: string; intro: string; slugs: string[] }> = [
  {
    heading: 'Grundlagen: Wie Stuhl-Miete funktioniert',
    intro: 'Das Modell verstehen, Kosten einordnen und die richtige Miet-Variante wählen — hier startest du.',
    slugs: [
      'wie-funktioniert-stuhl-miete',
      'stuhl-mieten-statt-kaufen',
      'stuhlmiete-kosten-vergleich',
      'tagesmiete-wochenmiete-monatsflat',
      'stuhl-mieten-vs-eigener-salon',
      'checkliste-salonplatz-mieten',
      'chairmatch-vs-kleinanzeigen-facebook',
    ],
  },
  {
    heading: 'Recht, Verträge & Finanzen',
    intro: 'Mietvertrag, Scheinselbstständigkeit, Hygiene, Versicherung, Steuern und Buchhaltung — die Pflichtthemen, sauber erklärt.',
    slugs: [
      'stuhlmietvertrag-muster-checkliste',
      'scheinselbststaendigkeit-stuhlmiete',
      'hygieneverordnung-beauty-selbststaendige',
      'versicherungen-fuer-selbstaendige-friseure',
      'steuern-bei-stuhl-miete',
      'buchhaltung-fuer-selbstaendige-friseure',
    ],
  },
  {
    heading: 'Guides nach Berufsgruppe',
    intro: 'Jedes Gewerk hat eigene Anforderungen an Platz, Ausstattung und Recht — vom Barber Chair bis zur Lash-Kabine.',
    slugs: [
      'selbststaendig-als-friseur',
      'barbershop-stuhl-mieten',
      'wie-viel-verdient-ein-barber',
      'kosmetikstuhl-mieten',
      'selbststaendig-als-kosmetikerin',
      'nageldesign-arbeitsplatz-mieten',
      'lash-brow-arbeitsplatz-mieten',
      'wie-viel-verdient-eine-lash-stylistin',
    ],
  },
  {
    heading: 'Business aufbauen & wachsen',
    intro: 'Vom nebenberuflichen Start über Preise und Kundenaufbau bis zum Marketing-Plan fürs ganze Jahr.',
    slugs: [
      'nebenberuflich-selbststaendig-beauty',
      'preisgestaltung-selbstaendig-friseur',
      'eigene-kunden-aufbauen-selbstaendig',
      '12-monats-marketing-plan-friseur',
      'beauty-coworking-space',
    ],
  },
  {
    heading: 'Für Salonbetreiber: Plätze vermieten',
    intro: 'Leere Stühle in planbaren Umsatz verwandeln — rechtssicher und ohne Personalverantwortung.',
    slugs: ['salon-betreiber-stuhl-vermieten'],
  },
]

const VERTICAL_LINKS = [
  { href: '/friseur-deutschland', label: 'Friseurstuhl mieten' },
  { href: '/barbershop-deutschland', label: 'Barber Chair mieten' },
  { href: '/kosmetik-deutschland', label: 'Kosmetikkabine mieten' },
  { href: '/nagelstudio-deutschland', label: 'Nagelplatz mieten' },
  { href: '/lash-brows-deutschland', label: 'Lash- & Brow-Platz mieten' },
] as const

const GUIDE_FAQS = [
  { question: 'Was ist Stuhlvermietung?', answer: 'Bei der Stuhlvermietung (Chair Rental) mietet ein selbstständiger Beauty-Profi — Friseur, Barber, Kosmetikerin, Nageldesignerin oder Lash-Stylistin — tageweise oder monatlich einen Arbeitsplatz in einem bestehenden Salon. Die Miete ist fix, der komplette Behandlungsumsatz bleibt beim Mieter.' },
  { question: 'Was kostet ein Stuhl zur Miete in Deutschland?', answer: 'Je nach Stadt, Gewerk und Ausstattung 25-80 € pro Tag. Friseur- und Barber-Plätze liegen im Schnitt bei 40-70 €/Tag, Nagel- und Lash-Plätze bei 25-55 €. Monatsflats gibt es zwischen 450 und 1.100 €.' },
  { question: 'Für wen lohnt sich Stuhl-Miete?', answer: 'Für Einsteiger in die Selbstständigkeit (geringe Startkosten, kein Gewerbemietvertrag), für Teilzeit-Selbstständige mit 1-2 Tagen pro Woche und für etablierte Profis, die flexibel bleiben wollen. Salonbetreiber profitieren spiegelbildlich: Leere Plätze werden zu planbarem Mietumsatz.' },
  { question: 'Welche Voraussetzungen brauche ich, um einen Stuhl zu mieten?', answer: 'Eine Gewerbeanmeldung, eine Berufshaftpflichtversicherung und einen schriftlichen Stuhlmietvertrag. Für Friseur-Tätigkeiten gilt zusätzlich die Meisterpflicht (oder eine Ausnahme wie die Altgesellenregelung); Kosmetik, Nails und Lash sind zulassungsfrei.' },
  { question: 'Wo finde ich freie Stühle und Kabinen in meiner Stadt?', answer: 'Auf ChairMatch: nach Stadt und Gewerk filtern, Ausstattung und Tagespreise vergleichen, Platz anfragen und den Mietvertrag direkt digital abschließen — von Berlin über Köln bis München.' },
]

export default function StuhlvermietungGuidePage() {
  const clusters = CLUSTER.map((c) => ({
    ...c,
    artikel: c.slugs.map((s) => getMagazinArtikel(s)).filter((a): a is MagazinArtikel => Boolean(a)),
  }))

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableSchema(
            URL,
            'Stuhlvermietung Guide 2026 — Stuhl mieten & vermieten in der Beauty-Branche',
            'Der komplette Ratgeber zur Stuhlvermietung: Kosten, Mietmodelle, Verträge, Recht und Praxis-Guides für alle Beauty-Berufsgruppen.',
          )) }}
        />
        {/* BreadcrumbList & FAQPage kommen aus <Breadcrumbs>/<FAQ> — keine manuellen Duplikate */}
        <Breadcrumbs items={[{ name: 'Stuhlvermietung Guide', url: '/stuhlvermietung-guide' }]} />

        <p style={{ fontSize: 11, color: 'var(--gold2)', letterSpacing: 1, margin: '0 0 6px' }}>
          RATGEBER-HUB · {MAGAZIN_ARTIKEL.length} GUIDES
        </p>

        <h1 className="cinzel speakable-headline" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
          Stuhlvermietung Guide: Stuhl mieten &amp; vermieten in der Beauty-Branche
        </h1>
        <p className="speakable-summary" style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
          Stuhlvermietung heißt: Selbstständige Beauty-Profis mieten tageweise einen fertigen
          Arbeitsplatz im Salon — für 25-80 € am Tag, ohne Anfangsinvestition und ohne
          Gewerbemietvertrag — und behalten 100 % ihres Umsatzes. Dieser Guide bündelt unser
          gesamtes Praxis-Wissen: von Kosten und Mietmodellen über Verträge und Recht bis zu
          den Einstiegs-Guides für Friseure, Barber, Kosmetikerinnen, Nageldesignerinnen und
          Lash-Stylistinnen.
        </p>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
          Neu hier? Starte mit dem <Link href="/magazin/wie-funktioniert-stuhl-miete" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Grundlagen-Artikel</Link>,
          rechne dein Szenario im <Link href="/freelancer-rechner" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Freelancer-Rechner</Link> durch
          und sieh dir dann <Link href="/explore" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>freie Plätze in deiner Stadt</Link> an.
          Salonbetreiber mit leeren Stühlen finden ihren Einstieg im <Link href="/magazin/salon-betreiber-stuhl-vermieten" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Vermieter-Guide</Link>.
        </p>

        {clusters.map((c) => (
          <section key={c.heading} style={{ marginBottom: 28 }}>
            <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', fontWeight: 600, margin: '0 0 6px' }}>
              {c.heading}
            </h2>
            <p style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.7, margin: '0 0 12px' }}>{c.intro}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {c.artikel.map((a) => (
                <Link key={a.slug} href={`/magazin/${a.slug}`} style={{ textDecoration: 'none' }}>
                  <article style={{ background: 'var(--c2)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', margin: 0, lineHeight: 1.4 }}>{a.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--stone)', margin: '4px 0 0' }}>
                      {a.category.toUpperCase()} · {a.readMinutes} MIN LESEN
                    </p>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section style={{ marginBottom: 28 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', fontWeight: 600, margin: '0 0 6px' }}>
            Stuhl mieten nach Gewerk
          </h2>
          <p style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.7, margin: '0 0 12px' }}>
            Aktuelle Angebote mit Ausstattung und Tagespreisen — deutschlandweit, nach Berufsgruppe sortiert.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {VERTICAL_LINKS.map((v) => (
              <Link key={v.href} href={v.href as never} style={{ fontSize: 13, color: 'var(--gold2)', textDecoration: 'none', background: 'var(--c2)', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 14px' }}>
                {v.label}
              </Link>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', fontWeight: 600, margin: '0 0 6px' }}>
            Stuhlvermietung in deiner Stadt
          </h2>
          <p style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.7, margin: '0 0 12px' }}>
            Preise, Salons und freie Plätze unterscheiden sich stark nach Standort — hier geht es zu den Stadt-Übersichten.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PHASE_1_CITIES.map((city) => (
              <Link key={city.slug} href={`/${city.slug}`} style={{ fontSize: 13, color: 'var(--gold2)', textDecoration: 'none', background: 'var(--c2)', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 14px' }}>
                Stuhl mieten {city.name}
              </Link>
            ))}
          </div>
        </section>

        <FAQ items={GUIDE_FAQS} title="Häufige Fragen zur Stuhlvermietung" />

        <section style={{ background: 'var(--c2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginTop: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', margin: '0 0 6px' }}>Bereit für den eigenen Platz?</p>
          <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.7, margin: '0 0 10px' }}>
            <Link href="/" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>ChairMatch</Link> ist
            Deutschlands Marktplatz für Beauty-Workspace-Sharing: Plätze vergleichen, anfragen und den
            Mietvertrag direkt <Link href="/vertrag-generator" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>digital abschließen</Link>.
          </p>
          <p style={{ fontSize: 13, margin: 0 }}>
            <Link href="/explore" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Freie Plätze ansehen →</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
