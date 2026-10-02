import { supabase } from '@/lib/supabase-client'
import { check, unwrap } from '@/utils/app-error'
import type { PokemonCard } from '@/types/models'

export async function searchCatalog(q: string, language?: string): Promise<PokemonCard[]> {
  if (q.trim().length < 2) return []
  return check(await supabase.rpc('search_catalog', { p_q: q, p_language: language, p_limit: 20 })) ?? []
}

export async function getCatalogCard(id: string): Promise<PokemonCard> {
  return unwrap(await supabase.from('pokemon_cards').select('*').eq('id', id).single())
}
