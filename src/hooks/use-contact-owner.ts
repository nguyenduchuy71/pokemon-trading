import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase-client'
import { sendMessage, startConversation } from '@/services/messaging-service'
import { useAuthStore } from '@/stores/auth-store'
import { useChatWidget } from '@/stores/chat-widget-store'
import { toast } from '@/components/ui/toast'
import { errorKey } from '@/utils/app-error'
import { useAccountAccess } from './use-account-access'

/**
 * "Message owner" / "Interested in trading": opens (or reuses) the 1:1 conversation and, the
 * first time a listing is discussed there, shares it as a reference card. Nothing else happens —
 * no order, reservation or trade record is created.
 */
export function useContactOwner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const session = useAuthStore((s) => s.session)
  const openThread = useChatWidget((s) => s.openThread)
  const [pending, setPending] = useState(false)
  const { isWaitlisted } = useAccountAccess()

  async function contact(ownerId: string, listingId?: string) {
    if (!session) {
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`)
      return
    }
    if (isWaitlisted) {
      toast.info(t('waitlist.chat_locked'))
      return
    }
    setPending(true)
    try {
      const conversationId = await startConversation(ownerId, listingId)
      if (listingId) {
        const { data } = await supabase.from('messages').select('id').eq('conversation_id', conversationId).eq('listing_id', listingId).limit(1)
        if (!data?.length) await sendMessage(conversationId, session.user.id, { kind: 'LISTING', listingId })
      }
      void qc.invalidateQueries({ queryKey: ['inbox'] })
      openThread(conversationId)
    } catch (error) {
      toast.error(t(errorKey(error)))
    } finally {
      setPending(false)
    }
  }

  return { contact, pending }
}
