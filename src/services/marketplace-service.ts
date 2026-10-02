import { supabase } from '@/lib/supabase-client'
import { check, unwrap } from '@/utils/app-error'
import type { CurrencyCode } from '@/constants/domain'
import type { MarketplaceFilters } from '@/schemas/marketplace-filter-schema'
import type { CollectionItemPhoto, ListingSearchRow, PokemonCard, CardListing } from '@/types/models'

export const MARKETPLACE_PAGE_SIZE = 24

export interface MarketplaceFacets {
  sets: { code: string; name: string; language: string }[]
  rarities: string[]
  languages: string[]
  printings: string[]
}

const orNull = <T,>(arr: T[]) => (arr.length ? arr : undefined)

export async function searchListings(
  f: MarketplaceFilters,
  currency: CurrencyCode,
  page: number,
  extra: { sellerId?: string; types?: MarketplaceFilters['types']; limit?: number } = {},
): Promise<ListingSearchRow[]> {
  const limit = extra.limit ?? MARKETPLACE_PAGE_SIZE
  return (
    check(
      await supabase.rpc('search_listings', {
        p_q: f.q.trim() || undefined,
        p_set_codes: orNull(f.sets),
        p_rarities: orNull(f.rarities),
        p_conditions: orNull(f.conditions),
        p_languages: orNull(f.languages),
        p_printings: orNull(f.printings),
        p_types: orNull(extra.types ?? f.types),
        p_min: f.min,
        p_max: f.max,
        p_currency: currency,
        p_city: f.city,
        p_card_id: f.cardId,
        p_seller: extra.sellerId,
        p_sort: f.sort,
        p_limit: limit,
        p_offset: page * limit,
      }),
    ) ?? []
  )
}

export async function getFacets(): Promise<MarketplaceFacets> {
  return (check(await supabase.rpc('marketplace_facets')) as unknown as MarketplaceFacets) ?? { sets: [], rarities: [], languages: [], printings: [] }
}

export interface ListingDetail extends CardListing {
  card: PokemonCard
  item: {
    id: string
    collection_id: string
    condition: string
    printing: string
    grading_company: string | null
    grade: number | null
    photos: CollectionItemPhoto[]
  }
  seller: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    location_city: string | null
    bio: string | null
    created_at: string
  }
}

export async function getListing(id: string): Promise<ListingDetail> {
  return unwrap(
    await supabase
      .from('card_listings')
      .select(
        '*, card:pokemon_cards(*), item:collection_items(id, collection_id, condition, printing, grading_company, grade, photos:collection_item_photos(*)), ' +
          'seller:profiles!card_listings_seller_id_fkey(id, username, display_name, avatar_url, location_city, bio, created_at)',
      )
      .eq('id', id)
      .single(),
  ) as unknown as ListingDetail
}

/** Counts once per signed-in viewer per day (server ignores anonymous and own views). */
export async function recordListingView(listingId: string): Promise<void> {
  await supabase.rpc('record_listing_view', { p_listing: listingId })
}
