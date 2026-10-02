import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { BookmarkPlus, Pencil, Trash2 } from 'lucide-react'
import { useAddToWishlist, useRemoveWishlistItem, useWishlist, useWishlistAvailability } from '@/queries/use-wishlist'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { CardPicker } from '@/components/catalog/card-picker'
import { WishlistItemSheet } from '@/components/wishlist/wishlist-item-sheet'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback-states'
import { toast } from '@/components/ui/toast'
import { WISHLIST_PRIORITIES } from '@/constants/domain'
import { errorKey } from '@/utils/app-error'
import { formatCardNumber, formatMoney } from '@/utils/format'
import type { WishlistEntry } from '@/services/wishlist-service'

export default function WishlistPage() {
  const { t } = useTranslation('wishlist')
  const { t: tc } = useTranslation()
  const { locale, currency } = useUiPreferences()
  const wishlist = useWishlist()
  const availability = useWishlistAvailability()
  const add = useAddToWishlist()
  const remove = useRemoveWishlistItem()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<WishlistEntry | null>(null)

  function removeEntry(entry: WishlistEntry) {
    remove.mutate(entry.id, {
      onSuccess: () =>
        toast.success(t('removed'), {
          label: tc('actions.undo'),
          onClick: () =>
            add.mutate({
              card_id: entry.card_id,
              quantity: entry.quantity,
              max_price: entry.max_price,
              max_price_currency: entry.max_price_currency,
              min_condition: entry.min_condition,
              printing: entry.printing,
              priority: entry.priority,
              notes: entry.notes,
            }),
        }),
      onError: (e) => toast.error(tc(errorKey(e))),
    })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="mt-2 text-4xl md:text-6xl">{t('title')}</h1>
          <p className="mt-3 max-w-xl text-ink-muted">{t('lede')}</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <BookmarkPlus className="h-4 w-4" aria-hidden />
          {t('add')}
        </Button>
      </header>

      <div className="mt-10">
        {wishlist.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : wishlist.isError ? (
          <ErrorState error={wishlist.error} onRetry={() => void wishlist.refetch()} />
        ) : wishlist.data.length === 0 ? (
          <EmptyState icon={<BookmarkPlus className="h-5 w-5" />} title={t('empty_title')} body={t('empty_body')} action={<Button onClick={() => setAdding(true)}>{t('add')}</Button>} />
        ) : (
          WISHLIST_PRIORITIES.map((priority) => {
            const group = wishlist.data.filter((w) => w.priority === priority)
            if (!group.length) return null
            return (
              <section key={priority} className="mb-10">
                <h2 className="eyebrow mb-3">
                  {t('priority')} · {t(`priorities.${priority}`)}
                </h2>
                <ul className="space-y-2.5">
                  {group.map((w) => {
                    const available = availability.data?.get(w.id) ?? 0
                    return (
                      <li key={w.id} className="card-surface flex items-center gap-4 p-3 pr-4">
                        <div className="aspect-[63/88] w-14 shrink-0 overflow-hidden rounded-[6px] bg-raised">
                          {w.card.image_small_url && <img src={w.card.image_small_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-lg leading-tight">{w.card.name}</p>
                          <p className="truncate text-xs text-ink-muted">
                            {w.card.set_name} <span className="font-mono">{formatCardNumber(w.card.card_number, w.card.printed_total)}</span>
                            {w.card.language === 'ja' && ' · JP'}
                          </p>
                          <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-ink-faint">
                            {w.max_price != null && <span>≤ {formatMoney(Number(w.max_price), w.max_price_currency, locale)}</span>}
                            {w.min_condition && <span>≥ {tc(`condition.${w.min_condition}`)}</span>}
                            {w.printing && <span>{tc(`printing.${w.printing}`)}</span>}
                            {w.quantity > 1 && <span>×{w.quantity}</span>}
                          </p>
                        </div>
                        <Link to={`/marketplace?card=${w.card_id}`} className="hidden shrink-0 sm:block">
                          {available > 0 ? <Badge tone="moss">{t('available', { count: available })}</Badge> : <Badge>{t('none_available')}</Badge>}
                        </Link>
                        <div className="flex shrink-0 gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditing(w)} aria-label={tc('actions.edit')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeEntry(w)} aria-label={tc('actions.delete')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })
        )}
      </div>

      <Dialog open={adding} onClose={() => setAdding(false)} title={t('add_title')} variant="sheet">
        <CardPicker
          autoFocus
          onPick={(card) =>
            add.mutate(
              { card_id: card.id, min_condition: 'NEAR_MINT', max_price_currency: currency, priority: 'MEDIUM' },
              {
                onSuccess: () => {
                  toast.success(t('added'))
                  setAdding(false)
                },
                onError: (e) => toast.error(tc(errorKey(e))),
              },
            )
          }
        />
      </Dialog>

      <WishlistItemSheet entry={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
