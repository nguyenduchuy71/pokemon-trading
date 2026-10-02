import { supabase } from '@/lib/supabase-client'
import { check, unwrap } from '@/utils/app-error'
import type { ReportReason } from '@/constants/domain'

export interface BlockedUser {
  blocked_id: string
  created_at: string
  profile: { username: string; display_name: string | null; avatar_url: string | null } | null
}

export async function listBlockedUsers(): Promise<BlockedUser[]> {
  return unwrap(
    await supabase
      .from('blocked_users')
      .select('blocked_id, created_at, profile:profiles!blocked_users_blocked_id_fkey(username, display_name, avatar_url)')
      .order('created_at', { ascending: false }),
  ) as BlockedUser[]
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  check(await supabase.from('blocked_users').insert({ blocker_id: blockerId, blocked_id: blockedId }))
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  check(await supabase.from('blocked_users').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId))
}

export interface ReportInput {
  reporterId: string
  reason: ReportReason
  details?: string
  targetUserId?: string
  targetListingId?: string
}

/** Reporter identity is never exposed to the reported user (RLS: reporter + admins only). */
export async function fileReport(input: ReportInput): Promise<void> {
  check(
    await supabase.from('reports').insert({
      reporter_id: input.reporterId,
      reason: input.reason,
      details: input.details?.trim() || null,
      target_user_id: input.targetListingId ? null : (input.targetUserId ?? null),
      target_listing_id: input.targetListingId ?? null,
    }),
  )
}
