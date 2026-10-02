import { useTranslation } from 'react-i18next'
import { formatCardNumber } from '@/utils/format'
import type { PokemonCard } from '@/types/models'
import { Badge } from '@/components/ui/badge'

/** Catalog facts for a card, with its reference art clearly labelled as such. */
export function CatalogCardSummary({ card, compact = false }: { card: PokemonCard; compact?: boolean }) {
  const { t } = useTranslation('collection')
  const { t: tc } = useTranslation()
  return (
    <div className="flex gap-4">
      <figure className={compact ? 'w-16 shrink-0' : 'w-28 shrink-0'}>
        <div className="aspect-[63/88] overflow-hidden rounded-[8px] border border-line bg-raised">
          {card.image_small_url && <img src={card.image_small_url} alt="" className="h-full w-full object-cover opacity-90" />}
        </div>
        {!compact && <figcaption className="mt-1.5 text-center font-mono text-[9px] uppercase tracking-widest text-ink-faint">{t('picker.reference')}</figcaption>}
      </figure>
      <div className="min-w-0">
        <p className="eyebrow">{card.set_name}</p>
        <h3 className={compact ? 'mt-1 text-lg leading-tight' : 'mt-1 text-2xl leading-tight'}>{card.name}</h3>
        {card.pokemon_name && card.pokemon_name !== card.name && <p className="text-sm text-ink-muted">{card.pokemon_name}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge className="font-mono">{formatCardNumber(card.card_number, card.printed_total)}</Badge>
          <Badge>{tc(`language.${card.language}`)}</Badge>
          {card.rarity && <Badge tone="brass">{card.rarity}</Badge>}
        </div>
      </div>
    </div>
  )
}
