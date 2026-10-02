import { supabase } from '@/lib/supabase-client'
import { check, unwrap } from '@/utils/app-error'
import type { PokemonCard, WishlistItem } from '@/types/models'
import type { TablesInsert, TablesUpdate } from '@/types/database'

export type WishlistEntry = WishlistItem & { card: PokemonCard }

export async function getDefaultWishlistId(ownerId: string): Promise<string> {
  const row = unwrap(await supabase.from('wishlists').select('id').eq('owner_id', ownerId).eq('is_default', true).single())
  return row.id
}

export async function listWishlistItems(ownerId: string): Promise<WishlistEntry[]> {
  return unwrap(
    await supabase.from('wishlist_items').select('*, card:pokemon_cards(*)').eq('owner_id', ownerId).order('created_at', { ascending: false }),
  ) as unknown as WishlistEntry[]
}

export async function addWishlistItem(ownerId: string, input: Omit<TablesInsert<'wishlist_items'>, 'owner_id' | 'wishlist_id'>): Promise<WishlistItem> {
  const wishlistId = await getDefaultWishlistId(ownerId)
  return unwrap(await supabase.from('wishlist_items').insert({ ...input, owner_id: ownerId, wishlist_id: wishlistId }).select('*').single())
}

export async function updateWishlistItem(id: string, patch: TablesUpdate<'wishlist_items'>): Promise<WishlistItem> {
  return unwrap(await supabase.from('wishlist_items').update(patch).eq('id', id).select('*').single())
}

export async function removeWishlistItem(id: string): Promise<void> {
  check(await supabase.from('wishlist_items').delete().eq('id', id))
}

export async function getWishlistAvailability(): Promise<Map<string, number>> {
  const rows = check(await supabase.rpc('wishlist_availability')) ?? []
  return new Map(rows.map((r) => [r.wishlist_item_id, r.available_count]))
}
