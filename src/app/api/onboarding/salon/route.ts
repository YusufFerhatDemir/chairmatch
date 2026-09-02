import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { entwurfUebernehmen } from '@/modules/onboarding/onboarding.service'

/**
 * Uebernahme eines Onboarding-Entwurfs in die Datenbank.
 *
 * Diese Route ist die fehlende Haelfte der Wizards unter
 * /anbieter/onboarding und /vermieter/onboarding. Warum es sie bis jetzt
 * nicht gab und was sie garantiert, steht ausfuehrlich in
 * src/modules/onboarding/onboarding.service.ts.
 *
 * ANGEMELDET, IMMER.
 *
 * Die Wizards laufen VOR der Registrierung — zu diesem Zeitpunkt gibt es
 * keine Sitzung, deshalb haelt der Browser den Entwurf bis nach der
 * Anmeldung. Diese Route nimmt ihn erst danach entgegen und schreibt
 * ausschliesslich fuer `session.user.id`. Eine `userId` aus dem Body gibt es
 * bewusst nicht.
 *
 * Die Autorisierung steht hier in der Route und nicht in der Middleware:
 * /api/onboarding/* traegt keinen der Praefixe, die src/middleware.ts
 * vorsortiert.
 */

/** Preise kommen als Cent — nie negativ, hoechstens 100.000 €. */
const centsField = z.coerce.number().int().min(0).max(10_000_000)

const leistungSchema = z.object({
  name: z.string().trim().min(2).max(120),
  duration_minutes: z.coerce.number().int().min(5).max(24 * 60),
  /**
   * `null` ist ein gueltiger Wert und heisst „der Anbieter hat keinen Preis
   * angegeben". Der Service legt die Leistung dann inaktiv an, statt einen
   * Preis zu erfinden.
   */
  price_cents: centsField.nullable(),
})

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

const vermietungSchema = z.object({
  plaetze: z
    .array(
      z.object({
        art: z.enum(['stuhl', 'liege', 'kabine', 'op', 'raum']),
        anzahl: z.coerce.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(5),
  features: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  beschreibung: z.string().trim().max(2000).optional(),
  preise: z.object({
    hour_cents: centsField.nullable().optional(),
    day_cents: centsField.nullable().optional(),
    week_cents: centsField.nullable().optional(),
    month_cents: centsField.nullable().optional(),
  }),
  available_days: z.array(z.string().trim().min(2).max(3)).max(7).default([]),
  available_from: z.string().regex(HHMM, 'Uhrzeit muss HH:MM sein').nullable().optional(),
  available_to: z.string().regex(HHMM, 'Uhrzeit muss HH:MM sein').nullable().optional(),
})

const entwurfSchema = z
  .object({
    quelle: z.enum(['anbieter', 'vermieter']),
    salon: z.object({
      name: z.string().trim().min(2).max(200),
      category: z.string().trim().min(1).max(80),
      address: z.string().trim().max(300).optional(),
      phone: z.string().trim().max(40).optional(),
      description: z.string().trim().max(4000).optional(),
    }),
    leistungen: z.array(leistungSchema).max(100).optional(),
    vermietung: vermietungSchema.optional(),
    einwilligungen: z.record(z.string().max(40), z.boolean()).default({}),
  })
  .strict()

/**
 * Die Uebernahme ist wiederholbar (sie legt keine Dubletten an), aber sie
 * schreibt in vier Tabellen. Ein paar Versuche pro Stunde reichen dafuer.
 */
const RATE = { scope: 'onboarding-salon', max: 10, windowMs: 60 * 60_000 }

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  // Nach der Sitzungspruefung gezaehlt: das Limit soll den angemeldeten
  // Nutzer bremsen, nicht ein geteiltes Firmen-NAT.
  const limit = checkRateLimit(`${session.user.id}:${clientIp(req)}`, RATE)
  if (limit.limited) {
    return rateLimitResponse(limit, 'Zu viele Uebernahmen. Bitte spaeter erneut versuchen.')
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const parsed = entwurfSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültiger Entwurf', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const entwurf = parsed.data
  if (entwurf.quelle === 'vermieter' && !entwurf.vermietung) {
    return NextResponse.json(
      { error: 'Vermieter-Entwurf ohne Vermietungsangaben' },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseAdmin()
    const ergebnis = await entwurfUebernehmen(supabase, session.user.id, {
      ...entwurf,
      leistungen: entwurf.leistungen,
      vermietung: entwurf.vermietung,
    })
    return NextResponse.json({ success: true, ...ergebnis })
  } catch (err) {
    logger.error('onboarding.salon.failed', {
      userId: session.user.id,
      err: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: 'Onboarding konnte nicht übernommen werden. Bitte später erneut versuchen.' },
      { status: 500 },
    )
  }
}
