import { buildSpeciesNames, mapCard, mapPrintings, mapType, type TcgdexCard } from './map-tcgdex-card.ts'

const enCharizardEx: TcgdexCard = {
  id: 'sv03.5-199',
  localId: '199',
  name: 'Charizard ex',
  category: 'Pokemon',
  image: 'https://assets.tcgdex.net/en/sv/sv03.5/199',
  rarity: 'Special illustration rare',
  hp: 330,
  types: ['Fire'],
  dexId: [6],
  variants: { normal: false, reverse: false, holo: true, firstEdition: false },
  set: { id: 'sv03.5', name: '151', cardCount: { official: 165, total: 207 } },
}

const jaCharizard: TcgdexCard = {
  ...enCharizardEx,
  id: 'SV2a-201',
  localId: '201',
  name: 'リザードンex',
  image: 'https://assets.tcgdex.net/ja/SV/SV2a/201',
  rarity: 'SAR',
  set: { id: 'SV2a', name: 'ポケモンカード151', cardCount: { official: 165, total: 210 } },
}

const jaTrainer: TcgdexCard = {
  id: 'SV2a-160',
  localId: '160',
  name: 'エリカの招待',
  category: 'Trainer',
  trainerType: 'Supporter',
  rarity: 'Uncommon',
  dexId: null,
  variants: { normal: true, reverse: true },
  set: { id: 'SV2a', name: 'ポケモンカード151', cardCount: { official: 165 } },
}

describe('buildSpeciesNames', () => {
  it('keeps the shortest English name per single dex id', () => {
    const map = buildSpeciesNames([
      enCharizardEx,
      { name: 'Charizard', category: 'Pokemon', dexId: [6] },
      { name: 'Dark Charizard', category: 'Pokemon', dexId: [6] },
      { name: 'Pikachu & Zekrom-GX', category: 'Pokemon', dexId: [25, 644] },
      { name: "Professor's Research", category: 'Trainer', dexId: null },
    ])
    expect(map.get(6)).toBe('Charizard')
    expect(map.has(25)).toBe(false)
  })
})

describe('mapCard', () => {
  const species = new Map([[6, 'Charizard']])

  it('maps an English Pokémon card', () => {
    const row = mapCard(enCharizardEx, 'en', { releaseDate: '2023-09-22' }, species)
    expect(row).toMatchObject({
      external_id: 'sv03.5-199',
      language: 'en',
      pokemon_name: 'Charizard',
      card_number: '199',
      printed_total: 165,
      type: 'Fire',
      hp: 330,
      printing: ['holo'],
      image_small_url: 'https://assets.tcgdex.net/en/sv/sv03.5/199/low.webp',
      release_date: '2023-09-22',
    })
  })

  it('gives Japanese prints an English species name for search', () => {
    const row = mapCard(jaCharizard, 'ja', {}, species)
    expect(row.name).toBe('リザードンex')
    expect(row.pokemon_name).toBe('Charizard')
    expect(row.rarity).toBe('SAR')
  })

  it('maps trainers without dex ids or images', () => {
    const row = mapCard(jaTrainer, 'ja', {}, species)
    expect(row.pokemon_name).toBeNull()
    expect(row.dex_ids).toEqual([])
    expect(row.type).toBe('Trainer · Supporter')
    expect(row.image_small_url).toBeNull()
    expect(row.printing).toEqual(['normal', 'reverse'])
  })
})

describe('helpers', () => {
  it('defaults printing to normal', () => {
    expect(mapPrintings(null)).toEqual(['normal'])
  })
  it('labels energy cards', () => {
    expect(mapType({ ...jaTrainer, category: 'Energy', trainerType: null, energyType: 'Basic' })).toBe('Energy · Basic')
  })
})
