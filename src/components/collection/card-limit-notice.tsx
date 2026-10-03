import { useTranslation } from 'react-i18next'
import { Archive } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'

/** Shown instead of the add-card flow once the per-user card cap (free tier) is reached. */
export function CardLimitNotice({ max }: { max: number }) {
  const { t } = useTranslation('collection')
  return (
    <div className="card-surface mt-8 flex flex-col items-start gap-3 p-5 md:p-7" role="status">
      <Archive className="h-6 w-6 text-brass" aria-hidden />
      <h2 className="text-2xl">{t('add.limit_title')}</h2>
      <p className="text-sm text-ink-muted">{t('add.limit_body', { max })}</p>
      <ButtonLink to="/collection" variant="ghost" size="sm">
        {t('add.limit_cta')}
      </ButtonLink>
    </div>
  )
}
