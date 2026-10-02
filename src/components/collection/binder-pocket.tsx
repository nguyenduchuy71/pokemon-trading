import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import { HoloFrame } from '@/components/card/holo-frame'
import { activeListing, sortedPhotos, type ItemWithDetails } from '@/services/collection-service'
import { publicImageUrl } from '@/services/storage-service'
import { FOIL_RARITY_PATTERN } from '@/constants/domain'
import { cn } from '@/utils/cn'

const CONDITION_SHORT: Record<string, string> = { MINT: 'M', NEAR_MINT: 'NM', EXCELLENT: 'EX', LIGHT_PLAYED: 'LP', PLAYED: 'PL', POOR: 'PR' }

interface BinderPocketProps {
  item: ItemWithDetails
  onOpen: (item: ItemWithDetails) => void
  sortable?: boolean
}

/** One sleeve in the binder. Real photo first, catalog art as fallback. */
export function BinderPocket({ item, onOpen, sortable = true }: BinderPocketProps) {
  const { t } = useTranslation('collection')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !sortable })
  const photo = sortedPhotos(item)[0]
  const src = publicImageUrl('card-images', photo?.thumb_path) ?? item.card.image_small_url ?? undefined
  const listing = activeListing(item)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-10 scale-[1.03] opacity-90')}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={() => onOpen(item)}
        aria-label={`${item.card.name} · ${item.card.set_name}`}
        className="block w-full touch-manipulation rounded-[10px] text-left"
      >
        <HoloFrame foil={FOIL_RARITY_PATTERN.test(item.card.rarity ?? '')} className="aspect-[63/88] rounded-[10px] border border-line bg-raised shadow-[inset_0_0_0_3px_rgba(255,255,255,0.03)]">
          {src && <img src={src} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />}
          {listing && (
            <span className="absolute left-0 top-2 rounded-r-full bg-brass px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-on-brass">{t('binder.listed')}</span>
          )}
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
            {item.grading_company ? `${item.grading_company} ${item.grade}` : CONDITION_SHORT[item.condition]}
            {item.quantity > 1 && ` ×${item.quantity}`}
          </span>
        </HoloFrame>
      </button>
    </div>
  )
}
