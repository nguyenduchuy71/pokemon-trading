import { activeFilterCount, EMPTY_FILTERS, parseFilters, serializeFilters } from './marketplace-filter-schema'

describe('marketplace filters', () => {
  it('round-trips through the URL', () => {
    const filters = {
      ...EMPTY_FILTERS,
      q: 'charizard 151',
      sets: ['sv03.5', 'SV2a'],
      conditions: ['MINT' as const, 'NEAR_MINT' as const],
      types: ['TRADE' as const],
      languages: ['ja'],
      min: 100,
      max: 5000000,
      city: 'Hanoi',
      sort: 'price_desc' as const,
    }
    expect(parseFilters(serializeFilters(filters))).toEqual(filters)
  })

  it('drops invalid values instead of failing', () => {
    const f = parseFilters(new URLSearchParams('cond=MINT,SHINY&type=AUCTION&lang=fr,ja&min=-5&max=abc&city=Atlantis&sort=random&card=nope'))
    expect(f.conditions).toEqual(['MINT'])
    expect(f.types).toEqual([])
    expect(f.languages).toEqual(['ja'])
    expect(f.min).toBeUndefined()
    expect(f.max).toBeUndefined()
    expect(f.city).toBeUndefined()
    expect(f.cardId).toBeUndefined()
    expect(f.sort).toBe('recent')
  })

  it('omits defaults when serializing', () => {
    expect(serializeFilters(EMPTY_FILTERS).toString()).toBe('')
  })

  it('counts active filters (not search text or sort)', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, q: 'x', sort: 'views', sets: ['a', 'b'], min: 1 })).toBe(3)
  })
})
