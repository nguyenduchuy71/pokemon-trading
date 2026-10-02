import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useUiPreferences, type ThemePreference } from '@/stores/ui-preferences-store'
import { useMe, useUpdateMe } from '@/queries/use-me'
import { useBlockedUsers, useUnblockUser } from '@/queries/use-safety'
import { deleteMyAccount } from '@/services/auth-service'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/form-controls'
import { Skeleton } from '@/components/ui/feedback-states'
import { toast } from '@/components/ui/toast'
import { errorKey } from '@/utils/app-error'
import type { CurrencyCode } from '@/constants/domain'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-surface p-6 md:p-8">
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation()
  const prefs = useUiPreferences()
  const me = useMe()
  const updateMe = useUpdateMe()
  const blocked = useBlockedUsers()
  const unblock = useUnblockUser()
  const navigate = useNavigate()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Device preference first; mirror to the profile so other devices pick it up.
  function setLocale(locale: 'vi' | 'en') {
    prefs.setLocale(locale)
    updateMe.mutate({ preferred_locale: locale })
  }
  function setCurrency(currency: CurrencyCode) {
    prefs.setCurrency(currency)
    updateMe.mutate({ preferred_currency: currency })
  }

  async function removeAccount() {
    setDeleting(true)
    try {
      await deleteMyAccount()
      toast.success(t('settings.deleted'))
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(tc(errorKey(error)))
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <h1 className="text-4xl">{t('settings.title')}</h1>

      <Section title={t('settings.preferences')}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={tc('prefs.theme')}>
            {(p) => (
              <Select {...p} value={prefs.theme} onChange={(e) => prefs.setTheme(e.target.value as ThemePreference)}>
                <option value="dark">{tc('prefs.theme_dark')}</option>
                <option value="light">{tc('prefs.theme_light')}</option>
                <option value="system">{tc('prefs.theme_system')}</option>
              </Select>
            )}
          </Field>
          <Field label={tc('prefs.language')}>
            {(p) => (
              <Select {...p} value={prefs.locale} onChange={(e) => setLocale(e.target.value as 'vi' | 'en')}>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </Select>
            )}
          </Field>
          <Field label={tc('prefs.currency')}>
            {(p) => (
              <Select {...p} value={prefs.currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
                <option value="VND">VND ₫</option>
                <option value="USD">USD $</option>
              </Select>
            )}
          </Field>
        </div>
      </Section>

      <Section title={t('settings.blocked')}>
        {blocked.isPending ? (
          <Skeleton className="h-12" />
        ) : blocked.data?.length ? (
          <ul className="divide-y divide-line">
            {blocked.data.map((b) => (
              <li key={b.blocked_id} className="flex items-center gap-3 py-3">
                <Avatar src={b.profile?.avatar_url} name={b.profile?.username ?? '?'} size={32} />
                <Link to={`/users/${b.profile?.username}`} className="flex-1 font-mono text-sm hover:text-brass">
                  @{b.profile?.username}
                </Link>
                <Button variant="secondary" size="sm" loading={unblock.isPending && unblock.variables === b.blocked_id} onClick={() => unblock.mutate(b.blocked_id)}>
                  {tc('actions.unblock')}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">{t('settings.blocked_empty')}</p>
        )}
      </Section>

      <section className="rounded-[var(--radius-card)] border border-ember/40 p-6 md:p-8">
        <h2 className="text-2xl text-ember">{t('settings.danger')}</h2>
        <p className="mt-2 text-sm text-ink-muted">{t('settings.danger_body')}</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label={t('settings.danger_confirm_label')} className="flex-1">
            {(p) => <Input {...p} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />}
          </Field>
          <Button variant="danger" disabled={confirmText.trim() !== t('settings.danger_confirm_word') || !me.data} loading={deleting} onClick={() => void removeAccount()}>
            {t('settings.danger_submit')}
          </Button>
        </div>
      </section>
    </div>
  )
}
