import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useMe } from '@/queries/use-me'
import { FullPageSpinner } from '@/components/layout/full-page-spinner'
import { ErrorState } from '@/components/ui/feedback-states'

/** Signed in AND onboarded (username + terms accepted). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, initialized } = useAuthStore()
  const location = useLocation()
  const me = useMe()

  if (!initialized || (session && me.isPending)) return <FullPageSpinner />
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  if (me.isError) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />
  if (!me.data?.terms_accepted_at && location.pathname !== '/onboarding') {
    return <Navigate to={`/onboarding?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  return <>{children}</>
}

/** Write areas (add card, binders, chat). Waitlisted accounts browse instead; RLS enforces it too. */
export function RequireActive({ children }: { children: ReactNode }) {
  const me = useMe()
  return (
    <RequireAuth>
      {me.data?.status === 'WAITLISTED' ? <Navigate to="/marketplace" replace /> : children}
    </RequireAuth>
  )
}

/** UI convenience only — admin RPCs and RLS enforce the real check server-side. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const me = useMe()
  return (
    <RequireAuth>
      {me.data?.role === 'ADMIN' ? children : <Navigate to="/dashboard" replace />}
    </RequireAuth>
  )
}

/** Login/landing: bounce signed-in users onward. */
export function RedirectIfSignedIn({ children, to = '/dashboard' }: { children: ReactNode; to?: string }) {
  const { session, initialized } = useAuthStore()
  if (!initialized) return <FullPageSpinner />
  if (session) return <Navigate to={to} replace />
  return <>{children}</>
}
