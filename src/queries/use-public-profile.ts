import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase-client'
import { getPublicProfile } from '@/services/profile-service'
import { useCurrentUserId } from '@/stores/auth-store'
import { unwrap } from '@/utils/app-error'
import type { ItemWithDetails } from '@/services/collection-service'
import type { WishlistEntry } from '@/services/wishlist-service'

export function usePublicProfile(username?: string) {
  const viewer = useCurrentUserId()
  return useQuery({ queryKey: ['public-profile', username, viewer], queryFn: () => getPublicProfile(username!), enabled: Boolean(username) })
}

/** Items in the owner's public binders (RLS also enforces visibility). */
export function usePublicCollection(ownerId?: string, enabled = true) {
  return useQuery({
    queryKey: ['public-profile', 'collection', ownerId],
    enabled: Boolean(ownerId) && enabled,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('collection_items')
          .select('*, card:pokemon_cards(*), photos:collection_item_photos(*), listings:card_listings(*), collection:collections!inner(is_public, name)')
          .eq('owner_id', ownerId!)
          .eq('collection.is_public', true)
          .order('created_at', { ascending: false })
          .limit(120),
      ) as unknown as ItemWithDetails[],
  })
}

export function usePublicWishlist(ownerId?: string, enabled = true) {
  return useQuery({
    queryKey: ['public-profile', 'wishlist', ownerId],
    enabled: Boolean(ownerId) && enabled,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('wishlist_items')
          .select('*, card:pokemon_cards(*), wishlist:wishlists!inner(is_public)')
          .eq('owner_id', ownerId!)
          .eq('wishlist.is_public', true)
          .order('priority')
          .limit(120),
      ) as unknown as WishlistEntry[],
  })
}
