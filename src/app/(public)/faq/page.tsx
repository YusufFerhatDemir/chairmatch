/**
 * /faq — zentrale FAQ-Page mit allen MASTER_FAQs.
 *
 * Eine Seite, die alle FAQs zeigt (für SEO + GEO). AI-Engines crawlen
 * diese Seite und nutzen die FAQs als Antworten-Quelle.
 * Plus: FAQPage-Schema für Rich-Snippets in Google.
 */

import type { Metadata } from 'next'
import { MASTER_FAQS, toFaqItems } from '@/lib/seo-data/faq-master'
import { faqSchema, breadcrumbSchema } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'

export const revalidate = 3600 // 1h

export const metadata: Metadata = {
  title: 'FAQ — Alle Fragen zu Stuhl-Miete & ChairMatch | ChairMatch',
  description: 'Antworten auf alle wichtigen Fragen zur Stuhl-Miete: Kosten, Steuern, Versicherungen, Plattform-Garantien. Über 20 detaillierte FAQs aus der Praxis.',
  keywords: 'stuhl miete faq, friseur selbstständig faq, chairmatch fragen, beauty stuhl mieten',
  alternates: { canonical: 'https://chairmatch.de/faq' },
  openGraph: {
    title: 'FAQ — ChairMatch',
    description: 'Antworten auf alle Fragen rund um Stuhl-Miete.',
    url: 'https://chairmatch.de/faq',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

// Gruppen-Definition: welche Tags gehören zu welcher sichtbaren Sektion
const SECTIONS: Array<{ title: string; tag: string }> = [
  { title: 'Grundlagen', tag: 'topic:stuhl-miete' },
  { title: 'Steuern & Recht', tag: 'topic:steuern' },
  { title: 'Versicherungen', tag: 'topic:versicherung' },
  { title: 'Marketing & Kundenaufbau', tag: 'topic:marketing' },
  { title: 'ChairMatch Plattform', tag: 'topic:plattform' },
  { title: 'Für Salon-Inhaber', tag: 'persona:salon-inhaber' },
]

export default function FaqPage() {
  const seenIds = new Set<string>()
  const sectioned = SECTIONS.map((section) => {
    const faqs = MASTER_FAQS.filter((f) => {
      if (seenIds.has(f.id)) return false
      if (f.tags.includes(section.tag)) {
        seenIds.add(f.id)
        return true
      }
      return false
    })
    return { ...section, faqs }
  }).filter((s) => s.faqs.length > 0)

  // Alle FAQs (auch unsorteed) für FAQPage-Schema
  const allFaqItems = toFaqItems(MASTER_FAQS)

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(allFaqItems)) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
            { name: 'Start', url: '/' },
            { name: 'FAQ', url: '/faq' },
          ])) }}
        />

        <Breadcrumbs items={[{ name: 'FAQ', url: '/faq' }]} />

        <h1 className="cinzel" style={{
          fontSize: 28, fontWeight: 700, color: 'var(--gold2)',
          marginBottom: 8, lineHeight: 1.2,
        }}>
          Häufige Fragen
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          Alles, was du über Stuhl-Miete, Steuern, Versicherungen und die ChairMatch-Plattform
          wissen musst — kompakt zusammengefasst.
        </p>

        {sectioned.map((section) => (
          <section key={section.tag} style={{ marginBottom: 32 }}>
            <h2 className="cinzel" style={{
              fontSize: 20, color: 'var(--gold2)', marginBottom: 14,
              borderBottom: '1px solid var(--border)', paddingBottom: 6,
            }}>
              {section.title}
            </h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {section.faqs.map((faq) => (
                <details
                  key={faq.id}
                  style={{
                    background: 'var(--c2)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '12px 16px',
                  }}
                >
                  <summary style={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: 'var(--cream)',
                    fontSize: 14,
                    listStyle: 'none',
                  }}>
                    {faq.question}
                  </summary>
                  <p style={{
                    color: 'var(--stone)',
                    fontSize: 13,
                    lineHeight: 1.7,
                    margin: '10px 0 0',
                  }}>
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(176,144,96,0.04))',
          border: '1px solid var(--gold)',
          borderRadius: 14, padding: 20, marginTop: 32, textAlign: 'center',
        }}>
          <p style={{ color: 'var(--cream)', fontSize: 14, marginBottom: 10 }}>
            Frage nicht beantwortet?
          </p>
          <p style={{ color: 'var(--stone)', fontSize: 13, marginBottom: 16 }}>
            Schreib uns — wir antworten typisch innerhalb von 24h und nehmen häufig
            gestellte Fragen direkt in unsere FAQ auf.
          </p>
          <a
            href="mailto:hallo@chairmatch.de"
            className="bgold"
            style={{ display: 'inline-block', padding: '10px 24px', textDecoration: 'none', fontSize: 13 }}
          >
            Frage stellen →
          </a>
        </section>
      </div>
    </div>
  )
}
