import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Ban, Flag, MapPin, MessageCircle } from 'lucide-react'
import { usePublicCollection, usePublicProfile, usePublicWishlist } from '@/queries/use-public-profile'
import { useListingStrip } from '@/queries/use-marketplace'
import { useUnblockUser } from '@/queries/use-safety'
import { useContactOwner } from '@/hooks/use-contact-owner'
import { useAuthStore, useCurrentUserId } from '@/stores/auth-store'
import { EMPTY_FILTERS } from '@/schemas/marketplace-filter-schema'
import { ListingGrid, ListingGridSkeleton } from '@/components/marketplace/listing-grid'
import { BinderPocket } from '@/components/collection/binder-pocket'
import { ItemSheet } from '@/components/collection/item-sheet'
import { ReportDialog } from '@/components/safety/report-dialog'
import { BlockDialog } from '@/components/safety/block-dialog'
import { Avatar } from '@/components/ui/avatar'
import { Button, ButtonLink } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback-states'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { formatCardNumber, formatYear } from '@/utils/format'
import type { ItemWithDetails } from '@/services/collection-service'

type Tab = 'collection' | 'sale' | 'trade' | 'wishlist'
const TABS: Tab[] = ['collection', 'sale', 'trade', 'wishlist']

export default function PublicProfilePage() {
  const { username } = useParams()
  const { t } = useTranslation('profile')
  const { t: tc } = useTranslation()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'collection') as Tab
  const session = useAuthStore((s) => s.session)
  const viewerId = useCurrentUserId()
  const profile = usePublicProfile(username)
  const p = profile.data
  const own = p?.id === viewerId
  const { contact, pending } = useContactOwner()
  const unblock = useUnblockUser()
  const [reporting, setReporting] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [openItem, setOpenItem] = useState<ItemWithDetails | null>(null)

  const collection = usePublicCollection(p?.id, tab === 'collection')
  const forSale = useListingStrip('profile-sale', EMPTY_FILTERS, { sellerId: p?.id, types: ['SALE', 'SALE_OR_TRADE'], limit: 48, enabled: Boolean(p?.id) && tab === 'sale' })
  const forTrade = useListingStrip('profile-trade', EMPTY_FILTERS, { sellerId: p?.id, types: ['TRADE', 'SALE_OR_TRADE'], limit: 48, enabled: Boolean(p?.id) && tab === 'trade' })
  const wishlist = usePublicWishlist(p?.id, tab === 'wishlist')

  if (profile.isPending) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-12">
        <Skeleton className="h-40" />
      </div>
    )
  }
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
  if (!p) return <EmptyState className="py-24" title={t('not_found_title')} body={t('not_found_body')} action={<ButtonLink to="/marketplace">{tc('nav.marketplace')}</ButtonLink>} />

  const stats = [
    { label: t('stats.collection'), value: p.collection_size },
    { label: t('stats.listed'), value: p.listed_count },
    { label: t('stats.wishlist'), value: p.wishlist_count },
  ]

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-10 md:px-8">
      <header className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div className="flex items-center gap-5">
          <Avatar src={p.avatar_url} name={p.username} size={96} className="border-2 border-brass/40" />
          <div className="min-w-0">
            <h1 className="truncate text-4xl md:text-5xl">{p.display_name || p.username}</h1>
            <p className="mt-1 font-mono text-sm text-ink-muted">@{p.username}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-ink-faint">
              {p.location_city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {p.location_city}
                </span>
              )}
              <span>{tc('member_since', { year: formatYear(p.created_at) })}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {own ? (
            <ButtonLink to="/profile" variant="secondary">
              {t('edit')}
            </ButtonLink>
          ) : p.is_blocked_by_me ? (
            <Button variant="secondary" loading={unblock.isPending} onClick={() => unblock.mutate(p.id)}>
              {tc('actions.unblock')}
            </Button>
          ) : (
            <>
              <Button loading={pending} onClick={() => void contact(p.id)}>
                {!pending && <MessageCircle className="h-4 w-4" aria-hidden />}
                {t('message')}
              </Button>
              {session && (
                <>
                  <Button variant="ghost" size="icon" onClick={() => setReporting(true)} aria-label={tc('safety:report_user')}>
                    <Flag className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setBlocking(true)} aria-label={tc('actions.block')}>
                    <Ban className="h-4 w-4" />
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </header>

      {p.bio && <p className="mt-6 max-w-2xl leading-relaxed text-ink-muted">{p.bio}</p>}
      {p.is_blocked_by_me && <p className="mt-4 text-sm text-ember">{t('blocked_notice')}</p>}

      <div className="mt-8 grid gap-4 md:grid-cols-[auto_1fr]">
        <dl className="card-surface grid grid-cols-3 divide-x divide-line">
          {stats.map((s) => (
            <div key={s.label} className="px-6 py-4">
              <dt className="eyebrow">{s.label}</dt>
              <dd className="mt-1 font-display text-3xl tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
        <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong px-5 py-4 text-xs text-ink-muted">
          <p className="eyebrow">{t('reputation_title')}</p>
          <p className="mt-1.5">{t('reputation_soon')}</p>
          <p className="mt-1 text-ink-faint">{t('reputation_disclaimer')}</p>
        </div>
      </div>

      <Tabs
        className="mt-10"
        label={p.username}
        value={tab}
        onChange={(v) => setParams({ tab: v }, { replace: true })}
        items={TABS.map((v) => ({ value: v, label: t(`tabs.${v}`) }))}
      />

      <div className="mt-6" role="tabpanel">
        {tab === 'collection' &&
          (collection.isPending ? (
            <ListingGridSkeleton count={6} />
          ) : !collection.data?.length ? (
            <EmptyState title={t('empty_collection')} />
          ) : (
            <DndContext>
              <SortableContext items={[]}>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
                  {collection.data.map((item) => (
                    <BinderPocket key={item.id} item={item} onOpen={setOpenItem} sortable={false} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ))}

        {(tab === 'sale' || tab === 'trade') &&
          (() => {
            const q = tab === 'sale' ? forSale : forTrade
            if (q.isPending) return <ListingGridSkeleton count={4} />
            if (!q.data?.length) return <EmptyState title={t(tab === 'sale' ? 'empty_sale' : 'empty_trade')} />
            return <ListingGrid listings={q.data} />
          })()}

        {tab === 'wishlist' &&
          (wishlist.isPending ? (
            <Skeleton className="h-32" />
          ) : !wishlist.data?.length ? (
            <EmptyState title={t('empty_wishlist')} />
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {wishlist.data.map((w) => (
                <li key={w.id} className="card-surface flex items-center gap-3 p-2.5">
                  {w.card.image_small_url && <img src={w.card.image_small_url} alt="" loading="lazy" className="aspect-[63/88] w-12 rounded-[5px] object-cover" />}
                  <div className="min-w-0">
                    <p className="truncate font-display">{w.card.name}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {w.card.set_name} <span className="font-mono">{formatCardNumber(w.card.card_number, w.card.printed_total)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ))}
      </div>

      <ItemSheet item={openItem} binders={[]} onClose={() => setOpenItem(null)} onMove={() => undefined} editable={false} />
      {!own && (
        <>
          <ReportDialog open={reporting} onClose={() => setReporting(false)} target={{ kind: 'user', userId: p.id, username: p.username }} />
          <BlockDialog open={blocking} onClose={() => setBlocking(false)} userId={p.id} username={p.username} />
        </>
      )}
    </div>
  )
}
