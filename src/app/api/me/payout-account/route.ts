import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { ibanLast4, isValidIban, maskIban, normalizeIban } from '@/lib/iban'

/**
 * Auszahlungsdaten (IBAN) für Anbieter und Vermieter.
 *
 * Ersetzt `cm_anbieter_auszahlung` / `cm_vermieter_auszahlung`.
 *
 * Bewusste Einschränkung: die volle IBAN verlässt den Server NIE wieder.
 * GET liefert ausschließlich die letzten vier Stellen. Wer die IBAN ändern
 * will, gibt sie neu ein — das ist der übliche Umgang mit Bankdaten und
 * macht ein ausgelesenes Session-Cookie deutlich weniger wert.
 */

const CONTEXTS = ['anbieter', 'vermieter'] as const
type Context = (typeof CONTEXTS)[number]

const putSchema = z.object({
  context: z.enum(CONTEXTS),
  iban: z.string().trim().min(1, 'IBAN fehlt'),
  account_holder: z.string().trim().max(120).optional(),
})

function readContext(req: NextRequest): Context | null {
  const raw = new URL(req.url).searchParams.get('context') ?? 'anbieter'
  return (CONTEXTS as readonly string[]).includes(raw) ? (raw as Context) : null
}

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const context = readContext(req)
  if (!context) {
    return NextResponse.json({ error: 'Ungültiger context' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('payout_accounts')
    .select('iban_last4, account_holder, updated_at')
    .eq('user_id', session.user.id)
    .eq('context', context)
    .limit(1)

  if (error) {
    console.error('payout-account GET failed:', error)
    return NextResponse.json(
      { error: 'Auszahlungsdaten konnten nicht geladen werden' },
      { status: 500 },
    )
  }

  const row = data?.[0] ?? null
  return NextResponse.json({
    account: row
      ? {
          configured: true,
          iban_last4: row.iban_last4,
          iban_masked: maskIban(row.iban_last4),
          account_holder: row.account_holder ?? '',
          updated_at: row.updated_at ?? null,
        }
      : { configured: false, iban_last4: null, iban_masked: '', account_holder: '', updated_at: null },
  })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const iban = normalizeIban(parsed.data.iban)
  if (!isValidIban(iban)) {
    return NextResponse.json(
      { error: 'IBAN ist ungültig — bitte Prüfziffern kontrollieren' },
      { status: 400 },
    )
  }

  const last4 = ibanLast4(iban)
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('payout_accounts').upsert(
    {
      user_id: session.user.id,
      context: parsed.data.context,
      iban,
      iban_last4: last4,
      account_holder: parsed.data.account_holder ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,context' },
  )

  if (error) {
    console.error('payout-account PUT failed:', error)
    return NextResponse.json(
      { error: 'Auszahlungsdaten konnten nicht gespeichert werden' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    account: {
      configured: true,
      iban_last4: last4,
      iban_masked: maskIban(last4),
      account_holder: parsed.data.account_holder ?? '',
    },
  })
}
