import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { SharedListingBubble } from './shared-listing-bubble'
import { ChatImage } from './chat-image'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { formatTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { ThreadMessage } from '@/services/messaging-service'

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g

/** Plain text with safe auto-links (no HTML is ever rendered from messages). */
export function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="break-all underline underline-offset-2">
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

interface MessageBubbleProps {
  message: ThreadMessage
  mine: boolean
  showTime: boolean
  onRetry?: () => void
}

export function MessageBubble({ message, mine, showTime, onRetry }: MessageBubbleProps) {
  const { t } = useTranslation('chat')
  const locale = useUiPreferences((s) => s.locale)

  return (
    <div className={cn('flex flex-col gap-1', mine ? 'items-end' : 'items-start')}>
      {message.kind === 'LISTING' && <SharedListingBubble listing={message.listing} listingId={message.listing_id} />}
      {message.kind === 'IMAGE' && message.image_path && <ChatImage path={message.image_path} />}
      {message.body && (
        <p
          className={cn(
            'max-w-[min(85%,34rem)] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[0.94rem] leading-relaxed',
            mine ? 'rounded-br-md bg-brass text-on-brass' : 'rounded-bl-md border border-line bg-raised text-ink',
            message.pending && 'opacity-70',
          )}
        >
          <Linkified text={message.body} />
        </p>
      )}
      {message.failed ? (
        <button type="button" onClick={onRetry} className="flex items-center gap-1 text-[11px] text-ember">
          <AlertCircle className="h-3 w-3" aria-hidden />
          {t('failed')} {t('retry')}
        </button>
      ) : (
        showTime && <time dateTime={message.created_at} className="px-1 font-mono text-[10px] text-ink-faint">{message.pending ? t('sending') : formatTime(message.created_at, locale)}</time>
      )}
    </div>
  )
}
