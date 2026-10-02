import { memo } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { MapPin, MessageCircle } from 'lucide-react'
import { HoloFrame } from '@/components/card/holo-frame'
import { PriceTag } from '@/components/card/price-tag'
import { ConditionBadge, ListingTypeBadge } from '@/components/card/card-badges'
import { AddToWishlistButton } from '@/components/wishlist/add-to-wishlist-button'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { publicImageUrl } from '@/services/storage-service'
import { useContactOwner } from '@/hooks/use-contact-owner'
import { useCurrentUserId } from '@/stores/auth-store'
import { FOIL_RARITY_PATTERN } from '@/constants/domain'
import { formatCardNumber, formatYear } from '@/utils/format'
import type { ListingSearchRow } from '@/types/models'

/**
 * Marketplace tile. Primary actions are Message owner / Add to wishlist — never buy, cart or checkout. [scope-guard: allow]
 * Reputation shows honest v1 signals (member since, city); community reviews arrive in v1.1.
 */
export const ListingCard = memo(function ListingCard({ listing }: { listing: ListingSearchRow }) {
  const { t } = useTranslation()
  const { t: tm } = useTranslation('marketplace')
  const userId = useCurrentUserId()
  const { contact, pending } = useContactOwner()
  const photo = publicImageUrl('card-images', listing.thumb_path) ?? listing.card_image_small ?? undefined
  const own = listing.seller_id === userId
  const href = `/cards/${listing.listing_id}`

  return (
    <article className="group card-surface flex flex-col overflow-hidden p-2.5">
      <Link to={href} className="block rounded-[10px]" aria-label={`${listing.card_name} — ${listing.set_name} ${formatCardNumber(listing.card_number, listing.printed_total)}`}>
        <HoloFrame foil={FOIL_RARITY_PATTERN.test(listing.rarity ?? '')} className="aspect-[63/88] rounded-[10px] bg-raised">
          {photo && (
            <img
              src={photo}
              alt=""
              loading="lazy"
              decoding="async"
              width={320}
              height={447}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          )}
          <div className="absolute left-2 top-2 rounded-full bg-bg/85 backdrop-blur-sm">
            <ListingTypeBadge type={listing.listing_type} />
          </div>
          {listing.card_language === 'ja' && <span className="absolute right-2 top-2 rounded-md bg-black/65 px-1.5 py-0.5 font-mono text-[10px] text-white">JP</span>}
        </HoloFrame>
      </Link>

      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
        <Link to={href} className="hover:text-brass">
          <h3 className="line-clamp-1 font-display text-[1.05rem] leading-snug">{listing.card_name}</h3>
        </Link>
        {listing.card_language !== 'en' && listing.pokemon_name && <p className="line-clamp-1 text-[11px] text-ink-faint">{listing.pokemon_name}</p>}
        <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">
          {listing.set_name} <span className="font-mono text-ink-faint">{formatCardNumber(listing.card_number, listing.printed_total)}</span>
        </p>
        {listing.rarity && <p className="mt-0.5 line-clamp-1 text-[11px] italic text-ink-faint">{listing.rarity}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-1">
          <ConditionBadge condition={listing.condition} />
          {listing.grading_company && <span className="font-mono text-[11px] text-brass">{`${listing.grading_company} ${listing.grade}`}</span>}
          {listing.quantity > 1 && <span className="font-mono text-[11px] text-ink-faint">{tm('card.quantity', { count: listing.quantity })}</span>}
        </div>

        <div className="mt-2.5">
          <PriceTag price={listing.price} currency={listing.currency} convertedPrice={listing.price_converted} />
        </div>

        <Link to={`/users/${listing.seller_username}`} className="mt-3 flex items-center gap-2 border-t border-line pt-2.5 text-xs hover:text-brass">
          <Avatar src={listing.seller_avatar_url} name={listing.seller_username} size={22} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{listing.seller_username}</span>
            <span className="flex items-center gap-1 truncate text-[10px] text-ink-faint">
              {listing.seller_city && (
                <>
                  <MapPin className="h-2.5 w-2.5" aria-hidden />
                  {listing.seller_city} ·{' '}
                </>
              )}
              {t('member_since_short', { year: formatYear(listing.seller_since) })}
            </span>
          </span>
        </Link>

        {!own && (
          <div className="mt-2.5 flex gap-1.5">
            <Button size="sm" className="flex-1" loading={pending} onClick={() => void contact(listing.seller_id, listing.listing_id)}>
              {!pending && <MessageCircle className="h-3.5 w-3.5" aria-hidden />}
              <span className="truncate">{t('actions.message_owner')}</span>
            </Button>
            <AddToWishlistButton cardId={listing.card_id} printing={listing.printing} size="icon" variant="ghost" className="h-8 w-8" />
          </div>
        )}
      </div>
    </article>
  )
})
