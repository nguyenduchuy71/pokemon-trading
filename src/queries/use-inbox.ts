import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase-client'
import { getInbox } from '@/services/messaging-service'
import { useCurrentUserId } from '@/stores/auth-store'

export const inboxKey = (userId?: string) => ['inbox', userId] as const

export function useInbox() {
  const userId = useCurrentUserId()
  return useQuery({ queryKey: inboxKey(userId), queryFn: getInbox, enabled: Boolean(userId), staleTime: 30_000 })
}

/** Total unread across conversations (0 when signed out). */
export function useUnreadCount(): number {
  const { data } = useInbox()
  return data?.reduce((sum, row) => sum + (row.unread_count ?? 0), 0) ?? 0
}

/**
 * Mounted once (see RealtimeBridge). Any message the viewer may read (RLS-filtered by
 * Realtime) refreshes the inbox; open threads subscribe separately for instant appends.
 */
export function useInboxRealtime(): void {
  const userId = useCurrentUserId()
  const qc = useQueryClient()

  useEffect(() => {
    if (!userId) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => void qc.invalidateQueries({ queryKey: inboxKey(userId) }), 400)
    }
    const channel = supabase
      .channel(`inbox:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${userId}` }, refresh)
      .subscribe()
    return () => {
      clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [userId, qc])
}
