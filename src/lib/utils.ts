import type { SubscriptionTier } from './types'

/** Format price in cents to EUR display */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

/** Format price from legacy euro amount */
export function formatPriceEur(amount: number): string {
  if (amount === 0) return 'Kostenlos'
  return `${amount} €`
}

/** Validate email format */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Validate German phone number */
export function validatePhone(phone: string): boolean {
  return /^[\d\s+\-()]{6,20}$/.test(phone)
}

/** Tier weight for sorting */
export function tierWeight(tier: SubscriptionTier): number {
  switch (tier) {
    case 'gold': return 3
    case 'premium': return 2
    default: return 1
  }
}

/** Generate slug from name */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c] || c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Get greeting based on time of day */
export function getGreeting(lang: 'de' | 'en' | 'tr' = 'de'): string {
  const h = new Date().getHours()
  const greetings = {
    de: h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend',
    en: h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening',
    tr: h < 12 ? 'Günaydın' : h < 18 ? 'İyi Günler' : 'İyi Akşamlar',
  }
  return greetings[lang]
}

/** Format date to German locale */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Format time */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

/** Check if salon is currently open */
export function isOpenNow(hours: Record<string, string | null> | null): 'open' | 'closed' | 'info' {
  if (!hours) return 'closed'
  const d = new Date()
  const days = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa']
  const today = days[d.getDay()]
  const todayHours = hours[today]

  if (!todayHours || todayHours === 'Geschlossen') return 'closed'
  if (todayHours === 'Nach Vereinbarung') return 'info'

  const [open, close] = todayHours.split('–')
  if (!open || !close) return 'closed'

  const now = d.getHours() * 60 + d.getMinutes()
  const [oh, om] = open.split(':').map(Number)
  const [ch, cm] = close.split(':').map(Number)

  return now >= oh * 60 + om && now < ch * 60 + cm ? 'open' : 'closed'
}

/** Get next N days for booking */
export function getBookingDays(count: number = 14): { date: Date; label: string; isToday: boolean; iso: string; short: string; day: number }[] {
  const days: { date: Date; label: string; isToday: boolean; iso: string; short: string; day: number }[] = []
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

  for (let i = 0; i < count; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const iso = date.toISOString().split('T')[0]
    days.push({
      date,
      label: i === 0 ? 'Heute' : i === 1 ? 'Morgen' : `${dayNames[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}`,
      isToday: i === 0,
      iso,
      short: dayNames[date.getDay()],
      day: date.getDate(),
    })
  }
  return days
}

/** Generate time slots for a day */
export function getTimeSlots(openTime: string = '09:00', closeTime: string = '19:00', intervalMinutes: number = 30): string[] {
  const slots: string[] = []
  const [oh, om] = openTime.split(':').map(Number)
  const [ch, cm] = closeTime.split(':').map(Number)
  let current = oh * 60 + om
  const end = ch * 60 + cm

  while (current < end) {
    const h = Math.floor(current / 60)
    const m = current % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    current += intervalMinutes
  }
  return slots
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Generate a random referral code */
export function generateRefCode(): string {
  return 'CM-' + Math.random().toString(36).substring(2, 6).toUpperCase()
}
