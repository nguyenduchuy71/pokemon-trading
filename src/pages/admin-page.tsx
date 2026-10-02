import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listHiddenListings,
  listModerationLog,
  listOpenReports,
  listSuspendedUsers,
  resolveReport,
  setListingModeration,
  setUserStatus,
  type AdminReport,
} from '@/services/admin-service'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback-states'
import { toast } from '@/components/ui/toast'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { errorKey } from '@/utils/app-error'
import { formatDate } from '@/utils/format'

type Tab = 'reports' | 'hidden' | 'suspended' | 'log'

/** Groups open reports per target so one listing reported 5× is one row. */
function groupReports(reports: AdminReport[]) {
  const groups = new Map<string, { key: string; reports: AdminReport[] }>()
  for (const r of reports) {
    const key = r.target_listing ? `l:${r.target_listing.id}` : r.target_snapshot ? `s:${r.id}` : `u:${r.target_user?.id}`
    if (!groups.has(key)) groups.set(key, { key, reports: [] })
    groups.get(key)!.reports.push(r)
  }
  return [...groups.values()].sort((a, b) => b.reports.length - a.reports.length)
}

export default function AdminPage() {
  const { t } = useTranslation('admin')
  const { t: tc } = useTranslation()
  const locale = useUiPreferences((s) => s.locale)
  const [tab, setTab] = useState<Tab>('reports')
  const qc = useQueryClient()

  const reports = useQuery({ queryKey: ['admin', 'reports'], queryFn: listOpenReports, enabled: tab === 'reports' })
  const hidden = useQuery({ queryKey: ['admin', 'hidden'], queryFn: listHiddenListings, enabled: tab === 'hidden' })
  const suspended = useQuery({ queryKey: ['admin', 'suspended'], queryFn: listSuspendedUsers, enabled: tab === 'suspended' })
  const log = useQuery({ queryKey: ['admin', 'log'], queryFn: listModerationLog, enabled: tab === 'log' })
  const groups = useMemo(() => groupReports(reports.data ?? []), [reports.data])

  const act = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onSuccess: () => {
      toast.success(t('done'))
      void qc.invalidateQueries({ queryKey: ['admin'] })
      void qc.invalidateQueries({ queryKey: ['marketplace'] })
    },
    onError: (e) => toast.error(tc(errorKey(e))),
  })

  const note = () => window.prompt(t('note_prompt')) ?? undefined
  const resolveAll = (g: { reports: AdminReport[] }, status: 'RESOLVED' | 'DISMISSED', n?: string) =>
    Promise.all(g.reports.map((r) => resolveReport(r.id, status, n))).then(() => undefined)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-4xl">{t('title')}</h1>
      <p className="mt-2 text-ink-muted">{t('lede')}</p>

      <Tabs className="mt-8" label={t('title')} value={tab} onChange={setTab} items={(['reports', 'hidden', 'suspended', 'log'] as Tab[]).map((v) => ({ value: v, label: t(`tabs.${v}`) }))} />

      <div className="mt-6">
        {tab === 'reports' &&
          (reports.isPending ? (
            <Skeleton className="h-40" />
          ) : reports.isError ? (
            <ErrorState error={reports.error} onRetry={() => void reports.refetch()} />
          ) : groups.length === 0 ? (
            <EmptyState title={t('empty')} />
          ) : (
            <ul className="space-y-3">
              {groups.map((g) => {
                const first = g.reports[0]
                const listing = first.target_listing
                const user = first.target_user
                return (
                  <li key={g.key} className="card-surface p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="eyebrow">{listing ? t('target_listing') : t('target_user')}</p>
                        {listing ? (
                          <Link to={`/cards/${listing.id}`} className="font-display text-lg hover:text-brass">
                            {listing.card?.name} · {listing.card?.set_name} #{listing.card?.card_number}
                          </Link>
                        ) : first.target_snapshot ? (
                          <p className="font-display text-lg text-ink-muted line-through">
                            {first.target_snapshot.card} · {first.target_snapshot.set} #{first.target_snapshot.number}
                          </p>
                        ) : (
                          <Link to={`/users/${user?.username}`} className="font-mono hover:text-brass">
                            @{user?.username ?? '—'}
                          </Link>
                        )}
                        {listing && user && (
                          <p className="text-xs text-ink-muted">
                            <Link to={`/users/${user.username}`} className="font-mono hover:text-brass">@{user.username}</Link>
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge tone="ember">{t('reports_count', { count: g.reports.length })}</Badge>
                          {listing && <Badge>{t(`status.${listing.moderation_status}`)}</Badge>}
                          {user?.status === 'SUSPENDED' && <Badge tone="ember">SUSPENDED</Badge>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {listing && listing.moderation_status !== 'REMOVED' && (
                          <Button size="sm" variant="danger" onClick={() => act.mutate(async () => { const n = note(); await setListingModeration(listing.id, 'REMOVED', n); await resolveAll(g, 'RESOLVED', n) })}>
                            {t('remove_listing')}
                          </Button>
                        )}
                        {listing && listing.moderation_status !== 'VISIBLE' && (
                          <Button size="sm" variant="secondary" onClick={() => act.mutate(async () => { const n = note(); await setListingModeration(listing.id, 'VISIBLE', n); await resolveAll(g, 'DISMISSED', n) })}>
                            {t('restore_listing')}
                          </Button>
                        )}
                        {user && user.status !== 'SUSPENDED' && (
                          <Button size="sm" variant="danger" onClick={() => act.mutate(async () => { const n = note(); await setUserStatus(user.id, 'SUSPENDED', n); await resolveAll(g, 'RESOLVED', n) })}>
                            {t('suspend_user')}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => act.mutate(() => resolveAll(g, 'DISMISSED', note()))}>
                          {t('dismiss')}
                        </Button>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
                      {g.reports.map((r) => (
                        <li key={r.id} className="flex flex-wrap gap-x-3 text-ink-muted">
                          <span className="font-medium text-ink">{tc(`safety:reasons.${r.reason}`)}</span>
                          <span className="font-mono">@{r.reporter?.username ?? '—'}</span>
                          <span className="text-ink-faint">{formatDate(r.created_at, locale)}</span>
                          {r.details && <span className="w-full text-ink-muted">“{r.details}”</span>}
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>
          ))}

        {tab === 'hidden' &&
          (hidden.isPending ? (
            <Skeleton className="h-32" />
          ) : !hidden.data?.length ? (
            <EmptyState title={t('empty')} />
          ) : (
            <ul className="divide-y divide-line">
              {hidden.data.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <Link to={`/cards/${l.id}`} className="hover:text-brass">
                    {l.card?.name} · {l.card?.set_name} <span className="font-mono text-xs text-ink-faint">@{l.seller?.username}</span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge>{t(`status.${l.moderation_status}`)}</Badge>
                    <Button size="sm" variant="secondary" onClick={() => act.mutate(() => setListingModeration(l.id, 'VISIBLE', note()))}>
                      {t('restore_listing')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ))}

        {tab === 'suspended' &&
          (suspended.isPending ? (
            <Skeleton className="h-32" />
          ) : !suspended.data?.length ? (
            <EmptyState title={t('empty')} />
          ) : (
            <ul className="divide-y divide-line">
              {suspended.data.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-3">
                  <span className="font-mono">@{u.username}</span>
                  <Button size="sm" variant="secondary" onClick={() => act.mutate(() => setUserStatus(u.id, 'ACTIVE', note()))}>
                    {t('reactivate_user')}
                  </Button>
                </li>
              ))}
            </ul>
          ))}

        {tab === 'log' &&
          (log.isPending ? (
            <Skeleton className="h-32" />
          ) : !log.data?.length ? (
            <EmptyState title={t('empty')} />
          ) : (
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-line">
                {log.data.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 font-mono text-ink-faint">{formatDate(a.created_at, locale, { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="py-2 font-mono">@{a.admin?.username ?? '—'}</td>
                    <td className="py-2 font-medium">{a.action}</td>
                    <td className="py-2 text-ink-muted">{a.target_user ? `@${a.target_user.username}` : a.target_listing_id?.slice(0, 8)}</td>
                    <td className="py-2 text-ink-muted">{a.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </div>
    </div>
  )
}
