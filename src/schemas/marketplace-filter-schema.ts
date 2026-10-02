import { CARD_CONDITIONS, LISTING_TYPES, PRINTINGS, type CardCondition, type ListingType } from '@/constants/domain'
import { VN_CITIES } from '@/constants/vn-cities'

export const SORTS = ['recent', 'price_asc', 'price_desc', 'popular', 'views'] as const
export type MarketplaceSort = (typeof SORTS)[number]

export interface MarketplaceFilters {
  q: string
  sets: string[]
  rarities: string[]
  conditions: CardCondition[]
  languages: string[]
  printings: string[]
  types: ListingType[]
  min?: number
  max?: number
  city?: string
  cardId?: string
  sort: MarketplaceSort
}

export const EMPTY_FILTERS: MarketplaceFilters = {
  q: '',
  sets: [],
  rarities: [],
  conditions: [],
  languages: [],
  printings: [],
  types: [],
  sort: 'recent',
}

const list = (v: string | null) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30) : [])
const oneOf = <T extends string>(allowed: readonly T[], values: string[]) => values.filter((v): v is T => (allowed as readonly string[]).includes(v))
const num = (v: string | null) => {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** URL → filters. Unknown/invalid values are dropped rather than erroring (shared links stay usable). */
export function parseFilters(params: URLSearchParams): MarketplaceFilters {
  const sort = params.get('sort')
  const city = params.get('city') ?? undefined
  const card = params.get('card') ?? undefined
  return {
    q: (params.get('q') ?? '').slice(0, 100),
    sets: list(params.get('set')),
    rarities: list(params.get('rarity')),
    conditions: oneOf(CARD_CONDITIONS, list(params.get('cond'))),
    languages: oneOf(['en', 'ja'] as const, list(params.get('lang'))),
    printings: oneOf(PRINTINGS, list(params.get('printing'))),
    types: oneOf(LISTING_TYPES, list(params.get('type'))),
    min: num(params.get('min')),
    max: num(params.get('max')),
    city: city && (VN_CITIES as readonly string[]).includes(city) ? city : undefined,
    cardId: card && UUID.test(card) ? card : undefined,
    sort: (SORTS as readonly string[]).includes(sort ?? '') ? (sort as MarketplaceSort) : 'recent',
  }
}

/** Filters → URL (omits defaults so links stay short). */
export function serializeFilters(f: MarketplaceFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.sets.length) p.set('set', f.sets.join(','))
  if (f.rarities.length) p.set('rarity', f.rarities.join(','))
  if (f.conditions.length) p.set('cond', f.conditions.join(','))
  if (f.languages.length) p.set('lang', f.languages.join(','))
  if (f.printings.length) p.set('printing', f.printings.join(','))
  if (f.types.length) p.set('type', f.types.join(','))
  if (f.min != null) p.set('min', String(f.min))
  if (f.max != null) p.set('max', String(f.max))
  if (f.city) p.set('city', f.city)
  if (f.cardId) p.set('card', f.cardId)
  if (f.sort !== 'recent') p.set('sort', f.sort)
  return p
}

export function activeFilterCount(f: MarketplaceFilters): number {
  return f.sets.length + f.rarities.length + f.conditions.length + f.languages.length + f.printings.length + f.types.length +
    (f.min != null ? 1 : 0) + (f.max != null ? 1 : 0) + (f.city ? 1 : 0) + (f.cardId ? 1 : 0)
}
