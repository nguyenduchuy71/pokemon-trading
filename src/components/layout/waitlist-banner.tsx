import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Hourglass } from 'lucide-react'
import { getWaitlistPosition } from '@/services/profile-service'
import { useMe } from '@/queries/use-me'
import { useAppLimits } from '@/queries/use-app-limits'
import { toast } from '@/components/ui/toast'

/**
 * Free-tier user cap: tells a waitlisted collector their place in line and celebrates once a
 * slot opens (the position poll returns null → profile refetch → status flips to ACTIVE).
 */
export function WaitlistBanner() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const me = useMe()
  const { maxActiveUsers } = useAppLimits()
  const status = me.data?.status
  const waitlisted = status === 'WAITLISTED'
  const prev = useRef({ id: me.data?.id, status })

  const position = useQuery({
    queryKey: ['waitlist-position', me.data?.id],
    queryFn: getWaitlistPosition,
    enabled: waitlisted,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (waitlisted && position.isSuccess && position.data == null) void qc.invalidateQueries({ queryKey: ['me'] })
  }, [waitlisted, position.isSuccess, position.data, qc])

  useEffect(() => {
    const id = me.data?.id
    // Same account only: switching accounts must not look like an activation.
    if (prev.current.id === id && prev.current.status === 'WAITLISTED' && status === 'ACTIVE') toast.success(t('waitlist.activated'))
    prev.current = { id, status }
  }, [me.data?.id, status, t])

  if (!waitlisted) return null
  return (
    <div role="status" className="border-b border-line bg-raised px-4 py-3 text-sm">
      <p className="mx-auto flex max-w-6xl items-start gap-2 text-ink-muted">
        <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-brass" aria-hidden />
        <span>
          {position.data ? t('waitlist.banner', { position: position.data, cap: maxActiveUsers }) : t('waitlist.banner_pending', { cap: maxActiveUsers })}
        </span>
      </p>
    </div>
  )
}
