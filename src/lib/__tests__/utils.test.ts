import { describe, it, expect } from 'vitest'
import {
  formatPrice,
  formatPriceEur,
  validateEmail,
  validatePhone,
  tierWeight,
  slugify,
  formatDate,
  formatTime,
  getTimeSlots,
  clamp,
  getBookingDays,
} from '../utils'

describe('formatPrice', () => {
  it('formats cents to EUR currency string', () => {
    const result = formatPrice(1999)
    expect(result).toContain('19,99')
    expect(result).toContain('€')
  })

  it('formats zero cents', () => {
    const result = formatPrice(0)
    expect(result).toContain('0')
    expect(result).toContain('€')
  })

  it('formats whole euro amounts without unnecessary decimals', () => {
    const result = formatPrice(2000)
    expect(result).toContain('20')
    expect(result).toContain('€')
  })
})

describe('formatPriceEur', () => {
  it('returns Kostenlos for zero', () => {
    expect(formatPriceEur(0)).toBe('Kostenlos')
  })

  it('formats non-zero amounts with euro sign', () => {
    expect(formatPriceEur(25)).toBe('25 €')
  })
})

describe('validateEmail', () => {
  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true)
  })

  it('accepts email with subdomain', () => {
    expect(validateEmail('user@mail.example.com')).toBe(true)
  })

  it('rejects email without @', () => {
    expect(validateEmail('userexample.com')).toBe(false)
  })

  it('rejects email without domain', () => {
    expect(validateEmail('user@')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateEmail('')).toBe(false)
  })

  it('rejects email with spaces', () => {
    expect(validateEmail('user @example.com')).toBe(false)
  })
})

describe('validatePhone', () => {
  it('accepts valid German phone number', () => {
    expect(validatePhone('+49 170 1234567')).toBe(true)
  })

  it('accepts number with parentheses', () => {
    expect(validatePhone('(030) 12345678')).toBe(true)
  })

  it('rejects too short numbers', () => {
    expect(validatePhone('123')).toBe(false)
  })

  it('rejects strings with letters', () => {
    expect(validatePhone('abc12345678')).toBe(false)
  })
})

describe('tierWeight', () => {
  it('returns 3 for gold', () => {
    expect(tierWeight('gold')).toBe(3)
  })

  it('returns 2 for premium', () => {
    expect(tierWeight('premium')).toBe(2)
  })

  it('returns 1 for starter', () => {
    expect(tierWeight('starter')).toBe(1)
  })
})

describe('slugify', () => {
  it('converts text to lowercase slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('replaces German umlauts', () => {
    expect(slugify('Über Ästhetik')).toBe('ueber-aesthetik')
  })

  it('replaces eszett', () => {
    expect(slugify('Straße')).toBe('strasse')
  })

  it('removes leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello')
  })

  it('collapses multiple special chars into single hyphen', () => {
    expect(slugify('a   b!!!c')).toBe('a-b-c')
  })
})

describe('formatDate', () => {
  it('formats date string to German locale', () => {
    const result = formatDate('2025-03-15')
    expect(result).toContain('15')
    expect(result).toContain('03')
    expect(result).toContain('2025')
  })

  it('formats Date object', () => {
    const date = new Date(2025, 0, 5) // Jan 5, 2025
    const result = formatDate(date)
    expect(result).toContain('05')
    expect(result).toContain('01')
    expect(result).toContain('2025')
  })
})

describe('formatTime', () => {
  it('formats time from date string', () => {
    const result = formatTime('2025-03-15T14:30:00')
    expect(result).toContain('14')
    expect(result).toContain('30')
  })
})

describe('getTimeSlots', () => {
  it('generates 30-minute slots by default', () => {
    const slots = getTimeSlots('09:00', '11:00')
    expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30'])
  })

  it('generates hourly slots', () => {
    const slots = getTimeSlots('09:00', '12:00', 60)
    expect(slots).toEqual(['09:00', '10:00', '11:00'])
  })

  it('returns empty array when open equals close', () => {
    const slots = getTimeSlots('09:00', '09:00')
    expect(slots).toEqual([])
  })

  it('uses default times when no arguments provided', () => {
    const slots = getTimeSlots()
    expect(slots[0]).toBe('09:00')
    expect(slots.length).toBeGreaterThan(0)
  })
})

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('clamps to min when value is below', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('clamps to max when value is above', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('returns min when min equals max', () => {
    expect(clamp(5, 3, 3)).toBe(3)
  })
})

describe('getBookingDays', () => {
  it('returns requested number of days', () => {
    const days = getBookingDays(7)
    expect(days).toHaveLength(7)
  })

  it('defaults to 14 days', () => {
    const days = getBookingDays()
    expect(days).toHaveLength(14)
  })

  it('marks first day as today', () => {
    const days = getBookingDays(3)
    expect(days[0].isToday).toBe(true)
    expect(days[0].label).toBe('Heute')
  })

  it('marks second day as Morgen', () => {
    const days = getBookingDays(3)
    expect(days[1].isToday).toBe(false)
    expect(days[1].label).toBe('Morgen')
  })

  it('includes iso date string', () => {
    const days = getBookingDays(1)
    expect(days[0].iso).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
