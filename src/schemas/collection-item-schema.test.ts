import { collectionItemSchema, listingSchema } from './collection-item-schema'

const baseItem = {
  collection_id: '7d3c2e9a-1f4b-4c8e-9a2d-5b6c7d8e9f01',
  condition: 'NEAR_MINT',
  printing: 'holo',
  graded: false,
  grading_company: null,
  grade: '',
  quantity: '1',
  estimated_value: '',
  value_currency: 'VND',
  notes: '',
} as const

describe('collectionItemSchema', () => {
  it('coerces form strings and nulls empty optionals', () => {
    const v = collectionItemSchema.parse(baseItem)
    expect(v.quantity).toBe(1)
    expect(v.estimated_value).toBeNull()
    expect(v.grade).toBeNull()
  })
  it('requires grader + grade when graded', () => {
    const r = collectionItemSchema.safeParse({ ...baseItem, graded: true })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('grade_required')
    expect(collectionItemSchema.safeParse({ ...baseItem, graded: true, grading_company: 'PSA', grade: '10' }).success).toBe(true)
  })
  it('rejects zero quantity', () => {
    expect(collectionItemSchema.safeParse({ ...baseItem, quantity: '0' }).success).toBe(false)
  })
})

describe('listingSchema', () => {
  const base = { listing_type: 'SALE', price: '', currency: 'VND', quantity: '1', looking_for: [], description: '' } as const

  it('requires a price unless trade-only', () => {
    expect(listingSchema.safeParse(base).error?.issues[0].message).toBe('price_required')
    expect(listingSchema.safeParse({ ...base, listing_type: 'SALE_OR_TRADE' }).success).toBe(false)
    expect(listingSchema.safeParse({ ...base, listing_type: 'TRADE' }).success).toBe(true)
    expect(listingSchema.parse({ ...base, price: '4500000' }).price).toBe(4500000)
  })
  it('caps looking-for chips at 10', () => {
    const many = Array.from({ length: 11 }, (_, i) => `Card ${i}`)
    expect(listingSchema.safeParse({ ...base, listing_type: 'TRADE', looking_for: many }).success).toBe(false)
  })
})
