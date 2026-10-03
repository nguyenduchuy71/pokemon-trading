import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { countActiveUsers, listWaitlist, setUserStatus } from '@/services/admin-service'
import { useAppLimits } from '@/queries/use-app-limits'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback-states'
import { toast } from '@/components/ui/toast'
import { errorKey } from '@/utils/app-error'
import { formatDate } from '@/utils/format'

/** Waitlisted signups (free-tier cap), oldest first. Admin activation may exceed the cap. */
export function WaitlistPanel() {
  const { t } = useTranslation('admin')
  const { t: tc } = useTranslation()
  const locale = useUiPreferences((s) => s.locale)
  const qc = useQueryClient()
  const { maxActiveUsers } = useAppLimits()
  const waitlist = useQuery({ queryKey: ['admin', 'waitlist'], queryFn: listWaitlist })
  const active = useQuery({ queryKey: ['admin', 'active-count'], queryFn: countActiveUsers })

  const activate = useMutation({
    mutationFn: (id: string) => setUserStatus(id, 'ACTIVE', 'waitlist'),
    onSuccess: () => {
      toast.success(t('done'))
      void qc.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (e) => toast.error(tc(errorKey(e))),
  })

  return (
    <div>
      <p className="mb-4 font-mono text-xs text-ink-faint">{t('waitlist.active_count', { count: active.data ?? 0, cap: maxActiveUsers })}</p>
      {waitlist.isPending ? (
        <Skeleton className="h-32" />
      ) : waitlist.isError ? (
        <ErrorState error={waitlist.error} onRetry={() => void waitlist.refetch()} />
      ) : !waitlist.data.length ? (
        <EmptyState title={t('empty')} />
      ) : (
        <ol className="divide-y divide-line">
          {waitlist.data.map((u, i) => (
            <li key={u.id} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="font-mono">#{i + 1} @{u.username}</span>
                <span className="ml-2 text-xs text-ink-faint">{formatDate(u.created_at, locale)}</span>
              </span>
              <Button size="sm" variant="secondary" loading={activate.isPending && activate.variables === u.id} onClick={() => activate.mutate(u.id)}>
                {t('waitlist.activate')}
              </Button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
