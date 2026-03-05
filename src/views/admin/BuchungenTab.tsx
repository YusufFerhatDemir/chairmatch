import { useEffect, useState } from 'react'
import { useBuchungenStore, type AdminBooking } from '@/stores/buchungenStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

/* ═══ STYLES ═══ */

const s = {
  wrap: { padding: 'var(--pad)' },
  statsRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
    marginBottom: 16,
  },
  statCard: {
    padding: '8px 14px',
    borderRadius: 10,
    background: 'var(--c2)',
    border: '1px solid var(--border)',
    textAlign: 'center' as const,
    minWidth: 70,
    flex: 1,
  },
  statNum: { fontSize: 18, fontWeight: 700 as const, color: 'var(--gold2)' },
  statLabel: { fontSize: 10, color: 'var(--stone)', fontWeight: 600 as const },
  filterRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 12,
    overflowX: 'auto' as const,
    scrollbarWidth: 'none' as const,
  },
  filterBtn: (active: boolean) => ({
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700 as const,
    cursor: 'pointer' as const,
    border: active ? '1.5px solid var(--gold)' : '1.5px solid var(--border)',
    background: active ? 'rgba(200,168,75,0.12)' : 'transparent',
    color: active ? 'var(--gold2)' : 'var(--stone)',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const,
  }),
  // Calendar
  calWrap: {
    background: 'var(--c2)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    padding: 12,
    marginBottom: 16,
  },
  calHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calTitle: { fontWeight: 700 as const, fontSize: 15, color: 'var(--cream)' },
  calNav: {
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--cream)',
    cursor: 'pointer' as const,
    fontSize: 14,
  },
  calGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 2,
  },
  calDayName: {
    textAlign: 'center' as const,
    fontSize: 10,
    fontWeight: 700 as const,
    color: 'var(--stone)',
    padding: 4,
  },
  calDay: (isToday: boolean, isSelected: boolean, hasBookings: boolean) => ({
    textAlign: 'center' as const,
    padding: '6px 2px',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer' as const,
    fontWeight: isToday || isSelected ? (700 as const) : (400 as const),
    background: isSelected
      ? 'var(--gold)'
      : isToday
        ? 'rgba(200,168,75,0.15)'
        : hasBookings
          ? 'rgba(130,202,157,0.1)'
          : 'transparent',
    color: isSelected
      ? '#000'
      : isToday
        ? 'var(--gold2)'
        : 'var(--cream)',
    border: isToday && !isSelected ? '1px solid var(--gold)' : '1px solid transparent',
    transition: 'all 0.15s',
    position: 'relative' as const,
  }),
  calDot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: '#82ca9d',
    margin: '2px auto 0',
  },
  calEmpty: { padding: '6px 2px' },
  // Booking card
  bookCard: {
    display: 'flex',
    gap: 12,
    padding: 14,
    borderBottom: '1px solid var(--border)',
    alignItems: 'flex-start',
  },
  bookTime: {
    width: 56,
    flexShrink: 0,
    textAlign: 'center' as const,
    padding: '6px 4px',
    borderRadius: 8,
    background: 'var(--c2)',
    border: '1px solid var(--border)',
  },
  bookTimeText: { fontSize: 13, fontWeight: 700 as const, color: 'var(--gold2)' },
  bookTimeEnd: { fontSize: 10, color: 'var(--stone)' },
  bookInfo: { flex: 1, minWidth: 0 },
  bookName: {
    fontWeight: 700 as const,
    fontSize: 14,
    color: 'var(--cream)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  },
  bookMeta: { fontSize: 12, color: 'var(--stone)', marginTop: 2 },
  bookActions: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    flexShrink: 0,
  },
  statusBtn: (color: string) => ({
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 700 as const,
    border: `1px solid ${color}`,
    background: 'transparent',
    color,
    cursor: 'pointer' as const,
  }),
}

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]
const STATUS_COLORS: Record<string, 'green' | 'gold' | 'red'> = {
  confirmed: 'green',
  pending: 'gold',
  cancelled: 'red',
}
const STATUS_LABELS: Record<string, string> = {
  confirmed: '✅ Bestätigt',
  pending: '⏳ Ausstehend',
  cancelled: '❌ Storniert',
}

function formatEuro(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

/* ═══ MINI CALENDAR ═══ */

function MiniCalendar({
  selectedDate,
  onSelect,
  bookingDays,
}: {
  selectedDate: string | null
  onSelect: (date: string) => void
  bookingDays: Record<string, number>
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const firstDay = new Date(month.year, month.month, 1)
  const lastDay = new Date(month.year, month.month + 1, 0)
  const startWeekday = (firstDay.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = lastDay.getDate()
  const todayStr = new Date().toISOString().split('T')[0]

  const prevMonth = () => {
    setMonth(m => m.month === 0
      ? { year: m.year - 1, month: 11 }
      : { ...m, month: m.month - 1 }
    )
  }
  const nextMonth = () => {
    setMonth(m => m.month === 11
      ? { year: m.year + 1, month: 0 }
      : { ...m, month: m.month + 1 }
    )
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div style={s.calWrap}>
      <div style={s.calHeader}>
        <button style={s.calNav} onClick={prevMonth}>◀</button>
        <div style={s.calTitle}>
          {MONTH_NAMES[month.month]} {month.year}
        </div>
        <button style={s.calNav} onClick={nextMonth}>▶</button>
      </div>
      <div style={s.calGrid}>
        {DAY_NAMES.map(d => (
          <div key={d} style={s.calDayName}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} style={s.calEmpty} />
          const dateStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const count = bookingDays[dateStr] || 0
          return (
            <div
              key={dateStr}
              style={s.calDay(isToday, isSelected, count > 0)}
              onClick={() => onSelect(dateStr)}
            >
              {day}
              {count > 0 && <div style={s.calDot} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══ BOOKING ROW ═══ */

function BookingRow({ booking, onStatusChange }: {
  booking: AdminBooking
  onStatusChange: (id: string, status: string) => void
}) {
  const startTime = booking.start_time?.slice(0, 5) || '?'
  const endTime = booking.end_time?.slice(0, 5) || '?'

  return (
    <div style={s.bookCard}>
      <div style={s.bookTime}>
        <div style={s.bookTimeText}>{startTime}</div>
        <div style={s.bookTimeEnd}>{endTime}</div>
      </div>
      <div style={s.bookInfo}>
        <div style={s.bookName}>
          {booking.customer_name || booking.customer_email || 'Unbekannt'}
        </div>
        <div style={s.bookMeta}>
          💇 {booking.service_name || '–'}
          {booking.service_duration && ` · ${booking.service_duration} Min.`}
        </div>
        <div style={s.bookMeta}>
          🏪 {booking.salon_name || '–'} · 💰 {formatEuro(booking.price_cents)}
        </div>
        {booking.notes && (
          <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2, fontStyle: 'italic' }}>
            📝 {booking.notes}
          </div>
        )}
        <div style={{ marginTop: 4 }}>
          <Badge variant={STATUS_COLORS[booking.status] || 'gold'}>
            {STATUS_LABELS[booking.status] || booking.status}
          </Badge>
          <span style={{ fontSize: 10, color: 'var(--stone)', marginLeft: 8 }}>
            {booking.booking_date}
          </span>
        </div>
      </div>
      <div style={s.bookActions}>
        {booking.status === 'pending' && (
          <button
            style={s.statusBtn('#82ca9d')}
            onClick={() => onStatusChange(booking.id, 'confirmed')}
          >
            ✅
          </button>
        )}
        {booking.status !== 'cancelled' && (
          <button
            style={s.statusBtn('#f66')}
            onClick={() => onStatusChange(booking.id, 'cancelled')}
          >
            ❌
          </button>
        )}
        {booking.status === 'cancelled' && (
          <button
            style={s.statusBtn('#82ca9d')}
            onClick={() => onStatusChange(booking.id, 'confirmed')}
          >
            🔄
          </button>
        )}
      </div>
    </div>
  )
}

/* ═══ MAIN COMPONENT ═══ */

export function BuchungenTab() {
  const store = useBuchungenStore()
  const [loaded, setLoaded] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(true)

  useEffect(() => {
    if (!loaded) {
      store.loadBookings()
      setLoaded(true)
    }
  }, [loaded])

  // Build booking day counts for calendar
  const bookingDays: Record<string, number> = {}
  for (const b of store.bookings) {
    bookingDays[b.booking_date] = (bookingDays[b.booking_date] || 0) + 1
  }

  const handleDateSelect = (date: string) => {
    if (selectedDate === date) {
      setSelectedDate(null)
      store.setDateFilter('all')
    } else {
      setSelectedDate(date)
      store.setDateFilter(date)
    }
  }

  const filtered = store.getFiltered()

  // Quick stats
  const todayCount = store.bookings.filter(b => b.booking_date === new Date().toISOString().split('T')[0]).length
  const pendingCount = store.bookings.filter(b => b.status === 'pending').length
  const confirmedCount = store.bookings.filter(b => b.status === 'confirmed').length
  const cancelledCount = store.bookings.filter(b => b.status === 'cancelled').length
  const todayRevenue = store.bookings
    .filter(b => b.booking_date === new Date().toISOString().split('T')[0] && b.status !== 'cancelled')
    .reduce((s, b) => s + b.price_cents, 0)

  return (
    <div style={s.wrap}>
      {/* Stats */}
      <div style={s.statsRow}>
        <div style={s.statCard}>
          <div style={s.statNum}>{todayCount}</div>
          <div style={s.statLabel}>Heute</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statNum, color: '#C8A84B' }}>{pendingCount}</div>
          <div style={s.statLabel}>Ausstehend</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statNum, color: '#82ca9d' }}>{confirmedCount}</div>
          <div style={s.statLabel}>Bestätigt</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statNum, color: '#f66' }}>{cancelledCount}</div>
          <div style={s.statLabel}>Storniert</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statNum, color: '#7EC8E3' }}>{formatEuro(todayRevenue)}</div>
          <div style={s.statLabel}>Heute €</div>
        </div>
      </div>

      {/* Calendar Toggle */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <Button
          variant={showCalendar ? 'gold' : 'outline'}
          onClick={() => setShowCalendar(!showCalendar)}
        >
          📅 {showCalendar ? 'Kalender ausblenden' : 'Kalender anzeigen'}
        </Button>
        {selectedDate && (
          <Button variant="ghost" onClick={() => { setSelectedDate(null); store.setDateFilter('all') }}>
            ✕ {selectedDate}
          </Button>
        )}
      </div>

      {/* Calendar */}
      {showCalendar && (
        <MiniCalendar
          selectedDate={selectedDate}
          onSelect={handleDateSelect}
          bookingDays={bookingDays}
        />
      )}

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <Input
          placeholder="Suche nach Kunde, Salon, Service..."
          value={store.searchQuery}
          onChange={(e) => store.setSearchQuery(e.target.value)}
        />
      </div>

      {/* Date Quick Filters */}
      <div style={s.filterRow}>
        {[
          { value: 'all', label: '📋 Alle' },
          { value: 'today', label: '📆 Heute' },
          { value: 'week', label: '📊 Woche' },
          { value: 'month', label: '📈 Monat' },
        ].map(f => (
          <button
            key={f.value}
            style={s.filterBtn(store.dateFilter === f.value && !selectedDate)}
            onClick={() => { setSelectedDate(null); store.setDateFilter(f.value) }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Status Filters */}
      <div style={s.filterRow}>
        {[
          { value: 'all', label: 'Alle Status' },
          { value: 'pending', label: '⏳ Ausstehend' },
          { value: 'confirmed', label: '✅ Bestätigt' },
          { value: 'cancelled', label: '❌ Storniert' },
        ].map(f => (
          <button
            key={f.value}
            style={s.filterBtn(store.statusFilter === f.value)}
            onClick={() => store.setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {store.error && (
        <div style={{ color: '#f66', fontSize: 13, marginBottom: 8, padding: 8, background: 'rgba(220,50,50,0.1)', borderRadius: 8 }}>
          ⚠️ {store.error}
        </div>
      )}

      {/* Loading */}
      {store.loading && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>
          Lade Buchungen...
        </div>
      )}

      {/* Result count */}
      {!store.loading && (
        <div style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 8 }}>
          {filtered.length} Buchung{filtered.length !== 1 ? 'en' : ''} gefunden
        </div>
      )}

      {/* Booking List */}
      {!store.loading && filtered.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>
          Keine Buchungen gefunden.
        </div>
      )}

      {filtered.map(b => (
        <BookingRow
          key={b.id}
          booking={b}
          onStatusChange={(id, status) => store.updateStatus(id, status)}
        />
      ))}
    </div>
  )
}
