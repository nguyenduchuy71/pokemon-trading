import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowLeftRight, Eye, Flag, MapPin, MessageCircle } from 'lucide-react'
import { useListing } from '@/queries/use-marketplace'
import { recordListingView } from '@/services/marketplace-service'
import { useContactOwner } from '@/hooks/use-contact-owner'
import { useCurrentUserId, useAuthStore } from '@/stores/auth-store'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { ListingGallery } from '@/components/marketplace/listing-gallery'
import { PriceTag } from '@/components/card/price-tag'
import { ConditionBadge, ListingTypeBadge } from '@/components/card/card-badges'
import { AddToWishlistButton } from '@/components/wishlist/add-to-wishlist-button'
import { SafetyNotice } from '@/components/safety/safety-notice'
import { ReportDialog } from '@/components/safety/report-dialog'
import { Avatar } from '@/components/ui/avatar'
import { Button, ButtonLink } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState, Skeleton } from '@/components/ui/feedback-states'
import { FOIL_RARITY_PATTERN } from '@/constants/domain'
import { formatCardNumber, formatDate, formatYear } from '@/utils/format'
import type { CardCondition } from '@/constants/domain'

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 text-sm">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}

export default function ListingDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation('marketplace')
  const { t: tc } = useTranslation()
  const locale = useUiPreferences((s) => s.locale)
  const userId = useCurrentUserId()
  const session = useAuthStore((s) => s.session)
  const listing = useListing(id)
  const { contact, pending } = useContactOwner()
  const [reporting, setReporting] = useState(false)

  const own = listing.data?.seller_id === userId
  useEffect(() => {
    if (listing.data && !own) void recordListingView(listing.data.id)
  }, [listing.data?.id, own]) // eslint-disable-line react-hooks/exhaustive-deps

  if (listing.isPending) {
    return (
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-10 md:grid-cols-2 md:px-8">
        <Skeleton className="aspect-[63/88] w-full max-w-[460px]" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-40" />
        </div>
      </div>
    )
  }
  if (listing.isError || !listing.data) {
    return (
      <EmptyState
        className="py-24"
        title={t('detail.not_found_title')}
        body={t('detail.not_found_body')}
        action={<ButtonLink to="/marketplace">{t('detail.back')}</ButtonLink>}
      />
    )
  }

  const l = listing.data
  const { card, item, seller } = l
  const isTrade = l.listing_type !== 'SALE'
  const active = l.is_active && l.moderation_status === 'VISIBLE'

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-16 pt-8 md:px-8">
      <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t('detail.back')}
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <ListingGallery photos={item.photos} foil={FOIL_RARITY_PATTERN.test(card.rarity ?? '')} alt={`${card.name} — ${card.set_name}`} />

        <div>
          {!active && <p className="mb-4 rounded-lg border border-ember/40 bg-ember/10 px-3 py-2 text-sm text-ember">{t('detail.hidden')}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <ListingTypeBadge type={l.listing_type} />
            <ConditionBadge condition={item.condition as CardCondition} long />
            {item.grading_company && <Badge tone="brass">{`${item.grading_company} ${item.grade}`}</Badge>}
          </div>

          <p className="eyebrow mt-5">{card.set_name}</p>
          <h1 className="mt-2 text-4xl leading-[1.05] md:text-5xl">{card.name}</h1>
          <p className="mt-2 font-mono text-sm text-ink-muted">
            {formatCardNumber(card.card_number, card.printed_total)}
            {card.rarity && <span className="ml-3 font-sans italic">{card.rarity}</span>}
          </p>

          <div className="mt-6 flex items-end justify-between gap-4">
            <PriceTag price={l.price} currency={l.currency} size="lg" />
            <p className="flex items-center gap-1 font-mono text-[11px] text-ink-faint">
              <Eye className="h-3 w-3" aria-hidden />
              {t('detail.views', { count: l.view_count })} · {t('detail.listed', { date: formatDate(l.created_at, locale) })}
            </p>
          </div>

          {own ? (
            <div className="card-surface mt-6 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <span className="text-ink-muted">{t('detail.your_listing')}</span>
              <ButtonLink to={`/collection/${item.collection_id}`} variant="secondary" size="sm">
                {t('detail.manage')}
              </ButtonLink>
            </div>
          ) : (
            active && (
              <div className="mt-6 space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button size="lg" className="flex-1" loading={pending} onClick={() => void contact(seller.id, l.id)}>
                    {!pending && <MessageCircle className="h-4 w-4" aria-hidden />}
                    {tc('actions.message_owner')}
                  </Button>
                  {isTrade && (
                    <Button size="lg" variant="secondary" className="flex-1" disabled={pending} onClick={() => void contact(seller.id, l.id)}>
                      <ArrowLeftRight className="h-4 w-4 text-verdigris" aria-hidden />
                      {tc('actions.interested_in_trading')}
                    </Button>
                  )}
                </div>
                <AddToWishlistButton cardId={card.id} printing={item.printing} className="w-full" />
                <p className="pt-1 text-center text-[11px] text-ink-faint">{t('detail.contact_note')}</p>
              </div>
            )
          )}

          {l.looking_for.length > 0 && (
            <section className="mt-8">
              <h2 className="eyebrow">{t('detail.looking_for')}</h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {l.looking_for.map((w) => (
                  <li key={w}>
                    <Badge tone="verdigris">{w}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {l.description && (
            <section className="mt-8">
              <h2 className="eyebrow">{t('detail.description')}</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-muted">{l.description}</p>
            </section>
          )}

          <dl className="mt-8">
            <Spec label={t('detail.set')} value={`${card.set_name} (${card.set_code})`} />
            <Spec label={t('detail.number')} value={<span className="font-mono">{formatCardNumber(card.card_number, card.printed_total)}</span>} />
            <Spec label={t('detail.rarity')} value={card.rarity} />
            <Spec label={t('detail.type')} value={card.type} />
            <Spec label={t('detail.hp')} value={card.hp} />
            <Spec label={t('detail.language')} value={tc(`language.${card.language}`)} />
            <Spec label={t('detail.printing')} value={tc(`printing.${item.printing}`)} />
            <Spec label={t('detail.condition')} value={tc(`condition.${item.condition}`)} />
            <Spec label={t('detail.graded')} value={item.grading_company ? `${item.grading_company} ${item.grade}` : null} />
            <Spec label={t('detail.quantity')} value={l.quantity} />
          </dl>

          <section className="card-surface mt-8 p-5" aria-label={t('detail.owner')}>
            <p className="eyebrow">{t('detail.owner')}</p>
            <Link to={`/users/${seller.username}`} className="mt-3 flex items-center gap-3 hover:text-brass">
              <Avatar src={seller.avatar_url} name={seller.username} size={48} />
              <div>
                <p className="font-display text-xl">{seller.display_name || seller.username}</p>
                <p className="font-mono text-xs text-ink-muted">@{seller.username}</p>
              </div>
            </Link>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
              {seller.location_city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {seller.location_city}
                </span>
              )}
              <span>{tc('member_since', { year: formatYear(seller.created_at) })}</span>
            </p>
            {seller.bio && <p className="mt-3 line-clamp-3 text-sm text-ink-muted">{seller.bio}</p>}
          </section>

          <SafetyNotice className="mt-6" />

          {session && !own && (
            <button type="button" onClick={() => setReporting(true)} className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ember">
              <Flag className="h-3 w-3" aria-hidden />
              {tc('safety:report_listing')}
            </button>
          )}
        </div>
      </div>

      <ReportDialog open={reporting} onClose={() => setReporting(false)} target={{ kind: 'listing', listingId: l.id }} />
    </div>
  )
}
