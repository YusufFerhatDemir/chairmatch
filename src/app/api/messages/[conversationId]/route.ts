import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'

/**
 * GET /api/messages/[conversationId]
 * Fetch all messages for a conversation. Marks unread messages as read for the current user.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { conversationId } = await params
    const userId = session.user.id
    const supabase = getSupabaseAdmin()

    // Verify the user is a participant of this conversation
    const { data: participant, error: partError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single()

    if (partError || !participant) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
    }

    // Fetch messages ordered by creation time
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, is_read, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Mark unread messages (sent by others) as read
    const unreadIds = (messages ?? [])
      .filter((m) => m.sender_id !== userId && !m.is_read)
      .map((m) => m.id)

    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadIds)
    }

    // Fetch conversation metadata (salon info, other participants)
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, salon_id, created_at')
      .eq('id', conversationId)
      .single()

    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)

    const otherUserIds = (participants ?? [])
      .map((p) => p.user_id)
      .filter((id: string) => id !== userId)

    let otherUser: { id: string; full_name: string | null; avatar_url: string | null } | null = null
    if (otherUserIds.length > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', otherUserIds[0])
        .single()
      otherUser = profile
    }

    let salonName: string | null = null
    if (conv?.salon_id) {
      const { data: salon } = await supabase
        .from('salons')
        .select('name')
        .eq('id', conv.salon_id)
        .single()
      salonName = salon?.name ?? null
    }

    return NextResponse.json({
      conversationId,
      salonId: conv?.salon_id ?? null,
      salonName,
      otherUser,
      messages: (messages ?? []).map((m) => ({
        ...m,
        // If it was unread and sent by someone else, mark as read in the response too
        is_read: m.sender_id !== userId ? true : m.is_read,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
