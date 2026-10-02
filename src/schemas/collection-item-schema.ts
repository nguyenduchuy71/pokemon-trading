import { z } from 'zod'
import { CARD_CONDITIONS, CURRENCIES, GRADING_COMPANIES, LISTING_TYPES, PRINTINGS } from '@/constants/domain'

const emptyToNull = (v: unknown) => (v === '' || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? null : v)
const optionalNumber = <T extends z.ZodType<number, unknown>>(schema: T) => z.preprocess(emptyToNull, schema.nullable())

/** The physical copy a collector owns. */
export const collectionItemSchema = z
  .object({
    collection_id: z.uuid(),
    condition: z.enum(CARD_CONDITIONS),
    printing: z.enum(PRINTINGS),
    graded: z.boolean(),
    grading_company: z.enum(GRADING_COMPANIES).nullable(),
    grade: optionalNumber(z.coerce.number().min(1).max(10)),
    quantity: z.coerce.number().int().min(1).max(999),
    estimated_value: optionalNumber(z.coerce.number().min(0)),
    value_currency: z.enum(CURRENCIES),
    notes: z.string().trim().max(500),
  })
  .superRefine((v, ctx) => {
    if (v.graded && (!v.grading_company || v.grade == null)) {
      ctx.addIssue({ code: 'custom', path: ['grade'], message: 'grade_required' })
    }
  })
export type CollectionItemInput = z.input<typeof collectionItemSchema>
export type CollectionItemValues = z.output<typeof collectionItemSchema>

/** What the owner offers. Never an order: just type, asking price and context. */
export const listingSchema = z
  .object({
    listing_type: z.enum(LISTING_TYPES),
    price: optionalNumber(z.coerce.number().positive()),
    currency: z.enum(CURRENCIES),
    quantity: z.coerce.number().int().min(1),
    looking_for: z.array(z.string().trim().min(1).max(60)).max(10),
    description: z.string().trim().max(1000),
  })
  .superRefine((v, ctx) => {
    if (v.listing_type !== 'TRADE' && v.price == null) {
      ctx.addIssue({ code: 'custom', path: ['price'], message: 'price_required' })
    }
  })
export type ListingInput = z.input<typeof listingSchema>
export type ListingValues = z.output<typeof listingSchema>

export const MAX_PHOTOS = 6
