'use client'

import EmptyState from './EmptyState'

interface Column<T> {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  onRowClick?: (row: T) => void
  maxRows?: number
}

export default function DataTable<T extends Record<string, unknown>>({
  columns, data, emptyMessage = 'Keine Daten vorhanden', onRowClick, maxRows,
}: DataTableProps<T>) {
  const rows = maxRows ? data.slice(0, maxRows) : data

  if (data.length === 0) {
    return <EmptyState icon="📋" title={emptyMessage} />
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(176,144,96,0.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(176,144,96,0.12)' }}>
            {columns.map(col => (
              <th key={col.key} style={{
                padding: '10px 12px',
                textAlign: col.align || 'left',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--stone)',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                width: col.width,
                whiteSpace: 'nowrap',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              style={{
                borderBottom: '1px solid rgba(176,144,96,0.06)',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background .15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(176,144,96,0.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {columns.map(col => (
                <td key={col.key} style={{
                  padding: '10px 12px',
                  textAlign: col.align || 'left',
                  color: 'var(--cream)',
                  whiteSpace: 'nowrap',
                }}>
                  {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
