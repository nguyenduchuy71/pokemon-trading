import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useCollection, useCollectionItems, useCollections, useDeleteCollection, useReorderItems, useUpdateCollection } from '@/queries/use-collections'
import { useCurrentUserId } from '@/stores/auth-store'
import { BinderGrid } from '@/components/collection/binder-grid'
import { BinderDialog } from '@/components/collection/binder-dialog'
import { ItemSheet } from '@/components/collection/item-sheet'
import { Button } from '@/components/ui/button'
import { ErrorState, Skeleton } from '@/components/ui/feedback-states'
import { toast } from '@/components/ui/toast'
import { errorKey } from '@/utils/app-error'
import type { ItemWithDetails } from '@/services/collection-service'

export default function BinderPage() {
  const { id } = useParams()
  const { t } = useTranslation('collection')
  const { t: tc } = useTranslation()
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const collection = useCollection(id)
  const items = useCollectionItems(id)
  const collections = useCollections()
  const reorder = useReorderItems(id!)
  const updateCollection = useUpdateCollection()
  const deleteCollection = useDeleteCollection()
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)

  const binders = useMemo(() => (collections.data ?? []).map((c) => ({ id: c.id, name: c.name })), [collections.data])
  const openItem = items.data?.find((i) => i.id === openItemId) ?? null
  const editable = collection.data?.owner_id === userId

  function move(item: ItemWithDetails, delta: -1 | 1) {
    const list = items.data ?? []
    const from = list.findIndex((i) => i.id === item.id)
    const to = from + delta
    if (from < 0 || to < 0 || to >= list.length) return
    const next = [...list]
    next.splice(to, 0, next.splice(from, 1)[0])
    reorder.mutate(next)
  }

  async function removeBinder() {
    if (!collection.data || !window.confirm(t('page.delete_binder_body'))) return
    try {
      await deleteCollection.mutateAsync(collection.data.id)
      navigate('/collection', { replace: true })
    } catch (error) {
      toast.error(tc(errorKey(error)))
    }
  }

  if (collection.isError) return <ErrorState error={collection.error} onRetry={() => void collection.refetch()} />

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-8">
      <Link to="/collection" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t('page.title')}
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        {collection.data ? (
          <div>
            <p className="eyebrow">{t('page.cards_count', { count: items.data?.length ?? 0 })}</p>
            <h1 className="mt-2 text-4xl md:text-5xl">{collection.data.name}</h1>
            {collection.data.description && <p className="mt-2 max-w-xl text-ink-muted">{collection.data.description}</p>}
          </div>
        ) : (
          <Skeleton className="h-16 w-64" />
        )}
        {editable && collection.data && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRenaming(true)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {t('page.rename')}
            </Button>
            {!collection.data.is_default && (
              <Button variant="danger" size="sm" onClick={() => void removeBinder()}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {t('page.delete_binder')}
              </Button>
            )}
          </div>
        )}
      </header>

      {editable && <p className="mt-4 text-xs text-ink-faint">{t('binder.reorder_hint')}</p>}

      <div className="mt-8">
        {items.isPending ? (
          <Skeleton className="aspect-[3/2] w-full" />
        ) : items.isError ? (
          <ErrorState error={items.error} onRetry={() => void items.refetch()} />
        ) : (
          <BinderGrid binderId={id!} items={items.data} onOpen={(i) => setOpenItemId(i.id)} onReorder={(next) => reorder.mutate(next)} editable={editable} />
        )}
      </div>

      <ItemSheet item={openItem} binders={binders} onClose={() => setOpenItemId(null)} onMove={move} editable={editable} />

      {collection.data && (
        <BinderDialog
          open={renaming}
          onClose={() => setRenaming(false)}
          title={t('page.rename')}
          initial={{ name: collection.data.name, description: collection.data.description ?? '', is_public: collection.data.is_public }}
          onSubmit={async (v) => {
            await updateCollection.mutateAsync({ id: collection.data!.id, ...v })
          }}
        />
      )}
    </div>
  )
}
