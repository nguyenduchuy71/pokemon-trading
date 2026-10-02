import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Search, SlidersHorizontal, X } from 'lucide-react'
import { useMarketplaceParams } from '@/hooks/use-marketplace-params'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useMarketplaceSearch } from '@/queries/use-marketplace'
import { useCatalogCard } from '@/queries/use-catalog'
import { activeFilterCount, SORTS, type MarketplaceSort } from '@/schemas/marketplace-filter-schema'
import { FilterPanel } from '@/components/marketplace/filter-panel'
import { ListingGrid, ListingGridSkeleton } from '@/components/marketplace/listing-grid'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/ui/feedback-states'
import { Select } from '@/components/ui/form-controls'

export default function MarketplacePage() {
  const { t } = useTranslation('marketplace')
  const { filters, update, reset } = useMarketplaceParams()
  const [q, setQ] = useState(filters.q)
  const debouncedQ = useDebouncedValue(q, 300)
  const [sheetOpen, setSheetOpen] = useState(false)
  const search = useMarketplaceSearch(filters)
  const pinnedCard = useCatalogCard(filters.cardId)
  const count = activeFilterCount(filters)

  // Typing updates the URL (replace, so each keystroke isn't a history entry).
  useEffect(() => {
    if (debouncedQ !== filters.q) update({ q: debouncedQ }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ])
  useEffect(() => setQ(filters.q), [filters.q])

  const listings = search.data?.pages.flat() ?? []

  const sortSelect = (
    <Select aria-label={t('sort')} value={filters.sort} onChange={(e) => update({ sort: e.target.value as MarketplaceSort })} className="h-10 w-auto min-w-44 text-xs">
      {SORTS.map((s) => (
        <option key={s} value={s}>
          {t(`sorts.${s}`)}
        </option>
      ))}
    </Select>
  )

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-8 md:px-8 md:pt-12">
      <header className="max-w-3xl">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="mt-2 text-4xl md:text-6xl">{t('title')}</h1>
        <p className="mt-3 text-ink-muted">{t('lede')}</p>
      </header>

      <div className="sticky top-0 z-20 -mx-4 mt-8 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-md md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">{t('search_placeholder')}</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('search_placeholder')}
              className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-sm placeholder:text-ink-faint focus:border-brass focus:outline-none"
            />
          </label>
          <div className="hidden md:block">{sortSelect}</div>
        </div>
        <div className="mt-2.5 flex gap-2 md:hidden">
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => setSheetOpen(true)}>
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            {t('filters')}
            {count > 0 && <span className="rounded-full bg-brass px-1.5 font-mono text-[10px] text-on-brass">{count}</span>}
          </Button>
          <div className="flex-1 [&>select]:w-full">{sortSelect}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr]">
        <aside className="hidden md:block" aria-label={t('filters')}>
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">{t('filters')}</h2>
              {count > 0 && (
                <button type="button" onClick={reset} className="text-xs text-brass hover:underline">
                  {t('clear')}
                </button>
              )}
            </div>
            <FilterPanel />
          </div>
        </aside>

        <section aria-live="polite" aria-busy={search.isFetching}>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            {!search.isPending && <span className="font-mono">{search.hasNextPage ? t('results_more', { count: listings.length }) : t('results', { count: listings.length })}</span>}
            <span className="inline-flex items-center gap-1 text-ink-faint">
              <Camera className="h-3 w-3" aria-hidden />
              {t('real_photos_note')}
            </span>
            {filters.cardId && pinnedCard.data && (
              <button type="button" onClick={() => update({ cardId: undefined })} className="inline-flex items-center gap-1 rounded-full border border-brass/50 px-2.5 py-0.5 text-brass">
                {t('facets.card')}: {pinnedCard.data.name}
                <X className="h-3 w-3" aria-hidden />
              </button>
            )}
          </div>

          {search.isPending ? (
            <ListingGridSkeleton />
          ) : search.isError ? (
            <ErrorState error={search.error} onRetry={() => void search.refetch()} />
          ) : listings.length === 0 ? (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title={t('empty_title')}
              body={t('empty_body')}
              action={
                count > 0 ? (
                  <Button variant="secondary" onClick={reset}>
                    {t('clear')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <ListingGrid listings={listings} hasMore={search.hasNextPage} loadingMore={search.isFetchingNextPage} onLoadMore={() => void search.fetchNextPage()} />
              {!search.hasNextPage && listings.length > 12 && <p className="mt-10 text-center font-mono text-xs text-ink-faint">{t('end')}</p>}
            </>
          )}
        </section>
      </div>

      <Dialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('filters')}
        variant="sheet"
        footer={
          <>
            {count > 0 && (
              <Button variant="ghost" onClick={reset}>
                {t('clear')}
              </Button>
            )}
            <Button onClick={() => setSheetOpen(false)}>{t('apply')}</Button>
          </>
        }
      >
        <FilterPanel />
      </Dialog>
    </div>
  )
}
