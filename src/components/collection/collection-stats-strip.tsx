import { useTranslation } from 'react-i18next'
import { useCollectionStats } from '@/queries/use-collections'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { formatMoney } from '@/utils/format'
import { Skeleton } from '@/components/ui/feedback-states'
import { cn } from '@/utils/cn'

/** Ledger-style row of collection figures. */
export function CollectionStatsStrip({ className }: { className?: string }) {
  const { t } = useTranslation('collection')
  const { currency, locale } = useUiPreferences()
  const stats = useCollectionStats()

  if (stats.isPending) return <Skeleton className={cn('h-24', className)} />
  if (!stats.data) return null
  const s = stats.data
  const items = [
    { label: t('stats.value'), value: `≈ ${formatMoney(Math.round(Number(s.estimated_value)), currency, locale)}`, wide: true, title: t('stats.value_hint') },
    { label: t('stats.total'), value: s.total_cards },
    { label: t('stats.unique'), value: s.unique_cards },
    { label: t('stats.sets'), value: s.sets },
    { label: t('stats.for_sale'), value: s.listed_for_sale },
    { label: t('stats.for_trade'), value: s.listed_for_trade },
  ]

  return (
    <dl className={cn('card-surface grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-x', className)}>
      {items.map((item) => (
        <div key={item.label} title={item.title} className={cn('px-5 py-4', item.wide && 'col-span-2 sm:col-span-3 lg:col-span-1')}>
          <dt className="eyebrow">{item.label}</dt>
          <dd className={cn('mt-1.5 font-display tabular-nums', item.wide ? 'text-2xl text-brass' : 'text-2xl')}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
