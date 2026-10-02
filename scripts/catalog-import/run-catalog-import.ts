/*
 * Imports the TCGdex catalog (EN + JA) into pokemon_cards / pokemon_species. Idempotent upserts.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run catalog:import -- --lang en,ja [--sets sv03.5,SV2a] [--dry-run]
 *
 * English runs first so Japanese prints can be labelled with English species names.
 */
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { fetchTcgdex, mapWithConcurrency } from './tcgdex-client.ts'
import {
  buildSpeciesNames,
  EXCLUDED_SERIES,
  mapCard,
  type CatalogLanguage,
  type PokemonCardRow,
  type TcgdexCard,
  type TcgdexSet,
  type TcgdexSetBrief,
} from './map-tcgdex-card.ts'

const { values } = parseArgs({
  options: {
    lang: { type: 'string', default: 'en,ja' },
    sets: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    concurrency: { type: 'string', default: '6' },
  },
})

const languages = (values.lang ?? 'en,ja').split(',').filter((l): l is CatalogLanguage => l === 'en' || l === 'ja')
const onlySets = values.sets ? new Set(values.sets.split(',')) : undefined
const concurrency = Number(values.concurrency)
const dryRun = values['dry-run']

async function loadLanguage(lang: CatalogLanguage): Promise<{ card: TcgdexCard; set: TcgdexSet }[]> {
  const briefs = await fetchTcgdex<TcgdexSetBrief[]>(`/${lang}/sets`)
  const wanted = briefs.filter((s) => !onlySets || onlySets.has(s.id))
  const sets = await mapWithConcurrency(wanted, concurrency, (s) => fetchTcgdex<TcgdexSet>(`/${lang}/sets/${encodeURIComponent(s.id)}`))
  const physical = sets.filter((s) => !EXCLUDED_SERIES.has(s.serie?.id ?? ''))
  const refs = physical.flatMap((set) => set.cards.map((c) => ({ id: c.id, set })))
  console.log(`[${lang}] ${physical.length} sets, ${refs.length} cards`)

  let done = 0
  const loaded = await mapWithConcurrency(refs, concurrency, async (ref) => {
    try {
      const card = await fetchTcgdex<TcgdexCard>(`/${lang}/cards/${encodeURIComponent(ref.id)}`)
      if (++done % 500 === 0) console.log(`[${lang}] ${done}/${refs.length}`)
      return { card, set: ref.set }
    } catch (error) {
      console.warn(`[${lang}] skip ${ref.id}: ${(error as Error).message}`)
      return null
    }
  })
  return loaded.filter((x): x is { card: TcgdexCard; set: TcgdexSet } => x !== null)
}

async function main() {
  const byLang = new Map<CatalogLanguage, { card: TcgdexCard; set: TcgdexSet }[]>()
  // Species names always come from English data, even when importing JA only.
  const enData = await loadLanguage('en')
  byLang.set('en', enData)
  const species = buildSpeciesNames(enData.map((d) => d.card))
  for (const lang of languages) if (lang !== 'en') byLang.set(lang, await loadLanguage(lang))

  const rows: PokemonCardRow[] = []
  for (const lang of languages) {
    for (const { card, set } of byLang.get(lang) ?? []) rows.push(mapCard(card, lang, set, species))
  }
  console.log(`mapped ${rows.length} rows, ${species.size} species`)
  if (dryRun) {
    console.log(JSON.stringify(rows.slice(0, 3), null, 2))
    return
  }

  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  const speciesRows = [...species].map(([dex_id, name_en]) => ({ dex_id, name_en }))
  for (let i = 0; i < speciesRows.length; i += 1000) {
    const { error } = await db.from('pokemon_species').upsert(speciesRows.slice(i, i + 1000))
    if (error) throw error
  }
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500).map((r) => ({ ...r, updated_at: new Date().toISOString() }))
    const { error } = await db.from('pokemon_cards').upsert(batch, { onConflict: 'external_source,language,external_id' })
    if (error) throw error
    console.log(`upserted ${Math.min(i + 500, rows.length)}/${rows.length}`)
  }
  console.log('catalog import complete')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
