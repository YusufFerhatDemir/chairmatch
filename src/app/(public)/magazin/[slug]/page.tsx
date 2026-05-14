import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MAGAZIN_ARTIKEL, getMagazinArtikel } from '@/lib/seo-data/magazin'
import { breadcrumbSchema, faqSchema } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return MAGAZIN_ARTIKEL.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const a = getMagazinArtikel(slug)
  if (!a) return { title: 'Nicht gefunden' }
  return {
    title: `${a.title} | ChairMatch Magazin`,
    description: a.description,
    keywords: a.keywords.join(', '),
    alternates: { canonical: `https://chairmatch.de/magazin/${slug}` },
    openGraph: {
      title: a.title,
      description: a.description,
      url: `https://chairmatch.de/magazin/${slug}`,
      type: 'article',
      locale: 'de_DE',
      siteName: 'ChairMatch',
      publishedTime: a.publishedAt,
    },
  }
}

/**
 * Sehr simpler Markdown-Renderer für unsere Magazin-Inhalte.
 * Wir nutzen kein remark/rehype-Paket (extra 100 KB), sondern eine
 * Manuel-Implementation für: Headings, Listen, Bold, Tabellen, P-Tags.
 */
function renderMarkdown(md: string): { __html: string } {
  let html = md
  // Tabellen (einfache MD-Tabellen)
  html = html.replace(/((?:^\|.+\|\s*$\n?)+)/gm, (block) => {
    const rows = block.trim().split('\n')
    if (rows.length < 2) return block
    const headers = rows[0].split('|').slice(1, -1).map(c => c.trim())
    // rows[1] ist die Separator-Zeile
    const bodyRows = rows.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()))
    let out = '<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;color:var(--stone)">'
    out += '<thead><tr>' + headers.map(h => `<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border);color:var(--gold2)">${h}</th>`).join('') + '</tr></thead>'
    out += '<tbody>' + bodyRows.map(row =>
      '<tr>' + row.map(c => `<td style="padding:8px;border-bottom:1px solid var(--border)">${c}</td>`).join('') + '</tr>'
    ).join('') + '</tbody>'
    out += '</table>'
    return out
  })

  // Headings
  html = html.replace(/^## (.+)$/gm, '<h2 class="cinzel" style="font-size:22px;color:var(--gold2);margin:28px 0 12px;font-weight:600">$1</h2>')
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:16px;color:var(--cream);margin:20px 0 8px;font-weight:700">$1</h3>')

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--cream)">$1</strong>')

  // Lists
  html = html.replace(/((?:^- .+$\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => l.replace(/^- /, '').trim())
    return '<ul style="color:var(--stone);font-size:14px;line-height:1.8;padding-left:20px;margin:10px 0">' +
      items.map(i => `<li>${i}</li>`).join('') + '</ul>'
  })
  // Numbered Lists
  html = html.replace(/((?:^\d+\. .+$\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => l.replace(/^\d+\. /, '').trim())
    return '<ol style="color:var(--stone);font-size:14px;line-height:1.8;padding-left:20px;margin:10px 0">' +
      items.map(i => `<li>${i}</li>`).join('') + '</ol>'
  })

  // Paragraphs (alles was nicht in einem Block ist)
  html = html.split('\n\n').map(block => {
    if (block.match(/^\s*<(h[1-6]|ul|ol|table)/)) return block
    if (!block.trim()) return ''
    return `<p style="color:var(--stone);font-size:14px;line-height:1.8;margin:12px 0">${block.replace(/\n/g, '<br>')}</p>`
  }).join('\n')

  return { __html: html }
}

export default async function MagazinArticlePage({ params }: Props) {
  const { slug } = await params
  const a = getMagazinArtikel(slug)
  if (!a) notFound()

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: a.title,
            description: a.description,
            datePublished: a.publishedAt,
            author: { '@type': 'Person', name: 'Yusuf Ferhat Demir' },
            publisher: { '@id': 'https://chairmatch.de/#organization' },
            mainEntityOfPage: `https://chairmatch.de/magazin/${slug}`,
            keywords: a.keywords.join(', '),
            articleSection: a.category,
          }) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
            { name: 'Start', url: '/' },
            { name: 'Magazin', url: '/magazin' },
            { name: a.title, url: `/magazin/${slug}` },
          ])) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(a.faqs)) }}
        />

        <Breadcrumbs items={[
          { name: 'Magazin', url: '/magazin' },
          { name: a.title, url: `/magazin/${slug}` },
        ]} />

        <p style={{ fontSize: 11, color: 'var(--gold2)', letterSpacing: 1, margin: '0 0 6px' }}>
          {a.category.toUpperCase()} · {a.readMinutes} MIN LESEN
        </p>

        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
          {a.title}
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.7, marginBottom: 24, fontStyle: 'italic' }}>
          {a.description}
        </p>

        <div dangerouslySetInnerHTML={renderMarkdown(a.content)} />

        <FAQ items={a.faqs} title="Häufige Fragen zum Thema" />

        {/* Weitere Artikel */}
        <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 12, fontWeight: 700 }}>Weitere Artikel</p>
          {MAGAZIN_ARTIKEL.filter((x) => x.slug !== slug).slice(0, 3).map((x) => (
            <Link key={x.slug} href={`/magazin/${x.slug}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 10 }}>
              <article style={{ background: 'var(--c2)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', margin: 0 }}>{x.title}</p>
                <p style={{ fontSize: 11, color: 'var(--stone)', margin: '4px 0 0' }}>{x.readMinutes} Min Lesen</p>
              </article>
            </Link>
          ))}
        </section>
      </div>
    </div>
  )
}
