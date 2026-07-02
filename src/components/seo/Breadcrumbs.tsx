'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { breadcrumbSchema, type BreadcrumbItem } from '@/lib/seo'

/**
 * Breadcrumbs-Komponente mit JSON-LD BreadcrumbList Schema.
 *
 * Verwendung:
 *   <Breadcrumbs items={[
 *     { name: 'Köln', url: '/koeln' },
 *     { name: 'Friseur', url: '/koeln/friseur' },
 *   ]} />
 *
 * "Start" wird automatisch als erstes Element hinzugefügt.
 * Letztes Element ist nicht klickbar (Current Page).
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[]
  className?: string
}) {
  if (!items || items.length === 0) return null

  const fullChain: BreadcrumbItem[] = [{ name: 'Start', url: '/' }, ...items]
  return (
    <nav
      aria-label="Breadcrumb"
      className={className}
      style={{ marginBottom: 16, fontSize: 12 }}
    >
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(fullChain)) }}
      />
      <ol style={{ display: 'flex', flexWrap: 'wrap', gap: 4, listStyle: 'none', padding: 0, margin: 0 }}>
        {fullChain.map((item, idx) => {
          const isLast = idx === fullChain.length - 1
          return (
            <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {idx > 0 && (
                <span aria-hidden="true" style={{ color: 'var(--stone2)' }}>›</span>
              )}
              {isLast ? (
                <span style={{ color: 'var(--cream)', fontWeight: 600 }} aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link href={item.url as Route} style={{ color: 'var(--stone)', textDecoration: 'none' }}>
                  {item.name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
