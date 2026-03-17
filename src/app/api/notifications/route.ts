import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { auth } from '@/modules/auth/auth.config'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

/**
 * GET /api/notifications?page=1&limit=20
 * List notifications for the current user with pagination and unread count.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10))
    )
    const offset = (page - 1) * limit

    const supabase = getSupabaseAdmin()
    const userId = session.user.id

    // Fetch notifications with pagination
    const { data: notifications, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get unread count
    const { count: unreadCount, error: unreadError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (unreadError) {
      return NextResponse.json({ error: unreadError.message }, { status: 500 })
    }

    return NextResponse.json({
      notifications: notifications ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
      unreadCount: unreadCount ?? 0,
    })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/**
 * PUT /api/notifications
 * Mark notifications as read.
 * Body: { notificationIds: string[] }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { notificationIds } = body

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'notificationIds muss ein nicht-leeres Array sein' },
        { status: 400 }
      )
    }

    if (notificationIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximal 100 Benachrichtigungen auf einmal' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', notificationIds)
      .eq('user_id', session.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
