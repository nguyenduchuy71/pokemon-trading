import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { getFacets, getListing, MARKETPLACE_PAGE_SIZE, searchListings } from '@/services/marketplace-service'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { useCurrentUserId } from '@/stores/auth-store'
import type { MarketplaceFilters } from '@/schemas/marketplace-filter-schema'
import type { ListingType } from '@/constants/domain'

export function useMarketplaceSearch(filters: MarketplaceFilters) {
  const currency = useUiPreferences((s) => s.currency)
  // Viewer identity changes block filtering, so it is part of the key.
  const userId = useCurrentUserId()
  return useInfiniteQuery({
    queryKey: ['marketplace', 'search', filters, currency, userId],
    queryFn: ({ pageParam }) => searchListings(filters, currency, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === MARKETPLACE_PAGE_SIZE && all.length < 100 ? all.length : undefined),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

/** Small fixed lists (dashboard strips, profile tabs). */
export function useListingStrip(key: string, filters: MarketplaceFilters, opts: { sellerId?: string; types?: ListingType[]; limit?: number; enabled?: boolean } = {}) {
  const currency = useUiPreferences((s) => s.currency)
  const userId = useCurrentUserId()
  return useQuery({
    queryKey: ['marketplace', 'strip', key, filters, opts.sellerId, opts.types, currency, userId],
    queryFn: () => searchListings(filters, currency, 0, { sellerId: opts.sellerId, types: opts.types, limit: opts.limit ?? 12 }),
    enabled: opts.enabled ?? true,
    staleTime: 60_000,
  })
}

export function useMarketplaceFacets() {
  return useQuery({ queryKey: ['marketplace', 'facets'], queryFn: getFacets, staleTime: 10 * 60_000 })
}

export function useListing(id?: string) {
  const userId = useCurrentUserId()
  return useQuery({ queryKey: ['listing', id, userId], queryFn: () => getListing(id!), enabled: Boolean(id), retry: false })
}
