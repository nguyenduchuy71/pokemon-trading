import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Camera, ExternalLink, LogOut, Settings } from 'lucide-react'
import { profileEditSchema, type ProfileEditInput, type ProfileEditValues } from '@/schemas/profile-schema'
import { useMe, useUpdateMe } from '@/queries/use-me'
import { useUsernameAvailability } from '@/hooks/use-username-availability'
import { VN_CITIES } from '@/constants/vn-cities'
import { processAvatar, ImageInputError } from '@/utils/image-processing'
import { uploadAvatar } from '@/services/storage-service'
import { signOut } from '@/services/auth-service'
import { Avatar } from '@/components/ui/avatar'
import { Button, ButtonLink } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/form-controls'
import { FullPageSpinner } from '@/components/layout/full-page-spinner'
import { toast } from '@/components/ui/toast'
import { errorKey } from '@/utils/app-error'
import { formatYear } from '@/utils/format'

export default function ProfilePage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation()
  const me = useMe()
  const update = useUpdateMe()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const form = useForm<ProfileEditInput, unknown, ProfileEditValues>({ resolver: zodResolver(profileEditSchema) })
  const { register, handleSubmit, formState, reset, watch } = form
  const availability = useUsernameAvailability(watch('username') ?? '', me.data?.username)

  useEffect(() => {
    if (me.data)
      reset({
        username: me.data.username,
        display_name: me.data.display_name ?? '',
        bio: me.data.bio ?? '',
        location_city: (me.data.location_city ?? 'Other (Vietnam)') as ProfileEditInput['location_city'],
      })
  }, [me.data, reset])

  if (!me.data) return <FullPageSpinner />
  const profile = me.data

  async function changeAvatar(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadAvatar(profile.id, await processAvatar(file))
      await update.mutateAsync({ avatar_url: url })
      toast.success(t('profile.saved'))
    } catch (error) {
      toast.error(error instanceof ImageInputError ? tc('collection:photos.invalid') : tc(errorKey(error)))
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (availability === 'taken') return
    try {
      await update.mutateAsync(values)
      toast.success(t('profile.saved'))
    } catch (error) {
      toast.error(tc(errorKey(error)))
    }
  })

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{tc('member_since', { year: formatYear(profile.created_at) })}</p>
          <h1 className="mt-2 text-4xl">{t('profile.title')}</h1>
        </div>
        <div className="flex gap-2">
          <ButtonLink to={`/users/${profile.username}`} variant="secondary" size="sm">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            {t('profile.public_link')}
          </ButtonLink>
          <ButtonLink to="/settings" variant="ghost" size="sm" aria-label={tc('nav.settings')}>
            <Settings className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="card-surface mt-8 space-y-5 p-6 md:p-8">
        <div className="flex items-center gap-5">
          <Avatar src={profile.avatar_url} name={profile.username} size={72} />
          <div>
            <p className="text-sm text-ink-muted">{t('profile.avatar')}</p>
            <Button variant="secondary" size="sm" className="mt-2" loading={uploading} onClick={() => fileRef.current?.click()}>
              <Camera className="h-3.5 w-3.5" aria-hidden />
              {t('profile.change_avatar')}
            </Button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => void changeAvatar(e.target.files?.[0])} />
          </div>
        </div>

        <Field
          label={t('onboarding.username')}
          error={formState.errors.username ? t('onboarding.username_invalid') : availability === 'taken' ? t('onboarding.username_taken') : undefined}
        >
          {(p) => <Input {...p} {...register('username')} className="font-mono" autoCapitalize="none" />}
        </Field>
        <Field label={t('onboarding.display_name')}>{(p) => <Input {...p} {...register('display_name')} />}</Field>
        <Field label={t('profile.bio')}>{(p) => <Textarea {...p} {...register('bio')} placeholder={t('profile.bio_placeholder')} maxLength={500} />}</Field>
        <Field label={t('onboarding.city')}>
          {(p) => (
            <Select {...p} {...register('location_city')}>
              {VN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="flex justify-end">
          <Button type="submit" loading={formState.isSubmitting}>
            {tc('actions.save')}
          </Button>
        </div>
      </form>

      <div className="mt-8 flex items-center justify-between text-sm">
        <Link to="/settings" className="text-ink-muted hover:text-ink">
          {tc('nav.settings')}
        </Link>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" aria-hidden />
          {tc('nav.sign_out')}
        </Button>
      </div>
    </section>
  )
}
