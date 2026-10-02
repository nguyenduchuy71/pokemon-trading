import { useEffect } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { onboardingSchema, type OnboardingInput, type OnboardingValues } from '@/schemas/profile-schema'
import { useMe, useUpdateMe } from '@/queries/use-me'
import { useUsernameAvailability } from '@/hooks/use-username-availability'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { VN_CITIES } from '@/constants/vn-cities'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/form-controls'
import { toast } from '@/components/ui/toast'
import { errorKey } from '@/utils/app-error'
import { safeNext } from '@/utils/safe-next'

export default function OnboardingPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation()
  const me = useMe()
  const update = useUpdateMe()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const prefs = useUiPreferences()

  const form = useForm<OnboardingInput, unknown, OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      username: '',
      display_name: '',
      preferred_locale: prefs.locale,
      preferred_currency: prefs.currency,
    },
  })
  const { register, handleSubmit, formState, watch, reset } = form
  const username = watch('username') ?? ''
  const availability = useUsernameAvailability(username)

  useEffect(() => {
    if (me.data) reset((v) => ({ ...v, display_name: me.data.display_name ?? '' }))
  }, [me.data, reset])

  if (me.data?.terms_accepted_at) return <Navigate to={safeNext(params.get('next'))} replace />

  const onSubmit = handleSubmit(async (values) => {
    if (availability === 'taken') return
    try {
      await update.mutateAsync({
        username: values.username,
        display_name: values.display_name,
        location_city: values.location_city,
        preferred_locale: values.preferred_locale,
        preferred_currency: values.preferred_currency,
        terms_accepted_at: new Date().toISOString(),
      })
      prefs.setLocale(values.preferred_locale)
      prefs.setCurrency(values.preferred_currency)
      navigate(safeNext(params.get('next')), { replace: true })
    } catch (error) {
      toast.error(tc(errorKey(error) === 'errors.duplicate' ? 'errors.duplicate' : errorKey(error)))
    }
  })

  const err = (key?: string) => (key ? t(`onboarding.${key}`) : undefined)

  return (
    <section className="mx-auto max-w-xl px-4 py-14 md:py-20">
      <p className="eyebrow">{t('onboarding.eyebrow')}</p>
      <h1 className="mt-3 text-4xl md:text-5xl">{t('onboarding.title')}</h1>
      <p className="mt-3 text-ink-muted">{t('onboarding.lede')}</p>

      <form onSubmit={onSubmit} noValidate className="card-surface mt-10 space-y-5 p-6 md:p-8">
        <Field
          label={t('onboarding.username')}
          hint={t('onboarding.username_hint')}
          error={err(formState.errors.username?.message) ?? (availability === 'taken' ? t('onboarding.username_taken') : undefined)}
        >
          {(p) => (
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-faint">@</span>
              <Input {...p} {...register('username')} autoComplete="username" autoCapitalize="none" className="pl-8 font-mono" />
              {availability === 'available' && <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss" aria-hidden />}
            </div>
          )}
        </Field>

        <Field label={t('onboarding.display_name')}>{(p) => <Input {...p} {...register('display_name')} autoComplete="name" />}</Field>

        <Field label={t('onboarding.city')} error={formState.errors.location_city ? t('onboarding.city_placeholder') : undefined}>
          {(p) => (
            <Select {...p} {...register('location_city')} defaultValue="">
              <option value="" disabled>
                {t('onboarding.city_placeholder')}
              </option>
              {VN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={tc('prefs.language')}>
            {(p) => (
              <Select {...p} {...register('preferred_locale')}>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </Select>
            )}
          </Field>
          <Field label={tc('prefs.currency')}>
            {(p) => (
              <Select {...p} {...register('preferred_currency')}>
                <option value="VND">VND ₫</option>
                <option value="USD">USD $</option>
              </Select>
            )}
          </Field>
        </div>

        <div>
          <label className="flex items-start gap-3 text-sm text-ink-muted">
            <input type="checkbox" {...register('accept_terms')} className="mt-0.5 h-4 w-4 accent-[var(--brass)]" />
            <span>
              {t('onboarding.terms')}{' '}
              <Link to="/legal/terms" target="_blank" className="text-brass hover:underline">
                {tc('footer.terms')}
              </Link>
              {' · '}
              <Link to="/legal/privacy" target="_blank" className="text-brass hover:underline">
                {tc('footer.privacy')}
              </Link>
            </span>
          </label>
          {formState.errors.accept_terms && <p className="mt-1.5 text-xs text-ember">{t('onboarding.terms_required')}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          {t('onboarding.submit')}
        </Button>
      </form>
    </section>
  )
}
