import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addWishlistItem, getWishlistAvailability, listWishlistItems, removeWishlistItem, updateWishlistItem } from '@/services/wishlist-service'
import { useCurrentUserId } from '@/stores/auth-store'

const wishlistKey = (userId?: string) => ['wishlist', userId] as const

export function useWishlist() {
  const userId = useCurrentUserId()
  return useQuery({ queryKey: wishlistKey(userId), queryFn: () => listWishlistItems(userId!), enabled: Boolean(userId) })
}

export function useWishlistAvailability() {
  const userId = useCurrentUserId()
  return useQuery({ queryKey: ['wishlist', 'availability', userId], queryFn: getWishlistAvailability, enabled: Boolean(userId), staleTime: 60_000 })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['wishlist'] })
    void qc.invalidateQueries({ queryKey: ['collections', 'stats'] })
  }
}

export function useAddToWishlist() {
  const userId = useCurrentUserId()
  const onSuccess = useInvalidate()
  return useMutation({ mutationFn: (input: Parameters<typeof addWishlistItem>[1]) => addWishlistItem(userId!, input), onSuccess })
}

export function useUpdateWishlistItem() {
  const onSuccess = useInvalidate()
  return useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateWishlistItem>[1] }) => updateWishlistItem(id, patch), onSuccess })
}

export function useRemoveWishlistItem() {
  const onSuccess = useInvalidate()
  return useMutation({ mutationFn: removeWishlistItem, onSuccess })
}

/** Card ids already on the viewer's wishlist (for button state). */
export function useWishlistedCardIds(): Set<string> {
  const { data } = useWishlist()
  return new Set(data?.map((w) => w.card_id) ?? [])
}
