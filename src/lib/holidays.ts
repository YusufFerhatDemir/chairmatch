/**
 * German public holidays calculator.
 * Supports all 16 Bundeslaender with state-specific holidays.
 * Easter calculation uses the Gauss/Anonymous Gregorian algorithm.
 */

export type Bundesland =
  | 'BW' // Baden-Wuerttemberg
  | 'BY' // Bayern
  | 'BE' // Berlin
  | 'BB' // Brandenburg
  | 'HB' // Bremen
  | 'HH' // Hamburg
  | 'HE' // Hessen
  | 'MV' // Mecklenburg-Vorpommern
  | 'NI' // Niedersachsen
  | 'NW' // Nordrhein-Westfalen
  | 'RP' // Rheinland-Pfalz
  | 'SL' // Saarland
  | 'SN' // Sachsen
  | 'ST' // Sachsen-Anhalt
  | 'SH' // Schleswig-Holstein
  | 'TH' // Thueringen

export interface PublicHoliday {
  date: string   // YYYY-MM-DD
  name: string
}

/**
 * Calculate Easter Sunday for a given year using the
 * Anonymous Gregorian algorithm (a.k.a. "Meeus/Jones/Butcher" algorithm).
 * Returns a Date object set to Easter Sunday.
 */
function calculateEasterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

/** Add days to a Date and return YYYY-MM-DD string */
function addDays(date: Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

/** Format a Date as YYYY-MM-DD */
function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** State sets for state-specific holidays */
const HEILIGE_DREI_KOENIGE_STATES: Bundesland[] = ['BW', 'BY', 'ST']
const FRONLEICHNAM_STATES: Bundesland[] = ['BW', 'BY', 'HE', 'NW', 'RP', 'SL']
const MARIAE_HIMMELFAHRT_STATES: Bundesland[] = ['BY', 'SL']
const REFORMATIONSTAG_STATES: Bundesland[] = ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH']
const ALLERHEILIGEN_STATES: Bundesland[] = ['BW', 'BY', 'NW', 'RP', 'SL']

/**
 * Get all public holidays for a given year.
 * If state is provided, includes state-specific holidays.
 * If state is omitted, returns only federal (nationwide) holidays.
 */
export function getPublicHolidays(year: number, state?: Bundesland): PublicHoliday[] {
  const easter = calculateEasterSunday(year)
  const holidays: PublicHoliday[] = []

  // --- Federal holidays (all states) ---

  holidays.push({ date: `${year}-01-01`, name: 'Neujahr' })

  // Karfreitag (Good Friday) = Easter - 2
  holidays.push({ date: addDays(easter, -2), name: 'Karfreitag' })

  // Ostermontag (Easter Monday) = Easter + 1
  holidays.push({ date: addDays(easter, 1), name: 'Ostermontag' })

  // Tag der Arbeit (Labour Day)
  holidays.push({ date: `${year}-05-01`, name: 'Tag der Arbeit' })

  // Christi Himmelfahrt (Ascension Day) = Easter + 39
  holidays.push({ date: addDays(easter, 39), name: 'Christi Himmelfahrt' })

  // Pfingstmontag (Whit Monday) = Easter + 50
  holidays.push({ date: addDays(easter, 50), name: 'Pfingstmontag' })

  // Tag der Deutschen Einheit (German Unity Day)
  holidays.push({ date: `${year}-10-03`, name: 'Tag der Deutschen Einheit' })

  // 1. Weihnachtstag (Christmas Day)
  holidays.push({ date: `${year}-12-25`, name: '1. Weihnachtstag' })

  // 2. Weihnachtstag (St. Stephen's Day)
  holidays.push({ date: `${year}-12-26`, name: '2. Weihnachtstag' })

  // --- State-specific holidays ---

  if (state) {
    // Heilige Drei Koenige (Epiphany) - Jan 6
    if (HEILIGE_DREI_KOENIGE_STATES.includes(state)) {
      holidays.push({ date: `${year}-01-06`, name: 'Heilige Drei Könige' })
    }

    // Fronleichnam (Corpus Christi) = Easter + 60
    if (FRONLEICHNAM_STATES.includes(state)) {
      holidays.push({ date: addDays(easter, 60), name: 'Fronleichnam' })
    }

    // Mariae Himmelfahrt (Assumption of Mary) - Aug 15
    if (MARIAE_HIMMELFAHRT_STATES.includes(state)) {
      holidays.push({ date: `${year}-08-15`, name: 'Mariä Himmelfahrt' })
    }

    // Reformationstag (Reformation Day) - Oct 31
    if (REFORMATIONSTAG_STATES.includes(state)) {
      holidays.push({ date: `${year}-10-31`, name: 'Reformationstag' })
    }

    // Allerheiligen (All Saints' Day) - Nov 1
    if (ALLERHEILIGEN_STATES.includes(state)) {
      holidays.push({ date: `${year}-11-01`, name: 'Allerheiligen' })
    }
  }

  // Sort by date
  holidays.sort((a, b) => a.date.localeCompare(b.date))

  return holidays
}

/**
 * Check whether a given date is a public holiday.
 * @param date - Date object or YYYY-MM-DD string
 * @param state - Optional Bundesland for state-specific holidays
 */
export function isPublicHoliday(date: Date | string, state?: Bundesland): boolean {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date
  const year = d.getFullYear()
  const dateStr = formatDate(d)

  const holidays = getPublicHolidays(year, state)
  return holidays.some(h => h.date === dateStr)
}
