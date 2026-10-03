import { useEffect } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase-client'
import {
  getConversationMembers,
  getMessage,
  listMessages,
  markConversationRead,
  MESSAGES_PAGE_SIZE,
  sendMessage,
  type OutgoingMessage,
  type ThreadMessage,
} from '@/services/messaging-service'
import { processChatPhoto } from '@/utils/image-processing'
import { removeObjects, uploadChatImage } from '@/services/storage-service'
import { useCurrentUserId } from '@/stores/auth-store'
import { addOptimistic, markFailed, mergeIncoming, nextTempId, resolveOptimistic, type ThreadData } from '@/utils/thread-cache'
import { inboxKey } from './use-inbox'

export const threadKey = (id?: string) => ['thread', id] as const

export function useThreadMessages(conversationId?: string) {
  return useInfiniteQuery({
    queryKey: threadKey(conversationId),
    queryFn: ({ pageParam }) => listMessages(conversationId!, pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.length === MESSAGES_PAGE_SIZE ? last[last.length - 1].id : undefined),
    enabled: Boolean(conversationId),
    staleTime: Infinity, // realtime keeps it fresh
  })
}

export function useThreadMembers(conversationId?: string) {
  return useQuery({ queryKey: ['thread-members', conversationId], queryFn: () => getConversationMembers(conversationId!), enabled: Boolean(conversationId) })
}

/** Live appends for the open thread + read receipts while it is visible. */
export function useRealtimeThread(conversationId?: string) {
  const qc = useQueryClient()
  const userId = useCurrentUserId()

  useEffect(() => {
    if (!conversationId) return
    const markRead = () => {
      if (document.visibilityState === 'visible') {
        void markConversationRead(conversationId).then(() => qc.invalidateQueries({ queryKey: inboxKey(userId) }))
      }
    }
    markRead()

    // Pull the newest page and merge it, so pending/failed local rows survive a resync.
    const resync = async () => {
      const latest = await listMessages(conversationId).catch(() => [])
      qc.setQueryData<ThreadData>(threadKey(conversationId), (d) => [...latest].reverse().reduce<ThreadData | undefined>((acc, m) => mergeIncoming(acc, m), d))
    }

    const channel = supabase
      .channel(`thread:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
        let msg = payload.new as ThreadMessage
        // Realtime rows don't include the shared-listing join; fetch it for LISTING messages.
        if (msg.kind === 'LISTING') msg = await getMessage(msg.id).catch(() => msg)
        qc.setQueryData<ThreadData>(threadKey(conversationId), (d) => mergeIncoming(d, msg))
        if (msg.sender_id !== userId) markRead()
      })
      // Messages sent while the channel was connecting would otherwise be missed.
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void resync()
      })

    // Mobile browsers drop sockets in the background: resync on return.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void resync()
      markRead()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [conversationId, qc, userId])
}

type SendInput = OutgoingMessage | { kind: 'PHOTO'; file: File }

/** Optimistic send; failures stay in the thread marked "failed" with retry. */
export function useSendMessage(conversationId: string) {
  const qc = useQueryClient()
  const userId = useCurrentUserId()

  return useMutation({
    mutationFn: async ({ input }: { input: SendInput; tempId: number }) => {
      if (input.kind === 'PHOTO') {
        const path = await uploadChatImage(conversationId, await processChatPhoto(input.file))
        try {
          return await sendMessage(conversationId, userId!, { kind: 'IMAGE', imagePath: path })
        } catch (error) {
          // e.g. daily image quota: don't leave an orphan file in storage until the purge.
          await removeObjects('chat-images', [path]).catch(() => undefined)
          throw error
        }
      }
      return sendMessage(conversationId, userId!, input)
    },
    onMutate: ({ input, tempId }) => {
      if (input.kind === 'PHOTO') return // shown once uploaded (needs a storage path to render)
      const optimistic: ThreadMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: userId ?? null,
        kind: input.kind,
        body: input.kind === 'TEXT' ? input.body.trim() : input.kind === 'LISTING' ? (input.body ?? null) : null,
        listing_id: input.kind === 'LISTING' ? input.listingId : null,
        image_path: input.kind === 'IMAGE' ? input.imagePath : null,
        created_at: new Date().toISOString(),
        pending: true,
      }
      qc.setQueryData<ThreadData>(threadKey(conversationId), (d) => addOptimistic(d, optimistic))
    },
    onSuccess: (msg, { tempId }) => {
      qc.setQueryData<ThreadData>(threadKey(conversationId), (d) => (d?.pages.some((p) => p.some((m) => m.id === tempId)) ? resolveOptimistic(d, tempId, msg) : mergeIncoming(d, msg)))
      void qc.invalidateQueries({ queryKey: inboxKey(userId) })
    },
    onError: (_e, { tempId }) => qc.setQueryData<ThreadData>(threadKey(conversationId), (d) => markFailed(d, tempId)),
  })
}

export { nextTempId }
