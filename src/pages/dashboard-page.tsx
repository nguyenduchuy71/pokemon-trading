import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Circle } from 'lucide-react'
import { useMe } from '@/queries/use-me'
import { useCollectionStats } from '@/queries/use-collections'
import { useInbox, useUnreadCount } from '@/queries/use-inbox'
import { useListingStrip } from '@/queries/use-marketplace'
import { useWishlist, useWishlistAvailability } from '@/queries/use-wishlist'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { useChatWidget } from '@/stores/chat-widget-store'
import { EMPTY_FILTERS } from '@/schemas/marketplace-filter-schema'
import { InboxList } from '@/components/chat/inbox-list'
import { ListingGrid, ListingGridSkeleton } from '@/components/marketplace/listing-grid'
import { Skeleton } from '@/components/ui/feedback-states'
import { firstSteps } from '@/utils/first-steps'
import { formatCardNumber, formatMoney } from '@/utils/format'
import { cn } from '@/utils/cn'

function Tile({ label, value, to, accent }: { label: string; value: React.ReactNode; to: string; accent?: boolean }) {
  return (
    <Link to={to} className={cn('card-surface block px-5 py-4 transition-colors hover:border-line-strong', accent && 'foil-edge')}>
      <p className="eyebrow">{label}</p>
      <p className={cn('mt-1.5 font-display text-3xl tabular-nums', accent && 'text-brass')}>{value}</p>
    </Link>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation('home')
  const { currency, locale } = useUiPreferences()
  const { openInbox, openThread } = useChatWidget()
  const me = useMe()
  const stats = useCollectionStats()
  const unread = useUnreadCount()
  const inbox = useInbox()
  const wishlist = useWishlist()
  const availability = useWishlistAvailability()
  const recent = useListingStrip('dashboard-recent', EMPTY_FILTERS, { limit: 6 })

  const s = stats.data
  const steps = s && me.data ? firstSteps({
    totalCards: Number(s.total_cards),
    listed: Number(s.listed_for_sale) + Number(s.listed_for_trade),
    wishlist: Number(s.wishlist_count),
    hasAvatar: Boolean(me.data.avatar_url),
    hasBio: Boolean(me.data.bio),
  }) : []
  const showSteps = steps.some((x) => !x.done)
  const available = (wishlist.data ?? []).filter((w) => (availability.data?.get(w.id) ?? 0) > 0)

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-8 md:py-14">
      <header>
        <p className="eyebrow">{t('dashboard.lede')}</p>
        <h1 className="mt-2 text-4xl md:text-5xl">{t('dashboard.greeting', { name: me.data?.display_name || me.data?.username || '' })}</h1>
      </header>

      {s ? (
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-[1.7fr_repeat(5,1fr)]">
          <div className="col-span-2 md:col-span-3 xl:col-span-1">
            <Tile label={t('dashboard.stats.value')} value={`≈ ${formatMoney(Math.round(Number(s.estimated_value)), currency, locale)}`} to="/collection" accent />
          </div>
          <Tile label={t('dashboard.stats.total')} value={s.total_cards} to="/collection" />
          <Tile label={t('dashboard.stats.for_sale')} value={s.listed_for_sale} to="/collection" />
          <Tile label={t('dashboard.stats.for_trade')} value={s.listed_for_trade} to="/collection" />
          <Tile label={t('dashboard.stats.wishlist')} value={s.wishlist_count} to="/wishlist" />
          <Tile label={t('dashboard.stats.unread')} value={unread} to="/messages" />
        </div>
      ) : (
        <Skeleton className="mt-8 h-24" />
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-10">
          {available.length > 0 && (
            <section>
              <h2 className="text-2xl">{t('dashboard.wishlist_available')}</h2>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {available.slice(0, 6).map((w) => (
                  <li key={w.id}>
                    <Link to={`/marketplace?card=${w.card_id}`} className="card-surface flex items-center gap-3 p-2.5 hover:border-brass">
                      {w.card.image_small_url && <img src={w.card.image_small_url} alt="" loading="lazy" className="aspect-[63/88] w-11 rounded-[5px] object-cover" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display">{w.card.name}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {w.card.set_name} {formatCardNumber(w.card.card_number, w.card.printed_total)}
                        </span>
                      </span>
                      <span className="font-mono text-xs text-moss">{t('wishlist:available', { count: availability.data?.get(w.id) ?? 0 })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-2xl">{t('dashboard.recent')}</h2>
              <Link to="/marketplace" className="text-xs text-brass hover:underline">
                {t('dashboard.see_all')}
              </Link>
            </div>
            {recent.isPending ? <ListingGridSkeleton count={3} /> : <ListingGrid listings={recent.data ?? []} />}
          </section>
        </div>

        <aside className="space-y-6">
          {showSteps && (
            <section className="card-surface p-5">
              <h2 className="text-xl">{t('dashboard.first_steps')}</h2>
              <ul className="mt-4 space-y-2.5">
                {steps.map((step) => (
                  <li key={step.key}>
                    <Link to={step.to} className={cn('flex items-center gap-2.5 text-sm', step.done ? 'text-ink-faint line-through' : 'hover:text-brass')}>
                      {step.done ? <CheckCircle2 className="h-4 w-4 text-moss" aria-hidden /> : <Circle className="h-4 w-4 text-ink-faint" aria-hidden />}
                      {t(`dashboard.${step.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card-surface overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="text-xl">{t('dashboard.messages')}</h2>
              <button type="button" onClick={openInbox} className="text-xs text-brass hover:underline">
                {t('dashboard.see_all')}
              </button>
            </div>
            <div className="mt-2">
              {inbox.isPending ? (
                <Skeleton className="m-5 h-20" />
              ) : inbox.data?.length ? (
                <InboxList rows={inbox.data.slice(0, 5)} onSelect={openThread} />
              ) : (
                <p className="px-5 pb-5 text-sm text-ink-muted">{t('dashboard.messages_empty')}</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
