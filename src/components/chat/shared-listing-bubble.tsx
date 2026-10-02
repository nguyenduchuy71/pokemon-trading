import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PriceTag } from '@/components/card/price-tag'
import { formatCardNumber } from '@/utils/format'
import type { SharedListingRef } from '@/services/messaging-service'

/** A shared listing is only a reference card (spec §14) — never an order, trade or reservation. */
export function SharedListingBubble({ listing, listingId }: { listing?: SharedListingRef | null; listingId: string | null }) {
  const { t } = useTranslation('chat')
  const { t: tc } = useTranslation()
  const available = listing && listing.is_active && listing.moderation_status === 'VISIBLE'

  if (!listing || !available) {
    return <div className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-xs italic text-ink-faint">{t('listing_unavailable')}</div>
  }

  return (
    <div className="w-64 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex gap-3 p-3">
        <div className="aspect-[63/88] w-14 shrink-0 overflow-hidden rounded-[6px] bg-raised">
          {listing.card?.image_small_url && <img src={listing.card.image_small_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 text-left">
          <p className="truncate font-display text-base leading-tight text-ink">{listing.card?.name}</p>
          <p className="truncate text-[11px] text-ink-muted">
            {listing.card?.set_name} <span className="font-mono">{listing.card && formatCardNumber(listing.card.card_number, listing.card.printed_total)}</span>
          </p>
          {listing.item && <p className="text-[11px] text-ink-faint">{tc(`condition.${listing.item.condition}`)}</p>}
          <PriceTag price={listing.price} currency={listing.currency} className="mt-1 [&>span:first-child]:text-base" />
        </div>
      </div>
      <Link to={`/cards/${listingId}`} className="block border-t border-line px-3 py-2 text-center text-xs font-medium text-brass hover:bg-raised">
        {tc('actions.view_listing')}
      </Link>
    </div>
  )
}
