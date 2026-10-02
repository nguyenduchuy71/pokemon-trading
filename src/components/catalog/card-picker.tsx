import { useId, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { useCatalogSearch } from '@/queries/use-catalog'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { Spinner } from '@/components/ui/spinner'
import { formatCardNumber } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { PokemonCard } from '@/types/models'

interface CardPickerProps {
  onPick: (card: PokemonCard) => void
  autoFocus?: boolean
}

/** ARIA 1.2 combobox over the catalog (search_catalog RPC). */
export function CardPicker({ onPick, autoFocus }: CardPickerProps) {
  const { t } = useTranslation('collection')
  const { t: tc } = useTranslation()
  const listId = useId()
  const [q, setQ] = useState('')
  const [language, setLanguage] = useState<'' | 'en' | 'ja'>('')
  const [active, setActive] = useState(0)
  const debounced = useDebouncedValue(q)
  const search = useCatalogSearch(debounced, language || undefined)
  const results = search.data ?? []
  const open = debounced.trim().length >= 2

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      onPick(results[active])
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{t('picker.label')}</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            autoFocus={autoFocus}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder={t('picker.placeholder')}
            className="h-12 w-full rounded-xl border border-line bg-surface pl-10 pr-10 text-sm placeholder:text-ink-faint focus:border-brass focus:outline-none"
          />
          {search.isFetching && <Spinner className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brass" />}
        </label>
        <select
          aria-label={t('picker.language')}
          value={language}
          onChange={(e) => setLanguage(e.target.value as '' | 'en' | 'ja')}
          className="h-12 rounded-xl border border-line bg-surface px-3 text-sm"
        >
          <option value="">{t('picker.all_languages')}</option>
          <option value="en">EN</option>
          <option value="ja">JP</option>
        </select>
      </div>

      <p className="sr-only" aria-live="polite">
        {open ? t('picker.results', { count: results.length }) : ''}
      </p>

      {open && (
        <ul id={listId} role="listbox" aria-label={t('picker.label')} className="mt-3 max-h-[52vh] space-y-1 overflow-y-auto">
          {results.map((card, i) => (
            <li
              key={card.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => onPick(card)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border p-2 transition-colors',
                i === active ? 'border-brass/60 bg-raised' : 'border-transparent hover:bg-raised',
              )}
            >
              <div className="aspect-[63/88] w-11 shrink-0 overflow-hidden rounded-[5px] bg-raised">
                {card.image_small_url && <img src={card.image_small_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{card.name}</p>
                <p className="truncate text-xs text-ink-muted">
                  {card.pokemon_name && card.language !== 'en' ? `${card.pokemon_name} · ` : ''}
                  {card.set_name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-ink-muted">{formatCardNumber(card.card_number, card.printed_total)}</p>
                <p className="font-mono text-[10px] uppercase text-ink-faint">
                  {card.language === 'ja' ? 'JP' : 'EN'}
                  {card.rarity ? ` · ${card.rarity}` : ''}
                </p>
              </div>
            </li>
          ))}
          {!search.isFetching && results.length === 0 && <li className="px-2 py-6 text-center text-sm text-ink-muted">{t('picker.no_results')}</li>}
          {search.isError && <li className="px-2 py-4 text-center text-sm text-ember">{tc('errors.generic_body')}</li>}
        </ul>
      )}
    </div>
  )
}
