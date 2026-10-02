import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Trans, useTranslation } from 'react-i18next'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getAuthProviders, signInWithGoogle, signInWithPasswordDev } from '@/services/auth-service'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/form-controls'
import { CardFan } from '@/components/landing/card-fan'
import { toast } from '@/components/ui/toast'

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  )
}

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const [params] = useSearchParams()
  const next = params.get('next') ?? undefined
  const [loading, setLoading] = useState(false)
  // Avoid sending people to a raw JSON error when the provider isn't configured on this server.
  const providers = useQuery({ queryKey: ['auth-providers'], queryFn: getAuthProviders, staleTime: 5 * 60_000 })
  const googleDisabled = providers.data?.google === false

  async function google() {
    setLoading(true)
    try {
      await signInWithGoogle(next)
    } catch {
      toast.error(t('login.error'))
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-12 md:grid-cols-[1.1fr_1fr] md:px-8 md:py-20">
      <div className="order-2 md:order-1">
        <p className="eyebrow">{t('login.eyebrow')}</p>
        <h1 className="mt-4 text-4xl leading-[1.05] md:text-6xl">{t('login.headline')}</h1>
        <p className="mt-5 max-w-md text-ink-muted">{t('login.lede')}</p>
        <CardFan className="mt-10 max-w-[380px] md:mx-0" />
      </div>

      <div className="card-surface order-1 mx-auto w-full max-w-md p-7 md:order-2 md:p-9">
        <h2 className="text-3xl">{t('login.title')}</h2>
        <p className="mt-2 text-sm text-ink-muted">{t('login.subtitle')}</p>

        <Button size="lg" className="mt-8 w-full" onClick={google} loading={loading} disabled={googleDisabled}>
          {!loading && <GoogleGlyph />}
          {t('login.google')}
        </Button>
        {googleDisabled && (
          <p role="status" className="mt-3 flex gap-2 rounded-lg border border-brass/40 bg-brass/10 p-3 text-xs leading-relaxed text-brass">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {import.meta.env.DEV ? t('login.google_disabled_dev') : t('login.google_disabled')}
          </p>
        )}

        <p className="mt-5 text-center text-xs leading-relaxed text-ink-faint">
          <Trans
            t={t}
            i18nKey="login.legal"
            components={{
              terms: <Link to="/legal/terms" className="underline decoration-line-strong underline-offset-2 hover:text-ink" />,
              privacy: <Link to="/legal/privacy" className="underline decoration-line-strong underline-offset-2 hover:text-ink" />,
            }}
          />
        </p>

        <div className="rule my-7" />
        <p className="flex gap-2.5 text-xs leading-relaxed text-ink-muted">
          <ShieldCheck className="h-4 w-4 shrink-0 text-verdigris" aria-hidden />
          {t('login.no_payments')}
        </p>

        {import.meta.env.DEV && <DevPasswordForm />}
      </div>
    </section>
  )
}

/** Seeded local accounts (supabase/seed.sql) for development without Google credentials. */
function DevPasswordForm() {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('alex@cardswap.dev')
  const [password, setPassword] = useState('cardswap-dev')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await signInWithPasswordDev(email, password)
    } catch {
      toast.error(t('login.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-3 rounded-xl border border-dashed border-line-strong p-4">
      <p className="eyebrow">{t('login.dev_heading')}</p>
      <Field label={t('login.email')}>{(p) => <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
      <Field label={t('login.password')}>{(p) => <Input {...p} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
      <Button type="submit" variant="secondary" size="sm" loading={loading}>
        {t('login.dev_submit')}
      </Button>
    </form>
  )
}
