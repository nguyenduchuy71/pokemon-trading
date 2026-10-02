import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { VN_CITIES } from './vn-cities'

// The DB check constraint must accept exactly the cities the UI offers.
it('matches the profiles.location_city check constraint', () => {
  const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/20261002000002_profiles.sql'), 'utf8')
  const block = sql.match(/location_city in \(([\s\S]*?)\)\)/)![1]
  const dbCities = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1])
  expect(dbCities).toEqual([...VN_CITIES])
})
