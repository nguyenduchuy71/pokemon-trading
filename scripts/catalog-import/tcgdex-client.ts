/*
 * Polite TCGdex REST client: on-disk JSON cache (resumable runs), bounded concurrency, retries.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const API = 'https://api.tcgdex.net/v2'
const CACHE_DIR = join(import.meta.dirname, '.cache')

async function readCache<T>(key: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(join(CACHE_DIR, key), 'utf8')) as T
  } catch {
    return undefined
  }
}

async function writeCache(key: string, value: unknown): Promise<void> {
  const file = join(CACHE_DIR, key)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(value))
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function fetchTcgdex<T>(path: string, { useCache = true } = {}): Promise<T> {
  const cacheKey = `${path.replace(/^\//, '').replace(/[^a-zA-Z0-9._/-]/g, '_')}.json`
  if (useCache) {
    const cached = await readCache<T>(cacheKey)
    if (cached) return cached
  }
  let lastError: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(20_000) })
      if (res.status === 404) throw Object.assign(new Error(`404 ${path}`), { permanent: true })
      if (!res.ok) throw new Error(`${res.status} ${path}`)
      const json = (await res.json()) as T
      await writeCache(cacheKey, json)
      return json
    } catch (error) {
      lastError = error
      if ((error as { permanent?: boolean }).permanent) break
      await sleep(500 * 2 ** attempt)
    }
  }
  throw lastError
}

/** Run `worker` over `items` with at most `limit` in flight. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length })
  let next = 0
  async function lane() {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane))
  return results
}
