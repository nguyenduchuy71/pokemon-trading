import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CARD_CONDITIONS, WISHLIST_PRIORITIES, type CardCondition, type CurrencyCode, type WishlistPriority } from '@/constants/domain'
import { useUpdateWishlistItem } from '@/queries/use-wishlist'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/form-controls'
import { CatalogCardSummary } from '@/components/catalog/catalog-card-summary'
import { toast } from '@/components/ui/toast'
import { errorKey } from '@/utils/app-error'
import type { WishlistEntry } from '@/services/wishlist-service'

interface State {
  quantity: string
  max_price: string
  max_price_currency: CurrencyCode
  min_condition: CardCondition | ''
  printing: string
  priority: WishlistPriority
  notes: string
}

export function WishlistItemSheet({ entry, onClose }: { entry: WishlistEntry | null; onClose: () => void }) {
  const { t } = useTranslation('wishlist')
  const { t: tc } = useTranslation()
  const update = useUpdateWishlistItem()
  const [s, setS] = useState<State | null>(null)

  useEffect(() => {
    if (entry)
      setS({
        quantity: String(entry.quantity),
        max_price: entry.max_price?.toString() ?? '',
        max_price_currency: entry.max_price_currency,
        min_condition: entry.min_condition ?? '',
        printing: entry.printing ?? '',
        priority: entry.priority,
        notes: entry.notes ?? '',
      })
  }, [entry])

  if (!entry || !s) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!entry || !s) return
    const quantity = Math.min(99, Math.max(1, Number(s.quantity) || 1))
    const maxPrice = s.max_price === '' ? null : Math.max(0, Number(s.max_price))
    try {
      await update.mutateAsync({
        id: entry.id,
        patch: {
          quantity,
          max_price: maxPrice || null,
          max_price_currency: s.max_price_currency,
          min_condition: s.min_condition || null,
          printing: s.printing || null,
          priority: s.priority,
          notes: s.notes.trim() || null,
        },
      })
      onClose()
    } catch (error) {
      toast.error(tc(errorKey(error)))
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('edit_title')} variant="sheet">
      <form onSubmit={submit} className="space-y-5">
        <CatalogCardSummary card={entry.card} compact />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('priority')}>
            {(p) => (
              <Select {...p} value={s.priority} onChange={(e) => setS({ ...s, priority: e.target.value as WishlistPriority })}>
                {WISHLIST_PRIORITIES.map((pr) => (
                  <option key={pr} value={pr}>
                    {t(`priorities.${pr}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('quantity')}>{(p) => <Input {...p} type="number" min={1} max={99} value={s.quantity} onChange={(e) => setS({ ...s, quantity: e.target.value })} className="font-mono" />}</Field>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label={t('max_price')}>
            {(p) => <Input {...p} type="number" min={0} step="any" value={s.max_price} onChange={(e) => setS({ ...s, max_price: e.target.value })} className="font-mono" />}
          </Field>
          <Field label={tc('prefs.currency')}>
            {(p) => (
              <Select {...p} value={s.max_price_currency} onChange={(e) => setS({ ...s, max_price_currency: e.target.value as CurrencyCode })} className="w-28">
                <option value="VND">VND ₫</option>
                <option value="USD">USD $</option>
              </Select>
            )}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('min_condition')}>
            {(p) => (
              <Select {...p} value={s.min_condition} onChange={(e) => setS({ ...s, min_condition: e.target.value as CardCondition | '' })}>
                <option value="">{t('any')}</option>
                {CARD_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {tc(`condition.${c}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('printing')}>
            {(p) => (
              <Select {...p} value={s.printing} onChange={(e) => setS({ ...s, printing: e.target.value })}>
                <option value="">{t('any')}</option>
                {(entry.card.printing ?? ['normal']).map((pr) => (
                  <option key={pr} value={pr}>
                    {tc(`printing.${pr}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label={t('notes')}>{(p) => <Textarea {...p} value={s.notes} maxLength={300} onChange={(e) => setS({ ...s, notes: e.target.value })} className="min-h-16" />}</Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
          <Button type="submit" loading={update.isPending}>
            {tc('actions.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
