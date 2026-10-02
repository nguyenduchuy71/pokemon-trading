import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, X } from 'lucide-react'
import { useInbox, useUnreadCount } from '@/queries/use-inbox'
import { useChatWidget } from '@/stores/chat-widget-store'
import { InboxList } from './inbox-list'
import { ThreadView } from './thread-view'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback-states'

/**
 * Messenger-style popup, mounted once for signed-in users so a conversation stays open while
 * browsing. Docked bottom-right on desktop; full-screen on phones.
 */
export function ChatWidget() {
  const { t } = useTranslation('chat')
  const { open, conversationId, openThread, back, close, toggle } = useChatWidget()
  const unread = useUnreadCount()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label={t('title')}
          data-conversation-id={conversationId ?? undefined}
          className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-bg md:inset-auto md:bottom-24 md:right-6 md:h-[min(620px,calc(100dvh-8rem))] md:w-[400px] md:rounded-2xl md:border md:border-line-strong md:bg-surface md:shadow-2xl md:shadow-black/50"
        >
          {conversationId ? (
            <ThreadView key={conversationId} conversationId={conversationId} onBack={back} onClose={close} />
          ) : (
            <>
              <header className="flex items-start justify-between gap-3 border-b border-line px-4 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4">
                <div>
                  <h2 className="text-2xl">{t('title')}</h2>
                  <p className="mt-0.5 text-sm text-ink-muted">{t('lede')}</p>
                </div>
                <button type="button" onClick={close} className="rounded-full p-2 text-ink-muted hover:bg-raised hover:text-ink" aria-label={t('close')}>
                  <X className="h-5 w-5" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto">
                <Inbox onSelect={openThread} />
              </div>
            </>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label={open ? t('close') : t('open')}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-brass text-on-brass shadow-xl shadow-black/40 transition-transform hover:scale-105 md:flex"
      >
        {open ? <X className="h-6 w-6" aria-hidden /> : <MessageCircle className="h-6 w-6" aria-hidden />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full border-2 border-bg bg-ember px-1 text-center font-mono text-[10px] leading-4 text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </>
  )
}

function Inbox({ onSelect }: { onSelect: (id: string) => void }) {
  const { t } = useTranslation('chat')
  const close = useChatWidget((s) => s.close)
  const inbox = useInbox()

  if (inbox.isPending)
    return (
      <div className="space-y-px p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    )
  if (inbox.isError) return <ErrorState error={inbox.error} onRetry={() => void inbox.refetch()} />
  if (inbox.data.length === 0)
    return (
      <EmptyState
        icon={<MessageCircle className="h-5 w-5" />}
        title={t('empty_title')}
        body={t('empty_body')}
        action={
          <span onClick={close}>
            <ButtonLink to="/marketplace">{t('browse')}</ButtonLink>
          </span>
        }
      />
    )
  return <InboxList rows={inbox.data} onSelect={onSelect} />
}
