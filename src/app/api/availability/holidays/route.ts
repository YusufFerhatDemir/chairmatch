import { NextRequest, NextResponse } from 'next/server'
import { getPublicHolidays, type Bundesland } from '@/lib/holidays'

const VALID_STATES: Bundesland[] = [
  'BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV',
  'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH',
]

/**
 * GET /api/availability/holidays?year=2026&state=BY
 *
 * Returns public holidays for a given year and optional Bundesland.
 * - year: required, 4-digit year
 * - state: optional, 2-letter Bundesland code (e.g. BY, NW, BE)
 *   If omitted, returns only federal holidays (valid in all states).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const yearParam = searchParams.get('year')
  const stateParam = searchParams.get('state')

  // Validate year
  if (!yearParam || !/^\d{4}$/.test(yearParam)) {
    return NextResponse.json(
      { error: 'year required (4-digit, e.g. 2026)' },
      { status: 400 }
    )
  }

  const year = parseInt(yearParam, 10)

  if (year < 1900 || year > 2100) {
    return NextResponse.json(
      { error: 'year must be between 1900 and 2100' },
      { status: 400 }
    )
  }

  // Validate state if provided
  let state: Bundesland | undefined
  if (stateParam) {
    const upper = stateParam.toUpperCase() as Bundesland
    if (!VALID_STATES.includes(upper)) {
      return NextResponse.json(
        { error: `Invalid state. Valid values: ${VALID_STATES.join(', ')}` },
        { status: 400 }
      )
    }
    state = upper
  }

  const holidays = getPublicHolidays(year, state)

  return NextResponse.json({
    year,
    state: state ?? null,
    count: holidays.length,
    holidays,
  })
}
