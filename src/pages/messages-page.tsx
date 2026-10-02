import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router'
import { useChatWidget } from '@/stores/chat-widget-store'

/** /messages and /messages/:id are kept as deep links: they open the chat popup over the dashboard. */
export default function MessagesPage() {
  const { id } = useParams()

  useEffect(() => {
    const widget = useChatWidget.getState()
    if (id) widget.openThread(id)
    else widget.openInbox()
  }, [id])

  return <Navigate to="/dashboard" replace />
}
