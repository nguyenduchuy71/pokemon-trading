import { z } from 'zod'
import { collectionItemSchema, listingSchema, type CollectionItemInput, type ListingInput } from './collection-item-schema'

/**
 * Add-card form = owned copy + optional listing. Listing fields are only validated when
 * "list this card" is on, so a half-filled listing never blocks saving to the collection.
 */
export const addCardSchema = z
  .object({ item: collectionItemSchema, list: z.boolean(), listing: z.unknown() })
  .superRefine((v, ctx) => {
    if (!v.list) return
    const result = listingSchema.safeParse(v.listing)
    if (!result.success) {
      for (const issue of result.error.issues) ctx.addIssue({ code: 'custom', message: issue.message, path: ['listing', ...issue.path] })
    }
  })

export interface AddCardInput {
  item: CollectionItemInput
  list: boolean
  listing: ListingInput
}

export const defaultListing = (currency: 'VND' | 'USD'): ListingInput => ({
  listing_type: 'SALE_OR_TRADE',
  price: '' as unknown as number,
  currency,
  quantity: 1,
  looking_for: [],
  description: '',
})
