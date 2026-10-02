import { useTranslation } from 'react-i18next'
import { ButtonLink } from '@/components/ui/button'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-4 py-28 text-center">
      <p className="font-mono text-xs tracking-[0.3em] text-brass">404 · EMPTY POCKET</p>
      <h1 className="mt-4 text-4xl">{t('errors.not_found_title')}</h1>
      <p className="mt-3 text-ink-muted">{t('errors.not_found_body')}</p>
      <ButtonLink to="/marketplace" className="mt-8">
        {t('nav.marketplace')}
      </ButtonLink>
    </section>
  )
}
