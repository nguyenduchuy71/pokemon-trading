import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { Button } from './button'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-raised', className)} />
}

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  body?: string
  action?: ReactNode
  className?: string
}

/** Editorial empty state: an empty card pocket outline + guidance. */
export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div className="mb-5 flex h-24 w-[68px] items-center justify-center rounded-[10px] border border-dashed border-line-strong text-ink-faint">
        {icon}
      </div>
      <h3 className="text-xl">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  error?: unknown
  onRetry?: () => void
  className?: string
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const { t } = useTranslation()
  const message = error instanceof Error ? error.message : undefined
  return (
    <div role="alert" className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <AlertTriangle className="mb-3 h-7 w-7 text-ember" aria-hidden />
      <h3 className="text-lg">{t('errors.generic_title')}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{t('errors.generic_body')}</p>
      {import.meta.env.DEV && message && <p className="mt-2 font-mono text-xs text-ink-faint">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          {t('actions.retry')}
        </Button>
      )}
    </div>
  )
}
