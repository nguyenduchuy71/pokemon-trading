import { supabase } from '@/lib/supabase-client'
import { AppError, check, unwrap } from '@/utils/app-error'
import type { Profile } from '@/types/models'
import type { TablesUpdate } from '@/types/database'

export type ProfileUpdate = Pick<
  TablesUpdate<'profiles'>,
  'username' | 'display_name' | 'bio' | 'avatar_url' | 'location_city' | 'preferred_locale' | 'preferred_currency' | 'terms_accepted_at'
>

/**
 * Every account gets a profile at signup (handle_new_user), so a missing row means the account
 * was deleted (elsewhere, or by a local DB reset) while this browser still held its token.
 * Drop the stale session so the guards send the visitor to /login instead of an error page.
 */
export async function getProfile(userId: string): Promise<Profile> {
  const profile = check(await supabase.from('profiles').select('*').eq('id', userId).maybeSingle())
  if (profile) return profile
  await supabase.auth.signOut({ scope: 'local' })
  throw new AppError('not_found', 'account_deleted')
}

export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<Profile> {
  return unwrap(await supabase.from('profiles').update(patch).eq('id', userId).select('*').single())
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  return Boolean(check(await supabase.rpc('is_username_available', { p_username: username })))
}

export async function getPublicProfile(username: string) {
  const rows = check(await supabase.rpc('public_profile', { p_username: username }))
  return rows?.[0] ?? null
}

/** 1-based place in the waitlist, or null once the account is active. */
export async function getWaitlistPosition(): Promise<number | null> {
  return check(await supabase.rpc('waitlist_position'))
}
