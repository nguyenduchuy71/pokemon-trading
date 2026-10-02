import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { FolderPlus, Lock, Plus } from 'lucide-react'
import { useCollections, useCreateCollection } from '@/queries/use-collections'
import { CollectionStatsStrip } from '@/components/collection/collection-stats-strip'
import { BinderDialog } from '@/components/collection/binder-dialog'
import { Button, ButtonLink } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback-states'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { errorKey } from '@/utils/app-error'

export default function CollectionPage() {
  const { t } = useTranslation('collection')
  const { t: tc } = useTranslation()
  const collections = useCollections()
  const create = useCreateCollection()
  const [creating, setCreating] = useState(false)
  const totalCards = collections.data?.reduce((n, c) => n + (c.items[0]?.count ?? 0), 0) ?? 0

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-8 md:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t('page.eyebrow')}</p>
          <h1 className="mt-2 text-4xl md:text-6xl">{t('page.title')}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setCreating(true)}>
            <FolderPlus className="h-4 w-4" aria-hidden />
            {t('page.new_binder')}
          </Button>
          <ButtonLink to="/cards/add">
            <Plus className="h-4 w-4" aria-hidden />
            {tc('nav.add_card')}
          </ButtonLink>
        </div>
      </header>

      <CollectionStatsStrip className="mt-8" />

      {collections.isPending ? (
        <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5]" />
          ))}
        </div>
      ) : collections.isError ? (
        <ErrorState error={collections.error} onRetry={() => void collections.refetch()} />
      ) : totalCards === 0 && collections.data.length <= 1 ? (
        <EmptyState
          className="mt-6"
          icon={<Plus className="h-6 w-6" />}
          title={t('page.empty_title')}
          body={t('page.empty_body')}
          action={<ButtonLink to="/cards/add">{tc('nav.add_card')}</ButtonLink>}
        />
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
          {collections.data.map((c, i) => (
            <li key={c.id}>
              <Link
                to={`/collection/${c.id}`}
                className="group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[var(--radius-card)] border border-line p-5 shadow-[var(--shadow-lift)] transition-transform duration-200 hover:-translate-y-1"
                style={{
                  // Each binder gets a slightly different leather tone so the shelf feels physical.
                  background: `linear-gradient(160deg, hsl(${28 + i * 9} 22% ${17 + (i % 3) * 2}%), hsl(${24 + i * 7} 18% 9%))`,
                }}
              >
                <span className="absolute inset-y-0 left-0 w-3 border-r border-black/30 bg-black/20" aria-hidden />
                <div className="flex justify-end gap-1.5">
                  {c.is_default && <Badge tone="brass">{t('page.default_badge')}</Badge>}
                  {!c.is_public && (
                    <Badge>
                      <Lock className="h-3 w-3" aria-hidden />
                      {t('page.private_badge')}
                    </Badge>
                  )}
                </div>
                <div className="pl-3">
                  <h2 className="text-2xl leading-tight text-[#efe6d4] group-hover:text-[#e2c07f]">{c.name}</h2>
                  {c.description && <p className="mt-1 line-clamp-2 text-xs text-[#b8ab94]">{c.description}</p>}
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-[#8a7f6c]">{t('page.cards_count', { count: c.items[0]?.count ?? 0 })}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <BinderDialog
        open={creating}
        onClose={() => setCreating(false)}
        title={t('page.new_binder')}
        onSubmit={async (values) => {
          try {
            await create.mutateAsync(values)
          } catch (error) {
            toast.error(tc(errorKey(error)))
            throw error
          }
        }}
      />
    </div>
  )
}
