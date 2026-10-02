import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'
import { queryClient } from '@/lib/query-client'

interface AuthState {
  session: Session | null
  initialized: boolean
}

/** Supabase session mirror. Server data (the profile) lives in TanStack Query, not here. */
export const useAuthStore = create<AuthState>(() => ({ session: null, initialized: false }))

let started = false

/** Call once at boot: restores the persisted session and follows auth changes. */
export function startAuthListener(): void {
  if (started) return
  started = true
  void supabase.auth.getSession().then(({ data }) => {
    useAuthStore.setState({ session: data.session, initialized: true })
  })
  supabase.auth.onAuthStateChange((event, session) => {
    const previousUser = useAuthStore.getState().session?.user.id
    useAuthStore.setState({ session, initialized: true })
    // Never leak one user's cached data into another session.
    if (event === 'SIGNED_OUT' || (previousUser && previousUser !== session?.user.id)) queryClient.clear()
  })
}

export function useCurrentUserId(): string | undefined {
  return useAuthStore((s) => s.session?.user.id)
}
