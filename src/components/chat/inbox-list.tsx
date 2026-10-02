import { useTranslation } from 'react-i18next'
import { Ban } from 'lucide-react'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { useCurrentUserId } from '@/stores/auth-store'
import { Avatar } from '@/components/ui/avatar'
import { formatDate, formatTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { InboxRow } from '@/types/models'

function when(iso: string, locale: string): string {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString() ? formatTime(iso, locale) : formatDate(iso, locale, { day: '2-digit', month: '2-digit' })
}

export function InboxList({ rows, onSelect, activeId }: { rows: InboxRow[]; onSelect: (conversationId: string) => void; activeId?: string | null }) {
  const { t } = useTranslation('chat')
  const locale = useUiPreferences((s) => s.locale)
  const userId = useCurrentUserId()

  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => {
        const name = r.other_username ?? t('deleted_user')
        const preview =
          r.last_kind === 'LISTING' ? t('shared_card') : r.last_kind === 'IMAGE' ? t('sent_photo') : (r.last_body ?? '')
        const unread = r.unread_count > 0
        return (
          <li key={r.conversation_id}>
            <button
              type="button"
              onClick={() => onSelect(r.conversation_id)}
              className={cn('flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-raised', activeId === r.conversation_id && 'bg-raised')}
            >
              <Avatar src={r.other_avatar_url} name={name} size={44} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn('truncate', unread ? 'font-semibold text-ink' : 'text-ink')}>{r.other_display_name || name}</span>
                  <time className="shrink-0 font-mono text-[10px] text-ink-faint">{when(r.last_message_at, locale)}</time>
                </span>
                <span className="flex items-center gap-2">
                  <span className={cn('truncate text-sm', unread ? 'text-ink' : 'text-ink-muted')}>
                    {r.last_sender_id === userId && `${t('you')}: `}
                    {preview}
                  </span>
                  {r.is_blocked && <Ban className="h-3.5 w-3.5 shrink-0 text-ember" aria-hidden />}
                  {unread && <span className="ml-auto shrink-0 rounded-full bg-brass px-1.5 font-mono text-[10px] leading-4 text-on-brass">{r.unread_count}</span>}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
