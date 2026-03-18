import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'

/**
 * GET /api/messages
 * List conversations for the current user with last message preview and unread count.
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const userId = session.user.id
    const supabase = getSupabaseAdmin()

    // Fetch all conversations where the current user is a participant
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        salon_id,
        created_at,
        updated_at,
        conversation_participants!inner(user_id),
        messages(
          id,
          sender_id,
          content,
          created_at,
          is_read
        )
      `)
      .eq('conversation_participants.user_id', userId)
      .order('updated_at', { ascending: false })

    if (convError) {
      return NextResponse.json({ error: convError.message }, { status: 500 })
    }

    // Build response with last message preview and unread count
    const result = await Promise.all(
      (conversations ?? []).map(async (conv) => {
        const messages = conv.messages ?? []

        // Sort messages by created_at descending to get the latest
        const sorted = [...messages].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        const lastMessage = sorted[0] ?? null

        // Count unread messages (not sent by current user and not read)
        const unreadCount = messages.filter(
          (m) => m.sender_id !== userId && !m.is_read
        ).length

        // Get the other participant(s) profile info
        const participantIds = (conv.conversation_participants ?? [])
          .map((p: { user_id: string }) => p.user_id)
          .filter((id: string) => id !== userId)

        let otherUser: { id: string; full_name: string | null; avatar_url: string | null } | null = null
        if (participantIds.length > 0) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', participantIds[0])
            .single()
          otherUser = profile
        }

        // Fetch salon name if linked
        let salonName: string | null = null
        if (conv.salon_id) {
          const { data: salon } = await supabase
            .from('salons')
            .select('name')
            .eq('id', conv.salon_id)
            .single()
          salonName = salon?.name ?? null
        }

        return {
          id: conv.id,
          salonId: conv.salon_id,
          salonName,
          otherUser,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                createdAt: lastMessage.created_at,
                senderId: lastMessage.sender_id,
              }
            : null,
          unreadCount,
          updatedAt: conv.updated_at,
        }
      })
    )

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/**
 * POST /api/messages
 * Send a new message.
 * Body: { receiverId: string, content: string, salonId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { receiverId, content, salonId } = body as {
      receiverId: string
      content: string
      salonId?: string
    }

    if (!receiverId || !content?.trim()) {
      return NextResponse.json(
        { error: 'receiverId und content sind erforderlich' },
        { status: 400 }
      )
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Nachricht darf maximal 5000 Zeichen lang sein' },
        { status: 400 }
      )
    }

    if (receiverId === userId) {
      return NextResponse.json(
        { error: 'Nachricht an sich selbst nicht erlaubt' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Look for an existing conversation between these two users (optionally scoped to salon)
    let conversationId: string | null = null

    const { data: existingParticipations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    if (existingParticipations && existingParticipations.length > 0) {
      const convIds = existingParticipations.map((p) => p.conversation_id)

      // Check which of these conversations also include the receiver
      const { data: sharedConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', receiverId)
        .in('conversation_id', convIds)

      if (sharedConvs && sharedConvs.length > 0) {
        const sharedConvIds = sharedConvs.map((p) => p.conversation_id)

        // If salonId is provided, try to find a conversation scoped to that salon
        if (salonId) {
          const { data: salonConv } = await supabase
            .from('conversations')
            .select('id')
            .in('id', sharedConvIds)
            .eq('salon_id', salonId)
            .limit(1)
            .single()

          if (salonConv) {
            conversationId = salonConv.id
          }
        }

        // If no salon-scoped conversation found, use the first shared conversation
        if (!conversationId) {
          const { data: anyConv } = await supabase
            .from('conversations')
            .select('id')
            .in('id', sharedConvIds)
            .limit(1)
            .single()

          if (anyConv) {
            conversationId = anyConv.id
          }
        }
      }
    }

    // Create a new conversation if none exists
    if (!conversationId) {
      const { data: newConv, error: convCreateError } = await supabase
        .from('conversations')
        .insert({
          salon_id: salonId ?? null,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (convCreateError || !newConv) {
        return NextResponse.json(
          { error: 'Konversation konnte nicht erstellt werden' },
          { status: 500 }
        )
      }

      conversationId = newConv.id

      // Add both participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: conversationId, user_id: userId },
          { conversation_id: conversationId, user_id: receiverId },
        ])

      if (partError) {
        return NextResponse.json(
          { error: 'Teilnehmer konnten nicht hinzugefuegt werden' },
          { status: 500 }
        )
      }
    }

    // Insert the message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: content.trim(),
        is_read: false,
      })
      .select('id, conversation_id, sender_id, content, is_read, created_at')
      .single()

    if (msgError || !message) {
      return NextResponse.json(
        { error: 'Nachricht konnte nicht gesendet werden' },
        { status: 500 }
      )
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    return NextResponse.json(message, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
