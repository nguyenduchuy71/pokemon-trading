import { useTranslation } from 'react-i18next'
import type { CurrencyCode } from '@/constants/domain'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { formatMoney } from '@/utils/format'
import { cn } from '@/utils/cn'

interface PriceTagProps {
  price: number | null
  currency: CurrencyCode
  /** Server-side conversion into the viewer's display currency (search_listings.price_converted). */
  convertedPrice?: number | null
  size?: 'sm' | 'lg'
  className?: string
}

/** Native price first; "≈" line when the viewer browses in another currency. */
export function PriceTag({ price, currency, convertedPrice, size = 'sm', className }: PriceTagProps) {
  const { t } = useTranslation()
  const { locale, currency: displayCurrency } = useUiPreferences()

  if (price == null) {
    return <span className={cn('font-display italic text-ink-muted', size === 'lg' ? 'text-2xl' : 'text-base', className)}>{t('listing.trade_only')}</span>
  }

  const showConverted = displayCurrency !== currency && convertedPrice != null
  return (
    <span className={cn('flex flex-col', className)}>
      <span className={cn('font-display font-semibold tabular-nums text-ink', size === 'lg' ? 'text-3xl' : 'text-lg leading-tight')}>
        {formatMoney(price, currency, locale)}
      </span>
      {showConverted && (
        <span className="font-mono text-[11px] text-ink-faint" title={t('listing.approx_hint')}>
          ≈ {formatMoney(Math.round(convertedPrice), displayCurrency, locale)}
        </span>
      )}
    </span>
  )
}
