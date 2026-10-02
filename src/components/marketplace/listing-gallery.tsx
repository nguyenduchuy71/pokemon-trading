import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HoloFrame } from '@/components/card/holo-frame'
import { publicImageUrl } from '@/services/storage-service'
import { cn } from '@/utils/cn'
import type { CollectionItemPhoto } from '@/types/models'

/** Owner's real photos (medium size) with thumbnail strip. */
export function ListingGallery({ photos, foil, alt }: { photos: CollectionItemPhoto[]; foil: boolean; alt: string }) {
  const { t } = useTranslation('marketplace')
  const sorted = [...photos].sort((a, b) => a.position - b.position)
  const [index, setIndex] = useState(0)
  const current = sorted[index]

  return (
    <div>
      <HoloFrame foil={foil} className="mx-auto aspect-[63/88] w-full max-w-[460px] rounded-[18px] border border-line bg-raised shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]">
        {current && (
          <a href={publicImageUrl('card-images', current.medium_path)} target="_blank" rel="noreferrer">
            <img src={publicImageUrl('card-images', current.medium_path)} alt={alt} className="h-full w-full object-cover" decoding="async" />
          </a>
        )}
      </HoloFrame>
      {sorted.length > 1 && (
        <div className="mx-auto mt-4 flex max-w-[460px] gap-2 overflow-x-auto" role="tablist" aria-label={alt}>
          {sorted.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={t('detail.photo_n', { n: i + 1 })}
              onClick={() => setIndex(i)}
              className={cn('aspect-[63/88] w-16 shrink-0 overflow-hidden rounded-[8px] border', i === index ? 'border-brass' : 'border-line opacity-70 hover:opacity-100')}
            >
              <img src={publicImageUrl('card-images', p.thumb_path)} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
