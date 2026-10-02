import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** `sheet` slides from the bottom on mobile and docks right on desktop. */
  variant?: 'center' | 'sheet'
  className?: string
}

/** Native <dialog>: focus trap, Escape and inert background come for free. */
export function Dialog({ open, onClose, title, description, children, footer, variant = 'center', className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby="dialog-title"
      className={cn(
        'm-0 max-h-none max-w-none bg-transparent p-0 text-ink backdrop:bg-black/60 backdrop:backdrop-blur-[2px]',
        variant === 'center' && 'fixed inset-0 m-auto h-fit w-[min(92vw,520px)]',
        variant === 'sheet' &&
          'fixed inset-x-0 bottom-0 top-auto w-full md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[440px]',
      )}
    >
      <div
        className={cn(
          'card-surface flex max-h-[88dvh] flex-col',
          variant === 'sheet' && 'rounded-b-none md:h-full md:max-h-none md:rounded-none md:rounded-l-[var(--radius-card)]',
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id="dialog-title" className="text-xl">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-muted hover:bg-raised hover:text-ink" aria-label={t('actions.close')}>
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </dialog>
  )
}
