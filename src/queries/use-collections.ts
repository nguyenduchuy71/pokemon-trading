import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addCardToCollection,
  addPhotos,
  createCollection,
  createListing,
  deleteCollection,
  deleteItem,
  getCollection,
  getCollectionStats,
  listCollectionItems,
  listCollections,
  removePhoto,
  reorderItems,
  unlist,
  updateCollection,
  updateItem,
  updateListing,
  type ItemWithDetails,
} from '@/services/collection-service'
import { useCurrentUserId } from '@/stores/auth-store'
import { useUiPreferences } from '@/stores/ui-preferences-store'

export const collectionKeys = {
  all: ['collections'] as const,
  list: (ownerId?: string) => ['collections', 'list', ownerId] as const,
  detail: (id?: string) => ['collections', 'detail', id] as const,
  items: (id?: string) => ['collections', 'items', id] as const,
  stats: (currency: string) => ['collections', 'stats', currency] as const,
}

export function useCollections() {
  const userId = useCurrentUserId()
  return useQuery({ queryKey: collectionKeys.list(userId), queryFn: () => listCollections(userId!), enabled: Boolean(userId) })
}

export function useCollection(id?: string) {
  return useQuery({ queryKey: collectionKeys.detail(id), queryFn: () => getCollection(id!), enabled: Boolean(id) })
}

export function useCollectionItems(id?: string) {
  return useQuery({ queryKey: collectionKeys.items(id), queryFn: () => listCollectionItems(id!), enabled: Boolean(id) })
}

export function useCollectionStats() {
  const currency = useUiPreferences((s) => s.currency)
  const userId = useCurrentUserId()
  return useQuery({ queryKey: collectionKeys.stats(currency), queryFn: () => getCollectionStats(currency), enabled: Boolean(userId) })
}

/** Any collection write can change counts, stats and marketplace results. */
function useInvalidateCollections() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: collectionKeys.all })
    void qc.invalidateQueries({ queryKey: ['marketplace'] })
    void qc.invalidateQueries({ queryKey: ['listing'] })
    void qc.invalidateQueries({ queryKey: ['public-profile'] })
  }
}

export function useCreateCollection() {
  const userId = useCurrentUserId()
  const invalidate = useInvalidateCollections()
  return useMutation({ mutationFn: (input: Parameters<typeof createCollection>[1]) => createCollection(userId!, input), onSuccess: invalidate })
}

export function useUpdateCollection() {
  const invalidate = useInvalidateCollections()
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Parameters<typeof updateCollection>[1]) => updateCollection(id, patch),
    onSuccess: invalidate,
  })
}

export function useDeleteCollection() {
  const invalidate = useInvalidateCollections()
  return useMutation({ mutationFn: deleteCollection, onSuccess: invalidate })
}

export function useAddCard() {
  const userId = useCurrentUserId()
  const invalidate = useInvalidateCollections()
  return useMutation({
    mutationFn: (args: { item: Parameters<typeof addCardToCollection>[1]; photos: File[]; listing?: Parameters<typeof addCardToCollection>[3] }) =>
      addCardToCollection(userId!, args.item, args.photos, args.listing),
    onSuccess: invalidate,
  })
}

export function useUpdateItem() {
  const invalidate = useInvalidateCollections()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateItem>[1] }) => updateItem(id, patch),
    onSuccess: invalidate,
  })
}

export function useDeleteItem() {
  const invalidate = useInvalidateCollections()
  return useMutation({ mutationFn: (item: ItemWithDetails) => deleteItem(item), onSuccess: invalidate })
}

export function useAddPhotos() {
  const userId = useCurrentUserId()
  const invalidate = useInvalidateCollections()
  return useMutation({
    mutationFn: ({ itemId, files, start }: { itemId: string; files: File[]; start: number }) => addPhotos(userId!, itemId, files, start),
    onSuccess: invalidate,
  })
}

export function useRemovePhoto() {
  const invalidate = useInvalidateCollections()
  return useMutation({ mutationFn: removePhoto, onSuccess: invalidate })
}

/** Optimistic: the grid re-renders in the new order immediately. */
export function useReorderItems(collectionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ordered: ItemWithDetails[]) => reorderItems(collectionId, ordered.map((i) => i.id)),
    onMutate: async (ordered) => {
      await qc.cancelQueries({ queryKey: collectionKeys.items(collectionId) })
      const previous = qc.getQueryData<ItemWithDetails[]>(collectionKeys.items(collectionId))
      qc.setQueryData(collectionKeys.items(collectionId), ordered.map((item, i) => ({ ...item, position: i + 1 })))
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(collectionKeys.items(collectionId), ctx.previous),
    onSettled: () => void qc.invalidateQueries({ queryKey: collectionKeys.items(collectionId) }),
  })
}

export function useSaveListing() {
  const userId = useCurrentUserId()
  const invalidate = useInvalidateCollections()
  return useMutation({
    mutationFn: ({ item, listingId, values }: { item: ItemWithDetails; listingId?: string; values: Parameters<typeof updateListing>[1] }) =>
      listingId
        ? updateListing(listingId, { ...values, is_active: true })
        : createListing(userId!, item, values as Parameters<typeof createListing>[2]),
    onSuccess: invalidate,
  })
}

export function useUnlist() {
  const invalidate = useInvalidateCollections()
  return useMutation({ mutationFn: unlist, onSuccess: invalidate })
}
