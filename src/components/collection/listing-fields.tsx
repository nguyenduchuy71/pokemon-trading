import { Controller, type Control, type FieldErrors, type UseFormRegister, type UseFormWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { LISTING_TYPES } from '@/constants/domain'
import { Field, Input, Select, Textarea } from '@/components/ui/form-controls'
import { ChipInput } from '@/components/ui/chip-input'
import { cn } from '@/utils/cn'
import type { ListingInput } from '@/schemas/collection-item-schema'

/* Works for any form that nests listing fields under a key (e.g. "listing") or at the root. */
type ListingForm = { listing: ListingInput }

interface ListingFieldsProps {
  control: Control<ListingForm>
  register: UseFormRegister<ListingForm>
  watch: UseFormWatch<ListingForm>
  errors?: FieldErrors<ListingInput>
  maxQuantity: number
}

export function ListingFields({ control, register, watch, errors, maxQuantity }: ListingFieldsProps) {
  const { t } = useTranslation('collection')
  const { t: tc } = useTranslation()
  const type = watch('listing.listing_type')

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="text-xs font-medium tracking-wide text-ink-muted">{t('add.listing_type')}</legend>
        <Controller
          control={control}
          name="listing.listing_type"
          render={({ field }) => (
            <div role="radiogroup" className="mt-2 grid grid-cols-3 gap-2">
              {LISTING_TYPES.map((lt) => (
                <button
                  key={lt}
                  type="button"
                  role="radio"
                  aria-checked={field.value === lt}
                  onClick={() => field.onChange(lt)}
                  className={cn(
                    'rounded-xl border px-2 py-3 text-xs transition-colors',
                    field.value === lt ? (lt === 'TRADE' ? 'border-verdigris text-verdigris' : 'border-brass text-brass') : 'border-line text-ink-muted hover:border-line-strong',
                  )}
                >
                  {tc(`listing_type.${lt}`)}
                </button>
              ))}
            </div>
          )}
        />
      </fieldset>

      {type !== 'TRADE' && (
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label={t('add.price')} error={errors?.price ? t('add.errors.price_required') : undefined}>
            {(p) => <Input {...p} {...register('listing.price')} inputMode="decimal" type="number" min="0" step="any" className="font-mono" />}
          </Field>
          <Field label={t('add.value_currency')}>
            {(p) => (
              <Select {...p} {...register('listing.currency')} className="w-28">
                <option value="VND">VND ₫</option>
                <option value="USD">USD $</option>
              </Select>
            )}
          </Field>
        </div>
      )}

      {maxQuantity > 1 && (
        <Field label={t('add.listing_quantity')} error={errors?.quantity ? t('add.errors.quantity') : undefined}>
          {(p) => <Input {...p} {...register('listing.quantity')} type="number" min={1} max={maxQuantity} className="w-28 font-mono" />}
        </Field>
      )}

      {type !== 'SALE' && (
        <Field label={t('add.looking_for')}>
          {(p) => (
            <Controller
              control={control}
              name="listing.looking_for"
              render={({ field }) => <ChipInput id={p.id} value={field.value ?? []} onChange={field.onChange} placeholder={t('add.looking_for_placeholder')} />}
            />
          )}
        </Field>
      )}

      <Field label={t('add.description')}>
        {(p) => <Textarea {...p} {...register('listing.description')} maxLength={1000} placeholder={t('add.description_placeholder')} />}
      </Field>
    </div>
  )
}
