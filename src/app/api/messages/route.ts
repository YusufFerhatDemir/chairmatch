import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { isSchemaMismatch, isUniqueViolation } from '@/lib/pg-errors'
import { isUuid } from '@/lib/uuid'

/**
 * Postfach und Nachrichtenversand.
 *
 * Zwei Dinge, die hier bis 2026-08-27 falsch waren und beide nach aussen
 * still ausgefallen sind:
 *
 *  1. POST hat `messages.receiver_id` und `conversations.customer_id` /
 *     `.provider_id` nie geschrieben. Alle drei Spalten sind live vorhanden
 *     und laut der anlegenden Migration NOT NULL — jeder INSERT lief also in
 *     23502, die Route antwortete 500, und das ChatWidget verschluckt den
 *     Fehlschlag wortlos (`catch { }`). Der Nutzer sah seine Nachricht
 *     verschwinden, ohne eine Meldung.
 *
 *  2. GET hat den Gespraechspartner ueber `conversation_participants!inner`
 *     MIT dem Filter `conversation_participants.user_id = <ich>` geladen.
 *     PostgREST wendet einen Filter auf eine eingebettete Ressource auch auf
 *     die eingebetteten Zeilen an — in der Liste stand also immer nur der
 *     Anfragende selbst, und `.find(id => id !== userId)` war ausnahmslos
 *     `undefined`. Jede Konversation im Postfach hiess "Unbekannter Nutzer"
 *     mit "?"-Avatar.
 *
 * Beides ist jetzt ohne eingebettete Filter geloest: erst die eigenen
 * Mitgliedschaften, dann die Konversationen dazu. Etwas mehr Round-Trips,
 * dafuer kein Verhalten, das von einer PostgREST-Feinheit abhaengt.
 */

/**
 * Best-effort, pro Lambda-Instanz — Grenzen siehe @/lib/rate-limit.
 *
 * Geschluesselt auf die User-ID, nicht auf die IP: der Endpunkt verlangt
 * ohnehin eine Session, und ein Konto soll nicht dadurch mehr senden
 * duerfen, dass es die IP wechselt. 20 Nachrichten pro Minute sind fuer
 * einen Menschen reichlich und fuer ein Skript wenig.
 */
const RATE = { scope: 'messages-send', max: 20, windowMs: 60_000 }

const MAX_CONTENT_LENGTH = 5000

interface ConversationRow {
  id: string
  salon_id: string | null
  last_message_at: string | null
}

/**
 * GET /api/messages
 * Konversationen des angemeldeten Nutzers, mit Vorschau und Ungelesen-Zaehler.
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const userId = session.user.id
    const supabase = getSupabaseAdmin()

    // 1. Eigene Mitgliedschaften.
    const { data: myParticipations, error: myPartError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    if (myPartError) {
      console.error('GET /api/messages (participations):', myPartError)
      return NextResponse.json(
        { error: 'Konversationen konnten nicht geladen werden' },
        { status: 500 },
      )
    }

    const convIds = [...new Set((myParticipations ?? []).map((p) => p.conversation_id))]
    if (convIds.length === 0) return NextResponse.json([])

    // 2. Die Konversationen selbst, neueste zuerst.
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, salon_id, last_message_at')
      .in('id', convIds)
      // Live heisst die Spalte `last_message_at`, nicht `updated_at`. Bis
      // 2026-08-24 stand hier `updated_at`: PostgREST antwortete mit 42703,
      // der Handler ging in `convError` — GET /api/messages lieferte also
      // jedem eingeloggten Nutzer 500 statt seines Postfachs.
      .order('last_message_at', { ascending: false })

    if (convError) {
      console.error('GET /api/messages (conversations):', convError)
      return NextResponse.json(
        { error: 'Konversationen konnten nicht geladen werden' },
        { status: 500 },
      )
    }

    const convRows = (conversations ?? []) as ConversationRow[]
    if (convRows.length === 0) return NextResponse.json([])

    const presentIds = convRows.map((c) => c.id)

    // 3. Alle Teilnehmer dieser Konversationen — ohne Filter auf `user_id`,
    //    sonst steht dort wieder nur der Anfragende (siehe Kopfkommentar).
    const [allPartsRes, msgsRes] = await Promise.all([
      supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', presentIds),
      // Vorschau und Ungelesen-Zaehler brauchen beide die Nachrichten selbst.
      // Bewusst eine Abfrage statt zweier pro Konversation (N+1); dafuer wird
      // hier der ganze Verlauf geladen. Wenn Konversationen lang werden,
      // gehoert das auf eine Aggregat-View oder einen Zaehler in
      // `conversations` umgestellt.
      supabase
        .from('messages')
        .select('conversation_id, sender_id, content, created_at, is_read')
        .in('conversation_id', presentIds)
        .order('created_at', { ascending: false }),
    ])

    if (allPartsRes.error || msgsRes.error) {
      console.error('GET /api/messages (details):', allPartsRes.error ?? msgsRes.error)
      return NextResponse.json(
        { error: 'Konversationen konnten nicht geladen werden' },
        { status: 500 },
      )
    }

    const otherIdByConv = new Map<string, string>()
    for (const part of allPartsRes.data ?? []) {
      if (part.user_id === userId) continue
      if (!otherIdByConv.has(part.conversation_id)) {
        otherIdByConv.set(part.conversation_id, part.user_id)
      }
    }

    interface MessageRow {
      conversation_id: string
      sender_id: string
      content: string
      created_at: string
      is_read: boolean
    }

    const lastByConv = new Map<string, MessageRow>()
    const unreadByConv = new Map<string, number>()
    for (const msg of (msgsRes.data ?? []) as MessageRow[]) {
      // Absteigend sortiert: die erste Nachricht je Konversation ist die neueste.
      if (!lastByConv.has(msg.conversation_id)) lastByConv.set(msg.conversation_id, msg)
      if (msg.sender_id !== userId && !msg.is_read) {
        unreadByConv.set(msg.conversation_id, (unreadByConv.get(msg.conversation_id) ?? 0) + 1)
      }
    }

    const otherIds = [...new Set(otherIdByConv.values())]
    const salonIds = [...new Set(convRows.map((c) => c.salon_id).filter((id): id is string => !!id))]

    const [profilesRes, salonsRes] = await Promise.all([
      otherIds.length > 0
        ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', otherIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] }),
      salonIds.length > 0
        ? supabase.from('salons').select('id, name').in('id', salonIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ])

    const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]))
    const salonNameById = new Map((salonsRes.data ?? []).map((s) => [s.id, s.name]))

    const result = convRows.map((conv) => {
      const otherId = otherIdByConv.get(conv.id)
      const lastMessage = lastByConv.get(conv.id) ?? null

      return {
        id: conv.id,
        salonId: conv.salon_id,
        salonName: conv.salon_id ? salonNameById.get(conv.salon_id) ?? null : null,
        otherUser: otherId ? profileById.get(otherId) ?? null : null,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              createdAt: lastMessage.created_at,
              senderId: lastMessage.sender_id,
            }
          : null,
        unreadCount: unreadByConv.get(conv.id) ?? 0,
        updatedAt: conv.last_message_at,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/messages:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/**
 * Sucht die gemeinsame Konversation zweier Nutzer.
 *
 * Deterministisch: eine zum Salon passende hat Vorrang, sonst die aelteste.
 * Vorher stand hier zweimal `.limit(1)` ohne `order` — welche Konversation
 * eine Antwort bekommt, entschied damit die Datenbank nach Tageslaune.
 */
async function findSharedConversation(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  receiverId: string,
  salonId: string | null,
): Promise<{ id: string | null; error: unknown }> {
  const { data: mine, error: mineError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId)
  if (mineError) return { id: null, error: mineError }

  const myConvIds = [...new Set((mine ?? []).map((p) => p.conversation_id))]
  if (myConvIds.length === 0) return { id: null, error: null }

  const { data: shared, error: sharedError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', receiverId)
    .in('conversation_id', myConvIds)
  if (sharedError) return { id: null, error: sharedError }

  const sharedIds = [...new Set((shared ?? []).map((p) => p.conversation_id))]
  if (sharedIds.length === 0) return { id: null, error: null }

  const { data: candidates, error: convError } = await supabase
    .from('conversations')
    .select('id, salon_id, created_at')
    .in('id', sharedIds)
    .order('created_at', { ascending: true })
  if (convError) return { id: null, error: convError }

  const rows = candidates ?? []
  if (rows.length === 0) return { id: null, error: null }

  // Live gilt `UNIQUE(customer_id, provider_id)` auf `conversations`: zwei
  // Nutzer koennen ueberhaupt nur EINEN Faden haben. Die Salon-Vorauswahl
  // bleibt trotzdem stehen — fuer Altzeilen, die vor dieser Regel entstanden
  // sein koennten. `salon_id` ist damit der Kontext, in dem der Faden
  // begonnen hat, kein Trennkriterium.
  if (salonId) {
    const scoped = rows.find((c) => c.salon_id === salonId)
    if (scoped) return { id: scoped.id, error: null }
  }
  return { id: rows[0].id, error: null }
}

/** Empfaenger muss es geben, und er muss erreichbar sein. */
async function loadReceiver(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  receiverId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, deleted_at, delete_requested_at')
    .eq('id', receiverId)
    .maybeSingle()

  if (error) {
    if (isSchemaMismatch(error)) {
      console.error('POST /api/messages: profiles-Schema passt nicht:', error)
      return { ok: false, status: 503, error: 'Empfaenger kann derzeit nicht geprueft werden' }
    }
    console.error('POST /api/messages (receiver):', error)
    return { ok: false, status: 500, error: 'Empfaenger konnte nicht geprueft werden' }
  }

  if (!data) {
    return { ok: false, status: 404, error: 'Empfänger existiert nicht' }
  }

  // Ein zur Loeschung angemeldetes Konto ist sofort gesperrt und anonymisiert
  // (siehe /api/account/delete) — dorthin geht keine Nachricht mehr.
  if (data.deleted_at || data.delete_requested_at) {
    return { ok: false, status: 410, error: 'Dieses Konto ist nicht mehr erreichbar' }
  }

  return { ok: true }
}

/**
 * POST /api/messages
 * Nachricht senden.
 *
 * Body entweder
 *   { conversationId, content }            — Antwort in einem bestehenden Faden
 * oder
 *   { receiverId, content, salonId? }      — Faden starten oder fortsetzen
 *
 * `conversationId` gibt es, weil das ChatWidget vorher ausschliesslich ueber
 * `receiverId` antwortete und den dafuer noetigen Wert aus `otherUser.id`
 * zog. War der null — was er im Postfach IMMER war, siehe Kopfkommentar —
 * brach das Senden vor dem Request ab, nachdem das Eingabefeld schon geleert
 * war. Die getippte Nachricht war damit weg, ohne Meldung.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const userId = session.user.id

    const limit = checkRateLimit(userId, RATE)
    if (limit.limited) {
      return rateLimitResponse(
        limit,
        'Zu viele Nachrichten. Bitte versuche es in einer Minute erneut.',
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      receiverId?: unknown
      conversationId?: unknown
      content?: unknown
      salonId?: unknown
    }

    const content = typeof body.content === 'string' ? body.content.trim() : ''
    const receiverIdInput = typeof body.receiverId === 'string' ? body.receiverId : null
    const conversationIdInput =
      typeof body.conversationId === 'string' ? body.conversationId : null
    const salonId = typeof body.salonId === 'string' ? body.salonId : null

    if (!content) {
      return NextResponse.json({ error: 'content ist erforderlich' }, { status: 400 })
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Nachricht darf maximal ${MAX_CONTENT_LENGTH} Zeichen lang sein` },
        { status: 400 },
      )
    }
    if (!receiverIdInput && !conversationIdInput) {
      return NextResponse.json(
        { error: 'receiverId oder conversationId ist erforderlich' },
        { status: 400 },
      )
    }
    // Alle drei sind live `uuid`-Spalten. Ohne Pruefung ging eine
    // Falscheingabe als 22P02 in den Fehlerzweig und kam als 500 zurueck.
    if (receiverIdInput !== null && !isUuid(receiverIdInput)) {
      return NextResponse.json({ error: 'Ungültige receiverId' }, { status: 400 })
    }
    if (conversationIdInput !== null && !isUuid(conversationIdInput)) {
      return NextResponse.json({ error: 'Ungültige conversationId' }, { status: 400 })
    }
    if (salonId !== null && !isUuid(salonId)) {
      return NextResponse.json({ error: 'Ungültige salonId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    let conversationId: string | null = null
    let receiverId: string | null = null

    if (conversationIdInput) {
      // ── Antwort in einem bestehenden Faden ────────────────────────────────
      const { data: participants, error: partError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationIdInput)

      if (partError) {
        console.error('POST /api/messages (participants):', partError)
        return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
      }

      const memberIds = (participants ?? []).map((p) => p.user_id)
      if (!memberIds.includes(userId)) {
        // Bewusst 403 und nicht 404: wer nicht Teilnehmer ist, erfaehrt auch
        // nicht, ob es die Konversation gibt.
        return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
      }

      const others = memberIds.filter((id) => id !== userId)
      if (others.length !== 1) {
        // `messages.receiver_id` ist einwertig — ein Faden mit null oder
        // mehreren Gegenuebern laesst sich nicht ehrlich beschreiben.
        console.error(
          `POST /api/messages: Konversation ${conversationIdInput} hat ${others.length} Gegenueber`,
        )
        return NextResponse.json(
          { error: 'Diese Konversation kann nicht beantwortet werden' },
          { status: 409 },
        )
      }

      conversationId = conversationIdInput
      receiverId = others[0]
    } else {
      // ── Faden starten oder fortsetzen ─────────────────────────────────────
      receiverId = receiverIdInput as string

      if (receiverId === userId) {
        return NextResponse.json(
          { error: 'Nachricht an sich selbst nicht erlaubt' },
          { status: 400 },
        )
      }

      const found = await findSharedConversation(supabase, userId, receiverId, salonId)
      if (found.error) {
        console.error('POST /api/messages (lookup):', found.error)
        return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
      }
      conversationId = found.id
    }

    if (!receiverId) {
      // Kann nur eintreten, wenn oben ein Zweig etwas offen laesst — dann
      // lieber ein ehrlicher 500 als eine Nachricht ohne Empfaenger.
      console.error('POST /api/messages: kein Empfaenger ermittelt')
      return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
    }

    const receiverCheck = await loadReceiver(supabase, receiverId)
    if (!receiverCheck.ok) {
      return NextResponse.json({ error: receiverCheck.error }, { status: receiverCheck.status })
    }

    if (!conversationId) {
      const created = await createConversation(supabase, userId, receiverId, salonId)
      if (!created.id) {
        return NextResponse.json({ error: created.error }, { status: created.status })
      }
      conversationId = created.id
    }

    // `receiver_id` ist live NOT NULL — und traegt zusaetzlich die
    // RLS-Policy `messages_select` (`sender_id = auth.uid() OR receiver_id =
    // auth.uid()`) sowie den Index `idx_messages_receiver_unread`.
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        receiver_id: receiverId,
        content,
        is_read: false,
      })
      .select('id, conversation_id, sender_id, receiver_id, content, is_read, created_at')
      .single()

    if (msgError || !message) {
      console.error('POST /api/messages (insert):', msgError)
      return NextResponse.json(
        { error: 'Nachricht konnte nicht gesendet werden' },
        { status: 500 },
      )
    }

    // Zeitstempel der Konversation nachziehen — er bestimmt die Sortierung
    // des Postfachs. Ein Fehler hier waere nicht schlimm genug, um die schon
    // gespeicherte Nachricht abzulehnen, darf aber nicht unbemerkt bleiben.
    const { error: touchError } = await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)
    if (touchError) {
      console.error('POST /api/messages: last_message_at nicht aktualisiert:', touchError)
    }

    return NextResponse.json(message, { status: 201 })
  } catch (err) {
    console.error('POST /api/messages:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/**
 * Legt Konversation und Teilnehmer an.
 *
 * `customer_id`/`provider_id` sind live NOT NULL und tragen die RLS-Policy
 * `conversations_select`. Sie wurden bis 2026-08-27 nicht geschrieben — jede
 * neue Konversation lief damit in 23502.
 *
 * Auf denselben Spalten liegt live `UNIQUE(customer_id, provider_id)`. Zwei
 * gleichzeitige erste Nachrichten laufen deshalb in 23505; dann gewinnt die
 * andere Anfrage und diese haengt sich an deren Faden, statt dem Nutzer einen
 * Fehler zu zeigen.
 */
async function createConversation(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  receiverId: string,
  salonId: string | null,
): Promise<{ id: string | null; error: string; status: number }> {
  // Der Salon kommt aus dem Request. `conversations.salon_id` hat live einen
  // Fremdschluessel — eine erfundene ID lief damit in 23503 und der Nutzer
  // bekam einen 500 fuer seine eigene Falscheingabe. Geprueft wird nur beim
  // Anlegen: bei einem bestehenden Faden dient `salonId` allein der Suche.
  if (salonId) {
    const { data: salon, error: salonError } = await supabase
      .from('salons')
      .select('id')
      .eq('id', salonId)
      .maybeSingle()
    if (salonError) {
      console.error('POST /api/messages (salon):', salonError)
      return { id: null, error: 'Interner Fehler', status: 500 }
    }
    if (!salon) {
      return { id: null, error: 'Unbekannter Salon', status: 400 }
    }
  }

  const { data: newConv, error: convCreateError } = await supabase
    .from('conversations')
    .insert({
      customer_id: userId,
      provider_id: receiverId,
      salon_id: salonId,
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (convCreateError || !newConv) {
    if (isUniqueViolation(convCreateError)) {
      // Gesucht wird die genau kollidierende Zeile, nicht ueber die
      // Teilnehmer. Das Rennen wird in dem Fenster verloren, in dem die
      // Gewinnerin die Konversation schon angelegt, ihre Teilnehmerzeilen
      // aber noch nicht geschrieben hat — ueber `conversation_participants`
      // waere dort nichts zu finden.
      const { data: clash } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', userId)
        .eq('provider_id', receiverId)
        .maybeSingle()
      if (clash?.id) return { id: clash.id, error: '', status: 200 }

      const retry = await findSharedConversation(supabase, userId, receiverId, salonId)
      if (retry.id) return { id: retry.id, error: '', status: 200 }
    }
    console.error('POST /api/messages (conversation):', convCreateError)
    return {
      id: null,
      error: 'Konversation konnte nicht erstellt werden',
      status: 500,
    }
  }

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert([
      { conversation_id: newConv.id, user_id: userId },
      { conversation_id: newConv.id, user_id: receiverId },
    ])

  if (partError) {
    // Eine Konversation ohne Teilnehmer ist unerreichbar — fuer beide Seiten
    // unsichtbar und nie wiederauffindbar. Sie wird wieder abgeraeumt, statt
    // als Leiche stehenzubleiben.
    console.error('POST /api/messages (participants):', partError)
    await supabase.from('conversations').delete().eq('id', newConv.id)
    return {
      id: null,
      error: 'Teilnehmer konnten nicht hinzugefuegt werden',
      status: 500,
    }
  }

  return { id: newConv.id, error: '', status: 201 }
}
