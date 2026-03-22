import 'server-only'

import { cache } from 'react'
import type { NotificationItem } from '@/lib/domain'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { LETSWITNESS_TABLES } from '@/lib/supabase/tables'

interface NotificationRow {
  id: string
  type: string
  reference_id: string | null
  message: string
  is_read: boolean
  created_at: string
}

export const getViewerNotifications = cache(
  async (
    limit = 5
  ): Promise<{
    unreadCount: number
    items: NotificationItem[]
  }> => {
    const supabase = await createServerSupabaseClient()

    if (!supabase) {
      return {
        unreadCount: 0,
        items: [],
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        unreadCount: 0,
        items: [],
      }
    }

    const [{ data }, { count }] = await Promise.all([
      supabase
        .from(LETSWITNESS_TABLES.notifications)
        .select('id, type, reference_id, message, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from(LETSWITNESS_TABLES.notifications)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false),
    ])

    return {
      unreadCount: count ?? 0,
      items: ((data as NotificationRow[] | null) ?? []).map((item) => ({
        id: item.id,
        type: item.type,
        referenceId: item.reference_id,
        message: item.message,
        isRead: item.is_read,
        createdAt: item.created_at,
      })),
    }
  }
)
