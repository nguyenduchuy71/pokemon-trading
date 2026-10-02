import { supabase } from '@/lib/supabase-client'
import { check, toAppError } from '@/utils/app-error'

/** Which sign-in providers the Auth server has enabled (public endpoint). */
export async function getAuthProviders(): Promise<{ google: boolean; email: boolean }> {
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string } })
  if (!res.ok) throw new Error(`auth settings ${res.status}`)
  const body = (await res.json()) as { external?: Record<string, boolean> }
  return { google: Boolean(body.external?.google), email: Boolean(body.external?.email) }
}

/** Google OAuth (PKCE). `next` survives the round trip via the callback URL. */
export async function signInWithGoogle(next?: string): Promise<void> {
  const redirectTo = new URL('/auth/callback', window.location.origin)
  if (next) redirectTo.searchParams.set('next', next)
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo.toString() } })
  if (error) throw toAppError(error)
}

/** Local development / E2E only — the email provider is disabled in production. */
export async function signInWithPasswordDev(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw toAppError(error)
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

/** Server-side deletion (Edge Function with service role): storage objects + auth user → cascades. */
export async function deleteMyAccount(): Promise<void> {
  check(await supabase.functions.invoke('delete-account', { method: 'POST' }))
  await supabase.auth.signOut()
}
