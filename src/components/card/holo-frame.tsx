import { useRef, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface HoloFrameProps {
  children: ReactNode
  /** Enable the foil sheen (reserve for rare printings so it stays special). */
  foil?: boolean
  className?: string
}

/**
 * Tracks the pointer into CSS vars (--mx/--my) consumed by .holo-frame::after.
 * Writes straight to the style attribute — no React re-render per mouse move.
 */
export function HoloFrame({ children, foil = false, className }: HoloFrameProps) {
  const ref = useRef<HTMLDivElement>(null)

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!foil || e.pointerType !== 'mouse' || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`)
    ref.current.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`)
  }

  return (
    <div ref={ref} data-foil={foil} onPointerMove={handleMove} className={cn('holo-frame', className)}>
      {children}
    </div>
  )
}
