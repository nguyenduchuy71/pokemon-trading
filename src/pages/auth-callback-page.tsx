import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { ButtonLink } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { safeNext } from '@/utils/safe-next'

/**
 * supabase-js exchanges the PKCE code automatically (detectSessionInUrl). We wait for the
 * session, then RequireAuth on the destination routes to onboarding when needed.
 */
export default function AuthCallbackPage() {
  const { t } = useTranslation('auth')
  const [params] = useSearchParams()
  const { session, initialized } = useAuthStore()
  const [timedOut, setTimedOut] = useState(false)
  const oauthError = params.get('error_description')

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(id)
  }, [])

  if (session) return <Navigate to={safeNext(params.get('next'))} replace />

  if (oauthError || (initialized && timedOut)) {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-ink-muted">{t('callback.failed')}</p>
        <ButtonLink to="/login" variant="secondary" className="mt-6">
          {t('login.title')}
        </ButtonLink>
      </section>
    )
  }

  return (
    <section className="flex flex-col items-center gap-4 px-4 py-32 text-brass">
      <Spinner className="h-6 w-6" />
      <p className="font-display text-lg italic text-ink-muted">{t('callback.working')}</p>
    </section>
  )
}
