import type { FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { CARD_CONDITIONS, GRADING_COMPANIES } from '@/constants/domain'
import { Field, Input, Select, Textarea } from '@/components/ui/form-controls'
import type { CollectionItemInput } from '@/schemas/collection-item-schema'

type ItemForm = { item: CollectionItemInput }

interface ItemFieldsProps {
  register: UseFormRegister<ItemForm>
  watch: UseFormWatch<ItemForm>
  errors?: FieldErrors<CollectionItemInput>
  printings: string[]
  binders: { id: string; name: string }[]
}

/** Details of the physical copy: condition, printing, grading, quantity, value, binder. */
export function ItemFields({ register, watch, errors, printings, binders }: ItemFieldsProps) {
  const { t } = useTranslation('collection')
  const { t: tc } = useTranslation()
  const graded = watch('item.graded')

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('add.condition')}>
          {(p) => (
            <Select {...p} {...register('item.condition')}>
              {CARD_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {tc(`condition.${c}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('add.printing')}>
          {(p) => (
            <Select {...p} {...register('item.printing')}>
              {printings.map((pr) => (
                <option key={pr} value={pr}>
                  {tc(`printing.${pr}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <label className="flex items-center gap-3 text-sm text-ink-muted">
        <input type="checkbox" {...register('item.graded')} className="h-4 w-4 accent-[var(--brass)]" />
        {t('add.graded')}
      </label>
      {graded && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('add.grading_company')}>
            {(p) => (
              <Select {...p} {...register('item.grading_company')}>
                <option value="">—</option>
                {GRADING_COMPANIES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('add.grade')} error={errors?.grade ? t('add.grade') : undefined}>
            {(p) => <Input {...p} {...register('item.grade')} type="number" min={1} max={10} step={0.5} className="font-mono" />}
          </Field>
        </div>
      )}

      <div className="grid grid-cols-[96px_1fr_auto] gap-3">
        <Field label={t('add.quantity')}>{(p) => <Input {...p} {...register('item.quantity')} type="number" min={1} max={999} className="font-mono" />}</Field>
        <Field label={t('add.estimated_value')} hint={t('stats.value_hint')}>
          {(p) => <Input {...p} {...register('item.estimated_value')} type="number" min={0} step="any" inputMode="decimal" className="font-mono" />}
        </Field>
        <Field label={t('add.value_currency')}>
          {(p) => (
            <Select {...p} {...register('item.value_currency')} className="w-28">
              <option value="VND">VND ₫</option>
              <option value="USD">USD $</option>
            </Select>
          )}
        </Field>
      </div>

      <Field label={t('add.binder')}>
        {(p) => (
          <Select {...p} {...register('item.collection_id')}>
            {binders.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label={t('add.notes')}>{(p) => <Textarea {...p} {...register('item.notes')} maxLength={500} className="min-h-16" />}</Field>
    </div>
  )
}
