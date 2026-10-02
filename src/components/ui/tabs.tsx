import { cn } from '@/utils/cn'

interface TabsProps<T extends string> {
  value: T
  onChange: (value: T) => void
  items: { value: T; label: string; count?: number }[]
  label: string
  className?: string
}

/** Underlined editorial tabs. Content panels are rendered by the caller. */
export function Tabs<T extends string>({ value, onChange, items, label, className }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex gap-6 overflow-x-auto border-b border-line', className)}>
      {items.map((item) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 pb-3 text-sm transition-colors',
              selected ? 'border-brass text-ink' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && <span className="font-mono text-[11px] text-ink-faint">{item.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
