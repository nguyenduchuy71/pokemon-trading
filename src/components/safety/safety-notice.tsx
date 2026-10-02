import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/utils/cn'

/** Calm, unobtrusive reminder shown on listing and contact surfaces (spec §23). */
export function SafetyNotice({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useTranslation('safety')
  const points = t('notice_points', { returnObjects: true }) as string[]
  return (
    <aside aria-label={t('notice_title')} className={cn('rounded-xl border border-verdigris/25 bg-verdigris/5 p-4 text-xs leading-relaxed text-ink-muted', className)}>
      <p className="flex items-center gap-2 font-medium text-verdigris">
        <ShieldCheck className="h-4 w-4" aria-hidden />
        {t('notice_title')}
      </p>
      <p className="mt-1.5">{t('notice_body')}</p>
      {!compact && (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <Link to="/legal/safety" className="mt-2 inline-block text-verdigris hover:underline">
        {t('learn_more')}
      </Link>
    </aside>
  )
}
