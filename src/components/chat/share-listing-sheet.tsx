import { useTranslation } from 'react-i18next'
import { useListingStrip } from '@/queries/use-marketplace'
import { useCurrentUserId } from '@/stores/auth-store'
import { EMPTY_FILTERS } from '@/schemas/marketplace-filter-schema'
import { publicImageUrl } from '@/services/storage-service'
import { Dialog } from '@/components/ui/dialog'
import { PriceTag } from '@/components/card/price-tag'
import { Skeleton } from '@/components/ui/feedback-states'
import { formatCardNumber } from '@/utils/format'

/** Pick one of your own active listings to share as a reference in chat. */
export function ShareListingSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (listingId: string) => void }) {
  const { t } = useTranslation('chat')
  const userId = useCurrentUserId()
  const mine = useListingStrip('share-own', EMPTY_FILTERS, { sellerId: userId, limit: 48, enabled: open && Boolean(userId) })

  return (
    <Dialog open={open} onClose={onClose} title={t('share_title')} description={t('shared_reference')} variant="sheet">
      {mine.isPending ? (
        <Skeleton className="h-40" />
      ) : !mine.data?.length ? (
        <p className="py-8 text-center text-sm text-ink-muted">{t('share_empty')}</p>
      ) : (
        <ul className="space-y-2">
          {mine.data.map((l) => (
            <li key={l.listing_id}>
              <button type="button" onClick={() => onPick(l.listing_id)} className="flex w-full items-center gap-3 rounded-xl border border-line p-2 text-left hover:border-brass">
                <img src={publicImageUrl('card-images', l.thumb_path) ?? l.card_image_small ?? ''} alt="" className="aspect-[63/88] w-12 rounded-[5px] object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{l.card_name}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {l.set_name} {formatCardNumber(l.card_number, l.printed_total)}
                  </span>
                </span>
                <PriceTag price={l.price} currency={l.currency} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}
