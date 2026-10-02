import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { BinderPocket } from './binder-pocket'
import type { ItemWithDetails } from '@/services/collection-service'
import { cn } from '@/utils/cn'

const POCKETS_PER_PAGE = 9

interface BinderGridProps {
  binderId: string
  items: ItemWithDetails[]
  onOpen: (item: ItemWithDetails) => void
  onReorder: (items: ItemWithDetails[]) => void
  editable: boolean
}

/**
 * 3×3 binder pages. Desktop shows an open spread (two pages), phones one page.
 * The final slot after the last card is a "+" pocket.
 */
export function BinderGrid({ binderId, items, onOpen, onReorder, editable }: BinderGridProps) {
  const { t } = useTranslation('collection')
  const [spread, setSpread] = useState(0)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const slots: (ItemWithDetails | 'add' | null)[] = useMemo(() => {
    const all: (ItemWithDetails | 'add' | null)[] = [...items, ...(editable ? (['add'] as const) : [])]
    const pageCount = Math.max(1, Math.ceil(all.length / POCKETS_PER_PAGE))
    return [...all, ...Array(pageCount * POCKETS_PER_PAGE - all.length).fill(null)]
  }, [items, editable])

  const pages = Array.from({ length: slots.length / POCKETS_PER_PAGE }, (_, i) => slots.slice(i * POCKETS_PER_PAGE, (i + 1) * POCKETS_PER_PAGE))
  const spreads = Math.ceil(pages.length / 2)
  const current = Math.min(spread, spreads - 1)

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const from = items.findIndex((i) => i.id === e.active.id)
    const to = items.findIndex((i) => i.id === e.over!.id)
    if (from >= 0 && to >= 0) onReorder(arrayMove(items, from, to))
  }

  const renderPage = (page: (ItemWithDetails | 'add' | null)[], pageIndex: number, className?: string) => (
    <section key={pageIndex} aria-label={t('binder.page_label', { page: pageIndex + 1, total: pages.length })} className={cn('rounded-[18px] border border-line bg-surface/70 p-3 sm:p-4', className)}>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {page.map((slot, i) =>
          slot === 'add' ? (
            <Link
              key="add"
              to={`/cards/add?binder=${binderId}`}
              className="flex aspect-[63/88] items-center justify-center rounded-[10px] border border-dashed border-line-strong text-ink-faint transition-colors hover:border-brass hover:text-brass"
              aria-label={t('binder.add_pocket')}
            >
              <Plus className="h-6 w-6" />
            </Link>
          ) : slot ? (
            <BinderPocket key={slot.id} item={slot} onOpen={onOpen} sortable={editable} />
          ) : (
            <div key={`empty-${pageIndex}-${i}`} className="aspect-[63/88] rounded-[10px] border border-line/60 bg-bg/40" aria-hidden />
          ),
        )}
      </div>
      <p className="mt-3 text-center font-mono text-[10px] tracking-widest text-ink-faint">{pageIndex + 1}</p>
    </section>
  )

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        {/* Phones: one page at a time */}
        <div className="md:hidden">{renderPage(pages[Math.min(current * 2, pages.length - 1)], Math.min(current * 2, pages.length - 1))}</div>
        {/* Desktop: open spread */}
        <div className="hidden gap-6 md:grid md:grid-cols-2">
          {renderPage(pages[current * 2], current * 2)}
          {pages[current * 2 + 1] ? renderPage(pages[current * 2 + 1], current * 2 + 1) : <div aria-hidden />}
        </div>
      </SortableContext>

      {spreads > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-4" aria-label="Binder pages">
          <button type="button" disabled={current === 0} onClick={() => setSpread(current - 1)} className="rounded-full border border-line p-2 disabled:opacity-30" aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-xs text-ink-muted">
            {current + 1} / {spreads}
          </span>
          <button type="button" disabled={current >= spreads - 1} onClick={() => setSpread(current + 1)} className="rounded-full border border-line p-2 disabled:opacity-30" aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </DndContext>
  )
}
