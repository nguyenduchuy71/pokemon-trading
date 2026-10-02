import { useEffect } from 'react'
import { useForm, type Control, type UseFormRegister, type UseFormWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ExternalLink } from 'lucide-react'
import { listingSchema, type ListingInput, type ListingValues } from '@/schemas/collection-item-schema'
import { activeListing, type ItemWithDetails } from '@/services/collection-service'
import { useSaveListing, useUnlist } from '@/queries/use-collections'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { ListingFields } from './listing-fields'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { errorKey, toAppError } from '@/utils/app-error'
import { z } from 'zod'

const formSchema = z.object({ listing: listingSchema })
type FormInput = { listing: ListingInput }
type FormValues = { listing: ListingValues }

/** List / edit / unlist an owned copy. */
export function ItemListingSection({ item }: { item: ItemWithDetails }) {
  const { t } = useTranslation('collection')
  const { t: tc } = useTranslation()
  const currency = useUiPreferences((s) => s.currency)
  const listing = activeListing(item)
  const save = useSaveListing()
  const unlist = useUnlist()

  const form = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(formSchema) })
  useEffect(() => {
    form.reset({
      listing: {
        listing_type: listing?.listing_type ?? 'SALE_OR_TRADE',
        price: (listing?.price ?? '') as number,
        currency: listing?.currency ?? currency,
        quantity: listing?.quantity ?? 1,
        looking_for: listing?.looking_for ?? [],
        description: listing?.description ?? '',
      },
    })
  }, [listing, currency, form])

  const onSubmit = form.handleSubmit(async ({ listing: v }) => {
    try {
      await save.mutateAsync({
        item,
        listingId: listing?.id,
        values: {
          listing_type: v.listing_type,
          price: v.listing_type === 'TRADE' ? null : v.price,
          currency: v.currency,
          quantity: Math.min(v.quantity, item.quantity),
          looking_for: v.listing_type === 'SALE' ? [] : v.looking_for,
          description: v.description || null,
        },
      })
      toast.success(t('add.saved_listed'))
    } catch (error) {
      toast.error(toAppError(error).code === 'photo_required' ? t('add.errors.photo_required') : tc(errorKey(error)))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg">{listing ? t('binder.listed') : t('binder.list')}</h3>
        {listing && (
          <Link to={`/cards/${listing.id}`} className="inline-flex items-center gap-1 text-xs text-brass hover:underline">
            {tc('actions.view_listing')}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        )}
      </div>
      <ListingFields
        control={form.control as unknown as Control<{ listing: ListingInput }>}
        register={form.register as unknown as UseFormRegister<{ listing: ListingInput }>}
        watch={form.watch as unknown as UseFormWatch<{ listing: ListingInput }>}
        errors={form.formState.errors.listing}
        maxQuantity={item.quantity}
      />
      <p className="text-xs text-ink-faint">{t('add.list_toggle_hint')}</p>
      <div className="flex justify-end gap-2">
        {listing && (
          <Button
            variant="danger"
            size="sm"
            loading={unlist.isPending}
            onClick={() => unlist.mutate(listing.id, { onSuccess: () => toast.success(t('binder.unlisted')), onError: (e) => toast.error(tc(errorKey(e))) })}
          >
            {t('binder.unlist')}
          </Button>
        )}
        <Button type="submit" size="sm" loading={form.formState.isSubmitting}>
          {listing ? tc('actions.save') : t('binder.list')}
        </Button>
      </div>
    </form>
  )
}
