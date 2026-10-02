import { Link } from 'react-router'
import { cn } from '@/utils/cn'

/** Original mark: two offset card outlines (a swap), brass foil corner. No third-party branding. */
export function Wordmark({ className, to = '/' }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn('group inline-flex items-center gap-2.5', className)} aria-label="CardSwap">
      <svg width="26" height="30" viewBox="0 0 26 30" aria-hidden className="shrink-0">
        <rect x="7" y="1" width="17" height="24" rx="3" fill="none" stroke="var(--line-strong)" strokeWidth="1.5" />
        <rect x="2" y="5" width="17" height="24" rx="3" fill="var(--raised)" stroke="var(--brass)" strokeWidth="1.5" />
        <path d="M2 11 L8 5" stroke="var(--brass-strong)" strokeWidth="1.5" />
        <circle cx="10.5" cy="17" r="3.2" fill="none" stroke="var(--brass)" strokeWidth="1.3" />
      </svg>
      <span className="font-display text-[1.35rem] leading-none tracking-tight">
        Card<em className="text-brass not-italic group-hover:italic">Swap</em>
      </span>
    </Link>
  )
}
