import { supabase } from '@/lib/supabase-client'
import { check, unwrap } from '@/utils/app-error'
import { processCardPhoto } from '@/utils/image-processing'
import { removeObjects, uploadCardPhoto } from './storage-service'
import type { CurrencyCode } from '@/constants/domain'
import type { CardListing, Collection, CollectionItem, CollectionItemPhoto, CollectionStats, PokemonCard } from '@/types/models'
import type { TablesInsert, TablesUpdate } from '@/types/database'

export type CollectionWithCount = Collection & { items: { count: number }[] }

export type ItemWithDetails = CollectionItem & {
  card: PokemonCard
  photos: CollectionItemPhoto[]
  listings: CardListing[]
}

const ITEM_SELECT = '*, card:pokemon_cards(*), photos:collection_item_photos(*), listings:card_listings(*)'

export function activeListing(item: Pick<ItemWithDetails, 'listings'>): CardListing | undefined {
  return item.listings.find((l) => l.is_active)
}

export function sortedPhotos(item: Pick<ItemWithDetails, 'photos'>): CollectionItemPhoto[] {
  return [...item.photos].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
}

// ---------- collections ----------

export async function listCollections(ownerId: string): Promise<CollectionWithCount[]> {
  return unwrap(
    await supabase.from('collections').select('*, items:collection_items(count)').eq('owner_id', ownerId).order('is_default', { ascending: false }).order('position').order('created_at'),
  ) as CollectionWithCount[]
}

export async function getCollection(id: string): Promise<Collection> {
  return unwrap(await supabase.from('collections').select('*').eq('id', id).single())
}

export async function createCollection(ownerId: string, input: { name: string; description?: string | null; is_public: boolean }): Promise<Collection> {
  return unwrap(await supabase.from('collections').insert({ owner_id: ownerId, ...input }).select('*').single())
}

export async function updateCollection(id: string, patch: Pick<TablesUpdate<'collections'>, 'name' | 'description' | 'is_public'>): Promise<Collection> {
  return unwrap(await supabase.from('collections').update(patch).eq('id', id).select('*').single())
}

export async function deleteCollection(id: string): Promise<void> {
  check(await supabase.rpc('delete_collection', { p_collection: id }))
}

export async function getCollectionStats(currency: CurrencyCode): Promise<CollectionStats> {
  const rows = check(await supabase.rpc('collection_stats', { p_currency: currency }))
  return rows![0]
}

// ---------- items ----------

export async function listCollectionItems(collectionId: string): Promise<ItemWithDetails[]> {
  return unwrap(
    await supabase.from('collection_items').select(ITEM_SELECT).eq('collection_id', collectionId).order('position').order('created_at'),
  ) as unknown as ItemWithDetails[]
}

export type NewItem = Omit<TablesInsert<'collection_items'>, 'owner_id' | 'id'>

/**
 * Creates the owned copy, uploads its photos, and optionally lists it.
 * If anything after the insert fails, the item (and uploaded files) are rolled back.
 */
export async function addCardToCollection(
  ownerId: string,
  item: NewItem,
  photos: File[],
  listing?: Omit<TablesInsert<'card_listings'>, 'item_id' | 'seller_id' | 'card_id'>,
): Promise<{ item: CollectionItem; listing?: CardListing }> {
  const created = unwrap(await supabase.from('collection_items').insert({ ...item, owner_id: ownerId }).select('*').single())
  const uploaded: string[] = []
  try {
    await addPhotos(ownerId, created.id, photos, 0, uploaded)
    let createdListing: CardListing | undefined
    if (listing) {
      createdListing = unwrap(
        await supabase
          .from('card_listings')
          .insert({ ...listing, item_id: created.id, seller_id: ownerId, card_id: created.card_id })
          .select('*')
          .single(),
      )
    }
    return { item: created, listing: createdListing }
  } catch (error) {
    const rollback = await supabase.from('collection_items').delete().eq('id', created.id)
    if (rollback.error) console.error('add-card rollback failed; orphan item', created.id, rollback.error)
    await removeObjects('card-images', uploaded).catch(() => undefined)
    throw error
  }
}

/** Processes (resize + EXIF strip) and uploads photos, then records them. */
export async function addPhotos(ownerId: string, itemId: string, files: File[], startPosition = 0, uploadedPaths: string[] = []): Promise<void> {
  for (const [i, file] of files.entries()) {
    const images = await processCardPhoto(file)
    const { thumbPath, mediumPath } = await uploadCardPhoto(ownerId, itemId, images)
    uploadedPaths.push(thumbPath, mediumPath)
    check(
      await supabase
        .from('collection_item_photos')
        .insert({ item_id: itemId, owner_id: ownerId, thumb_path: thumbPath, medium_path: mediumPath, position: startPosition + i }),
    )
  }
}

export async function removePhoto(photo: CollectionItemPhoto): Promise<void> {
  check(await supabase.from('collection_item_photos').delete().eq('id', photo.id))
  await removeObjects('card-images', [photo.thumb_path, photo.medium_path].filter((p) => !/^https?:/.test(p))).catch(() => undefined)
}

export async function updateItem(id: string, patch: TablesUpdate<'collection_items'>): Promise<CollectionItem> {
  return unwrap(await supabase.from('collection_items').update(patch).eq('id', id).select('*').single())
}

export async function deleteItem(item: ItemWithDetails): Promise<void> {
  check(await supabase.from('collection_items').delete().eq('id', item.id))
  const paths = item.photos.flatMap((p) => [p.thumb_path, p.medium_path]).filter((p) => !/^https?:/.test(p))
  await removeObjects('card-images', paths).catch(() => undefined)
}

export async function reorderItems(collectionId: string, itemIds: string[]): Promise<void> {
  check(await supabase.rpc('reorder_collection_items', { p_collection: collectionId, p_item_ids: itemIds }))
}

// ---------- listings ----------

export async function createListing(sellerId: string, item: CollectionItem, listing: Omit<TablesInsert<'card_listings'>, 'item_id' | 'seller_id' | 'card_id'>) {
  return unwrap(
    await supabase.from('card_listings').insert({ ...listing, item_id: item.id, seller_id: sellerId, card_id: item.card_id }).select('*').single(),
  )
}

export async function updateListing(id: string, patch: Pick<TablesUpdate<'card_listings'>, 'listing_type' | 'price' | 'currency' | 'quantity' | 'looking_for' | 'description' | 'is_active'>) {
  return unwrap(await supabase.from('card_listings').update(patch).eq('id', id).select('*').single())
}

export async function unlist(id: string): Promise<void> {
  check(await supabase.from('card_listings').update({ is_active: false }).eq('id', id))
}
