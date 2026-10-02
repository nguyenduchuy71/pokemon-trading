import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { parseFilters, serializeFilters, type MarketplaceFilters } from '@/schemas/marketplace-filter-schema'

/** Marketplace filters live in the URL: shareable, bookmarkable and back-button friendly. */
export function useMarketplaceParams() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])

  const update = useCallback(
    (patch: Partial<MarketplaceFilters>, opts: { replace?: boolean } = {}) => {
      setParams(serializeFilters({ ...parseFilters(params), ...patch }), { replace: opts.replace ?? false })
    },
    [params, setParams],
  )

  const toggle = useCallback(
    <K extends 'sets' | 'rarities' | 'conditions' | 'languages' | 'printings' | 'types'>(key: K, value: MarketplaceFilters[K][number]) => {
      const current = parseFilters(params)[key] as string[]
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      update({ [key]: next } as Partial<MarketplaceFilters>)
    },
    [params, update],
  )

  const reset = useCallback(() => setParams(serializeFilters({ ...parseFilters(new URLSearchParams()), q: parseFilters(params).q })), [params, setParams])

  return { filters, update, toggle, reset }
}
