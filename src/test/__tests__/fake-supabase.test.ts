// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { FakeSupabase } from '@/test/fake-supabase'
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
