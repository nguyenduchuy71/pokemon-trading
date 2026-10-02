import { supabase } from '@/lib/supabase-client'
import { check, unwrap } from '@/utils/app-error'
import type { InboxRow } from '@/types/models'

/** Message row + the shared listing reference (null when it is no longer visible to the viewer). */
const MESSAGE_SELECT =
  '*, listing:card_listings(id, listing_type, price, currency, is_active, moderation_status, ' +
  'card:pokemon_cards(name, set_name, card_number, printed_total, image_small_url), item:collection_items(condition))'

export interface SharedListingRef {
  id: string
  listing_type: 'SALE' | 'TRADE' | 'SALE_OR_TRADE'
  price: number | null
  currency: 'VND' | 'USD'
  is_active: boolean
  moderation_status: string
  card: { name: string; set_name: string; card_number: string; printed_total: number | null; image_small_url: string | null } | null
  item: { condition: string } | null
}

export interface ThreadMessage {
  id: number
  conversation_id: string
  sender_id: string | null
  kind: 'TEXT' | 'LISTING' | 'IMAGE'
  body: string | null
  listing_id: string | null
  image_path: string | null
  created_at: string
  listing?: SharedListingRef | null
  /** Client-only: optimistic message awaiting server echo. */
  pending?: boolean
  failed?: boolean
}

export const MESSAGES_PAGE_SIZE = 30

export async function startConversation(otherUserId: string, listingId?: string): Promise<string> {
  return unwrap(await supabase.rpc('start_conversation', { p_other: otherUserId, p_listing: listingId }))
}

export async function getInbox(): Promise<InboxRow[]> {
  return check(await supabase.rpc('inbox', { p_limit: 100 })) ?? []
}

export async function getConversationMembers(conversationId: string) {
  return unwrap(
    await supabase
      .from('conversation_members')
      .select('user_id, last_read_at, profile:profiles(id, username, display_name, avatar_url, location_city, created_at)')
      .eq('conversation_id', conversationId),
  )
}

/** Newest-first page; pass the oldest loaded id to page backwards. */
export async function listMessages(conversationId: string, beforeId?: number): Promise<ThreadMessage[]> {
  let query = supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('conversation_id', conversationId)
    .order('id', { ascending: false })
    .limit(MESSAGES_PAGE_SIZE)
  if (beforeId) query = query.lt('id', beforeId)
  return (check(await query) ?? []) as unknown as ThreadMessage[]
}

export async function getMessage(id: number): Promise<ThreadMessage> {
  return unwrap(await supabase.from('messages').select(MESSAGE_SELECT).eq('id', id).single()) as unknown as ThreadMessage
}

export type OutgoingMessage =
  | { kind: 'TEXT'; body: string }
  | { kind: 'LISTING'; listingId: string; body?: string }
  | { kind: 'IMAGE'; imagePath: string }

export async function sendMessage(conversationId: string, senderId: string, msg: OutgoingMessage): Promise<ThreadMessage> {
  const row = {
    conversation_id: conversationId,
    sender_id: senderId,
    kind: msg.kind,
    body: msg.kind === 'TEXT' ? msg.body.trim() : msg.kind === 'LISTING' ? (msg.body ?? null) : null,
    listing_id: msg.kind === 'LISTING' ? msg.listingId : null,
    image_path: msg.kind === 'IMAGE' ? msg.imagePath : null,
  }
  return unwrap(await supabase.from('messages').insert(row).select(MESSAGE_SELECT).single()) as unknown as ThreadMessage
}

export async function markConversationRead(conversationId: string): Promise<void> {
  check(await supabase.rpc('mark_conversation_read', { p_conversation: conversationId }))
}
