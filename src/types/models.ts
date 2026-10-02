import type { Database, Tables } from './database'

/* Row aliases so feature code never spells out the generated generics. */
export type Profile = Tables<'profiles'>
export type PokemonCard = Tables<'pokemon_cards'>
export type Collection = Tables<'collections'>
export type CollectionItem = Tables<'collection_items'>
export type CollectionItemPhoto = Tables<'collection_item_photos'>
export type CardListing = Tables<'card_listings'>
export type WishlistItem = Tables<'wishlist_items'>
export type Message = Tables<'messages'>
export type Report = Tables<'reports'>

type Fn = Database['public']['Functions']
export type ListingSearchRow = Fn['search_listings']['Returns'][number]
export type ListingSearchArgs = Fn['search_listings']['Args']
export type InboxRow = Fn['inbox']['Returns'][number]
export type PublicProfile = Fn['public_profile']['Returns'][number]
export type CollectionStats = Fn['collection_stats']['Returns'][number]
