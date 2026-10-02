import { addOptimistic, flattenChronological, markFailed, mergeIncoming, resolveOptimistic, type ThreadData } from './thread-cache'
import type { ThreadMessage } from '@/services/messaging-service'

const msg = (id: number, body: string, extra: Partial<ThreadMessage> = {}): ThreadMessage => ({
  id,
  conversation_id: 'c1',
  sender_id: 'me',
  kind: 'TEXT',
  body,
  listing_id: null,
  image_path: null,
  created_at: new Date(1_700_000_000_000 + id * 1000).toISOString(),
  ...extra,
})

const base = (): ThreadData => ({ pages: [[msg(2, 'b'), msg(1, 'a')]], pageParams: [undefined] })

describe('thread cache', () => {
  it('prepends new server messages and renders chronologically', () => {
    const data = mergeIncoming(base(), msg(3, 'c', { sender_id: 'other' }))
    expect(flattenChronological(data).map((m) => m.body)).toEqual(['a', 'b', 'c'])
  })

  it('ignores duplicate realtime echoes', () => {
    const once = mergeIncoming(base(), msg(3, 'c'))
    const twice = mergeIncoming(once, msg(3, 'c'))
    expect(flattenChronological(twice)).toHaveLength(3)
  })

  it('realtime echo replaces the pending optimistic copy', () => {
    const optimistic = addOptimistic(base(), msg(-1, 'hi', { pending: true }))
    const echoed = mergeIncoming(optimistic, msg(3, 'hi'))
    const all = flattenChronological(echoed)
    expect(all).toHaveLength(3)
    expect(all.at(-1)).toMatchObject({ id: 3, body: 'hi' })
    expect(all.some((m) => m.pending)).toBe(false)
  })

  it('mutation result after the echo does not duplicate', () => {
    const optimistic = addOptimistic(base(), msg(-1, 'hi', { pending: true }))
    const echoed = mergeIncoming(optimistic, msg(3, 'hi'))
    const resolved = resolveOptimistic(echoed, -1, msg(3, 'hi'))
    expect(flattenChronological(resolved).filter((m) => m.body === 'hi')).toHaveLength(1)
  })

  it('mutation result before the echo swaps temp for server row', () => {
    const optimistic = addOptimistic(base(), msg(-1, 'hi', { pending: true }))
    const resolved = resolveOptimistic(optimistic, -1, msg(3, 'hi'))
    expect(flattenChronological(resolved).at(-1)?.id).toBe(3)
    expect(flattenChronological(mergeIncoming(resolved, msg(3, 'hi')))).toHaveLength(3)
  })

  it('marks failed sends for retry', () => {
    const optimistic = addOptimistic(base(), msg(-1, 'hi', { pending: true }))
    expect(flattenChronological(markFailed(optimistic, -1)).at(-1)).toMatchObject({ failed: true, pending: false })
  })
})
