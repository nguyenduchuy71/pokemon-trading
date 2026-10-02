import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ListingCard } from './listing-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/feedback-states'
import type { ListingSearchRow } from '@/types/models'

export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card-surface p-2.5">
          <Skeleton className="aspect-[63/88]" />
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
          <Skeleton className="mt-3 h-6 w-1/3" />
        </div>
      ))}
    </div>
  )
}

interface ListingGridProps {
  listings: ListingSearchRow[]
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

/** 2 columns on phones, auto-fill (≈4–6) on desktop. Infinite scroll with a button fallback. */
export function ListingGrid({ listings, hasMore, loadingMore, onLoadMore }: ListingGridProps) {
  const { t } = useTranslation()
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hasMore || !onLoadMore || !sentinel.current) return
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && !loadingMore && onLoadMore(), { rootMargin: '600px' })
    io.observe(sentinel.current)
    return () => io.disconnect()
  }, [hasMore, loadingMore, onLoadMore])

  // Offset pagination can repeat a row if new listings arrive mid-scroll → dedupe.
  const seen = new Set<string>()
  const unique = listings.filter((l) => (seen.has(l.listing_id) ? false : (seen.add(l.listing_id), true)))

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
        {unique.map((l) => (
          <ListingCard key={l.listing_id} listing={l} />
        ))}
      </div>
      {hasMore && (
        <div ref={sentinel} className="mt-8 flex justify-center">
          <Button variant="secondary" onClick={onLoadMore} loading={loadingMore}>
            {t('actions.load_more')}
          </Button>
        </div>
      )}
    </>
  )
}
