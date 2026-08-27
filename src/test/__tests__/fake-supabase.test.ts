// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { FakeSupabase, parseSelectColumns } from '@/test/fake-supabase'
import { LIVE_NOT_NULL, applyLiveSchema } from '@/test/live-schema'

/**
 * Tests fuer die Test-Datenbank selbst.
 *
 * Normalerweise ist das Selbstzweck. Hier nicht: seit 2026-08-27 traegt der
 * Fake zwei Zusicherungen, an denen echte Fehler haengen —
 *
 *   NOT NULL  Ein Insert ohne Pflichtspalte scheitert mit 23502. Genau diese
 *             Klasse hat die Nachrichten-Kette live jeden Tag umgebracht
 *             (`messages.receiver_id`, `conversations.customer_id`/
 *             `.provider_id`), waehrend die Suite gruen war.
 *
 *   ORDER     `.order(...).limit(1)` waehlt wirklich aus. Solange der Fake
 *             die Sortierung nur notierte, konnte kein Test den Unterschied
 *             zwischen „nimmt die aelteste" und „nimmt irgendeine" zeigen.
 *
 * Waere eine der beiden still kaputt, wuerden die Ketten-Tests wieder gruen
 * — ohne dass jemand es merkt. Deshalb stehen sie hier direkt unter Beweis.
 */

let db: FakeSupabase

beforeEach(() => {
  db = new FakeSupabase()
})

describe('NOT-NULL-Pruefung', () => {
  beforeEach(() => {
    db.defineSchema('messages', ['id', 'conversation_id', 'sender_id', 'receiver_id', 'content', 'created_at'])
    db.defineNotNull('messages', ['conversation_id', 'sender_id', 'receiver_id', 'content'])
  })

  it('weist einen Insert ohne Pflichtspalte mit 23502 ab', async () => {
    const { data, error } = await db
      .from('messages')
      .insert({ conversation_id: 'c1', sender_id: 's1', content: 'Hallo' })
      .select('id')
      .single()

    expect(data).toBeNull()
    expect(error?.code).toBe('23502')
    expect(error?.message).toContain('receiver_id')
    expect(db.rows('messages')).toHaveLength(0)
  })

  it('weist auch ein ausdrueckliches null ab', async () => {
    const { error } = await db
      .from('messages')
      .insert({ conversation_id: 'c1', sender_id: 's1', receiver_id: null, content: 'Hallo' })

    expect(error?.code).toBe('23502')
  })

  it('laesst den vollstaendigen Insert durch', async () => {
    const { error } = await db
      .from('messages')
      .insert({ conversation_id: 'c1', sender_id: 's1', receiver_id: 'r1', content: 'Hallo' })

    expect(error).toBeNull()
    expect(db.rows('messages')).toHaveLength(1)
  })

  it('verhindert, dass ein UPDATE eine Pflichtspalte leert', async () => {
    await db
      .from('messages')
      .insert({ conversation_id: 'c1', sender_id: 's1', receiver_id: 'r1', content: 'Hallo' })

    const { error } = await db.from('messages').update({ receiver_id: null }).eq('sender_id', 's1')

    expect(error?.code).toBe('23502')
    expect(db.rows('messages')[0].receiver_id).toBe('r1')
  })

  it('laesst ein UPDATE durch, das die Pflichtspalte gar nicht anfasst', async () => {
    await db
      .from('messages')
      .insert({ conversation_id: 'c1', sender_id: 's1', receiver_id: 'r1', content: 'Hallo' })

    const { error } = await db.from('messages').update({ content: 'Neu' }).eq('sender_id', 's1')

    expect(error).toBeNull()
    expect(db.rows('messages')[0].content).toBe('Neu')
  })

  it('prueft nichts, solange keine Pflichtspalten registriert sind', async () => {
    // Bestandstests ohne `applyLiveSchema` sollen unveraendert laufen.
    const { error } = await db.from('irgendwas').insert({ a: 1 })
    expect(error).toBeNull()
  })

  it('wird von applyLiveSchema mitgesetzt', async () => {
    applyLiveSchema(db)

    const { error } = await db
      .from('conversations')
      .insert({ salon_id: 's', last_message_at: '2026-08-27T00:00:00.000Z' })

    expect(error?.code).toBe('23502')
    // Die Liste, an der das haengt, ist absichtlich klein und explizit.
    expect(LIVE_NOT_NULL.conversations).toContain('customer_id')
    expect(LIVE_NOT_NULL.messages).toContain('receiver_id')
  })
})

describe('order()', () => {
  beforeEach(async () => {
    db.defineSchema('rows', ['id', 'created_at', 'rank'])
    // Absichtlich unsortiert eingefuegt.
    await db.from('rows').insert([
      { id: 'b', created_at: '2026-08-02T00:00:00.000Z', rank: 2 },
      { id: 'c', created_at: '2026-08-03T00:00:00.000Z', rank: 3 },
      { id: 'a', created_at: '2026-08-01T00:00:00.000Z', rank: 1 },
    ])
  })

  async function ids(query: PromiseLike<{ data: unknown }>): Promise<string[]> {
    const { data } = await query
    return (data as { id: string }[]).map((r) => r.id)
  }

  it('sortiert aufsteigend (Standard)', async () => {
    expect(await ids(db.from('rows').select('id, created_at').order('created_at'))).toEqual([
      'a', 'b', 'c',
    ])
  })

  it('sortiert absteigend', async () => {
    expect(
      await ids(db.from('rows').select('id, created_at').order('created_at', { ascending: false })),
    ).toEqual(['c', 'b', 'a'])
  })

  it('greift vor limit — sonst waehlt .limit(1) eine beliebige Zeile', async () => {
    expect(await ids(db.from('rows').select('id, created_at').order('created_at').limit(1))).toEqual([
      'a',
    ])
  })

  it('sortiert Zahlen numerisch, nicht als Text', async () => {
    await db.from('rows').insert({ id: 'z', created_at: '2026-08-04T00:00:00.000Z', rank: 10 })
    expect(await ids(db.from('rows').select('id, rank').order('rank'))).toEqual(['a', 'b', 'c', 'z'])
  })

  it('stellt NULL ans Ende', async () => {
    await db.from('rows').insert({ id: 'leer', created_at: null, rank: 0 })
    const order = await ids(db.from('rows').select('id, created_at').order('created_at'))
    expect(order[order.length - 1]).toBe('leer')
  })

  it('meldet eine unbekannte Sortierspalte als 42703', async () => {
    // PostgREST beantwortet `?order=updated_at` so — daran ist GET
    // /api/messages live gescheitert.
    const { error } = await db.from('rows').select('id').order('updated_at')
    expect(error?.code).toBe('42703')
  })
})

describe('gte() / lte()', () => {
  beforeEach(async () => {
    db.defineSchema('spanne', ['id', 'start_date', 'end_date'])
    await db.from('spanne').insert([
      { id: 'frueh', start_date: '2026-08-01', end_date: '2026-08-03' },
      { id: 'mitte', start_date: '2026-08-10', end_date: '2026-08-12' },
      { id: 'spaet', start_date: '2026-08-20', end_date: '2026-08-22' },
    ])
  })

  async function ids(query: PromiseLike<{ data: unknown }>): Promise<string[]> {
    const { data } = await query
    return ((data ?? []) as Array<{ id: string }>).map((r) => r.id)
  }

  it('schliesst den Grenzwert ein — das unterscheidet lte von lt', async () => {
    expect(await ids(db.from('spanne').select('id, start_date').lte('start_date', '2026-08-10')))
      .toEqual(['frueh', 'mitte'])
    expect(await ids(db.from('spanne').select('id, start_date').lt('start_date', '2026-08-10')))
      .toEqual(['frueh'])
  })

  it('bildet die Ueberschneidungspruefung der Miet-Buchungen ab', async () => {
    // existing.start <= new.end AND existing.end >= new.start — genau die
    // Bedingung aus /api/rental-bookings. Ohne gte/lte im Fake liess sich
    // dieser Pfad gar nicht testen.
    expect(
      await ids(
        db.from('spanne').select('id, start_date, end_date')
          .lte('start_date', '2026-08-11')
          .gte('end_date', '2026-08-11'),
      ),
    ).toEqual(['mitte'])
  })

  it('meldet eine unbekannte Spalte auch hier als 42703', async () => {
    const { error } = await db.from('spanne').select('id').gte('erfunden', '2026-08-01')
    expect(error?.code).toBe('42703')
  })
})

/**
 * Projektion bei eingebetteten Ressourcen (Track 10).
 *
 * Bis hierher schaltete JEDE Klammer in der `select`-Liste die Projektion
 * komplett ab. Eine Abfrage wie
 *
 *     .select('id, rating, customer:profiles!fk(full_name)')
 *
 * lieferte damit die volle Zeile zurueck — `customer_id` und `reported_by`
 * inklusive. Genau an der Stelle, an der eine Route ihre Spaltenliste am
 * dringendsten braucht, konnte kein Test belegen, dass sie wirkt: eine
 * Einbettung ist in fast jeder PII-nahen Abfrage im Spiel. Echtes PostgREST
 * wendet die Liste sehr wohl an.
 */
describe('select() mit eingebetteter Ressource', () => {
  beforeEach(async () => {
    db.defineSchema('reviews', ['id', 'salon_id', 'customer_id', 'rating', 'reported_by'])
    await db.from('reviews').insert([
      { id: 'r1', salon_id: 's1', customer_id: 'u1', rating: 5, reported_by: 'u9' },
    ])
    // Die eingebettete Zeile kommt wie bisher aus dem Bestand — der Fake
    // kann den Join nicht, nur die Benennung in der Antwort.
    db.rows('reviews')[0].customer = { full_name: 'Anna Kowalski' }
  })

  it('schneidet die Spalten trotz Einbettung zu', async () => {
    const { data } = await db
      .from('reviews')
      .select('id, rating, customer:profiles!reviews_customer_id_fkey(full_name)')
    const zeile = (data as Array<Record<string, unknown>>)[0]

    expect(Object.keys(zeile).sort()).toEqual(['customer', 'id', 'rating'])
    expect(zeile).not.toHaveProperty('customer_id')
    expect(zeile).not.toHaveProperty('reported_by')
    expect(zeile.customer).toEqual({ full_name: 'Anna Kowalski' })
  })

  it('haelt die Einbettung nicht gegen das Spaltenschema', async () => {
    // `customer` ist eine Beziehung, keine Spalte von reviews. Wuerde sie
    // geprueft, antwortete der Fake mit 42703 auf jede korrekte Abfrage.
    const { error } = await db.from('reviews').select('id, customer:profiles(full_name)')
    expect(error).toBeNull()
  })

  it('meldet eine erfundene echte Spalte weiterhin als 42703', async () => {
    const { error } = await db.from('reviews').select('id, erfunden, customer:profiles(full_name)')
    expect(error?.code).toBe('42703')
    expect(error?.message).toContain('reviews.erfunden')
  })

  it('laesst `*` neben einer Einbettung die ganze Zeile liefern', async () => {
    // PostgREST erlaubt das, und mehrere Routen benutzen es.
    const { data } = await db.from('reviews').select('*, salon:salons(name)')
    expect(data as Array<Record<string, unknown>>).toHaveLength(1)
    expect((data as Array<Record<string, unknown>>)[0]).toMatchObject({
      id: 'r1', customer_id: 'u1', reported_by: 'u9',
    })
  })
})

describe('parseSelectColumns', () => {
  it('benennt die Schluessel so, wie sie in der Antwort stehen', () => {
    expect(parseSelectColumns('id, name')).toEqual([
      { key: 'id', embedded: false },
      { key: 'name', embedded: false },
    ])
    expect(parseSelectColumns('id, salons(name, city)')).toEqual([
      { key: 'id', embedded: false },
      { key: 'salons', embedded: true },
    ])
    expect(parseSelectColumns('customer:profiles!reviews_customer_id_fkey(full_name)')).toEqual([
      { key: 'customer', embedded: true },
    ])
  })

  it('laesst sich vom Komma INNERHALB der Klammer nicht zerlegen', () => {
    expect(parseSelectColumns('id, rental_equipment(type, salons(owner_id))')).toEqual([
      { key: 'id', embedded: false },
      { key: 'rental_equipment', embedded: true },
    ])
  })

  it('behaelt den Stern als eigenen Eintrag', () => {
    expect(parseSelectColumns('*, salons(name)')).toEqual([
      { key: '*', embedded: false },
      { key: 'salons', embedded: true },
    ])
  })
})
