'use client'

import { useState } from 'react'
import { faqSchema, type FaqItem } from '@/lib/seo'

/**
 * FAQ-Komponente mit Accordion + JSON-LD FAQPage Schema.
 *
 * Verwendung:
 *   <FAQ items={[
 *     { question: 'Was kostet ChairMatch?', answer: '0% für Kunden, ...' },
 *   ]} />
 *
 * Schema.org JSON-LD wird automatisch eingefügt — AI-Engines + Google
 * extrahieren die Antworten direkt.
 */
export function FAQ({
  items,
  title = 'Häufige Fragen',
  className,
}: {
  items: FaqItem[]
  title?: string
  className?: string
}) {
  const [open, setOpen] = useState<number | null>(0)

  if (!items || items.length === 0) return null

  return (
    <section className={className} style={{ width: '100%', margin: '40px 0' }}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(items)) }}
      />
      {title && (
        <h2 className="cinzel" style={{ fontSize: 22, color: 'var(--gold2)', marginBottom: 16, fontWeight: 600 }}>
          {title}
        </h2>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, idx) => {
          const isOpen = open === idx
          return (
            <details
              key={idx}
              open={isOpen}
              onToggle={(e) => {
                if ((e.target as HTMLDetailsElement).open) setOpen(idx)
                else if (isOpen) setOpen(null)
              }}
              style={{
                background: 'var(--c2)',
                borderRadius: 12,
                border: '1px solid var(--border)',
                padding: '14px 16px',
                cursor: 'pointer',
              }}
            >
              <summary style={{
                color: 'var(--cream)',
                fontWeight: 600,
                fontSize: 14,
                listStyle: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}>
                <span>{item.question}</span>
                <span style={{ color: 'var(--gold2)', fontSize: 18, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
              </summary>
              <div
                style={{
                  marginTop: 12,
                  color: 'var(--stone)',
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {item.answer}
              </div>
            </details>
          )
        })}
      </div>
    </section>
  )
}
