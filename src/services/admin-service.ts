import { supabase } from '@/lib/supabase-client'
import { check, toAppError, unwrap } from '@/utils/app-error'
import type { Database } from '@/types/database'

type ModerationStatus = Database['public']['Enums']['moderation_status']
type AccountStatus = Database['public']['Enums']['account_status']
type ReportStatus = Database['public']['Enums']['report_status']

export interface AdminReport {
  id: string
  reason: string
  details: string | null
  created_at: string
  target_snapshot: { card?: string; set?: string; number?: string } | null
  reporter: { username: string } | null
  target_user: { id: string; username: string; status: AccountStatus } | null
  target_listing: {
    id: string
    moderation_status: ModerationStatus
    is_active: boolean
    card: { name: string; set_name: string; card_number: string } | null
  } | null
}

/** Admin-only (RLS: reports readable by admins). Grouping by target happens client-side. */
export async function listOpenReports(): Promise<AdminReport[]> {
  return unwrap(
    await supabase
      .from('reports')
      .select(
        'id, reason, details, created_at, target_snapshot, ' +
          'reporter:profiles!reports_reporter_id_fkey(username), ' +
          'target_user:profiles!reports_target_user_id_fkey(id, username, status), ' +
          'target_listing:card_listings(id, moderation_status, is_active, card:pokemon_cards(name, set_name, card_number))',
      )
      .eq('status', 'OPEN')
      .order('created_at', { ascending: false })
      .limit(200),
  ) as unknown as AdminReport[]
}

export async function listHiddenListings() {
  return unwrap(
    await supabase
      .from('card_listings')
      .select('id, moderation_status, created_at, seller:profiles!card_listings_seller_id_fkey(username), card:pokemon_cards(name, set_name, card_number)')
      .neq('moderation_status', 'VISIBLE')
      .order('updated_at', { ascending: false })
      .limit(100),
  )
}

export async function listSuspendedUsers() {
  return unwrap(await supabase.from('profiles').select('id, username, display_name, updated_at').eq('status', 'SUSPENDED').order('updated_at', { ascending: false }).limit(100))
}

export async function listModerationLog() {
  return unwrap(
    await supabase
      .from('moderation_actions')
      .select('id, action, note, created_at, admin:profiles!moderation_actions_admin_id_fkey(username), target_user:profiles!moderation_actions_target_user_id_fkey(username), target_listing_id')
      .order('created_at', { ascending: false })
      .limit(100),
  )
}

export async function resolveReport(id: string, status: Exclude<ReportStatus, 'OPEN'>, note?: string) {
  check(await supabase.rpc('admin_resolve_report', { p_report: id, p_status: status, p_note: note }))
}

export async function setListingModeration(id: string, status: ModerationStatus, note?: string) {
  check(await supabase.rpc('admin_set_listing_moderation', { p_listing: id, p_status: status, p_note: note }))
}

export async function setUserStatus(id: string, status: AccountStatus, note?: string) {
  check(await supabase.rpc('admin_set_user_status', { p_user: id, p_status: status, p_note: note }))
}

export async function listWaitlist() {
  return check(await supabase.rpc('admin_list_waitlist')) ?? []
}

export async function countActiveUsers(): Promise<number> {
  const { count, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE')
  if (error) throw toAppError(error)
  return count ?? 0
}
