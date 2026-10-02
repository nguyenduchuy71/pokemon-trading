import { useTranslation } from 'react-i18next'
import { Spinner } from '@/components/ui/spinner'

export function FullPageSpinner() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[60dvh] items-center justify-center text-brass">
      <Spinner className="h-6 w-6" label={t('app.name')} />
    </div>
  )
}
