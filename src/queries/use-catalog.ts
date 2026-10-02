import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getCatalogCard, searchCatalog } from '@/services/catalog-service'

/** Catalog data changes only on import runs → cache generously. */
export function useCatalogSearch(q: string, language?: string) {
  return useQuery({
    queryKey: ['catalog-search', q.trim().toLowerCase(), language ?? 'all'],
    queryFn: () => searchCatalog(q, language),
    enabled: q.trim().length >= 2,
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  })
}

export function useCatalogCard(id?: string) {
  return useQuery({ queryKey: ['catalog-card', id], queryFn: () => getCatalogCard(id!), enabled: Boolean(id), staleTime: 60 * 60_000 })
}
