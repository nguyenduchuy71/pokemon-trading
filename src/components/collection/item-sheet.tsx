import { useEffect, useState } from 'react'
import { useForm, type UseFormRegister, type UseFormWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { collectionItemSchema, type CollectionItemInput, type CollectionItemValues } from '@/schemas/collection-item-schema'
import { sortedPhotos, type ItemWithDetails } from '@/services/collection-service'
import { publicImageUrl } from '@/services/storage-service'
import { useAddPhotos, useDeleteItem, useRemovePhoto, useUpdateItem } from '@/queries/use-collections'
import { useAppLimits } from '@/queries/use-app-limits'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { CatalogCardSummary } from '@/components/catalog/catalog-card-summary'
import { ItemFields } from './item-fields'
import { PhotoUploader } from './photo-uploader'
import { ItemListingSection } from './item-listing-section'
import { errorKey, toAppError } from '@/utils/app-error'
import type { Printing } from '@/constants/domain'

const formSchema = z.object({ item: collectionItemSchema })

interface ItemSheetProps {
  item: ItemWithDetails | null
  binders: { id: string; name: string }[]
  onClose: () => void
  onMove: (item: ItemWithDetails, delta: -1 | 1) => void
  editable: boolean
}

export function ItemSheet({ item, binders, onClose, onMove, editable }: ItemSheetProps) {
  const { t } = useTranslation('collection')
  const { t: tc } = useTranslation()
  const update = useUpdateItem()
  const remove = useDeleteItem()
  const addPhotos = useAddPhotos()
  const removePhoto = useRemovePhoto()
  const [newFiles, setNewFiles] = useState<File[]>([])
  const { maxPhotosPerItem } = useAppLimits()

  const form = useForm<{ item: CollectionItemInput }, unknown, { item: CollectionItemValues }>({ resolver: zodResolver(formSchema) })
  useEffect(() => {
    setNewFiles([])
    if (item)
      form.reset({
        item: {
          collection_id: item.collection_id,
          condition: item.condition,
          printing: item.printing as Printing,
          graded: Boolean(item.grading_company),
          grading_company: item.grading_company as CollectionItemInput['grading_company'],
          grade: (item.grade ?? '') as number,
          quantity: item.quantity,
          estimated_value: (item.estimated_value ?? '') as number,
          value_currency: item.value_currency,
          notes: item.notes ?? '',
        },
      })
  }, [item, form])

  if (!item) return null
  const photos = sortedPhotos(item)

  const save = form.handleSubmit(async ({ item: v }) => {
    try {
      await update.mutateAsync({
        id: item.id,
        patch: {
          collection_id: v.collection_id,
          condition: v.condition,
          printing: v.printing,
          grading_company: v.graded ? v.grading_company : null,
          grade: v.graded ? v.grade : null,
          quantity: v.quantity,
          estimated_value: v.estimated_value,
          value_currency: v.value_currency,
          notes: v.notes || null,
        },
      })
      if (newFiles.length) {
        await addPhotos.mutateAsync({ itemId: item.id, files: newFiles, start: photos.length })
        setNewFiles([])
      }
      toast.success(t('add.saved'))
      if (v.collection_id !== item.collection_id) onClose()
    } catch (error) {
      toast.error(tc(errorKey(error)))
    }
  })

  async function deletePhoto(id: string) {
    const photo = photos.find((p) => p.id === id)
    if (!photo) return
    try {
      await removePhoto.mutateAsync(photo)
    } catch (error) {
      toast.error(toAppError(error).code === 'photo_required' ? t('add.errors.photo_required') : tc(errorKey(error)))
    }
  }

  async function deleteItem() {
    if (!item || !window.confirm(t('binder.remove_confirm'))) return
    try {
      await remove.mutateAsync(item)
      toast.success(t('binder.removed'))
      onClose()
    } catch (error) {
      toast.error(tc(errorKey(error)))
    }
  }

  return (
    <Dialog open onClose={onClose} title={item.card.name} description={item.card.set_name} variant="sheet">
      <div className="space-y-8">
        <CatalogCardSummary card={item.card} compact />

        {editable ? (
          <>
            <form onSubmit={save} noValidate className="space-y-5">
              <PhotoUploader
                files={newFiles}
                onFilesChange={(f) => setNewFiles(f.slice(0, Math.max(0, maxPhotosPerItem - photos.length)))}
                existing={photos.map((p) => ({ id: p.id, url: publicImageUrl('card-images', p.thumb_path) ?? '' }))}
                onRemoveExisting={(id) => void deletePhoto(id)}
              />
              <ItemFields
                register={form.register as unknown as UseFormRegister<{ item: CollectionItemInput }>}
                watch={form.watch as unknown as UseFormWatch<{ item: CollectionItemInput }>}
                errors={form.formState.errors.item}
                printings={item.card.printing?.length ? item.card.printing : ['normal']}
                binders={binders}
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" loading={form.formState.isSubmitting}>
                  {tc('actions.save')}
                </Button>
              </div>
            </form>

            <div className="rule" />
            <ItemListingSection item={item} />
            <div className="rule" />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => onMove(item, -1)} aria-label={t('binder.move_earlier')}>
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  {t('binder.move_earlier')}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onMove(item, 1)} aria-label={t('binder.move_later')}>
                  {t('binder.move_later')}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
              <Button variant="danger" size="sm" onClick={() => void deleteItem()} loading={remove.isPending}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {t('binder.remove')}
              </Button>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <img key={p.id} src={publicImageUrl('card-images', p.medium_path)} alt="" className="aspect-[63/88] rounded-[8px] object-cover" />
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )
}
