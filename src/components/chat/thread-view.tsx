import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Ban, Flag, MoreHorizontal, UserRound, X } from 'lucide-react'
import { useRealtimeThread, useSendMessage, useThreadMembers, useThreadMessages, nextTempId } from '@/queries/use-thread'
import { useInbox } from '@/queries/use-inbox'
import { useCurrentUserId } from '@/stores/auth-store'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { flattenChronological } from '@/utils/thread-cache'
import { formatDate } from '@/utils/format'
import { errorKey } from '@/utils/app-error'
import { MessageBubble } from './message-bubble'
import { Composer } from './composer'
import { SafetyNotice } from '@/components/safety/safety-notice'
import { ReportDialog } from '@/components/safety/report-dialog'
import { BlockDialog } from '@/components/safety/block-dialog'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ErrorState, Skeleton } from '@/components/ui/feedback-states'
import { toast } from '@/components/ui/toast'
import type { ThreadMessage } from '@/services/messaging-service'

const SAFETY_DISMISS_KEY = 'cardswap.safety-dismissed'

function dismissedThreads(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SAFETY_DISMISS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function ThreadView({ conversationId, onBack, onClose }: { conversationId: string; onBack: () => void; onClose: () => void }) {
  const { t } = useTranslation('chat')
  const { t: tc } = useTranslation()
  const locale = useUiPreferences((s) => s.locale)
  const userId = useCurrentUserId()
  const messages = useThreadMessages(conversationId)
  const members = useThreadMembers(conversationId)
  const inbox = useInbox()
  const send = useSendMessage(conversationId)
  useRealtimeThread(conversationId)

  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const [showNewPill, setShowNewPill] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [safetyHidden, setSafetyHidden] = useState(() => dismissedThreads().includes(conversationId))

  const other = members.data?.find((m) => m.user_id !== userId)?.profile ?? null
  const blocked = inbox.data?.find((r) => r.conversation_id === conversationId)?.is_blocked ?? false
  const list = flattenChronological(messages.data)

  // Keep the view pinned to the newest message unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (stickToBottom.current) el.scrollTop = el.scrollHeight
    else setShowNewPill(true)
  }, [list.length])

  useEffect(() => {
    stickToBottom.current = true
    setShowNewPill(false)
  }, [conversationId])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (stickToBottom.current) setShowNewPill(false)
  }

  function jumpToBottom() {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    stickToBottom.current = true
    setShowNewPill(false)
  }

  function dispatch(input: Parameters<typeof send.mutate>[0]['input']) {
    stickToBottom.current = true
    send.mutate({ input, tempId: nextTempId() }, { onError: (e) => toast.error(tc(errorKey(e))) })
  }

  function retry(m: ThreadMessage) {
    if (m.kind === 'TEXT' && m.body) dispatch({ kind: 'TEXT', body: m.body })
    if (m.kind === 'LISTING' && m.listing_id) dispatch({ kind: 'LISTING', listingId: m.listing_id })
  }

  function hideSafety() {
    setSafetyHidden(true)
    try {
      localStorage.setItem(SAFETY_DISMISS_KEY, JSON.stringify([...dismissedThreads(), conversationId].slice(-200)))
    } catch {
      /* storage unavailable — dismissal lasts for this view only */
    }
  }

  const name = other?.username ?? t('deleted_user')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-line px-2 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] md:pt-2">
        <button type="button" onClick={onBack} className="rounded-full p-2 text-ink-muted hover:bg-raised" aria-label={t('back')}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        {other ? (
          <Link to={`/users/${other.username}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-brass">
            <Avatar src={other.avatar_url} name={other.username} size={34} />
            <span className="min-w-0">
              <span className="block truncate font-medium">{other.display_name || other.username}</span>
              <span className="block truncate font-mono text-[11px] text-ink-faint">
                @{other.username}
                {other.location_city && ` · ${other.location_city}`}
              </span>
            </span>
          </Link>
        ) : (
          <span className="flex-1 italic text-ink-muted">{members.isPending ? '' : name}</span>
        )}
        {other && (
          <div className="relative">
            <Button variant="ghost" size="icon" aria-label={t('menu')} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
              <MoreHorizontal className="h-5 w-5" />
            </Button>
            {menuOpen && (
              <div role="menu" className="card-surface absolute right-0 top-11 z-20 w-52 p-1.5 text-sm" onMouseLeave={() => setMenuOpen(false)}>
                <Link role="menuitem" to={`/users/${other.username}`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-raised">
                  <UserRound className="h-4 w-4" aria-hidden />
                  {t('view_profile')}
                </Link>
                <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); setReporting(true) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-raised">
                  <Flag className="h-4 w-4" aria-hidden />
                  {tc('safety:report_user')}
                </button>
                {!blocked && (
                  <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); setBlocking(true) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-ember hover:bg-raised">
                    <Ban className="h-4 w-4" aria-hidden />
                    {tc('actions.block')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <Button variant="ghost" size="icon" aria-label={t('close')} onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-y-auto px-3 py-4" aria-live="polite">
        {!safetyHidden && (
          <div className="relative mx-auto mb-6 max-w-md">
            <SafetyNotice compact />
            <button type="button" onClick={hideSafety} className="absolute right-2 top-2 rounded-full p-1 text-ink-faint hover:text-ink" aria-label={t('dismiss')}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {messages.hasNextPage && (
          <div className="mb-4 flex justify-center">
            <Button variant="ghost" size="sm" loading={messages.isFetchingNextPage} onClick={() => { stickToBottom.current = false; void messages.fetchNextPage() }}>
              {t('load_older')}
            </Button>
          </div>
        )}

        {messages.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
            <Skeleton className="h-10 w-3/5" />
          </div>
        ) : messages.isError ? (
          <ErrorState error={messages.error} onRetry={() => void messages.refetch()} />
        ) : (
          <ol className="space-y-2.5">
            {list.map((m, i) => {
              const prev = list[i - 1]
              const next = list[i + 1]
              const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString()
              const lastOfRun = !next || next.sender_id !== m.sender_id || new Date(next.created_at).getTime() - new Date(m.created_at).getTime() > 5 * 60_000
              return (
                <li key={m.id}>
                  {newDay && (
                    <p className="my-4 text-center font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                      {formatDate(m.created_at, locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  )}
                  <MessageBubble message={m} mine={m.sender_id === userId} showTime={lastOfRun} onRetry={() => retry(m)} />
                </li>
              )
            })}
          </ol>
        )}

        {showNewPill && (
          <button type="button" onClick={jumpToBottom} className="sticky bottom-2 left-1/2 mx-auto block -translate-x-0 rounded-full bg-brass px-4 py-1.5 text-xs text-on-brass shadow-lg">
            {t('new_messages')}
          </button>
        )}
      </div>

      {blocked || !other ? (
        <p className="border-t border-line px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center text-sm text-ink-muted">{tc('safety:blocked_composer')}</p>
      ) : (
        <Composer
          onSendText={(body) => dispatch({ kind: 'TEXT', body })}
          onSendPhoto={(file) => dispatch({ kind: 'PHOTO', file })}
          onShareListing={(listingId) => dispatch({ kind: 'LISTING', listingId })}
        />
      )}

      {other && (
        <>
          <ReportDialog open={reporting} onClose={() => setReporting(false)} target={{ kind: 'user', userId: other.id, username: other.username }} />
          <BlockDialog open={blocking} onClose={() => setBlocking(false)} userId={other.id} username={other.username} />
        </>
      )}
    </div>
  )
}
