import type { InfiniteData } from '@tanstack/react-query'
import type { ThreadMessage } from '@/services/messaging-service'

/*
 * Thread cache = InfiniteData whose pages are newest-first (page 0 holds the latest messages).
 * Realtime echoes and optimistic sends can race; these helpers keep exactly one copy per message.
 */
export type ThreadData = InfiniteData<ThreadMessage[], unknown>

function samePayload(a: ThreadMessage, b: ThreadMessage): boolean {
  return a.sender_id === b.sender_id && a.kind === b.kind && a.body === b.body && a.listing_id === b.listing_id && a.image_path === b.image_path
}

function has(data: ThreadData, id: number): boolean {
  return data.pages.some((p) => p.some((m) => m.id === id))
}

/** Server message arrived (realtime or fetch). Replaces a matching pending copy, else prepends. */
export function mergeIncoming(data: ThreadData | undefined, msg: ThreadMessage): ThreadData | undefined {
  if (!data) return data
  if (has(data, msg.id)) {
    return { ...data, pages: data.pages.map((p) => p.map((m) => (m.id === msg.id ? { ...m, ...msg, listing: msg.listing ?? m.listing } : m))) }
  }
  let replaced = false
  const pages = data.pages.map((p) =>
    p.map((m) => {
      if (!replaced && m.pending && samePayload(m, msg)) {
        replaced = true
        return msg
      }
      return m
    }),
  )
  if (replaced) return { ...data, pages }
  const [first = [], ...rest] = data.pages
  return { ...data, pages: [[msg, ...first], ...rest] }
}

export function addOptimistic(data: ThreadData | undefined, msg: ThreadMessage): ThreadData | undefined {
  if (!data) return { pages: [[msg]], pageParams: [undefined] }
  const [first = [], ...rest] = data.pages
  return { ...data, pages: [[msg, ...first], ...rest] }
}

/** Mutation resolved: swap the temp row for the server row (unless realtime already did). */
export function resolveOptimistic(data: ThreadData | undefined, tempId: number, msg: ThreadMessage): ThreadData | undefined {
  if (!data) return data
  const alreadyThere = has(data, msg.id)
  return {
    ...data,
    pages: data.pages.map((p) =>
      p.flatMap((m) => {
        if (m.id !== tempId) return [m]
        return alreadyThere ? [] : [msg]
      }),
    ),
  }
}

export function markFailed(data: ThreadData | undefined, tempId: number): ThreadData | undefined {
  if (!data) return data
  return { ...data, pages: data.pages.map((p) => p.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m))) }
}

/** Oldest → newest for rendering. */
export function flattenChronological(data: ThreadData | undefined): ThreadMessage[] {
  if (!data) return []
  return data.pages.flat().slice().reverse()
}

let tempCounter = -1
export function nextTempId(): number {
  return tempCounter--
}
