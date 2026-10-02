import { useTranslation } from 'react-i18next'
import { ArrowLeftRight, Tag } from 'lucide-react'
import type { CardCondition, ListingType } from '@/constants/domain'
import { Badge } from '@/components/ui/badge'

const CONDITION_SHORT: Record<CardCondition, string> = {
  MINT: 'M',
  NEAR_MINT: 'NM',
  EXCELLENT: 'EX',
  LIGHT_PLAYED: 'LP',
  PLAYED: 'PL',
  POOR: 'PR',
}

export function ConditionBadge({ condition, long = false }: { condition: CardCondition; long?: boolean }) {
  const { t } = useTranslation()
  return (
    <Badge tone="neutral" className="font-mono">
      <abbr title={t(`condition.${condition}`)} className="no-underline">
        {long ? t(`condition.${condition}`) : CONDITION_SHORT[condition]}
      </abbr>
    </Badge>
  )
}

export function ListingTypeBadge({ type }: { type: ListingType }) {
  const { t } = useTranslation()
  if (type === 'TRADE') {
    return (
      <Badge tone="verdigris">
        <ArrowLeftRight className="h-3 w-3" aria-hidden />
        {t('listing_type.TRADE')}
      </Badge>
    )
  }
  if (type === 'SALE') {
    return (
      <Badge tone="brass">
        <Tag className="h-3 w-3" aria-hidden />
        {t('listing_type.SALE')}
      </Badge>
    )
  }
  return <Badge tone="brass">{t('listing_type.SALE_OR_TRADE')}</Badge>
}
