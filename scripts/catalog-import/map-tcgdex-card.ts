/*
 * Pure mapping from TCGdex REST payloads to pokemon_cards rows (unit tested).
 * TCGdex docs: https://tcgdex.dev — card ids are per-language (e.g. "SV2a-001" vs "sv03.5-001").
 */

export type CatalogLanguage = 'en' | 'ja'

export interface TcgdexSetBrief {
  id: string
  name: string
  cardCount?: { total?: number; official?: number }
}

export interface TcgdexSet extends TcgdexSetBrief {
  releaseDate?: string
  serie?: { id: string; name: string }
  cards: { id: string; localId: string; name: string; image?: string }[]
}

export interface TcgdexCard {
  id: string
  localId: string
  name: string
  category?: 'Pokemon' | 'Trainer' | 'Energy' | string
  image?: string
  rarity?: string | null
  hp?: number | null
  types?: string[] | null
  dexId?: number[] | null
  trainerType?: string | null
  energyType?: string | null
  variants?: { normal?: boolean; reverse?: boolean; holo?: boolean; firstEdition?: boolean } | null
  set: { id: string; name: string; cardCount?: { official?: number; total?: number } }
}

export interface PokemonCardRow {
  external_source: 'tcgdex'
  external_id: string
  language: CatalogLanguage
  name: string
  pokemon_name: string | null
  dex_ids: number[]
  set_name: string
  set_code: string
  card_number: string
  printed_total: number | null
  rarity: string | null
  type: string | null
  hp: number | null
  printing: string[]
  image_small_url: string | null
  image_large_url: string | null
  release_date: string | null
}

/** Digital-only series that are not physical trading cards. */
export const EXCLUDED_SERIES = new Set(['tcgp'])

const VARIANT_ORDER = ['normal', 'holo', 'reverse', 'firstEdition'] as const

export function mapPrintings(variants: TcgdexCard['variants']): string[] {
  const list = VARIANT_ORDER.filter((v) => variants?.[v])
  return list.length ? [...list] : ['normal']
}

export function mapType(card: TcgdexCard): string | null {
  if (card.types?.length) return card.types[0]
  if (card.category === 'Trainer') return card.trainerType ? `Trainer · ${card.trainerType}` : 'Trainer'
  if (card.category === 'Energy') return card.energyType ? `Energy · ${card.energyType}` : 'Energy'
  return card.category ?? null
}

/**
 * English species name per dex number: the shortest English Pokémon card name seen
 * ("Charizard" beats "Charizard ex" / "Dark Charizard"). Only single-dexId cards count.
 */
export function buildSpeciesNames(enCards: Pick<TcgdexCard, 'name' | 'dexId' | 'category'>[]): Map<number, string> {
  const species = new Map<number, string>()
  for (const card of enCards) {
    if (card.category !== 'Pokemon' || card.dexId?.length !== 1) continue
    const dex = card.dexId[0]
    const current = species.get(dex)
    if (!current || card.name.length < current.length) species.set(dex, card.name)
  }
  return species
}

export function speciesLabel(dexIds: number[], species: Map<number, string>): string | null {
  const names = dexIds.map((d) => species.get(d)).filter((n): n is string => Boolean(n))
  return names.length ? names.join(' & ') : null
}

export function mapCard(card: TcgdexCard, language: CatalogLanguage, set: Pick<TcgdexSet, 'releaseDate'>, species: Map<number, string>): PokemonCardRow {
  const dexIds = card.dexId ?? []
  return {
    external_source: 'tcgdex',
    external_id: card.id,
    language,
    name: card.name,
    pokemon_name: speciesLabel(dexIds, species),
    dex_ids: dexIds,
    set_name: card.set.name,
    set_code: card.set.id,
    card_number: card.localId,
    printed_total: card.set.cardCount?.official || null,
    rarity: card.rarity && card.rarity !== 'None' ? card.rarity : null,
    type: mapType(card),
    hp: typeof card.hp === 'number' ? card.hp : null,
    printing: mapPrintings(card.variants),
    image_small_url: card.image ? `${card.image}/low.webp` : null,
    image_large_url: card.image ? `${card.image}/high.webp` : null,
    release_date: set.releaseDate ?? null,
  }
}
