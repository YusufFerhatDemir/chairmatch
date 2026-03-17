'use client'

import { useEffect, useState } from 'react'

interface DocumentInfo {
  documentType: string
  label: string
  status: 'present' | 'missing' | 'expired' | 'pending' | 'rejected'
}

interface ComplianceData {
  score: number
  level: 'GREEN' | 'YELLOW' | 'RED'
  documents: DocumentInfo[]
  missing: string[]
  expired: string[]
}

const LEVEL_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  GREEN: { bg: 'rgba(74,138,90,0.2)', color: '#4A8A5A', label: 'Vollständig' },
  YELLOW: { bg: 'rgba(232,168,64,0.2)', color: '#E8A840', label: 'Teilweise' },
  RED: { bg: 'rgba(232,80,64,0.2)', color: '#E85040', label: 'Unvollständig' },
}

const STATUS_ICONS: Record<string, string> = {
  present: '\u2713',
  missing: '\u2717',
  expired: '\u26A0',
  pending: '\u23F3',
  rejected: '\u2717',
}

const STATUS_COLORS: Record<string, string> = {
  present: '#4A8A5A',
  missing: '#E85040',
  expired: '#E8A840',
  pending: '#A0A0A0',
  rejected: '#E85040',
}

interface ComplianceStatusProps {
  salonId: string
  /** Compact mode shows only the badge pill */
  compact?: boolean
  className?: string
}

export function ComplianceStatus({ salonId, compact = false, className }: ComplianceStatusProps) {
  const [data, setData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchStatus() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/compliance/check?salonId=${encodeURIComponent(salonId)}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Fehler ${res.status}`)
        }
        const result = await res.json()
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStatus()
    return () => { cancelled = true }
  }, [salonId])

  if (loading) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          backgroundColor: 'rgba(160,160,160,0.2)',
          color: '#A0A0A0',
        }}
      >
        Laden...
      </span>
    )
  }

  if (error || !data) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          backgroundColor: 'rgba(232,80,64,0.2)',
          color: '#E85040',
        }}
      >
        {error || 'Fehler'}
      </span>
    )
  }

  const level = LEVEL_STYLES[data.level] || LEVEL_STYLES.RED

  // Compact: just the pill
  if (compact) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          backgroundColor: level.bg,
          color: level.color,
        }}
      >
        {level.label} ({data.score}%)
      </span>
    )
  }

  // Full view: badge + document list
  return (
    <div className={className} style={{ fontSize: 13 }}>
      {/* Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span
          style={{
            display: 'inline-block',
            padding: '5px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            backgroundColor: level.bg,
            color: level.color,
          }}
        >
          {level.label} ({data.score}%)
        </span>
        <span style={{ fontSize: 11, color: 'var(--stone, #888)' }}>
          {data.documents.filter(d => d.status === 'present').length} / {data.documents.length} Dokumente
        </span>
      </div>

      {/* Missing documents warning */}
      {data.missing.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            backgroundColor: 'rgba(232,80,64,0.1)',
            border: '1px solid rgba(232,80,64,0.2)',
            marginBottom: 10,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: '#E85040', marginBottom: 4 }}>
            Fehlende Dokumente:
          </p>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {data.missing.map(doc => (
              <li key={doc} style={{ fontSize: 11, color: '#E85040', marginBottom: 2 }}>
                {doc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expired documents warning */}
      {data.expired.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            backgroundColor: 'rgba(232,168,64,0.1)',
            border: '1px solid rgba(232,168,64,0.2)',
            marginBottom: 10,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: '#E8A840', marginBottom: 4 }}>
            Abgelaufene Dokumente:
          </p>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {data.expired.map(doc => (
              <li key={doc} style={{ fontSize: 11, color: '#E8A840', marginBottom: 2 }}>
                {doc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Full document list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.documents.map(doc => (
          <div
            key={doc.documentType}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <span style={{ color: STATUS_COLORS[doc.status], fontSize: 13, width: 18, textAlign: 'center' }}>
              {STATUS_ICONS[doc.status]}
            </span>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--cream, #f5f0e8)' }}>
              {doc.label}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: STATUS_COLORS[doc.status],
                textTransform: 'uppercase',
              }}
            >
              {doc.status === 'present'
                ? 'OK'
                : doc.status === 'missing'
                  ? 'Fehlt'
                  : doc.status === 'expired'
                    ? 'Abgelaufen'
                    : doc.status === 'pending'
                      ? 'Ausstehend'
                      : 'Abgelehnt'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
