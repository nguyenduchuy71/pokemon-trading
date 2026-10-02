import { cn } from '@/utils/cn'

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center">
      <span
        aria-hidden
        className={cn('inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}
