import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useForm, type Control, type UseFormRegister, type UseFormWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { addCardSchema, defaultListing, type AddCardInput } from '@/schemas/add-card-schema'
import { collectionItemSchema, listingSchema, type ListingInput } from '@/schemas/collection-item-schema'
import { useListingDraft } from '@/stores/listing-draft-store'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { useAddCard, useCollections } from '@/queries/use-collections'
import { CardPicker } from '@/components/catalog/card-picker'
import { CatalogCardSummary } from '@/components/catalog/catalog-card-summary'
import { ItemFields } from '@/components/collection/item-fields'
import { ListingFields } from '@/components/collection/listing-fields'
import { PhotoUploader } from '@/components/collection/photo-uploader'
import { CardLimitNotice } from '@/components/collection/card-limit-notice'
import { useAppLimits } from '@/queries/use-app-limits'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { errorKey, toAppError } from '@/utils/app-error'
import { ImageInputError } from '@/utils/image-processing'
import { cn } from '@/utils/cn'
import type { PrintingKind } from './add-card-page.types'

const STEPS = ['step_card', 'step_copy', 'step_listing'] as const

export default function AddCardPage() {
  const { t } = useTranslation('collection')
  const { t: tc } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const currency = useUiPreferences((s) => s.currency)
  const draft = useListingDraft()
  const collections = useCollections()
  const addCard = useAddCard()
  const [photoError, setPhotoError] = useState<string>()
  const { maxCollectionItems, maxPhotosPerItem } = useAppLimits()
  // A draft saved under an older, higher photo limit must not exceed today's cap.
  const draftPhotos = draft.photos.slice(0, maxPhotosPerItem)
  const cardsUsed = (collections.data ?? []).reduce((n, c) => n + (c.items[0]?.count ?? 0), 0)
  const atLimit = collections.isSuccess && cardsUsed >= maxCollectionItems

  const binders = useMemo(() => (collections.data ?? []).map((c) => ({ id: c.id, name: c.name })), [collections.data])
  const defaultBinder = params.get('binder') ?? collections.data?.find((c) => c.is_default)?.id ?? ''
  const step = draft.card ? (draft.values?.list ? 2 : 1) : 0

  const form = useForm<AddCardInput>({
    resolver: zodResolver(addCardSchema) as never,
    defaultValues: draft.values ?? {
      item: {
        collection_id: defaultBinder,
        condition: 'NEAR_MINT',
        printing: 'normal',
        graded: false,
        grading_company: null,
        grade: '' as unknown as number,
        quantity: 1,
        estimated_value: '' as unknown as number,
        value_currency: currency,
        notes: '',
      },
      list: false,
      listing: defaultListing(currency),
    },
  })
  const { register, watch, handleSubmit, setValue, formState, reset } = form

  // Binder list arrives async; fill it in once known (unless the draft already has one).
  useEffect(() => {
    if (defaultBinder && !form.getValues('item.collection_id')) setValue('item.collection_id', defaultBinder)
  }, [defaultBinder, form, setValue])

  // Persist the draft on every change (cheap; sessionStorage).
  useEffect(() => {
    const sub = watch((values) => useListingDraft.getState().setValues(values as AddCardInput))
    return () => sub.unsubscribe()
  }, [watch])

  const list = watch('list')
  const quantity = Number(watch('item.quantity')) || 1
  const printings = (draft.card?.printing?.length ? draft.card.printing : ['normal']) as PrintingKind[]

  function pickCard(card: NonNullable<typeof draft.card>) {
    draft.setCard(card)
    setValue('item.printing', (card.printing?.[0] ?? 'normal') as PrintingKind)
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!draft.card) return
    if (values.list && draftPhotos.length === 0) {
      setPhotoError(t('add.errors.photo_required'))
      return
    }
    setPhotoError(undefined)
    const item = collectionItemSchema.parse(values.item)
    const listing = values.list ? listingSchema.parse(values.listing) : undefined
    try {
      const result = await addCard.mutateAsync({
        item: {
          card_id: draft.card.id,
          collection_id: item.collection_id,
          condition: item.condition,
          printing: item.printing,
          grading_company: item.graded ? item.grading_company : null,
          grade: item.graded ? item.grade : null,
          quantity: item.quantity,
          estimated_value: item.estimated_value,
          value_currency: item.value_currency,
          notes: item.notes || null,
        },
        photos: draftPhotos,
        listing: listing && {
          listing_type: listing.listing_type,
          price: listing.listing_type === 'TRADE' ? null : listing.price,
          currency: listing.currency,
          quantity: Math.min(listing.quantity, item.quantity),
          looking_for: listing.listing_type === 'SALE' ? [] : listing.looking_for,
          description: listing.description || null,
        },
      })
      toast.success(values.list ? t('add.saved_listed') : t('add.saved'))
      draft.clear()
      reset()
      navigate(result.listing ? `/cards/${result.listing.id}` : `/collection/${item.collection_id}`)
    } catch (error) {
      if (error instanceof ImageInputError) toast.error(t('photos.invalid'))
      else if (toAppError(error).code === 'photo_required') setPhotoError(t('add.errors.photo_required'))
      else toast.error(tc(errorKey(error)))
    }
  })

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <p className="eyebrow">{t('add.eyebrow')}</p>
      <h1 className="mt-2 text-4xl md:text-5xl">{t('add.title')}</h1>
      {collections.isSuccess && (
        <p className="mt-2 font-mono text-xs text-ink-faint">{t('add.card_count', { used: cardsUsed, max: maxCollectionItems })}</p>
      )}

      <ol className="mt-6 flex gap-2 font-mono text-[11px] uppercase tracking-widest" aria-label={t('add.title')}>
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined} className={cn('flex items-center gap-2', i <= step ? 'text-brass' : 'text-ink-faint')}>
            <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border text-[10px]', i <= step ? 'border-brass' : 'border-line')}>{i + 1}</span>
            <span className="hidden sm:inline">{t(`add.${s}`)}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-line" aria-hidden />}
          </li>
        ))}
      </ol>

      {atLimit ? (
        <CardLimitNotice max={maxCollectionItems} />
      ) : !draft.card ? (
        <div className="card-surface mt-8 p-5 md:p-7">
          <CardPicker onPick={pickCard} autoFocus />
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-6">
          <div className="card-surface flex flex-wrap items-start justify-between gap-4 p-5 md:p-7">
            <CatalogCardSummary card={draft.card} />
            <Button variant="ghost" size="sm" onClick={() => draft.setCard(null)}>
              {t('add.change_card')}
            </Button>
          </div>

          <div className="card-surface space-y-6 p-5 md:p-7">
            <h2 className="text-2xl">{t('add.step_copy')}</h2>
            <ItemFields
              register={register as unknown as UseFormRegister<{ item: AddCardInput['item'] }>}
              watch={watch as unknown as UseFormWatch<{ item: AddCardInput['item'] }>}
              errors={formState.errors.item}
              printings={printings}
              binders={binders}
            />
            <PhotoUploader files={draftPhotos} onFilesChange={(f) => { draft.setPhotos(f); setPhotoError(undefined) }} error={photoError} />
          </div>

          <div className={cn('card-surface p-5 md:p-7', list && 'foil-edge')}>
            <label className="flex items-start gap-3">
              <input type="checkbox" {...register('list')} className="mt-1 h-4 w-4 accent-[var(--brass)]" />
              <span>
                <span className="block font-medium">{t('add.list_toggle')}</span>
                <span className="mt-0.5 flex gap-1.5 text-xs text-ink-faint">
                  <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t('add.list_toggle_hint')}
                </span>
              </span>
            </label>
            {list && (
              <div className="mt-6">
                <ListingFields
                  control={form.control as unknown as Control<{ listing: ListingInput }>}
                  register={register as unknown as UseFormRegister<{ listing: ListingInput }>}
                  watch={watch as unknown as UseFormWatch<{ listing: ListingInput }>}
                  errors={(formState.errors.listing ?? undefined) as never}
                  maxQuantity={quantity}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => { draft.clear(); reset() }}>
              {tc('actions.cancel')}
            </Button>
            <Button type="submit" size="lg" loading={formState.isSubmitting}>
              {list ? t('add.submit_and_list') : t('add.submit')}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
