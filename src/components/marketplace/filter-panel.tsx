import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CARD_CONDITIONS, LISTING_TYPES } from '@/constants/domain'
import { VN_CITIES } from '@/constants/vn-cities'
import { useMarketplaceFacets } from '@/queries/use-marketplace'
import { useMarketplaceParams } from '@/hooks/use-marketplace-params'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { Select } from '@/components/ui/form-controls'
import { cn } from '@/utils/cn'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-line py-4 first:pt-0">
      <legend className="eyebrow mb-2.5">{title}</legend>
      {children}
    </fieldset>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors', active ? 'border-brass bg-brass/10 text-brass' : 'border-line text-ink-muted hover:border-line-strong hover:text-ink')}
    >
      {children}
    </button>
  )
}

/** Shared by the desktop sidebar and the mobile bottom sheet. */
export function FilterPanel() {
  const { t } = useTranslation('marketplace')
  const { t: tc } = useTranslation()
  const { filters, toggle, update } = useMarketplaceParams()
  const facets = useMarketplaceFacets()
  const currency = useUiPreferences((s) => s.currency)

  // Price inputs are debounced so typing doesn't spam history entries.
  const [min, setMin] = useState(filters.min?.toString() ?? '')
  const [max, setMax] = useState(filters.max?.toString() ?? '')
  const dMin = useDebouncedValue(min, 500)
  const dMax = useDebouncedValue(max, 500)
  useEffect(() => {
    const nextMin = dMin === '' ? undefined : Number(dMin)
    const nextMax = dMax === '' ? undefined : Number(dMax)
    if (nextMin !== filters.min || nextMax !== filters.max) update({ min: nextMin, max: nextMax }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dMin, dMax])
  useEffect(() => {
    setMin(filters.min?.toString() ?? '')
    setMax(filters.max?.toString() ?? '')
  }, [filters.min, filters.max])

  const sets = facets.data?.sets ?? []

  return (
    <div className="text-sm">
      <Group title={t('facets.type')}>
        <div className="flex flex-wrap gap-1.5">
          {LISTING_TYPES.map((lt) => (
            <Chip key={lt} active={filters.types.includes(lt)} onClick={() => toggle('types', lt)}>
              {tc(`listing_type.${lt}`)}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title={t('facets.price', { currency })}>
        <div className="flex items-center gap-2">
          <input aria-label={t('facets.min')} placeholder={t('facets.min')} inputMode="numeric" type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 font-mono text-xs focus:border-brass focus:outline-none" />
          <span className="text-ink-faint">–</span>
          <input aria-label={t('facets.max')} placeholder={t('facets.max')} inputMode="numeric" type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 font-mono text-xs focus:border-brass focus:outline-none" />
        </div>
      </Group>

      <Group title={t('facets.condition')}>
        <div className="flex flex-wrap gap-1.5">
          {CARD_CONDITIONS.map((c) => (
            <Chip key={c} active={filters.conditions.includes(c)} onClick={() => toggle('conditions', c)}>
              {tc(`condition.${c}`)}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title={t('facets.language')}>
        <div className="flex flex-wrap gap-1.5">
          {(['en', 'ja'] as const).map((l) => (
            <Chip key={l} active={filters.languages.includes(l)} onClick={() => toggle('languages', l)}>
              {tc(`language.${l}`)}
            </Chip>
          ))}
        </div>
      </Group>

      {sets.length > 0 && (
        <Group title={t('facets.set')}>
          <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
            {sets
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((s) => (
                <label key={`${s.code}-${s.language}`} className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted hover:text-ink">
                  <input type="checkbox" checked={filters.sets.includes(s.code)} onChange={() => toggle('sets', s.code)} className="h-3.5 w-3.5 accent-[var(--brass)]" />
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className="font-mono text-[10px] text-ink-faint">{s.code}</span>
                </label>
              ))}
          </div>
        </Group>
      )}

      {(facets.data?.rarities.length ?? 0) > 0 && (
        <Group title={t('facets.rarity')}>
          <div className="flex flex-wrap gap-1.5">
            {facets.data!.rarities.sort().map((r) => (
              <Chip key={r} active={filters.rarities.includes(r)} onClick={() => toggle('rarities', r)}>
                {r}
              </Chip>
            ))}
          </div>
        </Group>
      )}

      {(facets.data?.printings.length ?? 0) > 0 && (
        <Group title={t('facets.printing')}>
          <div className="flex flex-wrap gap-1.5">
            {facets.data!.printings.map((p) => (
              <Chip key={p} active={filters.printings.includes(p)} onClick={() => toggle('printings', p)}>
                {tc(`printing.${p}`)}
              </Chip>
            ))}
          </div>
        </Group>
      )}

      <Group title={t('facets.city')}>
        <Select aria-label={t('facets.city')} value={filters.city ?? ''} onChange={(e) => update({ city: e.target.value || undefined })} className="h-9 text-xs">
          <option value="">{t('facets.any_city')}</option>
          {VN_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Group>
    </div>
  )
}
